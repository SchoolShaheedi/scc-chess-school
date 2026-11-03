// Puzzle Battle with friends and classmates (class features 2026-11-03, not yet in DECISIONS.md): the calls the app makes. Every rule that protects children
// is in the database (supabase/battles.sql) and the puzzle-battle server function; this file only asks. It needs a
// connection and a signed-in account: there is no offline battle.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { dbClient } from "../sync";
import { clockSkew, type BattleLevel, type EndReason, type PublicPuzzle, type Winner } from "./rules";

export interface Battle {
  id: string; from_player: string; to_player: string; level: BattleLevel;
  status: "invited" | "active" | "finished" | "declined" | "cancelled"; target: number; seconds: number;
  puzzles: PublicPuzzle[] | null; started_at: string | null;
  a_idx: number; a_step: number; a_solved: number; a_missed: number; a_last: string | null; a_t: string | null;
  b_idx: number; b_step: number; b_solved: number; b_missed: number; b_last: string | null; b_t: string | null;
  winner: Winner | null; reason: EndReason | null; created_at: string; finished_at: string | null;
}
/** What the server says about one move. */
export interface MoveReply { error?: string; ok?: boolean; solved?: boolean; reply?: string | null; over?: boolean; winner?: Winner | null; reason?: EndReason | null }

const db = () => dbClient();
const err = (e: { message: string } | null) => (e ? e.message : null);

export async function inviteBattle(player: string, to: string, level: BattleLevel): Promise<string | null> {
  const { error } = await db()!.rpc("battle_invite", { p_player: player, p_to: to, p_level: level }); return err(error);
}
export async function declineBattle(player: string, id: string) { await db()!.rpc("battle_decline", { p_player: player, p_battle: id }); }
export async function cancelBattle(player: string, id: string) { await db()!.rpc("battle_cancel", { p_player: player, p_battle: id }); }
export async function leaveBattle(player: string, id: string) { await db()!.rpc("battle_leave", { p_player: player, p_battle: id }); }
/** Invitations (fresh, within ten minutes) and a battle that is running, to or from this player. */
export async function openBattles(player: string): Promise<Battle[]> {
  const { data } = await db()!.from("battles").select("*").in("status", ["invited", "active"]).or(`from_player.eq.${player},to_player.eq.${player}`)
    .gt("created_at", new Date(Date.now() - 20 * 60000).toISOString()).order("created_at", { ascending: false });
  return ((data as Battle[]) ?? []).filter(b => b.status === "active" || Date.parse(b.created_at) > Date.now() - 10 * 60000);
}
export async function getBattle(id: string): Promise<Battle | null> {
  const { data } = await db()!.from("battles").select("*").eq("id", id).maybeSingle(); return (data as Battle) ?? null;
}
/** The invited player says yes: the server picks the puzzles and starts the countdown. Returns an error, or null. */
export async function acceptBattle(player: string, id: string): Promise<string | null> {
  const { data, error } = await db()!.functions.invoke("puzzle-battle", { body: { action: "accept", battle: id, player } });
  return error ? (data?.error ?? error.message) : null;
}
/** One of my moves in the current puzzle: the server judges it and sends back the opponent's reply, if there is one. */
export async function battleMove(battle: string, player: string, uci: string): Promise<MoveReply> {
  const { data, error } = await db()!.functions.invoke("puzzle-battle", { body: { action: "move", battle, player, uci } });
  return error ? { error: data?.error ?? error.message } : (data as MoveReply);
}
/** Where my current puzzle stands on the server (after my own moves so far), for a phone that came back mid-puzzle. */
export async function battlePosition(battle: string, player: string): Promise<{ fen: string; step: number; idx: number } | null> {
  const { data, error } = await db()!.functions.invoke("puzzle-battle", { body: { action: "position", battle, player } });
  return error || !data?.fen ? null : (data as { fen: string; step: number; idx: number });
}
/** Time is up (or both are through the set): ask the server to finish the battle (it checks the time itself). */
export async function claimBattle(battle: string, player: string) {
  await db()!.functions.invoke("puzzle-battle", { body: { action: "claim", battle, player } });
}
/** How far this device's clock is from the server's, in ms (positive = the server is ahead). 0 if it can't be asked. */
export async function serverSkew(): Promise<number> {
  const sent = Date.now();
  const { data, error } = await db()!.rpc("server_now");
  if (error || !data) return 0;
  return clockSkew(Date.parse(data as string), sent, Date.now());
}
/** Live updates of one battle (the database only sends rows this player may read). */
export function watchBattle(id: string, on: (b: Battle) => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`battle:${id}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "battles", filter: `id=eq.${id}` }, p => on(p.new as Battle)).subscribe();
  return () => { void db()?.removeChannel(ch); };
}
/** New or changed battle invitations to or from this player. */
export function watchBattles(player: string, on: () => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`battles:${player}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "battles", filter: `to_player=eq.${player}` }, on)
    .on("postgres_changes", { event: "*", schema: "public", table: "battles", filter: `from_player=eq.${player}` }, on).subscribe();
  return () => { void db()?.removeChannel(ch); };
}
