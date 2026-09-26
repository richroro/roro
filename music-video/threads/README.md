# 스레드어, 몇 개 알아? · 스레드 문화 (털실 퀴즈 쇼츠)

▶ 완성본: [`dist/threads-quiz-short-1080x1920.mp4`](dist/threads-quiz-short-1080x1920.mp4) (1:00, 세로 1080×1920) ·
가벼운 버전 [`dist/threads-quiz-short-720p.mp4`](dist/threads-quiz-short-720p.mp4)

한국 스레드의 문화를 퀴즈쇼로 푼다. 첫날 "안녕하십니까"로 들어온 뻣뻣한 털실이 스친, 스하리, 스린이, 쓰하를 배우고,
보너스 문제 "왜 반말?"에서 넥타이와 안경을 벗는다. 마지막엔 숫자(국내 월간 이용자 665만 명 등)와 함께 모두가
털실로 이어진다.

- **앞의 쇼츠들과 다른 점:** 구조는 퀴즈쇼(단어 → 3·2·1 → 땡! → 정답), 캐릭터는 지어낸 털실 뭉치(스레드 = 실, 글 묶음 = 타래).
  도구는 [`src/yarn.js`](src/yarn.js), 장면은 [`src/ch/`](src/ch/). 손글씨는 개구체(Gaegu, OFL).
- **사실만:** 용어 뜻과 숫자는 [`STORYBOARD.md`](STORYBOARD.md) 에 고정했고, 출처는 그 파일 끝에 있다.
- **로고 없음:** 스레드 로고와 앱 아이콘을 그리지 않았다.
- **음악:** 〈고딩 라이프〉의 16~48마디를 트랩풍 베드룸 팝으로 새로 편곡한 오리지널(`song/darkpop.mjs`).

## 만들기

`music-video/` 에서:

```bash
node song/darkpop.mjs threads/song/score.mjs && node rescene/song/cut.mjs threads/song/score.mjs
node render.mjs --project=threads --frames --w=1080
node render.mjs --project=threads --encode                  # threads/out/mv.mp4
```
