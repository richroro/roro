---
name: auto-shorts
description: 얼굴·촬영·유료 AI 영상툴 없이 대본 JSON → 한국어 TTS → 큰 글씨 카드 세로 영상(1080x1920)을 완전 자동으로 만들고, 유튜브 쇼츠에 API 업로드 + 틱톡/네이버 클립/릴스용 mp4·캡션을 Slack DM 으로 보낸다. GitHub Actions 로 매일 무인 실행. "쇼츠 자동으로 만들어줘", "틱톡/클립 영상 자동화", "숏폼 매일 올라가게", "쇼츠 대본 큐 채워줘", "페이스리스 쇼츠" 같은 요청에 사용한다.
---

# 자동 쇼츠 공장 (auto-shorts)

`부자되자` 채널용 **정보형 페이스리스 쇼츠**를 대본만으로 만든다. 한 편 = 훅 1 + 본문 7 + CTA 1
장면, 60~75초. 카드(큰 글씨) + 나레이션(TTS) + 하단 자막 + 진행 바 + 살짝 줌인.
`ai-video-shorts` 스킬(Seedance/Higgsfield 프롬프트 방식)과 달리 사람 손이 **0** 이다.

```
대본 JSON(queue/) ─► render.py ─► final.mp4 + cover.png + captions.srt + caption.txt
                                    ├─► upload_youtube.py (YouTube Data API, 선택)
                                    └─► Slack DM 으로 mp4 전송 → 폰에서 틱톡/클립/릴스 업로드
```

## 언제 이 스킬을 쓰는가
- "쇼츠 대본 써서 큐에 넣어줘" / "일주일치 쇼츠 만들어줘" — **가장 흔한 경로**. Claude 가 대본을 쓰고 `add_to_queue.py` 로 넣는다.
- "지금 한 편 만들어줘" — `render.py` 로 즉시 렌더 (→ 유튜브 업로드는 `daily_shorts.py` 또는 `upload_youtube.py`).
- "매일 자동으로 올라가게" — GitHub Actions `shorts-daily.yml` (아래 무인 스케줄).
- "쇼츠 상태 봐줘" — `status.py`.

## 대본 작성 규칙 (Claude 가 직접 쓴다 — generate.py 는 무인 폴백 전용)

파일 하나 = 영상 한 편. 형식:

```json
{
  "title": "월급날 5분 루틴으로 통장이 달라집니다",
  "hook": "월급 받고 3일이면 통장이 비는 사람, 이 5분 루틴만 하세요",
  "scenes": [
    {"caption": "1. 고정비 통장으로\n먼저 보내기", "narration": "먼저 월세, 통신비, 보험료 같은 고정비를 전용 통장으로 바로 옮깁니다."},
    ...  (7개)
  ],
  "cta": "저장해두고 다음 월급날 실행\n팔로우하면 다음 편 알림",
  "description": "플랫폼 캡션 1~2문장",
  "hashtags": ["#재테크", "#월급관리", "#부자되자"],
  "theme": "navy"        // navy | green | charcoal | purple
}
```

- **hook**: 25자 내외, 첫 3초에 멈추게. 과장·낚시·허위 수치 금지.
- **caption**: 최대 2줄(`\n`), 한 줄 14자 내외. 이모지 넣지 말 것(폰트에 없음).
- **narration**: 구어체 1~2문장 35~45자. caption 을 그대로 읽지 말고 살을 붙인다.
- **총 나레이션 300~340자** → 60초 이상. **틱톡 크리에이터 리워드는 1분 이상 영상만 집계**된다.
- 검증 안 된 금리·통계·법령 수치를 지어내지 않는다. 특정 금융상품·회사 추천 금지.
- 해시태그 6개, `#부자되자` 포함. 블로그(`blog-manager`)와 주제를 맞추면 유입이 겹쳐 유리하다.
- 잘 되는 주제는 `data/posted_log.json` 과 플랫폼 분석(조회수·시청유지)을 보고 늘린다.

큐에 넣기:
```bash
python .claude/skills/auto-shorts/scripts/add_to_queue.py --file /tmp/script.json
python .claude/skills/auto-shorts/scripts/add_to_queue.py --dir /tmp/scripts/     # 여러 편
```

## 즉시 렌더 / 미리보기

```bash
pip install -r .claude/skills/auto-shorts/requirements.txt      # 최초 1회
python .claude/skills/auto-shorts/scripts/render.py --script .claude/skills/auto-shorts/queue/0001.json
# 오프라인/네트워크 차단 환경 테스트: --tts silent
# 배경음: assets/bgm.mp3 를 두면 자동 믹스(볼륨 0.12). 저작권 프리 음원만 사용할 것.
```

결과는 `shorts_output/<날짜>_<슬러그>/` (git 미추적). 요구사항: ffmpeg, 한글 폰트
(Ubuntu `apt-get install fonts-nanum`, Windows 는 맑은고딕 자동 탐지), pillow, edge-tts.

## 무인 스케줄 (GitHub Actions)

`.github/workflows/shorts-daily.yml` 이 **매일 18:00 KST** 에 `daily_shorts.py` 를 돌린다
(숏폼은 퇴근 시간대 업로드가 유리). 흐름: 큐 맨 앞 대본 → 렌더 → 유튜브 업로드(토큰 있으면)
→ Slack DM 으로 mp4 + 캡션 → 대본을 `queue/posted/` 로 이동 → 커밋. 큐가 2편 이하로 남으면
Slack 으로 리필 요청이 온다. 큐가 비고 `ANTHROPIC_API_KEY` 가 있으면 `topics.txt` 로 즉석 생성.

필요한 GitHub Secrets (`references/setup.md` 에 발급 절차):

| 시크릿 | 용도 | 필수 |
|---|---|---|
| `SLACK_BOT_TOKEN` | 영상/알림 DM (스코프: chat:write, files:write, im:write) | 권장 |
| `AUTO_SHORTS_CONFIG_JSON` | `{"slack_user_id": "U…", "youtube": {"privacy": "public"}}` | 권장 |
| `YOUTUBE_TOKEN_JSON` | `auth_youtube.py` 가 만든 `secrets/youtube_token.json` 내용 | 선택 |
| `ANTHROPIC_API_KEY` | 큐가 비었을 때 대본 즉석 생성 | 선택 |

시크릿이 하나도 없어도 렌더는 되고, 결과 mp4 는 워크플로 **Artifacts** 에 7일간 남는다.

## 플랫폼별 업로드 현실 (2026-09 조사)

| 플랫폼 | 자동 업로드 | 이 스킬의 처리 |
|---|---|---|
| YouTube Shorts | Data API 가능. 단 **API 프로젝트 감사 전엔 비공개 강제** | 업로드 후 Slack 에 링크 → 스튜디오에서 공개 전환(감사 통과 전) |
| TikTok | Content Posting API 는 **감사 전 비공개 전용**, 승인 수 주 | mp4+캡션을 Slack 으로 → 폰에서 업로드 |
| Naver Clip | 공개 업로드 API 없음 | 동일 |
| Instagram Reels | 비즈니스 계정 + 공개 URL 필요 | 동일 |

한 편을 4개 플랫폼에 올리는 데 폰으로 4~5분. 수익 조건·로드맵은
`references/monetization_2026.md`, 업로드 체크리스트는 `references/upload_checklist.md`.

## 스크립트 요약

| 스크립트 | 역할 |
|---|---|
| `render.py` | 대본 JSON → mp4/cover/srt/caption (`--tts silent` 로 오프라인 테스트) |
| `add_to_queue.py` | 대본 검증 후 `queue/NNNN.json` 으로 저장 |
| `daily_shorts.py` | 무인 1회 실행: 큐 → 렌더 → 유튜브 → Slack → posted/ 이동 (`--dry-run`, `--no-upload`, `--count`) |
| `upload_youtube.py` | mp4 를 유튜브에 업로드 (단독 사용 가능) |
| `auth_youtube.py` | 최초 1회 유튜브 OAuth (브라우저) |
| `generate.py` | 주제 → 대본 JSON (Anthropic API, 무인 폴백) |
| `status.py` | 큐/발행/설정 상태 |

## 하지 말 것
- 저작권 음원·타인 영상·실존 인물 이미지를 넣지 않는다 (assets/bgm.mp3 는 저작권 프리만).
- "월 ○○○만원 보장" 같은 수익 과장, 특정 종목·상품 매수 권유 문구를 넣지 않는다.
- `secrets/` 와 `shorts_output/` 을 커밋하지 않는다 (.gitignore 등록됨).
