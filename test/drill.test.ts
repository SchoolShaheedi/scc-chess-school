import { describe, expect, it } from "vitest";
import { attackedBy, drillMoves, move, safeKingMoves } from "../src/chess/drill";

const sorted = (a: string[]) => [...a].sort();

describe("drill moves", () => {
  it("rook on an empty board reaches 14 squares", () => expect(drillMoves({ d4: "wR" }, "d4")).toHaveLength(14));
  it("bishop on d4 reaches 13", () => expect(drillMoves({ d4: "wB" }, "d4")).toHaveLength(13));
  it("queen on d4 reaches 27", () => expect(drillMoves({ d4: "wQ" }, "d4")).toHaveLength(27));
  it("knight in the corner has 2 jumps", () => expect(sorted(drillMoves({ a1: "wN" }, "a1"))).toEqual(["b3", "c2"]));
  it("knight jumps over a wall of pawns", () =>
    expect(sorted(drillMoves({ b1: "wN", a2: "wP", b2: "wP", c2: "wP", d2: "wP" }, "b1"))).toEqual(["a3", "c3"]));
  it("own piece blocks a slider; enemy piece can be captured but not passed", () => {
    expect(sorted(drillMoves({ d4: "wR", d6: "wP", a4: "bN" }, "d4").filter(s => s[0] === "d" || s[1] === "4")))
      .toEqual(sorted(["d5", "d3", "d2", "d1", "a4", "b4", "c4", "e4", "f4", "g4", "h4"]));
  });
  it("pawn: double step from the start, never through a piece, captures only diagonally", () => {
    expect(sorted(drillMoves({ e2: "wP" }, "e2"))).toEqual(["e3", "e4"]);
    expect(drillMoves({ e2: "wP", e3: "bN" }, "e2")).toEqual([]);
    expect(sorted(drillMoves({ e4: "wP", e5: "bP", d5: "bN", f5: "wB" }, "e4"))).toEqual(["d5"]);
  });
  it("a pawn reaching the last rank becomes a queen", () => expect(move({ e7: "wP" }, "e7", "e8")).toEqual({ e8: "wQ" }));
  it("black pawns attack downwards", () => expect(sorted([...attackedBy({ e5: "bP" }, "b")])).toEqual(["d4", "f4"]));
  it("king cannot hide from a rook behind itself", () => {
    // king e4, rook a4: e4 is attacked; stepping to f4 is still on the rook's line
    expect(safeKingMoves({ e4: "wK", a4: "bR" }, "e4")).not.toContain("f4");
  });
});
