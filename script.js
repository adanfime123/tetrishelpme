const COLS = 10;
const ROWS = 20;
const BLOCK = 20;
const GRAVITY_DELAY = 500;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

const COLORS = {
  I: 'cyan', J: 'blue', L: 'orange', O: 'yellow',
  S: 'lime', T: 'purple', Z: 'red'
};

function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

class TetrisBoard {
  constructor(canvas, id) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.current = null;
    this.hold = null;
    this.dropTimer = 0;
    this.topped = false;
    this.linesCleared = 0;
    this.reviveCountdown = 15;
    this.reviveDisplay = document.getElementById(`revive${id}`);
    this.spawn();
  }

  spawn() {
    const keys = Object.keys(SHAPES);
    const k = keys[Math.floor(Math.random() * keys.length)];
    const shape = SHAPES[k];
    const color = COLORS[k];
    this.current = { shape, x: Math.floor(COLS / 2 - shape[0].length / 2), y: 0, color };
    if (this.collides()) {
      this.topped = true;
      this.current = null;
    }
  }

  collides() {
    const { shape, x, y } = this.current;
    return shape.some((row, dy) =>
      row.some((val, dx) => val &&
        (this.grid[y + dy]?.[x + dx] || y + dy >= ROWS || x + dx < 0 || x + dx >= COLS)));
  }

  lock() {
    const { shape, x, y, color } = this.current;
    shape.forEach((row, dy) =>
      row.forEach((val, dx) => {
        if (val) this.grid[y + dy][x + dx] = color;
      })
    );
    const lines = this.clearLines();
    this.linesCleared += lines;
    if (lines && this.opponent && !this.opponent.topped) {
      this.opponent.addGarbage(lines);
    }
    this.spawn();
  }

  addGarbage(n) {
    for (let i = 0; i < n; i++) {
      this.grid.shift();
      this.grid.push(Array.from({ length: COLS }, () => Math.random() < 0.9 ? 'grey' : null));
    }
  }

  clearLines() {
    let cleared = 0;
    this.grid = this.grid.filter(row => {
      if (row.every(cell => cell)) {
        cleared++;
        return false;
      }
      return true;
    });
    while (this.grid.length < ROWS) {
      this.grid.unshift(Array(COLS).fill(null));
    }
    return cleared;
  }

  tick(delta) {
    if (this.topped || !this.current) return;
    this.dropTimer += delta;
    if (this.dropTimer > GRAVITY_DELAY) {
      this.current.y++;
      if (this.collides()) {
        this.current.y--;
        this.lock();
      }
      this.dropTimer = 0;
    }
  }

  move(dx) {
    if (this.topped || !this.current) return;
    this.current.x += dx;
    if (this.collides()) this.current.x -= dx;
  }

  drop() {
    if (this.topped || !this.current) return;
    while (!this.collides()) this.current.y++;
    this.current.y--;
    this.lock();
  }

  rotate(dir) {
    if (this.topped || !this.current) return;
    const shape = this.current.shape;
    const rotated = shape[0].map((_, i) => shape.map(r => r[i]));
    this.current.shape = dir === 1 ? rotated.map(r => r.reverse()) : rotated.reverse();
    if (this.collides()) this.current.shape = shape;
  }

  holdPiece() {
    if (!this.current || this.topped) return;
    [this.hold, this.current] = [this.current, this.hold];
    if (!this.current) this.spawn();
  }

  revive() {
    if (this.topped && this.linesCleared >= this.reviveCountdown) {
      this.topped = false;
      this.linesCleared = 0;
      this.spawn();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    this.grid.forEach((row, y) => row.forEach((cell, x) => {
      if (cell) drawBlock(this.ctx, x, y, cell);
    }));

    if (!this.topped && this.current) {
      const { shape, x, y, color } = this.current;
      shape.forEach((row, dy) => row.forEach((val, dx) => {
        if (val) drawBlock(this.ctx, x + dx, y + dy, color);
      }));
    }

    this.reviveDisplay.textContent = this.topped ? `TOPPED! Clear ${this.reviveCountdown - this.linesCleared} to revive.` : '';
  }
}

const board1 = new TetrisBoard(document.getElementById('board1'), 1);
const board2 = new TetrisBoard(document.getElementById('board2'), 2);

board1.opponent = board2;
board2.opponent = board1;

let last = 0;
function loop(ts) {
  const delta = ts - last;
  last = ts;
  board1.tick(delta);
  board2.tick(delta);
  board1.revive();
  board2.revive();
  board1.draw();
  board2.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowLeft': board1.move(-1); board2.move(-1); break;
    case 'ArrowRight': board1.move(1); board2.move(1); break;
    case 'ArrowDown': board1.tick(GRAVITY_DELAY); board2.tick(GRAVITY_DELAY); break;
    case 'ArrowUp': board1.drop(); board2.drop(); break;
    case 'x': board1.rotate(1); board2.rotate(1); break;
    case 'z': board1.rotate(-1); board2.rotate(-1); break;
    case 'c': board1.holdPiece(); board2.holdPiece(); break;
  }
});