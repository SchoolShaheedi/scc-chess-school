// Board vision drills (feature 3). Pure and DOM-free: which squares a piece attacks on an empty board, the light/dark
// colour of a square, and how a round is scored (test/calc.test.ts).
import { ALL_SQUARES, FILES, fileOf, isLight, rankOf, sq as makeSq, type Square } from "../chess/types";

export type VisionKind = "knight" | "bishop" | "rook" | "queen" | "colour" | "name";
export const VISION_KINDS: VisionKind[] = ["knight", "bishop", "rook", "queen", "colour", "name"];
/** The Young look: the knight and the rook only, and no clock. */
export const YOUNG_KINDS: VisionKind[] = ["knight", "rook"];
export const ROUND_SECONDS = 30, YOUNG_TASKS = 8;

const JUMPS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], LINE = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The squares a lone piece on `from` attacks (an empty board). */
export function attackedSquares(kind: "knight" | "bishop" | "rook" | "queen", from: Square): Square[] {
  const f = fileOf(from), r = rankOf(from), out: Square[] = [];
  if (kind === "knight") {
    for (const [df, dr] of JUMPS) { const s = makeSq(f + df, r + dr); if (s) out.push(s); }
    return out.sort();
  }
  const dirs = kind === "bishop" ? DIAG : kind === "rook" ? LINE : [...DIAG, ...LINE];
  for (const [df, dr] of dirs) for (let k = 1; ; k++) { const s = makeSq(f + df * k, r + dr * k); if (!s) break; out.push(s); }
  return out.sort();
}

export const squareColour = (s: Square): "light" | "dark" => isLight(s) ? "light" : "dark";

export type VisionTask =
  | { kind: "knight" | "bishop" | "rook" | "queen"; sq: Square; answer: Square[] }
  | { kind: "colour"; sq: Square; answer: "light" | "dark" }
  | { kind: "name"; sq: Square; answer: Square };

export function makeTask(kind: VisionKind, rand: () => number = Math.random, avoid?: Square): VisionTask {
  let s: Square;
  do { s = ALL_SQUARES[Math.floor(rand() * 64)]; } while (s === avoid);
  if (kind === "colour") return { kind, sq: s, answer: squareColour(s) };
  if (kind === "name") return { kind, sq: s, answer: s };
  return { kind, sq: s, answer: attackedSquares(kind, s) };
}

/** A task's progress: attack tasks collect squares; the others are answered by one tap. */
export interface TaskState { found: Square[]; wrong: number; done: boolean }
export const freshState = (): TaskState => ({ found: [], wrong: 0, done: false });

/** One tap on a square (attack tasks). A right square scores +1, a wrong one -1; a square already found is ignored. */
export function tapSquare(task: VisionTask, st: TaskState, s: Square): { state: TaskState; delta: number } {
  if (task.kind === "colour" || task.kind === "name" || st.done || st.found.includes(s)) return { state: st, delta: 0 };
  if (!task.answer.includes(s)) return { state: { ...st, wrong: st.wrong + 1 }, delta: -1 };
  const found = [...st.found, s];
  return { state: { ...st, found, done: found.length === task.answer.length }, delta: 1 };
}

/** One answer to a colour or name task: +1 right, -1 wrong; either way the task is over. */
export function answerTask(task: VisionTask, given: string): { state: TaskState; delta: number } {
  const ok = (task.kind === "colour" || task.kind === "name") && task.answer === given;
  return { state: { found: ok ? [given] : [], wrong: ok ? 0 : 1, done: true }, delta: ok ? 1 : -1 };
}

/** A round's total: the sum of the deltas, never below zero. */
export const roundScore = (deltas: number[]) => Math.max(0, deltas.reduce((a, b) => a + b, 0));

/** The square named by a file letter and a rank number, if both are real. */
export const squareOf = (file: string, rank: string): Square | null => FILES.includes(file) && /^[1-8]$/.test(rank) ? file + rank : null;
