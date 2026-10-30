import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { COURSE, courseOpening } from "../src/content/course";
import { findTrap, fenKey, mistakePly, trapIndex } from "../src/bots/traps";

const after = (moves: string[]) => { const g = new Chess(); moves.forEach(m => g.move(m)); return g.fen(); };

describe("trap index", () => {
  const idx = trapIndex();
  it("finds the Italian walk-in (Black about to take the queen) and the bot-mistake position", () => {
    const o = courseOpening("italian")!, m = mistakePly(o, o.win)!;
    expect(o.win.moves[m]).toBe("Bxd1");
    const before = after(o.win.moves.slice(0, m)), now = after(o.win.moves.slice(0, m + 1));
    expect(findTrap(before, "b", m, () => false, idx)).toMatchObject({ kind: "walkin", openingId: "italian" });
    expect(findTrap(before, "w", m, () => true, idx)).toBeNull();           // the winner is not warned
    expect(findTrap(now, "w", m + 1, () => true, idx)).toMatchObject({ kind: "bot", openingId: "italian" });
    expect(findTrap(now, "w", m + 1, () => false, idx)).toBeNull();         // not studied: no "remember how it goes"
  });
  it("finds the Ruy Lopez positions", () => {
    const o = courseOpening("ruy")!, m = mistakePly(o, o.win)!;
    expect(m % 2).toBe(1);                       // Black's move
    const before = after(o.win.moves.slice(0, m)), now = after(o.win.moves.slice(0, m + 1));
    expect(findTrap(before, "b", m, () => false, idx)?.openingId).toBe("ruy");
    expect(findTrap(now, "w", m + 1, () => true, idx)?.openingId).toBe("ruy");
  });
  it("ignores move counters and anything past the first 20 plies", () => {
    const o = courseOpening("italian")!, m = mistakePly(o, o.win)!;
    const f = after(o.win.moves.slice(0, m)).split(" "); f[4] = "9"; f[5] = "40";
    expect(findTrap(f.join(" "), "b", m, () => true, idx)).not.toBeNull();
    expect(findTrap(f.join(" "), "b", 21, () => true, idx)).toBeNull();
    expect(fenKey(f.join(" ")).split(" ")).toHaveLength(4);
  });
  it("every entry belongs to the right side", () => {
    for (const o of COURSE) for (const p of idx.filter(p => p.openingId === o.id)) expect(p.learner === o.side).toBe(p.kind === "bot");
    expect(idx.length).toBeGreaterThan(10);
  });
  it("reads extra wins from `wins` when present", () => {
    const o = courseOpening("italian")!;
    const extra = { ...o, id: "x", wins: [{ moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Nxd5", "Nxf7"], notes: { 9: { en: "Black takes the bait.", pa: "" } } }] };
    expect(trapIndex([extra]).filter(p => p.openingId === "x")).toHaveLength(4);   // two lines, two positions each
  });
});
