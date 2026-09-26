// b2_drop (28.44 – 60.44): the build and the first drop. The room's lights blink on every beat while
// 부장님 puffs himself up and sweats and the camera creeps in on the little one's deadpan face; the
// last bar freezes and irises to black. On the drop the tiny shades snap on: the room strobes lime
// and black, the speakers thump, the little one just shrugs his shoulders on the beat while his
// shadow on the wall is a giant monster. Then one flick of the tie sends 부장님 spinning like a top.
//
// Uses the kit that b1_tough.js puts on window.BG12.
(() => {
  const K = window.BG12;
  const { LIME, PINK, BLK, lbeat, snapPulse, screen, personSpace, shades, lolly, littleOne, boss, toyBox, room, speaker } = K;
  const B = SONG.beat, BAR = SONG.bar;
  const T0 = bgT(16), T_PUFF = bgT(18), T_PUSH = bgT(20), T_FREEZE = bgT(23), T_DARK = bgT(23, 2);
  const T_DROP = bgT(24), T_WIDE = bgT(25), T_FLICK = bgT(29), T_END = bgT(34);

  // ---- helpers ------------------------------------------------------------------------------------

  /** Room lights that blink on every beat: 1 on the beat, down to `low` by the next. */
  const blink = (t, low = 0.2) => low + (1 - low) * Math.exp(-frac(bgBeat(t) + 1e-6) * 3.2);

  /** Screen squash and stretch around the centre; k > 0 squashes (wide), k < 0 stretches (tall). */
  function squashBegin(k) {
    ctx.save();
    ctx.translate(W / 2, H * 0.62); ctx.scale(1 + k, 1 - k); ctx.translate(-W / 2, -H * 0.62);
  }

  /** Sweat drops flying off a head at (x, y), scale s. */
  function sweatSpray(t, x, y, s, amt = 1, seed = 0) {
    const n = Math.round(3 + amt * 5);
    for (let i = 0; i < n; i++) {
      const a = frac(t * (1.1 + hash(i, seed) * 0.8) + hash(i, seed + 1));
      const side = hash(i, seed + 2) > 0.5 ? 1 : -1, sp = 120 + hash(i, seed + 3) * 160;
      const px = x + side * (60 + a * sp) * s, py = y - 40 * s + (-a * 160 + a * a * 420) * s;
      ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.globalAlpha *= 1 - a;
      smooth([[0, -18], [10, 4], [0, 14], [-10, 4]], { fill: '#8FD3FF', lw: 3.5 });
      ctx.restore();
    }
  }

  /** The boss, puffed up by k (0..1) around his chest. */
  function puffBoss(x, y, s, t, k, o = {}) {
    const cy = y - 250 * s;
    ctx.save();
    ctx.translate(x, cy); ctx.scale(1 + k * 0.6, 1 + k * 0.08); ctx.translate(-x, -cy);
    boss(x, y, s, t, { shades: true, ...o });
    ctx.restore();
  }

  /** The little one in the toy box, head and shoulders out. Returns the face's world centre. */
  function kidInBox(t, bx, by, s, o = {}) {
    const bw = 360 * s / 1.25, bh = 230 * s / 1.25;
    const cy = by - (880 - 735) * s / 1.25 - 0;
    toyBox(bx, by, bw, bh, 0.8, () => {
      littleOne(bx + 10 * s, cy, s, t, { shadow: false, turn: -0.2, lookX: -0.8, eyes: 'sleepy', aL: 0.2, aR: 0.2, ...o });
    });
    return [bx + 10 * s, cy - 300 * 0.58 * s];
  }

  /** A giant monster shadow on the wall: the little one, if the little one were a monster. */
  function monster(cx, baseY, s, sh, col, eyeCol, t, eyeGlow = 1) {
    ctx.save(); ctx.translate(cx, baseY); ctx.scale(s, s);
    ctx.rotate(sh * 0.05);
    const F = { fill: col, stroke: null };
    // body and shoulders (the shoulders jerk up on the beat)
    smooth([[-300, 20], [-320, -220], [-270, -400 - sh * 30], [-120, -470], [120, -470], [270, -400 + sh * 30], [320, -220], [300, 20]], F);
    // the club (the lollipop, as the wall sees it)
    ctx.save(); ctx.translate(300, -330 + sh * 30); ctx.rotate(-0.5 + sh * 0.08);
    rrect(-18, -330, 36, 360, 14, F);
    circle(0, -400, 120, F);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; poly([[Math.cos(a - 0.2) * 110, -400 + Math.sin(a - 0.2) * 110], [Math.cos(a) * 175, -400 + Math.sin(a) * 175], [Math.cos(a + 0.2) * 110, -400 + Math.sin(a + 0.2) * 110]], F); }
    ctx.restore();
    // the other arm, claws up
    ctx.save(); ctx.translate(-280, -360 - sh * 30); ctx.rotate(-0.4 - sh * 0.1);
    rrect(-40, -300, 80, 320, 40, F);
    for (let i = -1; i <= 1; i++) poly([[i * 34 - 18, -280], [i * 46, -390 - (i === 0 ? 30 : 0)], [i * 34 + 18, -280]], F);
    ctx.restore();
    // head with horns and spikes
    const hy = -640;
    circle(0, hy, 230, F);
    for (const side of [-1, 1]) {
      smooth([[side * 110, hy - 170], [side * 190, hy - 330], [side * 300, hy - 420], [side * 250, hy - 300], [side * 200, hy - 160]], F);
    }
    for (let i = -2; i <= 2; i++) poly([[i * 60 - 30, hy - 210], [i * 60, hy - 290 - (2 - Math.abs(i)) * 20], [i * 60 + 30, hy - 210]], F);
    // glowing shades for eyes
    ctx.save(); ctx.shadowColor = eyeCol; ctx.shadowBlur = 50 * eyeGlow;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      const ex = side * 95, ey = hy - 40, w = 150, h = 90;
      ctx.moveTo(ex - w / 2, ey); ctx.lineTo(ex + w / 2, ey);
      ctx.quadraticCurveTo(ex + w / 2, ey + h, ex, ey + h); ctx.quadraticCurveTo(ex - w / 2, ey + h, ex - w / 2, ey); ctx.closePath();
      ctx.fillStyle = eyeCol; ctx.fill();
    }
    // a jagged grin
    const g = [];
    for (let i = 0; i <= 12; i++) g.push([-140 + i * 280 / 12, hy + 110 + (i % 2 ? 36 : 0)]);
    for (let i = 12; i >= 0; i--) g.push([-140 + i * 280 / 12, hy + 150 + (i % 2 ? 0 : 30) + Math.sin(i / 12 * Math.PI) * 40]);
    ctx.shadowBlur = 20 * eyeGlow;
    polyPath(g); ctx.fillStyle = eyeCol; ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ---- 28.44 · the build: lights blink, 부장님 puffs up, the little one watches ----------------------

  function buildWide(t, lt) {
    const lit = blink(t), lb = lbeat(t, T0);
    const k = easeInOut(clamp(lt / (T_PUFF - T0)));
    camBegin(lerp(1180, 1260, k), lerp(560, 570, k), lerp(1.18, 1.3, k));
    room(t, { lit, floorY: 830, on1: lit, on2: 1 - lit * 0.6 });
    // 부장님: chest out, fists on hips, getting bigger, beginning to sweat
    const puff = 0.1 + 0.25 * k + 0.04 * bgPulse(t, 5);
    puffBoss(800, 890, 1.08, t, puff, {
      aL: 0.55, eL: -1.4, aR: 0.55, eR: -1.4, rot: -0.03, turn: 0.35, lookX: 1,
      mouth: 'flat', blush: 0.3 + k * 0.4, emote: lb > 4 ? 'sweat' : null, emoteK: clamp((lb - 4) / 0.5),
      dy: bgHop(t) * 4,
    });
    if (lb > 4) sweatSpray(t, 830, 890 - 480, 1.08, k * 0.5, 3);
    // the little one in the box: sucks the lollipop, eyes on him
    kidInBox(t, 1430, 880, 1.25, { lookX: -1, wig: Math.floor(lb) % 2 ? 0.12 : -0.08 });
    camEnd();
    // the room goes dark between beats
    fillScreen('#07030C', (1 - lit) * 0.45);
  }

  function buildPuff(t, lt) {
    const lit = blink(t), lb = lbeat(t, T_PUFF), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    // the room, close on 부장님
    camBegin(900, 470, 1.9);
    room(t, { lit, floorY: 830, on1: lit, on2: 1 - lit * 0.6, sofaX: 60 });
    // he pumps up one notch a beat, like a balloon
    const notch = Math.min(n, 7) + easeOut(clamp(f / 0.2));
    const puff = 0.35 + 0.075 * notch;
    const pop = lb >= 7.2;
    puffBoss(930, 900, 1.08, t, puff, {
      aL: 0.55, eL: -1.4, aR: 0.55, eR: -1.4, rot: -0.03 + Math.sin(t * 40) * 0.004 * notch, turn: 0.2,
      mouth: notch > 4 ? 'wavy' : 'flat', blush: 0.6 + notch * 0.05, emote: 'sweat', emoteK: 1, dy: -notch * 0.5,
      sq: -0.02 * bgPulse(t, 6),
    });
    sweatSpray(t, 950, 900 - 470, 1.08, 0.4 + notch * 0.1, 5);
    // a shirt button gives up on the last beat
    if (pop) {
      const a = (lb - 7.2) * B;
      const bx = 930 + a * 900, by = 900 - 230 + (-a * 900 + a * a * 2400);
      circle(bx, by, 20, { fill: '#FFFFFF', lw: 5 });
      circle(bx - 5, by, 4, { fill: PAL.ink, stroke: null }); circle(bx + 5, by, 4, { fill: PAL.ink, stroke: null });
      sfx('핑!', 1120, 560, 60, '#FFFFFF', a, { life: 0.5, rot: 0.1 });
    }
    camEnd();
    // a pump gauge in the corner, one notch a beat
    const gx = 1700, gy = 820;
    circle(gx, gy, 120, { fill: '#1A1024', lw: 7 });
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
      stroke([[gx + Math.cos(a) * 90, gy + Math.sin(a) * 90], [gx + Math.cos(a) * 106, gy + Math.sin(a) * 106]], i > 5 ? PINK : LIME, 6, { ink: null });
    }
    const na = Math.PI * 0.75 + (notch / 8) * Math.PI * 1.5 + Math.sin(t * 50) * 0.03 * notch / 8;
    stroke([[gx, gy], [gx + Math.cos(na) * 88, gy + Math.sin(na) * 88]], '#FFFFFF', 8, { olw: 6 });
    circle(gx, gy, 14, { fill: PINK, lw: 4 });
    letter('허세', gx, gy + 60, 40, '#FFFFFF', { font: 'round', lw: 5 });
    fillScreen('#07030C', (1 - lit) * 0.45);
  }

  // ---- 35.56 · the camera creeps toward the little one's face ------------------------------------------

  function pushState(t) {
    const lb = lbeat(t, T_PUSH), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    const step = (Math.min(n, 12) + easeOut(clamp(f / 0.3))) / 12;
    return { lb, n, f, zoom: lerp(1.25, 4.4, easeIn(clamp(step))) };
  }
  function kidClose(t, zoom, lit, o = {}) {
    const bx = 1430, by = 880, s = 1.25;
    const face = [bx + 12, by - 145 - 300 * 0.58 * s + 8];
    camBegin(lerp(1250, face[0], clamp((zoom - 1.25) / 1.5)), lerp(590, face[1], clamp((zoom - 1.25) / 1.5)), zoom);
    room(t, { lit, floorY: 830, on1: lit, on2: 1 - lit * 0.6 });
    kidInBox(t, bx, by, s, { lookX: o.lookX ?? -0.4, lookY: 0, turn: o.turn ?? -0.1, brows: o.brows, wig: o.wig || 0 });
    // a rim of neon on the face, alternating lime and pink on the beat
    if (o.rim !== false) glow(face[0] - 70, face[1] - 20, 160, o.rimCol || LIME, 0.35 * lit);
    camEnd();
  }
  function buildPush(t, lt) {
    const lit = blink(t, 0.3);
    const { n, lb, zoom } = pushState(t);
    const col = n % 2 ? PINK : LIME;
    kidClose(t, zoom, lit, { rimCol: col, wig: (n % 2 ? 1 : -1) * 0.14, lookX: lb > 8 ? 0 : -0.5, turn: lb > 8 ? 0 : -0.15 });
    fillScreen('#07030C', (1 - lit) * 0.4);
    // 부장님's sweat drops falling past the lens, once we're close
    for (let i = 0; i < 3; i++) {
      const a = frac(lb * 0.35 + i / 3);
      if (lb > 3) {
        ctx.save(); ctx.translate(200 + i * 160 + hash(i, 4) * 60, -80 + a * 1300); ctx.scale(2.5, 2.5); ctx.globalAlpha *= 0.55;
        smooth([[0, -18], [10, 4], [0, 14], [-10, 4]], { fill: '#8FD3FF', lw: 3.5 });
        ctx.restore();
      }
    }
  }

  // ---- 40.89 · the last bar: freeze, iris to black ---------------------------------------------------

  function freeze(t, lt) {
    if (t < T_DARK) {
      const tt = T_FREEZE - 0.01, { zoom } = pushState(tt);
      kidClose(tt, zoom, 0.55, { rimCol: PINK, wig: 0, lookX: 0, turn: 0 });
      fillScreen('#07030C', 0.25);
      // everything holds still; the frame closes on the face
      const k = easeIn(seg(t, T_FREEZE + B * 0.5, T_DARK));
      iris(W / 2, H / 2 - 20, lerp(1300, 0, k), '#000000');
    } else {
      fillScreen('#000000');
      // two tiny glints in the dark, just before the drop
      const g = seg(t, T_DROP - B * 0.5, T_DROP);
      if (g > 0) { sparkle(862, 500, 70 * g, LIME, g); sparkle(1058, 500, 70 * g, LIME, g); }
    }
  }

  // ---- 42.67 · THE DROP: the shades go on ------------------------------------------------------------

  /** Flashing background: lime and black swapping on every beat. */
  const strobe = t => bgBeatN(t) % 2 === 0;

  function dropHit(t, lt) {
    const lb = lbeat(t, T_DROP), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    const on = strobe(t);
    fillScreen(on ? LIME : BLK);
    sunburst(W / 2, 520, on ? rgba('#FFFFFF', 0.28) : rgba(PINK, 0.35), 'rgba(0,0,0,0)', t * 0.6, 16);
    // the face pulls back a notch each beat
    const step = (n + easeOut(clamp(f / 0.25))) / 4;
    const s = lerp(6.4, 3.4, easeOut(clamp(step)));
    const face = lerp(600, 470, clamp(step)), ground = face + 300 * 0.58 * s;
    const slam = clamp(lt / 0.06);
    const shK = slam < 1 ? slam : 1;
    const tick = n % 2 ? 1 : -1;
    const shrug = bgPulse(t, 5);
    const [sx, sy] = shakeXY(t, T_DROP, 30, 0.4);
    littleOne(W / 2 + sx, ground + sy - shrug * 20 * s / 4, s, t, {
      shadow: false, eyes: 'sleepy', shades: shK, glint: clamp((lt - 0.1) / 0.4), lookX: 0,
      rot: tick * 0.04 * shrug, headRot: -tick * 0.05 * shrug, aL: 0.3 + (tick < 0 ? 0.3 : 0) * shrug, aR: 0.3 + (tick > 0 ? 0.3 : 0) * shrug,
      sq: lt < 0.12 ? 0.05 * (1 - lt / 0.12) : 0, wig: tick * 0.1, blush: 0.4,
    });
    // shock rings off the slam
    for (let i = 0; i < 3; i++) {
      const a = lt - i * 0.08;
      if (a > 0 && a < 0.6) circle(W / 2, face, 200 + a * 1600, { fill: null, stroke: rgba(on ? BLK : LIME, 1 - a / 0.6), lw: 16 - i * 4 });
    }
    sfx('척!', 1480, 260, 180, on ? PINK : LIME, lt, { life: 1.2, rot: 0.12 });
    flash(0.55 * (1 - clamp(lt / 0.15)), '#FFFFFF');
  }

  function dropWide(t, lt) {
    const lb = lbeat(t, T_WIDE), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    const on = strobe(t), thump = bgPulse(t, 6), tick = n % 2 ? 1 : -1;
    // a zoom punch on each downbeat
    const punch = n % 4 === 0 ? Math.exp(-f * 5) * 0.04 : 0;
    const [sx, sy] = shakeXY(t, T_WIDE + n * B, 8, 0.2);
    camBegin(W / 2 + sx, H / 2 + sy, 1 + punch);
    // the wall and floor
    fillScreen(on ? LIME : BLK);
    const floorY = 860;
    rrect(-200, floorY, W + 400, 400, 0, { fill: on ? '#141016' : '#1E0A26', stroke: null });
    stroke([[-200, floorY], [W + 200, floorY]], on ? BLK : PINK, 8, { ink: null });
    // the shadow on the wall
    monster(W / 2 + 20, floorY + 20, 1.12, tick * thump, on ? BLK : '#2A0B3A', on ? PINK : PINK, t, on ? 0.6 : 1);
    // speakers, thumping
    speaker(230, floorY + 20, 1.25, thump, t);
    speaker(1690, floorY + 20, 1.25, thump, t);
    if (n % 4 === 0) sfx('쿵', n % 8 === 0 ? 230 : 1690, 260, 110, on ? PINK : LIME, f * B, { life: 0.44 });
    // 부장님, peeking from behind the right speaker, shaking
    const seen = lb >= 8;
    const peek = easeOut(clamp((lb - 1) / 1.5));
    person(1540 + (1 - peek) * 200 + Math.sin(t * 60) * 3, floorY + 30, 0.95, {
      role: 'boss', t, turn: -0.6, lookX: -1, lookY: -0.8, eyes: seen ? 'wide' : 'open', mouth: seen ? 'wavy' : 'o', brows: 'worried',
      aL: 1.2, eL: 1.8, aR: 0.4, eR: 0.9, emote: seen ? null : 'sweat', emoteK: 1,
    });
    speaker(1690, floorY + 20, 1.25, thump, t);
    if (seen) letter('!?', 1420 + (1 - peek) * 200, 380, 110, on ? PINK : LIME, { pop: clamp((lb - 8) / 0.3), rot: -0.15 });
    // the little one on the toy box: just his shoulders, tick, tock
    toyBox(960, floorY + 20, 380, 220, 0, null, { label: true });
    const shrug = bgPulse(t, 5);
    littleOne(960, floorY + 20 - 220 - 20, 1.45, t, {
      shades: true, glint: f < 0.4 ? f / 0.4 : 0, eyes: 'sleepy', lookX: 0,
      rot: tick * 0.05 * shrug, headRot: -tick * 0.06 * shrug, dy: shrug * 6,
      aL: 0.28 + (tick < 0 ? 0.35 : 0) * shrug, aR: 0.28 + (tick > 0 ? 0.35 : 0) * shrug, eL: 0.4, eR: 0.4,
      wig: tick * 0.12,
    });
    camEnd();
    // pink shock rings on the snaps
    const sp = snapPulse(t, 5);
    if (sp > 0.05) { ctx.save(); ctx.globalAlpha = sp * 0.5; iris(W / 2, H / 2, 900 + (1 - sp) * 600, PINK); ctx.restore(); }
  }

  // ---- 51.56 · one flick of the tie, and 부장님 spins like a top ------------------------------------

  function tieSpin(t, lt) {
    const lb = lbeat(t, T_FLICK), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    const FLICK = 1, STOP = 19;
    const spinning = lb >= FLICK && lb < STOP;
    // squash and stretch on every eighth
    const e8 = Math.floor(bgBeat(t) * 2 + 1e-6);
    const sq = lb >= FLICK ? bgPulse2(t, 6) * 0.07 * (e8 % 2 ? 1 : -1) : 0;
    const [sx, sy] = shakeXY(t, T_FLICK + FLICK * B, 18, 0.3);
    squashBegin(sq);
    camBegin(W / 2 + sx, H / 2 + sy, 1);
    const lit = 0.6 + 0.4 * bgPulse(t, 4);
    room(t, { lit, floorY: 840, c1: e8 % 4 < 2 ? LIME : PINK, c2: e8 % 4 < 2 ? PINK : LIME, sofaX: -260, winX: 1360 });
    K.ballDots(t, 960, 100, 0.8);
    // spin state: a turn per beat, speeding up, then slowing on the last beat
    const sl = Math.max(0, lb - FLICK);
    const phase = lb < FLICK ? 0 : lb < STOP ? sl * 0.5 + sl * sl * 0.04 : (STOP - FLICK) * 0.5 + (STOP - FLICK) ** 2 * 0.04 + (1 - Math.exp(-(lb - STOP) * 3)) * 0.4;
    const th = phase * TAU;
    // where he spins: drifting in a lazy loop round the middle of the room
    const drift = spinning ? Math.min(1, sl / 2) : lb >= STOP ? 1 : 0;
    const bx = 1180 + Math.sin(sl * 0.35) * 260 * drift, by = 930 + Math.sin(sl * 0.7) * 30 * drift;
    const kx = 660, ky = 940;
    // the toy box and the little one on it
    toyBox(kx, ky, 330, 200, 0);
    const pull = lb < FLICK ? easeOut(clamp(lb / 0.6)) : 0;
    const kidTop = ky - 200 - 20;
    // tie tension line while he pulls
    littleOne(kx + 20, kidTop, 1.3, t, {
      shades: true, eyes: 'sleepy', lookX: 1, turn: 0.3,
      aR: lb < FLICK ? lerp(0.4, 1.5, pull) : lb < FLICK + 0.5 ? lerp(1.5, 2.3, easeOut(clamp((lb - FLICK) / 0.2))) : 0.35 + bgHop(t) * 0.15,
      eR: lb < FLICK ? 0.2 : 0.1, aL: 0.3, eL: 0.4,
      dy: lb >= FLICK ? bgHop(t) * 6 : 0, headRot: lb >= FLICK ? Math.sin(bgBeat(t) * Math.PI) * 0.06 : 0,
    });
    // 부장님
    const dizzy = lb >= FLICK;
    const facing = Math.cos(th);
    const bo = {
      aL: spinning ? 1.5 : 0.3, aR: spinning ? 1.5 : 0.3, eL: spinning ? 0.1 : 0.2, eR: spinning ? 0.1 : 0.2,
      lL: spinning ? 0.02 : 0.12, lR: spinning ? 0.9 : 0.12, kR: spinning ? 1.5 : 0,
      turn: spinning ? Math.sin(th) * 0.9 : lb < FLICK ? -0.4 : 0, flip: spinning && facing < 0,
      rot: spinning ? Math.sin(sl * 1.4) * 0.12 : lb >= STOP ? Math.sin((lb - STOP) * 12) * 0.2 * Math.exp(-(lb - STOP) * 2) : -pull * 0.06,
      eyes: dizzy ? 'spiral' : 'wide', mouth: dizzy ? 'open' : 'o', brows: 'worried', blush: 0.6,
      emote: lb >= STOP ? 'sweat' : null,
      shades: lb < FLICK, lookX: -1,
      tieFly: spinning ? 1.55 : lb < FLICK ? -1.72 * pull : 0.2 * Math.sin(t * 20), tieLen: lb < FLICK ? 1 + pull * 1.55 : spinning ? 1.4 : 1,
    };
    // spinning: squeeze him sideways as he turns edge-on, plus the blur rings
    ctx.save();
    const edge = spinning ? 0.72 + 0.28 * Math.abs(facing) : 1;
    ctx.translate(bx, by); ctx.scale(edge, 1); ctx.translate(-bx, -by);
    if (spinning) for (let i = 0; i < 4; i++) {
      const yy = by - 120 - i * 110, rr = 190 - i * 18;
      ctx.save(); ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.ellipse(bx, yy, rr, rr * 0.22, 0, th + i, th + i + 2.4, false);
      ctx.strokeStyle = i % 2 ? LIME : '#FFFFFF'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
    boss(bx, by, 1.08, t, bo);
    if (spinning) for (let i = 0; i < 3; i++) {
      const yy = by - 160 - i * 130, rr = 210 - i * 20;
      ctx.save(); ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.ellipse(bx, yy, rr, rr * 0.22, 0, th * 1.3 + i * 2, th * 1.3 + i * 2 + 1.6, true);
      ctx.strokeStyle = i % 2 ? PINK : '#FFFFFF'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // the stretched tie, from his collar to the little one's fist
    // his shades fly off at the flick
    if (lb >= FLICK && lb < FLICK + 3) {
      const a = (lb - FLICK) * B;
      ctx.save(); ctx.translate(bx + a * 700, by - 560 - a * 900 + a * a * 1600); ctx.rotate(a * 14); ctx.scale(1.1, 1.1);
      ctx.translate(0, 280); shades(0, 'boss');
      ctx.restore();
    }
    sfx('팅!', kx + 260, 520, 120, PINK, (lb - FLICK) * B, { life: 0.8, rot: -0.1 });
    if (spinning && lb > FLICK + 1) {
      const w = Math.floor(lb - FLICK) % 2;
      letter('빙글빙글', bx + (w ? 60 : -60), 170, 110, w ? LIME : PINK, { rot: Math.sin(t * 6) * 0.1, pop: 1 });
    }
    if (lb >= STOP) sfx('휘청', bx + 200, 430, 80, '#FFFFFF', (lb - STOP) * B, { life: 0.44, font: 'round' });
    camEnd();
    ctx.restore();
    // the lights come up for the next scene
    flash(easeIn(seg(t, T_END - B * 0.7, T_END)), '#FFFFFF');
  }

  chapter('drop', T0, T_END, [
    [T0, buildWide],
    [T_PUFF, buildPuff],
    [T_PUSH, buildPush],
    [T_FREEZE, freeze],
    [T_DROP, dropHit],
    [T_WIDE, dropWide],
    [T_FLICK, tieSpin],
  ]);
})();
