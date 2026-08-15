# -*- coding: utf-8 -*-
"""Publish one post to Blogger, then notify Slack.

This is the script Claude calls after generating a post. Content comes from a
file (HTML preferred) so titles/bodies with quotes and newlines are safe.

    python .claude/skills/blogger-auto-post/scripts/publish.py \
        --title "제목" \
        --body-file post.html \
        --labels "자동화,블로그" \
        [--draft]        # 초안으로 저장 (기본은 바로 공개 발행)
        [--no-slack]     # Slack 알림 끄기

Prints the published post URL on the last line (so a caller can capture it).
"""
import argparse
import sys

from common import get_service, load_config, slack_notify, now_str


def publish_post(title, html, labels, is_draft=False):
    cfg = load_config()
    blog_id = cfg.get("blog_id")
    if not blog_id:
        raise RuntimeError(
            "blog_id 가 설정되지 않았습니다. 먼저 auth.py 를 실행하세요."
        )

    service = get_service(interactive=False)
    body = {"kind": "blogger#post", "title": title, "content": html}
    if labels:
        body["labels"] = labels

    post = (
        service.posts()
        .insert(blogId=blog_id, body=body, isDraft=is_draft, fetchImages=True)
        .execute()
    )
    return post, cfg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument(
        "--body-file",
        required=True,
        help="HTML(권장) 또는 텍스트 본문 파일 경로",
    )
    ap.add_argument("--labels", default="", help="쉼표로 구분한 라벨")
    ap.add_argument("--draft", action="store_true", help="초안으로 저장")
    ap.add_argument("--no-slack", action="store_true", help="Slack 알림 끄기")
    args = ap.parse_args()

    with open(args.body_file, "r", encoding="utf-8") as f:
        html = f.read()

    labels = [x.strip() for x in args.labels.split(",") if x.strip()]

    post, cfg = publish_post(args.title, html, labels, is_draft=args.draft)

    url = post.get("url", "(비공개/초안)")
    state = "초안 저장" if args.draft else "공개 발행"
    print(f"[{now_str()}] {state} 완료: {args.title}")
    print(f"post_id={post.get('id')}")

    if not args.no_slack:
        label_str = ", ".join(labels) if labels else "-"
        msg = (
            f"🆕 블로그 {state} 완료\n"
            f"• 블로그: {cfg.get('blog_name', '')}\n"
            f"• 제목: {args.title}\n"
            f"• 링크: {url}\n"
            f"• 라벨: {label_str}\n"
            f"• 시간: {now_str()}"
        )
        slack_notify(msg)

    # Last line = URL, for easy capture by a caller.
    print(url)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"발행 실패: {e}", file=sys.stderr)
        sys.exit(1)
