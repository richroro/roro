# -*- coding: utf-8 -*-
"""Shared helpers for the threads-auto-post skill.

Handles token/config storage, Threads Graph API calls (create container →
publish, the two-step flow Threads requires), long-lived-token refresh, and
best-effort Slack DM notifications (reusing slackbot/.env, same as the
blogger-auto-post skill).

Only third-party dependency is `requests` (see requirements.txt). Slack uses
urllib so a missing token never crashes a successful publish.
"""
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

import requests

# Windows consoles / redirected scheduled-task logs default to cp949, which
# can't encode the emoji and Korean in our output. Force UTF-8 so unattended
# runs (and their log files) never crash on a print.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001 - older/odd streams; best effort
        pass

# .../richgogo/.claude/skills/threads-auto-post
SKILL_DIR = Path(__file__).resolve().parent.parent
SECRETS_DIR = SKILL_DIR / "secrets"
CONFIG_PATH = SECRETS_DIR / "config.json"
TOKEN_PATH = SECRETS_DIR / "token.json"

# .../richgogo  (repo root) — for reusing slackbot/.env and blogger's slack id.
REPO_ROOT = SKILL_DIR.parents[2]
SLACK_ENV_PATH = REPO_ROOT / "slackbot" / ".env"
BLOGGER_CONFIG_PATH = (
    SKILL_DIR.parent / "blogger-auto-post" / "secrets" / "config.json"
)

GRAPH = "https://graph.threads.net"
API_VERSION = "v1.0"
MAX_CHARS = 500  # Threads' hard per-post text limit.

# Refresh the long-lived token when it's within this many days of expiry.
REFRESH_BEFORE_DAYS = 10


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Config / token storage
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


def load_token():
    if not TOKEN_PATH.exists():
        return {}
    return json.loads(TOKEN_PATH.read_text(encoding="utf-8"))


def save_token(tok):
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(
        json.dumps(tok, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Threads OAuth token helpers
# ---------------------------------------------------------------------------
def exchange_for_long_lived(short_token, app_secret):
    """Trade a short-lived token for a ~60-day long-lived one."""
    r = requests.get(
        f"{GRAPH}/access_token",
        params={
            "grant_type": "th_exchange_token",
            "client_secret": app_secret,
            "access_token": short_token,
        },
        timeout=30,
    )
    _raise_for_graph(r)
    data = r.json()
    return _token_record(data["access_token"], data.get("expires_in"))


def refresh_long_lived(long_token):
    """Refresh a long-lived token (must be >24h old and unexpired)."""
    r = requests.get(
        f"{GRAPH}/refresh_access_token",
        params={
            "grant_type": "th_refresh_token",
            "access_token": long_token,
        },
        timeout=30,
    )
    _raise_for_graph(r)
    data = r.json()
    return _token_record(data["access_token"], data.get("expires_in"))


def _token_record(access_token, expires_in):
    now = int(time.time())
    return {
        "access_token": access_token,
        "obtained_at": now,
        "expires_at": now + int(expires_in) if expires_in else None,
    }


def get_access_token(auto_refresh=True):
    """Return a usable access token, refreshing proactively when it nears
    expiry. Raises if no token is stored (auth.py must run first)."""
    tok = load_token()
    access = tok.get("access_token")
    if not access:
        raise RuntimeError(
            "저장된 액세스 토큰이 없습니다. 먼저 auth.py 로 최초 1회 설정을 하세요.\n"
            f"(token.json 예상 경로: {TOKEN_PATH})"
        )

    if auto_refresh and tok.get("expires_at"):
        remaining = tok["expires_at"] - int(time.time())
        age = int(time.time()) - tok.get("obtained_at", 0)
        # Only attempt refresh if near expiry AND the token is old enough
        # (Threads rejects refresh on tokens younger than 24h).
        if remaining < REFRESH_BEFORE_DAYS * 86400 and age > 86400:
            try:
                new_tok = refresh_long_lived(access)
                save_token(new_tok)
                return new_tok["access_token"]
            except Exception as e:  # noqa: BLE001 - keep using current token
                print(f"[token] 갱신 실패(기존 토큰 계속 사용): {e}", file=sys.stderr)
    return access


def fetch_me(access_token):
    """Return {id, username} for the authenticated Threads user."""
    r = requests.get(
        f"{GRAPH}/{API_VERSION}/me",
        params={"fields": "id,username", "access_token": access_token},
        timeout=30,
    )
    _raise_for_graph(r)
    return r.json()


# ---------------------------------------------------------------------------
# Publishing (two-step: create container, then publish)
# ---------------------------------------------------------------------------
def publish_thread(text, link=None, image_url=None):
    """Publish one post to Threads. Returns {"id", "permalink"}.

    text      : post body (<= 500 chars). Required for TEXT/IMAGE alike.
    link      : optional URL for a link-preview attachment (TEXT posts).
    image_url : optional public image URL → posts an IMAGE with text caption.
    """
    if not text or not text.strip():
        raise ValueError("게시할 text 가 비어 있습니다.")
    if len(text) > MAX_CHARS:
        raise ValueError(
            f"글자 수 초과: {len(text)}자 (스레드 최대 {MAX_CHARS}자). 줄여서 다시 시도하세요."
        )

    cfg = load_config()
    user_id = cfg.get("user_id")
    if not user_id:
        raise RuntimeError("user_id 가 없습니다. 먼저 auth.py 를 실행하세요.")

    token = get_access_token()

    # 1) create media container
    params = {"text": text, "access_token": token}
    if image_url:
        params["media_type"] = "IMAGE"
        params["image_url"] = image_url
    else:
        params["media_type"] = "TEXT"
        if link:
            params["link_attachment"] = link

    r = requests.post(
        f"{GRAPH}/{API_VERSION}/{user_id}/threads", params=params, timeout=60
    )
    _raise_for_graph(r)
    creation_id = r.json()["id"]

    # 2) publish the container. Media containers may need a moment to process;
    #    retry a few times on the transient "not ready" error.
    last_err = None
    for attempt in range(6):
        pr = requests.post(
            f"{GRAPH}/{API_VERSION}/{user_id}/threads_publish",
            params={"creation_id": creation_id, "access_token": token},
            timeout=60,
        )
        if pr.status_code < 400:
            media_id = pr.json()["id"]
            return {"id": media_id, "permalink": _permalink(media_id, token)}
        last_err = _graph_error(pr)
        time.sleep(5)
    raise RuntimeError(f"발행 실패(컨테이너 처리 지연): {last_err}")


def _permalink(media_id, token):
    try:
        r = requests.get(
            f"{GRAPH}/{API_VERSION}/{media_id}",
            params={"fields": "permalink", "access_token": token},
            timeout=30,
        )
        if r.status_code < 400:
            return r.json().get("permalink", "")
    except Exception:  # noqa: BLE001 - permalink is a nicety, not required
        pass
    return ""


def _graph_error(resp):
    try:
        body = resp.json()
        err = body.get("error", {})
        return f"{err.get('message', body)} (code={err.get('code')})"
    except Exception:  # noqa: BLE001
        return f"HTTP {resp.status_code}: {resp.text[:200]}"


def _raise_for_graph(resp):
    if resp.status_code >= 400:
        raise RuntimeError(f"Threads API 오류: {_graph_error(resp)}")


# ---------------------------------------------------------------------------
# Slack notification (reuses slackbot/.env — identical to blogger skill)
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
    """DM target: this skill's config wins, else blogger's config (same owner),
    else a valid-looking .env value. The repo .env ships a placeholder."""
    cfg_user = load_config().get("slack_user_id")
    if cfg_user:
        return cfg_user
    if BLOGGER_CONFIG_PATH.exists():
        try:
            blogger_user = json.loads(
                BLOGGER_CONFIG_PATH.read_text(encoding="utf-8")
            ).get("slack_user_id")
            if blogger_user:
                return blogger_user
        except Exception:  # noqa: BLE001
            pass
    if env_user and env_user.startswith("U") and "X" not in env_user:
        return env_user
    return None


def slack_notify(text):
    """Best-effort DM to the workspace owner. Never raises."""
    token, env_user = _read_slack_env()
    user = _resolve_slack_channel(env_user)
    if not token or not user:
        print(
            "[slack] 건너뜀 (토큰 없음 또는 대상 미설정). "
            "secrets/config.json 의 slack_user_id 를 확인하세요.",
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
