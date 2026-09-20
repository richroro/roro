#!/usr/bin/env python3
"""카카오톡 "나에게 보내기" 발송 모듈.

refresh_token으로 access_token을 자동 갱신하며, 텍스트 메시지를 내 카카오톡
"나와의 채팅"으로 보낸다.

사용 예:
    python send_kakao.py "오늘의 알림 내용"

또는 코드에서:
    from send_kakao import send_to_me
    send_to_me("메시지 내용")
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "secrets" / "config.json"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"
MEMO_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"


def _load():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def _save(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def _post(url, data, headers=None):
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers or {}, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _refresh_access_token(cfg):
    """refresh_token으로 새 access_token 발급 (필요 시 refresh_token도 갱신)."""
    data = {
        "grant_type": "refresh_token",
        "client_id": cfg["rest_api_key"],
        "refresh_token": cfg["refresh_token"],
    }
    if cfg.get("client_secret"):
        data["client_secret"] = cfg["client_secret"]
    res = _post(TOKEN_URL, data)
    cfg["access_token"] = res["access_token"]
    # access_token은 보통 6시간(21599초). 만료 60초 전에 갱신하도록 여유를 둔다.
    cfg["access_token_expires_at"] = int(time.time()) + int(res.get("expires_in", 21599)) - 60
    # 카카오는 refresh_token 만료가 1개월 이내로 남으면 새 refresh_token을 함께 준다.
    if res.get("refresh_token"):
        cfg["refresh_token"] = res["refresh_token"]
    _save(cfg)
    return cfg["access_token"]


def _get_access_token(cfg):
    if int(time.time()) >= int(cfg.get("access_token_expires_at", 0)):
        return _refresh_access_token(cfg)
    return cfg["access_token"]


def send_to_me(text, link_url="https://developers.kakao.com", button_title="확인"):
    """내 카카오톡으로 텍스트 메시지를 보낸다. 성공 시 True."""
    cfg = _load()
    token = _get_access_token(cfg)
    template = {
        "object_type": "text",
        "text": text[:200],  # 카카오 텍스트 템플릿 최대 200자
        "link": {"web_url": link_url, "mobile_web_url": link_url},
        "button_title": button_title,
    }
    data = {"template_object": json.dumps(template, ensure_ascii=False)}
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    }
    try:
        res = _post(MEMO_URL, data, headers)
    except urllib.error.HTTPError as e:
        # access_token 만료(401) 시 강제 갱신 후 1회 재시도
        if e.code == 401:
            token = _refresh_access_token(cfg)
            headers["Authorization"] = f"Bearer {token}"
            res = _post(MEMO_URL, data, headers)
        else:
            raise
    return res.get("result_code") == 0


def _read_message_from_args(argv):
    """CLI 인자에서 메시지를 읽는다.

    - `--file <path>`: UTF-8 파일 내용을 메시지로 사용 (PowerShell 등에서 한글을
      안전하게 넘길 때 권장)
    - `--stdin`: 표준입력을 메시지로 사용
    - 그 외: 첫 번째 인자를 메시지로 사용
    """
    if len(argv) >= 3 and argv[1] == "--file":
        return Path(argv[2]).read_text(encoding="utf-8")
    if len(argv) >= 2 and argv[1] == "--stdin":
        return sys.stdin.buffer.read().decode("utf-8")
    if len(argv) >= 2:
        return argv[1]
    return "테스트 메시지입니다."


if __name__ == "__main__":
    msg = _read_message_from_args(sys.argv).strip()
    ok = send_to_me(msg)
    print("[OK] 전송 성공" if ok else "[FAIL] 전송 실패")
    sys.exit(0 if ok else 1)
