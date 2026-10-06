// Every puzzle in the app by its Lichess id, so a missed puzzle can come back later (the mistake bank) and its
// rating can move the learner's own (chess review 2026-10-04).
import { PACKS } from "../content/levels";
import type { Exercise, PuzzleExercise } from "../lesson/types";

type P = { id: string; fen: string; moves: string[]; rating: number; themes?: string[] };
let byId: Map<string, P> | null = null;
export function puzzleById(id: string): P | undefined {
  if (!byId) { byId = new Map(); for (const pack of Object.values(PACKS)) for (const p of pack.puzzles) byId.set(p.id, p); }
  return byId.get(id);
}
/** The Lichess id of a puzzle exercise, from its source link. */
export const idOf = (ex: Exercise) => ex.kind === "puzzle" ? ex.source?.split("/").pop() : undefined;
export const asExercise = (p: P): PuzzleExercise => ({
  kind: "puzzle", fen: p.fen, moves: p.moves, prompt: { en: "Find the best move.", pa: "ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" }, source: `lichess.org/training/${p.id}`,
});
