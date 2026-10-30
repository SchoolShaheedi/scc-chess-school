// Master games (guess the move). Eight famous games, all played before 1950. The moves are facts (src/master/moves.ts);
// every note is written for this app and lives in src/i18n.ts under mg_<id>_<k>. A note that says a position is won,
// or that a mate is forced, carries a `claim`, and test/master-proof.test.ts (MASTER_PROOF=1) checks it with Stockfish
// at depth 18 or more.
import { Chess } from "chess.js";
import { MOVES } from "./moves";

/** n = the number of plies played when the note shows (the note speaks about the move just played). */
export interface Note {
  n: number;
  /** i18n key suffix: mg_<id>_<k> */
  k: string;
  /** checked by Stockfish in test/master-proof.test.ts:
   *  mate = the side `by` has a forced mate within `max` moves from the position after `at` plies;
   *  adv  = the side `by` is ahead by at least `cp` centipawns in the position after `at` plies. */
  claim?: { t: "mate"; at: number; by: "w" | "b"; max: number } | { t: "adv"; at: number; by: "w" | "b"; cp: number };
}

export interface MasterGame {
  id: string;
  white: string;
  black: string;
  year: number;
  /** "1-0" or "0-1" (the result in the sources) */
  result: "1-0" | "0-1";
  /** the final move mates (checked by chess.js) */
  mate: boolean;
  /** guessing starts at this move number; earlier moves are played for you */
  from: number;
  sans: string[];
}

const sansOf = (id: string): string[] => MOVES[id].split(" ").map(t => t.replace(/^\d+\./, ""));

const G = (id: string, white: string, black: string, year: number, result: "1-0" | "0-1", mate: boolean, from: number): MasterGame =>
  ({ id, white, black, year, result, mate, from, sans: sansOf(id) });

export const GAMES: MasterGame[] = [
  G("immortal", "Adolf Anderssen", "Lionel Kieseritzky", 1851, "1-0", true, 6),
  G("evergreen", "Adolf Anderssen", "Jean Dufresne", 1852, "1-0", true, 6),
  G("opera", "Paul Morphy", "Duke of Brunswick and Count Isouard", 1858, "1-0", true, 5),
  G("reti", "Richard Réti", "Saviely Tartakower", 1910, "1-0", true, 5),
  G("capa", "José Raúl Capablanca", "Saviely Tartakower", 1924, "1-0", false, 10),
  G("rotlewi", "Georg Rotlewi", "Akiba Rubinstein", 1907, "0-1", false, 8),
  G("lasker", "Emanuel Lasker", "Johann Bauer", 1889, "1-0", false, 8),
  G("steinitz", "William Steinitz", "Curt von Bardeleben", 1895, "1-0", false, 8),
];

export const NOTES: Record<string, Note[]> = {
  immortal: [
    { n: 4, k: "n1" }, { n: 7, k: "n2" }, { n: 17, k: "n3" }, { n: 23, k: "n4" }, { n: 35, k: "n5" }, { n: 41, k: "n6" },
    { n: 43, k: "n7", claim: { t: "mate", at: 42, by: "w", max: 2 } }, { n: 45, k: "n8" },
  ],
  evergreen: [
    { n: 7, k: "n1" }, { n: 14, k: "n2" }, { n: 17, k: "n3" }, { n: 21, k: "n4" }, { n: 33, k: "n5" },
    { n: 39, k: "n6", claim: { t: "adv", at: 39, by: "w", cp: 400 } }, { n: 47, k: "n7" },
  ],
  opera: [
    { n: 13, k: "n1" }, { n: 17, k: "n2" }, { n: 19, k: "n3" }, { n: 24, k: "n4" }, { n: 25, k: "n5" },
    { n: 31, k: "n6", claim: { t: "mate", at: 30, by: "w", max: 2 } }, { n: 33, k: "n7" },
  ],
  reti: [
    { n: 2, k: "n1" }, { n: 10, k: "n2" }, { n: 12, k: "n3" }, { n: 15, k: "n4" },
    { n: 17, k: "n5", claim: { t: "mate", at: 16, by: "w", max: 3 } }, { n: 19, k: "n6" }, { n: 21, k: "n7" },
  ],
  capa: [
    { n: 4, k: "n1" }, { n: 21, k: "n2" }, { n: 37, k: "n3" }, { n: 52, k: "n4" }, { n: 71, k: "n5" },
    { n: 77, k: "n6" }, { n: 81, k: "n7" }, { n: 103, k: "n8", claim: { t: "adv", at: 103, by: "w", cp: 300 } },
  ],
  rotlewi: [
    { n: 26, k: "n1" }, { n: 30, k: "n2" }, { n: 40, k: "n3" }, { n: 42, k: "n4" }, { n: 44, k: "n5" },
    { n: 46, k: "n6" }, { n: 50, k: "n7", claim: { t: "mate", at: 50, by: "b", max: 3 } },
  ],
  lasker: [
    { n: 23, k: "n1" }, { n: 29, k: "n2" }, { n: 31, k: "n3" }, { n: 33, k: "n4" }, { n: 37, k: "n5" },
    { n: 39, k: "n6" }, { n: 43, k: "n7" }, { n: 75, k: "n8", claim: { t: "adv", at: 75, by: "w", cp: 300 } },
  ],
  steinitz: [
    { n: 14, k: "n1" }, { n: 19, k: "n2" }, { n: 27, k: "n3" }, { n: 33, k: "n4" }, { n: 37, k: "n5" },
    { n: 41, k: "n6" }, { n: 49, k: "n7", claim: { t: "adv", at: 49, by: "w", cp: 300 } },
  ],
};

/** The positions of a game: fens[i] = after i plies; moves[i] = the i-th move (0-based) in from/to/san form. */
export interface Line { fens: string[]; moves: { from: string; to: string; san: string; promotion?: string }[] }
export function replay(g: MasterGame): Line {
  const c = new Chess(), fens = [c.fen()], moves: Line["moves"] = [];
  for (const san of g.sans) {
    const m = c.move(san);
    moves.push({ from: m.from, to: m.to, san: m.san, ...(m.promotion ? { promotion: m.promotion } : {}) });
    fens.push(c.fen());
  }
  return { fens, moves };
}

/** The first ply (0-based) at which this side makes a guess in this game. */
export const firstGuess = (g: MasterGame, side: "w" | "b"): number => 2 * (g.from - 1) + (side === "w" ? 0 : 1);
/** Plies that are guessed by this side. */
export const guessPlies = (g: MasterGame, side: "w" | "b"): number[] => {
  const out: number[] = [];
  for (let i = firstGuess(g, side); i < g.sans.length; i += 2) out.push(i);
  return out;
};
export const maxPoints = (g: MasterGame, side: "w" | "b"): number => 3 * guessPlies(g, side).length;
export const byId = (id: string): MasterGame | undefined => GAMES.find(g => g.id === id);
