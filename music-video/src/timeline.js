// Chapters, the karaoke, and the one function the renderer calls per frame.

/* eslint-disable no-unused-vars */
const CHAPTERS = [];

/**
 * Register a chapter. shots: [[startTime, fn], ...], each fn(t, lt, dur) paints the whole frame
 * for song time t (lt = time since the shot started, dur = the shot's length). A shot runs until
 * the next shot's start, or the chapter's end.
 */
function chapter(name, start, end, shots) {
  const list = [...shots].sort((a, b) => a[0] - b[0]);
  CHAPTERS.push({ name, start, end, shots: list.map(([t0, fn], i) => ({ t0, t1: i + 1 < list.length ? list[i + 1][0] : end, fn })) });
}

function shotAt(t) {
  for (const c of CHAPTERS) {
    if (t < c.start || t >= c.end) continue;
    for (const s of c.shots) if (t >= s.t0 && t < s.t1) return { ...s, chapter: c.name };
  }
  return null;
}

// ---- karaoke ------------------------------------------------------------------------------------

const KARAOKE = { hidden: false, y: 1000, size: 62 };
let karaokeCache = null;

function karaoke(t) {
  if (KARAOKE.hidden) return;
  const line = SONG.lines.find(l => t >= l.t - 0.35 && t < l.end + 0.45);
  if (!line) return;
  const fadeIn = clamp((t - (line.t - 0.35)) / 0.2), fadeOut = clamp((line.end + 0.45 - t) / 0.25);
  const a = Math.min(fadeIn, fadeOut);
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = a;
  const size = KARAOKE.size;
  ctx.font = `${size}px ${FONT.round}`;
  const chars = [...line.words];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((p, q) => p + q, 0);
  const x0 = W / 2 - total / 2, y = KARAOKE.y;
  // a soft pill behind the words so they read over anything
  rrectPath(x0 - 40, y - size * 0.72, total + 80, size * 1.44, size * 0.72);
  ctx.fillStyle = 'rgba(30,22,48,0.55)'; ctx.fill();
  // how far along the line we are, in pixels
  // A syllable fills as it is sung; a space or a "!" fills once the syllable before it has.
  let k = 0, progress = 0, prevDone = false;
  const isSyl = c => (c >= '가' && c <= '힣') || /[A-Za-z0-9]/.test(c);
  for (let i = 0, x = 0; i < chars.length; i++) {
    if (isSyl(chars[i])) {
      const n = line.notes[k++];
      const fill = t >= n.t ? clamp((t - n.t) / Math.min(n.dur, 0.35)) : 0;
      if (fill > 0) progress = x + widths[i] * fill;
      prevDone = fill >= 1;
    } else if (prevDone) progress = x + widths[i];
    x += widths[i];
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = 11; ctx.strokeStyle = PAL.ink;
  ctx.strokeText(line.words, x0, y);
  ctx.fillStyle = '#FFFFFF'; ctx.fillText(line.words, x0, y);
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y - size, progress + 2, size * 2); ctx.clip();
  ctx.fillStyle = '#FFD45C'; ctx.fillText(line.words, x0, y);
  ctx.restore();
  ctx.restore();
}

// ---- the frame ----------------------------------------------------------------------------------

function renderFrame(t) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  KARAOKE.hidden = false; KARAOKE.y = 1000;
  const shot = shotAt(t);
  if (shot) {
    ctx.save();
    shot.fn(t, t - shot.t0, shot.t1 - shot.t0);
    ctx.restore();
    while (camDepth > 0) camEnd();
  } else {
    letter(`${t.toFixed(2)}s`, W / 2, H / 2, 80, '#FFFFFF');
  }
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  karaoke(t);
  paperFinish(t);
}
