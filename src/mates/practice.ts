// The practice positions of a mate (DECISIONS #137): real mate puzzles from the bank (Lichess, CC0), found by the build
// script (test/mates-build.test.ts) by the bank's theme tag, or by the exact classifier where the bank has no tag. The
// positions travel in the app (a chunk loaded when a mate's practice opens), so practice works offline.
import { COUNTS } from "../content/mates-counts";

export interface Pos { id: string; fen: string; moves: string[]; rating: number }
type Raw = Record<string, [string, string, string, number][][]>;

let ixP: Promise<Raw> | null = null;
const index = (): Promise<Raw> => (ixP ??= import("../content/mates-index.json").then(m => (m.default ?? m) as unknown as Raw).catch(e => { ixP = null; throw e; }));

/** All the positions of a mate at mate in `stage` (1, 2 or 3), easiest first. */
export async function pool(id: string, stage: number): Promise<Pos[]> {
  if (!(COUNTS[id]?.[stage - 1] > 0)) return [];
  const ix = await index();
  return (ix[id]?.[stage - 1] ?? []).map(([pid, fen, moves, rating]) => ({ id: pid, fen, moves: moves.split(" "), rating }));
}

/** `n` different positions drawn at random from the pool, shown easiest first. */
export async function draw(id: string, stage: number, n: number, rand: () => number = Math.random): Promise<Pos[]> {
  const all = await pool(id, stage);
  const left = [...all], out: Pos[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rand() * left.length), 1)[0]);
  return out.sort((a, b) => a.rating - b.rating);
}
