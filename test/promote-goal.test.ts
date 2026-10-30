// The "promote" goal of engine drills (bug found 2026-10-30): in K+P vs K the defender is bare from the start, which
// once made any first move count as a win in the Level 5 pawn endings.
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { engineGoalMet } from "../src/chess/rules";

describe("engine drill goal: promote", () => {
  it("a quiet first move in K+P vs K is not a win", () => {
    const g = new Chess("3k4/8/3K4/3P4/8/8/8/8 w - - 0 1");
    const m = g.move("Kc6");
    expect(engineGoalMet(g, "w", "promote", m)).toBe(false);
  });
  it("promoting is a win", () => {
    const g = new Chess("8/3P4/8/8/8/8/k7/4K3 w - - 0 1");
    const m = g.move("d8=Q");
    expect(engineGoalMet(g, "w", "promote", m)).toBe(true);
  });
  it("taking the defender's last piece is a win (the rook given up in the Lucena)", () => {
    const g = new Chess("6K1/4k1P1/8/8/8/8/6r1/5R2 w - - 0 1");
    const m = g.move("Rxf7".replace("Rxf7", "Kh7")); // a quiet move first: still not won
    expect(engineGoalMet(g, "w", "promote", m)).toBe(false);
    const h = new Chess("6K1/4k1P1/8/8/8/8/5r2/5R2 w - - 0 1");
    const c = h.move("Rxf2");
    expect(engineGoalMet(h, "w", "promote", c)).toBe(true);
  });
});
