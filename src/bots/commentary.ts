// Play vs Coach (DECISIONS #108, option A): after every opponent move the coach names the THREAT (a red arrow) and
// an IDEA in one sentence; "Show me the idea" adds the green arrow. Every sentence comes from a fact found by the
// rules or Stockfish (a piece left loose, a mate threat, a winning capture, a castling move), never invented.
import { Chess, type Square } from "chess.js";
import { asNumber, type Score, type Uci } from "../engine/uci";
import { hanging } from "./gamecoach";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export type Threat =
  | { kind: "check"; from: Square; to: Square }
  | { kind: "take"; piece: string; sq: Square; from: Square }
  | { kind: "mate"; from: Square; to: Square }
  | { kind: "none" };
export type IdeaKind = "mate" | "save" | "win" | "castle" | "check" | "develop" | "centre" | "promote" | "improve";
export interface Idea { kind: IdeaKind; from: Square; to: Square; piece: string }

/** The opponent's threat that needs no engine: a check, or my piece they can take for free (or for less). */
export function quickThreat(fen: string): Threat | null {
  const g = new Chess(fen), me = g.turn(), them = me === "w" ? "b" : "w";
  if (g.inCheck()) {
    const king = g.board().flat().find(p => p && p.type === "k" && p.color === me)!.square;
    return { kind: "check", from: g.attackers(king, them)[0], to: king };
  }
  const loose = hanging(fen, me)[0];
  if (loose) {
    // the cheapest piece that can take it is the one to watch
    const by = g.attackers(loose.sq, them).sort((a, b) => (VALUE[g.get(a)!.type] || 99) - (VALUE[g.get(b)!.type] || 99))[0];
    return { kind: "take", piece: loose.type, sq: loose.sq, from: by };
  }
  return null;
}

/** The position with the other side to move (a "null move"), to ask what they would do if it were their turn. */
export function nullMoveFen(fen: string): string | null {
  const g = new Chess(fen);
  if (g.inCheck()) return null;
  const [b, turn, castling, , , full] = fen.split(" ");
  const out = `${b} ${turn === "w" ? "b" : "w"} ${castling} - 0 ${full}`;
  try { new Chess(out); return out; } catch { return null; }
}

/** What kind of idea Stockfish's best move is, for a learner: named by what it DOES, not by the move itself. */
export function classifyIdea(fen: string, uci: string, score: Score, ply: number): Idea {
  const g = new Chess(fen), me = g.turn();
  const loose = new Set(hanging(fen, me).map(h => h.sq));
  const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  const base = { from: m.from, to: m.to, piece: m.piece };
  const material = g.board().flat().filter(p => p && p.type !== "p" && p.type !== "k").length;
  if (m.san.endsWith("#") || (score.mate !== undefined && score.mate > 0 && score.mate <= 3)) return { kind: "mate", ...base };
  if (loose.has(m.from)) return { kind: "save", ...base };
  if (m.captured && VALUE[m.captured] >= 3 || (m.captured && asNumber(score) >= 150)) return { kind: "win", ...base };
  if (m.isKingsideCastle() || m.isQueensideCastle()) return { kind: "castle", ...base };
  if (m.san.includes("+")) return { kind: "check", ...base };
  if (ply < 20 && (m.piece === "n" || m.piece === "b") && (m.from[1] === "1" || m.from[1] === "8")) return { kind: "develop", ...base };
  if (ply < 20 && m.piece === "p" && "cde".includes(m.from[0])) return { kind: "centre", ...base };
  if (m.piece === "p" && material <= 4) return { kind: "promote", ...base };
  return { kind: "improve", ...base };
}

/** The coach's view of the position for the side to move: the threat against it, and its best idea. */
export async function commentary(engine: Uci, fen: string, ply: number): Promise<{ threat: Threat; idea: Idea | null }> {
  let threat: Threat = quickThreat(fen) ?? { kind: "none" };
  if (threat.kind === "none") {
    // nothing loose: does the opponent threaten mate if it were their move?
    const nf = nullMoveFen(fen);
    if (nf) {
      const a = await engine.analyse(nf, { depth: 8 });
      if (a.best && a.score.mate !== undefined && a.score.mate > 0 && a.score.mate <= 2)
        threat = { kind: "mate", from: a.best.slice(0, 2) as Square, to: a.best.slice(2, 4) as Square };
    }
  }
  const g = new Chess(fen);
  if (g.isGameOver()) return { threat, idea: null };
  const b = await engine.analyse(fen, { depth: 10 });
  return { threat, idea: b.best ? classifyIdea(fen, b.best, b.score, ply) : null };
}
