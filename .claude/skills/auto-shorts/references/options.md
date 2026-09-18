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
| `rate` / `pitch` | 말 속도 `"+8%"`, 피치 `"+0Hz"` | `+0%` / `+0Hz` |
| `seed` | 씬별 AI 이미지 시드·카드 색의 기준(재현성) | `7` |
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
| `mood` | `playful` `calm` `lofi` `mysterious` `epic` (합성 루프의 코드 진행도 이걸로 정함) | `playful` |
| `volume` | 나레이션 대비 BGM 크기. 0.2~0.4 권장 | `0.3` |
| `duck` | 나레이션 중 자동 감쇠(사이드체인) | `true` |
| `file` | 직접 고른 음악 파일 경로(제공자 건너뜀) | 없음 |

## `style`

| 키 | 설명 | 기본값 |
|---|---|---|
| `image_style` | 모든 AI 이미지 프롬프트 뒤에 붙는 톤 문구 | `""` |
| `transition` | `fade` `mix`(fade/smoothleft/zoomin/smoothup 순환) `smoothleft` `zoomin` `wipeleft` … `none` | `fade` |
| `transition_duration` | 전환 길이(초) | `0.4` |
| `ken_burns` | 이미지 줌/팬 모션 | `true` |
| `vignette` | 가장자리 어둡게(집중감) | `true` |
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
| `headline_size` / `headline_color` / `headline_margin_v` / `headline_seconds` | 헤드라인 크기·색·위(top)에서의 거리·표시 시간(첫 씬은 씬 전체) | `104` / `#FFFFFF` / `250` / `2.6` |
| `cta_size` / `cta_color` / `cta_seconds` | CTA 크기·색·표시 시간 | `60` / `#FFD400` / `3.0` |
| `caption_margin_h` | 자막 좌우 여백(px). 우측 버튼 열을 피하려면 100 이상 | `110` |
| `brand` / `brand_size` | 채널명·시리즈명을 영상 내내 좌상단에 작게(반투명). 채널 아이덴티티 + '반복 템플릿' 인상 완화 | `""` / `40` |

## `scenes[]`

| 키 | 설명 |
|---|---|
| `narration` | (필수) 읽을 문장 1~2개, 45자 이내 문장 |
| `headline` | 씬 상단 큰 글씨, 12자 이내 |
| `image_prompt` | AI 생성용 영어 프롬프트 |
| `keywords` | 스톡 검색용 영어 2~4단어 (없으면 프롬프트에서 추출) |
| `image` | 직접 지정한 이미지 파일 경로(제공자 건너뜀) |
| `sfx` | `riser` `boom` `pop` `ding` `whoosh` (씬 시작에 재생) |
| `motion` | `in` `out` `pan_left` `pan_right` `pan_up` `pan_down` `static` (기본: 씬 순서대로 순환) |
| `min_duration` | 씬 최소 길이(초) — 이미지를 오래 보여 주고 싶을 때 |

## `make_shorts.py` 플래그

| 플래그 | 설명 |
|---|---|
| `--out DIR` | 출력 루트 (기본 `shorts_output`) |
| `--force` | 캐시 무시, 전부 재생성(성공한 AI 이미지도 다시 만드니 신중히) |
| `--stage tts|plan|images|audio|subs|video|mix|extras` | 그 단계까지만 |
| `--offline` | 무음 나레이션 + 카드 + 합성 BGM (구성 미리보기) |
| `--tts-engine auto|edge|gtts|silent` | TTS 엔진 |
| `--image-providers a,b,c` / `--bgm-providers a,b` | 제공자 순서 덮어쓰기 |
| `--no-bgm` / `--no-sfx` | 트랙 제외 |
| `--jobs N` | 이미지 병렬 수집 수 (기본 3, 429 나면 1) |

## 길이 계산

씬 길이 = `gap_before` + 나레이션 길이 + `gap_after` (첫 씬 +0.1). 나레이션은 +8% 속도에서 **공백 포함 약 5.5자/초**.
씬 8개면 여백만 약 3.7초가 더해지므로, 55초 안에 넣으려면 **나레이션 총 220~260자** 가 안전하다.
`[plan] 총 길이` 로그가 실제 값이다.
