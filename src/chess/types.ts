// Shared chess vocabulary. Squares are "a1".."h8"; pieces are colour + type, e.g. "wN", "bK".
export type Color = "w" | "b";
export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type PieceCode = `${Color}${PieceType}`;
export type Square = string;
export type Placement = Partial<Record<Square, PieceCode>>;

export const FILES = "abcdefgh";

export const isSquare = (s: string): boolean => /^[a-h][1-8]$/.test(s);
export const fileOf = (s: Square) => FILES.indexOf(s[0]);
export const rankOf = (s: Square) => Number(s[1]) - 1;
export const sq = (f: number, r: number): Square | null =>
  f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null;
export const isLight = (s: Square) => (fileOf(s) + rankOf(s)) % 2 === 1;

export const ALL_SQUARES: Square[] = [];
for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) ALL_SQUARES.push(sq(f, r)!);

/** "wK" -> { color: "w", type: "K" } */
export const split = (p: PieceCode) => ({ color: p[0] as Color, type: p[1] as PieceType });

/** Placement from a FEN board field (or a whole FEN). */
export function placementFromFen(fen: string): Placement {
  const out: Placement = {};
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += Number(ch); continue; }
      const color: Color = ch === ch.toUpperCase() ? "w" : "b";
      out[sq(f, 7 - i)!] = `${color}${ch.toUpperCase() as PieceType}`;
      f++;
    }
  });
  return out;
}
