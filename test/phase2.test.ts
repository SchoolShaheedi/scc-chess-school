// DECISIONS #85: the separate puzzle rating, the graphs' history, theme and result counts, and how two devices merge them.
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { emptySaved, merge } from "../src/merge";
import { store } from "../src/store";
import { THEMES } from "../src/puzzles/bank";

describe("puzzle rating and stats", () => {
  it("a puzzle moves the puzzle rating, not the playing rating, and counts its themes", () => {
    store.reset();
    const play = store.get().rating.r;
    store.recordPuzzle("abc", 900, true, ["fork", "short"]);
    expect(store.get().rating.r).toBe(play);
    expect(store.get().prating!.r).toBeGreaterThan(play);
    expect(store.get().themeStats).toEqual({ fork: [1, 1], short: [1, 1] });
    store.recordPuzzle("abd", 900, false, ["fork"]);
    expect(store.get().themeStats!.fork).toEqual([2, 1]);
    expect(store.get().hist!.puz).toHaveLength(1);   // one point a day
  });
  it("a bot game moves the playing rating and counts per bot and per clock", () => {
    store.reset();
    store.recordGame("kesri", true, 600, 1, "10");
    store.recordGame("kesri", false, 600, 0.5, "none");
    const r = store.get().results!;
    expect(r["bot:kesri"]).toEqual([1, 0, 1]);
    expect(r["tc:10"]).toEqual([1, 0, 0]); expect(r["tc:none"]).toEqual([0, 0, 1]);
    expect(store.get().hist!.play.at(-1)![1]).toBe(store.get().rating.r);
  });
});

describe("merging the new fields", () => {
  it("keeps the puzzle rating with more results, the higher counts, and every day of history", () => {
    const a = { ...emptySaved(), prating: { r: 900, n: 30 }, themeStats: { fork: [10, 6] as [number, number] }, results: { "bot:kesri": [3, 1, 0] as [number, number, number] },
      hist: { play: [["2026-10-01", 500]] as [string, number][], puz: [["2026-10-01", 880], ["2026-10-03", 900]] as [string, number][] } };
    const b = { ...emptySaved(), prating: { r: 1000, n: 5 }, themeStats: { fork: [4, 4] as [number, number], pin: [2, 1] as [number, number] }, results: { "bot:kesri": [1, 2, 1] as [number, number, number] },
      hist: { play: [["2026-10-02", 520]] as [string, number][], puz: [["2026-10-02", 990]] as [string, number][] } };
    const m = merge(a, b);
    expect(m.prating).toEqual({ r: 900, n: 30 });
    expect(m.themeStats).toEqual({ fork: [10, 6], pin: [2, 1] });
    expect(m.results).toEqual({ "bot:kesri": [3, 2, 1] });
    expect(m.hist!.puz.map(p => p[0])).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(m.hist!.play).toHaveLength(2);
  });
  it("an old record without the new fields still merges", () => {
    const m = merge(emptySaved(), emptySaved());
    expect(m.prating).toBeUndefined(); expect(m.hist).toBeUndefined(); expect(m.themeStats).toBeUndefined();
  });
});

describe("the built data", () => {
  const bank = (f: string) => readFileSync(new URL(`../public/puzzles/bank/${f}`, import.meta.url), "utf8");
  const index = JSON.parse(bank("index.json")) as { themes: string[]; bands: { min: number; file: string; count: number }[]; themeCounts: Record<string, number> };
  it("has about 50,000 puzzles over 22 bands", () => {
    expect(index.bands).toHaveLength(22);
    expect(index.bands.reduce((a, b) => a + b.count, 0)).toBeGreaterThanOrEqual(49_000);
  });
  it("every practisable theme has plenty of puzzles", () => {
    for (const th of THEMES) expect(index.themeCounts[th.id] ?? 0, th.id).toBeGreaterThanOrEqual(100);
  });
  it("a sample of every band replays legally and sits in its band", () => {
    for (const b of index.bands) {
      const lines = bank(b.file).trim().split("\n");
      expect(lines).toHaveLength(b.count);
      for (const line of lines.filter((_, i) => i % 97 === 0)) {
        const [, fen, moves, rating] = line.split("\t"), g = new Chess(fen);
        for (const u of moves.split(" ")) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        expect(+rating).toBeGreaterThanOrEqual(b.min); expect(+rating).toBeLessThan(b.min + 100);
      }
    }
  });
  it("the explorer has the start position with 1.e4 most played, and every move is legal", () => {
    const ex = JSON.parse(readFileSync(new URL("../public/explorer/explorer.json", import.meta.url), "utf8")) as { positions: Record<string, [string, number, number, number][]> };
    const start = ex.positions["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"];
    expect(start[0][0]).toBe("e2e4");
    let checked = 0;
    for (const [k, list] of Object.entries(ex.positions)) {
      if (checked++ % 50) continue;
      for (const [u, n, w, d] of list) {
        expect(() => new Chess(`${k} 0 1`).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })).not.toThrow();
        expect(w + d).toBeLessThanOrEqual(n);
      }
    }
  });
});
