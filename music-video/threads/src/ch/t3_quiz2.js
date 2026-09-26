// t3_quiz2 (21.82 – 36.36) · 3 · 퀴즈 3·4
//
// Same quiz stage and the same four contestants as questions 1–2 (t1_open / t2_quiz1), same card
// layout: word card at the top, 3·2·1 timer below it, the answer takes the timer's place.
//
// 21.82 Q.3 스린이. Timer 22.73, 땡 24.09, answer 24.55 (스레드 + 어린이\n= 스레드 초보) + 딩동댕!
//       26.36 다들 처음엔 스린이: a baby yarn ball with a sprout on its head waddles in along the
//       front of the stage (뒤뚱 뒤뚱), trips (꽈당!), and bounces back up to cheers.
// 29.09 Q.4 쓰하. Timer 30.00, 땡 31.36, answer 31.82 (스레드 하이!\n= 안녕!).
//       33.64 들어오면 인사부터: a new sprout hops in from the right, says 쓰하! and each contestant
//       waves back with a 쓰하~ bubble, one a beat. 36.0 the cards fly out.
//
// Also defines window.T34: the stage kit shared with t4_why.js. (The stage and cast are copied from
// t1_open.js so this file does not depend on it.)
(() => {
  const B = SONG.beat;

  // ---- small helpers ----------------------------------------------------------------------------
  const squashAt = (t, t0, amt = 0.5, len = 0.35) => {
    const a = t - t0; if (a < 0 || a > len) return 0;
    return amt * Math.exp(-a / len * 3.5) * Math.cos(a / len * TAU * 1.1);
  };
  const punch = (t, t0, len = 0.3) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 4));
  const at = (x, y, s, fn, rot = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); fn(); ctx.restore(); };

  /** Points along a polyline, cut to the first k (0..1) of its length. */
  function cut(pts, k) {
    if (k >= 1) return pts;
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const want = L[L.length - 1] * clamp(k), out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (L[i] <= want) { out.push(pts[i]); continue; }
      const f = (want - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
      break;
    }
    return out;
  }
  /** A strand of yarn from a to b with a sag, grown to k (0..1). */
  function link(a, b, k, color, t, o = {}) {
    if (k <= 0) return;
    const sag = o.sag ?? 60, n = 6, pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) + Math.sin(f * Math.PI) * sag]);
    }
    const p = cut(pts, clamp(k));
    if (p.length < 2 || Math.hypot(p[p.length - 1][0] - p[0][0], p[p.length - 1][1] - p[0][1]) < 2) return;
    strand(p, color, { t, w: o.w ?? 12, wob: o.wob ?? 3, alpha: o.alpha });
  }

  // ---- props --------------------------------------------------------------------------------------
  function glassesProp(x, y, r, rot = 0) {
    at(x, y, 1, () => {
      const ex = r * 0.3, er = r * 0.15 * 1.7;
      for (const sx of [-1, 1]) circle(sx * ex, 0, er, { fill: 'rgba(255,255,255,0.3)', stroke: YARN.ink, lw: 6 });
      stroke([[-ex + er, 0], [ex - er, 0]], YARN.ink, 6, { ink: null });
    }, rot);
  }
  /** The necktie on its own (knot at 0,0), same shape as in the opening. */
  function tieProp(x, y, r, rot = 0) {
    at(x, y, 1, () => poly([[-r * 0.08, 0], [r * 0.08, 0], [r * 0.12, r * 0.33], [0, r * 0.46], [-r * 0.12, r * 0.33]], { fill: YARN.blue, stroke: YARN.ink, lw: 5 }), rot);
  }
  function sweat(x, y, s = 1, rot = 0, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    smooth([[0, -30], [14, -2], [12, 14], [0, 20], [-12, 14], [-14, -2]], { fill: '#8FDCFF', stroke: YARN.ink, lw: 5, alpha });
    ell(-4, 4, 4, 7, { fill: '#FFFFFF', stroke: null, alpha: 0.8 * alpha });
    ctx.restore();
  }
  /** A baby yarn ball with a two-leaf sprout on top. */
  function sprout(x, y, r, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const sway = Math.sin((o.t ?? 0) * 7) * 0.15;
    ctx.save(); ctx.translate(0, -r * 0.92); ctx.rotate(sway);
    stroke([[0, 0], [0, -r * 0.45]], '#5BBF6A', r * 0.1, { ink: YARN.ink, olw: 7 });
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.translate(0, -r * 0.45); ctx.rotate(sx * 0.6);
      ell(sx * r * 0.3, 0, r * 0.32, r * 0.16, { fill: '#7ED87A', stroke: YARN.ink, lw: 5 });
      ctx.restore();
    }
    ctx.restore();
    yarnBall(0, 0, r, { t: o.t, color: o.color || YARN.cream, face: o.face || 'happy', arms: o.arms || 'none', squash: o.squash, seed: o.seed ?? 21, look: o.look });
    ctx.restore();
  }
  /** A floating '?' or '!' above a head. */
  function mark(t, ch, x, y, size, color, t0 = -1e9, seed = 0) {
    const a = t - t0, k = a < 0 ? 0 : backOut(clamp(a / 0.25));
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 5 + seed) * 8); ctx.scale(k, k); ctx.rotate(Math.sin(t * 4 + seed) * 0.15);
    handText(ch, 0, 0, size, color, { outline: 12, outlineColor: YARN.ink });
    ctx.restore();
  }

  // ---- the stage (the same show as questions 1–2) -------------------------------------------------
  const STAGE = {
    back: '#3B2358', back2: '#5B2F6E', ray: '#6A3C82', curtain: '#E0484E', curtainDk: '#A82E45',
    trim: YARN.mustard, floor: '#C77B4E', floorDk: '#8A4A36', podium: '#4A2A63', floorY: 1450,
  };
  const FLOOR_Y = STAGE.floorY;
  const RED = '#6A0A1A', REDLT = '#FF2A3A';

  function curtainPanel(t, side, al) {
    const sway = Math.sin(t * 1.3 + side) * 8;
    const inTop = 175, inMid = 105, inBot = 205;
    const X = x => (side < 0 ? x : W - x);
    const pts = [[X(-60), -20], [X(inTop), -20], [X(inTop - 10 + sway * 0.3), 500], [X(inMid + sway), 1080],
      [X(inBot + sway * 1.4), 1560], [X(inBot - 30), 1720], [X(-60), 1720]];
    const cA = mix(STAGE.curtain, REDLT, al * 0.3), cB = mix(STAGE.curtainDk, RED, al * 0.4);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.bezierCurveTo(pts[2][0], pts[2][1], pts[2][0], 800, pts[3][0], pts[3][1]);
    ctx.bezierCurveTo(pts[3][0], 1300, pts[4][0], 1400, pts[4][0], pts[4][1]);
    ctx.lineTo(pts[5][0], pts[5][1]); ctx.lineTo(pts[6][0], pts[6][1]); ctx.closePath();
    const x0 = X(-60), x1 = X(inTop), fold = 70, stops = [];
    const n = Math.max(2, Math.round(Math.abs(x1 - x0) / fold));
    for (let i = 0; i <= n; i++) stops.push([i / n, i % 2 ? cB : cA]);
    ctx.fillStyle = lgrad(x0, 0, x1, 0, stops); ctx.fill();
    ctx.strokeStyle = YARN.ink; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.clip();
    ctx.fillStyle = lgrad(X(inTop), 0, X(inTop - 120), 0, [[0, 'rgba(40,10,40,0.3)'], [1, 'rgba(40,10,40,0)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const tx = X(inMid + sway);
    strand([[X(-20), 1050], [lerp(X(-20), tx, 0.6), 1100], [tx + side * 10, 1080]], STAGE.trim, { t, w: 18, wob: 3 });
    circle(tx, 1080, 22, { fill: STAGE.trim, stroke: YARN.ink, lw: 5 });
  }
  function valance(t, al = 0) {
    const h = 150, sc = 135;
    ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(W + 60, -20); ctx.lineTo(W + 60, h);
    for (let x = W + 60; x > -60; x -= sc) ctx.quadraticCurveTo(x - sc / 2, h + 70, x - sc, h);
    ctx.closePath();
    ctx.fillStyle = lgrad(0, 0, 0, h + 60, [[0, mix(STAGE.curtainDk, RED, al * 0.4)], [1, mix(STAGE.curtain, REDLT, al * 0.3)]]); ctx.fill();
    ctx.strokeStyle = YARN.ink; ctx.lineWidth = 7; ctx.stroke();
    ctx.save(); ctx.setLineDash([20, 14]); ctx.strokeStyle = STAGE.trim; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-60, h - 24); ctx.lineTo(W + 60, h - 24); ctx.stroke(); ctx.restore();
    const on = beatN(t) % 2, red = al > 0.5;
    for (let i = 0; i < 12; i++) {
      const x = 45 + i * 90, lit = (i % 2) === on, p = lit ? pulse(t, 5) : 0;
      if (lit) glow(x, 70, 70, red ? '#FF5A5A' : '#FFE08A', 0.35 + 0.35 * p);
      circle(x, 70, 17, { fill: lit ? (red ? '#FFB4B4' : '#FFF3B0') : '#B58A3A', stroke: YARN.ink, lw: 5 });
    }
  }
  /** The quiz stage backdrop (paint inside the camera). o.alarm 0..1 turns it red; o.behind() paints before the curtains. */
  function stage(t, o = {}) {
    const al = o.alarm ?? 0;
    knitBg(t, mix(STAGE.back, '#4A0814', al), mix(STAGE.back2, '#7A1020', al), { ink: '#FFFFFF', alpha: 0.05, stitch: 60 });
    ctx.save(); ctx.globalAlpha = 0.45 + 0.25 * pulse(t, 4);
    sunburst(540, 620, mix(STAGE.ray, '#A01A2A', al), mix(STAGE.back, '#4A0814', al), t * 0.12 + al * t * 0.6, 20, 1500);
    ctx.restore();
    glow(540, 620, 700, al > 0.5 ? '#FF3040' : '#FF8CC6', 0.12 + 0.08 * pulse(t, 5));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 0.9 + s) * 60;
      ctx.beginPath(); ctx.moveTo(540 + s * 380, 120); ctx.lineTo(540 + sw - 330, FLOOR_Y + 60); ctx.lineTo(540 + sw + 330, FLOOR_Y + 60); ctx.closePath();
      const c = al > 0.5 ? '255,80,90' : '255,240,200';
      ctx.fillStyle = lgrad(0, 120, 0, FLOOR_Y, [[0, `rgba(${c},0.18)`], [1, `rgba(${c},0.02)`]]); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = lgrad(0, FLOOR_Y, 0, H, [[0, mix(STAGE.floor, '#8A2A2A', al * 0.6)], [1, mix(STAGE.floorDk, '#3A0A10', al * 0.6)]]);
    ctx.fillRect(-60, FLOOR_Y, W + 120, H - FLOOR_Y + 60);
    stroke([[-60, FLOOR_Y], [W + 60, FLOOR_Y]], YARN.ink, 7, { ink: null });
    ctx.save(); ctx.setLineDash([26, 18]); ctx.strokeStyle = mix(STAGE.floor, '#FFFFFF', 0.35); ctx.lineWidth = 5;
    for (const y of [FLOOR_Y + 26, FLOOR_Y + 150, FLOOR_Y + 300]) { ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(W + 60, y); ctx.stroke(); }
    ctx.restore();
    ell(540, FLOOR_Y + 110, 460, 70, { fill: 'rgba(255,240,200,0.18)', stroke: null });
    if (o.tint) fillScreen(o.tint[0], o.tint[1]);
    o.behind && o.behind();
    curtainPanel(t, -1, al); curtainPanel(t, 1, al);
    valance(t, al);
  }

  // ---- contestants (the same four as questions 1–2) ---------------------------------------------
  const ROW_Y = 1320, R = 100;
  const CAST = [
    { x: 175, color: YARN.coral, hat: 'bow', seed: 3, idle: 'happy' },
    { x: 415, color: YARN.mint, seed: 5, idle: 'smug' },
    { x: 665, color: YARN.lilac, hat: 'beanie', seed: 7, idle: 'happy' },
    { x: 905, color: YARN.mustard, seed: 9, idle: 'wink' },
  ];
  // the stiff one from the opening
  const STIFF = { color: YARN.blue, seed: 2 };

  function podium(x, i, t, o = {}) {
    const c = CAST[i].color, top = ROW_Y + 20, w = 206, h = 230;
    const lit = o.buzz ?? 0;
    if (lit > 0) glow(x + 55, top - 6, 90, '#FF6B6B', 0.6 * lit);
    ell(x + 55, top - 2, 30, 22, { fill: lit > 0.3 ? '#FF4A5A' : '#D9364A', stroke: YARN.ink, lw: 5 });
    rrect(x + 22, top - 4, 66, 14, 6, { fill: '#3A3040', stroke: YARN.ink, lw: 4 });
    rrect(x - w / 2 + 8, top + 10, w, h, 22, { fill: 'rgba(20,10,30,0.35)', stroke: null });
    rrect(x - w / 2, top, w, h, 22, { fill: STAGE.podium, stroke: YARN.ink, lw: 7 });
    rrect(x - w / 2 + 16, top + 22, w - 32, h - 54, 16, { fill: c, stroke: YARN.ink, lw: 5 });
    ctx.setLineDash([14, 10]); rrect(x - w / 2 + 28, top + 34, w - 56, h - 78, 10, { fill: null, stroke: mix(c, YARN.ink, 0.4), lw: 4 }); ctx.setLineDash([]);
    const bb = 1 + 0.12 * pulse(t + i * 0.1, 6);
    poly(heartPts(x, top + 88, 34 * bb), { fill: '#FFFFFF', stroke: YARN.ink, lw: 5 });
  }
  /**
   * The contestant row: balls behind podiums. st(i) → { face, arms, dy (up), sq, look, x, rot, buzz, hide }.
   * Returns the resolved states.
   */
  function row(t, st, o = {}) {
    const S = CAST.map((c, i) => ({ x: c.x, dy: 0, sq: 0, face: c.idle, arms: 'none', look: 0, rot: 0, ...st(i) }));
    CAST.forEach((c, i) => {
      const s = S[i]; if (s.hide) return;
      ctx.save(); ctx.translate(s.x, ROW_Y - s.dy); ctx.rotate(s.rot);
      yarnBall(0, 0, R, { t, color: c.color, face: s.face, arms: s.arms, hat: c.hat, seed: c.seed, squash: s.sq, look: s.look });
      ctx.restore();
    });
    if (o.podiums !== false) CAST.forEach((c, i) => podium(o.podX ? o.podX[i] : c.x, i, t, { buzz: S[i].buzz }));
    return S;
  }

  /** Camera with beat breathing and punches on the hits. */
  function stageCam(t, hits, o = {}) {
    let p = 0, sh = [0, 0];
    for (const h of hits) {
      p = Math.max(p, punch(t, h, 0.3));
      const s = shakeXY(t, h, o.shake ?? 14, 0.25); sh = [sh[0] + s[0], sh[1] + s[1]];
    }
    camBegin(540 + sh[0] + (o.dx ?? 0), 960 + sh[1] + (o.dy ?? 0), (o.zoom ?? 1) + 0.012 * pulse(t, 6) + 0.05 * p);
  }

  window.T34 = { B, CAST, STIFF, STAGE, FLOOR_Y, ROW_Y, R, squashAt, punch, at, cut, link, glassesProp, tieProp, sweat, sprout, mark, stage, valance, podium, row, stageCam };

  // ---- a quiz question (the same beat plan and layout as questions 1–2) ---------------------------
  const CARD_Y = 565, TIMER = [540, 985], ANS_Y = 990, SUB_Y = 800;

  function quiz(t, Q, st, extra, under) {
    const ding = Q.tim + 3 * B;
    stageCam(t, [Q.q0, Q.tim, ding, Q.ans, ...(Q.hits || [])]);
    stage(t, { tint: t >= ding && t < Q.ans ? ['#FF3050', 0.18 * (1 - seg(t, ding, Q.ans))] : null });
    under && under(t);
    const S = row(t, i => {
      const ph = i * 0.06, base = { dy: hop(t + ph) * 22, sq: pulse(t + ph, 9) * 0.3 };
      let s;
      if (t < Q.tim) s = { ...base, look: (i < 2 ? 1 : -1) * 0.6 };
      else if (t < ding) s = { face: 'think', dy: hop(t + ph) * 8, rot: Math.sin(t * 3 + i * 1.7) * 0.1, look: Math.sin(t * 2 + i) };
      else if (t < Q.ans) s = { face: 'shock', dy: 70 * Math.exp(-(t - ding) * 5) + 8, sq: squashAt(t, ding, -0.5, 0.3), buzz: 1 - seg(t, ding, Q.ans) * 0.5 };
      else s = { face: 'grin', arms: 'up', dy: hop(t + ph) * 50, sq: pulse(t + ph, 9) * 0.45, buzz: 0.4 * pulse(t, 4) };
      return { ...s, ...(st ? st(i, t, s) : {}) };
    });
    CAST.forEach((c, i) => {
      const y = ROW_Y - S[i].dy - R - 70;
      if (t >= Q.tim && t < ding) mark(t, '?', S[i].x + (i % 2 ? 40 : -40), y, 96, '#FFFFFF', Q.tim + i * 0.08, i);
      if (t >= ding && t < Q.ans) mark(t, '!', S[i].x, y - 10, 110, YARN.red, ding, i);
    });
    // the cards (fly out at the end)
    const out = easeIn(seg(t, Q.end - 0.32, Q.end));
    const bob = 1 + 0.02 * pulse(t, 6);
    ctx.save(); ctx.translate(-1300 * out, 0);
    ctx.translate(540, CARD_Y); ctx.scale(bob, bob); ctx.translate(-540, -CARD_Y);
    quizWord(t, Q.q0, Q.word, { q: Q.q, y: CARD_Y, fill: Q.fill, size: 200 });
    ctx.restore();
    if (t >= Q.q0 && t < Q.q0 + 0.5) sfx('쾅!', 870, CARD_Y - 200, 90, YARN.red, t - Q.q0, { life: 0.5, rot: 0.15 });
    if (t < Q.ans) timer(t, Q.tim, TIMER[0], TIMER[1], 115);
    ctx.save(); ctx.translate(1300 * out, 0);
    answer(t, Q.ans, Q.answer, { y: ANS_Y, size: Q.asize || 92, fill: Q.afill });
    ctx.restore();
    if (t >= Q.ans && t < Q.ans + 0.6) {
      const a = t - Q.ans;
      ctx.save(); ctx.globalAlpha = 1 - a / 0.6;
      circle(540, ANS_Y, 120 + a * 1100, { fill: null, stroke: '#FFFFFF', lw: 18 * (1 - a / 0.6) });
      ctx.restore();
    }
    sfx('딩동댕!', 540, SUB_Y - 20, 96, YARN.mustard, t - Q.ans - 0.05, { life: 1.0, rot: -0.05 });
    extra && extra(t, S);
    camEnd();
    confetti(t, Q.ans, { burst: true, y: 1150, n: 120, colors: [YARN.pink, YARN.mustard, YARN.mint, YARN.blue, YARN.lilac, YARN.coral] });
    stitchSub(t, Q.sub, Q.end - 0.1, Q.subText, { y: SUB_Y, size: 64 });
    flash(0.35 * punch(t, Q.ans, 0.2));
  }

  // ---- Q.3 · 스린이 -------------------------------------------------------------------------------
  const Q3 = {
    q0: 21.8182, tim: 22.7273, ans: 24.5455, sub: 26.3636, end: 29.0909, hits: [23.6364],
    word: '스린이', q: 'Q.3', answer: '스레드 + 어린이\n= 스레드 초보', subText: '다들 처음엔 스린이',
    fill: YARN.teal, afill: YARN.pink, asize: 80,
  };
  // the sprout waddles in along the front of the stage, trips, and bounces back up
  const SPROUT_Y = 1580, SR = 72;
  const TRIP = Q3.sub + 3 * B, UP = Q3.sub + 4 * B;          // 27.73 · 28.18
  function sproutState(t) {
    const lt = t - Q3.sub;
    if (lt < 0) return null;
    const w = beatOf(t) * Math.PI;
    let x = lerp(-100, 480, clamp(lt / (TRIP - Q3.sub))), rot = Math.sin(w) * 0.25, dy = Math.abs(Math.sin(w)) * 26,
      face = 'happy', arms = 'none', sq = pulse(t, 9) * 0.25;
    if (t >= TRIP && t < UP) {
      const k = easeOut(clamp((t - TRIP) / 0.16));
      x = 480 + k * 40; rot = k * 1.45; dy = -k * 18; face = 'cry'; sq = 0.25 * k;
    } else if (t >= UP) {
      const k = clamp((t - UP) / 0.32);
      x = 520; rot = 1.45 * (1 - easeOut(k)); dy = Math.sin(Math.PI * k) * 110 + (k >= 1 ? hop(t) * 30 : 0); face = 'grin'; arms = 'up';
      sq = k < 1 ? -0.2 * Math.sin(Math.PI * k) : pulse(t, 9) * 0.35;
    }
    return { x, y: SPROUT_Y - dy, rot, face, arms, sq };
  }

  function q3(t) {
    const sp = sproutState(t);
    quiz(t, Q3, (i, tt) => {
      if (!sp) return {};
      const look = clamp((sp.x - CAST[i].x) / 150, -1, 1);
      if (tt < TRIP) return { face: 'love', arms: 'none', dy: hop(tt + i * 0.06) * 20, look };
      if (tt < UP) return { face: 'shock', arms: 'none', dy: 40 * punch(tt, TRIP, 0.3), look };
      return { face: i % 2 ? 'grin' : 'love', arms: 'up', dy: hop(tt + i * 0.06) * 44, sq: pulse(tt, 9) * 0.4, look, buzz: pulse(tt, 5) };
    }, (tt) => {
      if (!sp) return;
      ell(sp.x, SPROUT_Y + SR - 4, SR * 0.85, 14, { fill: 'rgba(20,10,30,0.4)', stroke: null });
      sprout(sp.x, sp.y, SR, { t: tt, face: sp.face, arms: sp.arms, rot: sp.rot, squash: sp.sq, look: 1 });
      if (tt < TRIP - 0.1) sfx('뒤뚱', sp.x + (beatN(tt) % 2 ? 40 : -40), sp.y - 150, 56, '#FFFFFF', frac(beatOf(tt)) * B, { life: B * 0.95, rot: beatN(tt) % 2 ? 0.14 : -0.14 });
      sfx('꽈당!', 700, 1440, 100, YARN.red, tt - TRIP, { life: 0.75, rot: 0.1 });
      if (tt >= UP + 0.2) for (let k = 0; k < 3; k++) sparkle(sp.x + [-110, 105, 70][k], sp.y - [70, 100, -20][k], 24 * (0.4 + 0.6 * pulse(tt + k * 0.15, 4)), YARN.mustard, tt * 3 + k);
    });
  }

  // ---- Q.4 · 쓰하 --------------------------------------------------------------------------------
  const Q4 = {
    q0: 29.0909, tim: 30.0, ans: 31.8182, sub: 33.6364, end: 36.3636, hits: [30.9091],
    word: '쓰하', q: 'Q.4', answer: '스레드 하이!\n= 안녕!', subText: '들어오면 인사부터',
    fill: YARN.pink, afill: YARN.mustard, asize: 84,
  };
  // a new sprout comes in from the right; it says hi first, then everyone waves back, one a beat
  const HELLO = [{ who: -1, t: Q4.sub + B }, { who: 3, t: Q4.sub + 2 * B }, { who: 2, t: Q4.sub + 3 * B }, { who: 1, t: Q4.sub + 4 * B }, { who: 0, t: Q4.sub + 5 * B }];
  const newX = t => lerp(1220, 790, easeOut(seg(t, Q4.sub, Q4.sub + B * 1.2)));

  function q4(t) {
    const nx = newX(t);
    quiz(t, Q4, (i, tt) => {
      if (tt < Q4.sub) return {};
      const said = HELLO.find(h => h.who === i), hot = tt >= said.t;
      return {
        face: hot ? ['grin', 'love', 'grin', 'love'][i] : 'happy', arms: hot ? 'wave' : 'none',
        dy: hop(tt + i * 0.06) * (hot ? 30 : 16), sq: pulse(tt + i * 0.06, 9) * 0.3, look: clamp((nx - CAST[i].x) / 150, -1, 1),
        rot: hot ? 0.1 * Math.sin(tt * 6 + i) : 0,
      };
    }, (tt, S) => {
      if (tt < Q4.sub) return;
      const walking = tt < Q4.sub + B * 1.2;
      const ny = SPROUT_Y - Math.abs(Math.sin(beatOf(tt) * Math.PI)) * (walking ? 30 : 14);
      ell(nx, SPROUT_Y + SR - 4, SR * 0.85, 14, { fill: 'rgba(20,10,30,0.4)', stroke: null });
      sprout(nx, ny, SR, { t: tt, face: tt < HELLO[0].t ? 'happy' : 'grin', arms: tt < HELLO[0].t ? 'none' : 'wave', rot: Math.sin(beatOf(tt) * Math.PI) * 0.15, look: -1, color: '#FFE3C2', seed: 23 });
      // 쓰하 bubbles, one a beat
      for (const h of HELLO) {
        const age = tt - h.t; if (age < 0) continue;
        const me = h.who < 0;
        const x = me ? nx - 70 : S[h.who].x + (h.who === 0 ? 20 : 0), y = me ? SPROUT_Y - 175 : ROW_Y - S[h.who].dy - R - 95;
        const s = backOut(clamp(age / 0.2)) * (1 + 0.05 * pulse(tt, 8));
        bubble(x, y, me ? '쓰하!' : '쓰하~', me ? 54 : 46, { tail: me ? 1 : -1, scale: s, rot: me ? 0.06 : (h.who - 1.5) * 0.05, fill: me ? YARN.mustard : '#FFFFFF' });
      }
    });
    if (t > Q4.sub + 5 * B) { ctx.save(); ctx.globalAlpha = seg(t, Q4.sub + 5 * B, Q4.sub + 5.5 * B); hearts(t, 10, 120, 1150, 840, 250, { alpha: 0.7 }); ctx.restore(); }
  }

  chapter('quiz2', 21.82, 36.36, [[21.82, q3], [29.0909, q4]]);
})();
