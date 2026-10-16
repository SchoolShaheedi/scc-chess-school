// The board editor's rules (DECISIONS #115, option C): a placement and a side to move become a FEN, with castling
// worked out from where the kings and rooks stand, and the position is checked before it can be analysed or played.
// Pure and DOM-free: tested in test/editor.test.ts.
import { Chess } from "chess.js";
import { FILES, type Placement } from "../chess/types";

/** Castling is possible only with the king and that rook still on their first squares. */
export function castlingOf(pos: Placement): string {
  const c = (k: string, r: string, king: string, rook: string) => pos[king] === k && pos[rook] === r;
  const s = (c("wK", "wR", "e1", "h1") ? "K" : "") + (c("wK", "wR", "e1", "a1") ? "Q" : "")
    + (c("bK", "bR", "e8", "h8") ? "k" : "") + (c("bK", "bR", "e8", "a8") ? "q" : "");
  return s || "-";
}

export function fenOf(pos: Placement, turn: "w" | "b"): string {
  const rows: string[] = [];
  for (let r = 8; r >= 1; r--) {
    let row = "", empty = 0;
    for (const f of FILES) {
      const p = pos[f + r];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p[0] === "w" ? p[1] : p[1].toLowerCase();
    }
    rows.push(row + (empty || ""));
  }
  return `${rows.join("/")} ${turn} ${castlingOf(pos)} - 0 1`;
}

export type Problem = "kings" | "pawnEdge" | "tooMany" | "notToMoveInCheck" | "bad";
/** Why a position can't be played, or null when it can. */
export function problemOf(pos: Placement, turn: "w" | "b"): Problem | null {
  const all = Object.entries(pos);
  const count = (code: string) => all.filter(([, p]) => p === code).length;
  if (count("wK") !== 1 || count("bK") !== 1) return "kings";
  if (all.some(([sq, p]) => p?.[1] === "P" && (sq[1] === "1" || sq[1] === "8"))) return "pawnEdge";
  for (const c of ["w", "b"]) {
    const mine = all.filter(([, p]) => p?.[0] === c);
    if (mine.length > 16 || mine.filter(([, p]) => p?.[1] === "P").length > 8) return "tooMany";
  }
  // the side that has just moved can't still be in check: look at it as if it were their turn
  const other = turn === "w" ? "b" : "w";
  try { if (new Chess(fenOf(pos, other)).inCheck()) return "notToMoveInCheck"; } catch { return "bad"; }
  try { new Chess(fenOf(pos, turn)); } catch { return "bad"; }
  return null;
}
