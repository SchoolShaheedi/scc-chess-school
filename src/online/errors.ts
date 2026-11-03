// What the server functions (play-move, puzzle-battle) say when they refuse. supabase-js hides the answer on a non-2xx
// reply ("Edge Function returned a non-2xx status code"), so the JSON body is read from error.context and the known
// messages are shown in the player's language.
import { t, type UIKey } from "../i18n";

const KNOWN: Record<string, UIKey> = {
  "not your turn": "srvNotYourTurn", "illegal move": "srvIllegalMove", "bad move": "srvIllegalMove", "the game is over": "srvGameOver",
  "the game changed, try again": "srvTryAgain", "the battle changed, try again": "srvTryAgain", "there is still time": "srvStillTime",
  "sign in first": "srvSignIn", "not your player": "srvNotYours", "not your game": "srvNotYours", "not your battle": "srvNotYours",
  "no such game": "srvGone", "no such battle": "srvGone", "that invitation has gone": "srvGone", "the game is too long": "srvGameOver",
  "the battle is over": "srvGameOver", "the battle is not running": "srvGameOver", "you have finished the set": "srvGameOver",
  "too fast": "srvTooFast", "it has not started yet": "srvTryAgain", "the puzzle bank is not reachable, try again": "srvTryAgain",
  "not enough puzzles, try again": "srvTryAgain", "game state error": "srvTryAgain", "battle state error": "srvTryAgain", "bad request": "srvTryAgain",
};
/** The server's own message for a known refusal, translated; anything else becomes a general "try again". */
export function serverMessage(raw: string | null | undefined): string {
  const k = raw ? KNOWN[raw.trim().toLowerCase()] : undefined;
  return k ? t(k) : t("srvTryAgain");
}
/** The message from a failed functions.invoke: reads the JSON body (`{ error }`) that supabase-js leaves in error.context. */
export async function invokeError(error: unknown): Promise<string> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } })?.context;
    const body = ctx?.json ? await ctx.json() : null;
    return serverMessage(body?.error);
  } catch { return t("srvTryAgain"); }
}
