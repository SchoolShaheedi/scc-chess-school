// Insights (DECISIONS #113): the pure maths behind the page.
import { describe, expect, it } from "vitest";
import NAMES from "../src/content/opening-names.json";
import { bandOf, byOpening, byPhase, byTime, myMoves, type MyMove, openingOf, phaseOf, replay, summarise } from "../src/insights/insights";
import type { SavedGame } from "../src/play/history";

const names = NAMES as Record<string, string>;
const ITALIAN = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"];
const game = (over: Partial<SavedGame>): SavedGame => ({ at: "2026-10-16T10:00:00Z", opp: { en: "Titli", pa: "ਤਿਤਲੀ" }, me: "w", result: "won", uci: ITALIAN, ...over });

describe("openings", () => {
  it("names the family from the longest matching line", () => {
    expect(openingOf(["e4", "e5", "Nf3", "Nc6", "Bc4"], names)).toBe("Italian Game");
    expect(openingOf(["e4", "c5"], names)).toBe("Sicilian Defence");
    expect(openingOf([], names)).toBeNull();
  });
  it("adds up results per opening, most played first, and skips games from a set position", () => {
    const rows = byOpening([game({}), game({ result: "draw" }), game({ result: "lost" }),
      game({ uci: ["e2e4", "c7c5"], result: "won" }), game({ startFen: "8/8/8/8/8/8/4k3/4K3 w - - 0 1" })], names);
    expect(rows[0]).toMatchObject({ name: "Italian Game", games: 3, won: 1, drawn: 1, lost: 1, score: 50 });
    expect(rows[1]).toMatchObject({ name: "Sicilian Defence", games: 1, score: 100 });
    expect(rows).toHaveLength(2);
  });
});

describe("phases", () => {
  const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  it("the first ten moves each are the opening", () => { expect(phaseOf(start, 0)).toBe("opening"); expect(phaseOf(start, 19)).toBe("opening"); });
  it("full armies after move ten are the middlegame; a rook and two minors each is the endgame", () => {
    expect(phaseOf(start, 20)).toBe("middlegame");
    expect(phaseOf("2b1k1n1/r7/8/8/8/8/R7/2B1K1N1 w - - 0 30", 40)).toBe("endgame");
  });
});

describe("my moves in a game", () => {
  it("replays the game and keeps only my plies, with their phase and thinking time", () => {
    const g = game({ me: "b", ms: [null, 4000, null, 25000, null, 9000] });
    expect(replay(g).fens).toHaveLength(7);
    const m = myMoves(g, [0, 1, 2, 3, 4, 5]);
    expect(m).toEqual([{ drop: 1, phase: "opening", ms: 4000 }, { drop: 3, phase: "opening", ms: 25000 }, { drop: 5, phase: "opening", ms: 9000 }]);
  });
  it("a game saved before think time was recorded has none", () => {
    expect(myMoves(game({}), [0, 0, 0, 0, 0, 0]).every(x => x.ms === undefined)).toBe(true);
  });
});

describe("accuracy by phase and by time", () => {
  const mv = (n: number, phase: MyMove["phase"], drop: number, ms?: number): MyMove[] => Array.from({ length: n }, () => ({ drop, phase, ...(ms !== undefined ? { ms } : {}) }));
  it("a phase with too few moves shows nothing rather than a guess", () => {
    const p = byPhase([...mv(10, "opening", 0), ...mv(3, "endgame", 40)]);
    expect(p.opening).toBe(100); expect(p.endgame).toBeNull(); expect(p.middlegame).toBeNull();
  });
  it("bands moves by thinking time", () => {
    expect([bandOf(4999), bandOf(5000), bandOf(20000), bandOf(20001)]).toEqual(["fast", "mid", "mid", "slow"]);
    expect(byTime(mv(9, "opening", 0, 1000))).toBeNull();
    const t = byTime([...mv(6, "opening", 25, 1000), ...mv(6, "opening", 0, 10000)])!;
    expect(t.fast.share).toBe(50); expect(t.slow.accuracy).toBeNull(); expect(t.mid.accuracy).toBe(100);
    expect(t.fast.accuracy!).toBeLessThan(50);
  });
  it("the summary names the weak phase and the rushed band only when the gap is real", () => {
    const s = summarise({ opening: 88, middlegame: 71, endgame: 54 },
      { fast: { accuracy: 52, share: 31 }, mid: { accuracy: 79, share: 46 }, slow: { accuracy: 86, share: 23 } });
    expect(s).toEqual({ weak: { phase: "endgame", acc: 54 }, strong: { phase: "opening", acc: 88 }, rushed: { band: "fast", acc: 52 } });
    expect(summarise({ opening: 80, middlegame: 76, endgame: null }, null)).toEqual({});
  });
});
