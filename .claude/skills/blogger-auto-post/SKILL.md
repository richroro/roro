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
   가장 오래된 파일부터(FIFO) 발행하고, 발행 후 `queue/posted/` 로 옮긴다.
   **API 키가 없어도 되는 기본 방식이다.**
2. **topics.txt + Anthropic API** — queue가 비어 있고 `ANTHROPIC_API_KEY` 가
   설정돼 있으면, `topics.txt` 의 다음 주제로 `generate.py` 가 글을 자동 생성한다.
   `topics.example.txt` 를 `topics.txt` 로 복사해 주제를 채운다.

성공/실패 모두 Slack DM으로 알린다(무인 실행이 조용히 깨지지 않게).
큐 잔량이 적어지면(기본 2편 이하) "글 더 만들어달라"는 리필 알림도 Slack으로 보낸다.

### 큐 채우기 (Claude가 리필하는 법)
사용자가 "블로그 글 며칠치 만들어서 큐에 넣어줘" 라고 하면, 글마다 HTML 본문을
파일로 쓴 뒤 `add_to_queue.py` 로 넣는다:
```bash
python .claude/skills/blogger-auto-post/scripts/add_to_queue.py \
  --title "제목" --body-file "/경로/post.html" --labels "재테크,부업"
```
여러 편을 넣을 때는 위를 반복하면 되고, 파일명은 `queue/NNNN.json` 으로 자동
번호가 매겨져 순서대로 발행된다. 주제는 `topics.example.txt` 의 풀을 참고한다.

### 발행 전 미리보기 (dry-run)
실제로 올리기 전에 다음에 나갈 글을 확인하려면:
```bash
python .claude/skills/blogger-auto-post/scripts/daily_post.py --dry-run
```
발행하지 않고 제목·라벨·본문 길이·큐 잔량만 보여준다.

스케줄 등록 (PowerShell):
```powershell
.\.claude\skills\blogger-auto-post\scripts\install_daily_task.ps1
```
기본 매일 09:00. 시간은 스크립트 상단 `$runAt` 에서 변경. 즉시 테스트:
```powershell
Start-ScheduledTask -TaskName RichgogoBloggerDaily
```

## 조회수 확인 & 데이터 기반 주제 선정
`stats.py` 는 블로거 API로 **전체 조회수**(전체/30일/7일)를 가져와 `secrets/stats_history.json`
에 스냅샷으로 쌓고, 스냅샷 사이의 증가분을 그 기간에 발행한 글의 라벨에 배분해
**주제별 성과를 추정**한다. 발행할 때마다 `secrets/posted_log.json` 에 제목·라벨·URL이
기록되고, `daily_post.py` 는 발행 직후 조회수 스냅샷도 남긴다.

블로거 API로는 **글별(per-post) 조회수가 안 나온다** — 전체 조회수만 제공한다.
정확한 글별 데이터가 필요하면 Google Analytics 연동을 안내한다(`references/analytics_setup.md`).
트래픽이 적을 때는 자체 조회수 신호가 약하므로, 콘텐츠 방향은 검색·트렌드 등
**외부 수요**로 잡는다. 이 데이터→주제 전략은 `blog-manager` 에이전트가 담당한다.

## Slack 알림
`slackbot/.env` 의 `SLACK_BOT_TOKEN` 과 `SLACK_ALLOWED_USER_ID` 를 재사용해 발행
내역을 사용자 본인에게 DM으로 보낸다. 별도 설정 불필요. 토큰이 없으면 알림만
조용히 건너뛰고 발행은 정상 진행된다.

## 파일 구조
- `scripts/common.py` — 인증·Blogger 서비스·Slack 알림 공용 로직
- `scripts/auth.py` — 최초 1회 OAuth 로그인 + 블로그 선택
- `scripts/publish.py` — 글 하나 발행 + Slack 알림 (Claude가 대화 중 호출)
- `scripts/add_to_queue.py` — 미리 쓴 글을 발행 큐에 넣기 (큐 리필용)
- `scripts/status.py` — 발행 완료·큐 잔량·다음 예정 요약
- `scripts/stats.py` — 조회수(전체/30일/7일) 조회 + 이력 스냅샷 + 주제별 성과 추정
- `scripts/generate.py` — 주제→글 자동 생성 (무인 스케줄 전용, API 키 필요)
- `scripts/daily_post.py` — 무인 일일 발행 오케스트레이션 (`--dry-run` 지원)
- `scripts/install_daily_task.ps1` / `daily_post.bat` — Windows 예약작업
- `references/google_setup.md` — 구글 클라우드/OAuth 최초 설정 가이드
- `secrets/` — client_secret.json·token.json·config.json (git 제외)
