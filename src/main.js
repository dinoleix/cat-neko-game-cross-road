import { startLoop } from "./core/loop.js";
import {
  COLS,
  TILE_SIZE,
  VISIBLE_ROWS,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  PLAY_WIDTH,
  setViewportHeight,
  colToX,
  rowToY,
} from "./core/Grid.js";
import { preloadImages } from "./render/ImageLoader.js";
import { drawFloorTile, drawCat, drawServer, drawCart } from "./render/sprites.js";
import { drawMarginWall, drawMarginProp } from "./render/background.js";
import { rectsOverlap } from "./util/collision.js";
import {
  getHighScore,
  setHighScoreIfBetter,
  addLeaderboardEntry,
  getLeaderboard,
  getUsername,
  setUsername,
} from "./util/storage.js";
import { mondayOf } from "./util/week.js";
import { normalizeHandle, isValidHandle, displayHandle } from "./util/handle.js";
import { Player } from "./entities/Player.js";
import { World } from "./world/World.js";
import { unlockAudio, playMeow, playGameOver } from "./audio/sound.js";
import { startMusic } from "./audio/music.js";
import { shareScore, prepareScoreCard } from "./share/share.js";

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
const usernameError = document.getElementById("username-error");
const scoreboardScreen = document.getElementById("scoreboard-screen");
const scoreboardRowsEl = document.getElementById("scoreboard-rows");
const scoreboardTabs = [...document.querySelectorAll(".scoreboard-tab")];
const scoreboardRangeNote = document.getElementById("scoreboard-range-note");
const scoreboardBackButton = document.getElementById("scoreboard-back");
const scoreboardCloseButton = document.getElementById("scoreboard-close");
const startScoreboardButton = document.getElementById("start-scoreboard-button");
const startTermsButton = document.getElementById("start-terms-button");
const usernameTermsButton = document.getElementById("username-terms");
const termsScreen = document.getElementById("terms-screen");
const termsCloseButton = document.getElementById("terms-close");
const gameoverScoreboardButton = document.getElementById("gameover-scoreboard-button");
const scoreboardShareButton = document.getElementById("scoreboard-share-button");
const scoreboardShareStatus = document.getElementById("scoreboard-share-status");

// How far above the bottom edge the camera holds the cat, as a share of the
// visible rows. A fixed row count would park the cat ~74% down a tall phone
// screen instead of the ~64% the 14-row layout was tuned at; 0.28 reproduces
// the original offset of 4 on a 14-row view and keeps that framing as the
// view grows. It also bounds how far back the cat may retreat.
const LOWER_OFFSET_RATIO = 0.28;
const CAMERA_EASE = 8;

function lowerOffset() {
  return Math.max(3, Math.round(VISIBLE_ROWS * LOWER_OFFSET_RATIO));
}
const SCOREBOARD_ROWS = 10;

let state = "start"; // 'start' | 'username' | 'playing' | 'gameover' | 'scoreboard'
let scoreboardReturnScreen = startScreen;
let scoreboardRange = "week"; // 'week' | 'last' | 'all'
let player = null;
let world = null;
let cameraRow = 0;
let maxRowReached = 0;
let score = 0;
let difficultyTier = 0;
let currentUsername = "";
// Resolves once the score from the run that just ended has been written to
// Firestore. renderScoreboard waits on it so opening the board straight off
// the game-over screen can't race the write and show a board missing the
// score the player just earned.
let pendingScoreSubmit = null;

// Below this the tiles get big enough that you can't see far enough ahead to
// react, so a short landscape window letterboxes at the sides instead.
const MIN_VISIBLE_ROWS = 11;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Fit to the *playable* 9 columns rather than the full 13, so on a narrow
  // phone the decorative margins bleed off the sides and the game fills the
  // display. Fitting the full width is what used to letterbox a tall phone
  // down to roughly its top half.
  const scale = Math.min(vw / PLAY_WIDTH, vh / (MIN_VISIBLE_ROWS * TILE_SIZE));

  // The world is exactly as tall as the screen, so there is nothing to letterbox.
  setViewportHeight(vh / scale);

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
  // Start already at the resting offset so the opening frame doesn't visibly
  // slide the camera down into position.
  cameraRow = -lowerOffset();
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
  usernameInput.value = displayHandle(getUsername());
  usernameError.classList.add("hidden");
  usernameScreen.classList.remove("hidden");
  setTimeout(() => {
    usernameInput.focus();
    usernameInput.select(); // prefilled returning handle is easy to overwrite
  }, 50);
}

function backToStart() {
  state = "start";
  usernameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

function confirmUsername(e) {
  e.preventDefault();
  const handle = normalizeHandle(usernameInput.value);
  // A run with no handle can't be matched to a story post, so it would sit on
  // the contest board as an entry nobody can claim the prize for.
  if (!isValidHandle(handle)) {
    usernameError.classList.remove("hidden");
    usernameInput.focus();
    return;
  }
  currentUsername = handle;
  setUsername(handle);
  usernameError.classList.add("hidden");
  usernameScreen.classList.add("hidden");
  beginPlaying();
}

function beginPlaying() {
  unlockAudio();
  startMusic();
  resetGame();
  // The previous run's submit is settled business - drop it so the next
  // scoreboard open fetches fresh rather than replaying a stale board.
  pendingScoreSubmit = null;
  state = "playing";
  startScreen.classList.add("hidden");
  usernameScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  scoreboardScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  dpad.classList.remove("hidden");
}

// Leaderboard now lives in Firestore, so this is a network round trip - draw
// a loading placeholder immediately, then fill in real rows once it resolves.
// scoreboardRenderToken guards against an older fetch (e.g. from a screen the
// player already backed out of) clobbering a newer one that lands after it.
let scoreboardRenderToken = 0;

// Blank cells look identical to a leaderboard nobody has scored on, and the
// first Firebase call of a session takes about three seconds to come back, so
// a pending fetch says so rather than showing an empty board.
function renderScoreboardRows(entries, loading = false) {
  scoreboardRowsEl.innerHTML = "";
  for (let i = 0; i < SCOREBOARD_ROWS; i++) {
    const entry = entries[i];
    const row = document.createElement("div");
    row.className = "scoreboard-row";
    row.innerHTML = `
      <span class="col-rank">${i + 1}</span>
      <span class="col-player">${entry ? escapeHtml(displayHandle(entry.name)) : loading ? "···" : ""}</span>
      <span class="col-score">${entry ? entry.score : ""}</span>
    `;
    scoreboardRowsEl.appendChild(row);
  }
}

function rangeNote(range) {
  if (range === "all") return "Every score ever recorded";
  const monday = mondayOf(new Date());
  if (range === "last") monday.setDate(monday.getDate() - 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)} · Mon 00:00 to Sun 23:59`;
}

function setScoreboardRange(range) {
  scoreboardRange = range;
  for (const tab of scoreboardTabs) tab.classList.toggle("is-active", tab.dataset.range === range);
  scoreboardRangeNote.textContent = rangeNote(range);
  renderScoreboard();
}

async function renderScoreboard() {
  const token = ++scoreboardRenderToken;
  const range = scoreboardRange;
  renderScoreboardRows([], true);
  // Wait out a submit still in flight first, otherwise the board can be read
  // back before the score from the run just played has landed in it.
  if (pendingScoreSubmit) await pendingScoreSubmit;
  const entries = await getLeaderboard(range);
  if (token !== scoreboardRenderToken) return;
  renderScoreboardRows(entries);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openScoreboard(fromScreen) {
  scoreboardReturnScreen = fromScreen;
  state = "scoreboard";
  // Open on this week - that is the board the contest is actually run on.
  setScoreboardRange("week");
  // Render the share card now, while the player is reading the board, so the
  // Share tap can call navigator.share() immediately and keep its user
  // activation. Failures are ignored - shareScore falls back to rendering it
  // itself, and there is nothing useful to say about it at this point.
  prepareScoreCard(getHighScore(), currentUsername).catch(() => {});
  fromScreen.classList.add("hidden");
  scoreboardScreen.classList.remove("hidden");
}

// Returns to whichever screen opened it, so reading the rules from the handle
// screen doesn't lose a half-typed handle.
let termsReturnScreen = startScreen;

function openTerms(fromScreen) {
  termsReturnScreen = fromScreen;
  state = "terms";
  fromScreen.classList.add("hidden");
  termsScreen.classList.remove("hidden");
}

function closeTerms() {
  state = termsReturnScreen === usernameScreen ? "username" : "start";
  termsScreen.classList.add("hidden");
  termsReturnScreen.classList.remove("hidden");
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
  pendingScoreSubmit = addLeaderboardEntry(currentUsername, score);
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

  // These two used to be the same number, but they answer different questions.
  // minRow is how far back the cat may retreat, which must never go below the
  // first row. The camera target may: letting it sit below row 0 at the start
  // puts the cat at its normal height up the screen immediately, instead of
  // pinned to the very bottom edge - which on a tall phone spawned it
  // underneath the d-pad. The rows below 0 just draw as empty café floor.
  const minRow = Math.max(0, maxRowReached - lowerOffset());
  const targetCamera = maxRowReached - lowerOffset();
  cameraRow += (targetCamera - cameraRow) * Math.min(1, dt * CAMERA_EASE);

  world.ensureGenerated(Math.ceil(cameraRow) + VISIBLE_ROWS + 2);
  world.update(dt);
  world.prune(Math.floor(cameraRow) - 2);

  player.update(dt, minRow);
  maxRowReached = Math.max(maxRowReached, player.row);
  score = maxRowReached;
  scoreEl.textContent = formatScore(score);

  const tier = world.tierAt(maxRowReached);
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
  // Carry a remembered handle into this session so a share card built from the
  // start screen (before any run) is attributed to the right account.
  currentUsername = getUsername();

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
  for (const tab of scoreboardTabs) {
    tab.addEventListener("click", () => setScoreboardRange(tab.dataset.range));
  }
  startTermsButton.addEventListener("click", () => openTerms(startScreen));
  usernameTermsButton.addEventListener("click", () => openTerms(usernameScreen));
  termsCloseButton.addEventListener("click", closeTerms);

  await preloadImages();

  startLoop(update, render);
}

init();
