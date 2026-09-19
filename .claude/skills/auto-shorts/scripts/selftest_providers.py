#!/usr/bin/env python3
"""이미지 제공자 자체 테스트 (auto-shorts).

실제 스톡 API 를 부르지 않고도 각 제공자의 **검색 → 후보 선택 → 다운로드 → 1080x1920 정규화 →
출처 문구 생성** 경로가 동작하는지 확인한다. 로컬에 가짜 API 서버를 띄우고 진짜 JPEG 를 내려받게 한다.

    python selftest_providers.py

네트워크가 막힌 환경에서도 돌아가므로, 스크립트를 고친 뒤 회귀 확인용으로 쓴다.
실제 API 연결까지 확인하려면 키를 넣고:  python fetch_images.py --keywords "honey jar" --out /tmp/t.jpg
"""
from __future__ import annotations

import io
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image  # type: ignore

PHOTO = None          # 서버가 돌려줄 진짜 JPEG 바이트
PORT = 0


def make_photo(w: int = 1200, h: int = 1600) -> bytes:
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):                       # 세로 그라디언트 + 격자 → 크롭/리사이즈가 보이게
        for x in range(0, w, 1):
            px[x, y] = ((x * 255) // w, (y * 255) // h, 128 if (x // 100 + y // 100) % 2 else 200)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)
    return buf.getvalue()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):        # 조용히
        pass

    def _json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        base = f"http://127.0.0.1:{PORT}"
        img = f"{base}/img/photo.jpg"
        if u.path == "/img/photo.jpg":
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(PHOTO)))
            self.end_headers()
            self.wfile.write(PHOTO)
        elif u.path == "/pexels":
            assert self.headers.get("Authorization"), "pexels 는 Authorization 헤더가 있어야 한다"
            self._json({"photos": [{"url": "https://pexels.test/p/1", "photographer": "Jane Doe",
                                    "src": {"portrait": img, "large2x": img}}]})
        elif u.path == "/unsplash":
            assert "Client-ID" in (self.headers.get("Authorization") or "")
            self._json({"results": [{"urls": {"raw": img}, "user": {"name": "John Roe"},
                                     "links": {"html": "https://unsplash.test/p/2",
                                               "download_location": f"{base}/img/photo.jpg"}}]})
        elif u.path == "/pixabay":
            assert q.get("key"), "pixabay 는 key 파라미터가 있어야 한다"
            self._json({"hits": [{"largeImageURL": img, "pageURL": "https://pixabay.test/p/3", "user": "Pixy"}]})
        elif u.path == "/openverse":
            self._json({"results": [{"url": img, "foreign_landing_url": "https://openverse.test/p/4",
                                     "title": "Honey jar", "creator": "CC Person",
                                     "license": "by", "license_version": "4.0"}]})
        elif u.path == "/wikimedia":
            self._json({"query": {"pages": {"1": {"title": "File:Honey.jpg", "imageinfo": [
                {"thumburl": img, "url": img, "descriptionurl": "https://commons.test/File:Honey.jpg",
                 "width": 1200, "height": 1600,
                 "extmetadata": {"Artist": {"value": "<a href='x'>Wiki User</a>"},
                                 "LicenseShortName": {"value": "CC BY-SA 4.0"}}}]}}}})
        elif u.path.startswith("/pollinations/"):
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(PHOTO)))
            self.end_headers()
            self.wfile.write(PHOTO)
        else:
            self.send_error(404)


def main() -> int:
    global PHOTO, PORT
    PHOTO = make_photo()
    srv = HTTPServer(("127.0.0.1", 0), Handler)
    PORT = srv.server_port
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{PORT}"

    os.environ.update({
        "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost",
        "AUTO_SHORTS_PEXELS_API": f"{base}/pexels",
        "AUTO_SHORTS_UNSPLASH_API": f"{base}/unsplash",
        "AUTO_SHORTS_PIXABAY_API": f"{base}/pixabay",
        "AUTO_SHORTS_OPENVERSE_API": f"{base}/openverse",
        "AUTO_SHORTS_WIKIMEDIA_API": f"{base}/wikimedia",
        "AUTO_SHORTS_POLLINATIONS_API": f"{base}/pollinations/",
        "PEXELS_API_KEY": "test-key", "UNSPLASH_ACCESS_KEY": "test-key", "PIXABAY_API_KEY": "test-key",
    })
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import fetch_images as fi     # 엔드포인트를 읽으므로 환경변수 설정 뒤에 import

    tmp = Path(os.environ.get("TMPDIR") or "/tmp") / "auto_shorts_selftest"
    tmp.mkdir(parents=True, exist_ok=True)
    expect = {
        "pexels": "Jane Doe", "unsplash": "John Roe", "pixabay": "Pixy",
        "openverse": "CC Person", "wikimedia": "Wiki User", "pollinations": "AI generated",
    }
    failed = []
    for name, needle in expect.items():
        out = tmp / f"{name}.jpg"
        out.unlink(missing_ok=True)
        try:
            info = fi.fetch_image(keywords="golden honey jar macro", prompt="a jar of honey",
                                  out=out, providers=[name, "card"], seed=1)
            size = Image.open(out).size
            assert info["provider"] == name, f'provider={info["provider"]} (카드로 떨어짐)'
            assert size == (fi.WIDTH, fi.HEIGHT), f"크기 {size}"
            assert needle in (info.get("credit") or ""), f'출처 문구에 {needle!r} 없음: {info.get("credit")}'
            print(f'  ✓ {name:<12} {size[0]}x{size[1]}  {info.get("credit", "")[:60]}')
        except Exception as e:  # noqa: BLE001
            failed.append(f"{name}: {e}")
            print(f"  ✗ {name:<12} {e}")

    # 검색어 축약: 긴 키워드 → 짧은 키워드로 줄여가며 재시도하는지
    variants = list(fi.query_variants("a golden honey jar dripping macro"))
    assert variants[0].startswith("golden"), variants
    assert len(variants) >= 3 and len(variants[-1].split()) == 1, variants
    print(f"  ✓ 검색어 축약   {variants}")

    # 품질 필터: 작은 이미지와 파노라마는 걸러지는지
    for size, why in [((320, 400), "작은 이미지"), ((3000, 600), "파노라마")]:
        try:
            fi._check_quality(Image.new("RGB", size))
            failed.append(f"품질 필터가 {why}({size})를 통과시킴")
            print(f"  ✗ 품질 필터   {why} 통과됨")
        except ValueError:
            print(f"  ✓ 품질 필터   {why} 거름 {size}")

    srv.shutdown()
    print()
    if failed:
        print(f"실패 {len(failed)}건:\n  - " + "\n  - ".join(failed))
        return 1
    print("모든 제공자 경로 정상 (검색 → 다운로드 → 1080x1920 정규화 → 출처 표기)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
