# -*- coding: utf-8 -*-
"""경로·환경변수·상태 파일 공용 모듈.

naver-blog/.env 를 읽어 os.environ 에 넣는다 (python-dotenv 없이 동작).
이미 설정된 환경변수는 .env 값으로 덮어쓰지 않는다.
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Windows 콘솔·로그 파일은 기본 cp949 라서 한글/이모지 출력이 깨지거나 크래시난다.
# 모든 모듈이 config 를 임포트하므로 여기서 한 번 UTF-8 로 맞춰 준다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001 - 리다이렉트/구버전 환경이면 조용히 통과
        pass

PKG_DIR = Path(__file__).resolve().parent
BASE_DIR = PKG_DIR.parent  # .../naver-blog
ENV_PATH = BASE_DIR / ".env"

QUEUE_DIR = BASE_DIR / "queue"  # 발행 대기 글 (NNNN.json, 오래된 것부터 발행)
POSTED_DIR = QUEUE_DIR / "posted"  # 발행 완료한 글 (기록 보관)
DATA_DIR = BASE_DIR / "data"
STATE_PATH = DATA_DIR / "state.json"  # 큐 번호·주제 인덱스 등
POSTED_LOG_PATH = DATA_DIR / "posted_log.json"  # 발행 이력
PROFILE_DIR = BASE_DIR / "profile"  # 크롬 프로필 (네이버 로그인 세션 유지, git 제외)
LOGS_DIR = BASE_DIR / "logs"  # 실패 스크린샷
EXPORT_DIR = BASE_DIR / "export"  # 수동 붙여넣기용 내보내기
TOPICS_PATH = BASE_DIR / "topics.txt"  # 무인 생성용 주제 목록


def load_env(path: Path = None) -> dict:
    """KEY=VALUE 형식의 .env 를 읽어 환경변수로 넣는다. 반환값은 읽은 항목."""
    loaded = {}
    path = Path(path) if path else ENV_PATH
    if not path.exists():
        return loaded
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key and key not in os.environ:
            os.environ[key] = value
        loaded[key] = value
    return loaded


def env(name: str, default=None):
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def env_bool(name: str, default: bool = False) -> bool:
    value = env(name)
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "y", "on")


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


# ---------------------------------------------------------------------------
# 상태 파일 (큐 번호, 주제 인덱스)
# ---------------------------------------------------------------------------
def load_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# 발행 이력 (append-only JSON 리스트)
# ---------------------------------------------------------------------------
def read_json_list(path: Path) -> list:
    if not Path(path).exists():
        return []
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def append_json_list(path: Path, entry: dict) -> list:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    items = read_json_list(path)
    items.append(entry)
    Path(path).write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return items


def record_published(title: str, tags: list, url: str, source: str = "manual") -> list:
    return append_json_list(
        POSTED_LOG_PATH,
        {
            "date": today_str(),
            "ts": now_iso(),
            "title": title,
            "tags": tags or [],
            "url": url,
            "source": source,
        },
    )


def read_topics(path: Path = None) -> list:
    """'#' 주석과 빈 줄을 뺀 주제 목록."""
    path = Path(path) if path else TOPICS_PATH
    if not path.exists():
        return []
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
