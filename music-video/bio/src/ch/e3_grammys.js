// e3_grammys (67.20 – 96.00) · 빛, 그리고 그림자.
// The loudest shot to the quietest. 67.20: a festival-size stage in haze, beams and lasers, a
// green-haired faceless silhouette at the mic, a crowd of raised phones and camera flashes (the
// city lights of the globe rack-focus into the crowd). 76.80: the lights cut; a dark dressing
// room, only the make-up mirror's bulb frame alight, her back to us on a stool while the door in
// the mirror closes on the roar. 86.40: a window at dawn; the sheer curtain draws back, cold light
// finds the standing silhouette, and far-off windows in the city come on one by one.
// Faceless figures, objects and light only; no logos.
(() => {
  const GREEN = '#7ED321', LIME = BIO.lime;
  const T_ROOM = 76.8, T_DAWN = 86.4;

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
  /** Throw the whole frame so far out of focus (a rack focus). */
  function defocus(px, a = 1) {
    if (px < 0.3) return;
    const [c, g] = buf(0);
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(cv, 0, 0, c.width, c.height);
    const out = blurDown(c, px, [0, 0, c.width, c.height], 1);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    ctx.drawImage(out, 0, 0, cv.width, cv.height);
    ctx.restore();
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

  function figureShape(o, fill, hairFill) {
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
      for (const d of [-1, 1]) { limb([[d * (sh - 8), -418], [d * 92, -500]], sw); limb([[d * 92, -500], [d * (112 + sway), -590]], fw); circle(d * (114 + sway), -600, 12, F); }
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

  // ---- 67.20 · the stage ------------------------------------------------------------------------

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

  function stage(t, lt, dur) {
    const cut = 1 - seg(t, 76.05, 76.3);                     // the lights cut before the dressing room
    const hit = after(t, 73.8, 3.2) + after(t, 67.2, 2.5) * 0.8;
    const p = pulse(t, 4), I = cut * (0.72 + 0.28 * p);
    const u = easeInOut(lt / dur);
    skyFill([[0, '#040308'], [0.55, '#09080F'], [1, '#030305']]);
    shoot(t, 960, lerp(560, 515, u), lerp(1.0, 1.17, u), 1.5);

    // all the air light in one soft layer: the green wash, the LED strips, haze, the beams
    const fixtures = [];
    for (let i = 0; i < 9; i++) {
      const fx = 180 + i * 195, fy = 176;
      const sw = Math.sin(t * 0.8 + i * 0.9) * 0.42 * (i % 2 ? 1 : -1);
      const ang = Math.PI / 2 + sw + (i - 4) * 0.07;
      const col = hit > 0.25 ? '#FFFFFF' : [LIME, '#EAF4FF', GREEN][i % 3];
      const on = cut * (0.55 + 0.45 * Math.max(0, Math.sin(beatOf(t) * Math.PI / 2 + i * 1.3)));
      fixtures.push([fx, fy, ang, col, on]);
    }
    layer(3, () => {
      glow(960, 430, 1000, '#1E5A10', 0.4 * I);
      glow(960, 520, 520, '#E6FFD8', (0.2 + 0.4 * hit) * I);
      lit(() => {
        for (let i = 0; i < 15; i++) {
          const x = 300 + i * 88, a = (0.04 + 0.1 * Math.max(0, Math.sin(t * 2.2 - i * 0.7))) * I;
          ctx.fillStyle = lgrad(0, 240, 0, 720, [[0, rgba(i % 4 ? GREEN : '#FFFFFF', 0)], [0.5, rgba(i % 4 ? GREEN : '#FFFFFF', a)], [1, rgba(GREEN, a * 0.3)]]);
          ctx.fillRect(x, 240, 46, 480);
        }
      });
      haze(t, -200, 240, W + 400, 540, 8, '#A6C4A0', 0.04 * (0.3 + 0.7 * cut), 3);
      for (const [fx, fy, ang, col, on] of fixtures) {
        cone(fx, fy, fx + Math.cos(ang) * 1150, fy + Math.sin(ang) * 1150, 8, 170, col, (0.2 + 0.25 * hit) * on);
      }
      for (let i = 0; i < 6; i++) {
        const side = i < 3 ? -1 : 1, j = i % 3, fx = 960 + side * (120 + j * 170), fy = 728;
        const ang = -Math.PI / 2 + side * (0.25 + j * 0.2 + 0.08 * Math.sin(t * 1.1 + i));
        cone(fx, fy, fx + Math.cos(ang) * 900, fy + Math.sin(ang) * 900, 6, 90, '#F2FFE8', 0.18 * I);
      }
    }, { op: 'lighter' });

    // the truss and the lenses of its moving heads
    rrect(-100, 150, W + 200, 26, 6, { fill: '#0B0B10', stroke: null });
    for (const [fx, fy, , col, on] of fixtures) {
      rrect(fx - 20, fy - 4, 40, 34, 8, { fill: '#121218', stroke: null });
      glow(fx, fy + 22, 70, col, 0.9 * on);
      circle(fx, fy + 22, 7, { fill: rgba('#FFFFFF', on), stroke: null });
    }

    // stage floor, glossy, with the light pooled on it and the pars at its back edge
    rrect(-200, 735, W + 400, 500, 0, { fill: lgrad(0, 735, 0, 1000, [[0, '#15161A'], [0.25, '#0A0A0D'], [1, '#020203']]), stroke: null });
    lit(() => {
      ctx.save(); ctx.translate(960, 752); ctx.scale(1, 0.12);
      ctx.fillStyle = rgrad(0, 0, 10, 640, [[0, rgba('#E6FFD8', 0.55 * I)], [0.35, rgba(GREEN, 0.18 * I)], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(-660, -660, 1320, 1320); ctx.restore();
    });
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, fx = 960 + side * (120 + (i % 3) * 170);
      glow(fx, 728, 50, '#F2FFE8', 0.7 * I);
    }
    rrect(-200, 733, W + 400, 3, 0, { fill: rgba(LIME, 0.35 * I), stroke: null });

    // lasers, in bursts on the bar
    const laserOn = cut * clamp(Math.sin(barOf(t) * Math.PI) * 1.6 - 0.3);
    if (laserOn > 0) lit(() => {
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * (0.08 + 0.84 * (i / 13)) + Math.sin(t * 1.4 + i * 0.4) * 0.12;
        const ex = 960 + Math.cos(a) * 2200, ey = 300 + Math.sin(a) * 2200 * 0.55;
        ctx.globalAlpha = 0.12 * laserOn; ctx.strokeStyle = LIME; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(960, 300); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = 0.5 * laserOn; ctx.lineWidth = 1.4; ctx.stroke();
      }
    });

    // her: small against a white backlight, the light wrapping her edges
    const sx = 960, sy = 748, ss = 0.52;
    glow(sx, sy - 150, 300, '#F2FFE8', (0.35 + 0.3 * hit) * I);
    rimPerson(sx, sy, ss, { t, hair: GREEN, pose: 'mic', body: '#050408' }, '#F0FFE8', 0.55 * cut, 18);
    ctx.save(); ctx.globalAlpha = 0.2; ctx.translate(0, sy * 2); ctx.scale(1, -1);
    person(sx, sy, ss, { t, pose: 'mic', fill: '#0A0A10' });
    ctx.restore();
    // smoke low over the stage lip
    haze(t * 1.6, 200, 700, 1520, 60, 6, '#C8D8C4', 0.045 * (0.3 + 0.7 * cut), 9);

    // the crowd: the near rows out of focus, heads cut against the lit stage, phones up
    let ph1, ph2;
    layer(2.5, () => { ph1 = crowdRow(t, 850, 0.72, 20, 21, { arms: 0.3, jump: 1 }); phoneLights(ph1, 0.8 * (0.5 + 0.5 * cut)); }, { box: [-200, 560, W + 400, 440] });
    const fl = camFlashes(t, 67.3, 76.0, 34, 250, 1670, 730, 860, 5, 0.8)
      + camFlashes(t, 67.3, 76.0, 10, 150, 1770, 220, 680, 15, 0.55);
    layer(10, () => {
      ph2 = crowdRow(t, 1040, 1.5, 9, 41, { arms: 0.45, jump: 1.3, fill: '#010102' });
      phoneLights(ph2, 0.7 * (0.5 + 0.5 * cut));
      lit(() => {                                          // phones and lighters right in front of the lens
        for (let i = 0; i < 24; i++) {
          const x = -100 + hash(i, 3) * (W + 200) + Math.sin(t * 0.3 + i) * 10, y = 800 + hash(i, 4) * 220;
          ctx.globalAlpha = 0.5 * (0.6 + 0.4 * Math.sin(t * (0.5 + hash(i, 5)) + i)) * (0.5 + 0.5 * cut);
          ctx.fillStyle = ['#DDE8FF', '#B6FF3B', '#FFFFFF'][i % 3];
          ctx.beginPath(); ctx.arc(x, y, 6 + hash(i, 6) * 20, 0, TAU); ctx.fill();
        }
      });
    }, { box: [-200, 600, W + 400, 600] });
    camEnd();

    black(0.08 * fl * cut, '#FFFFFF');
    black(0.3 * after(t, 73.8, 5), '#F4FFE8');
    // arriving: the city lights of the globe rack-focus into the crowd, with the first hit
    defocus(18 * (1 - easeOut(seg(t, 67.2, 68.1))));
    black(0.25 * after(t, 67.2, 6), '#FFFFFF');
    // and leaving: blackout
    black(easeIn(seg(t, 76.2, 76.75)));

    const out = 1 - seg(t, 75.9, 76.4);
    yearTag(t, 67.5, '2019', { alpha: out });
    caption(t, 67.9, 76.2, '데뷔 앨범 빌보드 200 1위 · “bad guy” 핫 100 1위', '열일곱 살');
  }

  // ---- 76.80 · the dressing room ---------------------------------------------------------------

  const MX = 560, MY = 176, MW = 800, MH = 452;
  function bulbSpots() {
    const b = [];
    for (let i = 0; i < 9; i++) b.push([MX + 20 + i * (MW - 40) / 8, MY - 24]);
    for (let i = 0; i < 5; i++) { const y = MY + 40 + i * (MH - 80) / 4; b.push([MX - 26, y]); b.push([MX + MW + 26, y]); }
    return b;
  }
  const BULBS = bulbSpots();
  const DEAD = 12;                                      // one bulb has gone, as they do

  /** How bright bulb i is now: on at the start, a faint flicker on one, off one by one at the end. */
  function bulbOn(t, i) {
    if (i === DEAD) return 0;
    const up = clamp((t - T_ROOM - 0.05 - (i % 7) * 0.03) / 0.25);
    const off = t > 85.7 + ((i * 5) % BULBS.length) / BULBS.length * 0.55 ? 0 : 1;
    const flick = i === 5 ? 0.82 + 0.18 * Math.max(Math.sin(t * 31), Math.sin(t * 7.3 + 1)) : 1;
    return up * off * flick;
  }

  function mirrorWorld(t, on) {
    // what the mirror sees: the dark room behind the camera, a rack of clothes, the door
    rrect(MX, MY, MW, MH, 0, { fill: lgrad(0, MY, 0, MY + MH, [[0, '#15110F'], [0.6, '#0E0B0A'], [1, '#191310']]), stroke: null });
    ctx.save(); ctx.beginPath(); ctx.rect(MX, MY, MW, MH); ctx.clip();
    // reflected ceiling glow of the bulbs
    glow(MX + MW / 2, MY + 30, 520, '#FFB877', 0.2 * on);
    // the door on the far wall: a sliver of stage light closing on the roar, then a line under it
    const open = 1 - easeInOut(seg(t, 76.95, 78.7));
    const dx = 1165, dy = 250, dh = 330;
    rrect(dx - 8, dy - 8, 120, dh + 8, 2, { fill: '#0A0807', stroke: null });
    const sw = 2 + 66 * open;
    lit(() => {
      ctx.fillStyle = lgrad(dx, 0, dx + sw, 0, [[0, rgba('#FFF4DC', 0.3 + 0.65 * open)], [1, rgba('#FFE0B0', 0.2 + 0.35 * open)]]);
      ctx.fillRect(dx, dy, sw, dh);
      ctx.fillStyle = lgrad(dx, 0, dx + 112, 0, [[0, 'rgba(255,231,192,0)'], [0.5, rgba('#FFE7C0', 0.35)], [1, 'rgba(255,231,192,0)']]);
      ctx.fillRect(dx, dy + dh - 2, 112, 2);
      // the spill on the floor in front of it
      ctx.fillStyle = rgrad(dx + 30, dy + dh + 20, 4, 180, [[0, rgba('#FFE0B0', 0.35 * (0.2 + open))], [1, 'rgba(0,0,0,0)']]);
      ctx.save(); ctx.translate(dx + 30, dy + dh + 20); ctx.scale(1.6, 0.25); ctx.translate(-(dx + 30), -(dy + dh + 20));
      ctx.fillRect(dx - 300, dy + dh - 200, 660, 440); ctx.restore();
    });
    glow(dx + 20, dy + dh / 2, 200, '#FFE0B0', 0.25 * open);
    // a clothes rack, out of focus
    layer(3, () => {
      rrect(620, 300, 420, 6, 3, { fill: '#2A221D', stroke: null });
      for (let i = 0; i < 6; i++) {
        const x = 650 + i * 64 + hash(i, 3) * 20, len = 170 + hash(i, 4) * 90;
        smooth([[x - 30, 310], [x + 30, 310], [x + 38, 310 + len], [x - 38, 310 + len]], { fill: mix('#0F0C0A', '#231A15', hash(i, 5)), stroke: null });
        glow(x - 20, 330, 40, '#FFB877', 0.05 * on);
      }
    }, { box: [600, 290, 480, 300] });
    // the bulbs seen again in the glass, at its edges
    for (let i = 0; i < BULBS.length; i++) {
      const [x, y] = BULBS[i], k = bulbOn(t, i);
      const rx = x < MX ? MX + 8 : x > MX + MW ? MX + MW - 8 : x, ry = y < MY ? MY + 8 : y;
      glow(rx, ry, 46, '#FFD8A0', 0.35 * k);
    }
    // the glass: a faint diagonal sheen
    lit(() => {
      ctx.fillStyle = lgrad(MX, MY, MX + MW, MY + MH, [[0, 'rgba(255,240,220,0.0)'], [0.3, 'rgba(255,240,220,0.05)'], [0.34, 'rgba(255,240,220,0.0)'], [0.62, 'rgba(255,240,220,0.03)'], [0.7, 'rgba(255,240,220,0)']]);
      ctx.fillRect(MX, MY, MW, MH);
    });
    ctx.restore();
  }

  function bulbs(t) {
    for (let i = 0; i < BULBS.length; i++) {
      const [x, y] = BULBS[i], k = bulbOn(t, i);
      circle(x, y + 3, 17, { fill: '#1A1512', stroke: null });                   // socket shadow
      if (k > 0.01) {
        glow(x, y, 120, '#FFC98A', 0.38 * k);
        circle(x, y, 15, { fill: rgrad(x - 4, y - 4, 1, 16, [[0, '#FFFFFF'], [0.5, mix('#6A5A48', '#FFF1D8', k)], [1, mix('#3A3028', '#FFC88A', k)]]), stroke: null });
      } else {
        circle(x, y, 15, { fill: rgrad(x - 4, y - 5, 1, 16, [[0, '#6A625C'], [1, '#2A2522']]), stroke: null });
      }
    }
  }

  function dressing(t, lt, dur) {
    const on = BULBS.reduce((a, _, i) => a + bulbOn(t, i), 0) / (BULBS.length - 1);
    const u = easeInOut(lt / dur);
    skyFill([[0, '#0B0908'], [1, '#050404']]);
    shoot(t, lerp(965, 945, u), lerp(520, 478, u), lerp(1.0, 1.075, u), 0.45);

    // the wall, warmed by the bulbs
    rrect(-200, -100, W + 400, 800, 0, { fill: '#100C0B', stroke: null });
    glow(960, 400, 1000, '#FF9E5A', 0.22 * on);
    // the mirror frame and the glass
    rrect(MX - 52, MY - 54, MW + 104, MH + 90, 10, { fill: lgrad(0, MY - 54, 0, MY + MH + 36, [[0, '#3A2E26'], [0.5, '#241C17'], [1, '#17120F']]), stroke: null });
    mirrorWorld(t, on);
    bulbs(t);
    dust(t, MX - 60, MY - 60, MW + 120, MH + 200, 46, '#FFE3BE');

    // the counter: a glossy top catching the bulbs, a dark front
    rrect(-200, 640, W + 400, 70, 0, { fill: lgrad(0, 640, 0, 712, [[0, mix('#1C1512', '#4A382C', on)], [1, '#140F0D']]), stroke: null });
    lit(() => {
      for (const [x, y] of BULBS) if (y > MY) {
        ctx.save(); ctx.translate(x, 660); ctx.scale(0.5, 1);
        ctx.fillStyle = rgrad(0, 0, 0, 50, [[0, rgba('#FFC98A', 0.2 * on)], [1, 'rgba(0,0,0,0)']]);
        ctx.fillRect(-50, -20, 100, 70); ctx.restore();
      }
    });
    rrect(-200, 708, W + 400, 5, 0, { fill: rgba('#FFD7A8', 0.28 * on), stroke: null });
    rrect(-200, 713, W + 400, 500, 0, { fill: lgrad(0, 713, 0, 1000, [[0, '#0E0A09'], [1, '#050404']]), stroke: null });

    // things on the counter: a paper cup, a brush, a water bottle, a hoodie
    rrect(686, 628, 44, 60, 6, { fill: lgrad(686, 0, 730, 0, [[0, '#2A2420'], [0.35, mix('#3A322C', '#E8D6C0', on * 0.8)], [1, '#1E1A17']]), stroke: null });
    ell(600, 690, 46, 13, { fill: '#17110E', stroke: null }, -0.1);
    rrect(520, 684, 64, 10, 5, { fill: '#1D1612', stroke: null });
    // the bottle: clear plastic, lit from above
    rrect(1262, 548, 42, 146, 12, { fill: lgrad(1262, 0, 1304, 0, [[0, 'rgba(160,190,210,0.10)'], [0.3, 'rgba(255,240,220,0.25)'], [1, 'rgba(120,140,160,0.08)']]), stroke: null });
    rrect(1270, 530, 26, 22, 4, { fill: '#2B3A48', stroke: null });
    rrect(1274, 560, 5, 118, 3, { fill: rgba('#FFF1DC', 0.55 * on), stroke: null });
    rrect(1266, 640, 34, 50, 10, { fill: 'rgba(170,200,220,0.12)', stroke: null });
    smooth([[1110, 694], [1130, 664], [1200, 652], [1236, 670], [1232, 696]], { fill: lgrad(0, 650, 0, 700, [[0, mix('#1A1614', '#4A3C33', on)], [1, '#110D0C']]), stroke: null });

    // her, on a stool with her back to us, head a little bowed; the bulbs rim her hair and hood
    const breathe = Math.sin(t * 1.3) * 3;
    backFigure(935, 640 + breathe, 1.05, { hair: GREEN, strands: '#E8D0A0', rim: '#FFC98A', rimA: 0.55 * on, rimBlur: 14, rot: -0.015, body: '#060505' });

    // foreground: the door frame at the left, a jacket on a hook at the right, both soft
    layer(12, () => {
      rrect(-60, -100, 170, 1300, 0, { fill: '#050404', stroke: null });
      rrect(96, -100, 10, 1300, 0, { fill: rgba('#FFB877', 0.12 * on), stroke: null });
    }, { box: [-60, -100, 170, 1300] });
    layer(12, () => {
      smooth([[1760, 120], [1830, 110], [1900, 200], [1960, 760], [1700, 820], [1720, 300]], { fill: '#060505', stroke: null });
    }, { box: [1690, 100, 290, 740] });
    camEnd();

    black(1 - easeOut(seg(t, T_ROOM, T_ROOM + 0.5)));
    black(0.5 * easeIn(seg(t, 85.9, 86.4)));
    narration(t, 77.4, 85.8, '무대 밖에서는 우울증과,\n열한 살에 진단받은 투렛 증후군과 싸웠다', { y: 812, size: 50, per: 0.07 });
  }

  // ---- 86.40 · the window at dawn --------------------------------------------------------------

  const WX = 900, WY = 110, WW = 660, WH = 800;

  /** A band of buildings seen from a high floor: tops between yTop and yTop + dh, windows lit over time. */
  function skyline(t, yTop, dh, wMin, wMax, color, win, seed, lightsFrom, lightsTo, density = 0.16) {
    let x = WX - 60;
    const wins = [];
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; x < WX + WW + 60; i++) {
      const w = wMin + hash(i, seed) * (wMax - wMin), top = yTop + hash(i, seed + 1) * dh;
      ctx.rect(x, top, w - win * 0.4, WY + WH - top + 40);
      const nw = Math.floor((w - win) / (win * 2.2)), nh = Math.floor((WY + WH - top) / (win * 2.4));
      for (let a = 0; a < nw; a++) for (let b = 0; b < nh; b++) {
        const k = hash(i * 131 + a, b + seed);
        if (k < density) wins.push([x + win * 0.8 + a * win * 2.2, top + win + b * win * 2.4, lightsFrom + hash(i * 17 + a, b + 3) * (lightsTo - lightsFrom), k]);
      }
      x += w;
    }
    ctx.fill();
    lit(() => {
      for (const [wx, wy, on, k] of wins) {
        const a = clamp((t - on) / 0.25);
        if (a <= 0) continue;
        ctx.fillStyle = rgba(k < density * 0.3 ? '#CFE3FF' : '#FFD08A', 0.8 * a);
        ctx.fillRect(wx, wy, win, win * 1.2);
      }
    });
  }

  /** A curtain panel from x0 to x1 (folds as a stripe gradient). sheer = translucent. */
  function curtain(t, x0, x1, y0, y1, sheer, seed) {
    const w = x1 - x0; if (w < 2) return;
    const g = ctx.createLinearGradient(x0, 0, x1, 0), n = Math.max(3, Math.round(w / 46));
    for (let i = 0; i <= n; i++) {
      const k = i / n, f = 0.5 + 0.5 * Math.sin(i * 2.4 + seed + Math.sin(t * 0.6 + i) * 0.3);
      g.addColorStop(k, sheer ? `rgba(${lerp(150, 220, f) | 0},${lerp(170, 228, f) | 0},${lerp(200, 240, f) | 0},${lerp(0.28, 0.5, f)})`
        : `rgba(${lerp(8, 34, f) | 0},${lerp(10, 40, f) | 0},${lerp(18, 60, f) | 0},1)`);
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
    ctx.quadraticCurveTo(x1 + Math.sin(t * 0.7 + seed) * 8, (y0 + y1) / 2, x1 + Math.sin(t * 0.5 + seed) * 12, y1);
    ctx.lineTo(x0, y1); ctx.closePath(); ctx.fill();
  }

  function dawn(t, lt, dur) {
    const u = easeInOut(lt / dur), open = easeInOut(seg(t, 86.7, 90.2)), day = seg(t, T_DAWN, 96.0);
    skyFill([[0, '#06080E'], [1, '#040508']]);
    shoot(t, lerp(1000, 1040, u), lerp(545, 520, u), lerp(1.0, 1.085, u), 0.4);

    // the room: a cold dark wall, lit a little more as the curtain opens
    rrect(-200, -100, W + 400, 1010, 0, { fill: lgrad(0, 0, W, 0, [[0, '#07090F'], [0.55, mix('#0B0F18', '#1A2233', open)], [1, '#0A0D15']]), stroke: null });
    glow(WX + WW / 2, 520, 900, '#8FA8D8', 0.12 + 0.14 * open);

    // the view: sky, far city, near city
    ctx.save(); ctx.beginPath(); ctx.rect(WX, WY, WW, WH); ctx.clip();
    const HZ = WY + WH * 0.47;                            // the horizon, about her shoulders
    ctx.fillStyle = lgrad(0, WY, 0, WY + WH, [[0, mix('#0E1630', '#1B284A', day)], [0.28, mix('#2A3C68', '#4C6696', day)], [0.43, mix('#8A9CC0', '#C4D0E4', day)], [0.47, mix('#C99CA8', '#F2C4B6', day)], [0.52, mix('#6F7898', '#8E97B2', day)], [1, '#262E44']]);
    ctx.fillRect(WX, WY, WW, WH);
    glow(WX + WW * 0.72, HZ, 420, '#FFD2B8', 0.16 + 0.28 * day);
    layer(2.2, () => {
      skyline(t, HZ - 6, 18, 18, 46, '#56628A', 2.2, 3, 86.9, 95.4, 0.1);
      skyline(t, HZ + 30, 60, 40, 90, '#323D5E', 3.2, 5, 87.1, 95.6, 0.12);
    }, { box: [WX - 40, HZ - 40, WW + 80, WY + WH - HZ + 60] });
    // a road far below, headlights and tail lights crawling along it
    lit(() => {
      for (let i = 0; i < 12; i++) {
        const dir = i % 2 ? 1 : -1, x = WX + frac(hash(i, 8) + dir * t * 0.02) * WW, y = HZ + 150 + (i % 2) * 6;
        ctx.fillStyle = rgba(dir > 0 ? '#FFE9C8' : '#FF6A5A', 0.6); ctx.fillRect(x, y, 5, 2.5);
      }
    });
    layer(1, () => skyline(t, HZ + 170, 150, 70, 150, '#141B2C', 5, 9, 87.4, 95.8, 0.09), { box: [WX - 40, HZ + 150, WW + 80, WY + WH - HZ] });
    // the glass: faint reflection streak
    lit(() => { ctx.fillStyle = lgrad(WX, WY, WX + WW, WY + WH, [[0.2, 'rgba(255,255,255,0)'], [0.26, 'rgba(255,255,255,0.05)'], [0.3, 'rgba(255,255,255,0)']]); ctx.fillRect(WX, WY, WW, WH); });
    ctx.restore();
    // the frame and the mullions, rim-lit in cold light
    const fr = { fill: '#0A0D16', stroke: null };
    rrect(WX - 22, WY - 30, 22, WH + 60, 0, fr); rrect(WX + WW, WY - 30, 22, WH + 60, 0, fr);
    rrect(WX + WW / 2 - 8, WY, 16, WH, 0, fr); rrect(WX - 22, WY + 240, WW + 44, 14, 0, fr);
    rrect(WX - 40, WY + WH, WW + 80, 26, 3, { fill: lgrad(0, WY + WH, 0, WY + WH + 26, [[0, mix('#1A2030', '#8A9ABA', open * 0.8)], [1, '#0A0C12']]), stroke: null });
    for (const x of [WX - 2, WX + WW / 2 + 7, WX + WW + 1]) rrect(x - 1, WY, 2, WH, 0, { fill: rgba('#BFD2F2', 0.25 * open), stroke: null });

    // the floor, with the window laid on it
    rrect(-200, WY + WH + 26, W + 400, 400, 0, { fill: lgrad(0, WY + WH, 0, 1100, [[0, '#0C0F18'], [1, '#05060A']]), stroke: null });
    lit(() => {
      ctx.fillStyle = lgrad(0, WY + WH + 26, 0, 1100, [[0, rgba('#AFC4EA', 0.32 * open)], [1, 'rgba(0,0,0,0)']]);
      ctx.beginPath(); ctx.moveTo(WX, WY + WH + 26); ctx.lineTo(WX + WW, WY + WH + 26); ctx.lineTo(WX + WW - 240, 1100); ctx.lineTo(WX - 520, 1100); ctx.closePath(); ctx.fill();
    });

    // curtains: the sheer panels part, the heavy drapes stay at the sides
    const gap = open * (WW / 2 - 70);
    curtain(t, WX - 10, WX + WW / 2 - gap + 4, WY - 30, WY + WH + 20, true, 1);
    curtain(t, WX + WW / 2 + gap - 4, WX + WW + 10, WY - 30, WY + WH + 20, true, 4);
    curtain(t, WX - 190, WX + 24 - open * 10, WY - 40, WY + WH + 30, false, 2);
    curtain(t, WX + WW - 24 + open * 10, WX + WW + 190, WY - 40, WY + WH + 30, false, 6);
    // cold light through the gap before it opens
    glow(WX + WW / 2, WY + WH * 0.55, 260, '#D8E6FF', 0.2 * (1 - open) + 0.06);

    // light into the room, and the dust in it
    godRays(t, WX + WW / 2, WY + WH * 0.45, 2.35, 0.7, 1300, '#C6D8F8', 0.1 * open);
    dust(t, WX - 500, WY + 200, WW + 500, WH - 100, 60, '#E4EEFF');

    // her, standing at the glass; her shadow runs back along the floor toward us
    const sx = 1165, sy = WY + WH + 22;
    ctx.save(); ctx.globalAlpha = 0.55 * open;
    ctx.fillStyle = lgrad(0, sy, 0, 1100, [[0, 'rgba(2,3,6,0.9)'], [1, 'rgba(2,3,6,0)']]);
    ctx.beginPath(); ctx.moveTo(sx - 50, sy); ctx.lineTo(sx + 50, sy); ctx.lineTo(sx - 120, 1120); ctx.lineTo(sx - 380, 1120); ctx.closePath(); ctx.fill();
    ctx.restore();
    rimPerson(sx, sy, 0.9, { t: t * 0.3, hair: GREEN, hairK: 0.62, pose: 'stand', body: '#05060A' }, '#DCE8FF', 0.2 + 0.3 * open, 9);

    // foreground: an armchair's back at the lower left, soft
    layer(12, () => {
      smooth([[-80, 700], [120, 640], [360, 660], [420, 760], [440, 1200], [-120, 1200]], { fill: '#040508', stroke: null });
      stroke([[120, 646], [300, 652], [396, 720]], rgba('#9FB6E0', 0.25 * open), 8, { ink: null, smooth: true });
    }, { box: [-120, 620, 580, 600] });
    camEnd();

    black(1 - easeOut(seg(t, T_DAWN, T_DAWN + 0.8)));
    black(0.9 * easeIn(seg(t, 95.65, 96.0)));
    narration(t, 87.0, 95.4, '그리고 그것을\n숨기지 않고 이야기했다', { x: 470, y: 520, size: 56, per: 0.09 });
  }

  chapter('grammys', 67.2, 96.0, [[67.2, stage], [T_ROOM, dressing], [T_DAWN, dawn]]);
})();
