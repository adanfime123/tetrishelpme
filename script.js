const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 20;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  L: [[1, 0, 0], [1, 1, 1]],
  J: [[0, 0, 1], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
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

class Board {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.spawnPiece();
  }

  spawnPiece() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    this.current = {
      shape: SHAPES[type],
      color: COLORS[type],
      x: 3,
      y: 0
    };
  }

  move(dx, dy) {
    this.current.x += dx;
    this.current.y += dy;
    if (this.collides()) {
      this.current.x -= dx;
      this.current.y -= dy;
      if (dy) this.lockPiece();
    }
  }

  rotate() {
    const prev = this.current.shape;
    this.current.shape = this.current.shape[0].map((_, i) =>
      this.current.shape.map(row => row[i]).reverse()
    );
    if (this.collides()) this.current.shape = prev;
  }

  collides() {
    const { shape, x, y } = this.current;
    return shape.some((row, dy) =>
      row.some((cell, dx) => {
        if (cell === 0) return false;
        const px = x + dx;
        const py = y + dy;
        return (
          px < 0 || px >= COLS || py >= ROWS ||
          (py >= 0 && this.grid[py][px])
        );
      })
    );
  }

  lockPiece() {
    const { shape, x, y, color } = this.current;
    shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell) {
          const px = x + dx;
          const py = y + dy;
          if (py >= 0) this.grid[py][px] = color;
        }
      })
    );
    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    this.grid = this.grid.filter(row => row.some(cell => !cell));
    while (this.grid.length < ROWS) {
      this.grid.unshift(Array(COLS).fill(null));
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.grid[y][x]) {
          this.drawBlock(x, y, this.grid[y][x]);
        }
      }
    }

    const { shape, x, y, color } = this.current;
    shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell) this.drawBlock(x + dx, y + dy, color);
      })
    );
  }

  drawBlock(x, y, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    this.ctx.strokeStyle = '#111';
    this.ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }

  update() {
    this.move(0, 1);
    this.draw();
  }
}

const board1 = new Board(document.getElementById('board1'));
const board2 = new Board(document.getElementById('board2'));

document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowLeft':
      board1.move(-1, 0);
      board2.move(-1, 0);
      break;
    case 'ArrowRight':
      board1.move(1, 0);
      board2.move(1, 0);
      break;
    case 'ArrowDown':
      board1.move(0, 1);
      board2.move(0, 1);
      break;
    case 'ArrowUp':
      board1.rotate();
      board2.rotate();
      break;
  }
});

function gameLoop() {
  board1.update();
  board2.update();
  setTimeout(gameLoop, 500);
}

gameLoop();
