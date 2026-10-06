// The chess clock and PGN export (chess review 2026-10-04).
import { describe, expect, it } from "vitest";
import { flagged, fmt, newClock, press, remaining } from "../src/play/clock";
import { pgnOf } from "../src/play/pgn";

describe("clock", () => {
  it("White's clock starts with White's first move; time is charged to the side that moved; increment is added", () => {
    let c = newClock(1, 2);                                  // 1 minute + 2 seconds
    expect(remaining(c, "w", 5000)).toBe(60000);              // nothing runs before the first move
    c = press(c, 5000);                                       // White's first move: Black's clock starts
    expect(remaining(c, "w", 9000)).toBe(60000);
    expect(remaining(c, "b", 9000)).toBe(56000);
    c = press(c, 9000);                                       // Black moved after 4 s: 56 + 2
    expect(c.left.b).toBe(58000);
  });
  it("flags the side that runs out", () => {
    let c = newClock(1, 0); c = press(c, 0);
    expect(flagged(c, 59000)).toBeNull();
    expect(flagged(c, 61000)).toBe("b");
  });
  it("formats minutes and the last ten seconds", () => {
    expect(fmt(65000)).toBe("1:05"); expect(fmt(9400)).toBe("9.4");
  });
});

describe("PGN", () => {
  it("writes the moves in standard notation with the result", () => {
    const p = pgnOf(["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"], "You", "Kesri", "1-0");
    expect(p).toContain('[White "You"]');
    expect(p).toContain("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    expect(p.trim().endsWith("1-0")).toBe(true);
  });
});
