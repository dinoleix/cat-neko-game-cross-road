import { clampCol } from "../core/Grid.js";

const HOP_DURATION = 0.14;
const TAIL_FLICK_AFTER = 2.2; // seconds of standing still before an idle flourish
const POSE_SWAP_INTERVAL = 3; // seconds between the two cat poses (slow idle sway)

// Anim states line up with the cat sprite sheet's clips: idle, jumping
// (mid-hop), crouching (about to hop), tailFlick (idle flourish), gameOver.
export class Player {
  constructor(startCol, startRow) {
    this.col = startCol;
    this.row = startRow;
    this.fromCol = startCol;
    this.fromRow = startRow;
    this.toCol = startCol;
    this.toRow = startRow;
    this.hopping = false;
    this.hopElapsed = 0;
    this.facing = "right";
    this.queuedDir = null;
    this.idleTime = 0;
    this.animState = "idle";
    this.poseTimer = 0;
    this.pose = 0; // 0 = catwalk2.png, 1 = catwalk1.png
  }

  queueMove(dir) {
    this.queuedDir = dir;
  }

  tryStartHop(dir, minRow) {
    let dCol = 0;
    let dRow = 0;
    if (dir === "up") dRow = 1;
    else if (dir === "down") dRow = -1;
    else if (dir === "left") dCol = -1;
    else if (dir === "right") dCol = 1;

    const targetCol = clampCol(this.col + dCol);
    const targetRow = Math.max(minRow, this.row + dRow);
    if (targetCol === this.col && targetRow === this.row) return false;

    if (dCol < 0) this.facing = "left";
    if (dCol > 0) this.facing = "right";

    this.fromCol = this.col;
    this.fromRow = this.row;
    this.toCol = targetCol;
    this.toRow = targetRow;
    this.hopping = true;
    this.hopElapsed = 0;
    return true;
  }

  update(dt, minRow) {
    if (!this.hopping && this.queuedDir) {
      this.tryStartHop(this.queuedDir, minRow);
      this.queuedDir = null;
    }

    if (this.hopping) {
      this.hopElapsed += dt;
      if (this.hopElapsed >= HOP_DURATION) {
        this.col = this.toCol;
        this.row = this.toRow;
        this.hopping = false;
        this.hopElapsed = 0;

        if (this.queuedDir) {
          this.tryStartHop(this.queuedDir, minRow);
          this.queuedDir = null;
        }
      }
    }

    if (this.hopping) {
      this.idleTime = 0;
      this.animState = "jumping";
    } else {
      this.idleTime += dt;
      this.animState = this.idleTime >= TAIL_FLICK_AFTER ? "tailFlick" : "idle";
    }

    this.poseTimer += dt;
    if (this.poseTimer >= POSE_SWAP_INTERVAL) {
      this.poseTimer -= POSE_SWAP_INTERVAL;
      this.pose = this.pose === 0 ? 1 : 0;
    }
  }

  died() {
    this.hopping = false;
    this.queuedDir = null;
    this.animState = "gameOver";
  }

  getVisual() {
    if (!this.hopping) {
      return { col: this.col, row: this.row, hopT: 0 };
    }
    const t = Math.min(1, this.hopElapsed / HOP_DURATION);
    return {
      col: this.fromCol + (this.toCol - this.fromCol) * t,
      row: this.fromRow + (this.toRow - this.fromRow) * t,
      hopT: t,
    };
  }

  getRect() {
    const { col, row } = this.getVisual();
    return { x: col, y: row, w: 1, h: 1 };
  }
}
