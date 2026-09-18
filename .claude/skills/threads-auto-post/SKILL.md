---
name: threads-auto-post
description: 메타 스레드(Threads)에 API로 업무 자동화 관련 글을 자동 작성·게시하고 Slack DM으로 게시 내역을 알린다. "스레드에 글 올려줘", "스레드에 업무 자동화 글 자동으로", "매일 스레드 자동 게시", "스레드 자동화", "Threads에 포스팅" 같은 요청에 사용한다.
---

# 메타 스레드 자동 게시 (Threads API + Slack 알림)

주제를 주면(기본은 **업무 자동화**) 스레드 게시글을 만들어 **메타 스레드에 바로 게시**하고,
게시 결과(내용·링크·시간)를 **Slack DM으로 알림**한다. 매일 자동 게시 스케줄도 지원한다.
blogger-auto-post 스킬과 동일한 구조라, 큐/스케줄/Slack 방식이 똑같다.

## 언제 이 스킬을 쓰는가
- "업무 자동화 관련 글 스레드에 올려줘" — Claude가 500자 이내 글을 쓰고 바로 게시
- "이 문구 스레드에 게시해줘" — 완성된 문구를 게시만
- "매일 스레드에 자동으로 올라가게 해줘" — GitHub Actions(클라우드) 또는 Windows 예약작업으로 무인 게시 구성
- "스레드 올라가면 슬랙으로 알려줘" — 게시 내역 Slack DM 알림 (기본 내장)

## 최초 1회 설정 (안 되어 있으면 먼저 안내)
게시에는 스레드 액세스 토큰이 필요하다. `secrets/config.json` 과 `secrets/token.json`
이 없으면 아직 설정 전이다. 이때는 **곧바로 스크립트를 돌리지 말고** 사용자에게
`references/threads_setup.md` 순서를 안내한다. 핵심만:

1. 라이브러리 설치: `pip install -r .claude/skills/threads-auto-post/requirements.txt`
2. Meta 개발자 앱 생성(Threads API 사용 사례) + 본인 계정을 tester 로 연결.
3. 대시보드에서 액세스 토큰 발급 후, 토큰·앱 시크릿으로 최초 등록:
   ```bash
   python .claude/skills/threads-auto-post/scripts/auth.py \
     --token "발급받은_토큰" --app-secret "앱_시크릿"
   ```
   → 단기 토큰을 60일 장기 토큰으로 바꿔 저장하고 user_id 도 저장한다.

## 게시 워크플로 (Claude가 글을 쓰는 경우 — 기본)

대화 중 가장 흔한 경로다. **generate.py 를 쓰지 말 것** — Claude가 직접 좋은
글을 쓰는 게 더 낫다. 순서:

1. 소재를 확인한다(기본 주제: 업무 자동화). 필요하면 톤/타깃을 한 번 되묻는다.
2. 본문을 **500자 이내 순수 텍스트**로 작성해 임시 파일에 저장한다.
   - 첫 줄은 후킹 문장, 구체적 팁 1~3개, 마지막에 해시태그 2~4개.
   - 스크래치패드 등 임시 경로에 `post.txt` 로 저장하면 된다.
3. 게시 스크립트를 호출한다:
   ```bash
   python .claude/skills/threads-auto-post/scripts/publish.py \
     --text-file "/경로/post.txt"
   ```
   - 기본은 **바로 게시 + Slack 알림**.
   - 링크 미리보기: `--link "https://..."`, 이미지 게시: `--image-url "https://..."`(공개 URL),
     Slack 알림 끄기: `--no-slack`.
4. 스크립트가 마지막 줄에 출력한 게시 링크(permalink)를 사용자에게 전달한다.

## 완성된 문구를 게시만 하는 경우
사용자가 문구를 이미 줬다면 `post.txt` 로 저장한 뒤 위 `publish.py` 를 그대로
호출한다. 500자를 넘으면 게시가 거부되므로 줄여서 다시 시도한다.

## 매일 자동 게시 (무인 스케줄)
Claude 없이 스케줄러가 `scripts/daily_post.py` 를 하루 한 번 돌리는 경로다.
스케줄러는 **GitHub Actions(권장, PC 꺼져 있어도 됨)** 또는 Windows 예약작업
중 하나를 쓴다(아래 참고). 스크립트는 "오늘 뭘 올릴지"를 아래 우선순위로 고른다:

1. **queue/ 폴더** — 미리 만들어 둔 글. 각 파일은
   `{"text": "...", "link": "...", "image_url": "..."}` 형식의 `*.json`(text 만 필수).
   가장 오래된 파일부터(FIFO) 게시하고, 게시 후 `queue/posted/` 로 옮긴다.
   **API 키가 없어도 되는 기본 방식이다.**
2. **topics.txt + Anthropic API** — queue가 비어 있고 `ANTHROPIC_API_KEY` 가
   설정돼 있으면, `topics.txt` 의 다음 소재로 `generate.py` 가 글을 자동 생성한다.
   `topics.example.txt` 를 `topics.txt` 로 복사해 소재를 채운다.

성공/실패 모두 Slack DM으로 알린다(무인 실행이 조용히 깨지지 않게).
큐 잔량이 적어지면(기본 2편 이하) "글 더 만들어달라"는 리필 알림도 Slack으로 보낸다.

### 큐 채우기 (Claude가 리필하는 법)
사용자가 "스레드 글 며칠치 만들어서 큐에 넣어줘" 라고 하면, 글마다 본문을 텍스트
파일로 쓴 뒤 `add_to_queue.py` 로 넣는다:
```bash
python .claude/skills/threads-auto-post/scripts/add_to_queue.py \
  --text-file "/경로/post.txt"
```
여러 편을 넣을 때는 위를 반복한다. 파일명은 `queue/NNNN.json` 으로 자동 번호가
매겨져 순서대로 게시된다. 소재는 `topics.example.txt` 의 풀을 참고한다.
`queue/` 는 git 에 추적되므로, GitHub Actions 스케줄을 쓴다면 큐를 채운 뒤
**커밋·푸시까지 해야** 클라우드 러너가 새 글을 볼 수 있다.

### 게시 전 미리보기 (dry-run)
실제로 올리기 전에 다음에 나갈 글을 확인하려면:
```bash
python .claude/skills/threads-auto-post/scripts/daily_post.py --dry-run
```
게시하지 않고 본문·글자 수·큐 잔량만 보여준다.

### 스케줄 A — GitHub Actions (권장, PC 전원과 무관)
`.github/workflows/threads-daily.yml` 이 매일 08:00 KST(23:00 UTC)에 클라우드에서
`daily_post.py` 를 실행하고, 게시 후 `queue/posted/` 이동을 직접 커밋한다.
- 필요한 저장소 Secrets(한 번만): `THREADS_TOKEN_JSON`, `THREADS_CONFIG_JSON`,
  `SLACK_BOT_TOKEN`(블로거와 공용), `GH_PAT`(선택, 갱신된 토큰 자동 저장용).
  등록 방법은 `references/threads_setup.md` 6~7단계.
- 스케줄은 **main 브랜치의 워크플로 파일**로 돈다. 블로거와 같은 방식으로 이 파일이
  main 에도 등록돼 있어야 한다.
- 수동 실행/테스트: GitHub → Actions → "Threads Daily Publish" → Run workflow.

### 스케줄 B — Windows 예약작업 (PC가 켜져 있을 때만)
```powershell
.\.claude\skills\threads-auto-post\scripts\install_daily_task.ps1
```
기본 매일 08:00. 시간은 스크립트 상단 `$runAt` 에서 변경. 즉시 테스트:
```powershell
Start-ScheduledTask -TaskName RichgogoThreadsDaily
```
A 와 B 를 동시에 켜면 하루 두 편이 나간다. 하나만 쓴다.

## Slack 알림
`slackbot/.env` 의 `SLACK_BOT_TOKEN` 을 재사용하고, DM 대상은 이 스킬 config →
blogger 스킬 config 순으로 자동 인식한다. 별도 설정 불필요. 토큰이 없으면 알림만
조용히 건너뛰고 게시는 정상 진행된다.

## 토큰 수명 관리
장기 토큰은 약 60일 유효하고, 만료 10일 전부터 게시 시 **자동 갱신**을 시도한다
(24시간 이상 지난 토큰만 갱신 가능). 갱신하면 **새 토큰 문자열**이 나온다.
- 로컬(Windows)에서는 `secrets/token.json` 에 바로 덮어써서 끝.
- GitHub Actions 러너에서는 `GH_PAT` secret 이 있으면 갱신된 토큰을
  `THREADS_TOKEN_JSON` secret 에 자동 저장한다. 없으면 Slack 으로 "secret 을 다시
  등록하라"는 알림이 오고, 기존 토큰 만료(최대 10일)까지 다시 등록해야 한다.
60일 넘게 한 번도 안 돌려 만료됐다면, `references/threads_setup.md` 4단계로 토큰만
다시 발급해 `auth.py` 를 재실행하고(클라우드면 secret 도 갱신) 된다.

## 파일 구조
- `scripts/common.py` — 토큰·설정·Threads API(컨테이너 생성→발행)·Slack 공용 로직
- `scripts/auth.py` — 최초 1회 토큰 등록(+장기 토큰 교환) & user_id 저장
- `scripts/publish.py` — 글 하나 게시 + Slack 알림 (Claude가 대화 중 호출)
- `scripts/add_to_queue.py` — 미리 쓴 글을 게시 큐에 넣기 (큐 리필용)
- `scripts/generate.py` — 소재→글 자동 생성 (무인 스케줄 전용, API 키 필요)
- `scripts/daily_post.py` — 무인 일일 게시 오케스트레이션 (`--dry-run` 지원)
- `scripts/install_daily_task.ps1` / `daily_post.bat` — Windows 예약작업
- `.github/workflows/threads-daily.yml` — GitHub Actions 무인 게시 (저장소 루트)
- `references/threads_setup.md` — Meta 개발자 앱/토큰/Secrets 최초 설정 가이드
- `queue/` — 게시 대기 글(git 추적, 클라우드 러너가 읽음), `queue/posted/` 게시 완료분
- `secrets/` — token.json·config.json (git 제외)
