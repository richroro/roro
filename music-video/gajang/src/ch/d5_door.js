// d5_door: the bridge. A sepia memory of a rooftop and a guitar at twenty, the hallway mirror
// where that face melts into today's tired one, the front door opening onto warm light with a
// heartbeat, the little one running in slow motion into his arms on "아빠!", and the build that
// spins faster and faster until everything stops in white.
(() => {
  const B = SONG.beat;                 // 0.6 s
  const T_HB = 124.8, T_JUMP = 129.6, T_BUILD = 134.4, T_WHITE = 138.6;

  // ---- private helpers ------------------------------------------------------------------------

  function screen(fn) { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); }
  /** Pull the colour out of everything painted so far. */
  function desat(k) {
    if (k <= 0) return;
    screen(() => {
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp(k);
      ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, W + 20, H + 20);
    });
  }
  /** An old photograph: grey, then tinted brown, then warmed. */
  function sepia(k) {
    if (k <= 0) return;
    desat(k * 0.92);
    screen(() => {
      ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = '#A8733E'; ctx.fillRect(-10, -10, W + 20, H + 20);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.3 * k;
      ctx.fillStyle = '#FFD9A8'; ctx.fillRect(-10, -10, W + 20, H + 20);
    });
  }
  /** Film: dust specks, a scratch or two, a flicker and a round dark vignette. 12 fps. */
  function filmFx(t, k) {
    if (k <= 0) return;
    const f = Math.floor(t * 12);
    screen(() => {
      ctx.globalAlpha = k;
      ctx.fillStyle = rgrad(W / 2, H / 2, H * 0.36, H * 0.95, [[0, 'rgba(40,22,8,0)'], [0.7, 'rgba(40,22,8,0.45)'], [1, 'rgba(24,12,4,0.92)']]);
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) {
        const x = hash(i, f) * W, y = hash(i, f + 77) * H, r = 1.5 + hash(i, f + 5) * 4;
        ctx.globalAlpha = k * (0.35 + hash(i, f + 3) * 0.5);
        ctx.fillStyle = hash(i, f + 9) > 0.5 ? '#2A1A0C' : '#FFF4DC';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 2; i++) {
        if (hash(i, f + 31) > 0.55) continue;
        const x = hash(i, f + 40) * W;
        ctx.globalAlpha = k * 0.35; ctx.strokeStyle = '#FFF0D0'; ctx.lineWidth = 1.5 + hash(i, f) * 2;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (hash(i, f + 2) - 0.5) * 30, H); ctx.stroke();
      }
      ctx.globalAlpha = k * 0.06 * hash(f, 12); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    });
  }
  function edgeGlow(color, a, r0 = 0.35) {
    if (a <= 0.002) return;
    screen(() => {
      ctx.fillStyle = rgrad(W / 2, H / 2, H * r0, H * 1.05, [[0, rgba(color, 0)], [1, rgba(color, a)]]);
      ctx.fillRect(0, 0, W, H);
    });
  }
  /** The heartbeat: lub-dub on every beat from 124.8 for two bars. */
  function heartbeat(t) {
    if (t < T_HB || t > T_HB + 8 * B + 0.4) return 0;
    const p = (t - T_HB) / B, ph = frac(p + 1e-6);
    return Math.exp(-ph * 10) + (ph > 0.22 ? 0.6 * Math.exp(-(ph - 0.22) * 10) : 0);
  }
  /** World position of a grown-up's head centre (no dy, no rotation). */
  const headOf = (x, y, s, role = 'dad') => [x, y - 370 * s * ROLE[role].h];

  // An offscreen canvas to paint a figure on its own so it can be tinted (backlit silhouettes).
  let off = null;
  function layer(draw, tint, tintA) {
    if (!off || off.width !== cv.width || off.height !== cv.height) {
      off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
    }
    const main = ctx, oc = off.getContext('2d');
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalAlpha = 1; oc.globalCompositeOperation = 'source-over';
    oc.clearRect(0, 0, off.width, off.height);
    oc.setTransform(main.getTransform());
    ctx = oc;
    try { draw(); } finally { ctx = main; }
    if (tint && tintA > 0) {
      oc.save(); oc.setTransform(1, 0, 0, 1, 0, 0);
      oc.globalCompositeOperation = 'source-atop'; oc.globalAlpha = tintA; oc.fillStyle = tint;
      oc.fillRect(0, 0, off.width, off.height); oc.restore();
    }
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(off, 0, 0); main.restore();
  }

  /** 아빠 seen from behind: jacket, the back of his head (with the little thin spot on the crown). */
  function dadBack(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y);
    ell(0, 0, 110 * s, 18 * s, { fill: 'rgba(20,10,30,0.3)', stroke: null });
    ctx.scale(s, s); ctx.rotate(o.rot || 0);
    ctx.translate(0, o.crouch ? o.crouch * 30 : 0);
    const jacket = '#4A4F63', pants = '#3A3F52', hair = '#2B2733';
    const k = o.crouch || 0;
    const fL = limb(-30, -160, 0.08 + k * 0.25, 80, 76, -k * 0.5, pants, 34, -1);
    const fR = limb(30, -160, 0.08 + k * 0.25, 80, 76, -k * 0.5, pants, 34, 1);
    for (const [fx, fy] of [fL, fR]) ell(fx, fy + 6, 32, 15, { fill: '#2A2438', lw: 4.5 });
    // arms under the body when they hang, over it when they open
    const arm = (side, a, e) => {
      const h = limb(side * 68, -272, a, 66, 62, e, jacket, 28, side);
      circle(h[0], h[1], 16, { fill: PAL.skin, lw: 4.5 });
      return h;
    };
    let hL = null, hR = null;
    const aL = o.aL ?? 0.15, aR = o.aR ?? 0.15;
    if (aL < 1) hL = arm(-1, aL, o.eL ?? 0.1);
    if (aR < 1) hR = arm(1, aR, o.eR ?? 0.1);
    smooth([[-74, -286], [74, -286], [86, -230], [82, -150], [0, -140], [-82, -150], [-86, -230]], { fill: jacket, lw: 5 });
    stroke([[0, -270], [0, -150]], '#3C4054', 4, { ink: null });
    stroke([[-50, -270], [-40, -200]], '#5A6076', 5, { ink: null, alpha: 0.6 });
    poly([[-30, -294], [30, -294], [20, -276], [-20, -276]], { fill: '#F4F6FA', lw: 4 });
    rrect(-24, -330, 48, 44, 12, { fill: PAL.skin, lw: 4.5 });
    if (aL >= 1) hL = arm(-1, aL, o.eL ?? 0.1);
    if (aR >= 1) hR = arm(1, aR, o.eR ?? 0.1);
    // head from behind
    ctx.save(); ctx.translate(0, o.headDy || 0); ctx.rotate(o.headRot || 0);
    ell(-88, -366, 12, 19, { fill: PAL.skin, lw: 4.5 });
    ell(88, -366, 12, 19, { fill: PAL.skin, lw: 4.5 });
    ell(0, -374, 86, 90, { fill: PAL.skin, lw: 5 });
    ctx.save(); ellPath(0, -374, 86, 90); ctx.clip();
    smooth([[-96, -300], [-100, -420], [-40, -480], [40, -480], [100, -420], [96, -300], [60, -318], [0, -310], [-60, -318]], { fill: hair, stroke: null });
    stroke([[-84, -320], [-82, -380]], '#9A97A6', 9, { ink: null, alpha: 0.8 });
    stroke([[84, -320], [82, -380]], '#9A97A6', 9, { ink: null, alpha: 0.8 });
    ell(6, -438, 24, 14, { fill: mix(PAL.skin, hair, 0.45), stroke: null }, 0.2);
    ctx.restore();
    ell(0, -374, 86, 90, { lw: 5 });
    ctx.restore();
    if (o.holdR) o.holdR(hR[0], hR[1]);
    if (o.holdL) o.holdL(hL[0], hL[1]);
    ctx.restore();
  }

  /** A little stuffed dinosaur (the one he sleeps with). */
  function dinoToy(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    smooth([[-40, 10], [-30, -24], [0, -34], [26, -30], [40, -52], [62, -50], [66, -30], [48, -20], [44, 14], [20, 26], [-20, 26]], { fill: '#6FCB7A', lw: 4.5 });
    for (let i = 0; i < 3; i++) poly([[-26 + i * 18, -26], [-18 + i * 18, -44], [-10 + i * 18, -28]], { fill: '#FFC23D', lw: 3.5 });
    circle(56, -40, 4, { fill: PAL.ink, stroke: null });
    ctx.restore();
  }

  // ---- 115.20 · a rooftop at twenty, in sepia --------------------------------------------------

  function rooftopSet(tt) {
    skyFill([[0, '#F7B36A'], [0.45, '#F59A74'], [0.7, '#FFD49A'], [1, '#FFD49A']]);
    sun(1240, 640, 96, '#FFE08A');
    cloud(420, 240, 0.9, '#FFE3C2', { shade: false });
    cloud(1600, 180, 0.7, '#FFE3C2', { shade: false });
    // the town below, the evening coming in
    townRow(tt, 760, 40, { tone: '#D89A7A', far: true, seed: 7 });
    townRow(tt, 790, 260 + tt * 4, { tone: '#E0A080', far: true, seed: 3 });
    // railing
    rrect(-200, 700, W + 400, 16, 6, { fill: '#8A6A5A', lw: 4 });
    rrect(-200, 752, W + 400, 12, 6, { fill: '#8A6A5A', lw: 4 });
    for (let i = 0; i < 22; i++) stroke([[i * 96 - 20, 704], [i * 96 - 20, 800]], '#8A6A5A', 8, { olw: 6 });
    // roof floor
    rrect(-200, 790, W + 400, 400, 0, { fill: '#D9B892', lw: 5 });
    for (let i = 0; i < 6; i++) stroke([[i * 380 - 100, 800], [i * 380 - 400, 1080]], '#C4A07C', 3, { ink: null });
    // the green water tank every rooftop has
    stroke([[170, 800], [170, 640]], '#6A5040', 12, { olw: 7 });
    stroke([[330, 800], [330, 640]], '#6A5040', 12, { olw: 7 });
    rrect(120, 440, 260, 220, 40, { fill: '#5FA27A', lw: 6 });
    stroke([[130, 520], [370, 520]], '#4A8A64', 6, { ink: null });
    stroke([[130, 590], [370, 590]], '#4A8A64', 6, { ink: null });
    // a washing line with a shirt and his ROCK T-shirt drying
    const sw = Math.sin(tt * 2.2) * 0.06;
    stroke([[1480, 430], [1680, 462], [1900, 440]], '#6A5040', 3, { ink: null, smooth: true });
    ctx.save(); ctx.translate(1590, 450); ctx.rotate(sw);
    poly([[-60, 0], [60, 0], [74, 40], [44, 50], [44, 150], [-44, 150], [-44, 50], [-74, 40]], { fill: '#F2545B', lw: 4 });
    ctx.restore();
    ctx.save(); ctx.translate(1790, 452); ctx.rotate(-sw * 1.2);
    poly([[-50, 0], [50, 0], [62, 36], [38, 44], [38, 130], [-38, 130], [-38, 44], [-62, 36]], { fill: '#FFFFFF', lw: 4 });
    ctx.restore();
  }

  function crate(x, y, w, h, c = '#4E8EF7') {
    rrect(x - w / 2, y - h, w, h, 8, { fill: c, lw: 5 });
    for (let i = 1; i < 3; i++) stroke([[x - w / 2 + 10, y - h + i * h / 3], [x + w / 2 - 10, y - h + i * h / 3]], mix(c, PAL.ink, 0.3), 4, { ink: null });
    rrect(x - 26, y - h + 14, 52, 18, 8, { fill: mix(c, PAL.ink, 0.4), stroke: null });
  }

  function rooftop(t, lt, dur) {
    const tt = Math.floor(t * 12) / 12;          // twelve frames a second, like old film
    const weave = [hash(Math.floor(t * 12), 1) * 4 - 2, hash(Math.floor(t * 12), 2) * 4 - 2];
    const k = easeInOut(clamp((tt - 115.2) / dur));
    camBegin(930 + weave[0] + k * 30, 600 + weave[1] - k * 20, lerp(1.26, 1.4, k));
    rooftopSet(tt);
    const floorY = 930, beatPh = frac(beatOf(tt) + 1e-6), b = beatOf(tt);
    // the friend on the tambourine
    const fr = dance('sway', tt, 1);
    kid(470, 905, 1.12, {
      who: 'glasses', col: '#8A6A4A', t: tt, ...fr, eyes: 'happy', mouth: 'grin', blush: 0.3,
      aR: 2.2 + Math.sin(b * Math.PI) * 0.3, eR: -0.3, aL: 0.9, eL: 1.2,
      holdR: (x, y) => {
        ctx.save(); ctx.translate(x, y - 10); ctx.rotate(Math.sin(b * Math.PI * 2) * 0.3);
        ell(0, 0, 44, 44, { fill: '#F4E0B8', lw: 5 });
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; circle(Math.cos(a) * 44, Math.sin(a) * 44, 9, { fill: PAL.gold, lw: 3 }); }
        ctx.restore();
      },
    });
    // twenty years old, a guitar, and all the hair in the world
    const S = 1.02 * ROLE.young.h, ys = floorY + 71 * S, x0 = 960;
    crate(x0, floorY, 220, 160 * S - 60 * S + 12);
    const flip = tt >= 118.8 ? Math.exp(-(tt - 118.8) * 3) * Math.sin((tt - 118.8) * 9) : 0;
    const m = mood(tt, [[115.2, 'closed', 'open'], [116.4, 'happy', 'grin'], [117.6, 'closed', 'o'], [118.8, 'wink', 'grin', 'sparkle'], [119.5, 'happy', 'grin']]);
    const strum = Math.exp(-beatPh * 6) * (Math.floor(b) % 2 ? 1 : -1);
    let hLx = 0, hLy = 0;
    person(x0, ys, 1.02, {
      role: 'young', t: tt, sit: true, ...m, headRot: -0.1 * flip + Math.sin(b * Math.PI) * 0.04,
      emoteK: tt >= 118.8 ? m.emoteK : 0,
      aL: -0.1, eL: -0.6 + strum * 0.3, aR: 1.8, eR: -0.4,
      holdL: (x, y) => { hLx = x; hLy = y; },
      holdR: (x, y) => {
        guitar(-10, -178, 1.0, 1.18, '#E0484E');
        circle(x, y, 16, { fill: PAL.skin, lw: 4.5 });
        circle(hLx, hLy, 16, { fill: PAL.skin, lw: 4.5 });
      },
    });
    if (tt >= 118.8 && tt < 119.8) {
      const a = tt - 118.8;
      for (let i = 0; i < 4; i++) sparkle(x0 - 110 + i * 70, ys - 480 * S - 30 - a * 60 + hash(i, 3) * 40, 18 * (1 - a), '#FFFFFF', a * 4);
    }
    // 엄마 at twenty, listening
    const my = floorY + 71 * 0.94 * 0.98;
    crate(1380, floorY, 190, 110, '#F2C94C');
    person(1380, my, 0.98, {
      role: 'mom', t: tt, sit: true, eyes: tt > 118.9 ? 'heart' : 'happy', mouth: tt > 118.9 ? 'grin' : 'smile', blush: 0.8,
      rot: Math.sin(b * Math.PI) * 0.05, aL: 0.5, eL: 1.7, aR: 0.5, eR: 1.7,
      emote: tt > 118.9 ? 'heart' : null, emoteK: clamp((tt - 118.9) / 0.3),
    });
    // notes drifting up off the strings
    for (let i = 0; i < 6; i++) {
      const age = frac((tt - 115.2) / 1.8 + i / 6);
      letter(i % 2 ? '♪' : '♫', x0 + 40 + Math.sin(age * 5 + i) * 60 + i * 30, 620 - age * 420, 54, '#FFF6E0', { alpha: Math.sin(age * Math.PI) * 0.9, lw: 6 });
    }
    camEnd();
    sepia(1);
    filmFx(t, 1);
    // the projector starts, then the memory burns out warm
    const fin = seg(t, 115.2, 115.75);
    fillScreen('#140C06', (1 - fin) * (0.75 + 0.25 * hash(Math.floor(t * 24), 5)));
    fillScreen('#FFF1D8', easeIn(seg(t, 119.55, 120.0)) * 0.85);
  }

  // ---- 120.00 · the hallway mirror ------------------------------------------------------------

  function mirror(t, lt, dur) {
    const melt = easeInOut(seg(t, 120.8, 122.2));
    skyFill([[0, '#3A3040'], [1, '#2A2230']]);
    camBegin(960, 470, lerp(1.22, 1.32, ease(lt / dur)));
    // the wall, lit from above by the little sensor light in the entrance
    rrect(-100, -100, W + 200, H + 200, 0, { fill: '#5A4A52', stroke: null });
    for (let i = 0; i < 26; i++) stroke([[i * 80, -40], [i * 80, H + 40]], '#62525A', 10, { ink: null });
    glow(960, -40, 900, '#FFD08A', 0.35);
    const mx = 580, my = 60, mw = 760, mh = 870;
    rrect(mx - 34, my - 34, mw + 68, mh + 68, 44, { fill: '#8A6446', lw: 6 });
    rrect(mx - 14, my - 14, mw + 28, mh + 28, 30, { fill: '#6E4E36', lw: 4 });
    ctx.save(); rrectPath(mx, my, mw, mh, 24); ctx.clip();
    // what the mirror sees behind him: the dim hallway and the coat hook
    ctx.fillStyle = lgrad(0, my, 0, my + mh, [[0, '#6A6070'], [1, '#4A4050']]); ctx.fillRect(mx, my, mw, mh);
    rrect(mx + 60, my + 90, 140, 420, 8, { fill: '#5A5064', stroke: null });
    glow(960, my, 600, '#FFD08A', 0.25);
    const px = 960, py = 1275, ps = 2.1;
    // the face that was
    const young = (dx, dy, alpha) => person(px + dx, py + dy, ps * 0.98 / ROLE.young.h, {
      role: 'young', t, eyes: 'happy', mouth: 'grin', blush: 0.4, alpha, aL: 0.25, aR: 0.25, shadow: false,
    });
    // the face that is
    const hand = easeInOut(seg(t, 122.6, 123.15)) * (1 - easeInOut(seg(t, 124.2, 124.7)));
    const pat = t > 123.15 && t < 124.0 ? Math.sin((t - 123.15) * 18) * 0.08 : 0;
    const hairT = t - 123.55;
    const om = mood(t, [[120.8, 'open', 'o'], [122.3, 'open', 'flat'], [122.6, 'open', 'flat'], [123.6, 'open', 'wavy', 'sweat'], [124.25, 'closed', 'smile']]);
    const lookY = t < 122.6 ? 0 : t < 123.6 ? -1 : t < 124.25 ? clamp(-1 + hairT * 2.2, -1, 1) : 0;
    const old = (dx, dy, alpha) => person(px + dx, py + dy, ps, {
      role: 'dad', t, ...om, bags: 0.9, looseTie: true, blush: 0.12, alpha, shadow: false, brows: t > 122.6 && t < 124.25 ? 'worried' : null,
      lookY, lookX: t > 123.6 && t < 124.25 ? 0.4 : 0, emoteK: t > 123.6 && t < 124.25 ? om.emoteK : 0,
      eyes: Math.abs(t - 122.45) < 0.06 ? 'closed' : om.eyes,
      aL: 0.25, aR: lerp(0.25, 2.94, hand) + pat, eR: lerp(0.2, 0.5, hand),
    });
    if (melt <= 0) young(0, 0, 1);
    else if (melt >= 1) old(0, 0, 1);
    else {
      const n = 18, sh = mh / n, amp = Math.sin(melt * Math.PI);
      for (let i = 0; i < n; i++) {
        const y0 = my + i * sh;
        const dx = Math.sin(i * 0.9 + t * 9) * 46 * amp, dy = amp * (10 + hash(i, 4) * 26);
        ctx.save(); ctx.beginPath(); ctx.rect(mx, y0, mw, sh + 1); ctx.clip();
        young(dx, dy, 1 - melt);
        old(-dx * 0.6, dy * 0.5, melt);
        ctx.restore();
      }
    }
    // one hair lets go and drifts down past his nose
    if (hairT > 0 && t < 124.8) {
      const [hx, hy] = headOf(px, py, ps);
      const fx = hx + 150 - hairT * 70 + Math.sin(hairT * 5) * 40, fy = hy - 170 + hairT * 260;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(hairT * 4) * 0.8);
      stroke([[-34, 0], [-12, -10], [10, 6], [34, -4]], '#2B2733', 5, { ink: null, smooth: true });
      ctx.restore();
    }
    // the memory is sepia; the present is not
    sepia(1 - melt);
    // glass
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#DDEEFF';
    ctx.beginPath(); ctx.moveTo(mx + 480, my); ctx.lineTo(mx + 640, my); ctx.lineTo(mx + 300, my + mh); ctx.lineTo(mx + 140, my + mh); ctx.fill();
    ctx.beginPath(); ctx.moveTo(mx + 680, my); ctx.lineTo(mx + 720, my); ctx.lineTo(mx + 380, my + mh); ctx.lineTo(mx + 340, my + mh); ctx.fill();
    ctx.restore();
    fillScreen('#1A1428', 0.12);
    ctx.restore();
    rrectPath(mx, my, mw, mh, 24); paint({ lw: 5 });
    // keys and a tiny plant on the shoe cabinet below
    rrect(420, 944, 1080, 200, 10, { fill: '#B08A62', lw: 5 });
    camEnd();
    edgeGlow('#120C1C', 0.6);
    fillScreen('#FFF1D8', 0.85 * (1 - easeOut(seg(t, 120.0, 120.45))));
  }

  // ---- 124.80 · the door opens ----------------------------------------------------------------

  const DX0 = 800, DX1 = 1320, DY0 = 110, DY1 = 960, VPX = 1060, VPY = 520;
  const depth = (x, y, z) => [VPX + (x - VPX) * z, VPY + (y - VPY) * z];

  function interior(t, bright) {
    const z = 0.34;
    const [fx0, fy0] = depth(DX0, DY0, z), [fx1, fy1] = depth(DX1, DY1, z);
    // far room: the living room lamp
    rrect(fx0, fy0, fx1 - fx0, fy1 - fy0, 0, { fill: '#FFF0C4', stroke: null });
    glow((fx0 + fx1) / 2, (fy0 + fy1) / 2, 420, '#FFE6A0', 0.8 * bright);
    // walls, floor and ceiling of the hall
    poly([[DX0, DY0], [fx0, fy0], [fx0, fy1], [DX0, DY1]], { fill: '#F4D092', stroke: null });
    poly([[DX1, DY0], [fx1, fy0], [fx1, fy1], [DX1, DY1]], { fill: '#EFC482', stroke: null });
    poly([[DX0, DY0], [DX1, DY0], [fx1, fy0], [fx0, fy0]], { fill: '#FBE3B4', stroke: null });
    poly([[DX0, DY1], [DX1, DY1], [fx1, fy1], [fx0, fy1]], { fill: '#D69A62', stroke: null });
    for (let i = 1; i < 6; i++) {
      const x = lerp(DX0, DX1, i / 6);
      stroke([[x, DY1], depth(x, DY1, z)], '#C0844E', 3, { ink: null });
    }
    // a picture on the wall (crayon drawing of the family) and a coat hook
    const pic = [depth(DX0, 380, 0.62), depth(DX0, 520, 0.62), depth(DX0, 520, 0.5), depth(DX0, 380, 0.5)];
    poly(pic, { fill: '#FFFFFF', lw: 3 });
    circle(lerp(pic[0][0], pic[2][0], 0.5), lerp(pic[0][1], pic[2][1], 0.5), 12, { fill: PAL.sun, stroke: null });
    // the shoe step at the threshold
    const [sx0, sy0] = depth(DX0, DY1, 0.92), [sx1] = depth(DX1, DY1, 0.92);
    poly([[DX0, DY1], [DX1, DY1], [sx1, sy0], [sx0, sy0]], { fill: '#C9BFB2', stroke: null });
    glow(VPX, VPY + 80, 700, '#FFD98A', 0.35 * bright);
  }

  function doorOpen(t, lt, dur) {
    const hb = heartbeat(t);
    const open = easeInOut(seg(t, 124.95, 126.1));
    const k = ease(lt / dur);
    // the child: from the far room to the door and up into the air
    const run = seg(t, 125.9, 129.15);
    let z = lerp(0.34, 1.0, run);
    const leap = seg(t, 129.05, 129.6);
    z += leap * 0.42;
    camBegin(lerp(960, 1010, k), lerp(540, 560, k), lerp(1.0, 1.1, k) + hb * 0.012);
    // the corridor outside, dark
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#262434', stroke: null });
    rrect(-200, 960, W + 400, 400, 0, { fill: '#1C1A28', stroke: null });
    for (let i = 0; i < 8; i++) stroke([[i * 300 - 100, 960], [i * 300 - 400, 1200]], '#24222F', 4, { ink: null });
    interior(t, open);
    // the door, swinging in on its hinge
    if (open < 1) {
      const th = open * 1.35, zz = 1 / (1 + 0.9 * Math.sin(th));
      const fx = VPX + (DX0 + (DX1 - DX0) * Math.cos(th) - VPX) * zz;
      const top = VPY + (DY0 - VPY) * zz, bot = VPY + (DY1 - VPY) * zz;
      poly([[DX0, DY0], [fx, top], [fx, bot], [DX0, DY1]], { fill: '#5A6278', lw: 5 });
      const hx = lerp(DX0, fx, 0.86), hy = lerp(560, VPY + (560 - VPY) * zz, 0.86);
      rrect(hx - 14, hy - 60, 28 * Math.max(0.3, Math.cos(th)), 96, 8, { fill: '#2A2A34', lw: 3 });
      if (open <= 0) {
        // light leaks round the edges, the lock blinks green
        stroke([[DX1 - 4, DY0 + 10], [DX1 - 4, DY1 - 10]], '#FFD98A', 4, { ink: null, alpha: 0.7 });
        stroke([[DX0 + 10, DY1 - 3], [DX1 - 10, DY1 - 3]], '#FFD98A', 5, { ink: null, alpha: 0.8 });
        circle(hx, hy - 36, 6, { fill: t > 124.8 ? '#6FE38A' : '#FF6B6B', stroke: null });
      }
    }
    // door frame
    stroke([[DX0 - 16, DY1], [DX0 - 16, DY0 - 16], [DX1 + 16, DY0 - 16], [DX1 + 16, DY1]], '#3A3848', 24, { olw: 8 });
    // light spilling out across the corridor floor
    if (open > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 * open * (1 + hb * 0.5);
      ctx.fillStyle = lgrad(0, DY1, 0, H + 100, [[0, '#FFD98A'], [1, 'rgba(255,217,138,0)']]);
      ctx.beginPath(); ctx.moveTo(DX0, DY1); ctx.lineTo(DX1, DY1); ctx.lineTo(DX1 + 500, H + 100); ctx.lineTo(DX0 - 300, H + 100); ctx.fill();
      ctx.restore();
    }
    // dust in the light, drifting slowly
    for (let i = 0; i < 30; i++) {
      const x = lerp(DX0 - 80, DX1 + 120, hash(i, 1)) + Math.sin(t * 0.7 + i) * 30;
      const y = DY0 + frac(hash(i, 2) + t * 0.03) * (DY1 - DY0 + 200);
      circle(x, y, 2 + hash(i, 3) * 3, { fill: '#FFF3C8', stroke: null, alpha: 0.6 * open * (0.5 + 0.5 * Math.sin(t * 2 + i)) });
    }
    // the little one, in slow motion
    if (t > 125.9) {
      const [cx, cy] = depth(VPX - 20, DY1, z);
      const cs = 1.6 * z;
      const ph = (t - 125.9) * 0.62;
      const inAir = leap > 0;
      person(cx + Math.sin(ph * TAU) * 6 * z, cy - (inAir ? 0 : 0), cs, {
        role: 'child', t, walk: inAir ? undefined : ph, run: true,
        dy: inAir ? Math.sin(leap * Math.PI * 0.8) * 150 : 0,
        rot: inAir ? -0.05 : Math.sin(ph * TAU) * 0.04,
        eyes: inAir ? 'happy' : 'open', mouth: inAir ? 'open' : 'grin', blush: 0.9,
        aL: inAir ? 2.3 : undefined, aR: inAir ? 2.3 : undefined, eL: inAir ? 0.2 : undefined, eR: inAir ? 0.2 : undefined,
        lL: inAir ? 0.5 : undefined, lR: inAir ? 0.3 : undefined, kL: inAir ? 1.0 : undefined, kR: inAir ? 0.6 : undefined,
        holdL: inAir ? undefined : (x, y) => dinoToy(x - 10, y + 16, 0.9, 0.3 + Math.sin(ph * TAU) * 0.2),
        headDy: Math.sin(ph * TAU * 2) * 4,
      });
      if (inAir) dinoToy(cx - 180 * z, cy - 200 * z - leap * 120, 0.9 * z, -leap * 3);
    }
    // 아빠, from behind, lit by it
    const crouch = easeInOut(seg(t, 127.9, 128.7)) * 0.6;
    const armsOpen = easeInOut(seg(t, 128.2, 129.0));
    layer(() => dadBack(470, 1250, 1.6, {
      crouch, headRot: -0.04 + k * 0.03, headDy: -hb * 3,
      aL: lerp(0.12, 1.5, armsOpen), eL: lerp(0.1, -0.4, armsOpen), aR: lerp(0.12, 1.5, armsOpen), eR: lerp(0.1, -0.4, armsOpen),
      holdR: armsOpen < 0.5 ? (x, y) => briefcase(x - 20, y + 4, 1.0) : undefined,
    }), '#1C1426', lerp(0.55, 0.28, open));
    if (armsOpen >= 0.5) {
      const fall = seg(t, 128.6, 128.95);
      briefcase(lerp(560, 640, fall), lerp(1030, 1080, easeIn(fall)), 1.4, fall * 0.5);
    }
    glow(470, 700, 380, '#FFD98A', 0.22 * open);
    camEnd();
    // the heartbeat: warm on each thump, a dark edge otherwise
    edgeGlow('#0C0816', 0.6 - hb * 0.15);
    edgeGlow('#FF9A6A', 0.25 * hb, 0.5);
    if (t < 125.5) sfx('띠리릭', 1250, 330, 50, '#8FF0A8', t - 124.85, { life: 0.7, font: 'round', rot: -0.08 });
    fillScreen('#FFF6E0', 0.35 * easeIn(seg(t, 129.3, 129.6)));
  }

  // ---- 129.60 · "아빠!" -----------------------------------------------------------------------

  function homeHall(t) {
    // the entrance seen from inside: warm walls, the open door on the right, the living room on the left
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#F6DDA8', stroke: null });
    for (let i = 0; i < 30; i++) circle(hrange(-100, W, i, 1), hrange(80, 800, i, 2), 6, { fill: '#EFCF94', stroke: null });
    rrect(-200, 820, W + 400, 400, 0, { fill: '#D0955E', lw: 5 });
    for (let i = 0; i < 12; i++) stroke([[i * 190 - 60, 830], [i * 190 - 160, 1100]], '#BE844F', 4, { ink: null });
    // the living room doorway, glowing
    rrect(170, 180, 620, 660, 18, { fill: '#FFF2CC', lw: 6 });
    glow(480, 520, 520, '#FFE6A0', 0.7);
    // the front door open onto the dark corridor
    rrect(1560, 120, 420, 760, 6, { fill: '#2E2C3E', lw: 6 });
    poly([[1560, 120], [1700, 170], [1700, 830], [1560, 880]], { fill: '#5A6278', lw: 5 });
    // the shoe step
    rrect(1060, 900, 900, 220, 6, { fill: '#C9BFB2', lw: 5 });
    for (let i = 0; i < 3; i++) ell(1150 + i * 190, 925, 50, 16, { fill: ['#F2545B', '#4E8EF7', '#8E5A6A'][i], lw: 4 });
    // family pictures
    rrect(900, 250, 150, 120, 6, { fill: '#FFFFFF', lw: 4 });
    circle(950, 300, 18, { fill: PAL.skin, lw: 3 }); circle(1000, 310, 14, { fill: PAL.skin, lw: 3 });
    rrect(930, 400, 110, 90, 6, { fill: '#FFFFFF', lw: 4 });
    circle(985, 440, 16, { fill: PAL.sun, stroke: null });
    // the ceiling lamp
    glow(1200, 40, 700, '#FFE6A0', 0.45);
  }

  function hug(t, lt, dur) {
    const since = t - T_JUMP;
    const k = easeInOut(lt / dur);
    const [sx, sy] = shakeXY(t, T_JUMP, 14, 0.3);
    camBegin(lerp(1000, 1130, k) + sx, lerp(545, 520, k) + sy, lerp(1.0, 1.22, k));
    homeHall(t);
    // 엄마 and the big one, watching from the living room doorway
    const b = beatOf(t);
    const mm = mood(t, [[129.6, 'wide', 'o'], [130.2, 'happy', 'smile'], [131.4, 'happy', 'grin']]);
    person(400, 860, 0.8, {
      role: 'mom', t, ...mm, blush: 0.8, aL: 0.6, eL: 2.2, aR: 0.6, eR: 2.2, rot: Math.sin(b * Math.PI / 2) * 0.03,
      emote: t > 131.4 ? 'heart' : null, emoteK: clamp((t - 131.4) / 0.3),
    });
    const dm = mood(t, [[129.6, 'wide', 'o'], [130.4, 'happy', 'grin'], [132.0, 'wink', 'grin']]);
    kid(610, 868, 0.9, {
      who: 'pony', t, ...dm, blush: 0.6, aL: 0.3, aR: t > 132.0 ? 2.5 : 0.4, eR: t > 132.0 ? 0.7 : 0.3,
      holdR: t > 132.0 ? (x, y) => { rrect(x - 12, y - 44, 22, 34, 8, { fill: PAL.skin, lw: 4 }); } : undefined,
    });
    // 아빠 and the little one
    const dx = 1270, dyG = 1020, ds = 1.36;
    const land = clamp(0.55 + since / 0.3);
    const rock = Math.sin(t * 2.2) * 0.025;
    const sq = 0.09 * Math.exp(-since * 7) * Math.cos(since * 20);
    const dmood = mood(t, [[129.6, 'wide', 'o'], [129.95, 'happy', 'smile'], [131.3, 'happy', 'grin']]);
    person(dx, dyG, ds, {
      role: 'dad', t, ...dmood, sq, rot: -0.05 * Math.exp(-since * 5) + rock, bags: 0.5, looseTie: true, blush: 0.55,
      aL: 1.2, eL: 0.0, aR: lerp(0.25, 0.6, clamp(since / 0.4)), eR: lerp(0.2, -1.9, clamp(since / 0.4)),
    });
    // the briefcase lets go
    const bf = clamp(since / 0.4);
    briefcase(lerp(1400, 1470, bf), lerp(830, 930, easeIn(bf)), 1.3, bf * 0.35 - (bf >= 1 ? 0.35 - 0.05 * Math.exp(-(since - 0.4) * 12) * Math.sin((since - 0.4) * 30) : 0));
    if (since > 0.38 && since < 0.9) sfx('툭', 1520, 860, 46, '#FFFFFF', since - 0.38, { life: 0.5, font: 'round' });
    // the child, flying in from the left and landing on his chest
    const cx = lerp(820, 1110, easeOut(land)), cy = lerp(600, 745, easeOut(land)) + Math.sin(t * 2.2) * 3;
    const kick = Math.sin(t * 7) * 0.35;
    person(cx, cy, 1.3, {
      role: 'child', t, eyes: 'happy', mouth: since < 0.8 ? 'open' : 'grin', blush: 1, turn: 0.55,
      rot: lerp(-0.5, 0.12, easeOut(land)) + rock, shadow: false,
      aR: 2.5, eR: 0.5, aL: 1.9, eL: 0.4, lL: 0.5 + kick, lR: 0.3 - kick, kL: 0.8, kR: 0.8,
    });
    // his arm round the little one's back
    if (land >= 1) circle(1024, 712, 22, { fill: PAL.skin, lw: 5 });
    // a tear, caught in the light
    const [hx, hy] = headOf(dx, dyG, ds);
    const tearK = seg(t, 131.0, 131.5), trickle = seg(t, 131.6, 133.6);
    if (tearK > 0) {
      const tx = hx + 64 * ds, ty = hy + 18 * ds + trickle * 60;
      smooth([[tx, ty - 14], [tx + 9, ty + 4], [tx, ty + 11], [tx - 9, ty + 4]], { fill: '#BFE6FF', lw: 3.5, alpha: tearK });
      sparkle(tx + 4, ty - 8, 16 * tearK * (0.8 + 0.3 * Math.sin(t * 9)), '#FFFFFF', t);
    }
    // warmth: a burst at the hug, then hearts floating up
    if (since < 0.8) {
      ctx.save(); ctx.globalAlpha = 1 - since / 0.8;
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + 0.2, r0 = 170 + since * 300, r1 = r0 + 90;
        stroke([[1180 + Math.cos(a) * r0, 620 + Math.sin(a) * r0], [1180 + Math.cos(a) * r1, 620 + Math.sin(a) * r1]], '#FFFFFF', 8, { ink: null });
      }
      ctx.restore();
    }
    for (let i = 0; i < 7; i++) {
      const age = since - 0.3 - i * 0.55;
      if (age < 0 || age > 2.4) continue;
      const hxx = 1180 + (hash(i, 1) - 0.5) * 320 + Math.sin(age * 3 + i) * 20, hyy = 520 - age * 150;
      poly(heartPts(hxx, hyy, 18 + hash(i, 2) * 12), { fill: i % 2 ? PAL.pink : PAL.red, lw: 3.5, alpha: Math.sin(clamp(age / 2.4) * Math.PI) });
    }
    camEnd();
    glow(1180, 600, 700, '#FFE0A0', 0.3 * Math.exp(-since * 2) + 0.12);
    edgeGlow('#8A4A2A', 0.35);
    fillScreen('#FFF6E0', 0.45 * Math.exp(-since * 8));
  }

  // ---- 134.40 · round and round, into white -----------------------------------------------------

  function spin(t0, lt, dur) {
    const white = t0 >= T_WHITE;
    const t = Math.min(t0, T_WHITE);               // the white beat holds perfectly still
    const u = t - T_BUILD;
    const turns = 0.3 * u + 0.19 * u * u;           // accelerating
    const camRot = Math.sin(u * 2.2) * 0.04 * u;
    const bgRot = TAU * (0.05 * u * u + 0.02 * u * u * u);
    const hb = pulse(t, 8);
    const rays = clamp(u / 3.6);
    rrect(-100, -100, W + 200, H + 200, 0, { fill: mix('#F6DDA8', '#FFE9B8', rays), stroke: null });
    camBegin(960, 620, lerp(1.25, 1.45, easeIn(clamp(u / 4.2))) + hb * 0.01, camRot);
    // the room smears into turning light
    ctx.save(); ctx.globalAlpha = 1 - rays * 0.8;
    ctx.translate(960, 640); ctx.rotate(bgRot); ctx.scale(1.3, 1.3); ctx.translate(-1180, -560);
    homeHall(t);
    ctx.restore();
    sunburst(960, 600, rgba('#FFFFFF', 0.5), rgba('#FFD98A', 0.35), bgRot * 1.3, 20, 2000, rays);
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + bgRot * (1 + hash(i, 1) * 0.5), r = 420 + hash(i, 2) * 400;
      circle(960 + Math.cos(a) * r, 600 + Math.sin(a) * r * 0.7, 20 + hash(i, 3) * 40, { fill: '#FFFFFF', stroke: null, alpha: 0.35 * rays });
    }
    const pair = (ph, alpha) => {
      const c = Math.cos(ph * TAU), sxk = Math.sign(c || 1) * Math.max(0.1, Math.abs(c));
      ctx.save(); ctx.translate(960, 0); ctx.scale(sxk, 1); ctx.translate(-960, 0); ctx.globalAlpha *= alpha;
      const lift = easeOut(clamp(u / 0.8));
      person(960, 1040, 1.35, {
        role: 'dad', t, eyes: 'happy', mouth: 'grin', blush: 0.7, looseTie: true, shadow: false,
        aL: lerp(0.6, 1.35, lift), eL: lerp(0.3, 0.75, lift), aR: lerp(0.6, 1.35, lift), eR: lerp(0.3, 0.75, lift),
      });
      // the little one flying like an aeroplane in front of him
      ctx.save(); ctx.translate(960, 1040 - 1.35 * lerp(200, 300, lift)); ctx.rotate(lerp(0.1, -1.35, lift));
      const cs = 1.25;
      person(0, 165 * 0.58 * cs, cs, {
        role: 'child', t, eyes: 'happy', mouth: 'open', blush: 1, shadow: false,
        aL: 2.1, aR: 2.1, eL: 0.1, eR: 0.1, lL: 0.25 + Math.sin(t * 9) * 0.2, lR: 0.25 - Math.sin(t * 9) * 0.2,
      });
      ctx.restore();
      ctx.restore();
    };
    if (!white) {
      pair(turns - 0.05 * rays, 0.25 * rays);
      pair(turns - 0.025 * rays, 0.35 * rays);
    }
    pair(white ? Math.round(turns) : turns, 1);
    camEnd();
    speedLines(t, 960, 560, clamp((u - 1.2) / 2.5), '#FFFFFF', 60, 3);
    edgeGlow('#FFFFFF', 0.5 * rays);
    // everything goes white, and holds still for one beat
    if (!white) fillScreen('#FFFFFF', easeIn(seg(t, 137.7, T_WHITE)) * 0.97);
    else {
      fillScreen('#FFFFFF', 0.94);
      KARAOKE.hidden = true;
    }
  }

  chapter('door', 115.2, 139.2, [
    [115.2, rooftop],
    [120.0, mirror],
    [124.8, doorOpen],
    [129.6, hug],
    [134.4, spin],
  ]);
})();
