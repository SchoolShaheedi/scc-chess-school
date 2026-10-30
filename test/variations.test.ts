import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { addMove, deleteSideline, fromLine, hasVariations, inSideline, mainLine, pgnWithVariations, stepBack, stepForward, toEnd, tokens, ucisOf } from "../src/analysis/tree";
import { describeThreat, nullMove, pvSan, whiteScore } from "../src/analysis/threat";
import { nodeEngine } from "./engine";

const START = new Chess().fen();
const MATED = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";   // fool's mate: White is mated

describe("variation tree", () => {
  it("a different move makes a side-line and keeps the rest of the game", () => {
    const t = fromLine(["e2e4", "e7e5", "g1f3"]);
    const p = addMove(t, [0], "c7c5");
    expect(p).toEqual([0, 1]);
    expect(mainLine(t)).toEqual(["e2e4", "e7e5", "g1f3"]);
    expect(ucisOf(t, p)).toEqual(["e2e4", "c7c5"]);
    expect(hasVariations(t)).toBe(true);
    expect(inSideline(p)).toBe(true);
  });
  it("the same move steps onto the existing one instead of duplicating", () => {
    const t = fromLine(["e2e4", "e7e5"]);
    expect(addMove(t, [0], "e7e5")).toEqual([0, 0]);
    expect(hasVariations(t)).toBe(false);
    expect(addMove(t, [0], "c7c5")).toEqual([0, 1]);
    expect(addMove(t, [0], "c7c5")).toEqual([0, 1]);
    expect(t.children[0].children).toHaveLength(2);
  });
  it("steps in, along and out of a side-line", () => {
    const t = fromLine(["e2e4", "e7e5"]);
    let p = addMove(t, [0], "c7c5"); p = addMove(t, p, "g1f3");
    expect(p).toEqual([0, 1, 0]);
    expect(stepBack(p)).toEqual([0, 1]);
    expect(stepForward(t, [0, 1])).toEqual([0, 1, 0]);
    expect(stepForward(t, [0, 1, 0])).toEqual([0, 1, 0]);
    expect(toEnd(t, [0, 1])).toEqual([0, 1, 0]);
    expect(toEnd(t, [])).toEqual([0, 0]);
  });
  it("deletes the whole side-line from inside it, landing where it left the game", () => {
    const t = fromLine(["e2e4", "e7e5"]);
    let p = addMove(t, [0], "c7c5"); p = addMove(t, p, "g1f3");
    expect(deleteSideline(t, p)).toEqual([0]);
    expect(hasVariations(t)).toBe(false);
    expect(mainLine(t)).toEqual(["e2e4", "e7e5"]);
    expect(deleteSideline(t, [0, 0])).toBeNull();
  });
  it("lists the moves with side-lines in brackets and Black's number after a bracket", () => {
    const t = fromLine(["e2e4", "e7e5", "g1f3"]);
    addMove(t, [0], "c7c5");
    const text = tokens(t, START).map(k => k.kind === "open" ? "(" : k.kind === "close" ? ")" : `${k.label} ${k.san}`.trim()).join(" ");
    expect(text).toBe("1. e4 e5 ( 1... c5 ) 2. Nf3");
  });
  it("PGN export writes variations and chess.js can read the main line back", () => {
    const t = fromLine(["e2e4", "e7e5", "g1f3"]);
    addMove(t, [0], "c7c5");
    const pgn = pgnWithVariations(t, "A", "B", "*");
    expect(pgn).toContain("1. e4 e5 (1... c5) 2. Nf3 *");
    expect(pgn).toContain('[White "A"]');
    const g = new Chess(); g.loadPgn(pgn);
    expect(g.history()).toEqual(["e4", "e5", "Nf3"]);
  });
  it("PGN from a Black-to-move start FEN numbers correctly and carries SetUp/FEN", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const t = fromLine(["e7e5"]); addMove(t, [], "c7c5");
    const pgn = pgnWithVariations(t, "?", "?", "*", fen);
    expect(pgn).toContain('[FEN "' + fen + '"]');
    expect(pgn).toContain("1... e5 (1... c5) *");
  });
});

describe("threat helper", () => {
  it("passes the move to the other side and clears en passant", () => {
    expect(nullMove("rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3"))
      .toEqual({ fen: "rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR b KQkq - 0 3" });
  });
  it("skips when the side to move is in check, or the game is over, or the FEN is bad", () => {
    expect(nullMove("4k3/8/8/8/8/8/4r3/4K3 w - - 0 1")).toEqual({ skip: "check" });
    expect(nullMove(MATED)).toEqual({ skip: "check" });
    expect(nullMove("not a fen")).toEqual({ skip: "illegal" });
  });
  it("describes a mate, a won piece, an even trade, a promotion, and nothing", () => {
    expect(describeThreat("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2", "d8h4", { mate: 1 })).toEqual({ kind: "mate", san: "Qh4#", n: 1 });
    expect(describeThreat("4k3/8/8/8/4p3/3N4/8/4K3 b - - 0 1", "e4d3", { cp: 300 })).toMatchObject({ kind: "capture", piece: "n", value: 3 });
    expect(describeThreat("4k3/8/8/8/4p3/3N4/8/4K3 b - - 0 1", "e4d3", { cp: 10 }).kind).toBe("none");
    expect(describeThreat("8/4P3/8/8/8/8/k7/4K3 w - - 0 1", "e7e8q", { cp: 900 }).kind).toBe("promote");
    expect(describeThreat(START, "e2e4", { cp: 20 }).kind).toBe("none");
    expect(describeThreat(START, "e2e4", { cp: 200 }).kind).toBe("advantage");
  });
  it("formats a line and flips scores to White's view", () => {
    expect(pvSan(START, ["e2e4", "e7e5", "g1f3"], 6)).toBe("1.e4 e5 2.Nf3");
    expect(pvSan("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", ["e7e5", "g1f3"])).toBe("1...e5 2.Nf3");
    expect(pvSan(START, ["e2e4", "e2e4"])).toBe("1.e4");
    expect(whiteScore({ cp: 40 }, false)).toEqual({ cp: -40, mate: undefined });
    expect(whiteScore({ mate: 2 }, true)).toEqual({ mate: 2 });
  });
  it.runIf(process.env.ENGINE === "1")("engine: three lines, a stale request is skipped, the null-move position is searchable", async () => {
    const e = await nodeEngine();
    const lines = await e.lines(START, { n: 3, depth: 8, movetime: 3000 });
    expect(lines).toHaveLength(3);
    expect(lines.every(l => l.pv.length >= 2)).toBe(true);
    expect(await e.lines(START, { n: 3, depth: 8, stale: () => true })).toEqual([]);
    const nm = nullMove("rnbqkb1r/pppp1ppp/5n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4");
    expect("fen" in nm).toBe(true);
    if ("fen" in nm) expect((await e.lines(nm.fen, { n: 1, depth: 10 }))[0].pv.length).toBeGreaterThan(0);
  }, 30000);
});
