// c6_free: release. The gates burst open into a golden sunrise, the doodled dream comes true on a
// stage, a jump against the sun, the road to twenty, a polaroid of the three of them, caps in the
// sky, and the title card on paper.
(() => {
  const B = SONG.beat;

  // ---- private helpers ------------------------------------------------------------------------

  function desat(k = 1) {
    if (k <= 0) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp(k);
    ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.restore();
  }

  // Paint something as one flat colour (for silhouettes against the sun): draw it on a scratch
  // canvas with the same transform, flood it with the colour, then lay it on the frame.
  let scratch = null;
  function silhouette(color, draw) {
    if (!scratch || scratch.width !== cv.width || scratch.height !== cv.height) {
      scratch = document.createElement('canvas'); scratch.width = cv.width; scratch.height = cv.height;
    }
    const g = scratch.getContext('2d'), main = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, scratch.width, scratch.height);
    g.setTransform(main.getTransform());
    ctx = g;
    try { draw(); } finally { ctx = main; }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, scratch.width, scratch.height);
    g.globalCompositeOperation = 'source-over';
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.drawImage(scratch, 0, 0); main.restore();
  }

  function bird(x, y, s, flap, color = '#FFFFFF') {
    const w = Math.sin(flap);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    stroke([[-44, -28 * w - 6], [-20, -6], [0, 2], [20, -6], [44, -28 * w - 6]], color, 9, { smooth: true, olw: 7 });
    ell(0, 4, 13, 9, { fill: color, lw: 4 });
    ctx.restore();
  }

  function examSheet(x, y, s, rot, flipK) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * flipK, s);
    rrect(-40, -52, 80, 104, 4, { fill: '#FFFFFF', lw: 4 });
    for (let i = 0; i < 5; i++) rrect(-28, -36 + i * 16, i % 2 ? 40 : 56, 5, 2, { fill: '#C9CED8', stroke: null });
    ctx.restore();
  }

  /** A red guitar, painted in a kid's own space (call from holdL). */
  function guitar() {
    ctx.save(); ctx.translate(18, -122); ctx.rotate(0.42);
    rrect(-262, -11, 200, 22, 5, { fill: '#8A5530', lw: 4 });
    for (let i = 0; i < 6; i++) stroke([[-240 + i * 30, -10], [-240 + i * 30, 10]], '#D9C7A0', 3, { ink: null });
    rrect(-300, -18, 48, 36, 9, { fill: '#6B4432', lw: 4 });
    for (let i = 0; i < 3; i++) { circle(-290 + i * 14, -22, 4, { fill: '#DDDDDD', lw: 2 }); circle(-290 + i * 14, 22, 4, { fill: '#DDDDDD', lw: 2 }); }
    ell(50, 0, 76, 70, { fill: PAL.red, lw: 5 });
    ell(-18, 0, 58, 52, { fill: PAL.red, lw: 5 });
    ell(50, 0, 70, 64, { fill: PAL.red, stroke: null });
    ell(-12, 0, 52, 46, { fill: PAL.red, stroke: null });
    ell(-10, -14, 28, 12, { fill: rgba('#FFFFFF', 0.35), stroke: null });
    circle(4, 0, 22, { fill: '#3A2230', lw: 4 });
    rrect(66, -24, 14, 48, 4, { fill: '#3A2230', stroke: null });
    for (let i = -1; i <= 1; i++) stroke([[-290, i * 5], [72, i * 5]], '#F4F1EA', 1.6, { ink: null });
    ctx.restore();
  }

  function reportCard(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-170, -220, 340, 440, 8, { fill: '#FFFFFF', lw: 5, shadow: 'rgba(0,0,0,0.25)', shadowBlur: 20 });
    letter('성적표', 0, -168, 52, PAL.ink, { lw: 0, shadow: null });
    stroke([[-130, -125], [130, -125]], PAL.ink, 3, { ink: null });
    const hs = [120, 150, 110, 190, 230], cols = [PAL.blue, PAL.mint, PAL.orange, PAL.pink, PAL.gold];
    hs.forEach((h, i) => rrect(-125 + i * 52, 170 - h, 38, h, 4, { fill: cols[i], lw: 3 }));
    stroke([[-140, 172], [140, 172]], PAL.ink, 4, { ink: null });
    stroke([[40, -80], [120, -100]], PAL.red, 5, { ink: null });
    ctx.restore();
  }

  function stamp(x, y, s, rot, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= alpha;
    const red = '#E0384A';
    circle(0, 0, 170, { fill: rgba('#FFFFFF', 0.25), stroke: red, lw: 16 });
    circle(0, 0, 138, { fill: null, stroke: red, lw: 5 });
    ctx.font = `128px ${FONT.bold}`; ctx.fillStyle = red; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('졸업', 0, 8);
    for (let i = 0; i < 5; i++) circle(-140 + i * 70, 118 + (i % 2) * 8, 5, { fill: red, stroke: null });
    ctx.restore();
  }

  /** The friends' positions for a cheering trio. */
  const TRIO = ['pony', 'me', 'glasses'];

  // ---- 105.45 · the gates burst open ----------------------------------------------------------

  const T_HIT = 105.4545, T_PU = 107.2727;

  function sunriseSky(t, sunX, sunY, rot, k = 1) {
    skyFill([[0, '#FF8A5C'], [0.35, '#FFB25C'], [0.62, '#FFE08A'], [1, '#FFF3CC']]);
    sunburst(sunX, sunY, rgba('#FFFFFF', 0.24 * k), rgba('#FFFFFF', 0), rot, 24, 2400);
    sun(sunX, sunY, 180, '#FFE36A');
  }

  function gates(t, lt, dur) {
    const [sx, sy] = shakeXY(t, T_HIT, 38, 0.6);
    const [px, py] = shakeXY(t, T_PU, 22, 0.4);
    const push = 1.02 + lt * 0.025 + 0.03 * Math.exp(-Math.max(0, t - T_PU) * 6) * (t > T_PU ? 1 : 0);
    const sunY = lerp(470, 300, easeOut(seg(t, T_HIT, 108.5)));
    sunriseSky(t, 960, sunY, t * 0.12, 1 + (t > T_PU ? Math.exp(-(t - T_PU) * 3) : 0));
    camBegin(960 + sx + px, 540 + sy + py - lt * 8, push, 0);
    cloudLayer(t, 150, 0.7, 30, 5, '#FFF6E6', 4);
    schoolBuilding(960, 700, 0.62, { tone: '#F6DDB8', clock: [4, 0], banner: '수능 끝!' });
    // the schoolyard
    rrect(-300, 690, W + 600, 700, 0, { fill: '#F4C98C', lw: 6 });
    ctx.fillStyle = rgrad(960, 700, 50, 900, [[0, 'rgba(255,240,180,0.7)'], [1, 'rgba(255,240,180,0)']]);
    ctx.fillRect(-300, 690, W + 600, 700);
    // the gate slams open
    const open = easeOut(seg(t, T_HIT, T_HIT + 0.22));
    schoolGate(960, 880, 1.05, 1 - open * 1.05 + 0.05 * Math.exp(-(t - T_HIT - 0.22) * 8) * (open >= 1 ? Math.cos((t - T_HIT) * 30) : 0));
    // everybody pours out, spreading to the sides as they come at the camera
    const crowd = [];
    for (let i = 0; i < 18; i++) {
      const t0 = T_HIT + 0.08 + hash(i, 1) * 1.9, age = t - t0;
      if (age < 0) continue;
      const p = age / 1.5, side = hash(i, 2) < 0.5 ? -1 : 1;
      const x = 960 + side * (60 + hash(i, 3) * 200) + side * p * (500 + hash(i, 4) * 500);
      const y = 870 + p * 330, s = 0.38 + p * 0.55;
      if (y > 1500) continue;
      crowd.push({ i, x, y, s, age });
    }
    crowd.sort((a, b) => a.y - b.y);
    const drawStudent = c => kid(c.x, c.y, c.s, {
      who: ['pony', 'glasses', 'me'][c.i % 3], t, walk: c.age * 2.4 + hash(c.i, 5), run: true,
      aL: 2.6, aR: 2.4 + Math.sin(t * 9 + c.i) * 0.3, eL: 0.15, eR: 0.15, eyes: 'happy', mouth: 'grin', turn: (c.x - 960) / 900,
      col: ['#2E3A66', '#3C4A7A', '#34406E'][c.i % 3], bag: hash(c.i, 6) > 0.5,
    });
    const HERO_Y = 985;
    crowd.filter(c => c.y < HERO_Y).forEach(drawStudent);
    // the three of them, in front
    TRIO.forEach((who, j) => {
      const come = easeOut(seg(t, T_HIT, T_HIT + 1.05));
      const tx = [590, 960, 1330][j];
      const x = lerp(960 + (j - 1) * 70, tx, come), y = lerp(880, HERO_Y + (j === 1 ? 0 : 10), come);
      const s = lerp(0.45, j === 1 ? 1.0 : 0.94, come);
      let pose;
      if (t < T_HIT + 1.05) pose = { walk: (t - T_HIT) * 2.6 + j * 0.3, run: true, aL: 2.5, aR: 2.5, eL: 0.15, eR: 0.15, eyes: 'happy', mouth: 'grin' };
      else if (t < T_PU - 0.2) pose = { ...dance('cheer', t, j), eyes: 'happy', mouth: 'grin' };
      else if (t < T_PU) pose = { sq: 0.16 * seg(t, T_PU - 0.2, T_PU), aL: 0.6, aR: 0.6, eyes: 'closed', mouth: 'grin', kL: 0.4, kR: 0.4 };
      else {
        const k = seg(t, T_PU, T_PU + 0.7);
        pose = k < 1
          ? { dy: Math.sin(k * Math.PI) * 230, sq: -0.08 * Math.sin(k * Math.PI), aL: 2.8, aR: 2.8, eL: 0, eR: 0, lL: 0.5, lR: 0.5, kL: 0.6, kR: 0.6, eyes: 'star', mouth: 'open' }
          : { ...dance('jump', t, j), eyes: 'happy', mouth: 'grin' };
      }
      kid(x, y, s, { who, t, blush: 0.7, ...pose });
    });
    crowd.filter(c => c.y >= HERO_Y).forEach(drawStudent);
    // test papers thrown into the air turn into birds
    for (let i = 0; i < 16; i++) {
      const l = T_HIT + 0.5 + hash(i, 11) * 1.0, age = t - l;
      if (age < 0) continue;
      const x0 = 300 + hash(i, 12) * 1320, y0 = 760 + hash(i, 13) * 120;
      const turn = T_PU + i * 0.012;
      if (t < turn) {
        const vx = (hash(i, 14) - 0.5) * 500, vy = 1250 + hash(i, 15) * 450;
        const x = x0 + vx * age + Math.sin(age * 5 + i) * 30, y = y0 - vy * age + 600 * age * age;
        examSheet(x, y, 0.9, age * (3 + hash(i, 16) * 3), Math.cos(age * (6 + i % 4)));
      } else {
        const a0 = turn - l, vx = (hash(i, 14) - 0.5) * 500, vy = 1250 + hash(i, 15) * 450;
        const bx = x0 + vx * a0 + Math.sin(a0 * 5 + i) * 30, by = y0 - vy * a0 + 600 * a0 * a0;
        const ba = t - turn, dir = bx < 960 ? -1 : 1;
        const x = bx + dir * ba * (250 + hash(i, 17) * 300), y = by - ba * (420 + hash(i, 18) * 250);
        if (ba < 0.15) sparkle(bx, by, 50 * (1 - ba / 0.15), '#FFFFFF', ba * 10);
        bird(x, y, 0.9 + ba * 0.2, t * 16 + i, '#FFFFFF');
      }
    }
    confetti(t, T_PU, { n: 110, burst: true, y: 250 });
    camEnd();
    speedLines(t, 960, 560, 1 - seg(t, T_HIT, T_HIT + 0.8), '#FFFFFF', 56, 2);
    sfx('쾅!', 960, 200, 210, PAL.gold, t - T_HIT - 0.03, { life: 1.0, rot: -0.06 });
    flash(1 - easeOut(seg(t, T_HIT, T_HIT + 0.5)));
    if (t >= T_PU) flash(0.55 * (1 - easeOut(seg(t, T_PU, T_PU + 0.3))), '#FFF6D0');
  }

  // ---- 109.09 · the doodled dream comes true: a stage -----------------------------------------

  const T_STAGE = 109.0909;

  function stageScene(t, lt) {
    skyFill([[0, '#2B1446'], [0.7, '#4A1E5E'], [1, '#6A2A62']]);
    // swinging spotlights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[260, PAL.gold], [760, PAL.pink], [1160, PAL.mint], [1660, PAL.gold]].forEach(([x, c], i) => {
      const a = Math.sin(t * 1.3 + i * 1.7) * 0.35, len = 1300;
      ctx.fillStyle = lgrad(x, -40, x - Math.sin(a) * len, len, [[0, rgba(c, 0.45)], [1, rgba(c, 0)]]);
      ctx.beginPath(); ctx.moveTo(x - 20, -40); ctx.lineTo(x + 20, -40);
      ctx.lineTo(x - Math.sin(a) * len + 260, len); ctx.lineTo(x - Math.sin(a) * len - 260, len); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
    // a string of bulbs and a backdrop star
    for (let i = 0; i < 24; i++) {
      const x = i * 86 - 20, y = 120 + Math.sin(i / 23 * Math.PI) * 60;
      const on = (i + beatN(t)) % 3 !== 0;
      circle(x, y, 11, { fill: on ? '#FFE9A0' : '#8A6A70', lw: 3 });
      if (on) glow(x, y, 40, '#FFD45C', 0.4);
    }
    const sp = pulse(t, 5);
    poly(starShape(960, 330, 200 + sp * 16, 0.5, 5, -Math.PI / 2 + Math.sin(t) * 0.05), { fill: rgba(PAL.gold, 0.25), stroke: rgba(PAL.gold, 0.6), lw: 8 });
    // the stage
    rrect(-40, 820, W + 80, 300, 0, { fill: '#5A3050', lw: 6 });
    rrect(-40, 808, W + 80, 26, 6, { fill: '#8A4A6A', lw: 6 });
    for (let i = 0; i < 10; i++) stroke([[i * 210, 834], [i * 210 - 40, 1080]], rgba('#000000', 0.12), 5, { ink: null });
    // the pool of light on the singer
    ell(960, 832, 360, 60, { fill: rgba('#FFF3C8', 0.35), stroke: null });
    // the band
    const b = beatOf(t), strum = Math.exp(-frac(b * 2 + 1e-6) * 6);
    const plane = seg(t, 110.3, 112.5), under = plane > 0.2 && plane < 0.75;
    kid(470, 832, 0.8, { who: 'pony', t, ...dance('cheer', t, 1), eyes: under ? 'wide' : 'happy', mouth: 'grin', lookY: under ? -1 : 0 });
    kid(1450, 832, 0.8, { who: 'glasses', t, ...dance('fist', t, 2), eyes: under ? 'wide' : 'happy', mouth: 'open', lookY: under ? -1 : 0 });
    kid(960, 832, 1.15, {
      who: 'me', t, dy: hop(t) * 16, sq: pulse(t, 8) * 0.05, rot: Math.sin(b * Math.PI) * 0.04,
      aL: 1.4, eL: 0.5, aR: 0.35, eR: -1.23 + strum * 0.35, headRot: Math.sin(b * Math.PI) * 0.08,
      eyes: under ? 'star' : 'happy', mouth: 'open', blush: 0.8, lookY: under ? -1 : 0,
      holdL: (x, y) => { guitar(); circle(x, y, 15, { fill: PAL.skin, lw: 4.5 }); },
      holdR: (x, y) => circle(x, y, 15, { fill: PAL.skin, lw: 4.5 }),
    });
    // music notes floating up off the guitar
    for (let i = 0; i < 6; i++) {
      const f = frac((t - T_STAGE) * 0.55 + i / 6), x = 1060 + Math.sin(f * 7 + i) * 60 + i * 30, y = 650 - f * 420;
      letter(i % 2 ? '♪' : '♫', x, y, 60 + (i % 3) * 14, [PAL.gold, PAL.pink, PAL.mint][i % 3], { alpha: Math.sin(f * Math.PI), lw: 7 });
    }
    // the crowd, lightsticks up
    for (let i = 0; i < 17; i++) {
      const x = i * 122 - 20 + Math.sin(i * 2.3) * 20, y = 1030 + (i % 2) * 30, ph = beatOf(t) + (i % 2) * 0.5;
      const a = Math.sin(ph * Math.PI) * 0.35 + (i % 2 ? 0.2 : -0.2);
      const hx = x + Math.sin(a) * 150, hy = y - 60 - Math.cos(a) * 150;
      stroke([[x + 20, y - 40], [hx, hy]], '#1A0F2A', 26, { ink: null });
      const c = [PAL.mint, PAL.pink, PAL.gold][i % 3];
      stroke([[hx, hy], [hx + Math.sin(a) * 70, hy - Math.cos(a) * 70]], c, 16, { ink: '#1A0F2A', olw: 6 });
      glow(hx + Math.sin(a) * 40, hy - Math.cos(a) * 40, 70, c, 0.4);
      circle(x, y - 50, 58, { fill: '#1A0F2A', stroke: null });
      rrect(x - 80, y, 160, 200, 50, { fill: '#1A0F2A', stroke: null });
    }
    // the paper plane from the doodle, grown huge, sweeping over everything
    if (plane > 0 && plane < 1) {
      const x = lerp(-800, 2700, plane), y = 250 + Math.sin(plane * Math.PI) * -70;
      ctx.save(); ctx.globalAlpha = 0.25; ell(x - 50, 800, 380, 40, { fill: '#000000', stroke: null }); ctx.restore();
      streaks(t, 0.5 * Math.sin(plane * Math.PI), '#FFFFFF', 7, -1);
      paperPlane(x, y, 5, -0.08 + Math.sin(plane * 6) * 0.05, '#FFFDF4');
      // pencil lines still on it: it was drawn in a textbook
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.08 + Math.sin(plane * 6) * 0.05);
      stroke([[-200, -120], [150, -20]], '#9AA3B5', 4, { ink: null, alpha: 0.6 });
      stroke([[-240, -150], [60, -60]], '#9AA3B5', 4, { ink: null, alpha: 0.6 });
      ctx.restore();
    }
  }

  function stage(t, lt, dur) {
    const [sx, sy] = shakeXY(t, T_STAGE + 0.35, 10, 0.3);
    camBegin(960 + Math.sin(lt * 0.8) * 30 + sx, 560 - lt * 10 + sy, 1.04 + lt * 0.03 + pulse(t, 9) * 0.008, Math.sin(lt * 0.6) * 0.012);
    stageScene(t, lt);
    camEnd();
    // it starts as a pencil doodle on a textbook page, and colour floods out from the singer
    const r = easeInOut(seg(t, T_STAGE + 0.25, T_STAGE + 0.85)) * 1300;
    if (r < 1250) {
      ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.arc(960, 560, Math.max(0, r), 0, TAU, true); ctx.clip('evenodd');
      desat(1);
      fillScreen('#FFFDF6', 0.8);
      for (let i = 0; i < 16; i++) rrect(0, 60 + i * 66, W, 3, 0, { fill: rgba('#8FB4E8', 0.5), stroke: null });
      rrect(150, 0, 3, H, 0, { fill: rgba('#F2545B', 0.5), stroke: null });
      ctx.restore();
      if (r > 0) for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU + t;
        sparkle(960 + Math.cos(a) * r, 560 + Math.sin(a) * r, 26, i % 2 ? PAL.gold : '#FFFFFF', t * 3);
      }
    }
  }

  // ---- 112.73 · over the hill, a jump against the sun -----------------------------------------

  const T_JUMP = 114.5455;
  const hillY = x => 1420 - 700 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 1000) / 1500, 2)));

  function hill(t, lt, dur) {
    const frozen = t >= T_JUMP, tt = Math.min(t, T_JUMP);
    const camX = lerp(640, 1000, easeInOut(seg(t, 112.73, T_JUMP)));
    const zoom = frozen ? 1.02 + (t - T_JUMP) * 0.05 : 1.08 - seg(t, 112.73, T_JUMP) * 0.06;
    skyFill([[0, '#FF9A6A'], [0.45, '#FFC46A'], [0.75, '#FFE7A0'], [1, '#FFF3CC']]);
    camBegin(camX, 520, zoom, frozen ? (t - T_JUMP) * 0.01 : 0);
    sunburst(1000, 400, rgba('#FFFFFF', 0.28), rgba('#FFFFFF', 0), t * 0.1, 22, 2400);
    sun(1000, 400, 290, '#FFE36A');
    cloudLayer(t, 180, 0.6, 40, 17, '#FFF1DC', 4);
    // hills behind, then the big one
    smooth([[-600, 900], [-200, 640], [300, 720], [700, 800], [1500, 760], [2000, 620], [2600, 900], [2600, 1300], [-600, 1300]], { fill: '#C9D98A', stroke: null });
    ctx.beginPath(); ctx.ellipse(1000, 1420, 1500, 700, 0, 0, TAU); paint({ fill: '#8FD06E', lw: 7 });
    ctx.save(); ctx.beginPath(); ctx.ellipse(1000, 1420, 1500, 700, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = rgrad(1000, 720, 50, 700, [[0, 'rgba(255,240,170,0.6)'], [1, 'rgba(255,240,170,0)']]); ctx.fillRect(-600, 700, 3200, 800);
    for (let i = 0; i < 40; i++) {
      const x = -400 + hash(i, 3) * 2800, y = hillY(x) + 40 + hash(i, 4) * 500;
      circle(x, y, 7, { fill: [PAL.pink, '#FFFFFF', PAL.gold][i % 3], stroke: null });
    }
    ctx.restore();
    // three runners up the slope, then the leap
    const poses = [
      { who: 'pony', off: -230, pose: { aL: 1.3, aR: 2.95, eL: 0.4, eR: 0, lL: 0.2, lR: 0.9, kL: 0.1, kR: 1.4 } },
      { who: 'me', off: 0, pose: { aL: 2.5, aR: 2.5, eL: 0, eR: 0, lL: 0.75, lR: 0.75, kL: 0, kR: 0 } },
      { who: 'glasses', off: 230, pose: { aL: 2.85, aR: 2.2, eL: 0, eR: 0.5, lL: 0.4, lR: 0.2, kL: 1.3, kR: 0.6 } },
    ];
    const drawKids = () => poses.forEach((p, j) => {
      const run = seg(tt, 112.73, 114.3);
      const x = lerp(-150 + p.off * 1.3 - j * 60, 1000 + p.off, easeOut(run) * 0.85 + run * 0.15);
      const ground = hillY(x);
      const s = 0.82;
      let o;
      if (tt < 114.3) o = { walk: (tt - 112.73) * 2.4 + j * 0.33, run: true, turn: 0.5, eyes: 'happy', mouth: 'grin' };
      else {
        const k = seg(tt, 114.3, T_JUMP);
        o = k < 0.4 ? { sq: 0.18, aL: 0.4, aR: 0.4, kL: 0.5, kR: 0.5, eyes: 'closed', mouth: 'grin' }
          : { dy: easeOut((k - 0.4) / 0.6) * 260, ...p.pose, eyes: 'star', mouth: 'open' };
      }
      kid(x, ground, s, { who: p.who, t: tt, blush: 0.7, shadow: !frozen, ...o });
    });
    if (frozen) silhouette('#4A2240', drawKids);
    else drawKids();
    camEnd();
    if (frozen) {
      // the freeze frame: a flash, and a white border like a photo
      flash(0.8 * (1 - easeOut(seg(t, T_JUMP, T_JUMP + 0.4))));
      const bk = easeOut(seg(t, T_JUMP, T_JUMP + 0.3)) * 26;
      ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20); ctx.roundRect(bk, bk, W - bk * 2, H - bk * 2, 14);
      ctx.fillStyle = '#FFFDF6'; ctx.fill('evenodd');
      ctx.restore();
    }
  }

  // ---- 116.36 · the road to twenty ------------------------------------------------------------

  const T_ROAD = 116.3636, T_STAMP = 118.1818, SPEED = 900;

  function road(t, lt, dur) {
    const X = (t - T_ROAD) * SPEED;
    const [sx, sy] = shakeXY(t, T_STAMP, 26, 0.45);
    skyFill([[0, '#FFB07A'], [0.5, '#FFD88A'], [0.8, '#FFF0C0'], [1, '#FFF0C0']]);
    camBegin(960 + sx + Math.sin(lt * 1.3) * 12, 540 + sy, 1.03 + lt * 0.01, -0.01);
    sun(1560, 540, 170, '#FFE36A');
    sunburst(1560, 540, rgba('#FFFFFF', 0.2), rgba('#FFFFFF', 0), t * 0.15, 20, 2400);
    // far hills and trees scroll at their own speeds
    const wrap = (x, span) => ((x % span) + span) % span;
    for (let i = 0; i < 6; i++) {
      const x = wrap(i * 520 - X * 0.12, 3120) - 500;
      smooth(blobPts(x, 780, 320, 9, 0.15, i + 3), { fill: '#E9C98A', stroke: null });
    }
    for (let i = 0; i < 9; i++) {
      const x = wrap(i * 330 + hash(i, 2) * 100 - X * 0.45, 2970) - 300;
      tree(x, 790, 0.75 + hash(i, 3) * 0.3, hash(i, 5) > 0.6 ? 'sakura' : 'green', t);
    }
    rrect(-300, 760, W + 600, 50, 0, { fill: '#9FD67E', lw: 6 });
    rrect(-300, 800, W + 600, 150, 0, { fill: '#7E7390', lw: 6 });
    for (let i = 0; i < 12; i++) {
      const x = wrap(i * 220 - X, 2640) - 300;
      rrect(x, 868, 110, 12, 6, { fill: '#FFF3CC', stroke: null });
    }
    rrect(-300, 944, W + 600, 300, 0, { fill: '#8FD06E', lw: 6 });
    // milestones: 18, 19, 20
    [[18, 100], [19, 1300], [20, 2706]].forEach(([n, wx]) => {
      const x = wx - X;
      if (x < -300 || x > W + 300) return;
      const big = n === 20;
      stroke([[x, 810], [x, big ? 560 : 610]], '#8A93A6', 14, { olw: 8 });
      rrect(x - (big ? 110 : 80), big ? 440 : 520, big ? 220 : 160, big ? 150 : 100, 18, { fill: big ? PAL.gold : '#FFFFFF', lw: 6 });
      letter(`${n}`, x, big ? 518 : 572, big ? 120 : 76, big ? '#FFFFFF' : PAL.ink, { lw: big ? 12 : 0, shadow: big ? undefined : null });
      if (big) for (let i = 0; i < 4; i++) sparkle(x - 130 + i * 90, 420 + Math.sin(t * 6 + i) * 20, 18 + 8 * Math.sin(t * 9 + i), '#FFFFFF', t * 2);
    });
    // the three of them, flat out
    const stampHop = t > T_STAMP ? Math.exp(-(t - T_STAMP) * 5) * Math.abs(Math.sin((t - T_STAMP) * 12)) * 70 : 0;
    [['glasses', 600, 0.8], ['me', 930, 0.86], ['pony', 1250, 0.82]].forEach(([who, x0, s], j) => {
      const m = mood(t, [[T_ROAD - 1, 'happy', 'grin'], [T_STAMP, 'wide', 'o', '!'], [T_STAMP + 0.4, 'star', 'grin', 'sparkle']]);
      kid(x0 + Math.sin(t * 1.7 + j * 2) * 40, 900 + j % 2 * 12, s, {
        who, t, walk: t * 2.3 + j * 0.37, run: true, turn: 0.6, blush: 0.7, ...m, dy: stampHop, bag: who === 'me',
        aR: j === 2 && t > T_STAMP + 0.4 ? 2.9 : undefined, eR: j === 2 && t > T_STAMP + 0.4 ? 0 : undefined,
      });
    });
    streaks(t, 0.35, '#FFFFFF', 5, -1);
    camEnd();
    // the graduation stamp slams down on the beat and stays
    if (t > T_STAMP - 0.18) {
      const k = seg(t, T_STAMP - 0.18, T_STAMP);
      const s = k < 1 ? lerp(3.2, 1, easeIn(k)) : 1 + 0.12 * Math.exp(-(t - T_STAMP) * 9) * Math.cos((t - T_STAMP) * 35);
      if (t >= T_STAMP) {
        const age = t - T_STAMP;
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU + 0.3, r = 185 + easeOut(clamp(age / 0.25)) * (20 + hash(i, 4) * 45);
          circle(960 + Math.cos(a) * r, 290 + Math.sin(a) * r, 10 + hash(i, 5) * 12, { fill: '#E0384A', stroke: null, alpha: 0.85 });
        }
      }
      stamp(960, 290, s, lerp(-0.45, -0.14, easeOut(k)), clamp(k * 3));
    }
  }

  // ---- 120.00 · the polaroid ------------------------------------------------------------------

  const T_POL = 120.0, T_LAND = 120.75;

  function photo(t) {
    ctx.fillStyle = lgrad(0, -140, 0, 140, [[0, '#FF9A6A'], [0.6, '#FFD88A'], [1, '#FFE9B0']]);
    ctx.fillRect(-160, -150, 320, 300);
    circle(90, -40, 50, { fill: '#FFE36A', stroke: null });
    rrect(-160, 90, 320, 60, 0, { fill: '#9FD67E', stroke: null });
    kid(-92, 205, 0.56, { who: 'pony', t: 3, eyes: 'wink', mouth: 'grin', aR: 2.7, eR: 0.3, aL: 0.4, blush: 0.8, rot: -0.12, shadow: false });
    kid(92, 205, 0.56, { who: 'glasses', t: 4, eyes: 'happy', mouth: 'smile', aL: 2.7, eL: 0.3, aR: 0.4, blush: 0.8, rot: 0.1, shadow: false });
    kid(0, 215, 0.64, { who: 'me', t: 5, eyes: 'happy', mouth: 'grin', aL: 2.9, aR: 2.9, eL: 0.1, eR: 0.1, blush: 0.9, shadow: false });
  }

  function polaroidShot(t, lt, dur) {
    fillScreen('#B87942');
    camBegin(960, 520 - lt * 6, 1.0 + easeInOut(seg(t, T_LAND, 123.64)) * 0.14, 0.02 - lt * 0.008);
    // the desk: planks
    for (let i = 0; i < 7; i++) {
      rrect(-200, i * 190 - 120, W + 400, 188, 4, { fill: i % 2 ? '#C98E5B' : '#C08452', stroke: '#9C6538', lw: 4 });
      stroke([[200 + i * 170, i * 190 - 60], [600 + i * 170, i * 190 - 50]], '#A8703F', 4, { ink: null, alpha: 0.5 });
    }
    // everything from the video, lying around
    toastSlice(300, 230, 1.5, -0.35);
    foldedNote(1620, 230, 1.0, 0.18, 1, () => {
      for (let i = 0; i < 5; i++) rrect(-110 + i * 30, -30 + (i % 2) * 20, 22, 60, 10, { fill: PAL.red, lw: 3 });
      letter('ㄱㄱ?', 60, 40, 56, PAL.ink, { font: 'round', lw: 0, shadow: null });
    });
    reportCard(330, 800, 0.95, 0.16);
    paperPlane(1600, 780, 1.4, -0.45);
    gradCap(1640, 540, 1.2, 0.25);
    ctx.save(); ctx.translate(1180, 960); ctx.rotate(-0.2);
    rrect(0, -13, 170, 26, 3, { fill: PAL.gold, lw: 4 });
    poly([[0, -13], [0, 13], [-30, 0]], { fill: '#F2D2A0', lw: 4 });
    ctx.restore();
    // the photo drops out of the camera onto the desk and develops
    const fall = seg(t, T_POL + 0.12, T_LAND), age = t - T_LAND;
    const y = lerp(-420, 455, easeIn(fall)), rot = lerp(0.7, -0.05, easeOut(fall));
    let s = lerp(2.5, 1.72, easeOut(fall));
    if (age > 0) s *= 1 + 0.06 * Math.exp(-age * 8) * Math.cos(age * 28);
    ctx.save(); ctx.globalAlpha = 0.3 * fall;
    rrect(960 - 180 * s + 30 * (1 - fall) + 14, y - 170 * s + 40 * (1 - fall) + 18, 360 * s, 400 * s, 10, { fill: '#3A2010', stroke: null });
    ctx.restore();
    const dev = easeInOut(seg(t, T_LAND + 0.15, 123.0));
    polaroid(960, y, s, rot, () => photo(t), { develop: dev, caption: dev > 0.6 ? '졸업 날, 우리 셋' : '' });
    if (age > 0 && age < 0.4) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        circle(960 + Math.cos(a) * (330 + age * 400), 520 + Math.sin(a) * (360 + age * 300), 16 * (1 - age / 0.4), { fill: rgba('#FFF3CC', 0.8), stroke: null });
      }
    }
    if (t > 123.0) {
      const k = t - 123.0;
      for (let i = 0; i < 5; i++) sparkle(700 + i * 130, 170 + Math.sin(i * 2.2) * 40, 26 * Math.sin(clamp(k * 1.6 - i * 0.12) * Math.PI), '#FFFFFF', k * 2);
    }
    camEnd();
    // warm late light through a window
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = 0.14; ctx.fillStyle = '#FFE9B0';
    ctx.beginPath(); ctx.moveTo(1100, 0); ctx.lineTo(1920, 0); ctx.lineTo(1920, 500); ctx.lineTo(700, H); ctx.lineTo(300, H); ctx.closePath(); ctx.fill();
    ctx.restore();
    glow(1700, 100, 900, '#FFB070', 0.35);
    // the shutter
    sfx('찰칵!', 330, 150, 110, '#FFFFFF', t - T_POL, { life: 0.8, rot: -0.1 });
    flash(1 - easeOut(seg(t, T_POL, T_POL + 0.45)));
  }

  // ---- 123.64 · caps into the sky --------------------------------------------------------------

  const T_THROW = 124.0909, T_LAST = 125.4545;

  function capsUp(t, lt, dur) {
    const tilt = easeInOut(seg(t, 125.95, 127.27));
    const [sx, sy] = shakeXY(t, T_LAST, 26, 0.45);
    camBegin(960 + sx, lerp(540, -900, tilt) + sy, 1.02 + (1 - tilt) * lt * 0.02, 0);
    ctx.fillStyle = lgrad(0, -1500, 0, 1100, [[0, PAL.paper], [0.25, '#DDF1FF'], [0.62, '#8FD3FF'], [0.85, '#BFE6FF'], [1, '#FFE7A8']]);
    ctx.fillRect(-400, -1600, W + 800, 2900);
    sun(1560, 260, 120, '#FFE36A');
    cloudLayer(t, 160, 0.6, 30, 23, '#FFFFFF', 4);
    cloudLayer(t, -380, 0.8, -25, 29, '#FFFFFF', 4);
    cloudLayer(t, -900, 0.9, 20, 31, '#FFFFFF', 4);
    if (t > T_LAST) sunburst(960, 560, rgba('#FFFFFF', 0.35 * Math.exp(-(t - T_LAST) * 1.5)), rgba('#FFFFFF', 0), t * 0.3, 20, 2400);
    schoolBuilding(960, 860, 0.55, { tone: '#F6E3C3', clock: [11, 0] });
    rrect(-400, 850, W + 800, 400, 0, { fill: '#8FD06E', lw: 6 });
    // the three friends
    const spots = [[600, 945, 0.94], [960, 935, 1.0], [1320, 945, 0.94]];
    spots.forEach(([x, y, s], j) => {
      const who = TRIO[j];
      let o;
      if (t < T_THROW - 0.2) o = { ...dance('bounce', t, j), eyes: 'happy', mouth: 'smile' };
      else if (t < T_THROW) o = { sq: 0.14, aL: 0.9, aR: 0.9, eL: 1.2, eR: 1.2, eyes: 'closed', mouth: 'grin' };
      else if (t < T_LAST - 0.22) o = { ...dance('cheer', t, j), eyes: 'happy', mouth: 'grin', lookY: -1 };
      else if (t < T_LAST) o = { sq: 0.18 * seg(t, T_LAST - 0.22, T_LAST), aL: 0.5, aR: 0.5, kL: 0.4, kR: 0.4, eyes: 'closed', mouth: 'grin' };
      else {
        const k = seg(t, T_LAST, T_LAST + 0.9);
        o = { dy: Math.sin(k * Math.PI) * 280, sq: -0.08 * Math.sin(k * Math.PI), aL: 2.8, aR: 2.8, eL: 0, eR: 0, lL: 0.5, lR: 0.5, kL: 0.5 + j * 0.2, kR: 0.5, eyes: 'star', mouth: 'open' };
      }
      kid(x, y, s, { who, t, blush: 0.7, ...o });
      // their caps: on the head, then up and away on the throw
      const headTop = y - ((o.dy || 0) + 392) * s;
      if (t < T_THROW) gradCap(x + 6 * s, headTop + 4 * s, 1.15 * s, -0.08 + (j - 1) * 0.05);
      else {
        const a = t - T_THROW;
        gradCap(x + (j - 1) * 90 * a, y - 392 * s - 1500 * a + 260 * a * a, 1.15 * s, a * (4 + j));
      }
    });
    // everybody else's caps too
    for (let i = 0; i < 18; i++) {
      const a = t - (T_THROW + hash(i, 1) * 0.5);
      if (a < 0) continue;
      const x = hash(i, 2) * W + (hash(i, 3) - 0.5) * 300 * a, y = 1150 - (1300 + hash(i, 4) * 500) * a + 230 * a * a;
      gradCap(x, y, 0.9 + hash(i, 5) * 0.5, a * (3 + hash(i, 6) * 4) * (i % 2 ? 1 : -1), i % 4 === 0 ? PAL.navy : '#2A2438');
    }
    confetti(t, T_LAST, { n: 120, burst: true, y: 200 });
    camEnd();
    if (t >= T_LAST) flash(0.5 * (1 - easeOut(seg(t, T_LAST, T_LAST + 0.3))), '#FFF6D0');
    // up into the sky, which turns into the paper of the last page
    fillScreen(PAL.paper, easeIn(seg(t, 126.7, 127.27)));
  }

  // ---- 127.27 · the end card ------------------------------------------------------------------

  const T_END = 127.2727;

  function endCard(t, lt, dur) {
    KARAOKE.hidden = true;
    fillScreen(PAL.paper);
    camBegin(960, 540, 1.0 + lt * 0.012, 0);
    // a few faint pencil doodles on the page
    ctx.save(); ctx.globalAlpha = 0.18;
    poly(starShape(300, 220, 40, 0.45), { fill: null, stroke: '#6B6478', lw: 4 });
    poly(starShape(1640, 780, 32, 0.45), { fill: null, stroke: '#6B6478', lw: 4 });
    poly(heartPts(1600, 240, 30), { fill: null, stroke: '#6B6478', lw: 4 });
    ctx.restore();
    // a paper plane loops round the title, leaving a pencil trail
    const u = seg(t, T_END + 0.3, 130.3);
    if (u > 0) {
      const at = v => { const a = -Math.PI * 0.95 + v * TAU * 0.92; return [960 + Math.cos(a) * 760, 410 + Math.sin(a) * 250]; };
      ctx.save(); ctx.setLineDash([14, 14]); ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = at(Math.max(0, u - 0.35) + (u - Math.max(0, u - 0.35)) * i / 40); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = '#6B6478'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
      const [x, y] = at(u), [x2, y2] = at(Math.min(1, u + 0.01));
      paperPlane(x, y, 0.55, Math.atan2(y2 - y, x2 - x));
    }
    // the title, one syllable at a time on the final hit
    const chars = ['고', '딩', ' ', '라', '이', '프'], cols = [PAL.gold, PAL.orange, null, PAL.pink, PAL.mint, PAL.blue];
    const size = 230;
    ctx.font = `${size}px ${FONT.bold}`;
    const ws = chars.map(c => ctx.measureText(c).width), total = ws.reduce((a, b) => a + b, 0);
    let x = 960 - total / 2;
    chars.forEach((c, i) => {
      const cx = x + ws[i] / 2; x += ws[i];
      if (c === ' ') return;
      const pop = clamp((t - T_END - i * 0.06) / 0.35);
      const bob = Math.sin(t * 3 + i * 0.9) * 6 * clamp(t - T_END - 0.6);
      letter(c, cx, 390 + bob, size, cols[i], { pop, rot: Math.sin(i * 1.7) * 0.05, lw: 18 });
    });
    // the three of them, small, waving goodbye
    [['pony', 760], ['me', 960], ['glasses', 1160]].forEach(([who, kx], j) => {
      const k = clamp((t - T_END - 0.5 - j * 0.1) / 0.3);
      if (k <= 0) return;
      kid(kx, 810 + (1 - backOut(k)) * 60, 0.56, { who, t, alpha: clamp(k * 2), ...dance('wave', t, j), eyes: 'happy', mouth: j === 1 ? 'grin' : 'smile', blush: 0.8 });
    });
    const ck = clamp((t - 128.2) / 0.6);
    letter('노래·영상 · Claude Code 로 만들었어요', 960, 920, 46, '#6B6478', { font: 'round', lw: 0, shadow: null, alpha: ck });
    camEnd();
    fillScreen('#17131F', easeInOut(seg(t, 129.5, 130.85)));
  }

  chapter('free', 105.45, 131.5, [
    [105.45, gates],
    [109.09, stage],
    [112.73, hill],
    [116.36, road],
    [120.0, polaroidShot],
    [123.64, capsUp],
    [127.27, endCard],
  ]);
})();
