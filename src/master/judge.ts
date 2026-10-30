// Scoring a guess in Master games: 3 points for the move that was played, 2 for a move the engine rates as good as it
// (within 30 centipawns, checked live at a modest depth), otherwise 0.
import { Chess } from "chess.js";
import { asNumber, type Score } from "../engine/uci";

export const EXACT = 3, ALSO = 2, MISS = 0;
/** "Also good" means within this many centipawns of the engine's best move. */
export const TOLERANCE = 30;
/** The live check is quick: a modest depth, so a guess is judged in about a second. */
export const LIVE_DEPTH = 12;

export interface Mv { from: string; to: string; promotion?: string }

export const sameMove = (a: Mv, b: Mv): boolean => a.from === b.from && a.to === b.to && (a.promotion ?? "q") === (b.promotion ?? "q");

/** Points for a guess that is not the played move: 2 if its score is within the tolerance of the best, else 0.
 *  Both scores are from the guessing side's point of view. */
export const pointsFor = (best: Score, guess: Score): number => (asNumber(best) - asNumber(guess) <= TOLERANCE ? ALSO : MISS);

/** The minimal engine the judge needs (the app's Uci class fits). */
export interface Judge { analyse(fen: string, o: { depth: number }): Promise<{ score: Score }> }

/** Judge a guess that differs from the played move. Resolves to ALSO or MISS; an engine that fails counts as MISS. */
export async function judgeGuess(engine: Judge, fenBefore: string, guess: Mv): Promise<number> {
  try {
    const g = new Chess(fenBefore);
    g.move({ from: guess.from, to: guess.to, promotion: guess.promotion ?? "q" });
    // a checkmating guess is as good as it gets
    if (g.isCheckmate()) return ALSO;
    const best = (await engine.analyse(fenBefore, { depth: LIVE_DEPTH })).score;
    const after = (await engine.analyse(g.fen(), { depth: LIVE_DEPTH })).score;
    // the second score is from the opponent's side: flip it back to the guesser's
    const mine: Score = after.mate !== undefined ? { mate: -after.mate } : { cp: -(after.cp ?? 0) };
    return pointsFor(best, mine);
  } catch { return MISS; }
}
