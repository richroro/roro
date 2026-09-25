# 오늘도 수고했어 · 뮤직비디오

마흔 넘은 아빠의 하루를 담은 두 번째 뮤직비디오. 새벽 다섯 시 반 알람, 만원 지하철, 부장님의 한숨,
결재 도장, 계산기, 야근, 막차, 그리고 현관문을 열면 달려오는 "아빠!".

첫 번째 뮤비 [고딩 라이프](../README.md) 의 도구를 그대로 쓴다. 이 폴더에는 이 영상만의 것만 있다:

| 경로 | 내용 |
|---|---|
| [`song/score.mjs`](song/score.mjs) | 악보: 100 BPM, D 장조, 마지막 후렴에서 한 음 위로. 가사·멜로디·코드·효과음 큐. 목소리 없이 피아노가 멜로디를 치고 가사는 자막으로 ([`../song/ballad.mjs`](../song/ballad.mjs)) |
| [`STORYBOARD.md`](STORYBOARD.md) | 샷 단위 계획 |
| [`src/family.js`](src/family.js) | 아빠·엄마·막내·부장님·동료·스무 살의 아빠, 서류가방·소주·기타 |
| [`src/ch/`](src/ch/) | 여섯 챕터: 새벽 · 회사 · 숫자들 · 막차 · 현관 · 가족 |
| [`studio.html`](studio.html) | 공용 `../src/` 와 이 폴더의 파일을 읽어 그리는 페이지 (그냥 열면 플레이어) |

## 만들기

`music-video/` 에서:

```bash
node song/ballad.mjs gajang/song/score.mjs         # 곡(피아노 발라드) -> gajang/assets/song.m4a, gajang/src/song.js
node render.mjs --project=gajang --frames          # 프레임 -> gajang/out/frames
node render.mjs --project=gajang --encode          # gajang/out/mv.mp4
```
