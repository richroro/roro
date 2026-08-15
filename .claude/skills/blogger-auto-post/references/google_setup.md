# Google Blogger API 최초 설정 (한 번만)

Blogger에 글을 **쓰려면** OAuth2 인증이 필요합니다 (읽기 전용 API 키로는 발행 불가).
아래는 처음 한 번만 하면 되는 설정입니다. 이미 다른 컴퓨터에서
`client_secret.json` 을 받으셨다면 **1~3단계는 건너뛰고 4단계**로 가세요.

## 1. Google Cloud 프로젝트 + Blogger API 활성화
1. https://console.cloud.google.com 접속 → 프로젝트 생성(또는 기존 것 선택).
2. "API 및 서비스" → "라이브러리" → **Blogger API v3** 검색 → **사용 설정**.

## 2. OAuth 동의 화면
1. "API 및 서비스" → "OAuth 동의 화면".
2. User Type: **외부(External)** → 앱 이름/이메일 입력.
3. 게시 상태가 "테스트"라면 **Test users** 에 본인 Google 계정(블로그 소유 계정)을 추가.
   (테스트 유저의 refresh token은 7일 후 만료될 수 있으니, 오래 돌릴 거면 앱을
   "프로덕션"으로 게시하는 걸 권장합니다.)

## 3. OAuth 클라이언트 만들기
1. "API 및 서비스" → "사용자 인증 정보" → "사용자 인증 정보 만들기" →
   **OAuth 클라이언트 ID**.
2. 애플리케이션 유형: **데스크톱 앱**.
3. 생성 후 **JSON 다운로드** → 파일 이름을 `client_secret.json` 으로.

## 4. 이 컴퓨터에 파일 배치
다운로드/전달받은 파일을 아래 경로에 두세요:

```
.claude/skills/blogger-auto-post/secrets/client_secret.json
```

> 다른 컴퓨터에서 이미 로그인까지 마쳐 `token.json` 도 있다면, 그 파일도 같은
> `secrets/` 폴더에 함께 넣으면 재로그인 없이 바로 동작합니다. (단, refresh token이
> 포함되어 있어야 하며 테스트 앱은 7일 후 만료될 수 있음.)

## 5. 최초 로그인 + 블로그 선택
```bash
python .claude/skills/blogger-auto-post/scripts/auth.py
```
브라우저가 열리면 블로그 소유 Google 계정으로 로그인 → 권한 허용.
성공하면 `secrets/token.json` 과 `secrets/config.json`(blog_id 포함)이 생성됩니다.

## 보안 메모
`secrets/` 폴더는 `.gitignore` 에 등록되어 있어 git에 커밋되지 않습니다.
`client_secret.json` / `token.json` 은 비밀번호처럼 취급하세요.
