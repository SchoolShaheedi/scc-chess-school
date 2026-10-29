// "No dead ends" (2026-10-29): one help ladder for every kind of exercise, and the small pure helpers behind it.
//
//   after 2 misses on a step  ->  the hint, or a "look at this piece / square" glow
//   after 3 misses            ->  an arrow showing a correct move, and "Skip for now" is offered
//   mateVs / engineVs / botGame: after 2 failed attempts "Watch me do it" (the engine plays the winning side)
//
// Pure (no DOM), so test/help.test.ts can prove each rung without a browser.
import { Chess, type Move } from "chess.js";
import { drillMoves, move as drillMove } from "../chess/drill";
import { attackedBy } from "../chess/drill";
import { solutions, type Goal } from "../chess/rules";
import type { Placement, Square } from "../chess/types";
import type { Text, Exercise, PuzzleExercise } from "./types";
import type { UIKey } from "../i18n";

export const HELP_AT = { hint: 2, arrow: 3, watch: 2, skip: 3 } as const;
export type Rung = "none" | "hint" | "arrow";
/** What help a step has earned after `misses` wrong tries on it. */
export const rungFor = (misses: number): Rung => misses >= HELP_AT.arrow ? "arrow" : misses >= HELP_AT.hint ? "hint" : "none";
export const canSkip = (failed: number) => failed >= HELP_AT.skip;
export const canWatch = (failed: number) => failed >= HELP_AT.watch;

/** Stars for a finished lesson: from the mistakes made in Practise and Challenge (0 = 3 stars, 1-2 = 2, more = 1), and a lesson
 *  finished with "Skip for now" is always 1 star (it is also marked for review, see store.completeLesson). */
export function finalStars(mistakes: number, skipped: boolean): 1 | 2 | 3 {
  return skipped ? 1 : mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

// ---------- finding a correct move to show ----------

/** The first move of a shortest way to collect every star within `cap` moves (white only moves; `only` limits the piece type). */
export function firstStarsMove(pieces: Placement, stars: Square[], only: string | undefined, cap: number): [Square, Square] | null {
  type Node = { pos: Placement; stars: Square[]; first: [Square, Square] | null };
  const key = (p: Placement, s: string[]) => Object.entries(p).sort().map(([q, x]) => q + x).join(",") + "|" + s.join();
  let frontier: Node[] = [{ pos: pieces, stars, first: null }];
  const seen = new Set<string>([key(pieces, stars)]);
  for (let depth = 1; depth <= cap; depth++) {
    const next: Node[] = [];
    for (const n of frontier) for (const from of Object.keys(n.pos)) {
      if (n.pos[from]?.[0] !== "w" || (only && n.pos[from]![1] !== only)) continue;
      for (const to of drillMoves(n.pos, from)) {
        const p2 = drillMove(n.pos, from, to), s2 = n.stars.filter(s => s !== to), first = n.first ?? [from, to] as [Square, Square];
        if (!s2.length) return first;
        const k = key(p2, s2);
        if (!seen.has(k)) { seen.add(k); next.push({ pos: p2, stars: s2, first }); }
      }
    }
    frontier = next;
  }
  return null;
}

/** The first step of a shortest safe walk for the king to `goal` within `cap` moves. */
export function firstSafeMove(pieces: Placement, goal: Square, cap: number): [Square, Square] | null {
  const key = (p: Placement) => Object.entries(p).sort().map(([q, x]) => q + x).join(",");
  let frontier: { pos: Placement; first: [Square, Square] | null }[] = [{ pos: pieces, first: null }];
  const seen = new Set([key(pieces)]);
  for (let depth = 1; depth <= cap; depth++) {
    const next: typeof frontier = [];
    for (const n of frontier) {
      const k = Object.keys(n.pos).find(s => n.pos[s] === "wK")!;
      for (const to of drillMoves(n.pos, k)) {
        const p2 = drillMove(n.pos, k, to);
        if (attackedBy(p2, "b").has(to)) continue;
        const first = n.first ?? [k, to] as [Square, Square];
        if (to === goal) return first;
        if (!seen.has(key(p2))) { seen.add(key(p2)); next.push({ pos: p2, first }); }
      }
    }
    frontier = next;
  }
  return null;
}

/** One move that meets a "play" goal, as squares (a promotion shows only from and to). */
export function goalMove(fen: string, goal: Goal): [Square, Square] | null {
  const u = solutions(fen, goal)[0];
  return u ? [u.slice(0, 2), u.slice(2, 4)] : null;
}

// ---------- watching: the engine plays the winning side, the learner watches ----------

export interface WatchOpts {
  fen: string;
  /** The side the learner plays (the engine plays it for them). */
  side: "w" | "b";
  best(fen: string): Promise<string>;                 // UCI move for the side to move
  reply(fen: string): Promise<string | null>;         // the other side's move
  show(g: Chess, last: [Square, Square]): void;
  pause(ms: number): Promise<void>;
  alive(): boolean;
  /** Stop when this is true after a move (mate, win, goal met). */
  stop(g: Chess, last: Move): boolean;
  maxPlies?: number;
  ms?: number;
}
/** For "Watch me do it" in a capture race ("clear": take every enemy piece but the king): of the engine's candidate moves, the
 *  best-scoring capture that is within `slack` centipawns of the top move, else the top move. A plain "best move" would be
 *  content to shuffle while winning and never finish the job. Pawn Wars ("promote") just plays the engine's top move. */
export function watchPick(fen: string, cands: { move: string; score: number }[], goal: "promote" | "clear", slack = 250): string {
  if (goal === "promote" || !cands.length) return cands[0]?.move ?? "";
  const g = new Chess(fen), top = cands[0].score;
  const isCapture = (u: string) => !!g.moves({ verbose: true }).find(m => m.from + m.to === u.slice(0, 4) && m.captured);
  return (cands.find(c => c.score >= top - slack && isCapture(c.move)) ?? cands[0]).move;
}

/** Plays the position out for the learner. Resolves "stopped" when `stop` fired, "over" when the game ended, "cut" at the ply cap. */
export async function watchLine(o: WatchOpts): Promise<"stopped" | "over" | "cut" | "gone"> {
  const g = new Chess(o.fen);
  for (let ply = 0; ply < (o.maxPlies ?? 60); ply++) {
    if (!o.alive()) return "gone";
    if (g.isGameOver()) return "over";
    const uci = g.turn() === o.side ? await o.best(g.fen()) : await o.reply(g.fen());
    if (!o.alive()) return "gone";
    if (!uci || uci === "(none)") return "over";
    const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    o.show(g, [m.from, m.to]);
    if (o.stop(g, m)) return "stopped";
    await o.pause(o.ms ?? 900);
  }
  return "cut";
}

// ---------- the theme of a pack: what to say when a puzzle move was wrong ----------

export type Topic = "hang" | "mate" | "promote" | "enpassant" | "backrank" | "smothered" | "defend" | "fork" | "pin" | "skewer"
  | "discover" | "dcheck" | "defender" | "trapped" | "endgame" | "opening" | "tactic";
export const TOPICS: Topic[] = ["hang", "mate", "promote", "enpassant", "backrank", "smothered", "defend", "fork", "pin", "skewer",
  "discover", "dcheck", "defender", "trapped", "endgame", "opening", "tactic"];

const PACK_TOPIC: Record<string, Topic> = {
  "hanging-easy": "hang", "hanging-first": "hang",
  "mate1-easy": "mate", "mate1-mid": "mate", "promotion-easy": "promote",
  enpassant: "enpassant", "enpassant-easy": "enpassant", backrank: "backrank", smothered: "smothered",
  "defend-easy": "defend", "defend-first": "defend",
  "fork-easy": "fork", "pin-easy": "pin", "skewer-easy": "skewer", "discovered-easy": "discover", "doublecheck-easy": "dcheck",
  "defender-easy": "defender", "trapped-easy": "trapped",
  "pawn-endgame": "endgame", "passed-pawn": "endgame", "queen-endgame": "endgame", "queen-endgame-hard": "endgame", "rook-endgame": "endgame",
  "bishop-endgame": "endgame", "knight-endgame": "endgame",
  "opening-easy": "opening", "opening-mate": "opening",
};
export const topicOf = (pack: string | undefined): Topic => (pack && PACK_TOPIC[pack]) || "tactic";
export const topicKey = (topic: Topic, part: "name" | "task" | "why") => `tp_${topic}_${part}` as UIKey;

/** The packs that make up a topic, for the "missed themes" list at the end of a level test. */
export const packsOfTopic = (topic: Topic) => Object.entries(PACK_TOPIC).filter(([, v]) => v === topic).map(([k]) => k);

/** Lessons (up to `maxLevel`) that practise a pack, in order, to link from a failed test. `lessons` is passed in so this stays pure. */
export function lessonsTeaching(topic: Topic, lessons: { id: string; level: number; try: Exercise; practise: Exercise[]; challenge: Exercise }[], maxLevel: number, limit = 2): string[] {
  const packs = new Set(packsOfTopic(topic));
  const out: string[] = [];
  for (const l of lessons) {
    if (l.level > maxLevel) continue;
    // a lesson "teaches" the topic when a pack of it is in its Try or Practise (a Challenge alone only tests it)
    if ([l.try, ...l.practise].some(e => e.kind === "pack" && packs.has(e.pack))) out.push(l.id);
    if (out.length >= limit) break;
  }
  return out;
}

/** The look-specific prompt: the Young look gets the short one where a lesson wrote it. */
export function forLook<E extends Exercise>(ex: E, look: string): E {
  return look === "young" && ex.young ? { ...ex, prompt: ex.young } : ex;
}

export const isPackPuzzle = (ex: PuzzleExercise) => !!ex.pack;
export type { Text };
