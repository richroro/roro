# -*- coding: utf-8 -*-
"""Shared helpers for the sales-outreach skill.

Handles paths, .env loading, the leads/sent-log CSVs, template rendering,
and Slack notifications. Dependency-light: standard library only (smtplib,
csv, email, urllib), so the skill works without any pip install.
"""
import csv
import json
import re
import sys
import urllib.request
from datetime import datetime, date
from pathlib import Path

# Windows 콘솔이 cp949일 때 한글/이모지 출력이 깨지거나 죽지 않도록 UTF-8로.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

# .../richgogo/.claude/skills/sales-outreach
SKILL_DIR = Path(__file__).resolve().parent.parent
SECRETS_DIR = SKILL_DIR / "secrets"
TEMPLATES_DIR = SKILL_DIR / "templates"
ENV_PATH = SECRETS_DIR / ".env"
LEADS_PATH = SECRETS_DIR / "leads.csv"
SENT_LOG_PATH = SECRETS_DIR / "sent_log.csv"

# .../richgogo (repo root) — for reusing slackbot/.env
REPO_ROOT = SKILL_DIR.parents[2]
SLACK_ENV_PATH = REPO_ROOT / "slackbot" / ".env"

LEAD_FIELDS = [
    "name", "email", "company", "niche", "source",
    "hook", "status", "added_at", "contacted_at",
]
STATUSES = {"new", "contacted", "replied", "won", "lost", "unsubscribed"}


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# .env parsing (simple KEY=VALUE, ignores blanks/comments)
# ---------------------------------------------------------------------------
def load_env(path=ENV_PATH):
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def require_smtp_env():
    env = load_env()
    missing = [k for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD")
               if not env.get(k)]
    if missing:
        raise SystemExit(
            "SMTP 설정이 없습니다. secrets/.env 를 먼저 만드세요 "
            "(references/naver_smtp_setup.md 참고). 누락: " + ", ".join(missing)
        )
    return env


# ---------------------------------------------------------------------------
# Leads CSV
# ---------------------------------------------------------------------------
def read_leads():
    if not LEADS_PATH.exists():
        return []
    with LEADS_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_leads(rows):
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    with LEADS_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=LEAD_FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in LEAD_FIELDS})


def find_lead(email):
    email = (email or "").strip().lower()
    for r in read_leads():
        if r.get("email", "").strip().lower() == email:
            return r
    return None


def upsert_lead(lead):
    rows = read_leads()
    email = lead["email"].strip().lower()
    for i, r in enumerate(rows):
        if r.get("email", "").strip().lower() == email:
            rows[i].update(lead)
            write_leads(rows)
            return "updated"
    rows.append(lead)
    write_leads(rows)
    return "added"


def set_status(email, status, contacted=False):
    if status not in STATUSES:
        raise SystemExit(f"허용되지 않은 상태: {status} (가능: {', '.join(sorted(STATUSES))})")
    rows = read_leads()
    email_l = email.strip().lower()
    hit = False
    for r in rows:
        if r.get("email", "").strip().lower() == email_l:
            r["status"] = status
            if contacted:
                r["contacted_at"] = now_str()
            hit = True
    if hit:
        write_leads(rows)
    return hit


# ---------------------------------------------------------------------------
# Sent log + daily cap
# ---------------------------------------------------------------------------
def log_sent(email, subject):
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    new = not SENT_LOG_PATH.exists()
    with SENT_LOG_PATH.open("a", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["sent_at", "email", "subject"])
        w.writerow([now_str(), email, subject])


def sent_today_count():
    if not SENT_LOG_PATH.exists():
        return 0
    today = date.today().strftime("%Y-%m-%d")
    n = 0
    with SENT_LOG_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.reader(f):
            if row and row[0].startswith(today):
                n += 1
    return n


# ---------------------------------------------------------------------------
# Template rendering
# ---------------------------------------------------------------------------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def valid_email(addr):
    return bool(EMAIL_RE.match((addr or "").strip()))


def load_template(name):
    """Return (subject, body_markdown). First line must be `제목: ...`."""
    path = TEMPLATES_DIR / f"{name}.md"
    if not path.exists():
        avail = ", ".join(sorted(p.stem for p in TEMPLATES_DIR.glob("*.md")))
        raise SystemExit(f"템플릿 없음: {name}. 사용 가능: {avail}")
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    subject = ""
    body_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("제목:"):
            subject = line.split("제목:", 1)[1].strip()
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).strip("\n")
    return subject, body


def render(text, ctx):
    """Replace {{key}} with ctx[key]. Missing keys -> empty string."""
    def repl(m):
        return str(ctx.get(m.group(1).strip(), ""))
    return re.sub(r"\{\{\s*([\w]+)\s*\}\}", repl, text)


def build_context(lead, env):
    return {
        "name": lead.get("name") or "사장님",
        "company": lead.get("company", ""),
        "niche": lead.get("niche", ""),
        "personal_hook": lead.get("hook", ""),
        "hook": lead.get("hook", ""),
        "sender_name": env.get("FROM_NAME", "김병채"),
        "sender_contact": env.get("REPLY_TO", env.get("SMTP_USER", "")),
    }


def md_to_html(md):
    """Minimal markdown->HTML: paragraphs on blank lines, **bold**, line breaks."""
    md = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", md)
    blocks = [b.strip() for b in md.split("\n\n") if b.strip()]
    html_blocks = []
    for b in blocks:
        b = b.replace("\n", "<br>")
        html_blocks.append(f"<p>{b}</p>")
    return (
        '<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,'
        'sans-serif;font-size:15px;line-height:1.7;color:#222;">'
        + "\n".join(html_blocks)
        + "</div>"
    )


# ---------------------------------------------------------------------------
# Slack notification (reuses slackbot/.env)
# ---------------------------------------------------------------------------
def _read_slack_env():
    token = user = None
    if not SLACK_ENV_PATH.exists():
        return None, None
    for line in SLACK_ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("SLACK_BOT_TOKEN"):
            token = line.split("=", 1)[1].strip()
        elif line.startswith("SLACK_ALLOWED_USER_ID"):
            user = line.split("=", 1)[1].strip()
    return token, user


def slack_notify(text):
    """Best-effort DM to the owner. Never raises."""
    token, user = _read_slack_env()
    # local override wins
    ov = load_env().get("SLACK_USER_ID")
    if ov:
        user = ov
    if not token or not user or (user.startswith("U") and "X" in user):
        print("[slack] 건너뜀 (토큰/대상 미설정)", file=sys.stderr)
        return False
    payload = json.dumps({"channel": user, "text": text}).encode("utf-8")
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=payload,
        headers={"Authorization": f"Bearer {token}",
                 "Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        if not body.get("ok"):
            print(f"[slack] API 오류: {body.get('error')}", file=sys.stderr)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        print(f"[slack] 전송 실패: {e}", file=sys.stderr)
        return False
