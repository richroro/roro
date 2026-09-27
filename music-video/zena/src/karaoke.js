// The karaoke kit for the Zena trot Short (1080x1920, portrait). Loaded after core.js.
//
// A fourth look: the whole Short is a 노래방 machine screen — song number on LED digits, the title
// card, the blue scenery with a full moon (it is a 추석 special), captions that fill in colour
// left to right like karaoke lyrics, a tinsel trot curtain, and at the end the applause screen.
// The people are 16-bit pixel sprites. They are real people, so the sprites have no eyes: the
// fringe covers them (at this size a sprite reads by its hair, outfit and pose anyway).
//
//   sprite(x, y, px, o)    a pixel person; (x, y) = feet centre, px = size of one pixel.
//       o: t, hair, outfit, trim, pose ('stand'|'sing'|'sway'|'cheer'|'clap'|'dance'|'bow'),
//          mic (true), long (long hair), flip, bob (0..1)
//   karaokeBg(t, o)        the blue karaoke scenery (moon, sea, pixel stars); o.hue shifts it
//   tinsel(t, x, y, w, h, colors)  a shimmering tinsel curtain
//   ledDigits(txt, x, y, h, color, o)  seven-segment LED text (digits and a few letters)
//   kLine(t, t0, t1, text, o)  a caption that wipes to colour from t0 to t1, like karaoke lyrics
//   kTitle(t, t0, t1, title, lines, o)  the song-title screen
//   kBanner(t, t0, t1, text, o)  a big boxed caption at the top (the 자막 bar of the show)
//   pixelFirework(t, t0, x, y, r, color) · pixelHeart(x, y, px, color) · bend(t, x, y, w, color) the 꺾기 squiggle
//   viewCounter(t, t0, value, suffix, x, y, size, o)
/* eslint-disable no-unused-vars */

const KR = {
  ink: '#10102A', navy: '#141C5C', blue: '#2438B8', sky: '#3E6BFF', cyan: '#39E6FF', yellow: '#FFE14D',
  pink: '#FF4FA3', red: '#FF3B3B', gold: '#FFC23D', white: '#FFFFFF', green: '#5CFF8A', purple: '#8A4DFF',
  skin: '#FFD8BE', skinSh: '#E9B597',
};

// ---- pixel sprites ------------------------------------------------------------------------------

// The body without arms, 16 wide. H hair, S skin, O outfit, o outfit shade, T trim, P legs, B shoes, K ink.
const BODY = [
  '....KKKKKKKK....',
  '...KHHHHHHHHK...',
  '..KHHHHHHHHHHK..',
  '..KHHHHHHHHHHK..',
  '..KHHHHHHHHHHK..',
  '..KHHHHHHHHHHK..',
  '..KHSSSSSSSSHK..',
  '..KHSSSSSSSSHK..',
  '..KHHSSSSSSHHK..',
  '..KHHKSSSSKHHK..',
  '...KKKTSSTKKK...',
  '...KOOTTTTOOK...',
  '...KOOOOOOOOK...',
  '...KOoOOOOoOK...',
  '...KOoOOOOoOK...',
  '...KOOOOOOOOK...',
  '...KTTTTTTTTK...',
  '....KPPKKPPK....',
  '....KPPK.KPPK...',
  '....KPPK.KPPK...',
  '....KPPK.KPPK...',
  '...KBBBK.KBBBK..',
  '...KKKKK.KKKKK..',
];
const LONG = [[10, 2], [10, 13], [11, 2], [11, 13], [12, 2], [12, 13], [13, 2], [13, 13]];

function px(x, y, s, c) { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, s + 0.6, s + 0.6); }

function sprite(x, y, s, o = {}) {
  const t = o.t ?? 0, pose = o.pose || 'stand';
  const col = {
    H: o.hair || '#2A1B2E', S: KR.skin, O: o.outfit || KR.pink, o: mix(o.outfit || KR.pink, KR.ink, 0.3),
    T: o.trim || KR.gold, P: o.legs || '#2A2440', B: o.shoes || '#FFFFFF', K: KR.ink,
  };
  const beat = typeof SONG !== 'undefined' ? beatOf(t) : t * 2;
  const bob = Math.round((o.bob ?? 0) * Math.abs(Math.sin(Math.PI * beat)) * 1);
  const sway = pose === 'sway' || pose === 'dance' ? Math.round(Math.sin(Math.PI * beat)) : 0;
  ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
  ctx.translate(-8 * s, -23 * s - bob * s);
  // sparkle on the outfit (a trot jacket) — a pixel that twinkles
  BODY.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const k = row[c]; if (k === '.') continue;
      const dx = r < 11 ? sway : 0;
      px(c + dx, r, s, col[k]);
    }
  });
  if (o.long) for (const [r, c] of LONG) px(c + sway, r, s, col.H);
  // twinkles on the jacket
  for (let i = 0; i < 3; i++) if (frac(t * 1.7 + i * 0.37) < 0.3) px(5 + i * 2, 12 + (i % 2) * 2, s, '#FFFFFF');

  // arms: 2-pixel-wide strokes from the shoulder to the hand, per pose
  const phase = Math.sin(Math.PI * beat);
  const arms = {
    stand: [[[4, 12], [3, 14], [3, 16]], [[11, 12], [12, 14], [12, 16]]],
    sing: [[[4, 12], [3, 14], [3, 16]], [[11, 12], [12, 11], [10, 9]]],
    sway: [[[4, 12], [2, 13 + Math.round(phase)], [1, 15]], [[11, 12], [12, 11], [10, 9]]],
    cheer: [[[4, 12], [2, 9], [2, 6 - (phase > 0 ? 1 : 0)]], [[11, 12], [13, 9], [13, 6 - (phase > 0 ? 0 : 1)]]],
    clap: [[[4, 12], [5, 11], phase > 0 ? [7, 10] : [6, 10]], [[11, 12], [10, 11], phase > 0 ? [8, 10] : [9, 10]]],
    dance: [[[4, 12], [2, phase > 0 ? 10 : 14], [1, phase > 0 ? 8 : 15]], [[11, 12], [13, phase > 0 ? 14 : 10], [14, phase > 0 ? 15 : 8]]],
    bow: [[[4, 12], [5, 14], [6, 15]], [[11, 12], [10, 14], [9, 15]]],
  }[pose] || [];
  const armPx = (pts, pass) => {
    const paint1 = (xx, yy, c) => {
      if (pass === 0) { for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(xx + ox, yy + oy, s, KR.ink); }
      else px(xx, yy, s, c);
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) {
        const xx = Math.round(x0 + (x1 - x0) * k / n), yy = Math.round(y0 + (y1 - y0) * k / n);
        paint1(xx + (yy < 11 ? sway : 0), yy, col.o);
      }
    }
    const [hx, hy] = pts[pts.length - 1];
    paint1(hx + (hy < 11 ? sway : 0), hy, col.S);
  };
  arms.forEach(a => armPx(a, 0)); arms.forEach(a => armPx(a, 1));
  // the microphone in the right hand
  if (o.mic !== false && (pose === 'sing' || pose === 'sway')) {
    const hx = 10 + sway, hy = 9;
    px(hx, hy - 1, s, '#3A3A48'); px(hx - 1, hy - 2, s, '#C9CCD8'); px(hx, hy - 2, s, '#E8EAF2'); px(hx - 1, hy - 3, s, '#9EA2B0');
  }
  ctx.restore();
}

// ---- the karaoke screen --------------------------------------------------------------------------

function karaokeBg(t, o = {}) {
  const top = o.top || '#0B0F3A', mid = o.mid || '#1C2A8A', low = o.low || '#3A1B6E';
  fillScreen(lgrad(0, 0, 0, H, [[0, top], [0.55, mid], [1, low]]));
  // pixel stars
  for (let i = 0; i < 70; i++) {
    const x = hash(i, 1) * W, y = hash(i, 2) * H * 0.55, on = frac(t * hrange(0.3, 1.2, i, 3) + hash(i, 4)) < 0.6;
    if (on) { ctx.fillStyle = i % 5 ? '#FFFFFF' : KR.yellow; const q = i % 3 ? 6 : 10; ctx.fillRect(Math.round(x / 6) * 6, Math.round(y / 6) * 6, q, q); }
  }
  // the full moon (추석): a pixelated disc with craters
  if (o.moon !== false) {
    const mx = o.moonX ?? 780, my = o.moonY ?? 520, mr = o.moonR ?? 150, q = 10;
    glow(mx, my, mr * 2.4, '#FFF3B0', 0.35);
    for (let yy = -mr; yy <= mr; yy += q) for (let xx = -mr; xx <= mr; xx += q) {
      const d = Math.hypot(xx, yy); if (d > mr) continue;
      const crater = hash(Math.floor(xx / 40) + 11, Math.floor(yy / 40) + 7) > 0.8 && d < mr * 0.8;
      ctx.fillStyle = crater ? '#F2D680' : d > mr - q * 1.5 ? '#FFE9A0' : '#FFF6C8';
      ctx.fillRect(mx + xx, my + yy, q, q);
    }
  }
  // the sea: stepped pixel waves that roll
  if (o.sea !== false) {
    const sy = o.seaY ?? 1180;
    fillRect0(0, sy, W, H - sy, lgrad(0, sy, 0, H, [[0, '#1B3FA8'], [1, '#0B1650']]));
    for (let r = 0; r < 9; r++) {
      const yy = sy + 24 + r * 60, sp = 30 + r * 12, off = (t * sp) % 120;
      ctx.fillStyle = rgba('#8FB4FF', 0.5 - r * 0.04);
      for (let x = -120 + off; x < W; x += 120) ctx.fillRect(Math.round(x / 6) * 6, yy, 54, 6);
    }
    // the moon's path on the water
    if (o.moon !== false) for (let r = 0; r < 12; r++) {
      const yy = sy + 10 + r * 44, w = 120 - r * 6 + Math.sin(t * 3 + r) * 20;
      ctx.fillStyle = rgba('#FFF3B0', 0.55 - r * 0.035); ctx.fillRect(Math.round(((o.moonX ?? 780) - w / 2) / 6) * 6, yy, Math.round(w / 6) * 6, 8);
    }
  }
}
function fillRect0(x, y, w, h, style) { ctx.fillStyle = style; ctx.fillRect(x, y, w, h); }

/** A tinsel curtain: vertical strands that shimmer in stripes. */
function tinsel(t, x, y, w, h, colors = [KR.gold, '#FFF1A8', '#E0A020']) {
  const n = Math.floor(w / 12);
  for (let i = 0; i < n; i++) {
    const sx = x + i * 12 + Math.sin(t * 2 + i * 0.7) * 3;
    const lit = 0.5 + 0.5 * Math.sin(t * 6 - i * 0.45);
    const c = colors[i % colors.length];
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mix(c, '#FFFFFF', lit * 0.6)); g.addColorStop(0.5, c); g.addColorStop(1, mix(c, '#000000', 0.35));
    ctx.fillStyle = g; ctx.fillRect(sx, y, 6, h - (hash(i, 5) * 40));
  }
}

// Seven-segment LED digits. Supports 0-9, '-', ' ', ':' and a few letters (A b C d E F H L n o P r t U).
const SEG = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd',
  '-': 'g', ' ': '', A: 'abcefg', b: 'cdefg', C: 'adef', d: 'bcdeg', E: 'adefg', F: 'aefg', H: 'bcefg', L: 'def', n: 'ceg', o: 'cdeg', P: 'abefg', r: 'eg', t: 'defg', U: 'bcdef',
};
function ledDigits(txt, x, y, h, color = KR.red, o = {}) {
  const w = h * 0.55, th = h * 0.12, gap = h * 0.22;
  let cx = x - (o.align === 'center' ? (txt.length * (w + gap) - gap) / 2 : 0);
  for (const ch of String(txt)) {
    if (ch === ':') { for (const k of [0.3, 0.7]) { ctx.fillStyle = color; ctx.fillRect(cx, y + h * k - th / 2, th, th); } cx += th + gap; continue; }
    const on = SEG[ch] ?? '';
    const segs = { a: [0, 0, 1, 0], b: [1, 0, 1, 0.5], c: [1, 0.5, 1, 1], d: [0, 1, 1, 1], e: [0, 0.5, 0, 1], f: [0, 0, 0, 0.5], g: [0, 0.5, 1, 0.5] };
    for (const [k, [x0, y0, x1, y1]] of Object.entries(segs)) {
      const lit = on.includes(k);
      ctx.fillStyle = lit ? color : rgba(color, 0.1);
      if (lit && o.glow !== false) { ctx.shadowColor = color; ctx.shadowBlur = h * 0.25; }
      const X0 = cx + x0 * w, Y0 = y + y0 * h, X1 = cx + x1 * w, Y1 = y + y1 * h;
      if (y0 === y1) ctx.fillRect(X0 + th * 0.6, Y0 - th / 2, X1 - X0 - th * 1.2, th);
      else ctx.fillRect(X0 - th / 2, Y0 + th * 0.6, th, Y1 - Y0 - th * 1.2);
      ctx.shadowBlur = 0;
    }
    cx += w + gap;
  }
}

/** A karaoke-style caption: white with a dark outline, filling left to right with colour. */
function kLine(t, t0, t1, text, o = {}) {
  const inK = clamp((t - (t0 - 0.35)) / 0.2), out = clamp(((o.hold ?? t1 + 0.9) - t) / 0.2);
  if (inK <= 0 || out <= 0) return;
  const size = o.size || 72, y = o.y ?? 1420, fill = o.fill || KR.yellow;
  const lines = text.split('\n');
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = inK * out;
  ctx.font = `${size}px ${o.font || FONT.bold}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // total width across lines so the wipe runs line by line
  const widths = lines.map(l => ctx.measureText(l).width), total = widths.reduce((a, b) => a + b, 0);
  const prog = clamp((t - t0) / Math.max(0.01, t1 - t0)) * total;
  let acc = 0;
  lines.forEach((ln, i) => {
    const w = widths[i], x0 = (o.x ?? W / 2) - w / 2, yy = y + i * size * 1.28;
    ctx.textAlign = 'left';
    ctx.lineWidth = size * 0.22; ctx.strokeStyle = o.outline || KR.navy; ctx.strokeText(ln, x0, yy);
    ctx.fillStyle = o.base || KR.white; ctx.fillText(ln, x0, yy);
    const p = clamp(prog - acc, 0, w);
    if (p > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, yy - size, p + 4, size * 2); ctx.clip();
      ctx.lineWidth = size * 0.22; ctx.strokeStyle = o.outline2 || '#7A0E4A'; ctx.strokeText(ln, x0, yy);
      ctx.fillStyle = fill; ctx.fillText(ln, x0, yy);
      ctx.restore();
    }
    acc += w;
  });
  ctx.restore();
}

/** The song-title screen of a karaoke machine. */
function kTitle(t, t0, t1, title, lines = [], o = {}) {
  const k = clamp((t - t0) / 0.3), out = clamp((t1 - t) / 0.25);
  if (k <= 0 || out <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = out;
  const y = o.y ?? 700, s = backOut(k);
  ctx.translate(W / 2, y); ctx.scale(s, s);
  const tl = title.split('\n'), size = o.size || 110;
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  tl.forEach((ln, i) => {
    const yy = (i - (tl.length - 1) / 2) * size * 1.2;
    ctx.lineWidth = size * 0.3; ctx.strokeStyle = KR.ink; ctx.strokeText(ln, 0, yy);
    ctx.lineWidth = size * 0.14; ctx.strokeStyle = o.edge || KR.pink; ctx.strokeText(ln, 0, yy);
    ctx.fillStyle = (o.colors && o.colors[i]) || KR.white; ctx.fillText(ln, 0, yy);
  });
  ctx.font = `${o.sub || 50}px ${FONT.round}`;
  lines.forEach((ln, i) => {
    const yy = (tl.length / 2) * size * 1.2 + 50 + i * 70;
    ctx.lineWidth = 12; ctx.strokeStyle = KR.ink; ctx.strokeText(ln, 0, yy);
    ctx.fillStyle = KR.cyan; ctx.fillText(ln, 0, yy);
  });
  ctx.restore();
}

/** A boxed caption across the top, like the 자막 bar of a TV music show. */
function kBanner(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.2), out = clamp((t1 - t) / 0.2);
  if (k <= 0 || out <= 0) return;
  const size = o.size || 76, lines = text.split('\n'), y = o.y ?? 300;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = out;
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 90, h = lines.length * size * 1.22 + 50;
  const sx = lerp(0.2, 1, easeOut(k));
  ctx.translate(W / 2, y + h / 2); ctx.scale(sx, 1);
  rrect(-w / 2, -h / 2, w, h, 18, { fill: o.bg || KR.pink, stroke: KR.ink, lw: 8 });
  rrect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 12, { fill: null, stroke: rgba('#FFFFFF', 0.6), lw: 4 });
  lines.forEach((ln, i) => {
    const yy = (i - (lines.length - 1) / 2) * size * 1.22 + 4;
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = KR.ink; ctx.lineJoin = 'round'; ctx.strokeText(ln, 0, yy);
    ctx.fillStyle = (o.colors && o.colors[i]) || o.color || KR.white; ctx.fillText(ln, 0, yy);
  });
  ctx.restore();
}

function pixelFirework(t, t0, x, y, r, color = KR.yellow) {
  const age = t - t0; if (age < 0 || age > 1.6) return;
  const k = easeOut(clamp(age / 0.9)), fade = 1 - clamp((age - 0.8) / 0.8);
  ctx.save(); ctx.globalAlpha *= fade; ctx.fillStyle = color;
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, rr = r * k;
    for (let j = 0; j < 3; j++) {
      const q = rr * (1 - j * 0.12);
      const px0 = Math.round((x + Math.cos(a) * q) / 8) * 8, py0 = Math.round((y + Math.sin(a) * q + age * age * 60) / 8) * 8;
      ctx.fillRect(px0, py0, 8, 8);
    }
  }
  ctx.restore();
}

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function pixelHeart(x, y, s, color = KR.pink) {
  HEART.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === 'X') { ctx.fillStyle = color; ctx.fillRect(x + (c - 3.5) * s, y + (r - 3) * s, s + 0.5, s + 0.5); } });
}

/** The 꺾기 squiggle: a pitch line that holds, bends down and flicks up, drawn as it goes. */
function bend(t, t0, x, y, w, color = KR.cyan, o = {}) {
  const k = clamp((t - t0) / (o.dur ?? 0.8)); if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = o.lw ?? 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.beginPath();
  const n = 60;
  for (let i = 0; i <= n * k; i++) {
    const u = i / n, xx = x + u * w;
    const yy = y + (u < 0.4 ? 0 : u < 0.6 ? Math.sin((u - 0.4) / 0.2 * Math.PI) * 40 : -Math.sin((u - 0.6) / 0.4 * Math.PI * 3) * 26 * (1 - (u - 0.6) / 0.4));
    if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.stroke(); ctx.restore();
}

/** A view counter that rolls up to value and slams. */
function viewCounter(t, t0, value, suffix, x, y, size, o = {}) {
  const age = t - t0; if (age < 0) return;
  const dur = o.dur ?? 1.0, k = easeOut(clamp(age / dur));
  const v = Math.round(value * k);
  const slam = age > dur ? 1 + 0.2 * Math.exp(-(age - dur) * 10) : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(slam, slam);
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const txt = `${v.toLocaleString('ko-KR')}${suffix}`;
  ctx.lineWidth = size * 0.28; ctx.strokeStyle = KR.ink; ctx.strokeText(txt, 0, 0);
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = o.edge || KR.pink; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = o.color || KR.yellow; ctx.fillText(txt, 0, 0);
  ctx.restore();
}
