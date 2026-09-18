#!/usr/bin/env python3
"""Draw the Crowd Rush soldier sprites with the standard library only (no external assets).

Outputs 4 RGBA PNGs into crowdrush/src/main/res/drawable-nodpi/:
  soldier_blue_back.png   player army, seen from behind
  soldier_blue_front.png  player army, facing the camera (unused in game, handy for store art)
  soldier_red_front.png   enemy squads and boss, facing the camera
  soldier_red_back.png    enemy, from behind (unused)

Run:  python3 android-game/tools/generate_sprites.py [out_dir]
"""
from __future__ import annotations

import math
import os
import struct
import sys
import zlib

SS = 4  # supersampling
W, H = 64, 80  # sprite size in pixels

SKIN = (0xF1, 0xC2, 0x7D)
SKIN_DARK = (0xC9, 0x93, 0x5B)
EYE = (0x1F, 0x29, 0x37)
BOOT = (0x29, 0x25, 0x24)
RIFLE = (0x37, 0x41, 0x51)
RIFLE_DARK = (0x1F, 0x29, 0x37)
STOCK = (0x92, 0x40, 0x0E)
STRAP = (0x44, 0x40, 0x3C)
POUCH = (0x57, 0x53, 0x4E)

TEAMS = {
    "blue": {"uniform": (0x2F, 0x6F, 0xED), "dark": (0x1E, 0x3A, 0x8A), "helmet": (0x1D, 0x4E, 0xD8), "light": (0x60, 0xA5, 0xFA)},
    "red": {"uniform": (0xE0, 0x3A, 0x3A), "dark": (0x7F, 0x1D, 0x1D), "helmet": (0xB9, 0x1C, 0x1C), "light": (0xF8, 0x71, 0x71)},
}


class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w * SS, h * SS
        self.px = [[(0, 0, 0, 0)] * self.w for _ in range(self.h)]

    def _put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = (c[0], c[1], c[2], 255)

    def circle(self, cx, cy, r, c):
        cx, cy, r = cx * SS, cy * SS, r * SS
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self._put(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c, top_only=False):
        cx, cy, rx, ry = cx * SS, cy * SS, rx * SS, ry * SS
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            if top_only and y + 0.5 > cy:
                continue
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self._put(x, y, c)

    def rrect(self, x0, y0, x1, y1, r, c):
        x0, y0, x1, y1, r = x0 * SS, y0 * SS, x1 * SS, y1 * SS, r * SS
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                px, py = x + 0.5, y + 0.5
                qx = max(x0 + r - px, 0, px - (x1 - r))
                qy = max(y0 + r - py, 0, py - (y1 - r))
                if qx * qx + qy * qy <= r * r:
                    self._put(x, y, c)

    def polygon(self, pts, c):
        pts = [(x * SS, y * SS) for x, y in pts]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 2):
            for x in range(int(min(xs)), int(max(xs)) + 2):
                if _inside(x + 0.5, y + 0.5, pts):
                    self._put(x, y, c)

    def rotated_rect(self, cx, cy, w, h, angle_deg, c):
        a = math.radians(angle_deg)
        ca, sa = math.cos(a), math.sin(a)
        pts = []
        for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
            pts.append((cx + dx * ca - dy * sa, cy + dx * sa + dy * ca))
        self.polygon(pts, c)

    def save(self, path):
        w, h = self.w // SS, self.h // SS
        raw = bytearray()
        for y in range(h):
            raw.append(0)
            for x in range(w):
                r = g = b = a = 0
                for dy in range(SS):
                    row = self.px[y * SS + dy]
                    for dx in range(SS):
                        p = row[x * SS + dx]
                        # premultiplied accumulate so edges don't fringe
                        r += p[0] * p[3]
                        g += p[1] * p[3]
                        b += p[2] * p[3]
                        a += p[3]
                n = SS * SS
                if a == 0:
                    raw += bytes((0, 0, 0, 0))
                else:
                    raw += bytes((r // a, g // a, b // a, a // n))
        with open(path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n")
            f.write(_chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)))
            f.write(_chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
            f.write(_chunk(b"IEND", b""))


def _chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def _inside(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def draw_soldier(c: Canvas, team: dict, front: bool):
    uni, dark, helmet, light = team["uniform"], team["dark"], team["helmet"], team["light"]
    cx = 32
    # boots + legs
    for side in (-1, 1):
        lx = cx + side * 7
        c.rrect(lx - 5, 56, lx + 5, 72, 3, dark)          # trousers
        c.rrect(lx - 6, 70, lx + 6, 78, 3, BOOT)          # boots
    # torso
    c.rrect(cx - 15, 36, cx + 15, 60, 6, uni)
    c.rrect(cx - 15, 54, cx + 15, 58, 1, dark)            # belt
    if front:
        c.rrect(cx - 6, 42, cx + 6, 50, 2, POUCH)         # chest pouch
        c.rotated_rect(cx, 47, 8, 30, 20, STRAP)          # rifle sling
    else:
        c.rrect(cx - 9, 38, cx + 9, 54, 3, POUCH)         # backpack
        c.rrect(cx - 12, 38, cx - 9, 54, 1, STRAP)
        c.rrect(cx + 9, 38, cx + 12, 54, 1, STRAP)
    # arms
    for side in (-1, 1):
        ax = cx + side * 17
        c.rrect(ax - 4, 38, ax + 4, 54, 4, uni)
        if front:
            c.circle(ax, 55, 4, SKIN)                     # hands
        else:
            c.circle(ax, 55, 4, SKIN_DARK)
    # rifle
    if front:
        c.rotated_rect(cx + 2, 50, 40, 5, -25, RIFLE)     # barrel/receiver across the chest
        c.rotated_rect(cx - 12, 57, 10, 7, -25, STOCK)    # stock
        c.rotated_rect(cx + 14, 44, 4, 8, -25, RIFLE_DARK)  # magazine
    else:
        c.rotated_rect(cx + 6, 40, 5, 42, -12, RIFLE)     # slung over the shoulder, barrel up
        c.rotated_rect(cx + 10, 58, 7, 10, -12, STOCK)
    # head
    if front:
        c.circle(cx, 24, 11, SKIN)
        c.circle(cx - 4, 26, 1.6, EYE)
        c.circle(cx + 4, 26, 1.6, EYE)
        c.rrect(cx - 3, 30, cx + 3, 31, 0.5, SKIN_DARK)   # mouth
    else:
        c.circle(cx, 24, 11, SKIN_DARK)                   # back of head / neck (shaded)
        c.rrect(cx - 4, 30, cx + 4, 36, 2, SKIN_DARK)     # neck
    # helmet
    c.ellipse(cx, 22, 14, 13, helmet, top_only=True)
    c.rrect(cx - 15, 20, cx + 15, 25, 2, helmet)          # brim
    c.rrect(cx - 15, 23, cx + 15, 25, 1, dark)            # brim shadow
    c.ellipse(cx - 4, 14, 5, 3, light)                    # highlight
    if front:
        c.rrect(cx - 11, 26, cx - 10, 32, 0.5, STRAP)     # chin strap
        c.rrect(cx + 10, 26, cx + 11, 32, 0.5, STRAP)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "crowdrush", "src", "main", "res", "drawable-nodpi")
    os.makedirs(out, exist_ok=True)
    for name, team in TEAMS.items():
        for view in ("front", "back"):
            c = Canvas(W, H)
            draw_soldier(c, team, front=(view == "front"))
            c.save(os.path.join(out, f"soldier_{name}_{view}.png"))
    print("wrote soldier sprites to", os.path.abspath(out))


if __name__ == "__main__":
    main()
