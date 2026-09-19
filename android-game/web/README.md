# Browser builds

The same three games as the Android modules, each as one self-contained HTML file, plus a
launcher that runs all three from one page.

| File | What it is |
|---|---|
| `arcade.html` | The launcher. Source form, with `__SHOT_*__` placeholders for the thumbnails. |
| `arcade.built.html` | What gets published: the launcher with thumbnails inlined. Built, not edited. |
| `sky-dodge.html` | Sky Dodge |
| `crowd-rush.html` | Villain Rush |
| `sky-strike.html` | Sky Strike |
| `thumb-*.png` | Card art, captured from real play |

The launcher loads each game in an iframe from the same origin, so the games' own
`localStorage` records (`skydodge.best`, `goblinhunters.bestLevel`, `skystrike.best` /
`skystrike.bestScore`) are what it reads back to fill in the high-score lines.

Publish the launcher with the three game pages as supporting files, so `arcade.built.html`
can reach `sky-dodge.html`, `crowd-rush.html` and `sky-strike.html` by name.

```
python3 web/build_arcade.py
```

These are kept in step with the Kotlin by hand: each game's browser file mirrors its
`*World.kt` simulation constant for constant, which is what makes it usable for checking
behaviour changes without an emulator.
