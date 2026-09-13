# -*- coding: utf-8 -*-
"""Unattended daily Threads post — run by the Windows Scheduled Task.

Order of preference for "what to post today":
  1. queue/  — the oldest *.json file Claude pre-wrote. Most reliable and gives
     editorial control. Each file: {"text", "link"?, "image_url"?}.
  2. topics.txt + Anthropic API — if the queue is empty and ANTHROPIC_API_KEY
     is set, take the next unused topic and generate a post on the fly.

Either way: publish, notify Slack with the result, and notify Slack on failure
too so a broken run is never silent. When the queue runs low it also nudges you
on Slack so you can ask Claude to refill it.

    python .claude/skills/threads-auto-post/scripts/daily_post.py
    python .claude/skills/threads-auto-post/scripts/daily_post.py --dry-run
"""
import argparse
import sys
import traceback
from pathlib import Path

from common import (
    SKILL_DIR,
    load_config,
    save_config,
    slack_notify,
    now_str,
    publish_thread,
)
import json

QUEUE_DIR = SKILL_DIR / "queue"
POSTED_DIR = SKILL_DIR / "queue" / "posted"
TOPICS_PATH = SKILL_DIR / "topics.txt"

LOW_QUEUE_THRESHOLD = 2


def _queue_files():
    if not QUEUE_DIR.exists():
        return []
    return sorted(p for p in QUEUE_DIR.glob("*.json") if p.is_file())


def _next_from_queue():
    files = _queue_files()
    if not files:
        return None
    path = files[0]
    post = json.loads(path.read_text(encoding="utf-8"))
    return {"source": "queue", "path": path, "post": post}


def _next_from_topics():
    if not TOPICS_PATH.exists():
        return None
    topics = [
        line.strip()
        for line in TOPICS_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not topics:
        return None
    cfg = load_config()
    idx = cfg.get("topic_index", 0)
    if idx >= len(topics):
        return None  # 주제 모두 소진
    topic = topics[idx]

    from generate import generate_post  # lazy import (needs API key)

    post = generate_post(topic)
    return {"source": "topics", "topic": topic, "index": idx, "post": post}


def main(dry_run=False):
    picked = _next_from_queue() or _next_from_topics()
    if not picked:
        msg = (
            "ℹ️ 오늘 올릴 스레드 글이 없습니다 (queue 비어있음 / 주제 소진).\n"
            "Claude에게 '스레드 글 더 만들어서 큐에 넣어줘'라고 요청하세요.\n"
            f"시간: {now_str()}"
        )
        if dry_run:
            print("[dry-run] " + msg)
        else:
            slack_notify(msg)
            print("게시할 항목 없음.")
        return

    post = picked["post"]
    text = post["text"]
    link = post.get("link")
    image_url = post.get("image_url")

    if dry_run:
        remaining = max(
            0, len(_queue_files()) - (1 if picked["source"] == "queue" else 0)
        )
        print("[dry-run] 실제 게시하지 않고 다음 글을 올릴 예정입니다:")
        print(f"  소스   : {picked['source']}")
        print(f"  본문   : {text}")
        print(f"  글자 수: {len(text)}자")
        print(f"  링크   : {link or '-'}")
        print(f"  이미지 : {image_url or '-'}")
        print(f"  게시 후 큐 잔량: {remaining}편")
        return

    result = publish_thread(text, link=link, image_url=image_url)
    permalink = result.get("permalink") or "(링크 확인 불가)"

    # 게시 성공 후 뒷정리 (다음 실행 때 중복 게시 방지)
    remaining = None
    if picked["source"] == "queue":
        POSTED_DIR.mkdir(parents=True, exist_ok=True)
        picked["path"].rename(POSTED_DIR / picked["path"].name)
        remaining = len(_queue_files())
    elif picked["source"] == "topics":
        c = load_config()
        c["topic_index"] = picked["index"] + 1
        save_config(c)

    cfg = load_config()
    preview = text if len(text) <= 80 else text[:77] + "..."
    lines = [
        "🧵 스레드 자동 게시 완료",
        f"• 계정: @{cfg.get('username', '')}",
        f"• 내용: {preview}",
        f"• 링크: {permalink}",
        f"• 소스: {picked['source']}",
        f"• 시간: {now_str()}",
    ]
    if remaining is not None:
        lines.append(f"• 큐 잔량: {remaining}편")
    slack_notify("\n".join(lines))

    if remaining is not None and remaining <= LOW_QUEUE_THRESHOLD:
        slack_notify(
            f"⏳ 스레드 게시 큐가 {remaining}편 남았습니다.\n"
            "Claude에게 '스레드 글 더 만들어서 큐에 넣어줘'라고 요청해 채워두세요."
        )

    print(f"[{now_str()}] 게시 완료 -> {permalink} (큐 잔량: {remaining})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="실제 게시 없이 다음에 올릴 글만 미리 확인",
    )
    args = ap.parse_args()
    try:
        main(dry_run=args.dry_run)
    except Exception as e:  # noqa: BLE001
        err = f"{e}\n{traceback.format_exc()}"
        print(err, file=sys.stderr)
        if not args.dry_run:
            slack_notify(
                f"⚠️ 스레드 자동 게시 실패\n• 사유: {e}\n• 시간: {now_str()}"
            )
        sys.exit(1)
