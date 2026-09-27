# Animation guide (read this before painting a chapter)

A 130.9 s music video, *고딩 라이프*, painted frame by frame in Canvas 2D and rendered offline
in headless Chromium. The shot list is in [STORYBOARD.md](STORYBOARD.md); every time in it is
exact, from `song/score.mjs`. Direction: **cute, bright, lively, funny, with a lump in the throat
in the bridge. Something happens in every shot. Be brave.**

## How a chapter works

Each chapter is one file in `src/ch/`, wrapped in an IIFE so its helpers stay private:

```js
// src/ch/c2_lunch.js
(() => {
  const tray = (x, y) => { ... };                 // private helpers: any names
  function bell(t, lt, dur) { ... }               // a shot
  function countdown(t, lt, dur) { ... }
  chapter('lunch', 29.09, 50.91, [[29.09, bell], [30.91, countdown], ...]);
})();
```

- `chapter(name, start, end, shots)`: a shot is `fn(t, lt, dur)` (song time, time since the shot
  started, shot length) and paints **the whole frame**, background included. Cut times are the
  shot start times; use the exact storyboard times (or `bt(bar, beat)` / `sylT(bar, i)`).
- **Frames render in parallel and out of order.** Every shot is a pure function of `t`. No state
  carried between frames, no `Math.random()`: use `hash(i, j)` / `hrange(a, b, i, j)`.
- Only edit your own chapter files. If a shared helper is missing, write it privately in your
  IIFE. Shared files (`core.js`, `cast.js`, `props.js`, `timeline.js`, `studio.html`,
  `render.mjs`, `song/*`) are read-only for you; report real bugs in them instead.
- Don't leave a camera open: every `camBegin()` needs its `camEnd()` (the frame closes stray ones,
  but your letters would land in the wrong place).

## Canvas

- World is **1920×1080**, y down, origin top-left. Everything is in world units unless a camera
  is active.
- **The karaoke pill sits at y ≈ 960–1040 whenever a line is sung.** Keep faces and key action
  above y ≈ 930. You may set `KARAOKE.hidden = true` for a shot that has its own big lettering
  where there are no lyrics, or `KARAOKE.y = 90` to move it to the top for a shot whose action
  lives at the bottom. It resets every frame.
- A paper grain and a soft vignette go over every frame automatically.

## Drawing kit (`src/core.js`)

Paths + paint, all with a warm ink outline by default:

| call | what |
|---|---|
| `rrect(x, y, w, h, r, o)`, `ell(cx, cy, rx, ry, o, rot)`, `circle(cx, cy, r, o)`, `poly(pts, o)`, `smooth(pts, o)` | shapes. `o = { fill, stroke, lw, alpha, shadow }`. `stroke: null` = no outline; default outline is `PAL.ink`, `lw` 5 |
| `stroke(pts, color, lw, { smooth, ink, olw, alpha })` | a line with an ink border (`ink: null` for none) |
| `blobPts(cx, cy, r, n, wobble, seed, t)` | points for a wobbly blob (bushes, clouds, dust) |
| `lgrad`, `rgrad` | gradients for `fill` |
| `skyFill(stops)`, `fillScreen(style, alpha)` | full-frame backgrounds, screen space |
| `glow(x, y, r, color, a)` | additive soft light |
| `letter(txt, x, y, size, color, { font: 'bold'\|'round', pop, rot, alpha, lw, align })` | lettering with outline + drop shadow. `pop` 0..1 = overshooting appear |
| `sfx(txt, x, y, size, color, age, { life, rot })` | a comic sound effect that pops, wobbles, fades |
| `camBegin(cx, cy, zoom, rot)` / `camEnd()` | put world point (cx, cy) at screen centre. One level at a time |
| `shakeXY(t, t0, amt, len)` | [dx, dy] shake after a hit at t0; add to the camera centre |
| `flash(k, color)`, `iris(cx, cy, r, color)`, `wipe(k, color, seed)` | full-frame transitions |
| `speedLines(t, cx, cy, k)`, `streaks(t, k)` | radial / horizontal speed lines |
| `confetti(t, t0, { n, burst, x, w })`, `petals(t, n)`, `sunburst(cx, cy, a, b, rot)`, `sparkle(x, y, r, c)` | celebration |
| `starShape`, `heartPts` | point lists |
| Palette `PAL` | `ink paper cream navy shirt tie skin blush sky skyDeep dawn dusk night nightDk grass leaf sun gold pink sakura mint lilac orange red blue teal wall floor board chalk wood woodDk`. `mix(a, b, k)`, `rgba(hex, a)` |

Timing:

- `beatOf(t)`, `beatN(t)`, `barOf(t)`, `bt(bar, beat)` (bars/beats → seconds). 132 BPM: beat =
  0.4545 s, bar = 1.818 s. Beats fall on `n × 0.4545`.
- `pulse(t, k)` is 1 on each beat and decays; `pulse2` on eighths; `hop(t)` bounces between beats.
- `seg(t, a, b)` 0..1 through [a, b]; `kf(t, [[t0, v0], [t1, v1], ...], easing)` keyframes (values
  can be arrays); easings `ease easeOut easeIn easeInOut backOut elasticOut`; `lerp clamp frac wob`.
- `sylT(bar, i)` = when the i-th syllable of the line starting on `bar` is sung. `SONG.lines`,
  `SONG.cues` have everything.

## The cast (`src/cast.js`)

`kid(x, y, s, o)` — (x, y) is the ground point between the feet, **400 px tall at s = 1**
(head is ~200 of that). Options:

- `who`: `'me'` (the singer: black hair, cowlick, yellow bag), `'pony'`, `'glasses'`.
- `t`: pass the song time so hair and emotes move.
- Pose: `dy` (jump height, px at s=1), `rot`, `sq` (squash, negative stretches), `flip`,
  `turn` (-1..1 turns the face), `aL/aR` arm angles (0 hangs, π/2 out to the side, π straight up),
  `eL/eR` elbow bends, `lL/lR` leg angles, `kL/kR` knees, `walk` (a phase in cycles; `run: true`
  for a sprint), `sit`, `headRot`, `headDy`, `bag`.
- Face: `eyes` open · closed · happy · sleepy · wide · star · heart · x · spiral · dot · sad ·
  determined · wink; `lookX/lookY` (-1..1); `brows` up · angry · worried; `mouth` smile · grin ·
  open · o · yawn · flat · sad · wavy · cat · toast (a slice of toast in the teeth); `blush`
  (true or 0..1).
- `emote` + `emoteK`: sweat · zzz · heart · ! · ? · !? · music · sparkle · anger · bulb.
- `holdL/holdR`: `(x, y, angle) => { ... }` paints something at that hand, e.g.
  `holdR: (x, y) => toastSlice(x, y, 0.6)`.
- `mood(t, [[t0, eyes, mouth, emote], ...])` changes faces without snapping; spread it in.
- `dance(style, t, seed)` beat-synced pose: bounce · jump · cheer · sway · wave · fist. Spread it.
- Sizes: tiny s ≈ 0.3–0.5, normal 0.8–1.2, close-up 2–4 (crop with the camera for a face shot).

`adult(x, y, s, o)` — 540 tall at s = 1. `kind`: teacher · guard · mom · dad · aunt. Same pose
options (`aL/aR/eL/eR`, `walk`, `flip`, `rot`, `eyes`, `mouth`, `emote`, `holdL/R`), plus
`silhouette: '#colour'` for a faceless flat shape.

## Sets and props (`src/props.js`)

`sun`, `moon`, `stars(t, n, seed, alpha)`, `cloud(x, y, s, color)`, `cloudLayer(t, y, s, speed,
seed)`, `townRow(t, y, scroll, { tone, lit, seed, far })` (apartment blocks), `tree(x, y, s, kind,
t)` (green · sakura · autumn · night), `streetlight(x, y, s, on)`, `schoolBuilding(x, y, s, { lit,
clock, banner })`, `schoolGate(x, y, s, closed)`, `classroom(t, { night, board: fn, clock: [h, m],
flicker, sky: fn })` (a whole interior backdrop), `blackboard`, `chalk(txt, x, y, size)`,
`desk(x, y, s, { books })`, `wallClock(x, y, r, h, m)`, `digitalClock(x, y, s, '07:00', { blink,
glow })`, `speechBubble(x, y, w, h, tailX, tailY, { text })`, `toastSlice`, `lunchTray`,
`foldedNote(x, y, s, rot, open, draw)`, `polaroid(x, y, s, rot, draw, { develop, caption })`,
`textbook(x, y, s, rot, draw)`, `gradCap`, `paperPlane`.

## Style rules

- **Look:** flat colour, rounded shapes, warm ink outlines (lw ≈ 4–7), like a webtoon or a
  picture book. Backgrounds are simpler and softer than characters (fewer outlines, paler).
- **Colour:** follow the palette arc in the storyboard. Characters must stand out from the
  background.
- **Motion:** everything moves: cameras drift or push, people bounce on the beat (`pulse`, `hop`,
  `dance`), hits land on beats. Squash and stretch, anticipation, overshoot.
- **Readability:** one clear action per shot, big silhouettes. Shots are 1.8–3.6 s; the gag must
  read at once.
- **Text:** Korean is fine and welcome for the few sound effects and props (시계, 성적표, D-day).
  Don't write out the lyric; the karaoke already does.
- **Performance:** keep frames under ~150 ms (the sheet prints ms per frame). Hundreds of shapes are
  fine; thousands of gradients are not.

## Checking your work

```
node render.mjs --sheet=29.2,30.0,30.95,31.4,31.9,32.5 --cols=3 --out=out/check/c2_a.jpg
node render.mjs --stills=38.2 --out=out/check/c2
```

Open the image with the Read tool and look hard. Check the first and last frame of each shot, the
hits, the transitions into and out of your chapter, and that nothing important is under the karaoke.
Fix what looks off (scale, contrast, clutter, stiffness) and look again. Charm and clarity beat
detail.
