// The engine in the browser: Stockfish 19 lite (single-threaded WASM, ~1.8MB) in a Web Worker, started
// only when a lesson first needs it, then kept. Files live in public/engine/ (npm run engine copies them).
import { Uci } from "./uci";

let engine: Uci | null = null;

export function getEngine(): Uci {
  if (!engine) {
    const worker = new Worker("engine/stockfish-19-lite-single.js");
    engine = new Uci({
      send: cmd => worker.postMessage(cmd),
      onLine: cb => { worker.onmessage = e => String(e.data).split("\n").forEach(l => l && cb(l)); },
    });
  }
  return engine;
}
