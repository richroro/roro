# 오늘도 수고했어 · 뮤직비디오

▶ 완성본: [`dist/oneuldo-sugohaesseo-720p.mp4`](dist/oneuldo-sugohaesseo-720p.mp4) (2:52, 720p)

마흔 넘은 아빠의 하루를 담은 두 번째 뮤직비디오. 새벽 다섯 시 반 알람, 만원 지하철, 부장님의 한숨,
결재 도장, 계산기, 야근, 막차, 그리고 현관문을 열면 달려오는 "아빠!".

첫 번째 뮤비 [고딩 라이프](../README.md) 의 도구를 그대로 쓴다. 이 폴더에는 이 영상만의 것만 있다:

| 경로 | 내용 |
|---|---|
| [`song/score.mjs`](song/score.mjs) | 악보: 100 BPM, D 단조, 마지막 후렴에서 한 음 위로. 가사·멜로디·코드·효과음 큐. D 단조 다크 팝: 808 서브 베이스, 핑거 스냅, 트랩 하이햇, 먹먹한 피아노, 숨소리. 목소리 없이 숨결 섞인 신스가 멜로디를 부르고 가사는 자막으로 ([`../song/darkpop.mjs`](../song/darkpop.mjs)) |
| [`STORYBOARD.md`](STORYBOARD.md) | 샷 단위 계획 |
| [`src/family.js`](src/family.js) | 아빠·엄마·막내·부장님·동료·스무 살의 아빠, 서류가방·소주·기타 |
| [`src/ch/`](src/ch/) | 여섯 챕터: 새벽 · 회사 · 숫자들 · 막차 · 현관 · 가족 |
| [`studio.html`](studio.html) | 공용 `../src/` 와 이 폴더의 파일을 읽어 그리는 페이지 (그냥 열면 플레이어) |

## 만들기

`music-video/` 에서:

```bash
node song/darkpop.mjs gajang/song/score.mjs        # 곡(다크 팝) -> gajang/assets/song.m4a, gajang/src/song.js
node song/ballad.mjs gajang/song/score.mjs         # (같은 악보를 피아노 발라드로)
node render.mjs --project=gajang --frames          # 프레임 -> gajang/out/frames
node render.mjs --project=gajang --encode          # gajang/out/mv.mp4
```

## 싸이 "아버지"에 맞춘 버전 (`psy/`)

▶ [`dist/abeoji-psy-sync-720p.mp4`](dist/abeoji-psy-sync-720p.mp4) (4:04, 720p, **무음**)

같은 그림을 싸이 **"아버지"** 원곡 길이와 구성에 맞춰 늘린 버전. 원곡은 저작권이 있어서 넣지 않았고,
보는 사람이 갖고 있는 원곡을 같이 튼다. 우리 곡 가사 자막은 빼고, 엔딩 크레딧은 원곡 표기로 바꿨다.

- 브라우저: `psy/studio.html` 을 열고 "🎵 내 음원 불러오기" 로 원곡을 고른 뒤 ▶.
- 새로 그린 게 아니라 [`psy/map.mjs`](psy/map.mjs) 의 시간 지도로 각 프레임을 원래 영상의 다른 시점에서
  가져온다. 지도의 시간은 원곡을 분석한 게 아니라 **추정치**라, 어긋나면 숫자를 고친 뒤:

```bash
node gajang/psy/map.mjs
node render.mjs --project=gajang/psy --frames --force
node render.mjs --project=gajang/psy --encode      # 원곡을 붙여 개인 감상용으로: --audio=내/아버지.m4a
```
