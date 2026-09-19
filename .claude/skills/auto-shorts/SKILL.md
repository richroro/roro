---
name: auto-shorts
description: 주제 하나로 유튜브 쇼츠·릴스·틱톡용 9:16 세로 영상(mp4)을 끝까지 자동 제작한다 — 재미있는 주제·훅 있는 대본 → 무료 TTS 나레이션(edge-tts) → 무료 웹 API 이미지(Pexels·Unsplash·Pixabay·Openverse·위키미디어 스톡 사진 우선, 없으면 Pollinations AI 생성) → 무료 BGM·효과음 → 읽는 단어가 강조되는 자막 → ffmpeg 렌더 → final.mp4. "쇼츠 만들어줘", "숏폼/릴스/틱톡 영상 자동으로", "TTS 나레이션 영상", "AI로 1분 영상", "재미있는 사실 영상 뽑아줘", "음성 읽어주는 세로 영상"처럼 짧은 세로 영상을 실제 파일로 만들어 달라는 요청이면 사용자가 스킬이나 도구 이름을 말하지 않아도 반드시 이 스킬을 쓴다. (웹캠 촬영은 make-shorts, Seedance/Higgsfield용 프롬프트 패키지는 ai-video-shorts 가 담당.)
---

# auto-shorts — 주제 하나로 완성 쇼츠 mp4 만들기

Claude 가 **주제를 고르고 대본을 쓴 뒤**, 번들 스크립트가 나머지를 전부 자동으로 처리한다:

```
project.json ─▶ TTS(edge-tts, 단어 타이밍) ─▶ 씬 이미지(무료 스톡 사진 → AI 생성) ─▶ BGM/SFX ─▶ 자막(ASS)
             ─▶ 켄 번즈 클립 → 크로스페이드 → 자막 번인 ─▶ 덕킹 믹스 + 라우드니스 ─▶ final.mp4
```

산출물: `final.mp4`(1080x1920, 30fps, H.264/AAC), `thumbnail.jpg`, `preview.jpg`(검수용 프레임 그리드),
`meta.md`(제목·설명·해시태그·출처 표기·Threads 게시글 초안). 모든 외부 자원은 **무료·키 불필요**가 기본이고,
키를 넣으면 품질 좋은 스톡/음악 제공자가 앞순위로 추가된다. 인터넷이 막혀도 **음성은 오프라인 엔진**(sherpa-onnx
한국어 VITS, 첫 실행 때 모델 자동 다운로드), **BGM 은 로컬 연주 엔진**(실제 악기 샘플, 무드 5종),
**이미지는 로컬 카드**(선택한 이모지 포함)로 완성되므로 절대 실패하지 않는다 — 다만 카드는 어디까지나 최후 수단이고,
정상 환경에서는 씬마다 실제 사진이 들어간다.

나레이션 엔진 순서(`--tts-engine auto`): edge-tts(가장 자연스러움, 단어 타이밍 제공) → gTTS → local(오프라인).
Edge 가 되는 환경에서는 항상 Edge 가 쓰인다.

이미지 순서(기본 `style.image_source: "photo"`): **무료 스톡 사진**(Pexels → Unsplash → Pixabay → Openverse →
Wikimedia → Open Images) → 사진이 없는 씬만 **AI 생성**(Pollinations) → 최후에 로컬 카드.
**Open Images** 는 키가 하나도 없어도 쓰는 CC BY 2.0 사진 은행이다(첫 사용 때 색인 생성, 저작자 표시 필수 —
`meta.md` 에 자동으로 남는다). 사진 대신 **그림**이 어울리는 영상(명언·감성·추상 개념)은
`style.image_source: "draw"` 로 두면 `scripts/illustrate.py` 가 씬마다 장면을 직접 그린다(15종 템플릿 × 6종 팔레트). 사진이 있는 주제는 사진이 더 그럴듯하고
AI 라벨·비진정성 정책에서도 안전하다. 씬의 `keywords`(흔한 영어 명사 2~3개)가 검색어다.

## 0단계. 환경 준비 (프로젝트당 한 번)

```bash
pip install -r .claude/skills/auto-shorts/requirements.txt
python .claude/skills/auto-shorts/scripts/check_env.py          # 문제 있으면 ✗ 줄의 안내대로
```

- ffmpeg 는 시스템에 없어도 된다 — `imageio-ffmpeg` 가 정적 바이너리를 제공한다(자동 인식).
- 결과의 `✗` 는 고쳐야 하는 것, `!` 는 막힌 네트워크 호스트(폴백으로 진행 가능)다.
- API 키는 전부 선택이지만 **Pexels 키 하나는 꼭 권한다**(무료, 2분, https://www.pexels.com/api/).
  이 키가 있어야 씬마다 주제에 맞는 실사 사진이 들어간다. 키가 없으면 Openverse·Wikimedia 사진만 쓰게 되어
  적중률이 떨어진다. 키는 `.claude/skills/auto-shorts/.env`(`.env.example` 참고)에 넣는다.
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
- 길이·톤 기본값: **30~45초(사실 하나면 25~35초, 랭킹·서사는 55초까지), 씬 5~8개, 밝고 빠른 정보성 톤,
  한국어, 여성 보이스 +12%**. 페이오프가 끝나면 채우지 말고 끝낸다(완주율이 길이보다 중요 — `playbook.md` §3).
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
  "lang": "ko", "voice": "female", "rate": "+12%",  // voice: female|male|male2|<edge 보이스 ID>. 편마다 보이스·훅 유형을 돌려 쓴다
  "style": {
    "image_source": "photo",                // photo(스톡 사진 우선, 기본) | ai(AI 생성 우선) | photo_only(사진만) | draw(직접 그린 일러스트)
    "image_style": "stylized 3d illustration, bold colors, single clear subject, vertical 9:16, no text",  // AI 생성에만 적용되는 아트스타일. 실존 인물·장소의 포토리얼은 피한다
    "layout": "caption",                    // caption(하단 카라오케, 기본) | quote(중앙 큰 글씨 명언 + 출처)
    "dim": 0,                               // 사진 어둡게(0~0.6). quote 레이아웃이면 0.35 권장
    "transition": "mix",                    // fade | mix | smoothleft | zoomin | none
    "auto_transition_sfx": false,           // true 면 씬 전환마다 whoosh (과하면 촌스러움)
    "vignette": true
  },
  "bgm": { "query": "playful curious ukulele", "mood": "playful", "volume": 0.35 },  // mood: playful|calm|lofi|mysterious|epic
  "cta": "모르는 친구한테 보내기",            // 마지막 3초 상단 문구 (이모지 금지). '보내기/공유' 유도가 구독 요청보다 배급 신호에 유리
  "scenes": [
    { "narration": "문어 심장이 몇 개인지 아세요? 놀라지 마세요, 세 개입니다.",   // 씬당 1~2문장
      "beats": ["심장이 몇 개?", "세 개다"],  // ★ 씬 안에서 순서대로 뜨는 문구. 2개면 ~1.8초마다 화면이 바뀐다
      "headline": "심장이 3개?!",             // beats 대신 쓰는 단일 문구(12자 이내). beats 가 있으면 무시된다
      "emoji": "🐙",                          // (선택) 이미지 확보 실패 시 카드에 크게 그릴 이모지 1개 — 항상 넣어 두면 폴백도 보기 좋다
      "art": "ocean",                         // (선택) 일러스트 템플릿 지정 (image_source: draw 이거나 사진 실패 시)
      "keywords": "octopus underwater",       // ★ 사진 검색어. 흔한 영어 명사 2~3개 (사진이 존재하는 것으로!)
      "image_prompt": "a giant pacific octopus hovering in deep blue water, glowing eyes, close-up",  // 사진이 없을 때 쓸 AI 생성 프롬프트
      "sfx": "riser" }                        // (선택) riser|boom|pop|ding|whoosh
    // 마지막 씬에는 "loop_back": true — 첫 씬 그림으로 닫아 반복 재생을 유도한다(그 씬은 cta 가 빠진다)
  ],
  "meta": { "description": "업로드 설명", "hashtags": ["문어", "신기한사실", "shorts"] }
}
```

씬에 `"image": "경로"` 를 주면 그 파일을 쓰고, `"min_duration": 4` 로 최소 길이를 강제할 수 있다.
`bgm` 에 `"file": "경로"` 를 주면 직접 고른 음악을 쓴다. 자막 크기·여백, 씬별 모션, 여백 시간 같은 고급 옵션과
성과 분석용 `category`/`hook_type` 은 `references/options.md` 에 있다 — 품질을 더 조이고 싶을 때 읽는다.

**대본 체크리스트 (쓰고 나서 반드시 스스로 검사)**
- 첫 씬 첫 문장이 결론·반전·구체적 질문으로 바로 시작하는가? 인사말·"오늘은 ~알아볼게요"는 금지. 제목·첫 씬 `headline`(필수)과
  같은 궁금증을 가리키는가? 훅이 약속한 사실이 10초 안에 나오는가?
- **길이 20~30초.** 나레이션 총 **140~210자**(공백 포함) — 한국어 TTS 는 초당 약 7자를 읽는다(실측).
  15~30초 완주율이 80%+ 인데 30~60초는 50~65% 로 떨어진다. 길게 만들 이유가 없다.
- **씬 6개.** 훅 → 즉답+미끼 → 근거 → 근거 → **반전(가장 센 것)** → 루프백. 두 번째 씬을 배경 설명에 쓰지 않는다.
  가장 놀라운 사실 뒤에 팁이나 부연을 붙이지 않는다 — 절정에서 끝낸다.
- **씬마다 `beats` 2개.** 시청자는 1.5~2초마다 계속 볼지를 다시 판단한다. 카드만 읽어도 이야기가 되게 쓴다
  (6할 이상이 소리를 끄고 본다). 문구 없는 씬은 만들지 않는다.
- **마지막 씬에 `"loop_back": true`** + 끝 문장이 첫 문장으로 이어지게. 끝을 먼저 쓰고 첫 문장을 쓰면 쉽다.
- 한 문장 45자 이내, 구어체, 같은 종결어미 3번 연속 금지(~요/~죠/~입니다 섞기).
- 답을 주기 전에 다음 질문을 연다: "꿀은 안 썩습니다. **이유가 좀 무섭고요.**"
- 효과음은 2~4개만(riser=훅, boom=반전, pop=가벼운 강조, ding=정답).
- 편마다 다르게: 훅 유형·이미지 스타일·보이스가 직전 편들과 똑같으면 바꾼다(`report.py` 의 반복 경고). 유튜브
  '비진정성 콘텐츠' 정책은 같은 템플릿의 TTS 슬라이드쇼를 명시적 위반 예시로 든다(`playbook.md` §6).
- **`keywords` 가 결과를 좌우한다**: 스톡 사이트에 실제로 사진이 있는 흔한 영어 명사 2~3개로 적는다.
  좋음 `honey jar`, `bee flower`, `deep ocean`, `ancient pottery` / 나쁨 `octopus three hearts`(그런 사진은 없다),
  `honey enzyme hydrogen peroxide`. 추상 개념은 은유가 되는 사물로 바꿔 적는다(확률→주사위, 시간→모래시계).
  검색어가 길면 파이프라인이 단어를 하나씩 줄여가며 재시도하므로 앞쪽 단어를 가장 중요한 것으로 둔다.
- `image_prompt` 는 사진을 못 찾은 씬의 AI 생성용이다. 영어로 `피사체 + 행동/구도 + 배경 + 조명`,
  씬마다 구도를 바꾼다(클로즈업↔와이드). 실존 인물 얼굴·브랜드 로고·저작권 캐릭터·글자 요청은 하지 않는다.
- 자막에 들어가는 모든 문구(narration/headline/cta)에 이모지 없음 — 자막 폰트에 없어 깨진다.

## 3단계. 렌더

```bash
python .claude/skills/auto-shorts/scripts/make_shorts.py shorts_output/<slug>/project.json --out shorts_output
```

- 보통 1~3분 걸린다(사진 검색·다운로드는 씬당 1~3초, AI 생성이 섞이면 씬당 10~60초). 단계별 산출물은 `shorts_output/<slug>/work/` 에 캐시되어
  **다시 실행하면 바뀐 것만 다시 만든다** — 대본 한 줄만 고치면 그 씬의 TTS·클립만 재생성된다.
- 유용한 옵션: `--offline`(네트워크 없이 무음·카드로 구성 미리보기), `--force`(전부 재생성),
  `--image-providers pexels,openverse,card`(순서 직접 지정), `--bgm-providers jamendo,synth`, `--no-bgm`, `--no-sfx`,
  `--tts-engine local`(오프라인 음성) / `silent`, `--stage images`(그 단계까지만).
- 로그의 `[tts] 완료: local/…` 이면 Edge 가 막혀 오프라인 음성이 쓰인 것 — 결과에 알려 주고, 가능하면 Edge 가
  되는 환경에서 `--tts-engine edge --force` 로 다시 뽑기를 권한다(품질 차이가 크다).
- 로그의 `[images] 완료: 1:pexels, 2:openverse …` 줄로 씬마다 어떤 제공자가 쓰였는지 본다. `card` 가
  섞여 있으면 그 씬은 이미지 확보에 실패한 것 — 4단계에서 키워드를 바꿔 다시 돌린다.
  `연결 불가` 경고가 뜨면 그 호스트가 막힌 환경이다(회사망·프록시).

## 4단계. 검수 (반드시 눈으로)

1. `shorts_output/<slug>/preview.jpg` 를 **Read 로 열어** 12장 프레임을 본다(★ 표시 타일은 헤드라인·CTA 가
   떠 있는 순간): 자막이 잘리거나 UI 안전영역(하단 20%·우측 15%)에 걸치는지, 이미지가 주제와 맞는지,
   헤드라인이 캡션과 겹치는지. 특정 순간을 더 보려면
   `ffmpeg -ss 12.5 -i final.mp4 -frames:v 1 frame.jpg`.
2. `meta.md` 의 길이가 60초 이내인지, 출처 표기가 필요한 자료(CC)가 있는지 본다.
3. 문제가 있으면 `project.json` 만 고치고 다시 렌더한다:
   - 이미지가 엉뚱함 → 그 씬의 `keywords` 를 **더 흔하고 짧은 명사**로 바꾸고 재실행(그 씬만 다시 만든다).
     `card` 로 떨어진 씬도 같은 방법. `--force` 는 성공한 이미지까지 전부 다시 만드니 쓰지 않는다.
   - 사진 대신 그림풍이 어울리는 주제면 `style.image_source` 를 `ai` 로.
   - 60초 초과 → 문장 줄이기 또는 `rate` 를 `+12%` 로.
   - 자막 줄바꿈이 어색 → 문장을 짧게 끊거나 `style.max_chars`(기본 16) 조정.
   - BGM 이 큼/작음 → `bgm.volume`(0.2~0.4).

## 5단계. 업로드 (선택)

`scripts/upload_youtube.py` 로 바로 올릴 수 있다. **처음 한 번만** 구글 인증이 필요하다(사용자 PC에서 브라우저가 열린다).

```bash
# 1회: 구글 클라우드 콘솔에서 YouTube Data API v3 사용 설정 → OAuth 클라이언트 ID(데스크톱 앱) JSON 을
#      .claude/skills/auto-shorts/secrets/client_secret.json 으로 저장한 뒤
python .claude/skills/auto-shorts/scripts/upload_youtube.py --auth

# 매번
python .claude/skills/auto-shorts/scripts/upload_youtube.py --slug <slug> --dry-run   # 제목·설명 확인
python .claude/skills/auto-shorts/scripts/upload_youtube.py --slug <slug>             # 비공개로 업로드
python .claude/skills/auto-shorts/scripts/upload_youtube.py --slug <slug> --privacy public
```

- 기본값은 **비공개**다. 스튜디오에서 확인하고 공개하는 편이 안전하므로, 사용자가 명시적으로 공개를
  요청하지 않으면 `--privacy public` 을 붙이지 않는다.
- 제목·설명·태그는 `meta.md` 와 `project.json` 에서 자동으로 채우고, **CC 사진 출처 표기를 설명란에 넣는다**
  (CC BY 는 표기가 의무다). 썸네일도 함께 올린다.
- 업로드 할당량은 하루 약 6편(1건 1,600유닛 / 기본 10,000유닛)이다.
- Claude 는 사용자의 구글 계정으로 대신 로그인할 수 없다. 인증은 사용자가 직접 한 번 해야 한다.

## 6단계. 전달

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
  나레이션은 `voice_polish` 로 다듬는다(럼블 제거·저중역 온기·치찰음 완화·레벨 고르기·아주 짧은 룸).
  `voice_pitch` 로 음정만 낮출 수 있다(속도 유지). BGM 은 말할 때만 비켜 주고 최종 2패스 loudnorm 으로 -14 LUFS.
  렌더 뒤 `work/narration.wav` 와 `work/music.wav` 의 RMS 차이가 7~9dB 인지 보면 균형을 확인할 수 있다.
  `scripts/synth_bgm.py` 가 **실제 악기 샘플**(FluidR3_GM, MIT)로 무드·시드별로 다른 곡을 연주한다
  (피아노·일렉피아노·베이스·스트링·마림바 + 합성 드럼, 인트로→본절 구성). 저작권 곡은 Content ID 에
  걸리므로 넣지 않는다 — 인기곡이 필요하면 업로드 후 플랫폼 편집기에서 얹는다.
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
- `references/video-generation.md` — Higgsfield 등 AI 영상 생성 연동, 씬에 영상 클립 직접 넣기
- `references/troubleshooting.md` — edge-tts 403, Pollinations 429, ffmpeg 필터 없음, Windows 경로 등
- `scripts/` 의 각 파일 상단 docstring — 단계별 단독 실행법 (`tts.py --list-voices ko` 등)
