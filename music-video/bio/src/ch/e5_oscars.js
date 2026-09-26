// e5_oscars (115.20 – 139.20): the bridge goes quiet. The Seoul crowd lights go out one by one,
// a spotlight clicks on over a red carpet and one golden star trophy (2022); then a pink,
// pastel doll's-house stage where a second star trophy is set down (2024); then the two
// trophies side by side in front of a huge "22", ticking up to a one-beat freeze at 138.60.
//
// Star trophies only (no statuettes), no posters, no faces.
(() => {
  const T_CARPET = 115.2, T_DOLL = 124.8, T_TWO = 134.4, T_FREEZE = 138.6, T_END = 139.2;
  const GOLD = { hi: '#FFF3C4', light: '#FFD96A', mid: '#F0AE2E', dark: '#A8700E', edge: '#6E480A' };

  const scr = fn => { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); };

  // ---- the golden star trophy -------------------------------------------------------------------

  /** A golden star on a slim stem and a dark plinth. (x, y) = bottom of the plinth; ~400 tall at s = 1. */
  function starTrophy(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    const spin = o.spin || 0;
    // plinth
    rrect(-78, -64, 156, 64, 8, { fill: lgrad(-78, 0, 78, 0, [[0, '#15101A'], [0.45, '#2C2330'], [1, '#0E0A12']]), stroke: null });
    rrect(-86, -78, 172, 16, 5, { fill: lgrad(-86, 0, 86, 0, [[0, GOLD.dark], [0.4, GOLD.light], [0.7, GOLD.mid], [1, GOLD.dark]]), stroke: null });
    rrect(-60, -30, 120, 5, 2, { fill: rgba(GOLD.mid, 0.55), stroke: null });
    // stem and knob
    poly([[-18, -78], [18, -78], [7, -206], [-7, -206]], { fill: lgrad(-18, 0, 18, 0, [[0, GOLD.dark], [0.35, GOLD.hi], [0.6, GOLD.mid], [1, GOLD.dark]]), stroke: null });
    circle(0, -212, 17, { fill: rgrad(-5, -218, 2, 18, [[0, GOLD.hi], [0.5, GOLD.light], [1, GOLD.dark]]), stroke: null });
    // the faceted star
    const cy = -305, R = 98, r = R * 0.44, light = -2.3;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + spin + i * TAU / 5;
      const tip = [Math.cos(a) * R, cy + Math.sin(a) * R];
      for (const side of [-1, 1]) {
        const b = a + side * TAU / 10, inn = [Math.cos(b) * r, cy + Math.sin(b) * r];
        const m = a + side * 0.35;
        const k = 0.5 + 0.5 * Math.cos(m - light);
        poly([[0, cy], tip, inn], { fill: mix(GOLD.dark, GOLD.hi, 0.15 + 0.8 * k), stroke: null });
      }
    }
    const pts = starShape(0, cy, R, 0.44, 5, -Math.PI / 2 + spin);
    poly(pts, { stroke: GOLD.edge, lw: 3 });
    // a glint sweeping across the star
    if (o.glint !== undefined && o.glint > 0 && o.glint < 1) {
      ctx.save(); polyPath(pts); ctx.clip();
      const gx = -160 + o.glint * 320;
      poly([[gx - 20, cy + 120], [gx + 18, cy + 120], [gx + 70, cy - 120], [gx + 32, cy - 120]], { fill: rgba('#FFFFFF', 0.7), stroke: null });
      ctx.restore();
    }
    if (o.twinkle) sparkle(Math.cos(-Math.PI / 2 + spin) * R, cy - R + 4, 26 * o.twinkle, '#FFFFFF', o.twinkle);
    ctx.restore();
  }

  /** Soft dust drifting in a light cone. */
  function motes(t, cx, top, bot, w0, w1, n, seed, a = 1) {
    for (let i = 0; i < n; i++) {
      const v = frac(hash(i, seed) + t * (0.02 + hash(i, seed + 1) * 0.03));
      const y = lerp(bot, top, v);
      const half = lerp(w1, w0, v);
      const x = cx + (hash(i, seed + 2) - 0.5) * 2 * half * 0.85 + Math.sin(t * 0.6 + i) * 10;
      const al = a * Math.sin(Math.PI * v) * (0.3 + 0.7 * hash(i, seed + 3));
      circle(x, y, 1.5 + hash(i, seed + 4) * 2.5, { fill: rgba('#FFF4D8', al), stroke: null });
    }
  }

  // ---- 115.20 red carpet ------------------------------------------------------------------------

  function carpet(t, lt, dur) {
    const L = t < 116.4 ? 0 : t < 116.55 ? 0.5 : t < 116.62 ? 0.15 : Math.min(1, 0.6 + (t - 116.62) * 3);
    const push = easeInOut(seg(t, 116.2, T_DOLL));
    camBegin(960, lerp(520, 470, push), lerp(1.0, 1.2, push) + Math.sin(t * 0.5) * 0.004, Math.sin(t * 0.3) * 0.004);

    // velvet curtain
    const g = ctx.createLinearGradient(-300, 0, 2220, 0);
    for (let i = 0; i <= 30; i++) g.addColorStop(i / 30, i % 2 ? '#3A0B18' : '#1A040B');
    rrect(-300, -300, 2520, 830, 0, { fill: g, stroke: null });
    rrect(-300, -300, 2520, 830, 0, { fill: lgrad(0, -300, 0, 530, [[0, 'rgba(5,2,6,0.85)'], [0.6, 'rgba(5,2,6,0.2)'], [1, 'rgba(5,2,6,0.5)']]), stroke: null });
    // floor
    rrect(-300, 515, 2520, 900, 0, { fill: lgrad(0, 515, 0, 1300, [[0, '#0B0608'], [1, '#1A0D10']]), stroke: null });

    // perspective: depth d -> scale 3/d, y = 430 + 260 * scale
    const P = d => { const sc = 3 / d; return [430 + 260 * sc, sc]; };
    const [yb, sb] = P(9), [yf, sf] = P(0.9);
    poly([[960 - 330 * sb, yb], [960 + 330 * sb, yb], [960 + 330 * sf, yf], [960 - 330 * sf, yf]],
      { fill: lgrad(0, yb, 0, yf, [[0, '#4A0710'], [0.5, '#8E1020'], [1, '#B3182B']]), stroke: null });
    // carpet edge trim
    for (const side of [-1, 1]) stroke([[960 + side * 318 * sb, yb], [960 + side * 318 * sf, yf]], rgba(GOLD.mid, 0.35), 4, { ink: null });

    // stanchions and velvet ropes
    const depths = [8.5, 6.6, 5.2, 4.1, 3.2, 2.5, 1.9];
    for (const side of [-1, 1]) {
      for (let j = 0; j < depths.length; j++) {
        const [y, sc] = P(depths[j]), x = 960 + side * 430 * sc;
        if (j > 0) {
          const [y0, s0] = P(depths[j - 1]), x0 = 960 + side * 430 * s0;
          const top0 = y0 - 150 * s0, top1 = y - 150 * sc;
          ctx.beginPath(); ctx.moveTo(x0, top0);
          ctx.quadraticCurveTo((x0 + x) / 2, (top0 + top1) / 2 + 55 * sc, x, top1);
          ctx.strokeStyle = '#6A0A1C'; ctx.lineWidth = 11 * sc; ctx.lineCap = 'round'; ctx.stroke();
          ctx.strokeStyle = rgba('#E0506A', 0.35); ctx.lineWidth = 3 * sc; ctx.stroke();
        }
        ell(x, y, 32 * sc, 9 * sc, { fill: GOLD.dark, stroke: null });
        rrect(x - 6 * sc, y - 150 * sc, 12 * sc, 150 * sc, 4 * sc, { fill: lgrad(x - 6 * sc, 0, x + 6 * sc, 0, [[0, GOLD.dark], [0.4, GOLD.light], [1, GOLD.dark]]), stroke: null });
        circle(x, y - 156 * sc, 11 * sc, { fill: GOLD.light, stroke: null });
      }
    }

    // darkness until the light comes on
    fillScreen('#050207', 0.55 + 0.4 * (1 - L));

    // the spotlight
    const [ty, ts] = P(4.4);
    if (L > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L;
      poly([[960 - 46, -260], [960 + 46, -260], [960 + 200, ty], [960 - 200, ty]],
        { fill: lgrad(0, -260, 0, ty, [[0, 'rgba(255,240,210,0.02)'], [0.6, 'rgba(255,236,200,0.10)'], [1, 'rgba(255,230,190,0.22)']]), stroke: null });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = L;
      ell(960, ty, 230, 52, { fill: rgrad(960, ty, 10, 230, [[0, 'rgba(255,120,120,0.55)'], [0.7, 'rgba(210,40,60,0.25)'], [1, 'rgba(210,40,60,0)']]), stroke: null });
      ctx.restore();
      glow(960, ty - 200, 420, '#FFE2A8', 0.22 * L);
      ctx.save(); ctx.globalAlpha = L; motes(t, 960, -200, ty, 46, 200, 40, 7, 0.9); ctx.restore();
    }

    // the trophy: barely there in the dark, gilded once the light is on
    ctx.save(); ctx.globalAlpha *= 0.06 + 0.94 * L;
    starTrophy(960, ty, ts * 1.25, { glint: seg(t, 118.2, 119.4), twinkle: Math.max(0, Math.sin(Math.PI * seg(t, 120.6, 121.8))) + Math.max(0, Math.sin(Math.PI * seg(t, 123.0, 124.0))) });
    ctx.restore();
    camEnd();

    // handover: the Seoul crowd lights go out, the last few drift up and fade
    if (lt < 1.6) {
      scr(() => {
        for (let i = 0; i < 260; i++) {
          const row = Math.floor(hash(i, 1) * 9), y0 = 560 + row * 50 + hash(i, 2) * 30;
          const x = hash(i, 3) * 1980 - 30 + Math.sin(t * 3.3 + i) * 6;
          const d = hash(i, 4) * 1.0 + (1 - Math.abs(x - 960) / 960) * 0.3;
          const k = clamp(1 - (lt - d) / 0.25);
          if (k <= 0) continue;
          const rise = Math.max(0, lt - d * 0.6) * 60 * hash(i, 5);
          const c = hash(i, 6) < 0.6 ? '#FFF6E0' : hash(i, 6) < 0.8 ? BIO.lime : BIO.pink;
          circle(x, y0 - rise - pulse(t, 5) * 6, 3 + hash(i, 7) * 3, { fill: rgba(c, 0.85 * k), stroke: null });
        }
      });
    }
    // the click of the lamp
    if (t >= 116.4 && t < 116.7) flash(0.12 * (1 - seg(t, 116.4, 116.7)), '#FFF1D6');

    yearTag(t, 116.4, '2022');
    caption(t, 117.0, T_DOLL - 0.05, '첫 아카데미상 · 주제가상', '“No Time to Die”');
  }

  // ---- 124.80 the pink doll's-house stage -------------------------------------------------------

  const PASTEL = { wall: '#FFC2D9', trim: '#FFF4F8', roof: '#FF8FB9', roofDk: '#E86A9E', lilac: '#D9C6FF', mint: '#BFF0DF', butter: '#FFF0B8', peach: '#FFD3C2', hall: '#FFE3EE', floor: '#F7A8C8' };

  function room(x, y, w, h, paper, draw) {
    rrect(x, y, w, h, 6, { fill: paper, stroke: null });
    // wallpaper stripes
    ctx.save(); rrectPath(x, y, w, h, 6); ctx.clip();
    for (let i = 0; i < w / 26; i++) rrect(x + i * 26 + 6, y, 8, h, 0, { fill: rgba('#FFFFFF', 0.28), stroke: null });
    rrect(x, y + h - 26, w, 26, 0, { fill: rgba('#C9789E', 0.35), stroke: null });
    rrect(x, y, w, 30, 0, { fill: 'rgba(80,20,50,0.12)', stroke: null });
    if (draw) draw();
    ctx.restore();
  }

  function dollHouse(t) {
    const hb = pulse(t, 5);
    // outer body and roof
    poly([[372, 330], [960, 44], [1548, 330]], { fill: PASTEL.roof, stroke: PASTEL.trim, lw: 10 });
    for (let i = 0; i < 16; i++) { // scalloped trim under the roof
      const k = (i + 0.5) / 16, x = lerp(400, 1520, k), y = 336;
      circle(x, y, 18, { fill: PASTEL.trim, stroke: null });
    }
    poly([[520, 300], [960, 88], [1400, 300]], { fill: PASTEL.roofDk, stroke: null, alpha: 0.35 });
    rrect(412, 330, 1096, 470, 10, { fill: PASTEL.wall, stroke: PASTEL.trim, lw: 10 });
    // the two wings, two floors each
    const rooms = [
      [440, 350, 332, 205, PASTEL.lilac, () => { // bedroom: little bed and a window
        rrect(470, 420, 110, 80, 10, { fill: '#FFFFFF', stroke: null });
        rrect(470, 470, 170, 40, 10, { fill: '#FF9CC4', stroke: null });
        rrect(470, 460, 44, 24, 10, { fill: '#FFFFFF', stroke: null });
        rrect(650, 380, 80, 70, 8, { fill: '#BDE8FF', stroke: '#FFFFFF', lw: 6 });
        stroke([[690, 380], [690, 450]], '#FFFFFF', 4, { ink: null });
      }],
      [440, 575, 332, 205, PASTEL.mint, () => { // sitting room: sofa and a lamp
        rrect(480, 690, 180, 60, 22, { fill: '#FF8FB9', stroke: null });
        rrect(470, 660, 36, 90, 16, { fill: '#FF7BAC', stroke: null });
        rrect(634, 660, 36, 90, 16, { fill: '#FF7BAC', stroke: null });
        stroke([[720, 750], [720, 650]], '#FFFFFF', 4, { ink: null });
        poly([[700, 650], [740, 650], [730, 620], [710, 620]], { fill: '#FFF0B8', stroke: null });
        glow(720, 640, 60, '#FFF0B8', 0.25 + 0.2 * hb);
      }],
      [1148, 350, 332, 205, PASTEL.butter, () => { // dressing room: round mirror and a dresser
        circle(1250, 430, 46, { fill: '#DDF3FF', stroke: '#FFFFFF', lw: 8 });
        rrect(1196, 485, 110, 60, 8, { fill: '#FFB3CF', stroke: null });
        rrect(1360, 400, 70, 140, 10, { fill: '#D9C6FF', stroke: null });
        stroke([[1395, 410], [1395, 530]], '#FFFFFF', 3, { ink: null });
      }],
      [1148, 575, 332, 205, PASTEL.peach, () => { // stairs
        for (let i = 0; i < 6; i++) rrect(1190 + i * 40, 750 - i * 28, 250 - i * 40, 30, 4, { fill: i % 2 ? '#FFFFFF' : '#FFE8F0', stroke: null });
        rrect(1400, 600, 50, 70, 6, { fill: '#BDE8FF', stroke: '#FFFFFF', lw: 5 });
      }],
    ];
    for (const [x, y, w, h, c, d] of rooms) room(x, y, w, h, c, d);
    // floor dividers
    rrect(430, 556, 350, 16, 4, { fill: PASTEL.trim, stroke: null });
    rrect(1140, 556, 350, 16, 4, { fill: PASTEL.trim, stroke: null });
    // the tall centre hall: the stage
    rrect(790, 190, 340, 590, 12, { fill: lgrad(0, 190, 0, 780, [[0, '#FFD2E4'], [1, PASTEL.hall]]), stroke: PASTEL.trim, lw: 10 });
    ctx.save(); rrectPath(790, 190, 340, 590, 12); ctx.clip();
    // hall arch window and a chandelier
    ctx.beginPath(); ctx.moveTo(900, 330); ctx.lineTo(900, 270); ctx.arc(960, 270, 60, Math.PI, 0); ctx.lineTo(1020, 330); ctx.closePath();
    paint({ fill: '#FFE9F3', stroke: '#FFFFFF', lw: 6 });
    // curtains
    for (const side of [-1, 1]) {
      const x0 = 960 + side * 170, x1 = 960 + side * 118;
      smooth([[x0, 190], [x1 - side * 10, 190], [x1 + side * 8, 420], [x1 - side * 4, 780], [x0, 780]], { fill: '#FF79AE', stroke: null });
      for (let i = 0; i < 3; i++) stroke([[x0 - side * (14 + i * 14), 200], [x0 - side * (18 + i * 12), 770]], rgba('#FFFFFF', 0.25), 4, { ink: null });
    }
    // valance
    for (let i = 0; i < 8; i++) circle(810 + i * 43, 196, 30, { fill: '#FF79AE', stroke: null });
    ctx.restore();
    // footlights along the front
    rrect(360, 790, 1200, 40, 14, { fill: '#F48DB6', stroke: PASTEL.trim, lw: 8 });
    for (let i = 0; i < 14; i++) {
      const x = 410 + i * 84, on = 0.55 + 0.45 * Math.sin(t * 2 + i * 0.9);
      circle(x, 810, 8, { fill: '#FFF7E0', stroke: null });
      glow(x, 810, 40, '#FFE6F0', 0.25 * on + 0.25 * hb);
    }
  }

  function doll(t, lt, dur) {
    skyFill([[0, '#2A0820'], [0.55, '#5C1742'], [1, '#8A2C60']]);
    const k = easeInOut(seg(t, T_DOLL, T_TWO));
    camBegin(960, lerp(470, 520, k), lerp(0.9, 1.08, k), 0);
    glow(960, 480, 900, '#FF7FB8', 0.3 + 0.08 * Math.sin(t * 1.3));
    // the stage floor
    ell(960, 845, 820, 90, { fill: lgrad(0, 760, 0, 940, [[0, '#FFB8D2'], [1, '#D96A98']]), stroke: null });
    dollHouse(t);

    // the second trophy is set down on a round plinth in the hall
    const land = 127.2;
    const drop = kf(t, [[125.3, -230], [land, 0]], easeOut);
    const fade = clamp((t - 125.3) / 0.8);
    ell(960, 772, 110, 22, { fill: '#FFFFFF', stroke: null });
    rrect(850, 740, 220, 34, 16, { fill: lgrad(850, 0, 1070, 0, [[0, '#FFB3CF'], [0.5, '#FFE3EE'], [1, '#FFB3CF']]), stroke: null });
    ell(960, 740, 110, 20, { fill: '#FFF4F8', stroke: null });
    if (t < land + 0.1) glow(960, 740, 120, '#FFFFFF', 0.3 * fade * (1 - drop / -230));
    ctx.save(); ctx.globalAlpha *= fade;
    glow(960, 560 + drop, 280, '#FFE08A', 0.28 + 0.1 * pulse(t, 4));
    starTrophy(960, 742 + drop, 0.92, { glint: seg(t, 128.4, 129.4), twinkle: Math.max(0, Math.sin(Math.PI * seg(t, 130.2, 131.2))) + Math.max(0, Math.sin(Math.PI * seg(t, 132.6, 133.6))) });
    ctx.restore();
    // landing: a soft ring and a few sparkles
    if (t >= land) {
      const a = t - land;
      if (a < 1.2) {
        ctx.save(); ctx.globalAlpha = 1 - a / 1.2;
        ell(960, 742, 110 + a * 260, 22 + a * 50, { fill: null, stroke: '#FFFFFF', lw: 5 });
        ctx.restore();
      }
      for (let i = 0; i < 9; i++) {
        const q = seg(a, i * 0.05, 1.3 + i * 0.05);
        if (q <= 0 || q >= 1) continue;
        const ang = -Math.PI * (0.1 + 0.8 * hash(i, 31));
        sparkle(960 + Math.cos(ang) * (60 + 180 * easeOut(q)), 640 + Math.sin(ang) * (60 + 200 * easeOut(q)), 16 * (1 - q), '#FFFFFF', q * 2);
      }
    }
    // pink dust floating up
    for (let i = 0; i < 26; i++) {
      const v = frac(hash(i, 41) + t * 0.05);
      circle(300 + hash(i, 42) * 1320, lerp(900, 120, v), 2 + hash(i, 43) * 3, { fill: rgba('#FFE6F2', 0.6 * Math.sin(Math.PI * v)), stroke: null });
    }
    camEnd();
    // heartbeat on the cut
    flash(0.45 * Math.exp(-(t - T_DOLL) * 5), '#FF9CC8');
    fillScreen(rgrad(960, 540, 300, 1100, [[0, 'rgba(40,0,30,0)'], [1, 'rgba(40,0,30,0.35)']]));

    yearTag(t, 125.4, '2024');
    caption(t, 126.0, T_TWO - 0.05, '두 번째 아카데미 주제가상', '영화 〈바비〉의 “What Was I Made For?”', { accent: BIO.pink });
  }

  // ---- 134.40 the two trophies, 22, the freeze --------------------------------------------------

  function two(t, lt, dur) {
    const frozen = t >= T_FREEZE;
    const tf = Math.min(t, T_FREEZE);
    skyFill([[0, '#0B0710'], [0.6, '#170C1A'], [1, '#221021']]);
    const beats = (tf - T_TWO) / SONG.beat;
    const tick = beats < 0 ? 0 : Math.exp(-frac(beats + 1e-6) * 6);
    camBegin(960, 500, 1 + seg(tf, T_TWO, T_FREEZE) * 0.06 + tick * 0.006, 0);

    // the huge 22
    const kk = easeOut(seg(tf, 134.9, 135.9));
    if (kk > 0) {
      ctx.save();
      ctx.translate(960, 450); const s = lerp(0.85, 1, kk) + seg(tf, 135.9, T_FREEZE) * 0.04; ctx.scale(s, s);
      ctx.globalAlpha = kk;
      ctx.font = `500px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = lgrad(0, -330, 0, 330, [[0, '#9A7020'], [0.5, '#5A3A0C'], [1, '#2A1806']]);
      ctx.fillText('22', 0, 20);
      ctx.lineWidth = 4; ctx.strokeStyle = rgba(GOLD.light, 0.75); ctx.strokeText('22', 0, 20);
      ctx.restore();
    }
    // two spotlights
    for (const x of [500, 1420]) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      poly([[x - 30, -120], [x + 30, -120], [x + 150, 790], [x - 150, 790]], { fill: lgrad(0, -120, 0, 790, [[0, 'rgba(255,236,200,0.02)'], [1, 'rgba(255,230,190,0.16)']]), stroke: null });
      ctx.restore();
      ell(x, 790, 170, 34, { fill: rgrad(x, 790, 10, 170, [[0, 'rgba(255,220,150,0.45)'], [1, 'rgba(255,220,150,0)']]), stroke: null });
    }
    // the trophies glide in from both sides and meet
    const m = easeOut(seg(tf, T_TWO, 135.6));
    const xl = lerp(-220, 500, m), xr = lerp(2140, 1420, m);
    glow(xl, 520, 260, '#FFD96A', 0.2);
    glow(xr, 520, 260, '#FFD96A', 0.2);
    starTrophy(xl, 790, 1.0, { spin: (1 - m) * -0.8, glint: seg(tf, 135.7, 136.5), twinkle: tick * 0.8 });
    starTrophy(xr, 790, 1.0, { spin: (1 - m) * 0.8, glint: seg(tf, 136.3, 137.1), twinkle: tick * 0.8 });
    camEnd();

    // eight ticks, one per beat of the build; the last one is the silence
    scr(() => {
      for (let i = 0; i < 8; i++) {
        const x = 960 + (i - 3.5) * 46, on = beats >= i - 1e-6;
        const c = i === 7 ? BIO.pink : BIO.lime;
        rrect(x - 14, 1000, 28, 6, 3, { fill: on ? c : 'rgba(255,255,255,0.18)', stroke: null });
      }
    });
    bigFact(tf, 135.6, 999, '스물두 살, 역대 최연소 오스카 2회 수상', 960, 905, 78);

    if (frozen) {
      // one beat of stillness: the picture holds, the light drains a little, a thin frame
      fillScreen('#000000', 0.22);
      scr(() => {
        ctx.strokeStyle = rgba('#FFFFFF', 0.5); ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, W - 80, H - 80);
      });
    }
  }

  chapter('oscars', T_CARPET, T_END, [[T_CARPET, carpet], [T_DOLL, doll], [T_TWO, two]]);
})();
