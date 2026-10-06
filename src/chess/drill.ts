// Move rules for teaching boards. Level 1 drills put one or two pieces on an otherwise empty
// board (no kings, no check), which chess.js rightly refuses as an illegal position, so drills
// get their own small rule set: how each piece moves, what it attacks. Full games and puzzles
// use chess.js instead (see exercises/puzzle.ts).
import { type Color, type PieceCode, type Placement, type Square, fileOf, rankOf, sq, split } from "./types";

const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KING_STEPS = [...ROOK_DIRS, ...BISHOP_DIRS];
const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

function slide(board: Placement, from: Square, color: Color, dirs: number[][]): Square[] {
  const out: Square[] = [];
  for (const [df, dr] of dirs) {
    let f = fileOf(from) + df, r = rankOf(from) + dr;
    for (let s = sq(f, r); s; s = sq(f += df, r += dr)) {
      const there = board[s];
      if (there && there[0] === color) break;
      out.push(s);
      if (there) break;
    }
  }
  return out;
}

function steps(board: Placement, from: Square, color: Color, offsets: number[][]): Square[] {
  return offsets
    .map(([df, dr]) => sq(fileOf(from) + df, rankOf(from) + dr))
    .filter((s): s is Square => !!s && board[s]?.[0] !== color);
}

/** Squares a piece attacks (where it could capture). For pawns that is the two diagonals. */
export function attacks(board: Placement, from: Square, piece: PieceCode): Square[] {
  const { color, type } = split(piece);
  switch (type) {
    case "R": return slide(board, from, color, ROOK_DIRS);
    case "B": return slide(board, from, color, BISHOP_DIRS);
    case "Q": return slide(board, from, color, KING_STEPS);
    case "N": return steps(board, from, color, KNIGHT_JUMPS);
    case "K": return steps(board, from, color, KING_STEPS);
    case "P": {
      const dir = color === "w" ? 1 : -1;
      return [-1, 1]
        .map(df => sq(fileOf(from) + df, rankOf(from) + dir))
        .filter((s): s is Square => !!s && board[s]?.[0] !== color);
    }
  }
}

/** Where a piece may move on a drill board. Pawns: forward to empty squares, diagonal only to capture. */
export function drillMoves(board: Placement, from: Square): Square[] {
  const piece = board[from];
  if (!piece) return [];
  const { color, type } = split(piece);
  if (type !== "P") return attacks(board, from, piece);
  const dir = color === "w" ? 1 : -1, start = color === "w" ? 1 : 6;
  const out: Square[] = [];
  const one = sq(fileOf(from), rankOf(from) + dir);
  if (one && !board[one]) {
    out.push(one);
    const two = sq(fileOf(from), rankOf(from) + 2 * dir);
    if (rankOf(from) === start && two && !board[two]) out.push(two);
  }
  for (const s of attacks(board, from, piece)) if (board[s] && board[s]![0] !== color) out.push(s);
  return out;
}

/** Every square attacked by `color`. Used by the king-safety drills. */
export function attackedBy(board: Placement, color: Color): Set<Square> {
  const out = new Set<Square>();
  for (const [s, p] of Object.entries(board)) {
    if (p && p[0] === color) for (const a of attacks(board, s, p)) out.add(a);
  }
  return out;
}

/** King moves that do not step into attack. The king is lifted off the board first so it
 *  cannot "hide" behind itself on the line of a rook. */
export function safeKingMoves(board: Placement, from: Square): Square[] {
  const king = board[from]!;
  const enemy: Color = king[0] === "w" ? "b" : "w";
  return drillMoves(board, from).filter(to => {
    const next = { ...board };
    delete next[from];
    next[to] = king;
    return !attackedBy(next, enemy).has(to);
  });
}

export function move(board: Placement, from: Square, to: Square): Placement {
  const next = { ...board };
  next[to] = next[from];
  delete next[from];
  // drills promote straight to a queen; choosing the piece is taught in Level 2
  if (next[to]?.[1] === "P" && (rankOf(to) === 7 || rankOf(to) === 0)) next[to] = `${next[to]![0] as Color}Q`;
  return next;
}
