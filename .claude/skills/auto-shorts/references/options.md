# project.json 전체 옵션과 CLI 플래그

SKILL.md 의 예시는 자주 쓰는 것만 보여 준다. 여기가 전체 목록이다. 값이 없으면 괄호 안 기본값.

## 최상위

| 키 | 설명 | 기본값 |
|---|---|---|
| `slug` | 출력 폴더 이름(영문 소문자-하이픈) | title 에서 생성 |
| `title` | 업로드 제목. 썸네일에도 사용 | (필수) |
| `thumbnail_text` | 썸네일 전용 짧은 문구 | title |
| `lang` | `ko` / `en` / `ja` — TTS 언어 | `ko` |
| `voice` | `female` `male` `male2` `en-female` `en-male` `ja-female` `ja-male` 또는 Edge 보이스 ID | 언어별 기본 |
| `style.voice_polish` | TTS 목소리 다듬기(럼블 제거·저중역 온기·치찰음 완화·레벨 고르기·짧은 룸). 어떤 엔진에도 효과 | `true` |
| `style.voice_pitch` | 목소리 높낮이 %(-6~+6). 음수면 낮고 차분하다. 속도는 그대로 | `0` |
| `rate` / `pitch` | 말 속도 `"+8%"`, 피치 `"+0Hz"` | `+0%` / `+0Hz` |
| `seed` | 씬별 AI 이미지 시드·카드 색·합성 BGM 곡의 기준(재현성). 바꾸면 다른 곡/이미지가 나온다 | `7` |
| `cta` | 마지막 3초 상단 문구(이모지 금지) | 없음 |
| `category` | 성과 분석용 분류: `animals` `body` `space` `food` `history` `psychology` `language` `money` `science` `ranking` `whatif` `tech` … | `unknown` |
| `hook_type` | 성과 분석용: `question` `contradiction` `number` `warning` `comparison` `challenge` | 첫 문장에서 추정 |
| `bgm` | 아래 표. `false` 면 BGM 없음 | `{mood: playful}` |
| `style` | 아래 표 | |
| `scenes[]` | 아래 표 | (필수) |
| `meta.description` / `meta.hashtags[]` | meta.md 로 복사 | |

## `bgm`

| 키 | 설명 | 기본값 |
|---|---|---|
| `query` | 웹 검색어(영어 3~4단어) | mood |
| `mood` | `playful` `calm` `lofi` `mysterious` `epic` — 생성 BGM 의 편성·템포·코드 진행을 정한다 | `playful` |
| `volume` | 나레이션 대비 BGM 크기. 0.25~0.45 권장 | `0.35` |
| `duck` | 나레이션 중 자동 감쇠(사이드체인) | `true` |
| `file` | 직접 고른 음악 파일 경로(제공자 건너뜀) | 없음 |

## `style`

| 키 | 설명 | 기본값 |
|---|---|---|
| `image_source` | `photo`(무료 스톡 사진 우선) / `ai`(AI 생성 우선) / `photo_only`(사진만) / `draw`(직접 그린 일러스트만) | `photo` |
| `art_palette` | 일러스트 팔레트 고정: `night` `dawn` `dusk` `forest` `ocean` `warm`. 비우면 BGM 무드에 맞춘다 | `""` |
| `image_style` | AI 생성 프롬프트 뒤에 붙는 톤 문구(사진 검색에는 영향 없음) | `""` |
| `transition` | `fade` `mix`(fade/smoothleft/zoomin/smoothup 순환) `smoothleft` `zoomin` `wipeleft` … `none` | `fade` |
| `transition_duration` | 전환 길이(초) | `0.3` |
| `ken_burns` | 이미지 줌/팬 모션 | `true` |
| `vignette` | 가장자리 어둡게(집중감) | `true` |
| `layout` | `caption`(하단 카라오케 자막, 기본) / `quote`(씬의 `quote` 를 화면 정중앙 큰 글씨로, 하단 자막 없음) | `caption` |
| `dim` | 사진을 어둡게(0~0.6). 큰 글씨를 얹는 명언 레이아웃에서 0.3~0.4 권장 | `0` |
| `quote_size` / `quote_color` / `quote_margin_v` | 명언 글씨 크기·색·세로 위치(0=정중앙) | `74` / `#FFFFFF` / `0` |
| `author_size` / `author_color` | 출처 줄 크기·색 | `46` / `#FFD400` |
| `look` | `cinematic`(대비·채도 살짝 상승) 또는 `""` | `""` |
| `gap_before` / `gap_after` | 씬 시작→나레이션, 나레이션 끝→씬 끝 여백(초). 첫 씬은 앞에 +0.1 | `0.10` / `0.35` |
| `min_scene` | 씬 최소 길이(초) | `1.8` |
| `auto_transition_sfx` | 씬 전환마다 whoosh | `false` |
| `sfx_volume` / `transition_sfx_volume` | 효과음 크기 | `0.7` / `0.35` |
| `caption_size` | 자막 크기(px, 1080 기준) | `78` |
| `caption_color` / `highlight_color` | 자막색 / 현재 어절 강조색(`#RRGGBB`) | `#FFFFFF` / `#FFD400` |
| `outline` | 자막 외곽선 두께 | `5` |
| `caption_margin_v` | 화면 아래에서 자막까지 픽셀(1920 기준). 쇼츠 UI 를 피하려면 500 이상 | `560` |
| `max_words` / `max_chars` | 한 번에 보여 줄 어절 수 / 글자 수(초과 시 다음 덩어리로) | `4` / `16` |
| `beat_seconds` | 이 간격(초)마다 줌 펀치로 화면을 바꾼다. `0` 이면 끔 | `1.8` |
| `headline_size` / `headline_color` / `headline_margin_v` / `headline_seconds` | 헤드라인 크기·색·위(top)에서의 거리·표시 시간(첫 씬은 씬 전체) | `104` / `#FFFFFF` / `250` / `2.6` |
| `cta_size` / `cta_color` / `cta_seconds` | CTA 크기·색·표시 시간 | `60` / `#FFD400` / `3.0` |
| `caption_margin_h` | 자막 좌우 여백(px). 우측 버튼 열을 피하려면 100 이상 | `110` |
| `brand` / `brand_size` | 채널명·시리즈명을 영상 내내 좌상단에 작게(반투명). 채널 아이덴티티 + '반복 템플릿' 인상 완화 | `""` / `40` |

## `scenes[]`

| 키 | 설명 |
|---|---|
| `narration` | (필수) 읽을 문장 1~2개, 45자 이내 문장 |
| `headline` | 씬 상단 큰 글씨, 12자 이내. `beats` 가 있으면 무시된다 |
| `beats` | 씬 안에서 순서대로 뜨는 문구 배열(각 12자 이내). 씬 길이를 균등 분할해 바뀌고, 바뀔 때마다 줌 펀치가 들어간다. 2개면 약 1.8초마다 화면이 변한다 |
| `loop_back` | 마지막 씬에 `true` — 첫 씬 그림으로 닫아 반복 재생 때 이어져 보인다. 그 씬은 이미지를 따로 받지 않고 `cta` 도 빠진다 |
| `image_prompt` | 사진을 못 찾았을 때 쓰는 AI 생성용 영어 프롬프트 |
| `keywords` | **사진 검색어.** 흔한 영어 명사 2~3개. 길면 단어를 줄여가며 재시도 (없으면 프롬프트에서 추출) |
| `image` | 직접 지정한 이미지 파일 경로(제공자 건너뜀) |
| `video` | 씬에 쓸 영상 클립 경로(AI 생성 클립 등). 9:16 크롭·길이에 맞춰 반복·무음. 이미지 대신 사용 |
| `video_speed` | 클립 재생 속도(0.8 느리게 ~ 1.3 빠르게) | `1.0` |
| `art` | 일러스트 템플릿 지정: `mountain` `sunrise` `night` `ocean` `forest` `rain` `candle` `road` `city` `stairs` `bird` `tree` `door` `window` `stage` `trophy` `abstract` (미지정이면 키워드로 추정) |
| `art_palette` | 이 씬만 다른 팔레트 |
| `quote` | 화면 중앙에 크게 띄울 문장. ` / ` 로 줄을 나눈다. 이 값이 있으면 그 씬은 하단 자막 대신 명언 레이아웃 |
| `author` | 명언 출처(인물·책). 문장보다 조금 늦게 페이드인 |
| `sfx` | `riser` `boom` `pop` `ding` `whoosh` (씬 시작에 재생) |
| `emoji` | 이미지 확보 실패 시 카드에 크게 그릴 이모지(1~2개). 컬러 이모지 폰트(Noto Color Emoji / Segoe UI Emoji / Apple Color Emoji)가 있는 환경에서 렌더 |
| `motion` | `in` `out` `pan_left` `pan_right` `pan_up` `pan_down` `static` (기본: 씬 순서대로 순환) |
| `min_duration` | 씬 최소 길이(초) — 이미지를 오래 보여 주고 싶을 때 |

## `make_shorts.py` 플래그

| 플래그 | 설명 |
|---|---|
| `--out DIR` | 출력 루트 (기본 `shorts_output`) |
| `--force` | 캐시 무시, 전부 재생성(성공한 AI 이미지도 다시 만드니 신중히) |
| `--stage tts|plan|images|audio|subs|video|mix|extras` | 그 단계까지만 |
| `--offline` | 무음 나레이션 + 카드 + 합성 BGM (구성 미리보기) |
| `--tts-engine auto|edge|gtts|local|silent` | TTS 엔진. auto = edge → gtts → local 순. local 은 sherpa-onnx 오프라인(첫 실행 때 모델 다운로드) |
| `--image-providers a,b,c` / `--bgm-providers a,b` | 제공자 순서 덮어쓰기. 이미지: `pexels` `unsplash` `pixabay` `openverse` `wikimedia` `openimages` `pollinations` `picsum` `card` |
| `--no-bgm` / `--no-sfx` | 트랙 제외 |
| `--jobs N` | 이미지 병렬 수집 수 (기본 3, 429 나면 1) |

## 길이 계산

씬 길이 = `gap_before` + 나레이션 길이 + `gap_after` (첫 씬 +0.1). 나레이션은 +8% 속도에서 **공백 포함 약 5.5자/초**.
씬 8개면 여백만 약 3.7초가 더해지므로, 55초 안에 넣으려면 **나레이션 총 220~260자** 가 안전하다.
`[plan] 총 길이` 로그가 실제 값이다.
