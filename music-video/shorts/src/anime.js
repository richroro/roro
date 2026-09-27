// The anime kit for the Shorts (1080x1920, portrait). Loaded after core.js; the frame is
// window.FRAME = { w: 1080, h: 1920 }, so W and H are 1080 and 1920 here.
//
// She is a real person, so she is never drawn with a face: the heroine is seen from behind, in
// profile against the light, or with her fringe falling over her eyes, and in close-ups we see
// hands, a microphone, shoes, a laptop — which is how a lot of anime frames a big moment anyway.
//
//   heroine(x, y, s, o)   the girl. (x, y) ground point, ~900 tall at s = 1.
//       o: t, view ('back'|'side'|'front'), hair ('#hex', the era's colour), pose ('stand'|'sing'|
//          'spin'|'reach'|'walk'|'kneel'), wind (0..1 how hard the hair and clothes blow),
//          rim ('#hex' rim light colour), flip, age (0..1, 0 = a small child), outfit ('hoodie'|'dance')
//   brother(x, y, s, o)   Finneas, the same way (short hair, from behind or the side).
//   Effects: impact(t, t0, len) inverted flash frame · speedLinesV(t, cx, cy, k, color) ·
//       screentone(x, y, w, h, dot, color, alpha) · panel(x, y, w, h, fn, o) manga panel with a
//       frame · slam(t, t0, text, x, y, size, color, o) a big slanted SFX word · sparkles(t, n, rect) ·
//       animeSky(t, top, mid, low) · celCloud(x, y, s, color) · auraLines(t, cx, cy, k, color) ·
//       tagLine(t, t0, t1, text, o) a bold caption for the Short (top third) ·
//       subLine(t, t0, t1, text, o) a smaller line under it.

/* eslint-disable no-unused-vars */
const ANI = { ink: '#141019', white: '#FFFDF8', lime: '#B6FF3B', pink: '#FF3DA5', gold: '#FFC83D', sky: '#6FC8FF', blue: '#3D6BFF' };

// ---- the heroine --------------------------------------------------------------------------------

function heroine(x, y, s, o = {}) {
  const t = o.t ?? 0, wind = o.wind ?? 0.2, view = o.view || 'back';
  const hair = o.hair || '#2A1E2E', rim = o.rim || '#FFFFFF', age = o.age ?? 1;
  // She is a real person: whenever her face would show (side or front), it is in shadow, lit only
  // along its edge by the rim light, and the fringe covers the eyes. Hands keep their skin tone.
  const handSkin = o.skin || '#F4DCCD';
  const skin = mix(hair, '#141019', 0.72), skinSh = mix(skin, '#000000', 0.3);
  const hairSh = mix(hair, '#1A0F24', 0.45), hairLt = mix(hair, '#FFFFFF', 0.45);
  const cloth = o.outfit === 'dance' ? '#2B2140' : '#2A2540', clothSh = mix(cloth, '#000000', 0.35);
  const pose = o.pose || 'stand';
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
  const k = 0.72 + 0.28 * age;
  ctx.scale(k, k);
  const flow = i => Math.sin(t * 4.2 + i * 0.9) * 22 * wind;
  const lean = pose === 'walk' ? 0.04 : pose === 'reach' ? -0.03 : 0;
  ctx.rotate(lean);

  // hair behind the body: long, pointed anime locks that blow in the wind
  const locks = (cx, top, len, n, spread, dir) => {
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, lx = cx + u * spread;
      const tipX = lx + u * spread * 0.4 - wind * 90 * dir + flow(i) , tipY = top + len * (0.85 + 0.15 * Math.cos(u * 3));
      smooth([[lx - spread / n, top], [lx + spread / n, top], [(lx + tipX) / 2 + 14, (top + tipY) / 2], [tipX, tipY], [(lx + tipX) / 2 - 14, (top + tipY) / 2]],
        { fill: i % 2 ? hair : hairSh, stroke: null });
    }
  };
  if (view !== 'front') locks(view === 'side' ? -40 : 0, -760, 420 + 60 * wind, 7, view === 'side' ? 170 : 210, 1);

  // legs: slim, with chunky sneakers
  const legPts = pose === 'kneel' ? [[[-30, -300], [-80, -170], [-40, -40]], [[30, -300], [80, -150], [150, -120]]]
    : pose === 'walk' ? [[[-24, -320], [-24 + Math.sin(t * 6) * 50, -150], [-24 + Math.sin(t * 6) * 80, 0]], [[24, -320], [24 - Math.sin(t * 6) * 50, -150], [24 - Math.sin(t * 6) * 80, 0]]]
    : pose === 'spin' ? [[[-18, -320], [-14, -160], [-10, 0]], [[18, -320], [70, -210], [40, -120]]]
    : [[[-28, -320], [-34, -160], [-40, 0]], [[28, -320], [34, -160], [40, 0]]];
  for (const pts of legPts) {
    stroke(pts, '#1B1726', 50, { ink: null });
    const [fx, fy] = pts[pts.length - 1];
    rrect(fx - 44, fy - 20, 88, 34, 16, { fill: '#F4F2EE', stroke: null });
    rrect(fx - 44, fy + 6, 88, 10, 5, { fill: '#C9C4BC', stroke: null });
  }

  // the oversized top, cel-shaded: a lit side and a shadow side
  const bottom = pose === 'kneel' ? -210 : -300;
  const topPts = o.outfit === 'dance'
    ? [[-66, -600], [66, -600], [56, -380], [120 + flow(3) * 0.5, bottom + 10], [-120 + flow(4) * 0.5, bottom + 10], [-56, -380]]
    : [[-116, -610], [-56, -640], [56, -640], [116, -610], [138, -440], [124, bottom], [-124, bottom], [-138, -440]];
  smooth(topPts, { fill: cloth, stroke: null });
  ctx.save(); smoothPath(topPts); ctx.clip();
  ctx.fillStyle = clothSh; ctx.fillRect(-200, -700, 180, 600);            // shadow side
  if (view === 'back' && o.outfit !== 'dance') { ctx.fillStyle = clothSh; ctx.beginPath(); ctx.ellipse(0, -600, 90, 60, 0, 0, TAU); ctx.fill(); }
  ctx.restore();

  // arms
  const arm = (pts) => stroke(pts, cloth, 44, { ink: null });
  const hand = (hx, hy) => circle(hx, hy, 19, { fill: handSkin, stroke: null });
  const L = (pts) => pts.map(([ax, ay]) => [-ax, ay]);
  if (pose === 'sing') {
    arm([[96, -590], [140, -470], [70, -640]]); hand(70, -652);
    rrect(56, -736, 30, 92, 12, { fill: '#2B2B33', stroke: null }); circle(71, -748, 24, { fill: '#5A5A66', stroke: null });
    arm(L([[96, -590], [130, -450], [150, -330]])); hand(-150, -330);
  } else if (pose === 'reach') {
    arm([[96, -590], [180, -720], [240, -870]]); hand(240, -880);
    arm(L([[96, -590], [130, -450], [150, -330]])); hand(-150, -330);
  } else if (pose === 'spin') {
    arm([[96, -590], [230, -620], [350, -580]]); hand(350, -580);
    arm(L([[96, -590], [220, -650], [320, -720]])); hand(-320, -720);
  } else {
    arm([[96, -590], [132, -450], [146, -330]]); hand(146, -330);
    arm(L([[96, -590], [132, -450], [146, -330]])); hand(-146, -330);
  }

  // head
  const hy = -740;
  if (view === 'back') {
    ell(0, hy, 86, 94, { fill: hair, stroke: null });
    locks(0, hy - 40, 150, 5, 150, 1);
  } else if (view === 'side') {
    // a profile facing right: brow, nose, lips, chin; the fringe comes down over the eye
    smooth([[-70, hy - 70], [10, hy - 100], [66, hy - 60], [78, hy - 10], [98, hy + 18], [80, hy + 30], [84, hy + 50], [74, hy + 64],
      [70, hy + 80], [40, hy + 100], [-10, hy + 96], [-60, hy + 60], [-80, hy]], { fill: skin, stroke: null });
    smooth([[-20, hy + 60], [30, hy + 100], [-10, hy + 96]], { fill: skinSh, stroke: null, alpha: 0.5 });
    // the hair: crown, back and a long fringe sweeping over the eye to the nose
    smooth([[-96, hy + 40], [-100, hy - 60], [-40, hy - 116], [40, hy - 112], [86, hy - 70], [96, hy - 20], [88, hy + 16],
      [60, hy + 10 + flow(5) * 0.2], [40, hy - 10], [10, hy + 30], [-20, hy + 10], [-50, hy + 60]], { fill: hair, stroke: null });
    smooth([[40, hy - 60], [92, hy - 30], [86, hy + 14], [58, hy + 18]], { fill: hairSh, stroke: null });
  } else {
    // facing us with the fringe over both eyes: only the lower face shows
    ell(0, hy + 10, 80, 90, { fill: skin, stroke: null });
    smooth([[-96, hy + 20], [-98, hy - 70], [-40, hy - 116], [40, hy - 116], [98, hy - 70], [96, hy + 20], [70, hy + 26], [40, hy + 8],
      [0, hy + 30], [-40, hy + 8], [-70, hy + 26]], { fill: hair, stroke: null });
  }
  // the anime shine on the hair
  ctx.save(); ctx.globalAlpha = 0.75;
  stroke([[-54, hy - 66], [-20, hy - 84], [20, hy - 84], [54, hy - 66]], hairLt, 9, { ink: null, smooth: true });
  ctx.restore();
  // rim light down the lit edge
  if (o.rim) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.rimK ?? 0.5;
    stroke([[112, -600], [132, -450], [120, -310]], rim, 5, { ink: null, smooth: true });
    if (view === 'side') stroke([[66, hy - 60], [78, hy - 10], [98, hy + 18], [84, hy + 50], [70, hy + 80]], rim, 5, { ink: null, smooth: true });
    else stroke([[78, hy - 60], [92, hy - 10], [88, hy + 40]], rim, 5, { ink: null, smooth: true });
    ctx.restore();
  }
  ctx.restore();
}

function brother(x, y, s, o = {}) {
  const t = o.t ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
  const body = '#1B1A24', hair = o.hair || '#3A2A20';
  stroke([[-40, -320], [-50, 0]], body, 68, { ink: null }); stroke([[40, -320], [50, 0]], body, 68, { ink: null });
  smooth([[-140, -600], [140, -600], [150, -300], [-150, -300]], { fill: '#2A2A38', stroke: null });
  stroke([[130, -580], [180, -420], [150 + Math.sin(t * 4) * 6, -330]], '#2A2A38', 50, { ink: null });
  stroke([[-130, -580], [-180, -420], [-150, -330]], '#2A2A38', 50, { ink: null });
  ell(0, -700, 90, 98, { fill: hair, stroke: null });
  smooth([[-96, -720], [-60, -800], [0, -812], [70, -796], [100, -720], [90, -660], [-90, -660]], { fill: hair, stroke: null });
  ctx.restore();
}

// ---- effects ------------------------------------------------------------------------------------

/** An impact frame: the picture inverted and bleached for a moment at t0. */
function impact(t, t0, len = 0.12) {
  if (t < t0 || t > t0 + len) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.globalAlpha = 0.9;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.restore();
}

/** Anime focus lines converging on (cx, cy). */
function speedLinesV(t, cx, cy, k, color = '#FFFFFF', n = 90) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = color;
  const f = Math.floor(t * 20), R = Math.hypot(W, H);
  for (let i = 0; i < n; i++) {
    if (hash(i, f) > 0.75) continue;
    const a = (i / n) * TAU + hash(i, 3) * 0.05, r0 = 260 + hash(i, f + 1) * 380, w = (0.004 + hash(i, 4) * 0.01) * k;
    ctx.globalAlpha = 0.8 * k;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    ctx.fill();
  }
  ctx.restore();
}

/** Manga screentone dots over a rectangle. */
function screentone(x, y, w, h, dot = 10, color = '#000000', alpha = 0.25) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  for (let j = 0; j < h / dot; j++) for (let i = 0; i < w / dot; i++) {
    const r = dot * 0.28 * (0.6 + 0.4 * (j / (h / dot)));
    ctx.beginPath(); ctx.arc(x + i * dot + (j % 2) * dot / 2, y + j * dot, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** A manga panel: fn paints inside a clipped rectangle; a white gutter frame goes around it. */
function panel(x, y, w, h, fn, o = {}) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot || 0); ctx.translate(-w / 2, -h / 2);
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.save(); ctx.clip();
  ctx.translate(-x, -y); fn(); ctx.restore();
  ctx.lineWidth = o.border ?? 12; ctx.strokeStyle = o.frame || ANI.white; ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

/** A big slanted sound-effect word that slams in at t0. */
function slam(t, t0, text, x, y, size, color = ANI.white, o = {}) {
  const age = t - t0, life = o.life ?? 1.2;
  if (age < 0 || age > life) return;
  const k = clamp(age / 0.12), out = clamp((life - age) / 0.25);
  const s = lerp(2.2, 1, easeOut(k)) * (1 + 0.03 * Math.sin(age * 40) * (1 - k));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.12); ctx.scale(s, s); ctx.globalAlpha = out;
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22; ctx.strokeStyle = ANI.ink; ctx.strokeText(text, 8, 10);
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = o.edge || ANI.ink; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
}

function sparkles(t, n, x, y, w, h, color = '#FFFFFF') {
  for (let i = 0; i < n; i++) {
    const tw = Math.max(0, Math.sin(t * (2 + hash(i, 2) * 3) + i * 1.3));
    if (tw < 0.2) continue;
    sparkle(x + hash(i, 5) * w, y + hash(i, 6) * h, (6 + hash(i, 7) * 18) * tw, color, t * 0.5 + i);
  }
}

function animeSky(t, top, mid, low) {
  skyFill([[0, top], [0.55, mid], [1, low]]);
}

function celCloud(x, y, s, color = '#FFFFFF', shade = '#C9D8F5') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const puffs = [[-150, 20, 90], [-60, -40, 120], [60, -30, 110], [160, 20, 80], [0, 40, 110]];
  ctx.beginPath(); for (const [px, py, r] of puffs) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
  ctx.fillStyle = shade; ctx.fill();
  ctx.translate(-10, -16);
  ctx.beginPath(); for (const [px, py, r] of puffs) { ctx.moveTo(px + r * 0.92, py); ctx.arc(px, py, r * 0.92, 0, TAU); }
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

/** Power-up aura: flickering vertical flame lines around a point. */
function auraLines(t, cx, cy, k, color = ANI.lime) {
  if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU, f = frac(t * 1.6 + hash(i, 1));
    const r = 180 + hash(i, 2) * 160, x0 = cx + Math.cos(a) * r, y0 = cy + Math.sin(a) * r * 1.6;
    ctx.globalAlpha = k * 0.6 * (1 - f);
    stroke([[x0, y0], [x0 + Math.cos(a) * 30, y0 - 120 - f * 240]], color, 6 + hash(i, 3) * 8, { ink: null });
  }
  ctx.restore();
  glow(cx, cy, 520, color, 0.35 * k);
}

// ---- words on a Short ---------------------------------------------------------------------------

/** The big caption of a Short: bold, outlined, in the upper third, in with a punch. */
function tagLine(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.14), out = clamp((t1 - t) / 0.18);
  if (k <= 0 || out <= 0) return;
  const lines = text.split('\n'), size = o.size || 96, y0 = o.y ?? 330;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = out;
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const y = y0 + i * size * 1.18, s = lerp(1.25, 1, easeOut(k));
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s); ctx.rotate(o.rot ?? 0);
    ctx.lineWidth = size * 0.2; ctx.strokeStyle = ANI.ink; ctx.strokeText(ln, 0, 0);
    ctx.fillStyle = (o.colors && o.colors[i]) || o.color || ANI.white; ctx.fillText(ln, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function subLine(t, t0, t1, text, o = {}) {
  const k = clamp((t - t0) / 0.25), out = clamp((t1 - t) / 0.2);
  if (k <= 0 || out <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = k * out;
  const size = o.size || 46;
  ctx.font = `${size}px ${FONT.round}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  text.split('\n').forEach((ln, i) => {
    const y = (o.y ?? 590) + i * size * 1.3;
    ctx.lineWidth = 10; ctx.strokeStyle = ANI.ink; ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = o.color || '#E8E4F0'; ctx.fillText(ln, W / 2, y);
  });
  ctx.restore();
}
