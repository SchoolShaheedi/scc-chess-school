// Pins each structure rule to textbook cases, so "tap the squares" answers can be trusted.
import { describe, expect, it } from "vitest";
import { answerSquares, badBishops, doubled, fewestMoves, isolated, openFiles, outposts, passed } from "../src/chess/structure";
import { placementFromFen } from "../src/chess/types";

const B = (fen: string) => placementFromFen(fen);
const sort = (a: string[]) => [...a].sort();

describe("pawn structure", () => {
  it("isolated: the d-pawn with no c- or e-pawn (the IQP)", () => {
    expect(sort(isolated(B("4k3/pp3ppp/8/8/3P4/8/PP3PPP/4K3 w - - 0 1"), "w"))).toEqual(["d4"]);
  });
  it("doubled: both pawns on the c-file", () => {
    expect(sort(doubled(B("4k3/8/8/8/2P5/2P5/PP6/4K3 w - - 0 1"), "w"))).toEqual(["c3", "c4"]);
  });
  it("passed: no enemy pawn ahead on its file or beside it", () => {
    expect(sort(passed(B("4k3/6p1/8/3P4/8/8/6P1/4K3 w - - 0 1"), "w"))).toEqual(["d5"]);
    expect(passed(B("4k3/2p5/8/3P4/8/8/8/4K3 w - - 0 1"), "w")).toEqual([]);   // c7 can still take on d6
  });
  it("outpost: d5 in the Sicilian structure (no black c- or e-pawn can ever attack it, e4 defends)", () => {
    expect(outposts(B("4k3/pp3ppp/3p4/4p3/4P3/8/PPP2PPP/4K3 w - - 0 1"), "w")).toContain("d5");
    expect(outposts(B("4k3/pp3ppp/3p4/4p3/4P3/8/PPP2PPP/4K3 w - - 0 1"), "w")).not.toContain("f5");   // the g7 pawn can still come to g6 and hit f5
  });
  it("open files: no pawns of either colour", () => {
    expect(openFiles(B("4k3/pp3ppp/8/8/8/8/PP3PPP/4K3 w - - 0 1"))).toEqual(["c", "d", "e"]);
  });
});

describe("piece quality", () => {
  it("fewest moves: the knight in the corner", () => {
    expect(fewestMoves("4k3/8/8/8/8/8/8/N2QK3 w - - 0 1", "w")).toEqual(["a1"]);
  });
  it("bad bishop: a light-squared bishop behind its own light-square pawns", () => {
    const fen = "4k3/8/8/3P4/4P3/5P2/8/4KB2 w - - 0 1";   // d5 light, e4 light, f3 light; bishop f1 light
    expect(badBishops(B(fen), "w")).toEqual(["f1"]);
    expect(badBishops(B("4k3/8/8/3P4/4P3/5P2/8/2B1K3 w - - 0 1"), "w")).toEqual([]);   // c1 is dark: the good bishop
  });
  it("answerSquares maps open files to their letters", () => {
    expect(answerSquares("4k3/pp3ppp/8/8/8/8/PP3PPP/4K3 w - - 0 1", "openFile", "w")).toEqual({ squares: ["c1", "d1", "e1"], byFile: true });
  });
});
