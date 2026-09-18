# 블록 퍼즐 (block-puzzle)

10×10 판에 블록을 끌어다 놓고 가로·세로 줄을 완성해 지우는 모바일 웹 게임입니다.
빌드 도구 없이 `index.html`, `style.css`, `game.js` 세 파일로 동작합니다.

- 터치/마우스 드래그, 놓을 자리 미리보기, 지워질 줄 강조
- 줄 지우기 애니메이션·파티클, 콤보, 올 클리어 보너스
- 진행 상황 자동 저장(이어하기), 최고 점수, 되돌리기(판당 1회 무료)
- 소리(WebAudio)·진동(Android) 토글, 결과 공유
- 홈 화면 추가용 manifest + SVG 아이콘

## 광고 붙이는 방법

### 1. 배너 광고 자리

`index.html` 에 비어 있는 컨테이너 3개가 있습니다. 비어 있으면 CSS 로 자동 숨김되므로 광고 코드만 넣으면 됩니다.

| id | 위치 | 권장 크기 |
|---|---|---|
| `#ad-top` | 헤더 아래, 게임판 위 | 320×50, 320×100 또는 반응형 |
| `#ad-bottom` | 버튼 아래, 설명 위 | 반응형 |
| `#ad-over` | 게임 오버 카드 안 | 300×250 |

애드센스 디스플레이 광고 예시:

```html
<div id="ad-top" class="ad-slot" data-ad="top">
  <ins class="adsbygoogle" style="display:block"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="1234567890"
       data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
```

카카오 애드핏 예시:

```html
<div id="ad-top" class="ad-slot" data-ad="top">
  <ins class="kakao_ad_area" style="display:none;"
       data-ad-unit="DAN-XXXXXXXXXXXX" data-ad-width="320" data-ad-height="50"></ins>
  <script type="text/javascript" src="//t1.daumcdn.net/kas/static/ba.min.js" async></script>
</div>
```

### 2. 전면 광고 / 리워드 광고 (`window.AdBridge`)

게임은 두 시점에 `window.AdBridge` 를 호출합니다.

- `AdBridge.showInterstitial(done)` : 게임 오버 후 **다시 시작** 버튼을 눌렀을 때. 광고가 끝나면 반드시 `done()` 을 호출해야 새 게임이 시작됩니다.
- `AdBridge.showRewarded(onReward, onFail)` : 무료 되돌리기를 다 쓴 뒤 **되돌리기** 를 눌렀을 때. 광고를 끝까지 보면 `onReward()`, 중간에 닫으면 `onFail()`.

광고 SDK 를 붙이기 전에는 두 함수 모두 콜백을 즉시 실행하므로 게임은 그대로 동작합니다.
`game.js` 보다 **먼저** 아래처럼 정의하면 됩니다.

구글 H5 Games Ads(애드센스 계정 필요) 예시:

```html
<script async data-ad-frequency-hint="30s"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
        crossorigin="anonymous"></script>
<script>
  window.adsbygoogle = window.adsbygoogle || [];
  const adBreak = window.adBreak = (o) => adsbygoogle.push(o);
  const adConfig = window.adConfig = (o) => adsbygoogle.push(o);
  adConfig({ preloadAdBreaks: 'on', sound: 'on' });

  window.AdBridge = {
    showInterstitial(done) {
      adBreak({ type: 'next', name: 'restart', adBreakDone: () => done() });
    },
    showRewarded(onReward, onFail) {
      let rewarded = false;
      adBreak({
        type: 'reward', name: 'undo',
        beforeReward: (showAdFn) => showAdFn(),
        adViewed: () => { rewarded = true; },
        adDismissed: () => {},
        adBreakDone: () => (rewarded ? onReward() : onFail()),
      });
    },
  };
</script>
<script src="game.js"></script>
```

### 3. 승인 전에 확인할 것

- 애드센스는 `*.github.io` 같은 공유 서브도메인을 사이트로 등록할 수 없습니다. GitHub Pages 에 **개인 도메인**을 연결한 뒤 그 도메인으로 신청하세요.
- 게임만 있는 페이지는 "콘텐츠 부족"으로 거절되기 쉬워 `index.html` 하단에 게임 방법·팁·FAQ 텍스트를 넣어 두었습니다. 개인정보처리방침 페이지도 함께 두면 좋습니다.
- 광고를 게임 버튼 바로 옆에 두거나 클릭을 유도하면 정책 위반입니다. 전면광고는 지금처럼 라운드가 끝난 뒤에만 띄우세요.
