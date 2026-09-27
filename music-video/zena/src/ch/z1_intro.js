// z1_intro: 전주 (0 – 7.27). The 노래방 machine boots: power-on line, the song number 0918 typed
// on the beats (Zena hops on the keypad to press it), "예약" blinks; then the title screen with the
// full moon between tinsel curtains, the chorus peeking out on the tom fill.
//
// Also defines window.Z12, the stage look shared with z2 (and free for z3/z4 to reuse):
//   Z12.cast                 [zena, chorus1..4] sprite colours ({hair, outfit, trim, long, legs, shoes})
//   Z12.stage(t, o)          whole-frame backdrop: karaokeBg (moon, sea, stars) + the floating stage
//   Z12.lineup(t, o)         the five sprites (chorus behind, Zena centre with the mic)
//   Z12.curtains(t, open, o) gold tinsel side curtains + red valance with tinsel fringe (front layer)
//   Z12.bends(t, x, y, o)    꺾기 squiggles on every long melody note, near (x, y) = Zena's mouth
//   Z12.crt(t, o)            scanlines + rolling band + vignette (the karaoke-screen finish)
//   Z12.hud(t, o)            small top strip: LED 0918 + song title
//   Z12.glitter / twinkles / spot / songpyeon / note   small effects
(() => {
  const B = 60 / 132;                         // one beat
  const TUNE = (typeof SONG !== 'undefined' && SONG.tune) || [];
  const LONG_NOTES = TUNE.filter(n => n.dur >= 0.4);

  // ---- the cast: colours only, for telling sprites apart (not modelled on anyone) ---------------
  const CAST = [
    { hair: '#3B1F2B', outfit: '#FF4FA3', trim: '#FFE14D', long: true, legs: '#2A2440', shoes: '#FFFFFF' }, // Zena
    { hair: '#1E1A2E', outfit: '#39C6FF', trim: '#FFFFFF', long: true, legs: '#1C2A5C', shoes: '#FFFFFF' },
    { hair: '#6B3A24', outfit: '#8A4DFF', trim: '#FFC23D', long: false, legs: '#2A1B4A', shoes: '#FFE14D' },
    { hair: '#4A2448', outfit: '#3FE08A', trim: '#FFFFFF', long: true, legs: '#163A2A', shoes: '#FFFFFF' },
    { hair: '#A8703A', outfit: '#FF9A3D', trim: '#FFF1A8', long: false, legs: '#3A2020', shoes: '#FFFFFF' },
  ];
  // where they stand: chorus back row / front row, Zena centre front
  const STAGE_Y = 1300;                       // top edge of the stage floor
  const BACK = [[150, 1330], [338, 1330], [742, 1330], [930, 1330]];
  const FRONT = [[112, 1405], [322, 1405], [758, 1405], [968, 1405]];
  const ZENA = [540, 1405];
  // where the chorus hide behind the title-screen curtains: [x, y, lean when peeking, peek time]
  const PEEK = [[215, 1330, 0.38, 6.3636], [160, 1330, 1.05, 6.8182], [920, 1330, -1.05, 7.0455], [865, 1330, -0.38, 6.5909]];

  // ---- small pixel things ------------------------------------------------------------------------
  const pixGrid = (rows, x, y, s, cols) => {
    rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const k = row[c]; if (k === '.') continue; ctx.fillStyle = cols[k]; ctx.fillRect(Math.round(x + (c - row.length / 2) * s), Math.round(y + (r - rows.length / 2) * s), s + 0.5, s + 0.5); } });
  };
  const NOTE = ['..XXX', '..X.X', '..X.X', '..X.X', 'XXX.X', 'XXX..', 'XXX..'];
  const note = (x, y, s, c) => pixGrid(NOTE, x, y, s, { X: c });
  const SONGP = ['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', '.KKKKKK.'];
  const PERSIM = ['...GG...', '.GGOGG..', '.OOOOOO.', 'OOOOOOOO', 'OOOOOOOO', 'OOOOOOOO', '.OOOOOO.', '..OOOO..'];
  function songpyeon(x, y, s, i, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (i % 4 === 3) pixGrid(PERSIM, 0, 0, s, { O: '#FF8A2A', G: '#3FA84A' });
    else pixGrid(SONGP, 0, 0, s, { X: ['#FFB7D0', '#B8F0A0', '#FFF6E6'][i % 3], K: 'rgba(16,16,42,0.35)' });
    ctx.restore();
  }
  /** Pixel 4-point stars blinking on the beat inside a box. */
  function twinkles(t, n, seed, x = 0, y = 0, w = W, h = H * 0.6, s = 6) {
    for (let i = 0; i < n; i++) {
      const ph = frac(beatOf(t) * 0.5 + hash(i, seed + 1));
      if (ph > 0.55) continue;
      const k = Math.sin(ph / 0.55 * Math.PI), q = Math.round(s * (1 + hash(i, seed + 2)));
      const px0 = Math.round((x + hash(i, seed) * w) / q) * q, py0 = Math.round((y + hash(i, seed + 3) * h) / q) * q;
      ctx.fillStyle = ['#FFFFFF', KR.yellow, KR.cyan, KR.pink][i % 4];
      ctx.globalAlpha = k;
      ctx.fillRect(px0, py0, q, q);
      if (k > 0.5) { ctx.fillRect(px0 - q, py0, q, q); ctx.fillRect(px0 + q, py0, q, q); ctx.fillRect(px0, py0 - q, q, q); ctx.fillRect(px0, py0 + q, q, q); }
      if (k > 0.85) { ctx.fillRect(px0 - 2 * q, py0, q, q); ctx.fillRect(px0 + 2 * q, py0, q, q); ctx.fillRect(px0, py0 - 2 * q, q, q); ctx.fillRect(px0, py0 + 2 * q, q, q); }
    }
    ctx.globalAlpha = 1;
  }
  /** Pixel glitter falling from t0 (a crash). */
  function glitter(t, t0, n = 70, seed = 3, cols = [KR.gold, '#FFF1A8', KR.pink, KR.cyan, '#FFFFFF']) {
    const age = t - t0; if (age < 0 || age > 3) return;
    for (let i = 0; i < n; i++) {
      const x0 = hash(i, seed) * W, vx = (hash(i, seed + 1) - 0.5) * 500, vy0 = -300 - hash(i, seed + 2) * 900;
      const x = x0 + vx * age + Math.sin(age * 6 + i) * 20, y = 700 + hash(i, seed + 4) * 400 + vy0 * age + 900 * age * age;
      if (y > H) continue;
      const q = 8 + (i % 3) * 4, on = frac(age * 5 + hash(i, 9)) < 0.7;
      ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = on ? 1 - clamp((age - 2.2) / 0.8) : 0.35;
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, q, q * (on ? 1 : 0.5));
    }
    ctx.globalAlpha = 1;
  }
  /** An additive spotlight cone from (x, y0) down to (x2, y1). */
  function spot(x, y0, x2, y1, w0, w1, color = '#FFF3C0', a = 0.3) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lgrad(0, y0, 0, y1, [[0, rgba(color, a * 0.2)], [0.8, rgba(color, a)], [1, rgba(color, a * 0.6)]]);
    ctx.beginPath(); ctx.moveTo(x - w0 / 2, y0); ctx.lineTo(x + w0 / 2, y0); ctx.lineTo(x2 + w1 / 2, y1); ctx.lineTo(x2 - w1 / 2, y1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(color, a * 0.8); ctx.beginPath(); ctx.ellipse(x2, y1, w1 / 2, w1 * 0.1, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---- the stage ---------------------------------------------------------------------------------
  /**
   * The whole backdrop. o: moonX/moonY/moonR (default 560, 560, 190), seaY (1150), top/mid/low (sky
   * gradient), moon:false, platform:false, stageY (1300), bulbs (true), twinkle (true).
   */
  function stage(t, o = {}) {
    karaokeBg(t, { moonX: o.moonX ?? 560, moonY: o.moonY ?? 560, moonR: o.moonR ?? 190, seaY: o.seaY ?? 1150, top: o.top, mid: o.mid, low: o.low, moon: o.moon, sea: o.sea });
    if (o.twinkle !== false) twinkles(t, 26, 40, 0, 120, W, 900);
    if (o.platform !== false) platform(t, o.stageY ?? STAGE_Y, o);
  }
  function platform(t, sy, o = {}) {
    const d = 100;                                       // floor depth on screen
    // shadow on the water
    ctx.fillStyle = 'rgba(8,10,40,0.45)'; ctx.fillRect(0, sy + d + 40, W, 40);
    // floor: stepped pixel rows, widening toward us
    for (let r = 0; r < d; r += 10) {
      const k = r / d, w = lerp(880, 1100, k), x0 = Math.round((W - w) / 2 / 10) * 10;
      ctx.fillStyle = mix('#3A1458', '#6A2080', k);
      ctx.fillRect(x0, sy + r, W - 2 * x0, 10);
    }
    // floor glints (planks)
    for (let i = -6; i <= 6; i++) {
      ctx.fillStyle = 'rgba(255,190,255,0.12)';
      for (let r = 0; r < d; r += 10) ctx.fillRect(Math.round((540 + i * lerp(70, 88, r / d)) / 5) * 5, sy + r, 5, 10);
    }
    // spotlight pool on the floor
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgrad(540, sy + 70, 0, 300, [[0, 'rgba(255,230,160,0.35)'], [1, 'rgba(255,230,160,0)']]);
    ctx.fillRect(200, sy, 680, d); ctx.restore();
    // gold lip and the front face with footlight bulbs
    ctx.fillStyle = '#FFC23D'; ctx.fillRect(-10, sy + d, W + 20, 10);
    ctx.fillStyle = '#FFF1A8'; ctx.fillRect(-10, sy + d, W + 20, 3);
    ctx.fillStyle = '#7A0E4A'; ctx.fillRect(-10, sy + d + 10, W + 20, 34);
    ctx.fillStyle = '#4A0830'; ctx.fillRect(-10, sy + d + 38, W + 20, 6);
    if (o.bulbs !== false) {
      const bn = beatN(t);
      for (let i = 0; i < 18; i++) {
        const x = 30 + i * 60, lit = (i + bn) % 2 === 0, k = lit ? 0.6 + 0.4 * pulse(t, 4) : 0.15;
        ctx.fillStyle = mix('#5A2A10', '#FFF3A0', k); ctx.fillRect(x - 9, sy + d + 16, 18, 18);
        if (lit) glow(x, sy + d + 25, 46, '#FFE14D', 0.5 * k);
      }
    }
  }

  // ---- the sprites -------------------------------------------------------------------------------
  /** One cast member (i = 0 Zena) at feet (x, y) with pixel size px. Extra: lean (radians), hopK, pose. */
  function member(t, i, x, y, px, o = {}) {
    const c = CAST[i];
    const hy = (o.hopK ?? (i === 0 ? 0.8 : 1.1)) * hop(t + (o.phase ?? 0)) * px;
    ctx.save(); ctx.translate(x, y - hy); ctx.rotate(o.lean || 0);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    // soft shadow
    ctx.fillStyle = 'rgba(10,6,30,0.35)'; ctx.fillRect(-6 * px, hy - px * 0.6, 12 * px, px);
    sprite(0, 0, px, { t, ...c, pose: o.pose || (i === 0 ? 'sing' : 'clap'), mic: i === 0, flip: o.flip, bob: 1 });
    ctx.restore();
  }
  /**
   * The line-up. o: front (0..1, chorus walks from the back row to the front row), zPose, cPose
   * (string or [4]), zLean, cDim (0..1 darkens the chorus), zPx (15), cPx (12), only ('zena'|'chorus'),
   * cPos ([4] of [x, y, lean, px] to place the chorus yourself), zX/zY/zFlip.
   */
  function lineup(t, o = {}) {
    const f = o.front ?? 0;
    if (o.only !== 'zena') for (let i = 0; i < 4; i++) {
      const k = ease(clamp(f * 1.25 - i * 0.08));
      const [bx, by] = BACK[i], [fx, fy] = FRONT[i];
      const jump = Math.sin(k * Math.PI) * 60;
      const pose = Array.isArray(o.cPose) ? o.cPose[i] : (o.cPose || (i % 2 ? 'sway' : 'clap'));
      const px = lerp(o.cPx ?? 12, 13, k);
      const cp = o.cPos && o.cPos[i];                    // an override: [x, y, lean, px]
      if (cp) member(t, i + 1, cp[0], cp[1], cp[3] ?? px, { pose, flip: i >= 2, lean: cp[2] || 0, hopK: 1.2 });
      else member(t, i + 1, lerp(bx, fx, k), lerp(by, fy, k) - jump, px, { pose, flip: i >= 2, hopK: 1.2 });
    }
    if (o.cDim && o.only !== 'zena') {                  // a spotlight veil: everything but the singer dims
      const zx = o.zX ?? ZENA[0], zy = (o.zY ?? ZENA[1]) - 180;
      ctx.fillStyle = rgrad(zx, zy, 170, 560, [[0, 'rgba(10,8,40,0)'], [1, `rgba(10,8,40,${0.55 * o.cDim})`]]);
      ctx.fillRect(-400, -400, W + 800, H + 800);
    }
    if (o.only !== 'chorus') member(t, 0, o.zX ?? ZENA[0], o.zY ?? ZENA[1], o.zPx ?? 15, { pose: o.zPose || 'sing', lean: o.zLean || 0, flip: o.zFlip });
  }
  /** How far Zena leans into the current long note (a trot bend of the whole body). */
  function leanAt(t) {
    for (const n of LONG_NOTES) if (t >= n.t && t < n.t + n.dur + 0.2) {
      const k = clamp((t - n.t) / 0.15) * clamp((n.t + n.dur + 0.2 - t) / 0.2);
      return k * (LONG_NOTES.indexOf(n) % 2 ? -0.09 : 0.09);
    }
    return 0;
  }

  /**
   * 꺾기 squiggles: one per long melody note (dur >= 0.4), alternating sides of (x, y), higher notes
   * higher. o: w (200), gap (130), lw (12), scale (1), from/to (time window), big (1.36-s notes bigger).
   */
  function bends(t, x, y, o = {}) {
    const cols = [KR.cyan, KR.yellow, KR.pink, KR.green];
    LONG_NOTES.forEach((n, i) => {
      if (t < n.t || t > n.t + n.dur + 0.6) return;
      if (o.from !== undefined && n.t < o.from - 0.01) return;
      if (o.to !== undefined && n.t >= o.to) return;
      const s = (o.scale ?? 1) * (n.dur > 1 ? 1.35 : 1);
      const side = i % 2 ? -1 : 1, fade = 1 - clamp((t - n.t - n.dur - 0.1) / 0.5);
      const yy = y - (n.midi - 74) * 9 * (o.scale ?? 1);
      ctx.save(); ctx.globalAlpha *= fade; ctx.translate(x, yy); ctx.scale(side, 1);
      const w = (o.w ?? 200) * s, gap = (o.gap ?? 130) * (o.scale ?? 1), c = cols[i % 4];
      bend(t, n.t, gap, 0, w, c, { dur: Math.max(0.3, n.dur * 0.85), lw: (o.lw ?? 12) * s });
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= fade;
      const nk = clamp((t - n.t) / 0.15);
      note(x + side * (gap + w + 26 * s), yy - 40 * s - (t - n.t) * 40, Math.round(6 * s * nk) || 1, c);
      ctx.restore();
    });
  }

  // ---- tinsel curtains ---------------------------------------------------------------------------
  const GOLD = ['#FFC23D', '#FFE88A', '#E09A1A', '#FFF6C8', '#F2B233'];
  /** One tinsel curtain between x0 and x1 (strands every 11 px). o: colors, ripple, flash, ragged. */
  function strands(t, x0, x1, y, h, o = {}) {
    const cols = o.colors || GOLD, n = Math.max(1, Math.floor((x1 - x0) / 11)), seg = 60;
    const fl = o.flash ?? 0, rip = o.ripple ?? 0, seed = o.seed ?? 0;
    for (let i = 0; i < n; i++) {
      const c0 = cols[(i + Math.floor(hash(i, seed + 7) * 3)) % cols.length], c = mix(c0, '#FFFFFF', fl);
      const len = h - hash(i, seed + 5) * (o.ragged ?? 50);
      const bx = x0 + i * 11 + Math.sin(t * 2 + i * 0.7) * 2;
      for (let yy = 0; yy < len; yy += seg) {
        const dx = Math.round(Math.sin(yy * 0.011 - t * 9 + i * 0.35) * rip + Math.sin(t * 1.3 + i * 0.2 + yy * 0.004) * 3);
        ctx.fillStyle = yy / len > 0.7 ? mix(c, '#5A3000', 0.25) : c;
        ctx.fillRect(Math.round(bx + dx), y + yy, 7, Math.min(seg, len - yy));
      }
      // glints running down the strand
      for (let k = 0; k < 4; k++) {
        const gy = frac(hash(i, seed + k + 11) + t * (0.12 + hash(i, k) * 0.2)) * len;
        const dx = Math.round(Math.sin(gy * 0.011 - t * 9 + i * 0.35) * rip);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(Math.round(bx + dx), y + gy, 7, 10);
      }
    }
  }
  /**
   * Side curtains + valance, drawn over everything. open: 0 closed, 1 bunched at the edges.
   * o: colors, ripple (px), flash (0..1, default a beat pulse), valance (true), shift (x jiggle), y0, h.
   */
  function curtains(t, open, o = {}) {
    const fl = o.flash ?? pulse(t, 5) * 0.55, y0 = o.y0 ?? 120, h = o.h ?? 1520, sh = o.shift ?? 0;
    const edge = lerp(W / 2 + 8, 64, clamp(open));
    ctx.fillStyle = 'rgba(40,20,0,0.35)';               // a shade behind the strands
    ctx.fillRect(-20, y0, edge + 20 + sh, h - 60); ctx.fillRect(W - edge + sh, y0, edge + 20, h - 60);
    strands(t, -20 + sh, edge + sh, y0, h, { ...o, flash: fl, seed: 1 });
    strands(t, W - edge + sh, W + 20 + sh, y0, h, { ...o, flash: fl, seed: 2 });
    if (o.valance !== false) valance(t, fl, o);
  }
  function valance(t, fl, o = {}) {
    const vy = o.vy ?? 0, vh = 150;
    ctx.fillStyle = '#B0103A'; ctx.fillRect(0, vy, W, vh);
    for (let x = 0; x < W; x += 36) { ctx.fillStyle = '#8A0A2C'; ctx.fillRect(x, vy, 12, vh); }
    // scalloped swags
    for (let s = 0; s < 6; s++) {
      const cx = 90 + s * 180;
      for (let r = 0; r < 6; r++) {
        const w = 180 - r * r * 4.5; ctx.fillStyle = r % 2 ? '#B0103A' : '#C8184A';
        ctx.fillRect(Math.round((cx - w / 2) / 6) * 6, vy + vh + r * 10, Math.round(w / 6) * 6, 10);
      }
    }
    ctx.fillStyle = mix('#FFC23D', '#FFFFFF', fl); ctx.fillRect(0, vy + vh - 12, W, 12);
    // tinsel fringe along the swags
    const cols = o.colors || GOLD;
    for (let i = 0; i < W / 9; i++) {
      const x = i * 9, s = Math.floor(x / 180), lx = x - (90 + s * 180), dip = Math.max(0, 60 - lx * lx * 0.0075);
      const len = 40 + hash(i, 3) * 26, c = mix(cols[i % cols.length], '#FFFFFF', fl);
      ctx.fillStyle = c; ctx.fillRect(x + Math.round(Math.sin(t * 5 + i * 0.5) * 2), vy + vh + dip - 8, 5, len);
    }
  }

  // ---- screen finish -----------------------------------------------------------------------------
  /** Scanlines, a rolling band and a CRT vignette, in screen space. o.a scanline strength (0.14). */
  function crt(t, o = {}) {
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = `rgba(0,0,20,${o.a ?? 0.14})`;
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    const by = frac(t * 0.23) * (H + 300) - 150;
    ctx.fillStyle = lgrad(0, by - 120, 0, by + 120, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(200,220,255,0.05)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, by - 120, W, 240);
    ctx.fillStyle = rgrad(W / 2, H / 2, H * 0.45, H * 0.78, [[0, 'rgba(0,0,10,0)'], [1, 'rgba(0,0,10,0.45)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  /** The small top strip of a playing karaoke song: LED number + title. o.y (180), o.alpha. */
  function hud(t, o = {}) {
    const y = o.y ?? 180;
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = o.alpha ?? 1;
    rrect(60, y - 36, 960, 72, 14, { fill: 'rgba(6,8,40,0.72)', stroke: rgba('#39E6FF', 0.7), lw: 4 });
    ledDigits('0918', 86, y - 22, 44, KR.red);
    ctx.font = `40px ${FONT.bold}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = KR.ink; ctx.lineJoin = 'round';
    ctx.strokeText('제나의 트로트 메들리', 250, y + 3); ctx.fillStyle = '#FFFFFF'; ctx.fillText('제나의 트로트 메들리', 250, y + 3);
    // a little beat meter: four pixel blocks lighting on the beats of the bar
    const bb = beatN(t) % 4;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i === bb ? KR.yellow : 'rgba(255,225,77,0.2)'; ctx.fillRect(880 + i * 30, y - 12, 22, 22); }
    ctx.restore();
  }

  window.Z12 = { cast: CAST, PEEK, BACK, FRONT, ZENA, STAGE_Y, stage, platform, member, lineup, leanAt, bends, curtains, strands, valance, crt, hud, glitter, twinkles, spot, songpyeon, note, pixGrid };

  // =================================================================================================
  // Shot 1 (0 – 3.64): power on, type 0918 on the keypad, 예약.
  // =================================================================================================
  const KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['취소', '0', '예약']];
  const KX = c => 540 + (c - 1) * 212, KY = r => 1160 + r * 104, KW = 192, KH = 86;
  const PRESS = [[0.4545, 3, 1], [0.9091, 2, 2], [1.3636, 0, 0], [1.8182, 2, 1], [2.2727, 3, 2]];   // time, row, col
  const DIGITS = '0918';

  function keyDown(t, r, c) {
    for (const [pt, pr, pc] of PRESS) if (pr === r && pc === c && t >= pt) {
      const age = t - pt; return { down: age < 0.35 ? 1 : 0.3, lit: Math.exp(-age * 2.5), age };
    }
    return { down: 0, lit: 0, age: -1 };
  }
  function keypad(t) {
    const pw = 3 * KW + 2 * 20 + 60, ph = 4 * KH + 3 * 18 + 60;
    rrect(540 - pw / 2, KY(0) - 40, pw, ph, 26, { fill: '#1A2060', stroke: '#39E6FF', lw: 6 });
    rrect(540 - pw / 2 + 10, KY(0) - 30, pw - 20, ph - 20, 20, { fill: null, stroke: 'rgba(57,230,255,0.25)', lw: 3 });
    KEYS.forEach((row, r) => row.forEach((lab, c) => {
      const { down, lit } = keyDown(t, r, c), dy = down * 8;
      const x = KX(c) - KW / 2, y = KY(r);
      const special = lab === '예약' || lab === '취소';
      const base = lab === '예약' ? '#FF4FA3' : lab === '취소' ? '#4A4A7A' : '#3A4FD0';
      ctx.fillStyle = '#0A0C30'; ctx.fillRect(x, y + 10, KW, KH);                       // key shadow
      ctx.fillStyle = mix(base, KR.yellow, lit); ctx.fillRect(x, y + dy, KW, KH - 2);
      ctx.fillStyle = mix(mix(base, '#FFFFFF', 0.35), '#FFFFFF', lit); ctx.fillRect(x, y + dy, KW, 8);
      ctx.fillStyle = mix(base, '#000000', 0.3); ctx.fillRect(x, y + dy + KH - 12, KW, 10);
      ctx.strokeStyle = KR.ink; ctx.lineWidth = 5; ctx.strokeRect(x, y + dy, KW, KH - 2);
      if (lit > 0.05) glow(KX(c), y + KH / 2, 170, KR.yellow, 0.5 * lit);
      letter(lab, KX(c), y + dy + KH / 2 - 2, special ? 44 : 58, lit > 0.3 ? KR.ink : '#FFFFFF', { color2: lit > 0.3 ? '#FFFFFF' : KR.ink, shadow: null, lw: special ? 8 : 10 });
    }));
  }
  /** Zena's feet position hopping between the keys. */
  function hopper(t) {
    const keyTop = (r, c) => [KX(c), KY(r) + 4];
    if (t < PRESS[0][0]) {                                   // drops in from above
      const [x, y] = keyTop(PRESS[0][1], PRESS[0][2]), k = clamp((t - 0.12) / (PRESS[0][0] - 0.12));
      return { x, y: lerp(-80, y, k * k), air: k < 1, sq: 0 };
    }
    for (let i = 0; i < PRESS.length; i++) {
      const [pt, r, c] = PRESS[i], nx = PRESS[i + 1];
      const [x0, y0] = keyTop(r, c);
      if (!nx || t < nx[0]) {
        const lt = t - pt;
        if (!nx) return { x: x0, y: y0 + 8 - Math.abs(Math.sin(Math.PI * beatOf(t))) * 50 * clamp((lt - 0.3) / 0.2), air: false, cheer: lt > 0.25, sq: 0 };
        const [x1, y1] = keyTop(nx[1], nx[2]), leave = pt + 0.12;
        if (t < leave) return { x: x0, y: y0 + 8, air: false, sq: 1 - (t - pt) / 0.12 };
        const k = (t - leave) / (nx[0] - leave);
        return { x: lerp(x0, x1, k), y: lerp(y0 + 8, y1, k) - Math.sin(k * Math.PI) * 170, air: true, sq: 0, dir: Math.sign(x1 - x0) };
      }
    }
    return { x: 540, y: 1500, air: false };
  }

  function ledPanel(t) {
    const px0 = 170, py0 = 560, pw = 740, ph = 300;
    rrect(px0, py0, pw, ph, 30, { fill: '#08040C', stroke: '#FF3B3B', lw: 7 });
    rrect(px0 + 14, py0 + 14, pw - 28, ph - 28, 20, { fill: null, stroke: 'rgba(255,59,59,0.3)', lw: 3 });
    letter('곡 번호', px0 + 40, py0 - 30, 38, KR.yellow, { align: 'left', font: 'round', lw: 8, shadow: null });
    const h = 210, dw = h * 0.55 + h * 0.22, x0 = 540 - (4 * dw - h * 0.22) / 2;
    for (let i = 0; i < 4; i++) {
      const pt = PRESS[i][0], typed = t >= pt, age = t - pt;
      const x = x0 + i * dw;
      if (typed) {
        const s = 1 + 0.25 * Math.exp(-age * 9);
        ctx.save(); ctx.translate(x + h * 0.275, py0 + ph / 2); ctx.scale(s, s);
        ledDigits(DIGITS[i], -h * 0.275, -h / 2, h, t >= 2.2727 && frac((t - 2.2727) / B) < 0.5 ? '#FF7A5A' : KR.red);
        ctx.restore();
      } else {
        const cur = i === 0 ? true : t >= PRESS[i - 1][0];
        ledDigits(cur && frac(t / B) < 0.5 ? '-' : ' ', x, py0 + ph / 2 - h / 2, h, KR.red);
      }
    }
  }

  function boot(t, lt) {
    fillScreen(lgrad(0, 0, 0, H, [[0, '#04051C'], [0.5, '#0A0F3A'], [1, '#12083A']]));
    // moving grid floor, retro
    ctx.strokeStyle = 'rgba(57,230,255,0.12)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const y = 1640 + Math.pow((i + frac(t * 2)) / 12, 2) * 300; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(540 + i * 30, 1640); ctx.lineTo(540 + i * 180, 1940); ctx.stroke(); }
    twinkles(t, 18, 7, 0, 120, W, 1000, 5);
    kBanner(t, 0.3, 9, '곡 번호를 누르세요', { y: 290, size: 74, bg: '#2438B8' });
    ledPanel(t);
    // 예약 blink
    if (t >= 2.2727) {
      const age = t - 2.2727, on = frac(age / (B / 2)) < 0.6, s = age < 0.2 ? backOut(age / 0.2) : 1;
      ctx.save(); ctx.translate(540, 925); ctx.scale(s, s);
      rrect(-120, -42, 240, 84, 42, { fill: on ? KR.pink : '#5A1A40', stroke: KR.ink, lw: 6 });
      letter('예약', 0, 2, 58, on ? '#FFFFFF' : '#C98AA8', { lw: 10, shadow: null });
      ctx.restore();
      if (on) { glow(540, 925, 220, KR.pink, 0.35); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = 150 + easeOut(clamp(age / 0.4)) * 60; if (age < 0.6) { ctx.fillStyle = KR.yellow; ctx.fillRect(540 + Math.cos(a) * r * 1.3 - 6, 925 + Math.sin(a) * r * 0.5 - 6, 12, 12); } }
    }
    // the small print
    if (t > 1.95) {
      const k = clamp((t - 1.95) / 0.25);
      letter('(곡 번호 = 영상이 올라온 날, 9월 18일)', 540, 1030, 44, KR.cyan, { font: 'round', pop: k, lw: 9 });
    }
    keypad(t);
    // Zena hops on the keys (the key presses land on the beats)
    const z = hopper(t), px = 9;
    ctx.save(); ctx.translate(z.x, z.y);
    const sq = z.sq ?? 0; ctx.scale(1 + sq * 0.12, 1 - sq * 0.12);
    sprite(0, 0, px, { t, ...CAST[0], pose: z.air || z.cheer ? 'cheer' : 'stand', mic: false, flip: z.dir < 0 });
    ctx.restore();
    // 삑! on each press, a little squiggle on the long notes
    PRESS.forEach(([pt, r, c], i) => sfx(i < 4 ? '삑!' : '딩동♪', KX(c) + (c === 0 ? -170 : 170), KY(r) - 40, i < 4 ? 58 : 64, i < 4 ? KR.yellow : KR.pink, t - pt, { life: 0.5, rot: c === 0 ? -0.2 : 0.2 }));
    bends(t, z.x, z.y - 200, { w: 110, gap: 70, lw: 8, scale: 0.6, to: 3.6 });
    // power-on: a bright line opens into the picture
    if (t < 0.34) {
      const k = clamp(t / 0.34), open = easeOut(clamp((k - 0.35) / 0.65));
      const bh = lerp(6, H, open), lw = lerp(40, W, easeOut(clamp(k / 0.35)));
      ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H / 2 - bh / 2); ctx.fillRect(0, H / 2 + bh / 2, W, H);
      if (open < 0.02) { ctx.fillRect(0, 0, W / 2 - lw / 2, H); ctx.fillRect(W / 2 + lw / 2, 0, W, H); }
      ctx.fillStyle = rgba('#FFFFFF', 1 - open * 0.8); ctx.fillRect(W / 2 - lw / 2, H / 2 - bh / 2 - 4, lw, Math.min(bh, 10) + 4);
      ctx.fillStyle = rgba('#DDEEFF', 0.6 * (1 - open)); ctx.fillRect(0, H / 2 - bh / 2, W, bh);
      ctx.restore();
      glow(540, 960, 400 * (1 - open) + 50, '#BFE0FF', 0.7 * (1 - open));
    }
    // the curtains close in over the last beat (the title screen opens from them)
    if (t > 3.18) { const k = clamp((t - 3.18) / 0.46); curtains(t, lerp(1.05, 0, easeIn(k)), { vy: lerp(-260, 0, easeOut(k)) }); }
    crt(t);
  }

  // =================================================================================================
  // Shot 2 (3.64 – 7.27): the title screen between tinsel curtains.
  // =================================================================================================
  function title(t, lt) {
    const fill = clamp((t - 6.3636) / 0.2) * (t < 7.27 ? 1 : 0);     // the tom fill
    const shk = fill ? shakeXY(t, 6.3636 + Math.floor((t - 6.3636) / (B / 2)) * (B / 2), 10, 0.2) : [0, 0];
    camBegin(540 - shk[0], 960 - shk[1], lerp(1.06, 1, easeOut(clamp(lt / 3))) * (1 + 0.008 * pulse(t, 6)));
    stage(t, { moonX: 540, moonY: 990, moonR: 175 });
    glow(540, 990, 420, '#FFF3B0', 0.18 * pulse(t, 4));
    spot(540, 120, 540, 1390, 60, 360, '#FFF3C0', 0.18 + 0.1 * pulse(t, 4));
    // Zena: waiting, then raises the mic on the last bar
    const zp = t < 5.4545 ? 'sway' : 'sing';
    member(t, 0, 540, 1405, 14, { pose: zp, lean: leanAt(t) });
    // the chorus peeking out from the curtains on the tom hits
    bends(t, 540, 1110, { from: 3.6, w: 170, gap: 120 });
    // count-in dots, one goes out per beat of the last bar
    if (t >= 5.4545 - 0.2) {
      const left = 4 - Math.max(0, Math.floor((t - 5.4545) / B + 1e-6));
      for (let i = 0; i < 4; i++) {
        const on = i < left, x = 540 - 150 + i * 100;
        ctx.fillStyle = KR.ink; ctx.fillRect(x - 26, 1500 - 26, 52, 52);
        ctx.fillStyle = on ? (i === left - 1 ? KR.yellow : KR.pink) : 'rgba(255,79,163,0.2)'; ctx.fillRect(x - 20, 1500 - 20, 40, 40);
        if (on) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 20, 1500 - 20, 12, 12); }
      }
    }
    // curtains: part to a gap, jiggle on the fill
    const open = lerp(0, 0.58, easeOut(clamp(lt / 0.5)));
    const shift = Math.sin(t * 38) * 14 * fill;
    curtains(t, open, { ripple: 4 + fill * 16, shift, flash: pulse(t, 5) * 0.5 + fill * pulse2(t, 6) * 0.4, valance: false });
    // the chorus peek out from behind the curtains, one per tom hit
    const edge = lerp(W / 2 + 8, 64, open);
    ctx.save(); ctx.beginPath(); ctx.rect(edge + shift + 4, 0, W - 2 * edge - 8, H); ctx.clip();
    PEEK.forEach(([x, y, lean, pt], i) => {
      if (t < pt) return;
      const k = elasticOut(clamp((t - pt) / 0.35)), side = x < 540 ? 1 : -1;
      member(t, i + 1, x - side * 50 * (1 - clamp(k)), y, 12, { pose: 'cheer', lean: lean * k, flip: side < 0 });
    });
    ctx.restore();
    valance(t, pulse(t, 5) * 0.5, {});
    camEnd();
    twinkles(t, 16, 71, 0, 250, W, 600, 7);
    kTitle(t, 3.95, 7.27, '[추석 특집]\n제나의 트로트 메들리', ['노래 · 제나 (리센느 막내)', '코러스 · 리센느 언니들'], { y: 470, size: 98, colors: [KR.yellow, '#FFFFFF'], sub: 48 });
    // tom-fill sfx
    [6.3636, 6.5909, 6.8182, 7.0455].forEach((pt, i) => sfx(['둥', '둥', '둥', '두둥!'][i], [330, 750, 340, 740][i], [960, 900, 1000, 940][i], 70 + i * 8, [KR.cyan, KR.yellow, KR.pink, '#FFFFFF'][i], t - pt, { life: 0.4, rot: i % 2 ? 0.15 : -0.15 }));
    flash(0.6 * (1 - clamp(lt / 0.15)), '#FFFFFF');
    crt(t);
  }

  chapter('intro', 0, 7.27, [[0, boot], [3.6364, title]]);
})();
