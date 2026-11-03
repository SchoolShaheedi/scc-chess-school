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

describe("merge: reset my progress", () => {
  const old = s({ xp: 400, lessons: { "1.1": { stars: 3, completedAt: "2026-10-01" } }, rushBest: 9 });
  it("a newer reset beats the older progress on the other side", () => {
    const reset = s({ xp: 0, resetAt: "2026-11-02T10:00:00.000Z" });
    for (const m of [merge(reset, old), merge(old, reset)]) {
      expect(m.xp).toBe(0); expect(m.lessons).toEqual({}); expect(m.rushBest).toBeUndefined(); expect(m.resetAt).toBe("2026-11-02T10:00:00.000Z");
    }
  });
  it("progress made after the reset, on a device that has seen it, merges as usual", () => {
    const r = "2026-11-02T10:00:00.000Z";
    const a = s({ xp: 30, resetAt: r, lessons: { "1.1": { stars: 1, completedAt: "2026-11-03" } } }), b = s({ xp: 55, resetAt: r });
    const m = merge(a, b);
    expect(m.xp).toBe(55); expect(Object.keys(m.lessons)).toEqual(["1.1"]); expect(m.resetAt).toBe(r);
  });
  it("the later of two resets wins", () => {
    const m = merge(s({ xp: 5, resetAt: "2026-11-01T00:00:00Z" }), s({ xp: 9, resetAt: "2026-11-02T00:00:00Z" }));
    expect(m.xp).toBe(9); expect(m.resetAt).toBe("2026-11-02T00:00:00Z");
  });
  it("without any reset nothing changes", () => expect(merge(old, s({ xp: 10 })).resetAt).toBeUndefined());
});
