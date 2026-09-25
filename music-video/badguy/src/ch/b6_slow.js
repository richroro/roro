// 6 · 느린 엔딩 (147.00 – 194.00)
// The melt drains away into a dark red throne room: the little one on a throne of plushies, eyes
// glowing behind the tiny shades, 부장님 on his knees with snacks, a giant shadow crown on the
// wall. At 175.00 엄마 switches on the light: an ordinary bedroom, an angel asleep, and 부장님
// caught with the snacks. Then the end card.
(() => {
  const LIME = '#B6FF3B', PINK = '#FF3DA5', RED = '#3A0B14', PURPLE = '#3B1552', HOT = '#FF2A3D';
  const T0 = 147.0, LIGHT = 175.0, CARD = 190.0, END = 194.5;

  // slow beats (0.889 s) from beat.js
  const sb = t => bgBeat(t);
  const sPh = t => frac(bgBeat(t) + 1e-6);
  const sSince = t => sPh(t) * SONG.slow.beat;
  /** A heavy push: steps in on every slow beat since t0 and settles. */
  const push = (t, t0, amt) => {
    const b = sb(t) - sb(t0), n = Math.floor(sb(t) + 1e-6) - Math.floor(sb(t0) + 1e-6);
    return amt * (Math.max(0, n - 1) + (n > 0 ? easeOut(clamp(sPh(t) * 2.5)) : 0)) + b * 0.002;
  };

  // ---- the little one (same kit as the break) ---------------------------------------------------

  function lolly(x, y, r, rot = 0, col = PINK) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    stroke([[0, 0], [0, r * 2.3]], '#FFFFFF', r * 0.2, { olw: 6 });
    circle(0, 0, r, { fill: col, lw: 5 });
    ctx.save(); ellPath(0, 0, r, r); ctx.clip();
    ctx.beginPath();
    for (let i = 0; i < 40; i++) { const a = i * 0.42, rr = (i / 40) * r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    ell(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, { fill: 'rgba(255,255,255,0.7)', stroke: null }, -0.6);
    ctx.restore();
  }

  function shades(fx, y, o = {}) {
    const tint = o.tint || PINK, t = o.t || 0;
    stroke([[fx - 90, y - 10], [fx - 66, y - 6]], '#111018', 6, { olw: 4 });
    stroke([[fx + 90, y - 10], [fx + 66, y - 6]], '#111018', 6, { olw: 4 });
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(fx + side * 37, y);
      const pts = [[-30, -17], [30, -17], [28, 6], [14, 19], [-14, 19], [-28, 6]];
      smooth(pts, { fill: '#15121C', lw: 5 });
      ctx.save(); smoothPath(pts); ctx.clip();
      if (o.eyeGlow) {
        ctx.fillStyle = rgrad(0, 2, 0, 26, [[0, rgba('#FF5A6A', o.eyeGlow)], [1, rgba('#FF2A3D', 0)]]);
        ctx.fillRect(-32, -20, 64, 42);
      }
      ctx.fillStyle = rgba(tint, 0.3); ctx.fillRect(-32, 2, 64, 20);
      const g = frac(t * 0.3 + side * 0.1) * 120 - 60;
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(g - 14, -20); ctx.lineTo(g - 4, -20); ctx.lineTo(g - 24, 22); ctx.lineTo(g - 34, 22); ctx.fill();
      ctx.restore();
      ctx.restore();
    }
    stroke([[fx - 8, y - 12], [fx + 8, y - 12]], '#111018', 6, { olw: 4 });
  }

  /** Transform into the child's head frame (head centre at 0,0) for a person() drawn with o. */
  function headFrame(x, y, s, o) {
    const S = s * 0.58;
    ctx.translate(x, y - (o.dy || 0) * S);
    ctx.scale(S * (o.flip ? -1 : 1), S); ctx.rotate(o.rot || 0);
    const sq = o.sq || 0; ctx.scale(1 + sq * 0.5, 1 - sq);
    ctx.translate(0, -300 + (o.headDy || 0)); ctx.rotate(o.headRot || 0); ctx.scale(1.12, 1.12);
  }

  function kid(x, y, s, o = {}) {
    const inMouth = o.lolly === 'mouth';
    person(x, y, s, {
      role: 'child', eyes: 'open', mouth: 'flat', blush: 0.35, ...o,
      holdR: o.lolly === 'hand' ? (hx, hy) => lolly(hx + 6, hy - 70, 40, o.lollyRot || 0.15, o.lollyCol || PINK) : o.holdR,
    });
    ctx.save(); headFrame(x, y, s, o);
    const fx = (o.turn || 0) * 28;
    if (inMouth) {
      ctx.save(); ctx.translate(fx + 8, 62); ctx.rotate(0.55 + (o.wag || 0));
      stroke([[0, 0], [0, 64 * (o.stick ?? 1)]], '#FFFFFF', 9, { olw: 7 });
      ctx.restore();
      ell(fx + 40, 44, 16, 12, { fill: rgba(PAL.skinDk, 0.6), stroke: null });
    }
    const sh = o.shades ?? 1;
    if (sh > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(sh * 3); ctx.translate(0, -(1 - sh) * 150);
      shades(fx, 14, o);
      ctx.restore();
    }
    ctx.restore();
  }
  /** World position of a point in the child's head frame (head centre = 0,0). */
  function headPt(x, y, s, o, px, py) {
    ctx.save(); headFrame(x, y, s, o); const m = ctx.getTransform(); ctx.restore();
    const b = ctx.getTransform();
    const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
    const inv = b.inverse(); return [inv.a * X + inv.c * Y + inv.e, inv.b * X + inv.d * Y + inv.f];
  }
  function halo(x, y, s, k, t) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 5); ctx.scale(backOut(clamp(k)) * s, backOut(clamp(k)) * s);
    ell(0, 0, 62, 17, { fill: null, stroke: PAL.ink, lw: 17 });
    ell(0, 0, 62, 17, { fill: null, stroke: '#FFE27A', lw: 10 });
    ctx.restore();
    glow(x, y, 110 * s, '#FFE27A', 0.4 * clamp(k));
  }

  // ---- props ------------------------------------------------------------------------------------

  function snacks(x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // a bag of crisps behind, choco pies on the plate
    ctx.save(); ctx.rotate(0.12);
    smooth([[-30, 0], [-34, -96], [-22, -104], [22, -104], [34, -96], [30, 0]], { fill: '#FF7A3D', lw: 5 });
    rrect(-24, -74, 48, 30, 6, { fill: '#FFE27A', stroke: null });
    letter('과자', 0, -59, 20, '#D8383E', { font: 'round', lw: 0, shadow: null });
    ctx.restore();
    ell(0, 0, 92, 22, { fill: '#FFFFFF', lw: 5 });
    ell(0, -2, 64, 13, { fill: '#EDE7F2', stroke: null });
    for (let i = 0; i < 3; i++) {
      const cx = -40 + i * 40, cy = -12 - (i === 1 ? 26 : 0);
      rrect(cx - 26, cy - 18, 52, 20, 10, { fill: '#6B3A26', lw: 4 });
      stroke([[cx - 20, cy - 10], [cx + 20, cy - 10]], '#FFF1D6', 3, { ink: null });
    }
    ctx.restore();
  }

  function fan(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    stroke([[0, 0], [0, -70]], '#8A5530', 9, { olw: 6 });
    ctx.beginPath(); ctx.moveTo(0, -40); ctx.arc(0, -40, 120, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9); ctx.closePath();
    paint({ fill: '#FFF1D6', lw: 5 });
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.26;
      stroke([[0, -40], [Math.cos(a) * 118, -40 + Math.sin(a) * 118]], '#E8C99A', 3, { ink: null });
    }
    circle(0, -120, 18, { fill: '#FF6F8E', stroke: null });
    ctx.restore();
  }

  function teddy(x, y, s, col = '#B27A4E', o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const dk = mix(col, '#000000', 0.25), lt = mix(col, '#FFFFFF', 0.35);
    ell(0, -110, 110, 120, { fill: col, lw: 6 });                 // body
    ell(0, -90, 62, 70, { fill: lt, stroke: null });
    ell(-118, -30, 44, 36, { fill: col, lw: 6 });                 // feet
    ell(118, -30, 44, 36, { fill: col, lw: 6 });
    circle(-80, -330, 40, { fill: col, lw: 6 }); circle(80, -330, 40, { fill: col, lw: 6 });
    circle(-80, -330, 20, { fill: dk, stroke: null }); circle(80, -330, 20, { fill: dk, stroke: null });
    ell(0, -260, 100, 90, { fill: col, lw: 6 });                  // head
    ell(0, -232, 40, 30, { fill: lt, lw: 4 });
    ell(0, -244, 13, 9, { fill: PAL.ink, stroke: null });
    if (o.x) {
      for (const sd of [-1, 1]) { stroke([[sd * 40 - 10, -284], [sd * 40 + 10, -268]], PAL.ink, 5, { ink: null }); stroke([[sd * 40 + 10, -284], [sd * 40 - 10, -268]], PAL.ink, 5, { ink: null }); }
    } else { circle(-38, -276, 9, { fill: PAL.ink, stroke: null }); circle(38, -276, 9, { fill: PAL.ink, stroke: null }); }
    if (o.arms !== false) {
      ell(-120, -150, 40, 56, { fill: col, lw: 6 }, 0.5);
      ell(120, -150, 40, 56, { fill: col, lw: 6 }, -0.5);
    }
    ctx.restore();
  }
  function block(x, y, sz, col, ch) {
    rrect(x - sz / 2, y - sz, sz, sz, 12, { fill: col, lw: 5 });
    rrect(x - sz / 2 + 10, y - sz + 10, sz - 20, sz - 20, 8, { fill: null, stroke: rgba('#FFFFFF', 0.6), lw: 4 });
    letter(ch, x, y - sz / 2 + 4, sz * 0.55, '#FFFFFF', { font: 'round', lw: 6, shadow: null });
  }
  function dino(x, y, s, flip = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * flip, s);
    smooth([[-110, 0], [-90, -80], [-40, -110], [0, -170], [40, -200], [80, -190], [90, -160], [50, -140], [40, -90], [70, 0]], { fill: '#6FCB7A', lw: 6 });
    for (let i = 0; i < 4; i++) poly([[-80 + i * 30, -90 - i * 22], [-66 + i * 30, -120 - i * 22], [-54 + i * 30, -96 - i * 26]], { fill: '#FFC23D', lw: 4 });
    circle(66, -178, 7, { fill: PAL.ink, stroke: null });
    ctx.restore();
  }
  function bunny(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ell(-26, -200, 18, 60, { fill: '#FFFFFF', lw: 5 }, -0.15); ell(26, -200, 18, 60, { fill: '#FFFFFF', lw: 5 }, 0.15);
    ell(-26, -200, 8, 40, { fill: '#FFB3C8', stroke: null }, -0.15); ell(26, -200, 8, 40, { fill: '#FFB3C8', stroke: null }, 0.15);
    ell(0, -60, 70, 64, { fill: '#FFFFFF', lw: 5 });
    circle(0, -140, 56, { fill: '#FFFFFF', lw: 5 });
    circle(-20, -146, 6, { fill: PAL.ink, stroke: null }); circle(20, -146, 6, { fill: PAL.ink, stroke: null });
    ell(0, -128, 7, 5, { fill: '#FF8FB1', stroke: null });
    ctx.restore();
  }

  /** The throne: blocks for a base, a teddy for the back, plushies either side. */
  const TX = 800, TY = 880;
  function throne() {
    teddy(TX, TY - 150, 1.35, '#B27A4E');
    dino(TX - 290, TY, 1.0, -1);
    bunny(TX + 300, TY, 1.0);
    block(TX - 130, TY, 150, '#F2545B', 'A');
    block(TX + 30, TY, 150, '#4E8EF7', 'B');
    block(TX + 170, TY, 130, '#FFC23D', 'C');
    ell(TX + 20, TY - 160, 190, 44, { fill: '#FF8FB1', lw: 6 });       // the seat cushion
    ell(TX + 20, TY - 170, 150, 22, { fill: '#FFB3C8', stroke: null });
  }

  // ---- the room -----------------------------------------------------------------------------------

  const WALL = 720;
  function door(open, light) {
    rrect(100, 190, 310, WALL - 190 + 6, 8, { fill: '#9C6B45', lw: 6 });
    if (open > 0) {
      rrect(116, 206, 278, WALL - 206, 4, { fill: mix('#FFE9B8', '#FFF6DA', light), stroke: null });
      // the door swings towards us
      const w = 278 * (1 - open * 0.8);
      poly([[116, 206], [116 + w, 206 - open * 30], [116 + w, WALL + open * 40], [116, WALL]], { fill: '#E7B27A', lw: 5 });
    } else {
      rrect(116, 206, 278, WALL - 206, 4, { fill: '#E7B27A', lw: 5 });
      rrect(146, 240, 218, 170, 8, { fill: null, stroke: '#C98E5B', lw: 5 });
      rrect(146, 440, 218, 230, 8, { fill: null, stroke: '#C98E5B', lw: 5 });
      circle(360, 470, 14, { fill: PAL.gold, lw: 4 });
    }
  }
  function room(t, o = {}) {
    // wall with a star wallpaper, floorboards, a window with the night outside
    ctx.fillStyle = '#FFE6BF'; ctx.fillRect(-600, -600, W + 1200, WALL + 600);
    ctx.fillStyle = '#FFD497';
    for (let i = -4; i < 26; i++) for (let j = -3; j < 9; j++) {
      const x = i * 96 + (j % 2) * 48, y = j * 90 + 40;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#F4C79A'; ctx.fillRect(-600, WALL - 120, W + 1200, 120);
    stroke([[-600, WALL - 120], [W + 600, WALL - 120]], '#E0A872', 6, { ink: null });
    ctx.fillStyle = '#D9A26C'; ctx.fillRect(-600, WALL, W + 1200, 1200);
    ctx.strokeStyle = '#C48A55'; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const y = WALL + 30 + i * i * 12 + i * 30; ctx.moveTo(-600, y); ctx.lineTo(W + 600, y); }
    ctx.stroke();
    stroke([[-600, WALL], [W + 600, WALL]], PAL.ink, 5, { ink: null });
    ell(900, 930, 620, 110, { fill: '#9CD3C4', stroke: null });
    ell(900, 930, 560, 90, { fill: null, stroke: '#C8EDE2', lw: 8 });
    // window
    rrect(1470, 130, 330, 290, 10, { fill: '#2B3A7A', lw: 6 });
    circle(1720, 200, 34, { fill: '#FFF1C0', stroke: null });
    for (let i = 0; i < 8; i++) sparkle(1500 + hash(i, 4) * 180, 160 + hash(i, 5) * 220, 6 + hash(i, 6) * 6, '#FFF1C0');
    stroke([[1635, 130], [1635, 420]], '#FFFFFF', 10, { ink: null }); stroke([[1470, 275], [1800, 275]], '#FFFFFF', 10, { ink: null });
    rrect(1470, 130, 330, 290, 10, { fill: null, lw: 6 });
    smooth([[1440, 110], [1530, 110], [1500, 300], [1540, 450], [1440, 450]], { fill: '#FF9FB5', lw: 5 });
    smooth([[1830, 110], [1740, 110], [1770, 300], [1730, 450], [1830, 450]], { fill: '#FF9FB5', lw: 5 });
    // crayon drawings taped up
    ctx.save(); ctx.translate(560, 300); ctx.rotate(-0.06);
    rrect(-80, -60, 160, 120, 4, { fill: '#FFFFFF', lw: 4 });
    stroke([[-50, 30], [-30, -20], [0, 20], [30, -30], [50, 30]], '#4E8EF7', 6, { ink: null });
    circle(40, -30, 14, { fill: '#FFC23D', stroke: null });
    ctx.restore();
    ctx.save(); ctx.translate(1180, 280); ctx.rotate(0.05);
    rrect(-70, -55, 140, 110, 4, { fill: '#FFFFFF', lw: 4 });
    smooth([[-40, 30], [-30, -10], [0, -20], [30, -10], [40, 30]], { fill: '#6FCB7A', stroke: null });
    circle(-10, -8, 5, { fill: PAL.ink, stroke: null });
    ctx.restore();
    // light switch and door
    rrect(440, 400, 44, 70, 8, { fill: '#FFFFFF', lw: 4 });
    rrect(454, 414 + (o.switchOn ? 0 : 22), 16, 20, 4, { fill: '#DDD6E6', lw: 3 });
    door(o.doorOpen || 0, o.light || 0);
    // the bed
    rrect(1860, 430, 50, 330, 12, { fill: '#9C6B45', lw: 6 });
    rrect(1300, 690, 600, 70, 10, { fill: '#9C6B45', lw: 6 });
    rrect(1310, 600, 570, 100, 24, { fill: '#FFFFFF', lw: 5 });
    rrect(1330, 780 - 80, 30, 80, 6, { fill: '#8A5530', lw: 5 });
    if (!o.inBed) {
      rrect(1320, 620, 440, 120, 26, { fill: '#7FB8F0', lw: 5 });
      for (let i = 0; i < 5; i++) poly(starShape(1370 + i * 86, 668 + (i % 2) * 22, 14, 0.45), { fill: '#FFE27A', stroke: null });
      ell(1790, 610, 70, 36, { fill: '#FFFFFF', lw: 5 });
    }
  }

  /** Night lighting over whatever is drawn: 1 = dark red and purple, 0 = none. */
  function dim(k, soft = 0) {
    if (k <= 0) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    const top = soft ? '#E07A90' : '#6A1A34', bot = soft ? '#C07AD0' : '#4A1E6A';
    ctx.fillStyle = lgrad(0, 0, 0, H, [[0, mix('#FFFFFF', top, k)], [1, mix('#FFFFFF', bot, k)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // An offscreen canvas for the wall shadow. Reused inside a frame only.
  let buf = null;
  /** Paint fn() offscreen, wash it with `color` (a = 1: flat silhouette), then lay it down. */
  function tinted(fn, color, a = 1, alpha = 1) {
    if (!buf || buf.width !== cv.width || buf.height !== cv.height) {
      buf = document.createElement('canvas'); buf.width = cv.width; buf.height = cv.height;
    }
    const g = buf.getContext('2d'), keep = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, buf.width, buf.height);
    g.setTransform(ctx.getTransform());
    ctx = g;
    try { fn(); } finally { ctx = keep; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a;
    g.fillStyle = color; g.fillRect(0, 0, buf.width, buf.height);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(buf, 0, 0); ctx.restore();
  }

  // the king's pose on the throne
  const KING = { sit: true, lL: 1.2, lR: 1.2, kL: -1.25, kR: -1.25, aL: 0.9, eL: -0.9, aR: 1.1, eR: 1.6, shadow: false };
  const kingY = TY - 175 + 150 * 0.58 * 1.3 * 0.2;

  /** The giant shadow with a crown on the wall behind the throne. */
  function shadowCrown(t, k = 1, grow = 0) {
    const s = 2.2 + grow, x = TX + 300, y = WALL - 30;
    tinted(() => {
      kid(x, y, s, { t, ...KING, shades: 0, lolly: 'hand', lollyRot: -0.2 });
      // the crown on the shadow's head
      const S = s * 0.58, hy = y - 300 * S - 103 * S;
      poly([[x - 95 * S, hy + 30 * S], [x - 110 * S, hy - 70 * S], [x - 55 * S, hy - 20 * S], [x, hy - 95 * S], [x + 55 * S, hy - 20 * S],
        [x + 110 * S, hy - 70 * S], [x + 95 * S, hy + 30 * S]], { fill: '#000', stroke: null });
      for (const dx of [-110, 0, 110]) circle(x + dx * S, hy - (dx ? 76 : 102) * S, 14 * S, { fill: '#000', stroke: null });
    }, '#0E0008', 1, 0.8 * k);
  }

  function boss(x, y, s, o = {}) {
    // kneeling: clip the shins away below the floor line so the knees sit on the floor
    const S = s * 1.02;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 400 * S, y - 900 * S, 800 * S, 900 * S + 8); ctx.clip();
    person(x, y + 70 * S, s, { role: 'boss', lL: 0.28, lR: 0.28, kL: -0.2, kR: -0.2, shadow: false, ...o });
    ctx.restore();
    ell(x, y, 110 * S, 16 * S, { fill: 'rgba(40,10,30,0.3)', stroke: null });
  }

  // ---- 147.00 · the melt drains away --------------------------------------------------------------
  const NIGHT = '#3A0B1E';
  function throneScene(t, o = {}) {
    room(t, {});
    dim(1);
    // a red wash on the wall behind, for the shadow to fall on
    glow(TX + 60, 330, 760, HOT, 0.3);
    shadowCrown(t, o.shadowK ?? 1, o.grow || 0);
    tinted(throne, NIGHT, 0.5);
    // red uplight from under the throne
    glow(TX, TY - 200, 700, HOT, 0.22 + 0.1 * Math.exp(-sSince(t) * 3));
  }
  function kingKid(t, o = {}) {
    const x = TX + 20, y = kingY + (o.dy || 0);
    const ko = { t, ...KING, lolly: 'hand', lollyRot: -0.15, lollyCol: '#FF5A9A', eyeGlow: o.glow ?? 0.9, tint: HOT,
      headRot: Math.sin(sb(t) * Math.PI) * 0.03, ...o };
    tinted(() => kid(x, y, 1.3, ko), NIGHT, 0.28);
    const pulse = 0.5 + 0.3 * Math.exp(-sSince(t) * 2.5);
    for (const side of [-1, 1]) {
      const [gx, gy] = headPt(x, y, 1.3, ko, (ko.turn || 0) * 28 + side * 37, 14);
      glow(gx, gy, 55, '#FF2A3D', pulse);
    }
  }
  const dark = (fn, a = 0.3) => tinted(fn, NIGHT, a);
  function reveal(t, lt) {
    const z = 1.45 + push(t, T0, 0.035);
    camBegin(TX + 20, 560, z);
    throneScene(t);
    kingKid(t);
    camEnd();
    // eyes glow through it all
    // the red that poured over the break drains down, leaving drips behind
    const drain = lt / 1.5;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = RED;
    const n = 64;
    ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (let i = 0; i <= n; i++) {
      const u = i / n, d = 0.25 * clamp(0.5 + 0.35 * Math.sin(u * 7.3 + 0.4) + 0.08 * (hash(i, 3) - 0.5));
      const y = ease(clamp(drain * 1.25 - d)) * H * 1.15;
      ctx.lineTo(u * W, y);
    }
    ctx.lineTo(W + 10, H + 10); ctx.fill();
    // trails
    for (let i = 0; i < n; i += 3) {
      if (hash(i, 8) < 0.5) continue;
      const u = (i + 0.5) / n, d = 0.25 * clamp(0.5 + 0.35 * Math.sin(u * 7.3 + 0.4) + 0.08 * (hash(i, 3) - 0.5));
      const y = ease(clamp(drain * 1.25 - d)) * H * 1.15, len = y * hrange(0.3, 0.8, i, 2);
      ctx.globalAlpha = clamp(1.2 - drain * 0.7);
      ctx.fillRect(u * W - 5, y - len, 10, len);
      ctx.beginPath(); ctx.arc(u * W, y - len, 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---- 151.44 · the throne, wide ------------------------------------------------------------------
  function throneWide(t, lt) {
    const z = 1.0 + push(t, 151.44, 0.03);
    camBegin(TX + 80, 470, z);
    throneScene(t);
    kingKid(t);
    camEnd();
  }

  // ---- 156.78 · 부장님 crawls in with snacks ------------------------------------------------------
  function kneel(t, lt, dur) {
    const z = 1.08 + push(t, 156.78, 0.02);
    camBegin(TX + 260, 520, z);
    throneScene(t);
    // one shuffle forward per slow beat
    const steps = sb(t) - sb(156.78);
    const n = Math.floor(steps), f = frac(steps);
    const x = 1560 - Math.min(5, n + easeInOut(clamp(f * 1.6))) * 70;
    const bow = Math.sin(Math.PI * clamp(f * 1.6));
    kingKid(t, { turn: 0.3, lookX: 1 });
    dark(() => boss(x, 900, 0.95, {
      t, turn: -0.6, lookX: -1, eyes: 'closed', mouth: 'wavy', brows: 'worried', aL: 2.55, aR: 2.55, eL: 0.55, eR: 0.55,
      rot: -0.08 * bow, headDy: bow * 14, sweat: 1, emote: 'sweat', emoteK: 1,
      holdL: (hx, hy) => snacks(0, hy - 20, 1.1),
    }));
    camEnd();
  }

  // ---- 162.10 · the offering ----------------------------------------------------------------------
  function offer(t, lt) {
    const z = 1.7 + push(t, 162.1, 0.025);
    camBegin(TX + 250, 470, z);
    throneScene(t, { grow: seg(t, 162.1, 167.5) * 0.6 });
    const take = seg(t, 163.4, 164.2), munch = t > 164.2;
    const chew = munch ? Math.abs(Math.sin((t - 164.2) * 9)) : 0;
    kingKid(t, {
      turn: 0.35, aR: lerp(1.1, 1.7, ease(take)) - (munch ? 0.5 : 0), eR: lerp(1.6, 0.4, ease(take)) + (munch ? 1.2 : 0),
      lolly: munch ? 'none' : 'hand', mouth: munch ? (chew > 0.5 ? 'o' : 'flat') : 'flat', holdR: munch ? (hx, hy) => {
        rrect(hx - 24, hy - 34, 48, 20, 10, { fill: '#6B3A26', lw: 4 });
      } : undefined,
    });
    if (munch) {
      const age = frac((t - 164.2) / 0.9) * 0.9;
      sfx('와삭', TX + 150, 440, 50, '#FFE27A', age, { life: 0.6, rot: 0.1 });
      for (let i = 0; i < 5; i++) circle(TX + 60 + i * 12, 560 + frac(t * 1.3 + i * 0.2) * 200, 5, { fill: '#6B3A26', stroke: null });
    }
    const bow = Math.sin(Math.PI * clamp(sPh(t) * 1.6));
    dark(() => boss(1210, 900, 0.95, {
      t, turn: -0.6, lookX: -1, eyes: take > 0.5 ? 'happy' : 'closed', mouth: 'wavy', brows: 'worried',
      aL: 2.1, aR: 2.1, eL: 0.9, eR: 0.9, headDy: bow * 10, emote: 'sweat', emoteK: 1,
      holdL: (hx, hy) => snacks(-10, hy - 14, 1.1),
    }));
    camEnd();
  }

  // ---- 167.50 · fanning the king; a light under the door ------------------------------------------
  function fanning(t, lt) {
    const z = 1.0 + push(t, 167.5, 0.018);
    const look = ease(seg(t, 174.3, 174.6));
    camBegin(TX + 180 - look * 120, 500, z);
    throneScene(t, { grow: 0.6 + seg(t, 167.5, 174) * 0.6 });
    const sw = Math.sin(sb(t) * Math.PI);
    kingKid(t, { turn: lerp(0.2, -0.8, look), lookX: lerp(0.5, -1, look), headRot: -0.08 + sw * 0.02, rot: -0.04 });
    dark(() => boss(1170, 900, 0.95, {
      t, turn: -0.5, lookX: -1, eyes: 'closed', mouth: 'wavy', brows: 'worried', aL: 0.4, aR: 2.2 + sw * 0.4, eR: 0.3,
      holdR: (hx, hy) => fan(hx, hy, 1.0, -0.4 - sw * 0.3), emote: 'sweat', emoteK: 1,
    }));
    // the door opens a crack: warm light slices the dark
    const crack = ease(seg(t, 173.2, 174.9));
    if (crack > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba('#FFC97A', 0.5 * crack);
      ctx.fillRect(116, WALL - 8, 278, 8);
      const w = 60 * ease(seg(t, 174.0, 174.9));
      ctx.fillStyle = lgrad(0, 206, 0, WALL + 250, [[0, rgba('#FFE2A8', 0.7 * crack)], [1, rgba('#FFE2A8', 0)]]);
      ctx.beginPath(); ctx.moveTo(394 - w, 206); ctx.lineTo(394, 206); ctx.lineTo(394 + w * 5, WALL + 300); ctx.lineTo(394 - w, WALL + 300); ctx.fill();
      ctx.restore();
    }
    if (look > 0) emote('!', TX + 110, 330, look, t);
    camEnd();
  }

  // ---- 175.00 · the light goes on -----------------------------------------------------------------
  const BX = 1590, BY = 652, BS = 1.0;
  function bed(t, lit, haloK, o = {}) {
    // lying in bed, head on the pillow, hugging a teddy, the blanket up to the chin
    ell(1772, 612, 84, 36, { fill: '#FFFFFF', lw: 5 });
    const ko = { t, rot: Math.PI / 2, shadow: false, eyes: 'closed', mouth: 'cat', blush: 0.9, shades: 0, aL: 0.8, aR: 0.8, eL: 1.4, eR: 1.4, ...o };
    kid(BX, BY, BS, ko);
    teddy(1655, 650, 0.3, '#C68A5A', { arms: false });
    rrect(1320, 622, 372, 120, 26, { fill: '#7FB8F0', lw: 5 });
    for (let i = 0; i < 3; i++) poly(starShape(1380 + i * 110, 670 + (i % 2) * 22, 14, 0.45), { fill: '#FFE27A', stroke: null });
    const [hx, hy] = headPt(BX, BY, BS, ko, 0, 0);
    halo(hx, hy - 110, 0.9, haloK, t);
    return [hx, hy];
  }
  function lightOn(t, lt) {
    const click = t >= LIGHT;
    const z = 1.0 + push(t, LIGHT, 0.01);
    camBegin(960, 540, z);
    // throne-room colours snap off on the click
    room(t, { switchOn: true, doorOpen: 1, light: 1, inBed: true });
    throne();
    // the kid: a blur from throne to bed in 0.3 s
    const zip = seg(t, LIGHT + 0.04, LIGHT + 0.34);
    if (zip < 1) {
      const x = lerp(TX + 20, 1500, easeInOut(zip)), y = lerp(kingY, 640, easeInOut(zip));
      ctx.save(); ctx.globalAlpha = 0.9;
      for (let i = 3; i >= 1; i--) circle(x - i * 60 * Math.min(1, zip * 5), y - 200 - i * 10, 60, { fill: rgba('#FFC23D', 0.2), stroke: null });
      kid(x, y, 1.3, { t, ...KING, lolly: 'hand', rot: zip * 1.2 });
      ctx.restore();
      streaks(t, zip * 0.8, '#FFFFFF', 3, -1);
    }
    else {
      bed(t, 1, seg(t, LIGHT + 0.6, LIGHT + 1.0));
      sfx('휙', 1420, 420, 70, '#FFFFFF', t - LIGHT - 0.34, { life: 0.6 });
    }
    // 부장님, frozen with the plate up
    boss(1150, 900, 0.95, {
      t, turn: -0.2, eyes: 'wide', mouth: 'o', brows: 'up', aL: 2.1, aR: 2.1, eL: 0.9, eR: 0.9,
      emote: t > LIGHT + 0.5 ? '!?' : null, emoteK: seg(t, LIGHT + 0.5, LIGHT + 0.7),
      holdL: (hx, hy) => snacks(-10, hy - 10, 0.85),
    });
    // 엄마 in the doorway, hand on the switch
    person(300, 760, 1.05, { role: 'mom', t, aR: 1.7, eR: 0.3, aL: 0.3, eyes: t > LIGHT + 0.6 ? 'open' : 'wide', mouth: 'o', turn: 0.5, lookX: 1 });
    sfx('딸깍', 470, 330, 64, '#FFFFFF', t - LIGHT, { life: 0.8, rot: -0.1 });
    camEnd();
    flash(Math.exp(-(t - LIGHT) * 6) * 0.9, '#FFF8EC');
  }

  // ---- 178.56 · an angel, obviously ---------------------------------------------------------------
  function angel(t, lt) {
    const z = 2.5 + lt * 0.04;
    camBegin(1640, 580, z);
    room(t, { switchOn: true, doorOpen: 1, light: 1, inBed: true });
    const peek = t > 180.6 && t < 181.3;
    bed(t, 1, 1, { eyes: peek ? 'wink' : 'closed', mouth: peek ? 'flat' : 'cat' });
    // a clue under the pillow: the stick of a lollipop
    ctx.save(); ctx.translate(1830, 628); ctx.rotate(-0.3);
    stroke([[0, 0], [60, 0]], '#FFFFFF', 7, { olw: 6 });
    ctx.restore();
    emote('zzz', 1800, 540, 1, t);
    for (let i = 0; i < 4; i++) sparkle(1470 + hash(i, 1) * 200, 420 + hash(i, 2) * 90, 8 + 6 * Math.sin(t * 3 + i), '#FFE27A', t);
    camEnd();
    letter('새근새근…', 420, 200, 80, '#FFFFFF', { font: 'round', alpha: seg(t, 179.1, 179.5) * (1 - seg(t, 181.4, 181.8)) });
  }

  // ---- 182.10 · 엄마 has found the bad guy --------------------------------------------------------
  function blame(t, lt) {
    const z = 1.25 + push(t, 182.1, 0.012);
    camBegin(840, 520, z);
    room(t, { switchOn: true, doorOpen: 1, light: 1, inBed: true });
    throne();
    bed(t, 1, 1);
    // 엄마 marches in on the slow beats, hands on hips
    const steps = clamp((sb(t) - sb(182.1)) / 2);
    const mx = lerp(300, 640, easeOut(steps));
    person(mx, 900, 1.2, {
      role: 'mom', t, aL: 1.4, eL: -1.9, aR: 1.4, eR: -1.9, brows: 'angry', eyes: 'determined', mouth: 'flat', turn: 0.5, lookX: 1,
      emote: 'anger', emoteK: seg(t, 182.8, 183.1), walk: steps < 1 ? steps * 2 : undefined,
    });
    const sw = Math.sin(t * 20) * 0.02;
    boss(1110, 920, 1.05, {
      t, turn: -0.4, lookX: -1, eyes: 'wide', mouth: 'wavy', brows: 'worried', aL: 2.1, aR: 2.1, eL: 0.9, eR: 0.9, rot: sw,
      emote: 'sweat', emoteK: 1, holdL: (hx, hy) => snacks(-10, hy - 10, 0.85),
    });
    // crumbs in the moustache
    for (let i = 0; i < 4; i++) circle(1080 + i * 18, 640 + (i % 2) * 8, 5, { fill: '#6B3A26', stroke: null });
    // the verdict drops on a slow beat
    const d = seg(t, 183.8, 184.3);
    if (d > 0) {
      ctx.save(); ctx.translate(1110, lerp(-200, 170, easeOut(d)) + Math.sin(t * 4) * 6); ctx.rotate(0.06 + (1 - d) * 0.3);
      stroke([[0, -260], [0, -60]], PAL.ink, 4, { ink: null });
      rrect(-150, -70, 300, 110, 18, { fill: '#F2545B', lw: 7 });
      letter('범인', -10, -14, 80, '#FFFFFF', { lw: 8 });
      poly([[-30, 40], [30, 40], [0, 90]], { fill: '#F2545B', lw: 6 });
      ctx.restore();
    }
    camEnd();
  }

  // ---- 186.00 · the real one smirks, lights out ---------------------------------------------------
  function smirk(t, lt) {
    const off = ease(seg(t, 189.0, 189.3));
    const [cx, cy, z] = kf(t, [[186.0, [1300, 560, 1.5]], [186.9, [1320, 560, 1.55]], [187.5, [1690, 610, 2.7]]], easeInOut);
    camBegin(cx, cy, z + lt * 0.03);
    room(t, { switchOn: !off, doorOpen: 1 - off, light: 1, inBed: true });
    // 엄마 hauls 부장님 out by the ear, in the background
    const out = seg(t, 186.0, 188.6);
    const wx = lerp(1000, 250, out);
    if (out < 1) {
      boss(wx + 180, 880, 0.8, { t, turn: -0.6, eyes: 'x', mouth: 'open', aL: 1.6, aR: 2.2, eR: 0.9, holdL: (hx, hy) => snacks(-10, hy - 10, 0.8), rot: 0.1 });
      person(wx, 880, 0.9, { role: 'mom', t, walk: lt * 1.4, aR: 2.1, eR: 0.9, brows: 'angry', mouth: 'flat', turn: -0.6 });
    }
    const wink = t > 187.0, on = seg(t, 187.6, 188.1), pop = t > 188.3;
    bed(t, 1, (1 - on) * 1 + on * 0, {
      eyes: wink ? (on > 0 ? 'open' : 'wink') : 'closed', mouth: pop ? 'flat' : 'cat', shades: on,
      lolly: pop ? 'mouth' : null, stick: clamp((t - 188.3) / 0.2), eyeGlow: off, tint: off ? HOT : PINK, blush: 0.4,
    });
    if (on > 0 && on < 1) sparkle(1520, 470, 30, '#FFFFFF', t * 3);
    dim(off);
    if (off > 0) {
      ctx.save(); ctx.globalAlpha = off;
      // the glint that's left in the dark
      sparkle(1790, 600, 26 + 10 * Math.sin(t * 6), '#FFFFFF', t);
      ctx.restore();
    }
    camEnd();
    if (off > 0) sfx('딸깍', 400, 200, 60, '#FFFFFF', t - 189.0, { life: 0.8 });
  }

  // ---- 190.00 · end card --------------------------------------------------------------------------
  function endCard(t, lt) {
    const a = seg(t, CARD, CARD + 0.7), out = seg(t, 193.0, 194.0);
    skyFill([[0, RED], [1, PURPLE]]);
    glow(960, 460, 900, PINK, 0.25 * a);
    const p = bgPulse(t, 3);
    ctx.save(); ctx.globalAlpha = a;
    // a little pair of shades and a lollipop, the only characters left
    ctx.save(); ctx.translate(960, 270); ctx.scale(2.6, 2.6); ctx.rotate(Math.sin(t * 1.2) * 0.05);
    shades(0, 0, { t, tint: PINK });
    ctx.restore();
    lolly(1250, 230, 58, 0.4 + Math.sin(t * 1.5) * 0.1, PINK);
    const flick = hash(Math.floor(t * 14), 5) < 0.08 && t < 191 ? 0.4 : 1;
    ctx.save(); ctx.shadowColor = LIME; ctx.shadowBlur = 40 + p * 20; ctx.globalAlpha *= flick;
    letter('누가 진짜 나쁜 녀석?', 960, 520, 150, LIME, { pop: seg(t, CARD + 0.1, CARD + 0.6), color2: '#1A0508', lw: 14, shadow: PINK });
    ctx.restore();
    const c = seg(t, CARD + 0.9, CARD + 1.5);
    letter('영상 · Claude Code 로 만들었어요', 960, 760, 44, '#FFFFFF', { font: 'round', alpha: c, lw: 6, shadow: null });
    letter('음악은 Billie Eilish – bad guy 원곡을 따로 틀어 주세요', 960, 830, 38, '#FFD0E4', { font: 'round', alpha: c, lw: 6, shadow: null });
    ctx.restore();
    flash(out, '#000000');
  }

  chapter('slow', T0, END, [
    [147.0, reveal],
    [151.44, throneWide],
    [156.78, kneel],
    [162.1, offer],
    [167.5, fanning],
    [LIGHT, lightOn],
    [178.56, angel],
    [182.1, blame],
    [186.0, smirk],
    [CARD, endCard],
  ]);
})();
