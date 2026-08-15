# -*- coding: utf-8 -*-
"""Add one ready-to-publish post to the daily queue.

Claude uses this to refill the queue: write the post body as an HTML file, then

    python add_to_queue.py --title "제목" --body-file post.html --labels "부업,자동화"

Or add a prebuilt JSON ({"title","html","labels"}):

    python add_to_queue.py --file post.json

Posts are stored as queue/NNNN.json and published oldest-first (FIFO) by
daily_post.py. A monotonic counter in config.json keeps ordering stable.
"""
import argparse
import json
import sys
from pathlib import Path

from common import SKILL_DIR, load_config, save_config

QUEUE_DIR = SKILL_DIR / "queue"


def add_post(title, html, labels):
    if not title or not html:
        raise ValueError("title 과 html 은 필수입니다.")
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    cfg = load_config()
    seq = int(cfg.get("queue_seq", 1))
    path = QUEUE_DIR / f"{seq:04d}.json"
    path.write_text(
        json.dumps(
            {"title": title, "html": html, "labels": labels or []},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    cfg["queue_seq"] = seq + 1
    save_config(cfg)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", help="{title, html, labels} 형식 JSON 파일")
    ap.add_argument("--title")
    ap.add_argument("--body-file", help="HTML 본문 파일")
    ap.add_argument("--labels", default="", help="쉼표로 구분한 라벨")
    args = ap.parse_args()

    if args.file:
        data = json.loads(Path(args.file).read_text(encoding="utf-8"))
        title = data["title"]
        html = data["html"]
        labels = data.get("labels", [])
    else:
        if not args.title or not args.body_file:
            ap.error("--file 또는 (--title 과 --body-file) 을 지정하세요.")
        title = args.title
        html = Path(args.body_file).read_text(encoding="utf-8")
        labels = [x.strip() for x in args.labels.split(",") if x.strip()]

    path = add_post(title, html, labels)
    total = len(list(QUEUE_DIR.glob("*.json")))
    print(f"큐에 추가: {path.name}  (제목: {title})  | 현재 큐: {total}편")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"큐 추가 실패: {e}", file=sys.stderr)
        sys.exit(1)
