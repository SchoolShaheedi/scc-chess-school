// Trap alert (DECISIONS #133 d): the openings course teaches a model win per opening, a line where one side makes
// a known mistake and the other wins. While the learner plays a bot, this index tells the game screen when the
// board is a position from such a line: the learner is the side about to make the mistake ("walk-in"), or the bot
// has just made it and the learner has studied that win ("bot-mistake"). Pure and DOM-free (test/traps.test.ts).
// It never says which move is right.
import { Chess } from "chess.js";
import { COURSE, type CourseLine, type CourseOpening } from "../content/course";

export type TrapKind = "walkin" | "bot";
export interface TrapPos { key: string; kind: TrapKind; openingId: string; ply: number; /** the learner's colour in this position */ learner: "w" | "b" }

/** A position without its move counters: the same board, side to move, castling and en passant. */
export const fenKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

/** The plies (the first N half-moves) in which a trap alert may be shown. */
export const TRAP_PLIES = 20;

const MISTAKE_WORDS = /mistake|blunder|forgets|grabs|greedy|takes the bait|falls for|walks into|error|careless|oversees|overlooks|misses/i;

/** A course line, plus the optional `wins` another builder may add to an opening (read when present). */
export const winLines = (o: CourseOpening): CourseLine[] =>
  [o.win, ...(((o as CourseOpening & { wins?: CourseLine[] }).wins) ?? [])].filter(Boolean);

/** The ply of the mistake in a model win: the other side's move that the line's own notes call a mistake; else
 *  where the other side first leaves the main line; an explicit `mistake` on the line wins over both. Ply 0 =
 *  White's first move. null when the line gives no clear mistake. */
export function mistakePly(o: CourseOpening, line: CourseLine): number | null {
  const bad: "w" | "b" = o.side === "w" ? "b" : "w", theirs = (i: number) => (i % 2 === 0 ? "w" : "b") === bad;
  const explicit = (line as CourseLine & { mistake?: number }).mistake;
  if (typeof explicit === "number") return theirs(explicit) ? explicit : null;
  for (let i = 0; i < line.moves.length; i++) if (theirs(i) && line.notes[i] && MISTAKE_WORDS.test(line.notes[i].en)) return i;
  let d = 0; while (d < line.moves.length && line.moves[d] === o.main.moves[d]) d++;
  for (let i = d; i < line.moves.length; i++) if (theirs(i)) return i;
  return null;
}

/** Every walk-in and bot-mistake position in the course. */
export function trapIndex(course: CourseOpening[] = COURSE): TrapPos[] {
  const out: TrapPos[] = [];
  for (const o of course) for (const line of winLines(o)) {
    const m = mistakePly(o, line); if (m === null || m >= TRAP_PLIES) continue;
    const g = new Chess();
    try {
      for (let i = 0; i < m; i++) g.move(line.moves[i]);
      const before = fenKey(g.fen());
      g.move(line.moves[m]);
      out.push({ key: before, kind: "walkin", openingId: o.id, ply: m, learner: o.side === "w" ? "b" : "w" },
        { key: fenKey(g.fen()), kind: "bot", openingId: o.id, ply: m, learner: o.side });
    } catch { /* a line that does not replay is the course tests' problem, not the game's */ }
  }
  return out;
}

let cached: TrapPos[] | null = null;
/** The trap (if any) for this board: `learner` is the colour the learner plays, `studied` says whether they have
 *  finished the model win of an opening. Walk-ins need no study; bot-mistakes only count for a studied win. */
export function findTrap(fen: string, learner: "w" | "b", plies: number, studied: (openingId: string) => boolean,
  index: TrapPos[] = (cached ??= trapIndex())): TrapPos | null {
  if (plies > TRAP_PLIES) return null;
  const key = fenKey(fen);
  return index.find(p => p.key === key && p.learner === learner && (p.kind === "walkin" || studied(p.openingId))) ?? null;
}
