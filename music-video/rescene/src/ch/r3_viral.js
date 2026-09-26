// r3_viral (29.09 – 36.36) · 3 · 야호
//
// 29.09  The bell: a "거제 야호~!" bubble pops out of one phone (a generic short-video screen, a
//        chibi waving). On every beat the phones multiply into a feed grid, each one shouting
//        "야호~!" with hearts rising. The rank HUD rolls up from 904 without stopping.
// 32.73  The grid becomes an endless wall of phones that spins and zooms, a heart storm, phones
//        blinking on the eighths. 34.55 the counter slams onto 5위 and flies to the middle; the
//        five appear from behind, looking up. 35.45 it trembles like a heartbeat; 35.9 – 36.36
//        everything holds its breath (dim, still) and 1위 is saved for the drop.
//
// Shared with r4_top.js through window.R34.
(() => {
  const T0 = 29.0909, B = 0.4545454545;
  const beatT = k => T0 + k * B;

  // ---- the rank ------------------------------------------------------------------------------------

  /** The rank at time t: rolls continuously 904 -> 5 (surging on each beat), holds 5, 1 from the drop. */
  function rankAt(t) {
    if (t >= 36.3636) return 1;
    if (t >= 34.5454) return 5;
    const u = seg(t, T0, 34.5454);
    const p = clamp(u + Math.sin(u * 12 * TAU) / (12 * TAU) * 0.8);   // faster on each beat, never still
    const q = 0.35 * p + 0.65 * p * p;
    return Math.max(5, Math.round(Math.exp(lerp(Math.log(904), Math.log(5), q))));
  }

  /** The HUD (same look as pop.js rankHUD) but in the current transform, so it can move, scale, shake. */
  function hud(t, rank, o = {}) {
    const x = o.x ?? W / 2, y = o.y ?? 160, sc = o.scale ?? 1, fl = o.flash ?? 0;
    const label = o.label || (rank > 100 ? 'MELON 일간' : 'MELON TOP100');
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(sc, sc);
    ctx.globalAlpha *= o.alpha ?? 1;
    const w = 520, h = 118;
    rrect(-w / 2, -h / 2, w, h, 59, { fill: mix(POP.night, POP.pink, fl * 0.6), stroke: POP.white, lw: 8, shadow: rgba(o.glowC || POP.pink, 0.85), shadowBlur: 30 + fl * 50 });
    ctx.font = `34px ${FONT.round}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = POP.rose; ctx.fillText(label, -w / 2 + 40, 0);
    ctx.font = `${76 + fl * 20}px ${FONT.bold}`; ctx.textAlign = 'right';
    const txt = `${rank}위`;
    if (o.blur) { // rolling: a faint trail above and below the number
      ctx.globalAlpha *= 0.25; ctx.fillStyle = POP.white;
      ctx.fillText(txt, w / 2 - 40, 4 - 26 * o.blur); ctx.fillText(txt, w / 2 - 40, 4 + 26 * o.blur);
      ctx.globalAlpha /= 0.25;
    }
    ctx.fillStyle = rank === 1 ? POP.lemon : POP.white;
    ctx.fillText(txt, w / 2 - 40, 4);
    ctx.restore();
  }

  // ---- phones -----------------------------------------------------------------------------------

  const SCREENS = [[POP.rose, POP.lemon], [POP.sky, POP.lav], [POP.mint, POP.sky], [POP.peach, POP.rose], [POP.lav, POP.rose], [POP.lemon, POP.mint]];

  /** A generic short-video screen: a chibi waving, a "야호~!" bubble on the beat, hearts rising. */
  function feed(t, i, w, h, o = {}) {
    const [a, b] = SCREENS[i % SCREENS.length];
    ctx.fillStyle = lgrad(0, 0, 0, h, [[0, a], [1, b]]); ctx.fillRect(0, 0, w, h);
    halftone(0, h * 0.55, w, h * 0.45, '#FFFFFF', 0.3, 18);
    ctx.fillStyle = rgba('#FFFFFF', 0.45); ctx.fillRect(0, h - 170, w, 170);
    if (o.full !== false) {
      chibi(w / 2, h - 90, 0.92, { t: t + i * 0.7, look: i % 5, pose: i % 3 === 1 ? 'cheer' : 'wave', mouth: 'open', bob: hop(t + i * 0.05) * 0.6, flip: i % 2 === 1 });
    } else {
      // a cheap little figure for far-away phones: head with bangs, body
      const hx = w / 2, hy = h - 360;
      smooth([[hx - 70, hy + 150], [hx + 70, hy + 150], [hx + 95, hy + 290], [hx - 95, hy + 290]], { fill: LOOK_C[i % 5], stroke: POP.ink, lw: 8 });
      circle(hx, hy, 105, { fill: '#FFE1D2', stroke: POP.ink, lw: 8 });
      smooth([[hx - 108, hy + 10], [hx - 90, hy - 70], [hx, hy - 110], [hx + 90, hy - 70], [hx + 108, hy + 10], [hx, hy + 20]], { fill: LOOK_H[i % 5], stroke: POP.ink, lw: 8 });
      stroke([[hx - 14, hy + 50], [hx, hy + 60], [hx + 14, hy + 50]], POP.ink, 6, { ink: null });
      const wv = Math.sin(t * 10 + i) * 20;
      stroke([[hx + 80, hy + 170], [hx + 150, hy + 80], [hx + 160 + wv, hy - 10]], LOOK_C[i % 5], 30, { olw: 12, ink: POP.ink });
    }
    // "야호~!" pops on this phone's beat
    const age = frac(beatOf(t) + hash(i, 4) * 0.5);
    const k = clamp(age / 0.25);
    if (o.yaho !== false) bubble(w / 2 + (i % 2 ? 40 : -40), 130, '야호~!', 66, { scale: 0.4 + 0.6 * backOut(k), rot: (i % 2 ? 0.08 : -0.08), tail: i % 2 ? -1 : 1, fill: POP.white, color: POP.pink });
    // hearts rising on the right, a like counter column
    for (let j = 0; j < 5; j++) {
      const f = frac(t * 0.8 + hash(i, j) + j * 0.2);
      poly(heartPts(w - 60 + Math.sin(f * 9 + j) * 18, h - 200 - f * 420, 20 + 10 * (1 - f)), { fill: [POP.pink, POP.rose, POP.lemon][j % 3], stroke: POP.ink, lw: 4, alpha: 1 - f });
    }
    circle(w - 60, h - 150, 26, { fill: POP.white, stroke: POP.ink, lw: 5 });
    poly(heartPts(w - 60, h - 150, 20), { fill: POP.pink, stroke: null });
    // progress bar
    rrect(24, h - 40, w - 48, 12, 6, { fill: rgba('#FFFFFF', 0.7), stroke: null });
    rrect(24, h - 40, (w - 48) * frac(t * 0.35 + hash(i, 2)), 12, 6, { fill: POP.pink, stroke: null });
  }
  const LOOK_C = [POP.pink, POP.lav, POP.mint, POP.peach, POP.sky];
  const LOOK_H = ['#2E2032', '#5A3A2C', '#1F1B2B', '#6B4A38', '#3A2740'];

  /** Tiny rising hearts across a rect, lots of them (the heart storm). */
  function heartStorm(t, n, k, o = {}) {
    for (let i = 0; i < n; i++) {
      if (hash(i, 77) > k) continue;
      const sp = hrange(260, 700, i, 7) * (o.speed ?? 1);
      const x0 = hash(i, 3) * (W + 200) - 100;
      const y = H + 100 - frac(hash(i, 5) + t * sp / (H + 200)) * (H + 300);
      const x = x0 + Math.sin(t * 3 + i) * 50 + (o.swirl ?? 0) * Math.sin(y / 300 + i);
      const r = hrange(16, 44, i, 9);
      poly(heartPts(x, y, r), { fill: [POP.pink, POP.rose, POP.lav, POP.lemon, POP.white][i % 5], stroke: POP.ink, lw: 4, alpha: 0.95 });
    }
  }

  /** A soft pastel veil over the top of the frame so the captions read over busy pictures. */
  function capShade(k, y1 = 820, c = '#FFF0F8') {
    if (k <= 0) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = lgrad(0, 0, 0, y1, [[0, rgba(c, 0.8 * k)], [0.7, rgba(c, 0.55 * k)], [1, rgba(c, 0)]]);
    ctx.fillRect(0, 0, W, y1); ctx.restore();
  }

  // ---- 29.09: yaho, and the phones multiply --------------------------------------------------------

  const COUNTS = [1, 2, 4, 6, 9, 12, 16, 20, 25, 30, 36, 42, 49, 56, 64, 72];  // per half-beat after beat 4
  // the region the grid fills grows with the count, until the phones cover the whole screen
  const REGION = n => n <= 9 ? [40, 740, 1040, 1640] : n <= 20 ? [20, 560, 1060, 1700] : [-30, -30, 1110, 1950];
  const GRID = n => {
    const [x0, y0, x1, y1] = REGION(n);
    let best = [1, n], bs = 0;
    for (let c = 1; c <= 10; c++) {
      const r = Math.ceil(n / c), s = Math.min((x1 - x0) / c / 424, (y1 - y0) / r / 804);
      if (s > bs + 1e-9) { bs = s; best = [c, r]; }
    }
    return best;
  };
  /** Step index: one per beat for the first four beats, then one per half beat (speeding up). */
  function stepAt(t) {
    const b = (t - T0) / B;
    if (b < 4) return Math.max(0, Math.floor(b + 1e-6));
    return Math.min(COUNTS.length - 1, 4 + Math.floor((b - 4) * 2 + 1e-6));
  }
  const stepT = s => s <= 4 ? beatT(s) : beatT(4 + (s - 4) / 2);
  function cellPos(i, n) {
    const [c, r] = GRID(n);
    const [x0, y0, x1, y1] = REGION(n);
    const cw = (x1 - x0) / c, ch = (y1 - y0) / r;
    const s = Math.min(cw / 424, ch / 804) * 0.92;
    const col = i % c, row = Math.floor(i / c);
    const last = Math.floor((n - 1) / c), inLast = n - last * c;
    const off = row === last ? (c - inLast) * cw / 2 : 0;
    return [x0 + cw * (col + 0.5) + off, y0 + ch * (row + 0.5), s];
  }

  function yaho(t, lt) {
    const st = stepAt(t), n = COUNTS[st], ts = stepT(st), k = easeOut(seg(t, ts, ts + 0.2));
    const nPrev = st > 0 ? COUNTS[st - 1] : 1;
    // background: pastel, a slow sunburst that kicks on the beat
    pastelBg(t, '#FFC2DD', '#CDB8FF');
    ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * pulse(t);
    sunburst(W / 2, 1150, '#FFFFFF', 'rgba(255,255,255,0)', t * 0.25, 22, 2000);
    ctx.restore();
    const [sx, sy] = shakeXY(t, T0, 14, 0.3);
    camBegin(W / 2 - sx, H / 2 - sy, 1 + 0.015 * pulse(t, 9));
    for (let i = 0; i < n; i++) {
      const [ax, ay, as] = cellPos(Math.min(i, nPrev - 1), nPrev);
      const [bx, by, bs] = cellPos(i, n);
      const isNew = i >= nPrev;
      const x = isNew ? bx : lerp(ax, bx, k), y = isNew ? by : lerp(ay, by, k);
      const s = isNew ? bs * backOut(clamp((t - ts) / 0.22)) : lerp(as, bs, k);
      if (s <= 0.01) continue;
      const tilt = (hash(i, 8) - 0.5) * 0.12;
      phone(x, y, s, (w, h) => feed(t, i, w, h, { full: bs > 0.28 }), { rot: tilt, glow: POP.white });
    }
    camEnd();
    // the first "거제 야호~!" bubble: pops on the bell, shrinks away as the grid fills
    const bk = clamp((t - T0) / 0.25), bo = 1 - easeIn(seg(t, beatT(2), beatT(2.6)));
    if (bo > 0) bubble(W / 2 + 60, 720 - 20 * Math.sin(t * 6), '거제 야호~!', 110, { scale: backOut(bk) * bo * (1 + 0.05 * pulse(t)), rot: -0.06, fill: POP.lemon, color: POP.ink });
    if (t - T0 < 0.5) sfx('딩~!', 850, 600, 90, POP.white, t - T0, { life: 0.6, rot: 0.15 });
    capShade(seg(t, stepT(6), stepT(8)));
    heartStorm(t, 30, 0.2 + 0.6 * seg(t, T0, 32.73), { speed: 0.7 });
    // the counter
    const r = rankAt(t);
    hud(t, r, { y: 160, scale: 1 + 0.06 * pulse(t, 10), flash: 0.4 * pulse(t, 10), blur: 1 });
    popTag(t, beatT(1), 32.73, '“거제 야호”', { size: 104, y: 330, colors: [POP.pink] });
    popSub(t, beatT(2), 32.73, '미나미의 갸루식 인사 + 원이의 고향 거제', { y: 480, size: 54 });
    flash(0.5 * Math.exp(-(t - T0) * 9));
  }

  // ---- 32.73: the wall spins, 5위, the held breath ----------------------------------------------------

  function wall(t, lt) {
    const T1 = 32.7272, T5 = 34.5454, TR = 35.4545, TH = 35.9;
    const hold = seg(t, TH, TH + 0.12);                  // the breath held
    const land = t >= T5 ? t - T5 : -1;
    // spin and zoom: speeding up to 5위, easing off after it
    const spinU = t < T5 ? Math.pow(seg(t, T1, T5), 1.8) * 1.7 : 1.7 + easeOut(seg(t, T5, T5 + 0.8)) * 0.25;
    const tf = t < TH ? t : TH;                          // time freezes in the held breath
    const rot = -spinU * 0.55;
    const zoom = t < T5 ? lerp(0.37, 0.78, easeIn(seg(t, T1, T5))) : lerp(0.78, 0.62, easeOut(seg(t, T5, TH)));
    fillScreen(lgrad(0, 0, 0, H, [[0, '#FFB3D6'], [0.6, '#C9B2FF'], [1, '#9CCBFF']]));
    const [sx, sy] = shakeXY(t, T5, 30, 0.45);
    camBegin(W / 2 + sx, 1100 + sy, zoom, rot);
    // an endless wall of phones (lattice), blinking on the eighths
    const cw = 440, ch = 860, RX = zoom < 0.5 ? 6 : 4, RY = zoom < 0.5 ? 6 : 4;
    const e8 = Math.floor(beatOf(tf) * 2 + 1e-6);
    for (let gy = -RY; gy <= RY; gy++) for (let gx = -RX; gx <= RX; gx++) {
      const px = W / 2 + gx * cw, py = 1100 + (gy + 0.5) * ch;
      const d = Math.hypot(px - W / 2, py - 1100);
      if (d * zoom > 1250) continue;
      const i = (gx + 20) * 41 + gy + 20;
      const blink = hash(i, e8) > 0.8 ? Math.exp(-frac(beatOf(tf) * 2) * 4) : 0;
      phone(px, py, 1, (w, h) => feed(tf, i, w, h, { full: d * zoom < 520 && zoom > 0.6, yaho: zoom > 0.45 || d < 900 }), { rot: (hash(i, 8) - 0.5) * 0.1, glow: blink > 0.1 ? POP.lemon : undefined });
      if (blink > 0.05) { ctx.save(); ctx.globalAlpha = blink * 0.5; rrect(px - 212, py - 402, 424, 804, 60, { fill: '#FFFFFF', stroke: null }); ctx.restore(); }
    }
    camEnd();
    capShade((1 - hold) * (land >= 0 ? 0.8 : 1), 780);
    // heart storm and speed lines, rising with the tension
    heartStorm(tf, 90, 0.3 + 0.7 * seg(t, T1, T5), { speed: 1 + 1.2 * seg(t, T1, T5), swirl: 60 });
    speedLines(tf, W / 2, 1000, 0.3 + 0.7 * seg(t, T1, T5) - 0.6 * seg(t, T5, T5 + 0.5), '#FFFFFF', 60, 3);
    // the five, from behind, pop up at 5위 and look up at the counter
    if (land >= 0) {
      const k = backOut(clamp(land / 0.3)), tr = t >= TR ? Math.sin(t * 60) * 3 * (1 - hold * 0.7) : 0;
      ctx.save(); ctx.translate(0, (1 - k) * 500);
      squad(W / 2, 1680, 0.7, { t: tf, view: 'back', spread: 250, poses: ['cheer', 'stand', 'cheer', 'stand', 'cheer'], sticker: true, bob: hop(tf) * 0.3 * (1 - hold) });
      ctx.restore();
      if (tr) ctx.translate(0, 0);
    }
    // the held breath: the room goes dim around the counter
    if (hold > 0) {
      fillScreen(rgba('#1C1636', 0.62 * hold));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(W / 2, 860, 700, POP.pink, 0.35 * hold); ctx.restore();
    }
    // the counter: rolling at the top, then slams on 5위 and flies to the middle
    const r = rankAt(t);
    const fly = easeInOut(seg(t, T5 + 0.15, T5 + 0.6));
    const hy = lerp(160, 860, fly), hs = lerp(1, 1.6, fly) + (land >= 0 && land < 0.3 ? 0.35 * (1 - land / 0.3) : 0);
    const beat2 = t >= TR ? Math.max(pulse(t, 8), 0.7 * pulse(t - 0.16, 10)) : 0;    // du-dum
    const trem = t >= TR ? (3 + 5 * seg(t, TR, 36.36)) : 0;
    const hx = W / 2 + Math.sin(t * 83) * trem, hyy = hy + Math.cos(t * 71) * trem;
    if (land < 0) hud(t, r, { y: 160, scale: 1 + 0.08 * pulse2(t, 10), flash: 0.45 * pulse2(t, 10), blur: 1 });
    else {
      if (land < 0.5) { ctx.save(); ctx.globalAlpha = 1 - land * 2; burstStar(hx, hyy, 260 + land * 700, 14, POP.lemon, t); ctx.restore(); }
      hud(t, r, { x: hx, y: hyy, scale: hs * (1 + 0.1 * beat2), flash: Math.max(Math.exp(-land * 5), 0.6 * beat2), glowC: hold > 0 ? POP.lemon : POP.pink });
      if (t >= TR && t < TH) {
        const a = (t - TR) % B;
        sfx('두근', 250, 1010, 76, POP.pink, a, { life: 0.4, rot: -0.12 });
        sfx('두근', 830, 1010, 76, POP.pink, a - 0.16, { life: 0.3, rot: 0.12 });
      }
      if (t >= TH) letter('. . .', W / 2, 1060, 90, POP.white, { alpha: 0.4 + 0.4 * Math.sin(t * 12) ** 2, lw: 8 });
    }
    // captions (gone in the held breath)
    popTag(t, T1 + 0.1, TH, '밈이 노래를\n다시 불러냈다', { size: 100, y: land >= 0 ? 330 : 360, bgs: [POP.white, POP.lemon] });
    popSub(t, 33.18, TH, '짧은 영상을 타고 전국으로', { y: land >= 0 ? 600 : 640, size: 54 });
    flash(0.8 * Math.exp(-Math.max(0, land) * 7) * (land >= 0 ? 1 : 0), '#FFFFFF');
    flash(0.5 * Math.exp(-(t - T1) * 8), '#FFFFFF');
  }

  window.R34 = { rankAt, hud, feed, heartStorm, capShade };

  chapter('viral', 29.09, 36.36, [[29.09, yaho], [32.7272, wall]]);
})();
