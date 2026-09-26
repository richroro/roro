// r2_past (14.55 – 29.09) · 2 · 그때
//
// 14.55 A small debut stage: spotlights clunk on, five bow (꾸벅) and then wave; out in the dark
//       only a handful of light sticks sway.
// 18.18 A big heart pops and bursts (the song is out), five cheer; then the rank HUD drops from
//       the top and lands on 904위 with a small thud — the cheer wobbles.
// 21.82 Bell. Night practice room: five backs dancing at the mirror (their reflections dance
//       too), the calendar flips 2024 → 2025 → 2026, the window turns leaves → snow → flowers.
// 25.45 One of them at a desk waves at the laptop camera; 27.27 we cut into the recording screen
//       (● REC, a progress bar) where she keeps waving.
//
// Helpers from r1_night.js: window.R12.
(() => {
  const { B, BT, squash, twinkles, sparkBurst, beatSfx, moonWindow } = window.R12;
  const T0 = 14.55;
  const bt2 = n => T0 + n * B;          // beats since the top of this chapter

  // ---- 14.55 – 18.18: the debut stage -------------------------------------------------------------

  function lightstick(x, y, s, t, i) {
    const sw = Math.sin(beatOf(t) * Math.PI + i) * 0.35;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.scale(s, s);
    glow(0, -90, 120, POP.rose, 0.55);
    stroke([[0, 0], [0, -60]], '#EDE4FF', 16, { ink: POP.ink, olw: 6 });
    circle(0, -90, 34, { fill: '#FFD1E6', stroke: POP.ink, lw: 5 });
    circle(-8, -98, 10, { fill: '#FFFFFF', stroke: null });
    ctx.restore();
  }

  function sStage(t) {
    const lt = t - T0;
    const on = clamp(lt / 0.12);
    fillScreen(lgrad(0, 0, 0, H, [[0, '#1B1433'], [1, '#2A1F4A']]));
    const z = lerp(1.1, 1.0, easeOut(clamp(lt / 1.2))) * (1 + 0.012 * pulse(t, 6));
    camBegin(540, 1150, z);
    // backdrop: a pastel curtain with scallops
    ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * on;
    ctx.fillStyle = lgrad(0, 400, 0, 1300, [[0, '#6D4FB5'], [1, '#B58AE6']]); ctx.fillRect(-100, 380, W + 200, 960);
    for (let x = -100; x < W + 100; x += 90) stroke([[x, 380], [x + 20, 1330]], '#8E6BD1', 18, { ink: null });
    for (let x = -100; x < W + 100; x += 120) ell(x + 60, 400, 70, 50, { fill: POP.rose, stroke: POP.ink, lw: 6 });
    // a string of little bulbs
    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 92, y = 470 + Math.sin(i * 0.9) * 10 + Math.pow((i - 5.5) / 5.5, 2) * -30;
      const lit = (beatN(t) + i) % 2 === 0;
      circle(x, y, 13, { fill: lit ? POP.lemon : '#FFF6D6', stroke: POP.ink, lw: 4 });
      if (lit) glow(x, y, 40, POP.lemon, 0.5);
    }
    ctx.restore();
    // spotlights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const cx = 540 + (i - 1) * 330, sw = Math.sin(t * 1.3 + i * 2) * 40;
      poly([[cx - 30 + (i - 1) * 60, 300], [cx + 30 + (i - 1) * 60, 300], [cx + 200 + sw, 1420], [cx - 200 + sw, 1420]],
        { fill: rgba(['#FFB3D6', '#FFF3C4', '#B9E4FF'][i], 0.16 * on), stroke: null });
    }
    ctx.restore();
    // the little stage
    rrect(-60, 1330, W + 120, 110, 20, { fill: '#F2C7A5', stroke: POP.ink, lw: 8 });
    ctx.fillStyle = '#D69C77'; ctx.fillRect(-60, 1400, W + 120, 40);
    for (let i = 0; i < 5; i++) ell(540 + (i - 2) * 190, 1368, 80, 18, { fill: rgba('#FFFFFF', 0.35 * on), stroke: null });
    // five: bow, then wave
    const bowing = t < bt2(4);
    for (let i = 0; i < 5; i++) {
      const u = i - 2;
      let pose = 'wave', mouth = 'smile', bob = 0;
      if (bowing) {
        // bow down on beat 1, come up on beat 3
        const bk = t < bt2(1) ? 0 : t < bt2(3) ? 1 : 0;
        pose = bk ? 'bow' : 'stand';
      } else { bob = hop(t + i * 0.08) * 0.8; mouth = i % 2 ? 'open' : 'smile'; }
      const [qx, qy] = squash(t, bowing ? (t < bt2(3) ? bt2(1) : bt2(3)) : bt2(4), 0.1);
      ctx.save(); ctx.translate(540 + u * 190, 1370); ctx.scale(qx, qy);
      chibi(0, 0, 0.58, { t: t + i * 0.3, look: i, pose, mouth, bob, sticker: true, flip: !bowing && u < 0 });
      ctx.restore();
    }
    if (bowing) sfx('꾸벅', 540, 900, 110, POP.lemon, t - bt2(1), { life: 1.0 });
    // the audience: dark heads and only a few lights
    for (let i = 0; i < 16; i++) {
      const x = hrange(-40, 1120, i, 3), y = 1560 + hrange(0, 260, i, 4);
      ell(x, y, 70, 60, { fill: '#130E26', stroke: '#2B2150', lw: 4 });
    }
    [[190, 1580], [470, 1650], [760, 1600], [930, 1720], [320, 1790]].forEach(([x, y], i) => lightstick(x, y, 0.8, t, i));
    camEnd();
    popTag(t, T0 + 0.15, bt2(8) + 0.3, '2024년 3월, 데뷔', { y: 330, bg: POP.white });
    popSub(t, T0 + 0.6, bt2(8) + 0.3, '리센느 · 원이 리브 미나미 메이 제나', { y: 470, size: 54 });
    flash(0.3 * Math.exp(-lt * 8));
  }

  // ---- 18.18 – 21.82: the heart bursts, then 904위 -----------------------------------------------

  function sRelease(t) {
    const s0 = bt2(8), lt = t - s0;
    const HIT = bt2(12);                          // 20.0: the HUD lands
    const after = t >= HIT;
    const sad = clamp((t - HIT) / 0.4);
    fillScreen(lgrad(0, 0, 0, H, [[0, mix('#FFB3D6', '#B7A8D8', sad * 0.6)], [1, mix('#C9B2FF', '#9A8FC0', sad * 0.6)]]));
    ctx.save(); ctx.translate(540, 1050);
    sunburst(0, 0, rgba('#FFFFFF', 0.28 * (1 - sad * 0.6)), rgba('#FFFFFF', 0), t * (0.6 - sad * 0.45), 20, 1700);
    ctx.restore();
    halftone(0, 1100, W, 820, '#FFFFFF', 0.25);
    const [sx, sy] = shakeXY(t, HIT, 16, 0.4);
    camBegin(540 - sx, 1100 - sy, lerp(1.08, 1.0, easeOut(clamp(lt / 0.6))));

    // the big heart: pops on 18.18, beats, bursts on 19.09
    const BURST = bt2(10);
    if (t < BURST) {
      const k = backOut(clamp(lt / 0.3)), p = pulse(t, 6);
      const r = 300 * k * (1 + 0.08 * p) * (1 + 0.25 * easeIn(clamp((t - BURST + 0.2) / 0.2)));
      poly(heartPts(540, 1000, r * 1.08), { fill: POP.white, stroke: null });
      poly(heartPts(540, 1000, r), { fill: POP.pink, stroke: POP.ink, lw: 10 });
      ell(430, 880, r * 0.14, r * 0.08, { fill: '#FFFFFF', stroke: null, alpha: 0.7 }, -0.6);
    }
    // burst: little hearts fly out and fall
    const ba = t - BURST;
    if (ba >= 0) {
      if (ba < 0.5) burstStar(540, 1000, 380 * easeOut(ba / 0.5) * (1 - ba), 14, POP.lemon, ba);
      for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * TAU + hash(i, 2), sp = hrange(700, 1300, i, 3);
        const x = 540 + Math.cos(ang) * sp * ba, y = 1000 + Math.sin(ang) * sp * ba + 700 * ba * ba;
        const r = hrange(22, 44, i, 4) * (1 - clamp(ba / 2.6));
        if (r > 2) poly(heartPts(x, y, r), { fill: [POP.pink, POP.rose, POP.lav, POP.lemon][i % 4], stroke: POP.ink, lw: 4 });
      }
    }
    // five cheering, then wobbling after 904위
    for (let i = 0; i < 5; i++) {
      const u = i - 2, k = clamp((lt - 0.35 - i * 0.04) / 0.3);
      if (k <= 0) continue;
      const up = (1 - backOut(k)) * 500;
      const [qx, qy] = squash(t, after ? HIT + 0.05 : 0, 0.14);
      ctx.save(); ctx.translate(540 + u * 190, 1600 + up); ctx.scale(qx, qy);
      if (!after) chibi(0, 0, 0.56, { t: t + i * 0.3, look: i, pose: i % 2 ? 'jump' : 'cheer', mouth: 'open', sticker: true });
      else chibi(0, 0, 0.56, { t: t + i * 0.3, look: i, pose: sad < 1 ? 'jump' : 'stand', mouth: t < HIT + 0.5 ? 'o' : 'wobble', sticker: true, flip: u > 0 });
      ctx.restore();
      if (after && t > HIT + 0.3) {   // a sweat drop each
        const dk = frac((t - HIT) * 0.8 + i * 0.2);
        const dx = 540 + u * 190 + 60, dy = 1600 - 300 + dk * 40;
        poly([[dx, dy - 22], [dx + 12, dy], [dx, dy + 12], [dx - 12, dy]], { fill: '#9FDCFF', stroke: POP.ink, lw: 4, alpha: 1 - dk * 0.5 });
      }
    }
    camEnd();
    if (t < HIT) hearts(t, 10, 60, 500, 960, 1100, { alpha: 0.7 });

    // the HUD drops from the top and lands on the beat
    const DROP = HIT - 0.5;
    if (t >= DROP) {
      const dk = clamp((t - DROP) / 0.5), y = t < HIT ? lerp(-120, 160, easeIn(dk)) : 160 + Math.sin((t - HIT) * 22) * 18 * Math.exp(-(t - HIT) * 6);
      rankHUD(t, 904, { y, label: 'MELON 일간', flash: 0.6 * Math.exp(-Math.max(0, t - HIT) * 6) });
    }
    if (after) sfx('쿵!', 840, 560, 130, POP.white, t - HIT, { life: 0.9, rot: 0.12 });
    popTag(t, s0 + 0.12, bt2(16) + 0.3, '2024년 8월 “러브 어택”', { y: 350, bg: POP.white, colors: [POP.ink] });
    popSub(t, HIT + 0.1, bt2(16) + 0.3, '첫 성적, 멜론 일간 904위', { y: 500, size: 58 });
    flash(0.5 * Math.exp(-lt * 10) + 0.4 * Math.exp(-Math.max(0, t - BURST) * 10) * (t >= BURST ? 1 : 0));
  }

  // ---- 21.82 – 25.45: practice room at night, the year turns ---------------------------------------

  const Y1 = bt2(19), Y2 = bt2(22);            // 23.18: 2025 · 24.55: 2026
  function seasonFx(t) {
    return (x, y, w, h) => {
      const season = t < Y1 ? 0 : t < Y2 ? 1 : 2;
      for (let i = 0; i < 18; i++) {
        const sp = hrange(90, 180, i, 1), px = x + frac(hash(i, 2) + t * 0.05 * (season === 1 ? 0.3 : 1)) * w + Math.sin(t * 2 + i) * 16;
        const py = y - 30 + frac(hash(i, 3) + t * sp / h) * (h + 60);
        ctx.save(); ctx.translate(px, py); ctx.rotate(t * 2 + i);
        if (season === 0) ell(0, 0, 14, 8, { fill: ['#FF9A3D', '#FFC23D', '#E0674E'][i % 3], stroke: POP.ink, lw: 3 });
        else if (season === 1) circle(0, 0, hrange(5, 10, i, 4), { fill: '#FFFFFF', stroke: null });
        else { for (let p = 0; p < 5; p++) ell(Math.cos(p * TAU / 5) * 8, Math.sin(p * TAU / 5) * 8, 8, 5, { fill: '#FFC7DA', stroke: null }, p * TAU / 5); circle(0, 0, 4, { fill: POP.lemon, stroke: null }); }
        ctx.restore();
      }
      if (season === 1) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + h - 26, w, 26); }
    };
  }

  function calendar(x, y, t) {
    const years = ['2024', '2025', '2026'], idx = t < Y1 ? 0 : t < Y2 ? 1 : 2;
    const w = 330, h = 330;
    // rings
    rrect(x - w / 2, y - h / 2, w, h, 26, { fill: '#FFFFFF', stroke: POP.white, lw: 26 });
    const page = (label, yy, sc = 1, alpha = 1) => {
      ctx.save(); ctx.translate(x, y - h / 2); ctx.scale(1, sc); ctx.globalAlpha *= alpha;
      rrect(-w / 2, 0, w, h, 24, { fill: '#FFFFFF', stroke: POP.ink, lw: 7 });
      rrect(-w / 2, 0, w, 86, 24, { fill: POP.pink, stroke: POP.ink, lw: 7 });
      ctx.fillStyle = POP.pink; ctx.fillRect(-w / 2 + 4, 50, w - 8, 36);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) circle(-w / 2 + 40 + c * 50, 250 + r * 26, 6, { fill: POP.lav, stroke: null, alpha: 0.6 });
      ctx.font = `110px ${FONT.bold}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = POP.ink; ctx.fillText(label, 0, 170);
      ctx.restore();
    };
    page(years[idx], 0);
    // the page before flips up and away (and a flurry of loose pages)
    const flips = [Y1, Y2];
    flips.forEach((ft, j) => {
      const a = t - ft;
      if (a >= 0 && a < 0.35) {
        const k = a / 0.35;
        page(years[j], 0, Math.cos(k * Math.PI * 0.95), 1 - k * 0.3);
        for (let i = 0; i < 6; i++) {
          const pk = clamp(a / 0.35 + i * 0.05);
          ctx.save(); ctx.translate(x + hrange(-200, 200, i, j + 5) * pk, y - 200 - 500 * pk); ctx.rotate(pk * hrange(-5, 5, i, j));
          rrect(-60, -40, 120, 80, 10, { fill: '#FFFFFF', stroke: POP.ink, lw: 5, alpha: 1 - pk });
          ctx.restore();
        }
      }
    });
    for (let i = 0; i < 4; i++) rrect(x - 110 + i * 70, y - h / 2 - 22, 16, 44, 8, { fill: '#C9C3D8', stroke: POP.ink, lw: 5 });
    [Y1, Y2].forEach(ft => sfx('휙!', x - 150, y - 150, 90, POP.lemon, t - ft, { life: 0.6, rot: -0.15 }));
  }

  const DANCE = ['cheer', 'stand', 'wave', 'jump'];
  function sPractice(t) {
    const s0 = bt2(16), lt = t - s0;
    const z = lerp(1.08, 1.0, easeOut(clamp(lt / 0.6))) * (1 + 0.01 * pulse(t, 6));
    fillScreen('#2C2350');
    camBegin(540, 1100, z);
    // wall
    ctx.fillStyle = lgrad(0, 0, 0, 1420, [[0, '#3B2F6B'], [1, '#54448F']]); ctx.fillRect(-100, -100, W + 200, 1520);
    halftone(-100, 0, W + 200, 1420, '#FFFFFF', 0.05, 30);
    moonWindow(90, 470, 330, 290, t, { season: seasonFx(t), curtain: '#9FD8FF' });
    calendar(815, 625, t);
    // the mirror and the reflections dancing
    const mx = 90, my = 860, mw = 900, mh = 560;
    rrect(mx - 22, my - 22, mw + 44, mh + 44, 20, { fill: '#E8DDF9', stroke: POP.ink, lw: 8 });
    ctx.save(); rrectPath(mx, my, mw, mh, 10); ctx.clip();
    ctx.fillStyle = lgrad(0, my, 0, my + mh, [[0, '#6E63A8'], [1, '#8C83C4']]); ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#7A6FB3'; ctx.fillRect(mx, my + mh - 110, mw, 110);
    const pose = DANCE[beatN(t) % 4];
    for (let i = 0; i < 5; i++) {
      const u = i - 2;
      chibi(540 + u * 150, my + mh - 40, 0.44, { t: t + i * 0.3, look: [0, 4, 2, 1, 3][i], pose, mouth: 'smile', bob: hop(t) * 0.6, flip: true });
    }
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 3; i++) poly([[mx + 120 + i * 300, my], [mx + 200 + i * 300, my], [mx + 60 + i * 300, my + mh], [mx - 20 + i * 300, my + mh]], { fill: '#FFFFFF', stroke: null });
    ctx.restore();
    // floor
    ctx.fillStyle = '#C98E5B'; ctx.fillRect(-100, 1420, W + 200, 600);
    for (let y = 1440; y < 2000; y += 70) stroke([[-100, y], [W + 100, y]], '#B87942', 5, { ink: null });
    ctx.fillStyle = 'rgba(40,20,70,0.35)'; ctx.fillRect(-100, 1420, W + 200, 600);
    // five backs, dancing on the beat
    for (let i = 0; i < 5; i++) {
      const u = i - 2, [qx, qy] = squash(t, bt2(beatN(t) - beatN(T0)), 0.08);
      ctx.save(); ctx.translate(540 + u * 195, 1720 + (i % 2) * 30); ctx.scale(qx, qy);
      chibi(0, 0, 0.6, { t: t + i * 0.3, look: [0, 4, 2, 1, 3][i], view: 'back', pose, bob: hop(t) * 0.7, sticker: true });
      ctx.restore();
    }
    camEnd();
    // the bell
    sparkBurst(t, s0, 540, 300, 14, 480, 12);
    popTag(t, s0 + 0.1, bt2(24) + 0.3, '그래도 멈추지 않았다', { y: 300, bg: POP.lemon });
    flash(0.35 * Math.exp(-lt * 9));
  }

  // ---- 25.45 – 29.09: one of them, on camera ---------------------------------------------------------

  const CAMLOOK = 1;
  function fairyLights(t, y0) {
    ctx.save(); ctx.strokeStyle = POP.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-40, y0); ctx.quadraticCurveTo(540, y0 + 140, 1120, y0); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 11; i++) {
      const k = (i + 0.5) / 11, x = lerp(-40, 1120, k), y = y0 + 4 * 70 * k * (1 - k) + 18;
      const c = [POP.pink, POP.lemon, POP.mint, POP.sky][i % 4], lit = 0.5 + 0.5 * Math.sin(t * 5 + i);
      glow(x, y, 50, c, 0.4 * lit);
      ell(x, y, 12, 17, { fill: c, stroke: POP.ink, lw: 4 });
    }
  }

  function sDesk(t) {
    const s0 = bt2(24), lt = t - s0;
    fillScreen(lgrad(0, 0, 0, H, [[0, '#FFD6E8'], [1, '#D9C8FF']]));
    halftone(0, 0, W, H, POP.pink, 0.12, 28);
    const z = lerp(1.12, 1.0, easeOut(clamp(lt / 0.7)));
    camBegin(540, 1150, z);
    fairyLights(t, 700);
    // ring light behind her
    circle(540, 1080, 250, { fill: null, stroke: '#FFFFFF', lw: 30 });
    glow(540, 1080, 420, '#FFFFFF', 0.4);
    // her, sitting, waving at the camera
    const [qx, qy] = squash(t, s0 + 0.05, 0.12);
    ctx.save(); ctx.translate(540, 1440); ctx.scale(qx, qy);
    chibi(0, 0, 0.8, { t, look: CAMLOOK, pose: 'wave', mouth: beatN(t) % 2 ? 'open' : 'smile', bob: hop(t) * 0.5, sticker: true, flip: true });
    ctx.restore();
    // the desk and the laptop, seen from behind its lid
    rrect(-60, 1420, W + 120, 70, 16, { fill: '#F2C7A5', stroke: POP.ink, lw: 8 });
    ctx.fillStyle = '#E2AF8B'; ctx.fillRect(-60, 1490, W + 120, 500);
    poly([[310, 1425], [770, 1425], [740, 1215], [340, 1215]], { fill: '#E9E6F2', stroke: POP.ink, lw: 8 });
    poly(heartPts(540, 1320, 34), { fill: POP.rose, stroke: POP.ink, lw: 5 });   // a sticker on the lid
    circle(430, 1270, 18, { fill: POP.mint, stroke: POP.ink, lw: 4 });
    sparkle(655, 1290, 22, POP.lemon);
    camEnd();
    hearts(t, 9, 120, 600, 840, 700, { scale: 1.1 });
    popTag(t, s0 + 0.12, bt2(32) + 0.3, '2026년 2월,\n원이의 유튜브 채널', { y: 320, bgs: [POP.white, POP.lemon] });
  }

  function sRec(t) {
    const s0 = bt2(28), lt = t - s0;
    fillScreen('#241C40');
    halftone(0, 0, W, H, POP.lav, 0.12, 30);
    const k = backOut(clamp(lt / 0.3));
    const wob = Math.sin(t * 1.7) * 6;
    ctx.save(); ctx.translate(540, 1080 + wob); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k); ctx.rotate(Math.sin(t * 1.1) * 0.01); ctx.translate(-540, -1080);
    const x0 = 50, y0 = 580, w = 980, h = 1000;
    rrect(x0 - 16, y0 - 16, w + 32, h + 32, 46, { fill: '#FFFFFF', stroke: POP.white, lw: 20 });
    rrect(x0 - 16, y0 - 16, w + 32, h + 32, 46, { fill: '#2A2238', stroke: POP.ink, lw: 8 });
    ctx.save(); rrectPath(x0, y0, w, h, 32); ctx.clip();
    // the picture: her room, her waving
    ctx.fillStyle = lgrad(0, y0, 0, y0 + h, [[0, '#FFD6E8'], [1, '#CDB8FF']]); ctx.fillRect(x0, y0, w, h);
    halftone(x0, y0, w, h, '#FFFFFF', 0.25, 26);
    fairyLights(t, y0 + 60);
    glow(540, 1150, 460, '#FFFFFF', 0.45);
    const [qx, qy] = squash(t, bt2(beatN(t) - beatN(T0)), 0.06);
    ctx.save(); ctx.translate(540, y0 + h + 60); ctx.scale(qx, qy);
    chibi(0, 0, 1.0, { t, look: CAMLOOK, pose: 'wave', mouth: beatN(t) % 2 ? 'open' : 'smile', bob: hop(t) * 0.6, flip: true });
    ctx.restore();
    hearts(t, 8, x0 + 60, y0 + 200, w - 120, h - 250, { scale: 1.2 });
    // recording UI
    ctx.fillStyle = 'rgba(20,14,40,0.55)'; ctx.fillRect(x0, y0, w, 110);
    ctx.font = `58px ${FONT.bold}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const blink = frac(t * 1.1) < 0.6;
    if (blink) circle(x0 + 60, y0 + 56, 20, { fill: '#FF3B5C', stroke: null, shadow: '#FF3B5C', shadowBlur: 20 });
    ctx.fillStyle = '#FFFFFF'; ctx.fillText('REC', x0 + 96, y0 + 58);
    const secs = Math.floor(clamp(lt, 0, 99));
    ctx.textAlign = 'right'; ctx.font = `46px ${FONT.round}`;
    ctx.fillText(`00:00:${String(secs).padStart(2, '0')}`, x0 + w - 40, y0 + 58);
    // corner brackets
    for (const [cx, cy, dx, dy] of [[x0 + 40, y0 + 150, 1, 1], [x0 + w - 40, y0 + 150, -1, 1], [x0 + 40, y0 + h - 150, 1, -1], [x0 + w - 40, y0 + h - 150, -1, -1]])
      stroke([[cx, cy + dy * 60], [cx, cy], [cx + dx * 60, cy]], '#FFFFFF', 8, { ink: null, alpha: 0.85 });
    // progress bar
    const pk = clamp(lt / 1.9);
    ctx.fillStyle = 'rgba(20,14,40,0.55)'; ctx.fillRect(x0, y0 + h - 90, w, 90);
    rrect(x0 + 40, y0 + h - 52, w - 80, 14, 7, { fill: 'rgba(255,255,255,0.35)', stroke: null });
    rrect(x0 + 40, y0 + h - 52, (w - 80) * pk, 14, 7, { fill: '#FF3B5C', stroke: null });
    circle(x0 + 40 + (w - 80) * pk, y0 + h - 45, 16, { fill: '#FF3B5C', stroke: '#FFFFFF', lw: 4 });
    ctx.restore();
    ctx.restore();
    popTag(t, bt2(24) + 0.12, bt2(32) + 0.3, '2026년 2월,\n원이의 유튜브 채널', { y: 320, bgs: [POP.white, POP.lemon] });
    flash(0.3 * Math.exp(-lt * 10));
  }

  chapter('past', T0, 29.09, [
    [T0, sStage],
    [bt2(8), sRelease],
    [bt2(16), sPractice],
    [bt2(24), sDesk],
    [bt2(28), sRec],
  ]);
})();
