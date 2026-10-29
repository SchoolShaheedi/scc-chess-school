// Which puzzle to show (DECISIONS #72). Pure and DOM-free, so the choices are tested (test/puzzles.test.ts).
// The daily puzzle is the same for everyone on the same level on the same day; Puzzle Race climbs in rating.
import { LEVELS, PACKS } from "../content/levels";
import type { PuzzleExercise, Text } from "../lesson/types";

const PROMPT: Text = { en: "Find the best move.", pa: "ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" };
type P = { id: string; fen: string; moves: string[]; rating: number };
const toExercise = (p: P): PuzzleExercise => ({ kind: "puzzle", fen: p.fen, moves: p.moves, prompt: PROMPT, source: `lichess.org/training/${p.id}` });

/** A small seeded random stream (FNV-1a hash of the seed text, then an LCG). */
export function seeded(text: string): () => number {
  let h = 2166136261;
  for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 4294967296);
}

/** The packs a level's daily puzzle comes from: its own test packs. Level 1 has a bot test, so it gets free-piece puzzles (lesson 1.9). */
export const dailyPacks = (level: number) => level === 1 ? [{ pack: "hanging-easy", count: 1 }] : LEVELS[level - 1].test!.packs;

export function dailyPuzzle(date: string, level: number): PuzzleExercise & { id: string } {
  const r = seeded(`${date}:${level}`), packs = dailyPacks(level);
  let x = r() * packs.reduce((a, p) => a + p.count, 0);
  const pack = PACKS[(packs.find(p => (x -= p.count) < 0) ?? packs[0]).pack];
  const p = pack.puzzles[Math.floor(r() * pack.puzzles.length)];
  return { ...toExercise(p), id: p.id };
}

/** Every puzzle in the app once, easiest first. */
export function rushPool(): P[] {
  const seen = new Map<string, P>();
  for (const pack of Object.values(PACKS)) for (const p of pack.puzzles) seen.set(p.id, p);
  return [...seen.values()].sort((a, b) => a.rating - b.rating);
}

/** Puzzle Race on the rated bank (everyone but the Young look): it starts a little below the learner's puzzle rating, so the
 *  first puzzles are quick wins, and climbs RACE_STEP points a solve, to the bank's top. A strong player meets real speed
 *  tactics; a new one starts where they are, not at 400. */
export const RACE_BACK = 150, RACE_STEP = 40, RACE_TOP = 2500;
export const raceStart = (puzzleRating: number) => Math.min(RACE_TOP, Math.max(RUSH_START, Math.round((puzzleRating - RACE_BACK) / 10) * 10));
export const raceTarget = (start: number, solved: number) => Math.min(RACE_TOP, start + solved * RACE_STEP);
/** A Race puzzle has at most two moves of the learner's: it is a speed test, not a calculation test. */
export const raceShort = (p: { moves: string[] }) => p.moves.length <= 4;

// the pool runs from ~250 to ~1800 (2026-10-04), so a 60-point step reaches the top after ~24 puzzles
export const RUSH_START = 400, RUSH_STEP = 60;

/** The next Rush puzzle: one of the 6 unused puzzles nearest the target rating for this step. */
export function rushNext(pool: P[], step: number, used: Set<string>, rand: () => number = Math.random): PuzzleExercise & { id: string; rating: number } {
  const target = Math.min(RUSH_START + step * RUSH_STEP, pool[pool.length - 1].rating);
  const near = pool.filter(p => !used.has(p.id)).sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target)).slice(0, 6);
  const p = near[Math.floor(rand() * near.length)];
  used.add(p.id);
  return { ...toExercise(p), id: p.id, rating: p.rating };
}
