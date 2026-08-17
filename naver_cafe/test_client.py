"""가짜(mock) 네이버 서버로 클라이언트 동작을 검증하는 테스트.

실제 네트워크/계정 없이, 코드가
  1) 올바른 URL로,
  2) 제목/본문을 EUC-KR로 인코딩해서,
  3) 올바른 인증 헤더로 요청을 보내는지,
  4) 성공/실패 응답을 제대로 해석하는지
를 확인한다.

실행: python -m naver_cafe.test_client   (또는 pytest)
"""

from __future__ import annotations

import unittest
import urllib.parse

from .client import NaverCafeClient, NaverCafeError, Token


class FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code
        self.text = str(json_data)

    def json(self):
        return self._json


class FakeSession:
    """requests.Session 을 대체하는 가짜 세션. 마지막 요청을 기록한다."""

    def __init__(self, response: FakeResponse):
        self.response = response
        self.last_post = None
        self.last_get = None

    def post(self, url, data=None, headers=None, timeout=None):
        self.last_post = {"url": url, "data": data, "headers": headers}
        return self.response

    def get(self, url, params=None, timeout=None):
        self.last_get = {"url": url, "params": params}
        return self.response


class WriteArticleTest(unittest.TestCase):
    def _client(self, response):
        session = FakeSession(response)
        client = NaverCafeClient(
            "CID", "SECRET", token=Token(access_token="AT", token_type="Bearer"),
            session=session,
        )
        return client, session

    def test_success_builds_correct_request(self):
        resp = FakeResponse({"message": {"status": "200", "result": {"articleId": 987}}})
        client, session = self._client(resp)

        result = client.write_article(
            club_id="12345678", menu_id="5",
            subject="오늘의 공지", content="본문입니다.",
        )

        # 1) URL 검증
        self.assertEqual(
            session.last_post["url"],
            "https://openapi.naver.com/v1/cafe/12345678/menu/5/articles",
        )
        # 2) 인증 헤더 검증
        self.assertEqual(
            session.last_post["headers"]["Authorization"], "Bearer AT"
        )
        self.assertEqual(
            session.last_post["headers"]["Content-Type"],
            "application/x-www-form-urlencoded",
        )
        # 3) 본문이 EUC-KR 로 인코딩됐는지 검증 (디코드하면 원문이 나와야 함)
        body = session.last_post["data"].decode("ascii")
        params = dict(p.split("=", 1) for p in body.split("&"))
        subject_decoded = urllib.parse.unquote_to_bytes(params["subject"]).decode("euc-kr")
        content_decoded = urllib.parse.unquote_to_bytes(params["content"]).decode("euc-kr")
        self.assertEqual(subject_decoded, "오늘의 공지")
        self.assertEqual(content_decoded, "본문입니다.")
        # 4) 응답 파싱
        self.assertEqual(result["message"]["result"]["articleId"], 987)

    def test_open_yn_included(self):
        resp = FakeResponse({"message": {"status": "200", "result": {}}})
        client, session = self._client(resp)
        client.write_article("1", "2", "제목", "본문", open_yn=True)
        body = session.last_post["data"].decode("ascii")
        self.assertIn("openyn=true", body)

    def test_api_error_raises(self):
        resp = FakeResponse(
            {"message": {"error": {"code": "024", "msg": "Authentication failed"}}},
            status_code=401,
        )
        client, _ = self._client(resp)
        with self.assertRaises(NaverCafeError) as ctx:
            client.write_article("1", "2", "제목", "본문")
        self.assertIn("024", str(ctx.exception))

    def test_no_token_raises(self):
        client = NaverCafeClient("CID", "SECRET")  # 토큰 없음
        with self.assertRaises(NaverCafeError):
            client.write_article("1", "2", "제목", "본문")

    def test_emoji_strict_raises(self):
        resp = FakeResponse({"message": {"status": "200", "result": {}}})
        client, _ = self._client(resp)
        with self.assertRaises(NaverCafeError):
            client.write_article("1", "2", "제목😀", "본문", strict_encoding=True)


class TokenFlowTest(unittest.TestCase):
    def test_fetch_token_parses_response(self):
        resp = FakeResponse({
            "access_token": "NEW_AT", "refresh_token": "RT",
            "token_type": "Bearer", "expires_in": "3600",
        })
        session = FakeSession(resp)
        client = NaverCafeClient("CID", "SECRET", session=session)
        token = client.fetch_token("CODE", "STATE")
        self.assertEqual(token.access_token, "NEW_AT")
        self.assertEqual(token.refresh_token, "RT")
        self.assertEqual(token.expires_in, 3600)

    def test_token_error_raises(self):
        resp = FakeResponse({"error": "invalid_request", "error_description": "bad"})
        session = FakeSession(resp)
        client = NaverCafeClient("CID", "SECRET", session=session)
        with self.assertRaises(NaverCafeError):
            client.fetch_token("CODE", "STATE")


if __name__ == "__main__":
    unittest.main(verbosity=2)
