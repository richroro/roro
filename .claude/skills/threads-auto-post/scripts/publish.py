# -*- coding: utf-8 -*-
"""Publish one post to Threads, then notify Slack.

This is the script Claude calls after writing a post. The body comes from a
file so text with quotes/newlines/emoji is passed safely.

    python .claude/skills/threads-auto-post/scripts/publish.py \
        --text-file post.txt \
        [--link "https://..."]      # 링크 미리보기 첨부(선택)
        [--image-url "https://..."] # 공개 이미지 URL로 이미지 게시(선택)
        [--no-slack]                # Slack 알림 끄기

Prints the post permalink on the last line (so a caller can capture it).
"""
import argparse
import sys

from common import publish_thread, load_config, slack_notify, now_str, MAX_CHARS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text-file", help="게시할 본문 텍스트 파일")
    ap.add_argument("--text", help="본문을 직접 전달(짧을 때). --text-file 권장")
    ap.add_argument("--link", default=None, help="링크 미리보기로 첨부할 URL")
    ap.add_argument("--image-url", default=None, help="공개 이미지 URL(이미지 게시)")
    ap.add_argument("--no-slack", action="store_true", help="Slack 알림 끄기")
    args = ap.parse_args()

    if args.text_file:
        with open(args.text_file, "r", encoding="utf-8") as f:
            text = f.read().strip()
    elif args.text:
        text = args.text.strip()
    else:
        ap.error("--text-file 또는 --text 를 지정하세요.")

    if len(text) > MAX_CHARS:
        print(
            f"본문이 {len(text)}자로 스레드 한도({MAX_CHARS}자)를 넘습니다. 줄여 주세요.",
            file=sys.stderr,
        )
        sys.exit(1)

    result = publish_thread(text, link=args.link, image_url=args.image_url)
    permalink = result.get("permalink") or "(링크 확인 불가)"
    cfg = load_config()

    print(f"[{now_str()}] 스레드 게시 완료")
    print(f"media_id={result.get('id')}")

    if not args.no_slack:
        preview = text if len(text) <= 80 else text[:77] + "..."
        msg = (
            "🧵 스레드 게시 완료\n"
            f"• 계정: @{cfg.get('username', '')}\n"
            f"• 내용: {preview}\n"
            f"• 링크: {permalink}\n"
            f"• 시간: {now_str()}"
        )
        slack_notify(msg)

    # Last line = permalink, for easy capture by a caller.
    print(permalink)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"게시 실패: {e}", file=sys.stderr)
        sys.exit(1)
