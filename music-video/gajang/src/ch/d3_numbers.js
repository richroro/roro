// Chapter 3 · 숫자들 (67.20 – 96.00): the numbers of a working day. A graph that only goes down
// and 부장님's sigh blowing the papers away, one 결재 stamp that eats the whole day, bills circling
// the kitchen table at night, stars over an empty office, a creaking stretch, and the last train.
(() => {
  const T_MEET = 67.2, T_STAMP = 72.0, T_CALC = 76.8, T_STARS = 81.6, T_STRETCH = 86.4, T_TRAIN = 91.2;
  const HIT = 73.8;

  // ---- private helpers -------------------------------------------------------------------------

  /** Fluorescent tubes along the ceiling. on 0..1. */
  function tubes(y, xs, on = 1, w = 300) {
    for (const x of xs) {
      stroke([[x + 40, y - 80], [x + 40, y]], '#9AA3B5', 4, { ink: null });
      stroke([[x + w - 40, y - 80], [x + w - 40, y]], '#9AA3B5', 4, { ink: null });
      rrect(x, y, w, 22, 10, { fill: on > 0.5 ? '#FBFFFE' : '#7C84A8', lw: 4 });
      if (on > 0) glow(x + w / 2, y + 30, 420, '#E6FFF6', 0.3 * on);
    }
  }

  /** A sheet of A4, centred at the origin of the current transform. */
  function sheetPaper(s = 1, seed = 0) {
    ctx.save(); ctx.scale(s, s);
    rrect(-40, -54, 80, 108, 4, { fill: '#FFFFFF', lw: 3.5 });
    rrect(-28, -42, 40, 7, 2, { fill: hash(seed, 2) > 0.5 ? '#6FB3E0' : '#F2545B', stroke: null });
    for (let l = 0; l < 5; l++) rrect(-28, -26 + l * 14, 56 - hash(seed, l) * 22, 5, 2, { fill: '#C9CED8', stroke: null });
    ctx.restore();
  }

  /** A flat hand with the thumb up (or a fist, when up = 0). */
  function hand(x, y, s, rot = 0, thumb = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    if (thumb > 0) rrect(-9, -40 * thumb, 18, 40 * thumb, 9, { fill: PAL.skin, lw: 4 });
    rrect(-20, -12, 40, 34, 12, { fill: PAL.skin, lw: 4.5 });
    ctx.restore();
  }

  /** A few dad hairs lifting in a wind blowing to the left (world coords at the head top). */
  function windHair(x, y, s, k, t) {
    if (k <= 0) return;
    for (let i = 0; i < 4; i++) {
      const bx = x + (-40 + i * 28) * s, by = y + (4 + Math.abs(i - 1.5) * 6) * s;
      const w1 = Math.sin(t * 38 + i * 1.7) * 10 * s, w2 = Math.sin(t * 45 + i) * 14 * s;
      stroke([[bx, by], [bx - 34 * s * k, by - 26 * s * k + w1], [bx - 80 * s * k, by - 18 * s * k + w2]], '#2B2733', 11 * s, { smooth: true, olw: 7 * s });
    }
  }

  /** A clipboard with an approval form (결재란: 담당 / 과장 / 부장), stamped when k > 0. */
  function approvalBoard(x, y, s, rot, stampK) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-100, -130, 200, 260, 14, { fill: '#8A5530', lw: 5 });
    rrect(-86, -110, 172, 228, 5, { fill: '#FFFFFF', lw: 4 });
    rrect(-34, -144, 68, 30, 8, { fill: '#B9C1D0', lw: 4 });
    letter('기안서', -40, -84, 26, PAL.ink, { font: 'round', lw: 0, shadow: null });
    for (let l = 0; l < 6; l++) rrect(-70, 20 + l * 15, 140 - hash(l, 4) * 50, 6, 2, { fill: '#C9CED8', stroke: null });
    // the approval boxes, top right
    const bx = -76, by = -58;
    for (let i = 0; i < 3; i++) {
      rrect(bx + i * 52, by, 52, 64, 0, { fill: '#FFFFFF', lw: 3 });
      stroke([[bx + i * 52, by + 18], [bx + i * 52 + 52, by + 18]], PAL.ink, 2.5, { ink: null });
      letter(['담당', '과장', '부장'][i], bx + i * 52 + 26, by + 10, 14, PAL.ink, { font: 'round', lw: 0, shadow: null });
    }
    // two little stamps already there
    for (let i = 0; i < 2; i++) {
      circle(bx + i * 52 + 26, by + 42, 15, { fill: null, stroke: '#E0484E', lw: 3 });
      circle(bx + i * 52 + 26, by + 42, 4, { fill: '#E0484E', stroke: null });
    }
    if (stampK > 0) {
      const k = clamp(stampK);
      ctx.save(); ctx.translate(bx + 130, by + 40); ctx.rotate(-0.18); ctx.scale(1 + (1 - k) * 0.6, 1 + (1 - k) * 0.6);
      ctx.globalAlpha *= k;
      circle(0, 0, 40, { fill: 'rgba(224,72,78,0.12)', stroke: '#E0484E', lw: 5 });
      letter('결재', 0, 2, 30, '#E0484E', { lw: 0, shadow: null });
      ctx.restore();
    }
    ctx.restore();
  }

  /** A rubber stamp, handle up, face at the origin. */
  function stampTool(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ell(0, -78, 24, 26, { fill: '#6B4432', lw: 4.5 });
    rrect(-10, -60, 20, 36, 4, { fill: '#8A5530', lw: 4 });
    rrect(-30, -28, 60, 22, 6, { fill: '#6B4432', lw: 4.5 });
    rrect(-26, -8, 52, 10, 3, { fill: '#E0484E', lw: 3.5 });
    ctx.restore();
  }

  /** A bill that flutters: a header stripe, a title, an amount. */
  function bill(x, y, s, rot, title, amount, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-110, -70, 220, 140, 8, { fill: '#FFFDF6', lw: 5 });
    rrect(-110, -70, 220, 40, 8, { fill: color, lw: 5 });
    letter(title, 0, -49, 28, '#FFFFFF', { font: 'round', lw: 5 });
    letter(amount, 0, 6, 34, PAL.ink, { lw: 0, shadow: null });
    rrect(-80, 36, 160, 6, 2, { fill: '#C9CED8', stroke: null });
    rrect(-80, 50, 100, 6, 2, { fill: '#C9CED8', stroke: null });
    ctx.restore();
  }

  function calculator(x, y, s, text, red) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-80, -100, 160, 200, 18, { fill: '#5B6378', lw: 5 });
    rrect(-64, -84, 128, 46, 6, { fill: '#C9E6C0', lw: 4 });
    ctx.font = `30px ${FONT.bold}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = red ? '#D8383E' : '#2A3A2A'; ctx.fillText(text, 56, -60);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      rrect(-62 + c * 32, -24 + r * 30, 26, 22, 6, { fill: c === 3 ? PAL.orange : '#E8EAF0', lw: 3 });
    }
    ctx.restore();
  }

  function deskLamp(x, y, s, on = 1, faceRight = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(faceRight ? s : -s, s);
    ell(0, 0, 60, 16, { fill: '#3E4A6E', lw: 5 });
    stroke([[0, -4], [-20, -150], [70, -220]], '#3E4A6E', 12, { olw: 8 });
    ctx.save(); ctx.translate(70, -220); ctx.rotate(0.6);
    poly([[-40, -20], [40, -20], [70, 50], [-70, 50]], { fill: '#F2C94C', lw: 5 });
    if (on > 0) ell(0, 50, 60, 12, { fill: '#FFF6C8', lw: 4 });
    ctx.restore();
    ctx.restore();
  }

  /** The night city skyline seen through a big window: silhouettes and a few lit windows. */
  function skyline(x0, x1, base, t, seed, col = '#141A3A', lit = 0.25) {
    let x = x0 - 40, i = 0;
    while (x < x1 + 40) {
      const w = 70 + hash(i, seed) * 110, h = 90 + hash(i, seed + 1) * 240;
      rrect(x, base - h, w, h + 20, 4, { fill: col, stroke: null });
      for (let r = 0; r < Math.floor(h / 34); r++) for (let c = 0; c < Math.floor(w / 26); c++) {
        if (hash(i * 13 + r, c + seed) < lit) rrect(x + 8 + c * 26, base - h + 12 + r * 34, 12, 16, 2, { fill: '#FFD98A', stroke: null });
      }
      x += w + 8; i++;
    }
  }

  // ---- 67.20 회의실: a graph going down, and 부장님's sigh --------------------------------------

  function meeting(t, lt) {
    const inhale = seg(t, 68.3, 69.2), blowT = 69.3;
    const wind = kf(t, [[blowT, 0], [blowT + 0.25, 1], [70.7, 1], [71.3, 0.25]]);
    const [sx, sy] = shakeXY(t, blowT, 6, 0.6);
    camBegin(1000 + lt * 8 + sx, 520 + sy, 1.12 + lt * 0.012);
    // room
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#D9E8E2', stroke: null });
    rrect(-200, -200, W + 400, 260, 0, { fill: '#C5D8D1', stroke: null });
    rrect(-200, 820, W + 400, 500, 0, { fill: '#9DB0B4', stroke: null });
    // window with the new morning behind 부장님
    const wx = 1260, wy = 150, ww = 620, wh = 470;
    rrect(wx, wy, ww, wh, 8, { fill: lgrad(0, wy, 0, wy + wh, [[0, '#9FD4F5'], [1, '#FFE3B0']]), lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    sun(wx + 470, wy + 150, 46);
    skyline(wx, wx + ww, wy + wh + 10, t, 7, '#B9C6DA', 0);
    ctx.restore();
    for (let i = 1; i < 4; i++) stroke([[wx + i * ww / 4, wy], [wx + i * ww / 4, wy + wh]], '#EEF4F2', 7, { olw: 5 });
    tubes(40, [150, 700, 1250], 1);
    // the projection screen, flapping in the wind
    const scrW = 740, scrX = 190, scrY = 130;
    ctx.save(); ctx.translate(scrX + scrW / 2, scrY);
    ctx.transform(1, 0, Math.sin(t * 16) * 0.05 * wind, 1, 0, 0);
    rrect(-scrW / 2 - 14, -16, scrW + 28, 26, 10, { fill: '#8A93A8', lw: 5 });
    rrect(-scrW / 2, 0, scrW, 440, 4, { fill: '#FAFCFB', lw: 5 });
    letter('3분기 실적', -scrW / 2 + 130, 44, 40, PAL.ink, { lw: 0, shadow: null });
    // axes and the line, drawn as the meeting goes
    const ax = -scrW / 2 + 70, ay = 390;
    stroke([[ax, 80], [ax, ay], [scrW / 2 - 40, ay]], '#8A93A8', 5, { ink: null });
    const vals = [0.25, 0.32, 0.28, 0.45, 0.42, 0.6, 0.72, 0.9];
    const n = vals.length, draw = seg(t, 67.4, 68.9) * (n - 1);
    const pts = [];
    for (let i = 0; i <= Math.floor(draw) && i < n; i++) pts.push([ax + 40 + i * 82, 100 + vals[i] * 270]);
    if (draw < n - 1) {
      const i = Math.floor(draw), k = draw - i;
      pts.push([ax + 40 + (i + k) * 82, 100 + lerp(vals[i], vals[i + 1], k) * 270]);
    }
    if (pts.length > 1) stroke(pts, '#E0484E', 9, { ink: null });
    for (let i = 0; i < pts.length; i++) circle(pts[i][0], pts[i][1], 9, { fill: '#E0484E', stroke: null });
    const arrowK = seg(t, 68.9, 69.2);
    if (arrowK > 0) {
      ctx.save(); ctx.translate(ax + 40 + 7 * 82 + 30, 360); ctx.scale(backOut(arrowK), backOut(arrowK));
      poly([[-26, -30], [26, -30], [0, 14]], { fill: '#E0484E', lw: 4 });
      ctx.restore();
      letter('-32%', ax + 460, 150, 52, '#E0484E', { pop: arrowK, rot: 0.08 });
    }
    ctx.restore();

    // the people behind the table
    const bossX = 1520, dadX = 930, cwX = 520;
    person(cwX, 900, 0.9, { role: 'coworker', t, turn: -0.3, lookX: -1, eyes: wind > 0.3 ? 'closed' : 'open', mouth: wind > 0.3 ? 'wavy' : 'flat', headRot: -wind * 0.1 });
    windHair(cwX - 6, 900 - 0.9 * 0.98 * 452, 0.9, wind * 0.8, t + 1);
    const dm = t < 68.4 ? { eyes: 'open', mouth: 'flat' } : t < blowT ? { eyes: 'open', mouth: 'wavy', emote: 'sweat', emoteK: seg(t, 68.4, 68.7) }
      : { eyes: 'closed', mouth: 'wavy' };
    person(dadX, 905, 0.95, { role: 'dad', t, turn: -0.2 + wind * 0.2, lookX: t < 69 ? -1 : 1, lookY: -0.3, headRot: -wind * 0.12, ...dm });
    windHair(dadX - 20 - wind * 30, 905 - 0.95 * 456, 0.95, wind, t);
    // 부장님: breathes in, then lets it all out
    const bsq = t < blowT ? -0.07 * ease(inhale) : lerp(-0.07, 0.05, easeOut(seg(t, blowT, blowT + 0.3))) * (1 - seg(t, 70.8, 71.6));
    const bm = t < 68.3 ? { eyes: 'open', mouth: 'flat', brows: 'worried' } : t < blowT ? { eyes: 'closed', mouth: 'flat', brows: 'worried' }
      : t < 70.9 ? { eyes: 'closed', mouth: 'o', brows: 'worried' } : { eyes: 'open', mouth: 'sad', brows: 'worried' };
    person(bossX, 905, 1.0, { role: 'boss', t, turn: -0.55, lookX: -1, sq: bsq, dy: inhale * 6 * (t < blowT ? 1 : 0), aR: 0.5, eR: 1.6, aL: 0.25, ...bm });

    // the table in front of everyone
    poly([[300, 700], [1560, 700], [1700, 800], [160, 800]], { fill: '#E9E4DA', lw: 6 });
    rrect(150, 796, 1560, 40, 10, { fill: '#B8AE9E', lw: 6 });
    for (const lx of [260, 1600]) rrect(lx - 14, 836, 28, 200, 6, { fill: '#8A93A8', lw: 5 });
    // coffee cups
    for (const [cx, cy] of [[640, 722], [1180, 730]]) {
      rrect(cx - 26, cy - 44, 52, 50, 10, { fill: '#FFFFFF', lw: 4.5 });
      stroke([[cx + 26, cy - 34], [cx + 42, cy - 26], [cx + 26, cy - 12]], '#FFFFFF', 6, { smooth: true, olw: 8 });
    }
    // papers: lying on the table until the wind front reaches them
    const front = x => blowT + (1470 - x) / 1700;
    for (let i = 0; i < 13; i++) {
      const x0 = 360 + hash(i, 1) * 1100, y0 = 718 + hash(i, 2) * 60;
      const tl = front(x0), age = t - tl;
      ctx.save();
      if (i === 0) {
        // this one ends up on dad's face
        const hx = dadX - 5, hy = 905 - 0.95 * 370;
        const k = easeOut(seg(t, 70.35, 70.75));
        if (age <= 0) { ctx.translate(x0, y0); ctx.scale(1, 0.35); }
        else if (k <= 0) { ctx.translate(x0 - age * 700, y0 - age * 900); ctx.rotate(age * 6); }
        else {
          const fx = x0 - (70.35 - tl) * 700, fy = y0 - (70.35 - tl) * 900;
          ctx.translate(lerp(fx, hx, k), lerp(fy, hy, k) + Math.sin(t * 18) * 3 * wind);
          ctx.rotate(lerp((70.35 - tl) * 6, 0.12, k) + Math.sin(t * 14) * 0.04);
          ctx.scale(1.35, 1.35);
        }
        sheetPaper(1.2, i);
      } else if (age <= 0) {
        ctx.translate(x0, y0); ctx.rotate(hash(i, 3) - 0.5); ctx.scale(1, 0.35); sheetPaper(0.9, i);
      } else {
        const sp = 0.7 + hash(i, 4) * 0.8;
        const x = x0 - age * 1300 * sp, y = y0 - age * (250 + hash(i, 5) * 500) + Math.sin(age * 7 + i) * 50 + age * age * 60;
        if (x > -200) {
          ctx.translate(x, y); ctx.rotate(age * (3 + hash(i, 6) * 6) * (i % 2 ? 1 : -1));
          ctx.scale(1, Math.cos(age * (6 + hash(i, 7) * 6) + i)); sheetPaper(0.9, i);
        }
      }
      ctx.restore();
    }
    // the wind itself
    if (wind > 0) {
      ctx.save(); ctx.globalAlpha = 0.7 * wind;
      for (let i = 0; i < 16; i++) {
        const y = 320 + hash(i, 11) * 420, len = 160 + hash(i, 12) * 260, sp = 1800 + hash(i, 13) * 900;
        const x = 1440 - frac(hash(i, 14) + (t - blowT) * sp / 1500) * 1500;
        stroke([[x, y], [x + len * 0.5, y - 12], [x + len, y]], '#FFFFFF', 5, { ink: null, smooth: true });
      }
      ctx.restore();
    }
    sfx('후—', bossX - 250, 470, 130, '#FFFFFF', t - blowT, { life: 1.6, font: 'round', rot: -0.08, color2: '#5B8FA0' });
    camEnd();
    // in from the sunrise of the chapter before
    flash((1 - lt / 0.35) * 0.85, '#FFF4D6');
  }

  // ---- 72.00 결재: one stamp, and the day is gone -------------------------------------------------

  function stamp(t, lt) {
    const dayK = seg(t, 74.3, 76.3);          // morning -> dusk -> night
    const nightK = seg(t, 75.2, 76.3);
    const push = kf(t, [[72.0, 0], [73.1, 0], [73.6, 1], [74.3, 1], [75.0, 0]], easeInOut);
    const [sx, sy] = shakeXY(t, HIT, 22, 0.4);
    const BX = 1080, BY = 600;
    camBegin(lerp(980, BX + 20, push) + sx, lerp(520, BY + 10, push) + sy, lerp(1.0, 1.9, push));
    // the office
    const wall = mix(mix('#E6E0D4', '#E8B892', seg(dayK, 0.2, 0.5)), '#3A3F6E', nightK);
    rrect(-200, -200, W + 400, H + 400, 0, { fill: wall, stroke: null });
    rrect(-200, 860, W + 400, 500, 0, { fill: mix('#A89C8C', '#2E2B50', nightK), stroke: null });
    // window: the sky runs through the whole day
    const wx = 1010, wy = 110, ww = 860, wh = 520;
    const top = dayK < 0.5 ? mix('#8FD3FF', '#FF9A6A', dayK * 2) : mix('#FF9A6A', '#141A46', (dayK - 0.5) * 2);
    const bot = dayK < 0.5 ? mix('#DFF3FF', '#FFD08A', dayK * 2) : mix('#FFD08A', '#3B3478', (dayK - 0.5) * 2);
    rrect(wx, wy, ww, wh, 8, { fill: lgrad(0, wy, 0, wy + wh, [[0, top], [1, bot]]), lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    if (nightK > 0) { ctx.save(); ctx.globalAlpha = nightK; stars(t, 40, 5, 1, wy + wh); ctx.restore(); }
    const sunA = lerp(-0.4, 3.6, dayK);
    sun(wx + ww / 2 + Math.cos(sunA) * 320 * -1 + 0, wy + 110 + Math.sin(Math.min(sunA, Math.PI)) * -0 + dayK * 520, 50, dayK > 0.3 ? '#FF8A4A' : PAL.sun);
    if (nightK > 0.2) { ctx.save(); ctx.globalAlpha = seg(nightK, 0.2, 1); moon(wx + 180, wy + 120, 40); ctx.restore(); }
    skyline(wx, wx + ww, wy + wh + 10, t, 3, mix('#B6C2D8', '#161B3E', dayK), nightK * 0.4);
    ctx.restore();
    stroke([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], '#EEF0F4', 8, { olw: 5 });
    // blinds pulled half-way
    rrect(wx - 10, wy - 10, ww + 20, 70, 6, { fill: mix('#F4F0E6', '#555A80', nightK), lw: 5 });
    // the clock whirling round
    const hr = lerp(9.5, 21.5, easeInOut(dayK));
    const cX = 560, cY = 230;
    wallClock(cX, cY, 80, Math.floor(hr), frac(hr) * 60);
    if (dayK > 0.02 && dayK < 0.98) {
      ctx.save(); ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) {
        const a0 = t * 9 + i * TAU / 3;
        ctx.beginPath(); ctx.arc(cX, cY, 104, a0, a0 + 0.9); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.restore();
    }
    // a potted plant that grows a bit taller as the day goes (it has been that long)
    rrect(180, 760, 110, 110, 14, { fill: '#C9745A', lw: 5 });
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45, len = 150 + dayK * 60;
      ctx.save(); ctx.translate(235, 770); ctx.rotate(a);
      ell(0, -len / 2, 22, len / 2, { fill: PAL.leaf, lw: 4.5 });
      ctx.restore();
    }

    // 부장님 behind his desk, fading out as the hours pass
    const windup = seg(t, 72.9, 73.55), slam = seg(t, 73.62, HIT);
    let aL = 0.3, eL = 0.3;
    if (t >= 72.9 && t < 73.62) { aL = lerp(0.3, 2.7, easeOut(windup)); eL = lerp(0.3, 0.6, windup); }
    else if (t >= 73.62 && t < 74.4) { aL = lerp(2.7, 1.62, easeIn(slam)); eL = lerp(0.6, 0.1, slam); }
    else if (t >= 74.4) { aL = lerp(1.62, 0.3, seg(t, 74.4, 74.8)); eL = 0.3; }
    const bossA = 1 - seg(t, 75.2, 76.0);
    if (bossA > 0) {
      person(1380, 900, 1.0, {
        role: 'boss', t, turn: -0.5, lookX: -1, alpha: bossA, aL, eL, aR: 0.3,
        eyes: t < 72.9 ? 'sleepy' : t < HIT ? 'determined' : 'happy', mouth: t < HIT ? 'flat' : 'smile', brows: t < HIT ? 'angry' : undefined,
        holdL: (x, y, a) => { if (t < 73.62 || t >= 74.35) stampTool(x, y, 1.1, Math.PI + a); },
      });
    }
    // the desk
    poly([[960, 700], [1800, 700], [1860, 780], [900, 780]], { fill: '#8A5530', lw: 6 });
    rrect(900, 776, 960, 200, 8, { fill: '#6B4432', lw: 6 });
    rrect(1500, 650, 200, 54, 6, { fill: '#2E3A66', lw: 4 });
    letter('부장', 1600, 677, 34, PAL.gold, { lw: 0, shadow: null });
    rrect(1060, 668, 150, 36, 5, { fill: '#FFFFFF', lw: 4 });
    rrect(1070, 640, 130, 32, 5, { fill: '#F4F0E6', lw: 4 });
    if (nightK > 0) glow(1400, 700, 380, '#FFD98A', 0.3 * nightK);

    // dad, holding out the board, and frozen there all day
    const bow = kf(t, [[72.0, 0.02], [72.5, 0.14], [HIT, 0.14], [HIT + 0.15, 0.2], [74.2, 0.12]]);
    const dm = t < HIT ? { eyes: 'open', mouth: 'flat', lookX: 1, lookY: -0.4 }
      : t < 76.0 ? { eyes: 'happy', mouth: 'grin', blush: true }
        : { eyes: 'dot', mouth: 'o', emote: 'sweat', emoteK: seg(t, 76.0, 76.25) };
    const hitSq = t >= HIT ? Math.exp(-(t - HIT) * 10) * 0.08 : 0;
    person(770, 975, 1.05, { role: 'dad', t, rot: bow, turn: 0.45, aR: 2.5, eR: -0.6, aL: 0.3, eL: 0.3, sq: hitSq, ...dm });
    ctx.save(); ctx.translate(0, t >= HIT ? Math.exp(-(t - HIT) * 12) * 14 : 0);
    approvalBoard(BX, BY, 0.95, 0.06, seg(t, HIT, HIT + 0.08));
    // dad's hand on the board edge
    circle(BX - 92, BY + 36, 17, { fill: PAL.skin, lw: 4.5 });
    ctx.restore();
    if (t >= HIT && t < HIT + 0.6) {
      const a = t - HIT;
      ctx.save(); ctx.globalAlpha = 1 - a / 0.6;
      for (let i = 0; i < 10; i++) {
        const an = i / 10 * TAU, r0 = 60 + a * 300, r1 = 90 + a * 420;
        stroke([[BX + 30 + Math.cos(an) * r0, BY - 20 + Math.sin(an) * r0], [BX + 30 + Math.cos(an) * r1, BY - 20 + Math.sin(an) * r1]], PAL.gold, 7, { ink: null });
      }
      ctx.restore();
    }
    // the stamp itself comes down onto the 부장 box, in front of the board
    if (t >= 73.62 && t < 74.35) {
      const lift = t < HIT ? (1 - easeIn(slam)) * 130 : easeOut(seg(t, 74.0, 74.35)) * 130;
      const squash = t >= HIT ? Math.exp(-(t - HIT) * 14) * 0.15 : 0;
      ctx.save(); ctx.translate(BX + 52, BY - 14 - lift); ctx.scale(1 + squash, 1 - squash);
      stampTool(0, 0, 1.1, 0);
      circle(0, -90, 20, { fill: '#F7CFB0', lw: 4.5 });
      ctx.restore();
    }
    sfx('쾅!', BX + 150, BY - 150, 110, '#FF5A5A', t - HIT, { life: 0.9, rot: 0.12 });
    // night: the room light is off but for the desk
    if (nightK > 0) fillScreen('#141838', nightK * 0.35);
    camEnd();
  }

  // ---- 76.80 식탁: the calculator and the bills ---------------------------------------------------

  const BILLS = [['대출이자', '₩ 1,280,000', '#E0484E'], ['학원비', '₩ 870,000', '#4E8EF7'], ['관리비', '₩ 312,400', '#3FA66A']];
  const DIGITS = ['0', '3', '7', '₩', '%', '+', '−', '×', '9', '5', '=', '1', '8', '2', '4', '6'];

  function calc(t, lt) {
    camBegin(1000, 560 - lt * 6, 1.32 + lt * 0.016);
    // the kitchen at night
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#27305E', stroke: null });
    for (let i = 0; i < 14; i++) stroke([[i * 160 - 60, -100], [i * 160 - 60, 700]], '#2D3768', 26, { ink: null });
    // window with the moon
    rrect(180, 120, 360, 300, 8, { fill: lgrad(0, 120, 0, 420, [[0, '#0E1236'], [1, '#2B3370']]), lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(180, 120, 360, 300); ctx.clip();
    moon(430, 210, 42); stars(t, 12, 17, 1, H);
    ctx.restore();
    stroke([[360, 120], [360, 420]], '#434C80', 8, { olw: 5 });
    // the fridge, with a crayon family drawing on it
    rrect(1530, 60, 330, 720, 24, { fill: '#C9D3E6', lw: 6 });
    stroke([[1530, 320], [1860, 320]], PAL.ink, 5, { ink: null });
    rrect(1560, 150, 14, 120, 6, { fill: '#9AA3B5', lw: 3 });
    ctx.save(); ctx.translate(1700, 470); ctx.rotate(0.05);
    rrect(-100, -80, 200, 160, 4, { fill: '#FFFDF4', lw: 4 });
    for (let i = 0; i < 4; i++) {
      const fx = -66 + i * 44, hgt = [70, 62, 48, 36][i];
      circle(fx, 40 - hgt, 14, { fill: null, stroke: ['#4E8EF7', '#F2545B', '#FF8FB1', '#FFC23D'][i], lw: 4 });
      stroke([[fx, 54 - hgt], [fx, 60]], ['#4E8EF7', '#F2545B', '#FF8FB1', '#FFC23D'][i], 4, { ink: null });
    }
    circle(0, -84, 9, { fill: PAL.red, lw: 3 });
    ctx.restore();
    // a lamp pool of warm light
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.fillStyle = rgrad(760, 650, 0, 720, [[0, 'rgba(255,214,140,0.85)'], [1, 'rgba(255,214,140,0)']]);
    ctx.beginPath(); ctx.moveTo(620, 360); ctx.lineTo(280, 790); ctx.lineTo(1500, 790); ctx.lineTo(820, 360); ctx.closePath(); ctx.fill();
    ctx.restore();

    // the bills go round him; the ones behind first
    const orbit = i => {
      const a = t * 0.8 + i * TAU / 3;
      return { x: 1000 + Math.cos(a) * 560, y: 500 + Math.sin(a) * 270, depth: Math.sin(a), rot: Math.sin(t * 2.2 + i * 2) * 0.22 };
    };
    const drawBill = i => {
      const o = orbit(i);
      bill(o.x, o.y + Math.sin(t * 3 + i) * 12, 0.95 + o.depth * 0.18, o.rot, ...BILLS[i]);
    };
    for (let i = 0; i < 3; i++) if (orbit(i).depth < 0) drawBill(i);

    // numbers drift up out of the calculator
    for (let i = 0; i < 16; i++) {
      const ph = frac(t * 0.45 + hash(i, 21));
      const x = 1000 + (hash(i, 22) > 0.5 ? 1 : -1) * (170 + hash(i, 24) * 420) + Math.sin(t * 1.3 + i) * 30, y = 700 - ph * 560;
      letter(DIGITS[i], x, y, 40 + hash(i, 23) * 44, i % 3 ? '#FFE6A8' : '#FFFFFF', { alpha: Math.sin(ph * Math.PI) * 0.9, rot: Math.sin(t + i) * 0.2, lw: 6 });
    }
    // dad at the table, jacket off, tie loose
    const sweat = seg(t, 79.6, 80.2), dropY = easeIn(seg(t, 80.4, 81.4)) * 110;
    const dm = t < 79.2 ? { eyes: 'determined', mouth: 'flat', lookX: 0.6, lookY: 1 }
      : t < 80.6 ? { eyes: 'wide', mouth: 'wavy', lookX: 0.6, lookY: 1 } : { eyes: 'spiral', mouth: 'wavy' };
    person(1000, 1010, 1.12, { role: 'dad', t, jacket: false, looseTie: true, aL: 0.2, aR: 0.2, bags: 0.7, turn: 0.15, ...dm });
    // his sweat drop, sliding down the temple
    if (sweat > 0) {
      const hx = 1000 + 96 * 1.12, hy = 1010 - 1.12 * 400 + dropY;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(backOut(sweat), backOut(sweat) * (1 + dropY / 400));
      smooth([[0, -24], [14, 6], [0, 18], [-14, 6]], { fill: '#8FD3FF', lw: 4 });
      circle(-4, 4, 4, { fill: '#FFFFFF', stroke: null });
      ctx.restore();
    }

    // table
    poly([[240, 760], [1720, 760], [1800, 830], [160, 830]], { fill: '#B87942', lw: 6 });
    rrect(150, 826, 1660, 300, 10, { fill: '#8A5530', lw: 6 });
    deskLamp(560, 790, 1.0, 1, true);
    // a mug, a pen, a stack of envelopes
    rrect(340, 720, 70, 70, 12, { fill: '#F2F0EA', lw: 4.5 });
    for (let i = 0; i < 3; i++) rrect(700 + i * 6, 776 - i * 12, 190, 16, 3, { fill: ['#FFFFFF', '#F4E8D0', '#DDEBFA'][i], lw: 3.5 });

    // the calculator and his tapping hands
    const tapN = Math.floor((t - T_CALC) / 0.3);
    const tapK = Math.exp(-frac((t - T_CALC) / 0.3) * 8);
    const display = t < 80.6 ? String(Math.floor(hash(tapN, 9) * 900000 + 100000 * (1 + tapN % 7))) : '-2130000';
    calculator(1190, 760, 1.0, display, t >= 80.6);
    const hx = 1170 + (tapN % 3) * 24, hy = 760 - 20 + tapK * 14 - 18;
    stroke([[1090, 740], [hx - 20, hy + 20]], '#F4F6FA', 30, { olw: 9 });
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.5);
    rrect(-8, -30, 16, 34, 8, { fill: PAL.skin, lw: 4 });
    rrect(-20, -6, 40, 34, 12, { fill: PAL.skin, lw: 4.5 });
    ctx.restore();
    stroke([[900, 740], [830, 790]], '#F4F6FA', 30, { olw: 9 });
    circle(820, 792, 17, { fill: PAL.skin, lw: 4.5 });

    for (let i = 0; i < 3; i++) if (orbit(i).depth >= 0) drawBill(i);
    camEnd();
  }

  // ---- 81.60 야근: stars over the empty office ---------------------------------------------------

  function overtime(t, lt) {
    const lift = easeInOut(seg(t, 82.7, 83.5));
    const soft = seg(t, 83.8, 84.4);
    camBegin(lerp(880, 930, ease(lt / 4.8)), lerp(520, 470, ease(lt / 4.8)), 1.42 + ease(lt / 4.8) * 0.14);
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#1C2146', stroke: null });
    rrect(-200, 800, W + 400, 600, 0, { fill: '#171A38', stroke: null });
    // the big window, full of stars
    const wx = 960, wy = 40, ww = 960, wh = 700;
    rrect(wx, wy, ww, wh, 8, { fill: lgrad(0, wy, 0, wy + wh, [[0, '#0C0F30'], [0.7, '#28306A'], [1, '#4A3F80']]), lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ctx.save(); ctx.translate(wx - 40, wy); stars(t, 70, 31, 0.55 + lift * 0.45, wh - 120); ctx.restore();
    for (let i = 0; i < 5; i++) sparkle(wx + 80 + hash(i, 41) * (ww - 160), wy + 60 + hash(i, 42) * 380, (10 + hash(i, 43) * 12) * (0.6 + 0.4 * Math.sin(t * 3 + i)) * (0.4 + lift * 0.6), '#FFF6D0', t * 0.3);
    // a shooting star
    const ss = seg(t, 84.2, 84.9);
    if (ss > 0 && ss < 1) {
      const x = wx + 820 - ss * 600, y = wy + 80 + ss * 220;
      stroke([[x, y], [x + 140, y - 52]], '#FFFFFF', 5, { ink: null, alpha: Math.sin(ss * Math.PI) });
      sparkle(x, y, 16, '#FFFFFF', t);
    }
    skyline(wx, wx + ww, wy + wh + 20, t, 12, '#10143A', 0.2);
    ctx.restore();
    for (let i = 1; i < 3; i++) stroke([[wx + i * ww / 3, wy], [wx + i * ww / 3, wy + wh]], '#2E3566', 10, { olw: 5 });
    // tubes, off
    tubes(30, [60, 560], 0, 280);
    // empty desks in the dark
    for (let i = 0; i < 3; i++) {
      const dx = -100 + i * 340;
      rrect(dx, 520, 150, 110, 8, { fill: '#232A55', stroke: null });
      rrect(dx - 60, 620, 280, 30, 6, { fill: '#262D5A', stroke: null });
    }

    // dad at his desk: hunched at the monitor, then up at the sky
    const glowK = 1 - lift * 0.4;
    glow(860, 480, 380, '#7FB8FF', 0.35 * glowK);
    const dm = t < 82.7 ? { eyes: 'sleepy', mouth: 'flat', lookX: 1, lookY: 0.4, bags: 0.8 }
      : t < 83.8 ? { eyes: 'wide', mouth: 'o', lookX: 0.8, lookY: -1, bags: 0.6 }
        : { eyes: soft > 0.5 ? 'happy' : 'open', mouth: 'smile', lookX: 0.8, lookY: -1, blush: 0.5 * soft, bags: 0.5 };
    person(650, 950, 1.05, {
      role: 'dad', t, turn: 0.55, rot: lerp(0.1, -0.02, lift), headRot: lerp(0.16, -0.14, lift), headDy: lerp(18, 0, lift),
      aR: 0.9, eR: 0.9, aL: 0.3, eL: 0.4, jacket: false, looseTie: true,
      emote: soft > 0.2 ? 'sparkle' : undefined, emoteK: soft, ...dm,
    });
    // starlight on his face
    if (lift > 0) glow(700, 520, 260, '#FFF1C8', 0.25 * lift);
    // desk, monitor (side on, glowing toward him), mug, family photo
    rrect(280, 730, 860, 36, 8, { fill: '#3E4A6E', lw: 6 });
    rrect(310, 766, 800, 320, 0, { fill: '#2E3656', lw: 6 });
    rrect(930, 700, 60, 34, 5, { fill: '#5B6378', lw: 4 });
    stroke([[960, 700], [960, 640]], '#5B6378', 12, { olw: 8 });
    poly([[900, 450], [940, 440], [940, 660], [900, 650]], { fill: '#454E78', lw: 5 });
    stroke([[898, 460], [898, 640]], '#BFE0FF', 5, { ink: null });
    rrect(400, 680, 60, 54, 10, { fill: '#F2F0EA', lw: 4.5 });
    ctx.save(); ctx.translate(560, 690); ctx.rotate(-0.08);
    rrect(-50, -44, 100, 84, 6, { fill: '#C9A06A', lw: 4.5 });
    rrect(-38, -32, 76, 60, 3, { fill: '#9FD4F5', lw: 3 });
    for (let i = 0; i < 4; i++) circle(-24 + i * 16, 4 - [10, 8, 4, 0][i], [9, 8, 6, 5][i], { fill: PAL.skin, lw: 2.5 });
    ctx.restore();
    // a mountain of files
    for (let i = 0; i < 5; i++) rrect(170 + hash(i, 8) * 14, 712 - i * 22, 170, 22, 4, { fill: ['#F4E8D0', '#DDEBFA', '#FFFFFF', '#F7D3C0', '#E3F0D8'][i], lw: 4 });
    camEnd();
  }

  // ---- 86.40 아이고: the stretch -----------------------------------------------------------------

  function stretch(t, lt) {
    const rise = easeOut(seg(t, 86.4, 86.9));
    const up = kf(t, [[88.5, 0], [89.1, 1], [89.9, 1], [90.4, 0]], easeInOut);
    const exhale = seg(t, 90.2, 90.8);
    const dark = seg(t, 90.85, 91.1);
    camBegin(960, lerp(560, 520, ease(lt / 4.8)), 1.08 - up * 0.04);
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#1C2146', stroke: null });
    rrect(-200, 820, W + 400, 600, 0, { fill: '#171A38', stroke: null });
    // the same window, now behind him
    const wx = 250, wy = 60, ww = 1420, wh = 640;
    rrect(wx, wy, ww, wh, 8, { fill: lgrad(0, wy, 0, wy + wh, [[0, '#0C0F30'], [0.7, '#28306A'], [1, '#4A3F80']]), lw: 6 });
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ctx.save(); ctx.translate(wx, wy); stars(t, 70, 33, 1, wh - 140); ctx.restore();
    moon(wx + 1200, wy + 130, 50);
    skyline(wx, wx + ww, wy + wh + 20, t, 14, '#10143A', 0.2);
    ctx.restore();
    for (let i = 1; i < 4; i++) stroke([[wx + i * ww / 4, wy], [wx + i * ww / 4, wy + wh]], '#2E3566', 10, { olw: 5 });
    // his chair, pushed back
    rrect(560, 560, 170, 230, 30, { fill: '#3E4A6E', lw: 6 });
    stroke([[645, 790], [645, 880]], '#5B6378', 12, { olw: 8 });
    stroke([[570, 900], [720, 900]], '#5B6378', 10, { olw: 8 });

    // the pose: up from the chair, a hand on his back, then the big stretch
    const tap = [87.3, 87.6, 87.9, 88.2].reduce((k, tt) => k + (t >= tt ? Math.exp(-(t - tt) * 14) : 0), 0);
    let o;
    if (t < 88.45) {
      o = {
        rot: lerp(0.18, -0.06, rise) + tap * 0.03, sq: lerp(0.14, 0, rise) + tap * 0.02,
        aL: 0.35, eL: 1.9 + tap * 0.2, aR: 0.35, eR: 0.3,
        eyes: t < 87.0 ? 'closed' : 'sad', mouth: t < 87.0 ? 'o' : 'wavy', brows: 'worried',
      };
    } else {
      o = {
        rot: Math.sin((t - 88.5) * 3) * 0.03 * up, sq: -0.07 * up + exhale * 0.05 * (1 - exhale),
        aL: lerp(0.35, 2.95, up), aR: lerp(0.3, 2.95, up), eL: lerp(1.2, -0.25, up), eR: lerp(0.3, -0.25, up),
        eyes: up > 0.5 ? 'closed' : exhale > 0 ? 'happy' : 'sad', mouth: up > 0.5 ? 'o' : exhale > 0 ? 'smile' : 'wavy',
        dy: up * 14,
      };
    }
    const grab = t >= 90.55;
    person(900, 940, 1.12, {
      role: 'dad', t, jacket: false, looseTie: true, bags: 0.6, ...o,
      holdR: grab ? (x, y) => briefcase(x - 4, y + 2, 0.8) : undefined,
      aR: grab ? 0.15 : o.aR, eR: grab ? 0.1 : o.eR,
    });
    // desk in front
    rrect(1030, 720, 700, 36, 8, { fill: '#3E4A6E', lw: 6 });
    rrect(1060, 756, 640, 400, 0, { fill: '#2E3656', lw: 6 });
    deskLamp(1560, 724, 0.8, 1 - dark, false);
    if (dark < 1) glow(1470, 690, 320, '#FFE08A', 0.35 * (1 - dark));
    if (!grab) briefcase(1200, 640, 0.8);
    // back taps: little stars at his hip
    for (const tt of [87.3, 87.6, 87.9, 88.2]) {
      const a = t - tt;
      if (a >= 0 && a < 0.3) sparkle(820 + (tt * 10 % 3) * 8, 720 - (tt * 7 % 2) * 20, 22 * (1 - a / 0.3) + 6, PAL.gold, a * 3);
    }
    sfx('아이고', 620, 330, 96, '#FFE08A', t - 86.9, { life: 1.4, font: 'round', rot: -0.1 });
    // the creak
    if (t > 89.3 && t < 90.1) {
      const a = t - 89.3;
      for (let i = 0; i < 4; i++) {
        const cx = 900 + (i % 2 ? 1 : -1) * (110 + i * 12), cy = 560 - i * 40;
        const k = clamp(1 - Math.max(0, a - i * 0.1) / 0.5) * (a > i * 0.1 ? 1 : 0);
        if (k > 0) stroke([[cx - 14, cy], [cx - 4, cy - 12], [cx + 4, cy + 4], [cx + 14, cy - 8]], '#FFFFFF', 5, { ink: null, alpha: k });
      }
    }
    sfx('우두둑', 1250, 300, 100, '#FFFFFF', t - 89.35, { life: 1.0, rot: 0.1 });
    // the breath out
    if (exhale > 0 && exhale < 1) {
      for (let i = 0; i < 3; i++) {
        const k = clamp(exhale * 1.4 - i * 0.2);
        if (k > 0 && k < 1) circle(1000 + k * 110 + i * 10, 500 - k * 40 - i * 14, 10 + k * 18 - i * 3, { fill: rgba('#FFFFFF', 0.55 * Math.sin(k * Math.PI)), stroke: null });
      }
    }
    camEnd();
    if (dark > 0) fillScreen('#0A0C22', dark * 0.75);
  }

  // ---- 91.20 막차: nodding off on the last train -------------------------------------------------

  function train(t, lt) {
    const sway = Math.sin(t * 1.9) * 0.008;
    const push = easeInOut(seg(t, T_TRAIN, 96.0));
    camBegin(lerp(960, 1110, push) + Math.sin(t * 1.3) * 8, lerp(520, 560, push) + Math.sin(t * 5.1) * 2, lerp(1.0, 1.45, push), sway);
    // car interior, purple
    rrect(-200, -200, W + 400, H + 400, 0, { fill: '#6A5A9E', stroke: null });
    rrect(-200, -200, W + 400, 300, 0, { fill: '#7C6CB0', stroke: null });
    rrect(-200, 820, W + 400, 600, 0, { fill: '#3E3466', stroke: null });
    // the window band: city lights running past
    const wy = 170, wh = 290;
    for (let p = 0; p < 3; p++) {
      const px = -80 + p * 700, pw = 620;
      rrect(px, wy, pw, wh, 24, { fill: '#171A40', lw: 6 });
      ctx.save(); rrectPath(px, wy, pw, wh, 24); ctx.clip();
      // far buildings scroll slowly, near lights stream
      for (let i = 0; i < 20; i++) {
        const bx = ((hash(i, 51) * 2400 - t * 180) % 2400 + 2400) % 2400 - 300, bh = 60 + hash(i, 52) * 150;
        rrect(bx, wy + wh - bh, 90 + hash(i, 53) * 60, bh, 3, { fill: '#232852', stroke: null });
        for (let r = 0; r < 4; r++) if (hash(i, r + 60) < 0.4) rrect(bx + 12 + r * 18, wy + wh - bh + 16 + (r % 2) * 30, 10, 14, 2, { fill: '#FFD98A', stroke: null });
      }
      for (let i = 0; i < 14; i++) {
        const y = wy + 40 + hash(i, 71) * (wh - 60), len = 80 + hash(i, 72) * 220, sp = 1400 + hash(i, 73) * 1200;
        const x = ((hash(i, 74) * 2600 - t * sp) % 2600 + 2600) % 2600 - 300;
        stroke([[x, y], [x + len, y]], ['#FFD98A', '#FF9AC2', '#9FD4FF'][i % 3], 5 + hash(i, 75) * 5, { ink: null, alpha: 0.8 });
      }
      ctx.restore();
      rrect(px, wy, pw, wh, 24, { fill: null, lw: 6 });
    }
    // straps from the rail, all swinging together
    stroke([[-200, 70], [W + 200, 70]], '#C9CED8', 10, { olw: 6 });
    for (let i = 0; i < 9; i++) {
      const sx = 80 + i * 220, a = Math.sin(t * 1.9 + 0.3) * 0.18;
      ctx.save(); ctx.translate(sx, 70); ctx.rotate(a);
      stroke([[0, 0], [0, 70]], '#E6E6EE', 8, { olw: 6 });
      ell(0, 92, 20, 24, { fill: null, stroke: PAL.ink, lw: 12 });
      ell(0, 92, 20, 24, { fill: null, stroke: '#F2F2F6', lw: 6 });
      ctx.restore();
    }
    // the bench
    rrect(-200, 480, W + 400, 170, 20, { fill: '#4F6FB0', lw: 6 });
    rrect(-200, 640, W + 400, 70, 16, { fill: '#5E80C4', lw: 6 });
    rrect(-200, 706, W + 400, 110, 0, { fill: '#8A93A8', lw: 6 });
    // the partition pole by his seat
    stroke([[1228, 70], [1228, 820]], '#E6E0C8', 16, { olw: 8 });

    // dad, nodding off: head drops slowly and snaps back on the beats; the last one stays down
    const nods = [91.2, 92.4, 93.6, 94.8];
    let nd = 0, snap = 0;
    for (let i = 0; i < nods.length; i++) {
      if (t >= nods[i] && (i === nods.length - 1 || t < nods[i + 1])) {
        nd = easeIn(seg(t, nods[i], nods[i] + 1.1));
        snap = i > 0 ? Math.exp(-(t - nods[i]) * 9) : 0;
      }
    }
    const last = t >= 94.8, lean = last ? easeInOut(seg(t, 94.9, 95.8)) : 0;
    const head = last ? 0 : nd;
    person(1090, 872, 1.05, {
      role: 'dad', t, sit: true, shadow: false,
      rot: lean * 0.15, headRot: head * 0.18 + lean * 0.32 - snap * 0.06, headDy: head * 36 - snap * 10,
      eyes: snap > 0.4 ? 'wide' : head > 0.3 || last ? 'closed' : 'sleepy', mouth: last ? 'o' : 'flat', bags: 0.7,
      aL: 0.45, eL: 1.1, aR: 0.45, eR: 1.1, emote: last && lean > 0.5 ? 'zzz' : undefined, emoteK: 1,
    });
    ctx.save(); ctx.translate(1090, 872); ctx.rotate(lean * 0.15); ctx.translate(-1090, -872);
    briefcase(1090, 690, 0.95);
    circle(1030, 730, 17, { fill: PAL.skin, lw: 4.5 });
    circle(1150, 730, 17, { fill: PAL.skin, lw: 4.5 });
    ctx.restore();
    // an empty car: one forgotten newspaper
    ctx.save(); ctx.translate(560, 628); ctx.rotate(-0.06);
    rrect(-90, -20, 180, 26, 4, { fill: '#EDEBE3', lw: 4 });
    ctx.restore();
    camEnd();
    fillScreen('#2A1F5A', 0.12);
  }

  chapter('numbers', 67.2, 96.0, [
    [T_MEET, meeting], [T_STAMP, stamp], [T_CALC, calc], [T_STARS, overtime], [T_STRETCH, stretch], [T_TRAIN, train],
  ]);
})();
