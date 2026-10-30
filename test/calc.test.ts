// Calculate (feature 3): the move-line handling, the candidate rating, and the board-vision squares and scoring.
import { readdirSync, readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { CALC_LEVELS, calcTarget, calcUnlocked, checkAnswer, fitsLevel, legalAfter, makeDrill, rateCandidates, type CalcPuzzle } from "../src/puzzles/calc";
import { ALL_SQUARES } from "../src/chess/types";
import { YOUNG_KINDS, answerTask, attackedSquares, freshState, makeTask, roundScore, squareColour, squareOf, tapSquare } from "../src/puzzles/vision";
import { merge, savable } from "../src/merge";
import { UI } from "../src/i18n";

const dir = "public/puzzles/bank";
const ix = JSON.parse(readFileSync(`${dir}/index.json`, "utf8")) as { themes: string[]; bands: { file: string }[] };
const bank: CalcPuzzle[] = ix.bands.flatMap(b => readFileSync(`${dir}/${b.file}`, "utf8").split("\n").filter(Boolean).map(l => {
  const [id, fen, moves, rating] = l.split("\t");
  return { id, fen, moves: moves.split(" "), rating: +rating };
}));

describe("calculation drills", () => {
  it("the bank is loaded", () => { expect(bank.length).toBeGreaterThan(40000); expect(readdirSync(dir).length).toBeGreaterThan(10); });

  it("every puzzle that fits a level makes a drill whose final move is legal after the hidden moves", () => {
    let made = [0, 0, 0, 0];
    // the whole bank (~50k puzzles, ~150 s) with CALC_ALL=1; otherwise every 25th puzzle, so the normal suite stays fast
    const sample = process.env.CALC_ALL === "1" ? bank : bank.filter((_, i) => i % 25 === 0);
    for (const p of sample) for (let n = 1; n <= CALC_LEVELS; n++) {
      const d = makeDrill(p, n);
      if (!fitsLevel(p, n)) { expect(d, `${p.id} too short for ${n}`).toBeNull(); continue; }
      expect(d, `${p.id} level ${n}`).not.toBeNull();
      // replay independently: setup move, n pairs, then the answer must be legal
      const g = new Chess(p.fen);
      for (const u of p.moves.slice(0, 2 * n + 1)) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      expect(g.fen(), `${p.id} level ${n} afterFen`).toBe(d!.afterFen);
      expect(legalAfter(d!, d!.answer.slice(0, 2), d!.answer.slice(2, 4)), `${p.id} level ${n} answer legal`).toBe(true);
      expect(checkAnswer(d!, d!.answer.slice(0, 2), d!.answer.slice(2, 4))).toBe(true);
      expect(d!.hidden).toHaveLength(2 * n);
      // the learner sees the position after the setup move, never the starting one
      expect(d!.fen).not.toBe(p.fen);
      made[n]++;
    }
    const k = sample.length / bank.length;   // the thresholds are for the whole bank
    expect(made[1]).toBeGreaterThan(10000 * k); expect(made[2]).toBeGreaterThan(1000 * k); expect(made[3]).toBeGreaterThan(100 * k);
  }, 600_000);

  it("writes the line with move numbers", () => {
    // setup 1. a3, then the learner (Black) plays e5, White e4, Nc6, Nf3, and the answer is a6
    const p: CalcPuzzle = { id: "x", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", rating: 1000,
      moves: ["a2a3", "e7e5", "e2e4", "b8c6", "g1f3", "a7a6"] };
    const d = makeDrill(p, 2)!;
    expect(d.line).toBe("1... e5 2. e4 Nc6 3. Nf3");
    expect(d.answerSan).toBe("a6");
    expect(makeDrill(p, 3)).toBeNull();   // needs 8 moves
  });

  it("accepts a different move only if it mates", () => {
    // Ra8# is the line's move; Rb8# also mates; Rb3 does not
    const d = { id: "m", fen: "", afterFen: "6k1/5ppp/8/8/8/8/1R4PP/R5K1 w - - 0 1", hidden: [], line: "", answer: "a1a8", answerSan: "Ra8#" };
    expect(checkAnswer(d, "a1", "a8")).toBe(true);
    expect(checkAnswer(d, "b2", "b8")).toBe(true);
    expect(checkAnswer(d, "b2", "b3")).toBe(false);
    expect(checkAnswer(d, "a1", "h8")).toBe(false);   // illegal
  });

  it("rates candidates within 50 centipawns", () => {
    const eng = [{ move: "e2e4", score: { cp: 40 } }, { move: "d2d4", score: { cp: 0 } }, { move: "a2a3", score: { cp: -60 } }];
    expect(rateCandidates(eng, ["e2e4", "d2d4", "a2a3", "h2h3"]).map(r => r.good)).toEqual([true, true, false, false]);
    expect(rateCandidates([{ move: "a1a8", score: { mate: 1 } }, { move: "b2b3", score: { cp: 300 } }], ["b2b3"])[0].good).toBe(false);
    expect(rateCandidates([], ["e2e4"])[0].good).toBe(false);
  });

  it("opens levels by success and aims a little lower on deeper levels", () => {
    expect(calcUnlocked()).toBe(1);
    expect(calcUnlocked([2])).toBe(1);
    expect(calcUnlocked([3])).toBe(2);
    expect(calcUnlocked([5, 3, 0])).toBe(3);
    expect(calcUnlocked([0, 9, 9])).toBe(1);
    expect(calcTarget(1200, 1)).toBe(1200); expect(calcTarget(1200, 3)).toBe(1000); expect(calcTarget(450, 3)).toBe(400);
  });
});

describe("board vision", () => {
  it("knight squares", () => {
    expect(attackedSquares("knight", "a1")).toEqual(["b3", "c2"]);
    expect(attackedSquares("knight", "d4")).toHaveLength(8);
    expect(attackedSquares("knight", "h8")).toEqual(["f7", "g6"]);
  });
  it("rook, bishop and queen counts on an empty board", () => {
    for (const s of ALL_SQUARES) { expect(attackedSquares("rook", s)).toHaveLength(14); expect(attackedSquares("queen", s)).toHaveLength(attackedSquares("rook", s).length + attackedSquares("bishop", s).length); }
    expect(attackedSquares("bishop", "a1")).toHaveLength(7);
    expect(attackedSquares("bishop", "d4")).toHaveLength(13);
    expect(attackedSquares("queen", "d4")).toHaveLength(27);
    expect(attackedSquares("rook", "a1")).not.toContain("a1");
  });
  it("agrees with chess.js for a lone piece", () => {
    for (const [kind, ch] of [["knight", "n"], ["bishop", "b"], ["rook", "r"], ["queen", "q"]] as const) for (const s of ALL_SQUARES) {
      const g = new Chess(); g.clear(); g.put({ type: ch, color: "w" }, s as never); g.put({ type: "k", color: "w" }, (s === "a1" ? "h8" : "a1") as never);
      const to = g.moves({ verbose: true }).filter(m => m.piece === ch).map(m => m.to).sort();
      expect(attackedSquares(kind, s).filter(q => q !== (s === "a1" ? "h8" : "a1")), `${kind} ${s}`).toEqual(to.filter(q => q !== (s === "a1" ? "h8" : "a1")));
    }
  });
  it("light and dark", () => { expect(squareColour("a1")).toBe("dark"); expect(squareColour("h1")).toBe("light"); expect(squareColour("e4")).toBe("light"); expect(squareColour("d4")).toBe("dark"); });
  it("makes tasks of every kind, never the same square twice running", () => {
    let i = 0; const rand = () => ((i++ * 0.37) % 1);
    for (const kind of ["knight", "bishop", "rook", "queen", "colour", "name"] as const) {
      const a = makeTask(kind, rand), b = makeTask(kind, rand, a.sq);
      expect(b.sq).not.toBe(a.sq);
    }
    expect(YOUNG_KINDS).toEqual(["knight", "rook"]);
  });
  it("scores attack taps: +1 right, -1 wrong, repeats ignored, done when all found", () => {
    const task = makeTask("knight", () => 0);   // a1
    expect(task.answer).toEqual(["b3", "c2"]);
    let st = freshState(), r = tapSquare(task, st, "b3"); expect([r.delta, r.state.done]).toEqual([1, false]); st = r.state;
    r = tapSquare(task, st, "b3"); expect(r.delta).toBe(0);
    r = tapSquare(task, st, "h8"); expect([r.delta, r.state.wrong]).toEqual([-1, 1]); st = r.state;
    r = tapSquare(task, st, "c2"); expect([r.delta, r.state.done]).toEqual([1, true]); st = r.state;
    expect(tapSquare(task, st, "b3").delta).toBe(0);
  });
  it("scores colour and name answers, and a round never goes below zero", () => {
    const c = makeTask("colour", () => 0);   // a1 is dark
    expect(answerTask(c, "dark").delta).toBe(1); expect(answerTask(c, "light").delta).toBe(-1);
    const n = makeTask("name", () => 0);
    expect(answerTask(n, "a1").delta).toBe(1); expect(answerTask(n, "a2").delta).toBe(-1);
    expect(roundScore([1, 1, -1, 1])).toBe(2); expect(roundScore([-1, -1, 1])).toBe(0); expect(roundScore([])).toBe(0);
    expect(squareOf("e", "4")).toBe("e4"); expect(squareOf("i", "4")).toBeNull(); expect(squareOf("e", "9")).toBeNull();
  });
});

describe("saving", () => {
  it("keeps the better calculation run and vision round from either device", () => {
    const base = { xp: 0, streak: { days: 0, last: "" }, lessons: {} };
    const m = merge({ ...base, calcBest: [4, 1], visionBest: { knight: 12 } }, { ...base, calcBest: [2, 3, 5], visionBest: { knight: 9, rook: 7 } });
    expect(m.calcBest).toEqual([4, 3, 5]); expect(m.visionBest).toEqual({ knight: 12, rook: 7 });
    expect(Object.keys(savable({ ...(base as object), calcBest: [1], visionBest: {} } as never))).toContain("calcBest");
  });
});

describe("Punjabi text for Calculate", () => {
  const keys = Object.keys(UI).filter(k => /^(calc|vision)/.test(k)) as (keyof typeof UI)[];
  it("exists in both languages, decomposed, with no space missing before the danda", () => {
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) {
      const pa = UI[k].pa;
      expect(pa, k).toBeTruthy(); expect(UI[k].en, k).toBeTruthy();
      expect([0x0A33, 0x0A36, 0x0A59, 0x0A5A, 0x0A5B, 0x0A5E].some(c => pa.includes(String.fromCharCode(c))), `${k} precomposed nukta`).toBe(false);
      expect(/\s।/.test(pa), `${k} space before danda`).toBe(false);
    }
  });
});
