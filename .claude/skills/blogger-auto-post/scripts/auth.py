# -*- coding: utf-8 -*-
"""One-time setup: OAuth login + pick which blog to post to.

Run this ONCE on this machine (it opens a browser). It creates
secrets/token.json (with a refresh token, so future runs are silent) and
saves the chosen blog id into secrets/config.json.

    python .claude/skills/blogger-auto-post/scripts/auth.py
"""
import sys

from common import get_service, load_config, save_config, CONFIG_PATH


def main():
    # interactive=True → opens the browser consent screen on first run.
    service = get_service(interactive=True)

    blogs = service.blogs().listByUser(userId="self").execute()
    items = blogs.get("items", [])
    if not items:
        print(
            "이 계정에 연결된 블로그가 없습니다. blogger.com 에서 블로그를 먼저 만들고 "
            "다시 실행하세요.",
            file=sys.stderr,
        )
        sys.exit(1)

    print("\n사용 가능한 블로그:")
    for i, b in enumerate(items):
        print(f"  [{i}] {b['name']}  (id={b['id']})  {b.get('url', '')}")

    cfg = load_config()
    if len(items) == 1:
        chosen = items[0]
        print(f"\n블로그가 하나뿐이라 자동 선택: {chosen['name']}")
    else:
        raw = input("\n발행할 블로그 번호를 입력하세요: ").strip()
        try:
            chosen = items[int(raw)]
        except (ValueError, IndexError):
            print("잘못된 번호입니다.", file=sys.stderr)
            sys.exit(1)

    cfg["blog_id"] = chosen["id"]
    cfg["blog_name"] = chosen["name"]
    cfg["blog_url"] = chosen.get("url", "")
    save_config(cfg)

    print(f"\n설정 저장 완료 → {CONFIG_PATH}")
    print(f"  blog_id  = {cfg['blog_id']}")
    print(f"  blog_name= {cfg['blog_name']}")
    print("\n이제 publish.py 로 글을 발행할 수 있습니다.")


if __name__ == "__main__":
    main()
