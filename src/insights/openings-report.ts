// "Your openings" on the Insights page (DECISIONS #133 d): for each opening the learner has played at least three
// times, the results, a link to the course lesson when the opening is one the course teaches, and the one with the
// worst score flagged to practise. Pure and DOM-free (test/openings-report.test.ts).
import { Chess } from "chess.js";
import { COURSE, type CourseOpening } from "../content/course";
import type { SavedGame } from "../play/history";
import { openingOf } from "./insights";

export const MIN_GAMES = 3;
/** Fewer games than this and the score is only a hint. */
export const SOLID_GAMES = 5;
const MATCH_PLIES = 4;

export interface OpeningLine { name: string; games: number; won: number; drawn: number; lost: number; score: number;
  /** the course opening this one is, when it is one */ courseId: string | null; small: boolean; practise: boolean }

const base = (n: string) => n.split(",")[0].trim().toLowerCase();
const bare = (n: string) => base(n).replace(/ (defence|defense|opening|game)$/, "");

/** Which course opening an opening is: by name (the Lichess family name against the course's own), else by moves
 *  (the game's first four plies are the course's main line's, the longest agreement winning). */
export function matchCourse(name: string, sans: string[], course: CourseOpening[] = COURSE): string | null {
  const byName = course.find(o => base(o.name.en) === base(name)) ?? course.find(o => bare(o.name.en) === bare(name));
  if (byName) return byName.id;
  let best: { id: string; n: number } | null = null;
  for (const o of course) {
    const m = o.main.moves, need = Math.min(MATCH_PLIES, m.length);
    let n = 0; while (n < m.length && n < sans.length && m[n] === sans[n]) n++;
    if (n >= need && (!best || n > best.n)) best = { id: o.id, n };
  }
  return best?.id ?? null;
}

export function openingsReport(games: SavedGame[], names: Record<string, string>, course: CourseOpening[] = COURSE): OpeningLine[] {
  const rows = new Map<string, OpeningLine & { sans: string[] }>();
  for (const g of games) {
    if (g.startFen) continue;
    const c = new Chess(), sans: string[] = [];
    for (const u of g.uci.slice(0, 12)) { try { sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
    const name = openingOf(sans, names); if (!name) continue;
    const r = rows.get(name) ?? { name, games: 0, won: 0, drawn: 0, lost: 0, score: 0, courseId: null, small: false, practise: false, sans };
    r.games++; r[g.result === "won" ? "won" : g.result === "lost" ? "lost" : "drawn"]++;
    rows.set(name, r);
  }
  const out = [...rows.values()].filter(r => r.games >= MIN_GAMES).map(({ sans, ...r }) => ({
    ...r, score: Math.round(((r.won + r.drawn / 2) / r.games) * 100), small: r.games < SOLID_GAMES, courseId: matchCourse(r.name, sans, course) }))
    .sort((a, b) => b.games - a.games || b.score - a.score);
  const worst = [...out].sort((a, b) => a.score - b.score || b.games - a.games)[0];
  // flagged only where there is something to practise: not a perfect record, and not the only opening unless it is going badly
  if (worst && worst.score < 100 && (out.length >= 2 || worst.score < 50)) worst.practise = true;
  return out;
}
