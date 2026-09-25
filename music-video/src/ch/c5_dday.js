// c5_dday: the bridge. A cold night classroom where D-day counts down, grown-ups looming with
// questions, a heartbeat on a rooftop under the stars, a paper plane caught at first light, and
// the exam build that freezes into one black-and-white beat of silence.
(() => {
  const B = SONG.beat, S16 = B / 4;
  const T_BUILD = 101.818, T_FREEZE = 105.0;

  // ---- private helpers ------------------------------------------------------------------------

  /** Take the colour out of everything painted so far (k 0..1). */
  function desat(k = 1) {
    if (k <= 0) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp(k);
    ctx.fillStyle = '#808080'; ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.restore();
  }
  /** A soft coloured edge around the frame. */
  function edgeGlow(color, a) {
    if (a <= 0.002) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = rgrad(W / 2, H / 2, H * 0.35, H * 1.05, [[0, rgba(color, 0)], [1, rgba(color, a)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  /** Catmull-Rom through knots [[t, x, y], ...] evenly spread in time. */
  function spline(knots, t) {
    const n = knots.length;
    if (t <= knots[0][0]) return [knots[0][1], knots[0][2]];
    if (t >= knots[n - 1][0]) return [knots[n - 1][1], knots[n - 1][2]];
    let i = 0;
    while (i + 2 < n && t > knots[i + 1][0]) i++;
    const u = (t - knots[i][0]) / (knots[i + 1][0] - knots[i][0]);
    const P = j => knots[clamp(j, 0, n - 1)];
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
  }
  /** A paper plane that faces the way it is flying. */
  function planeFlying(x, y, s, vx, vy, glowK = 0.5) {
    if (glowK > 0) glow(x, y, 160 * s / 0.6, '#FFF3C8', glowK * 0.5);
    ctx.save(); ctx.translate(x, y);
    if (vx < 0) ctx.scale(-1, 1);
    paperPlane(0, 0, s, Math.atan2(vy, Math.abs(vx)) * 0.8);
    ctx.restore();
  }
  function pencil(x, y, s, rot) {
    // the tip sits at (x, y); the body runs up and to the right at rot
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    poly([[0, 0], [26, -12], [26, 12]], { fill: '#F2D2A0', lw: 4 });
    poly([[0, 0], [9, -4], [9, 4]], { fill: PAL.ink, stroke: null });
    rrect(26, -13, 170, 26, 3, { fill: PAL.gold, lw: 4 });
    stroke([[30, 0], [192, 0]], '#E0A52A', 4, { ink: null });
    rrect(194, -14, 22, 28, 3, { fill: '#C9CED8', lw: 4 });
    rrect(214, -13, 26, 26, 8, { fill: PAL.pink, lw: 4 });
    ctx.restore();
  }
  const faceY = (y, s, dy = 0) => y - (dy + 290) * s;

  // ---- 87.27 · D-day on the board -------------------------------------------------------------

  const DNUM = [100, 99, 73, 50, 30, 15, 7, 1];
  const DATE = [[8, 6], [8, 7], [9, 2], [9, 25], [10, 15], [10, 30], [11, 7], [11, 13]];

  function dayPage(x, y, i, rot = 0, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
    rrect(-90, -8, 180, 190, 6, { fill: '#F4F1EA', lw: 4 });
    rrect(-90, -8, 180, 44, 6, { fill: '#C94A57', lw: 4 });
    ctx.font = `30px ${FONT.round}`; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${DATE[i][0]}월`, 0, 15);
    ctx.font = `104px ${FONT.bold}`; ctx.fillStyle = '#39406A';
    ctx.fillText(`${DATE[i][1]}`, 0, 112);
    ctx.restore();
  }

  function ddayBoard(t, lt, dur) {
    const i = clamp(Math.floor((t - 87.27) / B + 1e-4), 0, 7);
    const since = t - (87.27 + i * B);
    const [sx, sy] = shakeXY(t, 87.27 + i * B, i ? 5 + i : 0, 0.22);
    const zoom = lerp(1.6, 2.0, easeInOut(lt / dur)) + 0.012 * Math.exp(-since * 8) * (i ? 1 : 0);
    camBegin(1580 - lt * 22 + sx, 380 + sy, zoom, -0.03 + lt * 0.01);
    // time lapse: the clock hands whirl while the days fall away
    const spin = lt * 5.5;
    classroom(t, {
      night: 1, clock: [(10 + spin) % 12, (spin * 60) % 60],
      board: (bx, by, bw, bh) => {
        // faint leftovers from the day
        chalk('수학 II  복습', 1010, 210, 44, PAL.chalk, { alpha: 0.25 });
        chalk('∫ f(x) dx = F(b) - F(a)', 1010, 300, 40, PAL.chalk, { alpha: 0.22 });
        chalk('자습', 1030, 430, 70, PAL.chalk, { alpha: 0.18, rot: -0.05 });
        // the D-day box in the corner
        const x0 = 1440, y0 = 180, w = 280, h = 250;
        ctx.save(); ctx.globalAlpha = 0.9;
        stroke([[x0, y0], [x0 + w, y0 + 3], [x0 + w - 2, y0 + h], [x0 + 3, y0 + h - 2], [x0, y0]], '#FFB3C2', 5, { ink: null });
        ctx.restore();
        chalk('수능', x0 + w / 2, y0 + 50, 58, '#FFB3C2', { align: 'center' });
        // the old number smears away, the new one is written over it
        const pop = i ? 1 + 0.35 * Math.exp(-since * 10) * Math.cos(since * 30) : 1;
        ctx.save(); ctx.translate(x0 + w / 2, y0 + 160); ctx.scale(pop, pop); ctx.rotate(i ? 0.06 * Math.exp(-since * 9) : 0);
        chalk(`D-${DNUM[i]}`, 0, 0, DNUM[i] >= 100 ? 96 : 112, '#FFFFFF', { align: 'center', alpha: 0.95 });
        ctx.restore();
        if (i > 0 && since < 0.3) {
          ctx.save(); ctx.globalAlpha = 0.2 * (1 - since / 0.3);
          ell(x0 + w / 2, y0 + 160, 130, 50, { fill: '#DDE8E0', stroke: null });
          ctx.restore();
          for (let d = 0; d < 7; d++) {
            const px = x0 + 40 + hash(d, i) * (w - 80), py = y0 + 200 + since * (200 + hash(d, i + 9) * 250);
            circle(px, py, 3 + hash(d, 4) * 3, { fill: '#FFFFFF', stroke: null, alpha: 0.7 * (1 - since / 0.3) });
          }
        }
      },
    });
    // a tear-off calendar on the wall beside the board; a page flies off on every beat
    const cx = 1900, cy = 190;
    rrect(cx - 100, cy - 40, 200, 250, 10, { fill: '#8C92B4', lw: 5 });
    circle(cx, cy - 58, 9, { fill: '#C9CED8', lw: 4 });
    stroke([[cx - 60, cy - 36], [cx, cy - 58], [cx + 60, cy - 36]], '#C9CED8', 3, { ink: null });
    dayPage(cx, cy, i);
    for (let j = 1; j <= i; j++) {
      const age = t - (87.27 + j * B);
      if (age < 0 || age > 1.2) continue;
      const fx = cx + age * (420 + hash(j, 2) * 200) - 40 * Math.sin(age * 6 + j);
      const fy = cy - age * 380 + age * age * 1300;
      dayPage(fx, fy, j - 1, age * (2.5 + hash(j, 3) * 2) * (hash(j, 5) > 0.5 ? 1 : -1), 1 - clamp((age - 0.8) / 0.4));
    }
    camEnd();
    // cold moonlight through the window, a purple night over everything
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = 0.09; ctx.fillStyle = '#CFE3FF';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(620, 0); ctx.lineTo(1500, H); ctx.lineTo(700, H); ctx.closePath(); ctx.fill();
    ctx.restore();
    fillScreen('#1A1438', 0.28);
    edgeGlow('#0A0820', 0.55);
    // the lights have just gone down at the end of the last chapter: come up out of the dark
    fillScreen('#0E0B1E', 1 - easeOut(seg(t, 87.2, 87.55)));
  }

  // ---- 90.91 · the grown-ups and their questions ----------------------------------------------

  const ADULTS = [
    { kind: 'aunt', x: 150, dir: 1, s: 1.55 },
    { kind: 'mom', x: 560, dir: 1, s: 1.75 },
    { kind: 'dad', x: 1370, dir: -1, s: 1.8 },
    { kind: 'teacher', x: 1770, dir: -1, s: 1.6 },
  ];
  const QS = [
    [91.364, 1, '꿈이 뭐니?', 820, 210, 400, 130],
    [91.818, 2, '대학은?', 1110, 270, 300, 120],
    [92.273, 0, '장래희망은?', 400, 170, 380, 120],
    [92.727, 3, '진로는?', 1540, 180, 300, 120],
    [93.182, 1, '?', 690, 440, 190, 190],
    [93.636, 2, '??', 1240, 450, 230, 200],
    [94.091, 0, '?!', 960, 330, 260, 230],
  ];

  function adults(t, lt, dur) {
    const k = easeInOut(lt / dur);
    skyFill([[0, '#1B1433'], [0.6, '#2C2152'], [1, '#1B1433']]);
    // a pale pool of light around the kid
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = rgrad(960, 700, 40, 760, [[0, 'rgba(160,140,230,0.55)'], [0.5, 'rgba(110,90,190,0.25)'], [1, 'rgba(60,40,120,0)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    let lastQ = -1;
    QS.forEach((q, j) => { if (t >= q[0]) lastQ = j; });
    const [sx, sy] = lastQ >= 0 ? shakeXY(t, QS[lastQ][0], 7, 0.25) : [0, 0];
    camBegin(960 + sx, 600 + sy - lt * 10, 1 + k * 0.08, Math.sin(lt * 0.9) * 0.012);
    stars(t, 50, 21, 0.5, 700);
    // the grown-ups close in and lean over
    for (const a of ADULTS) {
      const s = a.s * (1 + 0.14 * k), x = a.x + a.dir * 90 * k;
      adult(x, 1180, s, { kind: a.kind, t, silhouette: '#0C0919', rot: a.dir * (0.05 + 0.07 * k), aL: 0.3, aR: 0.3, headRot: a.dir * 0.08 });
    }
    // the kid, small in the middle, getting smaller
    const ks = lerp(0.82, 0.55, k), kx = 960 + Math.sin(t * 43) * 1.5 * k, ky = 860;
    ell(kx, ky + 4, 230 * ks + 60, 40 * ks + 10, { fill: 'rgba(200,190,255,0.25)', stroke: null });
    const m = mood(t, [[90.9, 'wide', 'o', '!'], [91.8, 'wide', 'wavy', 'sweat'], [92.7, 'sad', 'wavy', 'sweat'], [93.6, 'sad', 'sad', 'sweat']]);
    const toward = lastQ >= 0 ? clamp((QS[lastQ][3] - kx) / 300, -1, 1) : 0;
    kid(kx, ky, ks, {
      who: 'me', t, ...m, brows: 'worried', lookX: toward, lookY: -0.8,
      aL: 0.55, aR: 0.55, eL: 1.9, eR: 1.9, sq: m.sq + 0.02 * Math.sin(t * 30) * k, headDy: 6 * k,
    });
    // their questions pop out and keep swelling
    QS.forEach(([t0, who, txt, bx, by, bw, bh]) => {
      const age = t - t0;
      if (age < 0) return;
      const a = ADULTS[who], s = a.s * (1 + 0.14 * k), ax = a.x + a.dir * 90 * k;
      const hx = ax + a.dir * 410 * s * Math.sin(0.05 + 0.07 * k), hy = 1180 - 420 * s;
      const sc = backOut(clamp(age / 0.22)) * (1 + age * 0.12);
      ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc); ctx.rotate(Math.sin(age * 3 + who) * 0.04);
      speechBubble(0, 0, bw, bh, (hx - bx) * 0.35, (hy - by) * 0.35 + bh * 0.2, { text: txt, size: txt.length <= 2 ? bh * 0.62 : bh * 0.42 });
      ctx.restore();
    });
    camEnd();
    edgeGlow('#08061A', 0.6);
  }

  // ---- 94.55 / 98.18 · the rooftop at night, then first light ---------------------------------

  const THUMPS = [[94.545, 1], [94.818, 0.7], [96.364, 1], [96.636, 0.7]];
  const heart = t => THUMPS.reduce((m, [ti, a]) => (t >= ti ? Math.max(m, a * Math.exp(-(t - ti) * 9)) : m), 0);

  const PLANE = [
    [95.2, -250, 280], [95.9, 120, 380], [96.6, 470, 300], [97.3, 760, 390], [98.0, 1030, 330],
    [98.6, 1400, 290], [99.1, 1560, 470], [99.55, 1225, 600],
  ];
  const planeAt = t => spline(PLANE, t);

  const KID_X = 1150, SEAT = 700, KS = 0.88;

  function rooftopBg(t, dawn) {
    const top = mix('#150F33', '#3D3478', dawn), mid = mix('#2A2160', '#B070A8', dawn), low = mix('#3B2F72', '#FFB27A', dawn);
    skyFill([[0, top], [0.45, mid], [0.68, low], [1, low]]);
    if (dawn > 0) glow(1350, 720, 900, '#FFB27A', 0.55 * dawn);
    stars(t, 110, 41, 1 - dawn * 0.85, 640);
    ctx.save(); ctx.globalAlpha = 1 - dawn; moon(560, 190, 56); ctx.restore();
    // a shooting star
    const ss = seg(t, 96.9, 97.35);
    if (ss > 0 && ss < 1) {
      const x = lerp(300, 900, ss), y = lerp(80, 260, ss);
      stroke([[x - 180, y - 55], [x, y]], '#FFFFFF', 4, { ink: null, alpha: Math.sin(ss * Math.PI) });
      sparkle(x, y, 16, '#FFFFFF', t * 4);
    }
  }
  /** A low skyline of the town below, windows still lit. Feet hidden behind the parapet. */
  function skyline(t, dawn) {
    for (let layer = 0; layer < 2; layer++) {
      const far = layer === 0, col = far ? mix('#3A3170', '#8A6A9A', dawn) : mix('#241E4C', '#5A4468', dawn);
      let x = far ? -140 : -60;
      for (let i = 0; x < W + 200; i++) {
        const bw = (far ? 120 : 90) + hash(i, 31 + layer) * 130, bh = (far ? 110 : 40) + hash(i, 41 + layer) * (far ? 150 : 150);
        rrect(x, 690 - bh, bw, bh + 20, 4, { fill: col, stroke: null });
        if (!far) {
          const cols = Math.max(1, Math.floor(bw / 34)), rows = Math.floor(bh / 34);
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const on = hash(i * 13 + r, c + 5) < 0.4 * (1 - dawn * 0.6);
            if (on) rrect(x + 12 + c * ((bw - 16) / cols), 690 - bh + 14 + r * 34, 14, 16, 2, { fill: '#FFE08A', stroke: null, alpha: 0.9 });
          }
        } else if (hash(i, 9) > 0.6) circle(x + bw / 2, 690 - bh - 10, 4, { fill: '#FF6B6B', stroke: null, alpha: 0.5 + 0.5 * Math.sin(t * 3 + i) });
        x += bw + (far ? 10 : 24) + hash(i, 51 + layer) * 40;
      }
    }
  }
  function rooftopSet(t, dawn) {
    skyline(t, dawn);
    // parapet and roof
    rrect(-400, 700, W + 800, 150, 0, { fill: mix('#4A4078', '#7A6690', dawn), lw: 6 });
    rrect(-400, 688, W + 800, 26, 6, { fill: mix('#5E5390', '#977FA8', dawn), lw: 6 });
    for (let i = 0; i < 12; i++) stroke([[i * 180 + 40, 730], [i * 180 + 40, 840]], rgba('#FFFFFF', 0.06), 4, { ink: null });
    rrect(-400, 846, W + 800, 260, 0, { fill: mix('#2F2858', '#5A4870', dawn), lw: 6 });
    // a water tank and an antenna
    stroke([[190, 700], [190, 560]], '#3A3060', 10, { olw: 7 });
    stroke([[330, 700], [330, 560]], '#3A3060', 10, { olw: 7 });
    rrect(150, 430, 220, 150, 30, { fill: mix('#5A6090', '#8A84A8', dawn), lw: 6 });
    stroke([[1750, 690], [1750, 470]], '#3A3060', 7, { olw: 6 });
    stroke([[1700, 520], [1800, 520]], '#3A3060', 6, { olw: 6 });
    stroke([[1715, 560], [1785, 560]], '#3A3060', 6, { olw: 6 });
    circle(1750, 466, 8, { fill: Math.sin(t * 4) > 0 ? '#FF6B6B' : '#7A3040', stroke: null });
  }

  function rooftop(t, lt, dur) {
    const hb = heart(t);
    rooftopBg(t, 0);
    const zoom = 1.14 + lt * 0.045 + hb * 0.045;
    camBegin(1060 + lt * 12, 540 - lt * 6, zoom, Math.sin(lt * 0.7) * 0.01);
    rooftopSet(t, 0);
    // the kid on the ledge, alone
    const [px, py] = planeAt(t);
    const ky = SEAT + 104 * KS, fy = faceY(ky, KS);
    const seen = t > 96.9;
    const m = mood(t, [[94.5, 'sad', 'flat'], [96.9, 'open', 'o'], [97.7, 'open', 'smile']]);
    kid(KID_X, ky, KS, {
      who: 'me', t, sit: true, ...m, sq: m.sq + hb * 0.035,
      lookX: seen ? clamp((px - KID_X) / 350, -1, 1) : -0.3, lookY: seen ? clamp((py - fy) / 250, -1, 1) : -1,
      aL: 0.35, aR: 0.35, eL: 1.1, eR: 1.1, headRot: seen ? 0 : -0.06, blush: 0.25,
    });
    // a heartbeat ring from her chest
    for (const [ti, a] of THUMPS) {
      const age = t - ti;
      if (age < 0 || age > 0.8) continue;
      ctx.save(); ctx.globalAlpha = a * (1 - age / 0.8) * 0.6;
      ellPath(KID_X, ky - 150 * KS, 60 + age * 700, 60 + age * 700);
      ctx.strokeStyle = '#FF9AB8'; ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    }
    // the paper plane, drifting in from far away
    if (t > 95.2) {
      const [qx, qy] = planeAt(t + 0.03);
      stroke([0.5, 0.35, 0.2].map(d => planeAt(t - d)), '#FFFFFF', 3, { ink: null, alpha: 0.25, smooth: true });
      planeFlying(px, py, 0.62, qx - px, qy - py, 0.6);
    }
    camEnd();
    edgeGlow('#FF4F8B', 0.45 * hb);
    edgeGlow('#0A0820', 0.5 + 0.2 * hb);
    fillScreen('#FF9AB8', 0.07 * hb);
  }

  function dawnGrab(t, lt, dur) {
    const dawn = easeInOut(seg(t, 98.18, 101.82)) * 0.85;
    rooftopBg(t, dawn);
    // the camera pushes in to her face after the catch
    const push = easeInOut(seg(t, 100.0, 101.0)) + seg(t, 101.0, 101.82) * 0.12;
    const floorY = 935;
    const standK = seg(t, 98.64, 98.86);
    const ky = standK <= 0 ? SEAT + 104 * KS : lerp(SEAT + 104 * KS, floorY, easeIn(standK));
    const fy = faceY(floorY, KS);
    const cx = lerp(1100 + lt * 15, KID_X + 30, push), cy = lerp(545, fy + 45, push);
    const [sx, sy] = shakeXY(t, 100.0, 8, 0.25);
    camBegin(cx + sx, cy + sy, lerp(1.22, 2.6, push), lerp(0, -0.02, push));
    rooftopSet(t, dawn);
    if (dawn > 0) glow(1350, 700, 700, '#FFD9A0', 0.35 * dawn);
    // stand, crouch, jump, catch, land
    const sitting = t < 98.64;
    const jumpK = seg(t, 99.09, 100.0);
    const dy = jumpK > 0 && jumpK < 1 ? Math.sin(jumpK * Math.PI) * 120 : 0;
    const sq = sitting ? 0 : (t < 98.95 ? 0.14 * Math.exp(-(t - 98.86) * 12) * (t > 98.86 ? 1 : 0)
      : t < 99.09 ? 0.12 * seg(t, 98.95, 99.09) : jumpK < 1 ? -0.08 * Math.sin(jumpK * Math.PI) : 0.14 * Math.exp(-(t - 100.0) * 9));
    const caught = t >= 99.55;
    const armUp = sitting ? 0.35 : lerp(0.35, 2.85, easeOut(seg(t, 99.0, 99.4)));
    const m = mood(t, [[98.1, 'open', 'o', '!'], [98.8, 'wide', 'open'], [99.55, 'star', 'grin', 'sparkle'], [100.45, 'determined', 'flat']]);
    const [px, py] = planeAt(t);
    kid(KID_X, sitting ? ky : floorY, KS, {
      who: 'me', t, sit: sitting, ...m, sq: (m.sq || 0) + sq, dy: sitting ? 0 : dy,
      lookX: caught ? (t > 100.45 ? 0.1 : 0.5) : clamp((px - KID_X) / 350, -1, 1),
      lookY: caught ? (t > 100.45 ? 0 : -0.8) : clamp((py - fy) / 250, -1, 1),
      aL: sitting ? 0.35 : lerp(0.3, 0.9, seg(t, 99.1, 99.4)), eL: sitting ? 1.1 : 0.4,
      aR: armUp, eR: sitting ? 1.1 : 0.1, blush: 0.5,
      cowlick: Math.sin(t * 14) * 0.25 * dawn,
      emote: m.emote, emoteK: t > 100.45 ? 0 : m.emoteK,
      holdR: caught ? (x, y) => paperPlane(x + 10, y - 20, 0.5, -0.5 + Math.sin(t * 5) * 0.05) : undefined,
    });
    if (!caught) {
      const [qx, qy] = planeAt(t + 0.03);
      planeFlying(px, py, 0.62, qx - px, qy - py, 0.5);
    }
    if (caught && t - 99.55 < 0.5) {
      const age = t - 99.55;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        sparkle(1225 + Math.cos(a) * (40 + age * 260), 590 + Math.sin(a) * (40 + age * 260), 18 * (1 - age / 0.5), PAL.gold, a);
      }
    }
    // the first light catches her face in the close-up
    if (push > 0) glow(KID_X + 160, fy - 40, 420, '#FFD9A0', 0.25 * push);
    camEnd();
    edgeGlow('#0A0820', 0.45 * (1 - dawn));
  }

  // ---- 101.82 · the exam build ------------------------------------------------------------------

  const s16 = t => clamp(Math.floor((t - T_BUILD) / S16 + 1e-4), 0, 27);
  const f16 = t => (t < T_BUILD ? 0 : (t - T_BUILD) / S16 - s16(t));
  const shakeAmt = t => 2 + 22 * Math.pow(seg(t, T_BUILD, T_FREEZE), 2);
  const jitter = (t, amt) => [Math.sin(t * 97) * amt + Math.sin(t * 53) * amt * 0.5, Math.cos(t * 83) * amt];

  function examClock(x, y, r, t) {
    const n = s16(t), fr = t < T_BUILD ? 0 : f16(t);
    const step = TAU / 60, sec = (40 + n - 1 + backOut(clamp(fr * 5))) * step;
    circle(x, y, r * 1.08, { fill: '#6E7180', lw: r * 0.03 });
    circle(x, y, r, { fill: '#FFFFFF', lw: r * 0.025 });
    for (let i = 0; i < 60; i++) {
      const a = i * step, big = i % 5 === 0;
      const r0 = r * (big ? 0.8 : 0.86);
      stroke([[x + Math.sin(a) * r0, y - Math.cos(a) * r0], [x + Math.sin(a) * r * 0.92, y - Math.cos(a) * r * 0.92]], PAL.ink, r * (big ? 0.025 : 0.01), { ink: null });
    }
    ctx.font = `${r * 0.2}px ${FONT.bold}`; ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [12, 3, 6, 9].forEach((h, i) => { const a = i * Math.PI / 2; ctx.fillText(`${h}`, x + Math.sin(a) * r * 0.64, y - Math.cos(a) * r * 0.64); });
    const hand = (a, len, w, c) => stroke([[x - Math.sin(a) * len * 0.15, y + Math.cos(a) * len * 0.15], [x + Math.sin(a) * len, y - Math.cos(a) * len]], c, w, { ink: null });
    hand((11 + 55 / 60) / 12 * TAU, r * 0.5, r * 0.06, PAL.ink);
    hand((55 + (40 + n) / 60) / 60 * TAU, r * 0.75, r * 0.04, PAL.ink);
    hand(sec, r * 0.85, r * 0.018, PAL.red);
    circle(x, y, r * 0.045, { fill: PAL.red, stroke: null });
  }

  const OMR_COLS = 3, OMR_ROWS = 10;
  const bubblePos = q => {
    const c = Math.floor(q / OMR_ROWS), r = q % OMR_ROWS, choice = Math.floor(hash(q, 77) * 5);
    return [110 + c * 330 + choice * 48, 110 + r * 58];
  };
  /** The answer card, in its own space (about 1050 x 700), filled up to time t. */
  function omrCard(t) {
    const n = s16(t), fr = t < T_BUILD ? 0 : f16(t);
    rrect(0, 0, 1050, 700, 14, { fill: '#FFF4F2', lw: 6 });
    rrect(0, 0, 1050, 56, 14, { fill: '#F2A7B3', lw: 6 });
    letter('답 안 지', 525, 30, 36, '#FFFFFF', { lw: 5, shadow: null });
    for (let c = 0; c < OMR_COLS; c++) {
      rrect(20 + c * 330, 72, 310, 610, 8, { fill: null, stroke: '#E8768A', lw: 3 });
      for (let r = 0; r < OMR_ROWS; r++) {
        const q = c * OMR_ROWS + r, y = 110 + r * 58;
        ctx.font = `28px ${FONT.bold}`; ctx.fillStyle = '#D0546A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${q + 1}`, 60 + c * 330, y);
        for (let j = 0; j < 5; j++) {
          const bx = 110 + c * 330 + j * 48;
          ell(bx, y, 15, 20, { fill: '#FFFFFF', stroke: '#E8768A', lw: 3 });
          ctx.font = `20px ${FONT.round}`; ctx.fillStyle = '#E8768A'; ctx.fillText(`${j + 1}`, bx, y + 1);
        }
        if (q <= n && t >= T_BUILD) {
          const [bx, by] = bubblePos(q), k = q < n ? 1 : clamp(fr * 2.2);
          ell(bx, by, 15 * lerp(0.4, 1, k), 20 * lerp(0.4, 1, k), { fill: PAL.ink, stroke: null, alpha: 0.9 });
        }
      }
    }
  }
  /** The pencil tip racing over the card (in card space). */
  function omrPencil(t) {
    const n = s16(t), fr = f16(t);
    const [x0, y0] = bubblePos(Math.max(0, n - 1)), [x1, y1] = bubblePos(n);
    const k = n === 0 ? 1 : easeOut(clamp(fr * 3));
    const x = lerp(x0, x1, k) + Math.cos(t * 90) * 7, y = lerp(y0, y1, k) + Math.sin(t * 90) * 5;
    ctx.save(); ctx.globalAlpha = 0.25; pencil(x + 18, y + 22, 1.6, -0.75); ctx.restore();
    pencil(x, y, 1.6, -0.75);
  }
  const omrFocus = t => {
    const n = s16(t), fr = f16(t);
    const [x0, y0] = bubblePos(Math.max(0, n - 1)), [x1, y1] = bubblePos(n);
    const k = n === 0 ? 1 : ease(clamp(fr * 2));
    return [lerp(x0, x1, k), lerp(y0, y1, k)];
  };

  function examRoom(w, h) {
    ctx.fillStyle = lgrad(0, 0, 0, h, [[0, '#B9BBC6'], [1, '#9EA1AE']]); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) stroke([[i * 170, 0], [i * 170, h * 0.75]], rgba('#FFFFFF', 0.08), 6, { ink: null });
    rrect(-10, h * 0.78, w + 20, h * 0.3, 0, { fill: '#8C8577', lw: 5 });
  }

  function panel(px, py, pw, ph, pop, draw, rot = 0) {
    if (pop <= 0) return;
    const s = backOut(clamp(pop));
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2); ctx.rotate(rot * (1 - clamp(pop))); ctx.scale(s, s); ctx.translate(-pw / 2, -ph / 2);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, pw, ph); ctx.clip();
    draw(pw, ph);
    ctx.restore();
    rrect(0, 0, pw, ph, 4, { fill: null, lw: 10 });
    ctx.restore();
  }

  function kidAtDesk(t, x, y, s, who, main) {
    const writing = t >= T_BUILD, n = s16(t);
    const top = y + 20 * s - 176 * s * 1.15;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 400 * s, y - 800 * s, 800 * s, top - (y - 800 * s) + 10); ctx.clip();
    kid(x, y - 55 * s, s, {
      who, t, eyes: main ? 'determined' : 'open', mouth: main ? 'flat' : 'wavy', lookY: 1, lookX: 0.2,
      headRot: 0.05 + (main ? Math.sin(n * 2.1) * 0.02 : 0), headDy: 18,
      emote: main ? 'sweat' : null, emoteK: 0.8 + 0.2 * Math.sin(t * 8), shadow: false,
    });
    ctx.restore();
    desk(x, y + 20 * s, s * 1.15, { top: '#C9B08A' });
    // the test paper, and a hand scribbling over it
    poly([[x - 90 * s, top - 4 * s], [x + 110 * s, top - 4 * s], [x + 120 * s, top + 12 * s], [x - 100 * s, top + 12 * s]], { fill: '#FFFFFF', lw: 3 });
    const hx = x + (95 + (writing ? Math.sin(t * 50) * 10 + (n % 4) * 8 : 0)) * s, hy = top + (writing ? Math.cos(t * 61) * 3 : 0) * s;
    pencil(hx - 4 * s, hy + 4 * s, 0.55 * s, -1.2);
    circle(hx, hy - 12 * s, 16 * s, { fill: PAL.skin, lw: 4 });
    circle(x - 60 * s, top - 8 * s, 15 * s, { fill: PAL.skin, lw: 4 });
  }

  function examFrame(t) {
    const a = shakeAmt(t), [sx, sy] = jitter(t, a);
    const n = s16(t);
    // tick: a tiny zoom kick on every sixteenth
    const tick = Math.exp(-f16(t) * 5) * 0.008 * (t >= T_BUILD ? 1 : 0);
    if (t < 103.636) {
      fillScreen('#24232B');
      camBegin(W / 2 + sx, H / 2 + sy, 1 + tick + seg(t, T_BUILD, 103.636) * 0.04, Math.sin(t * 61) * a * 0.0006);
      // the clock
      panel(36, 36, 700, 1008, seg(t, T_BUILD - 0.02, T_BUILD + 0.2), (w, h) => {
        examRoom(w, h);
        letter('시험 중', w / 2, 120, 70, '#FFFFFF', { lw: 8 });
        examClock(w / 2, h / 2 + 60, 290, t);
      }, -0.1);
      // the kid, sweating over the paper
      panel(772, 36, 1112, 520, seg(t, 102.27, 102.47), (w, h) => {
        examRoom(w, h);
        kidAtDesk(t, 900, 560, 0.62, 'glasses', false);
        kidAtDesk(t, 150, 560, 0.62, 'pony', false);
        kidAtDesk(t, 520, 734, 1.45, 'me', true);
      }, 0.12);
      // the answer card
      panel(772, 592, 1112, 452, seg(t, 102.73, 102.93), (w, h) => {
        ctx.fillStyle = '#C9A57A'; ctx.fillRect(0, 0, w, h);
        const [fx, fy] = omrFocus(t);
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(0.95, 0.95); ctx.translate(-clamp(fx, 400, 650), -clamp(fy, 220, 480));
        omrCard(t); omrPencil(t);
        ctx.restore();
      }, -0.12);
      camEnd();
    } else if (t < 104.091) {
      // full frame: the card, the pencil flying
      ctx.fillStyle = '#C9A57A'; fillScreen('#C9A57A');
      const [fx, fy] = omrFocus(t);
      camBegin(fx + sx + 40, fy + sy + 40, 1.9 + tick * 4 + seg(t, 103.636, 104.091) * 0.2, -0.08);
      omrCard(t); omrPencil(t);
      camEnd();
      speedLines(t, W / 2, H / 2, 0.5, '#FFFFFF', 40, 4);
    } else if (t < 104.545) {
      // full frame: the second hand
      fillScreen('#9EA1AE');
      camBegin(W / 2 + sx, H / 2 + sy + 120, 1.3 + seg(t, 104.091, 104.545) * 0.25 + tick * 4, 0.05);
      examClock(W / 2, H / 2 + 120, 560, t);
      camEnd();
    } else {
      // full frame: her eyes
      fillScreen('#B9BBC6');
      const s = 4.2, x = 960, y = 1880, fy = y - 272 * s;
      camBegin(x + sx, fy + sy + 20, 1 + seg(t, 104.545, 105) * 0.12 + tick * 4, 0);
      kid(x, y, s, { who: 'me', t, eyes: 'determined', mouth: 'flat', lookY: 0.3, shadow: false, blush: 0.2 });
      const dropY = fy + 40 + seg(t, 104.545, 105) * 160;
      smooth([[x + 330, dropY - 60], [x + 360, dropY + 10], [x + 330, dropY + 40], [x + 300, dropY + 10]], { fill: '#8FD3FF', lw: 7 });
      camEnd();
      speedLines(t, W / 2, H / 2 - 40, 0.7, '#FFFFFF', 56, 9);
    }
    // grey everything down as the pressure builds
    desat(0.35 + 0.35 * seg(t, T_BUILD, T_FREEZE));
    edgeGlow('#1A1820', 0.3 + 0.35 * seg(t, T_BUILD, T_FREEZE));
    void n;
  }

  function exam(t) {
    if (t < T_FREEZE) { examFrame(t); return; }
    // one frozen beat of silence, black and white
    KARAOKE.hidden = true;
    const k = seg(t, T_FREEZE, 105.45);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(1 + 0.02 * k + 0.06 * easeIn(seg(t, 105.3, 105.45)), 1 + 0.02 * k + 0.06 * easeIn(seg(t, 105.3, 105.45))); ctx.translate(-W / 2, -H / 2);
    examFrame(T_FREEZE - 0.004);
    ctx.restore();
    while (camDepth > 0) camEnd();
    desat(1);
    fillScreen('#FFFFFF', 0.08);
    edgeGlow('#000000', 0.5);
  }

  chapter('dday', 87.27, 105.45, [
    [87.27, ddayBoard],
    [90.91, adults],
    [94.55, rooftop],
    [98.18, dawnGrab],
    [101.82, (t) => exam(t)],
  ]);
})();
