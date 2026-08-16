// Story-ratio (1080x1920) share card, laid out as a Green Neko Cafe receipt.
// The cafe framing is doing real work: it makes the "free boba" prize read as
// an actual offer from a cafe rather than a generic score screenshot, and the
// torn-paper + monospace treatment gives the post something to look at in a
// feed full of flat screenshots. Built from the art already in the game plus
// canvas primitives - no new image assets to ship.

// The café's own account. A winner claims by tagging it from the same handle
// shown on the card, so this string appears on the card, in the share caption
// and in the Terms - change it in all three if the account ever changes.
export const CAFE_HANDLE = "@greenneko.eats";

const W = 1080;
const H = 1920;

const PAPER = "#f6ecd6";
const INK = "#2c3d1c";
const GREEN = "#3f5a26";
const GREEN_BG = "#24331a";
const CREAM = "#f4ead2";
const GOLD = "#e9c45c";
const TEA = "#d2a679";
const PEARL = "#3a2a1c";

const MONO = (px, weight = "bold") => `${weight} ${px}px "Courier New", Courier, monospace`;
const SANS = (px, weight = "800") =>
  `${weight} ${px}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

// 5x7 bitmap font, drawn as rectangles. A webfont would have been less code,
// but it adds a network fetch the card would have to await before rendering
// (and a silent fallback to a non-pixel font whenever that fetch fails) - and
// upscaling a small canvas gives fuzzy, uneven edges. Blocks stay razor sharp
// at any size, which is what makes it sit right next to the pixel wordmark.
const PIXEL_GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

const GLYPH_COLS = 5;
const GLYPH_ROWS = 7;

// px = size of one "pixel" block, so a line is px*7 tall. Coordinates are
// rounded to whole pixels: on fractional ones the blocks antialias against
// each other and thin seams show up through the middle of every letter.
function drawPixelText(ctx, text, cx, top, px, color, shadow) {
  const chars = [...text.toUpperCase()];
  const advance = GLYPH_COLS + 1; // 1 blank column between letters
  const totalCols = chars.length * advance - 1;
  const startX = Math.round(cx - (totalCols * px) / 2);
  const startY = Math.round(top);

  const paint = (offset, fill) => {
    ctx.fillStyle = fill;
    let x = startX + offset;
    for (const ch of chars) {
      const glyph = PIXEL_GLYPHS[ch];
      if (glyph) {
        for (let r = 0; r < GLYPH_ROWS; r++) {
          for (let c = 0; c < GLYPH_COLS; c++) {
            if (glyph[r][c] === "#") ctx.fillRect(x + c * px, startY + offset + r * px, px, px);
          }
        }
      }
      x += advance * px;
    }
  };

  // Offset drop shadow, the same trick the game's own wordmark art uses.
  if (shadow) paint(px, shadow);
  paint(0, color);

  return totalCols * px;
}

// onerror matters here: without it a missing sprite leaves the promise
// pending forever and the share button hangs with no error to explain it.
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Shrink until it fits rather than letting a long name overrun the paper.
function setFittedFont(ctx, text, maxWidth, startPx, makeFont) {
  let px = startPx;
  ctx.font = makeFont(px);
  while (ctx.measureText(text).width > maxWidth && px > 12) {
    px -= 2;
    ctx.font = makeFont(px);
  }
  return px;
}

// Canvas has no letter-spacing in older Safari, so space it by hand - the
// wide tracking is most of what makes the small caps lines read as "receipt".
function drawTracked(ctx, text, cx, y, tracking) {
  const chars = [...text];
  const width = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + tracking, 0) - tracking;
  let x = cx - width / 2;
  for (const ch of chars) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashedRule(ctx, x1, x2, y, color = "rgba(44,61,28,0.35)") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 14]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

// Carves zigzag teeth out of the paper by painting the background colour back
// over the edge, so the receipt looks torn off at both ends.
function tornEdge(ctx, x, w, edgeY, amp, period, into) {
  ctx.fillStyle = GREEN_BG;
  ctx.beginPath();
  ctx.moveTo(x, edgeY - into * amp * 2);
  const steps = Math.ceil(w / period);
  for (let i = 0; i <= steps; i++) {
    ctx.lineTo(x + i * period, edgeY + (i % 2 === 0 ? 0 : into * amp));
  }
  ctx.lineTo(x + w, edgeY - into * amp * 2);
  ctx.closePath();
  ctx.fill();
}

// Tapered cup, domed lid, straw and tapioca - small enough that it reads as an
// icon, drawn rather than shipped so it inherits the card's palette.
function drawBobaCup(ctx, cx, cy, h) {
  const topW = h * 0.6;
  const botW = h * 0.44;
  const bodyH = h * 0.72;
  const top = cy - bodyH / 2;
  const bot = cy + bodyH / 2;

  ctx.save();

  // straw, angled through the lid
  ctx.strokeStyle = "#e07b8a";
  ctx.lineWidth = h * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + topW * 0.1, top - h * 0.28);
  ctx.lineTo(cx - topW * 0.12, bot - bodyH * 0.25);
  ctx.stroke();

  // cup body
  ctx.fillStyle = TEA;
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2, top);
  ctx.lineTo(cx + topW / 2, top);
  ctx.lineTo(cx + botW / 2, bot);
  ctx.lineTo(cx - botW / 2, bot);
  ctx.closePath();
  ctx.fill();

  // pearls, settled at the bottom
  ctx.fillStyle = PEARL;
  const pearlR = h * 0.055;
  const rows = [
    [-0.26, 0.88],
    [0, 0.9],
    [0.26, 0.88],
    [-0.13, 0.74],
    [0.13, 0.74],
  ];
  for (const [ox, oy] of rows) {
    ctx.beginPath();
    ctx.arc(cx + botW * ox, top + bodyH * oy, pearlR, 0, Math.PI * 2);
    ctx.fill();
  }

  // lid
  ctx.fillStyle = CREAM;
  roundRectPath(ctx, cx - topW * 0.62, top - h * 0.14, topW * 1.24, h * 0.16, h * 0.05);
  ctx.fill();

  ctx.restore();
}

// Deterministic from the score so the same run always renders the same bars -
// a random barcode would flicker between re-shares of one score.
function drawBarcode(ctx, cx, y, w, h, seed) {
  ctx.fillStyle = INK;
  let n = seed + 7;
  let x = cx - w / 2;
  while (x < cx + w / 2) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    const barW = 4 + (n % 4) * 3;
    if ((n >> 4) % 6 !== 0) ctx.fillRect(x, y, barW, h);
    x += barW + 5;
  }
}

export async function generateScoreCard(score, username) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = GREEN_BG;
  ctx.fillRect(0, 0, W, H);

  // faint dot grid so the backdrop isn't a dead flat block
  ctx.fillStyle = "rgba(244,234,210,0.05)";
  for (let gy = 40; gy < H; gy += 60) {
    for (let gx = 40; gx < W; gx += 60) {
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const paperX = 80;
  const paperW = W - 160;
  const paperTop = 110;
  const paperBot = 1810;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = PAPER;
  ctx.fillRect(paperX, paperTop, paperW, paperBot - paperTop);
  ctx.restore();

  tornEdge(ctx, paperX, paperW, paperTop, 20, 46, 1);
  tornEdge(ctx, paperX, paperW, paperBot, 20, 46, -1);

  const cx = W / 2;
  const contentX = paperX + 62;
  const contentR = paperX + paperW - 62;
  const contentW = contentR - contentX;

  ctx.textAlign = "center";

  // --- weekly prize banner: the hook that gives strangers a reason to play ---
  const bannerY = 172;
  const bannerH = 330;
  ctx.fillStyle = GREEN;
  roundRectPath(ctx, contentX, bannerY, contentW, bannerH, 28);
  ctx.fill();

  // Pixel lettering is wide and short where the old sans was narrow and tall,
  // so the cups moved up to flank the short kicker line - that hands the full
  // banner width to the headline instead of pinching it from both sides.
  // Cup height and centre are tuned together: the straw sticks up a further
  // 0.28x above the body, so a cup centred too high pokes its straw out
  // through the top of the banner and reads as a clipping bug.
  drawBobaCup(ctx, contentX + 56, bannerY + 66, 90);
  drawBobaCup(ctx, contentR - 56, bannerY + 66, 90);

  ctx.fillStyle = GOLD;
  ctx.font = MONO(26);
  drawTracked(ctx, "★ WEEKLY PRIZE ★", cx, bannerY + 72, 7);

  drawPixelText(ctx, "TOP 3 WIN A", cx, bannerY + 116, 9, CREAM, "rgba(0,0,0,0.3)");
  drawPixelText(ctx, "FREE BOBA", cx, bannerY + 200, 13, GOLD, "rgba(0,0,0,0.32)");

  // --- brand mark, reusing the game's own title art ---
  const titleImg = await loadImage("assets/sprites/title_art.png");
  let y = 540;
  if (titleImg) {
    // Slice down to just past the wordmark - stopping short of "PRESS START"
    // and the shelf, but far enough that "NEKO" isn't clipped mid-letter.
    const cropH = titleImg.naturalHeight * 0.62;
    const scale = Math.min(620 / titleImg.naturalWidth, 440 / cropH);
    const dw = titleImg.naturalWidth * scale;
    const dh = cropH * scale;
    // The art carries its own background, so round and outline it - otherwise
    // it reads as a screenshot pasted onto the receipt rather than part of it.
    ctx.save();
    roundRectPath(ctx, cx - dw / 2, y, dw, dh, 20);
    ctx.clip();
    ctx.drawImage(titleImg, 0, 0, titleImg.naturalWidth, cropH, cx - dw / 2, y, dw, dh);
    ctx.restore();
    roundRectPath(ctx, cx - dw / 2, y, dw, dh, 20);
    ctx.strokeStyle = "rgba(44,61,28,0.3)";
    ctx.lineWidth = 5;
    ctx.stroke();
    y += dh + 34;
  } else {
    ctx.fillStyle = INK;
    ctx.font = SANS(76);
    ctx.fillText("GREEN NEKO", cx, y + 80);
    y += 150;
  }

  ctx.fillStyle = "rgba(44,61,28,0.65)";
  ctx.font = MONO(28);
  drawTracked(ctx, "GREEN NEKO CAFE", cx, y, 8);
  y += 44;

  dashedRule(ctx, contentX, contentR, y);
  y += 58;

  // --- receipt line item: who played ---
  // Not upper-cased: handles are lowercase by definition, and this line is
  // what a winner's story post gets checked against, so it has to read back
  // exactly as their profile does.
  const name = username ? `@${username}` : "@player";
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = MONO(34, "normal");
  ctx.fillText("PLAYER", contentX, y);
  ctx.textAlign = "right";
  setFittedFont(ctx, name, contentW - 240, 38, (px) => MONO(px));
  ctx.fillText(name, contentR, y);
  ctx.textAlign = "center";
  y += 42;

  dashedRule(ctx, contentX, contentR, y);
  y += 72;

  // --- the score, as the hero ---
  ctx.fillStyle = "rgba(44,61,28,0.7)";
  ctx.font = MONO(32, "normal");
  drawTracked(ctx, "TOTAL POINTS", cx, y, 9);
  y += 128;

  const scoreText = String(score).padStart(6, "0");
  ctx.fillStyle = INK;
  setFittedFont(ctx, scoreText, contentW - 40, 168, (px) => MONO(px));
  ctx.fillText(scoreText, cx, y);
  y += 56;

  dashedRule(ctx, contentX, contentR, y);
  y += 72;

  // --- call to action ---
  ctx.fillStyle = GREEN;
  setFittedFont(ctx, "CAN YOU BEAT IT?", contentW, 58, (px) => SANS(px));
  ctx.fillText("CAN YOU BEAT IT?", cx, y);
  y += 64;

  const url = location.host + (location.pathname === "/" ? "" : location.pathname);
  ctx.fillStyle = INK;
  setFittedFont(ctx, url, contentW, 36, (px) => MONO(px, "normal"));
  ctx.fillText(url, cx, y);
  y += 70;

  drawBarcode(ctx, cx, y, contentW * 0.72, 86, score);
  y += 120;

  // Not a repeat of the banner's prize line - this is the "how do I claim it"
  // half, and it has to match the Terms exactly, because tagging the café from
  // the account on this card is what actually makes a win verifiable.
  ctx.fillStyle = "rgba(44,61,28,0.6)";
  ctx.font = MONO(25, "normal");
  drawTracked(ctx, `TAG ${CAFE_HANDLE.toUpperCase()} TO CLAIM`, cx, y, 3);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
