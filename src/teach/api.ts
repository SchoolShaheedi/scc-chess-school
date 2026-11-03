// Classes (DECISIONS #82): the calls the app makes. Every rule that protects children is in the database
// (supabase/classes.sql); this file only asks. Nothing here runs unless someone is signed in.
import { family } from "../family";
import type { Saved } from "../merge";
import { today } from "../store";
import { dbClient, userId } from "../sync";
import { summaryOf, type Summary } from "./summary";

export interface ClassRow { id: string; code: string; title: string; homework: string | null }
export interface Pupil { parent: string; profile_id: string; avatar: string; colour: string; summary: Partial<Summary>; updated_at: string; approved: boolean }
export interface Joined { class_id: string; profile_id: string; title: string; homework: string | null; approved: boolean }

const db = () => dbClient();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no I, O, 0 or 1: nothing to misread
export const newCode = (rand = Math.random) => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join("");

// ---------- teachers ----------
export async function isTeacher(): Promise<boolean> {
  const c = db(); if (!c) return false;
  const { data } = await c.rpc("is_teacher"); return data === true;
}
export async function teacherClasses(): Promise<ClassRow[]> {
  if (!db()) return [];
  const { data } = await db()!.from("classes").select("id, code, title, homework").order("created_at");
  return (data as ClassRow[]) ?? [];
}
export async function createClass(title: string): Promise<string | null> {
  for (let tries = 0; tries < 5; tries++) {           // a clash with an existing code is rare; try a new one
    const { error } = await db()!.from("classes").insert({ code: newCode(), title: title.trim().slice(0, 40) });
    if (!error) return null;
    if (!/duplicate|unique/i.test(error.message)) return error.message;
  }
  return "Could not make a unique code. Try again.";
}
export async function setHomework(classId: string, lesson: string | null) {
  await db()!.from("classes").update({ homework: lesson }).eq("id", classId);
}
export async function deleteClass(classId: string) { await db()!.from("classes").delete().eq("id", classId); }
export async function pupils(classId: string): Promise<Pupil[]> {
  if (!db()) return [];
  const { data } = await db()!.from("memberships").select("parent, profile_id, avatar, colour, summary, updated_at, approved").eq("class_id", classId).order("joined_at");
  return (data as Pupil[]) ?? [];
}
/** How many pupils are waiting to be let in, per class (for the badge on the teacher's class list). */
export async function waitingCounts(): Promise<Record<string, number>> {
  if (!db()) return {};
  const { data } = await db()!.from("memberships").select("class_id").eq("approved", false);
  const out: Record<string, number> = {};
  for (const r of (data as { class_id: string }[]) ?? []) out[r.class_id] = (out[r.class_id] ?? 0) + 1;
  return out;
}
/** The teacher lets a waiting pupil in (the database checks it is THEIR class). Returns an error message or null. */
export async function approvePupil(classId: string, p: Pupil): Promise<string | null> {
  const { error } = await db()!.rpc("approve_member", { p_class: classId, p_parent: p.parent, p_profile: p.profile_id }); return error?.message ?? null;
}
/** The teacher turns a waiting pupil away. */
export async function rejectPupil(classId: string, p: Pupil): Promise<string | null> {
  const { error } = await db()!.rpc("reject_member", { p_class: classId, p_parent: p.parent, p_profile: p.profile_id }); return error?.message ?? null;
}
/** Pupils the teacher has let in, and those still waiting. */
export const splitPupils = (all: Pupil[]) => ({ approved: all.filter(p => p.approved), waiting: all.filter(p => !p.approved) });
export async function removePupil(classId: string, p: Pupil) {
  await db()!.from("memberships").delete().eq("class_id", classId).eq("parent", p.parent).eq("profile_id", p.profile_id);
}

// ---------- parents ----------
/** The class title for a code, or null; `limited` is true when this account has made too many wrong guesses (10 an hour). */
export async function previewClass(code: string): Promise<{ title: string | null; limited: boolean }> {
  if (!db()) return { title: null, limited: false };
  const { data, error } = await db()!.rpc("class_preview", { p_code: code.trim() });
  if (error) return { title: null, limited: isLimited(error.message) };
  return { title: (data as { title: string }[] | null)?.[0]?.title ?? null, limited: false };
}
export const isLimited = (msg: string) => /too many/i.test(msg);
export async function joinClass(code: string): Promise<string | null> {
  const p = family.current();
  const { data, error } = await db()!.rpc("join_class", { p_code: code.trim(), p_profile: p.id, p_avatar: p.avatar, p_colour: p.colour });
  if (error) return error.message;
  if (!data) return "no class with that code";    // a wrong code comes back empty (so the miss is counted)
  joined = null; await pushSummaries(); return null;
}
let joined: Joined[] | null = null;
/** Sign-out: the next account must not see this one's classes (sync.ts forgetDevice). */
export const forgetClasses = () => { joined = null; };
export async function myClasses(fresh = false): Promise<Joined[]> {
  const c = db(); if (!c) return [];
  if (joined && !fresh) return joined;
  const { data } = await c.rpc("my_classes");
  joined = (data as Joined[]) ?? []; return joined;
}
export async function leaveClass(classId: string, profileId: string) {
  await db()!.from("memberships").delete().eq("class_id", classId).eq("parent", userId()!).eq("profile_id", profileId);
  joined = null;
}

/** Keep each class's summary of each child up to date (only the five numbers). */
export async function pushSummaries() {
  const c = db(); if (!c) return;
  const mine = await myClasses(); if (!mine.length) return;
  const snap = family.snapshot();
  for (const m of mine) {
    const saved = snap.saved[m.profile_id] as Saved | undefined; if (!saved) continue;
    await c.from("memberships").update({ summary: summaryOf(saved, today()), updated_at: new Date().toISOString() })
      .eq("class_id", m.class_id).eq("parent", userId()!).eq("profile_id", m.profile_id);
  }
}

// ---------- class leaderboards (DECISIONS #89) ----------
export interface BoardRow { avatar: string; colour: string; days: number; lessons: number; puzzles: number; points: number; me: boolean }
/** This week's board for one of my children in one class: classmates whose parents agreed, plus my child. */
export async function classBoard(classId: string, profileId: string): Promise<BoardRow[]> {
  const c = db(); if (!c) return [];
  const { data } = await c.rpc("class_leaderboard", { p_class: classId, p_profile: profileId }); return (data as BoardRow[]) ?? [];
}
/** Whether each of my children is shown on each class board (the parent's switch). */
export async function onBoard(): Promise<Record<string, boolean>> {
  const c = db(); if (!c) return {};
  const { data } = await c.from("memberships").select("class_id, profile_id, on_board").eq("parent", userId()!);
  return Object.fromEntries(((data as { class_id: string; profile_id: string; on_board: boolean }[]) ?? []).map(m => [`${m.class_id}:${m.profile_id}`, m.on_board]));
}
export async function setOnBoard(classId: string, profileId: string, on: boolean) {
  await db()?.rpc("set_on_board", { p_class: classId, p_profile: profileId, p_on: on });
}
