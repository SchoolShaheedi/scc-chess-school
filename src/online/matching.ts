// Time controls, rating categories, the widening rating window, who may be paired with whom, and the bot offer: the
// pure rules behind the Play Online screen. The server decides all of it (supabase/online_matching.sql, pair_ok and
// rating_window); these are the same rules in TypeScript so the screen can show them and the tests can pin them.
export const CATEGORIES = ["bullet", "blitz", "rapid"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Under 3 minutes is bullet, under 10 blitz, else rapid (chess.com's lines; the server's tc_category). */
export function categoryOf(mins: number): Category { return mins < 3 ? "bullet" : mins < 10 ? "blitz" : "rapid"; }

export interface TimeControl { key: string; mins: number; inc: number; category: Category }
/** chess.com's picker: bullet 1+0 and 2+1, blitz 3+0, 3+2 and 5+0, rapid 10+0, 15+10 and 30+0. */
export const TIME_CONTROLS: TimeControl[] = ([["1+0", 1, 0], ["2+1", 2, 1], ["3+0", 3, 0], ["3+2", 3, 2], ["5+0", 5, 0], ["10+0", 10, 0], ["15+10", 15, 10], ["30+0", 30, 0]] as const)
  .map(([key, mins, inc]) => ({ key, mins, inc, category: categoryOf(mins) }));
export const DEFAULT_TC = "5+0";

/** The one spelling of a clock: the older "10" and "5" are "10+0" and "5+0". */
export const tcNorm = (tc: string) => (tc === "10" ? "10+0" : tc === "5" ? "5+0" : tc);
export function tcParse(tc: string): { mins: number; inc: number } {
  if (tc === "none") return { mins: 0, inc: 0 };
  const [m, i] = tcNorm(tc).split("+"); return { mins: +m, inc: +(i ?? 0) };
}
export const tcCategory = (tc: string): Category | null => { const { mins } = tcParse(tc); return mins > 0 ? categoryOf(mins) : null; };
export const isTimeControl = (tc: string) => TIME_CONTROLS.some(x => x.key === tcNorm(tc));

/** The rating window for a seek that has waited this long: 100, then 200 after 10 s, 400 after 20 s, anyone after 30 s. */
export function ratingWindow(waitedSeconds: number): number {
  return waitedSeconds < 10 ? 100 : waitedSeconds < 20 ? 200 : waitedSeconds < 30 ? 400 : Infinity;
}
/** Whether two waiting players are close enough: the window of whichever has waited longer (the server's rule). */
export const withinWindow = (a: number, b: number, waitedA: number, waitedB: number) => Math.abs(a - b) <= ratingWindow(Math.max(waitedA, waitedB));
/** "±200", or null once the window is open to anyone. */
export const windowLabel = (waitedSeconds: number) => { const w = ratingWindow(waitedSeconds); return w === Infinity ? null : `±${w}`; };

/** The pool a player is in: 'adult' (declared 18+) or 'child' (a parent switched it on). */
export interface PoolPlayer { adult: boolean; paused: boolean }
export interface Relation { friend: boolean; classmate: boolean; blocked: boolean }
/** May x and y be paired? The server's pair_ok. Grown-ups meet any other grown-up (strangers); a child only a friend or
 *  classmate who is also a child; a grown-up and a child never meet; paused players and blocked pairs never. */
export function pairEligible(x: PoolPlayer, y: PoolPlayer, rel: Relation): boolean {
  if (x.paused || y.paused || x.adult !== y.adult || rel.blocked) return false;
  return x.adult ? true : rel.friend || rel.classmate;
}
/** Rated games: grown-up strangers, and children's friend/class games in their own pool. */
export const ratedPool = (x: PoolPlayer): "adult" | "child" => (x.adult ? "adult" : "child");

/** After this many seconds of searching, offer a bot of the player's level. */
export const BOT_OFFER_AFTER_S = 60;
/** The bot nearest the rating (a bot's `rating` is its strength). */
export function nearestBot<T extends { rating: number }>(rating: number, bots: T[]): T | undefined {
  return [...bots].sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))[0];
}

const KEY = "scc-online-tc";
/** The last clock chosen, remembered on this device. */
export function savedTc(): string { try { const v = localStorage.getItem(KEY); return v && isTimeControl(v) ? tcNorm(v) : DEFAULT_TC; } catch { return DEFAULT_TC; } }
export function saveTc(tc: string) { try { localStorage.setItem(KEY, tcNorm(tc)); } catch { /* private mode: not remembered */ } }
