// e3_grammys (67.20 – 96.00): the Grammys. Five golden gramophones drop onto a dark stage, one
// every two beats; a four-panel board lights the four big categories one by one and then all at
// once; the camera flies down a dark gun-barrel-like tunnel to a spinning film reel.
// No real trophies or logos: generic gold gramophones, a rifled circle, a film reel.
(() => {
  const GOLD = '#FFC940', GOLD_DK = '#8E5A14', GOLD_LT = '#FFF1B0', LIME = BIO.lime, PINK = BIO.pink;

  // ---- private helpers -------------------------------------------------------------------------

  /** Decaying 0..1 after a hit at t0 (0 before it). */
  const after = (t, t0, k = 5) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);

  /** Paint with additive light. */
  function lighter(fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }

  /**
   * A golden gramophone (a generic icon, not any real trophy): plinth, cabinet, record, tone arm
   * and a flared horn. (x, y) is the foot; about 400 tall at s = 1. o: { mono, sx, sy, rot, alpha }.
   */
  function gramophone(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s * (o.sx ?? 1), s * (o.sy ?? 1));
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const m = o.mono;
    const band = (x0, y0, x1, y1) => (m ? m : lgrad(x0, y0, x1, y1, [[0, GOLD_DK], [0.3, GOLD], [0.5, GOLD_LT], [0.7, GOLD], [1, GOLD_DK]]));
    const dk = m ? mix(m, '#000000', 0.35) : GOLD_DK;
    const N = { stroke: null };
    // plinth and cabinet
    poly([[-80, 0], [80, 0], [66, -24], [-66, -24]], { ...N, fill: dk });
    rrect(-72, -96, 144, 74, 8, { ...N, fill: band(-72, 0, 72, 0) });
    rrect(-54, -84, 108, 48, 6, { fill: null, stroke: dk, lw: 3 });
    // platter and record
    ell(0, -98, 76, 13, { ...N, fill: dk });
    ell(0, -101, 70, 11, { ...N, fill: m ? mix(m, '#000000', 0.6) : '#24170A' });
    ell(0, -101, 16, 3, { ...N, fill: m || GOLD });
    // neck up to the horn, and the tone arm
    stroke([[56, -100], [62, -150], [44, -196]], m || GOLD, 13, { ink: null, smooth: true });
    stroke([[56, -106], [40, -132], [12, -112]], m || GOLD_LT, 5, { ink: null });
    // the horn, built along +x then turned to point up and back
    ctx.save(); ctx.translate(44, -196); ctx.rotate(-2.05);
    const up = [], dn = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12, X = u * 200, hw = 9 + 84 * Math.pow(u, 2.3);
      up.push([X, -hw]); dn.push([X, hw]);
    }
    poly([...up, ...dn.reverse()], { ...N, fill: band(0, -93, 0, 93) });
    for (const k of [-0.55, 0, 0.55]) {
      stroke(up.map(([X, Y]) => [X, Y * -k]), dk, 2.5, { ink: null, alpha: 0.55 });
    }
    ell(200, 0, 22, 93, { fill: m ? mix(m, '#000000', 0.5) : rgrad(200, 0, 4, 92, [[0, '#2A1806'], [0.7, GOLD_DK], [1, GOLD]]), stroke: m ? null : GOLD_LT, lw: 4 });
    ctx.restore();
    ctx.restore();
  }

  /** A few sparks flying out of a landing at (x, y), for `age` seconds after it. */
  function sparks(x, y, age, seed, color = GOLD_LT, n = 14) {
    if (age < 0 || age > 0.7) return;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.08 + 0.84 * hash(i, seed)), v = 380 + hash(i, seed + 1) * 520;
      const px = x + Math.cos(a) * v * age, py = y + Math.sin(a) * v * age + 900 * age * age;
      const r = (3 + hash(i, seed + 2) * 4) * (1 - age / 0.7);
      circle(px, py, r, { fill: color, stroke: null });
    }
  }

  /** A light cone from (x0, y0) down to an ellipse at (x1, y1) of half-width w. */
  function cone(x0, y0, x1, y1, w, color, a) {
    if (a <= 0.003) return;
    lighter(() => {
      ctx.fillStyle = lgrad(x0, y0, x1, y1, [[0, rgba(color, a)], [1, rgba(color, a * 0.25)]]);
      ctx.beginPath(); ctx.moveTo(x0 - 10, y0); ctx.lineTo(x1 - w, y1); ctx.lineTo(x1 + w, y1); ctx.lineTo(x0 + 10, y0); ctx.fill();
      ctx.fillStyle = rgba(color, a * 0.6);
      ellPath(x1, y1, w, w * 0.16); ctx.fill();
    });
  }

  // ---- 67.20 · five gramophones land on the beat -----------------------------------------------

  const TX = [490, 725, 960, 1195, 1430], TL = [69.0, 70.2, 71.4, 72.6, 73.8], FLOOR = 720;

  function trophies(t, lt) {
    skyFill([[0, '#050308'], [0.5, '#110A17'], [0.64, '#1B1107'], [1, '#050306']]);
    const landed = TL.filter(x => t >= x).length, allIn = after(t, TL[4], 2.5);
    let sx = 0, sy = 0;
    TL.forEach((tl, i) => { const [a, b] = shakeXY(t, tl, 9 + i * 3, 0.3); sx += a; sy += b; });
    const zoom = kf(t, [[67.2, 1.36], [69.0, 1.24], [73.8, 1.02], [76.8, 0.97]], easeInOut) + 0.03 * after(t, TL[4], 4);
    const cx = kf(t, [[67.2, 660], [69.0, 600], [73.8, 960]], easeInOut) + Math.sin(t * 0.7) * 14;
    const cy = kf(t, [[67.2, 450], [73.8, 500], [76.8, 510]], easeInOut);
    camBegin(cx + sx, cy + sy, zoom, Math.sin(t * 0.5) * 0.012);

    // the back wall: tall LED bars that ripple on the beat, warming to gold as the stage fills
    const warm = clamp(landed / 5);
    for (let i = 0; i < 30; i++) {
      const x = -520 + i * 100, wave = Math.pow(Math.max(0, Math.sin(beatOf(t) * Math.PI / 2 - i * 0.45)), 6);
      const col = i % 2 ? mix(LIME, GOLD, warm) : mix(PINK, GOLD, warm);
      rrect(x, 40, 12, FLOOR - 70, 6, { fill: rgba(col, 0.06 + 0.3 * wave + 0.25 * allIn), stroke: null });
    }
    glow(960, 360, 900, mix('#5A1E6A', '#8A5A12', warm), 0.25 + 0.15 * pulse(t, 4));
    // a glossy floor, the stage edge glinting gold
    rrect(-700, FLOOR, 3300, 900, 0, { fill: lgrad(0, FLOOR, 0, FLOOR + 380, [[0, '#231709'], [1, '#050306']]), stroke: null });
    rrect(-700, FLOOR - 2, 3300, 4, 0, { fill: rgba(GOLD, 0.55 + 0.3 * pulse(t, 5)), stroke: null });

    // spotlights: a searching one before the first drop, then one per gramophone
    cone(TX[0] + Math.sin(t * 2.2) * 260, -160, TX[0] + Math.sin(t * 2.2 + 0.6) * 160, FLOOR, 120, '#FFF3D0', 0.16 * (1 - seg(t, 68.4, 69.0)));
    for (let i = 0; i < 5; i++) {
      if (t < TL[i] - 0.45) continue;
      const on = t >= TL[i] ? 0.2 + 0.28 * after(t, TL[i], 3) + 0.08 * pulse(t, 5) + 0.12 * allIn : 0.1 * seg(t, TL[i] - 0.45, TL[i]);
      cone(TX[i] + (i - 2) * 140, -200, TX[i], FLOOR, 150, i % 2 ? '#FFE9B0' : '#FFD9F0', on);
    }

    // the gramophones: fall, land with a squash, sparks and a ring of light
    for (let i = 0; i < 5; i++) {
      const k = seg(t, TL[i] - 0.45, TL[i]);
      if (k <= 0) continue;
      const age = t - TL[i];
      const y = FLOOR - (1 - easeIn(k)) * 1000;
      const sq = age >= 0 ? Math.exp(-age * 8) * Math.sin(age * 28) * 0.2 : -0.12 * k;
      const s = 0.84;
      if (age < 0) stroke([[TX[i], y - 520], [TX[i], y - 260]], rgba(GOLD, 0.35), 50 * s, { ink: null });
      // reflection on the floor
      if (age >= 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(-800, FLOOR, 3400, 170); ctx.clip(); ctx.translate(0, 2 * FLOOR); ctx.scale(1, -1);
        gramophone(TX[i], FLOOR, s, { sx: 1 + sq * 0.6, sy: 1 - sq, alpha: 0.13 });
        ctx.restore();
      }
      if (age >= 0) glow(TX[i], FLOOR - 170, 260, GOLD, 0.25 + 0.25 * after(t, TL[i], 3) + 0.12 * pulse(t, 5));
      gramophone(TX[i], y, s, { sx: 1 + sq * 0.6, sy: 1 - sq });
      if (age >= 0 && age < 0.6) {
        const r = age / 0.6;
        ell(TX[i], FLOOR, 70 + easeOut(r) * 520, 12 + easeOut(r) * 70, { fill: null, stroke: rgba(GOLD_LT, 0.9 * (1 - r)), lw: 6 * (1 - r) + 1 });
      }
      sparks(TX[i], FLOOR - 8, age, 10 + i);
    }
    // once all five are in: gold dust drifting down through the light
    if (t >= TL[4]) {
      for (let i = 0; i < 70; i++) {
        const age = t - TL[4], x = 300 + hash(i, 3) * 1320, y0 = -100 - hash(i, 4) * 500;
        const y = y0 + (150 + hash(i, 5) * 200) * age + (age < 0.5 ? 0 : 0);
        if (y > FLOOR) continue;
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + i);
        sparkle(x + Math.sin(t * 1.4 + i) * 20, y, 4 + 7 * tw, rgba(GOLD_LT, 0.5 + 0.5 * tw), t + i);
      }
    }
    camEnd();

    // in from the gold-and-ink fade that ends the chapter before, one gold blink on the downbeat
    fillScreen(BIO.ink, 0.6 * (1 - ease(seg(lt, 0, 0.6))));
    if (lt < 0.1) fillScreen(GOLD, 0.3 * (1 - lt / 0.1));
    fillScreen('#FFE6A0', 0.28 * after(t, TL[4], 5));
    yearTag(t, 67.5, '2020');
    caption(t, 67.9, 76.65, '그래미 5관왕', '2020년 1월 · 열여덟 살', { accent: GOLD });
    // a gold wipe of light into the board
    fillScreen('#000000', seg(t, 76.45, 76.8) * 0.6);
  }

  // ---- 76.80 · the four big categories light up -------------------------------------------------

  const CATS = ['올해의 레코드', '올해의 앨범', '올해의 노래', '신인상'];
  const LIT = [77.4, 78.6, 79.8, 81.0], ALL = 81.6, ACC = [LIME, PINK, PINK, LIME];
  const CW = 640, CH = 200, GAP = 40, GX = 960, GY = 500;

  function cell(t, i) {
    const x = GX + (i % 2 ? 1 : -1) * (CW + GAP) / 2, y = GY + (i < 2 ? -1 : 1) * (CH + GAP) / 2;
    const k = seg(t, LIT[i], LIT[i] + 0.25), on = t >= LIT[i];
    const all = seg(t, ALL, ALL + 0.25), p = pulse(t, 4);
    const acc = mix(ACC[i], GOLD, all);
    const s = on ? lerp(0.9, 1, backOut(k)) + 0.015 * p * all : 0.95;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (on) glow(0, 0, 420, acc, 0.12 + 0.2 * after(t, LIT[i], 3) + 0.1 * p * all + 0.25 * after(t, ALL, 2));
    rrect(-CW / 2, -CH / 2, CW, CH, 24, {
      fill: on ? lgrad(-CW / 2, 0, CW / 2, 0, [[0, mix('#140F1C', acc, 0.28)], [1, mix('#140F1C', acc, 0.08)]]) : '#110D17',
      stroke: on ? acc : '#2A2434', lw: on ? 6 : 4, shadow: on ? acc : null, shadowBlur: 34 + 30 * p * all,
    });
    // a scan of light across the panel as it switches on
    if (on && k < 1 || (t >= ALL && t < ALL + 0.35)) {
      const kk = t >= ALL ? seg(t, ALL, ALL + 0.35) : k;
      ctx.save(); rrectPath(-CW / 2, -CH / 2, CW, CH, 24); ctx.clip();
      const sx = lerp(-CW / 2 - 120, CW / 2 + 120, kk);
      ctx.fillStyle = lgrad(sx - 120, 0, sx + 120, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(sx - 120, -CH / 2, 240, CH);
      ctx.restore();
    }
    gramophone(-CW / 2 + 92, CH / 2 - 26, 0.36, on ? { rot: 0.12 * after(t, LIT[i], 4) * Math.sin((t - LIT[i]) * 30) } : { mono: '#2E2838' });
    ctx.font = `66px ${FONT.bold}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (on) { ctx.shadowColor = acc; ctx.shadowBlur = 24; }
    ctx.fillStyle = on ? '#FFFFFF' : '#3A3346';
    ctx.fillText(CATS[i], -CW / 2 + 190, 4);
    ctx.restore();
  }

  function fourCats(t, lt) {
    skyFill([[0, '#07050B'], [1, '#130B19']]);
    const all = after(t, ALL, 3), bump = Math.max(...LIT.map(x => after(t, x, 7)));
    // a drifting dot grid and two slow colour washes
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let gx = 0; gx < 26; gx++) for (let gy = 0; gy < 15; gy++) {
      ctx.fillRect(((gx * 80 + t * 20) % 2080) - 80, gy * 80 + 20, 4, 4);
    }
    ctx.restore();
    glow(300 + Math.sin(t * 0.5) * 120, 300, 700, PINK, 0.12);
    glow(1650 + Math.cos(t * 0.4) * 120, 800, 700, LIME, 0.08);

    const zoom = kf(t, [[76.8, 1.14], [81.6, 1.0], [86.4, 0.96]], easeOut) + 0.02 * bump + 0.07 * all;
    const [sx, sy] = shakeXY(t, ALL, 14, 0.35);
    camBegin(960 + Math.sin(t * 0.6) * 20 + sx, 520 + sy, zoom, Math.sin(t * 0.45) * 0.018);
    if (t >= ALL) {
      lighter(() => sunburst(GX, GY, rgba(GOLD, 0.07 * (0.6 + 0.4 * pulse(t, 3))), 'rgba(0,0,0,0)', t * 0.15, 20, 1800, seg(t, ALL, ALL + 0.4)));
    }
    for (let i = 0; i < 4; i++) cell(t, i);
    if (t >= ALL) {
      for (let i = 0; i < 40; i++) {
        const age = t - ALL, a = hash(i, 8) * TAU, v = 300 + hash(i, 9) * 900;
        const r = v * (1 - Math.exp(-age * 2.2)), px = GX + Math.cos(a) * r * 1.3, py = GY + Math.sin(a) * r * 0.8 + age * 40;
        const tw = 0.5 + 0.5 * Math.sin(t * 7 + i);
        sparkle(px, py, (6 + 10 * tw) * Math.max(0.3, 1 - age * 0.15), rgba(i % 3 ? GOLD_LT : '#FFFFFF', 0.4 + 0.5 * tw), t * 2 + i);
      }
    }
    camEnd();

    fillScreen('#FFE6A0', 0.45 * all);
    fillScreen('#000000', 0.6 * (1 - seg(t, 76.8, 77.1)));
    bigFact(t, ALL, 86.2, '주요 4개 부문 석권', 960, 150, 118, { color: GOLD });
    caption(t, 77.1, 86.2, '역대 최연소 기록', '올해의 레코드·앨범·노래·신인상을 한 해에', { accent: GOLD });
    // iris down to the circle the next shot starts in
    const r = kf(t, [[85.85, 1300], [86.4, 262]], easeIn);
    if (t > 85.85) iris(960, 470, r, '#000000');
  }

  // ---- 86.40 · into the barrel, to a spinning film reel ----------------------------------------

  const BX = 960, BY = 470;

  function tunnel(t, lt, R) {
    const ph = 0.28 * lt + 0.05 * lt * lt, N = 16, pb = pulse(t, 5);
    // far light at the end of the barrel
    ctx.fillStyle = rgrad(BX, BY, 0, R * 1.3, [[0, '#FFE9F4'], [0.06, '#FF7FC0'], [0.16, '#3A0F2A'], [0.5, '#0C070F'], [1, '#050306']]);
    ctx.fillRect(BX - R * 1.4, BY - R * 1.4, R * 2.8, R * 2.8);
    // rings of the bore flying past (near and big first, far and small last)
    const rings = [];
    for (let i = 0; i < N; i++) rings.push({ i, d: 0.06 + 0.94 * frac((i - ph * 3) / N) });
    rings.sort((a, b) => a.d - b.d);
    for (const { i, d } of rings) {
      const r = R * 0.08 / d, fade = clamp((1 - d) * 1.4) * clamp((d - 0.06) * 8);
      ctx.strokeStyle = rgba(i % 2 ? PINK : '#9A8CA8', (0.12 + 0.22 * pb) * fade);
      ctx.lineWidth = Math.max(1, 26 * 0.08 / d);
      ctx.beginPath(); ctx.arc(BX, BY, r, 0, TAU); ctx.stroke();
    }
    // rifling grooves spiralling down the bore
    for (let j = 0; j < 10; j++) {
      const pts = [];
      for (let q = 0; q <= 18; q++) {
        const d = 0.07 + 0.93 * Math.pow(q / 18, 1.6), r = R * 0.08 / d;
        const a = j / 10 * TAU + 1.1 * Math.log(1 / d) + ph * 1.4;
        pts.push([BX + Math.cos(a) * r, BY + Math.sin(a) * r]);
      }
      stroke(pts, rgba(j % 2 ? '#C9B8D8' : PINK, 0.18 + 0.12 * pb), 5, { ink: null, smooth: true });
      stroke(pts.map(([x, y]) => [x + 10, y + 10]), 'rgba(0,0,0,0.5)', 9, { ink: null, smooth: true });
    }
  }

  function reel(t, lt, rr) {
    if (rr < 2) return;
    const rot = 0.9 * lt + 0.16 * lt * lt;
    // the film running off the reel and out of frame, frames lit in turn
    if (rr > 60) {
      ctx.save(); ctx.translate(BX + rr * 0.35, BY + rr * 0.92); ctx.rotate(-0.22);
      const h = rr * 0.42, len = 2000, scroll = (rot * rr) % (h * 0.9);
      rrect(0, -h / 2, len, h, 4, { fill: '#171019', stroke: null });
      ctx.beginPath(); ctx.rect(0, -h / 2, len, h); ctx.clip();
      for (let q = -1; q < len / (h * 0.9) + 1; q++) {
        const fx = q * h * 0.9 - scroll + h * 0.1;
        const lit = 0.25 + 0.55 * Math.pow(Math.max(0, Math.sin(q * 0.9 - beatOf(t) * 0.5 * Math.PI)), 4);
        rrect(fx, -h * 0.3, h * 0.72, h * 0.6, 4, { fill: rgba(q % 2 ? '#FFD27A' : '#FF9AD0', lit * 0.5), stroke: null });
        for (const e of [-1, 1]) for (let hh = 0; hh < 3; hh++) {
          ctx.fillStyle = '#050306'; ctx.fillRect(fx + hh * h * 0.3, e * h * 0.4 - h * 0.045, h * 0.12, h * 0.09);
        }
      }
      ctx.restore();
    }
    ctx.save(); ctx.translate(BX, BY); ctx.rotate(rot);
    glow(0, 0, rr * 1.6, PINK, 0.25 + 0.15 * pulse(t, 4));
    // the wound film seen at the edge, then the flange with its windows
    circle(0, 0, rr, { fill: rgrad(-rr * 0.3, -rr * 0.3, rr * 0.1, rr * 1.2, [[0, '#D9D3E0'], [0.6, '#77707E'], [1, '#2C2732']]), stroke: null });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      circle(Math.cos(a) * rr * 0.56, Math.sin(a) * rr * 0.56, rr * 0.25, { fill: '#130C12', stroke: null });
      ctx.save(); ctx.beginPath(); ctx.arc(Math.cos(a) * rr * 0.56, Math.sin(a) * rr * 0.56, rr * 0.25, 0, TAU); ctx.clip();
      circle(0, 0, rr * 0.7, { fill: '#3B2418', stroke: null });
      ctx.restore();
    }
    circle(0, 0, rr * 0.22, { fill: '#B8B1C0', stroke: '#3A3440', lw: Math.max(1, rr * 0.02) });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU;
      rrect(Math.cos(a) * rr * 0.1 - rr * 0.03, Math.sin(a) * rr * 0.1 - rr * 0.03, rr * 0.06, rr * 0.06, rr * 0.01, { fill: '#2C2732', stroke: null });
    }
    circle(0, 0, rr * 0.05, { fill: '#2C2732', stroke: null });
    ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.5, rr * 0.018); ctx.strokeStyle = rgba(PINK, 0.8);
    ctx.beginPath(); ctx.arc(BX, BY, rr * 0.995, -2.6, -0.6); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.lineWidth = Math.max(1.5, rr * 0.012); ctx.strokeStyle = rgba('#FFFFFF', 0.5);
    ctx.beginPath(); ctx.arc(BX, BY, rr * 0.97, 0.6, 1.6); ctx.stroke(); ctx.restore();
  }

  function barrel(t, lt) {
    fillScreen('#030204');
    const R = kf(lt, [[0, 262], [2.4, 340], [4.4, 1500]], easeIn);
    const [sx, sy] = shakeXY(t, 93.6, 8, 0.4);
    const bar = pulse(t, 6) * seg(t, 91.2, 96);
    camBegin(960 + sx, 540 + sy, 1 + 0.02 * bar + 0.04 * seg(t, 95.4, 96), Math.sin(lt * 0.5) * 0.02);
    // the barrel mouth: a dark rifled circle, with a pink rim of light
    if (R < 1400) {
      glow(BX, BY, R * 1.7, PINK, 0.12);
      ctx.save(); ctx.lineWidth = 18; ctx.strokeStyle = lgrad(BX - R, BY - R, BX + R, BY + R, [[0, '#5A5262'], [0.5, '#1A161E'], [1, '#3C3544']]);
      ctx.beginPath(); ctx.arc(BX, BY, R + 9, 0, TAU); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = rgba(PINK, 0.7);
      ctx.beginPath(); ctx.arc(BX, BY, R + 19, -2.4, -0.9); ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(BX, BY, R, 0, TAU); ctx.clip();
    tunnel(t, lt, Math.max(R, 262 + lt * 60));
    reel(t, lt, kf(lt, [[2.0, 0], [5.6, 230], [9.6, 300]], easeOut) * (1 + 0.03 * bar));
    ctx.restore();
    speedLines(t, BX, BY, seg(t, 94.2, 96) * 0.8, '#FFE0F0', 48, 4);
    camEnd();
    caption(t, 86.9, 95.7, '영화 〈007 노 타임 투 다이〉 주제가', '2020년 공개 · 피니어스와 함께 작곡', { accent: PINK });
    // the build ends in a warm flash that the next chapter comes out of
    fillScreen('#FFD27A', Math.pow(seg(t, 95.3, 96), 2) * 0.9);
  }

  chapter('grammys', 67.2, 96.0, [[67.2, trophies], [76.8, fourCats], [86.4, barrel]]);
})();
