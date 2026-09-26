// The cast: three friends in school uniform, and the grown-ups around them.
//
//   kid(x, y, s, o)    (x, y) is the ground point between the feet. At s = 1 a kid is 400 tall.
//   adult(x, y, s, o)  the same, 540 tall at s = 1.
//
// Arms and legs are rubber hoses. Angles are radians measured from hanging straight down;
// positive swings the limb away from the body (so PI/2 is straight out to the side, PI is
// straight up). Elbows and knees bend with eL/eR and kL/kR.

/* eslint-disable no-unused-vars */
const WHO = {
  // the one the song is about: short black hair, a cowlick that will not lie down, yellow bag
  me: { hair: '#2F2A3A', hairLt: '#4A4360', style: 'me', bottom: 'pants', tie: PAL.tie, bag: '#FFC23D' },
  // the friend with the ponytail
  pony: { hair: '#7A4A33', hairLt: '#9C6547', style: 'pony', bottom: 'skirt', tie: PAL.tie, bag: '#FF8FB1' },
  // the friend with the glasses
  glasses: { hair: '#3B3350', hairLt: '#564B72', style: 'neat', bottom: 'pants', tie: PAL.tie, bag: '#6FE3C8', specs: true },
};

function limb(x0, y0, a, len1, len2, bend, color, w, side) {
  // side: -1 for a limb on the screen-left of the body, +1 for the right
  const dx1 = Math.sin(a) * side, dy1 = Math.cos(a);
  const x1 = x0 + dx1 * len1, y1 = y0 + dy1 * len1;
  const a2 = a + bend;
  const x2 = x1 + Math.sin(a2) * side * len2, y2 = y1 + Math.cos(a2) * len2;
  stroke([[x0, y0], [x1, y1], [x2, y2]], color, w, { olw: 9 });
  return [x2, y2, a2];
}

function eyesAt(ex, ey, kind, o, scaleE = 1) {
  const lookX = (o.lookX || 0) * 7, lookY = (o.lookY || 0) * 6;
  for (const side of [-1, 1]) {
    const x = ex + side * 36 * (side === Math.sign(o.turn || 0) ? 1 - Math.abs(o.turn || 0) * 0.25 : 1), y = ey;
    ctx.save(); ctx.translate(x, y); ctx.scale(scaleE, scaleE);
    const k = kind === 'wink' ? (side === 1 ? 'closed' : 'open') : kind;
    if (k === 'open' || k === 'sad' || k === 'determined' || k === 'look') {
      ell(lookX, lookY, 12, 17, { fill: PAL.ink, stroke: null });
      circle(lookX + 4, lookY - 6, 4.5, { fill: '#FFFFFF', stroke: null });
    } else if (k === 'wide') {
      ell(0, 0, 17, 21, { fill: '#FFFFFF', lw: 4 });
      circle(lookX * 0.8, lookY * 0.8, 6.5, { fill: PAL.ink, stroke: null });
    } else if (k === 'closed') {
      stroke([[-13, -2], [0, 6], [13, -2]], PAL.ink, 5, { ink: null, smooth: true });
    } else if (k === 'happy') {
      stroke([[-13, 5], [0, -7], [13, 5]], PAL.ink, 5.5, { ink: null, smooth: true });
    } else if (k === 'sleepy') {
      ctx.save(); ctx.beginPath(); ctx.rect(-20, 0, 40, 30); ctx.clip();
      ell(lookX, 2, 12, 15, { fill: PAL.ink, stroke: null });
      ctx.restore();
      stroke([[-15, 0], [15, 0]], PAL.ink, 5, { ink: null });
    } else if (k === 'star') {
      poly(starShape(0, 0, 19, 0.45), { fill: PAL.gold, lw: 3 });
    } else if (k === 'heart') {
      poly(heartPts(0, 2, 15), { fill: PAL.red, lw: 3 });
    } else if (k === 'x') {
      stroke([[-10, -10], [10, 10]], PAL.ink, 5, { ink: null }); stroke([[10, -10], [-10, 10]], PAL.ink, 5, { ink: null });
    } else if (k === 'spiral') {
      ctx.beginPath();
      for (let i = 0; i < 30; i++) { const a = i * 0.6, r = i * 0.55; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.stroke();
    } else if (k === 'dot') {
      circle(0, 0, 6, { fill: PAL.ink, stroke: null });
    }
    // brows
    const brow = o.brows || (k === 'sad' ? 'worried' : k === 'determined' ? 'angry' : null);
    if (brow) {
      const tilt = { angry: 0.35, worried: -0.35, up: 0 }[brow] ?? 0;
      const by = brow === 'up' ? -34 : -28;
      stroke([[-14, by - tilt * 14 * -side], [14, by + tilt * 14 * -side]], PAL.ink, 5, { ink: null });
    }
    ctx.restore();
  }
}

function mouthAt(mx, my, kind, o) {
  ctx.save(); ctx.translate(mx, my);
  switch (kind) {
    case 'smile': stroke([[-16, -3], [0, 7], [16, -3]], PAL.ink, 5, { ink: null, smooth: true }); break;
    case 'flat': stroke([[-12, 2], [12, 2]], PAL.ink, 5, { ink: null }); break;
    case 'sad': stroke([[-14, 6], [0, -3], [14, 6]], PAL.ink, 5, { ink: null, smooth: true }); break;
    case 'wavy': stroke([[-16, 2], [-8, -3], [0, 2], [8, -3], [16, 2]], PAL.ink, 4.5, { ink: null, smooth: true }); break;
    case 'o': ell(0, 2, 7, 9, { fill: '#7A2E3A', lw: 4 }); break;
    case 'open': ell(0, 4, 15, 17, { fill: '#7A2E3A', lw: 4.5 }); ell(0, 12, 9, 6, { fill: '#FF8C8C', stroke: null }); break;
    case 'yawn': ell(0, 8, 18, 25, { fill: '#7A2E3A', lw: 4.5 }); ell(0, 20, 11, 8, { fill: '#FF8C8C', stroke: null }); break;
    case 'grin': {
      ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(0, 36, 22, -4); ctx.closePath();
      paint({ fill: '#7A2E3A', lw: 4.5 });
      ctx.save(); ctx.clip(); rrect(-22, -8, 44, 11, 3, { fill: '#FFFFFF', stroke: null }); ell(0, 22, 10, 8, { fill: '#FF8C8C', stroke: null }); ctx.restore();
      break;
    }
    case 'cat': stroke([[-14, -1], [-7, 5], [0, -1], [7, 5], [14, -1]], PAL.ink, 4.5, { ink: null, smooth: true }); break;
    case 'toast': {
      // a slice of toast held in the teeth
      ctx.save(); ctx.rotate(-0.12);
      rrect(-44, -8, 88, 58, 14, { fill: '#F4C27A', lw: 5 });
      rrect(-34, 0, 68, 42, 8, { fill: '#FFE7B0', stroke: null });
      ctx.restore();
      break;
    }
    default:
  }
  ctx.restore();
}

function emote(kind, x, y, k = 1, t = 0) {
  if (!kind || k <= 0) return;
  ctx.save(); ctx.translate(x, y); const s = backOut(clamp(k)); ctx.scale(s, s);
  switch (kind) {
    case 'sweat':
      smooth([[0, -22], [12, 6], [0, 16], [-12, 6]], { fill: '#8FD3FF', lw: 4 }); break;
    case 'zzz':
      for (let i = 0; i < 3; i++) {
        const f = frac(t * 0.8 + i / 3);
        letter('Z', 10 + f * 50, -f * 90, 26 + i * 10 + f * 16, '#FFFFFF', { font: 'round', alpha: Math.sin(f * Math.PI), lw: 5 });
      }
      break;
    case 'heart': poly(heartPts(0, 0, 26), { fill: PAL.red, lw: 4 }); break;
    case '!': letter('!', 0, 0, 90, PAL.gold, { lw: 10 }); break;
    case '?': letter('?', 0, 0, 90, '#FFFFFF', { lw: 10 }); break;
    case '!?': letter('!?', 0, 0, 90, PAL.gold, { lw: 10 }); break;
    case 'music': letter('♪', 0, 0, 80, '#FFFFFF', { lw: 8 }); break;
    case 'sparkle': sparkle(0, 0, 30, PAL.gold); sparkle(34, 20, 16, '#FFFFFF'); break;
    case 'anger': {
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); stroke([[8, 6], [22, 6], [22, 20]], PAL.red, 6, { ink: null }); }
      break;
    }
    case 'bulb': circle(0, 0, 24, { fill: PAL.gold, lw: 4 }); rrect(-11, 20, 22, 16, 4, { fill: '#BBBBBB', lw: 4 }); break;
    default:
  }
  ctx.restore();
}

function hairBack(w, t, o) {
  if (w.style === 'pony') {
    // the ponytail, swinging behind the head
    const sw = Math.sin(t * 7) * 0.12 + (o.ponySwing || 0);
    ctx.save(); ctx.translate(58, -318); ctx.rotate(0.5 + sw);
    smooth([[0, -8], [70, -20], [120, 20], [110, 90], [70, 130], [40, 70], [10, 20]], { fill: w.hair, lw: 5 });
    ctx.restore();
    circle(62, -320, 13, { fill: PAL.pink, lw: 4 });
  }
}

function hairFront(w, t, o) {
  const turn = o.turn || 0;
  ctx.save(); ctx.translate(turn * 14, 0);
  if (w.style === 'me') {
    // a helmet of hair with a fringe of spikes, and the cowlick
    smooth([[-98, -262], [-104, -322], [-70, -372], [0, -390], [70, -372], [104, -322], [98, -262],
      [80, -300], [50, -292], [30, -318], [5, -290], [-25, -316], [-45, -290], [-80, -300]], { fill: w.hair, lw: 5 });
    const cow = Math.sin(t * 9) * 0.25 + (o.cowlick || 0);
    ctx.save(); ctx.translate(10, -386); ctx.rotate(cow);
    stroke([[0, 0], [8, -30], [30, -44]], w.hair, 9, { smooth: true, olw: 9 });
    ctx.restore();
    stroke([[-60, -352], [-30, -370]], w.hairLt, 7, { ink: null, alpha: 0.8 });
  } else if (w.style === 'pony') {
    smooth([[-100, -250], [-106, -330], [-60, -380], [10, -392], [80, -370], [106, -320], [100, -250],
      [84, -290], [40, -318], [-10, -300], [-50, -318], [-86, -290]], { fill: w.hair, lw: 5 });
    stroke([[-50, -360], [-10, -376]], w.hairLt, 7, { ink: null, alpha: 0.8 });
  } else {
    // neat, parted on one side
    smooth([[-98, -262], [-102, -330], [-60, -378], [20, -388], [84, -364], [104, -318], [98, -268],
      [80, -312], [30, -330], [-40, -312], [-86, -292]], { fill: w.hair, lw: 5 });
    stroke([[-20, -330], [-40, -372]], w.hairLt, 6, { ink: null, alpha: 0.8 });
  }
  ctx.restore();
}

/**
 * One of the three friends.
 * o: who ('me'|'pony'|'glasses'), t (for idle motion), dy, rot, sq, flip, turn (-1..1 face turn),
 *    aL/aR/eL/eR, lL/lR/kL/kR, walk (phase in cycles; run: true for a sprint), sit,
 *    eyes, brows, mouth, blush, lookX/lookY, emote/emoteK, bag, holdL/holdR (fn(x, y, a)),
 *    col (override blazer colour), shadow (default true), alpha
 */
function kid(x, y, s, o = {}) {
  const w = WHO[o.who || 'me'];
  const t = o.t ?? 0;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.shadow !== false) ell(0, 0, 105 * s * (1 - clamp((o.dy || 0) / 600) * 0.5), 18 * s, { fill: 'rgba(40,20,60,0.22)', stroke: null });
  ctx.translate(0, -(o.dy || 0) * s);
  ctx.scale(s * (o.flip ? -1 : 1), s);
  ctx.rotate(o.rot || 0);
  const sq = o.sq || 0;
  ctx.scale(1 + sq * 0.5, 1 - sq);

  // walking and running swing the limbs; explicit angles add on top
  let lL = o.lL ?? 0.12, lR = o.lR ?? 0.12, kL = o.kL ?? 0, kR = o.kR ?? 0;
  let aL = o.aL ?? 0.25, aR = o.aR ?? 0.25, eL = o.eL ?? 0.2, eR = o.eR ?? 0.2;
  let bob = 0;
  if (o.walk !== undefined) {
    const ph = o.walk * TAU, amp = o.run ? 0.95 : 0.45;
    lL = 0.1 + Math.sin(ph) * amp; lR = 0.1 - Math.sin(ph) * amp;
    kL = Math.max(0, -Math.cos(ph)) * (o.run ? 1.3 : 0.5); kR = Math.max(0, Math.cos(ph)) * (o.run ? 1.3 : 0.5);
    if (o.aL === undefined) aL = 0.3 - Math.sin(ph) * amp * 0.9;
    if (o.aR === undefined) aR = 0.3 + Math.sin(ph) * amp * 0.9;
    if (o.run) { if (o.eL === undefined) eL = 1.4; if (o.eR === undefined) eR = 1.4; }
    bob = Math.abs(Math.sin(ph)) * (o.run ? 22 : 9);
  }
  ctx.translate(0, -bob);
  if (o.sit) { lL = lR = 1.35; kL = kR = -1.35; }

  hairBack(w, t, o);
  if (o.bag) rrect(-78, -206, 156, 120, 30, { fill: w.bag, lw: 5 });

  // legs
  const legC = w.bottom === 'skirt' ? PAL.skin : '#5B6378';
  const hipY = -104;
  const footL = limb(-30, hipY, lL, 52, 50, kL, legC, 30, -1);
  const footR = limb(30, hipY, lR, 52, 50, kR, legC, 30, 1);
  if (w.bottom === 'skirt') {
    // knee socks
    for (const [fx, fy] of [footL, footR]) stroke([[fx, fy - 30], [fx, fy - 4]], '#FFFFFF', 30, { ink: null });
  }
  for (const [fx, fy, fa] of [footL, footR]) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(-fa * 0.3);
    ell(0, 6, 28, 15, { fill: '#3A3242', lw: 4 });
    ctx.restore();
  }

  // body: blazer, shirt, tie
  const blazer = o.col || PAL.navy;
  if (w.bottom === 'skirt') {
    poly([[-62, -120], [62, -120], [82, -66], [-82, -66]], { fill: '#3E4E7A', lw: 5 });
    for (let i = -2; i <= 2; i++) stroke([[i * 20, -118], [i * 27, -68]], '#2E3A66', 3, { ink: null });
  } else {
    rrect(-60, -126, 120, 30, 10, { fill: '#5B6378', lw: 5 });
  }
  smooth([[-58, -196], [58, -196], [70, -150], [66, -108], [0, -100], [-66, -108], [-70, -150]], { fill: blazer, lw: 5 });
  poly([[-22, -196], [22, -196], [0, -150]], { fill: PAL.shirt, lw: 4 });
  if (w.style === 'pony') {
    poly([[0, -186], [-22, -198], [-22, -170]], { fill: w.tie, lw: 3.5 });
    poly([[0, -186], [22, -198], [22, -170]], { fill: w.tie, lw: 3.5 });
    circle(0, -186, 7, { fill: w.tie, lw: 3.5 });
  } else {
    poly([[-7, -192], [7, -192], [9, -160], [0, -148], [-9, -160]], { fill: w.tie, lw: 3.5 });
  }
  stroke([[0, -150], [0, -104]], PAL.navyDk, 3, { ink: null });
  circle(10, -132, 4, { fill: PAL.gold, stroke: null });
  // a little name badge
  rrect(26, -170, 26, 9, 3, { fill: '#FFFFFF', lw: 2.5 });

  // arms: a raised arm is drawn over the head, a lowered one under it
  const blazerArm = o.col || PAL.navy;
  let hL = null, hR = null;
  const armL = () => { hL = limb(-56, -184, aL, 50, 50, eL, blazerArm, 26, -1); circle(hL[0], hL[1], 15, { fill: PAL.skin, lw: 4.5 }); };
  const armR = () => { hR = limb(56, -184, aR, 50, 50, eR, blazerArm, 26, 1); circle(hR[0], hR[1], 15, { fill: PAL.skin, lw: 4.5 }); };
  const up = a => a > 1.7;
  if (!up(aL)) armL();
  if (!up(aR)) armR();
  if (o.bag) {
    stroke([[-40, -196], [-46, -120]], '#2A2438', 7, { ink: null });
    stroke([[40, -196], [46, -120]], '#2A2438', 7, { ink: null });
  }

  // head
  ctx.save(); ctx.rotate(o.headRot || 0);
  ctx.translate(0, o.headDy || 0);
  ell(0, -290, 100, 96, { fill: PAL.skin, lw: 5 });
  ell(-98 + (o.turn || 0) * 10, -282, 12, 18, { fill: PAL.skin, lw: 4.5 });
  ell(98 + (o.turn || 0) * 10, -282, 12, 18, { fill: PAL.skin, lw: 4.5 });
  const fx = (o.turn || 0) * 30;
  if (o.blush !== false) {
    const bk = o.blush === true ? 0.75 : o.blush ?? 0.4;
    ell(fx - 58, -246, 18, 10, { fill: rgba(PAL.blush, bk), stroke: null });
    ell(fx + 58, -246, 18, 10, { fill: rgba(PAL.blush, bk), stroke: null });
  }
  eyesAt(fx, -272, o.eyes || 'open', o);
  if (w.specs) {
    for (const side of [-1, 1]) circle(fx + side * 36, -272, 26, { fill: 'rgba(255,255,255,0.18)', lw: 5 });
    stroke([[fx - 10, -274], [fx + 10, -274]], PAL.ink, 4, { ink: null });
  }
  mouthAt(fx, o.mouth === 'toast' ? -222 : -226, o.mouth || 'smile', o);
  hairFront(w, t, o);
  ctx.restore();
  if (up(aL)) armL();
  if (up(aR)) armR();

  // anything held, drawn over the hands
  if (o.holdL) { ctx.save(); o.holdL(hL[0], hL[1], hL[2]); ctx.restore(); }
  if (o.holdR) { ctx.save(); o.holdR(hR[0], hR[1], hR[2]); ctx.restore(); }
  if (o.emote) emote(o.emote, 118, -380, o.emoteK ?? 1, t);
  ctx.restore();
}

/**
 * A grown-up. o: kind ('teacher'|'guard'|'mom'|'dad'|'aunt'), plus the kid pose options, and
 * silhouette: '#colour' to draw them as a flat shape with no face (the bridge's looming adults).
 */
function adult(x, y, s, o = {}) {
  const kind = o.kind || 'teacher';
  const sil = o.silhouette;
  const C = c => sil || c;
  const look = {
    teacher: { top: '#7C8B5A', bottom: '#4E4A5E', hair: '#5A5566', bun: true, specs: true },
    guard: { top: '#3F63B8', bottom: '#2B3A66', hair: '#2F2A3A', cap: true, whistle: true },
    mom: { top: '#E07A8E', bottom: '#5A4E6E', hair: '#4A3328', long: true },
    dad: { top: '#6B8FB0', bottom: '#3E4A5E', hair: '#2F2A3A', tie: true },
    aunt: { top: '#B67ACF', bottom: '#4E4A5E', hair: '#3A2A2A', perm: true },
  }[kind];
  const t = o.t ?? 0;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (!sil && o.shadow !== false) ell(0, 0, 110 * s, 18 * s, { fill: 'rgba(40,20,60,0.22)', stroke: null });
  ctx.translate(0, -(o.dy || 0) * s);
  ctx.scale(s * (o.flip ? -1 : 1), s);
  ctx.rotate(o.rot || 0);
  const lw = sil ? 0 : 5;
  const ink = sil ? null : PAL.ink;
  let lL = o.lL ?? 0.08, lR = o.lR ?? 0.08, kL = 0, kR = 0, bob = 0;
  if (o.walk !== undefined) {
    const ph = o.walk * TAU; lL = Math.sin(ph) * 0.4; lR = -Math.sin(ph) * 0.4;
    kL = Math.max(0, -Math.cos(ph)) * 0.5; kR = Math.max(0, Math.cos(ph)) * 0.5; bob = Math.abs(Math.sin(ph)) * 8;
  }
  ctx.translate(0, -bob);
  const L = (x0, y0, a, bend, col, wdt, side) => {
    const x1 = x0 + Math.sin(a) * side * 80, y1 = y0 + Math.cos(a) * 80;
    const a2 = a + bend, x2 = x1 + Math.sin(a2) * side * 76, y2 = y1 + Math.cos(a2) * 76;
    stroke([[x0, y0], [x1, y1], [x2, y2]], col, wdt, { ink: ink ?? null, olw: 9 });
    return [x2, y2, a2];
  };
  const fL = L(-30, -170, lL, kL, C(look.bottom), 34, -1), fR = L(30, -170, lR, kR, C(look.bottom), 34, 1);
  for (const [fx, fy] of [fL, fR]) ell(fx, fy + 6, 32, 15, { fill: C('#3A3242'), lw, stroke: ink });
  smooth([[-70, -330], [70, -330], [84, -250], [78, -160], [-78, -160], [-84, -250]], { fill: C(look.top), lw, stroke: ink });
  if (look.tie && !sil) poly([[-8, -326], [8, -326], [10, -270], [0, -256], [-10, -270]], { fill: PAL.tie, lw: 3.5 });
  const hL = L(-66, -316, o.aL ?? 0.2, o.eL ?? 0.2, C(look.top), 30, -1);
  const hR = L(66, -316, o.aR ?? 0.2, o.eR ?? 0.2, C(look.top), 30, 1);
  circle(hL[0], hL[1], 17, { fill: C(PAL.skin), lw: sil ? 0 : 4.5, stroke: ink });
  circle(hR[0], hR[1], 17, { fill: C(PAL.skin), lw: sil ? 0 : 4.5, stroke: ink });
  // head
  ctx.save(); ctx.rotate(o.headRot || 0);
  if (look.long) smooth([[-78, -420], [-84, -330], [-60, -300], [60, -300], [84, -330], [78, -420]], { fill: C(look.hair), lw, stroke: ink });
  ell(0, -410, 74, 80, { fill: C(PAL.skin), lw, stroke: ink });
  if (look.bun) { circle(0, -498, 30, { fill: C(look.hair), lw, stroke: ink }); }
  if (look.perm) for (let i = 0; i < 9; i++) circle(-66 + i * 16.5, -470 + Math.sin(i * 1.3) * 10, 26, { fill: C(look.hair), lw, stroke: ink });
  else smooth([[-76, -414], [-70, -470], [-20, -494], [40, -490], [76, -454], [74, -404], [40, -450], [-30, -446]], { fill: C(look.hair), lw, stroke: ink });
  if (look.cap) {
    smooth([[-78, -440], [-60, -500], [60, -500], [78, -440]], { fill: C(look.top), lw, stroke: ink });
    rrect(-10, -450, 110, 20, 8, { fill: C(look.top), lw, stroke: ink });
  }
  if (!sil) {
    eyesAt(0, -408, o.eyes || 'dot', { ...o, turn: 0 }, 0.85);
    if (look.specs) { for (const side of [-1, 1]) rrect(side * 31 - 24, -426, 48, 34, 10, { fill: 'rgba(255,255,255,0.2)', lw: 5 }); }
    mouthAt(0, -370, o.mouth || 'flat', o);
    if (look.whistle) { stroke([[0, -372], [22, -330]], '#DDDDDD', 3, { ink: null }); rrect(10, -372, 34, 18, 7, { fill: '#D8DEE6', lw: 4 }); }
  }
  ctx.restore();
  if (o.holdL) { ctx.save(); o.holdL(hL[0], hL[1], hL[2]); ctx.restore(); }
  if (o.holdR) { ctx.save(); o.holdR(hR[0], hR[1], hR[2]); ctx.restore(); }
  if (o.emote) emote(o.emote, 110, -520, o.emoteK ?? 1, t);
  ctx.restore();
}

/**
 * A face swap that does not snap: mood(t, [[t0, eyes, mouth, emote?], ...]) returns
 * { eyes, mouth, emote, emoteK, sq } with a quick squash on each change.
 */
function mood(t, keys) {
  let i = 0;
  while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [t0, eyes, mouth, em] = keys[i];
  const since = t - t0;
  const take = i > 0 && since < 0.25 ? Math.sin((since / 0.25) * Math.PI) * 0.08 : 0;
  return {
    eyes: i > 0 && since < 0.07 ? 'closed' : eyes, mouth, emote: em, emoteK: clamp(since / 0.2), sq: take,
  };
}

/** Beat-synced bouncing: dance(style, t, seed) returns pose options to spread into kid(). */
function dance(style, t, seed = 0) {
  const b = beatOf(t) + seed * 0.13, h = Math.sin(Math.PI * frac(b));
  switch (style) {
    case 'bounce': return { dy: h * 34, sq: (1 - h) * 0.06, aL: 0.5 + h * 0.4, aR: 0.5 + h * 0.4 };
    case 'jump': return { dy: h * 90, sq: -(h) * 0.05, aL: 2.4 + h * 0.4, aR: 2.4 + h * 0.4, eL: 0.1, eR: 0.1, lL: 0.3, lR: 0.3, kL: h * 0.8, kR: h * 0.8 };
    case 'cheer': { const s = Math.floor(b) % 2; return { dy: h * 40, aL: s ? 2.9 : 1.2, aR: s ? 1.2 : 2.9, eL: 0.2, eR: 0.2 }; }
    case 'sway': return { rot: Math.sin(b * Math.PI) * 0.08, aL: 0.4, aR: 0.4, dy: h * 10 };
    case 'wave': return { dy: h * 18, aR: 2.6 + Math.sin(b * TAU) * 0.35, eR: -0.2 };
    case 'fist': { const up = frac(b) < 0.5; return { dy: h * 30, aR: up ? 2.9 : 2.2, eR: up ? 0 : 0.9, aL: 0.4 }; }
    default: return {};
  }
}
