// gajang/src/ch/d1_dawn.js — chapter 1 · 새벽 (0 – 38.40)
// Dark apartment complex, one lit window → the alarm he beats → title at first light →
// mirror and tie → a kiss for the little one, a blanket for the big one → packed subway →
// up the exit stairs into the morning.
(() => {
  const B = SONG.beat;
  const S = { complex: 0, alarm: 8.4, title: 9.6, mirror: 19.2, kids: 24.0, subway: 28.8, exit: 33.6, end: 38.4 };

  // ---- private helpers ---------------------------------------------------------------------------

  const hitK = (t, t0, len = 0.35) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  function camDrift(t, cx, cy, z = 1, rot = 0, amp = 1) {
    camBegin(cx + Math.sin(t * 0.5) * 8 * amp, cy + Math.cos(t * 0.37) * 6 * amp, z, rot + Math.sin(t * 0.3) * 0.004 * amp);
  }
  /** Dad, with the options every shot wants. */
  const dad = (x, y, s, t, o = {}) => person(x, y, s, { role: 'dad', t, ...o });

  // A dark apartment block with a grid of windows and balcony ledges.
  function aptBlock(x, y, w, h, tone, seed, lit, o = {}) {
    rrect(x, y - h, w, h + 40, 6, { fill: tone, stroke: o.ink ? PAL.ink : null, lw: 5 });
    rrect(x - 10, y - h - 16, w + 20, 22, 5, { fill: mix(tone, '#000000', 0.28), stroke: null });
    const cols = Math.max(2, Math.floor(w / 58)), rows = Math.floor((h - 40) / 60);
    const cw = (w - 24) / cols;
    for (let r = 0; r < rows; r++) {
      const wy = y - h + 26 + r * 60;
      for (let c = 0; c < cols; c++) {
        const on = hash(seed * 13 + r, c + seed) < lit;
        rrect(x + 16 + c * cw, wy, cw - 14, 30, 3, { fill: on ? '#FFD98A' : mix(tone, '#0E1230', 0.4), stroke: null });
      }
      rrect(x + 6, wy + 34, w - 12, 5, 2, { fill: mix(tone, '#FFFFFF', 0.08), stroke: null });
    }
    if (o.num) letter(o.num, x + w / 2, y - h + 2, 30, mix(tone, '#FFFFFF', 0.35), { lw: 0, shadow: null });
  }

  // A green dinosaur plush.
  function dinoPlush(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    for (let i = 0; i < 4; i++) poly([[-30 + i * 22, -48 + i * 4], [-18 + i * 22, -72 + i * 6], [-8 + i * 22, -44 + i * 4]], { fill: '#FFC23D', lw: 4 });
    smooth([[-60, 10], [-50, -40], [0, -54], [50, -40], [66, 0], [40, 36], [-40, 36]], { fill: '#6FCB7A', lw: 5 });
    smooth([[40, -30], [70, -70], [110, -70], [120, -40], [96, -20], [60, -10]], { fill: '#6FCB7A', lw: 5 });
    circle(100, -54, 6, { fill: PAL.ink, stroke: null });
    ell(0, 6, 34, 20, { fill: '#CFF0C8', stroke: null });
    ctx.restore();
  }

  // A plain hand (palm + thumb), for close-ups.
  function hand(x, y, s, rot, color = PAL.skin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    smooth([[-34, -30], [34, -30], [42, 20], [22, 44], [-22, 44], [-42, 20]], { fill: color, lw: 5 });
    for (let i = 0; i < 3; i++) stroke([[-18 + i * 18, 22], [-18 + i * 18, 40]], mix(color, PAL.ink, 0.35), 3, { ink: null });
    ell(-44, -6, 13, 24, { fill: color, lw: 4.5 }, 0.4);
    ctx.restore();
  }

  // A sleepy commuter, head and shoulders; (x, y) is the middle of the shoulders.
  const COATS = ['#6B7285', '#8A7F72', '#4F5A70', '#9A8C9E', '#5E6B64', '#7C6A5C', '#A07E6A', '#5A5F7A'];
  const HAIRS = ['#2B2733', '#4A3A30', '#3A3440', '#6B5A4A', '#1F1C26', '#7A5A44'];
  function commuter(x, y, s, i, o = {}) {
    const coat = COATS[i % COATS.length], hair = HAIRS[(i * 3 + 1) % HAIRS.length];
    const style = Math.floor(hash(i, 41) * 4), skin = mix(PAL.skin, '#E8B894', hash(i, 42) * 0.6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    smooth([[-96, 10], [-84, -40], [0, -58], [84, -40], [96, 10], [100, 420], [-100, 420]], { fill: coat, lw: 5 });
    poly([[-22, -50], [22, -50], [0, 10]], { fill: '#EDEDF2', lw: 4 });
    if (style === 3) smooth([[-70, -150], [-76, -40], [76, -40], [70, -150]], { fill: hair, lw: 5 });
    ell(0, -126, 62, 66, { fill: skin, lw: 5 });
    if (style === 0) smooth([[-64, -140], [-60, -186], [0, -202], [60, -186], [64, -140], [40, -170], [-30, -168]], { fill: hair, lw: 5 });
    else if (style === 1) smooth([[-68, -110], [-68, -180], [0, -206], [68, -180], [68, -110], [50, -160], [-50, -160]], { fill: hair, lw: 5 });
    else if (style === 2) { smooth([[-64, -120], [-58, -170], [-40, -176], [-46, -130]], { fill: hair, lw: 4 }); smooth([[64, -120], [58, -170], [40, -176], [46, -130]], { fill: hair, lw: 4 }); }
    else smooth([[-66, -130], [-60, -184], [0, -204], [60, -184], [66, -130], [30, -170], [-30, -170]], { fill: hair, lw: 5 });
    const eyes = o.eyes || (hash(i, 43) > 0.5 ? 'closed' : 'sleepy');
    for (const side of [-1, 1]) {
      if (eyes === 'closed') stroke([[side * 24 - 10, -122], [side * 24, -116], [side * 24 + 10, -122]], PAL.ink, 4, { ink: null, smooth: true });
      else { stroke([[side * 24 - 10, -122], [side * 24 + 10, -122]], PAL.ink, 4, { ink: null }); circle(side * 24, -116, 5, { fill: PAL.ink, stroke: null }); }
    }
    stroke([[-8, -92], [8, -92]], PAL.ink, 4, { ink: null });
    if (hash(i, 44) > 0.7) { for (const side of [-1, 1]) rrect(side * 24 - 18, -136, 36, 28, 8, { fill: 'rgba(255,255,255,0.2)', lw: 3.5 }); }
    ctx.restore();
  }

  /** A little sleep-talk "z" drifting from (x, y). */
  function zzz(t, x, y, s = 1, alpha = 1) {
    for (let i = 0; i < 3; i++) {
      const f = frac(t * 0.45 + i / 3);
      letter('z', x + f * 60 * s, y - f * 110 * s, (22 + i * 8) * s, '#DDE4FF', { font: 'round', alpha: Math.sin(f * Math.PI) * alpha, lw: 4 * s, shadow: null });
    }
  }

  // ---- 0.00 the dark complex, and the push into the one lit window ---------------------------------

  const WIN = { x: 1092, y: 464, w: 80, h: 45 };      // the one lit window, 16:9 like the screen
  const WC = [WIN.x + WIN.w / 2, WIN.y + WIN.h / 2];
  const ZMAX = W / WIN.w;
  const T_IN = 6.3;                                    // from here we are inside the room

  // The bedroom, seen through the window: side view, painted in a 1920x1080 space.
  function bedroom(t) {
    fillRectW(0, 0, W, H, lgrad(0, 0, 0, H, [[0, '#262C52'], [1, '#1C2144']]));
    // the lamp's warm pool
    glow(230, 560, 620, '#FFB866', 0.42);
    // wallpaper stripes and a framed photo
    for (let i = 0; i < 12; i++) rrect(i * 170, 0, 70, 760, 0, { fill: rgba('#FFFFFF', 0.025), stroke: null });
    rrect(820, 170, 250, 190, 10, { fill: '#6B4432', lw: 5, alpha: 0.9 });
    rrect(842, 192, 206, 146, 6, { fill: '#3A4470', stroke: null });
    for (const [px, pr] of [[890, 28], [950, 34], [1010, 22]]) { circle(px, 300 - pr, pr * 0.6, { fill: '#8A93C0', stroke: null }); ell(px, 330, pr * 0.8, pr * 0.6, { fill: '#8A93C0', stroke: null }); }
    // floor
    rrect(-10, 860, W + 20, 240, 0, { fill: '#2A2448', stroke: null });
    // nightstand, lamp, clock
    rrect(60, 690, 260, 180, 12, { fill: '#6B4A3A', lw: 5 });
    rrect(80, 760, 220, 10, 3, { fill: '#4A3228', stroke: null });
    stroke([[130, 690], [130, 610]], '#C9B08A', 8, { ink: PAL.ink, olw: 8 });
    poly([[80, 616], [180, 616], [160, 540], [100, 540]], { fill: '#FFE3A8', lw: 5 });
    glow(130, 590, 200, '#FFD98A', 0.6);
    digitalClock(252, 650, 0.3, '05:29', { blink: pulse(t, 3), body: '#E9E4D8', glow: 0.8 });
    // the bed
    rrect(330, 470, 70, 420, 18, { fill: '#8A5A44', lw: 6 });
    rrect(380, 760, 1260, 110, 16, { fill: '#F2EEE6', lw: 6 });
    rrect(1600, 640, 60, 250, 16, { fill: '#8A5A44', lw: 6 });
    ell(520, 730, 120, 46, { fill: '#FFFFFF', lw: 5 });
    // 엄마, asleep behind him: a bob of hair over the blanket, turned away
    circle(660, 640, 74, { fill: '#5A3A2E', lw: 5 });
    stroke([[610, 600], [660, 590]], '#7A5244', 7, { ink: null });
    zzz(t, 730, 560, 1, 0.9);
    // 아빠 on his back, face to us, eyes on the ceiling
    const blink = frac(t / 3.1 + 0.3) < 0.04;
    const look = t < 4.5 ? 1 : 1 - 0.6 * ease(seg(t, 7.2, 7.8));
    dad(900, 725, 1, t, {
      rot: -Math.PI / 2, shadow: false, jacket: false, eyes: blink ? 'closed' : 'open', mouth: 'flat',
      lookX: look, lookY: 0, bags: 0.6, blush: 0.1,
    });
    // blanket over everything below the chin
    const breath = Math.sin(t * 1.4) * 5;
    smooth([[636, 646 - breath], [800, 610 - breath], [1040, 598], [1260, 612], [1560, 640], [1600, 770], [626, 784]], { fill: '#7C8DC8', lw: 6 });
    for (let i = 0; i < 5; i++) stroke([[640 + i * 200, 620], [620 + i * 200, 760]], '#6A7AB5', 5, { ink: null });
    // his hand on the blanket, already awake
    hand(760, 650 - breath, 0.6, -0.4);
    // moonlight from the window on the right
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#CFE0FF';
    ctx.beginPath(); ctx.moveTo(1500, 0); ctx.lineTo(1800, 0); ctx.lineTo(1500, 860); ctx.lineTo(1100, 860); ctx.fill(); ctx.restore();
  }
  // a rect fill in world coords (no outline)
  function fillRectW(x, y, w, h, style) { ctx.save(); ctx.fillStyle = style; ctx.fillRect(x, y, w, h); ctx.restore(); }

  function complexExterior(t) {
    skyFill([[0, '#0E1230'], [0.55, '#1D2346'], [0.85, '#2C2F5E'], [1, '#3A3868']]);
    stars(t, 80, 31, 0.9, 520);
    // a thin crescent moon
    ctx.save();
    circle(360, 170, 46, { fill: '#FFF6D6', stroke: null });
    circle(382, 158, 42, { fill: '#141A3C', stroke: null });
    ctx.restore();
    glow(350, 175, 150, '#CFE3FF', 0.18);
    // far blocks
    for (let i = 0; i < 12; i++) {
      const bw = 160 + hash(i, 3) * 120, bh = 260 + hash(i, 4) * 200;
      aptBlock(-120 + i * 180 + hash(i, 5) * 40, 820, bw, bh, '#1E2448', i + 40, 0);
    }
    // neighbours, all dark
    aptBlock(160, 900, 520, 640, '#2A3160', 7, 0, { num: '102' });
    aptBlock(1640, 900, 480, 600, '#2A3160', 9, 0.0, { num: '104' });
    // the block: every window dark but one
    const bx = 820, bw = 740, top = 170;
    rrect(bx, top, bw, 900 - top + 40, 6, { fill: '#323A6C', stroke: null });
    rrect(bx - 12, top - 18, bw + 24, 24, 5, { fill: '#232A52', stroke: null });
    letter('103', bx + bw / 2, top + 30, 36, '#5A6398', { lw: 0, shadow: null });
    for (let r = 0; r < 8; r++) {
      const wy = 230 + r * 78;
      for (let c = 0; c < 6; c++) {
        const wx = 860 + c * 116;
        if (wx === WIN.x && wy === WIN.y) continue;
        rrect(wx, wy, 80, 45, 3, { fill: '#1B2044', stroke: null });
        stroke([[wx + 40, wy], [wx + 40, wy + 45]], '#262C58', 3, { ink: null });
      }
      rrect(bx + 20, wy + 52, bw - 40, 8, 2, { fill: '#3C4578', stroke: null });
    }
    // the lit window: the room inside it, warm glass on top while we are far away
    glow(WC[0], WC[1], 120, '#FFD98A', 0.55 * (1 - seg(ctx.getTransform().a / SCALE, 1.6, 5)));
    ctx.save();
    ctx.beginPath(); ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h); ctx.clip();
    ctx.translate(WIN.x, WIN.y); ctx.scale(WIN.w / W, WIN.h / H);
    bedroom(t);
    ctx.restore();
    return { bx, bw };
  }

  function complexFront(t) {
    // trees, lamps and a path in front of the blocks
    rrect(-20, 880, W + 40, 220, 0, { fill: '#1A1E3C', stroke: null });
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * 240 + hash(i, 61) * 60;
      smooth(blobPts(x, 830, 90 + hash(i, 62) * 30, 9, 0.18, i + 5), { fill: '#16304A', stroke: null });
    }
    for (const lx of [700, 1680]) {
      stroke([[lx, 900], [lx, 690]], '#2A2F50', 10, { ink: null });
      circle(lx, 684, 14, { fill: '#FFC878', stroke: null });
      glow(lx, 700, 170, '#FFB060', 0.35);
    }
  }

  function complex(t, lt) {
    const e = easeInOut(seg(t, 0.9, T_IN));
    const z = Math.pow(ZMAX, e);
    if (t >= T_IN) {
      // inside: a slow push onto his open eyes
      const k = easeInOut(seg(t, T_IN, S.alarm));
      camBegin(lerp(960, 600, k), lerp(540, 660, k), lerp(1, 2.1, k));
      bedroom(t);
      camEnd();
      // the clock's red glow creeps in from the left just before the cut
      return;
    }
    const off = [(WC[0] - 960) * (1 - e), (WC[1] - 540) * (1 - e)];
    camBegin(WC[0] - off[0] / z, WC[1] - off[1] / z, z);
    complexExterior(t);
    complexFront(t);
    // the window frame: a cross bar and curtains, gone once we are through
    const fa = 1 - seg(z, 8, 20);
    if (fa > 0) {
      ctx.save(); ctx.globalAlpha = fa;
      stroke([[WC[0], WIN.y], [WC[0], WIN.y + WIN.h]], '#3A3050', 2.5, { ink: null });
      poly([[WIN.x, WIN.y], [WIN.x + 14, WIN.y], [WIN.x + 8, WIN.y + WIN.h], [WIN.x, WIN.y + WIN.h]], { fill: rgba('#E8A070', 0.85), stroke: null });
      poly([[WIN.x + WIN.w, WIN.y], [WIN.x + WIN.w - 14, WIN.y], [WIN.x + WIN.w - 8, WIN.y + WIN.h], [WIN.x + WIN.w, WIN.y + WIN.h]], { fill: rgba('#E8A070', 0.85), stroke: null });
      ctx.restore();
    }
    // warm glass while far
    const ga = 1 - seg(z, 1.5, 6);
    if (ga > 0) rrect(WIN.x, WIN.y, WIN.w, WIN.h, 2, { fill: rgba('#FFD98A', 0.85 * ga), stroke: null });
    camEnd();
    // the clock ticks on each beat: a faint 째깍 by the window while we are outside
    const b = beatN(t);
    if (t < 4.6 && b % 2 === 0) {
      const ws = [(WC[0] - (WC[0] - off[0] / z)) * z + 960, (WC[1] - (WC[1] - off[1] / z)) * z + 540];
      sfx('째깍', ws[0] + 90, ws[1] - 60 - (b % 4) * 10, 34, '#FFE9B8', t - b * B, { life: 0.55, rot: -0.1 });
    }
  }

  // ---- 8.40 the alarm he beats ---------------------------------------------------------------------

  function alarm(t, lt, dur) {
    const press = S.alarm + 0.22;
    const pk = seg(t, press - 0.14, press);
    fillScreen('#1C2144');
    camDrift(t, 960, 540, 1.02 + lt * 0.02, 0, 0.6);
    glow(700, 470, 700, '#FFB866', 0.28);
    // nightstand top
    rrect(-40, 700, 1500, 420, 20, { fill: '#6B4A3A', lw: 7 });
    rrect(-40, 700, 1500, 34, 10, { fill: '#7E5A48', stroke: null });
    // a glass of water and his phone, to make it a real nightstand
    rrect(1160, 520, 110, 190, 16, { fill: 'rgba(220,240,255,0.35)', lw: 5 });
    rrect(1168, 590, 94, 112, 12, { fill: 'rgba(160,200,255,0.35)', stroke: null });
    // the clock squashes under the hand
    const sq = press <= t ? Math.exp(-(t - press) * 9) * Math.cos((t - press) * 40) * 0.12 : 0;
    const txt = t < S.alarm ? '05:29' : '05:30';
    ctx.save(); ctx.translate(700, 720); ctx.scale(1 + sq, 1 - sq); ctx.translate(-700, -720);
    const ring = t >= S.alarm && t < press;
    digitalClock(700, 560, 1.55, txt, { blink: 1, body: '#E9E4D8', glow: ring ? 1.4 : 0.7, color: ring && frac(t * 12) < 0.5 ? '#FF8080' : '#FF5A5A', rot: ring ? Math.sin(t * 90) * 0.03 : 0 });
    ctx.restore();
    // the 삐— that never gets to finish
    if (t >= S.alarm) {
      const age = t - S.alarm;
      if (t < press + 0.05) letter('삐—', 1080, 250, 130, '#FF6B6B', { pop: clamp(age / 0.08), rot: -0.08 });
      sfx('탁', 520, 250, 110, '#FFFFFF', t - press, { life: 0.8, rot: 0.1 });
    }
    // his hand, already waiting above the button, drops the instant it rings
    const hy = lerp(200, 395, easeIn(pk)) + (t < S.alarm ? Math.sin(t * 5) * 6 : 0);
    const hx = 760;
    stroke([[1500, -300], [hx + 30, hy - 50]], '#7C8DB5', 84, { olw: 10 });
    for (let i = 0; i < 3; i++) stroke([[1400 - i * 150, -140 + i * 30], [1420 - i * 150, -40 + i * 30]], '#9AA8CC', 10, { ink: null, alpha: 0.7 });
    hand(hx, hy, 1.6, -0.35);
    if (t >= press) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45, k = seg(t, press, press + 0.25); if (k < 1) stroke([[hx + Math.cos(a) * (120 + k * 60), hy + 40 + Math.sin(a) * (80 + k * 60)], [hx + Math.cos(a) * (150 + k * 90), hy + 40 + Math.sin(a) * (100 + k * 90)]], '#FFFFFF', 8, { ink: null, alpha: 1 - k }); } }
    camEnd();
  }

  // ---- 9.60 title: out the front door into first light ---------------------------------------------

  const TITLE = '오늘도 수고했어';
  const TITLE_T = [12.0, 12.6, 13.2, null, 14.4, 15.0, 15.6, 16.2];

  function dawnSky(t) {
    const k = seg(t, S.title, S.mirror);
    skyFill([
      [0, mix('#1B2150', '#34407A', k)], [0.35, mix('#3A3C78', '#6A6AA8', k)],
      [0.6, mix('#8A6A9E', '#C898B0', k)], [0.78, mix('#E0A090', '#FFC8A0', k)], [1, mix('#F2C09A', '#FFE2B8', k)],
    ]);
  }

  /** Integral of a trapezoid weight (0 → 1 over [a, b], 1 → 0 over [c, d]) up to t. */
  function trapInt(t, a, b, c, d) {
    const up = x => (x <= a ? 0 : x >= b ? (b - a) / 2 : (x - a) * (x - a) / (2 * (b - a)));
    const dn = x => (x <= c ? 0 : x >= d ? (d - c) / 2 : (x - c) - (x - c) * (x - c) / (2 * (d - c)));
    return up(t) + Math.max(0, Math.min(t, c) - b) + dn(t);
  }

  function title(t, lt, dur) {
    const k = seg(t, S.title, S.mirror);
    dawnSky(t);
    // camera: from the front door out to the whole sky
    const ck = easeInOut(seg(t, S.title + 0.3, 13.4));
    camBegin(lerp(330, 960, ck), lerp(740, 540, ck) + Math.sin(t * 0.4) * 4, lerp(1.9, 1.0, ck));
    stars(t, 50, 12, 1 - ease(seg(t, S.title, 16.5)), 420);
    // the sun, just about to come up behind the city
    const SX = 1130, sunY = lerp(990, 850, easeInOut(seg(t, 13.2, 19.6)));
    glow(SX, 820, 1000, '#FFB070', 0.2 + k * 0.35);
    glow(SX, sunY, 460, '#FFE0A0', 0.25 + k * 0.45);
    circle(SX, sunY, 120, { fill: '#FFEDB8', stroke: null });
    // soft rays once the rim shows
    const ray = seg(t, 16.2, 19.2);
    if (ray > 0) {
      ctx.save(); ctx.globalAlpha = 0.12 * ray;
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI + 0.2 + i * 0.27 + Math.sin(t * 0.3 + i) * 0.02;
        ctx.beginPath(); ctx.moveTo(SX, sunY);
        ctx.lineTo(SX + Math.cos(a - 0.04) * 1800, sunY + Math.sin(a - 0.04) * 1800);
        ctx.lineTo(SX + Math.cos(a + 0.04) * 1800, sunY + Math.sin(a + 0.04) * 1800);
        ctx.fillStyle = '#FFF2D0'; ctx.fill();
      }
      ctx.restore();
    }
    // thin clouds catching the light
    for (let i = 0; i < 5; i++) {
      const cx = 100 + i * 470 + lt * 12, cy = 520 + hash(i, 71) * 200;
      ell(cx, cy, 190 + hash(i, 72) * 140, 13, { fill: mix('#7A6CA8', '#FFC4A8', k), stroke: null, alpha: 0.6 });
    }
    // birds crossing
    for (let i = 0; i < 3; i++) {
      const bk = seg(t, 15.6 + i * 0.25, 19.4);
      if (bk <= 0) continue;
      const bx = lerp(1800 + i * 70, 800 + i * 40, bk), by = 560 - i * 34 + Math.sin(bk * 9 + i) * 10, f = Math.sin(t * 10 + i * 2) * 10;
      stroke([[bx - 18, by - f], [bx, by], [bx + 18, by - f]], '#3A3050', 4, { ink: null, smooth: true });
    }
    // the far city: low skylines, windows waking up one by one
    for (let layer = 0; layer < 2; layer++) {
      const base = 880, tone = layer ? mix('#34335F', '#7C7098', k) : mix('#262853', '#5E5A88', k);
      for (let i = 0; i < 18; i++) {
        const x = 300 + i * 100 + hash(i, 84 + layer) * 60;
        const mid = Math.abs(x - SX) < 260 ? 0.45 : 1;
        const bw = 70 + hash(i, 80 + layer) * 70, bh = ((layer ? 150 : 90) + hash(i, 82 + layer) * (layer ? 110 : 90)) * mid;
        rrect(x, base - bh, bw, bh + 60, 3, { fill: tone, stroke: null });
        if (layer === 1) for (let w = 0; w < 4; w++) {
          const on = (S.title + 0.5 + hash(i, w + 90) * 9) < t;
          if (on && bh > 60) rrect(x + 12 + (w % 2) * (bw / 2 - 4), base - bh + 16 + Math.floor(w / 2) * 30, 14, 12, 2, { fill: '#FFD98A', stroke: null, alpha: 0.85 });
        }
      }
    }
    // ground and path
    rrect(-300, 860, W + 600, 400, 0, { fill: mix('#2A2A52', '#5E5478', k), stroke: null });
    rrect(-300, 884, W + 600, 64, 0, { fill: mix('#3C3A66', '#8A7C9C', k), stroke: null });
    // our block, cut off at the left edge
    const bt0 = mix('#3A4478', '#7A76A6', k);
    rrect(-300, 120, 660, 790, 8, { fill: bt0, lw: 6 });
    rrect(-310, 104, 680, 24, 6, { fill: mix(bt0, '#000000', 0.25), lw: 5 });
    for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
      const on = hash(r, c + 3) < 0.05 + k * 0.3 && r < 7;
      rrect(-260 + c * 150, 160 + r * 76, 110, 46, 4, { fill: on ? '#FFD98A' : mix('#232A52', '#5A5A88', k), stroke: null });
    }
    letter('101', 230, 76, 44, mix('#8A93C0', '#FFFFFF', k), { lw: 0, shadow: null });
    // the entrance: canopy, glass doors, a warm light
    const EX = 190;
    rrect(EX - 150, 740, 300, 150, 6, { fill: '#2A2448', lw: 5 });
    const door = seg(t, 10.0, 10.5) - seg(t, 11.3, 11.8);
    ctx.save(); ctx.beginPath(); ctx.rect(EX - 138, 752, 276, 138); ctx.clip();
    fillRectW(EX - 138, 752, 276, 138, '#FFE3A8');
    rrect(EX - 138 - door * 130, 752, 138, 138, 0, { fill: 'rgba(170,200,230,0.55)', lw: 4 });
    rrect(EX + door * 130, 752, 138, 138, 0, { fill: 'rgba(170,200,230,0.55)', lw: 4 });
    ctx.restore();
    rrect(EX - 180, 710, 360, 40, 8, { fill: '#5A5A82', lw: 5 });
    glow(EX, 800, 280, '#FFC878', 0.45 * (1 - k * 0.5));
    // streetlamps along the path, switching off as the sky brightens
    for (const lx of [760, 1560]) {
      const on = 1 - seg(t, 17.4, 17.55);
      stroke([[lx, 890], [lx, 620], [lx + 30, 600]], '#4A4870', 12, { olw: 7 });
      rrect(lx + 20, 594, 60, 20, 8, { fill: on > 0.5 ? '#FFE9A8' : '#C9C4D0', lw: 5 });
      if (on > 0) glow(lx + 50, 620, 220, '#FFC060', 0.45 * on);
    }
    // 아빠 steps out, walks, stops to look at the sky, walks on
    const out = 10.35;
    if (t > out) {
      const P = [13.5, 13.9, 16.7, 17.1];
      const pause = seg(t, P[0], P[1]) - seg(t, P[2], P[3]);
      const walked = (t - out) - trapInt(t, ...P);
      const x = EX + walked * 105, s = 0.64;
      const look = ease(pause);
      const blink = t > 15.4 && t < 15.55;
      dad(x, 910, s, t, {
        walk: walked * 0.85, aR: 0.12, eR: 0.08,
        eyes: blink ? 'closed' : look > 0.5 && t > 15.6 ? 'happy' : 'open', lookY: -look, lookX: look * 0.5,
        mouth: look > 0.5 && t > 15.6 ? 'smile' : 'flat', headRot: -look * 0.08, bags: 0.45,
        holdR: (hx, hy) => briefcase(hx, hy - 6, 0.6),
        alpha: clamp((t - out) / 0.25),
      });
      if (look > 0.5 && t > 16.2 && t < 17.0) {
        // a slow breath of cold morning air
        const bk = seg(t, 16.2, 17.0);
        smooth(blobPts(x + 60 + bk * 60, 910 - 300 * s - bk * 30, 18 + bk * 20, 7, 0.2, 3), { fill: '#FFFFFF', stroke: null, alpha: 0.5 * (1 - bk) });
      }
    }
    camEnd();
    // the title, landing softly on the beats
    ctx.save();
    ctx.font = `176px ${FONT.bold}`;
    const chars = [...TITLE], ws = chars.map(c => (c === ' ' ? 70 : ctx.measureText(c).width + 4));
    ctx.restore();
    const total = ws.reduce((a, b2) => a + b2, 0);
    const TX = 1100, TY = 290;
    let x = TX - total / 2;
    const breathe = 1 + 0.012 * pulse(t, 5) * seg(t, 16.8, 17.2);
    chars.forEach((c, i) => {
      const t0 = TITLE_T[i], wch = ws[i];
      if (t0 !== null && t > t0 - 0.25) {
        const a = seg(t, t0 - 0.25, t0 + 0.5), cx = x + wch / 2, cy = TY - (1 - easeOut(a)) * 46;
        glow(cx, TY, 190, '#FFE0A0', 0.28 * hitK(t, t0, 0.7));
        const sc = lerp(1.15, 1, easeOut(a)) * breathe;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        letter(c, 0, 0, 176, i < 3 ? '#FFF4E0' : '#FFD45C', { alpha: ease(a), lw: 20, shadow: '#2A2438' });
        ctx.restore();
      }
      x += wch;
    });
    // a thin line and a small subtitle under it
    const sub = seg(t, 16.8, 17.8);
    if (sub > 0) {
      const lw = 560 * easeOut(sub);
      stroke([[TX - lw / 2, 420], [TX + lw / 2, 420]], '#FFF1D6', 4, { ink: null, alpha: 0.85 });
      sparkle(TX - lw / 2 - 20, 420, 12 * sub, '#FFF1D6', t * 0.5); sparkle(TX + lw / 2 + 20, 420, 12 * sub, '#FFF1D6', -t * 0.5);
      letter('GOOD JOB TODAY', TX, 470, 46, '#FFF1D6', { font: 'round', alpha: ease(seg(t, 17.2, 18.0)), lw: 7, shadow: null });
    }
    // fade in from the dark room
    flash(1 - ease(seg(t, S.title, S.title + 0.5)), '#141833');
  }

  // ---- 19.20 the bathroom mirror: yawn, tie, 05:31 ---------------------------------------------------

  const MIR = { x: 200, y: 70, w: 1300, h: 800 };

  function mirror(t, lt, dur) {
    // tiles
    fillScreen('#CFE0E4');
    camDrift(t, 960, 540, 1.0 + lt * 0.012, 0, 0.7);
    for (let i = 0; i < 26; i++) stroke([[i * 80 - 40, -40], [i * 80 - 40, 1120]], '#B8CDD2', 3, { ink: null });
    for (let j = 0; j < 16; j++) stroke([[-40, j * 80], [1960, j * 80]], '#B8CDD2', 3, { ink: null });
    // the bathroom clock beside the mirror: 05:31
    digitalClock(1720, 330, 0.62, '05:31', { blink: frac(beatOf(t)) < 0.5 ? 1 : 0.2, body: '#FFFFFF', glow: 0.5 });
    // a towel on a ring
    circle(1720, 560, 36, { fill: null, lw: 7 });
    rrect(1650, 580, 140, 220, 20, { fill: '#FFB0A0', lw: 5 });
    stroke([[1650, 760], [1790, 760]], '#FF8C7A', 8, { ink: null });
    // the mirror
    rrect(MIR.x - 18, MIR.y - 18, MIR.w + 36, MIR.h + 36, 30, { fill: '#D6DCE4', lw: 7 });
    ctx.save(); rrectPath(MIR.x, MIR.y, MIR.w, MIR.h, 20); ctx.clip();
    // the reflected room behind him: tiles, a shower curtain, the light
    fillRectW(MIR.x, MIR.y, MIR.w, MIR.h, '#B9D2DA');
    for (let i = 0; i < 18; i++) stroke([[MIR.x + i * 90, MIR.y], [MIR.x + i * 90, MIR.y + MIR.h]], '#A6C0C8', 3, { ink: null });
    for (let i = 0; i < 6; i++) smooth([[280 + i * 70, 60], [320 + i * 70, 60], [310 + i * 70, 900], [270 + i * 70, 900]], { fill: i % 2 ? '#9FD0E8' : '#B8E0F0', stroke: null });
    glow(850, 90, 500, '#FFFFFF', 0.4);
    // 아빠, half asleep
    const s = 1.95, fx = 860, fy = 1230;
    // the timeline: wipe the fog, tie, a huge yawn, then pull the knot up too tight
    const wipe = seg(t, 19.25, 20.3);
    const yawn = seg(t, 21.5, 21.8) - seg(t, 22.7, 23.0);
    const tug = S.mirror + 4.2;                                       // 23.40, on "시"
    const tight = t > tug ? Math.exp(-(t - tug) * 3) : 0;
    let aL = 0.6, aR = 0.6, eL = -2.3, eR = -2.3;
    if (t < 20.3) {
      // one hand up wiping circles in the steam
      aR = 2.5 + Math.sin(wipe * TAU * 2) * 0.35; eR = 0.4; aL = 0.2; eL = 0.2;
    } else {
      // fiddling with the knot: hands at the collar, working on the beat
      const w = Math.sin(beatOf(t) * Math.PI) * 0.18;
      aL = 0.5 + w; aR = 0.5 - w; eL = -2.2; eR = -2.2;
      if (t > tug - 0.1) { aL = 0.55; aR = 0.55; eL = -2.5 - tight * 0.3; eR = -2.5 - tight * 0.3; }
    }
    const m = yawn > 0.3 ? { eyes: 'closed', mouth: 'yawn' }
      : t > tug ? (t < tug + 0.7 ? { eyes: 'wide', mouth: 'o' } : { eyes: 'open', mouth: 'smile' })
        : { eyes: 'sleepy', mouth: t < 20.3 ? 'flat' : 'wavy' };
    dad(fx, fy + tight * 14, s, t, {
      jacket: false, looseTie: t < tug, ...m, bags: 0.7, blush: t > tug ? 0.4 * tight + 0.1 : 0.1,
      aL, aR, eL, eR, headRot: -yawn * 0.12 + tight * 0.05 * Math.sin((t - tug) * 30), sq: -yawn * 0.03 + tight * 0.04,
      emote: t > tug && t < tug + 0.8 ? 'sweat' : null, emoteK: seg(t, tug, tug + 0.15),
    });
    // a yawn tear
    if (yawn > 0.5) smooth([[fx + 104, 520], [112 + fx, 546], [fx + 104, 556], [fx + 96, 546]], { fill: '#9FDCFF', lw: 3 });
    // steam on the glass: everywhere except where he wiped
    ctx.save();
    ctx.beginPath(); ctx.rect(MIR.x, MIR.y, MIR.w, MIR.h);
    const rx = 90 + easeOut(wipe) * 330, ry = 70 + easeOut(wipe) * 300;
    ctx.ellipse(fx + 10, 500, rx, ry, 0, 0, TAU, true);
    ctx.fillStyle = 'rgba(245,250,252,0.62)'; ctx.fill('evenodd');
    ctx.restore();
    // droplets running down the steam
    for (let i = 0; i < 14; i++) {
      const dx = MIR.x + 40 + hash(i, 5) * (MIR.w - 80), dy = MIR.y + 40 + frac(hash(i, 6) + lt * 0.05) * (MIR.h - 60);
      if (Math.hypot((dx - fx - 10) / rx, (dy - 500) / ry) < 1) continue;
      stroke([[dx, dy - 30], [dx, dy]], 'rgba(255,255,255,0.8)', 4, { ink: null });
      circle(dx, dy + 2, 5, { fill: 'rgba(255,255,255,0.9)', stroke: null });
    }
    ctx.restore();
    // the shine on the glass
    stroke([[MIR.x + 60, MIR.y + 300], [MIR.x + 220, MIR.y + 60]], '#FFFFFF', 18, { ink: null, alpha: 0.35 });
    stroke([[MIR.x + 110, MIR.y + 330], [MIR.x + 250, MIR.y + 120]], '#FFFFFF', 8, { ink: null, alpha: 0.35 });
    // the sink ledge with a toothbrush cup
    rrect(120, 890, 1460, 60, 20, { fill: '#F4F6F8', lw: 6 });
    rrect(1260, 800, 70, 96, 12, { fill: '#8FD3FF', lw: 5 });
    stroke([[1280, 800], [1266, 720]], '#FF8FB1', 10, { olw: 7 });
    stroke([[1308, 800], [1320, 730]], '#6FE3C8', 10, { olw: 7 });
    if (t > tug) sfx('꽉!', fx + 250, 700, 90, '#FFFFFF', t - tug, { life: 0.8, rot: 0.12 });
    camEnd();
  }

  // ---- 24.00 the children's room: a kiss, a blanket -------------------------------------------------

  function kidsRoom(t, lt, dur) {
    const kiss = sylT(10, 7);                       // 26.40 "입"
    const drape = 27.9;
    const pan = easeInOut(seg(t, 26.9, 27.9));
    fillScreen('#1E2448');
    camBegin(lerp(820, 1060, pan) + Math.sin(t * 0.4) * 5, 560, 1.08 - pan * 0.03);
    // wall and floor
    fillRectW(-200, -100, 2400, 900, lgrad(0, 0, 0, 800, [[0, '#2A3060'], [1, '#353A6E']]));
    rrect(-200, 800, 2400, 400, 0, { fill: '#4A3E6A', stroke: null });
    stroke([[-200, 800], [2200, 800]], '#2A2448', 6, { ink: null });
    // the mood light: a round lamp throwing slow stars round the room
    const ml = [640, 600];
    glow(ml[0], ml[1], 800, '#FFD6A0', 0.3);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + t * 0.12, r = 300 + hash(i, 3) * 700;
      const sx = ml[0] + Math.cos(a) * r * 1.3, sy = ml[1] - 120 + Math.sin(a) * r * 0.55;
      if (sy > 790) continue;
      ctx.save(); ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 2 + i);
      poly(starShape(sx, sy, 9 + hash(i, 4) * 10, 0.45), { fill: '#FFE9B8', stroke: null });
      ctx.restore();
    }
    // the door on the left, ajar: hallway light on the floor
    rrect(-60, 250, 220, 560, 6, { fill: '#FFE3A8', stroke: null });
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#FFE3A8';
    ctx.beginPath(); ctx.moveTo(-60, 810); ctx.lineTo(160, 810); ctx.lineTo(520, 1100); ctx.lineTo(-60, 1100); ctx.fill(); ctx.restore();
    rrect(160, 250, 40, 560, 4, { fill: '#8A6A5A', lw: 5 });
    // a crayon drawing on the wall
    rrect(760, 250, 170, 130, 6, { fill: '#FFFDF4', lw: 4 }, -0.05);
    circle(800, 290, 18, { fill: PAL.sun, stroke: null });
    stroke([[790, 350], [880, 350]], PAL.grass, 8, { ink: null });
    stroke([[850, 350], [850, 310]], '#4E8EF7', 6, { ink: null }); circle(850, 300, 10, { fill: PAL.skin, stroke: null });
    // nightstand with the lamp
    rrect(560, 660, 160, 150, 10, { fill: '#C9A07A', lw: 5 });
    circle(ml[0], ml[1], 50, { fill: '#FFF0C8', lw: 5 });
    glow(ml[0], ml[1], 160, '#FFE0A0', 0.7);
    for (let i = 0; i < 5; i++) poly(starShape(ml[0] + Math.cos(i * 1.3 + t * 0.5) * 26, ml[1] + Math.sin(i * 1.3 + t * 0.5) * 20, 8, 0.45), { fill: '#FFC878', stroke: null });
    // the little one's bed: head end on the left
    rrect(760, 560, 60, 260, 16, { fill: '#6FA0D8', lw: 6 });
    rrect(800, 700, 560, 110, 14, { fill: '#F2EEE6', lw: 6 });
    rrect(1330, 640, 44, 180, 14, { fill: '#6FA0D8', lw: 6 });
    ell(890, 680, 90, 36, { fill: '#FFFFFF', lw: 5 });
    const smile = t > kiss + 0.3;
    person(1070, 684, 0.95, {
      role: 'child', t, rot: -Math.PI / 2, shadow: false, eyes: 'closed', mouth: smile ? 'cat' : 'o', blush: smile ? 0.8 : 0.5,
    });
    dinoPlush(990, 636, 0.7, -0.2);
    smooth([[960, 660], [1080, 630], [1250, 640], [1340, 680], [1350, 790], [940, 790]], { fill: '#FFC23D', lw: 6 });
    for (let i = 0; i < 4; i++) circle(1030 + i * 90, 720 + (i % 2) * 22, 12, { fill: '#FF9A3D', stroke: null });
    zzz(t, 880, 580, 0.9, smile ? 0.6 : 1);
    // 첫째, asleep on her desk over a workbook, slumped onto her arm
    const kx = 1600, ky = 812;
    rrect(1480, 640, 20, 180, 4, { fill: '#8A93A6', lw: 4 });
    // the blanket settles over her back: it shows round her shoulders
    const dk = seg(t, drape - 0.5, drape + 0.1);
    if (dk > 0) {
      const by = lerp(420, 560, easeOut(dk)), bs = lerp(0.75, 1, easeOut(dk));
      ctx.save(); ctx.translate(kx + 60, by); ctx.rotate(0.3); ctx.scale(bs, bs);
      smooth([[-150, -40], [-40, -80], [120, -60], [170, 20], [160, 150], [-150, 150], [-176, 40]], { fill: '#FF9AB0', lw: 5 });
      for (let i = 0; i < 3; i++) stroke([[-100 + i * 100, -50], [-110 + i * 100, 130]], '#FFC4D2', 10, { ink: null });
      ctx.restore();
    }
    kid(kx, ky, 0.92, {
      who: 'pony', t, rot: 0.32, headRot: 0.22, headDy: 30, eyes: 'closed', mouth: 'o', blush: 0.6,
      aL: 1.2, eL: 1.2, aR: 2.3, eR: 1.6,
    });
    // desk in front of her
    rrect(1440, 640, 420, 36, 8, { fill: '#D9A066', lw: 6 });
    rrect(1470, 676, 360, 140, 6, { fill: '#B87942', lw: 5 });
    rrect(1520, 606, 130, 36, 4, { fill: '#FFFDF4', lw: 4 }, 0.04);
    rrect(1760, 560, 34, 84, 4, { fill: PAL.blue, lw: 4 }); rrect(1796, 576, 30, 68, 4, { fill: PAL.pink, lw: 4 });
    stroke([[1480, 640], [1470, 520], [1530, 480]], '#5B6378', 8, { olw: 6 });
    poly([[1510, 470], [1570, 470], [1560, 500], [1520, 500]], { fill: '#6FE3C8', lw: 4 });
    // 아빠: tiptoes in, kisses the forehead, tiptoes over with the blanket
    const s = 0.95;
    let x, rot = 0, walk, aL = 1.55, aR = 1.55, eL = 1.3, eR = 1.3, dy = 0, eyes = 'open', mouth = 'smile', holdR = null;
    const sneak = (a, b) => { const k = seg(t, a, b); return k; };
    if (t < 25.3) { x = lerp(80, 720, easeInOut(sneak(24.0, 25.3))); walk = (t - 24) * 1.3; dy = hop(t * 0.65) * 26 + 10; rot = 0.08; eyes = 'dot'; mouth = 'o'; }
    else if (t < 26.9) {
      x = 720; walk = undefined;
      const lean = easeInOut(seg(t, 25.3, 26.1)) - easeInOut(seg(t, 26.7, 27.0)) * 0.9;
      rot = lean * 0.46; aL = 0.4; aR = 0.4; eL = 0.3; eR = 0.3;
      eyes = t > kiss - 0.1 && t < kiss + 0.35 ? 'closed' : 'happy'; mouth = t > kiss - 0.1 && t < kiss + 0.35 ? 'o' : 'smile';
    } else if (t < drape - 0.4) {
      x = lerp(720, 1330, easeInOut(sneak(26.9, drape - 0.4))); walk = (t - 26.9) * 1.8; dy = hop(t * 0.8) * 40 + 12; rot = 0.08; eyes = 'dot'; mouth = 'o';
      holdR = (hx, hy) => { ctx.save(); ctx.translate(hx, hy); smooth([[-20, -30], [40, -40], [60, 20], [0, 50], [-40, 20]], { fill: '#FF9AB0', lw: 4 }); ctx.restore(); };
      aR = 2.2; eR = -0.6;
    } else {
      x = 1330; aL = 1.3; aR = 1.3; eL = -0.4; eR = -0.4; eyes = t > drape + 0.2 ? 'happy' : 'dot'; mouth = 'smile';
      rot = 0.18 * (1 - seg(t, drape + 0.2, drape + 0.6));
    }
    dad(x, 900, s, t, { walk, rot, aL, aR, eL, eR, dy, eyes, mouth, holdR, bags: 0.4, lL: walk === undefined ? 0.1 : undefined });
    // the kiss
    const hk = seg(t, kiss, kiss + 1.3);
    if (hk > 0 && hk < 1) {
      poly(heartPts(880 + Math.sin(hk * 9) * 12, 590 - hk * 150, 26 * backOut(clamp(hk * 4))), { fill: PAL.red, lw: 4, alpha: 1 - ease(seg(hk, 0.7, 1)) });
    }
    if (t > kiss && t < kiss + 0.6) sfx('쪽', 960, 520, 64, PAL.pink, t - kiss, { life: 0.6 });
    camEnd();
  }

  // ---- 28.80 the packed subway ---------------------------------------------------------------------

  function subwayCar(t, lt) {
    const shut = S.subway + 0.5;                      // 29.30, the doors thump shut
    const yank = S.subway + 1.1;                      // 29.90, the briefcase pops in
    const go = 30.0;
    const scroll = t < go ? 0 : 0.5 * 700 * Math.pow(t - go, 2);
    const moving = seg(t, go, go + 0.6);
    const sway = Math.sin(beatOf(t) * Math.PI) * 0.06 * moving;
    const push = easeInOut(seg(t, 31.4, 33.0));
    const [shx, shy] = shakeXY(t, shut, 14, 0.3);
    const DX = 860;                                    // where he ends up: the left door's window
    const gap = 440, pw = gap / 2 + 10, carY = 170, carH = 760, floorY = 930;
    fillScreen('#2A2E3C');
    camBegin(lerp(960, DX, push) + shx + sway * 80, lerp(560, 470, push) + shy, lerp(1.22, 2.35, push));
    // behind the train: the station, then the dark tunnel
    const station = 1 - seg(scroll, 1600, 2600);
    fillRectW(-400, -300, 2800, 1700, mix('#1E2130', '#C9CFD8', station));
    // inside the car: light walls, straps, a crowd
    const carX = -300, carW = 2520;
    ctx.save(); ctx.beginPath(); ctx.rect(carX, carY, carW, carH); ctx.clip();
    fillRectW(carX, carY, carW, carH, '#EDE8DC');
    rrect(carX, carY + 20, carW, 26, 0, { fill: '#C9C2B2', stroke: null });
    for (let i = 0; i < 18; i++) {
      const sx = carX + 60 + i * 150, a = sway * 2;
      stroke([[sx, carY + 34], [sx + Math.sin(a) * 60, carY + 90]], '#9AA3B5', 5, { ink: null });
      ell(sx + Math.sin(a) * 66, carY + 106, 16, 20, { fill: null, lw: 6, stroke: '#F2F2F2' });
    }
    // the crowd, swaying on the beat (each a little late)
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 15; i++) {
        const x = carX + 40 + i * 170 + row * 85 + hash(i, row) * 30;
        if (Math.abs(x - 960) < 170 && row === 1) continue;
        const y = 560 + row * 56 + hash(i, row + 7) * 24;
        const lag = hash(i, row + 3) * 0.3;
        const r = Math.sin((beatOf(t) - lag) * Math.PI) * 0.08 * moving;
        commuter(x, y, 0.95 + row * 0.1, i + row * 15, { rot: r });
      }
    }
    // 아빠 in the door; once the doors shut he is squashed against the glass
    const doorOpen = t < shut ? 1 - easeIn(seg(t, S.subway + 0.05, shut)) : 0;
    const squeeze = hitK(t, shut, 0.8);
    const dr = Math.sin((beatOf(t) - 0.15) * Math.PI) * 0.1 * moving;
    const dx = t < shut ? 960 : lerp(960, DX, easeOut(seg(t, shut - 0.1, shut + 0.25)));
    const pressK = t < shut ? 0 : Math.max(0.5, push);
    ctx.save();
    ctx.translate(dx, 540); ctx.scale(1 + pressK * 0.08, 1 - pressK * 0.05); ctx.translate(-dx, -540);
    dad(dx + dr * 90, floorY - 20, 1.08, t, {
      rot: dr, sq: 0.08 * squeeze - 0.02, aL: 0.15, aR: 0.15, eL: 0, eR: 0, shadow: false,
      eyes: t < shut ? 'wide' : t < go + 0.6 ? 'x' : (push > 0.5 ? 'closed' : 'sleepy'),
      mouth: t < shut ? 'o' : push > 0.5 ? 'wavy' : 'flat', blush: 0.45 + push * 0.35, bags: 0.5,
      emote: t > go && t < 31.2 ? 'sweat' : null, emoteK: seg(t, go, go + 0.2),
    });
    ctx.restore();
    ctx.restore();
    // the car shell with window holes and the doorway
    const wins = [[-250, 260, 520, 320], [1470, 260, 520, 320]];
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, carY - 60, 2800, carH + 90);
    for (const [x, y, w, h] of wins) ctx.roundRect(x, y, w, h, 24);
    ctx.rect(960 - gap / 2, 200, gap, floorY - 200);
    ctx.fillStyle = '#D5DAE2'; ctx.fill('evenodd');
    ctx.lineWidth = 6; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.restore();
    rrect(-400, 640, 960 - gap / 2 + 400, 34, 0, { fill: '#3CB44A', stroke: null });
    rrect(960 + gap / 2, 640, 1600, 34, 0, { fill: '#3CB44A', stroke: null });
    for (const [x, y, w, h] of wins) {
      rrect(x, y, w, h, 24, { fill: 'rgba(200,225,240,0.2)', lw: 6 });
      stroke([[x + 40, y + h - 40], [x + 140, y + 40]], '#FFFFFF', 12, { ink: null, alpha: 0.3 });
    }
    // door panels slide in from the sides; each has a big window
    for (const side of [-1, 1]) {
      const bump = hitK(t, shut, 0.25) * 12 * side;
      const x0 = (side < 0 ? 960 - gap / 2 - (pw - 10) * doorOpen - 10 : 960 + (pw - 10) * doorOpen) + bump;
      ctx.save(); ctx.beginPath(); ctx.rect(960 - gap / 2 - 12, 150, gap + 24, 820); ctx.clip();
      ctx.beginPath(); ctx.rect(x0, 200, pw, floorY - 200); ctx.roundRect(x0 + 22, 250, pw - 44, 390, 20);
      ctx.fillStyle = '#C9CFD8'; ctx.fill('evenodd'); ctx.lineWidth = 6; ctx.strokeStyle = PAL.ink; ctx.stroke();
      rrect(x0 + 22, 250, pw - 44, 390, 20, { fill: 'rgba(200,225,240,0.18)', lw: 5 });
      rrect(x0, 660, pw, 34, 0, { fill: '#3CB44A', stroke: null });
      ctx.restore();
    }
    // his cheek against the door glass: a pale print, a little fog from his breath
    if (pressK > 0) {
      const fx = dx + dr * 90, fy = floorY - 20 - 1.08 * 330;
      rrect(fx + 40, fy - 60, 50 * pressK, 110 * pressK, 24, { fill: 'rgba(255,255,255,0.28)', stroke: null });
      for (let i = 0; i < 3; i++) stroke([[fx + 104, fy - 40 + i * 34], [fx + 124, fy - 46 + i * 34]], '#FFFFFF', 5, { ink: null, alpha: pressK * 0.8 });
      ell(fx - 10, fy + 90, 40 * pressK, 18 * pressK, { fill: 'rgba(255,255,255,0.45)', stroke: null });
      stroke([[fx - 60, fy - 80], [fx - 30, fy - 110]], '#FFFFFF', 8, { ink: null, alpha: 0.5 * pressK });
    }
    // light sweeping over the car in the tunnel
    if (station < 1) {
      ctx.save(); ctx.globalAlpha = 0.18 * (1 - station);
      for (let i = 0; i < 3; i++) {
        const x = ((i * 900 - scroll * 1.1) % 2700 + 2700) % 2700 - 500;
        ctx.fillStyle = '#FFF0C0'; ctx.beginPath(); ctx.moveTo(x, carY); ctx.lineTo(x + 160, carY); ctx.lineTo(x + 60, floorY); ctx.lineTo(x - 100, floorY); ctx.fill();
      }
      ctx.restore();
    }
    // the briefcase caught in the door, then yanked in
    if (t >= shut - 0.05 && t < yank) {
      const wig = Math.sin(t * 40) * 0.08;
      briefcase(960, 720, 1.2, wig + 0.05);
    }
    // the platform: floor, edge and pillars going by
    rrect(-400, floorY, 2800, 300, 0, { fill: mix('#15171F', '#9AA1AE', station), stroke: null });
    if (station > 0) rrect(-400, floorY, 2800, 22, 0, { fill: '#FFD45C', stroke: null, alpha: station });
    else for (let i = 0; i < 8; i++) {
      const x = ((i * 400 - scroll * 1.2) % 3200 + 3200) % 3200 - 400;
      rrect(x, floorY + 60, 160, 12, 6, { fill: '#FFE9A8', stroke: null, alpha: 0.7 });
    }
    if (station > 0 && scroll > 0) for (let i = 0; i < 3; i++) {
      const x = ((1500 + i * 1100 - scroll * 1.5) % 3300 + 3300) % 3300 - 600;
      rrect(x, -300, 110, 1600, 0, { fill: '#8C94A4', lw: 6, alpha: station });
    }
    camEnd();
    streaks(t, 0.8 * seg(scroll, 300, 1200), '#FFFFFF', 7, -1);
    // 딩동 on the door chime, and the thump
    sfx('딩동♪', 380, 170, 80, '#FFFFFF', t - S.subway, { life: 1.1, rot: -0.08 });
    if (t >= yank) sfx('쏙', 1150, 560, 80, '#FFFFFF', t - yank, { life: 0.6 });
  }

  // ---- 33.60 up the exit stairs into the sun -------------------------------------------------------

  function exitStairs(t, lt, dur) {
    const top = 36.0;                   // he reaches the street
    const pat = [36.5, 37.0];           // smoothing his hair
    const fist = sylT(14, 10);          // 37.50 "야"
    fillScreen('#EAF0F4');
    camDrift(t, 960, 560, 1.04 + easeInOut(seg(t, 34.0, 38.4)) * 0.14, 0, 0.6);
    // a cold pale morning: sky, soft sun, grey-blue towers
    fillRectW(-200, -200, 2400, 1000, lgrad(0, -100, 0, 760, [[0, '#BFD4E6'], [0.7, '#EEE6DA'], [1, '#FFE8C8']]));
    sun(1560, 200, 90, '#FFF0C0');
    for (let i = 0; i < 10; i++) {
      const x = -100 + i * 220, bw = 180, bh = 300 + hash(i, 21) * 300;
      rrect(x, 720 - bh, bw, bh + 10, 6, { fill: mix('#A9B6C8', '#D8DEE6', hash(i, 22)), stroke: null });
      for (let r = 0; r < Math.floor(bh / 60); r++) rrect(x + 20, 720 - bh + 26 + r * 60, bw - 40, 18, 3, { fill: '#C8D6E6', stroke: null });
    }
    // pavement
    const pavement = () => {
      rrect(-200, 720, 2400, 600, 0, { fill: '#CFC9C2', stroke: null });
      for (let i = 0; i < 16; i++) stroke([[i * 160 - 300, 720], [i * 300 - 1300, 1150]], '#BDB6AF', 3, { ink: null });
    };
    pavement();
    // passers-by in the distance, off to work too
    for (let i = 0; i < 6; i++) {
      const px = ((i * 430 + lt * (i % 2 ? 110 : -110)) % 2400 + 2400) % 2400 - 200;
      const py = 740, b = Math.abs(Math.sin(lt * 6 + i)) * 4;
      rrect(px - 16, py - 120 - b, 32, 80, 12, { fill: '#8A93A6', stroke: null, alpha: 0.6 });
      circle(px, py - 138 - b, 17, { fill: '#8A93A6', stroke: null, alpha: 0.6 });
    }
    // light shafts
    ctx.save(); ctx.globalAlpha = 0.16;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(1560, 200);
      ctx.lineTo(1560 - 1400 - i * 140, 1150); ctx.lineTo(1560 - 1080 - i * 140, 1150); ctx.fillStyle = '#FFF4D8'; ctx.fill();
    }
    ctx.restore();
    // the exit: a hole with stairs going down, under a glass canopy
    const ox = 960, ow = 680, lip = 830, roof = 300;
    ctx.save(); ctx.beginPath(); ctx.rect(ox - ow / 2, roof, ow, lip - roof); ctx.clip();
    fillRectW(ox - ow / 2, roof, ow, lip - roof, lgrad(0, roof, 0, lip, [[0, '#2A2E40'], [0.6, '#3A4058'], [1, '#5A6078']]));
    // steps and handrails receding down into the dark
    for (let i = 0; i < 9; i++) {
      const k = i / 9, y = lip - 30 - Math.pow(k, 0.8) * 330, half = ow / 2 - 30 - k * 180;
      stroke([[ox - half, y], [ox + half, y]], rgba('#E8ECF4', 0.5 - k * 0.45), 7, { ink: null });
    }
    for (const side of [-1, 1]) stroke([[ox + side * (ow / 2 - 26), lip - 120], [ox + side * 150, lip - 390]], '#9AA3B5', 9, { ink: null, alpha: 0.8 });
    glow(ox, lip - 380, 260, '#E8F4FF', 0.2);
    ctx.restore();
    // the canopy: posts, glass sides, roof and sign
    for (const side of [-1, 1]) {
      const px = ox + side * (ow / 2 + 16);
      rrect(px - (side < 0 ? 40 : 0), roof + 40, 40, lip - roof - 40, 0, { fill: 'rgba(190,220,240,0.35)', stroke: null });
      stroke([[px, lip], [px, roof + 20]], '#6A7288', 16, { olw: 7 });
    }
    rrect(ox - ow / 2 - 70, roof - 60, ow + 140, 80, 14, { fill: '#5A6380', lw: 6 });
    circle(ox - ow / 2 + 10, roof - 20, 40, { fill: '#FFD45C', lw: 5 });
    letter('3', ox - ow / 2 + 10, roof - 17, 52, PAL.ink, { lw: 0, shadow: null });
    letter('지하철 출구', ox + 40, roof - 18, 50, '#FFFFFF', { lw: 0, shadow: null });
    // 아빠 comes up a step on every beat
    const nb = beatOf(top) - beatOf(S.exit);
    const steps = Math.min(beatOf(t) - beatOf(S.exit), nb);
    const climb = (Math.floor(steps) + easeOut(clamp((steps - Math.floor(steps)) * 2.5))) / nb;
    const out = easeOut(seg(t, top, top + 1.3));
    const fy = t < top ? lerp(1280, lip, climb) : lerp(lip, 915, out);
    const s = t < top ? lerp(0.9, 1.05, climb) : lerp(1.05, 1.18, out);
    const sunK = seg(fy, 1080, lip);
    const smooth1 = seg(t, pat[0], pat[0] + 0.25) - seg(t, pat[1], pat[1] + 0.25);
    const fk = seg(t, fist - 0.12, fist + 0.03);
    const pump = t > fist ? Math.sin((t - fist) * 16) * Math.exp(-(t - fist) * 4) : 0;
    const o = {
      aL: 0.2, aR: 0.2, eL: 0.2, eR: 0.2, shadow: fy >= lip,
      holdL: (hx, hy) => briefcase(hx, hy - 6, 0.55),
      eyes: sunK < 0.5 ? 'sleepy' : t < top + 0.35 ? 'closed' : (t > fist ? 'determined' : 'happy'),
      mouth: t > fist ? 'grin' : sunK > 0.5 ? 'smile' : 'flat', bags: 0.5, blush: 0.25,
      walk: t < top ? steps * 0.5 : t < top + 1.3 ? (t - top) * 1.2 : undefined,
    };
    if (smooth1 > 0) { o.aR = 2.8; o.eR = 1.0 + Math.sin(t * 16) * 0.25 * smooth1; }
    if (fk > 0) { o.aR = lerp(0.2, 0.35, fk); o.eR = lerp(0.2, -2.7, fk) + pump * 0.3; o.dy = pump * 8; }
    dad(ox, fy, s, t, o);
    if (fy > lip) {
      // the pavement in front of the hole hides his legs
      ctx.save(); ctx.beginPath(); ctx.rect(ox - ow / 2 - 60, lip, ow + 120, 500); ctx.clip(); pavement(); ctx.restore();
    }
    stroke([[ox - ow / 2, lip], [ox + ow / 2, lip]], '#8A8580', 8, { ink: null });
    // his hair, messed up by the train, until he smooths it
    const tuft = 1 - seg(t, pat[0], pat[1] + 0.15);
    if (tuft > 0) {
      const hx = ox, hy = fy - (455 + (o.dy || 0)) * s;
      for (let i = 0; i < 3; i++) {
        const a = -0.6 + i * 0.6 + Math.sin(t * 6 + i) * 0.1;
        stroke([[hx - 24 + i * 24, hy + 12], [hx - 24 + i * 24 + Math.sin(a) * 52 * tuft * s, hy + 12 - Math.cos(a) * 62 * tuft * s]], '#2B2733', 12, { olw: 8 });
      }
    }
    // the sun touching him as he comes up
    if (sunK > 0) glow(ox + 60, fy - 340 * s, 380, '#FFE6A8', 0.35 * sunK);
    if (t > fist) {
      sparkle(ox + 170, fy - 400 * s, 30 * hitK(t, fist, 1.2) + 4, '#FFFFFF', t);
      sparkle(ox + 220, fy - 310 * s, 16 * hitK(t, fist, 1.0), PAL.gold, -t);
    }
    camEnd();
  }

  chapter('dawn', 0, 38.4, [
    [S.complex, complex],
    [S.alarm, alarm],
    [S.title, title],
    [S.mirror, mirror],
    [S.kids, kidsRoom],
    [S.subway, subwayCar],
    [S.exit, exitStairs],
  ]);
})();
