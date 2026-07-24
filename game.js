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

  const MATCH_SECONDS = 120;

  const FRICTION = 0.985;
  const PLAYER_SPEED = 3.6;
  const PLAYER_RADIUS = 16;
  const BALL_RADIUS = 9;
  const KICK_POWER = 11;
  const PASS_RANGE = 34;

  let keys = {};
  let paused = false;
  let gameOver = false;
  let timeLeft = MATCH_SECONDS;
  let lastTick = performance.now();

  function makePlayer(x, y, isCPU) {
    return { x, y, vx: 0, vy: 0, isCPU, radius: PLAYER_RADIUS };
  }

  let state;

  function resetPositions() {
    state = {
      player: makePlayer(W * 0.25, H / 2, false),
      cpu: makePlayer(W * 0.75, H / 2, true),
      ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
      scoreBlue: state ? state.scoreBlue : 0,
      scoreRed: state ? state.scoreRed : 0,
    };
  }

  function fullReset() {
    resetPositions();
    state.scoreBlue = 0;
    state.scoreRed = 0;
    timeLeft = MATCH_SECONDS;
    gameOver = false;
    paused = false;
    overlay.classList.add('hidden');
    updateScoreHUD();
    lastTick = performance.now();
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
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
    if (e.key.toLowerCase() === 'p' && !gameOver) {
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
    keys[e.key.toLowerCase()] = false;
  });

  restartBtn.addEventListener('click', fullReset);

  function clampToField(entity, r) {
    entity.x = Math.max(r, Math.min(W - r, entity.x));
    entity.y = Math.max(r, Math.min(H - r, entity.y));
  }

  function moveEntityWithBall(entity) {
    entity.x += entity.vx;
    entity.y += entity.vy;

    // allow entering goal mouth area horizontally, otherwise clamp to field bounds
    const inGoalMouthY = entity.y > GOAL_TOP + 6 && entity.y < GOAL_BOTTOM - 6;
    if (!inGoalMouthY) {
      entity.x = Math.max(entity.radius, Math.min(W - entity.radius, entity.x));
    } else {
      entity.x = Math.max(-GOAL_DEPTH + entity.radius, Math.min(W + GOAL_DEPTH - entity.radius, entity.x));
    }
    entity.y = Math.max(entity.radius, Math.min(H - entity.radius, entity.y));
  }

  function handlePlayerInput() {
    let dx = 0, dy = 0;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    state.player.vx = (dx / len) * PLAYER_SPEED;
    state.player.vy = (dy / len) * PLAYER_SPEED;

    if (keys[' ']) {
      tryKick(state.player);
    }
  }

  function tryKick(kicker) {
    const d = Math.hypot(state.ball.x - kicker.x, state.ball.y - kicker.y);
    if (d < PASS_RANGE) {
      const targetX = kicker.isCPU ? -40 : W + 40;
      const targetY = H / 2 + (Math.random() - 0.5) * 40;
      const vx = targetX - kicker.x;
      const vy = targetY - kicker.y;
      const len = Math.hypot(vx, vy) || 1;
      state.ball.vx = (vx / len) * KICK_POWER;
      state.ball.vy = (vy / len) * KICK_POWER;
    }
  }

  function updateCPU() {
    const cpu = state.cpu;
    const ball = state.ball;

    // Simple AI: chase the ball, kick toward player's goal (left side)
    const toBallX = ball.x - cpu.x;
    const toBallY = ball.y - cpu.y;
    const dist = Math.hypot(toBallX, toBallY) || 1;

    // Defensive positioning: hover between ball and own goal when ball is far
    let targetX = ball.x;
    let targetY = ball.y;

    if (dist > 260) {
      targetX = ball.x + (W * 0.75 - ball.x) * 0.3;
      targetY = ball.y;
    }

    const dx = targetX - cpu.x;
    const dy = targetY - cpu.y;
    const len = Math.hypot(dx, dy) || 1;
    cpu.vx = (dx / len) * PLAYER_SPEED * 0.92;
    cpu.vy = (dy / len) * PLAYER_SPEED * 0.92;

    if (dist < PASS_RANGE) {
      const targetGoalX = -40;
      const targetGoalY = H / 2 + (Math.random() - 0.5) * 30;
      const vx = targetGoalX - cpu.x;
      const vy = targetGoalY - cpu.y;
      const l = Math.hypot(vx, vy) || 1;
      ball.vx = (vx / l) * KICK_POWER;
      ball.vy = (vy / l) * KICK_POWER;
    }
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
      // push ball based on entity velocity + push-out
      const speed = Math.hypot(entity.vx, entity.vy);
      ball.vx = nx * (2 + speed * 0.6) + entity.vx * 0.3;
      ball.vy = ny * (2 + speed * 0.6) + entity.vy * 0.3;
    }
  }

  function updateBall() {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

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
      // inside goal mouth column, check for goal scored past the goal line
      if (ball.x - BALL_RADIUS < -GOAL_DEPTH) {
        scoreGoal('blue');
      }
      if (ball.x + BALL_RADIUS > W + GOAL_DEPTH) {
        scoreGoal('red');
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

  function scoreGoal(scorer) {
    if (gameOver) return;
    if (scorer === 'blue') state.scoreBlue++;
    else state.scoreRed++;
    updateScoreHUD();
    flashGoal(scorer);
    resetPositions();
    updateScoreHUD();
  }

  function flashGoal(scorer) {
    paused = true;
    showOverlay(scorer === 'blue' ? '골! ⚽ (나)' : '골! ⚽ (CPU)');
    setTimeout(() => {
      if (!gameOver) {
        paused = false;
        overlay.classList.add('hidden');
        lastTick = performance.now();
      }
    }, 1200);
  }

  function showOverlay(text) {
    overlayText.textContent = text;
    overlay.classList.remove('hidden');
  }

  function endGame() {
    gameOver = true;
    paused = true;
    let result;
    if (state.scoreBlue > state.scoreRed) result = '승리! 🏆';
    else if (state.scoreBlue < state.scoreRed) result = '패배...';
    else result = '무승부';
    showOverlay(`경기 종료 - ${result}\n${state.scoreBlue} : ${state.scoreRed}`);
  }

  function drawField() {
    ctx.clearRect(0, 0, W, H);

    // pitch stripes
    const stripeCount = 10;
    const stripeW = W / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#2b7a2e';
      ctx.fillRect(i * stripeW, 0, stripeW, H);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;

    // outer boundary
    ctx.strokeRect(6, 6, W - 12, H - 12);

    // center line
    ctx.beginPath();
    ctx.moveTo(W / 2, 6);
    ctx.lineTo(W / 2, H - 6);
    ctx.stroke();

    // center circle
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // penalty boxes
    ctx.strokeRect(6, H / 2 - 110, 130, 220);
    ctx.strokeRect(W - 136, H / 2 - 110, 130, 220);
    ctx.strokeRect(6, H / 2 - 55, 60, 110);
    ctx.strokeRect(W - 66, H / 2 - 55, 60, 110);

    // goals
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
    ctx.fillRect(W, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
    ctx.strokeRect(-GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
    ctx.strokeRect(W, GOAL_TOP, GOAL_DEPTH, GOAL_WIDTH);
  }

  function drawPlayer(entity, color) {
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();
  }

  function drawBall() {
    const ball = state.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#222';
    ctx.stroke();
  }

  function draw() {
    drawField();
    drawPlayer(state.cpu, '#ff5c5c');
    drawPlayer(state.player, '#4da6ff');
    drawBall();
  }

  function tick(now) {
    const dt = now - lastTick;
    lastTick = now;

    if (!paused && !gameOver) {
      handlePlayerInput();
      updateCPU();

      moveEntityWithBall(state.player);
      moveEntityWithBall(state.cpu);

      resolveEntityCollision(state.player, state.cpu);
      resolveBallCollision(state.player);
      resolveBallCollision(state.cpu);

      updateBall();

      timeLeft -= dt / 1000;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
      }
      timerEl.textContent = formatTime(timeLeft);
    }

    draw();
    requestAnimationFrame(tick);
  }

  fullReset();
  requestAnimationFrame(tick);
})();
