#!/usr/bin/env python3
"""auto-shorts 공용 유틸.

- ffmpeg 실행 파일 찾기 (PATH → imageio-ffmpeg 번들 → 환경변수)
- 미디어 길이 측정 (ffprobe 없이도 동작)
- 재시도가 붙은 HTTP GET / 다운로드
- 로그, 경로 이스케이프, 작업 폴더 캐시 헬퍼

모든 스크립트가 이 모듈을 import 하므로, 여기의 함수는 외부 패키지 없이도
(requests 가 없으면 urllib 로) 동작하도록 만들어 둔다.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable, Optional

SKILL_DIR = Path(__file__).resolve().parent.parent
FONT_DIR = SKILL_DIR / "assets" / "fonts"
CAPTION_FONT = "Pretendard ExtraBold"   # assets/fonts/Pretendard-ExtraBold.otf 의 패밀리+스타일
CAPTION_FONT_FILE = FONT_DIR / "Pretendard-ExtraBold.otf"
BODY_FONT_FILE = FONT_DIR / "Pretendard-Bold.otf"

WIDTH, HEIGHT, FPS = 1080, 1920, 30
UA = "auto-shorts/1.0 (+https://github.com/richroro/roro; personal shorts generator)"

# API 키는 환경변수 또는 스킬 폴더의 .env(KEY=VALUE, git 에 안 올라감)에서 읽는다.
def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


_load_dotenv(SKILL_DIR / ".env")

# 콘솔이 cp949 등 좁은 인코딩일 때(Windows) 한글 로그가 깨지지 않게 한다.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass


# ---------------------------------------------------------------- 로그
def log(stage: str, msg: str) -> None:
    print(f"[{stage}] {msg}", flush=True)


def warn(stage: str, msg: str) -> None:
    print(f"[{stage}] 경고: {msg}", file=sys.stderr, flush=True)


def die(stage: str, msg: str, code: int = 1) -> None:
    print(f"[{stage}] 오류: {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


# ---------------------------------------------------------------- ffmpeg
_FFMPEG: Optional[str] = None


def find_ffmpeg() -> str:
    """ffmpeg 경로를 돌려준다.

    우선순위: AUTO_SHORTS_FFMPEG 환경변수 → PATH 의 ffmpeg → pip 패키지
    imageio-ffmpeg 가 번들한 정적 바이너리. 셋 다 없으면 설치 방법을 안내하고 종료.
    """
    global _FFMPEG
    if _FFMPEG:
        return _FFMPEG
    env = os.environ.get("AUTO_SHORTS_FFMPEG")
    if env and Path(env).exists():
        _FFMPEG = env
        return env
    on_path = shutil.which("ffmpeg")
    if on_path:
        _FFMPEG = on_path
        return on_path
    try:
        import imageio_ffmpeg  # type: ignore

        _FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
        return _FFMPEG
    except Exception:
        pass
    die(
        "env",
        "ffmpeg 를 찾을 수 없습니다. 둘 중 하나로 설치하세요:\n"
        "  pip install imageio-ffmpeg        (설치만 하면 자동 인식, 권장)\n"
        "  winget install Gyan.FFmpeg        (Windows)  /  brew install ffmpeg (macOS)  /  apt install ffmpeg",
    )
    raise SystemExit  # for type checkers


def run_ffmpeg(args: list[str], stage: str = "ffmpeg", quiet: bool = True) -> subprocess.CompletedProcess:
    """ffmpeg 를 실행하고 실패하면 stderr 꼬리를 보여주며 종료한다."""
    cmd = [find_ffmpeg(), "-hide_banner", "-y", "-nostdin"]
    if quiet:
        cmd += ["-loglevel", "error"]
    cmd += args
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-25:])
        die(stage, f"ffmpeg 실패 (exit {proc.returncode}):\n{tail}\n\n명령: {' '.join(cmd)}")
    return proc


_DUR_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")
_TIME_RE = re.compile(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)")


def media_duration(path: str | Path) -> float:
    """미디어 파일 길이(초). ffprobe 가 있으면 쓰고, 없으면 ffmpeg 로 끝까지 디코드해 잰다.

    mp3 는 헤더 길이가 부정확한 경우가 있어서 실제 디코드 값을 우선한다.
    """
    path = str(path)
    ffprobe = shutil.which("ffprobe")
    if ffprobe:
        try:
            out = subprocess.run(
                [ffprobe, "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=nw=1:nk=1", path],
                capture_output=True, text=True, check=True,
            ).stdout.strip()
            if out and out != "N/A":
                return float(out)
        except Exception:
            pass
    proc = subprocess.run(
        [find_ffmpeg(), "-hide_banner", "-nostdin", "-i", path, "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    times = _TIME_RE.findall(proc.stderr)
    if times:
        h, m, s = times[-1]
        return int(h) * 3600 + int(m) * 60 + float(s)
    m2 = _DUR_RE.search(proc.stderr)
    if m2:
        h, m, s = m2.groups()
        return int(h) * 3600 + int(m) * 60 + float(s)
    die("probe", f"길이를 읽지 못했습니다: {path}")
    raise SystemExit


def ff_path(path: str | Path) -> str:
    """필터 그래프 안에 들어가는 경로 이스케이프 (Windows 드라이브 콜론, 백슬래시, 따옴표)."""
    p = str(Path(path).resolve()).replace("\\", "/")
    p = p.replace(":", "\\:").replace("'", "\\'")
    return p


def has_audio_stream(path: str | Path) -> bool:
    proc = subprocess.run(
        [find_ffmpeg(), "-hide_banner", "-nostdin", "-i", str(path)],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return "Audio:" in proc.stderr


# ---------------------------------------------------------------- 중복 방지
_RESERVE_LOCK = threading.Lock()


def reserve(used: set, key: str) -> bool:
    """아직 안 쓴 항목이면 표시하고 True. 이미 쓴 것이면 False.

    이미지 수집은 여러 씬을 동시에 처리하므로, '고르고 나서 내려받은 뒤 표시'하면 같은 사진이
    두 씬에 들어간다. 고르는 순간 원자적으로 선점해야 한다.
    """
    if not key:
        return True
    with _RESERVE_LOCK:
        if key in used:
            return False
        used.add(key)
        return True


# ---------------------------------------------------------------- HTTP
class Unreachable(RuntimeError):
    """호스트에 아예 닿지 못함(오프라인·프록시 차단·DNS). 같은 실행에서 재시도해도 소용없다."""


_CONN_ERRORS = ("ProxyError", "ConnectionError", "ConnectTimeout", "SSLError", "URLError",
                "NewConnectionError", "MaxRetryError", "gaierror", "timeout", "TimeoutError")


def _is_conn_error(e: Exception) -> bool:
    name = e.__class__.__name__
    return name in _CONN_ERRORS or "Tunnel connection failed" in str(e) or "Max retries exceeded" in str(e)


def http_get(url: str, headers: Optional[dict] = None, timeout: int = 60,
             retries: int = 3, backoff: float = 2.0, stage: str = "http") -> bytes:
    """GET 요청. 429/5xx/네트워크 오류는 지수 백오프로 재시도. 4xx(429 제외)는 즉시 실패.

    requests 가 설치돼 있으면 requests 로(프록시·CA 환경변수 자동 반영), 없으면 urllib.
    """
    hdrs = {"User-Agent": UA, "Accept": "*/*"}
    if headers:
        hdrs.update(headers)
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            try:
                import requests  # type: ignore

                r = requests.get(url, headers=hdrs, timeout=timeout)
                if r.status_code == 429 or r.status_code >= 500:
                    raise RuntimeError(f"HTTP {r.status_code}")
                if r.status_code >= 400:
                    raise PermissionError(f"HTTP {r.status_code}: {r.text[:200]}")
                return r.content
            except ImportError:
                req = urllib.request.Request(url, headers=hdrs)
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return resp.read()
        except PermissionError:
            raise
        except urllib.error.HTTPError as e:  # urllib 경로
            if e.code == 429 or e.code >= 500:
                last_err = e
            else:
                raise PermissionError(f"HTTP {e.code}") from e
        except Exception as e:  # noqa: BLE001
            last_err = e
        if last_err is not None and _is_conn_error(last_err):
            raise Unreachable(f"{urllib.parse.urlparse(url).netloc} 에 연결할 수 없습니다 "
                              f"({last_err.__class__.__name__})") from last_err
        if attempt < retries - 1:
            wait = backoff * (2 ** attempt)
            warn(stage, f"{url[:80]}… 실패({last_err}), {wait:.0f}s 후 재시도")
            time.sleep(wait)
    raise RuntimeError(f"{url[:80]}… 요청 실패: {last_err}")


def http_json(url: str, headers: Optional[dict] = None, timeout: int = 40, stage: str = "http") -> dict:
    return json.loads(http_get(url, headers=headers, timeout=timeout, stage=stage).decode("utf-8", "replace"))


def download(url: str, dest: str | Path, headers: Optional[dict] = None,
             timeout: int = 120, min_bytes: int = 1024, stage: str = "download") -> Path:
    data = http_get(url, headers=headers, timeout=timeout, stage=stage)
    if len(data) < min_bytes:
        raise RuntimeError(f"응답이 너무 작습니다({len(data)}B): {url[:80]}")
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest


def qs(params: dict) -> str:
    return urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})


# ---------------------------------------------------------------- 프로젝트
def load_project(path: str | Path) -> dict:
    p = Path(path)
    if not p.is_file():
        die("project", f"프로젝트 파일이 없습니다: {p}")
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        die("project", f"JSON 문법 오류 ({p}): {e}")
    validate_project(data)
    return data


CPS = 7.0   # 한국어 TTS 가 1초에 읽는 글자 수(rate +10% 실측). 길이 어림에 쓴다.


def validate_project(p: dict) -> None:
    errs = []
    if not isinstance(p.get("scenes"), list) or not p["scenes"]:
        errs.append("scenes 배열이 비어 있습니다")
    else:
        for i, s in enumerate(p["scenes"], 1):
            if not isinstance(s, dict):
                errs.append(f"scene {i}: 객체가 아닙니다")
                continue
            if not str(s.get("narration", "")).strip():
                errs.append(f"scene {i}: narration 이 비어 있습니다")
            if not (s.get("image_prompt") or s.get("image") or s.get("keywords")):
                errs.append(f"scene {i}: image_prompt / keywords / image 중 하나는 있어야 합니다")
    if not p.get("title"):
        errs.append("title 이 없습니다")
    if errs:
        die("project", "프로젝트 검증 실패:\n  - " + "\n  - ".join(errs))
    # 플레이북 규칙 경고(막지는 않는다). 기준은 references/script-writing.md 의 2026 리텐션 데이터.
    scenes = p["scenes"]
    first = scenes[0]
    quote_layout = str((p.get("style") or {}).get("layout", "")) == "quote"

    def on_screen(sc: dict) -> bool:
        return bool(str(sc.get("headline", "")).strip() or (sc.get("beats") or []) or
                    str(sc.get("quote", "")).strip())

    opener = str(first.get("narration", "")).strip()
    if any(opener.startswith(k) for k in ("안녕하세요", "안녕", "오늘은", "여러분 안녕", "제가")):
        warn("project", f"첫 문장이 인사/예고로 시작합니다 → 결론이나 구체적 질문으로 바로 시작하세요: '{opener[:30]}…'")
    if not on_screen(first):
        warn("project", "첫 씬에 headline/beats 가 없습니다 — 첫 프레임의 텍스트 훅은 조회수에 가장 큰 영향을 줍니다(12자 이내)")

    # 실측: 한국어 TTS 가 rate +10% 에서 초당 약 7자를 읽는다(렌더된 영상 5편 기준).
    chars = sum(len(str(s.get("narration", ""))) for s in scenes)
    if chars > 240:
        warn("project", f"나레이션 {chars}자 ≈ {chars / CPS:.0f}초 — 쇼츠 완주율은 20~30초 구간이 가장 높습니다. "
                        f"페이오프 뒤를 잘라 140~210자로 줄이세요")
    elif chars < 110:
        warn("project", f"나레이션 {chars}자 ≈ {chars / CPS:.0f}초 — 너무 짧아 정보가 안 남을 수 있습니다(권장 140~210자)")

    for i, sc in enumerate(scenes, 1):
        ln = len(str(sc.get("narration", "")))
        if ln > 42 and not sc.get("beats"):
            warn("project", f"씬 {i}: 나레이션 {ln}자 ≈ {ln / CPS:.0f}초인데 화면이 한 번도 안 바뀝니다 — "
                            f"문장을 쪼개거나 beats 로 문구를 2~3개 넣으세요")

    covered = sum(1 for sc in scenes if on_screen(sc))
    if covered < len(scenes) * 0.8:
        warn("project", f"화면 문구가 {covered}/{len(scenes)} 씬에만 있습니다 — 시청자 6할 이상이 소리를 끄고 봅니다. "
                        f"거의 모든 씬에 headline 이나 beats 를 넣으세요")

    if not quote_layout and not any(sc.get("loop_back") for sc in scenes):
        warn("project", "마지막 씬에 loop_back 이 없습니다 — 끝 문장이 첫 문장으로 이어지면 반복 재생이 붙습니다")


def slugify(text: str) -> str:
    s = re.sub(r"[^\w\-]+", "-", text.strip().lower(), flags=re.UNICODE).strip("-")
    return s[:60] or "shorts"


def read_json(path: str | Path, default=None):
    p = Path(path)
    if not p.exists():
        return default
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(path: str | Path, data) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def fresh(dest: str | Path, force: bool = False) -> bool:
    """dest 가 이미 있고 force 가 아니면 False(건너뜀)."""
    return not (Path(dest).exists() and Path(dest).stat().st_size > 0 and not force)


def env_key(*names: str) -> Optional[str]:
    for n in names:
        v = os.environ.get(n)
        if v and v.strip():
            return v.strip()
    return None


def chunks(seq: list, n: int) -> Iterable[list]:
    for i in range(0, len(seq), n):
        yield seq[i:i + n]
