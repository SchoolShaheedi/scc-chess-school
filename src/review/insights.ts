// Game Review, option A (DECISIONS #104): the coach report in words, the extra labels (Brilliant, Great, Book,
// Miss), the Game Rating, and the key moments. Pure and DOM-free (test/review.test.ts). Every sentence is built
// from a fact Stockfish or the rules found (a piece left with no guard, a missed mate, a missed capture), so the
// coach never invents a reason.
import { Chess, type Square } from "chess.js";
import { BOOK_PLIES, inBook } from "../bots/bots";
import { hanging } from "../bots/gamecoach";
import type { Score } from "../engine/uci";
import type { Text } from "../lesson/types";
import { accuracy, type Graded, whiteWin } from "./grade";

export type Label2 = "brilliant" | "great" | "book" | "best" | "good" | "inaccuracy" | "mistake" | "miss" | "blunder";
export interface Reviewed extends Omit<Graded, "label"> { label: Label2; i: number; reason?: Reason }
/** Why a move went wrong (or right), as a fact: the basis of every coach sentence. */
export type Reason =
  | { kind: "hang"; piece: string; sq: Square }       // the move left this piece with no guard
  | { kind: "mate"; best: string }                    // a checkmate was there
  | { kind: "capture"; best: string }                 // a capture that won material was there
  | { kind: "other"; best: string };

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const sanOf = (fen: string, uci: string) => { try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return uci; } };

/** Did this move give up material on purpose? The moved piece can be taken for less than it is worth (or for
 *  free) straight after, and the move did not just win at least as much. */
export function isSacrifice(fen: string, uci: string): boolean {
  const g = new Chess(fen), m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  if (VALUE[m.piece] < 3) return false;
  const left = hanging(g.fen(), m.color).some(h => h.sq === m.to);
  return left && VALUE[m.captured ?? "p"] < VALUE[m.piece] && !(m.captured && VALUE[m.captured] >= VALUE[m.piece]);
}

/** The fact behind a weak move: a missed mate first, then a piece it left loose, else what the best move would have done. */
export function reasonFor(fenBefore: string, uci: string, best: string): Reason {
  const g = new Chess(fenBefore), me = g.turn();
  g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  // the most valuable piece left loose after the move: one it put en prise, or one already attacked that it
  // failed to save (in the preview game, 6.Nc3 left the c4 bishop to the d5 pawn)
  // a missed checkmate matters more than anything left loose
  const bestSan = sanOf(fenBefore, best);
  if (bestSan.endsWith("#")) return { kind: "mate", best: bestSan };
  const loose = hanging(g.fen(), me)[0];
  if (loose) return { kind: "hang", piece: loose.type, sq: loose.sq };
  if (bestSan.includes("x")) return { kind: "capture", best: bestSan };
  return { kind: "other", best: bestSan };
}

/**
 * The extra labels on top of grade():
 * - Book: still in opening theory (the bots' book) and not a real loss;
 * - Great: the best move, when the second-best was clearly worse (10+ points of win chance) and it keeps a
 *   playable game: the only good move;
 * - Brilliant: a Great move that is also a sacrifice;
 * - Miss: a winning position (70%+) thrown away by 20+ points, but not into a lost one: a chance missed.
 * `second[i]` is the engine's second-best score at position i (for the side to move), when there was one.
 */
export function refine(g: Graded[], fens: string[], second: (Score | undefined)[], sans: string[]): Reviewed[] {
  return g.map((m, i) => {
    const out: Reviewed = { ...m, i };
    if (i < BOOK_PLIES && m.drop < 10 && inBook(sans.slice(0, i), sans[i])) { out.label = "book"; return out; }
    const s2 = second[i];
    if (m.label === "best" && s2) {
      const w2 = whiteWin(s2, m.by === "w"), secondFor = m.by === "w" ? w2 : 100 - w2;
      if (m.before - secondFor >= 10 && m.after >= 35) out.label = isSacrifice(fens[i], m.uci) ? "brilliant" : "great";
    }
    if (m.drop >= 20 && m.before >= 70 && m.after >= 40) out.label = "miss";
    if (m.drop >= 10 && m.best) out.reason = reasonFor(fens[i], m.uci, m.best);
    return out;
  });
}

/** Accuracy → a rough playing strength (a smoothed table), blended with the opponent's rating when known:
 *  "~" a number, rounded to 50. An estimate, never a rating change. */
const TABLE: [number, number][] = [[0, 100], [40, 250], [50, 400], [60, 600], [70, 900], [80, 1250], [90, 1700], [95, 2000], [100, 2400]];
export function gameRating(myAcc: number, oppRating?: number, oppAcc?: number): number {
  let est = TABLE[TABLE.length - 1][1];
  for (let k = 1; k < TABLE.length; k++) if (myAcc <= TABLE[k][0]) {
    const [a0, r0] = TABLE[k - 1], [a1, r1] = TABLE[k];
    est = r0 + (r1 - r0) * (myAcc - a0) / (a1 - a0); break;
  }
  if (oppRating !== undefined && oppAcc !== undefined) est = 0.6 * est + 0.4 * (oppRating + (myAcc - oppAcc) * 15);
  return Math.max(100, Math.round(est / 50) * 50);
}

/** Up to three moments for the learner, in game order: the worst slip, a missed chance, and the best moment. */
export function keyMoments(r: Reviewed[], me: "w" | "b"): Reviewed[] {
  const mine = r.filter(m => m.by === me), pick: Reviewed[] = [];
  const worst = mine.filter(m => m.label === "blunder" || m.label === "mistake").sort((a, b) => b.drop - a.drop)[0];
  if (worst) pick.push(worst);
  const miss = mine.filter(m => m.label === "miss" && !pick.includes(m)).sort((a, b) => b.drop - a.drop)[0];
  if (miss) pick.push(miss);
  const bright = mine.find(m => m.label === "brilliant") ?? mine.find(m => m.label === "great");
  if (bright) pick.push(bright);
  // nothing dramatic: the largest slips that are left, so there is always something to look at
  for (const m of mine.filter(m => m.drop >= 10 && !pick.includes(m)).sort((a, b) => b.drop - a.drop)) { if (pick.length >= 3) break; pick.push(m); }
  return pick.sort((a, b) => a.i - b.i);
}

const moveNo = (m: Reviewed) => Math.floor(m.i / 2) + 1;
type Words = (key: string) => Text;

/** One short sentence about a move's fact (the walk-through and the key-moment cards use it). */
export function reasonText(m: Reviewed, w: Words, pieceWord: (p: string) => Text): Text | null {
  const r = m.reason, fill = (x: Text, n: Record<string, string | Text>) => ({
    en: Object.entries(n).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, typeof v === "string" ? v : v.en), x.en),
    pa: Object.entries(n).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, typeof v === "string" ? v : v.pa), x.pa),
  });
  if (m.label === "brilliant") return w("why_brilliant");
  if (m.label === "great") return w("why_great");
  if (!r) return null;
  if (r.kind === "hang") return fill(w("why_hang"), { piece: pieceWord(r.piece), sq: r.sq });
  return fill(w(`why_${r.kind}`), { best: r.best });
}

/** The coach report: how the opening went, the turning point (or "no big mistakes"), the best moment, and one
 *  thing to practise next, chosen from the turning point's fact. */
export function coachReport(r: Reviewed[], me: "w" | "b", w: Words, pieceWord: (p: string) => Text): Text[] {
  const mine = r.filter(m => m.by === me), lines: Text[] = [];
  const opening = mine.slice(0, 8), books = opening.filter(m => m.label === "book").length;
  const openAcc = accuracy(opening, me);
  const n = (t: Text, v: Record<string, string>) => ({
    en: Object.entries(v).reduce((s, [k, x]) => s.replaceAll(`{${k}}`, x), t.en),
    pa: Object.entries(v).reduce((s, [k, x]) => s.replaceAll(`{${k}}`, x), t.pa),
  });
  if (opening.length) lines.push(books >= 3 ? n(w("rep_openBook"), { n: String(books) }) : openAcc >= 75 ? w("rep_openGood") : w("rep_openWeak"));
  const worst = mine.filter(m => m.drop >= 20).sort((a, b) => b.drop - a.drop)[0];
  if (worst?.reason) {
    const why = reasonText(worst, w, pieceWord)!;
    lines.push(n(w("rep_turn"), { n: String(moveNo(worst)), san: worst.san }));
    lines.push(why);
  } else lines.push(w("rep_clean"));
  const bright = mine.find(m => m.label === "brilliant") ?? mine.find(m => m.label === "great");
  if (bright) lines.push(n(w("rep_bright"), { n: String(moveNo(bright)), san: bright.san }));
  lines.push(w(worst?.reason ? `tip_${worst.reason.kind}` : "tip_clean"));
  return lines;
}
