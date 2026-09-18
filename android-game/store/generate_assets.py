#!/usr/bin/env python3
"""Generate the Google Play listing images for both apps with the standard library only.

Outputs (next to this script), one pair per app:
  <app>-icon-512.png                 512x512 app icon (Play Console "App icon")
  <app>-feature-graphic-1024x500.png Feature graphic (Play Console "Feature graphic")

Run:  python3 android-game/store/generate_assets.py
"""
from __future__ import annotations

import math
import os
import struct
import zlib

SS = 3  # supersampling factor for anti-aliasing

SKY_TOP = (0x0F, 0x17, 0x2A)
SKY_BOTTOM = (0x31, 0x2E, 0x81)
ICON_BG = (0x1E, 0x1B, 0x4B)
PLAYER = (0x22, 0xD3, 0xEE)
PLAYER_GLOW = (0x22, 0xD3, 0xEE, 0.25)
HIGHLIGHT = (0xCF, 0xFA, 0xFE)
BLOCK = (0xF4, 0x3F, 0x5E)
BLOCK_LIGHT = (0xFB, 0x71, 0x85)
STAR = (0xFB, 0xBF, 0x24)
WHITE = (0xF8, 0xFA, 0xFC)


class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w * SS, h * SS
        self.px = [[(0, 0, 0)] * self.w for _ in range(self.h)]

    def fill_vertical_gradient(self, top, bottom):
        for y in range(self.h):
            t = y / max(1, self.h - 1)
            c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
            self.px[y] = [c] * self.w

    def _blend(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            a = color[3] if len(color) == 4 else 1.0
            if a >= 1.0:
                self.px[y][x] = color[:3]
            else:
                b = self.px[y][x]
                self.px[y][x] = tuple(round(b[i] * (1 - a) + color[i] * a) for i in range(3))

    def circle(self, cx, cy, r, color):
        cx, cy, r = cx * SS, cy * SS, r * SS
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self._blend(x, y, color)

    def rounded_rect(self, x0, y0, x1, y1, radius, color):
        x0, y0, x1, y1, radius = x0 * SS, y0 * SS, x1 * SS, y1 * SS, radius * SS
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                px, py = x + 0.5, y + 0.5
                qx = max(x0 + radius - px, 0, px - (x1 - radius))
                qy = max(y0 + radius - py, 0, py - (y1 - radius))
                if qx * qx + qy * qy <= radius * radius:
                    self._blend(x, y, color)

    def polygon(self, points, color):
        pts = [(x * SS, y * SS) for x, y in points]
        ys = [p[1] for p in pts]
        xs = [p[0] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 2):
            for x in range(int(min(xs)), int(max(xs)) + 2):
                if _point_in_polygon(x + 0.5, y + 0.5, pts):
                    self._blend(x, y, color)

    def star(self, cx, cy, outer, inner, color, rotation=0.0):
        pts = []
        for i in range(10):
            r = outer if i % 2 == 0 else inner
            a = -math.pi / 2 + i * math.pi / 5 + rotation
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        self.polygon(pts, color)

    def save(self, path):
        w, h = self.w // SS, self.h // SS
        raw = bytearray()
        for y in range(h):
            raw.append(0)
            for x in range(w):
                acc = [0, 0, 0]
                for dy in range(SS):
                    row = self.px[y * SS + dy]
                    for dx in range(SS):
                        c = row[x * SS + dx]
                        acc[0] += c[0]
                        acc[1] += c[1]
                        acc[2] += c[2]
                n = SS * SS
                raw += bytes((acc[0] // n, acc[1] // n, acc[2] // n))
        with open(path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n")
            f.write(_chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)))
            f.write(_chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
            f.write(_chunk(b"IEND", b""))


def _chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def _point_in_polygon(x, y, pts):
    inside = False
    n = len(pts)
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def draw_scene(c: Canvas, ox, oy, s):
    """Draw the icon motif scaled by s with origin (ox, oy) in a 108-unit box."""
    c.rounded_rect(ox + 27 * s, oy + 26 * s, ox + 53 * s, oy + 40 * s, 3 * s, BLOCK)
    c.rounded_rect(ox + 59 * s, oy + 40 * s, ox + 81 * s, oy + 54 * s, 3 * s, BLOCK_LIGHT)
    c.star(ox + 36 * s, oy + 56 * s, 8 * s, 3.6 * s, STAR)
    c.circle(ox + 54 * s, oy + 74 * s, 19 * s, PLAYER_GLOW)
    c.circle(ox + 54 * s, oy + 74 * s, 13 * s, PLAYER)
    c.circle(ox + 49 * s, oy + 69 * s, 4 * s, HIGHLIGHT)


def make_icon(path):
    c = Canvas(512, 512)
    c.fill_vertical_gradient(ICON_BG, ICON_BG)
    draw_scene(c, 0, 0, 512 / 108)
    c.save(path)


def make_feature_graphic(path):
    c = Canvas(1024, 500)
    c.fill_vertical_gradient(SKY_TOP, SKY_BOTTOM)
    # scattered blocks and stars for depth
    for (x, y, w) in [(80, 60, 120), (300, 20, 90), (860, 90, 140), (700, 380, 110), (150, 400, 100)]:
        c.rounded_rect(x, y, x + w, y + 34, 8, (*BLOCK, 0.85))
    for (x, y, r, rot) in [(420, 120, 22, 0.2), (980, 300, 18, 0.6), (60, 260, 16, 0.9), (560, 430, 20, 0.3)]:
        c.star(x, y, r, r * 0.45, STAR, rot)
    # hero motif on the left
    draw_scene(c, 40, 20, 4.2)
    # simple wordmark: "SKY DODGE" drawn with blocks (no font rasterizer available)
    _wordmark(c, 440, 215)
    c.save(path)


_GLYPHS = {
    "S": ["1111", "1000", "1111", "0001", "1111"],
    "K": ["1001", "1010", "1100", "1010", "1001"],
    "Y": ["1001", "1001", "0110", "0110", "0110"],
    "D": ["1110", "1001", "1001", "1001", "1110"],
    "O": ["0110", "1001", "1001", "1001", "0110"],
    "G": ["0111", "1000", "1011", "1001", "0111"],
    "E": ["1111", "1000", "1110", "1000", "1111"],
    " ": ["0", "0", "0", "0", "0"],
}


def _wordmark(c: Canvas, x0, y0, cell=11, gap=3):
    x = x0
    for ch in "SKY DODGE":
        rows = _GLYPHS[ch]
        for r, row in enumerate(rows):
            for col, bit in enumerate(row):
                if bit == "1":
                    cx = x + col * (cell + gap)
                    cy = y0 + r * (cell + gap)
                    c.rounded_rect(cx, cy, cx + cell, cy + cell, 4, WHITE)
        x += len(rows[0]) * (cell + gap) + cell


# ---------------------------------------------------------------- Crowd Rush

CR_BG = (0x0B, 0x5E, 0x56)
CR_SKY_TOP = (0x5E, 0xB8, 0xF5)
CR_SKY_BOTTOM = (0xD6, 0xEE, 0xFF)
CR_GRASS = (0x5D, 0xB8, 0x5B)
CR_ROAD = (0xC9, 0xA5, 0x6B)
CR_GATE = (0xF5, 0x9E, 0x0B)
CR_GATE_BAD = (0x7C, 0x3A, 0xED)
CR_GATE_DARK = (0x78, 0x35, 0x0F)
CR_ALLY = (0x14, 0xB8, 0xA6)
CR_ENEMY = (0x84, 0xCC, 0x16)
CR_HEAD = (0xFD, 0xE6, 0x8A)


def draw_cone(c: Canvas, x, y, size, body):
    c.polygon([(x, y - size * 1.6), (x + size * 0.75, y + size * 0.7), (x - size * 0.75, y + size * 0.7)], body)
    c.circle(x, y - size * 0.55, size * 0.32, CR_HEAD)


def draw_crowd(c: Canvas, cx, cy, n, radius, body, unit):
    for i in range(n):
        a = i * 2.39996
        r = radius * math.sqrt((i + 0.5) / max(n, 6)) * 0.95
        draw_cone(c, cx + math.cos(a) * r, cy + math.sin(a) * r * 0.55, unit, body)


def draw_plus(c: Canvas, cx, cy, arm, thick, color):
    c.rounded_rect(cx - arm, cy - thick / 2, cx + arm, cy + thick / 2, thick / 4, color)
    c.rounded_rect(cx - thick / 2, cy - arm, cx + thick / 2, cy + arm, thick / 4, color)


SKIN = (0xF6, 0xCB, 0xA2)
HAIR = (0x2A, 0x26, 0x2A)
SHIRT = (0xF2, 0xF5, 0xFA)
TIE = (0xD6, 0x2E, 0x3E)
WOOD = (0x8B, 0x5A, 0x2B)


def make_crowd_icon(path):
    c = Canvas(512, 512)
    c.fill_vertical_gradient(CR_BG, CR_BG)
    s = 512 / 108
    c.rounded_rect(18 * s, 30 * s, 24 * s, 60 * s, 1 * s, WOOD)
    c.rounded_rect(84 * s, 30 * s, 90 * s, 60 * s, 1 * s, WOOD)
    c.rounded_rect(24 * s, 34 * s, 84 * s, 56 * s, 4 * s, CR_GATE)
    draw_plus(c, 54 * s, 45 * s, 9 * s, 4.5 * s, (0xFD, 0xE6, 0x8A))
    c.circle(54 * s, 74 * s, 13 * s, SKIN)                      # head
    c.circle(54 * s, 70 * s, 12 * s, HAIR)                      # hair
    c.circle(54 * s, 76 * s, 11 * s, SKIN)                      # face below the fringe
    c.rounded_rect(42 * s, 86 * s, 66 * s, 104 * s, 3 * s, SHIRT)  # shirt
    c.polygon([(51 * s, 86 * s), (57 * s, 86 * s), (55 * s, 100 * s), (54 * s, 103 * s), (53 * s, 100 * s)], TIE)
    c.save(path)


def make_crowd_feature_graphic(path):
    c = Canvas(1024, 500)
    c.fill_vertical_gradient(CR_SKY_TOP, CR_SKY_BOTTOM)
    c.rounded_rect(0, 150, 1024, 500, 0, CR_GRASS)
    # road trapezoid
    c.polygon([(120, 500), (904, 500), (640, 150), (384, 150)], CR_ROAD)
    # gates receding along the road
    for (y, w, h, label_w) in [(420, 300, 70, 1.0), (300, 200, 46, 0.66), (215, 120, 28, 0.4)]:
        cx = 512
        c.rounded_rect(cx - w, y - h, cx - 6, y, 6, CR_GATE)
        c.rounded_rect(cx + 6, y - h, cx + w, y, 6, CR_GATE_BAD)
        draw_plus(c, cx - w / 2, y - h / 2, 10 * label_w, 5 * label_w, (255, 255, 255))
        c.rounded_rect(cx + w / 2 - 10 * label_w, y - h / 2 - 2.5 * label_w, cx + w / 2 + 10 * label_w, y - h / 2 + 2.5 * label_w, 2, (255, 255, 255))
    # enemy horde at the far end
    draw_crowd(c, 512, 175, 60, 110, CR_ENEMY, 7)
    # player crowd in front
    draw_crowd(c, 512, 470, 30, 80, CR_ALLY, 13)
    _wordmark_generic(c, "VILLAIN RUSH", 60, 50, cell=11, gap=3)
    c.save(path)


_GLYPHS.update({
    "B": ["1110", "1001", "1110", "1001", "1110"],
    "L": ["1000", "1000", "1000", "1000", "1111"],
    "I": ["111", "010", "010", "010", "111"],
    "N": ["1001", "1101", "1011", "1001", "1001"],
    "T": ["11111", "00100", "00100", "00100", "00100"],
    "V": ["10001", "10001", "10001", "01010", "00100"],
    "A": ["0110", "1001", "1111", "1001", "1001"],
    "C": ["0111", "1000", "1000", "1000", "0111"],
    "R": ["1110", "1001", "1110", "1010", "1001"],
    "W": ["10001", "10001", "10101", "10101", "01010"],
    "U": ["1001", "1001", "1001", "1001", "0110"],
    "H": ["1001", "1001", "1111", "1001", "1001"],
})


def _wordmark_generic(c: Canvas, text, x0, y0, cell=11, gap=3):
    x = x0
    for ch in text:
        rows = _GLYPHS[ch]
        for r, row in enumerate(rows):
            for col, bit in enumerate(row):
                if bit == "1":
                    cx = x + col * (cell + gap)
                    cy = y0 + r * (cell + gap)
                    c.rounded_rect(cx, cy, cx + cell, cy + cell, 4, WHITE)
        x += len(rows[0]) * (cell + gap) + cell


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    make_icon(os.path.join(here, "skydodge-icon-512.png"))
    make_feature_graphic(os.path.join(here, "skydodge-feature-graphic-1024x500.png"))
    make_crowd_icon(os.path.join(here, "villainrush-icon-512.png"))
    make_crowd_feature_graphic(os.path.join(here, "villainrush-feature-graphic-1024x500.png"))
    print("wrote skydodge-* and villainrush-* icon/feature images")
