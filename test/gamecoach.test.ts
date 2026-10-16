import { describe, expect, it } from "vitest";
import { goodMove, hanging } from "../src/bots/gamecoach";

describe("game coach: hanging pieces", () => {
  it("finds an undefended knight the other side attacks", () => {
    expect(hanging("4k3/8/8/4p3/3N4/8/8/4K3 w - - 0 1", "w")).toEqual([{ sq: "d4", type: "n" }]);
  });
  it("a defended piece attacked only by a dearer one is safe", () => {
    expect(hanging("4k3/8/8/3q4/3N4/4P3/8/4K3 w - - 0 1", "w")).toEqual([]);
  });
  it("a defended piece attacked by a cheaper one still hangs", () => {
    expect(hanging("4k3/8/8/4p3/3R4/3R4/8/4K3 w - - 0 1", "w")).toEqual([{ sq: "d4", type: "r" }]);
  });
  it("pawns are not reported, and a king only takes an undefended piece", () => {
    expect(hanging("8/8/8/3k4/3P4/8/8/4K3 w - - 0 1", "w")).toEqual([]);
    expect(hanging("8/8/8/3k4/3B4/8/8/4K3 w - - 0 1", "w")).toEqual([{ sq: "d4", type: "b" }]);
    expect(hanging("8/8/8/3k4/3B4/4P3/8/4K3 w - - 0 1", "w")).toEqual([]);
  });
  it("praises a check or a capture worth 3+, not a pawn grab", () => {
    expect(goodMove({ san: "Qh5+" })).toBe(true);
    expect(goodMove({ san: "Nxe5", captured: "n" })).toBe(true);
    expect(goodMove({ san: "exd5", captured: "p" })).toBe(false);
  });
});
