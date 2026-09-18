# 최초 설정 (한 번만)

## A. 로컬 PC
```bash
pip install -r .claude/skills/auto-shorts/requirements.txt
# ffmpeg: Windows `winget install Gyan.FFmpeg` / Ubuntu `sudo apt-get install ffmpeg fonts-nanum`
python .claude/skills/auto-shorts/scripts/render.py --script .claude/skills/auto-shorts/queue/0001.json
```
결과 `shorts_output/<날짜>_<슬러그>/final.mp4` 를 열어 확인.

## B. YouTube 자동 업로드 (선택)
1. 구글 클라우드 콘솔에서 블로거 스킬에 쓰던 **같은 프로젝트**를 열고 *YouTube Data API v3* 를 사용 설정.
2. OAuth 동의 화면의 범위에 `.../auth/youtube.upload` 추가(테스트 사용자에 본인 계정 포함).
3. `client_secret.json` 을 `.claude/skills/auto-shorts/secrets/` 에 복사.
4. 최초 로그인:
   ```bash
   python .claude/skills/auto-shorts/scripts/auth_youtube.py
   ```
   → `secrets/youtube_token.json`, `secrets/config.json` 생성.
5. **감사(Compliance Audit)**: 프로젝트가 감사 전이면 API 업로드 영상이 비공개로 강제된다.
   콘솔 → *YouTube Data API* → *Quota / Compliance* 에서 "Audit and Quota Extension Form" 제출.
   통과 전에는 유튜브 스튜디오(폰)에서 공개 전환만 해주면 된다.
   할당량: 업로드 1건 ≈ 1,600 유닛, 기본 일 10,000 → 하루 6편까지.

## C. Slack 으로 영상 받기 (권장)
- 기존 슬랙 봇(`slackbot/.env` 의 `SLACK_BOT_TOKEN`)을 재사용. 스코프에 `files:write`, `im:write` 가 없으면
  api.slack.com → 앱 → OAuth & Permissions 에서 추가 후 **재설치**.
- `secrets/config.json` 에 `"slack_user_id": "U…"` (본인 멤버 ID).

## D. GitHub Actions 시크릿
저장소 → Settings → Secrets and variables → Actions:

| 이름 | 값 |
|---|---|
| `SLACK_BOT_TOKEN` | xoxb-… |
| `AUTO_SHORTS_CONFIG_JSON` | `secrets/config.json` 파일 내용 전체 |
| `YOUTUBE_TOKEN_JSON` | `secrets/youtube_token.json` 파일 내용 전체 (선택) |
| `ANTHROPIC_API_KEY` | 큐가 비었을 때 자동 생성용 (선택) |

수동 테스트: Actions → *Shorts Daily Render* → Run workflow → `tts=silent`, `no_upload=true` 로 먼저 돌려
Artifacts 에 mp4 가 나오는지 확인한 뒤 실제 실행.

## E. 배경음 (선택)
저작권 프리 음원(예: 유튜브 오디오 라이브러리, Pixabay Music 의 상업 이용 가능 트랙)을
`.claude/skills/auto-shorts/assets/bgm.mp3` 로 저장하면 자동 믹스된다(볼륨 0.12).
유튜브는 음원 사용 시 쇼츠 수익 50% 가 음원 비용으로 빠지므로 **무음 배경 + 나레이션만**도 선택지다.
