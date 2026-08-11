let audioCtx = null;

export function getCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Must be called from inside a user gesture (e.g. the start button click)
// so the browser doesn't block audio playback.
export function unlockAudio() {
  getCtx();
}
