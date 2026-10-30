// "What are they threatening?" (analysis board): give the move to the other side (a null move) and ask what they would
// play. Pure and DOM-free: the engine call lives in screen.ts; tested in test/variations.test.ts.
import { Chess } from "chess.js";
import type { Score } from "../engine/uci";

export type NullMove = { fen: string } | { skip: "check" | "illegal" };

/** The same position with the other side to move. Skipped when the side to move is in check (the other side could just
 *  take the king, so the question has no answer) or the result is not a legal position. */
export function nullMove(fen: string): NullMove {
  let g: Chess;
  try { g = new Chess(fen); } catch { return { skip: "illegal" }; }
  if (g.inCheck()) return { skip: "check" };
  if (g.isGameOver()) return { skip: "illegal" };
  const f = fen.trim().split(/\s+/);
  f[1] = f[1] === "w" ? "b" : "w";
  f[3] = "-";   // an en-passant square belongs to the side that just moved
  const flipped = f.join(" ");
  try { const h = new Chess(flipped); if (h.inCheck() || h.isGameOver()) return { skip: "illegal" }; } catch { return { skip: "illegal" }; }
  return { fen: flipped };
}

export const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export type Threat =
  | { kind: "mate"; san: string; n: number }
  | { kind: "capture"; san: string; piece: string; value: number }   // wins material: the piece taken (p,n,b,r,q)
  | { kind: "promote"; san: string }
  | { kind: "advantage"; san: string }                                 // a quiet move the engine rates well
  | { kind: "none"; san: string };                                     // nothing much

/** What the opponent's best move in the null-move position `fen` threatens. `score` is from the view of the side to
 *  move there (the opponent). Material change is read from the move itself: the piece it takes, or a promotion. */
export function describeThreat(fen: string, best: string, score: Score): Threat {
  const g = new Chess(fen);
  const m = g.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
  const san = m.san;
  if (score.mate !== undefined && score.mate > 0) return { kind: "mate", san, n: score.mate };
  if (m.promotion) return { kind: "promote", san };
  const cp = score.cp ?? 0;
  if (m.captured && VALUE[m.captured] >= 1 && cp >= 50) return { kind: "capture", san, piece: m.captured, value: VALUE[m.captured] };
  if (cp >= 150) return { kind: "advantage", san };
  return { kind: "none", san };
}

/** A line of moves as SAN with move numbers ("1.e4 e5 2.Nf3"), at most `max` moves; stops at the first move that is not legal. */
export function pvSan(fen: string, pv: string[], max = 6): string {
  const g = new Chess(fen), out: string[] = [];
  for (const u of pv.slice(0, max)) {
    const n = g.moveNumber(), white = g.turn() === "w";
    try {
      const san = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
      out.push(white ? `${n}.${san}` : out.length ? san : `${n}...${san}`);
    } catch { break; }
  }
  return out.join(" ");
}

/** A score from the side to move's view turned into White's view (as the eval bar shows it). */
export const whiteScore = (s: Score, whiteToMove: boolean): Score =>
  whiteToMove ? s : { cp: s.cp === undefined ? undefined : -s.cp, mate: s.mate === undefined ? undefined : -s.mate };
