# 메타 스레드(Threads) 자동 게시 최초 설정 가이드

스레드에 API로 글을 올리려면 **Meta 개발자 앱**과 **액세스 토큰**이 한 번 필요하다.
Threads의 OAuth 리다이렉트는 HTTPS만 허용해서 로컬 스크립트로 처리하기 번거롭기
때문에, 이 스킬은 **대시보드에서 토큰을 직접 발급해 붙여넣는** 간단한 방식을 쓴다.

아래는 한 번만 하면 된다.

## 0. 준비물
- 인스타그램에 연결된 **스레드(Threads) 계정** (공개 프로필 권장).
- Meta(페이스북) 계정.

## 1. Meta 개발자 앱 만들기
1. https://developers.facebook.com/ 접속 → 우상단 **My Apps** → **Create App**.
2. Use case(사용 사례)에서 **"Access the Threads API"** 를 선택.
3. 앱 이름 입력하고 생성.

## 2. 앱에 Threads 설정 추가
1. 앱 대시보드 왼쪽 메뉴에서 **Threads > Use case > Customize** (또는
   **Threads API** 설정)로 이동.
2. 필요한 권한(scope) 추가: **`threads_basic`**, **`threads_content_publish`**.
3. **Threads tester** 로 본인 스레드 계정을 추가하고, 스레드 앱/설정에서 초대
   수락(계정 연결)까지 완료한다.

## 3. 앱 시크릿 확인
- **App settings > Basic** 에서 **App secret**(앱 시크릿)을 확인/복사해 둔다.
  (단기 토큰을 60일짜리 장기 토큰으로 교환할 때 쓴다.)

## 4. 액세스 토큰 발급 (가장 간단한 경로)
1. Threads Use case 설정 화면에서 **Generate access token**(액세스 토큰 생성)
   버튼을 찾는다. (테스터로 추가한 본인 계정 옆)
2. 버튼을 누르면 스레드 로그인/동의 화면이 뜨고, 끝나면 **액세스 토큰 문자열**을
   보여준다. 이 값을 복사한다. (단기 토큰일 수도, 이미 60일 장기 토큰일 수도
   있다. 어느 쪽이든 `auth.py` 가 알아서 처리한다.)

> 대시보드에 생성 버튼이 안 보이면, Graph API 방식으로 아래 URL을 브라우저에
> 직접 넣어 로그인 → 리다이렉트된 주소의 `code` 로 토큰을 받는 방법도 있다.
> 하지만 대부분 위 "Generate access token" 버튼이 가장 쉽다.

## 5. 이 스킬에 토큰 등록
복사한 토큰과 앱 시크릿으로 아래를 한 번 실행한다. 단기 토큰을 자동으로 60일
장기 토큰으로 바꿔서 저장하고, 스레드 user_id 도 함께 저장한다.

```bash
pip install -r .claude/skills/threads-auto-post/requirements.txt

python .claude/skills/threads-auto-post/scripts/auth.py \
  --token "붙여넣은_액세스_토큰" \
  --app-secret "앱_시크릿"
```

성공하면 `secrets/token.json` 과 `secrets/config.json` 이 생성된다. 이후 게시는
저장된 장기 토큰으로 조용히 동작하고, 만료가 가까워지면 자동으로 갱신한다.
(교환에 실패하면 이미 장기 토큰인 것으로 보고 그대로 저장한다. 만료일을 알 수
없으면 60일로 가정한다.)

여기까지 하면 **로컬 게시**(`publish.py`, Windows 예약작업)는 끝이다. PC를 꺼 둬도
매일 올라가게 하려면 6단계로 간다.

## 6. GitHub Actions 클라우드 무인 게시 (PC 꺼져 있어도 게시)
`.github/workflows/threads-daily.yml` 이 매일 08:00 KST 에 GitHub 서버에서
`daily_post.py` 를 돌린다. 러너에는 `secrets/` 폴더가 없으므로 아래 Secrets 에서
복원한다. GitHub 저장소 → **Settings → Secrets and variables → Actions →
New repository secret** 에서 하나씩 등록한다.

| Secret 이름 | 값 |
|---|---|
| `THREADS_TOKEN_JSON` | `.claude/skills/threads-auto-post/secrets/token.json` 파일 내용 전체 |
| `THREADS_CONFIG_JSON` | `.claude/skills/threads-auto-post/secrets/config.json` 파일 내용 전체 |
| `SLACK_BOT_TOKEN` | 블로거 워크플로와 공용. 이미 등록돼 있으면 생략 |

파일 내용은 메모장으로 열어 전체 복사하면 된다. 값은 절대 git 에 커밋하지 않는다.

체크리스트:
- [ ] 위 Secrets 등록
- [ ] `queue/` 에 글이 들어 있고 커밋·푸시됨 (러너는 git 에 있는 큐만 본다)
- [ ] 워크플로 파일이 **main 브랜치**에 등록돼 있음 (스케줄은 기본 브랜치에서만 돈다)
- [ ] Actions 탭 → "Threads Daily Publish" → **Run workflow** 로 1회 수동 테스트

## 7. (선택) 갱신된 토큰 자동 저장용 `GH_PAT`
장기 토큰은 60일마다 갱신되고 갱신하면 새 토큰이 나온다. 러너가 갱신한 토큰을
Secret 에 다시 써 넣으려면 쓰기 권한이 있는 토큰이 필요하다(기본 `GITHUB_TOKEN`
으로는 불가).

1. GitHub → Settings(개인) → Developer settings → **Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Repository access: **Only select repositories** → 이 저장소.
3. Permissions → Repository permissions → **Secrets: Read and write**.
4. 만료는 1년 등 길게. 생성된 값을 저장소 Secret **`GH_PAT`** 로 등록.

없어도 동작은 한다. 다만 갱신 시점(만료 10일 전)에 Slack 으로 "토큰이 갱신됐지만
저장하지 못했다"는 알림이 오고, 그때 4~5단계로 토큰을 다시 받아 `THREADS_TOKEN_JSON`
을 갱신해야 한다.

## 참고 / 제약
- 텍스트 게시글은 **최대 500자**.
- 게시는 2단계다: 컨테이너 생성 → 발행. 스크립트가 알아서 처리한다.
- 장기 토큰은 약 60일 유효하고, 24시간 지난 뒤부터 갱신 가능하다. 스킬이 만료
  10일 전부터 자동 갱신을 시도하며, 갱신 결과는 새 토큰이다. **60일 넘게 한 번도
  안 돌리면 만료**되므로, 그럴 땐 4단계부터 토큰만 다시 발급해 `auth.py` 를
  재실행하면 된다(클라우드를 쓰면 `THREADS_TOKEN_JSON` secret 도 다시 등록).
- 이미지 게시는 **공개적으로 접근 가능한 이미지 URL**이 필요하다(로컬 파일 불가).
