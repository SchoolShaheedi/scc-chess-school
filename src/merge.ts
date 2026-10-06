// Merging progress from two places (this device, and the signed-in account) without losing any.
// Pure, so it is tested on its own (test/merge.test.ts).
import type { State } from "./store";
import { mergeCard } from "./openings/srs";

/** What is saved to an account: progress only. Look, language, pieces and coach stay per device. */
export type Saved = Pick<State, "xp" | "streak" | "lessons"> & { tests?: State["tests"]; placed?: number; daily?: State["daily"]; rushBest?: number; rep?: State["rep"]; active?: string[]; goal?: State["goal"]; stats?: State["stats"]; rating?: State["rating"]; missed?: State["missed"];
  prating?: State["prating"]; hist?: State["hist"]; themeStats?: State["themeStats"]; results?: State["results"] };

export const savable = (s: Readonly<State>): Saved => ({ xp: s.xp, streak: s.streak, lessons: s.lessons, tests: s.tests, placed: s.placed, daily: s.daily, rushBest: s.rushBest, rep: s.rep, active: s.active, goal: s.goal, stats: s.stats, rating: s.rating, missed: s.missed,
  prating: s.prating, hist: s.hist, themeStats: s.themeStats, results: s.results });

const NO_GOAL = { date: "", n: 0 }, NO_STATS: State["stats"] = { botWins: {}, games: 0, dailies: 0, reviews: 0 };
function mergeGoal(a: State["goal"] = NO_GOAL, b: State["goal"] = NO_GOAL): State["goal"] {
  return a.date === b.date ? { date: a.date, n: Math.max(a.n, b.n) } : a.date > b.date ? a : b;
}
/** Totals: the higher count wins (two devices' play is not double-counted, at the cost of undercounting a little). */
function mergeStats(a: State["stats"] = NO_STATS, b: State["stats"] = NO_STATS): State["stats"] {
  const botWins = { ...a.botWins };
  for (const [k, v] of Object.entries(b.botWins)) botWins[k] = Math.max(botWins[k] ?? 0, v);
  return { botWins, games: Math.max(a.games, b.games), dailies: Math.max(a.dailies, b.dailies), reviews: Math.max(a.reviews, b.reviews) };
}

function mergeCards(a: State["missed"], b: State["missed"]): State["missed"] {
  const out = { ...a };
  for (const [k, c] of Object.entries(b)) out[k] = out[k] ? mergeCard(out[k], c) : c;
  return out;
}

export function merge(a: Saved, b: Saved): Saved {
  const lessons: Saved["lessons"] = { ...a.lessons };
  for (const [id, r] of Object.entries(b.lessons)) {
    const mine = lessons[id];
    lessons[id] = !mine ? r : {
      stars: (Math.max(mine.stars, r.stars) as 1 | 2 | 3),
      completedAt: mine.completedAt > r.completedAt ? mine.completedAt : r.completedAt,
    };
  }
  // the streak that was touched most recently is the true one
  const streak = a.streak.last >= b.streak.last ? a.streak : b.streak;
  const tests: NonNullable<Saved["tests"]> = { ...(a.tests ?? {}) };
  for (const [n, r] of Object.entries(b.tests ?? {})) {
    const mine = tests[n];
    tests[n] = !mine ? r : { best: Math.max(mine.best, r.best), passed: mine.passed || r.passed };
  }
  // the later day's puzzle wins; on the same day, solved anywhere means solved
  const da = a.daily ?? { date: "", solved: false }, db = b.daily ?? { date: "", solved: false };
  const daily = da.date === db.date ? { date: da.date, solved: da.solved || db.solved } : da.date > db.date ? da : db;
  // openings: a slot chosen on either device is kept (this device first); each line's card that is further along wins
  const ra = a.rep ?? { cards: {} }, rb = b.rep ?? { cards: {} };
  const cards = { ...ra.cards };
  for (const [k, c] of Object.entries(rb.cards)) cards[k] = cards[k] ? mergeCard(cards[k], c) : c;
  const rep = { white: ra.white ?? rb.white, e4: ra.e4 ?? rb.e4, d4: ra.d4 ?? rb.d4, cards };
  return { xp: Math.max(a.xp, b.xp), streak, lessons, tests, placed: Math.max(a.placed ?? 0, b.placed ?? 0), daily, rushBest: Math.max(a.rushBest ?? 0, b.rushBest ?? 0), rep,
    active: [...new Set([...(a.active ?? []), ...(b.active ?? [])])].sort().slice(-120),
    goal: mergeGoal(a.goal, b.goal), stats: mergeStats(a.stats, b.stats),
    // the rating that has seen more results is the better estimate; banked puzzles: the card further along wins
    rating: (a.rating?.n ?? 0) >= (b.rating?.n ?? 0) ? a.rating ?? { r: 400, n: 0 } : b.rating!,
    missed: mergeCards(a.missed ?? {}, b.missed ?? {}),
    // Phase 2 (DECISIONS #85): the puzzle rating like the rating; graphs: each day's point from the side whose rating
    // has seen more results; counts: the higher count wins (two devices are not double-counted, as with the totals)
    prating: (a.prating?.n ?? 0) >= (b.prating?.n ?? 0) ? a.prating : b.prating,
    hist: mergeHist(a, b), themeStats: maxCounts(a.themeStats, b.themeStats), results: maxCounts(a.results, b.results) };
}
function mergeHist(a: Saved, b: Saved): State["hist"] {
  if (!a.hist && !b.hist) return undefined;
  const pick = (x: [string, number][] = [], y: [string, number][] = [], xFirst: boolean) => {
    const m = new Map(xFirst ? y : x); for (const [d, r] of xFirst ? x : y) m.set(d, r);
    return [...m.entries()].sort((p, q) => p[0].localeCompare(q[0])).slice(-365);
  };
  return { play: pick(a.hist?.play, b.hist?.play, (a.rating?.n ?? 0) >= (b.rating?.n ?? 0)),
    puz: pick(a.hist?.puz, b.hist?.puz, (a.prating?.n ?? 0) >= (b.prating?.n ?? 0)) };
}
function maxCounts<T extends number[]>(a: Record<string, T> = {}, b: Record<string, T> = {}): Record<string, T> | undefined {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ? out[k].map((n, i) => Math.max(n, v[i])) : v) as T;
  return Object.keys(out).length ? out : undefined;
}

// ---------- child profiles (DECISIONS #80) ----------
/** One child: an animal avatar, a colour and an age band. No name, no age. */
export interface Profile { id: string; avatar: string; colour: string; look: State["look"] }
/** Everything saved to the account: every child's progress, and which child was using the app. */
export interface Family { v: 2; active: string; profiles: Profile[]; saved: Record<string, Saved> }

export const emptySaved = (): Saved => ({ xp: 0, streak: { days: 0, last: "" }, lessons: {} });

/** A saved record with every field present (older records and new children lack some). */
export function fillSaved(m: Saved) {
  return { ...m, tests: m.tests ?? {}, placed: m.placed ?? 0, daily: m.daily ?? { date: "", solved: false }, rushBest: m.rushBest ?? 0,
    rep: m.rep ?? { cards: {} }, active: m.active ?? [], goal: m.goal ?? { date: "", n: 0 },
    stats: m.stats ?? { botWins: {}, games: 0, dailies: 0, reviews: 0 }, rating: m.rating ?? { r: 400, n: 0 }, missed: m.missed ?? {} };
}

/** An account row from before profiles was one child's progress: it becomes child "p1". */
export function asFamily(data: unknown): Family | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<Family> & Partial<Saved>;
  if (d.v === 2 && Array.isArray(d.profiles) && d.saved) return d as Family;
  return { v: 2, active: "p1", profiles: [{ id: "p1", avatar: "cat", colour: "#2F6B4F", look: "junior" }], saved: { p1: d as Saved } };
}

/** Two families merged: children are matched by id (this device's avatar, colour and look win), and each
 *  child's progress is merged as before. The device keeps the child it was using. */
export function mergeFamily(local: Family, remote: Family): Family {
  const profiles = [...local.profiles];
  for (const p of remote.profiles) if (!profiles.some(q => q.id === p.id)) profiles.push(p);
  const saved: Record<string, Saved> = {};
  for (const p of profiles) {
    const a = local.saved[p.id], b = remote.saved[p.id];
    saved[p.id] = a && b ? merge(a, b) : (a ?? b ?? emptySaved());
  }
  return { v: 2, active: profiles.some(p => p.id === local.active) ? local.active : profiles[0].id, profiles: profiles.slice(0, 6), saved };
}