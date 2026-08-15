# -*- coding: utf-8 -*-
"""Shared helpers for the blogger-auto-post skill.

Handles credential/config paths, Google OAuth, the Blogger service object,
and Slack notifications. Kept dependency-light: only the Google client
libraries are required; Slack and Anthropic calls use urllib so the skill
works without `requests`/`anthropic` installed.
"""
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# .../richgogo/.claude/skills/blogger-auto-post
SKILL_DIR = Path(__file__).resolve().parent.parent
SECRETS_DIR = SKILL_DIR / "secrets"
CONFIG_PATH = SECRETS_DIR / "config.json"
CLIENT_SECRET_PATH = SECRETS_DIR / "client_secret.json"
TOKEN_PATH = SECRETS_DIR / "token.json"

# .../richgogo  (repo root) — for reusing slackbot/.env
REPO_ROOT = SKILL_DIR.parents[2]
SLACK_ENV_PATH = REPO_ROOT / "slackbot" / ".env"

# Blogger needs full scope to publish; readonly is not enough for posts.insert.
SCOPES = ["https://www.googleapis.com/auth/blogger"]


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
def load_config():
    if not CONFIG_PATH.exists():
        return {}
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def save_config(cfg):
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(
        json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Google OAuth / Blogger service
# ---------------------------------------------------------------------------
def get_credentials(interactive=False):
    """Return valid Google credentials.

    Non-interactive path (used by scheduled runs): load token.json and refresh
    it if needed. Interactive path (auth.py first run): open a browser consent
    screen and write token.json with a refresh token.
    """
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
        return creds

    if not interactive:
        raise RuntimeError(
            "유효한 토큰이 없습니다. 먼저 auth.py 로 최초 1회 OAuth 로그인을 하세요.\n"
            f"(token.json 예상 경로: {TOKEN_PATH})"
        )

    from google_auth_oauthlib.flow import InstalledAppFlow

    if not CLIENT_SECRET_PATH.exists():
        raise RuntimeError(
            f"client_secret.json 이 없습니다: {CLIENT_SECRET_PATH}\n"
            "다른 컴퓨터에서 받은 OAuth 클라이언트 파일을 이 위치로 옮겨 주세요. "
            "(references/google_setup.md 참고)"
        )

    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
    creds = flow.run_local_server(port=0)
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    return creds


def get_service(interactive=False):
    from googleapiclient.discovery import build

    creds = get_credentials(interactive=interactive)
    return build("blogger", "v3", credentials=creds, cache_discovery=False)


# ---------------------------------------------------------------------------
# Slack notification (reuses slackbot/.env)
# ---------------------------------------------------------------------------
def _read_slack_env():
    token = None
    user = None
    if not SLACK_ENV_PATH.exists():
        return None, None
    for line in SLACK_ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("SLACK_BOT_TOKEN"):
            token = line.split("=", 1)[1].strip()
        elif line.startswith("SLACK_ALLOWED_USER_ID"):
            user = line.split("=", 1)[1].strip()
    return token, user


def _resolve_slack_channel(env_user):
    """DM target resolution: config.json's slack_user_id wins (kept in the
    gitignored secrets/), then a valid-looking .env value. The .env in this
    repo ships a placeholder (U0XXXXXXX), so config is the reliable source."""
    cfg_user = load_config().get("slack_user_id")
    if cfg_user:
        return cfg_user
    if env_user and env_user.startswith("U") and "X" not in env_user:
        return env_user
    return None


def slack_notify(text):
    """Best-effort DM to the workspace owner. Never raises — a failed
    notification must not crash a successful publish."""
    token, env_user = _read_slack_env()
    user = _resolve_slack_channel(env_user)
    if not token or not user:
        print(
            f"[slack] 건너뜀 (토큰 없음 또는 대상 미설정). "
            f"secrets/config.json 의 slack_user_id 를 확인하세요.",
            file=sys.stderr,
        )
        return False
    payload = json.dumps({"channel": user, "text": text}).encode("utf-8")
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        if not body.get("ok"):
            print(f"[slack] API 오류: {body.get('error')}", file=sys.stderr)
            return False
        return True
    except Exception as e:  # noqa: BLE001 - notification is best-effort
        print(f"[slack] 전송 실패: {e}", file=sys.stderr)
        return False
