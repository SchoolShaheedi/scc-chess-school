// Live games with friends and classmates (DECISIONS #86): the calls the app makes. Every rule that protects children
// is in the database (supabase/online.sql) and the play-move server function; this file only asks.
// Nothing here runs unless someone is signed in with a real account (test mode has no account, so no online play).
import type { RealtimeChannel } from "@supabase/supabase-js";
import { family } from "../family";
import { dbClient } from "../sync";
import { serverSkew } from "../battle/api";
import { invokeError } from "./errors";
import type { Category } from "./matching";

export interface Me { id: string; friend_code: string; avatar: string; colour: string; adult: boolean; paused: boolean }
export interface Opponent { player: string; avatar: string; colour: string; friend: boolean; classmate: boolean }
export interface Challenge { id: string; from_player: string; to_player: string; tc: string; colour: string; status: string; game: string | null; created_at: string; variant?: Variant }
/** Normal chess, or Magical Chess (Stage 2, 02_Design/MAGICAL-ONLINE-PLAN.md). Rows from before have no variant: chess. */
export type Variant = "chess" | "magical";
/** Magical Chess online is switched on only once the database and play-move have their Stage 2 changes (the plan's
 *  step 3). Until then the app offers normal chess only, exactly as now. */
export const MAGICAL_ONLINE = true;   // switched on 2026-10-17, after play-move v4 and the magical_chess_online_stage2 migration
export interface Game {
  id: string; white: string; black: string; tc_min: number; tc_inc: number; moves: string[]; fen: string;
  white_ms: number; black_ms: number; turn_since: string | null; status: "active" | "finished";
  rated?: boolean; category?: Category | null; white_before?: number | null; black_before?: number | null;
  kind?: "friend" | "stranger"; via?: "challenge" | "seek" | "rematch" | "simul"; white_delta?: number | null; black_delta?: number | null;   // online ratings v2: the rating change is written by the database when the game ends
  simul_id?: string | null;   // a board of a teacher-run class simul (class features 2026-11-03, not yet in DECISIONS.md): the other side is the class teacher
  variant?: Variant; seed?: number | null; orbs?: { sq: string; piece: "n" | "b" | "r" | "q" }[]; changes?: number[];
  result: string | null; reason: string | null; draw_offer: string | null; reaction: { by: string; code: string; at: string } | null; updated_at: string;
}
export const REACTIONS = ["gl", "gg", "ty", "wp"] as const;

const db = () => dbClient();
const err = (e: { message: string } | null) => (e ? e.message : null);
export const signedIn = () => !!db();

/** The active child's player row, if a parent has switched online play on for them. */
export async function myPlayer(profileId = family.current().id): Promise<Me | null> {
  if (!db()) return null;
  const { data } = await db()!.from("online_players").select("id, friend_code, avatar, colour, adult, paused").eq("profile_id", profileId).maybeSingle();
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
/** Post (or refresh) an open challenge for the lobby; call every ~5 s. The game's id once someone has accepted it. */
export async function postSeek(player: string, tc: string): Promise<{ game: string | null; error: string | null }> {
  const { data, error } = await db()!.rpc("post_seek", { p_player: player, p_tc: tc });
  return { game: (data as string) ?? null, error: err(error) };
}
/** An open challenge I may accept: a grown-up sees every grown-up's; a child only friends' and classmates'. Animal, colour, rating, clock. */
export interface OpenSeek { player: string; avatar: string; colour: string; rating: number; provisional: boolean; tc: string; category: Category; waited: number; friend: boolean }
export async function openSeeks(player: string): Promise<OpenSeek[]> {
  const { data } = await db()!.rpc("open_seeks", { p_player: player }); return (data as OpenSeek[]) ?? [];
}
export async function acceptSeek(player: string, target: string): Promise<{ game: string | null; error: string | null }> {
  const { data, error } = await db()!.rpc("accept_seek", { p_player: player, p_target: target });
  return { game: (data as string) ?? null, error: err(error) };
}
export interface Rematch { id: string; game: string; from_player: string; to_player: string; status: "pending" | "accepted" | "declined" | "cancelled"; new_game: string | null; created_at: string }
export async function requestRematch(player: string, game: string): Promise<string | null> {
  const { error } = await db()!.rpc("request_rematch", { p_player: player, p_game: game }); return err(error);
}
export async function answerRematch(player: string, id: string, accept: boolean): Promise<string | null> {
  const { error } = await db()!.rpc("answer_rematch", { p_player: player, p_rematch: id, p_accept: accept }); return err(error);
}
export async function cancelRematch(player: string, id: string) { await db()?.rpc("cancel_rematch", { p_player: player, p_rematch: id }); }
/** The newest rematch offer for a game (either direction); null once it is older than a minute. */
export async function rematchFor(game: string): Promise<Rematch | null> {
  const { data } = await db()!.from("rematches").select("*").eq("game", game).order("created_at", { ascending: false }).limit(1);
  const r = ((data as Rematch[]) ?? [])[0];
  return r && (r.status !== "pending" || Date.parse(r.created_at) > Date.now() - 60000) ? r : null;
}
export function watchRematch(game: string, on: () => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`rematch:${game}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rematches", filter: `game=eq.${game}` }, on).subscribe();
  return () => { void db()?.removeChannel(ch); };
}

/** My rating for each speed, with the win/draw/loss counts and the best rating (database: rating_summary). */
export interface RatingRow { category: Category; rating: number; provisional: boolean; games: number; wins: number; draws: number; losses: number; best: number }
export async function ratingSummary(player: string): Promise<RatingRow[]> {
  const { data } = await db()!.rpc("rating_summary", { p_player: player }); return (data as RatingRow[]) ?? [];
}
/** One rated game of mine (newest first); `game` is null for the starting point carried over from the old ratings. */
export interface HistoryRow { game: string | null; at: string; rating: number; delta: number; result: "w" | "d" | "l" | null; opp_avatar: string | null; opp_colour: string | null; opp_rating: number | null; side: "w" | "b" | null; reason: string | null; moves: number }
export async function ratingHistory(player: string, category: Category, limit = 100): Promise<HistoryRow[]> {
  const { data } = await db()!.rpc("rating_history_for", { p_player: player, p_category: category, p_limit: limit }); return (data as HistoryRow[]) ?? [];
}
export interface Side { side: "w" | "b"; player: string | null; avatar: string | null; colour: string | null; rating: number | null; provisional: boolean | null }
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
export async function sendChallenge(player: string, to: string, tc: string, colour: string, variant: Variant = "chess"): Promise<string | null> {
  // normal chess sends the same four arguments as always, so it works before and after the Stage 2 database change
  const { error } = await db()!.rpc("challenge", { p_player: player, p_to: to, p_tc: tc, p_colour: colour, ...(variant === "magical" ? { p_variant: variant } : {}) });
  return err(error);
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
// Bullet needs care with latency: play-move charges a mover for the time until its move ARRIVES, so the app measures its
// own round trip (an average over the last moves) and reports it with each move; the server forgives a capped,
// quota-limited part of it (supabase/functions/play-move/lag.ts). The report is never trusted beyond that cap.
let lagMs = 0;
const noteLag = (rtt: number) => { lagMs = lagMs ? Math.round(lagMs * 0.6 + rtt * 0.4) : Math.round(rtt); };
/** Measure the round trip once when a game opens (a tiny read), so even the first move carries a lag figure. */
export async function primeLag(player: string) {
  const t0 = performance.now(); const { error } = await db()!.rpc("owns_player", { p: player });
  if (!error) noteLag(performance.now() - t0);
}
export async function sendMove(game: string, player: string, uci: string, change = false): Promise<string | null> {
  const t0 = performance.now();
  const { error } = await db()!.functions.invoke("play-move", { body: { game, player, uci, lag: lagMs, ...(change ? { change } : {}) } });
  if (!error) noteLag(performance.now() - t0);
  return error ? await invokeError(error) : null;
}
/** How far this device's clock is from the server's (ms, positive = the server is ahead), so the clocks on screen agree with the server's. */
export const clockSkew = serverSkew;
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
/** A new game with this player in it (a teacher seating a pupil at a class simul). */
export function watchNewGames(player: string, on: () => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`newgames:${player}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "games", filter: `black=eq.${player}` }, on)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "games", filter: `white=eq.${player}` }, on).subscribe();
  return () => { void db()?.removeChannel(ch); };
}
/** New or changed challenges to or from this player. */
export function watchChallenges(player: string, on: (changed: Challenge | null) => void): () => void {
  const fire = (p: { new: unknown }) => on(p.new && typeof p.new === "object" && "id" in p.new ? (p.new as Challenge) : null);
  const ch: RealtimeChannel = db()!.channel(`challenges:${player}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `to_player=eq.${player}` }, fire)
    .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `from_player=eq.${player}` }, fire).subscribe();
  return () => { void db()?.removeChannel(ch); };
}

/** The grown-up ladder (DECISIONS #89): the top 50 for a clock speed, plus my own place. Grown-up players only. */
export interface LadderRow { place: number; avatar: string; colour: string; rating: number; games: number; me: boolean; provisional: boolean }
export async function adultLadder(player: string, category: Category): Promise<LadderRow[]> {
  const { data } = await db()!.rpc("adult_ladder", { p_player: player, p_category: category }); return (data as LadderRow[]) ?? [];
}
