#!/usr/bin/env python3
"""Draw the Crowd Rush soldier sprites with the standard library only (no external assets).

Each sprite is 96x120 RGBA with a dark outline, two-tone shading and two walk frames.
Outputs into crowdrush/src/main/res/drawable-nodpi/:
  ranger_back_<frame>.png    the player's rangers (teal coat, wide-brim hat), seen from behind, frame = 0|1
  goblin_front_<frame>.png   enemy goblins facing the camera, frame = 0|1
  monster_<kind>_<frame>.png the end-of-road monsters (ogre, troll, golem, demon), 160x200, 2 stomp frames

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

RANGER = {"uni": (0x0F, 0x8A, 0x7E), "uni_light": (0x2D, 0xB5, 0xA6), "uni_dark": (0x0B, 0x5E, 0x56), "hat": (0x7C, 0x4A, 0x1E), "hat_light": (0x9C, 0x64, 0x2E), "hat_dark": (0x55, 0x30, 0x12), "band": (0xD9, 0x8E, 0x2B)}

GOB_SKIN = (0x6D, 0xBB, 0x3A)
GOB_SKIN_LIGHT = (0x93, 0xD6, 0x5C)
GOB_SKIN_DARK = (0x47, 0x86, 0x25)
GOB_EYE = (0xF5, 0xD0, 0x2E)
GOB_PUPIL = (0x1B, 0x1F, 0x2E)
GOB_TUNIC = (0x8B, 0x5A, 0x2B)
GOB_TUNIC_LIGHT = (0xA8, 0x74, 0x3E)
GOB_TUNIC_DARK = (0x5E, 0x3A, 0x18)
GOB_SHORTS = (0x3E, 0x3A, 0x4A)
GOB_TOOTH = (0xFF, 0xFF, 0xF0)
GOB_CLUB = (0x6B, 0x45, 0x22)


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


def draw_ranger(c: Canvas, t: dict, front: bool, frame: int):
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

    # ---- wide-brim leather hat
    c.ellipse(cx, 27, 30, 8, t["hat"], outline=O)                                # brim
    c.ellipse(cx, 25, 30, 6, t["hat_light"])
    c.ellipse(cx, 17, 17, 13, t["hat"], outline=O)                               # crown
    c.rrect(cx - 17, 17, cx + 17, 28, 4, t["hat"], outline=O)
    c.ellipse(cx - 6, 10, 8, 4, t["hat_light"])
    c.rrect(cx - 17, 21, cx + 17, 26, 1, t["band"])                              # hat band
    c.ellipse(cx, 27, 30, 8, t["hat_dark"], top_only=False) if False else None
    c.rrect(cx - 30, 27, cx + 30, 30, 2, t["hat_dark"])                          # brim underside


# ---------------------------------------------------------------- monsters
MON_CLAW = (0xEE, 0xE6, 0xD0)
MON_TOOTH = (0xFF, 0xFF, 0xF0)
MON_MOUTH = (0x4A, 0x0E, 0x0E)
MON_TONGUE = (0xC0, 0x3B, 0x5A)

MONSTERS = {
    # kind: body, light, dark, belly, eye white, iris, accent (horn/hair/stone), weapon, weapon dark
    "ogre": {"body": (0x5B, 0xA6, 0x3C), "light": (0x8A, 0xD1, 0x5E), "dark": (0x3C, 0x75, 0x27), "belly": (0xC9, 0xE0, 0x8C),
             "eye_w": (0xFF, 0xF3, 0xC4), "iris": (0xB9, 0x1C, 0x1C), "accent": (0xE8, 0xD8, 0xB0), "accent_dark": (0xB8, 0xA5, 0x7A),
             "weapon": (0x7C, 0x4A, 0x1E), "weapon_dark": (0x54, 0x30, 0x12), "cloth": (0x6B, 0x4A, 0x2E)},
    "troll": {"body": (0xC9, 0xA3, 0x3E), "light": (0xE8, 0xC9, 0x63), "dark": (0x8E, 0x6D, 0x1E), "belly": (0xF0, 0xDC, 0x9A),
              "eye_w": (0xFF, 0xF7, 0xD6), "iris": (0x2B, 0x2F, 0x3A), "accent": (0x3A, 0x2E, 0x18), "accent_dark": (0x1F, 0x18, 0x0C),
              "weapon": (0xD4, 0xAF, 0x37), "weapon_dark": (0x9A, 0x7B, 0x1E), "cloth": (0x2E, 0x2A, 0x3A)},
    "golem": {"body": (0x8C, 0x7B, 0x66), "light": (0xB3, 0xA3, 0x8A), "dark": (0x5E, 0x50, 0x40), "belly": (0xA3, 0x92, 0x7A),
              "eye_w": (0xFF, 0xB0, 0x2E), "iris": (0xFF, 0x62, 0x00), "accent": (0xFF, 0x8A, 0x1F), "accent_dark": (0xC2, 0x50, 0x00),
              "weapon": (0x6F, 0x62, 0x50), "weapon_dark": (0x46, 0x3C, 0x30), "cloth": (0x4A, 0x40, 0x34)},
    "demon": {"body": (0xC6, 0x2B, 0x2B), "light": (0xE8, 0x5C, 0x4A), "dark": (0x86, 0x14, 0x14), "belly": (0xF0, 0x8F, 0x6A),
              "eye_w": (0xFF, 0xE8, 0x5C), "iris": (0x1A, 0x1A, 0x1A), "accent": (0x2B, 0x1B, 0x1B), "accent_dark": (0x14, 0x0A, 0x0A),
              "weapon": (0x3A, 0x3F, 0x4A), "weapon_dark": (0x1F, 0x23, 0x2B), "cloth": (0x2E, 0x14, 0x3A)},
}


def _monster_legs(c, t, cx, frame, O):
    """Thick legs with a stomping walk cycle: one leg lifted (shorter, foot raised), the other planted."""
    for i, side in enumerate((-1, 1)):
        lx = cx + side * 26
        lift = (6 if i == frame else 0)
        c.rrect(lx - 16, 140 - lift * 0.4, lx + 16, 176 - lift, 10, t["dark"], outline=O)
        c.rrect(lx - 16, 140 - lift * 0.4, lx - 5, 168 - lift, 8, t["body"])
        c.rrect(lx - 14, 158 - lift, lx + 14, 162 - lift, 1, t["dark"])              # knee crease
        c.ellipse(lx, 182 - lift, 23, 11, t["body"], outline=O)                        # foot
        c.ellipse(lx - 6, 178 - lift, 10, 5, t["light"])
        for k in (-1, 0, 1):
            c.circle(lx + k * 11, 189 - lift, 4.2, MON_CLAW, outline=1.2)


def _monster_arms(c, t, cx, frame, O, weapon):
    swing = 6 if frame == 1 else -6
    for side in (-1, 1):
        ax = cx + side * 62
        dy = swing * side
        c.rot_rect(ax, 96 + dy, 27, 62, side * 18, t["body"], outline=O)
        c.rot_rect(ax - side * 5, 84 + dy, 10, 40, side * 18, t["light"])
        c.rot_rect(ax + side * 2, 112 + dy, 24, 8, side * 18, t["cloth"], outline=1)   # wrist wrap
        c.circle(ax + side * 6, 128 + dy, 16, t["body"], outline=O)                     # fist
        c.circle(ax + side * 2, 124 + dy, 6, t["light"])
        for k in (-1, 0, 1):
            c.circle(ax + side * 6 + k * 8, 139 + dy, 4, MON_CLAW, outline=1.2)
    if weapon == "club":
        c.rot_rect(cx + 66, 92 + swing, 13, 90, 8, t["weapon"], outline=O)
        c.rot_rect(cx + 62, 48 + swing, 26, 38, 8, t["weapon_dark"], outline=O)
        for k in range(4):
            c.circle(cx + 52 + k * 7, 38 + swing + k * 5, 3.2, MON_CLAW, outline=1)
    elif weapon == "mace":
        c.rot_rect(cx + 66, 96 + swing, 9, 84, 6, t["weapon_dark"], outline=O)
        c.circle(cx + 62, 48 + swing, 16, t["weapon"], outline=O)
        c.circle(cx + 57, 43 + swing, 6, (0xB5, 0xBA, 0xC4))
        for a in range(8):
            ang = math.radians(a * 45)
            c.polygon([(cx + 62 + math.cos(ang) * 14, 48 + swing + math.sin(ang) * 14),
                       (cx + 62 + math.cos(ang + 0.3) * 17, 48 + swing + math.sin(ang + 0.3) * 17),
                       (cx + 62 + math.cos(ang) * 23, 48 + swing + math.sin(ang) * 23),
                       (cx + 62 + math.cos(ang - 0.3) * 17, 48 + swing + math.sin(ang - 0.3) * 17)], (0xD0, 0xD4, 0xDB))
    elif weapon == "trident":
        c.rot_rect(cx + 66, 100 + swing, 7, 120, 4, t["weapon"], outline=O)
        c.rot_rect(cx + 62, 38 + swing, 26, 6, 4, t["weapon"], outline=O)
        for k in (-1, 0, 1):
            tx = cx + 62 + k * 10
            c.polygon([(tx - 4, 40 + swing), (tx + 4, 40 + swing), (tx + k * 1.5, 14 + swing)], OUTLINE)
            c.polygon([(tx - 2.5, 40 + swing), (tx + 2.5, 40 + swing), (tx + k * 1.5, 17 + swing)], (0xB5, 0xBA, 0xC4))


def _monster_torso(c, t, cx, O, belly=True):
    c.ellipse(cx, 96, 52, 46, t["body"], outline=O)
    c.ellipse(cx - 18, 76, 22, 18, t["light"])
    c.rrect(cx - 46, 126, cx + 46, 150, 12, t["cloth"], outline=O)                    # loincloth / belt
    c.rrect(cx - 46, 126, cx + 46, 131, 2, t["accent_dark"])
    if belly:
        c.ellipse(cx, 108, 32, 26, t["belly"], outline=1.5)
        c.ellipse(cx, 116, 20, 12, tuple(max(0, v - 25) for v in t["belly"]))
        c.circle(cx, 120, 3, t["dark"])                                                # navel


def _monster_head(c, t, cx, O, eyes, horns, tusks, hair=False, brow=True):
    c.ellipse(cx, 46, 42, 36, t["body"], outline=O)
    c.ellipse(cx - 14, 30, 18, 12, t["light"])
    if horns == "curved":
        for side in (-1, 1):
            pts = [(cx + side * 24, 24), (cx + side * 44, 14), (cx + side * 58, 26), (cx + side * 50, 34), (cx + side * 40, 24), (cx + side * 30, 30)]
            c.polygon([(x + side * 1.5, y - 1.5) for x, y in pts], OUTLINE)
            c.polygon(pts, t["accent"])
            c.polygon([(cx + side * 30, 26), (cx + side * 42, 20), (cx + side * 50, 28), (cx + side * 42, 26)], t["accent_dark"])
    elif horns == "straight":
        for side in (-1, 1):
            pts = [(cx + side * 26, 22), (cx + side * 52, 2), (cx + side * 42, 30)]
            c.polygon([(x + side * 1.5, y - 1.5) for x, y in pts], OUTLINE)
            c.polygon(pts, t["accent"])
            c.polygon([(cx + side * 30, 22), (cx + side * 48, 8), (cx + side * 42, 28)], t["accent_dark"])
    if hair:                                                                           # mohawk
        c.polygon([(cx - 10, 18), (cx - 6, -2), (cx, 8), (cx + 6, -4), (cx + 10, 18)], OUTLINE)
        c.polygon([(cx - 8, 18), (cx - 5, 2), (cx, 10), (cx + 5, 0), (cx + 8, 18)], t["accent"])
    for side in (-1, 1):                                                               # ears
        c.ellipse(cx + side * 44, 46, 8, 11, t["body"], outline=O)
        c.ellipse(cx + side * 44, 46, 4, 6, t["dark"])
    if eyes == 1:
        c.ellipse(cx, 44, 17, 15, t["eye_w"], outline=O)
        c.circle(cx + 2, 45, 8, t["iris"])
        c.circle(cx + 2, 45, 4, OUTLINE)
        c.circle(cx + 5, 41, 2.2, MON_TOOTH)
        if brow:
            c.rot_rect(cx - 12, 27, 30, 6, -14, t["dark"])
            c.rot_rect(cx + 12, 27, 30, 6, 14, t["dark"])
    else:
        for side in (-1, 1):
            c.ellipse(cx + side * 15, 44, 10, 9, t["eye_w"], outline=O)
            c.circle(cx + side * 15 + 1, 45, 5, t["iris"])
            c.circle(cx + side * 15 + 1, 45, 2.5, OUTLINE)
            c.circle(cx + side * 15 + 3, 42, 1.6, MON_TOOTH)
            if brow:
                c.rot_rect(cx + side * 15, 33, 22, 5, side * 16, t["dark"])
    c.rrect(cx - 26, 60, cx + 26, 76, 8, MON_MOUTH, outline=O)                         # mouth
    c.ellipse(cx, 74, 14, 5, MON_TONGUE)
    if tusks:
        for side in (-1, 1):
            c.polygon([(cx + side * 22, 66), (cx + side * 30, 66), (cx + side * 26, 50)], OUTLINE)
            c.polygon([(cx + side * 23, 66), (cx + side * 29, 66), (cx + side * 26, 52)], MON_TOOTH)
    for k in range(4):                                                                 # fangs
        fx = cx - 18 + k * 12
        c.polygon([(fx - 4, 60), (fx + 4, 60), (fx, 70)], MON_TOOTH)
    for k in range(2):
        fx = cx - 6 + k * 12
        c.polygon([(fx - 4, 76), (fx + 4, 76), (fx, 66)], MON_TOOTH)


def _prop_necktie(c, cx, O):
    """Stage 1: the boss's red necktie and staff lanyard."""
    c.polygon([(cx - 8, 82), (cx + 8, 82), (cx + 4, 92), (cx - 4, 92)], OUTLINE)
    c.polygon([(cx - 6, 83), (cx + 6, 83), (cx + 3, 91), (cx - 3, 91)], (0xC0, 0x1E, 0x2E))
    c.polygon([(cx - 9, 92), (cx + 9, 92), (cx + 5, 124), (cx, 132), (cx - 5, 124)], OUTLINE)
    c.polygon([(cx - 7, 93), (cx + 7, 93), (cx + 4, 123), (cx, 129), (cx - 4, 123)], (0xD6, 0x2E, 0x3E))
    c.polygon([(cx - 7, 93), (cx - 1, 93), (cx - 2, 122), (cx - 4, 123)], (0xE8, 0x5C, 0x66))
    for side in (-1, 1):                                                     # lanyard
        c.rot_rect(cx + side * 20, 96, 4, 40, side * 16, (0x1F, 0x2A, 0x44))
    c.rrect(cx - 12, 112, cx + 12, 130, 2, (0xF1, 0xF5, 0xF9), outline=1.5)  # staff badge
    c.rrect(cx - 9, 116, cx + 9, 119, 0.5, (0x94, 0xA3, 0xB8))
    c.rrect(cx - 9, 122, cx + 4, 125, 0.5, (0x94, 0xA3, 0xB8))


def _prop_gold(c, cx, O):
    """Stage 2: the friend who married rich — crown, chains, gold watch."""
    c.polygon([(cx - 26, 18), (cx - 18, -2), (cx - 8, 12), (cx, -6), (cx + 8, 12), (cx + 18, -2), (cx + 26, 18)], OUTLINE)
    c.polygon([(cx - 23, 17), (cx - 16, 1), (cx - 8, 14), (cx, -3), (cx + 8, 14), (cx + 16, 1), (cx + 23, 17)], (0xF5, 0xD0, 0x4A))
    c.rrect(cx - 24, 16, cx + 24, 23, 2, (0xD4, 0xAF, 0x37), outline=1.5)
    for k in (-1, 0, 1):
        c.circle(cx + k * 12, 19, 3, (0xE8, 0x3D, 0x6B), outline=1)           # jewels
    for k in range(7):                                                        # gold chain
        c.circle(cx - 27 + k * 9, 86 + abs(k - 3) * 3, 5, (0xF5, 0xD0, 0x4A), outline=1.5)
    c.circle(cx, 104, 9, (0xF5, 0xD0, 0x4A), outline=1.5)                     # pendant
    c.polygon([(cx - 4, 100), (cx + 4, 100), (cx, 110)], (0xFF, 0xF2, 0xB0))
    c.rrect(cx + 52, 120, cx + 76, 132, 3, (0xF5, 0xD0, 0x4A), outline=1.5)   # wrist watch
    c.circle(cx + 64, 126, 9, (0xFF, 0xF2, 0xB0), outline=1.5)
    c.rot_rect(cx + 64, 124, 2, 8, 20, (0x3A, 0x2E, 0x18))


def _prop_perm(c, cx, O):
    """Stage 3: the nagging aunt — tight perm and round glasses."""
    for k in range(9):                                                        # perm curls
        ang = math.pi + k * (math.pi / 8)
        px = cx + math.cos(ang) * 40
        py = 44 + math.sin(ang) * 36
        c.circle(px, py, 9, (0x6B, 0x46, 0x2B), outline=1.6)
        c.circle(px - 2, py - 2, 4, (0x8A, 0x5E, 0x3C))
    for side in (-1, 1):                                                      # round glasses
        c.circle(cx + side * 15, 44, 13, (0x2B, 0x2F, 0x3A), outline=0)
        c.circle(cx + side * 15, 44, 10.5, (0xE8, 0xF4, 0xFF))
        c.circle(cx + side * 15 - 4, 40, 3.5, (0xFF, 0xFF, 0xFF))
        c.circle(cx + side * 15 + 1, 45, 5, (0x1A, 0x1A, 0x1A))
    c.rrect(cx - 6, 42, cx + 6, 45, 1, (0x2B, 0x2F, 0x3A))                    # bridge


def draw_monster(c: Canvas, kind: str, frame: int):
    """Hulking monsters facing the camera, 160x200. frame 0/1 = stomping walk cycle."""
    t = MONSTERS[kind]
    O = 2.2
    cx = 80
    _monster_legs(c, t, cx, frame, O)
    if kind == "demon":                                                                # bat wings behind the body
        for side in (-1, 1):
            pts = [(cx + side * 30, 70), (cx + side * 78, 30), (cx + side * 76, 62), (cx + side * 96, 74), (cx + side * 78, 92), (cx + side * 92, 116), (cx + side * 40, 104)]
            c.polygon([(x + side * 2, y) for x, y in pts], OUTLINE)
            c.polygon(pts, t["accent"])
            for k in range(3):
                c.polygon([(cx + side * 34, 76 + k * 10), (cx + side * (74 + k * 4), 40 + k * 26), (cx + side * 36, 80 + k * 10)], t["accent_dark"])
    weapon = {"ogre": "club", "troll": "mace", "golem": None, "demon": "trident"}[kind]
    _monster_arms(c, t, cx, frame, O, weapon)
    _monster_torso(c, t, cx, O, belly=(kind != "golem"))
    if kind == "ogre":
        for (wx, wy) in ((cx - 30, 88), (cx + 34, 104), (cx - 26, 118)):                  # warts
            c.circle(wx, wy, 3, t["dark"])
        c.rot_rect(cx + 20, 92, 22, 3, 30, t["dark"])                                      # scar
        _monster_head(c, t, cx, O, eyes=1, horns="straight", tusks=False)
        c.rot_rect(cx + 22, 38, 16, 3, 40, t["dark"])                                      # head scar
        _prop_necktie(c, cx, O)
    elif kind == "troll":
        for (sx_, sy) in ((cx - 34, 92), (cx + 30, 82), (cx - 20, 124)):                  # stone-like spots
            c.ellipse(sx_, sy, 6, 4, t["dark"])
        _monster_head(c, t, cx, O, eyes=2, horns=None, tusks=True, hair=False)
        c.ellipse(cx, 56, 11, 8, t["light"], outline=O)                                    # big nose
        c.circle(cx - 4, 58, 2, t["dark"])
        c.circle(cx + 4, 58, 2, t["dark"])
        _prop_gold(c, cx, O)
    elif kind == "golem":
        # stone plates and glowing cracks
        for (px, py, pw, ph) in ((cx - 36, 70, 26, 20), (cx + 8, 66, 30, 22), (cx - 20, 96, 34, 26), (cx + 18, 100, 24, 20)):
            c.rrect(px, py, px + pw, py + ph, 4, t["light"], outline=1.5)
        for (x0, y0, x1, y1) in ((cx - 10, 84, cx + 6, 96), (cx + 6, 96, cx - 2, 112)):
            c.rot_rect((x0 + x1) / 2, (y0 + y1) / 2, 4, math.hypot(x1 - x0, y1 - y0), math.degrees(math.atan2(y1 - y0, x1 - x0)) - 90, t["accent"])
        _monster_head(c, t, cx, O, eyes=2, horns=None, tusks=False, brow=False)
        _prop_perm(c, cx, O)
    elif kind == "demon":
        _monster_head(c, t, cx, O, eyes=2, horns="curved", tusks=False)
        for k in range(4):                                                                 # flames on the crown
            fx = cx - 18 + k * 12
            c.polygon([(fx - 6, 20), (fx + 6, 20), (fx + 2, 2 - (k % 2) * 6)], (0xFF, 0x8A, 0x1F))
            c.polygon([(fx - 3, 20), (fx + 3, 20), (fx + 1, 8 - (k % 2) * 4)], (0xFF, 0xD2, 0x4A))
        c.rrect(cx - 46, 126, cx + 46, 150, 12, t["cloth"], outline=O)
        c.circle(cx, 138, 7, (0xFF, 0xD2, 0x4A), outline=1.5)                             # belt gem


def draw_goblin(c: Canvas, frame: int):
    """A scrappy goblin facing the camera: big ears, yellow eyes, ragged tunic, club."""
    O = 1.6
    cx = 48
    step = 4 if frame == 1 else 0
    # legs (bare) + feet
    for i, side in enumerate((-1, 1)):
        lx = cx + side * 9
        dy = -step if i == 0 else step
        c.rrect(lx - 6, 80 + dy * 0.5, lx + 6, 102 + dy, 4, GOB_SKIN_DARK, outline=O)
        c.rrect(lx - 6, 80 + dy * 0.5, lx - 1, 94 + dy, 3, GOB_SKIN)
        c.ellipse(lx + side * 2, 106 + dy, 10, 5, GOB_SKIN, outline=O)          # foot
        c.circle(lx + side * 9, 105 + dy, 2.2, GOB_TOOTH)                         # toe claw
    # shorts + tunic
    c.rrect(cx - 15, 74, cx + 15, 86, 4, GOB_SHORTS, outline=O)
    c.polygon([(cx - 18, 52), (cx + 18, 52), (cx + 20, 80), (cx + 8, 76), (cx, 82), (cx - 8, 76), (cx - 20, 80)], OUTLINE)
    c.polygon([(cx - 16, 54), (cx + 16, 54), (cx + 18, 78), (cx + 8, 74), (cx, 80), (cx - 8, 74), (cx - 18, 78)], GOB_TUNIC)
    c.polygon([(cx - 16, 54), (cx - 4, 54), (cx - 6, 76), (cx - 18, 78)], GOB_TUNIC_LIGHT)
    c.rrect(cx - 16, 66, cx + 16, 70, 1, GOB_TUNIC_DARK)                          # rope belt
    # arms
    for side in (-1, 1):
        ax = cx + side * 22
        c.rot_rect(ax, 64, 9, 26, side * 20, GOB_SKIN, outline=O)
        c.circle(ax + side * 5, 76, 5, GOB_SKIN_DARK, outline=O)                  # hands
    # club in the right hand
    c.rot_rect(cx + 34, 62, 6, 40, -15, GOB_CLUB, outline=O)
    c.circle(cx + 40, 42, 8, GOB_CLUB, outline=O)
    for k in range(3):
        c.circle(cx + 36 + k * 4, 37 + k * 3, 2, GOB_TOOTH, outline=1)
    # head
    c.rrect(cx - 5, 44, cx + 5, 56, 3, GOB_SKIN_DARK, outline=O)                  # neck
    c.ellipse(cx, 32, 18, 17, GOB_SKIN, outline=O)
    c.ellipse(cx - 6, 24, 10, 6, GOB_SKIN_LIGHT)
    for side in (-1, 1):                                                          # big pointy ears
        pts = [(cx + side * 14, 30), (cx + side * 34, 18), (cx + side * 16, 40)]
        c.polygon([(x + side * 1.5, y) for x, y in pts], OUTLINE)
        c.polygon(pts, GOB_SKIN)
        c.polygon([(cx + side * 17, 30), (cx + side * 29, 22), (cx + side * 18, 37)], GOB_SKIN_DARK)
    for side in (-1, 1):                                                          # eyes
        c.ellipse(cx + side * 7, 31, 5, 4, GOB_EYE, outline=1.2)
        c.ellipse(cx + side * 7, 31, 1.5, 3.2, GOB_PUPIL)
        c.rot_rect(cx + side * 7, 25, 9, 2.5, side * 18, GOB_SKIN_DARK)           # angry brows
    c.rrect(cx - 9, 39, cx + 9, 44, 2, OUTLINE)                                   # grin
    c.polygon([(cx - 6, 39), (cx - 2, 39), (cx - 4, 44)], GOB_TOOTH)
    c.polygon([(cx + 2, 39), (cx + 6, 39), (cx + 4, 44)], GOB_TOOTH)
    c.circle(cx, 36, 2.2, GOB_SKIN_DARK)                                          # nose


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "crowdrush", "src", "main", "res", "drawable-nodpi")
    os.makedirs(out, exist_ok=True)
    # remove sprites from earlier iterations if present
    for old in os.listdir(out):
        if old.startswith("soldier_"):
            os.remove(os.path.join(out, old))
    for frame in (0, 1):
        c = Canvas(W, H)
        draw_ranger(c, RANGER, front=False, frame=frame)
        c.save(os.path.join(out, f"ranger_back_{frame}.png"))
        g = Canvas(W, H)
        draw_goblin(g, frame)
        g.save(os.path.join(out, f"goblin_front_{frame}.png"))
    try:
        os.remove(os.path.join(out, "monster.png"))
    except OSError:
        pass
    for kind in MONSTERS:
        for frame in (0, 1):
            m = Canvas(160, 200)
            draw_monster(m, kind, frame)
            m.save(os.path.join(out, f"monster_{kind}_{frame}.png"))
    print("wrote ranger, goblin and monster sprites to", os.path.abspath(out))


if __name__ == "__main__":
    main()
