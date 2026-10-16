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

// Game Review option A (DECISIONS #104): the extra labels, the Game Rating, key moments and the coach report
import { coachReport, gameRating, isSacrifice, keyMoments, reasonFor, refine, type Reviewed } from "../src/review/insights";
import { UI } from "../src/i18n";
import type { Graded } from "../src/review/grade";

const words = (k: string) => (UI as Record<string, { en: string; pa: string }>)[k];
const piece = (p: string) => words(`pc${p.toUpperCase()}`);
const gm = (x: Partial<Graded>): Graded => ({ san: "e4", uci: "e2e4", by: "w", best: "e2e4", before: 50, after: 50, drop: 0, label: "best", ...x });

describe("Game Review: facts behind the words", () => {
  it("a move that leaves a piece unguarded is named, with its square", () => {
    // the bishop walks into the b7 pawn's reach
    const r = reasonFor("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "f1a6", "g1f3");
    expect(r).toEqual({ kind: "hang", piece: "b", sq: "a6" });
  });
  it("a missed mate is named as a mate", () => {
    // Scholar's set-up: Qxf7# was there
    const r = reasonFor("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "d2d3", "h5f7");
    expect(r).toEqual({ kind: "mate", best: "Qxf7#" });
  });
  it("a sacrifice: the moved piece can be taken for less, and it took nothing as big", () => {
    expect(isSacrifice("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "c4f7")).toBe(true);   // Bxf7+
    expect(isSacrifice(new Chess().fen(), "e2e4")).toBe(false);
  });
});

describe("Game Review: the extra labels", () => {
  it("Book while still in theory; Great when the second-best was clearly worse; Miss when a win is thrown away", () => {
    const fens = [new Chess().fen(), new Chess().fen(), new Chess().fen()];
    const g = [gm({ san: "e4", uci: "e2e4" }), gm({ san: "e5", uci: "e7e5", by: "b", before: 60, after: 60 }), gm({ before: 80, after: 50, drop: 30, label: "blunder", best: "d2d4" })];
    // pretend: move 2 (index 1) had a second-best far worse; move 3 threw away a won position but is not lost
    const r = refine(g, fens, [undefined, { cp: -400 }, undefined], ["e4", "e5", "d3"]);
    expect(r[0].label).toBe("book");
    expect(r[2].label).toBe("miss");
  });
  it("Great: the best move, out of book, when the second-best loses badly", () => {
    const g = [gm({ san: "e4" }), gm({ san: "Nh6", uci: "g8h6", by: "b", before: 60, after: 60, best: "g8h6" })];
    const fen1 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const r = refine(g, [new Chess().fen(), fen1], [undefined, { cp: -400 }], ["e4", "Nh6"]);
    expect(r[1].label).toBe("great");
  });
});

describe("Game Review: Game Rating and key moments", () => {
  it("rises with accuracy and leans on the opponent's rating", () => {
    expect(gameRating(50)).toBe(400); expect(gameRating(90)).toBe(1700);
    expect(gameRating(80, 1700, 90)).toBeLessThan(gameRating(80, 1700, 70));
    expect(gameRating(80) % 50).toBe(0);
  });
  it("picks the worst slip, a missed chance and the best moment, in game order", () => {
    const r: Reviewed[] = [
      { ...gm({ label: "best" }), label: "great", i: 0 },
      { ...gm({ by: "b" }), i: 1 },
      { ...gm({ drop: 35, label: "blunder" }), label: "blunder", i: 2 },
      { ...gm({ by: "b" }), i: 3 },
      { ...gm({ drop: 22, label: "mistake" }), label: "miss", i: 4 },
    ];
    expect(keyMoments(r, "w").map(m => m.i)).toEqual([0, 2, 4]);
  });
  it("the coach report always ends with one thing to practise, chosen from the turning point", () => {
    const r: Reviewed[] = [{ ...gm({ drop: 35, label: "blunder" }), label: "blunder", i: 0, reason: { kind: "hang", piece: "n", sq: "e5" } }];
    const lines = coachReport(r, "w", words, piece);
    expect(lines.at(-1)).toEqual(words("tip_hang"));
    expect(lines.some(l => l.en.includes("knight on e5"))).toBe(true);
    const clean = coachReport([{ ...gm({}), i: 0 }], "w", words, piece);
    expect(clean.at(-1)).toEqual(words("tip_clean"));
  });
});

describe("Game Review: a threat left unanswered", () => {
  it("names the piece a move failed to save, not just one it newly put en prise", () => {
    // the preview game: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nge7 4.d3 a6 5.Ng5 d5, and now 6.Nc3 leaves the c4 bishop to the d5 pawn
    const g = new Chess();
    for (const m of ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nge7", "d3", "a6", "Ng5", "d5"]) g.move(m);
    expect(reasonFor(g.fen(), "b1c3", "e4d5")).toEqual({ kind: "hang", piece: "b", sq: "c4" });
  });
});
