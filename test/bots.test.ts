// The bots (DECISIONS #69): the move chooser is pure and tested here; the strength ladder plays real
// games with Stockfish. The full ladder is slow, so it runs only with LADDER=1 (npm run ladder).
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { BOTS, type Bot, bookMove, botMove, chooseMove } from "../src/bots/bots";
import { asNumber } from "../src/engine/uci";
import { nodeEngine } from "./engine";

/** A repeatable random stream, so a failing ladder game can be replayed. */
const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

describe("chooseMove", () => {
  const cands = [{ move: "e2e4", score: { cp: 40 } }, { move: "d2d4", score: { cp: 35 } }, { move: "g1h3", score: { cp: -300 } }];
  it("a careless roll plays any legal move", () => {
    expect(chooseMove(cands, ["a2a3"], { temp: 10, careless: 1 }, () => 0)).toBe("a2a3");
  });
  it("a strong bot (low temp) almost never picks a move 3 pawns worse", () => {
    const r = seeded(7); let bad = 0;
    for (let i = 0; i < 2000; i++) if (chooseMove(cands, [], { temp: 12, careless: 0 }, r) === "g1h3") bad++;
    expect(bad).toBe(0);
  });
  it("a weak bot (high temp) sometimes does", () => {
    const r = seeded(7); let bad = 0;
    for (let i = 0; i < 2000; i++) if (chooseMove(cands, [], { temp: 450, careless: 0 }, r) === "g1h3") bad++;
    expect(bad).toBeGreaterThan(100);
  });
  it("a found mate is not treated as infinitely better than everything else", () => {
    const m = [{ move: "h5f7", score: { mate: 1 } }, { move: "d2d3", score: { cp: 0 } }];
    const r = seeded(3); let other = 0;
    for (let i = 0; i < 2000; i++) if (chooseMove(m, [], { temp: 450, careless: 0 }, r) === "d2d3") other++;
    expect(other).toBeGreaterThan(50);   // Nanhi Chidi can miss a mate in one
  });
});

/** Play one game; returns 1 if `white` wins, 0 if `black` wins, 0.5 for a draw. Long games are judged by Stockfish. */
async function game(white: Bot, black: Bot, seed: number, maxPlies = 160): Promise<number> {
  const e = await nodeEngine(), g = new Chess(), r = seeded(seed);
  while (!g.isGameOver() && g.history().length < maxPlies) {
    const bot = g.turn() === "w" ? white : black;
    const legal = g.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));
    const mv = await botMove(e, g.fen(), legal, bot, r, g.history());
    g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] });
  }
  if (g.isCheckmate()) return g.turn() === "w" ? 0 : 1;
  if (g.isGameOver()) return 0.5;
  const s = asNumber((await e.analyse(g.fen(), { depth: 12 })).score) * (g.turn() === "w" ? 1 : -1);
  return s > 300 ? 1 : s < -300 ? 0 : 0.5;
}

describe("bot strength", () => {
  it("Baaz beats Nanhi Chidi with either colour", async () => {
    const [chidi, baaz] = [BOTS[0], BOTS[5]];
    expect(await game(baaz, chidi, 11, 120)).toBe(1);
    expect(await game(chidi, baaz, 12, 120)).toBe(0);
  }, 600000);

  it.runIf(process.env.LADDER)("each bot outscores the one below it (ladder)", async () => {
    const GAMES = 6, report: string[] = [];
    for (let i = 0; i + 1 < BOTS.length; i++) {
      const [lo, hi] = [BOTS[i], BOTS[i + 1]];
      let score = 0;
      for (let k = 0; k < GAMES; k++) score += k % 2 ? 1 - await game(lo, hi, 100 + k) : await game(hi, lo, 100 + k);
      report.push(`${hi.id} vs ${lo.id}: ${score} / ${GAMES}`);
      process.stderr.write(report.at(-1) + "\n");
      expect(score, report.at(-1)).toBeGreaterThan(GAMES / 2);
    }
  }, 3600000);
});

describe("opening book", () => {
  it("never opens with a rare sideline", () => {
    const r = seeded(5), firsts = new Set<string>();
    for (let i = 0; i < 300; i++) firsts.add(bookMove([], r)!);
    for (const m of firsts) expect(["e4", "d4", "c4", "Nf3"], m).toContain(m);
  });
  it("follows theory, and stops after the book", () => {
    expect(bookMove(["e4", "e5", "Nf3"], seeded(1))).toBeTruthy();
    expect(bookMove("e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6".split(" "))).toBeNull();
  });
});
