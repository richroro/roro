# 다음은 너야 · 빌리 아일리시 이야기 (애니 쇼츠)

▶ 완성본: [`dist/next-is-you-short-1080x1920.mp4`](dist/next-is-you-short-1080x1920.mp4) (0:58, 세로 1080×1920)

긴 영상 [〈작은 방에서〉](../bio/README.md) 를 애니 오프닝처럼 압축한 세로 쇼츠. 춤을 잃은 열세 살, 오빠와 침실에서
만든 노래, 1위, 무대 밖의 싸움, 그래미와 오스카, 그리고 마지막에 보는 사람에게 건네는 한마디: **다음은 너야.**

- **애니 연출:** 셀 셰이딩, 역광 림 라이트, 바람에 날리는 머리, 집중선, 흑백 반전 임팩트 프레임, 망가 컷, 스크린톤.
  도구는 [`src/anime.js`](src/anime.js), 장면은 [`src/ch/`](src/ch/).
- **사실만:** 화면 글자는 [`STORYBOARD.md`](STORYBOARD.md) 에 고정했고, 긴 영상에서 확인한 사실만 쓴다.
- **얼굴 없음:** 실존 인물이라 얼굴은 늘 역광 그림자 속이다. 뒷모습, 손, 마이크, 머리카락으로 이야기한다.
- **로고·상표 없음:** 그래미는 금색 축음기, 오스카는 금색 별 트로피.
- **음악:** 빌리의 음원은 쓰지 않았다. 첫 번째 뮤비 〈고딩 라이프〉의 후렴부터 끝까지(40마디부터)를 보컬 없이
  신스 멜로디로 연주한 오리지널 반주다 ([`song/score.mjs`](song/score.mjs), [`song/cut.mjs`](song/cut.mjs)).

## 만들기

`music-video/` 에서:

```bash
node song/synth.mjs shorts/song/score.mjs && node shorts/song/cut.mjs   # 반주 -> shorts/assets/song.m4a, shorts/src/song.js
node render.mjs --project=shorts --frames --w=1080
node render.mjs --project=shorts --encode                               # shorts/out/mv.mp4
```

미리보기는 `shorts/studio.html` (저장소 루트에서 정적 서버를 띄우고 열기).
