# 네이버 카페 글쓰기 연동 (naver_cafe)

네이버 개발자센터 **카페 API**를 이용해, 이미 개설된 네이버 카페(예: *아이톡톡*)에
글을 **자동으로 작성**하는 파이썬 스크립트입니다.

> ⚠️ 카페 **생성**은 API로 불가능합니다. 카페는 네이버 웹/앱에서 직접 개설해야 하며,
> 이 도구는 개설된 카페에 **글을 발행**하는 용도입니다. 댓글/회원관리/게시판관리 등
> 매니저 운영 기능은 공식 API가 제공하지 않습니다.

## 1. 사전 준비

### (1) 네이버 카페 개설 & 게시판 설정
- 카페를 만들고, 글을 올릴 **게시판(메뉴)** 을 준비합니다.
- 카페 관리에서 해당 게시판이 **API 글쓰기(오픈API)를 허용**하도록 설정합니다.
- **`clubid`(카페 ID)** 와 **`menuid`(게시판 ID)** 를 확인합니다.
  - 카페 게시판에 들어가면 주소창 URL에 `clubid=...`, `menuid=...` 형태로 보입니다.

### (2) 네이버 개발자센터 앱 등록
1. https://developers.naver.com → **Application > 애플리케이션 등록**
2. 사용 API에서 **네이버 로그인** + **카페** 선택
3. **Callback URL** 에 `http://localhost:8080/callback` 등록 (아래 설정과 일치시킬 것)
4. 발급된 **Client ID / Client Secret** 확보

## 2. 설치

```bash
cd naver_cafe            # 이 디렉터리 기준
pip install -r requirements.txt

cp .env.example .env     # 값 채우기 (Client ID/Secret 등)
```

## 3. 사용법 (CLI)

프로젝트 루트(=`naver_cafe`의 상위 디렉터리)에서 실행합니다.

```bash
# 1) 최초 1회 인증 — 브라우저 로그인 후 token.json 저장
python -m naver_cafe auth

# 2) 글 작성
python -m naver_cafe post \
    --club-id 12345678 --menu-id 5 \
    --subject "오늘의 공지" \
    --content "본문입니다. <b>HTML</b> 일부 사용 가능."

# 3) 본문을 파일에서 읽어 작성 (긴 글/HTML 편함)
python -m naver_cafe post --club-id 12345678 --menu-id 5 \
    --subject "긴 공지" --content-file notice.html --public
```

주요 옵션
- `--public` / `--private` : 공개 여부 (미지정 시 게시판 기본값)
- `--strict-encoding` : 이모지 등 EUC-KR 불가 문자가 있으면 에러로 알림
- `--token-path` : 토큰 파일 경로 (기본 `token.json`)

## 4. 코드에서 직접 사용

`example.py` 참고:

```python
from naver_cafe import NaverCafeClient
from naver_cafe.auth import load_token

client = NaverCafeClient(CLIENT_ID, CLIENT_SECRET, token=load_token("token.json"))
client.write_article(club_id="12345678", menu_id="5",
                     subject="제목", content="본문", open_yn=True)
```

## 5. 알아둘 점 / 주의

- **EUC-KR 인코딩**: 네이버 카페 글쓰기 API는 제목/본문을 EUC-KR로 인코딩해야 합니다.
  이 스크립트가 자동 처리하지만, **이모지(😀)나 일부 특수문자는 EUC-KR에 없어 전송 불가**합니다.
  기본은 해당 문자를 제거(무시)하며, `--strict-encoding` 으로 검출할 수 있습니다.
- **작성자 명의**: 글은 인증한 네이버 계정 명의로 올라갑니다. 그 계정이 대상 카페의
  회원이어야 하며, 본인 카페라면 매니저이므로 문제없습니다.
- **토큰 만료**: access token 만료 시 refresh token 으로 자동 갱신 후 재시도합니다.
- **보안**: `.env` 와 `token.json` 에는 비밀값이 들어갑니다. **절대 커밋하지 마세요**
  (상위 `.gitignore` 에 등록되어 있습니다).
- **약관 준수**: 과도한 자동 발행/도배는 네이버 이용약관 위반 및 카페 제재 대상이 될 수
  있습니다. 정상적인 운영 범위 내에서 사용하세요.

## 파일 구성

```
naver_cafe/
├── __init__.py       # 패키지 진입점
├── __main__.py       # `python -m naver_cafe` 진입점
├── client.py         # API 클라이언트 (OAuth + 글쓰기, EUC-KR 처리)
├── auth.py           # 브라우저 로그인/토큰 저장·로드 헬퍼
├── cli.py            # 커맨드라인 인터페이스
├── example.py        # 코드 사용 예제
├── requirements.txt
└── .env.example
```
