# -*- coding: utf-8 -*-
"""Render a personalized email from a template + a lead. Preview only — never
sends. Refuses to render when the personalization hook is empty (anti-spam)."""
import argparse
import sys
import common


def render_for_lead(template, lead, env, allow_empty_hook=False):
    subject_tpl, body_tpl = common.load_template(template)
    ctx = common.build_context(lead, env)
    if not ctx["personal_hook"].strip() and not allow_empty_hook:
        raise SystemExit(
            f"개인화 훅이 비어 있어 렌더링을 막습니다: {lead.get('email')}\n"
            "leads.csv 의 hook 을 채우거나 add_lead.py --hook 로 추가하세요."
        )
    subject = common.render(subject_tpl, ctx)
    body_md = common.render(body_tpl, ctx)
    return subject, body_md


def main():
    ap = argparse.ArgumentParser(description="템플릿+리드 → 개인화 이메일 미리보기")
    ap.add_argument("--template", required=True, help="templates/ 파일명(확장자 제외)")
    ap.add_argument("--lead-email", required=True, help="leads.csv 의 대상 이메일")
    ap.add_argument("--html", action="store_true", help="HTML 본문도 함께 출력")
    args = ap.parse_args()

    lead = common.find_lead(args.lead_email)
    if not lead:
        sys.exit(f"리드를 찾을 수 없습니다: {args.lead_email} (add_lead.py 로 먼저 추가)")

    env = common.load_env()
    subject, body_md = render_for_lead(args.template, lead, env)

    print("=" * 60)
    print(f"To     : {lead.get('name')} <{lead.get('email')}>")
    print(f"Subject: {subject}")
    print("-" * 60)
    print(body_md)
    print("=" * 60)
    if args.html:
        print("\n[HTML]\n" + common.md_to_html(body_md))


if __name__ == "__main__":
    main()
