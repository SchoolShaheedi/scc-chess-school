// Notation drill (Practice tools, 2026-11-03): read what a learner typed as a move. Pure and DOM-free, so every rule is
// tested (test/notation.test.ts). Forgiving on purpose: 0-0 for castling, no + or #, no x, no =, lower-case piece letters
// and promotion letters, and a disambiguation that was not needed. It refuses a move that two of the legal moves fit.
import { Chess, type Move } from "chess.js";

export type NotationRead =
  | { ok: true; move: Move; san: string }
  | { ok: false; reason: "empty" | "unreadable" | "illegal" | "ambiguous" | "promotion" };

/** Everything the learner may have typed that does not change the move: spaces, + # ! ?, x, = and a colon. */
const clean = (s: string) => s.normalize("NFKC").replace(/[−–—]/g, "-").replace(/[\s+#!?=:x×X]/g, "");

/** The ways one legal move may be written once x, +, # and = are gone. Pieces are upper-case, files lower-case. */
function forms(m: Move): string[] {
  if (m.san.startsWith("O-O-O")) return ["O-O-O"];
  if (m.san.startsWith("O-O")) return ["O-O"];
  const promo = m.promotion ? m.promotion.toUpperCase() : "";
  if (m.piece === "p") return m.flags.includes("c") || m.flags.includes("e") ? [`${m.from[0]}${m.to}${promo}`] : [`${m.to}${promo}`];
  const P = m.piece.toUpperCase();
  return [`${P}${m.to}`, `${P}${m.from[0]}${m.to}`, `${P}${m.from[1]}${m.to}`, `${P}${m.from}${m.to}`];
}

/** Read a typed move in a position. */
export function readMove(fen: string, input: string): NotationRead {
  let s = clean(input);
  if (!s) return { ok: false, reason: "empty" };
  const legal = new Chess(fen).moves({ verbose: true });
  // castling: 0-0, o-o, O-O, 0-0-0, ooo ...
  const cs = /^[0Oo]-?[0Oo](-?[0Oo])?$/.exec(s);
  if (cs) {
    const want = cs[1] ? "O-O-O" : "O-O";
    const m = legal.find(x => forms(x)[0] === want);
    return m ? { ok: true, move: m, san: m.san } : { ok: false, reason: "illegal" };
  }
  s = s.replace(/-/g, "");   // Ng1-f3
  // squares only, as in e2e4 or e7e8q
  const sq = /^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/.exec(s);
  if (sq) {
    const m = legal.filter(x => x.from === sq[1] && x.to === sq[2] && (x.promotion ?? "") === (sq[3]?.toLowerCase() ?? ""));
    if (m.length === 1) return { ok: true, move: m[0], san: m[0].san };
    // e7e8 with no piece: the squares are right, the new piece is missing
    return { ok: false, reason: !sq[3] && legal.some(x => x.from === sq[1] && x.to === sq[2] && x.promotion) ? "promotion" : "illegal" };
  }
  // a lower-case promotion letter: e8q, exd8n
  s = s.replace(/^([a-h]?[a-h][18])([qrbn])$/, (_, a: string, p: string) => a + p.toUpperCase());
  if (!/^[KQRBNkqrbn]?[a-h]?[1-8]?[a-h][1-8][QRBN]?$/.test(s)) return { ok: false, reason: "unreadable" };
  // a lower-case piece letter counts only where nothing else could be meant: "nf3" is the knight, but "bc4" may also be bxc4
  const asIs = legal.filter(m => forms(m).includes(s));
  // (but "bxc4", typed with its x, is the b-pawn)
  const lowerPiece = /^[qrbnk]/.test(s) && s.length >= 3 && !(s[0] === "b" && /x/.test(input)) ? s[0].toUpperCase() + s.slice(1) : null;
  const viaLower = lowerPiece ? legal.filter(m => forms(m).includes(lowerPiece)) : [];
  const all = [...new Set([...asIs, ...viaLower])];
  if (all.length === 1) return { ok: true, move: all[0], san: all[0].san };
  if (all.length > 1) return { ok: false, reason: "ambiguous" };
  // a bare pawn move that only fits promotion moves (e8 for e8=Q): say what is missing, not "illegal"
  if (legal.some(m => m.promotion && forms(m).some(f => f.slice(0, -1) === s))) return { ok: false, reason: "promotion" };
  return { ok: false, reason: "illegal" };
}

export type NotationCheck =
  | { result: "right"; san: string; exact: boolean }   // exact: it was typed exactly as the proper SAN
  | { result: "wrong"; san: string }                   // a legal move, not the one asked for; `san` is how it is properly written
  | { result: "unreadable" | "illegal" | "ambiguous" | "empty" | "promotion" };

/** Check a typed answer against the expected move (as a SAN in that position). */
export function checkTyped(fen: string, input: string, expectedSan: string): NotationCheck {
  const r = readMove(fen, input);
  if (!r.ok) return { result: r.reason };
  const want = new Chess(fen).moves({ verbose: true }).find(m => m.san === expectedSan);
  // when the expected move gives mate, any legal move that gives mate is just as good
  const same = !!want && ((want.from === r.move.from && want.to === r.move.to && want.promotion === r.move.promotion)
    || (want.san.endsWith("#") && r.move.san.endsWith("#")));
  return same ? { result: "right", san: r.san, exact: input.trim() === r.san } : { result: "wrong", san: r.san };
}

/** The reverse drill: the right name and (up to) three other legal moves, in a shuffled order. */
export function nameChoices(fen: string, answerSan: string, rand: () => number = Math.random, n = 4): string[] {
  const all = new Chess(fen).moves().filter(m => m !== answerSan);
  const piece = (san: string) => (/^[KQRBN]/.test(san) ? san[0] : "P");
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // prefer decoys that look alike (same piece), then fill from the rest
  const out = [answerSan, ...shuffle(all.filter(m => piece(m) === piece(answerSan))).slice(0, n - 1)];
  for (const m of shuffle(all.filter(m => piece(m) !== piece(answerSan)))) { if (out.length >= n) break; out.push(m); }
  return shuffle(out);
}

/** A drill position from a puzzle: the board after the opponent's setup move, and the learner's move (moves[1]). */
export function drillFrom(p: { fen: string; moves: string[] }): { fen: string; san: string; from: string; to: string } | null {
  if (p.moves.length < 2) return null;
  try {
    const g = new Chess(p.fen), mv = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    g.move(mv(p.moves[0]));
    const fen = g.fen(), m = g.move(mv(p.moves[1]));
    return { fen, san: m.san, from: m.from, to: m.to };
  } catch { return null; }
}
