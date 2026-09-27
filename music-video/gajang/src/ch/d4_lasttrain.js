// Chapter 4 · 막차 (96.00 – 115.20): the ride home. A superhero in the train window who gives dad a
// thumbs-up, the long walk up the hill with chicken and a cake (and a cat that smells the
// chicken), soju with the moon outside the convenience store, and smile practice in the lift.
(() => {
  const T_HERO = 96.0, T_HILL = 100.8, T_STORE = 105.6, T_LIFT = 110.4, T_END = 115.2;

  // ---- private helpers -------------------------------------------------------------------------

  /** Where dad's right hand is, for person(px, gy, S, { aR, eR }) with no rot / walk / dy. */
  const handR = (px, gy, S, aR, eR) => [
    px + S * (64 + 66 * Math.sin(aR) + 62 * Math.sin(aR + eR)),
    gy + S * (-274 + 66 * Math.cos(aR) + 62 * Math.cos(aR + eR)),
  ];

  /** A fist with the thumb up, in the current transform. */
  function thumbsUp(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-8, -44, 18, 42, 9, { fill: PAL.skin, lw: 4 });
    rrect(-22, -12, 44, 36, 13, { fill: PAL.skin, lw: 4.5 });
    for (let i = 0; i < 3; i++) stroke([[-22, -2 + i * 9], [-10, -2 + i * 9]], PAL.ink, 3, { ink: null });
    ctx.restore();
  }

  function strap(x, y, a, len = 80) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    stroke([[0, 0], [0, len]], '#E6E6EE', 8, { olw: 6 });
    ell(0, len + 22, 20, 24, { fill: null, stroke: PAL.ink, lw: 12 });
    ell(0, len + 22, 20, 24, { fill: null, stroke: '#F2F2F6', lw: 6 });
    ctx.restore();
  }

  /** City lights streaming past a train window (paint inside a clip). */
  function cityRush(t, x0, y0, w, h, seed = 1) {
    ctx.fillStyle = lgrad(0, y0, 0, y0 + h, [[0, '#101335'], [1, '#2A2560']]);
    ctx.fillRect(x0, y0, w, h);
    for (let i = 0; i < 18; i++) {
      const bw = 90 + hash(i, seed) * 80, bh = 120 + hash(i, seed + 1) * 260, span = w + 400;
      const bx = x0 + ((hash(i, seed + 2) * span - t * 220) % span + span) % span - 200;
      rrect(bx, y0 + h - bh, bw, bh + 10, 3, { fill: '#1E2250', stroke: null });
      for (let r = 0; r < 6; r++) if (hash(i, r + 30) < 0.45) rrect(bx + 14 + (r % 3) * 24, y0 + h - bh + 20 + Math.floor(r / 3) * 40, 12, 18, 2, { fill: '#FFD98A', stroke: null });
    }
    for (let i = 0; i < 16; i++) {
      const y = y0 + 30 + hash(i, seed + 7) * (h - 60), len = 100 + hash(i, seed + 8) * 260, sp = 1500 + hash(i, seed + 9) * 1500;
      const span = w + 600, x = x0 + ((hash(i, seed + 10) * span - t * sp) % span + span) % span - 300;
      stroke([[x, y], [x + len, y]], ['#FFD98A', '#FF9AC2', '#9FD4FF'][i % 3], 5 + hash(i, seed + 11) * 6, { ink: null, alpha: 0.75 });
    }
  }

  function chickenBag(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    stroke([[-26, 10], [-20, -8], [20, -8], [26, 10]], '#8A5530', 6, { olw: 6 });
    rrect(-60, 10, 120, 120, 10, { fill: '#E3B579', lw: 5 });
    rrect(-60, 10, 120, 22, 6, { fill: '#D29A5A', lw: 4 });
    letter('치킨', 0, 78, 36, '#E0484E', { lw: 5, shadow: null });
    // the smell, curling up
    for (let i = 0; i < 3; i++) {
      const f = frac(t * 0.7 + i / 3);
      stroke([[-24 + i * 24, 0 - f * 70], [-14 + i * 24 + Math.sin(t * 4 + i) * 10, -24 - f * 70], [-24 + i * 24, -48 - f * 70]],
        '#FFFFFF', 5, { ink: null, smooth: true, alpha: Math.sin(f * Math.PI) * 0.7 });
    }
    ctx.restore();
  }

  function cakeBox(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-70, 14, 140, 100, 8, { fill: '#FFFFFF', lw: 5 });
    rrect(-76, 4, 152, 24, 6, { fill: '#FFF1F4', lw: 5 });
    stroke([[0, 4], [0, 114]], '#FF8FB1', 10, { ink: null });
    stroke([[-70, 64], [70, 64]], '#FF8FB1', 10, { ink: null });
    ell(-16, -2, 18, 11, { fill: '#FF8FB1', lw: 3.5 }, 0.4);
    ell(16, -2, 18, 11, { fill: '#FF8FB1', lw: 3.5 }, -0.4);
    ctx.restore();
  }

  /** A little street cat. walk: phase, sit: 0..1, look: head turn (-1 left .. 1 right, up < 0). */
  function cat(x, y, s, walk, sit, lookUp = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ell(0, 4, 70, 10, { fill: 'rgba(0,0,0,0.25)', stroke: null });
    const col = '#9A9AB0', dk = '#6E6E88';
    // tail
    stroke([[-50, -40 + sit * 30], [-86, -70 + sit * 50], [-78, -110 + sit * 70]], col, 12, { smooth: true, olw: 8 });
    // legs
    for (let i = 0; i < 4; i++) {
      const lx = [-38, -22, 22, 38][i], ph = Math.sin((walk + i * 0.5) * TAU) * 10 * (1 - sit);
      stroke([[lx, -30], [lx + ph, 0]], col, 11, { olw: 7 });
    }
    ctx.save(); ctx.rotate(-sit * 0.45);
    ell(0, -42, 56, 26, { fill: col, lw: 4.5 });
    for (let i = 0; i < 3; i++) stroke([[-20 + i * 16, -64], [-24 + i * 16, -48]], dk, 5, { ink: null });
    ctx.restore();
    const hx = 52 - sit * 16, hy = -66 - sit * 34;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(lookUp * 0.5);
    poly([[-24, -10], [-18, -40], [-4, -18]], { fill: col, lw: 4 });
    poly([[24, -10], [18, -40], [4, -18]], { fill: col, lw: 4 });
    ell(0, 0, 30, 26, { fill: col, lw: 4.5 });
    if (sit > 0.5) { stroke([[-14, -2], [-6, -6]], PAL.ink, 3.5, { ink: null }); stroke([[6, -6], [14, -2]], PAL.ink, 3.5, { ink: null }); }
    else { circle(-10, -3, 4, { fill: PAL.ink, stroke: null }); circle(10, -3, 4, { fill: PAL.ink, stroke: null }); }
    poly([[-4, 6], [4, 6], [0, 11]], { fill: PAL.pink, stroke: null });
    ctx.restore();
    ctx.restore();
  }

  /** A sepia wash with a round vignette, k 0..1: the doorway into the flashback. */
  function sepiaFade(k) {
    if (k <= 0) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = k; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = k * 0.8; ctx.fillStyle = '#E8C48E'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
    ctx.fillStyle = rgrad(W / 2, H / 2, H * 0.35, H * 0.95, [[0, 'rgba(60,36,16,0)'], [1, 'rgba(60,36,16,0.75)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---- 96.00 창문 속 히어로 ---------------------------------------------------------------------

  function hero(t, lt) {
    const HIT = 98.4;
    const heroK = easeOut(seg(t, 96.9, 97.9));
    const thumb = easeOut(seg(t, HIT - 0.2, HIT));
    const [sx, sy] = shakeXY(t, HIT, 10, 0.35);
    camBegin(lerp(1010, 1060, lt / 4.8) + sx, 520 + sy, lerp(1.06, 1.14, ease(lt / 4.8)), Math.sin(t * 1.9) * 0.006);
    // the car wall
    rrect(-300, -300, W + 600, H + 600, 0, { fill: '#6A5A9E', stroke: null });
    rrect(-300, 780, W + 600, 600, 0, { fill: '#584A8A', stroke: null });
    stroke([[-300, 40], [W + 300, 40]], '#C9CED8', 10, { olw: 6 });
    // the window
    const wx = 860, wy = 90, ww = 1000, wh = 720;
    rrect(wx - 16, wy - 16, ww + 32, wh + 32, 40, { fill: '#8A7CC0', lw: 6 });
    ctx.save(); rrectPath(wx, wy, ww, wh, 30); ctx.clip();
    cityRush(t, wx, wy, ww, wh, 3);
    // the reflection: first just a tired man, then someone else
    const rx = 1390, gy = 960, S = 1.15;
    ctx.save(); ctx.globalAlpha = 0.55 + heroK * 0.35;
    if (heroK > 0) {
      // cape
      const sy0 = gy - 290 * S, flap = Math.sin(t * 6) * 16;
      ctx.save(); ctx.globalAlpha *= heroK;
      smooth([[rx - 70 * S, sy0], [rx + 70 * S, sy0], [rx + (150 + flap * 0.4) * S, sy0 + 240 * S + flap], [rx + (100 + flap) * S, sy0 + 330 * S],
        [rx - 40 * S, sy0 + 340 * S], [rx - 110 * S, sy0 + 250 * S]], { fill: '#E0484E', lw: 6 });
      ctx.restore();
    }
    const aR = lerp(0.35, 1.9, thumb), eR = lerp(0.2, 1.0, thumb);
    person(rx, gy, S, {
      role: 'dad', t, flip: true, turn: 0.55, lookX: 1, shadow: false,
      aL: 2.9, eL: -0.15, aR, eR, eyes: t < 97.2 ? 'sleepy' : t < HIT ? 'determined' : 'happy', mouth: t < 97.2 ? 'flat' : 'grin',
      brows: t < HIT && t >= 97.2 ? 'angry' : undefined, bags: 0.6 * (1 - heroK),
      holdR: thumb > 0.3 ? (x, y) => thumbsUp(x, y - 10, 1.8 * clamp(thumb * 1.4) * (1 + 0.25 * Math.exp(-Math.max(0, t - HIT) * 6)), -0.15) : undefined,
    });
    if (heroK > 0) {
      ctx.save(); ctx.globalAlpha *= heroK;
      // the emblem
      const ey = gy - 215 * S;
      poly([[rx, ey - 44], [rx + 44, ey], [rx, ey + 44], [rx - 44, ey]], { fill: PAL.gold, lw: 5 });
      letter('아빠', rx, ey + 2, 26, '#E0484E', { lw: 0, shadow: null });
      // a mask over the eyes
      const hx = rx - 0.55 * 28 * S, hy = gy - 356 * S;
      ctx.save(); ctx.translate(hx, hy);
      smooth([[-86, -4], [-40, -26], [0, -14], [40, -26], [86, -4], [44, 22], [0, 10], [-44, 22]], { fill: '#E0484E', lw: 5 });
      for (const side of [-1, 1]) ell(side * 40, -2, 18, 13, { fill: '#FFFFFF', lw: 3.5 });
      for (const side of [-1, 1]) circle(side * 40 - 6, -2, 6, { fill: PAL.ink, stroke: null });
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
    // the hit: a burst of light in the glass
    const hk = t >= HIT ? Math.exp(-(t - HIT) * 3) : 0;
    if (hk > 0.01) {
      sunburst(rx - 120, 480, rgba('#FFF1B0', 0.35 * hk), rgba('#FFF1B0', 0), t * 0.5, 16, 900);
      sparkle(rx - 230, 380, 60 * hk + 10, '#FFFFFF', t);
      sparkle(rx - 60, 300, 30 * hk + 6, PAL.gold, -t);
    }
    // glass sheen
    for (let i = 0; i < 3; i++) {
      const x = wx + 120 + i * 300;
      poly([[x, wy], [x + 80 + i * 20, wy], [x - 260 + i * 20, wy + wh], [x - 340, wy + wh]], { fill: 'rgba(255,255,255,0.06)', stroke: null });
    }
    ctx.restore();
    rrect(wx, wy, ww, wh, 30, { fill: null, lw: 6 });
    // straps, the real man holding one
    const swing = Math.sin(t * 1.9) * 0.1;
    for (const sx2 of [180, 420, 1100, 1400, 1700]) strap(sx2, 40, swing);
    const ph = t < 98.9 ? { eyes: t < 96.6 ? 'sleepy' : t < 97.3 ? 'open' : 'wide', mouth: t < 97.3 ? 'flat' : 'o' }
      : { eyes: 'happy', mouth: 'smile', blush: 0.7 * seg(t, 98.9, 99.3) };
    const small = easeOut(seg(t, 99.8, 100.2));
    person(560, 1070, 1.15, {
      role: 'dad', t, turn: 0.55, lookX: 1, aL: 2.95, eL: -0.1, bags: 0.6,
      aR: lerp(0.3, 1.2, small), eR: lerp(0.2, 2.2, small),
      holdL: (x, y) => { ell(x, y - 20, 22, 26, { fill: null, stroke: PAL.ink, lw: 12 }); ell(x, y - 20, 22, 26, { fill: null, stroke: '#F2F2F6', lw: 6 }); stroke([[x, y - 46], [x, -2000]], '#E6E6EE', 8, { olw: 6 }); },
      holdR: small > 0.3 ? (x, y) => thumbsUp(x, y, 0.9 * small, 0.3) : (x, y) => briefcase(x - 4, y, 0.85),
      ...ph,
    });
    sfx('피식', 790, 520, 54, '#FFFFFF', t - 98.95, { life: 0.9, font: 'round' });
    camEnd();
    if (hk > 0.01) flash(hk * 0.18, '#FFF6D0');
    fillScreen('#2A1F5A', 0.1);
  }

  // ---- 100.80 언덕길: chicken, cake, and a long moon shadow --------------------------------------

  const slope = x => 830 - (x - 600) * 0.2;

  function hill(t, lt) {
    // he stops once to look back at the cat
    const pause = seg(t, 103.2, 103.4) * (1 - seg(t, 104.2, 104.4));
    const walkT = lt - clamp(lt - 2.4, 0, 1.0) * 0.8;
    const dadX = 520 + walkT * 95;
    const dy0 = slope(dadX);
    const cx = dadX + 140, cy = dy0 - 230;
    // sky, moon and the far blocks: screen space, they barely move
    skyFill([[0, '#101438'], [0.6, '#262C66'], [1, '#3E3A7A']]);
    stars(t, 90, 44, 1, H * 0.6);
    moon(1480, 170, 80);
    // the blocks up on the hill, dark, a window here and there still lit
    for (let i = 0; i < 9; i++) {
      const bw = 170 + hash(i, 81) * 60, bh = 170 + hash(i, 82) * 200, bx = -120 + i * 250 + hash(i, 83) * 40 - lt * 14;
      rrect(bx, 640 - bh, bw, bh + 200, 6, { fill: '#2E3470', stroke: null });
      rrect(bx - 6, 640 - bh - 14, bw + 12, 20, 5, { fill: '#262B60', stroke: null });
      for (let r = 0; r < Math.floor(bh / 46); r++) for (let c = 0; c < 4; c++) {
        const on = hash(i * 17 + r, c + 5) < 0.3;
        rrect(bx + 16 + c * (bw - 20) / 4, 640 - bh + 18 + r * 46, (bw - 20) / 4 - 14, 24, 3, { fill: on ? '#FFD98A' : '#3A4080', stroke: null });
      }
      if (i % 3 === 1) letter(`${104 + i}`, bx + bw / 2, 640 - bh + 40, 34, '#AEB4E0', { lw: 0, shadow: null });
    }
    camBegin(cx, cy, 1.0);
    // the hill: road and the bank below it
    const xa = cx - 1300, xb = cx + 1300;
    poly([[xa, slope(xa) - 30], [xb, slope(xb) - 30], [xb, 2400], [xa, 2400]], { fill: '#2C2A58', stroke: null });
    poly([[xa, slope(xa) - 30], [xb, slope(xb) - 30], [xb, slope(xb) + 70], [xa, slope(xa) + 70]], { fill: '#46447A', lw: 5 });
    for (let k = -3; k < 12; k++) {
      const x = 200 + k * 260;
      if (x < xa || x > xb) continue;
      stroke([[x, slope(x) + 20], [x + 110, slope(x + 110) + 20]], '#8C88B8', 6, { ink: null, alpha: 0.6 });
    }
    // a railing and streetlights along the far side
    stroke([[xa, slope(xa) - 110], [xb, slope(xb) - 110]], '#5B5E8A', 7, { ink: null });
    for (let k = -6; k < 20; k++) {
      const x = 40 + k * 90;
      if (x < xa || x > xb) continue;
      stroke([[x, slope(x) - 30], [x, slope(x) - 110]], '#5B5E8A', 7, { ink: null });
    }
    for (const lx of [180, 900, 1620]) streetlight(lx, slope(lx) - 30, 0.9, 1);

    // the long shadow, down the slope to the left (one flat shape so it never doubles up)
    const S = 1.0, ph = walkT * 0.85;
    ctx.save(); ctx.translate(dadX, dy0 + 20);
    ctx.transform(0.35, 0.28, 1.3, -0.24, 0, 0);
    ctx.beginPath();
    ctx.ellipse(0, -370 * S, 92, 90, 0, 0, TAU);
    ctx.rect(-72, -300, 144, 150);
    for (const side of [-1, 1]) {
      const a = Math.sin(ph * TAU) * 0.4 * side;
      ctx.moveTo(side * 30 - 17, -160); ctx.lineTo(side * 30 + 17, -160);
      ctx.lineTo(side * 30 + 17 + Math.sin(a) * 150, -6); ctx.lineTo(side * 30 - 17 + Math.sin(a) * 150, -6); ctx.closePath();
    }
    ctx.rect(-190, -170, 70, 120); ctx.rect(120, -170, 80, 110);
    ctx.fillStyle = 'rgba(10,8,30,0.4)'; ctx.fill('nonzero');
    ctx.restore();

    // the cat, trailing the smell of chicken
    const catX = dadX - 260, catSit = seg(t, 103.35, 103.5) * (1 - seg(t, 104.3, 104.45));
    cat(catX, slope(catX) + 22, 0.9, walkT * 1.6, catSit, catSit > 0.5 ? -1 : 0.2);
    if (catSit > 0.5) emote('music', catX + 40, slope(catX) - 140, 1, t);

    // dad, leaning into the hill
    const look = pause > 0.5;
    person(dadX, dy0 + 20, S, {
      role: 'dad', t, walk: look ? undefined : ph, rot: look ? 0.04 : 0.1, turn: look ? -0.6 : 0.35, lookX: look ? -1 : 0.6, lookY: look ? 0.6 : -0.2,
      eyes: look ? 'dot' : 'happy', mouth: look ? 'o' : 'smile', bags: 0.5, blush: 0.4,
      emote: !look && frac(lt / 2.4) > 0.5 ? 'sweat' : undefined, emoteK: 1,
      aL: 0.5, eL: -0.2, aR: 0.45, eR: -0.1,
      holdR: (x, y) => chickenBag(x, y, 0.9, t),
      holdL: (x, y) => cakeBox(x - 10, y, 0.85),
    });
    camEnd();
    fillScreen('#1A1440', 0.12);
  }

  // ---- 105.60 편의점 앞: soju with the moon ------------------------------------------------------

  function store(t, lt) {
    const PX = 1150, GY = 985, S = 1.0;
    const cam = kf(t, [[105.6, [1000, 590, 1.22]], [107.4, [1040, 600, 1.28]], [107.95, [1200, 640, 1.45]], [108.8, [1210, 630, 1.5]], [109.5, [1270, 560, 1.6]], [110.4, [1280, 555, 1.63]]], easeInOut);
    const [cx, cy, z] = cam;
    const [hsx, hsy] = shakeXY(t, 108.0, 5, 0.3);
    // the arm, through the shot
    let aR, eR;
    if (t < 107.5) { aR = -0.3; eR = 3.0; }
    else if (t < 108.75) { const k = easeInOut(seg(t, 107.5, 107.85)); aR = lerp(-0.3, 1.2, k); eR = lerp(3.0, 2.4, k); }
    else { const k = easeInOut(seg(t, 108.9, 109.6)); aR = lerp(1.2, 2.25, k); eR = lerp(2.4, 0.15, k); }
    const [hx, hy] = handR(PX, GY, S, aR, eR);
    const glassUp = t >= 108.9;
    const gx = glassUp ? hx + 2 : 1268, gyy = glassUp ? hy - 6 : 772;          // glass foot
    // sky and moon: far away, so the moon glides in the frame to sit beside the raised glass
    skyFill([[0, '#0F1238'], [0.7, '#2A2A68'], [1, '#403878']]);
    stars(t, 80, 61, 1, H * 0.7);
    const gsx = 960 + (gx - cx) * z, gsy = 540 + (gyy - 50 - cy) * z;
    const lock = easeInOut(seg(t, 109.0, 109.7));
    const mx = lerp(1560, gsx + 150, lock), my = lerp(230, gsy - 120, lock), mr = lerp(72, 95, lock);
    moon(mx, my, mr);
    const clink = t >= 109.8;
    if (clink) {
      // the moon smiles back
      const k = seg(t, 109.8, 110.0);
      ctx.save(); ctx.globalAlpha = k;
      stroke([[mx - 36, my - 6], [mx - 24, my - 16], [mx - 12, my - 6]], PAL.ink, 5, { ink: null, smooth: true });
      stroke([[mx + 12, my - 6], [mx + 24, my - 16], [mx + 36, my - 6]], PAL.ink, 5, { ink: null, smooth: true });
      stroke([[mx - 18, my + 20], [mx, my + 32], [mx + 18, my + 20]], PAL.ink, 5, { ink: null, smooth: true });
      ell(mx - 48, my + 14, 12, 7, { fill: rgba(PAL.blush, 0.7), stroke: null });
      ell(mx + 48, my + 14, 12, 7, { fill: rgba(PAL.blush, 0.7), stroke: null });
      ctx.restore();
    }
    camBegin(cx + hsx, cy + hsy, z);
    // far apartments on the right
    for (let i = 0; i < 5; i++) {
      const bx = 1560 + i * 190, bh = 160 + hash(i, 3) * 140;
      rrect(bx, 700 - bh, 160, bh + 40, 6, { fill: '#232860', stroke: null });
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) if (hash(i * 7 + r, c) < 0.3) rrect(bx + 20 + c * 46, 700 - bh + 24 + r * 44, 24, 22, 3, { fill: '#FFD98A', stroke: null });
    }
    // the store
    rrect(-300, 120, 1160, 760, 0, { fill: '#3A4070', lw: 6 });
    rrect(-300, 190, 1160, 110, 0, { fill: '#FFFFFF', lw: 6 });
    rrect(-300, 250, 1160, 20, 0, { fill: '#3FB6A8', stroke: null });
    rrect(-300, 270, 1160, 16, 0, { fill: '#FF9A3D', stroke: null });
    letter('편의점', 420, 228, 52, '#2E3A66', { lw: 0, shadow: null });
    letter('24', 700, 228, 44, '#FF9A3D', { lw: 0, shadow: null });
    rrect(-240, 340, 1040, 520, 6, { fill: '#EAF6FF', lw: 6 });
    glow(300, 600, 700, '#DDF2FF', 0.35);
    for (let r = 0; r < 3; r++) {
      rrect(-200, 440 + r * 130, 700, 14, 3, { fill: '#B9C6DA', stroke: null });
      for (let i = 0; i < 16; i++) rrect(-190 + i * 43, 440 + r * 130 - 50 - hash(i, r) * 20, 32, 50 + hash(i, r) * 20, 4, { fill: [PAL.red, PAL.gold, PAL.mint, PAL.blue, PAL.pink][(i + r * 2) % 5], stroke: null, alpha: 0.75 });
    }
    rrect(560, 380, 200, 480, 4, { fill: 'rgba(255,255,255,0.35)', lw: 5 });
    stroke([[660, 380], [660, 860]], PAL.ink, 4, { ink: null });
    // pavement
    rrect(-300, 860, 2600, 600, 0, { fill: '#4A4678', lw: 6 });
    for (let i = 0; i < 12; i++) stroke([[-300 + i * 240, 860], [-420 + i * 280, 1300]], '#57528A', 4, { ink: null });
    // his plastic chair and table
    rrect(PX - 110, 560, 220, 220, 30, { fill: '#3FA66A', lw: 5 });
    const eyesK = t < 107.5 ? { eyes: 'happy', mouth: 'o' } : t < 108.9 ? { eyes: 'open', mouth: 'smile', lookX: 1, lookY: 1 }
      : !clink ? { eyes: 'open', mouth: 'smile', lookX: 1, lookY: -1 } : { eyes: 'happy', mouth: 'grin', blush: 0.8 };
    person(PX, GY, S, {
      role: 'dad', t, turn: 0.3, looseTie: true, bags: 0.5, aL: 0.35, eL: 0.4, aR, eR,
      holdR: (x, y) => {
        if (t < 107.5) { // chopsticks
          stroke([[x - 6, y - 4], [x - 70, y - 60]], '#C99A5A', 6, { olw: 5 });
          stroke([[x + 4, y - 8], [x - 60, y - 70]], '#C99A5A', 6, { olw: 5 });
        } else if (t < 108.75) { // the bottle, tilted to pour
          sojuBottle(x + 10, y + 30, 0.9, -2.0 + (1 - seg(t, 107.7, 107.95)) * 1.4);
        } else if (glassUp) sojuGlass(x + 2, y - 6, 1.3, 1);
      },
      ...eyesK,
    });
    // the noodles, slurped on the beat
    if (t < 107.4) {
      const sl = frac((t - T_STORE) / 0.6), up = Math.sin(sl * Math.PI) * 30;
      for (let i = 0; i < 4; i++) {
        stroke([[1090 + i * 8, 740], [1100 + i * 10 + Math.sin(t * 9 + i) * 6, 700 - up], [PX + 14 + i * 5, 675 - up * 0.4]], '#FFE39A', 5, { ink: null, smooth: true });
      }
    }
    // table
    rrect(PX - 16, 780, 32, 190, 6, { fill: '#E6E6EE', lw: 5 });
    ell(PX, 776, 250, 40, { fill: '#F2F2F6', lw: 6 });
    // cup ramen, steaming
    rrect(1040, 700, 110, 78, 12, { fill: '#FFFFFF', lw: 5 });
    rrect(1040, 716, 110, 22, 0, { fill: '#E0484E', stroke: null });
    rrect(1040, 700, 110, 78, 12, { fill: null, lw: 5 });
    for (let i = 0; i < 3; i++) {
      const f = frac(t * 0.6 + i / 3);
      stroke([[1070 + i * 25, 690 - f * 90], [1080 + i * 25 + Math.sin(t * 3 + i) * 10, 660 - f * 90], [1070 + i * 25, 630 - f * 90]], '#FFFFFF', 5, { ink: null, smooth: true, alpha: Math.sin(f * Math.PI) * 0.6 });
    }
    if (t >= 108.75) sojuBottle(1340, 776, 0.6);
    if (!glassUp) {
      const fill = seg(t, 108.0, 108.5);
      sojuGlass(gx, gyy, 1.3, fill);
      if (t >= 108.0 && t < 108.6) {
        stroke([[gx - 10, gyy - 110], [gx, gyy - 20]], '#EAF6FF', 7, { ink: PAL.ink, olw: 4 });
        for (let i = 0; i < 4; i++) sparkle(gx + (i - 1.5) * 18, gyy - 64 - frac(t * 3 + i * 0.25) * 30, 7, '#FFFFFF', t * 3 + i);
      }
      // the moon floats in the glass
      if (t >= 108.4) circle(gx, gyy - 26, 9 * seg(t, 108.4, 108.7), { fill: '#FFF6D6', stroke: null });
    } else {
      circle(gx + 2, gyy - 32, 9, { fill: '#FFF6D6', stroke: null });
    }
    camEnd();
    if (clink) {
      const a = t - 109.8;
      const px = (gsx + mx) / 2 + 10, py = (gsy + my) / 2 + 20;
      ctx.save(); ctx.globalAlpha = clamp(1 - a / 0.6);
      for (let i = 0; i < 10; i++) {
        const an = i / 10 * TAU + 0.2, r0 = 30 + a * 260, r1 = 60 + a * 380;
        stroke([[px + Math.cos(an) * r0, py + Math.sin(an) * r0], [px + Math.cos(an) * r1, py + Math.sin(an) * r1]], PAL.gold, 6, { ink: null });
      }
      ctx.restore();
      sparkle(px, py, 50 * Math.exp(-a * 3) + 12, '#FFFFFF', a * 4);
      sfx('짠!', px - 170, py - 90, 110, PAL.gold, a, { life: 0.6, rot: -0.12 });
    }
    fillScreen('#1A1440', 0.08);
  }

  // ---- 110.40 엘리베이터: smile practice ----------------------------------------------------------

  function lift(t, lt) {
    const floor = Math.min(15, 1 + Math.floor(seg(t, 110.4, 113.4) * 14.999));
    const DING = 113.4;
    const open = easeInOut(seg(t, 113.55, 114.25));
    const push = ease(seg(t, 113.8, T_END));
    const DX = 1230, DY = 560;                      // the front door at the end of the corridor
    camBegin(lerp(960, DX, push), lerp(540, DY, push), lerp(1.0, 2.9, push));
    // the lift: steel walls
    rrect(-300, -300, W + 600, H + 600, 0, { fill: '#9EA3B8', stroke: null });
    for (let i = 0; i < 8; i++) rrect(-240 + i * 300, 20, 280, 1000, 6, { fill: '#AEB3C6', stroke: null });
    // the doors (behind him: we are the mirror)
    const fx0 = 900, fx1 = 1560, fy0 = 150, fy1 = 980;
    rrect(fx0 - 24, fy0 - 24, fx1 - fx0 + 48, fy1 - fy0 + 48, 10, { fill: '#7C8298', lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(fx0, fy0, fx1 - fx0, fy1 - fy0); ctx.clip();
    // the dark corridor out there
    rrect(fx0, fy0, fx1 - fx0, fy1 - fy0, 0, { fill: '#1A1834', stroke: null });
    poly([[fx0, fy1], [fx1, fy1], [DX + 120, DY + 110], [DX - 120, DY + 110]], { fill: '#26244A', stroke: null });
    poly([[fx0, fy0], [fx1, fy0], [DX + 120, DY - 140], [DX - 120, DY - 140]], { fill: '#141230', stroke: null });
    for (let i = 0; i < 3; i++) {
      const k = 0.25 + i * 0.22;
      const lx = lerp(fx0, DX - 120, k), rx = lerp(fx1, DX + 120, k), ty = lerp(fy0, DY - 140, k), by = lerp(fy1, DY + 110, k);
      stroke([[lx, lerp(ty, by, 0.25)], [lx, lerp(ty, by, 0.95)]], '#2E2C58', 6, { ink: null });
      stroke([[rx, lerp(ty, by, 0.25)], [rx, lerp(ty, by, 0.95)]], '#2E2C58', 6, { ink: null });
    }
    // the front door, warm light round its edges
    const warm = 0.4 + push * 0.6;
    glow(DX, DY + 20, 260, '#FFC878', 0.35 * warm);
    rrect(DX - 60, DY - 110, 120, 220, 6, { fill: '#5A4A6E', lw: 5 });
    stroke([[DX - 56, DY + 112], [DX + 56, DY + 112]], '#FFD98A', 5, { ink: null, alpha: warm });
    stroke([[DX + 62, DY - 104], [DX + 62, DY + 108]], '#FFD98A', 3, { ink: null, alpha: warm * 0.8 });
    circle(DX + 38, DY + 4, 7, { fill: PAL.gold, lw: 3 });
    rrect(DX - 28, DY - 84, 56, 22, 4, { fill: '#D9CFB8', lw: 3 });
    letter('1504', DX, DY - 73, 16, PAL.ink, { lw: 0, shadow: null });
    // the doors slide apart
    const half = (fx1 - fx0) / 2, off = open * half;
    for (const side of [-1, 1]) {
      const x = side < 0 ? fx0 - off : fx0 + half + off;
      rrect(x, fy0, half, fy1 - fy0, 0, { fill: '#C4C9DA', lw: 5 });
      stroke([[x + 40, fy0 + 40], [x + half - 60, fy0 + 200]], '#FFFFFF', 10, { ink: null, alpha: 0.3 });
    }
    ctx.restore();
    // the floor display above the doors
    rrect(1130, 40, 200, 86, 10, { fill: '#1E1A2E', lw: 5 });
    ctx.font = `64px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF6B6B'; ctx.fillText(String(floor), 1250, 86);
    if (t < DING) poly([[1165, 100], [1185, 66], [1205, 100]], { fill: rgba('#FF6B6B', 0.5 + 0.5 * pulse(t, 4)), stroke: null });
    glow(1230, 83, 140, '#FF5A5A', 0.25);
    // the handrail
    stroke([[-300, 760], [W + 300, 760]], '#DDE0EA', 14, { olw: 7 });

    // him, practising
    let o;
    if (t < 111.0) o = { eyes: 'sleepy', mouth: 'flat', bags: 0.9 };
    else if (t < 111.9) o = { eyes: 'sleepy', mouth: 'grin', aL: 0.5, eL: 2.6, aR: 0.5, eR: 2.6, bags: 0.9, push: true };
    else if (t < 112.6) o = { eyes: 'wide', mouth: 'grin', emote: 'sweat', emoteK: seg(t, 112.0, 112.2), bags: 0.8 };
    else if (t < 113.1) o = { eyes: 'closed', mouth: 'flat', headRot: Math.sin((t - 112.6) * 26) * 0.12, bags: 0.6 };
    else if (t < 113.6) o = { eyes: 'happy', mouth: 'smile', blush: 0.8, emote: 'sparkle', emoteK: seg(t, 113.1, 113.3), bags: 0.3 };
    else o = { eyes: 'open', mouth: 'smile', turn: 0.6, lookX: 1, blush: 0.6, bags: 0.3 };
    const nod = t >= 113.1 && t < 113.6 ? Math.sin((t - 113.1) * 12) * 0.05 : 0;
    person(640, 1235, 1.55, { role: 'dad', t, looseTie: true, rot: nod, aL: 0.3, aR: 0.25, eR: 0.3, ...o, holdR: o.aR ? undefined : (x, y) => briefcase(x - 4, y, 0.85) });
    // the fingers pushing the corners of his mouth up
    if (o.push) {
      const k = easeOut(seg(t, 111.0, 111.2)) * (1 - seg(t, 111.75, 111.9)), wig = Math.sin(t * 20) * 3;
      ctx.save(); ctx.translate(640, 1235); ctx.scale(1.55, 1.55);
      for (const side of [-1, 1]) {
        const ex = side * 98, ey = -272, hx = lerp(ex, side * 34, k), hy = lerp(-280, -300 + wig, k);
        stroke([[ex, ey], [hx, hy + 14]], '#4A4F63', 28, { olw: 9 });
        rrect(hx - 5 - side * 4, hy - 30, 11, 30, 5, { fill: PAL.skin, lw: 3.5 });
        circle(hx, hy + 8, 16, { fill: PAL.skin, lw: 4.5 });
      }
      ctx.restore();
    }
    // mirror sheen over everything: we are looking through a mirror
    ctx.save(); ctx.globalAlpha = 0.07;
    for (let i = 0; i < 3; i++) poly([[200 + i * 600, -100], [330 + i * 600, -100], [-100 + i * 600, 1200], [-230 + i * 600, 1200]], { fill: '#FFFFFF', stroke: null });
    ctx.restore();
    camEnd();
    sfx('띵~', 1560, 170, 90, PAL.gold, t - DING, { life: 0.8, font: 'round' });
    sepiaFade(easeIn(seg(t, 114.75, T_END)));
  }

  chapter('lasttrain', 96.0, 115.2, [[T_HERO, hero], [T_HILL, hill], [T_STORE, store], [T_LIFT, lift]]);
})();
