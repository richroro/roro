"""네이버 카페 OpenAPI 클라이언트.

네이버 개발자센터 카페 API를 이용해 카페에 글을 자동으로 작성한다.

중요 특성
---------
- 네이버 카페 '글쓰기' API는 제목/본문을 **EUC-KR**로 퍼센트 인코딩해서
  보내야 한다. (UTF-8로 보내면 한글이 깨진다.)
- EUC-KR에 없는 문자(예: 이모지 😀, 일부 특수문자)는 전송할 수 없으므로
  기본적으로 무시(errors="ignore")하되, strict 모드로 검출도 가능하다.
- 글은 access token 을 발급받은 '그 사용자' 명의로 작성되며, 대상 카페의
  회원이어야 한다. (본인 카페면 매니저이므로 문제 없음)

API 문서: https://developers.naver.com/docs/serviceapi/cafe/cafe/cafe.md
"""

from __future__ import annotations

import urllib.parse
from dataclasses import dataclass
from typing import Optional

import requests


NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize"
CAFE_API_BASE = "https://openapi.naver.com/v1/cafe"


class NaverCafeError(RuntimeError):
    """네이버 카페 API 호출 실패 시 발생."""


@dataclass
class Token:
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: Optional[int] = None


def _encode_euckr(text: str, *, strict: bool = False) -> str:
    """문자열을 EUC-KR로 퍼센트 인코딩한다.

    strict=True 이면 EUC-KR로 표현 불가능한 문자가 있을 때 예외를 던진다.
    """
    errors = "strict" if strict else "ignore"
    try:
        raw = text.encode("euc-kr", errors=errors)
    except UnicodeEncodeError as exc:  # strict 모드에서만 도달
        bad = text[exc.start:exc.end]
        raise NaverCafeError(
            f"EUC-KR로 인코딩할 수 없는 문자가 포함되어 있습니다: {bad!r} "
            f"(이모지/일부 특수문자는 네이버 카페 글쓰기 API로 전송 불가)"
        ) from exc
    return urllib.parse.quote(raw)


class NaverCafeClient:
    """네이버 카페 API 클라이언트.

    Parameters
    ----------
    client_id, client_secret:
        네이버 개발자센터에서 발급받은 애플리케이션 자격증명.
    token:
        이미 발급받은 Token. 없으면 인증 플로우(auth 모듈)로 먼저 발급받아야 한다.
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        token: Optional[Token] = None,
        *,
        session: Optional[requests.Session] = None,
        timeout: int = 10,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = token
        self.timeout = timeout
        self._session = session or requests.Session()

    # ------------------------------------------------------------------ #
    # OAuth 2.0
    # ------------------------------------------------------------------ #
    def authorization_url(self, redirect_uri: str, state: str) -> str:
        """사용자가 로그인/동의할 브라우저 URL을 만든다 (authorization code flow)."""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "state": state,
        }
        return f"{NAVER_AUTH_URL}?{urllib.parse.urlencode(params)}"

    def fetch_token(self, code: str, state: str) -> Token:
        """authorization code 를 access token 으로 교환한다."""
        params = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "state": state,
        }
        data = self._token_request(params)
        self.token = Token(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            token_type=data.get("token_type", "Bearer"),
            expires_in=int(data["expires_in"]) if data.get("expires_in") else None,
        )
        return self.token

    def refresh(self) -> Token:
        """refresh token 으로 access token 을 갱신한다."""
        if not self.token or not self.token.refresh_token:
            raise NaverCafeError("refresh token 이 없어 갱신할 수 없습니다.")
        params = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.token.refresh_token,
        }
        data = self._token_request(params)
        # 갱신 응답에는 refresh_token 이 없을 수 있으므로 기존 값을 유지한다.
        self.token = Token(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", self.token.refresh_token),
            token_type=data.get("token_type", "Bearer"),
            expires_in=int(data["expires_in"]) if data.get("expires_in") else None,
        )
        return self.token

    def _token_request(self, params: dict) -> dict:
        resp = self._session.get(NAVER_TOKEN_URL, params=params, timeout=self.timeout)
        try:
            data = resp.json()
        except ValueError:
            raise NaverCafeError(f"토큰 응답 파싱 실패: {resp.status_code} {resp.text}")
        if "error" in data or "access_token" not in data:
            raise NaverCafeError(
                f"토큰 발급 실패: {data.get('error')} - {data.get('error_description')}"
            )
        return data

    # ------------------------------------------------------------------ #
    # 카페 글쓰기
    # ------------------------------------------------------------------ #
    def write_article(
        self,
        club_id: str,
        menu_id: str,
        subject: str,
        content: str,
        *,
        open_yn: Optional[bool] = None,
        strict_encoding: bool = False,
    ) -> dict:
        """카페에 글을 작성한다.

        Parameters
        ----------
        club_id:
            카페 ID (숫자). 카페 관리 > 카페 정보, 또는 카페 URL의 clubid 값.
        menu_id:
            게시판(메뉴) ID. 해당 게시판이 API 글쓰기를 허용해야 한다.
        subject:
            글 제목.
        content:
            글 본문. HTML 태그 일부 사용 가능.
        open_yn:
            전체 공개 여부. None 이면 게시판 기본값을 따른다.
        strict_encoding:
            True 이면 EUC-KR로 표현 불가능한 문자가 있을 때 예외를 던진다.

        Returns
        -------
        dict
            성공 시 응답 JSON (작성된 글의 articleId 등 포함).
        """
        if not self.token:
            raise NaverCafeError("access token 이 없습니다. 먼저 인증을 진행하세요.")

        url = f"{CAFE_API_BASE}/{club_id}/menu/{menu_id}/articles"

        # subject / content 는 반드시 EUC-KR 퍼센트 인코딩.
        body_parts = [
            f"subject={_encode_euckr(subject, strict=strict_encoding)}",
            f"content={_encode_euckr(content, strict=strict_encoding)}",
        ]
        if open_yn is not None:
            body_parts.append(f"openyn={'true' if open_yn else 'false'}")
        body = "&".join(body_parts)

        headers = {
            "Authorization": f"{self.token.token_type} {self.token.access_token}",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        resp = self._session.post(
            url, data=body.encode("ascii"), headers=headers, timeout=self.timeout
        )
        return self._handle_write_response(resp)

    def _handle_write_response(self, resp: requests.Response) -> dict:
        try:
            data = resp.json()
        except ValueError:
            raise NaverCafeError(
                f"글쓰기 응답 파싱 실패: HTTP {resp.status_code} - {resp.text}"
            )

        # 네이버 API 오류 포맷: {"message": {"error": {"code": .., "msg": ..}}}
        message = data.get("message", {})
        if isinstance(message, dict) and message.get("error"):
            err = message["error"]
            raise NaverCafeError(
                f"글쓰기 실패 [{err.get('code')}]: {err.get('msg')}"
            )
        if resp.status_code >= 400:
            raise NaverCafeError(f"글쓰기 실패: HTTP {resp.status_code} - {resp.text}")
        return data
