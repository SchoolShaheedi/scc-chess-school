// The placement rules (DECISIONS #71): climb on a solve, a second chance per level, stop at 2 misses
// on one level or 3 in all, place at the last level passed.
import { describe, expect, it } from "vitest";
import { advance, LAST, startPlacement } from "../src/lesson/placement-rules";
import { LEVELS } from "../src/content/levels";

const run = (results: boolean[]) => results.reduce((s, r) => s.over ? s : advance(s, r), startPlacement());

describe("placement", () => {
  it("every level it can ask about has a puzzle test to draw from", () => {
    for (let n = 2; n <= LAST; n++) expect(LEVELS[n - 1].test?.packs.length, `level ${n}`).toBeGreaterThan(0);
  });
  it("misses the first puzzle twice: stays at Level 1", () => {
    const s = run([false, false]); expect(s.over).toBe(true); expect(s.highest).toBe(1);
  });
  it("a second chance at the same level", () => {
    const s = run([true, false, true, true]); expect(s.over).toBe(false); expect(s.highest).toBe(4); expect(s.level).toBe(5);
  });
  it("three misses in all end the test, at the last level passed", () => {
    const s = run([true, false, true, false, true, false]);   // 2 ✓, 3 ✗✓, 4 ✗✓, 5 ✗ → stop
    expect(s.over).toBe(true); expect(s.highest).toBe(4);
  });
  it("two misses at one level end it", () => {
    const s = run([true, true, true, false, false]); expect(s.over).toBe(true); expect(s.highest).toBe(4);
  });
  it("solving everything places at Level 10 after nine puzzles", () => {
    const s = run(Array(9).fill(true)); expect(s.over).toBe(true); expect(s.highest).toBe(10);
  });
});
