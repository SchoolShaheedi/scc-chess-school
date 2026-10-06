// DECISIONS #84: the shared game helpers behind the chess.com-style game feel.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { captured, movesFor, positionAt, premoveTargets } from "../src/play/gamekit";

describe("movesFor", () => {
  const castle = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
  it("castles when the king is dropped on its own rook, either side", () => {
    expect(movesFor(new Chess(castle), "e1", "h1").map(m => m.san)).toEqual(["O-O"]);
    expect(movesFor(new Chess(castle), "e1", "a1").map(m => m.san)).toEqual(["O-O-O"]);
    expect(movesFor(new Chess(castle.replace(" w ", " b ")), "e8", "h8").map(m => m.san)).toEqual(["O-O"]);
  });
  it("still takes the usual two-square king move", () => {
    expect(movesFor(new Chess(castle), "e1", "g1").map(m => m.san)).toEqual(["O-O"]);
  });
  it("refuses king-on-rook when castling is not allowed", () => {
    expect(movesFor(new Chess("r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1"), "e1", "h1")).toEqual([]);
  });
  it("returns nothing for an illegal move, and every promotion for a promotion", () => {
    expect(movesFor(new Chess(), "e2", "e5")).toEqual([]);
    expect(movesFor(new Chess("8/P6k/8/8/8/8/8/K7 w - - 0 1"), "a7", "a8")).toHaveLength(4);
  });
});

describe("captured", () => {
  it("lists what each side took and the material lead from the board", () => {
    const g = new Chess();
    for (const m of ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qxa2", "Rxa2"]) g.move(m);
    const c = captured(g);
    expect(c.w).toEqual(["p", "q"]);
    expect(c.b).toEqual(["p", "p"]);
    expect(c.lead).toBe(8);   // a queen (9) against a pawn (1)
  });
  it("counts a promotion even though nothing was captured", () => {
    const g = new Chess("8/P6k/8/8/8/8/8/K7 w - - 0 1"); g.move("a8=Q");
    expect(captured(g).lead).toBe(9);
  });
});

describe("positionAt", () => {
  it("steps back through a game and forward to the live position", () => {
    const g = new Chess(); for (const m of ["e4", "e5", "Nf3"]) g.move(m);
    expect(positionAt(g, 0).fen).toBe(new Chess().fen());
    expect(positionAt(g, 1).last).toEqual(["e2", "e4"]);
    expect(positionAt(g, 3).fen).toBe(g.fen());
    expect(positionAt(g, 99).fen).toBe(g.fen());
  });
  it("works for a game that started from a set position", () => {
    const start = "8/8/8/4k3/8/8/4P3/4K3 w - - 0 1", g = new Chess(start); g.move("e4");
    expect(positionAt(g, 0).fen).toBe(start);
  });
});

describe("premoveTargets", () => {
  it("shows where a piece could go on its next turn", () => {
    const g = new Chess(); g.move("e4");   // Black to move; White premoves
    expect(premoveTargets(g.fen(), "g1").sort()).toEqual(["e2", "f3", "h3"]);
  });
  it("returns nothing rather than failing when chess.js refuses the swapped position", () => {
    expect(premoveTargets("4k3/8/8/8/8/8/8/8 b - - 0 1", "e8")).toEqual([]);   // no White king: not a position
  });
});
