// Club tournaments (DECISIONS #90): pairings, results and standings, with no DOM, so every rule is tested
// (test/tourney.test.ts). Round-robin uses the Berger tables (FIDE C.05 Annex 1); Swiss is a simplified Dutch system:
// players sorted by score then seed, top half against bottom half within a score group, never the same pairing
// twice, colours balanced, and the bye to the lowest-ranked player who hasn't had one.

export type Result = "1-0" | "0-1" | "½-½";
export interface Player { id: string; name: string; seed: number; withdrawn?: boolean }
export interface Game { round: number; board: number; white: string; black: string | null; result: Result | null }   // black null = a bye
export interface Tournament {
  id: string; name: string; created: string; system: "swiss" | "rr"; rounds: number;
  players: Player[]; games: Game[];
}

/** Round-robin for up to 8 players; Swiss for more (the organiser may change it). */
export const suggestSystem = (n: number): "swiss" | "rr" => (n <= 8 ? "rr" : "swiss");
/** Rounds: everyone meets everyone in a round-robin; a Swiss needs about log2(n) + 1 to find a clear winner. */
export const suggestRounds = (n: number, system: "swiss" | "rr") =>
  system === "rr" ? (n % 2 ? n : n - 1) : Math.max(3, Math.min(9, Math.ceil(Math.log2(Math.max(2, n))) + 1));

// ---------- round-robin (Berger tables) ----------
/** All rounds of a round-robin for these players (in seed order), as FIDE's Berger tables (C.05 Annex 1): round 1 is
 *  1-n, 2-(n-1), …; each next round adds n/2 to every number but n (counting round 1..n-1), and the pair holding n swaps
 *  colours. For 6: round 2 is 6-4, 5-3, 1-2. Nobody gets the same colour three times running. An odd field adds a "rest"
 *  seat (the player meeting it sits out; in a round-robin a rest scores nothing). */
export function roundRobin(players: Player[]): Game[] {
  const ids: (string | null)[] = [...players].sort((a, b) => a.seed - b.seed).map(p => p.id);
  if (ids.length % 2) ids.push(null);
  const n = ids.length, half = n / 2, games: Game[] = [];
  let pairs: [number, number][] = Array.from({ length: half }, (_, i) => [i + 1, n - i] as [number, number]);   // round 1, by number
  const next = (x: number) => (x === n ? n : ((x - 1 + half) % (n - 1)) + 1);
  for (let r = 1; r <= n - 1; r++) {
    let board = 1;
    for (const [w, b] of pairs) {
      const W = ids[w - 1], B = ids[b - 1];
      if (W === null || B === null) games.push({ round: r, board: 0, white: (W ?? B)!, black: null, result: null });
      else games.push({ round: r, board: board++, white: W, black: B, result: null });
    }
    pairs = pairs.map(([w, b]) => (w === n || b === n ? [next(b), next(w)] : [next(w), next(b)]) as [number, number]);
  }
  return games;
}

// ---------- scores ----------
/** Points per player so far (a win or a bye 1, a draw ½); unplayed games count nothing yet. */
export function scores(t: Tournament, uptoRound = Infinity): Map<string, number> {
  const s = new Map(t.players.map(p => [p.id, 0]));
  for (const g of t.games) {
    if (g.round > uptoRound) continue;
    // a Swiss pairing-bye scores a point; a round-robin rest (the odd player out) scores nothing
    if (g.black === null) { if (t.system === "swiss") s.set(g.white, (s.get(g.white) ?? 0) + 1); continue; }
    if (!g.result) continue;
    const [w, b] = g.result === "1-0" ? [1, 0] : g.result === "0-1" ? [0, 1] : [0.5, 0.5];
    s.set(g.white, (s.get(g.white) ?? 0) + w); s.set(g.black, (s.get(g.black) ?? 0) + b);
  }
  return s;
}

// ---------- Swiss ----------
const met = (t: Tournament, a: string, b: string) => t.games.some(g => (g.white === a && g.black === b) || (g.white === b && g.black === a));
/** A player's colours so far, in round order ("w"/"b"; byes and rests left out). */
const colours = (t: Tournament, id: string): ("w" | "b")[] =>
  t.games.filter(g => g.black !== null && (g.white === id || g.black === id)).sort((a, b) => a.round - b.round).map(g => (g.white === id ? "w" : "b"));
const hadBye = (t: Tournament, id: string) => t.games.some(g => g.black === null && g.white === id);
/** FIDE's absolute colour rules (C.04): never the same colour three times running, never more than two extra of one. */
function colourOk(hist: ("w" | "b")[], c: "w" | "b"): boolean {
  const next = [...hist, c], w = next.filter(x => x === "w").length;
  return !(next.length >= 3 && next.slice(-3).every(x => x === c)) && Math.abs(w - (next.length - w)) <= 2;
}
/** Who should have White: the one with fewer Whites; else the one whose colours first differ, looking back from the
 *  latest round, gets the colour they did NOT have then; if the histories are identical, the higher-ranked player (a)
 *  gets the colour they are due (the opposite of their last), or White in round 1. */
function aIsWhite(ha: ("w" | "b")[], hb: ("w" | "b")[]): boolean {
  const bal = (h: ("w" | "b")[]) => h.filter(x => x === "w").length - h.filter(x => x === "b").length;
  if (bal(ha) !== bal(hb)) return bal(ha) < bal(hb);
  for (let i = 1; i <= Math.min(ha.length, hb.length); i++) {
    const ca = ha[ha.length - i], cb = hb[hb.length - i];
    if (ca !== cb) return ca === "b";
  }
  return ha.length ? ha[ha.length - 1] === "b" : true;
}

/** The next Swiss round. Returns null if every remaining pairing would be a rematch (then the event should end). */
export function swissRound(t: Tournament): Game[] | null {
  const round = Math.max(0, ...t.games.map(g => g.round)) + 1;
  const sc = scores(t);
  const active = t.players.filter(p => !p.withdrawn)
    .sort((a, b) => (sc.get(b.id)! - sc.get(a.id)!) || a.seed - b.seed);
  let pool = active.map(p => p.id), bye: string | null = null;
  if (pool.length % 2) {
    // the bye goes to the lowest-ranked player who hasn't had one
    bye = [...pool].reverse().find(id => !hadBye(t, id)) ?? pool[pool.length - 1];
    pool = pool.filter(id => id !== bye);
  }
  // within each score group, top half meets bottom half; groups that don't divide evenly float the last player down
  const order: string[] = [];
  const groups = new Map<number, string[]>();
  for (const id of pool) { const s = sc.get(id)!; groups.set(s, [...(groups.get(s) ?? []), id]); }
  for (const s of [...groups.keys()].sort((a, b) => b - a)) {
    const g = groups.get(s)!, half = Math.floor(g.length / 2);
    const top = g.slice(0, half), bottom = g.slice(half);
    for (let i = 0; i < top.length; i++) order.push(top[i], bottom[i]);
    if (bottom.length > top.length) order.push(bottom[bottom.length - 1]);
  }
  const hist = new Map(pool.map(id => [id, colours(t, id)]));
  /** The colours for a pair: the preferred way round if it keeps both within the rules, else the other way, else null. */
  const colourFor = (a: string, b: string, strict: boolean): [string, string] | null => {
    const ha = hist.get(a)!, hb = hist.get(b)!, pref = aIsWhite(ha, hb);
    const ok = (w: string, bl: string) => colourOk(hist.get(w)!, "w") && colourOk(hist.get(bl)!, "b");
    const first: [string, string] = pref ? [a, b] : [b, a], second: [string, string] = pref ? [b, a] : [a, b];
    if (!strict || ok(...first)) return first;
    return ok(...second) ? second : null;
  };
  // pair in that order with no rematches, keeping the colour rules if at all possible; backtrack when stuck
  const pairs: [string, string][] = [];
  const used = new Set<string>();
  const solve = (strict: boolean): boolean => {
    const a = order.find(id => !used.has(id));
    if (!a) return true;
    used.add(a);
    for (const b of order) {
      if (used.has(b) || met(t, a, b)) continue;
      const wb = colourFor(a, b, strict); if (!wb) continue;
      used.add(b); pairs.push(wb);
      if (solve(strict)) return true;
      pairs.pop(); used.delete(b);
    }
    used.delete(a);
    return false;
  };
  if (!solve(true)) { pairs.length = 0; used.clear(); if (!solve(false)) return null; }   // relax colours only if no pairing keeps them
  const games: Game[] = pairs.map(([w, b], i) => ({ round, board: i + 1, white: w, black: b, result: null }));
  if (bye) games.push({ round, board: 0, white: bye, black: null, result: null });
  return games;
}

// ---------- standings ----------
export interface Standing { id: string; name: string; points: number; buchholz: number; sb: number; wins: number; place: number }

/** Standings with tie-breaks: points, then (Swiss) Buchholz, Sonneborn-Berger, wins; (round-robin) Sonneborn-Berger,
 *  wins. When exactly two players are still level, the game between them decides (with three or more it could go round
 *  in a circle, so it is not used). Equal on everything = the same place.
 *  A Swiss bye counts in Buchholz as a game against an opponent with the player's own score (FIDE's "virtual
 *  opponent"), so having the bye doesn't lower a player's Buchholz. */
export function standings(t: Tournament): Standing[] {
  const sc = scores(t);
  const opps = new Map<string, { opp: string; got: number }[]>(t.players.map(p => [p.id, []]));
  const wins = new Map(t.players.map(p => [p.id, 0]));
  const byes = new Map(t.players.map(p => [p.id, 0]));
  for (const g of t.games) {
    if (g.black === null) { if (t.system === "swiss") byes.set(g.white, byes.get(g.white)! + 1); continue; }
    if (!g.result) continue;
    const w = g.result === "1-0" ? 1 : g.result === "0-1" ? 0 : 0.5;
    opps.get(g.white)!.push({ opp: g.black, got: w }); opps.get(g.black)!.push({ opp: g.white, got: 1 - w });
    if (w === 1) wins.set(g.white, wins.get(g.white)! + 1); if (w === 0) wins.set(g.black, wins.get(g.black)! + 1);
  }
  const rows = t.players.map(p => ({
    id: p.id, name: p.name, points: sc.get(p.id)!,
    buchholz: opps.get(p.id)!.reduce((a, o) => a + sc.get(o.opp)!, 0) + byes.get(p.id)! * sc.get(p.id)!,
    sb: opps.get(p.id)!.reduce((a, o) => a + o.got * sc.get(o.opp)!, 0),
    wins: wins.get(p.id)!, place: 0,
  }));
  type Row = (typeof rows)[number];
  const keys = (r: Row) => (t.system === "swiss" ? [r.points, r.buchholz, r.sb, r.wins] : [r.points, r.sb, r.wins]);
  const same = (a: Row, b: Row) => keys(a).every((k, i) => k === keys(b)[i]);
  const byKeys = (a: Row, b: Row) => { const ka = keys(a), kb = keys(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i]; return 0; };
  rows.sort(byKeys);
  // the game between them, only for a tie of exactly two
  const direct = (a: string, b: string) => {
    const g = opps.get(a)!.filter(o => o.opp === b);
    return g.length ? g.reduce((s, o) => s + o.got, 0) - g.length / 2 : 0;   // > 0: a did better against b
  };
  for (let i = 0; i < rows.length; i++) {
    let j = i; while (j + 1 < rows.length && same(rows[i], rows[j + 1])) j++;
    if (j === i + 1 && direct(rows[i].id, rows[j].id) < 0) [rows[i], rows[j]] = [rows[j], rows[i]];
    for (let k = i; k <= j; k++) rows[k].place = j === i + 1 && direct(rows[i].id, rows[j].id) !== 0 ? i + 1 + (k - i) : i + 1;
    i = j;
  }
  return rows;
}

/** Whether every game of the latest round has a result (byes need none). */
export const roundDone = (t: Tournament, round: number) => t.games.filter(g => g.round === round && g.black !== null).every(g => g.result);
export const currentRound = (t: Tournament) => Math.max(0, ...t.games.map(g => g.round));
/** The round being played: a round-robin has every round made at the start, so it is the first one with results
 *  missing (or the last, once all are in); a Swiss makes each round as it goes, so it is the latest. */
export function playingRound(t: Tournament): number {
  const last = currentRound(t);
  if (t.system === "swiss") return last;
  for (let r = 1; r <= last; r++) if (!roundDone(t, r)) return r;
  return last;
}
