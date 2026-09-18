#!/usr/bin/env python3
"""나레이션 TTS (auto-shorts).

기본 엔진은 Microsoft Edge 뉴럴 보이스(edge-tts, 무료·키 불필요·온라인).
단어 단위 타임스탬프(WordBoundary)를 함께 받아서 자막 하이라이트에 쓴다.
Edge 가 막히면 gTTS(구글 번역 TTS, 무료·키 불필요)로 내려가되, 이때는
단어 타이밍이 없으므로 글자 수 비례로 추정한다.

CLI:
    python tts.py --text "문어는 심장이 세 개예요." --out nar_01.mp3
    python tts.py --text "..." --out a.mp3 --voice male --rate +8%
    python tts.py --list-voices ko

출력: <out>.mp3 와 <out>.json (단어 타이밍: {"words":[{"text","start","end"}], "duration"})
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import die, log, media_duration, warn, write_json  # noqa: E402

VOICE_PRESETS = {
    # 한국어 — 쇼츠에서 가장 무난한 세 목소리
    "female": "ko-KR-SunHiNeural",              # 밝고 또렷, 정보성 쇼츠 표준
    "sunhi": "ko-KR-SunHiNeural",
    "male": "ko-KR-InJoonNeural",               # 차분한 남성, 다큐/미스터리
    "injoon": "ko-KR-InJoonNeural",
    "male2": "ko-KR-HyunsuMultilingualNeural",  # 자연스러운 남성, 다국어
    "hyunsu": "ko-KR-HyunsuMultilingualNeural",
    # 영어
    "en-female": "en-US-AvaMultilingualNeural",
    "en-male": "en-US-AndrewMultilingualNeural",
    # 일본어
    "ja-female": "ja-JP-NanamiNeural",
    "ja-male": "ja-JP-KeitaNeural",
}
DEFAULT_VOICE = {"ko": "ko-KR-SunHiNeural", "en": "en-US-AvaMultilingualNeural", "ja": "ja-JP-NanamiNeural"}


def resolve_voice(voice: str | None, lang: str = "ko") -> str:
    if not voice:
        return DEFAULT_VOICE.get(lang, DEFAULT_VOICE["ko"])
    return VOICE_PRESETS.get(voice.lower(), voice)


# ---------------------------------------------------------------- 타이밍 추정
_PAUSE_RE = re.compile(r"[.!?…]$")


def estimate_words(text: str, duration: float) -> list[dict]:
    """단어 타이밍이 없을 때: 글자 수(+문장부호 휴지)에 비례해 시간을 나눈다."""
    words = text.split()
    if not words:
        return []
    weights = []
    for w in words:
        base = max(1, len(re.sub(r"[^\w]", "", w)))
        if _PAUSE_RE.search(w):
            base += 1.5          # 문장 끝 휴지
        elif w.endswith(","):
            base += 0.6
        weights.append(base)
    total_w = sum(weights)
    usable = max(0.2, duration - 0.15)   # 끝 여백
    out, t = [], 0.05
    for w, wt in zip(words, weights):
        span = usable * wt / total_w
        out.append({"text": w, "start": round(t, 3), "end": round(t + span * 0.9, 3)})
        t += span
    return out


_NONWORD_RE = re.compile(r"[^\w]", re.UNICODE)


def _merge_boundaries_to_words(text: str, events: list[dict]) -> list[dict]:
    """Edge 의 WordBoundary 를 원문 띄어쓰기 단위(어절)로 다시 묶는다.

    Edge 는 문장부호를 빼고 주거나 어절을 더 잘게 쪼개기도 해서, 문장부호를 제거한
    문자열 기준으로 '앞부분이 일치하는 동안' 토큰을 흡수해 어절의 시작/끝 시간을 만든다.
    """
    words = text.split()
    ev = [
        {"text": e["text"], "start": e["offset"] / 1e7, "end": (e["offset"] + e["duration"]) / 1e7}
        for e in events
    ]
    if not ev:
        return []
    out, j = [], 0
    for w in words:
        target = _NONWORD_RE.sub("", w)
        acc, start, end = "", None, None
        while j < len(ev) and len(acc) < len(target):
            tok = _NONWORD_RE.sub("", ev[j]["text"])
            if not tok:               # 문장부호만 있는 토큰: 시간만 흡수
                if start is not None:
                    end = ev[j]["end"]
                j += 1
                continue
            if not target.startswith(acc + tok):
                break                 # 다음 어절의 토큰이면 소비하지 않고 멈춘다
            if start is None:
                start = ev[j]["start"]
            end = ev[j]["end"]
            acc += tok
            j += 1
        if start is None:
            break                     # 정렬 실패 → 남은 어절은 아래에서 추정
        out.append({"text": w, "start": round(start, 3), "end": round(end, 3)})
    if len(out) < len(words):
        last_end = out[-1]["end"] if out else 0.0
        tail_total = max(0.3, ev[-1]["end"] - last_end)
        rest = words[len(out):]
        span = tail_total / len(rest)
        t = last_end
        for w in rest:
            out.append({"text": w, "start": round(t, 3), "end": round(t + span * 0.9, 3)})
            t += span
    return out


# ---------------------------------------------------------------- Edge
async def _edge_synth(text: str, out_mp3: Path, voice: str, rate: str, pitch: str, volume: str) -> list[dict]:
    import edge_tts  # type: ignore

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    comm = edge_tts.Communicate(
        text, voice, rate=rate, pitch=pitch, volume=volume, boundary="WordBoundary", proxy=proxy or None,
    )
    audio = bytearray()
    events: list[dict] = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            events.append({"text": chunk["text"], "offset": chunk["offset"], "duration": chunk["duration"]})
    if not audio:
        raise RuntimeError("Edge TTS 가 오디오를 돌려주지 않았습니다")
    out_mp3.write_bytes(bytes(audio))
    return events


def synth_edge(text: str, out_mp3: Path, voice: str, rate: str, pitch: str, volume: str, retries: int = 3) -> list[dict]:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            return asyncio.run(_edge_synth(text, out_mp3, voice, rate, pitch, volume))
        except Exception as e:  # noqa: BLE001
            last = e
            if attempt < retries - 1:
                warn("tts", f"edge-tts 실패({e.__class__.__name__}: {e}), {2 ** attempt * 2}s 후 재시도")
                time.sleep(2 ** attempt * 2)
    raise RuntimeError(f"edge-tts 실패: {last}")


# ---------------------------------------------------------------- 무음(레이아웃 확인용)
def synth_silent(text: str, out_mp3: Path, chars_per_sec: float = 5.2) -> None:
    """네트워크 없이 자막·구성만 확인할 때 쓰는 무음 트랙. 길이는 글자 수로 추정한다."""
    from common import run_ffmpeg

    dur = max(1.0, len(text) / chars_per_sec)
    run_ffmpeg(["-f", "lavfi", "-i", f"anullsrc=r=24000:cl=mono", "-t", f"{dur:.2f}",
                "-c:a", "libmp3lame", "-q:a", "5", str(out_mp3)], stage="tts")


# ---------------------------------------------------------------- gTTS
def synth_gtts(text: str, out_mp3: Path, lang: str) -> None:
    from gtts import gTTS  # type: ignore

    gTTS(text=text, lang=lang, slow=False).save(str(out_mp3))


# ---------------------------------------------------------------- 공개 API
def synthesize(text: str, out_mp3: str | Path, *, voice: str | None = None, lang: str = "ko",
               rate: str = "+0%", pitch: str = "+0Hz", volume: str = "+0%",
               engine: str = "auto") -> dict:
    """텍스트 → mp3 + 타이밍 dict. engine: auto | edge | gtts | silent(무음, 오프라인 확인용)"""
    out_mp3 = Path(out_mp3)
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    text = re.sub(r"\s+", " ", text).strip()
    voice_id = resolve_voice(voice, lang)
    used, events, err = None, [], None

    if engine == "silent":
        synth_silent(text, out_mp3)
        used = "silent"

    if engine in ("auto", "edge"):
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            if engine == "edge":
                die("tts", "edge-tts 가 없습니다:  pip install edge-tts")
            warn("tts", "edge-tts 미설치 → gTTS 로 대체 (pip install edge-tts 권장)")
        else:
            try:
                events = synth_edge(text, out_mp3, voice_id, rate, pitch, volume)
                used = "edge"
            except Exception as e:  # noqa: BLE001
                err = e
                if engine == "edge":
                    die("tts", f"{e}")
                warn("tts", f"edge-tts 실패 → gTTS 로 대체: {e}")

    if used is None:
        try:
            from gtts import gTTS  # noqa: F401
        except ImportError:
            die("tts", f"edge-tts 실패({err}) 이고 gTTS 도 없습니다:  pip install gTTS")
        synth_gtts(text, out_mp3, lang)
        used = "gtts"

    duration = media_duration(out_mp3)
    words = _merge_boundaries_to_words(text, events) if events else []
    if not words:
        words = estimate_words(text, duration)
        timing = "estimated"
    else:
        timing = "word-boundary"
        # 타이밍이 오디오 길이를 넘지 않게 정리
        for w in words:
            w["end"] = min(w["end"], round(duration, 3))
            w["start"] = min(w["start"], w["end"])
    info = {
        "engine": used, "voice": voice_id if used == "edge" else f"{used}:{lang}",
        "rate": rate, "timing": timing, "duration": round(duration, 3),
        "text": text, "words": words,
    }
    write_json(out_mp3.with_suffix(".json"), info)
    return info


async def _list_voices(prefix: str) -> None:
    import edge_tts  # type: ignore

    voices = await edge_tts.list_voices()
    for v in sorted(voices, key=lambda x: x["ShortName"]):
        if v["ShortName"].lower().startswith(prefix.lower()):
            print(f'{v["ShortName"]:<40} {v["Gender"]:<7} {", ".join(v.get("VoiceTag", {}).get("VoicePersonalities", []))}')


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts TTS (edge-tts → gTTS 폴백)")
    ap.add_argument("--text", help="읽을 문장")
    ap.add_argument("--text-file", help="읽을 문장이 든 파일(UTF-8)")
    ap.add_argument("--out", help="출력 mp3 경로 (타이밍은 같은 이름 .json)")
    ap.add_argument("--voice", default=None, help="보이스 ID 또는 프리셋(female/male/male2/...)")
    ap.add_argument("--lang", default="ko")
    ap.add_argument("--rate", default="+0%", help='말 속도, 예 "+10%%"')
    ap.add_argument("--pitch", default="+0Hz")
    ap.add_argument("--volume", default="+0%")
    ap.add_argument("--engine", default="auto", choices=["auto", "edge", "gtts", "silent"])
    ap.add_argument("--list-voices", metavar="PREFIX", help="예: ko 또는 en-US")
    args = ap.parse_args()

    if args.list_voices:
        asyncio.run(_list_voices(args.list_voices))
        return
    text = args.text or (Path(args.text_file).read_text(encoding="utf-8") if args.text_file else "")
    if not text.strip() or not args.out:
        ap.error("--text(또는 --text-file) 와 --out 이 필요합니다")
    info = synthesize(text, args.out, voice=args.voice, lang=args.lang, rate=args.rate,
                      pitch=args.pitch, volume=args.volume, engine=args.engine)
    log("tts", f'{info["engine"]}/{info["voice"]}  {info["duration"]}s  단어 {len(info["words"])}개({info["timing"]}) → {args.out}')
    print(json.dumps({k: info[k] for k in ("engine", "voice", "duration", "timing")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
