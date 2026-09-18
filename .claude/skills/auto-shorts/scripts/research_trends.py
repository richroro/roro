#!/usr/bin/env python3
"""트렌드 조사 (auto-shorts) — 지금 사람들이 궁금해하는 것과 잘나가는 쇼츠를 긁어 브리핑을 만든다.

키 없이 되는 소스:
    google_trends   구글 트렌드 일별 급상승 검색어 RSS (geo=KR)
    wikipedia       한국어 위키백과 어제 많이 본 문서 TOP (Wikimedia Pageviews API)
    reddit          r/todayilearned, r/interestingasfuck, r/Damnthatsinteresting 주간 TOP (재미난 사실 소재)
    watchlist       trends/watchlist.txt 에 적은 유튜브 채널들의 최신 업로드 RSS(키 불필요) → 시간당 조회수로 정렬
                    (잘나가는 잡학·상식 쇼츠 채널을 20~50개 적어 두면 '지금 터지는 제목'을 바로 본다)
키가 있으면 추가되는 소스:
    youtube         YouTube Data API v3 — 한국 인기 급상승 + 쇼츠 검색(최근 7일, 조회수순) → 제목 패턴 분석
                    (YOUTUBE_API_KEY, 무료 할당량 10,000/일. 이 스크립트는 1회 약 700 유닛 사용)

출력:
    trends/YYYY-MM-DD.json   원본 데이터
    trends/latest.md         Claude 가 1단계(주제 선정)에서 읽는 브리핑

CLI:
    python research_trends.py                     # 전부
    python research_trends.py --sources reddit,wikipedia
    python research_trends.py --queries "신기한 사실,동물 상식,역사 비하인드"   # 유튜브 쇼츠 검색어 덮어쓰기
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR, env_key, http_get, http_json, log, qs, warn, write_json  # noqa: E402

STAGE = "trends"
TRENDS_DIR = SKILL_DIR / "trends"
ALL_SOURCES = ["google_trends", "wikipedia", "reddit", "watchlist", "youtube"]
WATCHLIST = TRENDS_DIR / "watchlist.txt"
DEFAULT_YT_QUERIES = ["신기한 사실", "몰랐던 상식", "동물 상식", "역사 비하인드", "우주 사실", "심리학 사실"]
WIKI_SKIP = re.compile(r"^(위키백과:|특수:|파일:|분류:|틀:|도움말:|포털:|메인 페이지|Wikipedia|Special:|File:|-)")


# ---------------------------------------------------------------- 소스별 수집
def google_trends(geo: str = "KR") -> list[dict]:
    """일별 급상승 검색어 RSS. 항목: 검색어, 대략 트래픽, 관련 뉴스 제목."""
    xml = http_get(f"https://trends.google.com/trending/rss?geo={geo}", timeout=30, stage=STAGE).decode("utf-8", "replace")
    return parse_google_trends(xml)


def parse_google_trends(xml: str) -> list[dict]:
    ns = {"ht": "https://trends.google.com/trending/rss"}
    root = ET.fromstring(xml)
    out = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        if not title:
            continue
        traffic = (item.findtext("ht:approx_traffic", namespaces=ns) or "").strip()
        news = [(n.findtext("ht:news_item_title", namespaces=ns) or "").strip()
                for n in item.findall("ht:news_item", ns)]
        out.append({"query": title, "traffic": traffic, "news": [n for n in news if n][:2]})
    return out


def wikipedia_top(project: str = "ko.wikipedia", day: dt.date | None = None, limit: int = 40) -> list[dict]:
    """어제(UTC) 많이 본 문서. 메인/특수 문서는 뺀다."""
    day = day or (dt.datetime.utcnow().date() - dt.timedelta(days=1))
    url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/{project}/all-access/{day:%Y/%m/%d}"
    data = http_json(url, timeout=30, stage=STAGE)
    return parse_wikipedia_top(data, limit)


def parse_wikipedia_top(data: dict, limit: int = 40) -> list[dict]:
    out = []
    for item in data.get("items", []):
        for a in item.get("articles", []):
            name = a.get("article", "").replace("_", " ")
            if not name or WIKI_SKIP.match(name):
                continue
            out.append({"article": name, "views": a.get("views", 0)})
            if len(out) >= limit:
                return out
    return out


def reddit_top(subreddits=("todayilearned", "interestingasfasfuck", "Damnthatsinteresting"), limit: int = 15) -> list[dict]:
    out = []
    for sub in subreddits:
        try:
            data = http_json(f"https://www.reddit.com/r/{sub}/top.json?{qs({'t': 'week', 'limit': limit})}",
                             headers={"User-Agent": "auto-shorts-trends/1.0 (topic research bot)"}, timeout=30, stage=STAGE)
            out.extend(parse_reddit(data, sub))
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"reddit r/{sub} 실패: {e}")
    return out


def parse_reddit(data: dict, sub: str) -> list[dict]:
    out = []
    for c in (data.get("data") or {}).get("children", []):
        d = c.get("data") or {}
        title = re.sub(r"^TIL\s*(that\s*)?", "", d.get("title", ""), flags=re.I).strip()
        if title:
            out.append({"sub": sub, "title": title, "score": d.get("score", 0),
                        "url": "https://www.reddit.com" + d.get("permalink", "")})
    return out


def watchlist_feeds(path: Path = WATCHLIST, now: dt.datetime | None = None) -> list[dict]:
    """채널 RSS(https://www.youtube.com/feeds/videos.xml?channel_id=UC...)로 최신 15편의 조회수를 읽어
    시간당 조회수(업로드 후 경과 시간 대비)로 정렬한다. 파일 한 줄 = 채널 ID (# 주석 가능)."""
    if not path.is_file():
        return []
    ids = [l.split("#")[0].strip() for l in path.read_text(encoding="utf-8").splitlines()]
    ids = [i for i in ids if i.startswith("UC")]
    out = []
    for cid in ids:
        try:
            xml = http_get(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", timeout=20, retries=1,
                           stage=STAGE).decode("utf-8", "replace")
            out.extend(parse_channel_feed(xml, now))
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"watchlist {cid} 실패: {e}")
    out.sort(key=lambda r: -r["views_per_hour"])
    return out


def parse_channel_feed(xml: str, now: dt.datetime | None = None) -> list[dict]:
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
          "media": "http://search.yahoo.com/mrss/"}
    root = ET.fromstring(xml)
    channel = (root.findtext("a:title", namespaces=ns) or "").strip()
    now = now or dt.datetime.now(dt.timezone.utc)
    out = []
    for e in root.findall("a:entry", ns):
        title = (e.findtext("a:title", namespaces=ns) or "").strip()
        vid = (e.findtext("yt:videoId", namespaces=ns) or "").strip()
        pub = (e.findtext("a:published", namespaces=ns) or "").strip()
        stats = e.find("media:group/media:community/media:statistics", ns)
        views = int(stats.get("views", 0)) if stats is not None else 0
        try:
            age_h = max(1.0, (now - dt.datetime.fromisoformat(pub.replace("Z", "+00:00"))).total_seconds() / 3600)
        except ValueError:
            age_h = 24.0
        out.append({"channel": channel, "title": title, "views": views, "age_hours": round(age_h, 1),
                    "views_per_hour": round(views / age_h, 1), "url": f"https://www.youtube.com/shorts/{vid}"})
    return out


def youtube(queries: list[str], region: str = "KR") -> dict:
    """인기 급상승 + 쇼츠 검색(최근 7일, 조회수순). 키 없으면 빈 dict."""
    key = env_key("YOUTUBE_API_KEY")
    if not key:
        return {}
    base = "https://www.googleapis.com/youtube/v3"
    result: dict = {"trending": [], "shorts": []}
    try:
        data = http_json(f"{base}/videos?{qs({'part': 'snippet,statistics,contentDetails', 'chart': 'mostPopular', 'regionCode': region, 'maxResults': 25, 'key': key})}", stage=STAGE)
        result["trending"] = [_yt_item(v) for v in data.get("items", [])]
    except Exception as e:  # noqa: BLE001
        warn(STAGE, f"youtube mostPopular 실패: {e}")
    since = (dt.datetime.utcnow() - dt.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    for q in queries:
        try:
            s = http_json(f"{base}/search?{qs({'part': 'snippet', 'q': q, 'type': 'video', 'videoDuration': 'short', 'order': 'viewCount', 'publishedAfter': since, 'regionCode': region, 'relevanceLanguage': 'ko', 'maxResults': 15, 'key': key})}", stage=STAGE)
            ids = [i["id"]["videoId"] for i in s.get("items", []) if i.get("id", {}).get("videoId")]
            if not ids:
                continue
            v = http_json(f"{base}/videos?{qs({'part': 'snippet,statistics,contentDetails', 'id': ','.join(ids), 'key': key})}", stage=STAGE)
            for item in v.get("items", []):
                row = _yt_item(item)
                row["query"] = q
                result["shorts"].append(row)
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"youtube 검색 '{q}' 실패: {e}")
    result["shorts"].sort(key=lambda r: -r["views"])
    result["title_patterns"] = analyze_titles([r["title"] for r in result["shorts"]])
    result["durations"] = summarize_durations([r["seconds"] for r in result["shorts"] if r["seconds"]])
    return result


def _yt_item(v: dict) -> dict:
    sn, st, cd = v.get("snippet", {}), v.get("statistics", {}), v.get("contentDetails", {})
    return {"id": v.get("id"), "title": sn.get("title", ""), "channel": sn.get("channelTitle", ""),
            "views": int(st.get("viewCount", 0) or 0), "likes": int(st.get("likeCount", 0) or 0),
            "seconds": iso_duration_seconds(cd.get("duration", "")), "published": sn.get("publishedAt", "")[:10],
            "url": f"https://www.youtube.com/watch?v={v.get('id')}"}


def iso_duration_seconds(s: str) -> int:
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return 0
    h, mi, se = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + se


# ---------------------------------------------------------------- 분석
def analyze_titles(titles: list[str]) -> dict:
    """잘나가는 쇼츠 제목의 공통 패턴: 길이, 물음표/느낌표/숫자 비율, 자주 쓰는 단어."""
    if not titles:
        return {}
    n = len(titles)
    words = Counter()
    for t in titles:
        for w in re.findall(r"[가-힣]{2,}|[A-Za-z]{3,}", t):
            words[w] += 1
    return {
        "count": n,
        "avg_chars": round(sum(len(t) for t in titles) / n, 1),
        "pct_question": round(100 * sum("?" in t for t in titles) / n),
        "pct_exclaim": round(100 * sum("!" in t for t in titles) / n),
        "pct_number": round(100 * sum(bool(re.search(r"\d", t)) for t in titles) / n),
        "pct_hashtag": round(100 * sum("#" in t for t in titles) / n),
        "top_words": [w for w, _ in words.most_common(15)],
    }


def summarize_durations(secs: list[int]) -> dict:
    if not secs:
        return {}
    s = sorted(secs)
    buckets = Counter("~15s" if x <= 15 else "16~30s" if x <= 30 else "31~45s" if x <= 45 else "46~60s" if x <= 60 else "60s+" for x in s)
    return {"median": s[len(s) // 2], "buckets": dict(buckets)}


# ---------------------------------------------------------------- 브리핑
def render_markdown(data: dict) -> str:
    L = [f"# 트렌드 브리핑 {data['date']}", "",
         "이 파일은 `scripts/research_trends.py` 가 만든다. 주제를 고를 때 아래에서 **'쇼츠로 만들면 궁금증이 생길 것'** 을 찾고,",
         "단순 연예·정치 이슈는 피한다(반감·저작권 위험). 급상승 검색어는 '왜 지금 뜨는가'가 훅이 된다.", ""]
    gt = data.get("google_trends") or []
    if gt:
        L += ["## 구글 급상승 검색어 (KR)", ""]
        for r in gt[:20]:
            news = f" — {r['news'][0]}" if r.get("news") else ""
            L.append(f"- {r['query']} ({r.get('traffic') or '?'}){news}")
        L.append("")
    wk = data.get("wikipedia") or []
    if wk:
        L += ["## 한국어 위키백과 많이 본 문서 (어제)", ""]
        L.append(", ".join(f"{r['article']}({r['views']:,})" for r in wk[:30]))
        L.append("")
    rd = data.get("reddit") or []
    if rd:
        L += ["## Reddit 이번 주 인기 '오늘 알게 된 사실' (영어 → 한국어 소재로 번안)", ""]
        for r in sorted(rd, key=lambda x: -x["score"])[:25]:
            L.append(f"- [{r['score']:,}] {r['title']}  <{r['url']}>")
        L.append("")
    wl = data.get("watchlist") or []
    if wl:
        L += ["## 관찰 채널 최신 업로드 (시간당 조회수순, 키 불필요)", ""]
        for r in wl[:25]:
            L.append(f"- [{r['views_per_hour']:,.0f}/h · {r['views']:,}회 · {r['age_hours']:.0f}h] {r['title']} — {r['channel']}")
        L.append("")
    elif "watchlist" in data:
        L += ["## 관찰 채널", "", f"`{WATCHLIST.name}` 에 유튜브 채널 ID(UC…)를 한 줄씩 적으면 그 채널들의 최신 쇼츠를 시간당 조회수로 보여 준다.", ""]
    yt = data.get("youtube") or {}
    if yt:
        L += ["## YouTube 잘나가는 쇼츠 (최근 7일, 조회수순)", ""]
        for r in yt.get("shorts", [])[:30]:
            L.append(f"- [{r['views']:,}회 · {r['seconds']}s] {r['title']} — {r['channel']} (검색: {r['query']})")
        tp = yt.get("title_patterns") or {}
        if tp:
            L += ["", f"**제목 패턴** ({tp['count']}개): 평균 {tp['avg_chars']}자 · 물음표 {tp['pct_question']}% · 느낌표 {tp['pct_exclaim']}% · "
                  f"숫자 {tp['pct_number']}% · 해시태그 {tp['pct_hashtag']}%", f"자주 쓰는 단어: {', '.join(tp['top_words'])}"]
        du = yt.get("durations") or {}
        if du:
            L.append(f"**길이**: 중앙값 {du['median']}s · 분포 {du['buckets']}")
        tr = yt.get("trending") or []
        if tr:
            L += ["", "**인기 급상승 (전체 영상)**: " + " / ".join(r["title"][:30] for r in tr[:12])]
        L.append("")
    else:
        L += ["## YouTube", "", "`YOUTUBE_API_KEY` 가 없어 건너뜀. 무료 키를 넣으면 잘나가는 쇼츠 제목·길이 분석이 추가된다", ""]
    errs = data.get("errors") or []
    if errs:
        L += ["## 수집 실패", ""] + [f"- {e}" for e in errs] + [""]
    return "\n".join(L)


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 트렌드 조사")
    ap.add_argument("--sources", default=",".join(ALL_SOURCES))
    ap.add_argument("--queries", default=None, help="유튜브 쇼츠 검색어(쉼표 구분)")
    ap.add_argument("--geo", default="KR")
    ap.add_argument("--out-dir", default=str(TRENDS_DIR))
    ap.add_argument("--date", default=None, help="YYYY-MM-DD (기본 오늘)")
    args = ap.parse_args()
    sources = [s.strip() for s in args.sources.split(",") if s.strip()]
    today = args.date or dt.date.today().isoformat()
    data: dict = {"date": today, "errors": []}
    runners = {
        "google_trends": lambda: google_trends(args.geo),
        "wikipedia": lambda: wikipedia_top("ko.wikipedia" if args.geo == "KR" else "en.wikipedia"),
        "reddit": lambda: reddit_top(),
        "watchlist": lambda: watchlist_feeds(),
        "youtube": lambda: youtube([q.strip() for q in (args.queries or ",".join(DEFAULT_YT_QUERIES)).split(",")], args.geo),
    }
    for name in sources:
        fn = runners.get(name)
        if not fn:
            warn(STAGE, f"알 수 없는 소스: {name}")
            continue
        try:
            data[name] = fn()
            n = len(data[name]) if isinstance(data[name], list) else len((data[name] or {}).get("shorts", []))
            log(STAGE, f"{name}: {n}건")
        except Exception as e:  # noqa: BLE001
            data["errors"].append(f"{name}: {e.__class__.__name__}: {str(e)[:120]}")
            warn(STAGE, f"{name} 실패: {e}")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_json(out_dir / f"{today}.json", data)
    (out_dir / "latest.md").write_text(render_markdown(data), encoding="utf-8")
    # 오래된 스냅샷 정리 (최근 12개만)
    snaps = sorted(out_dir.glob("20??-??-??.json"))
    for old in snaps[:-12]:
        old.unlink()
    log(STAGE, f"브리핑 저장: {out_dir / 'latest.md'}")
    if len(data["errors"]) == len(sources):
        sys.exit(1)


if __name__ == "__main__":
    main()
