# -*- coding: utf-8 -*-
"""auto-shorts 스킬 공용 헬퍼.

경로 상수, 설정(secrets/config.json), 발행 로그, Slack 알림(텍스트 + 파일 업로드),
ffmpeg 탐색을 한곳에 모았다. 다른 스킬(blogger-auto-post 등)에 의존하지 않도록
일부러 자급자족형으로 두었다 — 이 폴더만 있으면 어느 브랜치/PC 에서도 돈다.

의존성: 표준 라이브러리만 (Slack 은 urllib). TTS/영상은 render.py 가 담당.
"""
import json
import os
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

# Windows 콘솔은 기본 cp949 라 한글이 깨진다. 모든 스크립트가 common 을 임포트하므로
# 여기서 한 번 UTF-8 로 맞춘다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

# .../<repo>/.claude/skills/auto-shorts
SKILL_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SKILL_DIR.parents[2]

SECRETS_DIR = SKILL_DIR / "secrets"            # gitignored
CONFIG_PATH = SECRETS_DIR / "config.json"
CLIENT_SECRET_PATH = SECRETS_DIR / "client_secret.json"
YT_TOKEN_PATH = SECRETS_DIR / "youtube_token.json"

QUEUE_DIR = SKILL_DIR / "queue"                # 발행 대기 대본(*.json), FIFO
POSTED_DIR = QUEUE_DIR / "posted"              # 렌더/발행 끝난 대본
DATA_DIR = SKILL_DIR / "data"                  # git-tracked 실적 로그
POSTED_LOG_PATH = DATA_DIR / "posted_log.json"
ASSETS_DIR = SKILL_DIR / "assets"              # bgm.mp3 등 (선택)
TOPICS_PATH = SKILL_DIR / "topics.txt"         # 큐가 비었을 때 API 생성용 주제 목록

# 렌더 결과물. 용량이 크므로 git 에 넣지 않는다 (.gitignore 에 등록).
OUTPUT_DIR = Path(os.environ.get("SHORTS_OUTPUT_DIR", REPO_ROOT / "shorts_output"))

# blogger-auto-post 와 같은 Slack 봇을 재사용할 수 있게 같은 .env 위치를 본다.
SLACK_ENV_PATH = REPO_ROOT / "slackbot" / ".env"

YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


# ---------------------------------------------------------------------------
# 시간
# ---------------------------------------------------------------------------
def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def now_iso():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def today_str():
    return datetime.now().strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# JSON 유틸
# ---------------------------------------------------------------------------
def read_json(path, default=None):
    p = Path(path)
    if not p.exists():
        return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return default


def write_json(path, data):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json_list(path):
    data = read_json(path, [])
    return data if isinstance(data, list) else []


def append_json_list(path, entry):
    items = read_json_list(path)
    items.append(entry)
    write_json(path, items)
    return items


def record_posted(script, outputs, youtube_url=None, source="queue"):
    """렌더/발행 결과를 data/posted_log.json 에 남긴다 (성과 추적용)."""
    return append_json_list(
        POSTED_LOG_PATH,
        {
            "date": today_str(),
            "ts": now_iso(),
            "title": script.get("title", ""),
            "hashtags": script.get("hashtags", []),
            "duration_sec": round(outputs.get("duration", 0), 1),
            "video": str(outputs.get("video", "")),
            "youtube_url": youtube_url or "",
            "source": source,
        },
    )


# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------
def load_config():
    return read_json(CONFIG_PATH, {}) or {}


def save_config(cfg):
    write_json(CONFIG_PATH, cfg)


# ---------------------------------------------------------------------------
# ffmpeg 탐색 (PATH → imageio-ffmpeg 번들 순)
# ---------------------------------------------------------------------------
def find_ffmpeg():
    """ffmpeg 실행 파일 경로. PATH 에 없으면 pip 의 imageio-ffmpeg 번들을 쓴다."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # noqa: WPS433

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        return None


def find_ffprobe():
    exe = shutil.which("ffprobe")
    if exe:
        return exe
    # imageio-ffmpeg 에는 ffprobe 가 없다. 그 경우 render.py 가 ffmpeg 로 길이를 잰다.
    return None


# ---------------------------------------------------------------------------
# Slack (텍스트 DM + 파일 업로드) — 모두 best-effort, 절대 예외를 던지지 않는다
# ---------------------------------------------------------------------------
def _read_slack_env():
    token = os.environ.get("SLACK_BOT_TOKEN")
    user = os.environ.get("SLACK_USER_ID")
    if SLACK_ENV_PATH.exists():
        for line in SLACK_ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("SLACK_BOT_TOKEN") and not token:
                token = line.split("=", 1)[1].strip()
            elif line.startswith("SLACK_ALLOWED_USER_ID") and not user:
                user = line.split("=", 1)[1].strip()
    return token, user


def _resolve_slack_user(env_user):
    cfg_user = load_config().get("slack_user_id")
    if cfg_user:
        return cfg_user
    if env_user and env_user.startswith("U") and "X" not in env_user:
        return env_user
    return None


def _slack_api(token, method, payload=None, form=False):
    url = f"https://slack.com/api/{method}"
    if form:
        data = urllib.parse.urlencode(payload or {}).encode("utf-8")
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
    else:
        data = json.dumps(payload or {}).encode("utf-8")
        headers = {"Content-Type": "application/json; charset=utf-8"}
    headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def slack_notify(text):
    """워크스페이스 주인에게 DM. 실패해도 예외 없이 False 만 돌려준다."""
    token, env_user = _read_slack_env()
    user = _resolve_slack_user(env_user)
    if not token or not user:
        print(
            "[slack] 건너뜀 (SLACK_BOT_TOKEN 또는 대상 user id 없음). "
            "secrets/config.json 의 slack_user_id 를 확인하세요.",
            file=sys.stderr,
        )
        return False
    try:
        body = _slack_api(token, "chat.postMessage", {"channel": user, "text": text})
        if not body.get("ok"):
            print(f"[slack] API 오류: {body.get('error')}", file=sys.stderr)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        print(f"[slack] 전송 실패: {e}", file=sys.stderr)
        return False


def slack_upload_file(path, title=None, comment=None):
    """영상 파일을 DM 으로 보낸다 (files.getUploadURLExternal → 업로드 → complete).

    봇 스코프: chat:write, files:write, im:write. 폰에서 Slack 을 열면 그대로
    틱톡/클립/릴스에 올릴 수 있게 하는 것이 목적. 실패하면 False.
    """
    token, env_user = _read_slack_env()
    user = _resolve_slack_user(env_user)
    path = Path(path)
    if not token or not user or not path.exists():
        print("[slack] 파일 업로드 건너뜀 (토큰/대상/파일 없음)", file=sys.stderr)
        return False
    try:
        size = path.stat().st_size
        step1 = _slack_api(
            token,
            "files.getUploadURLExternal",
            {"filename": path.name, "length": size},
            form=True,
        )
        if not step1.get("ok"):
            print(f"[slack] getUploadURLExternal 오류: {step1.get('error')}", file=sys.stderr)
            return False
        upload_url, file_id = step1["upload_url"], step1["file_id"]

        with open(path, "rb") as f:
            raw = f.read()
        req = urllib.request.Request(
            upload_url, data=raw, headers={"Content-Type": "application/octet-stream"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=300) as resp:
            resp.read()

        # DM 채널 id (D...) 가 필요하다. user id (U...) 로 대화를 열어 얻는다.
        conv = _slack_api(token, "conversations.open", {"users": user})
        channel_id = conv.get("channel", {}).get("id") if conv.get("ok") else user

        payload = {
            "files": [{"id": file_id, "title": title or path.name}],
            "channel_id": channel_id,
        }
        if comment:
            payload["initial_comment"] = comment
        step3 = _slack_api(token, "files.completeUploadExternal", payload)
        if not step3.get("ok"):
            print(f"[slack] completeUploadExternal 오류: {step3.get('error')}", file=sys.stderr)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        print(f"[slack] 파일 업로드 실패: {e}", file=sys.stderr)
        return False


def slugify(text, max_len=40):
    """파일/폴더명용 슬러그. 한글은 그대로 두고 공백·특수문자만 정리한다."""
    keep = []
    for ch in text.strip():
        if ch.isalnum() or ch in "가-힣":
            keep.append(ch)
        elif ch in " _-":
            keep.append("_")
    s = "".join(keep).strip("_")
    while "__" in s:
        s = s.replace("__", "_")
    return (s or "shorts")[:max_len]
