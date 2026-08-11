import { TILE_SIZE } from "../core/Grid.js";
import { palette } from "./palette.js";
import { getImage } from "./ImageLoader.js";

function drawFitted(ctx, img, cx, cy, maxW, maxH) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

// The cat hops along a wood café counter, not a floor - warm plank texture
// with a seam per tile and a couple of grain highlight lines.
export function drawFloorTile(ctx, x, y, variant) {
  ctx.fillStyle = variant % 2 === 0 ? palette.counterA : palette.counterB;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = palette.counterSeam;
  ctx.fillRect(x, y, TILE_SIZE, 2);
  ctx.fillRect(x, y, 2, TILE_SIZE);

  ctx.fillStyle = palette.counterGrain;
  ctx.fillRect(x + 4, y + TILE_SIZE * 0.32, TILE_SIZE - 8, 2);
  ctx.fillRect(x + 4, y + TILE_SIZE * 0.68, TILE_SIZE - 8, 2);
}

const CAT_POSES = ["catwalk2", "catwalk1"];

// hopT: 0 = grounded, 0.5 = peak of hop, 1 = grounded again
// pose: 0 or 1, slowly alternated by the Player for an idle sway
export function drawCat(ctx, x, y, hopT, facing, pose = 0) {
  const arc = Math.sin(Math.min(hopT, 1) * Math.PI);
  const liftPx = arc * TILE_SIZE * 0.35;
  const squash = 1 - arc * 0.15;
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2 - liftPx;

  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, y + TILE_SIZE / 2 + TILE_SIZE * 0.28, TILE_SIZE * 0.32, TILE_SIZE * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  if (facing === "left") ctx.scale(-1, 1);
  ctx.scale(squash, 1 / squash);

  const catImg = getImage(CAT_POSES[pose % CAT_POSES.length]);
  const size = TILE_SIZE * 0.92;

  if (catImg) {
    drawFitted(ctx, catImg, 0, 0, size, size);
  } else {
    ctx.fillStyle = palette.catOutline;
    ctx.fillRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
    ctx.fillStyle = palette.catBody;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.fillStyle = palette.catEar;
    ctx.fillRect(-size / 2, -size / 2 - size * 0.22, size * 0.28, size * 0.28);
    ctx.fillRect(size / 2 - size * 0.28, -size / 2 - size * 0.22, size * 0.28, size * 0.28);
    ctx.fillStyle = palette.catBelly;
    ctx.fillRect(-size * 0.22, -size * 0.05, size * 0.44, size * 0.4);
  }

  ctx.restore();
}

const SERVER_SPRITES = ["serverBoba", "serverFood", "serverCake"];

// dir: 1 = walking right, -1 = walking left. The source art faces the
// viewer (tray held out "down-screen"), so we rotate it 90° to face travel.
export function drawServer(ctx, x, y, walkT, variant = 0, dir = 1) {
  const bob = Math.sin(walkT * Math.PI * 2) * 2;
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2 + bob;

  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, y + TILE_SIZE * 0.82, TILE_SIZE * 0.3, TILE_SIZE * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = getImage(SERVER_SPRITES[variant % SERVER_SPRITES.length]);
  if (img) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir === 1 ? -Math.PI / 2 : Math.PI / 2);
    // args are swapped on purpose: after the 90° turn, the sprite's tall
    // axis becomes the on-screen width, so cap it to less than one tile
    // (TILE*0.88) to keep neighbors in the same lane from overlapping.
    drawFitted(ctx, img, 0, 0, TILE_SIZE * 1.15, TILE_SIZE * 0.88);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(cx, cy);
    if (dir === -1) ctx.scale(-1, 1);
    ctx.fillStyle = palette.serverShirt;
    ctx.fillRect(-TILE_SIZE * 0.16, TILE_SIZE * 0.05, TILE_SIZE * 0.32, TILE_SIZE * 0.28);
    ctx.fillStyle = palette.serverApron;
    ctx.fillRect(-TILE_SIZE * 0.22, -TILE_SIZE * 0.2, TILE_SIZE * 0.44, TILE_SIZE * 0.32);
    ctx.fillStyle = palette.serverSkin;
    ctx.beginPath();
    ctx.arc(0, -TILE_SIZE * 0.3, TILE_SIZE * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.trayColor;
    ctx.fillRect(-TILE_SIZE * 0.3, -TILE_SIZE * 0.24, TILE_SIZE * 0.2, TILE_SIZE * 0.06);
    ctx.restore();
  }
}

export function drawCart(ctx, x, y) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, y + TILE_SIZE * 0.82, TILE_SIZE * 0.42, TILE_SIZE * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = palette.cartBody;
  ctx.fillRect(-TILE_SIZE * 0.42, -TILE_SIZE * 0.12, TILE_SIZE * 0.84, TILE_SIZE * 0.32);
  ctx.fillStyle = palette.cartTop;
  ctx.fillRect(-TILE_SIZE * 0.42, -TILE_SIZE * 0.26, TILE_SIZE * 0.84, TILE_SIZE * 0.14);
  ctx.fillStyle = palette.cartWheel;
  ctx.beginPath();
  ctx.arc(-TILE_SIZE * 0.28, TILE_SIZE * 0.22, TILE_SIZE * 0.08, 0, Math.PI * 2);
  ctx.arc(TILE_SIZE * 0.28, TILE_SIZE * 0.22, TILE_SIZE * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
