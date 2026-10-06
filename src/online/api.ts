// Live games with friends and classmates (DECISIONS #86): the calls the app makes. Every rule that protects children
// is in the database (supabase/online.sql) and the play-move server function; this file only asks.
// Nothing here runs unless someone is signed in with a real account (test mode has no account, so no online play).
import type { RealtimeChannel } from "@supabase/supabase-js";
import { family } from "../family";
import { dbClient } from "../sync";

export interface Me { id: string; friend_code: string; avatar: string; colour: string; adult: boolean; paused: boolean; rapid_r: number; rapid_n: number; blitz_r: number; blitz_n: number }
export interface Opponent { player: string; avatar: string; colour: string; friend: boolean; classmate: boolean }
export interface Challenge { id: string; from_player: string; to_player: string; tc: string; colour: string; status: string; game: string | null; created_at: string }
export interface Game {
  id: string; white: string; black: string; tc_min: number; tc_inc: number; moves: string[]; fen: string;
  white_ms: number; black_ms: number; turn_since: string | null; status: "active" | "finished";
  rated?: boolean; category?: "rapid" | "blitz" | null; white_before?: number | null; black_before?: number | null;
  result: string | null; reason: string | null; draw_offer: string | null; reaction: { by: string; code: string; at: string } | null; updated_at: string;
}
export const REACTIONS = ["gl", "gg", "ty", "wp"] as const;

const db = () => dbClient();
const err = (e: { message: string } | null) => (e ? e.message : null);
export const signedIn = () => !!db();

/** The active child's player row, if a parent has switched online play on for them. */
export async function myPlayer(profileId = family.current().id): Promise<Me | null> {
  if (!db()) return null;
  const { data } = await db()!.from("online_players").select("id, friend_code, avatar, colour, adult, paused, rapid_r, rapid_n, blitz_r, blitz_n").eq("profile_id", profileId).maybeSingle();
  // a paused grown-up profile counts as switched off (it is kept only so its rating survives)
  const me = (data as Me) ?? null;
  return me && !me.paused ? me : null;
}
export async function enableOnline(): Promise<string | null> {
  const k = family.current();
  const { error } = await db()!.rpc("enable_online", { p_profile: k.id, p_avatar: k.avatar, p_colour: k.colour });
  return err(error);
}
/** 18+ (DECISIONS #87): the account holder marks THIS profile as their own grown-up profile. One per account. */
export async function enableOnlineAdult(): Promise<string | null> {
  const k = family.current();
  const { error } = await db()!.rpc("enable_online_adult", { p_profile: k.id, p_avatar: k.avatar, p_colour: k.colour });
  return err(error);
}
/** Join the 18+ pairing pool for a clock (call every ~8 s while waiting): the new game's id once paired, else null. */
export async function findGame(player: string, tc: string): Promise<{ game: string | null; error: string | null }> {
  const { data, error } = await db()!.rpc("find_game", { p_player: player, p_tc: tc });
  return { game: (data as string) ?? null, error: err(error) };
}
export async function stopSeeking(player: string) { await db()?.rpc("stop_seeking", { p_player: player }); }
export interface Side { side: "w" | "b"; player: string | null; avatar: string | null; colour: string | null; rating: number | null }
/** Both sides of one of my games, as the other player is allowed to see them: animal, colour, rating. */
export async function gamePlayers(game: string): Promise<Side[]> {
  const { data } = await db()!.rpc("game_players", { p_game: game }); return (data as Side[]) ?? [];
}
export async function blockPlayer(player: string, other: string): Promise<string | null> {
  const { error } = await db()!.rpc("block_player", { p_player: player, p_other: other }); return err(error);
}
export async function disableOnline(player: string): Promise<string | null> {
  const { error } = await db()!.rpc("disable_online", { p_player: player }); return err(error);
}
/** A removed child takes their online player (and every friendship, challenge and game) with them. */
export async function disableOnlineFor(profileId: string) {
  const me = await myPlayer(profileId); if (me) await disableOnline(me.id);
}
export async function newFriendCode(player: string) { await db()!.rpc("new_friend_code", { p_player: player }); }
/** A friend request by code: "sent", "too_many" (10 wrong codes in an hour), "no_code" or "own_code". */
export async function addFriend(player: string, code: string): Promise<string> {
  const { data, error } = await db()!.rpc("add_friend", { p_player: player, p_code: code.trim().toUpperCase() });
  return error ? error.message : (data as string);
}
export interface Request { player: string; avatar: string; colour: string }
export async function friendRequests(player: string): Promise<Request[]> {
  const { data } = await db()!.rpc("friend_requests", { p_player: player }); return (data as Request[]) ?? [];
}
export async function answerFriend(player: string, other: string, accept: boolean) {
  await db()!.rpc("answer_friend", { p_player: player, p_other: other, p_accept: accept });
}
export async function removeFriend(player: string, other: string) { await db()!.rpc("remove_friend", { p_player: player, p_other: other }); }
export async function opponents(player: string): Promise<Opponent[]> {
  const { data } = await db()!.rpc("my_opponents", { p_player: player }); return (data as Opponent[]) ?? [];
}
export async function challenges(player: string): Promise<Challenge[]> {
  const { data } = await db()!.from("challenges").select("*").eq("status", "pending").or(`from_player.eq.${player},to_player.eq.${player}`)
    .gt("created_at", new Date(Date.now() - 10 * 60000).toISOString()).order("created_at", { ascending: false });
  return (data as Challenge[]) ?? [];
}
export async function sendChallenge(player: string, to: string, tc: string, colour: string): Promise<string | null> {
  const { error } = await db()!.rpc("challenge", { p_player: player, p_to: to, p_tc: tc, p_colour: colour }); return err(error);
}
export async function answerChallenge(player: string, id: string, accept: boolean): Promise<{ game: string | null; error: string | null }> {
  const { data, error } = await db()!.rpc("answer_challenge", { p_player: player, p_challenge: id, p_accept: accept });
  return { game: (data as string) ?? null, error: err(error) };
}
export async function cancelChallenge(player: string, id: string) { await db()!.rpc("cancel_challenge", { p_player: player, p_challenge: id }); }
export async function activeGames(player: string): Promise<Game[]> {
  const { data } = await db()!.from("games").select("*").eq("status", "active").or(`white.eq.${player},black.eq.${player}`);
  return (data as Game[]) ?? [];
}
export async function getGame(id: string): Promise<Game | null> {
  const { data } = await db()!.from("games").select("*").eq("id", id).maybeSingle(); return (data as Game) ?? null;
}
/** A move, or a claim that the opponent's time has run out: checked on the server (play-move). */
export async function sendMove(game: string, player: string, uci: string): Promise<string | null> {
  const { data, error } = await db()!.functions.invoke("play-move", { body: { game, player, uci } });
  return error ? (data?.error ?? error.message) : null;
}
export async function claimTime(game: string, player: string) {
  await db()!.functions.invoke("play-move", { body: { game, player, claim: "time" } });
}
export async function gameAction(player: string, game: string, action: "resign" | "offer_draw" | "accept_draw" | "react", code?: string) {
  const { error } = await db()!.rpc("game_action", { p_player: player, p_game: game, p_action: action, p_code: code ?? null }); return err(error);
}
/** Live updates of one game (the database only sends rows this player may read). */
export function watchGame(id: string, on: (g: Game) => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`game:${id}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` }, p => on(p.new as Game)).subscribe();
  return () => { void db()?.removeChannel(ch); };
}
/** New or changed challenges to or from this player. */
export function watchChallenges(player: string, on: () => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`challenges:${player}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `to_player=eq.${player}` }, on)
    .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `from_player=eq.${player}` }, on).subscribe();
  return () => { void db()?.removeChannel(ch); };
}
