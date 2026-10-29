// Optional sign-in, so progress follows the learner to any device (DECISIONS #37, #38).
// Supabase holds two things per account: the email (in Supabase Auth) and one row of progress
// (table public.progress, see supabase/schema.sql; row-level security means a user can only
// ever read or write their own row). With no keys configured the app simply has no sign-in.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { forgetGames } from "./play/history";
import { asFamily, type Family } from "./merge";
import { family } from "./family";
import { forgetClasses, pushSummaries } from "./teach/api";
import { store } from "./store";
import { APP_RETURN_URL, NATIVE, onReturnToApp, openSignInPage } from "./native";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const syncConfigured = !!(URL && KEY);

let db: SupabaseClient | null = null;
let session: Session | null = null;
let lastSaved: Date | null = null;
// true once this account's progress has been read (or found empty). Nothing is saved before that, so a failed or
// slow read can never overwrite the account with an empty device (review 2026-10-18)
let synced = false;
let syncingFor: string | null = null;   // the account onSignedIn is running (or has run) for
let returnFailed = false;     // the Android app was opened by a sign-in link that did not work (#123)
let ready = false;              // true once Supabase has said whether a session exists
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let merging = false;            // true while another device's progress is merged in: that is not a new change to save
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
  /** True once, after a sign-in link came back to the app with an error (an expired or used link). */
  takeReturnError: () => { const r = returnFailed; returnFailed = false; return r; },
  /** The same, without clearing it (for the router). */
  returnPending: () => returnFailed,
  subscribe(f: () => void) { listeners.add(f); return () => listeners.delete(f); },
};

// the Android app returns through its own address (#123); the website to itself
const redirect = () => (NATIVE ? APP_RETURN_URL : location.origin + location.pathname);

export async function signInWithGoogle() {
  if (!NATIVE) { await db!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect() } }); return; }
  // in the app: Google's page opens in a browser tab, never in the app's own web view (Google refuses that)
  const { data } = await db!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect(), skipBrowserRedirect: true } });
  if (data?.url) await openSignInPage(data.url);
}

/** The app was opened through its return address: the tokens are after the "#" (Supabase's implicit flow), or an
 *  error is. A link that carries neither is ignored. Exported for test/native-signin.test.ts. */
export function tokensFrom(url: string): { access_token: string; refresh_token: string } | { error: string } | null {
  const hash = url.split("#")[1] ?? url.split("?")[1] ?? "";
  const q = new URLSearchParams(hash);
  const access_token = q.get("access_token"), refresh_token = q.get("refresh_token");
  if (access_token && refresh_token) return { access_token, refresh_token };
  const error = q.get("error_description") ?? q.get("error");
  return error ? { error } : null;
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
// store.reset() keeps the device's "set up" mark for Settings → Reset; after a sign-out the next person is asked
// their age again, and never sees the last account's "saved at" time or classes
const forgetDevice = () => {
  setOwner(null); forgetGames(); family.reset(); store.reset(); store.set({ onboarded: false });
  synced = false; syncingFor = null; lastSaved = null; forgetClasses();
};

/** Saves now anything still waiting (a change in the last 1.5 s), so signing out never drops it (DECISIONS #128). */
async function flush() { clearTimeout(pushTimer); if (session && synced) await push(); }

export async function signOut() { await flush(); await db?.auth.signOut(); forgetDevice(); }

/** Right to erasure: removes the progress row and the account itself (supabase/schema.sql). */
export async function deleteAccount(): Promise<string | null> {
  const { error } = await db!.rpc("delete_my_account");
  if (error) return error.message;
  await db!.auth.signOut();
  forgetDevice();
  return null;
}

/** The account's family; null when the account has no progress yet; undefined when it could not be read. */
async function pull(userId: string): Promise<Family | null | undefined> {
  const { data, error } = await db!.from("progress").select("data").eq("user_id", userId).maybeSingle();
  if (error) { console.warn("progress pull failed", error.message); return undefined; }
  return asFamily(data?.data);   // a row from before profiles becomes the first child
}

async function push() {
  if (!session || !synced) return;
  const id = session.user.id;
  // read the row again first and merge it in: a tablet left open all day must not overwrite the lessons the child did
  // on a phone since (DECISIONS #128); if it cannot be read, try again shortly rather than save over it
  const remote = await pull(id);
  if (session?.user.id !== id || !synced) return;
  if (remote === undefined) { clearTimeout(pushTimer); pushTimer = setTimeout(() => void push(), 15000); return; }
  if (remote) { merging = true; try { family.applyRemote(remote); } finally { merging = false; } }
  const { error } = await db!.from("progress").upsert({
    user_id: id, data: family.snapshot(), updated_at: new Date().toISOString(),
  });
  if (error) console.warn("progress save failed", error.message);
  else { lastSaved = new Date(); notify(); void pushSummaries().catch(() => {}); }
}

/** On sign-in, the device's progress and the account's are merged, so nothing done offline is lost. */
async function onSignedIn() {
  const id = session!.user.id;
  // progress left by a DIFFERENT account must never be merged into this one
  const prev = owner();
  // ...nor may its saved games, Insights or classes stay on a shared tablet (DECISIONS #128)
  if (prev && prev !== id) { forgetGames(); family.reset(); store.reset(); store.set({ onboarded: false }); lastSaved = null; forgetClasses(); }
  setOwner(id);
  const remote = await pull(id);
  if (session?.user.id !== id) return;   // signed out (or someone else signed in) while it was being read
  if (remote === undefined) {            // not read: try again shortly, and save nothing until it is
    setTimeout(() => { if (session?.user.id === id && !synced) void onSignedIn(); }, 15000);
    return;
  }
  // every child on the account, merged with this device's; on a device this account has never used, the account's
  // own children (age band, animal, colour) win over the device's untouched first child
  family.applyRemote(remote, !prev);
  // a learner who already has progress is not asked their age again on a new device
  const s = store.get();
  if (!s.onboarded && remote && (s.xp > 0 || Object.keys(s.lessons).length > 0 || s.placed !== undefined)) store.set({ onboarded: true });
  synced = true;
  notify();
  await push();
}

export function startSync() {
  if (!syncConfigured) return;
  db = createClient(URL!, KEY!, { auth: { persistSession: true, detectSessionInUrl: !NATIVE } });
  // the Android app is opened through its return address with the sign-in tokens; Supabase then signs in as usual
  if (NATIVE) onReturnToApp(url => {
    const got = tokensFrom(url);
    if (got && "access_token" in got) void db!.auth.setSession(got);
    else if (got) { console.warn("sign-in came back with an error:", got.error); returnFailed = true; notify(); }
  });
  db.auth.onAuthStateChange((_event, s) => {
    session = s; ready = true;
    notify();
    // once per account: supabase-js also says SIGNED_IN when a tab comes back into view, which is not a new sign-in
    if (s && syncingFor !== s.user.id) { syncingFor = s.user.id; synced = false; void onSignedIn(); }
    if (!s) { syncingFor = null; synced = false; }
  });
  // every change to progress is saved a moment later (batched, so a fast lesson is one write)
  const later = () => {
    if (!session || merging) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void push(), 1500);
  };
  store.subscribe(later);
  family.subscribe(later);   // adding, removing or switching a child is saved too
}
