# Slack로 이 PC 제어하기

DM으로 `status`, `filter start <name>`, `filter stop` 명령을 보내면 이 PC에서 실행합니다.
`SLACK_ALLOWED_USER_ID`에 설정한 사용자만 명령을 실행할 수 있습니다.

## 1. Slack App 생성

1. https://api.slack.com/apps → **Create New App** → **From scratch**
2. App 이름(예: `richgogo-bot`)과 워크스페이스 선택
3. 좌측 메뉴 **Socket Mode** → 활성화(Enable) → 토큰 이름 아무거나 입력 후 생성되는 **App-Level Token** (`xapp-...`, scope: `connections:write`)을 복사
4. 좌측 메뉴 **OAuth & Permissions** → **Scopes → Bot Token Scopes**에 추가:
   - `chat:write`
   - `im:history`
   - `im:read`
   - `im:write`
5. 같은 페이지 상단 **Install to Workspace** 클릭 → 설치 후 발급되는 **Bot User OAuth Token** (`xoxb-...`) 복사
6. 좌측 메뉴 **Event Subscriptions** → 활성화(Enable) → **Subscribe to bot events**에 `message.im` 추가 → 저장
7. 본인 Slack User ID 확인: Slack 앱에서 본인 프로필 → **more(⋯)** → **Copy member ID** (`U`로 시작하는 값)

## 2. 이 PC에 설정

```powershell
cd slackbot
pip install -r requirements.txt
copy .env.example .env
notepad .env   # SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_ALLOWED_USER_ID 채워넣기
```

## 3. 테스트 실행

```powershell
python bot.py
```

Slack에서 봇 앱을 DM으로 열고 `help`를 보내 응답이 오는지 확인하세요.

## 4. 항상 켜져 있게 등록 (PC 로그온 시 자동 시작)

```powershell
powershell -ExecutionPolicy Bypass -File install_task.ps1
Start-ScheduledTask -TaskName RichgogoSlackBot   # 지금 바로 시작
```

로그는 `slackbot/bot.log`에 쌓입니다. 크래시하면 5초 후 자동 재시작합니다.

중지하려면:
```powershell
Stop-ScheduledTask -TaskName RichgogoSlackBot
Get-Process python | Stop-Process
```

## 명령어

- `status` — 부팅 시각, git 브랜치/최근 커밋/변경사항, 실행 중인 필터 표시
- `filter list` — 사용 가능한 웹캠 필터 목록
- `filter start <ascii|sunglasses|character>` — 웹캠 필터 실행 (로컬 화면에 창이 뜸)
- `filter stop` — 실행 중인 필터 종료
- `help` — 명령어 목록
