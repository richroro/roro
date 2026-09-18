#!/usr/bin/env python3
"""배경음악(BGM)·효과음(SFX) 확보 (auto-shorts).

BGM 제공자(기본 순서):
    jamendo    CC 음악. JAMENDO_CLIENT_ID 필요(무료 가입). 인스트루멘털 위주로 검색.
    freesound  CC 사운드/음악. FREESOUND_API_KEY 필요(무료 가입). 미리듣기(HQ mp3)를 쓴다.
    openverse  Jamendo·Freesound·위키미디어를 모아 검색. 키 불필요(익명 한도 있음).
    synth      ffmpeg 로 합성하는 로컬 앰비언트 루프(항상 성공, 저작권 걱정 없음).

효과음은 항상 로컬 합성(whoosh / pop / ding / riser / boom). 키가 있으면 Freesound 로
교체할 수 있다(--sfx-provider freesound).

CLI:
    python fetch_audio.py bgm --query "playful ukulele" --mood playful --duration 60 --out bgm.mp3
    python fetch_audio.py sfx --name whoosh --out whoosh.wav
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import download, env_key, http_json, log, media_duration, qs, run_ffmpeg, warn, write_json  # noqa: E402

STAGE = "audio"
DEFAULT_BGM_PROVIDERS = ["jamendo", "freesound", "openverse", "synth"]
MOODS = ("playful", "calm", "lofi", "mysterious", "epic", "dramatic", "happy", "sad")


def _mood_norm(mood: str) -> str:
    m = (mood or "").lower()
    return {"happy": "playful", "dramatic": "epic", "sad": "calm", "chill": "lofi", "tense": "mysterious",
            "suspense": "mysterious", "upbeat": "playful", "cinematic": "epic"}.get(m, m if m in MOODS else "playful")


# ---------------------------------------------------------------- 웹 제공자
def p_jamendo(query: str, mood: str, **_) -> tuple[str, dict]:
    cid = env_key("JAMENDO_CLIENT_ID")
    if not cid:
        raise LookupError("JAMENDO_CLIENT_ID 없음")
    tags = "+".join(urllib.parse.quote(w) for w in (query or mood).split()[:4])
    base = ("https://api.jamendo.com/v3.0/tracks/?client_id=%s&format=json&limit=10&include=licenses"
            "&audioformat=mp32&vocalinstrumental=instrumental&order=popularity_month&durationbetween=30_300" % cid)
    for url in (f"{base}&fuzzytags={tags}", f"{base}&search={urllib.parse.quote(query or mood)}",
                f"{base}&fuzzytags={urllib.parse.quote(mood)}"):
        res = http_json(url, stage=STAGE)
        for tr in res.get("results", []):
            if tr.get("audio"):
                return tr["audio"], {"provider": "jamendo", "title": tr.get("name"), "artist": tr.get("artist_name"),
                                     "url": tr.get("shareurl"), "license": tr.get("license_ccurl") or "CC",
                                     "credit": f'"{tr.get("name")}" by {tr.get("artist_name")} (Jamendo, {tr.get("license_ccurl") or "CC"})'}
    raise LookupError("jamendo 결과 없음")


def p_freesound(query: str, mood: str, kind: str = "music", **_) -> tuple[str, dict]:
    key = env_key("FREESOUND_API_KEY")
    if not key:
        raise LookupError("FREESOUND_API_KEY 없음")
    if kind == "music":
        q, flt = f"{query or mood} music loop", 'duration:[20 TO 300] license:("Creative Commons 0" OR "Attribution")'
    else:
        q, flt = query, 'duration:[0.1 TO 4] license:("Creative Commons 0" OR "Attribution")'
    params = qs({"query": q, "filter": flt, "fields": "id,name,username,license,previews,duration,url",
                 "sort": "rating_desc", "page_size": 10, "token": key})
    res = http_json(f"https://freesound.org/apiv2/search/text/?{params}", stage=STAGE)
    for s in res.get("results", []):
        url = (s.get("previews") or {}).get("preview-hq-mp3")
        if url:
            return url, {"provider": "freesound", "title": s.get("name"), "artist": s.get("username"),
                         "url": s.get("url"), "license": s.get("license"),
                         "credit": f'"{s.get("name")}" by {s.get("username")} (Freesound, {s.get("license")})'}
    raise LookupError("freesound 결과 없음")


def p_openverse(query: str, mood: str, **_) -> tuple[str, dict]:
    params = qs({"q": f"{query or mood} instrumental", "category": "music", "license_type": "commercial",
                 "page_size": 20})
    res = http_json(f"https://api.openverse.org/v1/audio/?{params}", stage=STAGE)
    for r in res.get("results", []):
        dur = (r.get("duration") or 0) / 1000
        if r.get("url") and 20 <= dur <= 300:
            return r["url"], {"provider": "openverse", "title": r.get("title"), "artist": r.get("creator"),
                              "url": r.get("foreign_landing_url"), "license": f'CC {r.get("license", "").upper()}',
                              "credit": f'"{r.get("title")}" by {r.get("creator")} — CC {r.get("license", "").upper()} '
                                        f'({r.get("foreign_landing_url")})'}
    raise LookupError("openverse 결과 없음")


BGM_PROVIDERS = {"jamendo": p_jamendo, "freesound": p_freesound, "openverse": p_openverse}


# ---------------------------------------------------------------- 로컬 합성 BGM
# 코드 진행(주파수 Hz). 각 무드별 4개 코드가 block 초씩 순환한다.
_N = {"C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "Bb3": 233.08,
      "B3": 246.94, "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00,
      "Bb4": 466.16, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.26, "F5": 698.46, "G5": 783.99}

_MOOD_DEF = {
    #          코드(패드 음)                                         block  arp  lowpass  tempo
    "playful": ([("C4", "E4", "G4"), ("A3", "C4", "E4"), ("F3", "A3", "C4"), ("G3", "B3", "D4")], 4.0, 0.25, 3200),
    "calm":    ([("C4", "E4", "G4", "B4"), ("A3", "C4", "E4", "G4"), ("F3", "A3", "C4", "E4"), ("G3", "B3", "D4", "F4")], 6.0, 0.5, 1800),
    "lofi":    ([("C4", "E4", "G4", "B4"), ("A3", "C4", "E4", "G4"), ("D4", "F4", "A4", "C5"), ("G3", "B3", "D4", "F4")], 5.0, 0.375, 1600),
    "mysterious": ([("A3", "C4", "E4"), ("F3", "A3", "C4"), ("D4", "F4", "A4"), ("E4", "G4", "B4")], 5.0, 0.75, 1500),
    "epic":    ([("D4", "A4", "D5"), ("Bb3", "F4", "Bb4"), ("F4", "C5", "F5"), ("C4", "G4", "C5")], 4.0, 0.25, 4000),
}


def _chord_sum(notes: tuple, gain: float) -> str:
    return "(" + "+".join(f"sin(2*PI*{_N[n]}*t)" for n in notes) + f")*{gain / len(notes):.4f}"


def _select_by_block(exprs: list[str], block: float) -> str:
    """4개 표현식을 시간 블록에 따라 고르는 중첩 if."""
    cyc = block * 4
    return (f"if(lt(mod(t,{cyc}),{block}),{exprs[0]},"
            f"if(lt(mod(t,{cyc}),{block * 2}),{exprs[1]},"
            f"if(lt(mod(t,{cyc}),{block * 3}),{exprs[2]},{exprs[3]})))")


def synth_bgm(mood: str, duration: float, out: Path, seed: int = 0) -> dict:
    """로컬 BGM 합성. numpy 가 있으면 synth_bgm.py(드럼·베이스·코드·멜로디 시퀀서)로,
    없으면 ffmpeg aevalsrc 로 단순 앰비언트 루프를 만든다."""
    mood = _mood_norm(mood)
    try:
        import numpy  # noqa: F401  (설치 여부 확인)
        import synth_bgm

        wav = out.with_suffix(".synth.wav")
        synth_bgm.write_wav(wav, synth_bgm.render(mood, duration, seed))
        out.parent.mkdir(parents=True, exist_ok=True)
        run_ffmpeg(["-i", str(wav), "-c:a", "libmp3lame", "-q:a", "2", str(out)], stage=STAGE)
        wav.unlink(missing_ok=True)
        return {"provider": "synth", "title": f"generated {mood} track (seed {seed})", "artist": "auto-shorts",
                "url": None, "license": "generated", "credit": f"generated {mood} track (no copyright)"}
    except ImportError:
        warn(STAGE, "numpy 가 없어 단순 앰비언트 루프로 합성합니다 (pip install numpy 권장)")
    chords, block, arp_step, lp = _MOOD_DEF[mood]
    swell = f"(0.55+0.45*sin(PI*mod(t,{block})/{block}))"          # 코드마다 부풀었다 잦아드는 포락선
    pad = _select_by_block([_chord_sum(c, 0.22) for c in chords], block) + f"*{swell}"
    # 아르페지오: 코드 음을 한 옥타브 위에서 arp_step 간격으로 순환, 빠르게 감쇠하는 플럭
    arp_exprs = []
    for c in chords:
        notes = [f"{_N[n] * 2:.2f}" for n in c]
        k = f"floor(mod(t,{arp_step * len(notes)})/{arp_step})"
        sel = notes[-1]
        for idx in range(len(notes) - 2, -1, -1):
            sel = f"if(eq({k},{idx}),{notes[idx]},{sel})"
        arp_exprs.append(f"(sin(2*PI*({sel})*t)+0.3*sin(2*PI*({sel})*3*t))")
    arp = _select_by_block(arp_exprs, block) + f"*0.13*exp(-7*mod(t,{arp_step}))"
    bass = _select_by_block([f"sin(2*PI*{_N[c[0]] / 2:.2f}*t)" for c in chords], block) + f"*0.16*{swell}"
    expr = f"{pad}+{arp}+{bass}"
    expr = expr.replace(",", "\\,")  # 필터 그래프 안의 콤마 이스케이프
    filt = (f"aevalsrc=exprs='{expr}':s=44100:d={duration + 2:.2f},"
            f"lowpass=f={lp},aecho=0.7:0.45:110|230:0.22|0.12,"
            f"afade=t=in:d=1.2,afade=t=out:st={duration - 2.5:.2f}:d=2.5,atrim=0:{duration:.2f},"
            f"aformat=channel_layouts=stereo,alimiter=limit=0.9")
    out.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(["-f", "lavfi", "-i", filt, "-c:a", "libmp3lame", "-q:a", "3", str(out)], stage=STAGE)
    return {"provider": "synth", "title": f"generated {mood} loop", "artist": "auto-shorts", "url": None,
            "license": "generated", "credit": f"generated ambient loop ({mood}, no copyright)"}


# ---------------------------------------------------------------- 로컬 합성 SFX
SFX_FILTERS = {
    "whoosh": "anoisesrc=color=pink:d=0.6:seed=7,afade=t=in:d=0.22,afade=t=out:st=0.28:d=0.32,"
              "bandpass=f=900:w=700,volume=1.4",
    "pop": "aevalsrc=exprs='0.9*sin(2*PI*(900-3200*t)*t)*exp(-28*t)':s=44100:d=0.25",
    "ding": "aevalsrc=exprs='0.45*sin(2*PI*1568*t)*exp(-3*t)+0.22*sin(2*PI*3136*t)*exp(-5*t)':s=44100:d=1.6",
    "riser": "aevalsrc=exprs='0.35*sin(2*PI*(180+520*t*t)*t)':s=44100:d=1.2,afade=t=in:d=0.9,"
             "afade=t=out:st=1.0:d=0.2",
    "boom": "aevalsrc=exprs='0.95*sin(2*PI*(55+45*exp(-9*t))*t)*exp(-2.8*t)':s=44100:d=1.4",
}


def make_sfx(name: str, out: Path) -> Path:
    if name not in SFX_FILTERS:
        raise ValueError(f"효과음 이름은 {', '.join(SFX_FILTERS)} 중 하나여야 합니다: {name}")
    out.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(["-f", "lavfi", "-i", SFX_FILTERS[name] + ",aformat=channel_layouts=stereo:sample_rates=48000",
                "-c:a", "pcm_s16le", str(out)], stage=STAGE)
    return out


def fetch_sfx(name: str, out: Path, provider: str = "synth") -> dict:
    if provider == "freesound":
        try:
            url, info = p_freesound(name, "", kind="sfx")
            tmp = out.with_suffix(".src.mp3")
            download(url, tmp, timeout=60, stage=STAGE)
            run_ffmpeg(["-i", str(tmp), "-t", "3", "-af", "aformat=channel_layouts=stereo:sample_rates=48000",
                        "-c:a", "pcm_s16le", str(out)], stage=STAGE)
            tmp.unlink(missing_ok=True)
            return info
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"freesound SFX 실패 → 합성: {e}")
    make_sfx(name, out)
    return {"provider": "synth", "credit": f"generated sfx ({name})", "license": "generated"}


# ---------------------------------------------------------------- 공개 API
def fetch_bgm(*, query: str = "", mood: str = "playful", duration: float = 60.0, out: str | Path,
              providers: Optional[list[str]] = None, local: Optional[str] = None, seed: int = 0) -> dict:
    """BGM 하나를 확보해 out(mp3)에 저장하고 출처 정보를 돌려준다."""
    out = Path(out)
    providers = providers or DEFAULT_BGM_PROVIDERS
    if local:
        lp = Path(local)
        if lp.is_file():
            out.parent.mkdir(parents=True, exist_ok=True)
            run_ffmpeg(["-i", str(lp), "-vn", "-c:a", "libmp3lame", "-q:a", "3", str(out)], stage=STAGE)
            info = {"provider": "local", "credit": f"user file {lp.name}", "license": "user-provided"}
            write_json(out.with_suffix(".json"), info)
            return info
        warn(STAGE, f"지정한 BGM 파일이 없어 제공자 순서로 진행: {local}")

    for name in providers:
        if name == "synth":
            break
        fn = BGM_PROVIDERS.get(name)
        if not fn:
            warn(STAGE, f"알 수 없는 제공자 무시: {name}")
            continue
        try:
            url, info = fn(query=query, mood=mood)
            tmp = out.with_suffix(".src")
            download(url, tmp, timeout=180, min_bytes=50_000, stage=STAGE)
            run_ffmpeg(["-i", str(tmp), "-vn", "-c:a", "libmp3lame", "-q:a", "3", str(out)], stage=STAGE)
            tmp.unlink(missing_ok=True)
            d = media_duration(out)
            if d < 15:
                raise ValueError(f"트랙이 너무 짧음({d:.1f}s)")
            info["duration"] = round(d, 2)
            write_json(out.with_suffix(".json"), info)
            log(STAGE, f'{name} ✓ "{info.get("title")}" — {info.get("artist")} ({d:.0f}s)')
            return info
        except LookupError as e:
            log(STAGE, f"{name} 건너뜀: {e}")
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"{name} 실패: {e.__class__.__name__}: {str(e)[:160]}")

    info = synth_bgm(mood, duration, out, seed=seed)
    write_json(out.with_suffix(".json"), info)
    log(STAGE, f"웹 BGM 없음 → 로컬 합성 트랙({_mood_norm(mood)}, seed {seed}) 사용")
    return info


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts BGM/SFX")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("bgm")
    b.add_argument("--query", default="")
    b.add_argument("--mood", default="playful", help=", ".join(MOODS))
    b.add_argument("--duration", type=float, default=60)
    b.add_argument("--out", required=True)
    b.add_argument("--providers", default=",".join(DEFAULT_BGM_PROVIDERS))
    b.add_argument("--local", default=None)
    b.add_argument("--seed", type=int, default=0)
    s = sub.add_parser("sfx")
    s.add_argument("--name", required=True, help=", ".join(SFX_FILTERS))
    s.add_argument("--out", required=True)
    s.add_argument("--provider", default="synth", choices=["synth", "freesound"])
    args = ap.parse_args()
    if args.cmd == "bgm":
        info = fetch_bgm(query=args.query, mood=args.mood, duration=args.duration, out=args.out,
                         providers=[p.strip() for p in args.providers.split(",") if p.strip()], local=args.local,
                         seed=args.seed)
    else:
        info = fetch_sfx(args.name, Path(args.out), args.provider)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
