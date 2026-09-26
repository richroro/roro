// The yarn kit for the Threads-culture Short (1080x1920, portrait). Loaded after core.js.
//
// A third look, different from the anime Short and the chibi Short: everyone is a little ball of
// yarn (a thread, a 타래 — the Korean word for a run of Threads posts is also the word for a skein),
// with felt eyes and a stitched mouth. They are made up, not real people, so they get full faces.
// The world is craft: knitted backgrounds, felt cards, stitched labels, and strands of yarn that
// tie the balls together. The show is a quiz: a word, a 3-2-1 timer on the beat, the answer.
//
//   yarnBall(x, y, r, o)   one character. (x, y) centre of the ball.
//       o: t, color, face ('happy'|'grin'|'shock'|'wink'|'cry'|'smug'|'think'|'love'|'stiff'),
//          look (-1..1 eye direction), arms ('none'|'wave'|'up'|'hips'|'type'|'point'), tie (a
//          stiff formal necktie + collar), glasses, hat ('none'|'beanie'|'bow'), squash (0..1),
//          tail (true: a loose strand trails off), seed
//   strand(pts, color, o)  a wobbly strand of yarn through points (o.t, o.w, o.wob)
//   knitBg(t, a, b)        a knitted background (rows of V stitches), colours a → b top to bottom
//   feltCard(x, y, w, h, o) a felt card with a dashed stitch border (o.fill, o.rot)
//   quizWord(t, t0, word, o)  the big question word on a felt card, pops in at t0
//   timer(t, t0, x, y, r)  3-2-1 ring that ticks on the beat after t0 (3 beats) then "땡!"
//   answer(t, t0, text, o) the answer on a stitched label, pops in at t0
//   stitchTag(t, t0, t1, text, o) / stitchSub(...)  captions (top third), in Jua
//   bubble(x, y, text, size, o) a speech bubble · hearts(...) · phoneFeed(x, y, s, fn, o)
//   bigNum(t, t0, text, x, y, size, o)  a number that counts up and slams
/* eslint-disable no-unused-vars */

const YARN = {
  ink: '#2E2436', paper: '#FFF4E6', red: '#FF6B6B', coral: '#FF9A76', mustard: '#FFC857',
  mint: '#6BD3B0', teal: '#3FA7B5', blue: '#6C8CFF', lilac: '#B48CFF', pink: '#FF8CC6',
  cream: '#FFF8EE', brown: '#8A5A44', night: '#2B2140',
};
const HAND = FONT.round;   // Jua: round and bold enough to read on a phone

// ---- a ball of yarn with a face ---------------------------------------------------------------

function yarnBall(x, y, r, o = {}) {
  const t = o.t ?? 0, c = o.color || YARN.coral, seed = o.seed ?? 0;
  const dark = mix(c, YARN.ink, 0.35), lite = mix(c, '#FFFFFF', 0.35);
  const sq = o.squash ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.18, 1 - sq * 0.18);

  // a loose strand trailing off the bottom
  if (o.tail) strand([[r * 0.3, r * 0.85], [r * 0.9, r * 1.2], [r * 1.5, r * 1.05], [r * 2.1, r * 1.3]], c, { t, w: r * 0.07 });

  // arms: two short strands with a little knot for a hand
  const arms = o.arms || 'none';
  const armPts = {
    wave: [[[-r * 0.9, r * 0.1], [-r * 1.25, r * 0.35], [-r * 1.35, r * 0.55]], [[r * 0.9, -r * 0.05], [r * 1.3, -r * 0.45], [r * 1.35 + Math.sin(t * 10) * r * 0.12, -r * 0.85]]],
    up: [[[-r * 0.85, -r * 0.2], [-r * 1.2, -r * 0.7], [-r * 1.25, -r * 1.05]], [[r * 0.85, -r * 0.2], [r * 1.2, -r * 0.7], [r * 1.25, -r * 1.05]]],
    hips: [[[-r * 0.9, r * 0.1], [-r * 1.25, r * 0.25], [-r * 0.95, r * 0.45]], [[r * 0.9, r * 0.1], [r * 1.25, r * 0.25], [r * 0.95, r * 0.45]]],
    type: [[[-r * 0.8, r * 0.4], [-r * 0.6, r * 0.85], [-r * 0.3 + Math.sin(t * 22) * r * 0.06, r * 1.0]], [[r * 0.8, r * 0.4], [r * 0.6, r * 0.85], [r * 0.3 + Math.cos(t * 22) * r * 0.06, r * 1.0]]],
    point: [[[-r * 0.9, r * 0.1], [-r * 1.25, r * 0.35], [-r * 1.35, r * 0.55]], [[r * 0.9, 0], [r * 1.35, -r * 0.1], [r * 1.75, -r * 0.2]]],
  }[arms];
  if (armPts) for (const pts of armPts) {
    stroke(pts, c, r * 0.13, { ink: YARN.ink, olw: 8, smooth: true });
    circle(pts[2][0], pts[2][1], r * 0.12, { fill: lite, stroke: YARN.ink, lw: 5 });
  }

  // the ball
  circle(0, 0, r, { fill: c, stroke: YARN.ink, lw: 7 });
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, TAU); ctx.clip();
  // wound strands: arcs in bands at several angles
  ctx.lineCap = 'round';
  for (let band = 0; band < 3; band++) {
    const rot = hash(seed, band) * TAU + band * 1.1;
    ctx.save(); ctx.rotate(rot);
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.ellipse(0, i * r * 0.16, r * 1.05, r * 0.28, 0, band % 2 ? 0 : Math.PI, band % 2 ? Math.PI : TAU);
      ctx.strokeStyle = i % 2 ? dark : lite; ctx.globalAlpha = 0.35; ctx.lineWidth = r * 0.05;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // shade and shine
  ctx.fillStyle = rgrad(-r * 0.35, -r * 0.4, r * 0.1, r * 1.3, [[0, 'rgba(255,255,255,0.25)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(40,20,50,0.35)']]);
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();

  // formal armour: collar + necktie
  if (o.tie) {
    poly([[-r * 0.42, r * 0.5], [0, r * 0.62], [-r * 0.2, r * 0.8]], { fill: '#FFFFFF', stroke: YARN.ink, lw: 5 });
    poly([[r * 0.42, r * 0.5], [0, r * 0.62], [r * 0.2, r * 0.8]], { fill: '#FFFFFF', stroke: YARN.ink, lw: 5 });
    poly([[-r * 0.08, r * 0.62], [r * 0.08, r * 0.62], [r * 0.12, r * 0.95], [0, r * 1.08], [-r * 0.12, r * 0.95]], { fill: YARN.blue, stroke: YARN.ink, lw: 5 });
  }

  // face
  const face = o.face || 'happy', lk = (o.look ?? 0) * r * 0.08;
  const ex = r * 0.3, ey = -r * 0.08, er = r * 0.15;
  const blink = frac(t * 0.37 + hash(seed, 9)) > 0.96;
  const eye = (sx) => {
    const px = sx * ex + lk;
    if (face === 'happy' || face === 'grin' || (face === 'wink' && sx > 0)) {
      stroke([[px - er, ey + er * 0.3], [px, ey - er * 0.5], [px + er, ey + er * 0.3]], YARN.ink, r * 0.06, { ink: null, smooth: true });
    } else if (face === 'love') {
      poly(heartPts(px, ey - er * 0.1, er * 1.1), { fill: YARN.red, stroke: YARN.ink, lw: 4 });
    } else if (face === 'cry') {
      stroke([[px - er, ey], [px + er, ey]], YARN.ink, r * 0.06, { ink: null });
      const len = r * (0.25 + 0.15 * Math.sin(t * 8 + sx));
      stroke([[px, ey + er * 0.5], [px + sx * 3, ey + er * 0.5 + len]], '#7FD4FF', r * 0.08, { ink: null, alpha: 0.9 });
    } else if (face === 'smug') {
      ell(px, ey, er, er * 0.55, { fill: YARN.ink, stroke: null });
      stroke([[px - er * 1.2, ey - er * 0.4], [px + er * 1.2, ey - er * 0.7]], c === YARN.ink ? '#fff' : dark, r * 0.07, { ink: null });
    } else if (face === 'stiff') {
      ell(px, ey, er * 0.55, er * 0.55, { fill: YARN.ink, stroke: null });
    } else if (blink && face !== 'shock') {
      stroke([[px - er, ey], [px + er, ey]], YARN.ink, r * 0.06, { ink: null });
    } else {
      const big = face === 'shock' ? 1.35 : 1;
      circle(px, ey, er * big, { fill: '#FFFFFF', stroke: YARN.ink, lw: 5 });
      circle(px + lk * 0.5, ey + er * 0.1, er * 0.55 * big, { fill: YARN.ink, stroke: null });
      circle(px + lk * 0.5 - er * 0.2, ey - er * 0.2, er * 0.18 * big, { fill: '#FFFFFF', stroke: null });
    }
  };
  eye(-1); eye(1);
  // blush
  ell(-r * 0.52, r * 0.18, r * 0.14, r * 0.07, { fill: '#FF7A9A', stroke: null, alpha: 0.55 });
  ell(r * 0.52, r * 0.18, r * 0.14, r * 0.07, { fill: '#FF7A9A', stroke: null, alpha: 0.55 });
  // mouth
  const my = r * 0.3;
  if (face === 'shock') ell(0, my + r * 0.05, r * 0.12, r * 0.17, { fill: '#7A2E3A', stroke: YARN.ink, lw: 5 });
  else if (face === 'grin' || face === 'love') smooth([[-r * 0.22, my - r * 0.04], [r * 0.22, my - r * 0.04], [0, my + r * 0.2]], { fill: '#7A2E3A', stroke: YARN.ink, lw: 5 });
  else if (face === 'cry') stroke([[-r * 0.15, my + r * 0.08], [0, my - r * 0.02], [r * 0.15, my + r * 0.08]], YARN.ink, r * 0.05, { ink: null, smooth: true });
  else if (face === 'stiff') stroke([[-r * 0.14, my], [r * 0.14, my]], YARN.ink, r * 0.05, { ink: null });
  else if (face === 'think') stroke([[-r * 0.12, my + r * 0.02], [r * 0.14, my - r * 0.04]], YARN.ink, r * 0.05, { ink: null });
  else if (face === 'smug') stroke([[-r * 0.14, my], [r * 0.05, my + r * 0.05], [r * 0.18, my - r * 0.06]], YARN.ink, r * 0.05, { ink: null, smooth: true });
  else stroke([[-r * 0.15, my - r * 0.02], [0, my + r * 0.1], [r * 0.15, my - r * 0.02]], YARN.ink, r * 0.05, { ink: null, smooth: true });

  if (o.glasses) {
    for (const sx of [-1, 1]) circle(sx * ex + lk, ey, er * 1.7, { fill: 'rgba(255,255,255,0.15)', stroke: YARN.ink, lw: 6 });
    stroke([[-ex + er * 1.7 + lk, ey], [ex - er * 1.7 + lk, ey]], YARN.ink, 6, { ink: null });
  }
  // hats
  if (o.hat === 'beanie') {
    smooth([[-r * 0.85, -r * 0.45], [-r * 0.6, -r * 1.05], [0, -r * 1.25], [r * 0.6, -r * 1.05], [r * 0.85, -r * 0.45]], { fill: YARN.mustard, stroke: YARN.ink, lw: 6 });
    rrect(-r * 0.92, -r * 0.6, r * 1.84, r * 0.26, r * 0.12, { fill: mix(YARN.mustard, YARN.ink, 0.15), stroke: YARN.ink, lw: 6 });
    circle(0, -r * 1.3, r * 0.2, { fill: YARN.cream, stroke: YARN.ink, lw: 5 });
  } else if (o.hat === 'bow') {
    for (const sx of [-1, 1]) poly([[r * 0.45, -r * 0.85], [r * 0.45 + sx * r * 0.4, -r * 1.1], [r * 0.45 + sx * r * 0.4, -r * 0.6]], { fill: YARN.pink, stroke: YARN.ink, lw: 5 });
    circle(r * 0.45, -r * 0.85, r * 0.1, { fill: YARN.pink, stroke: YARN.ink, lw: 5 });
  }
  ctx.restore();
}

/** A wobbly strand of yarn (a twisted look: a dark core with light twists). */
function strand(pts, color = YARN.coral, o = {}) {
  const t = o.t ?? 0, w = o.w ?? 12, wob = o.wob ?? 6;
  const P = pts.map(([x, y], i) => [x + Math.sin(t * 2.3 + i * 1.7) * wob, y + Math.cos(t * 1.9 + i * 1.3) * wob]);
  stroke(P, color, w, { ink: YARN.ink, olw: 6, smooth: true, alpha: o.alpha });
  // twists
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1) * 0.55; ctx.setLineDash([w * 0.5, w * 0.9]); ctx.lineDashOffset = -t * 30;
  ctx.strokeStyle = mix(color, '#FFFFFF', 0.45); ctx.lineWidth = w * 0.35; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
  ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]); ctx.stroke();
  ctx.restore();
}

// ---- craft world -------------------------------------------------------------------------------

function knitBg(t, a = YARN.cream, b = mix(YARN.pink, YARN.cream, 0.5), o = {}) {
  fillScreen(lgrad(0, 0, 0, H, [[0, a], [1, b]]));
  const sw = o.stitch ?? 54, sh = sw * 0.8;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 0.1; ctx.strokeStyle = o.ink || YARN.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let row = 0, y = -sh; y < H + sh; row++, y += sh) {
    for (let x = (row % 2) * 0 - sw, col = 0; x < W + sw; x += sw, col++) {
      ctx.beginPath();
      ctx.ellipse(x + sw * 0.28, y + sh * 0.5, sw * 0.2, sh * 0.5, -0.5, 0, TAU);
      ctx.ellipse(x + sw * 0.72, y + sh * 0.5, sw * 0.2, sh * 0.5, 0.5, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function feltCard(x, y, w, h, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
  rrect(-w / 2 + 10, -h / 2 + 14, w, h, 34, { fill: 'rgba(40,20,50,0.25)', stroke: null });
  rrect(-w / 2, -h / 2, w, h, 34, { fill: o.fill || YARN.cream, stroke: YARN.ink, lw: 7 });
  ctx.setLineDash([22, 16]); rrect(-w / 2 + 18, -h / 2 + 18, w - 36, h - 36, 22, { fill: null, stroke: o.stitch || mix(o.fill || YARN.cream, YARN.ink, 0.45), lw: 6 });
  ctx.setLineDash([]);
  if (o.fn) o.fn(w, h);
  ctx.restore();
}

function handText(txt, x, y, size, color = YARN.ink, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
  ctx.font = `${o.weight || 400} ${size}px ${o.font || HAND}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.outline) { ctx.lineWidth = o.outline; ctx.strokeStyle = o.outlineColor || YARN.ink; ctx.lineJoin = 'round'; ctx.strokeText(txt, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(txt, 0, 0);
  ctx.restore();
}

/** The quiz word, big, on a felt card: "Q." corner tag + the word. */
function quizWord(t, t0, word, o = {}) {
  const k = clamp((t - t0) / 0.3); if (k <= 0) return;
  const s = backOut(k), x = o.x ?? W / 2, y = o.y ?? 560;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate((o.rot ?? -0.03) + Math.sin(t * 3) * 0.01);
  const w = o.w ?? 760, h = o.h ?? 330;
  feltCard(0, 0, w, h, { fill: o.fill || YARN.mustard });
  rrect(-w / 2 - 20, -h / 2 - 40, 150, 90, 40, { fill: YARN.red, stroke: YARN.ink, lw: 7 });
  handText(o.q || 'Q.', -w / 2 + 55, -h / 2 + 4, 68, '#FFFFFF');
  ctx.font = `${o.size || 190}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 18; ctx.strokeStyle = YARN.ink; ctx.lineJoin = 'round'; ctx.strokeText(word, 0, 16);
  ctx.fillStyle = '#FFFFFF'; ctx.fillText(word, 0, 16);
  ctx.restore();
}

/** 3-2-1 on the next three beats after t0, then 땡! */
function timer(t, t0, x, y, r = 110) {
  const b = SONG.beat, age = t - t0; if (age < 0 || age > b * 4.6) return;
  const n = Math.floor(age / b), f = frac(age / b);
  const label = n < 3 ? String(3 - n) : '땡!';
  const pop = 1 + 0.25 * Math.exp(-f * 8);
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  circle(0, 0, r, { fill: n < 3 ? YARN.cream : YARN.red, stroke: YARN.ink, lw: 8 });
  if (n < 3) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r - 14, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - (n + f) / 3)); ctx.closePath();
    ctx.fillStyle = rgba(YARN.mint, 0.6); ctx.fill();
  }
  handText(label, 0, 6, n < 3 ? r * 1.2 : r * 0.75, n < 3 ? YARN.ink : '#FFFFFF');
  ctx.restore();
}

/** The answer on a stitched label. text may have \n. */
function answer(t, t0, text, o = {}) {
  const k = clamp((t - t0) / 0.28); if (k <= 0) return;
  const lines = text.split('\n'), size = o.size || 78, x = o.x ?? W / 2, y = o.y ?? 900;
  ctx.save(); ctx.translate(x, y); const s = backOut(k); ctx.scale(s, s); ctx.rotate(o.rot ?? 0.02);
  ctx.font = `${size}px ${HAND}`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 110, h = lines.length * size * 1.15 + 70;
  feltCard(0, 0, w, h, { fill: o.fill || YARN.mint });
  lines.forEach((ln, i) => handText(ln, 0, (i - (lines.length - 1) / 2) * size * 1.15 + 4, size, o.color || YARN.ink));
  ctx.restore();
}

function stitchTag(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.22), out = clamp((t1 - t) / 0.18);
  if (k <= 0 || out <= 0) return;
  const lines = text.split('\n'), size = o.size || 96, y0 = o.y ?? 330;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = out;
  lines.forEach((ln, i) => {
    const kk = clamp((t - t0 - i * 0.07) / 0.22); if (kk <= 0) return;
    ctx.save(); ctx.translate(W / 2, y0 + i * size * 1.2); const s = backOut(kk); ctx.scale(s, s);
    ctx.rotate((o.rot ?? 0.02) * (i % 2 ? -1 : 1));
    ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.26; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(ln, 0, 0);
    ctx.lineWidth = size * 0.1; ctx.strokeStyle = YARN.ink; ctx.strokeText(ln, 0, 0);
    ctx.fillStyle = (o.colors && o.colors[i]) || o.color || YARN.red; ctx.fillText(ln, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function stitchSub(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.25), out = clamp((t1 - t) / 0.2);
  if (k <= 0 || out <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = k * out;
  const size = o.size || 58;
  text.split('\n').forEach((ln, i) => {
    const y = (o.y ?? 640) + i * size * 1.2 + (1 - easeOut(k)) * 16;
    handText(ln, W / 2, y, size, o.color || YARN.ink, { outline: 14, outlineColor: '#FFFFFF' });
  });
  ctx.restore();
}

function bubble(x, y, text, size, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.scale !== undefined) ctx.scale(o.scale, o.scale);
  ctx.font = `${size}px ${HAND}`;
  const lines = String(text).split('\n');
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), w = tw + size * 1.0, h = lines.length * size * 1.1 + size * 0.6;
  const fill = o.fill || '#FFFFFF', tail = o.tail ?? -1;
  poly([[tail * w * 0.15, h / 2 - 4], [tail * w * 0.32, h / 2 + size * 0.55], [tail * w * 0.02, h / 2 - 4]], { fill, stroke: YARN.ink, lw: 6 });
  rrect(-w / 2, -h / 2, w, h, Math.min(h / 2, 50), { fill, stroke: YARN.ink, lw: 6 });
  poly([[tail * w * 0.15, h / 2 - 7], [tail * w * 0.3, h / 2 + size * 0.45], [tail * w * 0.04, h / 2 - 7]], { fill, stroke: null });
  lines.forEach((ln, i) => handText(ln, 0, (i - (lines.length - 1) / 2) * size * 1.1 + 2, size, o.color || YARN.ink));
  ctx.restore();
}

function hearts(t, n, x, y, w, h, o = {}) {
  for (let i = 0; i < n; i++) {
    const sp = hrange(60, 170, i, 7), px = x + hash(i, 3) * w + Math.sin(t * 2 + i) * 18;
    const py = y + h - frac(hash(i, 5) + t * sp / h) * (h + 80);
    const r = hrange(14, 30, i, 9) * (o.scale ?? 1);
    poly(heartPts(px, py, r), { fill: [YARN.red, YARN.pink, YARN.coral, YARN.mustard][i % 4], stroke: YARN.ink, lw: 4, alpha: o.alpha ?? 0.9 });
  }
}

/** A plain phone showing a feed; fn(w, h) paints the screen (0,0 = top-left). No app logos. */
function phoneFeed(x, y, s, fn, o = {}) {
  const w = 460, h = 900;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  rrect(-w / 2 - 24, -h / 2 - 24, w + 48, h + 48, 64, { fill: o.body || YARN.night, stroke: YARN.ink, lw: 8 });
  ctx.save(); rrectPath(-w / 2, -h / 2, w, h, 44); ctx.clip(); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = o.screen || '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  fn && fn(w, h);
  ctx.restore();
  rrect(-56, -h / 2 + 12, 112, 24, 12, { fill: YARN.night, stroke: null });
  ctx.restore();
}

/** A post in a feed: a yarn avatar, a name bar, the text, and heart/reply/repost counters. */
function post(x, y, w, text, o = {}) {
  const t = o.t ?? 0, size = o.size || 34;
  ctx.save(); ctx.translate(x, y);
  yarnBall(44, 44, 34, { t, color: o.color || YARN.coral, face: o.face || 'happy', seed: o.seed ?? 1 });
  handText(o.name || '스친', 100, 30, 30, YARN.ink, { align: 'left' });
  const lines = String(text).split('\n');
  lines.forEach((ln, i) => handText(ln, 100, 80 + i * size * 1.2, size, '#3A3040', { align: 'left' }));
  const by = 80 + lines.length * size * 1.2 + 10;
  if (o.icons !== false) {
    poly(heartPts(118, by, 16), { fill: o.liked ? YARN.red : null, stroke: YARN.ink, lw: 4 });
    circle(190, by, 14, { fill: null, stroke: YARN.ink, lw: 4 });
    stroke([[244, by - 8], [270, by - 8], [270, by + 8]], YARN.ink, 4, { ink: null });
    stroke([[270, by + 8], [244, by + 8], [244, by - 8]], YARN.ink, 4, { ink: null });
  }
  ctx.restore();
  return by + 30;
}

/** A number that counts up from 0 over `dur` and slams at the end. */
function bigNum(t, t0, value, suffix, x, y, size, o = {}) {
  const age = t - t0; if (age < 0) return;
  const dur = o.dur ?? 0.9, k = clamp(age / dur), v = o.decimals ? (value * easeOut(k)).toFixed(o.decimals) : Math.round(value * easeOut(k)).toLocaleString('ko-KR');
  const slam = age > dur ? 1 + 0.25 * Math.exp(-(age - dur) * 10) : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(slam, slam); ctx.rotate(o.rot ?? -0.04);
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const txt = `${v}${suffix}`;
  ctx.lineWidth = size * 0.26; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(txt, 0, 0);
  ctx.lineWidth = size * 0.1; ctx.strokeStyle = YARN.ink; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = o.color || YARN.red; ctx.fillText(txt, 0, 0);
  ctx.restore();
}
