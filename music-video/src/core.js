// The drawing kit every chapter paints with. Plain Canvas 2D in a fixed 1920x1080 world; the
// page scales it to whatever size the canvas really is.
//
// Every frame is a pure function of the song time `t`: no state carries from one frame to the
// next and nothing is random, because frames are painted out of order by several browsers at
// once. Use hash() wherever you would reach for Math.random().

/* eslint-disable no-unused-vars */
// A page may set window.FRAME = { w, h } before this file for another shape (e.g. a 1080x1920 short).
const W = (typeof window !== 'undefined' && window.FRAME?.w) || 1920, H = (typeof window !== 'undefined' && window.FRAME?.h) || 1080, TAU = Math.PI * 2;
let cv = null, ctx = null, SCALE = 1;

function setupCanvas(canvas) {
  cv = canvas; ctx = canvas.getContext('2d');
  SCALE = canvas.width / W;
}

// ---- numbers ------------------------------------------------------------------------------------

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const frac = x => x - Math.floor(x);
const seg = (t, a, b) => clamp((t - a) / (b - a));                 // 0..1 through [a, b]
const ease = k => k * k * (3 - 2 * k);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const backOut = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const elasticOut = k => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * TAU / 3) + 1);
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);

/** Stable pseudo-random 0..1 for any number (and a second number, if you want a grid). */
function hash(a, b = 0) {
  let h = Math.imul((a * 1000003) | 0, 0x27d4eb2d) ^ Math.imul((b * 999331) | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const hrange = (a, b, i, j = 0) => a + (b - a) * hash(i, j);

/** Keyframes: kf(t, [[t0, v0], [t1, v1], ...], easing). Values may be numbers or arrays. */
function kf(t, keys, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) {
      const k = e(clamp((t - t0) / (t1 - t0)));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

// ---- the music ----------------------------------------------------------------------------------
// SONG comes from src/song.js, which song/synth.mjs writes.

const BEAT = () => SONG.beat;
const beatOf = t => t / SONG.beat;                      // beats since the top, fractional
const beatN = t => Math.floor(beatOf(t) + 1e-6);
const barOf = t => t / SONG.bar;
const bt = (bar, beat = 0) => (bar * 4 + beat) * SONG.beat;   // bars/beats -> seconds
/** 1 on every beat, falling away after it. */
const pulse = (t, k = 7) => Math.exp(-frac(beatOf(t) + 1e-6) * k);
/** The same on eighths. */
const pulse2 = (t, k = 7) => Math.exp(-frac(beatOf(t) * 2 + 1e-6) * k);
/** A bounce that lands on each beat: 0 on the beat, 1 halfway between. */
const hop = t => Math.sin(Math.PI * frac(beatOf(t) + 1e-6));
const lineAt = t => SONG.lines.find(l => t >= l.t - 0.05 && t < l.end + 0.3);
/** The time the `i`th syllable of the line starting on `bar` is sung. */
const sylT = (bar, i) => SONG.lines.find(l => l.bar === bar).notes[i].t;

// ---- colour -------------------------------------------------------------------------------------

const PAL = {
  ink: '#2A2438', paper: '#FFF8EC', cream: '#FFF1D6',
  navy: '#2E3A66', navyDk: '#222B4F', shirt: '#FDFDFB', tie: '#E0484E',
  skin: '#FFD9BC', skinDk: '#F2B99A', blush: '#FF9A9A', hair: '#2F2A3A', hairBr: '#6B4432',
  sky: '#8FD3FF', skyDeep: '#4C9BE8', dawn: '#FFB47A', dusk: '#FF7A7A', night: '#1D2346', nightDk: '#121631',
  grass: '#7CCB6A', leaf: '#4FA85E', sun: '#FFD45C', gold: '#FFC23D', pink: '#FF8FB1', sakura: '#FFC7DA',
  mint: '#6FE3C8', lilac: '#B79CFF', orange: '#FF9A3D', red: '#F2545B', blue: '#4E8EF7', teal: '#2EC4B6',
  wall: '#F6E7C8', floor: '#C98E5B', board: '#2F5D50', chalk: '#F4F7EF', wood: '#B87942', woodDk: '#8A5530',
};

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function rgba(hex, a) {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${a})`;
}

// ---- shapes -------------------------------------------------------------------------------------
// Build a path with one of these, then paint() it. Paths are in world units.

function rrectPath(x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function ellPath(cx, cy, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
function polyPath(pts, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
/** A closed curve through points (Catmull-Rom), for soft blobs, hair and clouds. */
function smoothPath(pts, close = true) {
  const n = pts.length, P = i => pts[close ? (i + n) % n : clamp(i, 0, n - 1)];
  ctx.beginPath(); ctx.moveTo(P(0)[0], P(0)[1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}
/** A wobbly circle: n points, radius r, wobble w (0..1), seed. */
function blobPts(cx, cy, r, n = 9, w = 0.15, seed = 0, t = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU, rr = r * (1 + w * (hash(seed, i) - 0.5) * 2 + w * 0.4 * Math.sin(t * 2 + i * 1.7 + seed));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
}

/**
 * Paint the current path. o: { fill, stroke (default ink), lw (default 5), alpha, shadow }.
 * stroke: null means no outline.
 */
function paint(o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur ?? 30; }
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  ctx.shadowColor = 'transparent';
  const stroke = o.stroke === undefined ? PAL.ink : o.stroke;
  if (stroke && (o.lw ?? 5) > 0) {
    ctx.strokeStyle = stroke; ctx.lineWidth = o.lw ?? 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
const rrect = (x, y, w, h, r, o) => { rrectPath(x, y, w, h, r); paint(o); };
const ell = (cx, cy, rx, ry, o, rot = 0) => { ellPath(cx, cy, rx, ry, rot); paint(o); };
const circle = (cx, cy, r, o) => ell(cx, cy, r, r, o);
const poly = (pts, o) => { polyPath(pts); paint(o); };
const smooth = (pts, o) => { smoothPath(pts); paint(o); };

/** An open stroke along points; outlined with ink unless o.ink === null. */
function stroke(pts, color, lw, o = {}) {
  const draw = (c, w) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (o.smooth && pts.length > 2) {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    } else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = o.cap ?? 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
  };
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.ink !== null) draw(o.ink ?? PAL.ink, lw + (o.olw ?? 10));
  draw(color, lw);
  ctx.restore();
}

function lgrad(x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([k, c]) => g.addColorStop(k, c));
  return g;
}
function rgrad(cx, cy, r0, r1, stops) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, Math.max(r1, 0.01));
  stops.forEach(([k, c]) => g.addColorStop(k, c));
  return g;
}

/** Fill the whole frame (screen space, ignores any camera). */
function fillScreen(style, alpha = 1) {
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.restore();
}
/** A vertical gradient across the whole frame: stops like [[0, '#123'], [1, '#abc']]. */
const skyFill = stops => fillScreen(lgrad(0, 0, 0, H, stops));

function glow(x, y, r, color, a = 0.6) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgrad(x, y, 0, r, [[0, rgba(color, a)], [0.4, rgba(color, a * 0.35)], [1, rgba(color, 0)]]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// ---- camera -------------------------------------------------------------------------------------

let camDepth = 0;
/** Put world point (cx, cy) at the centre of the screen, zoomed and rotated. Pair with camEnd(). */
function camBegin(cx = W / 2, cy = H / 2, zoom = 1, rot = 0) {
  ctx.save(); camDepth++;
  ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
}
function camEnd() { if (camDepth > 0) { camDepth--; ctx.restore(); } }
/** A shake offset for a hit that happened at `t0`: [dx, dy]. */
function shakeXY(t, t0, amt = 20, len = 0.35) {
  const k = t < t0 ? 0 : Math.exp(-(t - t0) / len * 4) * (t - t0 < len ? 1 : 0);
  return [Math.sin(t * 91) * amt * k, Math.cos(t * 77) * amt * k];
}

// ---- lettering ----------------------------------------------------------------------------------

const FONT = { bold: '"Black Han Sans"', round: '"Jua"' };

/**
 * Lettering with an ink outline and a drop shadow.
 * o: { font: 'bold'|'round', align, color2 (outline), lw, rot, alpha, pop (0..1 appear), shadow, base }
 */
function letter(txt, x, y, size, color, o = {}) {
  const pop = o.pop === undefined ? 1 : o.pop;
  if (pop <= 0) return;
  const s = pop < 1 ? backOut(pop) : 1;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  ctx.globalAlpha *= (o.alpha ?? 1) * clamp(pop * 3);
  ctx.font = `${size}px ${FONT[o.font || 'bold']}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  const lw = o.lw ?? Math.max(4, size * 0.12);
  if (o.shadow !== null) {
    ctx.fillStyle = o.shadow || PAL.ink;
    ctx.fillText(txt, size * 0.05, size * 0.07);
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = o.shadow || PAL.ink; ctx.lineJoin = 'round'; ctx.strokeText(txt, size * 0.05, size * 0.07); }
  }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = o.color2 || PAL.ink; ctx.lineJoin = 'round'; ctx.strokeText(txt, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(txt, 0, 0);
  ctx.restore();
}
/** A comic sound effect that pops in at age 0, wobbles, and fades by `life`. */
function sfx(txt, x, y, size, color, age, o = {}) {
  const life = o.life ?? 0.9;
  if (age < 0 || age > life) return;
  const k = age / life;
  letter(txt, x, y - k * 30, size * (1 + 0.08 * Math.sin(age * 30) * (1 - k)), color,
    { ...o, pop: clamp(age / 0.18), alpha: 1 - ease(clamp((k - 0.7) / 0.3)), rot: (o.rot || 0) + Math.sin(age * 20) * 0.04 * (1 - k) });
}

// ---- full-frame effects -------------------------------------------------------------------------

function flash(k, color = '#FFFFFF') { if (k > 0.001) fillScreen(color, clamp(k)); }

/** Everything outside a circle painted in `color` (iris in/out). */
function iris(cx, cy, r, color = PAL.ink) {
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.arc(cx, cy, Math.max(0, r), 0, TAU, true);
  ctx.fillStyle = color; ctx.fill('evenodd');
  ctx.restore();
}

/** Radiating speed lines from (cx, cy). k is strength 0..1. */
function speedLines(t, cx, cy, k, color = '#FFFFFF', n = 48, seed = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = color;
  const f = Math.floor(t * 24);
  for (let i = 0; i < n; i++) {
    if (hash(i, f + seed) > 0.7) continue;
    const a = (i / n) * TAU + hash(i, seed) * 0.1;
    const r0 = 380 + hash(i, f) * 260, r1 = 1500, w = (0.006 + hash(i, 7) * 0.012) * k;
    ctx.globalAlpha = 0.55 * k;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1);
    ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1);
    ctx.fill();
  }
  ctx.restore();
}

/** Horizontal speed streaks, for side-on running. dir = -1 streaks move left. */
function streaks(t, k, color = '#FFFFFF', seed = 3, dir = -1) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = hash(i, seed) * H, len = 120 + hash(i, seed + 1) * 380, sp = 2600 + hash(i, 5) * 1800;
    const x = ((hash(i, 9) * (W + len) + dir * t * sp) % (W + len) + (W + len)) % (W + len) - len;
    ctx.globalAlpha = 0.35 * k; ctx.lineWidth = 3 + hash(i, 2) * 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  }
  ctx.restore();
}

/** Confetti over an area: falls from the top from time t0. */
function confetti(t, t0, o = {}) {
  if (t < t0) return;
  const n = o.n ?? 90, age = t - t0, cols = o.colors || [PAL.pink, PAL.gold, PAL.mint, PAL.blue, PAL.lilac, PAL.orange];
  for (let i = 0; i < n; i++) {
    const x0 = (o.x ?? 0) + hash(i, 1) * (o.w ?? W), vy = 260 + hash(i, 2) * 320;
    const burst = o.burst ? Math.max(0, 1 - age * 1.5) * (hash(i, 6) * 900) : 0;
    const y = (o.y ?? -40) - hash(i, 3) * 500 + vy * age - burst;
    if (y > H + 40) continue;
    const x = x0 + Math.sin(age * (2 + hash(i, 4) * 3) + i) * 40;
    ctx.save(); ctx.translate(x, y); ctx.rotate(age * (3 + hash(i, 5) * 6) + i);
    ctx.scale(1, Math.cos(age * (5 + hash(i, 7) * 5) + i));
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-9, -5, 18, 10);
    ctx.restore();
  }
}

/** Falling petals across the frame. */
function petals(t, n = 40, seed = 11, color = PAL.sakura) {
  for (let i = 0; i < n; i++) {
    const sp = 90 + hash(i, seed) * 120;
    const y = ((hash(i, seed + 1) * (H + 100) + t * sp) % (H + 100)) - 50;
    const x = ((hash(i, seed + 2) * (W + 200) - t * sp * 0.6) % (W + 200) + W + 200) % (W + 200) - 100 + Math.sin(t * 1.5 + i) * 30;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 3 + i));
    ell(0, 0, 13, 8, { fill: color, stroke: null });
    ctx.restore();
  }
}

/** A brush-stroke wipe covering the screen as k goes 0..1 (left to right). */
function wipe(k, color = PAL.ink, seed = 5) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = color;
  const bands = 7, bh = H / bands;
  for (let i = 0; i < bands; i++) {
    const d = hash(i, seed) * 0.25, kk = clamp((k - d) / (1 - 0.25));
    const x = -200 + (W + 400) * easeInOut(kk);
    ctx.beginPath();
    ctx.moveTo(-50, i * bh - 12);
    ctx.lineTo(x, i * bh - 12);
    ctx.quadraticCurveTo(x + 90, i * bh + bh / 2, x, (i + 1) * bh + 12);
    ctx.lineTo(-50, (i + 1) * bh + 12);
    ctx.fill();
  }
  ctx.restore();
}

/** Star/sparkle glyph. */
function sparkle(x, y, r, color = '#FFFFFF', rot = 0) {
  const pts = [];
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  poly(pts, { fill: color, stroke: null });
}
function starShape(x, y, r, inner = 0.45, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r * inner : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return pts;
}
function heartPts(x, y, r) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    pts.push([x + r * 0.06 * 16 * Math.pow(Math.sin(a), 3),
      y - r * 0.06 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]);
  }
  return pts;
}

/** A sunburst of alternating rays behind a hit. */
function sunburst(cx, cy, a, b, rot = 0, n = 18, r = 1800, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = rot + ((i + 1) / n) * TAU;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.closePath(); ctx.fillStyle = i % 2 ? a : b; ctx.fill();
  }
  ctx.restore();
}

// ---- the finish every frame gets ---------------------------------------------------------------

let grainCanvas = null;
function paperFinish(t) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 512; grainCanvas.height = 512;
    const g = grainCanvas.getContext('2d'), img = g.createImageData(512, 512);
    for (let i = 0; i < 512 * 512; i++) {
      const v = 128 + (hash(i, 99) - 0.5) * 70;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.1;
  const ox = Math.floor(hash(Math.floor(t * 12), 3) * 512), oy = Math.floor(hash(Math.floor(t * 12), 4) * 512);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512);
  ctx.restore();
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = rgrad(W / 2, H / 2, H * 0.6, H * 1.15, [[0, 'rgba(20,10,40,0)'], [1, 'rgba(20,10,40,0.2)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
