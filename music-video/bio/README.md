# 작은 방에서 · 빌리 아일리시 이야기

▶ 완성본: [`dist/billie-eilish-career-720p.mp4`](dist/billie-eilish-career-720p.mp4) (2:52, 720p)

침실에서 시작한 노래가 세상에 닿기까지. 춤을 사랑하던 소녀가 부상으로 춤을 잃고, 남은 노래로 세상에
나가고, 우울증과 투렛 증후군을 숨기지 않고 이야기하고, 정상에서 "침실에서 음악을 만드는 모든 아이들"에게
건넨 말(피니어스, 2020 그래미)을 지나, 지금 어느 작은 방에서 첫 노래를 만드는 누군가에게로 끝나는 짧은 영화.

레터박스·블룸·색 보정·필름 그레인·명조체 내레이션은 [`src/cinema.js`](src/cinema.js) 가 모든 프레임에 입힌다.

- **사실만:** 자막 문구는 [`STORYBOARD.md`](STORYBOARD.md) 에 한 글자씩 고정해 두었고, 각 항목은 기사와
  공식 자료로 확인했다(Rolling Stone, Billboard, Britannica, Gold Derby, Pollstar, 한국일보 등).
- **얼굴 없음:** 실존 인물이라 얼굴을 그리지 않는다. 빌리와 피니어스는 얼굴 없는 실루엣으로만, 시기는 머리색으로만 표시.
- **로고·상표 없음:** 그래미는 금색 축음기, 오스카는 금색 별 트로피, 앨범 표지·포스터 대신 글자와 색.
- **음악:** 빌리의 음원은 쓰지 않았다. 배경음악은 두 번째 뮤비의 악보를 피아노·스트링 발라드 연주곡으로 편곡한 오리지널
  ([`song/score.mjs`](song/score.mjs)).

## 만들기

`music-video/` 에서:

```bash
node song/ballad.mjs bio/song/score.mjs       # 배경음악 -> bio/assets/song.m4a, bio/src/song.js
node render.mjs --project=bio --frames
node render.mjs --project=bio --encode        # bio/out/mv.mp4
```
