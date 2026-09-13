# -*- coding: utf-8 -*-
"""Add one ready-to-post thread to the daily queue.

Claude uses this to refill the queue: write the post body to a text file, then

    python add_to_queue.py --text-file post.txt [--link URL] [--image-url URL]

Or add a prebuilt JSON ({"text", "link"?, "image_url"?}):

    python add_to_queue.py --file post.json

Posts are stored as queue/NNNN.json and published oldest-first (FIFO) by
daily_post.py. A monotonic counter in config.json keeps ordering stable.
"""
import argparse
import json
import sys
from pathlib import Path

from common import SKILL_DIR, load_config, save_config, MAX_CHARS

QUEUE_DIR = SKILL_DIR / "queue"


def add_post(text, link=None, image_url=None):
    text = (text or "").strip()
    if not text:
        raise ValueError("text 는 필수입니다.")
    if len(text) > MAX_CHARS:
        raise ValueError(
            f"글자 수 초과: {len(text)}자 (스레드 최대 {MAX_CHARS}자)."
        )
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    cfg = load_config()
    seq = int(cfg.get("queue_seq", 1))
    path = QUEUE_DIR / f"{seq:04d}.json"
    post = {"text": text}
    if link:
        post["link"] = link
    if image_url:
        post["image_url"] = image_url
    path.write_text(
        json.dumps(post, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    cfg["queue_seq"] = seq + 1
    save_config(cfg)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", help='{text, link?, image_url?} 형식 JSON 파일')
    ap.add_argument("--text-file", help="본문 텍스트 파일")
    ap.add_argument("--text", help="본문 직접 전달")
    ap.add_argument("--link", default=None)
    ap.add_argument("--image-url", default=None)
    args = ap.parse_args()

    if args.file:
        data = json.loads(Path(args.file).read_text(encoding="utf-8"))
        text = data["text"]
        link = data.get("link")
        image_url = data.get("image_url")
    else:
        if args.text_file:
            text = Path(args.text_file).read_text(encoding="utf-8")
        elif args.text:
            text = args.text
        else:
            ap.error("--file, --text-file, 또는 --text 중 하나를 지정하세요.")
        link = args.link
        image_url = args.image_url

    path = add_post(text, link=link, image_url=image_url)
    total = len(list(QUEUE_DIR.glob("*.json")))
    print(f"큐에 추가: {path.name}  | 현재 큐: {total}편")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"큐 추가 실패: {e}", file=sys.stderr)
        sys.exit(1)
