# 야호, 1위 · 리센느 이야기 (치비 쇼츠)

▶ 완성본: [`dist/yaho-1wi-short-1080x1920.mp4`](dist/yaho-1wi-short-1080x1920.mp4) (0:52, 세로 1080×1920)

2024년 8월에 나와 멜론 일간 904위로 시작한 "러브 어택"이 1년 11개월 뒤 멜론 TOP100 1위에 오르기까지.
결말(1위 소식에 잠에서 깬 밤)에서 시작해 VHS로 2024년까지 되감고, 게임 점수판 같은 순위 카운터가 904위에서
1위까지 올라가는 과정을 보여 준 다음, 그 밤의 눈물 라이브로 돌아와 끝난다.

- **빌리 아일리시 쇼츠와 다른 점:** 구조(시간 순서 4막 → 결말부터 되감기 + 순위 카운터), 캐릭터(역광 애니 인물 →
  2.5등신 치비 5인조, 파스텔 스티커 그림체). 도구는 [`src/pop.js`](src/pop.js), 장면은 [`src/ch/`](src/ch/).
- **사실만:** 화면 글자는 [`STORYBOARD.md`](STORYBOARD.md) 에 고정했고, 출처는 그 파일 끝에 있다.
- **얼굴 없음:** 실존 인물이라 눈을 그리지 않는다(앞머리가 눈을 가린다). 다섯 캐릭터는 특정 멤버를 흉내 내지 않는다.
- **로고·상표 없음:** 멜론·유튜브·방송사 로고, 앨범 표지, 실제 트로피 디자인을 쓰지 않았다.
- **음악:** 리센느의 음원은 쓰지 않았다. 첫 번째 뮤비 〈고딩 라이프〉의 앞 28마디를 보컬 없이 연주한 오리지널
  ([`song/score.mjs`](song/score.mjs), [`song/cut.mjs`](song/cut.mjs)).

## 만들기

`music-video/` 에서:

```bash
node song/synth.mjs rescene/song/score.mjs && node rescene/song/cut.mjs   # 반주 -> rescene/assets/song.m4a, rescene/src/song.js
node render.mjs --project=rescene --frames --w=1080
node render.mjs --project=rescene --encode                                # rescene/out/mv.mp4
```
