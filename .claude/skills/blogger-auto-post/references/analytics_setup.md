# 글별(per-post) 조회수를 보려면 — Google Analytics 연동

## 왜 필요한가
블로거 API는 **블로그 전체 조회수만** 제공한다(전체/30일/7일). 어떤 글이 잘
읽혔는지 **글 단위 데이터는 API로 안 나온다.** 블로거 대시보드의 "인기 게시물"도
API로는 노출되지 않는다.

그래서 `stats.py` 는 전체 조회수를 매일 스냅샷으로 쌓고, 그 증가분을 그 사이
발행한 글의 라벨에 배분해 **주제별 성과를 추정**한다. 트래픽이 쌓일수록 쓸 만해지지만,
정확한 글별/유입경로 데이터가 필요하면 아래 Google Analytics(GA4)를 연동한다.

## GA4 연동 (한 번만)
1. https://analytics.google.com 에서 GA4 속성을 만든다(계정 → 속성 → 데이터 스트림 '웹').
2. 생성된 **측정 ID**(G-XXXXXXXXXX)를 복사한다.
3. 블로거 관리자 → **설정 → 기타 → Google Analytics 속성 ID** 에 붙여넣고 저장.
4. 하루 이틀 지나 데이터가 쌓이면, GA4에서 페이지별(URL별) 조회수·체류시간·유입경로를
   볼 수 있다. → 이게 "사람들이 원하는 방향"의 가장 정확한 신호다.

## (선택) GA 데이터를 이 스킬로 가져오려면
GA4 Data API 를 쓰면 per-URL 조회수를 코드로 가져와 stats.py 에 합칠 수 있다.
필요해지면 그때 구성한다:
- Google Cloud 프로젝트에서 **Google Analytics Data API** 사용 설정
- 서비스 계정 또는 기존 OAuth 확장, GA4 속성에 뷰 권한 부여
- 엔드포인트: `properties/{propertyId}:runReport` (dimension: pagePath, metric: screenPageViews)

지금 단계(트래픽 소량)에서는 굳이 필요 없다. 외부 수요 리서치 + 자체 조회수
누적으로 충분히 방향을 잡을 수 있다.
