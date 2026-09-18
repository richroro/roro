#!/usr/bin/env python3
"""Higgsfield 연동 자체 테스트 (auto-shorts).

실제 API 를 부르지 않고, 로컬에 가짜 생성 API 를 띄워 **작업 생성 → 상태 폴링 → 결과 mp4 다운로드**
흐름과 응답 구조 탐색(id/status/url 키 찾기)이 동작하는지 확인한다.

    python selftest_higgsfield.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import find_ffmpeg  # noqa: E402

VIDEO = b""
POLLS = {"n": 0}
LAST_BODY: dict = {}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        assert self.headers.get("Authorization", "").startswith("Bearer "), "Authorization 헤더 없음"
        n = int(self.headers.get("Content-Length", 0))
        LAST_BODY.update(json.loads(self.rfile.read(n) or b"{}"))
        # 실제 서비스처럼 중첩된 응답으로 돌려준다(키 탐색이 되는지 확인)
        self._json({"data": {"generation": {"id": "job-123", "state": "queued"}}})

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/v1/generations/"):
            POLLS["n"] += 1
            if POLLS["n"] < 2:
                self._json({"data": {"generation": {"id": "job-123", "state": "processing"}}})
            else:
                self._json({"data": {"generation": {"id": "job-123", "state": "completed",
                                                    "assets": [{"video_url": f"http://127.0.0.1:{PORT}/clip.mp4"}]}}})
        elif path == "/clip.mp4":
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(len(VIDEO)))
            self.end_headers()
            self.wfile.write(VIDEO)
        else:
            self.send_error(404)


def main() -> int:
    global VIDEO, PORT
    tmp = Path(os.environ.get("TMPDIR") or "/tmp") / "auto_shorts_hf_test"
    tmp.mkdir(parents=True, exist_ok=True)
    src = tmp / "src.mp4"
    subprocess.run([find_ffmpeg(), "-v", "error", "-y", "-f", "lavfi",
                    "-i", "testsrc2=size=540x960:rate=24:duration=3", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", str(src)], check=True)
    VIDEO = src.read_bytes()

    srv = HTTPServer(("127.0.0.1", 0), Handler)
    PORT = srv.server_port
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    os.environ.update({"NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost",
                       "HIGGSFIELD_API_KEY": "test-key",
                       "HIGGSFIELD_API_BASE": f"http://127.0.0.1:{PORT}/v1"})
    import higgsfield as hf

    cfg = hf.load_config()
    out = tmp / "vid_01.mp4"
    out.unlink(missing_ok=True)
    url = hf.generate_scene(cfg, hf.headers(cfg), "a golden trophy on a dark stage", "in", 5.0,
                            "turbo", out, poll_every=0.2, timeout_s=10)
    problems = []
    if not url:
        problems.append("결과 URL 을 받지 못했습니다")
    if not out.exists() or out.stat().st_size < 10_000:
        problems.append(f"클립이 내려받아지지 않았습니다({out})")
    if LAST_BODY.get("aspect_ratio") != "9:16":
        problems.append(f"9:16 이 요청에 없습니다: {LAST_BODY}")
    if LAST_BODY.get("motion") != "dolly_in":
        problems.append(f"motion 프리셋 변환 실패: {LAST_BODY.get('motion')}")
    if "trophy" not in str(LAST_BODY.get("prompt", "")):
        problems.append("프롬프트가 전달되지 않았습니다")
    srv.shutdown()

    print(f"  ✓ 요청 본문      {json.dumps(LAST_BODY, ensure_ascii=False)[:90]}")
    print(f"  ✓ 폴링 횟수      {POLLS['n']} (processing → completed)")
    print(f"  ✓ 결과 다운로드  {out.stat().st_size / 1024:.0f}KB" if out.exists() else "  ✗ 다운로드 실패")
    if problems:
        print("\n실패:\n  - " + "\n  - ".join(problems))
        return 1
    print("\n중첩 응답에서 id/status/url 탐색 · 폴링 · 다운로드까지 정상")
    return 0


PORT = 0

if __name__ == "__main__":
    sys.exit(main())
