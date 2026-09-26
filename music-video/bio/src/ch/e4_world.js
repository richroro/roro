// e4_world (96.00 – 115.20): out into the world. A blonde silhouette in warm gold light (the hit
// at 98.40 blooms it); a huge generic festival stage over an endless sea of crowd lights; Seoul at
// night, a whip into a dome where the crowd's lights sway on the beat, then the lights go down to
// a single spotlight for the quiet chapter after.
(() => {
  const GOLD = '#FFC940', LIME = BIO.lime, PINK = BIO.pink;
  const HIT1 = 98.4, HIT2 = 108.0;

  // ---- private helpers -------------------------------------------------------------------------

  const after = (t, t0, k = 5) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
  function lighter(fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }

  /** A beam of light from (x0, y0) at angle a (0 = straight down), length len, spread w. */
  function beam(x0, y0, a, len, w, color, alpha) {
    if (alpha <= 0.003) return;
    const x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len;
    const nx = Math.cos(a) * w, ny = -Math.sin(a) * w;
    lighter(() => {
      ctx.fillStyle = lgrad(x0, y0, x1, y1, [[0, rgba(color, alpha)], [1, rgba(color, 0)]]);
      ctx.beginPath(); ctx.moveTo(x0 - nx * 0.04, y0 - ny * 0.04); ctx.lineTo(x1 - nx, y1 - ny);
      ctx.lineTo(x1 + nx, y1 + ny); ctx.lineTo(x0 + nx * 0.04, y0 + ny * 0.04); ctx.fill();
    });
  }

  // ---- 96.00 · 2021, in warm gold --------------------------------------------------------------

  function golden(t, lt) {
    const h = after(t, HIT1, 2.6), post = t >= HIT1 ? 1 : 0, p = pulse(t, 4);
    skyFill([[0, '#140803'], [0.4, '#5A2A0C'], [0.78, '#B4661C'], [1, '#2A1206']]);
    const [sx, sy] = shakeXY(t, HIT1, 24, 0.4);
    const zoom = kf(t, [[96, 1.16], [98.4, 1.04], [100.8, 1.0]], easeOut) + 0.1 * h;
    camBegin(1040 + sx - (t - 96) * 10, 540 + sy, zoom, -0.02 + (t - 96) * 0.006);
    const SX = 1540, SY = 720, HX = 1600;
    // the album title as huge faint lettering sliding behind, slammed in on the hit
    if (post) {
      ctx.save(); ctx.globalAlpha = 0.14 * seg(t, HIT1, HIT1 + 0.15);
      ctx.font = `230px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFE3A0';
      const slide = (t - HIT1) * 60, s = 1 + 0.25 * after(t, HIT1, 6);
      ctx.translate(960, 400); ctx.scale(s, s);
      ctx.fillText('HAPPIER', -slide, -120); ctx.fillText('THAN EVER', 120 + slide, 110);
      ctx.restore();
    }
    // a low sun behind her, rays turning slowly, blooming on the hit
    glow(SX, SY, 900, '#FFB347', 0.45 + 0.12 * p + 0.4 * h);
    lighter(() => sunburst(SX, SY, rgba('#FFD27A', 0.06 + 0.05 * p + 0.12 * h), 'rgba(0,0,0,0)', t * 0.06, 28, 2200));
    circle(SX, SY, 230 + 30 * h + 6 * p, { fill: rgrad(SX, SY, 0, 260, [[0, '#FFF8DC'], [0.55, '#FFE08A'], [1, rgba('#FFC45A', 0)]]), stroke: null });
    // a shockwave ring off the hit
    if (post && t - HIT1 < 0.8) {
      const r = (t - HIT1) / 0.8;
      circle(SX, SY, 240 + easeOut(r) * 900, { fill: null, stroke: rgba('#FFF1C8', 0.8 * (1 - r)), lw: 14 * (1 - r) + 2 });
    }
    // hazy ground
    rrect(-400, 930, 2800, 600, 0, { fill: lgrad(0, 930, 0, 1100, [[0, rgba('#3A1A06', 0.6)], [1, '#1A0A03']]), stroke: null });
    // floating dust in the light
    for (let i = 0; i < 60; i++) {
      const x = ((hash(i, 1) * 2400 + t * (10 + hash(i, 2) * 30)) % 2400) - 240;
      const y = 1050 - ((hash(i, 3) * 1200 + t * (20 + hash(i, 4) * 40)) % 1200);
      const r = 2 + hash(i, 5) * 5, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      circle(x, y, r * (1 + 0.6 * h), { fill: rgba('#FFE9B0', 0.25 * tw + 0.3 * h), stroke: null });
    }
    // the silhouette (blonde, 2021), stepping into a wide pose on the hit
    const bob = -8 * hop(t);
    silhouette(HX, 1000 + bob, 1.32 * (1 + 0.03 * h), { t, hair: '#E8D08A', pose: post ? 'arms' : 'stand', glow: '#FFC45A' });
    camEnd();

    // out of the flash that ended the chapter before; a warm flash on the hit
    fillScreen('#FFD27A', 0.9 * (1 - easeOut(seg(lt, 0, 0.5))));
    fillScreen('#FFF6DC', 0.7 * after(t, HIT1, 7));
    yearTag(t, 96.3, '2021');
    caption(t, 96.6, 100.65, '두 번째 정규 앨범 〈Happier Than Ever〉', '2021년 7월', { accent: GOLD });
  }

  // ---- 100.80 · a huge festival stage, 2022 ----------------------------------------------------

  const CROWD_Y = 640;

  function crowd(t, seed = 1) {
    const R = 16, b = beatOf(t);
    for (let r = 0; r < R; r++) {
      const k = r / (R - 1), y = CROWD_Y + Math.pow(k, 1.7) * 520, sc = 0.1 + 0.95 * Math.pow(k, 1.35);
      const col = mix('#2A1438', '#07050A', Math.pow(k, 0.6));
      // a row of heads as one bumpy band
      const sp = 58 * sc, n = Math.ceil(2600 / sp) + 2, lift = r % 2 ? hop(t) : hop(t + 0.3);
      ctx.beginPath(); ctx.moveTo(-340, H + 400);
      for (let i = 0; i < n; i++) {
        const x = -340 + i * sp + hash(i, r + seed) * sp * 0.4, hy = y - (18 + hash(i, r) * 10) * sc - lift * 6 * sc * hash(i, r + 3);
        ctx.lineTo(x, y); ctx.arc(x + sp * 0.35, hy, sp * 0.33, Math.PI, 0);
      }
      ctx.lineTo(2300, H + 400); ctx.closePath();
      ctx.save(); ctx.translate(0, -4 * sc - 1); ctx.fillStyle = rgba(mix(PINK, '#FFD6F0', 0.4), 0.28 * (1 - k * 0.5)); ctx.fill(); ctx.restore();
      ctx.fillStyle = col; ctx.fill();
      // raised hands and phone lights in the nearer rows; just lights further back
      for (let i = 0; i < n; i++) {
        if (hash(i, r + 20) > (sc > 0.35 ? 0.3 : 0.55)) continue;
        const x = -340 + i * sp + sp * 0.5, sway = Math.sin(b * Math.PI / 2 + i * 0.4 + r) * 14 * sc;
        const hy = y - (70 + 30 * hash(i, r + 5)) * sc;
        if (sc > 0.35) stroke([[x, y - 20 * sc], [x + sway, hy]], col, 12 * sc, { ink: null });
        const tw = 0.5 + 0.5 * Math.sin(t * (2 + hash(i, r) * 3) + i);
        const lc = hash(i, r + 9) > 0.8 ? LIME : hash(i, r + 9) > 0.6 ? '#FFB6DE' : '#FFF4E0';
        circle(x + sway, hy - 6 * sc, (3 + 5 * sc) * (0.8 + 0.3 * pulse(t, 5)), { fill: rgba(lc, 0.5 + 0.5 * tw), stroke: null });
      }
    }
  }

  function festival(t, lt) {
    const p = pulse(t, 5), b = beatOf(t);
    skyFill([[0, '#040208'], [0.45, '#140A22'], [0.6, '#2C1034'], [1, '#08040C']]);
    stars(t, 60, 31, 0.5, 420);
    const zoom = kf(t, [[100.8, 1.75], [103.2, 1.02], [108, 0.96]], easeInOut);
    const cy = kf(t, [[100.8, 400], [103.2, 530], [108, 545]], easeInOut);
    const [sx, sy] = shakeXY(t, 100.8, 16, 0.3);
    camBegin(960 + Math.sin(t * 0.4) * 30 + sx, cy + sy, zoom, Math.sin(t * 0.3) * 0.01);

    // searchlights sweeping the sky from behind the stage
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + Math.sin(t * (0.6 + i * 0.07) + i * 1.3) * 0.55;
      beam(620 + i * 136, 200, a, 1500, 120, i % 2 ? LIME : PINK, 0.1 + 0.08 * p);
    }
    // side towers, roof truss (a flat, generic rig), speaker stacks
    const TRUSS = '#1B1422';
    for (const x of [450, 1470]) {
      rrect(x - 26, 150, 52, 500, 4, { fill: TRUSS, stroke: null });
      for (let yy = 160; yy < 640; yy += 40) stroke([[x - 22, yy], [x + 22, yy + 40]], '#2E2538', 3, { ink: null });
      rrect(x - 70 + (x < 960 ? -70 : 70), 330, 120, 290, 8, { fill: '#0D0A12', stroke: null });
    }
    rrect(420, 140, 1080, 56, 6, { fill: TRUSS, stroke: null });
    for (let xx = 430; xx < 1490; xx += 40) stroke([[xx, 144], [xx + 40, 192]], '#2E2538', 3, { ink: null });
    // the LED wall behind her: bars of lime and pink rolling with the beat
    ctx.save(); ctx.beginPath(); ctx.rect(540, 220, 840, 360); ctx.clip();
    ctx.fillStyle = '#12081A'; ctx.fillRect(540, 220, 840, 360);
    for (let i = 0; i < 21; i++) {
      const x = 540 + i * 40, hh = 360 * (0.3 + 0.7 * Math.pow(Math.abs(Math.sin(b * Math.PI / 2 + i * 0.5)), 2));
      ctx.fillStyle = lgrad(0, 580 - hh, 0, 580, [[0, rgba(i % 2 ? LIME : PINK, 0.85)], [1, rgba(i % 2 ? LIME : PINK, 0.2)]]);
      ctx.fillRect(x + 4, 580 - hh, 32, hh);
    }
    ctx.restore();
    glow(960, 420, 520, PINK, 0.3 + 0.25 * p);
    // side screens with a slow wave
    for (const x of [140, 1540]) {
      rrect(x, 250, 240, 170, 8, { fill: '#0F0A16', stroke: '#2E2538', lw: 4 });
      const pts = [];
      for (let q = 0; q <= 24; q++) pts.push([x + 16 + q * 208 / 24, 335 + Math.sin(q * 0.6 + t * 4) * 40 * (0.4 + 0.6 * p)]);
      stroke(pts, x < 960 ? LIME : PINK, 5, { ink: null });
    }
    // the deck, its front edge lit
    rrect(470, 580, 980, 70, 4, { fill: '#0B0810', stroke: null });
    for (let i = 0; i < 24; i++) circle(490 + i * 41, 596, 5, { fill: rgba(i % 2 ? LIME : PINK, 0.6 + 0.4 * p), stroke: null });
    // the rig's lamps firing down onto the stage
    for (let i = 0; i < 9; i++) {
      const a = Math.sin(t * 1.3 + i * 0.9) * 0.45 + (i - 4) * 0.05;
      beam(560 + i * 100, 196, a, 460, 70, i % 2 ? '#FFFFFF' : (i % 4 ? LIME : PINK), 0.1 + 0.18 * p);
    }
    // the headliner, black-haired (2022), small on the huge stage
    silhouette(960, 580, 0.44, { t, hair: '#1A1320', pose: 'mic', glow: PINK });
    // the endless crowd
    glow(960, 650, 1150, '#8A2A8A', 0.3 + 0.12 * p);
    crowd(t);
    camEnd();

    fillScreen('#FFFFFF', 0.25 * after(t, 100.8, 8));
    yearTag(t, 101.1, '2022');
    caption(t, 101.4, 107.85, '글래스턴베리 역대 최연소 단독 헤드라이너', '2022년 6월 · 스무 살');
  }

  // ---- 108.00 · Seoul at night, into the dome ---------------------------------------------------

  const DX = 1380, DY = 610;       // the dome on the skyline (world)
  const T_WHIP = 110.1, T_IN = 110.85, T_DIM = 114.2;

  function skyline(t) {
    skyFill([[0, '#04050F'], [0.5, '#12143A'], [0.66, '#2E1C48'], [1, '#05050C']]);
    stars(t, 40, 51, 0.4, 380);
    // the mountain with a tower on it (a generic tower, lit)
    smooth([[-300, 700], [200, 560], [520, 400], [700, 330], [880, 400], [1150, 560], [1500, 700]], { fill: '#0C0B1E', stroke: null });
    rrect(692, 170, 16, 170, 4, { fill: '#1A1830', stroke: null });
    rrect(672, 210, 56, 30, 10, { fill: '#221F3C', stroke: null });
    rrect(676, 218, 48, 6, 3, { fill: rgba('#FFE7B0', 0.8), stroke: null });
    stroke([[700, 170], [700, 110]], '#1A1830', 5, { ink: null });
    glow(700, 110, 40, PINK, 0.5 + 0.5 * pulse(t, 4));
    // two rows of towers with windows
    for (const [layer, base, col, hmin, hmax, wd] of [[0, 650, '#15163A', 40, 170, 70], [1, 670, '#0B0B22', 50, 200, 90]]) {
      let x = -300, i = 0;
      while (x < 2300) {
        const w = wd * (0.6 + hash(i, layer + 3) * 0.8), h = hmin + hash(i, layer + 4) * (hmax - hmin);
        if (!(layer === 1 && Math.abs(x + w / 2 - DX) < 260)) {
          rrect(x, base - h, w - 6, h + 80, 2, { fill: col, stroke: null });
          ctx.fillStyle = rgba(layer ? '#FFE3A8' : '#B9C4FF', layer ? 0.55 : 0.35);
          for (let wy = base - h + 12; wy < base - 8; wy += 16) for (let wx = x + 8; wx < x + w - 14; wx += 14) {
            if (hash(wx * 7 + i, wy) > 0.62) ctx.fillRect(wx, wy, 6, 8);
          }
        }
        x += w; i++;
      }
    }
  }

  function dome(t) {
    const flash = after(t, 109.8, 3), p = pulse(t, 4);
    glow(DX, DY - 60, 460, PINK, 0.35 + 0.4 * flash + 0.15 * p);
    ctx.save(); ctx.beginPath(); ctx.ellipse(DX, DY, 250, 120, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = lgrad(0, DY - 120, 0, DY, [[0, '#E9E6F4'], [1, '#8E88A8']]); ctx.fill();
    ctx.clip();
    for (let i = -5; i <= 5; i++) stroke([[DX + i * 45, DY], [DX + i * 22, DY - 125]], 'rgba(60,50,90,0.4)', 3, { ink: null });
    ctx.restore();
    rrect(DX - 262, DY - 6, 524, 36, 6, { fill: '#1A1733', stroke: null });
    for (let i = 0; i < 20; i++) circle(DX - 240 + i * 25, DY + 12, 4, { fill: rgba(i % 2 ? LIME : PINK, 0.7 + 0.3 * flash), stroke: null });
  }

  function river(t) {
    rrect(-400, 700, 2800, 700, 0, { fill: lgrad(0, 700, 0, 1080, [[0, '#0B0C24'], [1, '#040410']]), stroke: null });
    // reflections: broken wavering streaks
    for (let i = 0; i < 90; i++) {
      const x = -200 + hash(i, 61) * 2300, y = 720 + hash(i, 62) * 340, w = 20 + hash(i, 63) * 60;
      const c = hash(i, 64) > 0.7 ? PINK : hash(i, 64) > 0.5 ? LIME : '#FFE3A8';
      ctx.fillStyle = rgba(c, 0.12 + 0.2 * Math.abs(Math.sin(t * 2 + i)));
      ctx.fillRect(x + Math.sin(t * 1.7 + i) * 12, y, w, 3);
    }
    // a long bridge with lights
    rrect(-400, 712, 2800, 12, 0, { fill: '#15142E', stroke: null });
    for (let i = 0; i < 12; i++) {
      const x = -250 + i * 220;
      stroke([[x, 712], [x + 110, 676], [x + 220, 712]], '#221F42', 5, { ink: null });
    }
    for (let i = 0; i < 70; i++) circle(-280 + i * 38, 718, 3.5, { fill: rgba(i % 3 === 0 ? PINK : i % 3 === 1 ? LIME : '#FFF1C8', 0.5 + 0.5 * pulse(t - i * 0.02, 3)), stroke: null });
  }

  function arena(t) {
    const p = pulse(t, 4), b = beatOf(t), dim = 1 - ease(seg(t, T_DIM, 115.0));
    skyFill([[0, '#030208'], [0.5, '#0B0714'], [1, '#050309']]);
    const zoom = kf(t, [[T_IN, 1.2], [115.2, 1.04]], easeOut);
    camBegin(960 + Math.sin(t * 0.5) * 30, 540, zoom, Math.sin(t * 0.4) * 0.015);
    // the roof: ribs of the dome overhead
    for (let i = 0; i < 7; i++) {
      ctx.save(); ctx.strokeStyle = rgba('#8C7FB0', 0.1 * dim + 0.02); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(960, 560, 800 + i * 240, 470 + i * 40, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.restore();
    }
    // a haze of colour over the stands
    glow(960, 420, 1000, PINK, 0.2 * dim);
    glow(400 + Math.sin(t) * 200, 700, 700, LIME, 0.1 * dim);
    // the stage at the centre: a lit deck and a small LED wall, the singer tiny on it
    glow(960, 560, 420, PINK, (0.35 + 0.25 * p) * dim);
    rrect(860, 470, 200, 90, 4, { fill: lgrad(0, 470, 0, 560, [[0, rgba(PINK, 0.9 * dim + 0.05)], [1, rgba(LIME, 0.5 * dim + 0.05)]]), stroke: null });
    rrect(800, 560, 320, 36, 4, { fill: '#17101F', stroke: rgba(PINK, 0.7 * dim), lw: 3 });
    // tiers of lights all around (a stadium bowl seen from the stands), swaying on the beat
    const groups = [[], [], []];
    const TIERS = 26;
    for (let j = 0; j < TIERS; j++) {
      const rx = 260 + j * 78 + j * j * 1.8, ry = 70 + j * 17 + j * j * 0.5, n = 46 + j * 11;
      const sz = 2.2 + j * 0.2, sway = Math.sin(b * Math.PI / 2 + j * 0.25) * (4 + j * 1.1);
      for (let q = 0; q < n; q++) {
        const a = (q + hash(q, j) * 0.7) / n * TAU, rj = 1 + (hash(q, j + 50) - 0.5) * 0.05;
        const x = 960 + Math.cos(a) * rx * rj + sway, y = 590 + Math.sin(a) * ry * rj - hop(t + q * 0.013) * (1 + j * 0.3);
        if (x < -300 || x > 2220 || y < -100 || y > 1200) continue;
        if (y < 600 && y > 440 && Math.abs(x - 960) < 170) continue;
        const wave = frac(a / TAU * 3 - b * 0.25 + j * 0.02);
        groups[wave < 0.3 ? 0 : wave < 0.55 ? 1 : 2].push(x, y, sz);
      }
    }
    lighter(() => {
      const cols = [LIME, PINK, '#FFF1E6'];
      groups.forEach((g, gi) => {
        ctx.fillStyle = rgba(cols[gi], (0.55 + 0.45 * p) * dim);
        ctx.beginPath();
        for (let i = 0; i < g.length; i += 3) { ctx.moveTo(g[i] + g[i + 2], g[i + 1]); ctx.arc(g[i], g[i + 1], g[i + 2], 0, TAU); }
        ctx.fill();
      });
    });
    silhouette(960, 560, 0.2, { t, hair: '#1A1320', pose: 'mic', glow: PINK });
    camEnd();
    // the lights go down; one spotlight stays on the stage, for the quiet chapter after
    const spot = seg(t, T_DIM - 0.3, 115.2);
    fillScreen('#000000', 0.6 * seg(t, T_DIM, 115.2));
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = rgrad(960, 560, 140, 760, [[0, 'rgba(0,0,0,0)'], [1, rgba('#000000', 0.9 * spot)]]);
    ctx.fillRect(0, 0, W, H); ctx.restore();
    beam(960, -120, 0, 720, 110 - 30 * spot, '#FFF4E0', 0.08 + 0.3 * spot);
    lighter(() => { ctx.fillStyle = rgba('#FFF4E0', 0.25 * spot); ellPath(960, 580, 170, 30); ctx.fill(); });
  }

  function seoul(t, lt) {
    if (t >= T_IN) {
      arena(t);
      fillScreen('#FFFFFF', 0.8 * after(t, T_IN, 6));
    } else {
      const whip = easeIn(seg(t, T_WHIP, T_IN));
      const [sx, sy] = shakeXY(t, HIT2, 26, 0.45);
      const cx = lerp(kf(t, [[108, 900], [110.1, 1120]], easeInOut), DX, whip);
      const cy = lerp(540, DY - 60, whip);
      const zoom = kf(t, [[108, 1.22], [108.5, 1.06], [110.1, 1.1]], easeOut) * (1 + whip * 7);
      camBegin(cx + sx, cy + sy, zoom);
      skyline(t);
      dome(t);
      river(t);
      camEnd();
      speedLines(t, 960, 480, whip, '#FFFFFF', 48, 9);
      fillScreen('#FFFFFF', 0.9 * after(t, HIT2, 10) + 0.9 * Math.pow(seg(t, T_IN - 0.2, T_IN), 2));
    }
    caption(t, 108.4, 115.0, '서울 고척스카이돔 공연', '2022년 8월 15일 · 관객 약 2만 명', { accent: PINK });
  }

  chapter('world', 96.0, 115.2, [[96.0, golden], [100.8, festival], [108.0, seoul]]);
})();
