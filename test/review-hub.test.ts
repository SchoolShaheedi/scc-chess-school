// The openings review with no set-up (DECISIONS #133a): Learn done = joined, due counting, old slot cards carried over,
// and the two-device merge.
import { describe, expect, it } from "vitest";
import { COURSE } from "../src/content/course";
import { merge, type Saved } from "../src/merge";
import { cardKey, daysUntil, dueLines, legacyCard, reviewLines } from "../src/openings/review";
import { review } from "../src/openings/srs";

const T = "2026-10-30";
const sv = (rep: Saved["rep"]): Saved => ({ xp: 0, streak: { days: 0, last: "" }, lessons: {}, rep });

describe("auto-joining on Learn done", () => {
  it("nothing joins until a Learn step is done", () => {
    expect(reviewLines({ cards: {} }, T)).toEqual([]);
    expect(reviewLines({ cards: {}, course: { london: ["practise", "win"] } }, T)).toEqual([]);
  });
  it("Learn done joins the opening with a fresh card, due today, keyed course:<id>", () => {
    const l = reviewLines({ cards: {}, course: { london: ["learn"], sicilian: ["learn", "practise"] } }, T);
    expect(l.map(x => x.key).sort()).toEqual([cardKey("london"), cardKey("sicilian")].sort());
    expect(l.every(x => x.card.box === 0 && x.card.due === T)).toBe(true);
  });
  it("any course opening can join, not only the old nine", () => {
    const other = COURSE.find(o => !o.rep)!;
    expect(reviewLines({ cards: {}, course: { [other.id]: ["learn"] } }, T).map(x => x.o.id)).toEqual([other.id]);
  });
  it("a saved review card wins over a fresh one", () => {
    const c = review({ box: 0, due: T }, true, T);
    const l = reviewLines({ cards: { [cardKey("london")]: c }, course: { london: ["learn"] } }, T);
    expect(l[0].card).toEqual(c);
  });
});

describe("due counting", () => {
  it("counts cards due today or earlier, not later ones", () => {
    const rep = { cards: { [cardKey("london")]: { box: 2, due: "2026-11-05" }, [cardKey("qg")]: { box: 1, due: "2026-10-29" } }, course: { london: ["learn"], qg: ["learn"], e5: ["learn"] } };
    const lines = reviewLines(rep, T);
    expect(lines.length).toBe(3);
    expect(dueLines(lines, T).map(l => l.o.id).sort()).toEqual(["e5", "qg"]);
  });
  it("days until due", () => {
    expect(daysUntil({ box: 2, due: "2026-11-05" }, T)).toBe(6);
    expect(daysUntil({ box: 0, due: T }, T)).toBe(0);
  });
});

describe("old slot cards carry over", () => {
  const old = { "italian:0": { box: 4, due: "2026-11-20" }, "italian:1": { box: 1, due: "2026-10-31" }, "london:2": { box: 0, due: T }, "notrep:0": { box: 3, due: T } };
  it("maps rep:<id>:<line> cards to the course opening, furthest-along line wins", () => {
    const italian = COURSE.find(o => o.id === "italian")!;
    expect(legacyCard(italian, old)).toEqual({ box: 4, due: "2026-11-20" });
  });
  it("such openings join without a Learn step, keeping their learnt status", () => {
    const l = reviewLines({ cards: old, white: "italian" }, T);
    expect(l.map(x => x.o.id).sort()).toEqual(["italian", "london"]);
    expect(l.find(x => x.o.id === "italian")!.card.box).toBe(4);
  });
  it("every old repertoire id exists in the course with the same id", () => {
    for (const id of ["italian", "london", "qg", "e5", "sicilian", "carokann", "qgd", "slav", "kid"]) expect(COURSE.find(o => o.id === id)?.rep, id).toBe(id);
  });
  it("a new review card replaces the old one once it exists", () => {
    const l = reviewLines({ cards: { ...old, [cardKey("italian")]: { box: 1, due: "2026-10-31" } } }, T);
    expect(l.find(x => x.o.id === "italian")!.card.box).toBe(1);
  });
});

describe("merging across devices", () => {
  it("unions review cards (further along wins) and Learn steps", () => {
    const a = sv({ cards: { [cardKey("london")]: { box: 3, due: "2026-11-06" } }, course: { london: ["learn"] } });
    const b = sv({ cards: { [cardKey("london")]: { box: 1, due: "2026-10-31" }, [cardKey("qg")]: { box: 0, due: T } }, course: { london: ["practise"], qg: ["learn"] } });
    const m = merge(a, b).rep!;
    expect(m.cards[cardKey("london")].box).toBe(3);
    expect(m.cards[cardKey("qg")]).toBeDefined();
    expect(m.course!.london.sort()).toEqual(["learn", "practise"]);
    expect(merge(b, a).rep).toEqual(m);
    expect(reviewLines(m, T).map(l => l.o.id).sort()).toEqual(["london", "qg"]);
  });
  it("a learner with only old slot cards on one device still gets them after merging", () => {
    const m = merge(sv({ cards: { "kid:0": { box: 3, due: T } }, e4: "x" }), sv({ cards: {}, course: { london: ["learn"] } })).rep!;
    expect(reviewLines(m, T).map(l => l.o.id).sort()).toEqual(["kid", "london"]);
  });
});
