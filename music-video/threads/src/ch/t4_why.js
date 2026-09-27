// t4_why (36.36 – 59.78) · 4 · 왜 반말?
//
// 36.36 ALARM. The quiz stage goes red, two siren lamps sweep red beams, the whole frame flashes red
//       on every beat (삐뽀삐뽀!). The bonus card slams: [보너스] 왜 반말? The stiff yarn ball from the
//       opening rises on a riser behind the podiums, glasses on and a fresh necktie, sweating.
//       37.27 3·2·1, 38.64 땡! + answer 처음 보는 사이에도\n반말이 기본: his glasses pop off, his face
//       goes to a grin, the red turns warm, and strands of yarn shoot from him to every contestant.
//       40.91 나이도 직급도 흐려지니\n더 가까워진다: the tie flies off (툭!) and everyone leans in closer.
// 43.64 Chorus 2. The numbers: yarn balls rain down and stack into a pyramid on the beat.
//       45.45 665만 명 · 48.18 80% · 50.91 5억 명 (the loosened ball lands on top). One at a time.
// 52.73 Boom. The pyramid bursts into a big heart of yarn balls; strands weave a heart-shaped net,
//       everyone waves. 스쳐도 괜찮아,\n여긴 다 스친이니까 · 55.45 쓰하! · the credit. It settles to a
//       still from 58.2.
(() => {
  const T = window.T34;
  const { B, CAST, STIFF, ROW_Y, R, punch, squashAt, at, link, glassesProp, tieProp, sweat, row, stage, stageCam, mark } = T;

  const fit = (txt, size, maxW) => {
    ctx.save(); ctx.font = `${size}px ${HAND}`; const w = ctx.measureText(txt).width; ctx.restore();
    return w > maxW ? Math.floor(size * maxW / w) : size;
  };

  // ==== 1 · the bonus question ===================================================================
  const A = 36.3636, TIM = 37.2727, ANS = 38.6364, SUB = 40.9091, DROP = 43.6364;
  const RISE = A + B;                                      // the riser lands at 36.82

  /** The bonus card: a wider red tag reading 보너스. */
  function bonusCard(t, x, y, s) {
    const k = clamp((t - A) / 0.3); if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * backOut(k), s * backOut(k)); ctx.rotate(-0.03 + Math.sin(t * 3) * 0.012);
    const w = 820, h = 320;
    feltCard(0, 0, w, h, { fill: YARN.red, stitch: '#FFD0D0' });
    // the tag
    rrect(-w / 2 - 26, -h / 2 - 50, 250, 96, 44, { fill: YARN.mustard, stroke: YARN.ink, lw: 7 });
    handText('보너스', -w / 2 + 99, -h / 2 - 1, 64, YARN.ink);
    sparkle(-w / 2 + 232, -h / 2 - 50, 26 * (0.6 + 0.4 * pulse(t, 5)), '#FFFFFF', t * 2);
    ctx.font = `180px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 18; ctx.strokeStyle = YARN.ink; ctx.lineJoin = 'round'; ctx.strokeText('왜 반말?', 0, 16);
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('왜 반말?', 0, 16);
    ctx.restore();
  }

  /** A siren lamp with a sweeping beam. */
  function siren(t, x, y, ph, k) {
    if (k <= 0) return;
    const ang = t * 7 + ph;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
    for (const off of [0, Math.PI]) {
      const a = ang + off, len = 1500;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - 0.16) * len, y + Math.sin(a - 0.16) * len);
      ctx.lineTo(x + Math.cos(a + 0.16) * len, y + Math.sin(a + 0.16) * len); ctx.closePath();
      ctx.fillStyle = rgrad(x, y, 0, len, [[0, 'rgba(255,60,60,0.55)'], [1, 'rgba(255,60,60,0)']]); ctx.fill();
    }
    ctx.restore();
    rrect(x - 50, y + 26, 100, 30, 8, { fill: '#3A3040', stroke: YARN.ink, lw: 5 });
    ctx.beginPath(); ctx.arc(x, y + 28, 44, Math.PI, 0); ctx.closePath();
    const lit = 0.5 + 0.5 * Math.sin(ang * 2);
    paint({ fill: mix('#B01020', '#FF5A5A', lit), stroke: YARN.ink, lw: 6 });
    glow(x, y + 5, 110, '#FF3030', 0.5 * k * (0.6 + 0.4 * lit));
    ell(x - 14, y + 2, 10, 16, { fill: '#FFFFFF', stroke: null, alpha: 0.6 });
  }

  /** The stiff one on his riser. */
  function stiffGuy(t, o = {}) {
    const rise = easeOut(seg(t, A + 0.05, RISE)), land = squashAt(t, RISE, 0.5, 0.35);
    const loose = t >= ANS;
    // lean in when everyone gets closer
    const near = easeInOut(seg(t, SUB + B, SUB + 3 * B));
    const baseY = 1000 + (1 - rise) * 700 + near * 90;
    let dy = 0, sq = land, rot = 0;
    if (!loose) {
      const tense = seg(t, RISE, ANS);
      rot = Math.sin(t * 60) * 0.02 * tense;                          // trembling
      dy = (beatN(t) % 2 ? 5 : 0);                                     // a robotic tick on the beat
    } else {
      const j = seg(t, ANS, ANS + 0.4);
      dy = Math.sin(Math.PI * j) * 120 + (j >= 1 ? hop(t) * 34 : 0);
      sq = j < 1 ? -0.25 * Math.sin(Math.PI * j) : pulse(t, 9) * 0.4;
      rot = j >= 1 ? Math.sin(beatOf(t) * Math.PI) * 0.08 : 0;
    }
    const x = 540, y = baseY - dy, r = 140;
    if (o.riser) {
      const ry = baseY + r * 0.85, rh = Math.max(40, 1560 - ry);
      rrect(x - 66, ry, 132, rh, 16, { fill: '#4A2A63', stroke: YARN.ink, lw: 7 });
      ctx.setLineDash([16, 12]); rrect(x - 42, ry + 40, 84, Math.max(10, rh - 70), 10, { fill: null, stroke: '#7A5A93', lw: 5 }); ctx.setLineDash([]);
      rrect(x - 110, ry - 12, 220, 34, 14, { fill: YARN.mustard, stroke: YARN.ink, lw: 6 });
      return;
    }
    const face = !loose ? 'stiff' : t < ANS + 0.14 ? 'shock' : 'grin';
    const hasTie = t < SUB;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    yarnBall(0, 0, r, { t, color: STIFF.color, seed: STIFF.seed, face, tie: hasTie, glasses: !loose, arms: loose && t >= ANS + 0.14 ? (t >= SUB + B ? 'wave' : 'up') : 'none', squash: sq, look: 0 });
    ctx.restore();
    // sweat before the answer, one drop a beat
    if (!loose && t > RISE) {
      for (let n = beatN(RISE); n <= beatN(ANS); n++) {
        const a = t - n * B; if (a < 0 || a > 0.6) continue;
        const side = n % 2 ? 1 : -1;
        sweat(x + side * (120 + a * 220), y - 110 - a * 200 + a * a * 700, 1.0, side * (0.4 + a), 1 - clamp((a - 0.4) / 0.2));
      }
      sweat(x + 118, y - 96 + Math.sin(t * 3) * 5, 1.2, 0.3);
    }
    // glasses pop off
    if (loose) {
      const a = t - ANS;
      if (a < 1.4) glassesProp(x - a * 520, y - 11 - a * 1500 + a * a * 1300, r, -a * 9);
      sfx('뿅!', x - 210, y - 170, 90, '#FFFFFF', a, { life: 0.7, rot: -0.12 });
    }
    // the tie flies off at 직급
    if (t >= SUB) {
      const a = t - SUB;
      if (a < 1.2) tieProp(x + 20 + a * 700, y + r * 0.62 - a * 1300 + a * a * 1300, r, a * 12);
      sfx('툭!', x + 210, y + 40, 100, YARN.red, a, { life: 0.8, rot: 0.14 });
    }
    return [x, y, r];
  }

  function bonus(t) {
    const alarm = t < ANS ? 1 : 1 - easeOut(seg(t, ANS, ANS + 0.5));
    const near = easeInOut(seg(t, SUB + B, SUB + 3 * B));
    const crouch = seg(t, DROP - 2 * B, DROP);
    stageCam(t, [A, RISE, TIM, TIM + B, TIM + 2 * B, ANS, SUB], { shake: t < A + 0.5 ? 26 : 14, zoom: 1 + near * 0.04, dy: near * 40 });
    stage(t, { alarm });
    siren(t, 105, 175, 0, alarm);
    siren(t, 975, 175, Math.PI / 2, alarm);
    let G = null;
    ctx.save(); ctx.beginPath(); ctx.rect(-100, -100, W + 200, 1565 + 100); ctx.clip();
    stiffGuy(t, { riser: true });
    ctx.restore();
    const S = row(t, i => {
      const ph = i * 0.06;
      if (t < TIM) return { face: 'shock', dy: 50 * punch(t, A, 0.35) + hop(t + ph) * 10, look: i < 2 ? 1 : -1, buzz: pulse(t, 4) };
      if (t < ANS) return { face: 'think', dy: hop(t + ph) * 8, rot: Math.sin(t * 3 + i * 1.7) * 0.1, look: i < 2 ? 1 : -1 };
      if (t < SUB + B) return { face: i % 2 ? 'grin' : 'love', arms: 'up', dy: hop(t + ph) * 44, sq: pulse(t + ph, 9) * 0.4, buzz: 0.4 * pulse(t, 4), look: i < 2 ? 1 : -1 };
      // lean in closer
      const dir = i < 2 ? 1 : -1;
      return {
        face: 'love', arms: 'wave', x: CAST[i].x + dir * near * (i === 0 || i === 3 ? 70 : 40), rot: dir * near * 0.22,
        dy: hop(t + ph) * 30 - crouch * 20, sq: pulse(t + ph, 9) * 0.35 + crouch * 0.3, look: dir,
      };
    }, { podiums: false });
    // the riser and the stiff one stand behind the podiums
    ctx.save(); ctx.beginPath(); ctx.rect(-100, -100, W + 200, 1565 + 100); ctx.clip();
    G = stiffGuy(t);
    ctx.restore();
    CAST.forEach((c, i) => T.podium(c.x, i, t, { buzz: S[i].buzz }));
    // strands from him to everyone (over the podiums, on the balls)
    CAST.forEach((c, i) => {
      const k = easeOut(seg(t, ANS + 0.3 + i * B * 0.5, ANS + 0.3 + i * B * 0.5 + 0.35));
      if (k <= 0) return;
      const a = [G[0] + (i < 2 ? -1 : 1) * G[2] * (i === 0 || i === 3 ? 0.9 : 0.6), G[1] + G[2] * (i === 0 || i === 3 ? 0.1 : 0.7)];
      const b = [S[i].x + (i < 2 ? 1 : -1) * R * 0.35, ROW_Y - S[i].dy - R * 0.35];
      link(a, b, k, c.color, t, { sag: 50, w: 16 });
      if (k < 1) sparkle(lerp(a[0], b[0], k), lerp(a[1], b[1], k) + Math.sin(k * Math.PI) * 40, 26, '#FFFFFF', t * 4);
    });
    // '!' at the alarm
    CAST.forEach((c, i) => { if (t < TIM) mark(t, '!', S[i].x, ROW_Y - S[i].dy - R - 70, 110, YARN.red, A + 0.1 + i * 0.06, i); });
    // hearts when they get close
    if (t > SUB + 2 * B) { ctx.save(); ctx.globalAlpha = seg(t, SUB + 2 * B, SUB + 3 * B); hearts(t, 12, 150, 850, 780, 350, { alpha: 0.85 }); ctx.restore(); }

    // cards
    const cm = easeInOut(seg(t, ANS - 0.3, ANS - 0.04));
    const cardS = lerp(1, 0.56, cm), cardY = lerp(470, 318, cm);
    const cardOut = easeIn(seg(t, SUB - 0.3, SUB));
    if (cardOut < 1) bonusCard(t, 540 - cardOut * 1300, cardY, cardS);
    if (t >= TIM && t < ANS + 0.3) at(860, 790, 1 - easeIn(seg(t, ANS + 0.1, ANS + 0.3)), () => timer(t, TIM, 0, 0, 100));
    const ansMove = easeInOut(seg(t, SUB - 0.3, SUB));
    at(540, lerp(585, 330, ansMove), lerp(1, 0.86, ansMove), () => answer(t, ANS, '처음 보는 사이에도\n반말이 기본', { x: 0, y: 0, size: 78, fill: YARN.mint }));
    if (t >= ANS && t < ANS + 0.6) {
      const a = t - ANS;
      ctx.save(); ctx.globalAlpha = 1 - a / 0.6;
      circle(540, 585, 120 + a * 1100, { fill: null, stroke: '#FFFFFF', lw: 18 * (1 - a / 0.6) });
      ctx.restore();
    }
    camEnd();
    confetti(t, ANS, { burst: true, y: 1150, n: 130, colors: [YARN.pink, YARN.mustard, YARN.mint, YARN.blue, YARN.lilac, YARN.coral] });
    // the siren word
    sfx('삐뽀삐뽀!', 540, 200, 92, '#FFFFFF', t - A, { life: 0.85, rot: -0.05, color2: '#B01020' });
    sfx('삐뽀삐뽀!', 540, 200, 92, '#FFFFFF', t - (A + 2 * B), { life: 0.85, rot: 0.05, color2: '#B01020' });
    stitchSub(t, SUB, DROP, '나이도 직급도 흐려지니\n더 가까워진다', { y: 590, size: 64 });
    // red on every beat while the alarm is on
    fillScreen('#FF1030', 0.2 * pulse(t, 5) * alarm);
    flash(0.6 * punch(t, A, 0.2), '#FF3040');
    flash(0.4 * punch(t, ANS, 0.2));
    flash(0.5 * seg(t, DROP - 0.12, DROP));
  }

  // ==== 2 · the numbers ===========================================================================
  const N1 = 45.4545, N2 = 48.1818, N3 = 50.9091, END = 52.7273;
  const PR = 86, PDX = 176, PDY = 148, PBASE = 1520;
  const COLS = [YARN.coral, YARN.mint, YARN.lilac, YARN.mustard, YARN.pink, YARN.teal, YARN.cream, YARN.red];
  // 15 balls: rows of 5,4,3,2,1; the last (top) is the loosened stiff one.
  const PYR = (() => {
    const out = [];
    let n = 0;
    const land = [];
    const ORDER = [2, 1, 3, 0, 4, 6, 7, 5, 8];                                  // centre out
    for (let k = 0; k < 9; k++) land[ORDER[k]] = DROP + k * B / 2;              // rows 1–2 by 45.45
    land[9] = N2 - B; land[10] = N2 - 3 * B / 2; land[11] = N2 - B / 2;         // row 3 before 80%
    land[12] = N3 - B; land[13] = N3 - B / 2;                                   // row 4
    land[14] = N3;                                                              // the top, with 5억
    for (let r = 0; r < 5; r++) {
      const cnt = 5 - r;
      for (let j = 0; j < cnt; j++) {
        const top = n === 14;
        out.push({
          x: 540 + (j - (cnt - 1) / 2) * PDX, y: PBASE - r * PDY, t: land[n], top,
          color: top ? STIFF.color : COLS[(n * 3) % COLS.length], seed: top ? STIFF.seed : 30 + n,
          hat: top ? null : n === 2 ? 'bow' : n === 7 ? 'beanie' : n === 11 ? 'bow' : null,
          face: top ? 'grin' : ['happy', 'grin', 'love', 'wink', 'happy', 'grin'][n % 6],
        });
        n++;
      }
    }
    return out;
  })();

  function pyrBall(t, b, i, o = {}) {
    const age = t - b.t;
    if (age < -0.3) return;
    const fall = age < 0 ? easeIn(1 + age / 0.3) : 1;
    const y = lerp(b.y - 1100, b.y, fall);
    const sq = age >= 0 ? squashAt(t, b.t, 0.6, 0.35) + pulse(t + i * 0.03, 9) * 0.2 : -0.25;
    const r = b.top ? PR * 1.12 : PR;
    yarnBall(b.x, y - (age > 0.35 ? hop(t + (i % 5) * 0.04) * 6 : 0), r, {
      t, color: b.color, seed: b.seed, hat: b.hat, face: age < 0 ? 'shock' : b.face,
      arms: b.top ? (age > 0 ? 'up' : 'none') : (o.arms || 'none'), squash: sq, look: (i % 3) - 1,
    });
  }

  /** A number slot: counts up, slams, then clears for the next one. */
  function numSlot(t, t0, t1, value, suffix, sub, color) {
    if (t < t0 || t > t1) return;
    const out = easeIn(seg(t, t1 - 0.22, t1));
    ctx.save(); ctx.globalAlpha = 1 - out;
    ctx.translate(540, 430 - out * 120); ctx.scale(1 + out * 0.3, 1 + out * 0.3);
    bigNum(t, t0, value, suffix, 0, 0, 205, { color, dur: 0.9 });
    ctx.restore();
    stitchSub(t, t0 + 0.35, t1 - 0.05, sub, { y: 628, size: fit(sub, 60, 900) });
  }

  function numbers(t) {
    const slams = [N1 + 0.9, N2 + 0.9, N3 + 0.9];
    // start close on the first balls, pull back as the tower grows
    const pull = easeInOut(seg(t, DROP, N1 + 0.3));
    stageCam(t, [DROP, N1, N2, N3, ...slams], { shake: 18, zoom: lerp(1.45, 1, pull), dy: lerp(330, 0, pull) });
    // bright backdrop, same curtains
    knitBg(t, '#FFE08A', '#FF9A76', { alpha: 0.08, stitch: 60 });
    ctx.save(); ctx.globalAlpha = 0.55 + 0.25 * pulse(t, 4);
    sunburst(540, 640, 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)', t * 0.25, 22, 1600);
    ctx.restore();
    glow(540, 520, 600, '#FFFFFF', 0.25 + 0.15 * pulse(t, 5));
    // floor
    ctx.fillStyle = lgrad(0, 1590, 0, H, [[0, '#C77B4E'], [1, '#8A4A36']]); ctx.fillRect(-60, 1560, W + 120, H);
    stroke([[-60, 1590], [W + 60, 1590]], YARN.ink, 7, { ink: null });
    ctx.save(); ctx.setLineDash([26, 18]); ctx.strokeStyle = '#E8B08A'; ctx.lineWidth = 5;
    for (const y of [1620, 1730, 1850]) { ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(W + 60, y); ctx.stroke(); }
    ctx.restore();
    T.curtains(t);
    T.valance(t);
    ell(540, PBASE + PR + 2, 470, 28, { fill: 'rgba(60,20,30,0.3)', stroke: null });
    PYR.forEach((b, i) => pyrBall(t, b, i));
    // landing puffs
    PYR.forEach(b => {
      const a = t - b.t; if (a < 0 || a > 0.3) return;
      for (let s = -1; s <= 1; s += 2) circle(b.x + s * (PR + a * 200), b.y + PR * 0.7, 16 * (1 - a / 0.3), { fill: '#FFFFFF', stroke: null, alpha: 0.8 });
    });
    camEnd();
    for (const s of slams) confetti(t, s, { burst: true, y: 700, n: 90, colors: [YARN.red, YARN.blue, YARN.mint, YARN.lilac, YARN.pink, '#FFFFFF'] });
    numSlot(t, N1, N2, 665, '만 명', '국내 월간 이용자 (2026년 5월)', YARN.red);
    numSlot(t, N2, N3, 80, '%', '한국 이용 시간, 1년 새 80% 넘게 늘었다', YARN.blue);
    numSlot(t, N3, END + 0.05, 5, '억 명', '전 세계 월간 이용자', YARN.teal);
    speedLines(t, 540, 430, 0.9 * (1 - seg(t, DROP, DROP + 0.5)), '#FFFFFF', 48);
    for (const s of slams) flash(0.3 * punch(t, s, 0.15));
    flash(0.6 * punch(t, DROP, 0.25));
  }

  // ==== 3 · the heart net ==========================================================================
  const HC = [540, 975], HR = 430;
  const heartRaw = a => [HC[0] + HR * 0.96 * Math.pow(Math.sin(a), 3),
    HC[1] - HR * 0.06 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))];
  // the heart outline sampled by arc length, so the balls sit evenly around it
  const HS = (() => {
    const n = 600, pts = [], L = [0];
    for (let i = 0; i <= n; i++) pts.push(heartRaw(i / n * TAU));
    for (let i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, L, total: L[n] };
  })();
  function heartAt(f) {
    f = ((f % 1) + 1) % 1;
    const want = f * HS.total; let lo = 0, hi = HS.L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (HS.L[m] < want) lo = m; else hi = m; }
    const k = (want - HS.L[lo]) / Math.max(1e-6, HS.L[hi] - HS.L[lo]);
    return [lerp(HS.pts[lo][0], HS.pts[hi][0], k), lerp(HS.pts[lo][1], HS.pts[hi][1], k)];
  }
  const NR = 14;
  const RING = Array.from({ length: NR }, (_, i) => 0.5 + (i - 7) / NR);  // i=7 sits on the tip, i=0 in the notch
  const CENTER = [540, 1135];
  const HOLD = 58.18;
  const still = t => (t < HOLD ? t : HOLD + 0.5 * (1 - Math.pow(1 - seg(t, HOLD, HOLD + 1), 2)));

  function ending(t0) {
    const t = still(t0);
    const fly = k => easeOut(clamp(k));
    stageCam(t, [END], { shake: 22 });
    knitBg(t, '#FFF0E4', '#FFC9DC', { alpha: 0.09 });
    ctx.save(); ctx.globalAlpha = 0.35;
    sunburst(540, 1000, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)', t * 0.1, 20, 1600);
    ctx.restore();
    glow(540, 1000, 700, '#FF8CC6', 0.2 + 0.1 * pulse(t, 5));
    hearts(t, 18, 40, 200, 1000, 1500, { alpha: 0.35 });

    // a big felt heart grows behind the net
    const fh = backOut(seg(t, END + 0.3, END + 0.75));
    if (fh > 0) {
      ctx.save(); ctx.translate(HC[0], HC[1] + HR * 0.15); ctx.scale(fh, fh); ctx.translate(-HC[0], -HC[1] - HR * 0.15);
      polyPath(HS.pts); paint({ fill: rgba('#FF8CC6', 0.35), stroke: null });
      ctx.save(); ctx.translate(HC[0], HC[1] + HR * 0.12); ctx.scale(0.86, 0.86); ctx.translate(-HC[0], -HC[1] - HR * 0.12);
      ctx.setLineDash([24, 18]); polyPath(HS.pts); paint({ fill: rgba('#FFFFFF', 0.25), stroke: rgba('#FF5A9A', 0.6), lw: 7 }); ctx.setLineDash([]);
      ctx.restore();
      ctx.restore();
    }
    // where each ball is: flying from the pyramid to the heart
    const pos = PYR.map((b, i) => {
      const k = fly(seg(t, END + (i % 5) * 0.03, END + 0.5 + (i % 5) * 0.03));
      const to = b.top ? CENTER : heartAt(RING[i]);
      const arc = Math.sin(k * Math.PI) * 180;
      return [lerp(b.x, to[0], k), lerp(b.y, to[1], k) - arc, k];
    });
    // ring strands along the heart
    const ringCol = i => PYR[i].color;
    for (let i = 0; i < NR; i++) {
      const k = seg(t, END + 0.5 + i * 0.09, END + 0.5 + i * 0.09 + 0.25);
      if (k <= 0) continue;
      const a0 = RING[i], a1 = RING[i] + 1 / NR, pts = [];
      for (let s = 0; s <= 8; s++) pts.push(heartAt(lerp(a0, a1, s / 8)));
      const p = T.cut(pts, k);
      if (p.length > 1) strand(p, ringCol(i), { t, w: 16, wob: 3 });
    }
    // an inner heart, and spokes from the centre: the net
    const IN = 0.55;
    for (let i = 0; i < NR; i++) {
      const ks = seg(t, END + 1.5 + i * 0.05, END + 1.85 + i * 0.05);
      if (ks > 0) link(CENTER, pos[i], ks, i % 2 ? YARN.pink : YARN.lilac, t, { sag: 18, w: 9 });
    }
    for (let i = 0; i < NR; i++) {
      const k = seg(t, END + 2.1 + i * 0.05, END + 2.4 + i * 0.05);
      if (k <= 0) continue;
      const a = lerpPt(CENTER, pos[i], IN), b = lerpPt(CENTER, pos[(i + 1) % NR], IN);
      link(a, b, k, i % 2 ? YARN.mint : YARN.mustard, t, { sag: 10, w: 8 });
    }
    // knots where the net crosses
    for (let i = 0; i < NR; i++) {
      const k = seg(t, END + 2.2 + i * 0.05, END + 2.4 + i * 0.05); if (k <= 0) continue;
      const p = lerpPt(CENTER, pos[i], IN);
      circle(p[0], p[1], 10 * backOut(k), { fill: YARN.red, stroke: YARN.ink, lw: 4 });
    }
    // the balls, waving
    const wave = t > END + 0.6;
    PYR.forEach((b, i) => {
      const [x, y, k] = pos[i];
      const r = b.top ? 84 : 58;
      const bob = wave ? hop(t + (i % 4) * 0.08) * 14 : 0;
      yarnBall(x, y - bob, r, {
        t: t + i * 0.13, color: b.color, seed: b.seed, hat: b.hat, face: b.top ? 'grin' : ['happy', 'grin', 'love'][i % 3],
        arms: wave ? 'wave' : 'up', squash: pulse(t + (i % 4) * 0.08, 9) * 0.3, look: b.top ? 0 : (x < 540 ? 0.6 : -0.6),
      });
    });
    // 쓰하!
    const bk = seg(t, 55.4545, 55.4545 + 0.25);
    if (bk > 0) bubble(540, 985, '쓰하!', 104, { tail: 1, scale: backOut(bk) * (1 + 0.05 * pulse(t, 6)), rot: -0.04 + Math.sin(t * 2) * 0.02, fill: YARN.mustard });
    camEnd();
    // confetti on the boom and on the bubble
    confetti(still(t0), END, { burst: true, y: 900, n: 110, colors: [YARN.red, YARN.pink, YARN.mustard, YARN.mint, YARN.lilac, YARN.blue] });
    stitchTag(t, 53.6364, 99, '스쳐도 괜찮아,\n여긴 다 스친이니까', { size: 96, y: 300, colors: [YARN.red, YARN.blue] });
    // the credit
    const ck = seg(t, 56.3636, 56.8);
    if (ck > 0) {
      ctx.save(); ctx.globalAlpha = ck;
      handText('영상·음악 · Claude Code 로 만들었어요', 540, 1545 + (1 - ck) * 12, 40, YARN.ink, { outline: 10, outlineColor: '#FFFFFF' });
      ctx.restore();
    }
    flash(0.8 * punch(t0, END, 0.3));
  }
  const lerpPt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  chapter('why', 36.36, 60.5, [[36.36, bonus], [DROP, numbers], [END, ending]]);
})();
