// The coach in bot games (DECISIONS #94, trial option A): a bubble UNDER the board, never over it, that speaks at
// key moments only: the start, a good move (a check, or taking a piece worth 3 or more), a warning when your move
// leaves a piece hanging (only where take-backs are on, and never in a level test), and the end. Young and Junior
// looks only; the 16+ look plays without a coach.
import { Chess, type Square } from "chess.js";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Pieces of `side` worth 3 or more that the other side can take for free (not defended, or attacked by a
 *  cheaper piece), most valuable first. A quick look, not a search: pins and x-rays are not counted. */
export function hanging(fen: string, side: "w" | "b"): { sq: Square; type: string }[] {
  const g = new Chess(fen), them = side === "w" ? "b" : "w";
  const out: { sq: Square; type: string }[] = [];
  for (const row of g.board()) for (const p of row) {
    if (!p || p.color !== side || VALUE[p.type] < 3) continue;
    const by = g.attackers(p.square, them);
    if (!by.length) continue;
    const cheapest = Math.min(...by.map(s => VALUE[g.get(s)!.type] || 99));   // a king takes only an undefended piece
    const defended = g.attackers(p.square, side).length > 0;
    if (!defended || cheapest < VALUE[p.type]) out.push({ sq: p.square, type: p.type });
  }
  return out.sort((a, b) => VALUE[b.type] - VALUE[a.type]);
}

/** Was this move worth a word of praise? A check, or taking a piece worth 3 or more. */
export const goodMove = (m: { san: string; captured?: string }) =>
  m.san.includes("+") || (!!m.captured && VALUE[m.captured] >= 3);
