(() => {
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const scoreBlueEl = document.getElementById('scoreBlue');
  const scoreRedEl = document.getElementById('scoreRed');
  const timerEl = document.getElementById('timer');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const restartBtn = document.getElementById('restartBtn');

  const GOAL_WIDTH = 140;
  const GOAL_DEPTH = 22;
  const GOAL_TOP = H / 2 - GOAL_WIDTH / 2;
  const GOAL_BOTTOM = H / 2 + GOAL_WIDTH / 2;

  const MATCH_SECONDS = 150;

  const FRICTION = 0.985;
  const PLAYER_SPEED = 3.6;
  const SPRINT_MULT = 1.65;
  const CHARGE_SLOW = 0.45;
  const PLAYER_RADIUS = 16;
  const GK_RADIUS = 17;
  const BALL_RADIUS = 9;

  const STAMINA_MAX = 100;
  const STAMINA_DRAIN = 0.045; // per ms while sprinting
  const STAMINA_REGEN = 0.03; // per ms while not sprinting

  const SHOT_MIN_POWER = 6.5;
  const SHOT_MAX_POWER = 19;
  const CHARGE_MAX_MS = 850;

  const DRIBBLE_RANGE = PLAYER_RADIUS + BALL_RADIUS + 12;
  const DRIBBLE_STRENGTH = 0.03;
  const TACKLE_RANGE = PLAYER_RADIUS + BALL_RADIUS + 16;

  const PASS_MIN_POWER = 7;
  const PASS_MAX_POWER = 13;
  const SHOOT_RANGE = 360;

  const GK_BASE_X_BLUE = 34;
  const GK_BASE_X_RED = W - 34;
  const GK_SPEED = 3.1;

  const DIFFICULTY_PRESETS = {
    easy: { cpuSpeedMult: 0.78, tackleSuccess: 0.72, kickCooldown: 750, gkStepOut: 16, shotPowerMult: 0.8 },
    normal: { cpuSpeedMult: 0.92, tackleSuccess: 0.55, kickCooldown: 550, gkStepOut: 26, shotPowerMult: 1.0 },
    hard: { cpuSpeedMult: 1.08, tackleSuccess: 0.35, kickCooldown: 380, gkStepOut: 34, shotPowerMult: 1.15 },
  };
  let difficulty = 'normal';
  let cfg = DIFFICULTY_PRESETS[difficulty];

  let keys = {};
  let paused = false;
  let gameOver = false;
  let timeLeft = MATCH_SECONDS;
  let lastTick = performance.now();

  // phase: 'menu' | 'countdown' | 'playing' | 'celebrate' | 'ended'
  let phase = 'menu';
  let countdownMs = 0;
  let celebrateMs = 0;
  let celebrateScorer = null;
  let shake = 0;
  let particles = [];

  // ---------- audio ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function playTone(freq, dur, type, vol, delay) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }
  function playKick(power) {
    playTone(180 + power * 9, 0.09, 'square', 0.13);
  }
  function playTackle() {
    playTone(140, 0.07, 'sawtooth', 0.12);
  }
  function playWhistle() {
    playTone(1300, 0.28, 'sine', 0.09);
  }
  function playGoal() {
    playTone(523, 0.14, 'square', 0.13, 0);
    playTone(659, 0.14, 'square', 0.13, 0.13);
    playTone(784, 0.22, 'square', 0.15, 0.26);
  }
  function playCountBeep() {
    playTone(700, 0.1, 'sine', 0.08);
  }

  // ---------- helpers ----------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function makeOutfield(x, y, team) {
    return {
      x, y, vx: 0, vy: 0, radius: PLAYER_RADIUS, team,
      facingX: team === 'blue' ? 1 : -1, facingY: 0,
      charging: false, chargeStart: 0, stamina: STAMINA_MAX,
      kickCooldownUntil: 0,
    };
  }
  function makeGK(x, y, team) {
    return { x, y, vx: 0, vy: 0, radius: GK_RADIUS, team, role: 'gk' };
  }

  let state;

  function resetPositions() {
    state = {
      player: makeOutfield(W * 0.30, H / 2 - 60, 'blue'),
      teammate: makeOutfield(W * 0.24, H / 2 + 90, 'blue'),
      teammateGK: makeGK(GK_BASE_X_BLUE, H / 2, 'blue'),
      cpu: makeOutfield(W * 0.68, H / 2 + 60, 'red'),
      cpuMate: makeOutfield(W * 0.74, H / 2 - 90, 'red'),
      cpuGK: makeGK(GK_BASE_X_RED, H / 2, 'red'),
      ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, spin: 0 },
      scoreBlue: state ? state.scoreBlue : 0,
      scoreRed: state ? state.scoreRed : 0,
    };
  }

  function startCountdown() {
    phase = 'countdown';
    countdownMs = 3000;
  }

  function showDifficultyMenu() {
    phase = 'menu';
    document.getElementById('difficulty-menu').classList.remove('hidden');
  }

  function fullReset() {
    resetPositions();
    state.scoreBlue = 0;
    state.scoreRed = 0;
    timeLeft = MATCH_SECONDS;
    gameOver = false;
    paused = false;
    particles = [];
    shake = 0;
    overlay.classList.add('hidden');
    updateScoreHUD();
    timerEl.textContent = formatTime(timeLeft);
    lastTick = performance.now();
    startCountdown();
  }

  function updateScoreHUD() {
    scoreBlueEl.textContent = state.scoreBlue;
    scoreRedEl.textContent = state.scoreRed;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    ensureAudio();
    if (!keys[k] && k === ' ') {
      onSpaceDown();
    }
    if (!keys[k] && k === 'e') {
      onPassKey();
    }
    keys[k] = true;
    if (e.key === ' ') e.preventDefault();
    if (k === 'p' && !gameOver && phase !== 'menu') {
      paused = !paused;
      if (paused) {
        showOverlay('일시정지');
      } else {
        overlay.classList.add('hidden');
        lastTick = performance.now();
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (k === ' ') onSpaceUp();
  });

  restartBtn.addEventListener('click', fullReset);

  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ensureAudio();
      difficulty = btn.dataset.difficulty;
      cfg = DIFFICULTY_PRESETS[difficulty];
      document.getElementById('difficulty-menu').classList.add('hidden');
      fullReset();
    });
  });

  // ---------- touch controls ----------
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    document.body.classList.add('touch-enabled');

    document.querySelectorAll('.dpad-btn').forEach((btn) => {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        ensureAudio();
        keys[key] = true;
      });
      const release = (e) => {
        e.preventDefault();
        keys[key] = false;
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    const sprintBtn = document.getElementById('btn-sprint');
    sprintBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ensureAudio();
      keys['shift'] = true;
    });
    const releaseSprint = (e) => {
      e.preventDefault();
      keys['shift'] = false;
    };
    sprintBtn.addEventListener('pointerup', releaseSprint);
    sprintBtn.addEventListener('pointercancel', releaseSprint);
    sprintBtn.addEventListener('pointerleave', releaseSprint);

    const passBtn = document.getElementById('btn-pass');
    passBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ensureAudio();
      onPassKey();
    });

    const shootBtn = document.getElementById('btn-shoot');
    shootBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ensureAudio();
      onSpaceDown();
    });
    const releaseShoot = (e) => {
      e.preventDefault();
      onSpaceUp();
    };
    shootBtn.addEventListener('pointerup', releaseShoot);
    shootBtn.addEventListener('pointercancel', releaseShoot);
    shootBtn.addEventListener('pointerleave', releaseShoot);
  }

  function onSpaceDown() {
    if (gameOver || paused || phase !== 'playing') return;
    const p = state.player;
    const d = Math.hypot(state.ball.x - p.x, state.ball.y - p.y);
    if (d < DRIBBLE_RANGE) {
      p.charging = true;
      p.chargeStart = performance.now();
    }
  }

  function onSpaceUp() {
    if (gameOver || phase !== 'playing') return;
    const p = state.player;
    const ball = state.ball;
    if (p.charging) {
      const held = clamp(performance.now() - p.chargeStart, 0, CHARGE_MAX_MS);
      const power = SHOT_MIN_POWER + (SHOT_MAX_POWER - SHOT_MIN_POWER) * (held / CHARGE_MAX_MS);
      p.charging = false;
      const d = Math.hypot(ball.x - p.x, ball.y - p.y);
      if (d < DRIBBLE_RANGE + 6) {
        ball.vx = p.facingX * power;
        ball.vy = p.facingY * power;
        playKick(power);
      }
    } else {
      // not in possession: attempt a tackle if close to the ball while an opponent also nearby
      const d = Math.hypot(ball.x - p.x, ball.y - p.y);
      const cpuD = Math.hypot(ball.x - state.cpu.x, ball.y - state.cpu.y);
      const cpuMateD = Math.hypot(ball.x - state.cpuMate.x, ball.y - state.cpuMate.y);
      const opp = cpuD <= cpuMateD ? state.cpu : state.cpuMate;
      const oppD = Math.min(cpuD, cpuMateD);
      if (d < TACKLE_RANGE && oppD < DRIBBLE_RANGE + 10) {
        if (Math.random() < cfg.tackleSuccess) {
          const away = Math.atan2(ball.y - opp.y, ball.x - opp.x);
          ball.vx += Math.cos(away) * 4.5;
          ball.vy += Math.sin(away) * 4.5;
        }
        playTackle();
      }
    }
  }

  function onPassKey() {
    if (gameOver || paused || phase !== 'playing') return;
    const p = state.player;
    const mate = state.teammate;
    const ball = state.ball;
    const d = Math.hypot(ball.x - p.x, ball.y - p.y);
    if (d < DRIBBLE_RANGE + 6) {
      const vx = mate.x - p.x;
      const vy = mate.y - p.y;
      const l = Math.hypot(vx, vy) || 1;
      const power = clamp(l * 0.045, PASS_MIN_POWER, PASS_MAX_POWER);
      ball.vx = (vx / l) * power;
      ball.vy = (vy / l) * power;
      playKick(power * 0.7);
    }
  }

  function clampToField(obj, radius) {
    const inGoalMouthY = obj.y > GOAL_TOP + 6 && obj.y < GOAL_BOTTOM - 6;
    if (!inGoalMouthY) {
      obj.x = clamp(obj.x, radius, W - radius);
    } else {
      obj.x = clamp(obj.x, -GOAL_DEPTH + radius, W + GOAL_DEPTH - radius);
    }
    obj.y = clamp(obj.y, radius, H - radius);
  }

  function moveEntityWithBall(entity) {
    entity.x += entity.vx;
    entity.y += entity.vy;
    clampToField(entity, entity.radius);
  }

  function updateFacing(entity) {
    const speed = Math.hypot(entity.vx, entity.vy);
    if (speed > 0.15) {
      entity.facingX = entity.vx / speed;
      entity.facingY = entity.vy / speed;
    }
  }

  function handlePlayerInput(dt) {
    const p = state.player;
    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    const moving = dx !== 0 || dy !== 0;

    const sprinting = !!keys['shift'] && p.stamina > 0 && moving && !p.charging;
    let speed = PLAYER_SPEED;
    if (p.charging) speed *= CHARGE_SLOW;
    if (sprinting) speed *= SPRINT_MULT;

    p.vx = (dx / len) * speed;
    p.vy = (dy / len) * speed;

    if (sprinting) {
      p.stamina = clamp(p.stamina - STAMINA_DRAIN * dt, 0, STAMINA_MAX);
    } else {
      p.stamina = clamp(p.stamina + STAMINA_REGEN * dt, 0, STAMINA_MAX);
    }

    updateFacing(p);
  }

  function applyDribblePull(entity) {
    if (entity.charging) return;
    const ball = state.ball;
    const dx = ball.x - entity.x;
    const dy = ball.y - entity.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    if (dist < DRIBBLE_RANGE) {
      const aheadX = entity.x + entity.facingX * (entity.radius + BALL_RADIUS + 6);
      const aheadY = entity.y + entity.facingY * (entity.radius + BALL_RADIUS + 6);
      ball.vx += (aheadX - ball.x) * DRIBBLE_STRENGTH;
      ball.vy += (aheadY - ball.y) * DRIBBLE_STRENGTH;
    }
  }

  function attackGoalX(side) {
    return side === 'blue' ? W + 30 : -30;
  }

  function isMateBetterPlaced(entity, mate, side) {
    const goalX = attackGoalX(side);
    const entityDist = Math.abs(goalX - entity.x);
    const mateDist = Math.abs(goalX - mate.x);
    return mateDist < entityDist - 40;
  }

  // Drives one AI-controlled outfield player. `mate` is its teammate (may be
  // the human player, e.g. when the blue teammate is deciding whether to
  // chase or support). Whichever of the pair is closer to the ball chases it
  // and looks to shoot or pass; the other holds a supporting position.
  function updateAttackerAI(entity, mate, side, now) {
    const ball = state.ball;
    const distSelf = Math.hypot(ball.x - entity.x, ball.y - entity.y);
    const distMate = Math.hypot(ball.x - mate.x, ball.y - mate.y);
    const isChaser = distSelf <= distMate;
    const anchorX = side === 'blue' ? W * 0.32 : W * 0.68;

    if (isChaser) {
      let targetX = ball.x;
      let targetY = ball.y;
      if (distSelf > 260) {
        targetX = ball.x + (anchorX - ball.x) * 0.3;
      }
      const dx = targetX - entity.x;
      const dy = targetY - entity.y;
      const len = Math.hypot(dx, dy) || 1;
      entity.vx = (dx / len) * PLAYER_SPEED * cfg.cpuSpeedMult;
      entity.vy = (dy / len) * PLAYER_SPEED * cfg.cpuSpeedMult;
      updateFacing(entity);

      if (distSelf < DRIBBLE_RANGE && now > entity.kickCooldownUntil) {
        entity.kickCooldownUntil = now + cfg.kickCooldown;
        const goalX = attackGoalX(side);
        const distToGoal = Math.abs(goalX - entity.x);
        const oppGK = side === 'blue' ? state.cpuGK : state.teammateGK;
        const matePosBetter = isMateBetterPlaced(entity, mate, side);

        if (distToGoal < SHOOT_RANGE && (!matePosBetter || Math.random() < 0.5)) {
          const gkY = oppGK.y;
          const targetGoalY = gkY > H / 2 ? GOAL_TOP + 22 : GOAL_BOTTOM - 22;
          const vx = goalX - entity.x;
          const vy = targetGoalY - entity.y;
          const l = Math.hypot(vx, vy) || 1;
          const power = (SHOT_MIN_POWER + Math.random() * (SHOT_MAX_POWER - SHOT_MIN_POWER) * 0.75) * cfg.shotPowerMult;
          ball.vx = (vx / l) * power;
          ball.vy = (vy / l) * power;
          playKick(power);
        } else if (matePosBetter) {
          const vx = mate.x - entity.x;
          const vy = mate.y - entity.y;
          const l = Math.hypot(vx, vy) || 1;
          const power = clamp(l * 0.045, PASS_MIN_POWER, PASS_MAX_POWER);
          ball.vx = (vx / l) * power;
          ball.vy = (vy / l) * power;
          playKick(power * 0.7);
        }
      }
    } else {
      const teamNearBall = Math.min(distSelf, distMate) < 300;
      const supportSide = ball.y < H / 2 ? 1 : -1;
      let targetX, targetY;
      if (teamNearBall) {
        targetX = mate.x + (side === 'blue' ? 70 : -70);
        targetY = clamp(H / 2 + supportSide * H * 0.22, 60, H - 60);
      } else {
        targetX = side === 'blue'
          ? clamp(ball.x - 150, 70, W * 0.45)
          : clamp(ball.x + 150, W * 0.55, W - 70);
        targetY = clamp(ball.y, 80, H - 80);
      }
      const dx = targetX - entity.x;
      const dy = targetY - entity.y;
      const len = Math.hypot(dx, dy) || 1;
      entity.vx = (dx / len) * PLAYER_SPEED * cfg.cpuSpeedMult * 0.85;
      entity.vy = (dy / len) * PLAYER_SPEED * cfg.cpuSpeedMult * 0.85;
      updateFacing(entity);
    }
  }

  function updateGoalkeeper(gk, isLeftSide) {
    const ball = state.ball;
    const baseX = isLeftSide ? GK_BASE_X_BLUE : GK_BASE_X_RED;
    const targetY = clamp(ball.y, GOAL_TOP + 20, GOAL_BOTTOM - 20);

    const ballIsClose = isLeftSide ? ball.x < 190 : ball.x > W - 190;
    let targetX = baseX;
    if (ballIsClose) {
      const offset = clamp((isLeftSide ? ball.x - baseX : baseX - ball.x), 0, cfg.gkStepOut);
      targetX = isLeftSide ? baseX + offset : baseX - offset;
    }

    const dx = targetX - gk.x;
    const dy = targetY - gk.y;
    gk.vx = clamp(dx * 0.15, -GK_SPEED, GK_SPEED);
    gk.vy = clamp(dy * 0.15, -GK_SPEED, GK_SPEED);
  }

  function resolveEntityCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minDist = a.radius + b.radius;
    if (dist < minDist) {
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      clampToField(a, a.radius);
      clampToField(b, b.radius);
    }
  }

  function resolveBallCollision(entity) {
    const ball = state.ball;
    const dx = ball.x - entity.x;
    const dy = ball.y - entity.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minDist = entity.radius + BALL_RADIUS;
    if (dist < minDist) {
      const nx = dx / dist;
      const ny = dy / dist;
      ball.x = entity.x + nx * minDist;
      ball.y = entity.y + ny * minDist;
      clampToField(ball, BALL_RADIUS);
      const speed = Math.hypot(entity.vx, entity.vy);
      ball.vx = nx * (2 + speed * 0.6) + entity.vx * 0.3;
      ball.vy = ny * (2 + speed * 0.6) + entity.vy * 0.3;
    }
  }

  function updateBall(dt) {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    ball.spin += Math.hypot(ball.vx, ball.vy) * 0.06;

    const inGoalMouthY = ball.y > GOAL_TOP + BALL_RADIUS && ball.y < GOAL_BOTTOM - BALL_RADIUS;

    if (!inGoalMouthY) {
      if (ball.x - BALL_RADIUS < 0) {
        ball.x = BALL_RADIUS;
        ball.vx *= -0.6;
      }
      if (ball.x + BALL_RADIUS > W) {
        ball.x = W - BALL_RADIUS;
        ball.vx *= -0.6;
      }
    } else {
      if (ball.x - BALL_RADIUS < -GOAL_DEPTH) {
        scoreGoal('red');
      }
      if (ball.x + BALL_RADIUS > W + GOAL_DEPTH) {
        scoreGoal('blue');
      }
    }

    if (ball.y - BALL_RADIUS < 0) {
      ball.y = BALL_RADIUS;
      ball.vy *= -0.6;
    }
    if (ball.y + BALL_RADIUS > H) {
      ball.y = H - BALL_RADIUS;
      ball.vy *= -0.6;
    }
  }

  function spawnGoalParticles(x, y) {
    particles = [];
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28 + Math.random() * 0.2;
      const spd = 2 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 1,
        color: Math.random() < 0.5 ? '#ffd54d' : '#ffffff',
      });
    }
  }

  function updateParticles() {
    for (const pt of particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= 0.02;
    }
    particles = particles.filter((pt) => pt.life > 0);
  }

  function scoreGoal(scorer) {
    if (gameOver || phase === 'celebrate') return;
    if (scorer === 'blue') state.scoreBlue++;
    else state.scoreRed++;
    updateScoreHUD();
    playGoal();
    spawnGoalParticles(state.ball.x, state.ball.y);
    shake = 14;
    phase = 'celebrate';
    celebrateMs = 1300;
    celebrateScorer = scorer;
  }

  function showOverlay(text) {
    overlayText.textContent = text;
    overlay.classList.remove('hidden');
  }

  function endGame() {
    gameOver = true;
    let result;
    if (state.scoreBlue > state.scoreRed) result = '승리! 🏆';
    else if (state.scoreBlue < state.scoreRed) result = '패배...';
    else result = '무승부';
    showOverlay(`경기 종료 - ${result}\n${state.scoreBlue} : ${state.scoreRed}`);
  }

  function drawField() {
    ctx.clearRect(0, 0, W, H);
    const stripeCount = 10;
    const stripeW = W / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#2b7a2e';
      ctx.fillRect(i * stripeW, 0, stripeW, H);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    ctx.beginPath();
    ctx.moveTo(W / 2, 6);
    ctx.lineTo(W / 2, H - 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.strokeRect(6, H / 2 - 110, 130, 220);
    ctx.strokeRect(W - 136, H / 2 - 110, 130, 220);
    ctx.strokeRect(6, H / 2 - 55, 60, 110);
    ctx.strokeRect(W - 66, H / 2 - 55, 60, 110);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
    ctx.fillRect(W, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
    ctx.strokeRect(-GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
    ctx.strokeRect(W, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
  }

  function drawFacingArrow(entity) {
    const len = entity.radius + 9;
    const tx = entity.x + entity.facingX * len;
    const ty = entity.y + entity.facingY * len;
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }

  function drawOutfield(entity, color) {
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();
    drawFacingArrow(entity);

    if (entity.charging) {
      const held = clamp(performance.now() - entity.chargeStart, 0, CHARGE_MAX_MS);
      const pct = held / CHARGE_MAX_MS;
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, entity.radius + 7, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.strokeStyle = pct > 0.75 ? '#ff4d4d' : '#ffd54d';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  function drawGK(gk, color) {
    ctx.beginPath();
    ctx.arc(gk.x, gk.y, gk.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('GK', gk.x, gk.y + 3);
  }

  function drawBall() {
    const ball = state.ball;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.spin);
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#222';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-BALL_RADIUS * 0.6, 0);
    ctx.lineTo(BALL_RADIUS * 0.6, 0);
    ctx.moveTo(0, -BALL_RADIUS * 0.6);
    ctx.lineTo(0, BALL_RADIUS * 0.6);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawStaminaBar() {
    const p = state.player;
    const w = 34;
    const x = p.x - w / 2;
    const y = p.y - p.radius - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y, w, 5);
    const pct = p.stamina / STAMINA_MAX;
    ctx.fillStyle = pct > 0.3 ? '#4dff88' : '#ff4d4d';
    ctx.fillRect(x, y, w * pct, 5);
  }

  function drawParticles() {
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(pt.life, 0);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCountdown() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 90px sans-serif';
    const secLeft = Math.ceil(countdownMs / 1000);
    ctx.fillText(secLeft > 0 ? String(secLeft) : 'GO!', W / 2, H / 2);
    ctx.restore();
  }

  function drawCelebrate() {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillStyle = celebrateScorer === 'blue' ? '#4da6ff' : '#ff5c5c';
    ctx.fillText(celebrateScorer === 'blue' ? '골! ⚽ (나)' : '골! ⚽ (CPU)', W / 2, H / 2 - 90);
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawField();
    drawGK(state.teammateGK, '#2f6fd1');
    drawGK(state.cpuGK, '#d13f3f');
    drawOutfield(state.cpuMate, '#ff9a80');
    drawOutfield(state.cpu, '#ff5c5c');
    drawOutfield(state.teammate, '#8ecbff');
    drawOutfield(state.player, '#4da6ff');
    drawStaminaBar();
    drawBall();
    drawParticles();
    if (phase === 'countdown') drawCountdown();
    if (phase === 'celebrate') drawCelebrate();
    ctx.restore();
  }

  function tick(now) {
    const dt = Math.min(now - lastTick, 50);
    lastTick = now;

    if (!paused && !gameOver) {
      if (phase === 'countdown') {
        const prevSec = Math.ceil(countdownMs / 1000);
        countdownMs -= dt;
        const curSec = Math.ceil(countdownMs / 1000);
        if (curSec !== prevSec && curSec >= 0) playCountBeep();
        if (countdownMs <= -400) {
          phase = 'playing';
          playWhistle();
        }
      } else if (phase === 'celebrate') {
        celebrateMs -= dt;
        updateParticles();
        if (celebrateMs <= 0) {
          resetPositions();
          updateScoreHUD();
          startCountdown();
        }
      } else if (phase === 'playing') {
        const nowMs = performance.now();
        handlePlayerInput(dt);
        updateAttackerAI(state.teammate, state.player, 'blue', nowMs);
        updateAttackerAI(state.cpu, state.cpuMate, 'red', nowMs);
        updateAttackerAI(state.cpuMate, state.cpu, 'red', nowMs);
        updateGoalkeeper(state.teammateGK, true);
        updateGoalkeeper(state.cpuGK, false);

        moveEntityWithBall(state.player);
        moveEntityWithBall(state.teammate);
        moveEntityWithBall(state.cpu);
        moveEntityWithBall(state.cpuMate);
        moveEntityWithBall(state.teammateGK);
        moveEntityWithBall(state.cpuGK);

        resolveEntityCollision(state.player, state.cpu);
        resolveEntityCollision(state.player, state.cpuMate);
        resolveEntityCollision(state.teammate, state.cpu);
        resolveEntityCollision(state.teammate, state.cpuMate);

        resolveBallCollision(state.player);
        resolveBallCollision(state.teammate);
        resolveBallCollision(state.cpu);
        resolveBallCollision(state.cpuMate);
        resolveBallCollision(state.teammateGK);
        resolveBallCollision(state.cpuGK);

        applyDribblePull(state.player);
        applyDribblePull(state.teammate);
        applyDribblePull(state.cpu);
        applyDribblePull(state.cpuMate);

        updateBall(dt);

        timeLeft -= dt / 1000;
        if (timeLeft <= 0) {
          timeLeft = 0;
          endGame();
        }
        timerEl.textContent = formatTime(timeLeft);
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 0.03);
    }

    draw();
    requestAnimationFrame(tick);
  }

  resetPositions();
  updateScoreHUD();
  timerEl.textContent = formatTime(timeLeft);
  showDifficultyMenu();
  requestAnimationFrame(tick);
})();
