// Progress in "Learn all the checkmates" (DECISIONS #137), kept in `store.mates` and merged by src/merge.ts.
//   done[id]  the steps ticked on a mate: "see", "watch", "help", and the practice stages "p1", "p2", "p3" (mate in 1, 2, 3 cleared)
//   cards["mate:<id>"]  the spaced-review card; a mate joins the review once "Do it with help" is done (the line is known)
// The review boxes are the openings' (src/openings/srs.ts): 1, 3, 7, 14, 30 days. Pure over the store, no DOM.
import { MATES, mateById, type Mate } from "../content/mates";
import { COUNTS } from "../content/mates-counts";
import { isDue, newCard, review, type Card } from "../openings/srs";
import { store, today } from "../store";

export const STEPS = ["see", "watch", "help", "practise", "review"] as const;
export type MateStep = (typeof STEPS)[number];
export const STAGES = [1, 2, 3] as const;
/** The positions asked at each stage: mate in 1 three times, in 2 three times, in 3 twice. */
export const STAGE_WANT: Record<number, number> = { 1: 3, 2: 3, 3: 2 };
export const cardKey = (id: string) => `mate:${id}`;

export const doneKeys = (id: string): string[] => store.get().mates?.done[id] ?? [];
export function markDone(id: string, key: string) {
  const m = store.get().mates ?? { done: {}, cards: {} }, have = m.done[id] ?? [];
  if (!have.includes(key)) store.set({ mates: { ...m, done: { ...m.done, [id]: [...have, key] } } });
}

/** The practice stages this mate has positions for (1, 2, 3), from the index of the bank. */
export const stagesOf = (id: string): number[] => STAGES.filter(n => (COUNTS[id]?.[n - 1] ?? 0) > 0);
/** How many positions a stage will ask: what the bank has, up to the wanted number. */
export const stageSize = (id: string, n: number) => Math.min(STAGE_WANT[n], COUNTS[id]?.[n - 1] ?? 0);
export const stageDone = (id: string, n: number) => doneKeys(id).includes(`p${n}`);
/** Practice is complete when every stage the mate has is cleared (a mate with no positions needs none). */
export const practiseDone = (id: string) => stagesOf(id).every(n => stageDone(id, n));
/** The step is ticked: "practise" when its stages are all cleared; the others once done. */
export const stepDone = (id: string, s: MateStep) =>
  s === "practise" ? practiseDone(id) && (stagesOf(id).length > 0 || doneKeys(id).includes("practise")) : s === "review" ? !!store.get().mates?.cards[cardKey(id)] : doneKeys(id).includes(s);
/** Learnt: seen, watched, done with help, and practised. */
export const learnt = (id: string) => (["see", "watch", "help"] as const).every(s => doneKeys(id).includes(s)) && practiseDone(id);
export const learntCount = () => MATES.filter(m => learnt(m.id)).length;

/** Joins the review (once, when "Do it with help" is first done). */
export function joinReview(id: string) {
  const m = store.get().mates ?? { done: {}, cards: {} };
  if (m.cards[cardKey(id)]) return;
  store.set({ mates: { ...m, cards: { ...m.cards, [cardKey(id)]: newCard(today()) } } });
}
export const myCards = (): { mate: Mate; card: Card }[] =>
  MATES.flatMap(mate => { const c = store.get().mates?.cards[cardKey(mate.id)]; return c ? [{ mate, card: c }] : []; });
export const dueMates = () => myCards().filter(x => isDue(x.card, today()));
export const dueCount = () => dueMates().length;
/** A finished review of one mate: clean moves it up a box, a slip sends it back to tomorrow. */
export function reviewed(id: string, clean: boolean) {
  const m = store.get().mates ?? { done: {}, cards: {} }, c = m.cards[cardKey(id)] ?? newCard(today());
  store.set({ mates: { ...m, cards: { ...m.cards, [cardKey(id)]: review(c, clean, today()) } } });
}
export { mateById };
