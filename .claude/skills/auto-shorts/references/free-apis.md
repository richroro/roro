# 무료 웹 API 안내 — 무엇이 키 없이 되고, 키를 넣으면 무엇이 좋아지나

파이프라인은 각 자원마다 **제공자 목록을 순서대로 시도**하고, 실패하면 다음으로 넘어간다.
키가 없는 제공자는 조용히 건너뛴다. 전부 실패해도 로컬 합성으로 완성된다.

## 나레이션 (TTS)

| 엔진 | 키 | 품질 | 비고 |
|---|---|---|---|
| **edge-tts** (기본) | 불필요 | 뉴럴, 매우 자연스러움 | Microsoft Edge 의 온라인 읽어주기 서비스. 단어 타이밍 제공 → 자막 강조에 사용. |
| gTTS (폴백) | 불필요 | 기계음 느낌 | 구글 번역 TTS. edge 가 막혔을 때만. 단어 타이밍 없음(글자 수로 추정). |
| silent | — | 무음 | `--offline` 구성 확인용. |

한국어 보이스 프리셋: `female`=ko-KR-SunHiNeural(밝음, 기본) / `male`=ko-KR-InJoonNeural(차분) /
`male2`=ko-KR-HyunsuMultilingualNeural(자연스러운 남성). 전체 목록: `python scripts/tts.py --list-voices ko`.
영어 `en-female`/`en-male`, 일본어 `ja-female`/`ja-male` 도 있다.

## 씬 이미지 (기본 순서: pollinations → pexels → unsplash → pixabay → openverse → wikimedia → card)

| 제공자 | 키 | 무엇 | 발급 | 환경변수 | 한도/주의 | 출처 표기 |
|---|---|---|---|---|---|---|
| **Pollinations** | 불필요 (선택 토큰) | AI 생성, 프롬프트에 정확히 맞는 세로 이미지 | https://pollinations.ai | `POLLINATIONS_TOKEN` | 익명은 느리거나 429 가능. 한 장 10~60초. | 불필요 |
| Pexels | 필요(무료) | 고품질 스톡 사진 | https://www.pexels.com/api/ | `PEXELS_API_KEY` | 200회/시간 | 권장(자동으로 meta.md 에 기록) |
| Unsplash | 필요(무료) | 고품질 스톡 사진 | https://unsplash.com/developers | `UNSPLASH_ACCESS_KEY` | 50회/시간(데모 앱) | 필요(자동 기록) |
| Pixabay | 필요(무료) | 스톡 사진 | https://pixabay.com/api/docs/ | `PIXABAY_API_KEY` | 100회/분 | 불필요 |
| Openverse | 불필요 | CC 이미지 메타검색 | https://api.openverse.org | — | 익명 소량(하루 100 요청 안팎) | **필요**(자동 기록) |
| Wikimedia Commons | 불필요 | 실존 동물·역사·장소 사진 | — | — | 예의상 요청 간격 유지 | **필요**(자동 기록) |
| picsum | 불필요 | 무작위 사진(주제 무관) | — | — | `--image-providers` 로 명시할 때만 | 불필요 |
| card | — | 로컬 그라디언트 카드 | — | — | 항상 성공 | 불필요 |

- AI 생성(Pollinations)이 1순위인 이유: 스톡은 "문어 심장 세 개"를 못 찾지만 생성은 그린다. 다만
  글자·손·실존 인물은 잘 못 그리니 프롬프트에서 요구하지 않는다.
- 스톡 키를 하나라도 넣으면, 생성이 실패한 씬을 실사 사진으로 메꿔 준다. **Pexels 하나만 발급해도 충분**.
- `style.image_style` 은 Pollinations 프롬프트에만 붙고, 스톡 검색에는 `keywords` 만 쓴다.

## 배경음악 (기본 순서: jamendo → freesound → openverse → synth)

| 제공자 | 키 | 무엇 | 발급 | 환경변수 | 출처 표기 |
|---|---|---|---|---|---|
| Jamendo | 필요(무료) | CC 인스트루멘털 음악, 검색 품질 좋음 | https://devportal.jamendo.com/ | `JAMENDO_CLIENT_ID` | 필요(자동 기록) |
| Freesound | 필요(무료) | CC0/CC-BY 루프·음악·효과음(HQ 미리듣기 사용) | https://freesound.org/apiv2/apply/ | `FREESOUND_API_KEY` | CC-BY 면 필요(자동 기록) |
| Openverse | 불필요 | Jamendo/Freesound 모아 검색 | — | — | 필요(자동 기록) |
| synth | — | ffmpeg 로 합성한 코드 패드+아르페지오 루프(무드 5종) | — | — | 불필요 |

- BGM 은 `loudnorm(-20 LUFS)` 로 맞춘 뒤 `bgm.volume` 을 곱하고, 나레이션이 나올 때 자동으로 약 8dB 줄인다.
- 효과음은 기본 로컬 합성(whoosh/pop/ding/riser/boom). `FREESOUND_API_KEY` 가 있으면
  `python scripts/fetch_audio.py sfx --name whoosh --provider freesound --out work/sfx_whoosh.wav` 로 교체 가능.

## 트렌드·잘나가는 쇼츠 데이터 (`scripts/research_trends.py`)

| 소스 | 키 | 무엇 | 비고 |
|---|---|---|---|
| Google Trends RSS `trends.google.com/trending/rss?geo=KR` | 불필요 | 오늘 급상승 검색어 + 트래픽 + 뉴스 제목 | `pytrends` 는 2025-04 아카이브됨 — 쓰지 않는다 |
| Wikimedia Pageviews `wikimedia.org/api/rest_v1/metrics/pageviews/top/ko.wikipedia/all-access/YYYY/MM/DD` | 불필요 | 어제 많이 본 한국어 위키 문서 1000개 | 집계는 UTC 자정 후 몇 시간 뒤 확정 |
| Reddit `reddit.com/r/<sub>/top.json?t=week` | 불필요 | r/todayilearned 등 주간 인기 사실 | 설명적 User-Agent 필수, 과하면 429 |
| YouTube 채널 RSS `youtube.com/feeds/videos.xml?channel_id=UC…` | 불필요 | 관찰 채널 최신 15편 + 조회수 → 시간당 조회수 | `trends/watchlist.txt` 에 채널 ID를 적는다 |
| YouTube Data API v3 | 무료 키 `YOUTUBE_API_KEY` | 인기 급상승(1유닛) + 키워드 쇼츠 검색(100유닛/페이지) | 하루 10,000유닛. `videoDuration=short` 는 '4분 미만'이라 길이로 다시 거른다 |
| Naver DataLab 검색어 트렌드 | 무료 키(네이버 개발자) | 내가 준 키워드의 상대 추이(발굴 아님, 검증용) | 하루 1,000회 — 후속 확장 후보 |
| Hacker News `hacker-news.firebaseio.com/v0/beststories.json` | 불필요 | 영어 과학·기술 화제 | 후속 확장 후보 |

**Threads**: 공개 트렌드/검색 API 가 없다. 키워드 검색(`graph.threads.net/v1.0/keyword_search`)은 Meta 앱 + 사용자 토큰 +
`threads_keyword_search` 권한(앱 검토 필요)이 있어야 한다. 그래서 트렌드 조사 스크립트는 Threads 를 읽지 않고,
Threads 는 **훅 테스트·확산 채널**로 쓴다(`references/playbook.md` 의 Threads 절). 영상 게시 제한: 5분·1GB·H.264/AAC,
본문 500자, 첨부 텍스트 10,000자. 본문에 외부 링크를 넣으면 노출이 크게 줄므로 링크는 첫 답글에.

## 키 설정 방법

1. `.claude/skills/auto-shorts/.env.example` 을 `.env` 로 복사하고 값을 채운다 (git 에 안 올라감).
2. 또는 환경변수: Windows PowerShell `setx PEXELS_API_KEY "..."`(새 터미널부터 적용), macOS/Linux `export PEXELS_API_KEY=...`.
3. `python scripts/check_env.py` 로 인식됐는지 확인.

## 프록시·차단 환경

회사망 등에서 특정 호스트가 막히면 그 제공자만 건너뛴다. `check_env.py` 의 `[network]` 항목으로 어디가
막혔는지 보고, edge-tts 까지 막혔으면 `--tts-engine gtts`, 전부 막혔으면 `--offline` 으로 구성만 확인한다.
