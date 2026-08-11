export function rectsOverlap(a, b, shrink = 0.8) {
  const aw = a.w * shrink;
  const ah = a.h * shrink;
  const bw = b.w * shrink;
  const bh = b.h * shrink;
  const ax = a.x + (a.w - aw) / 2;
  const ay = a.y + (a.h - ah) / 2;
  const bx = b.x + (b.w - bw) / 2;
  const by = b.y + (b.h - bh) / 2;

  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
