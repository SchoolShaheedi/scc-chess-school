// The notation drill's reader (Practice tools, 2026-11-03): forgiving about how a move is typed, strict about which move.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { checkTyped, drillFrom, nameChoices, readMove } from "../src/puzzles/notation";

const START = new Chess().fen();
const CASTLE = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
const TWO_KNIGHTS = "4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1";
const PROMO = "7k/4P3/8/8/8/8/8/4K3 w - - 0 1";
const PROMO_TAKE = "3r3k/4P3/8/8/8/8/8/4K3 w - - 0 1";
const BC4 = "4k3/8/8/8/2p5/1P6/4B3/4K3 w - - 0 1";   // bxc4 and Bxc4 are both legal
const EP = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1";
const san = (fen: string, s: string) => { const r = readMove(fen, s); return r.ok ? r.san : r.reason; };

describe("readMove accepts", () => {
  it.each([["Nf3", "Nf3"], ["nf3", "Nf3"], ["Nf3+", "Nf3"], ["  Nf3 ", "Nf3"], ["Ng1f3", "Nf3"], ["Ng1-f3", "Nf3"], ["e4", "e4"], ["e2e4", "e4"],
    ["E4".toLowerCase(), "e4"], ["e4!", "e4"], ["Pe4".slice(1), "e4"]])("%s in the start position", (typed, want) => expect(san(START, typed)).toBe(want));
  it.each([["O-O", "O-O"], ["0-0", "O-O"], ["o-o", "O-O"], ["00", "O-O"], ["O-O-O", "O-O-O"], ["0-0-0", "O-O-O"], ["ooo", "O-O-O"], ["o-o-o", "O-O-O"], ["0–0", "O-O"]])
  ("castling written %s", (typed, want) => expect(san(CASTLE, typed)).toBe(want));
  it("promotion with or without = and in either case", () => {
    for (const s of ["e8=Q", "e8Q", "e8q", "e8=q", "e8=Q+", "e8=Q#"]) expect(san(PROMO, s)).toBe("e8=Q+");
    expect(san(PROMO, "e8=N")).toBe("e8=N");
    expect(san(PROMO, "e8n")).toBe("e8=N");
  });
  it("a capture with or without the x", () => {
    for (const s of ["exd8=Q", "ed8Q", "exd8Q", "exd8q", "ed8=q"]) expect(san(PROMO_TAKE, s)).toBe("exd8=Q+");
    expect(san(EP, "exd6")).toBe("exd6"); expect(san(EP, "ed6")).toBe("exd6"); expect(san(EP, "exd6 e.p.".replace(" e.p.", ""))).toBe("exd6");
  });
  it("a disambiguation that was not needed", () => expect(san(START, "Nbc3")).toBe("Nc3"));
  it("a needed disambiguation, by file", () => { expect(san(TWO_KNIGHTS, "Nbd2")).toBe("Nbd2"); expect(san(TWO_KNIGHTS, "nfd2")).toBe("Nfd2"); });
  it("a lower-case piece letter where nothing else is meant", () => { expect(san(BC4, "bd3")).toBe("Bd3"); expect(san(START, "nc3")).toBe("Nc3"); });
});

describe("readMove refuses", () => {
  it("nothing", () => { expect(san(START, "")).toBe("empty"); expect(san(START, "   ")).toBe("empty"); });
  it.each(["hello", "Zf3", "e9", "Nf", "12", "O-O-O-O", "e4e5e6", "N", "Qxx"])("unreadable: %s", s => expect(san(START, s)).toBe("unreadable"));
  it.each(["e5", "Nf4", "Ke2", "Qd3", "Bc4", "O-O", "O-O-O", "exd5", "a5"])("not legal in the start position: %s", s => expect(san(START, s)).toBe("illegal"));
  it("castling not allowed here", () => expect(san("4k3/8/8/8/8/8/8/R3K3 w Q - 0 1", "0-0")).toBe("illegal"));
  it("two knights could go there", () => { expect(san(TWO_KNIGHTS, "Nd2")).toBe("ambiguous"); expect(san(TWO_KNIGHTS, "nd2")).toBe("ambiguous"); });
  it("bc4 may be the pawn or the bishop", () => { expect(san(BC4, "bc4")).toBe("ambiguous"); expect(san(BC4, "bxc4")).toBe("bxc4"); expect(san(BC4, "Bxc4")).toBe("Bxc4"); });
  it("a promotion without its piece says what is missing", () => {
    for (const s of ["e8", "e7e8"]) expect(san(PROMO, s)).toBe("promotion");
    expect(san(PROMO_TAKE, "exd8")).toBe("promotion");
    expect(san(PROMO_TAKE, "ed8")).toBe("promotion");
    expect(san(PROMO, "e7")).toBe("illegal");   // not a move at all
    expect(san(START, "e8")).toBe("illegal");
  });
  it("a pawn push that is really a capture", () => expect(san(EP, "d6")).toBe("illegal"));
});

describe("checkTyped", () => {
  it("right, exact and not", () => {
    expect(checkTyped(START, "Nf3", "Nf3")).toEqual({ result: "right", san: "Nf3", exact: true });
    expect(checkTyped(START, "nf3", "Nf3")).toEqual({ result: "right", san: "Nf3", exact: false });
    expect(checkTyped(CASTLE, "0-0", "O-O")).toEqual({ result: "right", san: "O-O", exact: false });
    expect(checkTyped(PROMO, "e8q", "e8=Q+")).toEqual({ result: "right", san: "e8=Q+", exact: false });
  });
  it("a missing + still counts as right", () => expect(checkTyped(PROMO, "e8=Q", "e8=Q+")).toMatchObject({ result: "right" }));
  it("wrong gives the proper name of what was typed", () => expect(checkTyped(START, "e4", "Nf3")).toEqual({ result: "wrong", san: "e4" }));
  it("the other promotion is wrong", () => expect(checkTyped(PROMO, "e8=N", "e8=Q+")).toEqual({ result: "wrong", san: "e8=N" }));
  it("when the expected move is mate, any mating move is right", () => {
    const BACK = "6k1/5ppp/8/8/8/8/8/R3R1K1 w - - 0 1";   // Ra8# and Re8# both mate
    expect(checkTyped(BACK, "Re8", "Ra8#")).toMatchObject({ result: "right", san: "Re8#" });
    expect(checkTyped(BACK, "Ra8", "Ra8#")).toEqual({ result: "right", san: "Ra8#", exact: false });
    expect(checkTyped(BACK, "Kf1", "Ra8#")).toMatchObject({ result: "wrong" });   // a quiet move is still wrong
  });
  it("a bare promotion is reported as such", () => expect(checkTyped(PROMO, "e8", "e8=Q+")).toEqual({ result: "promotion" }));
  it("passes on the reader's refusals", () => { expect(checkTyped(START, "e5", "Nf3")).toEqual({ result: "illegal" }); expect(checkTyped(START, "??", "Nf3")).toEqual({ result: "empty" }); });
});

describe("nameChoices", () => {
  it("holds the answer once, four distinct legal names", () => {
    const c = nameChoices(START, "Nf3", () => 0.3), legal = new Chess().moves();
    expect(c).toHaveLength(4); expect(new Set(c).size).toBe(4); expect(c.filter(x => x === "Nf3")).toHaveLength(1);
    for (const m of c) expect(legal).toContain(m);
  });
  it("with few legal moves, gives what there is", () => {
    const fen = "7k/8/8/8/8/8/8/K7 w - - 0 1";   // Ka2, Kb1, Kb2 and nothing else
    const c = nameChoices(fen, "Kb2"); expect(c.sort()).toEqual(["Ka2", "Kb1", "Kb2"]);
  });
});

describe("drillFrom", () => {
  it("plays the setup move and asks for the next", () => {
    const d = drillFrom({ fen: START, moves: ["e2e4", "e7e5", "g1f3"] })!;
    expect(d.san).toBe("e5"); expect(d.from).toBe("e7"); expect(d.to).toBe("e5"); expect(d.fen.split(" ")[1]).toBe("b");
  });
  it("refuses a short or illegal line", () => { expect(drillFrom({ fen: START, moves: ["e2e4"] })).toBeNull(); expect(drillFrom({ fen: START, moves: ["e2e4", "e2e4"] })).toBeNull(); });
});
