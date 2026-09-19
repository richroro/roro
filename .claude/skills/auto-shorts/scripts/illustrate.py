#!/usr/bin/env python3
"""장면 일러스트 생성기 (auto-shorts).

사진을 쓰기 어렵거나(주제와 안 맞음·저작권·분위기) 그림이 더 어울리는 영상을 위해,
씬 내용에 맞는 **플랫 벡터 풍경**을 직접 그린다. 네트워크·API 키가 필요 없고, 한 영상 안에서
팔레트가 통일되며, 씬마다 정확히 원하는 장면이 나온다.

템플릿: mountain · sunrise · night · ocean · forest · rain · candle · road · city · stairs
        bird · tree · door · window · stage · trophy · abstract

CLI:
    python illustrate.py --template mountain --out a.jpg --seed 3 --palette dusk
    python illustrate.py --keywords "포기하지 마" --out a.jpg        # 키워드로 템플릿 추정
    python illustrate.py --sheet /tmp/sheet.jpg                      # 전체 템플릿 미리보기
"""
from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import HEIGHT, WIDTH, log  # noqa: E402

# 팔레트: 하늘 위/아래, 해·달, 뒤에서 앞으로 겹치는 실루엣 층, 강조색
PALETTES = {
    "night":  dict(sky=((8, 12, 34), (26, 32, 74)), orb=(226, 232, 255), star=(255, 255, 255),
                   layers=[(30, 38, 82), (22, 28, 64), (14, 18, 44), (8, 10, 28)], accent=(255, 212, 0)),
    "dawn":   dict(sky=((32, 26, 60), (247, 160, 120)), orb=(255, 238, 190), star=(255, 240, 210),
                   layers=[(120, 84, 116), (86, 58, 92), (54, 36, 62), (28, 18, 34)], accent=(255, 220, 140)),
    "dusk":   dict(sky=((22, 20, 48), (226, 108, 92)), orb=(255, 206, 150), star=(255, 226, 200),
                   layers=[(112, 62, 88), (78, 42, 66), (48, 26, 44), (24, 14, 24)], accent=(255, 180, 120)),
    "forest": dict(sky=((16, 34, 36), (96, 148, 118)), orb=(226, 244, 214), star=(230, 250, 230),
                   layers=[(52, 92, 78), (38, 70, 60), (24, 46, 40), (12, 26, 22)], accent=(210, 240, 180)),
    "ocean":  dict(sky=((12, 26, 52), (78, 150, 176)), orb=(236, 248, 255), star=(235, 245, 255),
                   layers=[(36, 86, 112), (26, 64, 88), (16, 42, 62), (8, 22, 38)], accent=(180, 230, 255)),
    "warm":   dict(sky=((40, 22, 26), (214, 132, 74)), orb=(255, 226, 170), star=(255, 236, 200),
                   layers=[(128, 68, 52), (96, 48, 38), (62, 30, 26), (32, 16, 16)], accent=(255, 198, 120)),
}
MOOD_PALETTE = {"calm": "dawn", "lofi": "dusk", "playful": "warm", "mysterious": "night", "epic": "dusk"}

# 키워드 → 템플릿 (한국어·영어 모두)
KEYWORD_MAP = {
    "mountain": ["mountain", "peak", "산", "정상", "등반", "climb", "summit"],
    "sunrise": ["sunrise", "sunset", "dawn", "해", "아침", "새벽", "일출", "노을", "sun"],
    "night": ["night", "star", "sky", "밤", "별", "우주", "space", "galaxy", "moon", "달"],
    "ocean": ["ocean", "sea", "wave", "water", "바다", "파도", "물"],
    "forest": ["forest", "tree", "wood", "숲", "나무", "자연"],
    "rain": ["rain", "storm", "비", "폭우", "장마", "우울"],
    "candle": ["candle", "flame", "light", "촛불", "불빛", "희망", "온기"],
    "road": ["road", "path", "journey", "길", "여정", "출발", "시작"],
    "city": ["city", "building", "urban", "도시", "빌딩", "야경"],
    "stairs": ["stair", "step", "계단", "한 걸음", "오르"],
    "bird": ["bird", "fly", "wing", "새", "날다", "자유"],
    "tree": ["lone tree", "혼자", "고독", "홀로"],
    "door": ["door", "gate", "문", "기회", "선택"],
    "window": ["window", "창문", "창"],
    "stage": ["stage", "concert", "award", "무대", "공연", "시상식", "연설", "데뷔", "스포트라이트"],
    "trophy": ["trophy", "prize", "win", "record", "트로피", "수상", "1위", "기록", "우승", "관왕"],
}


def pick_template(keywords: str) -> str:
    k = (keywords or "").lower()
    best, score = "abstract", 0
    for tpl, words in KEYWORD_MAP.items():
        hit = sum(len(w) for w in words if w in k)
        if hit > score:
            best, score = tpl, hit
    return best


# ---------------------------------------------------------------- 기본 도형
def _gradient(img, top, bottom):
    px = img.load()
    for y in range(HEIGHT):
        t = (y / HEIGHT) ** 1.15
        row = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(WIDTH):
            px[x, y] = row


def _glow(img, xy, radius, color, strength=140):
    from PIL import Image, ImageDraw, ImageFilter  # type: ignore

    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, strength))
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.55))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def _stars(draw, rng, pal, count=140, ymax=0.62):
    for _ in range(count):
        x, y = rng.randint(0, WIDTH), rng.randint(0, int(HEIGHT * ymax))
        r = rng.choice([1, 1, 1, 2, 2, 3])
        a = rng.randint(120, 255)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*pal["star"], a) if len(pal["star"]) == 3 else pal["star"])


def _ridge(draw, rng, color, base_y, height, roughness=0.55, steps=9):
    """산등성이 실루엣 하나."""
    pts = [(0, HEIGHT)]
    x = 0
    y = base_y
    seg = WIDTH / steps
    for i in range(steps + 1):
        pts.append((x, y))
        x += seg
        y = base_y - height * (rng.random() ** 0.8) if i % 2 == 0 else base_y - height * roughness * rng.random()
    pts.append((WIDTH, HEIGHT))
    draw.polygon(pts, fill=color)


def _hill(draw, color, cy, amp, phase=0.0):
    pts = [(x, cy + amp * math.sin(x / WIDTH * math.pi * 1.6 + phase)) for x in range(0, WIDTH + 1, 12)]
    draw.polygon([(0, HEIGHT)] + pts + [(WIDTH, HEIGHT)], fill=color)


def _grain(img, rng, amount=8):
    from PIL import Image  # type: ignore

    noise = Image.new("L", (WIDTH // 3, HEIGHT // 3))
    noise.putdata([128 + rng.randint(-amount, amount) for _ in range(noise.width * noise.height)])
    noise = noise.resize((WIDTH, HEIGHT), Image.BILINEAR)
    return Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.06)


def _vignette(img, strength=0.45):
    from PIL import Image, ImageDraw, ImageFilter  # type: ignore

    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    ImageDraw.Draw(mask).ellipse((-WIDTH * 0.35, HEIGHT * 0.02, WIDTH * 1.35, HEIGHT * 0.98), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(220))
    dark = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    return Image.composite(img, Image.blend(img, dark, strength), mask)


# ---------------------------------------------------------------- 템플릿
def t_mountain(img, draw, rng, pal):
    orb_y = int(HEIGHT * 0.3)
    img = _glow(img, (int(WIDTH * 0.62), orb_y), 210, pal["orb"], 120)
    draw = _redraw(img)
    draw.ellipse((WIDTH * 0.62 - 90, orb_y - 90, WIDTH * 0.62 + 90, orb_y + 90), fill=pal["orb"])
    for i, c in enumerate(pal["layers"]):
        _ridge(draw, rng, c, int(HEIGHT * (0.52 + i * 0.09)), int(HEIGHT * (0.26 - i * 0.045)))
    return img


def t_sunrise(img, draw, rng, pal):
    cx, cy = int(WIDTH * 0.5), int(HEIGHT * 0.46)
    img = _glow(img, (cx, cy), 330, pal["orb"], 130)
    draw = _redraw(img)
    draw.ellipse((cx - 140, cy - 140, cx + 140, cy + 140), fill=pal["orb"])
    for i in range(3):                       # 가로 구름 띠
        y = int(HEIGHT * (0.32 + i * 0.07))
        h = rng.randint(14, 26)
        w = rng.randint(int(WIDTH * 0.4), int(WIDTH * 0.9))
        x = rng.randint(-100, WIDTH - w // 2)
        draw.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=pal["layers"][0])
    _hill(draw, pal["layers"][2], int(HEIGHT * 0.66), 40)
    _hill(draw, pal["layers"][3], int(HEIGHT * 0.78), 26, phase=1.2)
    return img


def t_night(img, draw, rng, pal):
    _stars(draw, rng, pal, 200, 0.7)
    mx, my = int(WIDTH * 0.7), int(HEIGHT * 0.22)
    img = _glow(img, (mx, my), 190, pal["orb"], 110)
    draw = _redraw(img)
    draw.ellipse((mx - 78, my - 78, mx + 78, my + 78), fill=pal["orb"])
    _hill(draw, pal["layers"][2], int(HEIGHT * 0.74), 46)
    _hill(draw, pal["layers"][3], int(HEIGHT * 0.86), 30, phase=2.1)
    return img


def t_ocean(img, draw, rng, pal):
    horizon = int(HEIGHT * 0.52)
    cx = int(WIDTH * 0.5)
    img = _glow(img, (cx, horizon - 120), 240, pal["orb"], 120)
    draw = _redraw(img)
    draw.ellipse((cx - 110, horizon - 230, cx + 110, horizon - 10), fill=pal["orb"])
    draw.rectangle((0, horizon, WIDTH, HEIGHT), fill=pal["layers"][1])
    for i in range(26):                      # 물결 + 달빛 반사
        y = horizon + int((i / 26) ** 1.6 * (HEIGHT - horizon))
        w = rng.randint(60, 260)
        x = cx + rng.randint(-int(WIDTH * 0.45), int(WIDTH * 0.45))
        t = i / 26
        col = tuple(int(pal["layers"][1][k] * (1 - t * 0.5) + pal["orb"][k] * (t * 0.35 + 0.15)) for k in range(3))
        draw.line((x, y, x + w, y), fill=col, width=rng.randint(3, 9))
    return img


def t_forest(img, draw, rng, pal):
    _hill(draw, pal["layers"][0], int(HEIGHT * 0.58), 30)
    for layer, color in enumerate(pal["layers"][1:]):
        base = int(HEIGHT * (0.62 + layer * 0.1))
        scale = 1.0 + layer * 0.5
        if layer:                                        # 층 사이 안개
            img2 = _glow(img, (WIDTH // 2, base - 40), 420, pal["orb"], 26)
            img.paste(img2)
            draw = _redraw(img)
        x = -60
        while x < WIDTH + 60:
            h = rng.randint(int(120 * scale), int(340 * scale))
            w = int(h * rng.uniform(0.32, 0.46))
            draw.polygon([(x, base), (x + w / 2, base - h), (x + w, base)], fill=color)
            draw.rectangle((x + w / 2 - w * 0.06, base - 10, x + w / 2 + w * 0.06, base + 30), fill=color)
            x += int(w * rng.uniform(0.55, 0.85))
    return img


def t_rain(img, draw, rng, pal):
    for _ in range(90):                      # 흐릿한 불빛
        x, y = rng.randint(0, WIDTH), rng.randint(0, int(HEIGHT * 0.8))
        r = rng.randint(6, 26)
        img = _glow(img, (x, y), r * 2, pal["accent"], rng.randint(20, 60))
    draw = _redraw(img)
    for _ in range(220):                     # 빗줄기
        x, y = rng.randint(-100, WIDTH), rng.randint(0, HEIGHT)
        ln = rng.randint(40, 150)
        draw.line((x, y, x + int(ln * 0.22), y + ln), fill=(*pal["star"], 90), width=rng.choice([2, 2, 3]))
    return img


def t_candle(img, draw, rng, pal):
    cx, cy = WIDTH // 2, int(HEIGHT * 0.52)
    img = _glow(img, (cx, cy), 420, pal["accent"], 120)
    img = _glow(img, (cx, cy), 160, (255, 240, 200), 170)
    draw = _redraw(img)
    draw.polygon([(cx, cy - 150), (cx + 46, cy - 20), (cx, cy + 60), (cx - 46, cy - 20)], fill=(255, 226, 150))
    draw.polygon([(cx, cy - 92), (cx + 22, cy - 12), (cx, cy + 30), (cx - 22, cy - 12)], fill=(255, 255, 235))
    draw.rectangle((cx - 60, cy + 60, cx + 60, cy + 330), fill=pal["layers"][0])
    draw.ellipse((cx - 60, cy + 40, cx + 60, cy + 82), fill=pal["layers"][1])
    return img


def t_road(img, draw, rng, pal):
    horizon = int(HEIGHT * 0.5)
    img = _glow(img, (WIDTH // 2, horizon - 40), 300, pal["orb"], 120)
    draw = _redraw(img)
    draw.ellipse((WIDTH * 0.5 - 90, horizon - 190, WIDTH * 0.5 + 90, horizon - 10), fill=pal["orb"])
    _hill(draw, pal["layers"][1], int(HEIGHT * 0.52), 22)          # 지평선 언덕
    draw.rectangle((0, horizon + 10, WIDTH, HEIGHT), fill=pal["layers"][3])   # 들판
    road = tuple(min(255, c + 46) for c in pal["layers"][2])       # 길은 들판보다 밝게
    draw.polygon([(-WIDTH * 0.25, HEIGHT), (WIDTH * 0.455, horizon + 10),
                  (WIDTH * 0.545, horizon + 10), (WIDTH * 1.25, HEIGHT)], fill=road)
    y = HEIGHT
    i = 0
    while y > horizon + 40:                                        # 원근감 있는 중앙선
        h = max(10, int((y - horizon) * 0.10))
        w = max(3, int((y - horizon) * 0.026))
        if i % 2 == 0:
            draw.rectangle((WIDTH // 2 - w, y - h, WIDTH // 2 + w, y), fill=pal["accent"])
        y -= int(h * 1.9)
        i += 1
    return img


def t_city(img, draw, rng, pal):
    _stars(draw, rng, pal, 90, 0.4)
    for layer, color in enumerate(pal["layers"][1:]):
        base = int(HEIGHT * (0.62 + layer * 0.12))
        x = -40
        while x < WIDTH + 40:
            w = rng.randint(70, 190)
            h = rng.randint(120, 460) - layer * 40
            draw.rectangle((x, base - h, x + w, base + 60), fill=color)
            if layer == 0:
                for wy in range(base - h + 24, base - 20, 44):
                    for wx in range(x + 16, x + w - 20, 34):
                        if rng.random() < 0.45:
                            draw.rectangle((wx, wy, wx + 14, wy + 20), fill=pal["accent"])
            x += w + rng.randint(6, 26)
    return img


def t_stairs(img, draw, rng, pal):
    img = _glow(img, (int(WIDTH * 0.72), int(HEIGHT * 0.28)), 260, pal["orb"], 120)
    draw = _redraw(img)
    x, y = -40, HEIGHT - 60
    w, h = int(WIDTH * 0.26), 92
    i = 0
    while y > HEIGHT * 0.32 and x < WIDTH:
        draw.rectangle((x, y, x + w * 2, y + h), fill=pal["layers"][min(3, i // 3)])
        draw.rectangle((x, y, x + w * 2, y + 12), fill=pal["layers"][max(0, min(3, i // 3) - 1)])
        x += int(w * 0.52)
        y -= h
        i += 1
    return img


def t_bird(img, draw, rng, pal):
    img = _glow(img, (int(WIDTH * 0.5), int(HEIGHT * 0.32)), 340, pal["orb"], 120)
    draw = _redraw(img)
    draw.ellipse((WIDTH * 0.5 - 120, HEIGHT * 0.32 - 120, WIDTH * 0.5 + 120, HEIGHT * 0.32 + 120),
                 fill=pal["orb"])
    col = pal["layers"][3]
    for i in range(6):                       # 갈매기 모양 새 떼(가까울수록 크게)
        s_ = int(120 - i * 13)
        x = rng.randint(int(WIDTH * 0.18), int(WIDTH * 0.82))
        y = rng.randint(int(HEIGHT * 0.18), int(HEIGHT * 0.6))
        wdt = max(6, int(s_ * 0.13))
        draw.arc((x - s_, y - s_ * 0.55, x, y + s_ * 0.55), 195, 345, fill=col, width=wdt)
        draw.arc((x, y - s_ * 0.55, x + s_, y + s_ * 0.55), 195, 345, fill=col, width=wdt)
    _hill(draw, pal["layers"][2], int(HEIGHT * 0.8), 34)
    _hill(draw, pal["layers"][3], int(HEIGHT * 0.9), 22, phase=1.7)
    return img


def t_tree(img, draw, rng, pal):
    img = _glow(img, (int(WIDTH * 0.3), int(HEIGHT * 0.3)), 240, pal["orb"], 110)
    draw = _redraw(img)
    _hill(draw, pal["layers"][2], int(HEIGHT * 0.72), 40)
    bx, by = int(WIDTH * 0.56), int(HEIGHT * 0.72)
    draw.polygon([(bx - 26, by), (bx - 10, by - 330), (bx + 10, by - 330), (bx + 26, by)], fill=pal["layers"][3])
    for _ in range(7):                       # 가지
        a = rng.uniform(-1.2, 1.2)
        ln = rng.randint(120, 230)
        draw.line((bx, by - 250 - rng.randint(0, 70), bx + ln * math.sin(a), by - 300 - ln * math.cos(a) * 0.6),
                  fill=pal["layers"][3], width=rng.randint(7, 14))
    for _ in range(90):                      # 잎
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, 210)
        x = bx + math.cos(a) * r
        y = by - 400 + math.sin(a) * r * 0.62
        s = rng.randint(14, 34)
        draw.ellipse((x - s, y - s, x + s, y + s), fill=pal["layers"][2 if rng.random() < 0.5 else 3])
    _hill(draw, pal["layers"][3], int(HEIGHT * 0.86), 22, phase=1.6)
    return img


def t_door(img, draw, rng, pal):
    dw, dh = int(WIDTH * 0.42), int(HEIGHT * 0.46)
    x, y = (WIDTH - dw) // 2, int(HEIGHT * 0.32)
    img = _glow(img, (WIDTH // 2, y + dh // 2), 320, pal["orb"], 150)
    draw = _redraw(img)
    draw.rectangle((x - 34, y - 34, x + dw + 34, y + dh + 34), fill=pal["layers"][3])
    draw.rounded_rectangle((x, y, x + dw, y + dh), radius=int(dw * 0.16), fill=pal["orb"])
    draw.rectangle((0, y + dh + 34, WIDTH, HEIGHT), fill=pal["layers"][3])
    return img


def t_window(img, draw, rng, pal):
    ww, wh = int(WIDTH * 0.62), int(HEIGHT * 0.44)
    x, y = (WIDTH - ww) // 2, int(HEIGHT * 0.26)
    _stars(draw, rng, pal, 120, 0.7)
    draw.rectangle((x, y, x + ww, y + wh), fill=pal["layers"][0])
    draw.ellipse((x + ww * 0.55, y + wh * 0.18, x + ww * 0.85, y + wh * 0.48), fill=pal["orb"])
    frame = 26
    draw.rectangle((x - frame, y - frame, x + ww + frame, y + wh + frame), outline=pal["layers"][3], width=frame)
    draw.rectangle((x + ww // 2 - 12, y, x + ww // 2 + 12, y + wh), fill=pal["layers"][3])
    draw.rectangle((x, y + wh // 2 - 12, x + ww, y + wh // 2 + 12), fill=pal["layers"][3])
    draw.rectangle((0, y + wh + frame, WIDTH, HEIGHT), fill=pal["layers"][3])
    return img


def t_stage(img, draw, rng, pal):
    """무대와 스포트라이트 — 시상식·공연·발표 장면."""
    from PIL import Image, ImageDraw, ImageFilter  # type: ignore

    floor = int(HEIGHT * 0.78)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=pal["layers"][3])
    cx = WIDTH // 2
    cone = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ImageDraw.Draw(cone).polygon([(cx - 110, -40), (cx + 110, -40),
                                  (cx + 420, floor), (cx - 420, floor)], fill=(*pal["orb"], 60))
    img = Image.alpha_composite(img.convert("RGBA"), cone.filter(ImageFilter.GaussianBlur(50))).convert("RGB")
    draw = _redraw(img)
    draw.ellipse((cx - 330, floor - 90, cx + 330, floor + 90), fill=(*pal["orb"], 55))
    draw.rectangle((0, floor, WIDTH, HEIGHT), fill=pal["layers"][2])
    for i in range(2):                       # 양쪽 커튼
        w = int(WIDTH * 0.2)
        x = 0 if i == 0 else WIDTH - w
        draw.rectangle((x, 0, x + w, floor + 40), fill=pal["layers"][1])
        for k in range(5):                   # 주름
            kx = x + int(w * (k + 0.5) / 5)
            draw.line((kx, 0, kx, floor + 40), fill=pal["layers"][0], width=8)
    draw.rectangle((cx - 9, floor - 300, cx + 9, floor), fill=pal["layers"][0])   # 마이크 스탠드
    draw.ellipse((cx - 34, floor - 348, cx + 34, floor - 282), fill=pal["layers"][0])
    return img


def t_trophy(img, draw, rng, pal):
    """트로피 — 수상·기록·1위."""
    cx, cy = WIDTH // 2, int(HEIGHT * 0.5)
    img = _glow(img, (cx, cy), 380, pal["accent"], 120)
    draw = _redraw(img)
    gold = pal["accent"]
    draw.chord((cx - 150, cy - 250, cx + 150, cy + 60), 0, 180, fill=gold)        # 컵
    draw.rectangle((cx - 150, cy - 250, cx + 150, cy - 210), fill=gold)
    for sgn in (-1, 1):                                                           # 손잡이
        draw.arc((cx + sgn * 130 - 90, cy - 240, cx + sgn * 130 + 90, cy - 80),
                 90 if sgn > 0 else 270, 270 if sgn > 0 else 90, fill=gold, width=22)
    draw.polygon([(cx - 40, cy + 55), (cx + 40, cy + 55), (cx + 26, cy + 150), (cx - 26, cy + 150)], fill=gold)
    draw.rounded_rectangle((cx - 130, cy + 150, cx + 130, cy + 230), radius=14, fill=pal["layers"][1])
    draw.rectangle((0, cy + 230, WIDTH, HEIGHT), fill=pal["layers"][3])
    for _ in range(26):                                                           # 반짝임
        x, y = rng.randint(cx - 380, cx + 380), rng.randint(cy - 330, cy + 120)
        r = rng.choice([2, 3, 4])
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*pal["star"], rng.randint(120, 230)))
    return img


def t_abstract(img, draw, rng, pal):
    for _ in range(7):
        r = rng.randint(180, 520)
        x, y = rng.randint(0, WIDTH), rng.randint(0, HEIGHT)
        img = _glow(img, (x, y), r, rng.choice([pal["orb"], pal["accent"], pal["layers"][0]]), rng.randint(30, 70))
    draw = _redraw(img)
    _hill(draw, pal["layers"][3], int(HEIGHT * 0.84), 40)
    return img


TEMPLATES = {"stage": t_stage, "trophy": t_trophy, "mountain": t_mountain, "sunrise": t_sunrise, "night": t_night, "ocean": t_ocean,
             "forest": t_forest, "rain": t_rain, "candle": t_candle, "road": t_road, "city": t_city,
             "stairs": t_stairs, "bird": t_bird, "tree": t_tree, "door": t_door, "window": t_window,
             "abstract": t_abstract}


def _redraw(img):
    from PIL import ImageDraw  # type: ignore

    return ImageDraw.Draw(img, "RGBA")


# ---------------------------------------------------------------- 공개 API
def draw_scene(template: str, out: Path | None = None, seed: int = 0, palette: str | None = None,
               mood: str = "calm"):
    """1080x1920 일러스트를 그려 out 에 저장하고 PIL 이미지를 돌려준다."""
    from PIL import Image  # type: ignore

    rng = random.Random(seed)
    pal = PALETTES[palette or MOOD_PALETTE.get(mood, "dawn")]
    img = Image.new("RGB", (WIDTH, HEIGHT))
    _gradient(img, *pal["sky"])
    fn = TEMPLATES.get(template, t_abstract)
    img = fn(img, _redraw(img), rng, pal) or img
    img = _grain(img, rng)
    img = _vignette(img)
    if out is not None:
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=92)
    return img


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts 장면 일러스트")
    ap.add_argument("--template", default=None, help=", ".join(TEMPLATES))
    ap.add_argument("--keywords", default="", help="키워드로 템플릿 추정")
    ap.add_argument("--palette", default=None, help=", ".join(PALETTES))
    ap.add_argument("--mood", default="calm")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", default=None)
    ap.add_argument("--sheet", default=None, help="모든 템플릿을 한 장으로 미리보기")
    args = ap.parse_args()

    if args.sheet:
        from PIL import Image  # type: ignore

        names = list(TEMPLATES)
        cols, tw, th = 5, 216, 384
        rows = (len(names) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * th), (10, 10, 10))
        for i, name in enumerate(names):
            pal = list(PALETTES)[i % len(PALETTES)]
            tile = draw_scene(name, None, seed=i + 1, palette=pal).resize((tw, th), Image.LANCZOS)
            sheet.paste(tile, ((i % cols) * tw, (i // cols) * th))
        Path(args.sheet).parent.mkdir(parents=True, exist_ok=True)
        sheet.save(args.sheet, "JPEG", quality=90)
        log("art", f"템플릿 {len(names)}종 미리보기 → {args.sheet}")
        return

    tpl = args.template or pick_template(args.keywords)
    out = Path(args.out or "illustration.jpg")
    draw_scene(tpl, out, args.seed, args.palette, args.mood)
    log("art", f"{tpl} ({args.palette or MOOD_PALETTE.get(args.mood)}) → {out}")


if __name__ == "__main__":
    main()
