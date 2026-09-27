// e6_now (139.20 – 172.20) · 6막 · 당신의 방
//
// 139.20  Out of the white, the release: a stadium bowl filled with a sea of phone lights, a tiny
//         faceless figure on a far stage under beams; at 141.60 a wave of light runs from the
//         stage over the crowd to the lens. The camera cranes back through the raised phones.
// 148.80  Dawn over a field of wildflowers; they open and sway, a golden gramophone stands among
//         them; at 151.20 the sun breaks over the hills and the field turns gold.
// 158.40  Someone else's small room, framed like the film's first shot: a sliver of light in a
//         dark doorway. We push through: night, a desk lamp, a child in headphones at an old
//         laptop reaches out and presses record; a waveform is born on the screen.
// 166.00  From that window the camera pulls back over a night city of lit windows, a first hint
//         of dawn on the horizon. "다음은, 당신 차례다". The letterbox closes.
//
// Faces are never drawn (silhouettes, backs, hands). No logos, covers or posters.
(() => {
  const T_SEA = 139.2, T_WAVE = 141.6, T_FIELD = 148.8, T_SUN = 151.2, T_ROOM = 158.4, T_REC = 160.8,
    T_CITY = 166.0, T_OUT = 172.2;
  const GOLD = { hi: '#FFF6D8', light: '#FFD978', mid: '#E9A93A', dark: '#9A6414', deep: '#5A3808' };

  const scr = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };
  const shoot = (t, cx, cy, z, amt = 1, rot = 0) => {
    const [hx, hy, hr] = handheld(t, amt);
    camBegin(cx + hx / z, cy + hy / z, z, hr + rot);
  };
  const fillRectG = (x, y, w, h, style) => { ctx.fillStyle = style; ctx.fillRect(x, y, w, h); };
  const kick = (t, t0, len = 0.5) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  function addSmooth(pts) {
    const n = pts.length, P = i => pts[(i + n) % n];
    ctx.moveTo(P(0)[0], P(0)[1]);
    for (let i = 0; i < n; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath();
  }

  /** Paint fn() into a small offscreen layer, blur it once there, and lay it over the frame. */
  const POOL = [];
  let poolDepth = 0;
  const pooled = (i, w, h) => {
    let c = POOL[i];
    if (!c) c = POOL[i] = document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.clearRect(0, 0, w, h);
    return [c, g];
  };
  function layer(px, fn, o = {}) {
    const main = ctx, res = o.res ?? (px >= 6 ? 0.25 : 0.5);
    const w = Math.round(cv.width * res), h = Math.round(cv.height * res);
    const [off, g] = pooled(poolDepth * 2, w, h);
    const m = main.getTransform();
    g.setTransform(m.a * res, m.b * res, m.c * res, m.d * res, m.e * res, m.f * res);
    poolDepth++; ctx = g;
    try { fn(); } finally { ctx = main; poolDepth--; }
    let src = off;
    if (px > 0) {
      const [bl, bg] = pooled(poolDepth * 2 + 1, w, h);
      bg.filter = `blur(${px * SCALE * res}px)`; bg.drawImage(off, 0, 0); bg.filter = 'none';
      src = bl;
    }
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    if (o.alpha !== undefined) main.globalAlpha = o.alpha;
    if (o.op) main.globalCompositeOperation = o.op;
    main.imageSmoothingEnabled = true; main.imageSmoothingQuality = 'high';
    main.drawImage(src, 0, 0, cv.width, cv.height);
    main.restore();
  }

  // ---- 139.20 · the stadium ----------------------------------------------------------------------

  const STAGE = { x: 960, y: 470 };
  const floorY = d => 482 + 470 / d;                  // depth d (1 near .. 16 at the stage) to screen y
  const floorX = (X, d) => 960 + X * 800 / d;

  function stadium(t) {
    const k = easeOut(seg(t, T_SEA, T_FIELD));
    const [ax, ay] = shakeXY(t, T_SEA, 16, 0.6), [bx, by] = shakeXY(t, T_WAVE, 7, 0.4);
    shoot(t, 960 + ax + bx, lerp(470, 530, k) + ay + by, lerp(1.3, 1.0, k), 1.1);
    const beat = pulse(t, 5);
    const waveAt = t - T_WAVE;

    // night sky and the haze the lights live in
    fillRectG(-800, -700, W + 1600, H + 1400, lgrad(0, -300, 0, 560, [[0, '#020309'], [0.55, '#0A1330'], [1, '#1E2E66']]));
    glow(STAGE.x, STAGE.y - 60, 900, '#3E64D8', 0.35 + 0.15 * beat);
    glow(STAGE.x, STAGE.y - 30, 420, '#BFD2FF', 0.25 + 0.2 * beat);

    // the bowl: tiers of stands wrapping round the floor and down the sides toward us
    const A0 = Math.PI - 0.32, A1 = TAU + 0.32;
    const tier = j => [760 + 105 * j, 110 + 34 * j, 476];
    for (let j = 11; j >= 0; j--) {
      const [rx, ry, cy] = tier(j);
      ctx.beginPath(); ctx.ellipse(960, cy, rx, ry, 0, A0, A1); ctx.closePath();
      ctx.fillStyle = lgrad(0, cy - ry, 0, cy + ry, [[0, mix('#0A0F26', '#141C44', j / 11)], [1, '#070A18']]);
      ctx.fill();
      ctx.strokeStyle = rgba('#3A4A8A', 0.12); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(960, cy, rx, ry, 0, A0, A1); ctx.stroke();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 12; j++) {
      const [rx, ry, cy] = tier(j), n = Math.round((rx + ry) * 1.4 / 6);
      for (let row = 0; row < 3; row++) {
        const rr = 1 - row * 0.012 - 0.004;
        for (let i = 0; i < n; i++) {
          const u = (i + hash(i, j * 7 + row) * 0.9) / n, a = lerp(A0, A1, u);
          const x = 960 + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * (rr - 0.03 * row);
          if (x < -150 || x > W + 150 || y > 1000) continue;
          const ang = Math.abs(u - 0.5) * 2;
          const wave = waveAt > 0 ? Math.exp(-Math.pow(ang * 3.2 - waveAt * 2.4, 2) * 1.5) : 0;
          const tw = 0.45 + 0.35 * Math.sin(t * (1.5 + hash(i, j + 7)) + i + row) + 0.2 * beat;
          const a2 = clamp((hash(i, j + 3 + row) * 0.7 + 0.4) * tw + wave * 0.9);
          if (a2 < 0.08) continue;
          ctx.fillStyle = hash(i, j + 9 + row) < 0.18 ? `rgba(255,226,180,${a2})` : `rgba(226,236,255,${a2})`;
          const r = (2 + j * 0.2) * (y > cy ? 1 + (y - cy) / 200 : 1) + wave * 1.6;
          ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
      }
    }
    ctx.restore();

    // the stage: a low platform, two tall screens of blue light, a truss of lamps
    const sx = STAGE.x, sy = STAGE.y;
    fillRectG(sx - 330, sy - 6, 660, 30, lgrad(0, sy - 6, 0, sy + 24, [[0, '#8FA6E8'], [0.3, '#34426E'], [1, '#0C1024']]));
    [[-420, 1], [340, -1]].forEach(([dx]) => {
      fillRectG(sx + dx, sy - 230, 80, 210, lgrad(0, sy - 230, 0, sy - 20, [[0, '#3C6BFF'], [0.5, '#A8C6FF'], [1, '#2A4AB0']]));
      glow(sx + dx + 40, sy - 120, 190, '#6A92FF', 0.35 + 0.2 * beat);
    });
    fillRectG(sx - 360, sy - 262, 720, 8, '#1A2030');
    for (let i = 0; i < 14; i++) glow(sx - 338 + i * 52, sy - 256, 18, '#FFFFFF', 0.8);
    // beams from the truss, sweeping slowly
    layer(2.5, () => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const ox = sx - 300 + i * 66, oy = sy - 256;
        const a = -Math.PI / 2 + Math.sin(t * 0.6 + i * 0.9) * 0.55 + (i - 4.5) * 0.06;
        const len = 1200, w = 0.035;
        const c = i % 3 === 0 ? '#C8B6FF' : i % 3 === 1 ? '#A8C8FF' : '#FFFFFF';
        ctx.fillStyle = lgrad(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len, [[0, rgba(c, 0.55 + 0.25 * beat)], [1, rgba(c, 0)]]);
        ctx.beginPath(); ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a - w) * len, oy + Math.sin(a - w) * len); ctx.lineTo(ox + Math.cos(a + w) * len, oy + Math.sin(a + w) * len);
        ctx.fill();
      }
      ctx.restore();
    }, { op: 'screen' });
    // the singer: tiny, faceless, in a white spot
    glow(sx, sy - 40, 120, '#FFFFFF', 0.6 + 0.3 * kick(t, T_WAVE, 1));
    silhouette(sx, sy - 2, 0.11, { t, hair: '#1A1320', pose: t > T_WAVE - 0.2 ? 'arms' : 'mic', body: '#05060C' });

    // the floor: thousands of phones, a wave of light rolling from the stage at 141.60
    fillRectG(-800, sy + 22, W + 1600, 800, lgrad(0, sy + 22, 0, H, [[0, '#18224A'], [0.5, '#0C1230'], [1, '#05060E']]));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3200; i++) {
      const d = lerp(0.95, 15, Math.pow(hash(i, 71), 0.9));
      const X = (hash(i, 72) * 2 - 1) * 1.3 * d;
      const sway = Math.sin(t * 2.1 + i * 0.37) * 0.06 + hop(t) * 0.02;
      const x = floorX(X + sway, d), y = floorY(d) + Math.sin(t * 3 + i) * 1.5;
      const wave = waveAt > 0 ? Math.exp(-Math.pow((15 - d) - waveAt * 7, 2) * 0.35) : 0;
      const tw = 0.5 + 0.3 * Math.sin(t * (1.2 + hash(i, 73) * 2) + i) + 0.2 * beat;
      const a = clamp((0.35 + 0.5 * hash(i, 74)) * tw + wave);
      const r = (2.2 + 5 / d) * (1 + wave * 0.8);
      ctx.fillStyle = hash(i, 75) < 0.15 ? `rgba(255,228,190,${a})` : `rgba(230,240,255,${a})`;
      ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
    ctx.restore();
    // the haze glowing over the crowd, and the crest of the wave as a band of light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lgrad(0, sy, 0, H, [[0, rgba('#6D8CFF', 0.22)], [1, rgba('#2A3A80', 0.08)]]); ctx.fillRect(-800, sy, W + 1600, 700);
    if (waveAt > 0 && waveAt < 2.4) {
      const dW = 15 - waveAt * 7, yW = floorY(Math.max(0.95, dW)), hW = 30 + 400 / Math.max(1, dW);
      ctx.fillStyle = lgrad(0, yW - hW, 0, yW + hW, [[0, 'rgba(0,0,0,0)'], [0.5, rgba('#DCE8FF', 0.3 * clamp(dW + 1))], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(-800, yW - hW, W + 1600, hW * 2);
    }
    ctx.restore();

    // the people right in front of us: heads and shoulders against the haze, phones up, filming
    layer(3.5, () => {
      for (let i = 0; i < 14; i++) {
        const hx = -80 + i * 150 + hash(i, 84) * 70, hy = 905 + hash(i, 85) * 60 + hop(t) * 6 * hash(i, 86);
        const hr = 50 + hash(i, 87) * 22;
        ell(hx, hy + hr * 1.9, hr * 2.1, hr * 1.4, { fill: '#04050A', stroke: null });
        ell(hx, hy, hr * 0.82, hr, { fill: '#05060C', stroke: null });
      }
      for (let i = 0; i < 6; i++) {
        const bxp = 80 + i * 340 + hash(i, 81) * 120, sw = Math.sin(t * 2.2 + i * 1.7) * 18 + hop(t) * 8;
        const lift = waveAt > 0 && waveAt < 3 ? 50 * Math.sin(Math.PI * clamp(waveAt / 3)) : 0;
        const px = bxp + sw + 30, py = 760 + hash(i, 82) * 90 - lift;
        stroke([[bxp - 20, 1100], [bxp + sw * 0.5 + 10, 900], [px, py + 34]], '#05060C', 34, { ink: null });
        ctx.save(); ctx.translate(px, py); ctx.rotate(sw * 0.004 + (hash(i, 88) - 0.5) * 0.2);
        rrect(-26, -44, 52, 88, 8, { fill: '#07080E', stroke: null });
        rrect(-22, -40, 44, 80, 5, { fill: lgrad(0, -40, 0, 40, [[0, '#0A1030'], [0.5, '#2C4CB0'], [1, '#0A1030']]), stroke: null });
        glow(0, -2, 16, '#FFFFFF', 0.8);
        ctx.restore();
        ell(px - 4, py + 42, 16, 12, { fill: '#05060C', stroke: null });
      }
    });
    camEnd();

    // out of the white; a lift at the wave
    scr(() => {
      ctx.fillStyle = `rgba(255,252,246,${1 - easeOut(seg(t, T_SEA, T_SEA + 0.9))})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba('#CFE0FF', 0.3 * kick(t, T_WAVE, 0.6)); ctx.fillRect(0, 0, W, H);
    });
    yearTag(t, 139.8, '2024');
    caption(t, 140.2, 148.3, '〈Hit Me Hard and Soft〉 월드 투어', '2024년 9월 – 2025년 11월');
  }

  // ---- 148.80 · wildflowers at sunrise --------------------------------------------------------------

  const HORIZON = 540;
  const FLOWER_COLS = ['#FFFFFF', '#FFD1E2', '#C9B8FF', '#FFE27A', '#FF9F9F', '#A8D4FF', '#FFFFFF', '#F7B6F0'];

  /** A wildflower: stem from (x, y) up h, head opening with `open` (0..1). */
  function flower(x, y, h, open, col, seed, t, wind, sunK) {
    const bend = wind * h * 0.12;
    const tx = x + bend, ty = y - h;
    ctx.strokeStyle = mix('#2E5A3A', '#6E9A48', sunK * 0.6); ctx.lineWidth = Math.max(1.2, h * 0.025); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + bend * 0.2, y - h * 0.55, tx, ty); ctx.stroke();
    if (h > 50) {                                      // a leaf
      ctx.fillStyle = mix('#2F5E3A', '#78A850', sunK * 0.6);
      ctx.save(); ctx.translate(x + bend * 0.1, y - h * 0.3); ctx.rotate(-0.8 + (seed % 2) * 1.6 + wind * 0.2);
      ctx.beginPath(); ctx.ellipse(h * 0.07, 0, h * 0.09, h * 0.022, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    const o = easeOut(clamp(open));
    if (o <= 0.02) { circle(tx, ty, h * 0.03 + 1.5, { fill: mix('#4A7A40', col, 0.3), stroke: null }); return; }
    const pr = (6 + h * 0.11) * (0.35 + 0.65 * o), n = 5 + (seed % 3);
    const lit = mix(col, '#FFE6B0', sunK * 0.25);
    ctx.fillStyle = rgrad(tx, ty, pr * 0.1, pr * 1.3, [[0, '#FFFFFF'], [0.5, lit], [1, mix(lit, '#6A5A7A', 0.35)]]);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + seed + Math.sin(t * 0.8 + seed) * 0.1;
      ctx.beginPath(); ctx.ellipse(tx + Math.cos(a) * pr * 0.6 * o, ty + Math.sin(a) * pr * 0.45 * o, pr * 0.62, pr * 0.3 * (0.4 + 0.6 * o), a, 0, TAU); ctx.fill();
    }
    circle(tx, ty, pr * 0.24, { fill: seed % 4 === 0 ? '#5A3A2A' : '#FFB83A', stroke: null });
  }

  /** The golden gramophone: plinth, turntable, tone arm, and a flared horn. (x, y) = bottom. */
  function gramophone(x, y, s, sunK, glint) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const band = [[0, GOLD.deep], [0.3, GOLD.mid], [0.5, GOLD.hi], [0.72, GOLD.light], [1, GOLD.dark]];
    // soft contact shadow in the grass
    ell(0, 4, 170, 22, { fill: 'rgba(10,20,10,0.45)', stroke: null });
    rrect(-120, -64, 240, 64, 8, { fill: lgrad(-120, 0, 120, 0, band), stroke: null });
    fillRectG(-120, -64, 240, 64, lgrad(0, -64, 0, 0, [[0, 'rgba(255,255,255,0.15)'], [1, 'rgba(60,30,0,0.35)']]));
    rrect(-100, -96, 200, 34, 8, { fill: lgrad(-100, 0, 100, 0, band), stroke: null });
    ell(0, -102, 108, 20, { fill: lgrad(-108, 0, 108, 0, [[0, GOLD.dark], [0.45, GOLD.light], [1, GOLD.dark]]), stroke: null });
    ell(0, -106, 90, 14, { fill: lgrad(-90, 0, 90, 0, [[0, GOLD.deep], [0.5, GOLD.mid], [1, GOLD.deep]]), stroke: null });
    ell(0, -106, 12, 3.5, { fill: GOLD.hi, stroke: null });
    stroke([[76, -104], [70, -166], [34, -210], [8, -232]], GOLD.mid, 11, { ink: null, smooth: true });
    circle(76, -104, 10, { fill: GOLD.light, stroke: null });
    // the horn
    const N = [6, -232], B = [118, -410], d = [B[0] - N[0], B[1] - N[1]], L = Math.hypot(d[0], d[1]);
    const u = [d[0] / L, d[1] / L], p = [-u[1], u[0]], Rb = 126, nw = 11;
    const e1 = [B[0] + p[0] * Rb, B[1] + p[1] * Rb], e2 = [B[0] - p[0] * Rb, B[1] - p[1] * Rb];
    const c1 = [N[0] + u[0] * L * 0.8 + p[0] * nw * 1.5, N[1] + u[1] * L * 0.8 + p[1] * nw * 1.5];
    const c2 = [N[0] + u[0] * L * 0.8 - p[0] * nw * 1.5, N[1] + u[1] * L * 0.8 - p[1] * nw * 1.5];
    ctx.beginPath();
    ctx.moveTo(N[0] + p[0] * nw, N[1] + p[1] * nw);
    ctx.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]);
    ctx.lineTo(e2[0], e2[1]);
    ctx.quadraticCurveTo(c2[0], c2[1], N[0] - p[0] * nw, N[1] - p[1] * nw);
    ctx.closePath();
    ctx.fillStyle = lgrad(e2[0], e2[1], e1[0], e1[1], [[0, GOLD.deep], [0.3, GOLD.mid], [0.55, GOLD.hi], [0.78, GOLD.light], [1, GOLD.dark]]);
    ctx.fill();
    const ang = Math.atan2(p[1], p[0]);
    ell(B[0], B[1], Rb, Rb * 0.36, { fill: rgrad(B[0] - u[0] * 20, B[1] - u[1] * 20, 4, Rb, [[0, '#3A2204'], [0.6, GOLD.dark], [1, GOLD.light]]), stroke: null }, ang);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = rgba(GOLD.hi, 0.5 + 0.5 * sunK); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(B[0], B[1], Rb, Rb * 0.36, ang, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
    if (glint > 0 && glint < 1) {
      const q = [lerp(N[0], B[0], glint), lerp(N[1], B[1], glint)], r = lerp(nw, Rb, glint * glint) * 0.4;
      glow(q[0] + p[0] * r, q[1] + p[1] * r, 34, '#FFF4D8', 0.55);
    }
    ctx.restore();
    ctx.restore();
  }

  function field(t) {
    const sunK = easeOut(seg(t, T_SUN - 0.3, T_SUN + 2.6)), pre = seg(t, T_FIELD, T_SUN);
    const push = easeInOut(seg(t, T_FIELD, T_ROOM));
    shoot(t, lerp(940, 990, push), lerp(560, 520, push), lerp(1.03, 1.16, push), 0.8);
    const wind = x => Math.sin(t * 1.1 - x * 0.004) * 0.6 + Math.sin(t * 2.3 - x * 0.011) * 0.25;
    const sunX = 700, sunY = HORIZON + 30 - 140 * easeOut(seg(t, T_SUN - 0.6, T_ROOM));

    // sky: violet before the sun, then gold
    fillRectG(-600, -600, W + 1200, HORIZON + 700, lgrad(0, -200, 0, HORIZON, [
      [0, mix('#1C1E48', '#35508A', sunK)], [0.55, mix('#6A4E88', '#D88E78', sunK)], [1, mix('#E89AA0', '#F6C890', sunK)]]));
    glow(sunX, sunY, 800, '#FFB070', 0.2 + 0.25 * pre + 0.15 * sunK);
    if (sunK > 0) {
      glow(sunX, sunY, 240, '#FFF4D8', 0.6 * sunK);
      circle(sunX, sunY, 44, { fill: rgba('#FFFBF0', sunK), stroke: null });
    }
    // soft clouds lit from below
    layer(4, () => {
      for (let i = 0; i < 7; i++) {
        const cx = -200 + i * 360 + frac(t * 0.004 + hash(i, 5)) * 200, cy = 160 + hash(i, 6) * 200;
        ell(cx, cy, 220 + hash(i, 7) * 160, 26 + hash(i, 8) * 20, { fill: rgba(mix('#B77FA8', '#FFD6A0', sunK), 0.55), stroke: null });
      }
      // far hills
      ctx.beginPath(); ctx.moveTo(-600, HORIZON + 80);
      for (let i = 0; i <= 30; i++) { const x = -600 + i * 110; ctx.lineTo(x, HORIZON - 20 - 36 * Math.sin(i * 0.5) - 20 * Math.sin(i * 1.3)); }
      ctx.lineTo(W + 600, HORIZON + 80); ctx.fillStyle = mix('#3A3060', '#8A7A9A', sunK * 0.6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-600, HORIZON + 80);
      for (let i = 0; i <= 30; i++) { const x = -600 + i * 110; ctx.lineTo(x, HORIZON + 14 - 20 * Math.sin(i * 0.7 + 2)); }
      ctx.lineTo(W + 600, HORIZON + 80); ctx.fillStyle = mix('#2A3848', '#6A7A5A', sunK * 0.6); ctx.fill();
    });
    if (sunK > 0) godRays(t, sunX, sunY, Math.PI * 0.35, 2.2, 1500, '#FFE2B0', 0.28 * sunK);

    // the meadow: a far band of colour dots, then flowers, then the gramophone
    fillRectG(-600, HORIZON + 20, W + 1200, 900, lgrad(0, HORIZON + 20, 0, H, [[0, mix('#3A4A58', '#9AA86A', sunK)], [0.4, mix('#23402E', '#5E8A3E', sunK)], [1, mix('#10241A', '#2E4A22', sunK)]]));
    layer(1.4, () => {
      for (let i = 0; i < 700; i++) {
        const v = Math.pow(hash(i, 11), 1.6), y = HORIZON + 26 + v * 150, x = -300 + hash(i, 12) * (W + 600);
        ctx.fillStyle = rgba(mix(FLOWER_COLS[i % FLOWER_COLS.length], '#8A7A9A', 0.3 - sunK * 0.2), 0.8);
        const r = 1.5 + v * 3.5; ctx.fillRect(x, y, r, r * 0.8);
      }
    });
    // flowers, far to near, opening one by one from the start of the shot
    const flowers = [];
    for (let i = 0; i < 260; i++) {
      const v = Math.pow(hash(i, 21), 0.8), y = HORIZON + 170 + v * 340, x = -260 + hash(i, 22) * (W + 520);
      flowers.push([y, x, v, i]);
    }
    flowers.sort((a, b) => a[0] - b[0]);
    let gramDone = false;
    for (const [y, x, v, i] of flowers) {
      if (!gramDone && y > 780) {
        gramDone = true;
        glow(1350, 470, 260, '#FFD27A', 0.1 + 0.2 * sunK);
        gramophone(1270, 790, 0.82, sunK, t > T_SUN ? frac((t - T_SUN) / 3.2) * 1.4 : 0);
      }
      const h = 36 + v * 170 * (0.7 + 0.5 * hash(i, 23));
      const open = seg(t, T_FIELD + 0.2 + hash(i, 24) * 3.2, T_FIELD + 1.6 + hash(i, 24) * 3.2 + 0.8);
      flower(x, y, h, open, FLOWER_COLS[i % FLOWER_COLS.length], i, t, wind(x), sunK);
    }
    // blades of grass in front
    ctx.strokeStyle = mix('#1A3424', '#46703A', sunK); ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const v = hash(i, 32), x = -200 + hash(i, 31) * (W + 400), y = 640 + v * 460, h = (30 + hash(i, 33) * 60) * (0.6 + v * 2.2);
      ctx.strokeStyle = i % 3 ? mix('#1A3424', '#46703A', sunK) : mix('#24402C', '#7A9A48', sunK);
      ctx.lineWidth = (1 + hash(i, 34) * 2) * (0.6 + v * 1.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + wind(x) * 20, y - h * 0.6, x + wind(x) * h * 0.35 + (hash(i, 35) - 0.5) * 60, y - h); ctx.stroke();
    }
    // pollen in the sun
    dust(t, 0, 200, W, 700, 70, '#FFF0C8');
    // the nearest flowers and grass, out of focus
    layer(9, () => {
      for (let i = 0; i < 9; i++) {
        const x = -100 + i * 260 + hash(i, 41) * 100, y = 1250;
        flower(x, y, 380 + hash(i, 42) * 200, seg(t, T_FIELD + hash(i, 43) * 2, T_FIELD + 2.5 + hash(i, 43) * 2), FLOWER_COLS[(i * 3) % 8], i + 5, t, wind(x) * 1.4, sunK);
      }
    });
    camEnd();
    if (sunK > 0) scr(() => flare(sunX + (960 - sunX) * 0.1, sunY - 20, 1.2 * sunK, '#FFE7B0'));
    // the whole field warms the moment the sun is up
    scr(() => {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = rgba(sunK > 0 ? '#FFB45A' : '#6A7AE0', sunK > 0 ? 0.25 * sunK : 0.25 * (1 - pre));
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba('#FFE7C0', 0.35 * kick(t, T_SUN, 0.8)); ctx.fillRect(0, 0, W, H);
    });
    yearTag(t, 149.4, '2026');
    caption(t, 149.8, 157.9, '“Wildflower” 그래미 올해의 노래', '2026년 2월 · 세 번째 올해의 노래상');
  }

  // ---- 158.40 · someone else's small room -------------------------------------------------------------

  const DESK = 700;                                          // desk top y in the room

  /** A child seen from behind in headphones, seated (y = seat). reach 0..1 lifts the right arm. */
  function childBack(x, y, s, t, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = '#0E0D16', nod = Math.sin(t * Math.PI / 0.6) * 2 * (o.sing || 0);
    const parts = [
      () => addSmooth([[-60, 20], [-66, -90], [-82, -170], [-66, -204], [-28, -216], [28, -216], [66, -204], [82, -170], [66, -90], [60, 20]]),
      () => ctx.rect(-16, -240, 32, 36),
      () => { ctx.moveTo(44, -272 + nod); ctx.arc(0, -272 + nod, 44, 0, TAU); },
      () => addSmooth([[-46, -276 + nod], [-42, -304 + nod], [-18, -322 + nod], [16, -324 + nod], [44, -306 + nod], [48, -276 + nod], [30, -256 + nod], [-30, -256 + nod]]),
    ];
    const fillAll = style => { ctx.fillStyle = style; for (const p of parts) { ctx.beginPath(); p(); ctx.fill(); } };
    ctx.save(); ctx.shadowColor = rgba(o.rim || '#FFC98A', 0.8); ctx.shadowBlur = 14 * s * SCALE; ctx.shadowOffsetX = -3 * SCALE;
    fillAll(body); ctx.restore();
    fillAll(body);
    // the right arm reaching forward to the interface
    const r = o.reach || 0;
    if (r > 0) {
      const hx = lerp(70, 150, r), hy = lerp(-120, -150, r) + (o.press || 0) * 8;
      stroke([[62, -190], [lerp(92, 128, r), lerp(-120, -150, r)], [hx, hy]], body, 30, { ink: null });
      ell(hx + 6, hy, 18, 13, { fill: body, stroke: null });
    }
    // headphones: the band over the crown and two cups, their edges catching the lamp
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1D1B26'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(0, -272 + nod, 52, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    ctx.strokeStyle = rgba('#FFC98A', 0.55); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -272 + nod, 57, Math.PI * 1.08, Math.PI * 1.5); ctx.stroke();
    for (const side of [-1, 1]) {
      ell(side * 50, -266 + nod, 15, 27, { fill: lgrad(side * 50 - 15, 0, side * 50 + 15, 0, [[0, '#262433'], [1, '#14121C']]), stroke: null });
      if (side < 0) { ctx.strokeStyle = rgba('#FFC98A', 0.6); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(-50, -266 + nod, 15, 27, 0, Math.PI * 0.6, Math.PI * 1.5); ctx.stroke(); }
    }
    // chair back
    rrect(-60, -104, 120, 134, 20, { fill: lgrad(-72, 0, 72, 0, [[0, '#08070C'], [0.4, '#1A1822'], [1, '#08070C']]), stroke: null });
    ctx.restore();
  }

  /** The room at night. rec = time since record was pressed (negative before). */
  function kidRoom(t, rec, reach, press) {
    // wall: deep blue night, warmed around the lamp
    fillRectG(-600, -500, W + 1200, DESK + 500, lgrad(0, -300, 0, DESK, [[0, '#0A0D1C'], [1, '#161A30']]));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgrad(640, 520, 20, 820, [[0, rgba('#FFB463', 0.5)], [0.5, rgba('#8A4A20', 0.15)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(-600, -500, W + 1200, DESK + 500);
    ctx.fillStyle = rgrad(1060, 560, 20, 700, [[0, rgba('#5A8CFF', 0.3)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(-600, -500, W + 1200, DESK + 500);
    ctx.restore();
    // the window: a night city far away, out of focus
    const WX = 1180, WY = 210, WW = 460, WH = 380;
    layer(4, () => {
      fillRectG(WX, WY, WW, WH, lgrad(0, WY, 0, WY + WH, [[0, '#0B1230'], [0.7, '#1E2A58'], [1, '#34305A']]));
      for (let i = 0; i < 70; i++) {
        const x = WX + hash(i, 91) * WW, y = WY + WH * (0.45 + 0.55 * Math.pow(hash(i, 92), 0.6));
        circle(x, y, 3 + hash(i, 93) * 6, { fill: i % 4 ? rgba('#FFD08A', 0.8) : rgba('#BFD8FF', 0.8), stroke: null });
      }
    });
    ctx.fillStyle = '#05060C';
    ctx.fillRect(WX - 16, WY - 16, WW + 32, 16); ctx.fillRect(WX - 16, WY + WH, WW + 32, 20);
    ctx.fillRect(WX - 16, WY, 16, WH); ctx.fillRect(WX + WW, WY, 16, WH); ctx.fillRect(WX + WW / 2 - 5, WY, 10, WH);
    // notes stuck on the wall: lyrics in progress (scribbles, no words)
    [[760, 300, -0.05], [850, 280, 0.06], [800, 390, 0.03], [930, 360, -0.08]].forEach(([nx, ny, r], i) => {
      ctx.save(); ctx.translate(nx, ny); ctx.rotate(r);
      rrect(-40, -40, 80, 80, 3, { fill: ['#E8D9A0', '#E8B8C8', '#C8D8E8', '#E8D9A0'][i], stroke: null, alpha: 0.75 });
      ctx.strokeStyle = 'rgba(40,40,70,0.5)'; ctx.lineWidth = 2;
      for (let l = 0; l < 4; l++) { ctx.beginPath(); ctx.moveTo(-30, -24 + l * 15); for (let q = 0; q < 6; q++) ctx.lineTo(-30 + q * 10, -24 + l * 15 + Math.sin(q * 2 + i + l) * 3); ctx.stroke(); }
      ctx.restore();
    });
    // the desk
    fillRectG(-600, DESK, W + 1200, 22, lgrad(0, DESK, 0, DESK + 22, [[0, '#6A4A34'], [1, '#2A1C14']]));
    fillRectG(-600, DESK + 22, W + 1200, 600, lgrad(0, DESK + 22, 0, DESK + 400, [[0, '#120C0C'], [1, '#06050A']]));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ell(640, DESK + 10, 360, 40, { fill: rgrad(640, DESK + 10, 0, 360, [[0, rgba('#FFC070', 0.55)], [1, 'rgba(0,0,0,0)']]), stroke: null });
    ctx.restore();
    // the lamp: base, arm, shade, and its cone of warm light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    polyPath([[560, 395], [660, 395], [860, DESK + 10], [360, DESK + 10]]);
    ctx.fillStyle = lgrad(0, 395, 0, DESK, [[0, rgba('#FFD08A', 0.35)], [1, rgba('#FFB060', 0.05)]]); ctx.fill();
    ctx.restore();
    ell(470, DESK - 4, 60, 12, { fill: '#1A1612', stroke: null });
    stroke([[470, DESK - 8], [430, 520], [560, 380]], '#2A2420', 9, { ink: null });
    poly([[520, 395], [690, 395], [650, 330], [560, 330]], { fill: lgrad(520, 0, 690, 0, [[0, '#1A1612'], [0.5, '#3A322A'], [1, '#1A1612']]), stroke: null });
    glow(610, 400, 120, '#FFE0A8', 0.8);
    fillRectG(560, 392, 90, 6, '#FFF0D0');
    dust(t, 380, 400, 480, 300, 40, '#FFE8C8');
    // a mug and a notebook in the lamplight
    rrect(700, DESK - 50, 44, 50, 6, { fill: lgrad(700, 0, 744, 0, [[0, '#6A5A58'], [0.4, '#C8B0A0'], [1, '#4A3A38']]), stroke: null });
    poly([[340, DESK - 4], [600, DESK - 8], [620, DESK], [360, DESK + 4]], { fill: '#D8C8B0', stroke: null });

    // the old laptop, screen toward the child (and us)
    const LX = 900, LY = DESK - 250, LW = 360, LH = 230;
    poly([[LX - 20, DESK], [LX + LW + 20, DESK], [LX + LW, DESK - 18], [LX, DESK - 18]], { fill: '#2A2A32', stroke: null });
    rrect(LX - 10, LY - 10, LW + 20, LH + 22, 10, { fill: '#1C1C22', stroke: null });
    rrect(LX, LY, LW, LH, 3, { fill: lgrad(0, LY, 0, LY + LH, [[0, '#101A30'], [1, '#0A0F1E']]), stroke: null });
    // the recording app: a record dot, a track, and a waveform being born
    const recOn = rec >= 0;
    circle(LX + 22, LY + 20, 8, { fill: recOn ? '#FF3B3B' : '#5A2A2A', stroke: null });
    if (recOn) glow(LX + 22, LY + 20, 40, '#FF3B3B', 0.7 * (0.7 + 0.3 * Math.sin(t * 6)));
    fillRectG(LX + 40, LY + 14, 120, 12, 'rgba(120,150,210,0.35)');
    fillRectG(LX + 10, LY + 40, LW - 20, 1, 'rgba(160,190,255,0.3)');
    const mid = LY + 120, x0 = LX + 16, span = LW - 32;
    fillRectG(x0, mid, span, 1, 'rgba(120,160,255,0.35)');
    if (recOn) {
      const prog = clamp(rec / 5.2), n = Math.floor(prog * 120);
      fillRectG(x0, mid - 60, span * prog, 120, 'rgba(255,70,70,0.12)');
      ctx.fillStyle = '#FF7A7A';
      for (let i = 0; i < n; i++) {
        const env = Math.max(0, Math.sin(i * 0.11) * 0.6 + 0.5) * (0.6 + 0.4 * hash(i, 97)) * clamp(i / 6);
        const a = 2 + env * 46;
        ctx.fillRect(x0 + i * span / 120, mid - a, span / 120 * 0.6, a * 2);
      }
      fillRectG(x0 + span * prog, LY + 36, 2, LH - 44, '#FFFFFF');
    }
    glow(LX + LW / 2, LY + LH / 2, 360, recOn ? '#8FA8FF' : '#6A8CFF', 0.3);
    // the audio interface with its red button
    rrect(1300, DESK - 44, 150, 44, 6, { fill: lgrad(0, DESK - 44, 0, DESK, [[0, '#3A3A44'], [1, '#1A1A22']]), stroke: null });
    circle(1340, DESK - 22, 12, { fill: '#2A2A30', stroke: null });
    circle(1405, DESK - 22, 9, { fill: recOn ? '#FF3030' : '#6A2020', stroke: null });
    if (recOn) glow(1405, DESK - 22, 40, '#FF4040', 0.8);
    // the mic on a little desk stand, cable trailing
    stroke([[1130, DESK - 4], [1130, 470]], '#15141A', 6, { ink: null });
    rrect(1112, 400, 36, 86, 16, { fill: lgrad(1112, 0, 1148, 0, [[0, '#2A2833'], [0.45, '#8A8494'], [1, '#2A2833']]), stroke: null });
    ell(1110, 450, 8, 44, { fill: 'rgba(20,20,30,0.5)', stroke: null });

    // the child, headphones on, reaching for the button
    childBack(1250, 830, 1.15, t, { reach, press, sing: recOn ? clamp(rec) : 0 });
  }

  function room(t) {
    const rec = t - T_REC;
    const reach = easeInOut(seg(t, 159.9, 160.7)) * (1 - easeInOut(seg(t, 161.4, 162.3)));
    const press = Math.exp(-Math.pow((t - T_REC) / 0.12, 2));
    const k = easeInOut(seg(t, 158.9, 161.0));                     // through the door
    const push = easeInOut(seg(t, 160.4, T_CITY));
    shoot(t, lerp(1000, 1180, push), lerp(560, 560, push), lerp(1.0, 1.18, push) * lerp(1.12, 1, k), 0.7);
    kidRoom(t, rec, reach, press);
    camEnd();

    // the doorway: two dark leaves and a sliver of warm light between them, as in the first shot
    const gap = lerp(18, 2400, easeIn(k));
    scr(() => {
      const L = W / 2 - gap / 2, R = W / 2 + gap / 2;
      const door = lgrad(0, 0, 0, H, [[0, '#050409'], [1, '#0C0A10']]);
      ctx.fillStyle = door; ctx.fillRect(-10, -10, L + 10, H + 20); ctx.fillRect(R, -10, W - R + 10, H + 20);
      if (k < 0.98) {
        ctx.globalCompositeOperation = 'lighter';
        const edge = lgrad(L - 90, 0, L, 0, [[0, 'rgba(0,0,0,0)'], [1, rgba('#FFC080', 0.35 * (1 - k))]]);
        ctx.fillStyle = edge; ctx.fillRect(L - 90, 0, 90, H);
        ctx.fillStyle = lgrad(R, 0, R + 90, 0, [[0, rgba('#FFC080', 0.35 * (1 - k))], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(R, 0, 90, H);
        // light spilling on the floor toward us
        polyPath([[L, 820], [R, 820], [R + 520, H + 20], [L - 380, H + 20]]);
        ctx.fillStyle = lgrad(0, 820, 0, H, [[0, rgba('#FFC080', 0.4 * (1 - k))], [1, rgba('#FFC080', 0.05)]]); ctx.fill();
      }
    });
    if (k < 0.5) scr(() => { ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - gap / 2 - 30, 0, gap + 60, H); ctx.clip(); dust(t, W / 2 - 60, 132, 120, 816, 30, '#FFE8C8'); ctx.restore(); });
    // up from the white of the field's last frame? no: a soft dip to black at the cut
    scr(() => { ctx.fillStyle = `rgba(0,0,0,${1 - easeOut(seg(t, T_ROOM, T_ROOM + 0.5))})`; ctx.fillRect(0, 0, W, H); });
    scr(() => fillRectG(0, 640, W, 320, lgrad(0, 640, 0, 948, [[0, 'rgba(4,4,8,0)'], [1, 'rgba(4,4,8,0.6)']])));
    narration(t, 159.0, 165.6, '지금 이 순간에도\n어느 작은 방에서, 누군가 첫 노래를 만든다', { y: 836, size: 54 });
  }

  // ---- 166.00 · a city of small rooms ------------------------------------------------------------

  // the child's building and its grid; the hero window is one cell of it
  const BLD = { x: 990, y: 380, w: 320, h: 900, cols: 6, rows: 20, wh: 44 };
  const CELL = BLD.w / BLD.cols;
  const HERO = { x: BLD.x + 2 * CELL + CELL * 0.2, y: BLD.y + 20 + 5 * BLD.wh, w: CELL * 0.6, h: BLD.wh * 0.6 };

  /** One lit window: a warm or cool room glow, blinds or a curtain, now and then a figure at a desk. */
  function cityWindow(x, y, w, h, i, on) {
    fillRectG(x - w * 0.06, y - h * 0.06, w * 1.12, h * 1.16, '#080A14');
    if (on <= 0.01) { fillRectG(x, y, w, h, lgrad(0, y, 0, y + h, [[0, '#141A30'], [1, '#0B0E1A']])); return; }
    const warm = hash(i, 101) < 0.7;
    const c1 = warm ? mix('#FFD9A0', '#FFB870', hash(i, 106)) : '#B8D2FF', c2 = warm ? '#B8662E' : '#3E5AB8';
    ctx.save(); ctx.globalAlpha = on;
    fillRectG(x, y, w, h, lgrad(x, y, x + w * 0.3, y + h, [[0, c1], [1, c2]]));
    const kind = hash(i, 102);
    if (kind < 0.3) {                                      // blinds
      ctx.fillStyle = 'rgba(255,245,225,0.22)';
      for (let q = 0; q < 7; q++) ctx.fillRect(x, y + q * h / 7, w, h * 0.05);
    } else if (kind < 0.55) {                              // a curtain drawn half across
      fillRectG(x, y, w * 0.35, h, lgrad(x, 0, x + w * 0.35, 0, [[0, rgba(c2, 0.9)], [1, rgba(c2, 0.4)]]));
    } else if (kind < 0.7) {                               // someone up late at a desk
      ctx.fillStyle = 'rgba(14,10,20,0.92)';
      ctx.beginPath(); ctx.arc(x + w * 0.58, y + h * 0.5, h * 0.12, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w * 0.42, y + h); ctx.quadraticCurveTo(x + w * 0.44, y + h * 0.64, x + w * 0.58, y + h * 0.63);
      ctx.quadraticCurveTo(x + w * 0.72, y + h * 0.64, x + w * 0.74, y + h); ctx.fill();
    }
    fillRectG(x, y + h * 0.9, w, h * 0.1, 'rgba(0,0,0,0.25)');   // sill shadow
    ctx.restore();
  }

  function block(bx, by, bw, bh, seed, t, cols, rows) {
    fillRectG(bx, by, bw, bh, lgrad(bx, 0, bx + bw, 0, [[0, '#0C0F20'], [0.5, '#131730'], [1, '#090B16']]));
    const ww = bw / cols, wh = 40;
    for (let r = 0; r * wh < bh - 20; r++) for (let c = 0; c < cols; c++) {
      const i = seed * 1000 + r * 50 + c;
      const on = hash(i, 103) < 0.5 ? 1 : clamp((t - (166.4 + hash(i, 104) * 5)) / 0.3) * (hash(i, 105) < 0.6 ? 1 : 0);
      cityWindow(bx + c * ww + ww * 0.22, by + 16 + r * wh, ww * 0.56, wh * 0.55, i, on);
    }
    if (hash(seed, 7) < 0.5) { fillRectG(bx + bw * 0.6, by - 40, 3, 40, '#0A0C18'); glow(bx + bw * 0.6 + 1, by - 40, 14, '#FF4040', 0.4 + 0.4 * Math.sin(t * 3 + seed)); }
  }

  function city(t) {
    const k = easeInOut(seg(t, T_CITY, 171.4));
    const Z = Math.exp(lerp(Math.log(9), Math.log(1.0), k));
    const [hx, hy, hr] = handheld(t, 0.6);
    const par = f => 1 + (Z - 1) * f;
    const cxW = lerp(HERO.x + HERO.w / 2, 960, k), cyW = lerp(HERO.y + HERO.h / 2, 560, k);
    const layerCam = f => camBegin(lerp(960, cxW, f) + hx / par(f), lerp(560, cyW, f) + hy / par(f), par(f), hr);

    // sky: night, with the first thin light of dawn along the horizon
    scr(() => {
      fillRectG(0, 0, W, H, lgrad(0, 0, 0, H, [[0, '#03050F'], [0.5, '#0E1636'], [0.72, '#262A58'], [0.86, '#5A3E66'], [1, '#8A5A6A']]));
      for (let i = 0; i < 140; i++) {
        const x = hash(i, 111) * W, y = 132 + hash(i, 112) * 420;
        ctx.globalAlpha = (0.25 + 0.6 * hash(i, 113)) * (0.6 + 0.4 * Math.sin(t * 2 + i));
        fillRectG(x, y, 2, 2, '#FFFFFF');
      }
      ctx.globalAlpha = 1;
      glow(1250, 820, 1000, '#FFB08A', 0.16 + 0.14 * k);
    });
    // the far skyline, soft
    layerCam(0.3);
    layer(3, () => {
      for (let i = 0; i < 30; i++) {
        const bx = -500 + i * 105 + hash(i, 121) * 40, bh = 110 + hash(i, 122) * 250, bw = 80 + hash(i, 123) * 70;
        fillRectG(bx, 700 - bh, bw, bh + 600, '#0B0F22');
        for (let j = 0; j < bh / 16; j++) for (let c = 0; c < 5; c++) {
          if (hash(i * 97 + j, c) < 0.45) continue;
          fillRectG(bx + 6 + c * (bw - 12) / 5, 700 - bh + 10 + j * 16, 5, 7, hash(i + j, c + 9) < 0.7 ? '#FFC77A' : '#9CC0FF');
        }
      }
      ctx.fillStyle = lgrad(0, 560, 0, 900, [[0, 'rgba(120,90,140,0)'], [1, 'rgba(120,90,140,0.35)']]); ctx.fillRect(-1500, 560, 5000, 400);
    });
    camEnd();
    // the middle blocks
    layerCam(0.65);
    for (let i = 0; i < 11; i++) {
      const bw = 170 + hash(i, 133) * 90, bx = -420 + i * 250 + hash(i, 131) * 40, bh = 260 + hash(i, 132) * 320;
      if (i === 5 || i === 6) continue;
      block(bx, 800 - bh, bw, bh + 500, i + 10, t, Math.max(3, Math.round(bw / 55)));
    }
    camEnd();
    // the child's building
    layerCam(1);
    const B = BLD;
    fillRectG(B.x, B.y, B.w, B.h, lgrad(B.x, 0, B.x + B.w, 0, [[0, '#10132A'], [0.5, '#171B36'], [1, '#0C0E1E']]));
    fillRectG(B.x - 6, B.y - 10, B.w + 12, 10, '#0A0C18');
    for (let r = 0; r < B.rows; r++) {
      fillRectG(B.x, B.y + 12 + r * B.wh, B.w, 2, 'rgba(0,0,0,0.25)');
      for (let c = 0; c < B.cols; c++) {
        if (r === 5 && c === 2) continue;
        const i = 5000 + r * 50 + c;
        const on = hash(i, 103) < 0.45 ? 1 : clamp((t - (166.6 + hash(i, 104) * 4.5)) / 0.3) * (hash(i, 105) < 0.6 ? 1 : 0);
        cityWindow(B.x + c * CELL + CELL * 0.2, B.y + 20 + r * B.wh, HERO.w, HERO.h, i, on);
      }
    }
    // the hero window: lamp light on the left, the laptop's blue, the child in headphones
    const { x: wx, y: wy, w: w0, h: h0 } = HERO;
    fillRectG(wx - 2, wy - 2, w0 + 4, h0 + 4.5, '#080A14');
    fillRectG(wx, wy, w0, h0, lgrad(wx, wy, wx + w0, wy + h0, [[0, '#FFD89A'], [0.5, '#B8703A'], [1, '#3A4A8A']]));
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, w0, h0); ctx.clip();
    glow(wx + 6, wy + 8, 14, '#FFF0C8', 0.9);                    // the lamp
    fillRectG(wx + 3, wy + 7.5, 6, 1.4, '#2A2018');
    fillRectG(wx, wy + h0 * 0.78, w0, h0 * 0.22, '#1A120E');       // desk edge
    const cx0 = wx + w0 * 0.6;
    glow(cx0, wy + h0 * 0.62, 12, '#8FB0FF', 0.7);                // the laptop, facing the child
    ctx.fillStyle = '#0C0A12';                                    // the child, facing us, a silhouette
    ctx.beginPath(); ctx.arc(cx0, wy + h0 * 0.36, 2.9, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx0 - 5.5, wy + h0); ctx.quadraticCurveTo(cx0 - 5, wy + h0 * 0.52, cx0, wy + h0 * 0.52);
    ctx.quadraticCurveTo(cx0 + 5, wy + h0 * 0.52, cx0 + 5.5, wy + h0); ctx.fill();
    ctx.strokeStyle = '#0C0A12'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(cx0, wy + h0 * 0.36, 3.7, Math.PI * 1.0, Math.PI * 2.0); ctx.stroke();
    ell(cx0 - 3.6, wy + h0 * 0.39, 1.1, 1.8, { fill: '#0C0A12', stroke: null }); ell(cx0 + 3.6, wy + h0 * 0.39, 1.1, 1.8, { fill: '#0C0A12', stroke: null });
    ctx.strokeStyle = rgba('#FFD08A', 0.6); ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.arc(cx0, wy + h0 * 0.36, 3.95, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    fillRectG(cx0 - 4.5, wy + h0 * 0.64, 9, 5.5, '#101018');     // the laptop's back, lit at the edge
    fillRectG(cx0 - 4.5, wy + h0 * 0.64, 9, 0.4, rgba('#9CC0FF', 0.8));
    fillRectG(wx + w0 * 0.22, wy, w0 * 0.1, h0, 'rgba(255,230,190,0.18)'); // a sheer curtain
    ctx.restore();
    fillRectG(wx + w0 / 2 - 0.35, wy, 0.7, h0, '#0A0C18');
    fillRectG(wx - 3, wy + h0 + 1, w0 + 6, 1.4, '#262B44');
    glow(wx + w0 / 2, wy + h0 / 2, 80, '#FFC07A', 0.22);
    camEnd();
    // near rooftops, soft, sliding in at the bottom
    layerCam(1.25);
    layer(5, () => {
      fillRectG(-500, 950, 1250, 600, '#05060C');
      fillRectG(1560, 915, 900, 600, '#05060C');
      fillRectG(1700, 860, 6, 60, '#05060C');
      glow(1703, 860, 30, '#FF5050', 0.5 + 0.3 * Math.sin(t * 2.4));
    });
    camEnd();
    // a soft dark bed for the last words
    scr(() => { ctx.fillStyle = rgrad(W / 2, 330, 40, 700, [[0, 'rgba(4,5,12,0.5)'], [1, 'rgba(4,5,12,0)']]); ctx.fillRect(0, 0, W, 800); });

    narration(t, 166.4, 170.4, '다음은, 당신 차례다', { y: 330, size: 66, per: 0.07 });
    // the credit, small, in the lower bar as it closes
    const ck = Math.min(clamp((t - 168.0) / 0.6), clamp((171.2 - t) / 0.5));
    if (ck > 0) {
      const draw = () => {
        ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        ctx.globalAlpha = ck; ctx.font = `28px ${FONT.round}`; ctx.fillStyle = '#B9B3C8';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('영상·음악 · Claude Code 로 만들었어요 (원곡 미사용)', W / 2, H - 66);
        ctx.restore();
      };
      if (typeof barCaptions !== 'undefined') barCaptions.push(draw); else draw();
    }
  }

  chapter('now', T_SEA, T_OUT, [[T_SEA, stadium], [T_FIELD, field], [T_ROOM, room], [T_CITY, city]]);
})();
