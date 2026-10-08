// Classes (DECISIONS #82, #89): the summary a teacher sees is numbers only (five, plus this week's four for the class
// leaderboard), and class codes can't be misread.
import { describe, expect, it } from "vitest";
import { summaryOf } from "../src/teach/summary";
import { newCode } from "../src/teach/api";

describe("teacher summary", () => {
  const today = "2026-10-05";
  it("is numbers and nothing else: the keys the database accepts", () => {
    const s = summaryOf({ xp: 999, streak: { days: 9, last: today }, lessons: {} }, today);
    expect(Object.keys(s).sort()).toEqual(["daysWeek", "lessons", "lessonsWeek", "level", "tests", "weekOf", "wkDays", "wkLessons", "wkPuzzles"]);
    expect(Object.values(s).every(v => Number.isInteger(v))).toBe(true);
  });
  it("counts this week only, and the level is past the last passed test", () => {
    const s = summaryOf({ xp: 0, streak: { days: 0, last: "" },
      lessons: { "3.1": { stars: 3, completedAt: "2026-10-04T10:00:00Z" }, "2.1": { stars: 2, completedAt: "2026-09-01T10:00:00Z" } },
      tests: { 3: { best: 12, passed: true } }, active: ["2026-09-01", "2026-10-01", "2026-10-04", "2026-10-05"] }, today);
    // 2026-10-05 is a Monday: the leaderboard week has just begun, while "this week" for the teacher is the last 7 days
    expect(s).toEqual({ level: 4, lessons: 2, lessonsWeek: 1, tests: 1, daysWeek: 3, weekOf: 20261005, wkDays: 1, wkLessons: 0, wkPuzzles: 0 });
  });
  it("counts the leaderboard week from Monday, puzzles included", () => {
    const s = summaryOf({ xp: 0, streak: { days: 0, last: "" }, lessons: { "1.1": { stars: 3, completedAt: "2026-10-07T09:00:00Z" } },
      active: ["2026-10-04", "2026-10-06", "2026-10-07"], puzzlesByDay: { "2026-10-04": 9, "2026-10-06": 4, "2026-10-07": 3 } }, "2026-10-08");
    expect([s.weekOf, s.wkDays, s.wkLessons, s.wkPuzzles]).toEqual([20261005, 2, 1, 7]);
  });
});

describe("class codes", () => {
  it("are 6 characters with no I, O, 0 or 1, as the database requires", () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
