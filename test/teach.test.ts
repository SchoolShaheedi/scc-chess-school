// Classes (DECISIONS #82): the summary a teacher sees is exactly five numbers, and class codes can't be misread.
import { describe, expect, it } from "vitest";
import { summaryOf } from "../src/teach/summary";
import { newCode } from "../src/teach/api";

describe("teacher summary", () => {
  const today = "2026-10-05";
  it("is five numbers and nothing else", () => {
    const s = summaryOf({ xp: 999, streak: { days: 9, last: today }, lessons: {} }, today);
    expect(Object.keys(s).sort()).toEqual(["daysWeek", "lessons", "lessonsWeek", "level", "tests"]);
  });
  it("counts this week only, and the level is past the last passed test", () => {
    const s = summaryOf({ xp: 0, streak: { days: 0, last: "" },
      lessons: { "3.1": { stars: 3, completedAt: "2026-10-04T10:00:00Z" }, "2.1": { stars: 2, completedAt: "2026-09-01T10:00:00Z" } },
      tests: { 3: { best: 12, passed: true } }, active: ["2026-09-01", "2026-10-01", "2026-10-04", "2026-10-05"] }, today);
    expect(s).toEqual({ level: 4, lessons: 2, lessonsWeek: 1, tests: 1, daysWeek: 3 });
  });
});

describe("class codes", () => {
  it("are 6 characters with no I, O, 0 or 1, as the database requires", () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
