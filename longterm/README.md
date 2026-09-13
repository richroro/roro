# 장기투자 노트

주식을 10년 단위로 보고 판단할 때 필요한 정보만 모아 놓은 정적 사이트.
지수 · ETF · 국내외 우량주 45종의 **장기 수익률, 연평균수익률(CAGR), 최대낙폭, 배당 성장,
밸류에이션**을 한 화면에서 비교한다.

`market/`(경제 뉴스 + 실시간 시세)이 "오늘 시장이 어땠나"를 본다면, 이쪽은 "10년 들고 갔으면
어땠나"를 본다.

## 구조

```
longterm/
├── index.html   ← 페이지 마크업 + 체크리스트·용어·자료실 같은 고정 콘텐츠
├── style.css    ← 스타일
├── app.js       ← data.json을 읽어 렌더링 (스파크라인·정렬·복리계산기까지 라이브러리 없이)
└── data.json    ← 실제 데이터 (자동 갱신됨, 수동 편집 금지)

scripts/
└── update_longterm_data.py   ← Yahoo Finance + RSS를 읽어 longterm/data.json을 다시 씀

.github/workflows/
└── update-longterm.yml       ← 하루 2회(KST 07:20 / 19:20) 위 스크립트를 실행하고 자동 커밋
```

## 화면 구성

| 섹션 | 내용 |
| --- | --- |
| 기준선 | 6개 지수의 10년 누적·연평균 수익률과 최대낙폭. 개별 종목을 고를지 판단하는 기준 |
| 스크리너 | 45종의 1/3/5/10년 성과, 배당률, PER, ROE, 고점 대비, 최대낙폭. 정렬·검색·행 클릭 상세 |
| 배당 | 배당수익률 상위 / 5년 배당성장률 상위 |
| 복리 계산 | 적립식 투자 시뮬레이션 (원금 vs 평가액 그래프) |
| 체크리스트 | 매수 전 10문항(브라우저에 체크 상태 저장) + 지표 읽는 법 |
| 뉴스 | 증권·경제 RSS에서 장기투자 키워드로 거른 헤드라인 |
| 자료실 | DART · SEC EDGAR · FRED · 연금 포털 등 원문 링크 |

## 데이터가 갱신되는 방식

브라우저에서 Yahoo Finance를 직접 호출하면 CORS로 막히므로, GitHub Actions가 **서버 쪽에서**
데이터를 받아 `longterm/data.json`에 커밋한다. 프론트엔드는 같은 출처의 이 JSON만 읽는다.

- 자동 실행: 하루 2회 (`.github/workflows/update-longterm.yml`)
- 수동 실행: GitHub 저장소 → Actions → "Update longterm data" → Run workflow
- 로컬 실행: `python scripts/update_longterm_data.py` (45종 수집에 3~5분)
- 로컬 확인: `cd longterm && python -m http.server 8795`

## 수집 항목과 계산 방법

`scripts/update_longterm_data.py`가 종목당 요청 3건을 보낸다.

1. **10년 월봉 + 배당 이력** (`/v8/finance/chart`, `range=10y&interval=1mo&events=div`)
   - 1/3/5/10년 수익률: 현재가 ÷ N년 전 월말 종가
   - CAGR: 같은 구간을 연복리로 환산
   - 최대낙폭(MDD): 10년 월말 종가 기준 고점 대비 최대 하락폭
   - 고점 대비: 10년 안 최고 월말 종가 대비 현재 위치
   - 배당: 최근 12개월 합계, 연도별 합계, 5년 배당성장률(완결된 연도 기준)
2. **직전 거래일 종가** (`range=5d&interval=1d`)
   월봉 차트의 `previousClose`는 *지난달* 종가라 일간 등락률에 쓸 수 없어 따로 받는다.
3. **밸류에이션** (`/v10/finance/quoteSummary`) — PER/PBR/PSR/ROE/시총/베타/배당성향.
   이 엔드포인트는 쿠키+crumb가 있어야 200이 오며, 실패해도 나머지 데이터는 그대로 만든다.

## 종목 바꾸기

`scripts/update_longterm_data.py` 상단 `UNIVERSE` 리스트에 추가/삭제한다.

```python
{"symbol": "MSFT", "name": "Microsoft", "group": "us", "tag": "기술"},
```

`group`은 화면의 필터 칩과 연결된다 — `index`(지수) / `etf` / `us`(미국 주식) / `kr`(국내 주식).
국내 종목은 `005930.KS` 형식, 지수는 `^KS11` 형식을 쓴다.

## 알려진 한계

- **PER · PBR이 국내 종목에서 비어 있는 경우가 많다.** Yahoo가 국내 종목의 `trailingPE`를
  제공하지 않아 선행 PER(`forwardPE`)로 대체하며, 표에서는 `*`로 표시한다. 정확한 값은 상세를
  펼쳐 네이버 증권 링크로 확인하는 편이 낫다.
- **수익률에 배당이 빠져 있다.** 주가 기준 수익률이라 배당까지 포함한 총수익(TR)은 여기에
  배당률만큼 매년 더해 어림해야 한다.
- **Yahoo는 비공식 API다.** 막히면 `fetch_chart()` / `fetch_valuation()`만 다른 소스로
  교체하면 되고, 프론트엔드는 영향을 받지 않는다.
- 한 종목이 실패해도 나머지는 그대로 저장되고, 전체가 실패하면 이전 `data.json`을 유지한다.

## GitHub Pages로 배포

저장소 Settings → Pages에서 `main` 브랜치 배포를 켜면
`https://<username>.github.io/<repo>/longterm/` 에서 볼 수 있다.
