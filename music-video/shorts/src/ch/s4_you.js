// s4_you (47.27 – 58.5; the video ends at 58.15) · 4 · 너
//
// 47.27  Someone else's small room at night: a desk lamp, an old laptop, a window of stars, a kid
//        in headphones seen from behind. Not Billie: an anonymous child, short brown hair.
// 50.91  Close-up: a finger presses a red record button (51.82, on the beat); the camera pulls
//        back to the screen, where the first waveform draws itself and light floods the room.
// 54.55  The last hit: focus lines, sparkles, "다음은\n너야." huge in the middle; the kid stands
//        on a rooftop at dawn, back to us. The frame settles and holds clean to the end.
//
// Helpers from s3_top.js: window.S34.
(() => {
  const S34 = window.S34;
  const { G, INK, scr, kick, shake, goldDust, ring, captionShade, burst } = window.S34;
  const KID_HAIR = '#6A4428', HOOD = '#3B4C8C', HOOD_SH = '#27315F', SKIN = '#EDC3A0';

  /**
   * The kid, from behind: short brown hair, headphones, a hoodie. (x, y) = the ground (or the seat
   * if o.sit), ~600 tall at s = 1. o: t, sit, rim ('#hex'), rimK, bob.
   */
  function kid(x, y, s, o = {}) {
    const t = o.t ?? 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const hy = -470 + (o.bob || 0);
    if (!o.sit) {
      // legs and sneakers
      for (const lx of [-40, 40]) {
        stroke([[lx, -170], [lx * 1.1, -20]], '#1E1B2A', 48, { ink: null });
        rrect(lx * 1.1 - 36, -26, 72, 30, 13, { fill: '#F2EFEA', stroke: null });
      }
    }
    // arms
    const armL = o.armL || [[-120, -340], [-150, -230], [-140, -130]], armR = o.armR || [[120, -340], [150, -230], [140, -130]];
    stroke(armL, HOOD_SH, 50, { ink: null }); stroke(armR, HOOD_SH, 50, { ink: null });
    // the hoodie, two tones, the hood bunched at the neck
    const body = [[-128, -370], [-60, -400], [60, -400], [128, -370], [148, -250], [138, -140], [-138, -140], [-148, -250]];
    smooth(body, { fill: HOOD, stroke: null });
    ctx.save(); smoothPath(body); ctx.clip();
    ctx.fillStyle = HOOD_SH; ctx.fillRect(-160, -420, 120, 300); ctx.fillRect(-160, -175, 320, 40);
    ctx.restore();
    ell(0, -392, 92, 40, { fill: HOOD_SH, stroke: null });
    ell(0, -398, 70, 24, { fill: mix(HOOD, '#FFFFFF', 0.08), stroke: null });
    // head: all hair from behind, a few tufts at the nape and a cowlick
    ell(0, hy, 96, 100, { fill: KID_HAIR, stroke: null });
    const hs = mix(KID_HAIR, '#1A0F24', 0.4);
    ctx.save(); ellPath(0, hy, 96, 100); ctx.clip(); ctx.fillStyle = hs; ctx.fillRect(-110, hy - 110, 70, 230); ctx.restore();
    for (let i = 0; i < 6; i++) {
      const u = i / 5 - 0.5, bx = u * 150;
      poly([[bx - 22, hy + 60], [bx + 22, hy + 60], [bx + u * 20 + Math.sin(t * 3 + i) * 3, hy + 108 + (i % 2) * 10]], { fill: i < 2 ? hs : KID_HAIR, stroke: null });
    }
    stroke([[6, hy - 96], [18, hy - 130 + Math.sin(t * 4) * 4], [36, hy - 120]], KID_HAIR, 12, { ink: null, smooth: true });
    ctx.save(); ctx.globalAlpha = 0.6;
    stroke([[-50, hy - 60], [-10, hy - 78], [36, hy - 72]], mix(KID_HAIR, '#FFFFFF', 0.35), 8, { ink: null, smooth: true });
    ctx.restore();
    // headphones
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#1C1A24'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.ellipse(0, hy + 6, 104, 116, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.restore();
    for (const sx of [-1, 1]) {
      rrect(sx * 104 - 22, hy - 26, 44, 84, 18, { fill: '#2A2834', stroke: INK, lw: 4 });
      rrect(sx * 104 - 8, hy - 12, 16, 56, 8, { fill: o.cup || '#6FE3C8', stroke: null });
    }
    // rim light
    if (o.rim) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.rimK ?? 0.7;
      const sides = o.rimSides || [1];
      for (const sd of sides) {
        const head = []; for (let i = 0; i <= 8; i++) { const u = -1.3 + i * 0.28; head.push([sd * Math.cos(u) * 96, hy + Math.sin(u) * 100]); }
        stroke(head, o.rim, 6, { ink: null, smooth: true });
        stroke([[sd * 128, -370], [sd * 148, -250], [sd * 138, -150]], o.rim, 6, { ink: null, smooth: true });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /** An eighth note as a shape (no text). */
  function note(x, y, s, color, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ell(0, 0, 20, 14, { fill: color, stroke: INK, lw: 4 }, -0.4);
    stroke([[17, -4], [17, -70]], color, 6, { ink: INK, olw: 5 });
    stroke([[17, -70], [40, -52], [36, -30]], color, 6, { ink: INK, olw: 5, smooth: true });
    ctx.restore();
  }

  function stars(t, n, x, y, w, h, seed = 2) {
    for (let i = 0; i < n; i++) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + hash(i, seed) * 2) + i));
      const px = x + hash(i, seed + 1) * w, py = y + hash(i, seed + 2) * h, r = 1.5 + hash(i, seed + 3) * 2.5;
      circle(px, py, r, { fill: rgba('#FFFFFF', tw), stroke: null });
      if (hash(i, seed + 4) > 0.9) sparkle(px, py, r * 4 * tw, '#FFFFFF', 0);
    }
  }

  /** A row of city blocks with lit windows. */
  function city(y, h, seed, col, lit, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    let x = -40;
    for (let i = 0; x < W + 40; i++) {
      const w = 70 + hash(i, seed) * 110, bh = h * (0.4 + hash(i, seed + 1) * 0.6);
      ctx.fillStyle = col; ctx.fillRect(x, y - bh, w + 2, bh + 400);
      for (let wy = y - bh + 18; wy < y - 10; wy += 26) for (let wx = x + 12; wx < x + w - 14; wx += 22) {
        if (hash(wx, wy + seed) > 0.72) { ctx.fillStyle = hash(wx, wy) > 0.5 ? lit : mix(lit, '#FFFFFF', 0.4); ctx.fillRect(wx, wy, 9, 12); }
      }
      x += w;
    }
    ctx.restore();
  }

  // ---- the room ----------------------------------------------------------------------------------

  /** The laptop screen: a generic recording app. rec = 0..1 how far the first take has run. */
  function daw(x, y, w, h, t, rec, pressed) {
    ctx.fillStyle = '#12151F'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#232838'; ctx.fillRect(x, y, w, h * 0.12);
    for (let i = 0; i < 3; i++) circle(x + h * 0.06 + i * h * 0.07, y + h * 0.06, h * 0.022, { fill: ['#E0484E', '#FFC23D', '#4FBF6A'][i], stroke: null });
    // the record light
    const on = pressed && (Math.floor(t * 2.2) % 2 === 0 || rec > 0.02);
    circle(x + w - h * 0.1, y + h * 0.06, h * 0.035, { fill: on ? '#FF3B3B' : '#5A2A2E', stroke: null });
    if (on) glow(x + w - h * 0.1, y + h * 0.06, h * 0.12, '#FF3B3B', 0.6);
    // lanes
    const lx = x + w * 0.04, lw = w * 0.92, lanes = 3, ly0 = y + h * 0.18, lh = h * 0.24;
    for (let i = 0; i < lanes; i++) {
      ctx.fillStyle = i === 0 ? '#1E2433' : '#191E2B'; ctx.fillRect(lx, ly0 + i * (lh + h * 0.03), lw, lh);
    }
    // grid ticks
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 1; i < 16; i++) ctx.fillRect(lx + (lw * i) / 16, ly0, 1.5, lanes * (lh + h * 0.03));
    // the waveform, born in the first lane
    const mid = ly0 + lh / 2, px = lx + lw * rec;
    if (rec > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bw = Math.max(3, w / 170);
      for (let bx = lx; bx < px; bx += bw * 1.6) {
        const i = Math.round((bx - lx) / bw), env = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.11)) * (0.55 + 0.45 * hash(i, 5));
        const a = lh * 0.45 * env * clamp((px - bx) / 30);
        ctx.fillStyle = mix(G.light, '#FFFFFF', hash(i, 6) * 0.5);
        ctx.fillRect(bx, mid - a, bw, a * 2);
      }
      ctx.restore();
      glow(px, mid, lh * 1.4, G.light, 0.5);
    }
    // playhead
    ctx.fillStyle = pressed ? '#FF5A5A' : '#8EA0C8'; ctx.fillRect(Math.max(lx, px) - 1.5, ly0 - 6, 3, lanes * (lh + h * 0.03) + 6);
  }

  const T_ROOM = 47.2727, T_CLOSE = 50.9091, T_PRESS = 51.8182, T_END = 54.5455;

  function room(t, lt) {
    const P = pulse(t, 5);
    const z = 1.0 + 0.07 * easeInOut(clamp(lt / 3.64));
    scr(() => { ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#0C0F22'], [0.5, '#1A2044'], [1, '#0E0C18']]); ctx.fillRect(0, 0, W, H); });
    camBegin(560, 960, z);
    // the wall, warm under the lamp
    glow(820, 1150, 700, '#FFB86B', 0.22);
    // window: stars, a moon, the far city
    const wx = 480, wy = 560, ww = 440, wh = 420;
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ctx.fillStyle = lgrad(0, wy, 0, wy + wh, [[0, '#070A24'], [1, '#2B3A7E']]); ctx.fillRect(wx, wy, ww, wh);
    stars(t, 40, wx, wy, ww, wh * 0.7, 7);
    circle(820, 650, 44, { fill: '#FFF3C8', stroke: null }); circle(840, 636, 40, { fill: '#0E1434', stroke: null });
    glow(812, 656, 120, '#FFF3C8', 0.25);
    city(wy + wh + 10, 170, 3, '#141A3A', '#FFD27A');
    ctx.restore();
    rrect(wx - 16, wy - 16, ww + 32, wh + 32, 8, { stroke: '#2A2238', lw: 24 });
    ctx.fillStyle = '#2A2238'; ctx.fillRect(wx + ww / 2 - 8, wy, 16, wh); ctx.fillRect(wx, wy + wh * 0.45 - 8, ww, 16);
    // curtain
    smooth([[wx + ww + 10, wy - 40], [wx + ww + 110, wy - 40], [wx + ww + 96 + Math.sin(t) * 6, wy + wh + 80], [wx + ww + 20, wy + wh + 60]], { fill: '#2C3A78', stroke: null });
    stroke([[wx + ww + 50, wy - 30], [wx + ww + 54, wy + wh + 60]], '#22306A', 16, { ink: null });
    // sticky notes with scribbles and a note shape
    const notes = [[200, 700, '#FFE45C', -0.08], [320, 760, '#FF8FB1', 0.06], [215, 850, '#7FE3D0', 0.04], [335, 900, '#FFE45C', -0.05]];
    notes.forEach(([nx, ny, c, r], i) => {
      ctx.save(); ctx.translate(nx, ny); ctx.rotate(r);
      rrect(-50, -50, 100, 100, 4, { fill: mix(c, '#1A2044', 0.35), stroke: null });
      if (i === 1) note(-6, 26, 0.6, '#2A2438');
      else for (let k = 0; k < 3; k++) stroke([[-34, -24 + k * 22], [-34 + 40 + hash(i, k) * 26, -24 + k * 22]], '#3A3450', 4, { ink: null });
      ctx.restore();
    });
    // the desk
    ctx.fillStyle = '#3E2A26'; ctx.fillRect(-200, 1320, W + 400, 40);
    ctx.fillStyle = lgrad(0, 1320, 0, 1360, [[0, '#8A5A3A'], [1, '#5A3A2A']]); ctx.fillRect(-200, 1320, W + 400, 22);
    ctx.fillStyle = '#1C1218'; ctx.fillRect(-200, 1360, W + 400, 800);
    // lamp
    stroke([[940, 1320], [960, 1100], [860, 1010]], '#2A2634', 14, { ink: INK, olw: 6 });
    rrect(900, 1300, 90, 24, 10, { fill: '#2A2634', stroke: INK, lw: 5 });
    ctx.save(); ctx.translate(860, 1010); ctx.rotate(0.55);
    poly([[-60, 0], [60, 0], [34, -70], [-34, -70]], { fill: '#E9A93A', stroke: INK, lw: 6 });
    poly([[-60, 0], [0, 0], [0, -70], [-34, -70]], { fill: '#FFD978', stroke: null });
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lgrad(830, 1030, 760, 1330, [[0, rgba('#FFD9A0', 0.5)], [1, rgba('#FFD9A0', 0.05)]]);
    ctx.beginPath(); ctx.moveTo(812, 1030); ctx.lineTo(880, 1060); ctx.lineTo(990, 1330); ctx.lineTo(560, 1330); ctx.fill();
    ctx.restore();
    glow(830, 1050, 160, '#FFE0A8', 0.7);
    ell(790, 1332, 200, 16, { fill: rgba('#FFD9A0', 0.35), stroke: null });
    // the old laptop: thick bezel, a strip of tape on the lid
    const lx = 520, ly = 1070, lw = 320, lh = 220;
    rrect(lx, ly, lw, lh, 12, { fill: '#4A4A58', stroke: INK, lw: 6 });
    daw(lx + 18, ly + 18, lw - 36, lh - 40, t, 0, false);
    // light from the screen
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.05 * P;
    ctx.fillStyle = '#9FC4FF'; ctx.fillRect(lx + 18, ly + 18, lw - 36, lh - 40); ctx.restore();
    poly([[lx - 26, ly + lh + 30], [lx + lw + 26, ly + lh + 30], [lx + lw, ly + lh], [lx, ly + lh]], { fill: '#5A5A68', stroke: INK, lw: 5 });
    rrect(lx + lw - 70, ly + 6, 52, 16, 3, { fill: rgba('#F4EAD0', 0.8), stroke: null }, 0);
    glow(lx + lw / 2, ly + lh / 2, 380, '#8FB6FF', 0.25);
    // a mug and a notebook
    rrect(400, 1262, 60, 64, 10, { fill: '#C9504C', stroke: INK, lw: 5 });
    ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2);
    stroke([[420, 1250], [412 + Math.sin(t * 2) * 6, 1220], [424, 1190]], '#FFFFFF', 5, { ink: null, smooth: true, alpha: 0.35 });
    ctx.restore();
    // dust in the lamp light
    goldDust(t, 26, 640, 1040, 320, 280, 12, '#FFE6B8');
    // the kid, headphones on, bobbing to the beat, the cable running to the laptop
    const bob = -hop(t) * 6;
    stroke([[430, 1150], [470, 1330], [540, 1310]], '#1C1A24', 5, { ink: null, smooth: true });
    kid(300, 1700, 1.3, { t, sit: true, bob, rim: '#9FC4FF', rimK: 0.8, rimSides: [1],
      armR: [[120, -340], [168, -260], [200, -300]], armL: [[-120, -340], [-160, -250], [-150, -160]] });
    // the chair back
    rrect(150, 1490, 300, 330, 40, { fill: '#15121E', stroke: INK, lw: 6 });
    rrect(170, 1510, 260, 30, 14, { fill: '#26223A', stroke: null });
    camEnd();
    goldDust(t, 18, 0, 700, W, 900, 21, '#BFD4FF');
    captionShade(0.35, 180, 480);
    tagLine(t, T_ROOM + 0.3, T_CLOSE, '지금 이 순간에도', { size: 100, y: 330 });
    flash(0.8 * (1 - clamp(lt / 0.22)), '#FFFDF0');
  }

  // ---- the record button ------------------------------------------------------------------------

  function hand(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // sleeve coming in from the lower right
    stroke([[210, 330], [470, 560]], HOOD, 150, { ink: INK, olw: 10 });
    stroke([[210, 330], [300, 410]], mix(HOOD, '#FFFFFF', 0.12), 150, { ink: null });
    ell(220, 330, 70, 84, { fill: HOOD_SH, stroke: INK, lw: 6 }, -0.8);
    // back of the hand, the index finger down to the button, curled fingers behind
    smooth([[40, 150], [120, 120], [200, 170], [230, 260], [190, 330], [110, 320], [50, 250]], { fill: SKIN, stroke: INK, lw: 7 });
    smooth([[60, 240], [120, 250], [190, 290], [200, 340], [150, 360], [90, 330], [50, 290]], { fill: mix(SKIN, '#C08060', 0.25), stroke: INK, lw: 6 });
    stroke([[110, 300], [140, 336]], mix(SKIN, '#80503A', 0.6), 4, { ink: null });
    stroke([[150, 300], [172, 332]], mix(SKIN, '#80503A', 0.6), 4, { ink: null });
    stroke([[80, 170], [30, 80], [4, 8]], SKIN, 56, { ink: INK, olw: 12 });
    ell(6, 22, 16, 10, { fill: mix(SKIN, '#FFFFFF', 0.4), stroke: null }, -1.1);
    // cel shadow on the hand
    ctx.save(); ctx.globalAlpha = 0.35;
    smooth([[130, 200], [200, 170], [230, 260], [190, 330], [150, 300]], { fill: '#A0604A', stroke: null });
    ctx.restore();
    ctx.restore();
  }

  function press(t, lt) {
    const P = pulse(t, 5);
    const pull = easeInOut(seg(t, 52.0, 52.8));
    const z = lerp(2.1, 1.0, pull), cx = lerp(560, 540, pull), cy = lerp(1420, 1050, pull);
    const [sx, sy] = shake(t, [[T_PRESS, 14, 0.35]]);
    const rec = clamp((t - (T_PRESS + 0.05)) / 2.5);
    const flood = easeIn(seg(t, 52.4, T_END));
    scr(() => { ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#0A0C1C'], [1, '#140E18']]); ctx.fillRect(0, 0, W, H); });
    camBegin(cx + sx, cy + sy, z);
    glow(1000, 900, 700, '#FFB86B', 0.18);
    // the laptop, close
    const lx = 110, ly = 690, lw = 860, lh = 540;
    rrect(lx, ly, lw, lh, 26, { fill: '#4A4A58', stroke: INK, lw: 8 });
    daw(lx + 36, ly + 36, lw - 72, lh - 84, t, rec, t >= T_PRESS);
    rrect(lx + lw - 150, ly + 10, 110, 22, 4, { fill: rgba('#F4EAD0', 0.8), stroke: null });
    poly([[lx - 60, 1330], [lx + lw + 60, 1330], [lx + lw, lh + ly], [lx, lh + ly]], { fill: '#5A5A68', stroke: INK, lw: 7 });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 13; k++) {
      const u = (k + 0.5) / 13, y0 = ly + lh + 14 + r * 28, x0 = lerp(lx - 10 - r * 14, lx + lw + 10 + r * 14, u);
      rrect(x0 - 26, y0, 52, 20, 4, { fill: '#3A3A46', stroke: null });
    }
    // the little recorder with its big red button
    rrect(340, 1370, 400, 170, 26, { fill: '#2A2834', stroke: INK, lw: 7 });
    rrect(340, 1370, 400, 26, 12, { fill: '#3A3848', stroke: null });
    for (const kx of [400, 680]) { circle(kx, 1450, 30, { fill: '#4A4858', stroke: INK, lw: 5 }); stroke([[kx, 1450], [kx + 14, 1428]], '#D8D4E4', 5, { ink: null }); }
    for (let i = 0; i < 6; i++) {
      const lit = t >= T_PRESS && (i < 2 + 4 * Math.abs(Math.sin(t * 7 + i)) * (0.5 + 0.5 * P));
      rrect(470 + i * 24, 1506, 16, 16, 3, { fill: lit ? (i > 4 ? '#FF5A5A' : i > 3 ? '#FFC23D' : '#6FE38A') : '#3A3848', stroke: null });
    }
    const down = t >= T_PRESS ? clamp(1 - (t - T_PRESS - 0.25) / 0.2) : easeIn(seg(t, 51.45, T_PRESS));
    const on = t >= T_PRESS;
    circle(540, 1452, 50, { fill: '#1A1820', stroke: INK, lw: 6 });
    circle(540, 1452 + down * 4, 40 - down * 3, { fill: on ? '#FF3B3B' : '#A0262A', stroke: INK, lw: 5 });
    circle(528, 1440 + down * 4, 12, { fill: rgba('#FFFFFF', on ? 0.8 : 0.35), stroke: null });
    if (on) glow(540, 1452, 180 + 30 * P, '#FF3B3B', 0.55);
    ring(t, T_PRESS, 540, 1452, 320, '#FFD0D0', 0.5, 20);
    speedLinesV(t, 540, 1452, 0.8 * kick(t, T_PRESS, 0.5), '#FFFFFF', 70);
    ring(t, T_PRESS + 0.1, 540, 1452, 240, G.light, 0.5, 12);
    // the finger
    const lift = t >= T_PRESS ? easeInOut(seg(t, T_PRESS + 0.35, T_PRESS + 1.0)) : 0;
    const fy = lerp(1330, 1432, down) - 60 * lift - (t < 51.45 ? 30 * Math.sin(t * 3) + 30 : 0);
    hand(536 + lift * 40, fy, 0.9, t);
    camEnd();
    // the room fills with light as the first take runs
    if (flood > 0) {
      scr(() => {
        sunburst(540, 900, rgba('#FFF2C0', 0.35 * flood), rgba('#FFFFFF', 0), t * 0.2, 28, 2400);
        glow(540, 900, 600 + 900 * flood, '#FFE7A8', 0.7 * flood);
      });
      for (let i = 0; i < 16; i++) {
        const a0 = 52.4 + hash(i, 61) * 1.8, age = t - a0; if (age < 0) continue;
        const x = 150 + hash(i, 62) * 780 + Math.sin(age * 2 + i) * 30, y = 900 - age * (220 + hash(i, 63) * 160);
        ctx.save(); ctx.globalAlpha = clamp(age * 3) * clamp(1.6 - age * 0.5);
        note(x, y, 0.8 + hash(i, 64) * 0.6, [G.light, '#FFFFFF', '#FFB3D0', '#B6FF3B'][i % 4], Math.sin(age * 2 + i) * 0.3);
        ctx.restore();
      }
      sparkles(t, Math.round(40 * flood), 0, 500, W, 1200, G.hi);
      goldDust(t, Math.round(60 * flood), 0, 400, W, 1300, 31);
    }
    captionShade(0.4, 180, 600);
    tagLine(t, T_CLOSE + 0.08, T_END, '어느 작은 방에서\n첫 노래가 시작된다', { size: 92, y: 330, colors: [ANI.white, G.light] });
    flash(0.5 * kick(t, T_PRESS, 0.2), '#FFFFFF');
    flash(0.6 * Math.pow(seg(t, 53.9, T_END), 2), '#FFF6D8');
  }

  // ---- the last hit ------------------------------------------------------------------------------

  function finale(t, lt) {
    const P = pulse(t, 5), K = kick(t, T_END, 1.2), settle = clamp(lt / 2.2);
    const [sx, sy] = shake(t, [[T_END, 40, 0.9]]);
    // the sky at first light
    scr(() => {
      ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#0E0A2C'], [0.3, '#2A1A5E'], [0.55, '#8A3A7A'], [0.68, '#FF8A6A'], [0.74, '#FFD27A'], [1, '#FFE9B0']]);
      ctx.fillRect(0, 0, W, H);
    });
    camBegin(540 + sx, 960 + sy, 1.0 + 0.12 * K + 0.03 * (1 - settle) - 0.0 + 0.02 * easeOut(settle));
    stars(t, 70, 0, 0, W, 900, 41);
    // a shooting star
    const ss = seg(t, 55.6, 56.3);
    if (ss > 0 && ss < 1) {
      const x = lerp(900, 250, ss), y = lerp(180, 420, ss);
      ctx.save(); ctx.globalAlpha = Math.sin(ss * Math.PI);
      stroke([[x, y], [x + 200, y - 72]], '#FFFFFF', 4, { ink: null, alpha: 0.6 });
      sparkle(x, y, 20, '#FFFFFF', t * 4); ctx.restore();
    }
    sunburst(540, 1330, rgba('#FFC98A', 0.14 + 0.1 * P * (1 - settle) + 0.25 * K), rgba('#FFFFFF', 0), t * 0.12, 30, 2400);
    glow(540, 1330, 700 + 300 * K, '#FFE7A8', 0.6);
    city(1360, 260, 9, '#3A2050', '#FFD27A', 0.8);
    city(1400, 160, 13, '#241438', '#FFC23D');
    // the rooftop
    ctx.fillStyle = '#140C1E'; ctx.fillRect(-200, 1470, W + 400, 700);
    ctx.fillStyle = '#2A1A36'; ctx.fillRect(-200, 1470, W + 400, 14);
    glow(540, 1478, 380, '#FFD27A', 0.3);
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1, x = 540 + side * (230 + hash(i, 71) * 300), h = 30 + hash(i, 72) * 60;
      const grow = easeOut(clamp((t - T_END - 0.2 - hash(i, 73) * 0.8) / 0.4));
      if (grow <= 0) continue;
      stroke([[x, 1478], [x + Math.sin(t * 1.5 + i) * 6, 1478 - h * grow]], '#3E7A3A', 5, { ink: null });
      S34.wildflower(x + Math.sin(t * 1.5 + i) * 6, 1478 - h * grow, (16 + hash(i, 74) * 12) * backOut(grow), { n: 5 + (i % 3), color: ['#FFFFFF', '#FFE45C', '#FF8FB1', '#B79CFF', '#7FC8FF'][i % 5], rot: i + t * 0.2 });
    }
    kid(540, 1480, 0.78, { t, rim: G.hi, rimK: 1, rimSides: [-1, 1], cup: '#FFC23D' });
    burst(t, T_END, 540, 820, 150, { speed: 2600, life: 1.1, colors: [G.hi, G.light, '#FFFFFF', '#FFB3D0'] });
    ring(t, T_END, 540, 820, 1400, '#FFFFFF', 0.7, 70);
    ring(t, T_END + 0.1, 540, 820, 1000, G.light, 0.7, 30);
    camEnd();
    speedLinesV(t, 540, 820, 1.0 * K, '#FFFFFF', 110);
    sparkles(t, 30, 0, 120, W, 1300, G.hi);
    goldDust(t, 50, 0, 200, W, 1300, 44);
    tagLine(t, T_END, 99, '다음은\n너야.', { size: 150, y: 720, colors: [ANI.white, G.light] });
    subLine(t, 55.3, 99, '영상·음악 · Claude Code 로 만들었어요 (원곡 미사용)', { y: 1550, size: 36, color: '#D8D0E8' });
    flash(0.9 * kick(t, T_END + 0.1, 0.45), '#FFFDF0');
    impact(t, T_END, 0.1);
  }

  chapter('you', 47.27, 58.5, [[47.27, room], [50.91, press], [54.55, finale]]);
})();
