// Pawn structure and piece quality, computed from the position (Level 8, DECISIONS #63).
// "Tap the squares" exercises take their right answers from here, never from a hand-written list,
// and test/structure.test.ts pins each rule to textbook examples.
import { Chess, type Square as CjSquare } from "chess.js";
import { type Color, FILES, type Placement, type Square, placementFromFen } from "./types";

export type Feature = "isolated" | "doubled" | "passed" | "outpost" | "openFile" | "fewestMoves" | "badBishop";

const pawnsOf = (b: Placement, c: Color) => Object.keys(b).filter(s => b[s] === `${c}P`);
const file = (s: Square) => FILES.indexOf(s[0]);
const rank = (s: Square) => +s[1];

/** A pawn with no friendly pawn on either neighbouring file. */
export function isolated(b: Placement, c: Color): Square[] {
  const mine = pawnsOf(b, c);
  return mine.filter(p => !mine.some(q => Math.abs(file(q) - file(p)) === 1));
}

/** Every pawn that shares its file with another friendly pawn. */
export function doubled(b: Placement, c: Color): Square[] {
  const mine = pawnsOf(b, c);
  return mine.filter(p => mine.some(q => q !== p && file(q) === file(p)));
}

/** No enemy pawn ahead of it on its own file or the files beside it. */
export function passed(b: Placement, c: Color): Square[] {
  const theirs = pawnsOf(b, c === "w" ? "b" : "w");
  const ahead = (p: Square, q: Square) => c === "w" ? rank(q) > rank(p) : rank(q) < rank(p);
  return pawnsOf(b, c).filter(p => !theirs.some(q => Math.abs(file(q) - file(p)) <= 1 && ahead(p, q)));
}

/** An outpost for `c`: an empty square in the enemy half (ranks 4-6 from c's side) that no enemy pawn can
 *  ever attack (none on the neighbouring files further up the board) and that one of c's pawns defends. */
export function outposts(b: Placement, c: Color): Square[] {
  const theirs = pawnsOf(b, c === "w" ? "b" : "w"), mine = pawnsOf(b, c);
  const out: Square[] = [];
  for (let f = 0; f < 8; f++) for (const r of c === "w" ? [4, 5, 6] : [5, 4, 3]) {
    const s = FILES[f] + r;
    if (b[s]) continue;
    const canBeHit = theirs.some(q => Math.abs(file(q) - f) === 1 && (c === "w" ? rank(q) > r : rank(q) < r));
    const defended = mine.some(q => Math.abs(file(q) - f) === 1 && rank(q) === (c === "w" ? r - 1 : r + 1));
    if (!canBeHit && defended) out.push(s);
  }
  return out;
}

/** Files with no pawns at all. Returned as the squares of rank 1 (a1, d1, …) so a tap anywhere on the file can be matched by its letter. */
export function openFiles(b: Placement): string[] {
  const pawns = Object.keys(b).filter(s => b[s]?.[1] === "P");
  return FILES.split("").filter(f => !pawns.some(p => p[0] === f));
}

/** The piece(s) of colour c (not king, not pawn) with the fewest legal moves. */
export function fewestMoves(fen: string, c: Color): Square[] {
  const parts = fen.split(" "); parts[1] = c; parts[3] = "-";
  const g = new Chess(parts.join(" "));
  const counts = g.board().flat().filter(p => p && p.color === c && p.type !== "k" && p.type !== "p")
    .map(p => ({ sq: p!.square, n: g.moves({ square: p!.square as CjSquare }).length }));
  const min = Math.min(...counts.map(x => x.n));
  return counts.filter(x => x.n === min).map(x => x.sq);
}

const light = (s: Square) => (file(s) + rank(s)) % 2 === 0;   // a1: 0+1 odd = dark; h1: 7+1 even = light

/** A bishop is "bad" when most of its own pawns (at least 3) stand on its square colour, blocking it. */
export function badBishops(b: Placement, c: Color): Square[] {
  const mine = pawnsOf(b, c);
  return Object.keys(b).filter(s => b[s] === `${c}B`).filter(bs => {
    const same = mine.filter(p => light(p) === light(bs)).length;
    return same >= 3 && same > mine.length / 2;
  });
}

/** The squares a learner must tap for a feature. For open files, every square of the file counts (by its letter). */
export function answerSquares(fen: string, feature: Feature, c: Color): { squares: Square[]; byFile: boolean } {
  const b = placementFromFen(fen);
  switch (feature) {
    case "isolated": return { squares: isolated(b, c), byFile: false };
    case "doubled": return { squares: doubled(b, c), byFile: false };
    case "passed": return { squares: passed(b, c), byFile: false };
    case "outpost": return { squares: outposts(b, c), byFile: false };
    case "openFile": return { squares: openFiles(b).map(f => f + "1"), byFile: true };
    case "fewestMoves": return { squares: fewestMoves(fen, c), byFile: false };
    case "badBishop": return { squares: badBishops(b, c), byFile: false };
  }
}
