---
name: blogger-auto-post
description: 구글 블로거(Blogger)에 API로 글을 자동 생성·발행하고 Slack DM으로 발행 내역을 알린다. "블로그 글 써서 올려줘", "블로거에 발행해줘", "이 주제로 포스팅 자동으로", "매일 블로그 자동 발행", "구글 블로그 자동화" 같은 요청에 사용한다.
---

# 구글 블로거 자동 발행 (Blogger API + Slack 알림)

주제를 주면 글(제목·HTML 본문·라벨)을 만들어 **구글 블로거에 바로 공개 발행**하고,
발행 결과(제목·링크·시간)를 **Slack DM으로 알림**한다. 매일 자동 발행 스케줄도 지원한다.

## 언제 이 스킬을 쓰는가
- "○○ 주제로 블로그 글 써서 블로거에 올려줘" — Claude가 글을 쓰고 바로 발행
- "이 글(마크다운/HTML) 블로거에 발행해줘" — 완성된 글을 발행만
- "매일 블로그 자동으로 올라가게 해줘" — Windows 예약작업으로 무인 발행 구성
- "블로그 발행되면 슬랙으로 알려줘" — 발행 내역 Slack DM 알림 (기본 내장)

## 최초 1회 설정 (안 되어 있으면 먼저 안내)
발행에는 OAuth 인증이 필요하다. `secrets/config.json` 과 `secrets/token.json` 이
없으면 아직 설정 전이다. 이때는 **곧바로 스크립트를 돌리지 말고** 사용자에게
`references/google_setup.md` 순서를 안내한다. 핵심만:

1. 라이브러리 설치: `pip install -r .claude/skills/blogger-auto-post/requirements.txt`
2. `secrets/client_secret.json` 배치 (다른 컴퓨터에서 받은 파일이면 그걸 그대로 사용).
3. 최초 로그인 + 블로그 선택:
   ```bash
   python .claude/skills/blogger-auto-post/scripts/auth.py
   ```
   → 브라우저가 열리고, 끝나면 `token.json`/`config.json` 이 생성된다.

## 발행 워크플로 (Claude가 글을 쓰는 경우 — 기본)

이게 대화 중 가장 흔한 경로다. **generate.py 를 쓰지 말 것** — Claude가 직접
좋은 글을 쓰는 게 더 낫다. 순서:

1. 주제를 확인한다. 필요하면 톤/길이/타깃 독자를 한 번 되묻는다.
2. 본문을 **HTML 조각**으로 작성해 임시 파일에 저장한다.
   - `<h2>`, `<p>`, `<ul>/<li>`, `<strong>` 등만 사용. `<html>/<head>/<body>` 금지.
   - 스크래치패드 등 임시 경로에 `post.html` 로 저장하면 된다.
3. 발행 스크립트를 호출한다:
   ```bash
   python .claude/skills/blogger-auto-post/scripts/publish.py \
     --title "글 제목" \
     --body-file "/경로/post.html" \
     --labels "자동화,블로그,부업"
   ```
   - 기본은 **바로 공개 발행 + Slack 알림**.
   - 초안으로 저장하려면 `--draft`, Slack 알림을 끄려면 `--no-slack`.
4. 스크립트가 마지막 줄에 출력한 발행 URL을 사용자에게 전달한다.

## 완성된 글을 발행만 하는 경우
사용자가 마크다운/HTML을 이미 줬다면, 마크다운은 간단한 HTML로 변환해
`post.html` 로 저장한 뒤 위 `publish.py` 를 그대로 호출한다.

## 매일 자동 발행 (무인 스케줄)
Claude 없이 예약작업이 도는 경로다. `scripts/daily_post.py` 가 "오늘 뭘 올릴지"를
아래 우선순위로 고른다:

1. **queue/ 폴더** — 미리 만들어 둔 글. 각 파일은
   `{"title": "...", "html": "...", "labels": ["..."]}` 형식의 `*.json`.
   가장 오래된 파일부터 발행하고, 발행 후 `queue/posted/` 로 옮긴다.
   → 사용자가 "이번 주 글 5개 미리 만들어놔줘" 라고 하면, Claude가 글들을 이
   형식으로 `queue/` 에 저장해두면 된다. (가장 안정적이고 편집권도 유지됨)
2. **topics.txt + Anthropic API** — queue가 비어 있고 `ANTHROPIC_API_KEY` 가
   설정돼 있으면, `topics.txt` 의 다음 주제로 `generate.py` 가 글을 자동 생성한다.
   `topics.example.txt` 를 `topics.txt` 로 복사해 주제를 채운다.

성공/실패 모두 Slack DM으로 알린다(무인 실행이 조용히 깨지지 않게).

스케줄 등록 (PowerShell):
```powershell
.\.claude\skills\blogger-auto-post\scripts\install_daily_task.ps1
```
기본 매일 09:00. 시간은 스크립트 상단 `$runAt` 에서 변경. 즉시 테스트:
```powershell
Start-ScheduledTask -TaskName RichgogoBloggerDaily
```

## Slack 알림
`slackbot/.env` 의 `SLACK_BOT_TOKEN` 과 `SLACK_ALLOWED_USER_ID` 를 재사용해 발행
내역을 사용자 본인에게 DM으로 보낸다. 별도 설정 불필요. 토큰이 없으면 알림만
조용히 건너뛰고 발행은 정상 진행된다.

## 파일 구조
- `scripts/common.py` — 인증·Blogger 서비스·Slack 알림 공용 로직
- `scripts/auth.py` — 최초 1회 OAuth 로그인 + 블로그 선택
- `scripts/publish.py` — 글 하나 발행 + Slack 알림 (Claude가 대화 중 호출)
- `scripts/generate.py` — 주제→글 자동 생성 (무인 스케줄 전용, API 키 필요)
- `scripts/daily_post.py` — 무인 일일 발행 오케스트레이션
- `scripts/install_daily_task.ps1` / `daily_post.bat` — Windows 예약작업
- `references/google_setup.md` — 구글 클라우드/OAuth 최초 설정 가이드
- `secrets/` — client_secret.json·token.json·config.json (git 제외)
