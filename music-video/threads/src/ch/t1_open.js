// t1_open (0 – 7.27) · 1 · 첫날
//
// 0.00  A phone feed on a pink knit wall. A stiff yarn ball (tie + glasses, dot eyes) types his
//       first post, letter by letter: "안녕하십니까.\n오늘 가입했습니다." 1.82 he hits send (톡!)
//       and bows. Three yarn balls peek in from the edges on the beats (빼꼼), shocked. Tag 스레드 첫날.
// 3.64  Close on the stiff ball; replies stack up as speech bubbles, one a beat: 쓰하~ · 반가워! ·
//       여긴 반말이야~ · a heart. Hearts float up, he trembles and sweats harder every beat, and at
//       7.0 his necktie snaps off and flies away (툭!).
//
// Also defines window.T12: the quiz-show stage and contestant row shared with t2_quiz1.js.
(() => {
  const B = SONG.beat;

  // ---- shared helpers (window.T12) -----------------------------------------------------------------

  /** A squash that lands at t0 and wobbles out: 0 → amt → 0. */
  const squashAt = (t, t0, amt = 0.5, len = 0.35) => {
    const a = t - t0; if (a < 0 || a > len) return 0;
    return amt * Math.exp(-a / len * 3.5) * Math.cos(a / len * TAU * 1.1);
  };
  /** A punch 1 → 0 after t0. */
  const punch = (t, t0, len = 0.3) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 4));

  /** A falling sweat drop (teardrop), tip up. */
  function sweat(x, y, s = 1, rot = 0, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    smooth([[0, -30], [14, -2], [12, 14], [0, 20], [-12, 14], [-14, -2]], { fill: '#8FDcFF', stroke: YARN.ink, lw: 5, alpha });
    ell(-4, 4, 4, 7, { fill: '#FFFFFF', stroke: null, alpha: 0.8 * alpha });
    ctx.restore();
  }

  /** The necktie on its own (knot at 0,0), r = the ball radius it came from. */
  function tie(x, y, r, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    poly([[-r * 0.08, 0], [r * 0.08, 0], [r * 0.12, r * 0.33], [0, r * 0.46], [-r * 0.12, r * 0.33]], { fill: YARN.blue, stroke: YARN.ink, lw: 5 });
    ctx.restore();
  }

  /** A speech bubble with a big heart in it. */
  function heartBubble(x, y, size, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.scale !== undefined) ctx.scale(o.scale, o.scale);
    const w = size * 2.1, h = size * 1.7, tail = o.tail ?? -1;
    poly([[tail * w * 0.15, h / 2 - 4], [tail * w * 0.34, h / 2 + size * 0.55], [tail * w * 0.0, h / 2 - 4]], { fill: '#FFFFFF', stroke: YARN.ink, lw: 6 });
    rrect(-w / 2, -h / 2, w, h, h / 2, { fill: '#FFFFFF', stroke: YARN.ink, lw: 6 });
    poly([[tail * w * 0.15, h / 2 - 7], [tail * w * 0.32, h / 2 + size * 0.45], [tail * w * 0.02, h / 2 - 7]], { fill: '#FFFFFF', stroke: null });
    const b = 1 + 0.15 * (o.beat ?? 0);
    poly(heartPts(0, 2, size * 0.62 * b), { fill: YARN.red, stroke: YARN.ink, lw: 5 });
    ctx.restore();
  }

  /** A little felt badge with an icon: 'follow' | 'heart' | 'repost'. */
  function badge(kind, x, y, r, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(o.s ?? 1, o.s ?? 1);
    circle(4, 6, r, { fill: 'rgba(40,20,50,0.3)', stroke: null });
    circle(0, 0, r, { fill: o.fill || YARN.cream, stroke: YARN.ink, lw: 6 });
    ctx.setLineDash([9, 7]); circle(0, 0, r - 9, { fill: null, stroke: mix(o.fill || YARN.cream, YARN.ink, 0.4), lw: 4 }); ctx.setLineDash([]);
    const k = r / 50;
    if (kind === 'heart') poly(heartPts(0, 2, 30 * k), { fill: YARN.red, stroke: YARN.ink, lw: 5 });
    else if (kind === 'follow') {
      circle(-8 * k, -10 * k, 11 * k, { fill: YARN.blue, stroke: YARN.ink, lw: 4 });
      smooth([[-26 * k, 20 * k], [-8 * k, 2 * k], [10 * k, 20 * k]], { fill: YARN.blue, stroke: YARN.ink, lw: 4 });
      stroke([[18 * k, -6 * k], [18 * k, 16 * k]], YARN.ink, 6 * k, { ink: null });
      stroke([[7 * k, 5 * k], [29 * k, 5 * k]], YARN.ink, 6 * k, { ink: null });
    } else if (kind === 'repost') {
      const c = YARN.teal;
      stroke([[-20 * k, 6 * k], [-20 * k, -12 * k], [16 * k, -12 * k]], c, 6 * k, { ink: YARN.ink, olw: 5 });
      poly([[12 * k, -21 * k], [24 * k, -12 * k], [12 * k, -3 * k]], { fill: c, stroke: YARN.ink, lw: 3 });
      stroke([[20 * k, -6 * k], [20 * k, 12 * k], [-16 * k, 12 * k]], c, 6 * k, { ink: YARN.ink, olw: 5 });
      poly([[-12 * k, 3 * k], [-24 * k, 12 * k], [-12 * k, 21 * k]], { fill: c, stroke: YARN.ink, lw: 3 });
    }
    ctx.restore();
  }

  // ---- the quiz-show stage -------------------------------------------------------------------------
  // Deep plum knit backdrop with slow sunburst rays, red felt curtains with a scalloped valance and
  // marquee bulbs that blink on the beat, a warm felt stage floor, a row of podiums.

  const STAGE = {
    back: '#3B2358', back2: '#5B2F6E', ray: '#6A3C82', curtain: '#E0484E', curtainDk: '#A82E45',
    trim: YARN.mustard, floor: '#C77B4E', floorDk: '#8A4A36', podium: '#4A2A63', floorY: 1450,
  };

  function curtainPanel(t, side, open) {
    // side -1 = left, 1 = right. open 0 → meets in the middle, 1 → gathered at the edge.
    const sway = Math.sin(t * 1.3 + side) * 8;
    const inTop = lerp(W / 2 + 20, 175, open), inMid = lerp(W / 2 + 20, 105, open), inBot = lerp(W / 2 + 20, 205, open);
    const X = x => (side < 0 ? x : W - x);
    const pts = [[X(-60), -20], [X(inTop), -20], [X(inTop - 10 + sway * 0.3), 500], [X(inMid + sway), 1080],
      [X(inBot + sway * 1.4), 1560], [X(inBot - 30), 1720], [X(-60), 1720]];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.bezierCurveTo(pts[2][0], pts[2][1], pts[2][0], 800, pts[3][0], pts[3][1]);
    ctx.bezierCurveTo(pts[3][0], 1300, pts[4][0], 1400, pts[4][0], pts[4][1]);
    ctx.lineTo(pts[5][0], pts[5][1]); ctx.lineTo(pts[6][0], pts[6][1]); ctx.closePath();
    const x0 = X(-60), x1 = X(inTop), fold = 70, stops = [];
    const span = Math.abs(x1 - x0), n = Math.max(2, Math.round(span / fold));
    for (let i = 0; i <= n; i++) stops.push([i / n, i % 2 ? STAGE.curtainDk : STAGE.curtain]);
    ctx.fillStyle = lgrad(x0, 0, x1, 0, stops); ctx.fill();
    ctx.strokeStyle = YARN.ink; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.clip();
    // soft shade toward the inner edge
    ctx.fillStyle = lgrad(X(inTop), 0, X(inTop - 120 * side * side), 0, [[0, 'rgba(40,10,40,0.3)'], [1, 'rgba(40,10,40,0)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    if (open > 0.4) {
      // a mustard yarn tie-back
      const tx = X(inMid + sway), a = clamp((open - 0.4) / 0.3);
      strand([[X(-20), 1050], [lerp(X(-20), tx, 0.6), 1100], [tx + side * 10, 1080]], STAGE.trim, { t, w: 18, wob: 3, alpha: a });
      circle(tx, 1080, 22, { fill: STAGE.trim, stroke: YARN.ink, lw: 5, alpha: a });
    }
  }

  function valance(t) {
    const h = 150, sc = 135;
    ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(W + 60, -20); ctx.lineTo(W + 60, h);
    for (let x = W + 60; x > -60; x -= sc) ctx.quadraticCurveTo(x - sc / 2, h + 70, x - sc, h);
    ctx.closePath();
    ctx.fillStyle = lgrad(0, 0, 0, h + 60, [[0, STAGE.curtainDk], [1, STAGE.curtain]]); ctx.fill();
    ctx.strokeStyle = YARN.ink; ctx.lineWidth = 7; ctx.stroke();
    // stitched trim
    ctx.save(); ctx.setLineDash([20, 14]); ctx.strokeStyle = STAGE.trim; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-60, h - 24); ctx.lineTo(W + 60, h - 24); ctx.stroke(); ctx.restore();
    // marquee bulbs blink on the beat
    const on = beatN(t) % 2;
    for (let i = 0; i < 12; i++) {
      const x = 45 + i * 90, lit = (i % 2) === on, p = lit ? pulse(t, 5) : 0;
      if (lit) glow(x, 70, 70, '#FFE08A', 0.35 + 0.35 * p);
      circle(x, 70, 17, { fill: lit ? '#FFF3B0' : '#B58A3A', stroke: YARN.ink, lw: 5 });
    }
  }

  /** The whole stage backdrop (paint inside the camera). o.open curtains 0..1, o.tint alarm colour. */
  function stage(t, o = {}) {
    const open = o.open ?? 1;
    knitBg(t, STAGE.back, STAGE.back2, { ink: '#FFFFFF', alpha: 0.05, stitch: 60 });
    // slow rays behind the card
    ctx.save(); ctx.globalAlpha = 0.45 + 0.25 * pulse(t, 4);
    sunburst(540, 620, STAGE.ray, STAGE.back, t * 0.12, 20, 1500);
    ctx.restore();
    glow(540, 620, 700, '#FF8CC6', 0.12 + 0.08 * pulse(t, 5));
    // spotlights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 0.9 + s) * 60;
      ctx.beginPath(); ctx.moveTo(540 + s * 380, 120); ctx.lineTo(540 + sw - 330, STAGE.floorY + 60); ctx.lineTo(540 + sw + 330, STAGE.floorY + 60); ctx.closePath();
      ctx.fillStyle = lgrad(0, 120, 0, STAGE.floorY, [[0, 'rgba(255,240,200,0.18)'], [1, 'rgba(255,240,200,0.02)']]); ctx.fill();
    }
    ctx.restore();
    // floor
    ctx.fillStyle = lgrad(0, STAGE.floorY, 0, H, [[0, STAGE.floor], [1, STAGE.floorDk]]);
    ctx.fillRect(-60, STAGE.floorY, W + 120, H - STAGE.floorY + 60);
    stroke([[-60, STAGE.floorY], [W + 60, STAGE.floorY]], YARN.ink, 7, { ink: null });
    ctx.save(); ctx.setLineDash([26, 18]); ctx.strokeStyle = mix(STAGE.floor, '#FFFFFF', 0.35); ctx.lineWidth = 5;
    for (const y of [STAGE.floorY + 26, STAGE.floorY + 150, STAGE.floorY + 300]) { ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(W + 60, y); ctx.stroke(); }
    ctx.restore();
    ell(540, STAGE.floorY + 110, 460, 70, { fill: 'rgba(255,240,200,0.18)', stroke: null });
    if (o.tint) fillScreen(o.tint[0], o.tint[1]);
    o.behindCurtain && o.behindCurtain();
    curtainPanel(t, -1, open); curtainPanel(t, 1, open);
    valance(t);
  }

  // ---- contestants ---------------------------------------------------------------------------------

  const ROW_Y = 1310, R = 106;
  const CAST = [
    { x: 175, color: YARN.coral, hat: 'bow', seed: 3, idle: 'happy' },
    { x: 415, color: YARN.mint, seed: 5, idle: 'smug' },
    { x: 665, color: YARN.lilac, hat: 'beanie', seed: 7, idle: 'happy' },
    { x: 905, color: YARN.mustard, seed: 9, idle: 'wink' },
  ];

  function podium(x, i, t, o = {}) {
    const c = CAST[i].color, top = ROW_Y + 62, w = 212, h = 214;
    // buzzer
    const lit = o.buzz ?? 0;
    if (lit > 0) glow(x + 72, top - 4, 90, '#FF6B6B', 0.6 * lit);
    ell(x + 72, top, 24, 17, { fill: lit > 0.3 ? '#FF4A5A' : '#D9364A', stroke: YARN.ink, lw: 5 });
    rrect(x + 44, top - 2, 56, 12, 6, { fill: '#3A3040', stroke: YARN.ink, lw: 4 });
    // body
    rrect(x - w / 2 + 8, top + 10, w, h, 22, { fill: 'rgba(20,10,30,0.35)', stroke: null });
    rrect(x - w / 2, top, w, h, 22, { fill: STAGE.podium, stroke: YARN.ink, lw: 7 });
    rrect(x - w / 2 + 16, top + 22, w - 32, h - 54, 16, { fill: c, stroke: YARN.ink, lw: 5 });
    ctx.setLineDash([14, 10]); rrect(x - w / 2 + 28, top + 34, w - 56, h - 78, 10, { fill: null, stroke: mix(c, YARN.ink, 0.4), lw: 4 }); ctx.setLineDash([]);
    const e = o.emblem || 'heart', bb = 1 + 0.12 * pulse(t + i * 0.1, 6);
    if (typeof e === 'function') e(x, top + (h - 32) / 2 + 11);
    else if (e === 'heart') poly(heartPts(x, top + 85, 34 * bb), { fill: '#FFFFFF', stroke: YARN.ink, lw: 5 });
    else badge(e, x, top + 85, 44 * bb, { fill: '#FFFFFF' });
  }

  /**
   * The contestant row: balls behind podiums. st(i) → { face, arms, dy, sq, look, x, rot, buzz, emblem }.
   * front(i, x, y) paints anything that should sit on top of ball i but under the podium.
   */
  function row(t, st, o = {}) {
    const S = CAST.map((c, i) => ({ x: c.x, dy: 0, sq: 0, face: c.idle, arms: 'none', look: 0, rot: 0, ...st(i) }));
    const order = o.order || [0, 1, 2, 3];
    for (const i of order) {
      const c = CAST[i], s = S[i];
      ctx.save(); ctx.translate(s.x, ROW_Y - s.dy); ctx.rotate(s.rot);
      yarnBall(0, 0, R, { t, color: c.color, face: s.face, arms: s.arms, hat: c.hat, seed: c.seed, squash: s.sq, look: s.look });
      ctx.restore();
    }
    for (const i of [0, 1, 2, 3]) podium(CAST[i].x, i, t, { buzz: S[i].buzz, emblem: S[i].emblem });
    return S;
  }

  /** A floating '?' or '!' mark above a head. */
  function mark(t, ch, x, y, size, color, t0 = -1e9, seed = 0) {
    const a = t - t0, k = a < 0 ? 0 : backOut(clamp(a / 0.25));
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 5 + seed) * 8); ctx.scale(k, k); ctx.rotate(Math.sin(t * 4 + seed) * 0.15);
    handText(ch, 0, 0, size, color, { outline: 12, outlineColor: YARN.ink });
    ctx.restore();
  }

  window.T12 = { B, squashAt, punch, sweat, tie, heartBubble, badge, stage, podium, row, mark, CAST, STAGE, ROW_Y, R };

  // ---- shot A · the first post ---------------------------------------------------------------------

  const POST = '안녕하십니까.\n오늘 가입했습니다.';
  const SEND = 4 * B;                         // 1.82: the post goes up

  function greyPost(y, seed) {
    circle(44, y + 44, 32, { fill: '#E8E1EA', stroke: null });
    rrect(96, y + 20, 110 + hash(seed, 1) * 60, 20, 10, { fill: '#E8E1EA', stroke: null });
    rrect(96, y + 60, 250 + hash(seed, 2) * 80, 22, 11, { fill: '#F0EBF2', stroke: null });
    rrect(96, y + 96, 180 + hash(seed, 3) * 100, 22, 11, { fill: '#F0EBF2', stroke: null });
  }

  function firstPost(t, lt) {
    knitBg(t, '#FFF0E4', '#FFC9DC', { alpha: 0.09 });
    const hit = punch(t, SEND, 0.35);
    const [sx, sy] = shakeXY(t, SEND, 10, 0.25);
    camBegin(540 + sx, 1000 + sy - lt * 10, 1 + lt * 0.02 + hit * 0.04);

    // the phone
    const up = backOut(seg(t, 0, 0.4));
    const px = 590, py = 1080 + (1 - up) * 900;
    phoneFeed(px, py, 1.12 * (1 + 0.012 * pulse(t, 6)), (w, h) => {
      // header: a plain bar, no logo
      ctx.fillStyle = '#FBF7FC'; ctx.fillRect(0, 0, w, 80);
      stroke([[0, 80], [w, 80]], '#E3DAE6', 3, { ink: null });
      rrect(w / 2 - 40, 34, 80, 14, 7, { fill: '#E3DAE6', stroke: null });
      // the post: typed, then sent
      const sent = t >= SEND;
      const n = Math.floor(seg(t, 0.4, 1.55) * [...POST].length + 0.001);
      const txt = sent ? POST : [...POST].slice(0, n).join('');
      const pk = sent ? squashAt(t, SEND, 0.12, 0.35) : 0;
      ctx.save(); ctx.translate(w / 2, 230); ctx.scale(1 + pk, 1 - pk); ctx.translate(-w / 2, -230);
      if (sent) {
        const f = clamp(1 - (t - SEND) / 0.6);
        ctx.fillStyle = rgba(YARN.mustard, 0.4 * f); ctx.fillRect(0, 90, w, 300);
      }
      yarnBall(56, 146, 38, { t, color: YARN.blue, face: 'stiff', glasses: true, seed: 2 });
      handText('털뭉치', 110, 140, 34, YARN.ink, { align: 'left' });
      const lines = txt.split('\n');
      lines.forEach((ln, i) => handText(ln, 28, 226 + i * 62, 50, '#3A3040', { align: 'left' }));
      if (sent) {
        const by = 348, lk = pulse(t, 6) * 0.15;
        poly(heartPts(46, by, 17 * (1 + lk)), { fill: null, stroke: YARN.ink, lw: 4 });
        circle(112, by, 15, { fill: null, stroke: YARN.ink, lw: 4 });
        stroke([[164, by - 8], [192, by - 8], [192, by + 8]], YARN.ink, 4, { ink: null });
        stroke([[192, by + 8], [164, by + 8], [164, by - 8]], YARN.ink, 4, { ink: null });
      } else {
        // blinking cursor after the last letter
        ctx.font = `50px ${HAND}`;
        const cx = 30 + ctx.measureText(lines[lines.length - 1]).width + 4, cy = 226 + (lines.length - 1) * 62;
        if (frac(t * 2.2) < 0.6) rrect(cx, cy - 26, 5, 52, 2, { fill: YARN.ink, stroke: null });
        // a send button
        const press = seg(t, SEND - 0.15, SEND);
        circle(w - 52, 348, 32 * (1 - 0.2 * press), { fill: YARN.blue, stroke: YARN.ink, lw: 4 });
        poly([[w - 64, 336], [w - 36, 348], [w - 64, 360], [w - 58, 348]], { fill: '#FFFFFF', stroke: null });
      }
      ctx.restore();
      stroke([[20, 400], [w - 20, 400]], '#EEE7F0', 3, { ink: null });
      greyPost(425, 1); greyPost(610, 2); greyPost(795, 3);
    }, { rot: -0.025 });
    if (t >= SEND) {
      const a = t - SEND;
      if (a < 0.4) { ctx.save(); ctx.globalAlpha = 1 - a / 0.4; circle(px, py - 330, 60 + a * 700, { fill: null, stroke: '#FFFFFF', lw: 14 * (1 - a / 0.4) }); ctx.restore(); }
      sfx('톡!', 850, 560, 100, YARN.mustard, a, { life: 0.8, rot: 0.1 });
    }

    // the peekers: right edge, left edge, bottom right
    const peek = (i, t0) => backOut(seg(t, t0, t0 + 0.25));
    const P = [
      { k: peek(0, 5 * B), color: YARN.mint, x0: 1250, x1: 985, y0: 820, y1: 820, rot: -0.3, look: -1, seed: 5 },
      { k: peek(1, 6 * B), color: YARN.coral, x0: -170, x1: 100, y0: 1060, y1: 1060, rot: 0.3, look: 1, seed: 3, hat: 'bow' },
      { k: peek(2, 7 * B), color: YARN.lilac, x0: 920, x1: 920, y0: 1800, y1: 1480, rot: -0.15, look: -1, seed: 7, hat: 'beanie' },
    ];
    P.forEach((p, i) => {
      if (p.k <= 0) return;
      const x = lerp(p.x0, p.x1, p.k), y = lerp(p.y0, p.y1, p.k) - hop(t + i * 0.13) * 10;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + Math.sin(t * 6 + i) * 0.03);
      yarnBall(0, 0, 118, { t, color: p.color, face: 'shock', look: p.look, seed: p.seed, hat: p.hat, squash: squashAt(t, (5 + i) * B + 0.2, 0.4) });
      ctx.restore();
      const t0 = (5 + i) * B;
      mark(t, '!', x + (i === 1 ? 90 : -90), y - 150, 110, YARN.red, t0 + 0.1, i);
      sfx('빼꼼', x + (i === 1 ? 120 : -130), y + (i === 2 ? -190 : 150), 64, '#FFFFFF', t - t0, { life: 0.8, rot: i === 1 ? 0.12 : -0.12 });
    });

    // the stiff one: types, sends, then a formal bow
    const bow = kf(t, [[SEND + 0.05, 0], [SEND + 0.3, 0.32], [SEND + 1.0, 0.32], [SEND + 1.3, 0]], easeInOut);
    const tick = beatN(t) % 2 ? 6 : 0;                  // a robotic tick on the beat
    ctx.save(); ctx.translate(245, 1600); ctx.rotate(bow); ctx.translate(0, -175 - tick);
    yarnBall(0, 0, 175, { t, color: YARN.blue, face: 'stiff', tie: true, glasses: true, arms: t < SEND ? 'type' : 'none', seed: 2 });
    ctx.restore();
    camEnd();

    stitchTag(t, 0.12, 3.9, '스레드 첫날', { size: 124, y: 330, colors: [YARN.red] });
  }

  // ---- shot B · replies pile up --------------------------------------------------------------------

  const T0 = 8 * B;                                    // 3.64
  const REPLIES = [
    { t: T0 + 0.04, text: '쓰하~', x: 400, tail: -1, rot: -0.04 },
    { t: 9 * B, text: '반가워!', x: 690, tail: 1, rot: 0.04 },
    { t: 10 * B, text: '여긴 반말이야~', x: 500, tail: -1, rot: -0.02 },
    { t: 11 * B, heart: true, x: 700, tail: 1, rot: 0.06 },
  ];
  const TIE_T = 7.0;

  function replies(t, lt) {
    knitBg(t, '#FFF4E2', '#FFD6B8', { alpha: 0.09 });
    const tense = seg(t, T0, TIE_T);
    const hit = punch(t, TIE_T, 0.3);
    const [sx, sy] = shakeXY(t, TIE_T, 22, 0.3);
    const tr = tense * 5 * (t < TIE_T ? 1 : 0);
    camBegin(540 + sx + Math.sin(t * 60) * tr, 1000 + sy + lt * 12, 1.0 + lt * 0.018 + hit * 0.06);

    // hearts drifting up behind
    if (t > 12 * B) { ctx.save(); ctx.globalAlpha = seg(t, 12 * B, 12 * B + 0.4); hearts(t, 16, 60, 380, 960, 1300, { alpha: 1 }); ctx.restore(); }

    // the friends bounce on the beat
    const F = [
      { x: 150, y: 1180, r: 104, color: YARN.coral, hat: 'bow', seed: 3, face: 'grin', arms: 'wave' },
      { x: 935, y: 1150, r: 104, color: YARN.mint, seed: 5, face: 'happy', arms: 'wave' },
      { x: 155, y: 1500, r: 96, color: YARN.lilac, hat: 'beanie', seed: 7, face: 'wink', arms: 'up' },
      { x: 930, y: 1490, r: 96, color: YARN.mustard, seed: 9, face: 'love', arms: 'hips' },
    ];
    F.forEach((f, i) => {
      const k = backOut(seg(t, T0 + i * 0.06, T0 + 0.3 + i * 0.06));
      const x = lerp(f.x < 540 ? -200 : 1280, f.x, k), y = f.y - hop(t + i * 0.07) * 36;
      yarnBall(x, y, f.r, { t, color: f.color, face: f.face, arms: f.arms, hat: f.hat, seed: f.seed, look: f.x < 540 ? 1 : -1, squash: pulse(t + i * 0.07, 9) * 0.35 });
    });

    // the stiff one, trembling, sweating
    const cx = 540, cy = 1360;
    const jit = t < TIE_T ? Math.sin(t * 70) * tense * 6 : 0;
    const sq = squashAt(t, TIE_T, 0.55, 0.4);
    yarnBall(cx + jit, cy, 210, { t, color: YARN.blue, face: t < TIE_T ? 'stiff' : 'shock', tie: t < TIE_T, glasses: true, seed: 2, squash: sq });
    // blush grows with every reply
    ell(cx - 110, cy + 40, 44, 20, { fill: '#FF5A7A', stroke: null, alpha: 0.5 * tense });
    ell(cx + 110, cy + 40, 44, 20, { fill: '#FF5A7A', stroke: null, alpha: 0.5 * tense });
    // sweat: a drop pops off each beat, more as it goes
    for (let n = 9; n <= 15; n++) {
      const a = t - n * B; if (a < 0 || a > 0.7) continue;
      const side = n % 2 ? 1 : -1;
      for (let j = 0; j < (n > 12 ? 2 : 1); j++) {
        const dx = side * (150 + a * 260 + j * 40), dy = -150 - a * 260 + a * a * 700 + j * 30;
        sweat(cx + dx, cy + dy, 1.1 - j * 0.3, side * (0.4 + a), 1 - clamp((a - 0.5) / 0.2));
      }
    }
    // a big sweat drop stuck to his forehead
    if (t > 9 * B) sweat(cx + 150, cy - 130 + Math.sin(t * 3) * 6, 1.4 * backOut(seg(t, 9 * B, 9 * B + 0.3)), 0.3);

    // the tie snaps off and flies
    if (t >= TIE_T) {
      const a = t - TIE_T;
      tie(cx + a * 900, cy + 130 - a * 1500 + a * a * 1400, 210, a * 14);
      sfx('툭!', cx + 190, cy + 50, 120, YARN.red, a, { life: 0.8, rot: 0.15 });
      speedLines(t, cx, cy, 0.8 * (1 - clamp(a / 0.27)), '#FFFFFF', 40);
    }

    // the reply bubbles stack upward, newest at the bottom
    REPLIES.forEach((r, i) => {
      if (t < r.t) return;
      // slide up as newer ones arrive
      let slot = 0;
      for (let j = i + 1; j < REPLIES.length; j++) slot += backOut(seg(t, REPLIES[j].t, REPLIES[j].t + 0.2));
      const y = 1000 - slot * 150;
      const s = backOut(seg(t, r.t, r.t + 0.22)), wob = Math.sin(t * 4 + i) * 0.015;
      const bp = pulse(t, 8);
      if (r.heart) heartBubble(r.x, y, 70, { tail: r.tail, rot: r.rot + wob, scale: s, beat: bp });
      else bubble(r.x, y, r.text, 74, { tail: r.tail, rot: r.rot + wob, scale: s * (1 + 0.03 * bp) });
    });
    camEnd();
    flash(punch(t, TIE_T, 0.15) * 0.5);
  }

  chapter('open', 0, 7.27, [[0, firstPost], [T0, replies]]);
})();
