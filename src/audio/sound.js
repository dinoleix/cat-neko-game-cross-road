import { getCtx } from "./context.js";

export { unlockAudio } from "./context.js";

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

// Classic descending "sad trombone" - two whomp notes, each with its own
// pitch-down slide, for the moment the cat gets bumped over.
export function playGameOver() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const notes = [
    { start: now, freq: 220 },
    { start: now + 0.32, freq: 185 },
  ];

  for (const { start, freq } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.62, start + 0.4);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.14, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

    osc.start(start);
    osc.stop(start + 0.44);
  }
}
