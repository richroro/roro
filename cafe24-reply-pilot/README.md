# AI 답변 도우미 (cafe24-reply-pilot)

카페24 앱스토어용 관리자 앱. 상품문의·후기·1:1 게시판의 **미답변 글**을 모아, 매장 정책과 상품·주문 정보를 근거로 **답변 초안**을 만들고, 운영자가 확인한 뒤 버튼 한 번으로 카페24 게시판에 **답변글/댓글로 게시**합니다.

왜 이 서비스인지(시장·경쟁·후보 비교)는 [`docs/market-analysis.md`](docs/market-analysis.md)에, 앱스토어 등록 절차는 [`docs/app-store-submission.md`](docs/app-store-submission.md)에, 사용한 카페24 API 형태와 검증 근거는 [`docs/cafe24-api-notes.md`](docs/cafe24-api-notes.md)에 정리했습니다.

## 동작 흐름

```
카페24 관리자 ──앱 실행(HMAC 서명 URL)──▶ /app/launch ──▶ OAuth 동의 ──▶ /oauth/callback (토큰 저장)
                                                                          │
   게시글 등록 웹훅(90033) ─┐                                              ▼
   폴링(POLL_INTERVAL_SEC) ─┴─▶ 미답변 글 수집 ─▶ 근거 수집(상품·주문) ─▶ Claude 초안(JSON) ─▶ 답변 대기함
                                                                          │
                                        운영자 승인(또는 프로 요금제 자동 게시) ─▶ 답변글 / 댓글 등록
```

- **근거 수집**: 글에 연결된 상품(설명·옵션·품절 여부), 회원 글이면 작성자 본인의 최근 90일 주문·배송 상태(송장 포함). 주소·연락처·결제수단은 AI에 전달하지 않습니다.
- **초안**: `카테고리 / 확신도 / 사람 확인 필요 / 답변 / 내부 메모 / 사용한 근거` 구조. 정책에 없는 약속·보상은 `사람 확인 필요`로 표시됩니다.
- **안전장치**: 기본은 승인형. 자동 게시는 프로 요금제 + 확신도 임계값 + 허용 카테고리 + "사람 확인 불필요"를 모두 만족할 때만.

## 요구 사항

- Node.js **22.13 이상** (내장 `node:sqlite` 사용, 별도 DB 서버 불필요)
- 카페24 개발자센터 앱(Client ID / Secret)
- Anthropic API 키 (없으면 규칙 기반 `mock` 제공자로 동작 — 데모/테스트 전용)

## 빠른 시작 (로컬 데모, 카페24 계정 없이)

```bash
cd cafe24-reply-pilot
npm install
cp .env.example .env
# .env 에서 아래만 채우면 됩니다
#   CAFE24_CLIENT_ID=mock-client
#   CAFE24_CLIENT_SECRET=mock-secret
#   CAFE24_API_HOST=http://localhost:4000
#   AI_PROVIDER=mock

npm run mock:cafe24        # 터미널 1: 가짜 카페24 API (게시판·상품·주문·OAuth·과금)
npm run dev                # 터미널 2: 앱 (http://localhost:3000)
npm run demo:launch-url    # 터미널 3: 서명된 앱 실행 URL 출력 → 브라우저로 열기
```

브라우저에서 실행 URL을 열면 OAuth → 설정 화면으로 이어집니다. 게시판을 선택하고 배송/교환 정책을 적은 뒤 저장하고, **답변 대기함 → 지금 동기화**를 누르면 샘플 문의 6건에 대한 초안이 생깁니다. 게시하면 목 서버의 `http://localhost:4000/__mock/state`에서 실제로 전송된 요청을 볼 수 있습니다.

## 운영 배포

1. **카페24 개발자센터**에서 앱 생성 후 다음을 등록합니다.
   - 앱 URL: `https://<도메인>/app/launch`
   - Redirect URL: `https://<도메인>/oauth/callback`
   - 권한(scope): `mall.read_community, mall.write_community, mall.read_product, mall.read_order, mall.read_store`
   - 웹훅: 이벤트 `게시글 등록(90033)`, `앱 삭제(90077)`, `앱 결제(90157)` → `https://<도메인>/webhooks/cafe24`
2. `.env`를 채웁니다. `CAFE24_API_HOST`는 **비워 둡니다**(운영은 `https://{mall_id}.cafe24api.com`).
3. `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY`를 설정합니다. 기본 모델은 `claude-opus-5`, `AI_EFFORT=medium`. 안전 분류기 거절 시 서버측 대체 모델로 자동 재시도하는 `fallbacks: "default"`가 켜져 있으며 `AI_FALLBACKS=off`로 끌 수 있습니다.
4. `npm start`. 프로세스 매니저(pm2, systemd)나 컨테이너로 띄우고 HTTPS 리버스 프록시 뒤에 둡니다(`app.set('trust proxy')` 적용됨). 여러 인스턴스를 띄울 때는 폴링 스케줄러를 한 인스턴스에서만 켜세요(`POLL_INTERVAL_SEC=0`으로 나머지 비활성).
5. 데이터는 `DB_PATH`의 SQLite 파일 하나입니다. 백업 대상에 포함하세요. 토큰이 들어 있으므로 파일 권한을 제한하세요.

## 환경 변수

| 변수 | 설명 |
|---|---|
| `APP_BASE_URL` | 외부에서 접근하는 앱 주소. Redirect URL과 웹훅 주소의 기준 |
| `SESSION_SECRET` | 세션 쿠키·OAuth state·CSRF 서명 키 |
| `CAFE24_CLIENT_ID` / `CAFE24_CLIENT_SECRET` | 개발자센터 앱 인증 정보. Secret은 앱 실행 URL·웹훅 서명 검증에도 사용 |
| `CAFE24_SCOPES` | 설치 시 요청할 권한(콤마 구분) |
| `CAFE24_API_VERSION` | (선택) `X-Cafe24-Api-Version` 고정값 |
| `CAFE24_API_HOST` | (로컬 전용) 목 서버 주소. 운영에서는 비움 |
| `CAFE24_LAUNCH_MAX_SKEW_SEC` | 앱 실행 URL timestamp 허용 오차(기본 7200) |
| `AI_PROVIDER` | `claude` 또는 `mock` |
| `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_EFFORT`, `AI_FALLBACKS` | Claude 설정 |
| `DB_PATH` | SQLite 파일 경로 |
| `POLL_INTERVAL_SEC` | 폴링 주기(초). 0이면 웹훅만 사용 |
| `MAX_DRAFTS_PER_SYNC` | 한 번의 동기화에서 생성할 최대 초안 수(비용 상한) |
| `WEBHOOK_REQUIRE_SIGNATURE` | 웹훅 서명 검증 필수 여부(운영 true) |

## 프로젝트 구조

```
src/
  server.js            진입점 (설정·DB·AI 제공자·스케줄러)
  app.js               Express 앱 팩토리 (테스트 주입 가능)
  config.js            환경 변수 → 설정
  db.js                SQLite 스키마와 저장소 (malls, settings, drafts, events)
  plans.js             요금제와 월간 한도
  scheduler.js         폴링 동기화
  cafe24/hmac.js       앱 실행 URL·웹훅 서명 검증
  cafe24/oauth.js      인가 URL, 토큰 교환/갱신, state 서명
  cafe24/client.js     Admin API 클라이언트 (Bearer, 버전 헤더, 401 갱신, 429 백오프)
  cafe24/status.js     주문 상태 코드 → 한국어, 주문 요약
  ai/schema.js         초안 JSON Schema + 검증
  ai/prompt.js         시스템/사용자 프롬프트 (시스템은 캐시 친화적으로 고정)
  ai/claude.js         Claude 제공자 (구조화 출력, fallbacks, refusal 처리)
  ai/mock.js           규칙 기반 제공자 (데모·테스트)
  services/context.js  상품·주문 근거 수집
  services/drafter.js  초안 생성·자동 게시 판정
  services/publisher.js 답변글/댓글 요청 생성·게시
  services/inbox.js    미답변 수집 → 초안 → (자동)게시 파이프라인
  web/routes.js        HTTP 라우트 (launch, oauth, dashboard, inbox, settings, billing, webhook)
  web/views.js         서버 렌더링 HTML (한국어 UI)
  web/session.js       서명 쿠키 세션, CSRF
scripts/
  mock-cafe24.js       로컬 데모용 가짜 카페24 API
  demo-launch-url.js   서명된 앱 실행 URL 생성
test/                  node:test (HMAC, OAuth, 클라이언트, AI, 서비스, 라우트 통합)
docs/                  시장 분석, 앱스토어 등록 체크리스트, API 검증 노트
```

## 테스트

```bash
npm test
```

카페24 API는 `fetch`를 주입해 흉내 내므로 네트워크 없이 실행됩니다. Claude 제공자는 SDK 클라이언트를 주입해 요청 형태(모델, 구조화 출력, fallbacks, 캐시 제어)만 검증합니다.

## 알려진 제한 / 다음 단계

- 카페24 개발자센터 문서는 이 저장소를 만든 환경에서 직접 열 수 없어, 공개 클라이언트 패키지의 타입 정의로 API 형태를 교차 검증했습니다. 실제 몰에서 첫 연동 시 `docs/cafe24-api-notes.md`의 "가정" 항목을 우선 확인하세요.
- 답변글 등록 후 원글의 `reply_status`가 카페24 쪽에서 자동으로 `C`로 바뀌는지 확인이 필요합니다. 앱은 자체 DB로도 게시 상태를 추적하므로 중복 초안은 생기지 않습니다.
- 요금제 활성화는 리턴 URL만 믿지 않고 `/admin/appstore/payments` 조회 결과로 판단합니다. 결제 웹훅(90157) 수신 시 자동 활성화 로직은 이벤트 기록까지만 구현돼 있습니다.
