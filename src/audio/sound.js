let audioCtx = null;

function getCtx() {
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

// A short, square-wave "mrreow" chirp - plays whenever the difficulty
// steps up a tier, as an 8-bit-style warning cue.
export function playMeow() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(680, now);
  osc.frequency.exponentialRampToValueAtTime(980, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(460, now + 0.24);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  osc.start(now);
  osc.stop(now + 0.3);
}
