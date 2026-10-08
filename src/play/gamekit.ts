// What every real game shares (DECISIONS #84, "like chess.com"): the bot game, the friend game and the analysis
// board all read a move the same way, promote the same way and count captured material the same way.
import { Chess, type Move, type Square as CjSquare } from "chess.js";
import { pickPromotion } from "../lesson/exercises";
import { store } from "../store";
import type { Square } from "../chess/types";

/** The legal moves meant by a drag or tap from→to. Dropping the king on its own rook castles, as on chess.com. */
export function movesFor(g: Chess, from: Square, to: Square): Move[] {
  const all = g.moves({ square: from as CjSquare, verbose: true });
  const direct = all.filter(m => m.to === to);
  if (direct.length) return direct;
  const p = g.get(from as CjSquare), q = g.get(to as CjSquare);
  // only the rook in its own corner (h1/a1, h8/a8): a king dropped on a rook elsewhere means nothing (full check 2026-10-08)
  const rank = p?.color === "w" ? "1" : "8";
  if (p?.type === "k" && q?.type === "r" && q.color === p.color && to[1] === rank)
    return all.filter(m => (to[0] === "h" ? m.isKingsideCastle() : to[0] === "a" ? m.isQueensideCastle() : false));
  return [];
}

type Ctx = Parameters<typeof pickPromotion>[0];
/** Auto-queen when the learner has switched it on; otherwise ask, as before. */
export const promotion = (ctx: Ctx, colour: "w" | "b"): Promise<string> =>
  store.get().autoQueen ? Promise.resolve("q") : pickPromotion(ctx, colour);

/** Premoves are for Junior and Adult (DECISIONS #84): a young child would make moves by accident. */
export const premovesOn = () => store.get().premove ?? store.get().look !== "young";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ["p", "n", "b", "r", "q"];
/** Pieces each side has taken (by colour of the capturer) and the material lead, for the player bars. */
export function captured(g: Chess): { w: string[]; b: string[]; lead: number } {
  const taken = { w: [] as string[], b: [] as string[] };
  for (const m of g.history({ verbose: true })) if (m.captured) taken[m.color].push(m.captured);
  // a promotion changes material without a capture: count from the board, as chess.com does
  let lead = 0;
  for (const row of g.board()) for (const p of row) if (p && p.type !== "k") lead += (p.color === "w" ? 1 : -1) * VALUE[p.type];
  const sort = (a: string[]) => a.sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
  return { w: sort(taken.w), b: sort(taken.b), lead };
}

/** The position after the first n moves of a game (for stepping back through it). */
export function positionAt(g: Chess, n: number): { fen: string; last?: [Square, Square] } {
  const h = g.history({ verbose: true }), start = h[0]?.before ?? g.fen();
  if (n >= h.length) return { fen: g.fen(), last: h.length ? [h.at(-1)!.from, h.at(-1)!.to] : undefined };
  if (n <= 0) return { fen: start };
  return { fen: h[n - 1].after, last: [h[n - 1].from, h[n - 1].to] };
}

/** Squares a piece could go to if it were its side's turn: the dots shown while making a premove. */
export function premoveTargets(fen: string, from: Square): Square[] {
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w"; parts[3] = "-";
  try { return new Chess(parts.join(" ")).moves({ square: from as CjSquare, verbose: true }).map(m => m.to); }
  catch { return []; }   // the swapped position can be illegal (the other king in check): no dots, the drop still works
}

/** Out of time (FIDE Article 6.9): the side whose flag fell LOSES, unless the opponent could not checkmate by any
 *  series of legal moves; then it is a draw. That is: the opponent has only a king; or only a king and one knight or
 *  one bishop while the flagged side has only a king; or every piece left besides the kings is a bishop on squares of
 *  one colour (a dead position). Shared by bot games and friend games; the online server function has the same rule. */
export function flagOutcome(g: Chess, flagged: "w" | "b"): "loss" | "draw" {
  const pieces = g.board().flat().filter((p): p is NonNullable<typeof p> => !!p && p.type !== "k");
  const mine = pieces.filter(p => p.color === flagged), theirs = pieces.filter(p => p.color !== flagged);
  if (!theirs.length) return "draw";
  if (!mine.length && theirs.length === 1 && (theirs[0].type === "n" || theirs[0].type === "b")) return "draw";
  if (pieces.every(p => p.type === "b")) {
    const shades = new Set(g.board().flatMap((row, r) => row.map((p, f) => (p && p.type === "b" ? (r + f) % 2 : -1))).filter(x => x >= 0));
    if (shades.size === 1) return "draw";
  }
  return "loss";
}
