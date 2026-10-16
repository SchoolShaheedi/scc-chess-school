// Insights (DECISIONS #113, look A): from the learner's own saved games (bot and friend games, this device), their
// results by OPENING (family names from the Lichess list), their accuracy by game PHASE (Stockfish's grading, as in
// Game Review, remembered per game), and their accuracy by THINKING TIME (recorded per move from 2026-10-16).
// Pure and DOM-free: tested in test/insights.test.ts. Every coach sentence comes from these numbers.
import { Chess } from "chess.js";
import { accuracy } from "../review/grade";
import type { SavedGame } from "../play/history";

export type Phase = "opening" | "middlegame" | "endgame";
/** One graded move of mine: how much it lowered my chance of winning, its phase, and how long I thought (ms). */
export interface MyMove { drop: number; phase: Phase; ms?: number }

/** The opening's family name: the longest line in the table that the game starts with. */
export function openingOf(sans: string[], names: Record<string, string>): string | null {
  for (let n = Math.min(12, sans.length); n > 0; n--) { const f = names[sans.slice(0, n).join(" ")]; if (f) return f; }
  return null;
}

const VAL: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
/** A position's phase: the first ten moves each are the opening; once each side has 13 or less in pieces (not
 *  counting pawns and kings: e.g. a rook and two minor pieces), it is the endgame; in between, the middlegame. */
export function phaseOf(fen: string, ply: number): Phase {
  if (ply < 20) return "opening";
  const side = { w: 0, b: 0 };
  for (const row of new Chess(fen).board()) for (const p of row) if (p && VAL[p.type]) side[p.color] += VAL[p.type];
  return side.w <= 13 && side.b <= 13 ? "endgame" : "middlegame";
}

export interface OpeningRow { name: string; games: number; won: number; drawn: number; lost: number; score: number }
export function byOpening(games: SavedGame[], names: Record<string, string>): OpeningRow[] {
  const rows = new Map<string, OpeningRow>();
  for (const g of games) {
    if (g.startFen) continue;                      // a game from a set position has no opening
    const c = new Chess(), sans: string[] = [];
    for (const u of g.uci.slice(0, 12)) { try { sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
    const name = openingOf(sans, names); if (!name) continue;
    const r = rows.get(name) ?? { name, games: 0, won: 0, drawn: 0, lost: 0, score: 0 };
    r.games++; r[g.result === "won" ? "won" : g.result === "lost" ? "lost" : "drawn"]++;
    rows.set(name, r);
  }
  return [...rows.values()].map(r => ({ ...r, score: Math.round(((r.won + r.drawn / 2) / r.games) * 100) }))
    .sort((a, b) => b.games - a.games || b.score - a.score).slice(0, 5);
}

/** Accuracy (the Game Review formula) of a set of my moves; null with too few to mean anything. */
const acc = (ms: MyMove[], min = 8) => ms.length >= min ? accuracy(ms.map(m => ({ by: "w" as const, drop: m.drop })), "w") : null;

export function byPhase(moves: MyMove[]): Record<Phase, number | null> {
  return { opening: acc(moves.filter(m => m.phase === "opening")), middlegame: acc(moves.filter(m => m.phase === "middlegame")),
    endgame: acc(moves.filter(m => m.phase === "endgame")) };
}

export type Band = "fast" | "mid" | "slow";
export const bandOf = (ms: number): Band => ms < 5000 ? "fast" : ms <= 20000 ? "mid" : "slow";
export function byTime(moves: MyMove[]): Record<Band, { accuracy: number | null; share: number }> | null {
  const timed = moves.filter(m => m.ms !== undefined && m.ms >= 0);
  if (timed.length < 10) return null;
  const out = {} as Record<Band, { accuracy: number | null; share: number }>;
  for (const b of ["fast", "mid", "slow"] as Band[]) {
    const ms = timed.filter(m => bandOf(m.ms!) === b);
    out[b] = { accuracy: acc(ms, 5), share: Math.round((ms.length / timed.length) * 100) };
  }
  return out;
}

/** The positions of a saved game, from its start: fens[i] is the position before ply i. Stops at an illegal move. */
export function replay(g: Pick<SavedGame, "uci" | "startFen">): { fens: string[]; sans: string[]; ucis: string[] } {
  const c = g.startFen ? new Chess(g.startFen) : new Chess(), fens = [c.fen()], sans: string[] = [], ucis: string[] = [];
  for (const u of g.uci) {
    try { sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
    ucis.push(u); fens.push(c.fen());
  }
  return { fens, sans, ucis };
}

/** My moves in one game, from Stockfish's drop for every ply (as Game Review grades them, remembered per game):
 *  each with its phase and, where it was recorded, my thinking time. */
export function myMoves(g: SavedGame, drops: number[]): MyMove[] {
  const { fens } = replay(g), first = new Chess(fens[0]).turn(), out: MyMove[] = [];
  for (let i = 0; i < Math.min(drops.length, fens.length - 1); i++) {
    const by = (i % 2 === 0) === (first === "w") ? "w" : "b";
    if (by !== g.me) continue;
    const ms = g.ms?.[i];
    out.push({ drop: drops[i], phase: phaseOf(fens[i], i), ...(typeof ms === "number" ? { ms } : {}) });
  }
  return out;
}

/** The coach's summary, as facts to put into words: the weakest phase (and the strongest, to compare), and the time
 *  band where accuracy drops (when it is at least 10 points below the learner's best band). */
export interface Summary { weak?: { phase: Phase; acc: number }; strong?: { phase: Phase; acc: number }; rushed?: { band: Band; acc: number } }
export function summarise(phases: Record<Phase, number | null>, time: ReturnType<typeof byTime>): Summary {
  const known = (Object.entries(phases) as [Phase, number | null][]).filter(([, a]) => a !== null) as [Phase, number][];
  const s: Summary = {};
  if (known.length >= 2) {
    const sorted = [...known].sort((a, b) => a[1] - b[1]);
    if (sorted[sorted.length - 1][1] - sorted[0][1] >= 8) {
      s.weak = { phase: sorted[0][0], acc: sorted[0][1] }; s.strong = { phase: sorted[sorted.length - 1][0], acc: sorted[sorted.length - 1][1] };
    }
  }
  if (time) {
    const bands = (Object.entries(time) as [Band, { accuracy: number | null }][]).filter(([, v]) => v.accuracy !== null) as [Band, { accuracy: number }][];
    if (bands.length >= 2) {
      const best = Math.max(...bands.map(([, v]) => v.accuracy)), worst = bands.sort((a, b) => a[1].accuracy - b[1].accuracy)[0];
      if (best - worst[1].accuracy >= 10) s.rushed = { band: worst[0], acc: worst[1].accuracy };
    }
  }
  return s;
}
