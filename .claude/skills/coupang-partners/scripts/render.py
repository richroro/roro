# -*- coding: utf-8 -*-
"""상품 목록을 블로그 본문에 넣을 HTML 블록으로 만든다.

두 가지 입력을 받는다:

1) search.py / best.py 가 --format json 으로 저장한 파일 (API 키 있을 때)
    python render.py --from products.json --pick 1,3 --heading "함께 보면 좋은 가계부" --out block.html

2) 파트너스 사이트에서 손으로 만든 링크 (API 키 없을 때도 가능)
    python render.py --item "https://link.coupang.com/a/xxxx|상품명|19900|https://.../img.jpg" \
                     --item "https://link.coupang.com/a/yyyy|다른 상품|25000" --out block.html
   형식: URL|이름|가격(선택)|이미지URL(선택)

--style list 는 이미지 없는 텍스트 링크 목록.
만든 블록은 글 본문(HTML 조각) 원하는 위치에 그대로 붙여 넣으면 된다.
고지 문구는 블로거 발행 스크립트가 본문 맨 위에 자동으로 넣으므로 블록에는 기본 포함하지
않는다. 블로거가 아닌 곳(스레드·정적 사이트)에 붙일 때는 --with-disclosure 로 블록 끝에 붙인다.
"""
import argparse
import json
import sys
from pathlib import Path

from common import render_products_html, write_output


def parse_item(spec):
    parts = [p.strip() for p in spec.split("|")]
    if len(parts) < 2 or not parts[0] or not parts[1]:
        raise ValueError(f"--item 형식은 'URL|이름|가격|이미지URL' 입니다: {spec}")
    price = parts[2] if len(parts) > 2 and parts[2] else None
    image = parts[3] if len(parts) > 3 and parts[3] else None
    return {"url": parts[0], "name": parts[1], "price": price, "image": image}


def load_products(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(data, dict):
        return data.get("products") or []
    return data


def pick(products, spec):
    if not spec:
        return products
    chosen = []
    for token in spec.split(","):
        token = token.strip()
        if not token:
            continue
        idx = int(token) - 1
        if idx < 0 or idx >= len(products):
            raise ValueError(f"--pick 번호가 범위를 벗어났습니다: {token} (1~{len(products)})")
        chosen.append(products[idx])
    return chosen


def main():
    ap = argparse.ArgumentParser(description="쿠팡 상품 블록 HTML 생성")
    ap.add_argument("--from", dest="from_file", help="search/best 의 --format json 결과 파일")
    ap.add_argument("--pick", help="파일에서 고를 번호 (1부터, 쉼표 구분). 기본 전부")
    ap.add_argument("--item", action="append", default=[], help="'URL|이름|가격|이미지URL' (반복 가능)")
    ap.add_argument("--heading", help="블록 제목")
    ap.add_argument("--style", choices=["cards", "list"], default="cards")
    ap.add_argument("--max-name", type=int, default=60, help="상품명 최대 글자수")
    ap.add_argument("--with-disclosure", action="store_true",
                    help="블록 끝에 고지 문구 포함 (블로거 외 채널용; 블로거는 발행 시 자동 삽입)")
    ap.add_argument("--out", help="저장 경로 (없으면 표준 출력)")
    args = ap.parse_args()

    products = []
    if args.from_file:
        products += pick(load_products(args.from_file), args.pick)
    products += [parse_item(s) for s in args.item]
    if not products:
        ap.error("--from 파일이나 --item 을 하나 이상 지정하세요.")

    html = render_products_html(
        products,
        heading=args.heading,
        style=args.style,
        disclosure=args.with_disclosure,
        max_name=args.max_name,
    )
    write_output(html, args.out)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as e:
        print(f"렌더링 실패: {e}", file=sys.stderr)
        sys.exit(1)
