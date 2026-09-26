// src/ch/c2_lunch.js — chapter 2 · 점심 (29.09 – 50.91)
// Bell → 1·2·3 → hallway stampede → cafeteria jump → textbook doodle → rooftop spin → sunset walk.
(() => {
  const S = {
    bell: 29.09, count: bt(17), dash: bt(18), caf: bt(20), doodle: bt(22), roof: bt(24), walk: bt(26), end: 50.91,
  };
  const B = SONG.beat;

  // ---- private helpers ---------------------------------------------------------------------------

  const hitK = (t, t0, len = 0.35) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  function slamS(t, t0) {
    if (t < t0 - 0.1) return 0;
    if (t < t0) return lerp(2.6, 1, easeIn(seg(t, t0 - 0.1, t0)));
    const a = t - t0;
    return 1 + Math.sin(a * 36) * 0.13 * Math.exp(-a * 8);
  }
  function puff(x, y, r, age, life = 0.5, color = '#FFFFFF', seed = 0, a = 0.85) {
    if (age < 0 || age > life) return;
    const k = age / life;
    smooth(blobPts(x, y - k * r * 0.6, r * (0.5 + k * 0.9), 8, 0.2, seed), { fill: color, stroke: null, alpha: a * (1 - k) });
  }
  function frontRun(t, seed = 0) {
    const ph = (beatOf(t) + seed * 0.37) * Math.PI * 2, s = Math.sin(ph);
    return {
      aL: 0.55 + s * 0.5, aR: 0.55 - s * 0.5, eL: 1.5, eR: 1.5,
      lL: 0.12 + Math.max(0, s) * 0.25, lR: 0.12 + Math.max(0, -s) * 0.25,
      kL: Math.max(0, s) * 1.1, kR: Math.max(0, -s) * 1.1, dy: Math.abs(s) * 22, rot: s * 0.04,
    };
  }
  // the old-fashioned school bell on the wall
  function schoolBell(x, y, s, ring) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-20, -130, 40, 50, 8, { fill: '#9AA3B5', lw: 5 });
    ctx.rotate(ring * 0.25);
    ell(0, 0, 110, 110, { fill: '#E8B83A', lw: 7 });
    ell(-30, -30, 40, 30, { fill: rgba('#FFFFFF', 0.4), stroke: null }, -0.6);
    circle(0, 0, 18, { fill: '#8A6A20', lw: 5 });
    ctx.restore();
    // the clapper beating the dome
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const hx = Math.sin(ring * 3) * 40;
    stroke([[0, 0], [hx, 110]], '#5B6378', 10, { olw: 8 });
    circle(hx, 124, 20, { fill: '#5B6378', lw: 5 });
    ctx.restore();
  }
  // a classmate: one of the friends' builds in a different blazer, for crowds
  const extraCols = ['#3E4E7A', '#4A5A8A', '#34406E', '#56629A'];
  function extra(x, y, s, i, t, o = {}) {
    kid(x, y, s, { who: i % 2 ? 'pony' : 'glasses', col: extraCols[i % 4], t, blush: 0.3, ...o });
  }

  // ---- 29.09 the bell: 12:30 --------------------------------------------------------------------

  function bell(t, lt, dur) {
    const syl = [0, 1, 2, 3].map(i => sylT(16, i));      // 종 울 린 다
    const pull = easeInOut(seg(t, S.bell + 0.2, S.bell + 1.2));
    const z = lerp(1.55, 1.0, pull), cx = lerp(930, 960, pull), cy = lerp(300, 540, pull);
    fillScreen('#FFF1D6');
    camBegin(cx + Math.sin(t * 2) * 6, cy, z);
    // wall and floor
    rrect(-200, -200, W + 400, 900, 0, { fill: '#FFF1D6', stroke: null });
    rrect(-200, 560, W + 400, 30, 0, { fill: '#E6CFA2', stroke: null });
    rrect(-200, 700, W + 400, 600, 0, { fill: PAL.floor, lw: 6 });
    // a window of noon light
    rrect(1450, 90, 380, 330, 10, { fill: '#9FDCFF', lw: 7 });
    cloud(1640, 240, 0.5); stroke([[1640, 90], [1640, 420]], '#FFFFFF', 8, { olw: 6 });
    // the clock, ticking onto half past twelve
    const mm = t < S.bell + 0.05 ? 29 : 30;
    const jolt = hitK(t, S.bell + 0.05, 0.3);
    ctx.save(); ctx.translate(760, 270); ctx.scale(1 + jolt * 0.1, 1 + jolt * 0.1);
    wallClock(0, 0, 175, 12, mm);
    ctx.restore();
    // the bell rings on every syllable
    let ring = 0;
    for (const s of syl) if (t >= s) ring = Math.sin((t - s) * 50) * Math.exp(-(t - s) * 5);
    schoolBell(1190, 280, 0.95, ring);
    ['딩', '동', '댕', '동'].forEach((w, i) => {
      const side = i % 2 ? 1 : -1;
      sfx(w, 1190 + side * (190 + i * 12), 170 - i * 18, 90, i % 2 ? PAL.pink : PAL.gold, t - syl[i], { life: 0.9, rot: side * 0.15 });
    });
    // the back row
    for (let i = 0; i < 5; i++) {
      const x = 280 + i * 340;
      extra(x, 800, 0.58, i, t, { sit: true, eyes: 'wide', mouth: 'o', dy: Math.sin(t * 40 + i) * 1.5 });
      desk(x, 850, 0.66);
    }
    // the front row: frozen, eyes gleaming
    const gleam = seg(t, S.bell + 1.25, S.bell + 1.45);
    const friends = [['pony', 560], ['me', 960], ['glasses', 1360]];
    friends.forEach(([who, x], i) => {
      kid(x, 1030, 0.95, {
        who, t, sit: true, eyes: gleam > 0 ? 'star' : 'wide', mouth: gleam > 0 ? 'grin' : 'flat', blush: true,
        lookX: gleam > 0 ? 0.9 : 0, dy: Math.sin(t * 50 + i * 2) * 1.5, aL: 0.5, aR: 0.5, eL: -1.1, eR: -1.1,
      });
      desk(x, 1150, 1.12, { books: i === 1 });
      if (gleam > 0) for (const sd of [-1, 1]) { sparkle(x + sd * 150, 700 - sd * 30, 30 * backOut(gleam) + pulse(t, 5) * 10, PAL.gold, t * 3); sparkle(x + sd * 120, 640, 14 * backOut(gleam), '#FFFFFF', t * 3); }
    });
    camEnd();
    flash(1 - ease(seg(t, S.bell, S.bell + 0.4)), '#FFFFFF');
  }

  // ---- 30.91 하나, 둘, 셋 ------------------------------------------------------------------------

  function countdown(t, lt, dur) {
    const hits = [S.count, S.count + B, S.count + 2 * B];
    const n = hits.filter(h => t >= h - 0.02).length;
    const go = S.count + 3.2 * B;
    const [sx, sy] = hits.reduce((a, h) => { const s = shakeXY(t, h, 22, 0.3); return [a[0] + s[0], a[1] + s[1]]; }, [0, 0]);
    fillScreen('#FFE27A');
    sunburst(960, 380, '#FFD34D', '#FFE9A0', t * 0.2 + n * 0.3, 20);
    camBegin(W / 2 + sx, H / 2 + sy, 1 + 0.03 * n + hitK(t, hits[n - 1] ?? 99, 0.2) * 0.04);
    // the track under their feet
    rrect(-100, 870, W + 200, 400, 0, { fill: '#6FE3C8', lw: 6 });
    stroke([[-100, 960], [W + 100, 960]], '#FFFFFF', 8, { ink: null, alpha: 0.7 });
    stroke([[1700, 875], [1700, 1080]], '#FFFFFF', 14, { ink: null });
    // 1 · 2 · 3
    const cols = ['#FF6F91', '#4E8EF7', '#FF9A3D'];
    hits.forEach((h, i) => {
      const s = slamS(t, h);
      if (s <= 0) return;
      ctx.save(); ctx.translate(520 + i * 440, 330); ctx.scale(s, s); ctx.rotate((i - 1) * 0.08);
      letter(String(i + 1), 0, 0, 400, cols[i], { lw: 36 });
      ctx.restore();
    });
    // three friends crouching lower on each count, then gone
    const launch = seg(t, go, go + 0.35);
    [['pony', 480], ['me', 850], ['glasses', 1220]].forEach(([who, x], i) => {
      const c = n / 3, trem = n === 3 ? Math.sin(t * 70 + i) * 3 : 0;
      const pose = {
        rot: 0.12 + c * 0.35, sq: c * 0.14, lL: 0.3 + c * 0.4, lR: 0.2 + c * 0.2, kL: c * 0.9, kR: c * 1.2,
        aL: 0.4 + c * 0.6, aR: 0.2, eL: 0.3, eR: 0.3, turn: 0.7, lookX: 1,
        eyes: n === 3 ? 'determined' : 'open', mouth: n === 3 ? 'flat' : 'o', blush: true,
      };
      if (launch > 0) { pose.walk = beatOf(t) * 1.4; pose.run = true; pose.rot = 0.3; pose.sq = -0.1; }
      kid(x + trem + easeIn(launch) * 1700, 960, 1.0, { who, t, ...pose, bag: who === 'me' });
      if (launch > 0) for (let k = 0; k < 3; k++) puff(x - 60 + k * 50, 950, 70, t - go - k * 0.04, 0.7, '#FFFFFF', i * 5 + k);
    });
    camEnd();
    streaks(t, launch * 1.4, '#FFFFFF', 11);
  }

  // ---- 32.73 the corridor stampede --------------------------------------------------------------

  const VP = [960, 420];
  const P = (X, Y, z) => [VP[0] + X / z, VP[1] + Y / z];
  function quad(X0, Y0, z0, X1, Y1, z1, o, vertical) {
    // a rectangle on a wall (vertical: X fixed, spans Y and z) or on the floor/ceiling (Y fixed)
    const pts = vertical
      ? [P(X0, Y0, z0), P(X0, Y1, z0), P(X0, Y1, z1), P(X0, Y0, z1)]
      : [P(X0, Y0, z0), P(X1, Y0, z0), P(X1, Y0, z1), P(X0, Y0, z1)];
    poly(pts, o);
  }

  function dash(t, lt, dur) {
    const HW = 1200, FL = 700, CE = -820, ZF = 14;
    const run = t - S.dash, v = 2.4;
    const leap = S.dash + 7 * B;                          // 35.91: jump at us
    fillScreen('#F7EAD2');
    ctx.save();
    ctx.translate(Math.sin(t * 9) * 4, Math.abs(Math.sin(t * 9)) * 6);
    // floor, ceiling, walls
    poly([P(-HW, FL, 0.45), P(HW, FL, 0.45), P(HW, FL, ZF), P(-HW, FL, ZF)], { fill: '#E9C997', stroke: null });
    poly([P(-HW, CE, 0.45), P(HW, CE, 0.45), P(HW, CE, ZF), P(-HW, CE, ZF)], { fill: '#FBF4E6', stroke: null });
    poly([P(-HW, CE, 0.45), P(-HW, FL, 0.45), P(-HW, FL, ZF), P(-HW, CE, ZF)], { fill: '#FFF1D6', stroke: null });
    poly([P(HW, CE, 0.45), P(HW, FL, 0.45), P(HW, FL, ZF), P(HW, CE, ZF)], { fill: '#FFE9C4', stroke: null });
    // the far end: a bright doorway
    poly([P(-HW, CE, ZF), P(HW, CE, ZF), P(HW, FL, ZF), P(-HW, FL, ZF)], { fill: '#FFF8E0', stroke: null });
    glow(VP[0], VP[1] + 20, 200, '#FFFFFF', 0.8);
    // skirting boards
    stroke([P(-HW, FL - 60, 0.45), P(-HW, FL - 60, ZF)], '#C9A26A', 4, { ink: null });
    stroke([P(HW, FL - 60, 0.45), P(HW, FL - 60, ZF)], '#C9A26A', 4, { ink: null });
    // things on the walls, receding as we back away from the stampede
    const feats = [];
    for (let i = 0; i < 12; i++) {
      const z = 0.5 + (((i * 1.1 + run * v) % 13.2) + 13.2) % 13.2;
      feats.push([z, i]);
    }
    feats.sort((a, b) => b[0] - a[0]);
    for (const [z, i] of feats) {
      const d = 0.55;
      // floor tile seam
      stroke([P(-HW, FL, z), P(HW, FL, z)], '#D8B47E', Math.max(1, 6 / z), { ink: null });
      // ceiling light
      quad(-160, CE, z, 160, CE, z + 0.35, { fill: '#FFFFFF', stroke: '#E6DCC8', lw: 3 / z + 1 });
      // windows on the left, doors on the right
      quad(-HW, -560, z, 0, -60, z + d, { fill: '#9FDCFF', stroke: PAL.ink, lw: 8 / z + 1 }, true);
      if (i % 2) quad(HW, -520, z, 0, FL, z + d * 0.8, { fill: '#6FE3C8', stroke: PAL.ink, lw: 8 / z + 1 }, true);
      else quad(HW, -560, z, 0, -40, z + d * 0.9, { fill: '#FFD45C', stroke: PAL.ink, lw: 8 / z + 1 }, true);
      // sun patch from the window
      quad(-HW + 40, FL, z + 0.05, -300, FL, z + d, { fill: rgba('#FFFFFF', 0.35), stroke: null });
    }
    // the people, far to near
    const people = [];
    for (let i = 0; i < 18; i++) {
      const z = 2.3 + hash(i, 1) * 3.2 + Math.sin(t * 2 + i) * 0.1;
      people.push({ z, draw: (x, y, s) => extra(x, y, s, i, t, { ...frontRun(t, i), eyes: hash(i, 3) > 0.5 ? 'determined' : 'happy', mouth: 'open' }), X: hrange(-950, 950, i, 2) });
    }
    // dust cloud behind the crowd
    for (let i = 0; i < 9; i++) {
      const z = 5.4 + hash(i, 8) * 1.2, [x, y] = P(hrange(-1100, 1100, i, 9), FL - 200, z);
      smooth(blobPts(x, y, 260 / z * 2.2, 9, 0.2, i, t * 3), { fill: '#F2DDB8', stroke: null, alpha: 0.9 });
    }
    // the teacher by her door, left behind (and spun round) by the rush
    const tz = 1.25 + run * v * 0.55;
    const spin = seg(t, S.dash + 1.3, S.dash + 2.2);
    people.push({
      z: tz, X: 1010, draw: (x, y, s) => adult(x, y, s, {
        kind: 'teacher', t, rot: Math.sin(spin * Math.PI * 4) * 0.3 * (1 - spin * 0.5), aR: spin > 0 ? 2.7 : 2.3, eR: 0.5,
        eyes: spin > 0 ? 'spiral' : 'dot', mouth: 'open', emote: spin > 0 ? 'sweat' : 'anger',
      }),
      adult: true,
    });
    // the three friends in front
    const jumpK = seg(t, leap - 0.05, S.caf);
    [['pony', -780, 1.62], ['me', 0, 1.48], ['glasses', 780, 1.62]].forEach(([who, X, z0], i) => {
      const z = z0 * (1 + 0.04 * Math.sin(t * 3 + i * 2)) * lerp(1, 0.28, easeIn(jumpK));
      people.push({
        z, X: X * lerp(1, 1.6, jumpK), me: true, draw: (x, y, s) => kid(x, y, s, {
          who, t, bag: who === 'me', ...(jumpK > 0 ? { aL: 2.7, aR: 2.7, eL: 0.2, eR: 0.2, lL: 0.4, lR: 0.4, kL: 0.8, kR: 0.8, dy: 120 * Math.sin(jumpK * Math.PI) } : frontRun(t, i * 1.3)),
          eyes: jumpK > 0 ? 'star' : 'determined', mouth: jumpK > 0 ? 'grin' : 'open', blush: true, ponySwing: 0.6,
        }),
      });
    });
    people.sort((a, b) => b.z - a.z);
    for (const p of people) {
      const [x, y] = P(p.X, FL, p.z);
      const s = (p.adult ? 1.55 : 2.15) / p.z;
      if (y > H + 900 * s) continue;
      p.draw(x, y, s);
    }
    // 뛰지 마! — then blown away
    const tb = P(1010, -300, tz);
    const blow = seg(t, S.dash + 1.35, S.dash + 2.3);
    if (t < S.dash + 2.3) {
      const bx = lerp(tb[0] - 120, -300, easeIn(blow)), by = lerp(tb[1] - 60, -200, easeIn(blow)) - Math.sin(blow * Math.PI) * 100;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-blow * 6); ctx.scale(1 - blow * 0.3, 1 - blow * 0.3);
      speechBubble(0, 0, 330, 140, 110, 110, { text: '뛰지 마!', size: 70 });
      ctx.restore();
    }
    ctx.restore();
    speedLines(t, VP[0], VP[1], 0.6 + jumpK, '#FFFFFF');
    flash(ease(seg(t, S.caf - 0.12, S.caf)) * 0.9, '#FFFFFF');
    flash(1 - ease(seg(t, S.dash, S.dash + 0.15)), '#FFFFFF');
  }

  // ---- 36.36 the cafeteria: trays and a jump ----------------------------------------------------

  const FOOD = [
    (s) => { circle(0, 0, 26 * s, { fill: '#FFFFFF', lw: 4 }); circle(0, 0, 11 * s, { fill: PAL.gold, stroke: null }); },   // fried egg
    (s) => rrect(-28 * s, -12 * s, 56 * s, 24 * s, 12 * s, { fill: '#FF8C8C', lw: 4 }),                                 // sausage
    (s) => smooth(blobPts(0, 0, 24 * s, 7, 0.3, 4), { fill: '#7CCB6A', lw: 4 }),                                        // broccoli
    (s) => poly([[-22 * s, -16 * s], [24 * s, -8 * s], [10 * s, 20 * s], [-18 * s, 14 * s]], { fill: '#F2545B', lw: 4 }), // kimchi
    (s) => { ell(0, 0, 30 * s, 22 * s, { fill: '#E8A33D', lw: 4 }); rrect(18 * s, -6 * s, 26 * s, 12 * s, 5 * s, { fill: '#FFFFFF', lw: 3 }); }, // drumstick
  ];

  function cafeteria(t, lt, dur) {
    const boom = sylT(20, 7);                      // 38.18 "프"
    const [sx, sy] = shakeXY(t, boom, 30, 0.5);
    const air = seg(t, boom, boom + 2 * B);
    const jump = Math.sin(air * Math.PI) * (air > 0 && air < 1 ? 1 : 0);
    fillScreen('#CFF5EA');
    const zp = lerp(1.0, 1.06, lt / dur) + hitK(t, boom, 0.3) * 0.08;
    camBegin(W / 2 + sx, H / 2 + sy, zp);
    // wall: mint tiles low, windows high
    rrect(-200, 560, W + 400, 200, 0, { fill: '#8FE8D2', stroke: null });
    for (let i = 0; i < 26; i++) stroke([[-200 + i * 100, 560], [-200 + i * 100, 760]], '#78D8C0', 4, { ink: null });
    for (let i = 0; i < 4; i++) {
      rrect(80 + i * 470, 90, 380, 300, 12, { fill: '#BFE9FF', lw: 7 });
      stroke([[270 + i * 470, 90], [270 + i * 470, 390]], '#FFFFFF', 8, { olw: 6 });
    }
    // the burst when they jump
    if (air > 0) {
      const a = clamp(air * 4) * (1 - seg(t, boom + 1.2, boom + 1.8) * 0.5);
      sunburst(960, 300, rgba('#FFE27A', 0.95), rgba('#FFFFFF', 0.6), t * 0.4, 22, 2000, a);
      glow(960, 300, 600, '#FFF3B0', 0.6 * a);
    }
    // today's menu board between the windows
    rrect(760, 420, 400, 130, 14, { fill: PAL.board, lw: 7 });
    chalk('오늘의 메뉴', 960, 455, 40, '#FFE08A', { align: 'center' });
    chalk('돈가스 · 미역국 · 김치', 960, 510, 34, PAL.chalk, { align: 'center' });
    // the serving counter, low behind them, and a steaming pot
    rrect(-100, 690, W + 200, 140, 16, { fill: '#DDE4EE', lw: 7 });
    rrect(-100, 680, W + 200, 26, 10, { fill: '#B8C3D2', lw: 6 });
    rrect(1600, 590, 200, 100, 20, { fill: '#C9D3E0', lw: 6 });
    for (let k = 0; k < 3; k++) {
      const f = frac(t * 0.7 + k / 3);
      stroke([[1660 + k * 40, 580 - f * 90], [1670 + k * 40 + Math.sin(f * 6 + k) * 14, 540 - f * 130]], '#FFFFFF', 10, { ink: null, alpha: 0.7 * Math.sin(f * Math.PI) });
    }
    rrect(-100, 820, W + 200, 400, 0, { fill: '#F4E6C8', lw: 6 });
    // the three with their trays
    const land = hitK(t, S.caf, 0.25), land2 = hitK(t, boom + 2 * B, 0.25);
    const antic = t < boom ? seg(t, boom - 0.3, boom) : 0;
    const ks = 1.32;
    [['pony', 470], ['me', 960], ['glasses', 1450]].forEach(([who, x], i) => {
      const bob = air > 0 ? 0 : hop(t) * 16;
      const dy = jump * 260 + bob;
      const sq = land * 0.25 + land2 * 0.2 + antic * 0.15 - (air > 0 && air < 0.5 ? 0.08 : 0);
      const pose = air > 0 && air < 1
        ? { lL: 0.5, lR: 0.5, kL: 1.0, kR: 1.0, eyes: 'star', mouth: 'grin' }
        : { eyes: i === 1 ? 'happy' : 'open', mouth: 'cat', lL: 0.12 + antic * 0.3, lR: 0.12 + antic * 0.3, kL: antic * 0.6, kR: antic * 0.6 };
      kid(x, 1010, ks, {
        who, t, dy, sq, ...pose, blush: true, aL: 0.5, aR: 0.5, eL: -1.1, eR: -1.1, lookX: (i - 1) * -0.3,
        holdL: (hx, hy) => { lunchTray(0, -104, 0.52); circle(hx, hy, 15, { fill: PAL.skin, lw: 4.5 }); },
        holdR: (hx, hy) => circle(hx, hy, 15, { fill: PAL.skin, lw: 4.5 }),
      });
      // lunch in the air
      if (air > 0 && air < 1) {
        const trayY = 1010 - ks * (dy + 104 * (1 - sq));
        for (let k = 0; k < 4; k++) {
          const hgt = (330 + hash(i, k) * 260) * Math.sin(air * Math.PI);
          const fx = x + (k - 1.5) * 40 + Math.sin(air * Math.PI) * (k - 1.5) * 90;
          ctx.save(); ctx.translate(fx, trayY - hgt); ctx.rotate(air * (k % 2 ? 6 : -6));
          FOOD[(i + k) % 5](1.7);
          ctx.restore();
        }
      }
    });
    camEnd();
    flash(1 - ease(seg(t, S.caf, S.caf + 0.25)), '#FFFFFF');
    flash(hitK(t, boom, 0.15) * 0.6, '#FFFFFF');
    speedLines(t, 960, 460, hitK(t, boom, 0.6), '#FFFFFF');
  }

  // ---- 40.00 the textbook doodle comes alive ----------------------------------------------------

  const circPts = (cx, cy, rx, ry, n = 20, rot = 0) => Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  });
  const starPts = (cx, cy, r) => { const p = starShape(cx, cy, r, 0.45); return [...p, p[0]]; };
  // [group, points]; groups come alive together
  const DOODLE = [
    ['stage', [[60, 175], [450, 175], [475, 240], [35, 240], [60, 175]]],
    ['me', circPts(255, -10, 40, 40)],
    ['me', [[250, -50], [256, -76], [278, -84]]],
    ['me', [[255, 30], [255, 105], [228, 168]]],
    ['me', [[255, 105], [284, 168]]],
    ['guitar', circPts(262, 84, 34, 24, 18, -0.5)],
    ['guitar', [[282, 70], [360, 20]]],
    ['me', [[255, 55], [232, 88], [262, 92], [300, 58], [338, 36]]],
    ['light', [[110, -270], [200, 160]]],
    ['light', [[400, -270], [310, 160]]],
    ['star1', starPts(105, -120, 38)],
    ['star2', starPts(420, -160, 30)],
    ['note', [[360, -60], [360, -120], [385, -110]]],
    ['plane', [[-120, -210], [-250, -160], [-205, -205], [-120, -210], [-205, -175], [-190, -150]]],
    ['trail', [[-270, -150], [-330, -120], [-360, -60], [-320, -30], [-290, -70], [-340, -80], [-400, -40]]],
  ];
  const lenOf = pts => pts.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  function partial(pts, k) {
    if (k >= 1) return pts;
    const total = lenOf(pts) * k, out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= total) { const f = (total - acc) / d; out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); return out; }
      acc += d; out.push(pts[i]);
    }
    return out;
  }
  function pencil(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    poly([[0, 0], [-18, -46], [18, -46]], { fill: '#F6D7A8', lw: 5 });
    poly([[0, 0], [-6, -15], [6, -15]], { fill: '#4B4B5E', stroke: null });
    rrect(-18, -330, 36, 286, 4, { fill: PAL.gold, lw: 5 });
    stroke([[-6, -320], [-6, -50]], '#FFE08A', 5, { ink: null });
    rrect(-19, -370, 38, 44, 6, { fill: '#FF8FB1', lw: 5 });
    rrect(-20, -340, 40, 14, 3, { fill: '#C9CED8', lw: 4 });
    ctx.restore();
  }

  function doodle(t, lt, dur) {
    const step = B / 2, t0 = S.doodle + 0.05;
    const alive = t0 + DOODLE.length * step;              // ~43.46: fully drawn
    const life = seg(t, alive - 0.9, alive);              // things wake up as the last lines land
    fillScreen('#C98E5B');
    for (let i = 0; i < 14; i++) stroke([[-50, i * 90 + 20], [W + 50, i * 90 + 40 + Math.sin(i) * 30]], '#B77E4E', 6, { ink: null, alpha: 0.6 });
    const z = lerp(1.3, 1.5, easeInOut(lt / dur));
    camBegin(1160 + lt * 20, 575 - lt * 8, z, lerp(-0.05, 0.02, lt / dur));
    // an eraser and crumbs
    rrect(1600, 80, 180, 90, 14, { fill: '#FFFFFF', lw: 6 }); rrect(1600, 80, 70, 90, 14, { fill: PAL.blue, lw: 6 });
    textbook(960, 520, 1.25, -0.03, () => {
      // printed exercise on the left page
      rrect(-460, -290, 200, 40, 6, { fill: '#3E6FB8', stroke: null });
      // pencil work
      let tip = null;
      DOODLE.forEach(([g, pts], i) => {
        const k = seg(t, t0 + i * step, t0 + (i + 0.85) * step);
        if (k <= 0) return;
        ctx.save();
        if (life > 0) {
          const hp = hop(t);
          if (g === 'me' || g === 'guitar') { ctx.translate(255, 168); ctx.rotate(Math.sin(beatOf(t) * Math.PI) * 0.12 * life); ctx.translate(-255, -168 - hp * 22 * life); }
          if (g === 'star1' || g === 'star2') { const [cx, cy] = g === 'star1' ? [105, -120] : [420, -160]; const s = 1 + pulse(t, 5) * 0.3 * life; ctx.translate(cx, cy); ctx.rotate(t * 1.5 * life); ctx.scale(s, s); ctx.translate(-cx, -cy); }
          if (g === 'note') ctx.translate(Math.sin(t * 5) * 10 * life, -hp * 30 * life);
          if (g === 'light') ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
          if (g === 'plane') { const f = seg(t, alive - 0.6, alive + 1.2); ctx.translate(f * 520, -Math.sin(f * Math.PI) * 180 - f * 60); ctx.rotate(-f * 0.3); }
        }
        // colour fills once alive
        if (life > 0.2) {
          const a = clamp((life - 0.2) * 2);
          if (g === 'star1' || g === 'star2') poly(pts, { fill: rgba('#FFD45C', a), stroke: null });
          if (g === 'guitar' && pts.length > 5) poly(pts, { fill: rgba('#F2545B', a), stroke: null });
          if (g === 'plane' && i === DOODLE.length - 2) poly(pts, { fill: rgba('#8FD3FF', a), stroke: null });
          if (g === 'light' && i === 8) poly([[110, -270], [200, 160], [310, 160], [400, -270]], { fill: rgba('#FFF3B0', 0.5 * a), stroke: null });
        }
        const pp = partial(pts, k);
        if (pp.length > 1) stroke(pp, '#4B4B5E', g === 'trail' ? 5 : 7, { ink: null, alpha: 0.92 });
        if (g === 'me' && i === 1 && k >= 1) { circle(242, -14, 5, { fill: '#4B4B5E', stroke: null }); circle(268, -14, 5, { fill: '#4B4B5E', stroke: null }); stroke([[244, 4], [255, 12], [266, 4]], '#4B4B5E', 4, { ink: null }); }
        if (g === 'note' && k >= 1) ell(352, -60, 12, 9, { fill: '#4B4B5E', stroke: null }, -0.4);
        ctx.restore();
        if (k < 1) tip = pp[pp.length - 1];
      });
      if (tip) pencil(tip[0], tip[1], 0.45 + Math.sin(t * 20) * 0.05);
      else if (t < alive + 0.1) pencil(430, 220, 0.5);
      else pencil(lerp(430, 700, seg(t, alive, alive + 0.5)), lerp(220, 380, seg(t, alive, alive + 0.5)), 0.5);
    });
    camEnd();
    flash(1 - ease(seg(t, S.doodle, S.doodle + 0.2)), '#FFFFFF');
  }

  // ---- 43.64 the rooftop spin -------------------------------------------------------------------

  function rooftop(t, lt, dur) {
    const boom = sylT(24, 7);                           // 45.45 "프"
    const hold = 0.45;
    // time with the jump frozen for `hold` seconds
    const te = t < boom ? t : t < boom + hold ? boom : t - hold;
    const frozen = t >= boom && t < boom + hold;
    const [sx, sy] = shakeXY(t, boom, 26, 0.4);
    skyFill([[0, '#5CB6FF'], [0.6, '#A8DCFF'], [1, '#E6F6FF']]);
    const rot = Math.sin((te - S.roof) * 0.9) * 0.22;
    camBegin(960 + sx, 600 + sy, 1.32, rot);
    cloudLayer(te, 180, 0.7, 30, 21);
    // the city below the fence
    for (let i = 0; i < 26; i++) {
      const bw = 90 + hash(i, 31) * 110, bh = 60 + hash(i, 32) * 170, x = -900 + i * 150 + hash(i, 33) * 40;
      rrect(x, 640 - bh, bw, bh + 80, 6, { fill: mix('#C9D8F4', '#FFFFFF', hash(i, 34) * 0.4), stroke: null });
      for (let r = 0; r < Math.floor(bh / 40); r++) rrect(x + 14, 640 - bh + 16 + r * 40, bw - 28, 12, 3, { fill: rgba('#FFFFFF', 0.6), stroke: null });
    }
    for (let i = 0; i < 10; i++) smooth(blobPts(-800 + i * 400, 690, 110, 8, 0.2, i + 60), { fill: '#8CCB8A', stroke: null });
    // roof deck
    rrect(-900, 700, 3700, 900, 0, { fill: '#9DB7A8', lw: 6 });
    for (let i = 0; i < 16; i++) stroke([[-900 + i * 260, 700], [-1400 + i * 330, 1600]], '#8BA697', 5, { ink: null });
    // railing
    stroke([[-900, 600], [2800, 600]], '#6FE3C8', 16, { olw: 9 });
    for (let i = 0; i < 40; i++) stroke([[-900 + i * 95, 600], [-900 + i * 95, 705]], '#6FE3C8', 9, { olw: 7 });
    // water tank
    rrect(160, 470, 220, 240, 30, { fill: '#F4F0E6', lw: 7 }); rrect(150, 450, 240, 40, 16, { fill: '#6FE3C8', lw: 6 });
    // the circle dance
    const w = TAU / (4 * B);
    const kids = ['me', 'pony', 'glasses'].map((who, i) => {
      const th = (te - S.roof) * w + i * TAU / 3 + Math.PI / 2;
      return { who, i, th, x: 960 + Math.cos(th) * 430, y: 880 + Math.sin(th) * 110, s: 0.9 + Math.sin(th) * 0.12, vx: -Math.sin(th) };
    }).sort((a, b) => a.y - b.y);
    const air = seg(t, boom - 0.02, boom + hold + 2 * B);
    const jump = t < boom ? 0 : t < boom + hold ? 1 : Math.cos(seg(t, boom + hold, boom + hold + B * 1.2) * Math.PI / 2);
    for (const k of kids) {
      const antic = seg(t, boom - 0.25, boom) * (t < boom ? 1 : 0);
      const pose = jump > 0.02
        ? { dy: jump * 260, aL: 2.8, aR: 2.8, eL: 0.1, eR: 0.1, lL: 0.5, lR: 0.5, kL: 1.1, kR: 1.1, eyes: 'star', mouth: 'grin', sq: -0.06 }
        : { walk: beatOf(te) * 1.0, run: true, turn: k.vx * 0.7, eyes: 'happy', mouth: 'open', sq: antic * 0.15, rot: k.vx * 0.08 };
      kid(k.x, k.y, k.s, { who: k.who, t: te, ...pose, blush: true, bag: k.who === 'me', ponySwing: k.vx * 0.3 });
    }
    camEnd();
    if (t >= boom) {
      confetti(t, boom, { n: 110, burst: true, y: 200 });
      speedLines(t, 960, 460, frozen ? 0.9 : hitK(t, boom + hold, 0.4), '#FFFFFF');
    }
    flash(hitK(t, boom, 0.12) * 0.8, '#FFFFFF');
    if (frozen) fillScreen('#FFFFFF', 0.08);
  }

  // ---- 47.27 sunset: arms round each other ------------------------------------------------------

  function walk(t, lt, dur) {
    const k = lt / dur;
    const night = seg(t, S.end - 0.75, S.end - 0.02);
    skyFill([[0, '#FF8FA8'], [0.45, '#FFB08A'], [0.7, '#FFD49A'], [1, '#FFE8B8']]);
    camBegin(960 + Math.sin(t * 0.8) * 20, 540 - k * 20, lerp(1.08, 1.0, easeOut(k)), Math.sin(t * 0.5) * 0.01);
    sun(960, 520, 210, '#FFE08A', t);
    for (let i = 0; i < 3; i++) cloud(300 + i * 650 + t * 15, 200 + (i % 2) * 90, 0.8, '#FFD6E0');
    // the school far off, and trees
    schoolBuilding(1450, 640, 0.42, { tone: '#F2C2A8' });
    for (let i = 0; i < 6; i++) tree(80 + i * 190 + (i > 2 ? 800 : 0), 650, 0.6, 'green', t);
    // the field and its track
    rrect(-200, 640, W + 400, 600, 0, { fill: '#E49A6A', stroke: null });
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(960, 720 + i * 10, 1500 + i * 160, 60 + i * 60, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.strokeStyle = rgba('#FFFFFF', 0.6); ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    }
    rrect(-200, 640, W + 400, 10, 0, { fill: '#C97E56', stroke: null });
    // hearts and sparkles floating up
    for (let i = 0; i < 12; i++) {
      const f = frac(t * 0.35 + hash(i, 3));
      const x = 960 + hrange(-800, 800, i, 4) + Math.sin(t * 2 + i) * 30, y = 900 - f * 800;
      ctx.save(); ctx.globalAlpha = Math.sin(f * Math.PI);
      if (i % 3) sparkle(x, y, 16 + (i % 4) * 5, '#FFFFFF', t);
      else poly(heartPts(x, y, 22), { fill: PAL.pink, lw: 4 });
      ctx.restore();
    }
    // the three, swaying together as they walk toward us
    const y = lerp(985, 1010, k), s = lerp(1.2, 1.3, k);
    const sway = Math.sin(beatOf(t) * Math.PI / 2) * 0.09;
    const gx = 960 + Math.sin(beatOf(t) * Math.PI / 2) * 40;
    const gap = 225 * s;
    // long shadows toward us
    for (let i = -1; i <= 1; i++) ell(gx + i * gap, y + 90, 90 * s, 110 * s, { fill: 'rgba(120,40,60,0.18)', stroke: null });
    const step = beatOf(t) / 2;
    const common = { t, walk: step, rot: sway, blush: true, eyes: 'happy', mouth: 'grin' };
    kid(gx - gap, y + Math.sin(beatOf(t) * Math.PI) * 4, s, { who: 'pony', ...common, aR: 1.75, eR: 0.35, aL: 0.35 });
    kid(gx + gap, y + Math.sin(beatOf(t) * Math.PI + 1) * 4, s, { who: 'glasses', ...common, aL: 1.75, eL: 0.35, aR: 0.35 });
    kid(gx, y, s, { who: 'me', ...common, aL: 1.8, eL: 0.35, aR: 1.8, eR: 0.35, bag: true, emote: 'music', emoteK: 0.8 + pulse(t, 5) * 0.2 });
    camEnd();
    // the sky drops into night like a curtain
    if (night > 0) {
      const edge = lerp(-120, H + 160, easeInOut(night));
      ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(W + 20, -20);
      for (let i = 12; i >= 0; i--) ctx.lineTo(i * W / 12, edge + Math.sin(i * 1.7 + t * 6) * 40);
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = lgrad(0, 0, 0, H, [[0, PAL.nightDk], [1, PAL.night]]); ctx.fillRect(0, 0, W, H);
      stars(t, 70, 51, 1, H);
      moon(1500, 180, 60);
      ctx.restore();
    }
  }

  chapter('lunch', 29.09, 50.91, [
    [S.bell, bell], [S.count, countdown], [S.dash, dash], [S.caf, cafeteria],
    [S.doodle, doodle], [S.roof, rooftop], [S.walk, walk],
  ]);
})();
