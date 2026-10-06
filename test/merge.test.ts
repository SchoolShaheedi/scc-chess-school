import { describe, expect, it } from "vitest";
import { merge, type Saved } from "../src/merge";

const s = (x: Partial<Saved>): Saved => ({ xp: 0, streak: { days: 0, last: "" }, lessons: {}, ...x });

describe("merging device and account progress", () => {
  it("keeps every lesson from both sides, and the best stars for each", () => {
    const device = s({ lessons: { "1.1": { stars: 3, completedAt: "2026-10-01" }, "1.2": { stars: 1, completedAt: "2026-10-02" } } });
    const account = s({ lessons: { "1.2": { stars: 2, completedAt: "2026-09-30" }, "1.3": { stars: 2, completedAt: "2026-09-30" } } });
    const m = merge(device, account);
    expect(Object.keys(m.lessons).sort()).toEqual(["1.1", "1.2", "1.3"]);
    expect(m.lessons["1.2"]).toEqual({ stars: 2, completedAt: "2026-10-02" });
  });
  it("never lowers XP", () => expect(merge(s({ xp: 40 }), s({ xp: 25 })).xp).toBe(40));
  it("takes the most recently touched streak", () => {
    expect(merge(s({ streak: { days: 9, last: "2026-09-20" } }), s({ streak: { days: 2, last: "2026-10-02" } })).streak.days).toBe(2);
  });
  it("is the same whichever side is first", () => {
    const a = s({ xp: 10, lessons: { "1.1": { stars: 2, completedAt: "2026-10-01" } } });
    const b = s({ xp: 30, lessons: { "1.1": { stars: 3, completedAt: "2026-09-01" } } });
    expect(merge(a, b)).toEqual(merge(b, a));
  });
});

describe("merge: placement", () => {
  it("keeps the higher placement", () => {
    const base = { xp: 0, streak: { days: 0, last: "" }, lessons: {} };
    expect(merge({ ...base, placed: 5 }, { ...base, placed: 3 }).placed).toBe(5);
    expect(merge(base, { ...base, placed: 4 }).placed).toBe(4);
  });
});
