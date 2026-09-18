# -*- coding: utf-8 -*-
"""쿠팡 파트너스 연동 상태 점검.

    python setup_check.py            # 키 파일 확인 + 실제 API 1회 호출(딥링크)
    python setup_check.py --offline  # 네트워크 없이 파일/시각만 확인

키가 없으면 무엇을 해야 하는지 안내한다. 실제 호출은 딥링크 API 1회라
검색 API 호출 제한을 소모하지 않는다.
"""
import argparse
import sys
from datetime import datetime, timezone

from common import ENV_PATH, PATH_DEEPLINK, SKILL_DIR, ApiError, SetupError, api_request, load_env

TEST_URL = "https://www.coupang.com/np/campaigns/82"  # 쿠팡 골드박스 페이지 (항상 존재)


def main(offline=False):
    print("=== 쿠팡 파트너스 설정 점검 ===")
    print(f"스킬 경로 : {SKILL_DIR}")
    print(f"키 파일   : {ENV_PATH}  ({'있음' if ENV_PATH.exists() else '없음'})")

    env = load_env()
    ak = env.get("COUPANG_ACCESS_KEY")
    sk = env.get("COUPANG_SECRET_KEY")
    sub = env.get("COUPANG_SUB_ID")
    print(f"ACCESS_KEY: {'설정됨 (' + ak[:4] + '…)' if ak else '비어 있음'}")
    print(f"SECRET_KEY: {'설정됨' if sk else '비어 있음'}")
    print(f"SUB_ID    : {sub or '(없음 — 채널 구분 없이 링크 생성)'}")
    print(f"UTC 시각  : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} "
          "(PC 시계가 몇 분 이상 틀리면 서명 인증이 실패합니다)")

    if not ak or not sk:
        print(
            "\n아직 API 키가 없습니다. 순서:\n"
            "  1) https://partners.coupang.com 가입 → 채널(블로그 URL) 등록\n"
            "  2) 링크를 만들어 활동 → 누적 실적 15만원 이상이면 최종 승인 심사\n"
            "  3) 최종 승인 후 [링크 생성 → API] 에서 Access/Secret Key 발급\n"
            f"  4) {ENV_PATH.parent / '.env.example'} 을 .env 로 복사해 값 입력\n"
            "  키가 나오기 전에는 파트너스 사이트의 '간편 링크 만들기' 로 링크를 만들고\n"
            "  render.py --item 으로 상품 블록을 만들 수 있습니다. (references/coupang_setup.md)"
        )
        sys.exit(2)

    if offline:
        print("\n(--offline) 네트워크 호출은 건너뜁니다. 파일 설정은 정상입니다.")
        return

    print("\n딥링크 API 로 실제 호출 테스트 중...")
    try:
        payload = api_request("POST", PATH_DEEPLINK, body={"coupangUrls": [TEST_URL], **({"subId": sub} if sub else {})})
    except (SetupError, ApiError) as e:
        print(f"실패: {e}", file=sys.stderr)
        sys.exit(1)
    data = (payload.get("data") or [{}])[0]
    print(f"성공! 제휴 링크 예시: {data.get('shortenUrl')}")
    print("이제 search.py / deeplink.py / best.py / report.py 를 쓸 수 있습니다.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="네트워크 호출 없이 설정만 확인")
    main(offline=ap.parse_args().offline)
