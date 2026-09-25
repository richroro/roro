# 누가 진짜 나쁜 녀석? · "bad guy" 팬 뮤직비디오

Billie Eilish **"bad guy"** 에 맞춰 보는 팬 뮤직비디오. **음악도 가사도 들어 있지 않은 무음 영상**이다.
원곡은 저작권이 있어서 여기서 만들거나 넣지 않는다. 보는 사람이 갖고 있는 원곡을 같이 튼다.
이야기와 그림은 전부 오리지널이다. 센 척하는 부장님과, 진짜 나쁜 녀석인 공룡 티셔츠 꼬마
(둘 다 [두 번째 뮤비](../gajang/README.md)에 나온다).

## 원곡이랑 같이 보기

- **브라우저:** `studio.html` 을 열고 "🎵 내 음원 불러오기" 로 원곡 파일을 고른 뒤 ▶. 파일은 내 컴퓨터에서만 재생되고 어디에도 올라가지 않는다.
- **영상 편집 앱:** `dist/` 의 무음 MP4 를 올리고 원곡을 아래 트랙에 놓는다. 영상 0초가 원곡의 첫 박이다.
- **직접 합치기** (개인 감상용): `node render.mjs --project=badguy --encode --audio=내/원곡.m4a --out=out/with-song.mp4`

## 타이밍 맞추기

[`song/map.mjs`](song/map.mjs) 의 시간은 원곡 음원을 분석한 게 아니라 알려진 구조(135 BPM, 두 번의 드롭,
2:27 부근의 느린 엔딩)로 잡은 **추정치**다. 내 음원과 어긋나면:

1. `OFFSET` (첫 박 위치), `SLOW_AT` (느린 엔딩 시작), 섹션 마디를 고친다.
2. `node badguy/song/map.mjs` → `node render.mjs --project=badguy --frames --force` → `--encode`

## 파일

| 경로 | 내용 |
|---|---|
| [`song/map.mjs`](song/map.mjs) | 타이밍 지도 (소리 없음) → `src/song.js` |
| [`src/beat.js`](src/beat.js) | 느린 엔딩을 아는 박자 함수 (`bgBeat`, `bgPulse`, `bgT` …) |
| [`STORYBOARD.md`](STORYBOARD.md) | 샷 단위 계획 |
| [`src/ch/`](src/ch/) | 여섯 챕터: 터프 가이 · 드롭 · 장난 · 추격 · 브레이크 · 느린 엔딩 |
| [`studio.html`](studio.html) | 그리는 페이지이자 플레이어 (원곡을 불러와 맞춰 볼 수 있음) |
