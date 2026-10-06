// The Puzzles tab's choices (DECISIONS #72): the daily puzzle is fixed per day and level, and Rush climbs.
import { describe, expect, it } from "vitest";
import { dailyPuzzle, RUSH_START, RUSH_STEP, rushNext, rushPool } from "../src/puzzles/pick";

describe("daily puzzle", () => {
  it("is the same for everyone on the same level and day", () => {
    expect(dailyPuzzle("2026-10-04", 5).id).toBe(dailyPuzzle("2026-10-04", 5).id);
  });
  it("changes with the day", () => {
    const ids = new Set(["01", "02", "03", "04", "05", "06", "07"].map(d => dailyPuzzle(`2026-10-${d}`, 5).id));
    expect(ids.size).toBeGreaterThan(4);
  });
  it("exists for every level, Level 1 included", () => {
    for (let n = 1; n <= 10; n++) expect(dailyPuzzle("2026-10-04", n).fen, `level ${n}`).toBeTruthy();
  });
});

describe("puzzle rush", () => {
  const pool = rushPool();
  it("has a big pool with no repeats", () => {
    expect(pool.length).toBeGreaterThan(800);
    expect(new Set(pool.map(p => p.id)).size).toBe(pool.length);
  });
  it("never repeats a puzzle and climbs in rating", () => {
    const used = new Set<string>(), r: number[] = [];
    for (let i = 0; i < 20; i++) r.push(rushNext(pool, i, used).rating);
    expect(used.size).toBe(20);
    expect(Math.abs(r[0] - RUSH_START)).toBeLessThan(150);
    expect(Math.abs(r[19] - (RUSH_START + 19 * RUSH_STEP))).toBeLessThan(150);
    // past the top of the pool it stays at the hardest puzzles, never runs out
    for (let i = 20; i < 60; i++) expect(rushNext(pool, i, used).rating).toBeGreaterThan(1300);
  });
});
