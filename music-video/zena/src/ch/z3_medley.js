// z3_medley (21.82 – 36.36) · 3 · 선곡표
//
// The karaoke machine's song list. Every bar (1.818 s, on the downbeat) a new song card slams in
// like a rolodex flip: the LED number scrambles and lands, the title drops, the singer's name
// underneath; a queue of seven chips shows where we are. Each card has its own curtain colour and
// its own Zena pose (인사 = everybody bows, 빵빵 = the honk shake, 녹아버려요 = the title melts ...).
// Pixel notes pop out of the mic on every melody note, a 꺾기 squiggle on the long ones.
// 34.55 the snare roll: all seven cards pile up into a stack (촤르르), 35.45 the whole screen
// spins and zooms in, white-out into the chorus drop.
//
// Shared with z4_encore.js through window.Z34.
(() => {
  const BAR = 1.8181818181818181, T3 = 21.8182, ROLL = 34.5455, DROP = 36.3636;

  // ---- the cast (Z12's colours when the stage chapter exposes them) ------------------------------

  const FALL = [
    { hair: '#2B1622', outfit: KR.pink, trim: KR.gold, legs: '#2A2440', shoes: '#FFFFFF' },            // 제나
    { hair: '#5A3222', outfit: KR.sky, trim: KR.white, legs: '#1E2450', shoes: '#FFFFFF', long: true },
    { hair: '#1C1830', outfit: KR.purple, trim: KR.yellow, legs: '#2A2440', shoes: '#FFFFFF' },
    { hair: '#8A4A2A', outfit: '#20C08A', trim: KR.white, legs: '#1E3440', shoes: '#FFFFFF', long: true },
    { hair: '#3A2A50', outfit: KR.red, trim: KR.gold, legs: '#2A2440', shoes: '#FFFFFF' },
  ];
  const JANG = { hair: '#3A2016', outfit: '#F2B822', trim: '#FFF6C8', legs: '#D99A12', shoes: '#FFE14D', long: true };
  const KEYS = ['hair', 'outfit', 'trim', 'legs', 'shoes', 'long'];
  const clean = c => {
    const o = {};
    if (c && typeof c === 'object') for (const k of KEYS) if (c[k] !== undefined) o[k] = c[k];
    return o;
  };
  /** Colours of cast member i (0 = Zena, 1-4 the chorus). */
  function look(i) {
    const z = window.Z12;
    let c = null;
    try {
      if (z) {
        const list = Array.isArray(z.cast) ? z.cast : Array.isArray(z.CAST) ? z.CAST : null;
        if (list) c = list[i];
        else if (z.cast && typeof z.cast === 'object') c = i === 0 ? (z.cast.zena || z.cast[0]) : (z.cast.chorus ? z.cast.chorus[i - 1] : z.cast[i]);
      }
    } catch (e) { c = null; }
    return { ...FALL[i], ...clean(c) };
  }
  function jangLook() {
    const z = window.Z12;
    return { ...JANG, ...clean(z && (z.jang || z.JANG)) };
  }

  // ---- little pixel things -------------------------------------------------------------------------

  /** Blit a pixel pattern ('X' cells) centred at (x, y). */
  function pix(rows, x, y, s, color) {
    ctx.fillStyle = color;
    const h = rows.length, w = rows[0].length;
    rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === 'X') ctx.fillRect(x + (c - w / 2) * s, y + (r - h / 2) * s, s + 0.5, s + 0.5); });
  }
  const NOTE = ['...XX.', '...XXX', '...X.X', '...X..', '.XXX..', 'XXXX..', '.XX...'];
  const STAR = ['..X..', '..X..', 'XXXXX', '..X..', '..X..'];

  /** A sprite that can bow: the upper body folds down (squash) and the fringe hides the face. */
  function person(x, y, s, o, bowK = 0) {
    if (bowK <= 0.001) { sprite(x, y, s, o); return; }
    const hipY = y - 7 * s;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 20 * s, hipY, 40 * s, 8 * s); ctx.clip();
    sprite(x, y, s, o); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x - 20 * s, y - 40 * s, 40 * s, 33 * s); ctx.clip();
    ctx.translate(x, hipY); ctx.scale(1, 1 - 0.34 * bowK); ctx.translate(-x, -hipY);
    sprite(x, y, s, { ...o, pose: 'bow' });
    // bowed: we see the top of the head, the face goes under the hair
    ctx.fillStyle = o.hair || '#2A1B2E';
    ctx.globalAlpha *= clamp(bowK * 1.6);
    ctx.fillRect(x - 5 * s, y - 18.5 * s, 10 * s, 6.5 * s);
    ctx.restore();
  }

  /**
   * The five in a line (the stage chapter ends with the chorus in the front row): Zena in the middle.
   * o: { y, px, bpx, xs (chorus x), by (chorus feet y), pose, cpose, poses (chorus), bow(i), jump(i), zenaX }
   */
  function troupe(t, o = {}) {
    const z = window.Z12;
    const y = o.y ?? 1405, s = o.px ?? 15, bs = o.bpx ?? 13;
    const xs = o.xs || (z && Array.isArray(z.FRONT) && z.FRONT.length === 4 ? z.FRONT.map(p => p[0]) : [112, 322, 758, 968]);
    const jump = o.jump || (() => 0);
    const shadow = (x, yy, q) => { ctx.fillStyle = 'rgba(10,6,30,0.35)'; ctx.fillRect(x - 6 * q, yy - q * 0.6, 12 * q, q); };
    xs.forEach((x, j) => {
      const i = j + 1, lk = look(i), fy = o.by ?? y;
      const jy = jump(i) * 60;
      const pose = (o.poses && o.poses[j]) || o.cpose || 'clap';
      shadow(x, fy, bs);
      person(x, fy - jy, bs, { t: t + j * 0.11, ...lk, pose, bob: 1, flip: x > W / 2, mic: false }, o.bow ? o.bow(i) : 0);
    });
    const zl = look(0), zx = o.zenaX ?? W / 2;
    shadow(zx, y, s);
    person(zx, y - jump(0) * 70, s, { t, ...zl, pose: o.pose || 'sing', bob: 1, mic: true }, o.bow ? o.bow(0) : 0);
  }

  /** The stage floor: a gold edge with footlights blinking on the beat; dark below. */
  function stageFloor(t, y = 1415, tone = '#3A1540') {
    ctx.fillStyle = lgrad(0, y, 0, H, [[0, tone], [1, '#07051A']]);
    ctx.fillRect(0, y, W, H - y);
    ctx.fillStyle = KR.gold; ctx.fillRect(0, y, W, 12);
    ctx.fillStyle = '#FFF1A8'; ctx.fillRect(0, y, W, 4);
    ctx.fillStyle = '#8A5A10'; ctx.fillRect(0, y + 12, W, 6);
    const b = beatN(t);
    for (let i = 0; i < 18; i++) {
      const x = 30 + i * 60, on = (i + b) % 2 === 0;
      ctx.fillStyle = on ? '#FFE14D' : '#6A4A20';
      ctx.fillRect(x - 10, y + 26, 20, 12);
      if (on) { ctx.fillStyle = rgba('#FFE14D', 0.18); ctx.fillRect(x - 22, y + 20, 44, 24); }
    }
  }

  /** Tinsel curtains on both sides and a scalloped valance across the top. */
  function curtains(t, cols, o = {}) {
    const w = o.w ?? 120, open = o.open ?? 1, h = o.h ?? 1415;
    const cw = w + (1 - open) * (W / 2 - w);
    tinsel(t, -6, 0, cw, h, cols);
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); tinsel(t + 0.5, -6, 0, cw, h, cols); ctx.restore();
    // valance
    const c0 = cols[0];
    ctx.fillStyle = mix(c0, '#000000', 0.45); ctx.fillRect(0, 0, W, 64);
    for (let i = 0; i < 12; i++) {
      const x = i * 90 + 45;
      ctx.fillStyle = mix(c0, '#000000', 0.25);
      ctx.beginPath(); ctx.arc(x, 60, 45, 0, Math.PI); ctx.fill();
      ctx.fillStyle = frac(t * 2 + i * 0.25) < 0.5 ? '#FFFFFF' : KR.yellow;
      ctx.fillRect(x - 5, 96, 10, 10);
    }
    ctx.fillStyle = mix(c0, '#FFFFFF', 0.4); ctx.fillRect(0, 60, W, 6);
  }

  /** Marquee bulbs around a rectangle, chasing. */
  function bulbs(t, x, y, w, h, gap = 44, cols = [KR.yellow, '#FFFFFF']) {
    const per = 2 * (w + h), n = Math.floor(per / gap), ph = Math.floor(t * 10);
    for (let i = 0; i < n; i++) {
      let d = i * per / n, bx, by;
      if (d < w) { bx = x + d; by = y; } else if ((d -= w) < h) { bx = x + w; by = y + d; }
      else if ((d -= h) < w) { bx = x + w - d; by = y + h; } else { d -= w; bx = x; by = y + h - d; }
      const on = (i + ph) % 3 !== 0;
      ctx.fillStyle = on ? cols[i % cols.length] : '#5A3A20';
      ctx.fillRect(bx - 7, by - 7, 14, 14);
      if (on) { ctx.fillStyle = rgba(cols[i % cols.length], 0.25); ctx.fillRect(bx - 13, by - 13, 26, 26); }
    }
  }

  /** The screen finish: Z12's CRT (scanlines, band, vignette) or plain scanlines. */
  function crt(t, o = {}) {
    const z = window.Z12;
    if (z && typeof z.crt === 'function') { try { z.crt(t, { a: o.a ?? 0.1 }); return; } catch (e) { /* fall through */ } }
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = 'rgba(0,0,20,0.08)';
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = rgrad(W / 2, H / 2, H * 0.45, H * 0.78, [[0, 'rgba(0,0,10,0)'], [1, 'rgba(0,0,10,0.4)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /** The machine's little HUD strip: the song number in LED (Z12's strip when there is one). */
  function hud(t, o = {}) {
    const z = window.Z12;
    if (z && typeof z.hud === 'function') { try { z.hud(t, { y: o.y ?? 180, alpha: o.alpha }); return; } catch (e) { /* fall through */ } }
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = o.alpha ?? 1;
    const y = o.y ?? 180;
    rrect(60, y - 36, 260, 72, 14, { fill: 'rgba(6,8,40,0.72)', stroke: rgba(KR.cyan, 0.7), lw: 4 });
    ledDigits('0918', 86, y - 22, 44, KR.red);
    ctx.restore();
  }

  /** The backdrop: Z12's stage (karaoke scenery + floating stage, top at stageY) or the kit's own. */
  function scenery(t, o = {}) {
    const z = window.Z12;
    if (z && typeof z.stage === 'function') { try { z.stage(t, o); return; } catch (e) { /* fall through */ } }
    karaokeBg(t, { moonX: o.moonX ?? 560, moonY: o.moonY ?? 560, moonR: o.moonR ?? 190, seaY: o.seaY ?? 1150, top: o.top, mid: o.mid, low: o.low, moon: o.moon, sea: o.sea });
    if (o.platform !== false) stageFloor(t, (o.stageY ?? 1300) + 100, '#3A1458');
  }

  /** Side curtains + valance in `cols` (Z12's tinsel when there is one). */
  function drapes(t, cols, open = 1, o = {}) {
    const z = window.Z12;
    if (z && typeof z.curtains === 'function') { try { z.curtains(t, open, { colors: cols, ...o }); return; } catch (e) { /* fall through */ } }
    curtains(t, cols, { open, w: 64 });
  }

  /** Text width at a size, so a title can be fitted. */
  function fitSize(txt, size, maxW, font = FONT.bold) {
    ctx.save(); ctx.font = `${size}px ${font}`; const w = ctx.measureText(txt).width; ctx.restore();
    return w > maxW ? size * maxW / w : size;
  }

  /** A burst of pixel sparks that fades by `life` (shorter than pixelFirework, for the ending). */
  function pburst(t, t0, x, y, r, color, life = 1.0, n = 20) {
    const age = t - t0; if (age < 0 || age > life) return;
    const k = easeOut(clamp(age / (life * 0.6))), fade = 1 - clamp((age - life * 0.5) / (life * 0.5));
    ctx.save(); ctx.globalAlpha *= fade; ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + hash(i, 3) * 0.2, rr = r * k * (0.7 + 0.3 * hash(i, t0 * 10));
      for (let j = 0; j < 3; j++) {
        const q = rr * (1 - j * 0.13);
        ctx.fillRect(Math.round((x + Math.cos(a) * q) / 8) * 8, Math.round((y + Math.sin(a) * q + age * age * 50) / 8) * 8, 8, 8);
      }
    }
    ctx.restore();
  }

  // ---- dot-matrix LED text (for the view board and 앵콜) ------------------------------------------

  const dotCache = new Map();
  /** The lit cells of `txt` rasterised `rows` cells tall (cached). {w, h, pts: [[c, r], ...]} */
  function dotMask(key, rows, draw) {
    const k = key + '|' + rows;
    if (dotCache.has(k)) return dotCache.get(k);
    const c = document.createElement('canvas');
    c.width = rows * 8; c.height = rows + 4;
    const g = c.getContext('2d');
    let w;
    if (typeof draw === 'function') w = draw(g, rows);
    else {
      g.font = `${Math.round(rows * 1.05)}px ${draw || FONT.bold}`; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF';
      w = Math.ceil(g.measureText(key).width) + 2;
      g.fillText(key, 1, rows / 2 + 2);
    }
    const img = g.getImageData(0, 0, c.width, c.height).data, pts = [];
    for (let r = 0; r < c.height; r++) for (let cc = 0; cc < Math.min(w, c.width); cc++) if (img[(r * c.width + cc) * 4 + 3] > 110) pts.push([cc, r]);
    const m = { w, h: c.height, pts };
    dotCache.set(k, m);
    return m;
  }
  /** Paint cells as square LEDs: pts in cell units, origin (x, y), pitch p, one glowing fill. */
  function dotsPaint(cells, x, y, p, color, glowR = 14) {
    if (!cells.length) return;
    ctx.save(); ctx.beginPath();
    for (const [c, r] of cells) ctx.rect(x + c * p, y + r * p, p * 0.78, p * 0.78);
    ctx.shadowColor = color; ctx.shadowBlur = glowR; ctx.fillStyle = color; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = rgba('#FFFFFF', 0.35); ctx.fill();
    ctx.restore();
  }
  let dimPat = null;
  /** The unlit LED grid behind dot text. */
  function dotGrid(x, y, w, h, p, color = '#3A1A12') {
    if (!dimPat || dimPat.p !== p || dimPat.c !== color) {
      const c = document.createElement('canvas'); c.width = c.height = Math.round(p * 4);
      const g = c.getContext('2d'); g.fillStyle = color;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * p, j * p, p * 0.78, p * 0.78);
      dimPat = { p, c: color, pat: ctx.createPattern(c, 'repeat') };
    }
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = dimPat.pat; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  /** Dot text centred at (cx, cy), `rows` cells tall, pitch p. o.shift(c, r) -> extra rows (for rolling). */
  function dotText(txt, cx, cy, rows, p, color, o = {}) {
    const m = dotMask(txt, rows, o.font);
    const x = cx - m.w * p / 2, y = cy - m.h * p / 2;
    dotsPaint(m.pts, x, y, p, color, o.glow ?? 14);
    return m;
  }

  /**
   * The 만 counter as an LED odometer: `v` (in 만, may be fractional while rolling) with "만 회".
   * Three digit wheels roll; the dim cells of the unlit wheels stay visible like a real board.
   */
  function manCols(rows) {
    const dw = Math.max(...[...'0123456789'].map(d => dotMask(d, rows).w)) + 1;
    return dw * 3 + 3 + dotMask('만', rows).w + Math.round(rows * 0.3) + dotMask('회', rows).w;
  }
  function manBoard(v, cx, cy, rows, p, color = '#FFB020') {
    const dm = [...'0123456789'].map(d => dotMask(d, rows));
    const dw = Math.max(...dm.map(m => m.w)) + 1;
    const man = dotMask('만', rows), hoe = dotMask('회', rows);
    const total = manCols(rows);
    const x0 = cx - total * p / 2, y0 = cy - (rows + 4) * p / 2;
    const lit = [], dim = [];
    const H0 = rows + 4;
    for (let k = 0; k < 3; k++) {
      const pw = Math.pow(10, 2 - k), xv = v / pw;
      const d = Math.floor(xv + 1e-6) % 10;
      // a wheel only turns while every wheel to its right is passing 9 -> 0
      const lower = v - Math.floor(v / pw + 1e-9) * pw;
      const roll = k === 2 ? v - Math.floor(v + 1e-9) : clamp(lower - (pw - 1));
      const off = Math.round(ease(clamp(roll)) * H0);
      const shown = k < 2 && v < pw - 1e-6 && off === 0;           // leading zeros stay dark
      const cx0 = k * dw;
      for (const [dd, sh] of [[d, -off], [(d + 1) % 10, H0 - off]]) {
        for (const [c, r] of dm[dd].pts) {
          const rr = r + sh; if (rr < 0 || rr >= H0) continue;
          (shown ? dim : lit).push([cx0 + c + Math.floor((dw - 1 - dm[dd].w) / 2), rr]);
        }
      }
    }
    const mx = dw * 3 + 3;
    for (const [c, r] of man.pts) lit.push([mx + c, r]);
    const hx = mx + man.w + Math.round(rows * 0.3);
    for (const [c, r] of hoe.pts) lit.push([hx + c, r]);
    dotsPaint(dim, x0, y0, p, '#5A2A18', 0);
    dotsPaint(lit, x0, y0, p, color, 18);
  }

  // ---- the song list ------------------------------------------------------------------------------

  const SONGS = [
    { no: '01', title: '용두산 엘레지', by: '고봉산', cur: [KR.gold, '#FFF1A8', '#E0A020'], bg: ['#0B0F3A', '#1C2A8A', '#3A1B6E'], pose: 'sing', cpose: 'clap', fx: '쿵짝!', edge: KR.pink },
    { no: '02', title: '인사', by: null, cur: [KR.pink, '#FFC2E0', '#D8307E'], bg: ['#1A0B3A', '#4A1E8A', '#6A1B6E'], pose: 'stand', cpose: 'stand', fx: '꾸벅!', edge: KR.purple },
    { no: '03', title: '빵빵', by: '박상철', cur: [KR.red, '#FFB0A0', '#C01830'], bg: ['#2A0818', '#8A1E3A', '#4A0B2E'], pose: 'dance', cpose: 'dance', fx: '빵! 빵!', edge: KR.red },
    { no: '04', title: '내 나이가 어때서', by: '오승근', cur: ['#20C08A', '#B8FFD8', '#10805A'], bg: ['#06202A', '#0E6A7A', '#1A2B5E'], pose: 'sway', cpose: 'sway', fx: '얼쑤!', edge: '#20C08A' },
    { no: '05', title: '녹아버려요', by: '박지현', cur: ['#FF7FC0', '#FFFFFF', '#FFB0DA'], bg: ['#2A0B3A', '#A0307A', '#5A1B6E'], pose: 'sway', cpose: 'clap', fx: '스르르~', edge: KR.pink },
    { no: '06', title: '어머나', by: '장윤정', cur: [KR.purple, '#D8C0FF', '#5A2AC0'], bg: ['#140A3A', '#5A2AAA', '#3A1B6E'], pose: 'cheer', cpose: 'cheer', fx: '어머나!', edge: KR.purple },
    { no: '07', title: '초혼', by: '장윤정', cur: ['#C0102A', '#FF8080', '#700818'], bg: ['#12040E', '#5A0A1E', '#2A0414'], pose: 'sing', cpose: 'sway', fx: '쿵!', edge: KR.red },
  ];
  const cardT = i => T3 + i * BAR;

  /** One song card, centred on (0, 0) in the current transform. i = song, lt = time since it landed. */
  function songCard(t, i, lt, o = {}) {
    const S = SONGS[i], w = 900, h = 420;
    // frame
    rrect(-w / 2 + 10, -h / 2 + 14, w, h, 26, { fill: rgba('#000010', 0.55), stroke: null });
    rrect(-w / 2, -h / 2, w, h, 26, { fill: lgrad(0, -h / 2, 0, h / 2, [[0, '#1A2A9A'], [0.55, '#0E1760'], [1, '#080C3A']]), stroke: KR.ink, lw: 10 });
    rrect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 16, { fill: null, stroke: mix(S.edge, '#FFFFFF', 0.25), lw: 6 });
    bulbs(t, -w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 46);
    // the LED number: scrambles for a moment, then lands
    const scr = lt < 0.16;
    const num = scr ? String(Math.floor(hash(i, Math.floor(lt * 60)) * 90) + 10) : S.no;
    rrect(-150, -h / 2 + 34, 300, 150, 14, { fill: '#05030E', stroke: '#2A2A48', lw: 5 });
    ledDigits(num, 0, -h / 2 + 48, 118, scr ? KR.yellow : KR.red, { align: 'center' });
    // twinkling pixel notes either side of the number
    for (const sd of [-1, 1]) {
      const b = hop(t + (sd > 0 ? 0.22 : 0));
      pix(NOTE, sd * 270, -h / 2 + 104 - b * 16, 10, sd > 0 ? KR.cyan : KR.yellow);
      pix(STAR, sd * 370, -h / 2 + 80, 7, frac(t * 3 + sd) < 0.5 ? '#FFFFFF' : KR.yellow);
    }
    // the title (each song does its own little thing)
    const ty = S.by ? 64 : 92, size = fitSize(S.title, 124, 800);
    const drop = backOut(clamp((lt - 0.04) / 0.22));
    ctx.save(); ctx.translate(0, ty); ctx.scale(drop, drop);
    let rot = 0, dx = 0, sy = 1;
    if (i === 1) { const bk = kf(lt, [[0.3, 0], [0.5, 1], [1.0, 1], [1.2, 0]]); sy = 1 - 0.18 * bk; rot = 0; }
    if (i === 2) dx = Math.sin(t * 60) * 10 * pulse(t, 9);
    if (i === 3) rot = Math.sin(Math.PI * beatOf(t)) * 0.05;
    if (i === 0) dx = Math.sin(t * 3) * 6;
    ctx.translate(dx, 0); ctx.rotate(rot); ctx.scale(1, sy);
    if (i === 4) { // 녹아버려요: yellow drips run down from the letters
      ctx.save(); ctx.fillStyle = KR.yellow;
      for (let k = 0; k < 11; k++) {
        const x = -size * 2.3 + k * size * 0.46 + hash(k, 5) * 20, len = clamp((lt - 0.3 - hash(k, 6) * 0.5) / 0.9) * (30 + hash(k, 7) * 70);
        if (len <= 0) continue;
        ctx.fillRect(Math.round(x / 8) * 8, size * 0.28, 16, len); ctx.fillRect(Math.round(x / 8) * 8 - 4, size * 0.28 + len, 24, 16);
      }
      ctx.restore();
    }
    letter(S.title, 0, 0, size, i === 6 ? '#FFFFFF' : KR.yellow, { color2: KR.ink, lw: size * 0.2, shadow: S.edge });
    ctx.restore();
    if (S.by) {
      const k = clamp((lt - 0.2) / 0.2);
      letter(`원곡 · ${S.by}`, 0, 158, 52, KR.cyan, { font: 'round', lw: 10, pop: k, shadow: '#05030E' });
    }
    if (i === 5) for (let k = 0; k < 6; k++) { // 어머나: hearts pop around the title
      const a = clamp((lt - 0.15 - k * 0.12) / 0.2); if (a <= 0) continue;
      const hx = (k % 2 ? 1 : -1) * (300 + (k >> 1) * 40), hy = -30 + (k >> 1) * 60 - hop(t + k * 0.1) * 14;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(backOut(a), backOut(a)); pixelHeart(0, 0, 7, k % 3 ? KR.pink : KR.red); ctx.restore();
    }
  }

  /** The queue of seven chips under the card: done ones dim, the current one lit, a cursor. */
  function queue(t, cur, y = 1512) {
    ctx.fillStyle = 'rgba(6,8,40,0.72)'; ctx.fillRect(0, y - 44, W, 88);
    ctx.fillStyle = rgba(KR.cyan, 0.6); ctx.fillRect(0, y - 44, W, 3); ctx.fillRect(0, y + 41, W, 3);
    const cw = 96, gap = 16, x0 = W / 2 - (7 * cw + 6 * gap) / 2;
    for (let i = 0; i < 7; i++) {
      const x = x0 + i * (cw + gap), on = i === cur, done = i < cur;
      const lift = on ? 8 * pulse(t, 5) : 0;
      rrect(x, y - 26 - lift, cw, 52, 10, { fill: on ? KR.yellow : done ? '#241A4A' : '#0A0A26', stroke: KR.ink, lw: 5 });
      ledDigits(SONGS[i].no, x + cw / 2, y - 17 - lift, 34, on ? KR.ink : done ? '#8A7AC0' : KR.red, { align: 'center', glow: false });
    }
    if (cur >= 0 && cur < 7) pix(['..X..', '.XXX.', 'XXXXX'], x0 + cur * (cw + gap) + cw / 2, y + 62 - hop(t) * 6, 7, KR.yellow);
  }

  /** Melody: pixel notes pop out of the mic on each note, a 꺾기 squiggle on the long ones. */
  function melody(t, mx, my, o = {}) {
    const tune = (typeof SONG !== 'undefined' && SONG.tune) || [];
    for (let k = 0; k < tune.length; k++) {
      const n = tune[k], age = t - n.t;
      if (age < 0 || age > 1.3 || n.t < (o.from ?? 0) || n.t >= (o.to ?? 99)) continue;
      const u = age / 1.3, side = hash(k, 2) > 0.5 ? 1 : -0.6;
      const x = mx + side * (60 + u * 200) + Math.sin(age * 8 + k) * 14, y = my - 30 - u * 260 - (n.midi - 72) * 6;
      ctx.save(); ctx.globalAlpha *= 1 - clamp((u - 0.6) / 0.4);
      pix(NOTE, x, y, 8, [KR.yellow, KR.cyan, KR.pink, '#FFFFFF'][k % 4]);
      ctx.restore();
    }
    for (const n of tune) {
      if (n.dur < 0.6 || n.t < (o.from ?? 0) || n.t >= (o.to ?? 99)) continue;
      const end = n.t + n.dur + 0.35;
      if (t < n.t || t > end + 0.3) continue;
      ctx.save(); ctx.globalAlpha *= 1 - clamp((t - end) / 0.3);
      bend(t, n.t, (o.bx ?? mx + 90), (o.by ?? my - 80), o.bw ?? 300, o.bc || KR.cyan, { dur: n.dur, lw: 12 });
      ctx.restore();
    }
  }

  // ---- the card shots ------------------------------------------------------------------------------

  const CARD_Y = 650;   // card spans ~440 – 860

  function cardShot(i) {
    return (t, lt) => {
      const S = SONGS[i], t0 = cardT(i);
      const [sx, sy] = shakeXY(t, t0, 18, 0.3);
      camBegin(W / 2 - sx, H / 2 - sy, 1 + 0.035 * Math.exp(-lt * 7), 0);
      scenery(t, { top: S.bg[0], mid: S.bg[1], low: S.bg[2], moonX: 540, moonY: 1000, moonR: 175 });
      const z = window.Z12;
      if (z && typeof z.twinkles === 'function') { try { z.twinkles(t, 16, 70 + i, 0, 400, W, 500); } catch (e) { /* ignore */ } }
      // a spotlight for 초혼
      if (i === 6) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = lgrad(0, 0, 0, 1405, [[0, 'rgba(255,220,180,0)'], [1, 'rgba(255,200,160,0.3)']]);
        polyPath([[470, 0], [610, 0], [740, 1405], [340, 1405]]); ctx.fill(); ctx.restore();
      }
      // fireworks on the downbeat and on beat 3, in the sky either side of the moon
      for (let k = 0; k < 2; k++) {
        const ft = t0 + k * BAR / 2, s2 = i * 2 + k;
        pixelFirework(t, ft, (k ? 800 : 280) + (hash(s2, 1) - 0.5) * 160, 960 + hash(s2, 2) * 80, 110 + hash(s2, 3) * 50, [KR.yellow, KR.cyan, KR.pink, '#FFFFFF'][s2 % 4]);
      }
      // the five
      const bowOf = i === 1 ? (m => kf(lt, [[0.25 + m * 0.05, 0], [0.45 + m * 0.05, 1], [1.2, 1], [1.45, 0]])) : null;
      const jump = m => (i === 2 || i === 5) ? hop(t + m * 0.07) * 0.5 : hop(t) * 0.12 * (m === 0 ? 1 : 0);
      troupe(t, { pose: S.pose, cpose: S.cpose, bow: bowOf, jump });
      if (z && typeof z.bends === 'function') { try { z.bends(t, 540, 1020, { from: T3 - 0.01, w: 190, gap: 150 }); } catch (e) { /* ignore */ } }
      else melody(t, 570, 1175, { from: T3 - 0.01, bc: i === 6 ? '#FF8080' : KR.cyan });
      drapes(t, S.cur, 1, { flash: pulse(t, 5) * 0.6 + 0.4 * Math.exp(-lt * 8) });
      // the previous card flips away behind the new one (rolodex)
      ctx.save(); ctx.translate(W / 2, CARD_Y);
      if (i > 0 && lt < 0.14) {
        const k = lt / 0.14;
        ctx.save(); ctx.translate(0, 210); ctx.scale(1, 1 - k); ctx.translate(0, -210); songCard(t, i - 1, 5, {}); ctx.restore();
      }
      const inK = clamp(lt / 0.12), sc = lt < 0.12 ? inK : 1 + 0.08 * Math.exp(-(lt - 0.12) * 12) * Math.cos((lt - 0.12) * 30);
      ctx.translate(0, -210); ctx.scale(1, sc); ctx.translate(0, 210);
      songCard(t, i, lt);
      ctx.restore();
      queue(t, i);
      // the sound-effect word for this song
      sfx(S.fx, i % 2 ? 250 : 830, 985, 84, [KR.yellow, KR.pink, '#FFFFFF', KR.cyan][i % 4], lt - 0.08, { life: 1.1, rot: i % 2 ? -0.18 : 0.18, color2: KR.ink });
      camEnd();
      kBanner(t, T3, ROLL + 0.25, '오늘의 선곡', { y: 236, bg: S.edge === KR.red ? '#C0102A' : KR.pink });
      // the slam: a quick white pop and an RGB glitch line, like a channel change
      flash(0.45 * Math.exp(-lt * 14));
      if (lt < 0.1) {
        ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 5; k++) { const y = hash(i, k) * H; ctx.fillStyle = rgba(k % 2 ? '#FF3B8A' : '#39E6FF', 0.25); ctx.fillRect(0, y, W, 10 + hash(k, i) * 30); }
        ctx.restore();
      }
      crt(t); hud(t);
    };
  }

  // ---- the snare roll: the pile, the spin -------------------------------------------------------------

  function miniCard(t, i, x, y) {
    const S = SONGS[i], w = 780, h = 100;
    rrect(x - w / 2 + 6, y - h / 2 + 8, w, h, 16, { fill: rgba('#000010', 0.5), stroke: null });
    rrect(x - w / 2, y - h / 2, w, h, 16, { fill: lgrad(0, y - h / 2, 0, y + h / 2, [[0, '#1A2A9A'], [1, '#080C3A']]), stroke: KR.ink, lw: 7 });
    rrect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16, 10, { fill: null, stroke: S.cur[0], lw: 4 });
    rrect(x - w / 2 + 22, y - 34, 130, 68, 8, { fill: '#05030E', stroke: null });
    ledDigits(S.no, x - w / 2 + 87, y - 25, 50, KR.red, { align: 'center' });
    const size = fitSize(S.title, 56, 360);
    letter(S.title, x - w / 2 + 180, y + 2, size, KR.yellow, { align: 'left', lw: 9, shadow: null });
    if (S.by) letter(S.by, x + w / 2 - 30, y + 4, 36, KR.cyan, { align: 'right', font: 'round', lw: 7, shadow: null });
  }

  function roll(t, lt) {
    const S = SONGS[6];
    const spin = easeIn(seg(t, 35.4545, DROP));
    // behind everything, in screen space: a spinning sunburst so the corners are never empty
    fillScreen(lgrad(0, 0, 0, H, [[0, '#12040E'], [0.5, '#5A0A3E'], [1, '#12041E']]));
    ctx.save(); ctx.globalAlpha = 0.35 + 0.4 * spin;
    sunburst(W / 2, 760, '#FF3B8A', '#2A0A40', t * 0.8 + spin * TAU * 1.5, 20, 2200);
    ctx.restore();
    const [sx, sy] = shakeXY(t, ROLL + Math.floor(lt / 0.1136) * 0.1136, 6 + 10 * seg(t, ROLL, DROP), 0.1);
    camBegin(W / 2 - sx, lerp(H / 2, 700, spin) - sy, 1 + 2.6 * spin, -spin * TAU);
    const z = window.Z12;
    if (z && typeof z.platform === 'function') { try { z.platform(t, 1300); } catch (e) { stageFloor(t, 1400, '#3A0A20'); } }
    else stageFloor(t, 1400, '#3A0A20');
    troupe(t, { pose: 'cheer', cpose: 'cheer', jump: m => frac(beatOf(t) * 4 + m * 0.3) < 0.5 ? 0.12 : 0 });
    // the curtains close in a little as the roll builds
    drapes(t, S.cur, 1 - 0.12 * seg(t, ROLL, DROP), { flash: pulse2(t, 6) * 0.5 });
    // the pile: each card whooshes in from alternating sides on the snare 16ths and stacks up
    for (let i = 0; i < 7; i++) {
      const tl = ROLL + 0.04 + i * 0.1136;
      const k = clamp((t - tl) / 0.1);
      if (k <= 0) continue;
      const side = i % 2 ? 1 : -1, x = W / 2 + side * (1 - easeOut(k)) * 1100;
      const land = t - tl - 0.1, bump = land > 0 ? -18 * Math.exp(-land * 16) * Math.cos(land * 40) : 0;
      miniCard(t, i, x, 1020 - i * 104 + bump);
    }
    camEnd();
    // the roll itself, in letters
    const n = Math.floor(lt / 0.2273);
    const age = lt - n * 0.2273;
    kBanner(t, T3, ROLL + 0.25, '오늘의 선곡', { y: 236, bg: '#C0102A' });
    if (lt > 0.25) sfx('두구두구두구', W / 2 + (n % 2 ? 14 : -14), 290, 84 + n * 4, n % 2 ? KR.yellow : '#FFFFFF', age, { life: 0.3, color2: KR.ink });
    kLine(t, ROLL + 0.1, 35.9, '영상은 빠르게 퍼졌다', { y: 1520, size: 74, hold: DROP + 0.4 });
    speedLines(t, W / 2, 760, spin, '#FFFFFF');
    flash(easeIn(seg(t, 36.0, DROP)));
    crt(t); hud(t);
  }

  chapter('medley', 21.82, 36.36, [
    ...SONGS.map((_, i) => [i === 0 ? 21.82 : cardT(i), cardShot(i)]),
    [ROLL, roll],
  ]);

  window.Z34 = {
    look, jangLook, person, troupe, stageFloor, curtains, bulbs, crt, hud, fitSize, pburst, pix, NOTE, STAR,
    dotMask, dotsPaint, dotGrid, dotText, manBoard, manCols, melody, scenery, drapes, SONGS,
  };
})();
