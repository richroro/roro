#!/usr/bin/env python3
"""auto-shorts 오케스트레이터: project.json → final.mp4

    python make_shorts.py project.json [--out shorts_output] [--force] [--stage all]

단계(각 단계 산출물은 <out>/<slug>/work/ 에 캐시되어 재실행 시 건너뛴다):
  1. tts     씬별 나레이션 mp3 + 단어 타이밍 (edge-tts → gTTS)
  2. plan    타임라인 계산 (씬 길이 = 여백 + 나레이션 + 여백)
  3. images  씬별 1080x1920 이미지 (pollinations → 스톡 API → 위키미디어 → 텍스트 카드)
  4. audio   BGM (jamendo/freesound/openverse → 합성) + 효과음(합성)
  5. subs    카라오케 ASS 자막
  6. video   켄 번즈 클립 → xfade → 자막 번인
  7. mix     나레이션/BGM(덕킹)/효과음 믹스 + 라우드니스 정규화 → final.mp4
  8. extras  preview.jpg(프레임 그리드), thumbnail.jpg, meta.md(제목·설명·해시태그·출처)

project.json 스키마는 SKILL.md 와 project.example.json 참고.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (FPS, SKILL_DIR, find_ffmpeg, fresh, load_project, log, media_duration,  # noqa: E402
                    read_json, slugify, warn, write_json)
from log_result import features_from_project  # noqa: E402
import build_subtitles  # noqa: E402
import fetch_audio  # noqa: E402
import fetch_images  # noqa: E402
import render  # noqa: E402
import tts  # noqa: E402

STAGES = ["tts", "plan", "images", "audio", "subs", "video", "mix", "extras"]
DEFAULT_STYLE = {
    "image_style": "",            # 모든 이미지 프롬프트 뒤에 붙는 스타일 문구
    "transition": "fade",         # fade | mix | smoothleft | zoomin | ... | none
    "transition_duration": 0.4,
    "ken_burns": True,
    "vignette": True,
    "look": "",                   # "" | cinematic
    "gap_before": 0.10,           # 씬 시작 후 나레이션까지 여백(초)
    "gap_after": 0.35,            # 나레이션 끝 뒤 여백(초)
    "min_scene": 1.8,
    "auto_transition_sfx": False, # 씬 전환마다 whoosh
    "transition_sfx_volume": 0.35,
    "sfx_volume": 0.7,
}


def sig_of(*parts) -> str:
    h = hashlib.md5()
    for p in parts:
        if isinstance(p, Path):
            st = p.stat() if p.exists() else None
            h.update(f"{p}:{st.st_size if st else 0}:{int(st.st_mtime) if st else 0}".encode())
        else:
            h.update(json.dumps(p, sort_keys=True, default=str).encode())
    return h.hexdigest()


class Sigs:
    """산출물별 입력 서명을 기록해, 입력이 바뀌었을 때만 다시 만든다."""

    def __init__(self, path: Path):
        self.path = path
        self.data = read_json(path, {}) or {}
        self._lock = threading.Lock()

    def stale(self, out: Path, sig: str, force: bool) -> bool:
        if force or not out.exists() or out.stat().st_size == 0:
            return True
        return self.data.get(out.name) != sig

    def mark(self, out: Path, sig: str) -> None:
        with self._lock:              # 이미지 수집은 병렬이라 동시 쓰기를 막는다
            self.data[out.name] = sig
            write_json(self.path, self.data)


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts: project.json → 쇼츠 mp4")
    ap.add_argument("project")
    ap.add_argument("--out", default="shorts_output", help="출력 루트 폴더 (기본 ./shorts_output)")
    ap.add_argument("--force", action="store_true", help="캐시 무시하고 전부 다시 생성")
    ap.add_argument("--stage", default="all", help="all 또는 " + "|".join(STAGES) + " (해당 단계까지만 실행)")
    ap.add_argument("--tts-engine", default="auto", choices=["auto", "edge", "gtts", "silent"])
    ap.add_argument("--offline", action="store_true",
                    help="네트워크 없이 무음 나레이션·텍스트 카드·합성 BGM 으로 구성만 미리보기")
    ap.add_argument("--image-providers", default=None, help="쉼표 구분, 예: pollinations,pexels,card")
    ap.add_argument("--bgm-providers", default=None, help="쉼표 구분, 예: jamendo,synth")
    ap.add_argument("--no-bgm", action="store_true")
    ap.add_argument("--no-sfx", action="store_true")
    ap.add_argument("--jobs", type=int, default=3, help="이미지 병렬 수집 수")
    args = ap.parse_args()

    if args.offline:
        args.tts_engine = "silent"
        args.image_providers = args.image_providers or "card"
        args.bgm_providers = args.bgm_providers or "synth"
    if args.stage != "all" and args.stage not in STAGES:
        ap.error(f"--stage 는 all 또는 {STAGES} 중 하나")
    stop_after = STAGES.index(args.stage) if args.stage != "all" else len(STAGES)

    t0 = time.time()
    find_ffmpeg()
    project = load_project(args.project)
    style = dict(DEFAULT_STYLE)
    style.update(project.get("style") or {})
    slug = project.get("slug") or slugify(project["title"])
    outdir = Path(args.out) / slug
    work = outdir / "work"
    work.mkdir(parents=True, exist_ok=True)
    if Path(args.project).resolve() != (outdir / "project.json").resolve():
        shutil.copyfile(args.project, outdir / "project.json")
    sigs = Sigs(work / "signatures.json")
    lang = project.get("lang", "ko")
    scenes = project["scenes"]
    n = len(scenes)
    log("start", f'"{project["title"]}"  씬 {n}개 → {outdir}')

    # ---------------------------------------------------------------- 1. TTS
    voice = project.get("voice")
    rate = project.get("rate", "+0%")
    pitch = project.get("pitch", "+0Hz")
    nar_files, nar_info = [], []
    for i, sc in enumerate(scenes, 1):
        out = work / f"nar_{i:02d}.mp3"
        sig = sig_of(sc["narration"], voice, rate, pitch, lang, args.tts_engine)
        if sigs.stale(out, sig, args.force) or not out.with_suffix(".json").exists():
            log("tts", f"{i:02d}/{n} {sc['narration'][:34]}…")
            info = tts.synthesize(sc["narration"], out, voice=voice, lang=lang, rate=rate, pitch=pitch,
                                  engine=args.tts_engine)
            sigs.mark(out, sig)
        else:
            info = read_json(out.with_suffix(".json"))
        nar_files.append(out)
        nar_info.append(info)
    log("tts", f'완료: {nar_info[0]["engine"]} / {nar_info[0]["voice"]}')
    if stop_after <= STAGES.index("tts"):
        return

    # ---------------------------------------------------------------- 2. 타임라인
    tl_scenes, t = [], 0.0
    for i, (sc, info) in enumerate(zip(scenes, nar_info)):
        lead = style["gap_before"] + (0.1 if i == 0 else 0.0)
        dur = max(style["min_scene"], lead + info["duration"] + style["gap_after"])
        if sc.get("min_duration"):
            dur = max(dur, float(sc["min_duration"]))
        words = [{"text": w["text"], "start": round(w["start"] + lead, 3), "end": round(w["end"] + lead, 3)}
                 for w in info["words"]]
        motion = sc.get("motion") or (render.MOTIONS[i % len(render.MOTIONS)] if style["ken_burns"] else "static")
        tl_scenes.append({
            "index": i + 1, "start": round(t, 3), "duration": round(dur, 3), "lead": round(lead, 3),
            "narration": sc["narration"], "headline": sc.get("headline", ""), "words": words,
            "audio": str(nar_files[i]), "sfx": sc.get("sfx"), "motion": motion,
        })
        t += dur
    total = round(t, 3)
    timeline = {
        "title": project["title"], "total": total, "fps": FPS, "transition": style["transition"],
        "transition_duration": float(style["transition_duration"]), "cta": project.get("cta", ""),
        "style": project.get("style") or {}, "scenes": tl_scenes,
    }
    write_json(work / "timeline.json", timeline)
    log("plan", f"총 길이 {total:.1f}s  (씬 평균 {total / n:.1f}s)")
    if total > 60:
        warn("plan", f"60초를 넘습니다({total:.1f}s). 유튜브 쇼츠는 최대 60초(3분까지 허용되지만 노출이 다름) — 나레이션을 줄이세요.")
    if stop_after <= STAGES.index("plan"):
        return

    # ---------------------------------------------------------------- 3. 이미지
    providers = [p.strip() for p in args.image_providers.split(",")] if args.image_providers else None
    used_urls: set = set()
    img_files = [work / f"img_{i:02d}.jpg" for i in range(1, n + 1)]

    def get_image(i: int):
        sc = scenes[i]
        out = img_files[i]
        sig = sig_of(sc.get("image_prompt", ""), sc.get("keywords", ""), sc.get("image", ""), style["image_style"],
                     providers)
        if not sigs.stale(out, sig, args.force):
            return read_json(out.with_suffix(".json"), {"provider": "cache"})
        info = fetch_images.fetch_image(
            prompt=sc.get("image_prompt", ""), keywords=sc.get("keywords", ""), out=out, providers=providers,
            seed=int(project.get("seed", 7)) * 100 + i + 1,   # 씬마다 다른 고정 시드(카드 색·AI 생성 재현성)
            style=style["image_style"], card_text="",
            used=used_urls, local=sc.get("image"))
        sigs.mark(out, sig)
        return info

    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as ex:
        img_info = list(ex.map(get_image, range(n)))
    log("images", "완료: " + ", ".join(f"{i + 1}:{inf.get('provider')}" for i, inf in enumerate(img_info)))
    if stop_after <= STAGES.index("images"):
        return

    # ---------------------------------------------------------------- 4. BGM / SFX
    bgm_cfg = project.get("bgm") or {}
    bgm_file, bgm_info = None, None
    if not args.no_bgm and bgm_cfg is not False:
        bgm_file = work / "bgm.mp3"
        bprov = [p.strip() for p in args.bgm_providers.split(",")] if args.bgm_providers else None
        sig = sig_of(bgm_cfg, bprov, int(total))
        if sigs.stale(bgm_file, sig, args.force):
            bgm_info = fetch_audio.fetch_bgm(query=bgm_cfg.get("query", ""), mood=bgm_cfg.get("mood", "playful"),
                                             duration=max(30.0, total), out=bgm_file, providers=bprov,
                                             local=bgm_cfg.get("file"))
            sigs.mark(bgm_file, sig)
        else:
            bgm_info = read_json(bgm_file.with_suffix(".json"), {"provider": "cache"})
    sfx_events: list[tuple[Path, float, float]] = []
    if not args.no_sfx:
        names = set()
        for sc in tl_scenes:
            if sc.get("sfx") and sc["sfx"] != "none":
                names.add(sc["sfx"])
        if style["auto_transition_sfx"]:
            names.add("whoosh")
        for name in sorted(names):
            f = work / f"sfx_{name}.wav"
            if fresh(f, args.force):
                fetch_audio.fetch_sfx(name, f)
        for i, sc in enumerate(tl_scenes):
            if sc.get("sfx") and sc["sfx"] != "none":
                sfx_events.append((work / f"sfx_{sc['sfx']}.wav", sc["start"], float(style["sfx_volume"])))
            elif style["auto_transition_sfx"] and i > 0:
                sfx_events.append((work / "sfx_whoosh.wav", sc["start"] - 0.15, float(style["transition_sfx_volume"])))
    if stop_after <= STAGES.index("audio"):
        return

    # ---------------------------------------------------------------- 5. 자막
    subs = work / "subs.ass"
    ass_text = build_subtitles.build_ass(timeline, timeline["style"])
    if not subs.exists() or subs.read_text(encoding="utf-8") != ass_text:
        subs.write_text(ass_text, encoding="utf-8")   # 내용이 같으면 건드리지 않아 캐시가 유지된다
    if stop_after <= STAGES.index("subs"):
        return

    # ---------------------------------------------------------------- 6. 영상
    durations = [sc["duration"] for sc in tl_scenes]
    tdur = float(style["transition_duration"]) if style["transition"] != "none" else 0.0
    lengths = render.clip_lengths(durations, tdur)
    clips = []
    for i, sc in enumerate(tl_scenes):
        clip = work / f"clip_{i + 1:02d}.mp4"
        sig = sig_of(img_files[i], round(lengths[i], 3), sc["motion"], style["vignette"], style["look"])
        if sigs.stale(clip, sig, args.force):
            log("video", f"클립 {i + 1:02d}/{n} ({sc['motion']}, {lengths[i]:.1f}s)")
            render.render_scene_clip(img_files[i], clip, lengths[i], sc["motion"],
                                     vignette=bool(style["vignette"]), look=style["look"])
            sigs.mark(clip, sig)
        clips.append(clip)
    video = work / "video.mp4"
    sig = sig_of(*clips, subs, durations, style["transition"], tdur)
    if sigs.stale(video, sig, args.force):
        log("video", f"xfade({style['transition']}) 이어붙이기 + 자막 번인…")
        render.assemble_video(clips, durations, video, subs=subs, transition=style["transition"], tdur=tdur)
        sigs.mark(video, sig)
    if stop_after <= STAGES.index("video"):
        return

    # ---------------------------------------------------------------- 7. 믹스
    nar_wav = work / "narration.wav"
    leads = [sc["lead"] for sc in tl_scenes]
    sig = sig_of(*nar_files, durations, leads)
    if sigs.stale(nar_wav, sig, args.force):
        render.narration_track(nar_files, durations, leads, nar_wav)
        sigs.mark(nar_wav, sig)
    tracks = [nar_wav]
    if bgm_file:
        music_wav = work / "music.wav"
        vol = float(bgm_cfg.get("volume", 0.30))
        duck = bool(bgm_cfg.get("duck", True))
        sig = sig_of(bgm_file, nar_wav, total, vol, duck)
        if sigs.stale(music_wav, sig, args.force):
            render.music_track(bgm_file, total, vol, nar_wav, music_wav, duck=duck)
            sigs.mark(music_wav, sig)
        tracks.append(music_wav)
    if sfx_events:
        sfx_wav = work / "sfx.wav"
        sig = sig_of([(str(f), s, v) for f, s, v in sfx_events], total)
        if sigs.stale(sfx_wav, sig, args.force):
            render.sfx_track(sfx_events, total, sfx_wav)
            sigs.mark(sfx_wav, sig)
        tracks.append(sfx_wav)
    final = outdir / "final.mp4"
    sig = sig_of(video, *tracks)
    if sigs.stale(final, sig, args.force):
        log("mix", f"트랙 {len(tracks)}개 믹스 + 라우드니스 정규화 → {final.name}")
        render.mux(video, tracks, final)
        sigs.mark(final, sig)
    if stop_after <= STAGES.index("mix"):
        return

    # ---------------------------------------------------------------- 8. 부가 산출물
    marks = [sc["start"] + 0.6 for sc in tl_scenes if sc.get("headline")]
    if project.get("cta"):
        marks.append(total - 1.0)
    render.preview_sheet(final, total, outdir / "preview.jpg", marks=marks)
    render.thumbnail(img_files[0], project.get("thumbnail_text") or project["title"], outdir / "thumbnail.jpg")
    credits, no_credit = [], []
    for i, inf in enumerate(img_info, 1):
        prov = inf.get("provider")
        if prov in ("card", "cache", "pollinations", "local"):
            continue                      # 생성·로컬 자료는 출처 표기 대상이 아니다
        if inf.get("credit"):
            credits.append(f"- 씬 {i} 이미지: {inf['credit']}")
    if bgm_info:
        if bgm_info.get("provider") in ("synth", "cache", "local"):
            no_credit.append("합성 BGM" if bgm_info.get("provider") != "local" else "사용자 제공 BGM(라이선스 직접 확인)")
        elif bgm_info.get("credit"):
            credits.append(f"- 배경음악: {bgm_info['credit']}")
    if any(inf.get("provider") == "pollinations" for inf in img_info):
        no_credit.append("AI 생성 이미지(Pollinations)")
    meta = project.get("meta") or {}
    tags = meta.get("hashtags") or []
    lines = [f"# {project['title']}", "",
             f"- 길이: {total:.1f}s / 씬 {n}개 / 보이스 {nar_info[0]['voice']}",
             f"- 파일: {final}", "",
             "## 설명 (복사해서 업로드 설명란에)", "", meta.get("description", "").strip(), "",
             " ".join(t if t.startswith("#") else f"#{t}" for t in tags), "",
             "## 출처 표기 (CC 자료를 썼다면 설명란에 함께 넣기)", ""]
    lines += credits or ["- 없음"]
    lines += ["", "표기 불필요: " + (", ".join(no_credit) or "해당 없음") + " (생성·합성 자료)"]
    # Threads 게시글 초안: 첫 줄이 훅(150자 이내), 질문으로 끝내 답글 유도
    last_sentence = scenes[-1]["narration"].strip().split(". ")[-1]
    question = last_sentence if last_sentence.endswith("?") else "여러분은 알고 있었나요?"
    lines += ["", "## Threads 게시글 초안 (첫 줄 = 훅, 마지막 줄 = 질문)", "",
              project["title"], "", (meta.get("description", "") or scenes[0]["narration"]).strip(), "", question,
              "", "(영상 링크 또는 파일 첨부) " + " ".join(f"#{t.lstrip('#')}" for t in tags[:3])]
    (outdir / "meta.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    # 제작 레지스트리: 최근 편들의 훅 유형·카테고리가 반복되는지 report.py 가 본다
    reg = SKILL_DIR / "data" / "productions.jsonl"
    reg.parent.mkdir(parents=True, exist_ok=True)
    entry = {"slug": slug, "date": dt.date.today().isoformat(), "out": str(final)}
    entry.update(features_from_project(project, timeline))
    existing = [l for l in reg.read_text(encoding="utf-8").splitlines() if l.strip()] if reg.exists() else []
    existing = [l for l in existing if json.loads(l).get("slug") != slug]
    reg.write_text("\n".join(existing + [json.dumps(entry, ensure_ascii=False)]) + "\n", encoding="utf-8")
    actual = media_duration(final)
    log("done", f"{final}  ({actual:.1f}s, {final.stat().st_size / 1e6:.1f}MB, {time.time() - t0:.0f}s 소요)")
    log("done", f"검수: {outdir / 'preview.jpg'} 를 열어 자막 위치·이미지 품질을 확인하세요. 메타: {outdir / 'meta.md'}")


if __name__ == "__main__":
    main()
