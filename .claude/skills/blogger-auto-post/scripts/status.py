# -*- coding: utf-8 -*-
"""Print a quick status of the blog pipeline: published count, queue depth,
and the titles waiting next. The blog-manager agent runs this first to decide
whether the queue needs a refill.

    python .claude/skills/blogger-auto-post/scripts/status.py
"""
import json
from pathlib import Path

from common import SKILL_DIR, load_config

QUEUE_DIR = SKILL_DIR / "queue"
POSTED_DIR = QUEUE_DIR / "posted"


def _titles(paths):
    out = []
    for p in paths:
        try:
            out.append((p.name, json.loads(p.read_text(encoding="utf-8")).get("title", "?")))
        except Exception:  # noqa: BLE001
            out.append((p.name, "(읽기 실패)"))
    return out


def main():
    cfg = load_config()
    queue = sorted(QUEUE_DIR.glob("*.json")) if QUEUE_DIR.exists() else []
    posted = sorted(POSTED_DIR.glob("*.json")) if POSTED_DIR.exists() else []

    print("=== 블로그 상태 ===")
    print(f"블로그   : {cfg.get('blog_name', '?')}  ({cfg.get('blog_url', '')})")
    print(f"발행 완료: {len(posted)}편")
    print(f"큐 대기  : {len(queue)}편")

    if posted:
        print("\n최근 발행 (마지막 3편):")
        for name, title in _titles(posted[-3:]):
            print(f"  - {name}: {title}")

    if queue:
        print("\n다음 발행 예정 (앞 5편):")
        for name, title in _titles(queue[:5]):
            print(f"  - {name}: {title}")
    else:
        print("\n⚠️ 큐가 비어 있습니다. 새 글을 add_to_queue.py 로 채워야 합니다.")

    # 리필 판단용 신호 (agent 가 파싱하기 쉽게 마지막 줄에 요약)
    print(f"\nSUMMARY queue={len(queue)} posted={len(posted)}")


if __name__ == "__main__":
    main()
