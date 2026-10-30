// The openings review, "no set-up" (DECISIONS #133a): every course opening whose Learn step is done joins the review
// by itself, and its main line is the review card (key `course:<id>`). Pure — no DOM, no store — so it is tested alone.
// Old saved data stays harmless: a learner who had slot cards (keys `<repId>:<line>`, DECISIONS #74) keeps their
// progress, because the furthest-along old card of an opening stands in until the new card exists.
import { COURSE, type CourseOpening } from "../content/course";
import { addDays, isDue, mergeCard, newCard, type Card } from "./srs";

export interface RepData { cards: Record<string, Card>; course?: Record<string, string[]>; white?: string; e4?: string; d4?: string }
export interface ReviewLine { key: string; o: CourseOpening; card: Card }

export const cardKey = (id: string) => `course:${id}`;

/** The old slot cards of an opening, folded into one: the line furthest along wins. */
export function legacyCard(o: CourseOpening, cards: Record<string, Card>): Card | undefined {
  if (!o.rep) return undefined;
  const prefix = `${o.rep}:`;
  let best: Card | undefined;
  for (const [k, c] of Object.entries(cards)) if (k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))) best = best ? mergeCard(best, c) : c;
  return best;
}

/** Every opening in the learner's review: Learn done, or an old slot card carried over. */
export function reviewLines(rep: RepData, today: string): ReviewLine[] {
  return COURSE.flatMap(o => {
    const key = cardKey(o.id), legacy = legacyCard(o, rep.cards);
    const learnt = (rep.course?.[o.id] ?? []).includes("learn");
    if (!learnt && !legacy && !rep.cards[key]) return [];
    return [{ key, o, card: rep.cards[key] ?? legacy ?? newCard(today) }];
  });
}

export const dueLines = (lines: ReviewLine[], today: string) => lines.filter(l => isDue(l.card, today));

/** Days until a card is due (0 = today). */
export const daysUntil = (c: Card, today: string): number => {
  let n = 0; while (addDays(today, n) < c.due && n < 400) n++;
  return n;
};
