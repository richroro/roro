// Captions for the career video: one look everywhere, so six chapters read as one film.
//
//   yearTag(t, t0, '2015')                 big year in the top-left, slides in at t0
//   caption(t, t0, t1, title, sub)         lower third: a bold title and a smaller line, in
//                                           from t0, out by t1 (both in seconds)
//   bigFact(t, t0, t1, text, x, y, size)   one large statement, centred at (x, y)

/* eslint-disable no-unused-vars */
const BIO = { lime: '#B6FF3B', pink: '#FF3DA5', ink: '#0E0B14', paper: '#F5F1E8', blue: '#5B8CFF' };

function yearTag(t, t0, year, o = {}) {
  const k = clamp((t - t0) / 0.5);
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const x = lerp(-260, 70, easeOut(k));
  ctx.font = `150px ${FONT.bold}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.globalAlpha = 0.95 * (o.alpha ?? 1);
  ctx.fillStyle = o.color || BIO.lime; ctx.fillText(year, x, 44);
  ctx.restore();
}

function caption(t, t0, t1, title, sub, o = {}) {
  const kin = easeOut(clamp((t - t0) / 0.45)), kout = clamp((t1 - t) / 0.35);
  const k = Math.min(kin, kout);
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = k;
  const y = o.y ?? 890, x = 110 - (1 - kin) * 80;
  ctx.font = `64px ${FONT.bold}`;
  const w1 = ctx.measureText(title).width;
  ctx.font = `40px ${FONT.round}`;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 70;
  ctx.fillStyle = 'rgba(14,11,20,0.78)';
  ctx.beginPath(); ctx.roundRect(x - 30, y - 70, w, sub ? 150 : 96, 18); ctx.fill();
  ctx.fillStyle = o.accent || BIO.lime; ctx.fillRect(x - 30, y - 70, 10, sub ? 150 : 96);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `64px ${FONT.bold}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(title, x, y);
  if (sub) { ctx.font = `40px ${FONT.round}`; ctx.fillStyle = '#D9D4E6'; ctx.fillText(sub, x, y + 56); }
  ctx.restore();
}

function bigFact(t, t0, t1, text, x = W / 2, y = H / 2, size = 110, o = {}) {
  const k = Math.min(clamp((t - t0) / 0.35), clamp((t1 - t) / 0.3));
  if (k <= 0) return;
  letter(text, x, y, size, o.color || '#FFFFFF', { pop: clamp((t - t0) / 0.35), alpha: k, color2: BIO.ink, shadow: o.shadow === undefined ? BIO.ink : o.shadow });
}

/**
 * The singer, drawn only as a faceless silhouette (a real person; we do not draw her face).
 * (x, y) is the ground point, s the scale (~530 tall at 1). o: hair ('#…', the tint of the
 * silhouette's hair for an era), pose ('stand'|'mic'|'arms'|'wave'), t, alpha, glow, body.
 */
function silhouette(x, y, s, o = {}) {
  const t = o.t ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const body = o.body || BIO.ink;
  if (o.glow) glow(0, -260, 380, o.glow, 0.35);
  const sway = Math.sin(t * 2) * 4;
  // wide trousers and an oversized hoodie
  smooth([[-92, -170], [-100, -10], [-18, -10], [-4, -150], [4, -150], [18, -10], [100, -10], [92, -170]], { fill: body, stroke: null });
  smooth([[-104, -372], [-60, -392], [60, -392], [104, -372], [118, -250], [104, -150], [0, -140], [-104, -150], [-118, -250]], { fill: body, stroke: null });
  rrect(-100, -24, 86, 26, 12, { fill: body, stroke: null });
  rrect(14, -24, 86, 26, 12, { fill: body, stroke: null });
  const arm = (side, a, b) => stroke([[side * 96, -360], [side * (100 + a), -360 + b], [side * (100 + a * 1.5), -360 + b * 1.9]], body, 52, { ink: null });
  if (o.pose === 'mic') { arm(-1, 12, 120); arm(1, -52, 44); circle(22, -452, 17, { fill: '#2A2A34', stroke: null }); stroke([[22, -440], [30, -380]], '#2A2A34', 8, { ink: null }); }
  else if (o.pose === 'arms') { arm(-1, 60, -110); arm(1, 60, -110); }
  else if (o.pose === 'wave') { arm(-1, 12, 120); arm(1, 70, -100); }
  else { arm(-1, 14, 120); arm(1, 14, 120); }
  // the head, then the long hair over it (seen as if from behind, so a tinted head reads as hair,
  // not as a hood around a face)
  circle(sway * 0.3, -445, 60, { fill: body, stroke: null });
  // hair covering the head and falling to the shoulders (its tint marks the era)
  smooth([[-78 + sway, -470], [-92 + sway, -380], [-88, -300], [-40, -290], [40, -290], [88, -300], [92 + sway, -380], [78 + sway, -470], [0, -528]],
    { fill: o.hair || body, stroke: null });

  if (o.hair) { ctx.save(); ctx.globalAlpha *= 0.55; stroke([[-66 + sway, -470], [-40 + sway, -505], [0, -516], [40 + sway, -505], [66 + sway, -470]], o.hair, 8, { ink: null, smooth: true }); ctx.restore(); }
  ctx.restore();
}
