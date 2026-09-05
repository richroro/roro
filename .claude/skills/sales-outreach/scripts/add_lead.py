# -*- coding: utf-8 -*-
"""Add one lead to secrets/leads.csv. Skips duplicate emails."""
import argparse
import sys
import common


def main():
    ap = argparse.ArgumentParser(description="리드 1건 추가 (중복 이메일은 건너뜀)")
    ap.add_argument("--name", required=True, help="호칭/대표 이름")
    ap.add_argument("--email", required=True, help="공개 문의 이메일")
    ap.add_argument("--company", default="", help="상호/브랜드")
    ap.add_argument("--niche", default="", help="업종 (예: 수제 가죽공방)")
    ap.add_argument("--source", default="", help="어디서 찾았는지 (예: 인스타 프로필)")
    ap.add_argument("--hook", default="", help="개인화 훅 1문장 (비면 발송 대상 제외)")
    args = ap.parse_args()

    if not common.valid_email(args.email):
        sys.exit(f"이메일 형식이 올바르지 않습니다: {args.email}")

    if common.find_lead(args.email):
        print(f"이미 있는 리드입니다(건너뜀): {args.email}")
        return

    lead = {
        "name": args.name.strip(),
        "email": args.email.strip(),
        "company": args.company.strip(),
        "niche": args.niche.strip(),
        "source": args.source.strip(),
        "hook": args.hook.strip(),
        "status": "new",
        "added_at": common.now_str(),
        "contacted_at": "",
    }
    common.upsert_lead(lead)
    warn = "" if lead["hook"] else "  ⚠️ 훅이 비어 있어 발송 대상에서 제외됩니다."
    print(f"추가됨: {lead['company'] or lead['name']} <{lead['email']}>{warn}")


if __name__ == "__main__":
    main()
