// Game Review maths (DECISIONS #73). Pure and DOM-free, tested in test/review.test.ts.
// A move is judged by how much it lowered the mover's chance of winning, using the Lichess formulas:
//   win% = 50 + 50 * (2 / (1 + e^(-0.00368208 * centipawns)) - 1)
//   move accuracy = 103.1668 * e^(-0.04354 * drop) - 3.1669, clamped to 0..100
// and the Lichess thresholds: a drop of 10+ points is an inaccuracy, 20+ a mistake, 30+ a blunder.
import { asNumber, type Score } from "../engine/uci";

export type Label = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

/** White's chance of winning, 0..100, from a score given for the side to move. */
export function whiteWin(score: Score, whiteToMove: boolean): number {
  const n = asNumber(score) * (whiteToMove ? 1 : -1);
  const cp = Math.max(-1000, Math.min(1000, n));         // a mate counts as a fully won (or lost) position
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function label(drop: number, playedBest: boolean): Label {
  if (drop >= 30) return "blunder";
  if (drop >= 20) return "mistake";
  if (drop >= 10) return "inaccuracy";
  return playedBest ? "best" : "good";
}

export const moveAccuracy = (drop: number) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669));

export interface Graded { san: string; uci: string; by: "w" | "b"; best: string; before: number; after: number; drop: number; label: Label }

/**
 * Grade every move. `evals[i]` is the engine's view of the position BEFORE move i (score for the side to
 * move, plus its best move); `evals[moves.length]` is the final position. Mate/stalemate finals pass a score.
 */
export function grade(moves: { san: string; uci: string }[], evals: { score: Score; best: string }[], firstToMove: "w" | "b" = "w"): Graded[] {
  return moves.map((m, i) => {
    const by: "w" | "b" = (i % 2 === 0) === (firstToMove === "w") ? "w" : "b";
    const wBefore = whiteWin(evals[i].score, by === "w"), wAfter = whiteWin(evals[i + 1].score, by !== "w");
    const before = by === "w" ? wBefore : 100 - wBefore, after = by === "w" ? wAfter : 100 - wAfter;
    const drop = Math.max(0, before - after);
    return { san: m.san, uci: m.uci, by, best: evals[i].best, before, after, drop, label: label(drop, m.uci === evals[i].best) };
  });
}

/** One side's accuracy for the game: like Lichess, half the plain average and half the harmonic mean, so a few
 *  bad moves count for more (a plain average flatters the losing side, whose already-lost position can't drop
 *  much further). Lichess also weights moves by how sharp the position was; that refinement is left out. */
export function accuracy(g: Graded[], side: "w" | "b"): number {
  const a = g.filter(m => m.by === side).map(m => Math.max(1, moveAccuracy(m.drop)));
  if (!a.length) return 100;
  const mean = a.reduce((s, x) => s + x, 0) / a.length, harmonic = a.length / a.reduce((s, x) => s + 1 / x, 0);
  return Math.round((mean + harmonic) / 2);
}

export const counts = (g: Graded[], side: "w" | "b") =>
  g.filter(m => m.by === side).reduce((c, m) => ({ ...c, [m.label]: c[m.label] + 1 }), { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 } as Record<Label, number>);
