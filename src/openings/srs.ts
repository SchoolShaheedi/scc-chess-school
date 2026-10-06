// The openings trainer's review schedule (DECISIONS #74): simple boxes. Right with no slips moves a line up
// a box (1, 3, 7, 14, then 30 days); any slip sends it back to box 0, due tomorrow. Pure, tested on its own.
export interface Card { box: number; due: string }      // due = YYYY-MM-DD
export const WAITS = [1, 3, 7, 14, 30];

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

/** A newly chosen line: due today, in the first box. */
export const newCard = (today: string): Card => ({ box: 0, due: today });

export function review(c: Card, clean: boolean, today: string): Card {
  if (!clean) return { box: 0, due: addDays(today, 1) };
  const box = Math.min(c.box + 1, WAITS.length - 1);
  return { box, due: addDays(today, WAITS[c.box]) };
}

export const isDue = (c: Card, today: string) => c.due <= today;
/** A line is "learnt" once it has survived the 7-day wait. */
export const learnt = (c: Card) => c.box >= 3;
/** Merging two devices' cards for one line: the one further along wins. */
export const mergeCard = (a: Card, b: Card): Card => a.box !== b.box ? (a.box > b.box ? a : b) : (a.due >= b.due ? a : b);
