// Tactic detection on a real position, by the rules and geometry alone (no engine): forks, pins, free pieces,
// mate in one and in two. Pure and DOM-free (test/tactics.test.ts). Used by the per-move coach notes in Game
// Review and by the found/missed tactics in Insights, so both say the same thing about the same position.
// Built on the Level 4 judging in rules.ts: a fork or a pin only counts when the piece that made it is not lost.
import { Chess } from "chess.js";
import { forkTargets, judge, lineHit, uciOf, VALUE } from "./rules";

type Sq = Parameters<Chess["get"]>[0];
export interface Target { type: string; sq: string }
const mv = (g: Chess, uci: string) => g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

/** A fork by this move: the moved piece attacks two or more worthwhile targets, at least one a piece worth 3 or
 *  more (or the king), and is not simply lost. Null when it is not one. */
export function forkOf(fen: string, uci: string): Target[] | null {
  if (!judge(fen, uci, "fork").ok) return null;
  const g = new Chess(fen), m = mv(g, uci), hits = forkTargets(g, m.to).map(sq => ({ type: g.get(sq as Sq)!.type, sq }));
  return hits.some(h => VALUE[h.type] >= 3) ? hits : null;
}

/** A pin by this move: a smaller enemy piece (not the king) in front of a bigger one, on the moved piece's line.
 *  Stricter than the Level 4 exercise: the piece behind must be the king or worth MORE than the pinning piece, so
 *  a bishop "pinning" a pawn to a knight (an even trade at best) is not called a pin. */
export function pinOf(fen: string, uci: string): { pinned: Target; behind: Target } | null {
  if (!judge(fen, uci, "pin").ok) return null;
  const g = new Chess(fen), m = mv(g, uci), h = lineHit(g, m.to, "pin");
  if (!h || (h.back.type !== "k" && VALUE[h.back.type] <= VALUE[g.get(m.to as Sq)!.type])) return null;
  return { pinned: { type: h.front.type, sq: h.front.sq }, behind: { type: h.back.type, sq: h.back.sq } };
}

/** The piece this move takes, when nothing guards it and it is worth 3 or more: a free piece won. */
export function freePieceTaken(fen: string, uci: string): string | null {
  const g = new Chess(fen), m = mv(g, uci);
  return m.captured && VALUE[m.captured] >= 3 && judge(fen, uci, "win-free").ok ? m.captured : null;
}

/** Every legal move of the side to move that satisfies `pred`. */
const movesWhere = (fen: string, pred: (uci: string) => boolean): string[] =>
  new Chess(fen).moves({ verbose: true }).map(uciOf).filter(pred);

export const mateIn1Moves = (fen: string): string[] => movesWhere(fen, u => { const g = new Chess(fen); mv(g, u); return g.isCheckmate(); });
export const forksAvailable = (fen: string): string[] => movesWhere(fen, u => !!forkOf(fen, u));
export const pinsAvailable = (fen: string): string[] => movesWhere(fen, u => !!pinOf(fen, u));
export const freePiecesAvailable = (fen: string): string[] => movesWhere(fen, u => !!freePieceTaken(fen, u));

/** After my move (position `fen`, opponent to move): does every reply allow me mate in one? (and they have a reply) */
export function forcedMate(fen: string): boolean {
  const replies = new Chess(fen).moves({ verbose: true });
  if (!replies.length) return false;
  return replies.every(r => { const h = new Chess(fen); h.move(r); return mateIn1Moves(h.fen()).length > 0; });
}

/** A forced mate in two for the side to move: a move after which EVERY reply allows mate in one. Returns the
 *  first such move (one that is not itself mate), or null. Called only where it matters: it can search about
 *  30 x 30 x 30 moves. */
export function mateIn2Move(fen: string): string | null {
  for (const u of movesWhere(fen, () => true)) {
    const g = new Chess(fen); mv(g, u);
    if (g.isGameOver()) continue;
    if (forcedMate(g.fen())) return u;
  }
  return null;
}

/** The SAN of the opponent's mate in one in `fen` (the opponent to move), or null: what my move allowed. */
export function allowedMate(fen: string): string | null {
  const g = new Chess(fen);
  for (const m of g.moves({ verbose: true })) { const h = new Chess(fen); h.move(m); if (h.isCheckmate()) return m.san; }
  return null;
}

/** Would the side that just moved have mate in one if it moved again (a null move)? Never while it gives check. */
export function threatensMate(fenAfter: string): boolean {
  if (new Chess(fenAfter).inCheck()) return false;
  const parts = fenAfter.split(" "); parts[1] = parts[1] === "w" ? "b" : "w"; parts[3] = "-";
  try { return mateIn1Moves(parts.join(" ")).length > 0; } catch { return false; }
}
