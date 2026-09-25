// Chapter 4 · 다시, 그리고 체육대회 (65.45 – 87.27): the night rewinds into morning, three poses out
// of bed, the run to school with friends joining from the alleys, the relay baton on the hit,
// the doodled paper plane leaving the page for the real sky, the whole class cheering, and a
// group hug under the cherry blossoms while the lights go down.
(() => {
  const BT = SONG.beat;
  const T_IN = 65.45, T_RUN = 69.09, T_RELAY = 72.73, T_PLANE = 76.36, T_CHEER = 80.0, T_HUG = 83.64, T_OUT = 87.27;
  const HIT_BATON = bt(41), HIT_CHEER = bt(45);           // 74.55, 81.82

  // ---- private helpers -------------------------------------------------------------------------

  const pad = n => String(Math.floor(n)).padStart(2, '0');

  /** A ring of smoke puffs that hides a costume change. */
  function poof(x, y, age, r = 230) {
    if (age < 0 || age > 0.3) return;
    const k = age / 0.3;
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU + 0.3, d = r * (0.85 + easeOut(k) * 0.5);
      circle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, 34 * (1 - k * 0.6), { fill: '#FFFFFF', lw: 4, alpha: 1 - k });
    }
  }

  /** Strings of little flags (만국기) sagging between two points. */
  function bunting(t, x0, x1, y, sag, seed, n = 18) {
    const P = k => [lerp(x0, x1, k), y + Math.sin(k * Math.PI) * sag];
    const pts = Array.from({ length: 21 }, (_, i) => P(i / 20));
    stroke(pts, '#6B5B4B', 3, { ink: null, smooth: true });
    const cols = [PAL.red, PAL.blue, PAL.gold, PAL.mint, PAL.pink, '#FFFFFF', PAL.lilac, PAL.orange];
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, [fx, fy] = P(k), fl = Math.sin(t * 6 + i * 1.3 + seed) * 5;
      const c = cols[Math.floor(hash(i, seed) * cols.length)];
      rrect(fx - 22, fy, 44, 32 + fl * 0.4, 3, { fill: c, lw: 3 });
      if (hash(i, seed + 1) > 0.5) circle(fx, fy + 16, 8, { fill: c === '#FFFFFF' ? PAL.red : '#FFFFFF', stroke: null });
      else stroke([[fx - 22, fy + 10], [fx + 22, fy + 10]], '#FFFFFF', 5, { ink: null });
    }
  }

  function pompom(x, y, r, col, t, seed = 0) {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + Math.sin(t * 20 + seed) * 0.2, d = r * (0.55 + 0.25 * hash(i, seed));
      circle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.45, { fill: col, lw: 3 });
    }
    circle(x, y, r * 0.55, { fill: col, stroke: null });
    sparkle(x - r * 0.3, y - r * 0.3, r * 0.3, '#FFFFFF', t * 3);
  }

  function baton(x, y, rot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-60, -13, 120, 26, 12, { fill: PAL.red, lw: 5 });
    rrect(-20, -13, 40, 26, 0, { fill: PAL.gold, stroke: null });
    rrect(-60, -13, 120, 26, 12, { fill: null, lw: 5 });
    ctx.restore();
  }

  /** A city bus seen side-on, facing right. (x, y) is the middle of its wheels line. */
  function bus(t, x, y, s, wheelSpin) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-470, -330, 940, 300, 40, { fill: '#3DBE6E', lw: 7 });
    rrect(-470, -120, 940, 36, 0, { fill: '#FFFFFF', stroke: null });
    rrect(-470, -330, 940, 300, 40, { fill: null, lw: 7 });
    for (let i = 0; i < 6; i++) {
      const wx = -430 + i * 128;
      rrect(wx, -290, 108, 120, 12, { fill: '#BFE8FF', lw: 5 });
      // passengers: sleepy heads bobbing
      circle(wx + 54, -196 + Math.sin(t * 7 + i) * 4, 30, { fill: i % 2 ? '#2F2A3A' : '#6B4432', stroke: null });
      stroke([[wx + 18, -270], [wx + 44, -222]], '#FFFFFF', 6, { ink: null, alpha: 0.7 });
    }
    rrect(355, -300, 100, 170, 14, { fill: '#BFE8FF', lw: 5 });
    rrect(-440, -380, 190, 50, 10, { fill: '#2A2438', lw: 5 });
    letter('7', -345, -356, 40, PAL.gold, { lw: 0, shadow: null });
    circle(470, -70, 16, { fill: PAL.gold, lw: 4 });
    for (const wx of [-290, 290]) {
      circle(wx, -20, 62, { fill: '#2A2438', lw: 6 });
      circle(wx, -20, 28, { fill: '#C9CED8', lw: 4 });
      stroke([[wx + Math.cos(wheelSpin) * 24, -20 + Math.sin(wheelSpin) * 24], [wx - Math.cos(wheelSpin) * 24, -20 - Math.sin(wheelSpin) * 24]], '#5B6378', 6, { ink: null });
    }
    ctx.restore();
  }

  /** Petals blown sideways; strength k 0..1 decides how many and how fast. */
  function petalStorm(t, k, seed = 31) {
    const n = Math.floor(30 + k * 110);
    for (let i = 0; i < n; i++) {
      const sp = (200 + hash(i, seed) * 260) * (0.5 + k);
      const span = W + 300;
      const x = ((hash(i, seed + 2) * span + t * sp) % span) - 150;
      const y = ((hash(i, seed + 1) * (H + 200) + t * sp * 0.35) % (H + 200)) - 100 + Math.sin(t * 2 + i) * 40;
      const r = 9 + hash(i, seed + 3) * 9;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i); ctx.scale(1, 0.5 + 0.5 * Math.sin(t * 4 + i));
      ell(0, 0, r * 1.3, r * 0.8, { fill: hash(i, 9) > 0.3 ? PAL.sakura : '#FFFFFF', stroke: null, alpha: 0.95 });
      ctx.restore();
    }
  }

  const skyDay = () => skyFill([[0, '#5DB8F5'], [0.6, PAL.sky], [1, '#DDF3FF']]);

  // ---- 65.45 rewind: the moon drops, the sun pops up, the clock runs back to 07:00 --------------

  const T_ROOM = bt(36, 2);   // 66.36

  function rewind(t, lt, dur) {
    if (t >= T_ROOM) return bedroom(t, t - T_ROOM);
    const k = seg(t, T_IN, T_ROOM), e = easeInOut(k);
    // the sky runs from night to morning
    const top = mix('#0E1236', '#5DB8F5', e), mid = mix('#1F2860', mix(PAL.dawn, PAL.sky, e), e), bot = mix('#383C7A', '#FFE2B8', e);
    skyFill([[0, top], [0.6, mid], [1, bot]]);
    stars(t, 90, 23, 1 - e);
    // moon whooshes down on the left, sun whooshes up on the right
    const ma = lerp(0, 1, easeIn(k));
    moon(lerp(1460, 300, ma), 180 + Math.pow(ma, 2) * 900, 120);
    const sa = easeOut(seg(k, 0.35, 1));
    sun(lerp(1700, 1460, sa), lerp(1250, 200, sa), 110);
    ctx.save(); ctx.translate(0, 770); ctx.scale(0.72, 0.72);
    townRow(t, 0, 200 - lt * 1800, { tone: mix('#303878', '#F2C9A0', e), lit: 0.3 * (1 - e), seed: 9 });
    ctx.restore();
    rrect(-20, 740, W + 40, 44, 0, { fill: mix('#4A4A7E', '#C9B8A0', e), lw: 6 });
    rrect(-20, 784, W + 40, 400, 0, { fill: mix('#2D2B5A', '#A89A8E', e), lw: 6 });
    // the three friends moonwalk backwards out of frame (rewinding the walk home)
    const back = lt * 2600;
    [['pony', 560, 1], ['me', 960, 0], ['glasses', 1360, 2]].forEach(([who, x, seed]) => {
      kid(x - back, 925, 1.12, { who, t, walk: -lt * 8 + seed * 0.3, turn: 0.3, eyes: 'happy', mouth: 'grin' });
    });
    // the clock at the top rolls back to 07:00 and shakes when it gets there
    const mins = lerp(22 * 60 + 17, 7 * 60, easeInOut(seg(k, 0, 0.85)));
    const land = t - (T_IN + (T_ROOM - T_IN) * 0.85);
    const shk = land > 0 ? Math.sin(land * 90) * 0.06 * Math.exp(-land * 6) : 0;
    digitalClock(960, 250, 0.9 + (land > 0 ? Math.exp(-land * 10) * 0.15 : 0), `${pad(mins / 60)}:${pad(mins % 60)}`, { rot: shk, body: PAL.gold });
    // VHS rewind: tearing bands, scanlines, and the ◀◀ badge
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    for (let i = 0; i < 4; i++) {
      const y = frac(hash(i, 3) + t * (1.5 + i * 0.4)) * H;
      ctx.fillStyle = rgba('#FFFFFF', 0.12); ctx.fillRect(0, y, W, 10 + hash(i, 4) * 26);
    }
    ctx.fillStyle = rgba('#000000', 0.07);
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    ctx.restore();
    if (frac(t * 2) < 0.7) letter('◀◀', 150, 90, 70, '#FFFFFF', { lw: 8 });
    streaks(t, 0.6, '#FFFFFF', 13, 1);
    flash(Math.pow(seg(t, T_ROOM - 0.12, T_ROOM), 2), '#FFFFFF');
  }

  // ---- bedroom: 07:00 rings, then 하나 · 둘 · 셋 out of bed ------------------------------------

  const P1 = sylT(36, 4), P2 = sylT(36, 6), P3 = sylT(36, 7);   // 67.27 67.73 68.18

  function bedroom(t, lt) {
    const hit = t >= P3 ? P3 : t >= P2 ? P2 : t >= P1 ? P1 : -9;
    const punch = hit > 0 ? Math.exp(-(t - hit) * 7) * 0.05 : 0;
    const [sx, sy] = shakeXY(t, hit, 14, 0.25);
    camBegin(1000 + sx, 600 + sy, 1.2 + punch + lt * 0.03);
    // wall, floor, sun through the window
    rrect(-200, -200, W + 400, 1100, 0, { fill: '#FFEBCF', stroke: null });
    rrect(-200, 860, W + 400, 500, 0, { fill: '#E0A874', lw: 6 });
    for (let i = 0; i < 10; i++) stroke([[i * 240 - 100, 866], [i * 240 - 260, 1100]], '#CD9463', 4, { ink: null });
    rrect(110, 110, 420, 380, 12, { fill: lgrad(0, 110, 0, 490, [[0, '#6CC3FA'], [1, '#CFEFFF']]), lw: 7 });
    ctx.save(); ctx.beginPath(); ctx.rect(110, 110, 420, 380); ctx.clip();
    sun(420, 220, 60); cloud(230, 380, 0.45);
    ctx.restore();
    stroke([[320, 110], [320, 490]], '#FFFFFF', 10, { olw: 6 });
    // curtains
    smooth([[80, 90], [170, 90], [150, 300], [180, 520], [70, 520]], { fill: PAL.pink, lw: 5 });
    smooth([[560, 90], [470, 90], [490, 300], [460, 520], [570, 520]], { fill: PAL.pink, lw: 5 });
    // morning light across the room
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#FFE9A8', 0.18);
    ctx.beginPath(); ctx.moveTo(110, 110); ctx.lineTo(530, 110); ctx.lineTo(1500, 900); ctx.lineTo(700, 900); ctx.closePath(); ctx.fill();
    ctx.restore();
    // a guitar poster on the wall: the dream
    ctx.save(); ctx.translate(1520, 280); ctx.rotate(0.05);
    rrect(-150, -190, 300, 380, 6, { fill: '#2A2438', lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(-147, -187, 294, 374); ctx.clip();
    sunburst(0, 0, '#3B3350', '#2A2438', t * 0.2, 14, 260);
    ctx.restore();
    ctx.save(); ctx.rotate(-0.6);
    ell(0, 50, 66, 78, { fill: PAL.orange, lw: 5 }); ell(0, -20, 50, 56, { fill: PAL.orange, lw: 5 });
    circle(0, 30, 18, { fill: '#2A2438', stroke: null });
    rrect(-10, -200, 20, 170, 5, { fill: PAL.woodDk, lw: 4 });
    ctx.restore();
    letter('ROCK!', 0, 150, 48, PAL.gold, { lw: 6, rot: -0.05 });
    for (const [px, py] of [[-150, -190], [150, -190]]) rrect(px - 20, py - 10, 40, 20, 3, { fill: rgba('#FFFFFF', 0.7), stroke: null });
    ctx.restore();
    // nightstand + ringing clock
    rrect(250, 690, 240, 180, 12, { fill: PAL.wood, lw: 6 });
    rrect(270, 740, 200, 16, 6, { fill: PAL.woodDk, stroke: null });
    const ring = t < P1 + 0.3;
    const rsh = ring ? Math.sin(t * 70) * 0.08 : 0;
    digitalClock(370, 620, 0.5, '07:00', { rot: rsh, dy: 0, blink: frac(t * 2) < 0.5 ? 1 : 0.2 });
    if (ring) for (let i = 0; i < 3; i++) {
      const a = -1.1 - i * 0.5;
      stroke([[370 + Math.cos(a) * 130, 600 + Math.sin(a) * 110], [370 + Math.cos(a) * 170, 600 + Math.sin(a) * 140]], PAL.red, 7, { ink: null });
      stroke([[370 - Math.cos(a) * 130, 600 + Math.sin(a) * 110], [370 - Math.cos(a) * 170, 600 + Math.sin(a) * 140]], PAL.red, 7, { ink: null });
    }
    // the bed
    const bx = 1000;
    rrect(bx - 440, 560, 60, 330, 20, { fill: PAL.wood, lw: 6 });                  // headboard
    rrect(bx - 420, 740, 880, 90, 20, { fill: '#FFFFFF', lw: 6 });                 // mattress
    rrect(bx - 430, 820, 900, 50, 12, { fill: PAL.wood, lw: 6 });
    for (const lx of [bx - 410, bx + 440]) rrect(lx, 860, 30, 40, 6, { fill: PAL.woodDk, lw: 5 });
    rrect(bx - 380, 690, 190, 70, 30, { fill: '#DDF1FF', lw: 5 });                // pillow
    const blanket = (dx, dy, rot, alpha = 1) => {
      ctx.save(); ctx.translate(bx + 60 + dx, 750 + dy); ctx.rotate(rot); ctx.globalAlpha *= alpha;
      smooth([[-330, 10], [-300, -60], [-100, -90], [150, -80], [340, -40], [360, 60], [-340, 60]], { fill: PAL.lilac, lw: 6 });
      for (let i = 0; i < 5; i++) stroke([[-260 + i * 130, -70], [-280 + i * 130, 50]], '#A185F0', 10, { ink: null });
      ctx.restore();
    };
    if (t < P1) {
      // the lump twitches with the alarm; the cowlick sticks out by the pillow
      const tw = Math.sin(t * 40) * 3 * (ring ? 1 : 0);
      ctx.save(); ctx.translate(bx - 250, 700 + tw); ctx.rotate(-0.4 + Math.sin(t * 9) * 0.15);
      stroke([[0, 0], [8, -30], [30, -44]], '#2F2A3A', 9, { smooth: true, olw: 9 });
      ctx.restore();
      ctx.save(); ctx.translate(0, tw); ctx.scale(1, 1);
      blanket(0, -20 + Math.sin(t * 3) * 4, 0);
      smooth([[bx - 250, 740], [bx - 180, 630], [bx, 610], [bx + 200, 640], [bx + 320, 740]], { fill: PAL.lilac, lw: 6 });
      ctx.restore();
      if (ring) emote('!', bx - 120, 520, clamp((t - T_ROOM) / 0.2), t);
    } else {
      // three poses, one per count
      const n = t >= P3 ? 3 : t >= P2 ? 2 : 1, age = t - hit;
      const pop = Math.exp(-age * 9);
      sunburst(bx - 80, 560, rgba([PAL.gold, PAL.pink, PAL.mint][n - 1], 0.35), rgba('#FFFFFF', 0.15), t * 0.6, 16, 800, clamp(age / 0.08));
      if (n === 1) {
        // sits up with a huge stretch, still in pyjamas
        kid(bx - 80, 790, 1.05, { who: 'me', t, sit: true, col: '#8FD3FF', eyes: 'closed', mouth: 'yawn', aL: 2.9, aR: 2.9, eL: 0.2, eR: 0.2,
          sq: -pop * 0.15, dy: pop * 30, cowlick: 0.5 });
        blanket(250 + age * 2400, -150 - age * 1500, 0.5 + age * 3, 1 - clamp(age * 3));
      } else if (n === 2) {
        // up on the bed in uniform, toast in the teeth, two fingers
        kid(bx - 80, 745, 1.05, { who: 'me', t, eyes: 'open', mouth: 'toast', aL: 0.4, aR: 2.8, eR: 0.3, sq: -pop * 0.18, dy: pop * 60, turn: 0.1 });
      } else {
        // a leap with the bag on: ready, go
        const up = Math.sin(clamp(age / 0.8) * Math.PI);
        const dash = seg(t, 68.72, T_RUN);
        kid(bx - 80 + easeIn(dash) * 1300, 745 + dash * 120, 1.08, { who: 'me', t, bag: true, eyes: 'determined', mouth: 'grin',
          aL: 0.5, aR: 2.9, eR: 0.1, lL: 0.5, kL: 1.2, lR: 0.2, dy: up * 100 * (1 - dash), sq: -pop * 0.2, rot: dash * 0.2,
          walk: dash > 0 ? t * 3 : undefined, run: dash > 0 });
        if (dash > 0) streaks(t, dash, '#FFFFFF', 17, -1);
      }
      poof(bx - 80, 590, age);
    }
    camEnd();
    flash(1 - seg(t, T_ROOM, T_ROOM + 0.25), '#FFFFFF');
  }

  // ---- 69.09 running to school, friends join from the alleys, a bus overtakes ------------------

  const JOIN_PONY = bt(38, 1.5), JOIN_GLASSES = bt(38, 4);   // 69.77, 70.91
  const BUS_T = 71.2;

  function run(t, lt, dur) {
    const sc = lt * 1400;                          // how far the world has scrolled
    const SPEED = 1400;
    skyDay();
    cloudLayer(t, 150, 0.8, -60, 4);
    ctx.save(); ctx.translate(0, 520); ctx.scale(0.7, 0.7);
    townRow(t, 0, 400 + sc * 0.3, { tone: '#F2C9A0', seed: 3 });
    ctx.restore();
    // a long wall of houses with alleys opening in it; each alley arrives just as a friend joins
    const alleyX = (tj, xj) => xj + (tj - t) * SPEED;
    const alleys = [[JOIN_PONY, 560], [JOIN_GLASSES, 1380], [72.4, 900], [68.9, 900]].map(([tj, xj]) => alleyX(tj, xj));
    rrect(-20, 470, W + 40, 240, 0, { fill: '#F4DDB8', lw: 6 });
    rrect(-20, 450, W + 40, 34, 0, { fill: '#C9745A', lw: 6 });
    for (let i = 0; i < 16; i++) {
      const x = ((i * 160 - sc) % 2560 + 2560) % 2560 - 320;
      rrect(x + 30, 520, 90, 70, 8, { fill: '#BFE8FF', lw: 5 });
      stroke([[x + 75, 520], [x + 75, 590]], PAL.ink, 3, { ink: null });
    }
    for (const ax of alleys) {
      if (ax < -300 || ax > W + 300) continue;
      rrect(ax - 110, 440, 220, 272, 0, { fill: '#5D5486', lw: 6 });
      poly([[ax - 110, 712], [ax + 110, 712], [ax + 50, 540], [ax - 50, 540]], { fill: '#8578AE', stroke: null });
      rrect(ax - 50, 470, 100, 70, 0, { fill: '#9FD6F2', stroke: null });
      rrect(ax - 110, 440, 220, 272, 0, { fill: null, lw: 6 });
    }
    // the road, with a bus overtaking
    rrect(-20, 706, W + 40, 100, 0, { fill: '#8A8FA8', lw: 6 });
    for (let i = 0; i < 12; i++) {
      const x = ((i * 240 - sc * 0.8) % 2880 + 2880) % 2880 - 480;
      rrect(x, 752, 120, 10, 5, { fill: '#FFFFFF', stroke: null });
    }
    if (t > BUS_T - 0.2) bus(t, -700 + (t - BUS_T) * 1800, 790, 0.8, t * 20);
    // pavement
    rrect(-20, 806, W + 40, 400, 0, { fill: '#F0D9B5', lw: 6 });
    for (let i = 0; i < 14; i++) {
      const x = ((i * 180 - sc) % 2520 + 2520) % 2520 - 300;
      stroke([[x, 812], [x - 60, 1080]], '#E0C39B', 5, { ink: null });
    }
    // the runners
    const gy = 950, ph = t * 3.2;
    const joined = (tj, xj, to) => {
      const k = easeOut(seg(t, tj, tj + 0.5));
      return { k, x: lerp(xj, to, k), y: lerp(730, gy, k), s: lerp(0.62, 1.0, k) };
    };
    const P = joined(JOIN_PONY, 560, 560), G = joined(JOIN_GLASSES, 1380, 1360);
    const busLook = t > BUS_T + 0.5 && t < BUS_T + 1.4;
    const drawRunner = ([who, x, y, s, seed, k, tj]) => {
      const leap = who === 'pony' ? Math.sin(k * Math.PI) * 170 : Math.sin(k * Math.PI) * 70;
      kid(x, y, s, { who, t, walk: ph + seed * 0.5, run: true, turn: 0.5, dy: leap + hop(t) * 6,
        eyes: k < 1 ? 'wide' : busLook ? 'happy' : 'determined', mouth: k < 1 ? 'o' : 'grin',
        emote: k < 1 ? '!' : null, emoteK: seg(t, tj, tj + 0.15),
        ...(busLook && who === 'pony' ? { aL: 2.8, eL: 0.2 } : {}) });
    };
    if (t >= JOIN_PONY) drawRunner(['pony', P.x, P.y, P.s, 1, P.k, JOIN_PONY]);
    if (t >= JOIN_GLASSES) drawRunner(['glasses', G.x, G.y, G.s, 2, G.k, JOIN_GLASSES]);
    kid(960, gy, 1.02, { who: 'me', t, walk: ph, run: true, turn: 0.5, bag: true, dy: hop(t) * 6,
      eyes: (t > JOIN_PONY && t < JOIN_PONY + 0.6) || busLook ? 'happy' : 'determined', mouth: 'grin',
      ...(busLook ? { aR: 2.7, eR: 0.3 } : {}) });
    streaks(t, 0.5, '#FFFFFF', 19, -1);
    flash(1 - seg(lt, 0, 0.15), '#FFFFFF');
  }

  // ---- 72.73 the relay: baton pass on the "프" at 74.55 -----------------------------------------

  function relay(t, lt, dur) {
    const since = t - HIT_BATON, S = 1.1, gy = 930, REACH = 156 * S;
    const HOLD = 0.28;                                        // the pass is held for a moment
    const XP_HIT = 600 + (HIT_BATON - T_RELAY) * 900;         // pony's x at the pass
    const XM_HIT = XP_HIT + 2 * REACH - 20;                   // me's x at the pass: hands meet
    const te = since > 0 && since < HOLD ? HIT_BATON : t;     // frozen clock for the held beat
    const xp = since < 0 ? 600 + (t - T_RELAY) * 900 : XP_HIT + (1 - Math.exp(-since * 3)) * 260;
    const mStart = HIT_BATON - 0.5;
    const xm = t < mStart ? XM_HIT - 110 : since < 0 ? XM_HIT - 110 + easeIn(seg(t, mStart, HIT_BATON)) * 110
      : XM_HIT + Math.max(0, since - HOLD) * 1500;
    const camX = since < 0 ? xp + 300 : lerp(XP_HIT + 300, xm - 150, easeInOut(seg(since, HOLD, HOLD + 0.6)));
    const [sx, sy] = shakeXY(t, HIT_BATON, 26, 0.45);
    const zoom = 1.0 + (since > 0 ? Math.exp(-since * 5) * 0.18 : seg(t, HIT_BATON - 0.6, HIT_BATON) * 0.1);
    skyDay();
    cloudLayer(t, 140, 0.7, 20, 8);
    // bunting across the top, in screen space
    camBegin(camX + sx, 560 + sy, zoom);
    const L = camX - 1300, R = camX + 1300;
    // the stands and the crowd
    rrect(L, 300, R - L, 300, 0, { fill: '#D9DEEA', lw: 6 });
    for (let r = 0; r < 3; r++) {
      rrect(L, 330 + r * 90, R - L, 16, 0, { fill: '#B8BFD0', stroke: null });
      const i0 = Math.floor(L / 70);
      for (let i = i0; i < i0 + 40; i++) {
        const hx = i * 70 + (r % 2) * 35, hy = 400 + r * 90 - Math.abs(Math.sin(te * 7 + i * 1.3 + r)) * 14;
        const col = [PAL.pink, PAL.mint, PAL.gold, PAL.blue][((i % 4) + 4) % 4];
        rrect(hx - 24, hy, 48, 60, 14, { fill: col, lw: 4 });
        circle(hx, hy - 16, 22, { fill: PAL.skin, lw: 4 });
        smooth([[hx - 22, hy - 20], [hx - 18, hy - 40], [hx + 18, hy - 40], [hx + 22, hy - 20], [hx, hy - 30]], { fill: '#2F2A3A', stroke: null });
        if (hash(i, r) > 0.7) stroke([[hx + 20, hy + 10], [hx + 40, hy - 50 + Math.sin(te * 12 + i) * 10]], PAL.skin, 10, { olw: 6 });
      }
    }
    // class flags on poles in front of the stands
    for (let i = Math.floor(L / 520); i < Math.floor(L / 520) + 7; i++) {
      const fx = i * 520 + 80, wave = Math.sin(te * 6 + i);
      stroke([[fx, 600], [fx, 320]], '#8B93A6', 8, { olw: 6 });
      const c = [PAL.red, PAL.blue, PAL.gold, PAL.mint][((i % 4) + 4) % 4];
      poly([[fx, 320], [fx + 160, 330 + wave * 12], [fx + 160, 420 + wave * 12], [fx, 410]], { fill: c, lw: 5 });
      letter(`${((i % 6) + 6) % 6 + 1}반`, fx + 80, 372 + wave * 8, 40, '#FFFFFF', { lw: 6, shadow: null });
    }
    // grass strip and the track
    rrect(L, 600, R - L, 70, 0, { fill: PAL.grass, lw: 6 });
    rrect(L, 670, R - L, 500, 0, { fill: '#D9774A', lw: 6 });
    for (let l = 0; l < 4; l++) stroke([[L, 700 + l * 110], [R, 700 + l * 110]], '#FFFFFF', 6, { ink: null, alpha: 0.9 });
    for (const zx of [XM_HIT - 330, XM_HIT + 200]) stroke([[zx, 700], [zx, 1030]], PAL.gold, 12, { ink: null });
    // the pass bursts behind the meeting hands
    if (since >= 0 && since < 0.6) {
      const k = since / 0.6, hx = XP_HIT + REACH, hy = gy - 184 * S;
      ctx.save(); ctx.globalAlpha = 1 - k;
      sunburst(hx, hy, rgba(PAL.gold, 0.8), rgba('#FFFFFF', 0.5), since * 2, 20, 1400);
      poly(starShape(hx, hy, 170 * (0.6 + easeOut(k) * 0.9), 0.5, 10), { fill: '#FFFFFF', lw: 7 });
      ctx.restore();
    }
    // the runners
    const pAfter = since > HOLD;
    kid(xp, gy, S, {
      who: 'pony', t, walk: pAfter ? t * 1.2 : te * 3.4, run: !pAfter, turn: 0.5,
      eyes: pAfter ? 'happy' : 'determined', mouth: pAfter ? 'open' : 'grin',
      aR: since < HOLD ? 1.62 : 2.8, eR: since < HOLD ? 0 : 0.2, aL: pAfter ? 2.6 : undefined,
      emote: pAfter ? 'sparkle' : 'sweat', emoteK: 1, dy: pAfter ? hop(t) * 30 : 0,
      holdR: since < 0 ? (hx, hy) => baton(hx + 26, hy, 0.05) : undefined });
    kid(xm, gy, S, {
      who: 'me', t, walk: t < mStart ? t * 0.6 : te * 3.6, run: t >= mStart, turn: since > 0 ? 0.55 : -0.45,
      eyes: since > 0 ? 'determined' : 'wide', mouth: since > 0 ? 'grin' : 'open', lookX: since > 0 ? 1 : -1,
      aL: since < HOLD ? 1.62 : undefined, eL: since < HOLD ? 0 : undefined,
      holdL: since >= 0 ? (hx, hy) => baton(hx - 26, hy, -0.05) : undefined });
    camEnd();
    bunting(t, -100, 1100, 20, 110, 1); bunting(t, 900, 2050, 0, 120, 2);
    // the hit, at the meeting hands
    if (since >= 0) {
      const hx = 960 + (XP_HIT + REACH - camX) * zoom;
      sfx('탁!', hx, 230, 170, PAL.gold, since, { life: 0.9, rot: -0.08 });
    }
    if (since > 0) confetti(t, HIT_BATON, { n: 80, burst: true, y: 200, x: 300, w: 1300 });
    if (since > HOLD) speedLines(t, 1200, 600, clamp((since - HOLD) * 3) * 0.8);
    flash(since >= 0 ? Math.exp(-since * 14) * 0.55 : 0);
  }

  // ---- 76.36 the doodled paper plane leaves the page for the real sky ---------------------------

  const LIFT = bt(42, 1), FLY = bt(42, 4) + BT * 0.5;   // 76.82, 78.41

  function doodles(t) {
    // pencil drawings in the margins (grey), the stage and the tiny guitarist
    const pen = (pts, w = 5) => stroke(pts, '#6A6F86', w, { ink: null, smooth: true });
    ctx.save(); ctx.globalAlpha *= 0.9;
    pen([[-440, 200], [-120, 200]]); pen([[-440, 200], [-440, 250]]); pen([[-120, 200], [-120, 250]]);
    for (let i = 0; i < 3; i++) pen([[-420 + i * 110, 60], [-380 + i * 110, 200]], 3);
    // little me with a guitar
    circle(-280, 100, 26, { fill: null, stroke: '#6A6F86', lw: 5 });
    pen([[-292, 76], [-285, 60], [-272, 54]], 4);
    pen([[-280, 126], [-280, 175]]); pen([[-280, 175], [-300, 198]]); pen([[-280, 175], [-260, 198]]);
    ctx.save(); ctx.translate(-270, 150); ctx.rotate(-0.5);
    ell(0, 10, 24, 20, { fill: null, stroke: '#6A6F86', lw: 5 }); pen([[0, -10], [0, -70]], 4);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const b = hop(t + i * 0.15);
      poly(starShape(-420 + i * 150, -20 - b * 10, 22, 0.45), { fill: null, stroke: '#6A6F86', lw: 4 });
    }
    letter('♪', -150, 40 - hop(t) * 12, 50, '#6A6F86', { lw: 0, shadow: null });
    ctx.restore();
  }

  function plane(t, lt, dur) {
    if (t >= FLY) return sky(t, t - FLY);
    // top-down on the textbook; the doodled plane wiggles, peels off the page, hovers, then dives
    // at the camera and its white wing fills the screen
    const liftK = seg(t, LIFT, FLY - 0.45), dive = easeIn(seg(t, FLY - 0.45, FLY));
    const zoom = lerp(1.7, 1.35, ease(seg(t, T_PLANE, FLY - 0.45)));
    const camC = [lerp(1090, 1020, ease(liftK)), lerp(420, 440, ease(liftK))];
    camBegin(camC[0], camC[1] + Math.sin(t * 1.2) * 6, zoom, -0.03 + Math.sin(t * 0.8) * 0.01);
    rrect(-600, -600, W + 1200, H + 1200, 0, { fill: '#D9A066', stroke: null });
    for (let i = 0; i < 12; i++) stroke([[-400, -100 + i * 130], [2300, -60 + i * 130]], '#C98E5B', 6, { ink: null, alpha: 0.5 });
    const PX = 250, PY = -110, PS = 1.35;     // the doodled plane, on the page
    textbook(960, 520, 0.92, -0.04, () => {
      doodles(t);
      ctx.save(); ctx.translate(PX, PY); ctx.rotate(-0.3); ctx.scale(PS, PS);
      if (t < LIFT) {
        // pencil lines, trembling to the beat as if it wants to go
        ctx.rotate(Math.sin(t * 30) * 0.06 * seg(t, T_PLANE, LIFT));
        ctx.translate(0, -pulse(t, 8) * 6 * seg(t, T_PLANE - 0.1, LIFT));
        poly([[80, 0], [-70, -46], [-40, 0]], { fill: '#FFFDF6', stroke: '#6A6F86', lw: 5 });
        poly([[80, 0], [-40, 0], [-70, 40]], { fill: '#FFFDF6', stroke: '#6A6F86', lw: 5 });
      } else {
        // what it leaves behind: a dotted outline
        ctx.setLineDash([10, 10]);
        poly([[80, 0], [-70, -46], [-40, 0], [-70, 40]], { fill: null, stroke: '#A8ADC0', lw: 4 });
        ctx.setLineDash([]);
      }
      ctx.restore();
      ctx.setLineDash([14, 14]);
      stroke([[70, 70], [150, 0], [240, 40], [330, -40], [420, -170]], '#9AA0B8', 4, { ink: null, smooth: true });
      ctx.setLineDash([]);
    });
    // page coordinates of the doodle in world space
    const c = Math.cos(-0.04), sn = Math.sin(-0.04);
    const bx = 960 + (PX * c - PY * sn) * 0.92, by = 520 + (PX * sn + PY * c) * 0.92;
    if (t >= LIFT) {
      const h = easeOut(clamp(liftK * 1.6));
      const hover = [bx - 60 * ease(liftK) + Math.sin(t * 4) * 20 * h, by - 40 * h - Math.sin(t * 5) * 14 * h];
      // the shadow stays on the page and falls behind as it rises
      ctx.save(); ctx.globalAlpha = 0.22;
      ctx.translate(bx + h * 70, by + h * 110); ctx.rotate(-0.34); ctx.scale(PS * 0.92, PS * 0.92);
      poly([[80, 0], [-70, -46], [-40, 0], [-70, 40]], { fill: '#2A2438', stroke: null });
      ctx.restore();
      const ps = PS * 0.92 * (1 + h * 0.5), rot = -0.34 + Math.sin(t * 4) * 0.08;
      for (let i = 0; i < 4; i++) sparkle(hover[0] - 140 - i * 50, hover[1] + 30 + Math.sin(t * 8 + i) * 20, 16 * (1 - i * 0.2), PAL.gold, t * 4);
      if (dive <= 0) paperPlane(hover[0], hover[1], ps, rot);
      camEnd();
      if (dive > 0) {
        // dive at the lens, in screen space
        const sx0 = 960 + (hover[0] - camC[0]) * zoom, sy0 = 540 + (hover[1] - camC[1]) * zoom;
        paperPlane(lerp(sx0, 900, dive), lerp(sy0, 560, dive), ps * zoom * lerp(1, 14, dive * dive), lerp(rot, 0.3, dive));
        flash(Math.pow(seg(dive, 0.7, 1), 2), '#FFFFFF');
      }
    } else camEnd();
    letter('슝~', 1500, 300, 90, '#FFFFFF', { pop: seg(t, LIFT, LIFT + 0.25), alpha: 1 - seg(t, FLY - 0.6, FLY - 0.3), rot: -0.1 });
  }

  function sky(t, lt) {
    // the real sky over the schoolyard; the plane swoops across with a loop
    skyFill([[0, '#4FA9F2'], [0.7, PAL.sky], [1, '#E8F7FF']]);
    sun(1650, 170, 90);
    cloudLayer(t, 300, 0.9, -160, 12);
    ctx.save(); ctx.translate(960, 1060 + lt * 40); ctx.scale(1 - lt * 0.05, 1 - lt * 0.05);
    ell(0, 0, 1300, 220, { fill: PAL.grass, stroke: null });
    ell(0, 0, 1000, 150, { fill: '#D9774A', stroke: null });
    ell(0, 0, 820, 100, { fill: '#8FD67A', stroke: null });
    for (let i = 0; i < 16; i++) circle(-760 + i * 100, -110, 12, { fill: [PAL.red, PAL.blue, PAL.gold, PAL.mint][i % 4], stroke: null });
    ctx.restore();
    tree(120, 1080, 1.2, 'sakura', t); tree(1820, 1080, 1.4, 'sakura', t);
    const R = 210;
    const path = k => {
      const lk = seg(k, 0.3, 0.72), la = lk * TAU;
      return [lerp(-150, 2000, k) + R * Math.sin(la), lerp(760, 470, k) - R * (1 - Math.cos(la))];
    };
    const k = seg(lt, 0, 1.64);
    const trail = [];
    for (let i = 0; i <= 26; i++) trail.push(path(clamp(k - i * 0.018)));
    ctx.setLineDash([18, 16]);
    stroke(trail, '#FFFFFF', 7, { ink: null, smooth: true, alpha: 0.95 });
    ctx.setLineDash([]);
    const [x, y] = path(k), ahead = path(k + 0.01);
    const rot = Math.atan2(ahead[1] - y, ahead[0] - x);
    paperPlane(x, y, 2.1 + Math.sin(t * 3) * 0.06, rot);
    for (let i = 0; i < 3; i++) sparkle(x + Math.cos(t * 5 + i * 2) * 160, y + Math.sin(t * 5 + i * 2) * 80, 16, i ? '#FFFFFF' : PAL.gold, t * 3);
    flash(1 - seg(lt, 0, 0.35), '#FFFFFF');
  }

  // ---- 80.00 the whole class cheers; everyone throws their hands up at 81.82 --------------------

  const TEE = '#FF8A5B';

  // arms up in a V with the hands beside the head (the rubber arms are too short to clear it)
  const V = { aL: 2.2, aR: 2.2, eL: 0.45, eR: 0.45 };
  function cheerArms(t, seed) {
    const b = beatOf(t) + seed * 0.5, side = Math.floor(b) % 2, h = Math.sin(Math.PI * frac(b));
    return side ? { aL: 2.2, eL: 0.45, aR: 0.9, eR: 1.2, dy: h * 40 } : { aR: 2.2, eR: 0.45, aL: 0.9, eL: 1.2, dy: h * 40 };
  }
  const pomAt = (col, t, seed) => (hx, hy) => {
    const side = hx < 0 ? -1 : 1, up = hy < -220;
    pompom(hx + (up ? side * 38 : 0), hy - (up ? 48 : 10), 46, col, t, seed);
  };

  function cheer(t, lt, dur) {
    const since = t - HIT_CHEER;
    const crouch = seg(t, HIT_CHEER - 0.35, HIT_CHEER) * (since < 0 ? 1 : 0);
    const [sx, sy] = shakeXY(t, HIT_CHEER, 24, 0.45);
    const zoom = 1.05 + lt * 0.02 + (since > 0 ? Math.exp(-since * 5) * 0.1 : 0);
    skyDay();
    if (since > 0) sunburst(960, 520, '#FFE9A0', '#FFD45C', t * 0.4, 20, 1800, clamp(since / 0.1) * 0.85);
    camBegin(960 + sx + Math.sin(t * 0.8) * 20, 540 + sy, zoom);
    bunting(t, -200, 2100, 40, 90, 5, 24);
    // back rows of classmates
    const rows = [[430, 0.55, 11], [560, 0.7, 9]];
    rows.forEach(([gy, s, n], r) => {
      for (let i = 0; i < n; i++) {
        const x = 960 + (i - (n - 1) / 2) * (1920 / (n - 0.5)) + (r ? 0 : 40);
        const who = ['me', 'pony', 'glasses'][Math.floor(hash(i, r + 3) * 3)];
        const d = since > 0 ? { ...V, dy: Math.sin(clamp(since / 0.7) * Math.PI) * 120 + (since > 0.7 ? hop(t + i * 0.1) * 40 : 0) }
          : i % 2 ? cheerArms(t, i + r) : dance('bounce', t, i + r * 3);
        kid(x, gy, s, { who, t, col: TEE, ...d, sq: crouch * 0.18,
          eyes: since > 0 ? 'happy' : 'open', mouth: since > 0 ? 'open' : 'grin', blush: true, shadow: false });
      }
    });
    // the class banner, held up by the middle row
    const bw = 900 + (since > 0 ? Math.exp(-since * 6) * 60 : 0), by = 300 - (since > 0 ? Math.sin(clamp(since / 0.7) * Math.PI) * 60 : hop(t) * 8);
    ctx.save(); ctx.translate(960, by); ctx.rotate(Math.sin(t * 2) * 0.02);
    rrect(-bw / 2, -60, bw, 120, 10, { fill: '#FFFFFF', lw: 7 });
    letter('2반 파이팅!', 0, 4, 84, PAL.red, { lw: 8, shadow: null });
    ctx.restore();
    // the front row: our three, with pompoms
    const front = [['pony', 520, 1, PAL.pink], ['me', 960, 0, PAL.gold], ['glasses', 1400, 2, PAL.mint]];
    for (const [who, x, seed, pc] of front) {
      let d;
      if (since > 0) {
        const up = Math.sin(clamp(since / 0.7) * Math.PI);
        d = { ...V, dy: up * 180 + (since > 0.7 ? hop(t) * 50 : 0), sq: -up * 0.1, lL: 0.4, lR: 0.4, kL: up * 0.8, kR: up * 0.8 };
      } else d = { ...cheerArms(t, seed), sq: crouch * 0.2, dy: crouch > 0 ? 0 : cheerArms(t, seed).dy };
      const face = since > 0 ? { eyes: who === 'glasses' ? 'star' : 'happy', mouth: 'open', blush: true }
        : { eyes: who === 'me' ? 'determined' : 'happy', mouth: 'grin' };
      kid(x, 900, 1.12, { who, t, col: TEE, ...d, ...face, holdL: pomAt(pc, t, seed), holdR: pomAt(pc, t, seed + 5) });
    }
    camEnd();
    if (since > 0) confetti(t, HIT_CHEER, { n: 120, burst: true, y: 100 });
    flash(since >= 0 ? Math.exp(-since * 10) * 0.55 : 0);
  }

  // ---- 83.64 a group hug under the cherry blossoms, then the lights go down --------------------

  function hug(t, lt, dur) {
    const dim = easeIn(seg(t, T_OUT - 1.0, T_OUT));
    skyFill([[0, '#7FC6F7'], [0.7, '#CFEFFF'], [1, '#FFE6F0']]);
    camBegin(960, 660 - lt * 12, 1.32 + lt * 0.05, Math.sin(t * 0.7) * 0.012);
    // a row of cherry trees, big and soft
    for (let i = 0; i < 6; i++) {
      const x = -60 + i * 400, s = 1.9 + hash(i, 4) * 0.6;
      tree(x, 760, s, 'sakura', t);
    }
    rrect(-300, 740, W + 600, 500, 0, { fill: '#9ED88A', lw: 6 });
    for (let i = 0; i < 40; i++) ell(hash(i, 1) * W, 760 + hash(i, 2) * 300, 14, 7, { fill: PAL.sakura, stroke: null, alpha: 0.8 });
    // the three, squeezing each other and swaying on the beat
    const sway = Math.sin(beatOf(t) * Math.PI) * 0.06, bob = hop(t) * 12;
    const face = { eyes: 'happy', mouth: 'grin', blush: true };
    const squeeze = pulse(t, 5) * 14;
    kid(705 + squeeze, 930, 1.15, { who: 'pony', t, ...face, rot: 0.08 + sway, aR: 1.95, eR: 0.5, aL: 0.9 + hop(t) * 0.8, eL: 0.6, dy: bob, headRot: 0.1 });
    kid(1215 - squeeze, 930, 1.15, { who: 'glasses', t, ...face, rot: -0.08 + sway, aL: 1.95, eL: 0.5, aR: 0.9 + hop(t + 0.2) * 0.8, eR: 0.6, dy: bob, headRot: -0.1 });
    kid(960, 940, 1.2, { who: 'me', t, ...face, rot: sway, aL: 1.5, aR: 1.5, eL: 0.3, eR: 0.3, dy: bob * 1.2, sq: pulse(t, 6) * 0.04,
      emote: 'heart', emoteK: seg(t, 84.55, 84.8) });
    // hearts rising
    for (let i = 0; i < 6; i++) {
      const f = frac(t * 0.4 + hash(i, 3));
      poly(heartPts(700 + hash(i, 5) * 520 + Math.sin(t * 2 + i) * 30, 520 - f * 480, 18 + hash(i, 6) * 14), { fill: PAL.pink, lw: 3, alpha: Math.sin(f * Math.PI) });
    }
    camEnd();
    petalStorm(t, clamp(0.4 + lt / 1.6) * (1 - dim * 0.5));
    sparkle(560, 360, 24 * pulse(t, 4), '#FFFFFF', t);
    sparkle(1380, 330, 20 * pulse(t + 0.2, 4), '#FFFFFF', -t);
    // the lights dim for the bridge
    fillScreen('#0D0B24', dim * 0.88);
  }

  chapter('again', T_IN, T_OUT, [[T_IN, rewind], [T_RUN, run], [T_RELAY, relay], [T_PLANE, plane], [T_CHEER, cheer], [T_HUG, hug]]);
})();
