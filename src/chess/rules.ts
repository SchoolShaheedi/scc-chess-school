// Full-rules judging for "play" exercises (Level 2 onward): the learner is the side to move in a
// real position and must make a move that meets a goal. One module, used by BOTH the exercise
// runner and the content guard, so what the app accepts and what the tests prove can never differ.
import { Chess, type Move, type Square as CjSquare } from "chess.js";
import type { UIKey } from "../i18n";
import { attacks, drillMoves } from "./drill";
import { type PieceCode, placementFromFen } from "./types";

export type Goal =
  | "mate"            // deliver checkmate
  | "check"           // give check
  | "escape"          // get out of check, any way
  | "escape-move"     // ...by moving the king
  | "escape-block"    // ...by putting a piece in the way
  | "escape-capture"  // ...by taking the checking piece
  | "castle"          // castle (either side)
  | "promote"         // promote a pawn
  | "enpassant"       // capture en passant
  | "no-stalemate"    // a move that does NOT stalemate and does not just give the moved piece away
  | "stop-mate"       // a move after which the opponent has NO mate in one (lesson 3.8)
  // Level 4 tactics: judged on the position AFTER the move, by geometry, not by search
  | "win-free"        // capture a piece that nothing defends
  | "fork"            // the moved piece attacks two or more worthwhile targets at once
  | "pin"             // the moved piece pins an enemy piece to something bigger behind it
  | "skewer"          // the moved piece attacks a big piece with a smaller one behind it
  | "discover"        // moving one piece uncovers an attack by another
  | "double-check";   // two pieces give check at once

export interface Verdict { ok: boolean; why?: UIKey; tryAnother?: boolean }

export const uciOf = (m: Move) => m.from + m.to + (m.promotion ?? "");

function play(fen: string, uci: string): { after: Chess; move: Move } | null {
  const g = new Chess(fen);
  try {
    const move = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
    return { after: g, move };
  } catch { return null; }
}

/** Which way a legal move gets out of check: king walks, the checker is taken, or the line is blocked. */
export function escapeKind(fen: string, m: Move): "move" | "capture" | "block" {
  if (m.piece === "k") return "move";
  const g = new Chess(fen);
  const king = g.findPiece({ type: "k", color: g.turn() })[0];
  const checkers = g.attackers(king, g.turn() === "w" ? "b" : "w");
  return checkers.includes(m.to as CjSquare) ? "capture" : "block";
}

/** Judges one LEGAL move against the goal. */
export function judge(fen: string, uci: string, goal: Goal): Verdict {
  const r = play(fen, uci);
  if (!r) return { ok: false, why: "whyIllegal" };
  const { after, move } = r;
  if (after.isStalemate() && goal !== "no-stalemate") return { ok: false, why: "whyStalemate" };
  switch (goal) {
    case "mate":
      if (after.isCheckmate()) return { ok: true };
      return { ok: false, why: after.inCheck() ? "whyCheckNotMate" : "whyNotCheck" };
    case "check": return after.inCheck() ? { ok: true } : { ok: false, why: "whyNotCheck" };
    case "escape": return { ok: true };
    case "escape-move": case "escape-block": case "escape-capture": {
      const k = escapeKind(fen, move);
      if (`escape-${k}` === goal) return { ok: true };
      // a legal escape, just not the one this exercise is practising: not a mistake, try the other way
      return { ok: false, tryAnother: true, why: goal === "escape-move" ? "wantMove" : goal === "escape-block" ? "wantBlock" : "wantCapture" };
    }
    case "castle": return move.isKingsideCastle() || move.isQueensideCastle() ? { ok: true } : { ok: false, why: "whyCastle" };
    case "promote": return move.isPromotion() ? { ok: true } : { ok: false, why: "whyPromote" };
    case "enpassant": return move.isEnPassant() ? { ok: true } : { ok: false, why: "whyEnPassant" };
    case "stop-mate": {
      const threat = after.moves({ verbose: true }).some(m => { const g = new Chess(after.fen()); g.move(m); return g.isCheckmate(); });
      return threat ? { ok: false, why: "whyStillMate" } : { ok: true };
    }
    case "win-free": {
      if (!move.captured) return { ok: false, why: "whyNoCapture" };
      return after.isAttacked(move.to as CjSquare, after.turn()) ? { ok: false, why: "whyDefended" } : { ok: true };
    }
    // a tactic only counts if the piece that made it is not simply lost (DECISIONS #54)
    case "fork": return !forkTargets(after, move.to).length || forkTargets(after, move.to).length < 2 ? { ok: false, why: "whyNotFork" }
      : unsafe(after, move.to) ? { ok: false, why: "whyLosesPiece" } : { ok: true };
    case "pin": return !lineTactic(after, move.to, "pin") ? { ok: false, why: "whyNotPin" }
      : unsafe(after, move.to) ? { ok: false, why: "whyLosesPiece" } : { ok: true };
    case "skewer": return !lineTactic(after, move.to, "skewer") ? { ok: false, why: "whyNotSkewer" }
      : unsafe(after, move.to) ? { ok: false, why: "whyLosesPiece" } : { ok: true };
    // the moved piece may hang only when the UNCOVERED piece gives check: then taking it doesn't answer the check.
    // A check from the moved piece itself doesn't excuse it: Nd6+ Qxd6 takes the checker and steps off the line
    // (lesson check 2026-10-14; it used to accept that).
    case "discover": return !discovered(fen, after, move) ? { ok: false, why: "whyNotDiscover" }
      : unsafe(after, move.to) && !discoveredCheck(after, move) ? { ok: false, why: "whyLosesPiece" } : { ok: true };
    case "double-check": {
      const k = after.findPiece({ type: "k", color: after.turn() })[0];
      return after.attackers(k, after.turn() === "w" ? "b" : "w").length >= 2 ? { ok: true } : { ok: false, why: "whyNotDoubleCheck" };
    }
    case "no-stalemate": {
      if (after.isStalemate()) return { ok: false, why: "whyStalemate" };
      // "give the king air" must not be done by handing over the piece: a free piece is not an answer
      const them = after.turn(), me = them === "w" ? "b" : "w";
      if (after.isAttacked(move.to as CjSquare, them) && !after.isAttacked(move.to as CjSquare, me)) return { ok: false, why: "whyHangs" };
      return { ok: true };
    }
  }
}

/** Every legal move that meets the goal. The content guard needs at least one. */
export function solutions(fen: string, goal: Goal): string[] {
  const g = new Chess(fen);
  return g.moves({ verbose: true }).map(uciOf).filter(u => judge(fen, u, goal).ok);
}

/** Why an ILLEGAL move was refused, in the terms Level 2 teaches. */
export function whyIllegal(fen: string, from: string, to: string): UIKey | null {
  const g = new Chess(fen);
  const piece = g.get(from as CjSquare);
  if (!piece) return null;
  // would that piece reach `to` if check did not matter (its shape of move, blockers included)?
  // If so, the only reason it is refused is the king's safety.
  if (!drillMoves(placementFromFen(fen), from).includes(to)) return null; // not how it moves; caller explains
  if (g.inCheck()) return "whyStillCheck";
  return piece.type === "k" ? "whyIntoCheck" : "whyPinned";
}

/** The lone defending king's reply in "mate the lone king" drills. Not perfect defence, but stubborn:
 *  take any piece left hanging, otherwise run for the move that keeps the most room (and the centre).
 *  The learner's move limits are set from the KNOWN longest forced mates (KQK 10, KRRK 7, KRK 16),
 *  so a limit holds even against perfect defence. */
export function defend(fen: string): string | null {
  const g = new Chess(fen);
  const moves = g.moves({ verbose: true });
  if (!moves.length) return null;
  const capture = moves.find(m => m.captured);
  if (capture) return uciOf(capture);
  const centre = (sq: string) => { const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1; return -(Math.abs(3.5 - f) + Math.abs(3.5 - r)); };
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const a = new Chess(fen); a.move(m);
    // room = how many king moves it will have next time, if the attacker passed
    const parts = a.fen().split(" "); parts[1] = parts[1] === "w" ? "b" : "w"; parts[3] = "-";
    let room = 0; try { room = new Chess(parts.join(" ")).moves().length; } catch { room = 0; }
    const score = room * 2 + centre(m.to);
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return uciOf(best);
}

// ---- tactic geometry (Level 4) -------------------------------------------------------------
export const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Enemy pieces the piece on `sq` attacks that are worth attacking: the king, anything worth more
 *  than the attacker, or anything undefended. */
export function forkTargets(after: Chess, sq: string): string[] {
  const me = after.get(sq as CjSquare)!; const them = after.turn();
  const board = placementFromFen(after.fen());
  const hits = attacks(board, sq, `${me.color}${me.type.toUpperCase()}` as PieceCode);
  return hits.filter(t => {
    const p = after.get(t as CjSquare);
    if (!p || p.color !== them) return false;
    return p.type === "k" || VALUE[p.type] > VALUE[me.type] || !after.isAttacked(t as CjSquare, them);
  });
}

const DIRS: Record<string, number[][]> = {
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]], b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
};

/** Along each line from the moved slider: the first two pieces met. A pin is enemy-smaller in front of
 *  enemy-bigger (or the king); a skewer is enemy-bigger (or the king) in front of enemy-smaller. */
export function lineTactic(after: Chess, sq: string, kind: "pin" | "skewer"): boolean {
  const me = after.get(sq as CjSquare)!; const dirs = DIRS[me.type]; if (!dirs) return false;
  const f0 = sq.charCodeAt(0) - 97, r0 = +sq[1] - 1;
  for (const [df, dr] of dirs) {
    const met: { type: string; color: string }[] = [];
    for (let f = f0 + df, r = r0 + dr; f >= 0 && f < 8 && r >= 0 && r < 8 && met.length < 2; f += df, r += dr) {
      const p = after.get((String.fromCharCode(97 + f) + (r + 1)) as CjSquare);
      if (p) met.push(p);
    }
    if (met.length < 2 || met.some(p => p.color === me.color)) continue;
    const [front, back] = met;
    if (kind === "pin" && front.type !== "k" && VALUE[back.type] > VALUE[front.type]) return true;
    if (kind === "skewer" && VALUE[front.type] > VALUE[back.type]) return true;
  }
  return false;
}

/** A piece OTHER than the one that moved now attacks a worthwhile enemy target it did not attack before. */
/** After `move`, is the side to move in check from a piece OTHER than the one that just moved? */
function discoveredCheck(after: Chess, move: Move): boolean {
  if (!after.inCheck()) return false;
  const k = after.findPiece({ type: "k", color: after.turn() })[0];
  return after.attackers(k, move.color).some(a => a !== move.to);
}

export function discovered(before: string, after: Chess, move: Move): boolean {
  const b = new Chess(before), mine = move.color, them = mine === "w" ? "b" : "w";
  for (const row of after.board()) for (const p of row) {
    if (!p || p.color !== them || (p.type !== "k" && VALUE[p.type] < 3)) continue;
    const now = after.attackers(p.square, mine).filter(a => a !== move.to);
    const was = new Set(b.attackers(p.square, mine));
    if (now.some(a => !was.has(a))) return true;
  }
  return false;
}

/** Is the piece on `sq` simply lost? Attacked by something cheaper, or attacked and not defended.
 *  A king is never "lost" this way: an illegal king move would not have been played at all. */
export function unsafe(after: Chess, sq: string): boolean {
  const me = after.get(sq as CjSquare)!; if (me.type === "k") return false;
  const them = after.turn();
  const attackers = after.attackers(sq as CjSquare, them);
  if (!attackers.length) return false;
  if (attackers.some(a => VALUE[after.get(a)!.type] < VALUE[me.type])) return true;
  return after.attackers(sq as CjSquare, me.color).length === 0;
}

// ---- engine drills (Level 5+) ----------------------------------------------------------------
/** Has the learner (colour `me`) met an engine-drill goal in this position? */
export function engineGoalMet(g: Chess, me: "w" | "b", goal: "promote" | "wipe" | "hold", lastMove?: Move): boolean {
  const bare = g.board().flat().filter(p => p && p.color !== me).length === 1;   // only their king left
  // A promote drill is also won when the defender gives up everything to stop the pawn (the Lucena ends this way).
  if (goal === "promote") return !!lastMove && lastMove.color === me && (!!lastMove.promotion || bare);
  if (goal === "wipe") return bare;
  return false;   // "hold" is met by surviving maxMoves, counted by the runner
}

/** The learner's evaluation threshold: below this the drill has failed (a win thrown away, or a draw lost). */
export const SLIP = { promote: 250, wipe: 250, hold: -250 } as const;

/** A mini-game's result after a move (full check 2026-10-05). "promote": the first side to make a new piece wins.
 *  "clear": the learner wins by leaving the other side only its king, and loses if a pawn of theirs gets through.
 *  Checkmate decides either way; a stalemate or other draw counts as not yet won (the learner tries again). */
export function miniGameResult(g: Chess, me: "w" | "b", goal: "promote" | "clear", last?: Move): "win" | "lose" | "draw" | null {
  if (g.isCheckmate()) return g.turn() === me ? "lose" : "win";
  if (last?.promotion) return last.color === me && goal === "promote" ? "win" : last.color === me ? null : "lose";
  if (goal === "clear" && g.board().flat().filter(p => p && p.color !== me).length === 1) return "win";
  if (g.isGameOver()) return "draw";
  return null;
}
