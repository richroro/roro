# 네이버 블로그 자동 글쓰기 (naver-blog)

주제만 주면 **Claude 가 글을 쓰고**, **크롬 창을 열어 네이버 블로그에 직접 발행**하는 도구입니다.
네이버 블로그는 글쓰기 API 가 없어서 발행은 Playwright 브라우저 자동화로 처리합니다.

```
주제 ──(Claude API)──▶ 글(제목·본문·태그) ──▶ queue/ ──(크롬 자동화)──▶ 네이버 블로그 발행
```

- 글 생성: `claude-opus-5` 기본, 구조화 출력(JSON)으로 항상 같은 형태
- 발행: 크롬 창을 띄워 스마트에디터 ONE 에 제목·본문·태그를 입력하고 발행 버튼 클릭
- 로그인: 처음 한 번 창에서 직접 로그인하면 `profile/` 에 세션이 저장돼 다음부터 자동
- 큐: 미리 여러 편 만들어 두고 하루 한 편씩 발행 (Windows 예약작업 스크립트 포함)
- 실패 시 `logs/` 에 스크린샷, 어느 단계에서 멈췄는지 메시지로 안내

## 1. 설치 (최초 1회)

Python 3.10 이상.

```bash
cd naver-blog
pip install -r requirements.txt
python -m playwright install chromium      # PC 에 설치된 크롬을 쓸 거면 생략 가능 (아래 NAVER_BROWSER_CHANNEL)
copy .env.example .env                     # macOS/Linux: cp .env.example .env
```

`.env` 를 열어 최소 두 값을 채웁니다.

```
ANTHROPIC_API_KEY=sk-ant-...     # 글 생성용
NAVER_BLOG_ID=내네이버아이디      # blog.naver.com/여기
```

## 2. 네이버 로그인 (최초 1회)

```bash
python -m naverblog login
```

크롬 창이 열리면 네이버에 로그인하세요(캡차·2단계 인증 포함). 로그인이 확인되면 창이
닫히고 세션이 `profile/` 에 저장됩니다. 이후에는 다시 로그인하지 않습니다.
세션이 만료되면 `publish` 가 창을 띄우고 다시 로그인을 기다립니다.

`.env` 에 `NAVER_ID` / `NAVER_PW` 를 넣으면 자동 로그인을 먼저 시도합니다. 네이버가
캡차를 띄우면 사람이 마무리해야 하므로, 처음엔 수동 로그인을 권합니다.

## 3. 글 만들기

```bash
# 주제 하나로 글 생성 → queue/0001.json 에 저장
python -m naverblog generate --topic "월급 통장 쪼개기, 3개 통장으로 시작하는 법"

# 여러 주제, 문체·분량·키워드 지정
python -m naverblog generate --topic "주제A" --topic "주제B" --style formal --length long --keywords "재테크,통장"

# topics.txt 의 다음 주제 3개로 생성 (topics.example.txt 를 topics.txt 로 복사해 채우세요)
python -m naverblog generate --from-topics --count 3

# 큐에 넣지 않고 화면으로만 보기
python -m naverblog generate --topic "주제" --no-queue
```

| 옵션 | 값 | 설명 |
|---|---|---|
| `--style` | `friendly`(기본) / `formal` / `casual` | ~해요 / ~합니다 / 반말 |
| `--length` | `short` / `medium`(기본) / `long` | 800~1200 / 1500~2200 / 2500~3500자 |
| `--keywords` | 쉼표 구분 | 본문에 자연스럽게 넣을 검색 키워드 |
| `--audience` | 문장 | 주요 독자 (`.env` 의 `BLOG_AUDIENCE` 로 기본값) |
| `--extra` | 문장 | 추가 요청 |

`.env` 의 `BLOG_PERSONA` 에 블로그 소개(운영자 시점·톤)를 적어 두면 모든 글이 같은 목소리로 나옵니다.

직접 쓴 글을 큐에 넣을 수도 있습니다. 본문은 `## 소제목`, 빈 줄로 문단 구분, `- 항목` 형식입니다.

```bash
python -m naverblog queue add --title "제목" --body-file 글.md --tags "태그1,태그2"
python -m naverblog queue list
python -m naverblog queue show 1
python -m naverblog queue remove 1
```

## 4. 발행하기

```bash
# 처음엔 --review 로: 에디터에 다 입력한 뒤 발행 직전에 멈춥니다. 화면을 확인하고 Enter.
python -m naverblog publish --review

# 큐 맨 앞 글을 바로 발행
python -m naverblog publish

# 특정 글, 비공개, 카테고리 지정
python -m naverblog publish 3 --private --category "재테크"

# 브라우저를 열지 않고 무엇을 발행할지만 확인
python -m naverblog publish --dry-run
```

발행이 끝나면 글 주소를 출력하고, 글은 `queue/posted/` 로 옮겨지며 `data/posted_log.json` 에 기록됩니다.

### 한 번에: 생성 + 발행

```bash
python -m naverblog run            # 큐 맨 앞 발행, 큐가 비었으면 topics.txt 로 한 편 생성 후 발행
python -m naverblog run --review   # 확인 후 발행
```

### 매일 자동 발행 (Windows)

크롬 창을 띄우는 방식이라 **PC 가 켜져 있고 로그온된 상태**에서 돌아갑니다. 큐를 미리 채워 두면
매일 한 편씩 나가고, 큐가 비면 `topics.txt` 로 생성합니다.

```powershell
.\scripts\install_daily_task.ps1              # 매일 09:00 (시간은 파일 상단 $runAt)
Start-ScheduledTask -TaskName NaverBlogDaily   # 지금 바로 테스트
Get-Content .\scripts\daily_post.log -Tail 20  # 로그
```

### 수동 붙여넣기 (자동화가 막힐 때)

```bash
python -m naverblog export --format txt     # export/0001-제목.txt 생성 → 복사해서 에디터에 붙이기
python -m naverblog export 2 --format html
```

## 5. 상태 확인

```bash
python -m naverblog status
```

큐 잔량, 다음 발행 글, 주제 소진 현황, 로그인 세션 유무, 최근 발행 5편을 보여줍니다.

## 6. 문제가 생기면

**발행 중 `[제목 입력] 단계에서 실패 ... (스크린샷: logs/...)`**
네이버가 에디터 화면을 바꾼 경우입니다. `naverblog/selectors.py` 한 파일에 모든 화면 요소
선택자가 후보 리스트로 모여 있습니다. 크롬에서 글쓰기 화면을 열고 F12 → 요소 검사로
해당 요소의 class 를 확인해 후보 맨 앞에 추가하면 됩니다. 해시가 붙는 클래스
(`publish_btn__m9KHH`)는 `[class^='publish_btn__']` 처럼 접두어로 잡아 두었습니다.

**로그인이 자꾸 풀린다 / 캡차가 뜬다**
- `.env` 에 `NAVER_BROWSER_CHANNEL=chrome` 을 넣어 PC 에 설치된 크롬으로 실행해 보세요.
- `--headless` 는 네이버가 막는 경우가 많아 기본은 창을 띄우는 방식입니다.
- 자동화 크롬 창이 이미 열려 있으면 프로필이 잠깁니다. 닫고 다시 실행하세요.

**소제목 굵게가 이상하게 적용된다**
`.env` 에 `NAVER_BOLD_HEADINGS=0`.

**동작이 너무 빨라 확인이 안 된다**
`--slow-mo 300` 또는 `.env` 의 `NAVER_TYPING_DELAY_MS=200`.

**글이 생성되지 않는다**
`ANTHROPIC_API_KEY` 를 확인하세요. 모델·품질은 `ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT` 로 조절합니다.
안전 분류기가 요청을 거절하면 서버가 대체 모델로 이어서 처리하도록(`fallbacks`) 켜 두었고,
`ANTHROPIC_FALLBACKS=0` 으로 끌 수 있습니다.

## 주의

- 네이버는 자동화 도구 사용을 약관으로 제한하며, 짧은 시간에 많은 글을 올리면 저품질·제재
  대상이 될 수 있습니다. 하루 1편 정도의 속도와 `--review` 로 내용을 확인하는 사용을 권합니다.
- 생성된 글의 사실 확인은 발행 전 사람이 해야 합니다. 의학·법률·투자 정보는 특히 주의하세요.
- `.env`(API 키·비밀번호)와 `profile/`(로그인 세션)은 `.gitignore` 로 커밋에서 제외됩니다.

## 파일 구조

```
naver-blog/
├─ naverblog/
│  ├─ cli.py         명령줄 (login / generate / queue / publish / run / export / status)
│  ├─ generator.py   Claude API 로 글 생성 (구조화 출력, 스트리밍)
│  ├─ publisher.py   Playwright 로 크롬을 열어 에디터 입력·발행
│  ├─ selectors.py   네이버 에디터 화면 요소 선택자 (화면이 바뀌면 여기만 수정)
│  ├─ post.py        글 데이터 모델, txt/md/html 변환
│  ├─ queue.py       발행 대기 큐 (queue/NNNN.json → queue/posted/)
│  └─ config.py      경로·.env·상태 파일
├─ scripts/          Windows 예약작업 (daily_post.bat, install_daily_task.ps1)
├─ tests/            단위 테스트 + 가짜 에디터 페이지로 발행 흐름 검증
├─ queue/            발행 대기 글
├─ data/             state.json(큐 번호·주제 인덱스), posted_log.json(발행 이력)
├─ profile/          크롬 프로필 = 네이버 로그인 세션 (git 제외)
├─ logs/             실패 스크린샷 (git 제외)
├─ .env.example      설정 예시 → .env 로 복사
└─ topics.example.txt 주제 목록 예시 → topics.txt 로 복사
```

테스트: `python -m unittest discover -s tests -t .` (실제 네이버에는 접속하지 않습니다)
