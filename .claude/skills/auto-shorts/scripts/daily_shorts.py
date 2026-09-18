# -*- coding: utf-8 -*-
"""무인 일일 실행: 큐에서 대본 하나 → 렌더 → (유튜브 업로드) → Slack 으로 영상 전송.

    python daily_shorts.py                 # 큐 맨 앞 대본 1편 처리
    python daily_shorts.py --dry-run       # 실제 렌더 없이 다음에 만들 대본만 확인
    python daily_shorts.py --tts silent    # TTS 없이 무음 렌더 (파이프라인 테스트)
    python daily_shorts.py --no-upload     # 유튜브 업로드 생략 (Slack 전송은 함)
    python daily_shorts.py --count 2       # 한 번에 2편

"오늘 뭘 만들지" 우선순위:
  1. queue/*.json — Claude 가 미리 써 둔 대본 (FIFO). 처리 후 queue/posted/ 로 이동.
  2. topics.txt + ANTHROPIC_API_KEY — 큐가 비면 다음 주제로 대본을 즉석 생성.

틱톡·네이버 클립·릴스는 공개 API 자동 업로드가 사실상 막혀 있어(틱톡은 감사 전 비공개
전용, 클립은 API 없음) 완성 mp4 + 캡션을 Slack DM 으로 보낸다. 폰에서 Slack 을 열어
그대로 업로드하면 플랫폼당 1분이면 끝난다.
"""
import argparse
import json
import sys
import traceback
from pathlib import Path

from common import (
    QUEUE_DIR, POSTED_DIR, TOPICS_PATH, YT_TOKEN_PATH,
    load_config, save_config, slack_notify, slack_upload_file, now_str, record_posted,
)
from render import load_script, render

LOW_QUEUE_THRESHOLD = 2


def _queue_files():
    if not QUEUE_DIR.exists():
        return []
    return sorted(p for p in QUEUE_DIR.glob("*.json") if p.is_file())


def _next_from_queue():
    files = _queue_files()
    if not files:
        return None
    return {"source": "queue", "path": files[0], "script": load_script(files[0])}


def _next_from_topics():
    if not TOPICS_PATH.exists():
        return None
    topics = [l.strip() for l in TOPICS_PATH.read_text(encoding="utf-8").splitlines()
              if l.strip() and not l.strip().startswith("#")]
    cfg = load_config()
    idx = cfg.get("topic_index", 0)
    if idx >= len(topics):
        return None
    from generate import generate_script  # API 키 필요

    return {"source": "topics", "topic": topics[idx], "index": idx, "script": generate_script(topics[idx])}


def process_one(args):
    picked = _next_from_queue() or _next_from_topics()
    if not picked:
        msg = ("ℹ️ 오늘 만들 쇼츠 대본이 없습니다 (queue 비어있음 / 주제 소진).\n"
               "Claude 에게 '쇼츠 대본 더 만들어서 큐에 넣어줘' 라고 요청하세요.\n"
               f"시간: {now_str()}")
        if args.dry_run:
            print("[dry-run] " + msg)
        else:
            slack_notify(msg)
            print("처리할 항목 없음.")
        return False

    script = picked["script"]
    if args.dry_run:
        remaining = max(0, len(_queue_files()) - (1 if picked["source"] == "queue" else 0))
        nar = sum(len(s["narration"]) for s in script["scenes"]) + len(script.get("hook", "")) + len(script.get("cta", ""))
        print("[dry-run] 실제 렌더 없이 다음 대본만 표시합니다:")
        print(f"  소스     : {picked['source']}")
        print(f"  제목     : {script['title']}")
        print(f"  장면 수  : {len(script['scenes'])} (+훅/CTA)")
        print(f"  나레이션 : {nar}자 (≈{nar / 5.2 + len(script['scenes']) * 0.5:.0f}초)")
        print(f"  해시태그 : {' '.join(script.get('hashtags', []))}")
        print(f"  처리 후 큐 잔량: {remaining}편")
        return True

    meta = render(script, tts=args.tts, bgm=args.bgm)

    # 유튜브 업로드 (토큰 있고, 끄지 않았을 때만)
    youtube_url, privacy = None, None
    cfg = load_config()
    yt_enabled = cfg.get("youtube", {}).get("enabled", True)
    if not args.no_upload and yt_enabled and YT_TOKEN_PATH.exists():
        try:
            from upload_youtube import upload_short

            desc = (script.get("description") or "").strip()
            desc = (desc + "\n\n" + " ".join(script.get("hashtags", []))).strip()
            tags = [h.lstrip("#") for h in script.get("hashtags", [])]
            _, youtube_url, privacy = upload_short(meta["video"], script["title"], desc, tags)
        except Exception as e:  # noqa: BLE001
            print(f"[youtube] 업로드 실패 (계속 진행): {e}", file=sys.stderr)
            slack_notify(f"⚠️ 유튜브 업로드 실패 (영상은 만들어짐)\n• 제목: {script['title']}\n• 사유: {e}")
    elif not YT_TOKEN_PATH.exists():
        print("[youtube] 토큰 없음 — 업로드 생략 (auth_youtube.py 로 설정 가능)")

    record_posted(script, meta, youtube_url, source=picked["source"])

    # 큐 정리
    remaining = None
    if picked["source"] == "queue":
        POSTED_DIR.mkdir(parents=True, exist_ok=True)
        picked["path"].rename(POSTED_DIR / picked["path"].name)
        remaining = len(_queue_files())
    else:
        c = load_config()
        c["topic_index"] = picked["index"] + 1
        save_config(c)

    # Slack: 텍스트 + 영상 파일
    caption = Path(meta["caption"]).read_text(encoding="utf-8")
    lines = [
        "🎬 쇼츠 렌더 완료",
        f"• 제목: {script['title']}",
        f"• 길이: {meta['duration']:.0f}초  · 장면 {meta['scenes']}개",
    ]
    if youtube_url:
        lines.append(f"• YouTube: {youtube_url}" + (f" (현재 {privacy} — 스튜디오에서 공개 전환)" if privacy and privacy != "public" else ""))
    lines.append("• 틱톡/네이버클립/릴스: 아래 파일을 폰에서 바로 업로드 (캡션은 caption.txt 그대로)")
    if remaining is not None:
        lines.append(f"• 큐 잔량: {remaining}편")
    lines.append(f"• 시간: {now_str()}")
    text = "\n".join(lines)
    sent = slack_upload_file(meta["video"], title=script["title"], comment=text + "\n\n" + caption)
    if not sent:
        slack_notify(text + f"\n• 파일: {meta['video']}\n\n" + caption)

    if remaining is not None and remaining <= LOW_QUEUE_THRESHOLD:
        slack_notify(f"⏳ 쇼츠 대본 큐가 {remaining}편 남았습니다.\n"
                     "Claude 에게 '쇼츠 대본 더 만들어서 큐에 넣어줘' 라고 요청해 채워두세요.")

    print(f"[{now_str()}] 완료: {script['title']} -> {meta['video']} (큐 잔량: {remaining})")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--tts", choices=["edge", "silent"], default="edge")
    ap.add_argument("--no-upload", action="store_true", help="유튜브 업로드 생략")
    ap.add_argument("--bgm", default=None)
    ap.add_argument("--count", type=int, default=1, help="이번 실행에서 처리할 편수")
    args = ap.parse_args()
    try:
        for _ in range(max(1, args.count)):
            if not process_one(args):
                break
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        print(f"{e}\n{traceback.format_exc()}", file=sys.stderr)
        if not args.dry_run:
            slack_notify(f"⚠️ 쇼츠 자동 제작 실패\n• 사유: {e}\n• 시간: {now_str()}")
        sys.exit(1)


if __name__ == "__main__":
    main()
