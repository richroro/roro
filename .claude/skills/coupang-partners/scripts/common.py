# -*- coding: utf-8 -*-
"""Shared helpers for the coupang-partners skill.

Coupang Partners Open API 호출에 필요한 공통 로직: 키 로딩, HMAC 서명,
요청/응답 처리, 호출 제한 보호용 캐시, 상품 블록 HTML 렌더링, 필수 고지 문구.
표준 라이브러리만 사용한다 (requests 등 추가 설치 불필요).

API 사양 요약 (developers.coupangcorp.com 파트너스 API 문서 기준):
  - 호스트: https://api-gateway.coupang.com
  - 인증 헤더: Authorization: CEA algorithm=HmacSHA256, access-key=..., signed-date=..., signature=...
  - signed-date: UTC 기준 yyMMdd'T'HHmmss'Z'  (예: 260918T012345Z)
  - signature  : HMAC-SHA256(secret_key, signed-date + METHOD + path + query) 의 hex
                 (query 는 '?' 를 뺀 실제 전송 문자열, path 는 도메인 제외)
  - 응답: {"rCode": "0", "rMessage": "", "data": ...}  (rCode "0" 이 성공)
  - 검색 API 는 시간당 호출 횟수 제한(약 10회)이 있어 결과를 cache/ 에 저장해 재사용한다.
"""
import hashlib
import hmac
import html as _html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Windows 콘솔(cp949)에서 한글/이모지 출력이 깨지지 않도록 UTF-8 로 맞춘다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001 - 구버전/리다이렉트 환경이면 조용히 통과
        pass

SKILL_DIR = Path(__file__).resolve().parent.parent
SECRETS_DIR = SKILL_DIR / "secrets"
ENV_PATH = SECRETS_DIR / ".env"
CACHE_DIR = SKILL_DIR / "cache"

API_HOST = "https://api-gateway.coupang.com"
API_BASE = "/v2/providers/affiliate_open_api/apis/openapi"
PATH_SEARCH = f"{API_BASE}/products/search"
PATH_DEEPLINK = f"{API_BASE}/v1/deeplink"
PATH_BEST = f"{API_BASE}/v1/products/bestcategories/{{category_id}}"
PATH_GOLDBOX = f"{API_BASE}/products/goldbox"
PATH_COUPANG_PL = f"{API_BASE}/products/coupangPL"
PATH_REPORT = f"{API_BASE}/reports/{{kind}}"  # clicks | orders | commission | cancels

# 검색 API 호출 제한 보호: 같은 요청은 이 시간 동안 캐시를 재사용한다.
DEFAULT_CACHE_TTL = 6 * 3600

# 공정위 표시·광고 지침 + 쿠팡 파트너스 운영정책이 요구하는 표준 고지 문구.
# 쿠팡 링크가 들어간 모든 글에 반드시 눈에 띄게 들어가야 한다. 문구를 바꾸지 말 것.
DISCLOSURE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
_DISCLOSURE_CORE = "쿠팡파트너스활동의일환"  # 공백 제거 후 비교용
COUPANG_LINK_RE = re.compile(r"https?://(?:[\w.-]+\.)?(?:coupang\.com|coupa\.ng)(?:/|\?|$)", re.I)

# 베스트 카테고리 API 의 categoryId (쿠팡 파트너스 문서 기준). 바뀌면 여기만 고친다.
CATEGORIES = {
    1001: "여성패션",
    1002: "남성패션",
    1010: "뷰티",
    1011: "출산/유아동",
    1012: "식품",
    1013: "주방용품",
    1014: "생활용품",
    1015: "홈인테리어",
    1016: "가전디지털",
    1017: "스포츠/레저",
    1018: "자동차용품",
    1019: "도서/음반/DVD",
    1020: "완구/취미",
    1021: "문구/오피스",
    1024: "헬스/건강식품",
    1025: "국내여행",
    1026: "해외여행",
    1029: "반려동물용품",
    1030: "유아동패션",
}


class SetupError(RuntimeError):
    """API 키가 없거나 설정이 덜 된 경우."""


class ApiError(RuntimeError):
    """쿠팡 API 가 오류를 돌려준 경우."""


# ---------------------------------------------------------------------------
# 키 로딩 (secrets/.env → 환경변수가 있으면 환경변수 우선)
# ---------------------------------------------------------------------------
def load_env(env_path=None):
    """secrets/.env 의 KEY=VALUE 를 읽는다. 같은 이름의 환경변수가 있으면 그 값이 이긴다
    (GitHub Actions 등에서 Secrets 로 넘길 때 파일 없이 동작하게)."""
    path = Path(env_path) if env_path else ENV_PATH
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            values[key.strip()] = val.strip().strip('"').strip("'")
    for key in ("COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY", "COUPANG_SUB_ID"):
        if os.environ.get(key):
            values[key] = os.environ[key].strip()
    return values


def require_keys():
    env = load_env()
    access_key = env.get("COUPANG_ACCESS_KEY")
    secret_key = env.get("COUPANG_SECRET_KEY")
    if not access_key or not secret_key:
        raise SetupError(
            "쿠팡 파트너스 API 키가 없습니다.\n"
            f"  {ENV_PATH} 에 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 를 채우세요.\n"
            "  (발급 방법: references/coupang_setup.md — 최종 승인된 계정만 발급 가능)\n"
            "  키가 아직 없다면 파트너스 사이트에서 만든 링크를 render.py --item 으로 넣을 수 있습니다."
        )
    return access_key, secret_key


def default_sub_id():
    """링크에 붙일 채널 구분값. .env 의 COUPANG_SUB_ID (없으면 None)."""
    return load_env().get("COUPANG_SUB_ID") or None


# ---------------------------------------------------------------------------
# HMAC 서명
# ---------------------------------------------------------------------------
def signed_date(now=None):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is not None:
        now = now.astimezone(timezone.utc)
    return now.strftime("%y%m%dT%H%M%SZ")


def build_authorization(method, path, query, access_key, secret_key, now=None):
    """Coupang CEA 인증 헤더 값을 만든다. query 는 '?' 없는 인코딩된 쿼리 문자열."""
    date = signed_date(now)
    message = date + method.upper() + path + (query or "")
    signature = hmac.new(
        secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return (
        f"CEA algorithm=HmacSHA256, access-key={access_key}, "
        f"signed-date={date}, signature={signature}"
    )


def encode_query(params):
    """None/빈 값은 빼고 URL 인코딩한다. 서명에도 이 문자열을 그대로 쓴다."""
    clean = {k: v for k, v in (params or {}).items() if v not in (None, "")}
    return urllib.parse.urlencode(clean) if clean else ""


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def api_request(method, path, params=None, body=None, timeout=30):
    access_key, secret_key = require_keys()
    query = encode_query(params)
    url = API_HOST + path + (f"?{query}" if query else "")
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method.upper(),
        headers={
            "Authorization": build_authorization(method, path, query, access_key, secret_key),
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")[:300]
        if e.code == 429:
            raise ApiError(
                "호출 제한에 걸렸습니다 (검색 API 는 시간당 약 10회). "
                "잠시 후 다시 시도하거나 캐시된 결과를 쓰세요."
            ) from e
        if e.code in (401, 403):
            raise ApiError(
                f"인증 실패 (HTTP {e.code}). ACCESS_KEY/SECRET_KEY 가 맞는지, "
                f"PC 시각이 정확한지(UTC 기준 서명) 확인하세요. 응답: {text}"
            ) from e
        raise ApiError(f"HTTP {e.code}: {text}") from e
    except urllib.error.URLError as e:
        raise ApiError(f"네트워크 오류: {e.reason}") from e

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ApiError(f"JSON 이 아닌 응답: {raw[:200]}") from e
    if str(payload.get("rCode", "0")) != "0":
        raise ApiError(f"API 오류 rCode={payload.get('rCode')} rMessage={payload.get('rMessage')}")
    return payload


def cached_get(path, params=None, ttl=DEFAULT_CACHE_TTL, use_cache=True):
    """GET 결과를 cache/ 에 저장해 같은 요청을 반복하지 않는다.
    반환: (payload, from_cache)."""
    key_src = f"GET {path}?{json.dumps(params or {}, sort_keys=True, ensure_ascii=False)}"
    cache_file = CACHE_DIR / (hashlib.sha1(key_src.encode("utf-8")).hexdigest() + ".json")
    if use_cache and cache_file.exists() and (time.time() - cache_file.stat().st_mtime) < ttl:
        try:
            return json.loads(cache_file.read_text(encoding="utf-8")), True
        except Exception:  # noqa: BLE001 - 깨진 캐시는 무시하고 새로 받는다
            pass
    payload = api_request("GET", path, params)
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    except Exception as e:  # noqa: BLE001 - 캐시 실패는 치명적이지 않다
        print(f"[cache] 저장 실패: {e}", file=sys.stderr)
    return payload, False


# ---------------------------------------------------------------------------
# 상품 데이터 정규화 (검색/베스트/골드박스 응답을 같은 모양으로)
# ---------------------------------------------------------------------------
def normalize_products(payload):
    """검색 응답은 data.productData 에, 베스트/골드박스는 data 에 바로 리스트가 온다.
    반환: (products, landing_url)."""
    data = payload.get("data")
    landing_url = None
    if isinstance(data, dict):
        items = data.get("productData") or []
        landing_url = data.get("landingUrl")
    else:
        items = data or []
    products = []
    for p in items:
        if not isinstance(p, dict):
            continue
        products.append(
            {
                "productId": p.get("productId"),
                "name": p.get("productName"),
                "price": p.get("productPrice"),
                "image": p.get("productImage"),
                "url": p.get("productUrl"),
                "isRocket": bool(p.get("isRocket")),
                "isFreeShipping": bool(p.get("isFreeShipping")),
                "category": p.get("categoryName"),
                "rank": p.get("rank"),
                "keyword": p.get("keyword"),
            }
        )
    return products, landing_url


def format_price(value):
    try:
        return f"{int(float(value)):,}원"
    except (TypeError, ValueError):
        return ""


# ---------------------------------------------------------------------------
# 고지 문구
# ---------------------------------------------------------------------------
def has_coupang_link(html_text):
    return bool(COUPANG_LINK_RE.search(html_text or ""))


def has_disclosure(html_text):
    compact = re.sub(r"\s+", "", html_text or "")
    return _DISCLOSURE_CORE in compact


def disclosure_html():
    return (
        '<p class="coupang-disclosure" style="font-size:0.85em;color:#777;margin:8px 0 16px;">'
        f"{DISCLOSURE}</p>"
    )


def ensure_disclosure(html_text):
    """쿠팡 링크가 있는데 고지 문구가 없으면 본문 맨 위에 넣는다. 이미 있으면 그대로."""
    if not has_coupang_link(html_text) or has_disclosure(html_text):
        return html_text
    return disclosure_html() + "\n" + (html_text or "")


# ---------------------------------------------------------------------------
# HTML 렌더링 (블로거 본문에 그대로 붙일 수 있게 인라인 스타일만 사용)
# ---------------------------------------------------------------------------
def _esc(value):
    return _html.escape(str(value if value is not None else ""), quote=True)


def _shorten(text, limit):
    text = (text or "").strip()
    if limit and len(text) > limit:
        return text[: limit - 1].rstrip() + "…"
    return text


def render_products_html(products, heading=None, style="cards", disclosure=False, max_name=60):
    """상품 목록 → 블로그 본문용 HTML 조각.

    style="cards": 이미지+이름+가격 카드 그리드 (2열, 모바일 자동 줄바꿈)
    style="list" : 텍스트 링크 목록 (이미지 없음, 본문 중간 삽입용)
    disclosure   : True 면 블록 끝에 고지 문구를 붙인다. 블로거 발행 경로에서는
                   publish.py/add_to_queue.py 가 본문 맨 위에 넣으므로 기본 False.
                   스레드·정적 사이트 등 다른 곳에 붙일 때만 True 로.
    """
    if not products:
        raise ValueError("렌더링할 상품이 없습니다.")

    parts = ['<div class="coupang-products" style="margin:24px 0;">']
    if heading:
        parts.append(f'<h3 style="margin:0 0 12px;font-size:1.1em;">{_esc(heading)}</h3>')

    if style == "list":
        parts.append('<ul style="padding-left:20px;margin:0;">')
        for p in products:
            price = format_price(p.get("price"))
            tail = f" — {price}" if price else ""
            rocket = " 🚀" if p.get("isRocket") else ""
            parts.append(
                f'<li style="margin:4px 0;"><a href="{_esc(p.get("url"))}" target="_blank" '
                f'rel="nofollow sponsored noopener">{_esc(_shorten(p.get("name"), max_name))}</a>'
                f"{_esc(tail)}{rocket}</li>"
            )
        parts.append("</ul>")
    else:
        parts.append('<div style="display:flex;flex-wrap:wrap;gap:12px;">')
        for p in products:
            name = _shorten(p.get("name"), max_name)
            price = format_price(p.get("price"))
            badges = []
            if p.get("isRocket"):
                badges.append("🚀 로켓배송")
            if p.get("isFreeShipping"):
                badges.append("무료배송")
            img = ""
            if p.get("image"):
                img = (
                    f'<img src="{_esc(p["image"])}" alt="{_esc(name)}" loading="lazy" '
                    'style="width:100%;height:auto;border-radius:6px;display:block;margin-bottom:8px;">'
                )
            badge_html = ""
            if badges:
                badge_html = (
                    '<span style="display:block;font-size:0.8em;color:#0073e9;margin-top:4px;">'
                    f"{_esc(' · '.join(badges))}</span>"
                )
            parts.append(
                f'<a href="{_esc(p.get("url"))}" target="_blank" rel="nofollow sponsored noopener" '
                'style="display:block;width:calc(50% - 6px);min-width:140px;max-width:240px;'
                "box-sizing:border-box;padding:10px;border:1px solid #e5e5e5;border-radius:8px;"
                'text-decoration:none;color:#222;background:#fff;">'
                f"{img}"
                f'<span style="display:block;font-size:0.9em;line-height:1.4;">{_esc(name)}</span>'
                f'<span style="display:block;font-weight:bold;margin-top:4px;">{_esc(price)}</span>'
                f"{badge_html}</a>"
            )
        parts.append("</div>")

    if disclosure:
        parts.append(disclosure_html().replace("margin:8px 0 16px", "margin:12px 0 0"))
    parts.append("</div>")
    return "\n".join(parts) + "\n"


def print_products(products, landing_url=None, from_cache=False):
    """터미널용 요약 출력."""
    if from_cache:
        print("(캐시된 결과 — --no-cache 로 새로 조회 가능)")
    for i, p in enumerate(products, 1):
        flags = []
        if p.get("isRocket"):
            flags.append("로켓")
        if p.get("isFreeShipping"):
            flags.append("무료배송")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        print(f"{i:>2}. {p.get('name')}  {format_price(p.get('price'))}{flag_str}")
        print(f"    {p.get('url')}")
    if landing_url:
        print(f"\n검색 결과 페이지 링크(제휴): {landing_url}")


def write_output(text, out_path=None):
    if out_path:
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(out_path).write_text(text, encoding="utf-8")
        print(f"저장: {out_path}")
    else:
        print(text)


def dump_products_json(products, landing_url=None, out_path=None):
    payload = {"products": products, "landingUrl": landing_url}
    write_output(json.dumps(payload, ensure_ascii=False, indent=2), out_path)
