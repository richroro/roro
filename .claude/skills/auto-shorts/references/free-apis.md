# 무료 웹 API 안내 — 무엇이 키 없이 되고, 키를 넣으면 무엇이 좋아지나

파이프라인은 각 자원마다 **제공자 목록을 순서대로 시도**하고, 실패하면 다음으로 넘어간다.
키가 없는 제공자는 조용히 건너뛴다. 전부 실패해도 로컬 합성으로 완성된다.

## 나레이션 (TTS)

| 엔진 | 키 | 품질 | 비고 |
|---|---|---|---|
| **edge-tts** (기본) | 불필요 | 뉴럴, 매우 자연스러움 | Microsoft Edge 의 온라인 읽어주기 서비스. 단어 타이밍 제공 → 자막 강조에 사용. |
| gTTS (폴백) | 불필요 | 무난 | 구글 번역 TTS. edge 가 막혔을 때. 단어 타이밍 없음(글자 수로 추정). |
| local (폴백) | 불필요·오프라인 | 알아듣기 쉬우나 억양 단조 | sherpa-onnx + 한국어 VITS(mimic3 KSS). `pip install sherpa-onnx`, 모델은 GitHub 릴리스에서 첫 실행 때 자동 다운로드(67MB, `models/`). 숫자는 한글로 적을 것. |
| silent | — | 무음 | `--offline` 구성 확인용. |

한국어 보이스 프리셋: `female`=ko-KR-SunHiNeural(밝음, 기본) / `male`=ko-KR-InJoonNeural(차분) /
`male2`=ko-KR-HyunsuMultilingualNeural(자연스러운 남성). 전체 목록: `python scripts/tts.py --list-voices ko`.
영어 `en-female`/`en-male`, 일본어 `ja-female`/`ja-male` 도 있다.

## 씬 이미지 (기본 순서 `image_source: photo` — pexels → unsplash → pixabay → openverse → wikimedia → pollinations → card)

무료 스톡 **사진이 1순위**다. 사진이 있는 주제(동물·음식·풍경·사물·인물 실루엣)는 AI 생성보다 사진이 더 그럴듯하고
플랫폼 정책(AI 라벨·비진정성)에서도 안전하다. 사진으로 찍을 수 없는 개념(3개의 심장, 상상 장면)만 AI 생성이 맡는다.
`style.image_source` 를 `ai` 로 두면 순서가 뒤집히고, `photo_only` 면 AI 를 아예 쓰지 않는다.

| 제공자 | 키 | 무엇 | 발급 | 환경변수 | 한도/주의 | 출처 표기 |
|---|---|---|---|---|---|---|
| **Pollinations** | 불필요 (선택 토큰) | AI 생성, 프롬프트에 정확히 맞는 세로 이미지 | https://pollinations.ai | `POLLINATIONS_TOKEN` | 익명은 느리거나 429 가능. 한 장 10~60초. | 불필요 |
| Pexels | 필요(무료) | 고품질 스톡 사진 | https://www.pexels.com/api/ | `PEXELS_API_KEY` | 200회/시간 | 권장(자동으로 meta.md 에 기록) |
| Unsplash | 필요(무료) | 고품질 스톡 사진 | https://unsplash.com/developers | `UNSPLASH_ACCESS_KEY` | 50회/시간(데모 앱) | 필요(자동 기록) |
| Pixabay | 필요(무료) | 스톡 사진 | https://pixabay.com/api/docs/ | `PIXABAY_API_KEY` | 100회/분 | 불필요 |
| Openverse | 불필요 | CC 이미지 메타검색 | https://api.openverse.org | — | 익명 소량(하루 100 요청 안팎) | **필요**(자동 기록) |
| Wikimedia Commons | 불필요 | 실존 동물·역사·장소 사진 | — | — | 예의상 요청 간격 유지 | **필요**(자동 기록) |
| **Open Images** | 불필요 | 플리커 CC BY 2.0 사진 은행(사람이 검수한 라벨 7천여 종) | — | — | 첫 사용 때 색인 생성(CSV 수십 MB 다운로드 후 삭제, 색인 약 40MB). `AUTO_SHORTS_OPENIMAGES=0` 으로 끔 | **필요**(자동 기록) |
| picsum | 불필요 | 무작위 사진(주제 무관) | — | — | `--image-providers` 로 명시할 때만 | 불필요 |
| card | — | 로컬 그라디언트 카드 | — | — | 항상 성공 | 불필요 |

- **Pexels 키 하나면 체감 품질이 가장 크게 오른다**(무료·2분·200회/시간). 없으면 Openverse·Wikimedia 만 남아
  적중률이 떨어지고 카드 폴백이 늘어난다.
- 검색어(`keywords`)는 흔한 영어 명사 2~3개. 파이프라인이 `portrait` 우선 → 전체, 긴 검색어 → 짧은 검색어 순으로
  재시도하고, 해상도 640px 미만·화면비 2.4:1 초과 이미지는 걸러 낸다. 한 영상 안에서 같은 사진은 다시 쓰지 않는다
  (여러 씬을 동시에 수집하므로 고르는 순간 원자적으로 선점한다). 가로 사진을 9:16 으로 자를 때는 가운데가 아니라
  **가장자리 검출 에너지가 큰 쪽**을 남긴다 — 하늘·테이블 같은 밋밋한 면만 남아 켄 번즈 확대에서 단색 화면이 되는 걸 막는다.
- `style.image_style` 은 Pollinations 프롬프트에만 붙고, 스톡 검색에는 `keywords` 만 쓴다.
- 연결이 막힌 제공자는 한 번 실패하면 그 실행 동안 건너뛴다(회사망·프록시 환경에서 빠르게 폴백).
- 코드를 고친 뒤에는 `python scripts/selftest_providers.py` 로 제공자들의 파싱·다운로드·정규화 경로를
  네트워크 없이 확인할 수 있다.

### Open Images 사진 은행 (`scripts/openimages.py`)

구글 Open Images 는 플리커의 **CC BY 2.0 사진**을 사람이 검수한 라벨과 함께 공개한다. 스톡 키가 없거나
Openverse·위키미디어가 막힌 환경에서도 실사 사진을 쓸 수 있는 마지막 보루다.

```bash
python scripts/openimages.py --build                     # 색인 만들기(validation, 약 40MB)
python scripts/openimages.py --build --sets validation,test   # 사진 2배(색인 약 90MB)
python scripts/openimages.py --find "bee flower"         # 어떤 분류·사진이 잡히는지 확인
```

- 사진 선택은 **분류(사람이 검수한 라벨) + 사진 제목**을 함께 본다. 분류만 보면 "medicine" 같은 넓은 분류에서
  주제와 어긋난 사진이 걸리고, 제목만 보면 "Honey Garlic Sauce"(치킨) 같은 게 걸리기 때문이다.
- 분류에 없는 개념(예: '결정화된 꿀')은 적중률이 떨어진다. 그런 씬은 Pexels 키나 AI 생성이 낫다.
- **CC BY 2.0 은 저작자 표시가 필수**다. `meta.md` 의 출처 표기를 업로드 설명란에 그대로 넣는다.

## 배경음악 (기본 순서: jamendo → freesound → openverse → synth)

| 제공자 | 키 | 무엇 | 발급 | 환경변수 | 출처 표기 |
|---|---|---|---|---|---|
| Jamendo | 필요(무료) | CC 인스트루멘털 음악, 검색 품질 좋음 | https://devportal.jamendo.com/ | `JAMENDO_CLIENT_ID` | 필요(자동 기록) |
| Freesound | 필요(무료) | CC0/CC-BY 루프·음악·효과음(HQ 미리듣기 사용) | https://freesound.org/apiv2/apply/ | `FREESOUND_API_KEY` | CC-BY 면 필요(자동 기록) |
| Openverse | 불필요 | Jamendo/Freesound 모아 검색 | — | — | 필요(자동 기록) |
| synth | — | numpy 시퀀서(드럼·베이스·일렉피아노 코드·멜로디·리버브, 무드 5종, seed 마다 다른 곡). numpy 가 없으면 ffmpeg 앰비언트 루프 | — | — | 불필요 |

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
