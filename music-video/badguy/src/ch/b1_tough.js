// b1_tough (0 – 28.44): 부장님 plays the tough guy. A dark stage where a spotlight clicks on the
// snaps and a pair of shiny shoes strobes in under a neon title; four poses, one per bar; the tough
// show (chopsticks, a pigeon, a 1 kg dumbbell) on a flashing neon grid; and, in the corner of the
// night-time living room, the toy-box lid creaking open on a deadpan little one with a lollipop.
//
// The small kit at the top (shades, lollipop, toy box, the neon room, a flying tie, ...) is shared
// with b2_drop.js through window.BG12, which only these two chapters use.
(() => {
  const B = SONG.beat, BAR = SONG.bar;
  const LIME = '#B6FF3B', PINK = '#FF3DA5', BLK = '#0B0911', PLUM = '#1E0F2E', PLUM2 = '#2C1545';
  const T_BOSS = bgT(4), T_SHOW = bgT(8), T_PIGEON = bgT(9, 2), T_DUMB = bgT(10, 3), T_BOX = bgT(12), T_END = bgT(16);

  // ---- kit --------------------------------------------------------------------------------------

  /** Beats since t0 (fractional). */
  const lbeat = (t, t0) => bgBeat(t) - bgBeat(t0);
  /** 1 on the snaps (beats 2 and 4), falling away. */
  const snapPulse = (t, k = 8) => (bgBeatN(t) % 2 === 1 ? Math.exp(-frac(bgBeat(t) + 1e-6) * k) : 0);
  const screen = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };

  /**
   * Run fn inside person()'s own transform: body space (head = false) or head space (head = true,
   * where the face helpers put the eyes at y = -276 and the mouth at y = -230). fn gets fx, the
   * face's sideways shift for o.turn.
   */
  function personSpace(x, y, s, o, head, fn) {
    const R = ROLE[o.role || 'dad'], S = s * R.h, child = o.role === 'child';
    ctx.save();
    ctx.translate(x, y); ctx.translate(0, -(o.dy || 0) * S);
    ctx.scale(S * (o.flip ? -1 : 1), S); ctx.rotate(o.rot || 0);
    const sq = o.sq || 0; ctx.scale(1 + sq * 0.5, 1 - sq);
    if (o.walk !== undefined) ctx.translate(0, -Math.abs(Math.sin(o.walk * TAU)) * (o.run ? 20 : 8));
    if (head) {
      const headY = child ? -300 : -370;
      ctx.translate(0, headY + 290 + (o.headDy || 0)); ctx.translate(0, -290);
      ctx.rotate(o.headRot || 0); ctx.scale(R.head, R.head); ctx.translate(0, 290);
    }
    fn((o.turn || 0) * 28);
    ctx.restore();
  }

  /** Sunglasses in head space. kind 'boss' (wide black) or 'kid' (tiny, pink frame). */
  function shades(fx, kind = 'boss', glint = 0, slip = 0) {
    ctx.save(); ctx.translate(0, slip);
    const kid = kind === 'kid';
    const w = kid ? 50 : 62, h = kid ? 34 : 40, y = kid ? -292 : -298, frame = kid ? PINK : '#15121C';
    stroke([[fx - 36 - w / 2, y + 12], [-90, -290]], frame, 6, { ink: PAL.ink, olw: 4 });
    stroke([[fx + 36 + w / 2, y + 12], [90, -290]], frame, 6, { ink: PAL.ink, olw: 4 });
    stroke([[fx - 12, y + 10], [fx, y + 5], [fx + 12, y + 10]], frame, 6, { ink: PAL.ink, olw: 4, smooth: true });
    for (const side of [-1, 1]) {
      const cx = fx + side * 36;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx + w / 2, y);
      ctx.quadraticCurveTo(cx + w / 2, y + h, cx, y + h); ctx.quadraticCurveTo(cx - w / 2, y + h, cx - w / 2, y);
      ctx.closePath();
      paint({ fill: '#0E0C14', stroke: kid ? PINK : PAL.ink, lw: kid ? 6 : 6 });
      // a reflection stripe, and a glint that sweeps across on a hit
      ctx.save(); ctx.clip();
      stroke([[cx - w * 0.35, y + h * 0.75], [cx - w * 0.05, y + 4]], rgba('#FFFFFF', 0.35), 5, { ink: null });
      if (glint > 0) {
        const gx = cx - w + glint * w * 2;
        poly([[gx - 8, y + h], [gx + 6, y + h], [gx + 22, y], [gx + 8, y]], { fill: rgba(kid ? LIME : '#FFFFFF', 0.85), stroke: null });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /** A swirl lollipop: candy centred at (x, y), stick out at angle a. */
  function lolly(x, y, r, a = 0.7, len = 2.6) {
    stroke([[x, y], [x + Math.cos(a) * r * len, y + Math.sin(a) * r * len]], '#FFFFFF', r * 0.26, { olw: 6 });
    circle(x, y, r, { fill: PINK, lw: 5 });
    ctx.save(); ellPath(x, y, r - 2, r - 2); ctx.clip();
    ctx.beginPath();
    for (let i = 0; i < 40; i++) { const q = i * 0.42, rr = r * i / 40; ctx.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr); }
    ctx.strokeStyle = LIME; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    ell(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16, { fill: rgba('#FFFFFF', 0.6), stroke: null }, -0.6);
  }
  /** The lollipop in the little one's mouth (head space). wig swings the stick. */
  function mouthLolly(fx, wig = 0) {
    lolly(fx + 22, -222, 30, 0.55 + wig, 2.2);
  }

  /** The little one: deadpan, lollipop, tiny shades (all optional). */
  function littleOne(x, y, s, t, o = {}) {
    const opt = { role: 'child', t, eyes: 'sleepy', mouth: 'flat', blush: 0.35, ...o };
    person(x, y, s, opt);
    personSpace(x, y, s, opt, true, fx => {
      if (o.lolly !== false) mouthLolly(fx, o.wig || 0);
      if (o.shades) {
        const k = o.shades === true ? 1 : o.shades;
        shades(fx, 'kid', o.glint || 0, (1 - k) * -160);
      }
    });
  }

  /** 부장님, optionally with his shades on (shades 0..1 slides them down into place). */
  function boss(x, y, s, t, o = {}) {
    const opt = { role: 'boss', t, ...o };
    person(x, y, s, opt);
    if (o.tieFly !== undefined) personSpace(x, y, s, opt, false, () => flyingTie(o.tieFly, t, o.tieLen || 1));
    if (o.shades) personSpace(x, y, s, opt, true, fx => {
      const k = o.shades === true ? 1 : o.shades;
      ctx.globalAlpha *= clamp(k * 3);
      shades(fx, 'boss', o.glint || 0, (1 - k) * -140 + (o.slip || 0));
    });
  }

  /**
   * Covers the boss's hanging tie and draws one blowing at angle `ang` (0 hangs down, PI/2 points
   * to screen-right), rippling. Body space.
   */
  function flyingTie(ang, t, len = 1) {
    const sh = -290, hip = -160;
    poly([[-26, sh + 6], [26, sh + 6], [12, hip - 10], [-12, hip - 10]], { fill: '#F4F6FA', lw: 4 });
    const L = 150 * len, n = 7, ax = Math.sin(ang), ay = Math.cos(ang), px = -ay, py = ax;
    const left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, d = k * L, wv = Math.sin(t * 22 - k * 5) * 16 * k * Math.min(1, Math.abs(ang) * 1.5);
      const cx = ax * d + px * wv, cy = sh + 24 + ay * d + py * wv, hw = 10 + k * 8 - (k > 0.9 ? (k - 0.9) * 90 : 0);
      left.push([cx - px * hw, cy - py * hw]); right.push([cx + px * hw, cy + py * hw]);
    }
    const tip = [ax * (L + 18), sh + 24 + ay * (L + 18)];
    poly([...left, tip, ...right.reverse()], { fill: '#D8383E', lw: 4 });
    poly([[-11, sh + 8], [11, sh + 8], [8, sh + 30], [-8, sh + 30]], { fill: '#B82A30', lw: 3.5 });
  }

  /** A neon word: a glowing tube outline. on 0..1 (0 = a dead grey tube). */
  function neonText(txt, x, y, size, color, on = 1, o = {}) {
    ctx.save();
    ctx.font = `${size}px ${FONT[o.font || 'bold']}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.translate(x, y); ctx.rotate(o.rot || 0);
    ctx.lineWidth = size * 0.1; ctx.strokeStyle = mix('#3A2E48', color, 0.15);
    ctx.strokeText(txt, 0, 0);
    if (on > 0.01) {
      ctx.globalAlpha *= clamp(on);
      ctx.shadowColor = color; ctx.shadowBlur = size * 0.45;
      ctx.lineWidth = size * 0.085; ctx.strokeStyle = color; ctx.strokeText(txt, 0, 0);
      ctx.shadowBlur = 0; ctx.lineWidth = size * 0.028; ctx.strokeStyle = mix(color, '#FFFFFF', 0.7); ctx.strokeText(txt, 0, 0);
    }
    ctx.restore();
  }

  /**
   * A toy box, front face centred at x with its bottom at y, w wide and h tall, lid opened by
   * open (0..1). inside() paints whatever is in it; it is clipped to above the box front and
   * below the lid's front edge.
   */
  function toyBox(x, y, w, h, open, inside, o = {}) {
    const top = y - h, d = h * 0.34, hingeY = top - d;          // the top face goes up-back by d
    const k = clamp(open);
    const lidY = lerp(top, hingeY - w * 0.5, Math.sin(k * Math.PI / 2));  // front edge of the lid
    const lx = x - w / 2, sk = 22;                               // a little skew for 3/4
    // inside of the box (dark)
    poly([[lx + sk, hingeY], [lx + w + sk, hingeY], [lx + w, top], [lx, top]], { fill: '#120A18', lw: 5 });
    // the lid, behind whatever comes out
    const th = 26;
    if (k > 0.02) {
      poly([[lx + sk - 4, hingeY], [lx + w + sk + 4, hingeY], [lx + w + 6 + sk * (1 - k), lidY], [lx - 6 + sk * (1 - k), lidY]], { fill: o.lidIn || '#C2306F', lw: 5 });
    }
    // what's inside
    if (inside) {
      ctx.save();
      ctx.beginPath(); ctx.rect(lx - 400, lidY + (k > 0.02 ? 0 : 0), w + 800, top - lidY + 4);
      if (k > 0.5) { ctx.rect(lx - 400, -4000, w + 800, 4000 + lidY); }
      ctx.clip(); inside(); ctx.restore();
    }
    // the front
    rrect(lx, top, w, h, 14, { fill: o.front || '#FF3DA5', lw: 6 });
    rrect(lx + 18, top + 18, w - 36, h - 36, 10, { fill: o.panel || '#E02A8C', stroke: rgba(PAL.ink, 0.5), lw: 3 });
    // stickers: stars and a dino
    for (let i = 0; i < 3; i++) {
      const sx = lx + w * (0.2 + i * 0.3), sy = top + h * (0.35 + (i % 2) * 0.3);
      poly(starShape(sx, sy, h * 0.12, 0.45, 5, -Math.PI / 2 + i * 0.3), { fill: i === 1 ? '#FFFFFF' : LIME, lw: 3.5 });
    }
    if (o.label !== false) letter('TOYS', x + w * 0.02, top + h * 0.62, h * 0.24, LIME, { lw: 5, rot: -0.04 });
    // the lid when (nearly) shut, over everything
    if (k <= 0.02) {
      poly([[lx + sk - 4, hingeY - th], [lx + w + sk + 4, hingeY - th], [lx + w + 6, top - th + 6], [lx - 6, top - th + 6]], { fill: o.lidTop || '#FF6BC0', lw: 5 });
      rrect(lx - 8, top - th, w + 16, th + 6, 8, { fill: o.lidFront || '#E02A8C', lw: 5 });
    } else {
      rrect(lx - 6 + sk * (1 - k), lidY - th * (1 - k * 0.8), w + 12, th * (1 - k * 0.8) + 4, 8, { fill: o.lidFront || '#E02A8C', lw: 5 });
    }
    return { top, lidY };
  }

  /**
   * The night-time living room, lit by neon strips. lit 0..1 dims the room, tint picks the strip
   * colours. Everything is drawn in world space (put a camera round it for pushes).
   */
  function room(t, o = {}) {
    const lit = o.lit ?? 1, floorY = o.floorY ?? 820;
    const wallC = mix('#120819', o.wall || PLUM2, 0.35 + lit * 0.65);
    rrect(-600, -600, W + 1200, floorY + 600, 0, { fill: wallC, stroke: null });
    // wallpaper stripes
    for (let i = -6; i < 30; i++) rrect(i * 110, -600, 44, floorY + 600, 0, { fill: rgba('#FFFFFF', 0.025 + lit * 0.02), stroke: null });
    // window with a night city
    const wx = o.winX ?? 300, wy = 170;
    rrect(wx, wy, 380, 330, 12, { fill: '#0E1230', lw: 7 });
    ctx.save(); rrectPath(wx, wy, 380, 330, 12); ctx.clip();
    for (let i = 0; i < 7; i++) {
      const bx = wx + i * 58 - 10, bh = 90 + hash(i, 5) * 150;
      rrect(bx, wy + 330 - bh, 52, bh, 0, { fill: '#1B1F45', stroke: null });
      for (let j = 0; j < 6; j++) if (hash(i, j + 9) > 0.55) rrect(bx + 10 + (j % 2) * 20, wy + 340 - bh + 16 + Math.floor(j / 2) * 30, 10, 12, 0, { fill: j % 3 ? '#FFE08A' : '#FF9BD0', stroke: null });
    }
    circle(wx + 300, wy + 70, 34, { fill: '#FFF6D0', stroke: null });
    ctx.restore();
    stroke([[wx + 190, wy], [wx + 190, wy + 330]], '#3A2A48', 8, { ink: PAL.ink, olw: 6 });
    stroke([[wx, wy + 165], [wx + 380, wy + 165]], '#3A2A48', 8, { ink: PAL.ink, olw: 6 });
    // a picture frame and a clock-ish shelf
    rrect(1060, 240, 170, 130, 8, { fill: '#2A1E3A', lw: 6 });
    poly(heartPts(1145, 305, 36), { fill: rgba(PINK, 0.5 + 0.4 * lit), stroke: null });
    // sofa, far left
    if (o.sofa !== false) {
      const sx = o.sofaX ?? 120;
      rrect(sx - 40, floorY - 250, 520, 150, 40, { fill: mix('#2A1A40', '#5A2E7A', lit), lw: 6 });
      rrect(sx - 70, floorY - 150, 580, 120, 30, { fill: mix('#23163A', '#4A2468', lit), lw: 6 });
      rrect(sx - 90, floorY - 190, 70, 170, 30, { fill: mix('#2A1A40', '#5A2E7A', lit), lw: 6 });
      rrect(sx + 470, floorY - 190, 70, 170, 30, { fill: mix('#2A1A40', '#5A2E7A', lit), lw: 6 });
      rrect(sx + 60, floorY - 225, 110, 80, 26, { fill: mix('#3A2A10', LIME, 0.25 + lit * 0.5), lw: 5 }, 0);
    }
    // floor
    rrect(-600, floorY, W + 1200, 900, 0, { fill: mix('#0C0612', '#221035', lit), stroke: null });
    stroke([[-600, floorY], [W + 600, floorY]], PAL.ink, 8, { ink: null });
    for (let i = -4; i < 24; i++) stroke([[i * 140, floorY + 4], [i * 140 - 300, floorY + 600]], rgba('#FFFFFF', 0.035), 3, { ink: null });
    // neon strips along the ceiling line
    const c1 = o.c1 || LIME, c2 = o.c2 || PINK;
    const on1 = o.on1 ?? lit, on2 = o.on2 ?? lit;
    stroke([[-600, 70], [W + 600, 70]], mix('#2A2438', c1, on1), 12, { ink: PAL.ink, olw: 6 });
    stroke([[-600, 96], [W + 600, 96]], mix('#2A2438', c2, on2), 8, { ink: PAL.ink, olw: 6 });
    if (on1 > 0.05) glow(W / 2, 70, 1200, c1, 0.18 * on1);
    // a floor glow, neon on the floorboards
    if (lit > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lgrad(0, floorY, 0, floorY + 260, [[0, rgba(c2, 0.2 * lit)], [1, rgba(c2, 0)]]);
      ctx.fillRect(-600, floorY, W + 1200, 260);
      ctx.restore();
    }
  }

  /** A loudspeaker cabinet; thump 0..1 pushes the cones. */
  function speaker(x, y, s, thump, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-130, -420, 260, 420, 18, { fill: '#17121F', lw: 7 });
    rrect(-112, -402, 224, 384, 12, { fill: '#221A2E', stroke: null });
    for (const [cy, r] of [[-300, 58], [-130, 92]]) {
      const k = 1 + thump * (r > 60 ? 0.14 : 0.1);
      circle(0, cy, r + 12, { fill: '#0A0810', lw: 5 });
      circle(0, cy, r * k, { fill: '#2E2640', lw: 5 });
      circle(0, cy, r * 0.6 * k, { fill: '#1A1424', lw: 4 });
      circle(0, cy, r * 0.25 * k, { fill: LIME, lw: 4 });
      if (thump > 0.05) for (let i = 1; i <= 2; i++) circle(0, cy, r * (1 + (1 - thump) * 0.8 * i), { fill: null, stroke: rgba(i === 1 ? LIME : PINK, thump * 0.8), lw: 8 });
    }
    rrect(-60, -30, 120, 10, 5, { fill: rgba(LIME, 0.3 + thump * 0.7), stroke: null });
    ctx.restore();
  }

  /** A disco mirror ball hanging at (x, y). */
  function mirrorBall(x, y, r, t) {
    stroke([[x, -40], [x, y - r]], '#8C8898', 5, { ink: PAL.ink, olw: 4 });
    circle(x, y, r, { fill: '#B8B4C8', lw: 6 });
    ctx.save(); ellPath(x, y, r - 3, r - 3); ctx.clip();
    const rows = 8, rot = t * 2.2;
    for (let j = 0; j < rows; j++) {
      const lat = -Math.PI / 2 + (j + 0.5) * Math.PI / rows, cy = y + Math.sin(lat) * r, rr = Math.cos(lat) * r;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const lon = (i / n) * TAU + rot + j * 0.3, c = Math.cos(lon);
        if (c < 0) continue;
        const cx = x + Math.sin(lon) * rr;
        const lit = hash(i + Math.floor(t * 8), j) > 0.8;
        rrect(cx - 7 * c, cy - 7, 14 * c, 12, 2, { fill: lit ? '#FFFFFF' : mix('#6A6680', '#D8D4E8', c * (0.5 + 0.5 * Math.sin(lat + 0.8))), stroke: null });
      }
    }
    ctx.restore();
    glow(x - r * 0.3, y - r * 0.3, r * 1.4, '#FFFFFF', 0.25);
  }
  /** Light dots from the mirror ball sweeping the room. */
  function ballDots(t, x, y, k = 1, seed = 2) {
    if (k <= 0) return;
    for (let i = 0; i < 46; i++) {
      const a = hash(i, seed) * TAU + t * (0.5 + hash(i, seed + 1) * 0.3), d = 250 + hash(i, seed + 2) * 1300;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7 + 200;
      const c = [LIME, PINK, '#FFFFFF'][i % 3];
      ell(px, py, 14 + hash(i, 9) * 10, 9 + hash(i, 8) * 6, { fill: rgba(c, 0.55 * k), stroke: null }, a);
    }
  }

  /** A perspective neon grid (floor and back wall) that flashes with `lit`. */
  function neonGrid(t, lit, hor = 600) {
    fillScreen(BLK);
    skyFill([[0, '#12061E'], [hor / H, '#2A0B34'], [hor / H + 0.001, '#07050B'], [1, '#110616']]);
    ctx.save(); ctx.lineCap = 'round';
    // wall grid, pink
    ctx.strokeStyle = rgba(PINK, 0.08 + 0.5 * lit); ctx.lineWidth = 3;
    for (let x = 0; x <= W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, hor); ctx.stroke(); }
    for (let y = hor; y > 0; y -= 120) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // floor grid, lime, scrolling toward us on the beat
    ctx.strokeStyle = rgba(mix(LIME, '#FFFFFF', lit * 0.4), 0.15 + 0.85 * lit); ctx.lineWidth = 3 + lit * 3;
    ctx.shadowColor = LIME; ctx.shadowBlur = 18 * lit;
    for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, hor); ctx.lineTo(W / 2 + i * 420, H + 40); ctx.stroke(); }
    const sc = frac(bgBeat(t) * 0.5);
    for (let j = 0; j < 9; j++) {
      const z = (j + sc) / 9, y = hor + (H - hor) * z * z;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
    stroke([[0, hor], [W, hor]], PINK, 6, { ink: null, alpha: 0.5 + 0.5 * lit });
    glow(W / 2, hor, 900, PINK, 0.15 + 0.25 * lit);
  }

  window.BG12 = {
    LIME, PINK, BLK, PLUM, PLUM2, lbeat, snapPulse, screen, personSpace, shades, lolly, mouthLolly,
    littleOne, boss, flyingTie, neonText, toyBox, room, speaker, mirrorBall, ballDots, neonGrid,
  };

  // ---- 0.00 · a dark stage, a clicking spotlight, shiny shoes, the neon title ----------------------

  /** One shiny black shoe, toe to the right, sole on y. tilt lifts the toe. */
  function shoe(x, y, s, tilt, glint) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt); ctx.scale(s, s);
    // the trouser leg, up into the dark
    rrect(-58, -640, 96, 590, 20, { fill: '#2E3A66', lw: 6 });
    stroke([[-10, -620], [-10, -70]], rgba('#FFFFFF', 0.1), 4, { ink: null });
    smooth([[-86, 0], [-90, -46], [-64, -80], [30, -74], [120, -48], [146, -14], [134, 4]], { fill: '#15121C', lw: 7 });
    rrect(-90, -8, 236, 18, 8, { fill: '#2A2438', lw: 5 });
    stroke([[-40, -64], [20, -66]], '#3A3448', 5, { ink: null });
    // the shine: a rim of neon and a hot highlight
    stroke([[-80, -50], [-58, -74], [30, -68], [112, -44], [136, -14]], rgba(LIME, 0.55), 5, { ink: null, smooth: true });
    ell(76, -40, 42, 13, { fill: rgba('#FFFFFF', 0.8), stroke: null }, -0.2);
    ell(-40, -40, 20, 8, { fill: rgba(PINK, 0.6), stroke: null }, 0.1);
    if (glint > 0) { sparkle(96, -46, 60 * glint, '#FFFFFF', glint * 0.8); sparkle(96, -46, 26 * glint, LIME); }
    ctx.restore();
  }

  function darkStage(t, lt) {
    fillScreen('#07050C');
    const b = bgBeat(t), n = bgBeatN(t), f = frac(b + 1e-6);
    const floorY = 900;
    // walking: 12 beats of steps, then tapping in place
    const footX = (side, bb) => {
      const base = side ? 10 : -130, stride = 170;
      const nn = Math.floor(bb), ff = frac(bb);
      let x = base + stride * Math.floor((Math.min(nn, 12) + (side ? 0 : 1)) / 2), lift = 0, tilt = 0;
      if (nn < 12 && nn % 2 === side) {
        const k = easeInOut(clamp(ff / 0.8));
        x += stride * k; lift = Math.sin(k * Math.PI) * 70; tilt = Math.sin(k * Math.PI) * 0.25;
      }
      return [x, lift, tilt];
    };
    const fL = footX(0, b), fR = footX(1, b);
    // the spotlight snaps on for half a beat on beats 2 and 4
    const spot = n % 2 === 1 ? (f < 0.55 ? 1 : f < 0.62 ? 0.3 : 0) : 0;
    const spotX = (footX(0, n)[0] + footX(1, n)[0]) / 2 + 50;
    // the floor
    rrect(-20, floorY, W + 40, 200, 0, { fill: '#130B1C', stroke: null });
    // shoes
    const tap = n >= 12 && n % 2 === 1 ? Math.exp(-f * 6) : 0;
    shoe(fL[0], floorY - fL[1], 0.95, fL[2], spot * (n % 4 === 3 ? 1 : 0.6));
    shoe(fR[0], floorY - fR[1], 0.95, fR[2] + tap * 0.3, spot * (n % 4 === 1 ? 1 : 0.6));
    // darkness everywhere except the pool of light
    screen(() => {
      if (spot > 0) {
        ctx.fillStyle = rgrad(spotX, floorY - 120, 180, 620, [[0, 'rgba(7,5,12,0)'], [0.5, 'rgba(7,5,12,0.35)'], [1, 'rgba(7,5,12,0.95)']]);
      } else ctx.fillStyle = 'rgba(7,5,12,0.9)';
      ctx.fillRect(0, 0, W, H);
    });
    if (spot > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lgrad(0, 0, 0, floorY, [[0, 'rgba(255,255,240,0.02)'], [1, 'rgba(255,255,240,0.16)']]);
      ctx.beginPath(); ctx.moveTo(spotX - 40, -20); ctx.lineTo(spotX + 40, -20); ctx.lineTo(spotX + 300, floorY); ctx.lineTo(spotX - 300, floorY); ctx.closePath();
      ctx.globalAlpha = spot; ctx.fill();
      ctx.restore();
      ell(spotX, floorY + 8, 320, 44, { fill: rgba('#FFFDF0', 0.14 * spot), stroke: null });
      rrect(spotX - 50, -30, 100, 50, 10, { fill: '#3A3448', lw: 5 });
    }
    // the two clicks of the lamp, only the first times
    if (n < 4 && n % 2 === 1) sfx('딸깍', spotX + 130, 90, 50, '#FFFFFF', f * B, { font: 'round', life: 0.4 });
    // the title, one glyph per beat from beat 4, flickering on
    const glyphs = [...'누가 진짜 나쁜 녀석?'];
    const size = 150;
    ctx.save(); ctx.font = `${size}px ${FONT.bold}`;
    const ws = glyphs.map(g => ctx.measureText(g).width);
    ctx.restore();
    const total = ws.reduce((p, q) => p + q, 0);
    let x = W / 2 - total / 2, gi = 0;
    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i];
      if (g !== ' ') {
        const tOn = bgT(0, 4 + gi), age = t - tOn;
        let on = age < 0 ? 0 : age < 0.05 ? 1 : age < 0.1 ? 0.15 : age < 0.14 ? 1 : age < 0.18 ? 0.3 : 1;
        // a stray flicker now and then once it's lit
        if (age > 0.4 && hash(n, gi) > 0.9 && f < 0.12) on = 0.25;
        const col = g === '?' ? LIME : gi >= 4 ? PINK : '#FFFFFF';
        const beatGlow = n >= 12 ? 0.75 + 0.25 * bgPulse(t, 5) : 1;
        neonText(g, x + ws[i] / 2, 250, size, col === '#FFFFFF' ? LIME : col, on * beatGlow, { rot: gi === 8 ? 0.1 : 0 });
        gi++;
      }
      x += ws[i];
    }
    // on the last beat, the lights come up
    flash(seg(t, T_BOSS - 0.12, T_BOSS) * 0.9, '#FFFFFF');
  }

  // ---- 7.11 · 부장님: one pose a bar ----------------------------------------------------------------

  const POSES = [
    // flex both arms
    { aL: 1.55, eL: 1.7, aR: 1.55, eR: 1.7, lL: 0.28, lR: 0.28, eyes: 'determined', mouth: 'grin', rot: 0 },
    // shades on, hand at the temple
    { aL: 0.8, eL: -1.5, aR: 2.55, eR: 2.1, lL: 0.12, lR: 0.2, eyes: 'open', mouth: 'smile', rot: -0.04, headRot: -0.08 },
    // hands on hips, chin up, tie in the wind
    { aL: 0.8, eL: -1.5, aR: 0.8, eR: -1.5, lL: 0.2, lR: 0.2, eyes: 'open', mouth: 'smile', rot: 0, headRot: 0.06 },
    // disco point at the mirror ball
    { aL: 0.55, eL: -1.4, aR: 2.6, eR: 0.05, lL: 0.05, lR: 0.35, eyes: 'open', mouth: 'grin', rot: -0.07 },
  ];
  const lerpPose = (a, b, k) => {
    const o = { ...b };
    for (const key of ['aL', 'eL', 'aR', 'eR', 'lL', 'lR', 'rot', 'headRot']) o[key] = lerp(a[key] || 0, b[key] || 0, k);
    return o;
  };

  function bossPoses(t, lt) {
    const bar = Math.min(3, Math.floor(lt / BAR + 1e-6)), inBar = lt - bar * BAR;
    const lb = lbeat(t, T_BOSS), f = frac(lb + 1e-6);
    // stage
    skyFill([[0, '#12061E'], [0.75, PLUM2], [0.751, '#150A20'], [1, '#0B0611']]);
    const floorY = 810;
    for (let i = 0; i < 9; i++) {
      const x = 160 + i * 200, on = (Math.floor(lb) + i) % 2 === 0 ? 1 : 0.35;
      stroke([[x, 60], [x, floorY - 40]], i % 2 ? PINK : LIME, 10, { ink: null, alpha: 0.18 + 0.2 * on });
    }
    neonText('BOSS', 330, 180, 120, PINK, 0.6 + 0.4 * bgPulse(t, 4), { rot: -0.08 });
    // a spotlight disc behind him, pulsing on the beat
    glow(960, 520, 620 + bgPulse(t) * 60, bar === 3 ? '#FFFFFF' : LIME, 0.28);
    ell(960, floorY + 60, 440, 60, { fill: rgba(LIME, 0.18), stroke: null });

    // mirror ball comes down in the last bar
    if (bar === 3) {
      const dropK = easeOut(clamp(inBar / 0.35));
      ballDots(t, 1350, 200, dropK);
      mirrorBall(1350, lerp(-120, 200, dropK), 90, t);
    }

    // pose: from the previous one to this one with an overshoot on the downbeat
    const prev = POSES[Math.max(0, bar - 1)], cur = POSES[bar];
    const k = bar === 0 && lt < 0.2 ? backOut(clamp(lt / 0.2)) : backOut(clamp(inBar / 0.16));
    const from = bar === 0 ? { aL: 0.2, eL: 0.2, aR: 0.2, eR: 0.2, lL: 0.1, lR: 0.1 } : prev;
    const p = lerpPose(from, cur, k);
    const antic = inBar > BAR - 0.12 && bar < 3 ? 0.06 : 0;
    const bob = bgHop(t) * 10;
    const snap = snapPulse(t);
    const s = 1.55;
    const shadesK = bar === 0 ? 0 : bar === 1 ? clamp((inBar - 0.02) / 0.14) : 1;
    boss(960, floorY + 60, s, t, {
      ...p, dy: bob, sq: antic + snap * 0.03, shades: shadesK, glint: bar >= 1 ? clamp((f - 0.1) / 0.5) * (Math.floor(lb) % 2 ? 1 : 0) : 0,
      tieFly: bar === 2 ? 1.25 + Math.sin(t * 9) * 0.15 : undefined, tieLen: 1.1,
      eyes: p.eyes, mouth: p.mouth, blush: 0.3,
    });
    // flex bulges
    if (bar === 0) {
      personSpace(960, floorY + 60, s, { role: 'boss', ...p, dy: bob, sq: antic + snap * 0.03 }, false, () => {
        const pump = 1 + 0.25 * bgPulse(t, 5);
        for (const side of [-1, 1]) {
          circle(side * 100, -300, 26 * pump, { fill: '#2E3A66', lw: 5 });
        }
      });
      for (const side of [-1, 1]) sparkle(960 + side * 250, floorY + 60 - 420 * s * 1.02 + 40, 30 * bgPulse(t, 4), '#FFFFFF');
    }
    // wind lines for the tie
    if (bar === 2) {
      for (let i = 0; i < 7; i++) {
        const y = 260 + i * 70, x = ((t * 2400 + hash(i, 3) * 2000) % 2600) - 400;
        stroke([[x, y], [x + 260, y]], rgba('#FFFFFF', 0.4), 6, { ink: null });
      }
    }
    // a word for each pose
    const words = [['불끈!', LIME], ['척!', '#FFFFFF'], ['휘날~', PINK], ['반짝!', LIME]];
    sfx(words[bar][0], bar === 3 ? 450 : 1480, bar === 3 ? 470 : 360, 130, words[bar][1], inBar, { life: 1.3, rot: bar % 2 ? 0.1 : -0.1 });
  }

  // ---- 14.22 · the tough show: chopsticks, the pigeon, the 1 kg dumbbell -------------------------------

  /** Split-apart wooden chopsticks from (x0, y0) to (x1, y1), bowed by bend; broken splits them. */
  function chopsticks(x0, y0, x1, y1, bend, broken) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - bend;
    if (!broken) {
      stroke([[x0, y0], [mx, my], [x1, y1]], '#E8C48A', 16, { smooth: true, olw: 8 });
      stroke([[x0, y0 - 3], [mx, my - 3], [x1, y1 - 3]], '#F6DDB0', 5, { smooth: true, ink: null });
    } else {
      stroke([[x0, y0], [mx - 6, my + 10]], '#E8C48A', 16, { olw: 8 });
      stroke([[x1, y1], [mx + 6, my + 10]], '#E8C48A', 16, { olw: 8 });
    }
  }

  function chopShow(t, lt) {
    const lb = lbeat(t, T_SHOW), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    neonGrid(t, bgPulse(t, 5), 640);
    const SNAP = 4;
    const broke = lb >= SNAP;
    const strain = broke ? 0 : clamp((Math.min(n, 3) + easeOut(clamp(f / 0.3))) / 4);
    const shake = broke ? 0 : Math.sin(t * 70) * (3 + strain * 5);
    const x = 960 + shake, y = 1230, s = 1.8;
    const win = broke ? easeOut(clamp((lb - SNAP) / 0.4)) : 0;
    let hl = null;
    boss(x, y, s, t, {
      aL: lerp(0.55, 2.5, win), eL: lerp(1.0, 0.3, win), aR: lerp(0.55, 2.5, win), eR: lerp(1.0, 0.3, win),
      eyes: broke ? 'happy' : strain > 0.5 ? 'closed' : 'determined', mouth: broke ? 'grin' : 'grin', blush: broke ? 0.6 : 0.4 + strain * 0.6,
      shades: true, sq: broke ? -0.03 * win : strain * 0.03, emote: broke ? 'sparkle' : strain > 0.3 ? 'anger' : null, emoteK: 1,
      holdL: (hx, hy) => { hl = [hx, hy]; },
      holdR: (hx, hy) => {
        if (!broke) chopsticks(hl[0] - 10, hl[1], hx + 10, hy, strain * 22 + Math.sin(t * 50) * 3, false);
        else {
          stroke([[hl[0], hl[1]], [hl[0] + 30, hl[1] - 110]], '#E8C48A', 16, { olw: 8 });
          stroke([[hx, hy], [hx - 30, hy - 110]], '#E8C48A', 16, { olw: 8 });
        }
      },
    });
    // sweat flying off
    if (!broke) {
      for (let i = 0; i < 4; i++) {
        const a = frac(lb * 1.3 + i * 0.25), side = i % 2 ? 1 : -1;
        smooth([[0, -16], [9, 4], [0, 12], [-9, 4]].map(([px, py]) => [x + side * (180 + a * 160) + px, 420 - a * 80 + a * a * 260 + py]), { fill: '#8FD3FF', lw: 3.5, alpha: 1 - a });
      }
    }
    if (broke) {
      sfx('톡', 960, 290, 80, '#FFFFFF', lb * B - SNAP * B, { life: 1.4, font: 'round' });
      letter('격파 성공', 960, 150, 110, LIME, { pop: clamp((lb - SNAP - 0.3) / 0.4), rot: -0.05 });
      sparkle(700, 350, 30 * bgPulse(t, 4), LIME); sparkle(1230, 330, 26 * bgPulse(t, 4), PINK);
    } else {
      // the strain meter
      const mw = 520;
      rrect(960 - mw / 2, 120, mw, 44, 22, { fill: '#1A1024', lw: 6 });
      rrect(960 - mw / 2 + 6, 126, (mw - 12) * strain, 32, 16, { fill: mix(LIME, PINK, strain), stroke: null });
      letter('나무젓가락 격파', 960, 70, 56, '#FFFFFF', { font: 'round' });
      if (n >= 1) sfx('끄응', 1450, 420, 70, PINK, f * B, { life: 0.44, rot: 0.1 });
    }
  }

  /** A pigeon standing at (x, y), facing left. bob pushes the head forward; puff inflates it. */
  function pigeon(x, y, s, t, bob, puff = 0, flap = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // feet
    for (const fx of [-14, 18]) stroke([[fx, -30], [fx, 0], [fx - 14, 4]], '#F28CA0', 5, { olw: 5 });
    // tail
    poly([[50, -70], [110, -58], [104, -40], [44, -44]], { fill: '#6E7388', lw: 5 });
    // body
    const pb = 1 + puff * 0.35;
    ell(10, -80, 68 * pb, 52 * pb, { fill: '#9AA0B4', lw: 5 });
    // wings (flapping up when flap > 0)
    ctx.save(); ctx.translate(30, -96); ctx.rotate(-flap * 1.3);
    smooth([[-40, 0], [20, -16], [70, 10], [40, 30], [-20, 26]], { fill: '#7C8196', lw: 5 });
    stroke([[-6, 10], [40, 14]], '#5A5E72', 4, { ink: null });
    ctx.restore();
    if (flap > 0) {
      ctx.save(); ctx.translate(-10, -96); ctx.rotate(flap * 1.2); ctx.scale(-1, 1);
      smooth([[-40, 0], [20, -16], [70, 10], [40, 30], [-20, 26]], { fill: '#7C8196', lw: 5 });
      ctx.restore();
    }
    // neck, iridescent
    ctx.save(); ctx.translate(-30 - bob * 22, -118 + bob * 4);
    ell(8, 16, 32 * pb, 30 * pb, { fill: '#5FA89A', lw: 5 });
    ell(10, 22, 20 * pb, 16 * pb, { fill: '#9A6FC0', stroke: null });
    // head
    circle(0, -18, 30, { fill: '#8E94A8', lw: 5 });
    poly([[-26, -16], [-52, -8], [-26, -4]], { fill: '#3A3440', lw: 4 });
    circle(-28, -20, 4, { fill: '#FFFFFF', stroke: null });
    circle(-6, -24, 9, { fill: '#FF9A3D', lw: 3.5 });
    circle(-8, -24, 4, { fill: PAL.ink, stroke: null });
    stroke([[-18, -36], [4, -34]], PAL.ink, 4, { ink: null });   // a frown
    ctx.restore();
    ctx.restore();
  }

  function pigeonShow(t, lt) {
    const lb = lbeat(t, T_PIGEON), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    neonGrid(t, bgPulse(t, 5), 720);
    const LOSE = 3;
    const lost = lb >= LOSE;
    const rec = lost ? easeOut(clamp((lb - LOSE) / 0.35)) : 0;
    // camera: slow push, a jolt when he loses
    const [sx, sy] = shakeXY(t, T_PIGEON + LOSE * B, 18, 0.3);
    camBegin(960 + sx, 560 + sy, 1 + lt * 0.03);
    // the railing the pigeon sits on
    rrect(1060, 760, 900, 40, 12, { fill: '#3A2E4E', lw: 6 });
    for (const px of [1200, 1500, 1800]) rrect(px - 14, 800, 28, 400, 6, { fill: '#2E2440', lw: 5 });
    // the pigeon: a head-bob on every beat, then puffs up and flaps in his face
    const bob = Math.exp(-f * 5) * (lost ? 0.3 : 1);
    const puff = lost ? 1 - Math.exp(-(lb - LOSE) * 4) : 0;
    const flap = lost && lb < LOSE + 1 ? Math.abs(Math.sin((lb - LOSE) * Math.PI * 4)) : 0;
    pigeon(1300, 762, 2.3, t, bob, puff, flap);
    if (lost && lb < LOSE + 1.2) sfx('구구!', 1500, 320, 110, '#FFFFFF', (lb - LOSE) * B, { life: 0.9, rot: 0.1 });
    // 부장님 in profile, face to face
    const eyeTw = !lost && n >= 1 && f < 0.15 ? 1 : 0;
    boss(560 - rec * 120, 1320, 2.3, t, {
      turn: 0.75, lookX: lost ? -0.6 : 1, rot: -rec * 0.14, aL: 0.3, aR: 0.3,
      eyes: lost ? 'sad' : 'determined', mouth: lost ? 'wavy' : 'flat', blush: lost ? 0.9 : 0.3,
      shades: true, slip: lost ? rec * 24 : eyeTw * 4, glint: 0,
      emote: lost ? 'sweat' : null, emoteK: rec,
    });
    // the stare: a crackle between them while it lasts
    if (!lost) {
      const pts = [];
      const y0 = 490, y1 = 480, x0 = 900, x1 = 1170;
      for (let i = 0; i <= 8; i++) pts.push([lerp(x0, x1, i / 8), lerp(y0, y1, i / 8) + (i % 2 ? -1 : 1) * (14 + 16 * hash(i, Math.floor(t * 20)))]);
      stroke(pts, n % 2 ? LIME : PINK, 8, { ink: '#FFFFFF', olw: 6 });
      letter('VS', 1030, 380, 70, '#FFFFFF', { pop: clamp(lb / 0.3), rot: -0.1 });
    }
    camEnd();
    if (lost) letter('패배…', 560, 170, 120, PINK, { pop: clamp((lb - LOSE - 0.3) / 0.4), rot: -0.06 });
  }

  /** A tiny pink dumbbell centred at (x, y), bar horizontal. */
  function dumbbell(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-46, -6, 92, 12, 5, { fill: '#C9CED8', lw: 4 });
    for (const side of [-1, 1]) rrect(side * 46 - 14, -24, 28, 48, 10, { fill: PINK, lw: 4.5 });
    ctx.restore();
  }

  function dumbShow(t, lt) {
    const lb = lbeat(t, T_DUMB), n = Math.floor(lb + 1e-6), f = frac(lb + 1e-6);
    neonGrid(t, bgPulse(t, 5), 620);
    const LIFT = 2;
    const up = lb >= LIFT, uk = up ? backOut(clamp((lb - LIFT) / 0.25)) : 0;
    const squat = up ? 0 : clamp(lb / 0.5);
    const tremble = Math.sin(t * 60) * (up ? 5 : 3);
    const x = 900, y = 1040, s = 1.65;
    glow(x, 400, 700, up ? LIME : PINK, 0.2 + 0.2 * bgPulse(t, 5));
    // knees shaking
    boss(x + tremble * 0.4, y, s, t, {
      lL: 0.35 + squat * 0.25, lR: 0.35 + squat * 0.25, kL: -squat * 0.6 + (up ? Math.sin(t * 50) * 0.08 : 0), kR: -squat * 0.6 - (up ? Math.sin(t * 50) * 0.08 : 0),
      sq: squat * 0.1 - uk * 0.04, dy: -squat * 40,
      aR: lerp(0.2, 3.05, uk), eR: lerp(0.2, 0.05, uk), aL: up ? 0.8 : 0.25, eL: up ? -1.5 : 0.2,
      eyes: up ? 'closed' : 'determined', mouth: 'grin', blush: 0.5 + 0.4 * (up ? 1 : squat), shades: true,
      emote: 'sweat', emoteK: 1,
      holdR: (hx, hy) => dumbbell(hx, hy - (up ? 70 : -10), 1.2, up ? 0 : 0.1),
    });
    if (up) {
      sfx('번쩍!', 1420, 260, 130, LIME, (lb - LIFT) * B, { life: 1.4, rot: 0.08 });
      // the label, big, once he's up there
      const k = clamp((lb - LIFT - 0.8) / 0.4);
      if (k > 0) {
        stroke([[1300, 600], [1060, 250]], '#FFFFFF', 6, { ink: PAL.ink, olw: 6, alpha: k });
        rrect(1290, 540, 320, 160, 30, { fill: '#FFFFFF', lw: 7, alpha: k });
        letter('1kg', 1450, 622, 120, PINK, { pop: k });
      }
      for (let i = 0; i < 5; i++) sparkle(x + Math.cos(i * 1.3 + t * 2) * 220, 160 + Math.sin(i * 2.1 + t * 3) * 60, 20 + 10 * bgPulse(t, 4), i % 2 ? LIME : '#FFFFFF');
    } else {
      letter('들어 올린다…', 960, 150, 80, '#FFFFFF', { font: 'round', pop: clamp(lb / 0.3) });
      if (n >= 1) sfx('으라차', 1420, 460, 80, PINK, f * B, { life: 0.44, rot: -0.1 });
    }
  }

  // ---- 21.33 · the toy box in the corner creaks open ------------------------------------------------

  function boxPeek(t, lt) {
    const lb = lbeat(t, T_BOX), bar = Math.floor(lb / 4 + 1e-6), f = frac(lb + 1e-6);
    // the lid steps up on the snaps
    const steps = [[0, 0], [5, 0.1], [7, 0.16], [9, 0.36], [11, 0.5], [13, 0.72], [15, 0.8]];
    let open = 0;
    for (const [b0, v] of steps) if (lb >= b0) open = v;
    const since = lb - steps.filter(([b0]) => lb >= b0).pop()[0];
    const prevOpen = steps.filter(([b0]) => lb >= b0).length > 1 ? steps[steps.filter(([b0]) => lb >= b0).length - 2][1] : 0;
    open = lerp(prevOpen, open, backOut(clamp(since / 0.25)));
    // camera: wide, then a slow push toward the box
    const pk = easeInOut(seg(t, T_BOX + BAR * 1.5, T_END));
    const [sx, sy] = [0, 0];
    camBegin(lerp(960, 1340, pk) + sx, lerp(540, 600, pk) + sy, lerp(1, 1.55, pk));
    room(t, { lit: 0.75 + 0.25 * bgPulse(t, 4), floorY: 830 });
    // 부장님, posing for the window like it's a mirror, back to the box
    const pb = Math.floor(lb / 2) % 2;
    const p = pb ? POSES[0] : POSES[3];
    const k = backOut(clamp(frac(lb / 2) * 2 / 0.3));
    boss(760, 880, 1.05, t, {
      ...lerpPose(pb ? POSES[3] : POSES[0], p, k), flip: true, turn: -0.3, dy: bgHop(t) * 8,
      eyes: 'happy', mouth: 'grin', shades: true, glint: snapPulse(t) * 0.9,
    });
    if (bgPulse(t, 6) > 0.5 && lb < 8) sparkle(560, 380, 24, '#FFFFFF');
    // the box, bottom right
    const bx = 1430, by = 880, bw = 360, bh = 230;
    toyBox(bx, by, bw, bh, open, () => {
      // eyes in the dark first, then the little one rising with the lid
      const rise = clamp((open - 0.1) / 0.6);
      const cy = lerp(880, 735, easeOut(rise));
      littleOne(bx + 10, cy, 1.25, t, {
        shadow: false, turn: -0.25, lookX: -1, lookY: 0.1, eyes: 'sleepy', mouth: 'flat',
        wig: Math.sin(lb * Math.PI) * 0.12, aL: 0.2, aR: 0.2,
      });
      // shadow inside the crack
      if (open < 0.3) {
        ctx.save(); ctx.globalAlpha = clamp(1 - (open - 0.1) / 0.2) * 0.8;
        rrect(bx - bw / 2, by - bh - 300, bw + 40, 320, 0, { fill: '#120A18', stroke: null });
        ctx.restore();
        // glinting eyes in the dark
        for (const side of [-1, 1]) circle(bx - 20 + side * 40, by - bh - 22, 7, { fill: '#FFFFFF', stroke: null });
      }
    });
    // little creaks on the snaps where the lid moves
    for (const [b0] of steps.slice(1)) sfx('끼익', bx + 180, by - bh - 200, 44, '#FFFFFF', (lb - b0) * B, { font: 'round', life: 0.5, rot: 0.1 });
    camEnd();
    // the kid's eyes track him: a tiny "…" once he's out
    if (lb > 13) letter('…', 1560, 360, 70, '#FFFFFF', { pop: clamp((lb - 13) / 0.4), font: 'round' });
  }

  chapter('tough', 0, T_END, [
    [0, darkStage],
    [T_BOSS, bossPoses],
    [T_SHOW, chopShow],
    [T_PIGEON, pigeonShow],
    [T_DUMB, dumbShow],
    [T_BOX, boxPeek],
  ]);
})();
