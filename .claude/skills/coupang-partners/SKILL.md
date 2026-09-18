---
name: coupang-partners
description: 쿠팡 파트너스(제휴 마케팅) 링크·상품 블록을 만들고 실적을 확인한다. "쿠팡파트너스", "쿠팡 링크 넣어줘", "제휴 링크 만들어줘", "이 글에 상품 추천 넣어줘", "쿠팡 수익 확인", "이 쿠팡 주소 제휴 링크로 바꿔줘", "베스트 상품/골드박스 글 써줘" 같은 요청에 사용한다. 블로거 글에 상품 링크를 넣을 때는 blogger-auto-post 와 함께 쓴다.
---

# 쿠팡 파트너스 (Coupang Partners Open API)

블로그 글에 **쿠팡 상품 링크(제휴 링크)** 를 넣어 구매가 일어나면 수수료를 받는 구조를 만든다.
이 스킬은 (1) 키워드로 상품을 찾아 제휴 링크가 붙은 **상품 블록 HTML** 을 만들고,
(2) 쿠팡 URL 을 **딥링크(제휴 링크)** 로 바꾸며, (3) **실적 리포트** 를 조회한다.
발행 자체는 `blogger-auto-post` 스킬이 맡고, 그쪽 `publish.py` / `add_to_queue.py` 가
쿠팡 링크를 감지하면 **필수 고지 문구를 자동으로 본문 맨 위에 넣는다.**

표준 라이브러리만 쓰므로 추가 설치가 필요 없다.

## 언제 이 스킬을 쓰는가
- "이 글에 관련 상품 링크 넣어줘 / 쿠팡 링크 붙여줘" — 검색 → 블록 생성 → 본문 삽입
- "이 쿠팡 주소를 제휴 링크로 바꿔줘" — `deeplink.py`
- "재테크 책 베스트 / 오늘의 골드박스 특가 글 써줘" — `best.py` 로 목록 → 글 작성
- "쿠팡 수익/클릭 얼마나 나왔어?" — `report.py`
- "쿠팡파트너스 설정해줘 / 되는지 확인해줘" — `setup_check.py` → 안 되면 `references/coupang_setup.md` 안내

## 최초 1회 설정 (안 되어 있으면 먼저 안내)
`secrets/.env` 가 없거나 비어 있으면 API 는 못 쓴다. 먼저 상태를 본다:
```bash
python .claude/skills/coupang-partners/scripts/setup_check.py
```
- 키가 없으면 **스크립트를 더 돌리지 말고** `references/coupang_setup.md` 순서를 안내한다.
  핵심: 파트너스 가입 → 채널 등록 → 활동(누적 실적 15만원) → **최종 승인** → 대시보드
  [링크 생성 → API] 에서 Access/Secret Key 발급 → `secrets/.env.example` 을 `.env` 로 복사해 입력.
- **키가 아직 없어도 할 수 있는 것:** 파트너스 사이트의 "간편 링크 만들기"로 사용자가 만든
  `https://link.coupang.com/a/...` 링크를 받아 `render.py --item` 으로 상품 블록을 만든다.
  고지 문구 자동 삽입도 링크만 있으면 동작한다.

## 워크플로 A — 블로그 글에 상품 블록 넣기 (가장 흔한 경로)
1. 글 주제와 맞는 **구체적 상품 키워드** 를 1~2개 정한다 (예: 가계부 글 → "가계부", "가계부 노트").
   주제와 무관한 상품은 넣지 않는다. 글 하나에 상품은 **1~3개** 면 충분하다.
2. 검색해서 후보를 본다 (캐시가 있어 같은 키워드 반복 호출은 API 를 안 쓴다):
   ```bash
   python .claude/skills/coupang-partners/scripts/search.py --keyword "가계부" --limit 5
   ```
3. 마음에 드는 후보를 골라 블록 HTML 을 만든다:
   ```bash
   python .claude/skills/coupang-partners/scripts/search.py --keyword "가계부" --format json --out "<임시경로>/products.json"
   python .claude/skills/coupang-partners/scripts/render.py --from "<임시경로>/products.json" --pick 1,3 \
       --heading "함께 보면 좋은 가계부" --out "<임시경로>/block.html"
   ```
   본문 중간에 텍스트 링크만 넣고 싶으면 `--style list`.
4. 글 본문(HTML 조각)의 **관련 문단 바로 아래 또는 글 끝** 에 `block.html` 내용을 붙인다.
   글 도입부에 상품을 몰아넣지 않는다 (검색 노출·신뢰도에 불리).
5. 평소처럼 `blogger-auto-post` 의 `publish.py` 나 `add_to_queue.py` 로 발행/큐 추가.
   고지 문구는 발행 스크립트가 **본문 맨 위** 에 자동으로 넣는다(블록에는 기본 미포함).
   `daily_post.py --dry-run` 의 "쿠팡 링크: 있음" 표시로 한 번 확인한다.

## 워크플로 B — 쿠팡 URL 을 제휴 링크로
사용자가 상품 페이지 주소를 주면:
```bash
python .claude/skills/coupang-partners/scripts/deeplink.py "https://www.coupang.com/vp/products/1234567" "https://www.coupang.com/vp/products/7654321"
```
나온 `link.coupang.com/a/...` 링크를 본문 `<a href>` 에 쓴다. 여러 개면 한 번에 넘긴다.

## 워크플로 C — 베스트 / 골드박스 기획 글
```bash
python .claude/skills/coupang-partners/scripts/best.py --list-categories
python .claude/skills/coupang-partners/scripts/best.py --category 1019 --limit 5 --format html --heading "이번 주 많이 팔린 재테크 책" --out "<임시경로>/block.html"
python .claude/skills/coupang-partners/scripts/best.py --goldbox --limit 6 --format html --out "<임시경로>/goldbox.html"
```
골드박스는 **하루 단위로 바뀌는 특가** 라 큐에 며칠 묵히면 링크가 죽을 수 있다.
골드박스 글은 `publish.py` 로 **당일 바로 발행** 하고, 큐에는 넣지 않는다.

## 워크플로 D — 실적 확인
```bash
python .claude/skills/coupang-partners/scripts/report.py --days 7
python .claude/skills/coupang-partners/scripts/report.py --days 30 --kind commission
```
`subId` 별로 잡히므로 블로그(`blog`)·스레드(`threads`) 등 채널별 성과를 비교할 수 있다.
`blog-manager` 에이전트는 이 숫자를 보고 "상품 링크가 잘 먹히는 글 계열"을 판단한다.

## 반드시 지킬 규칙
- **고지 문구:** 쿠팡 링크가 있는 글에는 `이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`
  가 눈에 띄게 있어야 한다(공정위 지침 + 쿠팡 운영정책). 문구를 바꾸거나 숨기지 않는다.
  블로거 발행 스크립트가 본문 맨 위에 자동 삽입한다. 다른 채널(스레드·정적 사이트)에 붙일 때는
  `render.py --with-disclosure` 로 블록 끝에 포함하거나 직접 넣는다.
- **상품 1~3개, 주제 관련성:** 글 내용과 무관한 상품, 과장 표현("무조건", "최저가 보장"), 써 보지 않은
  상품에 대한 허위 후기는 금지. 정보 글 안에 "관련 상품" 으로 자연스럽게 소개한다.
- **링크는 그대로:** API 가 준 `productUrl` / `shortenUrl` 을 변형하거나 파라미터를 지우지 않는다.
  링크 단축 서비스로 다시 감싸지 않는다. `rel="nofollow sponsored"` 는 렌더러가 이미 넣는다.
- **자기 구매 금지:** 본인 링크로 본인이 구매하면 계정 정지 사유다.
- **호출 제한:** 검색 API 는 시간당 약 10회. 같은 키워드는 캐시(`cache/`, 6시간)를 쓰고,
  한 세션에서 키워드를 남발하지 않는다. `--no-cache` 는 꼭 필요할 때만.
- **비밀 유지:** `secrets/.env` 는 git 에 올라가지 않는다. 키를 대화/커밋/로그에 적지 않는다.

## 파일 구조
- `scripts/common.py` — 키 로딩, HMAC 서명, API 호출, 캐시, 상품 정규화, HTML 렌더, 고지 문구
- `scripts/search.py` — 키워드 검색 (text/json/html/list 출력)
- `scripts/best.py` — 카테고리 베스트 / 골드박스 / 카테고리 목록
- `scripts/deeplink.py` — 쿠팡 URL → 제휴 딥링크
- `scripts/render.py` — 상품 목록(JSON 또는 수동 `--item`) → 블로그용 HTML 블록
- `scripts/report.py` — 클릭/주문/수익/취소 리포트
- `scripts/setup_check.py` — 설정 점검 + API 1회 호출 테스트
- `references/coupang_setup.md` — 가입·승인·키 발급·규정 가이드
- `secrets/.env.example` — 키 파일 양식 (`.env` 는 git 제외)
- `tests/test_coupang.py` — 서명·고지·렌더 단위 테스트 (`python -m unittest discover -s .claude/skills/coupang-partners/tests`)
