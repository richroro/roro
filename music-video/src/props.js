// The recurring sets and props: the town, the school, the classroom, clocks, desks, trees.
// Everything takes world coordinates and paints in the same flat, ink-outlined style as the cast.

/* eslint-disable no-unused-vars */

// ---- sky things ---------------------------------------------------------------------------------

function sun(x, y, r, color = PAL.sun, t = 0) {
  glow(x, y, r * 3.2, color, 0.55);
  circle(x, y, r, { fill: color, stroke: null });
  circle(x - r * 0.25, y - r * 0.25, r * 0.55, { fill: rgba('#FFFFFF', 0.25), stroke: null });
}

function moon(x, y, r) {
  glow(x, y, r * 3, '#CFE3FF', 0.35);
  circle(x, y, r, { fill: '#FFF6D6', stroke: null });
  circle(x - r * 0.3, y + r * 0.2, r * 0.18, { fill: '#EBDDB0', stroke: null });
  circle(x + r * 0.25, y - r * 0.3, r * 0.12, { fill: '#EBDDB0', stroke: null });
}

function stars(t, n = 80, seed = 3, alpha = 1, yMax = H * 0.7) {
  for (let i = 0; i < n; i++) {
    const x = hash(i, seed) * W, y = hash(i, seed + 1) * yMax;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + hash(i, 4) * 3) + i);
    const r = 1.5 + hash(i, 5) * 3;
    ctx.save(); ctx.globalAlpha *= alpha * tw;
    if (hash(i, 6) > 0.9) sparkle(x, y, r * 3, '#FFFFFF', t * 0.3);
    else circle(x, y, r, { fill: '#FFFFFF', stroke: null });
    ctx.restore();
  }
}

function cloud(x, y, s, color = '#FFFFFF', o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const puffs = [[-110, 10, 70], [-40, -30, 95], [50, -20, 85], [120, 15, 60], [0, 25, 80]];
  ctx.beginPath();
  for (const [px, py, r] of puffs) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
  paint({ fill: color, stroke: o.stroke === undefined ? null : o.stroke, lw: 6 });
  if (o.shade !== false) {
    ctx.beginPath(); ctx.rect(-200, 30, 400, 120); ctx.clip();
    ctx.beginPath();
    for (const [px, py, r] of puffs) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
    ctx.fillStyle = rgba('#B8C6F0', 0.35); ctx.fill();
  }
  ctx.restore();
}

/** A drifting layer of clouds across the frame. */
function cloudLayer(t, y, s, speed, seed, color = '#FFFFFF', n = 5) {
  for (let i = 0; i < n; i++) {
    const span = W + 700;
    const x = ((hash(i, seed) * span + t * speed) % span + span) % span - 350;
    cloud(x, y + hash(i, seed + 1) * 120 - 60, s * (0.7 + hash(i, seed + 2) * 0.6), color);
  }
}

// ---- the town -----------------------------------------------------------------------------------

/**
 * A row of apartment blocks and low houses along y (their feet), scrolled by `scroll`.
 * o: { tone (a base colour), lit (0..1 night windows), seed, far (bool: flatter, paler) }
 */
function townRow(t, y, scroll = 0, o = {}) {
  const seed = o.seed ?? 1, tone = o.tone || '#F2C9A0', lit = o.lit || 0, far = !!o.far;
  const span = 2600;
  for (let i = 0; i < 14; i++) {
    const bw = 150 + hash(i, seed) * 170, bh = (far ? 220 : 260) + hash(i, seed + 1) * (far ? 260 : 380);
    let x = ((i * 190 + hash(i, seed + 2) * 60 - scroll) % span + span) % span - 300;
    const col = mix(tone, hash(i, seed + 3) > 0.5 ? '#FFFFFF' : '#9C8AB8', far ? 0.35 : 0.18 + hash(i, seed + 4) * 0.2);
    rrect(x, y - bh, bw, bh + 10, 8, { fill: col, stroke: far ? null : PAL.ink, lw: 5 });
    if (!far) {
      rrect(x - 6, y - bh - 14, bw + 12, 22, 6, { fill: mix(col, PAL.ink, 0.25), lw: 5 });
      // windows
      const cols = Math.max(2, Math.floor(bw / 44)), rows = Math.floor((bh - 40) / 52);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const wx = x + 16 + c * ((bw - 32) / cols), wy = y - bh + 26 + r * 52;
        const on = hash(i * 31 + r, c + seed) < lit;
        rrect(wx, wy, (bw - 32) / cols - 12, 30, 4, { fill: on ? '#FFE08A' : rgba('#FFFFFF', 0.45), stroke: null });
        if (on) glow(wx + 12, wy + 15, 50, '#FFD45C', 0.25 * lit);
      }
      // the big block number every Korean apartment wears on its side
      if (bh > 420 && hash(i, seed + 5) > 0.4) letter(`${101 + i}`, x + bw / 2, y - bh + 60, 44, '#FFFFFF', { lw: 6, shadow: null });
    }
  }
}

function tree(x, y, s, kind = 'green', t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  stroke([[0, 0], [0, -120]], PAL.woodDk, 26, { olw: 10 });
  const col = { green: PAL.leaf, sakura: PAL.sakura, autumn: '#F2A33D', night: '#2E4A5A' }[kind];
  const sway = Math.sin(t * 1.3 + x * 0.01) * 4;
  smooth(blobPts(sway, -200, 120, 10, 0.12, Math.floor(x)), { fill: col, lw: 6 });
  if (kind === 'sakura') for (let i = 0; i < 12; i++) circle(sway + hrange(-90, 90, i, x), -200 + hrange(-80, 80, i + 50, x), 10, { fill: '#FFFFFF', stroke: null, alpha: 0.7 });
  ctx.restore();
}

function streetlight(x, y, s, on = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (on > 0) {
    ctx.save(); ctx.globalAlpha = 0.35 * on;
    ctx.fillStyle = lgrad(0, -470, 0, 0, [[0, 'rgba(255,220,120,0.9)'], [1, 'rgba(255,220,120,0)']]);
    ctx.beginPath(); ctx.moveTo(40, -470); ctx.lineTo(-160, 0); ctx.lineTo(240, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  stroke([[0, 0], [0, -480], [30, -500], [60, -490]], '#5B6378', 14, { olw: 9 });
  rrect(30, -498, 70, 26, 10, { fill: on > 0 ? '#FFE9A8' : '#C9CED8', lw: 5 });
  if (on > 0) glow(65, -470, 120, '#FFD45C', 0.6 * on);
  ctx.restore();
}

// ---- the school ---------------------------------------------------------------------------------

/**
 * The school: a long four-storey block with a clock in the middle. (x, y) is the middle of its
 * foot. o: { lit (0..1), clock ([h, m]), tone, banner (text) }
 */
function schoolBuilding(x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const tone = o.tone || '#F4E3C3', lit = o.lit || 0;
  const w = 1500, h = 470;
  rrect(-w / 2, -h, w, h + 6, 10, { fill: tone, lw: 7 });
  rrect(-170, -h - 110, 340, 130, 12, { fill: mix(tone, '#FFFFFF', 0.25), lw: 7 });
  rrect(-w / 2 - 14, -h - 18, w + 28, 26, 8, { fill: '#B55B4B', lw: 7 });
  rrect(-184, -h - 128, 368, 28, 8, { fill: '#B55B4B', lw: 7 });
  wallClock(0, -h - 45, 46, o.clock ? o.clock[0] : 8, o.clock ? o.clock[1] : 20);
  for (let floor = 0; floor < 4; floor++) {
    for (let c = 0; c < 14; c++) {
      if (c === 6 || c === 7) continue;
      const wx = -w / 2 + 40 + c * 104, wy = -h + 30 + floor * 108;
      const on = hash(floor * 17 + c, 5) < lit;
      rrect(wx, wy, 80, 70, 6, { fill: on ? '#FFE9A0' : '#9FD6F2', lw: 5 });
      if (!on) stroke([[wx + 12, wy + 56], [wx + 34, wy + 14]], '#FFFFFF', 5, { ink: null, alpha: 0.6 });
      if (on) glow(wx + 40, wy + 35, 90, '#FFE08A', 0.35);
      stroke([[wx + 40, wy], [wx + 40, wy + 70]], PAL.ink, 3, { ink: null });
    }
  }
  // the front door
  rrect(-110, -170, 220, 176, 10, { fill: '#8FC3E0', lw: 7 });
  stroke([[0, -170], [0, 4]], PAL.ink, 5, { ink: null });
  if (o.banner) {
    rrect(-330, -h + 20, 660, 70, 8, { fill: '#FFFFFF', lw: 5 });
    letter(o.banner, 0, -h + 56, 44, PAL.red, { lw: 0, shadow: null });
  }
  ctx.restore();
}

/** A school gate: two brick pillars and a sliding gate that is `closed` 0..1 across. */
function schoolGate(x, y, s, closed = 0, name = '한빛고등학교') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const gap = 700;
  const gx = -gap / 2 + gap * (1 - closed);
  // the gate is a row of bars on wheels, sliding in from the right pillar
  ctx.save(); ctx.beginPath(); ctx.rect(-gap / 2, -300, gap + 800, 320); ctx.clip();
  rrect(gx, -250, gap + 20, 16, 6, { fill: '#9AA3B5', lw: 5 });
  rrect(gx, -60, gap + 20, 16, 6, { fill: '#9AA3B5', lw: 5 });
  for (let i = 0; i <= 12; i++) stroke([[gx + 10 + i * 58, -262], [gx + 10 + i * 58, -30]], '#B9C1D0', 10, { olw: 8 });
  for (let i = 0; i < 3; i++) circle(gx + 60 + i * 280, -18, 16, { fill: '#5B6378', lw: 5 });
  ctx.restore();
  for (const side of [-1, 1]) {
    const px = side * (gap / 2 + 70);
    rrect(px - 70, -380, 140, 386, 10, { fill: '#C9745A', lw: 7 });
    for (let r = 0; r < 7; r++) stroke([[px - 70, -330 + r * 50], [px + 70, -330 + r * 50]], '#A85C45', 4, { ink: null });
    rrect(px - 84, -404, 168, 34, 8, { fill: '#8E4B3A', lw: 6 });
  }
  rrect(-gap / 2 - 130, -300, 120, 220, 8, { fill: '#F7F1E1', lw: 5 });
  ctx.save(); ctx.translate(-gap / 2 - 70, -190);
  ctx.font = `34px ${FONT.bold}`; ctx.fillStyle = PAL.ink; ctx.textAlign = 'center';
  [...name].slice(0, 6).forEach((ch, i) => ctx.fillText(ch, 0, -80 + i * 36));
  ctx.restore();
  ctx.restore();
}

// ---- the classroom ------------------------------------------------------------------------------

function wallClock(x, y, r, h, m) {
  circle(x, y, r, { fill: '#FFFFFF', lw: Math.max(4, r * 0.12) });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    stroke([[x + Math.sin(a) * r * 0.78, y - Math.cos(a) * r * 0.78], [x + Math.sin(a) * r * 0.88, y - Math.cos(a) * r * 0.88]], PAL.ink, r * 0.05, { ink: null });
  }
  const ha = ((h % 12) + m / 60) / 12 * TAU, ma = m / 60 * TAU;
  stroke([[x, y], [x + Math.sin(ha) * r * 0.5, y - Math.cos(ha) * r * 0.5]], PAL.ink, r * 0.1, { ink: null });
  stroke([[x, y], [x + Math.sin(ma) * r * 0.75, y - Math.cos(ma) * r * 0.75]], PAL.ink, r * 0.07, { ink: null });
  circle(x, y, r * 0.08, { fill: PAL.red, stroke: null });
}

/** A digital bedside clock reading `text` ("06:59"). blink: 0..1 how lit the colon is. */
function digitalClock(x, y, s, text, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(o.rot || 0);
  rrect(-170, -95, 340, 170, 36, { fill: o.body || '#FF8FB1', lw: 8 });
  rrect(-138, -68, 276, 110, 18, { fill: '#1E1A2E', lw: 6 });
  glow(0, -13, 180, o.color || '#FF5A5A', 0.35 * (o.glow ?? 1));
  ctx.font = `92px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || '#FF6B6B';
  const parts = text.split(':');
  ctx.fillText(parts[0], -62, -10); ctx.fillText(parts[1] ?? '', 62, -10);
  ctx.globalAlpha = o.blink ?? 1; ctx.fillText(':', 0, -16); ctx.globalAlpha = 1;
  for (const side of [-1, 1]) rrect(side * 110 - 22, 72, 44, 26, 8, { fill: '#C9CED8', lw: 5 });
  ctx.restore();
}

function blackboard(x, y, w, h, draw) {
  rrect(x - 18, y - 18, w + 36, h + 36, 10, { fill: PAL.wood, lw: 7 });
  rrect(x, y, w, h, 6, { fill: PAL.board, lw: 5 });
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // chalk dust
  ctx.fillStyle = rgba('#FFFFFF', 0.05);
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + hash(i, 2) * w, y + hash(i, 3) * h, 180, 40, 0.2, 0, TAU); ctx.fill(); }
  if (draw) draw(x, y, w, h);
  ctx.restore();
  rrect(x + 20, y + h + 10, w - 40, 16, 5, { fill: PAL.woodDk, lw: 5 });
}

/** Chalk writing on a board. */
function chalk(txt, x, y, size, color = PAL.chalk, o = {}) {
  ctx.save(); ctx.font = `${size}px ${FONT.round}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.globalAlpha *= (o.alpha ?? 0.92);
  ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.fillText(txt, 0, 0);
  ctx.restore();
}

/** A school desk and chair seen from the front, standing at (x, y). */
function desk(x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const side of [-1, 1]) stroke([[side * 110, -150], [side * 118, 0]], '#8B93A6', 12, { olw: 8 });
  rrect(-140, -176, 280, 34, 8, { fill: o.top || '#D9A066', lw: 6 });
  rrect(-120, -142, 240, 50, 6, { fill: '#9AA3B5', lw: 5 });
  if (o.books) { rrect(-100, -200, 90, 26, 4, { fill: PAL.blue, lw: 4 }); rrect(-90, -222, 80, 22, 4, { fill: PAL.orange, lw: 4 }); }
  ctx.restore();
}

/**
 * The classroom seen from the back of the room: blackboard wall, windows on the left, rows of
 * desks. o: { night (0..1), board (fn(x, y, w, h)), clock ([h, m]), sky (fn to paint the
 * window view, in screen space) }
 */
function classroom(t, o = {}) {
  const night = o.night || 0;
  fillScreen(mix(PAL.wall, '#39406A', night * 0.75));
  rrect(-20, 760, W + 40, 340, 0, { fill: mix(PAL.floor, '#3B3050', night * 0.6), lw: 6 });
  for (let i = 0; i < 12; i++) stroke([[i * 180 - 40, 770], [i * 220 - 300, 1090]], mix('#B77E4E', '#2E2640', night * 0.6), 4, { ink: null });
  // windows on the left wall
  for (let i = 0; i < 2; i++) {
    const wx = 60 + i * 300, wy = 140;
    rrect(wx, wy, 260, 380, 8, { fill: night > 0.5 ? PAL.night : PAL.sky, lw: 7 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, 260, 380); ctx.clip();
    if (o.sky) o.sky(wx, wy, 260, 380);
    else if (night > 0.5) { stars(t, 12, 9 + i, 1, H); }
    else { cloud(wx + 130, wy + 110, 0.5); }
    ctx.restore();
    stroke([[wx + 130, wy], [wx + 130, wy + 380]], '#FFFFFF', 8, { olw: 6 });
    stroke([[wx, wy + 190], [wx + 260, wy + 190]], '#FFFFFF', 8, { olw: 6 });
  }
  blackboard(760, 150, 980, 430, o.board);
  wallClock(1250, 80, 50, ...(o.clock || [9, 10]));
  // fluorescent tubes
  for (let i = 0; i < 3; i++) {
    const lx = 520 + i * 520, flick = o.flicker ? (hash(Math.floor(t * 14), i) > 0.12 ? 1 : 0.4) : 1;
    rrect(lx, 22, 300, 20, 8, { fill: night ? mix('#FFFFFF', '#E6F4FF', 0.5) : '#FFFFFF', lw: 5 });
    if (night) glow(lx + 150, 50, 360, '#E8F4FF', 0.35 * flick);
  }
  if (night) fillScreen('#1B2050', night * 0.18);
}

// ---- small things -------------------------------------------------------------------------------

function speechBubble(x, y, w, h, tailX, tailY, o = {}) {
  ctx.save();
  rrectPath(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.45);
  ctx.moveTo(x - 30, y + h / 2 - 4); ctx.lineTo(tailX, tailY); ctx.lineTo(x + 30, y + h / 2 - 4);
  paint({ fill: o.fill || '#FFFFFF', lw: 6 });
  rrectPath(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, Math.min(w, h) * 0.42);
  ctx.fillStyle = o.fill || '#FFFFFF'; ctx.fill();
  if (o.text) letter(o.text, x, y + 4, o.size || h * 0.5, o.color || PAL.ink, { font: 'round', lw: 0, shadow: null });
  ctx.restore();
}

function toastSlice(x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  smooth([[-50, -30], [-40, -60], [0, -70], [40, -60], [50, -30], [46, 50], [-46, 50]], { fill: '#E3A55B', lw: 5 });
  smooth([[-36, -26], [-28, -48], [0, -54], [28, -48], [36, -26], [34, 38], [-34, 38]], { fill: '#FFE3A8', stroke: null });
  ctx.restore();
}

function lunchTray(x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-150, -90, 300, 180, 22, { fill: '#C9D3E0', lw: 6 });
  rrect(-132, -72, 120, 70, 14, { fill: '#FFFFFF', lw: 4 });          // rice
  for (let i = 0; i < 8; i++) circle(-110 + (i % 4) * 26, -50 + Math.floor(i / 4) * 24, 9, { fill: '#F6F1E6', stroke: null });
  rrect(8, -72, 124, 70, 14, { fill: '#F25C3C', lw: 4 });           // soup
  rrect(-132, 10, 80, 62, 12, { fill: '#7CCB6A', lw: 4 });          // greens
  rrect(-40, 10, 80, 62, 12, { fill: '#E8A33D', lw: 4 });           // fried something
  rrect(52, 10, 80, 62, 12, { fill: '#F2545B', lw: 4 });            // kimchi
  ctx.restore();
}

/** A folded note, or opened (open 0..1) with a doodle. */
function foldedNote(x, y, s, rot = 0, open = 0, draw) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const w = lerp(90, 300, easeOut(open)), h = lerp(60, 220, easeOut(open));
  rrect(-w / 2, -h / 2, w, h, 6, { fill: '#FFFDF4', lw: 5 });
  if (open > 0.9 && draw) { ctx.save(); ctx.globalAlpha = (open - 0.9) * 10; draw(); ctx.restore(); }
  if (open < 0.5) stroke([[-w / 2, -h / 2], [0, 0], [w / 2, -h / 2]], '#D9CFB8', 4, { ink: null });
  ctx.restore();
}

/** A polaroid; draw() paints the photo inside a 300x260 window centred on the origin. */
function polaroid(x, y, s, rot, draw, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-180, -170, 360, 400, 8, { fill: '#FFFFFF', lw: 6, shadow: 'rgba(0,0,0,0.3)', shadowBlur: 30 });
  rrect(-150, -140, 300, 260, 4, { fill: '#2A2438', lw: 4 });
  ctx.save(); ctx.beginPath(); ctx.rect(-150, -140, 300, 260); ctx.clip(); ctx.translate(0, -10);
  if (draw) draw();
  if (o.develop !== undefined) { ctx.fillStyle = rgba('#2A2438', 1 - o.develop); ctx.fillRect(-160, -150, 320, 280); }
  ctx.restore();
  if (o.caption) letter(o.caption, 0, 175, 40, PAL.ink, { font: 'round', lw: 0, shadow: null });
  ctx.restore();
}

/** An open textbook seen from above: two pages of lines, and whatever draw() adds on top. */
function textbook(x, y, s, rot, draw) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-520, -330, 1040, 660, 18, { fill: '#3E6FB8', lw: 7 });
  rrect(-500, -310, 490, 620, 8, { fill: '#FFFDF6', lw: 5 });
  rrect(10, -310, 490, 620, 8, { fill: '#FFFDF6', lw: 5 });
  for (let p = 0; p < 2; p++) for (let i = 0; i < 13; i++) {
    const lx = p ? 50 : -460, len = 380 - (hash(i, p) > 0.7 ? 140 : 0);
    rrect(lx, -250 + i * 40, len, 10, 4, { fill: '#C9CED8', stroke: null });
  }
  if (draw) draw();
  ctx.restore();
}

function gradCap(x, y, s, rot = 0, color = '#2A2438') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-40, -10, 80, 40, 10, { fill: color, lw: 5 });
  poly([[0, -50], [90, -18], [0, 14], [-90, -18]], { fill: color, lw: 5 });
  stroke([[0, -18], [60, 10], [60, 50]], PAL.gold, 5, { ink: null });
  circle(60, 54, 8, { fill: PAL.gold, stroke: null });
  ctx.restore();
}

function paperPlane(x, y, s, rot = 0, color = '#FFFFFF') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  poly([[80, 0], [-70, -46], [-40, 0]], { fill: color, lw: 5 });
  poly([[80, 0], [-40, 0], [-70, 40]], { fill: mix(color, '#9FB4D8', 0.35), lw: 5 });
  poly([[80, 0], [-40, 0], [-24, 16]], { fill: mix(color, '#9FB4D8', 0.6), lw: 4 });
  ctx.restore();
}
