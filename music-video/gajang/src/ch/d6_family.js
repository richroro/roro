// d6_family: the last chorus, a key up. A bright weekend by the Han River, the chapter-2 weights
// on his shoulders turning into his family, the toast with juice cups, the parents' race at
// sports day, asleep on the sofa under his kids, a city of lit windows, and the end card.
(() => {
  const B = SONG.beat;
  const T0 = 139.2, T_HIT1 = 141.6, T_HIT2 = 151.2, T_CLINK = 153.0;

  // ---- private helpers ------------------------------------------------------------------------

  function screen(fn) { ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); fn(); ctx.restore(); }
  function edgeGlow(color, a, r0 = 0.35) {
    if (a <= 0.002) return;
    screen(() => {
      ctx.fillStyle = rgrad(W / 2, H / 2, H * r0, H * 1.05, [[0, rgba(color, 0)], [1, rgba(color, a)]]);
      ctx.fillRect(0, 0, W, H);
    });
  }
  const headOf = (x, y, s, role = 'dad') => [x, y - 370 * s * ROLE[role].h];

  /** A diamond kite with a ribbon tail, string running down to (hx, hy). */
  function kite(t, x, y, s, color, hx, hy, seed = 0) {
    const sway = Math.sin(t * 1.3 + seed) * 0.12;
    stroke([[hx, hy], [lerp(hx, x, 0.5) + 40, lerp(hy, y, 0.5) + 60], [x, y + 50 * s]], '#FFFFFF', 2, { ink: null, smooth: true, alpha: 0.9 });
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway); ctx.scale(s, s);
    const tail = [];
    for (let i = 0; i <= 8; i++) tail.push([Math.sin(t * 4 + i * 0.8 + seed) * 16 * (i / 8), 56 + i * 22]);
    stroke(tail, color, 5, { smooth: true, olw: 4 });
    for (let i = 2; i < 8; i += 2) poly([[tail[i][0] - 12, tail[i][1] - 6], [tail[i][0] + 12, tail[i][1] + 6], [tail[i][0] + 12, tail[i][1] - 6], [tail[i][0] - 12, tail[i][1] + 6]], { fill: PAL.gold, lw: 3 });
    poly([[0, -70], [50, -6], [0, 58], [-50, -6]], { fill: color, lw: 5 });
    poly([[0, -70], [50, -6], [0, -6]], { fill: rgba('#FFFFFF', 0.35), stroke: null });
    stroke([[0, -70], [0, 58]], PAL.ink, 3, { ink: null });
    stroke([[-50, -6], [50, -6]], PAL.ink, 3, { ink: null });
    ctx.restore();
  }

  /**
   * 아빠 with the little one riding on his shoulders. The child is painted behind his head, then
   * the child's legs come down in front over his shoulders and 아빠's hands hold the ankles.
   */
  function shoulderRide(x, y, s, t, o = {}, c = {}) {
    const bob = o.walk !== undefined ? Math.abs(Math.sin(o.walk * TAU)) * 8 * s : 0;
    if (c.show !== false) {
      const pop = c.pop ?? 1;
      ctx.save(); ctx.translate(x, y - bob - 430 * s); ctx.scale(pop, pop); ctx.translate(-x, -(y - bob - 430 * s));
      person(x, y - bob - 360 * s + (c.dy || 0), s, {
        role: 'child', t, shadow: false, lL: 0.05, lR: 0.05, eyes: 'happy', mouth: 'grin', blush: 1, ...c,
      });
      ctx.restore();
    }
    person(x, y, s, { role: 'dad', t, ...o, aL: c.show !== false ? 2.2 : o.aL, eL: c.show !== false ? 1.6 : o.eL, aR: c.show !== false ? 2.2 : o.aR, eR: c.show !== false ? 1.6 : o.eR });
    if (c.show !== false) {
      const pop = c.pop ?? 1;
      ctx.save(); ctx.translate(x, y - bob); ctx.scale(s, s);
      ctx.translate(0, -430); ctx.scale(pop, pop); ctx.translate(0, 430);
      for (const side of [-1, 1]) {
        const sw = Math.sin(t * 5 + side) * 4;
        stroke([[side * 56, -440], [side * 104, -400], [side * 104 + sw, -300]], '#4E8EF7', 30, { olw: 9, smooth: true });
        ell(side * 104 + sw, -284, 27, 15, { fill: '#F2545B', lw: 4.5 });
        circle(side * 100, -318, 16, { fill: PAL.skin, lw: 4.5 });
      }
      ctx.restore();
    }
  }

  function juiceCup(x, y, s = 1, fill = '#FFA640') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    poly([[-24, -60], [24, -60], [19, 0], [-19, 0]], { fill: 'rgba(230,245,255,0.7)', lw: 4 });
    poly([[-22, -42], [22, -42], [19, -3], [-19, -3]], { fill, stroke: null });
    stroke([[8, -60], [14, -86], [26, -92]], '#FF8FB1', 5, { ink: null });
    ctx.restore();
  }

  function chicken(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-150, -40, 300, 60, 10, { fill: '#F4F0E6', lw: 5 });
    poly([[-150, -40], [-190, -140], [190, -140], [150, -40]], { fill: '#E84A3A', lw: 5 });
    letter('치킨', 0, -92, 44, '#FFFFFF', { lw: 5, shadow: null });
    for (let i = 0; i < 7; i++) {
      const px = -110 + i * 36, py = -52 - (i % 2) * 18;
      smooth(blobPts(px, py, 30, 8, 0.2, i + 3), { fill: i % 3 ? '#D98A3A' : '#C27428', lw: 4 });
    }
    ctx.restore();
  }

  // ---- 139.20 · the Han River, a key up -------------------------------------------------------

  function riverSet(t, scroll) {
    skyFill([[0, '#48A8F2'], [0.55, '#9ED8FF'], [0.62, '#D8F0FF'], [1, '#D8F0FF']]);
    sun(1680, 150, 70, PAL.sun, t);
    cloudLayer(t, 180, 0.8, 18, 7);
    // Namsan with its tower, and the city across the water
    ell(460, 590, 330, 150, { fill: '#8FBFA6', stroke: null });
    stroke([[460, 452], [460, 330]], '#F4F6FA', 10, { olw: 5 });
    rrect(438, 360, 44, 26, 10, { fill: '#F4F6FA', lw: 4 });
    stroke([[460, 330], [460, 290]], '#F4F6FA', 4, { olw: 4 });
    ctx.save(); ctx.translate(0, 585); ctx.scale(1, 0.42);
    townRow(t, 0, 120 + scroll * 0.1, { tone: '#A8C4E0', far: true, seed: 12 });
    ctx.restore();
    // the bridge
    rrect(-100, 560, W + 200, 22, 4, { fill: '#F0F2F6', lw: 4 });
    for (let i = 0; i < 8; i++) {
      const bx = ((i * 300 - scroll * 0.2) % 2400 + 2400) % 2400 - 200;
      stroke([[bx, 560], [bx + 150, 500], [bx + 300, 560]], '#E0484E', 7, { ink: null, smooth: true });
      rrect(bx - 8, 580, 16, 30, 3, { fill: '#C9CED8', stroke: null });
    }
    // the river
    rrect(-100, 600, W + 200, 110, 0, { fill: '#4C9BE8', stroke: null });
    for (let i = 0; i < 26; i++) {
      const gx = ((hash(i, 1) * W * 1.2 + t * 30 - scroll * 0.4) % (W + 200) + W + 200) % (W + 200) - 100, gy = 612 + hash(i, 2) * 90;
      stroke([[gx, gy], [gx + 30 + hash(i, 3) * 40, gy]], '#FFFFFF', 3, { ink: null, alpha: 0.4 + 0.4 * Math.sin(t * 3 + i) });
    }
    // grass bank and the bike path
    rrect(-100, 700, W + 200, 500, 0, { fill: '#8ED46A', lw: 5 });
    rrect(-100, 790, W + 200, 70, 0, { fill: '#EADCB8', lw: 4 });
    for (let i = 0; i < 14; i++) {
      const dx = ((i * 180 - scroll) % 2520 + 2520) % 2520 - 300;
      stroke([[dx, 825], [dx + 70, 825]], '#FFFFFF', 5, { ink: null });
    }
    for (let i = 0; i < 30; i++) {
      const gx = ((hash(i, 7) * 2400 - scroll) % 2400 + 2400) % 2400 - 200, gy = 720 + hash(i, 8) * 60;
      stroke([[gx, gy], [gx + 4, gy - 16]], '#6FB65A', 4, { ink: null });
    }
  }

  function hanRiver(t, lt, dur) {
    const [sx, sy] = shakeXY(t, T0, 26, 0.45), [hx2, hy2] = shakeXY(t, T_HIT1, 10, 0.3);
    const k = easeOut(clamp(lt / 1.6));
    camBegin(960 + sx + hx2 + lt * 10, 520 + sy + hy2, lerp(1.35, 1.0, k) + 0.02 * Math.exp(-(t - T_HIT1) * 6) * (t > T_HIT1 ? 1 : 0));
    riverSet(t, lt * 20);
    if (t > T_HIT1) sunburst(1680, 150, rgba('#FFFFFF', 0.18), rgba('#FFF3B0', 0.06), t * 0.2, 16, 2200, Math.exp(-(t - T_HIT1) * 1.2));
    // kites
    const cw = t * 0.55;
    kite(t, 1180 + Math.sin(t * 0.8) * 40, 190 + Math.sin(t * 1.1) * 20, 0.9, PAL.red, 1175, 420, 1);
    kite(t, 520 + Math.sin(t * 0.7 + 2) * 30, 150 + Math.sin(t * 1.3) * 20, 0.8, PAL.mint, 520, 700, 2);
    kite(t, 1620, 330 + Math.sin(t) * 16, 0.5, PAL.lilac, 1900, 900, 3);
    // 엄마 on the picnic mat, the big one flying her kite
    rrect(170, 870, 420, 110, 20, { fill: '#FF8FB1', lw: 5 });
    for (let i = 0; i < 5; i++) stroke([[190 + i * 90, 872], [190 + i * 90, 978]], '#FFFFFF', 8, { ink: null, alpha: 0.6 });
    const b = beatOf(t);
    person(300, 915 + 71 * 0.94 * 0.95, 0.95, {
      role: 'mom', t, sit: true, eyes: 'happy', mouth: 'grin', blush: 0.7,
      aR: 2.5 + Math.sin(b * Math.PI * 2) * 0.3, eR: -0.2, aL: 0.4,
    });
    kid(520, 890, 0.95, {
      who: 'pony', t, ...dance('bounce', t, 1), eyes: 'happy', mouth: 'grin', blush: 0.6,
      aR: 2.4, eR: -0.3, holdR: () => {},
    });
    // 아빠 with the little one on his shoulders, strolling
    const walk = cw;
    shoulderRide(1100, 900, 1.08, t, {
      walk, eyes: t < T0 + 0.35 ? 'wide' : 'happy', mouth: 'grin', blush: 0.6, bags: 0.2, looseTie: true, jacket: false,
    }, {
      aR: 2.6 + Math.sin(b * Math.PI) * 0.2, eR: 0.1, aL: 2.2, eL: 0.3,
      eyes: t > T_HIT1 ? 'star' : 'happy', mouth: 'open',
    });
    // sunlight confetti at the hit
    confetti(t, T_HIT1, { n: 110, burst: true, colors: ['#FFFFFF', '#FFF3B0', PAL.sun, PAL.gold, '#FFD9E6', '#CFF3FF'] });
    if (t > T_HIT1) {
      for (let i = 0; i < 14; i++) {
        const age = t - T_HIT1 - hash(i, 5) * 0.5;
        if (age < 0 || age > 1.2) continue;
        sparkle(hrange(100, 1820, i, 1), hrange(80, 700, i, 2), 30 * Math.sin(age / 1.2 * Math.PI), '#FFFFFF', age * 3);
      }
    }
    camEnd();
    // the boom: white, then colour
    fillScreen('#FFFFFF', 0.94 * (1 - easeOut(seg(t, T0, T0 + 0.55))));
    fillScreen('#FFF6D0', 0.35 * Math.exp(-(t - T_HIT1) * 5) * (t > T_HIT1 ? 1 : 0));
  }

  // ---- 144.00 · the weights on his shoulders, again -------------------------------------------

  const POPS = [144.3, 144.9, 145.5, 146.1];     // bills, academy bag, house, family photo

  function weightItem(i, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (i === 0) { // bills
      for (let j = 0; j < 3; j++) { ctx.save(); ctx.rotate((j - 1) * 0.12); rrect(-70, -90, 140, 90, 6, { fill: '#FFFFFF', lw: 4 }); ctx.restore(); }
      letter('청구서', 0, -46, 34, PAL.red, { lw: 4, shadow: null });
    } else if (i === 1) { // academy bag
      rrect(-80, -100, 160, 100, 24, { fill: '#6FA8FF', lw: 5 });
      stroke([[-40, -100], [-30, -126], [30, -126], [40, -100]], PAL.ink, 6, { ink: null });
      letter('학원', 0, -50, 36, '#FFFFFF', { lw: 5, shadow: null });
    } else if (i === 2) { // house
      rrect(-90, -110, 180, 110, 6, { fill: '#F6E7C8', lw: 5 });
      poly([[-110, -106], [0, -190], [110, -106]], { fill: '#D8583E', lw: 5 });
      rrect(-20, -60, 40, 60, 4, { fill: '#8A5530', lw: 4 });
      letter('집', 55, -60, 36, PAL.ink, { lw: 0, shadow: null });
    } else { // family photo
      rrect(-86, -120, 172, 120, 8, { fill: '#B87942', lw: 5 });
      rrect(-70, -104, 140, 88, 4, { fill: '#CFF3FF', lw: 3 });
      for (let j = 0; j < 4; j++) circle(-45 + j * 30, -54 + (j % 2) * 8, 11 - (j > 1 ? 3 : 0), { fill: PAL.skin, lw: 3 });
    }
    ctx.restore();
  }

  function familyWalk(t, lt, dur) {
    const scroll = lt * 220;
    camBegin(960, 540, 1.02);
    riverSet(t, 400 + scroll);
    // trees along the path sliding past
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 420 - scroll * 1.1) % 2520 + 2520) % 2520 - 300;
      tree(tx, 790, 0.9, 'green', t);
    }
    const popped = POPS.filter(p => t >= p).length;
    const since = i => t - POPS[i];
    const pk = i => (t >= POPS[i] ? backOut(clamp(since(i) / 0.3)) : 0);
    const load = (4 - popped) / 4;
    const walk = lt * 0.8;
    const b = beatOf(t);
    const y = 960, dx = 930, ds = 1.05;
    // 엄마 pops in beside him
    if (pk(2) > 0) {
      ctx.save(); ctx.translate(1270, y); ctx.scale(pk(2), pk(2)); ctx.translate(-1270, -y);
      person(1270, y, 1.02, { role: 'mom', t, walk: walk + 0.25, eyes: 'happy', mouth: 'grin', blush: 0.7, aL: 0.9, eL: 0.5, headRot: -0.06 });
      ctx.restore();
    }
    // the big one, holding his hand
    if (pk(1) > 0) {
      ctx.save(); ctx.translate(610, y); ctx.scale(pk(1), pk(1)); ctx.translate(-610, -y);
      kid(610, y - 4, 0.98, { who: 'pony', t, walk: walk + 0.5, eyes: t > 146.4 ? 'happy' : 'open', mouth: 'grin', blush: 0.5, aR: 1.6, eR: 0 });
      ctx.restore();
    }
    // 아빠 (and, once the photo turns real, the little one on his shoulders)
    const dadO = {
      walk, eyes: popped < 2 ? 'sleepy' : 'happy', mouth: popped < 1 ? 'wavy' : 'grin', blush: 0.3 + popped * 0.1,
      sq: 0.06 * load, rot: 0.04 * load * Math.sin(b * Math.PI), bags: 0.5 * load, looseTie: true, jacket: false,
      emote: popped < 1 ? 'sweat' : null,
      aL: pk(1) > 0 ? 0.72 : 2.3, eL: pk(1) > 0 ? 0 : 1.2, aR: pk(2) > 0 ? 0.6 : 2.3, eR: pk(2) > 0 ? 0.4 : 1.2,
    };
    shoulderRide(dx, y, ds, t, dadO, {
      show: pk(3) > 0, pop: pk(3), aL: 2.4 + Math.sin(b * Math.PI) * 0.3, aR: 2.4 - Math.sin(b * Math.PI) * 0.3, eL: 0.2, eR: 0.2,
      eyes: 'happy', mouth: 'open',
    });
    if (pk(1) > 0) circle(lerp(610, dx, 0.5) - 8, y - 190, 18, { fill: PAL.skin, lw: 4.5 });
    // the old stack, top first, each one popping away
    const bob = Math.abs(Math.sin(walk * TAU)) * 8 * ds;
    let sy = y - bob - 470 * ds;
    const hs = [100, 90, 150, 100];
    for (let i = 3; i >= 0; i--) {
      const age = since(i);
      const wob = Math.sin(t * 3 + i) * 6 * (i + 1) * 0.5;
      if (age < 0) weightItem(i, dx + wob, sy, 0.78);
      else if (age < 0.35) {
        // a puff
        for (let j = 0; j < 8; j++) {
          const a = j * TAU / 8;
          circle(dx + Math.cos(a) * (40 + age * 300), sy - 60 + Math.sin(a) * (30 + age * 200), 22 * (1 - age / 0.35), { fill: '#FFFFFF', lw: 3 });
        }
        sparkle(dx, sy - 60, 70 * (1 - age / 0.35), PAL.gold, age * 6);
      }
      sy -= hs[i];
    }
    // the bills fold into a paper plane and fly off
    if (t > POPS[0]) {
      const a = t - POPS[0];
      paperPlane(dx + a * 520, y - 470 * ds - 400 - a * 260 + Math.sin(a * 4) * 30, 0.6, -0.4);
    }
    // hearts once everyone is here
    for (let i = 0; i < 6; i++) {
      const age = t - 146.4 - i * 0.35;
      if (age < 0 || age > 1.8) continue;
      poly(heartPts(lerp(600, 1300, hash(i, 1)), 380 - age * 160, 20), { fill: i % 2 ? PAL.pink : PAL.red, lw: 3.5, alpha: Math.sin(age / 1.8 * Math.PI) });
    }
    camEnd();
  }

  // ---- 148.80 · dinner, a glass poured, a toast -----------------------------------------------

  function kitchen(t) {
    rrect(-100, -100, W + 200, H + 200, 0, { fill: '#F4D9A8', stroke: null });
    for (let i = 0; i < 16; i++) stroke([[i * 130, -20], [i * 130, 700]], '#EFD09A', 30, { ink: null });
    // window with the evening, a clock, a fridge drawing
    rrect(120, 110, 360, 280, 12, { fill: '#2E3A66', lw: 6 });
    stars(t, 12, 51, 0.8, 380);
    moon(390, 180, 30);
    stroke([[300, 110], [300, 390]], PAL.ink, 5, { ink: null });
    wallClock(1520, 200, 70, 7, 40);
    // the pendant lamp
    stroke([[960, -20], [960, 110]], PAL.ink, 4, { ink: null });
    poly([[880, 170], [1040, 170], [1000, 110], [920, 110]], { fill: '#F2A33D', lw: 5 });
    glow(960, 200, 900, '#FFD98A', 0.45);
  }

  function table(t) {
    rrect(160, 790, 1600, 420, 18, { fill: '#B87942', lw: 6 });
    rrect(160, 790, 1600, 40, 14, { fill: '#C98E5B', lw: 6 });
  }

  function dinner(t, lt, dur) {
    if (t >= 152.4) return clinkClose(t, t - 152.4, 153.6 - 152.4);
    const [sx, sy] = shakeXY(t, T_HIT2, 10, 0.3);
    camBegin(960 + sx + lt * 8, 560 + sy, lerp(1.08, 1.16, ease(lt / 3.6)) + 0.02 * Math.exp(-(t - T_HIT2) * 6) * (t > T_HIT2 ? 1 : 0));
    kitchen(t);
    const b = beatOf(t);
    const pour = seg(t, 149.4, 151.2), full = clamp(pour * 1.05);
    const raise = easeOut(seg(t, 151.5, 152.1));
    // the big one
    kid(480, 880, 1.0, {
      who: 'pony', t, eyes: 'happy', mouth: 'grin', blush: 0.5, headRot: Math.sin(b * Math.PI) * 0.04,
      aR: lerp(0.6, 2.4, raise), eR: lerp(1.6, 0.2, raise), aL: 0.4,
      holdR: (x, y) => juiceCup(x + 6, y + 20, 0.9),
    });
    // 아빠, glass held out in both hands the way you do
    const dm = mood(t, [[148.8, 'open', 'smile'], [149.4, 'happy', 'smile'], [T_HIT2, 'star', 'grin', 'sparkle']]);
    person(820, 930, 1.06, {
      role: 'dad', t, ...dm, blush: 0.4 + raise * 0.3, bags: 0.3, jacket: false, looseTie: true,
      aR: lerp(1.25, 2.4, raise), eR: lerp(0.3, 0.2, raise), aL: lerp(0.9, 0.4, raise), eL: lerp(1.2, 0.4, raise),
      holdR: (x, y) => sojuGlass(x + 4, y + 10, 1.1, full),
    });
    // 엄마 pouring
    const tilt = easeInOut(seg(t, 149.0, 149.4)) * (1 - easeInOut(seg(t, 151.2, 151.5)));
    person(1180, 930, 1.0, {
      role: 'mom', t, eyes: 'happy', mouth: 'smile', blush: 0.6,
      aL: lerp(0.5, 1.35, tilt), eL: lerp(0.8, 0.1, tilt), aR: lerp(0.4, 2.3, raise), eR: 0.3,
      holdL: (x, y) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(lerp(0.2, -2.1, tilt));
        sojuBottle(0, 90, 0.75, 0);
        ctx.restore();
      },
      holdR: raise > 0 ? (x, y) => sojuGlass(x, y + 10, 1.0, 1) : undefined,
    });
    // the stream from the bottle into his glass
    if (pour > 0 && pour < 1) {
      const [gx, gy] = [820 + 1.06 * 190, 930 - 1.06 * 236];
      stroke([[gx + 40, gy - 110], [gx + 10, gy - 30], [gx + 4, gy - 8]], '#EAF6FF', 5, { ink: null, smooth: true, alpha: 0.9 });
    }
    // the little one on his booster, drumstick in hand
    person(1500, 820, 1.25, {
      role: 'child', t, eyes: 'happy', mouth: Math.floor(b) % 2 ? 'o' : 'grin', blush: 1, ...dance('bounce', t, 2),
      aR: lerp(2.3 + Math.sin(b * Math.PI) * 0.3, 2.6, raise), eR: 0.2, aL: lerp(0.6, 2.4, raise), eL: 0.3,
      holdL: (x, y) => juiceCup(x, y + 16, 0.8, '#FF7AA8'),
      holdR: raise > 0.5 ? undefined : (x, y) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(0.4);
        smooth(blobPts(0, -40, 26, 8, 0.2, 9), { fill: '#D98A3A', lw: 4 });
        rrect(-6, -16, 12, 30, 5, { fill: '#FFF1D6', lw: 3 });
        ctx.restore();
      },
    });
    table(t);
    chicken(1000, 880, 0.75);
    ell(640, 850, 70, 26, { fill: '#FFFFFF', lw: 5 });
    for (let i = 0; i < 6; i++) rrect(600 + (i % 3) * 26, 824 + Math.floor(i / 3) * 14, 20, 16, 3, { fill: '#FFF6C8', lw: 2.5 });
    sojuBottle(1330, 860, 0.45, 0);
    if (t > T_HIT2 && t < T_HIT2 + 0.8) sfx('크~', 640, 380, 70, PAL.gold, t - T_HIT2, { life: 0.8, font: 'round', rot: -0.1 });
    camEnd();
    edgeGlow('#8A4A2A', 0.3);
  }

  /** The four glasses meeting in the middle. */
  function clinkClose(t, lt, dur) {
    const [sx, sy] = shakeXY(t, T_CLINK, 18, 0.3);
    const k = easeInOut(seg(t, 152.4, T_CLINK)), after = t - T_CLINK;
    const bump = after > 0 ? Math.exp(-after * 9) * Math.sin(after * 30) * 10 : 0;
    camBegin(960 + sx, 520 + sy, 1.0 + 0.04 * clamp(lt / dur));
    // the table from above, blurred and warm
    rrect(-100, -100, W + 200, H + 200, 0, { fill: '#C98E5B', stroke: null });
    glow(960, 520, 900, '#FFD98A', 0.55);
    ctx.save(); ctx.globalAlpha = 0.5;
    chicken(420, 900, 1.6); ell(1560, 880, 170, 70, { fill: '#FFFFFF', stroke: null });
    ctx.restore();
    const arms = [
      { from: [-80, 1150], sleeve: '#F4F6FA', cup: (x, y) => sojuGlass(x, y, 1.6, 1), ang: -0.35 },
      { from: [2000, 1150], sleeve: '#F29BB0', cup: (x, y) => sojuGlass(x, y, 1.6, 1), ang: 0.35 },
      { from: [-80, 120], sleeve: PAL.navy, cup: (x, y) => juiceCup(x, y, 1.5), ang: -0.2 },
      { from: [2000, 120], sleeve: '#FFC23D', cup: (x, y) => juiceCup(x, y, 1.3, '#FF7AA8'), ang: 0.2 },
    ];
    arms.forEach((a, i) => {
      const side = i % 2 ? 1 : -1, low = i < 2;
      const gx = 960 + side * lerp(560, 70, k) + (side * bump), gy = low ? lerp(760, 560, k) : lerp(430, 520, k);
      const hx = gx - side * 10, hy = gy + 10;
      stroke([a.from, [lerp(a.from[0], hx, 0.6), lerp(a.from[1], hy, 0.6) + (low ? 40 : -20)], [hx + side * 60, hy]], a.sleeve, 70, { olw: 10, smooth: true });
      ctx.save(); ctx.translate(gx, gy + 40); ctx.rotate(a.ang * (1 - k * 0.6));
      a.cup(0, 0);
      ctx.restore();
      circle(hx + side * 40, hy + 10, 36, { fill: PAL.skin, lw: 5 });
    });
    if (after > 0) {
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16, r = 60 + after * 520;
        circle(960 + Math.cos(a) * r, 500 + Math.sin(a) * r * 0.8 + after * after * 400, 9 * (1 - after), { fill: i % 3 ? '#EAF6FF' : '#FFA640', lw: 3 });
      }
      sparkle(960, 470, 120 * Math.exp(-after * 3), '#FFFFFF', after * 3);
      sfx('짠!', 960, 250, 150, PAL.gold, after, { life: 0.6 });
    }
    camEnd();
    fillScreen('#FFFFFF', 0.5 * Math.exp(-after * 10) * (after > 0 ? 1 : 0));
    fillScreen('#F4D9A8', 1 - easeOut(clamp(lt / 0.15)));
  }

  // ---- 153.60 · the parents' race at sports day -----------------------------------------------

  function bunting(t, y, scroll, seed) {
    const cols = [PAL.red, PAL.gold, PAL.blue, PAL.mint, PAL.pink, '#FFFFFF'];
    const x0 = ((-scroll) % 120 + 120) % 120 - 120;
    stroke([[-100, y], [W + 100, y + 20]], PAL.ink, 2, { ink: null });
    for (let i = 0; i < 19; i++) {
      const x = x0 + i * 120, yy = y + (x / W) * 20;
      const n = Math.floor((x - x0) / 120 + scroll / 120);
      poly([[x, yy], [x + 60, yy + 3], [x + 30 + Math.sin(t * 6 + i) * 4, yy + 56]], { fill: cols[((n % 6) + 6 + seed) % 6], lw: 3 });
    }
  }

  function race(t, lt, dur) {
    const speed = 900, scroll = lt * speed;
    const tape = 157.5;
    skyFill([[0, '#5CB6F7'], [0.6, '#BDE6FF'], [1, '#BDE6FF']]);
    camBegin(960, 540, 1.0);
    cloudLayer(t, 140, 0.7, 12, 21);
    // the school behind, the crowd behind the fence
    schoolBuilding(1100 - scroll * 0.08, 520, 0.8, { banner: '가을 운동회' });
    rrect(-100, 520, W + 200, 600, 0, { fill: '#D9A868', lw: 5 });
    for (let i = 0; i < 40; i++) {
      const cx = ((i * 60 - scroll * 0.5) % 2400 + 2400) % 2400 - 200;
      const bounce = Math.abs(Math.sin(t * 8 + i)) * 10;
      circle(cx, 520 - bounce, 26, { fill: [PAL.skin, '#F2C9A0', PAL.skinDk][i % 3], lw: 3 });
      rrect(cx - 26, 540 - bounce, 52, 40, 12, { fill: [PAL.red, PAL.blue, PAL.gold, PAL.mint, '#FFFFFF'][i % 5], lw: 3 });
    }
    rrect(-100, 560, W + 200, 20, 6, { fill: '#FFFFFF', lw: 4 });
    for (let i = 0; i < 30; i++) {
      const fx = ((i * 80 - scroll * 0.9) % 2400 + 2400) % 2400 - 200;
      stroke([[fx, 562], [fx, 610]], '#FFFFFF', 6, { olw: 4 });
    }
    // lane lines
    for (const ly of [700, 860, 1020]) {
      stroke([[-100, ly], [W + 100, ly]], '#FFFFFF', 6, { ink: null, alpha: 0.9 });
    }
    bunting(t, 70, scroll * 0.6, 0);
    bunting(t, 210, scroll * 0.7, 3);
    // the finish: posts, a tape, and the family cheering behind it
    const fx = 960 + (tape - t) * speed * 0.62 + 140;
    const since = t - tape;
    if (fx < W + 400) {
      const b = beatOf(t);
      person(fx + 250, 690, 0.72, { role: 'mom', t, eyes: 'happy', mouth: 'open', blush: 0.8, ...dance('cheer', t, 1), shadow: true });
      kid(fx + 440, 690, 0.72, { who: 'pony', t, eyes: 'happy', mouth: 'open', ...dance('jump', t, 2) });
      person(fx + 600, 690, 0.8, { role: 'child', t, eyes: since > 0 ? 'star' : 'happy', mouth: 'open', blush: 1, ...dance('jump', t, 0) });
      stroke([[fx, 1000], [fx, 610]], '#FFFFFF', 12, { olw: 6 });
      if (since < 0) stroke([[fx, 650], [fx + 10, 1000]], PAL.red, 6, { ink: null });
      else {
        const a = clamp(since / 0.5);
        stroke([[fx, 650], [fx - 60 - a * 200, 700 + a * 150]], PAL.red, 6, { ink: null, smooth: true });
      }
    }
    // the rivals: a coworker's dad and 부장님, who is not built for this
    const lead = kf(t, [[153.6, 380], [155.4, 120], [156.6, -260], [158.4, -700]]);
    const bossX = kf(t, [[153.6, 200], [154.4, 120], [155.4, -280], [156.4, -560], [158.4, -1100]]);
    person(960 + lead, 700, 0.8, { role: 'coworker', t, walk: t * 2.6 + 0.3, run: true, rot: 0.1, eyes: 'determined', mouth: 'open', jacket: false });
    person(960 + bossX, 790, 0.88, {
      role: 'boss', t, walk: t * 2.2, run: true, rot: 0.08, eyes: t > 155.6 ? 'spiral' : 'determined', mouth: 'open', emote: 'sweat', sq: Math.sin(t * 14) * 0.03,
    });
    // 아빠, tie flying, jacket off
    const won = since > 0;
    const pm = mood(t, [[153.6, 'determined', 'flat'], [155.4, 'determined', 'grin'], [tape, 'happy', 'open', 'sparkle']]);
    const dadX = won ? 960 + (since) * 220 : 960;
    person(dadX, 910, 1.0, {
      role: 'dad', t, ...pm, walk: t * (won ? 1.4 : 2.8), run: !won, rot: won ? 0 : 0.14, jacket: false, looseTie: true, blush: 0.8,
      aL: won ? 2.8 : undefined, aR: won ? 2.8 : undefined, eL: won ? 0.1 : undefined, eR: won ? 0.1 : undefined, emote: won ? 'sparkle' : 'sweat',
    });
    if (!won) {
      // the tie streaming out behind him
      const [hx, hy] = headOf(960, 910, 1);
      stroke([[hx, hy + 130], [hx - 70, hy + 130 + Math.sin(t * 20) * 12], [hx - 130, hy + 120]], '#3E6FB8', 16, { olw: 7, smooth: true });
    }
    confetti(t, tape, { n: 80, burst: true });
    camEnd();
    streaks(t, won ? 0.2 : 0.8, '#FFFFFF', 3, -1);
    if (t > tape && t < tape + 0.7) sfx('1등!', 960, 200, 110, PAL.gold, t - tape, { life: 0.8 });
  }

  // ---- 158.40 · asleep on the sofa ------------------------------------------------------------

  const NOTE = [400, 840];

  function stickyNote(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    rrect(-80, -70, 160, 140, 4, { fill: '#FFE66B', lw: 3, shadow: 'rgba(0,0,0,0.25)' });
    rrect(-80, -70, 160, 26, 4, { fill: '#F8D84A', stroke: null });
    ctx.font = `30px ${FONT.round}`; ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('아빠', 0, -14);
    ctx.fillText('수고했어요', 0, 24);
    poly(heartPts(52, 52, 14), { fill: PAL.red, stroke: null });
    ctx.restore();
  }

  function sofa(t, lt, dur) {
    const push = easeInOut(seg(t, 161.4, 163.2));
    const k = ease(clamp(lt / 3));
    const cx = lerp(980 - k * 30, NOTE[0] + 20, push), cy = lerp(540, NOTE[1] - 20, push);
    camBegin(cx, cy, lerp(1.0 + k * 0.06, 3.0, push));
    // a dark living room, a lamp, the TV glow
    rrect(-600, -600, W + 1200, H + 1200, 0, { fill: '#2E3358', stroke: null });
    rrect(-600, 860, W + 1200, 800, 0, { fill: '#3A3452', lw: 5 });
    rrect(1620, 180, 180, 240, 10, { fill: '#46507A', lw: 5 });
    glow(1710, 300, 260, '#FFD98A', 0.5);
    poly([[1650, 420], [1770, 420], [1740, 330], [1680, 330]], { fill: '#F2C94C', lw: 5 });
    glow(1710, 380, 500, '#FFD98A', 0.4);
    glow(700, 600, 1100, '#FFCB80', 0.25);
    glow(-100, 700, 700, '#6FA8FF', 0.2 + 0.05 * Math.sin(t * 7));
    // the sofa
    rrect(420, 440, 1080, 300, 60, { fill: '#6A8CB0', lw: 6 });
    rrect(360, 600, 1200, 260, 50, { fill: '#7A9CC0', lw: 6 });
    rrect(330, 560, 130, 300, 50, { fill: '#6A8CB0', lw: 6 });
    rrect(1460, 560, 130, 300, 50, { fill: '#6A8CB0', lw: 6 });
    // the big one asleep against his shoulder
    kid(760, 790, 0.95, { who: 'pony', t, sit: true, eyes: 'closed', mouth: 'o', blush: 0.4, rot: 0.18, headRot: 0.12, aL: 0.3, aR: 0.4, shadow: false });
    // 아빠, head back, gone
    const breathe = Math.sin(t * 2.2) * 0.02;
    person(1010, 760 + 71, 1.02, {
      role: 'dad', t, sit: true, eyes: 'closed', mouth: frac(t * 0.45) < 0.5 ? 'o' : 'open', blush: 0.3, bags: 0.4, jacket: false, looseTie: true,
      headRot: -0.14, rot: -0.03, sq: breathe, aL: 0.5, eL: 0.9, aR: 0.5, eR: 0.9, emote: 'zzz', shadow: false,
    });
    // the little one asleep across his tummy
    ctx.save(); ctx.translate(1080, 660); ctx.rotate(-1.35);
    person(0, 60, 1.05, { role: 'child', t, eyes: 'closed', mouth: 'smile', blush: 1, aL: 2.4, aR: 0.8, eL: 0.3, eR: 0.3, shadow: false, turn: 0.2 });
    ctx.restore();
    // 엄마 brings the blanket over them
    const lay = easeInOut(seg(t, 159.5, 160.9));
    const mx = lerp(1640, 1560, lay);
    const held = [[mx - 260, 470], [mx - 60, 470], [mx - 70, 760], [mx - 250, 780]];
    const laid = [[640, 690], [1320, 640], [1400, 850], [600, 860]];
    const bl = held.map((p, i) => [lerp(p[0], laid[i][0], lay), lerp(p[1], laid[i][1], lay) - Math.sin(lay * Math.PI) * 80]);
    person(mx, 900, 1.0, {
      role: 'mom', t, eyes: lay >= 1 ? 'happy' : 'open', mouth: 'smile', blush: 0.6, aL: lerp(1.9, 1.3, lay), eL: 0.4, aR: 0.5, eR: 0.6,
      headRot: -0.08, emote: t > 161.2 ? 'heart' : null, emoteK: clamp((t - 161.2) / 0.3),
    });
    smooth(bl, { fill: '#F29BB0', lw: 5 });
    ctx.save(); smoothPath(bl); ctx.clip();
    for (let i = 0; i < 40; i++) circle(lerp(560, 1700, hash(i, 1)), lerp(440, 880, hash(i, 2)), 9, { fill: '#FFFFFF', stroke: null, alpha: 0.6 });
    ctx.restore();
    // the briefcase on the floor, and the note stuck to it
    briefcase(NOTE[0] + 10, NOTE[1] - 50, 1.7, -0.04);
    stickyNote(NOTE[0] + 14, NOTE[1] + 22, 0.62, -0.08);
    camEnd();
    fillScreen('#141030', 0.15);
    edgeGlow('#08061A', 0.55);
    // the lights come down from the race
    fillScreen('#141030', 1 - easeOut(seg(t, 158.4, 158.85)));
  }

  // ---- 163.20 · every lit window -----------------------------------------------------------------

  const WIN = [1128, 612];

  function cityBlocks(t, lit, zoom) {
    // far rows, then near rows; each window a flat rectangle (fast)
    const rows = [
      { y: 620, h: [220, 380], w: [120, 200], col: '#3A3F6E', seed: 1, win: 22 },
      { y: 760, h: [260, 420], w: [150, 230], col: '#2C3160', seed: 5, win: 28 },
      { y: 940, h: [280, 470], w: [180, 260], col: '#22264E', seed: 9, win: 34 },
    ];
    for (const r of rows) {
      let x = -300;
      for (let i = 0; x < W + 300; i++) {
        const bw = lerp(r.w[0], r.w[1], hash(i, r.seed)), bh = lerp(r.h[0], r.h[1], hash(i, r.seed + 1));
        rrect(x, r.y - bh, bw, bh + 200, 6, { fill: r.col, stroke: r.seed === 9 ? PAL.ink : null, lw: 4 });
        const cols = Math.max(2, Math.floor(bw / (r.win * 1.6))), nr = Math.floor((bh - 30) / (r.win * 1.3));
        const ww = (bw - 20) / cols - 8;
        for (let a = 0; a < nr; a++) for (let c = 0; c < cols; c++) {
          const h = hash(i * 57 + a, c + r.seed * 13);
          if (h > lit) continue;
          const tone = hash(i + a, c + 3);
          ctx.fillStyle = tone > 0.85 ? '#A8C8FF' : tone > 0.4 ? '#FFE08A' : '#FFC46B';
          ctx.fillRect(x + 12 + c * (ww + 8), r.y - bh + 18 + a * r.win * 1.3, ww, r.win * 0.8);
        }
        x += bw + 16 + hash(i, r.seed + 2) * 30;
      }
    }
  }

  function ourWindow(t) {
    // the window this story lives in: the lamp, the sofa, four sleepers under a pink blanket
    const [x, y] = WIN, w = 36, h = 26;
    ctx.fillStyle = '#FFD98A'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
    ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.moveTo(x + 10, y - 9); ctx.lineTo(x + 16, y - 9); ctx.lineTo(x + 18, y - 4); ctx.lineTo(x + 8, y - 4); ctx.fill();
    ctx.fillStyle = '#6A8CB0'; ctx.beginPath(); ctx.roundRect(x - 14, y - 2, 28, 12, 3); ctx.fill();
    ctx.fillStyle = PAL.skin;
    for (const [hx, hy, r, hc] of [[-7, -2, 2.6, '#7A4A33'], [-1, -3, 3, '#2B2733'], [4, 1, 2.2, '#2F2A3A']]) {
      ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.arc(x + hx, y + hy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(x + hx, y + hy - r * 0.25, r, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    }
    ctx.fillStyle = '#F29BB0'; ctx.beginPath(); ctx.roundRect(x - 12, y + 1, 22, 8, 3); ctx.fill();
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.arc(x + 10, y - 3, 2.8, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#1A1C3A'; ctx.lineWidth = 1.2; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y + h / 2); ctx.stroke();
  }

  function city(t, lt, dur) {
    const k = easeInOut(seg(t, 163.2, 167.4));
    const z0 = 24, z = Math.exp(lerp(Math.log(z0), 0, k));
    const sxp = lerp(960, WIN[0], k), syp = lerp(540, WIN[1], k);
    const cx = WIN[0] - (sxp - 960) / z, cy = WIN[1] - (syp - 540) / z;
    skyFill([[0, '#0E1230'], [0.6, '#232A5C'], [1, '#3A3A70']]);
    stars(t, 90, 17, clamp(k * 1.4), 600);
    camBegin(cx, cy, z);
    moon(1600, 170, 50);
    cityBlocks(t, lerp(0.35, 0.62, seg(t, 164.0, 167.0)), z);
    ourWindow(t);
    camEnd();
    glow(WIN[0], WIN[1], 60 + 200 * (1 - k), '#FFD98A', 0.25);
    edgeGlow('#05061A', 0.45);
  }

  // ---- 168.00 · the end card ---------------------------------------------------------------------

  function endCard(t, lt, dur) {
    KARAOKE.hidden = true;
    rrect(-100, -100, W + 200, H + 200, 0, { fill: PAL.paper, stroke: null });
    glow(960, 460, 800, '#FFE6B0', 0.35);
    // a family of four walking slowly across under the title
    const wx = lerp(560, 1360, lt / dur);
    const walk = lt * 0.8;
    person(wx - 150, 800, 0.36, { role: 'dad', t, walk, eyes: 'happy', mouth: 'smile', jacket: false, looseTie: true, aR: 0.7, eR: 0.2 });
    person(wx - 60, 800, 0.36, { role: 'child', t, walk: walk + 0.3, eyes: 'happy', mouth: 'grin', aL: 0.9, aR: 0.9 });
    person(wx + 20, 800, 0.36, { role: 'mom', t, walk: walk + 0.5, eyes: 'happy', mouth: 'smile', aL: 0.6 });
    kid(wx - 250, 800, 0.4, { who: 'pony', t, walk: walk + 0.7, eyes: 'happy', mouth: 'smile', aR: 0.9 });
    stroke([[240, 806], [1680, 806]], '#D8C3A0', 4, { ink: null });
    // the title and the credit
    const pop = clamp((t - 168.25) / 0.5);
    letter('오늘도 수고했어', 960, 440, 160, '#F2A33D', { pop, lw: 14 });
    for (let i = 0; i < 3; i++) {
      const a = t - 168.6 - i * 0.2;
      if (a > 0) sparkle(560 + i * 400, 330 + (i % 2) * 180, 26 * Math.min(1, a * 3) * (0.8 + 0.2 * Math.sin(t * 4 + i)), PAL.gold, t * 0.5);
    }
    ctx.save(); ctx.globalAlpha = easeOut(seg(t, 169.2, 170.0));
    ctx.font = `44px ${FONT.round}`; ctx.fillStyle = '#6A5A70'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(window.CREDIT || '노래·영상 · Claude Code 로 만들었어요', 960, 920);
    ctx.restore();
    // in from the night, out gently at the very end
    fillScreen('#0E1230', 1 - easeInOut(seg(t, 168.0, 168.7)));
    fillScreen('#1B1530', easeInOut(seg(t, 170.9, 172.1)));
  }

  chapter('family', 139.2, 172.2, [
    [139.2, hanRiver],
    [144.0, familyWalk],
    [148.8, dinner],
    [153.6, race],
    [158.4, sofa],
    [163.2, city],
    [168.0, endCard],
  ]);
})();
