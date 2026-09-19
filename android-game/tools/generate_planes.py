#!/usr/bin/env python3
"""
Draws the Sky Strike aircraft, stdlib only.

Shares the crowd game's tiny PNG writer and drawing primitives (generate_sprites.Canvas / Pen)
and only supplies new shapes. Every aircraft is seen from above, nose pointing up the screen,
and has a two-frame propeller/engine flicker. Outputs into
skystrike/src/main/res/drawable-nodpi/:

  player_<frame>.png   your fighter (96x120)
  foe_<kind>_<frame>.png  drone / weaver / gunner / diver (96x120)
  raider_<kind>_<frame>.png  the heavy that ends each stage (200x160)
  pickup_<kind>.png    the five power-ups (64x64)
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_sprites import Canvas, Pen, OUTLINE, WHITE  # noqa: E402

FRAMES = 2
PW, PH = 96, 120           # fighters and foes
RW, RH = 200, 160          # the stage-ending heavy
IW, IH = 64, 64            # pickups

GLASS = (0x8E, 0xD8, 0xFF)
GLASS_D = (0x4A, 0x9B, 0xD6)
STEEL = (0xC7, 0xD2, 0xE0)
STEEL_D = (0x8A, 0x98, 0xAB)
FLAME = (0xFF, 0xC4, 0x4D)
FLAME_HOT = (0xFF, 0xF0, 0xB8)


def prop(p: Pen, x, y, r, frame, col=(0xD6, 0xDD, 0xE8)):
    """A disc of blur one frame, a pair of blades the next, so it reads as spinning."""
    if frame % 2 == 0:
        p.el(x, y, r, r * 0.22, col, o=1.0)
    else:
        p.el(x, y, r * 0.30, r * 0.95, col, o=1.0)


def exhaust(p: Pen, x, y, w_, frame):
    flick = 1.0 if frame % 2 == 0 else 0.62
    p.el(x, y + 6 * flick, w_, 9 * flick, FLAME, o=0.8)
    p.el(x, y + 3 * flick, w_ * 0.55, 5.5 * flick, FLAME_HOT)


# ---------------------------------------------------------------- the player's fighter


def draw_player(c: Canvas, frame: int):
    p = Pen(c, PW / 2, 1.0)
    O = 1.7
    exhaust(p, 0, 88, 7, frame)
    p.po_out([(-40, 74), (-10, 46), (10, 46), (40, 74), (40, 82), (12, 72), (-12, 72), (-40, 82)],
             (0x2E, 0x6C, 0xB8), o=O)                                  # main wing
    p.po_out([(-15, 92), (-5, 82), (5, 82), (15, 92), (15, 97), (-15, 97)],
             (0x2E, 0x6C, 0xB8), o=O)                                  # tailplane
    p.po_out([(0, 12), (13, 46), (13, 86), (7, 96), (-7, 96), (-13, 86), (-13, 46)],
             (0x4A, 0x8F, 0xE0), o=O)                                  # fuselage
    p.po([(0, 14), (7, 46), (7, 86), (0, 94), (-3, 86), (-3, 46)], (0x6FA8F0 >> 16 & 255, 0xA8, 0xF0))
    p.el(0, 44, 9, 13, GLASS, o=1.2)                                   # canopy
    p.el(-2, 40, 5, 7, WHITE)
    p.el(0, 52, 8, 5, GLASS_D)
    for side in (-1, 1):                                               # wing guns
        p.rr(side * 27 - 2.5, 50, side * 27 + 2.5, 74, 1.2, STEEL_D, o=1.2)
    p.rr(-2, 90, 2, 100, 1, STEEL_D, o=1.0)
    prop(p, 0, 16, 26, frame)
    p.ci(0, 16, 5, (0xE8, 0x4C, 0x3D), o=1.2)                          # spinner


# ---------------------------------------------------------------- the four foes


def foe_drone(c: Canvas, frame: int):
    """Cheap, unarmed, flies straight at you."""
    p = Pen(c, PW / 2, 1.0)
    O = 1.7
    exhaust(p, 0, 36, 5, frame)
    p.po_out([(-34, 52), (-8, 66), (8, 66), (34, 52), (34, 44), (-34, 44)], (0x7A, 0x84, 0x96), o=O)
    p.po_out([(0, 96), (11, 66), (11, 40), (0, 30), (-11, 40), (-11, 66)], (0x9A, 0xA6, 0xB8), o=O)
    p.po([(0, 92), (5, 66), (5, 42), (0, 34)], (0xB8, 0xC4, 0xD4))
    p.el(0, 62, 7, 9, (0xE0, 0x6B, 0x5A), o=1.2)                       # single red eye
    p.el(0, 60, 3, 4, WHITE)
    prop(p, 0, 92, 20, frame, col=(0x8A, 0x92, 0xA2))


def foe_weaver(c: Canvas, frame: int):
    """Light, fast, slides side to side."""
    p = Pen(c, PW / 2, 1.0)
    O = 1.7
    exhaust(p, 0, 34, 5, frame)
    p.po_out([(-40, 58), (0, 70), (40, 58), (40, 50), (14, 54), (-14, 54), (-40, 50)],
             (0x6B, 0x4C, 0x9A), o=O)                                  # swept wing
    p.po_out([(0, 98), (10, 70), (10, 42), (0, 32), (-10, 42), (-10, 70)], (0x8A, 0x63, 0xC4), o=O)
    p.po([(0, 94), (4, 70), (4, 44), (0, 36)], (0xA8, 0x86, 0xDC))
    p.el(0, 66, 6.5, 8, (0xFF, 0xD6, 0x6B), o=1.2)
    p.ci(0, 66, 3, (0x3A, 0x2A, 0x52))
    for side in (-1, 1):
        p.po([(side * 24, 52), (side * 30, 42), (side * 18, 48)], (0x5A, 0x3E, 0x82))
    prop(p, 0, 94, 18, frame, col=(0xB0, 0x9C, 0xD0))


def foe_gunner(c: Canvas, frame: int):
    """Heavy, slow, and it shoots at where you are going."""
    p = Pen(c, PW / 2, 1.0)
    O = 1.7
    for side in (-1, 1):
        exhaust(p, side * 20, 38, 4.5, frame)
    p.po_out([(-42, 62), (-42, 48), (42, 48), (42, 62), (16, 68), (-16, 68)],
             (0x4A, 0x5E, 0x42), o=O)                                  # slab wing
    p.po_out([(0, 100), (14, 72), (15, 44), (0, 34), (-15, 44), (-14, 72)], (0x6B, 0x82, 0x5C), o=O)
    p.po([(0, 96), (6, 72), (6, 46), (0, 38)], (0x86, 0x9E, 0x74))
    for side in (-1, 1):                                               # engine nacelles
        p.rr(side * 20 - 7, 40, side * 20 + 7, 62, 4, (0x3E, 0x4E, 0x38), o=1.4)
    p.el(0, 70, 8, 10, (0xFF, 0x8A, 0x5A), o=1.2)
    p.el(0, 68, 4, 5, WHITE)
    p.rr(-3.5, 74, 3.5, 92, 1.5, (0x2A, 0x33, 0x26), o=1.2)            # chin gun
    prop(p, 0, 96, 16, frame, col=(0x9A, 0xA8, 0x8C))


def foe_diver(c: Canvas, frame: int):
    """Drops on you, accelerating the whole way."""
    p = Pen(c, PW / 2, 1.0)
    O = 1.7
    exhaust(p, 0, 30, 6, frame)
    p.po_out([(-30, 54), (0, 64), (30, 54), (26, 44), (-26, 44)], (0x9A, 0x33, 0x2E), o=O)
    p.po_out([(0, 104), (9, 68), (12, 40), (0, 26), (-12, 40), (-9, 68)], (0xC2, 0x45, 0x3C), o=O)
    p.po([(0, 100), (4, 68), (5, 42), (0, 30)], (0xE0, 0x6B, 0x5A))
    p.po_out([(-16, 96), (0, 86), (16, 96), (16, 100), (-16, 100)], (0x9A, 0x33, 0x2E), o=1.4)
    p.el(0, 60, 6, 7.5, (0x2A, 0x2E, 0x38), o=1.2)
    p.el(-1.5, 58, 3, 3.5, (0xFF, 0xC4, 0x4D))
    prop(p, 0, 100, 17, frame, col=(0xD4, 0x9C, 0x96))


FOES = [foe_drone, foe_weaver, foe_gunner, foe_diver]


# ---------------------------------------------------------------- the stage-ending heavies


def raider_base(c: Canvas, frame: int, body, body_l, wing, accent):
    p = Pen(c, RW / 2, 1.0)
    O = 1.8
    for side in (-1, 1):
        for k in (0.46, 0.74):
            exhaust(p, side * RW * 0.5 * k * 0.72, 44, 6, frame)
    p.po_out([(-92, 76), (-92, 54), (92, 54), (92, 76), (34, 88), (-34, 88)], wing, o=O)
    for side in (-1, 1):
        for k in (0.34, 0.56):
            p.rr(side * 92 * k - 10, 44, side * 92 * k + 10, 74, 5, accent, o=1.5)
            prop(p, side * 92 * k, 108, 15, frame, col=(0xC8, 0xD0, 0xDC))
    p.po_out([(0, 136), (26, 96), (28, 56), (14, 34), (-14, 34), (-28, 56), (-26, 96)], body, o=O)
    p.po([(0, 130), (12, 96), (13, 58), (0, 40)], body_l)
    p.po_out([(-40, 126), (0, 112), (40, 126), (40, 134), (-40, 134)], wing, o=1.5)
    p.el(0, 62, 15, 12, GLASS, o=1.4)
    p.el(-4, 58, 7, 6, WHITE)
    for side in (-1, 1):                                                # turrets
        p.ci(side * 30, 92, 8, accent, o=1.4)
        p.rr(side * 30 - 2.5, 76, side * 30 + 2.5, 94, 1.2, (0x2A, 0x2E, 0x38), o=1.2)
    return p


def raider_zeppelin(c: Canvas, frame: int):
    p = raider_base(c, frame, (0x5A, 0x64, 0x78), (0x76, 0x82, 0x96), (0x3E, 0x46, 0x56), (0x8A, 0x96, 0xAA))
    p.rr(-20, 44, 20, 52, 3, (0xE8, 0x4C, 0x3D), o=1.2)


def raider_storm(c: Canvas, frame: int):
    p = raider_base(c, frame, (0x44, 0x52, 0x7A), (0x5E, 0x70, 0xA0), (0x2E, 0x38, 0x58), (0x6B, 0x7E, 0xB8))
    for side in (-1, 1):
        p.po([(side * 14, 44), (side * 22, 30), (side * 8, 40)], (0xFF, 0xD6, 0x6B))


def raider_ember(c: Canvas, frame: int):
    p = raider_base(c, frame, (0x7A, 0x3A, 0x2E), (0xA0, 0x52, 0x3E), (0x58, 0x28, 0x20), (0xC2, 0x6B, 0x3A))
    p.el(0, 100, 18, 8, (0xFF, 0xA8, 0x4D), o=1.2)


def raider_void(c: Canvas, frame: int):
    p = raider_base(c, frame, (0x33, 0x33, 0x3E), (0x4C, 0x4C, 0x5C), (0x22, 0x22, 0x2C), (0x6B, 0x5A, 0x9A))
    for side in (-1, 1):
        p.ci(side * 56, 64, 5, (0xB8, 0x8A, 0xFF), o=1.2)


RAIDERS = [raider_zeppelin, raider_storm, raider_ember, raider_void]


# ---------------------------------------------------------------- pickups


def pickup(c: Canvas, body, glyph):
    p = Pen(c, IW / 2, 1.0)
    p.ci(0, 32, 24, body, o=2.0)
    p.ci(0, 26, 15, (min(255, body[0] + 40), min(255, body[1] + 40), min(255, body[2] + 40)))
    glyph(p)


def _g_spread(p):
    for dx in (-9, 0, 9):
        p.po([(dx, 20), (dx + 4, 32), (dx, 44), (dx - 4, 32)], WHITE)


def _g_rapid(p):
    p.po([(4, 16), (-10, 34), (-1, 34), (-5, 48), (11, 29), (2, 29)], WHITE)


def _g_shield(p):
    p.po_out([(0, 16), (13, 23), (13, 36), (0, 48), (-13, 36), (-13, 23)], WHITE, o=1.2)
    p.po([(0, 22), (8, 26), (8, 35), (0, 42), (-8, 35), (-8, 26)], (0x22, 0xD3, 0xEE))


def _g_bomb(p):
    p.ci(0, 36, 12, (0x2A, 0x2E, 0x38), o=1.2)
    p.rr(-3, 18, 3, 26, 1.5, (0x8A, 0x6B, 0x3A), o=1.2)
    p.po([(3, 14), (11, 8), (7, 18)], (0xFF, 0xD6, 0x6B))


def _g_repair(p):
    p.rr(-5, 18, 5, 46, 2, WHITE, o=1.2)
    p.rr(-14, 27, 14, 37, 2, WHITE, o=1.2)


PICKUPS = [
    ("spread", (0x2E, 0x8A, 0xD6), _g_spread),
    ("rapid", (0xE0, 0x9A, 0x1E), _g_rapid),
    ("shield", (0x14, 0x8A, 0x9A), _g_shield),
    ("bomb", (0x8A, 0x3A, 0xC2), _g_bomb),
    ("repair", (0x2E, 0x9A, 0x52), _g_repair),
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "skystrike", "src", "main", "res", "drawable-nodpi")
    os.makedirs(out, exist_ok=True)
    for old in os.listdir(out):
        if old.startswith(("player_", "foe_", "raider_", "pickup_")):
            os.remove(os.path.join(out, old))
    for frame in range(FRAMES):
        c = Canvas(PW, PH)
        draw_player(c, frame)
        c.save(os.path.join(out, f"player_{frame}.png"))
        for kind, fn in enumerate(FOES):
            f = Canvas(PW, PH)
            fn(f, frame)
            f.save(os.path.join(out, f"foe_{kind}_{frame}.png"))
        for kind, fn in enumerate(RAIDERS):
            r = Canvas(RW, RH)
            fn(r, frame)
            r.save(os.path.join(out, f"raider_{kind}_{frame}.png"))
    for name, body, glyph in PICKUPS:
        i = Canvas(IW, IH)
        pickup(i, body, glyph)
        i.save(os.path.join(out, f"pickup_{name}.png"))
    print("wrote Sky Strike aircraft and pickups to", os.path.abspath(out))


if __name__ == "__main__":
    main()
