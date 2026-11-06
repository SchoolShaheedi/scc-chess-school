// "Why it's mate" and the one-line note on each move of a build-up, in plain words in both languages - all COMPUTED from the
// position (facts.ts), so a claim in the text cannot be wrong about the board. The Punjabi is a draft for a native check.
import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { Text } from "../lesson/types";
import { mateFacts, other, type MateFacts, type Piece } from "./facts";

const NAME: Record<PieceSymbol, Text & { f?: boolean }> = {
  k: { en: "king", pa: "ਬਾਦਸ਼ਾਹ" }, q: { en: "queen", pa: "ਰਾਣੀ", f: true }, r: { en: "rook", pa: "ਹਾਥੀ" },
  b: { en: "bishop", pa: "ਊਠ" }, n: { en: "knight", pa: "ਘੋੜਾ" }, p: { en: "pawn", pa: "ਪਿਆਦਾ" },
};
const fem = (t: PieceSymbol) => !!NAME[t].f;
const listEn = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const listPa = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ਅਤੇ ${xs[xs.length - 1]}`;
/** Punjabi: "of" agrees with the noun (ਦਾ, but ਦੀ for the queen), and before ਨੂੰ a masculine noun in -ਾ takes the oblique (ਘੋੜੇ, ਪਿਆਦੇ). */
const poss = (t: PieceSymbol) => (fem(t) ? "ਦੀ" : "ਦਾ");
const OBLIQUE: Partial<Record<PieceSymbol, string>> = { n: "ਘੋੜੇ", p: "ਪਿਆਦੇ" };
/** "the rook on h7" in each language; `obl` gives the Punjabi form that stands before ਨੂੰ. */
const the = (p: { type: PieceSymbol; sq: string }, obl = false): Text => ({
  en: `the ${NAME[p.type].en} on ${p.sq}`,
  pa: obl && !fem(p.type) ? `${p.sq} ਦੇ ${OBLIQUE[p.type] ?? NAME[p.type].pa}` : `${p.sq} ${poss(p.type)} ${NAME[p.type].pa}`,
});
const word = (t: PieceSymbol): Text => NAME[t];
/** The checking piece can be taken or blocked only if it is a slider with a square between it and the king. */
const lineHasGap = (c: { type: PieceSymbol; sq: string }, king: string) =>
  (c.type === "r" || c.type === "b" || c.type === "q") && Math.max(Math.abs(c.sq.charCodeAt(0) - king.charCodeAt(0)), Math.abs(+c.sq[1] - +king[1])) > 1;

export interface WhyMarks {
  king: Square;
  /** The pieces giving check. */
  checkers: Square[];
  /** The pieces that shut squares for the king (not the checkers themselves unless they do it alone). */
  guards: Square[];
  /** Empty squares next to the king that are covered. */
  covered: Square[];
  /** The king's own pieces in the way. */
  blocked: Square[];
}

/** Which pieces to name for the covered squares: the fewest, most useful first (a small greedy cover). */
function cover(f: MateFacts): { by: Piece; squares: Square[] }[] {
  const todo = f.flights.filter(x => !x.own && !x.theirs && x.guards.length);
  const left = new Set(todo.map(x => x.sq));
  const out: { by: Piece; squares: Square[] }[] = [];
  while (left.size) {
    const tally = new Map<string, { p: Piece; n: number }>();
    for (const x of todo) if (left.has(x.sq)) for (const g of x.guards) {
      const e = tally.get(g.sq) ?? { p: g, n: 0 }; e.n++; tally.set(g.sq, e);
    }
    // most squares first; on a tie the piece giving check goes first
    const best = [...tally.values()].sort((a, b) => b.n - a.n || +f.checkers.some(c => c.sq === b.p.sq) - +f.checkers.some(c => c.sq === a.p.sq))[0];
    const squares = todo.filter(x => left.has(x.sq) && x.guards.some(g => g.sq === best.p.sq)).map(x => x.sq);
    squares.forEach(s => left.delete(s));
    out.push({ by: best.p, squares });
  }
  return out;
}

export function whyMarks(f: MateFacts): WhyMarks {
  const groups = cover(f);
  const guardSqs = new Set<Square>();
  groups.forEach(g => guardSqs.add(g.by.sq));
  f.flights.filter(x => x.theirs).forEach(x => x.guards.forEach(g => guardSqs.add(g.sq)));
  f.checkers.forEach(c => guardSqs.delete(c.sq));
  return {
    king: f.king, checkers: f.checkers.map(c => c.sq), guards: [...guardSqs],
    covered: f.flights.filter(x => !x.own && !x.theirs).map(x => x.sq),
    blocked: f.flights.filter(x => x.own).map(x => x.sq),
  };
}

/** The plain-words reason a position is checkmate. `short` is the Young look: the check and one more sentence. */
export function whyText(fen: string, short = false): Text {
  const f = mateFacts(fen);
  if (!f) throw new Error(`not checkmate: ${fen}`);
  const en: string[] = [], pa: string[] = [];
  const cs = f.checkers;
  if (cs.length === 1) {
    en.push(`${cap(the(cs[0]).en)} gives check.`);
    pa.push(`${the(cs[0]).pa} ਸ਼ਹਿ ਦਿੰਦ${fem(cs[0].type) ? "ੀ" : "ਾ"} ਹੈ।`);
  } else {
    en.push(`${cap(listEn(cs.map(c => the(c).en)))} both give check (a double check).`);
    pa.push(`${listPa(cs.map(c => the(c).pa))} ਦੋਵੇਂ ਸ਼ਹਿ ਦਿੰਦੇ ਹਨ (ਦੋਹਰੀ ਸ਼ਹਿ)।`);
  }
  if (short) {
    en.push("The king has nowhere safe to go, and nothing can stop the check.");
    pa.push("ਬਾਦਸ਼ਾਹ ਕੋਲ ਜਾਣ ਲਈ ਕੋਈ ਸੁਰੱਖਿਅਤ ਥਾਂ ਨਹੀਂ ਅਤੇ ਸ਼ਹਿ ਨੂੰ ਕੋਈ ਰੋਕ ਨਹੀਂ ਸਕਦਾ।");
    return { en: en.join(" "), pa: pa.join(" ") };
  }
  // squares the king cannot use because they are covered
  for (const g of cover(f)) {
    const sq = g.squares;
    en.push(`${cap(the(g.by).en)} covers ${listEn(sq)}.`);
    pa.push(`${the(g.by).pa} ${listPa(sq)} ਨੂੰ ਰੋਕਦ${fem(g.by.type) ? "ੀ" : "ਾ"} ਹੈ।`);
  }
  // a piece of the mating side next to the king that the king cannot take
  for (const x of f.flights.filter(y => y.theirs)) {
    const gs = x.guards.filter(g => g.sq !== x.sq);
    en.push(`The king cannot take ${the(x.theirs!).en}: ${listEn(gs.map(g => the(g).en))} guard${gs.length === 1 ? "s" : ""} it.`);
    pa.push(`ਬਾਦਸ਼ਾਹ ${the(x.theirs!, true).pa} ਨੂੰ ਮਾਰ ਨਹੀਂ ਸਕਦਾ: ${listPa(gs.map(g => the(g).pa))} ਉਸ ਦੀ ਰਾਖੀ ਕਰਦ${gs.length === 1 && fem(gs[0].type) ? "ੀ" : gs.length === 1 ? "ਾ" : "ੇ"} ${gs.length === 1 ? "ਹੈ" : "ਹਨ"}।`);
  }
  // the king's own pieces in the way
  const own = f.flights.filter(x => x.own).map(x => x.own!);
  if (own.length) {
    const one = own.length === 1, f1 = one && fem(own[0].type);
    en.push(`Its own ${listEn(own.map(p => `${NAME[p.type].en} on ${p.sq}`))} block${one ? "s" : ""} the way.`);
    pa.push(`ਬਾਦਸ਼ਾਹ ${one ? (f1 ? "ਦੀ ਆਪਣੀ" : "ਦਾ ਆਪਣਾ") : "ਦੇ ਆਪਣੇ"} ${listPa(own.map(p => the(p).pa))} ਰਾਹ ਰੋਕਦ${one ? (f1 ? "ੀ" : "ਾ") : "ੇ"} ${one ? "ਹੈ" : "ਹਨ"}।`);
  }
  if (f.edges) {
    en.push("The edge of the board closes the rest.");
    pa.push("ਬਿਸਾਤ ਦਾ ਕਿਨਾਰਾ ਬਾਕੀ ਰਾਹ ਬੰਦ ਕਰਦਾ ਹੈ।");
  }
  const gap = cs.length === 1 && lineHasGap(cs[0], f.king);
  en.push(cs.length > 1 ? "Only the king could answer a double check, and it has no safe square." : gap ? "Nothing can take the checking piece or block its line." : "Nothing can take the checking piece.");
  pa.push(cs.length > 1 ? "ਦੋਹਰੀ ਸ਼ਹਿ ਦਾ ਜਵਾਬ ਸਿਰਫ਼ ਬਾਦਸ਼ਾਹ ਦੇ ਸਕਦਾ ਹੈ, ਪਰ ਉਸ ਕੋਲ ਕੋਈ ਸੁਰੱਖਿਅਤ ਖਾਨਾ ਨਹੀਂ।" : gap ? "ਸ਼ਹਿ ਦੇਣ ਵਾਲੇ ਮੋਹਰੇ ਨੂੰ ਕੋਈ ਮਾਰ ਨਹੀਂ ਸਕਦਾ ਅਤੇ ਕੋਈ ਉਸ ਦੇ ਰਾਹ ਵਿੱਚ ਨਹੀਂ ਆ ਸਕਦਾ।" : "ਸ਼ਹਿ ਦੇਣ ਵਾਲੇ ਮੋਹਰੇ ਨੂੰ ਕੋਈ ਮਾਰ ਨਹੀਂ ਸਕਦਾ।");
  return { en: en.join(" "), pa: pa.join(" ") };
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---------- a note on each move of a build-up ----------
const VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Does the side to move in `fen` threaten checkmate - could it mate if it were to move twice in a row? Returns the mating move. */
export function threatOf(fen: string): string | null {
  const parts = fen.split(" ");
  const g0 = new Chess(fen);
  if (g0.inCheck()) return null;
  parts[1] = other(g0.turn()); parts[3] = "-";
  let h: Chess;
  try { h = new Chess(parts.join(" ")); } catch { return null; }   // the side that would move is not allowed to (the other king is in check)
  for (const m of h.moves({ verbose: true })) {
    const t = new Chess(h.fen()); t.move(m);
    if (t.isCheckmate()) return m.san;
  }
  return null;
}

/**
 * A short note on the learner's move `uci` in the position `fen`. `next` is the move the other side plays next in the line
 * (if any): a piece that is taken at once was given up. Every claim is read from the board.
 */
export function moveNote(fen: string, uci: string, next?: string): Text {
  const g = new Chess(fen);
  const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  const piece = word(m.piece), to = m.to;
  if (g.isCheckmate()) return { en: `Checkmate! ${cap(NAME[m.piece].en)} to ${to}.`, pa: `ਸ਼ਹਿ-ਮਾਤ! ${NAME[m.piece].pa} ${to} 'ਤੇ।` };
  const taken = m.captured ? word(m.captured) : null;
  const takenObj = m.captured ? `${OBLIQUE[m.captured] ?? word(m.captured).pa} ਨੂੰ` : "";   // the captured piece as the object: ਘੋੜੇ ਨੂੰ, ਰਾਣੀ ਨੂੰ
  // a sacrifice: the piece is taken at once in the line, and it is worth more than what it took
  const lost = next && next.slice(2, 4) === to && VAL[m.piece] >= 3 && VAL[m.piece] > (m.captured ? VAL[m.captured] : 0);
  const v = fem(m.piece) ? "ੀ" : "ਾ";   // the verb agrees with the piece: ਰਾਣੀ is feminine
  if (lost) return { en: `A sacrifice! The ${piece.en} on ${to} is given up.`, pa: `ਕੁਰਬਾਨੀ! ${to} ${poss(m.piece)} ${piece.pa} ਦੇ ਦਿੱਤ${v}।` };
  if (g.inCheck()) {
    return taken
      ? { en: `Check! The ${piece.en} takes the ${taken.en} on ${to}.`, pa: `ਸ਼ਹਿ! ${piece.pa} ${to} 'ਤੇ ${takenObj} ਮਾਰਦ${v} ਹੈ।` }
      : { en: `Check! ${cap(piece.en)} to ${to}.`, pa: `ਸ਼ਹਿ! ${piece.pa} ${to} 'ਤੇ।` };
  }
  const th = threatOf(g.fen());
  if (th) return { en: `${cap(piece.en)} to ${to}${taken ? ", taking the " + taken.en : ""}. It threatens checkmate with ${th}.`, pa: `${piece.pa} ${to} 'ਤੇ${taken ? ", " + takenObj + " ਮਾਰ ਕੇ" : ""}। ਇਹ ${th} ਨਾਲ ਸ਼ਹਿ-ਮਾਤ ਦੀ ਧਮਕੀ ਹੈ।` };
  return taken
    ? { en: `The ${piece.en} takes the ${taken.en} on ${to}.`, pa: `${piece.pa} ${to} 'ਤੇ ${takenObj} ਮਾਰਦ${v} ਹੈ।` }
    : { en: `A quiet move: ${piece.en} to ${to}.`, pa: `ਚੁੱਪ ਚਾਲ: ${piece.pa} ${to} 'ਤੇ।` };
}
