// z4_encore (36.36 – 59.68) · 4 · 앙코르
//
// 36.36  The chorus drop: white-out, a gold LED view board with marquee bulbs; its odometer rolls
//        from 0 and slams on 690만 회 at 38.18 (쾅!). 40.00 it rolls again and slams on 870만 회 at
//        41.82, pixel fireworks all over the sky, the five jumping under the moon.
// 43.64  A generic comment card pops (톡!). Pixel hearts fly out of it into Zena's arms and circle
//        over her head. 45.45 the card slides up, a second bubble underneath.
// 47.27  The gold-dress sprite (장윤정) on a riser dances; every beat she fires a pixel heart
//        ("러브 어택") at one of the five, who bounce when hit (뿅!).
// 50.91  Crash: the karaoke applause screen. Big dot-matrix 앵콜, fireworks on every beat, the five
//        clap and cheer; the next-reservation strip slides in along the bottom.
// 56.36  빠 · 56.59 밤 · 57.27 밤!: two flashes, then the biggest one; the board turns into a pixel
//        heart, the five bow. From 58.4 the frame holds still, with the credit line.
//
// Uses window.Z34 (z3_medley.js) and, when present, window.Z12 (the stage look).
(() => {
  const DROP = 36.3636, SLAM1 = 38.1818, ROLL2 = 40.0, SLAM2 = 41.8182, CARD = 43.6364, BUB = 45.4545,
    ATTACK = 47.2727, CRASH = 50.9091, P1 = 56.3636, P2 = 56.5909, BAM = 57.2727, FREEZE = 58.4, END = 60.5;
  const Z = () => window.Z34 || {};
  const Z12 = () => window.Z12 || null;
  const call = (o, fn, ...a) => { try { if (o && typeof o[fn] === 'function') { o[fn](...a); return true; } } catch (e) { /* fall back */ } return false; };

  // ---- shared bits (with fallbacks if z3 failed to load) -------------------------------------------

  function scenery(t, o) { if (!call(Z(), 'scenery', t, o)) karaokeBg(t, o); }
  function drapes(t, cols, open, o) { if (!call(Z(), 'drapes', t, cols, open, o)) tinsel(t, 0, 0, 64, 1400, cols); }
  function finish(t) { call(Z(), 'crt', t); call(Z(), 'hud', t); }
  function troupe(t, o) {
    if (call(Z(), 'troupe', t, o)) return;
    [112, 322, 758, 968].forEach((x, j) => sprite(x, o.by ?? 1405, o.bpx ?? 13, { t, pose: o.cpose || 'clap', flip: x > W / 2 }));
    sprite(o.zenaX ?? 540, o.y ?? 1405, o.px ?? 15, { t, pose: o.pose || 'cheer' });
  }
  const look = i => (Z().look ? Z().look(i) : {});
  const person = (x, y, s, o, k) => (Z().person ? Z().person(x, y, s, o, k) : sprite(x, y, s, o));
  const pburst = (...a) => (Z().pburst ? Z().pburst(...a) : pixelFirework(...a));
  const bulbs = (...a) => call(Z(), 'bulbs', ...a);

  const GOLD = ['#FFC23D', '#FFE88A', '#E09A1A', '#FFF6C8', '#F2B233'];
  const PINKS = ['#FF4FA3', '#FFC2E0', '#D8307E', '#FFFFFF', '#FF7FC0'];

  /** A burst of fireworks: at every beat in [a, b), one at a hashed spot in the sky. */
  function beatWorks(t, a, b, seed, box = [120, 300, 840, 700]) {
    const B = SONG.beat, n0 = Math.max(0, Math.floor((t - 1.6 - a) / B)), n1 = Math.floor((Math.min(t, b - 0.01) - a) / B);
    for (let n = n0; n <= n1; n++) {
      const ft = a + n * B; if (ft > t) continue;
      const x = box[0] + hash(n, seed) * box[2], y = box[1] + hash(n, seed + 1) * box[3];
      pixelFirework(t, ft, x, y, 90 + hash(n, seed + 2) * 70, [KR.yellow, KR.cyan, KR.pink, '#FFFFFF', KR.green][n % 5]);
    }
  }

  /** A framed LED board (gold frame, chasing bulbs, dark inside with a dim LED grid). */
  function ledBoard(t, x, y, w, h, o = {}) {
    rrect(x + 10, y + 16, w, h, 28, { fill: 'rgba(0,0,16,0.5)', stroke: null });
    rrect(x, y, w, h, 28, { fill: lgrad(0, y, 0, y + h, [[0, '#FFE88A'], [0.5, '#E09A1A'], [1, '#A86A10']]), stroke: KR.ink, lw: 10 });
    rrect(x + 26, y + 26, w - 52, h - 52, 14, { fill: '#0A0406', stroke: KR.ink, lw: 6 });
    if (Z().dotGrid) Z().dotGrid(x + 34, y + 34, w - 68, h - 68, o.p ?? 8, o.dim || '#2A1010');
    bulbs(t, x + 13, y + 13, w - 26, h - 26, 40, o.bulbs || [KR.red, '#FFFFFF', KR.yellow]);
  }

  // ---- 36.36 – 43.64 · the view board ---------------------------------------------------------------

  /** The value on the board, in 만. */
  function viewsAt(t) {
    if (t < SLAM1) return 690 * easeOut(seg(t, DROP + 0.05, SLAM1));
    if (t < ROLL2) return 690;
    if (t < SLAM2) return 690 + 180 * easeOut(seg(t, ROLL2 + 0.05, SLAM2));
    return 870;
  }

  function views(t, lt) {
    const since1 = t - SLAM1, since2 = t - SLAM2;
    const [sx, sy] = shakeXY(t, t < SLAM1 ? DROP : t < SLAM2 ? SLAM1 : SLAM2, t < SLAM1 ? 26 : 22, 0.4);
    camBegin(W / 2 - sx, H / 2 - sy, 1 + 0.04 * Math.exp(-(t - (t < SLAM1 ? DROP : t < SLAM2 ? SLAM1 : SLAM2)) * 6), 0);
    scenery(t, { top: '#1A0418', mid: '#6A0A3A', low: '#2A0A4A', moonX: 540, moonY: 1000, moonR: 175 });
    // a slow gold sunburst behind the board — the trot drop
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    sunburst(540, 650, 'rgba(255,200,60,0.16)', 'rgba(255,60,140,0.06)', t * 0.4, 18, 1600);
    ctx.restore();
    beatWorks(t, SLAM1, 43.64, 11, [100, 280, 880, 620]);
    for (let k = 0; k < 5; k++) pixelFirework(t, SLAM2 + k * 0.06, 150 + k * 195, 330 + (k % 2) * 520, 150, [KR.yellow, KR.pink, KR.cyan, '#FFFFFF', KR.green][k]);
    call(Z12(), 'glitter', t, DROP, 80, 5);
    call(Z12(), 'glitter', t, SLAM2, 90, 9);
    // the five: bounce on the beat, jump on the slams
    const slamHop = s => (s >= 0 && s < 0.5 ? Math.sin(s / 0.5 * Math.PI) : 0);
    troupe(t, {
      pose: t < SLAM1 ? 'sing' : 'cheer', cpose: 'cheer',
      jump: m => Math.max(slamHop(since1 - m * 0.04), slamHop(since2 - m * 0.04), hop(t) * 0.18),
    });
    call(Z12(), 'bends', t, 540, 1020, { from: DROP - 0.01, to: CARD, w: 190, gap: 150 });
    drapes(t, GOLD, 1, { flash: pulse(t, 5) * 0.6 });
    // the board
    const slamK = Math.max(since1 >= 0 ? Math.exp(-since1 * 9) : 0, since2 >= 0 ? Math.exp(-since2 * 9) : 0);
    const inK = backOut(clamp((t - DROP) / 0.3));
    ctx.save(); ctx.translate(540, 650); ctx.scale(inK * (1 + 0.1 * slamK), inK * (1 + 0.1 * slamK)); ctx.rotate(0.02 * slamK * Math.sin(t * 40)); ctx.translate(-540, -650);
    ledBoard(t, 60, 440, 960, 420, { p: 7 });
    const rows = 30, cols = Z().manCols ? Z().manCols(rows) : 120, p = Math.min(8, 860 / cols);
    const v = viewsAt(t), rolling = (t < SLAM1) || (t >= ROLL2 && t < SLAM2);
    if (Z().manBoard) Z().manBoard(v, 540, 655, rows, p, slamK > 0.3 ? '#FFF3A0' : '#FFC23A');
    else viewCounter(t, DROP, Math.round(v), '만 회', 540, 650, 150, { dur: 0.01 });
    // a white pop across the digits on the slam
    if (slamK > 0.02) { ctx.fillStyle = rgba('#FFFFFF', 0.35 * slamK); ctx.fillRect(86, 466, 908, 368); }
    ctx.restore();
    if (rolling) { // the odometer whirr, in pixel ticks under the board
      ctx.fillStyle = KR.yellow;
      for (let k = 0; k < 9; k++) if (frac(t * 12 + k * 0.37) < 0.5) ctx.fillRect(260 + k * 64, 884, 24, 10);
    }
    sfx('쾅!', 850, 452, 130, KR.yellow, since1 - 0.02, { life: 0.9, rot: 0.2 });
    sfx('쾅!', 230, 452, 150, KR.pink, since2 - 0.02, { life: 0.9, rot: -0.2 });
    confetti(t, SLAM2, { n: 70, burst: true, colors: [KR.pink, KR.yellow, KR.cyan, '#FFFFFF', KR.green] });
    camEnd();
    kBanner(t, DROP, ROLL2, '나흘 만에', { y: 236, bg: '#C0102A' });
    kBanner(t, ROLL2, CARD + 0.3, '6일 만에', { y: 236, bg: KR.purple });
    // the drop itself: out of the white-out
    flash(Math.max(Math.exp(-(t - DROP) * 5), since1 >= 0 ? 0.4 * Math.exp(-since1 * 10) : 0, since2 >= 0 ? 0.5 * Math.exp(-since2 * 9) : 0));
    finish(t);
  }

  // ---- 43.64 – 47.27 · the comment card ------------------------------------------------------------

  const QUOTE = ['“이제나~ 저제나~ 기다리고 있었네.', '제나 친구 고마와요', '(리센느 코라쓰 언니들도 고마와요)”'];
  const CARD_W = 960, CARD_H = 350;

  function commentCard(t, x, y, k) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + CARD_H / 2); ctx.scale(k, k); ctx.rotate((1 - k) * -0.1); ctx.translate(-x, -(y + CARD_H / 2));
    const x0 = x - CARD_W / 2;
    ctx.fillStyle = rgba('#10102A', 0.55); ctx.fillRect(x0 + 14, y + 16, CARD_W, CARD_H);    // hard pixel shadow
    rrect(x0, y, CARD_W, CARD_H, 22, { fill: '#FFFFFF', stroke: KR.ink, lw: 9 });
    // a generic header: round avatar with a pixel heart, two grey placeholder bars
    circle(x0 + 72, y + 64, 38, { fill: KR.gold, stroke: KR.ink, lw: 6 });
    pixelHeart(x0 + 72, y + 66, 7, KR.red);
    rrect(x0 + 130, y + 40, 220, 22, 11, { fill: '#D8D4E8', stroke: null });
    rrect(x0 + 130, y + 72, 140, 18, 9, { fill: '#ECEAF4', stroke: null });
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#B8B4C8'; ctx.fillRect(x0 + CARD_W - 90 + i * 18, y + 56, 10, 10); }
    ctx.fillStyle = '#ECEAF4'; ctx.fillRect(x0 + 30, y + 116, CARD_W - 60, 4);
    // the quote
    ctx.font = `52px ${FONT.round}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    QUOTE.forEach((ln, i) => {
      const size = i === 2 ? 46 : 52;
      ctx.font = `${size}px ${FONT.round}`;
      const lk = clamp((t - CARD - 0.12 - i * 0.14) / 0.15);
      ctx.globalAlpha = lk;
      ctx.fillStyle = i === 0 ? '#E0287E' : KR.ink;
      ctx.fillText(ln, x, y + 172 + i * 66 + (1 - lk) * 12);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function speech(t, t0, x, y, w, h, text, o = {}) {
    const k = backOut(clamp((t - t0) / 0.25)); if (t < t0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = rgba('#10102A', 0.5); ctx.fillRect(-w / 2 + 12, -h / 2 + 14, w, h);
    // tail up-left towards the card: it is the second message
    poly([[-w / 2 + 90, -h / 2 + 4], [-w / 2 + 60, -h / 2 - 50], [-w / 2 + 160, -h / 2 + 4]], { fill: KR.yellow, stroke: KR.ink, lw: 8 });
    rrect(-w / 2, -h / 2, w, h, h / 2, { fill: KR.yellow, stroke: KR.ink, lw: 8 });
    ctx.fillStyle = KR.yellow; ctx.fillRect(-w / 2 + 70, -h / 2 + 4, 110, 14);
    ctx.font = `${o.size || 58}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = KR.ink; ctx.fillText(text, 0, 4);
    ctx.restore();
  }

  function comment(t, lt) {
    const [sx, sy] = shakeXY(t, CARD, 10, 0.25);
    camBegin(W / 2 - sx, H / 2 - sy, 1, 0);
    scenery(t, { top: '#140A3A', mid: '#4A1E8A', low: '#2A0B4A', moonX: 540, moonY: 1000, moonR: 175 });
    call(Z12(), 'twinkles', t, 22, 91, 0, 380, W, 560);
    // Zena catches the hearts: she cheers once the first one lands
    const zPose = t > CARD + 0.9 ? 'cheer' : 'sing';
    troupe(t, { pose: zPose, cpose: 'clap', jump: m => (m === 0 ? hop(t) * 0.25 : 0) });
    drapes(t, PINKS, 1, { flash: pulse(t, 5) * 0.5 });
    // the card, pushed up when the second bubble arrives
    const push = easeOut(clamp((t - BUB) / 0.3)) * 52;
    const cy = 440 - push, k = backOut(clamp((t - CARD) / 0.28));
    commentCard(t, 540, cy, k);
    const ak = clamp((t - CARD - 0.55) / 0.2);
    letter('— 장윤정, 9월 19일 SNS', 1000, cy + CARD_H + 44, 40, '#FFFFFF', { align: 'right', font: 'round', lw: 9, alpha: ak, shadow: null, color2: KR.ink });
    speech(t, BUB, 540, cy + CARD_H + 150, 820, 118, '“자네 트로트 할 생각 있나?”', { size: 58 });
    // the hearts: out of the card, down into Zena's arms, then round her head
    const zx = 540, zy = 1080, N = 9;
    let caught = 0;
    for (let j = 0; j < N; j++) {
      const t0 = CARD + 0.35 + j * 0.2273, age = t - t0, fl = 0.55;
      if (age < 0) continue;
      if (age < fl) {
        const u = easeInOut(age / fl), fx = 200 + hash(j, 3) * 680, fy = cy + CARD_H + 30;
        const x = lerp(fx, zx, u), y = lerp(fy, zy, u) - Math.sin(u * Math.PI) * 40;
        pixelHeart(x, y, 7 + 3 * Math.sin(u * Math.PI), j % 3 ? KR.pink : KR.red);
      } else caught++;
      if (age >= fl) sfx('뿅', zx + (j % 2 ? 130 : -130), zy - 30, 48, KR.pink, age - fl, { life: 0.45, font: 'round' });
    }
    // a little halo of the hearts she caught
    for (let j = 0; j < caught; j++) {
      const a = t * 2.2 + j / Math.max(caught, 1) * TAU;
      pixelHeart(zx + Math.cos(a) * 150, zy - 40 + Math.sin(a) * 34, 6, j % 3 ? KR.pink : KR.red);
    }
    sfx('톡!', 930, 420, 90, KR.yellow, t - CARD, { life: 0.7, rot: 0.2 });
    camEnd();
    kBanner(t, CARD, ATTACK + 0.3, '장윤정도 등판', { y: 236, bg: '#D8307E' });
    flash(0.3 * Math.exp(-lt * 12));
    finish(t);
  }

  // ---- 47.27 – 50.91 · 러브 어택 --------------------------------------------------------------------

  const FIVE_X = [150, 345, 540, 735, 930];   // front row; Zena in the middle
  const JANG_Y = 1180;

  function riser(t) {
    // gold steps on the stage, the star's spot
    for (let r = 0; r < 3; r++) {
      const w = 420 + r * 90, y = JANG_Y + r * 40;
      ctx.fillStyle = r % 2 ? '#E09A1A' : '#FFC23D'; ctx.fillRect(540 - w / 2, y, w, 40);
      ctx.fillStyle = '#FFF1A8'; ctx.fillRect(540 - w / 2, y, w, 6);
      ctx.fillStyle = KR.ink; ctx.fillRect(540 - w / 2 - 4, y, 4, 40); ctx.fillRect(540 + w / 2, y, 4, 40);
      for (let i = 0; i < 6 + r; i++) { ctx.fillStyle = (i + beatN(t) + r) % 2 ? '#FFFFFF' : '#FF4FA3'; ctx.fillRect(540 - w / 2 + 30 + i * (w - 60) / (5 + r), y + 18, 12, 12); }
    }
  }

  /** Heart k: fired from her hands on beat k, lands on member (k % 5). */
  const HEART_FLY = 0.42;
  function heartShot(k) {
    const t0 = ATTACK + 0.2273 + k * SONG.beat, target = [2, 0, 4, 1, 3][k % 5];
    return { t0, target, hit: t0 + HEART_FLY };
  }

  function loveAttack(t, lt) {
    const [sx, sy] = shakeXY(t, ATTACK, 12, 0.3);
    camBegin(W / 2 - sx, H / 2 - sy, 1, 0);
    scenery(t, { top: '#2A0628', mid: '#9A1A6A', low: '#3A0A4A', moonX: 540, moonY: 1000, moonR: 175 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    sunburst(540, 1000, 'rgba(255,80,170,0.16)', 'rgba(255,220,120,0.05)', -t * 0.5, 16, 1600);
    ctx.restore();
    call(Z12(), 'spot', 540, 0, 540, JANG_Y, 120, 460, '#FFE8A0', 0.26);
    riser(t);
    // 장윤정: gold dress, long hair, dancing; sequins twinkle around her
    const jl = Z().jangLook ? Z().jangLook() : { outfit: '#F2B822', long: true };
    const js = 16, jhop = hop(t) * 10;
    ctx.fillStyle = 'rgba(10,6,30,0.35)'; ctx.fillRect(540 - 6 * js, JANG_Y - js * 0.6, 12 * js, js);
    sprite(540, JANG_Y - jhop, js, { t, ...jl, pose: 'dance', bob: 1, mic: false });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + t * 1.3, r = 230 + 30 * Math.sin(t * 3 + i);
      if (frac(t * 2 + hash(i, 4)) < 0.6) sparkle(540 + Math.cos(a) * r, 1000 + Math.sin(a) * r * 0.8, 14 + 8 * hash(i, 5), i % 2 ? '#FFF3A0' : '#FFFFFF', t);
    }
    // the five in front, cheering; each bounces when a heart hits
    FIVE_X.forEach((x, j) => {
      const i = j === 2 ? 0 : j < 2 ? j + 1 : j;
      let hitK = 0;
      for (let k = 0; k < 7; k++) { const h = heartShot(k); if (h.target === j && t >= h.hit) hitK = Math.max(hitK, Math.exp(-(t - h.hit) * 6)); }
      const px = i === 0 ? 11 : 10;
      ctx.fillStyle = 'rgba(10,6,30,0.35)'; ctx.fillRect(x - 6 * px, 1405 - px * 0.6, 12 * px, px);
      person(x, 1405 - hitK * 50 - hop(t + j * 0.1) * 8, px, { t: t + j * 0.13, ...look(i), pose: hitK > 0.3 ? 'cheer' : (j % 2 ? 'clap' : 'cheer'), bob: 1, flip: x > W / 2, mic: i === 0 }, 0);
    });
    // the love attack: a heart per beat in a high arc from her hands to one of the five
    for (let k = 0; k < 7; k++) {
      const h = heartShot(k), age = t - h.t0;
      if (age < 0) continue;
      const tx = FIVE_X[h.target], ty = 1405 - 250;
      if (age < HEART_FLY) {
        const u = age / HEART_FLY, fx = 540 + (k % 2 ? 90 : -90), fy = 900;
        const x = lerp(fx, tx, u), y = lerp(fy, ty, u) - Math.sin(u * Math.PI) * 260;
        for (let q = 1; q <= 3; q++) { // a pixel trail
          const u2 = Math.max(0, u - q * 0.07), x2 = lerp(fx, tx, u2), y2 = lerp(fy, ty, u2) - Math.sin(u2 * Math.PI) * 260;
          ctx.globalAlpha = 0.5 - q * 0.13; pixelHeart(x2, y2, 5, KR.pink); ctx.globalAlpha = 1;
        }
        pixelHeart(x, y, 10, k % 2 ? KR.red : KR.pink);
      } else {
        pburst(t, h.hit, tx, ty, 90, KR.pink, 0.6, 14);
        sfx('뿅!', tx, ty - 70, 64, KR.yellow, age - HEART_FLY, { life: 0.5 });
      }
    }
    drapes(t, PINKS, 1, { flash: pulse(t, 5) * 0.6 });
    camEnd();
    kBanner(t, ATTACK, CRASH + 0.3, '‘러브 어택’ 춤으로 화답', { y: 236, size: 70, bg: KR.pink });
    kLine(t, ATTACK + 0.35, 49.6, '“47살 공격을 받아라”', { y: 1520, size: 76, fill: KR.pink, outline2: '#5A0A3A', hold: CRASH + 0.3 });
    flash(0.35 * Math.exp(-lt * 12));
    finish(t);
  }

  // ---- 50.91 – 59.68 · the applause screen and the ending ---------------------------------------------

  /** The big dot-matrix board: 앵콜, then (57.27) a pixel heart. */
  function encoreBoard(t, tf) {
    const bamK = tf >= BAM ? backOut(clamp((tf - BAM) / 0.3)) : 0;
    const hitK = Math.max(tf >= P1 ? Math.exp(-(tf - P1) * 8) : 0, tf >= P2 ? Math.exp(-(tf - P2) * 8) : 0);
    const inK = backOut(clamp((t - CRASH) / 0.3));
    ctx.save(); ctx.translate(540, 590); ctx.scale(inK * (1 + 0.06 * hitK), inK * (1 + 0.06 * hitK)); ctx.translate(-540, -590);
    ledBoard(tf, 100, 420, 880, 340, { p: 9, bulbs: [KR.yellow, '#FFFFFF', KR.pink] });
    const b = beatN(tf), cols = [KR.red, KR.yellow, KR.pink, KR.cyan];
    if (tf < BAM) {
      if (Z().dotText) {
        // the letters flash in two colours, swapping every beat, and blink white on the hits
        const col = hitK > 0.3 ? '#FFFFFF' : cols[b % 4];
        Z().dotText('앵콜', 540, 594, 28, 9.5, col, { glow: 20 });
      } else letter('앵콜', 540, 590, 220, KR.red);
    } else {
      // the pixel heart, beating once and then still
      const s = 30 * (0.6 + 0.4 * bamK);
      pixelHeart(540, 598, s, KR.red);
      ctx.fillStyle = rgba('#FFFFFF', 0.7); ctx.fillRect(540 - s * 2.5, 598 - s * 2, s, s); ctx.fillRect(540 - s * 1.5, 598 - s * 3, s * 0.6, s);
    }
    if (hitK > 0.02 || (tf >= BAM && tf - BAM < 0.5)) { ctx.fillStyle = rgba('#FFFFFF', 0.4 * Math.max(hitK, tf >= BAM ? 1 - (tf - BAM) / 0.5 : 0)); ctx.fillRect(126, 446, 828, 288); }
    ctx.restore();
  }

  function reservation(t) {
    const k = easeOut(clamp((t - 51.8) / 0.35)), out = clamp((P1 + 0.9 - t) / 0.25);
    if (k <= 0 || out <= 0) return;
    ctx.save(); ctx.globalAlpha = out;
    const y = 1512, x = lerp(W + 40, 0, k);
    ctx.fillStyle = 'rgba(6,8,40,0.8)'; ctx.fillRect(x, y - 42, W, 84);
    ctx.fillStyle = rgba(KR.cyan, 0.7); ctx.fillRect(x, y - 42, W, 3); ctx.fillRect(x, y + 39, W, 3);
    ctx.font = `46px ${FONT.round}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 9; ctx.strokeStyle = KR.ink; ctx.lineJoin = 'round';
    const txt = '다음 예약곡 ▶ 러브 어택 · 리센느';
    ctx.strokeText(txt, x + W / 2, y + 2);
    ctx.fillStyle = frac(beatOf(t) / 2) < 0.5 ? KR.cyan : '#FFFFFF'; ctx.fillText(txt, x + W / 2, y + 2);
    ctx.restore();
  }

  function applause(t, lt) {
    const end = t >= P1, tf = Math.min(t, FREEZE);
    const shake = shakeXY(tf, tf < P1 ? CRASH : tf < P2 ? P1 : tf < BAM ? P2 : BAM, tf >= BAM ? 30 : 16, 0.35);
    camBegin(W / 2 - shake[0], H / 2 - shake[1], 1 + (tf >= BAM ? 0.05 * Math.exp(-(tf - BAM) * 5) : 0), 0);
    scenery(tf, { top: '#0B0F3A', mid: '#1C2A8A', low: '#3A1B6E', moonX: 540, moonY: 1000, moonR: 175 });
    call(Z12(), 'twinkles', tf, 26, 51, 0, 300, W, 800);
    // fireworks: every beat through the applause, then the big ring on 밤!
    beatWorks(tf, CRASH, P1, 23, [100, 300, 880, 700]);
    if (tf >= BAM) {
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * TAU - Math.PI / 2;
        pburst(tf, BAM + k * 0.03, 540 + Math.cos(a) * 380, 640 + Math.sin(a) * 420, 170, [KR.yellow, KR.pink, KR.cyan, '#FFFFFF', KR.green, KR.red, KR.gold][k], 1.05, 22);
      }
    }
    call(Z12(), 'glitter', tf, CRASH, 90, 13);
    // the five: clap and cheer, jump on 빠 and 밤, bow on 밤!
    const jumpAt = (t0, m) => { const s = tf - t0 - m * 0.02; return s >= 0 && s < 0.22 ? Math.sin(s / 0.22 * Math.PI) * 0.6 : 0; };
    const bar = Math.floor((tf - CRASH) / SONG.bar);
    troupe(tf, {
      pose: tf >= BAM ? 'bow' : 'cheer',
      poses: [0, 1, 2, 3].map(j => (tf >= BAM ? 'bow' : (j + bar) % 2 ? 'cheer' : 'clap')),
      bow: m => (tf >= BAM ? easeOut(clamp((tf - BAM - m * 0.04) / 0.3)) : 0),
      jump: m => (tf >= BAM ? 0 : Math.max(jumpAt(P1, m), jumpAt(P2, m), hop(tf) * 0.15)),
    });
    // 짝! on the claps
    if (tf < P1) {
      const n = beatN(tf), age = tf - n * SONG.beat;
      const xs = [112, 322, 758, 968];
      sfx('짝!', xs[n % 4], 1080, 58, n % 2 ? KR.yellow : '#FFFFFF', age, { life: 0.4 });
    }
    drapes(tf, GOLD, 1, { flash: tf >= BAM ? 0.6 * Math.exp(-(tf - BAM) * 3) : pulse(tf, 5) * 0.6 });
    encoreBoard(t, tf);
    // 빠 · 밤 · 밤!
    sfx('빠', 280, 960, 120, KR.yellow, tf - P1, { life: 0.5, rot: -0.15 });
    sfx('밤', 800, 960, 130, KR.pink, tf - P2, { life: 0.55, rot: 0.15 });
    sfx('밤!', 540, 950, 230, '#FFFFFF', tf - BAM, { life: 0.95, color2: KR.red });
    camEnd();
    if (!end || tf < BAM) kBanner(tf, CRASH, BAM, '짝짝짝!', { y: 236, size: 84, bg: '#C0102A' });
    reservation(tf);
    // the credit, small, stays on the held frame
    const ck = clamp((tf - 57.7) / 0.4);
    if (ck > 0) letter('영상·음악 · Claude Code 로 만들었어요 (원곡 미사용)', 540, 1580, 34, '#FFFFFF', { font: 'round', lw: 7, alpha: ck, shadow: null, color2: KR.ink });
    flash(Math.max(
      tf >= CRASH ? 0.7 * Math.exp(-(tf - CRASH) * 6) : 0,
      tf >= P1 ? 0.5 * Math.exp(-(tf - P1) * 12) : 0,
      tf >= P2 ? 0.5 * Math.exp(-(tf - P2) * 12) : 0,
      tf >= BAM ? Math.exp(-(tf - BAM) * 5) : 0));
    finish(tf);
  }

  chapter('encore', 36.36, END, [
    [36.36, views],
    [CARD, comment],
    [ATTACK, loveAttack],
    [CRASH, applause],
  ]);
})();
