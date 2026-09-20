#!/usr/bin/env python3
"""
Inlines the three thumbnails into arcade.html and writes the publishable launcher.

arcade.html in this folder is the source: it carries __SHOT_<GAME>__ placeholders rather than
200KB of base64, so the page stays reviewable in a diff. This script produces arcade.built.html,
which is what gets published alongside the three game pages.

Usage: python3 web/build_arcade.py
"""

import base64
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
SHOTS = {
    "SKYDODGE": "thumb-skydodge.png",
    "VILLAINRUSH": "thumb-villainrush.png",
    "SKYSTRIKE": "thumb-skystrike.png",
}


def main():
    html = (HERE / "arcade.html").read_text()
    for key, png in SHOTS.items():
        data = base64.b64encode((HERE / png).read_bytes()).decode()
        html = html.replace(f"__SHOT_{key}__", f"data:image/png;base64,{data}")
    left = [k for k in SHOTS if f"__SHOT_{k}__" in html]
    if left:
        raise SystemExit(f"placeholder never filled: {left}")
    out = HERE / "arcade.built.html"
    out.write_text(html)
    print(f"wrote {out} ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main()
