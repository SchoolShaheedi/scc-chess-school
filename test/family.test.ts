// Child profiles (DECISIONS #80): an old account row becomes child p1; families merge per child; switching
// children keeps each child's progress apart.
import { describe, expect, it } from "vitest";
import { asFamily, emptySaved, mergeFamily } from "../src/merge";
import { family } from "../src/family";
import { store } from "../src/store";

describe("family data", () => {
  it("an account row from before profiles becomes the first child", () => {
    const f = asFamily({ xp: 50, streak: { days: 1, last: "2026-10-01" }, lessons: { "1.1": { stars: 3, completedAt: "" } } })!;
    expect(f.v).toBe(2); expect(f.active).toBe("p1"); expect(f.saved.p1.xp).toBe(50);
  });
  it("merges two devices child by child, keeping children only one device knows", () => {
    const a = { v: 2 as const, active: "p1", profiles: [{ id: "p1", avatar: "cat", colour: "#000", look: "young" as const }], saved: { p1: { ...emptySaved(), xp: 30 } } };
    const b = { v: 2 as const, active: "p2", profiles: [{ id: "p1", avatar: "dog", colour: "#111", look: "junior" as const }, { id: "p2", avatar: "fish", colour: "#222", look: "adult" as const }],
      saved: { p1: { ...emptySaved(), xp: 80 }, p2: { ...emptySaved(), xp: 5 } } };
    const m = mergeFamily(a, b);
    expect(m.profiles.map(p => p.id)).toEqual(["p1", "p2"]);
    expect(m.profiles[0].avatar).toBe("cat");          // this device's look of the child wins
    expect(m.saved.p1.xp).toBe(80); expect(m.saved.p2.xp).toBe(5);
    expect(m.active).toBe("p1");
  });
  it("ignores rubbish from the server", () => { expect(asFamily(null)).toBeNull(); expect(asFamily("x")).toBeNull(); });
});

describe("switching children", () => {
  it("each child keeps their own progress and age band", () => {
    store.set({ xp: 120, look: "junior" });
    const first = family.current().id;
    const second = family.add("fish", "#1D4ED8", "young")!;
    expect(family.current().id).toBe(second);
    expect(store.get().xp).toBe(0); expect(store.get().look).toBe("young");
    store.set({ xp: 7 });
    family.switchTo(first);
    expect(store.get().xp).toBe(120); expect(store.get().look).toBe("junior");
    family.switchTo(second);
    expect(store.get().xp).toBe(7);
    family.switchTo(first); family.remove(second);
    expect(family.list().length).toBe(1);
  });
  it("rewards, streak freezes and heroes stay with their own child (2026-10-16 bug: a sibling inherited them)", () => {
    store.set({ unlocked: ["board:gold"], freezes: 2, heroes: ["himmat"], boss: { "1": 3 }, heroAvatar: "himmat" });
    const first = family.current().id;
    const second = family.add("fish", "#1D4ED8", "young")!;
    expect(store.get().unlocked ?? []).toEqual([]); expect(store.get().freezes ?? 0).toBe(0);
    expect(store.get().heroes ?? []).toEqual([]); expect(store.get().heroAvatar).toBeUndefined();
    family.switchTo(first);
    expect(store.get().unlocked).toEqual(["board:gold"]); expect(store.get().heroes).toEqual(["himmat"]); expect(store.get().heroAvatar).toBe("himmat");
    family.remove(second);
  });
});
