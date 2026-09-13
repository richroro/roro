# -*- coding: utf-8 -*-
"""Send the same template to every `new` lead that has a personalization hook.

Default is DRY-RUN: prints exactly who would receive what. With --send it
sends sequentially with a delay between messages and respects the daily cap.
Leads without a hook, or with a non-`new` status, are skipped (anti-spam).
"""
import argparse
import sys
import time

import common
from render import render_for_lead
from send_email import send_smtp


def eligible_leads():
    out = []
    for r in common.read_leads():
        if r.get("status", "new") != "new":
            continue
        if not r.get("hook", "").strip():
            continue
        if not common.valid_email(r.get("email", "")):
            continue
        if r.get("status") == "unsubscribed":
            continue
        out.append(r)
    return out


def main():
    ap = argparse.ArgumentParser(description="new 상태 리드 일괄 발송 (기본 dry-run)")
    ap.add_argument("--template", required=True, help="templates/ 파일명(확장자 제외)")
    ap.add_argument("--delay", type=float, default=45, help="발송 간 지연 초 (기본 45)")
    ap.add_argument("--daily-cap", type=int, default=20, help="하루 발송 상한 (기본 20)")
    ap.add_argument("--send", action="store_true", help="실제 발송")
    args = ap.parse_args()

    env = common.load_env()
    leads = eligible_leads()
    if not leads:
        print("발송 대상이 없습니다 (status=new 이고 hook 이 있는 리드 없음).")
        return

    print(f"발송 대상 {len(leads)}명 / 템플릿: {args.template}")
    for r in leads:
        subject, _ = render_for_lead(args.template, r, env, allow_empty_hook=False)
        print(f"  - {r.get('company') or r.get('name')} <{r['email']}> | {subject}")

    if not args.send:
        print("\n=== DRY-RUN ===  실제 발송하려면 --send. 먼저 사용자 확인 필수.")
        return

    env = common.require_smtp_env()
    already = common.sent_today_count()
    budget = args.daily_cap - already
    if budget <= 0:
        sys.exit(f"오늘 발송 상한({args.daily_cap}) 도달. 중단.")

    sent = 0
    for r in leads:
        if sent >= budget:
            print(f"하루 상한 도달 — {sent}건 발송 후 중단.")
            break
        subject, body_md = render_for_lead(args.template, r, env)
        try:
            send_smtp(env, r["email"], subject, body_md)
        except Exception as e:  # noqa: BLE001
            common.slack_notify(f"❌ 배치 발송 실패: {r['email']}\n{e}")
            print(f"실패: {r['email']} — {e}")
            continue
        common.log_sent(r["email"], subject)
        common.set_status(r["email"], "contacted", contacted=True)
        sent += 1
        print(f"발송: {r['email']}  ({already + sent}/{args.daily_cap})")
        if sent < budget:
            time.sleep(args.delay)

    common.slack_notify(f"✅ 배치 영업메일 {sent}건 발송 완료 (템플릿: {args.template})")
    print(f"\n총 {sent}건 발송 완료.")


if __name__ == "__main__":
    main()
