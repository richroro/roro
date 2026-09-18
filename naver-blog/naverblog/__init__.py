# -*- coding: utf-8 -*-
"""네이버 블로그 자동 글쓰기·발행 도구.

- 글 생성: Claude API (주제 → 제목·본문·태그)
- 발행: Playwright 로 크롬 창을 열어 네이버 스마트에디터 ONE 에 직접 입력 후 발행
  (네이버 블로그는 공개 글쓰기 API 가 없어서 브라우저 자동화로 처리한다)

사용법은 README.md 참고. 실행은 `python -m naverblog <명령>`.
"""

__version__ = "0.1.0"
