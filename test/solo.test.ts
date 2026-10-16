// Solo Chess (DECISIONS #115): the capture rules and the puzzle builder.
import { describe, expect, it } from "vitest";
import { anyMove, capture, capturesFrom, makePuzzle, PATH, rng, type Solo, solvable, solved, starsFor } from "../src/solo/rules";

describe("Solo Chess rules", () => {
  const st: Solo = { a1: { kind: "R", left: 2 }, a5: { kind: "N", left: 2 }, a8: { kind: "B", left: 2 }, b7: { kind: "P", left: 2 } };
  it("a rook captures the first piece on its line only, and a pawn diagonally forward", () => {
    expect(capturesFrom(st, "a1", true)).toEqual(["a5"]);
    expect(capturesFrom({ ...st, c8: { kind: "Q", left: 2 } }, "b7", true).sort()).toEqual(["a8", "c8"]);
  });
  it("a piece with no captures left can't move, unless there is no limit", () => {
    const tired: Solo = { a1: { kind: "R", left: 0 }, a5: { kind: "N", left: 2 } };
    expect(capturesFrom(tired, "a1", true)).toEqual([]);
    expect(capturesFrom(tired, "a1", false)).toEqual(["a5"]);
  });
  it("a king is never captured", () => {
    expect(capturesFrom({ a1: { kind: "R", left: 2 }, a5: { kind: "K", left: 2 } }, "a1", true)).toEqual([]);
  });
  it("capturing uses one of the piece's captures, and one piece left is solved", () => {
    const after = capture({ a1: { kind: "R", left: 2 }, a5: { kind: "N", left: 2 } }, "a1", "a5");
    expect(after).toEqual({ a5: { kind: "R", left: 1 } });
    expect(solved(after)).toBe(true); expect(anyMove(after, true)).toBe(false);
  });
  it("every built puzzle has the right size, no pawn on the edge rows, and a solution under the two-capture limit", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const n = [4, 6, 8][seed % 3], p = makePuzzle(n, rng(seed));
      expect(Object.keys(p)).toHaveLength(n);
      expect(Object.entries(p).some(([s, x]) => x.kind === "P" && (s[1] === "1" || s[1] === "8"))).toBe(false);
      expect(Object.values(p).every(x => x.left === 2 && x.kind !== "K")).toBe(true);
      expect(solvable(p, true)).toBe(true);
    }
  });
  it("a seed always gives the same puzzle; the Young path grows from 3 to 6 pieces", () => {
    expect(makePuzzle(5, rng(42))).toEqual(makePuzzle(5, rng(42)));
    expect(PATH).toHaveLength(10); expect(PATH[0]).toBe(3); expect(PATH[9]).toBe(6);
    expect([starsFor(0), starsFor(2), starsFor(5)]).toEqual([3, 2, 1]);
  });
});
