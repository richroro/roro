# -*- coding: utf-8 -*-
"""One-time setup: store a Threads access token and the Threads user id.

Threads' OAuth redirect must be HTTPS, which is painful for a local script, so
this skill uses the simpler manual path: you generate an access token in the
Meta app dashboard (references/threads_setup.md explains where), then paste it
here. This script:
  1. (optional) exchanges a short-lived token for a ~60-day long-lived one,
  2. fetches your Threads user id + username,
  3. saves secrets/token.json and secrets/config.json,
  4. copies the Slack DM target from the blogger skill if it's set there.

Usage:
    python auth.py --token "<paste token>" --app-secret "<Threads 앱 시크릿>"
    python auth.py --token "<이미 장기 토큰이면>" --no-exchange
"""
import argparse
import json
import sys

from common import (
    exchange_for_long_lived,
    fetch_me,
    save_token,
    load_config,
    save_config,
    _token_record,
    BLOGGER_CONFIG_PATH,
    CONFIG_PATH,
    TOKEN_PATH,
)

# Threads long-lived tokens last ~60 days. Used when the expiry is unknown.
LONG_LIVED_SECONDS = 60 * 86400


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", required=True, help="대시보드에서 발급한 액세스 토큰")
    ap.add_argument(
        "--app-secret",
        help="Threads 앱 시크릿. 있으면 단기 토큰을 장기(약 60일) 토큰으로 교환합니다.",
    )
    ap.add_argument(
        "--no-exchange",
        action="store_true",
        help="이미 장기 토큰이면 교환하지 않고 그대로 저장",
    )
    args = ap.parse_args()

    tok = None
    if args.app_secret and not args.no_exchange:
        print("단기 토큰 → 장기 토큰 교환 중...")
        try:
            tok = exchange_for_long_lived(args.token, args.app_secret)
        except Exception as e:  # noqa: BLE001
            # The dashboard's token generator often hands out a token that is
            # already long-lived, and Meta rejects exchanging those. Keep it.
            print(f"  교환 실패 → 이미 장기 토큰으로 보고 그대로 저장합니다. ({e})")
    if tok is None:
        # Expiry unknown: assume the 60-day long-lived lifetime so the
        # auto-refresh in common.get_access_token still kicks in near the end.
        tok = _token_record(args.token, LONG_LIVED_SECONDS)

    me = fetch_me(tok["access_token"])
    save_token(tok)

    cfg = load_config()
    cfg["user_id"] = me["id"]
    cfg["username"] = me.get("username", "")

    # Reuse the Slack DM target from the blogger skill so notifications work
    # without re-entering the user id.
    if not cfg.get("slack_user_id") and BLOGGER_CONFIG_PATH.exists():
        try:
            bcfg = json.loads(BLOGGER_CONFIG_PATH.read_text(encoding="utf-8"))
            if bcfg.get("slack_user_id"):
                cfg["slack_user_id"] = bcfg["slack_user_id"]
        except Exception:  # noqa: BLE001
            pass

    save_config(cfg)

    exp = tok.get("expires_at")
    print("\n설정 저장 완료")
    print(f"  token.json  → {TOKEN_PATH}")
    print(f"  config.json → {CONFIG_PATH}")
    print(f"  user_id  = {cfg['user_id']}")
    print(f"  username = @{cfg['username']}")
    if exp:
        from datetime import datetime

        print(f"  만료 예정 = {datetime.fromtimestamp(exp):%Y-%m-%d}")
    print("\n이제 publish.py 로 스레드에 글을 올릴 수 있습니다.")
    print(
        "PC 를 꺼 둬도 매일 올라가게 하려면(GitHub Actions) 위 token.json / config.json\n"
        "내용을 저장소 Secrets(THREADS_TOKEN_JSON / THREADS_CONFIG_JSON)에 등록하세요.\n"
        "→ references/threads_setup.md 6단계"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"설정 실패: {e}", file=sys.stderr)
        sys.exit(1)
