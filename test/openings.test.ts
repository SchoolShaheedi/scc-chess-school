// The openings trainer (DECISIONS #74): every repertoire line is legal and carries the Lichess database's
// exact name, and the review boxes move as promised.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { REPERTOIRE, SLOTS } from "../src/content/repertoire";
import { addDays, isDue, learnt, mergeCard, newCard, review, WAITS } from "../src/openings/srs";
// @ts-expect-error plain JS helper shared with the build tools
import { openingName } from "../tools/opening-name.mjs";

describe("repertoire", () => {
  it("three options in every slot, each with at least 4 lines", () => {
    for (const { slot } of SLOTS) {
      const os = REPERTOIRE.filter(o => o.slot === slot);
      expect(os.length, slot).toBe(3);
      for (const o of os) expect(o.lines.length, o.id).toBeGreaterThanOrEqual(4);
    }
  });
  it("every line is legal, gives the learner at least 3 moves, and is named by the database", () => {
    for (const o of REPERTOIRE) for (const l of o.lines) {
      const g = new Chess(); for (const m of l.moves) expect(() => g.move(m), `${o.id}: ${l.moves.join(" ")}`).not.toThrow();
      expect(l.moves.filter((_, i) => (i % 2 === 0) === (o.side === "w")).length, o.id).toBeGreaterThanOrEqual(3);
      expect(openingName(l.moves)?.name, `${o.id}: ${l.moves.join(" ")}`).toBe(l.opening);
    }
  });
  it("a White option's lines start with White's move; a Black option's lines answer the slot's first move", () => {
    for (const o of REPERTOIRE) for (const l of o.lines) {
      if (o.slot === "e4") expect(l.moves[0]).toBe("e4");
      if (o.slot === "d4") expect(l.moves[0]).toBe("d4");
      expect(o.side).toBe(o.slot === "white" ? "w" : "b");
    }
  });
});

describe("review boxes", () => {
  const today = "2026-10-04";
  it("a new line is due today", () => { expect(isDue(newCard(today), today)).toBe(true); });
  it("clean answers climb 1, 3, 7, 14, 30 days", () => {
    let c = newCard(today), d = today;
    for (const w of WAITS) { c = review(c, true, d); expect(c.due).toBe(addDays(d, w)); d = c.due; }
    expect(learnt(c)).toBe(true);
    expect(review(c, true, d).due).toBe(addDays(d, 30));          // stays at the top wait
  });
  it("a slip goes back to tomorrow", () => {
    const c = review({ box: 3, due: today }, false, today);
    expect(c).toEqual({ box: 0, due: "2026-10-05" });
  });
  it("crosses month ends", () => { expect(addDays("2026-10-31", 1)).toBe("2026-11-01"); });
  it("merging keeps the card further along", () => {
    expect(mergeCard({ box: 1, due: "2026-10-06" }, { box: 3, due: "2026-10-05" }).box).toBe(3);
  });
});
