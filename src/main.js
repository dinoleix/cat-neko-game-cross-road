import { startLoop } from "./core/loop.js";
import { COLS, MARGIN_COLS, VISIBLE_ROWS, LOGICAL_WIDTH, LOGICAL_HEIGHT, colToX, rowToY } from "./core/Grid.js";
import { preloadImages } from "./render/ImageLoader.js";
import { drawFloorTile, drawCat, drawServer, drawCart } from "./render/sprites.js";
import { drawMarginWall, drawMarginProp } from "./render/background.js";
import { rectsOverlap } from "./util/collision.js";
import { getHighScore, setHighScoreIfBetter, addLeaderboardEntry, getLeaderboard } from "./util/storage.js";
import { Player } from "./entities/Player.js";
import { World } from "./world/World.js";
import { unlockAudio, playMeow, playGameOver } from "./audio/sound.js";
import { startMusic } from "./audio/music.js";
import { shareScore } from "./share/share.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const hud = document.getElementById("hud");
const scoreEl = document.getElementById("score");
const startScreen = document.getElementById("start-screen");
const startBestEl = document.getElementById("start-best");
const gameoverScreen = document.getElementById("gameover-screen");
const finalScoreEl = document.getElementById("final-score");
const finalBestEl = document.getElementById("final-best");
const newBestEl = document.getElementById("new-best");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const dpad = document.getElementById("dpad");
const titleWrap = document.querySelector(".title-wrap");
const titleFooter = document.querySelector(".title-footer");
const usernameScreen = document.getElementById("username-screen");
const usernameForm = document.getElementById("username-form");
const usernameInput = document.getElementById("username-input");
const usernameBackButton = document.getElementById("username-back");
const scoreboardScreen = document.getElementById("scoreboard-screen");
const scoreboardRowsEl = document.getElementById("scoreboard-rows");
const scoreboardBackButton = document.getElementById("scoreboard-back");
const scoreboardCloseButton = document.getElementById("scoreboard-close");
const startScoreboardButton = document.getElementById("start-scoreboard-button");
const gameoverScoreboardButton = document.getElementById("gameover-scoreboard-button");
const scoreboardShareButton = document.getElementById("scoreboard-share-button");
const scoreboardShareStatus = document.getElementById("scoreboard-share-status");

const LOWER_OFFSET = 4;
const CAMERA_EASE = 8;
const DIFFICULTY_TIER_STEP = 0.15; // fraction of full difficulty per meow cue
const SCOREBOARD_ROWS = 10;

let state = "start"; // 'start' | 'username' | 'playing' | 'gameover' | 'scoreboard'
let scoreboardReturnScreen = startScreen;
let player = null;
let world = null;
let cameraRow = 0;
let maxRowReached = 0;
let score = 0;
let difficultyTier = 0;
let currentUsername = "Player";

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(window.innerWidth / LOGICAL_WIDTH, window.innerHeight / LOGICAL_HEIGHT);
  canvas.style.width = `${LOGICAL_WIDTH * scale}px`;
  canvas.style.height = `${LOGICAL_HEIGHT * scale}px`;
  canvas.width = Math.round(LOGICAL_WIDTH * dpr);
  canvas.height = Math.round(LOGICAL_HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeTitleWrap();
}

// CSS alone can't reliably "contain"-fit the title art while also reserving
// room for the footer below it across arbitrary window shapes (it only
// worked out on narrow/tall windows - wide ones clamped height but kept
// width at 100%, squashing the art). Sized the same way the canvas above
// is: measure available space, compute the box explicitly, apply it.
function resizeTitleWrap() {
  if (!titleWrap || !titleFooter) return;
  const screenPaddingY = 24; // matches #start-screen's 12px top + bottom padding
  const gap = 10; // matches #start-screen's gap
  const availableHeight = window.innerHeight - screenPaddingY - gap - titleFooter.offsetHeight;
  const availableWidth = window.innerWidth;
  const scale = Math.max(0, Math.min(availableWidth / 1179, availableHeight / 1572));
  titleWrap.style.width = `${1179 * scale}px`;
  titleWrap.style.height = `${1572 * scale}px`;
}

function resetGame() {
  player = new Player(Math.floor(COLS / 2), 0);
  world = new World();
  world.ensureGenerated(VISIBLE_ROWS + 2);
  cameraRow = 0;
  maxRowReached = 0;
  score = 0;
  difficultyTier = 0;
  scoreEl.textContent = formatScore(0);
}

function formatScore(value) {
  return String(value).padStart(6, "0");
}

function showUsernameScreen() {
  state = "username";
  startScreen.classList.add("hidden");
  usernameInput.value = "";
  usernameScreen.classList.remove("hidden");
  setTimeout(() => usernameInput.focus(), 50);
}

function backToStart() {
  state = "start";
  usernameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

function confirmUsername(e) {
  e.preventDefault();
  currentUsername = usernameInput.value.trim() || "Player";
  usernameScreen.classList.add("hidden");
  beginPlaying();
}

function beginPlaying() {
  unlockAudio();
  startMusic();
  resetGame();
  state = "playing";
  startScreen.classList.add("hidden");
  usernameScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  scoreboardScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  dpad.classList.remove("hidden");
}

function renderScoreboard() {
  const entries = getLeaderboard();
  scoreboardRowsEl.innerHTML = "";
  for (let i = 0; i < SCOREBOARD_ROWS; i++) {
    const entry = entries[i];
    const row = document.createElement("div");
    row.className = "scoreboard-row";
    row.innerHTML = `
      <span class="col-rank">${i + 1}</span>
      <span class="col-player">${entry ? escapeHtml(entry.name) : ""}</span>
      <span class="col-score">${entry ? entry.score : ""}</span>
    `;
    scoreboardRowsEl.appendChild(row);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openScoreboard(fromScreen) {
  scoreboardReturnScreen = fromScreen;
  state = "scoreboard";
  renderScoreboard();
  fromScreen.classList.add("hidden");
  scoreboardScreen.classList.remove("hidden");
}

function closeScoreboard() {
  state = scoreboardReturnScreen === gameoverScreen ? "gameover" : "start";
  scoreboardScreen.classList.add("hidden");
  scoreboardReturnScreen.classList.remove("hidden");
}

async function handleShareClick() {
  scoreboardShareButton.disabled = true;
  scoreboardShareStatus.classList.add("hidden");
  try {
    const result = await shareScore(getHighScore(), currentUsername);
    if (result.method === "download+clipboard" || result.method === "download") {
      scoreboardShareStatus.textContent =
        result.method === "download+clipboard"
          ? "Score card saved and caption copied - post it to your Instagram!"
          : "Score card saved - post it to your Instagram!";
      scoreboardShareStatus.classList.remove("hidden");
    }
  } finally {
    scoreboardShareButton.disabled = false;
  }
}

function gameOver() {
  state = "gameover";
  player.died();
  playGameOver();
  const isNewBest = setHighScoreIfBetter(score);
  addLeaderboardEntry(currentUsername, score);
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(getHighScore());
  newBestEl.classList.toggle("hidden", !isNewBest);
  hud.classList.add("hidden");
  dpad.classList.add("hidden");
  gameoverScreen.classList.remove("hidden");
}

function handleInput(dir) {
  if (state !== "playing") return;
  player.queueMove(dir);
}

function setupKeyboard() {
  const KEY_MAP = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  window.addEventListener("keydown", (e) => {
    if (state !== "playing") return; // don't swallow keys while the username input is focused
    const dir = KEY_MAP[e.key];
    if (!dir) return;
    e.preventDefault();
    handleInput(dir);
  });
}

function setupDpad() {
  const bindings = [
    ["dpad-up", "up"],
    ["dpad-down", "down"],
    ["dpad-left", "left"],
    ["dpad-right", "right"],
  ];
  for (const [id, dir] of bindings) {
    document.getElementById(id).addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handleInput(dir);
    });
  }
}

function setupSwipe() {
  let start = null;
  const THRESHOLD = 24;

  canvas.addEventListener("pointerdown", (e) => {
    start = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < THRESHOLD) return;

    if (absX > absY) {
      handleInput(dx > 0 ? "right" : "left");
    } else {
      handleInput(dy > 0 ? "down" : "up");
    }
  });
}

function update(dt) {
  if (state !== "playing") return;

  const minRow = Math.max(0, maxRowReached - LOWER_OFFSET);
  const targetCamera = minRow;
  cameraRow += (targetCamera - cameraRow) * Math.min(1, dt * CAMERA_EASE);

  world.ensureGenerated(Math.ceil(cameraRow) + VISIBLE_ROWS + 2);
  world.update(dt);
  world.prune(Math.floor(cameraRow) - 2);

  player.update(dt, minRow);
  maxRowReached = Math.max(maxRowReached, player.row);
  score = maxRowReached;
  scoreEl.textContent = formatScore(score);

  const tier = Math.floor(world.difficultyAt(maxRowReached) / DIFFICULTY_TIER_STEP);
  if (tier > difficultyTier) {
    difficultyTier = tier;
    playMeow();
  }

  const playerRect = player.getRect();
  const centerRow = Math.round(playerRect.y);
  for (let r = centerRow - 1; r <= centerRow + 1; r++) {
    const rowDef = world.getRow(r);
    if (!rowDef || rowDef.type !== "hazard") continue;
    for (const obstacle of rowDef.obstacles) {
      if (rectsOverlap(playerRect, obstacle.getRect(), 0.68)) {
        gameOver();
        return;
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  if (!world || !player) return;

  const camIntRow = Math.floor(cameraRow);
  const topRow = camIntRow + VISIBLE_ROWS;
  const rightMarginX = colToX(COLS);
  const now = performance.now() / 1000;

  for (let r = camIntRow - 1; r <= topRow; r++) {
    const rowDef = world.getRow(r);
    const variant = rowDef ? rowDef.floorVariant : Math.abs(r % 2);
    const y = rowToY(r, cameraRow);
    drawMarginWall(ctx, 0, y, r);
    drawMarginWall(ctx, rightMarginX, y, r);
    for (let c = 0; c < COLS; c++) {
      drawFloorTile(ctx, colToX(c), y, (c + variant) % 2);
    }
  }

  for (let r = camIntRow - 1; r <= topRow; r++) {
    const y = rowToY(r, cameraRow);
    drawMarginProp(ctx, 0, y, r, "left", now);
    drawMarginProp(ctx, rightMarginX, y, r, "right", now);
  }

  for (let r = camIntRow - 1; r <= topRow; r++) {
    const rowDef = world.getRow(r);
    if (!rowDef || rowDef.type !== "hazard") continue;
    const y = rowToY(r, cameraRow);
    for (const obstacle of rowDef.obstacles) {
      const x = colToX(obstacle.colX);
      if (obstacle.type === "cart") {
        drawCart(ctx, x, y);
      } else {
        drawServer(ctx, x, y, obstacle.animT, obstacle.variant, obstacle.dir);
      }
    }
  }

  const visual = player.getVisual();
  drawCat(ctx, colToX(visual.col), rowToY(visual.row, cameraRow), visual.hopT, player.facing, player.pose);
}

async function init() {
  resize();
  window.addEventListener("resize", resize);

  resetGame();
  startBestEl.textContent = String(getHighScore());

  setupKeyboard();
  setupDpad();
  setupSwipe();

  startButton.addEventListener("click", showUsernameScreen);
  usernameForm.addEventListener("submit", confirmUsername);
  usernameBackButton.addEventListener("click", backToStart);
  restartButton.addEventListener("click", beginPlaying);
  startScoreboardButton.addEventListener("click", () => openScoreboard(startScreen));
  gameoverScoreboardButton.addEventListener("click", () => openScoreboard(gameoverScreen));
  scoreboardBackButton.addEventListener("click", closeScoreboard);
  scoreboardCloseButton.addEventListener("click", closeScoreboard);
  scoreboardShareButton.addEventListener("click", handleShareClick);

  await preloadImages();

  startLoop(update, render);
}

init();
