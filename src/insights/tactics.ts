// Insights, the tactics breakdown (the "Learning set", 2026-11-03): from the learner's own graded games, the tactics
// they FOUND and the ones they MISSED: forks, pins, mate in one, mate in two, and free (hanging) pieces won or left.
// Pure and DOM-free (test/tactics-insights.test.ts). Every count is computed from the position by the rules
// (chess/tactics.ts); Stockfish's grading (the drop in winning chance, already remembered per game) only decides
// whether an available tactic was really missed:
// - mate in one: missed whenever one was on the board and the move was not mate (no grading needed);
// - mate in two, fork, pin, free piece: missed when one was available, the move was not one, and the move lost 10+ points;
// - "left hanging": the move left a piece of 3 or more unguarded and lost 10+ points.
import { Chess } from "chess.js";
import { hanging } from "../bots/gamecoach";
import { forcedMate, forkOf, forksAvailable, freePieceTaken, freePiecesAvailable, mateIn1Moves, mateIn2Move, pinOf, pinsAvailable } from "../chess/tactics";
import type { SavedGame } from "../play/history";
import { replay } from "./insights";

export type TacticId = "mate1" | "mate2" | "fork" | "pin" | "hanging";
/** The puzzle theme (puzzles/bank.ts THEMES) that practises each one. */
export const TACTIC_THEME: Record<TacticId, string> = { mate1: "mateIn1", mate2: "mateIn2", fork: "fork", pin: "pin", hanging: "hangingPiece" };
export const TACTIC_ORDER: TacticId[] = ["mate1", "mate2", "fork", "pin", "hanging"];
/** found = played it (for "hanging": a free piece won); missed = it was there and not played; left = (hanging only) a piece left unguarded. */
export interface TacticRow { id: TacticId; found: number; missed: number; left: number }

const MISS = 10;
export const emptyTactics = (): TacticRow[] => TACTIC_ORDER.map(id => ({ id, found: 0, missed: 0, left: 0 }));

/** The tactics found and missed in the learner's moves of one game. `drops[i]` is the drop in winning chance of ply i. */
export function gameTactics(g: Pick<SavedGame, "uci" | "startFen" | "me">, drops: number[]): TacticRow[] {
  const rows = emptyTactics(), row = (id: TacticId) => rows.find(r => r.id === id)!;
  const { fens, ucis } = replay(g), first = new Chess(fens[0]).turn(), last = fens.length - 1;
  for (let i = 0; i < Math.min(drops.length, ucis.length); i++) {
    if (((i % 2 === 0) === (first === "w") ? "w" : "b") !== g.me) continue;
    const fen = fens[i], uci = ucis[i], after = new Chess(fens[i + 1]), drop = drops[i], weak = drop >= MISS;

    const mates = mateIn1Moves(fen);
    if (after.isCheckmate()) row("mate1").found++;
    else if (mates.length) row("mate1").missed++;
    else {
      // my move, theirs, my mate: a forced mate in two when every reply allowed it
      const played2 = i + 3 === last && new Chess(fens[last]).isCheckmate() && forcedMate(fens[i + 1]);
      if (played2) row("mate2").found++;
      else if (weak && mateIn2Move(fen)) row("mate2").missed++;
    }

    if (forkOf(fen, uci)) row("fork").found++; else if (weak && forksAvailable(fen).length) row("fork").missed++;
    if (pinOf(fen, uci)) row("pin").found++; else if (weak && pinsAvailable(fen).length) row("pin").missed++;
    if (freePieceTaken(fen, uci)) row("hanging").found++; else if (weak && freePiecesAvailable(fen).length) row("hanging").missed++;
    if (weak && hanging(fens[i + 1], g.me).length) row("hanging").left++;
  }
  return rows;
}

export function addTactics(a: TacticRow[], b: TacticRow[]): TacticRow[] {
  return a.map(r => { const o = b.find(x => x.id === r.id)!; return { id: r.id, found: r.found + o.found, missed: r.missed + o.missed, left: r.left + o.left }; });
}
/** The rows worth showing: anything found, missed or left at least once. */
export const shown = (rows: TacticRow[]): TacticRow[] => rows.filter(r => r.found + r.missed + r.left > 0);
