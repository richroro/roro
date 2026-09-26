// e4_world (96.00 – 115.20) · 정상에서.
// 96.00: a hushed awards stage; at 98.40 it explodes into gold: two spotlights find the two faceless
// siblings, gold paper bursts from cannons, the hall rises, four gold gramophones glint at the stage
// front (generic trophies, no real design). 100.80: near silence. A podium microphone backlit by the
// follow spot, the two of them from behind, the house in soft warm lights, the last gold paper
// drifting in slow motion: Finneas's words, the thesis of the film. 108.00: a fast montage: a
// rifled gun-barrel-like iris pushing into its light, a film reel turning in a projector's beam,
// then an endless festival crowd at pink dusk (a generic field, no landmark), fading toward the
// empty cinema of act 5.
(() => {
  const GREEN = '#7ED321';

  // ---- kit --------------------------------------------------------------------------------------

  const scr = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };
  const lit = (fn, op = 'lighter') => { ctx.save(); ctx.globalCompositeOperation = op; fn(); ctx.restore(); };
  const after = (t, t0, k = 5) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
  const black = (k, c = '#000000') => { if (k > 0.002) fillScreen(c, clamp(k)); };
  const N = { stroke: null };

  /** Camera with a hand-held drift on top. Pair with camEnd(). */
  function shoot(t, cx, cy, zoom, amt = 1) {
    const [dx, dy, r] = handheld(t, amt);
    camBegin(cx + dx, cy + dy, zoom, r);
  }

  // Depth of field, cheaply: a layer is painted at half resolution into a scratch canvas, blurred
  // once there, and laid back over the frame, only over its own box. (Blurring shape by shape, or
  // at full size, costs many times more.)
  const Q = 0.5, bufs = [];
  function buf(i) {
    const w = Math.round(cv.width * Q), h = Math.round(cv.height * Q);
    if (!bufs[i]) bufs[i] = document.createElement('canvas');
    const c = bufs[i];
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    return [c, g];
  }
  /** The half-res pixel box [x, y, w, h] covering box (in the current transform) plus a margin. */
  function region(box, px, q) {
    const w = Math.round(cv.width * Q), h = Math.round(cv.height * Q);
    if (!box) return [0, 0, w, h];
    const m = ctx.getTransform(), [x, y, bw, bh] = box;
    const pts = [[x, y], [x + bw, y], [x, y + bh], [x + bw, y + bh]].map(([u, v]) => [(m.a * u + m.c * v + m.e) * q, (m.b * u + m.d * v + m.f) * q]);
    const pad = px * SCALE * Q * 2.5 + 2;
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0])) - pad)), y0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1])) - pad));
    const x1 = Math.min(w, Math.ceil(Math.max(...pts.map(p => p[0])) + pad)), y1 = Math.min(h, Math.ceil(Math.max(...pts.map(p => p[1])) + pad));
    return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
  }
  function blurDown(src, px, r, i) {
    const [c, g] = buf(i), [x, y, w, h] = r;
    g.clearRect(x - 3, y - 3, w + 6, h + 6);
    g.filter = `blur(${Math.max(0.1, px * SCALE * Q)}px)`;
    g.drawImage(src, x, y, w, h, x, y, w, h);
    g.filter = 'none';
    return c;
  }
  let depth = 0;
  /**
   * Paint fn() (in the current camera) out of focus by px. o: { alpha, op, box: [x, y, w, h] }.
   * Layers nest: inside another layer, the scratch is already at half size, so no rescale.
   */
  function layer(px, fn, o = {}) {
    const d = depth, q = d > 0 ? 1 : Q;
    const r = region(o.box, px, q), [rx, ry, rw, rh] = r;
    const [c, g] = buf(2 * d), m = ctx.getTransform(), main = ctx;
    g.clearRect(rx - 3, ry - 3, rw + 6, rh + 6);
    g.save(); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
    g.setTransform(m.a * q, m.b * q, m.c * q, m.d * q, m.e * q, m.f * q);
    ctx = g; depth++;
    try { fn(); } finally { ctx = main; depth--; g.restore(); }
    const out = px > 0 ? blurDown(c, px, r, 2 * d + 1) : c;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    main.globalAlpha = o.alpha ?? 1; main.globalCompositeOperation = o.op || 'source-over';
    main.drawImage(out, rx, ry, rw, rh, rx / q, ry / q, rw / q, rh / q);
    main.restore();
  }
  /** A soft cone of light from (x0, y0) toward (x1, y1); w0/w1 are the half widths. */
  function cone(x0, y0, x1, y1, w0, w1, color, a) {
    if (a <= 0.002) return;
    const L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    lit(() => {
      for (const [k, al] of [[1, 0.3], [0.62, 0.35], [0.28, 0.5]]) {
        ctx.fillStyle = lgrad(x0, y0, x1, y1, [[0, rgba(color, a * al)], [0.55, rgba(color, a * al * 0.45)], [1, rgba(color, 0)]]);
        ctx.beginPath();
        ctx.moveTo(x0 + nx * w0 * k, y0 + ny * w0 * k); ctx.lineTo(x1 + nx * w1 * k, y1 + ny * w1 * k);
        ctx.lineTo(x1 - nx * w1 * k, y1 - ny * w1 * k); ctx.lineTo(x0 - nx * w0 * k, y0 - ny * w0 * k);
        ctx.closePath(); ctx.fill();
      }
    });
  }

  /** Slow drifting haze: soft flattened blobs of light. */
  function haze(t, x, y, w, h, n, color, a, seed = 1) {
    if (a <= 0.002) return;
    lit(() => {
      for (let i = 0; i < n; i++) {
        const cx = x + frac(hash(i, seed) + t * 0.01 * (hash(i, seed + 1) - 0.3)) * w;
        const cy = y + hash(i, seed + 2) * h + Math.sin(t * 0.3 + i) * 14;
        const r = (0.16 + hash(i, seed + 3) * 0.22) * w;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.4);
        ctx.fillStyle = rgrad(0, 0, 0, r, [[0, rgba(color, a)], [1, rgba(color, 0)]]);
        ctx.fillRect(-r, -r, 2 * r, 2 * r);
        ctx.restore();
      }
    });
  }

  /** Press flashes: n pops spread over [t0, t1], each ~0.14 s. Returns how bright they are now. */
  function camFlashes(t, t0, t1, n, x0, x1, y0, y1, seed, size = 1) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const ft = t0 + hash(i, seed) * (t1 - t0), age = t - ft;
      if (age < 0 || age > 0.14) continue;
      const k = 1 - age / 0.14, x = lerp(x0, x1, hash(i, seed + 1)), y = lerp(y0, y1, hash(i, seed + 2));
      glow(x, y, (60 + 150 * k) * size, '#FFFFFF', 0.95 * k);
      glow(x, y, 26 * size, '#FFFFFF', 1);
      lit(() => {
        ctx.globalAlpha = 0.6 * k;
        ctx.fillStyle = lgrad(x - 260 * size, y, x + 260 * size, y, [[0, 'rgba(255,255,255,0)'], [0.5, '#FFFFFF'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(x - 260 * size, y - 1.5, 520 * size, 3);
      });
      sum += k;
    }
    return sum;
  }

  // ---- figures ----------------------------------------------------------------------------------

  // A back view, shoulders at (0, 0), ~720 down to below the frame. Hoodie + long hair, or a suit.
  const HOODIE = [[-198, 70], [-184, 8], [-132, -30], [-62, -44], [62, -44], [132, -30], [184, 8], [198, 70], [218, 320], [238, 760], [-238, 760], [-218, 320]];
  const LONG_HAIR = [[4, -228], [44, -218], [64, -190], [70, -140], [74, -96], [88, -52], [104, -6], [112, 40], [100, 66], [84, 58], [66, 84], [44, 70], [22, 92], [0, 74], [-22, 94], [-44, 72], [-66, 88], [-86, 60], [-104, 38], [-108, -8], [-92, -54], [-76, -98], [-70, -142], [-64, -192], [-40, -220]];

  const SUIT = [[-204, 60], [-196, 4], [-150, -22], [-60, -34], [60, -34], [150, -22], [196, 4], [204, 60], [212, 320], [222, 760], [-222, 760], [-212, 320]];
  function figureShape(o, fill, hairFill) {
    if (o.suit) {
      smooth(SUIT, { fill, stroke: null });
      rrect(-44, -110, 88, 90, 30, { fill, stroke: null });           // neck and collar
      ell(0, -150, 74, 90, { fill, stroke: null });                   // the head
      smooth([[0, -250], [52, -238], [80, -196], [80, -150], [66, -140], [0, -150], [-66, -140], [-80, -150], [-80, -196], [-52, -238]], { fill: hairFill || fill, stroke: null });
      return;
    }
    smooth(HOODIE, { fill, stroke: null });
    ell(0, -34, 92, 40, { fill, stroke: null });                    // the hood bunched at the neck
    ctx.save(); ctx.translate(0, -40); ctx.rotate(o.tilt ?? -0.05); ctx.translate(0, 40);
    smooth(LONG_HAIR, { fill: hairFill || fill, stroke: null });
    if (o.strands && hairFill !== fill) {                          // a few fine strands catching light
      ctx.save(); smoothPath(LONG_HAIR); ctx.clip();
      ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const x0 = -50 + i * 6.5 + (hash(i, 7) - 0.5) * 9, x1 = -100 + i * 13 + (hash(i, 9) - 0.5) * 26;
        ctx.strokeStyle = rgba(o.strands, 0.05 + 0.1 * hash(i, 8));
        ctx.beginPath(); ctx.moveTo(x0, -214); ctx.quadraticCurveTo(x0 * 1.5, -120, x1, 80); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /** A faceless figure seen from behind, rim-lit from in front of her. */
  function backFigure(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    if (o.rim) {
      if ((o.rimA ?? 0.6) > 0.01) layer((o.rimBlur ?? 12) * s, () => {
        ctx.scale(1.04, 1.03); figureShape(o, o.rim, o.rim);
      }, { op: 'lighter', alpha: o.rimA ?? 0.6, box: [-260, -270, 520, 1060] });
    }
    const body = o.body || '#07060A';
    const hair = o.hair ? lgrad(0, -226, 0, 80, [[0, mix(o.hair, '#050405', 0.6)], [0.18, mix(o.hair, '#050405', 0.84)], [0.4, '#070607'], [1, '#050405']]) : body;
    figureShape(o, body, hair);
    if (o.hair && o.hairLight) {
      ctx.save(); ctx.globalAlpha = o.hairLight;
      stroke([[-78, -178], [-52, -212], [0, -222], [52, -212], [78, -178]], o.hair, 5, { ink: null, smooth: true });
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * A faceless standing figure with real proportions (~540 tall at s = 1, (x, y) the ground point):
   * oversized tee and long shorts with long hair, or (kind 'him') a suit and short hair.
   * o: { kind, pose: 'stand'|'mic'|'arms', hair (tint at the roots), body, t, fill (flat colour) }.
   */
  function person(x, y, s, o = {}) {
    const him = o.kind === 'him', t = o.t || 0, body = o.fill || o.body || '#050408';
    const F = { fill: body, stroke: null };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const limb = (pts, w) => { ctx.strokeStyle = body; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.stroke(); };
    if (him) {
      poly([[-46, -262], [46, -262], [42, -14], [12, -14], [2, -200], [-8, -14], [-40, -14]], F);
      ell(-28, -8, 30, 11, F); ell(30, -8, 30, 11, F);
      smooth([[-64, -438], [0, -446], [64, -438], [72, -400], [62, -250], [-62, -250], [-72, -400]], F);
    } else {
      limb([[-30, -160], [-33, -24]], 30); limb([[30, -160], [33, -24]], 30);
      ell(-36, -12, 36, 15, F); ell(36, -12, 36, 15, F);
      poly([[-72, -272], [72, -272], [80, -150], [10, -146], [0, -180], [-10, -146], [-80, -150]], F);
      smooth([[-70, -432], [0, -440], [70, -432], [84, -380], [86, -262], [-86, -262], [-84, -380]], F);
    }
    const sw = him ? 26 : 36, fw = him ? 20 : 18, sh = him ? 64 : 66;
    const sway = Math.sin(t * 1.7) * 3;
    if (o.pose === 'mic') {
      limb([[sh - 8, -418], [76, -338]], sw); limb([[76, -338], [26, -452]], fw); circle(24, -458, 12, F);
      limb([[20, -452], [6, -478]], 10); circle(4, -482, 11, F);
      limb([[-sh + 8, -418], [-80 + sway, -336]], sw); limb([[-80 + sway, -336], [-96 + sway, -262]], fw); circle(-97 + sway, -254, 12, F);
    } else if (o.pose === 'arms') {
      for (const d of [-1, 1]) { limb([[d * (sh - 8), -418], [d * 92, -500]], sw); limb([[d * 92, -500], [d * (112 + sway), -590]], fw); circle(d * (114 + sway), -598, 9, F); }
    } else {
      for (const d of [-1, 1]) { limb([[d * (sh - 8), -418], [d * 78, -336]], sw); limb([[d * 78, -336], [d * 80, -262]], fw); circle(d * 80, -254, 12, F); }
    }
    ell(0, -444, 15, 18, F);
    ell(0, -484, 30, 36, F);
    if (him) ell(0, -500, 33, 26, F);
    else {
      const hair = o.hair && !o.fill ? lgrad(0, -526, 0, -380, [[0, mix(o.hair, body, o.hairK ?? 0.35)], [0.3, mix(o.hair, body, 0.72)], [0.55, body]]) : body;
      smooth([[-31, -516], [-44, -482], [-49 - sway * 0.3, -430], [-47, -382], [-22, -374], [22, -374], [47, -382], [49 + sway * 0.3, -430], [44, -482], [31, -516], [0, -524]], { fill: hair, stroke: null });
    }
    ctx.restore();
  }

  /** person() with a halo of light around its edges (backlit). */
  function rimPerson(x, y, s, o, rim, rimA, blur = 14) {
    if (rimA > 0.01) layer(blur * s, () => {
      ctx.translate(x, y - 270 * s); ctx.scale(1.05, 1.02); ctx.translate(-x, -(y - 270 * s));
      person(x, y, s, { ...o, fill: rim });
    }, { op: 'lighter', alpha: rimA, box: [x - 180 * s, y - 640 * s, 360 * s, 660 * s] });
    person(x, y, s, o);
  }


  /** A row of heads and shoulders across the width; some arms up holding phones. */
  function crowdRow(t, y, s, n, seed, o = {}) {
    const fill = o.fill || '#030205', phones = [];
    ctx.fillStyle = fill; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = -120 + (i + 0.2 + hash(i, seed) * 0.6) * (W + 240) / n;
      const jump = Math.abs(Math.sin((beatOf(t) + hash(i, seed + 5) * 0.3) * Math.PI)) * 10 * s * (o.jump ?? 1);
      const hy = y - 78 * s - jump + hash(i, seed + 1) * 26 * s;
      ctx.moveTo(x + 32 * s, hy); ctx.ellipse(x, hy, 32 * s, 38 * s, 0, 0, TAU);
      ctx.moveTo(x + 88 * s, y + 30 * s - jump); ctx.ellipse(x, y + 30 * s - jump, 88 * s, 70 * s, 0, 0, TAU);
      if (hash(i, seed + 2) < (o.arms ?? 0.3)) {
        const side = hash(i, seed + 3) < 0.5 ? -1 : 1, sway = Math.sin(t * 1.3 + i) * 14 * s;
        const hx = x + side * (46 + hash(i, seed + 4) * 40) * s + sway, hyy = hy - (110 + hash(i, seed + 6) * 60) * s;
        phones.push([hx, hyy - 18 * s, s, i]);
        const sx = x + side * 58 * s, sy = y - 6 * s - jump, ex = lerp(sx, hx, 0.5) + side * 16 * s, ey = lerp(sy, hyy, 0.5);
        ctx.moveTo(sx - 20 * s, sy); ctx.lineTo(sx + 20 * s, sy); ctx.lineTo(ex + 15 * s, ey);
        ctx.lineTo(hx + 12 * s, hyy); ctx.lineTo(hx - 12 * s, hyy); ctx.lineTo(ex - 15 * s, ey); ctx.closePath();
        ctx.moveTo(hx + 15 * s, hyy - 4 * s); ctx.ellipse(hx, hyy - 4 * s, 15 * s, 19 * s, 0, 0, TAU);
      }
    }
    ctx.fill();
    return phones;
  }

  function phoneLights(phones, a) {
    for (const [x, y, s, i] of phones) {
      const k = a * (0.6 + 0.4 * hash(i, 77));
      rrect(x - 8 * s, y - 13 * s, 16 * s, 26 * s, 3 * s, { fill: rgba('#EAF1FF', k), stroke: null });
      glow(x, y, 60 * s, '#CFE0FF', 0.3 * k);
    }
  }

  // ---- gold ---------------------------------------------------------------------------------------

  /** A band of polished gold across [x0..x1] (or any direction). */
  const goldBand = (x0, y0, x1, y1) => lgrad(x0, y0, x1, y1, [[0, '#3A2508'], [0.18, '#8A5A14'], [0.38, '#E2B454'], [0.48, '#FFF3CC'], [0.56, '#F0C866'], [0.78, '#9A6618'], [1, '#3A2508']]);

  /**
   * A golden gramophone (a generic trophy shape, not any real statuette's design): a black lacquer
   * plinth, a gold cabinet with a record, a tone arm and a flared horn. (x, y) is the foot; about
   * 400 tall at s = 1. o: { alpha, glint (0..1 a moving highlight) }.
   */
  function gramophone(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    poly([[-88, 0], [88, 0], [76, -28], [-76, -28]], { fill: lgrad(-88, 0, 88, 0, [[0, '#040303'], [0.45, '#2E2824'], [0.55, '#3A332E'], [1, '#040303']]), stroke: null });
    rrect(-76, -33, 152, 6, 2, { fill: goldBand(-76, 0, 76, 0), stroke: null });
    rrect(-66, -100, 132, 68, 5, { fill: goldBand(-66, 0, 66, 0), stroke: null });
    rrect(-50, -88, 100, 44, 4, { fill: 'rgba(40,22,2,0.35)', stroke: null });
    ell(0, -102, 72, 12, { fill: goldBand(-72, 0, 72, 0), stroke: null });
    ell(0, -105, 64, 10, { fill: rgrad(-14, -108, 2, 64, [[0, '#3A2A16'], [0.3, '#140C04'], [1, '#0A0602']]), stroke: null });
    ell(0, -105, 13, 2.4, { fill: '#D9A441', stroke: null });
    ctx.lineCap = 'round';
    ctx.strokeStyle = goldBand(40, 0, 66, 0); ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(56, -104); ctx.quadraticCurveTo(66, -160, 42, -198); ctx.stroke();
    ctx.strokeStyle = '#F4D48A'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(58, -108); ctx.lineTo(38, -134); ctx.lineTo(12, -114); ctx.stroke();
    // the horn: built along +x, turned to flare up and back
    ctx.save(); ctx.translate(42, -198); ctx.rotate(-2.08);
    const up = [], dn = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14, X = u * 206, hw = 8 + 86 * Math.pow(u, 2.4); up.push([X, -hw]); dn.push([X, hw]); }
    poly([...up, ...dn.reverse()], { fill: goldBand(0, -94, 0, 94), stroke: null });
    ell(206, 0, 22, 94, { fill: rgrad(206, 0, 4, 94, [[0, '#1E1204'], [0.6, '#6A4410'], [0.9, '#D8A848'], [1, '#FFF0C0']]), stroke: null });
    if (o.glint) {
      ctx.globalCompositeOperation = 'lighter';
      const gx = 30 + 170 * frac(o.glint);
      ctx.fillStyle = rgrad(gx, -10, 1, 60, [[0, 'rgba(255,250,230,0.8)'], [1, 'rgba(255,250,230,0)']]);
      ctx.fillRect(gx - 60, -80, 120, 140);
    }
    ctx.restore();
    ctx.restore();
  }

  /** Gold paper: from two cannons at the stage sides and from the rig above, from t0. */
  function goldPaper(t, t0, n, seed, o = {}) {
    const age = t - t0;
    if (age < 0) return;
    const k = 2.0, e = Math.exp(-k * age), vt = 150;
    for (let i = 0; i < n; i++) {
      let x, y;
      if (i % 2 === 0) {                                       // the cannons
        const side = i % 4 ? 1 : -1, a = -Math.PI / 2 - side * (0.1 + 0.55 * hash(i, seed));
        const v = 800 + 800 * hash(i, seed + 1);
        x = 960 + side * 780 + Math.cos(a) * v * (1 - e) / k;
        y = 760 + Math.sin(a) * v * (1 - e) / k + vt * (age - (1 - e) / k);
      } else {                                                 // the rig
        x = hash(i, seed + 2) * (W + 200) - 100;
        y = 100 - hash(i, seed + 3) * 700 + (vt + 60 * hash(i, seed + 4)) * age;
      }
      x += Math.sin(age * (1.6 + hash(i, seed + 5) * 2) + i) * 30;
      if (y > 1150 || y < -60) continue;
      const flip = Math.cos(age * (4 + hash(i, seed + 6) * 5) + i), sz = (o.size || 1) * (0.7 + 0.6 * hash(i, seed + 7));
      ctx.save(); ctx.translate(x, y); ctx.rotate(age * (1 + hash(i, seed + 8) * 3) + i);
      ctx.scale(1, Math.max(0.08, Math.abs(flip)));
      ctx.fillStyle = flip > 0.75 ? '#FFF4CF' : mix('#7A4E12', '#F2C65C', 0.5 + 0.5 * flip);
      ctx.fillRect(-10 * sz, -5 * sz, 20 * sz, 10 * sz);
      ctx.restore();
    }
  }

  // ---- 96.00 · the awards stage -----------------------------------------------------------------

  const T_GOLD = 98.4, GRAMS = [470, 690, 1230, 1450];

  function awards(t, lt, dur) {
    const on = t >= T_GOLD ? 1 : 0, bang = after(t, T_GOLD, 2.2), rise = seg(t, 97.2, 98.4);
    const L = on ? 0.85 + 0.15 * pulse(t, 3) : 0.15 + 0.2 * rise;
    const u = easeInOut(lt / dur), [kx, ky] = shakeXY(t, T_GOLD, 12, 0.45);
    skyFill([[0, '#050305'], [1, '#020102']]);
    shoot(t, 960 + kx, lerp(560, 528, u) + ky, lerp(1.0, 1.12, u) + 0.03 * bang, 0.8);

    // the air: a wall of gold light slats behind the stage, haze, beams, the two spots
    layer(4, () => {
      glow(960, 380, 1100, '#7A4C0E', 0.55 * L);
      lit(() => {
        for (let i = 0; i < 18; i++) {
          const x = 70 + i * 104, a = (0.04 + 0.2 * on * (0.6 + 0.4 * Math.sin(t * 1.8 + i * 0.8))) * (0.3 + 0.7 * L);
          ctx.fillStyle = lgrad(0, 180, 0, 760, [[0, rgba('#FFD27A', 0)], [0.45, rgba('#FFD27A', a)], [1, rgba('#FFB040', a * 0.4)]]);
          ctx.fillRect(x, 180, 60, 580);
        }
      });
      haze(t, -200, 250, W + 400, 520, 7, '#E8C38A', 0.05 * L, 5);
      for (let i = 0; i < 8; i++) {
        const fx = 960 + (i - 3.5) * 150, ang = -Math.PI / 2 + (i - 3.5) * 0.16 + Math.sin(t * 0.9 + i) * 0.12;
        cone(fx, 740, fx + Math.cos(ang) * 1100, 740 + Math.sin(ang) * 1100, 6, 120, '#FFD690', 0.2 * on * (0.7 + 0.5 * bang));
      }
      const spot = on ? 0.5 + 0.3 * bang : 0.05 + 0.08 * rise;
      cone(760, -60, 902, 790, 14, 130, '#FFF3DC', spot);
      cone(1160, -60, 1046, 790, 14, 136, '#FFF3DC', spot);
    }, { op: 'lighter' });

    // the stage floor, black and glossy; the spot pools and a warm lip
    rrect(-200, 770, W + 400, 500, 0, { fill: lgrad(0, 770, 0, 1000, [[0, '#17120E'], [0.2, '#0B0806'], [1, '#030202']]), stroke: null });
    lit(() => {
      for (const [x, w] of [[902, 130], [1046, 136]]) {
        ctx.save(); ctx.translate(x, 792); ctx.scale(1, 0.16);
        ctx.fillStyle = rgrad(0, 0, 4, w * 1.3, [[0, rgba('#FFF1D6', on ? 0.5 : 0.08 * (1 + rise))], [1, 'rgba(0,0,0,0)']]);
        ctx.fillRect(-w * 1.3, -w * 1.3, w * 2.6, w * 2.6); ctx.restore();
      }
    });
    rrect(-200, 768, W + 400, 3, 0, { fill: rgba('#FFC870', 0.15 + 0.3 * L), stroke: null });

    // the two of them in the spots, rimmed in warm light; their reflections
    const fig = [[896, 792, 0.6, { hair: GREEN, pose: 'stand' }], [1052, 792, 0.68, { kind: 'him', pose: 'stand' }]];
    for (const [x, y, s, o] of fig) {
      ctx.save(); ctx.globalAlpha = 0.16; ctx.translate(0, y * 2); ctx.scale(1, -1);
      person(x, y, s, { ...o, t, fill: '#120D0A' }); ctx.restore();
      rimPerson(x, y, s, { ...o, t, body: '#070505' }, '#FFE6B8', on ? 0.6 : 0.15 + 0.2 * rise, 14);
    }

    // the four gramophones on the stage front, each under a small top light
    for (let i = 0; i < 4; i++) {
      const x = GRAMS[i], y = 860, s = 0.44;
      glow(x, y - 120, 190, '#FFC860', (on ? 0.35 : 0.1 + 0.1 * rise));
      ctx.save(); ctx.globalAlpha = 0.22; ctx.translate(0, y * 2); ctx.scale(1, -1); gramophone(x, y, s); ctx.restore();
      gramophone(x, y, s, { glint: on ? (t - T_GOLD) * 0.35 + i * 0.27 : 0.2 + i * 0.3 });
    }
    rrect(-200, 862, W + 400, 300, 0, { fill: lgrad(0, 862, 0, 960, [[0, 'rgba(5,4,3,0.55)'], [1, 'rgba(3,2,2,0.95)']]), stroke: null });

    // gold paper through the light
    goldPaper(t, T_GOLD, 170, 11);

    // the hall on its feet: heads out of focus, arms rising one by one, press flashes
    const up = on ? easeOut(clamp((t - T_GOLD) / 1.4)) : 0;
    layer(8, () => { crowdRow(t, 1070, 1.35, 10, 51, { arms: 0.08 + 0.6 * up, jump: 0.2 * up, fill: '#030202' }); }, { box: [-200, 700, W + 400, 500] });
    if (on) camFlashes(t, T_GOLD, 100.8, 40, 200, 1720, 820, 960, 23, 0.8);
    layer(7, () => goldPaper(t, T_GOLD + 0.05, 24, 71, { size: 3.2 }), { alpha: 0.9 });
    camEnd();

    black(0.75 * after(t, T_GOLD, 3.5), '#FFE4A0');
    black(1 - easeOut(seg(t, 96.0, 96.6)));
    yearTag(t, 96.4, '2020', { color: '#FFD27A' });
    caption(t, 96.8, 100.6, '그래미 주요 4개 부문 석권', '역대 최연소 · 올해의 레코드·앨범·노래·신인상');
  }

  // ---- 100.80 · the podium microphone ----------------------------------------------------------

  function micHead(x, y, s, rim) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.35); ctx.scale(s, s);
    rrect(-15, -8, 30, 70, 10, { fill: lgrad(-15, 0, 15, 0, [[0, '#050404'], [0.7, '#15110F'], [1, rgba('#FFE3B8', 0.7 * rim)]]), stroke: null });
    ell(0, -18, 24, 32, { fill: rgrad(8, -30, 2, 34, [[0, rgba('#FFE9C4', 0.55 * rim)], [0.35, '#1A1512'], [1, '#070606']]), stroke: null });
    ctx.globalAlpha = 0.25;
    for (let i = -2; i <= 2; i++) stroke([[i * 8, -46], [i * 9, 10]], '#000000', 1.2, { ink: null });
    ctx.restore();
  }

  function podium(t, lt, dur) {
    const pull = easeInOut(seg(t, 100.8, 102.8)), drift = lt / dur;
    const quiet = 1 - 0.45 * seg(t, 101.0, 104.0);           // the room goes still
    skyFill([[0, '#060405'], [1, '#0A0606']]);
    shoot(t, lerp(1010, 960, pull), lerp(700, 545, pull), lerp(1.7, 1.0, pull) + 0.04 * drift, 0.3);

    // the house: tiers of warm lights far off, out of focus
    layer(10, () => {
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 6; j++) {
        const y = 330 + j * 72, n = 26 + j * 4;
        for (let i = 0; i < n; i++) {
          const x = -80 + (i + hash(i, j + 3)) * (W + 160) / n + Math.sin(j) * 30;
          const a = quiet * (0.25 + 0.4 * hash(i, j + 9)) * (0.8 + 0.2 * Math.sin(t * 0.7 + i + j));
          ctx.fillStyle = rgba(hash(i, j) < 0.2 ? '#FFE8C0' : '#FFB25E', a);
          ctx.beginPath(); ctx.arc(x, y + Math.sin(x / 300) * 20, 6 + j * 2.4, 0, TAU); ctx.fill();
        }
      }
      glow(960, 520, 900, '#5A2E14', 0.4 * quiet);
    }, { op: 'lighter' });

    // the follow spot from the back of the house, toward us: a source, a beam in haze, a flare
    const SX = 1330, SY = 250;
    layer(5, () => {
      cone(SX, SY, 1000, 1100, 16, 520, '#FFF1DA', 0.22);
      haze(t, 300, 250, 1500, 650, 7, '#FFDDB0', 0.05, 13);
    }, { op: 'lighter' });
    glow(SX, SY, 260, '#FFF1DA', 0.5);
    glow(SX, SY, 60, '#FFFFFF', 0.9);
    flare(SX, SY, 0.7, '#FFE9C8');

    // gold paper still drifting down through the beam, in slow motion
    layer(2, () => {
      for (let i = 0; i < 14; i++) {
        const x = 700 + hash(i, 5) * 900 + Math.sin(t * 0.8 + i) * 40, y = 150 + frac(hash(i, 6) + t * 0.035) * 800;
        const flip = Math.cos(t * 1.4 + i * 2);
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 + i); ctx.scale(1, Math.max(0.1, Math.abs(flip)));
        ctx.fillStyle = flip > 0.7 ? '#FFF2D0' : mix('#6A4410', '#E8BC58', 0.5 + 0.5 * flip);
        ctx.fillRect(-9, -5, 18, 10); ctx.restore();
      }
    });

    // the lectern and its gooseneck microphone, backlit, in focus
    poly([[720, 905], [1280, 905], [1320, 1200], [680, 1200]], { fill: lgrad(0, 900, 0, 1100, [[0, '#0E0A08'], [1, '#040303']]), stroke: null });
    rrect(700, 892, 600, 16, 4, { fill: lgrad(700, 0, 1300, 0, [[0, '#120D0A'], [0.6, '#2A1E16'], [0.8, '#6A4C34'], [1, '#1A120E']]), stroke: null });
    rrect(700, 890, 600, 2, 1, { fill: rgba('#FFE0B0', 0.45), stroke: null });
    ctx.strokeStyle = '#0A0808'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1020, 892); ctx.bezierCurveTo(1030, 820, 1010, 790, 990, 752); ctx.stroke();
    ctx.strokeStyle = rgba('#FFE3B8', 0.55); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(1023, 890); ctx.bezierCurveTo(1033, 820, 1013, 790, 993, 752); ctx.stroke();
    rrect(1004, 884, 34, 10, 3, { fill: '#0C0909', stroke: null });
    micHead(986, 745, 1.35, 1);
    glow(996, 722, 50, '#FFE3B8', 0.25);

    // the two of them from behind, standing either side of it, slightly soft, rimmed by the spot
    layer(2.5, () => {
      backFigure(560, 870, 0.66, { hair: GREEN, strands: '#FFE7C4', rim: '#FFE7C4', rimA: 0.5, rimBlur: 10, body: '#060404' });
      backFigure(1440, 858, 0.74, { suit: true, rim: '#FFE7C4', rimA: 0.5, rimBlur: 10, body: '#050404' });
    }, { box: [300, 700, 1400, 500] });
    camEnd();

    black(0.45 * after(t, 100.8, 3), '#000000');
    quote(t, 101.0, 107.6, '침실에서 음악을 만드는 모든 아이들에게.\n언젠가 너희도 이걸 받게 될 거야.', '피니어스, 2020 그래미 수상 소감');
    black(0.5 * easeIn(seg(t, 107.7, 108.0)), '#FFFFFF');
  }

  // ---- 108.00 · montage: a barrel, a reel, a festival -------------------------------------------

  const CAP = ['007 〈노 타임 투 다이〉 주제가로 첫 아카데미상', '2022년 · 글래스턴베리 역대 최연소 단독 헤드라이너'];

  function barrel(t, lt) {
    skyFill([[0, '#000000'], [1, '#000000']]);
    const [hx, hy, hr] = handheld(t, 0.6);
    const z = 1 + lt * 0.3 + easeIn(seg(t, 109.25, 109.8)) * 7, rot = t * 0.9 + hr;
    ctx.save(); ctx.translate(960 + hx, 540 + hy); ctx.rotate(rot); ctx.scale(z, z);
    const K = 14;
    for (let k = 0; k < K; k++) {
      const r0 = 1100 * Math.pow(0.76, k), r1 = r0 * 0.76, b = Math.pow(k / K, 1.6);
      ctx.fillStyle = rgrad(0, 0, r1, r0, [[0, mix('#1A1C20', '#C4CAD2', b)], [0.5, mix('#0C0D10', '#6A7078', b)], [1, mix('#050506', '#2A2D33', b)]]);
      ctx.beginPath(); ctx.arc(0, 0, r0, 0, TAU); ctx.arc(0, 0, r1, 0, TAU, true); ctx.fill();
      for (let g = 0; g < 6; g++) {
        const a0 = g * TAU / 6 + k * 0.42;
        ctx.strokeStyle = rgba('#000000', 0.55); ctx.lineWidth = r0 * 0.05;
        ctx.beginPath(); ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); ctx.lineTo(Math.cos(a0 + 0.42) * r1, Math.sin(a0 + 0.42) * r1); ctx.stroke();
        ctx.strokeStyle = rgba('#E6ECF4', 0.12 + 0.4 * b); ctx.lineWidth = r0 * 0.012;
        ctx.beginPath(); ctx.moveTo(Math.cos(a0 + 0.06) * r0, Math.sin(a0 + 0.06) * r0); ctx.lineTo(Math.cos(a0 + 0.48) * r1, Math.sin(a0 + 0.48) * r1); ctx.stroke();
      }
    }
    const rEnd = 1100 * Math.pow(0.76, K);
    glow(0, 0, rEnd * 5, '#FFFFFF', 0.9);
    circle(0, 0, rEnd, { fill: '#FFFFFF', stroke: null });
    ctx.restore();
    iris(960 + hx, 540 + hy, 470 * (1 + lt * 0.3) + 2000 * easeIn(seg(t, 109.0, 109.6)), '#000000');
    black(0.8 * after(t, 108.0, 4), '#FFFFFF');
    black(easeIn(seg(t, 109.5, 109.8)), '#FFF6E6');
    caption(t, 108.3, 115.0, CAP[0], CAP[1]);
  }

  function reel(t, lt, dur) {
    const u = easeInOut(lt / dur), ang = lt * 2.2, CX = 820, CY = 545, R = 360;
    skyFill([[0, '#0A0706'], [1, '#050303']]);
    shoot(t, lerp(900, 880, u), 540, lerp(1.0, 1.07, u), 0.5);
    // the lamp behind the reel, and light spilling around it into the haze
    glow(CX + 40, CY - 20, 900, '#FFC888', 0.35);
    glow(CX + 40, CY - 20, 420, '#FFF1DA', 0.7);
    lit(() => {
      for (let i = 0; i < 6; i++) {
        const a = ang + i * TAU / 6;
        for (const [w, al] of [[0.2, 0.05], [0.12, 0.07], [0.06, 0.08]]) {
          ctx.fillStyle = lgrad(CX, CY, CX + Math.cos(a) * 1500, CY + Math.sin(a) * 1500, [[0.12, `rgba(255,236,200,${al})`], [1, 'rgba(255,236,200,0)']]);
          ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, 1500, a - w, a + w); ctx.closePath(); ctx.fill();
        }
      }
    });
    haze(t, 0, 200, W, 700, 6, '#FFD8A8', 0.05, 7);
    // the film wound on the hub, seen through the holes
    circle(CX, CY, 238, { fill: rgrad(CX, CY, 40, 238, [[0, '#1A0F08'], [0.9, '#2E1C10'], [1, '#7A5230']]), stroke: null });
    ctx.save(); ctx.globalAlpha = 0.2;
    for (let r = 70; r < 236; r += 9) { ctx.strokeStyle = r % 2 ? '#5A3A22' : '#140A04'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
    // the flange: a metal disc with six holes, turning
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(ang);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      ctx.moveTo(Math.cos(a - 0.22) * 132, Math.sin(a - 0.22) * 132);
      ctx.arc(0, 0, 300, a - 0.3, a + 0.3);
      ctx.arc(0, 0, 132, a + 0.22, a - 0.22, true);
      ctx.closePath();
    }
    ctx.fillStyle = rgrad(-80, -80, 20, R * 1.2, [[0, '#2A2622'], [0.6, '#14110F'], [1, '#080706']]);
    ctx.fill('evenodd');
    ctx.strokeStyle = rgba('#FFE2B8', 0.5); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R - 2, -2.4 - ang, -0.6 - ang); ctx.stroke();
    circle(0, 0, 46, { fill: '#1C1917', stroke: null });
    rrect(-11, -11, 22, 22, 3, { fill: rgba('#FFE8C8', 0.7), stroke: null });
    ctx.restore();
    // the film leaving the reel toward us, out of focus, its frames glowing
    layer(6, () => {
      ctx.save(); ctx.translate(1180, 780); ctx.rotate(-0.28);
      rrect(-420, -70, 1400, 140, 0, { fill: '#120B07', stroke: null });
      for (let i = 0; i < 24; i++) {
        const x = -420 + frac(i / 24 - t * 0.09) * 1400;
        rrect(x + 10, -44, 46, 88, 3, { fill: rgba('#FFB866', 0.35), stroke: null });
        rrect(x + 22, -64, 12, 10, 2, { fill: rgba('#FFE9C8', 0.6), stroke: null });
        rrect(x + 22, 54, 12, 10, 2, { fill: rgba('#FFE9C8', 0.6), stroke: null });
      }
      ctx.restore();
    }, { box: [600, 450, 1500, 700] });
    dust(t, 200, 200, 1500, 700, 50, '#FFE6C0');
    camEnd();
    black(0.9 * after(t, 109.8, 3.5), '#FFF6E6');
    black(easeIn(seg(t, 111.4, 111.6)) * 0.6, '#000000');
    caption(t, 108.3, 115.0, CAP[0], CAP[1]);
  }

  function festival(t, lt, dur) {
    const u = easeInOut(lt / dur), HZ = 470;
    skyFill([[0, '#1E1230'], [0.25, '#4A2A5A'], [0.4, '#B06A8A'], [0.46, '#F0A8A0'], [1, '#1A0E16']]);
    shoot(t, 960, lerp(600, 530, u), lerp(1.2, 1.0, u), 0.6);
    // dusk: soft cloud streaks, the last of the sun on the horizon
    lit(() => {
      for (let i = 0; i < 6; i++) {
        const y = 180 + i * 42, x = -300 + frac(hash(i, 2) + t * 0.004) * 2400;
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.08);
        ctx.fillStyle = rgrad(0, 0, 0, 700, [[0, 'rgba(255,190,190,0.14)'], [1, 'rgba(255,190,190,0)']]);
        ctx.fillRect(-700, -700, 1400, 1400); ctx.restore();
      }
    });
    glow(1250, HZ, 600, '#FFC0A0', 0.35);
    // the field of people, to the horizon: a dark plain, then rows of heads getting bigger toward us
    rrect(-300, HZ, W + 600, 900, 0, { fill: lgrad(0, HZ, 0, 1100, [[0, '#8A5076'], [0.06, '#4A2848'], [0.3, '#24122A'], [0.7, '#12091A'], [1, '#070409']]), stroke: null });
    const ROWS = 38;
    for (let j = 0; j < ROWS; j++) {
      const v = Math.pow((j + 1) / ROWS, 2.1), y = HZ + 4 + (1150 - HZ) * v, sz = 1.1 + 36 * v;
      const n = Math.min(520, Math.ceil((W + 600) / (sz * 2.3)));
      ctx.fillStyle = mix('#5A3052', '#050307', Math.min(1, v * 2.2)); ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = -300 + (i + hash(i, j)) * (W + 600) / n, bob = Math.max(0, Math.sin(t * 5.2 + i * 0.7 + j)) * sz * 0.25;
        const hy = y - hash(i, j + 50) * sz * 0.6 - bob;
        ctx.moveTo(x + sz, hy); ctx.ellipse(x, hy, sz, sz * 1.15, 0, 0, TAU);
      }
      ctx.fill();
    }
    // phones and lights held up across the field, twinkling
    lit(() => {
      for (let i = 0; i < 1400; i++) {
        const v = Math.pow(hash(i, 3), 1.7), y = HZ + 6 + (1100 - HZ) * v - (4 + 50 * v) * hash(i, 4);
        const x = -300 + hash(i, 5) * (W + 600), sz = 0.8 + 5 * v;
        const a = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1 + hash(i, 6) * 3) + i));
        ctx.fillStyle = rgba(hash(i, 7) < 0.8 ? '#F2F6FF' : '#FFD8A0', a);
        ctx.fillRect(x - sz / 2, y - sz, sz, sz * 1.6);
        if (v > 0.5 && hash(i, 8) < 0.4) { ctx.fillStyle = rgrad(x, y, 0, sz * 6, [[0, rgba('#DDE6FF', 0.3 * a)], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(x - sz * 6, y - sz * 6, sz * 12, sz * 12); }
      }
    });
    // flags on poles, far and near, moving in the wind
    for (let i = 0; i < 9; i++) {
      const v = 0.1 + 0.5 * hash(i, 31), x = hash(i, 32) * W, y = HZ + (1100 - HZ) * v * v, hgt = 40 + 260 * v * v;
      stroke([[x, y], [x, y - hgt]], '#0A060C', 1 + 3 * v, { ink: null });
      const fw = 16 + 70 * v * v, fh = fw * 0.6, wv = Math.sin(t * 4 + i) * fh * 0.25;
      poly([[x, y - hgt], [x + fw, y - hgt + wv], [x + fw, y - hgt + fh + wv], [x, y - hgt + fh]], { fill: mix('#2A1426', '#08040A', v), stroke: null });
    }
    // stage lights from over our shoulders sweeping the field, pooling on the crowd
    layer(4, () => {
      glow(960, HZ, 1100, '#C07090', 0.25);
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, fx = 960 + side * (300 + 250 * Math.floor(i / 2)), fy = 160;
        const ex = 960 + side * 200 + Math.sin(t * 0.7 + i * 1.3) * 900, ey = HZ + 90 + 260 * hash(i, 41);
        const col = i % 3 ? '#FFE8F0' : '#FFC7A8';
        cone(fx, fy, ex, ey, 8, 160, col, 0.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(ex, ey); ctx.scale(1, 0.28);
        ctx.fillStyle = rgrad(0, 0, 0, 300, [[0, rgba(col, 0.28)], [1, rgba(col, 0)]]);
        ctx.fillRect(-300, -300, 600, 600); ctx.restore();
      }
    }, { op: 'lighter' });
    // her at the lip of the stage, from behind, arms up; the stage floor under our feet
    rrect(-300, 900, W + 600, 400, 0, { fill: lgrad(0, 900, 0, 1100, [[0, '#140C14'], [0.3, '#08050A'], [1, '#030204']]), stroke: null });
    rrect(-300, 898, W + 600, 3, 0, { fill: rgba('#FFC7C0', 0.3), stroke: null });
    for (const x of [640, 1280]) poly([[x - 70, 905], [x + 70, 905], [x + 58, 862], [x - 50, 872]], { fill: '#07050A', stroke: null });
    rimPerson(960, 912, 0.56, { t, pose: 'arms', hair: '#1A1320', body: '#060408' }, '#FFD6E0', 0.7, 14);
    camEnd();
    black(0.7 * after(t, 111.6, 4), '#000000');
    black(easeIn(seg(t, 114.55, 115.2)) * 0.92, '#1A0E16');
    caption(t, 108.3, 115.0, CAP[0], CAP[1]);
  }

  chapter('world', 96.0, 115.2, [[96.0, awards], [100.8, podium], [108.0, barrel], [109.8, reel], [111.6, festival]]);
})();
