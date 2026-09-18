# -*- coding: utf-8 -*-
"""쿠팡 상품/검색/기획전 URL 을 제휴(수익 추적) 링크로 바꾼다.

    python deeplink.py "https://www.coupang.com/vp/products/123456"
    python deeplink.py URL1 URL2 URL3 --sub-id blog
    python deeplink.py --file urls.txt --format json

쿠팡에서 본 상품 페이지 주소를 그대로 붙여 넣으면 link.coupang.com/a/... 형태의
짧은 제휴 링크가 나온다. 한 번에 여러 개(최대 수십 개)를 넘길 수 있다.
"""
import argparse
import json
import sys
from pathlib import Path

from common import PATH_DEEPLINK, ApiError, SetupError, api_request, default_sub_id


def make_deeplinks(urls, sub_id=None):
    urls = [u.strip() for u in urls if u and u.strip()]
    if not urls:
        raise ValueError("변환할 URL 이 없습니다.")
    body = {"coupangUrls": urls}
    sub_id = sub_id if sub_id is not None else default_sub_id()
    if sub_id:
        body["subId"] = sub_id
    payload = api_request("POST", PATH_DEEPLINK, body=body)
    links = []
    for item in payload.get("data") or []:
        links.append(
            {
                "originalUrl": item.get("originalUrl"),
                "shortenUrl": item.get("shortenUrl"),
                "landingUrl": item.get("landingUrl"),
            }
        )
    return links


def main():
    ap = argparse.ArgumentParser(description="쿠팡 URL → 제휴 딥링크 변환")
    ap.add_argument("urls", nargs="*", help="쿠팡 URL (여러 개 가능)")
    ap.add_argument("--file", help="한 줄에 URL 하나씩 적힌 파일")
    ap.add_argument("--sub-id", help="채널 구분값(subId). 기본은 .env 의 COUPANG_SUB_ID")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    args = ap.parse_args()

    urls = list(args.urls)
    if args.file:
        urls += [
            line.strip()
            for line in Path(args.file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
    if not urls:
        ap.error("URL 을 인자로 주거나 --file 로 지정하세요.")

    links = make_deeplinks(urls, args.sub_id)
    if args.format == "json":
        print(json.dumps(links, ensure_ascii=False, indent=2))
        return
    for link in links:
        print(f"원본 : {link['originalUrl']}")
        print(f"제휴 : {link['shortenUrl']}")
        print()


if __name__ == "__main__":
    try:
        main()
    except (SetupError, ApiError, ValueError) as e:
        print(f"딥링크 생성 실패: {e}", file=sys.stderr)
        sys.exit(1)
