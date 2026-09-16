import os
import subprocess
import sys
from pathlib import Path

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

REPO_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = Path(__file__).resolve().parent / ".env"


def load_env_file(path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file(ENV_FILE)

BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
APP_TOKEN = os.environ["SLACK_APP_TOKEN"]
ALLOWED_USER_ID = os.environ["SLACK_ALLOWED_USER_ID"]

FILTER_SCRIPTS = {
    "ascii": REPO_DIR / "ascii_webcam.py",
    "sunglasses": REPO_DIR / "eye_sunglasses_filter.py",
    "character": REPO_DIR / "face_character_filter.py",
}

app = App(token=BOT_TOKEN)
running_filter = {"name": None, "proc": None}


def help_text():
    return (
        "*사용 가능한 명령어*\n"
        "`status` - PC 상태 확인\n"
        "`filter list` - 사용 가능한 웹캠 필터 목록\n"
        "`filter start <name>` - 웹캠 필터 실행 (ascii / sunglasses / character)\n"
        "`filter stop` - 실행 중인 필터 종료\n"
        "`help` - 이 도움말"
    )


def run_capture(args, timeout=5):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return result.stdout.strip()
    except Exception as exc:
        return f"(조회 실패: {exc})"


def get_status():
    lines = ["*PC 상태*"]

    boot_time = run_capture(
        ["powershell", "-NoProfile", "-Command",
         "(Get-CimInstance Win32_OperatingSystem).LastBootUpTime"]
    )
    lines.append(f"부팅 시각: {boot_time}")

    branch = run_capture(["git", "-C", str(REPO_DIR), "rev-parse", "--abbrev-ref", "HEAD"])
    last_commit = run_capture(["git", "-C", str(REPO_DIR), "log", "-1", "--oneline"])
    dirty = run_capture(["git", "-C", str(REPO_DIR), "status", "--short"])
    lines.append(f"git 브랜치: {branch}")
    lines.append(f"최근 커밋: {last_commit}")
    lines.append(f"변경사항: {'없음' if not dirty else dirty}")

    if running_filter["proc"] and running_filter["proc"].poll() is None:
        lines.append(f"실행 중인 필터: {running_filter['name']} (PID {running_filter['proc'].pid})")
    else:
        lines.append("실행 중인 필터: 없음")

    return "\n".join(lines)


def start_filter(name):
    script = FILTER_SCRIPTS.get(name)
    if not script:
        return f"알 수 없는 필터: {name}. 사용 가능: {', '.join(FILTER_SCRIPTS)}"

    if running_filter["proc"] and running_filter["proc"].poll() is None:
        return f"이미 '{running_filter['name']}' 필터가 실행 중입니다. 먼저 `filter stop`을 보내세요."

    proc = subprocess.Popen(
        [sys.executable, str(script)],
        cwd=str(REPO_DIR),
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    running_filter["proc"] = proc
    running_filter["name"] = name
    return f"'{name}' 필터를 실행했습니다 (PID {proc.pid}). 로컬 화면에 카메라 창이 뜹니다."


def stop_filter():
    proc = running_filter["proc"]
    if not proc or proc.poll() is not None:
        running_filter["proc"] = None
        running_filter["name"] = None
        return "실행 중인 필터가 없습니다."

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()

    name = running_filter["name"]
    running_filter["proc"] = None
    running_filter["name"] = None
    return f"'{name}' 필터를 종료했습니다."


@app.event("message")
def handle_message(event, say):
    if event.get("channel_type") != "im":
        return
    if event.get("bot_id") or event.get("subtype"):
        return

    user_id = event.get("user")
    text = (event.get("text") or "").strip()
    if not text:
        return

    if user_id != ALLOWED_USER_ID:
        say("권한이 없습니다.")
        return

    parts = text.split()
    cmd = parts[0].lower()

    if cmd == "status":
        say(get_status())
    elif cmd == "filter" and len(parts) >= 2:
        sub = parts[1].lower()
        if sub == "list":
            say("사용 가능한 필터: " + ", ".join(FILTER_SCRIPTS))
        elif sub == "start" and len(parts) >= 3:
            say(start_filter(parts[2].lower()))
        elif sub == "stop":
            say(stop_filter())
        else:
            say(help_text())
    else:
        say(help_text())


if __name__ == "__main__":
    handler = SocketModeHandler(app, APP_TOKEN)
    handler.start()
