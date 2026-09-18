#!/usr/bin/env python3
"""환경 점검 (auto-shorts).

    python check_env.py            # 도구·패키지·폰트·API 키·네트워크 확인
    python check_env.py --probe    # 추가로 edge-tts 로 짧은 문장을 실제 합성해 본다

결과 마지막 줄에 OK / 문제 요약을 낸다. 문제가 있으면 각 줄의 안내대로 고친 뒤 다시 실행.
"""
from __future__ import annotations

import argparse
import importlib
import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CAPTION_FONT_FILE, FONT_DIR, SKILL_DIR  # noqa: E402

REQUIRED_FILTERS = ["zoompan", "xfade", "ass", "sidechaincompress", "loudnorm", "amix", "apad"]
HOSTS = {
    "Edge TTS (speech.platform.bing.com)": "speech.platform.bing.com",
    "Pollinations 이미지": "image.pollinations.ai",
    "Openverse": "api.openverse.org",
    "Wikimedia Commons": "commons.wikimedia.org",
    "Pexels": "api.pexels.com",
    "Jamendo": "api.jamendo.com",
    "Freesound": "freesound.org",
}
KEYS = {
    "PEXELS_API_KEY": "스톡 사진 (선택, https://www.pexels.com/api/)",
    "UNSPLASH_ACCESS_KEY": "스톡 사진 (선택, https://unsplash.com/developers)",
    "PIXABAY_API_KEY": "스톡 사진 (선택, https://pixabay.com/api/docs/)",
    "JAMENDO_CLIENT_ID": "CC 음악 (선택, https://devportal.jamendo.com/)",
    "FREESOUND_API_KEY": "CC 음악/효과음 (선택, https://freesound.org/apiv2/apply/)",
    "POLLINATIONS_TOKEN": "AI 이미지 한도 상향 (선택, https://pollinations.ai)",
}


def reachable(host: str):
    """HTTPS 로 실제 요청을 보내 본다(프록시 환경변수 반영). 응답 코드는 무엇이든 '도달'로 본다."""
    try:
        import requests  # type: ignore

        requests.head(f"https://{host}/", timeout=8, allow_redirects=False)
        return None
    except ImportError:
        try:
            with socket.create_connection((host, 443), timeout=6):
                return None
        except Exception as e:  # noqa: BLE001
            return e.__class__.__name__
    except Exception as e:  # noqa: BLE001
        return f"{e.__class__.__name__}: {str(e)[:80]}"


def ok(msg):
    print(f"  ✓ {msg}")


def bad(msg):
    print(f"  ✗ {msg}")
    return 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true")
    args = ap.parse_args()
    problems = 0

    print("[python]")
    if sys.version_info >= (3, 9):
        ok(f"Python {sys.version.split()[0]}")
    else:
        problems += bad(f"Python 3.9 이상 필요 (현재 {sys.version.split()[0]})")

    print("[packages]")
    for mod, pipname, need in [("edge_tts", "edge-tts", True), ("PIL", "Pillow", True),
                               ("requests", "requests", False), ("gtts", "gTTS", False),
                               ("imageio_ffmpeg", "imageio-ffmpeg", False)]:
        try:
            importlib.import_module(mod)
            ok(pipname)
        except ImportError:
            if need:
                problems += bad(f"{pipname} 없음 →  pip install -r {SKILL_DIR / 'requirements.txt'}")
            else:
                print(f"  - {pipname} 없음 (선택) →  pip install {pipname}")

    print("[ffmpeg]")
    try:
        from common import find_ffmpeg
        ff = find_ffmpeg()
        ver = subprocess.run([ff, "-version"], capture_output=True, text=True).stdout.splitlines()[0]
        ok(f"{ver}  ({ff})")
        filters = subprocess.run([ff, "-hide_banner", "-filters"], capture_output=True, text=True).stdout
        missing = [f for f in REQUIRED_FILTERS if f" {f} " not in filters]
        if missing:
            problems += bad(f"필터 없음: {missing} — 정식 빌드(Gyan.FFmpeg 'full' 또는 pip imageio-ffmpeg)를 쓰세요")
        else:
            ok("필요한 필터 모두 있음 (" + ", ".join(REQUIRED_FILTERS) + ")")
        if "libx264" not in subprocess.run([ff, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout:
            problems += bad("libx264 인코더 없음")
    except SystemExit:
        problems += 1

    print("[fonts]")
    if CAPTION_FONT_FILE.exists():
        ok(f"{CAPTION_FONT_FILE.name} ({CAPTION_FONT_FILE.stat().st_size // 1024}KB)")
    else:
        problems += bad(f"자막 폰트 없음: {CAPTION_FONT_FILE} — git 에서 assets/fonts 를 받았는지 확인")

    print("[api keys] (전부 선택 — 없으면 키 불필요 제공자와 로컬 합성으로 진행)")
    for k, desc in KEYS.items():
        v = os.environ.get(k)
        print(f"  {'✓' if v else '-'} {k:<22} {'설정됨' if v else '없음'}  {desc}")

    print("[network] (HTTPS 도달 여부만 확인)")
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        print(f"  ! HTTPS_PROXY 설정됨({proxy}) — 프록시 정책에 따라 아래 결과와 실제가 다를 수 있음")
    for label, host in HOSTS.items():
        err = reachable(host)
        if err is None:
            ok(f"{label}")
        else:
            print(f"  ! {label}: {err} (막혀 있으면 폴백 제공자로 진행됨 — 실패 아님)")

    if args.probe:
        print("[probe] edge-tts 합성 테스트")
        try:
            import tts
            out = Path(os.environ.get("TEMP") or os.environ.get("TMPDIR") or "/tmp") / "auto_shorts_probe.mp3"
            info = tts.synthesize("안녕하세요, 오토 쇼츠 테스트입니다.", out, engine="edge")
            ok(f'{info["engine"]} {info["voice"]} {info["duration"]}s 단어 {len(info["words"])}개 ({info["timing"]})')
        except SystemExit:
            problems += bad("edge-tts 합성 실패 — 네트워크/프록시 확인, 또는 --tts-engine gtts 로 대체")

    print()
    if problems:
        print(f"문제 {problems}건 — 위 ✗ 항목을 해결한 뒤 다시 실행하세요.")
        sys.exit(1)
    print("OK — 제작을 시작할 수 있습니다.")


if __name__ == "__main__":
    main()
