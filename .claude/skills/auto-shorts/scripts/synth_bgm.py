#!/usr/bin/env python3
"""BGM 생성기 (auto-shorts).

**실제 악기 샘플**(FluidR3_GM, MIT)로 연주한다. 피아노·일렉피아노·베이스·스트링·마림바 음을
음 하나씩 받아 코드·베이스·멜로디를 배치하고, 드럼은 numpy 로 합성한다. 샘플을 못 받는 환경에서는
예전의 순수 합성(사인파 기반)으로 자동으로 내려간다.

    무드 5종(playful·lofi·calm·mysterious·epic) × seed 마다 다른 곡
    구성: 인트로(드럼 없이) → 본절 → 후반 → 페이드아웃
    마스터: 킥에 맞춘 펌핑, 리버브, 소프트 리미터

웹 BGM(Jamendo/Freesound/Openverse)을 쓸 수 있으면 그쪽이 우선이고, 이건 폴백 겸 기본값이다.
저작권 걱정이 없고 영상마다 다른 곡이 나온다.

CLI:  python synth_bgm.py --mood lofi --duration 40 --seed 3 --out bgm.wav
      python synth_bgm.py --mood lofi --duration 40 --out bgm.wav --engine synth   # 샘플 없이
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
    # 7kHz 하이패스만 쓰면 쇳소리가 전체 대역을 덮는다. 위쪽도 잘라 낸다.
    return vel * bandpass(noise, 6000, 11000) * np.exp(-t * (14 if open_ else 60))


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
def _render_synth(mood: str, duration: float, seed: int = 0) -> np.ndarray:
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


# ---------------------------------------------------------------- 샘플 기반 연주
# 무드별 편성. 이름은 FluidR3_GM 악기 이름이다.
BANDS = {
    "playful":    dict(bpm=104, chord="electric_piano_1", bass="acoustic_bass", lead="marimba",
                       pad=None, drums=0.85, swing=0.0, chord_oct=0, lead_oct=12),
    "lofi":       dict(bpm=82, chord="electric_piano_1", bass="acoustic_bass", lead="vibraphone",
                       pad=None, drums=0.55, swing=0.18, chord_oct=0, lead_oct=12, vinyl=True),
    "calm":       dict(bpm=72, chord="acoustic_grand_piano", bass="acoustic_bass", lead=None,
                       pad="pad_2_warm", drums=0.0, swing=0.0, chord_oct=0, lead_oct=12),
    "mysterious": dict(bpm=88, chord="acoustic_grand_piano", bass="acoustic_bass", lead=None,
                       pad="string_ensemble_1", drums=0.4, swing=0.0, chord_oct=-12, lead_oct=0),
    "epic":       dict(bpm=100, chord="string_ensemble_1", bass="acoustic_bass", lead="acoustic_grand_piano",
                       pad="string_ensemble_1", drums=1.0, swing=0.0, chord_oct=0, lead_oct=12),
}


def _midi(name: str, octave: int) -> int:
    return NAMES.index(name) + (octave + 1) * 12


def _chord_midis(root: str, kind: str, octave: int = 4) -> list[int]:
    base = _midi(root, octave)
    return [base + i for i in CHORD_INTERVALS[kind]]


def _render_sampled(mood: str, duration: float, seed: int = 0) -> np.ndarray | None:
    """실제 악기 샘플로 연주. 샘플을 못 쓰면 None."""
    import music_samples as ms

    band = BANDS.get(mood, BANDS["playful"])
    if not ms.available(band["chord"]):
        return None
    m = MOODS.get(mood, MOODS["playful"])
    rng = np.random.default_rng(seed)
    beat = 60 / band["bpm"]
    bar = beat * 4
    n_total = int((duration + 3) * SR)
    mix = np.zeros((n_total, 2), dtype=np.float32)
    kick_env = np.zeros(n_total, dtype=np.float32)      # 펌핑(사이드체인)용

    prog = m["prog"]
    n_bars = int(math.ceil((duration + 2) / bar))
    minor = prog[0][1].startswith("min")
    scale = pentatonic(prog[0][0], minor)
    swing = band["swing"]

    def add(sig, t0, gain=1.0):
        if sig is None:
            return
        i = int(t0 * SR)
        if i >= n_total or i < 0:
            return
        j = min(n_total, i + len(sig))
        mix[i:j] += sig[: j - i] * gain

    def add_mono(sig, t0, gain=1.0):
        if sig is None:
            return
        i = int(t0 * SR)
        if i >= n_total or i < 0:
            return
        j = min(n_total, i + len(sig))
        seg = sig[: j - i] * gain
        mix[i:j, 0] += seg
        mix[i:j, 1] += seg

    # 필요한 음을 미리 받아 둔다
    need: dict[str, set[int]] = {}
    for b in range(n_bars):
        root, kind = prog[b % len(prog)]
        cm = _chord_midis(root, kind, 4)
        need.setdefault(band["chord"], set()).update(x + band["chord_oct"] for x in cm)
        need.setdefault(band["bass"], set()).add(cm[0] - 24)
        if band["pad"]:
            need.setdefault(band["pad"], set()).update(x - 12 for x in cm)
    if band["lead"]:
        need.setdefault(band["lead"], set()).update(
            _midi(NAMES[p], 4) + band["lead_oct"] + o for p in scale for o in (0, 12))
    for inst, midis in need.items():
        for x in sorted(midis):
            ms.load(inst, x)

    lead_idx = 0
    for b in range(n_bars):
        root, kind = prog[b % len(prog)]
        t_bar = b * bar
        cm = _chord_midis(root, kind, 4)
        intro = b == 0                      # 첫 마디는 드럼 없이 열어 훅 나레이션을 가리지 않는다
        # --- 패드 (2마디마다)
        if band["pad"] and b % 2 == 0:
            for x in cm:
                add(ms.play(band["pad"], x - 12, bar * 2, 0.5 * m["pad"], release=1.2), t_bar)
        # --- 코드
        positions = [0, 1.5, 2, 3.5] if mood == "playful" else [0, 2] if mood in ("epic", "mysterious") else [0.5, 2.5]
        for pos in positions:
            for k, x in enumerate(cm):
                vel = (0.5 if pos else 0.62) * rng.uniform(0.85, 1.0) * (0.75 if intro else 1.0)
                add(ms.play(band["chord"], x + band["chord_oct"], beat * 1.8, vel),
                    t_bar + pos * beat + rng.uniform(0, 0.012) + (0.01 * k))
        # --- 베이스
        for e in range(8):
            if mood == "calm" and e % 4 != 0:
                continue
            if mood == "mysterious" and e % 2 != 0:
                continue
            x = cm[0] - 24
            if e in (3, 7) and mood in ("playful", "epic", "lofi") and rng.random() < 0.45:
                x += 7 if e == 3 else 12
            sw = swing * beat / 2 if e % 2 else 0
            add(ms.play(band["bass"], x, beat * 0.55, (0.95 if e % 2 == 0 else 0.7) * (0.8 if intro else 1.0)),
                t_bar + e * beat / 2 + sw)
        # --- 드럼(합성)
        if band["drums"] > 0 and not intro:
            for e in range(8):
                t0 = t_bar + e * beat / 2 + (swing * beat / 2 if e % 2 else 0)
                if e in (0, 4) or (e == 6 and mood in ("playful", "epic") and rng.random() < 0.3):
                    k = kick(0.85 * band["drums"])
                    add_mono(k, t0)
                    i = int(t0 * SR)
                    if i < n_total:
                        j = min(n_total, i + len(k))
                        kick_env[i:j] = np.maximum(kick_env[i:j], np.abs(k[: j - i]))
                if e in (2, 6):
                    add_mono(snare(0.33 * band["drums"], rng), t0)
                add_mono(hat((0.17 if e % 2 == 0 else 0.10) * band["drums"] * rng.uniform(0.7, 1.0),
                             rng, open_=(e == 7 and rng.random() < 0.25)), t0)
        # --- 멜로디 (2마디부터, 드문드문)
        if band["lead"] and b >= 1 and rng.random() < m["melody"]:
            for pos in sorted(rng.choice(np.arange(0, 8), size=int(rng.integers(2, 4)), replace=False)):
                lead_idx = max(0, min(len(scale) * 2 - 1, lead_idx + int(rng.integers(-2, 3))))
                x = _midi(NAMES[scale[lead_idx % len(scale)]], 4) + band["lead_oct"] + 12 * (lead_idx // len(scale))
                add(ms.play(band["lead"], x, beat * (0.6 if rng.random() < 0.6 else 1.1),
                            0.42 * rng.uniform(0.8, 1.0)), t_bar + pos * beat / 2)

    # --- 마스터: 킥 펌핑 → 리버브 → 리미터
    if kick_env.any():
        duck = 1.0 - 0.35 * np.clip(_smooth(kick_env, int(0.12 * SR)), 0, 1)
        mix *= duck[:, None]
    mono_rev = reverb(mix.mean(axis=1), mix=0.2 if mood in ("calm", "mysterious", "epic") else 0.12)
    mix = mix * 0.85 + np.stack([mono_rev, mono_rev], axis=1) * 0.3
    if band.get("vinyl"):
        crackle = rng.uniform(-1, 1, n_total) * (rng.random(n_total) < 0.0006) * 0.5
        hiss = lowpass(rng.uniform(-1, 1, n_total), 4500) * 0.006
        mix += np.stack([crackle + hiss, crackle + hiss], axis=1)
    mix = lowpass_stereo(mix, m["lp"])
    peak = float(np.abs(mix).max()) or 1.0
    mix = soft_limit(mix / peak * 1.25, 1.35) * 0.9

    out_n = int(duration * SR)
    mix = mix[:out_n]
    fin = int(0.6 * SR)
    mix[:fin] *= np.linspace(0, 1, fin, dtype=np.float32)[:, None]
    fout = int(min(2.5, duration / 4) * SR)
    mix[-fout:] *= np.linspace(1, 0, fout, dtype=np.float32)[:, None]
    return mix


def _smooth(x: np.ndarray, win: int) -> np.ndarray:
    if win < 2:
        return x
    k = np.ones(win, dtype=np.float32) / win
    return np.convolve(x, k, mode="same")


def lowpass_stereo(x: np.ndarray, fc: float) -> np.ndarray:
    return np.stack([lowpass(x[:, 0], fc), lowpass(x[:, 1], fc)], axis=1)


def render(mood: str, duration: float, seed: int = 0, engine: str = "auto") -> np.ndarray:
    """BGM 한 곡. engine: auto(샘플 우선) | samples | synth"""
    if engine in ("auto", "samples"):
        try:
            out = _render_sampled(mood, duration, seed)
        except Exception as e:  # noqa: BLE001
            from common import warn as _warn

            _warn("bgm", f"샘플 연주 실패 → 합성으로 대체: {e.__class__.__name__}: {e}")
            out = None
        if out is not None:
            return out
        if engine == "samples":
            raise RuntimeError("악기 샘플을 쓸 수 없습니다")
    return _render_synth(mood, duration, seed)


def write_wav(path: Path, audio: np.ndarray, stereo_width: float = 0.12) -> None:
    """wav 로 저장. 모노면 살짝 넓혀 스테레오로 만든다."""
    if audio.ndim == 2:
        pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        return
    mono = audio
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
    ap.add_argument("--engine", default="auto", choices=["auto", "samples", "synth"])
    a = ap.parse_args()
    write_wav(Path(a.out), render(a.mood, a.duration, a.seed, a.engine))
    print(f"[bgm] {a.mood} {a.duration:.0f}s seed={a.seed} engine={a.engine} → {a.out}")


if __name__ == "__main__":
    main()
