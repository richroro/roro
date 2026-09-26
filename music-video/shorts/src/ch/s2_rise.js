// s2_rise (14.55 – 32.73) · 서다.
//  14.55  an exploding stage seen from behind her: green hair, pyro on the beat, lasers, flashes,
//         a sea of lights
//  18.18  a rainy night window, cold blue: she sits hugging her knees, seen from behind
//  21.82  the heartbeat: a hand on a microphone, trembling, then (23.64) gripping it hard
//  25.45  she gets up and walks down a dark corridor to a door leaking light, hair streaming
//  29.09  the build: aura, a clock ring ticking every beat, the shake rising; 32.27 pure white
//
// Uses the kit that s1_lost.js leaves in window.S12.
(() => {
  const { hbox, fig, blurLayer, cam, shakes, jitter, softEll, beam, dot, dust, scrim, white, crackPts } = window.S12;
  const HAIR = '#7ED321', B = SONG.beat;
  const T0 = 14.5455, T_RAIN = 18.1818, T_HB = 21.8182, T_WALK = 25.4545, T_BUILD = 29.0909, T_SIL = 32.2727, T_END = 32.7273;

  // ---- shot 1: the stage explodes --------------------------------------------------------------
  const PYRO = [0, 2, 4, 6].map(i => T0 + i * B * 2);   // every half bar
  function pyro(t, x, base, t0, h) {
    const age = t - t0;
    if (age < 0 || age > 1.1) return;
    const k = easeOut(clamp(age / 0.18)), fade = 1 - clamp((age - 0.5) / 0.6);
    const top = base - h * k;
    ctx.save(); ctx.globalAlpha *= fade;
    // a cel flame: outer orange, inner yellow, core white
    for (const [c, w, sh] of [['#FF5A1F', 1, 0], ['#FFC83D', 0.62, 0.1], ['#FFF6D8', 0.3, 0.2]]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10, y = lerp(base, top + h * sh, u);
        pts.push([x + (70 * w * (1 - u * 0.8) + Math.sin(t * 30 + i * 2) * 14 * w), y]);
      }
      for (let i = 10; i >= 0; i--) {
        const u = i / 10, y = lerp(base, top + h * sh, u);
        pts.push([x - (70 * w * (1 - u * 0.8) + Math.sin(t * 27 + i * 2.3) * 14 * w), y]);
      }
      smooth(pts, { fill: c, stroke: null });
    }
    ctx.restore();
    glow(x, lerp(base, top, 0.5), 420, '#FF9A3D', 0.7 * fade);
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (hash(i, t0 * 10) - 0.5) * 1.4, sp = 500 + hash(i, 3) * 700;
      const px = x + Math.cos(a) * sp * age, py = base - h * 0.6 + Math.sin(a) * sp * age + 700 * age * age;
      dot(px, py, 16, '#FFD890', fade);
    }
  }

  function stage(t, lt) {
    const hits = PYRO;
    const [sx, sy] = shakes(t, hits, 22, 0.35);
    const z = kf(lt, [[0, 1.35], [0.5, 1.05], [3.63, 1.0]], easeOut);
    cam(t, 540 + sx, 1060 + sy, z, Math.sin(lt * 0.8) * 0.02 - 0.02 * Math.exp(-lt * 3), 1.2);
    // the arena
    ctx.fillStyle = lgrad(0, 0, 0, 1900, [[0, '#06030F'], [0.5, '#1A0830'], [1, '#3A0E48']]);
    ctx.fillRect(-500, -500, 2100, 2900);
    // a big backlight bloom beyond the crowd
    glow(540, 700, 900, '#7E3BFF', 0.35 + 0.25 * pulse(t, 5));
    // lasers fanning from the stage out over the crowd
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1, ox = 540 + side * (260 + (i % 3) * 120), oy = 1560;
      const a = -Math.PI / 2 + side * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.7 + i))) ;
      const c = [ANI.lime, ANI.pink, '#6FE3FF'][i % 3];
      ctx.strokeStyle = rgba(c, 0.55 + 0.35 * pulse(t, 4)); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 2400, oy + Math.sin(a) * 2400); ctx.stroke();
      ctx.strokeStyle = rgba(c, 0.18); ctx.lineWidth = 26;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 2400, oy + Math.sin(a) * 2400); ctx.stroke();
    }
    ctx.restore();
    // the crowd: rows of heads and a sea of raised lights, swaying on the beat
    for (let r = 0; r < 7; r++) {
      const y = 980 + r * 70, s = 0.5 + r * 0.12, n = 16 + (6 - r) * 3;
      for (let i = 0; i < n; i++) {
        const x = -60 + (i + (r % 2) * 0.5) / n * 1200, bob = hop(t + hash(i, r) * 0.2) * 10 * s;
        const lx = x + Math.sin(t * 3 + i + r) * 16 * s, ly = y - 70 * s - bob;
        if (hash(i, r + 30) > 0.35) {
          stroke([[x, y], [lx, ly]], '#1A0C26', 9 * s, { ink: null });
          const c = hash(i, r + 7) > 0.6 ? ANI.lime : hash(i, r + 8) > 0.5 ? '#FFFFFF' : '#BFE4FF';
          dot(lx, ly, 26 * s * (0.8 + 0.4 * pulse(t, 5)), c, 0.9);
        }
        ell(x, y + 10, 30 * s, 34 * s, { fill: '#12081E', stroke: null });
      }
    }
    // camera flashes popping in the crowd
    const f = Math.floor(t * 14);
    for (let i = 0; i < 5; i++) {
      if (hash(i, f) > 0.55) continue;
      const x = hash(i, f + 1) * 1080, y = 900 + hash(i, f + 2) * 500;
      dot(x, y, 70, '#FFFFFF', 1); sparkle(x, y, 26, '#FFFFFF', 0.3);
    }
    // the stage floor
    ctx.fillStyle = lgrad(0, 1500, 0, 2300, [[0, '#1B1426'], [1, '#07050C']]);
    ctx.beginPath(); ctx.moveTo(-500, 1560); ctx.lineTo(1580, 1560); ctx.lineTo(1580, 2400); ctx.lineTo(-500, 2400); ctx.fill();
    stroke([[-500, 1560], [1580, 1560]], ANI.lime, 6, { ink: null, alpha: 0.8 });
    for (let i = -6; i <= 6; i++) stroke([[540 + i * 90, 1560], [540 + i * 300, 2400]], '#2A2140', 3, { ink: null });
    softEll(540, 1640, 520, 90, ANI.lime, 0.25, 'screen');
    // pyro on the beat at both edges
    for (const h of hits) { pyro(t, 150, 1580, h, 620); pyro(t, 930, 1580, h, 620); }
    // her
    const bob = hop(t) * 8;
    fig(() => heroine(540, 1660 - bob, 0.93, { t, view: 'back', pose: 'reach', hair: HAIR, wind: 0.85, rim: '#FFFFFF', rimK: 0.8 }),
      { box: hbox(540, 1660, 0.93), ink: 7, rim: '#F4FFD8', light: [0.3, -1], rimW: 10, rimGlow: 0.8, glow: [ANI.lime, 0.35, 40] });
    confetti(t, T0, { n: 70, burst: true, y: 700, colors: [ANI.lime, ANI.pink, ANI.gold, '#FFFFFF', '#6FE3FF'] });
    camEnd();
    for (const h of hits) speedLinesV(t, 540, 1100, t >= h ? clamp(1 - (t - h) / 0.3) * 0.7 : 0, '#FFFFFF');
    scrim(0.7);
    tagLine(t, T0 + 0.05, T_RAIN, '열일곱,\n1위', { size: 124, y: 310, colors: [ANI.white, ANI.gold] });
    subLine(t, T0 + 0.5, T_RAIN, '데뷔 앨범 빌보드 200 1위\n“bad guy” 핫 100 1위', { size: 54, y: 575 });
    impact(t, T0, 0.1);
    white(Math.exp(-lt * 7));
    for (const h of hits.slice(1)) white(0.35 * Math.exp(-(t - h) * 14) * (t >= h ? 1 : 0));
  }

  // ---- shot 2: rain on the window --------------------------------------------------------------
  /** Sitting on the floor hugging her knees, seen from behind. Ground point at (x, y), ~520 tall at s = 1. */
  function hugBack(x, y, s, t, hair) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const cloth = '#2A2540', clothSh = '#1C1830';
    // sneaker toes and elbows peeking out at the sides
    rrect(-250, -34, 90, 34, 16, { fill: '#F4F2EE', stroke: null });
    rrect(160, -34, 90, 34, 16, { fill: '#F4F2EE', stroke: null });
    ell(-196, -200, 44, 60, { fill: clothSh, stroke: null }, -0.3);
    ell(196, -200, 44, 60, { fill: cloth, stroke: null }, 0.3);
    const back = [[-190, 0], [-206, -120], [-184, -262], [-120, -350], [-40, -382], [40, -382], [120, -350], [184, -262], [206, -120], [190, 0]];
    smooth(back, { fill: cloth, stroke: null });
    ctx.save(); smoothPath(back); ctx.clip();
    ctx.fillStyle = clothSh; ctx.fillRect(-260, -420, 250, 440);
    ell(0, -350, 120, 56, { fill: clothSh, stroke: null });          // the hood, down
    stroke([[-110, -340], [-60, -300], [0, -290], [60, -300], [110, -340]], '#3A3458', 6, { ink: null, smooth: true });
    stroke([[0, -290], [0, -40]], '#221E36', 5, { ink: null });
    stroke([[-150, -60], [150, -60]], '#221E36', 8, { ink: null, alpha: 0.7 });   // the hem band
    ctx.restore();
    // head, bowed so it sits low between the shoulders
    const hy = -420, hairSh = mix(hair, '#0A1020', 0.5);
    for (let i = 0; i < 7; i++) {
      const u = i / 6 - 0.5, lx = u * 170, sw = Math.sin(t * 1.2 + i) * 6;
      smooth([[lx - 26, hy - 20], [lx + 26, hy - 20], [lx + u * 60 + 8 + sw, hy + 170 + 30 * Math.cos(u * 3)], [lx + u * 60 - 8 + sw, hy + 180 + 30 * Math.cos(u * 3)]],
        { fill: i % 2 ? hair : hairSh, stroke: null });
    }
    ell(0, hy + 6, 88, 86, { fill: hair, stroke: null });
    // strands from the crown, pointed tips falling over the shoulders
    for (let i = 0; i < 6; i++) {
      const u = i / 5 - 0.5, sw = Math.sin(t * 1.3 + i * 1.1) * 4;
      smooth([[u * 60, hy - 70], [u * 150 + 26, hy + 10], [u * 190 + sw, hy + 120 + 20 * Math.cos(u * 4)], [u * 150 - 20, hy + 20]],
        { fill: i % 2 ? mix(hair, '#0A1020', 0.22) : hair, stroke: null });
    }
    stroke([[0, hy - 84], [4, hy - 30]], hairSh, 5, { ink: null });
    ctx.save(); ctx.globalAlpha = 0.6;
    stroke([[-50, hy - 58], [-16, hy - 76], [22, hy - 76], [52, hy - 58]], mix(hair, '#FFFFFF', 0.5), 8, { ink: null, smooth: true });
    ctx.restore();
    ctx.restore();
  }

  function rain(t, lt) {
    const z = kf(lt, [[0, 1.0], [3.64, 1.1]], easeInOut);
    cam(t, 540, 1150, z, 0, 0.5);
    ctx.fillStyle = lgrad(0, 0, 0, 2000, [[0, '#0A1224'], [1, '#050912']]);
    ctx.fillRect(-500, -500, 2100, 2900);
    // the window: a blurred wet city beyond
    const wx = 70, wy = 560, ww = 940, wh = 1000;
    ctx.save(); rrectPath(wx, wy, ww, wh, 8); ctx.clip();
    ctx.fillStyle = lgrad(0, wy, 0, wy + wh, [[0, '#101E3A'], [0.7, '#1C3A5E'], [1, '#27527A']]);
    ctx.fillRect(wx, wy, ww, wh);
    blurLayer(14, () => {
      for (let i = 0; i < 40; i++) {
        const bx = wx + hash(i, 1) * ww, by = wy + wh * (0.45 + hash(i, 2) * 0.55);
        const c = hash(i, 3) > 0.7 ? '#FFC98A' : hash(i, 3) > 0.35 ? '#7FB8FF' : '#A0E8FF';
        circle(bx, by, 16 + hash(i, 4) * 40, { fill: c, stroke: null, alpha: 0.35 + 0.25 * Math.sin(t + i) ** 2 });
      }
      for (let i = 0; i < 9; i++) {
        const bx = wx + i * 110, bh = 200 + hash(i, 9) * 300;
        ctx.fillStyle = '#0C1830'; ctx.fillRect(bx, wy + wh - bh, 90, bh);
      }
    });
    // rain beyond the glass
    ctx.save(); ctx.strokeStyle = rgba('#BFD8FF', 0.35); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const x = wx + frac(hash(i, 5) + t * 0.05) * ww, y = wy + frac(hash(i, 6) + t * (1.4 + hash(i, 7))) * (wh + 200) - 100;
      ctx.moveTo(x, y); ctx.lineTo(x - 14, y + 70);
    }
    ctx.stroke(); ctx.restore();
    // drops on the glass, some running down
    for (let i = 0; i < 46; i++) {
      const run = hash(i, 11) > 0.7;
      const x = wx + hash(i, 12) * ww, y0 = wy + hash(i, 13) * wh;
      const y = run ? wy + frac(hash(i, 13) + t * 0.12 * (0.5 + hash(i, 14))) * wh : y0;
      const r = 5 + hash(i, 15) * 9;
      if (run) stroke([[x, y - 90], [x + 2, y]], '#9FC8FF', r * 0.5, { ink: null, alpha: 0.25 });
      circle(x, y, r, { fill: rgba('#0E1A30', 0.5), stroke: rgba('#BFE0FF', 0.6), lw: 2 });
      circle(x - r * 0.3, y - r * 0.3, r * 0.3, { fill: '#E6F4FF', stroke: null, alpha: 0.8 });
    }
    ctx.restore();
    // frame and sill
    rrect(wx, wy, ww, wh, 8, { fill: null, stroke: '#050A16', lw: 26 });
    stroke([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], '#050A16', 18, { ink: null });
    stroke([[wx, wy + wh * 0.4], [wx + ww, wy + wh * 0.4]], '#050A16', 14, { ink: null });
    rrect(wx - 30, wy + wh - 6, ww + 60, 40, 6, { fill: '#16223A', stroke: '#050A16', lw: 6 });
    // cold light from the window onto the floor
    beam(wx + 60, wx + ww - 60, wy + wh + 30, wx - 200, wx + ww + 200, 2200, '#6F9FE0', 0.18, 0.2);
    ctx.fillStyle = lgrad(0, 1600, 0, 2200, [[0, '#0E1628'], [1, '#050912']]);
    ctx.fillRect(-500, 1600, 2100, 800);
    softEll(540, 1650, 330, 50, '#000000', 0.7);
    // her, small and still
    fig(() => hugBack(540, 1650, 1.05, t, HAIR),
      { box: [230, 1030, 620, 660], ink: 5, tint: ['#0E2240', 0.45], rim: '#9FD0FF', light: [0.15, -1], rimW: 8, rimGlow: 0.6 });
    // screentone shade over the lower half of the room
    ctx.save(); ctx.beginPath(); ctx.rect(-500, 1380, 2100, 1000); ctx.clip();
    screentone(-100, 1380, 1300, 900, 14, '#000000', 0.35);
    ctx.restore();
    // rain in front, falling fast
    ctx.save(); ctx.strokeStyle = rgba('#DDEBFF', 0.28); ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < 50; i++) {
      const x = frac(hash(i, 21) + t * 0.08) * 1300 - 100, y = frac(hash(i, 22) + t * (2.2 + hash(i, 23))) * 2400 - 200;
      ctx.moveTo(x, y); ctx.lineTo(x - 20, y + 120);
    }
    ctx.stroke(); ctx.restore();
    camEnd();
    fillScreen('#0A2A5A', 0.12);
    scrim(0.7);
    tagLine(t, T_RAIN + 0.1, T_HB, '하지만 무대 밖에선', { size: 100, y: 330, color: '#DDEBFF' });
    subLine(t, T_RAIN + 0.5, T_HB, '우울증, 투렛 증후군과 싸웠다', { size: 56, y: 470, color: '#BFD8FF' });
    fillScreen('#000000', 1 - clamp(lt / 0.15));
  }

  // ---- shot 3: the heartbeat, a hand on the microphone -----------------------------------------
  const BEATS = [T_HB, T_HB + B * 0.6, T_HB + B * 4, T_HB + B * 4.6];
  const GRIP = T_HB + B * 4;

  function micHand(t, grip, shiver) {
    // local space: the mic's axis is vertical through x = 0
    const SK = '#F4DCCD', SK2 = '#EBC7B4', SH = '#D9A994';
    // the microphone
    ell(0, -440, 150, 160, { fill: '#3A3A48', stroke: ANI.ink, lw: 8 });
    ctx.save(); ellPath(0, -440, 150, 160); ctx.clip();
    ctx.strokeStyle = '#5E5E70'; ctx.lineWidth = 5;
    for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 200, -640); ctx.lineTo(i * 22 + 200, -240); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 22 + 200, -640); ctx.lineTo(i * 22 - 200, -240); ctx.stroke(); }
    ell(-50, -500, 60, 70, { fill: '#FFFFFF', stroke: null, alpha: 0.18 });
    ctx.fillStyle = rgba('#000000', 0.3); ctx.fillRect(40, -640, 200, 420);
    ctx.restore();
    rrect(-128, -300, 256, 50, 12, { fill: '#8A8AA0', stroke: ANI.ink, lw: 7 });
    rrect(-128, -300, 256, 16, 8, { fill: '#C9C9DA', stroke: null });
    poly([[-112, -252], [112, -252], [70, 520], [-70, 520]], { fill: '#23222E', stroke: ANI.ink, lw: 8 });
    poly([[40, -252], [112, -252], [70, 520], [30, 520]], { fill: '#15141C', stroke: null });
    stroke([[-80, -240], [-50, 500]], '#4A4A5E', 10, { ink: null });
    // the sleeve, big and soft, coming in from the lower left
    smooth([[-640, 560], [-420, 120], [-200, 20], [-110, 170], [-150, 420], [-360, 760]], { fill: '#2E2A48', stroke: ANI.ink, lw: 8 });
    stroke([[-380, 280], [-220, 110]], '#423C6A', 16, { ink: null });
    // back of the hand / palm heel on the left of the handle
    smooth([[-230, -150], [-120, -170], [-100, 180], [-200, 200], [-260, 60]], { fill: SK, stroke: ANI.ink, lw: 6 });
    // four fingers wrapped across the handle; loose they stand off it and shiver
    const loose = 1 - grip;
    for (let i = 0; i < 4; i++) {
      const fy = -130 + i * 72, len = 210 - Math.abs(i - 1.3) * 22;
      const off = loose * (16 + hash(i, 3) * 10) + Math.sin(t * 40 + i * 2) * shiver * 5;
      const x0 = -150 - off * 0.3, x1 = x0 + len + off;
      rrect(x0, fy + off * 0.2, x1 - x0, 64, 32, { fill: i % 2 ? SK : SK2, stroke: ANI.ink, lw: 6 });
      smooth([[x0 + 20, fy + 40], [x1 - 20, fy + 40], [x1 - 16, fy + 60], [x0 + 24, fy + 60]], { fill: SH, stroke: null, alpha: 0.7 });
      // knuckle line and (when gripping hard) a pale pressure highlight
      stroke([[x0 + 70, fy + 14], [x0 + 70, fy + 48]], SH, 5, { ink: null });
      if (grip > 0.3) rrect(x0 + 14, fy + 10, 40, 18, 9, { fill: '#FFF4EE', stroke: null, alpha: grip * 0.9 });
    }
    // the thumb over the top finger
    const ty = -160 + loose * -20;
    smooth([[-200, ty + 10], [-120, ty - 30], [20, ty - 18], [60, ty + 12], [20, ty + 40], [-120, ty + 44]], { fill: SK, stroke: ANI.ink, lw: 6 });
    rrect(10, ty - 12, 40, 34, 14, { fill: '#FBE9E0', stroke: null });
  }

  function heartbeat(t, lt) {
    const thump = BEATS.reduce((a, b) => a + (t >= b ? Math.exp(-(t - b) * 9) : 0), 0);
    const gripK = easeOut(clamp((t - GRIP) / 0.12));
    const shiver = 1 - gripK;
    const [sx, sy] = shakes(t, BEATS, 18, 0.25);
    const [jx, jy] = jitter(t, 5 * shiver);
    const z = 1 + 0.06 * thump + 0.08 * easeOut(clamp((t - GRIP) / 0.5));
    cam(t, 540 + sx, 1100 + sy, z, 0, 0.6);
    // background: a dark red room that pulses with the heart
    const bg = mix('#1A0612', '#3E0A20', 0.4 + 0.6 * thump);
    ctx.fillStyle = rgrad(540, 1150, 100, 1300, [[0, mix(bg, '#7A1030', 0.5)], [1, '#07020A']]);
    ctx.fillRect(-500, -500, 2100, 2900);
    // after the grip, a lime sunburst behind it
    if (t >= GRIP) {
      ctx.save(); ctx.globalAlpha = 0.5 * gripK;
      sunburst(540, 1150, '#2A3A08', '#140A14', t * 0.3, 20, 1800);
      ctx.restore();
    }
    // rings going out on every beat
    for (const b of BEATS) {
      const age = t - b;
      if (age < 0 || age > 1) continue;
      const r = easeOut(age) * 1100;
      ctx.save(); ctx.globalAlpha = 1 - age; ctx.strokeStyle = t >= GRIP ? ANI.lime : '#FF5A7A'; ctx.lineWidth = 14 * (1 - age) + 2;
      ctx.beginPath(); ctx.arc(540, 1150, 120 + r, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // an ECG trace across the frame, spiking with each beat
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(t >= GRIP ? ANI.lime : '#FF6A8A', 0.55);
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = -300 + i * 14, tt = t - (1680 - x) / 1400;
      let v = 0;
      for (const b of BEATS) { const d = tt - b; if (d > 0 && d < 0.12) v += Math.sin(d / 0.12 * Math.PI * 2) * (d < 0.06 ? 1 : -0.5); }
      ctx.lineTo(x, 900 - v * 180);
    }
    ctx.stroke(); ctx.restore();
    // the hand
    fig(() => {
      ctx.save(); ctx.translate(560 + jx, 1300 + jy); ctx.rotate(0.28 + Math.sin(t * 33) * 0.01 * shiver); ctx.scale(0.92, 0.92);
      micHand(t, gripK, shiver);
      ctx.restore();
    }, { ink: 0, rim: t >= GRIP ? '#E8FFB0' : '#FF9AB0', light: [0.8, -1], rimW: 9, rimGlow: 0.7,
      glow: t >= GRIP ? [ANI.lime, 0.5 * gripK, 50] : undefined });
    if (t >= GRIP) {
      auraLines(t, 540, 1180, 0.8 * gripK, ANI.lime);
      sparkles(t, 14, 100, 800, 880, 900, '#F4FFD8');
    }
    camEnd();
    speedLinesV(t, 560, 1150, t >= GRIP ? clamp(1 - (t - GRIP) / 0.8) : 0, '#FFFFFF');
    fillScreen('#FF2A4A', 0.12 * thump * (t < GRIP ? 1 : 0.3));
    scrim(0.55);
    tagLine(t, T_HB + 0.05, T_WALK, '숨기지 않았다', { size: 104, y: 330 });
    subLine(t, T_HB + 0.5, T_WALK, '아픔을 솔직하게 이야기했다', { size: 56, y: 470 });
    impact(t, GRIP, 0.08);
    impact(t, T_HB, 0.05);
  }

  // ---- shot 4: back to the light ----------------------------------------------------------------
  function walk(t, lt) {
    const rise = T_WALK + 0.45, go = T_WALK + 0.9;
    const wk = seg(t, go, T_BUILD);
    const stepPh = Math.max(0, t - go) / (B * 2);                // one stride every two beats
    const bobY = Math.abs(Math.sin(stepPh * Math.PI)) * 10;
    const z = kf(lt, [[0, 1.15], [3.64, 1.0]], easeInOut);
    cam(t, 540, 1160 - bobY * 0.5, z, 0, 0.6);
    const open = 0.35 + 0.65 * easeInOut(seg(t, T_WALK, T_BUILD));
    // the corridor in perspective, converging on the door
    const dx = 540, dy = 1080, dw = 230, dh = 500;
    ctx.fillStyle = '#07060C'; ctx.fillRect(-500, -500, 2100, 2900);
    const light = '#FFF1C8';
    // walls, ceiling, floor as dark planes with a few edge lines
    poly([[-500, -500], [dx - dw / 2 - 60, dy - dh / 2 - 60], [dx - dw / 2 - 60, dy + dh / 2 + 20], [-500, 2400]], { fill: '#110E1C', stroke: null });
    poly([[1580, -500], [dx + dw / 2 + 60, dy - dh / 2 - 60], [dx + dw / 2 + 60, dy + dh / 2 + 20], [1580, 2400]], { fill: '#0D0B16', stroke: null });
    poly([[-500, 2400], [dx - dw / 2 - 60, dy + dh / 2 + 20], [dx + dw / 2 + 60, dy + dh / 2 + 20], [1580, 2400]], { fill: '#15111F', stroke: null });
    for (let i = 1; i < 7; i++) {
      const k = Math.pow(i / 7, 2);
      const lx = lerp(-500, dx - dw / 2 - 60, k), rx = lerp(1580, dx + dw / 2 + 60, k), fy = lerp(2400, dy + dh / 2 + 20, k), cy = lerp(-500, dy - dh / 2 - 60, k);
      stroke([[lx, cy], [lx, fy]], '#1E1A2C', 5, { ink: null });
      stroke([[rx, cy], [rx, fy]], '#1A1626', 5, { ink: null });
      stroke([[lx, fy], [rx, fy]], '#1E1A2C', 3, { ink: null });
    }
    // the door, opening: a slab of light
    rrect(dx - dw / 2 - 16, dy - dh / 2 - 16, dw + 32, dh + 16, 4, { fill: '#050409', stroke: null });
    const gap = dw * open;
    rrect(dx - gap / 2, dy - dh / 2, gap, dh, 2, { fill: '#FFFFFF', stroke: null });
    poly([[dx + gap / 2, dy - dh / 2], [dx + dw / 2 + 40, dy - dh / 2 - 30], [dx + dw / 2 + 40, dy + dh / 2 + 20], [dx + gap / 2, dy + dh / 2]], { fill: '#1A1426', stroke: ANI.ink, lw: 4 });
    glow(dx, dy, 700, light, 0.3 + 0.25 * open);
    glow(dx, dy, 260, '#FFFFFF', 0.9);
    // rays spilling toward us
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9 - 0.5, sw = Math.sin(t * 1.3 + i * 1.7) * 0.02;
      const x0 = dx + u * gap, a = u * 1.1 + sw;
      const x1 = dx + Math.sin(a) * 2600, y1 = dy + Math.cos(a) * 2600;
      ctx.fillStyle = lgrad(x0, dy, x1, y1, [[0, rgba(light, 0.24 * open)], [1, rgba(light, 0)]]);
      ctx.beginPath(); ctx.moveTo(x0 - 8, dy - dh / 2 + 40); ctx.lineTo(x0 + 8, dy - dh / 2 + 40); ctx.lineTo(x1 + 120 * (0.5 + hash(i, 1)), y1); ctx.lineTo(x1 - 120 * (0.5 + hash(i, 2)), y1); ctx.fill();
    }
    ctx.restore();
    // light pooled on the floor
    beam(dx - gap / 2, dx + gap / 2, dy + dh / 2, dx - gap * 3, dx + gap * 3, 2300, light, 0.22 * open, 0.05);
    // particles streaming past us from the door
    for (let i = 0; i < 40; i++) {
      const f = frac(hash(i, 1) + t * (0.25 + hash(i, 2) * 0.2)), a = hash(i, 3) * TAU;
      const r = Math.pow(f, 2) * 1600, px = dx + Math.cos(a) * r * 0.8, py = dy + Math.sin(a) * r;
      dot(px, py, 4 + f * 18, light, f * 0.8);
    }
    // her: getting up, then walking into it
    const sc = lerp(1.0, 0.66, easeIn(wk)), fy = lerp(1720, 1470, easeIn(wk));
    const pose = t < rise ? 'kneel' : t < go ? 'stand' : 'walk';
    const tw = t < go ? t : go + (t - go) * (TAU / (B * 4)) / 6;   // legs swing once per two beats
    const up = t < rise ? 0 : easeOut(clamp((t - rise) / 0.2));
    fig(() => heroine(540, fy - bobY + (1 - up) * 0, sc, { t: tw, view: 'back', pose, hair: HAIR, wind: 0.9, rim: light, rimK: 0.9 }),
      { box: hbox(540, fy, sc), ink: 6, tint: ['#140F1E', 0.55], rim: '#FFF6DA', light: [0, -1], rimW: 10, rimGlow: 0.9, glow: [light, 0.35, 40] });
    camEnd();
    if (t >= rise) speedLinesV(t, dx, 1080, clamp(1 - (t - rise) / 0.35) * 0.8, '#FFFFFF');
    scrim(0.6);
    tagLine(t, T_WALK + 0.1, T_BUILD, '그리고 다시,\n무대로', { size: 110, y: 320, colors: [ANI.white, ANI.lime] });
    white(0.25 * Math.exp(-(t - rise) * 10) * (t >= rise ? 1 : 0));
    fillScreen('#000000', 1 - clamp(lt / 0.12));
  }

  // ---- shot 5: the build, 8 ticking beats to the silence ---------------------------------------
  function build(t, lt) {
    if (t >= T_SIL) { fillScreen('#FFFFFF'); return; }
    const k = seg(t, T_BUILD, T_SIL);
    const n = Math.floor((t - T_BUILD) / B + 1e-6);                  // beats since the build began
    const sixteenth = Math.floor((t - T_BUILD) / (B / 4) + 1e-6);
    const bAge = t - (T_BUILD + n * B), sAge = t - (T_BUILD + sixteenth * B / 4);
    const [jx, jy] = jitter(t, 22 * k * k);
    const [sx, sy] = shakeXY(t, T_BUILD + n * B, 10 + 20 * k, 0.2);
    const z = lerp(1.0, 1.28, easeIn(k)) + 0.03 * Math.exp(-bAge * 10);
    cam(t, 540 + jx + sx, 1180 + jy + sy, z, Math.sin(t * 50) * 0.004 * k, 0.4);
    // the dark under the stage, lit from above by a crack of light
    ctx.fillStyle = rgrad(540, 1150, 50, 1400, [[0, mix('#1A2A08', '#3A5A10', k)], [1, '#050408']]);
    ctx.fillRect(-500, -500, 2100, 2900);
    beam(460, 620, -400, 200, 880, 1700, '#F4FFD8', 0.15 + 0.3 * k, 0.4);
    // the floor, cracking with lime
    ctx.fillStyle = lgrad(0, 1600, 0, 2300, [[0, '#0E0C14'], [1, '#050408']]);
    ctx.fillRect(-500, 1600, 2100, 800);
    for (let i = 0; i < 8; i++) {
      const len = 200 + 600 * k;
      const pts = crackPts(540, 1660, i < 4 ? Math.PI - 0.05 * i : 0.05 * (i - 4), len * (0.5 + hash(i, 3) * 0.5), 6, i + 40);
      stroke(pts.map(([x, y]) => [x, 1660 + (y - 1660) * 0.3]), ANI.lime, 4 + 4 * k, { ink: null, alpha: 0.3 + 0.7 * k });
    }
    // pebbles floating up (the power gathering)
    for (let i = 0; i < 24; i++) {
      const f = frac(hash(i, 1) + t * 0.4 * (0.5 + hash(i, 2)));
      const px = 100 + hash(i, 3) * 880, py = 1680 - f * 900 * (0.3 + k);
      const r = 6 + hash(i, 4) * 14;
      poly([[px - r, py], [px, py - r], [px + r, py + r * 0.3]], { fill: '#2A2A34', stroke: ANI.lime, lw: 2, alpha: clamp(k * 3) * (1 - f) });
    }
    // the clock ring around her: eight segments, one lights on each beat, the hand snaps round
    const R = 480, cx = 540, cy = 1180;
    ctx.save(); ctx.lineCap = 'butt';
    for (let i = 0; i < 8; i++) {
      const a0 = -Math.PI / 2 + i * TAU / 8 + 0.04, a1 = a0 + TAU / 8 - 0.08;
      const on = i <= n, fl = i === n ? Math.exp(-bAge * 8) : 0;
      ctx.strokeStyle = on ? mix(ANI.lime, '#FFFFFF', fl) : '#1E2A10'; ctx.lineWidth = on ? 26 + 16 * fl : 16;
      ctx.globalAlpha = on ? 0.9 : 0.6;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 32; i++) {                               // sixteenth ticks
      const a = -Math.PI / 2 + i * TAU / 32, on = i <= sixteenth;
      const r0 = R + 34, r1 = R + (i % 4 === 0 ? 90 : 62);
      ctx.strokeStyle = on ? (i === sixteenth ? '#FFFFFF' : rgba(ANI.lime, 0.8)) : 'rgba(80,100,40,0.4)'; ctx.lineWidth = i % 4 === 0 ? 10 : 6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
    const handA = -Math.PI / 2 + (n + backOut(clamp(bAge / 0.1))) * TAU / 8;
    glow(cx, cy, 700, ANI.lime, 0.2 + 0.4 * k);
    // the second hand (behind her): a tapered blade that snaps round a segment each beat
    const hx = Math.cos(handA), hy = Math.sin(handA);
    poly([[cx - hy * 14, cy + hx * 14], [cx + hx * (R - 20), cy + hy * (R - 20)], [cx + hy * 14, cy - hx * 14], [cx - hx * 60, cy - hy * 60]],
      { fill: '#FFFFFF', stroke: ANI.ink, lw: 6 });
    // her, braced, the aura rising
    auraLines(t, cx, 1250, 0.3 + 1.1 * k, ANI.lime);
    fig(() => heroine(540, 1690, 1.08, { t, view: 'back', pose: 'stand', hair: HAIR, wind: 0.3 + 0.8 * k, rim: '#F4FFD8', rimK: 0.9 }),
      { box: hbox(540, 1690, 1.08), ink: 7, tint: ['#0E1408', 0.3], rim: '#F4FFD8', light: [0.2, -1], rimW: 9 + 5 * k, rimGlow: 0.6 + 0.6 * k, glow: [ANI.lime, 0.3 + 0.5 * k, 40] });
    camEnd();
    speedLinesV(t, 540, 1150, clamp((t - 30.9) / 1.3) * 0.9, '#E8FFC0');
    // tick flashes: a small one each sixteenth, a bigger one on the beat
    white(0.07 * Math.exp(-sAge * 30) + 0.25 * Math.exp(-bAge * 14) * (0.4 + 0.6 * k));
    // the light closes in to white just before the silence
    white(easeIn(seg(t, T_SIL - 0.35, T_SIL)) * 0.9);
  }

  chapter('rise', T0, T_END, [[T0, stage], [T_RAIN, rain], [T_HB, heartbeat], [T_WALK, walk], [T_BUILD, build]]);
})();
