---
name: auto-shorts
description: 주제 하나로 유튜브 쇼츠·릴스·틱톡용 9:16 세로 영상(mp4)을 끝까지 자동 제작한다 — 재미있는 주제·훅 있는 대본 → 무료 TTS 나레이션(edge-tts) → 무료 웹 API 이미지(Pollinations AI 생성, Pexels/Openverse/위키미디어) → 무료 BGM·효과음 → 읽는 단어가 강조되는 자막 → ffmpeg 렌더 → final.mp4. "쇼츠 만들어줘", "숏폼/릴스/틱톡 영상 자동으로", "TTS 나레이션 영상", "AI로 1분 영상", "재미있는 사실 영상 뽑아줘", "음성 읽어주는 세로 영상"처럼 짧은 세로 영상을 실제 파일로 만들어 달라는 요청이면 사용자가 스킬이나 도구 이름을 말하지 않아도 반드시 이 스킬을 쓴다. (웹캠 촬영은 make-shorts, Seedance/Higgsfield용 프롬프트 패키지는 ai-video-shorts 가 담당.)
---

# auto-shorts — 주제 하나로 완성 쇼츠 mp4 만들기

Claude 가 **주제를 고르고 대본을 쓴 뒤**, 번들 스크립트가 나머지를 전부 자동으로 처리한다:

```
project.json ─▶ TTS(edge-tts, 단어 타이밍) ─▶ 씬 이미지(무료 API) ─▶ BGM/SFX ─▶ 자막(ASS)
             ─▶ 켄 번즈 클립 → 크로스페이드 → 자막 번인 ─▶ 덕킹 믹스 + 라우드니스 ─▶ final.mp4
```

산출물: `final.mp4`(1080x1920, 30fps, H.264/AAC), `thumbnail.jpg`, `preview.jpg`(검수용 프레임 그리드),
`meta.md`(제목·설명·해시태그·출처 표기). 모든 외부 자원은 **무료·키 불필요**가 기본이고, 키를 넣으면
품질 좋은 스톡/음악 제공자가 앞순위로 추가된다. 전부 막혀도 로컬 합성(그라디언트 카드·합성 BGM)으로
**절대 실패하지 않는다.**

## 0단계. 환경 준비 (프로젝트당 한 번)

```bash
pip install -r .claude/skills/auto-shorts/requirements.txt
python .claude/skills/auto-shorts/scripts/check_env.py          # 문제 있으면 ✗ 줄의 안내대로
```

- ffmpeg 는 시스템에 없어도 된다 — `imageio-ffmpeg` 가 정적 바이너리를 제공한다(자동 인식).
- 결과의 `✗` 는 고쳐야 하는 것, `!` 는 막힌 네트워크 호스트(폴백으로 진행 가능)다.
- API 키는 전부 선택. 있으면 `.claude/skills/auto-shorts/.env`(`.env.example` 참고)에 넣는다.
  어떤 키가 무엇을 좋게 하는지는 `references/free-apis.md`.
- `check_env.py` 가 실패한 항목이 있어도 **폴백으로 진행 가능**하면 제작을 멈추지 말고 결과에 알려 준다.

## 1단계. 주제·컨셉 (재미가 먼저, 트렌드 반영)

쇼츠는 첫 2초에 스크롤을 멈추게 해야 한다. 그래서 주제 자체가 "어? 진짜?" 소리가 나야 한다.

주제를 고르기 전에 세 가지를 읽는다(있는 것만, 각 1분):
1. `references/playbook.md` — 잘나가는 쇼츠를 분석해 정리한 현재 공식(훅·구조·자막·주제 트렌드). 기본값의 근거.
2. `trends/latest.md` — 이번 주 급상승 검색어·위키 인기 문서·Reddit 사실·(키 있으면) 잘나가는 쇼츠 제목.
   없거나 8일 넘게 오래됐으면 `python .claude/skills/auto-shorts/scripts/research_trends.py` 를 먼저 돌린다
   (네트워크가 막혀 있으면 건너뛴다).
3. `python .claude/skills/auto-shorts/scripts/report.py` — 우리가 올린 편들 중 무엇이 잘 됐는지(기록이 있을 때만).

- 사용자가 주제를 줬으면 그대로 간다. 막연하면("재미있는 거 아무거나") **`references/script-writing.md` 의
  카테고리에서 구체 후보 3개를 훅 문장까지 붙여 제안**하고 하나 고르게 한다(질문 도구가 있으면 그걸로,
  없으면 채팅으로). 질문은 이 한 번뿐. 답을 받을 수 없는 자율 실행 상황이면 가장 반전이 큰 후보로 바로
  진행하고 결과에 그렇게 골랐다고 적는다.
- 길이·톤 기본값: **45~55초, 씬 6~9개, 밝고 빠른 정보성 톤, 한국어, 여성 보이스 +8%**.
  사용자가 다르게 말한 것만 바꾼다.
- 사실이 애매한 주제는 피한다. 검증 안 된 수치를 지어내지 말고, 널리 알려진 사실만 쓰거나
  "~로 알려져 있어요"로 완충한다.

## 2단계. project.json 작성 — 결과 품질의 80% 는 여기서 결정된다

`shorts_output/<slug>/project.json` 에 Write 로 직접 쓴다. 뼈대는 `project.example.json`,
대본 작법은 `references/script-writing.md` 를 **먼저 읽고** 쓴다. (아래 `//` 주석은 설명용이다 —
실제 파일은 주석 없는 순수 JSON 이어야 한다.)

```jsonc
{
  "slug": "octopus-three-hearts",          // 영문 소문자-하이픈. 출력 폴더 이름
  "title": "문어는 심장이 3개다?!",           // 업로드 제목 = 훅. 썸네일에도 들어감
  "thumbnail_text": "심장이 3개?!",          // (선택) 썸네일용 더 짧은 문구
  "lang": "ko", "voice": "female", "rate": "+8%",   // voice: female|male|male2|<edge 보이스 ID>
  "style": {
    "image_style": "cinematic photo, dramatic lighting, vertical 9:16, no text",  // 모든 이미지 톤 통일
    "transition": "mix",                    // fade | mix | smoothleft | zoomin | none
    "auto_transition_sfx": false,           // true 면 씬 전환마다 whoosh (과하면 촌스러움)
    "vignette": true
  },
  "bgm": { "query": "playful curious ukulele", "mood": "playful", "volume": 0.3 },  // mood: playful|calm|lofi|mysterious|epic
  "cta": "더 신기한 사실은 구독",            // 마지막 3초 상단 문구 (이모지 금지)
  "scenes": [
    { "narration": "문어 심장이 몇 개인지 아세요? 놀라지 마세요, 세 개입니다.",   // 씬당 1~2문장
      "headline": "심장이 3개?!",             // (선택) 씬 상단 큰 글씨, 12자 이내
      "keywords": "octopus underwater",       // 스톡 검색용 영어 2~4단어
      "image_prompt": "a giant pacific octopus hovering in deep blue water, glowing eyes, close-up",  // AI 생성용
      "sfx": "riser" }                        // (선택) riser|boom|pop|ding|whoosh
  ],
  "meta": { "description": "업로드 설명", "hashtags": ["문어", "신기한사실", "shorts"] }
}
```

씬에 `"image": "경로"` 를 주면 그 파일을 쓰고, `"min_duration": 4` 로 최소 길이를 강제할 수 있다.
`bgm` 에 `"file": "경로"` 를 주면 직접 고른 음악을 쓴다. 자막 크기·여백, 씬별 모션, 여백 시간 같은 고급 옵션과
성과 분석용 `category`/`hook_type` 은 `references/options.md` 에 있다 — 품질을 더 조이고 싶을 때 읽는다.

**대본 체크리스트 (쓰고 나서 반드시 스스로 검사)**
- 첫 씬 첫 문장이 질문·반전·숫자 중 하나로 시작하는 훅인가? 제목과 같은 궁금증인가?
- 나레이션 총 글자 수 **220~260자**(공백 포함)면 여백 포함 45~55초. 씬마다 약 0.45초 여백이 붙으므로
  280자를 넘기면 60초를 넘길 수 있다(`references/options.md` 의 길이 계산 참고).
- 한 문장 45자 이내, 구어체, 같은 종결어미 3번 연속 금지(~요/~죠/~입니다 섞기).
- 씬마다 새 정보 하나. 마지막 씬은 반전이나 여운 있는 질문으로 끝내고, 구독 유도는 `cta` 에만.
- 헤드라인은 훅 씬 + 핵심 반전 씬 2~3개에만. 효과음은 2~4개만(riser=훅, boom=반전, pop=가벼운 강조, ding=정답).
- 이미지 프롬프트는 영어, `피사체 + 행동/구도 + 배경 + 조명`, 씬마다 구도를 바꾼다(클로즈업↔와이드).
  실존 인물 얼굴·브랜드 로고·저작권 캐릭터·글자 포함 요청은 하지 않는다.
- 자막에 들어가는 모든 문구(narration/headline/cta)에 이모지 없음 — 자막 폰트에 없어 깨진다.

## 3단계. 렌더

```bash
python .claude/skills/auto-shorts/scripts/make_shorts.py shorts_output/<slug>/project.json --out shorts_output
```

- 보통 2~5분 걸린다(AI 이미지 생성이 대부분, 씬당 10~60초). 단계별 산출물은 `shorts_output/<slug>/work/` 에 캐시되어
  **다시 실행하면 바뀐 것만 다시 만든다** — 대본 한 줄만 고치면 그 씬의 TTS·클립만 재생성된다.
- 유용한 옵션: `--offline`(네트워크 없이 무음·카드로 구성 미리보기), `--force`(전부 재생성),
  `--image-providers pollinations,pexels,card`, `--bgm-providers jamendo,synth`, `--no-bgm`, `--no-sfx`,
  `--tts-engine gtts`, `--stage images`(그 단계까지만).
- 로그의 `[images] 완료: 1:pollinations, 2:card …` 줄로 어떤 제공자가 쓰였는지 본다. `card` 가
  섞여 있으면 그 씬은 이미지 확보에 실패한 것 — 4단계에서 처리.

## 4단계. 검수 (반드시 눈으로)

1. `shorts_output/<slug>/preview.jpg` 를 **Read 로 열어** 12장 프레임을 본다(★ 표시 타일은 헤드라인·CTA 가
   떠 있는 순간): 자막이 잘리거나 UI 안전영역(하단 20%·우측 15%)에 걸치는지, 이미지가 주제와 맞는지,
   헤드라인이 캡션과 겹치는지. 특정 순간을 더 보려면
   `ffmpeg -ss 12.5 -i final.mp4 -frames:v 1 frame.jpg`.
2. `meta.md` 의 길이가 60초 이내인지, 출처 표기가 필요한 자료(CC)가 있는지 본다.
3. 문제가 있으면 `project.json` 만 고치고 다시 렌더한다:
   - 이미지가 엉뚱함 → 그 씬의 `image_prompt`/`keywords` 를 더 구체적으로 고치고 재실행(그 씬만 다시 만든다).
     `card` 로 떨어진 씬도 같은 방법으로. `--force` 는 성공한 AI 이미지까지 전부 다시 만드니 쓰지 않는다.
   - 60초 초과 → 문장 줄이기 또는 `rate` 를 `+12%` 로.
   - 자막 줄바꿈이 어색 → 문장을 짧게 끊거나 `style.max_chars`(기본 16) 조정.
   - BGM 이 큼/작음 → `bgm.volume`(0.2~0.4).

## 5단계. 전달

사용자에게 알린다: `final.mp4` 경로, 길이, 사용한 보이스·이미지 제공자, `meta.md` 의 제목/설명/해시태그,
출처 표기가 필요한지 여부, 그리고 `thumbnail.jpg`. 이어서 만들 만한 후속 주제 1~2개를 짧게 제안한다
(먼저 만들지는 않는다).

## 업그레이드 루프 — 계속 좋아지게 하는 법

이 스킬은 한 번 만들고 끝이 아니라, 아래 루프로 스스로 갱신되도록 설계돼 있다.

| 언제 | 무엇을 | 도구 |
|---|---|---|
| 매주(자동) | 트렌드 브리핑 갱신 → `trends/latest.md` | GitHub Actions `auto-shorts weekly trends` (수동: `scripts/research_trends.py`) |
| 편을 만들 때 | 플레이북·브리핑·리포트를 읽고 주제/훅 결정 | 1단계 |
| 업로드 후 2일·7일 | 성과 기록 (조회수·평균 시청률·시청 vs 스와이프) | `python scripts/log_result.py --slug <slug> --views N --avg-view-pct P` |
| 5편 이상 쌓이면 | 무엇이 잘 되는지 보고 기본값 조정 | `python scripts/report.py` → 제안이 반복되면 플레이북·기본값 갱신 |
| 분기마다 / 요청 시 | 잘나가는 쇼츠 웹 재조사 → 플레이북 갱신 | `references/research-protocol.md` 절차 |

사용자가 "성과 알려줄게", "조회수 N 나왔어"라고 하면 `log_result.py` 로 기록하고, "요즘 뭐가 잘 되는지 분석해서
업그레이드해줘"라고 하면 `research-protocol.md` 를 따른다. 기본값을 바꿀 때는 근거를 `playbook.md` 의 업데이트
기록에 남긴다 — 다음 세션이 왜 바뀌었는지 알 수 있어야 계속 좋아진다.

## 품질·저작권 기준

- **품질**: AI 이미지는 씬마다 다른 구도, 한 영상 안에서는 `image_style` 로 톤 통일. 켄 번즈 방향이 씬마다
  자동으로 바뀌고(줌인/아웃/팬), 전환은 0.4초. 자막은 78px Pretendard ExtraBold, 현재 어절만 노랑 강조.
  BGM 은 나레이션에 맞춰 자동 덕킹, 최종 2패스 loudnorm 으로 -14 LUFS(유튜브 기준)에 맞춘다.
- **저작권**: Pollinations 생성 이미지·합성 BGM/SFX 는 출처 표기 불필요. Openverse/위키미디어/Jamendo/
  Freesound 자료는 CC 라이선스라 `meta.md` 의 출처 표기를 설명란에 넣으라고 안내한다.
  실존 인물·브랜드·타인의 음원은 쓰지 않는다.
- **사실성**: 확실하지 않은 수치는 쓰지 않는다. 의학·법률·투자 조언처럼 보이는 단정은 피한다.

## 더 읽을 것

- `references/playbook.md` — 2026 잘나가는 쇼츠 분석 결과: 근거 있는 훅·구조·자막·사운드·주제 규칙 (기본값의 출처)
- `references/script-writing.md` — 재미있는 주제 카테고리 30여 개, 훅 공식, 씬 구조, 이미지 프롬프트 요령
- `references/research-protocol.md` — 잘나가는 쇼츠를 다시 조사해 플레이북을 갱신하는 절차
- `references/free-apis.md` — 제공자별 키 발급·환경변수·한도·라이선스·폴백 순서
- `references/options.md` — project.json 전체 키(자막 크기·여백·모션·여백 시간 등 고급 옵션)와 CLI 플래그, 길이 계산
- `references/troubleshooting.md` — edge-tts 403, Pollinations 429, ffmpeg 필터 없음, Windows 경로 등
- `scripts/` 의 각 파일 상단 docstring — 단계별 단독 실행법 (`tts.py --list-voices ko` 등)
