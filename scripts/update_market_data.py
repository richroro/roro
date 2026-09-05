"""
경제 뉴스 + 증시 데이터를 수집해 market/data.json 을 갱신한다.
GitHub Actions에서 주기적으로 실행되며, 외부망 표준 라이브러리만 사용한다.
"""
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "market" / "data.json"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RichgogoMarketBot/1.0)"}
KST = timezone(timedelta(hours=9))

INDICES = [
    {"symbol": "^KS11", "name": "KOSPI"},
    {"symbol": "^KQ11", "name": "KOSDAQ"},
    {"symbol": "^DJI", "name": "다우존스"},
    {"symbol": "^IXIC", "name": "나스닥"},
]

FX = [
    {"symbol": "KRW=X", "name": "USD/KRW"},
]

STOCKS = [
    {"symbol": "005930.KS", "name": "삼성전자"},
    {"symbol": "000660.KS", "name": "SK하이닉스"},
    {"symbol": "035420.KS", "name": "NAVER"},
    {"symbol": "035720.KS", "name": "카카오"},
    {"symbol": "373220.KS", "name": "LG에너지솔루션"},
    {"symbol": "AAPL", "name": "Apple"},
    {"symbol": "TSLA", "name": "Tesla"},
    {"symbol": "NVDA", "name": "NVIDIA"},
]

NEWS_FEEDS = [
    {"url": "https://www.yna.co.kr/rss/economy.xml", "source": "연합뉴스"},
    {"url": "https://www.hankyung.com/feed/economy", "source": "한국경제"},
]

NEWS_PER_FEED = 10


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_quote(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}"
    data = fetch_json(url)
    result = data["chart"]["result"][0]
    meta = result["meta"]
    price = meta.get("regularMarketPrice")
    prev_close = meta.get("previousClose") or meta.get("chartPreviousClose")
    if price is None or prev_close is None:
        raise ValueError(f"missing price data for {symbol}")
    change = price - prev_close
    change_percent = (change / prev_close) * 100 if prev_close else 0
    return {
        "price": round(price, 2),
        "change": round(change, 2),
        "changePercent": round(change_percent, 2),
        "currency": meta.get("currency"),
    }


def build_quote_list(entries):
    items = []
    for entry in entries:
        try:
            quote = fetch_quote(entry["symbol"])
            items.append({"symbol": entry["symbol"], "name": entry["name"], **quote})
        except Exception as exc:  # noqa: BLE001 - keep going, one bad symbol shouldn't kill the run
            print(f"[warn] failed to fetch {entry['symbol']}: {exc}")
    return items


def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def fetch_news(feed):
    req = urllib.request.Request(feed["url"], headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read()
    root = ET.fromstring(raw)
    items = []
    for item in root.findall(".//item")[:NEWS_PER_FEED]:
        title = strip_html(item.findtext("title"))
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        if not title or not link:
            continue
        items.append({
            "title": title,
            "link": link,
            "pubDate": pub_date,
            "source": feed["source"],
        })
    return items


def build_news_list():
    items = []
    for feed in NEWS_FEEDS:
        try:
            items.extend(fetch_news(feed))
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] failed to fetch feed {feed['url']}: {exc}")

    def sort_key(news_item):
        try:
            return datetime.strptime(news_item["pubDate"][:25], "%a, %d %b %Y %H:%M:%S")
        except ValueError:
            return datetime.min

    items.sort(key=sort_key, reverse=True)
    return items


def load_existing():
    if DATA_PATH.exists():
        try:
            return json.loads(DATA_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def main():
    existing = load_existing()

    indices = build_quote_list(INDICES) or existing.get("indices", [])
    fx = build_quote_list(FX) or existing.get("fx", [])
    stocks = build_quote_list(STOCKS) or existing.get("stocks", [])
    news = build_news_list() or existing.get("news", [])

    data = {
        "updatedAt": datetime.now(KST).isoformat(),
        "indices": indices,
        "fx": fx,
        "stocks": stocks,
        "news": news,
    }

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {DATA_PATH} with {len(indices)} indices, {len(fx)} fx, {len(stocks)} stocks, {len(news)} news")


if __name__ == "__main__":
    main()
