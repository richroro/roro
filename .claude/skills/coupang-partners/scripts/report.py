# -*- coding: utf-8 -*-
"""쿠팡 파트너스 실적 리포트 (클릭 / 주문 / 수익 / 취소) 조회.

    python report.py                       # 최근 7일, 네 종류 모두 요약
    python report.py --days 30 --kind commission
    python report.py --start 20260901 --end 20260917 --format json

날짜는 yyyyMMdd. 조회 구간이 너무 길면 API 가 거부하므로 한 달 안쪽으로 나눠서 본다.
subId 별로 어느 채널 링크가 성과를 냈는지 비교할 때 쓴다.
"""
import argparse
import json
import sys
from datetime import datetime, timedelta, timezone

from common import PATH_REPORT, ApiError, SetupError, api_request, default_sub_id

KST = timezone(timedelta(hours=9))
KINDS = ("clicks", "orders", "commission", "cancels")
KIND_LABEL = {"clicks": "클릭", "orders": "주문", "commission": "수익", "cancels": "취소"}
# 합계를 낼 숫자 필드 후보 (응답에 있는 것만 더한다)
SUM_FIELDS = ("click", "clicks", "quantity", "gmv", "commission", "orderCount", "cancelCount")


def fetch_report(kind, start, end, sub_id=None, page=0):
    if kind not in KINDS:
        raise ValueError(f"kind 는 {KINDS} 중 하나여야 합니다.")
    params = {
        "startDate": start,
        "endDate": end,
        "subId": sub_id if sub_id is not None else default_sub_id(),
        "page": page,
    }
    payload = api_request("GET", PATH_REPORT.format(kind=kind), params)
    data = payload.get("data")
    if isinstance(data, dict):
        rows = data.get("data") or data.get("content") or data.get("list") or []
    else:
        rows = data or []
    return [r for r in rows if isinstance(r, dict)]


def summarize(rows):
    totals = {}
    for row in rows:
        for field in SUM_FIELDS:
            val = row.get(field)
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                totals[field] = totals.get(field, 0) + val
    return totals


def main():
    ap = argparse.ArgumentParser(description="쿠팡 파트너스 실적 리포트")
    ap.add_argument("--days", type=int, default=7, help="오늘부터 며칠 전까지 (기본 7)")
    ap.add_argument("--start", help="시작일 yyyyMMdd (--days 대신)")
    ap.add_argument("--end", help="종료일 yyyyMMdd (기본 오늘)")
    ap.add_argument("--kind", choices=list(KINDS) + ["all"], default="all")
    ap.add_argument("--sub-id", help="특정 채널만 (기본은 .env 의 COUPANG_SUB_ID, 빈 문자열이면 전체)")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    args = ap.parse_args()

    today = datetime.now(KST).date()
    end = args.end or today.strftime("%Y%m%d")
    start = args.start or (today - timedelta(days=max(0, args.days - 1))).strftime("%Y%m%d")
    kinds = KINDS if args.kind == "all" else (args.kind,)

    result = {}
    for kind in kinds:
        rows = fetch_report(kind, start, end, args.sub_id)
        result[kind] = {"rows": rows, "totals": summarize(rows)}

    if args.format == "json":
        print(json.dumps({"start": start, "end": end, "reports": result}, ensure_ascii=False, indent=2))
        return

    print(f"=== 쿠팡 파트너스 실적 {start} ~ {end} ===")
    for kind in kinds:
        info = result[kind]
        totals = ", ".join(f"{k}={v:,.0f}" if isinstance(v, float) else f"{k}={v:,}" for k, v in info["totals"].items())
        print(f"[{KIND_LABEL[kind]}] {len(info['rows'])}건  {totals or '(합계 필드 없음)'}")
        for row in info["rows"][:10]:
            print("   " + json.dumps(row, ensure_ascii=False))
        if len(info["rows"]) > 10:
            print(f"   ... 외 {len(info['rows']) - 10}건 (--format json 으로 전체 확인)")


if __name__ == "__main__":
    try:
        main()
    except (SetupError, ApiError, ValueError) as e:
        print(f"리포트 조회 실패: {e}", file=sys.stderr)
        sys.exit(1)
