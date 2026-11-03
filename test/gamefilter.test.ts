// The saved-game filters (Practice tools, 2026-11-03).
import { describe, expect, it } from "vitest";
import NAMES from "../src/content/opening-names.json";
import { describeGames, filterGames, filterOptions, isFiltered, NO_FILTER, openingOfGame, startOf, type GameFilter } from "../src/play/gamefilter";
import type { SavedGame } from "../src/play/history";

const names = NAMES as Record<string, string>;
const ITALIAN = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"];
const SICILIAN = ["e2e4", "c7c5"];
const g = (at: string, result: SavedGame["result"], me: "w" | "b", opp: string, uci: string[], extra: Partial<SavedGame> = {}): SavedGame =>
  ({ at, opp: { en: opp, pa: opp }, me, result, uci, ...extra });

// "now" is Wednesday 2026-11-04 12:00 (local): this week began Monday 2 Nov, this month on 1 Nov
const NOW = new Date(2026, 10, 4, 12, 0);
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();
const list: SavedGame[] = [
  g(at(2026, 11, 4), "won", "w", "Titli", ITALIAN),                     // 0 today
  g(at(2026, 11, 2, 0), "lost", "b", "Chakor", SICILIAN),               // 1 Monday, at midnight
  g(at(2026, 11, 1), "draw", "w", "Titli", ITALIAN),                    // 2 Sunday: last week, this month
  g(at(2026, 10, 31, 23), "won", "b", "Online friend", ["d2d4", "d7d5"]),   // 3 last month
  g(at(2026, 9, 1), "lost", "w", "Chakor", ITALIAN, { startFen: "8/8/8/8/8/8/4k3/4K3 w - - 0 1" }),   // 4 a set position
  g(at(2026, 11, 3), "won", "b", "Titli", ["a2a3", "e7e5"]),            // 5 an opening with no course lesson
];
const infos = describeGames(list, names);
const idx = (f: Partial<GameFilter>) => filterGames(infos, { ...NO_FILTER, ...f }, NOW).map(x => x.i);

describe("filters", () => {
  it("no filter keeps every game, in order", () => expect(idx({})).toEqual([0, 1, 2, 3, 4, 5]));
  it("result", () => { expect(idx({ result: "won" })).toEqual([0, 3, 5]); expect(idx({ result: "lost" })).toEqual([1, 4]); expect(idx({ result: "draw" })).toEqual([2]); });
  it("colour", () => { expect(idx({ colour: "w" })).toEqual([0, 2, 4]); expect(idx({ colour: "b" })).toEqual([1, 3, 5]); });
  it("opponent bot", () => { expect(idx({ bot: "Titli" })).toEqual([0, 2, 5]); expect(idx({ bot: "Chakor" })).toEqual([1, 4]); expect(idx({ bot: "Nobody" })).toEqual([]); });
  it("opening, by the course's name", () => { expect(idx({ opening: "Italian Game" })).toEqual([0, 2]); expect(idx({ opening: "Sicilian Defence" })).toEqual([1]); });
  it("opening, by the family name where the course has no lesson", () => expect(idx({ opening: "Anderssen's Opening" })).toEqual([5]));
  it("this week starts on Monday", () => expect(idx({ when: "week" })).toEqual([0, 1, 5]));
  it("this month starts on the 1st", () => expect(idx({ when: "month" })).toEqual([0, 1, 2, 5]));
  it("filters combine", () => {
    expect(idx({ result: "won", colour: "b" })).toEqual([3, 5]);
    expect(idx({ bot: "Titli", when: "month", result: "won" })).toEqual([0, 5]);
    expect(idx({ result: "draw", colour: "b" })).toEqual([]);
  });
  it("a game keeps its place in the saved list, so review opens the right one", () =>
    expect(filterGames(infos, { ...NO_FILTER, result: "lost" }, NOW).map(x => x.g)).toEqual([list[1], list[4]]));
});

describe("dates", () => {
  it("week and month starts, including a Sunday and a month's first day", () => {
    expect(startOf("week", NOW)).toEqual(new Date(2026, 10, 2));
    expect(startOf("week", new Date(2026, 10, 8, 23, 59))).toEqual(new Date(2026, 10, 2));   // Sunday belongs to the week before
    expect(startOf("week", new Date(2026, 10, 2, 0, 0))).toEqual(new Date(2026, 10, 2));
    expect(startOf("week", new Date(2026, 10, 1))).toEqual(new Date(2026, 9, 26));          // across the month end
    expect(startOf("month", NOW)).toEqual(new Date(2026, 10, 1));
  });
});

describe("openings and options", () => {
  it("a game from a set position has no opening", () => expect(openingOfGame(list[4], names)).toBeNull());
  it("the course's own name is used where the course teaches the opening", () => expect(openingOfGame(list[0], names)?.label.en).toBe("Italian Game"));
  it("the options are what occurs, most played first", () => {
    const o = filterOptions(infos);
    expect(o.bots.map(b => [b.key, b.n])).toEqual([["Titli", 3], ["Chakor", 2], ["Online friend", 1]]);
    expect(o.openings[0]).toMatchObject({ key: "Italian Game", n: 2 });
    expect(o.openings.map(x => x.key)).toContain("Anderssen's Opening");
    expect(o.openings.reduce((a, x) => a + x.n, 0)).toBe(infos.filter(x => x.opening).length);
  });
  it("knows when a filter is on", () => { expect(isFiltered(NO_FILTER)).toBe(false); expect(isFiltered({ ...NO_FILTER, when: "week" })).toBe(true); });
});
