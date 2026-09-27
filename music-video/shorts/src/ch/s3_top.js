// s3_top (32.73 – 47.27) · 3 · 정상
//
// 32.73  The biggest hit of the video: a gold impact frame, the stage explodes in gold, gramophone
//        trophies are blown out of the blast and rain down; the two siblings stand on the stage lip
//        with their backs to us. 34.55 boom: four gold gramophones slam into a row, one per eighth.
// 36.36  A manga panel: two backs at their microphones against the light, gold dust; the quote.
// 40.00  A gold star trophy rises in a spotlight; 41.82 boom: the second one slams in beside it.
// 43.64  An arena of lights, a tiny figure on a far stage; 45.45 stamp: wildflowers burst and fill
//        the screen.
//
// No faces, no logos, no real trophy designs: a generic gold gramophone, a generic gold star.
// Helpers shared with s4_you.js go on window.S34.
(() => {
  const G = { hi: '#FFF6D8', light: '#FFD978', mid: '#E9A93A', dark: '#9A6414', deep: '#5A3808' };
  const INK = '#141019';
  const GREEN = '#7ED321', BLACK_HAIR = '#1A1320';

  const scr = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };
  /** 1 at t0, decaying after it (0 before). */
  const kick = (t, t0, len = 0.5) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  const shake = (t, hits) => hits.reduce((a, [t0, amt, len]) => {
    const [x, y] = shakeXY(t, t0, amt, len); return [a[0] + x, a[1] + y];
  }, [0, 0]);

  // ---- props ------------------------------------------------------------------------------------

  /** A generic gold gramophone. (x, y) = bottom centre of the plinth; ~340 tall at s = 1. */
  function gramophone(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s * (o.flip ? -1 : 1), s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const lw = 7;
    // plinth
    rrect(-112, -72, 224, 72, 10, { fill: G.mid, stroke: INK, lw });
    ctx.save(); rrectPath(-112, -72, 224, 72, 10); ctx.clip();
    ctx.fillStyle = G.light; ctx.fillRect(-112, -72, 110, 72);
    ctx.fillStyle = G.dark; ctx.fillRect(-112, -18, 224, 18);
    ctx.fillStyle = G.hi; ctx.fillRect(-112, -72, 224, 8);
    ctx.restore();
    rrect(-112, -72, 224, 72, 10, { stroke: INK, lw });
    // platter
    ell(0, -80, 94, 16, { fill: '#3A2410', stroke: INK, lw: 5 });
    ell(0, -82, 26, 6, { fill: G.light, stroke: null });
    // horn: a flaring cone along a curve from the back of the plinth up and to the left
    const P0 = [62, -96], C = [118, -250], P1 = [-18, -336];
    const at = u => [(1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * C[0] + u * u * P1[0], (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * C[1] + u * u * P1[1]];
    const L = [], R = [], N = 18;
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = at(u), q = at(Math.min(1, u + 0.01)), p2 = at(Math.max(0, u - 0.01));
      const dx = q[0] - p2[0], dy = q[1] - p2[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, w = 9 + 118 * Math.pow(u, 3.2);
      L.push([p[0] + nx * w, p[1] + ny * w]); R.push([p[0] - nx * w, p[1] - ny * w]);
    }
    const end = at(1), pre = at(0.97), ang = Math.atan2(end[1] - pre[1], end[0] - pre[0]) + Math.PI / 2;
    polyPath([...L, ...R.reverse()]); paint({ fill: G.mid, stroke: INK, lw });
    R.reverse();
    ctx.save(); polyPath([...L, ...R.reverse()]); ctx.clip();
    // lit half: from the axis to the L side
    const axis = []; for (let i = 0; i <= N; i++) axis.push(at(i / N));
    polyPath([...L, ...axis.reverse()]); ctx.fillStyle = G.light; ctx.fill();
    ctx.restore();
    R.reverse();
    stroke(L.slice(3, 16).map(([a, b]) => [a * 0.9 + end[0] * 0.02, b]), G.hi, 6, { ink: null, smooth: true, alpha: 0.9 });
    // bell mouth
    ctx.save(); ctx.translate(end[0], end[1]); ctx.rotate(ang);
    ell(0, 0, 128, 44, { fill: G.light, stroke: INK, lw });
    ell(0, 4, 104, 32, { fill: rgrad(0, 8, 4, 104, [[0, G.deep], [0.7, G.dark], [1, G.mid]]), stroke: null });
    ctx.restore();
    // tone arm
    stroke([[64, -104], [10, -96], [-30, -88]], G.dark, 8, { ink: INK, olw: 6 });
    circle(-30, -88, 8, { fill: G.hi, stroke: INK, lw: 4 });
    ctx.restore();
  }

  /** A generic gold star trophy: a faceted star on a pedestal. (x, y) = bottom; ~600 tall at s = 1. */
  function starTrophy(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const lw = 7, cy = -440, R = 160 * (o.starK ?? 1);
    if (o.glow !== 0) glow(0, cy, 420, G.light, 0.45 * (o.glow ?? 1));
    // base: two tiers of dark stone, a blank gold band
    rrect(-128, -62, 256, 62, 8, { fill: '#2A1C2E', stroke: INK, lw });
    rrect(-128, -62, 256, 14, 6, { fill: '#4A3656', stroke: null });
    rrect(-96, -112, 192, 52, 6, { fill: G.mid, stroke: INK, lw });
    ctx.save(); rrectPath(-96, -112, 192, 52, 6); ctx.clip(); ctx.fillStyle = G.light; ctx.fillRect(-96, -112, 92, 52); ctx.fillStyle = G.hi; ctx.fillRect(-96, -112, 192, 7); ctx.restore();
    // stem
    poly([[-26, -112], [26, -112], [12, -268], [-12, -268]], { fill: G.mid, stroke: INK, lw });
    poly([[-26, -112], [0, -112], [0, -268], [-12, -268]], { fill: G.light, stroke: null });
    ell(0, -272, 40, 12, { fill: G.light, stroke: INK, lw: 5 });
    poly([[-30, -276], [30, -276], [16, -300], [-16, -300]], { fill: G.mid, stroke: INK, lw: 5 });
    // the star, faceted: each arm split along its ridge, lit from the upper left
    const rot = (o.spin || 0) - Math.PI / 2, n = 5, inner = 0.46, la = -2.3;
    const pts = starShape(0, cy, R, inner, n, rot);
    polyPath(pts); paint({ fill: G.mid, stroke: INK, lw: lw + 2 });
    for (let i = 0; i < n; i++) {
      const tip = pts[i * 2], iL = pts[(i * 2 + 9) % 10], iR = pts[i * 2 + 1];
      const fa = (tri) => { const mx = (tri[1][0] + tri[2][0]) / 2, my = (tri[1][1] + tri[2][1]) / 2; return Math.atan2(my - cy, mx); };
      for (const tri of [[[0, cy], tip, iL], [[0, cy], tip, iR]]) {
        const lit = Math.cos(fa(tri) - la);
        poly(tri, { fill: lit > 0.35 ? G.hi : lit > -0.2 ? G.light : lit > -0.7 ? G.mid : G.dark, stroke: null });
      }
    }
    polyPath(pts); paint({ stroke: INK, lw: lw + 2 });
    ctx.restore();
  }

  /** A little wildflower head, cel-shaded: petals on the lower right fall into shadow. */
  function wildflower(x, y, r, o = {}) {
    const n = o.n ?? 6, col = o.color || '#FFFFFF', sh = mix(col, '#5A3070', 0.3), rot = o.rot || 0;
    const thin = n > 8, lw = Math.max(2, r * 0.06);
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU, lit = Math.cos(a + 2.3) > -0.2;
      ctx.save(); ctx.rotate(a);
      ell(r * 0.52, 0, r * 0.52, r * (thin ? 0.15 : 0.3), { fill: lit ? col : sh, stroke: INK, lw });
      if (lit) ell(r * 0.6, -r * 0.05, r * 0.28, r * (thin ? 0.05 : 0.1), { fill: mix(col, '#FFFFFF', 0.6), stroke: null, alpha: 0.7 });
      ctx.restore();
    }
    circle(0, 0, r * (thin ? 0.3 : 0.26), { fill: o.center || '#FFC83D', stroke: INK, lw });
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, TAU); ctx.clip();
    ctx.fillStyle = '#E08A1E'; ctx.beginPath(); ctx.arc(r * 0.1, r * 0.1, r * 0.24, 0, TAU); ctx.fill(); ctx.restore();
    circle(-r * 0.08, -r * 0.08, r * 0.07, { fill: '#FFF6D8', stroke: null });
    ctx.restore();
  }
  function leaf(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    smooth([[0, 0], [r * 0.5, -r * 0.28], [r, 0], [r * 0.5, r * 0.28]], { fill: '#4FA85E', stroke: INK, lw: Math.max(2, r * 0.05) });
    smooth([[0, 0], [r * 0.5, 0], [r, 0], [r * 0.5, r * 0.26]], { fill: '#2F7A48', stroke: null });
    ctx.restore();
  }

  /** Floating gold dust in a rectangle, rising slowly and twinkling. */
  function goldDust(t, n, x, y, w, h, seed = 1, color = G.light) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const sp = 20 + hash(i, seed) * 60, px = x + hash(i, seed + 1) * w + Math.sin(t * 0.8 + i) * 18;
      const py = y + ((hash(i, seed + 2) * h - t * sp) % h + h) % h;
      const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * (1.5 + hash(i, seed + 3) * 3) + i));
      const r = (1.5 + hash(i, seed + 4) * 4.5) * tw;
      ctx.globalAlpha = 0.9 * tw; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
      if (hash(i, seed + 5) > 0.85) sparkle(px, py, r * 4, G.hi, t + i);
    }
    ctx.restore();
  }

  /** Particles blown out of (cx, cy) at t0, as bright streaks that slow and fade. */
  function burst(t, t0, cx, cy, n, o = {}) {
    const age = t - t0; if (age < 0 || age > (o.life ?? 1.6)) return;
    const life = o.life ?? 1.6, sp = o.speed ?? 1600, cols = o.colors || [G.hi, G.light, G.mid, '#FFFFFF'];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = hash(i, 11 + (o.seed || 0)) * TAU, v = sp * (0.35 + 0.65 * hash(i, 12 + (o.seed || 0)));
      const d = v * (1 - Math.exp(-age * 2.6)) / 2.6, d0 = Math.max(0, d - v * 0.06 * Math.exp(-age * 2.6) - 6);
      const fade = 1 - age / life;
      ctx.globalAlpha = fade; ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = (3 + hash(i, 13) * 7) * fade;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0 + age * age * 120);
      ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d + age * age * 160); ctx.stroke();
    }
    ctx.restore();
  }

  /** An expanding shock ring. */
  function ring(t, t0, cx, cy, r1, color = '#FFFFFF', len = 0.6, lw = 40) {
    const age = t - t0; if (age < 0 || age > len) return;
    const k = age / len, r = r1 * easeOut(k);
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = color; ctx.lineWidth = lw * (1 - k) + 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
  }

  /** A dark band behind the captions so they read over anything. */
  function captionShade(a = 0.5, y0 = 120, y1 = 760) {
    scr(() => {
      ctx.fillStyle = lgrad(0, y0, 0, y1, [[0, rgba('#0A0612', 0)], [0.2, rgba('#0A0612', a)], [0.75, rgba('#0A0612', a)], [1, rgba('#0A0612', 0)]]);
      ctx.fillRect(0, y0, W, y1 - y0);
    });
  }

  /** Spotlight beam from (x0, y0) to (x1, y1) with a half-width at the far end. */
  function beam(x0, y0, x1, y1, w, color, a = 0.25) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
    ctx.fillStyle = lgrad(x0, y0, x1, y1, [[0, rgba(color, a)], [1, rgba(color, 0)]]);
    ctx.beginPath(); ctx.moveTo(x0 + nx * 10, y0 + ny * 10); ctx.lineTo(x1 + nx * w, y1 + ny * w);
    ctx.lineTo(x1 - nx * w, y1 - ny * w); ctx.lineTo(x0 - nx * 10, y0 - ny * 10); ctx.fill();
    ctx.restore();
  }

  /** Crowd of raised phone lights in a band, twinkling, with a beat wave. */
  function crowdLights(t, y0, y1, n, seed = 3, colors = ['#FFFFFF', G.light, '#BFE3FF']) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const u = hash(i, seed), v = hash(i, seed + 1), x = u * W, y = lerp(y0, y1, v);
      const r = lerp(1.5, 6, v) * (0.7 + 0.5 * Math.max(0, Math.sin(t * 3 + i * 1.7)));
      ctx.globalAlpha = 0.5 + 0.5 * pulse(t - x / 2400, 4);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + i) * 4 * v, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /** An impact frame tinted gold: the picture inverted, then washed in gold. */
  function goldImpact(t, t0, len = 0.12) {
    if (t < t0 || t > t0 + len) return;
    scr(() => {
      ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#FFB020'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  /** Rim light around brother()'s head and shoulders (same x, y, s as the brother call). */
  function brotherRim(x, y, s, color = G.hi, a = 0.8) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    for (const side of [-1, 1]) {
      const head = []; for (let i = 0; i <= 10; i++) { const u = -0.75 + i * 0.15; head.push([side * Math.cos(u) * 92, -706 + Math.sin(u) * 100]); }
      stroke(head, color, 6, { ink: null, smooth: true });
      stroke([[side * 126, -596], [side * 142, -520], [side * 150, -400]], color, 6, { ink: null, smooth: true });
    }
    ctx.restore();
  }

  window.S34 = { goldImpact, brotherRim, G, INK, scr, kick, shake, gramophone, starTrophy, wildflower, goldDust, burst, ring, captionShade, beam, crowdLights };

  // ---- 32.73 · the gold explosion --------------------------------------------------------------

  const T_BOOM = 32.7273, T_ROW = 34.5455;
  function sweep(t, lt) {
    const hits = [[T_BOOM, 46, 1.0], [T_ROW, 30, 0.6]];
    for (let i = 1; i < 4; i++) hits.push([T_ROW + i * 0.2273, 12, 0.3]);
    const [sx, sy] = shake(t, hits);
    const z = 1.0 + 0.05 * seg(t, T_BOOM, 36.36) + 0.06 * kick(t, T_ROW, 0.5) + 0.1 * kick(t, T_BOOM, 0.6);
    const cx = 540, cy = 880, P = pulse(t, 5);

    // the sky: a gold furnace behind the stage
    scr(() => {
      ctx.fillStyle = rgrad(cx, cy, 0, 1500, [[0, '#FFFBEA'], [0.12, '#FFE08A'], [0.3, '#F2A33A'], [0.55, '#8E2A3E'], [0.8, '#35102E'], [1, '#12061A']]);
      ctx.fillRect(0, 0, W, H);
    });
    camBegin(W / 2 + sx, H / 2 + sy, z);
    sunburst(cx, cy, rgba('#FFF2C0', 0.28 + 0.12 * P), rgba('#FFB347', 0.0), t * 0.25, 28, 2400);
    glow(cx, cy, 700 + 200 * P + 900 * kick(t, T_BOOM, 0.8), '#FFF6D8', 0.75);
    // stage beams sweeping
    for (let i = 0; i < 6; i++) {
      const bx = 60 + i * 192, sw = Math.sin(t * 1.3 + i * 1.1) * 260;
      beam(bx, -80, bx + sw, 1300, 150, i % 2 ? '#FFFFFF' : G.light, 0.18 + 0.12 * P);
    }
    // the far crowd: a dark band with a sea of lights
    ctx.fillStyle = lgrad(0, 1120, 0, 1330, [[0, rgba('#2A0E26', 0)], [0.3, '#2A0E26'], [1, '#12061A']]);
    ctx.fillRect(-200, 1120, W + 400, 260);
    crowdLights(t, 1160, 1330, 220, 5);
    // gramophones blown out of the blast
    for (let i = 0; i < 9; i++) {
      const age = t - T_BOOM, a = -Math.PI / 2 + (hash(i, 21) - 0.5) * 2.6, v = 1500 + hash(i, 22) * 900;
      const x = cx + Math.cos(a) * v * age, y = cy + Math.sin(a) * v * age + 0.5 * 2200 * age * age;
      if (y > H + 300) continue;
      gramophone(x, y, 0.28 + hash(i, 23) * 0.25, { rot: age * (hash(i, 24) - 0.5) * 8, flip: i % 2 });
    }
    // and more raining from above
    for (let i = 0; i < 12; i++) {
      const d = 0.15 + hash(i, 31) * 1.1, age = t - T_BOOM - d; if (age < 0) continue;
      const x = 60 + hash(i, 32) * 960, y = -250 + age * (700 + hash(i, 33) * 500);
      if (y > H + 200) continue;
      gramophone(x, y, 0.2 + hash(i, 34) * 0.18, { rot: Math.sin(age * 3 + i) * 0.4, flip: i % 2, alpha: 0.9 });
    }
    // the stage
    ctx.fillStyle = lgrad(0, 1330, 0, 1920, [[0, '#3A1830'], [0.25, '#1E0C1C'], [1, '#0A0410']]);
    ctx.fillRect(-200, 1330, W + 400, 700);
    ctx.fillStyle = rgba(G.light, 0.5 + 0.3 * P); ctx.fillRect(-200, 1328, W + 400, 6);
    glow(cx, 1340, 520, G.light, 0.35);
    // the siblings, backs to us, lit from the blast
    const reach = t >= T_ROW;
    brother(700, 1590, 0.78, { t, hair: '#3A2A20' });
    brotherRim(700, 1590, 0.78);
    heroine(420, 1590, 0.78, { t, view: 'back', hair: GREEN, pose: reach ? 'reach' : 'stand', wind: 0.9, rim: G.hi, rimK: 0.9 });
    // gold confetti and the explosion itself
    confetti(t, T_BOOM, { n: 110, burst: true, colors: [G.hi, G.light, G.mid, '#FFFFFF', '#FFB347'] });
    burst(t, T_BOOM, cx, cy, 140, { speed: 2600, life: 1.8 });
    burst(t, T_ROW, cx, 790, 60, { speed: 1600, life: 0.9, seed: 7 });
    ring(t, T_BOOM, cx, cy, 1400, '#FFFFFF', 0.7, 80);
    ring(t, T_BOOM + 0.08, cx, cy, 1100, G.light, 0.8, 40);
    ring(t, T_ROW, cx, 790, 900, G.hi, 0.5, 30);
    camEnd();

    // 34.55: the four major categories, four gramophones, slam into a row one after another
    const rowX = [165, 395, 685, 915], rowY = [905, 865, 865, 905];
    for (let i = 0; i < 4; i++) {
      const t0 = T_ROW + i * 0.2273, age = t - t0; if (age < 0) continue;
      const k = clamp(age / 0.16), s = lerp(2.6, 1, easeOut(k)) * (1 + 0.1 * pulse(t, 6) * (age > 0.4));
      const bob = Math.sin(t * 3 + i) * 6;
      scr(() => {
        ctx.translate(sx * 0.5, sy * 0.5);
        glow(rowX[i], rowY[i] - 90, 190, G.light, 0.5 * clamp(age * 4));
        gramophone(rowX[i], rowY[i] + bob, 0.48 * s, { alpha: clamp(k * 1.5), rot: (i - 1.5) * 0.06 });
        if (age < 0.5) { ring(t, t0, rowX[i], rowY[i] - 80, 220, G.hi, 0.45, 18); sparkle(rowX[i] + 70, rowY[i] - 170, 30 * (1 - age * 2), '#FFFFFF', t * 3); }
      });
    }
    speedLinesV(t, cx, cy, 0.9 * kick(t, T_BOOM, 1.4) + 0.6 * kick(t, T_ROW, 0.6), '#FFFFFF');
    sparkles(t, 26, 0, 700, W, 900, G.hi);
    captionShade(0.45, 150, 700);
    tagLine(t, T_BOOM + 0.05, 36.36, '그래미 주요 4개 부문\n싹쓸이', { size: 92, colors: [ANI.white, G.light] });
    subLine(t, 33.3, 36.36, '2020 · 역대 최연소', { y: 590, size: 50, color: G.hi });
    flash(0.85 * kick(t, T_BOOM + 0.13, 0.5), '#FFF3C8');
    goldImpact(t, T_BOOM, 0.13);
    impact(t, T_ROW, 0.07);
  }

  // ---- 36.36 · the quote ------------------------------------------------------------------------

  const T_QUOTE = 36.3636;
  function quote(t, lt) {
    const P = pulse(t, 5);
    scr(() => { ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#120A1C'], [0.5, '#1E1026'], [1, '#0A0610']]); ctx.fillRect(0, 0, W, H); });
    screentone(0, 0, W, 760, 22, G.dark, 0.18);
    goldDust(t, 70, 0, 0, W, H, 3);
    // the panel: two backs at their microphones, the light ahead of them
    const px = 50, py = 760, pw = 980, ph = 830, slide = 1 - easeOut(clamp(lt / 0.35));
    panel(px + slide * 300, py, pw, ph, () => {
      ctx.save(); ctx.translate(slide * 300, 0);
      const lx = 560, ly = 900;
      ctx.fillStyle = rgrad(lx, ly, 0, 1000, [[0, '#FFFDF2'], [0.15, '#FFE59A'], [0.4, '#E9A93A'], [0.75, '#6A2C2A'], [1, '#1A0A14']]);
      ctx.fillRect(px - 100, py - 100, pw + 200, ph + 200);
      sunburst(lx, ly, rgba('#FFF6D8', 0.22 + 0.1 * P), rgba('#FFFFFF', 0), t * 0.12, 36, 1400);
      glow(lx, ly, 480 + 60 * P, '#FFFFFF', 0.6);
      // far crowd lights
      crowdLights(t, 1030, 1180, 140, 9);
      // push in on the two
      const z = 1 + 0.06 * clamp(lt / 3.6);
      ctx.translate(540, 1300); ctx.scale(z, z); ctx.translate(-540, -1300);
      // mic stands in front of them (seen past their shoulders)
      for (const [mx, top, bx] of [[548, 1170, 560], [880, 1250, 900]]) {
        stroke([[mx, top], [bx, 1700]], '#1A1420', 12, { ink: null });
        rrect(mx - 16, top - 44, 32, 64, 14, { fill: '#2B2B33', stroke: INK, lw: 4 });
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; stroke([[mx + 12, top - 36], [mx + 12, top + 10]], G.hi, 4, { ink: null, alpha: 0.7 }); ctx.restore();
      }
      brother(730, 2010, 1.05, { t, hair: '#3A2A20' });
      heroine(360, 1990, 1.1, { t, view: 'back', hair: GREEN, pose: 'stand', wind: 0.55, rim: G.hi, rimK: 1 });
      brotherRim(730, 2010, 1.05, G.hi, 0.9);
      ctx.restore();
      screentone(px, py + ph * 0.62, pw, ph * 0.4, 14, '#000000', 0.35);
      goldDust(t, 40, px, py, pw, ph, 8, G.hi);
    }, { rot: -0.015, border: 14 });
    captionShade(0.35, 180, 740);
    tagLine(t, T_QUOTE + 0.1, 40.0, '“침실에서 음악을 만드는\n모든 아이들에게.\n언젠가 너희도\n이걸 받게 될 거야.”', { size: 70, y: 285, colors: [ANI.white, ANI.white, G.light, G.light] });
    subLine(t, T_QUOTE + 0.5, 40.0, '— 피니어스, 2020 그래미 수상 소감', { y: 660, size: 42, color: '#E8DCC0' });
    flash(0.6 * kick(t, T_QUOTE, 0.25), '#FFF3C8');
  }

  // ---- 40.00 · two Oscars -----------------------------------------------------------------------

  const T_OSCAR = 40.0, T_TWO = 41.8182;
  function oscars(t, lt) {
    const P = pulse(t, 5), K2 = kick(t, T_TWO, 0.8);
    const [sx, sy] = shake(t, [[T_TWO, 36, 0.7]]);
    scr(() => { ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#0C0620'], [0.45, '#2A0F46'], [0.75, '#3E1236'], [1, '#08040E']]); ctx.fillRect(0, 0, W, H); });
    camBegin(W / 2 + sx, H / 2 + sy, 1.0 + 0.04 * clamp(lt / 3.6) + 0.05 * K2);
    const two = t >= T_TWO;
    sunburst(540, 1060, rgba(G.light, 0.1 + 0.08 * P + 0.25 * K2 + (two ? 0.06 : 0)), rgba('#FFFFFF', 0), t * 0.2, 30, 2400);
    // curtains
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = side < 0 ? i * 34 : W - i * 34, sw = Math.sin(t * 1.2 + i) * 6;
        ctx.fillStyle = i % 2 ? '#6A0E22' : '#9A1A30';
        ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + side * -40 + sw, H + 20); ctx.lineTo(x + side * -80 + sw, H + 20); ctx.lineTo(x + side * -44, -20); ctx.fill();
      }
    }
    // spotlights
    beam(380, -100, 360, 1520, 260, '#FFFFFF', 0.28 + 0.08 * P);
    if (two) beam(720, -100, 740, 1520, 260, '#FFFFFF', 0.28 + 0.3 * K2);
    // floor
    ctx.fillStyle = lgrad(0, 1440, 0, 1920, [[0, '#2A1030'], [1, '#08040E']]); ctx.fillRect(-100, 1440, W + 200, 600);
    ell(360, 1500, 260, 40, { fill: rgba('#FFF6D8', 0.25), stroke: null });
    if (two) ell(740, 1500, 260, 40, { fill: rgba('#FFF6D8', 0.25 + 0.3 * K2), stroke: null });
    // the first rises into its light
    const rise = easeOut(clamp(lt / 0.6));
    const drawTrophies = (refl) => {
      ctx.save();
      if (refl) { ctx.translate(0, 3000); ctx.scale(1, -1); ctx.globalAlpha *= 0.18; }
      starTrophy(360, 1500 + (1 - rise) * 260, 1.05, { alpha: rise, spin: Math.sin(t * 1.1) * 0.05, glow: refl ? 0 : 1 + 0.4 * P });
      if (two) {
        const k = clamp((t - T_TWO) / 0.14), s = lerp(2.4, 1, easeOut(k)) * 1.05;
        starTrophy(740, 1500, s, { alpha: clamp(k * 1.6), spin: Math.sin(t * 1.1 + 1) * 0.05, glow: refl ? 0 : 1 + 1.5 * K2 });
      }
      ctx.restore();
    };
    ctx.save(); ctx.beginPath(); ctx.rect(-100, 1500, W + 200, 500); ctx.clip(); drawTrophies(true); ctx.restore();
    drawTrophies(false);
    burst(t, T_TWO, 740, 1060, 110, { speed: 2200, life: 1.4 });
    ring(t, T_TWO, 740, 1060, 1100, '#FFFFFF', 0.6, 60);
    ring(t, T_OSCAR + 0.05, 360, 1060, 700, G.light, 0.6, 24);
    camEnd();
    sparkles(t, 30, 60, 760, 960, 800, G.hi);
    goldDust(t, 50, 0, 700, W, 1000, 5);
    speedLinesV(t, 740, 1060, 0.9 * K2, '#FFFFFF');
    captionShade(0.35, 180, 600);
    tagLine(t, T_OSCAR + 0.05, 43.64, '오스카 2회', { size: 130, y: 340, color: G.light });
    subLine(t, T_OSCAR + 0.35, 43.64, '스물두 살 · 역대 최연소', { y: 490, size: 52, color: ANI.white });
    flash(0.7 * kick(t, T_OSCAR, 0.2), '#FFF3C8');
    flash(0.8 * kick(t, T_TWO + 0.1, 0.4), '#FFF6D8');
    impact(t, T_TWO, 0.1);
  }

  // ---- 43.64 · the arena, and wildflowers -------------------------------------------------------

  const T_ARENA = 43.6364, T_STAMP = 45.4545;
  const FLOWER_COLS = ['#FFFFFF', '#FFE45C', '#FF8FB1', '#B79CFF', '#7FC8FF', '#FFB36B', '#FFFFFF', '#F7C6FF'];
  const FLOWERS = (() => {
    const list = [];
    const cols = 9, rows = 17;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = (i + 0.5 + (hash(i, j + 40) - 0.5) * 0.9) * (W / cols), y = (j + 0.5 + (hash(i, j + 41) - 0.5) * 0.9) * (H / rows);
      // leave an oval window around the stage and its tiny figure
      const e = Math.pow((x - 540) / 290, 2) + Math.pow((y - 1080) / 250, 2);
      if (e < 1) continue;
      list.push({ x, y, r: 40 + hash(i, j + 42) * 62 + (e < 1.8 ? -14 : 0), n: hash(i, j + 44) > 0.75 ? 13 : 5 + Math.floor(hash(i, j + 43) * 3), c: FLOWER_COLS[(i * 7 + j * 3) % FLOWER_COLS.length], d: Math.hypot(x - 540, y - 1080), seed: i * 31 + j });
    }
    return list.sort((a, b) => a.r - b.r);
  })();

  function arena(t, lt) {
    const P = pulse(t, 5), KS = kick(t, T_STAMP, 0.7);
    const [sx, sy] = shake(t, [[T_STAMP, 34, 0.6]]);
    const z = 1.0 + 0.16 * easeInOut(clamp(lt / 3.6)) - 0.06 * KS;
    scr(() => { ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#070718'], [0.4, '#1A1446'], [0.62, '#3A1A5A'], [1, '#0A0716']]); ctx.fillRect(0, 0, W, H); });
    camBegin(540 + sx, 1080 + sy - 120 * (1 - clamp(lt / 3.6)), z);
    // stars above the bowl
    for (let i = 0; i < 60; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); circle(hash(i, 50) * W, hash(i, 51) * 700 + 60, 1.5 + hash(i, 52) * 2.5, { fill: rgba('#FFFFFF', tw), stroke: null }); }
    // beams from the stage up into the sky
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.28 + Math.sin(t * 1.4 + i) * 0.1;
      beam(540, 1090, 540 + Math.cos(a) * 1600, 1090 + Math.sin(a) * 1600, 110, i % 2 ? '#B79CFF' : '#FFFFFF', 0.22 + 0.1 * P);
    }
    glow(540, 1090, 520, '#FFFFFF', 0.45 + 0.2 * P);
    // the bowl: rings of phone lights in perspective
    for (let r = 0; r < 9; r++) {
      const ry = 90 + r * 70, rx = 300 + r * 150, n = 60 + r * 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + hash(i, r) * 0.05; if (Math.sin(a) < -0.25) continue;
        const x = 540 + Math.cos(a) * rx, y = 1120 + Math.sin(a) * ry - (r * 30);
        const wave = pulse(t - r * 0.05, 4);
        ctx.fillStyle = (i + r) % 5 ? rgba('#FFFFFF', 0.55 + 0.45 * wave) : rgba(G.light, 0.8);
        ctx.beginPath(); ctx.arc(x, y, 2.5 + r * 0.7, 0, TAU); ctx.fill();
      }
    }
    // the stage and the tiny figure
    ell(540, 1110, 170, 34, { fill: '#2A1A40', stroke: null });
    ell(540, 1104, 150, 26, { fill: rgba('#FFF6D8', 0.55 + 0.2 * P), stroke: null });
    heroine(540, 1106, 0.17, { t, view: 'back', hair: BLACK_HAIR, pose: 'stand', wind: 0.4, rim: '#FFFFFF', rimK: 1 });
    glow(540, 1030, 160, '#FFFFFF', 0.3 + 0.2 * P);
    camEnd();
    // the crowd right in front of us: heads, shoulders and raised phones, in silhouette
    scr(() => {
      ctx.translate(sx * 0.4, sy * 0.4);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
        const x = (i + 0.5 + (hash(i, row + 80) - 0.5) * 0.5) * 128 - 30 + row * 60, y = 1560 + row * 150 + hash(i, row + 81) * 40;
        const s = 1 + row * 0.35, c = row ? '#07050E' : '#120C24', bob = -hop(t + i * 0.1) * 10;
        if (hash(i, row + 82) > 0.45) {
          const ax = x + (hash(i, row + 83) - 0.5) * 60, ay = y - 250 * s + bob;
          stroke([[x + 30 * s, y - 60 * s], [ax, ay]], c, 26 * s, { ink: null });
          rrect(ax - 14 * s, ay - 34 * s, 28 * s, 46 * s, 5, { fill: c, stroke: null });
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          circle(ax, ay - 22 * s, 7 * s, { fill: '#FFFFFF', stroke: null }); glow(ax, ay - 22 * s, 60 * s, '#FFFFFF', 0.4 * (0.6 + 0.4 * pulse(t, 4)));
          ctx.restore();
        }
        ell(x, y - 120 * s + bob, 48 * s, 56 * s, { fill: c, stroke: null });
        smooth([[x - 110 * s, y + 200], [x - 90 * s, y - 50 * s + bob], [x + 90 * s, y - 50 * s + bob], [x + 110 * s, y + 200]], { fill: c, stroke: null });
      }
    });
    // 45.45: the stamp. Wildflowers slam open across the whole screen, from the stage outwards.
    if (t >= T_STAMP) {
      scr(() => {
        ctx.translate(sx * 0.6, sy * 0.6);
        for (const f of FLOWERS) {
          const age = t - T_STAMP - f.d / 4200 + 0.03; if (age < 0) continue;
          const k = clamp(age / 0.2);
          leaf(f.x, f.y, f.r * 1.5 * backOut(k), f.seed * 2.1);
          if (f.seed % 3 === 0) leaf(f.x, f.y, f.r * 1.3 * backOut(k), f.seed * 2.1 + 2.4);
        }
        for (const f of FLOWERS) {
          const age = t - T_STAMP - f.d / 4200; if (age < 0) continue;
          const k = clamp(age / 0.22), s = backOut(k) * (1 + 0.04 * Math.sin(t * 2.4 + f.seed));
          const sway = Math.sin(t * 1.6 + f.seed * 0.7) * 0.12;
          wildflower(f.x + Math.sin(t * 1.3 + f.seed) * 4, f.y, f.r * s, { n: f.n, color: f.c, rot: f.seed + sway + (1 - k) * 1.2 });
        }
        petals(t, 30, 17, '#FFE3F0');
      });
      sparkles(t, 30, 0, 0, W, H, '#FFFFFF');
    }
    captionShade(0.4 + 0.2 * (t >= T_STAMP), 180, 620);
    tagLine(t, T_ARENA + 0.05, 47.4, '그리고 지금도', { size: 104, y: 330 });
    subLine(t, T_ARENA + 0.4, 47.4, '2026 그래미 올해의 노래 “Wildflower”', { y: 470, size: 48, color: G.hi });
    flash(0.6 * kick(t, T_ARENA, 0.2), '#FFFFFF');
    flash(0.75 * kick(t, T_STAMP, 0.25), '#FFFDF0');
    impact(t, T_STAMP, 0.07);
  }

  chapter('top', 32.73, 47.27, [[32.73, sweep], [36.36, quote], [40.0, oscars], [43.64, arena]]);
})();
