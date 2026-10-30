// The Endgame ladder (2026-10-30). The TRUTH RULE: every rung's position and claim (a win, or a draw to hold) is proved with
// Stockfish. The proof is gated behind LADDER_PROOF=1 because it takes minutes:
//     LADDER_PROOF=1 npx vitest run test/ladder.test.ts
// The cheap checks (legal FENs, ids, both languages, slide boards) always run.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { asNumber } from "../src/engine/uci";
import { engineGoalMet, SLIP } from "../src/chess/rules";
import { RUNGS, rungById } from "../src/content/ladder";
import { nodeEngine } from "./engine";

// the six nukta letters exist twice in Unicode; the ladder text must use the decomposed form (letter + U+0A3C), never these
const PRECOMPOSED = new RegExp("[" + [0x0a33, 0x0a36, 0x0a59, 0x0a5a, 0x0a5b, 0x0a5e].map(c => String.fromCharCode(c)).join("") + "]");

describe("ladder data", () => {
  it("has rungs with unique ids, both languages and legal positions", () => {
    expect(RUNGS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(RUNGS.map(r => r.id)).size).toBe(RUNGS.length);
    for (const r of RUNGS) {
      expect(rungById(r.id)).toBe(r);
      const g = new Chess(r.ex.fen);
      expect(g.isGameOver(), `${r.id} starts over`).toBe(false);
      // the side NOT to move must not be in check (an illegal position Stockfish would refuse)
      const o = new Chess(r.ex.fen.replace(/ [wb] /, g.turn() === "w" ? " b " : " w ").replace(/ - \d+ \d+$/, " - 0 1"));
      expect(o.isCheck(), `${r.id}: the other king is in check`).toBe(false);
      expect(r.learn.length, `${r.id} slides`).toBeGreaterThanOrEqual(2);
      expect(r.learn.length, `${r.id} slides`).toBeLessThanOrEqual(3);
      for (const t of [r.title, r.goal, r.ex.prompt, r.ex.hint!, ...r.learn.map(s => s.text)]) {
        expect(t?.en?.trim(), `${r.id} en`).toBeTruthy(); expect(t?.pa?.trim(), `${r.id} pa`).toBeTruthy();
        expect(PRECOMPOSED.test(t.pa), `${r.id}: precomposed nukta`).toBe(false);
        expect(/ ।/.test(t.pa), `${r.id}: space before danda`).toBe(false);
      }
      for (const s of r.learn) if (s.board?.fen) expect(() => new Chess(s.board!.fen!), `${r.id} slide fen`).not.toThrow();
      expect(r.claim === "win" ? r.ex.goal !== "hold" : r.ex.goal === "hold", `${r.id}: claim vs goal`).toBe(true);
    }
  });
});

const proof = process.env.LADDER_PROOF ? describe : describe.skip;
proof("ladder proofs (Stockfish)", () => {
  for (const r of RUNGS) it(`${r.id}: ${r.claim} ${r.ex.fen}`, async () => {
    const e = await nodeEngine(), ex = r.ex, depth = ex.depth ?? 14;
    const slip = ex.slip ?? SLIP[ex.goal];
    const me = new Chess(ex.fen).turn();
    const log: string[] = [];

    // 1. the claim, at depth 26, from the learner's side
    const start = await e.analyse(ex.fen, { depth: 26 });
    const s0 = asNumber(start.score);
    if (r.claim === "win") expect(s0, `${r.id}: a win must score clearly winning at depth 26`).toBeGreaterThanOrEqual(300);
    else expect(Math.abs(s0), `${r.id}: a draw must score level at depth 26`).toBeLessThanOrEqual(60);
    log.push(`depth-26 score ${s0}`);

    // 2. the task is real: some legal first moves throw the result away (measured at depth 16, the learner's view)
    const g0 = new Chess(ex.fen);
    const cands = await e.candidates(ex.fen, { n: g0.moves().length, depth: 16 });
    const bad = cands.filter(c => asNumber(c.score) < slip);
    const good = cands.length - bad.length;
    expect(bad.length, `${r.id}: no first move spoils it, the task is not real`).toBeGreaterThan(0);
    log.push(`first moves: ${good} keep it, ${bad.length} spoil it (of ${cands.length})`);

    // 3. played out exactly as the app's runner does (src/lesson/exercises.ts runEngineVs), both sides full-strength at the app depth
    const g = new Chess(ex.fen);
    let moves = 0, outcome = "", min = Infinity;
    while (!outcome) {
      const a = await e.analyse(g.fen(), { depth });
      const mv = g.move({ from: a.best.slice(0, 2), to: a.best.slice(2, 4), promotion: a.best[4] }); moves++;
      if (g.isCheckmate()) { outcome = "checkmate"; break; }
      const b = await e.analyse(g.fen(), { depth });
      const mine = g.isGameOver() ? (g.isDraw() ? 0 : 99999) : -asNumber(b.score);
      min = Math.min(min, mine);
      if (g.isGameOver()) { outcome = ex.goal === "hold" ? "held (draw by rule)" : "FAIL: ended without the win"; break; }
      if (ex.goal !== "hold" && mine < slip) { outcome = `FAIL: slip ${mine} at move ${moves}`; break; }
      if (ex.goal === "hold" && mine < slip) { outcome = `FAIL: slip ${mine} at move ${moves}`; break; }
      if (ex.goal !== "hold" && engineGoalMet(g, me, ex.goal, mv)) { outcome = mv.promotion ? "promoted" : "wiped"; break; }
      if (ex.goal === "hold" && moves >= ex.maxMoves) { outcome = "held"; break; }
      if (moves >= ex.maxMoves) { outcome = `FAIL: out of moves (${moves})`; break; }
      const r2 = g.move({ from: b.best.slice(0, 2), to: b.best.slice(2, 4), promotion: b.best[4] });
      if (g.isCheckmate()) { outcome = "FAIL: mated"; break; }
      if (g.isGameOver()) { outcome = ex.goal === "hold" ? "held (draw by rule)" : "FAIL: ended without the win"; break; }
      if (ex.goal === "wipe" && engineGoalMet(g, me, "wipe", r2)) { outcome = "wiped"; break; }
    }
    log.push(`self-play (depth ${depth}): ${outcome} in ${moves} of ${ex.maxMoves} moves, lowest eval ${min === Infinity ? "-" : min}`);
    console.log(`PROOF ${r.id} [${r.claim}] ${ex.fen}\n   ${log.join("\n   ")}`);
    expect(outcome.startsWith("FAIL"), `${r.id}: ${outcome}`).toBe(false);
  }, 600000);
});

// progress: the ladder's stars are saved to the account and merged like the rest (src/merge.ts)
import { emptySaved, merge, savable } from "../src/merge";
import { store } from "../src/store";
describe("ladder progress", () => {
  it("merges the better stars on each rung, from either device", () => {
    const a = { ...emptySaved(), ladder: { opposition: 3 as const, lucena: 1 as const } };
    const b = { ...emptySaved(), ladder: { lucena: 2 as const, philidor: 1 as const } };
    expect(merge(a, b).ladder).toEqual({ opposition: 3, lucena: 2, philidor: 1 });
    expect(merge(emptySaved(), emptySaved()).ladder).toBeUndefined();
  });
  it("completeRung keeps the best stars, never lowers them, and is saved", () => {
    store.set({ ladder: undefined, xp: 0 });
    store.completeRung("opposition", 2); store.completeRung("opposition", 1);
    expect(store.get().ladder).toEqual({ opposition: 2 });
    store.completeRung("opposition", 3);
    expect(store.get().ladder).toEqual({ opposition: 3 });
    expect(savable(store.get()).ladder).toEqual({ opposition: 3 });
  });
});
