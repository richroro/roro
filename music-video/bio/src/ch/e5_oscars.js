// e5_oscars (115.20 – 139.20) · 5막 · 무엇을 위해
//
// 115.20  Quiet. An empty cinema at pink dawn: the projector warms up, its beam full of dust
//         crosses over the rows to a screen glowing with a (projected) pink sunrise. One golden
//         star trophy stands between the seats, catching the beam. Slow push toward it.
// 124.80  The two star trophies side by side on a shelf, close. The camera pulls back slowly and
//         the room is the small bedroom from the start: bunk bed, a quilt on the wall for sound,
//         the laptop, fairy lights, and the two siblings (faceless backs) at the desk.
// 134.40  The same move carries on toward the window; the morning outside grows until the
//         light fills the room and, at 138.60, everything stops in white for one beat.
//
// Faces are never drawn: the siblings are backlit backs. Star trophies only; no posters, no logos.
(() => {
  const T_CINEMA = 115.2, T_ROOM = 124.8, T_LIGHT = 134.4, T_WHITE = 138.6, T_END = 139.2;
  const GOLD = { hi: '#FFF6D8', light: '#FFD978', mid: '#E9A93A', dark: '#9A6414', deep: '#5A3808' };

  const scr = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };
  /** The camera, with the hand-held drift folded in. */
  const shoot = (t, cx, cy, z, amt = 1) => {
    const [hx, hy, hr] = handheld(t, amt);
    camBegin(cx + hx / z, cy + hy / z, z, hr);
  };
  /** Append a closed Catmull-Rom curve to the current path (no beginPath). */
  function addSmooth(pts) {
    const n = pts.length, P = i => pts[(i + n) % n];
    ctx.moveTo(P(0)[0], P(0)[1]);
    for (let i = 0; i < n; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath();
  }
  const fillRectG = (x, y, w, h, style) => { ctx.fillStyle = style; ctx.fillRect(x, y, w, h); };

  /**
   * Paint fn() into an offscreen layer and composite it once, blurred by px (world units).
   * (ctx.filter on the main context blurs every single draw call; this blurs the layer once.)
   * Heavier blurs are painted at half resolution, which the blur hides.
   */
  const POOL = [];
  let poolDepth = 0;
  const pooled = (i, w, h) => {
    let c = POOL[i];
    if (!c) c = POOL[i] = document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.clearRect(0, 0, w, h);
    return [c, g];
  };
  function layer(px, fn, o = {}) {
    const main = ctx, res = o.res ?? (px >= 6 ? 0.25 : 0.5);
    const w = Math.round(cv.width * res), h = Math.round(cv.height * res);
    const [off, g] = pooled(poolDepth * 2, w, h);
    const m = main.getTransform();
    g.setTransform(m.a * res, m.b * res, m.c * res, m.d * res, m.e * res, m.f * res);
    poolDepth++; ctx = g;
    try { fn(); } finally { ctx = main; poolDepth--; }
    let src = off;
    if (px > 0) {                       // blur at the layer's own (small) size
      const [bl, bg] = pooled(poolDepth * 2 + 1, w, h);
      bg.filter = `blur(${px * SCALE * res}px)`; bg.drawImage(off, 0, 0); bg.filter = 'none';
      src = bl;
    }
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    if (o.alpha !== undefined) main.globalAlpha = o.alpha;
    if (o.op) main.globalCompositeOperation = o.op;
    main.imageSmoothingEnabled = true; main.imageSmoothingQuality = 'high';
    main.drawImage(src, 0, 0, cv.width, cv.height);
    main.restore();
  }

  // ---- the golden star trophy ---------------------------------------------------------------------

  /**
   * A golden star on a slim stem and a black plinth, no outlines, lit from `light` (an angle,
   * the direction the light comes from). (x, y) = bottom of the plinth; ~400 tall at s = 1.
   */
  function starTrophy(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const light = o.light ?? -2.2, cy = -300, R = 100, r = R * 0.45;
    // plinth: black lacquer with a soft sheen, a gold band on top
    rrect(-74, -66, 148, 66, 6, { fill: lgrad(-74, 0, 74, 0, [[0, '#050407'], [0.3, '#231E26'], [0.42, '#3A333D'], [0.6, '#16121A'], [1, '#050407']]), stroke: null });
    rrect(-80, -80, 160, 16, 4, { fill: lgrad(-80, 0, 80, 0, [[0, GOLD.deep], [0.3, GOLD.light], [0.45, GOLD.hi], [0.7, GOLD.mid], [1, GOLD.deep]]), stroke: null });
    // stem and knob
    poly([[-15, -80], [15, -80], [6, -200], [-6, -200]], { fill: lgrad(-15, 0, 15, 0, [[0, GOLD.deep], [0.35, GOLD.hi], [0.6, GOLD.mid], [1, GOLD.deep]]), stroke: null });
    circle(0, -206, 15, { fill: rgrad(-5, -212, 1, 17, [[0, GOLD.hi], [0.5, GOLD.light], [1, GOLD.dark]]), stroke: null });
    // the faceted star: each arm is two facets, shaded by how they face the light
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5, tip = [Math.cos(a) * R, cy + Math.sin(a) * R];
      for (const side of [-1, 1]) {
        const b = a + side * TAU / 10, inn = [Math.cos(b) * r, cy + Math.sin(b) * r];
        const k = 0.5 + 0.5 * Math.cos(a + side * 0.55 - light);
        polyPath([[0, cy], tip, inn]);
        ctx.fillStyle = lgrad(0, cy, tip[0], tip[1], [[0, mix(GOLD.mid, GOLD.hi, k)], [1, mix(GOLD.deep, GOLD.light, k)]]);
        ctx.fill();
      }
    }
    // a thin bright edge on the lit side of each arm
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const pts = starShape(0, cy, R, 0.45);
    polyPath(pts); ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.strokeStyle = lgrad(Math.cos(light) * R, cy + Math.sin(light) * R, -Math.cos(light) * R, cy - Math.sin(light) * R, [[0, 'rgba(255,248,220,0.9)'], [0.6, 'rgba(255,220,150,0.1)'], [1, 'rgba(0,0,0,0)']]);
    ctx.stroke();
    ctx.restore();
    // a glint sweeping across the star
    if (o.glint > 0 && o.glint < 1) {
      ctx.save(); polyPath(pts); ctx.clip();
      const gx = -170 + o.glint * 340;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = lgrad(gx - 40, 0, gx + 40, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,240,0.85)'], [1, 'rgba(255,255,255,0)']]);
      ctx.beginPath(); ctx.moveTo(gx - 40, cy + 130); ctx.lineTo(gx + 10, cy + 130); ctx.lineTo(gx + 80, cy - 130); ctx.lineTo(gx + 30, cy - 130); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---- 115.20 · the empty cinema at pink dawn ------------------------------------------------------

  const SCREEN = { x: 470, y: 240, w: 980, h: 300 };
  const ROWS = 9;
  const rowY = k => lerp(572, 905, Math.pow(k / (ROWS - 1), 1.35));
  const rowS = k => lerp(0.3, 1.75, Math.pow(k / (ROWS - 1), 1.6));

  /** One row of seat backs, seen from behind, rim-lit by the screen. */
  function seatRow(k, on, o = {}) {
    const f = k / (ROWS - 1), s = o.s ?? rowS(k), y0 = o.y ?? rowY(k);
    const sw = 104 * s, gap = 12 * s, sh = 170 * s;
    const aisle = lerp(900, 420, Math.pow(f, 1.2)), aw = 46 * s;
    ctx.beginPath();
    const tops = [];
    for (let x = aisle % (sw + gap) - 2 * (sw + gap); x < W + 500; x += sw + gap) {
      const cx = x + sw / 2;
      if (o.aisle && Math.abs(cx - aisle) < aw + sw / 2) continue;
      const y = y0 - Math.pow((cx - 960) / 1100, 2) * 26 * s;
      ctx.roundRect(cx - sw / 2, y, sw, sh, [sw * 0.36, sw * 0.36, 4, 4]);
      tops.push([cx, y]);
    }
    const base = o.body || mix('#241322', '#0D070E', f);
    ctx.fillStyle = lgrad(0, y0 - 30 * s, 0, y0 + sh, [[0, base], [0.5, '#0A060B'], [1, '#040305']]);
    ctx.fill();
    // the screen's light along the tops of the backs
    const rim = (o.rim ?? lerp(0.95, 0.4, f)) * on;
    if (rim > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = Math.max(1.2, 3 * s);
      ctx.strokeStyle = lgrad(0, y0 - 30 * s, 0, y0 + sh * 0.3, [[0, rgba('#FFC9DD', rim)], [0.35, rgba('#FF8FB8', rim * 0.4)], [1, 'rgba(0,0,0,0)']]);
      ctx.stroke();
      // a soft sheen on each top
      for (const [cx, y] of tops) {
        ctx.fillStyle = rgrad(cx, y + 6 * s, 0, sw * 0.5, [[0, rgba('#FF9CC2', rim * 0.35)], [1, 'rgba(0,0,0,0)']]);
        ctx.fillRect(cx - sw / 2, y - 2, sw, sw * 0.5);
      }
      ctx.restore();
    }
  }

  /** The projected picture: a pink sunrise over low hills (no film, no poster: just light). */
  function screenImage(t, on) {
    const S = SCREEN, rise = seg(t, T_CINEMA, T_ROOM);
    ctx.save(); rrectPath(S.x, S.y, S.w, S.h, 3); ctx.clip();
    fillRectG(S.x, S.y, S.w, S.h, lgrad(0, S.y, 0, S.y + S.h, [[0, '#3C2150'], [0.35, '#B8618F'], [0.62, '#FFB8BE'], [0.7, '#FFE0CC'], [0.72, '#E794A6'], [1, '#5A2744']]));
    const sx = S.x + S.w * 0.6, sy = S.y + S.h * (0.74 - rise * 0.12);
    glow(sx, sy, 380, '#FFD6C4', 0.6);
    circle(sx, sy, 26, { fill: 'rgba(255,246,236,0.95)', stroke: null });
    // soft cloud streaks
    for (let i = 0; i < 6; i++) {
      const cx = S.x + frac(hash(i, 21) + t * 0.004) * S.w * 1.2 - 60, cy = S.y + 40 + hash(i, 22) * S.h * 0.45;
      ell(cx, cy, 120 + hash(i, 23) * 140, 9 + hash(i, 24) * 8, { fill: rgba('#FFD3E0', 0.35), stroke: null });
    }
    // hills
    ctx.beginPath(); ctx.moveTo(S.x, S.y + S.h);
    for (let i = 0; i <= 20; i++) { const x = S.x + S.w * i / 20; ctx.lineTo(x, S.y + S.h * (0.74 + 0.05 * Math.sin(i * 0.9) + 0.03 * Math.sin(i * 2.3))); }
    ctx.lineTo(S.x + S.w, S.y + S.h); ctx.fillStyle = '#3A1830'; ctx.fill();
    ctx.restore();
    // the lamp is still warming up: the picture comes up from black
    if (on < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - on})`; ctx.fillRect(S.x - 2, S.y - 2, S.w + 4, S.h + 4); }
  }

  function cinema(t) {
    const flick = t < 116.3 ? 0.85 + 0.15 * Math.sin(t * 90) * hash(Math.floor(t * 14), 3) : 1;
    const on = easeInOut(seg(t, T_CINEMA + 0.1, 117.2)) * flick;
    const push = easeInOut(seg(t, T_CINEMA, T_ROOM));
    shoot(t, lerp(960, 1110, push), lerp(540, 560, push), lerp(1.0, 1.24, push), 0.6);

    // the room: dark walls, washed pink by the screen
    fillRectG(-500, -400, W + 1000, H + 800, '#060408');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgrad(960, 360, 60, 1100, [[0, rgba('#8A3A62', 0.55 * on)], [0.45, rgba('#3A1530', 0.35 * on)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(-500, -400, W + 1000, H + 800);
    ctx.restore();
    // the far wall, softened: acoustic panels, the screen and the stage floor reflecting it
    layer(2.2, () => {
      for (let i = 0; i < 9; i++) {
        const x = -260 + i * 300;
        if (x > 380 && x < 1450) continue;
        rrect(x, 170, 250, 420, 6, { fill: lgrad(x, 0, x + 250, 0, [[0, rgba('#2A1426', 0.9)], [0.5, rgba('#3C1C36', 0.9 * on + 0.1)], [1, rgba('#1A0C18', 0.9)]]), stroke: null });
      }
      rrect(SCREEN.x - 24, SCREEN.y - 20, SCREEN.w + 48, SCREEN.h + 40, 4, { fill: '#050305', stroke: null });
      screenImage(t, on);
      // stage floor with the screen mirrored in it
      fillRectG(300, 552, 1320, 40, lgrad(0, 552, 0, 592, [[0, rgba('#FFB8CC', 0.3 * on)], [1, 'rgba(40,10,30,0)']]));
    });
    glow(960, 390, 620, '#FF9FC4', 0.22 * on);

    // the rows, far to near; the trophy stands between rows 4 and 5
    for (let k = 0; k < ROWS - 1; k++) {
      if (k === 0) layer(1.5, () => { seatRow(0, on); seatRow(1, on); }); else if (k > 1) seatRow(k, on);
      if (k === 4) {
        const tx = 1236, ty = rowY(5) + 40, ts = 0.56;
        const starY = ty - 300 * ts;
        glow(tx, starY, 190, '#FFC46A', 0.28 * on + 0.08);
        starTrophy(tx, ty, ts, { light: -2.0, glint: frac((t - 118.2) / 3.6) * 1.6 });
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3);
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        glow(tx - 12, starY - 46 * ts * 2, 50 + 20 * tw, '#FFF3D0', 0.5 * on);
        ctx.restore();
      }
    }

    // the projector beam: shafts from behind us converging on the screen, full of dust
    const beam = [[SCREEN.x + 40, SCREEN.y + 10], [SCREEN.x + SCREEN.w - 40, SCREEN.y + 10], [2600, -300], [300, -300]];
    layer(10, () => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const u0 = i / 9 + hash(i, 31) * 0.03, u1 = u0 + 0.05 + hash(i, 32) * 0.06;
        const a = (0.28 + 0.14 * Math.sin(t * 0.9 + i * 2.1)) * on;
        const p = u => [lerp(beam[0][0], beam[1][0], u), beam[0][1] + Math.sin(u * 3) * 30];
        const q = u => [lerp(300, 2600, u), -300];
        ctx.fillStyle = lgrad(0, SCREEN.y, 0, -300, [[0, rgba('#FFE3EE', a)], [1, rgba('#FFB0CF', a * 0.25)]]);
        polyPath([p(u0), p(u1), q(u1 + 0.02), q(u0 - 0.02)]); ctx.fill();
      }
      ctx.restore();
    }, { op: 'screen' });
    ctx.save(); polyPath(beam); ctx.clip();
    dust(t, 0, -200, W, 740, 170, '#FFE8F0');
    dust(t + 40, 200, 0, W - 400, 500, 60, '#FFFFFF');
    ctx.restore();

    // the nearest row, out of focus
    layer(9, () => seatRow(ROWS - 1, on * 0.6, { y: 930, s: 2.4, body: '#0A060A' }));
    camEnd();

    // the lens catches the screen
    scr(() => {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = lgrad(0, 0, W, 0, [[0, rgba('#FF7FB0', 0.05 * on)], [0.5, 'rgba(0,0,0,0)'], [1, rgba('#FFB070', 0.05 * on)]]);
      ctx.fillRect(0, 0, W, H);
    });
    yearTag(t, 116.2, '2024');
    caption(t, 116.6, 124.3, '“What Was I Made For?”로 두 번째 아카데미상', '영화 〈바비〉 주제가');
    // fade up from black
    scr(() => { ctx.fillStyle = `rgba(0,0,0,${1 - easeOut(seg(t, T_CINEMA, T_CINEMA + 1.2))})`; ctx.fillRect(0, 0, W, H); });
  }

  // ---- the bedroom (124.80 and 134.40) -------------------------------------------------------------

  const FLOOR = 780;
  const WIN = { x: 850, y: 160, w: 400, h: 440 };

  /** A faceless figure seen from behind, seated (y = the seat). hair: 'long' | 'short'. */
  function backFigure(x, y, s, o = {}) {
    // every part is filled on its own, so opposite windings never cut holes
    const path = () => {
      const parts = [
        () => addSmooth([[-64, 0], [-72, -110], [-92, -196], [-78, -230], [-34, -246], [34, -246], [78, -230], [92, -196], [72, -110], [64, 0]]),
        () => ctx.rect(-19, -275, 38, 40),
        () => { ctx.moveTo(46, -300); ctx.arc(0, -300, 46, 0, TAU); },
        o.hair === 'long'
          ? () => addSmooth([[-50, -322], [-56, -270], [-66, -196], [-40, -178], [0, -186], [40, -178], [66, -196], [56, -270], [50, -322], [0, -352]])
          : () => addSmooth([[-47, -298], [-45, -330], [-20, -349], [18, -350], [45, -332], [48, -298], [0, -312]]),
      ];
      return style => { ctx.fillStyle = style; for (const p of parts) { ctx.beginPath(); p(); ctx.fill(); } };
    };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // backlight: a soft halo round the edge
    const fillAll = path();
    if (o.rim > 0) {                    // backlight: a soft halo round the edge
      ctx.save(); ctx.shadowColor = rgba(o.rimColor || '#FFE6C0', o.rim); ctx.shadowBlur = 16 * s * SCALE;
      fillAll(o.body || '#120E16');
      ctx.restore();
    }
    fillAll(o.body || '#120E16');
    // a faint sheen on the crown of the head
    ctx.fillStyle = rgrad(-10, -330, 0, 60, [[0, rgba('#6A5A66', 0.35)], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath(); ctx.arc(0, -300, 46, 0, TAU); ctx.fill();
    // headphones round the neck (hers) or on (his)
    if (o.phones) {
      ctx.strokeStyle = '#1E1A22'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(0, -300, 54, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ell(-50, -298, 13, 24, { fill: '#1B171F', stroke: null }); ell(50, -298, 13, 24, { fill: '#1B171F', stroke: null });
    }
    // the chair back hides the lower back
    rrect(-64, -118, 128, 128, 22, { fill: lgrad(-76, 0, 76, 0, [[0, '#0B090D'], [0.5, '#1C1820'], [1, '#0B090D']]), stroke: null });
    rrect(-8, 10, 16, 70, 4, { fill: '#0E0C10', stroke: null });
    ell(0, 86, 80, 12, { fill: '#0E0C10', stroke: null });
    ctx.restore();
  }

  /** The view out of the window: a morning sky over trees and roofs. L = brightness 0..1. */
  function outside(L) {
    const { x, y, w, h } = WIN;
    fillRectG(x, y, w, h, lgrad(0, y, 0, y + h, [[0, mix('#8FB4D6', '#FFFFFF', L * 0.9)], [0.6, mix('#F6D7BC', '#FFFFFF', L)], [1, mix('#E8C6A6', '#FFF9EE', L)]]));
    glow(x + w * 0.3, y + h * 0.35, 380, '#FFF3DA', 0.5 + L * 0.5);
    ctx.fillStyle = rgba(mix('#4E6A4A', '#E8E4D0', L * L), 1 - L * 0.7);
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let i = 0; i <= 12; i++) ctx.lineTo(x + w * i / 12, y + h * (0.62 + 0.12 * hash(i, 41)) - (i % 3 === 0 ? 40 : 0));
    ctx.lineTo(x + w, y + h); ctx.fill();
  }

  /** The whole room. L = morning light 0..1; blur = how far out of focus the back of the room is. */
  function bedroom(t, L, blur) {
    const wall = mix('#3A3444', '#D9C4AE', L * 0.85), wallDk = mix('#1C1822', '#9C8672', L * 0.8);
    const back = () => {
      // wall, lit from the window, darker toward the corners
      fillRectG(-400, -300, W + 800, FLOOR + 300, lgrad(0, -300, 0, FLOOR, [[0, wallDk], [0.6, wall], [1, mix(wall, wallDk, 0.4)]]));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgrad(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 100, 1000, [[0, rgba('#FFE2B8', 0.25 + 0.35 * L)], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(-400, -300, W + 800, FLOOR + 300);
      ctx.restore();
      // the window: sky, frame, cross bars, a sheer curtain
      outside(L);
      ctx.fillStyle = mix('#E9E2D6', '#FFFFFF', L);
      const { x, y, w, h } = WIN;
      ctx.fillRect(x - 22, y - 22, w + 44, 22); ctx.fillRect(x - 22, y + h, w + 44, 26);
      ctx.fillRect(x - 22, y, 22, h); ctx.fillRect(x + w, y, 22, h);
      ctx.fillRect(x + w / 2 - 7, y, 14, h); ctx.fillRect(x, y + h * 0.42 - 6, w, 12);
      ctx.fillStyle = rgba('#000000', 0.12); ctx.fillRect(x - 22, y + h + 20, w + 44, 8);
      ctx.save(); ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(x - 60, y - 40);
      for (let i = 0; i <= 10; i++) ctx.lineTo(x - 60 + 110 + Math.sin(i * 1.3 + t * 0.4) * 12, y - 40 + i * (h + 90) / 10);
      ctx.lineTo(x - 70, y + h + 50); ctx.closePath();
      ctx.fillStyle = lgrad(x - 60, 0, x + 60, 0, [[0, mix('#CFC2B4', '#FFFFFF', L)], [1, rgba('#FFF6EA', 0.6)]]); ctx.fill();
      ctx.restore();
      // fairy lights along the top of the wall
      for (let i = 0; i < 26; i++) {
        const u = i / 25, lx = lerp(-100, 2000, u), ly = 96 + Math.sin(u * Math.PI * 3) * 26 + 20;
        glow(lx, ly, 26, '#FFC873', 0.55 * (1 - L * 0.6));
        circle(lx, ly, 4, { fill: '#FFE9B8', stroke: null });
      }
      // the bunk bed on the left, a quilt hung behind it to deaden the sound
      rrect(190, 360, 470, 270, 10, { fill: lgrad(190, 360, 660, 630, [[0, mix('#4A3A55', '#9E7F92', L)], [0.5, mix('#3A4A5C', '#7E93A6', L)], [1, mix('#553B3A', '#A08070', L)]]), stroke: null });
      for (let i = 1; i < 5; i++) { ctx.fillStyle = rgba('#000000', 0.12); ctx.fillRect(190 + i * 94, 360, 3, 270); ctx.fillRect(190, 360 + i * 54, 470, 3); }
      const wood = mix('#3A2A22', '#8A6448', L), woodLt = mix('#5A4232', '#C09070', L);
      const post = px => rrect(px, 150, 30, FLOOR + 20 - 150, 6, { fill: lgrad(px, 0, px + 30, 0, [[0, wood], [0.6, woodLt], [1, wood]]), stroke: null });
      post(140); post(700);
      rrect(150, 250, 570, 14, 4, { fill: woodLt, stroke: null });                 // upper guard rail
      rrect(160, 286, 550, 44, 16, { fill: mix('#5D6A84', '#C9D4E4', L), stroke: null }); // upper blanket
      smooth([[170, 292], [260, 270], [380, 284], [500, 266], [690, 284], [700, 318], [170, 322]], { fill: mix('#6E7C98', '#DDE6F2', L), stroke: null });
      rrect(150, 330, 570, 26, 4, { fill: wood, stroke: null });
      rrect(160, 598, 550, 44, 16, { fill: mix('#6A4E5E', '#D9B8C4', L), stroke: null });  // lower blanket
      smooth([[170, 604], [300, 586], [420, 600], [560, 580], [690, 598], [700, 630], [170, 634]], { fill: mix('#7C5E70', '#E8CAD4', L), stroke: null });
      rrect(150, 640, 570, 28, 4, { fill: wood, stroke: null });
      // the ladder
      rrect(730, 240, 12, 540, 4, { fill: woodLt, stroke: null }); rrect(790, 240, 12, 540, 4, { fill: wood, stroke: null });
      for (let i = 0; i < 6; i++) rrect(736, 300 + i * 84, 62, 10, 3, { fill: woodLt, stroke: null });
      // the shelf on the right of the window (the trophies are painted in front, sharp)
      rrect(1320, 300, 330, 16, 3, { fill: lgrad(0, 300, 0, 316, [[0, woodLt], [1, wood]]), stroke: null });
      fillRectG(1320, 316, 330, 30, lgrad(0, 316, 0, 346, [[0, rgba('#000000', 0.25)], [1, 'rgba(0,0,0,0)']]));
      [[1600, 0], [1620, 1], [1636, 2]].forEach(([bx, i]) => rrect(bx, 222 + i * 6, 14, 78 - i * 6, 2, { fill: ['#6B4F6E', '#3E5A6A', '#8A6A3A'][i], stroke: null }));
      // floor boards running toward the window, with the window's light laid on them
      fillRectG(-400, FLOOR, W + 800, 700, lgrad(0, FLOOR, 0, H + 200, [[0, mix('#2A1E1A', '#8A6448', L * 0.9)], [1, mix('#140E0C', '#5A3E2C', L * 0.8)]]));
      ctx.strokeStyle = rgba('#000000', 0.18); ctx.lineWidth = 2;
      for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(1050 + i * 60, FLOOR); ctx.lineTo(1050 + i * 260, H + 300); ctx.stroke(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      polyPath([[WIN.x - 10, FLOOR + 10], [WIN.x + WIN.w + 10, FLOOR + 10], [WIN.x + WIN.w + 300, H + 200], [WIN.x - 360, H + 200]]);
      ctx.fillStyle = lgrad(0, FLOOR, 0, H + 200, [[0, rgba('#FFD9A8', 0.28 + 0.4 * L)], [1, rgba('#FFD9A8', 0.02)]]); ctx.fill();
      ctx.restore();
    };
    if (blur > 0.3) layer(blur, back, { res: blur > 3 ? 0.5 : 1 }); else back();

    // the desk under the window, the laptop, the mic
    const deskC = mix('#2A201C', '#7A5A44', L);
    rrect(960, 618, 700, 20, 3, { fill: lgrad(0, 618, 0, 638, [[0, mix('#4A3A30', '#B08A6A', L)], [1, deskC]]), stroke: null });
    rrect(980, 638, 18, 150, 3, { fill: deskC, stroke: null }); rrect(1622, 638, 18, 150, 3, { fill: deskC, stroke: null });
    // laptop, screen toward us: a timeline of takes
    poly([[1160, 618], [1400, 618], [1386, 606], [1174, 606]], { fill: '#2A2A30', stroke: null });
    rrect(1182, 470, 196, 136, 6, { fill: '#18181C', stroke: null });
    rrect(1190, 478, 180, 120, 3, { fill: lgrad(0, 478, 0, 598, [[0, '#15223A'], [1, '#0B1222']]), stroke: null });
    for (let r = 0; r < 4; r++) {
      const ry = 494 + r * 26, col = ['#6FB8FF', '#B6FF3B', '#FF8FB8', '#FFD27A'][r];
      ctx.fillStyle = rgba(col, 0.75);
      for (let i = 0; i < 44; i++) {
        const a = Math.abs(Math.sin(i * 0.7 + r * 2) * Math.sin(i * 0.23 + r)) * 9 + 1;
        ctx.fillRect(1198 + i * 3.8, ry - a, 2.2, a * 2);
      }
    }
    const play = 1198 + frac((t - T_ROOM) / 6) * 166;
    fillRectG(play, 480, 2, 116, 'rgba(255,255,255,0.8)');
    glow(1280, 540, 260, '#7FB4FF', 0.2);
    // mic on a stand beside the desk, with a pop filter
    stroke([[900, FLOOR + 40], [900, 560], [1010, 470]], '#1A171C', 7, { ink: null });
    rrect(1000, 440, 26, 60, 12, { fill: lgrad(1000, 0, 1026, 0, [[0, '#2A2630'], [0.5, '#6A6470'], [1, '#2A2630']]), stroke: null });
    ell(1052, 468, 6, 34, { fill: rgba('#20202A', 0.55), stroke: null });

    // the two trophies on the shelf, sharp, catching the window
    const glint = frac((t - 125.6) / 4.2) * 1.8;
    glow(1470, 210, 150, '#FFD98A', 0.18 + 0.3 * L);
    starTrophy(1420, 300, 0.36, { light: -2.6, glint });
    starTrophy(1522, 300, 0.36, { light: -2.6, glint: glint - 0.25 });
    // their reflections in the varnish of the shelf
    ctx.save(); ctx.globalAlpha = 0.18; ctx.translate(0, 324); ctx.scale(1, -0.08);
    starTrophy(1420, 300, 0.36, {}); starTrophy(1522, 300, 0.36, {});
    ctx.restore();

    // the siblings at the desk, backlit
    const rim = 0.45 + 0.5 * L;
    backFigure(1080, 720, 0.98, { hair: 'long', rim, body: '#141018' });
    backFigure(1480, 716, 1.05, { hair: 'short', rim, body: '#110D14' });

    // light pouring in: rays and dust from the window toward us
    godRays(t, WIN.x + WIN.w * 0.45, WIN.y + WIN.h * 0.4, 1.95, 1.0, 1200, '#FFE6C0', 0.1 + 0.35 * L);
    dust(t, WIN.x - 400, WIN.y, WIN.w + 700, 700, 90, '#FFF1D8');

    // a door frame at the right edge, close to the lens and out of focus
    fillRectG(1760, -300, 460, H + 600, lgrad(1760, 0, 1900, 0, [[0, 'rgba(10,8,10,0)'], [0.25, rgba(mix('#1A1418', '#5A4A40', L), 0.9)], [0.5, '#0A080A'], [1, '#050405']]));
  }

  function room(t) {
    // pull back from the two trophies until the whole room is in the frame
    const k = easeInOut(seg(t, T_ROOM, T_LIGHT));
    const z = Math.exp(lerp(Math.log(2.9), Math.log(1.02), k));
    const cx = lerp(1470, 980, easeInOut(seg(t, T_ROOM + 0.4, T_LIGHT))), cy = lerp(240, 500, k);
    shoot(t, cx, cy, z, 0.7);
    bedroom(t, 0.3 + 0.05 * k, (z - 1) * 3.2);
    camEnd();
    // a shade under the narration
    scr(() => {
      fillRectG(0, 520, W, 440, lgrad(0, 520, 0, 948, [[0, 'rgba(8,6,10,0)'], [0.5, 'rgba(8,6,10,0.45)'], [1, 'rgba(8,6,10,0.7)']]));
      ctx.translate(W / 2, 850); ctx.scale(1, 0.28);
      ctx.fillStyle = rgrad(0, 0, 60, 700, [[0, 'rgba(6,4,8,0.55)'], [1, 'rgba(6,4,8,0)']]); ctx.fillRect(-W / 2, -800, W, 1600);
    });
    narration(t, 125.4, 130.0, '스물두 살,\n역대 최연소 오스카 2회 수상', { y: 850 });
    narration(t, 130.6, 134.2, '노래는 여전히\n남매 둘이서 만든다', { y: 850 });
    // up from black on the heartbeat
    scr(() => { ctx.fillStyle = `rgba(0,0,0,${1 - easeOut(seg(t, T_ROOM, T_ROOM + 0.7))})`; ctx.fillRect(0, 0, W, H); });
  }

  function light(t) {
    const tt = Math.min(t, T_WHITE);                   // at 138.60 everything stops
    const k = seg(tt, T_LIGHT, T_WHITE);
    const z = lerp(1.02, 1.55, easeIn(k)), cx = lerp(980, 1060, easeIn(k)), cy = lerp(500, 420, easeIn(k));
    shoot(tt, cx, cy, z, 0.7);
    bedroom(tt, 0.35 + 0.65 * easeIn(k), 0);
    camEnd();
    // the light swallows the room
    scr(() => {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgrad(1000, 420, 50, 1300, [[0, rgba('#FFF4E0', 0.9 * easeIn(k))], [1, rgba('#FFE8D0', 0.5 * easeIn(k))]]);
      ctx.fillRect(0, 0, W, H);
    });
    const white = t >= T_WHITE ? 1 : easeIn(seg(t, 136.6, T_WHITE)) * 0.9;
    scr(() => { ctx.fillStyle = `rgba(255,252,246,${white})`; ctx.fillRect(0, 0, W, H); });
  }

  chapter('oscars', T_CINEMA, T_END, [[T_CINEMA, cinema], [T_ROOM, room], [T_LIGHT, light]]);
})();
