// Your own mistakes as spaced drills (2026-10-29): a reviewed game's worst slips become personal puzzles in the mistake bank,
// due like a missed puzzle, kept through every review, and reachable by phase from Insights.
import { Chess } from "chess.js";
import { beforeEach, describe, expect, it } from "vitest";
import { gameId, isMine, MINE_PER_GAME, minePuzzles } from "../src/puzzles/mine";
import { bankDue, mineDue } from "../src/puzzles/due";
import type { Reviewed } from "../src/review/insights";
import { store, today } from "../src/store";

/** Scholar's mate: Black's 3...Nf6?? is the blunder (ply 5); the engine would play 3...g6 or Qe7. */
const SANS = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];
function setup(over: Partial<Record<number, Partial<Reviewed>>> = {}) {
  const g = new Chess(), fens = [g.fen()], r: Reviewed[] = [];
  SANS.forEach((san, i) => {
    const m = g.move(san), uci = m.from + m.to + (m.promotion ?? "");
    r.push({ san, uci, by: i % 2 ? "b" : "w", best: uci, before: 50, after: 50, drop: 0, label: "best", i, ...over[i] });
    fens.push(g.fen());
  });
  return { r, fens };
}

beforeEach(() => store.reset());

describe("minePuzzles", () => {
  it("turns the learner's blunder into a puzzle: the position before the opponent's move, then the best move", () => {
    const { r, fens } = setup({ 5: { label: "blunder", drop: 90, best: "g7g6" } });
    const d = minePuzzles(r, fens, "b", "gid");
    expect(d).toHaveLength(1);
    expect(d[0].id).toBe("my:gid:5");
    expect(d[0].mine).toMatchObject({ fen: fens[4], moves: ["f1c4", "g7g6"], g: "gid", ph: "opening", san: "Nf6" });
    // the same shape runPuzzle plays: moves[0] is the opponent's, and every move is legal in turn
    const c = new Chess(d[0].mine.fen);
    for (const u of d[0].mine.moves) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    expect(new Chess(d[0].mine.fen).turn()).toBe("w");   // the opponent (White) moves first, then the learner (Black)
  });
  it("only the learner's blunders, mistakes and misses: not inaccuracies, not the opponent's, not the first ply", () => {
    const { r, fens } = setup({
      0: { label: "blunder", drop: 50, best: "d2d4" },       // the very first ply has no opponent move before it: skipped
      1: { label: "inaccuracy", drop: 12, best: "c7c5" },
      2: { label: "blunder", drop: 60, best: "g1f3" },       // White's: not mine when I am Black
      3: { label: "mistake", drop: 25, best: "g8f6" },
      5: { label: "miss", drop: 40, best: "g7g6" },
    });
    expect(minePuzzles(r, fens, "b", "g").map(x => x.id)).toEqual(["my:g:3", "my:g:5"]);
  });
  it("keeps at most MINE_PER_GAME, the costliest, in game order", () => {
    const g = new Chess(), fens = [g.fen()], r: Reviewed[] = [];
    for (let i = 0; i < 16; i++) {
      const m = g.moves({ verbose: true })[0], uci = m.from + m.to;
      g.move(m.san); fens.push(g.fen());
      r.push({ san: m.san, uci, by: i % 2 ? "b" : "w", best: "e2e4", before: 50, after: 20, drop: 20 + i, label: "mistake", i });
    }
    const d = minePuzzles(r, fens, "w", "x");
    expect(d).toHaveLength(MINE_PER_GAME);
    expect(d.map(x => +x.id.split(":")[2])).toEqual([6, 8, 10, 12, 14]);
  });
  it("a game id is stable, and different games differ", () => {
    expect(gameId(["e2e4", "e7e5"])).toBe(gameId(["e2e4", "e7e5"]));
    expect(gameId(["e2e4", "e7e5"])).not.toBe(gameId(["d2d4", "d7d5"]));
    expect(isMine("my:abc:5")).toBe(true); expect(isMine("0000D")).toBe(false);
  });
});

describe("the mistake bank with personal drills", () => {
  const drill = (ply: number, ph: "opening" | "middlegame" | "endgame" = "opening") => ({
    id: `my:g:${ply}`, mine: { fen: new Chess().fen(), moves: ["e2e4", "e7e5"], g: "g", ph, san: "Nf6" },
  });
  it("a saved drill is due today, like a missed puzzle, and counts in the bank's due list", () => {
    store.addMine([drill(5)]);
    expect(store.get().missed["my:g:5"]).toMatchObject({ box: 0, due: today() });
    expect(bankDue()).toBe(1); expect(mineDue()).toBe(1);
  });
  it("reviewing the same game again does not reset a drill's schedule", () => {
    store.addMine([drill(5)]);
    store.recordPuzzle("my:g:5", undefined, true);              // solved: up a box, due later
    const after = store.get().missed["my:g:5"];
    expect(after.box).toBe(1); expect(after.due > today()).toBe(true);
    store.addMine([drill(5)]);
    expect(store.get().missed["my:g:5"]).toEqual(after);
    expect(bankDue()).toBe(0);
  });
  it("keeps the puzzle through a miss and a clean solve (the card used to lose its data)", () => {
    store.addMine([drill(5)]);
    store.recordPuzzle("my:g:5", undefined, false);
    expect(store.get().missed["my:g:5"].mine?.san).toBe("Nf6");
    store.recordPuzzle("my:g:5", undefined, true);
    expect(store.get().missed["my:g:5"].mine?.moves).toEqual(["e2e4", "e7e5"]);
  });
  it("three clean solves in a row take a drill out of the bank", () => {
    store.addMine([drill(5)]);
    for (let i = 0; i < 3; i++) store.recordPuzzle("my:g:5", undefined, true);
    expect(store.get().missed["my:g:5"]).toBeUndefined();
  });
  it("Insights' Practise can ask for one phase only", () => {
    store.addMine([drill(5, "opening"), drill(31, "endgame"), drill(33, "endgame")]);
    expect(mineDue("endgame")).toBe(2); expect(mineDue("opening")).toBe(1); expect(mineDue("middlegame")).toBe(0);
  });
  it("a big-bank puzzle keeps its rating through a miss in the Race (so it can come back)", () => {
    store.recordPuzzle("abcde", undefined, false, ["fork"], 1850);
    expect(store.get().missed["abcde"].r).toBe(1850);
    expect(store.get().prating).toBeUndefined();               // the Race is unrated: the puzzle rating did not move
    store.recordPuzzle("abcde", undefined, false);              // missed again in the bank screen: still has its rating
    expect(store.get().missed["abcde"].r).toBe(1850);
  });
});
