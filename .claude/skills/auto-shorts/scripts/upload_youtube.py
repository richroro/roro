#!/usr/bin/env python3
"""유튜브 쇼츠 업로드 (auto-shorts).

만든 영상을 YouTube Data API v3 로 올린다. 제목·설명·해시태그·사진 출처 표기는
프로젝트의 meta.md / project.json 에서 자동으로 채운다.

처음 한 번(내 PC에서, 브라우저가 열린다):
    1) https://console.cloud.google.com 에서 프로젝트 만들기 → "YouTube Data API v3" 사용 설정
    2) 사용자 인증 정보 → OAuth 클라이언트 ID → **데스크톱 앱** → JSON 내려받기
       → .claude/skills/auto-shorts/secrets/client_secret.json 으로 저장
    3) python scripts/upload_youtube.py --auth        # 구글 로그인 동의 → secrets/youtube_token.json 생성

그 뒤로는 한 줄:
    python scripts/upload_youtube.py --slug honey-never-spoils            # 비공개로 올림(기본)
    python scripts/upload_youtube.py --slug honey-never-spoils --privacy public
    python scripts/upload_youtube.py --slug honey-never-spoils --dry-run  # 올리지 않고 내용만 확인

기본값이 **비공개(private)** 인 이유: 올린 뒤 유튜브 스튜디오에서 썸네일·자막·제목을 확인하고
직접 공개하는 편이 안전하다. `--privacy public` 을 줘야 바로 공개된다.

주의
- 하루 업로드 할당량: API 기본 10,000 유닛, 업로드 1건이 1,600 유닛 → 하루 약 6편.
- 60초 이하 9:16 영상은 유튜브가 자동으로 쇼츠로 인식한다(제목의 #Shorts 는 보조 신호).
- CC BY 사진을 썼다면 설명란 출처 표기가 **의무**다. 이 스크립트가 meta.md 에서 옮겨 넣는다.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR, die, log, media_duration, read_json, warn  # noqa: E402

SECRETS = SKILL_DIR / "secrets"
CLIENT_SECRET = SECRETS / "client_secret.json"
TOKEN = SECRETS / "youtube_token.json"
UPLOADS = SKILL_DIR / "data" / "uploads.jsonl"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.readonly"]
CATEGORIES = {"education": "27", "entertainment": "24", "science": "28", "pets": "15",
              "people": "22", "howto": "26", "music": "10"}
STAGE = "youtube"


# ---------------------------------------------------------------- 인증
def get_service(interactive: bool = False):
    try:
        from google.auth.transport.requests import Request  # type: ignore
        from google.oauth2.credentials import Credentials  # type: ignore
        from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
        from googleapiclient.discovery import build  # type: ignore
    except ImportError:
        die(STAGE, "구글 클라이언트 라이브러리가 필요합니다:\n"
                   "  pip install google-api-python-client google-auth-oauthlib google-auth-httplib2")
    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN.write_text(creds.to_json(), encoding="utf-8")
    if not creds or not creds.valid:
        if not interactive:
            die(STAGE, f"로그인이 필요합니다. 먼저 실행:  python {Path(__file__).name} --auth")
        if not CLIENT_SECRET.exists():
            die(STAGE, f"OAuth 클라이언트 파일이 없습니다: {CLIENT_SECRET}\n"
                       "  구글 클라우드 콘솔 → 사용자 인증 정보 → OAuth 클라이언트 ID(데스크톱 앱) → JSON 내려받아 저장")
        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
        creds = flow.run_local_server(port=0)          # 브라우저 동의 화면
        SECRETS.mkdir(parents=True, exist_ok=True)
        TOKEN.write_text(creds.to_json(), encoding="utf-8")
        log(STAGE, f"로그인 완료 → {TOKEN}")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


# ---------------------------------------------------------------- 메타데이터
def credits_from_meta(meta_path: Path) -> str:
    """meta.md 의 '출처 표기' 절을 설명란용 텍스트로."""
    if not meta_path.exists():
        return ""
    text = meta_path.read_text(encoding="utf-8")
    m = re.search(r"## 출처 표기.*?\n(.*?)(?:\n## |\Z)", text, re.S)
    if not m:
        return ""
    lines = [l.strip() for l in m.group(1).splitlines() if l.strip().startswith("- ")]
    lines = [l for l in lines if l != "- 없음"]
    return "\n".join(lines)


def build_body(project: dict, meta_path: Path, category: str, privacy: str) -> dict:
    meta = project.get("meta") or {}
    tags = [t.lstrip("#") for t in (meta.get("hashtags") or [])]
    title = project["title"].strip()
    if "#shorts" not in title.lower() and len(title) <= 90:
        title = f"{title} #Shorts"
    parts = [meta.get("description", "").strip()]
    if tags:
        hashtags = [f"#{t}" for t in tags[:8]]
        if not any(t.lower() == "shorts" for t in tags[:8]):
            hashtags.append("#Shorts")
        parts.append(" ".join(hashtags))
    credits = credits_from_meta(meta_path)
    if credits:
        parts.append("📸 사진 출처 (Creative Commons)\n" + credits)
    bgm = "🎵 배경음악: 직접 생성 (저작권 없음)"
    parts.append(bgm)
    description = "\n\n".join(p for p in parts if p)[:4900]
    return {
        "snippet": {
            "title": title[:100],
            "description": description,
            "tags": tags[:15],
            "categoryId": CATEGORIES.get(category, category),
            "defaultLanguage": project.get("lang", "ko"),
            "defaultAudioLanguage": project.get("lang", "ko"),
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
            "license": "youtube",
            "embeddable": True,
        },
    }


# ---------------------------------------------------------------- 업로드
def upload(service, video: Path, body: dict, thumbnail: Path | None = None) -> dict:
    from googleapiclient.errors import HttpError  # type: ignore
    from googleapiclient.http import MediaFileUpload  # type: ignore

    media = MediaFileUpload(str(video), chunksize=4 * 1024 * 1024, resumable=True, mimetype="video/mp4")
    req = service.videos().insert(part="snippet,status", body=body, media_body=media)
    response, last = None, -1
    while response is None:
        try:
            status, response = req.next_chunk()
        except HttpError as e:  # noqa: PERF203
            die(STAGE, f"업로드 실패: {e}")
        if status:
            pct = int(status.progress() * 100)
            if pct >= last + 10:
                log(STAGE, f"업로드 {pct}%")
                last = pct
    vid = response["id"]
    log(STAGE, f"업로드 완료: https://youtube.com/shorts/{vid}")
    if thumbnail and thumbnail.exists():
        try:
            service.thumbnails().set(videoId=vid, media_body=str(thumbnail)).execute()
            log(STAGE, "썸네일 설정 완료")
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"썸네일 설정 실패(채널 인증이 필요할 수 있음): {e}")
    return response


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 유튜브 업로드")
    ap.add_argument("--auth", action="store_true", help="최초 1회 구글 로그인(브라우저)")
    ap.add_argument("--slug", help="shorts_output 아래 폴더 이름")
    ap.add_argument("--out", default="shorts_output")
    ap.add_argument("--privacy", default="private", choices=["private", "unlisted", "public"],
                    help="기본 private — 스튜디오에서 확인 후 공개하는 것을 권장")
    ap.add_argument("--category", default="education", help=", ".join(CATEGORIES))
    ap.add_argument("--no-thumbnail", action="store_true")
    ap.add_argument("--dry-run", action="store_true", help="올리지 않고 제목·설명만 출력")
    args = ap.parse_args()

    if args.auth:
        service = get_service(interactive=True)
        me = service.channels().list(part="snippet", mine=True).execute()
        items = me.get("items") or []
        if items:
            log(STAGE, f'채널: {items[0]["snippet"]["title"]}')
        else:
            warn(STAGE, "이 계정에 유튜브 채널이 없습니다. youtube.com 에서 채널을 먼저 만드세요.")
        return
    if not args.slug:
        ap.error("--slug 또는 --auth 가 필요합니다")

    pdir = Path(args.out) / args.slug
    project = read_json(pdir / "project.json")
    if not project:
        die(STAGE, f"프로젝트를 찾을 수 없습니다: {pdir / 'project.json'}")
    video = pdir / "final.mp4"
    if not video.exists():
        die(STAGE, f"영상이 없습니다: {video}")
    dur = media_duration(video)
    if dur > 60:
        warn(STAGE, f"길이 {dur:.0f}s — 60초를 넘으면 쇼츠가 아닌 일반 영상으로 배급될 수 있습니다")

    body = build_body(project, pdir / "meta.md", args.category, args.privacy)
    print("─" * 60)
    print("제목 :", body["snippet"]["title"])
    print("공개 :", body["status"]["privacyStatus"], "· 카테고리", body["snippet"]["categoryId"],
          f"· 길이 {dur:.1f}s")
    print("태그 :", ", ".join(body["snippet"]["tags"]) or "(없음)")
    print("설명 :")
    print("\n".join("   " + l for l in body["snippet"]["description"].splitlines()))
    print("─" * 60)
    if args.dry_run:
        log(STAGE, "--dry-run 이라 업로드하지 않았습니다")
        return

    service = get_service()
    thumb = None if args.no_thumbnail else pdir / "thumbnail.jpg"
    resp = upload(service, video, body, thumb)
    UPLOADS.parent.mkdir(parents=True, exist_ok=True)
    with UPLOADS.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"slug": args.slug, "video_id": resp["id"], "privacy": args.privacy,
                            "title": body["snippet"]["title"],
                            "uploaded_at": dt.datetime.now().isoformat(timespec="minutes")},
                           ensure_ascii=False) + "\n")
    log(STAGE, f'성과는 나중에:  python scripts/log_result.py --slug {args.slug} --views N --avg-view-pct P')


if __name__ == "__main__":
    main()
