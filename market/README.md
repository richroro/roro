# 마켓 브리핑

경제 뉴스와 증시 시세(코스피·코스닥·환율·관심 종목)를 한 페이지에서 보여주는 정적 사이트.

## 구조

```
market/
├── index.html      ← 페이지 마크업
├── style.css        ← 스타일
├── app.js           ← data.json을 불러와 렌더링
└── data.json        ← 실제 데이터 (자동 갱신됨, 수동 편집 금지)

scripts/
└── update_market_data.py   ← Yahoo Finance 시세 + 연합뉴스·한국경제 RSS를 읽어 market/data.json을 다시 씀

.github/workflows/
└── update-market.yml       ← 매시 5분에 위 스크립트를 실행하고 변경이 있으면 자동 커밋·푸시
```

## 데이터가 갱신되는 방식

브라우저에서 외부 API를 직접 호출하면 CORS 때문에 자주 실패해서, 대신 GitHub Actions가
**서버 쪽에서** 데이터를 가져와 `market/data.json`에 커밋하는 방식을 씁니다. 프론트엔드는
이 로컬 JSON 파일만 읽으므로 항상 안정적으로 동작합니다.

- 자동 실행: 매시 5분 (`.github/workflows/update-market.yml`의 cron)
- 수동 실행: GitHub 저장소 → Actions → "Update market data" → Run workflow
- 로컬 테스트: `python scripts/update_market_data.py`

## 관심 종목 / 지수 바꾸기

`scripts/update_market_data.py` 상단의 `INDICES`, `FX`, `STOCKS` 리스트에 Yahoo Finance
심볼(예: `005930.KS`, `AAPL`)과 표시할 이름을 추가/삭제하면 됩니다.

## 뉴스 소스 바꾸기

`NEWS_FEEDS` 리스트에 RSS 주소를 추가/삭제하면 됩니다. CORS 걱정 없이 아무 RSS나 추가할 수
있습니다 (서버 쪽에서 가져오기 때문).

## GitHub Pages로 배포

저장소 Settings → Pages에서 `main` 브랜치 배포를 켜면
`https://<username>.github.io/<repo>/market/` 에서 바로 볼 수 있습니다.
