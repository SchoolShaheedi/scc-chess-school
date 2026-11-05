// What a checkmate position is made of, computed (never written by hand): who gives check, which squares the king
// could run to, and what holds each one shut. Pure and DOM-free: the "why it's mate" text, the classifier
// (classify.ts) and the tests all stand on it. The squares are found by moving the king there in a copy of the
// board, so a rook's line "through" the king is counted, and a guarded piece is told from an unguarded one.
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

export interface Piece { sq: Square; type: PieceSymbol; color: Color }
/** One square next to the mated king (squares off the board are not listed). */
export interface Flight {
  sq: Square;
  /** The mated side's own piece standing there (the king cannot step onto it), if any. */
  own: Piece | null;
  /** The mating side's piece standing there (the king would have to take it), if any. */
  theirs: Piece | null;
  /** Who stops the king using this square: for an empty square the pieces that attack it; for a taken piece the pieces that guard it. Empty for an own piece. */
  guards: Piece[];
}
export interface MateFacts {
  fen: string; mated: Color; by: Color; king: Square;
  checkers: Piece[];
  flights: Flight[];
  /** Every piece on the board. */
  pieces: Piece[];
  /** How many of the eight squares round the king are off the board. */
  edges: number;
}

export const FILES = "abcdefgh";
export const sqOf = (f: number, r: number) => (FILES[f] + (r + 1)) as Square;
export const fileOf = (s: string) => FILES.indexOf(s[0]);
export const rankOf = (s: string) => +s[1] - 1;
export const other = (c: Color): Color => (c === "w" ? "b" : "w");

export function piecesOf(g: Chess): Piece[] {
  const out: Piece[] = [];
  for (const row of g.board()) for (const p of row) if (p) out.push({ sq: p.square, type: p.type, color: p.color });
  return out;
}

/** The squares next to `sq` that are on the board. */
export function neighbours(sq: string): Square[] {
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = fileOf(sq) + df, r = rankOf(sq) + dr;
    if (f >= 0 && f < 8 && r >= 0 && r < 8) out.push(sqOf(f, r));
  }
  return out;
}

/** The pieces of `by` that attack `to` once the king stands on `to` (any piece there is taken first). */
function guardsAfterKingMoves(all: Piece[], king: Piece, to: Square, by: Color): Piece[] {
  const h = new Chess();
  h.clear();
  for (const p of all) if (p.sq !== king.sq && p.sq !== to) h.put({ type: p.type, color: p.color }, p.sq);
  h.put({ type: "k", color: king.color }, to);
  return h.attackers(to, by).map(s => { const p = h.get(s)!; return { sq: s, type: p.type, color: p.color }; });
}

/** The facts of a checkmate position, or null if `fen` is not checkmate. */
export function mateFacts(fen: string): MateFacts | null {
  const g = new Chess(fen);
  if (!g.isCheckmate()) return null;
  const mated = g.turn(), by = other(mated);
  const pieces = piecesOf(g);
  const king = pieces.find(p => p.type === "k" && p.color === mated)!;
  const checkers = g.attackers(king.sq, by).map(s => ({ sq: s, type: g.get(s)!.type, color: by }));
  const near = neighbours(king.sq);
  const flights: Flight[] = near.map(sq => {
    const on = pieces.find(p => p.sq === sq) ?? null;
    const own = on && on.color === mated ? on : null;
    const theirs = on && on.color === by ? on : null;
    return { sq, own, theirs, guards: own ? [] : guardsAfterKingMoves(pieces, king, sq, by) };
  });
  return { fen, mated, by, king: king.sq, checkers, flights, pieces, edges: 8 - near.length };
}
