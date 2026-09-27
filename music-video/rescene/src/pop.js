// The pop kit for the RESCENE Short (1080x1920, portrait). Loaded after core.js.
//
// A different look from the Billie Eilish Short: not tall, backlit anime figures but a squad of
// five chibi (2.5 heads tall) in pastel sticker style, thick white "cut-out" outlines, a game HUD
// with the chart rank ticking at the top, halftone dots and hearts.
//
// They are real people, so no face is ever drawn: from the front, thick bangs fall over the
// eyes and only a tiny mouth line shows the mood (and tears run from under the bangs); from the
// back we see hair. The five looks are generic (hair shape and outfit colour tell them apart) and
// do not claim to be any particular member.
//
//   chibi(x, y, s, o)    one member. (x, y) ground point; about 520 tall at s = 1.
//       o: t, look (0..4), view ('front'|'back'), pose ('stand'|'jump'|'run'|'wave'|'cry'|'hug'|
//          'sleep'|'sit'|'bow'|'cheer'), mouth ('smile'|'open'|'o'|'wobble'|'flat'), tears (0..1),
//          flip, bob (0..1 bounce on the beat), sticker (true: white cut-out outline)
//   squad(cx, y, s, o)   all five in a row (o.spread, o.poses[], o.view, o.order).
//   rankHUD(t, rank, o)  the game-style chart counter (o.y, o.label, o.flash).
//   popTag(t, t0, t1, text, o) / popSub(...)  captions in sticker bubbles (top third).
//   bubble(x, y, text, size, o)  a speech bubble · hearts(t, n, rect, o) · halftone(...) ·
//   pastelBg(t, a, b) · phone(x, y, s, fn, o) a phone with a screen painted by fn ·
//   vhs(t, k) rewind/tracking noise · burstStar(x, y, r, n, color)

/* eslint-disable no-unused-vars */
const POP = {
  ink: '#2B1B3D', white: '#FFFFFF', pink: '#FF5FA2', rose: '#FF8FC1', lav: '#B79CFF', mint: '#7FE3C4',
  peach: '#FFB38A', sky: '#8CCBFF', lemon: '#FFE66B', cream: '#FFF6FB', night: '#1C1636',
};

// Five looks: hair shape + colour and outfit colour. Generic, not portraits.
const LOOKS = [
  { hair: '#2E2032', style: 'long', outfit: POP.pink },
  { hair: '#5A3A2C', style: 'bob', outfit: POP.lav },
  { hair: '#1F1B2B', style: 'pony', outfit: POP.mint },
  { hair: '#6B4A38', style: 'wave', outfit: POP.peach },
  { hair: '#3A2740', style: 'twin', outfit: POP.sky },
];

function chibi(x, y, s, o = {}) {
  const t = o.t ?? 0, L = LOOKS[((o.look ?? 0) % 5 + 5) % 5], view = o.view || 'front', pose = o.pose || 'stand';
  const hair = L.hair, hairSh = mix(hair, '#000000', 0.35), hairLt = mix(hair, '#FFFFFF', 0.3);
  const cloth = L.outfit, clothSh = mix(cloth, POP.ink, 0.28);
  const skin = '#FFE1D2', skinSh = '#F4C3B0';
  const bob = (o.bob ?? 0) * 18;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
  if (pose === 'sleep') { sleeper(t, L, hair, hairSh, cloth, o); ctx.restore(); return; }
  const jump = pose === 'jump' ? 60 + 40 * Math.abs(Math.sin(t * 7)) : pose === 'cheer' ? 20 * Math.abs(Math.sin(t * 7)) : 0;
  ctx.translate(0, -jump - bob);
  const ink = o.sticker === false ? POP.ink : POP.ink;
  const lw = 7;

  // sticker cut-out: everything is painted twice, first fat and white
  const passes = o.sticker ? [0, 1] : [1];
  for (const pass of passes) {
    const W0 = pass === 0;
    const P = (fill, sh) => W0 ? { fill: POP.white, stroke: POP.white, lw: 34 } : { fill, stroke: ink, lw };
    const S = (c) => W0 ? POP.white : c;
    const SL = (w) => W0 ? w + 34 : w;

    // legs and shoes
    const run = pose === 'run' ? Math.sin(t * 12) : 0;
    const legs = pose === 'sit' ? [[[-24, -120], [-60, -40], [-50, 0]], [[24, -120], [60, -40], [50, 0]]]
      : pose === 'jump' ? [[[-22, -120], [-40, -70], [-30, -30]], [[22, -120], [40, -70], [30, -30]]]
      : [[[-22, -120], [-24 + run * 30, -55], [-24 + run * 45, 0]], [[22, -120], [24 - run * 30, -55], [24 - run * 45, 0]]];
    for (const pts of legs) {
      stroke(pts, S(skin), SL(26), { ink: W0 ? null : ink, olw: 10 });
      const [fx, fy] = pts[2];
      ell(fx + 6, fy - 6, 26, 16, P('#FFFFFF'));
    }
    // skirt / body (a rounded trapezoid)
    smooth([[-58, -250], [58, -250], [80, -110], [0, -96], [-80, -110]], P(cloth));
    if (!W0) {
      smooth([[10, -248], [58, -250], [80, -110], [30, -100]], { fill: clothSh, stroke: null, alpha: 0.5 });
      if (view === 'front') { stroke([[-18, -236], [0, -214], [18, -236]], '#FFFFFF', 7, { ink: null }); }
    }

    // arms
    const armSets = {
      stand: [[[-54, -236], [-78, -180], [-72, -136]], [[54, -236], [78, -180], [72, -136]]],
      jump: [[[-54, -236], [-110, -300], [-120, -370]], [[54, -236], [110, -300], [120, -370]]],
      cheer: [[[-54, -236], [-100, -300], [-104, -360 + Math.sin(t * 14) * 12]], [[54, -236], [78, -180], [72, -136]]],
      run: [[[-54, -236], [-90 - run * 30, -200], [-90 - run * 40, -150]], [[54, -236], [90 + run * 30, -200], [90 + run * 40, -150]]],
      wave: [[[-54, -236], [-78, -180], [-72, -136]], [[54, -236], [110, -290], [118 + Math.sin(t * 10) * 18, -360]]],
      cry: [[[-54, -236], [-70, -240], [-40, -300]], [[54, -236], [70, -240], [40, -300]]],
      hug: [[[-54, -236], [-120, -220], [-170, -210]], [[54, -236], [120, -220], [170, -210]]],
      sit: [[[-54, -236], [-70, -170], [-40, -130]], [[54, -236], [70, -170], [40, -130]]],
      bow: [[[-54, -236], [-40, -170], [-10, -140]], [[54, -236], [40, -170], [10, -140]]],
    };
    const arms = armSets[pose] || armSets.stand;
    const armsBehind = pose === 'cry' || pose === 'hug';
    const drawArms = () => {
      for (const pts of arms) {
        stroke(pts, S(cloth), SL(30), { ink: W0 ? null : ink, olw: 10 });
        const [hx, hy] = pts[2];
        circle(hx, hy, 17, P(skin));
      }
    };
    if (!armsBehind && view === 'back') drawArms();

    // head
    const hy = -380, hr = 132;
    const tilt = pose === 'bow' ? 0.35 : pose === 'cry' ? 0.12 : Math.sin(t * 2.3 + (o.look ?? 0)) * 0.04;
    ctx.save(); ctx.translate(0, hy + 90); ctx.rotate(tilt); ctx.translate(0, -90);
    // hair behind the head
    const style = L.style;
    if (style === 'long' || style === 'wave') smooth([[-hr - 10, -40], [hr + 10, -40], [hr + 26, 190], [0, 210], [-hr - 26, 190]], P(hairSh));
    if (style === 'twin') {
      for (const d of [-1, 1]) smooth([[d * (hr - 10), -30], [d * (hr + 50), 30 + Math.sin(t * 5 + d) * 8], [d * (hr + 40), 200], [d * (hr - 10), 120]], P(hairSh));
    }
    const ponytail = () => {
      const sw = Math.sin(t * 5) * 14, px = view === 'back' ? 0 : 96;
      smooth([[px - 24, -110], [px + 24, -110], [px + 60 + sw, 40], [px + 20 + sw, 120], [px - 20 + sw, 30]], P(view === 'back' ? hairSh : hair));
      circle(px, -108, 16, P(POP.pink));
    };
    if (style === 'pony' && view === 'front') ponytail();
    // face / head ball
    circle(0, 0, hr, P(view === 'back' ? hair : skin));
    if (!W0 && view === 'front') {
      // blush and the mouth: the only features (the bangs hide the eyes)
      ell(-70, 44, 22, 11, { fill: '#FF9FB8', stroke: null, alpha: 0.7 });
      ell(70, 44, 22, 11, { fill: '#FF9FB8', stroke: null, alpha: 0.7 });
      const m = o.mouth || 'smile';
      if (m === 'smile') stroke([[-16, 58], [0, 70], [16, 58]], POP.ink, 5, { ink: null, smooth: true });
      else if (m === 'open') smooth([[-22, 54], [22, 54], [12, 84], [-12, 84]], { fill: '#C2415E', stroke: POP.ink, lw: 5 });
      else if (m === 'o') ell(0, 66, 11, 14, { fill: '#C2415E', stroke: POP.ink, lw: 5 });
      else if (m === 'wobble') stroke([[-22, 66], [-11, 60], [0, 66], [11, 60], [22, 66]], POP.ink, 5, { ink: null });
      else stroke([[-14, 64], [14, 64]], POP.ink, 5, { ink: null });
    }
    // bangs / hair cap (front covers the eyes completely)
    if (view === 'front') {
      smooth([[-hr - 4, 20], [-hr + 6, -70], [-60, -128], [40, -134], [hr - 4, -70], [hr + 4, 20],
        [hr - 30, 26], [96, 4], [64, 34], [32, 6], [0, 36], [-32, 6], [-64, 34], [-96, 4], [-hr + 30, 26]], P(hair));
      if (!W0) {
        smooth([[-80, -100], [-20, -118], [-40, -92]], { fill: hairLt, stroke: null, alpha: 0.8 });
        // tears run from under the bangs
        const tr = o.tears ?? 0;
        if (tr > 0) for (const d of [-1, 1]) {
          const len = 30 + 70 * tr + Math.sin(t * 9 + d) * 8;
          stroke([[d * 58, 24], [d * 62, 24 + len * 0.5], [d * 58, 24 + len]], '#8FD8FF', 12, { ink: null, alpha: 0.9 });
          circle(d * 58, 30 + len + ((t * 160 + d * 40) % 80), 8, { fill: '#8FD8FF', stroke: null, alpha: 0.9 });
        }
      }
    } else {
      smooth([[-hr, 10], [-hr + 10, -80], [0, -hr - 6], [hr - 10, -80], [hr, 10], [hr - 20, 110], [0, 130], [-hr + 20, 110]], P(hair));
      if (!W0) smooth([[-70, -90], [0, -120], [-20, -70]], { fill: hairLt, stroke: null, alpha: 0.7 });
    }
    if (style === 'pony' && view === 'back') ponytail();
    if (style === 'twin') for (const d of [-1, 1]) circle(d * (hr - 12), -40, 15, P(POP.lemon));
    if (style === 'bob' && view === 'back') smooth([[-hr - 8, 0], [hr + 8, 0], [hr, 120], [-hr, 120]], P(hair));
    ctx.restore();

    if (!armsBehind && view === 'front') drawArms();
    if (armsBehind) drawArms();
  }
  ctx.restore();
}

// Lying asleep under a blanket, seen from above: a hair fan on a pillow and a blanket lump.
function sleeper(t, L, hair, hairSh, cloth, o) {
  const br = 1 + 0.03 * Math.sin(t * 2.2 + (o.look ?? 0));
  rrect(-150, -110, 300, 120, 40, { fill: '#FFFFFF', stroke: POP.ink, lw: 6 });            // pillow
  ell(0, -60, 100, 86, { fill: hair, stroke: POP.ink, lw: 6 });                             // back of head
  smooth([[-70, -120], [0, -150], [70, -120], [40, -90]], { fill: mix(hair, '#FFFFFF', 0.25), stroke: null, alpha: 0.7 });
  ctx.save(); ctx.scale(1, br);
  rrect(-190, -20, 380, 420, 90, { fill: cloth, stroke: POP.ink, lw: 6 });                  // blanket
  for (let i = 0; i < 3; i++) stroke([[-150, 80 + i * 110], [150, 80 + i * 110]], mix(cloth, '#FFFFFF', 0.4), 8, { ink: null });
  ctx.restore();
}

function squad(cx, y, s, o = {}) {
  const spread = o.spread ?? 190, order = o.order || [0, 1, 2, 3, 4];
  // back row a little higher and smaller for depth when o.depth
  order.forEach((look, i) => {
    const u = i - 2;
    const yy = y - (o.depth ? (i % 2 ? 60 : 0) : 0), ss = s * (o.depth && i % 2 ? 0.92 : 1);
    chibi(cx + u * spread * s, yy, ss, { ...o, look, pose: (o.poses && o.poses[i]) || o.pose, flip: u > 0 && o.mirror,
      t: (o.t ?? 0) + i * 0.37, bob: o.bob !== undefined ? o.bob * (i % 2 ? 0.7 : 1) : 0 });
  });
}

// ---- HUD: the chart rank, like a game score ------------------------------------------------------

function rankHUD(t, rank, o = {}) {
  const y = o.y ?? 160, x = W / 2;
  const fl = o.flash ?? 0;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = o.alpha ?? 1;
  const w = 520, h = 118;
  rrect(x - w / 2, y - h / 2, w, h, 59, { fill: mix(POP.night, POP.pink, fl * 0.6), stroke: POP.white, lw: 8, shadow: rgba(POP.pink, 0.8), shadowBlur: 30 + fl * 40 });
  ctx.font = `34px ${FONT.round}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = POP.rose; ctx.fillText(o.label || 'MELON TOP100', x - w / 2 + 40, y);
  ctx.font = `${76 + fl * 20}px ${FONT.bold}`; ctx.textAlign = 'right';
  ctx.fillStyle = rank === 1 ? POP.lemon : POP.white;
  ctx.fillText(`${rank}위`, x + w / 2 - 40, y + 4);
  ctx.restore();
}

// ---- captions in sticker bubbles -------------------------------------------------------------------

function popTag(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.22), out = clamp((t1 - t) / 0.18);
  if (k <= 0 || out <= 0) return;
  const lines = text.split('\n'), size = o.size || 92, y0 = o.y ?? 380;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = out;
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const kk = clamp((t - t0 - i * 0.08) / 0.22);
    if (kk <= 0) return;
    const y = y0 + i * size * 1.25, s = backOut(kk);
    const tw = ctx.measureText(ln).width;
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s); ctx.rotate((o.rot ?? -0.03) * (i % 2 ? -1 : 1));
    const bg = (o.bgs && o.bgs[i]) || o.bg || POP.white;
    rrect(-tw / 2 - 34, -size * 0.64, tw + 68, size * 1.28, size * 0.3, { fill: bg, stroke: POP.ink, lw: 8 });
    ctx.fillStyle = (o.colors && o.colors[i]) || o.color || POP.ink; ctx.fillText(ln, 0, 4);
    ctx.restore();
  });
  ctx.restore();
}

function popSub(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.25), out = clamp((t1 - t) / 0.2);
  if (k <= 0 || out <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = k * out;
  const size = o.size || 46;
  ctx.font = `${size}px ${FONT.round}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  text.split('\n').forEach((ln, i) => {
    const y = (o.y ?? 640) + i * size * 1.3 + (1 - easeOut(k)) * 20;
    ctx.lineWidth = 12; ctx.strokeStyle = POP.ink; ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = o.color || POP.white; ctx.fillText(ln, W / 2, y);
  });
  ctx.restore();
}

// ---- bits --------------------------------------------------------------------------------------

function bubble(x, y, text, size, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.scale) ctx.scale(o.scale, o.scale);
  ctx.font = `${size}px ${FONT[o.font || 'bold']}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width, w = tw + size * 1.1, h = size * 1.6;
  const fill = o.fill || POP.white;
  poly([[-w * 0.18, h / 2 - 4], [-w * 0.3 * (o.tail ?? 1), h / 2 + size * 0.6], [-w * 0.02, h / 2 - 4]], { fill, stroke: POP.ink, lw: 6 });
  rrect(-w / 2, -h / 2, w, h, h / 2, { fill, stroke: POP.ink, lw: 6 });
  poly([[-w * 0.18, h / 2 - 7], [-w * 0.3 * (o.tail ?? 1) + 6, h / 2 + size * 0.5], [-w * 0.04, h / 2 - 7]], { fill, stroke: null });
  ctx.fillStyle = o.color || POP.ink; ctx.fillText(text, 0, 3);
  ctx.restore();
}

function hearts(t, n, x, y, w, h, o = {}) {
  for (let i = 0; i < n; i++) {
    const sp = hrange(60, 180, i, 7), px = x + hash(i, 3) * w + Math.sin(t * 2 + i) * 20;
    const py = y + h - frac(hash(i, 5) + t * sp / h) * (h + 80);
    const r = hrange(14, 34, i, 9) * (o.scale ?? 1);
    const c = [POP.pink, POP.rose, POP.lav, POP.lemon][i % 4];
    poly(heartPts(px, py, r), { fill: o.color || c, stroke: o.ink === false ? null : POP.ink, lw: 4, alpha: o.alpha ?? 0.9 });
  }
}

function halftone(x, y, w, h, color = POP.pink, alpha = 0.18, dot = 22) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  for (let j = 0, yy = y; yy < y + h; j++, yy += dot) {
    for (let xx = x + (j % 2) * dot / 2; xx < x + w; xx += dot) {
      const r = dot * 0.32 * (0.4 + 0.6 * (yy - y) / h);
      ctx.beginPath(); ctx.arc(xx, yy, r, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

function pastelBg(t, a = POP.rose, b = POP.lav) {
  fillScreen(lgrad(0, 0, 0, H, [[0, a], [1, b]]));
  halftone(0, H * 0.55, W, H * 0.45, '#FFFFFF', 0.22);
}

/** A phone, screen painted by fn(w, h) in local coords (0,0 top-left of the screen). */
function phone(x, y, s, fn, o = {}) {
  const w = 380, h = 760;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  rrect(-w / 2 - 22, -h / 2 - 22, w + 44, h + 44, 60, { fill: o.body || '#2A2238', stroke: POP.ink, lw: 8, shadow: o.glow ? rgba(o.glow, 0.9) : undefined, shadowBlur: 60 });
  ctx.save(); rrectPath(-w / 2, -h / 2, w, h, 42); ctx.clip();
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = o.screen || '#FFF6FB'; ctx.fillRect(0, 0, w, h);
  fn && fn(w, h);
  ctx.restore();
  rrect(-50, -h / 2 + 12, 100, 22, 11, { fill: '#2A2238', stroke: null });
  ctx.restore();
}

/** VHS rewind: tracking bands, colour split and the ◀◀ mark. k 0..1 strength. */
function vhs(t, k, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  for (let i = 0; i < 7; i++) {
    const yy = frac(hash(i, 2) + t * hrange(0.6, 2.2, i, 4)) * H, hh = hrange(8, 60, i, 6);
    ctx.globalAlpha = 0.35 * k; ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FF5FA2';
    ctx.fillRect(0, yy, W, hh);
  }
  ctx.globalAlpha = 0.12 * k;
  for (let yy = 0; yy < H; yy += 6) { ctx.fillStyle = '#000'; ctx.fillRect(0, yy, W, 2); }
  ctx.globalAlpha = k;
  if (o.label !== false) {
    ctx.font = `64px ${FONT.bold}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(o.label || '◀◀ REWIND', 60, 250);
  }
  ctx.restore();
}

function burstStar(x, y, r, n = 12, color = POP.lemon, rot = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i * Math.PI / n, rr = i % 2 ? r * 0.62 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  poly(pts, { fill: color, stroke: POP.ink, lw: 8 });
}
