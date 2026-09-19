#!/usr/bin/env python3
"""공시·문서 캡처에 빨간 박스를 그리는 도구 (auto-shorts).

공시 기반 영상의 신뢰는 "내가 원문을 봤다"에서 나온다. 예쁜 인포그래픽보다 실제 표 캡처에
빨간 박스 하나 친 쪽이 훨씬 설득력 있다. 이 모듈은 캡처 이미지를 9:16 화면에 앉히고,
지정한 자리에 박스·형광펜·밑줄·화살표·스포트라이트를 그린다.

자리를 찍는 세 가지 방법
    at   [x0,y0,x1,y1]  원본 이미지 기준 0~1 비율      가장 정확하다
    row  3  또는 [2,4]  표의 가로 괘선을 검출해 n번째 행   표 캡처면 이게 제일 편하다
    col  2              세로 괘선 기준 n번째 열

좌표를 눈으로 고르려면:
    python annotate.py --src 캡처.png --grid  /tmp/g.jpg     격자 + 눈금
    python annotate.py --src 캡처.png --detect /tmp/d.jpg    검출된 행·열 번호
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import BODY_FONT_FILE, CAPTION_FONT_FILE, HEIGHT, WIDTH, log, warn  # noqa: E402

RED = (230, 42, 52)
YELLOW = (255, 214, 0)
BG = (16, 20, 30)

# 화면에서 캡처가 차지할 세로 구간. 위는 헤드라인, 아래는 자막 자리.
FRAME_TOP, FRAME_BOTTOM = 430, 1360


def _font(size: int, bold: bool = True):
    from PIL import ImageFont

    path = CAPTION_FONT_FILE if bold else BODY_FONT_FILE
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def _ease(p: float) -> float:
    p = max(0.0, min(1.0, p))
    return 1 - (1 - p) ** 3


def _seg(p: float, start: float, end: float) -> float:
    """전체 진행도 p 에서 [start,end] 구간만 뽑아 0~1 로."""
    if p <= start:
        return 0.0
    if p >= end:
        return 1.0
    return (p - start) / (end - start)


# ---------------------------------------------------------------- 표 구조 검출
def _gray(img):
    import numpy as np

    return np.asarray(img.convert("L"), dtype=float)


def find_document(g) -> tuple[int, int, int, int]:
    """캡처 안에서 문서(밝은 영역)의 사각형을 찾는다. 스크린샷 상하단 UI 를 잘라내기 위한 것."""
    import numpy as np

    h, w = g.shape
    bright_rows = np.where(g.mean(axis=1) > 175)[0]
    if len(bright_rows) < h * 0.05:
        return (0, 0, w - 1, h - 1)
    y0, y1 = int(bright_rows.min()), int(bright_rows.max())
    sub = g[y0:y1 + 1]
    bright_cols = np.where(sub.mean(axis=0) > 175)[0]
    if len(bright_cols) < w * 0.05:
        return (0, y0, w - 1, y1)
    return (int(bright_cols.min()), y0, int(bright_cols.max()), y1)


def _lines(g, region, axis: int, dark: int = 170, ratio: float = 0.55) -> list[int]:
    """표의 괘선 위치. axis=0 이면 가로선(행 경계), 1 이면 세로선(열 경계)."""
    import numpy as np

    x0, y0, x1, y1 = region
    sub = g[y0:y1 + 1, x0:x1 + 1] < dark
    frac = sub.mean(axis=1 if axis == 0 else 0)
    idx = np.where(frac >= ratio)[0]
    if len(idx) == 0:
        return []
    groups: list[list[int]] = []
    for i in idx:
        if groups and i - groups[-1][-1] <= 3:
            groups[-1].append(int(i))
        else:
            groups.append([int(i)])
    base = y0 if axis == 0 else x0
    return [int(sum(g_) / len(g_)) + base for g_ in groups]


def table_bands(g, region, axis: int = 0, min_size: int = 14) -> list[tuple[int, int]]:
    """괘선 사이의 띠(행 또는 열)를 돌려준다. 너무 얇은 것은 버린다."""
    ls = _lines(g, region, axis)
    bands = [(ls[i], ls[i + 1]) for i in range(len(ls) - 1)]
    return [b for b in bands if b[1] - b[0] >= min_size]


# ---------------------------------------------------------------- 배치
class Placement:
    """원본 좌표(0~1) → 캔버스 픽셀 변환."""

    def __init__(self, ox: int, oy: int, sw: int, sh: int, src_w: int, src_h: int,
                 crop: tuple[float, float, float, float]):
        self.ox, self.oy, self.sw, self.sh = ox, oy, sw, sh
        self.src_w, self.src_h, self.crop = src_w, src_h, crop

    def pt(self, nx: float, ny: float) -> tuple[float, float]:
        cx0, cy0, cx1, cy1 = self.crop
        u = (nx - cx0) / max(1e-6, cx1 - cx0)
        v = (ny - cy0) / max(1e-6, cy1 - cy0)
        return self.ox + u * self.sw, self.oy + v * self.sh

    def rect(self, r) -> tuple[float, float, float, float]:
        a = self.pt(r[0], r[1])
        b = self.pt(r[2], r[3])
        return (a[0], a[1], b[0], b[1])


def place(src, crop=None):
    """캡처를 9:16 캔버스에 앉힌다. crop 은 원본 기준 0~1 사각형(그 부분만 확대해 보여 준다)."""
    from PIL import Image

    sw0, sh0 = src.size
    crop = tuple(crop) if crop else (0.0, 0.0, 1.0, 1.0)
    box = (int(crop[0] * sw0), int(crop[1] * sh0), int(crop[2] * sw0), int(crop[3] * sh0))
    box = (max(0, box[0]), max(0, box[1]), min(sw0, max(box[0] + 8, box[2])),
           min(sh0, max(box[1] + 8, box[3])))
    piece = src.crop(box)

    avail_w, avail_h = WIDTH - 60, FRAME_BOTTOM - FRAME_TOP
    scale = min(avail_w / piece.width, avail_h / piece.height)
    sw, sh = max(1, int(piece.width * scale)), max(1, int(piece.height * scale))
    piece = piece.resize((sw, sh), Image.LANCZOS)

    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG)
    ox, oy = (WIDTH - sw) // 2, FRAME_TOP + (avail_h - sh) // 2
    canvas.paste(piece, (ox, oy))
    return canvas, Placement(ox, oy, sw, sh, sw0, sh0, crop)


# ---------------------------------------------------------------- 표시 그리기
def _rect_of(mark: dict, g, region, src_size) -> tuple[float, float, float, float] | None:
    """mark 의 at/row/col 을 원본 기준 0~1 사각형으로."""
    w, h = src_size
    if mark.get("at"):
        return tuple(float(v) for v in mark["at"])  # type: ignore[return-value]
    x0, y0, x1, y1 = region
    if mark.get("row") is not None:
        bands = table_bands(g, region, axis=0)
        if not bands:
            return None
        sel = mark["row"]
        i0, i1 = (sel, sel) if isinstance(sel, int) else (sel[0], sel[-1])
        if not (0 <= i0 < len(bands) and 0 <= i1 < len(bands)):
            return None
        top, bot = bands[i0][0], bands[i1][1]
        lx, rx = (x0, x1)
        if mark.get("col") is not None:
            cb = table_bands(g, region, axis=1, min_size=24)
            c = mark["col"]
            j0, j1 = (c, c) if isinstance(c, int) else (c[0], c[-1])
            if cb and 0 <= j0 < len(cb) and 0 <= j1 < len(cb):
                lx, rx = cb[j0][0], cb[j1][1]
        return (lx / w, top / h, rx / w, bot / h)
    if mark.get("col") is not None:
        cb = table_bands(g, region, axis=1, min_size=24)
        c = mark["col"]
        j0, j1 = (c, c) if isinstance(c, int) else (c[0], c[-1])
        if not cb or not (0 <= j0 < len(cb) and 0 <= j1 < len(cb)):
            return None
        return (cb[j0][0] / w, y0 / h, cb[j1][1] / w, y1 / h)
    return None


def _draw_progressive_box(draw, box, color, width, p):
    """박스 테두리를 좌상단에서 시계방향으로 그려 나간다."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    per = 2 * (w + h)
    want = per * _ease(p)
    edges = [((x0, y0), (x1, y0), w), ((x1, y0), (x1, y1), h),
             ((x1, y1), (x0, y1), w), ((x0, y1), (x0, y0), h)]
    for (ax, ay), (bx, by), ln in edges:
        if want <= 0:
            break
        f = min(1.0, want / max(1e-6, ln))
        draw.line((ax, ay, ax + (bx - ax) * f, ay + (by - ay) * f), fill=color, width=width)
        want -= ln


def _label(draw, box, text, p, color=RED, below=False, frame=None):
    """표시에 붙는 말풍선. 기본은 캡처 이미지 **바깥** 위쪽 — 숫자를 가리면 캡처를 쓰는 의미가 없다."""
    if not text or p <= 0.01:
        return
    f = _font(46)
    tw = int(draw.textbbox((0, 0), text, font=f)[2])
    pad = 18
    cx = (box[0] + box[2]) / 2
    if below:
        ly = (frame[3] if frame else box[3]) + 22
    else:
        ly = (frame[1] if frame else box[1]) - 82
    lx0, lx1 = cx - tw / 2 - pad, cx + tw / 2 + pad
    lx0, lx1 = max(20, lx0), min(WIDTH - 20, lx1)
    a = int(255 * _ease(p))
    draw.rounded_rectangle((lx0, ly, lx1, ly + 62), radius=14, fill=color + (a,))
    draw.text(((lx0 + lx1) / 2, ly + 8), text, font=f, fill=(255, 255, 255, a), anchor="ma")


def render(capture: dict, out: str | Path, progress: float = 1.0) -> Path:
    """캡처 + 표시를 1080x1920 한 장으로. progress<1 이면 그려지는 중간 프레임."""
    from PIL import Image, ImageDraw

    src_path = Path(capture["src"])
    if not src_path.is_file():
        raise FileNotFoundError(f"캡처 이미지를 찾을 수 없습니다: {src_path}")
    src = Image.open(src_path).convert("RGB")
    g = _gray(src)
    region = tuple(capture["region"]) if capture.get("region") else find_document(g)

    canvas, pl = place(src, capture.get("focus"))
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    marks = capture.get("marks") or []
    n = max(1, len(marks))
    for i, mark in enumerate(marks):
        kind = str(mark.get("type", "box"))
        # 표시들이 차례로 등장한다. 한꺼번에 나타나면 어디를 봐야 할지 알 수 없다.
        span = 1.0 / n
        mp = _seg(progress, i * span, min(1.0, (i + 1) * span + 0.12))
        if mp <= 0.005:
            continue
        r = _rect_of(mark, g, region, src.size)
        if r is None:
            warn("annotate", f"표시 {i + 1}({kind}): 위치를 찾지 못해 건너뜁니다 "
                             f"(at/row/col 확인 — --detect 로 행 번호를 보세요)")
            continue
        box = pl.rect(r)
        pad = float(mark.get("pad", 6))
        box = (box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad)
        color = tuple(mark.get("color") or (YELLOW if kind == "highlight" else RED))

        if kind == "spotlight":
            # 지정한 곳만 남기고 나머지를 어둡게 — 시선을 한 곳으로 몬다
            a = int(150 * _ease(mp))
            shade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, a))
            sd = ImageDraw.Draw(shade)
            sd.rounded_rectangle(box, radius=10, fill=(0, 0, 0, 0))
            layer.alpha_composite(shade)
            draw = ImageDraw.Draw(layer)
        elif kind == "highlight":
            a = int(105 * _ease(min(1.0, mp * 1.4)))
            x1 = box[0] + (box[2] - box[0]) * _ease(mp)      # 형광펜처럼 왼쪽에서 오른쪽으로
            draw.rectangle((box[0], box[1], x1, box[3]), fill=color + (a,))
        elif kind == "underline":
            x1 = box[0] + (box[2] - box[0]) * _ease(mp)
            draw.line((box[0], box[3], x1, box[3]), fill=color + (255,), width=9)
        elif kind == "strike":
            x1 = box[0] + (box[2] - box[0]) * _ease(mp)
            y = (box[1] + box[3]) / 2
            draw.line((box[0], y, x1, y), fill=color + (255,), width=9)
        elif kind == "arrow":
            tx, ty = box[0], (box[1] + box[3]) / 2
            sx = max(30, tx - 220)
            cx = sx + (tx - sx) * _ease(mp)
            draw.line((sx, ty, cx, ty), fill=color + (255,), width=10)
            if mp > 0.85:
                draw.polygon([(tx, ty), (tx - 34, ty - 20), (tx - 34, ty + 20)], fill=color + (255,))
        else:  # box
            _draw_progressive_box(draw, box, color + (255,), int(mark.get("width", 8)), mp)
        img_frame = (pl.ox, pl.oy, pl.ox + pl.sw, pl.oy + pl.sh)
        _label(draw, box, mark.get("label", ""), _seg(mp, 0.75, 1.0), color,
               below=bool(mark.get("label_below")), frame=img_frame)

    canvas = Image.alpha_composite(canvas.convert("RGBA"), layer).convert("RGB")
    cap = str(capture.get("caption", "")).strip()
    if cap:
        d2 = ImageDraw.Draw(canvas)
        d2.text((WIDTH // 2, FRAME_BOTTOM + 26), cap, font=_font(34, False),
                fill=(180, 190, 205), anchor="ma")
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, quality=94)
    return out


def render_animation(capture: dict, outdir: str | Path, fps: int = 30, seconds: float = 1.6) -> int:
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    for f in outdir.glob("f_*.jpg"):
        f.unlink()
    n = max(2, int(round(fps * seconds)))
    for i in range(n):
        render(capture, outdir / f"f_{i + 1:03d}.jpg", progress=(i + 1) / n)
    return n


# ---------------------------------------------------------------- 문서 표 만들기
def make_table_image(spec: dict, out: str | Path) -> Path:
    """공시 문서 스타일의 표 이미지를 만든다(흰 바탕, 검은 괘선).

    원문 캡처를 쓸 수 없을 때 **공시 수치를 표 형태로 다시 조판**하는 용도다.
    캡처인 척하면 안 되므로 `note` 에 재구성이라는 사실과 출처를 적어 함께 박는다.
    괘선이 또렷해서 row/col 검출이 그대로 동작한다.
    """
    from PIL import Image, ImageDraw

    title = str(spec.get("title", ""))
    unit = str(spec.get("unit", ""))
    head = [str(h) for h in (spec.get("head") or [])]
    rows = [[str(c) for c in r] for r in (spec.get("rows") or [])]
    note = str(spec.get("note", ""))
    ncol = max(len(head), max((len(r) for r in rows), default=1))

    fs = float(spec.get("font_scale", 1.0))     # 9:16 화면에서는 표를 세로로 길게 뽑아야 글씨가 커진다
    pad = 46
    row_h = int(spec.get("row_h", 76) * fs)
    head_h = int(84 * fs)
    title_h = int(96 * fs) if title else 0
    unit_h = int(44 * fs) if unit else 0
    note_h = int(58 * fs) if note else 0
    widths = spec.get("widths") or [1.6] + [1.0] * (ncol - 1)
    total_w = int(spec.get("width", 1480))
    inner = total_w - pad * 2
    cw = [int(inner * w / sum(widths)) for w in widths]
    cw[-1] += inner - sum(cw)
    total_h = pad * 2 + title_h + unit_h + head_h + row_h * len(rows) + note_h

    img = Image.new("RGB", (total_w, total_h), (255, 255, 255))
    d = ImageDraw.Draw(img)
    ink, line, shade = (24, 24, 28), (60, 60, 66), (238, 240, 244)

    y = pad
    if title:
        d.text((total_w // 2, y + 8), title, font=_font(int(52 * fs)), fill=ink, anchor="ma")
        y += title_h
    if unit:
        d.text((total_w - pad, y), unit, font=_font(int(30 * fs), False), fill=(90, 90, 98), anchor="ra")
        y += unit_h

    top = y
    xs = [pad]
    for w in cw:
        xs.append(xs[-1] + w)
    if head:
        d.rectangle((pad, y, pad + inner, y + head_h), fill=shade)
        for i, h in enumerate(head):
            hf = _font(int(36 * fs))
            while d.textbbox((0, 0), h, font=hf)[2] > cw[i] - 24 and hf.size > 16:
                hf = _font(hf.size - 2)
            d.text(((xs[i] + xs[i + 1]) // 2, y + 20), h, font=hf, fill=ink, anchor="ma")
        y += head_h
    cell_pad = 22

    def _shrink(txt: str, size: int, avail: int, bold: bool):
        """칸을 넘치면 글자를 줄인다. 숫자가 옆 칸을 침범하면 표를 보여 주는 의미가 없다."""
        while size > 16:
            f = _font(size, bold)
            if d.textbbox((0, 0), txt, font=f)[2] <= avail:
                return f
            size -= 2
        return _font(size, bold)

    for r in rows:
        for i in range(ncol):
            txt = r[i] if i < len(r) else ""
            avail = cw[i] - cell_pad * 2
            f = _shrink(txt, int(38 * fs), avail, bold=(i == 0))
            if i == 0:
                d.text((xs[i] + cell_pad, y + 18), txt, font=f, fill=ink)
            else:
                d.text((xs[i + 1] - cell_pad, y + 18), txt, font=f, fill=ink, anchor="ra")
        y += row_h
    bottom = y

    for i in range(len(xs)):                      # 세로 괘선
        d.line((xs[i], top, xs[i], bottom), fill=line, width=3)
    yy = top
    d.line((pad, yy, pad + inner, yy), fill=line, width=4)
    if head:
        yy += head_h
        d.line((pad, yy, pad + inner, yy), fill=line, width=4)
    for _ in rows:                                 # 가로 괘선
        yy += row_h
        d.line((pad, yy, pad + inner, yy), fill=line, width=3)

    if note:
        d.text((pad, bottom + 14), note, font=_font(int(26 * fs), False), fill=(120, 120, 130))

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=95)
    return out


# ---------------------------------------------------------------- 좌표 고르기 보조
def preview_grid(src_path: str | Path, out: str | Path) -> Path:
    from PIL import Image, ImageDraw

    src = Image.open(src_path).convert("RGB")
    d = ImageDraw.Draw(src)
    w, h = src.size
    f = _font(max(16, w // 45))
    for i in range(1, 10):
        x, y = w * i / 10, h * i / 10
        d.line((x, 0, x, h), fill=(0, 200, 255), width=2)
        d.line((0, y, w, y), fill=(0, 200, 255), width=2)
        d.text((x + 6, 6), f"{i / 10:.1f}", font=f, fill=(0, 200, 255))
        d.text((6, y + 4), f"{i / 10:.1f}", font=f, fill=(0, 200, 255))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    src.save(out, quality=92)
    return Path(out)


def preview_detect(src_path: str | Path, out: str | Path) -> Path:
    from PIL import Image, ImageDraw

    src = Image.open(src_path).convert("RGB")
    g = _gray(src)
    region = find_document(g)
    d = ImageDraw.Draw(src)
    d.rectangle(region, outline=(0, 160, 255), width=4)
    f = _font(max(18, src.width // 38))
    rows = table_bands(g, region, axis=0)
    cols = table_bands(g, region, axis=1, min_size=24)
    for i, (a, b) in enumerate(rows):
        d.rectangle((region[0], a, region[2], b), outline=(230, 42, 52), width=3)
        d.text((region[0] + 8, a + 4), f"row {i}", font=f, fill=(230, 42, 52))
    for j, (a, b) in enumerate(cols):
        d.line((a, region[1], a, region[3]), fill=(0, 190, 90), width=3)
        d.text((a + 6, region[1] + 6), f"c{j}", font=f, fill=(0, 190, 90))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    src.save(out, quality=92)
    log("annotate", f"문서 영역 {region} · 행 {len(rows)}개 · 열 {len(cols)}개 → {out}")
    return Path(out)


def main() -> None:
    ap = argparse.ArgumentParser(description="공시 캡처에 빨간 박스 그리기")
    ap.add_argument("--src", required=True, help="캡처 이미지")
    ap.add_argument("--json", help="capture 정의 JSON 문자열(marks 등)")
    ap.add_argument("--out", help="출력 이미지")
    ap.add_argument("--grid", help="격자 눈금 미리보기 저장 경로")
    ap.add_argument("--detect", help="검출된 행·열 번호 미리보기 저장 경로")
    ap.add_argument("--progress", type=float, default=1.0)
    a = ap.parse_args()

    if a.grid:
        preview_grid(a.src, a.grid)
        print(f"[annotate] 격자 {a.grid}")
    if a.detect:
        preview_detect(a.src, a.detect)
    if a.out:
        cap = json.loads(a.json) if a.json else {}
        cap["src"] = a.src
        render(cap, a.out, a.progress)
        print(f"[annotate] {a.out}")


if __name__ == "__main__":
    main()
