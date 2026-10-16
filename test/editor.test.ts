// The board editor's rules (DECISIONS #115): FEN, castling from the pieces, and what makes a position unplayable.
import { describe, expect, it } from "vitest";
import { castlingOf, fenOf, problemOf } from "../src/analysis/position";
import { placementFromFen } from "../src/chess/types";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("board editor", () => {
  it("writes the start position back as the standard FEN", () => {
    expect(fenOf(placementFromFen(START), "w")).toBe(START);
  });
  it("gives castling only where the king and that rook are at home", () => {
    expect(castlingOf({ e1: "wK", h1: "wR", e8: "bK", a8: "bR" })).toBe("Kq");
    expect(castlingOf({ e1: "wK", g1: "wR", d8: "bK", a8: "bR" })).toBe("-");
  });
  it("accepts a legal position and names what is wrong with a bad one", () => {
    expect(problemOf({ g1: "wK", e1: "wR", g8: "bK" }, "w")).toBeNull();
    expect(problemOf({ g1: "wK" }, "w")).toBe("kings");
    expect(problemOf({ g1: "wK", h1: "wK", g8: "bK" }, "w")).toBe("kings");
    expect(problemOf({ g1: "wK", g8: "bK", a8: "wP" }, "w")).toBe("pawnEdge");
    // White's rook gives check to Black's king, but it is Black who has just moved: impossible
    expect(problemOf({ g1: "wK", e8: "wR", g8: "bK" }, "w")).toBe("notToMoveInCheck");
    expect(problemOf({ g1: "wK", e8: "wR", g8: "bK" }, "b")).toBeNull();
  });
  it("counts too many pawns", () => {
    const pos = { g1: "wK", g8: "bK", ...Object.fromEntries("abcdefgh".split("").map(f => [f + "3", "wP"])), a4: "wP" } as const;
    expect(problemOf(pos, "w")).toBe("tooMany");
  });
});
