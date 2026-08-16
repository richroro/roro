# -*- coding: utf-8 -*-
"""Send one outreach email via the user's own SMTP (Naver by default).

Default is DRY-RUN: nothing is sent unless --send is passed. On a real send it
logs to sent_log.csv, flips the lead's status to `contacted`, and Slack-notifies.
A daily cap guards against accidental blasting.
"""
import argparse
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.utils import formataddr

import common


def send_smtp(env, to_addr, subject, body_md):
    msg = EmailMessage()
    from_name = env.get("FROM_NAME", "")
    from_user = env["SMTP_USER"]
    msg["From"] = formataddr((from_name, from_user)) if from_name else from_user
    msg["To"] = to_addr
    msg["Subject"] = subject
    reply_to = env.get("REPLY_TO")
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body_md)  # plain-text fallback
    msg.add_alternative(common.md_to_html(body_md), subtype="html")

    host = env["SMTP_HOST"]
    port = int(env["SMTP_PORT"])
    ctx = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=30) as s:
            s.login(from_user, env["SMTP_PASSWORD"])
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as s:
            s.starttls(context=ctx)
            s.login(from_user, env["SMTP_PASSWORD"])
            s.send_message(msg)


def main():
    ap = argparse.ArgumentParser(description="영업 이메일 1건 발송 (기본 dry-run)")
    ap.add_argument("--to", required=True, help="수신 이메일")
    ap.add_argument("--subject", required=True)
    ap.add_argument("--body-file", required=True, help="본문 파일 (마크다운/텍스트)")
    ap.add_argument("--lead-email", help="상태 갱신용 leads.csv 이메일 (없으면 --to 사용)")
    ap.add_argument("--daily-cap", type=int, default=20, help="하루 발송 상한 (기본 20)")
    ap.add_argument("--send", action="store_true", help="실제 발송 (없으면 미리보기만)")
    args = ap.parse_args()

    if not common.valid_email(args.to):
        sys.exit(f"수신 이메일 형식 오류: {args.to}")

    body_md = open(args.body_file, encoding="utf-8").read()

    if not args.send:
        print("=== DRY-RUN (발송 안 함) ===")
        print(f"To     : {args.to}")
        print(f"Subject: {args.subject}")
        print("-" * 50)
        print(body_md[:1200])
        print("-" * 50)
        print("실제 발송하려면 --send 를 붙이고, 반드시 사용자 확인 후 실행하세요.")
        return

    env = common.require_smtp_env()

    sent = common.sent_today_count()
    if sent >= args.daily_cap:
        sys.exit(f"오늘 발송 상한({args.daily_cap})에 도달했습니다. 발송 중단. "
                 f"(오늘 {sent}건). 계속하려면 --daily-cap 을 조정하세요.")

    try:
        send_smtp(env, args.to, args.subject, body_md)
    except Exception as e:  # noqa: BLE001
        common.slack_notify(f"❌ 영업메일 발송 실패: {args.to}\n{e}")
        sys.exit(f"발송 실패: {e}")

    common.log_sent(args.to, args.subject)
    target = args.lead_email or args.to
    if common.find_lead(target):
        common.set_status(target, "contacted", contacted=True)
    common.slack_notify(
        f"✅ 영업 이메일 발송\n• 대상: {args.to}\n• 제목: {args.subject}\n"
        f"• 오늘 누적: {sent + 1}/{args.daily_cap}"
    )
    print(f"발송 완료: {args.to}  (오늘 {sent + 1}/{args.daily_cap})")


if __name__ == "__main__":
    main()
