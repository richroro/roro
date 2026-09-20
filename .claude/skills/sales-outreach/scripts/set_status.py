# -*- coding: utf-8 -*-
"""Update a lead's pipeline status (new/contacted/replied/won/lost/unsubscribed)."""
import argparse
import common


def main():
    ap = argparse.ArgumentParser(description="리드 상태 변경")
    ap.add_argument("--email", required=True)
    ap.add_argument("--status", required=True,
                    help="new|contacted|replied|won|lost|unsubscribed")
    args = ap.parse_args()

    ok = common.set_status(args.email, args.status)
    if ok:
        print(f"상태 변경: {args.email} → {args.status}")
    else:
        print(f"해당 이메일의 리드를 찾지 못했습니다: {args.email}")


if __name__ == "__main__":
    main()
