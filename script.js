// FILE: script.js
(() => {
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30; // px
  const canvas = document.getElementById('playfield');
  const ctx = canvas.getContext('2d');
  canvas.width = COLS * BLOCK;
  canvas.height = ROWS * BLOCK;

  const nextCanvas = document.getElementById('next');
  const nCtx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const restartBtn = document.getElementById('restart');

  // Tetromino shapes (matrices)
  const TETROMINOES = {
    I: [
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
      [0,0,0,0]
    ],
    J: [
      [1,0,0],
      [1,1,1],
      [0,0,0]
    ],
    L: [
      [0,0,1],
      [1,1,1],
      [0,0,0]
    ],
    O: [
      [1,1],
      [1,1]
    ],
    S: [
      [0,1,1],
      [1,1,0],
      [0,0,0]
    ],
    T: [
      [0,1,0],
      [1,1,1],
      [0,0,0]
    ],
    Z: [
      [1,1,0],
      [0,1,1],
      [0,0,0]
    ]
  };

  const COLORS = {
    I: '#4ee3ff',
    J: '#4a6cff',
    L: '#ffb24a',
    O: '#ffd24a',
    S: '#5cff7a',
    T: '#c46cff',
    Z: '#ff6b6b',
    '0': '#ffffff'
  };

  // create empty board
  function createMatrix(w, h) {
    const m = [];
    while (h--) m.push(new Array(w).fill(0));
    return m;
  }

  let arena = createMatrix(COLS, ROWS);

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw arena
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = arena[y][x];
        drawCell(x, y, cell ? COLORS[cell] : '#ffffff');
      }
    }
    // draw current piece
    if (player.matrix) {
      const m = player.matrix;
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (m[y][x]) drawCell(player.pos.x + x, player.pos.y + y, COLORS[player.type]);
        }
      }
    }
  }

  // rotate matrix
  function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
  }

  function collide(arena, player) {
    const m = player.matrix;
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] && (arena[player.pos.y + y] && arena[player.pos.y + y][player.pos.x + x]) !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  function merge(arena, player) {
    const m = player.matrix;
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x]) {
          arena[player.pos.y + y][player.pos.x + x] = player.type;
        }
      }
    }
  }

  // 7-bag randomizer
  function createBag() {
    const bag = Object.keys(TETROMINOES).slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  let bag = [];
  function nextPiece() {
    if (!bag.length) bag = createBag();
    const type = bag.pop();
    const matrix = TETROMINOES[type].map(r => r.slice());
    return { type, matrix };
  }

  const player = {
    pos: { x: 3, y: 0 },
    matrix: null,
    type: null
  };

  // spawn
  function spawn() {
    const piece = nextPiece();
    player.type = piece.type;
    player.matrix = piece.matrix;
    player.pos.y = 0;
    player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);
    if (collide(arena, player)) {
      // game over
      gameOver();
    }
    drawNext();
  }

  function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
      player.pos.y--;
      merge(arena, player);
      const cleared = sweep();
      if (cleared > 0) updateScore(cleared);
      spawn();
    }
    dropCounter = 0;
  }

  function hardDrop() {
    while (!collide(arena, player)) {
      player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    const cleared = sweep();
    if (cleared > 0) updateScore(cleared);
    spawn();
    dropCounter = 0;
  }

  function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
  }

  function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
      player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > player.matrix[0].length) {
        rotate(player.matrix, -dir);
        player.pos.x = pos;
        return;
      }
    }
  }

  // clear lines
  let score = 0;
  let lines = 0;
  let level = 1;

  function sweep() {
    let rowCount = 0;
    outer: for (let y = ROWS - 1; y >= 0; --y) {
      for (let x = 0; x < COLS; ++x) {
        if (!arena[y][x]) continue outer;
      }
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      ++rowCount;
      ++y; // check same y again because we shifted
    }
    if (rowCount > 0) {
      lines += rowCount;
      level = Math.floor(lines / 10) + 1;
    }
    return rowCount;
  }

  function updateScore(cleared) {
    // Tetris-like scoring
    const points = [0, 100, 300, 500, 800];
    score += (points[cleared] || 0) * level;
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
  }

  // next preview
  function drawNext() {
    nCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    // show upcoming piece (peek last item in bag)
    const upcoming = bag[bag.length - 1] || null;
    if (!upcoming) return;
    const matrix = TETROMINOES[upcoming];
    const size = matrix.length;
    const cell = Math.floor(nextCanvas.width / (size + 1));
    const offsetX = Math.floor((nextCanvas.width - size * cell)/2);
    const offsetY = Math.floor((nextCanvas.height - size * cell)/2);
    for (let y = 0; y < size; y++){
      for (let x = 0; x < size; x++){
        if (matrix[y][x]){
          nCtx.fillStyle = COLORS[upcoming];
          nCtx.fillRect(offsetX + x*cell + 2, offsetY + y*cell + 2, cell - 4, cell - 4);
        }
      }
    }
  }

  // game over
  let isPaused = false;
  let isGameOver = false;
  function gameOver() {
    isGameOver = true;
    isPaused = true;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, canvas.height/2 - 40, canvas.width, 80);
    ctx.fillStyle = '#b0007a';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over 💫', canvas.width/2, canvas.height/2 + 10);
  }

  // timing
  let dropCounter = 0;
  let dropInterval = 1000; // ms
  let lastTime = 0;

  function update(time = 0) {
    if (isPaused) { lastTime = time; requestAnimationFrame(update); return; }
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    // speed-up with level
    dropInterval = Math.max(100, 1000 - (level - 1) * 80);
    if (dropCounter > dropInterval) {
      playerDrop();
    }
    draw();
    requestAnimationFrame(update);
  }

  // controls
  document.addEventListener('keydown', e => {
    if (isGameOver) return;
    if (e.key === 'ArrowLeft') playerMove(-1);
    else if (e.key === 'ArrowRight') playerMove(1);
    else if (e.key === 'ArrowDown') playerDrop();
    else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'z') playerRotate(1);
    else if (e.code === 'Space') hardDrop();
    else if (e.key.toLowerCase() === 'p') {
      isPaused = !isPaused;
    }
  });

  restartBtn.addEventListener('click', () => startGame());

  function reset() {
    arena = createMatrix(COLS, ROWS);
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
    isPaused = false;
    isGameOver = false;
  }

  function startGame() {
    reset();
    spawn();
    lastTime = 0;
    requestAnimationFrame(update);
  }

  // initialize
  startGame();
})();
