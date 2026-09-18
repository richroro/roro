#!/usr/bin/env python3
"""로컬 BGM 합성기 (auto-shorts) — numpy 로 드럼·베이스·코드·멜로디를 실제로 시퀀싱한다.

웹 BGM(Jamendo/Freesound/Openverse)을 못 쓸 때의 폴백이지만, 저작권 걱정이 없고 무드별로
매번 다른 곡이 나오므로(seed) 기본 BGM 으로도 쓸 만하게 만들었다. 구성:

    드럼   킥(사인 피치 드롭) · 스네어(노이즈 밴드패스) · 하이햇(노이즈 하이패스, 벨로시티 변화)
    베이스 루트음 8분 패턴, 사인+2배음
    코드   일렉피아노풍 플럭(배음 3개, 각각 다른 감쇠) + 디튠 패드(저역 필터)
    멜로디 펜타토닉 랜덤워크(시드 고정), 마디마다 확률적으로 쉼
    마스터 소프트 리미터 + 슈뢰더 리버브 + 무드별 로우패스 · lofi 는 바이닐 노이즈·워블

CLI:  python synth_bgm.py --mood playful --duration 60 --seed 3 --out bgm.wav
"""
from __future__ import annotations

import argparse
import math
import wave
from pathlib import Path

import numpy as np

SR = 44100

NOTE = {n: 440.0 * 2 ** ((i - 9) / 12) for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name: str, octave: int) -> float:
    return NOTE[name] * 2 ** (octave - 4)


# 무드 정의: (bpm, 코드 진행[(루트, 종류)], 스윙, 드럼 세기, 로우패스 Hz, 멜로디 밀도, 패드 볼륨)
MOODS = {
    "playful":    dict(bpm=104, prog=[("C", "maj"), ("A", "min"), ("F", "maj"), ("G", "maj")], swing=0.0,
                       drums=0.9, lp=9000, melody=0.7, pad=0.25, pluck=0.5, bass=0.55),
    "lofi":       dict(bpm=82, prog=[("D", "min7"), ("G", "7"), ("C", "maj7"), ("A", "min7")], swing=0.18,
                       drums=0.7, lp=3800, melody=0.45, pad=0.4, pluck=0.45, bass=0.5, vinyl=True, wobble=True),
    "calm":       dict(bpm=72, prog=[("F", "maj7"), ("C", "maj"), ("D", "min7"), ("A#", "maj7")], swing=0.0,
                       drums=0.0, lp=5000, melody=0.35, pad=0.6, pluck=0.35, bass=0.3),
    "mysterious": dict(bpm=88, prog=[("A", "min"), ("F", "maj"), ("D", "min"), ("E", "min")], swing=0.0,
                       drums=0.45, lp=4200, melody=0.4, pad=0.55, pluck=0.3, bass=0.45, tremolo=True),
    "epic":       dict(bpm=100, prog=[("D", "min"), ("A#", "maj"), ("F", "maj"), ("C", "maj")], swing=0.0,
                       drums=1.0, lp=11000, melody=0.5, pad=0.55, pluck=0.35, bass=0.7, power=True),
}
CHORD_INTERVALS = {"maj": [0, 4, 7], "min": [0, 3, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10], "7": [0, 4, 7, 10]}
NAMES = list(NOTE)


def chord_freqs(root: str, kind: str, octave: int = 4) -> list[float]:
    base = NAMES.index(root)
    return [NOTE[NAMES[(base + i) % 12]] * 2 ** (octave - 4 + (base + i) // 12) for i in CHORD_INTERVALS[kind]]


def pentatonic(root: str, minor: bool) -> list[int]:
    base = NAMES.index(root)
    steps = [0, 3, 5, 7, 10] if minor else [0, 2, 4, 7, 9]
    return [(base + s) % 12 for s in steps]


# ---------------------------------------------------------------- 악기
def env_ad(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-t / max(decay, 1e-4))
    return a * d


def kick(vel: float = 1.0) -> np.ndarray:
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 28)
    return vel * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare(vel: float = 1.0, rng=None) -> np.ndarray:
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    noise = (rng or np.random).uniform(-1, 1, n)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)
    return vel * (0.7 * bandpass(noise, 900, 5000) * np.exp(-t * 18) + 0.5 * body)


def hat(vel: float = 1.0, rng=None, open_: bool = False) -> np.ndarray:
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    noise = (rng or np.random).uniform(-1, 1, n)
    return vel * highpass(noise, 7000) * np.exp(-t * (14 if open_ else 60))


def pluck(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    """일렉피아노풍: 배음 3개가 각각 다른 속도로 감쇠."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.2)
         + 0.35 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 5)
         + 0.12 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t * 9))
    return vel * s * env_ad(n, 0.004, 1.2)


def pad_note(freq: float, dur: float) -> np.ndarray:
    """디튠 톱니 3개 → 부드러운 패드."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for det in (-0.4, 0.0, 0.4):
        f = freq * 2 ** (det / 100)
        for k in range(1, 9):          # 밴드리미트 톱니(배음 8개)
            out += ((-1) ** (k + 1)) * np.sin(2 * np.pi * f * k * t) / k
    a = np.clip(t / 0.25, 0, 1)
    r = np.clip((dur - t) / 0.35, 0, 1)
    return out / 6 * a * r


def bass_note(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return vel * s * env_ad(n, 0.005, 0.35) * np.clip((dur - t) / 0.03, 0, 1)


def lead_note(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.3, 0, 1)
    s = np.sin(2 * np.pi * freq * vib * t) + 0.2 * np.sin(2 * np.pi * freq * 2 * vib * t)
    a = np.clip(t / 0.03, 0, 1)
    r = np.clip((dur - t) / 0.12, 0, 1)
    return vel * s * a * r * 0.8


# ---------------------------------------------------------------- 필터/이펙트
def _biquad(x: np.ndarray, b, a) -> np.ndarray:
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    b0, b1, b2 = b
    a1, a2 = a
    for i in range(len(x)):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return y


def lowpass(x: np.ndarray, fc: float, q: float = 0.707) -> np.ndarray:
    return _fft_filter(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** 4))


def highpass(x: np.ndarray, fc: float) -> np.ndarray:
    return _fft_filter(x, lambda f: (f / fc) ** 2 / np.sqrt(1 + (f / fc) ** 4))


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return highpass(lowpass(x, hi), lo)


def _fft_filter(x: np.ndarray, gain) -> np.ndarray:
    """FFT 기반 제로위상 필터 (짧은 신호와 긴 신호 모두 빠르다)."""
    n = len(x)
    if n == 0:
        return x
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = gain(np.maximum(f, 1e-3))
    return np.fft.irfft(spec * g, n)


def reverb(x: np.ndarray, mix: float = 0.18, decay: float = 0.6) -> np.ndarray:
    """슈뢰더 리버브: 콤 4 + 올패스 2."""
    out = np.zeros_like(x)
    for d in (1557, 1617, 1491, 1422):
        y = np.zeros_like(x)
        g = decay
        # y[n] = x[n] + g*y[n-d]  (벡터화: 블록 재귀)
        y[:d] = x[:d]
        for start in range(d, len(x), d):
            end = min(start + d, len(x))
            y[start:end] = x[start:end] + g * y[start - d:end - d]
        out += y
    out /= 4
    for d in (225, 556):
        g = 0.5
        y = np.zeros_like(out)
        y[:d] = out[:d]
        for start in range(d, len(out), d):
            end = min(start + d, len(out))
            y[start:end] = -g * out[start:end] + out[start - d:end - d] + g * y[start - d:end - d]
        out = y
    return (1 - mix) * x + mix * out


def soft_limit(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    return np.tanh(x * drive) / np.tanh(drive)


# ---------------------------------------------------------------- 시퀀서
def render(mood: str, duration: float, seed: int = 0) -> np.ndarray:
    m = MOODS.get(mood, MOODS["playful"])
    rng = np.random.default_rng(seed)
    bpm = m["bpm"]
    beat = 60 / bpm
    bar = beat * 4
    n_total = int((duration + 3) * SR)
    drums = np.zeros(n_total)
    bass = np.zeros(n_total)
    chords = np.zeros(n_total)
    pads = np.zeros(n_total)
    lead = np.zeros(n_total)

    def add(buf, sig, t0):
        i = int(t0 * SR)
        if i >= n_total:
            return
        j = min(n_total, i + len(sig))
        buf[i:j] += sig[: j - i]

    prog = m["prog"]
    n_bars = int(math.ceil((duration + 3) / bar))
    minor_key = prog[0][1].startswith("min")
    scale = pentatonic(prog[0][0], minor_key)
    lead_pitch = 4 * 12 + scale[0]      # MIDI-ish index: octave*12 + pitch class
    swing = m["swing"]

    for b in range(n_bars):
        root, kind = prog[b % len(prog)]
        t_bar = b * bar
        cf = chord_freqs(root, kind, 4)
        if m.get("power"):
            cf = [cf[0], cf[2], cf[0] * 2]
        # --- 패드: 마디 내내 (2마디마다 새로 시작해 겹침 없이)
        if b % 2 == 0:
            for f in cf:
                add(pads, pad_note(f / 2, bar * 2) * m["pad"] * 0.35, t_bar)
        # --- 코드 플럭: 무드별 패턴
        pattern = [1, 2.5] if mood in ("lofi", "calm") else [0, 1.5, 2, 3.5] if mood == "playful" else [0, 2]
        for pos in pattern:
            t0 = t_bar + pos * beat
            for f in cf:
                add(chords, pluck(f, beat * 1.5, m["pluck"] * 0.5 * rng.uniform(0.85, 1.0)), t0 + rng.uniform(0, 0.006))
        # --- 베이스: 8분음
        broot = cf[0] / 4
        for e in range(8):
            if mood == "calm" and e % 4 != 0:
                continue
            if mood in ("playful", "epic") and e in (3, 7) and rng.random() < 0.5:
                f = broot * (1.5 if e == 3 else 2)     # 5도/옥타브 장식
            else:
                f = broot
            sw = swing * beat / 2 if e % 2 else 0
            vel = 1.0 if e % 2 == 0 else 0.7
            add(bass, bass_note(f, beat / 2 * 0.95, vel * m["bass"]), t_bar + e * beat / 2 + sw)
        # --- 드럼
        if m["drums"] > 0:
            for e in range(8):
                t0 = t_bar + e * beat / 2 + (swing * beat / 2 if e % 2 else 0)
                if e in (0, 4) or (e == 6 and mood in ("playful", "epic") and rng.random() < 0.35):
                    add(drums, kick(0.9 * m["drums"]), t0)
                if e in (2, 6):
                    add(drums, snare(0.45 * m["drums"], rng), t0)
                hv = (0.35 if e % 2 == 0 else 0.22) * m["drums"] * rng.uniform(0.7, 1.0)
                add(drums, hat(hv, rng, open_=(e == 7 and rng.random() < 0.3)), t0)
        # --- 멜로디: 펜타토닉 랜덤워크, 마디마다 쉬거나 2~4음
        if rng.random() < m["melody"]:
            n_notes = int(rng.integers(2, 5))
            positions = sorted(rng.choice(np.arange(0, 8), size=n_notes, replace=False))
            for pos in positions:
                step = int(rng.integers(-2, 3))
                idx = scale.index(lead_pitch % 12) if lead_pitch % 12 in scale else 0
                idx2 = idx + step
                octave = 5 + idx2 // len(scale)
                pc = scale[idx2 % len(scale)]
                octave = min(max(octave, 4), 6)
                lead_pitch = octave * 12 + pc
                f = NOTE[NAMES[pc]] * 2 ** (octave - 4)
                dur = beat * (0.5 if rng.random() < 0.6 else 1.0)
                add(lead, lead_note(f, dur, 0.28 * rng.uniform(0.7, 1.0)), t_bar + pos * beat / 2)

    mix = drums * 0.9 + bass * 0.8 + chords * 0.7 + pads * 0.6 + lead
    if m.get("tremolo"):
        t = np.arange(n_total) / SR
        mix = mix * (0.85 + 0.15 * np.sin(2 * np.pi * 4.5 * t))
    if m.get("wobble"):
        # 테이프 워블: 아주 느린 피치 흔들림을 리샘플링으로 흉내
        t = np.arange(n_total) / SR
        idx = np.arange(n_total) + 12 * np.sin(2 * np.pi * 0.7 * t)
        mix = np.interp(idx, np.arange(n_total), mix)
    mix = lowpass(mix, m["lp"])
    mix = reverb(mix, mix=0.22 if mood in ("calm", "mysterious", "lofi") else 0.14)
    if m.get("vinyl"):
        crackle = rng.uniform(-1, 1, n_total) * (rng.random(n_total) < 0.0008) * 0.6
        hiss = lowpass(rng.uniform(-1, 1, n_total), 4000) * 0.008
        mix = mix + crackle + hiss
    mix = soft_limit(mix / (np.max(np.abs(mix)) + 1e-9) * 1.3, 1.4) * 0.85
    # 페이드 인/아웃
    fade_in = int(0.8 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)
    out_n = int(duration * SR)
    mix = mix[:out_n]
    fade_out = int(min(2.5, duration / 4) * SR)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)
    return mix


def write_wav(path: Path, mono: np.ndarray, stereo_width: float = 0.12) -> None:
    """살짝 넓힌 스테레오로 저장 (좌우에 아주 짧은 지연 차)."""
    d = int(0.0007 * SR)
    left = mono
    right = np.concatenate([np.zeros(d), mono[:-d]]) if d else mono
    left = (1 - stereo_width) * left + stereo_width * right
    right = (1 - stereo_width) * right + stereo_width * mono
    data = np.stack([left, right], axis=1)
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 로컬 BGM 합성")
    ap.add_argument("--mood", default="playful", choices=list(MOODS))
    ap.add_argument("--duration", type=float, default=60)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    write_wav(Path(a.out), render(a.mood, a.duration, a.seed))
    print(f"[bgm] {a.mood} {a.duration:.0f}s seed={a.seed} → {a.out}")


if __name__ == "__main__":
    main()
