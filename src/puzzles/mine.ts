// Your own mistakes as spaced drills: when a game is reviewed, the learner's worst slips (blunder, mistake, miss) become
// personal puzzles in the mistake bank, next to the Lichess puzzles they missed. Pure and DOM-free (test/mine.test.ts).
//
// A puzzle here has the same shape as a Lichess one, because runPuzzle plays it: the FEN is the position BEFORE the
// opponent's move, moves[0] is that move, moves[1] is the engine's best reply for the learner. So a slip on the very first
// ply (no opponent move before it) cannot be made into a puzzle, and is skipped.
import type { Reviewed } from "../review/insights";
import { phaseOf, type Phase } from "../insights/insights";

/** The puzzle itself, kept on its bank card (no puzzle bank holds it): `g` = the game, `ph` = its phase, `san` = the move played. */
export interface MineInfo { fen: string; moves: string[]; g: string; ph: Phase; san: string }
export interface MineDrill { id: string; mine: MineInfo }

/** At most this many drills from one game, the costliest slips first: a drill list nobody can finish teaches nothing. */
export const MINE_PER_GAME = 5;
const KINDS = new Set(["blunder", "mistake", "miss"]);

/** A short stable id for a game from its moves, so reviewing the same game twice saves its drills once. */
export function gameId(uci: string[], startFen?: string): string {
  let h = 2166136261;
  for (const ch of `${startFen ?? ""}|${uci.join(" ")}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
export const mineId = (game: string, ply: number) => `my:${game}:${ply}`;
export const isMine = (id: string) => id.startsWith("my:");

/** The drills from a graded game. `fens[i]` is the position before ply i (as in Game Review). */
export function minePuzzles(r: Reviewed[], fens: string[], me: "w" | "b", game: string): MineDrill[] {
  return r
    .filter(m => m.by === me && KINDS.has(m.label) && m.best && m.best !== m.uci && m.i >= 1 && fens[m.i - 1])
    .sort((a, b) => b.drop - a.drop).slice(0, MINE_PER_GAME)
    .sort((a, b) => a.i - b.i)
    .map(m => ({ id: mineId(game, m.i), mine: { fen: fens[m.i - 1], moves: [r[m.i - 1].uci, m.best], g: game, ph: phaseOf(fens[m.i], m.i), san: m.san } }));
}
