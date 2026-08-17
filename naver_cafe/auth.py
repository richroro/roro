"""OAuth 인증 헬퍼.

네이버 로그인(authorization code flow)을 로컬에서 간편히 처리하기 위한
유틸리티. 브라우저를 띄워 로그인/동의를 받고, redirect 로 돌아온 code 를
로컬 웹서버로 잡아 access token 을 발급받는다.

발급받은 토큰은 JSON 파일로 저장/로드한다.
"""

from __future__ import annotations

import http.server
import json
import secrets
import threading
import urllib.parse
import webbrowser
from pathlib import Path
from typing import Optional

from .client import NaverCafeClient, Token


class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    """redirect_uri 로 돌아온 code/state 를 잡아내는 일회용 핸들러."""

    result: dict = {}

    def do_GET(self):  # noqa: N802 (http.server 규약)
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        _CallbackHandler.result = {
            "code": query.get("code", [None])[0],
            "state": query.get("state", [None])[0],
            "error": query.get("error", [None])[0],
        }
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        ok = _CallbackHandler.result.get("code") is not None
        msg = "인증 성공! 터미널로 돌아가세요." if ok else "인증 실패."
        self.wfile.write(
            f"<html><body style='font-family:sans-serif'><h2>{msg}</h2>"
            "<p>이 창은 닫으셔도 됩니다.</p></body></html>".encode("utf-8")
        )

    def log_message(self, *args):  # 서버 로그 억제
        pass


def interactive_login(
    client: NaverCafeClient,
    *,
    redirect_uri: str = "http://localhost:8080/callback",
    open_browser: bool = True,
) -> Token:
    """브라우저 로그인 → 로컬 콜백 수신 → 토큰 발급까지 자동 처리한다.

    주의: redirect_uri 는 네이버 개발자센터의 애플리케이션 설정에 등록된 값과
    정확히 일치해야 한다. (예: http://localhost:8080/callback)
    """
    state = secrets.token_urlsafe(16)
    auth_url = client.authorization_url(redirect_uri, state)

    parsed = urllib.parse.urlparse(redirect_uri)
    host = parsed.hostname or "localhost"
    port = parsed.port or 80

    server = http.server.HTTPServer((host, port), _CallbackHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    print("아래 URL을 브라우저에서 열어 로그인/동의를 진행하세요:")
    print(f"\n  {auth_url}\n")
    if open_browser:
        webbrowser.open(auth_url)

    thread.join(timeout=300)
    server.server_close()

    result = _CallbackHandler.result
    if result.get("error"):
        raise RuntimeError(f"인증 거부/오류: {result['error']}")
    if not result.get("code"):
        raise RuntimeError("인증 code 를 받지 못했습니다 (시간 초과).")
    if result.get("state") != state:
        raise RuntimeError("state 불일치 — CSRF 방지 검증 실패.")

    return client.fetch_token(result["code"], state)


def save_token(token: Token, path: str | Path) -> None:
    Path(path).write_text(
        json.dumps(token.__dict__, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_token(path: str | Path) -> Optional[Token]:
    p = Path(path)
    if not p.exists():
        return None
    data = json.loads(p.read_text(encoding="utf-8"))
    return Token(**data)
