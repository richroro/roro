# 카페24 API 검증 노트

이 저장소를 만든 환경에서는 `developers.cafe24.com`이 네트워크 정책으로 차단되어 공식 문서를 직접 열 수 없었다. 대신 공식 문서를 바탕으로 생성·유지되는 공개 npm 패키지의 타입/엔드포인트 정의를 내려받아 교차 확인했다.

- `@gracefullight/mcp-cafe24-admin` 0.2.2 (2026-02): 19개 섹션의 Admin API 엔드포인트·zod 스키마
- `cafe24-api-client` 1.8.4: 문서 TOC에서 생성된 전체 엔드포인트 카탈로그와 응답 타입
- `cafe24-webhook` 1.2.0: 웹훅 이벤트 번호 ↔ 페이로드 타입

## 확인된 형태 (구현에 그대로 사용)

| 항목 | 값 | 근거 |
|---|---|---|
| API 베이스 | `https://{mall_id}.cafe24api.com/api/v2` | 두 패키지 공통 |
| 인가 URL | `/oauth/authorize?response_type=code&client_id&state&redirect_uri&scope` | mcp-cafe24-admin `auth.ts` |
| 토큰 발급/갱신 | `POST /oauth/token`, `Authorization: Basic base64(client_id:client_secret)`, form `grant_type=authorization_code|refresh_token` | 동일 |
| 토큰 응답 | `access_token, expires_at, refresh_token, refresh_token_expires_at, client_id, mall_id, user_id, scopes, issued_at` | 동일 |
| 토큰 수명 | 액세스 2시간, 리프레시 2주 | 웹 검색(개발자센터 요약) |
| 권한 이름 | `mall.read_community`, `mall.write_community`, `mall.read_product`, `mall.read_order`, `mall.read_store` 등 | `auth.ts` ALL_SCOPES |
| 게시판 목록 | `GET /admin/boards?shop_no` → `boards[]` (`board_no, board_name, reply_feature, use_comment, use_board` …) | `types/board.ts` |
| 게시글 목록 | `GET /admin/boards/{board_no}/articles` 파라미터 `reply_status(N/P/C), comment(T/F), is_display, product_no, start_date, end_date, offset, limit(≤100)` | `schemas/board-article.ts` |
| 게시글 필드 | `article_no, parent_article_no, product_no, member_id, writer, title, content, rating, reply, reply_status, reply_depth, secret, display, deleted, notice, created_date` | `types/board-article.ts` |
| 답변글 등록 | `POST /admin/boards/{board_no}/articles` `{ shop_no, requests: [{ writer, title, content, client_ip, reply_article_no, reply, reply_status, secret, product_no, … }] }` | `schemas/board-article.ts` (writer/title/content/client_ip 필수) |
| 댓글 등록 | `POST /admin/boards/{board_no}/articles/{article_no}/comments` `{ shop_no, request: { content, writer, password, secret, input_channel, … } }` | `schemas/board-comment.ts` (password 필수) |
| 상품 조회 | `GET /admin/products/{product_no}` → `product{ product_name, price, selling, display, description, summary_description, simple_description, shipping_info, exchange_info, product_tag, … }` | `cafe24-api-client` 응답 타입 |
| 주문 목록 | `GET /admin/orders?member_id&start_date&end_date&embed=items&limit` → `orders[]{ order_id, member_id, order_date, paid, canceled, items[] }` | `schemas/order.ts`, 응답 타입 |
| 앱스토어 결제 | `POST /admin/appstore/orders { request: { order_name, order_amount, return_url, automatic_payment } }` → `order.confirmation_url`; `GET /admin/appstore/payments` → `payments[]{ order_id, payment_status: paid|refund, … }` | `types/appstore-*.ts` |
| 웹훅 이벤트 | 90033 게시글 등록, 90034 댓글 등록, 90077 앱 삭제, 90078 앱 만료, 90157 앱 결제. 페이로드 `{ event_no, resource: { mall_id, event_shop_no, board_no, no, … } }` | `cafe24-webhook` event-map, `OnPostCreated` |
| 앱 실행 검증 | `hmac`을 제외한 쿼리스트링을 client_secret으로 HMAC-SHA256 → base64, timestamp ±2시간 | 웹 검색(여러 구현 사례 일치) |

## 가정 (첫 실제 연동 시 확인할 것)

1. **주문 품목 필드명**: `items[].order_status`(N30 등), `shipping_company_name`, `shipping_code`, `option_value`, `product_name`, `quantity`. 널리 쓰이는 이름이지만 이 환경에서 응답 타입 원문을 끝까지 확인하지 못했다. 코드는 옵셔널 체이닝으로 필드가 없어도 동작하며 `src/cafe24/status.js`만 고치면 된다.
2. **답변글 등록 후 원글 `reply_status`**: 카페24가 자동으로 `C`로 바꾸는지 확인. 아니라면 `PUT /admin/boards/{board_no}/articles/{article_no}`로 갱신하는 단계를 `publisher.js`에 추가.
3. **웹훅 서명 헤더**: `X-Cafe24-Hmac-Sha256` = base64(HMAC-SHA256(raw body, client_secret))으로 구현. 헤더명이 다르면 `routes.js`의 `req.get('x-cafe24-hmac-sha256')` 한 곳만 수정.
4. **`X-Cafe24-Api-Version`**: 기본은 헤더를 보내지 않아 앱의 기본 버전을 쓴다. 특정 버전에 고정하려면 `CAFE24_API_VERSION` 설정.
5. **후기 게시판의 미답변 판별**: 댓글 모드에서는 `comment=F`(댓글 없는 글) 필터를 쓴다. 게시판 설정에 따라 `reply_status` 필터가 더 정확할 수 있으므로 설정에서 방식을 바꿀 수 있게 했다.
6. **`client_ip`**: 답변글 등록 필수값. 운영자의 요청 IP(`req.ip`)를 넣고, 자동 게시에서는 서버 루프백 주소를 넣는다.
