// Play vs Coach (DECISIONS #108): the threat and the idea come from facts.
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { classifyIdea, nullMoveFen, quickThreat } from "../src/bots/commentary";

const after = (sans: string[]) => { const g = new Chess(); for (const m of sans) g.move(m); return g.fen(); };

describe("Play vs Coach: threats", () => {
  it("a check is named with the checking piece", () => {
    const fen = after(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7+"]);
    expect(quickThreat(fen)).toEqual({ kind: "check", from: "f7", to: "e8" });
  });
  it("a loose piece is named, with the cheapest attacker", () => {
    // 1.e4 e6 2.Ba6 Nc6: White to move, and the a6 bishop can be taken by the b7 pawn
    const fen = after(["e4", "e6", "Ba6", "Nc6"]);
    expect(quickThreat(fen)).toEqual({ kind: "take", piece: "b", sq: "a6", from: "b7" });
  });
  it("no threat at the start", () => { expect(quickThreat(new Chess().fen())).toBeNull(); });
  it("a null move is refused while in check", () => {
    expect(nullMoveFen(after(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7+"]))).toBeNull();
    expect(nullMoveFen(new Chess().fen())!.split(" ")[1]).toBe("b");
  });
});

describe("Play vs Coach: ideas", () => {
  it("castling, developing, the centre, saving a piece, winning material, mate", () => {
    const italian = after(["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Bc5"]);
    expect(classifyIdea(italian, "e1g1", { cp: 20 }, 8).kind).toBe("castle");
    expect(classifyIdea(new Chess().fen(), "g1f3", { cp: 20 }, 0).kind).toBe("develop");
    expect(classifyIdea(new Chess().fen(), "e2e4", { cp: 20 }, 0).kind).toBe("centre");
    expect(classifyIdea(after(["e4", "e6", "Ba6", "Nc6"]), "a6b5", { cp: 0 }, 4).kind).toBe("save");
    expect(classifyIdea(after(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6"]), "h5f7", { mate: 1 }, 6).kind).toBe("mate");
    expect(classifyIdea(after(["e4", "d5"]), "e4d5", { cp: 30 }, 2).kind).not.toBe("win");   // a pawn that will be taken back is not "winning material"
  });
});
