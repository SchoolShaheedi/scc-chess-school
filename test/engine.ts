// Stockfish in Node for the content guard: the same Uci driver the app uses in the browser.
import { createRequire } from "node:module";
import { Uci } from "../src/engine/uci";

let engine: Promise<Uci> | null = null;

export function nodeEngine(): Promise<Uci> {
  if (!engine) engine = (async () => {
    const init = createRequire(import.meta.url)("stockfish");
    let cb: (line: string) => void = () => {};
    const sf = await init("lite-single");
    sf.listener = (line: string) => cb(line);
    return new Uci({ send: c => sf.sendCommand(c), onLine: f => { cb = f; } });
  })();
  return engine;
}
