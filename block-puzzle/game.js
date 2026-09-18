/* 블록 퍼즐 - game.js
 * 순수 JS, 빌드 도구 없음. 모바일 터치 드래그에 최적화.
 * 광고 연결: window.AdBridge (아래) + index.html 의 .ad-slot 컨테이너. 자세한 내용은 README.md
 */
(() => {
  'use strict';

  const SIZE = 10;
  const CELLS = SIZE * SIZE;
  const LIFT_PX = 62;          // 터치 드래그 시 손가락 위로 블록을 띄우는 높이(px)
  const ALL_CLEAR_BONUS = 300;
  const STORAGE = {
    best: 'bp_best',
    state: 'bp_state',
    sound: 'bp_sound',
    tutorial: 'bp_tutorial_done',
  };
  const COLORS = ['', '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#63e6e2'];

  // ---------------- 광고 브릿지 ----------------
  // 실제 광고 SDK 를 붙이기 전까지는 콜백만 즉시 실행한다.
  // README.md 의 예시대로 window.AdBridge 를 덮어쓰면 게임 코드는 손댈 필요가 없다.
  const AdBridge = (window.AdBridge = window.AdBridge || {});
  if (typeof AdBridge.showInterstitial !== 'function') AdBridge.showInterstitial = (done) => done();
  if (typeof AdBridge.showRewarded !== 'function') AdBridge.showRewarded = (onReward /* , onFail */) => onReward();

  // ---------------- 블록 정의 ----------------
  const BASE_SHAPES = [
    { name: 'dot',    color: 3, weight: 5, cells: [[0, 0]] },
    { name: 'line2',  color: 8, weight: 8, cells: [[0, 0], [0, 1]] },
    { name: 'line3',  color: 5, weight: 9, cells: [[0, 0], [0, 1], [0, 2]] },
    { name: 'line4',  color: 2, weight: 7, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { name: 'line5',  color: 1, weight: 5, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { name: 'sq2',    color: 4, weight: 8, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { name: 'sq3',    color: 6, weight: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { name: 'rect23', color: 7, weight: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
    { name: 'l3',     color: 2, weight: 8, cells: [[0, 0], [1, 0], [1, 1]] },
    { name: 'l4',     color: 5, weight: 3, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { name: 'j4',     color: 8, weight: 3, cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
    { name: 'l5',     color: 1, weight: 5, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { name: 't4',     color: 6, weight: 5, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { name: 's4',     color: 4, weight: 2, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
    { name: 'z4',     color: 7, weight: 2, cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  ];

  function normalize(cells) {
    const minR = Math.min(...cells.map((c) => c[0]));
    const minC = Math.min(...cells.map((c) => c[1]));
    return cells
      .map(([r, c]) => [r - minR, c - minC])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  function rotateCW(cells) {
    const maxR = Math.max(...cells.map((c) => c[0]));
    return normalize(cells.map(([r, c]) => [c, maxR - r]));
  }
  function uniqueRotations(cells) {
    const out = [];
    const seen = new Set();
    let cur = normalize(cells);
    for (let i = 0; i < 4; i++) {
      const key = JSON.stringify(cur);
      if (!seen.has(key)) { seen.add(key); out.push(cur); }
      cur = rotateCW(cur);
    }
    return out;
  }

  const SHAPES = [];
  const SHAPE_BY_KEY = new Map();
  for (const base of BASE_SHAPES) {
    const rots = uniqueRotations(base.cells);
    rots.forEach((cells, i) => {
      const shape = {
        key: `${base.name}/${i}`,
        name: base.name,
        color: base.color,
        weight: base.weight / rots.length,
        cells,
        h: Math.max(...cells.map((c) => c[0])) + 1,
        w: Math.max(...cells.map((c) => c[1])) + 1,
        big: cells.length >= 5,
      };
      SHAPES.push(shape);
      SHAPE_BY_KEY.set(shape.key, shape);
    });
  }

  // ---------------- 상태 ----------------
  const state = {
    grid: new Array(CELLS).fill(0),   // 0 = 빈칸, 1~8 = 색
    tray: [null, null, null],         // shape key 또는 null
    score: 0,
    best: 0,
    combo: 0,
    lines: 0,
    undoLeft: 1,
    over: false,
  };
  let snapshot = null;      // 되돌리기용 직전 상태
  let bestAtStart = 0;      // 이번 판 시작 시점의 최고 점수(신기록 판정)
  let tutorialDone = false;
  let shownScore = 0;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 사생활 보호 모드 등 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const fmt = (n) => Number(n).toLocaleString('ko-KR');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const idx = (r, c) => r * SIZE + c;

  // ---------------- DOM ----------------
  const $ = (s) => document.querySelector(s);
  const adTop = $('#ad-top');
  const boardWrap = $('#board-wrap');
  const boardEl = $('#board');
  const fxCanvas = $('#fx');
  const fxText = $('#fx-text');
  const trayEl = $('#tray');
  const slotEls = Array.from(trayEl.querySelectorAll('.slot'));
  const hintEl = $('#hint');
  const dragLayer = $('#drag-layer');
  const scoreEl = $('#score');
  const bestEl = $('#best');
  const undoBtn = $('#undoBtn');
  const undoBadge = $('#undoBadge');
  const soundBtn = $('#soundBtn');
  const newBtn = $('#newBtn');
  const overlay = $('#overlay');
  const finalScore = $('#finalScore');
  const finalBest = $('#finalBest');
  const finalLines = $('#finalLines');
  const newRecord = $('#newRecord');
  const restartBtn = $('#restartBtn');
  const shareBtn = $('#shareBtn');
  const confirmEl = $('#confirm');
  const confirmYes = $('#confirmYes');
  const confirmNo = $('#confirmNo');
  const toastEl = $('#toast');

  const cellEls = [];
  for (let i = 0; i < CELLS; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.c = '0';
    d.setAttribute('role', 'gridcell');
    boardEl.appendChild(d);
    cellEls.push(d);
  }
  const renderedTray = [null, null, null];

  // ---------------- 규칙 ----------------
  function canPlace(grid, shape, r, c) {
    if (r < 0 || c < 0 || r + shape.h > SIZE || c + shape.w > SIZE) return false;
    for (const [dr, dc] of shape.cells) if (grid[idx(r + dr, c + dc)]) return false;
    return true;
  }
  function canPlaceAnywhere(grid, shape) {
    for (let r = 0; r <= SIZE - shape.h; r++) {
      for (let c = 0; c <= SIZE - shape.w; c++) if (canPlace(grid, shape, r, c)) return true;
    }
    return false;
  }
  function anyMoveLeft() {
    return state.tray.some((k) => k && canPlaceAnywhere(state.grid, SHAPE_BY_KEY.get(k)));
  }
  function completedLines(grid) {
    const rows = [];
    const cols = [];
    for (let r = 0; r < SIZE; r++) {
      let full = true;
      for (let c = 0; c < SIZE; c++) if (!grid[idx(r, c)]) { full = false; break; }
      if (full) rows.push(r);
    }
    for (let c = 0; c < SIZE; c++) {
      let full = true;
      for (let r = 0; r < SIZE; r++) if (!grid[idx(r, c)]) { full = false; break; }
      if (full) cols.push(c);
    }
    return { rows, cols };
  }

  // 초반에는 큰 블록이 덜 나오고, 점수가 오를수록 정상 비율로 돌아온다.
  function pickShape() {
    const diff = clamp(state.score / 1500, 0, 1);
    const weights = SHAPES.map((s) => (s.big ? s.weight * (0.45 + 0.55 * diff) : s.weight));
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < SHAPES.length; i++) {
      x -= weights[i];
      if (x <= 0) return SHAPES[i];
    }
    return SHAPES[SHAPES.length - 1];
  }
  // 세 블록 모두 놓을 곳이 없는 조합은 몇 번 다시 뽑는다(억울한 게임오버 완화).
  function refillTray() {
    let tray = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      tray = [pickShape().key, pickShape().key, pickShape().key];
      if (tray.some((k) => canPlaceAnywhere(state.grid, SHAPE_BY_KEY.get(k)))) break;
    }
    state.tray = tray;
  }

  function placePiece(slot, row, col) {
    const shape = SHAPE_BY_KEY.get(state.tray[slot]);
    snapshot = {
      grid: state.grid.slice(), tray: state.tray.slice(),
      score: state.score, best: state.best, combo: state.combo, lines: state.lines,
    };

    const placedIdx = shape.cells.map(([dr, dc]) => idx(row + dr, col + dc));
    placedIdx.forEach((i) => { state.grid[i] = shape.color; });
    state.tray[slot] = null;

    const { rows, cols } = completedLines(state.grid);
    const lines = rows.length + cols.length;
    const cleared = new Set();
    rows.forEach((r) => { for (let c = 0; c < SIZE; c++) cleared.add(idx(r, c)); });
    cols.forEach((c) => { for (let r = 0; r < SIZE; r++) cleared.add(idx(r, c)); });

    let gained = shape.cells.length;
    if (lines > 0) {
      state.combo += 1;
      gained += (10 * lines * (lines + 1) / 2) * state.combo;
      state.lines += lines;
    } else {
      state.combo = 0;
    }

    const popCells = Array.from(cleared, (i) => [i, state.grid[i]]);
    cleared.forEach((i) => { state.grid[i] = 0; });
    const allClear = lines > 0 && state.grid.every((v) => v === 0);
    if (allClear) gained += ALL_CLEAR_BONUS;

    state.score += gained;
    if (state.score > state.best) {
      state.best = state.score;
      store.set(STORAGE.best, String(state.best));
    }
    if (state.tray.every((k) => k === null)) refillTray();

    render();

    // 연출
    placedIdx.forEach((i) => restartAnim(cellEls[i], 'placed'));
    const cx = col + shape.w / 2;
    const cy = row + shape.h / 2;
    if (popCells.length) animateClear(popCells, cx, cy);
    showGain(gained, lines, state.combo, allClear, cx, cy);
    if (lines > 0) {
      Sound.clear(lines, state.combo);
      vibrate(lines > 1 ? [18, 40, 28] : 16);
      restartAnim(scoreEl, 'bump');
    } else {
      Sound.place();
      vibrate(8);
    }

    if (!tutorialDone) {
      tutorialDone = true;
      store.set(STORAGE.tutorial, '1');
      hintEl.classList.add('hidden');
    }
    saveState();
    if (!anyMoveLeft()) setTimeout(gameOver, 520);
  }

  function undo() {
    if (drag || state.over || !snapshot) return;
    const apply = () => {
      if (!snapshot || state.over) return;
      state.grid = snapshot.grid;
      state.tray = snapshot.tray;
      state.score = snapshot.score;
      state.best = snapshot.best;
      state.combo = snapshot.combo;
      state.lines = snapshot.lines;
      snapshot = null;
      store.set(STORAGE.best, String(state.best));
      render();
      saveState();
      Sound.pick();
      toast('한 수 되돌렸어요');
    };
    if (state.undoLeft > 0) {
      state.undoLeft -= 1;
      apply();
    } else {
      AdBridge.showRewarded(apply, () => toast('광고를 끝까지 보면 되돌릴 수 있어요'));
    }
  }

  function gameOver() {
    if (state.over || anyMoveLeft()) return;
    state.over = true;
    finalScore.textContent = fmt(state.score);
    finalBest.textContent = fmt(state.best);
    finalLines.textContent = fmt(state.lines);
    newRecord.classList.toggle('hidden', !(state.score > 0 && state.score > bestAtStart));
    overlay.classList.remove('hidden');
    render();
    Sound.over();
    vibrate([30, 60, 30]);
    store.del(STORAGE.state);
  }

  function newGame() {
    state.grid = new Array(CELLS).fill(0);
    state.tray = [null, null, null];
    state.score = 0;
    state.combo = 0;
    state.lines = 0;
    state.undoLeft = 1;
    state.over = false;
    snapshot = null;
    bestAtStart = state.best;
    shownScore = 0;
    refillTray();
    overlay.classList.add('hidden');
    hintEl.classList.toggle('hidden', tutorialDone);
    render();
    saveState();
  }

  // ---------------- 저장 / 복원 ----------------
  function saveState() {
    if (state.over) return;
    store.set(STORAGE.state, JSON.stringify({
      v: 1,
      grid: state.grid, tray: state.tray,
      score: state.score, combo: state.combo, lines: state.lines,
      undoLeft: state.undoLeft, bestAtStart, snapshot,
    }));
  }
  function validGrid(g) {
    return Array.isArray(g) && g.length === CELLS && g.every((v) => Number.isInteger(v) && v >= 0 && v < COLORS.length);
  }
  function validTray(t) {
    return Array.isArray(t) && t.length === 3 && t.every((k) => k === null || SHAPE_BY_KEY.has(k));
  }
  function loadState() {
    let s;
    try { s = JSON.parse(store.get(STORAGE.state)); } catch (e) { return false; }
    if (!s || s.v !== 1 || !validGrid(s.grid) || !validTray(s.tray)) return false;
    if (!s.tray.some((k) => k && canPlaceAnywhere(s.grid, SHAPE_BY_KEY.get(k)))) return false;
    state.grid = s.grid;
    state.tray = s.tray;
    state.score = Math.max(0, Number(s.score) || 0);
    state.combo = Math.max(0, Number(s.combo) || 0);
    state.lines = Math.max(0, Number(s.lines) || 0);
    state.undoLeft = Number.isInteger(s.undoLeft) ? s.undoLeft : 1;
    state.over = false;
    bestAtStart = Number(s.bestAtStart) || state.best;
    const snap = s.snapshot;
    snapshot = snap && validGrid(snap.grid) && validTray(snap.tray)
      ? { grid: snap.grid, tray: snap.tray, score: Number(snap.score) || 0, best: Number(snap.best) || state.best, combo: Number(snap.combo) || 0, lines: Number(snap.lines) || 0 }
      : null;
    return true;
  }

  // ---------------- 렌더 ----------------
  function buildPiece(shape) {
    const el = document.createElement('div');
    el.className = 'piece';
    el.style.setProperty('--w', shape.w);
    el.style.setProperty('--h', shape.h);
    for (const [r, c] of shape.cells) {
      const d = document.createElement('div');
      d.className = 'pc';
      d.dataset.c = String(shape.color);
      d.style.setProperty('--r', r);
      d.style.setProperty('--c', c);
      el.appendChild(d);
    }
    return el;
  }

  function render() {
    for (let i = 0; i < CELLS; i++) cellEls[i].dataset.c = String(state.grid[i]);
    slotEls.forEach((slotEl, s) => {
      const key = state.tray[s];
      if (renderedTray[s] !== key) {
        slotEl.innerHTML = '';
        if (key) slotEl.appendChild(buildPiece(SHAPE_BY_KEY.get(key)));
        renderedTray[s] = key;
      }
      slotEl.classList.remove('lifted');
      slotEl.classList.toggle('empty', !key);
      slotEl.classList.toggle('dead', !!key && !canPlaceAnywhere(state.grid, SHAPE_BY_KEY.get(key)));
    });
    animateScore();
    bestEl.textContent = fmt(state.best);
    undoBtn.disabled = !snapshot || state.over;
    undoBadge.textContent = state.undoLeft > 0 ? '무료' : '광고';
    undoBadge.classList.toggle('ad', state.undoLeft <= 0);
  }

  let scoreRaf = 0;
  function animateScore() {
    cancelAnimationFrame(scoreRaf);
    const from = shownScore;
    const to = state.score;
    if (from === to) { scoreEl.textContent = fmt(to); return; }
    const t0 = performance.now();
    const dur = 420;
    const step = (t) => {
      const k = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      shownScore = Math.round(from + (to - from) * e);
      scoreEl.textContent = fmt(shownScore);
      if (k < 1) scoreRaf = requestAnimationFrame(step);
    };
    scoreRaf = requestAnimationFrame(step);
  }

  function restartAnim(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // 화면 크기에 맞춰 셀 크기를 정한다. 세로로 판 + 트레이 + 버튼이 한 화면에 들어가게.
  function layout() {
    // clientWidth 는 핀치 줌/가로 넘침에 영향을 받지 않는 레이아웃 뷰포트 폭
    const vw = Math.min(document.documentElement.clientWidth || window.innerWidth, 560);
    const vh = window.innerHeight;
    const above = boardWrap.getBoundingClientRect().top + window.scrollY;
    const byWidth = (vw - 32) / SIZE;
    const byHeight = (vh - above - 110) / 12.5;
    const cell = clamp(Math.floor(Math.min(byWidth, byHeight)), 24, 52);
    document.documentElement.style.setProperty('--cell', `${cell}px`);
    FX.resize();
  }

  // ---------------- 드래그 ----------------
  let drag = null;
  let ghostDirty = false;

  function boardMetrics() {
    const rect = boardEl.getBoundingClientRect();
    return { rect, cell: (rect.width - 8) / SIZE, left: rect.left + 4, top: rect.top + 4 };
  }

  function onPointerDown(e) {
    if (drag || state.over || !confirmEl.classList.contains('hidden')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const slotEl = e.target.closest('.slot');
    if (!slotEl) return;
    const slot = Number(slotEl.dataset.slot);
    const key = state.tray[slot];
    if (!key) return;
    e.preventDefault();
    Sound.unlock();

    const shape = SHAPE_BY_KEY.get(key);
    const m = boardMetrics();
    const wrap = document.createElement('div');
    wrap.className = 'drag-wrap';
    wrap.appendChild(buildPiece(shape));
    dragLayer.appendChild(wrap);

    const pw = shape.w * m.cell;
    const ph = shape.h * m.cell;
    const touch = e.pointerType !== 'mouse';
    drag = {
      slot, slotEl, shape, wrap,
      pointerId: e.pointerId,
      ax: -pw / 2,
      ay: touch ? -(ph + LIFT_PX) : -ph / 2,
      row: null, col: null, valid: false,
      startX: e.clientX, startY: e.clientY, moved: false,
    };
    boardEl.style.setProperty('--gc', COLORS[shape.color]);
    slotEl.classList.add('lifted');
    hintEl.classList.add('hidden');
    try { slotEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    Sound.pick();
    moveDrag(e.clientX, e.clientY);
  }

  function moveDrag(x, y) {
    if (!drag.moved && Math.hypot(x - drag.startX, y - drag.startY) > 8) drag.moved = true;
    const left = x + drag.ax;
    const top = y + drag.ay;
    drag.wrap.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    const m = boardMetrics();
    const col = Math.round((left - m.left) / m.cell);
    const row = Math.round((top - m.top) / m.cell);
    if (row === drag.row && col === drag.col) return;
    drag.row = row;
    drag.col = col;
    drag.valid = canPlace(state.grid, drag.shape, row, col);
    updateGhost();
  }

  function updateGhost() {
    clearGhost();
    if (!drag || !drag.valid) return;
    const { shape, row, col } = drag;
    const g = state.grid.slice();
    shape.cells.forEach(([dr, dc]) => {
      const i = idx(row + dr, col + dc);
      g[i] = shape.color;
      cellEls[i].classList.add('ghost');
    });
    const { rows, cols } = completedLines(g);
    rows.forEach((r) => { for (let c = 0; c < SIZE; c++) cellEls[idx(r, c)].classList.add('will-clear'); });
    cols.forEach((c) => { for (let r = 0; r < SIZE; r++) cellEls[idx(r, c)].classList.add('will-clear'); });
    ghostDirty = true;
  }
  function clearGhost() {
    if (!ghostDirty) return;
    cellEls.forEach((el) => el.classList.remove('ghost', 'will-clear'));
    ghostDirty = false;
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  }
  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag(false);
  }
  function onPointerCancel(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag(true);
  }

  function endDrag(cancelled) {
    const d = drag;
    drag = null;
    try { d.slotEl.releasePointerCapture(d.pointerId); } catch (err) { /* ignore */ }
    clearGhost();
    // 손가락을 거의 움직이지 않은 탭은 놓기로 치지 않는다(실수 방지).
    if (!cancelled && d.valid && d.moved) {
      d.wrap.remove();
      d.slotEl.classList.remove('lifted');
      placePiece(d.slot, d.row, d.col);
      return;
    }
    // 놓을 수 없는 자리: 트레이로 되돌아가는 연출
    const sr = d.slotEl.getBoundingClientRect();
    const m = boardMetrics();
    const pw = d.shape.w * m.cell;
    const ph = d.shape.h * m.cell;
    d.wrap.classList.add('returning');
    d.wrap.style.transform = `translate3d(${sr.left + sr.width / 2 - pw / 2}px, ${sr.top + sr.height / 2 - ph / 2}px, 0) scale(.5)`;
    setTimeout(() => {
      d.wrap.remove();
      d.slotEl.classList.remove('lifted');
      if (!tutorialDone && !state.over) hintEl.classList.remove('hidden');
    }, 180);
  }

  // ---------------- 연출 ----------------
  const FX = {
    ctx: fxCanvas.getContext('2d'),
    parts: [],
    running: false,
    last: 0,
    w: 0,
    h: 0,
    resize() {
      const r = boardWrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width;
      this.h = r.height;
      fxCanvas.width = Math.round(r.width * dpr);
      fxCanvas.height = Math.round(r.height * dpr);
      fxCanvas.style.width = `${r.width}px`;
      fxCanvas.style.height = `${r.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 200;
        this.parts.push({
          x, y, color,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 120,
          life: 1,
          decay: 1.4 + Math.random() * 1.2,
          size: 2.5 + Math.random() * 3.5,
        });
      }
      if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
      this.start();
    },
    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.tick(t));
    },
    tick(t) {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      const alive = [];
      for (const p of this.parts) {
        p.vy += 640 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        const s = p.size * (0.5 + p.life * 0.5);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        alive.push(p);
      }
      ctx.globalAlpha = 1;
      this.parts = alive;
      if (alive.length) requestAnimationFrame((tt) => this.tick(tt));
      else { this.running = false; ctx.clearRect(0, 0, this.w, this.h); }
    },
  };

  function animateClear(popCells, cx, cy) {
    const m = boardMetrics();
    popCells.forEach(([i, color]) => {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      const delay = Math.min(260, Math.round(Math.hypot(c + 0.5 - cx, r + 0.5 - cy) * 22));
      const el = cellEls[i];
      el.style.setProperty('--pc', COLORS[color]);
      el.style.setProperty('--delay', `${delay}ms`);
      restartAnim(el, 'pop');
      setTimeout(() => el.classList.remove('pop'), delay + 420);
      setTimeout(() => FX.burst(4 + (c + 0.5) * m.cell, 4 + (r + 0.5) * m.cell, COLORS[color], 3), delay + 90);
    });
  }

  function showGain(gained, lines, combo, allClear, cx, cy) {
    const m = boardMetrics();
    const x = clamp(4 + cx * m.cell, 36, m.rect.width - 36);
    const y = clamp(4 + cy * m.cell, 20, m.rect.height - 20);
    spawnText(`+${fmt(gained)}`, x, y, false);
    if (lines > 0) {
      const msg = allClear ? '올 클리어!'
        : lines >= 3 ? '환상적!'
        : combo >= 3 ? `콤보 ×${combo}`
        : lines === 2 ? '굉장해요!'
        : combo === 2 ? '콤보 ×2'
        : '좋아요!';
      setTimeout(() => spawnText(msg, m.rect.width / 2, m.rect.height * 0.42, true), 140);
    }
  }
  function spawnText(text, x, y, big) {
    const el = document.createElement('div');
    el.className = big ? 'gain big' : 'gain';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    fxText.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ---------------- 소리 / 진동 ----------------
  const Sound = {
    ctx: null,
    on: store.get(STORAGE.sound) !== '0',
    unlock() {
      if (!this.on) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!this.ctx) this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { this.ctx = null; }
    },
    tone(freq, dur, type, vol, delay, slideTo) {
      if (!this.on || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime + (delay || 0);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t0);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
      } catch (e) { /* ignore */ }
    },
    pick() { this.tone(660, 0.05, 'sine', 0.035); },
    place() { this.tone(300, 0.09, 'triangle', 0.09, 0, 210); },
    clear(lines, combo) {
      const n = Math.min(6, lines + 1 + Math.min(combo, 2));
      for (let i = 0; i < n; i++) this.tone(523 * Math.pow(2, i / 5), 0.16, 'triangle', 0.09, i * 0.06);
    },
    over() {
      this.tone(392, 0.28, 'sine', 0.09);
      this.tone(330, 0.3, 'sine', 0.09, 0.25);
      this.tone(262, 0.55, 'sine', 0.09, 0.5);
    },
    toggle() {
      this.on = !this.on;
      store.set(STORAGE.sound, this.on ? '1' : '0');
      if (this.on) { this.unlock(); this.pick(); }
      return this.on;
    },
  };
  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }

  // ---------------- 토스트 / 공유 ----------------
  let toastTimer = 0;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms || 1800);
  }

  async function share() {
    const url = location.href.split('#')[0];
    const text = `블록 퍼즐에서 ${fmt(state.score)}점 기록! 🧩 도전해보세요`;
    if (navigator.share) {
      try { await navigator.share({ title: '블록 퍼즐', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('링크를 복사했어요. 친구에게 붙여넣기!');
    } catch (e) {
      toast('이 브라우저에서는 공유를 지원하지 않아요');
    }
  }

  // ---------------- 이벤트 ----------------
  trayEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  ['contextmenu', 'dragstart', 'selectstart'].forEach((ev) => {
    trayEl.addEventListener(ev, (e) => e.preventDefault());
    boardEl.addEventListener(ev, (e) => e.preventDefault());
  });
  // 드래그 중 페이지 스크롤/당겨서 새로고침 방지 (iOS 사파리 대비)
  document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });

  undoBtn.addEventListener('click', undo);
  soundBtn.addEventListener('click', () => {
    const on = Sound.toggle();
    soundBtn.textContent = on ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(on));
  });
  newBtn.addEventListener('click', () => {
    if (drag || state.over) return;
    if (state.score === 0 && !snapshot) { newGame(); return; }
    confirmEl.classList.remove('hidden');
  });
  confirmNo.addEventListener('click', () => confirmEl.classList.add('hidden'));
  confirmYes.addEventListener('click', () => {
    confirmEl.classList.add('hidden');
    newGame();
    toast('새 게임 시작!');
  });
  restartBtn.addEventListener('click', () => {
    if (restartBtn.disabled) return;
    restartBtn.disabled = true;
    // 게임 오버 뒤 다시 시작할 때가 전면광고를 넣기 가장 자연스러운 시점이다.
    AdBridge.showInterstitial(() => {
      restartBtn.disabled = false;
      newGame();
    });
  });
  shareBtn.addEventListener('click', share);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !confirmEl.classList.contains('hidden')) confirmEl.classList.add('hidden');
  });
  window.addEventListener('resize', layout);
  if ('ResizeObserver' in window) new ResizeObserver(() => layout()).observe(adTop);

  // ---------------- 시작 ----------------
  function init() {
    COLORS.forEach((c, i) => { if (i) document.documentElement.style.setProperty(`--c${i}`, c); });
    state.best = parseInt(store.get(STORAGE.best), 10) || 0;
    tutorialDone = store.get(STORAGE.tutorial) === '1';
    soundBtn.textContent = Sound.on ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(Sound.on));
    layout();
    if (loadState()) {
      shownScore = state.score;
      hintEl.classList.toggle('hidden', tutorialDone);
      render();
      if (state.score > 0) toast('이어서 합니다');
    } else {
      newGame();
    }
    requestAnimationFrame(layout);
  }
  init();
})();
