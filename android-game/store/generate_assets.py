#!/usr/bin/env python3
"""Generate the Google Play listing images for Sky Dodge with the standard library only.

Outputs (next to this script):
  icon-512.png              512x512 app icon (Play Console "App icon")
  feature-graphic-1024x500.png  Feature graphic (Play Console "Feature graphic")

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


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    make_icon(os.path.join(here, "icon-512.png"))
    make_feature_graphic(os.path.join(here, "feature-graphic-1024x500.png"))
    print("wrote icon-512.png and feature-graphic-1024x500.png")
