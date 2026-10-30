// Calculate (feature 3): blindfold-to-depth. Pure and DOM-free, so every rule is tested (test/calc.test.ts).
// A bank puzzle's moves[0] is the opponent's setup move; the learner's moves are moves[1], [3], [5]...
// The drill shows the position after the setup move, tells the learner the next N move pairs (the learner's move and the
// reply) as text and arrows WITHOUT moving the pieces, and asks for the move that follows them.
import { Chess } from "chess.js";
import { asNumber, type Candidate } from "../engine/uci";

export type CalcPuzzle = { id: string; fen: string; moves: string[]; rating: number };
export const CALC_LEVELS = 3;
/** Clean answers in a row (counted as the best streak at that level) needed to open the next level. */
export const CALC_UNLOCK = 3;
/** A candidate counts as good when the engine rates it within this many centipawns of its best move. */
export const CAND_WINDOW = 50;

export interface CalcDrill {
  id: string;
  /** The position the learner sees: after the setup move, with the learner to move. It never changes on screen. */
  fen: string;
  /** The position after the hidden moves: where the answer is played. Not shown. */
  afterFen: string;
  /** The N pairs, in order, as from/to squares and SAN. */
  hidden: { uci: string; san: string; from: string; to: string }[];
  /** "1. Nf3 Nc6 2. ..." with the right move numbers. */
  line: string;
  answer: string;   // uci of the final winning move
  answerSan: string;
}

const mv = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

/** Can this puzzle make a drill at level n (n move pairs hidden, then the answer)? */
export const fitsLevel = (p: { moves: string[] }, n: number) => n >= 1 && p.moves.length >= 2 * n + 2;

/** The drill for a puzzle at level n, or null if the puzzle is too short or its line does not play legally. */
export function makeDrill(p: CalcPuzzle, n: number): CalcDrill | null {
  if (!fitsLevel(p, n)) return null;
  try {
    const g = new Chess(p.fen);
    g.move(mv(p.moves[0]));
    const fen = g.fen();
    const hidden: CalcDrill["hidden"] = [];
    const parts: string[] = [];
    for (const u of p.moves.slice(1, 2 * n + 1)) {
      const num = g.moveNumber(), white = g.turn() === "w";
      const m = g.move(mv(u));
      parts.push(white ? `${num}. ${m.san}` : parts.length === 0 ? `${num}... ${m.san}` : m.san);
      hidden.push({ uci: u, san: m.san, from: m.from, to: m.to });
    }
    const afterFen = g.fen();
    const answer = p.moves[2 * n + 1];
    const m = g.move(mv(answer));
    return { id: p.id, fen, afterFen, hidden, line: parts.join(" "), answer, answerSan: m.san };
  } catch { return null; }
}

/** The learner's final move: right if it is the line's move, or any other move that gives checkmate there. */
export function checkAnswer(d: CalcDrill, from: string, to: string): boolean {
  const g = new Chess(d.afterFen);
  const mine = g.moves({ verbose: true }).find(m => m.from === from && m.to === to);
  if (!mine) return false;
  if (from === d.answer.slice(0, 2) && to === d.answer.slice(2, 4)) return true;
  g.move(mine.san);
  return g.isCheckmate();
}

/** Is from→to a legal move in the position after the hidden moves (a candidate must be)? */
export function legalAfter(d: CalcDrill, from: string, to: string): boolean {
  return new Chess(d.afterFen).moves({ verbose: true }).some(m => m.from === from && m.to === to);
}

/** Which of the learner's candidates (from+to, 4 letters) are within CAND_WINDOW of the engine's best. A candidate the engine
 *  did not list at all was rated worse than everything it did list, so it is not "good". */
export function rateCandidates(engine: Candidate[], mine: string[]): { uci: string; good: boolean }[] {
  if (!engine.length) return mine.map(uci => ({ uci, good: false }));
  const best = asNumber(engine[0].score);
  return mine.map(uci => {
    const e = engine.find(c => c.move.slice(0, 4) === uci);
    return { uci, good: !!e && best - asNumber(e.score) <= CAND_WINDOW };
  });
}

/** Levels: 1 is always open; level n+1 opens when level n has a best of CALC_UNLOCK clean answers in a row. */
export const calcUnlocked = (best: number[] = []): number => {
  let open = 1;
  while (open < CALC_LEVELS && (best[open - 1] ?? 0) >= CALC_UNLOCK) open++;
  return open;
};
/** The rating the puzzles are drawn near: deeper levels start a little easier. */
export const calcTarget = (rating: number, n: number) => Math.max(400, rating - 100 * (n - 1));
