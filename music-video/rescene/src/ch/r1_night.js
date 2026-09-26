// r1_night (0 – 14.55) · 1 · 그날 밤
//
// 0.00  Top-down cutaway of the dorm at night: moonlit window and a wall clock up top, five
//       sleepers under blankets below, a dark phone on the floor. The clock ticks on every beat.
// 2.73  Close-up: the clock, the second hand snapping forward beat by beat (똑 · 딱).
// 4.55  Creeping in on the dark phone between two pillows. Zzz.
// 6.36  ALARM: the phone lights up and buzzes, the notification bursts out of it.
// 6.82  Front view: all five spring up (jump, mouth 'o'), pillows fly. 벌떡!
// 8.18  They stampede towards the camera (the phone). 우다다다!
// 9.55  From behind: five backs crowding the glowing phone, the notification pops.
// 10.91 Freeze → VHS rewind: the whole night plays backwards, faster and faster, the picture
//       shrinks away into the tape, collapses to a line and cuts to 2024 at 14.55.
//
// Helpers shared with r2_past.js: window.R12.
(() => {
  const B = SONG.beat;
  const BT = n => n * B;
  const NIGHT = { wall: '#2E2556', wallDk: '#221B44', floor: '#3B2F63', plank: '#4A3C78', moon: '#FFF3C4', glass: '#1A1540' };

  // ---- small shared helpers ----------------------------------------------------------------------

  /** A squash-and-stretch pop that lands at t0: returns [sx, sy]. */
  function squash(t, t0, amt = 0.25, len = 0.35) {
    const a = t - t0;
    if (a < 0 || a > len) return [1, 1];
    const k = Math.exp(-a / len * 4) * Math.cos(a / len * TAU * 1.2);
    return [1 + amt * k, 1 - amt * k];
  }

  /** Twinkling little stars inside a rect. */
  function twinkles(t, n, x, y, w, h, seed = 1, color = '#FFFFFF') {
    for (let i = 0; i < n; i++) {
      const px = x + hash(i, seed) * w, py = y + hash(i, seed + 1) * h;
      const k = 0.5 + 0.5 * Math.sin(t * hrange(2, 5, i, seed + 2) + i * 1.7);
      sparkle(px, py, hrange(6, 16, i, seed + 3) * (0.5 + k * 0.7), color, k * 0.4);
    }
  }

  /** Sparkle glyphs bursting from (x, y) at t0. */
  function sparkBurst(t, t0, x, y, n = 10, r = 260, seed = 4, color = '#FFFFFF') {
    const a = t - t0;
    if (a < 0 || a > 0.7) return;
    const k = easeOut(a / 0.7);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + hash(i, seed) * 0.5, rr = r * k * hrange(0.6, 1.2, i, seed + 1);
      sparkle(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 26 * (1 - k) + 4, i % 2 ? color : POP.lemon, a * 6);
    }
  }

  /** Rising "Z z z" from (x, y). */
  function zzz(t, x, y, s = 1, seed = 0) {
    for (let i = 0; i < 3; i++) {
      const k = frac(t / 2.2 + i / 3 + hash(seed, 3));
      const px = x + Math.sin(k * 5 + seed) * 30 * s + k * 60 * s, py = y - k * 220 * s;
      ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI);
      letter('Z', px, py, (38 + k * 40) * s, '#FFFFFF', { rot: -0.2 + k * 0.3, shadow: null, lw: 7 * s, color2: POP.lav });
      ctx.restore();
    }
  }

  /** A comic word that pops on each beat inside [t0, t1): alternating words and places. */
  function beatSfx(t, t0, t1, words, spots, size, color) {
    if (t < t0 || t >= t1) return;
    const n = beatN(t), age = (beatOf(t) - n) * B;
    const [x, y] = spots[n % spots.length];
    sfx(words[n % words.length], x, y, size, color, age, { life: 0.42 });
  }

  /** A pillow (top-down or flying). */
  function pillow(x, y, s, rot = 0, color = '#FFFFFF') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-80, -48, 160, 96, 36, { fill: POP.white, stroke: POP.white, lw: 22 });
    rrect(-80, -48, 160, 96, 36, { fill: color, stroke: POP.ink, lw: 7 });
    stroke([[-50, -20], [-30, -26]], mix(color, POP.lav, 0.4), 6, { ink: null });
    ctx.restore();
  }

  /** Render fn() into an offscreen canvas the size of the stage and hand the canvas back. */
  let OFF = null;
  function layer(fn, bg = '#000000') {
    if (!OFF || OFF.width !== cv.width || OFF.height !== cv.height) {
      OFF = document.createElement('canvas'); OFF.width = cv.width; OFF.height = cv.height;
    }
    const main = ctx, depth = camDepth;
    ctx = OFF.getContext('2d');
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    try { ctx.save(); fn(); ctx.restore(); } finally { while (camDepth > depth) camEnd(); ctx = main; }
    return OFF;
  }

  // ---- the room ----------------------------------------------------------------------------------

  function moonWindow(x, y, w, h, t, o = {}) {
    rrect(x - 14, y - 14, w + 28, h + 28, 26, { fill: '#F4E6FF', stroke: POP.ink, lw: 7 });
    ctx.save(); rrectPath(x, y, w, h, 16); ctx.clip();
    ctx.fillStyle = lgrad(0, y, 0, y + h, [[0, '#2B2A6B'], [1, '#5B4A9A']]); ctx.fillRect(x, y, w, h);
    twinkles(t, 9, x, y, w, h * 0.8, 21);
    const mx = x + w * 0.66, my = y + h * 0.36;
    glow(mx, my, 150, '#FFF3C4', 0.45);
    circle(mx, my, 50, { fill: NIGHT.moon, stroke: null });
    circle(mx + 22, my - 12, 44, { fill: '#2F2C70', stroke: null });   // a crescent
    if (o.season) o.season(x, y, w, h);
    ctx.restore();
    stroke([[x + w / 2, y], [x + w / 2, y + h]], '#F4E6FF', 12, { ink: POP.ink, olw: 6 });
    stroke([[x, y + h / 2], [x + w, y + h / 2]], '#F4E6FF', 12, { ink: POP.ink, olw: 6 });
    // curtains
    for (const d of [-1, 1]) {
      const cx = d < 0 ? x - 10 : x + w + 10;
      smooth([[cx - 26, y - 30], [cx + 26, y - 30], [cx + 20 + d * 8, y + h * 0.5], [cx + 30, y + h + 40], [cx - 30, y + h + 40], [cx - 16, y + h * 0.5]],
        { fill: o.curtain || '#FF9FC6', stroke: POP.ink, lw: 6 });
    }
  }

  /** The wall clock; the second hand snaps one notch forward on every beat. */
  function clock(x, y, r, t, o = {}) {
    const p = pulse(t, 10), s = 1 + 0.05 * p;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, 1 + 0.03 * p);
    ctx.rotate(Math.sin(beatOf(t) * Math.PI) * 0.02 * (o.rock ?? 1));
    circle(0, 0, r + 26, { fill: POP.white, stroke: POP.white, lw: 20 });
    circle(0, 0, r + 22, { fill: POP.pink, stroke: POP.ink, lw: 8 });
    circle(0, 0, r, { fill: '#FFF6FB', stroke: POP.ink, lw: 6 });
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, big = i % 5 === 0, r0 = r * (big ? 0.8 : 0.88);
      stroke([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93]], big ? POP.ink : POP.lav, big ? r * 0.035 : r * 0.015, { ink: null });
    }
    const hand = (a, len, w, c) => stroke([[-Math.cos(a) * len * 0.15, -Math.sin(a) * len * 0.15], [Math.cos(a) * len, Math.sin(a) * len]], c, w, { ink: null });
    hand(-Math.PI / 2 - 0.5, r * 0.5, r * 0.07, POP.ink);          // hour
    hand(-Math.PI / 2 - 0.12, r * 0.74, r * 0.05, POP.ink);        // minute
    const n = beatN(t), step = backOut(clamp(frac(beatOf(t) + 1e-6) / 0.14));
    const sa = -Math.PI / 2 + (n + step + 20) * TAU / 60;
    hand(sa, r * 0.84, r * 0.022, POP.pink);
    circle(Math.cos(sa) * r * 0.84, Math.sin(sa) * r * 0.84, r * 0.045, { fill: POP.pink, stroke: null });
    circle(0, 0, r * 0.06, { fill: POP.pink, stroke: POP.ink, lw: 4 });
    ctx.restore();
  }

  function floorTopDown(x0, y0, w, h) {
    ctx.fillStyle = NIGHT.floor; ctx.fillRect(x0, y0, w, h);
    for (let i = 0, y = y0; y < y0 + h; i++, y += 90) {
      stroke([[x0, y], [x0 + w, y]], NIGHT.plank, 5, { ink: null });
      const off = (i % 2) * 180;
      for (let x = x0 + off; x < x0 + w; x += 360) stroke([[x, y], [x, y + 90]], NIGHT.plank, 5, { ink: null });
    }
  }

  /** Moonlight falling from the window across the floor. */
  function moonShaft(pts, a = 0.16) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    poly(pts, { fill: rgba('#BFB2FF', a), stroke: null });
    ctx.restore();
  }

  /** One sleeper on a futon, top-down; nod > 0 twitches it (alarm). */
  function sleeperAt(x, y, s, rot, look, t, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-205, -150, 410, 590, 50, { fill: '#EDE4FF', stroke: POP.ink, lw: 7 });           // futon
    stroke([[-205, 380], [205, 380]], '#D6C8FA', 8, { ink: null });
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const jolt = o.jolt ?? 0;
    ctx.translate(0, -jolt * 30);
    chibi(0, 0, s * (1 + jolt * 0.05), { t, look, pose: 'sleep' });
    ctx.restore();
  }

  const SLEEP = [0, 1, 2, 3, 4].map(i => ({ x: 130 + i * 205, y: 1110 + (i % 2) * 40, rot: hrange(-0.06, 0.06, i, 8), look: i }));

  // ---- the phone and its news ----------------------------------------------------------------------

  const NEWS = '러브 어택 · 멜론 TOP100 1위';

  /** Lock screen of the phone, lit by k (0 dark .. 1 lit). */
  function lockScreen(t, k, t0) {
    return (w, h) => {
      ctx.fillStyle = '#15112A'; ctx.fillRect(0, 0, w, h);
      if (k <= 0) {
        ctx.save(); ctx.globalAlpha = 0.25;
        poly([[w * 0.1, 0], [w * 0.45, 0], [w * 0.05, h * 0.5], [0, h * 0.5]], { fill: '#FFFFFF', stroke: null });
        ctx.restore(); return;
      }
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = lgrad(0, 0, 0, h, [[0, '#FFB3D6'], [0.55, '#C9B2FF'], [1, '#9FD8FF']]); ctx.fillRect(0, 0, w, h);
      halftone(0, h * 0.5, w, h * 0.5, '#FFFFFF', 0.3, 18);
      // a big bell that rings
      const a = Math.max(0, t - t0), ring = Math.sin(a * 40) * 0.35 * Math.exp(-a * 0.6);
      ctx.save(); ctx.translate(w / 2, h * 0.36); ctx.rotate(ring);
      smooth([[-70, 40], [-60, -30], [-30, -70], [30, -70], [60, -30], [70, 40], [90, 60], [-90, 60]], { fill: POP.lemon, stroke: POP.ink, lw: 7 });
      circle(0, 78, 18, { fill: POP.lemon, stroke: POP.ink, lw: 6 });
      circle(0, -78, 12, { fill: POP.lemon, stroke: POP.ink, lw: 6 });
      ctx.restore();
      for (const d of [-1, 1]) for (let j = 0; j < 2; j++) {
        const rr = 110 + j * 36 + pulse2(t, 5) * 10;
        ctx.save(); ctx.strokeStyle = POP.white; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(w / 2, h * 0.36, rr, d < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, d < 0 ? Math.PI * 1.2 : Math.PI * 0.2); ctx.stroke();
        ctx.restore();
      }
      // a small notification card with a heart icon
      rrect(24, h * 0.62, w - 48, 120, 26, { fill: 'rgba(255,255,255,0.92)', stroke: null });
      rrect(44, h * 0.62 + 24, 72, 72, 18, { fill: POP.pink, stroke: null });
      poly(heartPts(80, h * 0.62 + 62, 22), { fill: POP.white, stroke: null });
      rrect(134, h * 0.62 + 34, 190, 20, 10, { fill: POP.ink, stroke: null, alpha: 0.7 });
      rrect(134, h * 0.62 + 70, 140, 16, 8, { fill: POP.lav, stroke: null });
      ctx.restore();
    };
  }

  /** The notification popping out of the phone as a big sticker banner (the text verbatim). */
  function newsBanner(x, y, k, t, o = {}) {
    if (k <= 0) return;
    const size = o.size || 58;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.035);
    const s = backOut(clamp(k)) * (1 + 0.03 * pulse(t, 8));
    ctx.scale(s, s);
    ctx.font = `${size}px ${FONT.bold}`;
    const main = '러브 어택 · 멜론 TOP100 ', tail = '1위';
    const tw1 = ctx.measureText(main).width, tw2 = ctx.measureText(tail).width, tw = tw1 + tw2;
    const icon = size * 1.3, pad = 30, bw = icon + pad * 3 + tw, bh = size * 1.9;
    const sc = Math.min(1, 1000 / bw); ctx.scale(sc, sc);
    rrect(-bw / 2, -bh / 2, bw, bh, bh * 0.36, { fill: POP.white, stroke: POP.white, lw: 30, shadow: rgba(POP.pink, 0.9), shadowBlur: 50 });
    rrect(-bw / 2, -bh / 2, bw, bh, bh * 0.36, { fill: POP.white, stroke: POP.ink, lw: 8 });
    const ix = -bw / 2 + pad, iy = -icon / 2;
    rrect(ix, iy, icon, icon, icon * 0.28, { fill: POP.pink, stroke: POP.ink, lw: 6 });
    poly(heartPts(ix + icon / 2, iy + icon / 2 + 2, icon * 0.3), { fill: POP.white, stroke: null });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tx = ix + icon + pad;
    ctx.fillStyle = POP.ink; ctx.fillText(main, tx, 4);
    ctx.fillStyle = POP.pink; ctx.fillText(tail, tx + tw1, 4);
    ctx.restore();
  }

  // ---- shots (scene only; captions are separate so the rewind can replay the pictures) -----------

  // 0 – 2.73: the wide room
  function sWide(t) {
    const lt = t;
    const z = lerp(1, 1.07, ease(clamp(lt / 2.73)));
    camBegin(W / 2, 1080, z);
    ctx.fillStyle = NIGHT.wall; ctx.fillRect(-100, -100, W + 200, 960);
    halftone(-100, 0, W + 200, 880, '#FFFFFF', 0.05, 30);
    floorTopDown(-100, 860, W + 200, 1300);
    stroke([[-100, 870], [W + 100, 870]], '#584A92', 26, { ink: POP.ink, olw: 8 });
    moonShaft([[120, 870], [470, 870], [900, 1920], [260, 1920]], 0.14);
    moonWindow(110, 540, 330, 270, t);
    clock(800, 690, 125, t);
    SLEEP.forEach(p => sleeperAt(p.x, p.y, 0.52, p.rot, p.look, t));
    SLEEP.forEach((p, i) => zzz(t + i * 0.4, p.x + 30, p.y - 40, 0.9, i));
    phone(560, 1520, 0.28, lockScreen(t, 0, 0), { rot: 0.35, screen: '#15112A' });
    camEnd();
  }

  // 2.73 – 4.55: the clock, close
  function sClock(t) {
    const lt = t - BT(6);
    fillScreen(lgrad(0, 0, 0, H, [[0, NIGHT.wallDk], [1, NIGHT.wall]]));
    halftone(0, 0, W, H, POP.lav, 0.1, 34);
    glow(260, 700, 700, '#BFB2FF', 0.25);
    const z = lerp(1.06, 1.0, easeOut(clamp(lt / 0.5)));
    camBegin(W / 2, 1100, z);
    clock(540, 1100, 330, t, { rock: 2 });
    camEnd();
    beatSfx(t, BT(6), BT(10), ['똑', '딱'], [[190, 700], [890, 720]], 120, POP.white);
  }

  // 4.55 – 6.36: creeping in on the dark phone
  function sCreep(t) {
    const lt = t - BT(10);
    const z = lerp(1.0, 1.22, easeInOut(clamp(lt / 1.82)));
    camBegin(540, 1180, z, -0.03);
    floorTopDown(-200, -200, W + 400, H + 400);
    moonShaft([[-200, 300], [500, 300], [1100, 1920], [-200, 1920]], 0.12);
    sleeperAt(130, 880, 0.85, 0.08, 1, t);
    sleeperAt(960, 920, 0.85, -0.1, 3, t);
    zzz(t, 200, 900, 1.1, 1); zzz(t + 0.9, 1000, 940, 1.1, 3);
    phone(540, 1200, 0.72, lockScreen(t, 0, 0), { rot: 0.18, screen: '#15112A' });
    camEnd();
    beatSfx(t, BT(10), BT(14), ['똑', '딱'], [[230, 720], [850, 700]], 90, '#D9CCFF');
  }

  // 6.36 – 6.82: ALARM
  function sAlarm(t) {
    const lt = t - BT(14);
    const [sx, sy] = shakeXY(t, BT(14), 34, 0.5);
    fillScreen('#2A2150');
    ctx.save(); ctx.translate(540, 1150);
    sunburst(0, 0, rgba(POP.pink, 0.55), rgba('#FFB3D6', 0.18), t * 0.8, 20, 1800);
    ctx.restore();
    const z = lerp(1.35, 1.12, backOut(clamp(lt / 0.3)));
    camBegin(540 - sx, 1180 - sy, z, -0.03);
    floorTopDown(-200, -200, W + 400, H + 400);
    ctx.save(); ctx.translate(540, 1150);
    ctx.restore();
    glow(540, 1200, 700, POP.pink, 0.6);
    sleeperAt(130, 880, 0.85, 0.08, 1, t, { jolt: pulse2(t, 6) });
    sleeperAt(960, 920, 0.85, -0.1, 3, t, { jolt: pulse2(t + 0.1, 6) });
    const bz = Math.sin(t * 95) * 14, br = Math.sin(t * 80) * 0.05;
    phone(540 + bz, 1200, 0.72, lockScreen(t, 1, BT(14)), { rot: 0.18 + br, glow: POP.pink });
    // buzz marks
    for (const d of [-1, 1]) for (let j = 0; j < 3; j++) {
      const off = 200 + j * 40 + pulse2(t, 4) * 20;
      stroke([[540 + d * off, 1080 + j * 30], [540 + d * (off + 30), 1120 + j * 30], [540 + d * off, 1160 + j * 30]], POP.white, 12, { ink: POP.ink, olw: 8 });
    }
    camEnd();
    newsBanner(540, 780, clamp((lt - 0.05) / 0.25), t);
    sfx('위잉!', 800, 1560, 150, POP.lemon, lt, { life: 1.2, rot: 0.1 });
    speedLines(t, 540, 1150, 0.9, '#FFFFFF', 60, 3);
    flash(0.85 * Math.exp(-lt * 9));
  }

  // 6.82 – 8.18: 벌떡! everyone springs up, pillows fly
  const ROOMFRONT = (t, zoom = 1) => {
    fillScreen(lgrad(0, 0, 0, H, [[0, '#3A2D6E'], [0.62, '#7B63C2'], [0.62, '#5A4696'], [1, '#473683']]));
    halftone(0, 0, W, 1190, '#FFFFFF', 0.06, 30);
    moonWindow(640, 560, 300, 240, t, {});
    // futons in perspective on the floor
    for (let i = 0; i < 5; i++) {
      const cx = 540 + (i - 2) * 200;
      poly([[cx - 90, 1330], [cx + 90, 1330], [cx + 105, 1470], [cx - 105, 1470]], { fill: '#EDE4FF', stroke: POP.ink, lw: 6 });
    }
  };
  function sJump(t) {
    const lt = t - BT(15);
    const [sx, sy] = shakeXY(t, BT(15), 26, 0.4);
    camBegin(540 + sx, 1100 + sy, lerp(1.08, 1.0, easeOut(clamp(lt / 1.2))));
    ROOMFRONT(t);
    glow(540, 1650, 600, POP.pink, 0.4 * (0.6 + 0.4 * pulse2(t)));
    ctx.save(); ctx.translate(540, 1000); sunburst(0, 0, rgba('#FFFFFF', 0.10), rgba('#FFFFFF', 0), t * 0.4, 18, 1400); ctx.restore();
    // blankets flung aside
    for (let i = 0; i < 5; i++) {
      const cx = 540 + (i - 2) * 200, k = easeOut(clamp(lt / 0.4));
      ctx.save(); ctx.translate(cx + (i - 2) * 30 * k, 1440 + 40 * k); ctx.rotate((i % 2 ? 1 : -1) * 0.3 * k);
      rrect(-100, -40, 200, 80, 30, { fill: LOOKS[i].outfit, stroke: POP.ink, lw: 6 });
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) {
      const u = i - 2, k = clamp((lt - i * 0.03) / 0.28), up = (1 - backOut(k)) * 380;
      const [qx, qy] = squash(t, BT(15) + 0.28 + i * 0.03, 0.18);
      ctx.save(); ctx.translate(540 + u * 200, 1440 + up); ctx.scale(qx, qy);
      chibi(0, 0, 0.6, { t: t + i * 0.3, look: i, pose: 'jump', mouth: 'o', sticker: true });
      ctx.restore();
    }
    // pillows flying up and over
    for (let i = 0; i < 5; i++) {
      const a = lt - 0.05 * i; if (a < 0) continue;
      const x = 540 + (i - 2) * 200 + hrange(-420, 420, i, 3) * a, y = 1300 - hrange(1500, 2100, i, 4) * a + 1500 * a * a;
      pillow(x, y, 0.9, a * hrange(-9, 9, i, 5), ['#FFFFFF', '#FFE3F1', '#EFE6FF', '#E3F7FF', '#FFF6D6'][i]);
    }
    camEnd();
    sfx('벌떡!', 540, 860, 190, POP.lemon, lt, { life: 1.3, rot: -0.08 });
    flash(0.5 * Math.exp(-lt * 10));
  }

  // 8.18 – 9.55: they stampede towards the phone (the camera)
  function sRun(t) {
    const lt = t - BT(18), k = clamp(lt / 1.36);
    camBegin(540, 1100, lerp(1.0, 1.15, easeIn(k)));
    ROOMFRONT(t);
    camEnd();
    speedLines(t, 540, 1050, 0.8, '#FFFFFF', 64, 5);
    const order = [2, 0, 4, 1, 3];
    const ms = order.map((look, j) => {
      const z = clamp(lerp(0.1, 1, ease(k)) + hrange(-0.12, 0.12, look, 6));
      return { look, z, u: [-2, -1, 0, 1, 2][[0, 3, 2, 4, 1][j]] };
    }).sort((a, b) => a.z - b.z);
    for (const m of ms) {
      const s = lerp(0.42, 0.95, m.z), gy = lerp(1330, 1840, m.z), x = 540 + m.u * lerp(150, 230, m.z);
      const bounce = Math.abs(Math.sin((t + m.look * 0.2) * 14)) * 30 * s;
      // dust puffs behind the feet
      for (let j = 0; j < 3; j++) {
        const pk = frac(t * 3 + j / 3 + m.look * 0.2);
        circle(x + (j - 1) * 60 * s, gy - 10 - pk * 40, (18 + pk * 30) * s, { fill: '#FFFFFF', stroke: null, alpha: 0.5 * (1 - pk) });
      }
      chibi(x, gy - bounce, s, { t: t + m.look, look: m.look, pose: 'run', mouth: 'open', sticker: true });
    }
    sfx('우다다다!', 540, 820, 150, POP.rose, frac(lt / 0.68) * 0.68, { life: 0.68, rot: 0.05 });
  }

  // 9.55 – 10.91: five backs crowding the glowing phone
  function sCrowd(t, frozen = false) {
    const lt = t - BT(21);
    fillScreen(lgrad(0, 0, 0, H, [[0, '#2E2458'], [1, '#4B3A8A']]));
    halftone(0, 0, W, H, POP.lav, 0.08, 30);
    ctx.save(); ctx.translate(540, 900);
    sunburst(0, 0, rgba(POP.pink, 0.35), rgba('#FFFFFF', 0.06), t * 0.5, 22, 1600);
    ctx.restore();
    glow(540, 950, 760, POP.pink, 0.55);
    const [qx, qy] = squash(t, BT(21), 0.12);
    camBegin(540, 1000, lerp(1.1, 1.0, easeOut(clamp(lt / 0.5))));
    ctx.save(); ctx.translate(540, 920); ctx.scale(qx, qy);
    phone(0, 0, 0.92, lockScreen(t, 1, BT(14)), { rot: Math.sin(t * 60) * 0.01, glow: POP.pink });
    ctx.restore();
    hearts(t, 12, 160, 400, 760, 800, { scale: 1.3 });
    // five backs, bouncing on the beat
    const xs = [-340, -170, 0, 170, 340], ys = [1690, 1740, 1705, 1745, 1690], order = [0, 4, 2, 1, 3];
    for (const j of [0, 4, 2, 1, 3]) {
      const look = order[j];
      const bob = frozen ? 0.5 : hop(t + j * 0.05);
      chibi(540 + xs[j], ys[j], 0.64, { t: t + j * 0.4, look, view: 'back', pose: j % 2 ? 'cheer' : 'stand', bob, sticker: true });
    }
    camEnd();
    newsBanner(540, 700, clamp((lt - 0.1) / 0.25), t);
    sparkBurst(t, BT(21) + 0.1, 540, 700, 12, 520, 9);
    if (!frozen) twinkles(t, 14, 60, 450, 960, 900, 33);
  }

  // ---- the whole night as a function of time, captions apart ----------------------------------

  function scene(t) {
    if (t < BT(6)) sWide(t);
    else if (t < BT(10)) sClock(t);
    else if (t < BT(14)) sCreep(t);
    else if (t < BT(15)) sAlarm(t);
    else if (t < BT(18)) sJump(t);
    else if (t < BT(21)) sRun(t);
    else sCrowd(Math.min(t, BT(24) - 0.001));
  }
  function caps(t) {
    popTag(t, 0.25, BT(14), '2026년 7월 8일 밤', { y: 300, bg: POP.white, color: POP.ink });
    popTag(t, BT(14) + 0.1, BT(24) + 0.3, '자다가 들은 소식', { y: 330, bg: POP.lemon, color: POP.ink });
  }
  const shot = t => { scene(t); caps(t); };

  // 10.91 – 14.55: freeze, then rewind the whole night, sucked into the tape
  function sRewind(t) {
    const lt = t - BT(24), T0 = BT(24);
    const R0 = 0.45, R1 = 3.25, END = 3.62;                // rewind starts, reaches 0, cut
    const rk = clamp((lt - R0) / (R1 - R0));
    const tr = lt < R0 ? T0 - 0.001 : Math.max(0.02, (T0 - 0.001) * (1 - Math.pow(rk, 1.8)));
    const frozen = lt < R0;
    const src = layer(() => { if (frozen) sCrowd(T0 - 0.001, true); else scene(tr); });

    fillScreen('#120E24');
    // static behind the picture
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let i = 0; i < 90; i++) {
      const f = Math.floor(t * 30);
      ctx.fillStyle = hash(i, f) > 0.5 ? '#3A2F66' : '#231C44';
      ctx.fillRect(hash(i, f + 1) * W, hash(i, f + 2) * H, hrange(40, 300, i, f + 3), hrange(2, 8, i, f + 4));
    }
    ctx.restore();

    // how the picture sits: jolt on the freeze, shrink and spin while rewinding, collapse at the end
    const hit = Math.exp(-Math.max(0, lt) * 8);
    const sucked = easeInOut(clamp((lt - R0) / 1.1));
    let sc = lerp(1, 0.74, sucked) * (1 + 0.04 * hit), rot = sucked * Math.sin(lt * 3.2) * 0.05;
    let sxk = 1, syk = 1;
    const ck = clamp((lt - R1) / (END - 0.1 - R1));
    if (ck > 0) { syk = Math.max(0.006, 1 - easeIn(clamp(ck / 0.6))); sxk = ck < 0.6 ? 1 + ck * 0.3 : lerp(1.18, 0.0, easeIn((ck - 0.6) / 0.4)); }
    const cy = lerp(H / 2, 1080, sucked);
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.translate(W / 2, cy); ctx.rotate(rot); ctx.scale(sc * sxk, sc * syk); ctx.translate(-W / 2, -H / 2);
    // white sticker frame around the tape picture
    if (sucked > 0 && ck <= 0) rrect(-24, -24, W + 48, H + 48, 40, { fill: '#FFFFFF', stroke: POP.ink, lw: 10 });
    const bands = 32, bh = H / bands, pw = src.width, ph = src.height;
    const tear = frozen ? 0.25 : 0.4 + 0.6 * rk;
    for (let i = 0; i < bands; i++) {
      const f = Math.floor(t * 20);
      let dx = (hash(i, f) - 0.5) * 30 * tear;
      if (hash(i, f + 7) > 0.8) dx += (hash(i, f + 9) - 0.5) * 180 * tear;
      const roll = frozen ? 0 : frac(t * 1.7) * H;
      if (Math.abs(i * bh - roll) < bh * 1.5) dx += 90 * tear;
      ctx.drawImage(src, 0, i * ph / bands, pw, ph / bands + 1, dx, i * bh, W, bh + 0.5);
    }
    // colour fringe
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18;
    ctx.drawImage(src, 0, 0, pw, ph, 14 * tear, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // a paused tape looks washed
    if (frozen) { ctx.fillStyle = 'rgba(40,30,80,0.18)'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();

    if (ck > 0.5) glow(W / 2, cy, 500 * (1 - ck) + 60, '#FFFFFF', 0.9);
    vhs(t, frozen ? 0.5 : 1, { label: false });

    // on-screen display
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const osd = frozen ? '❚❚' : '◀◀ 2024';
    const blink = frozen || frac(t * 1.6) < 0.8;
    if (blink && ck < 0.7) {
      const k = frozen ? 1 : backOut(clamp((lt - R0) / 0.2));
      ctx.translate(70, 190); ctx.scale(k, k);
      ctx.font = `104px ${FONT.bold}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = POP.ink; ctx.strokeText(osd, 0, 0);
      ctx.fillStyle = frozen ? '#FFFFFF' : POP.lemon; ctx.fillText(osd, 0, 0);
    }
    ctx.restore();
    popTag(t, T0 + 0.05, T0 + 3.45, '잠깐,\n어떻게 여기까지?', { y: 400, bgs: [POP.white, POP.lemon] });
    flash(0.35 * hit);
  }

  chapter('night', 0, 14.55, [
    [0, shot], [BT(6), shot], [BT(10), shot], [BT(14), shot], [BT(15), shot], [BT(18), shot], [BT(21), shot],
    [BT(24), sRewind],
  ]);

  window.R12 = { B, BT, NIGHT, squash, twinkles, sparkBurst, zzz, beatSfx, pillow, layer, moonWindow, clock, floorTopDown };
})();
