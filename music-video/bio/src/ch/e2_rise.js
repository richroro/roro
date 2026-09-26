// e2_rise (38.40 – 67.20) · 춤을 잃고, 노래가 남다.
//  38.40  night, the brother's small bedroom studio: blankets hung for sound, a bunk bed, blind-slat
//         streetlight on the wall, a clip lamp. She sings at a mic with a pop filter; he sits with his
//         back to us at the laptop, whose waveform grows. The camera drifts from her to the screen.
//  48.00  the empty dance studio at night. The pendant lamps go out one by one; the last goes at
//         50.40 and only a cold shaft from the high window is left, on a pair of dance shoes.
//  57.60  the laptop in the dark, a waveform breathing on it. At 60.00 the waveform spills out of the
//         screen across the frame and bends into the rim of the night-side Earth; city lights come
//         on, spreading out from Los Angeles like phone screens.
// Uses the kit from e1_start.js (window.E12).
(() => {
  const K = window.E12;
  const { layer, cam, softEll, beam, wash, black, dot, dustIn, rimmed, backBust, studio, DARK } = K;
  const fillOf = f => ({ fill: f, stroke: null });
  const WAVE = '#BFF3FF';

  /** Points of a breathing waveform from x0 to x1 about y. */
  function wavePts(t, x0, x1, y, amp, seed = 0, step = 5) {
    const pts = [], n = Math.max(2, Math.round((x1 - x0) / step));
    for (let i = 0; i <= n; i++) {
      const u = i / n, env = Math.pow(Math.sin(Math.PI * u), 1.3);
      const v = Math.sin(u * 37 + t * 5.1 + seed) * 0.5 + Math.sin(u * 91 - t * 7.3 + seed * 2) * 0.3 + Math.sin(u * 13 + t * 1.7) * 0.35;
      pts.push([lerp(x0, x1, u), y + amp * env * v]);
    }
    return pts;
  }
  /** A glowing line: wide faint halo, tube, hot core. */
  function glowLine(pts, color, lw, a = 1) {
    if (a <= 0.01 || pts.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    stroke(pts, rgba(color, 0.08 * a), lw * 9, { ink: null });
    stroke(pts, rgba(color, 0.2 * a), lw * 3.5, { ink: null });
    stroke(pts, rgba(color, 0.9 * a), lw, { ink: null });
    stroke(pts, rgba('#FFFFFF', 0.7 * a), Math.max(1, lw * 0.4), { ink: null });
    ctx.restore();
  }

  // ---- the bedroom studio -------------------------------------------------------------------------
  const BLANKETS = [[-360, 180, '#252B3E'], [120, 520, '#35222A'], [500, 980, '#2A2D34'], [930, 1400, '#24293A'], [1680, 2300, '#302430']];
  function blanketWall(t) {
    ctx.fillStyle = '#0B0A0E'; ctx.fillRect(-600, -500, 3200, 1400);
    BLANKETS.forEach(([a, b, col], i) => {
      const stops = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12, v = 0.5 + 0.5 * Math.sin(u * 17 + i * 3 + hash(i, k) * 2); stops.push([u, mix(mix(col, '#050407', 0.55), col, v)]); }
      ctx.fillStyle = lgrad(a, 0, b, 0, stops);
      ctx.beginPath(); ctx.moveTo(a, 110);
      const n = 4; for (let k = 0; k < n; k++) { const x0 = lerp(a, b, k / n), x1 = lerp(a, b, (k + 1) / n); ctx.quadraticCurveTo((x0 + x1) / 2, 150, x1, 110); }
      ctx.lineTo(b + 10, 880); ctx.lineTo(a - 10, 880); ctx.closePath(); ctx.fill();
      // quilting stitches
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      for (let y = 220; y < 880; y += 110) { ctx.beginPath(); ctx.moveTo(a, y + (i % 2) * 20); ctx.lineTo(b, y + (i % 2) * 20); ctx.stroke(); }
    });
    // the window with its blinds, a streetlight outside
    const [wx, wy, ww, wh] = [1430, 170, 250, 250];
    ctx.fillStyle = lgrad(0, wy, 0, wy + wh, [[0, '#0C1426'], [1, '#2A1E22']]); ctx.fillRect(wx, wy, ww, wh);
    glow(wx + ww * 0.75, wy + wh * 0.35, 180, '#FF9A4A', 0.45);
    for (let y = wy + 6; y < wy + wh; y += 16) { ctx.fillStyle = 'rgba(20,14,16,0.9)'; ctx.fillRect(wx, y, ww, 9); ctx.fillStyle = 'rgba(255,170,100,0.18)'; ctx.fillRect(wx, y, ww, 1.5); }
    ctx.fillStyle = '#08070A'; ctx.fillRect(wx - 10, wy - 10, ww + 20, 10); ctx.fillRect(wx - 10, wy + wh, ww + 20, 12); ctx.fillRect(wx - 10, wy, 10, wh); ctx.fillRect(wx + ww, wy, 10, wh);
    // blind-slat stripes thrown across the blankets
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 11; k++) {
      const y0 = 300 + k * 30, a = 0.11 * (1 - k / 14);
      ctx.fillStyle = rgba('#FFA35C', a);
      ctx.beginPath(); ctx.moveTo(760, y0 + 170); ctx.lineTo(1330, y0); ctx.lineTo(1330, y0 + 13); ctx.lineTo(760, y0 + 190); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // carpet
    ctx.fillStyle = lgrad(0, 870, 0, 1300, [[0, '#17121A'], [1, '#060508']]); ctx.fillRect(-600, 870, 3200, 600);
  }
  function bunk(t) {
    const wood = '#130D0C', woodHi = 'rgba(255,190,120,0.18)';
    // mattresses, rumpled duvets, a pillow
    [[350, 420], [700, 760]].forEach(([y0, y1], i) => {
      ctx.fillStyle = lgrad(0, y0 - 30, 0, y1, [[0, i ? '#2A2436' : '#2E2230'], [1, '#0E0B12']]);
      ctx.beginPath(); ctx.moveTo(-60, y1); ctx.lineTo(-60, y0);
      for (let k = 0; k <= 6; k++) ctx.quadraticCurveTo(-30 + k * 80, y0 - 30 - hash(k, i) * 20, 10 + k * 80, y0 - 8);
      ctx.lineTo(470, y1); ctx.closePath(); ctx.fill();
      ell(60, y0 - 24, 70, 22, fillOf(i ? '#3A3446' : '#40303A'));
    });
    ctx.fillStyle = wood;
    [[-40, 40], [440, 40]].forEach(([x, w]) => ctx.fillRect(x, 120, w * 0.6, 780));
    ctx.fillRect(-60, 410, 540, 20); ctx.fillRect(-60, 760, 540, 20); ctx.fillRect(-60, 290, 540, 14);
    ctx.fillStyle = woodHi; ctx.fillRect(440, 120, 3, 780);
    // ladder
    for (let k = 0; k < 5; k++) { ctx.fillStyle = wood; ctx.fillRect(470, 460 + k * 70, 90, 10); }
    ctx.fillRect(552, 290, 14, 610);
    // the clip lamp, a small warm pool
    poly([[420, 420], [462, 392], [478, 420], [446, 446]], fillOf('#2A1E16'));
    glow(452, 434, 220, '#FFB066', 0.55); glow(452, 434, 40, '#FFF2DA', 0.6);
  }
  function micStand(x, y, t) {
    const c = '#0A090C';
    stroke([[x, 905], [x, 610]], c, 7, { ink: null });
    stroke([[x - 40, 905], [x, 890], [x + 40, 905]], c, 6, { ink: null });
    stroke([[x, 610], [x - 46, 575]], c, 6, { ink: null });
    // the microphone in its shock mount
    ctx.save(); ctx.translate(x - 50, 560); ctx.rotate(-0.08);
    rrect(-15, -46, 30, 80, 13, { fill: lgrad(-15, 0, 15, 0, [[0, '#3A3440'], [0.35, '#141218'], [1, '#050407']]), stroke: null });
    ctx.strokeStyle = 'rgba(255,190,130,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-13, -30); ctx.lineTo(-13, 20); ctx.stroke();
    ctx.restore();
    // the pop filter: a gauze disc on a gooseneck, light through it
    stroke([[x, 700], [x - 30, 640], [x - 72, 590]], c, 3, { ink: null, smooth: true });
    ctx.save(); ctx.translate(x - 90, 566); ctx.scale(0.4, 1);
    ctx.fillStyle = 'rgba(20,18,26,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#08070A'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = 'rgba(140,190,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 45, -0.6, 0.9); ctx.stroke();
    ctx.restore();
  }
  function singer(t, x, y, s) {
    const body = lgrad(-130, 0, 130, 0, [[0, '#2A1A14'], [0.25, DARK], [0.75, DARK], [1, '#101826']]);
    rimmed(-1.6, -1.2, '#B07850', (f) => silhouette(x, y, s, { t: t * 0.4, body: f || body, hair: f || '#1C130F' }));
    // headphones
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#08070A'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, -448, 66, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    rrect(-80, -468, 22, 46, 9, fillOf('#0A090C')); rrect(58, -468, 22, 46, 9, fillOf('#0A090C'));
    ctx.strokeStyle = 'rgba(255,180,120,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -448, 72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
  }
  /** The laptop from the front: screen quad and base. (x, y) = bottom centre of the screen. */
  function laptop(t, x, y, w, h, content) {
    softEll(x, y + 18, w * 0.8, 16, '#000000', 0.6);
    poly([[x - w / 2 - 14, y + 4], [x + w / 2 + 14, y + 4], [x + w / 2 + 34, y + 26], [x - w / 2 - 34, y + 26]], { fill: lgrad(0, y, 0, y + 26, [[0, '#2A3038'], [1, '#0C0E12']]), stroke: null });
    rrect(x - w / 2 - 8, y - h - 8, w + 16, h + 14, 6, fillOf('#08090C'));
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.clip();
    content(x - w / 2, y - h, w, h);
    ctx.restore();
  }
  /** A generic recording screen: lanes of clips, the one being recorded growing to the playhead. */
  function daw(t, x, y, w, h, prog) {
    ctx.fillStyle = lgrad(0, y, 0, y + h, [[0, '#101A2A'], [1, '#08101C']]); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1A2638'; ctx.fillRect(x, y, w, h * 0.09);
    const lanes = 4, lh = (h * 0.88) / lanes, px = x + w * 0.1 + w * 0.86 * prog;
    for (let i = 0; i < lanes; i++) {
      const ly = y + h * 0.11 + i * lh;
      ctx.fillStyle = i % 2 ? '#0D1624' : '#0F192A'; ctx.fillRect(x, ly, w, lh - 1);
      ctx.fillStyle = '#1C2A40'; ctx.fillRect(x, ly, w * 0.08, lh - 2);
      const x0 = x + w * 0.1, x1 = i === 1 ? px : x + w * (0.4 + 0.12 * i);
      if (i === 3) continue;
      const col = i === 1 ? '#7FD8FF' : '#4E7FB8';
      ctx.fillStyle = rgba(col, 0.18); ctx.fillRect(x0, ly + 2, x1 - x0, lh - 5);
      ctx.fillStyle = rgba(col, 0.9);
      for (let xx = x0; xx < x1; xx += 1.6) {
        const u = (xx - x0) / 40, a = (0.25 + 0.75 * Math.abs(Math.sin(u * 2.3 + i) * Math.sin(u * 0.7 + i * 2))) * (0.6 + 0.4 * hash(Math.floor(xx * 3), i)) * lh * 0.4;
        ctx.fillRect(xx, ly + lh / 2 - a, 1, a * 2);
      }
    }
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(px, y + h * 0.09, 1.5, h);
    glow(px, y + h * 0.4, 30, '#9FE4FF', 0.3);
  }

  function bedroom(t, lt, dur) {
    const k = easeInOut(seg(t, 38.4, 47.8));
    const z = lerp(1.18, 1.62, k), cx = lerp(860, 1330, k), cy = lerp(560, 640, k);
    const focusToScreen = ease(seg(t, 42.5, 45.5));
    skyFill([[0, '#050407'], [1, '#050407']]);
    layer(3, () => { cam(t, cx, cy, z, 0, 0.9); blanketWall(t); bunk(t); camEnd(); });
    cam(t, cx, cy, z, 0, 0.9);
    // the desk along the right wall, the laptop and its light
    ctx.fillStyle = lgrad(0, 760, 0, 800, [[0, '#2A2226'], [1, '#0C0A0C']]); ctx.fillRect(1150, 760, 1100, 40);
    ctx.fillStyle = '#08070A'; ctx.fillRect(1150, 800, 1100, 200);
    rrect(1600, 660, 70, 100, 6, fillOf('#0C0B0E'));                                    // a monitor speaker
    circle(1635, 720, 22, fillOf('#060508')); circle(1635, 684, 9, fillOf('#060508'));
    rrect(1180, 748, 110, 16, 3, fillOf('#15131A'));                                     // a small keyboard
    for (let i = 0; i < 12; i++) ctx.fillRect(1184 + i * 9, 752, 6, 8);
    const prog = seg(t, 38.4, 48.0);
    laptop(t, 1400, 758, 220, 140, (x, y, w, h) => daw(t, x, y, w, h, prog));
    glow(1400, 690, 420, '#5FA8FF', 0.22);
    softEll(1400, 772, 260, 20, '#8CC8FF', 0.25, 'lighter');
    camEnd();
    // her, at the mic (softening as focus moves to the screen)
    layer(focusToScreen * 3.5, () => {
      cam(t, cx, cy, z, 0, 0.9);
      softEll(760, 905, 110, 14, '#000000', 0.5);
      singer(t, 760, 905, 0.78);
      micStand(900, 905, t);
      glow(700, 520, 180, '#FFB070', 0.08);
      camEnd();
    });
    // him, back to us, lit by the screen, in the foreground
    layer(lerp(3.5, 1.2, focusToScreen), () => {
      cam(t, cx + (cx - W / 2) * 0.12, cy, z * 1.06, 0, 0.9);
      const nod = pulse(t, 5) * 0.03;
      smooth([[1440, 1300], [1450, 900], [1520, 870], [1680, 870], [1740, 900], [1750, 1300]], fillOf('#050407'));
      backBust(1600, 980, 1.55, { style: 'short', rim: '#8FC6FF', lx: -2.5, ly: -2.5, tilt: -0.06 + nod, body: '#08070B', hair: '#0C0A0E' });
      camEnd();
    });
    cam(t, cx, cy, z, 0, 0.9);
    dust(t, 700, 200, 900, 600, 40, '#FFD9B0');
    camEnd();
    caption(t, 39.0, 47.6, '댄스 선생님의 안무를 위해 녹음한 노래 “Ocean Eyes”', '오빠 피니어스가 쓰고, 둘이 침실에서 녹음하다');
    black(1 - easeOut(seg(t, 38.4, 39.0)));
    black(easeIn(seg(t, 47.4, 48.0)));
  }

  // ---- the studio goes dark ------------------------------------------------------------------------
  const OFFS = [48.6, 49.8, 50.4, 49.2];            // lamp i goes out at OFFS[i]; the last on the 50.40 hit
  function lampLevel(t, off) {
    if (t < off - 0.14) return 1;
    if (t < off) return Math.floor(t * 36) % 2 ? 1 : 0.25;
    return 0.35 * Math.exp(-(t - off) * 9);
  }
  const SHOES = { x: 1040, y: 905, s: 0.9 };
  function darkStudio(t, lt, dur) {
    const push = easeInOut(seg(t, 50.6, 57.6));
    const z = lerp(1.06, 2.25, push), cx = lerp(990, SHOES.x, push), cy = lerp(560, 850, push);
    const L = OFFS.map(o => lampLevel(t, o));
    const moon = t < 50.4 ? 0.35 : lerp(0.35, 1, easeOut(seg(t, 50.4, 51.6))) + 0.25 * Math.exp(-(t - 50.4) * 2.5);
    skyFill([[0, '#040406'], [1, '#040406']]);
    cam(t, cx, cy, z, 0, 0.7);
    const lit = L.reduce((a, b) => a + b, 0) / 4;
    studio(t, { night: 1, lamps: L, moon, shoes: { ...SHOES, light: clamp(0.25 + lit * 0.6 + (t > 50.4 ? 0.35 * seg(t, 50.4, 51.4) : 0)) } });
    camEnd();
    // the rest of the room drops into darkness as the lamps go
    fillScreen('#020203', 0.35 * (1 - lit));
    layer(10, () => {
      cam(t, cx - 80, cy, z * 1.2, 0, 0.7);
      ctx.fillStyle = lgrad(1860, 0, 2060, 0, [[0, '#050405'], [0.2, '#141016'], [1, '#030203']]);
      ctx.fillRect(1860, -400, 260, 1800);
      camEnd();
    });
    narration(t, 48.6, 53.8, '그 무렵, 엉덩이 성장판을 다쳐\n춤을 그만둬야 했다', { y: 400, size: 54 });
    narration(t, 54.2, 57.4, '열세 살이었다', { y: 420, size: 58 });
    black(1 - easeOut(seg(t, 48.0, 48.35)));
    black(easeIn(seg(t, 57.25, 57.6)));
  }

  // ---- the song goes out into the world ------------------------------------------------------------
  // city clusters: [lat, lon, weight]
  const CITIES = [
    [34.05, -118.25, 3], [37.77, -122.42, 2], [47.6, -122.33, 1.5], [49.28, -123.12, 1.2], [33.45, -112.07, 1.5], [39.74, -104.99, 1.3],
    [32.78, -96.8, 2], [29.76, -95.37, 2], [41.88, -87.63, 2.5], [44.98, -93.27, 1.2], [33.75, -84.39, 1.8], [25.76, -80.19, 1.8],
    [40.71, -74.0, 3], [42.36, -71.06, 1.6], [38.9, -77.04, 1.8], [43.65, -79.38, 1.8], [45.5, -73.57, 1.4], [19.43, -99.13, 2.5],
    [25.69, -100.31, 1.3], [20.67, -103.35, 1.3], [23.11, -82.37, 1], [4.71, -74.07, 1.4], [51.5, -0.12, 2.8], [48.86, 2.35, 2.5],
    [40.42, -3.7, 2], [38.72, -9.14, 1.2], [53.35, -6.26, 1.2], [52.52, 13.4, 2], [52.37, 4.9, 1.6], [41.9, 12.5, 1.8], [45.46, 9.19, 1.6],
    [59.33, 18.07, 1.2], [59.91, 10.75, 1], [52.23, 21.01, 1.4], [64.15, -21.94, 0.6], [33.57, -7.59, 1.2], [41.39, 2.17, 1.6],
    [55.86, -4.25, 1.1], [41.01, 28.98, 2.2], [55.76, 37.62, 2.4], [30.04, 31.24, 2.2], [6.52, 3.38, 1.8], [-23.55, -46.63, 2.6],
    [-22.91, -43.17, 2], [-34.6, -58.38, 2], [-12.05, -77.04, 1.4], [37.57, 126.98, 2.6], [35.68, 139.69, 3], [50.45, 30.52, 1.4],
    [47.5, 19.04, 1.2], [53.48, -2.24, 1.5], [36.17, -115.14, 1], [45.52, -122.68, 1.1], [39.95, -75.17, 1.7], [42.33, -83.05, 1.4],
    [32.72, -117.16, 1.6], [38.58, -121.49, 1], [40.76, -111.89, 1], [39.1, -94.58, 1.2], [38.63, -90.2, 1.2], [36.16, -86.78, 1.1],
    [29.95, -90.07, 1.1], [51.05, -114.07, 1], [49.9, -97.14, 0.8], [45.42, -75.7, 1], [35.23, -80.84, 1.2], [41.5, -81.69, 1.1],
    [40.44, -80.0, 1.1], [27.95, -82.46, 1.2], [28.54, -81.38, 1.1], [29.42, -98.49, 1.3], [30.27, -97.74, 1.2], [35.47, -97.52, 0.9],
    [35.08, -106.65, 0.9], [32.51, -117.04, 1.2], [14.63, -90.51, 1.1], [8.98, -79.52, 1], [10.48, -66.9, 1.4], [18.49, -69.93, 1.1],
    [18.47, -66.1, 1], [46.81, -71.21, 0.9], [44.65, -63.58, 0.7], [43.04, -87.91, 1], [39.77, -86.16, 1], [39.96, -83.0, 1],
    [42.89, -78.88, 0.9], [36.85, -76.29, 1], [21.16, -86.85, 0.8], [25.03, -77.4, 0.5], [31.77, -106.44, 1], [29.07, -110.96, 0.8],
  ];
  const RAD = Math.PI / 180;
  const vec = (lat, lon) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const LA = vec(34.05, -118.25);
  const ARCS = [12, 22, 8, 17, 2, 23, 11, 42, 24, 27, 15, 31, 44, 64];   // cities the song reaches first
  function globeView(t) {
    const k = easeInOut(seg(t, 60.4, 67.2));
    const R = lerp(2900, 1450, k), top = lerp(440, 300, k), lat0 = lerp(-26, -8, k), lon0 = lerp(-112, -72, k);
    const f = vec(lat0, lon0), e = [-Math.sin(lon0 * RAD), Math.cos(lon0 * RAD), 0];
    const n = [-Math.sin(lat0 * RAD) * Math.cos(lon0 * RAD), -Math.sin(lat0 * RAD) * Math.sin(lon0 * RAD), Math.cos(lat0 * RAD)];
    return { R, cx: W / 2, cy: top + R, f, e, n, proj: (p, alt = 0) => [W / 2 + R * (1 + alt) * dot3(p, e), top + R - R * (1 + alt) * dot3(p, n), dot3(p, f)] };
  }
  const limbY = (g, x) => g.cy - Math.sqrt(Math.max(0, g.R * g.R - (x - g.cx) * (x - g.cx)));
  function globe(t, a) {
    const g = globeView(t);
    ctx.save(); ctx.globalAlpha *= a;
    // stars above the rim
    for (let i = 0; i < 90; i++) { const x = hash(i, 91) * W, y = 132 + hash(i, 92) * 500; if (y < limbY(g, x) - 20) { ctx.globalAlpha = a * (0.25 + 0.5 * hash(i, 93)) * (0.7 + 0.3 * Math.sin(t * 3 + i)); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, 1.6, 1.6); } }
    ctx.globalAlpha = a;
    // the night side of the planet, the atmosphere on its rim, a first hint of dawn far to the east
    ctx.fillStyle = rgrad(g.cx, g.cy, g.R * 0.6, g.R, [[0, '#020409'], [0.8, '#050B18'], [1, '#0D1E3C']]);
    ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.fill();
    ctx.fillStyle = rgrad(g.cx, g.cy, g.R - 60, g.R + 70, [[0, 'rgba(40,110,255,0)'], [0.42, 'rgba(70,140,255,0.28)'], [0.48, 'rgba(160,210,255,0.55)'], [0.56, 'rgba(70,130,255,0.18)'], [1, 'rgba(30,70,200,0)']]);
    ctx.fillRect(0, 0, W, H);
    softEll(W + 120, limbY(g, W) + 10, 700, 90, '#FF9A5A', 0.28, 'lighter');
    softEll(W + 120, limbY(g, W) - 10, 400, 40, '#FFE0B0', 0.2, 'lighter');
    // city lights, switching on outward from Los Angeles
    CITIES.forEach(([lat, lon, wgt], ci) => {
      const d = Math.acos(clamp(dot3(vec(lat, lon), LA), -1, 1));
      const t0 = 60.7 + d / Math.PI * 5.6 + hash(ci, 7) * 0.4;
      if (t < t0) return;
      const nn = Math.round(8 + wgt * 12);
      for (let j = 0; j < nn; j++) {
        const sp = j === 0 ? 0 : Math.pow(hash(ci, j * 2 + 100), 1.5) * (1.2 + wgt * 1.1);
        const ang = hash(ci, j * 2 + 101) * TAU;
        const p = vec(lat + Math.sin(ang) * sp, lon + Math.cos(ang) * sp / Math.cos(lat * RAD));
        const [x, y, depth] = g.proj(p);
        if (depth < 0.02 || y < 120 || y > 960 || x < -20 || x > W + 20) continue;
        const tj = t0 + j * 0.05 + hash(ci, j + 300) * 0.4, kk = seg(t, tj, tj + 0.3);
        if (kk <= 0) continue;
        const fade = clamp(depth * 5), big = j === 0 ? 1 : 0.5 + hash(ci, j + 200) * 0.4;
        const sc = g.R / 1600;
        const flick = 1 + 1.4 * Math.exp(-(t - tj) * 5);
        dot(x, y, (7 + wgt * 3) * big * sc * flick, hash(ci, j + 400) > 0.75 ? '#DDEBFF' : '#FFC26E', kk * fade * 0.9);
      }
      if (t < t0 + 1.2) { const [x, y, depth] = g.proj(vec(lat, lon)); if (depth > 0) { const r = (t - t0) * 90; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(WAVE, 0.4 * (1 - (t - t0) / 1.2) * clamp(depth * 5)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * clamp(depth + 0.2), 0, 0, TAU); ctx.stroke(); ctx.restore(); } }
    });
    // the song travelling: arcs from Los Angeles
    ARCS.forEach((ci, i) => {
      const [lat, lon] = CITIES[ci], ts = 60.9 + i * 0.42, u1 = easeOut(seg(t, ts, ts + 1.4));
      if (u1 <= 0) return;
      const b = vec(lat, lon), om = Math.acos(clamp(dot3(LA, b), -1, 1));
      const pts = [];
      for (let s = 0; s <= 40; s++) {
        const u = (s / 40) * u1, sa = Math.sin((1 - u) * om) / Math.sin(om), sb = Math.sin(u * om) / Math.sin(om);
        const p = [LA[0] * sa + b[0] * sb, LA[1] * sa + b[1] * sb, LA[2] * sa + b[2] * sb];
        const [x, y, depth] = g.proj(p, Math.sin(Math.PI * u) * 0.018 * om);
        if (depth < 0.3) break;
        pts.push([x, y]);
      }
      const fadeA = 1 - 0.65 * seg(t, ts + 1.4, ts + 3.0);
      glowLine(pts, WAVE, 2.2, 0.55 * fadeA);
      if (pts.length && u1 < 1) dot(pts[pts.length - 1][0], pts[pts.length - 1][1], 14, '#FFFFFF', 0.9);
    });
    ctx.restore();
    return g;
  }

  function worldwide(t, lt, dur) {
    skyFill([[0, '#030305'], [1, '#030305']]);
    const push = easeInOut(seg(t, 57.6, 59.6)), rush = easeIn(seg(t, 59.4, 60.0));
    const z = lerp(1.0, 1.12, push) + rush * 0.25, room = 1 - ease(seg(t, 60.05, 60.9));
    const pump = 1 + 0.35 * pulse(t, 5);
    const burst = t >= 60 ? Math.exp(-(t - 60) * 2.2) : 0;
    if (room > 0.01) {
      // the dark room: blurred warm lamp far left, the window stripes, the desk
      layer(9, () => {
        cam(t, W / 2, 560, z * 0.9, 0, 0.6);
        ctx.fillStyle = '#07060A'; ctx.fillRect(-400, -200, 2800, 1400);
        glow(160, 380, 260, '#FFA860', 0.4);
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (let k = 0; k < 8; k++) { ctx.fillStyle = rgba('#FF9A50', 0.07); ctx.fillRect(1380, 180 + k * 34, 520, 14); }
        ctx.restore();
        camEnd();
      }, room);
      cam(t, W / 2, 560, z, 0, 0.6);
      ctx.save(); ctx.globalAlpha *= room;
      ctx.fillStyle = lgrad(0, 780, 0, 1100, [[0, '#15121A'], [1, '#050407']]); ctx.fillRect(-400, 780, 2800, 500);
      // the laptop, close
      softEll(960, 800, 620, 40, '#000000', 0.6);
      poly([[590, 796], [1330, 796], [1480, 1040], [440, 1040]], { fill: lgrad(0, 796, 0, 1040, [[0, '#262B34'], [1, '#0C0E12']]), stroke: null });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) {
        const yy = 818 + r * 34, sx = lerp(620, 470, r / 5), ex = lerp(1300, 1450, r / 5), kw = (ex - sx) / 14;
        ctx.fillStyle = rgba('#7FB8FF', 0.05 + 0.04 * (1 - r / 5)); ctx.fillRect(sx + c * kw + 3, yy, kw - 6, 24);
      }
      ctx.restore();
      rrect(572, 318, 776, 486, 12, fillOf('#08090C'));
      ctx.fillStyle = lgrad(0, 332, 0, 790, [[0, '#0C1524'], [1, '#060B14']]); ctx.fillRect(586, 332, 748, 458);
      ctx.strokeStyle = 'rgba(120,170,230,0.08)'; ctx.lineWidth = 1;
      for (let x = 620; x < 1330; x += 50) { ctx.beginPath(); ctx.moveTo(x, 360); ctx.lineTo(x, 780); ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,90,140,0.4)'; ctx.fillRect(586, 332, 748, 22);
      ctx.fillRect(606, 360, 1, 420);
      ctx.save(); ctx.beginPath(); ctx.rect(586, 332, 748, 458); ctx.clip();
      if (t < 60) glowLine(wavePts(t, 620, 1300, 560, 120 * pump, 1, 4), WAVE, 3, 1);
      glowLine(wavePts(t * 0.8, 620, 1300, 560, 60 * pump, 4, 6), '#5FA8FF', 1.5, 0.45 * (t < 60 ? 1 : 1 - seg(t, 60, 60.3)));
      ctx.restore();
      glow(960, 560, 700, '#4F9CFF', 0.2 + burst * 0.15);
      softEll(960, 830, 520, 40, '#8CC8FF', 0.2, 'lighter');
      ctx.restore();
      camEnd();
    }
    // 60.00: the waveform spills out of the screen and becomes the rim of the planet
    let g = null;
    const ga = ease(seg(t, 60.35, 61.3));
    if (t >= 60.3) g = globe(t, ga);
    if (t >= 60.0) {
      const zz = z;
      const spill = easeOut(seg(t, 60.0, 60.7)), bend = easeInOut(seg(t, 60.45, 61.5));
      const x0 = lerp(960 - 340 * zz, -60, spill), x1 = lerp(960 + 340 * zz, W + 60, spill);
      const gv = g || globeView(t);
      const amp = 120 * zz * pump * (0.45 + 0.55 * burst) * (1 - bend * 0.85);
      const pts = wavePts(t, x0, x1, 0, amp, 1, 4).map(([x, y]) => [x, lerp(540, limbY(gv, x), bend) + y]);
      glowLine(pts, WAVE, 3.2, 1 - ease(seg(t, 61.4, 62.6)) * 0.85);
    }
    narration(t, 58.0, 61.8, '남은 건, 노래였다', { y: 222, size: 58 });
    yearTag(t, 62.0, '2015');
    caption(t, 62.0, 67.0, '2015년 11월 사운드클라우드 공개', '입소문을 타고 세상으로 퍼져 나가다');
    black(1 - easeOut(seg(t, 57.6, 58.1)));
    wash(burst * 0.12, '#CFEFFF');
    wash(easeIn(seg(t, 66.75, 67.2)) * 0.55, '#FFF4E0');
  }

  chapter('rise', 38.4, 67.2, [[38.4, bedroom], [48.0, darkStudio], [57.6, worldwide]]);
})();
