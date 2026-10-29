// The engine in the browser: Stockfish 19 lite (single-threaded WASM, ~1.8MB) in a Web Worker, started
// only when a lesson first needs it, then kept. Files live in public/engine/ (npm run engine copies them).
import { Uci } from "./uci";

let engine: Uci | null = null;

export function getEngine(): Uci {
  if (!engine) {
    const worker = new Worker("engine/stockfish-19-lite-single.js");
    // an engine that fails to load or stops answering is thrown away, so the next request starts a fresh one
    // (DECISIONS #128): 10 s to start, 30 s for any one search
    const mine: Uci = new Uci({
      send: cmd => worker.postMessage(cmd),
      onLine: cb => { worker.onmessage = e => String(e.data).split("\n").forEach(l => l && cb(l)); },
    }, { startMs: 10_000, searchMs: 30_000, onDead: () => { worker.terminate(); if (engine === mine) engine = null; } });
    worker.onerror = () => mine.fail(new Error("engine failed to load"));
    engine = mine;
  }
  return engine;
}
