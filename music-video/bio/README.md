# 빌리 아일리시 · 커리어 영상

▶ 완성본: [`dist/billie-eilish-career-720p.mp4`](dist/billie-eilish-career-720p.mp4) (2:52, 720p)

2001년 로스앤젤레스에서 태어나, 2015년 오빠 피니어스와 침실에서 만든 "Ocean Eyes" 부터 그래미 주요 4개
부문 석권, 두 번의 아카데미 주제가상, 2026년 그래미 올해의 노래까지를 모션 그래픽으로 따라가는 영상.

- **사실만:** 자막 문구는 [`STORYBOARD.md`](STORYBOARD.md) 에 한 글자씩 고정해 두었고, 각 항목은 기사와
  공식 자료로 확인했다(Rolling Stone, Billboard, Britannica, Gold Derby, Pollstar, 한국일보 등).
- **얼굴 없음:** 실존 인물이라 얼굴을 그리지 않는다. 빌리와 피니어스는 얼굴 없는 실루엣으로만, 시기는 머리색으로만 표시.
- **로고·상표 없음:** 그래미는 금색 축음기, 오스카는 금색 별 트로피, 앨범 표지·포스터 대신 글자와 색.
- **음악:** 빌리의 음원은 쓰지 않았다. 배경음악은 두 번째 뮤비의 다크 팝 악보를 연주곡으로 편곡한 오리지널
  ([`song/score.mjs`](song/score.mjs)).

## 만들기

`music-video/` 에서:

```bash
node song/darkpop.mjs bio/song/score.mjs      # 배경음악 -> bio/assets/song.m4a, bio/src/song.js
node render.mjs --project=bio --frames
node render.mjs --project=bio --encode        # bio/out/mv.mp4
```
