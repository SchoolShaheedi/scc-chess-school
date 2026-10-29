// Puzzle Race on the rated bank (2026-10-29): it starts near the learner's puzzle rating and climbs, from the real bank.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nearRating } from "../src/puzzles/bank";
import { RACE_BACK, RACE_STEP, RACE_TOP, raceShort, raceStart, raceTarget, RUSH_START } from "../src/puzzles/pick";

const realFetch = globalThis.fetch;
beforeAll(() => {
  // the bank files straight from public/, as the browser would fetch them
  globalThis.fetch = (async (url: string) => {
    const text = readFileSync(new URL(`../public/${url}`, import.meta.url), "utf8");
    return { text: async () => text, json: async () => JSON.parse(text) };
  }) as unknown as typeof fetch;
});
afterAll(() => { globalThis.fetch = realFetch; });

describe("where the Race starts", () => {
  it("a little below the puzzle rating, so the first puzzles are quick wins", () => {
    expect(raceStart(1500)).toBe(1500 - RACE_BACK);
    expect(raceStart(2000)).toBe(1850);
  });
  it("never below the old 400 start, and never past the bank's top", () => {
    expect(raceStart(400)).toBe(RUSH_START);
    expect(raceStart(100)).toBe(RUSH_START);
    expect(raceStart(9000)).toBe(RACE_TOP);
  });
  it("climbs RACE_STEP a solve and stops at the top", () => {
    expect(raceTarget(1000, 0)).toBe(1000);
    expect(raceTarget(1000, 10)).toBe(1000 + 10 * RACE_STEP);
    expect(raceTarget(2300, 40)).toBe(RACE_TOP);
  });
  it("asks for speed puzzles: at most two moves of the learner's", () => {
    expect(raceShort({ moves: ["a", "b"] })).toBe(true);
    expect(raceShort({ moves: ["a", "b", "c", "d"] })).toBe(true);
    expect(raceShort({ moves: ["a", "b", "c", "d", "e", "f"] })).toBe(false);
  });
});

describe("a Race from the bank", () => {
  it("a strong player's first puzzles are near their rating, not the old 400-1800 climb", async () => {
    const used = new Set<string>(), start = raceStart(2000), first: number[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await nearRating(raceTarget(start, 0), used, undefined, Math.random, raceShort);
      expect(p).not.toBeNull(); used.add(p!.id); first.push(p!.rating);
      expect(p!.moves.length).toBeLessThanOrEqual(4);
    }
    for (const r of first) expect(Math.abs(r - start)).toBeLessThan(150);
    expect(Math.min(...first)).toBeGreaterThan(1500);
  });
  it("climbs, never repeats, and reaches real hard puzzles", async () => {
    const used = new Set<string>(), start = raceStart(1600), r: number[] = [];
    for (let step = 0; step < 25; step++) {
      const p = await nearRating(raceTarget(start, step), used, undefined, Math.random, raceShort);
      used.add(p!.id); r.push(p!.rating);
    }
    expect(used.size).toBe(25);
    expect(r.slice(-5).reduce((a, b) => a + b) / 5).toBeGreaterThan(r.slice(0, 5).reduce((a, b) => a + b) / 5 + 400);
    expect(Math.max(...r)).toBeGreaterThan(2000);
  });
  it("a beginner starts at 400, as before", async () => {
    const p = await nearRating(raceTarget(raceStart(300), 0), new Set(), undefined, Math.random, raceShort);
    expect(p!.rating).toBeLessThan(700);
  });
});
