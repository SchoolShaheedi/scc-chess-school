// Rewards you can see (DECISIONS #94): cosmetics earned by learning, never bought. Everything that was already in
// Settings stays free, except that new 10-15 learners start on the plain pieces and EARN the user's illustrated
// Classic set (anyone who already had it keeps it: `unlocked`). Each reward says exactly what unlocks it.
import type { Text } from "./lesson/types";
import { type State, store, unlockAll } from "./store";

export type RewardKind = "pieces" | "board" | "frame";
export interface Reward {
  id: string; kind: RewardKind; value: string; name: Text;
  /** What unlocks it, in words, and how far along the learner is: [now, needed]. */
  need: Text; progress: (s: Readonly<State>) => [number, number];
}

const passed = (n: number) => (s: Readonly<State>): [number, number] =>
  [s.tests[n]?.passed || s.placed > n ? 1 : 0, 1];
const lessonsOf = (s: Readonly<State>) => Object.keys(s.lessons).length;

export const REWARDS: Reward[] = [
  { id: "pieces:A", kind: "pieces", value: "A", name: { en: "Classic pieces", pa: "ਕਲਾਸਿਕ ਮੋਹਰੇ" },
    need: { en: "Pass the Level 1 test", pa: "ਪੱਧਰ ੧ ਦੀ ਪਰਖ ਪਾਸ ਕਰੋ" }, progress: passed(1) },
  { id: "frame:gold", kind: "frame", value: "gold", name: { en: "Gold frame", pa: "ਸੁਨਹਿਰੀ ਘੇਰਾ" },
    need: { en: "Practise 3 days in a row", pa: "੩ ਦਿਨ ਲਗਾਤਾਰ ਅਭਿਆਸ ਕਰੋ" }, progress: s => [Math.min(s.streak.days, 3), 3] },
  { id: "board:gold", kind: "board", value: "gold", name: { en: "Gold board", pa: "ਸੁਨਹਿਰੀ ਬਿਸਾਤ" },
    need: { en: "Finish 10 lessons", pa: "੧੦ ਪਾਠ ਪੂਰੇ ਕਰੋ" }, progress: s => [Math.min(lessonsOf(s), 10), 10] },
  { id: "frame:phulkari", kind: "frame", value: "phulkari", name: { en: "Phulkari frame", pa: "ਫੁਲਕਾਰੀ ਘੇਰਾ" },
    need: { en: "Practise 7 days in a row", pa: "੭ ਦਿਨ ਲਗਾਤਾਰ ਅਭਿਆਸ ਕਰੋ" }, progress: s => [Math.min(s.streak.days, 7), 7] },
  { id: "board:river", kind: "board", value: "river", name: { en: "River board", pa: "ਦਰਿਆ ਦੀ ਬਿਸਾਤ" },
    need: { en: "Pass the Level 2 test", pa: "ਪੱਧਰ ੨ ਦੀ ਪਰਖ ਪਾਸ ਕਰੋ" }, progress: passed(2) },
  { id: "board:night", kind: "board", value: "night", name: { en: "Night board", pa: "ਰਾਤ ਦੀ ਬਿਸਾਤ" },
    need: { en: "Earn 1,000 XP", pa: "੧,੦੦੦ XP ਕਮਾਓ" }, progress: s => [Math.min(s.xp, 1000), 1000] },
];

export const rewardFor = (kind: RewardKind, value: string) => REWARDS.find(r => r.kind === kind && r.value === value);

/** Earned: its condition is met now, it was earned before (kept for good), or the developer's unlock switch is on. */
export function earned(r: Reward, s: Readonly<State> = store.get()): boolean {
  if (unlockAll() || s.unlocked?.includes(r.id)) return true;
  const [now, need] = r.progress(s);
  return now >= need;
}

/** May the learner use this piece set / board / frame? Anything that is not a reward is free. */
export function allowed(kind: RewardKind, value: string, s: Readonly<State> = store.get()): boolean {
  const r = rewardFor(kind, value);
  return !r || earned(r, s);
}

/** The reward closest to being earned (the "next unlock" banner), or null when all are earned. */
export function nextUnlock(s: Readonly<State> = store.get()): Reward | null {
  const left = REWARDS.filter(r => !earned(r, s));
  if (!left.length) return null;
  return left.reduce((a, b) => { const [an, ad] = a.progress(s), [bn, bd] = b.progress(s); return bn / bd > an / ad ? b : a; });
}

/** Record every reward earned so far, so it stays earned (e.g. a streak that later breaks). Returns the newly earned. */
export function collect(): Reward[] {
  const s = store.get(), have = new Set(s.unlocked ?? []);
  const fresh = REWARDS.filter(r => !have.has(r.id) && r.progress(s)[0] >= r.progress(s)[1]);
  if (fresh.length) store.set({ unlocked: [...have, ...fresh.map(r => r.id)] });
  return fresh;
}
