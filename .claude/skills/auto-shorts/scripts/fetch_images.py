#!/usr/bin/env python3
"""씬 이미지 수집 (auto-shorts).

여러 무료 웹 API 를 순서대로 시도하고, 전부 실패하면 로컬에서 텍스트 카드를
그려서 절대 빈 씬이 생기지 않게 한다. 결과는 항상 1080x1920 JPEG 로 정규화한다.

제공자(기본 순서):
    pollinations  AI 이미지 생성. 키 없이 사용 가능(선택: POLLINATIONS_TOKEN). 프롬프트와
                  정확히 맞는 세로 이미지를 만들어 주므로 품질 면에서 1순위.
    pexels        무료 스톡 사진. PEXELS_API_KEY 필요(무료 가입).
    unsplash      무료 스톡 사진. UNSPLASH_ACCESS_KEY 필요(무료 가입).
    pixabay       무료 스톡 사진. PIXABAY_API_KEY 필요(무료 가입).
    openverse     CC 라이선스 이미지 검색. 키 불필요(익명 한도 있음). 출처 표기 필요.
    wikimedia     위키미디어 공용 검색. 키 불필요. 실존 동물/역사/장소에 강함. 출처 표기 필요.
    picsum        무작위 사진(주제 무관). 기본 순서에는 없음.
    card          로컬 텍스트 카드(항상 성공).

CLI:
    python fetch_images.py --prompt "octopus underwater, cinematic" --keywords "octopus" \
        --out img_01.jpg --card-text "심장이 3개?!" [--providers pollinations,pexels,card] [--seed 7]
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import random
import re
import sys
import urllib.parse
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (CAPTION_FONT_FILE, HEIGHT, WIDTH, env_key, http_get,  # noqa: E402
                    http_json, log, qs, warn, write_json)

DEFAULT_PROVIDERS = ["pollinations", "pexels", "unsplash", "pixabay", "openverse", "wikimedia", "card"]
STAGE = "image"


# ---------------------------------------------------------------- 정규화
def _open_image(data: bytes):
    from PIL import Image  # type: ignore

    img = Image.open(io.BytesIO(data))
    img.load()
    return img


def normalize_to_vertical(img, out: Path, quality: int = 92) -> None:
    """가운데 기준 커버 크롭 → 1080x1920 JPEG."""
    from PIL import Image, ImageOps  # type: ignore

    img = ImageOps.exif_transpose(img).convert("RGB")
    w, h = img.size
    target = WIDTH / HEIGHT
    if w / h > target:
        nw = int(h * target)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / target)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    if img.size != (WIDTH, HEIGHT):
        img = img.resize((WIDTH, HEIGHT), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=quality, optimize=True)


def _is_usable(img, min_side: int = 480) -> bool:
    w, h = img.size
    return min(w, h) >= min_side


# ---------------------------------------------------------------- 제공자들
def p_pollinations(prompt: str, seed: int, style: str, **_) -> tuple[bytes, dict]:
    full = prompt if not style else f"{prompt}, {style}"
    token = env_key("POLLINATIONS_TOKEN", "POLLINATIONS_API_KEY")
    params = {"width": WIDTH, "height": HEIGHT, "nologo": "true", "seed": seed,
              "model": env_key("POLLINATIONS_MODEL") or "flux", "safe": "true"}
    url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(full)}?{qs(params)}"
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    data = http_get(url, headers=headers, timeout=180, retries=2, backoff=5, stage=STAGE)
    return data, {"provider": "pollinations", "url": url, "credit": "AI generated (pollinations.ai)",
                  "license": "generated"}


def p_pexels(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    key = env_key("PEXELS_API_KEY")
    if not key:
        raise LookupError("PEXELS_API_KEY 없음")
    q = qs({"query": keywords, "orientation": "portrait", "per_page": 10, "size": "large"})
    res = http_json(f"https://api.pexels.com/v1/search?{q}", headers={"Authorization": key}, stage=STAGE)
    for ph in res.get("photos", []):
        src = ph.get("src", {})
        url = src.get("large2x") or src.get("original")
        if not url or url in used:
            continue
        return http_get(url, timeout=90, stage=STAGE), {
            "provider": "pexels", "url": ph.get("url"), "license": "Pexels License",
            "credit": f'Photo by {ph.get("photographer")} on Pexels ({ph.get("url")})'}
    raise LookupError("pexels 결과 없음")


def p_unsplash(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    key = env_key("UNSPLASH_ACCESS_KEY")
    if not key:
        raise LookupError("UNSPLASH_ACCESS_KEY 없음")
    q = qs({"query": keywords, "orientation": "portrait", "per_page": 10, "content_filter": "high"})
    res = http_json(f"https://api.unsplash.com/search/photos?{q}",
                    headers={"Authorization": f"Client-ID {key}", "Accept-Version": "v1"}, stage=STAGE)
    for ph in res.get("results", []):
        raw = ph.get("urls", {}).get("raw")
        if not raw or raw in used:
            continue
        url = f"{raw}&w={WIDTH}&h={HEIGHT}&fit=crop&q=85"
        data = http_get(url, timeout=90, stage=STAGE)
        # Unsplash API 가이드라인: 다운로드 이벤트 통지(실패해도 무시)
        try:
            dl = ph.get("links", {}).get("download_location")
            if dl:
                http_get(f"{dl}&client_id={key}" if "?" in dl else f"{dl}?client_id={key}",
                         timeout=15, retries=1, stage=STAGE)
        except Exception:  # noqa: BLE001
            pass
        user = ph.get("user", {})
        return data, {"provider": "unsplash", "url": ph.get("links", {}).get("html"),
                      "license": "Unsplash License",
                      "credit": f'Photo by {user.get("name")} on Unsplash ({ph.get("links", {}).get("html")})'}
    raise LookupError("unsplash 결과 없음")


def p_pixabay(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    key = env_key("PIXABAY_API_KEY")
    if not key:
        raise LookupError("PIXABAY_API_KEY 없음")
    q = qs({"key": key, "q": keywords, "image_type": "photo", "orientation": "vertical",
            "per_page": 10, "safesearch": "true", "min_width": 800})
    res = http_json(f"https://pixabay.com/api/?{q}", stage=STAGE)
    for hit in res.get("hits", []):
        url = hit.get("largeImageURL")
        if not url or url in used:
            continue
        return http_get(url, timeout=90, stage=STAGE), {
            "provider": "pixabay", "url": hit.get("pageURL"), "license": "Pixabay Content License",
            "credit": f'Image by {hit.get("user")} from Pixabay ({hit.get("pageURL")})'}
    raise LookupError("pixabay 결과 없음")


def p_openverse(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    q = qs({"q": keywords, "page_size": 20, "aspect_ratio": "tall", "license_type": "commercial,modification",
            "mature": "false"})
    res = http_json(f"https://api.openverse.org/v1/images/?{q}", stage=STAGE)
    tried = 0
    for r in res.get("results", []):
        url = r.get("url")
        if not url or url in used:
            continue
        tried += 1
        if tried > 6:
            break
        try:
            data = http_get(url, timeout=60, retries=1, stage=STAGE)
            img = _open_image(data)
            if not _is_usable(img):
                continue
            return data, {"provider": "openverse", "url": r.get("foreign_landing_url") or url,
                          "license": f'CC {r.get("license", "").upper()} {r.get("license_version", "")}'.strip(),
                          "credit": f'"{r.get("title")}" by {r.get("creator")} — CC {r.get("license", "").upper()} '
                                    f'({r.get("foreign_landing_url") or url})'}
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"openverse 항목 건너뜀: {e}")
    raise LookupError("openverse 결과 없음")


def p_wikimedia(keywords: str, used: set, **_) -> tuple[bytes, dict]:
    q = qs({"action": "query", "format": "json", "generator": "search",
            "gsrsearch": f"{keywords} filemime:image/jpeg", "gsrnamespace": 6, "gsrlimit": 15,
            "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1600})
    res = http_json(f"https://commons.wikimedia.org/w/api.php?{q}", stage=STAGE)
    pages = list((res.get("query") or {}).get("pages", {}).values())
    # 세로/정사각에 가깝고 충분히 큰 것 우선
    def score(p):
        ii = (p.get("imageinfo") or [{}])[0]
        w, h = ii.get("width", 0), ii.get("height", 0)
        if not w or not h:
            return -1
        return (h / w) * min(w, 2000)
    pages.sort(key=score, reverse=True)
    for p in pages[:6]:
        ii = (p.get("imageinfo") or [{}])[0]
        url = ii.get("thumburl") or ii.get("url")
        if not url or url in used or ii.get("width", 0) < 600:
            continue
        try:
            data = http_get(url, timeout=60, retries=1, stage=STAGE)
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"wikimedia 항목 건너뜀: {e}")
            continue
        meta = ii.get("extmetadata", {})
        artist = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip() or "unknown"
        lic = meta.get("LicenseShortName", {}).get("value", "")
        return data, {"provider": "wikimedia", "url": ii.get("descriptionurl"), "license": lic,
                      "credit": f'{p.get("title")} by {artist} — {lic} ({ii.get("descriptionurl")})'}
    raise LookupError("wikimedia 결과 없음")


def p_picsum(seed: int, **_) -> tuple[bytes, dict]:
    url = f"https://picsum.photos/seed/{seed}/{WIDTH}/{HEIGHT}"
    return http_get(url, timeout=60, stage=STAGE), {"provider": "picsum", "url": url,
                                                    "license": "Unsplash-sourced", "credit": "Lorem Picsum"}


# ---------------------------------------------------------------- 로컬 카드
PALETTES = [
    ((23, 32, 68), (94, 53, 177)),     # 남색→보라
    ((10, 61, 98), (0, 168, 150)),     # 딥블루→틸
    ((120, 20, 40), (255, 120, 60)),   # 와인→오렌지
    ((16, 16, 16), (70, 70, 90)),      # 차콜
    ((0, 77, 64), (139, 195, 74)),     # 딥그린→라임
    ((60, 20, 90), (233, 30, 99)),     # 퍼플→핑크
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
                return ImageFont.truetype(f, 109)   # NotoColorEmoji 는 109px 비트맵만 지원
            except Exception:  # noqa: BLE001
                continue
    return None


def draw_card(text: str, out: Path, seed: int = 0, subtitle: str = "", watermark: str = "", emoji: str = "") -> dict:
    """그라디언트 배경 (+ 큰 텍스트 / 은은한 워터마크) 카드. 네트워크 없이도 항상 만들어진다.

    파이프라인에서는 text 를 비우고 watermark(영문 키워드)만 넣는다 — 헤드라인/자막이
    이미 글자를 보여주므로 카드에 또 문구를 넣으면 화면이 중복된다.
    """
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
    # 은은한 원형 장식
    deco = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    for _ in range(5):
        r = rnd.randint(150, 420)
        x, y = rnd.randint(-100, WIDTH), rnd.randint(-100, HEIGHT)
        dd.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, rnd.randint(14, 34)))
    deco = deco.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img.convert("RGBA"), deco).convert("RGB")

    font_path = str(CAPTION_FONT_FILE) if CAPTION_FONT_FILE.exists() else None
    if watermark:
        wm = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        wd = ImageDraw.Draw(wm)
        wfont = ImageFont.truetype(font_path, 150) if font_path else ImageFont.load_default()
        words = watermark.upper().split()[:3]
        y = HEIGHT // 2 - 90 * len(words)
        for wtxt in words:
            wd.text((60, y), wtxt, font=wfont, fill=(255, 255, 255, 26))
            y += 180
        img = Image.alpha_composite(img.convert("RGBA"), wm).convert("RGB")
    if emoji:
        ef = _emoji_font()
        if ef is not None:
            # 109px 로 그린 뒤 크게 확대(비트맵 이모지) → 은은한 그림자와 함께 중앙 위쪽에 배치
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
    total_h = line_h * len(lines)
    y = (HEIGHT - total_h) // 2 - 60
    for line in lines:
        w = draw.textlength(line, font=font)
        x = (WIDTH - w) / 2
        draw.text((x, y), line, font=font, fill=(0, 0, 0), stroke_width=8, stroke_fill=(0, 0, 0))
        draw.text((x, y), line, font=font, fill=(255, 255, 255))
        y += line_h
    if subtitle:
        sfont = ImageFont.truetype(font_path, 44) if font_path else ImageFont.load_default()
        w = draw.textlength(subtitle, font=sfont)
        draw.text(((WIDTH - w) / 2, y + 30), subtitle, font=sfont, fill=(255, 255, 255, 200))
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
            # 한 단어가 너무 길면 글자 단위로 자른다
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


PROVIDERS = {
    "pollinations": p_pollinations, "pexels": p_pexels, "unsplash": p_unsplash, "pixabay": p_pixabay,
    "openverse": p_openverse, "wikimedia": p_wikimedia, "picsum": p_picsum,
}


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
    keywords = keywords or _keywords_from_prompt(prompt)

    if local:
        lp = Path(local)
        if not lp.is_file():
            warn(STAGE, f"지정한 로컬 이미지가 없어 제공자 순서로 진행: {local}")
        else:
            normalize_to_vertical(_open_image(lp.read_bytes()), out)
            info = {"provider": "local", "url": str(lp), "license": "user-provided", "credit": f"user file {lp.name}"}
            write_json(out.with_suffix(".json"), info)
            return info

    for name in providers:
        if name == "card":
            break
        fn = PROVIDERS.get(name)
        if not fn:
            warn(STAGE, f"알 수 없는 제공자 무시: {name}")
            continue
        try:
            data, info = fn(prompt=prompt, keywords=keywords, seed=seed, style=style, used=used)
            img = _open_image(data)
            if not _is_usable(img):
                raise ValueError(f"이미지가 너무 작음 {img.size}")
            normalize_to_vertical(img, out)
            used.add(info.get("url") or "")
            info["keywords"] = keywords
            info["prompt"] = prompt
            write_json(out.with_suffix(".json"), info)
            log(STAGE, f"{name} ✓ {out.name}  ({keywords[:40]})")
            return info
        except LookupError as e:
            log(STAGE, f"{name} 건너뜀: {e}")
        except Exception as e:  # noqa: BLE001
            warn(STAGE, f"{name} 실패: {e.__class__.__name__}: {str(e)[:160]}")

    info = draw_card(card_text, out, seed=seed, watermark=keywords, emoji=emoji)
    info["keywords"] = keywords
    write_json(out.with_suffix(".json"), info)
    if providers and providers[0] == "card":
        log(STAGE, f"card ✓ {out.name} (그라디언트 카드)")
    else:
        warn(STAGE, f"모든 제공자 실패 → 그라디언트 카드로 대체: {out.name}")
    return info


_STOP = {"a", "an", "the", "of", "in", "on", "with", "and", "photo", "cinematic", "vertical", "shot",
         "closeup", "close-up", "style", "lighting", "dramatic", "realistic", "4k", "8k", "highly", "detailed"}


def _keywords_from_prompt(prompt: str) -> str:
    words = [w for w in re.findall(r"[A-Za-z가-힣]+", prompt) if w.lower() not in _STOP]
    return " ".join(words[:4]) or "abstract background"


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 씬 이미지 수집")
    ap.add_argument("--prompt", default="", help="AI 생성용 영문 프롬프트")
    ap.add_argument("--keywords", default="", help="스톡 검색용 짧은 영문 키워드")
    ap.add_argument("--out", required=True)
    ap.add_argument("--providers", default=",".join(DEFAULT_PROVIDERS))
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--style", default="", help="모든 프롬프트 뒤에 붙일 스타일 문구")
    ap.add_argument("--card-text", default="", help="텍스트 카드 폴백에 쓸 문구")
    ap.add_argument("--local", default=None, help="직접 지정한 이미지 파일")
    ap.add_argument("--emoji", default="", help="카드 폴백에 그릴 이모지(1~2개)")
    args = ap.parse_args()
    info = fetch_image(prompt=args.prompt, keywords=args.keywords, out=args.out,
                       providers=[p.strip() for p in args.providers.split(",") if p.strip()],
                       seed=args.seed, style=args.style, card_text=args.card_text, local=args.local,
                       emoji=args.emoji)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
