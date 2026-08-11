const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

export function startLoop(update, render) {
  let last = performance.now();
  let accumulator = 0;

  function tick(now) {
    const frameMs = Math.min(now - last, MAX_FRAME_MS);
    last = now;
    accumulator += frameMs;

    while (accumulator >= STEP_MS) {
      update(STEP_MS / 1000);
      accumulator -= STEP_MS;
    }

    render();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame((now) => {
    last = now;
    requestAnimationFrame(tick);
  });
}
