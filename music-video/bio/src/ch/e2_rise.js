// e2_rise (38.40 – 67.20): the first EP as a neon sign in a blue room, its title lighting letter by
// letter; on the 50.40 hit the green-haired silhouette appears and a chart bar shoots up and plugs
// into the 1위 slot; on the 60.00 hit the screen strobes lime and black around “bad guy” while a
// crown drops onto it, and the last bar turns to gold for the Grammy stage of chapter 3.
(() => {
  const B = SONG.beat;
  const LIME = BIO.lime, PINK = BIO.pink, INK = BIO.ink, BLUE = BIO.blue;
  const HAIR_BLUE = '#5B8CFF', HAIR_GREEN = '#7ED321', GOLD = '#FFC940';
  const T_HIT1 = 50.4, T_LOCK = 51.6, T_HIT2 = 60.0, T_CROWN = 61.8, T_GOLD = 64.8;

  // ---- kit ----------------------------------------------------------------------------------------

  const screen = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };
  const after = (t, t0, k = 5) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);

  function motes(t, n, color, a = 0.5, seed = 7) {
    screen(() => {
      for (let i = 0; i < n; i++) {
        const sp = 12 + hash(i, seed) * 30;
        const x = (hash(i, seed + 1) * W + Math.sin(t * 0.4 + i) * 40 + W) % W;
        const y = ((hash(i, seed + 2) * H - t * sp) % H + H) % H;
        ctx.globalAlpha = a * (0.4 + 0.6 * Math.sin(t * (1 + hash(i, 4)) + i) ** 2);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i, seed + 3) * 2.6, 0, TAU); ctx.fill();
      }
    });
  }

  /** A perspective floor grid that scrolls toward the camera. */
  function floorGrid(t, horizon, color, a, speed = 0.6) {
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, horizon); ctx.lineTo(W / 2 + i * 420, H + 300); ctx.stroke();
    }
    for (let j = 0; j < 12; j++) {
      const u = frac(j / 12 + t * speed / 4);
      const y = horizon + Math.pow(u, 2.2) * (H + 300 - horizon);
      ctx.globalAlpha = a * u; ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(W + 200, y); ctx.stroke();
    }
    ctx.restore();
  }

  /** Light cones from above. */
  function beam(x, y, a, len, w, color, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ex = x + Math.sin(a) * len, ey = y + Math.cos(a) * len;
    ctx.fillStyle = lgrad(x, y, ex, ey, [[0, rgba(color, 0.35 * alpha)], [1, rgba(color, 0)]]);
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(ex - w, ey); ctx.lineTo(ex + w, ey); ctx.lineTo(x + 10, y); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---- 38.40 – 48.00 · the neon sign --------------------------------------------------------------

  const SIGN = 'Don\'t Smile at Me';
  const T_L0 = 39.0, T_LSTEP = 0.3;
  // which lit index each character gets (spaces are skipped)
  const LIT = (() => { let k = 0; return [...SIGN].map(c => (c === ' ' ? -1 : k++)); })();
  const N_LIT = LIT.filter(i => i >= 0).length;

  /** 0..1 brightness of a sign letter with a stuttering switch-on and a later hiccup. */
  function letterOn(t, i) {
    const t0 = T_L0 + i * T_LSTEP, a = t - t0;
    if (a < 0) return 0;
    if (a < 0.05) return 1; if (a < 0.11) return 0.1; if (a < 0.15) return 0.8; if (a < 0.19) return 0.2;
    // one letter hiccups later on
    if (i === 6 && t > 45.3 && t < 45.6) return frac(t * 14) > 0.5 ? 0.15 : 1;
    return 1;
  }

  function neonSign(t, cx, cy, size, mirror = false) {
    ctx.save();
    ctx.font = `${size}px ${FONT.round}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const total = ctx.measureText(SIGN).width, x0 = cx - total / 2;
    const buzz = 0.9 + 0.1 * pulse(t, 4);
    const chars = [...SIGN];
    for (let c = 0; c < chars.length; c++) {
      if (LIT[c] < 0) continue;
      const x = x0 + ctx.measureText(SIGN.slice(0, c)).width;
      const on = letterOn(t, LIT[c]) * buzz;
      const col = c >= 12 ? LIME : PINK;
      // the dead glass tube
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.07; ctx.strokeStyle = '#2B2040'; ctx.strokeText(chars[c], x, cy);
      if (on > 0.02) {
        ctx.save();
        ctx.globalAlpha *= on;
        if (!mirror) { ctx.shadowColor = col; ctx.shadowBlur = size * 0.35; }
        ctx.lineWidth = size * 0.065; ctx.strokeStyle = col; ctx.strokeText(chars[c], x, cy);
        ctx.shadowBlur = 0;
        ctx.lineWidth = size * 0.022; ctx.strokeStyle = mix(col, '#FFFFFF', 0.7); ctx.strokeText(chars[c], x, cy);
        ctx.restore();
      }
    }
    // the underline tube: lights last, with the whole sign
    const uOn = letterOn(t, N_LIT) * buzz;
    const uy = cy + size * 0.62;
    stroke([[x0 + 10, uy], [x0 + total - 10, uy]], '#2B2040', size * 0.07, { ink: null });
    if (uOn > 0.02) {
      ctx.save(); ctx.globalAlpha *= uOn;
      if (!mirror) { ctx.shadowColor = LIME; ctx.shadowBlur = size * 0.3; }
      stroke([[x0 + 10, uy], [x0 + total - 10, uy]], LIME, size * 0.06, { ink: null });
      ctx.shadowBlur = 0;
      stroke([[x0 + 10, uy], [x0 + total - 10, uy]], '#EFFFD0', size * 0.02, { ink: null });
      ctx.restore();
    }
    ctx.restore();
    return [x0, total];
  }

  function epSign(t, lt, dur) {
    skyFill([[0, '#050A22'], [0.6, '#0C1A4A'], [1, '#060B20']]);
    const lit = clamp((t - T_L0) / (N_LIT * T_LSTEP));
    const zoom = lerp(1.0, 1.1, easeInOut(seg(t, 38.4, 48))) + 0.004 * pulse(t, 5);
    const sh = shakeXY(t, T_L0 + (N_LIT) * T_LSTEP, 6, 0.3);
    camBegin(W / 2 + Math.sin(t * 0.35) * 30 + sh[0], H / 2 - 20 + sh[1], zoom, Math.sin(t * 0.25) * 0.01);
    // the blue room: wall, venetian-blind light sliding across it, a glossy floor
    const FLOOR = 780;
    rrect(-400, -300, W + 800, FLOOR + 300, 0, { fill: lgrad(0, 0, 0, FLOOR, [[0, '#08123A'], [1, '#14286E']]), stroke: null });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = -300 + i * 150 + (t - 38.4) * 14;
      ctx.fillStyle = rgba('#5B8CFF', 0.05 + 0.03 * pulse(t, 3));
      ctx.beginPath(); ctx.moveTo(x, -200); ctx.lineTo(x + 70, -200); ctx.lineTo(x + 520, FLOOR); ctx.lineTo(x + 450, FLOOR); ctx.fill();
    }
    ctx.restore();
    rrect(-400, FLOOR, W + 800, 700, 0, { fill: lgrad(0, FLOOR, 0, H + 200, [[0, '#0B1A4C'], [1, '#030616']]), stroke: null });
    // the sign on its dark backboard
    const cx = W / 2, cy = 430, size = 176;
    glow(cx, cy, 1000, PINK, 0.22 * lit + 0.05);
    glow(cx, cy, 500, '#FF9AD0', 0.12 * lit);
    rrect(cx - 780, cy - 175, 1560, 370, 26, { fill: rgba('#050818', 0.55), stroke: rgba('#5B8CFF', 0.25), lw: 3 });
    for (const sx of [-720, 720]) stroke([[cx + sx, cy - 190], [cx + sx * 0.9, -200]], '#1A2250', 4, { ink: null });
    neonSign(t, cx, cy, size);
    // its reflection in the floor
    ctx.save(); ctx.translate(0, FLOOR * 2 + 40); ctx.scale(1, -1); ctx.globalAlpha *= 0.16;
    neonSign(t, cx, cy + 0, size, true);
    ctx.restore();
    glow(cx, FLOOR + 60, 900, PINK, 0.08 * lit);
    // the blue-haired silhouette looking up at it, lit pink from the sign
    silhouette(1660, 1010, 0.7, { t, hair: HAIR_BLUE, glow: mix(BLUE, PINK, lit * 0.6) });
    camEnd();
    motes(t, 40, '#9FC0FF', 0.3, 5);
    // a flicker of the room light as each letter comes on
    const n = Math.floor((t - T_L0) / T_LSTEP);
    if (n >= 0 && n <= N_LIT) fillScreen(n <= N_LIT - 1 ? PINK : LIME, 0.05 * after(t, T_L0 + n * T_LSTEP, 12));
    // into the dark for the build of the next shot
    fillScreen(INK, ease(seg(t, 47.5, 48.0)) * 0.9);
    yearTag(t, 38.7, '2017');
    caption(t, 39.2, 47.8, '첫 EP 〈Don\'t Smile at Me〉', '2017년 · 음악 업계가 주목하기 시작하다');
  }

  // ---- 48.00 – 57.60 · the chart --------------------------------------------------------------------

  const CH = { x0: 1000, x1: 1800, base: 780, top: 262 };
  const NB = 5, OURS = 2;
  const barX = i => CH.x0 + 80 + i * ((CH.x1 - CH.x0 - 160) / (NB - 1));

  function chart(t, lt, dur) {
    skyFill([[0, '#07050E'], [0.7, '#150A28'], [1, '#0B0714']]);
    const hit = t >= T_HIT1, h1 = after(t, T_HIT1, 4), lock = after(t, T_LOCK, 4);
    const zoom = kf(t, [[48, 1.12], [50.4, 1.0], [57.6, 1.06]], easeOut) + 0.01 * pulse(t, 5) * (hit ? 1 : 0.3);
    const sh = shakeXY(t, T_HIT1, 22, 0.45), sh2 = shakeXY(t, T_LOCK, 12, 0.35);
    camBegin(W / 2 + sh[0] + sh2[0] + Math.sin(t * 0.4) * 12, H / 2 + sh[1] + sh2[1], zoom, Math.sin(t * 0.3) * 0.008);
    // build: pink rings closing in on each beat before the hit
    if (!hit) {
      const lb = frac(beatOf(t)), k = seg(t, 48, 50.4);
      for (let r = 0; r < 3; r++) {
        const u = frac(lb + r / 3);
        ctx.save(); ctx.globalAlpha = (0.15 + 0.4 * k) * u;
        ellPath(W / 2, H / 2, (1 - u) * 1300 + 60, (1 - u) * 800 + 40); ctx.strokeStyle = PINK; ctx.lineWidth = 4 + 6 * k; ctx.stroke();
        ctx.restore();
      }
    }
    floorGrid(t, 640, hit ? LIME : '#6A3CFF', hit ? 0.28 : 0.14 + 0.1 * seg(t, 48, 50.4), hit ? 1.4 : 0.5);
    // spotlights swing on the beat after the hit
    if (hit) {
      for (let i = 0; i < 4; i++) {
        const a = Math.sin(t * 1.2 + i * 1.7) * 0.35 + (i - 1.5) * 0.12;
        beam(260 + i * 460, -40, a, 1300, 200, i % 2 ? PINK : LIME, 0.6 + 0.4 * pulse(t + i * 0.15, 4));
      }
    }
    // the chart: axes, the other entries, and ours shooting into the 1위 slot
    const draw = easeOut(seg(t, 48.1, 49.4));
    const { x0, x1, base, top } = CH;
    stroke([[x0, base], [lerp(x0, x1, draw), base]], '#C8C0E0', 5, { ink: null, alpha: 0.8 });
    stroke([[x0, base], [x0, lerp(base, top - 110, draw)]], '#C8C0E0', 5, { ink: null, alpha: 0.8 });
    for (let j = 1; j < 5; j++) {
      const y = lerp(base, top, j / 4.4);
      stroke([[x0 + 10, y], [lerp(x0, x1, draw), y]], '#C8C0E0', 2, { ink: null, alpha: 0.12 });
    }
    // the 1위 slot, a socket at the top waiting for our bar
    const sx = barX(OURS), bw = 104;
    const slotOn = t >= T_LOCK ? 1 : 0.35 + 0.25 * pulse(t, 4);
    if (t >= T_LOCK) glow(sx, top - 60, 300 + 60 * pulse(t, 4), LIME, 0.35 + 0.4 * lock);
    ctx.save(); ctx.globalAlpha *= draw;
    rrect(sx - 90, top - 118, 180, 108, 18, { fill: t >= T_LOCK ? LIME : '#140E22', stroke: LIME, lw: 6, alpha: 1 });
    if (t < T_LOCK) { ctx.setLineDash([14, 10]); rrect(sx - 76, top - 104, 152, 80, 12, { fill: null, stroke: rgba(LIME, slotOn), lw: 3 }); ctx.setLineDash([]); }
    letter('1위', sx, top - 64, 64, t >= T_LOCK ? INK : LIME, { pop: t >= T_LOCK ? clamp((t - T_LOCK) / 0.3) : 1, color2: t >= T_LOCK ? LIME : INK, shadow: null, lw: 0, alpha: t >= T_LOCK ? 1 : slotOn });
    ctx.restore();
    for (let i = 0; i < NB; i++) {
      const x = barX(i);
      if (i === OURS) continue;
      const target = 0.28 + 0.42 * hash(i, 17);
      const rise = hit ? backOut(clamp((t - T_HIT1 - i * 0.05) / 0.5)) : 0.06 + 0.04 * pulse(t + i * 0.1, 5);
      const bounce = hit ? 0.05 * pulse(t + i * 0.07, 5) : 0;
      const h = (base - top) * (target * rise + bounce) * draw;
      rrect(x - bw / 2, base - h, bw, h, 10, { fill: lgrad(0, base - h, 0, base, [[0, '#6A5A9A'], [1, '#2A2240']]), stroke: null });
      rrect(x - bw / 2, base - h, bw, 8, 4, { fill: PINK, stroke: null, alpha: 0.7 });
    }
    // ours: waits low, then shoots up on the hit and snaps into the socket on the next beat
    const up = hit ? kf(t, [[T_HIT1, 0.08], [T_HIT1 + 0.55, 0.78], [T_LOCK - 0.12, 0.93], [T_LOCK, 1.0]], easeOut) : 0.08 + 0.05 * pulse(t, 5);
    const hOurs = (base - top) * up * draw;
    glow(sx, base - hOurs / 2, 300, LIME, hit ? 0.25 + 0.2 * pulse(t, 5) : 0.08);
    rrect(sx - bw / 2, base - hOurs, bw, hOurs, 10, { fill: lgrad(0, base - hOurs, 0, base, [[0, '#EFFFC8'], [0.2, LIME], [1, '#3F7A10']]), stroke: null });
    if (hit && t < T_LOCK + 0.3) {
      // speed trails as it climbs
      for (let k = 0; k < 5; k++) stroke([[sx - 40 + k * 20, base - hOurs + 30], [sx - 40 + k * 20, base - hOurs + 150 + k * 20]], '#FFFFFF', 4, { ink: null, alpha: 0.35 * clamp((T_LOCK + 0.3 - t) / 0.3) });
    }
    // the lock: a ring and sparks shooting out of the socket
    const la = t - T_LOCK;
    if (la > 0 && la < 1.2) {
      const k = easeOut(la / 1.2);
      ctx.save(); ctx.globalAlpha = 1 - k;
      ellPath(sx, top - 64, 100 + k * 520, 60 + k * 320); ctx.strokeStyle = LIME; ctx.lineWidth = 10; ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 18; i++) {
        const a = hash(i, 23) * TAU, v = 200 + hash(i, 24) * 500;
        sparkle(sx + Math.cos(a) * v * k, top - 64 + Math.sin(a) * v * k * 0.7, 20 * (1 - k) + 3, i % 2 ? LIME : '#FFFFFF', la * 5);
      }
    }
    // the green-haired silhouette: slammed in by a column of light on the hit
    const sx0 = 560, colK = after(t, T_HIT1, 3.2);
    if (hit) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cw = lerp(40, 360, colK);
      ctx.fillStyle = lgrad(sx0 - cw, 0, sx0 + cw, 0, [[0, rgba(LIME, 0)], [0.5, rgba(LIME, 0.75 * colK + 0.08)], [1, rgba(LIME, 0)]]);
      ctx.fillRect(sx0 - cw, -300, cw * 2, 1100);
      ctx.restore();
      ell(sx0, 800, 260, 36, { fill: rgba(LIME, 0.18 + 0.2 * pulse(t, 4)), stroke: null });
      const appear = clamp((t - T_HIT1) / 0.12);
      const bob = hop(t) * 6;
      silhouette(sx0, 800 - bob, 1.0, { t, hair: HAIR_GREEN, pose: t >= T_LOCK ? 'arms' : 'stand', glow: LIME, alpha: appear });
    }
    camEnd();
    motes(t, 30, hit ? LIME : '#9F7CFF', 0.25, 8);
    flash(0.55 * after(t, T_HIT1, 7), '#F4FFE0');
    flash(0.25 * after(t, T_LOCK, 9), LIME);
    fillScreen(INK, ease(seg(t, 57.2, 57.6)) * 0.85);
    yearTag(t, T_HIT1, '2019');
    caption(t, T_HIT1 + 0.3, 57.4, '데뷔 정규 앨범, 빌보드 200 1위', '〈When We All Fall Asleep, Where Do We Go?〉');
  }

  // ---- 57.60 – 67.20 · “bad guy” -------------------------------------------------------------------

  function crown(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const pts = [[-120, 60], [-135, -50], [-70, 0], [0, -80], [70, 0], [135, -50], [120, 60]];
    poly(pts, { fill: lgrad(0, -80, 0, 60, [[0, '#FFF1B0'], [0.5, GOLD], [1, '#B07A18']]), stroke: INK, lw: 8 });
    rrect(-124, 44, 248, 34, 10, { fill: '#D9A22A', stroke: INK, lw: 8 });
    for (const [px, py, c] of [[-135, -50, PINK], [0, -80, LIME], [135, -50, PINK]]) circle(px, py, 14, { fill: c, stroke: INK, lw: 5 });
    circle(0, 61, 10, { fill: LIME, stroke: null });
    circle(-70, 61, 8, { fill: PINK, stroke: null }); circle(70, 61, 8, { fill: PINK, stroke: null });
    ctx.restore();
  }

  function badGuy(t, lt, dur) {
    const hit = t >= T_HIT2;
    const e8 = Math.floor((t - T_HIT2) / (B / 2));
    const strobeOn = hit && t < 62.4;
    const limeFrame = strobeOn && e8 % 2 === 0;
    const gold = seg(t, T_GOLD, 67.2);
    // background
    if (limeFrame) fillScreen(LIME);
    else skyFill([[0, mix('#07050E', '#1A1206', gold)], [0.7, mix('#120A22', '#3A2608', gold)], [1, '#050308']]);
    const zoom = hit ? 1.0 + 0.02 * pulse(t, 5) + 0.05 * seg(t, 62.4, 67.2) : lerp(1.0, 1.25, easeIn(seg(t, 57.6, 60)));
    const sh = shakeXY(t, T_HIT2, 30, 0.5), sh2 = shakeXY(t, T_CROWN, 14, 0.3);
    camBegin(W / 2 + sh[0] + sh2[0], H / 2 + sh[1] + sh2[1], zoom, hit ? Math.sin(t * 0.5) * 0.01 : 0);
    const TX = 820, TY = 500;
    if (!hit) {
      // the build: the lime line from the start of the film, pulled into a point
      const k = easeIn(seg(t, 57.6, 59.9));
      const half = lerp(820, 6, k);
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const u = i / 120, x = lerp(W / 2 - half, W / 2 + half, u);
        pts.push([x, H / 2 + Math.sin(u * 30 + t * 6) * (40 + 60 * pulse(t, 5)) * (1 - k) * Math.sin(Math.PI * u)]);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      stroke(pts, rgba(LIME, 0.2), 30, { ink: null });
      ctx.restore();
      stroke(pts, LIME, 6, { ink: null });
      glow(W / 2, H / 2, 120 + 500 * k, LIME, 0.2 + 0.6 * k);
      // pink rings closing in, faster toward the hit
      for (let r = 0; r < 4; r++) {
        const u = frac(beatOf(t) * (1 + seg(t, 58.8, 60)) + r / 4);
        ctx.save(); ctx.globalAlpha = 0.5 * u;
        ellPath(W / 2, H / 2, (1 - u) * 1100 + 20, (1 - u) * 1100 + 20); ctx.strokeStyle = PINK; ctx.lineWidth = 5; ctx.stroke();
        ctx.restore();
      }
    } else {
      // after the hit: rays (lime frames) or speed lines and the grid (dark frames)
      if (limeFrame) {
        sunburst(TX, TY, rgba('#8FD01A', 0.55), rgba(LIME, 0), t * 0.4, 20, 2200);
      } else {
        floorGrid(t, 700, mix(LIME, GOLD, gold), 0.3 * (1 - gold * 0.5), 1.6);
        glow(TX, TY, 900, mix(PINK, GOLD, gold), 0.18 + 0.15 * pulse(t, 4));
      }
      // shock rings from the hit and every bar after
      for (let i = 0; i < 4; i++) {
        const ts = T_HIT2 + i * SONG.bar, age = t - ts;
        if (age < 0 || age > 1.2) continue;
        const k = easeOut(age / 1.2);
        ctx.save(); ctx.globalAlpha = 1 - k;
        ellPath(TX, TY, 200 + k * 1400, 120 + k * 900); ctx.strokeStyle = limeFrame ? INK : LIME; ctx.lineWidth = 18 * (1 - k) + 2; ctx.stroke();
        ctx.restore();
      }
      // gold spotlights come down in the last bar, for the Grammy stage
      if (gold > 0) {
        for (let i = 0; i < 5; i++) {
          const a = (i - 2) * 0.22 + Math.sin(t * 0.8 + i) * 0.05;
          beam(W / 2 + (i - 2) * 300, -60, a, 1400, 180, GOLD, ease(seg(t, T_GOLD + i * 0.15, T_GOLD + 0.8 + i * 0.15)) * (1 - 0.8 * ease(seg(t, 66.4, 67.2))));
        }
        // the lip of a stage rising into frame
        const lip = lerp(H + 60, 900, easeOut(seg(t, T_GOLD + 0.6, 67.2)));
        rrect(-200, lip, W + 400, 400, 0, { fill: lgrad(0, lip, 0, lip + 200, [[0, '#3A2A10'], [1, '#0A0704']]), stroke: null });
        stroke([[-200, lip], [W + 200, lip]], GOLD, 6, { ink: null, alpha: 0.9 });
        glow(W / 2, lip, 900, GOLD, 0.25 * gold);
        for (let i = 0; i < 40; i++) {
          const ph = frac(t * 0.35 + hash(i, 44)), x = hash(i, 45) * W, y = -40 + ph * (H + 80);
          sparkle(x, y, (4 + hash(i, 46) * 8) * gold, GOLD, t + i);
        }
      }
    }
    // the green-haired silhouette, black on the lime frames, rim-lit on the dark ones
    if (hit) {
      silhouette(1690, 930 - hop(t) * 8, 0.95, { t, hair: HAIR_GREEN, pose: 'mic', glow: limeFrame ? null : mix(LIME, GOLD, gold), body: INK, alpha: 1 - ease(seg(t, 66.5, 67.1)) });
    }
    camEnd();
    if (!hit) motes(t, 30, LIME, 0.3, 11);
    // the title, pulsing on the beat, and the crown landing on it
    if (hit) {
      const p = pulse(t, 6), sz = 220 * (1 + 0.04 * p);
      const col = limeFrame ? '#FFFFFF' : mix(LIME, '#FFFFFF', gold * 0.6);
      bigFact(t, T_HIT2, 67.0, '“bad guy”', TX, TY, sz, { color: col });
      const ca = t - (T_CROWN - 0.5);
      if (ca > 0) {
        const fall = clamp(ca / 0.5);
        const cy = lerp(-200, TY - 190, easeIn(fall));
        const land = t >= T_CROWN ? after(t, T_CROWN, 6) : 0;
        const k = clamp((67.0 - t) / 0.3);
        ctx.save(); ctx.globalAlpha *= k;
        if (t >= T_CROWN) glow(TX - 300, TY - 200, 260, GOLD, 0.5 * land + 0.15 + 0.1 * p);
        ctx.save(); ctx.translate(TX - 300, cy + 60); ctx.scale(1 + land * 0.25, 1 - land * 0.2); ctx.translate(-(TX - 300), -(cy + 60));
        crown(TX - 300, cy, 0.8, -0.18 + Math.sin(t * 2) * 0.02);
        ctx.restore();
        if (t >= T_CROWN && t < T_CROWN + 0.8) {
          const a = (t - T_CROWN) / 0.8;
          for (let i = 0; i < 10; i++) {
            const an = -Math.PI * (0.1 + 0.8 * hash(i, 61));
            sparkle(TX - 300 + Math.cos(an) * 260 * easeOut(a), TY - 150 + Math.sin(an) * 200 * easeOut(a), 22 * (1 - a), i % 2 ? GOLD : '#FFFFFF', a * 4);
          }
        }
        ctx.restore();
      }
    }
    flash(0.6 * after(t, T_HIT2, 10), '#FFFFFF');
    fillScreen(INK, 0.55 * ease(seg(t, 66.6, 67.2)));
    caption(t, T_HIT2 + 0.4, 67.0, '싱글 차트 핫 100 1위', '2019년 전 세계적인 히트');
  }

  chapter('rise', 38.4, 67.2, [[38.4, epSign], [48.0, chart], [57.6, badGuy]]);
})();
