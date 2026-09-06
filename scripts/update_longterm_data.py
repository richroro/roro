"""
장기 투자용 데이터를 수집해 longterm/data.json 을 갱신한다.

market/ 사이트와 같은 이유로(브라우저에서 Yahoo를 직접 부르면 CORS로 막힘)
수집은 서버 쪽(GitHub Actions)에서 하고 결과를 정적 JSON으로 커밋한다.

수집 항목
  - 10년 월봉 종가  → 1/3/5/10년 수익률, 연평균수익률(CAGR), 최대낙폭, 스파크라인
  - 배당 이력       → 최근 12개월 배당, 배당수익률, 5년 배당성장률
  - 밸류에이션      → PER/PBR/PSR/ROE/시가총액/베타 (Yahoo quoteSummary, crumb 필요)
  - 투자 관련 뉴스  → RSS

외부망 표준 라이브러리만 사용한다.
"""
import http.cookiejar
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "longterm" / "data.json"

KST = timezone(timedelta(hours=9))
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
HEADERS = {"User-Agent": UA}

# ---------------------------------------------------------------- 수집 대상
# group: index(지수) / etf(ETF) / us(미국 개별주) / kr(국내 개별주)
# tag  : 화면에서 보여줄 성격 라벨
UNIVERSE = [
    # 지수 — 장기 수익률의 기준선
    {"symbol": "^GSPC", "name": "S&P 500", "group": "index", "tag": "미국 대표"},
    {"symbol": "^IXIC", "name": "나스닥 종합", "group": "index", "tag": "미국 기술"},
    {"symbol": "^DJI", "name": "다우존스", "group": "index", "tag": "미국 우량"},
    {"symbol": "^KS11", "name": "코스피", "group": "index", "tag": "한국"},
    {"symbol": "^KQ11", "name": "코스닥", "group": "index", "tag": "한국 성장"},
    {"symbol": "^N225", "name": "니케이 225", "group": "index", "tag": "일본"},

    # 적립식 코어로 자주 쓰이는 ETF
    {"symbol": "VOO", "name": "Vanguard S&P500", "group": "etf", "tag": "미국 지수"},
    {"symbol": "QQQ", "name": "Invesco 나스닥100", "group": "etf", "tag": "미국 기술"},
    {"symbol": "VTI", "name": "Vanguard 미국전체", "group": "etf", "tag": "미국 전체"},
    {"symbol": "VT", "name": "Vanguard 전세계", "group": "etf", "tag": "글로벌"},
    {"symbol": "SCHD", "name": "Schwab 미국배당", "group": "etf", "tag": "배당성장"},
    {"symbol": "BND", "name": "Vanguard 미국채권", "group": "etf", "tag": "채권"},
    {"symbol": "GLD", "name": "SPDR 금", "group": "etf", "tag": "원자재"},
    {"symbol": "069500.KS", "name": "KODEX 200", "group": "etf", "tag": "국내 지수"},
    {"symbol": "379800.KS", "name": "KODEX 미국S&P500TR", "group": "etf", "tag": "국내상장 미국"},
    {"symbol": "133690.KS", "name": "TIGER 미국나스닥100", "group": "etf", "tag": "국내상장 미국"},
    {"symbol": "458730.KS", "name": "TIGER 미국배당다우존스", "group": "etf", "tag": "국내상장 배당"},

    # 미국 우량주
    {"symbol": "AAPL", "name": "Apple", "group": "us", "tag": "기술"},
    {"symbol": "MSFT", "name": "Microsoft", "group": "us", "tag": "기술"},
    {"symbol": "GOOGL", "name": "Alphabet", "group": "us", "tag": "기술"},
    {"symbol": "AMZN", "name": "Amazon", "group": "us", "tag": "소비/클라우드"},
    {"symbol": "NVDA", "name": "NVIDIA", "group": "us", "tag": "반도체"},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway", "group": "us", "tag": "지주"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "group": "us", "tag": "헬스케어"},
    {"symbol": "PG", "name": "Procter & Gamble", "group": "us", "tag": "생활필수"},
    {"symbol": "KO", "name": "Coca-Cola", "group": "us", "tag": "배당왕"},
    {"symbol": "PEP", "name": "PepsiCo", "group": "us", "tag": "배당왕"},
    {"symbol": "MCD", "name": "McDonalds", "group": "us", "tag": "소비"},
    {"symbol": "V", "name": "Visa", "group": "us", "tag": "결제"},
    {"symbol": "JPM", "name": "JPMorgan Chase", "group": "us", "tag": "금융"},
    {"symbol": "XOM", "name": "Exxon Mobil", "group": "us", "tag": "에너지"},

    # 국내 우량주
    {"symbol": "005930.KS", "name": "삼성전자", "group": "kr", "tag": "반도체"},
    {"symbol": "000660.KS", "name": "SK하이닉스", "group": "kr", "tag": "반도체"},
    {"symbol": "005380.KS", "name": "현대차", "group": "kr", "tag": "자동차"},
    {"symbol": "000270.KS", "name": "기아", "group": "kr", "tag": "자동차"},
    {"symbol": "012330.KS", "name": "현대모비스", "group": "kr", "tag": "자동차부품"},
    {"symbol": "035420.KS", "name": "NAVER", "group": "kr", "tag": "인터넷"},
    {"symbol": "051910.KS", "name": "LG화학", "group": "kr", "tag": "화학"},
    {"symbol": "005490.KS", "name": "POSCO홀딩스", "group": "kr", "tag": "철강"},
    {"symbol": "105560.KS", "name": "KB금융", "group": "kr", "tag": "금융/배당"},
    {"symbol": "055550.KS", "name": "신한지주", "group": "kr", "tag": "금융/배당"},
    {"symbol": "316140.KS", "name": "우리금융지주", "group": "kr", "tag": "금융/배당"},
    {"symbol": "033780.KS", "name": "KT&G", "group": "kr", "tag": "고배당"},
    {"symbol": "017670.KS", "name": "SK텔레콤", "group": "kr", "tag": "고배당"},
    {"symbol": "030200.KS", "name": "KT", "group": "kr", "tag": "고배당"},
]

# 실제로 200이 오는지 확인한 피드만 넣는다 (한국경제 RSS는 403으로 막혀 있었음)
NEWS_FEEDS = [
    {"url": "https://www.mk.co.kr/rss/50200011/", "source": "매일경제 증권"},
    {"url": "https://www.yna.co.kr/rss/economy.xml", "source": "연합뉴스"},
    {
        "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml",
        "source": "조선일보",
    },
]
# 장기투자와 무관한 기사를 걸러내기 위한 키워드
NEWS_KEYWORDS = [
    "배당", "장기", "연금", "ETF", "적립", "가치", "실적", "밸류", "주주환원",
    "자사주", "PER", "PBR", "국민연금", "증시", "코스피", "나스닥", "S&P", "금리",
    "투자", "펀드", "IRP", "ISA", "연금저축", "주가", "상장", "주주",
]
NEWS_PER_FEED = 60
NEWS_LIMIT = 24

SECONDS_PER_YEAR = 365.25 * 24 * 3600


# ---------------------------------------------------------------- HTTP 유틸
_opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
)
_crumb = None


def http_get(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    with _opener.open(req, timeout=timeout) as resp:
        return resp.read()


def get_json(url, timeout=20):
    return json.loads(http_get(url, timeout).decode("utf-8"))


def get_crumb():
    """quoteSummary(밸류에이션)는 쿠키+crumb가 있어야 200이 온다. 실패해도 치명적이지 않다."""
    global _crumb
    if _crumb is not None:
        return _crumb or None
    try:
        try:
            http_get("https://fc.yahoo.com")
        except urllib.error.HTTPError:
            pass  # 404를 주지만 쿠키는 심어준다
        _crumb = http_get("https://query1.finance.yahoo.com/v1/test/getcrumb").decode().strip()
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] crumb 발급 실패, 밸류에이션 지표는 건너뜁니다: {exc}")
        _crumb = ""
    return _crumb or None


def raw(node, key):
    value = node.get(key)
    if isinstance(value, dict):
        return value.get("raw")
    return value


# ---------------------------------------------------------------- 지표 계산
def pct(new, old):
    if not old or new is None:
        return None
    return round((new / old - 1) * 100, 2)


def cagr(new, old, years):
    if not old or not new or new <= 0 or old <= 0 or years <= 0:
        return None
    return round(((new / old) ** (1 / years) - 1) * 100, 2)


def close_years_ago(points, now_ts, years):
    """월봉 종가 목록에서 n년 전 시점에 가장 가까운 종가를 찾는다."""
    target = now_ts - years * SECONDS_PER_YEAR
    # 10년치 월봉의 첫 봉은 목표 시점보다 며칠 뒤일 수 있으므로 45일까지는 인정한다.
    tolerance = 45 * 24 * 3600
    if not points or points[0][0] > target + tolerance:
        return None  # 상장 이력이 그만큼 없으면 계산하지 않는다
    best = points[0][1]
    for ts, close in points:
        if ts <= target:
            best = close
        else:
            break
    return best


def max_drawdown(points):
    peak = None
    worst = 0.0
    for _, close in points:
        if peak is None or close > peak:
            peak = close
        elif peak:
            worst = min(worst, close / peak - 1)
    return round(worst * 100, 2)


def sparkline(points, target=60):
    """스파크라인용으로 월봉 종가를 target개 이하로 균등 샘플링한다."""
    if len(points) <= target:
        sampled = points
    else:
        step = len(points) / target
        sampled = [points[int(i * step)] for i in range(target)]
        sampled.append(points[-1])
    return [round(c, 4) for _, c in sampled]


def fetch_previous_close(symbol):
    """월봉 차트의 previousClose는 '지난 달' 종가라 일간 등락에 쓸 수 없다.
    일봉을 따로 받아 직전 거래일 종가를 구한다."""
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}?range=5d&interval=1d"
    )
    result = get_json(url)["chart"]["result"][0]
    closes = [c for c in (result["indicators"]["quote"][0].get("close") or []) if c is not None]
    if len(closes) >= 2:
        return closes[-2]
    return result["meta"].get("chartPreviousClose")


def fetch_chart(symbol):
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}?range=10y&interval=1mo&events=div"
    )
    result = get_json(url)["chart"]["result"][0]
    meta = result["meta"]
    stamps = result.get("timestamp") or []
    closes = result["indicators"]["quote"][0].get("close") or []
    points = [(int(t), float(c)) for t, c in zip(stamps, closes) if c is not None]
    dividends = sorted(
        (int(d["date"]), float(d["amount"]))
        for d in (result.get("events", {}).get("dividends") or {}).values()
    )
    return meta, points, dividends


def dividend_stats(dividends, price, now_ts):
    if not dividends:
        return None
    ttm = sum(a for ts, a in dividends if ts >= now_ts - SECONDS_PER_YEAR)
    by_year = {}
    for ts, amount in dividends:
        year = datetime.fromtimestamp(ts, timezone.utc).year
        by_year[year] = by_year.get(year, 0) + amount
    this_year = datetime.fromtimestamp(now_ts, timezone.utc).year
    # 진행 중인 올해는 제외하고 마지막 '완결된' 연도 기준으로 성장률을 본다
    complete = sorted(y for y in by_year if y < this_year)
    growth5y = None
    if len(complete) >= 6:
        last, base = complete[-1], complete[-6]
        growth5y = cagr(by_year[last], by_year[base], last - base)
    return {
        "ttm": round(ttm, 4) if ttm else 0,
        "yieldTtm": round(ttm / price * 100, 2) if ttm and price else None,
        "growth5y": growth5y,
        "history": [
            {"year": y, "amount": round(by_year[y], 4)}
            for y in sorted(by_year)
            if y >= this_year - 10
        ],
    }


def fetch_valuation(symbol):
    crumb = get_crumb()
    if not crumb:
        return {}
    url = (
        "https://query1.finance.yahoo.com/v10/finance/quoteSummary/"
        f"{urllib.parse.quote(symbol)}"
        "?modules=summaryDetail,defaultKeyStatistics,financialData"
        f"&crumb={urllib.parse.quote(crumb)}"
    )
    result = get_json(url)["quoteSummary"]["result"][0]
    detail = result.get("summaryDetail", {})
    stats = result.get("defaultKeyStatistics", {})
    finance = result.get("financialData", {})

    # 배당수익률은 종목/ETF에 따라 필드와 단위(비율 vs 퍼센트)가 갈린다
    div_yield = raw(detail, "dividendYield")
    if div_yield is None:
        div_yield = raw(detail, "yield")
    if div_yield is not None and div_yield < 1:
        div_yield *= 100

    def as_pct(value):
        return round(value * 100, 2) if isinstance(value, (int, float)) else None

    return {
        "per": raw(detail, "trailingPE"),
        "forwardPer": raw(detail, "forwardPE") or raw(stats, "forwardPE"),
        "pbr": raw(stats, "priceToBook"),
        "psr": raw(detail, "priceToSalesTrailing12Months"),
        "peg": raw(stats, "pegRatio"),
        "roe": as_pct(raw(finance, "returnOnEquity")),
        "margin": as_pct(raw(finance, "profitMargins") or raw(stats, "profitMargins")),
        "marketCap": raw(detail, "marketCap") or raw(detail, "totalAssets"),
        "beta": raw(detail, "beta") or raw(stats, "beta3Year"),
        "payout": as_pct(raw(detail, "payoutRatio")),
        "dividendYield": round(div_yield, 2) if div_yield else None,
        "avgYield5y": raw(detail, "fiveYearAvgDividendYield"),
        "week52High": raw(detail, "fiftyTwoWeekHigh"),
        "week52Low": raw(detail, "fiftyTwoWeekLow"),
    }


def round_or_none(value, digits=2):
    return round(value, digits) if isinstance(value, (int, float)) else None


def build_item(entry):
    meta, points, dividends = fetch_chart(entry["symbol"])
    price = meta.get("regularMarketPrice")
    if price is None and points:
        price = points[-1][1]
    if price is None:
        raise ValueError("가격 없음")
    now_ts = int(meta.get("regularMarketTime") or time.time())

    try:
        prev_close = fetch_previous_close(entry["symbol"])
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] {entry['symbol']} 전일 종가 실패: {exc}")
        prev_close = None

    try:
        valuation = fetch_valuation(entry["symbol"])
    except Exception as exc:  # noqa: BLE001 - 지표가 없어도 나머지는 살린다
        print(f"[warn] {entry['symbol']} 밸류에이션 실패: {exc}")
        valuation = {}

    returns, growth = {}, {}
    for years in (1, 3, 5, 10):
        old = close_years_ago(points, now_ts, years)
        returns[f"{years}y"] = pct(price, old)
        if years > 1:
            growth[f"{years}y"] = cagr(price, old, years)

    high52 = valuation.get("week52High") or meta.get("fiftyTwoWeekHigh")
    low52 = valuation.get("week52Low") or meta.get("fiftyTwoWeekLow")
    position52 = None
    if high52 and low52 and high52 > low52:
        position52 = round((price - low52) / (high52 - low52) * 100, 1)

    # 야후의 allTimeHigh는 액면분할 이전 가격이 섞여 있어 신뢰할 수 없다.
    # 수집한 10년 월봉(수정주가) 안에서의 최고가를 기준으로 삼는다.
    peak = max((c for _, c in points), default=None)
    # 월말 종가만 보므로 현재가가 그 최고치를 살짝 넘길 수 있다 — 그 경우 신고가(0%)로 본다
    from_high = min(0.0, round((price / peak - 1) * 100, 2)) if peak else None

    div = dividend_stats(dividends, price, now_ts)
    div_yield = valuation.get("dividendYield")
    if div_yield is None and div:
        div_yield = div.get("yieldTtm")

    return {
        "symbol": entry["symbol"],
        "name": entry["name"],
        "group": entry["group"],
        "tag": entry["tag"],
        "currency": meta.get("currency"),
        "price": round(price, 2),
        "change": round_or_none(price - prev_close) if prev_close else None,
        "changePercent": pct(price, prev_close),
        "returns": returns,
        "cagr": growth,
        "mdd10y": max_drawdown(points),
        "fromHigh": from_high,
        "week52": {"high": high52, "low": low52, "position": position52},
        "valuation": {
            k: round_or_none(v, 2) if isinstance(v, float) else v
            for k, v in valuation.items()
            if v is not None and k not in ("week52High", "week52Low", "dividendYield")
        },
        "dividendYield": div_yield,
        "dividend": div,
        "spark": sparkline(points),
        "months": len(points),
    }


def build_universe():
    items = []
    for entry in UNIVERSE:
        try:
            items.append(build_item(entry))
            print(f"[ok] {entry['symbol']} {entry['name']}")
        except Exception as exc:  # noqa: BLE001 - 한 종목 실패가 전체를 막지 않게
            print(f"[warn] {entry['symbol']} 수집 실패: {exc}")
        time.sleep(0.3)
    return items


# ---------------------------------------------------------------- 뉴스
def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def fetch_news(feed):
    root = ET.fromstring(http_get(feed["url"]))
    items = []
    for item in root.findall(".//item")[:NEWS_PER_FEED]:
        title = strip_html(item.findtext("title"))
        link = (item.findtext("link") or "").strip()
        if not title or not link:
            continue
        if not any(word.lower() in title.lower() for word in NEWS_KEYWORDS):
            continue
        items.append({
            "title": title,
            "link": link,
            "pubDate": (item.findtext("pubDate") or "").strip(),
            "source": feed["source"],
        })
    return items


def build_news():
    items = []
    for feed in NEWS_FEEDS:
        try:
            items.extend(fetch_news(feed))
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] 뉴스 피드 실패 {feed['url']}: {exc}")

    def sort_key(news):
        try:
            return datetime.strptime(news["pubDate"][:25], "%a, %d %b %Y %H:%M:%S")
        except ValueError:
            return datetime.min

    items.sort(key=sort_key, reverse=True)
    return items[:NEWS_LIMIT]


# ---------------------------------------------------------------- 메인
def load_existing():
    if DATA_PATH.exists():
        try:
            return json.loads(DATA_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def main():
    existing = load_existing()
    items = build_universe() or existing.get("items", [])
    news = build_news() or existing.get("news", [])

    data = {
        "updatedAt": datetime.now(KST).isoformat(),
        "items": items,
        "news": news,
    }
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {DATA_PATH}: {len(items)} items, {len(news)} news")


if __name__ == "__main__":
    main()
