// Play variety against the bots: ODDS (the bot starts a piece down) and two small VARIANTS, King of the Hill and
// Three-check. Stockfish knows only standard chess, so the variants are a thin rules layer over chess.js (as Magical
// Chess is): win detection after each move, and a cheap wrapper that makes the bot variant-aware. Pure and DOM-free
// (test/variants.test.ts). Odds and variant games are unrated.
import { Chess, type Square } from "chess.js";

// ---- Odds ----

export type Odds = "none" | "pawn" | "knight" | "rook";
export const ODDS: Odds[] = ["none", "pawn", "knight", "rook"];
/** The piece the bot gives: its f-pawn, b-knight or a-rook. */
const GIVEN: Record<Exclude<Odds, "none">, string> = { pawn: "f", knight: "b", rook: "a" };

/** The start FEN for an odds game: the standard position minus the bot's piece. Removing the a-rook also removes
 *  that side's queenside castling right (chess.js drops a right whose rook is gone). `none` = the standard start. */
export function oddsFen(odds: Odds, botColor: "w" | "b"): string {
  const g = new Chess();
  if (odds === "none") return g.fen();
  const rank = odds === "pawn" ? (botColor === "w" ? 2 : 7) : (botColor === "w" ? 1 : 8);
  g.remove(`${GIVEN[odds]}${rank}` as Square);
  const parts = g.fen().split(" ");
  if (odds === "rook") parts[2] = parts[2].replace(botColor === "w" ? "Q" : "q", "") || "-";   // belt and braces
  return parts.join(" ");
}

// ---- Variants ----

export type Variant = "none" | "koth" | "threecheck";
export const VARIANTS: Variant[] = ["none", "koth", "threecheck"];
export const HILL: string[] = ["d4", "d5", "e4", "e5"];
export interface VariantState { variant: Variant; /** checks given so far by each side */ checks: { w: number; b: number } }

/** Checks given so far by each side, counted from the moves played (a mate counts too). */
export function countChecks(history: { color: "w" | "b"; san: string }[]): { w: number; b: number } {
  const c = { w: 0, b: 0 };
  for (const m of history) if (/[+#]$/.test(m.san)) c[m.color]++;
  return c;
}

/** Who has won the variant in this position (the side that has just moved is checked first), or null. Ordinary
 *  mate, stalemate and draws are NOT decided here. `checks` = the checks given so far (see countChecks). */
export function variantWinner(g: Chess, v: Variant, checks: { w: number; b: number }): "w" | "b" | null {
  if (v === "koth") {
    const mover = g.turn() === "w" ? "b" : "w";
    for (const side of [mover, mover === "w" ? "b" : "w"] as const) {
      const k = g.board().flat().find(p => p && p.type === "k" && p.color === side);
      if (k && HILL.includes(k.square)) return side;
    }
    return null;
  }
  if (v === "threecheck") return checks.w >= 3 ? "w" : checks.b >= 3 ? "b" : null;
  return null;
}

const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? "");

/** Legal moves of the side to move that win the variant on the spot. */
export function winningMoves(fen: string, vs: VariantState): string[] {
  if (vs.variant === "none") return [];
  const g = new Chess(fen), side = g.turn(), out: string[] = [];
  for (const m of g.moves({ verbose: true })) {
    const h = new Chess(fen); h.move(m);
    const ck = { ...vs.checks }; if (/[+#]$/.test(m.san)) ck[side]++;
    if (variantWinner(h, vs.variant, ck) === side) out.push(uciOf(m));
  }
  return out;
}

/** Does playing `uci` leave the opponent a move that wins the variant next turn? (A king one step from the
 *  centre, or the opponent's third check.) */
export function letsOpponentWin(fen: string, uci: string, vs: VariantState): boolean {
  if (vs.variant === "none") return false;
  const g = new Chess(fen), side = g.turn();
  let m;
  try { m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return false; }
  const ck = { ...vs.checks }; if (/[+#]$/.test(m.san)) ck[side]++;
  if (variantWinner(g, vs.variant, ck) || g.isGameOver()) return false;   // this move itself ends the game: not "next move"
  return winningMoves(g.fen(), { variant: vs.variant, checks: ck }).length > 0;
}

/** The bot's choice in a variant, from three inputs: the engine's move, the engine's other candidates (best first),
 *  and the legal moves. 1) take a winning variant move if there is one; 2) avoid a move that lets the learner win
 *  next move; 3) otherwise the engine's move. Pure. */
export function variantChoice(fen: string, vs: VariantState, engineMove: string, ranked: string[], legal: string[], rand: () => number = Math.random): string {
  if (vs.variant === "none") return engineMove;
  const wins = winningMoves(fen, vs);
  if (wins.length) return wins[Math.floor(rand() * wins.length)];
  if (!letsOpponentWin(fen, engineMove, vs)) return engineMove;
  const safe = (u: string) => !letsOpponentWin(fen, u, vs);
  return ranked.find(safe) ?? legal.find(safe) ?? engineMove;
}
