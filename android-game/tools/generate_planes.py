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
    """The four-engine heavy: wide straight wing, slab sides, nothing clever."""
    p = raider_base(c, frame, (0x5A, 0x64, 0x78), (0x76, 0x82, 0x96), (0x3E, 0x46, 0x56), (0x8A, 0x96, 0xAA))
    p.rr(-20, 44, 20, 52, 3, (0xE8, 0x4C, 0x3D), o=1.2)


def raider_storm(c: Canvas, frame: int):
    """Twin boom: two hulls with open sky down the middle, joined by a centre plank."""
    body, body_l = (0x44, 0x52, 0x7A), (0x5E, 0x70, 0xA0)
    wing, accent = (0x2E, 0x38, 0x58), (0x6B, 0x7E, 0xB8)
    p = Pen(c, RW / 2, 1.0)
    for side in (-1, 1):
        exhaust(p, side * 54, 36, 8, frame)
    p.po_out([(-86, 82), (86, 82), (86, 100), (-86, 100)], wing, o=1.8)      # the plank between them
    p.rr(-30, 86, 30, 96, 4, accent, o=1.4)
    for side in (-1, 1):                                                     # the two booms
        x = side * 54
        p.po_out([(x, 132), (x + side * 20, 96), (x + side * 21, 52), (x + side * 8, 30),
                  (x - side * 8, 30), (x - side * 21, 52), (x - side * 20, 96)], body, o=1.8)
        p.po([(x, 126), (x + side * 9, 94), (x + side * 10, 54), (x, 38)], body_l)
        p.el(x, 60, 12, 10, GLASS, o=1.3)
        p.el(x - side * 3, 56, 5, 4, WHITE)
        p.po_out([(x - 26, 124), (x, 110), (x + 26, 124), (x + 26, 132), (x - 26, 132)], wing, o=1.4)
        prop(p, x, 112, 14, frame, col=(0xC8, 0xD0, 0xDC))
    for side in (-1, 1):                                                     # wingtip lights
        p.ci(side * 82, 91, 5, (0xFF, 0xD6, 0x6B), o=1.2)


def raider_ember(c: Canvas, frame: int):
    """A flying wing: one swept triangle, no tail, a hot bar along its trailing edge."""
    body, body_l = (0x7A, 0x3A, 0x2E), (0xA0, 0x52, 0x3E)
    wing, accent = (0x58, 0x28, 0x20), (0xC2, 0x6B, 0x3A)
    p = Pen(c, RW / 2, 1.0)
    for k in (-0.62, -0.22, 0.22, 0.62):
        exhaust(p, k * 96, 34, 9, frame)
    p.po_out([(0, 142), (96, 58), (96, 34), (-96, 34), (-96, 58)], wing, o=1.8)
    p.po_out([(0, 128), (52, 62), (52, 40), (-52, 40), (-52, 62)], body, o=1.5)
    p.po([(0, 118), (24, 66), (24, 46), (-24, 46), (-24, 66)], body_l)
    p.rr(-88, 34, 88, 44, 4, accent, o=1.4)                                  # the trailing-edge bar
    glow = (0xFF, 0xA8, 0x4D) if frame % 2 == 0 else (0xFF, 0xD8, 0x96)
    p.rr(-80, 36, 80, 41, 2, glow)
    p.el(0, 78, 17, 13, GLASS, o=1.4)
    p.el(-5, 73, 7, 6, WHITE)
    for side in (-1, 1):
        p.ci(side * 66, 52, 7, accent, o=1.3)
        p.po([(side * 62, 44), (side * 70, 44), (side * 66, 32)], (0xFF, 0xC4, 0x4D))


def raider_void(c: Canvas, frame: int):
    """A dagger: long, narrow, everything swept back. The one that is hard to lead."""
    body, body_l = (0x33, 0x33, 0x3E), (0x4C, 0x4C, 0x5C)
    wing, accent = (0x22, 0x22, 0x2C), (0x6B, 0x5A, 0x9A)
    p = Pen(c, RW / 2, 1.0)
    exhaust(p, 0, 28, 11, frame)
    for side in (-1, 1):                                                     # sharply swept wings
        p.po_out([(0, 96), (side * 92, 44), (side * 96, 30), (side * 30, 52), (0, 70)], wing, o=1.6)
        p.po([(side * 20, 62), (side * 74, 40), (side * 78, 33), (side * 26, 54)], accent)
        p.ci(side * 86, 37, 5, (0xB8, 0x8A, 0xFF), o=1.2)
    p.po_out([(0, 150), (17, 104), (19, 60), (13, 34), (-13, 34), (-19, 60), (-17, 104)], body, o=1.8)
    p.po([(0, 140), (8, 104), (9, 60), (0, 40)], body_l)
    p.el(0, 84, 12, 14, GLASS, o=1.4)
    p.el(-3, 78, 5, 6, WHITE)
    p.po_out([(-30, 48), (0, 34), (30, 48), (30, 56), (-30, 56)], wing, o=1.4)
    for side in (-1, 1):
        p.rr(side * 26 - 4, 66, side * 26 + 4, 92, 3, accent, o=1.3)         # underwing pods


def raider_bastion(c: Canvas, frame: int):
    """An armoured barge: short, fat, slab-sided, and covered in turrets."""
    body, body_l = (0x4E, 0x50, 0x46), (0x6C, 0x70, 0x60)
    wing, accent = (0x33, 0x35, 0x2E), (0x9A, 0x8A, 0x52)
    p = Pen(c, RW / 2, 1.0)
    for k in (-0.7, -0.4, 0.4, 0.7):
        exhaust(p, k * 92, 40, 8, frame)
    p.rr(-94, 42, 94, 76, 8, wing, o=1.8)                                    # the slab
    p.rr(-96, 78, 96, 96, 6, wing, o=1.6)                                    # sponsons
    for side in (-1, 1):
        p.rr(side * 72 - 16, 80, side * 72 + 16, 112, 7, body, o=1.6)
        prop(p, side * 72, 118, 14, frame, col=(0xC0, 0xC4, 0xB0))
        p.ci(side * 46, 62, 10, accent, o=1.4)                               # turrets
        p.rr(side * 46 - 3, 44, side * 46 + 3, 64, 1.4, (0x2A, 0x2E, 0x28), o=1.2)
    p.rr(-34, 50, 34, 124, 10, body, o=1.8)                                  # the middle block
    p.rr(-18, 56, 18, 112, 7, body_l)
    p.el(0, 96, 16, 12, GLASS, o=1.4)
    p.el(-5, 92, 6, 5, WHITE)
    p.rr(-40, 126, 40, 136, 4, accent, o=1.4)                                # chin plate
    for k in (-0.55, 0, 0.55):
        p.ci(k * 44, 132, 5, (0x2A, 0x2E, 0x28), o=1.1)


def raider_ring(c: Canvas, frame: int):
    """A disc with an eye in it. Nothing else in the sky is shaped like this."""
    body, body_l = (0x2E, 0x4C, 0x52), (0x40, 0x6E, 0x76)
    wing, accent = (0x1E, 0x33, 0x38), (0x3E, 0xC6, 0xD6)
    p = Pen(c, RW / 2, 1.0)
    for a in (35, 145, 215, 325):                                            # four outriggers
        rad = math.radians(a)
        x, y = math.cos(rad) * 86, 86 + math.sin(rad) * 52
        p.rr(x - 13, y - 13, x + 13, y + 13, 5, wing, o=1.6)
        prop(p, x, y, 12, frame, col=(0x9ED8E0 >> 16 & 255, 0x9ED8E0 >> 8 & 255, 0x9ED8E0 & 255))
    p.el(0, 86, 92, 56, wing, o=1.8)                                         # the outer ring
    p.el(0, 86, 74, 44, body, o=1.4)
    p.el(0, 86, 52, 31, body_l)
    exhaust(p, 0, 34, 12, frame)
    p.el(0, 86, 30, 22, (0x14, 0x22, 0x26), o=1.4)                           # the eye
    glow = accent if frame % 2 == 0 else (0x9C, 0xEC, 0xF6)
    p.el(0, 86, 21, 15, glow)
    p.el(-6, 81, 8, 6, WHITE)
    for side in (-1, 1):                                                     # gun blisters
        p.ci(side * 62, 86, 8, accent, o=1.4)
        p.rr(side * 62 - 3, 86, side * 62 + 3, 116, 1.4, (0x16, 0x26, 0x2A), o=1.2)


RAIDERS = [raider_zeppelin, raider_storm, raider_ember, raider_void,
           raider_bastion, raider_ring]


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
