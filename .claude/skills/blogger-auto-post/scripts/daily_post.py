# -*- coding: utf-8 -*-
"""Unattended daily publish — run by the Windows Scheduled Task.

Order of preference for "what to post today":
  1. queue/  — the oldest *.json file Claude pre-generated. Most reliable and
     gives you editorial control. Each file: {"title", "html", "labels": [...]}.
  2. topics.txt + Anthropic API — if the queue is empty and ANTHROPIC_API_KEY
     is set, take the next unused topic and generate a post on the fly.

Either way: publish PUBLIC, notify Slack with the result, and notify Slack on
failure too so a broken daily run is never silent.

    python .claude/skills/blogger-auto-post/scripts/daily_post.py
"""
import json
import sys
import traceback
from pathlib import Path

from common import SKILL_DIR, load_config, save_config, slack_notify, now_str
from publish import publish_post

QUEUE_DIR = SKILL_DIR / "queue"
POSTED_DIR = SKILL_DIR / "queue" / "posted"
TOPICS_PATH = SKILL_DIR / "topics.txt"


def _next_from_queue():
    if not QUEUE_DIR.exists():
        return None
    files = sorted(p for p in QUEUE_DIR.glob("*.json") if p.is_file())
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
        return None  # 주제를 모두 소진함
    topic = topics[idx]

    from generate import generate_post  # imported lazily (needs API key)

    post = generate_post(topic)
    return {"source": "topics", "topic": topic, "index": idx, "post": post}


def main():
    picked = _next_from_queue() or _next_from_topics()
    if not picked:
        slack_notify(
            f"ℹ️ 오늘 발행할 블로그 글이 없습니다 (queue 비어있음 / 주제 소진).\n시간: {now_str()}"
        )
        print("발행할 항목 없음.")
        return

    post = picked["post"]
    title = post["title"]
    html = post["html"]
    labels = post.get("labels", [])

    published, cfg = publish_post(title, html, labels, is_draft=False)
    url = published.get("url", "")

    # 발행 성공 후 뒷정리 (다음 실행 때 중복 발행 방지)
    if picked["source"] == "queue":
        POSTED_DIR.mkdir(parents=True, exist_ok=True)
        picked["path"].rename(POSTED_DIR / picked["path"].name)
    elif picked["source"] == "topics":
        c = load_config()
        c["topic_index"] = picked["index"] + 1
        save_config(c)

    label_str = ", ".join(labels) if labels else "-"
    slack_notify(
        f"🆕 블로그 자동 발행 완료\n"
        f"• 블로그: {cfg.get('blog_name', '')}\n"
        f"• 제목: {title}\n"
        f"• 링크: {url}\n"
        f"• 라벨: {label_str}\n"
        f"• 소스: {picked['source']}\n"
        f"• 시간: {now_str()}"
    )
    print(f"[{now_str()}] 발행 완료: {title} -> {url}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        err = f"{e}\n{traceback.format_exc()}"
        print(err, file=sys.stderr)
        slack_notify(
            f"⚠️ 블로그 자동 발행 실패\n• 사유: {e}\n• 시간: {now_str()}"
        )
        sys.exit(1)
