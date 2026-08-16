export const TILE_SIZE = 48;
export const COLS = 9;
export const MARGIN_COLS = 2; // decorative, non-playable café backdrop on each side

export const PLAY_OFFSET_X = MARGIN_COLS * TILE_SIZE;
export const LOGICAL_WIDTH = (COLS + MARGIN_COLS * 2) * TILE_SIZE;
export const PLAY_WIDTH = COLS * TILE_SIZE; // the part that must always be on screen

// How tall a slice of the world is on screen is a property of the device, not
// a constant: a tall phone shows more rows rather than sitting letterboxed
// with dead bars above and below. These are `let` so setViewportHeight can
// update them - importers get ES module live bindings, so they see the new
// values without having to re-import or be handed them explicitly.
export let LOGICAL_HEIGHT = 14 * TILE_SIZE;
export let VISIBLE_ROWS = 14;

export function setViewportHeight(px) {
  LOGICAL_HEIGHT = px;
  VISIBLE_ROWS = Math.ceil(px / TILE_SIZE);
}

export function colToX(col) {
  return PLAY_OFFSET_X + col * TILE_SIZE;
}

export function rowToY(row, cameraRow) {
  return LOGICAL_HEIGHT - (row - cameraRow) * TILE_SIZE - TILE_SIZE;
}

export function clampCol(col) {
  return Math.max(0, Math.min(COLS - 1, col));
}
