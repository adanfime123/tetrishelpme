const ROWS = 20;
const COLS = 10;
const BLOCK = 20;
const GRAVITY_DELAY = 1000 / 60 * 30;

const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  L: [[1,0,0],[1,1,1]],
  J: [[0,0,1],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
};

const COLORS = {
  I: 'cyan',
  O: 'yellow',
  T: 'purple',
  L: 'orange',
  J: 'blue',
  S: 'green',
  Z: 'red'
};

const canvas1 = document.getElementById("board1");
const canvas2 = document.getElementById("board2");
const holdCanvas = document.getElementById("hold");
const ctx1 = canvas1.getContext("2d");
const ctx2 = canvas2.getContext("2d");
const holdCtx = holdCanvas.getContext("2d");

class Tetris {
  constructor(ctx, id) {
    this.ctx = ctx;
    this.id = id;
    this.grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
    this.spawn();
    this.held = null;
    this.holdUsed = false;
    this.garbage = 0;
    this.topped = false;
    this.linesCleared = 0;
    this.reviveCountdown = 15;
    this.dropTimer = 0;
  }

  spawn() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    this.current = {
      shape: SHAPES[type],
      color: COLORS[type],
      x: 3,
      y: 0,
      type
    };
    if (this.collides()) {
      this.topped = true;
    }
  }

  collides(offsetX = 0, offsetY = 0, shape = this.current.shape) {
    const { x, y } = this.current;
    return shape.some((row, dy) =>
      row.some((val, dx) => {
        if (!val) return false;
        const px = x + dx + offsetX;
        const py = y + dy + offsetY;
        return (
          px < 0 || px >= COLS || py >= ROWS ||
          (py >= 0 && this.grid[py] && this.grid[py][px])
        );
      })
    );
  }

  rotate(clockwise=true) {
    const s = this.current.shape;
    const rotated = clockwise ?
      s[0].map((_, i) => s.map(r => r[i]).reverse()) :
      s[0].map((_, i) => s.map(r => r[i])).reverse();
    if (!this.collides(0, 0, rotated)) {
      this.current.shape = rotated;
    }
  }

  hardDrop() {
    while (!this.collides(0,1)) {
      this.current.y++;
    }
    this.lock();
  }

  hold(globalHold) {
    if (this.holdUsed) return;
    const temp = globalHold.piece;
    globalHold.piece = this.current.type;
    if (temp) {
      const shape = SHAPES[temp];
      this.current = { shape, color: COLORS[temp], x: 3, y: 0, type: temp };
    } else {
      this.spawn();
    }
    this.holdUsed = true;
  }

  move(dx) {
    this.current.x += dx;
    if (this.collides()) this.current.x -= dx;
  }

  tick(delta) {
    if (this.topped) return;
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

  lock() {
    const { shape, x, y, color } = this.current;
    shape.forEach((row, dy) =>
      row.forEach((val, dx) => {
        if (val && y + dy >= 0) {
          this.grid[y + dy][x + dx] = color;
        }
      })
    );
    const lines = this.clearLines();
    this.linesCleared += lines;
    if (lines > 0) {
      sendGarbage(this.id, lines);
    }
    this.holdUsed = false;
    this.spawn();
  }

  clearLines() {
    let count = 0;
    this.grid = this.grid.filter(row => {
      if (row.every(v => v)) {
        count++;
        return false;
      }
      return true;
    });
    while (this.grid.length < ROWS) {
      this.grid.unshift(Array(COLS).fill(null));
    }
    return count;
  }

  addGarbage(amount) {
    for (let i = 0; i < amount; i++) {
      this.grid.shift();
      const garbage = Array(COLS).fill('gray');
      const hole = Math.floor(Math.random() * COLS);
      garbage[hole] = null;
      this.grid.push(garbage);
    }
  }

  revive() {
    if (this.linesCleared >= this.reviveCountdown) {
      this.topped = false;
      this.linesCleared = 0;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    this.grid.forEach((row, y) => row.forEach((cell, x) => {
      if (cell) drawBlock(this.ctx, x, y, cell);
    }));
    const { shape, x, y, color } = this.current;
    shape.forEach((row, dy) =>
      row.forEach((val, dx) => {
        if (val) drawBlock(this.ctx, x + dx, y + dy, color);
      })
    );
  }
}

function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "#111";
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

const board1 = new Tetris(ctx1, 1);
const board2 = new Tetris(ctx2, 2);
const globalHold = { piece: null };

function drawHold() {
  holdCtx.clearRect(0, 0, 80, 80);
  if (!globalHold.piece) return;
  const shape = SHAPES[globalHold.piece];
  const color = COLORS[globalHold.piece];
  shape.forEach((row, y) =>
    row.forEach((val, x) => {
      if (val) drawBlock(holdCtx, x + 1, y + 1, color);
    })
  );
}

function sendGarbage(from, lines) {
  if (from === 1) board2.addGarbage(lines);
  else board1.addGarbage(lines);
}

document.addEventListener("keydown", e => {
  switch (e.key) {
    case "ArrowLeft": board1.move(-1); board2.move(-1); break;
    case "ArrowRight": board1.move(1); board2.move(1); break;
    case "ArrowUp": board1.hardDrop(); board2.hardDrop(); break;
    case "ArrowDown": board1.tick(1000); board2.tick(1000); break;
    case "x": board1.rotate(true); board2.rotate(true); break;
    case "z": board1.rotate(false); board2.rotate(false); break;
    case "c": board1.hold(globalHold); board2.hold(globalHold); break;
  }
});

let lastTime = 0;
function loop(t = 0) {
  const delta = t - lastTime;
  lastTime = t;

  board1.tick(delta);
  board2.tick(delta);
  board1.revive();
  board2.revive();
  board1.draw();
  board2.draw();
  drawHold();

  requestAnimationFrame(loop);
}

loop();
