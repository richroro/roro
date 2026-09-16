---
name: market-site
description: 경제 뉴스와 주식/지수 시세를 결합한 정적 대시보드 사이트를 만든다. GitHub Actions가 서버 쪽에서 Yahoo Finance 시세와 RSS 뉴스를 가져와 data.json을 주기적으로 갱신하고, 프론트엔드는 그 로컬 JSON만 읽어 CORS 문제 없이 안정적으로 동작한다. "경제 뉴스랑 주식 정보 사이트 만들어줘", "증시 대시보드 만들어줘", "뉴스+시세 사이트", "코스피 코스닥 환율 보여주는 페이지" 같은 요청에 사용한다.
---

# 경제 뉴스 + 증시 대시보드 사이트

뉴스 헤드라인과 지수/환율/관심종목 시세를 한 페이지에 보여주는 정적 사이트를 만든다.
루트의 `market/` 폴더가 이 스킬로 만든 참고 구현체다 — 막히면 그 폴더를 그대로 참고한다.

## 왜 이런 구조인가 (건너뛰지 말 것)

브라우저에서 Yahoo Finance API를 직접 `fetch()`하면 CORS 헤더가 없어서 막힌다.
`corsproxy.io`, `allorigins.win` 같은 무료 CORS 우회 프록시로 실측 테스트해봤는데
403/520/타임아웃이 빈번해 신뢰할 수 없었다. 그래서:

- **데이터 수집은 항상 서버 쪽(GitHub Actions)에서** 한다 — CORS가 애초에 적용되지 않는다.
- 결과를 `{{SITE_DIR}}/data.json` 이라는 **정적 파일**로 커밋한다.
- 프론트엔드는 같은 출처의 로컬 JSON만 `fetch()` 한다 — 항상 안정적으로 동작.

이 순서를 바꿔서 브라우저가 외부 API를 직접 부르게 만들지 말 것. 과거에 실측으로 불안정함이
확인됐다.

## 만드는 순서

1. **사이트 폴더 이름 정하기.** 기본값은 `market`. 사용자가 다른 이름/주제를 원하면
   (예: 암호화폐 시세용 `crypto`) 그 이름으로 아래 `{{SITE_DIR}}`를 치환한다.

2. **템플릿 복사.**
   ```
   templates/index.html            → <SITE_DIR>/index.html
   templates/style.css             → <SITE_DIR>/style.css
   templates/app.js                → <SITE_DIR>/app.js
   templates/update_market_data.py → scripts/update_<SITE_DIR>_data.py
   templates/workflow.yml          → .github/workflows/update-<SITE_DIR>.yml
   ```
   `index.html`의 `{{SITE_TITLE}}` / `{{SITE_DESCRIPTION}}` / `{{SITE_H1}}` /
   `{{SITE_SUBTITLE}}` / `{{NEWS_SOURCE_NAMES}}`, 그리고 python 스크립트와 workflow의
   `{{SITE_DIR}}` 를 실제 값으로 치환한다. `app.js`, `style.css`는 그대로 복사하면 된다
   (범용 렌더러라 사이트별 수정 불필요).

3. **심볼/피드 커스터마이징.** 복사한 `scripts/update_<SITE_DIR>_data.py` 상단
   `INDICES`/`FX`/`STOCKS`/`NEWS_FEEDS` 를 사용자 요청에 맞게 채운다. Yahoo Finance
   심볼 형식은 스크립트 안 주석 참고. RSS 피드는 실제로 curl 등으로 200이 오는지
   확인 후 넣는다 (예: 매일경제 RSS는 403으로 막혀 있었음 — 연합뉴스/한국경제는 확인됨).

4. **로컬 테스트 (필수).**
   ```bash
   python scripts/update_<SITE_DIR>_data.py
   ```
   `<SITE_DIR>/data.json`이 만들어지면 내용을 확인한다 (지수/환율/종목 개수, 뉴스 개수,
   `[warn]` 로그 유무). 그다음 정적 서버로 렌더링을 확인한다:
   ```bash
   cd <SITE_DIR> && python -m http.server 8791
   ```
   브라우저 자동화 도구(`chromium-cli` 등)가 있으면 그걸로 스크린샷까지 찍어 확인하고,
   없으면 로컬 브라우저로 열어서 사용자에게 직접 확인을 요청한다 — 화면을 못 본 채로
   "완료"라고 보고하지 않는다.

5. **GitHub Actions 워크플로 안내.** `.github/workflows/update-<SITE_DIR>.yml`은
   저장소에 **push된 이후에만** 스케줄이 동작한다 (GitHub 서버가 기본 브랜치 기준으로
   cron을 돌리기 때문). 커밋/푸시는 사용자 승인 후에만 한다.

6. **GitHub Pages 안내.** Pages 활성화는 저장소 Settings 변경이라 직접 켤 수 없다.
   저장소 Settings → Pages → `main` 브랜치 배포 활성화하면
   `https://<username>.github.io/<repo>/<SITE_DIR>/` 에서 볼 수 있다고 안내만 한다.

## 데이터 스키마 (`data.json`)

```json
{
  "updatedAt": "ISO8601 (KST)",
  "indices": [{"symbol": "^KS11", "name": "KOSPI", "price": 0, "change": 0, "changePercent": 0, "currency": "KRW"}],
  "fx": [{"symbol": "KRW=X", "name": "USD/KRW", "price": 0, "change": 0, "changePercent": 0, "currency": "KRW"}],
  "stocks": [{"symbol": "005930.KS", "name": "삼성전자", "price": 0, "change": 0, "changePercent": 0, "currency": "KRW"}],
  "news": [{"title": "...", "link": "...", "pubDate": "RFC822", "source": "연합뉴스"}]
}
```
`app.js`는 이 스키마를 그대로 기대한다 — 필드명을 바꾸면 렌더링 로직도 같이 고쳐야 한다.

## 알려진 제약

- Yahoo Finance 비공식 API라 언젠가 막힐 수 있다. 그 경우 `update_*.py`의
  `fetch_quote()`만 다른 소스로 교체하면 된다 (프론트엔드는 영향 없음).
- 한 섹션 전체가 실패하면(예: Yahoo 전체 다운) 이전 `data.json` 값을 그대로 유지한다 —
  화면이 갑자기 텅 비지 않는다.
- 무료 RSS는 종종 경제 외 일반 뉴스가 섞여 들어온다(예: 연합뉴스 경제 피드에 부고 기사
  포함). 품질이 중요하면 `fetch_news()`에서 제목 키워드 필터링을 추가로 넣는다.
