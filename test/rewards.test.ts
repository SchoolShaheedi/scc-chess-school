// DECISIONS #94: cosmetics earned by learning, the streak freezes, and who "your next opponent" is.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { earned, nextUnlock, REWARDS, rewardFor, allowed, collect } from "../src/rewards";
import { BOTS, miniBot, nextOpponent } from "../src/bots/bots";
import { merge } from "../src/merge";
import { FREEZE_MAX, type State, store } from "../src/store";

const base = (x: Partial<State> = {}): State => ({
  onboarded: true, lang: "en", look: "junior", pieceSet: "cburnett", coach: "kaur", sound: true, xp: 0,
  streak: { days: 0, last: "" }, lessons: {}, tests: {}, placed: 0, daily: { date: "", solved: false }, rushBest: 0,
  rep: { cards: {} }, active: [], goal: { date: "", n: 0 }, stats: { botWins: {}, games: 0, dailies: 0, reviews: 0 }, buzz: true, rating: { r: 400, n: 0 }, missed: {}, ...x,
});
const lessons = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`1.${i + 1}`, { stars: 3 as const, completedAt: "" }]));

describe("rewards", () => {
  it("a new learner has earned none, and anything that is not a reward stays free", () => {
    expect(REWARDS.filter(r => earned(r, base()))).toEqual([]);
    expect(allowed("pieces", "cburnett", base())).toBe(true);
    expect(allowed("board", "green", base())).toBe(true);
    expect(allowed("pieces", "A", base())).toBe(false);
  });
  it("unlock from real progress", () => {
    expect(earned(rewardFor("pieces", "A")!, base({ tests: { 1: { best: 1, passed: true } } }))).toBe(true);
    expect(earned(rewardFor("pieces", "A")!, base({ placed: 3 }))).toBe(true);    // placed above Level 1
    expect(earned(rewardFor("board", "gold")!, base({ lessons: lessons(10) }))).toBe(true);
    expect(earned(rewardFor("board", "gold")!, base({ lessons: lessons(9) }))).toBe(false);
    expect(earned(rewardFor("frame", "gold")!, base({ streak: { days: 3, last: "" } }))).toBe(true);
  });
  it("once recorded, a reward stays earned after the streak breaks", () => {
    expect(earned(rewardFor("frame", "phulkari")!, base({ unlocked: ["frame:phulkari"] }))).toBe(true);
  });
  it("the next unlock is the one closest to done", () => {
    expect(nextUnlock(base({ lessons: lessons(8), xp: 100 }))!.id).toBe("board:gold");
    expect(nextUnlock(base({ unlocked: REWARDS.map(r => r.id) }))).toBeNull();
  });
  it("collect() records newly earned rewards once", () => {
    store.reset(); store.set({ xp: 1000 });
    expect(collect().map(r => r.id)).toEqual(["board:night"]);
    expect(collect()).toEqual([]);
    expect(store.get().unlocked).toEqual(["board:night"]);
  });
  it("merging two devices keeps every reward and the larger freeze bank", () => {
    const s = { xp: 0, streak: { days: 0, last: "" }, lessons: {} };
    const m = merge({ ...s, unlocked: ["pieces:A"], freezes: 1 }, { ...s, unlocked: ["board:gold"], freezes: 2 });
    expect(m.unlocked!.sort()).toEqual(["board:gold", "pieces:A"]);
    expect(m.freezes).toBe(2);
  });
});

describe("streak freezes", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 15, 12)); store.reset(); });
  afterEach(() => vi.useRealTimers());
  const after = (last: string, freezes: number) => {
    store.set({ streak: { days: 5, last }, freezes, goal: { date: "", n: 0 } });
    store.recordPractice();
    return store.get();
  };
  it("yesterday and one rest day both keep the streak, with no freeze spent", () => {
    expect(after("2026-10-14", 0).streak.days).toBe(6);
    expect(after("2026-10-13", 0).streak.days).toBe(6);
  });
  it("each freeze covers one more missed day", () => {
    const s = after("2026-10-12", 1);   // two days missed: the free rest day + one freeze
    expect(s.streak.days).toBe(6); expect(s.freezes).toBe(0);
    expect(after("2026-10-11", 1).streak.days).toBe(1);   // three missed, one freeze: it resets
    expect(after("2026-10-11", 2).streak.days).toBe(6);
  });
  it("finishing the daily goal earns one, up to the cap", () => {
    store.set({ freezes: 0, goal: { date: "2026-10-15", n: 2 } });
    store.recordPractice();
    expect(store.get().freezes).toBe(1);
    store.set({ freezes: FREEZE_MAX, goal: { date: "2026-10-15", n: 2 } });
    store.recordPractice();
    expect(store.get().freezes).toBe(FREEZE_MAX);
  });
});

describe("your next opponent", () => {
  it("is the unbeaten bot nearest a little above your rating", () => {
    expect(nextOpponent(250, {}).id).toBe("nanhi-chidi");
    expect(nextOpponent(250, { "nanhi-chidi": 1 }).id).toBe("kesri");
    expect(nextOpponent(1200, {}).id).toBe("teer");   // a strong newcomer is not sent to the beginner bot
  });
  it("once all are beaten, the nearest overall", () => {
    const all = Object.fromEntries(BOTS.map(b => [b.id, 1]));
    expect(nextOpponent(1600, all).id).toBe("sher");
  });
  it("the quick game is always against a gentle bot", () => {
    expect(miniBot(250, {}).id).toBe("nanhi-chidi");
    expect(miniBot(2000, {}).help).toBe(true);
  });
});
