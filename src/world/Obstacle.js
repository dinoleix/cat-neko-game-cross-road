import { COLS } from "../core/Grid.js";

export class Obstacle {
  constructor(props) {
    this.reset(props);
  }

  reset({ type, row, colX, dir, speed, widthCols, variant = 0 }) {
    this.type = type;
    this.row = row;
    this.colX = colX; // fractional column position (left edge)
    this.dir = dir; // 1 = moving right, -1 = moving left
    this.speed = speed; // columns per second
    this.widthCols = widthCols;
    this.variant = variant;
    this.animT = Math.random();
    return this;
  }

  update(dt) {
    this.colX += this.dir * this.speed * dt;
    this.animT += dt * (this.type === "server" ? 1.6 : 1);
  }

  isOffscreen() {
    return this.colX + this.widthCols < -1 || this.colX > COLS + 1;
  }

  getRect() {
    return { x: this.colX, y: this.row, w: this.widthCols, h: 1 };
  }
}
