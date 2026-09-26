// r4_top (36.36 – 53; the video ends at 52.51) · 4 · 1위
//
// 36.36  THE DROP: the counter in the middle turns to 1위 and explodes: a burst star, sunburst,
//        hearts flung out, confetti; the five jump. 38.18 a boom: shake, a second shock ring.
// 40.00  Back in the night room, warm lamp light: a phone on a tripod (● LIVE), the five hug and
//        cry, live hearts floating up from the phone.
// 43.64  A generic star cup drops in with a thud (44.09, on the beat), the five cheer around it.
//        45.45 boom: two rank boards slam in side by side, 러브 어택 1위 / Pretty Girl 2위.
// 47.27  Pastel dawn: the five walk toward us, hearts rising; at 50.0 they stop and the last
//        caption holds with the credit line to the end.
//
// Helpers from r3_viral.js: window.R34.
(() => {
  const { hud, heartStorm, capShade } = window.R34;
  const TD = 36.3636, B = 0.4545454545;

  // ---- bits ---------------------------------------------------------------------------------------

  /** Hearts flung out from (cx, cy) at time t0, falling back under gravity. */
  function heartBurst(t, t0, cx, cy, n, seed = 1, o = {}) {
    const age = t - t0;
    if (age < 0 || age > 3) return;
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * TAU, v = hrange(700, 1900, i, seed + 1) * (o.power ?? 1);
      const x = cx + Math.cos(a) * v * (1 - Math.exp(-age * 2.5)) / 2.5;
      const y = cy + Math.sin(a) * v * (1 - Math.exp(-age * 2.5)) / 2.5 + 260 * age * age;
      const r = hrange(18, 46, i, seed + 2) * (1 - clamp((age - 2.2) / 0.8));
      if (r <= 1) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(age * 4 + i) * 0.4);
      poly(heartPts(0, 0, r), { fill: [POP.pink, POP.rose, POP.lemon, POP.lav, POP.white][i % 5], stroke: POP.ink, lw: 4 });
      ctx.restore();
    }
  }

  /** An expanding ring after a hit. */
  function ring(t, t0, cx, cy, color = POP.white, len = 0.6, r1 = 900) {
    const k = (t - t0) / len;
    if (k < 0 || k > 1) return;
    ctx.save(); ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(cx, cy, 80 + easeOut(k) * r1, 0, TAU);
    ctx.strokeStyle = color; ctx.lineWidth = 40 * (1 - k) + 4; ctx.stroke();
    ctx.restore();
  }

  /** A generic cup with a star on it (not any real trophy). (x, y) = the bottom, ~560 tall at s = 1. */
  function trophy(x, y, s, t) {
    const gold = '#FFD45C', goldSh = '#E9A93A', goldLt = '#FFF1B0';
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-150, -70, 300, 70, 18, { fill: '#B79CFF', stroke: POP.ink, lw: 8 });          // base
    rrect(-110, -130, 220, 64, 14, { fill: '#9C80F0', stroke: POP.ink, lw: 8 });
    rrect(-120, -54, 240, 22, 8, { fill: goldLt, stroke: null, alpha: 0.5 });
    poly([[-34, -130], [34, -130], [22, -220], [-22, -220]], { fill: goldSh, stroke: POP.ink, lw: 8 }); // stem
    for (const d of [-1, 1]) {                                                               // handles
      ctx.beginPath(); ctx.ellipse(d * 150, -420, 70, 80, 0, d < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, d < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
      ctx.strokeStyle = POP.ink; ctx.lineWidth = 42; ctx.stroke(); ctx.strokeStyle = gold; ctx.lineWidth = 26; ctx.stroke();
    }
    smooth([[-170, -540], [170, -540], [150, -380], [70, -250], [0, -225], [-70, -250], [-150, -380]], { fill: gold, stroke: POP.ink, lw: 9 }); // cup
    smooth([[40, -530], [165, -530], [140, -390], [70, -270], [60, -330]], { fill: goldSh, stroke: null, alpha: 0.55 });
    smooth([[-140, -520], [-100, -520], [-100, -400], [-130, -420]], { fill: goldLt, stroke: null, alpha: 0.8 });
    ell(0, -540, 170, 26, { fill: '#E9A93A', stroke: POP.ink, lw: 8 });
    poly(starShape(0, -400, 78, 0.45, 5, -Math.PI / 2 + Math.sin(t * 3) * 0.06), { fill: POP.pink, stroke: POP.ink, lw: 7 });
    ctx.restore();
    // glints
    for (let i = 0; i < 4; i++) {
      const k = frac(t * 0.9 + i * 0.27);
      sparkle(x + (hash(i, 3) - 0.5) * 360 * s, y - hrange(150, 600, i, 4) * s, 34 * s * Math.sin(k * Math.PI), '#FFFFFF', k);
    }
  }

  /** A rank board (HUD style): a song title and its rank. */
  function board(x, y, s, title, rank, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    const w = 460, h = 330;
    rrect(-w / 2, -h / 2, w, h, 48, { fill: mix(POP.night, POP.pink, o.flash ?? 0), stroke: POP.white, lw: 10, shadow: rgba(rank === 1 ? POP.lemon : POP.pink, 0.9), shadowBlur: 40 });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `30px ${FONT.round}`; ctx.fillStyle = POP.rose; ctx.fillText('MELON TOP100', 0, -h / 2 + 50);
    ctx.font = `58px ${FONT.round}`; ctx.fillStyle = POP.white; ctx.fillText(title, 0, -30);
    ctx.font = `128px ${FONT.bold}`; ctx.fillStyle = rank === 1 ? POP.lemon : POP.white;
    ctx.fillText(`${rank}위`, 0, 88);
    ctx.restore();
  }

  function pill(x, y, text, size, fill, color = POP.white) {
    ctx.save(); ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    rrect(x - tw / 2 - size * 0.5, y - size * 0.7, tw + size, size * 1.4, size * 0.7, { fill, stroke: POP.ink, lw: 6 });
    ctx.fillStyle = color; ctx.fillText(text, x, y + 2);
    ctx.restore();
  }

  // ---- 36.36: the drop -----------------------------------------------------------------------------

  function drop(t, lt) {
    const boom = 38.1818;
    const [sx, sy] = shakeXY(t, TD, 36, 0.5), [bx, by] = shakeXY(t, boom, 28, 0.45);
    fillScreen(lgrad(0, 0, 0, H, [[0, '#FFB3D6'], [0.55, '#FFD6A8'], [1, '#CDB8FF']]));
    camBegin(W / 2 - sx - bx, H / 2 - sy - by, 1 + 0.03 * pulse(t, 8));
    sunburst(W / 2, 880, rgba('#FFFFFF', 0.55), rgba(POP.lemon, 0.35), t * 0.35, 24, 2200);
    halftone(0, 1200, W, 720, '#FFFFFF', 0.25);
    glow(W / 2, 880, 900, POP.lemon, 0.45 + 0.2 * pulse(t));
    // the burst star behind the counter
    const k = clamp(lt / 0.25), bs = backOut(k) * (1 + 0.06 * pulse(t, 8)) + (t > boom ? 0.25 * Math.exp(-(t - boom) * 6) : 0);
    burstStar(W / 2, 880, 430 * bs, 16, POP.lemon, t * 0.4);
    burstStar(W / 2, 880, 330 * bs, 12, POP.pink, -t * 0.6);
    ring(t, TD, W / 2, 880, POP.white, 0.7, 1100);
    ring(t, TD + 0.12, W / 2, 880, POP.lemon, 0.7, 1000);
    ring(t, boom, W / 2, 880, POP.white, 0.6, 1100);
    // the five jump (landing on the beats)
    const jumping = lt < 3.2;
    squad(W / 2, 1650, 0.62, { t, spread: 290, pose: jumping ? 'jump' : 'cheer', mouth: 'open', sticker: true, bob: hop(t) * (jumping ? 0 : 0.5) });
    heartBurst(t, TD, W / 2, 880, 46, 3, { power: 1.2 });
    heartBurst(t, boom, W / 2, 880, 34, 9);
    camEnd();
    confetti(t, TD, { n: 120, burst: true, colors: [POP.pink, POP.lemon, POP.mint, POP.sky, POP.lav, POP.white] });
    heartStorm(t, 26, 0.8, { speed: 0.6 });
    // the counter: 1위, punched in on the drop and on the boom
    const punch = 0.9 * Math.exp(-lt * 7) + (t > boom ? 0.35 * Math.exp(-(t - boom) * 8) : 0);
    hud(t, 1, { x: W / 2 + Math.sin(t * 90) * 10 * Math.exp(-lt * 6), y: 880, scale: 1.65 + punch + 0.06 * pulse(t, 9), flash: Math.max(Math.exp(-lt * 4), 0.5 * pulse(t, 9)), glowC: POP.lemon });
    sfx('펑!', 200, 1130, 110, POP.lemon, lt, { life: 0.8, rot: -0.2 });
    sfx('쿵!', 880, 1150, 110, POP.pink, t - boom, { life: 0.7, rot: 0.2 });
    capShade(0.7, 700, '#FFF6FB');
    popTag(t, TD + 0.15, 40.0, '멜론 TOP100 1위', { size: 108, y: 330, bgs: [POP.lemon] });
    popSub(t, TD + 0.6, 40.0, '2026년 7월 8일 · 발매 1년 11개월 만', { y: 490, size: 56 });
    flash(Math.exp(-lt * 5));
    flash(0.5 * Math.exp(-Math.max(0, t - boom) * 9) * (t > boom ? 1 : 0), POP.lemon);
  }

  // ---- 40.00: live, in the night room --------------------------------------------------------------

  function tripodPhone(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // legs down to the floor from the head at (0, 0)
    for (const [dx, dy] of [[-120, 470], [110, 470], [10, 440]]) stroke([[0, 20], [dx, dy]], '#4A4060', 14, { olw: 8, ink: POP.ink });
    rrect(-14, -10, 28, 60, 8, { fill: '#4A4060', stroke: POP.ink, lw: 5 });
    // the phone seen from behind and a little to the side: its back, the camera, a glow spilling from the screen
    ctx.save(); ctx.rotate(-0.05);
    glow(-160, -150, 260, '#BFE3FF', 0.35);
    rrect(-95, -330, 190, 340, 34, { fill: '#F1E6FF', stroke: POP.ink, lw: 7 });
    rrect(-95, -330, 26, 340, 14, { fill: '#CFE8FF', stroke: null, alpha: 0.9 });
    rrect(10, -300, 60, 90, 20, { fill: '#D8C8F5', stroke: POP.ink, lw: 5 });
    circle(40, -278, 14, { fill: '#2A2238', stroke: null }); circle(40, -238, 14, { fill: '#2A2238', stroke: null });
    ctx.restore();
    ctx.restore();
  }

  function live(t, lt) {
    // the night room, lit warm by a lamp
    fillScreen(lgrad(0, 0, 0, H, [[0, '#3A2E5E'], [0.62, '#5C4478'], [0.63, '#7A5A7E'], [1, '#5E466A']]));
    // window with the moon and stars
    rrect(560, 560, 400, 460, 30, { fill: '#26204A', stroke: '#F5D9C0', lw: 18 });
    ctx.save(); rrectPath(560, 560, 400, 460, 30); ctx.clip();
    circle(820, 680, 60, { fill: '#FFF3C4', stroke: null }); glow(820, 680, 200, '#FFF3C4', 0.4);
    for (let i = 0; i < 14; i++) sparkle(hrange(580, 940, i, 1), hrange(580, 1000, i, 2), 8 + 6 * Math.sin(t * 3 + i) ** 2, '#FFFFFF');
    ctx.restore();
    stroke([[760, 560], [760, 1020]], '#F5D9C0', 14, { ink: null }); stroke([[560, 790], [960, 790]], '#F5D9C0', 14, { ink: null });
    // fairy lights along the wall
    for (let i = 0; i < 13; i++) {
      const x = 20 + i * 86, y = 470 + Math.sin(i * 0.9) * 26 + 18 * Math.sin(i / 12 * Math.PI);
      glow(x, y, 50, POP.lemon, 0.4 + 0.25 * Math.sin(t * 4 + i));
      circle(x, y, 10, { fill: '#FFF1B0', stroke: null });
    }
    stroke(Array.from({ length: 13 }, (_, i) => [20 + i * 86, 470 + Math.sin(i * 0.9) * 26 + 18 * Math.sin(i / 12 * Math.PI) - 10]), '#2B1B3D', 3, { ink: null, smooth: true, alpha: 0.6 });
    // the floor lamp, left
    stroke([[110, 1640], [110, 900]], '#E8D2B8', 16, { olw: 8, ink: POP.ink });
    ell(110, 1640, 70, 18, { fill: '#E8D2B8', stroke: POP.ink, lw: 6 });
    poly([[40, 900], [180, 900], [150, 790], [70, 790]], { fill: '#FFE1A8', stroke: POP.ink, lw: 7 });
    // a blanket and pillows on the floor
    smooth([[-60, 1540], [400, 1480], [900, 1510], [1140, 1560], [1140, 1760], [-60, 1760]], { fill: '#F3B6CE', stroke: POP.ink, lw: 7 });
    for (let i = 0; i < 6; i++) stroke([[i * 200 - 40, 1580], [i * 200 + 60, 1740]], '#F9CFE0', 10, { ink: null });
    // the warm light pooling over everything
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgrad(160, 860, 0, 1300, [[0, rgba('#FFB070', 0.55)], [0.35, rgba('#FF9A7A', 0.22)], [1, rgba('#FF9A7A', 0)]]);
    ctx.fillRect(0, 0, W, H); ctx.restore();
    glow(110, 860, 220, '#FFE6A8', 0.9);
    // the five hug and cry (a gentle sway together, on the beat)
    const sw = Math.sin(t * Math.PI / (2 * B)) * 8;
    ctx.save(); ctx.translate(sw, 0);
    squad(460, 1570, 0.74, { t, spread: 190, poses: ['hug', 'cry', 'hug', 'cry', 'hug'], mouth: 'wobble', tears: 1, sticker: true, bob: hop(t) * 0.25, order: [3, 0, 2, 1, 4] });
    ctx.restore();
    // warm rim on the group
    ctx.save(); ctx.globalCompositeOperation = 'soft-light';
    fillScreen(rgba('#FFB070', 0.35)); ctx.restore();
    // the phone on the tripod, right, with ● LIVE and hearts floating up from it
    tripodPhone(935, 1180, 0.8, t);
    for (let i = 0; i < 12; i++) {
      const f = frac(t * 0.45 + hash(i, 11));
      const x = 935 + Math.sin(f * 7 + i) * 50 + (hash(i, 12) - 0.5) * 80, y = 880 - f * 520;
      poly(heartPts(x, y, 22 + 14 * hash(i, 13)), { fill: [POP.pink, POP.rose, POP.lemon, POP.white][i % 4], stroke: POP.ink, lw: 4, alpha: Math.min(1, (1 - f) * 2) * 0.95 });
    }
    const lk = clamp((lt - 0.2) / 0.25);
    if (lk > 0) {
      ctx.save(); ctx.translate(935, 870); ctx.scale(backOut(lk), backOut(lk));
      pill(0, 0, '● LIVE', 46, '#FF3B6B');
      ctx.restore();
      circle(935 - 64, 870, 9, { fill: '#FFFFFF', stroke: null, alpha: 0.4 + 0.6 * pulse(t, 3) });
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; petalsLight(t); ctx.restore();
    capShade(0.55, 720, '#2A2045');
    popTag(t, 40.2, 43.64, '“진짜 다\n리마인 덕분이다”', { size: 80, y: 300, bgs: [POP.white, POP.rose] });
    popSub(t, 40.9, 43.64, '— 1위 직후 깜짝 라이브에서', { y: 520, size: 50, color: '#FFE6B0' });
    flash(0.7 * Math.exp(-lt * 6), '#FFE6C8');
  }
  /** Soft floating warm motes. */
  function petalsLight(t) {
    for (let i = 0; i < 18; i++) {
      const y = H - frac(hash(i, 21) + t * 0.05) * H, x = hash(i, 22) * W + Math.sin(t + i) * 30;
      circle(x, y, 4 + 4 * hash(i, 23), { fill: rgba('#FFE6A8', 0.5), stroke: null });
    }
  }

  // ---- 43.64: the cup, then two boards ------------------------------------------------------------

  function cup(t, lt) {
    const land = 44.0909, boom = 45.4545;
    const ab = t - boom;
    const [sx, sy] = shakeXY(t, land, 30, 0.4), [bx, by] = shakeXY(t, boom, 30, 0.45);
    fillScreen(lgrad(0, 0, 0, H, [[0, '#C9B2FF'], [0.6, '#FFC2DD'], [1, '#FFD6A8']]));
    camBegin(W / 2 - sx - bx, H / 2 - sy - by, 1);
    // stage light beams
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(t * 1.2 + i * 1.7) * 0.25, x0 = 120 + i * 280;
      ctx.save(); ctx.translate(x0, -40); ctx.rotate(a);
      ctx.fillStyle = lgrad(0, 0, 0, 1700, [[0, rgba('#FFFFFF', 0.35)], [1, rgba('#FFFFFF', 0)]]);
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(220, 1700); ctx.lineTo(-220, 1700); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // floor
    ctx.fillStyle = lgrad(0, 1380, 0, H, [[0, '#F7C6DC'], [1, '#E3B5F0']]); ctx.fillRect(-60, 1380, W + 120, 700);
    halftone(-60, 1380, W + 120, 540, '#FFFFFF', 0.3);
    // the cup: falls in, lands on the beat with a thud; after the boom it steps up and back
    const fall = seg(t, 43.64, land);
    const back = easeInOut(seg(t, boom, boom + 0.3));
    const cy = lerp(lerp(380, 1420, easeIn(fall)), 930, back);
    const sq = t > land ? 1 + 0.2 * Math.exp(-(t - land) * 10) * Math.cos((t - land) * 40) : 1;
    const cs = lerp(1.05, 0.62, back);
    if (t > land) {
      glow(W / 2, cy - 300 * cs, 560, POP.lemon, 0.45 + 0.15 * pulse(t));
      sunburst(W / 2, cy - 300 * cs, rgba('#FFFFFF', 0.28), rgba('#FFFFFF', 0), t * 0.4, 20, 1100);
    }
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(sq, 1 / sq); trophy(0, 0, cs, t); ctx.restore();
    if (t > land && t < land + 0.6) {
      for (let i = 0; i < 8; i++) {
        const k = (t - land) / 0.6, d = i < 4 ? -1 : 1;
        circle(W / 2 + d * (190 + k * 260 * hrange(0.6, 1.2, i, 2)), 1400 - k * 80 * hash(i, 3), 40 * (1 - k) * hrange(0.6, 1, i, 4), { fill: '#FFFFFF', stroke: POP.ink, lw: 4, alpha: 1 - k });
      }
    }
    ring(t, land, W / 2, 1200, POP.white, 0.5, 700);
    // the five cheer around it
    const c = t > land ? 1 : 0;
    if (c) {
      const up = backOut(clamp((t - land) / 0.3));
      ctx.save(); ctx.translate(0, (1 - up) * 400);
      const pos = [[130, 1660], [300, 1600], [780, 1600], [950, 1660]];
      const tb = 1 - back * 0.0;
      pos.forEach(([x, y], i) => chibi(x, y, 0.5 * tb, { t: t + i * 0.3, look: [0, 1, 3, 4][i], pose: i % 2 ? 'cheer' : 'jump', mouth: 'open', sticker: true, flip: i > 1, bob: hop(t) * 0.4 }));
      chibi(W / 2, 1690, 0.5, { t: t + 0.9, look: 2, pose: 'cheer', mouth: 'open', sticker: true, bob: hop(t) * 0.4 });
      ctx.restore();
    }
    // 45.45: two boards slam in side by side
    if (ab > 0) {
      heartBurst(t, boom, W / 2, 1130, 36, 17);
      for (const [d, title, rank] of [[-1, '러브 어택', 1], [1, 'Pretty Girl', 2]]) {
        const k = clamp((ab - (d > 0 ? 0.08 : 0)) / 0.22);
        const x = W / 2 + d * 262 + d * (1 - easeOut(k)) * 900, s = 0.98 * (1 + 0.25 * (1 - easeOut(clamp((ab - 0.22) / 0.2))) * (k >= 1 ? 1 : 0));
        board(x, 1130, s, title, rank, { rot: d * 0.04, flash: 0.6 * Math.exp(-ab * 5) });
      }
    }
    camEnd();
    confetti(t, land, { n: 70, burst: true, colors: [POP.lemon, POP.pink, POP.white, POP.mint] });
    sfx('쿵!', 830, 1000, 120, POP.lemon, t - land, { life: 0.7, rot: 0.18 });
    sfx('쾅!', 540, 1560, 110, POP.pink, ab, { life: 0.6, rot: -0.1 });
    capShade(0.6, 720);
    popTag(t, 43.8, boom, '7월, 지상파\n음악방송 첫 1위', { size: 100, y: 330, bgs: [POP.white, POP.lemon] });
    popSub(t, boom + 0.05, 47.27, '9월, 멜론 TOP100 1·2위 나란히', { y: 420, size: 72 });
    flash(0.6 * Math.exp(-Math.max(0, ab) * 8) * (ab > 0 ? 1 : 0));
    flash(0.5 * Math.exp(-lt * 8), '#FFFFFF');
  }

  // ---- 47.27: the dawn walk, and the end --------------------------------------------------------

  function dawn(t, lt) {
    const TS = 50.0, fade = seg(t, 50.91, 52.5);
    const walkK = seg(t, 47.27, TS), stopped = t >= TS;
    // pastel dawn sky, the sun just up behind them
    fillScreen(lgrad(0, 0, 0, H, [[0, '#A9B8FF'], [0.3, '#D8B8FF'], [0.5, '#FFC2DA'], [0.62, '#FFD9B8'], [1, '#FFE9D6']]));
    const sunY = 1060 - 60 * easeOut(seg(t, 47.27, 52.5));
    glow(W / 2, sunY, 900, '#FFE3B0', 0.8);
    circle(W / 2, sunY, 150, { fill: '#FFF4D6', stroke: null });
    ctx.save(); ctx.globalAlpha = 0.35;
    sunburst(W / 2, sunY, rgba('#FFFFFF', 0.35), rgba('#FFFFFF', 0), t * 0.08, 24, 1800);
    ctx.restore();
    // soft clouds
    for (let i = 0; i < 5; i++) {
      const x = ((hash(i, 31) * (W + 600) + t * 18 * (1 + i % 2)) % (W + 600)) - 300, y = hrange(560, 900, i, 32);
      smooth(blobPts(x, y, hrange(80, 140, i, 33), 9, 0.2, i, 0), { fill: rgba('#FFFFFF', 0.55), stroke: null });
    }
    // far hills and the road
    smooth([[-100, 1120], [200, 1060], [460, 1100], [720, 1050], [1180, 1110], [1180, 1300], [-100, 1300]], { fill: '#E7B8E8', stroke: null });
    ctx.fillStyle = lgrad(0, 1120, 0, H, [[0, '#F6C8DF'], [1, '#FFE3EE']]); ctx.fillRect(-20, 1120, W + 40, H);
    poly([[500, 1120], [580, 1120], [980, H], [100, H]], { fill: '#FFF3F8', stroke: null, alpha: 0.8 });
    halftone(0, 1300, W, 620, '#FFFFFF', 0.25);
    // the five walk toward us (legs swing slowly, a step on each beat), then stop
    const s = lerp(0.52, 0.8, easeOut(walkK)), gy = lerp(1320, 1455, easeOut(walkK));
    const tt = stopped ? t : t * 0.55;
    ctx.save(); ctx.globalAlpha = 0.18;
    for (let i = 0; i < 5; i++) ell(W / 2 + (i - 2) * 225 * s, gy + 6, 80 * s, 16 * s, { fill: '#7A4E8A', stroke: null });
    ctx.restore();
    squad(W / 2, gy, s, { t: tt, spread: 225, pose: stopped ? 'stand' : 'run', mouth: 'smile', sticker: true, bob: stopped ? 0.15 * Math.sin(t * 2) ** 2 : hop(t) * 0.45 });
    // warm backlight on the group
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; fillScreen(rgba('#FFD6A0', 0.3)); ctx.restore();
    hearts(t, 16, 0, 400, W, 1000, { scale: 1.1, alpha: 0.85 });
    for (let i = 0; i < 10; i++) {
      const k = frac(t * 0.5 + hash(i, 41));
      sparkle(hrange(60, 1020, i, 42), hrange(500, 1300, i, 43), 26 * Math.sin(k * Math.PI), '#FFFFFF', k);
    }
    capShade(0.5, 700, '#FFF0F8');
    popTag(t, 47.45, TS, '“이제 어디서나\n당당하게 걷겠다”', { size: 92, y: 330, bgs: [POP.white, POP.lemon] });
    popTag(t, TS + 0.05, 99, '멈추지 않으면,\n노래는 닿는다', { size: 104, y: 330, bgs: [POP.white, POP.rose], colors: [POP.ink, POP.ink] });
    // the credit, small, above the Shorts UI
    const ck = seg(t, TS + 0.3, TS + 0.9);
    if (ck > 0) {
      ctx.save(); ctx.globalAlpha = ck;
      ctx.font = `38px ${FONT.round}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const txt = '영상·음악 · Claude Code 로 만들었어요 (원곡 미사용)';
      ctx.lineWidth = 10; ctx.strokeStyle = rgba(POP.ink, 0.85); ctx.strokeText(txt, W / 2, 1540);
      ctx.fillStyle = POP.white; ctx.fillText(txt, W / 2, 1540);
      ctx.restore();
    }
    // the music fades: the light softens
    if (fade > 0) fillScreen(rgba('#FFF4EA', 0.12 * ease(fade)));
    flash(0.8 * Math.exp(-lt * 5), '#FFF4EA');
  }

  chapter('top', 36.36, 53, [[36.36, drop], [40.0, live], [43.6364, cup], [47.2727, dawn]]);
})();
