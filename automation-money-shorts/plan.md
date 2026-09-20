# 쇼츠 제작 패키지 — "업무 자동화로 돈 버는 법" (30초 / 6씬)

- **총 길이:** 30초 · 6씬 × 5초
- **비율:** 9:16 세로 (1080×1920)
- **비주얼 톤:** 실사 시네마틱
- **생성 툴:** Seedance 2.0 / Higgsfield (둘 다 활용)
- **오디오:** 한국어 나레이션 + 온스크린 자막 + 배경음악

---

## 1. 컨셉 & 후킹

- **한 줄 컨셉:** "내가 자는 동안 자동화가 대신 일하고, 그 자동화를 남에게 팔면 돈이 된다."
- **첫 3초 훅**
  - 시각: 불 꺼진 방, 침대에서 자는 사람 옆 책상 위 노트북 화면만 밝게 빛나며 스스로 작업(코드·알림·매출 숫자)이 흘러간다.
  - 화면 텍스트: **"자는 동안에도 돈이 들어온다면?"**

---

## 2. 전체 구성 표

| 씬 | 길이 | 화면 내용 | 자막(온스크린) | 나레이션 요약 |
|---|---|---|---|---|
| 1 | 0–5s | 어두운 방, 자는 사람 옆 노트북이 스스로 작동 | 자는 동안에도 돈이 들어온다면? | 훅·문제 제기 |
| 2 | 5–10s | 낮, 반복 업무(엑셀·메일)에 지친 1인 사장 | 하루 3시간, 반복 업무에 낭비 | 공감·문제 |
| 3 | 10–15s | 자동화 봇이 메일·주문·게시글을 처리하는 시각화 | 자동화가 대신 일한다 | 해결책 |
| 4 | 15–20s | 스마트폰에 매출·완료 알림이 연속으로 뜸 | 클릭 한 번 없이 자동 처리 | 결과 |
| 5 | 20–25s | 그 자동화를 다른 사장에게 납품/판매하는 장면 | 남의 일도 대신 → 대행 수익 | 수익화 방법 |
| 6 | 25–30s | 노트북 든 사람, 도시 야경 배경으로 CTA | 오늘 1개부터 자동화하자 | 행동 촉구 |

---

## 3. 씬별 생성 프롬프트

> 각 프롬프트는 영문 그대로 붙여넣기. `9:16 vertical, cinematic, 4k` 는 공통 유지.
> Higgsfield는 카메라 무빙을 프리셋 이름으로 넣고, Seedance는 이미지→영상이면
> "Start frame:" 설명을 앞에 덧붙이면 안정적.

### 씬 1 (0–5s) — 훅
**Prompt:**
```
A dark quiet bedroom at night, a person sleeping peacefully in bed, on the desk beside them a laptop glowing bright, screen auto-scrolling with code, notifications and rising sales numbers by itself, soft blue screen light on the wall, calm but intriguing mood, slow dolly-in toward the glowing laptop, cinematic, shallow depth of field, 9:16 vertical, 4k, 5 seconds
```
- **Higgsfield 팁:** 카메라 무빙 `Dolly In` 프리셋.
- **Seedance 팁(이미지→영상):** `Start frame: dark bedroom, sleeping person, glowing laptop on desk.`
- **네거티브:** text overlay, watermark, distorted face, extra fingers

### 씬 2 (5–10s) — 문제
**Prompt:**
```
Daytime home office, a tired small-business owner in their 30s slumped at a desk overwhelmed by stacks of paperwork, spreadsheets and unread email piling up on the monitor, clock hands spinning fast, frustrated exhale, muted desaturated colors, handheld slight shake, cinematic, 9:16 vertical, 4k, 5 seconds
```
- **Higgsfield 팁:** `Handheld` + 약한 `Push In`.
- **Seedance 팁:** `Start frame: exhausted person at cluttered desk with spreadsheets.`
- **네거티브:** cartoon, watermark, text, deformed hands

### 씬 3 (10–15s) — 해결책(자동화)
**Prompt:**
```
Same desk now transformed, glowing holographic automation flow above the laptop, animated nodes connecting email, orders and social posts moving along bright lines, a friendly robot assistant icon processing tasks automatically, clean modern tech aesthetic, cool blue and teal light, smooth orbit around the laptop, cinematic, 9:16 vertical, 4k, 5 seconds
```
- **Higgsfield 팁:** `Orbit` 프리셋.
- **Seedance 팁:** `Start frame: laptop with glowing holographic workflow diagram floating above it.`
- **네거티브:** cluttered, watermark, jitter, unreadable text

### 씬 4 (15–20s) — 결과(수익 알림)
**Prompt:**
```
Close-up of a smartphone in hand, screen lighting up with a rapid stream of notifications: payment received, task completed, new order, each popping in one after another, subtle confetti glow, satisfied hand tilt, warm optimistic lighting, macro shot with rack focus, cinematic, 9:16 vertical, 4k, 5 seconds
```
- **Higgsfield 팁:** `Static` 또는 약한 `Push In`, 초점 이동.
- **Seedance 팁:** `Start frame: hand holding phone with a payment notification on screen.`
- **네거티브:** real brand logos, readable personal data, watermark

### 씬 5 (20–25s) — 수익화(대행/판매)
**Prompt:**
```
A confident young entrepreneur shaking hands with a small shop owner across a table, a laptop between them showing an automation dashboard being delivered, bright modern cafe setting, sense of a deal closing, money and value exchange implied, warm golden hour light through window, slow push-in on the handshake, cinematic, 9:16 vertical, 4k, 5 seconds
```
- **Higgsfield 팁:** `Push In` 프리셋.
- **Seedance 팁:** `Start frame: two people shaking hands over a laptop showing a dashboard.`
- **네거티브:** watermark, distorted faces, extra limbs

### 씬 6 (25–30s) — CTA
**Prompt:**
```
A person standing on a rooftop at dusk holding a laptop, looking out over a glowing city skyline, calm confident posture, sense of freedom and possibility, cinematic wide shot slowly craning up, warm and blue twilight tones, inspirational mood, 9:16 vertical, 4k, 5 seconds
```
- **Higgsfield 팁:** `Crane Up` 프리셋.
- **Seedance 팁:** `Start frame: person with laptop on rooftop overlooking city skyline at dusk.`
- **네거티브:** watermark, text, distorted face

---

## 4. 나레이션 대본 (한국어, 씬 순서 · 씬당 5초 ≈ 28자 이내)

1. **(0–5s)** "자는 동안에도 돈이 들어온다면, 믿어지세요?"
2. **(5–10s)** "매일 반복되는 업무, 하루 몇 시간씩 날아갑니다."
3. **(10–15s)** "이걸 자동화가 대신 처리하게 만들 수 있어요."
4. **(15–20s)** "메일도 주문도, 손 안 대고 자동으로."
5. **(20–25s)** "이 자동화를 남에게 만들어주면 그게 수익이 됩니다."
6. **(25–30s)** "오늘, 딱 한 가지부터 자동화해 보세요."

> 녹음 팁: 담담하고 자신감 있는 톤, 문장 끝을 살짝 올리지 말고 단정하게. TTS를
> 쓸 경우 한국어 자연 보이스(예: 네이버 클로바, ElevenLabs 한국어) 권장.

---

## 5. 자막 (온스크린 텍스트 — 큰 글씨, 한 줄)

1. 자는 동안에도 돈이 들어온다면?
2. 하루 3시간, 반복 업무에 낭비
3. 자동화가 대신 일한다
4. 클릭 한 번 없이 자동 처리
5. 남의 일도 대신 → 대행 수익
6. 오늘 1개부터 자동화하자

→ 타임코드는 `captions.srt` 참고 (영상에 번인하거나 업로드 시 자막으로 사용).

---

## 6. 음악 · 효과음 디렉션

- **장르/무드:** lo-fi ~ 미니멀 일렉트로닉, 100–115 BPM, 차분하다가 후반부 상승.
- **구성:** 0–10s 차분한 인트로 → 10–20s 비트 진입(자동화 시작 지점) → 20–30s 밝게 상승.
- **SFX 포인트:**
  - 씬1 노트북 알림음(작게) — 훅 강조
  - 씬3 전환 "우웅~" 스와이프음 — 자동화 등장
  - 씬4 알림 팝업마다 "띵" 연속음 — 수익 쾌감
  - 씬6 엔딩 임팩트 한 방
- **무료 음원:** YouTube 오디오 보관함, Pixabay Music (상업 사용·저작권 확인 후).

---

## 7. 발행 메타

### YouTube Shorts
- **제목:** 자는 동안에도 돈 버는 법 (업무 자동화 부업) #shorts
- **설명:** 반복 업무를 자동화하고, 그 자동화를 남에게 만들어주면 수익이 됩니다. 오늘 딱 한 가지부터 시작해보세요.
- **해시태그:** #shorts #업무자동화 #부업 #자동화 #디지털노마드 #1인기업 #사이드프로젝트 #돈버는법

### Instagram Reels
- **캡션:** 자는 동안에도 돈이 들어온다면? 💻\n반복 업무 자동화 → 대행 수익화. 오늘 1개부터.
- **해시태그:** #릴스 #업무자동화 #부업 #자동화 #1인기업 #프리랜서 #사이드잡 #생산성

### TikTok
- **캡션:** 자동화로 자는 동안 돈 버는 법 💸 #자동화 #부업
- **해시태그:** #자동화 #업무자동화 #부업 #돈버는법 #사이드잡 #틱톡꿀팁

**업로드 팁:** 세로 1080×1920 유지 · 첫 프레임(씬1 노트북 빛)을 커버로 · 자막을
화면 안전영역(상하 15%) 안쪽에 배치.
