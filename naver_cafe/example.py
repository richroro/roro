"""프로그래밍 방식 사용 예제.

외부 데이터를 가공해서 아이톡톡 카페에 자동으로 글을 올리는 시나리오.
CLI 대신 코드에서 직접 클라이언트를 쓰고 싶을 때 참고하세요.
"""

import os

from naver_cafe import NaverCafeClient
from naver_cafe.auth import load_token, save_token
from naver_cafe.cli import _load_dotenv

_load_dotenv()  # .env 로드

CLIENT_ID = os.environ["NAVER_CLIENT_ID"]
CLIENT_SECRET = os.environ["NAVER_CLIENT_SECRET"]

# 대상 카페/게시판 (아이톡톡 카페 정보로 교체)
CLUB_ID = "여기에_카페ID"
MENU_ID = "여기에_게시판ID"


def main() -> None:
    token = load_token("token.json")
    if token is None:
        raise SystemExit("먼저 `python -m naver_cafe auth` 로 인증하세요.")

    client = NaverCafeClient(CLIENT_ID, CLIENT_SECRET, token=token)

    # 예: 오늘의 공지 자동 발행
    subject = "[자동] 오늘의 공지"
    content = (
        "<p>안녕하세요, 아이톡톡 회원 여러분!</p>"
        "<p>이 글은 API로 자동 발행되었습니다.</p>"
    )

    try:
        result = client.write_article(CLUB_ID, MENU_ID, subject, content, open_yn=True)
        print("작성 성공:", result)
    except Exception as exc:
        # 토큰 만료 시 갱신 후 재시도
        print("실패, 토큰 갱신 후 재시도:", exc)
        client.refresh()
        save_token(client.token, "token.json")
        result = client.write_article(CLUB_ID, MENU_ID, subject, content, open_yn=True)
        print("작성 성공(재시도):", result)


if __name__ == "__main__":
    main()
