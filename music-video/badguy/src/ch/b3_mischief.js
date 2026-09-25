// badguy/src/ch/b3_mischief.js — chapter 3 · 장난 (60.44 – 99.56)
// A montage, one prank every two bars, and 부장님 flinches on every snap (beats 2 and 4):
// crayon "감자 부장님" on the wall → the whole cake, crumbs only → salt in the coffee, 퉤! →
// a post-it on his back → a whoopee cushion → a balloon popped behind him → the wrecked room, and
// he has had enough. Then detective mode: a magnifier, tiny footprints in spilt flour, the trail
// to the toy box, the lights going down and the lid creaking.
(() => {
  const LIME = '#B6FF3B', PINK = '#FF3DA5', BLK = '#0E0B14', LIMEDK = '#6FA81E', PINKDK = '#B81F6E';
  const B = SONG.beat;
  const S = {
    crayon: bgT(34), cake: bgT(36), salt: bgT(38), note: bgT(40), cushion: bgT(42), balloon: bgT(44),
    mess: bgT(46), sniff: bgT(48), lens: bgT(49), trail: bgT(50), box: bgT(53), end: bgT(56),
  };
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

  /** 부장님 from behind: bald crown, grey horseshoe fringe, jacket. o.look turns the head (-1..1). */
  function bossBack(x, y, s, t, o = {}) {
    const R = ROLE.boss, S2 = s * R.h;
    ctx.save(); ctx.translate(x, y);
    ell(0, 0, 110 * S2, 18 * S2, { fill: 'rgba(40,20,60,0.22)', stroke: null });
    ctx.translate(0, -(o.dy || 0) * S2); ctx.scale(S2, S2); ctx.rotate(o.rot || 0);
    const sq = o.sq || 0; ctx.scale(1 + sq * 0.5, 1 - sq);
    for (const side of [-1, 1]) {
      const f = limb(side * 30, -160, 0.1, 80, 76, 0, R.pants, 34, side);
      ell(f[0], f[1] + 6, 32, 15, { fill: R.shoe, lw: 4.5 });
    }
    const bw = 70, belly = R.belly;
    smooth([[-bw, -282], [bw, -282], [bw + 8 + belly * 0.3, -225], [bw + belly * 0.5, -166],
      [0, -154], [-bw - belly * 0.5, -166], [-bw - 8 - belly * 0.3, -225]], { fill: R.jacket, lw: 5 });
    stroke([[0, -154], [0, -200]], mix(R.jacket, PAL.ink, 0.4), 4, { ink: null });
    for (const side of [-1, 1]) {
      const a = side < 0 ? (o.aL ?? 0.3) : (o.aR ?? 0.3), e = side < 0 ? (o.eL ?? 0.2) : (o.eR ?? 0.2);
      const h = limb(side * 64, -274, a, 66, 62, e, R.jacket, 28, side);
      circle(h[0], h[1], 16, { fill: R.skin, lw: 4.5 });
    }
    if (o.note > 0) postIt(-6, -222, 1.0, 0.08, o.note);
    // head
    const look = o.look || 0;
    ctx.save(); ctx.translate(0, -370); ctx.scale(R.head, R.head);
    rrect(-30, 50, 60, 40, 10, { fill: R.skin, lw: 4.5 });
    if (Math.abs(look) > 0.2) {
      const sd = Math.sign(look);
      smooth([[sd * 60, 10], [sd * 100, 20], [sd * 108, 40], [sd * 80, 44]], { fill: R.hair, lw: 3.5 });
    }
    ell(look * 20, 0, 92, 90, { fill: R.skin, lw: 5 });
    for (const side of [-1, 1]) ell(side * 90 - look * 16, 6, 11, 17, { fill: R.skin, lw: 4.5 });
    smooth([[-93, 8], [-84, 46], [-40, 72], [0, 78], [40, 72], [84, 46], [93, 8], [72, 34], [0, 52], [-72, 34]].map(([a, b]) => [a + look * 14, b]), { fill: R.grey, lw: 4.5 });
    ell(-20 + look * 20, -52, 30, 12, { fill: rgba('#FFFFFF', 0.55), stroke: null }, -0.3);
    ctx.restore();
    ctx.restore();
  }

  function postIt(x, y, s, rot, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + (1 - k) * 0.6); ctx.scale(s * (0.4 + 0.6 * backOut(k)), s * (0.4 + 0.6 * backOut(k)));
    poly([[-58, -52], [58, -52], [58, 40], [40, 56], [-58, 56]], { fill: '#FF8CCB', lw: 4 });
    poly([[40, 56], [58, 40], [40, 40]], { fill: '#E0609F', lw: 3 });
    rectW(-58, -52, 116, 16, rgba(PINKDK, 0.35));
    letter('나쁜 녀석', 0, -12, 26, BLK, { font: 'round', lw: 0, shadow: null });
    letter('다녀감', 0, 20, 26, BLK, { font: 'round', lw: 0, shadow: null });
    // a scribbled lollipop signature
    circle(38, 38, 7, { fill: null, stroke: BLK, lw: 2.5 });
    stroke([[38, 45], [38, 54]], BLK, 2.5, { ink: null });
    ctx.restore();
  }

  function crayonStick(x, y, len, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    rrect(-8, -13, len - 24, 26, 6, { fill: color, lw: 4.5 });
    rrect(len * 0.2, -13, len * 0.35, 26, 2, { fill: '#FFFFFF', lw: 3.5 });
    poly([[len - 26, -12], [len, 0], [len - 26, 12]], { fill: color, lw: 4.5 });
    ctx.restore();
  }

  /** The toy box: (x, y) bottom centre. lid = open angle (rad). peek (0..1): shades glinting in the gap. */
  function toyBox(x, y, s, t, lid = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const w = 320, h = 210;
    ell(0, 4, 190, 22, { fill: 'rgba(0,0,0,0.25)', stroke: null });
    rrect(-w / 2, -h, w, h, 14, { fill: '#1B1524', lw: 6 });
    rrect(-w / 2 + 14, -h + 16, w - 28, h - 32, 10, { fill: null, stroke: LIME, lw: 5 });
    for (let i = 0; i < 5; i++) poly(starShape(-110 + i * 55, -h + 50 + (i % 2) * 110, 16, 0.45), { fill: i % 2 ? PINK : LIME, stroke: null });
    letter('장난감', 0, -h / 2 + 4, 52, PINK, { font: 'bold', lw: 7, color2: BLK, shadow: null });
    // the lid, hinged at the back left corner; the dark wedge under it, and whatever is in there
    const hx = -w / 2 - 6, hy = -h, L = w + 12;
    const ex = hx + Math.cos(lid) * L, ey = hy - Math.sin(lid) * L;
    if (lid > 0.001) {
      poly([[hx + 8, hy], [w / 2 - 4, hy], [ex, ey]], { fill: '#05030A', stroke: null });
      if (o.peek > 0) {
        const gx = w / 2 - 70, gy = hy - Math.sin(lid) * (gx - hx) * 0.55;
        for (const sx of [-20, 20]) rrect(gx + sx - 16, gy - 7, 32, 14, 6, { fill: '#000000', stroke: PINK, lw: 3, alpha: o.peek });
        glow(gx, gy, 70, LIME, 0.9 * o.peek);
        sparkle(gx + 22, gy - 4, 20 * o.peek, '#FFFFFF', 0.3);
      }
    }
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-lid);
    rrect(0, -26, L, 30, 10, { fill: '#2A2138', lw: 6 });
    stroke([[16, -12], [L - 16, -12]], PINK, 5, { ink: null });
    ctx.restore();
    ctx.restore();
  }

  /** The prank room: bright pink wall, lime trim, a dark floor. Draw inside a camera. */
  function room(t, o = {}) {
    rectW(-600, -400, 4800, 1400, lgrad(0, -400, 0, 800, [[0, '#FF74BE'], [1, '#FFA8D6']]));
    // wallpaper: soft vertical stripes and little lime hearts
    for (let i = -12; i < 36; i++) rectW(i * 120, -400, 50, 1180, 'rgba(255,255,255,0.13)');
    for (let i = -6; i < 18; i++) {
      for (let j = 0; j < 5; j++) {
        const hx = i * 240 + (j % 2) * 120, hy = -300 + j * 170;
        poly(heartPts(hx, hy, 12), { fill: rgba(LIME, 0.55), stroke: null });
      }
    }
    // wainscot and skirting
    rectW(-600, 700, 4800, 80, LIME);
    stroke([[-600, 700], [4200, 700]], BLK, 6, { ink: null });
    rectW(-600, 780, 4800, 20, BLK);
    // floor: dark with lime planks
    rectW(-600, 800, 4800, 700, lgrad(0, 800, 0, 1200, [[0, '#35224A'], [1, '#1E1330']]));
    for (let i = 0; i < 6; i++) stroke([[-600, 830 + i * i * 14], [4200, 830 + i * i * 14]], rgba(LIME, 0.22), 4, { ink: null });
    if (o.noWallArt !== true && o.potato) potatoDoodle(o.potato[0], o.potato[1], 1, 1, 6, 6);
  }

  /**
   * The crayon portrait of 부장님 as a potato, drawn on the wall.
   * k: how much of the outline is drawn (0..1); nChars: how many letters of "감자 부장님" are up.
   */
  function potatoDoodle(x, y, s, k, nChars, age = 9) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU - Math.PI / 2;
      const r = 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5);
      pts.push([Math.cos(a) * 150 * r, Math.sin(a) * 118 * r]);
    }
    const n = Math.floor(k * 40);
    if (n > 1) {
      ctx.save(); ctx.globalAlpha *= 0.9;
      if (k >= 1) { polyPath(pts); ctx.fillStyle = rgba('#E5B26A', 0.55); ctx.fill(); }
      stroke(pts.slice(0, n + 1), '#8A4B22', 12, { ink: null });
      ctx.restore();
    }
    if (k >= 1) {
      // potato spots, dot eyes, a big mustache, a bald shine
      for (const [px, py] of [[-90, -40], [100, 50], [-60, 70]]) circle(px, py, 8, { fill: '#8A4B22', stroke: null, alpha: 0.7 });
      circle(-42, -20, 11, { fill: BLK, stroke: null }); circle(42, -20, 11, { fill: BLK, stroke: null });
      stroke([[-70, 30], [-30, 18], [0, 30], [30, 18], [70, 30]], BLK, 14, { ink: null, smooth: true });
      stroke([[-60, -80], [-20, -96]], '#FFFFFF', 12, { ink: null, alpha: 0.8 });
    }
    const chars = ['감', '자', '부', '장', '님'];
    const xs = [-170, -80, 40, 130, 220];
    for (let i = 0; i < chars.length; i++) {
      if (i >= nChars) break;
      const pop = i === Math.floor(nChars) - 1 ? clamp(age * 5) : 1;
      letter(chars[i], xs[i], 205 + (i % 2) * 10, 96, i < 2 ? PINK : '#7C2BE0', { font: 'round', lw: 0, shadow: null, rot: (hash(i, 3) - 0.5) * 0.3, pop });
    }
    ctx.restore();
  }

  /** Small comic "flinch" marks around a head at (x, y). */
  function flinchMarks(x, y, k, r = 120) {
    if (k < 0.05) return;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.55;
      const r0 = r + (1 - k) * 20, r1 = r0 + 40 * k;
      stroke([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], LIME, 8, { olw: 6, alpha: k });
    }
  }
  /** A tiny "딱" in a corner on each snap so the beat reads even when he is off camera. */
  function snapTick(t, x, y) {
    const k = snapK(t, 10);
    if (k < 0.05) return;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    letter('딱', x, y - k * 8, 44 + k * 10, LIME, { font: 'bold', lw: 7, color2: BLK, alpha: k, rot: -0.15 });
    ctx.restore();
  }
  /** Boss pose on a snap: a jolt up, eyes wide. */
  function flinchPose(t) {
    const k = snapK(t);
    return { k, dy: k * 26, sq: -k * 0.05 };
  }

  // ---- 60.44 crayon on the wall: "감자 부장님" -------------------------------------------------------

  function crayon(t) {
    const lb = lbeat(t, S.crayon);
    const drop = hitK(t, S.crayon, 0.5);
    fillScreen('#FF8ACB');
    camDrift(t, 930 + lb * 6, 560, 1.12 + lb * 0.008);
    const P = [720, 360];
    // the outline was already started; the potato gets finished on beats 0-1, letters on 2..6
    const outlineK = clamp(0.55 + lb / 2 * 0.45);
    const nChars = lb >= 2 ? clamp(Math.floor(lb - 2 + 1e-6) + 1, 0, 5) : 0;
    room(t);
    potatoDoodle(P[0], P[1], 1, outlineK, nChars, frac(lb));
    // where the crayon tip is
    const xs = [-170, -80, 40, 130, 220];
    let tip;
    if (lb < 2) {
      const a = -Math.PI / 2 + (0.55 + lb / 2 * 0.45) * TAU;
      tip = [P[0] + Math.cos(a) * 150, P[1] + Math.sin(a) * 118];
    } else {
      const i = clamp(Math.floor(lb - 2), 0, 4), f = frac(lb);
      const wig = f < 0.5 ? Math.sin(f * 2 * Math.PI * 2) * 18 : 0;
      tip = [P[0] + xs[i] + wig, P[1] + 200 + Math.cos(f * TAU * 2) * 16];
      if (lb >= 6.4) { const k = bseg(lb, 6.4, 7.2, easeInOut); tip = [lerp(tip[0], P[0] - 200, k), lerp(tip[1], P[1] + 330, k)]; }
    }
    // the little one stands on a stack of toy blocks, holding a giant crayon
    const blocks = [[0, 0, LIME], [70, 0, PINK], [35, -70, '#7C2BE0']];
    const kx = clamp(tip[0] - 260, 340, 900), ky = GROUND - 70 * 2;
    for (const [i, [bx, by, c]] of [[kx - 95, GROUND, LIME], [kx - 15, GROUND, PINK], [kx - 55, GROUND - 70, '#8A4CF0']].entries()) {
      rrect(bx - 5, by - 70, 80, 70, 10, { fill: c, lw: 5 });
      letter(['A', 'B', 'C'][i], bx + 35, by - 35, 40, '#FFFFFF', { lw: 5, shadow: null });
    }
    void blocks;
    const hop = bgHop(t);
    const ks = 1.25, kdy = hop * 10;
    const hand = [tip[0] - 150, tip[1] + 110];
    const arms = armsTo(kx, ky, ks, 'child', [kx - 60, ky - 150 + hop * 6], hand, { dy: kdy });
    const done = lb >= 7;
    kid(kx, ky, ks, t, {
      ...arms, dy: kdy, turn: 0.45, lookX: 1, lookY: -0.6, sq: bgPulse(t) * 0.04,
      holdR: (hx, hy) => {
        // point the crayon at the tip (body space: convert tip from world)
        const Sc = ks * ROLE.child.h;
        const tx = (tip[0] - kx) / Sc, ty = (tip[1] - ky) / Sc + kdy;
        const ang = Math.atan2(ty - hy, tx - hx);
        crayonStick(hx - Math.cos(ang) * 30, hy - Math.sin(ang) * 30, Math.hypot(tx - hx, ty - hy) + 30, ang, lb < 2 ? '#8A4B22' : lb < 4 || done ? PINK : '#7C2BE0');
      },
    });
    // 부장님, back to it all, reading the paper at the right, flinching on every snap
    const f = flinchPose(t);
    const bx = 1500, by = GROUND + 40;
    const paper = [bx + 30, by - 330 * 1.15 - f.dy * 1.15];
    boss(bx, by, 1.15, t, {
      dy: f.dy, sq: f.sq, flip: true, turn: -0.2, eyes: f.k > 0.35 ? 'wide' : 'open', lookX: -0.3 + f.k * 0.8, lookY: 0.6 - f.k, mouth: f.k > 0.35 ? 'o' : 'flat',
      ...armsTo(bx, by, 1.15, 'boss', [paper[0] + 110, paper[1] + 10], [paper[0] - 110, paper[1] + 10], { flip: true, dy: f.dy }),
    });
    newspaper(paper[0], paper[1] + 20, f.k);
    flinchMarks(bx, by - 460 * 1.15 + 40 - f.dy, f.k, 140);
    camEnd();
    snapTick(t, 1800, 120);
    flash(drop * 0.8, LIME);
  }
  function newspaper(x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.05 + k * 0.1);
    rrect(-130, -120, 260, 200, 6, { fill: '#F4F1EA', lw: 5 });
    rectW(-110, -100, 220, 30, '#2A2438');
    letter('NEWS', 0, -85, 28, '#FFFFFF', { lw: 0, shadow: null });
    for (let i = 0; i < 6; i++) stroke([[-110, -50 + i * 20], [i % 3 === 2 ? 20 : 110, -50 + i * 20]], '#AAA6B4', 7, { ink: null });
    ctx.restore();
  }

  // ---- 64.00 the whole cake, crumbs only ------------------------------------------------------------

  function cakeShot(t) {
    const lb = lbeat(t, S.cake);
    fillScreen('#FF8ACB');
    camDrift(t, 960, 520, 1.1 - lb * 0.004);
    room(t, { potato: [360, 330] });
    // a table
    const tx = 960, ty = 740;
    // the little one behind it, stuffing it in
    const bite = Math.floor(clamp(lb, 0, 5));           // 5 bites on beats 0-4
    const chew = lb < 5 ? bgPulse(t, 6) : 0;
    const fullK = lb < 5 ? clamp(0.4 + bite * 0.15) : clamp(1 - (lb - 5) * 0.4);
    const kx = 800, ky = ty + 70, ks = 1.75;
    kid(kx, ky, ks, t, {
      lolly: false, cheeks: fullK * (0.8 + chew * 0.3), mouth: lb < 5 ? 'cat' : 'flat', sq: chew * 0.05, dy: chew * 10,
      ...armsTo(kx, ky, ks, 'child', [kx - 40, ty - 40 + chew * 20], [tx - 60 + 320 * clamp(1 - lb / 5) - 20, ty - 120 - chew * 60], { dy: chew * 10 }),
      shadow: false,
    });
    rrect(tx - 420, ty, 840, 40, 12, { fill: LIME, lw: 6 });
    rectW(tx - 390, ty + 40, 780, 220, rgba(BLK, 0.85));
    rrect(tx - 380, ty + 40, 30, 200, 6, { fill: '#2A2138', lw: 5 });
    rrect(tx + 350, ty + 40, 30, 200, 6, { fill: '#2A2138', lw: 5 });
    // the cake plate
    ell(tx + 60, ty - 8, 200, 28, { fill: '#FFFFFF', lw: 5 });
    const left = clamp(1 - lb / 5);                      // 1 → 0 over five beats
    if (left > 0.01) cake(tx + 60, ty - 14, left, bite);
    // crumbs, more and more
    const nCr = Math.floor(clamp(lb / 5) * 26);
    for (let i = 0; i < nCr; i++) circle(tx + 60 + hrange(-170, 170, i, 1), ty - 14 + hrange(-10, 12, i, 2), hrange(3, 7, i, 3), { fill: i % 3 ? '#F7C6DD' : '#8A5530', stroke: null });
    // 냠 on each bite
    for (let i = 0; i < 5; i++) sfx('냠', kx + 260 + (i % 2) * 120, ty - 420 - (i % 3) * 30, 100, LIME, t - (S.cake + i * B), { life: 0.5, color2: BLK, rot: (i % 2 ? 0.2 : -0.2) });
    // 부장님 comes in on bar 2 with a fork and a napkin tucked in
    const inK = bseg(lb, 3.6, 5, easeOut);
    if (inK > 0) {
      const bx = lerp(2300, 1440, inK), by = GROUND + 30;
      const shock = lb >= 5.5, droop = lb >= 7;
      const f = flinchPose(t);
      boss(bx, by, 1.15, t, {
        walk: inK < 1 ? lb * 0.5 : undefined, dy: f.dy + (shock && !droop ? 30 * hitK(t, S.cake + 5.5 * B, 0.3) : 0), sq: f.sq + (droop ? 0.05 : 0),
        eyes: droop ? 'sad' : shock ? 'wide' : 'happy', mouth: droop ? 'wavy' : shock ? 'open' : 'grin', lookX: -1, turn: -0.3,
        aL: shock ? 1.9 : 0.8, eL: shock ? 0.2 : 1.4, aR: 0.7, eR: 1.6, headRot: droop ? 0.1 : 0,
        emote: shock && !droop ? '!' : droop ? 'sweat' : null, emoteK: shock ? clamp((lb - 5.5) * 3) : 1,
        holdL: (hx, hy) => { stroke([[hx, hy], [hx - 10, hy - 90]], '#DDE3EE', 9, { olw: 6 }); for (let i = -1; i <= 1; i++) stroke([[hx - 10 + i * 8, hy - 90], [hx - 12 + i * 8, hy - 120]], '#DDE3EE', 5, { olw: 5 }); },
      });
      // napkin
      inHeadNapkin(bx, by, 1.15, f.dy);
    }
    camEnd();
    snapTick(t, 1800, 120);
  }
  function inHeadNapkin(bx, by, s, dy) {
    const S2 = s * ROLE.boss.h, y = by - (290 + dy) * S2;
    poly([[bx - 40 * S2, y], [bx + 40 * S2, y], [bx, y + 90 * S2]], { fill: '#FFFFFF', lw: 4 });
  }
  function cake(x, y, left, bite) {
    ctx.save();
    // clip away the eaten part: the right side goes first, in bites
    const L = x - 160, R = L + 320 * left;
    ctx.beginPath(); ctx.moveTo(L - 10, y + 20); ctx.lineTo(L - 10, y - 320);
    ctx.lineTo(R, y - 320);
    for (let i = 0; i < 4; i++) { const yy = y - 300 + i * 80; ctx.quadraticCurveTo(R - 44, yy + 40, R, yy + 80); }
    ctx.lineTo(L - 10, y + 20); ctx.closePath(); ctx.clip();
    rrect(x - 160, y - 120, 320, 120, 18, { fill: '#FFE3F0', lw: 6 });
    rrect(x - 120, y - 210, 240, 96, 16, { fill: PINK, lw: 6 });
    for (let i = 0; i < 6; i++) smooth([[x - 150 + i * 56, y - 124], [x - 122 + i * 56, y - 124], [x - 130 + i * 56, y - 88], [x - 142 + i * 56, y - 88]], { fill: LIME, lw: 3.5 });
    for (let i = 0; i < 5; i++) circle(x - 90 + i * 45, y - 214, 14, { fill: '#FFFFFF', lw: 4 });
    rrect(x - 8, y - 300, 16, 80, 5, { fill: LIME, lw: 4 });
    smooth([[x, y - 340], [x + 12, y - 312], [x, y - 300], [x - 12, y - 312]], { fill: '#FFB43D', lw: 3.5 });
    ctx.restore();
    void bite;
  }

  // ---- 67.56 salt in the coffee, 퉤! ---------------------------------------------------------------

  function saltShot(t) {
    const lb = lbeat(t, S.salt);
    fillScreen('#FF8ACB');
    camDrift(t, 960, 540, 1.08);
    room(t, { potato: [280, 280] });
    // the desk
    const dx = 1000, dy = 720;
    // 부장님 sits at the left side of it
    const f = flinchPose(t);
    const bx = 760, by = GROUND - 20;
    const sip = bseg(lb, 4, 5), spit = lb >= 6;
    const mug0 = [dx + 150, dy - 50];
    const mouthW = [bx + 20, by - 360 * 1.15 * 1.02 + 60 - f.dy];
    const mugPos = lb < 4 ? mug0 : [lerp(mug0[0], mouthW[0] + 70, sip * (spit ? 1 - bseg(lb, 6, 6.6) : 1)), lerp(mug0[1], mouthW[1] + 20, sip * (spit ? 1 - bseg(lb, 6, 6.6) : 1))];
    const arms = lb < 3.8 ? { aL: 0.3, eL: 0.6, aR: 1.0, eR: 1.4 } : armsTo(bx, by, 1.15, 'boss', null, [mugPos[0] - 30, mugPos[1] + 20], { dy: f.dy });
    const spitK = hitK(t, S.salt + 6 * B, 0.6);
    boss(bx, by, 1.15, t, {
      ...arms, dy: f.dy + (spit ? spitK * 20 : 0), sq: f.sq,
      eyes: spit ? 'x' : lb >= 5 ? 'closed' : lb < 4 ? 'happy' : 'open', mouth: spit ? 'open' : lb >= 5 ? 'o' : 'smile',
      turn: 0.35, lookX: 1, red: spit ? 0.3 : 0, emote: lb < 4 ? 'music' : null, emoteK: 1, headRot: spit ? -0.12 : 0,
    });
    // desk top (over his legs)
    rrect(dx - 380, dy, 760, 36, 10, { fill: LIME, lw: 6 });
    rrect(dx - 360, dy + 36, 720, 240, 8, { fill: '#2A2138', lw: 6 });
    rrect(dx - 300, dy + 70, 220, 70, 8, { fill: '#3A2E50', lw: 4 });
    circle(dx - 190, dy + 105, 8, { fill: LIME, lw: 3 });
    // papers
    rrect(dx - 280, dy - 20, 200, 20, 4, { fill: '#FFFFFF', lw: 4 });
    // the little one pops up from behind the desk on the right with a giant salt shaker
    const up = bseg(lb, 0, 0.5, easeOut) * (1 - bseg(lb, 3.5, 4, easeIn));
    if (up > 0.01) {
      const kx = dx + 300, ky = dy + 260 - up * 150;
      const shake = lb < 3.5 ? Math.sin(bgBeat(t) * TAU) : 0;
      const sh = [mug0[0] + 30 + shake * 10, mug0[1] - 150 + Math.abs(shake) * 16];
      ctx.save();
      ctx.beginPath(); ctx.rect(dx - 400, -400, 2000, dy + 400); ctx.clip();
      kid(kx, ky, 1.25, t, {
        ...armsTo(kx, ky, 1.25, 'child', [sh[0] + 40, sh[1] + 30], [sh[0] + 90, sh[1] - 20]), turn: -0.5, lookX: -1, lookY: 0.5, lolly: 'mouth', shadow: false,
      });
      ctx.restore();
      saltShaker(sh[0], sh[1], 1, 2.6 + shake * 0.2);
      // salt grains falling into the mug on each shake
      for (let i = 0; i < 16; i++) {
        const ph = frac(bgBeat(t) * 2 + hash(i, 1));
        if (lb > 3.4) continue;
        circle(mug0[0] + hrange(-20, 20, i, 2), sh[1] + 40 + ph * 110, 4, { fill: '#FFFFFF', lw: 2 });
      }
      if (lb < 3.5) sfx('솔솔', sh[0] + 190, sh[1] - 60, 70, '#FFFFFF', frac(bgBeat(t)) * B, { life: B, color2: BLK });
    }
    // the mug
    if (lb < 4 || mugPos[0] === mug0[0]) mug(mug0[0], mug0[1], 1, 0, t);
    else mug(mugPos[0], mugPos[1], 1, -sip * 0.9, t);
    // 퉤!
    if (spit) {
      const age = t - (S.salt + 6 * B);
      for (let i = 0; i < 22; i++) {
        const a = -0.5 + hash(i, 4) * 0.9, sp = 500 + hash(i, 5) * 700;
        const px = mouthW[0] + 60 + Math.cos(a) * sp * age, py = mouthW[1] + Math.sin(a) * sp * age + 900 * age * age;
        circle(px, py, 8 + hash(i, 6) * 10, { fill: '#8A5530', lw: 3, alpha: clamp(1.4 - age) });
      }
      sfx('퉤!', mouthW[0] + 320, mouthW[1] - 120, 170, PINK, age, { life: 1.3, color2: BLK, rot: 0.1 });
    }
    camEnd();
    snapTick(t, 1800, 120);
  }
  function saltShaker(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-46, -70, 92, 150, 22, { fill: '#FFFFFF', lw: 6 });
    rrect(-46, -100, 92, 44, 16, { fill: '#C9CED8', lw: 6 });
    for (let i = -1; i <= 1; i++) circle(i * 20, -90, 5, { fill: BLK, stroke: null });
    ctx.save(); ctx.rotate(-Math.PI / 2 * 0 + Math.PI); letter('소금', 0, -10, 40, PINK, { font: 'bold', lw: 5, color2: BLK, shadow: null, rot: 0 }); ctx.restore();
    ctx.restore();
  }
  function mug(x, y, s, rot, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    stroke([[40, -40], [70, -38], [72, -8], [40, -6]], '#FFFFFF', 12, { olw: 10, smooth: true });
    rrect(-46, -70, 92, 100, 16, { fill: '#FFFFFF', lw: 6 });
    ell(0, -68, 44, 10, { fill: '#6B3F22', lw: 4 });
    letter('부장', 0, -18, 30, PINK, { font: 'bold', lw: 0, shadow: null });
    if (rot > -0.1) for (let i = 0; i < 2; i++) {
      const k = frac(t * 0.8 + i * 0.5);
      stroke([[-10 + i * 20, -90 - k * 60], [-2 + i * 20, -110 - k * 60], [-10 + i * 20, -130 - k * 60]], '#FFFFFF', 6, { ink: null, smooth: true, alpha: Math.sin(k * Math.PI) * 0.8 });
    }
    ctx.restore();
  }

  // ---- 71.11 a post-it on his back -----------------------------------------------------------------

  function noteShot(t) {
    const lb = lbeat(t, S.note);
    fillScreen('#FF8ACB');
    const push = bseg(lb, 4, 5.5, easeInOut);
    const bx = 1120, by = GROUND + 40, bs = 1.3;
    const noteW = [bx - 6 * bs * 1.02, by - 222 * bs * 1.02];
    camDrift(t, lerp(960, noteW[0] + 40, push), lerp(540, noteW[1] - 40, push), lerp(1.02, 2.4, push), 0, 1 - push);
    room(t, { potato: [360, 300] });
    // the little one tiptoes in on beats 0-2, jumps and slaps it on at beat 3, tiptoes off
    const inK = bseg(lb, 0, 2.6, t => t);
    const outK = bseg(lb, 3.5, 5.5, t => t);
    const jump = Math.sin(clamp((lb - 2.6) / 0.8) * Math.PI);
    const kx = lb < 3.4 ? lerp(-100, bx - 150, inK) : lerp(bx - 150, -200, outK);
    const ky = GROUND + 20;
    const slap = t >= S.note + 3 * B;
    // 부장님 flexes in the mirror (we see his back); flinches on the snaps and looks round
    const f = flinchPose(t);
    const lookK = lb >= 3 && lb < 5 ? Math.sin(clamp((lb - 3) / 2) * Math.PI) : 0;
    const flexA = 1.45 + bgHop(t) * 0.12;
    bossBack(bx, by, bs, t, {
      dy: f.dy, sq: f.sq, aL: flexA, eL: 1.65, aR: flexA, eR: 1.65, look: lookK * -0.9 * (lb < 4 ? 1 : 1), note: slap ? clamp((t - (S.note + 3 * B)) / 0.15) : 0,
    });
    flinchMarks(bx, by - 470 * bs * 1.02 - f.dy, f.k, 150);
    if (lb < 6) {
      const tiptoe = lb < 2.6 || lb > 3.5;
      kid(kx, ky, 1.2, t, {
        walk: tiptoe ? bgBeat(t) * 0.5 : undefined, dy: jump * 150, flip: lb > 3.4, lolly: 'mouth', turn: lb > 3.4 ? 0.5 : 0.5,
        ...(lb >= 2.6 && lb < 3.5 ? armsTo(kx, ky, 1.2, 'child', null, [noteW[0] - 40, noteW[1]], { dy: jump * 150 }) : { aL: 2.4, eL: 1.8, aR: 0.4 }),
        headRot: tiptoe ? -0.08 : 0, sq: tiptoe ? -0.02 : 0,
        holdR: !slap && lb >= 1 ? (hx, hy) => postIt(hx + 10, hy - 30, 0.55, 0.3, 1) : null,
      });
      if (tiptoe) for (let i = 0; i < 2; i++) sfx('살금', kx + (i ? 80 : -60), ky - 420 - i * 30, 40, '#FFFFFF', frac(bgBeat(t)) * B, { life: B, color2: BLK });
    }
    if (slap) sfx('착!', noteW[0] - 160, noteW[1] - 80, 100, LIME, t - (S.note + 3 * B), { life: 0.7, color2: BLK, rot: -0.2 });
    camEnd();
    snapTick(t, 1800, 120);
  }

  // ---- 74.67 the whoopee cushion -------------------------------------------------------------------

  function cushionShot(t) {
    const lb = lbeat(t, S.cushion);
    const boom = S.cushion + 4 * B;
    const bk = hitK(t, boom, 0.5);
    fillScreen('#FF8ACB');
    const [sx, sy] = shakeXY(t, boom, 16, 0.4);
    camDrift(t, 960 + sx, 540 + sy, 1.06 + bk * 0.05);
    room(t, { potato: [300, 320] });
    const cx = 1000, seatY = 720;
    // the chair back
    rrect(cx - 170, seatY - 330, 340, 340, 60, { fill: PINK, lw: 6 });
    rrect(cx - 130, seatY - 290, 260, 250, 40, { fill: '#FF6DBB', stroke: null });
    // the little one sets the cushion down (beats 0-1), then ducks behind the chair back
    const toss = bseg(lb, 1, 1.8, t => t);
    const hide = bseg(lb, 1.9, 3.2, easeInOut);
    const peek = lb >= 4.8 ? bseg(lb, 4.8, 5.4, easeOut) : 0;
    const k0x = cx - 360;
    const kx = hide <= 0 ? k0x : lerp(k0x, cx + 60, hide) + (hide >= 1 ? peek * 150 : 0), ky = GROUND - 20;
    const behind = hide > 0.5;
    const hold = [k0x + 20, ky - 150 + bgHop(t) * 6];
    const cushionAt = toss <= 0 ? hold : [lerp(hold[0], cx, toss), lerp(hold[1], seatY - 10, toss) - Math.sin(toss * Math.PI) * 260];
    const place = toss;
    const drawKid = () => kid(kx, ky, 1.2, t, {
      flip: hide > 0 && hide < 1, lolly: 'mouth', turn: behind ? -0.3 : 0.4, lookX: behind ? -1 : 1, lookY: behind ? 0.3 : -0.2,
      ...(toss <= 0 ? armsTo(kx, ky, 1.2, 'child', [hold[0] - 40, hold[1]], [hold[0] + 40, hold[1]]) : lb < 2 ? { aL: 2.6, aR: 2.6, eL: 0.2, eR: 0.2 } : { aL: 0.4, aR: 0.4 }),
      walk: hide > 0 && hide < 1 ? lb : undefined, shadow: !behind,
      dy: toss > 0 && toss < 0.3 ? 30 : 0,
      glint: peek * (0.4 + 0.6 * snapK(t)),
    });
    void place;
    if (behind) {
      drawKid();
      rrect(cx - 170, seatY - 330, 340, 340, 60, { fill: PINK, lw: 6 });
      rrect(cx - 130, seatY - 290, 260, 250, 40, { fill: '#FF6DBB', stroke: null });
    }
    // the seat, legs
    if (!behind) drawKid();
    rrect(cx - 200, seatY, 400, 70, 26, { fill: PINK, lw: 6 });
    for (const lx of [-160, 140]) rrect(cx + lx, seatY + 60, 24, 170, 8, { fill: BLK, lw: 4 });
    // the cushion: flat after the boom
    const flat = t >= boom ? 1 : 0;
    const landSq = toss >= 1 ? hitK(t, S.cushion + 1.8 * B, 0.3) : 0;
    // 부장님 walks in from the right, turns, and sits on beat 4
    const walkIn = bseg(lb, 2.2, 3.4, easeOut), sit = bseg(lb, 3.4, 4, easeIn);
    const bx = lerp(2300, cx + 40, walkIn), by = lerp(GROUND + 40, seatY + 60, sit);
    const f = flinchPose(t);
    const jolt = bk * 60;
    if (!flat) cushion(cushionAt[0], cushionAt[1] - 10, 1, landSq * 0.5, t, toss > 0 && toss < 1 ? toss * 6 : 0);
    if (walkIn > 0) {
      boss(bx, by, 1.15, t, {
        walk: walkIn < 1 ? lb * 0.5 : undefined, sit: sit > 0.5, dy: f.dy + jolt, sq: f.sq - bk * 0.08,
        eyes: t >= boom ? (lb < 5.2 ? 'wide' : 'closed') : 'happy', mouth: t >= boom ? (lb < 5.2 ? 'o' : 'wavy') : 'smile',
        blush: t >= boom ? 1 : 0.25, red: t >= boom ? clamp((lb - 4) * 0.4) * 0.5 : 0, lookX: t >= boom ? Math.sin(lb * 3) : 0,
        aL: 0.5, aR: 0.5, emote: t >= boom && lb > 5 ? 'sweat' : null, emoteK: 1,
      });
    }
    if (flat) {
      cushion(cx, seatY - 4, 1, 1, t);
      const age = t - boom;
      for (let i = 0; i < 7; i++) {
        const k = clamp(age / 1.4 - i * 0.04);
        const px = cx - 220 - k * (200 + i * 60) + Math.sin(i * 2 + age * 4) * 20, py = seatY + 30 - k * (60 + i * 40);
        smooth(blobPts(px, py, 50 + k * 90, 8, 0.25, i, t), { fill: rgba(LIME, 0.9 * (1 - k * k)), stroke: rgba(LIMEDK, 0.9 * (1 - k * k)), lw: 5 });
      }
      sfx('뿌웅~!', cx + 470, seatY - 360, 190, LIME, age, { life: 1.8, color2: BLK, rot: -0.12 });
    }
    camEnd();
    snapTick(t, 1800, 120);
  }
  function cushion(x, y, s, flat, t, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const h = lerp(46, 12, flat);
    smooth([[-110, 0], [-90, -h], [0, -h * 1.2], [90, -h], [110, 0], [90, h * 0.3], [0, h * 0.4], [-90, h * 0.3]], { fill: '#FF5FAE', lw: 5 });
    rrect(-150 - flat * 40, -14, 50, 28, 10, { fill: '#FF5FAE', lw: 5 });
    letter('뿡', 0, -h * 0.4, 40 - flat * 10, '#FFFFFF', { font: 'bold', lw: 5, shadow: null, color2: PINKDK });
    ctx.restore();
    void t;
  }

  // ---- 78.22 a balloon popped behind him -----------------------------------------------------------

  function balloonShot(t) {
    const lb = lbeat(t, S.balloon);
    const pop = S.balloon + 4 * B;
    const pk = hitK(t, pop, 0.4);
    fillScreen('#FF8ACB');
    const [sx, sy] = shakeXY(t, pop, 26, 0.45);
    camDrift(t, 960 + sx, 520 + sy - pk * 20, 1.04 + pk * 0.08);
    room(t, { potato: [300, 320] });
    // the little one behind-left of him, blowing up a pink balloon, bigger every beat
    const kx = 640, ky = GROUND - 10;
    const grow = t < pop ? clamp(0.25 + Math.floor(lb + 1e-6) * 0.2 + frac(lb) * 0.2 * easeOut(clamp(frac(lb) * 3))) : 0;
    const kidS = 1.2;
    const mouthW = [kx + 16 * kidS * 0.58 * 1.12, ky - 283 * kidS * 0.58];
    kid(kx, ky, kidS, t, {
      lolly: t < pop ? false : 'hand', turn: 0.4, lookX: 1,
      cheeks: t < pop ? 0.5 + bgPulse(t, 5) * 0.5 : 0,
      ...(t < pop ? armsTo(kx, ky, kidS, 'child', [mouthW[0] + 30, mouthW[1] + 20], [mouthW[0] + 50, mouthW[1] + 30]) : { aL: 0.3, aR: 2.2, eR: 0.8 }),
      holdR: t >= pop && lb < 5 ? (hx, hy) => { stroke([[hx, hy], [hx + 30, hy - 50]], '#C9CED8', 4, { ink: PAL.ink, olw: 4 }); } : null,
    });
    if (t < pop) {
      const r = 40 + grow * 190;
      const bx0 = mouthW[0] + 30 + r * 0.9, by0 = mouthW[1] - r * 0.55;
      smooth([[mouthW[0] + 18, mouthW[1] + 2], [bx0 - r * 0.8, by0 + r * 0.55], [bx0 - r * 0.2, by0 + r * 0.9]], { fill: '#FF5FAE', lw: 4 });
      ell(bx0, by0, r, r * 0.92, { fill: '#FF5FAE', lw: 6 }, -0.4);
      ell(bx0 - r * 0.4, by0 - r * 0.4, r * 0.18, r * 0.1, { fill: 'rgba(255,255,255,0.7)', stroke: null }, -0.8);
      if (lb < 4) sfx('후~', bx0 + r + 20, by0 - r * 0.5, 50, '#FFFFFF', frac(lb) * B, { life: B, color2: BLK });
    }
    // 부장님 in front, flexing with his eyes shut, very pleased with himself
    const bx = 1180, by = GROUND + 50;
    const f = flinchPose(t);
    const air = t >= pop ? Math.max(0, Math.sin(clamp((t - pop) / (2 * B)) * Math.PI)) * 240 : 0;
    const landed = lb >= 6;
    boss(bx, by, 1.2, t, {
      dy: f.dy + air, sq: f.sq - (air > 0 ? 0.08 : 0),
      eyes: t < pop ? 'closed' : landed ? 'spiral' : 'wide', mouth: t < pop ? 'grin' : landed ? 'wavy' : 'open',
      aL: t < pop ? 1.45 + bgHop(t) * 0.1 : 2.9, eL: t < pop ? 1.7 : 0.1, aR: t < pop ? 1.45 + bgHop(t) * 0.1 : 2.9, eR: t < pop ? 1.7 : 0.1,
      blush: 0.4, emote: t < pop ? 'sparkle' : landed ? null : '!', emoteK: 1, looseTie: t >= pop, turn: -0.1,
    });
    if (t >= pop) {
      const age = t - pop;
      const bp = [mouthW[0] + 200, mouthW[1] - 140];
      if (age < 0.25) poly(starShape(bp[0], bp[1], 260 * easeOut(age / 0.25), 0.5, 12), { fill: '#FFFFFF', stroke: PINK, lw: 8, alpha: 1 - age / 0.25 });
      for (let i = 0; i < 16; i++) {
        const a = hash(i, 8) * TAU, d = easeOut(clamp(age / 0.8)) * (200 + hash(i, 9) * 260);
        ctx.save(); ctx.translate(bp[0] + Math.cos(a) * d, bp[1] + Math.sin(a) * d + age * age * 400); ctx.rotate(a + age * 6);
        rrect(-20, -8, 40, 16, 6, { fill: i % 3 ? '#FF5FAE' : LIME, lw: 3, alpha: clamp(1.6 - age) });
        ctx.restore();
      }
      sfx('팡!!', bp[0] + 40, bp[1] - 170, 200, LIME, age, { life: 1.4, color2: BLK, rot: -0.1 });
      if (lb >= 6) for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * TAU / 3;
        poly(starShape(bx + Math.cos(a) * 130, by - 620 + Math.sin(a) * 30, 22, 0.45), { fill: LIME, lw: 3 });
      }
    }
    camEnd();
    flash(pk * 0.5, '#FFFFFF');
    snapTick(t, 1800, 120);
  }

  // ---- 81.78 the wrecked room: he has had enough --------------------------------------------------

  function messShot(t) {
    const lb = lbeat(t, S.mess);
    fillScreen('#FF8ACB');
    camDrift(t, 960, 540 - lb * 4, 1.0 + lb * 0.02);
    room(t);
    potatoDoodle(430, 300, 0.8, 1, 5);
    // the evidence: empty cake plate, a coffee puddle, the flat cushion, balloon rags
    ell(1450, 860, 140, 22, { fill: '#FFFFFF', lw: 5 });
    for (let i = 0; i < 14; i++) circle(1450 + hrange(-110, 110, i, 1), 856 + hrange(-8, 8, i, 2), 5, { fill: i % 3 ? '#F7C6DD' : '#8A5530', stroke: null });
    smooth(blobPts(700, 920, 90, 9, 0.2, 4).map(([x, y]) => [x, 920 + (y - 920) * 0.25]), { fill: '#6B3F22', lw: 4 });
    cushion(1200, 960, 0.9, 1, t);
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(560 + i * 140, 1000 - (i % 2) * 20); ctx.rotate(i); rrect(-20, -8, 40, 16, 6, { fill: '#FF5FAE', lw: 3 }); ctx.restore(); }
    // the toy box in the corner; its lid lifts a crack on beat 2 and drops
    const crack = Math.sin(clamp((lb - 2) / 1.5) * Math.PI) * 0.18;
    toyBox(1600, GROUND + 10, 0.9, t, crack, { peek: crack > 0.05 ? 1 : 0 });
    // 부장님 in the middle, going red, steam on every snap
    const f = flinchPose(t);
    const red = bseg(lb, 0, 6);
    const puff = 1 + red * 0.08 + bgPulse(t) * 0.02;
    const bx = 960, by = GROUND + 60;
    const bulb = lb >= 6;
    ctx.save(); ctx.translate(bx, by); ctx.scale(puff, puff); ctx.translate(-bx, -by);
    boss(bx, by, 1.25, t, {
      dy: f.dy * 0.6, sq: f.sq, eyes: bulb ? 'determined' : lb < 1 ? 'wide' : 'determined', brows: 'angry', mouth: bulb ? 'grin' : lb < 1 ? 'o' : 'wavy',
      red: bulb ? red * (1 - bseg(lb, 6, 6.6)) : red, steam: bulb ? 0 : clamp(red * 1.5), steamPh: bgBeat(t) * 0.5,
      aL: bulb ? 0.4 : 0.9, eL: bulb ? 0.3 : 1.5, aR: bulb ? 2.6 : 0.9, eR: bulb ? -0.2 : 1.5,
      emote: bulb ? 'bulb' : lb > 1 ? 'anger' : '!', emoteK: 1 + bgPulse(t) * 0.2,
      holdR: bulb ? (hx, hy) => magnifier(hx, hy, 1.0, -0.4, 0) : null,
    });
    ctx.restore();
    if (bulb) sfx('반짝', bx + 300, by - 700, 70, LIME, t - (S.mess + 6 * B), { life: 0.9, color2: BLK });
    camEnd();
    snapTick(t, 1800, 120);
  }
  /** A big magnifying glass: (x, y) the end of the handle. inner(x, y, r) paints what the lens shows. */
  function magnifier(x, y, s, rot, glintK = 0, inner) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-12, -110, 24, 110, 10, { fill: '#8A5530', lw: 5 });
    const cy = -200;
    if (inner) { ctx.save(); ellPath(0, cy, 92, 92); ctx.clip(); inner(0, cy, 92); ctx.restore(); }
    else circle(0, cy, 92, { fill: 'rgba(200,255,240,0.25)', stroke: null });
    circle(0, cy, 92, { fill: null, stroke: PAL.ink, lw: 22 });
    circle(0, cy, 92, { fill: null, stroke: '#E8C45A', lw: 12 });
    stroke([[-50, cy - 30], [-24, cy - 60]], '#FFFFFF', 10, { ink: null, alpha: 0.7 });
    if (glintK > 0) glow(0, cy, 200, LIME, 0.4 * glintK);
    ctx.restore();
  }

  // ---- 85.33 detective mode: sniffing the floor ----------------------------------------------------

  const dimAt = t => lerp(0.1, 0.7, seg(t, S.sniff, S.end));
  function dim(t, cx, cy, r) {
    const a = dimAt(t);
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = rgrad(cx, cy, r * 0.35, r, [[0, rgba('#12081E', a * 0.25)], [1, rgba('#12081E', Math.min(0.95, a * 1.2))]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function flourPatch(x, y, s) {
    smooth(blobPts(x, y, 260 * s, 11, 0.25, 7).map(([px, py]) => [px, y + (py - y) * 0.3]), { fill: '#F4F1EA', stroke: null, alpha: 0.95 });
    for (let i = 0; i < 20; i++) circle(x + hrange(-360, 360, i, 3) * s, y + hrange(-50, 50, i, 4) * s, hrange(4, 10, i, 5), { fill: '#F4F1EA', stroke: null });
  }
  /** A small shoe print on the floor, toes pointing right. i alternates left/right feet. */
  function footprint(x, y, s, rot, color = '#F4F1EA', a = 1, i = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55); ctx.rotate(Math.PI / 2 + (rot - 1.4) + (i % 2 ? 0.12 : -0.12)); ctx.scale(s * (i % 2 ? -1 : 1), s);
    ctx.globalAlpha *= a;
    smooth([[-10, 22], [-12, 6], [-15, -10], [-12, -24], [0, -30], [12, -24], [14, -8], [8, 8], [9, 22], [0, 30]], { fill: color, stroke: null });
    for (let k = 0; k < 4; k++) circle(-9 + k * 6.5, -36 - (k === 1 || k === 2 ? 2 : 0), 3.6 - k * 0.3, { fill: color, stroke: null });
    ctx.restore();
  }

  function sniffShot(t) {
    const lb = lbeat(t, S.sniff);
    fillScreen('#6A3A6E');
    camDrift(t, 900 + lb * 20, 560, 1.05);
    room(t, { potato: [320, 300] });
    flourPatch(1050, 960, 0.8);
    for (let i = 0; i < 4; i++) footprint(960 + i * 70, 950 + (i % 2) * 24, 1.6, 1.4, '#B9A8CC', 1, i);
    for (let i = 0; i < 8; i++) footprint(1300 + i * 80, 950 + (i % 2) * 24, 1.6, 1.4, '#FFFFFF', 1 - i * 0.06, i);
    // hunched, sweeping the magnifier left, right on the beats
    const bx = 700 + lb * 26, by = GROUND + 60;
    const f = flinchPose(t);
    const sweep = Math.sin(bgBeat(t) * Math.PI);
    const tip = [bx + 300 + sweep * 80, by - 150];
    boss(bx, by, 1.2, t, {
      hat: true, walk: bgBeat(t) * 0.5, dy: f.dy * 0.5, rot: 0.14, headRot: 0.1, sq: f.sq,
      eyes: 'determined', lookX: 1, lookY: 1, mouth: 'flat', turn: 0.5,
      ...armsTo(bx, by, 1.2, 'boss', [bx + 60, by - 330], [tip[0] - 60, tip[1] + 30]),
      holdR: (hx, hy) => magnifier(hx, hy, 0.9, 0.9 + sweep * 0.15, 0),
    });
    for (let i = 0; i < 4; i++) sfx('킁킁', bx + 170, by - 560 - (i % 2) * 20, 50, '#FFFFFF', t - (S.sniff + i * B), { life: B * 0.9, color2: BLK });
    camEnd();
    dim(t, 960, 700, 1100);
    snapTick(t, 1800, 120);
  }

  // ---- 87.11 through the lens: a tiny footprint ---------------------------------------------------

  function lensShot(t) {
    const lb = lbeat(t, S.lens);
    fillScreen('#1E1330');
    camDrift(t, 960, 540, 1.0 + lb * 0.02);
    // floor close up
    rectW(-200, -200, 2400, 1500, lgrad(0, 0, 0, H, [[0, '#35224A'], [1, '#1E1330']]));
    for (let i = 0; i < 6; i++) stroke([[-200, 100 + i * 190], [2200, 60 + i * 190]], rgba(LIME, 0.2), 6, { ink: null });
    flourPatch(960, 560, 2.2);
    const fp = [[520, 680, 0.2], [760, 560, 0.1], [1000, 660, 0.25], [1240, 530, 0.15], [1480, 640, 0.2]];
    for (const [i, [x, y, r]] of fp.entries()) footprint(x, y, 2.6, 1.4 + r, '#A893C0', 1, i);
    // the lens slides over one print, on the beat
    const target = Math.min(4, Math.floor(lb / 2 + 1e-6) + 1);
    const lx = kf(lb, [[0, 300], [1, fp[1][0]], [3, fp[1][0]], [4, fp[2][0]], [6, fp[2][0]], [7, fp[3][0]]], backOut);
    const ly = kf(lb, [[0, 800], [1, fp[1][1]], [3, fp[1][1]], [4, fp[2][1]], [6, fp[2][1]], [7, fp[3][1]]], backOut);
    void target;
    magnifier(lx + 60, ly + 360, 1.9, 0.15, bgPulse(t) * 0.6, (cx, cy, r) => {
      rectW(cx - r, cy - r, r * 2, r * 2, '#F4F1EA');
      footprint(cx - 10, cy + 10, 3.6, 1.4, '#8E7AA8');
      // tiny sneaker tread in the print
      for (let i = 0; i < 4; i++) stroke([[cx - 50 + i * 22, cy - 6], [cx - 50 + i * 22, cy + 26]], '#6E5A88', 5, { ink: null });
    });
    // a giant eye through the lens? no: an '!' and the size of it
    if (lb >= 5) letter('작다…', 1560, 240, 90, LIME, { font: 'round', pop: clamp((lb - 5) * 2), color2: BLK, rot: 0.08 });
    for (let i = 0; i < 3; i++) sfx('!', lx + 180, ly - 120, 110, PINK, t - (S.lens + (1 + i * 3) * B), { life: 0.5, color2: BLK });
    camEnd();
    dim(t, lx, ly, 900);
    snapTick(t, 1800, 120);
  }

  // ---- 88.89 following the trail -------------------------------------------------------------------

  function trailShot(t) {
    const lb = lbeat(t, S.trail);                          // 12 beats
    const pan = lb * 150;
    fillScreen('#4A2A58');
    camBegin(960 + pan, 560, 1.0);
    room(t, { potato: [260, 300] });
    // a line of tiny prints across the floor, each lighting lime as he reaches it
    const bx = 500 + pan * 1.0 + Math.sin(bgBeat(t) * Math.PI) * 10;
    for (let i = 0; i < 40; i++) {
      const px = 300 + i * 75, py = 975 + (i % 2) * 34;
      const lit = px < bx + 360;
      footprint(px, py, 1.7, 1.4, lit ? LIME : '#F4F1EA', lit ? 1 : 0.85, i);
      if (lit && px > bx + 290) glow(px, py, 80, LIME, 0.5);
    }
    // the toy box comes into view at the far right
    toyBox(2860, GROUND + 10, 1.0, t, 0);
    // 부장님, tiptoeing on the beats, bent over the magnifier
    const by = GROUND + 60;
    const f = flinchPose(t);
    const step = bgBeat(t) * 0.5;
    boss(bx, by, 1.15, t, {
      hat: true, walk: step, dy: f.dy * 0.5, rot: 0.2, headRot: 0.12, sq: f.sq, turn: 0.6,
      eyes: f.k > 0.4 ? 'wide' : 'determined', lookX: 1, lookY: 1, mouth: f.k > 0.4 ? 'o' : 'flat',
      ...armsTo(bx, by, 1.15, 'boss', [bx + 30, by - 300], [bx + 250, by - 260]),
      holdR: (hx, hy) => magnifier(hx, hy, 0.8, 1.3, 0),
      emote: f.k > 0.3 ? 'sweat' : null, emoteK: f.k,
    });
    flinchMarks(bx + 40, by - 560 - f.dy, f.k, 140);
    for (let i = 0; i < 12; i++) sfx('살금', bx + (i % 2 ? 120 : -120), by - 640, 44, '#FFFFFF', t - (S.trail + i * B), { life: B * 0.9, color2: BLK });
    camEnd();
    dim(t, 1000, 760, 1200);
    snapTick(t, 1800, 120);
  }

  // ---- 94.22 the toy box: lights down, the lid creaks ----------------------------------------------

  function boxShot(t) {
    const lb = lbeat(t, S.box);                            // 12 beats to the drop
    fillScreen('#1A0E26');
    const push = easeInOut(clamp(lb / 12));
    camDrift(t, 1060 + push * 60, 600 - push * 40, 1.0 + push * 0.35, 0, 0.6);
    room(t);
    // a creak and a hair more open on each beat of bar 2, then shut tight for the last bar
    const creak = lb < 4 ? 0 : lb < 8 ? 0.04 + Math.floor(lb - 4 + 1e-6) * 0.035 + (1 - Math.exp(-frac(lb) * 8)) * 0.02 : lb < 10 ? 0.18 : 0.18 * (1 - bseg(lb, 10, 10.5));
    const peek = lb >= 6 && lb < 10.5 ? clamp((lb - 6) * 2) : 0;
    toyBox(1300, GROUND + 10, 1.25, t, creak, { peek });
    if (lb >= 4 && lb < 8) sfx('삐걱', 1330, 460, 64, LIME, frac(lb) * B, { life: B, color2: BLK, rot: -0.1 });
    // 부장님 creeps closer, sweating, knees knocking
    const bx = lerp(340, 700, bseg(lb, 0, 8)), by = GROUND + 60;
    const f = flinchPose(t);
    const knock = Math.sin(t * 40) * 0.06 * bseg(lb, 6, 8);
    const reachK = bseg(lb, 8, 11);
    const fear = lb >= 6;
    const bs = 1.15, S2 = bs * ROLE.boss.h, rot = 0.1 + reachK * 0.1;
    const dyB = f.dy * 0.6;
    // where his eye is: the lens goes up to it for the last bars
    const eyeB = [14 * 1.05 + 38, -356];
    const eye = [bx + (eyeB[0] * Math.cos(rot) - eyeB[1] * Math.sin(rot)) * S2, by - dyB * S2 + (eyeB[0] * Math.sin(rot) + eyeB[1] * Math.cos(rot)) * S2];
    const lensUp = bseg(lb, 7.5, 8.3, backOut);
    const lens = [lerp(bx - 150, eye[0] + 20, lensUp), lerp(by - 420, eye[1], lensUp)];
    const handle = [lens[0] - 60, lens[1] + 170];
    boss(bx, by, bs, t, {
      hat: true, dy: dyB, rot, sq: f.sq, turn: 0.5, headRot: knock,
      kL: Math.abs(knock) * 4, kR: Math.abs(knock) * 4, lL: 0.05, lR: 0.05,
      eyes: fear ? 'wide' : 'determined', lookX: 1, mouth: fear ? 'wavy' : 'flat',
      ...armsTo(bx, by, bs, 'boss', handle, reachK > 0 ? [lerp(bx + 200, 1040, reachK), lerp(by - 300, 700, reachK)] : [bx + 150, by - 380], { dy: dyB }),
      emote: 'sweat', emoteK: 0.6 + bgPulse(t) * 0.5,
    });
    const lr = 0.85;
    ctx.save(); ctx.translate(handle[0], handle[1]); ctx.rotate(0.33); ctx.translate(-handle[0], -handle[1]);
    magnifier(handle[0], handle[1] + 20 * 0, lr * 1.0, 0, 0, lensUp > 0.3 ? (cx, cy, r) => {
      rectW(cx - r, cy - r, r * 2, r * 2, ROLE.boss.skin);
      const pk = 1 + bgPulse(t, 5) * 0.08;
      ell(cx, cy, 62 * pk, 70 * pk, { fill: '#FFFFFF', lw: 6 });
      circle(cx + 20 + Math.sin(t * 9) * 4 * bseg(lb, 9, 12), cy + 6, 30, { fill: PAL.ink, stroke: null });
      circle(cx + 30, cy - 6, 9, { fill: '#FFFFFF', stroke: null });
      stroke([[cx - 70, cy - 90], [cx + 60, cy - 110]], PAL.ink, 12, { ink: null });
    } : null);
    ctx.restore();
    if (fear) for (let i = 0; i < 2; i++) sfx('꿀꺽', bx + 190, by - 640, 48, '#FFFFFF', t - (S.box + (6 + i * 2) * B), { life: B * 1.4, color2: BLK });
    camEnd();
    // the room goes dark around the box; the last bar is almost black
    const dark = lerp(0.35, 0.85, bseg(lb, 0, 8)) + bseg(lb, 10, 12) * 0.12;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = rgrad(1150, 640, 120, 1100 - bseg(lb, 8, 12) * 500, [[0, rgba('#0A0512', dark * 0.2)], [1, rgba('#0A0512', Math.min(0.97, dark * 1.15))]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // in the dark, the two glints stay
    if (lb >= 11) {
      const k = bseg(lb, 11, 11.8);
      fillScreen('#000000', k * 0.9);
      ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      for (const sx of [-50, 50]) { glow(1180 + sx, 560, 90, LIME, 0.9 * k); sparkle(1180 + sx, 560, 24 * k, '#FFFFFF', 0.4); }
      ctx.restore();
    }
    snapTick(t, 1800, 120);
  }

  chapter('mischief', 60.44, 99.56, [
    [60.44, crayon], [S.cake, cakeShot], [S.salt, saltShot], [S.note, noteShot], [S.cushion, cushionShot],
    [S.balloon, balloonShot], [S.mess, messShot], [S.sniff, sniffShot], [S.lens, lensShot], [S.trail, trailShot], [S.box, boxShot],
  ]);
})();
