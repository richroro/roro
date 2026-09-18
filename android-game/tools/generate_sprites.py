#!/usr/bin/env python3
"""Draw every Villain Rush character with the standard library only (no external assets).

All characters share one chibi human build (big head, short limbs) so they read at small sizes,
and every sprite has two walk frames. Outputs into crowdrush/src/main/res/drawable-nodpi/:

  ally_back_<frame>.png     your colleagues, seen from behind (96x120)
  mob_<stage>_<frame>.png   the small stuff you shoot on the way (96x120)
  boss_<stage>_<frame>.png  the villain waiting at the end of the stage (160x200)

Stages: 0 the boss at the office, 1 the classmate who married rich,
        2 the aunt who never stops asking, 3 the neighbour upstairs.

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
BW, BH = 160, 200

OUTLINE = (0x23, 0x25, 0x2E)
SKIN = (0xF6, 0xCB, 0xA2)
SKIN_SHADE = (0xDC, 0xA6, 0x76)
SKIN_DEEP = (0xC2, 0x88, 0x5C)
WHITE = (0xFF, 0xFF, 0xFF)
EYE = (0x24, 0x28, 0x33)
BLUSH = (0xF2, 0x9A, 0x8F)
HAIR_BLACK = (0x2A, 0x26, 0x2A)
HAIR_BLACK_L = (0x46, 0x40, 0x48)
HAIR_BROWN = (0x6B, 0x46, 0x2B)
HAIR_BROWN_L = (0x8C, 0x60, 0x3C)
SHOE = (0x2B, 0x28, 0x2E)
SHOE_SOLE = (0x16, 0x14, 0x18)

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



# ---------------------------------------------------------------- shared chibi human
# Unit space: x is measured from the character's centre, y from the top of the canvas.
# head centre (0, 30) r 16 · torso 50..86 · legs 84..108 · shoes to 116


class Pen:
    """Draws into a Canvas in unit space, scaled and centred."""

    def __init__(self, c: "Canvas", cx: float, sc: float):
        self.c, self.cx, self.sc = c, cx, sc

    def _x(self, x):
        return self.cx + x * self.sc

    def _y(self, y):
        return y * self.sc

    def rr(self, x0, y0, x1, y1, r, col, o=0):
        self.c.rrect(self._x(x0), self._y(y0), self._x(x1), self._y(y1), r * self.sc, col, o * self.sc)

    def ci(self, x, y, r, col, o=0):
        self.c.circle(self._x(x), self._y(y), r * self.sc, col, o * self.sc)

    def el(self, x, y, rx, ry, col, o=0, top_only=False):
        self.c.ellipse(self._x(x), self._y(y), rx * self.sc, ry * self.sc, col, o * self.sc, top_only)

    def po(self, pts, col):
        self.c.polygon([(self._x(x), self._y(y)) for x, y in pts], col)

    def po_out(self, pts, col, o=1.6):
        self.po([(x + o * (1 if x >= 0 else -1) * 0.6, y + o * 0.6) for x, y in pts], OUTLINE)
        self.po(pts, col)

    def rot(self, x, y, w, h, ang, col, o=0):
        self.c.rot_rect(self._x(x), self._y(y), w * self.sc, h * self.sc, ang, col, o * self.sc)


def legs(p: Pen, frame: int, pants, pants_dark, shoe=SHOE, bare=False, shorts=False, O=1.6):
    """Two legs with a walk cycle; frame 0 lifts the left leg, frame 1 the right."""
    for i, side in enumerate((-1, 1)):
        lx = side * 9
        lift = 5 if i == frame else 0
        top = 72 if shorts else 84
        p.rr(lx - 7, top - lift * 0.3, lx + 7, 106 - lift, 4, pants_dark, o=O)
        p.rr(lx - 7, top - lift * 0.3, lx - 2, 100 - lift, 3, pants)
        if shorts or bare:
            p.rr(lx - 6, 88 - lift * 0.6, lx + 6, 106 - lift, 4, SKIN, o=O)
            p.rr(lx - 6, 88 - lift * 0.6, lx - 2, 102 - lift, 3, SKIN_SHADE)
        p.rr(lx - 8, 104 - lift, lx + 8, 116 - lift, 4, shoe, o=O)
        p.rr(lx - 8, 112 - lift, lx + 8, 116 - lift, 2, SHOE_SOLE)


def arms(p: Pen, frame: int, sleeve, sleeve_light, short_sleeve=False, O=1.6, hand_y=82):
    swing = 4 if frame == 1 else -4
    for side in (-1, 1):
        ax = side * 25
        dy = swing * side
        p.rr(ax - 5, 54 + dy, ax + 5, 78 + dy, 5, sleeve, o=O)
        p.rr(ax - 5, 54 + dy, ax - 1, 72 + dy, 4, sleeve_light)
        if short_sleeve:
            p.rr(ax - 5, 64 + dy, ax + 5, 78 + dy, 5, SKIN, o=O)
        p.ci(ax, hand_y + dy, 5, SKIN, o=O)
    return swing


def torso(p: Pen, shirt, shirt_light, shirt_dark, belly=False, O=1.6):
    if belly:
        p.el(0, 70, 24, 22, shirt, o=O)
        p.rr(-22, 50, 22, 74, 8, shirt, o=O)
        p.el(2, 76, 20, 14, shirt_light)
    else:
        p.rr(-20, 50, 20, 86, 8, shirt, o=O)
        p.rr(-20, 50, -8, 86, 8, shirt_light)
    p.rr(-20, 82, 20, 88, 2, shirt_dark)


def head(p: Pen, O=1.6, shade=True):
    p.rr(-5, 42, 5, 52, 3, SKIN_SHADE, o=O)          # neck
    p.ci(0, 30, 16, SKIN, o=O)
    if shade:
        p.el(0, 39, 11, 5, SKIN_SHADE)
    for side in (-1, 1):
        p.ci(side * 16, 32, 3.6, SKIN, o=O)          # ears


def eyes(p: Pen, mood="plain", glasses=None, shut=False):
    for side in (-1, 1):
        ex = side * 6.5
        if shut:
            p.rr(ex - 4, 31, ex + 4, 33, 1, EYE)
        else:
            p.el(ex, 31, 3.6, 4.2, WHITE, o=1.1)
            p.ci(ex + side * 0.4, 32, 2.1, EYE)
            p.ci(ex + side * 0.4 + 0.9, 31, 0.8, WHITE)
        if mood == "angry":
            p.rot(ex, 25, 10, 3, side * -20, HAIR_BLACK)
        elif mood == "smug":
            p.rot(ex, 24.5, 9, 2.4, side * -10, HAIR_BLACK)
        elif mood == "nag":
            p.rot(ex, 25, 9, 2.6, side * 16, HAIR_BROWN)
        else:
            p.rot(ex, 25, 9, 2.4, side * 6, HAIR_BLACK)
    if glasses:
        for side in (-1, 1):
            p.ci(side * 6.5, 31, 7.2, glasses)
            p.ci(side * 6.5, 31, 5.8, (0xE9, 0xF4, 0xFF))
            p.ci(side * 6.5 - 2, 28.5, 2, WHITE)
            if not shut:
                p.ci(side * 6.5 + 0.4, 32, 2.1, EYE)
        p.rr(-2.5, 30, 2.5, 32, 1, glasses)


def mouth(p: Pen, style="line"):
    if style == "shout":
        p.rr(-7, 37, 7, 45, 3, (0x6B, 0x21, 0x21), o=1.2)
        p.el(0, 44, 4.5, 2, (0xE0, 0x6B, 0x7A))
        p.rr(-6, 37.4, 6, 39, 0.6, WHITE)
    elif style == "smirk":
        p.rot(2, 40, 9, 2, 12, (0x9B, 0x53, 0x4A))
    elif style == "grin":
        p.rr(-6, 38, 6, 43, 2.4, (0x6B, 0x21, 0x21), o=1.2)
        p.rr(-5.4, 38.4, 5.4, 40, 0.6, WHITE)
    else:
        p.rr(-4, 40, 4, 41.6, 0.8, (0x9B, 0x53, 0x4A))


# ---------------------------------------------------------------- hair styles


def hair_short(p: Pen, col=HAIR_BLACK, light=HAIR_BLACK_L, O=1.6):
    p.el(0, 24, 17, 14, col, o=O, top_only=True)
    p.rr(-17, 22, 17, 27, 2, col)
    p.el(-6, 18, 7, 4, light)


def hair_bald(p: Pen, col=HAIR_BLACK, O=1.6):
    """The classic comb-over: bare crown, hair hanging on at the sides."""
    p.el(-4, 18, 7, 4, (0xFF, 0xE2, 0xC2))          # shine on the scalp
    for side in (-1, 1):
        p.el(side * 13, 28, 6, 9, col, o=O)
        p.rr(side * 17 - 3, 24, side * 17 + 3, 36, 2, col, o=O)
    p.rot(-2, 21, 18, 3.4, -8, col)                  # the strand combed across


def hair_slick(p: Pen, col=HAIR_BLACK, light=HAIR_BLACK_L, O=1.6):
    p.el(0, 23, 17, 14, col, o=O, top_only=True)
    p.rr(-17, 21, 17, 26, 2, col)
    for k in range(4):
        p.rot(-11 + k * 7, 19 + k * 0.6, 3, 13, 24, light)
    p.po_out([(14, 16), (24, 10), (17, 24)], col)    # a flick at the back


def hair_perm(p: Pen, col=HAIR_BROWN, light=HAIR_BROWN_L, O=1.6):
    for k in range(11):
        ang = math.pi + k * (math.pi / 10)
        p.ci(math.cos(ang) * 19, 30 + math.sin(ang) * 17, 6, col, o=1.3)
        p.ci(math.cos(ang) * 19 - 1.4, 30 + math.sin(ang) * 17 - 1.4, 2.6, light)


def hair_messy(p: Pen, col=HAIR_BLACK, light=HAIR_BLACK_L, O=1.6):
    p.el(0, 24, 17, 13, col, o=O, top_only=True)
    p.rr(-17, 22, 17, 27, 2, col)
    for k in range(6):
        x = -14 + k * 5.6
        p.po_out([(x - 3, 20), (x + 1, 6 + (k % 3) * 3), (x + 3, 20)], col, o=1.2)
    p.el(-6, 19, 6, 3, light)


# ---------------------------------------------------------------- the crew (ally)

SHIRT_W = (0xF2, 0xF5, 0xFA)
SHIRT_W_L = (0xFF, 0xFF, 0xFF)
SHIRT_W_D = (0xC9, 0xD2, 0xE0)
PANTS_NAVY = (0x2F, 0x3B, 0x5C)
PANTS_NAVY_D = (0x1E, 0x27, 0x40)
BAG = (0x5A, 0x3E, 0x28)
BAG_D = (0x3C, 0x28, 0x18)
LANYARD = (0x1F, 0x2A, 0x44)


def draw_ally(c: "Canvas", frame: int):
    """A colleague seen from behind: white shirt, navy trousers, satchel."""
    p = Pen(c, W / 2, 1.0)
    O = 1.6
    legs(p, frame, PANTS_NAVY, PANTS_NAVY_D, O=O)
    torso(p, SHIRT_W, SHIRT_W_L, SHIRT_W_D, O=O)
    p.rr(-14, 52, 14, 80, 5, BAG, o=O)               # satchel on the back
    p.rr(-14, 52, -6, 80, 5, (0x6E, 0x4E, 0x33))
    p.rr(-14, 64, 14, 67, 1, BAG_D)
    p.ci(0, 66, 3, (0xD4, 0xAF, 0x37), o=1)
    for side in (-1, 1):
        p.rr(side * 16 - 2, 50, side * 16 + 2, 78, 1.5, BAG_D, o=1)
    arms(p, frame, SHIRT_W, SHIRT_W_L, O=O)
    p.rr(-5, 42, 5, 52, 3, SKIN_SHADE, o=O)
    p.ci(0, 30, 16, SKIN_SHADE, o=O)                 # back of the head
    for side in (-1, 1):
        p.ci(side * 16, 32, 3.6, SKIN_SHADE, o=O)
    hair_short(p, O=O)
    p.el(0, 32, 15, 11, HAIR_BLACK)                  # hair covers the back of the head


# ---------------------------------------------------------------- the small stuff (mobs)


def mob_paper(c: "Canvas", frame: int):
    """Stage 1 — a stack of 'urgent' meeting papers with legs."""
    p = Pen(c, W / 2, 1.0)
    O = 1.6
    bob = -2 if frame == 1 else 0
    for i, side in enumerate((-1, 1)):
        lx = side * 8
        lift = 4 if i == frame else 0
        p.rr(lx - 4, 86 + bob, lx + 4, 104 - lift, 2, (0xE8, 0xC9, 0x9A), o=O)
        p.rr(lx - 6, 102 - lift, lx + 6, 112 - lift, 3, SHOE, o=O)
    for k in range(3):                                # stacked sheets
        p.rr(-24 + k * 1.5, 30 + k * 6 + bob, 24 - k * 1.5, 92 + bob, 3, (0xF7, 0xF8, 0xFB) if k == 2 else (0xDC, 0xE2, 0xEC), o=O)
    p.rr(-18, 44 + bob, 18, 47 + bob, 1, (0xB6, 0xC0, 0xD0))
    p.rr(-18, 52 + bob, 10, 55 + bob, 1, (0xB6, 0xC0, 0xD0))
    p.rr(-18, 60 + bob, 14, 63 + bob, 1, (0xB6, 0xC0, 0xD0))
    p.rot(12, 70 + bob, 26, 26, -14, (0xD9, 0x2E, 0x3E))    # 'urgent' stamp
    p.rot(12, 70 + bob, 20, 20, -14, (0xF7, 0xF8, 0xFB))
    p.rot(12, 70 + bob, 14, 5, -14, (0xD9, 0x2E, 0x3E))
    for side in (-1, 1):                              # eyes on the top sheet
        p.el(side * 8, 36 + bob, 4, 4.6, WHITE, o=1.1)
        p.ci(side * 8, 37 + bob, 2.2, EYE)
    p.rr(-4, 44 + bob, 4, 46 + bob, 1, (0x9B, 0x53, 0x4A))


def mob_brag(c: "Canvas", frame: int):
    """Stage 2 — a designer shopping bag, sparkling, with a car key hanging off it."""
    p = Pen(c, W / 2, 1.0)
    O = 1.6
    bob = -2 if frame == 1 else 0
    for i, side in enumerate((-1, 1)):
        lx = side * 8
        lift = 4 if i == frame else 0
        p.rr(lx - 4, 88 + bob, lx + 4, 104 - lift, 2, (0x3A, 0x33, 0x2E), o=O)
        p.rr(lx - 6, 102 - lift, lx + 6, 112 - lift, 3, SHOE, o=O)
    p.rr(-22, 38 + bob, 22, 92 + bob, 4, (0x1F, 0x1B, 0x24), o=O)
    p.rr(-22, 38 + bob, -10, 92 + bob, 4, (0x33, 0x2C, 0x3C))
    for side in (-1, 1):                              # handles
        p.rot(side * 10, 30 + bob, 4, 18, side * 14, (0xD4, 0xAF, 0x37), o=1.2)
    p.rr(-15, 58 + bob, 15, 72 + bob, 2, (0xD4, 0xAF, 0x37))     # gold label
    p.rr(-11, 62 + bob, 11, 68 + bob, 1, (0x1F, 0x1B, 0x24))
    for side in (-1, 1):
        p.el(side * 8, 46 + bob, 4, 4.6, WHITE, o=1.1)
        p.ci(side * 8, 47 + bob, 2.2, EYE)
    p.rot(2, 52 + bob, 8, 2, 12, (0xE8, 0xD0, 0xA0))
    for (sx_, sy, sr) in ((-26, 30, 5), (24, 44, 4), (18, 24, 3)):   # sparkles
        p.po([(sx_, sy - sr + bob), (sx_ + sr * 0.35, sy - sr * 0.35 + bob), (sx_ + sr, sy + bob),
              (sx_ + sr * 0.35, sy + sr * 0.35 + bob), (sx_, sy + sr + bob),
              (sx_ - sr * 0.35, sy + sr * 0.35 + bob), (sx_ - sr, sy + bob), (sx_ - sr * 0.35, sy - sr * 0.35 + bob)],
             (0xFF, 0xE9, 0x8A))


def mob_nag(c: "Canvas", frame: int):
    """Stage 3 — a speech bubble that will not stop talking."""
    p = Pen(c, W / 2, 1.0)
    O = 1.6
    bob = -2 if frame == 1 else 0
    for i, side in enumerate((-1, 1)):
        lx = side * 8
        lift = 4 if i == frame else 0
        p.rr(lx - 4, 86 + bob, lx + 4, 104 - lift, 2, (0xC8, 0xB4, 0xE8), o=O)
        p.rr(lx - 6, 102 - lift, lx + 6, 112 - lift, 3, SHOE, o=O)
    p.rr(-26, 26 + bob, 26, 76 + bob, 12, (0xFB, 0xF7, 0xFF), o=O)
    p.po_out([(-12, 72 + bob), (2, 72 + bob), (-6, 92 + bob)], (0xFB, 0xF7, 0xFF), o=O)
    p.rr(-26, 66 + bob, 26, 76 + bob, 12, (0xE6, 0xDC, 0xF5))
    for side in (-1, 1):
        p.el(side * 9, 42 + bob, 4.4, 5, WHITE, o=1.1)
        p.ci(side * 9, 43 + bob, 2.4, EYE)
        p.rot(side * 9, 34 + bob, 10, 2.6, side * 18, HAIR_BROWN)
    p.rr(-7, 52 + bob, 7, 62 + bob, 3, (0x6B, 0x21, 0x21), o=1.2)
    p.rr(-6, 52.6 + bob, 6, 54 + bob, 0.6, WHITE)
    p.el(0, 60 + bob, 4, 2, (0xE0, 0x6B, 0x7A))
    for k in range(3):                                 # trailing dots
        p.ci(-30 - k * 0, 18 + bob - k * 0, 0, WHITE)


def mob_thump(c: "Canvas", frame: int):
    """Stage 4 — a basketball bouncing on your ceiling."""
    p = Pen(c, W / 2, 1.0)
    O = 1.6
    drop = 8 if frame == 1 else 0
    cy = 56 + drop
    p.el(0, 104, 22, 6, (0x00, 0x00, 0x00, 0))
    for k in range(3):                                 # impact rings
        p.el(0, 100 + k * 4, 24 - k * 6, 5 - k, (0xFF, 0xE9, 0x8A) if k == 0 else (0xF7, 0xD6, 0x6B))
    p.ci(0, cy, 30, (0xE3, 0x72, 0x22), o=O)
    p.el(-10, cy - 12, 10, 6, (0xF2, 0x96, 0x44))
    p.rr(-30, cy - 2, 30, cy + 2, 1, (0x7A, 0x33, 0x0C))
    p.rot(0, cy, 4, 60, 90, (0x7A, 0x33, 0x0C))
    p.po([(-26, cy - 16), (-12, cy), (-26, cy + 16), (-30, cy)], (0x7A, 0x33, 0x0C))
    p.po([(26, cy - 16), (12, cy), (26, cy + 16), (30, cy)], (0x7A, 0x33, 0x0C))
    for side in (-1, 1):
        p.el(side * 9, cy - 6, 5, 5.6, WHITE, o=1.2)
        p.ci(side * 9, cy - 5, 2.6, EYE)
    p.rr(-7, cy + 6, 7, cy + 14, 3, (0x6B, 0x21, 0x21), o=1.2)
    p.rr(-6, cy + 6.6, 6, cy + 8, 0.6, WHITE)


# ---------------------------------------------------------------- the villains (bosses)

BOSS_SC = 1.55


def boss_pen(c: "Canvas") -> Pen:
    return Pen(c, BW / 2, BOSS_SC)


def draw_boss_manager(c: "Canvas", frame: int):
    """Stage 1 — the department head who says your idea was his."""
    p = boss_pen(c)
    O = 1.5
    shirt, shirt_l, shirt_d = (0xEDF2F9 >> 16 & 255, 0xEDF2F9 >> 8 & 255, 0xEDF2F9 & 255), WHITE, (0xC2, 0xCC, 0xDB)
    legs(p, frame, (0x3A, 0x3F, 0x52), (0x25, 0x29, 0x38), O=O)
    torso(p, shirt, shirt_l, (0x3A, 0x3F, 0x52), belly=True, O=O)
    p.rr(-22, 80, 22, 88, 2, (0x3A, 0x2A, 0x1C))            # belt
    p.rr(-5, 79, 5, 89, 1.5, (0xD4, 0xAF, 0x37), o=1)
    swing = arms(p, frame, shirt, shirt_l, short_sleeve=True, O=O)
    p.rot(30, 62 - swing, 7, 40, 18, (0x8A, 0x6B, 0x3A), o=O)   # golf club
    p.rot(37, 42 - swing, 13, 9, 18, (0x5E, 0x63, 0x70), o=O)
    p.po_out([(-9, 50), (9, 50), (5, 58), (-5, 58)], (0xC0, 0x1E, 0x2E), o=1.2)   # tie knot
    p.po_out([(-6, 58), (6, 58), (4, 84), (0, 90), (-4, 84)], (0xD6, 0x2E, 0x3E), o=1.2)
    p.rot(-3, 68, 4, 24, 0, (0xE8, 0x5C, 0x66))
    for side in (-1, 1):                                       # lanyard
        p.rot(side * 12, 58, 3, 22, side * 12, LANYARD)
    p.rr(-8, 68, 8, 80, 1.5, (0xF1, 0xF5, 0xF9), o=1.2)
    p.rr(-6, 71, 6, 73, 0.4, (0x94, 0xA3, 0xB8))
    head(p, O=O)
    hair_bald(p, O=O)
    eyes(p, mood="angry")
    mouth(p, "shout")
    p.rot(0, 36, 12, 3, 0, HAIR_BLACK)                         # moustache


def draw_boss_rich(c: "Canvas", frame: int):
    """Stage 2 — the classmate who married into money."""
    p = boss_pen(c)
    O = 1.5
    suit, suit_l, suit_d = (0x2A, 0x2E, 0x3E), (0x3D, 0x43, 0x58), (0x1A, 0x1D, 0x28)
    legs(p, frame, suit, suit_d, shoe=(0x4A, 0x33, 0x1E), O=O)
    p.rr(-20, 50, 20, 86, 8, WHITE, o=O)                       # dress shirt
    p.rr(-20, 50, 20, 86, 8, WHITE)
    torso(p, suit, suit_l, suit_d, O=O)
    p.po([(-20, 50), (0, 52), (20, 50), (20, 58), (0, 86), (-20, 58)], WHITE)   # open jacket
    p.po_out([(-9, 50), (0, 70), (9, 50)], WHITE, o=1.2)
    for k in range(7):                                         # gold chain
        p.ci(-16 + k * 5.4, 58 + abs(k - 3) * 2, 3, (0xF5, 0xD0, 0x4A), o=1.1)
    swing = arms(p, frame, suit, suit_l, O=O)
    p.rr(20, 74 + swing, 32, 80 + swing, 2, (0xF5, 0xD0, 0x4A), o=1.2)     # gold watch
    p.ci(26, 77 + swing, 5, (0xFF, 0xF2, 0xB0), o=1.2)
    p.rr(-34, 78 - swing, -22, 86 - swing, 2, (0x1F, 0x1B, 0x24), o=1.2)   # car key fob
    p.ci(-28, 82 - swing, 2, (0xD9, 0x2E, 0x3E))
    p.rot(-22, 80 - swing, 8, 2, 30, (0xC9, 0xB8, 0x7A))
    head(p, O=O)
    hair_slick(p, O=O)
    p.rr(-17, 28, 17, 34, 3, (0x1F, 0x23, 0x2E), o=O)          # sunglasses
    p.el(-8, 31, 7, 5, (0x3A, 0x44, 0x5C))
    p.el(8, 31, 7, 5, (0x3A, 0x44, 0x5C))
    p.el(-10, 29.5, 3, 1.6, (0x9C, 0xB6, 0xCF))
    mouth(p, "smirk")
    for (sx_, sy, sr) in ((-30, 22, 5), (30, 16, 4)):          # sparkles
        p.po([(sx_, sy - sr), (sx_ + sr * 0.35, sy - sr * 0.35), (sx_ + sr, sy),
              (sx_ + sr * 0.35, sy + sr * 0.35), (sx_, sy + sr),
              (sx_ - sr * 0.35, sy + sr * 0.35), (sx_ - sr, sy), (sx_ - sr * 0.35, sy - sr * 0.35)],
             (0xFF, 0xE9, 0x8A))


def draw_boss_aunt(c: "Canvas", frame: int):
    """Stage 3 — the aunt with the same question for thirty years."""
    p = boss_pen(c)
    O = 1.5
    blouse, blouse_l, blouse_d = (0xE0, 0x6B, 0x8A), (0xF0, 0x91, 0xA8), (0xB4, 0x4C, 0x68)
    legs(p, frame, (0x6B, 0x52, 0x7A), (0x4C, 0x38, 0x58), O=O)
    torso(p, blouse, blouse_l, blouse_d, belly=True, O=O)
    for (fx, fy) in ((-14, 58), (6, 54), (12, 72), (-8, 76), (0, 64)):     # flower print
        for k in range(5):
            ang = k * (2 * math.pi / 5)
            p.ci(fx + math.cos(ang) * 3.2, fy + math.sin(ang) * 3.2, 2, (0xFF, 0xD9, 0xE4))
        p.ci(fx, fy, 1.6, (0xFF, 0xF2, 0xB0))
    p.po_out([(-12, 52), (12, 52), (16, 88), (-16, 88)], (0xF5, 0xF0, 0xE4), o=1.2)   # apron
    p.rr(-16, 74, 16, 78, 1, (0xD9, 0xD0, 0xBE))
    for side in (-1, 1):
        p.rot(side * 9, 50, 3, 12, side * 10, (0xF5, 0xF0, 0xE4))
    swing = arms(p, frame, blouse, blouse_l, short_sleeve=True, O=O)
    p.rot(30, 62 - swing, 5, 34, 14, (0xB8, 0xBE, 0xC8), o=O)             # ladle
    p.ci(36, 44 - swing, 9, (0xCED4DE >> 16 & 255, 0xCED4DE >> 8 & 255, 0xCED4DE & 255), o=O)
    p.ci(36, 44 - swing, 6, (0x9AA3B0 >> 16 & 255, 0x9AA3B0 >> 8 & 255, 0x9AA3B0 & 255))
    head(p, O=O)
    hair_perm(p, O=O)
    eyes(p, mood="nag", glasses=(0x3A, 0x33, 0x2E))
    mouth(p, "shout")


def draw_boss_neighbour(c: "Canvas", frame: int):
    """Stage 4 — the upstairs neighbour, dribbling at 11 p.m."""
    p = boss_pen(c)
    O = 1.5
    vest, vest_l, vest_d = (0xF2, 0xF4, 0xF8), WHITE, (0xC6, 0xCD, 0xDA)
    legs(p, frame, (0x3E, 0x6B, 0x4A), (0x2A, 0x4C, 0x33), shoe=(0x5C, 0x63, 0x72), shorts=True, O=O)
    p.rr(-20, 50, 20, 76, 8, vest, o=O)                        # tank top
    p.rr(-20, 50, -8, 76, 8, vest_l)
    for side in (-1, 1):
        p.rr(side * 12 - 4, 46, side * 12 + 4, 56, 3, vest, o=O)
    p.rr(-20, 72, 20, 78, 2, vest_d)
    p.rr(-22, 74, 22, 84, 4, (0x3E, 0x6B, 0x4A), o=O)          # gym shorts
    swing = arms(p, frame, SKIN, SKIN_SHADE, O=O, hand_y=80)
    bx = 32
    by = 70 + (10 if frame == 1 else -6)
    p.ci(bx, by, 14, (0xE3, 0x72, 0x22), o=O)                  # basketball
    p.rot(bx, by, 2.4, 28, 90, (0x7A, 0x33, 0x0C))
    p.rot(bx, by, 28, 2.4, 0, (0x7A, 0x33, 0x0C))
    p.el(bx - 5, by - 6, 5, 3, (0xF2, 0x96, 0x44))
    for k in range(3):                                          # noise marks
        p.po([(-34 - k * 3, 40 + k * 8), (-26 - k * 3, 44 + k * 8), (-34 - k * 3, 48 + k * 8)], (0xFF, 0xE9, 0x8A))
    head(p, O=O)
    hair_messy(p, O=O)
    eyes(p, mood="plain")
    mouth(p, "grin")
    for side in (-1, 1):
        p.el(side * 11, 36, 3.6, 2.2, BLUSH)


MOBS = [mob_paper, mob_brag, mob_nag, mob_thump]
BOSSES = [draw_boss_manager, draw_boss_rich, draw_boss_aunt, draw_boss_neighbour]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "crowdrush", "src", "main", "res", "drawable-nodpi")
    os.makedirs(out, exist_ok=True)
    for old in os.listdir(out):
        if old.startswith(("soldier_", "ranger_", "goblin_", "monster")):
            os.remove(os.path.join(out, old))
    for frame in (0, 1):
        c = Canvas(W, H)
        draw_ally(c, frame)
        c.save(os.path.join(out, f"ally_back_{frame}.png"))
        for stage, fn in enumerate(MOBS):
            m = Canvas(W, H)
            fn(m, frame)
            m.save(os.path.join(out, f"mob_{stage}_{frame}.png"))
        for stage, fn in enumerate(BOSSES):
            b = Canvas(BW, BH)
            fn(b, frame)
            b.save(os.path.join(out, f"boss_{stage}_{frame}.png"))
    print("wrote ally, mob and boss sprites to", os.path.abspath(out))


if __name__ == "__main__":
    main()
