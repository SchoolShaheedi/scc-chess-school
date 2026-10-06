// Optional sign-in, so progress follows the learner to any device (DECISIONS #37, #38).
// Supabase holds two things per account: the email (in Supabase Auth) and one row of progress
// (table public.progress, see supabase/schema.sql; row-level security means a user can only
// ever read or write their own row). With no keys configured the app simply has no sign-in.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { forgetGames } from "./play/history";
import { asFamily, type Family } from "./merge";
import { family } from "./family";
import { pushSummaries } from "./teach/api";
import { store } from "./store";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const syncConfigured = !!(URL && KEY);

let db: SupabaseClient | null = null;
let session: Session | null = null;
let lastSaved: Date | null = null;
let ready = false;              // true once Supabase has said whether a session exists
let pushTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(f => f());

/** The Supabase client and the signed-in user, for the classes code (src/teach/api.ts). */
export const dbClient = () => (session ? db : null);
export const userId = () => session?.user.id ?? null;

export const account = {
  email: () => session?.user.email ?? null,
  signedIn: () => !!session,
  ready: () => ready,
  lastSaved: () => lastSaved,
  subscribe(f: () => void) { listeners.add(f); return () => listeners.delete(f); },
};

const redirect = () => location.origin + location.pathname;

export async function signInWithGoogle() {
  await db!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect() } });
}

/** Sends a one-tap sign-in link. No password to remember, and nothing for a child to forget. */
export async function signInWithEmail(email: string): Promise<string | null> {
  const { error } = await db!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
  return error ? error.message : null;
}

// Shared devices (school tablets): the progress on this device belongs to ONE account. Signing out or deleting
// the account wipes it, and progress is only merged into an account that owns it (security review 2026-10-04).
const OWNER = "scc-school-owner";
const owner = () => { try { return localStorage.getItem(OWNER); } catch { return null; } };
const setOwner = (id: string | null) => { try { if (id) localStorage.setItem(OWNER, id); else localStorage.removeItem(OWNER); } catch { /* storage blocked */ } };
const forgetDevice = () => { setOwner(null); forgetGames(); family.reset(); store.reset(); };

export async function signOut() { await db?.auth.signOut(); forgetDevice(); }

/** Right to erasure: removes the progress row and the account itself (supabase/schema.sql). */
export async function deleteAccount(): Promise<string | null> {
  const { error } = await db!.rpc("delete_my_account");
  if (error) return error.message;
  await db!.auth.signOut();
  forgetDevice();
  return null;
}

async function pull(): Promise<Family | null> {
  const { data, error } = await db!.from("progress").select("data").eq("user_id", session!.user.id).maybeSingle();
  if (error) { console.warn("progress pull failed", error.message); return null; }
  return asFamily(data?.data);   // a row from before profiles becomes the first child
}

async function push() {
  if (!session) return;
  const { error } = await db!.from("progress").upsert({
    user_id: session.user.id, data: family.snapshot(), updated_at: new Date().toISOString(),
  });
  if (error) console.warn("progress save failed", error.message);
  else { lastSaved = new Date(); notify(); void pushSummaries(); }
}

/** On sign-in, the device's progress and the account's are merged, so nothing done offline is lost. */
async function onSignedIn() {
  // progress left by a DIFFERENT account must never be merged into this one
  const prev = owner();
  if (prev && prev !== session!.user.id) { family.reset(); store.reset(); }
  setOwner(session!.user.id);
  family.applyRemote(await pull());   // every child on the account, merged with this device's
  await push();
}

export function startSync() {
  if (!syncConfigured) return;
  db = createClient(URL!, KEY!, { auth: { persistSession: true, detectSessionInUrl: true } });
  db.auth.onAuthStateChange((event, s) => {
    const was = !!session;
    session = s; ready = true;
    notify();
    if (s && (!was || event === "SIGNED_IN")) void onSignedIn();
  });
  // every change to progress is saved a moment later (batched, so a fast lesson is one write)
  const later = () => {
    if (!session) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void push(), 1500);
  };
  store.subscribe(later);
  family.subscribe(later);   // adding, removing or switching a child is saved too
}
