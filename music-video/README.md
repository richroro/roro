# 고딩 라이프 · 뮤직비디오

▶ 완성본: [`dist/goding-life-720p.mp4`](dist/goding-life-720p.mp4) (2:11, 720p). 1080p 는 아래 방법으로 직접 렌더링하면 `out/goding-life.mp4` 로 나온다.

고등학생의 하루하루를 담은 2분 11초짜리 뮤직비디오. 곡도 영상도 이 폴더의 코드가 처음부터 만든다.
샘플 음원도, 이미지 에셋도 없다 (폰트 두 개만 빼고).

[JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) 의 작업 방식을 참고했다:
스토리보드를 먼저 쓰고, 애니메이션 가이드로 여러 에이전트에게 챕터를 나눠 맡기고, 모든 프레임을
시간 `t` 의 순수 함수로 그려서 헤드리스 브라우저로 병렬 렌더링한 뒤 ffmpeg 로 합친다.

## 곡

| | |
|---|---|
| 제목 | 고딩 라이프 |
| 템포 · 조 | 132 BPM, E 단조 → 마지막 후렴에서 한 음 위로 |
| 구성 | 인트로 · 1절 · 프리코러스 · 후렴 · 2절 · 프리코러스 · 후렴 · 브리지 · 빌드업 · 마지막 후렴 · 아웃트로 |
| 소리 | 킥·스네어·하이햇, 베이스, 패드, 아르페지오, 리드, 효과음(알람·학교 종·심장 박동·시계) 전부 `song/synth.mjs` 에서 합성 |
| 목소리 | 한글을 초성·중성·종성으로 풀어서 모음은 포먼트 필터로, 자음은 노이즈·콧소리로 만드는 작은 포먼트 합성기. 사람 목소리처럼 들리진 않지만 가사를 박자에 맞춰 부른다 |

가사·멜로디·코드·효과음 타이밍은 전부 [`song/score.mjs`](song/score.mjs) 한 곳에 있다. `validate()` 가
음절 수와 음표 수가 맞는지, 강박의 음이 코드에 들어가는지 검사한다.

## 파일

| 경로 | 내용 |
|---|---|
| [`song/score.mjs`](song/score.mjs) | 악보: 가사, 멜로디, 코드, 구성, 효과음 큐 |
| [`song/synth.mjs`](song/synth.mjs) | 악보를 소리로: `out/song.wav`, `assets/song.m4a`, `src/song.js` 를 쓴다 |
| [`STORYBOARD.md`](STORYBOARD.md) | 샷 단위 계획 (시간은 악보에서 나온 정확한 값) |
| [`ANIMATION_GUIDE.md`](ANIMATION_GUIDE.md) | 챕터를 그리는 에이전트를 위한 API · 스타일 가이드 |
| [`src/core.js`](src/core.js) | 그리기 도구: 도형, 잉크 외곽선, 카메라, 글자, 전환 효과, 박자 함수 |
| [`src/cast.js`](src/cast.js) | 세 친구(`me`, `pony`, `glasses`)와 어른들 |
| [`src/props.js`](src/props.js) | 동네, 학교, 교실, 시계, 책상, 소품 |
| [`src/ch/`](src/ch/) | 여섯 챕터: 아침 · 점심 · 야자 · 다시 · D-day · 해방 |
| [`studio.html`](studio.html) | 모든 프레임을 그리는 페이지. 그냥 열면 노래와 함께 재생되는 플레이어 |
| [`render.mjs`](render.mjs) | 헤드리스 Chromium 으로 프레임을 그리고 ffmpeg 로 MP4 를 만든다 |
| `assets/fonts/` | Black Han Sans, Jua (둘 다 SIL OFL 1.1, 라이선스 파일 동봉) |

## 만들기

Node.js 18+, Chromium(또는 Chrome), libx264·AAC 가 되는 ffmpeg 가 필요하다.
ffmpeg 가 없으면 `pip install imageio-ffmpeg` 로 받은 정적 빌드를 자동으로 찾는다.

```bash
cd music-video
npm install                       # playwright-core 하나
node song/synth.mjs               # 곡 합성 (20초 정도)
node render.mjs --frames          # 프레임 3,926장 (4 워커로 1–2분) -> out/frames (이어서 그리기 가능)
node render.mjs --encode          # out/goding-life.mp4
```

- 미리 보기: `studio.html` 을 브라우저로 열면 노래와 함께 실시간으로 재생된다.
- 특정 장면만 확인: `node render.mjs --sheet=36.4,38.2,40.1 --cols=3` → `out/check/sheet.jpg`
- 720p 로 빨리: `node render.mjs --frames --w=1280`
- 파트 하나만 듣기: `STEM=vox node song/synth.mjs` → `out/stem_vox.wav`
