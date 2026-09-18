# roro

이 저장소(https://github.com/richroro/roro)가 모든 작업의 원본 보관소입니다.
어느 컴퓨터에서든 아래 순서대로 받으면 같은 상태에서 작업을 이어갈 수 있습니다.

## 브랜치 구조

| 브랜치 | 내용 |
| --- | --- |
| `add-blogger-auto-post-skill` | **실제 작업 브랜치.** 사이트, 스크립트, Claude 스킬, 자동 갱신 데이터가 전부 여기 있습니다. GitHub Pages 도 이 브랜치를 서빙합니다. |
| `main` | 기본 브랜치. 축구 게임과 예약 워크플로 정의만 있습니다. GitHub 는 기본 브랜치의 워크플로만 예약 실행하므로 워크플로 파일만 여기에 두고, 각 워크플로는 작업 브랜치를 체크아웃해서 돌아갑니다. |

새 컴퓨터에서 `main` 만 받으면 작업물이 거의 보이지 않으니 반드시 작업 브랜치로 전환하세요.

## 다른 컴퓨터에서 이어서 작업하기

```bash
git clone https://github.com/richroro/roro.git
cd roro
git checkout add-blogger-auto-post-skill
```

이미 받아 둔 컴퓨터라면 작업 전에 최신 상태로 맞춥니다.
GitHub Actions 봇이 매시간 `market/data.json` 등을 커밋하므로 pull 을 먼저 하지 않으면 push 가 거부됩니다.

```bash
git checkout add-blogger-auto-post-skill
git pull origin add-blogger-auto-post-skill
```

작업이 끝나면 커밋하고 push 해야 다른 컴퓨터에서 보입니다.

```bash
git add -A
git commit -m "무엇을 바꿨는지"
git push origin add-blogger-auto-post-skill
```

Claude Code 로 작업할 때는 저장소 폴더에서 열면 `.claude/skills/` 와 `.claude/agents/` 도 함께 받아지므로 스킬이 그대로 동작합니다.

## git 에 올라가지 않는 것 (컴퓨터마다 따로 준비)

`.gitignore` 로 제외되어 있어 새 컴퓨터에서는 직접 다시 만들어야 합니다.

- `.claude/skills/blogger-auto-post/secrets/` — Google 토큰. `references/google_setup.md` 참고.
- `.claude/skills/threads-auto-post/secrets/`, `.claude/skills/sales-outreach/secrets/` — 각 `.env.example` 을 복사해서 채웁니다.
- `kakao/secrets/` — 카카오 토큰.
- `slackbot/.env` — `slackbot/.env.example` 참고.
- `*/topics.txt` — `topics.example.txt` 를 복사해서 사용.
- `portfolio/`, `shorts_output/`, 로그와 `__pycache__/`.

GitHub Actions 에서 쓰는 비밀값은 저장소 Settings → Secrets 에 저장되어 있어 컴퓨터와 무관하게 유지됩니다.

## 자동 실행 (컴퓨터 전원과 무관)

`.github/workflows/` 의 워크플로가 GitHub 서버에서 예약 실행되어 작업 브랜치에 결과를 커밋합니다.

- `update-market.yml` — 매시 5분, `market/data.json`
- `update-longterm.yml` — 하루 두 번, `longterm/data.json`
- `update-movie-boxoffice.yml` — 매일 09:20 KST, `movie-site/data.json`
- `blogger-daily.yml` — 매일 09:00 KST, 블로거 큐 발행

워크플로 파일을 고칠 때는 `main` 에 있는 사본을 바꿔야 예약에 반영됩니다.
