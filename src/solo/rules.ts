// Solo Chess (DECISIONS #115): every move must capture, and the goal is one piece left. All pieces are one colour.
// chess.com's rules for 10+: each piece may capture at most twice (`limit` 2), and a king, if there is one, is never
// captured. The Young look plays without the limit (option B). Pure and DOM-free: tested in test/solo.test.ts.
//
// Puzzles are built BACKWARDS from the last piece left, so every one has a solution: a piece "un-captures" by stepping
// back along a line it could have captured along, and the piece it took reappears where it stood.
import { FILES, type Square } from "../chess/types";

export type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
export interface SoloPiece { kind: Kind; left: number }
export type Solo = Record<Square, SoloPiece>;

const at = (f: number, r: number): Square | null => (f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null);
const fr = (s: Square): [number, number] => [FILES.indexOf(s[0]), +s[1] - 1];
const LINES: Record<string, [number, number][]> = {
  R: [[1, 0], [-1, 0], [0, 1], [0, -1]], B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  Q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
};
const JUMPS: Record<string, [number, number][]> = {
  N: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
  K: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  P: [[1, 1], [-1, 1]],               // white pawns: they capture diagonally forward (up the board)
};

/** The squares a piece on `s` could capture on, given what stands where (`occupied`). Sliders stop at the first piece. */
export function reach(kind: Kind, s: Square, occupied: (q: Square) => boolean): Square[] {
  const [f, r] = fr(s), out: Square[] = [];
  if (LINES[kind]) for (const [df, dr] of LINES[kind]) {
    for (let k = 1; k < 8; k++) { const q = at(f + df * k, r + dr * k); if (!q) break; if (occupied(q)) { out.push(q); break; } }
  } else for (const [df, dr] of JUMPS[kind]) { const q = at(f + df, r + dr); if (q && occupied(q)) out.push(q); }
  return out;
}

/** Where the piece on `from` may capture now. With a limit, a piece with no captures left can't move. */
export function capturesFrom(st: Solo, from: Square, limit: boolean): Square[] {
  const p = st[from]; if (!p || (limit && p.left <= 0)) return [];
  return reach(p.kind, from, q => !!st[q]).filter(q => st[q].kind !== "K");
}
export const anyMove = (st: Solo, limit: boolean) => Object.keys(st).some(s => capturesFrom(st, s, limit).length > 0);
export const solved = (st: Solo) => Object.keys(st).length === 1;

export function capture(st: Solo, from: Square, to: Square): Solo {
  const next = { ...st }, p = next[from];
  delete next[from]; next[to] = { kind: p.kind, left: p.left - 1 };
  return next;
}

/** Is it still solvable from here? A depth-first search; small boards (8 pieces at most) make it instant. */
export function solvable(st: Solo, limit: boolean): boolean {
  if (solved(st)) return true;
  for (const from of Object.keys(st)) for (const to of capturesFrom(st, from, limit)) if (solvable(capture(st, from, to), limit)) return true;
  return false;
}

/** A seeded random (mulberry32), so a numbered puzzle is the same puzzle every time. */
export function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

const KINDS: Kind[] = ["Q", "R", "R", "B", "B", "N", "N", "P", "P", "P"];
/** A puzzle of `n` pieces, every piece starting with 2 captures left. Built backwards, then checked forwards. */
export function makePuzzle(n: number, rand: () => number): Solo {
  for (let tries = 0; tries < 400; tries++) {
    const last = KINDS[Math.floor(rand() * KINDS.length)];
    const st: Solo = {}, used: Record<Square, number> = {};
    const start = at(Math.floor(rand() * 8), 1 + Math.floor(rand() * 6))!;   // a pawn may never stand on rank 1 or 8
    st[start] = { kind: last, left: 2 }; used[start] = 0;
    let ok = true;
    for (let k = 1; k < n && ok; k++) {
      // un-capture: a piece that has captured fewer than twice steps back to a square it could have come from
      const options: [Square, Square][] = [];
      for (const s of Object.keys(st)) {
        if (used[s] >= 2) continue;
        const kind = st[s].kind;
        // the squares from which this piece would capture onto s: walk the move pattern backwards (pawns: downwards)
        const back = kind === "P" ? [[1, -1], [-1, -1]] as [number, number][] : null;
        const [f, r] = fr(s);
        if (back) for (const [df, dr] of back) { const q = at(f + df, r + dr); if (q && !st[q] && +q[1] > 1) options.push([s, q]); }
        else if (LINES[kind]) for (const [df, dr] of LINES[kind]) for (let j = 1; j < 8; j++) { const q = at(f + df * j, r + dr * j); if (!q || st[q]) break; options.push([s, q]); }
        else for (const [df, dr] of JUMPS[kind]) { const q = at(f + df, r + dr); if (q && !st[q]) options.push([s, q]); }
      }
      if (!options.length) { ok = false; break; }
      const [s, q] = options[Math.floor(rand() * options.length)];
      const mover = st[s], count = used[s];
      delete st[s]; delete used[s];
      st[q] = mover; used[q] = count + 1;
      // the piece it took appears where it was taken (never a king, and a pawn never on rank 1 or 8)
      const pool = KINDS.filter(x => x !== "P" || (s[1] !== "1" && s[1] !== "8"));
      st[s] = { kind: pool[Math.floor(rand() * pool.length)], left: 2 }; used[s] = 0;
    }
    if (ok && Object.keys(st).length === n && solvable(st, true)) return st;
  }
  throw new Error("no Solo Chess puzzle found");
}

/** Stars for a solved puzzle: 3 with no undo or restart, 2 with one or two, else 1. */
export const starsFor = (retries: number) => (retries === 0 ? 3 : retries <= 2 ? 2 : 1);
/** The Young path: ten puzzles, growing from 3 pieces to 6. */
export const PATH = [3, 3, 4, 4, 4, 5, 5, 5, 6, 6];
