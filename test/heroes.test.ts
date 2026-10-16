// Superheroes (DECISIONS #109): one hero per level, a three-round boss, earned on the third round.
import { beforeEach, describe, expect, it } from "vitest";
import { bossBot, bossRating, HEROES, heroLessons, hasHero, roundsWon, winRound } from "../src/heroes/heroes";
import { LEVELS } from "../src/content/levels";
import { store } from "../src/store";

describe("heroes", () => {
  it("one hero per level, ten in all, each with words in both languages", () => {
    expect(HEROES.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const h of HEROES) for (const x of [h.name, h.virtue, h.line]) { expect(x.en.length).toBeGreaterThan(2); expect(x.pa.length).toBeGreaterThan(2); }
  });
  it("a boss plays at the top of its level's band", () => {
    expect(bossRating(1)).toBe(200); expect(bossRating(3)).toBe(600); expect(bossRating(10)).toBe(2000);
    const b = bossBot(3);
    expect(b.rating).toBe(600); expect(b.help).toBe(false); expect(b.art).toBe("art/heroes/ekta"); expect(b.name.en).toBe("Ekta");
  });
  it("the hero opens the level's first lesson and returns at its middle one", () => {
    const ls = LEVELS[2].lessons;
    expect(heroLessons(3)).toEqual([ls[0].id, ls[Math.floor(ls.length / 2)].id]);
  });
});

describe("the boss battle", () => {
  beforeEach(() => store.reset());
  it("rounds are won in order, and only the third earns the hero", () => {
    expect(winRound(3, 2)).toBe(false); expect(roundsWon(3)).toBe(0);   // round 2 is not open yet
    expect(winRound(3, 1)).toBe(false); expect(roundsWon(3)).toBe(1);
    expect(winRound(3, 1)).toBe(false); expect(roundsWon(3)).toBe(1);   // winning round 1 again changes nothing
    expect(winRound(3, 2)).toBe(false); expect(hasHero("ekta")).toBe(false);
    expect(winRound(3, 3)).toBe(true); expect(hasHero("ekta")).toBe(true); expect(roundsWon(3)).toBe(3);
    expect(roundsWon(4)).toBe(0);
  });
});
