// The cinematic layer for the career film. Loaded after caption.js, it replaces the finish every
// frame gets and restyles the captions, so the chapters only paint the picture.
//
// Every frame now gets: letterbox bars (the picture is 2.35:1 between them), a bloom that lets
// bright things glow into the dark, a colour grade (cool shadows, warm highlights), stronger
// moving film grain, and the vignette. Captions and the year live in the black bars, as in a
// film; narration is set in a serif in the picture.
//
// Tools for the chapters, on top of core.js:
//   narration(t, t0, t1, text, { y, size, color })  serif lines ("\n" breaks), revealed softly
//   quote(t, t0, t1, text, who)                     a large quotation with its source under it
//   caption(t, t0, t1, title, sub) / yearTag(t, t0, year) / bigFact(...)  (same calls as before)
//   withBlur(px, fn)             paint fn() out of focus (depth of field for back layers)
//   godRays(t, x, y, angle, spread, len, color, alpha)   light shafts from a window or a lamp
//   dust(t, x, y, w, h, n, color)                        motes drifting through a light
//   bokeh(t, n, colors, y0, y1, blurPx)                  out-of-focus lights (crowds, cities)
//   handheld(t, amt)             [dx, dy, rot] of a gentle hand-held camera; add to camBegin
//   flare(x, y, size, color)     a small lens flare on a bright light

/* eslint-disable no-unused-vars */
FONT.serif = '"Nanum Myeongjo"';
const LETTERBOX = 132;           // height of each black bar at full closure of the curtain

function barHeight(t) {
  const open = easeInOut(clamp(t / 2.2));                          // the bars close in from the full frame
  const close = easeInOut(clamp((t - (SONG.length - 1.6)) / 1.4)); // and come back to black at the end
  return lerp(H / 2, LETTERBOX, open) + (H / 2 - LETTERBOX) * close;
}

// ---- the finish ---------------------------------------------------------------------------------

let bloomCanvas = null;
const basePaperFinish = paperFinish;
paperFinish = function cinemaFinish(t) {
  const w = cv.width, h = cv.height;
  // bloom: a small, thresholded, blurred copy screened back over the frame
  if (!bloomCanvas) { bloomCanvas = document.createElement('canvas'); }
  bloomCanvas.width = Math.round(w / 4); bloomCanvas.height = Math.round(h / 4);
  const b = bloomCanvas.getContext('2d');
  b.filter = 'brightness(0.7) contrast(3) blur(3px)';
  b.drawImage(cv, 0, 0, bloomCanvas.width, bloomCanvas.height);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.32;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bloomCanvas, 0, 0, w, h);
  ctx.restore();
  // the grade: cool shadows, warm highlights
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = lgrad(0, 0, 0, H, [[0, 'rgba(40,80,110,0.35)'], [0.6, 'rgba(120,90,140,0.12)'], [1, 'rgba(255,150,90,0.22)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // grain and vignette (the shared finish), then a second, coarser grain pass
  basePaperFinish(t);
  if (grainCanvas) {
    ctx.save(); ctx.setTransform(SCALE * 2, 0, 0, SCALE * 2, 0, 0);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.08;
    const f = Math.floor(t * 24);
    ctx.translate(-Math.floor(hash(f, 7) * 512), -Math.floor(hash(f, 8) * 512));
    ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512);
    ctx.restore();
  }
  // the bars, drawn last so nothing paints over them but the captions
  const bh = barHeight(t);
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = '#050407';
  ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  ctx.restore();
  for (const f of barCaptions) f();
  barCaptions.length = 0;
};

// Captions are queued by the chapter and painted after the bars, so they sit in them.
const barCaptions = [];

caption = function (t, t0, t1, title, sub) {
  const k = Math.min(easeOut(clamp((t - t0) / 0.5)), clamp((t1 - t) / 0.4));
  if (k <= 0) return;
  barCaptions.push(() => {
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = k;
    const y = H - LETTERBOX / 2;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = BIO.lime; ctx.fillRect(110, y - 34, 5, 68);
    ctx.font = `44px ${FONT.bold}`; ctx.fillStyle = '#FFFFFF';
    ctx.fillText(title, 134, sub ? y - 15 : y);
    if (sub) { ctx.font = `30px ${FONT.round}`; ctx.fillStyle = '#B9B3C8'; ctx.fillText(sub, 134, y + 22); }
    ctx.restore();
  });
};

yearTag = function (t, t0, year, o = {}) {
  const k = clamp((t - t0) / 0.6);
  if (k <= 0) return;
  barCaptions.push(() => {
    ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = easeOut(k) * (o.alpha ?? 1);
    ctx.font = `72px ${FONT.bold}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    ctx.fillStyle = o.color || BIO.lime;
    ctx.fillText(year, W - 110 + (1 - easeOut(k)) * 60, LETTERBOX / 2 + 4);
    ctx.restore();
  });
};

bigFact = function (t, t0, t1, text, x = W / 2, y = H / 2, size = 96, o = {}) {
  const k = Math.min(clamp((t - t0) / 0.5), clamp((t1 - t) / 0.4));
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = k;
  ctx.font = `${size}px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30;
  ctx.fillStyle = o.color || '#FFFFFF';
  const s = 1 + 0.04 * (1 - easeOut(clamp((t - t0) / 0.8)));
  ctx.translate(x, y); ctx.scale(s, s); ctx.fillText(text, 0, 0);
  ctx.restore();
};

/** Serif narration, revealed a character at a time. text may contain "\n". */
function narration(t, t0, t1, text, o = {}) {
  const out = clamp((t1 - t) / 0.6);
  if (t < t0 || out <= 0) return;
  const size = o.size || 56, lines = text.split('\n');
  const y0 = (o.y ?? H / 2) - (lines.length - 1) * size * 0.8;
  const per = o.per ?? 0.045;              // seconds per character
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.font = `${size}px ${FONT.serif}`; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 24;
  let n = 0;
  lines.forEach((line, li) => {
    const chars = [...line];
    const widths = chars.map(c => ctx.measureText(c).width);
    let x = (o.x ?? W / 2) - widths.reduce((a, b) => a + b, 0) / 2;
    const y = y0 + li * size * 1.6;
    chars.forEach((c, i) => {
      const a = clamp((t - t0 - n * per) / 0.35) * out;
      n++;
      if (a > 0) {
        ctx.globalAlpha = a;
        ctx.fillStyle = o.color || '#F4EFE6';
        ctx.fillText(c, x, y + (1 - a) * 10);
      }
      x += widths[i];
    });
  });
  ctx.restore();
}

/** A quotation, large, with its source underneath. */
function quote(t, t0, t1, text, who) {
  narration(t, t0, t1, `“${text}”`.replace('\n', '\n'), { size: 52, y: H / 2 - 40, per: 0.035 });
  const k = Math.min(clamp((t - t0 - 1.2) / 0.6), clamp((t1 - t) / 0.6));
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = k; ctx.font = `32px ${FONT.round}`; ctx.fillStyle = '#B9B3C8';
  ctx.textAlign = 'center'; ctx.fillText(`— ${who}`, W / 2, H / 2 + 60 + (text.split('\n').length - 1) * 42);
  ctx.restore();
}

// ---- realism helpers ----------------------------------------------------------------------------

function withBlur(px, fn) {
  ctx.save(); ctx.filter = `blur(${px * SCALE}px)`; fn(); ctx.restore();
}

function godRays(t, x, y, angle, spread, len, color, alpha = 0.25) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 7; i++) {
    const a = angle + (i / 6 - 0.5) * spread, flick = 0.7 + 0.3 * Math.sin(t * 0.7 + i * 1.9);
    const w = spread * len * (0.08 + hash(i, 3) * 0.1);
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const g = ctx.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, rgba(color, alpha * flick)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(ex + Math.cos(a + Math.PI / 2) * w, ey + Math.sin(a + Math.PI / 2) * w);
    ctx.lineTo(ex - Math.cos(a + Math.PI / 2) * w, ey - Math.sin(a + Math.PI / 2) * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function dust(t, x, y, w, h, n = 60, color = '#FFF3D6') {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const px = x + frac(hash(i, 1) + t * 0.01 * (hash(i, 2) - 0.5)) * w;
    const py = y + frac(hash(i, 3) - t * 0.012 * (0.3 + hash(i, 4))) * h;
    const tw = 0.4 + 0.6 * Math.sin(t * (0.8 + hash(i, 5)) + i);
    ctx.globalAlpha = 0.5 * tw;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 1 + hash(i, 6) * 2.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function bokeh(t, n, colors, y0, y1, blurPx = 6) {
  withBlur(blurPx, () => {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const x = hash(i, 11) * W + Math.sin(t * 0.3 + i) * 12, y = lerp(y0, y1, hash(i, 12));
      const r = 6 + hash(i, 13) * 22;
      ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * (0.5 + hash(i, 14)) + i));
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  });
}

function handheld(t, amt = 1) {
  const n = (f, p) => Math.sin(t * f + p) + 0.5 * Math.sin(t * f * 2.3 + p * 1.7);
  return [n(0.9, 1) * 6 * amt, n(0.7, 4) * 4 * amt, n(0.5, 2) * 0.004 * amt];
}

function flare(x, y, size = 1, color = '#FFE7B0') {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  glow(x, y, 140 * size, color, 0.5);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = lgrad(x - 500 * size, y, x + 500 * size, y, [[0, rgba(color, 0)], [0.5, rgba(color, 0.9)], [1, rgba(color, 0)]]);
  ctx.fillRect(x - 500 * size, y - 1.5 * size, 1000 * size, 3 * size);
  const dx = W / 2 - x, dy = H / 2 - y;
  [[0.4, 18], [0.7, 30], [1.3, 14]].forEach(([k, r], i) => {
    ctx.globalAlpha = 0.12; ctx.fillStyle = i === 1 ? '#8FD3FF' : color;
    ctx.beginPath(); ctx.arc(x + dx * k * 2, y + dy * k * 2, r * size, 0, TAU); ctx.fill();
  });
  ctx.restore();
}
