function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  return lines;
}

// A vertical (Story-ratio) branded score card, built from the same art
// already in the game rather than any new assets: the title art's cat +
// wordmark, and the ticket graphic with the score burned in.
export async function generateScoreCard(score, username) {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#efe2c4";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#4a6030";
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  const [titleImg, ticketImg] = await Promise.all([
    loadImage("assets/sprites/title_art.png"),
    loadImage("assets/sprites/points_ticket_blank.png"),
  ]);

  let y = 110;

  // crop out just the cat + "GREEN NEKO" wordmark (skip "PRESS START"/shelf)
  const cropH = titleImg.naturalHeight * 0.6;
  const titleW = W - 160;
  const titleH = (cropH / titleImg.naturalWidth) * titleW;
  ctx.drawImage(titleImg, 0, 0, titleImg.naturalWidth, cropH, (W - titleW) / 2, y, titleW, titleH);
  y += titleH + 60;

  const ticketW = W - 220;
  const ticketH = (ticketImg.naturalHeight / ticketImg.naturalWidth) * ticketW;
  const ticketX = (W - ticketW) / 2;
  ctx.drawImage(ticketImg, ticketX, y, ticketW, ticketH);

  ctx.fillStyle = "#f0e4c8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(ticketH * 0.27)}px "Courier New", monospace`;
  ctx.fillText(String(score).padStart(6, "0"), ticketX + ticketW * 0.5705, y + ticketH * 0.607);
  ctx.textBaseline = "alphabetic";
  y += ticketH + 90;

  ctx.fillStyle = "#2f4222";
  ctx.font = "bold 54px -apple-system, BlinkMacSystemFont, sans-serif";
  for (const line of wrapLines(ctx, `${username} just dodged servers at Green Neko Cafe!`, W - 220)) {
    ctx.fillText(line, W / 2, y);
    y += 68;
  }
  y += 30;

  ctx.fillStyle = "#4a6030";
  ctx.font = "44px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Think you can beat this score?", W / 2, y);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
