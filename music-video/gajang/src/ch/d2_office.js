// gajang/src/ch/d2_office.js — chapter 2 · 회사 (38.40 – 67.20)
// Elevator mirror: tie, one big breath → a forced smile at the office door → desk chaos, and the
// black monitor that gives him a thumbs-up → the weight on his shoulders turns into his family →
// 포장마차, 짠! → a tipsy walk home, a wave to the moon, and the sun whips up into tomorrow.
(() => {
  const B = SONG.beat;
  const S = { lift: 38.4, door: 43.2, desk: 48.0, weight: 52.8, pocha: 57.6, walk: 62.4, end: 67.2 };
  const HIT1 = 50.4, HIT2 = 60.0, CLINK = 61.8;

  // ---- private helpers ---------------------------------------------------------------------------

  const hitK = (t, t0, len = 0.35) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  function camDrift(t, cx, cy, z = 1, rot = 0, amp = 1) {
    camBegin(cx + Math.sin(t * 0.5) * 8 * amp, cy + Math.cos(t * 0.37) * 6 * amp, z, rot + Math.sin(t * 0.3) * 0.004 * amp);
  }
  function fillRectW(x, y, w, h, style) { ctx.save(); ctx.fillStyle = style; ctx.fillRect(x, y, w, h); ctx.restore(); }

  /**
   * Arm angles that put a person's hand on a world point: returns { a, e } for limb().
   * (px, py) person's feet, s scale, role (for height), side -1 = screen-left arm, dy the person's dy.
   */
  function reach(px, py, s, role, side, tx, ty, o = {}) {
    const child = role === 'child', R = ROLE[role];
    const S = s * R.h;
    const sx = side * (child ? 56 : 64), sy = child ? -194 : -274;
    const l1 = child ? 48 : 66, l2 = child ? 44 : 62;
    let lx = (tx - px) / S * (o.flip ? -1 : 1), ly = (ty - (py - (o.dy || 0) * S)) / S;
    let dx = lx - sx, dy = ly - sy, d = Math.hypot(dx, dy);
    const dmax = l1 + l2 - 0.5, dmin = Math.abs(l1 - l2) + 4;
    if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
    if (d < dmin) { dx *= dmin / Math.max(d, 0.01); dy *= dmin / Math.max(d, 0.01); d = dmin; }
    const base = Math.atan2(dy, dx), al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = base + al, c2 = base - al;
    const out = o.elbowIn ? -1 : 1;
    const pick = Math.cos(c1) * side * out > Math.cos(c2) * side * out ? c1 : c2;
    const ex = sx + Math.cos(pick) * l1, ey = sy + Math.sin(pick) * l1;
    const vx = (sx + dx - ex) / l2, vy = (sy + dy - ey) / l2;
    const a = Math.atan2(Math.cos(pick) * side, Math.sin(pick));
    let e = Math.atan2(vx * side, vy) - a;
    while (e > Math.PI) e -= TAU;
    while (e < -Math.PI) e += TAU;
    return { a, e };
  }
  /** Both arms at once, spread straight into person(): armsTo(..., [lx, ly], [rx, ry]). */
  function armsTo(px, py, s, role, L, Rt, o = {}) {
    const r = {};
    if (L) { const k = reach(px, py, s, role, -1, L[0], L[1], o); r.aL = k.a; r.eL = k.e; }
    if (Rt) { const k = reach(px, py, s, role, 1, Rt[0], Rt[1], o); r.aR = k.a; r.eR = k.e; }
    return r;
  }
  const dad = (x, y, s, t, o = {}) => person(x, y, s, { role: 'dad', t, ...o });

  // A fist with the thumb up.
  function thumbUp(x, y, s = 1, rot = 0, color = PAL.skin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-10, -58, 22, 50, 11, { fill: color, lw: 4.5 });
    rrect(-26, -20, 52, 46, 16, { fill: color, lw: 5 });
    for (let i = 0; i < 3; i++) stroke([[-18, -6 + i * 11], [14, -6 + i * 11]], mix(color, PAL.ink, 0.35), 3, { ink: null });
    ctx.restore();
  }
  // An office desk phone.
  function deskPhone(x, y, s, ring, t) {
    const sh = ring ? Math.sin(t * 70) * 6 : 0;
    ctx.save(); ctx.translate(x + sh, y); ctx.scale(s, s); ctx.rotate(ring ? Math.sin(t * 60) * 0.05 : 0);
    rrect(-80, -40, 160, 80, 16, { fill: '#3A3F52', lw: 5 });
    for (let i = 0; i < 9; i++) rrect(-50 + (i % 3) * 24, -24 + Math.floor(i / 3) * 18, 16, 12, 3, { fill: '#C9CED8', stroke: null });
    rrect(24, -30, 44, 60, 8, { fill: '#88E0C8', lw: 3.5 });
    ctx.restore();
  }
  function handset(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    smooth([[-16, -70], [16, -70], [20, -40], [10, 40], [20, 70], [-16, 70], [-22, 40], [-10, -40], [-22, -60]], { fill: '#3A3F52', lw: 5 });
    ctx.restore();
  }

  // A generic office worker, head and shoulders, (x, y) the middle of the shoulders.
  const COATS = ['#DDEBFA', '#F4F6FA', '#E8DCC8', '#CFE8D8', '#F2D6DC', '#D8D4EC'];
  const HAIRS = ['#2B2733', '#4A3A30', '#3A3440', '#6B5A4A', '#1F1C26', '#7A5A44'];
  function worker(x, y, s, i, o = {}) {
    const coat = COATS[i % COATS.length], hair = HAIRS[(i * 3 + 1) % HAIRS.length];
    const style = Math.floor(hash(i, 41) * 4), skin = mix(PAL.skin, '#E8B894', hash(i, 42) * 0.6);
    const turn = o.turn || 0, fx = turn * 18;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    smooth([[-96, 10], [-84, -40], [0, -58], [84, -40], [96, 10], [100, 420], [-100, 420]], { fill: coat, lw: 5 });
    poly([[-22, -50], [22, -50], [0, 10]], { fill: '#FFFFFF', lw: 4 });
    if (style === 3 || style === 1) smooth([[-70, -150], [-76, -30], [76, -30], [70, -150]], { fill: hair, lw: 5 });
    ell(0, -126, 62, 66, { fill: skin, lw: 5 });
    if (style === 0 || style === 2) smooth([[-64, -140], [-60, -186], [0, -202], [60, -186], [64, -140], [40, -170], [-30, -168]], { fill: hair, lw: 5 });
    else smooth([[-68, -110], [-68, -180], [0, -206], [68, -180], [68, -110], [50, -160], [-50, -160]], { fill: hair, lw: 5 });
    const eyes = o.eyes || 'dot';
    for (const side of [-1, 1]) {
      const ex = fx + side * 24 + (o.lookX || 0) * 6, ey = -120 + (o.lookY || 0) * 5;
      if (eyes === 'wide') { ell(ex, ey, 11, 14, { fill: '#FFFFFF', lw: 3.5 }); circle(ex + (o.lookX || 0) * 4, ey, 5, { fill: PAL.ink, stroke: null }); }
      else if (eyes === 'happy') stroke([[ex - 10, ey + 4], [ex, ey - 5], [ex + 10, ey + 4]], PAL.ink, 4, { ink: null, smooth: true });
      else circle(ex, ey, 6, { fill: PAL.ink, stroke: null });
    }
    if (o.mouth === 'o') ell(fx, -90, 7, 9, { fill: '#7A2E3A', lw: 3 });
    else if (o.mouth === 'smile') stroke([[fx - 12, -94], [fx, -86], [fx + 12, -94]], PAL.ink, 4, { ink: null, smooth: true });
    else stroke([[fx - 8, -90], [fx + 8, -90]], PAL.ink, 4, { ink: null });
    if (hash(i, 44) > 0.6) { for (const side of [-1, 1]) rrect(fx + side * 24 - 18, -134, 36, 28, 8, { fill: 'rgba(255,255,255,0.2)', lw: 3.5 }); }
    ctx.restore();
    if (o.emote) emote(o.emote, x + 70 * s, y - 230 * s, o.emoteK ?? 1, 0);
  }

  // ---- 38.40 the elevator mirror: tie, one big breath ---------------------------------------------

  function lift(t, lt, dur) {
    const tighten = sylT(16, 4);              // 39.60 "조"
    const inhale = sylT(16, 7);               // 40.80 "숨"
    const exhale = sylT(16, 10);              // 42.00 "쉬"
    const floor = Math.min(12, 1 + Math.floor((t - S.lift) / (B * 0.75)));
    fillScreen('#9AA3B2');
    camDrift(t, 960, 540, 1.02 + lt * 0.01, 0, 0.5);
    // brushed steel walls behind him (seen in the mirror), the doors, the floor display
    fillRectW(-100, -100, 2200, 1300, lgrad(0, 0, W, 0, [[0, '#8C95A6'], [0.5, '#C4CAD4'], [1, '#8C95A6']]));
    for (let i = 0; i < 40; i++) stroke([[i * 52, -50], [i * 52 + 10, 1150]], '#FFFFFF', 2, { ink: null, alpha: 0.12 });
    rrect(560, 170, 800, 960, 8, { fill: '#B4BCC8', lw: 6 });
    stroke([[960, 170], [960, 1130]], PAL.ink, 5, { ink: null });
    for (const x of [620, 1020]) stroke([[x, 200], [x + 280, 200]], '#FFFFFF', 6, { ink: null, alpha: 0.4 });
    // floor display
    rrect(810, 40, 300, 100, 16, { fill: '#1E1A2E', lw: 6 });
    glow(960, 90, 180, '#FF5A5A', 0.25);
    const bump = Math.exp(-frac((t - S.lift) / (B * 0.75)) * 6);
    letter('▲', 870, 92, 50, '#FF6B6B', { lw: 0, shadow: null, alpha: 0.6 + 0.4 * bump });
    letter(String(floor), 1010, 92 - bump * 6, 76, '#FF6B6B', { lw: 0, shadow: null });
    // the ceiling light
    rrect(300, -40, 1320, 60, 20, { fill: '#F4FBFF', lw: 5 });
    glow(960, 0, 700, '#FFFFFF', 0.25);
    // a handrail across the back
    stroke([[-40, 760], [1960, 760]], '#E6EAF0', 18, { olw: 8 });
    // 아빠
    const fx = 960, fy = 1270, s = 1.95;
    const inK = easeOut(seg(t, inhale - 0.1, inhale + 0.5)) * (1 - easeIn(seg(t, exhale, exhale + 0.5)));
    const tieK = seg(t, tighten, tighten + 1.0);
    const tug = Math.sin(tieK * Math.PI * 3) * (1 - tieK);
    const head = [fx, fy - 370 * s];
    let arms;
    if (t < inhale - 0.2) {
      // hands on the knot, pulling it up in two tugs
      const ky = fy - 262 * s - tug * 16 - tieK * 8;
      arms = armsTo(fx, fy, s, 'dad', [fx - 30, ky + 50], [fx + 16, ky]);
    } else if (t < exhale + 0.4) {
      arms = { aL: 0.35 + inK * 0.3, aR: 0.35 + inK * 0.3, eL: 0.1, eR: 0.1 };
    } else {
      // a little fist of resolve
      arms = armsTo(fx, fy, s, 'dad', null, [fx + 190, fy - 250 * s - Math.sin(clamp((t - exhale - 0.4) * 6) * Math.PI) * 30]);
      arms.aL = 0.25; arms.eL = 0.15;
    }
    const m = t < inhale - 0.1 ? { eyes: t < tighten ? 'sleepy' : 'determined', mouth: 'flat' }
      : t < exhale ? { eyes: 'closed', mouth: 'flat' }
        : t < exhale + 0.7 ? { eyes: 'closed', mouth: 'o' } : { eyes: 'determined', mouth: 'smile' };
    ctx.save();
    ctx.translate(fx, fy - 250 * s); ctx.scale(1 + inK * 0.1, 1 + inK * 0.03); ctx.translate(-fx, -(fy - 250 * s));
    dad(fx, fy - inK * 10, s, t, {
      ...arms, ...m, looseTie: t < tighten + 0.5, dy: inK * 8, blush: 0.25 + inK * 0.5, bags: 0.5,
      headRot: -inK * 0.05, shadow: false,
    });
    ctx.restore();
    // puffed cheeks while holding the breath
    if (inK > 0.5 && t < exhale) {
      for (const side of [-1, 1]) ell(head[0] + side * 78, head[1] + 110, 24 * inK, 20 * inK, { fill: rgba(PAL.blush, 0.6), stroke: null });
    }
    // the long 후— out
    if (t > exhale) {
      const k = seg(t, exhale, exhale + 1.1);
      for (let i = 0; i < 3; i++) {
        const kk = clamp(k * 1.4 - i * 0.2);
        if (kk <= 0 || kk >= 1) continue;
        smooth(blobPts(head[0] + 150 + kk * 380 + i * 30, head[1] + 90 - kk * 80, 30 + kk * 60, 8, 0.2, i + 3), { fill: '#FFFFFF', stroke: null, alpha: 0.75 * (1 - kk) });
      }
      sfx('후—', head[0] + 420, head[1] - 60, 80, '#FFFFFF', t - exhale, { life: 1.0 });
    }
    // the mirror's own shine
    stroke([[80, 300], [300, 40]], '#FFFFFF', 22, { ink: null, alpha: 0.18 });
    stroke([[150, 330], [340, 110]], '#FFFFFF', 8, { ink: null, alpha: 0.18 });
    camEnd();
  }

  // ---- 43.20 the office door: a forced smile, and in he goes ---------------------------------------

  function doorSmile(t, lt, dur) {
    const cut = 45.6;
    if (t < cut) return corridor(t);
    return officeReveal(t);
  }

  function corridor(t) {
    const push = sylT(18, 0) + 0.25;          // fingers go up just after "웃"
    const release = 44.7;
    fillScreen('#C9D4D2');
    camDrift(t, 960, 540, 1.04 + (t - S.door) * 0.02, 0, 0.5);
    // a grey corridor: wall, a notice board, a tired plant
    fillRectW(-100, -100, 2200, 1300, lgrad(0, 0, 0, H, [[0, '#D8E2E0'], [1, '#B9C6C4']]));
    rrect(-100, 820, 2200, 400, 0, { fill: '#9AA8A8', stroke: null });
    rrect(180, 180, 380, 280, 10, { fill: '#C8A77E', lw: 5 });
    for (let i = 0; i < 4; i++) rrect(210 + (i % 2) * 170, 210 + Math.floor(i / 2) * 120, 140, 100, 4, { fill: ['#FFFFFF', '#FFF4B8', '#DDF0FF', '#FFE0E6'][i], lw: 3 }, 0);
    rrect(1520, 620, 150, 200, 20, { fill: '#C9745A', lw: 5 });
    for (let i = 0; i < 5; i++) smooth(blobPts(1595 + Math.cos(i * 1.3) * 60, 540 - i * 30, 50, 7, 0.2, i), { fill: i % 2 ? '#6FA86A' : '#5A9458', lw: 4 });
    rrect(300, 30, 1320, 40, 16, { fill: '#F4FBFF', lw: 5 });
    // 아빠, facing the door (and us)
    const fx = 960, fy = 1340, s = 2.1;
    const head = [fx, fy - 370 * s];
    const up = seg(t, push, push + 0.25) * (1 - seg(t, release, release + 0.2));
    const lift = easeOut(seg(t, push + 0.2, push + 0.6)) * up;
    let arms = { aL: 0.2, aR: 0.2, eL: 0.2, eR: 0.2 };
    if (up > 0) {
      const my = head[1] + 60 * s - lift * 18 * s;
      const k = armsTo(fx, fy, s, 'dad', [lerp(fx - 120, head[0] - 26 * s, up), lerp(fy - 150 * s, my, up)], [lerp(fx + 120, head[0] + 26 * s, up), lerp(fy - 150 * s, my, up)]);
      arms = k;
    }
    let m;
    if (t < push) m = { eyes: 'sleepy', mouth: 'flat' };
    else if (t < release) m = { eyes: 'sad', mouth: 'flat' };
    else m = { eyes: t < release + 0.35 ? 'wide' : 'happy', mouth: 'grin' };
    dad(fx, fy, s, t, {
      ...arms, ...m, bags: 0.55, blush: t > release ? 0.6 : 0.2, shadow: false,
      emote: t > release + 0.2 ? 'sparkle' : null, emoteK: seg(t, release + 0.2, release + 0.4),
    });
    // the pushed-up corners of his mouth
    if (up > 0.5 && t < release) {
      for (const side of [-1, 1]) stroke([[head[0] + side * 14 * s, head[1] + 64 * s], [head[0] + side * 30 * s, head[1] + (58 - lift * 16) * s]], PAL.ink, 5 * s * 0.7, { ink: null });
      for (const side of [-1, 1]) circle(head[0] + side * 30 * s, head[1] + (60 - lift * 18) * s, 10 * s, { fill: PAL.skin, lw: 4 });
    }
    if (t > release) sfx('방긋!', head[0] + 330, head[1] - 150, 84, PAL.gold, t - release, { life: 0.8, rot: 0.1 });
    camEnd();
  }

  function officeBack(t, glowK) {
    fillScreen('#DDEFEA');
    // back wall, ceiling lights, a clock, the door in the middle
    fillRectW(-200, -200, 2400, 900, lgrad(0, 0, 0, 700, [[0, '#E6F4F0'], [1, '#CFE6E0']]));
    rrect(-200, 690, 2400, 600, 0, { fill: '#B8C8C8', stroke: null });
    for (let i = 0; i < 5; i++) {
      const lx = 80 + i * 420;
      rrect(lx, 20, 260, 26, 8, { fill: '#FFFFFF', lw: 4 });
      glow(lx + 130, 40, 260, '#E8FFF8', 0.25);
    }
    wallClock(1500, 190, 56, 9, 1);
    rrect(250, 180, 360, 220, 10, { fill: '#FFFFFF', lw: 5 });
    stroke([[280, 360], [360, 300], [430, 330], [520, 230], [580, 250]], PAL.red, 7, { ink: null });
    letter('월간 실적', 430, 212, 34, PAL.ink, { lw: 0, shadow: null, font: 'round' });
  }

  // light fanning out of a doorway at (x, y)
  function lightFan(t, x, y, k) {
    if (k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + Math.sin(t * 0.8 + i) * 0.03 + t * 0.05;
      ctx.globalAlpha = 0.1 * k;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - 0.07) * 1600, y + Math.sin(a - 0.07) * 1600);
      ctx.lineTo(x + Math.cos(a + 0.07) * 1600, y + Math.sin(a + 0.07) * 1600);
      ctx.fillStyle = '#FFF4C8'; ctx.fill();
    }
    ctx.restore();
    glow(x, y, 420, '#FFF2C0', 0.4 * k);
  }

  function officeReveal(t) {
    const open = sylT(18, 5);                 // 46.20 "열"
    const ok = easeOut(seg(t, open - 0.05, open + 0.35));
    const [shx, shy] = shakeXY(t, open, 8, 0.3);
    fillScreen('#DDEFEA');
    camBegin(960 + shx, 500 + shy, 1.18 + seg(t, 45.6, 48.0) * 0.08);
    officeBack(t, ok);
    // the door frame and the corridor light beyond
    const dx = 960, dw = 300, dh = 470, dy0 = 690 - dh;
    rrect(dx - dw / 2 - 18, dy0 - 18, dw + 36, dh + 18, 8, { fill: '#8A9A9A', lw: 6 });
    fillRectW(dx - dw / 2, dy0, dw, dh, mix('#9AA8A8', '#FFF6D8', ok));
    lightFan(t, dx, dy0 + dh * 0.45, ok);
    // 아빠 in the doorway (seen through the frosted glass until it opens)
    const s = 0.9;
    const wave = t > open + 0.3 ? Math.sin((t - open) * 9) * 0.35 : 0;
    dad(dx, 690, s, t, {
      eyes: 'happy', mouth: 'grin', blush: 0.7, bags: 0.4,
      aR: t > open + 0.15 ? 2.7 + wave : 0.2, eR: t > open + 0.15 ? -0.3 : 0.2,
      holdL: (hx, hy) => briefcase(hx, hy - 6, 0.5),
      alpha: 0.45 + ok * 0.55,
    });
    // the door itself swings open towards us (squeezed as it turns)
    const panelW = dw * (1 - ok * 0.85);
    if (panelW > 4) {
      const px = dx - dw / 2;
      poly([[px, dy0], [px + panelW, dy0 - ok * 30], [px + panelW, 690 + ok * 30], [px, 690]], { fill: 'rgba(230,245,245,0.82)', lw: 5 });
      if (ok < 0.5) letter('영업2팀', px + panelW / 2, dy0 + 90, 40, '#5A6A7A', { lw: 0, shadow: null, alpha: 1 - ok * 2 });
      circle(px + panelW - 26, 470, 9, { fill: '#C9CED8', lw: 4 });
    }
    // the team, heads popping over the partitions to look
    const heads = [[330, 790, 0], [640, 800, 1], [1300, 800, 2], [1600, 790, 3]];
    heads.forEach(([x, y, i]) => {
      const t0 = open + 0.4 + i * B * 0.5;
      const k = backOut(clamp((t - t0) / 0.3));
      const toward = x < dx ? 1 : -1;
      worker(x, y + (1 - k) * 200, 1.05, i + 3, {
        eyes: 'wide', mouth: 'o', lookX: toward, lookY: -0.4, turn: toward * 0.4,
        emote: t > t0 + 0.2 ? '!' : null, emoteK: seg(t, t0 + 0.2, t0 + 0.35),
      });
    });
    // partitions in front
    for (const [x0, x1] of [[60, 820], [1100, 1860]]) {
      rrect(x0, 760, x1 - x0, 360, 10, { fill: '#8FA5B0', lw: 6 });
      rrect(x0, 748, x1 - x0, 24, 8, { fill: '#6F8590', lw: 5 });
    }
    camEnd();
    flash(hitK(t, open, 0.35) * 0.5, '#FFFBEA');
    flash(seg(t, 47.6, 48.0) * 0.5, '#FFFFFF');
  }

  // ---- 48.00 the desk: phones, typing, three monitors, and a thumbs-up from the black screen ------

  function desk(t, lt, dur) {
    if (t < HIT1) return deskChaos(t);
    return blackMonitor(t);
  }

  function screenSkew(x, y, w, h, skew, fill) {
    poly([[x, y], [x + w, y + skew], [x + w, y + h - skew], [x, y + h]], { fill, lw: 6 });
  }

  function deskChaos(t) {
    const ring1 = 48.6, ring2 = 49.2, grab = 49.5;
    const [shx, shy] = shakeXY(t, ring2, 6, 0.3);
    fillScreen('#DDEFEA');
    camDrift(t, 960 + shx, 540 + shy, 1.0 + seg(t, 48, 50.4) * 0.06, 0, 0.8);
    // wall with blinds
    fillRectW(-100, -100, 2200, 800, lgrad(0, 0, 0, 700, [[0, '#E6F4F0'], [1, '#D2E8E2']]));
    rrect(560, 40, 800, 330, 8, { fill: '#F4FBFF', lw: 5 });
    for (let i = 0; i < 12; i++) stroke([[570, 60 + i * 26], [1350, 60 + i * 26]], '#C9D6DE', 8, { ink: null });
    // 아빠 behind the desk
    const fx = 960, fy = 930, s = 1.3;
    const typing = t < grab;
    let arms;
    if (typing) {
      const j = Math.floor(t * 16);
      arms = armsTo(fx, fy, s, 'dad', [fx - 90 + hash(j, 1) * 40, 700 + hash(j, 2) * 16], [fx + 60 + hash(j, 3) * 40, 700 + hash(j, 4) * 16]);
    } else {
      // a phone at each ear
      const head = [fx, fy - 370 * s];
      arms = armsTo(fx, fy, s, 'dad', [head[0] - 105 * s, head[1] + 10 * s], [head[0] + 105 * s, head[1] + 10 * s]);
    }
    const m = t < ring1 ? { eyes: 'determined', mouth: 'flat' } : t < grab ? { eyes: 'wide', mouth: 'o' } : { eyes: 'spiral', mouth: 'wavy' };
    dad(fx, fy, s, t, {
      ...arms, ...m, bags: 0.6, blush: 0.3, shadow: false,
      emote: t > grab ? 'sweat' : null, emoteK: seg(t, grab, grab + 0.2),
      holdL: t > grab ? (hx, hy) => handset(hx + 6, hy, 0.9, -0.2) : null,
      holdR: t > grab ? (hx, hy) => handset(hx - 6, hy, 0.9, 0.2) : null,
    });
    // desk top and front
    poly([[80, 700], [1840, 700], [1920, 800], [0, 800]], { fill: '#E6CFA8', lw: 6 });
    rrect(0, 796, W, 320, 0, { fill: '#C9AE86', lw: 6 });
    // keyboard with blurred hands flying
    rrect(760, 704, 400, 60, 10, { fill: '#F4F6FA', lw: 5 });
    for (let i = 0; i < 24; i++) rrect(776 + (i % 12) * 31, 714 + Math.floor(i / 12) * 22, 24, 16, 3, { fill: frac(t * 9 + hash(i, 3)) < 0.3 && typing ? '#88E0C8' : '#D8DEE6', stroke: null });
    if (typing) {
      for (let i = 0; i < 6; i++) { const x = 790 + hash(Math.floor(t * 20), i) * 340; stroke([[x, 690], [x + 10, 670]], PAL.ink, 4, { ink: null, alpha: 0.6 }); }
      sfx('타다닥', 700, 640, 56, '#FFFFFF', frac((t - 48) / 1.2) * 1.2, { life: 0.9, rot: -0.1 });
    }
    // two phones, ringing
    const r1 = t > ring1 && t < grab, r2 = t > ring2 && t < grab;
    deskPhone(330, 740, 1.1, r1, t);
    deskPhone(1590, 740, 1.1, r2, t);
    // three monitors: left and right turned in towards him, one on an arm above
    const scr = (x, y, w, h, sk, seed) => {
      ctx.save(); polyPath([[x, y], [x + w, y + sk], [x + w, y + h - sk], [x, y + h]]); ctx.clip();
      fillRectW(x - 10, y - 10, w + 20, h + 20, '#F4FBFF');
      const sc = (t * 60 + seed * 40) % 40;
      for (let i = 0; i < 12; i++) rrect(x + 20, y + 20 + i * 40 - sc, w * (0.4 + hash(i + Math.floor((t * 60 + seed * 40) / 40), seed) * 0.4), 14, 4, { fill: '#B8D8E8', stroke: null });
      // new mail envelopes popping on the beat
      const n = Math.min(4, Math.max(0, beatN(t) - beatN(48.0) + seed));
      for (let i = 0; i < n; i++) {
        const k = i === n - 1 ? backOut(clamp(frac(beatOf(t)) * 4)) : 1;
        const ex = x + w * 0.3 + (i % 2) * w * 0.35, ey = y + h * 0.3 + Math.floor(i / 2) * h * 0.35;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(k, k);
        rrect(-40, -26, 80, 52, 6, { fill: '#FFFFFF', lw: 4 }); stroke([[-40, -26], [0, 4], [40, -26]], PAL.ink, 4, { ink: null });
        circle(34, -24, 12, { fill: PAL.red, lw: 3 });
        ctx.restore();
      }
      ctx.restore();
      poly([[x, y], [x + w, y + sk], [x + w, y + h - sk], [x, y + h]], { fill: null, lw: 6 });
    };
    // left monitor (screen faces right)
    stroke([[350, 700], [360, 600]], '#3A3F52', 20, { olw: 6 });
    screenSkew(170, 330, 360, 280, -30, '#3A3F52');
    scr(186, 346, 330, 248, -26, 0);
    // right monitor
    stroke([[1570, 700], [1560, 600]], '#3A3F52', 20, { olw: 6 });
    screenSkew(1390, 300, 360, 280, 30, '#3A3F52');
    scr(1404, 316 + 26, 330, 248, 26, 1);
    // top monitor on an arm
    stroke([[260, 330], [260, 180], [330, 150]], '#3A3F52', 14, { olw: 6 });
    screenSkew(250, 60, 300, 210, -24, '#3A3F52');
    scr(264, 74, 272, 182, -20, 2);
    if (r1) sfx('따르릉', 640, 560, 64, '#FFE08A', frac((t - ring1) / 0.6) * 0.6, { life: 0.6, rot: -0.12 });
    if (r2) sfx('따르릉', 1290, 610, 64, '#FFE08A', frac((t - ring2) / 0.6) * 0.6, { life: 0.6, rot: 0.12 });
    // the cords, stretched up to his ears
    if (!typing) {
      const head = [fx, fy - 370 * s];
      stroke([[380, 730], [520, 600], [head[0] - 130 * s, head[1] + 40 * s]], '#3A3F52', 5, { ink: null, smooth: true });
      stroke([[1540, 730], [1400, 600], [head[0] + 130 * s, head[1] + 40 * s]], '#3A3F52', 5, { ink: null, smooth: true });
    }
    camEnd();
    flash(hitK(t, 48.0, 0.3) * 0.6, '#FFFFFF');
  }

  function blackMonitor(t) {
    const cheer = HIT1 + 0.6;                 // the reflection gives a thumbs-up
    const [shx, shy] = shakeXY(t, HIT1, 22, 0.45);
    fillScreen('#CFE6E0');
    camDrift(t, 960 + shx, 520 + shy, 1.0 + seg(t, HIT1, 52.8) * 0.08, 0, 0.6);
    fillRectW(-100, -100, 2200, 1300, lgrad(0, 0, 0, H, [[0, '#DDEFEA'], [1, '#C4DCD6']]));
    // the monitor, filling the frame
    rrect(300, 60, 1320, 790, 30, { fill: '#2E3242', lw: 8 });
    const sx = 336, sy = 96, sw = 1248, sh = 700;
    ctx.save(); rrectPath(sx, sy, sw, sh, 12); ctx.clip();
    fillRectW(sx, sy, sw, sh, lgrad(0, sy, 0, sy + sh, [[0, '#1B2130'], [1, '#121620']]));
    // what the black glass reflects: the office lights, and him
    for (let i = 0; i < 4; i++) rrect(sx + 100 + i * 300, sy + 30, 180, 16, 6, { fill: 'rgba(220,255,245,0.18)', stroke: null });
    const rx = 1120, ry = 1190, rs = 2.0;
    const up = seg(t, cheer - 0.15, cheer + 0.1);
    const head = [rx, ry - 370 * rs];
    let arms = { aL: 0.2, aR: 0.2, eL: 0.2, eR: 0.2 };
    if (up > 0) {
      const k = reach(rx, ry, rs, 'dad', 1, lerp(rx + 160, head[0] + 170, up), lerp(ry - 150 * rs, head[1] + 40, up));
      arms.aR = k.a; arms.eR = k.e;
    }
    ctx.save(); ctx.globalAlpha = 0.5;
    dad(rx, ry, rs, t, {
      ...arms, shadow: false, bags: 0.5,
      eyes: t < cheer ? 'sleepy' : 'wink', mouth: t < cheer ? 'flat' : 'grin', blush: t < cheer ? 0.1 : 0.6,
      rot: t < cheer ? -0.05 : 0,
      holdR: up > 0.3 ? (hx, hy) => thumbUp(hx, hy - 14, 1.6, 0) : null,
    });
    ctx.restore();
    fillRectW(sx, sy, sw, sh, 'rgba(40,80,120,0.18)');
    // 절전 모드: the screen has just gone to sleep
    const ps = seg(t, HIT1, HIT1 + 0.1) - seg(t, HIT1 + 0.5, HIT1 + 0.9);
    if (ps > 0) letter('절전 모드', sx + sw / 2, sy + sh / 2, 60, '#8A93A6', { lw: 0, shadow: null, alpha: ps, font: 'round' });
    // screen glare
    stroke([[sx + 60, sy + 400], [sx + 360, sy + 40]], '#FFFFFF', 30, { ink: null, alpha: 0.07 });
    ctx.restore();
    if (t > cheer) {
      const k = hitK(t, cheer, 1.0);
      sparkle(head[0] + 260, head[1] - 60, 20 + 30 * k, '#FFFFFF', t);
      sparkle(head[0] - 220, head[1] + 40, 10 + 18 * k, PAL.gold, -t);
      sfx('반짝', head[0] + 330, head[1] - 170, 70, PAL.gold, t - cheer, { life: 1.0, rot: 0.1 });
    }
    // monitor stand and a post-it
    rrect(880, 850, 160, 120, 8, { fill: '#2E3242', lw: 6 });
    rrect(1520, 120, 110, 110, 4, { fill: '#FFE66D', lw: 4 }, 0);
    letter('힘내!', 1575, 176, 34, PAL.ink, { lw: 0, shadow: null, font: 'round', rot: 0.08 });
    // the real 아빠: the back of his head in the foreground, leaning back in his chair
    const lean = easeOut(seg(t, HIT1, HIT1 + 0.4));
    const bx = 420 - lean * 40, by = 900 + lean * 50;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.12 * lean + (t > 51.4 && t < 52.0 ? Math.sin((t - 51.4) * 20) * 0.05 : 0));
    smooth([[-300, 400], [-260, 120], [-120, 60], [120, 60], [260, 120], [300, 400]], { fill: '#4A4F63', lw: 7 });
    poly([[-60, 64], [60, 64], [0, 140]], { fill: '#F4F6FA', lw: 5 });
    ell(-150, -40, 30, 48, { fill: PAL.skin, lw: 5 });
    ell(150, -40, 30, 48, { fill: PAL.skin, lw: 5 });
    ell(0, -60, 150, 160, { fill: '#2B2733', lw: 7 });
    stroke([[-140, -30], [-128, -110]], '#9A97A6', 14, { ink: null });
    stroke([[140, -30], [128, -110]], '#9A97A6', 14, { ink: null });
    ctx.restore();
    // the chair back in front of him
    rrect(bx - 250, by + 140, 500, 300, 60, { fill: '#3A3F52', lw: 7 });
    for (let i = 0; i < 5; i++) stroke([[bx - 200 + i * 100, by + 170], [bx - 200 + i * 100, by + 420]], '#50566E', 6, { ink: null });
    if (t > HIT1) sfx('삐걱', bx + 300, by - 170, 60, '#FFFFFF', t - HIT1, { life: 0.7, rot: -0.1 });
    if (t > cheer + 0.5) emote('?', bx + 170, by - 250, clamp((t - cheer - 0.5) / 0.2), t);
    camEnd();
    flash(hitK(t, HIT1, 0.25) * 0.7, '#FFFFFF');
    speedLines(t, 1130, 400, hitK(t, HIT1, 0.5), '#FFFFFF');
  }

  // ---- 52.80 the weight on his shoulders, turning into his family ---------------------------------

  const LOADS = [53.4, 54.0, 54.6, 55.2];     // 위 · 무 · 만 · 사
  const MORPH = 56.4;

  function loadHouse(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-120, -170, 240, 170, 8, { fill: '#F2C9A0', lw: 6 });
    rrect(-128, -186, 256, 22, 6, { fill: '#B55B4B', lw: 5 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rrect(-100 + c * 52, -150 + r * 46, 36, 28, 3, { fill: '#9FD6F2', lw: 3 });
    letter('대출', 0, -210, 40, PAL.red, { lw: 6 });
    ctx.restore();
  }
  function loadBag(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    stroke([[-40, -120], [-30, -150], [30, -150], [40, -120]], '#2A2438', 10, { olw: 6 });
    rrect(-100, -124, 200, 124, 26, { fill: PAL.pink, lw: 6 });
    rrect(-60, -80, 120, 60, 12, { fill: '#FFB8CC', lw: 4 });
    letter('학원', 0, -50, 36, '#FFFFFF', { lw: 6, shadow: null });
    ctx.restore();
  }
  function loadFrame(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-110, -130, 220, 130, 8, { fill: '#C9A07A', lw: 6 });
    rrect(-92, -114, 184, 98, 4, { fill: '#BFE3F5', lw: 3 });
    for (const [px, pr, c] of [[-50, 22, '#4A4F63'], [-10, 18, PAL.pink], [26, 13, PAL.gold], [56, 16, '#3E4E7A']]) {
      circle(px, -76, pr * 0.6, { fill: PAL.skin, lw: 2.5 }); ell(px, -34, pr * 0.8, pr, { fill: c, lw: 2.5 });
    }
    ctx.restore();
  }
  function loadBills(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(-50 + i * 34, -20 - i * 10); ctx.rotate(-0.3 + i * 0.2 + Math.sin(t * 5 + i) * 0.08);
      rrect(-40, -54, 80, 100, 4, { fill: '#FFFFFF', lw: 4 });
      for (let j = 0; j < 4; j++) stroke([[-28, -34 + j * 18], [24, -34 + j * 18]], '#C9CED8', 4, { ink: null });
      letter('₩', 0, 30, 30, PAL.red, { lw: 0, shadow: null });
      ctx.restore();
    }
    ctx.restore();
  }

  function weight(t, lt, dur) {
    fillScreen('#DDEEE8');
    const grow = easeInOut(seg(t, 53.2, 55.6));
    camDrift(t, 960, lerp(640, 470, grow), lerp(1.45, 1.12, grow), 0, 0.6);
    // a soft street going by behind him
    fillRectW(-100, -100, 2200, 1300, lgrad(0, 0, 0, H, [[0, '#E4F2EE'], [0.7, '#D2E6E2'], [1, '#C9DCD8']]));
    const scroll = lt * 150;
    for (let i = 0; i < 12; i++) {
      const x = ((i * 240 - scroll) % 2880 + 2880) % 2880 - 400, bh = 200 + hash(i, 5) * 300;
      rrect(x, 760 - bh, 200, bh + 10, 8, { fill: mix('#B8D2CC', '#E8F4F0', hash(i, 6)), stroke: null });
      for (let r = 0; r < Math.floor(bh / 70); r++) rrect(x + 26, 760 - bh + 30 + r * 70, 148, 22, 4, { fill: '#F4FBF8', stroke: null });
    }
    rrect(-100, 760, 2200, 500, 0, { fill: '#B5C4C0', stroke: null });
    for (let i = 0; i < 14; i++) { const x = ((i * 200 - scroll * 1.6) % 2800 + 2800) % 2800 - 400; stroke([[x, 780], [x - 120, 1100]], '#A6B6B2', 4, { ink: null }); }
    // 아빠, walking in place, the stack growing on his shoulders
    const fx = 960, fy = 930, s = 0.92;
    const n = LOADS.filter(x => t >= x - 0.12).length;
    const lastHit = n ? LOADS[n - 1] : -9;
    const sink = hitK(t, lastHit, 0.5);
    const morph = seg(t, MORPH - 0.1, MORPH + 0.5);
    const walkPh = lt * 0.8;
    const bob = Math.abs(Math.sin(walkPh * TAU)) * 8 * s;
    const load = n * 0.02;
    const top = fy - 470 * s - bob + sink * 16 + load * 200;
    const carry = morph > 0.3;
    const armO = carry ? { aL: 1.5, eL: -0.25, aR: 1.5, eR: -0.25 } : (n ? { aL: 2.5, eL: 0.9, aR: 2.5, eR: 0.9 } : {});
    const face = carry ? { eyes: 'happy', mouth: 'grin', blush: 0.7 }
      : n >= 3 ? { eyes: 'happy', mouth: 'smile', emote: 'sweat', emoteK: 1 } : n ? { eyes: 'determined', mouth: 'smile' } : { eyes: 'open', mouth: 'smile' };
    const famK = carry ? backOut(seg(t, MORPH + 0.15, MORPH + 0.55)) : 0;
    const headTop = fy - 455 * s - bob;
    if (carry) {
      // the little one straddling his neck, drawn behind his head
      ctx.save(); ctx.translate(fx, headTop + 40); ctx.scale(famK, famK); ctx.translate(-fx, -(headTop + 40));
      person(fx, headTop + 70, 0.95, {
        role: 'child', t, sit: true, lL: 1.2, lR: 1.2, kL: -1.0, kR: -1.0, shadow: false,
        eyes: 'happy', mouth: 'open', blush: 0.8, ...dance('cheer', t, 1), dy: 0,
      });
      ctx.restore();
    }
    dad(fx, fy, s, t, {
      walk: walkPh, ...armO, ...face, sq: sink * 0.06 + load, bags: 0.4,
    });
    if (carry) {
      // his hands holding the little one's feet
      for (const side of [-1, 1]) circle(fx + side * 70 * s, headTop + 170 * s, 16 * s * famK, { fill: PAL.skin, lw: 4 });
    }
    // the stack: house, academy bag, family photo, bills
    const wob = Math.sin(walkPh * TAU) * 0.03 * n;
    if (morph < 1) {
      ctx.save(); ctx.globalAlpha = 1 - morph;
      ctx.translate(fx, top); ctx.rotate(wob);
      let y = 0;
      const drop = i => { const t0 = LOADS[i]; return t < t0 ? (1 - easeIn(seg(t, t0 - 0.35, t0))) * -700 : 0; };
      const items = [[loadHouse, 186, 0.9], [loadBag, 150, 0.85], [loadFrame, 136, 0.85], [(x, yy, sc) => loadBills(x, yy, sc, t), 110, 0.9]];
      items.forEach(([fn, h, sc], i) => {
        if (t < LOADS[i] - 0.35) return;
        const d = drop(i), land = hitK(t, LOADS[i], 0.3);
        ctx.save(); ctx.translate(Math.sin(i * 2.1) * 10, y + d); ctx.scale(1 + land * 0.12, 1 - land * 0.12);
        fn(0, 0, sc);
        ctx.restore();
        y -= h * sc;
      });
      ctx.restore();
      LOADS.forEach((t0, i) => { if (t > t0) sfx(['쿵', '턱', '툭', '팔랑'][i], fx + (i % 2 ? 300 : -300), top - 120 - i * 60, 64, '#FFFFFF', t - t0, { life: 0.6, rot: i % 2 ? 0.1 : -0.1 }); });
    }
    // the sparkle poof as the weight turns into them
    if (morph > 0 && morph < 1) {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, r = 60 + morph * 260;
        smooth(blobPts(fx + Math.cos(a) * r * 0.8, top - 220 + Math.sin(a) * r * 0.9, 50 * (1 - morph) + 20, 7, 0.2, i), { fill: '#FFFFFF', stroke: null, alpha: 0.9 * (1 - morph) });
      }
      for (let i = 0; i < 8; i++) sparkle(fx + hrange(-320, 320, i, 3), top - 380 + hrange(-160, 200, i, 4), 26 * (1 - morph) + 8, i % 2 ? PAL.gold : '#FFFFFF', t + i);
    }
    // the family riding him: the little one on his shoulders, 엄마 and 첫째 on his arms
    if (carry) {
      const k = famK;
      const shoulderY = fy - 290 * s - bob;
      ctx.save(); ctx.translate(fx, shoulderY); ctx.scale(k, k); ctx.translate(-fx, -shoulderY);
      const armY = shoulderY - 10;
      person(fx - 200 * s, armY + 10, 0.5, { role: 'mom', t, sit: true, shadow: false, eyes: 'happy', mouth: 'smile', blush: 0.6, aL: 0.6, aR: 2.6, eR: -0.3 });
      kid(fx + 200 * s, armY + 10, 0.55, { who: 'pony', t, sit: true, shadow: false, eyes: 'happy', mouth: 'grin', aR: 2.8, aL: 0.5, dy: hop(t) * 8 });
      ctx.restore();
      if (t > MORPH + 0.4) for (let i = 0; i < 3; i++) {
        const f = frac((t - MORPH) * 0.7 + i / 3);
        poly(heartPts(fx - 260 + i * 260 + Math.sin(f * 7 + i) * 20, shoulderY - 360 - f * 200, 18 + i * 4), { fill: PAL.pink, lw: 3.5, alpha: Math.sin(f * Math.PI) });
      }
    }
    camEnd();
  }

  // ---- 57.60 포장마차: 60.00 hit, 61.80 짠! ----------------------------------------------------------

  function pocha(t, lt, dur) {
    const [shx, shy] = shakeXY(t, HIT2, 18, 0.4);
    const [cx2, cy2] = shakeXY(t, CLINK, 12, 0.3);
    fillScreen('#2A1E2E');
    camDrift(t, 960 + shx + cx2, 520 + shy + cy2, 1.02 + seg(t, 57.6, 62.4) * 0.07 + hitK(t, HIT2, 0.4) * 0.04, 0, 0.8);
    // the orange tent all around, glowing
    fillRectW(-200, -200, 2400, 1400, lgrad(0, 0, 0, H, [[0, '#E0602E'], [0.5, '#F2873A'], [1, '#C9502A']]));
    for (let i = 0; i < 9; i++) stroke([[i * 250 - 100, -100], [i * 250 - 60, 900]], '#C9502A', 10, { ink: null, alpha: 0.5 });
    // a clear plastic window: the night street outside
    rrect(1260, 90, 560, 330, 20, { fill: '#27234A', lw: 6 });
    ctx.save(); rrectPath(1260, 90, 560, 330, 20); ctx.clip();
    for (let i = 0; i < 6; i++) { const x = 1280 + i * 100; rrect(x, 250 - hash(i, 3) * 120, 80, 300, 4, { fill: '#3A3668', stroke: null }); rrect(x + 20, 280 - hash(i, 3) * 100, 16, 14, 2, { fill: '#FFD98A', stroke: null }); }
    ctx.restore();
    stroke([[1260, 255], [1820, 255]], 'rgba(255,255,255,0.3)', 4, { ink: null });
    glow(960, 300, 1100, '#FFB060', 0.25);
    // a string of bulbs, swinging a little on the beat
    const sw = Math.sin(beatOf(t) * Math.PI) * 8;
    ctx.beginPath(); ctx.moveTo(-50, 60);
    for (let i = 0; i <= 20; i++) { const x = -50 + i * 104, y = 60 + Math.sin(i / 20 * Math.PI) * 60 + (i % 2 ? sw : -sw) * 0.4; ctx.lineTo(x, y); }
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.stroke();
    for (let i = 1; i < 20; i += 2) {
      const x = -50 + i * 104, y = 60 + Math.sin(i / 20 * Math.PI) * 60 + sw * 0.4 + 24;
      const on = 0.7 + 0.3 * pulse(t + i * 0.07, 3) + hitK(t, HIT2, 0.5) * 0.6;
      circle(x, y, 16, { fill: '#FFE9A8', lw: 4 });
      glow(x, y, 70, '#FFD06A', 0.4 * on);
    }
    // the menu on the tent wall
    rrect(120, 130, 330, 240, 10, { fill: '#FFF4D8', lw: 5 });
    ['어묵', '닭발', '계란말이', '소주'].forEach((w, i) => letter(w, 190 + (i % 2) * 150, 200 + Math.floor(i / 2) * 90, 40, PAL.ink, { lw: 0, shadow: null, font: 'round' }));
    // odeng pot with steam
    rrect(1450, 600, 330, 170, 20, { fill: '#9AA3B5', lw: 6 });
    rrect(1470, 590, 290, 40, 10, { fill: '#C9A06A', stroke: null });
    for (let i = 0; i < 5; i++) { stroke([[1500 + i * 55, 600], [1520 + i * 55, 470]], '#D9B98A', 8, { olw: 6 }); rrect(1488 + i * 55, 540, 40, 60, 10, { fill: '#F2C98A', lw: 4 }); }
    for (let i = 0; i < 6; i++) {
      const f = frac(lt * 0.35 + i / 6);
      smooth(blobPts(1600 + Math.sin(f * 6 + i) * 60, 520 - f * 380, 30 + f * 50, 7, 0.25, i), { fill: '#FFFFFF', stroke: null, alpha: 0.35 * Math.sin(f * Math.PI) });
    }
    // three of them round the table; glasses meet over the middle at 짠
    const up = seg(t, HIT2 - 0.5, HIT2);                 // everybody raises a glass
    const meet = seg(t, CLINK - 0.5, CLINK - 0.02);      // and brings it in
    const drink = seg(t, CLINK + 0.25, CLINK + 0.55);
    const cheer = t > HIT2;
    const CX = 960, CY = 640;
    const cast = [
      { role: 'coworker', x: 680, s: 1.12, flip: false, side: 1, i: 0 },
      { role: 'dad', x: 960, s: 1.18, flip: false, side: 1, i: 1 },
      { role: 'boss', x: 1240, s: 1.1, flip: true, side: 1, i: 2 },
    ];
    const tableY = 790, fyBase = 935;
    const glassAt = c => {
      const rest = [c.x + (c.flip ? -120 : 120), tableY - 20];
      const high = [c.x + (c.flip ? -110 : 110), fyBase - 400 * c.s];
      const mid = [CX + (c.i - 1) * 60 + (c.i === 1 ? 50 : 0), CY - (c.i === 1 ? 30 : 0)];
      let p = [lerp(rest[0], high[0], easeOut(up)), lerp(rest[1], high[1], easeOut(up))];
      p = [lerp(p[0], mid[0], easeInOut(meet)), lerp(p[1], mid[1], easeInOut(meet))];
      if (drink > 0) {
        const mouth = [c.x + (c.flip ? -40 : 40), fyBase - 330 * c.s];
        p = [lerp(p[0], mouth[0], easeInOut(drink)), lerp(p[1], mouth[1], easeInOut(drink))];
      }
      return p;
    };
    // pouring before the hit
    const pour = seg(t, 57.9, 59.1);
    cast.forEach(c => {
      const fy = fyBase + (cheer ? -hitK(t, HIT2, 0.5) * 30 : 0) - (up * 10);
      const g = glassAt(c);
      const wx = c.flip ? -1 : 1;
      let arms;
      if (c.role === 'dad' && t < HIT2 - 0.5) {
        const bottle = [c.x + 150, tableY - 140];
        arms = armsTo(c.x, fy, c.s, c.role, [c.x - 120, tableY - 20], [bottle[0], bottle[1]]);
      } else {
        const tgt = [(g[0] - c.x) * wx + c.x, g[1]];
        arms = armsTo(c.x, fy, c.s, c.role, [c.x - 120, tableY - 20], tgt);
      }
      const face = t > CLINK + 0.25 ? { eyes: 'closed', mouth: 'o' } : cheer ? { eyes: 'happy', mouth: 'grin' }
        : c.role === 'boss' ? { eyes: 'happy', mouth: 'smile' } : { eyes: 'open', mouth: 'smile' };
      person(c.x, fy, c.s, {
        role: c.role, t, flip: c.flip, ...arms, ...face, blush: 0.5 + up * 0.4, shadow: false,
        looseTie: true, jacket: c.role === 'boss' ? true : false, bags: c.role === 'dad' ? 0.35 : undefined,
        headRot: drink > 0 ? -0.18 * drink * wx : Math.sin(beatOf(t) * Math.PI) * 0.03,
        holdR: (hx, hy) => {
          if (c.role === 'dad' && t < HIT2 - 0.5) {
            sojuBottle(hx, hy + 70, 0.8, lerp(0.2, 1.7, easeInOut(pour)) - seg(t, 59.1, 59.4) * 1.5);
          } else sojuGlass(hx, hy + 24, 1.0, drink > 0.5 ? 0.2 : 1);
        },
      });
      // the boss's tie round his head, as is traditional
      if (c.role === 'boss' && cheer) {
        const hx = c.x, hy = fy - 370 * c.s * 1.02 - 46;
        stroke([[hx - 92, hy + 10], [hx + 92, hy - 4]], '#D8383E', 16, { olw: 7 });
        poly([[hx + 80, hy - 4], [hx + 130, hy - 40], [hx + 140, hy - 16]], { fill: '#D8383E', lw: 4 });
      }
    });
    // pour stream

    // the table: dishes, a bottle, the dad's glass waiting
    rrect(300, tableY + 40, 1320, 400, 0, { fill: '#A87C4A', lw: 7 });
    ell(960, tableY + 40, 660, 70, { fill: '#D8B07A', lw: 7 });
    ell(760, tableY + 40, 110, 36, { fill: '#FFFFFF', lw: 5 });
    for (let i = 0; i < 4; i++) rrect(700 + i * 30, tableY + 10 + (i % 2) * 14, 60, 24, 8, { fill: '#F2C98A', lw: 3.5 });
    ell(1170, tableY + 44, 90, 30, { fill: '#FFFFFF', lw: 5 });
    rrect(1120, tableY + 20, 100, 36, 12, { fill: '#FFE08A', lw: 4 });
    sojuBottle(620, tableY + 30, 0.7, 0);
    sojuBottle(1300, tableY + 40, 0.7, -0.1);
    camEnd();
    // the hit: warm flare
    flash(hitK(t, HIT2, 0.25) * 0.55, '#FFE9B0');
    // 짠!
    if (t > CLINK - 0.05) {
      const k = hitK(t, CLINK, 0.6);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      sunburst(CX, CY - 40, rgba('#FFF4C8', 0.22 * k), rgba('#FFFFFF', 0), t * 0.2, 16, 900);
      ctx.restore();
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (i - 6.5) * 0.22, age = t - CLINK, r = 60 + age * 700;
        if (age > 0.6) continue;
        circle(CX + Math.cos(a) * r, CY + Math.sin(a) * r + age * age * 900, 9 * (1 - age / 0.6) + 2, { fill: '#DDF4FF', lw: 3 });
      }
      sfx('짠!', CX, 190, 150, '#FFE08A', t - CLINK, { life: 1.1 });
    }
  }

  // ---- 62.40 the walk home: a wave to the moon, and the sun whips up into tomorrow -----------------

  function walkHome(t, lt, dur) {
    const waveT = sylT(26, 5);                // 64.20 "웃"
    const whip = 66.0;
    const day = easeInOut(seg(t, whip, 67.0));
    const [shx, shy] = shakeXY(t, whip + 0.3, 10, 0.4);
    // night → morning
    skyFill([[0, mix('#141A3C', '#9ED6F5', day)], [0.6, mix('#2A2F66', '#E4F4FF', day)], [1, mix('#4A3E78', '#FFF1D6', day)]]);
    camDrift(t, 960 + shx, 540 + shy, 1.0 + seg(t, 62.4, 66.0) * 0.05, 0, 0.6);
    stars(t, 70, 51, 1 - day * 1.5, 600);
    // the moon, with a face that answers his wave; it drops away when the sun comes
    const mx = lerp(1450, 2100, easeIn(seg(t, whip - 0.2, whip + 0.6))), my = lerp(220, 520, easeIn(seg(t, whip - 0.2, whip + 0.6)));
    moon(mx, my, 110);
    const moonWink = t > waveT + 0.9 && t < whip;
    for (const side of [-1, 1]) {
      if (moonWink && side === 1) stroke([[mx + side * 34 - 12, my - 6], [mx + side * 34 + 12, my - 6]], '#8A7A50', 6, { ink: null });
      else stroke([[mx + side * 34 - 12, my - 2], [mx + side * 34, my - 12], [mx + side * 34 + 12, my - 2]], '#8A7A50', 6, { ink: null, smooth: true });
    }
    stroke([[mx - 24, my + 30], [mx, my + 44], [mx + 24, my + 30]], '#8A7A50', 6, { ink: null, smooth: true });
    ell(mx - 60, my + 22, 16, 9, { fill: rgba(PAL.blush, 0.6), stroke: null });
    ell(mx + 60, my + 22, 16, 9, { fill: rgba(PAL.blush, 0.6), stroke: null });
    // the sun, whipping up from behind the town
    const sy = lerp(1300, 250, easeOut(seg(t, whip, whip + 0.8)));
    if (t > whip - 0.05) {
      sun(420, sy, 120, '#FFE27A');
      const trail = seg(t, whip, whip + 0.8);
      if (trail < 1) for (let i = 0; i < 5; i++) stroke([[360 + i * 30, sy + 150], [360 + i * 30, sy + 150 + 300 * (1 - trail)]], '#FFF4C8', 10, { ink: null, alpha: 0.7 * (1 - trail) });
    }
    // the town
    for (let i = 0; i < 12; i++) {
      const x = -100 + i * 190, bh = 220 + hash(i, 61) * 260, tone = mix('#2A3160', '#B8C8DC', day);
      rrect(x, 780 - bh, 170, bh + 20, 6, { fill: tone, stroke: null });
      for (let r = 0; r < Math.floor(bh / 60); r++) for (let c = 0; c < 3; c++) {
        const on = hash(i * 7 + r, c) < 0.35 * (1 - day);
        rrect(x + 18 + c * 50, 780 - bh + 24 + r * 60, 34, 24, 3, { fill: on ? '#FFD98A' : mix('#1E2448', '#E4F0FA', day), stroke: null });
      }
    }
    rrect(-100, 770, 2200, 500, 0, { fill: mix('#23284A', '#C9CFD8', day), stroke: null });
    rrect(-100, 770, 2200, 30, 0, { fill: mix('#3A3F66', '#E0E4EA', day), stroke: null });
    // lamps along the way, their pools of light; off when morning comes
    const scroll = lt * 120;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 520 - scroll) % 2600 + 2600) % 2600 - 300;
      streetlight(x, 800, 1.0, 1 - day);
      if (day < 1) ell(x + 60, 820, 180, 30, { fill: rgba('#FFD06A', 0.25 * (1 - day)), stroke: null });
    }
    // 아빠, a little tipsy, walking and waving at the moon
    const fx = 900, fy = 880, s = 1.0;
    const wobble = Math.sin(t * 2.6) * 0.07;
    const waving = t > waveT - 0.1 && t < whip;
    const wv = Math.sin((t - waveT) * 10) * 0.35;
    const shock = t > whip + 0.2;
    dad(fx + Math.sin(t * 1.3) * 20, fy, s, t, {
      walk: t < whip + 0.3 ? lt * 0.7 : undefined, rot: shock ? 0 : wobble,
      aR: waving ? 2.8 + wv : shock ? 2.4 : 0.3, eR: waving ? -0.3 : shock ? 0.6 : 0.2,
      aL: 0.2, eL: 0.1,
      eyes: shock ? 'wide' : 'happy', mouth: shock ? 'o' : waving ? 'grin' : 'smile', blush: shock ? 0.4 : 0.95,
      looseTie: true, headRot: shock ? 0 : wobble * 0.8, lookX: -0.6, lookY: -0.6, bags: 0.6,
      holdL: (hx, hy) => briefcase(hx, hy - 6, 0.55, Math.sin(t * 2.6) * 0.2),
      emote: shock ? '!?' : waving ? 'music' : null, emoteK: shock ? seg(t, whip + 0.2, whip + 0.4) : seg(t, waveT, waveT + 0.2),
    });
    if (moonWink) sfx('찡긋', mx - 190, my - 110, 56, '#FFF6D6', t - waveT - 0.9, { life: 0.9 });
    camEnd();
    // morning floods in, bright and clean, into tomorrow's meeting room
    flash(ease(seg(t, 66.6, 67.2)) * 0.9, '#F4FBF8');
  }

  chapter('office', 38.4, 67.2, [
    [S.lift, lift],
    [S.door, doorSmile],
    [S.desk, desk],
    [S.weight, weight],
    [S.pocha, pocha],
    [S.walk, walkHome],
  ]);
})();
