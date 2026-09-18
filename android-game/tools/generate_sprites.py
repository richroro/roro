#!/usr/bin/env python3
"""Draw the Crowd Rush soldier sprites with the standard library only (no external assets).

Each sprite is 96x120 RGBA with a dark outline, two-tone shading and two walk frames.
Outputs into crowdrush/src/main/res/drawable-nodpi/:
  soldier_<team>_<view>_<frame>.png   team = blue|red, view = front|back, frame = 0|1

Run:  python3 android-game/tools/generate_sprites.py [out_dir]
"""
from __future__ import annotations

import math
import os
import struct
import sys
import zlib

SS = 4
W, H = 96, 120

OUTLINE = (0x1B, 0x1F, 0x2E)
SKIN = (0xF6, 0xC9, 0x9A)
SKIN_SHADE = (0xD9, 0xA0, 0x6C)
EYE_WHITE = (0xFF, 0xFF, 0xFF)
EYE = (0x1F, 0x29, 0x37)
BROW = (0x4A, 0x2E, 0x1C)
MOUTH = (0xB9, 0x6B, 0x4F)
BOOT = (0x2B, 0x26, 0x24)
BOOT_SOLE = (0x15, 0x12, 0x11)
GLOVE = (0x3A, 0x33, 0x2E)
RIFLE = (0x4B, 0x55, 0x63)
RIFLE_DARK = (0x27, 0x2E, 0x3A)
RIFLE_LIGHT = (0x7B, 0x86, 0x96)
STOCK = (0x8B, 0x4A, 0x1C)
STRAP = (0x3F, 0x3A, 0x35)
PACK = (0x5E, 0x5A, 0x54)
PACK_LIGHT = (0x7A, 0x76, 0x6F)
BUCKLE = (0xD4, 0xAF, 0x37)

TEAMS = {
    "blue": {"uni": (0x2E, 0x6B, 0xE6), "uni_light": (0x5B, 0x91, 0xF5), "uni_dark": (0x1F, 0x46, 0xA3), "helmet": (0x1E, 0x4F, 0xC2), "helmet_light": (0x4C, 0x7F, 0xE8), "helmet_dark": (0x15, 0x36, 0x86)},
    "red": {"uni": (0xE0, 0x3E, 0x3E), "uni_light": (0xF0, 0x6F, 0x6F), "uni_dark": (0xA3, 0x25, 0x25), "helmet": (0xC0, 0x2B, 0x2B), "helmet_light": (0xE6, 0x5C, 0x5C), "helmet_dark": (0x82, 0x1B, 0x1B)},
}


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w * SS, h * SS
        self.px = [[(0, 0, 0, 0)] * self.w for _ in range(self.h)]

    def _put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = (c[0], c[1], c[2], 255)

    def circle(self, cx, cy, r, c, outline=0):
        if outline:
            self._circle(cx, cy, r + outline, OUTLINE)
        self._circle(cx, cy, r, c)

    def _circle(self, cx, cy, r, c):
        cx, cy, r = cx * SS, cy * SS, r * SS
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self._put(x, y, c)

    def ellipse(self, cx, cy, rx, ry, c, outline=0, top_only=False):
        if outline:
            self._ellipse(cx, cy, rx + outline, ry + outline, OUTLINE, top_only)
        self._ellipse(cx, cy, rx, ry, c, top_only)

    def _ellipse(self, cx, cy, rx, ry, c, top_only):
        cx, cy, rx, ry = cx * SS, cy * SS, rx * SS, ry * SS
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            if top_only and y + 0.5 > cy:
                continue
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self._put(x, y, c)

    def rrect(self, x0, y0, x1, y1, r, c, outline=0):
        if outline:
            self._rrect(x0 - outline, y0 - outline, x1 + outline, y1 + outline, r + outline, OUTLINE)
        self._rrect(x0, y0, x1, y1, r, c)

    def _rrect(self, x0, y0, x1, y1, r, c):
        x0, y0, x1, y1, r = x0 * SS, y0 * SS, x1 * SS, y1 * SS, r * SS
        r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
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

    def rot_rect(self, cx, cy, w, h, angle_deg, c, outline=0, radius=0):
        if outline:
            self._rot_rect(cx, cy, w + 2 * outline, h + 2 * outline, angle_deg, OUTLINE)
        self._rot_rect(cx, cy, w, h, angle_deg, c)

    def _rot_rect(self, cx, cy, w, h, angle_deg, c):
        a = math.radians(angle_deg)
        ca, sa = math.cos(a), math.sin(a)
        pts = [(cx + dx * ca - dy * sa, cy + dx * sa + dy * ca) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
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
                        r += p[0] * p[3]
                        g += p[1] * p[3]
                        b += p[2] * p[3]
                        a += p[3]
                n = SS * SS
                raw += bytes((0, 0, 0, 0)) if a == 0 else bytes((r // a, g // a, b // a, a // n))
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


def draw_soldier(c: Canvas, t: dict, front: bool, frame: int):
    O = 1.6  # outline width
    cx = 48
    step = 4 if frame == 1 else 0  # walk cycle: one leg forward, one back

    # ---- legs & boots (drawn first so the torso overlaps the hips)
    for i, side in enumerate((-1, 1)):
        lx = cx + side * 9
        dy = -step if i == 0 else step
        c.rrect(lx - 6, 78 + dy * 0.5, lx + 6, 100 + dy, 4, t["uni_dark"], outline=O)
        c.rrect(lx - 6, 78 + dy * 0.5, lx - 1, 92 + dy, 3, t["uni"])            # lit side of the leg
        c.rrect(lx - 7, 98 + dy, lx + 7, 110 + dy, 4, BOOT, outline=O)          # boot
        c.rrect(lx - 7, 106 + dy, lx + 7, 110 + dy, 2, BOOT_SOLE)               # sole

    # ---- torso
    c.rrect(cx - 19, 50, cx + 19, 84, 8, t["uni"], outline=O)
    c.rrect(cx - 19, 50, cx - 7, 84, 8, t["uni_light"])                          # lit panel
    c.rrect(cx - 19, 74, cx + 19, 79, 1, STRAP)                                  # belt
    c.rrect(cx - 4, 73, cx + 4, 80, 1.5, BUCKLE, outline=1)                      # buckle
    for side in (-1, 1):                                                         # shoulder pads
        c.rrect(cx + side * 22 - 7, 48, cx + side * 22 + 7, 58, 4, t["uni_dark"], outline=O)
    if front:
        c.rrect(cx - 15, 56, cx - 5, 66, 2, t["uni_dark"], outline=1)            # chest pockets
        c.rrect(cx + 5, 56, cx + 15, 66, 2, t["uni_dark"], outline=1)
        c.rot_rect(cx, 66, 7, 40, 22, STRAP, outline=1)                          # sling
    else:
        c.rrect(cx - 13, 52, cx + 13, 76, 5, PACK, outline=O)                    # backpack
        c.rrect(cx - 13, 52, cx - 5, 76, 5, PACK_LIGHT)
        c.rrect(cx - 11, 60, cx + 11, 63, 1, STRAP)
        c.rrect(cx - 17, 50, cx - 13, 78, 1.5, STRAP, outline=1)                 # straps
        c.rrect(cx + 13, 50, cx + 17, 78, 1.5, STRAP, outline=1)

    # ---- arms (sleeves + gloves)
    for side in (-1, 1):
        ax = cx + side * 24
        c.rrect(ax - 5, 54, ax + 5, 78, 5, t["uni"], outline=O)
        c.rrect(ax - 5, 54, ax - 1, 72, 4, t["uni_light"])
        c.circle(ax, 80, 5, GLOVE if not front else SKIN, outline=O)

    # ---- rifle
    if front:
        c.rot_rect(cx + 2, 72, 48, 6, -22, RIFLE, outline=O)                     # receiver
        c.rot_rect(cx + 20, 65, 18, 3, -22, RIFLE_LIGHT)                         # barrel highlight
        c.rot_rect(cx - 16, 80, 12, 9, -22, STOCK, outline=O)                    # stock
        c.rot_rect(cx + 8, 80, 5, 11, -22, RIFLE_DARK, outline=1)                # magazine
        c.rot_rect(cx - 3, 79, 4, 7, -22, RIFLE_DARK, outline=1)                 # grip
        c.circle(cx + 12, 68, 4.5, SKIN, outline=O)                              # forward hand
        c.circle(cx - 8, 77, 4.5, SKIN, outline=O)                               # trigger hand
    else:
        c.rot_rect(cx + 10, 60, 6, 56, -10, RIFLE, outline=O)                    # slung on the back
        c.rot_rect(cx + 6, 38, 3, 14, -10, RIFLE_LIGHT)
        c.rot_rect(cx + 14, 84, 9, 12, -10, STOCK, outline=O)

    # ---- head
    c.rrect(cx - 5, 40, cx + 5, 52, 3, SKIN_SHADE, outline=O)                    # neck
    if front:
        c.circle(cx, 32, 15, SKIN, outline=O)
        c.ellipse(cx, 41, 11, 5, SKIN_SHADE)                                     # chin shade
        for side in (-1, 1):                                                     # ears
            c.circle(cx + side * 15, 33, 3.5, SKIN, outline=O)
        for side in (-1, 1):                                                     # eyes
            c.ellipse(cx + side * 6, 33, 3.5, 4, EYE_WHITE, outline=1)
            c.circle(cx + side * 6 + 0.6, 34, 2, EYE)
            c.circle(cx + side * 6 + 1.4, 33, 0.8, EYE_WHITE)
            c.rrect(cx + side * 6 - 4, 27.5, cx + side * 6 + 4, 29.5, 1, BROW)  # brows
        c.rrect(cx - 4, 41, cx + 4, 43, 1, MOUTH)                                # mouth
    else:
        c.circle(cx, 32, 15, SKIN_SHADE, outline=O)
        c.ellipse(cx, 30, 13, 11, SKIN)                                          # lit crown
        for side in (-1, 1):
            c.circle(cx + side * 15, 33, 3.5, SKIN_SHADE, outline=O)

    # ---- helmet
    c.ellipse(cx, 28, 20, 18, t["helmet"], outline=O, top_only=True)
    c.ellipse(cx - 6, 20, 9, 6, t["helmet_light"])                               # highlight
    c.rrect(cx - 21, 25, cx + 21, 31, 3, t["helmet"], outline=O)                 # brim
    c.rrect(cx - 21, 29, cx + 21, 31, 1, t["helmet_dark"])                       # brim shadow
    c.rrect(cx - 21, 22, cx + 21, 25, 1, t["helmet_dark"])                       # band
    if front:
        c.rrect(cx - 16, 31, cx - 14, 42, 0.5, STRAP)                            # chin straps
        c.rrect(cx + 14, 31, cx + 16, 42, 0.5, STRAP)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "crowdrush", "src", "main", "res", "drawable-nodpi")
    os.makedirs(out, exist_ok=True)
    # remove the old single-frame sprites if present
    for old in ("soldier_blue_back.png", "soldier_blue_front.png", "soldier_red_front.png", "soldier_red_back.png"):
        try:
            os.remove(os.path.join(out, old))
        except OSError:
            pass
    for name, team in TEAMS.items():
        for view in ("front", "back"):
            for frame in (0, 1):
                c = Canvas(W, H)
                draw_soldier(c, team, front=(view == "front"), frame=frame)
                c.save(os.path.join(out, f"soldier_{name}_{view}_{frame}.png"))
    print("wrote soldier sprites to", os.path.abspath(out))


if __name__ == "__main__":
    main()
