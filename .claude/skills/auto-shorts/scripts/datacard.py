#!/usr/bin/env python3
"""숫자·표 카드 생성기 (auto-shorts).

공모주·실적·순위처럼 **숫자가 주인공인 영상**을 위한 배경 이미지를 그린다. 스톡 사진은
이런 주제에 아무 의미가 없고(넥타이 맨 남자가 차트를 가리키는 사진), 정작 시청자가 보고 싶은 건
표와 숫자 그 자체다.

카드 종류
    stat      큰 숫자 하나 + 라벨 + 보조 문구
    compare   두 값을 나란히 (전 → 후). 변화율은 자동 계산
    table     라벨·값 행 목록. 특정 행 강조 가능
    bars      가로 막대 비교 (라벨 + 값 + 막대)
    steps     타임라인/단계 (완료 표시 가능)

화면 배치는 자막 레이아웃과 맞춰 둔다: 위쪽 520px 은 헤드라인, 아래쪽 480px 은 자막 자리라
카드 본문은 y 560~1440 안에서만 그린다.

CLI:
    python datacard.py --json '{"type":"stat","label":"확정 공모가","value":"18,000원"}' --out a.jpg
    python datacard.py --sheet /tmp/sheet.jpg      # 카드 종류 미리보기
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import BODY_FONT_FILE, CAPTION_FONT_FILE, HEIGHT, WIDTH  # noqa: E402

# 화면에서 카드가 쓸 수 있는 세로 구간.
# 위 480px 은 헤드라인/비트 카드, 아래 620px 은 자막과 면책 문구 자리라 여기를 침범하면 안 된다.
BODY_TOP, BODY_BOTTOM = 470, 1300

THEMES = {
    "navy":  dict(bg=(14, 27, 51), bg2=(9, 18, 36), panel=(247, 249, 252), ink=(17, 24, 39),
                  sub=(90, 102, 122), accent=(255, 210, 74), good=(233, 69, 96), line=(214, 221, 232)),
    "ink":   dict(bg=(18, 18, 22), bg2=(10, 10, 13), panel=(250, 250, 250), ink=(20, 20, 24),
                  sub=(110, 110, 118), accent=(255, 196, 0), good=(0, 168, 107), line=(224, 224, 228)),
    "teal":  dict(bg=(9, 38, 44), bg2=(5, 24, 29), panel=(245, 251, 250), ink=(15, 32, 36),
                  sub=(88, 112, 116), accent=(90, 230, 200), good=(233, 69, 96), line=(210, 226, 224)),
}


def _font(size: int, bold: bool = True):
    from PIL import ImageFont

    path = CAPTION_FONT_FILE if bold else BODY_FONT_FILE
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def _w(draw, text, font) -> int:
    return int(draw.textbbox((0, 0), text, font=font)[2])


def _fit(draw, text: str, font_size: int, max_w: int, bold: bool = True):
    """max_w 안에 들어갈 때까지 글자 크기를 줄인다."""
    size = font_size
    while size > 22:
        f = _font(size, bold)
        if _w(draw, text, f) <= max_w:
            return f
        size -= 4
    return _font(size, bold)


def _background(theme: dict):
    from PIL import Image

    img = Image.new("RGB", (WIDTH, HEIGHT), theme["bg"])
    px = img.load()
    for y in range(HEIGHT):
        t = y / HEIGHT
        row = tuple(int(theme["bg"][i] * (1 - t) + theme["bg2"][i] * t) for i in range(3))
        for x in range(WIDTH):
            px[x, y] = row
    return img


def _panel(draw, theme: dict, top: int, height: int, margin: int = 70, radius: int = 34):
    box = (margin, top, WIDTH - margin, top + height)
    draw.rounded_rectangle((box[0] + 6, box[1] + 10, box[2] + 6, box[3] + 10),
                           radius=radius, fill=(0, 0, 0))
    draw.rounded_rectangle(box, radius=radius, fill=theme["panel"])
    return box


def c_stat(draw, theme, card):
    """큰 숫자 하나. 라벨(위) / 값(가운데) / 보조 문구(아래)."""
    h = 560
    top = BODY_TOP + (BODY_BOTTOM - BODY_TOP - h) // 2
    box = _panel(draw, theme, top, h)
    cx = WIDTH // 2
    label = str(card.get("label", ""))
    value = str(card.get("value", ""))
    note = str(card.get("note", ""))

    y = top + 70
    if label:
        f = _fit(draw, label, 54, WIDTH - 260, bold=False)
        draw.text((cx, y), label, font=f, fill=theme["sub"], anchor="ma")
        y += 86
    f = _fit(draw, value, 180, WIDTH - 220)
    draw.text((cx, y + 10), value, font=f, fill=theme["ink"], anchor="ma")
    if note:
        f = _fit(draw, note, 46, WIDTH - 240, bold=False)
        draw.text((cx, box[3] - 96), note, font=f, fill=theme["good"], anchor="ma")


def c_compare(draw, theme, card):
    """전 → 후 두 값. delta 를 주면 아래에 크게 표시한다."""
    h = 620
    top = BODY_TOP + (BODY_BOTTOM - BODY_TOP - h) // 2
    box = _panel(draw, theme, top, h)
    left = card.get("left") or {}
    right = card.get("right") or {}
    colw = (box[2] - box[0]) // 2
    gutter = 130          # 가운데 화살표가 들어갈 빈 칸 — 양쪽 숫자가 여기를 침범하면 안 된다
    y = top + 80
    for i, side in enumerate((left, right)):
        cx = box[0] + colw // 2 + i * colw
        f = _fit(draw, str(side.get("label", "")), 46, colw - gutter, bold=False)
        draw.text((cx, y), str(side.get("label", "")), font=f, fill=theme["sub"], anchor="ma")
        val = str(side.get("value", ""))
        f = _fit(draw, val, 104, colw - gutter)
        color = theme["good"] if i == 1 and card.get("highlight_right", True) else theme["ink"]
        draw.text((cx, y + 76), val, font=f, fill=color, anchor="ma")
    # 가운데 화살표 (두 값 사이 빈 칸에)
    ax, ay = box[0] + colw, y + 132
    draw.line((ax - 30, ay, ax + 18, ay), fill=theme["line"], width=9)
    draw.polygon([(ax + 14, ay - 20), (ax + 14, ay + 20), (ax + 48, ay)], fill=theme["line"])
    delta = str(card.get("delta", ""))
    if delta:
        f = _fit(draw, delta, 92, WIDTH - 220)
        draw.text((WIDTH // 2, box[3] - 176), delta, font=f, fill=theme["good"], anchor="ma")


def c_table(draw, theme, card):
    """라벨-값 행. rows: [[라벨, 값], ...], highlight: 강조할 행 번호(0부터)."""
    rows = [r for r in (card.get("rows") or []) if r][:7]
    if not rows:
        return
    head_h = 92 if card.get("head") else 0
    row_h = 96
    h = head_h + row_h * len(rows) + 56
    h = min(h, BODY_BOTTOM - BODY_TOP)
    top = BODY_TOP + (BODY_BOTTOM - BODY_TOP - h) // 2
    box = _panel(draw, theme, top, h)
    pad = 56
    y = top + 28
    if head_h:
        f = _fit(draw, str(card["head"]), 48, box[2] - box[0] - pad * 2)
        draw.text((box[0] + pad, y + 12), str(card["head"]), font=f, fill=theme["sub"])
        y += head_h
        draw.line((box[0] + pad, y - 14, box[2] - pad, y - 14), fill=theme["line"], width=3)
    hi = card.get("highlight")
    for i, row in enumerate(rows):
        label, value = (list(row) + ["", ""])[:2]
        strong = (hi is not None and i == int(hi))
        if strong:
            draw.rounded_rectangle((box[0] + 26, y - 6, box[2] - 26, y + row_h - 18),
                                   radius=16, fill=(255, 244, 205))
        fl = _fit(draw, str(label), 52, (box[2] - box[0]) // 2 - pad, bold=False)
        draw.text((box[0] + pad, y + 8), str(label), font=fl, fill=theme["sub"])
        fv = _fit(draw, str(value), 58, (box[2] - box[0]) // 2 - pad)
        draw.text((box[2] - pad, y + 4), str(value), font=fv,
                  fill=theme["good"] if strong else theme["ink"], anchor="ra")
        if i + 1 < len(rows):
            draw.line((box[0] + pad, y + row_h - 16, box[2] - pad, y + row_h - 16),
                      fill=theme["line"], width=2)
        y += row_h


def c_bars(draw, theme, card):
    """가로 막대. rows: [[라벨, 값(숫자), 표시문구(선택)], ...]"""
    rows = [r for r in (card.get("rows") or []) if r][:5]
    if not rows:
        return
    row_h = 132
    h = row_h * len(rows) + 70
    top = BODY_TOP + (BODY_BOTTOM - BODY_TOP - h) // 2
    box = _panel(draw, theme, top, h)
    pad = 60
    peak = max(float(r[1]) for r in rows) or 1.0
    y = top + 44
    hi = card.get("highlight")
    for i, row in enumerate(rows):
        label = str(row[0])
        num = float(row[1])
        text = str(row[2]) if len(row) > 2 else f"{num:,.0f}"
        strong = (hi is not None and i == int(hi))
        f = _fit(draw, label, 44, box[2] - box[0] - pad * 2, bold=False)
        draw.text((box[0] + pad, y), label, font=f, fill=theme["sub"])
        fv = _font(46)
        draw.text((box[2] - pad, y - 2), text, font=fv,
                  fill=theme["good"] if strong else theme["ink"], anchor="ra")
        bar_y = y + 62
        full = box[2] - box[0] - pad * 2
        draw.rounded_rectangle((box[0] + pad, bar_y, box[0] + pad + full, bar_y + 34),
                               radius=17, fill=theme["line"])
        w = max(34, int(full * (num / peak)))
        draw.rounded_rectangle((box[0] + pad, bar_y, box[0] + pad + w, bar_y + 34),
                               radius=17, fill=theme["good"] if strong else theme["ink"])
        y += row_h


def c_steps(draw, theme, card):
    """단계/타임라인. rows: [[라벨, 값], ...], done: 완료로 표시할 개수."""
    rows = [r for r in (card.get("rows") or []) if r][:5]
    if not rows:
        return
    row_h = 128
    h = row_h * len(rows) + 60
    top = BODY_TOP + (BODY_BOTTOM - BODY_TOP - h) // 2
    box = _panel(draw, theme, top, h)
    pad, dot_x = 64, 0
    done = int(card.get("done", len(rows)))
    y = top + 42
    dot_x = box[0] + pad + 22
    for i, row in enumerate(rows):
        label, value = (list(row) + ["", ""])[:2]
        on = i < done
        color = theme["good"] if on else theme["line"]
        if i + 1 < len(rows):
            draw.line((dot_x, y + 30, dot_x, y + row_h + 10), fill=theme["line"], width=6)
        draw.ellipse((dot_x - 22, y + 8, dot_x + 22, y + 52), fill=color)
        if on:
            draw.line((dot_x - 10, y + 30, dot_x - 2, y + 40), fill=theme["panel"], width=6)
            draw.line((dot_x - 2, y + 40, dot_x + 11, y + 20), fill=theme["panel"], width=6)
        fl = _fit(draw, str(label), 48, box[2] - box[0] - pad * 3, bold=False)
        draw.text((dot_x + 52, y + 4), str(label), font=fl, fill=theme["sub"])
        if value:
            fv = _fit(draw, str(value), 56, box[2] - box[0] - pad * 3)
            draw.text((dot_x + 52, y + 54), str(value), font=fv, fill=theme["ink"])
        y += row_h


CARDS = {"stat": c_stat, "compare": c_compare, "table": c_table, "bars": c_bars, "steps": c_steps}


def draw_card(card: dict, out: str | Path, theme: str = "navy") -> Path:
    """카드 하나를 1080x1920 JPEG 로 그린다."""
    from PIL import ImageDraw

    th = THEMES.get(theme or "navy", THEMES["navy"])
    img = _background(th)
    draw = ImageDraw.Draw(img)
    fn = CARDS.get(str(card.get("type", "stat")))
    if not fn:
        raise ValueError(f"알 수 없는 카드 종류: {card.get('type')} (가능: {', '.join(CARDS)})")
    fn(draw, th, card)
    src = str(card.get("source", "")).strip()
    if src:
        draw.text((WIDTH // 2, HEIGHT - 210), f"출처 {src}", font=_font(34, False),
                  fill=(255, 255, 255), anchor="ma")
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=94)
    return out


SAMPLES = [
    {"type": "stat", "label": "확정 공모가", "value": "18,000원", "note": "희망밴드 상단"},
    {"type": "compare", "left": {"label": "최초 희망밴드", "value": "27,000원"},
     "right": {"label": "확정 공모가", "value": "18,000원"}, "delta": "상단 33% 인하"},
    {"type": "table", "head": "기관 수요예측", "highlight": 2,
     "rows": [["참여 건수", "2,255건"], ["경쟁률", "1,109 : 1"], ["의무보유확약", "18.14%"]]},
    {"type": "bars", "highlight": 2, "rows": [["1차 밴드 상단", 27000, "27,000원"],
                                              ["2차 밴드 상단", 24000, "24,000원"],
                                              ["최종 확정", 18000, "18,000원"]]},
    {"type": "steps", "done": 3, "rows": [["수요예측", "1,109 : 1"], ["일반청약", "1,375 : 1"],
                                          ["상장", "9월 29일"]]},
]


def main() -> None:
    ap = argparse.ArgumentParser(description="숫자·표 카드 생성")
    ap.add_argument("--json", help="카드 정의 JSON 문자열")
    ap.add_argument("--file", help="카드 정의 JSON 파일")
    ap.add_argument("--out", help="출력 이미지 경로")
    ap.add_argument("--theme", default="navy", choices=sorted(THEMES))
    ap.add_argument("--sheet", help="카드 종류 미리보기 시트 경로")
    a = ap.parse_args()

    if a.sheet:
        from PIL import Image

        tiles = []
        for i, c in enumerate(SAMPLES):
            p = Path(a.sheet).with_name(f"_card{i}.jpg")
            draw_card(c, p, a.theme)
            tiles.append(Image.open(p).resize((WIDTH // 4, HEIGHT // 4)))
        sheet = Image.new("RGB", (tiles[0].width * len(tiles), tiles[0].height))
        for i, t in enumerate(tiles):
            sheet.paste(t, (i * t.width, 0))
        sheet.save(a.sheet, quality=92)
        print(f"[datacard] 미리보기 {a.sheet}")
        return

    if not a.out:
        ap.error("--out 이 필요합니다")
    card = json.loads(a.json) if a.json else json.loads(Path(a.file).read_text(encoding="utf-8"))
    draw_card(card, a.out, a.theme)
    print(f"[datacard] {a.out}")


if __name__ == "__main__":
    main()
