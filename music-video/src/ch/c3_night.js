// Chapter 3 · 야자 (50.91 – 65.45): night study hall. Deep navy, fluorescent tubes, stars, a note
// passed behind the teacher's back, a report card that will not move, and the walk home under
// the streetlights with cup tteokbokki.
(() => {
  const BT = SONG.beat;
  const T_IN = 50.91, T_NOTE = 54.55, T_CARD = 58.18, T_HOME = 61.82, T_OUT = 65.45;

  // ---- private helpers -------------------------------------------------------------------------

  const nightSky = (t, seed = 21) => {
    skyFill([[0, '#0E1236'], [0.55, '#1F2860'], [1, '#383C7A']]);
    stars(t, 110, seed, 1, H * 0.72);
  };

  /** A few twinkling stars inside a rectangle (for window views). */
  function miniStars(t, x, y, w, h, n, seed) {
    for (let i = 0; i < n; i++) {
      const sx = x + hash(i, seed) * w, sy = y + hash(i, seed + 1) * h;
      const a = 0.5 + 0.5 * Math.sin(t * (2 + hash(i, seed + 2) * 3) + i);
      if (hash(i, seed + 3) > 0.75) sparkle(sx, sy, 9 * a + 3, '#FFFFFF', t * 0.4);
      else circle(sx, sy, 2 + hash(i, seed + 4) * 2.5, { fill: rgba('#FFFFFF', 0.4 + 0.6 * a), stroke: null });
    }
  }

  /** A stack of books, bottom-centre at (x, y). */
  function bookStack(x, y, s, n, seed) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const cols = [PAL.blue, PAL.orange, PAL.mint, PAL.red, PAL.lilac, PAL.gold, PAL.teal];
    let yy = 0;
    for (let i = 0; i < n; i++) {
      const h = 24 + hash(i, seed) * 16, w = 130 + hash(i, seed + 1) * 50, ox = (hash(i, seed + 2) - 0.5) * 26;
      rrect(-w / 2 + ox, yy - h, w, h, 5, { fill: cols[Math.floor(hash(i, seed + 3) * cols.length)], lw: 4 });
      rrect(-w / 2 + ox + w - 22, yy - h + 5, 12, h - 10, 2, { fill: 'rgba(255,255,255,0.65)', stroke: null });
      yy -= h;
    }
    ctx.restore();
  }

  /** How lit fluorescent tube i is at time t (they stutter now and then). */
  function tube(t, i, a = -1, b = -1) {
    if (t >= a && t < b) return hash(Math.floor(t * 20), i + 7) > 0.45 ? 1 : 0.15;
    return hash(Math.floor(t * 9), i + 3) > 0.03 ? 1 : 0.55;
  }

  /** The back wall of the 야자실 under cool light. Drawn in world coords, ~1920 wide. */
  function studyWall(t, o = {}) {
    rrect(-600, -600, W + 1200, H + 1200, 0, { fill: '#C6CFEA', stroke: null });
    rrect(-600, -600, W + 1200, 660, 0, { fill: '#AEB8DC', stroke: null });           // ceiling band
    // windows on the night
    for (const [i, wx] of [[0, 90], [1, 1420]]) {
      const wy = 130, ww = 420, wh = 340;
      rrect(wx, wy, ww, wh, 10, { fill: lgrad(0, wy, 0, wy + wh, [[0, '#0E1236'], [1, '#2B3370']]), lw: 7 });
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
      miniStars(t, wx, wy, ww, wh, 16, 40 + i);
      if (i === 1) moon(wx + 290, wy + 100, 46);
      else townRow(t, wy + wh + 20, 300, { tone: '#3B4378', lit: 0.35, seed: 4 });
      ctx.restore();
      stroke([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], '#E8EEFA', 9, { olw: 6 });
      stroke([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], '#E8EEFA', 9, { olw: 6 });
    }
    // notice board with pinned papers
    rrect(620, 150, 300, 230, 8, { fill: '#C9A06A', lw: 6 });
    for (let i = 0; i < 5; i++) {
      const px = 640 + (i % 3) * 92 + hash(i, 3) * 10, py = 168 + Math.floor(i / 3) * 104;
      rrect(px, py, 76, 90, 3, { fill: ['#FFFFFF', '#FFF4B8', '#DDF1FF'][i % 3], lw: 3, });
      circle(px + 38, py + 6, 6, { fill: PAL.red, lw: 2 });
      for (let l = 0; l < 4; l++) rrect(px + 10, py + 24 + l * 14, 54 - hash(i, l) * 20, 5, 2, { fill: '#B8BFD0', stroke: null });
    }
    // the clock
    wallClock(1150, 250, 82, o.clock ? o.clock[0] : 10, o.clock ? o.clock[1] : 0);
    // lockers along the bottom of the wall
    rrect(-600, 560, W + 1200, 240, 0, { fill: '#8F9BC6', lw: 6 });
    for (let i = -3; i < 17; i++) {
      const lx = 20 + i * 140;
      rrect(lx, 580, 124, 196, 8, { fill: '#A7B2DA', lw: 4 });
      rrect(lx + 20, 600, 60, 8, 3, { fill: '#7D88B6', stroke: null });
      circle(lx + 104, 680, 6, { fill: PAL.ink, stroke: null });
    }
    rrect(-600, 790, W + 1200, 700, 0, { fill: '#5E5A88', lw: 6 });
    for (let i = -4; i < 16; i++) stroke([[i * 170, 800], [i * 230 - 500, 1400]], '#534F7C', 4, { ink: null });
  }

  /** The fluorescent tubes across the ceiling (world coords), with stutter window [a, b). */
  function ceilingTubes(t, a, b) {
    let dark = 0;
    for (let i = 0; i < 3; i++) {
      const lx = 150 + i * 620, k = tube(t, i, i === 1 ? a : -1, i === 1 ? b : -1);
      stroke([[lx + 40, -60], [lx + 40, 26]], '#9AA3B5', 4, { ink: null });
      stroke([[lx + 280, -60], [lx + 280, 26]], '#9AA3B5', 4, { ink: null });
      rrect(lx, 22, 320, 24, 10, { fill: k > 0.5 ? '#FDFFFF' : '#C4CBDA', lw: 5 });
      if (k > 0.5) glow(lx + 160, 40, 420, '#E4F2FF', 0.4 * k);
      dark += 1 - k;
    }
    return dark;
  }

  /** A moth fluttering around a point. */
  function moth(t, cx, cy, r, seed) {
    const a = t * 3.1 + seed, x = cx + Math.cos(a) * r, y = cy + Math.sin(a * 1.7) * r * 0.35;
    const f = Math.sin(t * 60) * 0.5 + 0.5;
    ell(x - 7, y, 9, 4 + f * 8, { fill: '#E8DCC0', lw: 2.5 }, -0.4);
    ell(x + 7, y, 9, 4 + f * 8, { fill: '#E8DCC0', lw: 2.5 }, 0.4);
    ell(x, y, 3, 7, { fill: '#7A6A58', stroke: null });
  }

  /** The supervising teacher seen from behind. turn: 1 = back, else front. */
  function teacherBack(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ell(0, 0, 110, 18, { fill: 'rgba(40,20,60,0.22)', stroke: null });
    for (const side of [-1, 1]) {
      stroke([[side * 30, -170], [side * 34, -10]], '#4E4A5E', 34, { olw: 9 });
      ell(side * 34, 0, 32, 15, { fill: '#3A3242', lw: 5 });
    }
    smooth([[-70, -330], [70, -330], [84, -250], [78, -160], [-78, -160], [-84, -250]], { fill: '#7C8B5A', lw: 5 });
    for (const side of [-1, 1]) {
      stroke([[side * 66, -316], [side * 96, -240], [side * 86, -176]], '#7C8B5A', 30, { olw: 9 });
      circle(side * 86, -170, 17, { fill: PAL.skin, lw: 4.5 });
    }
    ell(-74, -410, 12, 18, { fill: PAL.skin, lw: 4 }); ell(74, -410, 12, 18, { fill: PAL.skin, lw: 4 });
    ell(0, -420, 76, 82, { fill: '#5A5566', lw: 5 });
    circle(0, -500, 32, { fill: '#5A5566', lw: 5 });
    stroke([[-24, -500], [24, -500]], PAL.gold, 6, { ink: null });
    ctx.restore();
  }

  /** A pencil held in a hand. */
  function pencil(x, y, rot, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-8, -70, 16, 80, 4, { fill: PAL.gold, lw: 4 });
    poly([[-8, 10], [8, 10], [0, 30]], { fill: '#F4D9B0', lw: 4 });
    rrect(-8, -80, 16, 14, 4, { fill: PAL.pink, lw: 4 });
    ctx.restore();
  }

  /** Cup tteokbokki with a skewer and steam. */
  function cupTteok(x, y, s, t, seed = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 3; i++) {
      const f = frac(t * 0.8 + i / 3 + seed * 0.21);
      stroke([[-20 + i * 20, -60 - f * 90], [-12 + i * 20 + Math.sin(t * 4 + i) * 10, -90 - f * 90], [-20 + i * 20, -120 - f * 90]],
        '#FFFFFF', 7, { ink: null, smooth: true, alpha: Math.sin(f * Math.PI) * 0.7 });
    }
    // skewer
    stroke([[16, -40], [44, -112]], '#E9C99A', 6, { olw: 7 });
    // rice cakes poking out
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(-30 + i * 20, -44 - (i % 2) * 10); ctx.rotate(-0.5 + i * 0.35);
      rrect(-9, -20, 18, 40, 9, { fill: '#F0603C', lw: 4 });
      ctx.restore();
    }
    ell(0, -36, 50, 13, { fill: '#D9402A', lw: 4 });
    poly([[-52, -36], [52, -36], [38, 40], [-38, 40]], { fill: '#FFFFFF', lw: 5 });
    poly([[-48, -14], [48, -14], [44, 6], [-44, 6]], { fill: PAL.red, stroke: null });
    ctx.restore();
  }

  /** A little rain cloud with falling drops, centred at (x, y). */
  function rainCloud(t, x, y, s) {
    for (let i = 0; i < 12; i++) {
      const dx = hrange(-80, 80, i, 3) * s, f = frac(t * 2.4 + hash(i, 4));
      const dy = f * 180 * s;
      stroke([[x + dx, y + 20 * s + dy], [x + dx - 4 * s, y + 40 * s + dy]], '#8FD3FF', 4 * s, { ink: null, alpha: 1 - f });
    }
    cloud(x, y, 0.38 * s, '#8A90B8', { stroke: PAL.ink, shade: false });
  }

  /** Long streetlight shadow of a figure at (x, y), pointing away from a lamp at lx. */
  function longShadow(x, y, lx, s) {
    const d = x - lx, dir = Math.sign(d) || 1, len = clamp(Math.abs(d) / 400, 0.3, 1.6) * 380 * s;
    ctx.save(); ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#0D0B24';
    ctx.beginPath();
    ctx.moveTo(x - 30 * s, y); ctx.lineTo(x + dir * len, y + 26 * s); ctx.lineTo(x + dir * (len + 40 * s), y + 10 * s);
    ctx.lineTo(x + 30 * s, y - 4 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + dir * (len + 40 * s), y + 16 * s, 46 * s, 20 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---- 50.91 night school → into the study hall -------------------------------------------------

  const T_INSIDE = bt(29);   // 52.73: we are through the window

  function school(t, lt, dur) {
    if (t >= T_INSIDE) return studyHall(t, t - T_INSIDE);
    const k = seg(t, T_IN, T_INSIDE);
    // the window we fly into: floor 1, column 8 of the school at (960, 900) s=0.95
    const s = 0.95, wx = 960 + (-710 + 8 * 104 + 40) * s, wy = 900 + (-440 + 108 + 35) * s;
    const zoom = 1.04 + 0.12 * k + 7 * Math.pow(seg(t, T_INSIDE - 0.62, T_INSIDE), 3);
    const pk = ease(seg(t, T_INSIDE - 1.0, T_INSIDE));
    const cx = lerp(960 + Math.sin(t * 0.7) * 20, wx, pk), cy = lerp(560, wy, pk);
    nightSky(t);
    camBegin(cx, cy, zoom);
    moon(1560, 150, 64);
    // back hills and trees
    smooth([[-400, 900], [-100, 740], [400, 800], [900, 720], [1500, 790], [2300, 720], [2400, 1100], [-400, 1100]], { fill: '#1A2150', stroke: null });
    schoolBuilding(960, 900, s, { lit: 0, clock: [10, 0] });
    // night tint over the building, then the one lit floor
    rrect(-400, 300, W + 800, 800, 0, { fill: 'rgba(20,24,70,0.55)', stroke: null });
    wallClock(960, 900 - 515 * s, 46 * s, 10, 0);
    for (let c = 0; c < 14; c++) {
      if (c === 6 || c === 7) continue;
      const x0 = 960 + (-710 + c * 104) * s, y0 = 900 + (-440 + 108) * s;
      const on = c === 3 ? tube(t, 9, 51.8, 52.2) : 1;
      rrect(x0, y0, 80 * s, 70 * s, 5, { fill: on > 0.5 ? '#FFF6C4' : '#8D93B8', lw: 5 });
      if (on > 0.5) glow(x0 + 40 * s, y0 + 35 * s, 110, '#FFE9A0', 0.45);
      // tiny heads bent over desks
      ctx.save(); rrectPath(x0, y0, 80 * s, 70 * s, 5); ctx.clip();
      for (let j = 0; j < 2; j++) {
        if (hash(c, j + 5) < 0.3) continue;
        const hx = x0 + (20 + j * 40) * s, hy = y0 + (52 + Math.sin(t * 4 + c * 1.7 + j * 2) * 3 + hash(c, j) * 6) * s;
        rrect(hx - 16 * s, hy + 6 * s, 32 * s, 30 * s, 10 * s, { fill: '#3A4270', stroke: null });
        circle(hx, hy, 11 * s, { fill: '#2F2A3A', stroke: null });
      }
      ctx.restore();
      stroke([[x0 + 40 * s, y0], [x0 + 40 * s, y0 + 70 * s]], PAL.ink, 3, { ink: null });
    }
    // ground, fence, trees, a streetlight
    rrect(-600, 895, W + 1200, 400, 0, { fill: '#232A5A', lw: 6 });
    for (let i = -2; i < 22; i++) stroke([[i * 100, 960], [i * 100, 1030]], '#3A427A', 8, { ink: null });
    stroke([[-400, 975], [2400, 975]], '#3A427A', 8, { ink: null });
    tree(110, 960, 1.2, 'night', t); tree(1830, 960, 1.3, 'night', t);
    streetlight(260, 1000, 1.05, 1);
    camEnd();
    // a white-blue flash as we pass through the glass
    flash(Math.pow(seg(t, T_INSIDE - 0.22, T_INSIDE), 2) * 0.95, '#EAF4FF');
    flash(1 - seg(t, T_IN, T_IN + 0.3), PAL.nightDk);
  }

  // inside: rows of desks, three friends, fluorescent hum, the clock at 10:00
  function studyHall(t, lt) {
    const zoom = lerp(1.18, 1.05, easeOut(clamp(lt / 1.8)));
    camBegin(960 + Math.sin(t * 0.8) * 16, 520 - lt * 8, zoom);
    studyWall(t, { clock: [10, 0] });
    const dark = ceilingTubes(t, 53.25, 53.6);
    moth(t, 780, 60, 60, 1);
    // the three at their desks, facing us
    const kids = [
      ['pony', 520, 3], ['me', 960, 0], ['glasses', 1400, 5],
    ];
    for (const [who, x, seed] of kids) {
      const p = pulse(t, 5), hdy = who === 'me' ? 0 : hop(t + seed * 0.1) * 4;
      const opt = { who, t, sit: true, sq: p * 0.03, headDy: hdy };
      if (who === 'me') {
        const m = mood(t, [[52.7, 'sleepy', 'flat'], [53.3, 'closed', 'yawn'], [53.95, 'sleepy', 'wavy', 'zzz']]);
        Object.assign(opt, m, { headRot: Math.sin(t * 2.2) * 0.06, aL: 0.9, eL: 1.6, aR: 0.9, eR: 1.6 });
        if (t > 53.3 && t < 53.95) Object.assign(opt, { aR: 2.8, eR: 0.3, sq: -0.04 });
      } else if (who === 'pony') {
        Object.assign(opt, { eyes: 'open', lookY: 0.8, mouth: 'cat', aR: 1.0, eR: 1.4, aL: 0.8, eL: 1.6,
          holdR: (hx, hy) => pencil(hx, hy, t * 9, 0.9) });
      } else {
        Object.assign(opt, { eyes: 'determined', lookY: 1, mouth: 'flat', aL: 0.9, eL: 1.7, aR: 0.9 + Math.sin(t * 14) * 0.08, eR: 1.6,
          holdR: (hx, hy) => pencil(hx, hy, 0.4 + Math.sin(t * 14) * 0.2, 0.9), emote: t > 53.6 ? 'sparkle' : null, emoteK: seg(t, 53.6, 53.8) });
      }
      kid(x, 770, 1.0, opt);
      desk(x, 900, 1.25, {});
      bookStack(x + (who === 'glasses' ? 110 : -110), 900 - 176 * 1.25, 0.9, who === 'glasses' ? 9 : who === 'pony' ? 4 : 6, seed + 10);
    }
    camEnd();
    fillScreen('#0B1030', dark * 0.12);
    flash(1 - seg(lt, 0, 0.3), '#EAF4FF');
  }

  // ---- 54.55 the note, passed behind the teacher's back -----------------------------------------

  const TURN_AWAY = 55.23, PASS_A = bt(30, 2), PASS_B = bt(30, 3), OPEN = bt(31, 0) + BT * 0.2, TURN_BACK = bt(31, 2) + BT * 0.6;

  function note(t, lt, dur) {
    const camK = ease(clamp(lt / dur));
    // opening the note pushes in on "me"
    const openK = ease(seg(t, OPEN, OPEN + 0.35)) * (1 - ease(seg(t, TURN_BACK - 0.1, TURN_BACK + 0.15)));
    const [sx, sy] = shakeXY(t, TURN_BACK, 14, 0.4);
    camBegin(960 + sx + openK * 160, 480 + sy + camK * 10 - openK * 30, 1.16 + camK * 0.05 + openK * 0.18);
    studyWall(t, { clock: [10, 25] });
    ceilingTubes(t, -1, -1);
    // the teacher at the back of the room: faces the class, turns to the window, turns back
    const tx = 800, ty = 720, ts = 0.74;
    const flipK = t < TURN_AWAY ? 1 : t < TURN_AWAY + 0.16 ? Math.abs(Math.cos(seg(t, TURN_AWAY, TURN_AWAY + 0.16) * Math.PI))
      : t < TURN_BACK ? 1 : t < TURN_BACK + 0.14 ? Math.abs(Math.cos(seg(t, TURN_BACK, TURN_BACK + 0.14) * Math.PI)) : 1;
    const back = (t >= TURN_AWAY + 0.08 && t < TURN_BACK + 0.07);
    ctx.save(); ctx.translate(tx, ty); ctx.scale(Math.max(0.05, flipK), 1); ctx.translate(-tx, -ty);
    if (back) teacherBack(tx, ty, ts);
    else {
      const glare = t >= TURN_BACK;
      adult(tx, ty, ts, { kind: 'teacher', t, eyes: glare ? 'wide' : 'dot', lookX: Math.sin(t * 3), mouth: glare ? 'o' : 'flat',
        aL: 0.3, aR: 0.3, emote: glare ? '!?' : null, emoteK: seg(t, TURN_BACK + 0.1, TURN_BACK + 0.3) });
    }
    ctx.restore();
    // the kids: glasses (left) passes to me (right)
    const reachG = kf(t, [[PASS_A - 0.35, 0], [PASS_A, 1], [PASS_A + 0.3, 1], [PASS_A + 0.6, 0]], easeInOut);
    const reachM = kf(t, [[PASS_B - 0.3, 0], [PASS_B, 1], [OPEN, 0.3]], easeInOut);
    const guilty = t >= TURN_BACK;
    const snap = guilty ? Math.exp(-(t - TURN_BACK) * 8) : 0;
    // glasses
    const gm = guilty ? { eyes: 'wide', mouth: 'wavy', emote: 'sweat', emoteK: seg(t, TURN_BACK, TURN_BACK + 0.2) }
      : t > TURN_AWAY ? { eyes: 'open', lookX: 1, mouth: 'cat' } : { eyes: 'open', lookY: 1, mouth: 'flat' };
    kid(470, 880, 1.1, { who: 'glasses', t, sit: true, ...gm, turn: t > TURN_AWAY && !guilty ? 0.35 : 0,
      aL: 0.9, eL: 1.6, aR: lerp(0.9, 1.75, reachG), eR: lerp(1.6, 0.1, reachG), sq: snap * 0.12, dy: snap * 30,
      headRot: guilty ? 0 : lerp(0, 0.15, reachG) });
    desk(470, 990, 1.3, {});
    bookStack(330, 990 - 176 * 1.3, 0.95, 5, 31);
    // me
    const mm = guilty ? { eyes: 'wide', mouth: 'wavy', emote: 'sweat', emoteK: seg(t, TURN_BACK, TURN_BACK + 0.2) }
      : t >= OPEN + 0.2 ? { eyes: 'star', mouth: 'grin', blush: true }
        : t >= PASS_B - 0.3 ? { eyes: 'wide', mouth: 'o', lookX: -1 } : { eyes: 'sleepy', mouth: 'flat', lookY: 1 };
    kid(1450, 880, 1.1, { who: 'me', t, sit: true, ...mm, turn: t > PASS_B - 0.4 && !guilty ? -0.3 : 0,
      aR: 0.9, eR: 1.6, aL: guilty ? 0.9 : lerp(0.9, 1.75, reachM), eL: guilty ? 1.6 : lerp(1.6, 0.1, reachM),
      sq: snap * 0.12, dy: snap * 30 + (t >= OPEN + 0.2 && !guilty ? hop(t) * 10 : 0) });
    desk(1450, 990, 1.3, {});
    bookStack(1590, 990 - 176 * 1.3, 0.95, 7, 32);
    // the note itself travels hand to hand across the aisle
    if (t < OPEN) {
      const k1 = ease(seg(t, PASS_A - 0.05, PASS_B - 0.05));
      const nx = lerp(690, 1230, k1), ny = 670 - Math.sin(k1 * Math.PI) * 140;
      const show = t > PASS_A - 0.35;
      if (show) foldedNote(nx, ny, 0.9, Math.sin(t * 8) * 0.2 + k1 * TAU, 0);
      if (k1 > 0.05 && k1 < 0.95) for (let i = 1; i < 5; i++) {
        const kk = clamp(k1 - i * 0.04);
        circle(lerp(690, 1230, kk), 670 - Math.sin(kk * Math.PI) * 140, 6 - i, { fill: '#FFFFFF', stroke: null, alpha: 0.6 });
      }
    }
    camEnd();
    // the note opens big over the frame
    const openBig = ease(seg(t, OPEN, OPEN + 0.3));
    if (t >= OPEN && t < TURN_BACK + 0.1) {
      const hide = ease(seg(t, TURN_BACK - 0.12, TURN_BACK + 0.1));
      const nx = lerp(1250, 800, openBig), ny = lerp(700, 470, openBig) + hide * 700;
      foldedNote(nx, ny, lerp(0.9, 2.3, openBig), lerp(0.4, -0.05, openBig) + hide * 0.8, openBig, () => {
        // a doodle of tteokbokki on a plate, and the question
        ell(-70, 40, 66, 28, { fill: '#FFFFFF', lw: 4 });
        ell(-70, 34, 52, 16, { fill: '#E2553A', stroke: null });
        for (let i = 0; i < 5; i++) {
          ctx.save(); ctx.translate(-104 + i * 17, 26 - (i % 2) * 8); ctx.rotate(-0.7 + i * 0.35);
          rrect(-7, -16, 14, 32, 7, { fill: '#F0603C', lw: 3 }); ctx.restore();
        }
        stroke([[-62, 22], [-40, -30]], '#E9C99A', 5, { olw: 5 });
        stroke([[-96, -10], [-90, -30], [-96, -50]], '#FF9A3D', 3, { ink: null, smooth: true });
        stroke([[-70, -16], [-64, -36], [-70, -56]], '#FF9A3D', 3, { ink: null, smooth: true });
        letter('떡볶이', -70, -78, 26, PAL.red, { font: 'round', lw: 0, shadow: null, rot: -0.06 });
        letter('ㄱㄱ?', 72, 16, 56, '#2A2438', { font: 'round', lw: 0, shadow: null, rot: -0.08 });
        poly(heartPts(98, -52, 14), { fill: PAL.red, lw: 2.5 });
      });
      if (openBig > 0.9 && t < TURN_BACK - 0.1) {
        sparkle(460, 290, 30 + pulse(t) * 14, PAL.gold, t);
        sparkle(1170, 300, 22 + pulse(t) * 10, '#FFFFFF', -t);
      }
    }
  }

  // ---- 58.18 the report card and the treadmill ---------------------------------------------------

  function reportCard(t, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-300, -380, 600, 700, 14, { fill: '#FFFDF4', lw: 7, shadow: 'rgba(0,0,0,0.3)', shadowBlur: 20 });
    rrect(-300, -380, 600, 110, 14, { fill: '#E9EEF8', lw: 7 });
    letter('성적표', 0, -325, 70, PAL.ink, { lw: 0, shadow: null });
    letter('모의고사', 200, -250, 26, '#8A8FA8', { font: 'round', lw: 0, shadow: null });
    // axes
    stroke([[-230, -200], [-230, 180], [250, 180]], PAL.ink, 5, { ink: null });
    for (let i = 1; i < 5; i++) stroke([[-226, 180 - i * 80], [250, 180 - i * 80]], '#E0E3EE', 3, { ink: null });
    const subj = ['국어', '수학', '영어', '탐구'];
    const cols = [PAL.red, PAL.blue, PAL.mint, PAL.orange];
    for (let i = 0; i < 4; i++) {
      // each bar tries to jump on its beat, then slumps back where it was
      const beatT = T_CARD + i * BT, age = t - beatT;
      let bump = 0;
      if (age > -0.12 && age < 0) bump = -12 * (age + 0.12) / 0.12;   // anticipation dip
      else if (age >= 0) bump = Math.exp(-age * 4.5) * Math.sin(Math.min(age * 16, Math.PI / 2 + age * 22)) * 150;
      const again = t - (bt(32, 4) + i * BT * 0.5), bump2 = again >= 0 ? Math.exp(-again * 5) * Math.sin(age * 20) * 50 : 0;
      const h = 150 + hash(i, 8) * 16 + Math.max(-12, bump + bump2);
      const bx = -190 + i * 110;
      rrect(bx, 180 - h, 70, h, 6, { fill: cols[i], lw: 5 });
      letter(subj[i], bx + 35, 215, 30, PAL.ink, { font: 'round', lw: 0, shadow: null });
    }
    // the dashed "last time" line the bars never get past
    ctx.setLineDash([16, 12]);
    stroke([[-226, 180 - 162], [250, 180 - 162]], '#8A8FA8', 4, { ink: null });
    ctx.setLineDash([]);
    letter('지난번', 205, 180 - 185, 22, '#8A8FA8', { font: 'round', lw: 0, shadow: null });
    ctx.restore();
  }

  function treadmill(t, x, y, s, speed) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // uprights and console on the right (the runner faces right)
    stroke([[300, 0], [330, -330]], '#8B93A6', 22, { olw: 9 });
    stroke([[330, -330], [150, -330]], '#8B93A6', 16, { olw: 9 });
    rrect(260, -400, 170, 100, 16, { fill: '#5B6378', lw: 6 });
    rrect(278, -386, 134, 58, 8, { fill: '#1E1A2E', lw: 4 });
    ctx.font = `40px ${FONT.bold}`; ctx.fillStyle = '#7CF29A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('0.0km', 345, -356);
    // deck and belt
    rrect(-380, -50, 720, 70, 30, { fill: '#5B6378', lw: 6 });
    ctx.save(); rrectPath(-360, -44, 680, 34, 16); ctx.clip();
    ctx.fillStyle = '#2E2A3E'; ctx.fillRect(-360, -44, 680, 34);
    const off = (t * speed * 240) % 80;
    for (let i = -1; i < 11; i++) { ctx.fillStyle = '#48445C'; ctx.fillRect(-360 + i * 80 - off + 80, -44, 24, 34); }
    ctx.restore();
    circle(-340, -15, 22, { fill: '#8B93A6', lw: 5 }); circle(300, -15, 22, { fill: '#8B93A6', lw: 5 });
    ctx.restore();
  }

  function card(t, lt, dur) {
    const FLING = bt(33, 2), LAND = bt(33, 3);   // 60.91 thrown off the belt, 61.36 lands where he started
    // start on the report card, pull back to find "me" running on a treadmill in front of it
    const pull = easeInOut(seg(t, 59.0, 59.9));
    const zoom = lerp(1.32, 1.0, pull) + 0.02 * Math.sin(t * 1.3);
    const [sx, sy] = shakeXY(t, LAND, 18, 0.4);
    camBegin(lerp(600, 960, pull) + sx, lerp(430, 540, pull) + sy, zoom);
    rrect(-600, -600, W + 1200, H + 1200, 0, { fill: '#26306A', stroke: null });
    glow(960, 300, 900, '#6E86D8', 0.5);          // a pool of fluorescent light
    rrect(-600, 860, W + 1200, 600, 0, { fill: '#1C2250', lw: 6 });
    miniStars(t, 0, 0, W, 300, 20, 77);
    reportCard(t, 560, 460, 1.0 + pulse(t, 6) * 0.01);
    // treadmill + runner
    const speed = t < FLING - 0.3 ? 2.2 : 7;
    treadmill(t, 1300, 900, 1.1, speed);
    if (t < FLING) {
      const runPh = t * (t < FLING - 0.3 ? 3.2 : 5.5);
      const tired = seg(t, 60.2, FLING);
      kid(1270 + Math.sin(runPh * TAU) * 8 - tired * 60, 856, 1.05, { who: 'me', t, walk: runPh, run: true, turn: 0.55,
        eyes: tired > 0.4 ? 'x' : 'determined', mouth: tired > 0.4 ? 'open' : 'grin', emote: 'sweat', emoteK: 1, rot: 0.08 + tired * 0.15 });
      rainCloud(t, 1290 + Math.sin(t * 2) * 10, 360 - hop(t) * 6, 1.2);
      if (tired > 0) streaks(t, tired, '#FFFFFF', 7, -1);
    } else if (t < LAND) {
      // the belt wins: he is thrown off the back, spinning, back to where he began
      const k = seg(t, FLING, LAND);
      const x = lerp(1180, 820, k), y = 856 - Math.sin(k * Math.PI) * 300 + k * 44;
      kid(x, y, 1.0, { who: 'me', t, rot: -k * TAU * 1.1, shadow: false, aL: 2.6 + Math.sin(t * 40) * 0.4, aR: 2.4 - Math.sin(t * 40) * 0.4,
        lL: 0.6, lR: 0.2, kL: 0.8, eyes: 'wide', mouth: 'open' });
      rainCloud(t, lerp(1290, 850, ease(k)), 360, 1.2);
      streaks(t, 1, '#FFFFFF', 7, -1);
      sfx('으아악', 1080, 330, 80, PAL.gold, t - FLING, { life: 0.8, rot: -0.1 });
    } else {
      // on his bottom, dazed, the cloud catches up and keeps raining
      const age = t - LAND, land = Math.exp(-age * 9);
      kid(820, 900, 1.0, { who: 'me', t, sit: true, sq: land * 0.25, eyes: 'spiral', mouth: 'wavy', aL: 1.2, aR: 1.2, eL: 0.3, eR: 0.3,
        headRot: Math.sin(t * 6) * 0.08 });
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * TAU / 3;
        poly(starShape(820 + Math.cos(a) * 110, 900 - 400 + Math.sin(a) * 26, 18, 0.45), { fill: PAL.gold, lw: 3 });
      }
      rainCloud(t, 830 + Math.sin(t * 3) * 8, 400, 1.2);
      sfx('쿵!', 1040, 640, 120, PAL.red, age, { life: 0.6, rot: 0.12 });
    }
    camEnd();
  }

  // ---- 61.82 home under the streetlights ---------------------------------------------------------

  function home(t, lt, dur) {
    const scroll = lt * 170;
    nightSky(t, 23);
    camBegin(960, 540 + Math.sin(t * 0.9) * 6, 1.02 + lt * 0.012);
    // the far town, smaller and dimmer so the sky and the moon get room
    ctx.save(); ctx.translate(0, 770); ctx.scale(0.72, 0.72);
    townRow(t, 0, 200 + scroll * 0.4, { tone: '#303878', lit: 0.3, seed: 9 });
    ctx.restore();
    rrect(-400, 0, W + 800, 780, 0, { fill: 'rgba(16,20,58,0.38)', stroke: null });
    moon(1460, 180, 120 + lt * 3);
    // pavement and a low wall
    rrect(-400, 740, W + 800, 44, 0, { fill: '#4A4A7E', lw: 6 });
    rrect(-400, 784, W + 800, 500, 0, { fill: '#2D2B5A', lw: 6 });
    for (let i = -2; i < 14; i++) {
      const x = ((i * 220 - scroll) % 2640 + 2640) % 2640 - 400;
      stroke([[x, 794], [x - 120, 1080]], '#383670', 5, { ink: null });
    }
    // streetlights every 900 px, scrolling past, each with a warm pool on the ground
    const lamps = [];
    for (let i = 0; i < 3; i++) {
      const lx = ((i * 900 - scroll + 200) % 2700 + 2700) % 2700 - 450;
      lamps.push(lx);
      ctx.save(); ctx.globalAlpha = 0.5;
      ell(lx + 110, 880, 330, 70, { fill: rgrad(lx + 110, 880, 0, 330, [[0, 'rgba(255,214,120,0.55)'], [1, 'rgba(255,214,120,0)']]), stroke: null });
      ctx.restore();
      streetlight(lx, 800, 1.55, 1);
    }
    const nearest = x => lamps.reduce((p, q) => (Math.abs(q + 100 - x) < Math.abs(p + 100 - x) ? q : p)) + 100;
    const group = [['pony', 560, 1], ['me', 960, 0], ['glasses', 1360, 2]];
    const gy = 925;
    for (const [, x] of group) longShadow(x, gy, nearest(x), 1.15);
    for (const [who, x, seed] of group) {
      const laugh = mood(t + seed * 0.15, [[61.8, 'happy', 'grin'], [63.0, 'open', 'smile'], [63.64, 'happy', 'open'], [64.77, 'happy', 'grin', 'music']]);
      const walkPh = (t - T_HOME) * 1.1 + seed * 0.37;
      const cheer = who === 'pony' && t > 64.55 ? { aL: 2.8, eL: 0.2 } : {};
      kid(x, gy + Math.sin(t * 3 + seed) * 2, 1.12, { who, t, walk: walkPh, turn: who === 'pony' ? 0.4 : who === 'me' ? 0.15 : -0.35,
        ...laugh, blush: 0.7, dy: hop(t) * 8, sq: pulse(t, 5) * 0.03,
        aR: 0.95, eR: 1.5, holdR: (hx, hy) => cupTteok(hx - 5, hy - 12, 0.62, t, seed), ...cheer });
    }
    camEnd();
    // dust drifting in the lamplight
    for (let i = 0; i < 18; i++) {
      const x = ((hash(i, 5) * W - scroll * 0.6) % W + W) % W, y = 300 + hash(i, 6) * 500 + Math.sin(t + i) * 20;
      circle(x, y, 3, { fill: '#FFE9A8', stroke: null, alpha: 0.4 + 0.3 * Math.sin(t * 3 + i) });
    }
  }

  chapter('night', T_IN, T_OUT, [[T_IN, school], [T_NOTE, note], [T_CARD, card], [T_HOME, home]]);
})();
