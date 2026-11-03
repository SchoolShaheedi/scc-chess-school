// Find a saved game (Practice tools, 2026-11-03): filters for "Your games" on the Me page. Pure and DOM-free
// (test/gamefilter.test.ts). The games are the last 50 of DECISIONS #84, so everything is computed in one pass.
import { Chess } from "chess.js";
import { courseOpening } from "../content/course";
import { matchCourse } from "../insights/openings-report";
import { openingOf } from "../insights/insights";
import type { Text } from "../lesson/types";
import type { SavedGame } from "./history";

export type When = "all" | "week" | "month";
export interface GameFilter { result: "all" | SavedGame["result"]; colour: "all" | "w" | "b"; bot: string; opening: string; when: When }
/** "all" for a text filter means no filter; any other value is a key from `filterOptions`. */
export const NO_FILTER: GameFilter = { result: "all", colour: "all", bot: "all", opening: "all", when: "all" };

export interface GameInfo {
  g: SavedGame;
  /** The game's place in the saved list: what Game Review is opened with. */
  i: number;
  bot: { key: string; label: Text };
  opening: { key: string; label: Text } | null;
}

/** The opening a game was played in, by the app's own naming: the course's name where the course teaches it (by name or by
 *  its first moves, as the Insights openings report does), else the Lichess family name. A game from a set position has none. */
export function openingOfGame(g: SavedGame, names: Record<string, string>): { key: string; label: Text } | null {
  if (g.startFen) return null;
  const c = new Chess(), sans: string[] = [];
  for (const u of g.uci.slice(0, 12)) { try { sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
  const name = openingOf(sans, names); if (!name) return null;
  const id = matchCourse(name, sans), co = id ? courseOpening(id) : undefined;
  if (co) return { key: co.name.en, label: co.name };
  const family = name.split(/[:,]/)[0].trim();
  return { key: family, label: { en: family, pa: family } };
}

export function describeGames(list: SavedGame[], names: Record<string, string>): GameInfo[] {
  return list.map((g, i) => ({ g, i, bot: { key: g.opp.en, label: g.opp }, opening: openingOfGame(g, names) }));
}

/** Monday 00:00 of the week `now` is in, and the 1st of its month: "this week" and "this month" are calendar ones. */
export function startOf(when: Exclude<When, "all">, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), when === "month" ? 1 : now.getDate());
  if (when === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function filterGames(infos: GameInfo[], f: GameFilter, now: Date = new Date()): GameInfo[] {
  const since = f.when === "all" ? null : startOf(f.when, now).getTime();
  return infos.filter(x => (f.result === "all" || x.g.result === f.result)
    && (f.colour === "all" || x.g.me === f.colour)
    && (f.bot === "all" || x.bot.key === f.bot)
    && (f.opening === "all" || x.opening?.key === f.opening)
    && (since === null || new Date(x.g.at).getTime() >= since));
}

/** The opponents and openings that really occur, so a filter never offers an empty answer; most played first. */
export function filterOptions(infos: GameInfo[]): { bots: { key: string; label: Text; n: number }[]; openings: { key: string; label: Text; n: number }[] } {
  const tally = (pick: (x: GameInfo) => { key: string; label: Text } | null) => {
    const m = new Map<string, { key: string; label: Text; n: number }>();
    for (const x of infos) { const o = pick(x); if (!o) continue; const e = m.get(o.key); if (e) e.n++; else m.set(o.key, { ...o, n: 1 }); }
    return [...m.values()].sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  };
  return { bots: tally(x => x.bot), openings: tally(x => x.opening) };
}

export const isFiltered = (f: GameFilter) => (Object.keys(NO_FILTER) as (keyof GameFilter)[]).some(k => f[k] !== NO_FILTER[k]);
