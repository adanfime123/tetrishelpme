const COLS = 10, ROWS = 20, BLOCK = 20;
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};
const COLORS = {
  I: 'cyan', O: 'yellow', T: 'purple',
  S: 'green', Z: 'red', J: 'blue', L: 'orange'
};
const GRAVITY = 500;
const DAS_DELAY = 100;

function randomShape() {
  const keys = Object.keys(SHAPES);
  const t = keys[Math.floor(Math.random() * keys.length)];
  return { shape: SHAPES[t], color: COLORS[t], type: t };
}

function rotate(matrix, dir = 1) {
  const res = matrix[0].map((_, i) => matrix.map(r => r[i]));
  return dir === 1 ? res.map(r => r.reverse()) : res.reverse();
}

function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = '#111';
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

class Board {
  constructor(canvas, holdDiv, other) {
    this.ctx = canvas.getContext('2d');
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.current = null;
    this.hold = null;
    this.holdLocked = false;
    this.holdDiv = holdDiv;
    this.other = other;
    this.lines = 0;
    this.reviveCountdown = 0;
    this.topped = false;
    this.spawn();
    this.lastMove = {};
    this.moveTimers = {};
  }

  spawn() {
    const piece = randomShape();
    this.current = { ...piece, shape: piece.shape.map(r => r.slice()), x: 3, y: 0 };
    if (this.collides()) {
      this.topped = true;
      this.current = null;
    }
  }

  collides(shape = this.current.shape, x = this.current.x, y = this.current.y) {
    return shape.some((row, dy) =>
      row.some((val, dx) =>
        val && (this.grid[y + dy]?.[x + dx] ?? 1)
      )
    );
  }

  lock() {
    const { shape, x, y, color } = this.current;
    shape.forEach((row, dy) =>
      row.forEach((val, dx) => {
        if (val && this.grid[y + dy]) this.grid[y + dy][x + dx] = color;
      })
    );
    this.clear();
    this.current = null;
    this.holdLocked = false;
    this.spawn();
  }

  clear() {
    const prev = this.lines;
    this.grid = this.grid.filter(row => row.some(cell => !cell));
    const cleared = ROWS - this.grid.length;
    while (this.grid.length < ROWS)
      this.grid.unshift(Array(COLS).fill(0));
    this.lines += cleared;
    if (cleared && this.other && !this.other.topped) {
      for (let i = 0; i < cleared; i++) this.other.addGarbage();
    }
    if (this.other && this.other.topped) {
      this.other.reviveCountdown += cleared;
      if (this.other.reviveCountdown >= 15) this.other.revive();
    }
  }

  addGarbage() {
    this.grid.shift();
    const row = Array(COLS).fill('gray');
    row[Math.floor(Math.random() * COLS)] = 0;
    this.grid.push(row);
  }

  revive() {
    this.topped = false;
    this.reviveCountdown = 0;
    this.spawn();
  }

  holdPiece() {
    if (this.holdLocked || this.topped) return;
    if (!this.hold) {
      this.hold = this.current;
      this.spawn();
    } else {
      [this.current, this.hold] = [this.hold, this.current];
      this.current.x = 3;
      this.current.y = 0;
    }
    this.holdLocked = true;
    this.drawHold();
  }

  drawHold() {
    this.holdDiv.innerHTML = '';
    if (!this.hold) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 60;
    const ctx = canvas.getContext('2d');
    this.hold.shape.forEach((row, y) =>
      row.forEach((val, x) => {
        if (val) drawBlock(ctx, x, y, this.hold.color);
      })
    );
    this.holdDiv.appendChild(canvas);
  }

  move(dx) {
    if (this.topped || !this.current) return;
    this.current.x += dx;
    if (this.collides()) this.current.x -= dx;
  }

  softDrop() {
    if (this.topped || !this.current) return;
    this.current.y++;
    if (this.collides()) {
      this.current.y--;
      this.lock();
    }
  }

  hardDrop() {
    if (this.topped || !this.current) return;
    while (!this.collides()) this.current.y++;
    this.current.y--;
    this.lock();
  }

  rotate(dir) {
    if (this.topped || !this.current) return;
    const rotated = rotate(this.current.shape, dir);
    if (!this.collides(rotated)) this.current.shape = rotated;
  }

  update(delta) {
    if (this.topped || !this.current) return;
    this.dropTime = (this.dropTime || 0) + delta;
    if (this.dropTime > GRAVITY) {
      this.softDrop();
      this.dropTime = 0;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    this.grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell) drawBlock(this.ctx, x, y, cell);
      })
    );
    if (this.current) {
      const { shape, x, y, color } = this.current;
      shape.forEach((row, dy) =>
        row.forEach((val, dx) => {
          if (val) drawBlock(this.ctx, x + dx, y + dy, color);
        })
      );
    }
  }
}

const canvas1 = document.getElementById('board1');
const canvas2 = document.getElementById('board2');
const hold1 = document.getElementById('hold1');
const hold2 = document.getElementById('hold2');

let board1, board2;
board1 = new Board(canvas1, hold1);
board2 = new Board(canvas2, hold2);
board1.other = board2;
board2.other = board1;

let lastTime = 0;
function loop(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  board1.update(delta);
  board2.update(delta);
  board1.draw();
  board2.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// DAS
const keys = {
  ArrowLeft: -1,
  ArrowRight: 1,
};

let dasTimers = {};

document.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.key === 'z') { board1.rotate(-1); board2.rotate(-1); }
  if (e.key === 'x') { board1.rotate(1); board2.rotate(1); }
  if (e.key === 'c') { board1.holdPiece(); board2.holdPiece(); }
  if (e.key === 'ArrowDown') { board1.softDrop(); board2.softDrop(); }
  if (e.key === 'ArrowUp') { board1.hardDrop(); board2.hardDrop(); }
  if (keys[e.key] !== undefined) {
    const dx = keys[e.key];
    board1.move(dx);
    board2.move(dx);
    dasTimers[e.key] = setTimeout(() => {
      const repeat = () => {
        board1.move(dx);
        board2.move(dx);
        dasTimers[e.key] = setTimeout(repeat, 50);
      };
      repeat();
    }, DAS_DELAY);
  }
});

document.addEventListener('keyup', e => {
  if (dasTimers[e.key]) {
    clearTimeout(dasTimers[e.key]);
    delete dasTimers[e.key];
  }
});
