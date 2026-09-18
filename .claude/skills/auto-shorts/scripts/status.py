# -*- coding: utf-8 -*-
"""auto-shorts 상태 요약: 큐 잔량, 다음 제목, 발행 이력, 설정/토큰 유무.

    python status.py
"""
import json
from pathlib import Path

from common import (
    QUEUE_DIR, POSTED_DIR, POSTED_LOG_PATH, YT_TOKEN_PATH, CONFIG_PATH, OUTPUT_DIR,
    TOPICS_PATH, read_json_list, find_ffmpeg,
)


def main():
    queue = sorted(QUEUE_DIR.glob("*.json")) if QUEUE_DIR.exists() else []
    posted = sorted(POSTED_DIR.glob("*.json")) if POSTED_DIR.exists() else []
    log = read_json_list(POSTED_LOG_PATH)

    print("== auto-shorts 상태 ==")
    print(f"큐 잔량      : {len(queue)}편")
    for p in queue[:5]:
        try:
            t = json.loads(p.read_text(encoding="utf-8")).get("title", "")
        except Exception:  # noqa: BLE001
            t = "(읽기 실패)"
        print(f"   - {p.name}  {t}")
    if len(queue) > 5:
        print(f"   … 외 {len(queue) - 5}편")
    print(f"발행 완료    : {len(posted)}편 (로그 {len(log)}건)")
    if log:
        last = log[-1]
        print(f"   마지막: {last.get('date')}  {last.get('title')}  {last.get('youtube_url') or ''}")
    topics = 0
    if TOPICS_PATH.exists():
        topics = len([l for l in TOPICS_PATH.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")])
    print(f"주제 목록    : {topics}개 (topics.txt, 큐 비었을 때 API 생성용)")
    print(f"YouTube 토큰 : {'있음' if YT_TOKEN_PATH.exists() else '없음 (auth_youtube.py 실행 필요)'}")
    print(f"설정 파일    : {'있음' if CONFIG_PATH.exists() else '없음'} ({CONFIG_PATH})")
    print(f"ffmpeg       : {find_ffmpeg() or '없음'}")
    outs = sorted(Path(OUTPUT_DIR).glob("*/final.mp4")) if Path(OUTPUT_DIR).exists() else []
    print(f"렌더 결과물  : {len(outs)}개 ({OUTPUT_DIR})")


if __name__ == "__main__":
    main()
