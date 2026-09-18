#!/usr/bin/env python3
"""실제 악기 샘플 로더 (auto-shorts BGM).

FluidR3_GM 사운드폰트를 음 하나씩 mp3 로 풀어 둔 공개 저장소(MIT)를 쓴다. 사인파 합성과 달리
피아노·베이스·스트링 같은 **실제 녹음된 음색**이 나온다.

    https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/{악기}-mp3/{음이름}.mp3

필요한 음만 받아 `cache/soundfont/` 에 저장하므로 첫 곡에서 1~2MB 정도만 내려받는다.
음원 라이선스: FluidR3_GM by Frank Wen (MIT), midi-js-soundfonts (MIT) — 영상에 출처 표기 불필요.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR, download, find_ffmpeg, log, warn  # noqa: E402

SR = 44100
BASE_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/{inst}-mp3/{note}.mp3"
CACHE = SKILL_DIR / "cache" / "soundfont"
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
_MEM: dict[tuple[str, int], np.ndarray] = {}
_MISSING: set[str] = set()


def note_name(midi: int) -> str:
    """MIDI 번호 → 저장소 파일 이름(C4 = MIDI 60)."""
    return f"{NAMES[midi % 12]}{midi // 12 - 1}"


def _decode(path: Path) -> np.ndarray:
    """mp3 → float32 스테레오 (SR 기준). ffmpeg 로 디코드한다."""
    proc = subprocess.run(
        [find_ffmpeg(), "-v", "error", "-nostdin", "-i", str(path), "-f", "f32le",
         "-ac", "2", "-ar", str(SR), "-"],
        capture_output=True)
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError(f"디코드 실패: {path.name}")
    return np.frombuffer(proc.stdout, dtype="<f4").reshape(-1, 2).astype(np.float32)


def load(instrument: str, midi: int) -> np.ndarray | None:
    """악기의 한 음을 numpy 스테레오 배열로. 없으면 None(호출자가 합성으로 대체)."""
    key = (instrument, midi)
    if key in _MEM:
        return _MEM[key]
    if instrument in _MISSING:
        return None
    name = note_name(midi)
    path = CACHE / instrument / f"{name}.mp3"
    if not path.exists():
        try:
            download(BASE_URL.format(inst=instrument, note=name), path, timeout=60, min_bytes=1000,
                     stage="bgm")
        except Exception as e:  # noqa: BLE001
            # 음역을 벗어난 음은 저장소에 없을 수 있다. 악기 자체가 안 받아지면 그 악기를 포기한다.
            if not (CACHE / instrument).exists():
                _MISSING.add(instrument)
                warn("bgm", f"악기 샘플을 받지 못했습니다({instrument}): {e.__class__.__name__}")
            return None
    try:
        data = _decode(path)
    except Exception as e:  # noqa: BLE001
        warn("bgm", f"{path.name} 디코드 실패: {e}")
        return None
    _MEM[key] = data
    return data


def play(instrument: str, midi: int, seconds: float, velocity: float = 1.0,
         release: float = 0.22) -> np.ndarray | None:
    """한 음을 원하는 길이로 잘라 엔벨로프를 씌운 배열."""
    src = load(instrument, midi)
    if src is None:
        return None
    n = max(1, int(seconds * SR))
    out = np.zeros((n, 2), dtype=np.float32)
    take = min(n, len(src))
    out[:take] = src[:take]
    rel = min(int(release * SR), n)
    if rel > 1:
        out[n - rel:] *= np.linspace(1.0, 0.0, rel, dtype=np.float32)[:, None]
    atk = min(int(0.006 * SR), n)
    if atk > 1:
        out[:atk] *= np.linspace(0.0, 1.0, atk, dtype=np.float32)[:, None]
    return out * float(velocity)


def prefetch(instruments: list[str], midis: list[int]) -> int:
    """곡에 쓸 음을 미리 받아 둔다(병렬 아님 — 파일이 작아 충분히 빠르다)."""
    got = 0
    for inst in instruments:
        for m in midis:
            if load(inst, m) is not None:
                got += 1
    return got


def available(instrument: str = "acoustic_grand_piano") -> bool:
    """샘플을 쓸 수 있는 환경인지(캐시가 있거나 내려받을 수 있는지)."""
    return load(instrument, 60) is not None


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="악기 샘플 확인")
    ap.add_argument("--instrument", default="acoustic_grand_piano")
    ap.add_argument("--note", type=int, default=60, help="MIDI 번호 (60 = C4)")
    a = ap.parse_args()
    s = load(a.instrument, a.note)
    if s is None:
        print("샘플을 받지 못했습니다")
        raise SystemExit(1)
    log("bgm", f"{a.instrument} {note_name(a.note)}: {len(s) / SR:.2f}s, 피크 {np.abs(s).max():.2f}")
