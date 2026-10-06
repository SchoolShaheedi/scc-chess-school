// The Me page's rules (DECISIONS #76): ranks from XP, the longest streak, and the trophy room.
import { describe, expect, it } from "vitest";
import { longestRun, rankOf, trophies } from "../src/me/trophies";
import { merge } from "../src/merge";
import type { State } from "../src/store";

const base = (x: Partial<State> = {}): State => ({
  onboarded: true, lang: "en", look: "junior", pieceSet: "A", coach: "kaur", sound: true, xp: 0,
  streak: { days: 0, last: "" }, lessons: {}, tests: {}, placed: 0, daily: { date: "", solved: false }, rushBest: 0,
  rep: { cards: {} }, active: [], goal: { date: "", n: 0 }, stats: { botWins: {}, games: 0, dailies: 0, reviews: 0 }, buzz: true, rating: { r: 400, n: 0 }, missed: {}, ...x,
});

describe("ranks", () => {
  it("climb with XP and name the next step", () => {
    expect(rankOf(0).name.en).toBe("Pawn"); expect(rankOf(299).name.en).toBe("Pawn");
    expect(rankOf(300).name.en).toBe("Knight"); expect(rankOf(300).next).toBe(800);
    expect(rankOf(99999).name.en).toBe("King"); expect(rankOf(99999).next).toBeNull();
  });
});

describe("streaks", () => {
  it("finds the longest run, across a month end", () => {
    expect(longestRun(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-03"])).toBe(3);
    expect(longestRun([])).toBe(0);
  });
});

describe("trophies", () => {
  it("there are 24, all locked for a new learner", () => {
    const t = trophies(base()); expect(t.length).toBe(24); expect(t.filter(x => x.got).length).toBe(0);
  });
  it("unlock from real progress", () => {
    const t = trophies(base({ lessons: { "1.1": { stars: 3, completedAt: "" } }, stats: { botWins: { kesri: 1 }, games: 3, dailies: 1, reviews: 1 }, rushBest: 12 }));
    const got = new Set(t.filter(x => x.got).map(x => x.id));
    for (const id of ["lesson1", "stars3", "beatKesri", "daily1", "rush10", "review1"]) expect(got.has(id), id).toBe(true);
    expect(got.has("beatChidi")).toBe(false);
  });
  it("ids are unique", () => { const ids = trophies(base()).map(x => x.id); expect(new Set(ids).size).toBe(ids.length); });
});

describe("merge: activity", () => {
  it("joins practice days and keeps the higher counts", () => {
    const a = { xp: 0, streak: { days: 0, last: "" }, lessons: {}, active: ["2026-10-01"], stats: { botWins: { kesri: 2 }, games: 5, dailies: 1, reviews: 0 } };
    const b = { xp: 0, streak: { days: 0, last: "" }, lessons: {}, active: ["2026-10-02"], stats: { botWins: { kesri: 1, teer: 1 }, games: 2, dailies: 4, reviews: 1 } };
    const m = merge(a, b);
    expect(m.active).toEqual(["2026-10-01", "2026-10-02"]);
    expect(m.stats).toEqual({ botWins: { kesri: 2, teer: 1 }, games: 5, dailies: 4, reviews: 1 });
  });
});

import { expected, update } from "../src/me/rating";
describe("rating", () => {
  it("an even match expects 50%, and a win against a stronger opponent gains more", () => {
    expect(expected(800, 800)).toBeCloseTo(0.5);
    const a = update({ r: 800, n: 0 }, 1200, 1).r - 800, b = update({ r: 800, n: 0 }, 400, 1).r - 800;
    expect(a).toBeGreaterThan(b); expect(b).toBeGreaterThan(0);
  });
  it("settles after 20 results", () => {
    expect(update({ r: 800, n: 25 }, 800, 1).r - 800).toBe(10);
    expect(update({ r: 800, n: 0 }, 800, 1).r - 800).toBe(20);
  });
  it("never drops below 100", () => { expect(update({ r: 100, n: 0 }, 2000, 0).r).toBe(100); });
});
