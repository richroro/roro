# -*- coding: utf-8 -*-
"""YouTube Data API 로 쇼츠 업로드.

    python upload_youtube.py --video shorts_output/xxx/final.mp4 --title "제목" \
        --description "설명 #Shorts" --tags "재테크,돈관리" [--privacy public|unlisted|private]

주의 (구글 정책): 2020-07-28 이후 만든 API 프로젝트가 '감사(audit)'를 통과하기 전에는
API 로 올린 영상이 **비공개(private)로 강제**됩니다. 이 경우 업로드는 되지만 유튜브
스튜디오에서 '공개'로 한 번 바꿔줘야 합니다(폰에서 10초). 감사 신청 방법은
references/setup.md 참고. 통과 후에는 --privacy public 이 그대로 적용됩니다.
"""
import argparse
import sys
from pathlib import Path

from common import CLIENT_SECRET_PATH, YT_TOKEN_PATH, YOUTUBE_SCOPES, load_config


def get_youtube_credentials(interactive=False):
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    creds = None
    if YT_TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(YT_TOKEN_PATH), YOUTUBE_SCOPES)
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        YT_TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
        return creds
    if not interactive:
        raise RuntimeError(
            "유효한 YouTube 토큰이 없습니다. 먼저 auth_youtube.py 로 최초 1회 로그인하세요.\n"
            f"(예상 경로: {YT_TOKEN_PATH})"
        )
    from google_auth_oauthlib.flow import InstalledAppFlow

    if not CLIENT_SECRET_PATH.exists():
        raise RuntimeError(
            f"client_secret.json 이 없습니다: {CLIENT_SECRET_PATH}\n"
            "블로거 스킬에서 쓰던 client_secret.json 을 복사해도 됩니다 (같은 구글 클라우드 "
            "프로젝트에서 YouTube Data API v3 만 추가로 켜면 됨). references/setup.md 참고."
        )
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), YOUTUBE_SCOPES)
    creds = flow.run_local_server(port=0)
    YT_TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    YT_TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    return creds


def get_youtube_service(interactive=False):
    from googleapiclient.discovery import build

    return build("youtube", "v3", credentials=get_youtube_credentials(interactive), cache_discovery=False)


def upload_short(video_path, title, description, tags=None, privacy=None, category_id=None):
    """업로드 후 (video_id, url) 반환. 쇼츠 판정은 유튜브가 세로 비율·길이로 자동 처리."""
    from googleapiclient.http import MediaFileUpload

    cfg = load_config().get("youtube", {})
    privacy = privacy or cfg.get("privacy", "public")
    category_id = category_id or cfg.get("category_id", "22")  # 22 = People & Blogs
    tags = [t for t in (tags or []) if t][:30]

    title = title[:100]
    if "#shorts" not in title.lower() and "#shorts" not in description.lower():
        description = (description.rstrip() + "\n\n#Shorts").strip()

    body = {
        "snippet": {
            "title": title,
            "description": description[:5000],
            "tags": tags,
            "categoryId": str(category_id),
            "defaultLanguage": "ko",
            "defaultAudioLanguage": "ko",
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(str(video_path), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
    service = get_youtube_service(interactive=False)
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"[youtube] 업로드 {int(status.progress() * 100)}%")
    video_id = response["id"]
    actual_privacy = response.get("status", {}).get("privacyStatus", privacy)
    url = f"https://youtube.com/shorts/{video_id}"
    print(f"[youtube] 완료: {url}  (privacy={actual_privacy})")
    if actual_privacy != privacy:
        print("[youtube] 요청한 공개 상태와 다릅니다 — API 프로젝트 감사 전이면 비공개로 강제됩니다. "
              "스튜디오에서 공개로 전환하세요.", file=sys.stderr)
    return video_id, url, actual_privacy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--description", default="")
    ap.add_argument("--tags", default="", help="쉼표 구분")
    ap.add_argument("--privacy", default=None, choices=[None, "public", "unlisted", "private"])
    args = ap.parse_args()
    if not Path(args.video).exists():
        print(f"영상 파일이 없습니다: {args.video}", file=sys.stderr)
        sys.exit(1)
    tags = [t.strip().lstrip("#") for t in args.tags.split(",") if t.strip()]
    _, url, _ = upload_short(args.video, args.title, args.description, tags, args.privacy)
    print(url)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"업로드 실패: {e}", file=sys.stderr)
        sys.exit(1)
