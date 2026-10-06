// Game Review maths (DECISIONS #73), plus one real game graded by Stockfish.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { accuracy, grade, label, moveAccuracy, whiteWin } from "../src/review/grade";
import { nodeEngine } from "./engine";

describe("win chances and labels", () => {
  it("level is 50%, a big plus is near 100%, a mate is fully won", () => {
    expect(whiteWin({ cp: 0 }, true)).toBeCloseTo(50);
    expect(whiteWin({ cp: 900 }, true)).toBeGreaterThan(95);
    expect(whiteWin({ cp: 300 }, false)).toBeLessThan(30);          // +3 for Black = bad for White
    expect(whiteWin({ mate: 2 }, true)).toBeGreaterThan(97);
  });
  it("uses the Lichess thresholds", () => {
    expect(label(35, false)).toBe("blunder"); expect(label(25, false)).toBe("mistake");
    expect(label(12, false)).toBe("inaccuracy"); expect(label(3, true)).toBe("best"); expect(label(3, false)).toBe("good");
  });
  it("one blunder in ten moves costs far more than a tenth (harmonic mean)", () => {
    const g = Array.from({ length: 10 }, (_, i) => ({ by: "w" as const, drop: i === 0 ? 40 : 0 })) as Parameters<typeof accuracy>[0];
    expect(accuracy(g, "w")).toBeLessThan(80);
  });
  it("a perfect move scores 100% accuracy, a 30-point drop much less", () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 0); expect(moveAccuracy(30)).toBeLessThan(30);
  });
});

describe("a real game", () => {
  it("Scholar's mate: Black's 3...Nf6?? is a blunder and White's Qxf7# is best", async () => {
    const e = await nodeEngine(), g = new Chess();
    const sans = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];
    const evals = [], moves = [];
    for (const san of sans) {
      const a = await e.analyse(g.fen(), { depth: 10 }); evals.push({ score: a.score, best: a.best });
      const m = g.move(san); moves.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? "") });
    }
    evals.push({ score: { mate: 0 }, best: "" });                  // checkmated: Black to move, lost
    const r = grade(moves, evals);
    expect(r[5].label).toBe("blunder");
    expect(r[6].label).toBe("best");
    expect(accuracy(r, "w")).toBeGreaterThan(accuracy(r, "b"));
  }, 120000);
});
