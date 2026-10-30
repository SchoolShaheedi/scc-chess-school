// Master games (guess the move): every game is replayed with chess.js, its ending and result checked, every fact the
// notes state about a position checked on the board, and the bilingual texts checked for the house rules.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { GAMES, NOTES, byId, firstGuess, guessPlies, maxPoints, replay } from "../src/master/games";
import { ALSO, MISS, TOLERANCE, judgeGuess, pointsFor, sameMove } from "../src/master/judge";
import { UI } from "../src/i18n";
import { merge, type Saved } from "../src/merge";

/** What each game is known to end with: plies, result, whether the last move is checkmate, and the last move. */
const KNOWN: Record<string, { plies: number; result: "1-0" | "0-1"; mate: boolean; last: string }> = {
  immortal: { plies: 45, result: "1-0", mate: true, last: "Be7#" },
  evergreen: { plies: 47, result: "1-0", mate: true, last: "Bxe7#" },
  opera: { plies: 33, result: "1-0", mate: true, last: "Rd8#" },
  reti: { plies: 21, result: "1-0", mate: true, last: "Bd8#" },
  capa: { plies: 103, result: "1-0", mate: false, last: "d6" },
  rotlewi: { plies: 50, result: "0-1", mate: false, last: "Rh3" },
  lasker: { plies: 75, result: "1-0", mate: false, last: "Qxd3" },
  steinitz: { plies: 49, result: "1-0", mate: false, last: "Rxh7+" },
};
const at = (id: string, n: number) => new Chess(replay(byId(id)!).fens[n]);
const count = (c: Chess, color: "w" | "b") => {
  const o: Record<string, number> = {};
  for (const row of c.board()) for (const p of row) if (p && p.color === color) o[p.type] = (o[p.type] ?? 0) + 1;
  return o;
};
const TEXT = UI as unknown as Record<string, { en: string; pa: string }>;

describe("master games: replay", () => {
  it("there are eight games, all before 1950", () => {
    expect(GAMES.map(g => g.id)).toEqual(["immortal", "evergreen", "opera", "reti", "capa", "rotlewi", "lasker", "steinitz"]);
    for (const g of GAMES) expect(g.year).toBeLessThan(1950);
  });
  for (const g of GAMES) {
    it(`${g.id}: every move is legal, and the ending and the result are the known ones`, () => {
      const c = new Chess(), k = KNOWN[g.id];
      let last = "";
      for (const san of g.sans) last = c.move(san).san;      // throws on an illegal move
      expect(g.sans.length).toBe(k.plies);
      expect(last).toBe(k.last);
      expect(c.isCheckmate()).toBe(k.mate);
      expect(g.mate).toBe(k.mate);
      expect(g.result).toBe(k.result);
      if (k.mate) expect(c.turn() === "b" ? "1-0" : "0-1").toBe(k.result);   // the side that mated is the winner
      expect(replay(g).fens.length).toBe(k.plies + 1);
    });
  }
});

describe("master games: the facts the notes state", () => {
  it("Immortal: both rooks and the queen are given up, and White ends with a bishop and two knights", () => {
    expect(count(at("immortal", 45), "w")).toMatchObject({ b: 1, n: 2 });
    expect(count(at("immortal", 45), "w").r).toBeUndefined();
    expect(count(at("immortal", 45), "w").q).toBeUndefined();
    expect(count(at("immortal", 41), "w").r).toBeUndefined();   // both rooks gone before Nxg7+ is played out
    expect(count(at("immortal", 45), "b")).toMatchObject({ r: 2, b: 2, n: 2, q: 1 });
  });
  it("Evergreen: the mate is by the bishop from a3, guarded by the pawn on f6, with the other bishop on d7", () => {
    const c = at("evergreen", 47);
    expect(c.isCheckmate()).toBe(true);
    expect(replay(byId("evergreen")!).moves[46]).toMatchObject({ from: "a3", to: "e7" });
    expect(c.attackers("e7", "w")).toContain("f6");
    expect(c.get("d7")).toMatchObject({ type: "b", color: "w" });
    const w = count(c, "w");
    expect(w.n).toBeUndefined(); expect(w.q).toBeUndefined();   // both knights and the queen have gone
    expect(w.r).toBe(1);                                         // one rook is left: the other was given on e7
  });
  it("Opera: the rook on d8 is guarded by the bishop on g5, and Qb8+ is met only by Nxb8", () => {
    const c = at("opera", 33);
    expect(c.isCheckmate()).toBe(true);
    expect(c.attackers("d8", "w")).toContain("g5");
    const before = at("opera", 31);   // after 16.Qb8+
    expect(before.inCheck()).toBe(true);
    expect(before.moves()).toContain("Nxb8");
  });
  it("Opera: the d7 knight is pinned between the rooks after 12...Rd8", () => {
    const c = at("opera", 24);
    expect(c.get("d1")).toMatchObject({ type: "r", color: "w" });
    expect(c.get("d7")).toMatchObject({ type: "n", color: "b" });
    expect(c.get("d8")).toMatchObject({ type: "r", color: "b" });
    expect(["d2", "d3", "d4", "d5", "d6"].every(s => !c.get(s as never))).toBe(true);
  });
  it("Opera: Nxb5 cxb5 Bxb5+ is a knight for two pawns", () => {
    const g = byId("opera")!, l = replay(g);
    const caps = [18, 19, 20].map(i => l.moves[i].san);     // 10.Nxb5 cxb5 11.Bxb5+ are plies 19-21
    expect(caps).toEqual(["Nxb5", "cxb5", "Bxb5+"]);
  });
  it("Reti: 9.Qd8+ leaves only Kxd8, and 10.Bg5+ is a double check", () => {
    expect(at("reti", 17).moves()).toEqual(["Kxd8"]);
    const c = at("reti", 19);
    expect(c.inCheck()).toBe(true);
    expect(c.attackers("d8", "w").sort()).toEqual(["d1", "g5"]);
    expect(c.moves().sort()).toEqual(["Kc7", "Ke8"]);
  });
  it("Reti: in the final position the rook guards the bishop and the king's own men fill its squares", () => {
    const c = at("reti", 21);
    expect(c.isCheckmate()).toBe(true);
    expect(c.attackers("d8", "w")).toContain("d1");
    for (const s of ["b7", "c6", "c8", "b8"]) expect(c.get(s as never)?.color).toBe("b");
  });
  it("Lasker: Rh3+ can only be blocked, by Qh6 or Bh4", () => {
    const c = at("lasker", 39);
    expect(c.inCheck()).toBe(true);
    expect([...c.moves()].sort()).toEqual(["Bh4", "Qh6"]);
  });
  it("Lasker: after Qd7 the queen attacks both bishops, and the game ends a queen and six pawns against a rook and a pawn", () => {
    const c = at("lasker", 43);
    expect(c.attackers("b7", "w")).toContain("d7");
    expect(c.attackers("e7", "w")).toContain("d7");
    expect(c.get("b7")).toMatchObject({ type: "b", color: "b" });
    expect(c.get("e7")).toMatchObject({ type: "b", color: "b" });
    const end = at("lasker", 75);
    expect(count(end, "w")).toEqual({ p: 6, q: 1, k: 1 });
    expect(count(end, "b")).toEqual({ p: 1, r: 1, k: 1 });
  });
  it("Rotlewi: after 21...Qh4 Black threatens Qxh2 mate, and in the end the queen on g2 is pinned by the bishop on e4", () => {
    const threat = new Chess(at("rotlewi", 42).fen().replace(" w ", " b "));
    threat.move("Qxh2");
    expect(threat.isCheckmate()).toBe(true);
    const end = at("rotlewi", 50);
    const qMoves = end.moves({ square: "g2" as never, verbose: true }).map(m => m.to);
    expect(qMoves).not.toContain("h3");                     // it cannot take the rook
    expect(qMoves.sort()).toEqual(["e4", "f3"]);            // it may only move along the pin line
    expect(end.get("e4")).toMatchObject({ type: "b", color: "b" });
  });
  it("Rotlewi: Black gave up the queen (to a pawn) and a rook (to the queen)", () => {
    const l = replay(byId("rotlewi")!);
    expect(l.moves[44].san).toBe("gxh4");     // 23.gxh4 takes the queen on h4
    expect(l.moves[46].san).toBe("Qxd2");     // 24.Qxd2 takes the rook
  });
  it("Rotlewi: 23...Rd2 attacks the queen on e2 and the bishop on b2", () => {
    const c = at("rotlewi", 46);
    expect(c.attackers("e2", "b")).toContain("d2");
    expect(c.attackers("b2", "b")).toContain("d2");
    expect(c.get("e2")).toMatchObject({ type: "q", color: "w" });
    expect(c.get("b2")).toMatchObject({ type: "b", color: "w" });
  });
  it("Rotlewi: 15...Ne5 attacks the bishop on d3 and the knight on f3", () => {
    const c = at("rotlewi", 30);
    expect(c.attackers("d3", "b")).toContain("e5");
    expect(c.attackers("f3", "b")).toContain("e5");
    expect(c.get("d3")).toMatchObject({ type: "b", color: "w" });
    expect(c.get("f3")).toMatchObject({ type: "n", color: "w" });
  });
  it("Capablanca: the ending is rook and two pawns against rook and a pawn, with the king beside the d-pawn", () => {
    const c = at("capa", 103);
    expect(count(c, "w")).toEqual({ r: 1, p: 2, k: 1 });
    expect(count(c, "b")).toEqual({ r: 1, p: 1, k: 1 });
    expect(c.get("c6")).toMatchObject({ type: "k", color: "w" });
    expect(c.get("d6")).toMatchObject({ type: "p", color: "w" });
    // the queens and one pair of rooks are off after 26...Kxe8
    const mid = at("capa", 52);
    expect(count(mid, "w").q).toBeUndefined(); expect(count(mid, "b").q).toBeUndefined();
    expect(count(mid, "w").r).toBe(1); expect(count(mid, "b").r).toBe(1);
    // doubled c-pawns after 11.bxc3
    const c3 = at("capa", 21);
    expect(c3.get("c3")).toMatchObject({ type: "p", color: "w" }); expect(c3.get("c4")).toMatchObject({ type: "p", color: "w" });
  });
  it("Steinitz: the rook checks on e7, f7, g7 and h7, and Bg5 attacks the queen on d8", () => {
    const l = replay(byId("steinitz")!);
    expect([42, 44, 46, 48].map(i => l.moves[i].san)).toEqual(["Rxe7+", "Rf7+", "Rg7+", "Rxh7+"]);
    const c = at("steinitz", 19);
    expect(c.attackers("d8", "w")).toContain("g5");
    expect(c.get("d8")).toMatchObject({ type: "q", color: "b" });
    const e6 = at("steinitz", 37);
    expect(e6.attackers("g7", "w")).toContain("e6");
    expect(e6.attackers("e6", "w")).toContain("e2");      // the queen guards the knight
  });
});

describe("master games: the geometry the notes describe", () => {
  const sees = (id: string, n: number, by: "w" | "b", from: string, target: string) => expect(at(id, n).attackers(target as never, by), `${id} after ${n}: ${from} sees ${target}`).toContain(from);
  it("each note's 'attacks / aims at' holds on the board", () => {
    sees("immortal", 17, "w", "f5", "g7");        // Nf5 looks at g7
    sees("immortal", 23, "w", "h4", "g5");        // h4 hits the queen on g5
    sees("evergreen", 17, "w", "e5", "f6");       // e5 attacks the queen on f6
    sees("evergreen", 21, "w", "a3", "e7");       // Ba3 aims at the knight on e7
    sees("opera", 13, "w", "b3", "b7");           // Qb3 attacks b7
    sees("opera", 13, "w", "b3", "c4");           // and backs the bishop that aims at f7
    sees("opera", 13, "w", "c4", "f7");
    sees("opera", 17, "w", "g5", "f6");           // Bg5 pins the knight on f6 ...
    expect(at("opera", 17).get("e7")).toMatchObject({ type: "q", color: "b" });   // ... against the queen
    sees("reti", 12, "b", "a5", "e5");            // the queen checks and attacks e5
    expect(at("reti", 12).get("e5")).toMatchObject({ type: "p", color: "w" });
    sees("lasker", 23, "w", "e5", "f6");          // the bishop on e5 presses on the knight on f6, with g7 behind it
    expect(at("lasker", 23).get("f6")).toMatchObject({ type: "n", color: "b" });
    const r = at("rotlewi", 26);                  // Rd8 stands behind its own bishop on d6, facing the white bishop and queen on d3 / d2
    expect(r.get("d8")).toMatchObject({ type: "r", color: "b" }); expect(r.get("d6")).toMatchObject({ type: "b", color: "b" });
    expect(r.get("d3")).toMatchObject({ type: "b", color: "w" }); expect(r.get("d2")).toMatchObject({ type: "q", color: "w" });
    sees("rotlewi", 40, "b", "g4", "h2");         // Ng4 and Bb6 aim at the white king's corner
    sees("rotlewi", 40, "b", "b6", "g1");
    expect(at("rotlewi", 40).get("h1")).toMatchObject({ type: "k", color: "w" });
    sees("steinitz", 14, "b", "d5", "c4");        // d5 hits the bishop and the pawn
    sees("steinitz", 14, "b", "d5", "e4");
    sees("capa", 77, "w", "f6", "g7");            // king on f6 and pawn on g6 hold the black king on g8
    expect(at("capa", 77).get("g6")).toMatchObject({ type: "p", color: "w" });
    expect(at("capa", 77).get("f8")).toMatchObject({ type: "k", color: "b" });   // the black king is on the back rank
    expect(at("capa", 77).get("h7")).toMatchObject({ type: "r", color: "w" });    // and the rook is ready for Rg7+
  });
  it("Evergreen: Bxd3 wins the d3 pawn back on move 16, and Rxe7+ is on move 20", () => {
    const l = replay(byId("evergreen")!);
    expect(l.moves[30].san).toBe("Bxd3");         // 16.Bxd3
    expect(l.moves[38].san).toBe("Rxe7+");
    expect(at("evergreen", 14).get("d3")).toMatchObject({ type: "p", color: "b" });
  });
});

describe("master games: guess points and play", () => {
  it("each side has at least four guesses, and the guessing starts after the opening", () => {
    for (const g of GAMES) for (const side of ["w", "b"] as const) {
      expect(guessPlies(g, side).length).toBeGreaterThanOrEqual(4);
      expect(firstGuess(g, side)).toBeGreaterThanOrEqual(2 * (g.from - 1));
      expect(maxPoints(g, side)).toBe(3 * guessPlies(g, side).length);
      for (const i of guessPlies(g, side)) expect(i % 2 === 0).toBe(side === "w");
    }
  });
  it("the same move is recognised, the promotion piece defaults to a queen", () => {
    expect(sameMove({ from: "e2", to: "e4" }, { from: "e2", to: "e4" })).toBe(true);
    expect(sameMove({ from: "e2", to: "e4" }, { from: "e2", to: "e3" })).toBe(false);
    expect(sameMove({ from: "a7", to: "a8" }, { from: "a7", to: "a8", promotion: "q" })).toBe(true);
    expect(sameMove({ from: "a7", to: "a8", promotion: "n" }, { from: "a7", to: "a8", promotion: "q" })).toBe(false);
  });
  it("an engine-equal move earns 2 within 30 cp, and nothing beyond it", () => {
    expect(TOLERANCE).toBe(30);
    expect(pointsFor({ cp: 100 }, { cp: 100 })).toBe(ALSO);
    expect(pointsFor({ cp: 100 }, { cp: 70 })).toBe(ALSO);
    expect(pointsFor({ cp: 100 }, { cp: 69 })).toBe(MISS);
    expect(pointsFor({ cp: 100 }, { cp: 150 })).toBe(ALSO);       // better than the engine's best is still fine
    expect(pointsFor({ mate: 3 }, { cp: 500 })).toBe(MISS);        // missing a forced mate is a miss
    expect(pointsFor({ mate: 3 }, { mate: 5 })).toBe(ALSO);
  });
  it("judgeGuess flips the opponent's score back, and a failing engine counts as a miss", async () => {
    const start = new Chess().fen();
    // the position before: +50 for the guesser. After the guess the opponent is at -45 (so the guesser is +45): within 30
    let calls = 0;
    const engine = { analyse: async () => ({ score: calls++ === 0 ? { cp: 50 } : { cp: -45 } }) };
    expect(await judgeGuess(engine, start, { from: "e2", to: "e4" })).toBe(ALSO);
    calls = 0;
    const bad = { analyse: async () => ({ score: calls++ === 0 ? { cp: 50 } : { cp: 40 } }) };      // the guesser is now at -40
    expect(await judgeGuess(bad, start, { from: "e2", to: "e4" })).toBe(MISS);
    const dead = { analyse: async () => { throw new Error("engine stopped"); } };
    expect(await judgeGuess(dead, start, { from: "e2", to: "e4" })).toBe(MISS);
  });
  it("a checkmating guess is as good as the played move", async () => {
    const mate = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";
    const never = { analyse: async () => { throw new Error("not needed"); } };
    expect(await judgeGuess(never, mate, { from: "a1", to: "a8" })).toBe(ALSO);
  });
  it("the best score per game and side merges as the higher one", () => {
    const base = { xp: 0, streak: { days: 0, last: "" }, lessons: {} } as Saved;
    const m = merge({ ...base, masterBest: { "opera:w": 9, "reti:b": 3 } }, { ...base, masterBest: { "opera:w": 12, "capa:w": 6 } });
    expect(m.masterBest).toEqual({ "opera:w": 12, "reti:b": 3, "capa:w": 6 });
  });
});

describe("master games: the notes and their texts", () => {
  for (const g of GAMES) {
    it(`${g.id}: notes are in order, inside the game, and every text exists in both languages`, () => {
      const notes = NOTES[g.id], total = g.sans.length;
      expect(notes.length).toBeGreaterThanOrEqual(6);
      expect(notes.length).toBeLessThanOrEqual(10);
      let prev = 0;
      for (const n of notes) {
        expect(n.n).toBeGreaterThan(prev); prev = n.n;
        expect(n.n).toBeLessThanOrEqual(total);
        if (n.claim) { expect(n.claim.at).toBeGreaterThanOrEqual(1); expect(n.claim.at).toBeLessThanOrEqual(total); }
        const tx = TEXT[`mg_${g.id}_${n.k}`];
        expect(tx, `mg_${g.id}_${n.k}`).toBeTruthy();
        expect(tx.en.length).toBeGreaterThan(10); expect(tx.pa.length).toBeGreaterThan(10);
      }
      // every note listed is the only text key of its game: n1..nN with no gaps and no strays
      const keys = Object.keys(TEXT).filter(k => new RegExp(`^mg_${g.id}_n\\d+$`).test(k));
      expect(keys.sort()).toEqual(notes.map(n => `mg_${g.id}_${n.k}`).sort());
      for (const k of ["name", "intro"]) expect(TEXT[`mg_${g.id}_${k}`], k).toBeTruthy();
    });
  }
  it("the Punjabi follows the house rules: decomposed nukta, no space-less script mix, a space before no danda, no letter-spacing", () => {
    const keys = Object.keys(TEXT).filter(k => k.startsWith("mg"));
    expect(keys.length).toBeGreaterThan(70);
    for (const k of keys) {
      const { en, pa } = TEXT[k];
      for (const s of [en, pa]) {
        expect(s, k).not.toMatch(/[ਲ਼ਸ਼ਖ਼ਗ਼ਜ਼ਫ਼]/);       // the six nukta letters stay decomposed
        expect(s, k).not.toMatch(/[ऀ-ॣ॥-ॿ]/);                   // no Devanagari strays (only the danda)
        expect(s, k).not.toMatch(/Guru|Gurū|ਗੁਰੂ|ਗੁਰ /);                           // no Gurbani or Guru names anywhere
      }
      expect(pa, k).not.toMatch(/\s।/);                                         // no space before the danda
      expect(pa, k).toMatch(/[਀-੿]/);                                      // it is Punjabi
      expect(en, k).not.toMatch(/[਀-੿]/);                                  // and the English is English
    }
  });
});
