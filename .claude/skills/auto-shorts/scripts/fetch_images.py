#!/usr/bin/env python3
"""씬 이미지 수집 (auto-shorts) — 무료 이미지 사이트에서 실제 사진을 받아온다.

기본은 **사진 우선**이다. 무료 스톡 API 를 순서대로 검색해 주제에 맞는 사진을 내려받고,
사진을 못 찾은 씬만 AI 생성(Pollinations)으로 메운다. 그것도 안 되면 로컬 카드를 그린다.
결과는 항상 1080x1920 JPEG 로 정규화하고, 출처·라이선스를 .json 으로 남긴다.

제공자 (기본 순서 = photo):
    pexels        무료 스톡 사진. PEXELS_API_KEY (무료 가입 2분). 품질·검색 적중률 가장 좋음.
    unsplash      무료 스톡 사진. UNSPLASH_ACCESS_KEY.
    pixabay       무료 스톡 사진/일러스트. PIXABAY_API_KEY.
    openverse     CC 이미지 메타검색(Flickr·위키미디어 등). 키 불필요. 출처 표기 필요.
    openimages    구글 Open Images 의 플리커 CC BY 2.0 사진 은행. 키 불필요(첫 사용 때 색인 생성). 출처 표기 필요.
    wikimedia     위키미디어 공용. 키 불필요. 실존 동물·장소·역사·유물에 강함. 출처 표기 필요.
    pollinations  AI 이미지 생성. 키 불필요. 사진으로 찍을 수 없는 개념·상상 장면용.
    picsum        무작위 사진(주제 무관). 기본 순서에는 없다.
    card          로컬 그라디언트 카드(+선택 이모지). 항상 성공하는 최후 수단.

검색어는 짧을수록 잘 맞는다. 긴 키워드는 단어를 하나씩 줄여가며 재시도한다.

CLI:
    python fetch_images.py --keywords "honey jar" --out img_01.jpg
    python fetch_images.py --keywords "honey" --prompt "golden honey dripping" --out a.jpg \
        --providers pexels,openverse,wikimedia,pollinations,card --emoji 🍯
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import random
import re
import sys
import threading
import urllib.parse
from pathlib import Path
from typing import Iterable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (CAPTION_FONT_FILE, HEIGHT, WIDTH, Unreachable, env_key, http_get,  # noqa: E402
                    http_json, log, qs, reserve, warn, write_json)

STAGE = "image"

# 사진 우선(기본) / AI 우선 / 사진만
PROVIDER_SETS = {
    "photo": ["pexels", "unsplash", "pixabay", "openverse", "wikimedia", "openimages", "pollinations", "card"],
    "ai": ["pollinations", "pexels", "unsplash", "pixabay", "openverse", "wikimedia", "openimages", "card"],
    "photo_only": ["pexels", "unsplash", "pixabay", "openverse", "wikimedia", "openimages", "card"],
}
DEFAULT_PROVIDERS = PROVIDER_SETS["photo"]

# 엔드포인트는 환경변수로 덮어쓸 수 있다(오프라인 자체 테스트용, selftest_providers.py 참고).
EP = {
    "pexels": os.environ.get("AUTO_SHORTS_PEXELS_API", "https://api.pexels.com/v1/search"),
    "unsplash": os.environ.get("AUTO_SHORTS_UNSPLASH_API", "https://api.unsplash.com/search/photos"),
    "pixabay": os.environ.get("AUTO_SHORTS_PIXABAY_API", "https://pixabay.com/api/"),
    "openverse": os.environ.get("AUTO_SHORTS_OPENVERSE_API", "https://api.openverse.org/v1/images/"),
    "wikimedia": os.environ.get("AUTO_SHORTS_WIKIMEDIA_API", "https://commons.wikimedia.org/w/api.php"),
    "pollinations": os.environ.get("AUTO_SHORTS_POLLINATIONS_API", "https://image.pollinations.ai/prompt/"),
    "picsum": os.environ.get("AUTO_SHORTS_PICSUM_API", "https://picsum.photos/seed"),
}

UNREACHABLE: set[str] = set()   # 이번 실행에서 연결 자체가 안 된 제공자 (씬마다 재시도하지 않는다)
_UNREACHABLE_LOCK = threading.Lock()

MIN_SHORT_SIDE = 600      # 이보다 작으면 1080x1920 으로 늘렸을 때 뭉갠다
MAX_ASPECT = 2.4          # 너무 가로로 긴 파노라마는 세로 크롭에서 피사체를 잃는다


# ---------------------------------------------------------------- 이미지 처리
def _open_image(data: bytes):
    from PIL import Image  # type: ignore

    img = Image.open(io.BytesIO(data))
    img.load()
    return img


def _best_offset(img, window: int, axis: str) -> int:
    """9:16 으로 자를 때 어느 위치를 남길지 고른다.

    가운데 고정으로 자르면 가로 사진에서 피사체가 잘리거나 하늘·테이블 같은 밋밋한 면만 남아
    켄 번즈로 확대했을 때 단색 화면이 된다. 가장자리 검출 에너지가 큰(=디테일이 많은) 창을 고른다.
    실패하면 가운데로 돌아간다.
    """
    try:
        import numpy as np  # type: ignore
        from PIL import ImageFilter  # type: ignore
    except ImportError:
        return -1
    try:
        w, h = img.size
        scale = 256 / max(w, h)
        sw, sh = max(8, int(w * scale)), max(8, int(h * scale))
        arr = np.asarray(img.convert("L").resize((sw, sh)).filter(ImageFilter.FIND_EDGES), dtype=float)
        energy = arr.sum(axis=0) if axis == "x" else arr.sum(axis=1)
        span = sw if axis == "x" else sh
        win = max(1, min(span, round(window * scale)))
        if win >= span:
            return -1
        cum = np.concatenate([[0.0], np.cumsum(energy)])
        sums = cum[win:] - cum[:-win]
        # 동점이면 가운데에 가까운 쪽을 고른다(구도가 덜 튄다)
        centers = np.abs(np.arange(len(sums)) + win / 2 - span / 2)
        best = int(np.lexsort((centers, -sums))[0])
        return int(round(best / scale))
    except Exception:  # noqa: BLE001
        return -1


def normalize_to_vertical(img, out: Path, quality: int = 92) -> None:
    """9:16 커버 크롭(디테일이 많은 쪽 우선) → 1080x1920 JPEG."""
    from PIL import Image, ImageOps  # type: ignore

    img = ImageOps.exif_transpose(img).convert("RGB")
    w, h = img.size
    target = WIDTH / HEIGHT
    if w / h > target:
        nw = int(h * target)
        x = _best_offset(img, nw, "x")
        x = (w - nw) // 2 if x < 0 else max(0, min(w - nw, x))
        img = img.crop((x, 0, x + nw, h))
    else:
        nh = int(w / target)
        y = _best_offset(img, nh, "y")
        y = (h - nh) // 2 if y < 0 else max(0, min(h - nh, y))
        img = img.crop((0, y, w, y + nh))
    if img.size != (WIDTH, HEIGHT):
        img = img.resize((WIDTH, HEIGHT), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=quality, optimize=True)


def _check_quality(img) -> None:
    """쓸 만한 사진인지. 문제가 있으면 ValueError 로 다음 후보로 넘어간다."""
    w, h = img.size
    if min(w, h) < MIN_SHORT_SIDE:
        raise ValueError(f"해상도 부족 {w}x{h}")
    if max(w, h) / max(1, min(w, h)) > MAX_ASPECT:
        raise ValueError(f"화면비 극단적 {w}x{h}")


# ---------------------------------------------------------------- 검색어
_STOP = {"a", "an", "the", "of", "in", "on", "with", "and", "photo", "photography", "cinematic", "vertical",
         "shot", "closeup", "close-up", "style", "lighting", "dramatic", "realistic", "4k", "8k", "highly",
         "detailed", "background", "view", "scene", "image"}


def keywords_from_prompt(prompt: str) -> str:
    words = [w for w in re.findall(r"[A-Za-z가-힣]+", prompt) if w.lower() not in _STOP]
    return " ".join(words[:4]) or "abstract texture"


def query_variants(keywords: str) -> Iterable[str]:
    """긴 검색어부터 짧은 검색어까지. 스톡 검색은 단어가 적을수록 결과가 많다."""
    words = [w for w in keywords.split() if w.lower() not in _STOP]
    if not words:
        words = keywords.split() or ["nature"]
    seen = set()
    for n in range(len(words), 0, -1):
        q = " ".join(words[:n])
        if q.lower() not in seen:
            seen.add(q.lower())
            yield q


# ---------------------------------------------------------------- 스톡 사진 제공자
def p_pexels(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    key = env_key("PEXELS_API_KEY")
    if not key:
        raise LookupError("PEXELS_API_KEY 없음 (https://www.pexels.com/api/ 에서 무료 발급)")
    for q in query_variants(keywords):
        for orientation in ("portrait", None):
            res = http_json(f'{EP["pexels"]}?{qs({"query": q, "orientation": orientation, "per_page": 15, "size": "large"})}',
                            headers={"Authorization": key}, stage=STAGE)
            for ph in res.get("photos", []):
                src = ph.get("src", {})
                url = src.get("portrait") or src.get("large2x") or src.get("original")
                page = ph.get("url")
                if not url or not reserve(used, page or url):
                    continue
                return http_get(url, timeout=90, stage=STAGE), {
                    "provider": "pexels", "url": page, "query": q, "license": "Pexels License",
                    "credit": f'Photo by {ph.get("photographer")} on Pexels ({page})'}
    raise LookupError("pexels 결과 없음")


def p_unsplash(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    key = env_key("UNSPLASH_ACCESS_KEY")
    if not key:
        raise LookupError("UNSPLASH_ACCESS_KEY 없음 (https://unsplash.com/developers)")
    headers = {"Authorization": f"Client-ID {key}", "Accept-Version": "v1"}
    for q in query_variants(keywords):
        for orientation in ("portrait", None):
            res = http_json(f'{EP["unsplash"]}?{qs({"query": q, "orientation": orientation, "per_page": 15, "content_filter": "high"})}',
                            headers=headers, stage=STAGE)
            for ph in res.get("results", []):
                raw = (ph.get("urls") or {}).get("raw")
                page = (ph.get("links") or {}).get("html")
                if not raw or not reserve(used, page or raw):
                    continue
                sep = "&" if "?" in raw else "?"
                data = http_get(f"{raw}{sep}w={WIDTH}&h={HEIGHT}&fit=crop&q=85", timeout=90, stage=STAGE)
                try:    # Unsplash API 가이드라인: 다운로드 이벤트 통지(실패해도 무시)
                    dl = (ph.get("links") or {}).get("download_location")
                    if dl:
                        http_get(f'{dl}{"&" if "?" in dl else "?"}client_id={key}', timeout=15, retries=1, stage=STAGE)
                except Exception:  # noqa: BLE001
                    pass
                user = ph.get("user") or {}
                return data, {"provider": "unsplash", "url": page, "query": q, "license": "Unsplash License",
                              "credit": f'Photo by {user.get("name")} on Unsplash ({page})'}
    raise LookupError("unsplash 결과 없음")


def p_pixabay(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    key = env_key("PIXABAY_API_KEY")
    if not key:
        raise LookupError("PIXABAY_API_KEY 없음 (https://pixabay.com/api/docs/)")
    for q in query_variants(keywords):
        for orientation in ("vertical", "all"):
            res = http_json(f'{EP["pixabay"]}?{qs({"key": key, "q": q, "image_type": "photo", "orientation": orientation, "per_page": 20, "safesearch": "true", "min_width": 800})}',
                            stage=STAGE)
            for hit in res.get("hits", []):
                url = hit.get("largeImageURL")
                page = hit.get("pageURL")
                if not url or not reserve(used, page or url):
                    continue
                return http_get(url, timeout=90, stage=STAGE), {
                    "provider": "pixabay", "url": page, "query": q, "license": "Pixabay Content License",
                    "credit": f'Image by {hit.get("user")} from Pixabay ({page})'}
    raise LookupError("pixabay 결과 없음")


def p_openverse(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    tried = 0
    for q in query_variants(keywords):
        for aspect in ("tall", None):
            res = http_json(f'{EP["openverse"]}?{qs({"q": q, "page_size": 20, "aspect_ratio": aspect, "license_type": "commercial,modification", "mature": "false"})}',
                            stage=STAGE)
            for r in res.get("results", []):
                url = r.get("url")
                page = r.get("foreign_landing_url") or url
                if not url or not reserve(used, page):
                    continue
                tried += 1
                if tried > 8:
                    raise LookupError("openverse 후보를 모두 시도했지만 쓸 만한 이미지가 없음")
                try:
                    data = http_get(url, timeout=60, retries=1, stage=STAGE)
                    _check_quality(_open_image(data))
                except Exception as e:  # noqa: BLE001
                    log(STAGE, f"openverse 후보 건너뜀({e})")
                    continue
                lic = f'CC {str(r.get("license", "")).upper()} {r.get("license_version", "")}'.strip()
                return data, {"provider": "openverse", "url": page, "query": q, "license": lic,
                              "credit": f'"{r.get("title")}" by {r.get("creator")} — {lic} ({page})'}
    raise LookupError("openverse 결과 없음")


def p_wikimedia(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    for q in query_variants(keywords):
        res = http_json(f'{EP["wikimedia"]}?{qs({"action": "query", "format": "json", "generator": "search", "gsrsearch": f"{q} filemime:image/jpeg", "gsrnamespace": 6, "gsrlimit": 20, "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1600})}',
                        stage=STAGE)
        pages = list(((res.get("query") or {}).get("pages") or {}).values())

        def score(p):     # 세로에 가깝고 큰 것 우선
            ii = (p.get("imageinfo") or [{}])[0]
            w, h = ii.get("width", 0), ii.get("height", 0)
            return (h / w) * min(w, 2000) if w and h else -1

        pages.sort(key=score, reverse=True)
        for p in pages[:8]:
            ii = (p.get("imageinfo") or [{}])[0]
            url = ii.get("thumburl") or ii.get("url")
            page = ii.get("descriptionurl")
            if not url or ii.get("width", 0) < 600 or not reserve(used, page or url):
                continue
            try:
                data = http_get(url, timeout=60, retries=1, stage=STAGE)
                _check_quality(_open_image(data))
            except Exception as e:  # noqa: BLE001
                log(STAGE, f"wikimedia 후보 건너뜀({e})")
                continue
            meta = ii.get("extmetadata") or {}
            artist = re.sub(r"<[^>]+>", "", (meta.get("Artist") or {}).get("value", "")).strip() or "unknown"
            lic = (meta.get("LicenseShortName") or {}).get("value", "") or "see file page"
            return data, {"provider": "wikimedia", "url": page, "query": q, "license": lic,
                          "credit": f'{p.get("title")} by {artist} — {lic} ({page})'}
    raise LookupError("wikimedia 결과 없음")


# ---------------------------------------------------------------- AI 생성 / 기타
def p_pollinations(prompt: str, keywords: str, seed: int, style: str, **_) -> tuple[bytes, dict]:
    full = (prompt or keywords).strip()
    if style:
        full = f"{full}, {style}"
    token = env_key("POLLINATIONS_TOKEN", "POLLINATIONS_API_KEY")
    url = (f'{EP["pollinations"]}{urllib.parse.quote(full)}?'
           + qs({"width": WIDTH, "height": HEIGHT, "nologo": "true", "seed": seed,
                 "model": env_key("POLLINATIONS_MODEL") or "flux", "safe": "true"}))
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    data = http_get(url, headers=headers, timeout=180, retries=2, backoff=5, stage=STAGE)
    return data, {"provider": "pollinations", "url": None, "query": full[:80],
                  "license": "generated", "credit": "AI generated (pollinations.ai)"}


def p_openimages(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    """Open Images(플리커 CC BY 2.0 사진 은행). 키 불필요. 첫 사용 때 색인을 만든다.

    AUTO_SHORTS_OPENIMAGES=0 이면 끈다(색인 다운로드를 원치 않을 때).
    """
    if os.environ.get("AUTO_SHORTS_OPENIMAGES", "1") == "0":
        raise LookupError("AUTO_SHORTS_OPENIMAGES=0 으로 꺼져 있음")
    import openimages

    if not openimages.index_path().exists():
        log(STAGE, "Open Images 색인이 없어 만듭니다 (CSV 수십 MB, 최초 1회. 끄려면 AUTO_SHORTS_OPENIMAGES=0)")
    # 후보 하나가 화질 기준에 걸려도 제공자 전체를 포기하지 않는다(다음 후보로).
    for q in query_variants(keywords):
        for _ in range(5):
            try:
                url, info = openimages.pick(q, used=used)
            except LookupError:
                break
            try:
                data = http_get(url, timeout=90, stage=STAGE)
                _check_quality(_open_image(data))
            except Unreachable:
                raise
            except Exception as e:  # noqa: BLE001
                log(STAGE, f"openimages 후보 건너뜀({e})")
                continue
            return data, info
    raise LookupError(f"open images 에 '{keywords}' 에 맞는 사진 없음")


def p_picsum(seed: int, **_) -> tuple[bytes, dict]:
    url = f'{EP["picsum"]}/{seed}/{WIDTH}/{HEIGHT}'
    return http_get(url, timeout=60, stage=STAGE), {
        "provider": "picsum", "url": url, "license": "Unsplash-sourced", "credit": "Lorem Picsum"}


PROVIDERS = {"pexels": p_pexels, "unsplash": p_unsplash, "pixabay": p_pixabay, "openverse": p_openverse,
             "wikimedia": p_wikimedia, "openimages": p_openimages, "pollinations": p_pollinations,
             "picsum": p_picsum}
PHOTO_PROVIDERS = {"pexels", "unsplash", "pixabay", "openverse", "wikimedia", "openimages", "picsum"}


# ---------------------------------------------------------------- 로컬 카드 (최후 수단)
PALETTES = [
    ((23, 32, 68), (94, 53, 177)), ((10, 61, 98), (0, 168, 150)), ((120, 20, 40), (255, 120, 60)),
    ((16, 16, 16), (70, 70, 90)), ((0, 77, 64), (139, 195, 74)), ((60, 20, 90), (233, 30, 99)),
]
EMOJI_FONTS = [
    "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
    "C:/Windows/Fonts/seguiemj.ttf",
    "/System/Library/Fonts/Apple Color Emoji.ttc",
]


def _emoji_font():
    from PIL import ImageFont  # type: ignore

    for f in EMOJI_FONTS:
        if Path(f).exists():
            try:
                return ImageFont.truetype(f, 109)   # NotoColorEmoji 는 109px 비트맵 전용
            except Exception:  # noqa: BLE001
                continue
    return None


def draw_card(text: str, out: Path, seed: int = 0, subtitle: str = "", watermark: str = "",
              emoji: str = "") -> dict:
    """그라디언트 배경 + (선택) 이모지/문구 카드. 네트워크 없이도 항상 만들어진다."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont  # type: ignore

    rnd = random.Random(seed)
    c1, c2 = PALETTES[seed % len(PALETTES)]
    img = Image.new("RGB", (WIDTH, HEIGHT), c1)
    px = img.load()
    for y in range(HEIGHT):
        t = y / HEIGHT
        row = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        for x in range(WIDTH):
            px[x, y] = row
    deco = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    for _ in range(5):
        r = rnd.randint(150, 420)
        x, y = rnd.randint(-100, WIDTH), rnd.randint(-100, HEIGHT)
        dd.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, rnd.randint(14, 34)))
    img = Image.alpha_composite(img.convert("RGBA"), deco.filter(ImageFilter.GaussianBlur(40))).convert("RGB")

    font_path = str(CAPTION_FONT_FILE) if CAPTION_FONT_FILE.exists() else None
    if watermark:
        wm = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        wd = ImageDraw.Draw(wm)
        wfont = ImageFont.truetype(font_path, 150) if font_path else ImageFont.load_default()
        y = HEIGHT // 2 - 90 * len(watermark.upper().split()[:3])
        for wtxt in watermark.upper().split()[:3]:
            wd.text((60, y), wtxt, font=wfont, fill=(255, 255, 255, 26))
            y += 180
        img = Image.alpha_composite(img.convert("RGBA"), wm).convert("RGB")
    if emoji:
        ef = _emoji_font()
        if ef is not None:
            layer = Image.new("RGBA", (128 * len(emoji[:2]), 128), (0, 0, 0, 0))
            ImageDraw.Draw(layer).text((8, 4), emoji[:2], font=ef, embedded_color=True)
            bbox = layer.getbbox()
            if bbox:
                layer = layer.crop(bbox)
                scale = min(520 / layer.width, 520 / layer.height)
                layer = layer.resize((int(layer.width * scale), int(layer.height * scale)), Image.LANCZOS)
                shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
                shadow.paste((0, 0, 0, 110), mask=layer.split()[3])
                shadow = shadow.filter(ImageFilter.GaussianBlur(18))
                x, y = (WIDTH - layer.width) // 2, int(HEIGHT * 0.42) - layer.height // 2
                base = img.convert("RGBA")
                base.alpha_composite(shadow, (x + 6, y + 14))
                base.alpha_composite(layer, (x, y))
                img = base.convert("RGB")
    draw = ImageDraw.Draw(img)
    text = (text or "").strip()
    if not text:
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=92)
        return {"provider": "card", "url": None, "license": "generated", "credit": "gradient card (local)"}
    size = 110
    while size > 48:
        font = ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        lines = _wrap(text, font, WIDTH - 200, draw)
        line_h = int(size * 1.25)
        if len(lines) <= 5 and all(draw.textlength(l, font=font) <= WIDTH - 200 for l in lines):
            break
        size -= 8
    y = (HEIGHT - line_h * len(lines)) // 2 - 60
    for line in lines:
        x = (WIDTH - draw.textlength(line, font=font)) / 2
        draw.text((x, y), line, font=font, fill=(0, 0, 0), stroke_width=8, stroke_fill=(0, 0, 0))
        draw.text((x, y), line, font=font, fill=(255, 255, 255))
        y += line_h
    if subtitle:
        sfont = ImageFont.truetype(font_path, 44) if font_path else ImageFont.load_default()
        draw.text(((WIDTH - draw.textlength(subtitle, font=sfont)) / 2, y + 30), subtitle, font=sfont,
                  fill=(255, 255, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=92)
    return {"provider": "card", "url": None, "license": "generated", "credit": "text card (local)"}


def _wrap(text: str, font, max_w: int, draw) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if draw.textlength(cand, font=font) <= max_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            while draw.textlength(w, font=font) > max_w and len(w) > 1:
                cut = len(w)
                while cut > 1 and draw.textlength(w[:cut], font=font) > max_w:
                    cut -= 1
                lines.append(w[:cut])
                w = w[cut:]
            cur = w
    if cur:
        lines.append(cur)
    return lines or [text]


# ---------------------------------------------------------------- 공개 API
def fetch_image(*, prompt: str = "", keywords: str = "", out: str | Path, providers: Optional[list[str]] = None,
                seed: Optional[int] = None, style: str = "", card_text: str = "", used: Optional[set] = None,
                local: Optional[str] = None, emoji: str = "") -> dict:
    """씬 하나의 이미지를 확보해 out(1080x1920 JPEG)에 저장하고 출처 정보를 돌려준다."""
    out = Path(out)
    used = used if used is not None else set()
    providers = providers or DEFAULT_PROVIDERS
    if seed is None:
        seed = int(hashlib.md5((prompt + keywords).encode()).hexdigest()[:6], 16) % 100000
    keywords = keywords or keywords_from_prompt(prompt)

    if local:
        lp = Path(local)
        if lp.is_file():
            normalize_to_vertical(_open_image(lp.read_bytes()), out)
            info = {"provider": "local", "url": str(lp), "license": "user-provided", "credit": f"user file {lp.name}"}
            write_json(out.with_suffix(".json"), info)
            return info
        warn(STAGE, f"지정한 로컬 이미지가 없어 제공자 순서로 진행: {local}")

    for name in providers:
        if name == "card":
            break
        if name in UNREACHABLE:
            continue
        fn = PROVIDERS.get(name)
        if not fn:
            warn(STAGE, f"알 수 없는 제공자 무시: {name}")
            continue
        try:
            data, info = fn(prompt=prompt, keywords=keywords, seed=seed, style=style, used=used)
            img = _open_image(data)
            if name in PHOTO_PROVIDERS:
                _check_quality(img)
            normalize_to_vertical(img, out)
            reserve(used, info.get("url") or info.get("credit") or "")
            info["keywords"] = keywords
            info["prompt"] = prompt
            write_json(out.with_suffix(".json"), info)
            log(STAGE, f'{name} ✓ {out.name}  ({info.get("query", keywords)[:40]})')
            return info
        except LookupError as e:
            log(STAGE, f"{name} 건너뜀: {e}")
        except Unreachable as e:
            with _UNREACHABLE_LOCK:
                first = name not in UNREACHABLE
                UNREACHABLE.add(name)
            if first:
                warn(STAGE, f"{name} 연결 불가 → 이번 실행에서 건너뜁니다: {e}")
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"{name} 실패: {e.__class__.__name__}: {str(e)[:160]}")

    info = draw_card(card_text, out, seed=seed, watermark=keywords, emoji=emoji)
    info["keywords"] = keywords
    write_json(out.with_suffix(".json"), info)
    if providers and providers[0] == "card":
        log(STAGE, f"card ✓ {out.name}")
    else:
        warn(STAGE, f"모든 제공자 실패 → 로컬 카드로 대체: {out.name} "
                    f"(무료 사진을 쓰려면 PEXELS_API_KEY 발급을 권합니다)")
    return info


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 씬 이미지 수집 (무료 스톡 사진 우선)")
    ap.add_argument("--keywords", default="", help="스톡 검색용 짧은 영문 키워드 (2~3단어 권장)")
    ap.add_argument("--prompt", default="", help="AI 생성용 영문 프롬프트 (사진이 없을 때 사용)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--providers", default=",".join(DEFAULT_PROVIDERS))
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--style", default="", help="AI 프롬프트 뒤에 붙일 스타일 문구")
    ap.add_argument("--card-text", default="", help="카드 폴백에 쓸 문구")
    ap.add_argument("--emoji", default="", help="카드 폴백에 그릴 이모지(1~2개)")
    ap.add_argument("--local", default=None, help="직접 지정한 이미지 파일")
    args = ap.parse_args()
    info = fetch_image(prompt=args.prompt, keywords=args.keywords, out=args.out,
                       providers=[p.strip() for p in args.providers.split(",") if p.strip()],
                       seed=args.seed, style=args.style, card_text=args.card_text, local=args.local,
                       emoji=args.emoji)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
