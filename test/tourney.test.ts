// DECISIONS #90: the club tournament rules, checked the way an arbiter would.
import { describe, expect, it } from "vitest";
import { currentRound, type Game, type Player, type Result, roundDone, roundRobin, scores, standings, suggestRounds, suggestSystem, swissRound, type Tournament } from "../src/tourney/engine";

const players = (n: number): Player[] => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));
const tourney = (n: number, system: "swiss" | "rr", rounds = suggestRounds(n, system)): Tournament =>
  ({ id: "t", name: "Test", created: "2026-10-08", system, rounds, players: players(n), games: [] });
/** Play a round: the better seed wins (or by a given rule). */
const play = (t: Tournament, round: number, rule: (g: Game) => Result = g => (seedOf(t, g.white) < seedOf(t, g.black!) ? "1-0" : "0-1")) => {
  for (const g of t.games) if (g.round === round && g.black !== null) g.result = rule(g);
};
const seedOf = (t: Tournament, id: string) => t.players.find(p => p.id === id)!.seed;

describe("choosing a system", () => {
  it("suggests round-robin up to 8 players, Swiss above", () => {
    expect(suggestSystem(8)).toBe("rr"); expect(suggestSystem(9)).toBe("swiss");
    expect(suggestRounds(6, "rr")).toBe(5); expect(suggestRounds(7, "rr")).toBe(7);
    expect(suggestRounds(16, "swiss")).toBe(5);
  });
});

describe("round-robin", () => {
  for (const n of [4, 5, 6, 7, 8]) it(`${n} players: everyone meets everyone exactly once, one game a round`, () => {
    const games = roundRobin(players(n)), rounds = n % 2 ? n : n - 1;
    const real = games.filter(g => g.black !== null);
    expect(real).toHaveLength((n * (n - 1)) / 2);
    const seen = new Set(real.map(g => [g.white, g.black].sort().join("-")));
    expect(seen.size).toBe(real.length);
    for (let r = 1; r <= rounds; r++) {
      const ids = games.filter(g => g.round === r).flatMap(g => [g.white, g.black]).filter(Boolean);
      expect(new Set(ids).size, `round ${r}`).toBe(ids.length);   // nobody twice in a round
      expect(ids.length).toBe(n);                                   // and everyone plays or has the bye
    }
    // colours are fair: nobody has more than one extra White or Black overall
    for (const p of players(n)) {
      const w = real.filter(g => g.white === p.id).length, b = real.filter(g => g.black === p.id).length;
      expect(Math.abs(w - b), p.id).toBeLessThanOrEqual(1);
    }
  });
});

describe("Swiss", () => {
  it("never pairs the same two players twice, and nobody plays twice in a round", () => {
    const t = tourney(10, "swiss", 5);
    for (let r = 1; r <= 5; r++) {
      const round = swissRound(t)!; expect(round).not.toBeNull();
      t.games.push(...round); play(t, r);
      const ids = round.flatMap(g => [g.white, g.black]).filter(Boolean);
      expect(new Set(ids).size).toBe(10);
    }
    const pairsSeen = t.games.filter(g => g.black).map(g => [g.white, g.black].sort().join("-"));
    expect(new Set(pairsSeen).size).toBe(pairsSeen.length);
  });
  it("pairs leaders with leaders", () => {
    const t = tourney(8, "swiss", 3);
    t.games.push(...swissRound(t)!); play(t, 1);
    const r2 = swissRound(t)!, sc = scores(t);
    for (const g of r2) expect(sc.get(g.white)).toBe(sc.get(g.black!));   // 4 winners and 4 losers: each pairs within its group
  });
  it("gives the bye to the lowest-ranked player without one, never twice to the same player", () => {
    const t = tourney(7, "swiss", 5), byes: string[] = [];
    for (let r = 1; r <= 5; r++) {
      const round = swissRound(t)!; t.games.push(...round); play(t, r);
      const bye = round.find(g => g.black === null)!; byes.push(bye.white);
    }
    expect(new Set(byes).size).toBe(5);
    expect(scores(t).get(byes[0])).toBeGreaterThanOrEqual(1);   // a bye scores a point
  });
  it("keeps colours balanced: no one has more than two extra of a colour", () => {
    const t = tourney(12, "swiss", 6);
    for (let r = 1; r <= 6; r++) { t.games.push(...swissRound(t)!); play(t, r, g => ((g.board + r) % 3 === 0 ? "½-½" : "1-0")); }
    for (const p of t.players) {
      const w = t.games.filter(g => g.black && g.white === p.id).length, b = t.games.filter(g => g.black === p.id).length;
      expect(Math.abs(w - b), p.id).toBeLessThanOrEqual(2);
    }
  });
  it("leaves withdrawn players out of new rounds", () => {
    const t = tourney(6, "swiss", 3); t.games.push(...swissRound(t)!); play(t, 1);
    t.players[5].withdrawn = true;
    const r2 = swissRound(t)!;
    expect(r2.flatMap(g => [g.white, g.black])).not.toContain("p6");
  });
});

describe("standings", () => {
  it("ranks by points, then tie-breaks; a perfect score is first", () => {
    const t = tourney(4, "rr"); t.games = roundRobin(t.players);
    for (let r = 1; r <= 3; r++) play(t, r);
    const s = standings(t);
    expect(s.map(x => [x.name, x.points])).toEqual([["P1", 3], ["P2", 2], ["P3", 1], ["P4", 0]]);
  });
  it("breaks a points tie with Sonneborn-Berger in a round-robin", () => {
    const t = tourney(4, "rr"); t.games = roundRobin(t.players);
    // P1 and P2 both finish on 2: P1 beat P2 and P4, lost to P3; P2 beat P3 and P4; P3 beat P1 only
    const res: Record<string, Result> = { "p1-p2": "1-0", "p1-p3": "0-1", "p1-p4": "1-0", "p2-p3": "1-0", "p2-p4": "1-0", "p3-p4": "0-1" };
    for (const g of t.games) if (g.black) {
      const k = [g.white, g.black].sort().join("-"), r = res[k], whiteIsFirst = [g.white, g.black].sort()[0] === g.white;
      g.result = whiteIsFirst ? r : r === "1-0" ? "0-1" : r === "0-1" ? "1-0" : r;
    }
    const s = standings(t);
    expect(s.slice(0, 2).map(x => x.points)).toEqual([2, 2]);
    expect(s[0].sb).toBeGreaterThanOrEqual(s[1].sb);
    expect(s[0].place).toBe(1);
  });
  it("gives the same place to players equal on everything", () => {
    const t = tourney(2, "rr"); t.games = roundRobin(t.players); t.games[0].result = "½-½";
    expect(standings(t).map(x => x.place)).toEqual([1, 1]);
  });
  it("knows when a round is complete", () => {
    const t = tourney(5, "swiss", 3); t.games.push(...swissRound(t)!);
    expect(roundDone(t, 1)).toBe(false); play(t, 1); expect(roundDone(t, 1)).toBe(true); expect(currentRound(t)).toBe(1);
  });
});

// Full app check 2026-10-08: the chess review found the first version's colours broke FIDE's rules; these catch it.
const colourSeq = (t: Tournament | Game[], id: string) => (Array.isArray(t) ? t : t.games)
  .filter(g => g.black && (g.white === id || g.black === id)).sort((a, b) => a.round - b.round).map(g => (g.white === id ? "W" : "B")).join("");
const rnd = (seed: number) => () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);

describe("FIDE colour rules", () => {
  it("round-robin matches FIDE's Berger table for 6 players (round 2 is 6-4, 5-3, 1-2)", () => {
    const g = roundRobin(players(6)), r = (n: number) => g.filter(x => x.round === n).map(x => `${x.white.slice(1)}-${x.black!.slice(1)}`).join(" ");
    expect(r(1)).toBe("1-6 2-5 3-4"); expect(r(2)).toBe("6-4 5-3 1-2"); expect(r(3)).toBe("2-6 3-1 4-5");
  });
  for (const n of [4, 5, 6, 7, 8, 9, 10]) it(`round-robin, ${n} players: nobody has the same colour three times running`, () => {
    const g = roundRobin(players(n));
    for (const p of players(n)) expect(colourSeq(g, p.id), p.id).not.toMatch(/WWW|BBB/);
  });
  for (const [n, rounds] of [[9, 5], [10, 5], [13, 5], [16, 5], [20, 7]]) it(`Swiss ${n} players, ${rounds} rounds (100 random events): no 3 in a row, never 3+ extra of a colour`, () => {
    const r = rnd(n * 7 + rounds);
    for (let k = 0; k < 100; k++) {
      const t = tourney(n, "swiss", rounds);
      for (let i = 1; i <= rounds; i++) {
        const round = swissRound(t); if (!round) break;
        t.games.push(...round);
        for (const g of round) if (g.black) g.result = (["1-0", "0-1", "½-½"] as const)[Math.floor(r() * 3)];
      }
      for (const p of t.players) {
        const seq = colourSeq(t, p.id), w = [...seq].filter(c => c === "W").length;
        expect(seq, `event ${k} ${p.id}`).not.toMatch(/WWW|BBB/);
        expect(Math.abs(w - (seq.length - w)), `event ${k} ${p.id}`).toBeLessThanOrEqual(2);
      }
    }
  });
  it("a round-robin rest scores nothing; a Swiss bye scores a point and doesn't lower Buchholz", () => {
    const rr = tourney(5, "rr"); rr.games = roundRobin(rr.players);
    expect(scores(rr).get(rr.games.find(g => g.round === 1 && g.black === null)!.white)).toBe(0);
    const sw = tourney(5, "swiss", 1); sw.games.push(...swissRound(sw)!); play(sw, 1);
    const byeId = sw.games.find(g => g.black === null)!.white, st = standings(sw).find(x => x.id === byeId)!;
    expect(st.points).toBe(1); expect(st.buchholz).toBe(1);   // the virtual opponent has the player's own score
  });
});
