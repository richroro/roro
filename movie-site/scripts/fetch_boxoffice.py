#!/usr/bin/env python3
"""영화진흥위원회 일별 박스오피스를 긁어 movie-site/data.json 으로 저장한다.

KOBIS 통합전산망은 공식 집계이고 API 키 없이 폼 POST로 조회된다.
(오픈 API 는 키가 필요하지만, 이 페이지는 그렇지 않다.)

전날 데이터가 아직 안 올라온 새벽 시간대를 대비해 최근 며칠을 거슬러 시도한다.
"""

import datetime
import html
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

URL = "https://www.kobis.or.kr/kobis/business/stat/boxs/findDailyBoxOfficeList.do"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Referer": URL,
}
OUT = pathlib.Path(__file__).resolve().parent.parent / "data.json"
LIMIT = 15

# 영화명 칸 뒤에 붙어 나오는 순위 변동 표기.
# 화살표가 이미지 대체텍스트로 풀려서 "경주기행 1 상승" 처럼 들어오는 경우가 있다.
RANK_NOISE = re.compile(
    r"\s*(동일|신규|재개봉|New|[▲▼△▽]\s*\d*|\d+\s*(상승|하락))\s*$",
    re.IGNORECASE,
)


def cell_text(raw: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw))).strip()


def to_int(s: str) -> int:
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else 0


def to_float(s: str) -> float:
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else 0.0


def fetch(day: str) -> str:
    body = urllib.parse.urlencode(
        {
            "loadEnd": "0",
            "searchType": "search",
            "sSearchFrom": day,
            "sSearchTo": day,
            "pageIndex": "1",
        }
    ).encode()
    req = urllib.request.Request(URL, data=body, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "ignore")


def parse(page: str) -> list[dict]:
    if "<tbody" not in page:
        return []
    body = page.split("<tbody", 1)[-1].split("</tbody>", 1)[0]
    out = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", body, re.S):
        cells = [cell_text(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
        # 순위·영화명·개봉일 … 누적관객수(9) 까지는 있어야 유효한 행
        if len(cells) < 11 or not cells[0].isdigit():
            continue
        title = cells[1]
        # 표기가 여러 개 붙어 오기도 해서 더 지워지지 않을 때까지 반복한다
        while True:
            stripped = RANK_NOISE.sub("", title).strip()
            if stripped == title:
                break
            title = stripped
        if not title:
            continue
        out.append(
            {
                "rank": int(cells[0]),
                "title": title,
                "open": cells[2],
                "share": to_float(cells[4]),
                "audience": to_int(cells[7]),
                "total": to_int(cells[9]),
                "screens": to_int(cells[10]),
            }
        )
    return out[:LIMIT]


def main() -> int:
    today = datetime.date.today()
    for back in range(1, 5):
        day = (today - datetime.timedelta(days=back)).strftime("%Y-%m-%d")
        try:
            rows = parse(fetch(day))
        except Exception as e:  # 네트워크·차단은 다음 날짜로 넘어가서 재시도
            print(f"[warn] {day} 조회 실패: {e}", file=sys.stderr)
            continue
        if not rows:
            print(f"[info] {day} 데이터 없음, 하루 더 거슬러 올라감", file=sys.stderr)
            continue

        payload = {
            "date": day,
            "updated": datetime.datetime.now(datetime.timezone.utc)
            .replace(microsecond=0)
            .isoformat(),
            "source": "영화진흥위원회 영화관입장권 통합전산망",
            "sourceUrl": URL,
            "rows": rows,
        }
        OUT.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"[ok] {day} 기준 {len(rows)}편 저장 -> {OUT}")
        for r in rows[:5]:
            print(f"     {r['rank']:>2}. {r['title']}  점유율 {r['share']}%  누적 {r['total']:,}")
        return 0

    print("[error] 최근 4일 중 어느 날짜에서도 데이터를 얻지 못했다", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
