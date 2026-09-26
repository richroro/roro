// e1_start (0 – 38.40) · 작은 방.
//   0.00  a dark room; a door ajar, one blade of warm light through the gap, dust in it. The camera
//         creeps toward the gap; at the end the door swings in and the light floods the frame.
//   9.60  dusk over the Highland Park hills: palms, power lines, one lit window. The camera pushes
//         into it: a mother reading to two small children on the sofa, seen from behind.
//  19.20  a choir room in the afternoon, sun streaming through tall windows behind the risers; a
//         focus pull finds one small girl in the front row.
//  28.80  a dance studio: mirror wall, polished wood, pendant lamps, low sun. A girl spins, doubled
//         in the mirror and in the floor.
//
// This file also defines the small kit that e2_rise.js shares (window.E12): the blur layer, the
// hand-held cameras, the soft figures, and the dance studio set (act 2 returns to it).
(() => {
  // =============================== kit (shared with e2_rise.js) ==================================

  // ---- layers: paint a group off screen at half size and lay it back blurred ----------------------
  const pool = []; let depth = 0;
  /** Paint fn() out of focus as one group (much cheaper than blurring each shape). */
  function layer(px, fn, alpha = 1) {
    if (px < 0.6) { if (alpha < 1) { ctx.save(); ctx.globalAlpha *= alpha; fn(); ctx.restore(); } else fn(); return; }
    const main = ctx, cw = main.canvas.width, ch = main.canvas.height, q = 0.5;
    const w = Math.max(1, Math.round(cw * q)), h = Math.max(1, Math.round(ch * q));
    let c = pool[depth];
    if (!c) c = pool[depth] = document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const o = c.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'; o.filter = 'none';
    o.clearRect(0, 0, w, h);
    const m = main.getTransform();
    o.setTransform(m.a * q, m.b * q, m.c * q, m.d * q, m.e * q, m.f * q);
    depth++; ctx = o;
    try { fn(); } finally { ctx = main; depth--; }
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    main.globalAlpha *= alpha;
    main.filter = `blur(${(px * SCALE).toFixed(1)}px)`;
    main.drawImage(c, 0, 0, cw, ch);
    main.restore();
  }

  /** A camera with a hand-held drift on top. */
  function cam(t, cx, cy, z, rot = 0, amt = 1) {
    const [hx, hy, hr] = handheld(t, amt);
    camBegin(cx + hx / z, cy + hy / z, z, rot + hr);
  }
  /** The same camera seen from a layer at depth d (0 = infinitely far, 1 = the subject, >1 nearer). */
  function camD(t, cx, cy, z, d, amt = 1) {
    const zz = Math.max(0.2, 1 + (z - 1) * d);
    cam(t, lerp(W / 2, cx, Math.min(d, 1.4)), lerp(H / 2, cy, Math.min(d, 1.4)), zz, 0, amt * Math.min(1, d + 0.3));
  }

  // ---- light and shade ----------------------------------------------------------------------------
  /** A soft elliptical shadow (or with mode 'lighter'/'screen', a soft pool of light). */
  function softEll(x, y, rx, ry, color, a, mode = 'source-over') {
    if (a <= 0.002 || rx <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = mode;
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    ctx.fillStyle = rgrad(0, 0, 0, rx, [[0, rgba(color, a)], [0.45, rgba(color, a * 0.55)], [1, rgba(color, 0)]]);
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  /** A shaft of light: a quad from the segment [xa, xb] at y0 to [xc, xd] at y1, fading as it goes. */
  function beam(xa, xb, y0, xc, xd, y1, color, a, fade = 0.15) {
    if (a <= 0.002) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = lgrad(0, y0, 0, y1, [[0, rgba(color, a)], [0.55, rgba(color, a * 0.55)], [1, rgba(color, a * fade)]]);
    ctx.beginPath(); ctx.moveTo(xa, y0); ctx.lineTo(xb, y0); ctx.lineTo(xd, y1); ctx.lineTo(xc, y1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /** Screen-space washes for transitions. */
  function wash(k, color = '#FFE2B8') { if (k > 0.002) { ctx.save(); ctx.globalCompositeOperation = 'screen'; fillScreen(color, clamp(k)); ctx.restore(); } }
  function black(k) { if (k > 0.002) fillScreen('#000000', clamp(k)); }
  /** A glow sprite (cached canvas, drawn many times cheaply). */
  const sprites = {};
  function sprite(color) {
    if (sprites[color]) return sprites[color];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.18, rgba(color, 0.6)); gr.addColorStop(0.5, rgba(color, 0.12)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (sprites[color] = c);
  }
  function dot(x, y, r, color, a) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= clamp(a);
    ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  /** Dust confined to a polygon (a beam). */
  function dustIn(t, pts, x, y, w, h, n, color) {
    ctx.save(); polyPath(pts); ctx.clip(); dust(t, x, y, w, h, n, color); ctx.restore();
  }

  /** Draw fn(fill, hairFill) twice: once in the rim colour nudged toward the light, then dark on top. */
  function rimmed(lx, ly, rim, fn) {
    ctx.save(); ctx.translate(lx, ly); fn(rim, rim); ctx.restore();
    fn(null, null);
  }

  // ---- figures (never a face: dark shapes with a rim of light) ------------------------------------
  const DARK = '#0D0A10';
  const fillOf = f => ({ fill: f, stroke: null });

  /** A standing child seen from the front, feet at (x, y), h tall. o: { hair, style, fold, sway, t, body, rim, lx, ly }. */
  function child(x, y, h, o = {}) {
    const s = h / 260, sway = o.sway || 0, body = o.body || DARK, hairC = o.hair || '#1A1418';
    const draw = (f, hf) => {
      const b = f || body, hc = hf || hairC;
      stroke([[-12, -92], [-13, -8]], b, 17, { ink: null });
      stroke([[12, -92], [13, -8]], b, 17, { ink: null });
      ell(-15, -4, 15, 7, fillOf(b)); ell(15, -4, 15, 7, fillOf(b));
      ctx.save(); ctx.rotate(sway * 0.03);
      smooth([[-28, -180], [-37, -160], [-42, -82], [0, -76], [42, -82], [37, -160], [28, -180], [0, -186]], fillOf(b));
      // arms bent, holding a folder at the chest
      stroke([[-36, -168], [-44, -130], [-22, -118]], b, 14, { ink: null });
      stroke([[36, -168], [44, -130], [22, -118]], b, 14, { ink: null });
      if (o.fold !== false) rrect(-30, -150, 60, 40, 3, fillOf(f ? b : '#141018'));
      rrect(-7, -194, 14, 20, 6, fillOf(b));
      ctx.save(); ctx.translate(0, -208); ctx.rotate(sway * 0.05); ctx.scale(0.84, 0.84);
      const st = o.style || 'bob';
      if (st === 'long') smooth([[-30, -8], [-33, 26], [-26, 52], [26, 52], [33, 26], [30, -8], [0, -36]], fillOf(hc));
      else if (st === 'bob') smooth([[-30, -6], [-32, 22], [-22, 32], [22, 32], [32, 22], [30, -6], [0, -34]], fillOf(hc));
      ell(0, 0, 25, 29, fillOf(b));
      if (st === 'short') smooth([[-26, -2], [-24, -22], [0, -32], [24, -22], [26, -2], [0, -14]], fillOf(hc));
      else smooth([[-28, 6], [-27, -20], [0, -33], [27, -20], [28, 6], [14, -12], [-14, -12]], fillOf(hc));
      ctx.restore();
      ctx.restore();
    };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.rim) rimmed(o.lx ?? 0, o.ly ?? -3, o.rim, draw); else draw(null, null);
    // the open folder's pages catch the light
    if (o.pages) {
      ctx.save(); ctx.rotate(sway * 0.03);
      ctx.fillStyle = lgrad(0, -150, 0, -112, [[0, rgba(o.pages, 0.95)], [1, rgba(o.pages, 0.55)]]);
      ctx.beginPath(); ctx.moveTo(-30, -146); ctx.lineTo(-2, -142); ctx.lineTo(-2, -112); ctx.lineTo(-30, -115); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -142); ctx.lineTo(30, -146); ctx.lineTo(30, -115); ctx.lineTo(2, -112); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /** A seated person from behind, head and shoulders only (sofa, desk). y is where the view cuts. */
  function backBust(x, y, s, o = {}) {
    const body = o.body || DARK, hairC = o.hair || '#17121A';
    const draw = (f, hf) => {
      const b = f || body, hc = hf || hairC;
      smooth([[-74, 30], [-72, -40], [-52, -66], [-18, -76], [18, -76], [52, -66], [72, -40], [74, 30]], fillOf(b));
      ctx.save(); ctx.translate(0, -84); ctx.rotate(o.tilt || 0);
      rrect(-12, -26, 24, 30, 8, fillOf(b));
      ell(0, -44, 26, 31, fillOf(b));
      if (o.style === 'long') smooth([[-28, -60], [-32, -20], [-34, 26], [-18, 40], [18, 40], [34, 26], [32, -20], [28, -60], [0, -78]], fillOf(hc));
      else if (o.style === 'bun') { smooth([[-27, -50], [-26, -66], [0, -78], [26, -66], [27, -50], [22, -26], [-22, -26]], fillOf(hc)); circle(0, -76, 13, fillOf(hc)); }
      else smooth([[-27, -44], [-25, -66], [0, -78], [25, -66], [27, -44], [20, -24], [-20, -24]], fillOf(hc));
      ctx.restore();
    };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.rim) rimmed(o.lx ?? 0, o.ly ?? -2.5, o.rim, draw); else draw(null, null);
    ctx.restore();
  }

  // The dancer. Points are 3-D (lateral, up, forward) in the dancer's body frame; th turns her about
  // the vertical axis, so a pirouette is just th sweeping round.
  const ARM = { first: [[42, -424, 0], [70, -372, 38], [16, -338, 58]], second: [[42, -424, 0], [112, -416, 12], [182, -404, 18]], fifth: [[42, -428, 0], [72, -500, 18], [20, -558, 24]] };
  function armAt(p) {
    const [a, b, k] = p < 1 ? [ARM.first, ARM.second, p] : [ARM.second, ARM.fifth, p - 1];
    return a.map((q, i) => q.map((v, j) => lerp(v, b[i][j], ease(clamp(k)))));
  }
  /** p: { th, passe 0..1, arms 0 first · 1 second · 2 fifth, speed (spin speed, flings hair and skirt), lean } */
  function dancerShape(p, f, hf, hairC) {
    const c = Math.cos(p.th), sn = Math.sin(p.th), b = f || DARK, hc = hf || hairC;
    const P = q => [q[0] * c + q[2] * sn, q[1]];
    const dep = q => -q[0] * sn + q[2] * c;
    const sw = lerp(30, 48, Math.abs(c)), ww = lerp(22, 31, Math.abs(c)), hw = lerp(28, 38, Math.abs(c));
    const spd = p.speed || 0, rel = p.passe;
    const limbs = [];
    // arms
    for (const side of [1, -1]) {
      const pts = armAt(p.arms).map(q => [q[0] * side, q[1], q[2]]);
      limbs.push({ d: dep(pts[1]), fn: () => {
        const sp = pts.map(P);
        stroke([sp[0], sp[1]], b, 15, { ink: null }); stroke([sp[1], sp[2]], b, 11, { ink: null });
        circle(sp[2][0], sp[2][1], 7, fillOf(b));
      } });
    }
    // legs: the standing leg rises onto demi-pointe; the working leg lifts to passé
    const lift = rel * 26;
    const stand = [[-8, -292, 0], [-6, -150, 4], [-3, -18 - lift * 0.3, 0], [-2, 0, 10 * rel]];
    const work = [[10, -292, 0], [lerp(12, 92, rel), lerp(-150, -206, rel), lerp(4, 20, rel)], [lerp(10, 4, rel), lerp(-18, -150, rel), lerp(0, 10, rel)], [lerp(12, 0, rel), lerp(0, -140, rel), lerp(10, 16, rel)]];
    for (const [leg, id] of [[stand, 0], [work, 1]]) {
      limbs.push({ d: dep(leg[1]) - 0.1 * id, fn: () => {
        const sp = leg.map(P);
        stroke([sp[0], sp[1]], b, 26, { ink: null }); stroke([sp[1], sp[2]], b, 17, { ink: null });
        stroke([sp[2], sp[3]], b, 9, { ink: null });
      } });
    }
    const tail = () => {
      const bx = -sn * 24, fl = clamp(spd) * (sn >= 0 ? -1 : 1);
      stroke([[bx, -486], [bx - sn * 12 + fl * 30, -452], [bx - sn * 14 + fl * 70, -420 + Math.abs(fl) * 22]], hc, 15, { ink: null, smooth: true });
    };
    limbs.sort((m, n) => m.d - n.d);
    ctx.save(); ctx.translate(0, -lift * 0.3); ctx.rotate(p.lean || 0);
    if (c >= 0) tail();
    limbs.filter(l => l.d < 0).forEach(l => l.fn());
    // torso, skirt, head
    smooth([[-sw, -426], [-ww - 2, -372], [-ww, -330], [-hw, -290], [hw, -290], [ww, -330], [ww + 2, -372], [sw, -426], [0, -438]], fillOf(b));
    const fl = 22 + spd * 46, wv = Math.sin(p.th * 3) * 4;
    smooth([[-ww, -334], [-hw - fl, -262 - spd * 18 + wv], [-hw * 0.3, -254], [hw * 0.3, -256], [hw + fl, -262 - spd * 18 - wv], [ww, -334]], fillOf(b));
    rrect(-8, -452, 16, 24, 6, fillOf(b));
    ell(0, -474, 27, 32, fillOf(b));
    smooth([[-28, -468], [-26, -494], [0, -508], [26, -494], [28, -468], [0, -484]], fillOf(hc));
    if (c < 0) tail();
    limbs.filter(l => l.d >= 0).forEach(l => l.fn());
    ctx.restore();
  }
  /** The dancer at (x, y) (between the feet), h tall. o: { rim, lx, ly, hair, alpha, flip } */
  function dancer(x, y, h, p, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale((o.flip ? -1 : 1) * h / 520, h / 520);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const hairC = o.hair || '#6B4A3A';
    if (o.rim) rimmed(o.lx ?? 0, o.ly ?? -4, o.rim, (f, hf) => dancerShape(p, f, hf, hairC));
    else dancerShape(p, o.body || null, null, hairC);
    ctx.restore();
  }

  // ---- the dance studio (acts 1 and 2) ------------------------------------------------------------
  // World: high windows at the top, a mirror wall 250–770, polished floor below, four pendant lamps.
  const VP = [960, 520];
  const LAMPS = [360, 810, 1260, 1710];
  const MIR = [250, 770];
  const FLOOR = 792;
  const WINS = [[230, 560], [810, 1110], [1380, 1690]];

  /**
   * o: { night 0..1, lamps [4 × 0..1], sun 0..1 (low sun shafts), moon 0..1 (the one cold shaft onto
   * the shoes), dancer: {x, y, h, p} or null, shoes: {x, y, s} or null, fg (foreground blur) }
   */
  function studio(t, o) {
    const n = o.night || 0, L = o.lamps || [1, 1, 1, 1];
    const lampC = '#FFC98A', moonC = '#9FC4FF', sunC = '#FFB968';
    // upper wall and high windows
    ctx.fillStyle = lgrad(0, -300, 0, MIR[0], [[0, mix('#2A221F', '#07080D', n)], [1, mix('#4A3A30', '#0E1018', n)]]);
    ctx.fillRect(-900, -600, W + 1800, MIR[0] + 600);
    for (const [a, b] of WINS) {
      ctx.fillStyle = lgrad(0, 150, 0, 236, [[0, mix('#FFF4DC', '#1B2A48', n)], [1, mix('#FFD9A0', '#0F1A30', n)]]);
      ctx.fillRect(a, 150, b - a, 86);
      ctx.fillStyle = mix('#3A2C24', '#06070B', n);
      for (let k = 1; k < 4; k++) ctx.fillRect(lerp(a, b, k / 4) - 3, 150, 6, 86);
      ctx.fillRect(a, 190, b - a, 5);
      if (n > 0.5) glow((a + b) / 2, 190, 160, '#5D7FC0', 0.12 * n);
      else glow((a + b) / 2, 190, 260, '#FFE6B8', 0.35 * (1 - n));
    }
    // the mirror (its reflection of the room, the lamps, and the dancer), slightly out of focus
    layer(2.2, () => {
      ctx.save(); ctx.beginPath(); ctx.rect(-900, MIR[0], W + 1800, MIR[1] - MIR[0]); ctx.clip();
      ctx.fillStyle = lgrad(0, MIR[0], 0, MIR[1], [[0, mix('#3A302C', '#080A10', n)], [0.55, mix('#2A2320', '#06070C', n)], [1, mix('#5A4032', '#0C0D14', n)]]);
      ctx.fillRect(-900, MIR[0], W + 1800, MIR[1] - MIR[0]);
      // reflected floor, converging on the vanishing point
      const fy = 612;
      ctx.fillStyle = lgrad(0, fy, 0, MIR[1], [[0, mix('#3B2A20', '#07080C', n)], [1, mix('#8A5E3E', '#1A1718', n)]]);
      ctx.fillRect(-900, fy, W + 1800, MIR[1] - fy);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(VP[0] + i * 26, fy); ctx.lineTo(VP[0] + i * 120, MIR[1]); ctx.stroke(); }
      // reflected lamps and their pools
      LAMPS.forEach((lx, i) => {
        const a = L[i]; if (a <= 0.01) return;
        const rx = VP[0] + (lx - VP[0]) * 0.62;
        stroke([[rx, MIR[0] - 10], [rx, 330]], '#000000', 2, { ink: null, alpha: 0.5 });
        poly([[rx - 30, 348], [rx - 10, 328], [rx + 10, 328], [rx + 30, 348]], fillOf(mix('#2A2018', '#101014', n)));
        glow(rx, 350, 90, lampC, 0.55 * a);
        softEll(rx, 690, 170, 26, lampC, 0.35 * a, 'lighter');
      });
      if (o.moon > 0) softEll(VP[0] + (o.shoes ? (o.shoes.x - VP[0]) * 0.62 : 0), 700, 70, 10, moonC, 0.3 * o.moon, 'lighter');
      if (o.sun > 0) for (const [a, b] of WINS) softEll(VP[0] + ((a + b) / 2 + 260 - VP[0]) * 0.62, 680, 120, 18, sunC, 0.25 * o.sun, 'lighter');
      // the dancer's reflection: her back, smaller, further off
      if (o.dancer) {
        const d = o.dancer;
        dancer(VP[0] + (d.x - VP[0]) * 0.62, 724, d.h * 0.62, { ...d.p, th: -d.p.th + Math.PI }, { flip: true, rim: mix(lampC, moonC, n), ly: -3, alpha: 0.9 });
      }
      ctx.restore();
    });
    // mirror seams, a sheen across the glass, the barre
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = lgrad(0, MIR[0], W, MIR[1], [[0, 'rgba(255,255,255,0)'], [0.42, 'rgba(255,255,255,0)'], [0.47, `rgba(255,240,220,${0.05 * (1 - n * 0.6)})`], [0.53, 'rgba(255,255,255,0)'], [0.61, `rgba(255,240,220,${0.035 * (1 - n * 0.6)})`], [0.64, 'rgba(255,255,255,0)']]);
    ctx.fillRect(-900, MIR[0], W + 1800, MIR[1] - MIR[0]);
    ctx.restore();
    ctx.fillStyle = mix('#1B1512', '#050508', n);
    ctx.fillRect(-900, MIR[0] - 8, W + 1800, 10);
    for (let x = -480; x <= W + 480; x += 480) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 2, MIR[0], 3, MIR[1] - MIR[0]); ctx.fillStyle = `rgba(255,230,200,${0.10 * (1 - n * 0.7)})`; ctx.fillRect(x + 1, MIR[0], 1.5, MIR[1] - MIR[0]); }
    // barre
    const by = 548;
    for (let x = -240; x <= W + 240; x += 480) { rrect(x - 4, by - 6, 8, 40, 3, fillOf(mix('#2A221C', '#07070A', n))); }
    ctx.fillStyle = lgrad(0, by - 9, 0, by + 9, [[0, mix('#E8C9A0', '#6B7690', n * 0.8)], [0.35, mix('#9A7452', '#1E2230', n)], [1, mix('#2B1D14', '#050508', n)]]);
    ctx.fillRect(-900, by - 9, W + 1800, 18);
    // baseboard
    ctx.fillStyle = mix('#1E1712', '#050507', n); ctx.fillRect(-900, MIR[1], W + 1800, FLOOR - MIR[1]);
    // the floor
    ctx.fillStyle = lgrad(0, FLOOR, 0, 1300, [[0, mix('#5A3A24', '#0D0B0C', n)], [0.35, mix('#7A4E30', '#141012', n)], [1, mix('#3A2416', '#08070A', n)]]);
    ctx.fillRect(-900, FLOOR, W + 1800, 1300);
    ctx.save(); ctx.lineWidth = 1.6;
    for (let i = -40; i <= 40; i++) {
      const x0 = VP[0] + i * 48, x1 = VP[0] + (x0 - VP[0]) * ((1300 - VP[1]) / (FLOOR - VP[1]));
      ctx.strokeStyle = `rgba(20,10,5,${0.35 - 0.2 * n})`; ctx.beginPath(); ctx.moveTo(x0, FLOOR); ctx.lineTo(x1, 1300); ctx.stroke();
      for (let j = 0; j < 3; j++) {
        const u = hash(i, j + 40), yy = lerp(FLOOR + 10, 1250, u * u);
        const kx = (yy - VP[1]) / (FLOOR - VP[1]);
        ctx.beginPath(); ctx.moveTo(VP[0] + (x0 - VP[0]) * kx, yy); ctx.lineTo(VP[0] + (x0 + 48 - VP[0]) * kx, yy); ctx.stroke();
      }
    }
    ctx.restore();
    // what the glossy floor reflects: a bright band under the mirror, lamp streaks, the dancer
    layer(3, () => {
      softEll(W / 2, FLOOR + 10, 1400, 30, mix('#E8B888', '#40506C', n), 0.18, 'screen');
      LAMPS.forEach((lx, i) => {
        const a = L[i]; if (a <= 0.01) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = lgrad(0, FLOOR, 0, 1180, [[0, rgba(lampC, 0.0)], [0.25, rgba(lampC, 0.22 * a)], [1, rgba(lampC, 0)]]);
        ctx.fillRect(lx - 34, FLOOR, 68, 400);
        ctx.restore();
      });
      if (o.dancer) {
        const d = o.dancer;
        ctx.save(); ctx.translate(0, 2 * d.y); ctx.scale(1, -1);
        dancer(d.x, d.y, d.h, d.p, { alpha: 0.42 });
        ctx.restore();
      }
      if (o.shoes) {
        const sh = o.shoes;
        ctx.save(); ctx.translate(0, 2 * sh.y + 6); ctx.scale(1, -1); ctx.globalAlpha *= 0.35;
        shoes(sh.x, sh.y, sh.s, { light: sh.light, n });
        ctx.restore();
      }
    });
    // pools of lamp light on the floor, and low sun patches
    LAMPS.forEach((lx, i) => { if (L[i] > 0.01) { softEll(lx, 905, 300, 70, lampC, 0.32 * L[i], 'lighter'); softEll(lx, 905, 120, 30, '#FFE3BC', 0.2 * L[i], 'lighter'); } });
    if (o.sun > 0) {
      WINS.forEach(([a, b], i) => {
        const dx = 520;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = rgba('#FFC27A', 0.22 * o.sun);
        ctx.beginPath(); ctx.moveTo(a + dx, 880); ctx.lineTo(b + dx, 880); ctx.lineTo(b + dx + 140, 1040); ctx.lineTo(a + dx + 140, 1040); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    }
    // lamps: cords, shades, the light they throw down through the air
    LAMPS.forEach((lx, i) => {
      const a = L[i];
      ctx.fillStyle = '#050406'; ctx.fillRect(lx - 1.5, -400, 3, 568);
      for (let q = 0; q < 4; q++) { const f = 1 - q * 0.22; beam(lx - 40 * f, lx + 40 * f, 206, lx - 300 * f, lx + 300 * f, 930, lampC, 0.035 * a, 0.3); }
      poly([[lx - 56, 206], [lx - 22, 164], [lx + 22, 164], [lx + 56, 206]], { fill: lgrad(lx - 56, 0, lx + 56, 0, [[0, '#0A0808'], [0.5, mix('#3A2E26', '#101014', n)], [1, '#0A0808']]), stroke: null });
      if (a > 0.01) {
        ell(lx, 206, 54, 7, fillOf(rgba('#FFF1D8', a)));
        glow(lx, 212, 150, lampC, 0.55 * a);
        glow(lx, 212, 40, '#FFFFFF', 0.4 * a);
      }
    });
    // low sun shafts through the high windows
    if (o.sun > 0) WINS.forEach(([a, b]) => beam(a, b, 236, a + 520, b + 660, 1000, sunC, 0.13 * o.sun, 0.35));
    // the cold shaft that ends on the shoes
    if (o.moon > 0 && o.shoes) {
      const sx = o.shoes.x, x0 = 930, x1 = 1030;
      for (let q = 0; q < 4; q++) { const f = 1 - q * 0.2, mx = (x0 + x1) / 2, bx = sx + 5; beam(mx - 50 * f, mx + 50 * f, 236, bx - 115 * f, bx + 115 * f, 905, moonC, 0.05 * o.moon, 0.6); }
      softEll(sx, 900, 190, 44, moonC, 0.30 * o.moon, 'lighter');
      dustIn(t, [[x0, 236], [x1, 236], [sx + 120, 905], [sx - 110, 905]], 850, 230, 400, 700, 70, '#DDE8FF');
    }
    if (o.shoes) shoes(o.shoes.x, o.shoes.y, o.shoes.s, { light: o.shoes.light ?? 1, n });
    if (o.dancer) {
      const d = o.dancer;
      softEll(d.x, d.y + 4, 110 * d.h / 440, 18, '#000000', 0.55);
      dancer(d.x, d.y, d.h, d.p, { rim: '#FFD7A4', ly: -4, lx: -1.5 });
    }
  }

  /** One soft satin slipper, side-on and a little from above; heel at -70, toe at +72. */
  function slipper(li, n) {
    const satin = mix('#5A4040', '#E8C4B6', li), dk = mix('#241819', '#A07A70', li), hi = mix('#7A5A56', '#FFF4EC', li);
    // the body of the shoe
    smooth([[-70, -4], [-68, -26], [-50, -34], [-10, -33], [30, -30], [58, -24], [72, -12], [72, 0], [58, 6], [0, 7], [-60, 6]],
      { fill: lgrad(0, -34, 0, 7, [[0, hi], [0.35, satin], [1, dk]]), stroke: null });
    // the opening, dark inside, with its bound edge catching light
    ell(-24, -31, 42, 8, fillOf(mix('#0E0A0B', '#3A2626', li)));
    ctx.save(); ctx.globalAlpha *= 0.8; ctx.strokeStyle = hi; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-24, -31, 42, 8, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); ctx.restore();
    // the elastic across the instep and a little drawstring bow at the front
    stroke([[-14, -39], [-8, -26], [-4, -8]], mix('#4A3434', '#D8AFA2', li), 5, { ink: null });
    stroke([[16, -31], [22, -36], [26, -31], [20, -29]], hi, 1.6, { ink: null, alpha: 0.8 });
    // pleats gathered at the toe, a highlight along the toe box, the leather sole
    for (let i = 0; i < 4; i++) stroke([[44 + i * 6, -26 + i * 3], [50 + i * 5, -8]], dk, 1.4, { ink: null, alpha: 0.6 });
    stroke([[8, -31], [44, -26], [66, -14]], '#FFFFFF', 2.2, { ink: null, alpha: 0.35 * li });
    stroke([[-58, 6], [60, 6]], mix('#140C0A', '#4A3024', li), 3, { ink: null });
  }
  /** A pair of soft satin dance shoes on the floor, one tipped on its side. (x, y) is between them. */
  function shoes(x, y, s, o = {}) {
    const n = o.n || 0, li = o.light ?? 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    softEll(0, 6, 160, 20, '#000000', 0.65);
    ctx.save(); ctx.translate(-40, -2); ctx.rotate(-0.06); ctx.scale(0.92, 0.92); slipper(li * 0.9, n); ctx.restore();
    ctx.save(); ctx.translate(52, 10); ctx.rotate(0.16); ctx.scale(-1, 1); slipper(li, n); ctx.restore();
    ctx.restore();
  }

  /** The cinematic dip: 0..1 how dark, from a cut. */
  const edge = (lt, dur, a = 0.5, b = 0.5) => Math.max(1 - clamp(lt / a), clamp((lt - (dur - b)) / b));

  window.E12 = { layer, cam, camD, softEll, beam, wash, black, sprite, dot, dustIn, rimmed, child, backBust, dancer, studio, shoes, edge, DARK, LAMPS, VP };

  // ================================ act 1 · 작은 방 =================================================

  // 0.00 – 9.60: the door ajar ---------------------------------------------------------------------
  function doorway(t, lt, dur) {
    const open = easeIn(seg(t, 8.2, 9.6));
    const pass = Math.exp(-Math.pow((t - 4.9) / 0.45, 2));                    // someone crosses the room inside
    const Lk = (1 - 0.55 * pass) * (1 + open * 1.2);
    const z = lerp(1.0, 1.42, easeInOut(seg(t, 0, 9.0))) + open * 0.35;
    const cx = lerp(1000, 1250, easeInOut(seg(t, 0, 9.4)));
    skyFill([[0, '#040305'], [1, '#07060A']]);
    cam(t, cx, 540, z, 0, 0.8);
    const warm = '#FFC98C';
    const fx0 = 1080, fx1 = 1440, top = 190, fl = 842;
    const gx1 = 1414, gap = lerp(9, 250, open), gx0 = gx1 - gap;
    // the wall and the floor on our side, lit only by what comes through the gap
    ctx.fillStyle = lgrad(0, -300, 0, fl, [[0, '#060508'], [1, '#0E0B0C']]); ctx.fillRect(-600, -400, 3200, fl + 400);
    ctx.fillStyle = lgrad(0, fl, 0, 1300, [[0, '#120D0B'], [1, '#050405']]); ctx.fillRect(-600, fl, 3200, 700);
    softEll(gx1 + 40, 520, 420, 520, warm, 0.07 * Lk, 'lighter');
    // the lit room beyond the gap
    ctx.save(); ctx.beginPath(); ctx.rect(gx0, top, gap, fl - top); ctx.clip();
    ctx.fillStyle = lgrad(gx0, 0, gx1, 0, [[0, mix('#FFB870', '#FFE9C8', open)], [1, '#FFF0D8']]); ctx.fillRect(gx0, top, gap, fl - top);
    ctx.fillStyle = lgrad(0, top, 0, fl, [[0, 'rgba(120,60,20,0.35)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(90,40,10,0.35)']]); ctx.fillRect(gx0, top, gap, fl - top);
    if (pass > 0.02) { const px = lerp(gx0 - 60, gx1 + 60, seg(t, 4.3, 5.5)); ctx.fillStyle = rgba('#2A1608', 0.75 * pass); ctx.fillRect(px - 26, top, 52, fl - top); }
    ctx.restore();
    // the door panel, swinging away from us, and the frame
    const inset = gap * 0.05;
    ctx.fillStyle = lgrad(fx0, 0, gx0, 0, [[0, '#0B0909'], [0.85, '#151010'], [1, mix('#2A1A12', '#6A4128', clamp(Lk * 0.7))]]);
    ctx.beginPath(); ctx.moveTo(fx0 + 26, top + 4); ctx.lineTo(gx0, top + 4 + inset); ctx.lineTo(gx0, fl - inset); ctx.lineTo(fx0 + 26, fl); ctx.closePath(); ctx.fill();
    // panel mouldings catch a sliver of light
    const pw = gx0 - fx0 - 26;
    if (pw > 60) {
      ctx.strokeStyle = rgba(warm, 0.06 * Lk); ctx.lineWidth = 2;
      ctx.strokeRect(fx0 + 26 + pw * 0.14, top + 50, pw * 0.72, 240); ctx.strokeRect(fx0 + 26 + pw * 0.14, top + 340, pw * 0.72, 300);
    }
    rrect(gx0 - 22, 510, 10, 22, 4, fillOf(rgba('#C79A6A', 0.25 * Lk)));
    ctx.fillStyle = '#0C0909';
    ctx.fillRect(fx0, top - 26, fx1 - fx0, 26); ctx.fillRect(fx0, top - 26, 26, fl - top + 26); ctx.fillRect(gx1, top - 26, fx1 - gx1, fl - top + 26);
    ctx.fillStyle = rgba(warm, 0.35 * Lk); ctx.fillRect(gx1, top, 2.5, fl - top);
    // light under the door and the blade of light across the floor toward us
    ctx.fillStyle = lgrad(fx0, 0, gx1, 0, [[0, rgba(warm, 0.05 * Lk)], [1, rgba(warm, 0.45 * Lk)]]); ctx.fillRect(fx0 + 26, fl - 4, gx1 - fx0 - 26, 4);
    const fan = [[gx0, fl], [gx1, fl], [gx1 + 330 + gap * 2.2, 1300], [gx0 - 420 - gap * 1.4, 1300]];
    const sheet = [[gx0, top], [gx1 + 6, top], [gx1 + 360, 1200], [gx0 - 520, 1200]];
    layer(4, () => {
      ctx.fillStyle = lgrad(0, fl, 0, 1300, [[0, rgba(warm, 0.5 * Lk)], [0.4, rgba(warm, 0.16 * Lk)], [1, rgba(warm, 0.02)]]);
      polyPath(fan); ctx.fill();
      ctx.fillStyle = lgrad(gx1, 0, gx0 - 500, 0, [[0, rgba(warm, 0.13 * Lk)], [1, rgba(warm, 0)]]);
      polyPath(sheet); ctx.fill();
    });
    // the floorboards show only inside the light
    ctx.save(); polyPath(fan); ctx.clip();
    ctx.strokeStyle = 'rgba(40,20,10,0.35)'; ctx.lineWidth = 2;
    for (let i = -10; i < 16; i++) { ctx.beginPath(); ctx.moveTo(1300 + i * 40, fl); ctx.lineTo(1300 + i * 170, 1300); ctx.stroke(); }
    ctx.restore();
    // the light in the air: a thin sheet from the gap, with dust turning in it
    dustIn(t, sheet, gx0 - 520, top, 900, 1000, 110, '#FFE6C0');
    glow(gx1 - gap / 2, 520, 220 + gap, warm, 0.18 * Lk);
    // a bed corner and a chair in the foreground, out of focus
    layer(9, () => {
      smooth([[-200, 760], [420, 790], [560, 850], [600, 1200], [-200, 1200]], fillOf('#050405'));
      stroke([[-200, 770], [420, 796], [560, 856]], rgba(warm, 0.1 * Lk), 6, { ink: null });
      rrect(1760, 520, 90, 700, 10, fillOf('#030203'));
      stroke([[1762, 520], [1762, 1200]], rgba(warm, 0.12 * Lk), 5, { ink: null });
    });
    camEnd();
    narration(t, 1.5, 8.8, '모든 이야기는\n작은 방에서 시작됐다', { x: 660, y: 520 });
    wash(Math.pow(seg(t, 8.8, 9.6), 1.6) * 0.95, '#FFD9A6');
  }

  // 9.60 – 19.20: Highland Park at dusk --------------------------------------------------------------
  const WIN = [1052, 612, 256, 128];              // the lit window (x, y, w, h), world
  function palm(x, y, h, t, seed, color) {
    const sw = Math.sin(t * 0.6 + seed) * 0.012, bend = (hash(seed, 1) - 0.5) * 0.12;
    const top = [x + h * (bend + sw), y - h];
    const pts = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([x + h * (bend + sw) * u * u, y - h * u]); }
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { ctx.lineWidth = lerp(h * 0.022, h * 0.012, i / 12); ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke(); }
    ctx.restore();
    // the dead-frond skirt and the fan crown
    smooth([[top[0] - h * 0.035, top[1] + h * 0.02], [top[0] - h * 0.03, top[1] + h * 0.12], [top[0], top[1] + h * 0.15], [top[0] + h * 0.03, top[1] + h * 0.12], [top[0] + h * 0.035, top[1] + h * 0.02]], fillOf(color));
    for (let i = 0; i < 15; i++) {
      const a = -Math.PI / 2 + (i / 14 - 0.5) * 3.6 + Math.sin(t * 0.8 + i + seed) * 0.04, r = h * (0.13 + hash(seed, i + 3) * 0.04);
      const ex = top[0] + Math.cos(a) * r, ey = top[1] + Math.sin(a) * r * 0.8 + Math.max(0, Math.cos(a)) * 0;
      const droop = Math.abs(Math.cos(a)) * r * 0.35;
      stroke([[top[0], top[1]], [lerp(top[0], ex, 0.6), lerp(top[1], ey, 0.6) - r * 0.05], [ex, ey + droop]], color, h * 0.008, { ink: null, smooth: true });
      ctx.save(); ctx.translate(lerp(top[0], ex, 0.7), lerp(top[1], ey + droop, 0.7)); ctx.rotate(a); ell(0, 0, r * 0.42, r * 0.11, fillOf(color)); ctx.restore();
    }
  }
  function hills(pts, fill) { poly(pts, fillOf(fill)); }

  function highland(t, lt, dur) {
    const k = easeInOut(seg(t, 9.6, 19.2));
    const z = lerp(1.0, 2.55, k) + easeIn(seg(t, 18.5, 19.2)) * 0.8;
    const cx = lerp(1010, WIN[0] + WIN[2] / 2, k), cy = lerp(540, WIN[1] + WIN[3] / 2 + 6, k);
    // sky, in screen space
    skyFill([[0, '#0E1230'], [0.35, '#2B2150'], [0.58, '#7A3E62'], [0.72, '#D86F5A'], [0.82, '#F2A36A'], [1, '#3A2230']]);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const x = hash(i, 71) * W, y = 140 + hash(i, 72) * 260; ctx.globalAlpha = (0.2 + 0.4 * hash(i, 73)) * (0.6 + 0.4 * Math.sin(t * 2 + i)); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, 2, 2); }
    ctx.restore();
    // the far San Gabriels and the hills across the arroyo, hazy
    layer(4, () => {
      camD(t, cx, cy, z, 0.25, 0.4);
      hills([[-400, 640], [100, 560], [380, 590], [700, 520], [1000, 575], [1300, 530], [1700, 590], [2300, 560], [2300, 900], [-400, 900]], '#553A62');
      glow(1500, 640, 700, '#FFB070', 0.25);
      camEnd();
      camD(t, cx, cy, z, 0.55, 0.6);
      hills([[-400, 700], [200, 650], [600, 690], [900, 660], [1500, 700], [2300, 660], [2300, 1000], [-400, 1000]], '#2A1E3A');
      for (let i = 0; i < 110; i++) {
        const x = -300 + hash(i, 81) * 2500, y = 690 + hash(i, 82) * 120;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * (0.6 + hash(i, 84)) + i);
        ctx.fillStyle = hash(i, 83) > 0.7 ? '#FFF2D0' : '#FFB35A'; ctx.fillRect(x, y, 4, 3);
      }
      ctx.globalAlpha = 1;
      camEnd();
    });
    // the street: our hill, palms, power lines, the bungalow
    camD(t, cx, cy, z, 1, 1);
    ctx.fillStyle = lgrad(0, 700, 0, 1100, [[0, '#1A1322'], [1, '#08060A']]);
    ctx.beginPath(); ctx.moveTo(-800, 760); ctx.bezierCurveTo(200, 700, 800, 740, 1100, 752); ctx.bezierCurveTo(1500, 766, 2000, 720, 2800, 740); ctx.lineTo(2800, 1600); ctx.lineTo(-800, 1600); ctx.closePath(); ctx.fill();
    palm(700, 752, 430, t, 5, '#1A1222');
    palm(420, 790, 600, t, 3, '#0B0810');
    palm(1640, 770, 640, t, 9, '#0B0810');
    palm(1760, 760, 470, t, 11, '#130E18');
    // power lines sagging between poles
    ctx.strokeStyle = 'rgba(8,6,12,0.85)'; ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(-400, 300 + j * 18); ctx.quadraticCurveTo(700, 420 + j * 20, 1900, 330 + j * 16); ctx.stroke(); }
    rrect(1896, 290, 10, 520, 3, fillOf('#08060A')); rrect(1860, 312, 80, 6, 2, fillOf('#08060A'));
    // the house
    const roof = '#0E0A12';
    poly([[830, 585], [1180, 470], [1530, 585], [1510, 592], [1180, 486], [850, 592]], fillOf(roof));
    softEll(1180, 600, 400, 40, '#000000', 0.5);
    ctx.fillStyle = lgrad(0, 585, 0, 780, [[0, '#1C1520'], [1, '#0E0A10']]);
    ctx.fillRect(862, 588, 636, 190);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(862, 600 + i * 20, 636, 2); ctx.fillStyle = 'rgba(255,170,100,0.035)'; ctx.fillRect(862, 602 + i * 20, 636, 1); }
    poly([[1180, 486], [1060, 526], [1300, 526]], fillOf('#1C1620'));
    rrect(890, 610, 70, 170, 3, fillOf('#0F0B12'));                                   // the door
    rrect(1392, 640, 64, 70, 3, fillOf('#1E1512'));                                  // a small dim window, curtained
    ctx.fillStyle = lgrad(1392, 0, 1456, 0, [[0, 'rgba(255,150,70,0.05)'], [0.5, 'rgba(255,150,70,0.22)'], [1, 'rgba(255,150,70,0.05)']]); ctx.fillRect(1396, 644, 56, 62);
    glow(1424, 675, 60, '#FF9A48', 0.1);
    // the lit window, and what is inside it
    const [wx, wy, ww, wh] = WIN;
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    livingRoom(t, wx, wy, ww, wh);
    ctx.restore();
    ctx.fillStyle = '#1A1210';
    ctx.fillRect(wx - 8, wy - 8, ww + 16, 8); ctx.fillRect(wx - 10, wy + wh, ww + 20, 9);
    ctx.fillRect(wx - 8, wy, 8, wh); ctx.fillRect(wx + ww, wy, 8, wh);
    ctx.fillRect(wx + ww / 3 - 2, wy, 4, wh); ctx.fillRect(wx + ww * 2 / 3 - 2, wy, 4, wh); ctx.fillRect(wx, wy + wh * 0.3 - 2, ww, 3);
    // the window's reflection of the sky, faint
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = lgrad(wx, wy, wx + ww, wy + wh, [[0, 'rgba(120,90,160,0.18)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(wx, wy, ww, wh);
    ctx.restore();
    // warm spill onto the wall, the hedge below and the ground
    softEll(wx + ww / 2, wy + wh + 30, 360, 110, '#FFA95A', 0.2, 'lighter');
    const hedge = [[840, 800]];
    for (let i = 0; i <= 40; i++) hedge.push([850 + i * 17, 752 - hash(i, 5) * 16 - Math.sin(i * 0.7) * 4]);
    hedge.push([1540, 800]);
    smooth(hedge, fillOf('#0C090E'));
    ctx.save(); smoothPath(hedge); ctx.clip();
    softEll(1180, 748, 230, 26, '#FF9C4A', 0.35, 'lighter');
    ctx.restore();
    stroke([[wx - 40, 742], [wx + ww + 40, 742]], 'rgba(255,170,90,0.25)', 3, { ink: null });
    camEnd();
    // the foreground: a neighbour's hedge and a palm trunk, far out of focus
    layer(10, () => {
      camD(t, cx, cy, z, 1.35, 1);
      smooth([[-500, 900], [-100, 820], [240, 860], [420, 1000], [420, 1400], [-500, 1400]], fillOf('#050407'));
      rrect(1780, -200, 60, 1400, 20, fillOf('#050407'));
      camEnd();
    });
    yearTag(t, 10.2, '2001');
    caption(t, 10.4, 18.9, '로스앤젤레스 하이랜드 파크', '2001년 12월 18일 · 학교 대신 집에서 배우며 자라다');
    wash(1 - easeOut(seg(t, 9.6, 10.5)), '#FFD9A6');
    wash(easeIn(seg(t, 18.6, 19.2)) * 0.95, '#FFE8C0');
  }

  /** Inside the window: warm wall, shelves, a lamp, the sofa, a mother reading to two children. */
  function livingRoom(t, x, y, w, h) {
    ctx.fillStyle = lgrad(x, 0, x + w, 0, [[0, '#6A3A22'], [0.55, '#C9844C'], [0.8, '#F2B878'], [1, '#B57040']]);
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = rgba(i % 3 ? '#3A1E12' : '#5A2E1A', 0.8); ctx.fillRect(x + 6 + i * 6.5, y + 18 + (i % 4), 5, 26 - (i % 4)); }
    ctx.fillStyle = '#3A2012'; ctx.fillRect(x + 4, y + 44, 96, 3);
    for (let i = 0; i < 11; i++) { ctx.fillStyle = rgba(i % 2 ? '#40220F' : '#5E331C', 0.8); ctx.fillRect(x + 8 + i * 8, y + 54 + (i % 3), 6, 22 - (i % 3)); }
    // the floor lamp beyond them
    const lx = x + w * 0.83;
    ctx.fillStyle = '#2A160A'; ctx.fillRect(lx - 1, y + 40, 2, h);
    poly([[lx - 16, y + 40], [lx - 10, y + 22], [lx + 10, y + 22], [lx + 16, y + 40]], fillOf('#FFE2B0'));
    glow(lx, y + 34, 90, '#FFB060', 0.6); glow(lx, y + 32, 26, '#FFFFFF', 0.4);
    // the sofa back
    ctx.fillStyle = lgrad(0, y + h - 36, 0, y + h, [[0, '#2A140C'], [1, '#12090A']]);
    ctx.beginPath(); ctx.roundRect(x + 20, y + h - 34, w - 40, 40, 10); ctx.fill();
    // mother and the two children from behind, heads bent over the book
    const nod = Math.sin(t * 0.9) * 0.03;
    const rim = '#FFC27A';
    backBust(x + w * 0.5, y + h - 18, 0.62, { style: 'long', hair: '#1A1012', rim, lx: 1.2, ly: -1.5, tilt: 0.05 + nod });
    // the book, lifted a little, its pages lit
    const bx = x + w * 0.5 + 34, by = y + h - 64;
    const flip = seg(t, 15.6, 16.5);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.12);
    poly([[-22, 0], [0, 4], [0, -18], [-22, -22]], fillOf('#FFF0D2'));
    poly([[0, 4], [22, 0], [22, -22], [0, -18]], fillOf('#F4DDB4'));
    if (flip > 0 && flip < 1) { const fx = Math.cos(flip * Math.PI) * 22; poly([[0, 4], [fx, 0 - Math.sin(flip * Math.PI) * 6], [fx, -22 - Math.sin(flip * Math.PI) * 6], [0, -18]], fillOf('#FFF6E4')); }
    ctx.restore();
    glow(bx, by - 8, 40, '#FFE0B0', 0.35);
    backBust(x + w * 0.5 - 48, y + h - 10, 0.42, { style: 'short', hair: '#1A1012', rim, lx: 1, ly: -1.2, tilt: 0.28 + nod * 0.6 });
    backBust(x + w * 0.5 + 50, y + h - 8, 0.36, { style: 'long', hair: '#3A2418', rim, lx: 1, ly: -1.2, tilt: -0.25 - nod });
  }

  // 19.20 – 28.80: the choir room ---------------------------------------------------------------------
  const FOCUS = [820, 772, 262];                    // the girl we find: x, feet y, height
  function choir(t, lt, dur) {
    const k = easeInOut(seg(t, 19.2, 28.8));
    const z = lerp(1.06, 1.62, k);
    const cx = lerp(1180, FOCUS[0] + 40, k), cy = lerp(540, 600, k);
    const pull = easeInOut(seg(t, 19.9, 21.4));     // focus pull onto her
    const sunC = '#FFD7A0';
    skyFill([[0, '#1A1411'], [1, '#0B0807']]);
    // the back wall, its tall windows blown out by the sun, and the two back rows
    layer(lerp(1.5, 7, pull), () => {
      cam(t, cx, cy, z, 0, 0.8);
      ctx.fillStyle = lgrad(0, -200, 0, 620, [[0, '#3A2E26'], [1, '#5A4636']]); ctx.fillRect(-600, -400, 3200, 1100);
      [[300, 650], [860, 1210], [1420, 1770]].forEach(([a, b]) => {
        glow((a + b) / 2, 300, 520, '#FFD9A6', 0.35);
        ctx.fillStyle = lgrad(0, 40, 0, 560, [[0, '#FFFBF0'], [1, '#FFE7C0']]);
        ctx.beginPath(); ctx.moveTo(a, 560); ctx.lineTo(a, 160); ctx.arc((a + b) / 2, 160, (b - a) / 2, Math.PI, 0); ctx.lineTo(b, 560); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(90,70,55,0.55)';
        for (let i = 1; i < 3; i++) ctx.fillRect(lerp(a, b, i / 3) - 4, 40, 8, 520);
        for (let j = 0; j < 4; j++) ctx.fillRect(a, 200 + j * 100, b - a, 6);
      });
      // risers
      [[560, '#4A3426'], [645, '#5A3E2C']].forEach(([ry, col]) => {
        ctx.fillStyle = col; ctx.fillRect(-600, ry, 3200, 50);
        ctx.fillStyle = 'rgba(255,220,170,0.35)'; ctx.fillRect(-600, ry, 3200, 4);
      });
      for (let i = 0; i < 11; i++) child(250 + i * 140 + (hash(i, 31) - 0.5) * 50, 562, 182 * (0.9 + hash(i, 32) * 0.2), { style: ['bob', 'short', 'long'][(i * 7) % 3], sway: Math.sin(t * 1.3 + i) * 0.6, rim: '#FFE2B4', lx: 0, ly: -3 });
      for (let i = 0; i < 11; i++) child(240 + i * 145 + (hash(i, 33) - 0.5) * 50, 648, 205 * (0.9 + hash(i, 34) * 0.2), { style: ['long', 'bob', 'short'][(i * 5) % 3], sway: Math.sin(t * 1.3 + i + 2) * 0.6, rim: '#FFE2B4', lx: 0, ly: -3, pages: '#8C7458' });
      camEnd();
    });
    // the front riser and the front row, a touch soft
    cam(t, cx, cy, z, 0, 0.8);
    ctx.fillStyle = lgrad(0, 735, 0, 790, [[0, '#6A4A34'], [1, '#2E2018']]); ctx.fillRect(-600, 735, 3200, 55);
    ctx.fillStyle = 'rgba(255,225,180,0.5)'; ctx.fillRect(-600, 735, 3200, 4);
    ctx.fillStyle = lgrad(0, 790, 0, 1200, [[0, '#3A281C'], [1, '#120C09']]); ctx.fillRect(-600, 790, 3200, 600);
    // the sun's patches on the floor
    [[300, 650], [860, 1210], [1420, 1770]].forEach(([a, b]) => { softEll((a + b) / 2 + 20, 900, (b - a) * 0.75, 70, '#FFC890', 0.22, 'screen'); });
    camEnd();
    layer(lerp(0.8, 3, pull), () => {
      cam(t, cx, cy, z, 0, 0.8);
      const xs = [380, 520, 660, 980, 1120, 1260, 1400, 1540, 240];
      xs.forEach((x, i) => child(x + (hash(i, 35) - 0.5) * 30, 738, 232 * (0.9 + hash(i, 36) * 0.18), { style: ['short', 'long', 'bob'][(i * 4) % 3], sway: Math.sin(t * 1.3 + i + 4) * 0.6, rim: '#FFE2B4', lx: 0, ly: -3, pages: null }));
      camEnd();
    });
    // light pouring toward us from the windows
    cam(t, cx, cy, z, 0, 0.8);
    [[300, 650], [860, 1210], [1420, 1770]].forEach(([a, b], i) => beam(a, b, 300, a - 260 + i * 80, b + 280 + i * 60, 1100, sunC, 0.12, 0.2));
    // her: brown hair, the folder open, singing
    const [fx, fy, fh] = FOCUS;
    const breath = Math.sin(t * TAU / 2.4) * 0.5 + pulse(t, 4) * 0.3;
    softEll(fx, fy + 2, 60, 10, '#000000', 0.5);
    child(fx, fy, fh, { style: 'long', hair: '#140E0C', sway: breath, rim: '#F2C590', lx: 0.6, ly: -2.2, pages: '#E8CFA8' });
    glow(fx, fy - fh * 0.52, 70, '#FFE6C0', 0.15);
    dust(t, 200, 150, 1600, 800, 120, '#FFF0D0');
    camEnd();
    // a music stand and the piano's lid in the foreground, far out of focus
    layer(12, () => {
      cam(t, lerp(cx, W / 2, -0.3), cy, z * 1.25, 0, 0.8);
      smooth([[1300, 1400], [1360, 900], [1700, 820], [2300, 860], [2300, 1400]], fillOf('#060405'));
      stroke([[1370, 900], [1700, 826], [2200, 858]], 'rgba(255,220,180,0.35)', 8, { ink: null });
      poly([[-60, 760], [260, 740], [280, 900], [-60, 930]], fillOf('#070506'));
      rrect(100, 900, 16, 500, 6, fillOf('#070506'));
      camEnd();
    });
    caption(t, 19.8, 28.4, '여덟 살, 로스앤젤레스 어린이 합창단');
    wash(1 - easeOut(seg(t, 19.2, 20.2)), '#FFE8C0');
    wash(Math.pow(seg(t, 28.25, 28.8), 2) * 0.85, '#FFD49A');
  }

  // 28.80 – 38.40: the dance studio -----------------------------------------------------------------
  const SPINS = [[29.4, 30.5, 1], [31.8, 32.9, 1], [34.2, 35.3, 1], [36.4, 37.9, 2]];
  function dancePose(t) {
    let th = 0.35 + Math.sin(t * 0.7) * 0.15, passe = 0, arms = 1, speed = 0;
    let base = 0.35;
    for (const [a, b, turns] of SPINS) {
      if (t >= b) base += TAU * turns;
      const prep = seg(t, a - 0.5, a), land = seg(t, b, b + 0.6);
      if (t >= a - 0.5 && t < b + 0.6) {
        const k = seg(t, a, b);
        th = base + TAU * turns * easeInOut(k) + Math.sin(t * 0.7) * 0.15;
        speed = Math.sin(Math.PI * k) * (t < b ? 1 : 0);
        passe = t < a ? ease(prep) * 0.3 : t < b ? Math.min(1, 0.3 + seg(t, a, a + 0.15) * 0.7) : 1 - ease(land);
        arms = t < a ? 1 - ease(prep) : t < b ? (turns > 1 ? lerp(0, 2, ease(seg(t, a + 0.2, a + 0.6))) : 0) : lerp(turns > 1 ? 2 : 0, 1, ease(land));
        return { th, passe, arms, speed, lean: 0 };
      }
    }
    th = base + Math.sin(t * 0.7) * 0.15;
    // between turns she breathes and lets her arms float
    return { th, passe: 0, arms: 1 + Math.sin(t * 1.6) * 0.15, speed: 0, lean: Math.sin(t * 0.9) * 0.03 };
  }
  function dance(t, lt, dur) {
    const k = easeInOut(seg(t, 28.8, 38.4));
    const z = lerp(1.08, 1.3, k), cx = lerp(1180, 1110, k), cy = lerp(560, 600, k);
    skyFill([[0, '#0E0A09'], [1, '#050404']]);
    const dx = 1300 + Math.sin(t * 0.5) * 20;
    cam(t, cx, cy, z, Math.sin(t * 0.25) * 0.006, 0.9);
    studio(t, { night: 0, lamps: [1, 1, 1, 1], sun: 0.9, dancer: { x: dx, y: 905, h: 440, p: dancePose(t) } });
    dust(t, 200, 180, 1500, 760, 90, '#FFE9C8');
    camEnd();
    // a pillar at the edge of the room, out of focus
    layer(10, () => {
      cam(t, cx - 60, cy, z * 1.2, 0, 0.9);
      ctx.fillStyle = lgrad(1860, 0, 2060, 0, [[0, '#0A0706'], [0.2, '#2A1D16'], [1, '#050404']]);
      ctx.fillRect(1860, -400, 260, 1800);
      smooth([[-200, 980], [300, 960], [420, 1300], [-200, 1300]], fillOf('#060404'));
      camEnd();
    });
    narration(t, 29.5, 37.6, '노래보다 춤을\n더 사랑했던 소녀', { x: 600, y: 390 });
    wash(1 - easeOut(seg(t, 28.8, 29.8)), '#FFD49A');
    black(Math.pow(seg(t, 37.9, 38.4), 1.5));
  }

  chapter('start', 0, 38.4, [[0, doorway], [9.6, highland], [19.2, choir], [28.8, dance]]);
})();
