// 5 · 브레이크 (117.33 – 147.00)
// The kid owns the stage: a lazy stomp dance in the spotlight, neon silhouette cards, and 부장님's
// eyes peeking out of the toy box. The colours bleed red, and at the tempo change the whole
// picture melts down into the slow ending.
(() => {
  const LIME = '#B6FF3B', PINK = '#FF3DA5', RED = '#3A0B14', HOT = '#FF2A3D';
  const T0 = 117.33, SLOW = 147.0, MELT = 145.78;

  // ---- colour arc: lime/pink/black, bleeding to red from bar 75 on ------------------------------
  const rk = t => ease(seg(t, 133.3, 145.6));
  const cLime = t => mix(LIME, HOT, rk(t));
  const cPink = t => mix(PINK, '#B0103A', rk(t));
  const cBlack = t => mix('#08070D', '#1C0309', rk(t));

  const bb = t => ((bgBeatN(t) % 4) + 4) % 4;          // beat in the bar, 0..3 (bar 66 starts on 0)
  const ph = t => frac(bgBeat(t) + 1e-6);               // where we are inside the beat
  const sinceBeat = t => ph(t) * SONG.beat;             // seconds since the last beat
  const snap = t => bb(t) % 2 === 1;                    // 2 and 4: the snaps

  // ---- props ------------------------------------------------------------------------------------

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
      const cx = fx + side * 37;
      ctx.save(); ctx.translate(cx, y);
      smooth([[-30, -17], [30, -17], [28, 6], [14, 19], [-14, 19], [-28, 6]], { fill: '#15121C', lw: 5 });
      ctx.save(); smoothPath([[-30, -17], [30, -17], [28, 6], [14, 19], [-14, 19], [-28, 6]]); ctx.clip();
      ctx.fillStyle = rgba(tint, 0.35); ctx.fillRect(-32, 2, 64, 20);
      const g = frac(t * 0.35 + side * 0.1) * 120 - 60;
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(g - 14, -20); ctx.lineTo(g - 4, -20); ctx.lineTo(g - 24, 22); ctx.lineTo(g - 34, 22); ctx.fill();
      ctx.restore();
      ctx.restore();
    }
    stroke([[fx - 8, y - 12], [fx + 8, y - 12]], '#111018', 6, { olw: 4 });
  }

  /** The little one: person(child) + tiny sunglasses + a lollipop in the mouth or hand. */
  function kid(x, y, s, o = {}) {
    const inMouth = o.lolly === 'mouth';
    person(x, y, s, {
      role: 'child', eyes: 'open', mouth: inMouth ? 'flat' : (o.mouth || 'flat'), blush: 0.35, ...o,
      holdR: o.lolly === 'hand' ? (hx, hy, a) => lolly(hx + 6, hy - 70, 40, o.lollyRot || 0.15, o.lollyCol || PINK) : o.holdR,
    });
    const S = s * 0.58;
    ctx.save();
    ctx.translate(x, y - (o.dy || 0) * S);
    ctx.scale(S * (o.flip ? -1 : 1), S); ctx.rotate(o.rot || 0);
    const sq = o.sq || 0; ctx.scale(1 + sq * 0.5, 1 - sq);
    if (o.walk !== undefined) ctx.translate(0, -Math.abs(Math.sin(o.walk * TAU)) * (o.run ? 20 : 8));
    ctx.translate(0, -300 + (o.headDy || 0)); ctx.rotate(o.headRot || 0); ctx.scale(1.12, 1.12);
    const fx = (o.turn || 0) * 28;
    if (inMouth) {
      const wag = o.wag || 0;
      ctx.save(); ctx.translate(fx + 8, 62); ctx.rotate(0.55 + wag);
      stroke([[0, 0], [0, 64]], '#FFFFFF', 9, { olw: 7 });
      ctx.restore();
      ell(fx + 40, 44, 16, 12, { fill: rgba(PAL.skinDk, 0.6), stroke: null });
    }
    if (o.shades !== false) {
      const down = (o.shadesDown || 0) * 34;
      if (down > 0) {
        for (const side of [-1, 1]) {
          glow(fx + side * 36, 12, 60, '#FF2A3D', 0.5 * o.shadesDown);
          ell(fx + side * 36, 12, 12, 9, { fill: '#FF4A5A', stroke: null });
          ell(fx + side * 36, 12, 5, 4, { fill: '#FFE0E0', stroke: null });
        }
      }
      shades(fx, 14 + down, o);
    }
    ctx.restore();
  }

  /** The toy box. gy = floor, gap = how far the lid is lifted (px), eyes peek out of the gap. */
  function toyBox(cx, gy, w, h, o = {}) {
    const gap = o.gap || 0, t = o.t || 0;
    const body = o.body || '#3A2F8F', band = o.band || cPink(t), deco = o.deco || cLime(t);
    if (gap > 2) {
      rrect(cx - w / 2 + 14, gy - h - gap - 8, w - 28, gap + 16, 6, { fill: '#050307', stroke: null });
      if (o.eyes && gap > 16) peekEyes(cx + (o.eyesX || 0), gy - h - gap / 2 - 2, Math.min(1, gap / 50), o);
    }
    rrect(cx - w / 2, gy - h, w, h, 18, { fill: body, lw: 6 });
    rrect(cx - w / 2 + 4, gy - h + 22, w - 8, 18, 2, { fill: band, stroke: null });
    rrect(cx - w / 2 + 4, gy - 44, w - 8, 18, 2, { fill: band, stroke: null });
    letter('장난감', cx, gy - h * 0.5 + 8, Math.min(w * 0.16, h * 0.26), deco, { font: 'round', lw: 7, shadow: null });
    for (let i = 0; i < 4; i++) {
      const sx = cx + (i < 2 ? -1 : 1) * w * (0.36 + (i % 2) * 0.04), sy = gy - h * (i % 2 ? 0.3 : 0.66);
      poly(starShape(sx, sy, h * 0.07, 0.45), { fill: i % 2 ? deco : '#FFFFFF', lw: 3 });
    }
    ctx.save(); ctx.translate(cx, gy - h - gap); ctx.rotate(o.lidRot || 0);
    rrect(-w / 2 - 16, -50, w + 32, 54, 16, { fill: o.lid || mix(body, '#FFFFFF', 0.12), lw: 6 });
    rrect(-34, -6, 68, 22, 6, { fill: PAL.gold, lw: 4 });
    ctx.restore();
  }

  function peekEyes(x, y, k, o = {}) {
    const lx = o.lookX || 0, ly = o.lookY || 0, es = o.eyeS || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(es, k * es);
    for (const side of [-1, 1]) {
      if (o.squeeze) {
        stroke([[side * 34 - 12, -8], [side * 34 + 4 * side, 0], [side * 34 - 12, 8]].map(([a, b]) => [a, b]), '#FFFFFF', 5, { ink: null });
      } else {
        ell(side * 34, 0, 17, 14, { fill: '#FFFFFF', stroke: null });
        circle(side * 34 + lx * 6, ly * 4, 7, { fill: '#111', stroke: null });
      }
    }
    if (o.sweat) smooth([[70, -16], [78, -2], [70, 4], [62, -2]], { fill: '#8FD3FF', lw: 3 });
    ctx.restore();
  }

  // ---- the stage ----------------------------------------------------------------------------------

  function stage(t, o = {}) {
    const L = cLime(t), P = cPink(t), K = cBlack(t), hz = o.hz ?? 600;
    fillScreen(K);
    ctx.fillStyle = lgrad(0, 0, 0, hz, [[0, K], [1, mix(K, P, 0.3)]]);
    ctx.fillRect(-600, -600, W + 1200, hz + 600);
    ctx.fillStyle = lgrad(0, hz, 0, H + 300, [[0, mix(K, '#000000', 0.4)], [1, mix(K, L, 0.1)]]);
    ctx.fillRect(-600, hz, W + 1200, H + 900);
    ctx.save();
    ctx.strokeStyle = rgba(L, 0.18 + 0.4 * bgPulse(t, 5) * (o.flashGrid ?? 1)); ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) { ctx.moveTo(960 + i * 50, hz); ctx.lineTo(960 + i * 330, H + 400); }
    for (let j = 1; j <= 9; j++) { const y = hz + (H + 400 - hz) * Math.pow(j / 9, 2.1); ctx.moveTo(-600, y); ctx.lineTo(W + 600, y); }
    ctx.stroke();
    ctx.restore();
    stroke([[-600, hz], [W + 600, hz]], rgba(P, 0.8), 4, { ink: null });
  }

  function spot(x, y, rx, color, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lgrad(x, -80, x, y, [[0, rgba(color, 0.03 * a)], [1, rgba(color, 0.22 * a)]]);
    ctx.beginPath(); ctx.moveTo(x - 40, -80); ctx.lineTo(x + 40, -80); ctx.lineTo(x + rx, y); ctx.lineTo(x - rx, y); ctx.fill();
    ctx.fillStyle = rgrad(x, y, 0, rx, [[0, rgba(color, 0.35 * a)], [1, rgba(color, 0)]]);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22); ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.restore(); ctx.fill();
    ctx.restore();
  }

  function dust(x, y, age, n = 6, seed = 1, spread = 260) {
    if (age < 0 || age > 0.9) return;
    const k = age / 0.9;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, d = easeOut(k) * spread * hrange(0.5, 1, i, seed);
      circle(x + side * d, y - 20 - easeOut(k) * hrange(10, 60, i, seed + 1), hrange(20, 40, i, seed + 2) * (1 - k * 0.5),
        { fill: rgba('#D8D0E8', 0.7 * (1 - k)), stroke: null });
    }
  }

  // An offscreen canvas for silhouettes and the melt. Reused inside a frame, never across frames.
  let buf = null;
  function scratch() {
    if (!buf || buf.width !== cv.width || buf.height !== cv.height) {
      buf = document.createElement('canvas'); buf.width = cv.width; buf.height = cv.height;
    }
    return buf;
  }
  /** Paint fn() flat in one colour (a silhouette), at `alpha`. */
  function silhouette(fn, color, alpha = 1, dx = 0, dy = 0) {
    const c = scratch(), g = c.getContext('2d'), keep = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(ctx.getTransform());
    ctx = g;
    try { fn(); } finally { ctx = keep; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.globalAlpha = 1;
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
    ctx.drawImage(c, dx * SCALE, dy * SCALE);
    ctx.restore();
  }

  /** The picture melts and slides down, deep red pouring in above it. k 0..1 (1 = all red). */
  function melt(t, k) {
    if (k <= 0) return;
    const c = scratch(), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy';
    g.drawImage(cv, 0, 0);
    // the picture reddens as it goes
    g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba('#FF3A55', clamp(k * 0.9));
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    const cw = cv.width, ch = cv.height, n = 160, sw = cw / n;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = RED; ctx.fillRect(0, 0, cw, ch);
    const offs = [];
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const d = 0.32 * clamp(0.5 + 0.28 * Math.sin(u * 8.3 + 1.1) + 0.16 * Math.sin(u * 21.7 + 2) + 0.08 * Math.sin(u * 53 + 0.5));
      const off = easeIn(clamp(k * 1.34 - d)) * ch * 1.05 + k * 40 * SCALE;
      offs.push(off);
      ctx.drawImage(c, i * sw, 0, sw, ch, i * sw, off, sw + 0.6, ch + off * 0.6);
    }
    ctx.restore();
    // glossy drips hanging at the edge of the pouring red
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = RED;
    for (let i = 0; i < n; i += 4) {
      if (hash(i, 9) < 0.4) continue;
      const x = (i + 2) * W / n, y = offs[i] / SCALE, len = (20 + hash(i, 10) * 90) * clamp(k * 3);
      ctx.beginPath(); ctx.moveTo(x - 14, y - 2); ctx.lineTo(x - 7, y + len); ctx.arc(x, y + len, 9, Math.PI, 0, true); ctx.lineTo(x + 14, y - 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,120,140,0.3)';
    for (let i = 0; i < n; i += 12) { const x = (i + 0.5) * W / n; ctx.fillRect(x - 3, offs[i] / SCALE - 90, 5, 60); }
    ctx.restore();
  }

  // ---- 117.33 · on the lid ------------------------------------------------------------------------
  function onLid(t, lt) {
    const knock = snap(t) ? Math.exp(-sinceBeat(t) * 9) : 0;
    const [sx, sy] = shakeXY(t, T0, 18, 0.4);
    camBegin(960 + sx, 620 + sy - lt * 8, 1.3 + lt * 0.04);
    stage(t);
    spot(960, 860, 420, '#FFFFFF', 0.8 + knock * 0.4);
    const gy = 870, bw = 560, bh = 300;
    ell(960, gy + 6, 320, 34, { fill: 'rgba(0,0,0,0.5)', stroke: null });
    const jump = knock * 10;
    ctx.save(); ctx.translate(960, gy); ctx.rotate(Math.sin(t * 60) * 0.012 * knock); ctx.translate(-960, -gy);
    toyBox(960, gy, bw, bh, { t, gap: jump, eyes: false, lidRot: 0 });
    ctx.restore();
    dust(960, gy, lt + 0.12, 8, 3, 360);
    // kicking heels on 1 and 3, bumped by the knocks on 2 and 4
    const kick = snap(t) ? 0 : Math.sin(Math.PI * clamp(ph(t) * 2));
    const seat = gy - bh - 50 - jump;
    kid(960, seat + 104, 1.45, {
      t, lolly: 'mouth', wag: Math.sin(t * 4) * 0.12 + knock * 0.3, dy: knock * 26,
      lL: 0.12 + kick * 0.25, lR: 0.12 + kick * 0.25, kL: -kick * 0.6, kR: -kick * 0.6,
      aL: 0.55, aR: 0.55, eL: -0.3, eR: -0.3, shadow: false, headRot: Math.sin(bgBeat(t) * Math.PI) * 0.05,
      tint: cLime(t), turn: 0.05,
    });
    if (snap(t)) sfx('쿵', 960 + (bb(t) === 1 ? -330 : 330), gy - 170, 80, cPink(t), sinceBeat(t), { life: 0.4, rot: bb(t) === 1 ? -0.2 : 0.2 });
    camEnd();
  }

  // ---- 120.89 · the stomp dance -------------------------------------------------------------------
  function stompPose(t, amt = 1) {
    const n = bgBeatN(t), up = bgHop(t), foot = n % 2;
    const p = bgPulse(t, 8);
    return {
      lL: 0.12 + (foot ? up * 0.55 : 0) * amt, kL: (foot ? up * 1.3 : 0) * amt,
      lR: 0.12 + (foot ? 0 : up * 0.55) * amt, kR: (foot ? 0 : up * 1.3) * amt,
      dy: up * 16 * amt, sq: p * 0.07 * amt, rot: (foot ? -1 : 1) * 0.05 * up * amt,
      aL: 0.55 + p * 0.5 * (snap(t) ? 1 : 0), eL: -0.6, aR: 1.1, eR: 1.3,
      headRot: (foot ? 1 : -1) * 0.07 * up, headDy: p * 10,
    };
  }
  function ring(x, y, age, color, r0 = 80, r1 = 420) {
    if (age < 0 || age > 0.44) return;
    const k = age / 0.44;
    ell(x, y, lerp(r0, r1, easeOut(k)), lerp(r0, r1, easeOut(k)) * 0.2, { fill: null, stroke: rgba(color, 1 - k), lw: 10 * (1 - k) + 2 });
  }
  function stomp(t, lt) {
    camBegin(980, 590, 1.12 + lt * 0.025 + bgPulse(t, 10) * 0.012);
    stage(t);
    spot(820, 900, 330, '#FFFFFF', 0.9);
    spot(820, 900, 330, cLime(t), 0.6 * bgPulse(t, 4));
    // the toy box behind, 부장님 watching from the gap
    const gap = 26 + Math.sin(lt * 2) * 6;
    toyBox(1440, 800, 420, 230, { t, gap, eyes: true, lookX: -1, lookY: 0.4, sweat: true, eyeS: 1.4 });
    const n = bgBeatN(t), foot = n % 2;
    ring(820 + (foot ? -40 : 40), 905, sinceBeat(t), cLime(t));
    kid(820, 900, 2.1, { t, lolly: 'hand', lollyRot: 0.25 + bgHop(t) * 0.15, tint: cLime(t), ...stompPose(t) });
    if (!snap(t)) sfx('쿵', 820 + (foot ? -250 : 250), 820, 70, cLime(t), sinceBeat(t), { life: 0.4 });
    else sparkle(820 + (foot ? 190 : -190), 470, 40 * Math.exp(-sinceBeat(t) * 6), '#FFFFFF');
    camEnd();
  }

  // ---- 124.44 / 131.56 · silhouette cards ---------------------------------------------------------
  const POSES = [
    { aL: 1.5, eL: -1.7, aR: 2.3, eR: 0.3, lL: 0.35, lR: 0.05, rot: -0.06 },
    { aL: 1.3, eL: -1.8, aR: 1.7, eR: 0.2, lL: 0.05, lR: 0.8, kR: 1.4, rot: 0.08 },
    { aL: 2.2, aR: 2.2, eL: 0.4, eR: 0.4, lL: 0.45, lR: 0.45, dy: 40 },
    { aL: 0.8, eL: 0.5, aR: 1.6, eR: 0, lL: 0.6, lR: 0.05, rot: 0.12, headRot: 0.15 },
    { aL: 1.9, eL: 1.2, aR: 2.0, eR: -0.2, lL: 0.25, lR: 0.25, kL: 0.3, rot: -0.1 },
    { aL: 1.4, eL: 0.2, aR: 1.3, eR: 1.4, lL: 0.8, kL: 1.3, lR: 0.1, dy: 40, rot: 0.05 },
  ];
  function pose(t, off = 0) {
    const n = bgBeatN(t) + off, p = POSES[((n % POSES.length) + POSES.length) % POSES.length];
    const k = elasticOut(clamp(sinceBeat(t) / 0.25));
    return { ...p, dy: (p.dy || 0) * k + bgHop(t) * 6, sq: (1 - k) * 0.12 };
  }
  /** A flat silhouette of the kid (plus a coloured echo), with the lollipop left in colour. */
  function kidCard(x, y, s, t, off, body, echo, a = 1) {
    let M = null, hand = null;
    const draw = () => kid(x, y, s, {
      t, shadow: false, shades: false, ...pose(t, off),
      holdR: (hx, hy) => { M = ctx.getTransform(); hand = [hx, hy]; },
    });
    silhouette(draw, echo, a, 22 * s / 2.5, 12 * s / 2.5);
    silhouette(draw, body, a);
    if (M) {
      ctx.save(); ctx.setTransform(M);
      lolly(hand[0] + 6, hand[1] - 70, 46, 0.3 + Math.sin(bgBeat(t) * Math.PI) * 0.2, PINK);
      ctx.restore();
    }
  }
  function silA(t, lt) {
    const L = cLime(t), P = cPink(t), K = cBlack(t);
    fillScreen(L);
    const b = bgBeat(t), p = bgPulse(t, 5);
    ctx.save();
    for (let i = 6; i >= 0; i--) {
      const r = (i + frac(b)) * 190;
      circle(960, 600, r, { fill: i % 2 ? L : mix(L, P, 0.85), stroke: null });
    }
    ctx.restore();
    const z = 1 + p * 0.03;
    camBegin(960, 560, z);
    ell(960, 985, 300, 30, { fill: rgba(K, 0.35), stroke: null });
    kidCard(960, 980, 2.6, t, 0, K, P);
    camEnd();
    // a glint on the tiny sunglasses: the one thing that isn't black
    const S = 2.6 * 0.58, hy = 980 - (pose(t).dy || 0) * S - 300 * S + 14 * 1.12 * S;
    sparkle(960 + 40 * S, hy - 10 + (pose(t).headDy || 0) * S, 26 + p * 20, '#FFFFFF', t * 2);
    // a strip of beat ticks along the bottom
    for (let i = 0; i < 4; i++) rrect(740 + i * 120, 1030, 80, 18, 9, { fill: i === bb(t) ? P : rgba(K, 0.4), stroke: null });
  }
  function silB(t, lt) {
    const L = cLime(t), P = cPink(t), K = cBlack(t);
    fillScreen(P);
    sunburst(960, 560, mix(P, '#FFFFFF', 0.12), P, t * 0.25, 16, 1800, 1);
    const p = bgPulse(t, 5);
    camBegin(960, 540, 1 + p * 0.025);
    for (const [x, s, off, a] of [[420, 1.5, -1, 0.85], [1500, 1.5, -2, 0.85], [960, 2.5, 0, 1]]) {
      ell(x, 1000, 150 * s, 18 * s, { fill: rgba(K, 0.3), stroke: null });
      kidCard(x, 1000, s, t, off, K, L, a);
    }
    camEnd();
    flash(bgPulse(t, 14) * 0.15, '#FFFFFF');
  }

  // ---- 128.00 · eyes in the gap -------------------------------------------------------------------
  function gapPeek(t, lt) {
    const s = sinceBeat(t), odd = snap(t);
    // stomps land on 2 and 4; after each the lid creeps up again
    const since = odd ? s : s + SONG.beat;
    const slam = Math.exp(-since * 10);
    const gap = odd && s < 0.14 ? 0 : 110 * easeOut(clamp((since - 0.14) / 0.45));
    const [sx, sy] = odd ? shakeXY(t, t - s, 22, 0.3) : [0, 0];
    camBegin(960 + sx, 560 + sy, 1 + lt * 0.015);
    stage(t, { hz: 200 });
    spot(960, 1000, 700, '#FFFFFF', 0.5);
    const look = !odd ? (s < SONG.beat * 0.55 ? (bgBeatN(t) % 4 === 0 ? -1 : 1) : 0) : 0;
    const fear = !odd && s > SONG.beat * 0.55;
    toyBox(960, 1180, 1500, 720, { t, gap, eyes: true, lookX: look, lookY: fear ? -1 : 0.3, squeeze: gap < 30, sweat: fear, eyeS: 2.6 });
    // the kid stands on the lid (knees down in frame); one foot lifts before each stomp
    const lift = !odd ? clamp((s / SONG.beat - 0.4) / 0.6) : 0;
    const lidTop = 1180 - 720 - gap - 50;
    kid(960, lidTop + 14, 3.6, { t, lolly: 'hand', shadow: false, lL: 0.1, lR: 0.1 + easeOut(lift) * 0.5, kR: easeOut(lift) * 1.4, dy: 0 });
    if (odd) {
      sfx('쿵!', 540, 260, 120, cLime(t), s, { life: 0.42, rot: -0.15 });
      dust(960, lidTop + 20, s, 8, 5, 520);
    }
    if (fear) emote('!', 1120, lidTop + 110, clamp((s / SONG.beat - 0.55) * 6), t);
    camEnd();
    flash(slam * 0.25, cLime(t));
  }

  // ---- 135.11 · dancing on the box ----------------------------------------------------------------
  function onBox(t, lt) {
    camBegin(960, 520 - lt * 6, 1.1 + lt * 0.035);
    stage(t, { hz: 640 });
    glow(960, 380, 700, cPink(t), 0.55);
    // the kid's shadow on the back wall, three times the size
    const pz = stompPose(t);
    silhouette(() => kid(960, 640, 3.4, { t, lolly: 'hand', shadow: false, ...pz }), '#050208', 0.85, 0, 0);
    spot(960, 900, 440, '#FFFFFF', 0.7);
    spot(960, 900, 440, cLime(t), 0.5 * bgPulse(t, 4));
    const odd = snap(t), s = sinceBeat(t);
    const gap = odd ? 18 * easeOut(clamp((s - 0.12) / 0.3)) : (s < 0.1 ? 0 : 18 + 10 * easeOut(clamp((s - 0.1) / 0.3)));
    const gy = 940, bw = 600, bh = 250;
    ell(960, gy + 6, 340, 34, { fill: 'rgba(0,0,0,0.5)', stroke: null });
    toyBox(960, gy, bw, bh, { t, gap, eyes: true, lookX: Math.sin(t * 3), lookY: -0.5, squeeze: gap < 20, eyeS: 1.3 });
    const top = gy - bh - gap - 50;
    kid(960, top, 1.8, { t, lolly: 'hand', tint: cLime(t), shadow: false, ...pz });
    ring(960, top + 4, s, cLime(t), 80, 360);
    if (!odd) sfx('쿵', 960 + (bgBeatN(t) % 2 ? -380 : 380), gy - 150, 76, cPink(t), s, { life: 0.4 });
    camEnd();
  }

  // ---- 138.67 · close-up: the shades come down ----------------------------------------------------
  function face(t, lt, dur) {
    const p = bgPulse(t, 6), lower = ease(seg(t, 140.9, 141.9));
    camBegin(960, 560, 1 + lt * 0.03);
    const K = cBlack(t);
    fillScreen(K);
    sunburst(960, 460, mix(K, cPink(t), 0.35), K, -t * 0.15, 14, 1800, 1);
    glow(960, 470, 700, cLime(t), 0.25 + p * 0.2);
    const s = 4.3, y = 560 + 300 * s * 0.58 * 1.0;
    // a lick of the lollipop on beat 1 of each bar
    const lick = bb(t) === 0 ? Math.sin(Math.PI * clamp(sinceBeat(t) / (SONG.beat * 1.8))) : 0;
    kid(960, y, s, {
      t, lolly: 'hand', lollyRot: -0.2 - lick * 0.5, aR: 0.6 + lick * 0.9, eR: 2.0, headRot: Math.sin(bgBeat(t) * Math.PI) * 0.04,
      headDy: p * 8, shadesDown: lower, tint: cLime(t), mouth: 'flat', aL: 0.3, shadow: false,
      // one finger pulls the shades down
      holdL: lower > 0 ? undefined : undefined,
    });
    if (lower > 0) {
      // a hand coming up to lower them
      const hx = 960 + 200, hy = lerp(900, 600, easeOut(seg(t, 140.6, 141.0))) + lower * 50;
      circle(hx, hy, 48, { fill: PAL.skin, lw: 6 });
      stroke([[hx - 20, hy - 30], [hx - 60, hy - 90]], PAL.skin, 26, { olw: 10 });
    }
    camEnd();
    // red floods in from the edges
    fillScreen(rgrad(960, 540, 300, 1200, [[0, rgba(HOT, 0)], [1, rgba(HOT, 0.35 * rk(t))]]));
  }

  // ---- 142.22 · red stage, then the melt ----------------------------------------------------------
  function redStage(t, lt) {
    const sit = ease(seg(t, 143.9, 144.9));
    camBegin(960, 520 - lt * 8, 1.06 + lt * 0.035);
    stage(t, { hz: 640, flashGrid: 0.5 });
    glow(960, 380, 700, HOT, 0.4);
    const pz = stompPose(t, 1 - sit);
    silhouette(() => kid(960, 640, 3.6, { t, lolly: 'hand', shadow: false, ...pz, aR: lerp(1.1, 2.7, sit), eR: lerp(1.3, 0.2, sit) }), '#0A0003', 0.75);
    spot(960, 900, 460, HOT, 1);
    const gy = 940, bw = 600, bh = 250;
    ell(960, gy + 6, 340, 34, { fill: 'rgba(0,0,0,0.5)', stroke: null });
    toyBox(960, gy, bw, bh, { t, gap: 24 + bgHop(t) * 6, eyes: true, lookY: -1, sweat: true, body: '#4A1330', eyeS: 1.3 });
    const top = gy - bh - 50;
    kid(960, top + lerp(0, 110, sit), 1.8, {
      t, lolly: 'hand', tint: HOT, shadow: false, ...pz,
      aR: lerp(1.1, 2.7, sit), eR: lerp(1.3, 0.2, sit), lollyRot: lerp(0.25, -0.1, sit),
      ...(sit > 0.5 ? { lL: 0.2, lR: 0.2, kL: 0, kR: 0 } : {}), shadesDown: 0,
    });
    glow(960, top - 330, 300 * (1 + bgPulse(t, 4) * 0.2), HOT, 0.25);
    camEnd();
    melt(t, seg(t, MELT, SLOW));
  }

  chapter('break', T0, SLOW, [
    [117.33, onLid],
    [120.89, stomp],
    [124.44, silA],
    [128.0, gapPeek],
    [131.56, silB],
    [135.11, onBox],
    [138.67, face],
    [142.22, redStage],
  ]);
})();
