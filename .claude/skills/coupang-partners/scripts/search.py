# -*- coding: utf-8 -*-
"""키워드로 쿠팡 상품을 검색해 제휴 링크가 붙은 상품 목록을 얻는다.

    python search.py --keyword "가계부"                 # 터미널 요약 (기본 5개)
    python search.py --keyword "가계부" --format html --out block.html
    python search.py --keyword "가계부" --format json --out products.json   # render.py 입력용
    python search.py --keyword "가계부" --limit 10 --no-cache

검색 API 는 시간당 호출 제한이 있어 같은 키워드는 cache/ 의 결과를 재사용한다.
반환되는 productUrl 은 이미 제휴 추적이 붙은 링크라 그대로 본문에 넣으면 된다.
"""
import argparse
import sys

from common import (
    PATH_SEARCH,
    ApiError,
    SetupError,
    cached_get,
    default_sub_id,
    dump_products_json,
    normalize_products,
    print_products,
    render_products_html,
    write_output,
)


def search_products(keyword, limit=5, sub_id=None, image_size="230x230", use_cache=True):
    params = {
        "keyword": keyword,
        "limit": max(1, min(int(limit), 10)),  # 검색 API 는 최대 10개
        "subId": sub_id if sub_id is not None else default_sub_id(),
        "imageSize": image_size,
    }
    payload, from_cache = cached_get(PATH_SEARCH, params, use_cache=use_cache)
    products, landing_url = normalize_products(payload)
    return products, landing_url, from_cache


def main():
    ap = argparse.ArgumentParser(description="쿠팡 상품 검색 (제휴 링크 포함)")
    ap.add_argument("--keyword", required=True, help="검색어")
    ap.add_argument("--limit", type=int, default=5, help="결과 개수 (최대 10)")
    ap.add_argument("--sub-id", help="채널 구분값(subId). 기본은 .env 의 COUPANG_SUB_ID")
    ap.add_argument("--image-size", default="230x230", help="이미지 크기 (예: 230x230, 512x512)")
    ap.add_argument("--format", choices=["text", "json", "html", "list"], default="text",
                    help="text=요약, json=render.py 입력, html=카드 블록, list=텍스트 링크 목록")
    ap.add_argument("--heading", help="html/list 출력 시 블록 제목")
    ap.add_argument("--with-disclosure", action="store_true",
                    help="html/list 출력 끝에 고지 문구 포함 (블로거 외 채널용)")
    ap.add_argument("--out", help="결과를 파일로 저장")
    ap.add_argument("--no-cache", action="store_true", help="캐시 무시하고 새로 조회")
    args = ap.parse_args()

    products, landing_url, from_cache = search_products(
        args.keyword, args.limit, args.sub_id, args.image_size, use_cache=not args.no_cache
    )
    if not products:
        print(f"'{args.keyword}' 검색 결과가 없습니다.")
        sys.exit(2)

    if args.format == "text":
        print_products(products, landing_url, from_cache)
    elif args.format == "json":
        dump_products_json(products, landing_url, args.out)
    else:
        html = render_products_html(
            products,
            heading=args.heading,
            style="list" if args.format == "list" else "cards",
            disclosure=args.with_disclosure,
        )
        write_output(html, args.out)


if __name__ == "__main__":
    try:
        main()
    except (SetupError, ApiError) as e:
        print(f"검색 실패: {e}", file=sys.stderr)
        sys.exit(1)
