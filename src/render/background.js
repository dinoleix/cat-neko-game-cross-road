import { TILE_SIZE, MARGIN_COLS } from "../core/Grid.js";
import { palette } from "./palette.js";

const PROPS = ["plant", "lamp", "shelf", "barista", "plant"];
const SIGN_EVERY = 18; // an illuminated Green Neko sign panel every N rows, per side

function propFor(row, side) {
  if ((row + (side === "left" ? 0 : 9)) % SIGN_EVERY === 0) return "sign";
  const seed = Math.abs(row * 7 + (side === "left" ? 1 : 5)) % PROPS.length;
  return PROPS[seed];
}

function drawPlant(ctx, cx, cy) {
  ctx.fillStyle = "#8a5a34";
  ctx.fillRect(cx - 9, cy + 4, 18, 12);
  const leafColors = ["#3d5a2a", "#4a6b34", "#557a3c"];
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i - 2) * 0.42;
    const len = 16 + (i % 2) * 5;
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(angle) * len * 0.5,
      cy + Math.sin(angle) * len * 0.5,
      6,
      len * 0.5,
      angle + Math.PI / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function drawLamp(ctx, cx, topY, t) {
  const glow = 0.55 + Math.sin(t * 1.6 + cx) * 0.12;
  ctx.strokeStyle = "#2c2019";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, topY + 14);
  ctx.stroke();

  ctx.fillStyle = "#2c2019";
  ctx.beginPath();
  ctx.moveTo(cx - 10, topY + 14);
  ctx.lineTo(cx + 10, topY + 14);
  ctx.lineTo(cx + 6, topY + 24);
  ctx.lineTo(cx - 6, topY + 24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(255, 200, 110, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 30, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe8b8";
  ctx.beginPath();
  ctx.ellipse(cx, topY + 27, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawShelf(ctx, x, y, w) {
  ctx.fillStyle = "#6b4326";
  ctx.fillRect(x + 4, y + TILE_SIZE * 0.58, w - 8, 5);

  const items = [palette.trayColor ?? "#8a5a34", "#e6a878", "#3d5a2a"];
  for (let i = 0; i < 3; i++) {
    const ix = x + 10 + i * ((w - 20) / 2);
    ctx.fillStyle = items[i % items.length];
    ctx.fillRect(ix, y + TILE_SIZE * 0.58 - 12, 10, 12);
  }
}

function drawBarista(ctx, cx, cy, t) {
  const bob = Math.sin(t * 2 + cx) * 1.5;
  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.serverShirt;
  ctx.fillRect(cx - 9, cy - 4 + bob, 18, 18);
  ctx.fillStyle = palette.serverApron;
  ctx.fillRect(cx - 9, cy + 4 + bob, 18, 8);
  ctx.fillStyle = palette.serverHair;
  ctx.beginPath();
  ctx.arc(cx, cy - 10 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawSign(ctx, x, y, w, t) {
  const glow = 0.7 + Math.sin(t * 1.2) * 0.15;
  ctx.fillStyle = "#2c2019";
  ctx.fillRect(x + 4, y + 4, w - 8, TILE_SIZE - 8);
  ctx.fillStyle = `rgba(240, 228, 200, ${glow})`;
  ctx.fillRect(x + 8, y + 8, w - 16, TILE_SIZE - 16);

  ctx.fillStyle = "#3d5a2a";
  ctx.beginPath();
  const cx = x + w / 2;
  const cy = y + TILE_SIZE * 0.56;
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2f4222";
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 6);
  ctx.lineTo(cx - 4, cy - 16);
  ctx.lineTo(cx + 1, cy - 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 6);
  ctx.lineTo(cx + 4, cy - 16);
  ctx.lineTo(cx - 1, cy - 6);
  ctx.closePath();
  ctx.fill();
}

// Wall fill only - safe to draw in any order, rows never overlap each other.
export function drawMarginWall(ctx, x, y, rowIndex) {
  const w = MARGIN_COLS * TILE_SIZE;
  ctx.fillStyle = rowIndex % 2 === 0 ? palette.wallA : palette.wallB;
  ctx.fillRect(x, y, w, TILE_SIZE);
  ctx.fillStyle = "rgba(60, 40, 20, 0.08)";
  ctx.fillRect(x, y, w, 1);
}

// Decorative prop, drawn in a pass after every wall tile is filled since
// lamps/signs can rise above their own row into the row rendered before them.
export function drawMarginProp(ctx, x, y, rowIndex, side, t = 0) {
  const w = MARGIN_COLS * TILE_SIZE;
  const prop = propFor(rowIndex, side);
  const cx = x + w / 2;
  const cy = y + TILE_SIZE / 2;

  switch (prop) {
    case "plant":
      drawPlant(ctx, cx, cy + 6);
      break;
    case "lamp":
      drawLamp(ctx, cx, y - 8, t);
      break;
    case "shelf":
      drawShelf(ctx, x, y, w);
      break;
    case "barista":
      drawBarista(ctx, cx, cy + 4, t);
      break;
    case "sign":
      drawSign(ctx, x, y, w, t);
      break;
    default:
      break;
  }
}
