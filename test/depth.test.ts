// Game Review at depth 14 and Insights at depth 12, kept usable on a phone: the depth governor (src/review/depth.ts), and
// "Show why" (src/review/refute.ts).
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { DepthGovernor, INSIGHTS_BUDGET_MS, INSIGHTS_DEPTH, MIN_DEPTH, REVIEW_BUDGET_MS, REVIEW_DEPTH } from "../src/review/depth";
import { refutation } from "../src/review/refute";
import { nodeEngine } from "./engine";

/** A simulated engine: one search costs `ms14` at depth 14, 1.7x more per extra ply, times a position's own difficulty. */
function simulate(plies: number, ms14: number, max: number, budget: number, seed = 1) {
  const gov = new DepthGovernor(plies, max, budget);
  let s = seed, total = 0; const depths: number[] = [];
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < plies; i++) {
    const d = gov.next(), hard = 0.3 + rand() * 2.7;           // some positions cost 10x others
    const ms = (ms14 / 1.7 ** 14) * 1.7 ** d * hard;
    gov.record(d, ms); total += ms; depths.push(d);
  }
  return { total, depths };
}

describe("the depth governor", () => {
  it("a fast device keeps the full depth all the way", () => {
    const r = simulate(80, 250, REVIEW_DEPTH, REVIEW_BUDGET_MS);        // 80 plies = a 40-move game
    expect(r.depths.every(d => d === REVIEW_DEPTH)).toBe(true);
    expect(r.total).toBeLessThan(REVIEW_BUDGET_MS);
  });
  for (const ms14 of [500, 1000, 2000, 4000, 8000]) {
    it(`a 40-move game stays within ~60 s even when a depth-14 search takes ${ms14} ms`, () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const r = simulate(80, ms14, REVIEW_DEPTH, REVIEW_BUDGET_MS, seed);
        expect(r.total, `seed ${seed}`).toBeLessThan(62_000);
        expect(Math.min(...r.depths)).toBeGreaterThanOrEqual(MIN_DEPTH);
      }
    });
  }
  it("Insights (depth 12) finishes each game inside its own budget on a slow phone too", () => {
    for (const ms12 of [100, 400, 1500]) {
      const r = simulate(80, ms12 * 1.7 ** 2, INSIGHTS_DEPTH, INSIGHTS_BUDGET_MS);
      expect(r.total, `${ms12}`).toBeLessThan(INSIGHTS_BUDGET_MS * 1.1);
    }
  });
  it("the raised depths are the ones asked for", () => { expect(REVIEW_DEPTH).toBe(14); expect(INSIGHTS_DEPTH).toBe(12); });
});

describe("a real 40-move game on the WASM engine", () => {
  // slow: the timing report for the build notes. TIMING=1 npx vitest run test/depth.test.ts
  it.runIf(process.env.TIMING)("grades 81 positions at depth 14 with two lines inside the budget", async () => {
    const e = await nodeEngine(), g = new Chess(), fens = [g.fen()];
    // an 80-ply game: the engine plays itself at depth 6 (quick), then the grader looks at every position
    for (let i = 0; i < 80 && !g.isGameOver(); i++) { const b = (await e.analyse(g.fen(), { depth: 6 })).best; g.move({ from: b.slice(0, 2), to: b.slice(2, 4), promotion: b[4] }); fens.push(g.fen()); }
    const gov = new DepthGovernor(fens.length, REVIEW_DEPTH, REVIEW_BUDGET_MS), t00 = performance.now(), used: number[] = [];
    let fixed = 0;
    for (const f of fens.slice(0, 12)) { const t0 = performance.now(); await e.candidates(f, { n: 2, depth: REVIEW_DEPTH }); fixed += performance.now() - t0; }
    const t1 = performance.now();
    for (const f of fens) {
      const d = gov.next(), t0 = performance.now(); await e.candidates(f, { n: 2, depth: d }); gov.record(d, performance.now() - t0); used.push(d);
    }
    const total = performance.now() - t1;
    process.stderr.write(`plies ${fens.length}; fixed depth 14 on 12 positions: ${(fixed / 12).toFixed(0)} ms each (x${fens.length} = ${((fixed / 12) * fens.length / 1000).toFixed(0)} s); governed total ${(total / 1000).toFixed(1)} s; depths ${[...new Set(used)].join("/")} (${performance.now() - t00 > 0 ? "ok" : ""})\n`);
    expect(total).toBeLessThan(65_000);
  }, 300000);
});

describe("Show why", () => {
  it("plays the engine's line after the move: numbered, from the opponent's side", () => {
    const g = new Chess(); for (const s of ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6"]) g.move(s);
    const r = refutation(g.fen(), ["h5f7"]);
    expect(r.text).toBe("4. Qxf7#");
    expect(r.steps).toHaveLength(1);
  });
  it("shows at most four plies, and numbers a Black first move with an ellipsis", () => {
    const g = new Chess(); g.move("e4");
    const r = refutation(g.fen(), ["e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4"]);
    expect(r.steps).toHaveLength(4);
    expect(r.text).toBe("1… e5 2. Nf3 Nc6 3. Bb5");
  });
  it("stops at a move that is not legal (a stale line) and shows what it can", () => {
    const g = new Chess(); g.move("e4");
    expect(refutation(g.fen(), ["e7e5", "a1a8"]).steps).toHaveLength(1);
    expect(refutation(g.fen(), []).text).toBe("");
  });
});
