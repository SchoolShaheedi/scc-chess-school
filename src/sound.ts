// Sound effects, synthesised with the Web Audio API: no audio files, nothing to license, nothing
// to download, works offline. Deliberately small and soft (a children's app): a wooden "tock" for a
// move, a heavier one for a capture, a ping for check, a chime for right, a low soft tone for wrong
// (never a harsh buzzer), and a short rising run when a lesson is finished. No music, and no shabad
// or kirtan audio anywhere (DECISIONS #6, #43). Off/on in Settings.
import { store } from "./store";

let ctx: AudioContext | null = null;
const ac = () => {
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};
// browsers only allow audio after a tap; wake the context on the first one
addEventListener("pointerdown", () => { if (store.get().sound) ac(); }, { once: true, capture: true });

function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + at);
  g.gain.setValueAtTime(0.0001, a.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.02);
}

/** A short filtered noise burst plus a low body: sounds like a wooden piece set down on a board. */
function tock(vol: number, body: number) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * 0.05), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 1.2; g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
  tone(body, 0, 0.09, vol * 0.5, "triangle");
}

const on = () => store.get().sound;

export const sound = {
  move: () => { if (on()) tock(0.5, 190); },
  capture: () => { if (on()) { tock(0.7, 150); setTimeout(() => tock(0.35, 120), 45); } },
  check: () => { if (on()) { tone(880, 0, 0.12, 0.12, "triangle"); tone(1320, 0.07, 0.14, 0.08, "triangle"); } },
  correct: () => { if (on()) { tone(1046.5, 0, 0.16, 0.14); tone(1318.5, 0.09, 0.22, 0.14); } },
  wrong: () => { if (on()) tone(196, 0, 0.22, 0.12, "triangle"); },
  complete: () => { if (on()) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.3, 0.13)); },
};
