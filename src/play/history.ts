// Your games (DECISIONS #84): the last 50 finished games of the child using the app, kept on this device only
// (never synced: a game list is bulky and nobody else needs it). Each can be replayed in Game Review.
import { family } from "../family";
import type { Text } from "../lesson/types";
import { isPreview } from "../store";

export interface SavedGame {
  at: string;                         // ISO date-time it ended
  opp: Text; oppRating?: number;      // the bot, or "Black"/"White" for a friend game
  me: "w" | "b"; meName?: Text;
  result: "won" | "lost" | "draw";
  tc?: string;                        // "10", "5", "3+2"; absent = untimed
  uci: string[]; startFen?: string;
}
const MAX = 50;
const key = () => `scc-games-${family.current().id}`;

export function games(): SavedGame[] {
  try { return JSON.parse(localStorage.getItem(key()) ?? "[]") as SavedGame[]; } catch { return []; }
}
export function saveGame(g: SavedGame) {
  if (isPreview() || g.uci.length < 2) return;   // previews never save; a game with no real moves is not worth keeping
  try { localStorage.setItem(key(), JSON.stringify([g, ...games()].slice(0, MAX))); } catch { /* storage full or blocked */ }
}
/** Sign-out on a shared device wipes every child's games too (sync.ts forgetDevice). */
export function forgetGames() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith("scc-games-")) localStorage.removeItem(k); } catch { /* blocked */ }
}
