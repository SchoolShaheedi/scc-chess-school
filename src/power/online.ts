// Magical Chess with friends online (Stage 2, 02_Design/MAGICAL-ONLINE-PLAN.md). The server and the app must agree on
// every gem, so both run THIS file: the server function (supabase/functions/play-move) gets a copy made by
// tools/sync-magical.mjs, and test/magical-online.test.ts fails if the copy has drifted.
// A game is its seed, its moves (plain UCI) and the plies at which a piece changed into its gem's piece.
import { Chess } from "chess.js";
import { afterMove, gemFor, newPower, type PowerState } from "./rules";

/** The position and the gems after the given moves. */
export function replayMagical(seed: number, moves: string[], changes: number[]): PowerState {
  let st = newPower(seed);
  moves.forEach((u, i) => {
    const g = new Chess(st.fen), m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    st = afterMove(st, m, g.fen(), changes.includes(i));
  });
  return st;
}

export type MagicalMove = { ok: true; st: PowerState; lan: string; changed: boolean } | { ok: false; error: string };
/** One more move, checked: legal from the current position, and a change only where the piece (never a king) landed
 *  on a gem. The result's `st.fen` is the position the other player now moves in. */
export function playMagical(seed: number, moves: string[], changes: number[], uci: string, change: boolean): MagicalMove {
  const st = replayMagical(seed, moves, changes), g = new Chess(st.fen);
  let m;
  try { m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return { ok: false, error: "illegal move" }; }
  const gem = gemFor(st, m);
  if (change && !gem) return { ok: false, error: "no gem there" };
  return { ok: true, st: afterMove(st, m, g.fen(), change), lan: m.lan, changed: change && !!gem };
}

/** For the screen: the state after every ply (states[0] = the start), each move as written (a change as "Nxe4=R✨",
 *  the way the bot game writes it), and each move's squares. */
export function magicalLine(seed: number, moves: string[], changes: number[]): { states: PowerState[]; sans: string[]; last: [string, string][] } {
  let st = newPower(seed);
  const states = [st], sans: string[] = [], last: [string, string][] = [];
  moves.forEach((u, i) => {
    const g = new Chess(st.fen), m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }), gem = gemFor(st, m), ch = changes.includes(i) && !!gem;
    st = afterMove(st, m, g.fen(), ch);
    const after = new Chess(st.fen);
    sans.push(ch ? `${m.san.replace(/[+#]$/, "")}=${gem!.piece.toUpperCase()}${after.isCheckmate() ? "#" : after.inCheck() ? "+" : ""}✨` : m.san);
    states.push(st); last.push([m.from, m.to]);
  });
  return { states, sans, last };
}
