import { describe, expect, it } from "vitest";
import NAMES from "../src/content/opening-names.json";
import { matchCourse, openingsReport } from "../src/insights/openings-report";
import type { SavedGame } from "../src/play/history";

const names = NAMES as Record<string, string>;
const ITALIAN = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"];
const g = (uci: string[], result: SavedGame["result"], extra: Partial<SavedGame> = {}): SavedGame =>
  ({ at: "2026-10-16T10:00:00Z", opp: { en: "Titli", pa: "" }, me: "w", result, uci, ...extra });

describe("openings report", () => {
  const games = [g(ITALIAN, "won"), g(ITALIAN, "won"), g(ITALIAN, "draw"), g(ITALIAN, "lost"), g(ITALIAN, "won"),
    g(["e2e4", "c7c5"], "lost"), g(["e2e4", "c7c5"], "lost"), g(["e2e4", "c7c5"], "draw"),
    g(["d2d4", "d7d5"], "won"), g(["d2d4", "d7d5"], "won"),            // only two: left out
    g(ITALIAN, "won", { startFen: "8/8/8/8/8/8/4k3/4K3 w - - 0 1" })];
  const rep = openingsReport(games, names);
  it("keeps openings played at least three times, most played first", () => {
    expect(rep.map(r => r.name)).toEqual(["Italian Game", "Sicilian Defence"]);
    expect(rep[0]).toMatchObject({ games: 5, won: 3, drawn: 1, lost: 1, score: 70, small: false });
    expect(rep[1]).toMatchObject({ games: 3, score: 17, small: true });
  });
  it("links to the course and flags the worst score", () => {
    expect(rep[0].courseId).toBe("italian");
    expect(rep[0].practise).toBe(false);
    expect(rep[1].practise).toBe(true);
  });
  it("matches by name, then by moves", () => {
    expect(matchCourse("Ruy Lopez", [])).toBe("ruy");
    expect(matchCourse("French Defence, Classical, 4. Bg5", [])).toBe("french");
    expect(matchCourse("Some Other Name", ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"])).toBe("italian");
    expect(matchCourse("Grob Opening", ["g4", "d5"])).toBeNull();
  });
  it("does not flag a perfect record", () => {
    const r = openingsReport([g(ITALIAN, "won"), g(ITALIAN, "won"), g(ITALIAN, "won")], names);
    expect(r[0].practise).toBe(false);
  });
});
