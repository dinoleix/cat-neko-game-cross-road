export const TILE_SIZE = 48;
export const COLS = 9;
export const VISIBLE_ROWS = 14;
export const MARGIN_COLS = 2; // decorative, non-playable café backdrop on each side

export const PLAY_OFFSET_X = MARGIN_COLS * TILE_SIZE;
export const LOGICAL_WIDTH = (COLS + MARGIN_COLS * 2) * TILE_SIZE;
export const LOGICAL_HEIGHT = VISIBLE_ROWS * TILE_SIZE;

export function colToX(col) {
  return PLAY_OFFSET_X + col * TILE_SIZE;
}

export function rowToY(row, cameraRow) {
  return LOGICAL_HEIGHT - (row - cameraRow) * TILE_SIZE - TILE_SIZE;
}

export function clampCol(col) {
  return Math.max(0, Math.min(COLS - 1, col));
}
