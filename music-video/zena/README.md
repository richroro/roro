# 제나의 트로트 메들리 · 리센느 제나 (노래방 픽셀 쇼츠)

▶ 완성본: [`dist/zena-trot-short-1080x1920.mp4`](dist/zena-trot-short-1080x1920.mp4) (1:00, 세로 1080×1920) ·
가벼운 버전 [`dist/zena-trot-short-720p.mp4`](dist/zena-trot-short-720p.mp4) ·
배경음악 없는 버전 [`dist/zena-trot-short-720p-no-music.mp4`](dist/zena-trot-short-720p-no-music.mp4)

2026년 9월 18일 원이의 유튜브 채널에 올라온 '[추석 특집] 제나의 트로트 메들리'가 나흘 만에 690만, 6일 만에 870만 회를
찍고 장윤정이 댓글과 '러브 어택' 춤으로 화답하기까지. 영상 전체가 노래방 화면이다: 곡 번호 → 제목 → 1절(가사 자리에
사실 자막) → 선곡표 → 앙코르 → 박수.

- **앞의 쇼츠들과 다른 점:** 구조는 노래방 반주기 화면, 캐릭터는 16비트 픽셀 스프라이트, 음악은 새로 작곡한 뽕짝 트로트.
  도구는 [`src/karaoke.js`](src/karaoke.js), 장면은 [`src/ch/`](src/ch/).
- **사실만:** 화면 글자는 [`STORYBOARD.md`](STORYBOARD.md) 에 고정했고, 출처는 그 파일 끝에 있다.
- **얼굴 없음:** 실존 인물이라 스프라이트에 눈을 그리지 않는다.
- **가사·원곡 없음:** 메들리 곡은 제목과 원곡 가수 이름만 나온다. 배경음악은 [`song/trot.mjs`](song/trot.mjs) 가 만든
  오리지널이고, 메들리 곡들의 멜로디를 쓰지 않았다.

## 만들기

`music-video/` 에서:

```bash
node zena/song/trot.mjs                          # 반주 -> zena/assets/song.m4a, zena/src/song.js
node render.mjs --project=zena --frames --w=1080
node render.mjs --project=zena --encode          # zena/out/mv.mp4
```
