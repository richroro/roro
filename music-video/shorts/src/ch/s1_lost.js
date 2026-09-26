// s1_lost (0 – 14.55) · 잃다.
//   0.00  darkness, one spotlight; a dance shoe falls in slow motion and hits the floor at 1.82 (쾅!)
//   2.27  three manga panels slam in on the beat: a spin in the mirror, a red crack of pain, the
//         studio lights clicking off one by one
//   5.45  a small bedroom at night: brother at the laptop, the blue-haired girl at the mic, the moon
//   9.09  boom: a finger hits the key, the upload bar fills, the light shoots up out of the screen
//  10.91  the night city: the light bursts over the roofs like fireworks made of phone screens
//
// This file also defines the small kit that s2_rise.js shares (window.S12).
(() => {
  // =============================== kit (shared with s2_rise.js) ==================================

  // ---- off-screen buffers ------------------------------------------------------------------------
  const pool = {};
  function buf(k, q = 1) {
    const cw = Math.max(1, Math.round(cv.width * q)), ch = Math.max(1, Math.round(cv.height * q));
    let c = pool[k];
    if (!c) c = pool[k] = document.createElement('canvas');
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.clearRect(0, 0, cw, ch);
    return [c, g];
  }
  /** Lay src (a full-size buffer) over the main canvas blurred by px device pixels, cheaply (at 1/4 size). */
  function blurBlit(src, px, alpha = 1, mode = 'source-over') {
    const q = 0.25, [c, g] = buf('Q', q);
    g.filter = `blur(${Math.max(0.5, px * q).toFixed(1)}px)`; g.drawImage(src, 0, 0, c.width, c.height); g.filter = 'none';
    const main = ctx;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha *= alpha; main.globalCompositeOperation = mode;
    main.imageSmoothingQuality = 'high'; main.drawImage(c, 0, 0, cv.width, cv.height);
    main.restore();
  }
  /** Run fn with the global ctx pointed at g (same transform as the main canvas has now). */
  function paintTo(g, fn) {
    const main = ctx; g.setTransform(main.getTransform()); ctx = g;
    try { fn(); } finally { ctx = main; }
  }
  function tinted(src, color, key = 'T') {
    const [c, g] = buf(key);
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  const BIG = 6000;
  /**
   * A cel figure: fn() paints it off screen, then it goes back with a thick ink outline, an optional
   * hard two-tone shade, a tint (to sit it in the scene's light), a crisp rim of light on the side
   * facing `light`, and a soft glow.
   * o: { ink (world px, 0 = none), inkColor, tint: [color, a], shade: { x0, y0, x1, y1, color, a },
   *      rim: color, light: [dx, dy], rimW, rimA, rimGlow, glow: [color, a, blurPx], alpha, zoom }
   */
  function fig(fn, o = {}) {
    const [A, a] = buf('A');
    paintTo(a, fn);
    if (o.shade) paintTo(a, () => {
      const s = o.shade; ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = lgrad(s.x0, s.y0, s.x1, s.y1, [[0, rgba(s.color, 0)], [0.5, rgba(s.color, 0)], [0.5, rgba(s.color, s.a ?? 0.4)], [1, rgba(s.color, s.a ?? 0.4)]]);
      ctx.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
    });
    if (o.tint) paintTo(a, () => {
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = o.tint[1]; ctx.fillStyle = o.tint[0];
      ctx.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
    });
    const main = ctx, m = main.getTransform(), S = Math.hypot(m.a, m.b);   // world px -> device px
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    if (o.alpha !== undefined) main.globalAlpha *= o.alpha;
    const base = main.globalAlpha;
    if (o.glow) {
      blurBlit(tinted(A, o.glow[0]), (o.glow[2] ?? 30) * S, o.glow[1] ?? 0.8, 'lighter');
    }
    if (o.ink !== 0) {
      const w = (o.ink ?? 6) * S, T = tinted(A, o.inkColor || ANI.ink);
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; main.drawImage(T, Math.cos(an) * w, Math.sin(an) * w); }
    }
    main.drawImage(A, 0, 0);
    if (o.rim) {
      const [lx, ly] = o.light || [1, -0.4], L = Math.hypot(lx, ly) || 1, w = (o.rimW ?? 8) * S;
      const dx = lx / L * w, dy = ly / L * w;
      const [R, r] = buf('R');
      r.drawImage(A, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = o.rim; r.fillRect(0, 0, R.width, R.height);
      r.globalCompositeOperation = 'destination-out'; r.drawImage(A, -dx, -dy);
      main.globalAlpha = base * (o.rimA ?? 1); main.drawImage(R, 0, 0);
      if (o.rimGlow) { main.globalAlpha = base; blurBlit(R, 10 * S, o.rimGlow, 'lighter'); }
    }
    main.restore();
  }

  /** Paint fn() out of focus (for depth of field and bokeh). */
  function blurLayer(px, fn, alpha = 1) {
    const [A, a] = buf('B');
    paintTo(a, fn);
    const m = ctx.getTransform();
    blurBlit(A, px * Math.hypot(m.a, m.b), alpha);
  }

  // ---- camera ------------------------------------------------------------------------------------
  const handheld = (t, amt = 1) => [
    (Math.sin(t * 1.3) * 6 + Math.sin(t * 2.9 + 1) * 3) * amt,
    (Math.sin(t * 1.1 + 2) * 5 + Math.sin(t * 3.3) * 2) * amt,
    Math.sin(t * 0.9) * 0.004 * amt];
  function cam(t, cx, cy, z = 1, rot = 0, amt = 1) {
    const [hx, hy, hr] = handheld(t, amt);
    camBegin(cx + hx / z, cy + hy / z, z, rot + hr);
  }
  /** Sum of shakes for a list of hits. */
  function shakes(t, hits, amt = 20, len = 0.35) {
    let x = 0, y = 0;
    for (const h of hits) { const [a, b] = shakeXY(t, h, amt, len); x += a; y += b; }
    return [x, y];
  }
  /** A steady jitter (for a build-up), amplitude amt. */
  const jitter = (t, amt) => [Math.sin(t * 97) * amt + Math.sin(t * 61 + 1) * amt * 0.5, Math.cos(t * 83) * amt + Math.cos(t * 53 + 2) * amt * 0.5];

  // ---- light -------------------------------------------------------------------------------------
  function softEll(x, y, rx, ry, color, a, mode = 'source-over') {
    if (a <= 0.002 || rx <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = mode;
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    ctx.fillStyle = rgrad(0, 0, 0, rx, [[0, rgba(color, a)], [0.45, rgba(color, a * 0.55)], [1, rgba(color, 0)]]);
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  /** A shaft of light: the segment [xa, xb] at y0 opening to [xc, xd] at y1. */
  function beam(xa, xb, y0, xc, xd, y1, color, a, fade = 0.15) {
    if (a <= 0.002) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = lgrad(0, y0, 0, y1, [[0, rgba(color, a)], [0.55, rgba(color, a * 0.55)], [1, rgba(color, a * fade)]]);
    ctx.beginPath(); ctx.moveTo(xa, y0); ctx.lineTo(xb, y0); ctx.lineTo(xd, y1); ctx.lineTo(xc, y1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const sprites = {};
  function sprite(color) {
    if (sprites[color]) return sprites[color];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.2, rgba(color, 0.6)); gr.addColorStop(0.5, rgba(color, 0.14)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (sprites[color] = c);
  }
  /** A cheap glowing dot (additive). */
  function dot(x, y, r, color, a = 1) {
    if (a <= 0.003 || r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= clamp(a);
    ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  /** Dust drifting in a box. */
  function dust(t, x, y, w, h, n, color = '#FFF1D0', a = 0.8, seed = 1) {
    for (let i = 0; i < n; i++) {
      const px = x + frac(hash(i, seed) + t * 0.01 * (hash(i, seed + 1) - 0.5)) * w + Math.sin(t * 0.7 + i) * 12;
      const py = y + frac(hash(i, seed + 2) - t * 0.02 * (0.3 + hash(i, seed + 3))) * h;
      dot(px, py, 3 + hash(i, seed + 4) * 7, color, a * (0.4 + 0.6 * Math.sin(t * 2 + i * 1.7) ** 2));
    }
  }
  /** Darken the top of the frame so the captions read over anything. */
  function scrim(a = 0.6, to = 760, color = '#0B0814') {
    fillScreen(lgrad(0, 0, 0, to, [[0, rgba(color, a)], [0.7, rgba(color, a * 0.6)], [1, rgba(color, 0)]]));
  }
  function white(k, color = '#FFFFFF') { if (k > 0.002) fillScreen(color, clamp(k)); }

  // ---- little things -----------------------------------------------------------------------------
  function noteGlyph(x, y, s, color, rot = 0, two = false) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const o = { fill: color, stroke: ANI.ink, lw: 5 };
    if (two) {
      poly([[-2, -56], [58, -70], [58, -58], [-2, -44]], o);
      rrect(-4, -56, 8, 74, 3, o); rrect(54, -70, 8, 74, 3, o);
      ell(-16, 18, 18, 13, o, -0.4); ell(42, 4, 18, 13, o, -0.4);
    } else {
      rrect(-2, -54, 8, 72, 3, o);
      poly([[2, -54], [32, -34], [30, -18], [4, -34]], o);
      ell(-14, 18, 19, 14, o, -0.4);
    }
    ctx.restore();
  }
  /** A phone seen from the front: just a glowing screen, no logos. */
  function phone(x, y, s, rot, glowC = '#BFE4FF', a = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
    rrect(-16, -30, 32, 60, 7, { fill: '#1A1826', stroke: ANI.ink, lw: 4 });
    rrect(-12, -25, 24, 50, 4, { fill: glowC, stroke: null });
    ctx.restore();
    dot(x, y, 40 * s, glowC, 0.5 * a);
  }
  /** A jagged crack (lightning) from p0 in direction ang, length len; returns the points. */
  function crackPts(x, y, ang, len, n, seed) {
    const pts = [[x, y]];
    for (let i = 1; i <= n; i++) {
      const d = len * i / n, j = (hash(i, seed) - 0.5) * len * 0.35;
      pts.push([x + Math.cos(ang) * d - Math.sin(ang) * j, y + Math.sin(ang) * d + Math.cos(ang) * j]);
    }
    return pts;
  }

  window.S12 = { buf, blurBlit, paintTo, fig, blurLayer, handheld, cam, shakes, jitter, softEll, beam, dot, dust, scrim, white, noteGlyph, phone, crackPts };

  // =============================== chapter 1 ======================================================
  const HAIR_KID = '#6B4A3A', HAIR_BLUE = '#5B8CFF';
  const B = SONG.beat, HIT1 = 1.8182, HIT2 = 9.0909;

  // ---- the dance shoe: a soft split-sole jazz shoe, side view, sole at y = 0 ---------------------
  function shoe(x, y, s, rot, t, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const upper = [[-162, -12], [-168, -70], [-148, -112], [-96, -122], [-44, -108], [10, -96], [80, -80], [136, -58], [168, -32], [174, -10]];
    // ribbon laces trailing (they blow upward while it falls)
    const lift = o.lift ?? 1;
    for (const [i, c] of [[0, '#FF6FB5'], [1, '#FF9ACB']]) {
      const bx = -30 + i * 30, by = -112;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const u = k / 6;
        pts.push([bx - u * 150 * (0.4 + 0.6 * lift) + Math.sin(t * 7 + u * 5 + i) * 22 * u, by - u * 190 * lift + u * (1 - lift) * 150 + Math.cos(t * 5 + u * 4 + i) * 10 * u]);
      }
      stroke(pts, c, 12, { ink: ANI.ink, olw: 8, smooth: true });
    }
    smooth(upper.concat([[120, 0], [-120, 0]]), { fill: '#FBF4FF', stroke: null });
    ctx.save(); smoothPath(upper.concat([[120, 0], [-120, 0]])); ctx.clip();
    ctx.fillStyle = '#CDBFE6'; ctx.fillRect(-200, -52, 400, 80);                 // cel shadow band
    ctx.fillStyle = '#FFC9E4'; ctx.fillRect(40, -200, 200, 400);                 // pink toe cap
    ctx.fillStyle = '#E79CC6'; ctx.fillRect(40, -52, 200, 80);
    ctx.restore();
    smooth(upper.concat([[120, 0], [-120, 0]]), { fill: null, stroke: ANI.ink, lw: 7 });
    ell(-96, -116, 56, 12, { fill: '#2A2138', stroke: ANI.ink, lw: 5 });          // the opening
    for (let k = 0; k < 4; k++) stroke([[-40 + k * 26, -106 + k * 4], [-20 + k * 26, -90 + k * 4]], '#FF6FB5', 6, { ink: null });
    rrect(-170, -16, 346, 26, 12, { fill: '#D9D3E8', stroke: ANI.ink, lw: 6 });   // split sole
    rrect(-40, -12, 60, 20, 8, { fill: '#B6AECB', stroke: null });
    stroke([[-140, -96], [-100, -112], [-50, -102]], '#FFFFFF', 7, { ink: null, smooth: true });
    ctx.restore();
  }

  // ---- shot 1: the shoe falls ----------------------------------------------------------------
  function shoeFall(t, lt) {
    fillScreen('#060509');
    const FY = 1500, k = clamp(t / HIT1), after = t - HIT1;
    const fallY = tt => lerp(-900, FY, Math.pow(clamp(tt / HIT1), 1.35));
    const [sx, sy] = shakes(t, [HIT1], 40, 0.55);
    const z = kf(t, [[0, 1.0], [HIT1, 1.1], [2.3, 1.16]], easeInOut);
    // the camera rides down with the shoe, then the floor comes up to meet it
    const cy = fallY(Math.min(t, HIT1)) - lerp(-40, 330, ease(k)) / z;
    cam(t, 540 + sx, cy + sy, z, after > 0 ? 0.03 * Math.exp(-after * 6) : Math.sin(t * 1.3) * 0.02, 0.5);
    // floor
    ctx.fillStyle = lgrad(0, FY - 40, 0, 2600, [[0, '#15111E'], [1, '#060509']]);
    ctx.fillRect(-400, FY - 40, 1900, 1600);
    for (let i = -8; i <= 8; i++) stroke([[540 + i * 60, FY - 40], [540 + i * 260, 2600]], '#1E1929', 3, { ink: null });
    // the spotlight
    const flick = t > 2.0 ? 0.75 + 0.25 * Math.sin(t * 80) : 1;
    beam(470, 610, -2600, 130, 950, FY, '#FFF1D2', 0.3 * flick, 0.5);
    beam(515, 565, -2600, 330, 750, FY, '#FFFFFF', 0.14 * flick, 0.5);
    softEll(540, FY, 460, 90, '#FFE8C0', 0.55 * flick, 'screen');
    ctx.save(); polyPath([[470, -2600], [610, -2600], [950, FY], [130, FY]]); ctx.clip();
    dust(t, 130, -1400, 820, 2900, 90, '#FFF1D0', 0.6, 3);
    for (let i = 0; i < 10; i++) {           // faint streaks in the light: we are falling with it
      const x = 300 + hash(i, 1) * 480, y = -1200 + hash(i, 2) * 2600;
      stroke([[x, y], [x, y + 260]], '#FFF1D0', 3, { ink: null, alpha: 0.18 * (1 - clamp(after * 4)) });
    }
    ctx.restore();
    // the shoe, tumbling gently, ribbons streaming up
    const rotAt = tt => (1 - clamp(tt / HIT1)) * (0.9 + 0.6 * Math.sin(tt * 1.7)) - 0.15 * Math.sin(tt * 2.3) * (1 - clamp(tt / HIT1));
    const bounce = after > 0 ? Math.abs(Math.sin(after * 11)) * 60 * Math.exp(-after * 7) : 0;
    const rot = after > 0 ? Math.sin(after * 18) * 0.12 * Math.exp(-after * 6) : rotAt(t);
    if (after < 0) for (let i = 4; i >= 1; i--) {
      const tt = t - i * 0.07;
      ctx.save(); ctx.globalAlpha *= 0.05 * (5 - i) / 2; shoe(540, fallY(tt), 1.35, rotAt(tt), tt, { lift: 1 }); ctx.restore();
    }
    softEll(540, FY + 6, 220 * (0.3 + 0.7 * k * k), 28, '#000000', 0.75 * k);
    if (after >= 0) for (let i = 0; i < 14; i++) {
      const r = easeOut(clamp(after / 0.45)), a = (i / 14) * Math.PI + Math.PI, d = r * (160 + hash(i, 4) * 240);
      const px = 540 + Math.cos(a) * d * 1.8, py = FY - 10 + Math.sin(a) * d * 0.3;
      circle(px, py, (22 + hash(i, 5) * 30) * (1 - r * 0.5), { fill: '#3A3348', stroke: null, alpha: 0.8 * (1 - r) });
    }
    fig(() => shoe(540, (after > 0 ? FY : fallY(t)) - bounce, 1.35, rot, t, { lift: after > 0 ? clamp(1 - after * 3) : 1 }),
      { ink: 0, rim: '#FFF6DA', light: [0.2, -1], rimW: 7, rimGlow: 0.6 });
    // the landing: shock ring, dust, cracks
    if (after >= 0) {
      const r = easeOut(clamp(after / 0.45));
      ctx.save(); ctx.globalAlpha = 1 - r;
      ctx.lineWidth = 16 * (1 - r) + 3; ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(540, FY, 120 + r * 620, 22 + r * 110, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      const ck = clamp(after / 0.12);
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, pts = crackPts(540 + side * 120, FY + 4, side > 0 ? 0.08 * (i - 2) : Math.PI - 0.08 * (i - 3), 300 * ck, 5, i + 20);
        stroke(pts.map(([px, py]) => [px, FY + (py - FY) * 0.35 + 6]), ANI.lime, 5, { ink: null, alpha: clamp(1 - after * 1.5) });
      }
      glow(540, FY - 40, 500, '#FFF1D0', 0.5 * Math.exp(-after * 5));
    }
    camEnd();
    // screen space
    if (after >= 0) {
      speedLinesV(t, 540, 1250, clamp(1 - after / 0.45), '#FFFFFF');
      slam(t, HIT1, '쾅!', 560, 850, 280, ANI.white, { life: 0.8, rot: -0.14 });
    }
    scrim(0.45);
    tagLine(t, 0.2, 1.9, '열세 살,');
    tagLine(t, HIT1, 5.45, '열세 살,\n소녀는 춤을 잃었다', { colors: [ANI.white, ANI.lime] });
    impact(t, HIT1, 0.1);
  }

  // ---- shot 2: three manga panels ------------------------------------------------------------
  const PH = [2.2727, 3.1818, 4.0909];
  const OFF = [4.5454, 4.7727, 5.0];
  const PANELS = [
    { x: 40, y: 730, w: 560, h: 900, rot: -0.02, from: [-900, 0] },
    { x: 622, y: 730, w: 418, h: 438, rot: 0.03, from: [900, -200] },
    { x: 622, y: 1190, w: 418, h: 440, rot: -0.02, from: [300, 1000] },
  ];

  function studioWall(x, y, w, h, warm = 1) {
    ctx.fillStyle = lgrad(0, y, 0, y + h, [[0, mix('#3A2A55', '#FFB77A', warm)], [0.62, mix('#2A2140', '#F08A5A', warm)], [0.62, '#7A4A32'], [1, '#3E2418']]);
    ctx.fillRect(x - 50, y - 50, w + 100, h + 100);
  }

  function spinPanel(t) {
    const p = PANELS[0], cx = p.x + p.w / 2, fy = p.y + p.h - 60;
    studioWall(p.x, p.y, p.w, p.h);
    // the mirror wall
    const mx = p.x + 30, my = p.y + 60, mw = p.w - 60, mh = p.h * 0.56;
    rrect(mx, my, mw, mh, 6, { fill: lgrad(0, my, 0, my + mh, [[0, '#BFD6EE'], [1, '#6F88B2']]), stroke: '#2B2238', lw: 10 });
    ctx.save(); rrectPath(mx, my, mw, mh, 6); ctx.clip();
    for (let i = 0; i < 3; i++) {
      const sx = mx + frac(0.2 + i * 0.3 + t * 0.15) * (mw + 400) - 200;
      poly([[sx, my], [sx + 40 + i * 20, my], [sx - 160 + i * 20, my + mh], [sx - 200, my + mh]], { fill: '#FFFFFF', stroke: null, alpha: 0.35 });
    }
    // her reflection: the same spin, a little smaller, cooler, face lost in the backlight
    const ph = t * 9, c = Math.cos(ph), sgn = c < 0 ? -1 : 1, sxk = 0.4 + 0.6 * Math.abs(c);
    ctx.save(); ctx.translate(cx, my + mh + 30); ctx.scale(sxk, 1);
    ctx.globalAlpha = 0.55;
    heroine(0, 0, 0.5, { t, view: 'front', pose: 'spin', hair: HAIR_KID, outfit: 'dance', age: 0.75, wind: 0.7, flip: sgn < 0 });
    ctx.restore();
    fillScreen('#6F88B2', 0.0);
    ctx.restore();
    stroke([[p.x, p.y + p.h * 0.45], [p.x + p.w, p.y + p.h * 0.45]], '#C58A55', 12, { ink: '#2B2238', olw: 6 });   // the barre
    // floor planks
    for (let i = -6; i <= 6; i++) stroke([[cx + i * 50, p.y + p.h * 0.62], [cx + i * 150, p.y + p.h + 40]], '#5E3524', 3, { ink: null });
    softEll(cx, fy, 220, 40, '#000000', 0.45);
    // swirl lines around her
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7 - i * 2; ctx.lineCap = 'round';
      const yy = fy - 180 - i * 170, a0 = ph * 0.9 + i * 2;
      ctx.beginPath(); ctx.ellipse(cx, yy, 230 - i * 30, 40, 0, a0, a0 + 2.2); ctx.stroke();
      ctx.restore();
    }
    fig(() => {
      ctx.save(); ctx.translate(cx, fy); ctx.scale(sxk, 1);
      heroine(0, 0, 0.78, { t, view: 'back', pose: 'spin', hair: HAIR_KID, outfit: 'dance', age: 0.75, wind: 0.8, flip: sgn < 0 });
      ctx.restore();
    }, { ink: 5, rim: '#FFE6B0', light: [1, -0.5], rimW: 7, shade: { x0: cx - 60, y0: 0, x1: cx + 60, y1: 0, color: '#2A1840', a: 0 } });
    sparkles(t, 10, p.x, p.y + 40, p.w, p.h * 0.6, '#FFFFFF');
  }

  function painPanel(t) {
    const p = PANELS[1], cx = p.x + p.w / 2, cy = p.y + p.h / 2, age = t - PH[1];
    ctx.fillStyle = lgrad(0, p.y, 0, p.y + p.h, [[0, '#4A0716'], [1, '#12030A']]);
    ctx.fillRect(p.x - 40, p.y - 40, p.w + 80, p.h + 80);
    const fl = Math.exp(-age * 3) + 0.25 * (Math.sin(t * 30) > 0.3 ? 1 : 0) * Math.exp(-age);
    glow(cx - 10, cy + 20, 420, '#FF2A4A', 0.5 + 0.4 * fl);
    // radiating shards
    ctx.save(); ctx.globalAlpha = 0.6;
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU + hash(i, 9) * 0.2, r0 = 60 + hash(i, 8) * 50;
      poly([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a + 0.03) * 700, cy + Math.sin(a + 0.03) * 700], [cx + Math.cos(a - 0.03) * 700, cy + Math.sin(a - 0.03) * 700]],
        { fill: i % 2 ? '#FF6A7A' : '#2A0510', stroke: null });
    }
    ctx.restore();
    // her silhouette mid-turn, cropped at the hips
    const jx = Math.sin(t * 70) * 6 * Math.exp(-age * 2);
    fig(() => heroine(cx + 20 + jx, cy + 330, 0.95, { t, view: 'back', pose: 'spin', hair: HAIR_KID, outfit: 'dance', age: 0.75, wind: 0.4 }),
      { ink: 5, tint: ['#16060C', 0.82], rim: '#FF4A62', light: [-1, -0.3], rimW: 9, rimGlow: 0.8 });
    // the crack of pain at the hip: a red bolt with a white-hot core
    const hx = cx + 10, hy = cy + 40, grow = easeOut(clamp(age / 0.14));
    for (const [ang, len, sd] of [[-0.35, 230, 1], [Math.PI + 0.25, 220, 2], [1.2, 150, 3], [-1.9, 140, 4]]) {
      const pts = crackPts(hx, hy, ang, len * grow, 6, sd + Math.floor(t * 12) % 2);
      stroke(pts, '#FF2A4A', 16, { ink: ANI.ink, olw: 10 });
      stroke(pts, '#FFE6EA', 5, { ink: null });
    }
    glow(hx, hy, 160, '#FF6A7A', 0.8 * (0.6 + 0.4 * fl));
    screentone(p.x, p.y, p.w, p.h, 14, '#000000', 0.35);
  }

  function lightsPanel(t) {
    const p = PANELS[2], cx = p.x + p.w / 2;
    const offK = OFF.map(o => (t >= o ? 1 : 0));
    const lit = 3 - offK.reduce((a, b) => a + b, 0);
    studioWall(p.x, p.y, p.w, p.h, 0.35 * lit / 3);
    const fy = p.y + p.h - 70;
    for (let i = 0; i < 3; i++) {
      const lx = p.x + 80 + i * 130, ly = p.y + 90, on = !offK[i];
      stroke([[lx, p.y - 10], [lx, ly - 30]], '#1A1422', 4, { ink: null });
      poly([[lx - 40, ly], [lx + 40, ly], [lx + 18, ly - 34], [lx - 18, ly - 34]], { fill: '#2B2238', stroke: ANI.ink, lw: 4 });
      if (on) {
        beam(lx - 34, lx + 34, ly, lx - 120, lx + 120, fy + 40, '#FFE2A8', 0.45);
        softEll(lx, fy + 10, 130, 22, '#FFE2A8', 0.5, 'screen');
        circle(lx, ly + 4, 16, { fill: '#FFF6D8', stroke: null });
        dot(lx, ly + 4, 70, '#FFD890', 0.8);
      } else {
        const age = t - OFF[i];
        circle(lx, ly + 4, 14, { fill: '#3A3048', stroke: null });
        dot(lx, ly + 4, 60, '#FFB070', 0.9 * Math.exp(-age * 5));
        if (age < 0.12) flash(0.0);
      }
    }
    // the shoe, alone on the floor
    fig(() => shoe(cx + 40, fy + 20, 0.5, 0.05, t, { lift: 0 }), { ink: 0, rim: '#FFF6DA', light: [0, -1], rimW: 5, alpha: 0.35 + 0.65 * lit / 3 });
    if (lit === 0) fillScreen('#000000', 0);
    const dark = 1 - lit / 3;
    ctx.save(); ctx.fillStyle = rgba('#05040A', 0.75 * dark); ctx.fillRect(p.x - 40, p.y - 40, p.w + 80, p.h + 80); ctx.restore();
    screentone(p.x, p.y, p.w, p.h, 12, '#000000', 0.25 + 0.3 * dark);
  }

  function panels(t, lt) {
    fillScreen('#0D0A14');
    ctx.save(); ctx.globalAlpha = 0.5;
    sunburst(540, 1180, '#16111F', '#0D0A14', t * 0.1, 24, 1600);
    ctx.restore();
    screentone(0, 700, W, 1000, 16, '#2A2140', 0.6);
    const [sx, sy] = shakes(t, PH, 26, 0.3);
    ctx.save(); ctx.translate(sx, sy);
    PANELS.forEach((p, i) => {
      if (t < PH[i]) return;
      const k = clamp((t - PH[i]) / 0.16), e = backOut(k);
      const dx = p.from[0] * (1 - e), dy = p.from[1] * (1 - e), s = lerp(1.25, 1, easeOut(k));
      ctx.save();
      ctx.translate(p.x + p.w / 2 + dx, p.y + p.h / 2 + dy); ctx.scale(s, s); ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
      // a hard ink drop shadow behind the panel
      ctx.save(); ctx.translate(p.x + p.w / 2 + 14, p.y + p.h / 2 + 18); ctx.rotate(p.rot); ctx.fillStyle = '#000000'; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      panel(p.x, p.y, p.w, p.h, [spinPanel, painPanel, lightsPanel][i].bind(null, t), { rot: p.rot, border: 12 });
      ctx.restore();
    });
    ctx.restore();
    // after the last light goes out, the whole page sinks into the night
    fillScreen('#05040A', 0.7 * easeIn(seg(t, 5.0, 5.45)));
    for (const h of PH) speedLinesV(t, 540, 1180, clamp(1 - (t - h) / 0.25) * (t >= h ? 1 : 0), '#FFFFFF');
    scrim(0.3);
    tagLine(t, HIT1, 5.45, '열세 살,\n소녀는 춤을 잃었다', { colors: [ANI.white, ANI.lime] });
    subLine(t, 2.35, 5.45, '성장판 부상으로 춤을 그만둬야 했다', { size: 54, y: 600 });
    for (const h of PH) impact(t, h, 0.05);
  }

  // ---- shot 3: the bedroom at night ----------------------------------------------------------
  function laptopBack(x, y, s, t, screenA = 1) {
    // a laptop seen from the user's side: the screen faces the camera over his shoulder
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    poly([[-150, 0], [150, 0], [170, 24], [-170, 24]], { fill: '#3A3650', stroke: ANI.ink, lw: 5 });
    poly([[-140, 0], [140, 0], [130, -190], [-130, -190]], { fill: '#15131F', stroke: ANI.ink, lw: 6 });
    poly([[-126, -12], [126, -12], [118, -178], [-118, -178]], { fill: mix('#0E1430', '#2A4A8A', screenA), stroke: null });
    // a generic editor: coloured clip bars and a waveform
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      if (hash(r, c) < 0.3) continue;
      rrect(-110 + c * 44, -165 + r * 26, 38, 18, 4, { fill: ['#FF6FB5', '#6FC8FF', '#B6FF3B', '#FFC83D'][r], stroke: null, alpha: 0.85 * screenA });
    }
    ctx.save(); ctx.strokeStyle = rgba('#FFFFFF', 0.9 * screenA); ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const xx = -110 + i * 3.7, a = Math.sin(i * 0.9 + t * 8) * (6 + 10 * pulse(t, 5)) * Math.sin(i / 60 * Math.PI); ctx.lineTo(xx, -40 + a); }
    ctx.stroke(); ctx.restore();
    stroke([[-20 + frac(t / (B * 8)) * 0, -178], [-20, -12]], '#FFFFFF', 2, { ink: null, alpha: 0 });
    ctx.restore();
    dot(x, y - 100 * s, 260 * s, '#6FA8FF', 0.35 * screenA);
  }

  function bedroom(t, lt) {
    const [sx, sy] = shakes(t, [], 0);
    const z = kf(lt, [[0, 1.22], [3.64, 1.08]], easeOut);
    cam(t, 560 + lt * 8 + sx, 1090 + sy, z, 0, 0.8);
    // wall
    ctx.fillStyle = lgrad(0, 300, 0, 1700, [[0, '#1C1E4E'], [1, '#110F2E']]);
    ctx.fillRect(-300, 0, 1700, 1800);
    // the window
    const wx = 180, wy = 640, ww = 720, wh = 560;
    ctx.save(); rrectPath(wx, wy, ww, wh, 10); ctx.clip();
    ctx.fillStyle = lgrad(0, wy, 0, wy + wh, [[0, '#1B2466'], [0.6, '#4A3C9A'], [1, '#C66FA8']]);
    ctx.fillRect(wx, wy, ww, wh);
    for (let i = 0; i < 40; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * (2 + hash(i, 3) * 3) + i);
      dot(wx + hash(i, 1) * ww, wy + hash(i, 2) * wh * 0.6, 4 + 6 * tw, '#FFFFFF', 0.7 * tw);
    }
    const mxp = 690, myp = 790;
    glow(mxp, myp, 300, '#CFE0FF', 0.6);
    circle(mxp, myp, 76, { fill: '#FFF8E6', stroke: null });
    circle(mxp + 26, myp - 18, 70, { fill: rgba('#1B2466', 0), stroke: null });
    ctx.save(); ctx.beginPath(); ctx.arc(mxp, myp, 76, 0, TAU); ctx.clip(); circle(mxp - 34, myp + 20, 64, { fill: '#E9DDC4', stroke: null }); ctx.restore();
    celCloud(420 + frac(t * 0.02) * 300, 900, 0.5, '#5A4FA8', '#3E3585');
    celCloud(820 - frac(t * 0.015) * 200, 1010, 0.4, '#6A5AB0', '#4A3F90');
    // the town beyond
    for (let i = 0; i < 12; i++) {
      const bx = wx + i * 64 - 10, bh = 80 + hash(i, 7) * 150;
      ctx.fillStyle = '#141236'; ctx.fillRect(bx, wy + wh - bh, 60, bh);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (hash(i * 7 + r, c) > 0.6 && r * 26 + 20 < bh) {
        ctx.fillStyle = hash(i, r + c) > 0.5 ? '#FFD890' : '#9FD0FF'; ctx.fillRect(bx + 8 + c * 18, wy + wh - bh + 12 + r * 26, 9, 12);
      }
    }
    ctx.restore();
    rrect(wx, wy, ww, wh, 10, { fill: null, stroke: '#0A0920', lw: 22 });
    stroke([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], '#0A0920', 16, { ink: null });
    stroke([[wx, wy + wh * 0.45], [wx + ww, wy + wh * 0.45]], '#0A0920', 12, { ink: null });
    // curtains
    for (const side of [-1, 1]) {
      const cx0 = side < 0 ? wx - 40 : wx + ww + 40;
      const pts = [[cx0 - 70, wy - 60], [cx0 + 70, wy - 60], [cx0 + 60 + Math.sin(t * 1.2 + side) * 10, wy + wh + 120], [cx0 - 80 + Math.sin(t * 1.3) * 12, wy + wh + 140]];
      smooth(pts, { fill: '#2A2464', stroke: null });
      screentone(cx0 - 90, wy - 60, 180, wh + 200, 12, '#000000', 0.25);
    }
    // fairy lights along the top
    for (let i = 0; i < 16; i++) {
      const u = i / 15, lx = 100 + u * 880, ly = 590 + Math.sin(u * Math.PI) * 50;
      const on = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.3);
      circle(lx, ly, 8, { fill: '#FFE6A8', stroke: null });
      dot(lx, ly, 40, '#FFB870', 0.7 * on);
    }
    // moonlight on the floor
    beam(wx + 40, wx + ww - 40, wy + wh, wx - 60, wx + ww + 80, 1720, '#9FB8FF', 0.2);
    // floor
    ctx.fillStyle = lgrad(0, 1520, 0, 1900, [[0, '#231C3E'], [1, '#120E24']]);
    ctx.fillRect(-300, 1540, 1700, 1000);
    stroke([[-300, 1540], [1400, 1540]], '#0A0920', 6, { ink: null });
    // the desk, the laptop, the brother at it
    rrect(60, 1340, 470, 26, 6, { fill: '#5A3E5E', stroke: ANI.ink, lw: 5 });
    rrect(80, 1366, 18, 190, 4, { fill: '#3A2840', stroke: null });
    rrect(492, 1366, 18, 190, 4, { fill: '#3A2840', stroke: null });
    laptopBack(390, 1340, 0.85, t);
    // a small speaker and a lamp, off
    rrect(110, 1250, 70, 90, 10, { fill: '#2A2438', stroke: ANI.ink, lw: 5 });
    circle(145, 1290, 20 + 3 * pulse(t, 6), { fill: '#141019', stroke: '#5A5470', lw: 4 });
    fig(() => {
      ctx.save(); ctx.beginPath(); ctx.rect(-200, 0, 1500, 1455); ctx.clip();
      brother(290, 1600, 0.62, { t, hair: '#3A2A20' });
      ctx.restore();
      // chair back over him
      rrect(210, 1400, 160, 60, 20, { fill: '#2B2440', stroke: ANI.ink, lw: 5 });
      rrect(280, 1460, 20, 90, 4, { fill: '#1B1726', stroke: null });
      stroke([[230, 1590], [290, 1550], [350, 1590]], '#1B1726', 10, { ink: null });
    }, { ink: 5, rim: '#8FB8FF', light: [0.6, -1], rimW: 6, rimGlow: 0.3 });
    // the girl at the mic, backlit by the window
    const bob = hop(t) * 6;
    fig(() => heroine(760, 1640 - bob, 0.86, { t, view: 'side', pose: 'sing', hair: HAIR_BLUE, wind: 0.25, flip: true, rim: '#CFE4FF', rimK: 0.9 }),
      { ink: 6, rim: '#BFD8FF', light: [-0.4, -1], rimW: 8, rimGlow: 0.5 });
    // notes pouring out of the mic and the laptop, drifting up to the window
    for (let i = 0; i < 16; i++) {
      const ts = 5.45 + i * B / 2 - 1.2, age = t - ts;
      if (age < 0 || age > 2.6) continue;
      const fromMic = i % 2 === 0;
      const x0 = fromMic ? 690 : 390, y0 = fromMic ? 1080 : 1220;
      const k = age / 2.6;
      const x = lerp(x0, 380 + hash(i, 3) * 440, easeOut(k)) + Math.sin(age * 3 + i) * 30;
      const y = lerp(y0, 780 + hash(i, 4) * 200, easeOut(k));
      const c = [ANI.white, ANI.sky, ANI.lime, '#FFB7E0'][i % 4];
      const s = (0.9 + 0.3 * pulse(t, 6)) * (0.8 + hash(i, 5) * 0.5) * clamp(age * 5) * (1 - easeIn(clamp((k - 0.75) / 0.25)));
      dot(x, y, 70 * s, c, 0.5);
      noteGlyph(x, y, s, c, Math.sin(age * 4 + i) * 0.3, i % 3 === 0);
    }
    dust(t, 180, 640, 720, 900, 18, '#CFE0FF', 0.4, 9);
    camEnd();
    scrim(0.55);
    tagLine(t, 5.55, 9.09, '남은 건,\n노래였다', { colors: [ANI.white, ANI.sky] });
    fillScreen('#000000', 1 - clamp(lt / 0.2));
  }

  // ---- shot 4: the upload --------------------------------------------------------------------
  // a laptop in three-quarter view; its corners in world space
  const SCR = [[190, 760], [890, 760], [930, 1230], [150, 1230]];   // screen: tl tr br bl
  const DECK = [[150, 1230], [930, 1230], [1060, 1600], [20, 1600]];
  const quadPt = (q, u, v) => {
    const top = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], bot = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)];
    return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
  };
  function upload(t, lt) {
    const [sx, sy] = shakes(t, [HIT2], 36, 0.5);
    const launch = 10.45;
    const [lx, ly] = shakes(t, [launch], 22, 0.4);
    cam(t, 540 + sx + lx, 1090 + sy + ly - easeIn(seg(t, launch, 10.91)) * 120, kf(lt, [[0, 1.12], [1.82, 1.02]], easeOut), -0.02, 0.6);
    fillScreen(lgrad(0, 0, 0, H, [[0, '#0A0C22'], [1, '#05040C']]));
    const fillK = easeInOut(seg(t, 9.2, 10.3)), done = t > 10.3;
    // screen light spilling on everything
    glow(540, 1000, 900, '#4A7BFF', 0.35 + 0.3 * fillK + (done ? 0.4 * Math.exp(-(t - 10.3) * 3) : 0));
    // the lid
    poly(SCR.map(([x, y], i) => [x + (i < 2 ? (i ? 22 : -22) : (i === 2 ? 22 : -22)), y + (i < 2 ? -22 : 10)]), { fill: '#1B1928', stroke: ANI.ink, lw: 8 });
    poly(SCR, { fill: '#0F1638', stroke: null });
    // the screen: an up-arrow in a ring and a progress bar
    ctx.save(); polyPath(SCR); ctx.clip();
    ctx.fillStyle = lgrad(0, 760, 0, 1230, [[0, '#18255E'], [1, '#0E1433']]); ctx.fillRect(100, 700, 900, 600);
    const [acx, acy] = quadPt(SCR, 0.5, 0.42);
    const up = done ? easeIn(clamp((t - launch) / 0.35)) : 0;
    const ringR = 120 + 10 * pulse(t, 6);
    ctx.save(); ctx.lineWidth = 14; ctx.strokeStyle = '#6FC8FF'; ctx.beginPath(); ctx.arc(acx, acy, ringR, 0, TAU); ctx.stroke();
    ctx.strokeStyle = ANI.lime; ctx.beginPath(); ctx.arc(acx, acy, ringR, -Math.PI / 2, -Math.PI / 2 + TAU * fillK); ctx.stroke(); ctx.restore();
    if (up < 1) {
      const ay = acy - up * 700;
      poly([[acx, ay - 80], [acx + 70, ay - 10], [acx + 28, ay - 10], [acx + 28, ay + 70], [acx - 28, ay + 70], [acx - 28, ay - 10], [acx - 70, ay - 10]],
        { fill: '#FFFFFF', stroke: null });
    }
    const [b0x, b0y] = quadPt(SCR, 0.18, 0.8), [b1x] = quadPt(SCR, 0.82, 0.8);
    rrect(b0x, b0y - 14, b1x - b0x, 28, 14, { fill: '#223070', stroke: null });
    rrect(b0x, b0y - 14, Math.max(28, (b1x - b0x) * fillK), 28, 14, { fill: ANI.lime, stroke: null });
    dot(b0x + (b1x - b0x) * fillK, b0y, 60, ANI.lime, 0.8 * (1 - (done ? 1 : 0)));
    if (done) fillScreen('#FFFFFF', 0.85 * Math.exp(-(t - 10.3) * 6));
    ctx.restore();
    // the deck and its keys
    poly(DECK, { fill: '#2C2A3E', stroke: ANI.ink, lw: 8 });
    const pressK = t < 9.5 ? 1 : 1 - easeOut(seg(t, 9.5, 9.8));
    const KX = 7, KY = 8, keyHit = [4, 5];
    for (let r = 0; r < KX - 3 + 2; r++) for (let c = 0; c < KY + 3; c++) {
      const u0 = 0.06 + c * 0.08, v0 = 0.08 + r * 0.14;
      if (u0 > 0.92 || v0 > 0.78) continue;
      const q = [quadPt(DECK, u0, v0), quadPt(DECK, u0 + 0.07, v0), quadPt(DECK, u0 + 0.07, v0 + 0.11), quadPt(DECK, u0, v0 + 0.11)];
      const isHit = r === keyHit[0] - 1 && c === keyHit[1] + 2;
      const d = isHit ? 8 * pressK : 0;
      poly(q.map(([x, y]) => [x, y + d]), { fill: isHit ? mix('#3E3A56', ANI.lime, 0.5 + 0.5 * pressK) : '#3E3A56', stroke: '#15131F', lw: 3 });
      if (isHit) {
        const [kx, ky] = quadPt(DECK, u0 + 0.035, v0 + 0.055);
        glow(kx, ky, 260, ANI.lime, 0.7 * (0.3 + 0.7 * Math.exp(-lt * 3)));
        const r2 = easeOut(clamp(lt / 0.35));
        ctx.save(); ctx.globalAlpha = 1 - r2; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 10 * (1 - r2) + 2;
        ctx.beginPath(); ctx.ellipse(kx, ky, 60 + r2 * 360, 24 + r2 * 150, 0, 0, TAU); ctx.stroke(); ctx.restore();
        S12.keyPos = [kx, ky];
      }
    }
    // the hand: a sleeve from the lower right, index finger on the key
    const [kx, ky] = S12.keyPos || [600, 1420];
    const lift = (1 - pressK) * 90;
    fig(() => {
      // fingertip at the origin; the finger runs down-right to the hand, the sleeve comes in from the corner
      ctx.save(); ctx.translate(kx + 4, ky - 10 - lift); ctx.rotate(0.62);
      const SK = '#F4DCCD', SH = '#E2B6A2';
      smooth([[250, -110], [520, -150], [640, 40], [560, 260], [300, 200], [220, 60]], { fill: '#2E2A48', stroke: null });   // sleeve
      stroke([[270, -60], [420, -100]], '#423C6A', 16, { ink: null });
      smooth([[120, -62], [200, -80], [280, -58], [300, 20], [280, 96], [190, 104], [130, 70]], { fill: SK, stroke: null });   // back of the hand
      for (let i = 0; i < 3; i++) {                                                                                       // curled fingers
        const fx = 120 + i * 10, fy = 30 + i * 30;
        rrect(fx - 20, fy - 12, 90, 42, 21, { fill: i % 2 ? SK : '#EECDBB', stroke: ANI.ink, lw: 4 });
      }
      smooth([[210, -76], [160, -100], [118, -98], [116, -74], [160, -58]], { fill: SK, stroke: ANI.ink, lw: 4 });           // thumb
      rrect(-8, -24, 170, 48, 24, { fill: SK, stroke: ANI.ink, lw: 4 });                                                  // index finger
      rrect(-2, -20, 36, 30, 12, { fill: '#FBE9E0', stroke: null });                                                      // nail
      stroke([[60, 10], [150, 14]], SH, 8, { ink: null, alpha: 0.8 });
      smooth([[200, 40], [290, 30], [276, 96], [190, 104]], { fill: SH, stroke: null, alpha: 0.6 });                       // cel shadow
      ctx.restore();
    }, { ink: 6, rim: '#BFE4FF', light: [-0.6, -1], rimW: 7, rimGlow: 0.4 });
    // the light shoots out of the screen
    if (t > launch - 0.05) {
      const k = clamp((t - launch) / 0.4);
      const [x0, y0] = quadPt(SCR, 0.5, 0.42);
      const hy = lerp(y0, -300, easeIn(k));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lgrad(0, hy, 0, y0, [[0, rgba('#FFFFFF', 1)], [0.3, rgba('#9FE0FF', 0.7)], [1, rgba('#4A7BFF', 0)]]);
      ctx.beginPath(); ctx.moveTo(x0 - 50, y0); ctx.lineTo(x0 - 18, hy); ctx.lineTo(x0 + 18, hy); ctx.lineTo(x0 + 50, y0); ctx.fill();
      ctx.restore();
      dot(x0, hy, 160, '#FFFFFF', 1);
    }
    camEnd();
    speedLinesV(t, 560, 1400, clamp(1 - lt / 0.6), '#FFFFFF');
    speedLinesV(t, 540, 400, seg(t, launch, 10.8), '#BFE4FF');
    scrim(0.55);
    tagLine(t, HIT2, 14.55, '“Ocean Eyes”', { size: 120, y: 340, color: ANI.sky });
    subLine(t, 9.35, 14.55, '오빠와 침실에서 만든 노래가\n입소문을 타고 세상으로', { size: 54, y: 500 });
    impact(t, HIT2, 0.1);
    white(Math.exp(-(t - HIT2) * 14) * 0.6);
  }

  // ---- shot 5: fireworks of phone light over the night city ----------------------------------
  const BURSTS = [[11.8182, 540, 980, 1.2], [12.7273, 280, 860, 0.9], [13.1818, 810, 900, 0.95], [13.6364, 470, 780, 1.0], [14.0909, 700, 1060, 0.9]];
  function city(t, lt) {
    const hits = BURSTS.map(b => b[0]);
    const [sx, sy] = shakes(t, hits, 18, 0.3);
    const tilt = easeInOut(seg(t, 10.91, 11.8));
    cam(t, 540 + sx, lerp(1240, 1060, tilt) + sy, lerp(1.08, 1.0, tilt), 0, 0.7);
    // sky
    ctx.fillStyle = lgrad(0, 0, 0, 1900, [[0, '#070A26'], [0.45, '#1E1A5E'], [0.78, '#5A2E80'], [1, '#C0508E']]);
    ctx.fillRect(-300, -300, 1700, 2600);
    for (let i = 0; i < 60; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i, 3) * 3) + i);
      dot(hash(i, 1) * 1080, 200 + hash(i, 2) * 1000, 3 + 5 * tw, '#FFFFFF', 0.6 * tw);
    }
    // buildings, far to near; windows light up with phone-blue as the song spreads
    const rows = [[1300, '#241D52', 0.55, 90, 1], [1420, '#17123A', 0.8, 120, 2], [1540, '#0C0920', 1, 150, 3]];
    for (const [base, col, sc, bw, seed] of rows) {
      for (let i = 0; i < 14; i++) {
        const bx = -120 + i * bw * 0.95 + hash(i, seed) * 30, bh = (160 + hash(i, seed + 5) * 330) * sc;
        ctx.fillStyle = col; ctx.fillRect(bx, base - bh, bw * 0.9, bh + 800);
        if (hash(i, seed + 9) > 0.6) { ctx.fillRect(bx + bw * 0.4, base - bh - 60 * sc, 6, 60 * sc); dot(bx + bw * 0.4 + 3, base - bh - 60 * sc, 12, '#FF5A6A', 0.6 + 0.4 * Math.sin(t * 5 + i)); }
        const cw = 18 * sc + 4, chh = 24 * sc + 4;
        for (let r = 0; r * chh * 1.4 + 20 < bh; r++) for (let c = 0; c * cw * 1.5 + 14 < bw * 0.9 - cw; c++) {
          const hsh = hash(i * 31 + r, c + seed * 7);
          const onAt = 11.4 + hash(r * 3 + c, i + seed * 13) * 3.0;
          const wx = bx + 12 + c * cw * 1.5, wy = base - bh + 16 + r * chh * 1.4;
          if (t > onAt && hsh > 0.35) {
            const f = clamp((t - onAt) / 0.15);
            ctx.fillStyle = mix('#2A2250', '#BFE4FF', f); ctx.fillRect(wx, wy, cw, chh);
            if (hsh > 0.8) dot(wx + cw / 2, wy + chh / 2, 26 * sc, '#8FD0FF', 0.6 * f);
          } else if (hsh > 0.78) { ctx.fillStyle = '#FFD890'; ctx.fillRect(wx, wy, cw, chh); }
        }
      }
    }
    // the rising streak from one small window
    if (t < 11.9) {
      const k = easeIn(seg(t, 10.91, 11.8182)), y = lerp(1560, 980, k);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lgrad(0, y, 0, y + 420, [[0, rgba('#FFFFFF', 0.95)], [1, rgba('#6FC8FF', 0)]]);
      ctx.beginPath(); ctx.moveTo(540 - 14, y); ctx.lineTo(540 + 14, y); ctx.lineTo(540 + 4, y + 420); ctx.lineTo(540 - 4, y + 420); ctx.fill();
      ctx.restore();
      dot(540, y, 90, '#FFFFFF', 1); dot(540, y, 200, '#6FC8FF', 0.6);
    }
    // bursts: phones and notes flying out like fireworks
    BURSTS.forEach(([tb, bx, by, sz], bi) => {
      const age = t - tb;
      if (age < 0 || age > 2.2) return;
      glow(bx, by, 520 * sz, '#9FE0FF', 0.9 * Math.exp(-age * 4));
      const rr = easeOut(clamp(age / 0.4));
      ctx.save(); ctx.globalAlpha = 1 - rr; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 10 * (1 - rr) + 2;
      ctx.beginPath(); ctx.arc(bx, by, 60 + rr * 380 * sz, 0, TAU); ctx.stroke(); ctx.restore();
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + hash(i, bi) * 0.2, sp = (300 + hash(i, bi + 5) * 180) * sz;
        const d = sp * (1 - Math.exp(-age * 3)) / 1, grav = age * age * 60;
        const px = bx + Math.cos(a) * d, py = by + Math.sin(a) * d + grav;
        const fade = 1 - clamp((age - 1.2) / 1.0);
        // trail
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = i % 3 === 0 ? ANI.lime : '#9FE0FF'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * d * 0.55, by + Math.sin(a) * d * 0.55 + grav * 0.3); ctx.lineTo(px, py); ctx.stroke(); ctx.restore();
        if (i % 3 === 1) noteGlyph(px, py, 0.55 * sz, [ANI.white, ANI.lime, '#FFB7E0'][i % 3], a * 0.2, false);
        else phone(px, py, 0.9 * sz, a + Math.PI / 2 + age * 2 * (hash(i, 2) - 0.5), i % 2 ? '#BFE4FF' : '#E8FFD0', fade);
      }
    });
    sparkles(t, 16, 0, 700, 1080, 700, '#FFFFFF');
    camEnd();
    for (const h of hits) speedLinesV(t, 540, 980, t >= h ? clamp(1 - (t - h) / 0.35) * 0.8 : 0, '#FFFFFF');
    scrim(0.5);
    tagLine(t, HIT2, 14.55, '“Ocean Eyes”', { size: 120, y: 340, color: ANI.sky });
    subLine(t, 9.35, 14.55, '오빠와 침실에서 만든 노래가\n입소문을 타고 세상으로', { size: 54, y: 500 });
    for (const h of hits) impact(t, h, 0.04);
    white(easeIn(seg(t, 14.3, 14.55)));
  }

  chapter('lost', 0, 14.55, [[0, shoeFall], [2.2727, panels], [5.4545, bedroom], [HIT2, upload], [10.9091, city]]);
})();
