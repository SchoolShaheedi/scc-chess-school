// Child profiles (DECISIONS #80): several children under one parent account, each with their own progress.
// A child is told apart ONLY by an animal avatar, a colour and an age band (the look): no name, no age, nothing
// that identifies a child (#38). The store always holds the ACTIVE child's progress; the others wait here.
// Saved to the account as one object { v: 2, active, profiles, saved } (merged per child in merge.ts).
import { emptySaved, fillSaved, mergeFamily, savable, type Family, type Profile } from "./merge";
import { isPreview, type Look, store } from "./store";

export type { Profile } from "./merge";
export const AVATARS = ["cat", "dog", "rabbit", "bird", "fish", "turtle", "squirrel", "snail"] as const;
export type Avatar = (typeof AVATARS)[number];
export const COLOURS = ["#2F6B4F", "#8B1E3F", "#C6A24A", "#1D4ED8", "#7C3AED", "#E0661B"];
export const MAX_CHILDREN = 6;

const KEY = "scc-school-family";
const first = (): Family => ({ v: 2, active: "p1", profiles: [{ id: "p1", avatar: "cat", colour: COLOURS[0], look: store.get().look }], saved: {} });
let fam: Family = (() => {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Family; } catch { /* storage blocked */ }
  return first();
})();
const listeners = new Set<() => void>();
// true while a child is being switched in: the store briefly holds the old child's age band, which must not be
// copied onto the new child by the listener at the bottom (a test caught exactly that)
let switching = false;
const persist = () => {
  if (!isPreview()) try { localStorage.setItem(KEY, JSON.stringify(fam)); } catch { /* keep going in memory */ }
  listeners.forEach(f => f());
};

export const family = {
  list: (): readonly Profile[] => fam.profiles,
  current: (): Profile => fam.profiles.find(p => p.id === fam.active) ?? fam.profiles[0],
  subscribe(f: () => void) { listeners.add(f); return () => listeners.delete(f); },

  /** Everything to save to the account: the other children as stored, the active one fresh from the store. */
  snapshot(): Family { return { ...fam, saved: { ...fam.saved, [fam.active]: savable(store.get()) } }; },

  /** Switch to another child: park this child's progress, load that one's, and use their age band. */
  switchTo(id: string) {
    if (id === fam.active || !fam.profiles.some(p => p.id === id)) return;
    fam = { ...fam, saved: { ...fam.saved, [fam.active]: savable(store.get()) }, active: id };
    switching = true;
    try { store.replaceProgress(fillSaved(fam.saved[id] ?? emptySaved())); store.set({ look: family.current().look }); }
    finally { switching = false; }
    persist();
  },

  add(avatar: Avatar, colour: string, look: Look): string | null {
    if (fam.profiles.length >= MAX_CHILDREN) return null;
    const id = `p${Date.now().toString(36)}`;
    fam = { ...fam, profiles: [...fam.profiles, { id, avatar, colour, look }], saved: { ...fam.saved, [id]: emptySaved() } };
    persist(); family.switchTo(id);
    return id;
  },

  /** Remove a child that is not the one using the app now (their progress goes with them). */
  remove(id: string) {
    if (id === fam.active || fam.profiles.length < 2) return;
    const { [id]: _gone, ...saved } = fam.saved;
    try { localStorage.removeItem(`scc-games-${id}`); } catch { /* blocked */ }   // their game list goes with them
    fam = { ...fam, profiles: fam.profiles.filter(p => p.id !== id), saved };
    persist();
  },

  /** The account's family merged with this device's (sync.ts, on sign-in). */
  applyRemote(remote: Family | null) {
    const merged = remote ? mergeFamily(family.snapshot(), remote) : family.snapshot();
    fam = merged;
    switching = true;
    try { store.replaceProgress(fillSaved(fam.saved[fam.active] ?? emptySaved())); store.set({ look: family.current().look }); }
    finally { switching = false; }
    persist();
  },

  /** Sign-out on a shared device wipes every child, not just the active one. */
  reset() { fam = first(); persist(); },
};

// the age band chosen in Settings belongs to the child using the app
store.subscribe(() => {
  if (switching) return;
  const cur = family.current(), look = store.get().look;
  if (cur && cur.look !== look) { fam = { ...fam, profiles: fam.profiles.map(p => (p.id === cur.id ? { ...p, look } : p)) }; persist(); }
});
