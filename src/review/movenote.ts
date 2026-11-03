// Game Review, a plain-words note on EVERY move (the "Learning set": chess.com's per-move explanations, for free).
// For one move: what it did (mates, promotes, forks, pins, takes, checks, threatens mate, castles, defends, develops,
// attacks) and, for a weak move, what went wrong and what the better move would have done. Pure and DOM-free
// (test/movenote.test.ts). Every claim is computed from the position by the rules (chess/tactics.ts, chess/rules.ts,
// bots/gamecoach.ts): if nothing can be proved the note says less, never more.
import { Chess, type Square } from "chess.js";
import { hanging } from "../bots/gamecoach";
import { forkTargets, unsafe, VALUE } from "../chess/rules";
import { allowedMate, forkOf, freePieceTaken, pinOf, threatensMate } from "../chess/tactics";
import type { Text } from "../lesson/types";
import type { Reviewed } from "./insights";

type Words = (key: string) => Text;
type Fill = Record<string, string | Text>;
export interface MoveNote {
  /** What the move did: most important first, at most two sentences. */
  what: Text[];
  /** For a weak move: what was wrong with it, then what the better move would have done. */
  why: Text[];
}

const mv = (g: Chess, uci: string) => g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
const fill = (x: Text, n: Fill): Text => ({
  en: Object.entries(n).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, typeof v === "string" ? v : v.en), x.en),
  pa: Object.entries(n).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, typeof v === "string" ? v : v.pa), x.pa),
});

/** What a move did, from the position before it. Up to two facts, the most important first. */
export function whatItDid(fen: string, uci: string, ply: number, w: Words, pieceWord: (p: string) => Text): Text[] {
  const before = new Chess(fen), g = new Chess(fen), m = mv(g, uci), me = m.color, them = me === "w" ? "b" : "w";
  const out: Text[] = [], add = (x: Text) => { if (out.length < 2) out.push(x); };
  const pc = (p: string) => pieceWord(p);
  if (g.isCheckmate()) return [w("mn_mate")];
  if (m.promotion) add(fill(w("mn_promote"), { piece: pc(m.promotion) }));
  const fork = forkOf(fen, uci), pin = pinOf(fen, uci);
  if (fork) {
    const top = [...fork].sort((a, b) => VALUE[b.type] - VALUE[a.type]).slice(0, 2);
    add(fill(w("mn_fork"), { a: pc(top[0].type), sa: top[0].sq, b: pc(top[1].type), sb: top[1].sq }));
  }
  if (pin) add(fill(w("mn_pin"), { a: pc(pin.pinned.type), sa: pin.pinned.sq, b: pc(pin.behind.type), sb: pin.behind.sq }));
  if (m.captured) add(fill(w(freePieceTaken(fen, uci) ? "mn_takeFree" : "mn_take"), { piece: pc(m.captured), sq: m.to }));
  if (g.inCheck()) add(w("mn_check"));
  else if (threatensMate(g.fen())) add(w("mn_threatMate"));
  if (m.isKingsideCastle() || m.isQueensideCastle()) add(w("mn_castle"));
  else {
    // a piece of mine under attack that this move newly guards
    const guarded = g.board().flat().filter(p => p && p.color === me && p.type !== "k" && p.square !== m.to
      && g.attackers(p.square, them).length > 0 && g.attackers(p.square, me).includes(m.to)
      && !before.attackers(p.square, me).includes(m.from)).sort((a, b) => VALUE[b!.type] - VALUE[a!.type])[0];
    if (guarded) add(fill(w("mn_defend"), { piece: pc(guarded.type), sq: guarded.square }));
    const homeRank = me === "w" ? "1" : "8";
    if ((m.piece === "n" || m.piece === "b") && m.from[1] === homeRank && m.to[1] !== homeRank && ply < 24) add(fill(w("mn_develop"), { piece: pc(m.piece) }));
    if (!m.captured && !g.inCheck()) {
      const target = forkTargetsOf(g, m.to).sort((a, b) => VALUE[b.type] - VALUE[a.type])[0];
      if (target) add(fill(w("mn_attack"), { piece: pc(target.type), sq: target.sq }));
    }
    if (m.piece === "p" && ply < 20 && ["d4", "e4", "d5", "e5"].includes(m.to)) add(w("mn_centre"));
  }
  if (!out.length) add(fill(w("mn_plain"), { piece: pc(m.piece), sq: m.to }));
  return out;
}

/** The enemy pieces the piece on `sq` attacks that are worth attacking (rules.ts forkTargets), with their types. */
function forkTargetsOf(g: Chess, sq: string): { type: string; sq: string }[] {
  return forkTargets(g, sq).map(t => ({ type: g.get(t as Square)!.type, sq: t }));
}

/** For a weak move: a sentence on what the move allowed or gave up, then one on what the best move would have done.
 *  Only facts: a mate allowed, the moved piece lost for nothing, a piece left loose; then the best move's own
 *  mate, free piece, fork, pin, rescue, capture or check; failing all of these, just "{best} was better". */
export function whyWeak(fen: string, m: Reviewed, w: Words, pieceWord: (p: string) => Text): Text[] {
  if (!m.best) return [];
  const out: Text[] = [], pc = (p: string) => pieceWord(p);
  const g = new Chess(fen), me = g.turn(), played = mv(g, m.uci);
  const bestG = new Chess(fen), best = mv(bestG, m.best), bestSan = best.san;

  // what the move cost
  const mate = allowedMate(g.fen());
  if (mate) out.push(fill(w("mn_allowsMate"), { san: mate }));
  else {
    const lost = unsafe(g, played.to) && !(played.captured && VALUE[played.captured] >= VALUE[played.piece]);
    const loose = hanging(g.fen(), me)[0];
    if (lost) out.push(fill(w("mn_unsafe"), { piece: pc(played.piece), sq: played.to }));
    else if (loose) out.push(fill(w("why_hang"), { piece: pc(loose.type), sq: loose.sq }));
  }

  // what the best move would have done
  const n: Fill = { best: bestSan };
  const fork = forkOf(fen, m.best), pin = pinOf(fen, m.best), free = freePieceTaken(fen, m.best);
  const was = hanging(fen, me), now = hanging(bestG.fen(), me).map(h => h.sq);
  const saved = was.find(h => !now.includes((h.sq === best.from ? best.to : h.sq) as Square));
  if (bestG.isCheckmate()) out.push(fill(w("why_mate"), n));
  else if (free) out.push(fill(w("mn_betterFree"), { ...n, piece: pc(free), sq: best.to }));
  else if (fork) { const top = [...fork].sort((a, b) => VALUE[b.type] - VALUE[a.type]).slice(0, 2);
    out.push(fill(w("mn_betterFork"), { ...n, a: pc(top[0].type), sa: top[0].sq, b: pc(top[1].type), sb: top[1].sq })); }
  else if (pin) out.push(fill(w("mn_betterPin"), { ...n, a: pc(pin.pinned.type), sa: pin.pinned.sq, b: pc(pin.behind.type), sb: pin.behind.sq }));
  else if (saved) out.push(fill(w("mn_betterSave"), { ...n, piece: pc(saved.type), sq: saved.sq }));
  else if (best.captured) out.push(fill(w("mn_betterTake"), { ...n, piece: pc(best.captured), sq: best.to }));
  else if (bestG.inCheck()) out.push(fill(w("mn_betterCheck"), n));
  else out.push(fill(w("why_other"), n));
  return out;
}

/** The whole note for move `m` (position `fen` before it). The Young look keeps two sentences: what it did, and
 *  the better move. */
export function moveNote(fen: string, m: Reviewed, w: Words, pieceWord: (p: string) => Text): MoveNote {
  const weak = m.drop >= 10 && !!m.best;
  return { what: whatItDid(fen, m.uci, m.i, w, pieceWord), why: weak ? whyWeak(fen, m, w, pieceWord) : [] };
}
export const shortNote = (n: MoveNote): Text[] => [...n.what.slice(0, 1), ...n.why.slice(-1)];
