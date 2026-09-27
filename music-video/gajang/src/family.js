// The cast of 오늘도 수고했어: 아빠, 엄마, the little one, 부장님, a coworker, and 아빠 at twenty.
// The teenage daughter is the high-school kit's kid(): kid(x, y, s, { who: 'pony' }).
//
//   person(x, y, s, o)   (x, y) is the ground point between the feet; ~500 tall at s = 1
//                        (the child is about 290). o.role: dad | mom | child | boss | coworker | young
//
// Pose and face options are the same as kid(): dy, rot, sq, flip, turn, aL/aR/eL/eR, lL/lR/kL/kR,
// walk (+ run), sit, headRot, eyes, brows, mouth, blush, lookX/lookY, emote/emoteK, holdL/holdR,
// alpha, shadow. Grown-ups also take bags (tired eye bags, 0..1), stubble, sweat, jacket.

/* eslint-disable no-unused-vars */
const ROLE = {
  dad: {
    h: 1, head: 1, skin: PAL.skin, hair: '#2B2733', grey: '#9A97A6', style: 'dad',
    shirt: '#F4F6FA', tie: '#3E6FB8', jacket: '#4A4F63', pants: '#4A4F63', shoe: '#2A2438', belly: 12,
  },
  young: {
    h: 0.98, head: 1, skin: PAL.skin, hair: '#2B2733', style: 'shaggy',
    shirt: '#F2545B', pants: '#3E5C8A', shoe: '#F4F4F4', belly: 0,
  },
  mom: {
    h: 0.94, head: 1, skin: PAL.skin, hair: '#5A3A2E', style: 'bob',
    shirt: '#FFFFFF', cardigan: '#F29BB0', pants: '#5B6A8E', shoe: '#8E5A6A', belly: 0,
  },
  child: {
    h: 0.58, head: 1.12, skin: PAL.skin, hair: '#2F2A3A', style: 'kidcut',
    shirt: '#FFC23D', pants: '#4E8EF7', shoe: '#F2545B', belly: 4, dino: true,
  },
  boss: {
    h: 1.02, head: 1.05, skin: '#F7CFB0', hair: '#3A3440', grey: '#8C8898', style: 'bald',
    shirt: '#F4F6FA', tie: '#D8383E', jacket: '#2E3A66', pants: '#2E3A66', shoe: '#2A2438', belly: 30, mustache: true,
  },
  coworker: {
    h: 0.98, head: 1, skin: PAL.skin, hair: '#5B4636', style: 'side',
    shirt: '#DDEBFA', tie: '#6FB36A', pants: '#5B6378', shoe: '#2A2438', belly: 4, specs: true, lanyard: true,
  },
};

function personHair(R, o, t, back) {
  const H = (pts, c) => smooth(pts, { fill: c, lw: 5 });
  const turn = o.turn || 0;
  ctx.save(); ctx.translate(turn * 12, 0);
  switch (R.style) {
    case 'dad':
      if (back) break;
      // short, neat, a little higher at the temples than it used to be, grey coming in
      H([[-92, -356], [-96, -406], [-62, -450], [0, -462], [64, -450], [96, -406], [92, -356],
        [82, -392], [50, -412], [10, -402], [-30, -414], [-70, -400], [-84, -384]], R.hair);
      // grey coming in above the ears
      stroke([[-93, -372], [-90, -398]], R.grey, 7, { ink: null });
      stroke([[93, -372], [90, -398]], R.grey, 7, { ink: null });
      stroke([[-44, -440], [-14, -448]], '#4A4458', 6, { ink: null, alpha: 0.8 });
      break;
    case 'shaggy':
      if (back) { H([[-100, -330], [-110, -410], [0, -470], [110, -410], [100, -320], [60, -300], [-60, -300]], R.hair); break; }
      H([[-98, -340], [-104, -410], [-50, -462], [30, -466], [96, -420], [104, -340], [86, -380], [60, -358], [40, -392],
        [10, -360], [-20, -394], [-50, -360], [-80, -382]], R.hair);
      break;
    case 'bob':
      if (back) { H([[-104, -300], [-110, -400], [-60, -462], [60, -462], [110, -400], [104, -300], [60, -288], [-60, -288]], R.hair); break; }
      H([[-100, -330], [-104, -410], [-50, -460], [40, -462], [100, -414], [104, -340], [90, -370], [40, -404], [-20, -396], [-60, -410], [-90, -370]], R.hair);
      circle(62, -440, 11, { fill: PAL.gold, lw: 3.5 });
      break;
    case 'kidcut':
      if (back) break;
      H([[-96, -330], [-100, -400], [-50, -452], [40, -454], [98, -404], [96, -330], [70, -380], [30, -368], [-10, -384], [-50, -366], [-80, -380]], R.hair);
      stroke([[0, -452], [10, -482]], R.hair, 7, { olw: 8 });
      break;
    case 'bald':
      if (back) break;
      // shiny on top, a fringe round the sides
      H([[-94, -376], [-90, -410], [-66, -422], [-74, -386]], R.grey);
      H([[94, -376], [90, -410], [66, -422], [74, -386]], R.grey);
      ell(-30, -440, 26, 10, { fill: rgba('#FFFFFF', 0.55), stroke: null }, -0.3);
      break;
    case 'side':
      if (back) break;
      H([[-94, -346], [-98, -410], [-50, -456], [30, -458], [92, -420], [96, -350], [80, -398], [20, -414], [-50, -400], [-84, -380]], R.hair);
      break;
    default:
  }
  ctx.restore();
}

function person(x, y, s, o = {}) {
  const R = ROLE[o.role || 'dad'];
  const t = o.t ?? 0;
  const S = s * R.h;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.shadow !== false) ell(0, 0, 110 * S, 18 * S, { fill: 'rgba(40,20,60,0.22)', stroke: null });
  ctx.translate(0, -(o.dy || 0) * S);
  ctx.scale(S * (o.flip ? -1 : 1), S);
  ctx.rotate(o.rot || 0);
  const sq = o.sq || 0;
  ctx.scale(1 + sq * 0.5, 1 - sq);

  let lL = o.lL ?? 0.1, lR = o.lR ?? 0.1, kL = o.kL ?? 0, kR = o.kR ?? 0;
  let aL = o.aL ?? 0.2, aR = o.aR ?? 0.2, eL = o.eL ?? 0.2, eR = o.eR ?? 0.2, bob = 0;
  if (o.walk !== undefined) {
    const ph = o.walk * TAU, amp = o.run ? 0.9 : 0.42;
    lL = 0.08 + Math.sin(ph) * amp; lR = 0.08 - Math.sin(ph) * amp;
    kL = Math.max(0, -Math.cos(ph)) * (o.run ? 1.2 : 0.45); kR = Math.max(0, Math.cos(ph)) * (o.run ? 1.2 : 0.45);
    if (o.aL === undefined) aL = 0.25 - Math.sin(ph) * amp * 0.8;
    if (o.aR === undefined) aR = 0.25 + Math.sin(ph) * amp * 0.8;
    if (o.run) { if (o.eL === undefined) eL = 1.3; if (o.eR === undefined) eR = 1.3; }
    bob = Math.abs(Math.sin(ph)) * (o.run ? 20 : 8);
  }
  if (o.sit) { lL = lR = 1.4; kL = kR = -1.4; }
  ctx.translate(0, -bob);

  // Proportions: the child has a big head on a short body; everyone else is ~3 heads tall.
  const child = o.role === 'child';
  const hip = child ? -120 : -160, shoulder = child ? -210 : -290, headY = child ? -300 : -370;
  const legLen = child ? [58, 56] : [80, 76], armLen = child ? [48, 44] : [66, 62];
  // Head space: the face helpers from cast.js draw a head centred at y = -290; hair shapes here
  // are drawn around a head centred at -370, hence the extra 80.
  const inHead = fn => {
    ctx.save(); ctx.translate(0, headY + 290 + (o.headDy || 0));
    ctx.translate(0, -290); ctx.rotate(o.headRot || 0); ctx.scale(R.head, R.head); ctx.translate(0, 290);
    fn(); ctx.restore();
  };
  const hairIn = back => { ctx.save(); ctx.translate(0, 80); personHair(R, o, t, back); ctx.restore(); };
  inHead(() => hairIn(true));

  // legs
  const legW = child ? 30 : 34;
  const fL = limb(-30, hip, lL, legLen[0], legLen[1], kL, R.pants, legW, -1);
  const fR = limb(30, hip, lR, legLen[0], legLen[1], kR, R.pants, legW, 1);
  for (const [fx, fy, fa] of [fL, fR]) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(-fa * 0.3); ell(0, 6, child ? 28 : 32, 15, { fill: R.shoe, lw: 4.5 }); ctx.restore(); }

  // body
  const bw = child ? 62 : 70, belly = R.belly;
  const top = R.jacket && o.jacket !== false ? R.jacket : R.cardigan || R.shirt;
  smooth([[-bw, shoulder + 8], [bw, shoulder + 8], [bw + 8 + belly * 0.3, (shoulder + hip) / 2], [bw + belly * 0.5, hip - 6],
    [0, hip + 6 + belly * 0.3], [-bw - belly * 0.5, hip - 6], [-bw - 8 - belly * 0.3, (shoulder + hip) / 2]], { fill: top, lw: 5 });
  if (R.jacket && o.jacket !== false) {
    poly([[-26, shoulder + 6], [26, shoulder + 6], [12, hip - 10], [-12, hip - 10]], { fill: R.shirt, lw: 4 });
  } else if (R.cardigan) {
    poly([[-22, shoulder + 6], [22, shoulder + 6], [10, hip], [-10, hip]], { fill: R.shirt, lw: 4 });
    for (let i = 0; i < 3; i++) circle(0, shoulder + 40 + i * 36, 5, { fill: '#FFFFFF', lw: 2.5 });
  }
  if (R.tie) {
    const loose = o.looseTie ? 0.25 : 0;
    ctx.save(); ctx.translate(0, shoulder + 12); ctx.rotate(loose);
    poly([[-9, 0], [9, 0], [11, 70], [0, 86], [-11, 70]], { fill: R.tie, lw: 3.5 });
    ctx.restore();
  }
  if (R.dino) { // a green dinosaur on the little one's T-shirt
    smooth([[-30, hip - 36], [-20, hip - 62], [10, hip - 64], [30, hip - 44], [22, hip - 28], [-24, hip - 28]], { fill: '#6FCB7A', lw: 3.5 });
    circle(18, hip - 52, 3.5, { fill: PAL.ink, stroke: null });
  }
  if (R.lanyard) { stroke([[-30, shoulder + 8], [0, shoulder + 90], [30, shoulder + 8]], '#4E8EF7', 5, { ink: null }); rrect(-18, shoulder + 88, 36, 46, 5, { fill: '#FFFFFF', lw: 3.5 }); }
  if (R.style === 'shaggy') letter('ROCK', 0, (shoulder + hip) / 2 + 6, 30, '#FFFFFF', { lw: 4, shadow: null });

  // arms: raised ones over the head
  const sleeve = R.jacket && o.jacket !== false ? R.jacket : R.cardigan || R.shirt;
  let hL = null, hR = null;
  const armW = child ? 24 : 28;
  const armL = () => { hL = limb(-bw + 6, shoulder + 16, aL, armLen[0], armLen[1], eL, sleeve, armW, -1); circle(hL[0], hL[1], child ? 14 : 16, { fill: R.skin, lw: 4.5 }); };
  const armR = () => { hR = limb(bw - 6, shoulder + 16, aR, armLen[0], armLen[1], eR, sleeve, armW, 1); circle(hR[0], hR[1], child ? 14 : 16, { fill: R.skin, lw: 4.5 }); };
  const up = a => a > 1.7;
  if (!up(aL)) armL();
  if (!up(aR)) armR();

  // head
  inHead(() => {
  ell(0, -290, 92, 90, { fill: R.skin, lw: 5 });
  ell(-90 + (o.turn || 0) * 10, -284, 11, 17, { fill: R.skin, lw: 4.5 });
  ell(90 + (o.turn || 0) * 10, -284, 11, 17, { fill: R.skin, lw: 4.5 });
  const fx = (o.turn || 0) * 28;
  if (o.stubble ?? (o.role === 'dad')) {
    // a shadow of stubble round the jaw, not spots on the cheeks
    ctx.save(); ellPath(0, -290, 92, 90); ctx.clip();
    ell(fx * 0.5, -212, 70, 30, { fill: rgba('#6A6A80', 0.16), stroke: null });
    ctx.restore();
  }
  if (o.blush !== false) {
    const bk = o.blush === true ? 0.75 : o.blush ?? (child ? 0.5 : 0.25);
    ell(fx - 54, -248, 16, 9, { fill: rgba(PAL.blush, bk), stroke: null });
    ell(fx + 54, -248, 16, 9, { fill: rgba(PAL.blush, bk), stroke: null });
  }
  eyesAt(fx, -276, o.eyes || 'open', o, child ? 1.05 : 0.92);
  const bags = o.bags ?? (o.role === 'dad' ? 0.35 : 0);
  if (bags > 0) for (const side of [-1, 1]) stroke([[fx + side * 36 - 12, -256], [fx + side * 36, -250], [fx + side * 36 + 12, -256]], rgba('#8A6A8A', bags), 3.5, { ink: null, smooth: true });
  if (R.specs || o.specs) {
    for (const side of [-1, 1]) rrect(fx + side * 36 - 26, -296, 52, 38, 12, { fill: 'rgba(255,255,255,0.18)', lw: 5 });
    stroke([[fx - 10, -278], [fx + 10, -278]], PAL.ink, 4, { ink: null });
  }
  if (R.mustache) smooth([[fx - 36, -240], [fx, -250], [fx + 36, -240], [fx + 20, -232], [fx, -238], [fx - 20, -232]], { fill: R.hair, lw: 3.5 });
  mouthAt(fx, R.mustache ? -218 : -230, o.mouth || 'smile', o);
  hairIn(false);
  });
  if (up(aL)) armL();
  if (up(aR)) armR();

  if (o.holdL) { ctx.save(); o.holdL(hL[0], hL[1], hL[2]); ctx.restore(); }
  if (o.holdR) { ctx.save(); o.holdR(hR[0], hR[1], hR[2]); ctx.restore(); }
  if (o.emote) emote(o.emote, 112, headY - 90, o.emoteK ?? 1, t);
  ctx.restore();
}

// ---- things they carry --------------------------------------------------------------------------

function briefcase(x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  stroke([[-18, 0], [-18, -12], [18, -12], [18, 0]], '#3A2A22', 6, { olw: 6 });
  rrect(-62, 0, 124, 84, 10, { fill: '#6B4432', lw: 5 });
  rrect(-8, 30, 16, 12, 3, { fill: PAL.gold, lw: 3 });
  ctx.restore();
}
function sojuGlass(x, y, s = 1, full = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  poly([[-20, -44], [20, -44], [15, 0], [-15, 0]], { fill: 'rgba(220,240,255,0.55)', lw: 4 });
  if (full > 0) poly([[-19 + (1 - full) * 2, -44 + (1 - full) * 40], [19 - (1 - full) * 2, -44 + (1 - full) * 40], [15, -2], [-15, -2]], { fill: 'rgba(255,255,255,0.8)', stroke: null });
  ctx.restore();
}
function sojuBottle(x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  smooth([[-26, 0], [-26, -110], [-14, -140], [-12, -180], [12, -180], [14, -140], [26, -110], [26, 0]], { fill: '#5FB36A', lw: 5 });
  rrect(-14, -196, 28, 20, 4, { fill: '#2E7A3E', lw: 4 });
  rrect(-22, -90, 44, 50, 4, { fill: '#FFFFFF', lw: 3 });
  ctx.restore();
}
function guitar(x, y, s = 1, rot = 0, color = '#E0484E') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-8, -210, 16, 170, 4, { fill: '#8A5530', lw: 4 });
  rrect(-14, -236, 28, 34, 6, { fill: '#5A3620', lw: 4 });
  smooth([[0, -60], [44, -50], [52, -10], [40, 20], [58, 60], [40, 100], [0, 110], [-40, 100], [-58, 60], [-40, 20], [-52, -10], [-44, -50]], { fill: color, lw: 5 });
  circle(0, 30, 18, { fill: '#2A2438', stroke: null });
  ctx.restore();
}
