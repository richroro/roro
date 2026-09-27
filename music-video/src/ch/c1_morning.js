// src/ch/c1_morning.js — chapter 1 · 아침 (0 – 29.09)
// Dawn town → alarm → title → getting-ready montage → waking up → toast run → gate slide → dozing.
(() => {
  const S = {
    alarm: bt(3, 2), title: bt(4), montage: bt(6), wake: bt(8), run: bt(10), gate: bt(12), doze: bt(14), end: 29.09,
  };

  // ---- private helpers ---------------------------------------------------------------------------

  /** Decay after a hit at t0: 1 at the hit, falling to 0. */
  const hitK = (t, t0, len = 0.35) => (t < t0 ? 0 : Math.exp(-(t - t0) / len * 3));
  /** A camera that never sits still. */
  function camDrift(t, cx, cy, z = 1, rot = 0, amp = 1) {
    camBegin(cx + Math.sin(t * 0.7) * 10 * amp, cy + Math.cos(t * 0.53) * 7 * amp, z, rot + Math.sin(t * 0.41) * 0.006 * amp);
  }
  /** Slam-in scale for lettering landing at t0: huge → 1 with a squash wobble. */
  function slamS(t, t0) {
    if (t < t0 - 0.12) return 0;
    if (t < t0) return lerp(2.8, 1, easeIn(seg(t, t0 - 0.12, t0)));
    const a = t - t0;
    return 1 + Math.sin(a * 38) * 0.14 * Math.exp(-a * 9);
  }

  // A night apartment block with mostly dark windows.
  function nightBlock(x, y, w, h, tone, seed, lit) {
    rrect(x, y - h, w, h + 40, 6, { fill: tone, stroke: null });
    rrect(x - 8, y - h - 14, w + 16, 20, 5, { fill: mix(tone, '#000000', 0.25), stroke: null });
    const cols = Math.max(2, Math.floor(w / 42)), rows = Math.floor((h - 30) / 48);
    const cw = (w - 20) / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = hash(seed * 13 + r, c + seed) < lit;
      rrect(x + 14 + c * cw, y - h + 22 + r * 48, cw - 10, 26, 3, { fill: on ? '#FFD98A' : mix(tone, '#10142C', 0.35), stroke: null });
    }
  }

  // A little cat, sitting (jump 0) or leaping with its fur up.
  function cat(x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s); ctx.rotate(o.rot || 0);
    const col = '#F2A65A', scared = o.scared || 0;
    // tail
    stroke([[40, -20], [90, -40], [100, -100 - scared * 30]], col, 16, { smooth: true, olw: 9 });
    if (scared > 0.3) {
      // bristling fur spikes
      const pts = [];
      for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI, r = i % 2 ? 58 : 76; pts.push([Math.cos(a) * r * 1.1, -40 + Math.sin(a) * r * 0.8]); }
      pts.push([66, -20], [-66, -20]);
      poly(pts, { fill: col, lw: 5 });
    } else ell(0, -40, 62, 44, { fill: col, lw: 5 });
    ell(-30, -4, 16, 10, { fill: col, lw: 4 }); ell(24, -4, 16, 10, { fill: col, lw: 4 });
    // head
    const hx = -50, hy = -92 - scared * 10;
    poly([[hx - 38, hy - 12], [hx - 30, hy - 58], [hx - 6, hy - 26]], { fill: col, lw: 5 });
    poly([[hx + 38, hy - 12], [hx + 30, hy - 58], [hx + 6, hy - 26]], { fill: col, lw: 5 });
    circle(hx, hy, 42, { fill: col, lw: 5 });
    stroke([[hx - 20, hy - 38], [hx - 8, hy - 30]], '#C9793A', 5, { ink: null });
    stroke([[hx + 4, hy - 40], [hx + 6, hy - 28]], '#C9793A', 5, { ink: null });
    if (scared > 0.3) {
      circle(hx - 16, hy - 2, 11, { fill: '#FFFFFF', lw: 3.5 }); circle(hx + 16, hy - 2, 11, { fill: '#FFFFFF', lw: 3.5 });
      circle(hx - 16, hy - 2, 4, { fill: PAL.ink, stroke: null }); circle(hx + 16, hy - 2, 4, { fill: PAL.ink, stroke: null });
      ell(hx, hy + 20, 7, 9, { fill: '#7A2E3A', lw: 3 });
    } else {
      stroke([[hx - 24, hy], [hx - 16, hy - 5], [hx - 8, hy]], PAL.ink, 4, { ink: null, smooth: true });
      stroke([[hx + 8, hy], [hx + 16, hy - 5], [hx + 24, hy]], PAL.ink, 4, { ink: null, smooth: true });
      stroke([[hx - 8, hy + 14], [hx, hy + 18], [hx + 8, hy + 14]], PAL.ink, 3.5, { ink: null, smooth: true });
    }
    for (const sd of [-1, 1]) stroke([[hx + sd * 30, hy + 10], [hx + sd * 60, hy + 4]], PAL.ink, 2.5, { ink: null });
    ctx.restore();
  }

  // A front-on running pose (legs mostly hidden or small): arms pump, body bobs on eighths.
  function frontRun(t, seed = 0) {
    const ph = (beatOf(t) + seed * 0.37) * Math.PI * 2;
    const s = Math.sin(ph);
    return {
      aL: 0.55 + s * 0.45, aR: 0.55 - s * 0.45, eL: 1.5, eR: 1.5,
      lL: 0.12 + Math.max(0, s) * 0.25, lR: 0.12 + Math.max(0, -s) * 0.25,
      kL: Math.max(0, s) * 1.1, kR: Math.max(0, -s) * 1.1,
      dy: Math.abs(Math.sin(ph)) * 22, rot: s * 0.04,
    };
  }

  // A soft dust puff that grows and fades over `life` seconds.
  function puff(x, y, r, age, life = 0.5, color = '#FFFFFF', seed = 0) {
    if (age < 0 || age > life) return;
    const k = age / life;
    smooth(blobPts(x, y - k * r * 0.6, r * (0.5 + k * 0.9), 8, 0.2, seed), { fill: color, stroke: null, alpha: 0.85 * (1 - k) });
  }

  // ---- 0.00 dawn town: push into one window -----------------------------------------------------

  const CLK = [1054, 602];                    // the tiny bedside clock inside the target window
  const CLK_NEXT = [820, 480];                // where that clock sits in the alarm shot
  const WIN = [1028, 578, 54, 42];            // target window x, y, w, h

  function dawn(t, lt) {
    const z1 = Math.pow(3.2, easeInOut(seg(t, 0.2, 5.6)));
    const z = z1 * Math.pow(32 / 3.2, easeIn(seg(t, 5.55, S.alarm)));
    const A = [CLK_NEXT[0] - W / 2, CLK_NEXT[1] - H / 2].map(v => -v);     // C0 - T
    const layer = (p, fn) => {
      const zl = Math.pow(z, p);
      camBegin(CLK[0] + A[0] / zl, CLK[1] + A[1] / zl, zl);
      fn(); camEnd();
    };
    // sky
    const dawnK = seg(t, 0, 6.3);
    skyFill([[0, PAL.nightDk], [0.5, mix(PAL.night, '#3A3A78', dawnK * 0.5)], [0.8, mix('#3E3C7A', '#7A5A9A', dawnK)], [1, mix('#5A4A8A', '#E89A8A', dawnK)]]);
    layer(0.12, () => {
      stars(t, 70, 21, 1 - dawnK * 0.4, 700);
      moon(420, 210, 58);
      for (let i = 0; i < 3; i++) cloud(300 + i * 700 + t * 12, 300 + i * 40, 0.55, rgba('#8A86C8', 0.35), { shade: false });
    });
    layer(0.45, () => {
      for (let i = 0; i < 13; i++) {
        const bw = 150 + hash(i, 3) * 120, bh = 250 + hash(i, 4) * 220;
        nightBlock(-200 + i * 200 + hash(i, 5) * 40, 880, bw, bh, '#2A3160', i + 40, 0.05);
      }
    });
    layer(1, () => {
      // neighbours
      const blocks = [[260, 360, 520], [560, 200, 620], [1260, 250, 560], [1560, 330, 480], [1930, 280, 600]];
      blocks.forEach(([x, w, h], i) => nightBlock(x, 1000, w, h, '#3A4174', i + 7, 0.07));
      // the hero block
      const hx = 790, hw = 380, top = 270;
      rrect(hx, top, hw, 800, 8, { fill: '#4A5288', lw: 6, stroke: '#1B1F3C' });
      rrect(hx - 10, top - 16, hw + 20, 24, 6, { fill: '#343B6A', lw: 5, stroke: '#1B1F3C' });
      rrect(hx + 260, top - 70, 70, 56, 6, { fill: '#5A6298', lw: 4, stroke: '#1B1F3C' });
      letter('103', hx + 80, top + 18, 26, '#C9CEF0', { lw: 0, shadow: null });
      for (let r = 0; r < 10; r++) for (let c = 0; c < 5; c++) {
        const wx = hx + 22 + c * 72, wy = top + 36 + r * 68;
        if (Math.abs(wx - WIN[0]) < 2 && Math.abs(wy - WIN[1]) < 2) continue;
        const on = [[1, 1], [2, 3], [7, 0], [8, 4]].some(([rr, cc]) => rr === r && cc === c);
        rrect(wx, wy, 54, 42, 4, { fill: on ? '#FFD98A' : '#2B3160', stroke: null });
        if (on) glow(wx + 27, wy + 21, 70, '#FFD45C', 0.2);
      }
      // the one window we are heading into: a sleeping room lit by a red clock
      const [wx, wy, ww, wh] = WIN;
      rrect(wx - 3, wy - 3, ww + 6, wh + 6, 4, { fill: '#1B1F3C', stroke: null });
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
      ctx.fillStyle = '#3F3A70'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = '#6A4E4A'; ctx.fillRect(wx + 14, wy + 30, 26, 12);          // nightstand
      digitalClock(CLK[0], CLK[1], 0.047, '06:59', { blink: frac(beatOf(t)) < 0.5 ? 1 : 0.2 });
      ctx.fillStyle = '#FFE08A'; ctx.fillRect(wx + 42, wy + 30, 20, 16);          // blanket corner
      ctx.restore();
      glow(CLK[0], CLK[1], 34 + pulse(t, 5) * 10, '#FF5A5A', 0.45 + pulse(t, 5) * 0.3);
      // curtains
      rrect(wx - 1, wy - 1, 9, wh + 2, 2, { fill: '#8C6FB8', stroke: null });
      rrect(wx + ww - 8, wy - 1, 9, wh + 2, 2, { fill: '#8C6FB8', stroke: null });
      // tick-tock on every beat, once we are close enough to hear it
      if (t > 2.6 && t < 5.9) {
        const b = beatN(t), age = t - b * SONG.beat;
        const side = b % 2 ? 1 : -1;
        sfx(b % 2 ? '딱' : '똑', WIN[0] + WIN[2] / 2 + side * 62, WIN[1] - 10, 30, '#FFFFFF', age, { life: 0.42, rot: side * 0.2 });
      }
      // ground, trees and street lamps
      rrect(-400, 1000, 3000, 200, 0, { fill: '#232A52', stroke: null });
      for (let i = 0; i < 6; i++) {
        const x = 120 + i * 380;
        if (x > 700 && x < 1240) continue;
        smooth(blobPts(x, 950, 70, 9, 0.15, i + 3), { fill: '#243A4A', stroke: '#141A30', lw: 4 });
      }
      streetlight(700, 1040, 0.8, 1);
      streetlight(1300, 1040, 0.8, 1);
    });
    flash(1 - ease(seg(t, 0, 0.9)), PAL.ink);
  }

  // ---- 6.36 alarm: 06:59 → 07:00 ----------------------------------------------------------------

  const WALL = '#3F3A70';

  function room(t, glowK) {
    fillScreen(lgrad(0, 0, 0, H, [[0, mix(WALL, '#000000', 0.2)], [1, WALL]]));
    // window with the dawn in it
    rrect(1330, 90, 420, 330, 10, { fill: lgrad(0, 90, 0, 420, [[0, '#6A6AB0'], [1, '#F2A68A']]), lw: 7 });
    stroke([[1540, 90], [1540, 420]], '#EDE3FF', 8, { olw: 6 });
    rrect(1300, 70, 90, 380, 16, { fill: '#8C6FB8', lw: 5 });
    rrect(1690, 70, 90, 380, 16, { fill: '#8C6FB8', lw: 5 });
    // a poster
    rrect(260, 150, 210, 280, 6, { fill: '#F2E6D0', lw: 5 });
    poly(starShape(365, 260, 60), { fill: PAL.gold, lw: 4 });
    letter('♪', 365, 370, 60, PAL.pink, { lw: 5, shadow: null });
    // floor
    rrect(-20, 880, W + 40, 220, 0, { fill: '#5A4668', stroke: null });
    if (glowK > 0) fillScreen('#FF3A4A', 0.12 * glowK);
  }
  function bed(t, lumpSq, lumpDy, hairT) {
    // bed frame + pillow + a blanket lump with a tuft of hair at the pillow end
    rrect(1060, 520, 60, 420, 14, { fill: PAL.woodDk, lw: 6 });
    rrect(1060, 760, 900, 170, 14, { fill: PAL.wood, lw: 6 });
    ell(1250, 700, 150, 70, { fill: '#FFFFFF', lw: 6 });
    // hair tuft
    ctx.save(); ctx.translate(1200, 660 - lumpDy * 0.4);
    smooth([[-70, 20], [-60, -30], [0, -60], [60, -40], [80, 10], [30, 30], [-20, 34]], { fill: PAL.hair, lw: 5 });
    ctx.rotate(Math.sin(hairT * 9) * 0.3);
    stroke([[0, -58], [10, -95], [40, -110]], PAL.hair, 10, { smooth: true, olw: 9 });
    ctx.restore();
    ctx.save(); ctx.translate(1560, 820 - lumpDy); ctx.scale(1 + lumpSq * 0.5, 1 - lumpSq);
    smooth([[-340, 30], [-330, -80], [-250, -150], [-80, -170], [120, -150], [300, -120], [400, -40], [400, 40], [0, 50]], { fill: '#FFE08A', lw: 7 });
    for (let i = 0; i < 9; i++) circle(-260 + (i % 5) * 150 + (i > 4 ? 70 : 0), -110 + Math.floor(i / 5) * 90, 18, { fill: '#FFB47A', stroke: null });
    ctx.restore();
  }

  function alarm(t, lt, dur) {
    const flip = S.alarm + 0.14;
    const on = t >= flip;
    const z = lerp(1.0, 1.1, easeOut(lt / dur));
    const [sx, sy] = shakeXY(t, flip, 14, 0.8);
    camBegin(W / 2 + 40 + sx, H / 2 + sy, z);
    room(t, on ? pulse2(t, 5) : 0);
    // nightstand
    rrect(600, 610, 440, 360, 12, { fill: '#6A4E4A', lw: 6 });
    rrect(630, 700, 380, 110, 8, { fill: '#7E5E58', lw: 5 });
    circle(820, 755, 12, { fill: PAL.gold, lw: 4 });
    // lump twitches on the next beat
    const tw = hitK(t, bt(3, 3), 0.25);
    bed(t, -tw * 0.15, tw * 30, t);
    // the clock
    const jig = on ? Math.sin(t * 90) * 0.07 : 0, hopY = on ? -Math.abs(Math.sin(t * 45)) * 22 : 0;
    const pop = on ? 1 + 0.18 * hitK(t, flip, 0.2) : 1;
    ctx.save(); ctx.translate(CLK_NEXT[0], CLK_NEXT[1] + hopY); ctx.scale(pop, pop);
    digitalClock(0, 0, 1.5, on ? '07:00' : '06:59', { rot: jig, blink: on ? (frac(t * 6) < 0.5 ? 1 : 0.2) : 1 });
    ctx.restore();
    if (on) {
      for (let i = 0; i < 3; i++) {
        const a = -0.5 + i * 0.5;
        const k = frac(t * 3 + i * 0.33);
        stroke([[CLK_NEXT[0] - 290 - k * 40, CLK_NEXT[1] - 60 + a * 120], [CLK_NEXT[0] - 330 - k * 60, CLK_NEXT[1] - 70 + a * 160]], '#FFFFFF', 8, { ink: null, alpha: 1 - k });
        stroke([[CLK_NEXT[0] + 290 + k * 40, CLK_NEXT[1] - 60 + a * 120], [CLK_NEXT[0] + 330 + k * 60, CLK_NEXT[1] - 70 + a * 160]], '#FFFFFF', 8, { ink: null, alpha: 1 - k });
      }
      sfx('삐비빅!', 830, 185, 150, '#FF6B6B', t - flip - 0.02, { life: 1.2, rot: -0.08 });
    }
    camEnd();
  }

  // ---- 7.27 title -------------------------------------------------------------------------------

  function title(t, lt, dur) {
    const hit1 = S.title + SONG.beat, hit2 = S.title + SONG.beat * 2;
    const [s1x, s1y] = shakeXY(t, hit1, 26, 0.4), [s2x, s2y] = shakeXY(t, hit2, 30, 0.45);
    const z = lerp(1.1, 1.0, easeOut(seg(t, S.title, S.montage)));
    const sunY = kf(t, [[S.title, 1150], [S.title + 0.7, 470]], easeOut);
    skyFill([[0, '#FFB86B'], [0.55, '#FFD68A'], [1, '#FFF1C4']]);
    camBegin(W / 2 + s1x + s2x, H / 2 + s1y + s2y, z, Math.sin(t * 0.8) * 0.01);
    const rot = t * 0.12;
    sunburst(960, sunY, rgba('#FFFFFF', 0.28), rgba('#FFC23D', 0.18), rot, 22, 2000, clamp(lt * 3));
    glow(960, sunY, 700, '#FFF3B0', 0.7);
    circle(960, sunY, 210 + pulse(t, 4) * 10, { fill: PAL.sun, lw: 8, stroke: '#F2A13A' });
    circle(900, sunY - 60, 90, { fill: rgba('#FFFFFF', 0.3), stroke: null });
    // clouds drifting out of the way
    cloud(260 - lt * 40, 700, 0.9, '#FFFFFF'); cloud(1680 + lt * 40, 640, 1.0, '#FFFFFF');
    cloud(1500 + lt * 30, 250, 0.6, '#FFFFFF');
    // rooftops along the bottom
    for (let i = 0; i < 9; i++) {
      const x = -100 + i * 250, h = 120 + hash(i, 8) * 140;
      rrect(x, 1080 - h, 220, h + 20, 8, { fill: mix('#F2A67A', '#FFFFFF', 0.25 + hash(i, 9) * 0.2), stroke: null });
    }
    confetti(t, hit2, { n: 70, burst: true });
    // the friends pop up, the one who just woke first
    const kidAt = (who, x, t0, seed, s) => {
      if (t < t0 - 0.02) return;
      const k = seg(t, t0 - 0.02, t0 + 0.4);
      const y = 1100 + (1 - backOut(k)) * 520;
      const d = t > t0 + 0.4 ? dance('jump', t, seed) : { aL: 2.6, aR: 2.6, eL: 0.1, eR: 0.1 };
      kid(x, y, s, { who, t, ...d, eyes: who === 'me' ? 'star' : 'happy', mouth: 'grin', blush: true, sq: d.sq ?? -0.12 * (1 - k) });
    };
    kidAt('pony', 470, S.title + SONG.beat * 4, 1, 0.95);
    kidAt('glasses', 1450, S.title + SONG.beat * 5, 2, 0.95);
    kidAt('me', 960, S.title, 0, 1.08);
    // the duvet thrown into the sky
    const bk = seg(t, S.title, S.title + 0.9);
    if (bk < 1) {
      ctx.save(); ctx.translate(960 + bk * 380, lerp(900, -500, easeOut(bk))); ctx.rotate(bk * 2.4);
      const fl = Math.sin(t * 30) * 0.15;
      ctx.scale(1.4 - bk * 0.4, (1 + fl) * (1.4 - bk * 0.4));
      smooth([[-260, 40], [-250, -80], [-100, -140], [120, -130], [260, -60], [270, 60], [0, 90]], { fill: '#FFE08A', lw: 7 });
      for (let i = 0; i < 6; i++) circle(-170 + (i % 3) * 150, -60 + Math.floor(i / 3) * 90, 18, { fill: '#FFB47A', stroke: null });
      ctx.restore();
    }
    // 고딩 · 라이프
    const bump = 1 + 0.035 * pulse(t, 6);
    const sA = slamS(t, hit1) * bump, sB = slamS(t, hit2) * bump;
    if (sA > 0) {
      ctx.save(); ctx.translate(530, 320); ctx.scale(sA, sA); ctx.rotate(-0.06);
      letter('고딩', 0, 0, 270, '#FF6F91', { lw: 30 });
      ctx.restore();
    }
    if (sB > 0) {
      ctx.save(); ctx.translate(1275, 340); ctx.scale(sB, sB); ctx.rotate(0.04);
      letter('라이프', 0, 0, 270, '#5AA0FF', { lw: 30 });
      ctx.restore();
    }
    // a ribbon under the title
    const rib = seg(t, hit2 + SONG.beat, hit2 + SONG.beat + 0.3);
    if (rib > 0) {
      ctx.save(); ctx.translate(930, 520); ctx.scale(backOut(rib), backOut(rib)); ctx.rotate(-0.02);
      poly([[-380, -44], [380, -44], [350, 0], [380, 44], [-380, 44], [-350, 0]], { fill: '#FF6F91', lw: 7 });
      letter('HIGH SCHOOL LIFE', 0, 4, 58, '#FFFFFF', { font: 'round', lw: 9 });
      ctx.restore();
    }
    if (t > hit2 + 0.2) {
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + t * 0.6, r = 560 + Math.sin(t * 3 + i) * 30;
        const k = pulse(t + i * 0.07, 4);
        sparkle(930 + Math.cos(a) * r, 340 + Math.sin(a) * r * 0.35, 22 + k * 20, '#FFFFFF', t);
      }
    }
    camEnd();
    flash(1 - ease(seg(t, S.title, S.title + 0.3)), '#FFFFFF');
    speedLines(t, 960, 340, hitK(t, hit1, 0.5) + hitK(t, hit2, 0.5), '#FFFFFF');
  }

  // ---- 10.91 getting ready: three panels --------------------------------------------------------

  function panel(cx, cy, w, h, rot, sc, bg, draw) {
    if (sc <= 0.01) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
    rrect(-w / 2 + 16, -h / 2 + 20, w, h, 28, { fill: 'rgba(40,20,60,0.28)', stroke: null });
    rrect(-w / 2, -h / 2, w, h, 28, { fill: bg, stroke: null });
    ctx.save(); rrectPath(-w / 2, -h / 2, w, h, 28); ctx.clip(); draw(); ctx.restore();
    rrect(-w / 2, -h / 2, w, h, 28, { lw: 9 });
    ctx.restore();
  }
  function tag(txt, x, y, color) {
    rrect(x - 110, y - 42, 220, 84, 42, { fill: '#FFFFFF', lw: 6 });
    letter(txt, x, y + 3, 56, color, { font: 'round', lw: 0, shadow: null });
  }

  function montage(t, lt, dur) {
    const b = SONG.beat, t0 = S.montage;
    const drop = t0 + b * 7;                                   // panels fall away on the last beat
    fillScreen('#FFE9A8');
    // moving diagonal stripes
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#FFD06A';
    for (let i = -6; i < 20; i++) {
      const x = i * 160 + frac(t * 0.8) * 160;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 80, 0); ctx.lineTo(x - 300, H); ctx.lineTo(x - 380, H); ctx.fill();
    }
    ctx.restore();
    camDrift(t, W / 2, H / 2, 1.02, 0, 1.2);
    const pw = 560, ph = 800, dk = easeIn(seg(t, drop, drop + 0.42));
    const pops = [t0, t0 + b * 2, t0 + b * 4];
    const cfg = [
      [355, -0.045, '#BFEFE4', wash, '세수', PAL.teal],
      [960, 0.03, '#FFD1DE', tie, '넥타이', PAL.red],
      [1565, -0.025, '#CBE7FF', bagOn, '가방', PAL.blue],
    ];
    cfg.forEach(([cx, rot, bg, fn, label, lc], i) => {
      const age = t - pops[i];
      if (age < 0) return;
      const sc = backOut(clamp(age / 0.3));
      const fall = dk * (1400 + i * 120);
      panel(cx, 470 + fall, pw, ph, rot + (1 - clamp(age / 0.3)) * 0.4 + dk * (i - 1) * 0.6, sc, bg, () => {
        fn(t, age, i);
        tag(label, 0, 330, lc);
      });
    });
    // everyone ready: stars on the last full beat
    if (t > t0 + b * 6 && t < drop + 0.2) {
      for (let i = 0; i < 3; i++) sparkle(355 + i * 605 + 200, 150, 30 + pulse(t, 5) * 20, '#FFFFFF', t * 2);
    }
    camEnd();
    // it was only a dream: the room goes dark again
    flash(ease(seg(t, drop + 0.15, S.wake)), '#2A2448');
  }
  // panel contents are drawn with (0, 0) at the panel centre
  function wash(t, age) {
    // mirror + tiles
    for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) rrect(-300 + c * 100 + (r % 2) * 50, -420 + r * 100, 96, 96, 8, { fill: '#D8F6EE', stroke: null });
    rrect(-170, -380, 340, 250, 20, { fill: '#E9FBFF', lw: 6 });
    const scrub = Math.sin(t * 22) * 0.12;
    kid(0, 400, 1.25, { who: 'me', t, aL: 2.3 + scrub, aR: 2.3 - scrub, eL: 1.45, eR: 1.45, eyes: 'closed', mouth: 'o', headDy: 10 + pulse(t, 6) * 8, blush: true });
    // foam
    for (let i = 0; i < 6; i++) circle(-60 + i * 24, -180 - Math.sin(i * 2 + t * 6) * 10, 14 + (i % 3) * 5, { fill: '#FFFFFF', lw: 3 });
    // splashes on every beat
    const b = beatN(t), a = t - b * SONG.beat;
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (i - 3.5) * 0.35, v = 420 + hash(i, b) * 200;
      const x = Math.cos(ang) * v * a, y = -150 + Math.sin(ang) * v * a + 900 * a * a;
      smooth([[x, y - 16], [x + 10, y + 4], [x, y + 12], [x - 10, y + 4]], { fill: '#8FD3FF', lw: 3, alpha: 1 - a * 2 });
    }
    // sink
    rrect(-230, 180, 460, 110, 30, { fill: '#FFFFFF', lw: 7 });
    rrect(-150, 290, 300, 200, 10, { fill: '#E9EEF5', lw: 6 });
    stroke([[150, 190], [150, 150], [110, 150]], '#C9D3E0', 16, { olw: 9 });
  }
  function tie(t, age) {
    rrect(-300, 120, 600, 400, 0, { fill: '#FFBCCD', stroke: null });
    const b = beatOf(t), yank = Math.exp(-frac(b) * 6);
    kid(0, 400, 1.25, {
      who: 'me', t, aR: 2.3 + yank * 0.5, eR: 0.3, aL: 0.9, eL: 1.6, eyes: yank > 0.5 ? 'x' : 'determined', mouth: yank > 0.5 ? 'wavy' : 'flat',
      headDy: -yank * 12, sq: yank * 0.05,
      holdR: (x, y) => {
        stroke([[0, -170], [x * 0.5, lerp(-170, y, 0.5) - 20], [x, y]], PAL.tie, 22, { smooth: true, olw: 9 });
        circle(0, -176, 14, { fill: PAL.tie, lw: 4 });
        circle(x, y, 15, { fill: PAL.skin, lw: 4.5 });
      },
    });
    sfx('쭉!', 170, -250, 90, '#FFFFFF', t - beatN(t) * SONG.beat, { life: 0.4, rot: 0.2 });
  }
  function bagOn(t, age) {
    rrect(-300, 250, 600, 300, 0, { fill: '#A8D6FF', stroke: null });
    const on = age > SONG.beat;
    if (!on) {
      // swinging the bag over the head
      const k = age / SONG.beat, a = lerp(0.6, 3.3, easeIn(k));
      kid(0, 400, 1.25, {
        who: 'me', t, aR: a, eR: 0.1, eyes: 'determined', mouth: 'grin',
        holdR: (x, y) => rrect(x - 60, y - 40, 120, 100, 26, { fill: WHO.me.bag, lw: 5 }),
      });
      stroke([[120, -40], [150, -300], [0, -450]], '#FFFFFF', 10, { ink: null, alpha: 0.7, smooth: true });
    } else {
      const d = dance('jump', t, 0);
      const land = hitK(t, t - age + SONG.beat, 0.2);
      kid(0, 400, 1.25, { who: 'me', t, bag: true, ...d, sq: land * 0.2, eyes: 'happy', mouth: 'grin', emote: 'sparkle', emoteK: 1, blush: true });
    }
  }

  // ---- 14.55 waking up (seen from above) --------------------------------------------------------

  function bombHair(x, y, r, t) {
    const pts = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU, rr = r * (i % 2 ? 0.82 : 1.08 + hash(i, 4) * 0.22) * (1 + Math.sin(t * 5 + i) * 0.02);
      pts.push([x + Math.cos(a) * rr * 1.15, y + Math.sin(a) * rr]);
    }
    smooth(pts, { fill: PAL.hair, lw: 7 });
  }

  function wake(t, lt, dur) {
    const b = SONG.beat, t0 = S.wake;
    const slap = t0 + b * 3;                         // 15.91
    const lift = slap - b * 0.9;
    const [sx, sy] = shakeXY(t, slap, 22, 0.4);
    const z = lerp(1.0, 1.14, easeInOut(lt / dur)) + hitK(t, t0 + b * 6, 0.3) * 0.06;
    fillScreen('#8FB8E8');
    camBegin(W / 2 + sx + lt * 8, H / 2 + sy - 50 - lt * 6, z, -0.03);
    // sheet + pillow
    rrect(260, -100, 1400, 1400, 40, { fill: '#DCEBFF', lw: 7 });
    for (let i = 0; i < 8; i++) stroke([[300 + i * 180, -100], [300 + i * 180, 1300]], '#C8DDF8', 14, { ink: null });
    rrect(520, 150, 760, 420, 90, { fill: '#FFFFFF', lw: 7 });
    // morning light across the bed
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#FFF3B0';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(900 + i * 260, -100); ctx.lineTo(1040 + i * 260, -100); ctx.lineTo(700 + i * 260, 1200); ctx.lineTo(560 + i * 260, 1200); ctx.fill(); }
    ctx.restore();
    // the face
    const m = mood(t, [[t0, 'closed', 'wavy', 'zzz'], [t0 + b * 4, 'wink', 'flat'], [t0 + b * 5, 'sleepy', 'o'], [t0 + b * 6, 'wide', 'o', '!'], [t0 + b * 7, 'wide', 'open', 'sweat']]);
    const kx = 900, ky = 1126, ks = 2.4;
    const up = t > t0 + b * 6 ? -20 : 0;
    bombHair(kx, ky - 330 * ks + up * ks, 330, t);
    kid(kx, ky, ks, {
      who: 'me', t, ...m, sq: m.sq, headDy: up + Math.sin(t * 2) * 3, lookX: t > t0 + b * 5 ? 0.8 : 0, lookY: t > t0 + b * 5 ? -0.6 : 0,
      emote: m.emote === 'zzz' && t > t0 + b * 4 ? null : m.emote, blush: 0.5, aL: 0.1, aR: 0.1, cowlick: Math.sin(t * 14) * 0.4,
    });
    // duvet up to the chin
    smooth([[160, 760], [400, 720], [700, 745], [1000, 720], [1300, 740], [1700, 710], [1800, 1300], [100, 1300]], { fill: '#FFE08A', lw: 8 });
    for (let i = 0; i < 10; i++) circle(300 + (i % 5) * 300 + (i > 4 ? 150 : 0), 850 + Math.floor(i / 5) * 150, 30, { fill: '#FFB47A', stroke: null });
    // the clock on the nightstand, top right
    const hitC = hitK(t, slap, 0.25);
    const ringing = t < slap;
    rrect(1420, -40, 420, 460, 30, { fill: '#8A6A58', lw: 7 });
    ctx.save(); ctx.translate(1600, 250); ctx.scale(1 + hitC * 0.25, 1 - hitC * 0.35);
    digitalClock(0, ringing ? -Math.abs(Math.sin(t * 40)) * 16 : 0, 0.85, '07:00', { rot: ringing ? Math.sin(t * 80) * 0.08 : 0, glow: ringing ? 1 : 0.3, blink: ringing ? (frac(t * 6) < 0.5 ? 1 : 0.2) : 1 });
    ctx.restore();
    if (ringing) for (let i = 0; i < 3; i++) {
      const k = frac(t * 3 + i / 3);
      stroke([[1440 - k * 60, 150 + i * 60], [1400 - k * 90, 140 + i * 70]], '#FFFFFF', 9, { ink: null, alpha: 1 - k });
    }
    // the rubber arm: out from under the duvet, up, and SLAP
    const sh = [kx + 56 * ks, ky - 184 * ks + 60];
    const armK = kf(t, [[lift, 0], [slap - 0.12, 1], [slap, 1.25], [slap + 0.9, 1.25], [slap + 1.4, 0]], easeInOut);
    if (armK > 0.02) {
      const tgt = [1600, 230];
      const hand = t < slap - 0.12
        ? [lerp(sh[0] + 60, 1540, armK), lerp(sh[1] + 40, -60, armK)]
        : t < slap ? [lerp(1540, tgt[0], seg(t, slap - 0.12, slap)), lerp(-60, tgt[1], easeIn(seg(t, slap - 0.12, slap)))]
          : t < slap + 0.9 ? tgt : [lerp(tgt[0], sh[0] + 60, seg(t, slap + 0.9, slap + 1.4)), lerp(tgt[1], sh[1] + 40, seg(t, slap + 0.9, slap + 1.4))];
      const mid = [lerp(sh[0], hand[0], 0.5) + 60, lerp(sh[1], hand[1], 0.5) + 80];
      stroke([sh, mid, hand], PAL.navy, 62, { smooth: true, olw: 12 });
      circle(hand[0], hand[1], 40, { fill: PAL.skin, lw: 6 });
      // the duvet edge over the shoulder
      smooth([[sh[0] - 90, sh[1] + 20], [sh[0] + 60, sh[1] - 20], [sh[0] + 140, sh[1] + 40], [sh[0] + 40, sh[1] + 90]], { fill: '#FFE08A', lw: 7 });
    }
    sfx('탁!', 1300, 120, 130, '#FFFFFF', t - slap, { life: 0.7, rot: -0.15 });
    camEnd();
    flash(1 - ease(seg(t, t0, t0 + 0.35)), '#2A2448');
    // late! whip to the street
    const whip = seg(t, t0 + b * 7.3, S.run);
    streaks(t, whip * 1.5, '#FFFFFF', 7);
  }

  // ---- 18.18 the toast run ----------------------------------------------------------------------

  function run(t, lt, dur) {
    const V = 950;                                            // ground speed, px/s
    const catJump = S.run + SONG.beat * 5;                    // 20.45
    const tilt = Math.sin(beatOf(t) * Math.PI) * 0.006;
    skyFill([[0, '#7EC6FF'], [0.55, '#BFE3FF'], [0.8, '#FFE2B8'], [1, '#FFD39A']]);
    sun(1600, 180, 70, PAL.sun, t);
    cloudLayer(t, 200, 0.6, -40, 5);
    camBegin(W / 2 + Math.sin(t * 1.3) * 12, H / 2 - hop(t) * 6, 1.04, tilt);
    townRow(t, 770, t * 140, { tone: '#C8D4F4', far: true, seed: 3 });
    townRow(t, 880, t * 420, { tone: '#F2C9A0', seed: 8 });
    // a low wall along the pavement
    rrect(-40, 810, W + 80, 90, 0, { fill: '#E8B48A', lw: 6 });
    for (let i = 0; i < 16; i++) {
      const x = ((i * 150 - t * V) % 2400 + 2400) % 2400 - 200;
      stroke([[x, 812], [x, 898]], '#C98F6A', 4, { ink: null });
    }
    // pavement
    rrect(-40, 896, W + 80, 220, 0, { fill: '#D9CFC4', lw: 6 });
    for (let i = 0; i < 12; i++) {
      const x = ((i * 240 - t * V) % 2880 + 2880) % 2880 - 240;
      stroke([[x, 900], [x - 90, 1090]], '#C2B6A8', 5, { ink: null });
    }
    // trees + lamps whizzing past
    for (let i = 0; i < 4; i++) {
      const x = ((i * 700 + 300 - t * V) % 2800 + 2800) % 2800 - 400;
      if (i % 2) tree(x, 900, 1.2, 'green', t); else streetlight(x, 905, 1.0, 0);
    }
    // the cat
    const cx = 1060 + (catJump - t) * V;
    if (cx > -300 && cx < 2300) {
      const age = t - catJump;
      const jy = age < 0 ? 0 : age < 0.7 ? Math.sin(age / 0.7 * Math.PI) * 480 : 0;
      cat(cx + (age > 0 ? age * 260 : 0), 915 - jy, 1.2, { scared: age > -0.05 ? 1 : 0, rot: age > 0 && age < 0.6 ? -0.3 : 0 });
      if (age > 0) emote('!', cx + age * 260 - 60, 640 - jy, clamp(age / 0.15), t);
    }
    // our hero, toast in teeth
    const cyc = beatOf(t);
    kid(820, 985, 1.02, {
      who: 'me', t, walk: cyc, run: true, bag: true, turn: 0.55, rot: 0.1, mouth: 'toast', eyes: 'determined',
      emote: 'sweat', emoteK: 0.8 + Math.sin(t * 20) * 0.2, lookX: t > catJump && t < catJump + 0.8 ? -0.8 : 0.6,
    });
    for (let i = 0; i < 4; i++) {
      const tb = (Math.floor(cyc * 2) - i) / 2;
      puff(700 - (cyc - tb) * V * 0.5, 985, 40, (cyc - tb) * SONG.beat, 0.6, '#FFFFFF', i + Math.floor(cyc * 2));
    }
    camEnd();
    streaks(t, 0.8, '#FFFFFF', 4);
  }

  // ---- 21.82 the gate: slide under the wire -----------------------------------------------------

  function gate(t, lt, dur) {
    const safe = sylT(12, 11);                               // 24.77 "프"
    const G = [960, 810, 0.95];
    const closed = clamp(kf(t, [[S.gate, 0.05], [safe - 0.35, 0.8], [safe, 1]], easeIn));
    const [sx, sy] = shakeXY(t, safe, 28, 0.5);
    skyFill([[0, '#79C4FF'], [0.6, '#CDEBFF'], [1, '#FFF1C4']]);
    sun(300, 150, 60, PAL.sun, t);
    const z = lerp(1.12, 1.2, easeInOut(lt / dur));
    camBegin(920 + sx + Math.sin(t) * 8, 650 + sy, z);
    cloudLayer(t, 150, 0.5, 20, 12);
    townRow(t, 650, 100 + t * 10, { tone: '#F4D2B0', seed: 5 });
    // street outside, yard inside
    rrect(-200, 640, W + 400, 200, 0, { fill: '#B8B2B8', stroke: null });
    stroke([[-200, 720], [W + 200, 720]], '#FFFFFF', 8, { ink: null, alpha: 0.7 });
    rrect(-200, 800, W + 400, 400, 0, { fill: '#EBCB98', lw: 6 });
    // the kid: far away on the street, then through the gap, then sliding to us
    const k1 = seg(t, S.gate, safe - 0.45), k2 = seg(t, safe - 0.45, safe);
    const gapL = G[0] - 350 * G[2], gapR = gapL + 700 * G[2] * (1 - closed);
    let kx, ky, ks, pose;
    if (t < safe - 0.45) {
      kx = lerp(880, 715, k1); ky = lerp(690, 790, easeIn(k1)); ks = lerp(0.3, 0.62, easeIn(k1));
      pose = { ...frontRun(t), eyes: 'determined', mouth: 'toast' };
    } else {
      kx = lerp(715, 800, k2); ky = lerp(790, 1010, easeIn(k2)); ks = lerp(0.62, 1.05, easeIn(k2));
      const squeeze = Math.exp(-Math.pow((ky - G[1]) / 40, 2));
      pose = { sq: t < safe ? 0.18 - squeeze * 0.45 : 0, lL: 1.1, lR: 1.1, kL: -0.4, kR: -0.4, aL: 2.4, aR: 2.4, eyes: 'determined', mouth: 'toast', rot: -0.05 };
    }
    const after = t >= safe;
    const kidPose = after
      ? { aL: 2.5 + pulse(t, 4) * 0.2, aR: 2.5 + pulse(t, 4) * 0.2, eL: 0.1, eR: 0.1, sq: -0.12 * hitK(t, safe, 0.2) + 0.08 * hitK(t, safe + 0.05, 0.3), eyes: 'star', mouth: 'grin', emote: 'sweat', dy: hop(t) * 20 }
      : pose;
    const drawKid = () => kid(kx, ky, ks, { who: 'me', t, bag: true, ...kidPose, blush: true });
    if (ky < G[1]) drawKid();
    schoolGate(G[0], G[1], G[2], closed);
    // the bell on the left pillar
    const bx = G[0] - 420 * G[2], by = G[1] - 420 * G[2], ring = seg(t, S.gate, S.gate + 1.4) < 1 ? Math.sin(t * 40) * 0.35 * (1 - seg(t, S.gate, S.gate + 1.4)) : 0;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ring);
    poly([[-34, 0], [-28, -40], [0, -54], [28, -40], [34, 0]], { fill: PAL.gold, lw: 5 });
    rrect(-40, -4, 80, 12, 5, { fill: '#E0A02A', lw: 4 }); circle(0, 14, 9, { fill: '#E0A02A', lw: 4 });
    ctx.restore();
    if (ky >= G[1]) {
      if (!after) for (let i = 0; i < 5; i++) puff(kx - 80 + i * 40, ky - 10, 60, (t - (safe - 0.45)) - i * 0.03, 0.8, '#F6E2BF', i);
      drawKid();
    }
    if (after) for (let i = 0; i < 6; i++) puff(kx - 150 + i * 60, ky, 70, t - safe - i * 0.02, 0.8, '#F6E2BF', i + 9);
    // the guard with the whistle
    const gM = after ? { eyes: 'wide', mouth: 'o', emote: '!?', emoteK: clamp((t - safe) / 0.2) } : { eyes: 'dot', mouth: 'flat', emote: 'anger', emoteK: 1 };
    adult(300, 900, 0.9, { kind: 'guard', t, aR: 2.2 + Math.sin(t * 10) * 0.1, eR: 1.4, aL: after ? 2.4 : 0.3, ...gM });
    if (!after) sfx('삐익!', 390, 380, 80, '#FFFFFF', t - (S.gate + 0.23), { life: 1.0, rot: 0.1 });
    // pony: the umpire
    const umpire = after ? 1 : 0;
    const pz = hitK(t, safe, 0.3);
    kid(1560, 1000, 1.0, {
      who: 'pony', t, aL: umpire ? Math.PI / 2 + 0.05 : 0.5, aR: umpire ? Math.PI / 2 + 0.05 : 0.5, eL: umpire ? 0 : -0.9, eR: umpire ? 0 : -0.9,
      lL: 0.35, lR: 0.35, kL: umpire ? 0 : 0.4, kR: umpire ? 0 : 0.4, sq: umpire ? -pz * 0.12 : 0.08,
      eyes: umpire ? 'closed' : 'wide', mouth: umpire ? 'open' : 'o', blush: true, lookX: -1,
    });
    // the stamp
    if (t > safe - 0.08) {
      const s = slamS(t, safe);
      ctx.save(); ctx.translate(1120, 400); ctx.rotate(-0.12); ctx.scale(s, s);
      rrect(-330, -120, 660, 240, 40, { fill: rgba('#FFFFFF', 0.9), stroke: PAL.red, lw: 16 });
      rrect(-306, -96, 612, 192, 28, { stroke: PAL.red, lw: 5 });
      letter('세이프!', 0, 8, 170, PAL.red, { lw: 0, shadow: null });
      ctx.restore();
    }
    camEnd();
    flash(hitK(t, safe, 0.15) * 0.7, '#FFFFFF');
  }

  // ---- 25.45 dozing in first period -------------------------------------------------------------

  function mathBoard(x, y, w, h) {
    chalk('x² + 2x + 1 = 0', x + 60, y + 80, 64);
    chalk('√16 = 4', x + 60, y + 180, 64);
    chalk('∴ x = −1', x + 60, y + 280, 56, '#FFE08A');
    // axes + a parabola
    const ox = x + 700, oy = y + 300;
    stroke([[ox - 180, oy], [ox + 200, oy]], PAL.chalk, 5, { ink: null, alpha: 0.9 });
    stroke([[ox, oy + 100], [ox, oy - 250]], PAL.chalk, 5, { ink: null, alpha: 0.9 });
    const pts = [];
    for (let i = 0; i <= 20; i++) { const u = (i - 10) / 10; pts.push([ox + u * 160, oy + 60 - (1 - u * u) * 260]); }
    stroke(pts, '#9FE3FF', 5, { ink: null, smooth: true });
  }

  function doze(t, lt, dur) {
    const nods = [27.05, 27.27, 27.5, 27.73].map((_, i) => sylT(14, 5 + i));
    const throwT = bt(15, 2), hitT = bt(15, 3);           // 28.18 → 28.64
    classroom(t, { board: mathBoard, clock: [9, 10] });
    const z = lerp(1.3, 1.4, easeInOut(lt / dur));
    camBegin(1150 + Math.sin(t) * 10, 620, z, Math.sin(t * 0.6) * 0.008);
    // the teacher
    const wind = kf(t, [[throwT - 0.45, 0], [throwT - 0.05, 1], [throwT + 0.08, -0.6], [throwT + 0.6, 0]]);
    adult(730, 960, 0.95, {
      kind: 'teacher', t, aL: 0.3, aR: 1.7 + wind * 1.2, eR: 0.4 - wind * 0.3, eyes: t > throwT - 0.5 ? 'dot' : 'dot',
      mouth: t > throwT - 0.5 ? 'open' : 'flat', emote: t > nods[1] ? 'anger' : null, emoteK: clamp((t - nods[1]) / 0.2),
      holdR: t < throwT ? (x, y) => rrect(x - 6, y - 26, 12, 34, 4, { fill: '#FFFFFF', lw: 3 }) : null,
    });
    // pony and glasses at their desks further back
    kid(1720, 900, 0.62, { who: 'glasses', t, sit: true, eyes: t > nods[0] ? 'look' : 'open', lookX: -1, mouth: 'flat', emote: t > nods[2] ? 'sweat' : null });
    desk(1720, 930, 0.72, { books: true });
    // the nodding one
    let nod = 0, snapped = 0;
    for (const n of nods) {
      const a = t - n;
      if (a >= -0.12 && a < 0.2) nod = Math.max(nod, a < 0 ? easeIn(seg(a, -0.12, 0)) : 1 - easeOut(seg(a, 0, 0.2)));
      if (a >= 0 && a < 0.2) snapped = 1;
    }
    const drift = t < nods[0] ? Math.sin(t * 3) * 0.5 + 0.5 : 0;
    const woke = t > hitT - 0.2;
    const kM = woke ? { eyes: 'wide', mouth: 'o', emote: '!', emoteK: clamp((t - hitT + 0.2) / 0.15) }
      : { eyes: nod > 0.5 ? 'closed' : snapped ? 'wide' : 'sleepy', mouth: nod > 0.5 ? 'o' : 'wavy', emote: 'zzz', emoteK: 1 };
    const duck = woke ? Math.exp(-Math.max(0, t - hitT + 0.2) * 5) : 0;
    kid(1250, 1110, 1.3, {
      who: 'me', t, sit: true, ...kM, headDy: nod * 60 + drift * 16 + duck * 50, headRot: nod * 0.05 + drift * 0.02,
      aL: 0.7, aR: 0.7, eL: -1.2, eR: -1.2, blush: 0.6, sq: duck * 0.08,
    });
    desk(1250, 1200, 1.5, { books: true });
    // the chalk: thrown, spinning at us
    if (t > throwT && t < hitT + 0.05) {
      const k = seg(t, throwT, hitT);
      const p = 1 / (1 - k * 0.965);
      const x = lerp(840, 1130, k), y = lerp(600, 560, k) - Math.sin(k * Math.PI) * 80;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 18); ctx.scale(p, p);
      rrect(-8, -26, 16, 52, 5, { fill: '#FFFFFF', lw: 3.5 });
      ctx.restore();
      for (let i = 1; i < 5; i++) {
        const kk = clamp(k - i * 0.04);
        circle(lerp(840, 1130, kk), lerp(600, 560, kk) - Math.sin(kk * Math.PI) * 80, 6 / (1 - kk * 0.9), { fill: '#FFFFFF', stroke: null, alpha: 0.4 - i * 0.08 });
      }
    }
    camEnd();
    // chalk dust fills the screen
    if (t > hitT) {
      const k = seg(t, hitT, S.end - 0.04);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU;
        smooth(blobPts(1000 + Math.cos(a) * 200 * k, 530 + Math.sin(a) * 150 * k, 120 + easeOut(k) * 900, 10, 0.2, i, t), { fill: '#FFFFFF', stroke: null, alpha: 0.9 });
      }
      flash(ease(seg(t, hitT + 0.1, S.end - 0.02)), '#FFFFFF');
      sfx('퍽!', 980, 500, 170, '#FFFFFF', t - hitT, { life: 0.35 });
    }
  }

  chapter('morning', 0, 29.09, [
    [0, dawn], [S.alarm, alarm], [S.title, title], [S.montage, montage],
    [S.wake, wake], [S.run, run], [S.gate, gate], [S.doze, doze],
  ]);
})();
