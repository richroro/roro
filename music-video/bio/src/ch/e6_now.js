// e6_now (139.20 – 172.20): the last chorus goes up a key and the picture bursts open: bright
// sea and a flock of birds (2024); a dotted globe with the tour route drawn across it; one
// golden gramophone with wildflowers blooming around it (2026); a cinema, a 3D screen and a big
// pair of 3D glasses; and the lime waveform from the opening, fading out under the last words.
(() => {
  const T_SEA = 139.2, T_GLOBE = 148.8, T_FLOWER = 158.4, T_CINEMA = 163.2, T_END = 168.0, T_OUT = 172.2;
  const GOLD = { hi: '#FFF3C4', light: '#FFD96A', mid: '#F0AE2E', dark: '#A8700E', edge: '#6E480A' };
  const D2R = Math.PI / 180;

  const scr = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };
  /** A decaying 0..1 kick after t0. */
  const kick = (t, t0, len = 0.5) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));

  // ---- 139.20 sea and birds ---------------------------------------------------------------------

  /** A gull-like bird in flight: (x, y) body, s scale, ph wing phase (cycles). */
  function bird(x, y, s, ph, color, rot = 0) {
    const f = Math.sin(ph * TAU);
    const tipY = -f * 22, midY = 4 - f * 6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-40, tipY - 4);
    ctx.quadraticCurveTo(-22, midY - 16, -3, 2);
    ctx.quadraticCurveTo(0, 6, 3, 2);
    ctx.quadraticCurveTo(22, midY - 16, 40, tipY - 4);
    ctx.quadraticCurveTo(22, midY - 6, 3, 8);
    ctx.quadraticCurveTo(0, 11, -3, 8);
    ctx.quadraticCurveTo(-22, midY - 6, -40, tipY - 4);
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  function softCloud(x, y, s, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    for (const [px, py, r] of [[-120, 10, 60], [-50, -20, 85], [40, -12, 75], [115, 12, 55], [0, 20, 70]]) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
    ctx.fillStyle = lgrad(0, -100, 0, 80, [[0, '#FFFFFF'], [1, '#D7ECFF']]); ctx.fill();
    ctx.restore();
  }

  function sea(t, lt, dur) {
    const hit = kick(t, 141.6, 0.6), boom = kick(t, T_SEA, 0.8);
    const [sx, sy] = shakeXY(t, T_SEA, 22, 0.5), [hx, hy] = shakeXY(t, 141.6, 12, 0.4);
    const zoom = lerp(1.12, 1.0, easeOut(seg(t, T_SEA, 141.0))) + 0.02 * hit;
    camBegin(960 + sx + hx + lt * 6, 540 + sy + hy - lt * 4, zoom, 0);
    const HZ = 640;
    // sky
    rrect(-300, -300, 2520, HZ + 300, 0, { fill: lgrad(0, -300, 0, HZ, [[0, '#123FB8'], [0.45, '#2E78E8'], [0.85, '#8CCBFF'], [1, '#DDF1FF']]), stroke: null });
    // sun, low on the right
    glow(1460, 560, 700, '#FFF1C8', 0.55 + 0.25 * hit + 0.3 * boom);
    circle(1460, 560, 64, { fill: '#FFFBEA', stroke: null });
    for (let i = 0; i < 4; i++) {
      const x = ((hash(i, 51) * 2600 + t * (14 + i * 6)) % 2600) - 400;
      softCloud(x, 420 + hash(i, 52) * 130, 0.45 + hash(i, 53) * 0.5, 0.5 + 0.3 * hash(i, 54));
    }
    // sea
    rrect(-300, HZ, 2520, 800, 0, { fill: lgrad(0, HZ, 0, 1380, [[0, '#4C9AF0'], [0.25, '#1F66D0'], [1, '#08307E']]), stroke: null });
    rrect(-300, HZ - 2, 2520, 5, 0, { fill: rgba('#FFFFFF', 0.7), stroke: null });
    // the sun's path on the water
    for (let i = 0; i < 60; i++) {
      const v = hash(i, 61), y = HZ + 6 + Math.pow(v, 1.5) * 460;
      const spread = 30 + (y - HZ) * 0.5, x = 1460 + (hash(i, 62) - 0.5) * 2 * spread;
      const on = 0.5 + 0.5 * Math.sin(t * (3 + hash(i, 63) * 4) + i);
      const w = (8 + (y - HZ) * 0.14) * (0.5 + on);
      rrect(x - w / 2, y, w, 3 + (y - HZ) * 0.01, 2, { fill: rgba('#FFF6DA', (0.35 + 0.5 * on) * (0.6 + 0.4 * pulse(t, 4))), stroke: null });
    }
    // wave lines, wider apart as they come closer
    for (let j = 0; j < 16; j++) {
      const k = j / 15, y = HZ + 12 + Math.pow(k, 1.7) * 460, sc = 0.3 + k * 1.8;
      for (let i = 0; i < 9; i++) {
        const x = ((hash(i, j + 70) * 2600 - t * (20 + 40 * k)) % 2600 + 2600) % 2600 - 300;
        const len = (60 + hash(i, j + 90) * 120) * sc;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y - 8 * sc, x + len, y);
        ctx.strokeStyle = rgba('#CFE8FF', 0.35 * (0.4 + 0.6 * k)); ctx.lineWidth = 2 + 2.5 * k; ctx.lineCap = 'round'; ctx.stroke();
      }
    }

    // the flock: bursts out of the centre on the key change, gathers, swoops on the hit
    const C = [900 + lt * 42, 440 - lt * 10];
    const spread = kf(lt, [[0, 0], [0.7, 1.35], [2.2, 1]], easeOut);
    const N = 54;
    const order = [];
    for (let i = 0; i < N; i++) order.push([hash(i, 3), i]);
    order.sort((a, b) => a[0] - b[0]);
    for (const [depth, i] of order) {
      const ang = hash(i, 1) * TAU, rr = Math.sqrt(hash(i, 2));
      const ox = Math.cos(ang) * rr * 620, oy = Math.sin(ang) * rr * 250;
      const s = 0.55 + depth * 1.4;
      const swoop = t >= 141.6 ? Math.sin(clamp((t - 141.6 - (ox + 620) / 2400) / 0.9) * Math.PI) * 90 : 0;
      const x = C[0] + ox * spread + Math.sin(t * 0.8 + i) * 18;
      const y = C[1] + oy * spread + Math.cos(t * 0.9 + i * 1.3) * 12 + swoop * (0.6 + depth * 0.6);
      const ph = beatOf(t) * 0.9 + hash(i, 4);
      const col = depth < 0.35 ? '#1A3F8E' : '#FFFFFF';
      if (depth >= 0.35) bird(x + 4, y + 6, s, ph, 'rgba(10,30,90,0.25)', -0.05);
      bird(x, y, s, ph, col, Math.sin(t + i) * 0.08);
    }
    // on the hit, a few big birds sweep right past the camera
    if (t >= 141.3 && t < 143.4) {
      for (let i = 0; i < 4; i++) {
        const q = seg(t, 141.3 + i * 0.12, 142.8 + i * 0.12);
        if (q <= 0 || q >= 1) continue;
        const x = lerp(-300, 2200, easeInOut(q)), y = 260 + i * 150 + Math.sin(q * Math.PI) * -120;
        bird(x, y, 3.4 - i * 0.5, beatOf(t) * 1.2 + i * 0.3, '#FFFFFF', -0.15 + q * 0.2);
      }
    }
    // spray of light on the hit
    if (t >= 141.6 && t < 142.6) {
      const a = t - 141.6;
      for (let i = 0; i < 14; i++) {
        const q = a / 1.0, ang = -Math.PI * hash(i, 81);
        sparkle(1460 + Math.cos(ang) * 400 * easeOut(q), 560 + Math.sin(ang) * 260 * easeOut(q), 22 * (1 - q), '#FFFFFF', q * 3);
      }
    }
    camEnd();

    // the burst on the key change: white, a ring, speed lines
    flash(0.95 * kick(t, T_SEA, 0.35), '#FFFFFF');
    if (lt < 1.2) {
      scr(() => {
        const q = easeOut(lt / 1.2);
        ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 30 * (1 - q) + 2;
        ctx.beginPath(); ctx.arc(960, 480, 60 + q * 1100, 0, TAU); ctx.stroke();
      });
      speedLines(t, 960, 480, 1 - lt / 1.2, '#FFFFFF');
    }
    flash(0.35 * kick(t, 141.6, 0.25), '#FFFFFF');

    yearTag(t, 139.8, '2024');
    caption(t, 140.4, T_GLOBE - 0.05, '세 번째 정규 앨범 〈Hit Me Hard and Soft〉', '2024년 5월 · “Birds of a Feather”');
  }

  // ---- 148.80 the globe and the tour route ------------------------------------------------------

  const LAND = [
    [[-168, 65], [-140, 70], [-95, 72], [-80, 63], [-60, 55], [-65, 45], [-80, 32], [-81, 25], [-97, 26], [-97, 18], [-88, 15], [-83, 9], [-78, 8], [-90, 14], [-105, 20], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
    [[-50, 60], [-20, 70], [-20, 80], [-60, 82], [-72, 76]],
    [[-80, 10], [-60, 11], [-50, 0], [-35, -7], [-40, -22], [-55, -35], [-68, -55], [-75, -50], [-72, -20], [-81, -5]],
    [[-10, 36], [-9, 43], [0, 50], [5, 54], [10, 58], [5, 62], [15, 69], [30, 71], [40, 66], [40, 45], [28, 41], [20, 40], [15, 45], [12, 38], [0, 38]],
    [[-6, 50], [1, 51], [-2, 56], [-5, 58], [-6, 55]],
    [[-17, 15], [-17, 21], [-10, 30], [-5, 36], [10, 37], [32, 31], [43, 12], [51, 12], [40, -15], [32, -28], [20, -35], [12, -17], [9, 4], [-8, 5]],
    [[40, 45], [40, 66], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [160, 60], [142, 50], [130, 42], [122, 40], [121, 30], [110, 20], [106, 10], [100, 14], [98, 8], [92, 22], [80, 15], [77, 8], [72, 21], [60, 25], [55, 27], [50, 30], [44, 13], [35, 30], [36, 37], [28, 41]],
    [[130, 31], [141, 36], [142, 43], [140, 41], [135, 34]],
    [[95, 5], [105, -6], [120, -9], [140, -8], [130, 0], [118, 5], [100, 0]],
    [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [132, -32], [115, -34]],
    [[172, -34], [178, -38], [168, -46], [172, -41]],
  ];
  const inPoly = (x, y, P) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const vec = (lon, lat) => [Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)];
  // land dots on an even grid (a constant table, the same for every frame)
  const DOTS = [];
  for (let lat = -58; lat <= 82; lat += 2.6) {
    const n = Math.round(140 * Math.cos(lat * D2R));
    for (let i = 0; i < n; i++) {
      const lon = -180 + (i + 0.5) * 360 / n;
      if (LAND.some(P => inPoly(lon, lat, P))) DOTS.push(vec(lon, lat));
    }
  }
  // an illustrative route (no names): North America, across the Pacific, Europe, and home
  const STOPS = [[-71, 47], [-79, 44], [-88, 42], [-122, 38], [-118, 34], [151, -34], [145, -38], [0, 52], [5, 52], [13, 52], [2, 49], [-74, 41], [-118, 34]];
  const LEGS = [[0.5, 0.9], [0.9, 1.3], [1.3, 1.8], [1.8, 2.3], [2.4, 3.6], [3.6, 4.0], [4.2, 5.6], [5.6, 6.0], [6.0, 6.4], [6.4, 6.8], [7.0, 8.2], [8.2, 8.9]];
  const unwrapped = (() => {
    const out = [STOPS[0][0]];
    for (let i = 1; i < STOPS.length; i++) {
      let l = STOPS[i][0];
      while (l > out[i - 1] + 5) l -= 360;
      out.push(l);
    }
    return out;
  })();
  const SV = STOPS.map(([lo, la]) => vec(lo, la));

  function globe(t, lt, dur) {
    skyFill([[0, '#050B24'], [0.6, '#0B1A46'], [1, '#12245A']]);
    stars(t, 90, 17, 0.7, H);
    const hit = kick(t, 151.2, 0.5), clink = kick(t, 153.0, 0.4);
    // where the route head is, for the camera
    let head = 0; // fractional stop index
    for (let i = 0; i < LEGS.length; i++) if (lt >= LEGS[i][0]) head = i + easeInOut(seg(lt, LEGS[i][0], LEGS[i][1]));
    const hi = Math.min(Math.floor(head), STOPS.length - 2), hk = head - hi;
    const hLon = lerp(unwrapped[hi], unwrapped[hi + 1], hk), hLat = lerp(STOPS[hi][1], STOPS[hi + 1][1], hk);
    const lon0 = (hLon + 25 - 18 * Math.sin(lt * 0.3)) * D2R, lat0 = clamp(hLat * 0.55 + 8, -20, 35) * D2R;
    const cl = Math.cos(lon0), sl = Math.sin(lon0), cp = Math.cos(lat0), sp = Math.sin(lat0);
    const rot = v => {
      const x = v[0] * cl - v[2] * sl, z1 = v[2] * cl + v[0] * sl;
      return [x, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
    };
    const intro = easeOut(seg(t, T_GLOBE, T_GLOBE + 0.9));
    const cx = 1200, cy = 440, R = (330 + 30 * hit) * lerp(0.7, 1, intro) * (1 + 0.004 * Math.sin(t * 2));
    const P = (v, lift = 0) => { const r = rot(v); return [cx + R * r[0] * (1 + lift), cy - R * r[1] * (1 + lift), r[2], r]; };

    ctx.save(); ctx.globalAlpha *= intro;
    // atmosphere and the sphere
    glow(cx, cy, R * 1.6, '#4FA0FF', 0.35 + 0.3 * hit);
    circle(cx, cy, R, { fill: rgrad(cx - R * 0.35, cy - R * 0.4, R * 0.1, R * 1.1, [[0, '#2A6AE0'], [0.6, '#123C9A'], [1, '#081F5C']]), stroke: null });
    // graticule
    ctx.save(); ctx.strokeStyle = rgba('#8FD3FF', 0.13); ctx.lineWidth = 1.5;
    for (let m = -180; m < 180; m += 30) {
      ctx.beginPath(); let pen = false;
      for (let la = -90; la <= 90; la += 6) {
        const [x, y, z] = P(vec(m, la));
        if (z > 0) { if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.stroke();
    }
    for (let la = -60; la <= 60; la += 30) {
      ctx.beginPath(); let pen = false;
      for (let m = -180; m <= 180; m += 6) {
        const [x, y, z] = P(vec(m, la));
        if (z > 0) { if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.stroke();
    }
    ctx.restore();
    // land dots
    const ds = R * 0.0125;
    for (const v of DOTS) {
      const r = rot(v);
      if (r[2] <= 0.02) continue;
      ctx.fillStyle = rgba('#BFE6FF', 0.25 + 0.65 * r[2]);
      ctx.fillRect(cx + R * r[0] - ds, cy - R * r[1] - ds, ds * 2, ds * 2);
    }
    // rim light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    circle(cx, cy, R, { fill: rgrad(cx, cy, R * 0.8, R, [[0, 'rgba(120,190,255,0)'], [1, 'rgba(120,190,255,0.35)']]), stroke: null });
    ctx.restore();

    // the route
    const drawLeg = (i, upto) => {
      const a = SV[i], b = SV[i + 1];
      const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), om = Math.acos(dot);
      const lift = 0.02 + 0.09 * om / Math.PI, n = Math.max(6, Math.ceil(om * 40));
      const pts = [];
      for (let k = 0; k <= n * upto; k++) {
        const s = Math.min(k / n, upto), so = Math.sin(om) || 1;
        const w0 = Math.sin((1 - s) * om) / so, w1 = Math.sin(s * om) / so;
        const v = [a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1];
        pts.push(P(v, lift * Math.sin(Math.PI * s)));
      }
      const last = P((() => {
        const s = upto, so = Math.sin(om) || 1, w0 = Math.sin((1 - s) * om) / so, w1 = Math.sin(s * om) / so;
        return [a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1];
      })(), lift * Math.sin(Math.PI * upto));
      pts.push(last);
      for (let k = 1; k < pts.length; k++) {
        const [x0, y0, z0] = pts[k - 1], [x1, y1, z1] = pts[k];
        const behind = z0 < 0;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(BIO.lime, behind ? 0.08 : 0.25); ctx.lineWidth = 14; ctx.stroke();
        ctx.strokeStyle = rgba(BIO.lime, behind ? 0.25 : 1); ctx.lineWidth = 4.5; ctx.stroke();
      }
      return last;
    };
    let headPt = null;
    for (let i = 0; i < LEGS.length; i++) {
      const u = easeInOut(seg(lt, LEGS[i][0], LEGS[i][1]));
      if (u <= 0) break;
      headPt = drawLeg(i, u);
    }
    // stops: a pink dot once reached, with a ring as it lands
    for (let i = 0; i < STOPS.length; i++) {
      const reachT = i === 0 ? LEGS[0][0] : LEGS[i - 1][1];
      if (lt < reachT) continue;
      const [x, y, z] = P(SV[i]);
      if (z <= 0) continue;
      const a = lt - reachT;
      if (a < 0.8) { ctx.save(); ctx.globalAlpha *= 1 - a / 0.8; circle(x, y, 8 + a * 50, { fill: null, stroke: BIO.pink, lw: 3 }); ctx.restore(); }
      circle(x, y, 7 + 2 * pulse(t, 5), { fill: BIO.pink, stroke: '#FFFFFF', lw: 2.5 });
    }
    if (headPt && lt < 8.95) {
      const [x, y] = headPt;
      glow(x, y, 60, BIO.lime, 0.6);
      circle(x, y, 7, { fill: '#FFFFFF', stroke: null });
    }
    // the hit: a ripple off the globe
    if (t >= 151.2 && t < 152.4) {
      const q = (t - 151.2) / 1.2;
      ctx.save(); ctx.globalAlpha *= 1 - q;
      circle(cx, cy, R * (1 + q * 0.7), { fill: null, stroke: BIO.lime, lw: 8 * (1 - q) + 1 });
      ctx.restore();
    }
    if (clink > 0.01 && headPt) sparkle(headPt[0], headPt[1] - 20, 40 * clink, '#FFFFFF', t * 3);
    ctx.restore();

    caption(t, 149.4, T_FLOWER - 0.05, '〈Hit Me Hard and Soft〉 월드 투어', '2024년 9월 – 2025년 11월');
  }

  // ---- 158.40 the gramophone and the wildflowers ------------------------------------------------

  /** A golden gramophone trophy. (x, y) = bottom of the base; ~430 tall at s = 1. */
  function gramophone(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const G = (x0, x1, st) => lgrad(x0, 0, x1, 0, st);
    const band = [[0, GOLD.dark], [0.35, GOLD.light], [0.55, GOLD.hi], [0.75, GOLD.mid], [1, GOLD.dark]];
    rrect(-125, -66, 250, 66, 10, { fill: G(-125, 125, band), stroke: GOLD.edge, lw: 3 });
    rrect(-104, -98, 208, 36, 8, { fill: G(-104, 104, band), stroke: GOLD.edge, lw: 3 });
    rrect(-96, -40, 192, 6, 3, { fill: rgba(GOLD.edge, 0.4), stroke: null });
    // the disc
    ell(0, -104, 112, 20, { fill: GOLD.mid, stroke: GOLD.edge, lw: 3 });
    ell(0, -108, 92, 15, { fill: lgrad(-92, 0, 92, 0, [[0, GOLD.dark], [0.5, GOLD.light], [1, GOLD.dark]]), stroke: null });
    ell(0, -108, 14, 4, { fill: GOLD.hi, stroke: null });
    // tone arm up to the horn
    stroke([[78, -106], [70, -168], [30, -214], [6, -236]], GOLD.mid, 12, { ink: GOLD.edge, olw: 5, smooth: true });
    circle(78, -106, 11, { fill: GOLD.light, stroke: GOLD.edge, lw: 3 });
    // the horn: a flare from the neck to a wide bell facing up and to the right
    const N = [6, -236], B = [120, -412], d = [B[0] - N[0], B[1] - N[1]], L = Math.hypot(d[0], d[1]);
    const u = [d[0] / L, d[1] / L], p = [-u[1], u[0]], Rb = 128, nw = 12;
    const e1 = [B[0] + p[0] * Rb, B[1] + p[1] * Rb], e2 = [B[0] - p[0] * Rb, B[1] - p[1] * Rb];
    const c1 = [N[0] + u[0] * L * 0.78 + p[0] * nw * 1.4, N[1] + u[1] * L * 0.78 + p[1] * nw * 1.4];
    const c2 = [N[0] + u[0] * L * 0.78 - p[0] * nw * 1.4, N[1] + u[1] * L * 0.78 - p[1] * nw * 1.4];
    ctx.beginPath();
    ctx.moveTo(N[0] + p[0] * nw, N[1] + p[1] * nw);
    ctx.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]);
    ctx.lineTo(e2[0], e2[1]);
    ctx.quadraticCurveTo(c2[0], c2[1], N[0] - p[0] * nw, N[1] - p[1] * nw);
    ctx.closePath();
    paint({ fill: lgrad(e2[0], e2[1], e1[0], e1[1], [[0, GOLD.dark], [0.3, GOLD.mid], [0.6, GOLD.hi], [0.8, GOLD.light], [1, GOLD.dark]]), stroke: GOLD.edge, lw: 3 });
    const ang = Math.atan2(p[1], p[0]);
    ell(B[0], B[1], Rb, Rb * 0.36, { fill: rgrad(B[0] - u[0] * 20, B[1] - u[1] * 20, 4, Rb, [[0, '#4A2C04'], [0.6, GOLD.dark], [1, GOLD.light]]), stroke: GOLD.hi, lw: 6 }, ang);
    // a glint running up the horn
    if (o.glint > 0 && o.glint < 1) {
      const g = o.glint, q = [lerp(N[0], B[0], g), lerp(N[1], B[1], g)];
      sparkle(q[0] + p[0] * lerp(nw, Rb, g * g) * 0.4, q[1] + p[1] * lerp(nw, Rb, g * g) * 0.4, 30, '#FFFFFF', g * 4);
    }
    ctx.restore();
    return [x + B[0] * s, y + B[1] * s];
  }

  const FLOWER_COLS = ['#FFFFFF', '#FFC9DE', '#D8C8FF', '#FFE58A', '#FF9E9E', '#BFE9FF'];

  function flower(x, y, h, grow, open, col, seed, t) {
    if (grow <= 0) return;
    const sway = Math.sin(t * 1.3 + seed) * h * 0.06;
    const tx = x + sway * grow, ty = y - h * easeOut(grow);
    stroke([[x, y], [x + sway * 0.3, y - h * 0.5 * grow], [tx, ty]], '#3F8F4E', 3 + h * 0.012, { ink: null, smooth: true });
    if (grow > 0.5) {
      const lk = (grow - 0.5) * 2;
      ell(x + h * 0.08 * lk, y - h * 0.35, h * 0.09 * lk, h * 0.035 * lk, { fill: '#4FA85E', stroke: null }, -0.5);
    }
    if (open <= 0) return;
    const o = backOut(clamp(open)), pr = (8 + h * 0.1) * o, n = 5 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + seed + t * 0.2;
      ell(tx + Math.cos(a) * pr * 0.75, ty + Math.sin(a) * pr * 0.75, pr * 0.8, pr * 0.42, { fill: col, stroke: null }, a);
    }
    circle(tx, ty, pr * 0.34, { fill: '#FFB53D', stroke: null });
  }

  function wildflower(t, lt, dur) {
    const k = easeInOut(seg(t, T_FLOWER, T_CINEMA));
    camBegin(960, lerp(560, 540, k), lerp(1.0, 1.08, k), 0);
    rrect(-300, -300, 2520, 1120, 0, { fill: lgrad(0, -300, 0, 800, [[0, '#0B2430'], [0.45, '#1D5058'], [0.8, '#D99A5C'], [1, '#F6D49A']]), stroke: null });
    glow(960, 700, 900, '#FFD08A', 0.45);
    // far hills and the meadow
    smooth([[-300, 780], [200, 700], [700, 740], [1200, 690], [1700, 730], [2220, 700], [2220, 1400], [-300, 1400]], { fill: '#2E5A3E', stroke: null });
    smooth([[-300, 820], [400, 770], [960, 790], [1500, 765], [2220, 800], [2220, 1400], [-300, 1400]], { fill: lgrad(0, 760, 0, 1100, [[0, '#23503A'], [1, '#0E2A1E']]), stroke: null });

    // flowers behind the trophy
    const FL = 64, drawFlowers = back => {
      for (let i = 0; i < FL; i++) {
        const fx = 180 + hash(i, 11) * 1560, depth = hash(i, 12);
        const isBack = depth < 0.45;
        if (isBack !== back) continue;
        const fy = 790 + depth * 250, h = 60 + depth * 170;
        const dist = Math.abs(fx - 960) / 800;
        const t0 = 158.7 + dist * 2.2 + hash(i, 13) * 0.35;
        flower(fx, fy, h, seg(t, t0, t0 + 0.55), seg(t, t0 + 0.4, t0 + 0.85), FLOWER_COLS[i % FLOWER_COLS.length], i, t);
      }
    };
    drawFlowers(true);
    // the trophy
    const rise = easeOut(seg(t, T_FLOWER, T_FLOWER + 0.7));
    glow(960, 560, 420, '#FFE08A', 0.35 + 0.15 * pulse(t, 4));
    ell(960, 812, 170, 22, { fill: 'rgba(10,30,20,0.45)', stroke: null });
    const bell = gramophone(960, 812 + (1 - rise) * 60, 1.2, { glint: seg(t, 159.6, 160.6) });
    // petals streaming out of the horn like music
    for (let i = 0; i < 24; i++) {
      const born = 159.0 + i * 0.16;
      const a = t - born;
      if (a < 0 || a > 3.2) continue;
      const q = a / 3.2;
      const x = bell[0] + 40 + a * (120 + hash(i, 21) * 160) + Math.sin(a * 3 + i) * 30;
      const y = bell[1] - 30 - a * (70 + hash(i, 22) * 90) + a * a * 10;
      ctx.save(); ctx.globalAlpha *= Math.sin(Math.PI * q); ctx.translate(x, y); ctx.rotate(a * 3 + i);
      ell(0, 0, 13, 7, { fill: FLOWER_COLS[i % FLOWER_COLS.length], stroke: null });
      ctx.restore();
    }
    drawFlowers(false);
    camEnd();
    flash(0.5 * kick(t, T_FLOWER, 0.3), '#FFF1C8');

    yearTag(t, 158.8, '2026');
    caption(t, 159.2, T_CINEMA - 0.05, '그래미 올해의 노래 · “Wildflower”', '2026년 2월 · 세 번째 올해의 노래상');
  }

  // ---- 163.20 3D cinema -------------------------------------------------------------------------

  const SCR = { x: 300, y: 70, w: 1320, h: 590 };

  function concert(t, d) {
    const { x: X, y: Y, w: Wd, h: Hd } = SCR;
    ctx.save(); rrectPath(X, Y, Wd, Hd, 6); ctx.clip();
    rrect(X, Y, Wd, Hd, 0, { fill: lgrad(0, Y, 0, Y + Hd, [[0, '#12071F'], [1, '#3A1240']]), stroke: null });
    // beams
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const bx = X + 140 + i * 210, sw = Math.sin(t * 1.4 + i * 1.1) * 0.35;
      const c = i % 3 === 0 ? BIO.lime : i % 3 === 1 ? BIO.pink : '#FFFFFF';
      const ex = bx + Math.sin(sw) * 520, ey = Y + Hd;
      poly([[bx - 8, Y], [bx + 8, Y], [ex + 90, ey], [ex - 90, ey]], { fill: lgrad(0, Y, 0, ey, [[0, rgba(c, 0.35 + 0.25 * pulse(t, 5))], [1, rgba(c, 0)]]), stroke: null });
    }
    ctx.restore();
    // the stage and the singer, with the red/cyan fringes of an unfused 3D image
    rrect(X, Y + Hd - 80, Wd, 80, 0, { fill: '#0A0510', stroke: null });
    const sing = (dx, body, hair, a) => {
      silhouette(960 + dx, Y + Hd - 70, 0.8, { t, pose: 'mic', body, hair, alpha: a });
      for (let i = 0; i < 16; i++) {
        const hx = X + 30 + i * 85 + dx * 1.6, hy = Y + Hd + 6 - hop(t + i * 0.13) * 8;
        const cc = dx === 0 ? '#2A1838' : body;
        circle(hx, hy - 20, 34, { fill: cc, stroke: null, alpha: a });
        if (i % 3 === 1) stroke([[hx + 18, hy - 40], [hx + 34, hy - 110 - hop(t + i * 0.2) * 16]], cc, 16, { ink: null, alpha: a });
      }
    };
    if (d > 0.5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      sing(-d, '#FF2448', '#FF2448', 0.75);
      sing(d, '#18D8FF', '#18D8FF', 0.75);
      ctx.restore();
    }
    glow(960, Y + 250, 260, BIO.pink, 0.25);
    sing(0, '#07040C', '#1A1320', 1);
    // crowd lights
    for (let i = 0; i < 30; i++) {
      const lx = X + 20 + hash(i, 91) * (Wd - 40), ly = Y + Hd - 40 - hash(i, 92) * 60 - hop(t + i * 0.1) * 6;
      circle(lx, ly, 4, { fill: i % 2 ? BIO.lime : '#FFFFFF', stroke: null });
    }
    ctx.restore();
  }

  function cinemaRoom(t, d) {
    skyFill([[0, '#0A0610'], [1, '#140B18']]);
    glow(960, 360, 1100, '#6A4AA0', 0.25);
    // screen frame and the screen
    rrect(SCR.x - 18, SCR.y - 18, SCR.w + 36, SCR.h + 36, 10, { fill: '#050308', stroke: null });
    concert(t, d);
    // light spill on the room
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    poly([[SCR.x, SCR.y + SCR.h], [SCR.x + SCR.w, SCR.y + SCR.h], [SCR.x + SCR.w + 300, H], [SCR.x - 300, H]], { fill: lgrad(0, SCR.y + SCR.h, 0, H, [[0, 'rgba(160,110,220,0.18)'], [1, 'rgba(160,110,220,0)']]), stroke: null });
    ctx.restore();
    // two rows of seats and heads, seen from behind
    for (let row = 0; row < 2; row++) {
      const y = row ? 900 : 770, s = row ? 1.25 : 0.9, n = row ? 8 : 11;
      for (let i = 0; i < n; i++) {
        const x = (i + (row ? 0.3 : 0.75)) * (W / n) - 40 + Math.sin(i * 7.3) * 20;
        if (hash(i, row + 40) > 0.18) {
          const hy = y - 40 * s - hop(t + i * 0.17) * 6 * s;
          circle(x, hy, 44 * s, { fill: '#0A060E', stroke: null });
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.arc(x, hy, 44 * s, Math.PI * 1.15, Math.PI * 1.85);
          ctx.strokeStyle = 'rgba(190,150,255,0.35)'; ctx.lineWidth = 4 * s; ctx.stroke();
          ctx.restore();
          stroke([[x - 44 * s, hy - 4 * s], [x - 20 * s, hy - 8 * s]], i % 2 ? '#FF3A5A' : '#3AD8FF', 4 * s, { ink: null, alpha: 0.8 });
        }
        rrect(x - 78 * s, y, 156 * s, 220 * s, 34 * s, { fill: row ? '#1B0F20' : '#170C1C', stroke: null });
        rrect(x - 78 * s, y, 156 * s, 12 * s, 6 * s, { fill: 'rgba(170,120,220,0.18)', stroke: null });
      }
    }
  }

  function cinema(t, lt, dur) {
    // the picture on the screen is doubled red/cyan until the glasses land, then it snaps sharp
    const snap = easeInOut(seg(lt, 0.95, 1.5));
    const d = (16 + 5 * Math.sin(t * 2.2)) * (1 - snap);
    const drift = seg(t, T_CINEMA, T_END);
    camBegin(960, 520 - drift * 20, 1.0 + drift * 0.05 + 0.015 * kick(t, T_CINEMA + 1.2, 0.4), 0);
    cinemaRoom(t, d);
    if (snap > 0 && lt < 2.2) {
      ctx.save(); ctx.globalAlpha = 0.35 * (1 - seg(lt, 1.2, 2.2));
      rrect(SCR.x, SCR.y, SCR.w, SCR.h, 6, { fill: '#FFFFFF', stroke: null });
      ctx.restore();
    }
    camEnd();
    // the 3D glasses fly in and settle in the front row, bottom right
    const fly = easeOut(seg(lt, 0.2, 1.1));
    const gx = lerp(2300, 1450, fly), gy = lerp(1250, 800, fly) + Math.sin(t * 1.6) * 5 - backOut(fly) * 0 ;
    const gs = 0.66 * (1 + seg(lt, 1.1, 4.8) * 0.06), grot = lerp(-0.6, -0.1, fly) + Math.sin(t * 1.1) * 0.015;
    const lens = [[-295, 0, '#FF2E4E'], [295, 0, '#22D6FF']];
    const LW = 500, LH = 290;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(grot); ctx.scale(gs, gs);
    // temples reaching back
    for (const side of [-1, 1]) stroke([[side * 570, -80], [side * 700, -150]], '#F2ECE0', 26, { ink: BIO.ink, olw: 6 });
    for (const [lx, ly, c] of lens) {
      rrect(lx - LW / 2, ly - LH / 2, LW, LH, 70, { fill: rgba(c, 0.42), stroke: null });
      ctx.save(); rrectPath(lx - LW / 2, ly - LH / 2, LW, LH, 70); ctx.clip();
      poly([[lx - 140, ly + 200], [lx - 80, ly + 200], [lx + 40, ly - 200], [lx - 20, ly - 200]], { fill: 'rgba(255,255,255,0.22)', stroke: null });
      poly([[lx - 40, ly + 200], [lx - 20, ly + 200], [lx + 100, ly - 200], [lx + 80, ly - 200]], { fill: 'rgba(255,255,255,0.14)', stroke: null });
      ctx.restore();
    }
    // the cardboard frame
    ctx.beginPath();
    ctx.roundRect(-600, -LH / 2 - 44, 1200, LH + 88, 90);
    for (const [lx, ly] of lens) ctx.roundRect(lx - LW / 2, ly - LH / 2, LW, LH, 70);
    ctx.fillStyle = '#F2ECE0'; ctx.fill('evenodd');
    ctx.strokeStyle = BIO.ink; ctx.lineWidth = 6; ctx.stroke();
    // nose notch
    ctx.beginPath(); ctx.moveTo(-50, LH / 2 + 46); ctx.quadraticCurveTo(0, LH / 2 - 30, 50, LH / 2 + 46); ctx.closePath();
    ctx.fillStyle = BIO.ink; ctx.fill();
    ctx.restore();

    fillScreen('#000000', 0.8 * seg(t, 167.5, T_END));
    caption(t, 163.8, T_END - 0.05, '투어 실황 3D 영화 개봉', '2026년 5월 · 제임스 캐머런과 공동 연출');
  }

  // ---- 168.00 back to the waveform --------------------------------------------------------------

  function ending(t, lt, dur) {
    fillScreen(BIO.ink);
    const fade = 1 - seg(t, 170.2, 171.6);
    const amp = 150 * (1 - 0.85 * seg(t, 168.4, 171.4)) * (0.75 + 0.25 * Math.sin(t * 2.6));
    const reach = easeOut(seg(t, T_END, 168.7));
    const cy = 600, half = 760 * reach;
    if (fade > 0 && half > 1) {
      const pts = [];
      for (let x = -half; x <= half; x += 8) {
        const u = x / 760, env = Math.pow(Math.cos(u * Math.PI / 2), 2);
        const y = cy + amp * env * (0.6 * Math.sin(x * 0.021 - t * 5) + 0.4 * Math.sin(x * 0.047 + t * 3.1)) * Math.sin(x * 0.006 + 1.3 + t * 0.4);
        pts.push([960 + x, y]);
      }
      glow(960, cy, 700, BIO.lime, 0.12 * fade);
      stroke(pts, rgba(BIO.lime, 0.18 * fade), 26, { ink: null });
      stroke(pts, BIO.lime, 6, { ink: null, alpha: fade });
    }
    bigFact(t, 168.4, 171.6, '이야기는 계속된다', 960, 400, 110);
    const ck = Math.min(clamp((t - 169.0) / 0.6), clamp((171.6 - t) / 0.5));
    if (ck > 0) letter('영상·음악 · Claude Code 로 만들었어요 (원곡 미사용)', 960, 960, 34, '#CFC8DE', { font: 'round', lw: 0, shadow: null, alpha: ck });
  }

  chapter('now', T_SEA, T_OUT, [[T_SEA, sea], [T_GLOBE, globe], [T_FLOWER, wildflower], [T_CINEMA, cinema], [T_END, ending]]);
})();
