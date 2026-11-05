// A build-up line turned into plies (pure, DOM-free): each ply knows whose it is, its position before and after, and
// its note. The learner's plies carry a computed note (why.ts moveNote) unless the content wrote one by hand.
import { Chess, type Color } from "chess.js";
import type { Text } from "../lesson/types";
import type { Mate } from "../content/mates";
import { moveNote } from "./why";

export interface Ply {
  uci: string; san: string; from: string; to: string;
  before: string; after: string;
  /** The learner's own move (the side that gives the mate). */
  mine: boolean;
  /** Mine: a note on the move. The other side's: undefined (the screens say "they play …"). */
  note?: Text;
}

/** The side that gives the checkmate at the end of a line. */
export function learnerOf(fen: string, moves: string[]): Color {
  const g = new Chess(fen);
  for (const m of moves) g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
  return g.turn() === "w" ? "b" : "w";
}

export function plies(m: Pick<Mate, "line">): Ply[] {
  const { fen, moves, notes } = m.line;
  const me = learnerOf(fen, moves);
  const g = new Chess(fen);
  return moves.map((uci, i) => {
    const before = g.fen();
    const mine = g.turn() === me;
    const note = mine ? (notes?.[i] ?? moveNote(before, uci, moves[i + 1])) : undefined;
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return { uci, san: mv.san, from: mv.from, to: mv.to, before, after: g.fen(), mine, note };
  });
}

/** The position at the end of the line. */
export function lineEnd(m: Pick<Mate, "line">): string {
  const g = new Chess(m.line.fen);
  for (const u of m.line.moves) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  return g.fen();
}
