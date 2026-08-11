import { getCtx } from "./context.js";

// Descending ii-iii-... jazz-ish loop: Fmaj7 -> Em7 -> Dm7 -> Cmaj7.
const CHORDS = [
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [164.81, 196.0, 246.94, 293.66], // Em7
  [146.83, 174.61, 220.0, 261.63], // Dm7
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
];

const BPM = 78;
const BEAT_SEC = 60 / BPM;
const BEATS_PER_CHORD = 4;
const SCHEDULE_AHEAD_SEC = 0.3;
const LOOKAHEAD_MS = 100;

let started = false;
let noiseBuffer = null;
let masterGain = null;
let padFilter = null;
let timerId = null;
let nextNoteTime = 0;
let beatIndex = 0;
let chordIndex = 0;

function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function playChord(ctx, freqs, time, duration) {
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(padFilter);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.045, time + 0.6);
    gain.gain.setValueAtTime(0.045, time + duration - 0.4);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

function playKick(ctx, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(masterGain);

  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(48, time + 0.15);

  gain.gain.setValueAtTime(0.22, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

  osc.start(time);
  osc.stop(time + 0.2);
}

function playSnare(ctx, time) {
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1800;
  band.Q.value = 0.7;
  const gain = ctx.createGain();
  noise.connect(band);
  band.connect(gain);
  gain.connect(masterGain);

  gain.gain.setValueAtTime(0.09, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

  noise.start(time);
  noise.stop(time + 0.13);
}

function playHat(ctx, time) {
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 6000;
  const gain = ctx.createGain();
  noise.connect(high);
  high.connect(gain);
  gain.connect(masterGain);

  gain.gain.setValueAtTime(0.02, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

  noise.start(time);
  noise.stop(time + 0.06);
}

function scheduler() {
  const ctx = getCtx();
  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
    if (beatIndex === 0) {
      playChord(ctx, CHORDS[chordIndex], nextNoteTime, BEAT_SEC * BEATS_PER_CHORD);
    }
    if (beatIndex === 0 || beatIndex === 2) playKick(ctx, nextNoteTime);
    if (beatIndex === 1 || beatIndex === 3) playSnare(ctx, nextNoteTime);
    playHat(ctx, nextNoteTime);
    playHat(ctx, nextNoteTime + BEAT_SEC / 2);

    nextNoteTime += BEAT_SEC;
    beatIndex += 1;
    if (beatIndex >= BEATS_PER_CHORD) {
      beatIndex = 0;
      chordIndex = (chordIndex + 1) % CHORDS.length;
    }
  }
  timerId = setTimeout(scheduler, LOOKAHEAD_MS);
}

// Idempotent - safe to call on every "begin playing" without restarting
// or layering a second loop on top.
export function startMusic() {
  if (started) return;
  started = true;

  const ctx = getCtx();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.55; // overall background level, kept low
  masterGain.connect(ctx.destination);

  padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 1200; // muffled, "lofi" warmth on the chords
  padFilter.connect(masterGain);

  chordIndex = 0;
  beatIndex = 0;
  nextNoteTime = ctx.currentTime + 0.1;
  scheduler();
}

export function stopMusic() {
  if (timerId) clearTimeout(timerId);
  timerId = null;
  started = false;
}
