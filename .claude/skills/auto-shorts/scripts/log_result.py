#!/usr/bin/env python3
"""성과 기록 (auto-shorts 업그레이드 루프).

업로드한 쇼츠의 성과(조회수·평균 시청률 등)를 제작 특징(카테고리·훅 유형·길이·보이스…)과 함께
`data/performance.jsonl` 에 한 줄로 남긴다. 몇 편 쌓이면 `report.py` 가 무엇이 잘 되는지 보여 준다.

    python log_result.py --slug octopus-three-hearts --views 12400 --avg-view-pct 71 --likes 310 --comments 12
    python log_result.py --slug ... --platform reels --views 3000 --note "훅을 질문형으로 바꾼 버전"

제작 특징은 shorts_output/<slug>/project.json 과 work/timeline.json 에서 자동으로 뽑는다.
같은 slug 를 다시 기록하면 최신 수치로 덧쓰지 않고 새 줄을 추가한다(시간 경과 추적용).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR, die, log, read_json  # noqa: E402

DATA_DIR = SKILL_DIR / "data"
PERF = DATA_DIR / "performance.jsonl"


def features_from_project(project: dict, timeline: dict | None) -> dict:
    scenes = project.get("scenes", [])
    style = project.get("style") or {}
    first = scenes[0]["narration"] if scenes else ""
    hook_type = project.get("hook_type") or guess_hook_type(first)
    return {
        "title": project.get("title"),
        "category": project.get("category") or "unknown",
        "hook_type": hook_type,
        "hook_text": first[:60],
        "duration": round(float(timeline["total"]), 1) if timeline else None,
        "scenes": len(scenes),
        "headlines": sum(1 for s in scenes if s.get("headline")),
        "sfx": sum(1 for s in scenes if s.get("sfx")),
        "voice": project.get("voice", "female"),
        "rate": project.get("rate", "+0%"),
        "transition": style.get("transition", "fade"),
        "image_style": (style.get("image_style") or "")[:60],
        "bgm_mood": (project.get("bgm") or {}).get("mood", "playful"),
        "chars": sum(len(s.get("narration", "")) for s in scenes),
    }


def guess_hook_type(first: str) -> str:
    f = first.strip()
    if "?" in f[:40]:
        return "question"
    if any(k in f[:30] for k in ("마세요", "하지 마", "절대")):
        return "warning"
    if any(ch.isdigit() for ch in f[:25]):
        return "number"
    if any(k in f[:40] for k in ("사실은", "아닙니다", "않습니다", "틀렸")):
        return "contradiction"
    return "statement"


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 성과 기록")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--out", default="shorts_output", help="제작 폴더 루트")
    ap.add_argument("--platform", default="youtube", choices=["youtube", "reels", "tiktok", "threads", "other"])
    ap.add_argument("--views", type=int, required=True)
    ap.add_argument("--avg-view-pct", type=float, default=None, help="평균 시청 지속률(%%), 유튜브 스튜디오 값")
    ap.add_argument("--viewed-vs-swiped", type=float, default=None, help="쇼츠 '시청 vs 스와이프' 비율(%%)")
    ap.add_argument("--likes", type=int, default=None)
    ap.add_argument("--comments", type=int, default=None)
    ap.add_argument("--subs", type=int, default=None, help="이 영상으로 늘어난 구독자")
    ap.add_argument("--days", type=int, default=None, help="업로드 후 며칠째 수치인지")
    ap.add_argument("--url", default=None)
    ap.add_argument("--note", default="", help="이 편에서 실험한 것")
    args = ap.parse_args()

    pdir = Path(args.out) / args.slug
    project = read_json(pdir / "project.json")
    if not project:
        die("log", f"프로젝트를 찾을 수 없습니다: {pdir / 'project.json'} (--out 확인)")
    timeline = read_json(pdir / "work" / "timeline.json")
    row = {
        "slug": args.slug, "logged_at": dt.datetime.now().isoformat(timespec="minutes"), "platform": args.platform,
        "views": args.views, "avg_view_pct": args.avg_view_pct, "viewed_vs_swiped": args.viewed_vs_swiped,
        "likes": args.likes, "comments": args.comments, "subs": args.subs, "days": args.days, "url": args.url,
        "note": args.note,
    }
    row.update(features_from_project(project, timeline))
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with PERF.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    n = sum(1 for _ in PERF.open(encoding="utf-8"))
    log("log", f"기록됨 ({n}번째): {args.slug} {args.platform} {args.views:,}회"
               + (f", 평균 시청률 {args.avg_view_pct}%" if args.avg_view_pct is not None else ""))
    log("log", "다음: python scripts/report.py 로 어떤 특징이 잘 되는지 확인")


if __name__ == "__main__":
    main()
