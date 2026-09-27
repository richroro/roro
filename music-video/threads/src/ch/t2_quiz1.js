// t2_quiz1 (7.27 – 21.82) · 2 · 퀴즈 1·2
//
// 7.27  DROP: flash, the red felt curtains whoosh open on the quiz stage, the title slams over
//       a sunburst (스레드어 / 몇 개 알아?) and four yarn contestants stampede in from both sides and
//       hop into place behind their podiums (우르르).
// 8.60  Q.1 (q0 8.64): the word card 스친 slams; 9.09 boom → 3·2·1 timer, contestants think (?);
//       10.45 땡! they jump in shock and hit their buzzers; 10.91 answer 스레드 친구 + confetti, they
//       cheer and a strand of yarn ties them together over their heads. 12.73 ‘스치다’랑 소리도 같아:
//       the two middle contestants brush past each other (스윽~) and back.
// 14.55 Q.2 (q0 14.55): 스하리. Timer from 15.45 (16.36 boom), 땡 16.82, answer 17.27
//       팔로우·하트·리포스트\n해 줄게! — three contestants fire a follow, a heart and a repost badge at
//       the fourth on the beats; 19.09 고맙다는 답례는 ‘반하리’: the fourth sends hearts back to each,
//       everyone goes heart-eyed. 21.5 the cards fly out for the next question.
//
// Uses window.T12 (defined in t1_open.js): stage(), row(), badge(), mark(), punch(), squashAt().
(() => {
  const { B, squashAt, punch, badge, stage, row, mark, CAST, ROW_Y, R } = window.T12;

  const CARD_Y = 565, TIMER = [540, 985], ANS_Y = 990, SUB_Y = 800;

  /** Camera for the stage with beat breathing and punches on the hits. */
  function stageCam(t, hits) {
    let p = 0, sh = [0, 0];
    for (const h of hits) {
      p = Math.max(p, punch(t, h, 0.3));
      const s = shakeXY(t, h, 14, 0.25); sh = [sh[0] + s[0], sh[1] + s[1]];
    }
    camBegin(540 + sh[0], 960 + sh[1], 1 + 0.012 * pulse(t, 6) + 0.05 * p);
  }

  // ---- 7.27 · the title ---------------------------------------------------------------------------

  const DROP = 7.2727;

  function title(t, lt) {
    stageCam(t, [DROP, DROP + 2 * B]);
    const open = easeOut(seg(t, DROP, DROP + 0.5));
    stage(t, { open, behindCurtain: () => {
      // rays and glow behind the title
      ctx.save(); ctx.globalAlpha = 0.5 * backOut(seg(t, DROP, DROP + 0.3));
      sunburst(540, 470, 'rgba(255,200,87,0.5)', 'rgba(255,140,198,0.15)', -t * 0.4, 16, 1300);
      ctx.restore();
    } });
    // contestants stampede in behind the podiums
    row(t, i => {
      const from = i < 2 ? -260 - (1 - i) * 220 : W + 260 + (i - 2) * 220;
      const t0 = DROP + 0.1 + (i % 2) * 0.12, t1 = DROP + 0.85 + (i % 2) * 0.12;
      const k = seg(t, t0, t1);
      const x = lerp(from, CAST[i].x, easeOut(k));
      const running = k < 1;
      const land = t1;
      return {
        x, dy: running ? Math.abs(Math.sin((t - t0) * 14 + i)) * 120 : hop(t + i * 0.06) * 22,
        face: running ? 'grin' : CAST[i].idle, arms: running ? 'up' : 'none',
        rot: running ? (i < 2 ? 0.2 : -0.2) : 0, sq: running ? -0.2 : squashAt(t, land, 0.6),
        look: i < 2 ? 1 : -1,
      };
    });
    sfx('우르르', 540, 1180, 92, YARN.mustard, t - DROP - 0.1, { life: 1.0 });
    camEnd();
    stitchTag(t, DROP + 0.02, 8.62, '스레드어\n몇 개 알아?', { size: 136, y: 420, colors: [YARN.mustard, YARN.pink] });
    streaks(t, 0.8 * (1 - seg(t, DROP, DROP + 0.8)), '#FFFFFF', 3, -1);
    flash(0.9 * punch(t, DROP, 0.35));
  }

  // ---- a quiz question ----------------------------------------------------------------------------

  /**
   * Q: { q0, tim, ans, sub, end, word, q, answer, subText, fill, afill, hits }
   * st(i, t, base) may return overrides for contestant i after the answer; extra(t) paints on top.
   */
  function quiz(t, Q, st, extra, under) {
    const ding = Q.tim + 3 * B;
    stageCam(t, [Q.q0, Q.tim, ding, Q.ans, ...(Q.hits || [])]);
    stage(t, { tint: t >= ding && t < Q.ans ? ['#FF3050', 0.18 * (1 - seg(t, ding, Q.ans))] : null });
    under && under(t);

    // the contestants
    const S = row(t, i => {
      const ph = i * 0.06, base = { dy: hop(t + ph) * 22, sq: pulse(t + ph, 9) * 0.3 };
      let s;
      if (t < Q.tim) s = { ...base, look: (i < 2 ? 1 : -1) * 0.6 };
      else if (t < ding) s = { face: 'think', dy: hop(t + ph) * 8, rot: Math.sin(t * 3 + i * 1.7) * 0.1, look: Math.sin(t * 2 + i) };
      else if (t < Q.ans) s = { face: 'shock', dy: 70 * Math.exp(-(t - ding) * 5) + 8, sq: squashAt(t, ding, -0.5, 0.3), buzz: 1 - seg(t, ding, Q.ans) * 0.5 };
      else s = { face: 'grin', arms: 'up', dy: hop(t + ph) * 50, sq: pulse(t + ph, 9) * 0.45, buzz: 0.4 * pulse(t, 4) };
      return { ...s, ...(st ? st(i, t, s) : {}) };
    });
    // '?' while thinking, '!' on the buzzer
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
      circle(540, ANS_Y, 120 + a * 700, { fill: null, stroke: '#FFFFFF', lw: 18 * (1 - a / 0.6) });
      ctx.restore();
    }
    extra && extra(t, S);
    camEnd();

    confetti(t, Q.ans, { burst: true, y: 1150, n: 120, colors: [YARN.pink, YARN.mustard, YARN.mint, YARN.blue, YARN.lilac, YARN.coral] });
    stitchSub(t, Q.sub, Q.end - 0.1, Q.subText, { y: SUB_Y, size: 70 });
    flash(0.35 * punch(t, Q.ans, 0.2));
  }

  // ---- Q.1 · 스친 ---------------------------------------------------------------------------------

  const Q1 = {
    q0: 8.6364, tim: 9.0909, ans: 10.9091, sub: 12.7273, end: 14.5455,
    word: '스친', q: 'Q.1', answer: '스레드 친구', asize: 112, subText: '‘스치다’랑 소리도 같아', fill: YARN.mustard, afill: YARN.mint,
  };
  // the swap: the two middle contestants brush past each other and back
  const SW = [[Q1.sub, Q1.sub + 2 * B], [Q1.sub + 4 * B, Q1.sub + 6 * B]];
  const swapK = t => {
    for (const [a, b] of SW) if (t >= a && t < b) return { k: easeInOut(seg(t, a, b)), a, dir: a === SW[0][0] ? 1 : -1 };
    return null;
  };

  function q1(t) {
    quiz(t, Q1, (i, tt, s) => {
      if (tt < Q1.sub) return {};
      const w = swapK(tt), mid = i === 1 || i === 2;
      const calm = { face: i === 0 ? 'happy' : i === 3 ? 'wink' : 'smug', arms: 'none', dy: hop(tt + i * 0.06) * 26 };
      if (!mid) return { ...calm, look: i === 0 ? 1 : -1 };
      if (!w) return { ...calm, face: i === 1 ? 'wink' : 'smug', look: i === 1 ? 1 : -1, x: tt >= SW[0][1] && tt < SW[1][0] ? CAST[3 - i].x : CAST[i].x };
      const from = w.dir > 0 ? CAST[i].x : CAST[3 - i].x, to = w.dir > 0 ? CAST[3 - i].x : CAST[i].x;
      const arc = Math.sin(w.k * Math.PI);
      return { x: lerp(from, to, w.k), dy: arc * (i === 1 ? 105 : 45) + 10, face: i === 1 ? 'wink' : 'smug', rot: (to > from ? 1 : -1) * arc * 0.35, sq: -0.25 * arc, look: to > from ? 1 : -1 };
    }, (t, S) => {
      // a strand over their heads: friends, tied together
      const k = easeOut(seg(t, Q1.ans + 0.45, Q1.ans + 1.3)), fade = 1 - seg(t, Q1.sub - 0.3, Q1.sub);
      if (k > 0 && fade > 0) {
        const pts = [];
        S.forEach((s, i) => {
          pts.push([s.x, ROW_Y - s.dy - R * 0.9]);
          if (i < 3) pts.push([(s.x + S[i + 1].x) / 2, ROW_Y - (s.dy + S[i + 1].dy) / 2 - R * 0.45]);
        });
        const n = 1 + k * (pts.length - 1), cut = pts.slice(0, Math.floor(n) + 1);
        if (Math.floor(n) < pts.length - 1) {
          const a = pts[Math.floor(n)], b = pts[Math.floor(n) + 1], f = n - Math.floor(n);
          cut.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
        }
        if (cut.length > 1) strand(cut, YARN.red, { t, w: 16, wob: 3, alpha: fade });
        for (let i = 0; i < 3; i++) {
          const kk = seg(t, Q1.ans + 0.6 + i * 0.25, Q1.ans + 0.85 + i * 0.25);
          if (kk > 0) poly(heartPts(pts[i * 2 + 1][0], pts[i * 2 + 1][1] + 26, 26 * backOut(kk) * (1 + 0.2 * pulse(t, 7))), { fill: YARN.pink, stroke: YARN.ink, lw: 5, alpha: fade });
        }
      }
      // 스윽~ as they pass
      const w = swapK(t);
      if (w) {
        const a = Math.sin(w.k * Math.PI);
        ctx.save(); ctx.globalAlpha = a * 0.8; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        for (let j = 0; j < 4; j++) {
          const y = ROW_Y - 60 - j * 34 - a * 60, x = 540 - w.dir * (80 + j * 20);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - w.dir * (140 + j * 30), y); ctx.stroke();
        }
        ctx.restore();
      }
      SW.forEach(([a], j) => sfx('스윽~', j ? 800 : 280, 1125, 80, YARN.mint, t - a - 0.2, { life: 0.75, rot: j ? 0.08 : -0.08 }));
    });
  }

  // ---- Q.2 · 스하리 -------------------------------------------------------------------------------

  const Q2 = {
    q0: 14.5455, tim: 15.4545, ans: 17.2727, sub: 19.0909, end: 21.8182, hits: [16.3636],
    word: '스하리', q: 'Q.2', answer: '팔로우·하트·리포스트\n해 줄게!', subText: '고맙다는 답례는 ‘반하리’',
    fill: YARN.coral, afill: YARN.cream, asize: 80,
  };
  const GIFTS = ['follow', 'heart', 'repost'];
  const giftT = j => Q2.ans + (j + 1) * B;              // 17.73 · 18.18 · 18.64
  const FLY = 0.36, HEAD = i => [CAST[i].x, ROW_Y - R - 70];
  const PANEL = [CAST[3].x, ROW_Y + 62 + 91];           // the receiver's podium front
  /** The receiver's podium collects the badges, one a beat. */
  const collected = t => (x, y) => {
    if (t < giftT(0) + FLY) { poly(heartPts(x, y, 34), { fill: '#FFFFFF', stroke: YARN.ink, lw: 5 }); return; }
    GIFTS.forEach((g, j) => {
      const t0 = giftT(j) + FLY; if (t < t0) return;
      badge(g, x + (j - 1) * 56, y + (j === 1 ? -14 : 12), 30, { s: backOut(seg(t, t0, t0 + 0.2)) * (1 + 0.1 * pulse(t + j * 0.1, 6)), rot: (j - 1) * 0.15 });
    });
  };
  const backT = j => Q2.sub + j * 0.12;                 // hearts sent back

  const arcPt = (a, b, k, h) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * h];

  function q2(t) {
    quiz(t, Q2, (i, tt, s) => {
      if (tt < Q2.ans + 0.9 * B) return {};
      if (i === 3) {
        // the receiver: squashes on every gift, then sends hearts back
        let sq = 0; for (let j = 0; j < 3; j++) sq += squashAt(tt, giftT(j) + FLY, 0.5, 0.3);
        if (tt < Q2.sub) return { face: tt > giftT(0) + FLY ? 'love' : 'grin', arms: 'hips', sq, dy: hop(tt) * 20, emblem: collected(tt) };
        const spin = seg(tt, Q2.sub - 0.1, Q2.sub + 0.25);
        return { face: 'love', arms: 'wave', dy: Math.sin(spin * Math.PI) * 90 + hop(tt) * 30, rot: -0.3 * Math.sin(spin * Math.PI), emblem: collected(tt) };
      }
      // the givers throw on their beat, then fall for it
      const thrown = tt >= giftT(i), hit = tt >= backT(i) + FLY;
      return {
        face: hit ? 'love' : thrown ? 'grin' : 'happy', arms: tt >= giftT(i) - 0.1 && tt < giftT(i) + 0.3 ? 'point' : hit ? 'up' : 'none',
        sq: squashAt(tt, giftT(i), -0.4, 0.3) + squashAt(tt, backT(i) + FLY, 0.5, 0.3), look: 1,
        dy: hop(tt + i * 0.06) * (hit ? 44 : 20),
      };
    }, (t, S) => {
      // follow / heart / repost fly to the fourth contestant
      GIFTS.forEach((g, j) => {
        const t0 = giftT(j); if (t < t0) return;
        const k = seg(t, t0, t0 + FLY);
        if (k >= 1) return;
        const p = arcPt(HEAD(j), [PANEL[0] + (j - 1) * 56, PANEL[1]], easeInOut(k), 110 - j * 25);
        badge(g, p[0], p[1], 50 - k * 18, { s: backOut(clamp(k * 4)), rot: Math.sin(k * 8) * 0.3 });
      });
      const r3 = HEAD(3);
      GIFTS.forEach((g, j) => sfx(['쏙', '뿅', '쏙'][j], PANEL[0] - 120 + j * 30, PANEL[1] - 150, 64, '#FFFFFF', t - giftT(j) - FLY, { life: 0.45 }));
      // 답례: hearts fly back to each giver
      for (let j = 0; j < 3; j++) {
        const t0 = backT(j); if (t < t0) continue;
        const k = seg(t, t0, t0 + FLY);
        if (k < 1) {
          const p = arcPt([r3[0], r3[1] - S[3].dy], [CAST[j].x, ROW_Y - R * 0.5], easeInOut(k), 90 + j * 30);
          poly(heartPts(p[0], p[1], 40 * (1 + 0.2 * Math.sin(k * 20))), { fill: YARN.red, stroke: YARN.ink, lw: 6 });
        } else {
          const a = t - t0 - FLY;
          if (a < 0.5) {
            ctx.save(); ctx.globalAlpha = 1 - a / 0.5;
            for (let m = 0; m < 6; m++) {
              const ang = m / 6 * TAU;
              poly(heartPts(CAST[j].x + Math.cos(ang) * (60 + a * 220), ROW_Y - S[j].dy + Math.sin(ang) * (60 + a * 160), 16), { fill: YARN.pink, stroke: YARN.ink, lw: 4 });
            }
            ctx.restore();
          }
        }
      }
    }, t => {
      // hearts rising in the background once everyone's in love
      if (t > Q2.sub + 0.5) { ctx.save(); ctx.globalAlpha = 0.6 * seg(t, Q2.sub + 0.5, Q2.sub + 1); hearts(t, 16, 60, 250, 960, 1200, { alpha: 0.8 }); ctx.restore(); }
    });
  }

  chapter('quiz1', 7.27, 21.82, [[7.27, title], [8.6, q1], [14.55, q2]]);
})();
