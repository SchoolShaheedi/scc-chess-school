// The teacher-run class simul (class features 2026-11-03, not yet in DECISIONS.md): the calls the app makes. Every rule that protects children is in the
// database (supabase/simul.sql); a simul board is an ordinary game, so moves go through play-move like any online game.
// Needs a connection and a signed-in, approved teacher; nothing here runs offline.
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Game } from "../online/api";
import { dbClient, userId } from "../sync";

export interface Simul { id: string; class_id: string; teacher_player: string | null; status: "active" | "finished"; created_at: string }
/** Which game is which pupil: animal + colour, and the ids the teacher's own device labels are keyed by. */
export interface SimulBoard { game: string; parent: string; profile_id: string; avatar: string; colour: string }

const db = () => dbClient();
const err = (e: { message: string } | null) => (e ? e.message : null);

export async function activeSimul(classId: string): Promise<Simul | null> {
  const c = db(); if (!c) return null;
  const { data } = await c.from("simuls").select("id, class_id, teacher_player, status, created_at").eq("class_id", classId).eq("status", "active").maybeSingle();
  return (data as Simul) ?? null;
}
export async function startSimul(classId: string): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await db()!.rpc("simul_start", { p_class: classId }); return { id: (data as string) ?? null, error: err(error) };
}
/** Boards for pupils who became ready after the simul started. Returns how many were added. */
export async function seatSimul(id: string): Promise<{ added: number; error: string | null }> {
  const { data, error } = await db()!.rpc("simul_seat", { p_simul: id }); return { added: (data as number) ?? 0, error: err(error) };
}
export async function endSimul(id: string): Promise<string | null> {
  const { error } = await db()!.rpc("simul_end", { p_simul: id }); return err(error);
}
export async function simulBoards(id: string): Promise<SimulBoard[]> {
  const { data } = await db()!.rpc("simul_boards", { p_simul: id }); return (data as SimulBoard[]) ?? [];
}
export async function simulGames(id: string): Promise<Game[]> {
  const { data } = await db()!.from("games").select("*").eq("simul_id", id).order("created_at"); return (data as Game[]) ?? [];
}
/** Live updates of the simul's boards (the database only sends games the teacher is in). */
export function watchSimul(id: string, on: (g: Game) => void): () => void {
  const ch: RealtimeChannel = db()!.channel(`simul:${id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `simul_id=eq.${id}` }, p => { if (p.new && "id" in p.new) on(p.new as Game); }).subscribe();
  return () => { void db()?.removeChannel(ch); };
}

// ---------- the parent's switch ----------
/** Whether each of my children has the class simul switched on, by "class:profile". */
export async function simulOkMap(): Promise<Record<string, boolean>> {
  const c = db(); if (!c) return {};
  const { data } = await c.from("memberships").select("class_id, profile_id, simul_ok").eq("parent", userId()!);
  return Object.fromEntries(((data as { class_id: string; profile_id: string; simul_ok: boolean }[]) ?? []).map(m => [`${m.class_id}:${m.profile_id}`, m.simul_ok]));
}
export async function setSimulOk(classId: string, profileId: string, on: boolean) {
  await db()?.rpc("set_simul_ok", { p_class: classId, p_profile: profileId, p_on: on });
}
