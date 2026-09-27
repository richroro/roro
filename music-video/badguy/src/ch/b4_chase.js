// badguy/src/ch/b4_chase.js — chapter 4 · 추격 (99.56 – 117.33)
// The second drop. The toy box lid blows off and the little one bursts out on a dinosaur ride-on
// car; 부장님 chases it down a neon corridor that strobes on every beat. At the corner the kid ducks
// into a side door and he splats on the wall; a dive, a belly-flop, a roll, and he drops into the
// toy box. The lid slams on the beat, the kid sits on it with the lollipop, and the lights go down
// to one spotlight for the break.
(() => {
  const LIME = '#B6FF3B', PINK = '#FF3DA5', BLK = '#0E0B14';
  const B = SONG.beat;
  const S = { burst: bgT(56), chase: bgT(57), corner: bgT(61), dive: bgT(63), slam: bgT(65), end: bgT(66) };
  const GROUND = 930;

  // ---- timing ---------------------------------------------------------------------------------------

  /** Beats since the shot started (fractional). */
  const lbeat = (t, t0) => bgBeat(t) - bgBeat(t0);
  /** 1 on each snap (beats 2 and 4 of the bar), falling away. */
  const snapK = (t, k = 8) => (bgBeatN(t) % 2 === 1 ? Math.exp(-frac(bgBeat(t) + 1e-6) * k) : 0);
  const hitK = (t, t0, len = 0.35) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  /** Eases 0 → 1 across beats [a, b] of a shot. */
  const bseg = (lb, a, b, e = ease) => e(clamp((lb - a) / (b - a)));

  function camDrift(t, cx, cy, z = 1, rot = 0, amp = 1) {
    camBegin(cx + Math.sin(t * 0.5) * 8 * amp, cy + Math.cos(t * 0.37) * 6 * amp, z, rot + Math.sin(t * 0.3) * 0.004 * amp);
  }
  function rectW(x, y, w, h, style, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = style; ctx.fillRect(x, y, w, h); ctx.restore(); }

  /** Arm angles that put a person's hand on a world point (from the second video's kit). */
  function reach(px, py, s, role, side, tx, ty, o = {}) {
    const child = role === 'child', R = ROLE[role];
    const Sc = s * R.h;
    const sx = side * (child ? 56 : 64), sy = child ? -194 : -274;
    const l1 = child ? 48 : 66, l2 = child ? 44 : 62;
    const lx = (tx - px) / Sc * (o.flip ? -1 : 1), ly = (ty - (py - (o.dy || 0) * Sc)) / Sc;
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
  function armsTo(px, py, s, role, L, Rt, o = {}) {
    const r = {};
    if (L) { const k = reach(px, py, s, role, -1, L[0], L[1], o); r.aL = k.a; r.eL = k.e; }
    if (Rt) { const k = reach(px, py, s, role, 1, Rt[0], Rt[1], o); r.aR = k.a; r.eR = k.e; }
    return r;
  }

  // ---- props ----------------------------------------------------------------------------------------

  /** A lollipop: (x, y) the end of the stick, pointing along rot (0 = up). */
  function lolly(x, y, s = 1, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    stroke([[0, 0], [0, -64]], '#FFFFFF', 7, { olw: 7 });
    circle(0, -88, 28, { fill: PINK, lw: 5 });
    ctx.beginPath();
    for (let i = 0; i < 34; i++) { const a = i * 0.5, r = i * 0.7; ctx.lineTo(Math.cos(a) * r, -88 + Math.sin(a) * r); }
    ctx.strokeStyle = LIME; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
    circle(-10, -100, 5, { fill: 'rgba(255,255,255,0.8)', stroke: null });
    ctx.restore();
  }
  /** Tiny sunglasses in head space (eyes at y = -276). k = 0 up on the forehead, 1 on. */
  function shadesAt(fx, k = 1, glint = 0) {
    const dy = (1 - k) * -64;
    ctx.save(); ctx.translate(0, dy);
    stroke([[fx - 90, -290], [fx - 62, -286]], PINK, 5, { olw: 5 });
    stroke([[fx + 90, -290], [fx + 62, -286]], PINK, 5, { olw: 5 });
    for (const side of [-1, 1]) {
      const cx = fx + side * 37;
      smooth([[cx - 29, -294], [cx + 29, -294], [cx + 27, -270], [cx + 12, -258], [cx - 12, -258], [cx - 27, -270]], { fill: BLK, lw: 5 });
      stroke([[cx - 26, -293], [cx + 26, -293]], PINK, 5, { ink: null });
      stroke([[cx - 14, -270], [cx - 4, -286]], '#FFFFFF', 4, { ink: null, alpha: 0.75 });
    }
    stroke([[fx - 9, -288], [fx + 9, -288]], PINK, 5, { ink: null });
    if (glint > 0.02) {
      glow(fx + 44, -284, 60 * glint, LIME, 0.9 * glint);
      sparkle(fx + 48, -288, 26 * glint, '#FFFFFF', 0.3);
    }
    ctx.restore();
  }
  /** Head-space helper for person(): runs fn in the head's own coordinates. */
  function inHeadOf(role, o, fn) {
    const child = role === 'child', headY = child ? -300 : -370, R = ROLE[role];
    ctx.save(); ctx.translate(0, headY + 290 + (o.headDy || 0));
    ctx.translate(0, -290); ctx.rotate(o.headRot || 0); ctx.scale(R.head, R.head); ctx.translate(0, 290);
    fn((o.turn || 0) * 28); ctx.restore();
  }

  /**
   * The little one: dino T-shirt, tiny sunglasses, a lollipop.
   * o.shadesK (0..1), o.glint, o.lolly: 'mouth' | 'hand' | false, o.cheeks (0..1, stuffed).
   */
  function kid(x, y, s, t, o = {}) {
    const lol = o.lolly ?? 'mouth';
    const userL = o.holdL, userR = o.holdR;
    const face = () => inHeadOf('child', o, fx => {
      if (o.cheeks) for (const side of [-1, 1]) ell(fx + side * 62, -238, 30 * o.cheeks, 26 * o.cheeks, { fill: '#FFC7B0', lw: 4 });
      if (o.shades !== false) shadesAt(fx, o.shadesK ?? 1, o.glint || 0);
      if (lol === 'mouth') lolly(fx + 12, -226, 0.62, 1.2 + Math.sin(bgBeat(t) * Math.PI) * 0.08);
    });
    person(x, y, s, {
      role: 'child', t, eyes: 'dot', mouth: o.mouth || (lol === 'mouth' ? 'flat' : 'flat'), blush: 0.35, ...o,
      holdL: (hx, hy, ha) => { if (userL) { ctx.save(); userL(hx, hy, ha); ctx.restore(); } face(); },
      holdR: (hx, hy, ha) => {
        if (lol === 'hand') lolly(hx, hy + 6, 0.7, 0.15);
        if (userR) userR(hx, hy, ha);
      },
    });
  }

  /** 부장님. o.red (0..1) flushes the face, o.steam puffs from the ears, o.hat = deerstalker. */
  function boss(x, y, s, t, o = {}) {
    const userL = o.holdL;
    person(x, y, s, {
      role: 'boss', t, ...o,
      holdL: (hx, hy, ha) => {
        if (userL) { ctx.save(); userL(hx, hy, ha); ctx.restore(); }
        inHeadOf('boss', o, fx => {
          if (o.red > 0) {
            ctx.save(); ellPath(0, -290, 92, 90); ctx.clip();
            ctx.globalCompositeOperation = 'multiply';
            const r = clamp(o.red);
            ctx.fillStyle = lgrad(0, -196, 0, -384, [[0, rgba('#FF5A6E', 0.8 * r)], [clamp(r * 0.9), rgba('#FF5A6E', 0.6 * r)], [clamp(r * 0.9 + 0.1), rgba('#FF5A6E', 0)], [1, rgba('#FF5A6E', 0)]]);
            ctx.fillRect(-100, -390, 200, 200);
            ctx.restore();
          }
          if (o.hat) deerstalker(fx);
          if (o.steam > 0) {
            for (const side of [-1, 1]) {
              for (let i = 0; i < 3; i++) {
                const k = frac(o.steamPh + i / 3);
                smooth(blobPts(side * (110 + k * 80), -300 - k * 120, 16 + k * 26, 7, 0.2, i + side * 3),
                  { fill: '#FFFFFF', stroke: null, alpha: o.steam * Math.sin(k * Math.PI) * 0.9 });
              }
            }
          }
        });
      },
    });
  }
  /** Brown checked detective cap, head space. */
  function deerstalker(fx) {
    smooth([[-96, -330], [-92, -396], [-40, -432], [40, -432], [92, -396], [96, -330], [60, -350], [0, -358], [-60, -350]], { fill: '#A8784E', lw: 5 });
    ctx.save(); smoothPath([[-96, -330], [-92, -396], [-40, -432], [40, -432], [92, -396], [96, -330], [60, -350], [0, -358], [-60, -350]]); ctx.clip();
    for (let i = -4; i <= 4; i++) { stroke([[i * 26, -440], [i * 26, -320]], '#7A5234', 5, { ink: null, alpha: 0.6 }); }
    for (let j = 0; j < 4; j++) stroke([[-100, -420 + j * 26], [100, -420 + j * 26]], '#7A5234', 5, { ink: null, alpha: 0.6 });
    ctx.restore();
    smooth([[fx - 50, -352], [fx + 50, -352], [fx + 40, -330], [fx - 40, -330]], { fill: '#8A5E3A', lw: 4.5 });
    circle(0, -434, 9, { fill: '#8A5E3A', lw: 4 });
  }


  /** The toy box: (x, y) bottom centre. lid = open angle (rad). peek (0..1): shades glinting in the gap. */
  function toyBox(x, y, s, t, lid = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const w = 320, h = 210;
    ell(0, 4, 190, 22, { fill: 'rgba(0,0,0,0.25)', stroke: null });
    rrect(-w / 2, -h, w, h, 14, { fill: PINK, lw: 6 });
    rrect(-w / 2 + 16, -h + 16, w - 32, h - 32, 10, { fill: '#E02A8C', stroke: rgba(PAL.ink, 0.5), lw: 3 });
    for (const [i, sx] of [-0.36, 0.36].entries()) poly(starShape(sx * w, -h * 0.72, h * 0.11, 0.45, 5, -Math.PI / 2 + i * 0.3), { fill: i ? '#FFFFFF' : LIME, lw: 3.5 });
    letter('TOYS', 4, -h * 0.42, h * 0.28, LIME, { lw: 6, rot: -0.04 });
    // the lid, hinged at the back left corner; the dark wedge under it, and whatever is in there
    const hx = -w / 2 - 6, hy = -h, L = w + 12;
    const ex = hx + Math.cos(lid) * L, ey = hy - Math.sin(lid) * L;
    if (lid > 0.001 && lid < 0.7) {
      const wl = lid;
      poly([[hx + 8, hy], [w / 2 - 4, hy], [hx + Math.cos(wl) * L, hy - Math.sin(wl) * L]], { fill: '#05030A', stroke: null });
      if (o.peek > 0) {
        const gx = w / 2 - 70, gy = hy - Math.sin(lid) * (gx - hx) * 0.55;
        for (const sx of [-20, 20]) rrect(gx + sx - 16, gy - 7, 32, 14, 6, { fill: '#000000', stroke: PINK, lw: 3, alpha: o.peek });
        glow(gx, gy, 70, LIME, 0.9 * o.peek);
        sparkle(gx + 22, gy - 4, 20 * o.peek, '#FFFFFF', 0.3);
      }
    }
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-lid);
    rrect(0, -30, L, 34, 10, { fill: '#E02A8C', lw: 6 });
    stroke([[16, -14], [L - 16, -14]], '#FF6BC0', 6, { ink: null });
    ctx.restore();
    ctx.restore();
  }


  // ---- the neon world --------------------------------------------------------------------------------

  /** The strobe colour and strength for this beat: lime on the downbeats, pink in between. */
  function strobe(t) {
    const n = bgBeatN(t);
    return { c: n % 2 ? PINK : LIME, k: bgPulse(t, 7) };
  }

  /**
   * A neon corridor seen side-on, in world units; X is the world x at the left of the screen
   * (the floor scrolls by it). o.strobe (0..1) scales the beat flash.
   */
  function corridor(t, X, o = {}) {
    const st = strobe(t), sk = st.k * (o.strobe ?? 1);
    rectW(X - 200, -300, W + 400, 1100, '#120A1C');
    rectW(X - 200, -300, W + 400, 1100, rgba(st.c, 0.78 * sk));
    // wall panels and doors, every 900 px
    const P = 900, k0 = Math.floor(X / P) - 1, k1 = Math.floor((X + W) / P) + 1;
    for (let k = k0; k <= k1; k++) {
      const x = k * P;
      stroke([[x + 450, 170], [x + 450, 760]], rgba('#000000', 0.35), 6, { ink: null });
      rrect(x + 80, 320, 240, 440, 14, { fill: '#05030A', stroke: k % 2 ? PINK : LIME, lw: 9 });
      rectW(x + 100, 340, 200, 400, rgba(k % 2 ? PINK : LIME, 0.08 + 0.1 * sk));
      circle(x + 200, 430, 36, { fill: rgba(k % 2 ? PINK : LIME, 0.25), stroke: k % 2 ? PINK : LIME, lw: 5 });
      const sign = ['★', '♥', '→', '!'][((k % 4) + 4) % 4];
      letter(sign, x + 640, 300, 110, k % 2 ? LIME : PINK, { lw: 0, shadow: null, alpha: 0.85 });
    }
    // neon tubes: lime up top, pink along the skirting
    rectW(X - 200, 70, W + 400, 110, lgrad(0, 70, 0, 180, [[0, rgba(LIME, 0)], [0.5, rgba(LIME, 0.35)], [1, rgba(LIME, 0)]]));
    rectW(X - 200, 116, W + 400, 20, LIME);
    rectW(X - 200, 720, W + 400, 100, lgrad(0, 720, 0, 820, [[0, rgba(PINK, 0)], [0.5, rgba(PINK, 0.4)], [1, rgba(PINK, 0)]]));
    rectW(X - 200, 760, W + 400, 18, PINK);
    // the floor
    rectW(X - 200, 778, W + 400, 600, lgrad(0, 778, 0, 1080, [[0, '#1A1026'], [1, '#07050C']]));
    rectW(X - 200, 778, W + 400, 600, rgba(st.c, 0.22 * sk));
    const D = 260, d0 = Math.floor(X / D) - 1, d1 = Math.floor((X + W) / D) + 1;
    for (let d = d0; d <= d1; d++) rectW(d * D, 960, 130, 12, rgba(LIME, 0.8));
    for (let d = d0; d <= d1; d++) stroke([[d * D + 60, 790], [d * D - 120, 1080]], rgba('#FFFFFF', 0.06), 4, { ink: null });
  }

  /** The dinosaur ride-on car, side-on, facing right. (x, y) the ground under its middle. */
  function dinoCar(x, y, s, t, o = {}) {
    const roll = o.roll ?? 0, dy = o.dy || 0;
    ell(x, y, 170 * s, 18 * s, { fill: 'rgba(0,0,0,0.35)', stroke: null });
    ctx.save(); ctx.translate(x, y - dy); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    const G = '#8BE33F', GD = '#5DB22A';
    smooth([[-120, -112], [-200, -150], [-262, -176], [-236, -140], [-130, -72]], { fill: G, lw: 6 });
    ell(0, -100, 160, 64, { fill: G, lw: 6 });
    ell(12, -70, 118, 24, { fill: '#DCFFA6', stroke: null });
    for (let i = 0; i < 5; i++) {
      const sx = -112 + i * 44, sy = -150 - Math.sin((i + 0.5) / 5 * Math.PI) * 14;
      poly([[sx - 17, sy + 8], [sx, sy - 30], [sx + 17, sy + 8]], { fill: PINK, lw: 4.5 });
    }
    // neck and head
    smooth([[96, -150], [132, -250], [176, -262], [178, -200], [150, -110]], { fill: G, lw: 6 });
    rrect(118, -318, 170, 86, 38, { fill: G, lw: 6 });
    poly([[180, -236], [200, -222], [218, -236], [236, -222], [254, -236]], { fill: '#FFFFFF', lw: 3.5 });
    circle(170, -290, 18, { fill: '#FFFFFF', lw: 4.5 });
    circle(176, -290, 8, { fill: BLK, stroke: null });
    stroke([[150, -316], [188, -308]], BLK, 6, { ink: null });
    circle(266, -296, 5, { fill: GD, stroke: null });
    // a headlight
    circle(282, -262, 12, { fill: '#FFFDE0', lw: 4 });
    glow(300, -262, 120, '#FFFDE0', 0.35);
    // saddle
    rrect(-80, -180, 120, 28, 13, { fill: BLK, lw: 5 });
    // wheels
    for (const wx of [-96, 96]) {
      circle(wx, -38, 38, { fill: '#1A1424', lw: 5 });
      circle(wx, -38, 17, { fill: PINK, lw: 4 });
      for (let i = 0; i < 3; i++) {
        const a = roll + i * TAU / 3;
        stroke([[wx + Math.cos(a) * 17, -38 + Math.sin(a) * 17], [wx + Math.cos(a) * 32, -38 + Math.sin(a) * 32]], '#FFFFFF', 4, { ink: null, alpha: 0.7 });
      }
    }
    ctx.restore();
  }
  /** Where the handlebar grips are, in world units. */
  const gripOf = (x, y, s, dy = 0, rot = 0) => {
    const gx = 96, gy = -262;
    return [x + (gx * Math.cos(rot) - gy * Math.sin(rot)) * s, y - dy + (gx * Math.sin(rot) + gy * Math.cos(rot)) * s];
  };
  function handlebar(x, y, s, dy = 0, rot = 0) {
    ctx.save(); ctx.translate(x, y - dy); ctx.rotate(rot); ctx.scale(s, s);
    stroke([[128, -220], [104, -262]], BLK, 8, { olw: 5 });
    rrect(84, -276, 38, 22, 9, { fill: PINK, lw: 4 });
    ctx.restore();
  }

  /** The little one riding the dino car. o: car options + kid options in o.kid. */
  function rider(x, y, s, t, o = {}) {
    const dy = o.dy || 0, rot = o.rot || 0;
    dinoCar(x, y, s, t, o);
    // kid sits on the saddle
    const ks = s * 1.05, KS = ks * ROLE.child.h;
    const seat = [x + (-20 * Math.cos(rot) + 172 * Math.sin(rot)) * s, y - dy + (-20 * Math.sin(rot) - 172 * Math.cos(rot)) * s];
    const kx = seat[0], ky = seat[1] + 120 * KS;
    const grip = gripOf(x, y, s, dy, rot);
    const bob = o.bob ?? bgHop(t) * 6;
    const ko = o.kid || {};
    kid(kx, ky, ks, t, {
      lL: 1.25, lR: 1.25, kL: -0.9, kR: -0.9, turn: 0.55, lookX: 1, rot: rot * 0.8 + (ko.lean || 0), shadow: false, dy: bob,
      ...armsTo(kx, ky, ks, 'child', [grip[0] - 16, grip[1] + 8], [grip[0] + 10, grip[1]], { dy: bob }),
      ...ko,
    });
    handlebar(x, y, s, dy, rot);
  }

  /** Exhaust puffs behind a car at (x, y), age since a rev. */
  function puffs(x, y, age, n = 6, dir = -1) {
    for (let i = 0; i < n; i++) {
      const k = clamp(age / 0.9 - i * 0.05);
      if (k <= 0 || k >= 1) continue;
      smooth(blobPts(x + dir * (40 + k * (200 + i * 50)), y - k * (40 + i * 12), 34 + k * 70, 7, 0.25, i),
        { fill: i % 2 ? rgba(PINK, 0.8 * (1 - k)) : rgba(LIME, 0.8 * (1 - k)), stroke: null });
    }
  }

  /** 부장님 curled into a ball, rolling: a navy ball with his head, hands and shoes poking out. */
  function bossBall(x, y, s, t, spin) {
    const R = ROLE.boss;
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.scale(s, s);
    // shoes and hands behind the ball
    for (const a of [2.3, 2.9]) ell(Math.cos(a) * 118, Math.sin(a) * 118, 34, 18, { fill: R.shoe, lw: 4.5 }, a);
    for (const a of [-0.5, 0.4]) circle(Math.cos(a) * 124, Math.sin(a) * 124, 20, { fill: R.skin, lw: 4.5 });
    circle(0, 0, 120, { fill: R.jacket, lw: 6 });
    stroke([[-80, 40], [0, 80], [80, 40]], mix(R.jacket, PAL.ink, 0.4), 5, { ink: null, smooth: true });
    poly([[-8, -60], [8, -60], [14, 20], [0, 34], [-14, 20]], { fill: R.tie, lw: 3.5 });
    // the head, tucked in at the top
    ctx.translate(0, -104);
    ell(0, 0, 70, 66, { fill: R.skin, lw: 5 });
    smooth([[-70, -6], [-66, -34], [-50, -40], [-56, -10]], { fill: R.grey, lw: 3.5 });
    smooth([[70, -6], [66, -34], [50, -40], [56, -10]], { fill: R.grey, lw: 3.5 });
    for (const sx of [-24, 24]) {
      ctx.beginPath();
      for (let i = 0; i < 22; i++) { const a = i * 0.6, r = i * 0.6; ctx.lineTo(sx + Math.cos(a) * r, 2 + Math.sin(a) * r); }
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.stroke();
    }
    smooth([[-26, 30], [0, 22], [26, 30], [14, 36], [0, 32], [-14, 36]], { fill: R.hair, lw: 3 });
    ell(-18, -40, 18, 7, { fill: 'rgba(255,255,255,0.55)', stroke: null }, -0.3);
    ctx.restore();
  }

  function spotlight(k, cx, floorY, topW = 120, botW = 420) {
    if (k <= 0) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20);
    ctx.moveTo(cx - topW / 2, -10); ctx.lineTo(cx - botW, floorY); ctx.ellipse(cx, floorY, botW, 70, 0, Math.PI, 0, true);
    ctx.lineTo(cx + topW / 2, -10); ctx.closePath();
    ctx.fillStyle = rgba('#050208', 0.94 * k); ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.moveTo(cx - topW / 2, -10); ctx.lineTo(cx - botW, floorY); ctx.ellipse(cx, floorY, botW, 70, 0, Math.PI, 0, true); ctx.lineTo(cx + topW / 2, -10); ctx.closePath();
    ctx.fillStyle = lgrad(0, 0, 0, floorY, [[0, rgba('#FFF4FB', 0.18 * k)], [1, rgba('#FFF4FB', 0.05 * k)]]); ctx.fill();
    ctx.restore();
  }

  // ---- 99.56 THE DROP: the lid blows, out comes the dino car -------------------------------------------

  function burst(t) {
    const lb = lbeat(t, S.burst);
    const age = t - S.burst;
    fillScreen('#120A1C');
    const [sx, sy] = shakeXY(t, S.burst, 34, 0.6);
    const [sx2, sy2] = shakeXY(t, S.burst + 2 * B, 16, 0.3);
    camBegin(960 + sx + sx2, 560 + sy + sy2, 1.0 + hitK(t, S.burst, 0.5) * 0.08);
    corridor(t, 0);
    speedLines(t, 1150, 640, hitK(t, S.burst, 1.2), '#FFFFFF');
    const boxX = 1150, boxY = GROUND + 10, bs = 1.25;
    // the car: out of the box in an arc (beats 0-2), lands, revs (beat 3), zooms off right
    const up = clamp(lb / 2);
    const land = lb >= 2;
    const zoom = bseg(lb, 3.2, 4, easeIn);
    const cx = land ? lerp(1500, 2600, zoom) : lerp(boxX, 1500, up);
    const cy = GROUND + 20;
    const cdy = land ? Math.max(0, Math.sin(clamp((lb - 2) / 0.5) * Math.PI)) * 40 * (1 - clamp(lb - 2.5)) : Math.sin(up * Math.PI) * 480 + (1 - up) * 260;
    const crot = land ? -zoom * 0.1 + (lb > 3 && lb < 3.3 ? -0.08 : 0) : lerp(-0.5, 0.25, up);
    const cs = lerp(0.55, 1.0, easeOut(clamp(up * 1.5)));
    // 부장님, blown off his feet, then up and after it
    const bx0 = 560;
    const blown = easeOut(clamp(age / (1.2 * B)));
    const bxp = lerp(bx0, 300, blown), sat = lb >= 1.3 && lb < 3.3;
    const run = bseg(lb, 3.3, 4, easeIn);
    if (lb < 1.3) {
      boss(bxp, GROUND + 50 - Math.sin(blown * Math.PI) * 200, 1.15, t, {
        rot: -blown * 1.6, eyes: 'wide', mouth: 'open', aL: 2.8, aR: 2.8, eL: 0.2, eR: 0.2, lL: 0.8, lR: 0.4, turn: 0.4,
      });
    } else {
      boss(bxp + run * 900, GROUND + 50, 1.15, t, {
        sit: sat, dy: sat ? -60 : 0, walk: run > 0 ? bgBeat(t) : undefined, run: run > 0, turn: 0.6, lookX: 1,
        eyes: lb < 2.4 ? 'spiral' : 'determined', brows: 'angry', mouth: lb < 2.4 ? 'wavy' : 'open', red: lb >= 2.4 ? 0.5 : 0,
        aL: sat ? 0.9 : undefined, aR: sat ? 0.9 : 1.9, eR: sat ? 0.8 : 0.2,
        emote: lb >= 2.4 ? 'anger' : null, emoteK: 1,
      });
    }
    // his detective cap flies away
    if (lb < 3) {
      const hk = clamp(age / (2.5 * B));
      ctx.save(); ctx.translate(lerp(560, -150, hk), lerp(380, -250, easeOut(hk))); ctx.rotate(-hk * 9); ctx.scale(0.8, 0.8); ctx.translate(0, 380);
      deerstalker(0); ctx.restore();
    }
    // the box and its lid, flung wide
    const lid = Math.min(2.3, easeOut(clamp(age / 0.25)) * 2.3);
    toyBox(boxX, boxY, bs, t, lid);
    if (lb < 0.4) glow(boxX, boxY - 260, 500, LIME, 0.9 * (1 - lb / 0.4));
    rider(cx, cy, cs, t, {
      dy: cdy, rot: crot, roll: t * (land ? 30 : 12),
      kid: { glint: Math.max(hitK(t, S.burst, 0.6), bgPulse(t, 9) * 0.5), lolly: 'mouth', aL: undefined },
    });
    if (lb > 3 && lb < 4.2) puffs(cx - 260 * cs, cy - 40, t - (S.burst + 3 * B), 7);
    sfx('부릉!!', 640, 190, 220, LIME, age, { life: 1.5, color2: BLK, rot: -0.1 });
    sfx('부아앙~', 1500, 330, 130, PINK, t - (S.burst + 3 * B), { life: 0.9, color2: BLK, rot: 0.08 });
    camEnd();
    flash(hitK(t, S.burst, 0.35) * 0.95, LIME);
  }

  // ---- 101.33 the chase down the neon corridor ---------------------------------------------------------

  function chase(t) {
    const lb = lbeat(t, S.chase);                       // 16 beats
    const X = (t - S.chase) * 1500;
    fillScreen('#120A1C');
    camBegin(960, 540 + bgPulse(t, 9) * 6, 1.0 + bgPulse(t, 9) * 0.012);
    ctx.translate(-X, 0);
    corridor(t, X);
    ctx.translate(X, 0);
    streaks(t, 0.8, '#FFFFFF', 3, -1);
    // how far ahead the little one is (screen x) and where 부장님 is
    const boost = t >= S.chase + 7 * B;
    const kx = kf(lb, [[0, 1350], [4, 1350], [7, 1180], [7.6, 1480], [12, 1420], [16, 1400]], easeInOut);
    const bx = kf(lb, [[0, 260], [4, 520], [7, 880], [9, 560], [12, 520], [14, 640], [16, 700]], easeInOut);
    const cy = GROUND + 20;
    // the little one: shoulders on the beat, a glance back in the last bar
    const glance = lb >= 12 && lb < 15;
    const beatN = bgBeatN(t);
    rider(kx, cy, 1.0, t, {
      dy: Math.abs(Math.sin(t * 17)) * 5 + (boost && lb < 8 ? Math.sin(clamp(lb - 7) * Math.PI) * 60 : 0), roll: t * 30,
      rot: boost && lb < 8 ? -0.12 * Math.sin(clamp(lb - 7) * Math.PI) : 0,
      kid: {
        lean: (beatN % 2 ? 0.06 : -0.06) * (1 - bseg(lb, 12, 12.2)), turn: glance ? -0.6 : 0.55, lookX: glance ? -1 : 1,
        glint: glance ? bgPulse(t, 6) : 0, lolly: 'mouth',
      },
    });
    if (boost) puffs(kx - 260, cy - 40, t - (S.chase + 7 * B), 8);
    // the toy blocks she tosses back in bar 3
    const dropT = S.chase + 9 * B;
    if (t >= dropT) {
      for (let i = 0; i < 3; i++) {
        const a = t - dropT - i * 0.08;
        if (a < 0) continue;
        const px = kx - 200 - a * 1500 - i * 70, py = Math.min(cy - 40, cy - 240 + a * 900 - Math.sin(Math.min(a * 5, Math.PI)) * 60);
        if (px < -200) continue;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a * 8 + i);
        rrect(-40, -40, 80, 80, 12, { fill: [LIME, PINK, '#8A4CF0'][i], lw: 5 });
        letter(['A', 'B', 'C'][i], 0, 0, 44, '#FFFFFF', { lw: 5, shadow: null });
        ctx.restore();
      }
    }
    // 부장님: running flat out, reaching; a hop over the blocks; puffing at the end
    const hop = Math.max(0, Math.sin(clamp((lb - 9.9) / 1.1) * Math.PI));
    const reachOut = lb > 5 && lb < 7.4;
    const tired = lb >= 12;
    boss(bx, GROUND + 50, 1.12, t, {
      walk: bgBeat(t) * 1.0, run: true, dy: hop * 170, rot: 0.12 + hop * -0.2,
      turn: 0.6, lookX: 1, eyes: hop > 0.2 ? 'wide' : tired ? 'sad' : 'determined', brows: 'angry',
      mouth: tired ? 'open' : reachOut ? 'grin' : 'open', red: 0.3 + (tired ? 0.3 : 0),
      aR: reachOut ? 1.75 : hop > 0.2 ? 2.8 : undefined, eR: reachOut ? 0.05 : undefined,
      aL: hop > 0.2 ? 2.8 : undefined, lL: hop > 0.2 ? 0.9 : undefined, lR: hop > 0.2 ? 0.9 : undefined,
      emote: tired ? 'sweat' : null, emoteK: 1,
    });
    if (reachOut) sfx('잡았다!', bx + 150, 330, 80, '#FFFFFF', t - (S.chase + 5.2 * B), { life: 1.0, color2: BLK });
    sfx('부웅!', kx - 60, 330, 120, LIME, t - (S.chase + 7 * B), { life: 0.8, color2: BLK, rot: -0.1 });
    if (hop > 0) sfx('헉!', bx + 60, 250, 90, PINK, t - (S.chase + 9.9 * B), { life: 0.6, color2: BLK });
    for (let i = 12; i < 16; i++) sfx('헥헥', bx + 150, 360, 60, '#FFFFFF', t - (S.chase + i * B), { life: B * 0.9, color2: BLK });
    camEnd();
  }

  // ---- 108.44 the corner: always one step ahead -------------------------------------------------------

  function corner(t) {
    const lb = lbeat(t, S.corner);                      // 8 beats
    fillScreen('#120A1C');
    const bang = S.corner + 3 * B;
    const [sx, sy] = shakeXY(t, bang, 26, 0.4);
    camBegin(960 + sx, 540 + sy, 1.0);
    ctx.translate(100, 0); corridor(t, -100); ctx.translate(-100, 0);
    // the end wall on the right, and a side door just before it
    rrect(1640, -100, 500, 1300, 0, { fill: '#1C1128', stroke: null });
    rectW(1640, -100, 24, 1300, PINK);
    for (let i = 0; i < 6; i++) poly([[1680, 300 + i * 90], [1760, 300 + i * 90], [1720, 345 + i * 90]], { fill: i % 2 ? LIME : PINK, stroke: null, alpha: 0.7 });
    const door = [1080, 320, 240, 440];
    rectW(door[0], door[1], door[2], door[3], lgrad(0, door[1], 0, door[1] + door[3], [[0, '#2A1740'], [1, rgba(LIME, 0.5)]]));
    letter('→', door[0] + door[2] / 2, 240, 90, LIME, { lw: 8, color2: BLK, alpha: 0.6 + 0.4 * bgPulse(t) });
    // the little one: in from the left, and in through the side door on beat 2
    const cy = GROUND + 20;
    let kx, ky = cy, ks = 1.0, inDoor = false, flipK = false;
    if (lb < 1.6) kx = lerp(-300, door[0] + 140, easeOut(clamp(lb / 1.6)));
    else if (lb < 2.4) { const k = bseg(lb, 1.6, 2.4, easeIn); kx = door[0] + 140; ky = lerp(cy, door[1] + door[3] - 10, k); ks = lerp(1.0, 0.45, k); inDoor = true; }
    else if (lb < 5) kx = null;
    else { const k = bseg(lb, 5, 6.6, easeIn); kx = lerp(door[0] + 140, -500, k); ky = lerp(door[1] + door[3] - 10, cy, clamp(k * 3)); ks = lerp(0.45, 1.0, clamp(k * 3)); flipK = true; inDoor = k < 0.33; }
    const drawKid = () => {
      if (kx === null) return;
      if (inDoor) { ctx.save(); ctx.beginPath(); ctx.rect(door[0], -400, door[2], door[1] + door[3] + 400); ctx.clip(); }
      ctx.save();
      if (flipK) { ctx.translate(kx, 0); ctx.scale(-1, 1); ctx.translate(-kx, 0); }
      rider(kx, ky, ks, t, { roll: t * 30 * (flipK ? 1 : 1), kid: { lolly: 'mouth', glint: flipK ? 0.8 : 0 } });
      ctx.restore();
      if (inDoor) ctx.restore();
    };
    rrect(door[0], door[1], door[2], door[3], 10, { fill: null, stroke: PINK, lw: 10 });
    const kidBehind = inDoor;
    if (kidBehind) drawKid();
    // 부장님: runs in, can't stop, SPLAT on the wall (beat 3), slides down, then the kid zips past behind him
    const bby = GROUND + 50;
    if (lb < 3) {
      const k = clamp((lb - 0.6) / 2.4);
      const bx = lerp(-300, 1500, k * k);
      boss(bx, bby, 1.12, t, { walk: bgBeat(t), run: true, rot: 0.14, turn: 0.6, lookX: 1, eyes: lb > 2.4 ? 'wide' : 'determined', brows: 'angry', mouth: 'open', aR: 1.8, eR: 0.1, red: 0.3 });
      if (lb > 2.2) sfx('끼이익', bx - 100, 420, 70, '#FFFFFF', t - (S.corner + 2.2 * B), { life: 0.6, color2: BLK });
    } else {
      const slide = bseg(lb, 3.4, 5, easeIn);
      const turnBack = lb >= 5.3;
      const up = bseg(lb, 6.4, 7, easeOut), run = bseg(lb, 6.6, 8, easeIn);
      ctx.save();
      const wallX = 1640;
      if (!turnBack) {
        const sq = 1 - 0.25 * hitK(t, bang, 0.6);
        ctx.translate(wallX, 0); ctx.scale(sq, 1); ctx.translate(-wallX, 0);
        boss(wallX - 110, bby + slide * 0, 1.12, t, {
          rot: 0.05 + slide * 0.12, dy: -slide * 30, turn: 0.9, lookX: 1, eyes: 'x', mouth: 'wavy', aL: 2.4, aR: 2.4, eL: 0.3, eR: 0.3,
          sit: slide > 0.7, blush: 0.8,
        });
        for (let i = 0; i < 3; i++) {
          const a = t * 6 + i * TAU / 3;
          poly(starShape(wallX - 110 + Math.cos(a) * 110, 360 + slide * 180 + Math.sin(a) * 26, 22, 0.45), { fill: LIME, lw: 3 });
        }
      } else {
        const bx = wallX - 110 - run * 2200;
        ctx.translate(bx, 0); ctx.scale(-1, 1); ctx.translate(-bx, 0);
        boss(bx, bby, 1.12, t, {
          sit: up < 0.5, dy: up < 0.5 ? -40 : 0, walk: run > 0 ? bgBeat(t) : undefined, run: run > 0, turn: 0.6, lookX: 1,
          eyes: run > 0 ? 'determined' : 'wide', brows: 'angry', mouth: 'open', red: 0.4, rot: run > 0 ? 0.14 : 0,
          emote: lb < 6.6 ? '!?' : 'anger', emoteK: 1,
        });
      }
      ctx.restore();
      sfx('쿵!', wallX - 180, 300, 190, PINK, t - bang, { life: 1.1, color2: BLK, rot: -0.12 });
    }
    if (!kidBehind) drawKid();
    if (lb >= 5 && lb < 6.5) sfx('휘잉~', 700, 300, 110, LIME, t - (S.corner + 5 * B), { life: 1.0, color2: BLK });
    camEnd();
    flash(hitK(t, bang, 0.2) * 0.5, '#FFFFFF');
  }

  // ---- 112.00 the dive, the roll, into the box ---------------------------------------------------------

  const DIVE = (() => {
    const boxX = 3000;
    return {
      boxX,
      cam: lb => kf(lb, [[0, 700], [4, 2250], [6.5, 3120], [8, 3150]], ease),
      car: lb => kf(lb, [[0, 850], [3.6, 2350], [4.6, 3000], [5.4, 3520], [6.6, 3700], [8, 3720]], t => t),
      carDy: lb => (lb > 3.6 && lb < 5.4 ? Math.sin((lb - 3.6) / 1.8 * Math.PI) * 360 : 0),
    };
  })();
  function dive(t) {
    const lb = lbeat(t, S.dive);
    fillScreen('#120A1C');
    const land = S.dive + 4 * B, drop = S.dive + 7.5 * B;
    const [sx, sy] = shakeXY(t, land, 18, 0.35);
    const camX = DIVE.cam(lb);
    camBegin(camX + sx, 540 + sy, 1.0);
    corridor(t, camX - 960, { strobe: 1 });
    const cy = GROUND + 20, boxX = DIVE.boxX, boxY = GROUND + 10;
    // 부장님: runs, dives at beat 3, belly-flops at 4, curls up and rolls, drops into the box
    const by = GROUND + 50;
    const lid = lb < 7.6 ? 2.1 : 2.1 * (1 - easeIn(bseg(lb, 7.6, 8)));
    let bossDraw;
    if (lb < 3) {
      const bx = kf(lb, [[0, 150], [3, 1650]], t => t);
      bossDraw = () => boss(bx, by, 1.12, t, { walk: bgBeat(t), run: true, rot: 0.15, turn: 0.6, lookX: 1, eyes: 'determined', brows: 'angry', mouth: 'grin', red: 0.3, aR: 1.8, eR: 0.1 });
    } else if (lb < 4.3) {
      const k = clamp((lb - 3) / 1.0);
      const bx = lerp(1650, 2350, k), air = Math.sin(k * Math.PI) * 180;
      bossDraw = () => {
        ctx.save(); ctx.translate(bx, by - 150 - air); ctx.rotate(Math.PI / 2 * Math.min(1, k * 1.6));
        person(0, 170, 1.12, { role: 'boss', t, shadow: false, aL: 3.0, aR: 3.0, eL: 0, eR: 0, lL: 0.2, lR: 0.3, eyes: k < 0.9 ? 'determined' : 'x', brows: 'angry', mouth: k < 0.9 ? 'grin' : 'o', turn: 0.3 });
        ctx.restore();
      };
    } else {
      const k = bseg(lb, 4.3, 7.2, t => t);
      const bx = lerp(2350, boxX - 280, k);
      const r = 130;
      const into = bseg(lb, 7.2, 7.8, t => t);
      const yb = Math.min(boxY - 120, by - r + 10 - Math.sin(Math.min(into * 1.6, 1) * Math.PI * 0.5) * 340 + (into > 0.7 ? (into - 0.7) / 0.3 * 400 : 0));
      bossDraw = () => {
        if (into > 0.4) { ctx.save(); ctx.beginPath(); ctx.rect(-1000, -1000, 8000, boxY - 200 + 1000); ctx.clip(); }
        bossBall(bx + easeOut(clamp(into * 1.3)) * 290, yb, 1.0, t, (bx - 2350) / r + into * 4);
        if (into > 0.4) ctx.restore();
      };
    }
    const inBox = lb >= 7.45;
    if (inBox) bossDraw();
    toyBox(boxX, boxY, 1.25, t, lid);
    if (!inBox) bossDraw();
    // the car hops clean over the box
    const cx = DIVE.car(lb), cdy = DIVE.carDy(lb);
    const crot = lb > 3.6 && lb < 5.4 ? lerp(-0.3, 0.3, (lb - 3.6) / 1.8) : 0;
    rider(cx, cy, 1.0, t, { dy: cdy, rot: crot, roll: t * (lb < 6.6 ? 30 : 4), kid: { lolly: 'mouth', glint: cdy > 200 ? 1 : 0 } });
    if (lb > 3.5 && lb < 4.5) sfx('휙!', cx, 230, 110, LIME, t - (S.dive + 3.6 * B), { life: 0.7, color2: BLK });
    sfx('쿠당!', 2250, 520, 120, PINK, t - land, { life: 0.8, color2: BLK, rot: 0.1 });
    for (let i = 0; i < 3; i++) sfx('데굴', 2500 + i * 180, 560 - i * 20, 70, '#FFFFFF', t - (S.dive + (4.6 + i * 0.8) * B), { life: 0.6, color2: BLK });
    sfx('쏙!', boxX + 60, 520, 120, LIME, t - drop, { life: 0.6, color2: BLK });
    camEnd();
  }

  // ---- 115.56 SLAM. The little one sits on the lid. Lights down to a spotlight --------------------------

  function slam(t) {
    const lb = lbeat(t, S.slam);                        // 4 beats
    const age = t - S.slam;
    fillScreen('#120A1C');
    const [sx, sy] = shakeXY(t, S.slam, 30, 0.5);
    const push = easeInOut(bseg(lb, 1.5, 4));
    const boxX = DIVE.boxX, boxY = GROUND + 10;
    camBegin(lerp(3150, boxX + 10, push) + sx, lerp(540, 560, push) + sy, lerp(1.0, 1.5, push));
    corridor(t, 3150 - 960, { strobe: 1 - bseg(lb, 1.5, 2.5) });
    // the lid bangs shut, and rattles once on beat 2 (he's in there)
    const rattle = lb > 2 && lb < 2.6 ? Math.sin((lb - 2) * 40) * 0.05 * (1 - (lb - 2) / 0.6) : 0;
    const lidK = Math.max(0, Math.sin(clamp(age / 0.18) * Math.PI) * 0.06) + Math.abs(rattle);
    toyBox(boxX, boxY, 1.25, t, lidK);
    if (lb > 2 && lb < 2.8) sfx('쿵쿵', boxX - 260, 640, 60, '#FFFFFF', t - (S.slam + 2 * B), { life: 0.7, color2: BLK });
    // dust
    for (let i = 0; i < 8; i++) {
      const k = clamp(age / 0.8);
      if (k >= 1) break;
      const side = i % 2 ? 1 : -1;
      smooth(blobPts(boxX + side * (220 + k * (60 + i * 30)), boxY - 260 + i * 8 - k * 40, 20 + k * 36, 7, 0.25, i), { fill: rgba('#FFFFFF', 0.6 * (1 - k)), stroke: null });
    }
    sfx('쾅!!', boxX, 330, 230, PINK, age, { life: 1.1, color2: BLK, rot: -0.08 });
    // the car parked on the right; the little one hops off (beat 1), lands on the lid (beat 2)
    const carX = 3720, cy = GROUND + 20;
    const hopK = bseg(lb, 1, 2, t => t);
    const lidTop = boxY - 210 * 1.25 - 26;
    if (hopK <= 0) {
      rider(carX, cy, 1.0, t, { roll: 0, kid: { lolly: 'hand', turn: -0.5, lookX: -1 } });
    } else {
      dinoCar(carX, cy, 1.0, t, { roll: 0 });
      handlebar(carX, cy, 1.0);
      const ks = 1.05, KS = ks * ROLE.child.h;
      const seat = [carX - 20, cy - 172];
      const kx = lerp(seat[0], boxX + 10, easeInOut(hopK));
      const hipY = lerp(seat[1], lidTop, hopK) - Math.sin(hopK * Math.PI) * 220;
      const settle = hitK(t, S.slam + 2 * B, 0.3);
      const inMouth = lb >= 3;
      kid(kx, hipY + 120 * KS, ks, t, {
        lL: hopK < 1 ? 0.5 : 1.15, lR: hopK < 1 ? 0.5 : 1.15, kL: hopK < 1 ? 0.6 : -1.15, kR: hopK < 1 ? 0.6 : -1.15, shadow: false,
        sq: settle * 0.12, turn: hopK < 1 ? -0.3 : 0, lookX: 0, rot: hopK < 1 ? -0.2 * Math.sin(hopK * Math.PI) : 0,
        lolly: inMouth ? 'mouth' : 'hand', glint: inMouth ? hitK(t, S.slam + 3 * B, 0.8) : 0,
        aL: hopK < 1 ? 2.4 : 0.35, eL: 0.2, aR: hopK < 1 ? 2.4 : inMouth ? 0.35 : 2.2, eR: inMouth ? 0.2 : 1.6,
      });
      if (lb >= 3) sfx('쪽', kx + 120, hipY - 150, 60, PINK, t - (S.slam + 3 * B), { life: 0.6, color2: BLK });
    }
    camEnd();
    // lights down to one spotlight on the little one
    const dark = bseg(lb, 2.2, 3.8, easeInOut);
    const scx = 960 + (boxX + 10 - lerp(3150, boxX + 10, push)) * lerp(1.0, 1.5, push);
    spotlight(dark, scx, 1000, 180, 440);
    flash(hitK(t, S.slam, 0.25) * 0.8, '#FFFFFF');
  }

  chapter('chase', 99.56, 117.33, [
    [99.56, burst], [S.chase, chase], [S.corner, corner], [S.dive, dive], [S.slam, slam],
  ]);
})();
