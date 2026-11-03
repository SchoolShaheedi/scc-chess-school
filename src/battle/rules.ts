// Puzzle Battle rules (class features 2026-11-03, not yet in DECISIONS.md): scoring, who wins, which puzzles, and whether an answer is believable. Pure and
// DOM-free, with NO imports, so the very same file runs in the app and in the puzzle-battle server function
// (tools/sync-battle.mjs copies it; test/battle.test.ts fails if the copy has drifted). The server is the judge: the
// app only shows what the server says.

export const BATTLE_SECONDS = 180;          // the battle lasts three minutes...
export const BATTLE_TARGET = 5;             // ...or until someone solves this many
export const BATTLE_COUNTDOWN_MS = 5000;    // both players get a countdown before the first puzzle
export const BATTLE_SET = 20;               // puzzles in a set: more than anyone solves in the time
export const BATTLE_GRACE_MS = 1500;        // an answer sent just as time ran out still counts (a slow connection)
export const BATTLE_MIN_MS = 400;           // no real person answers a move faster than this after the last one

export type BattleLevel = "easy" | "medium" | "hard";
/** The rating bands each level draws from (the bank's 100-point bands, public/puzzles/bank). */
export const BATTLE_BANDS: Record<BattleLevel, number[]> = { easy: [500, 600, 700], medium: [900, 1000, 1100], hard: [1300, 1400, 1500, 1600] };
export const isLevel = (x: unknown): x is BattleLevel => x === "easy" || x === "medium" || x === "hard";

/** What the server keeps for one side. `lastAt` is when they last solved one (ms since 1970), for the tie-break. */
export interface Tally { solved: number; missed: number; lastAt: number | null; idx: number }
export type Winner = "a" | "b" | "draw";
export type EndReason = "target" | "time" | "done" | "left";
export interface Outcome { over: boolean; winner: Winner | null; reason: EndReason | null }
export interface Clock { startMs: number; nowMs: number; setLength: number; target?: number; seconds?: number }

/** Who is ahead: most solved; then fewest missed; then whoever solved their last one first; otherwise level. */
export function compare(a: Tally, b: Tally): Winner {
  if (a.solved !== b.solved) return a.solved > b.solved ? "a" : "b";
  if (a.missed !== b.missed) return a.missed < b.missed ? "a" : "b";
  if (a.lastAt !== null && b.lastAt !== null && a.lastAt !== b.lastAt) return a.lastAt < b.lastAt ? "a" : "b";
  return "draw";
}

/** Is the battle over, and who won? First to the target wins at once (if both are there, the one who got there first);
 *  otherwise at the end of the time, or when both have been through the whole set, the best tally wins. */
export function outcome(a: Tally, b: Tally, c: Clock): Outcome {
  const target = c.target ?? BATTLE_TARGET, seconds = c.seconds ?? BATTLE_SECONDS;
  const ta = a.solved >= target, tb = b.solved >= target;
  if (ta || tb) {
    const w: Winner = ta && tb ? compare({ ...a, solved: 0, missed: 0 }, { ...b, solved: 0, missed: 0 }) : ta ? "a" : "b";
    return { over: true, winner: w, reason: "target" };
  }
  if (c.nowMs >= c.startMs + seconds * 1000) return { over: true, winner: compare(a, b), reason: "time" };
  if (a.idx >= c.setLength && b.idx >= c.setLength) return { over: true, winner: compare(a, b), reason: "done" };
  return { over: false, winner: null, reason: null };
}

/** The result as one side sees it. */
export const resultFor = (side: "a" | "b", winner: Winner | null): "won" | "lost" | "draw" | null =>
  winner === null ? null : winner === "draw" ? "draw" : winner === side ? "won" : "lost";

/** An answer counts only between the start and the end of time (plus the grace). */
export const inWindow = (nowMs: number, startMs: number, seconds = BATTLE_SECONDS) =>
  nowMs >= startMs && nowMs <= startMs + seconds * 1000 + BATTLE_GRACE_MS;

/** Moves arriving faster than a person can play are refused (a script answering from the public bank). */
export const plausible = (nowMs: number, lastMs: number | null, startMs: number) => nowMs - Math.max(lastMs ?? 0, startMs) >= BATTLE_MIN_MS;

export interface Verdict { ok: boolean; solved: boolean; reply: string | null; step: number }
/** One of the solver's moves against a puzzle's line (Lichess: moves[0] is the opponent's move, then they alternate, so the
 *  solver's moves are at the odd places). `step` is the place of the move expected now. A move is right if it is the
 *  line's move, or, on the last move, any checkmate (`mates` answers that; the app's own puzzles do the same). */
export function judgeMove(moves: string[], step: number, uci: string, mates: (uci: string) => boolean): Verdict {
  if (step < 1 || step >= moves.length) return { ok: false, solved: false, reply: null, step };
  const last = step === moves.length - 1;
  if (!(uci === moves[step] || (last && mates(uci)))) return { ok: false, solved: false, reply: null, step };
  return last ? { ok: true, solved: true, reply: null, step: 1 } : { ok: true, solved: false, reply: moves[step + 1], step: step + 2 };
}

/** Short puzzles only (a speed race, not a calculation test): at most two moves of the solver's. */
export const raceable = (p: { moves: string[] }) => p.moves.length >= 2 && p.moves.length <= 4;

export interface PoolPuzzle { id: string; fen: string; moves: string[]; rating: number }
/** What both players may see of a puzzle: where it starts and the opponent's first move, never the answer. */
export interface PublicPuzzle { id: string; band: number; fen: string; first: string; rating: number }

/** n different short puzzles from a pool, shuffled and then ordered easiest first (so the set climbs gently). */
export function pickSet<T extends PoolPuzzle>(pool: T[], n: number, rand: () => number): T[] {
  const a = pool.filter(raceable);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n).sort((x, y) => x.rating - y.rating);
}
export const publicOf = (p: PoolPuzzle, band: number): PublicPuzzle => ({ id: p.id, band, fen: p.fen, first: p.moves[0], rating: p.rating });

/** How far this device's clock is from the server's, so the countdown is the same on both phones. Positive = server ahead.
 *  `sentMs` and `receivedMs` are this device's clock around the request; the server's time is taken mid-way. */
export const clockSkew = (serverMs: number, sentMs: number, receivedMs: number) => serverMs - Math.round((sentMs + receivedMs) / 2);
