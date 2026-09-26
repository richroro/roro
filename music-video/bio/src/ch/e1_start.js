// e1_start (0 – 38.40): a lime waveform breathing in the dark turns into the title; Los Angeles at
// night, one small window lights up; inside it, the bunk-bed bedroom where the two faceless
// silhouettes make a song and the notes drift out of the window; then the laptop upload bar fills,
// the waveform bursts out of the screen and ▶ ▶ ▶ multiply with sparkles.
(() => {
  const B = SONG.beat;
  const LIME = BIO.lime, PINK = BIO.pink, INK = BIO.ink, BLUE = BIO.blue;
  const HAIR_BLUE = '#5B8CFF', HAIR_FIN = '#3a2a20';

  // ---- kit ----------------------------------------------------------------------------------------

  const screen = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };

  /** A glowing neon line along points (additive halo, then the tube, then a hot core). */
  function neonLine(pts, color, lw, a = 1, core = true) {
    if (a <= 0 || pts.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    stroke(pts, rgba(color, 0.10 * a), lw * 7, { ink: null });
    stroke(pts, rgba(color, 0.22 * a), lw * 3, { ink: null });
    ctx.restore();
    stroke(pts, rgba(color, a), lw, { ink: null });
    if (core) stroke(pts, rgba('#FFFFFF', 0.55 * a), Math.max(1.5, lw * 0.3), { ink: null });
  }

  /** The breathing waveform: points from x0 to x1 around y, amplitude amp. */
  function wavePts(t, x0, x1, y, amp, seed = 0, step = 8) {
    const pts = [];
    const n = Math.max(2, Math.round((x1 - x0) / step));
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = lerp(x0, x1, u);
      const env = Math.pow(Math.sin(Math.PI * u), 1.6);
      const v = Math.sin(u * 23 + t * 3.1 + seed) * 0.55 + Math.sin(u * 51 - t * 4.7 + seed * 2) * 0.3
        + Math.sin(u * 9 + t * 1.3) * 0.35;
      pts.push([x, y + amp * env * v]);
    }
    return pts;
  }

  /** An eighth note glyph. */
  function note(x, y, s, rot, color, a = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
    ell(0, 0, 22, 16, { fill: color, stroke: null }, -0.4);
    rrect(16, -86, 8, 86, 3, { fill: color, stroke: null });
    smooth([[20, -86], [52, -60], [46, -30], [40, -52], [22, -62]], { fill: color, stroke: null });
    ctx.restore();
  }

  /** A play triangle. */
  function playTri(x, y, r, color, a = 1, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
    poly([[-r * 0.55, -r * 0.8], [r * 0.85, 0], [-r * 0.55, r * 0.8]], { fill: color, stroke: null });
    ctx.restore();
  }

  /** Floating dust motes in screen space. */
  function motes(t, n, color, a = 0.5, seed = 7) {
    screen(() => {
      for (let i = 0; i < n; i++) {
        const sp = 12 + hash(i, seed) * 30;
        const x = (hash(i, seed + 1) * W + Math.sin(t * 0.4 + i) * 40 + W) % W;
        const y = ((hash(i, seed + 2) * H - t * sp) % H + H) % H;
        const r = 1.2 + hash(i, seed + 3) * 2.6;
        ctx.globalAlpha = a * (0.4 + 0.6 * Math.sin(t * (1 + hash(i, 4)) + i) ** 2);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    });
  }

  /** A palm tree silhouette: base (x, y), height h, sway. */
  function palm(x, y, h, t, seed, color) {
    const sw = Math.sin(t * 0.9 + seed) * 0.04;
    const bend = (hash(seed, 1) - 0.5) * 0.5;
    const top = [x + h * (bend + sw) * 0.5, y - h];
    const trunk = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      trunk.push([x + h * (bend + sw) * 0.5 * u * u, y - h * u]);
    }
    stroke(trunk, color, h * 0.035, { ink: null, smooth: true });
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.42 + Math.sin(t * 1.3 + i + seed) * 0.05;
      const L = h * (0.28 + hash(seed, i + 3) * 0.1);
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const u = k / 6, droop = u * u * L * 0.55;
        pts.push([top[0] + Math.cos(a) * L * u, top[1] + Math.sin(a) * L * u + droop]);
      }
      stroke(pts, color, h * 0.02 * 1.2, { ink: null, smooth: true });
      // leaflets
      for (let k = 1; k < 6; k++) {
        const [px, py] = pts[k], sgn = Math.cos(a) > 0 ? 1 : -1;
        stroke([[px, py], [px + sgn * 10 * (6 - k) * h / 600, py + 26 * h / 600]], color, 5, { ink: null });
      }
    }
    circle(top[0], top[1], h * 0.03, { fill: color, stroke: null });
  }

  // ---- 0.00 – 9.60 · the waveform becomes the title -----------------------------------------------

  function waveTitle(t, lt) {
    skyFill([[0, '#07050E'], [0.55, '#120A22'], [1, '#07050E']]);
    const fadeIn = ease(seg(t, 0, 1.4)) * (1 - ease(seg(t, 9.15, 9.55)));
    const T_COLLAPSE = 5.4, T_TITLE = 6.6;
    const breathe = 0.55 + 0.45 * Math.sin(t * TAU / 4.8 - Math.PI / 2);
    const p = pulse(t, 5);
    const collapse = easeInOut(seg(t, T_COLLAPSE, T_TITLE));
    const zoom = lerp(1.14, 1.0, easeOut(seg(t, 0, 7))) + p * 0.006;
    camBegin(W / 2, H / 2 + Math.sin(t * 0.5) * 10, zoom, Math.sin(t * 0.3) * 0.01);
    glow(W / 2, H / 2, 900, '#3A1260', 0.35 * fadeIn);
    const titleY = 470;
    const cy = lerp(H / 2, titleY + 118, collapse);
    // the wave: breathes, then collapses to a line and shrinks to the title's width
    const half = lerp(820, 640, collapse);
    const amp = (90 + 120 * breathe + 60 * p) * (1 - collapse) * fadeIn + (t > T_TITLE ? 10 * pulse(t, 4) : 0);
    // a hot-pink echo behind it
    for (let e = 3; e >= 1; e--) {
      neonLine(wavePts(t - 0.12 * e, W / 2 - half, W / 2 + half, cy + 4 * e, amp * (1 - 0.12 * e), 1.3 * e), e === 1 ? PINK : '#7A3CFF', 2.5, (0.4 - 0.08 * e) * fadeIn, false);
    }
    neonLine(wavePts(t, W / 2 - half, W / 2 + half, cy, amp, 0), LIME, 6, fadeIn);
    // a scanning dot rides the wave before it collapses
    if (collapse < 1) {
      const u = frac(t / 2.4), pts = wavePts(t, W / 2 - half, W / 2 + half, cy, amp, 0);
      const pt = pts[Math.floor(u * (pts.length - 1))];
      glow(pt[0], pt[1], 90, LIME, 0.8 * fadeIn * (1 - collapse));
      circle(pt[0], pt[1], 7, { fill: '#FFFFFF', stroke: null, alpha: fadeIn * (1 - collapse) });
    }
    // sparks flying off when it snaps into the title
    const age = t - T_TITLE;
    if (age > 0 && age < 1.4) {
      glow(W / 2, titleY, 700 * easeOut(clamp(age / 0.3)), LIME, 0.28 * (1 - age / 1.4));
      for (let i = 0; i < 40; i++) {
        const a = hash(i, 3) * TAU, v = 300 + hash(i, 4) * 900, k = easeOut(clamp(age / 1.4));
        const x = W / 2 + (hash(i, 5) - 0.5) * 1200 + Math.cos(a) * v * k * 0.6;
        const y = titleY + 118 + Math.sin(a) * v * k * 0.5 + 200 * k * k;
        sparkle(x, y, 10 * (1 - k) + 2, i % 3 ? LIME : PINK, age * 4 + i);
      }
    }
    camEnd();
    motes(t, 40, LIME, 0.25 * fadeIn, 3);
    const tk = seg(t, T_TITLE, T_TITLE + 3);
    const zt = 1 + 0.04 * tk;
    ctx.save(); ctx.translate(W / 2, titleY); ctx.scale(zt, zt); ctx.translate(-W / 2, -titleY);
    // the letters rise up out of the line
    const rise = easeOut(seg(t, T_TITLE, T_TITLE + 0.45));
    ctx.beginPath(); ctx.rect(0, titleY + 104 - 320 * rise, W, 320 * rise); ctx.clip();
    ctx.translate(0, (1 - rise) * 120);
    bigFact(t, T_TITLE, 9.45, 'BILLIE EILISH', W / 2, titleY, 180);
    ctx.restore();
    bigFact(t, 7.35, 9.45, '빌리 아일리시 · 커리어 연대기', W / 2, 670, 60, { color: LIME });
    flash(0.22 * Math.exp(-Math.max(0, age) * 8) * (age > 0 ? 1 : 0), '#EFFFD8');
  }

  // ---- 9.60 – 19.20 · Los Angeles at night, one window lights up ------------------------------------

  const HS = 1.5, HOUSE = [1236, 668], WIN = [1236, 668 - 86 * 1.5];                 // the window, world coords
  const T_WIN = 11.4;

  function winOn(t) {
    if (t < T_WIN) return 0;
    const a = t - T_WIN;
    if (a < 0.08) return 1; if (a < 0.16) return 0.15; if (a < 0.24) return 1; if (a < 0.3) return 0.4;
    return 1;
  }

  function hills(pts, color) { poly(pts, { fill: color, stroke: null }); }

  function laNight(t, lt, dur) {
    skyFill([[0, '#06040F'], [0.45, '#170B33'], [0.72, '#3B1250'], [0.86, '#5E1A55'], [1, '#12081E']]);
    const push = easeInOut(seg(t, 9.6, 18.3)), dive = easeIn(seg(t, 18.3, 19.2));
    const zoom = lerp(1.0, 1.32, push) * lerp(1, 6.5, dive);
    const aim = easeInOut(seg(t, 9.6, 19.2));
    const cx = lerp(W / 2, WIN[0], aim), cy = lerp(H / 2, WIN[1], aim);
    // parallax: the far layers move less
    const layer = (depth, fn) => {
      const z = 1 + (zoom - 1) * depth;
      camBegin(lerp(W / 2, cx, depth) + Math.sin(t * 0.35) * 14 * depth, lerp(H / 2, cy, depth), z);
      fn(); camEnd();
    };
    layer(0.15, () => {
      stars(t, 90, 21, 0.8, 520);
      glow(W * 0.5, 700, 1100, PINK, 0.18);
      // two searchlights sweeping the sky behind the hills
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const bx = i ? 1500 : 420, a = -Math.PI / 2 + Math.sin(t * 0.45 + i * 2.2) * 0.5;
        const L = 1400, w = 0.05;
        ctx.fillStyle = lgrad(bx, 640, bx + Math.cos(a) * L, 640 + Math.sin(a) * L, [[0, rgba(i ? LIME : PINK, 0.16)], [1, rgba(i ? LIME : PINK, 0)]]);
        ctx.beginPath(); ctx.moveTo(bx, 640);
        ctx.lineTo(bx + Math.cos(a - w) * L, 640 + Math.sin(a - w) * L); ctx.lineTo(bx + Math.cos(a + w) * L, 640 + Math.sin(a + w) * L);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    });
    // the city glow along the horizon, then the far hills with their lights
    layer(0.35, () => {
      hills([[-300, 700], [-300, 560], [150, 470], [420, 520], [700, 440], [980, 500], [1260, 430], [1600, 510], [1900, 460], [2300, 540], [2300, 700]], '#1E0F35');
      for (let i = 0; i < 140; i++) {
        const x = -200 + hash(i, 31) * 2300, base = 470 + Math.sin(x * 0.006) * 30;
        const y = base + 30 + hash(i, 32) * 170;
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i, 33) * 3) + i);
        const c = hash(i, 34) > 0.8 ? PINK : hash(i, 34) > 0.6 ? LIME : '#FFD89A';
        circle(x, y, 1.8 + hash(i, 35) * 2.2, { fill: c, stroke: null, alpha: 0.35 + 0.55 * tw });
      }
      // the grid of the sprawl below
      rrect(-300, 640, 2600, 100, 0, { fill: lgrad(0, 640, 0, 740, [[0, '#2A0F3A'], [1, '#12071F']]), stroke: null });
      for (let i = 0; i < 220; i++) {
        const x = -250 + hash(i, 41) * 2450, y = 648 + hash(i, 42) * 80;
        const c = hash(i, 43) > 0.85 ? PINK : '#FFC98A';
        circle(x, y, 1.4 + hash(i, 44) * 1.6, { fill: c, stroke: null, alpha: 0.4 + 0.5 * hash(i, 45) });
      }
      glow(W / 2, 660, 900, '#FF6FB5', 0.12 + 0.05 * pulse(t, 4));
    });
    // the near hill with the little house
    layer(1, () => {
      hills([[-400, 1200], [-400, 740], [300, 700], [800, 660], [1100, 640], [1400, 650], [1800, 700], [2400, 740], [2400, 1200]], '#0C0718');
      // house
      const [hx, hy] = HOUSE;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(HS, HS); ctx.translate(-hx, -hy);
      poly([[hx - 120, hy - 30], [hx - 120, hy - 100], [hx - 20, hy - 170], [hx + 90, hy - 100], [hx + 90, hy - 30], [hx + 110, hy - 10], [hx - 140, hy - 10]], { fill: '#150D24', stroke: null });
      rrect(hx + 40, hy - 170, 22, 50, 2, { fill: '#150D24', stroke: null });
      const on = winOn(t), wy = hy - 86;
      rrect(hx - 44, wy - 30, 88, 64, 3, { fill: mix('#1C1230', '#FFE3A0', on), stroke: null });
      if (on > 0) {
        glow(hx, wy, 200 + 24 * pulse(t, 4), '#FFC870', 0.55 * on);
        glow(hx, wy, 80, LIME, 0.3 * on);
      }
      stroke([[hx, wy - 30], [hx, wy + 34]], '#150D24', 5, { ink: null });
      stroke([[hx - 44, wy + 2], [hx + 44, wy + 2]], '#150D24', 5, { ink: null });
      ctx.restore();
      // other dark houses and a few lit ones far along the ridge
      for (let i = 0; i < 6; i++) {
        const x = 300 + i * 290 + (i > 2 ? 200 : 0), y = 700 + Math.sin(i * 1.7) * 18;
        if (Math.abs(x - hx) < 300) continue;
        poly([[x - 60, y], [x - 60, y - 50], [x, y - 90], [x + 60, y - 50], [x + 60, y]], { fill: '#120B20', stroke: null });
        if (hash(i, 51) > 0.5) rrect(x - 16, y - 44, 26, 20, 2, { fill: '#6A4A3A', stroke: null, alpha: 0.7 });
      }
    });
    // palms in the foreground, sliding past faster than everything
    layer(1.25, () => {
      palm(160, 1120, 760, t, 1, '#040209');
      palm(420, 1160, 560, t, 2, '#040209');
      palm(1780, 1120, 820, t, 3, '#040209');
      palm(1560, 1180, 480, t, 4, '#040209');
    });
    motes(t, 24, '#FFC98A', 0.2, 9);
    // the window takes the whole frame as we dive in
    if (dive > 0) fillScreen('#FFE0A0', easeIn(seg(t, 18.8, 19.2)) * 0.9);
    fillScreen('#07050E', 1 - ease(seg(t, 9.6, 10.1)));
    yearTag(t, 9.9, '2001');
    caption(t, 10.4, 18.9, '로스앤젤레스에서 태어나다', '2001년 12월 18일');
  }

  // ---- 19.20 – 28.80 · the bedroom studio -----------------------------------------------------------

  const ROOM = { floor: 800, win: [1000, 150, 300, 300] };
  const MIC = [1522, 392];
  const LAPTOP = [960, 560];

  function bunkBed(t) {
    const x0 = 90, x1 = 540, F = '#2A2044', D = '#1A1330';
    rrect(x0, 170, 26, ROOM.floor - 170, 6, { fill: F, stroke: null });
    rrect(x1 - 26, 170, 26, ROOM.floor - 170, 6, { fill: F, stroke: null });
    // top bunk
    rrect(x0 + 20, 330, x1 - x0 - 40, 34, 6, { fill: F, stroke: null });
    rrect(x0 + 26, 290, x1 - x0 - 52, 44, 12, { fill: '#3B2A63', stroke: null });
    smooth([[x0 + 180, 296], [x0 + 300, 280], [x1 - 40, 292], [x1 - 40, 330], [x0 + 180, 330]], { fill: '#6B2F6E', stroke: null });
    rrect(x0 + 40, 272, 110, 36, 16, { fill: '#8C7FB0', stroke: null });
    rrect(x0 + 20, 220, x1 - x0 - 40, 14, 6, { fill: F, stroke: null });
    // bottom bunk
    rrect(x0 + 20, 640, x1 - x0 - 40, 34, 6, { fill: F, stroke: null });
    rrect(x0 + 26, 600, x1 - x0 - 52, 44, 12, { fill: '#2E3F7A', stroke: null });
    smooth([[x0 + 200, 604], [x1 - 40, 598], [x1 - 40, 640], [x0 + 200, 640]], { fill: '#23305E', stroke: null });
    rrect(x0 + 40, 582, 110, 34, 16, { fill: '#7B8CC0', stroke: null });
    // ladder
    for (let i = 0; i < 5; i++) rrect(x1 - 20, 380 + i * 50, 70, 10, 4, { fill: D, stroke: null });
    rrect(x1 + 40, 330, 14, ROOM.floor - 330, 5, { fill: F, stroke: null });
    // a string of tiny lights along the top rail, twinkling on the beat
    for (let i = 0; i < 9; i++) {
      const x = x0 + 20 + i * 50, y = 236 + Math.sin(i * 0.7) * 8;
      const c = i % 2 ? PINK : LIME, a = 0.5 + 0.5 * pulse(t + i * 0.3 * B, 4);
      glow(x, y, 26, c, 0.5 * a);
      circle(x, y, 5, { fill: c, stroke: null, alpha: 0.6 + 0.4 * a });
    }
  }

  function roomWindow(t) {
    const [x, y, w, h] = ROOM.win;
    rrect(x - 16, y - 16, w + 32, h + 32, 8, { fill: '#2A2044', stroke: null });
    rrect(x, y, w, h, 4, { fill: lgrad(0, y, 0, y + h, [[0, '#0A0720'], [0.7, '#2A0E44'], [1, '#521A52']]), stroke: null });
    ctx.save(); rrectPath(x, y, w, h, 4); ctx.clip();
    for (let i = 0; i < 18; i++) circle(x + hash(i, 61) * w, y + hash(i, 62) * h * 0.6, 1.5 + hash(i, 63) * 1.5, { fill: '#FFFFFF', stroke: null, alpha: 0.4 + 0.4 * Math.sin(t * 2 + i) });
    poly([[x, y + h], [x, y + h - 40], [x + 80, y + h - 70], [x + 170, y + h - 50], [x + w, y + h - 90], [x + w, y + h]], { fill: '#150A26', stroke: null });
    for (let i = 0; i < 20; i++) circle(x + hash(i, 64) * w, y + h - 20 - hash(i, 65) * 40, 1.5, { fill: '#FFC98A', stroke: null, alpha: 0.7 });
    ctx.restore();
    stroke([[x + w / 2, y], [x + w / 2, y + h]], '#2A2044', 12, { ink: null });
    stroke([[x, y + h / 2], [x + w, y + h / 2]], '#2A2044', 12, { ink: null });
    rrect(x - 30, y + h + 10, w + 60, 18, 6, { fill: '#2A2044', stroke: null });
  }

  function desk(t) {
    const top = 600, x0 = 720, x1 = 1190, F = '#231A3A';
    // the laptop's lid, back to us, spilling light
    const [lx, ly] = LAPTOP, bp = pulse(t, 5);
    glow(lx, ly - 70, 300, '#9FC4FF', 0.35 + 0.1 * bp);
    glow(lx, ly - 70, 140, LIME, 0.12 + 0.08 * bp);
    rrect(x0, top, x1 - x0, 26, 6, { fill: F, stroke: null });
    rrect(x0 + 20, top + 26, 22, ROOM.floor - top - 26, 4, { fill: F, stroke: null });
    rrect(x1 - 42, top + 26, 22, ROOM.floor - top - 26, 4, { fill: F, stroke: null });
    poly([[lx - 84, ly + 40], [lx + 84, ly + 40], [lx + 76, ly - 60], [lx - 76, ly - 60]], { fill: '#1C1728', stroke: null });
    stroke([[lx - 76, ly - 60], [lx + 76, ly - 60]], '#CFE0FF', 3, { ink: null, alpha: 0.9 });
    stroke([[lx - 84, ly + 40], [lx - 76, ly - 60]], '#8FB4FF', 2, { ink: null, alpha: 0.6 });
    stroke([[lx + 84, ly + 40], [lx + 76, ly - 60]], '#8FB4FF', 2, { ink: null, alpha: 0.6 });
    // a small keyboard with lit keys
    rrect(x0 + 10, top - 22, 170, 22, 4, { fill: '#15121E', stroke: null });
    for (let i = 0; i < 12; i++) {
      const hit = beatN(t) % 12 === i ? pulse(t, 6) : 0;
      rrect(x0 + 16 + i * 13.5, top - 18, 11, 14, 2, { fill: mix('#DAD6E8', LIME, hit), stroke: null });
    }
    // headphones hanging off the corner
    ctx.save(); ctx.translate(x1 - 30, top + 30);
    stroke([[-26, 0], [-30, 40], [0, 60], [30, 40], [26, 0]], '#0E0B14', 8, { ink: null, smooth: true });
    rrect(-38, 30, 20, 34, 8, { fill: PINK, stroke: null, alpha: 0.8 });
    rrect(18, 30, 20, 34, 8, { fill: PINK, stroke: null, alpha: 0.8 });
    ctx.restore();
  }

  function micStand(t, x, y) {
    const S = '#3A3350';
    stroke([[x - 60, ROOM.floor + 6], [x + 40, ROOM.floor - 30], [x + 110, ROOM.floor + 6]], S, 7, { ink: null });
    stroke([[x + 40, ROOM.floor - 30], [x + 40, y + 120], [x + 4, y + 30]], S, 7, { ink: null });
    // the studio mic with a thin lime rim that throbs on the beat
    const p = pulse(t, 5);
    glow(x, y, 90, LIME, 0.25 + 0.3 * p);
    rrect(x - 17, y - 38, 34, 76, 17, { fill: '#1A1724', stroke: mix('#5A5470', LIME, 0.5 + 0.5 * p), lw: 3 });
    for (let i = 0; i < 4; i++) stroke([[x - 12, y - 24 + i * 11], [x + 12, y - 24 + i * 11]], '#5A5470', 2, { ink: null });
  }

  function bedroom(t, lt, dur) {
    const zoom = lerp(1.9, 1.0, easeInOut(seg(t, 19.2, 21.8))) + 0.03 * seg(t, 21.8, 28.8);
    const [wx, wy] = [ROOM.win[0] + ROOM.win[2] / 2, ROOM.win[1] + ROOM.win[3] / 2];
    const k = easeInOut(seg(t, 19.2, 21.8));
    camBegin(lerp(wx, W / 2 + 40, k) + Math.sin(t * 0.4) * 12, lerp(wy, H / 2 - 20, k), zoom, Math.sin(t * 0.3) * 0.006);
    // walls and floor
    rrect(-600, -400, 3100, ROOM.floor + 400, 0, { fill: lgrad(0, 0, 0, ROOM.floor, [[0, '#140E26'], [1, '#2A1C48']]), stroke: null });
    rrect(-600, ROOM.floor, 3100, 700, 0, { fill: lgrad(0, ROOM.floor, 0, ROOM.floor + 300, [[0, '#1E1534'], [1, '#0E0A18']]), stroke: null });
    glow(1480, 360, 600, BLUE, 0.22 + 0.08 * pulse(t, 4));
    roomWindow(t);
    bunkBed(t);
    // a rug
    ell(1180, ROOM.floor + 40, 480, 40, { fill: '#3A1E4E', stroke: null, alpha: 0.8 });
    // Finneas behind the desk, lit by the laptop
    const bob = hop(t) * 5;
    silhouette(LAPTOP[0], ROOM.floor - 4 + bob, 0.84, { t, hair: HAIR_FIN, glow: '#8FB4FF' });
    desk(t);
    // Billie at the mic
    silhouette(1500, ROOM.floor + 4 - hop(t + 0.3) * 4, 0.88, { t, hair: HAIR_BLUE, pose: 'mic', glow: BLUE });
    micStand(t, MIC[0], MIC[1]);
    // the notes drift from the mic and the laptop out through the window
    const [x, y, w, h] = ROOM.win;
    for (let i = 0; i < 16; i++) {
      const ts = 19.9 + i * B, age = t - ts, life = 3.0;
      if (age < 0 || age > life) continue;
      const u = age / life, src = i % 2 ? MIC : [LAPTOP[0], LAPTOP[1] - 140];
      const tx = x + w * (0.3 + 0.4 * hash(i, 71)), ty = y + h * 0.4;
      const px = lerp(src[0], tx, easeInOut(u)) + Math.sin(age * 3 + i) * 30;
      const py = lerp(src[1], ty, easeOut(u)) - Math.sin(Math.PI * u) * 160;
      const col = i % 3 === 0 ? PINK : LIME;
      const s = lerp(1.2, 0.35, u) * (1 + 0.15 * pulse(t, 5));
      glow(px, py - 30, 70 * s, col, 0.4 * (1 - u));
      note(px, py, s, Math.sin(age * 2 + i) * 0.3, col, clamp(age / 0.2) * (1 - ease(seg(u, 0.8, 1))));
    }
    camEnd();
    motes(t, 30, '#CFE0FF', 0.22, 12);
    fillScreen('#FFE0A0', 0.85 * (1 - easeOut(seg(t, 19.2, 19.6))));
    // the first frames of the upload shot are a push into the laptop
    caption(t, 19.7, 28.6, '오빠 피니어스와 침실에서 만든 노래', '작사·작곡·프로듀싱을 함께하는 남매');
  }

  // ---- 28.80 – 38.40 · the upload, and it spreads --------------------------------------------------

  const SCR = { x: 470, y: 150, w: 1300, h: 620 };
  const SC = [SCR.x + SCR.w / 2, SCR.y + SCR.h / 2];
  const T_DONE = 31.2, T_OUT = 32.4;

  function barsPts(n) { return Array.from({ length: n }, (_, i) => 0.2 + 0.8 * Math.abs(Math.sin(i * 0.61) * Math.sin(i * 0.23 + 1) + 0.25 * Math.sin(i * 1.7))); }
  const BARS = barsPts(64);

  function upload(t, lt, dur) {
    skyFill([[0, '#05040B'], [1, '#0E0A1C']]);
    const zoom = kf(t, [[28.8, 1.08], [31.2, 1.0], [34.2, 0.66], [38.4, 0.6]], easeInOut);
    const sh = shakeXY(t, T_DONE, 16, 0.4);
    camBegin(SC[0] - 100 * (2 - zoom) + sh[0] + Math.sin(t * 0.5) * 10, SC[1] + 30 * (zoom - 0.6) / 0.4 + sh[1], zoom, Math.sin(t * 0.4) * 0.008);
    const spread = seg(t, T_DONE, T_DONE + 2.2);
    // rings rolling out from the screen on every beat after the upload
    if (t > T_DONE) {
      for (let i = 0; i < 12; i++) {
        const ts = T_DONE + i * B, age = t - ts;
        if (age < 0 || age > 2.4) continue;
        const r = 200 + age * 900;
        ctx.save(); ctx.globalAlpha = 0.45 * (1 - age / 2.4);
        ellPath(SC[0], SC[1], r * 1.4, r); ctx.strokeStyle = i % 2 ? PINK : BLUE; ctx.lineWidth = 6; ctx.stroke();
        ctx.restore();
      }
      // the waveform escaping the screen, sideways across the whole world
      const reach = 650 + easeOut(spread) * 2200;
      const amp = 120 + 90 * pulse(t, 5);
      neonLine(wavePts(t * 1.4, SC[0] - reach, SC[0] + reach, SC[1] + 30, amp * 1.4, 5, 10), BLUE, 5, 0.8 * spread, false);
      neonLine(wavePts(t * 1.2, SC[0] - reach, SC[0] + reach, SC[1] + 30, amp, 1, 10), LIME, 7, spread);
    }
    // laptop body
    const bx = SCR.x - 60, by = SCR.y - 50, bw = SCR.w + 120, bh = SCR.h + 100;
    rrect(bx, by, bw, bh, 30, { fill: '#17141F', stroke: '#2E2A3A', lw: 4 });
    poly([[bx - 120, by + bh + 4], [bx + bw + 120, by + bh + 4], [bx + bw + 40, by + bh + 90], [bx - 40, by + bh + 90]], { fill: '#211D2C', stroke: null });
    rrect(bx - 120, by + bh - 4, bw + 240, 14, 6, { fill: '#2B2638', stroke: null });
    // screen
    ctx.save(); rrectPath(SCR.x, SCR.y, SCR.w, SCR.h, 10); ctx.clip();
    ctx.fillStyle = lgrad(0, SCR.y, 0, SCR.y + SCR.h, [[0, '#101329'], [1, '#1A1030']]);
    ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    const done = t >= T_DONE;
    // track title and a big waveform thumbnail
    ctx.font = `64px ${FONT.round}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('Ocean Eyes', SCR.x + 170, SCR.y + 90);
    // the play button next to it: waits, then plays
    const pb = done ? 1 + 0.12 * pulse(t, 6) : 1;
    circle(SCR.x + 100, SCR.y + 90, 44 * pb, { fill: done ? LIME : '#3A3550', stroke: null });
    playTri(SCR.x + 104, SCR.y + 90, 22 * pb, done ? INK : '#8C86A6');
    const wx0 = SCR.x + 70, ww = SCR.w - 140, wy = SCR.y + 260;
    const played = done ? clamp((t - T_DONE) / 6) : 0;
    for (let i = 0; i < BARS.length; i++) {
      const x = wx0 + (i + 0.5) * ww / BARS.length;
      const on = i / BARS.length < played;
      const hgt = BARS[i] * 150 * (done && on ? 1 + 0.25 * pulse(t + i * 0.02, 5) : 1);
      rrect(x - 7, wy - hgt / 2, 14, hgt, 7, { fill: on ? LIME : done ? '#5B5575' : '#3A3550', stroke: null });
    }
    if (done) { stroke([[wx0 + ww * played, wy - 120], [wx0 + ww * played, wy + 120]], PINK, 5, { ink: null }); }
    // the upload bar
    const up = easeInOut(seg(t, 29.2, T_DONE));
    const pbY = SCR.y + 430;
    if (!done || t < T_DONE + 1) {
      const fade = done ? 1 - seg(t, T_DONE + 0.4, T_DONE + 1) : 1;
      ctx.save(); ctx.globalAlpha *= fade;
      rrect(wx0, pbY - 16, ww, 32, 16, { fill: '#2A2640', stroke: null });
      rrect(wx0, pbY - 16, Math.max(32, ww * up), 32, 16, { fill: lgrad(wx0, 0, wx0 + ww, 0, [[0, BLUE], [1, LIME]]), stroke: null });
      glow(wx0 + ww * up, pbY, 80, LIME, 0.6);
      // the upload arrow bouncing on the beat
      const ay = pbY - 80 - hop(t) * 18;
      poly([[wx0 + ww / 2 - 30, ay], [wx0 + ww / 2, ay - 40], [wx0 + ww / 2 + 30, ay]], { fill: done ? LIME : '#FFFFFF', stroke: null });
      rrect(wx0 + ww / 2 - 10, ay, 20, 34, 4, { fill: done ? LIME : '#FFFFFF', stroke: null });
      ctx.restore();
    }
    // after it's out: the row of plays, ▶ ▶ ▶, growing faster and faster and wrapping
    if (done) {
      const n = Math.floor(Math.pow(Math.max(0, t - T_DONE - 0.3) / 0.3, 1.6));
      const perRow = 16, rows = Math.ceil(n / perRow);
      const scroll = Math.max(0, rows - 2) * 56;
      for (let i = 0; i < Math.min(n, 400); i++) {
        const r = Math.floor(i / perRow), c = i % perRow;
        const y = pbY - 30 + r * 56 - scroll;
        if (y < wy + 140 || y > SCR.y + SCR.h + 20) continue;
        const x = wx0 + 20 + c * (ww - 40) / (perRow - 1);
        playTri(x, y, 22, (i + r) % 5 === 0 ? PINK : LIME, 0.9);
      }
    }
    ctx.restore();
    // screen glow on the world
    glow(SC[0], SC[1], 900, done ? LIME : BLUE, done ? 0.1 + 0.12 * pulse(t, 5) : 0.08);
    // the ▶ swarm and sparkles flying out of the screen, more and more of them
    if (t > T_OUT) {
      const N = 340;
      for (let i = 0; i < N; i++) {
        const ts = T_OUT + 5.6 * Math.sqrt(i / N), age = t - ts, life = 1.8;
        if (age < 0 || age > life) continue;
        const a = hash(i, 81) * TAU, v = 500 + hash(i, 82) * 1300, u = age / life;
        const x = SC[0] + Math.cos(a) * (120 + v * easeOut(u)) * 1.3, y = SC[1] + Math.sin(a) * (80 + v * easeOut(u)) * 0.8;
        const s = (22 + hash(i, 83) * 46) * (0.6 + u) * (1 + 0.25 * pulse(t, 6));
        const col = hash(i, 84) > 0.7 ? PINK : hash(i, 84) > 0.45 ? '#FFFFFF' : LIME;
        if (hash(i, 85) > 0.35) playTri(x, y, s, col, (1 - u) * clamp(age / 0.1), 0);
        else sparkle(x, y, s * 0.9, col, age * 3);
      }
    }
    // the play counter above the laptop: ▶ after ▶ after ▶, the pill stretching and throbbing
    if (t > T_OUT - 0.3) {
      const k = easeOut(seg(t, T_OUT - 0.3, T_OUT + 0.3)), p = pulse(t, 6);
      const n = Math.min(9, 1 + Math.floor((t - T_OUT) / B));
      const cw = 96, pw = 170 + n * cw, px = SC[0], py = SCR.y - 190;
      ctx.save(); ctx.translate(px, py); ctx.scale(k * (1 + 0.06 * p), k * (1 + 0.06 * p));
      glow(0, 0, pw * 0.7, LIME, 0.25 + 0.25 * p);
      rrect(-pw / 2, -70, pw, 140, 70, { fill: '#0E0B14', stroke: LIME, lw: 6 });
      for (let i = 0; i < n; i++) {
        const age = t - (T_OUT + i * B), pop = backOut(clamp(age / 0.25));
        playTri(-pw / 2 + 110 + i * cw, 0, 38 * pop, i % 3 === 2 ? PINK : LIME);
      }
      ctx.restore();
      for (let i = 0; i < 14; i++) {
        const ph = frac(t * 0.9 + hash(i, 91)), a = hash(i, 92) * TAU;
        sparkle(px + Math.cos(a) * (pw * 0.5 + 40 + ph * 160), py + Math.sin(a) * (80 + ph * 110), 22 * (1 - ph), i % 2 ? '#FFFFFF' : LIME, ph * 3);
      }
    }
    camEnd();
    flash(0.35 * Math.exp(-Math.max(0, t - T_DONE) * 7) * (t >= T_DONE ? 1 : 0), '#F2FFE0');
    // hand over to the blue room of the next chapter
    fillScreen('#0A1433', ease(seg(t, 37.9, 38.4)));
    yearTag(t, 29.0, '2015');
    caption(t, 29.4, 38.2, '“Ocean Eyes” 공개, 입소문을 타다', '2015년 11월 18일 · 열세 살');
  }

  chapter('start', 0, 38.4, [[0, waveTitle], [9.6, laNight], [19.2, bedroom], [28.8, upload]]);
})();
