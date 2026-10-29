// "Show why": the engine's principal variation played out against the move the learner made. Pure and DOM-free
// (test/refute.test.ts); the screen animates what this returns.
import { Chess } from "chess.js";

export interface Refutation {
  /** The moves to play after the move played: UCI, with the position (FEN) and the SAN after each. */
  steps: { uci: string; fen: string; san: string }[];
  /** The line written out for the note, with move numbers: "12… Qxf7+ 13. Kd1 Qxf2". */
  text: string;
}

/** At most this many plies of the engine's line are played (2-4 is enough to see the point without a lecture). */
export const WHY_PLIES = 4;

/** The refutation from `fenAfter` (the position after the played move, the opponent to move), from the engine's PV.
 *  Stops at the first illegal move (a stale or foreign line) and at the end of the game. */
export function refutation(fenAfter: string, pv: string[], plies = WHY_PLIES): Refutation {
  const g = new Chess(fenAfter), steps: Refutation["steps"] = [], parts: string[] = [];
  for (const u of pv.slice(0, plies)) {
    if (g.isGameOver()) break;
    const num = g.moveNumber(), white = g.turn() === "w";
    let san: string;
    try { san = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { break; }
    steps.push({ uci: u, fen: g.fen(), san });
    parts.push(white ? `${num}. ${san}` : steps.length === 1 ? `${num}… ${san}` : san);
  }
  return { steps, text: parts.join(" ") };
}
