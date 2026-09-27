// z2_stage: 1절 (7.27 – 21.82). The curtains fly open on the crash: a stage floating on the sea under
// the full moon. Zena sings centre (mic, sing/sway, leaning into every 꺾기), the four chorus 언니들
// clap and sway behind; tinsel flashes on every beat; the caption fills like karaoke lyrics, one line
// per two bars. On the last line the chorus hop forward and everybody sways together.
(() => {
  const Z = window.Z12;
  const CRASH = 7.2727, SLOT = 3.6364, END = 21.8182;
  const S = [7.2727, 10.9091, 14.5455, 18.1818];
  const LINES = [
    '2026년 9월 18일,\n원이의 유튜브 채널',
    '리센느 막내 제나가\n트로트 메들리를 불렀다',
    '“풍성한 추석 보내시라고\n무대를 준비했다”',
    '언니들은 코러스로',
  ];
  const RAINBOW = ['#FF4FA3', '#FFE14D', '#39E6FF', '#5CFF8A', '#8A4DFF', '#FF9A3D'];
  const KSIZE = 70, KY = 1470;

  /** The karaoke caption of slot i, wiping over the slot. */
  function caption(t, i) {
    const s = S[i], hold = i === 3 ? END - 0.02 : s + SLOT - 0.08;
    kLine(t, s + 0.22, s + SLOT - 0.6, LINES[i], { y: i === 3 ? KY + 40 : KY, size: KSIZE, hold });
    if (i === 2) {                                   // "— 제나", small, next to the quote
      const a = clamp((t - (s + 0.22 - 0.35)) / 0.2) * clamp((hold - t) / 0.2);
      if (a <= 0) return;
      ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.font = `${KSIZE}px ${FONT.bold}`;
      const w = ctx.measureText('무대를 준비했다”').width;
      ctx.globalAlpha = a;
      letter('— 제나', 540 + w / 2 + 24, KY + KSIZE * 1.28 + 4, 44, KR.cyan, { align: 'left', font: 'round', lw: 9, shadow: null });
      ctx.restore();
    }
  }

  /** Two coloured spotlights sweeping across the stage, swinging on the bar. */
  function sweeps(t, a = 0.13) {
    const sw = Math.sin(barOf(t) * Math.PI);
    Z.spot(90, 120, 540 + sw * 330, 1390, 40, 280, '#FF7AC8', a);
    Z.spot(990, 120, 540 - sw * 330, 1390, 40, 280, '#7AE8FF', a);
  }

  function verse(i) {
    return (t, lt) => {
      const fromCrash = t - CRASH;
      // ---- camera: reveal, push in on the singer, hold on the quote, pull back for the whole group
      let zoom = 1, cx = 540, cy = 960;
      if (i === 0) { zoom = lerp(1.12, 1, easeOut(clamp(fromCrash / 0.7))) * lerp(1, 1.03, clamp((lt - 0.7) / 2.9)); }
      if (i === 1) { const k = ease(clamp(lt / 3.2)); zoom = lerp(1.03, 1.22, k); cy = lerp(960, 1090, k); }
      if (i === 2) { const k = ease(clamp(lt / 3.6)); zoom = lerp(1.22, 1.14, k); cy = 1090; cx = 540 + Math.sin(lt * 0.9) * 20; }
      if (i === 3) { const k = easeOut(clamp(lt / 0.9)); zoom = lerp(1.14, 1.0, k); cy = lerp(1090, 1000, k); }
      zoom *= 1 + 0.012 * Math.exp(-frac(barOf(t) + 1e-6) * 8);          // a kick on every bar
      const [sx, sy] = shakeXY(t, CRASH, 26, 0.4);
      camBegin(cx + sx, cy + sy, zoom);

      Z.stage(t);
      sweeps(t, i === 2 ? 0.06 : 0.13);
      // the long note of slot 2 gets a trot sunburst behind the singer
      const sb = clamp((t - 12.7273) / 0.2) * clamp((14.2 - t) / 0.3);
      if (sb > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; sunburst(540, 1180, 'rgba(255,79,163,0.18)', 'rgba(255,225,77,0.10)', t * 0.4, 24, 1400, sb); ctx.restore(); }
      if (i === 2) Z.spot(540, 100, 540, 1405, 50, 330, '#FFF3C0', 0.28);

      // ---- the line-up
      const bar = Math.floor(barOf(t) + 1e-6);
      const zPose = bar % 2 ? 'sway' : 'sing';
      let o = { zPose, zLean: Z.leanAt(t) };
      if (i === 0) {
        // the chorus jump from where they peeked (behind the curtains) to the back row
        const k = clamp(fromCrash / 0.45);
        if (k < 1) o.cPos = Z.PEEK.map(([x, y, lean], j) => [lerp(x, Z.BACK[j][0], ease(k)), lerp(y, Z.BACK[j][1], k) - Math.sin(k * Math.PI) * 120, lean * (1 - easeOut(k)), 12]);
        o.cPose = k < 1 ? 'cheer' : 'clap';
      }
      if (i === 1) o.cPose = ['clap', 'sway', 'sway', 'clap'];
      if (i === 2) { o.cPose = 'clap'; o.cDim = 1; }
      if (i === 3) { o.front = clamp((lt - 0.1) / 0.8); o.cPose = o.front < 1 ? 'cheer' : 'sway'; o.zPose = 'sway'; }
      Z.lineup(t, o);

      // 추석 bounty for the quote: songpyeon and persimmons tumble down
      if (i === 2) for (let k = 0; k < 26; k++) {
        const sp = 260 + hash(k, 21) * 260, y = -60 - hash(k, 22) * 700 + lt * sp;
        if (y > 1480) continue;
        const x = 80 + hash(k, 23) * 920 + Math.sin(lt * 2 + k) * 30;
        Z.songpyeon(x, y, 8, k, Math.round(Math.sin(lt * 3 + k) * 2) * 0.15);
      }
      // hearts over the group on the last line
      if (i === 3 && lt > 0.9) for (let k = 0; k < 5; k++) {
        const pt = S[3] + 0.9 + k * 0.4545, age = t - pt;
        if (age < 0 || age > 1.4) continue;
        const hx = [112, 322, 540, 758, 968][(k * 2) % 5], a = 1 - clamp((age - 0.9) / 0.5);
        ctx.save(); ctx.globalAlpha = a; pixelHeart(hx, 1000 - age * 160, 10, [KR.pink, KR.red, KR.pink][k % 3]); ctx.restore();
      }
      Z.bends(t, 540, 1030, { from: CRASH - 0.01, w: 200, gap: 150 });

      camEnd();
      // ---- tinsel curtains (the proscenium, not zoomed): fly open on the crash, flash on every beat
      const open = i === 0 ? lerp(0.58, 1, easeOut(clamp(fromCrash / 0.35))) : 1;
      ctx.save(); ctx.translate(sx * 0.5, sy * 0.5);
      Z.curtains(t, open, { ripple: i === 0 ? 18 * Math.exp(-fromCrash * 3) + 3 : 3, flash: pulse(t, 5) * 0.65, colors: i === 3 ? RAINBOW : undefined });
      ctx.restore();

      // ---- the crash: fireworks and glitter
      if (i === 0) {
        pixelFirework(t, CRASH, 230, 620, 220, KR.yellow);
        pixelFirework(t, CRASH + 0.12, 860, 520, 200, KR.pink);
        pixelFirework(t, CRASH + 0.3, 560, 860, 170, KR.cyan);
        Z.glitter(t, CRASH, 80, 5);
        sfx('쨍!', 540, 760, 150, KR.yellow, fromCrash, { life: 0.7 });
      }
      if (i === 3) { pixelFirework(t, S[3] + 0.9, 200, 640, 180, KR.green); pixelFirework(t, S[3] + 0.9 + B2, 880, 600, 180, KR.pink); }
      Z.twinkles(t, 10, 90 + i, 0, 380, W, 500, 6);
      Z.hud(t, { y: 300 });
      caption(t, i);
      flash(i === 0 ? 0.85 * Math.exp(-fromCrash * 8) : 0, '#FFFFFF');
      Z.crt(t, { a: 0.1 });
    };
  }
  const B2 = 60 / 132;

  chapter('stage', 7.27, 21.82, [[7.27, verse(0)], [10.9091, verse(1)], [14.5455, verse(2)], [18.1818, verse(3)]]);
})();
