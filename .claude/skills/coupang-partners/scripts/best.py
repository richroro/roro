# -*- coding: utf-8 -*-
"""카테고리별 베스트 상품 / 골드박스(오늘의 특가) 조회.

    python best.py --list-categories                 # categoryId 목록
    python best.py --category 1016 --limit 5         # 가전디지털 베스트
    python best.py --goldbox --format html --out goldbox.html
    python best.py --category 1019 --format json --out books.json   # render.py 입력용

"이번 주 베스트셀러 재테크 책", "오늘의 특가 모음" 같은 기획 글에 쓴다.
"""
import argparse
import sys

from common import (
    CATEGORIES,
    PATH_BEST,
    PATH_GOLDBOX,
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


def best_products(category_id, limit=5, sub_id=None, image_size="230x230", use_cache=True):
    path = PATH_BEST.format(category_id=int(category_id))
    params = {
        "limit": max(1, min(int(limit), 100)),
        "subId": sub_id if sub_id is not None else default_sub_id(),
        "imageSize": image_size,
    }
    payload, from_cache = cached_get(path, params, use_cache=use_cache)
    products, _ = normalize_products(payload)
    return products, from_cache


def goldbox_products(sub_id=None, image_size="230x230", use_cache=True):
    params = {
        "subId": sub_id if sub_id is not None else default_sub_id(),
        "imageSize": image_size,
    }
    payload, from_cache = cached_get(PATH_GOLDBOX, params, use_cache=use_cache)
    products, _ = normalize_products(payload)
    return products, from_cache


def main():
    ap = argparse.ArgumentParser(description="쿠팡 베스트/골드박스 상품 조회")
    ap.add_argument("--category", type=int, help="categoryId (--list-categories 로 확인)")
    ap.add_argument("--goldbox", action="store_true", help="골드박스(오늘의 특가) 조회")
    ap.add_argument("--list-categories", action="store_true", help="카테고리 ID 목록 출력")
    ap.add_argument("--limit", type=int, default=5, help="결과 개수 (베스트만 적용)")
    ap.add_argument("--sub-id", help="채널 구분값(subId). 기본은 .env 의 COUPANG_SUB_ID")
    ap.add_argument("--image-size", default="230x230")
    ap.add_argument("--format", choices=["text", "json", "html", "list"], default="text")
    ap.add_argument("--heading", help="html/list 출력 시 블록 제목")
    ap.add_argument("--with-disclosure", action="store_true",
                    help="html/list 출력 끝에 고지 문구 포함 (블로거 외 채널용)")
    ap.add_argument("--out", help="결과를 파일로 저장")
    ap.add_argument("--no-cache", action="store_true")
    args = ap.parse_args()

    if args.list_categories:
        for cid, name in CATEGORIES.items():
            print(f"{cid}  {name}")
        return

    if args.goldbox:
        products, from_cache = goldbox_products(args.sub_id, args.image_size, not args.no_cache)
        products = products[: args.limit] if args.limit else products
        default_heading = "오늘의 쿠팡 골드박스 특가"
    elif args.category:
        if args.category not in CATEGORIES:
            print(f"알 수 없는 categoryId: {args.category} (--list-categories 참고)", file=sys.stderr)
            sys.exit(2)
        products, from_cache = best_products(
            args.category, args.limit, args.sub_id, args.image_size, not args.no_cache
        )
        default_heading = f"{CATEGORIES[args.category]} 베스트"
    else:
        ap.error("--category N, --goldbox, --list-categories 중 하나를 지정하세요.")
        return

    if not products:
        print("조회 결과가 없습니다.")
        sys.exit(2)

    if args.format == "text":
        print_products(products, None, from_cache)
    elif args.format == "json":
        dump_products_json(products, None, args.out)
    else:
        html = render_products_html(
            products,
            heading=args.heading or default_heading,
            style="list" if args.format == "list" else "cards",
            disclosure=args.with_disclosure,
        )
        write_output(html, args.out)


if __name__ == "__main__":
    try:
        main()
    except (SetupError, ApiError) as e:
        print(f"조회 실패: {e}", file=sys.stderr)
        sys.exit(1)
