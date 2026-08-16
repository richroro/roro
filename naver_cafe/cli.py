"""네이버 카페 글쓰기 CLI.

사용 예)
  # 1) 인증 (최초 1회) — 토큰을 token.json 에 저장
  python -m naver_cafe auth

  # 2) 글 작성
  python -m naver_cafe post \
      --club-id 12345678 --menu-id 5 \
      --subject "오늘의 공지" --content "본문 내용입니다."

  # 3) 파일 본문으로 작성
  python -m naver_cafe post --club-id 12345678 --menu-id 5 \
      --subject "긴 글" --content-file notice.html

자격증명은 환경변수 또는 .env 파일에서 읽는다:
  NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_REDIRECT_URI(선택)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from .auth import interactive_login, load_token, save_token
from .client import NaverCafeClient, NaverCafeError

DEFAULT_TOKEN_PATH = "token.json"
DEFAULT_REDIRECT = "http://localhost:8080/callback"


def _load_dotenv(path: str = ".env") -> None:
    """의존성 없이 간단한 .env 로더 (KEY=VALUE 형식)."""
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _get_credentials() -> tuple[str, str]:
    client_id = os.environ.get("NAVER_CLIENT_ID")
    client_secret = os.environ.get("NAVER_CLIENT_SECRET")
    if not client_id or not client_secret:
        sys.exit(
            "오류: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가 설정되지 않았습니다.\n"
            "      .env 파일을 만들거나 환경변수를 지정하세요 (.env.example 참고)."
        )
    return client_id, client_secret


def cmd_auth(args: argparse.Namespace) -> int:
    client_id, client_secret = _get_credentials()
    redirect = os.environ.get("NAVER_REDIRECT_URI", DEFAULT_REDIRECT)
    client = NaverCafeClient(client_id, client_secret)
    token = interactive_login(client, redirect_uri=redirect, open_browser=not args.no_browser)
    save_token(token, args.token_path)
    print(f"토큰을 저장했습니다: {args.token_path}")
    return 0


def cmd_post(args: argparse.Namespace) -> int:
    client_id, client_secret = _get_credentials()
    token = load_token(args.token_path)
    if token is None:
        sys.exit(f"오류: 토큰이 없습니다. 먼저 'python -m naver_cafe auth' 를 실행하세요.")

    if args.content_file:
        content = Path(args.content_file).read_text(encoding="utf-8")
    elif args.content is not None:
        content = args.content
    else:
        sys.exit("오류: --content 또는 --content-file 중 하나는 필요합니다.")

    client = NaverCafeClient(client_id, client_secret, token=token)

    open_yn = None
    if args.public:
        open_yn = True
    elif args.private:
        open_yn = False

    try:
        result = client.write_article(
            club_id=args.club_id,
            menu_id=args.menu_id,
            subject=args.subject,
            content=content,
            open_yn=open_yn,
            strict_encoding=args.strict_encoding,
        )
    except NaverCafeError as exc:
        # access token 만료 가능성 → refresh 후 1회 재시도
        looks_token_related = "token" in str(exc).lower() or "[24" in str(exc)
        if token.refresh_token and looks_token_related:
            try:
                client.refresh()
                save_token(client.token, args.token_path)
                result = client.write_article(
                    club_id=args.club_id,
                    menu_id=args.menu_id,
                    subject=args.subject,
                    content=content,
                    open_yn=open_yn,
                    strict_encoding=args.strict_encoding,
                )
            except NaverCafeError as exc2:
                sys.exit(f"글쓰기 실패: {exc2}")
        else:
            sys.exit(f"글쓰기 실패: {exc}")

    article_id = (
        result.get("message", {}).get("result", {}).get("articleId")
        if isinstance(result.get("message"), dict)
        else None
    )
    print("글을 작성했습니다." + (f" (articleId={article_id})" if article_id else ""))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="naver_cafe", description="네이버 카페 글쓰기 연동")
    parser.add_argument("--token-path", default=DEFAULT_TOKEN_PATH, help="토큰 저장 파일 경로")
    sub = parser.add_subparsers(dest="command", required=True)

    p_auth = sub.add_parser("auth", help="네이버 로그인/토큰 발급")
    p_auth.add_argument("--no-browser", action="store_true", help="브라우저 자동 실행 안 함")
    p_auth.set_defaults(func=cmd_auth)

    p_post = sub.add_parser("post", help="카페에 글 작성")
    p_post.add_argument("--club-id", required=True, help="카페 ID (clubid)")
    p_post.add_argument("--menu-id", required=True, help="게시판 ID (menuid)")
    p_post.add_argument("--subject", required=True, help="글 제목")
    p_post.add_argument("--content", help="글 본문 (텍스트)")
    p_post.add_argument("--content-file", help="글 본문을 읽어올 파일 경로")
    p_post.add_argument("--public", action="store_true", help="전체 공개로 작성")
    p_post.add_argument("--private", action="store_true", help="비공개로 작성")
    p_post.add_argument(
        "--strict-encoding",
        action="store_true",
        help="EUC-KR 불가 문자(이모지 등) 발견 시 에러 처리",
    )
    p_post.set_defaults(func=cmd_post)

    return parser


def main(argv: list[str] | None = None) -> int:
    _load_dotenv()
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
