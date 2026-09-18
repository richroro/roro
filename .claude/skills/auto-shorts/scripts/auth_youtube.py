# -*- coding: utf-8 -*-
"""최초 1회: YouTube 업로드용 OAuth 로그인 (브라우저가 열린다).

    python .claude/skills/auto-shorts/scripts/auth_youtube.py

secrets/client_secret.json 이 필요하다 (블로거 스킬 것을 복사해도 됨. 같은 구글 클라우드
프로젝트에서 'YouTube Data API v3' 를 켜야 한다). 완료되면 secrets/youtube_token.json 이
생기고, 이후 업로드는 조용히(무인) 진행된다. GitHub Actions 에서 쓰려면 이 파일 내용을
YOUTUBE_TOKEN_JSON 시크릿에 넣는다 (references/setup.md).
"""
import sys

from common import YT_TOKEN_PATH, load_config, save_config
from upload_youtube import get_youtube_service


def main():
    service = get_youtube_service(interactive=True)
    resp = service.channels().list(part="snippet,statistics", mine=True).execute()
    items = resp.get("items", [])
    if not items:
        print("이 계정에 유튜브 채널이 없습니다. youtube.com 에서 채널을 먼저 만드세요.", file=sys.stderr)
        sys.exit(1)
    ch = items[0]
    cfg = load_config()
    cfg.setdefault("youtube", {})
    cfg["youtube"]["channel_id"] = ch["id"]
    cfg["youtube"]["channel_title"] = ch["snippet"]["title"]
    cfg["youtube"].setdefault("privacy", "public")
    cfg["youtube"].setdefault("category_id", "22")
    save_config(cfg)
    print(f"로그인 완료 → {YT_TOKEN_PATH}")
    print(f"채널: {ch['snippet']['title']}  (id={ch['id']}, 구독자 {ch['statistics'].get('subscriberCount', '?')})")
    print("이제 daily_shorts.py / upload_youtube.py 로 업로드할 수 있습니다.")


if __name__ == "__main__":
    main()
