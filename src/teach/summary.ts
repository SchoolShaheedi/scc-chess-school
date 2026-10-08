// The only thing a teacher ever sees about a pupil (DECISIONS #82): five numbers, worked out from the child's
// saved progress. The database refuses any other field (supabase/classes.sql), so nothing else can leak.
import { LEVELS } from "../content/levels";
import type { Saved } from "../merge";

export interface Summary { level: number; lessons: number; lessonsWeek: number; tests: number; daysWeek: number;
  /** The class leaderboard's week (DECISIONS #89), Monday to Sunday: its Monday as YYYYMMDD, and that week's numbers. */
  weekOf: number; wkDays: number; wkLessons: number; wkPuzzles: number }

/** The Monday of the week containing a date (YYYY-MM-DD). */
export function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString("en-CA");
}

export function summaryOf(s: Saved, today: string): Summary {
  const weekAgo = new Date(`${today}T12:00:00`); weekAgo.setDate(weekAgo.getDate() - 6);
  const since = weekAgo.toLocaleDateString("en-CA");
  const done = Object.entries(s.lessons);
  const levelOf = (id: string) => LEVELS.find(l => l.lessons.some(x => x.id === id))?.n ?? 1;
  const passed = Object.entries(s.tests ?? {}).filter(([, t]) => t.passed).map(([n]) => +n);
  // the level being worked on: past every passed test, and at least the placement
  const level = Math.min(10, Math.max(1, s.placed ?? 0, ...done.map(([id]) => levelOf(id)), ...passed.map(n => n + 1)));
  return {
    level,
    lessons: done.length,
    lessonsWeek: done.filter(([, r]) => r.completedAt.slice(0, 10) >= since).length,
    tests: passed.length,
    daysWeek: (s.active ?? []).filter(d => d >= since && d <= today).length,
    weekOf: +mondayOf(today).replace(/-/g, ""),
    wkDays: Math.min(7, (s.active ?? []).filter(d => d >= mondayOf(today) && d <= today).length),
    wkLessons: Math.min(99, done.filter(([, r]) => r.completedAt.slice(0, 10) >= mondayOf(today)).length),
    wkPuzzles: Math.min(999, Object.entries(s.puzzlesByDay ?? {}).filter(([d]) => d >= mondayOf(today) && d <= today).reduce((a, [, n]) => a + n, 0)),
  };
}
