// Learn all the checkmates (DECISIONS #137): the named checkmates, easy to hard, each with its final picture, a build-up
// line that ends in it, and where its practice positions come from. ALL TEXT DRAFT until the user checks the Punjabi (DECISIONS #25, #33).
//
// Every claim is checked by test/mates.test.ts (hard gate): the final position is legal and checkmate; the line replays
// legally and ends in exactly that position, with the learner's side giving the mate; with ENGINE=1 every move of the
// learner's is a mating (or best) move by Stockfish; the practice theme exists in the bank. The "why it's mate" words are
// not written here: they are computed from the final position (src/mates/why.ts), so they cannot be wrong about the board.
//
// Names are names: transliterated, as the opening names are (src/content/course.ts). The mates the bank tags (19) take
// their build-up from a real Lichess puzzle (CC0; its id is kept for credit); the rest from the textbook line or a
// historical game, replayed and engine-checked. The pattern names and what each one is follow Wikipedia's "Checkmate
// pattern" article and Lichess's theme descriptions. "Corridor mate" is another name for the back-rank mate and "Cozio's
// mate" for the dovetail mate (the same pattern, so one entry each).
import type { Text } from "../lesson/types";
import type { PatternId } from "../mates/classify";

export type MateGroup = "first" | "teams" | "knight" | "bishop" | "queen" | "traps" | "basic";
export const MATE_GROUPS: { group: MateGroup; title: Text }[] = [
  { group: "first", title: { en: "First mates", pa: "ਪਹਿਲੀਆਂ ਮਾਤਾਂ" } },
  { group: "teams", title: { en: "Rook and piece teams", pa: "ਹਾਥੀ ਅਤੇ ਹੋਰ ਮੋਹਰਿਆਂ ਦੀ ਜੋੜੀ" } },
  { group: "knight", title: { en: "Knight mates", pa: "ਘੋੜੇ ਦੀਆਂ ਮਾਤਾਂ" } },
  { group: "bishop", title: { en: "Bishop mates", pa: "ਊਠ ਦੀਆਂ ਮਾਤਾਂ" } },
  { group: "queen", title: { en: "Queen mates", pa: "ਰਾਣੀ ਦੀਆਂ ਮਾਤਾਂ" } },
  { group: "traps", title: { en: "Famous traps", pa: "ਮਸ਼ਹੂਰ ਜਾਲ" } },
  { group: "basic", title: { en: "Basic endgame mates", pa: "ਅੰਤਲੀ ਖੇਡ ਦੀਆਂ ਮੁੱਢਲੀਆਂ ਮਾਤਾਂ" } },
];

/** Where a build-up line comes from, for the credit line. */
export type Source = { kind: "bank"; id: string } | { kind: "game"; name: Text } | { kind: "built" };
export interface Line {
  /** The position the line starts from (either side may move first: a bank puzzle starts with the other side's move). */
  fen: string;
  /** Every ply, UCI. The side that gives the mate at the end is the learner. */
  moves: string[];
  source: Source;
  /** A note written by hand on the ply with this index (otherwise the note is computed from the board). */
  notes?: Record<number, Text>;
}
export interface Mate {
  id: string;
  group: MateGroup;
  name: Text;
  /** One line, in plain words. */
  about: Text;
  /** Another name for the same pattern. */
  also?: Text;
  /** The final mate position. */
  final: string;
  line: Line;
  /** Where the practice positions come from: the bank's theme tag, or a classifier rule (src/mates/classify.ts) for patterns the bank does not tag. */
  practice?: { theme?: string; rule?: PatternId };
  /** A basic mate that the lessons already teach: practice is there, not here. */
  link?: { kind: "lesson"; to: string } | { kind: "ladder"; to: string };
}

export const MATES: Mate[] = [
  {
    id: "backrank", group: "first",
    name: { en: "Back-rank mate", pa: "ਪਿਛਲੀ ਕਤਾਰ ਦੀ ਮਾਤ" },
    about: { en: "The king is trapped on the back row by its own pawns.", pa: "ਬਾਦਸ਼ਾਹ ਆਪਣੇ ਹੀ ਪਿਆਦਿਆਂ ਕਰਕੇ ਪਿਛਲੀ ਕਤਾਰ ਵਿੱਚ ਫਸਿਆ ਹੋਇਆ ਹੈ।" },
    also: { en: "corridor mate", pa: "ਕੋਰੀਡੋਰ ਮਾਤ" },
    final: "8/8/4k3/4Pp2/5P2/8/6PP/3r3K w - - 0 48",
    line: { fen: "8/8/4k3/4Pp2/r4P2/8/2Rp2PP/3R3K w - - 0 45", moves: "d1d2 a4a1 c2c1 a1c1 d2d1 c1d1".split(" "), source: { kind: "bank", id: "47hfM" } },
    practice: { theme: "backRankMate" },
  },
  {
    id: "epaulette", group: "first",
    name: { en: "Epaulette mate", pa: "ਏਪੌਲੇਟ ਮਾਤ" },
    about: { en: "The king's own pieces stand on both sides of it.", pa: "ਬਾਦਸ਼ਾਹ ਦੇ ਦੋਵੇਂ ਪਾਸੇ ਉਸ ਦੇ ਆਪਣੇ ਮੋਹਰੇ ਖੜ੍ਹੇ ਹਨ।" },
    final: "4rkr1/3R3p/6p1/8/5R2/7P/6P1/7K b - - 0 37",
    line: { fen: "4rkr1/3R3p/6p1/8/8/4b2P/3N2P1/4R2K b - - 1 35", moves: "e3d2 e1f1 d2f4 f1f4".split(" "), source: { kind: "bank", id: "0S6m6" } },
    practice: { theme: "epauletteMate" },
  },
  {
    id: "pawn", group: "first",
    name: { en: "Pawn mate", pa: "ਪਿਆਦੇ ਦੀ ਮਾਤ" },
    about: { en: "A little pawn gives the checkmate, with enemy pawns beside the king.", pa: "ਇੱਕ ਨਿੱਕਾ ਪਿਆਦਾ ਮਾਤ ਦਿੰਦਾ ਹੈ, ਅਤੇ ਬਾਦਸ਼ਾਹ ਦੇ ਕੋਲ ਵਿਰੋਧੀ ਦੇ ਪਿਆਦੇ ਹਨ।" },
    also: { en: "David and Goliath mate", pa: "ਦਾਊਦ ਅਤੇ ਗੋਲਿਅਥ ਮਾਤ" },
    final: "8/8/8/k7/pp6/K7/PP5N/8 w - - 0 48",
    line: { fen: "8/8/8/kpp5/p7/K1P2N2/PP5r/8 w - - 2 46", moves: "f3h2 b5b4 c3b4 c5b4".split(" "), source: { kind: "bank", id: "0PFc8" } },
    practice: { rule: "pawn" },
  },
  {
    id: "corner", group: "first",
    name: { en: "Corner mate", pa: "ਕੋਨੇ ਦੀ ਮਾਤ" },
    about: { en: "A rook or queen locks the king in the corner and a small piece gives check.", pa: "ਹਾਥੀ ਜਾਂ ਰਾਣੀ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੋਨੇ ਵਿੱਚ ਬੰਦ ਕਰਦੇ ਹਨ ਅਤੇ ਇੱਕ ਛੋਟਾ ਮੋਹਰਾ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ।" },
    final: "3qr2k/p4Q2/6N1/3p2bp/P7/7P/2nN1PP1/6K1 b - - 0 31",
    line: { fen: "3qr1k1/p1Q2p2/6p1/3pN1bp/P2n4/7P/2RN1PP1/6K1 b - - 1 29", moves: "d4c2 c7f7 g8h8 e5g6".split(" "), source: { kind: "bank", id: "0QPDw" } },
    practice: { theme: "cornerMate" },
  },
  {
    id: "arabian", group: "teams",
    name: { en: "Arabian mate", pa: "ਅਰਬੀ ਮਾਤ" },
    about: { en: "Rook and knight trap the king in the corner.", pa: "ਹਾਥੀ ਅਤੇ ਘੋੜਾ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੋਨੇ ਵਿੱਚ ਫਸਾਉਂਦੇ ਹਨ।" },
    final: "1k6/4R3/2R5/4P3/8/5n1P/8/6rK w - - 6 49",
    line: { fen: "1k4r1/7R/2R5/4P1n1/8/7P/7K/8 w - - 2 47", moves: "h7e7 g5f3 h2h1 g8g1".split(" "), source: { kind: "bank", id: "0hE5M" } },
    practice: { theme: "arabianMate" },
  },
  {
    id: "anastasia", group: "teams",
    name: { en: "Anastasia's mate", pa: "ਅਨਾਸਤਾਸੀਆ ਦੀ ਮਾਤ" },
    about: { en: "Knight and rook trap the king between the edge and its own piece.", pa: "ਘੋੜਾ ਅਤੇ ਹਾਥੀ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕਿਨਾਰੇ ਅਤੇ ਉਸ ਦੇ ਆਪਣੇ ਮੋਹਰੇ ਵਿਚਕਾਰ ਫਸਾਉਂਦੇ ਹਨ।" },
    final: "8/1p5p/p3N1pk/3K4/7R/8/8/8 b - - 0 43",
    line: { fen: "8/1p5p/p3N1pk/3K4/Pr6/4r3/8/6R1 b - - 3 40", moves: "b4a4 g1h1 e3h3 h1h3 a4h4 h3h4".split(" "), source: { kind: "bank", id: "0BprF" } },
    practice: { theme: "anastasiaMate" },
  },
  {
    id: "hook", group: "teams",
    name: { en: "Hook mate", pa: "ਹੁੱਕ ਮਾਤ" },
    about: { en: "A rook guarded by a knight, and the knight guarded by a pawn.", pa: "ਹਾਥੀ ਦੀ ਰਾਖੀ ਘੋੜਾ ਕਰਦਾ ਹੈ, ਅਤੇ ਘੋੜੇ ਦੀ ਰਾਖੀ ਪਿਆਦਾ।" },
    final: "Rbk5/8/8/8/2Pp4/4nB2/PP1KP3/3r4 w - - 2 40",
    line: { fen: "Rbk3r1/8/8/B7/2PpB3/4nb2/PP2P3/2K5 w - - 0 37", moves: "e4f3 g8g1 a5e1 g1e1 c1d2 e1d1".split(" "), source: { kind: "bank", id: "0VBZC" } },
    practice: { theme: "hookMate" },
  },
  {
    id: "vukovic", group: "teams",
    name: { en: "Vuković's mate", pa: "ਵੂਕੋਵਿਚ ਦੀ ਮਾਤ" },
    about: { en: "A guarded rook checks on the edge and a knight covers the last squares.", pa: "ਰਾਖੀ ਵਾਲਾ ਹਾਥੀ ਕਿਨਾਰੇ 'ਤੇ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ ਅਤੇ ਘੋੜਾ ਬਾਕੀ ਖਾਨੇ ਰੋਕਦਾ ਹੈ।" },
    final: "3Q4/5Pkp/6p1/8/7P/6Pn/r6r/5R1K w - - 3 36",
    line: { fen: "3Q4/5pkp/4P1p1/8/7P/6P1/rr3n2/5RK1 w - - 0 34", moves: "e6f7 f2h3 g1h1 b2h2".split(" "), source: { kind: "bank", id: "07uNx" } },
    practice: { theme: "vukovicMate" },
  },
  {
    id: "killbox", group: "teams",
    name: { en: "Kill box mate", pa: "ਕਿੱਲ ਬਾਕਸ ਮਾਤ" },
    about: { en: "A rook beside the king, a queen behind it: a box with no way out.", pa: "ਬਾਦਸ਼ਾਹ ਦੇ ਕੋਲ ਹਾਥੀ, ਉਸ ਦੇ ਪਿੱਛੇ ਰਾਣੀ: ਇੱਕ ਡੱਬਾ ਜਿਸ ਵਿੱਚੋਂ ਨਿਕਲਣ ਦਾ ਰਾਹ ਨਹੀਂ।" },
    final: "5Rk1/2p4p/p1p3pQ/q4p2/5P2/8/5PPP/6K1 b - - 0 26",
    line: { fen: "r4rk1/2p1R2p/p1p3pQ/q4p2/5P2/8/5PPP/4R1K1 b - - 3 23", moves: "f8f7 e7e8 a8e8 e1e8 f7f8 e8f8".split(" "), source: { kind: "bank", id: "06jNM" } },
    practice: { theme: "killBoxMate" },
  },
  {
    id: "blindswine", group: "teams",
    name: { en: "Blind swine mate", pa: "ਬਲਾਈਂਡ ਸਵਾਈਨ ਮਾਤ" },
    about: { en: "Two rooks on the 7th row finish the king.", pa: "ਸੱਤਵੀਂ ਕਤਾਰ 'ਤੇ ਦੋ ਹਾਥੀ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿੰਦੇ ਹਨ।" },
    final: "5Rk1/5R2/6P1/5p2/8/1Pp5/P1P2q2/2K5 b - - 0 44",
    line: { fen: "5k2/5Rb1/6P1/5p2/4r3/1Pp5/P1P2q2/2KR4 b - - 8 41", moves: "f8g8 d1d8 e4e8 d8e8 g7f8 e8f8".split(" "), source: { kind: "bank", id: "04qWI" } },
    practice: { theme: "blindSwineMate" },
  },
  {
    id: "anderssen", group: "teams",
    name: { en: "Anderssen's mate", pa: "ਐਂਡਰਸਨ ਦੀ ਮਾਤ" },
    about: { en: "A rook checks on the back row, guarded by a pawn.", pa: "ਹਾਥੀ ਪਿਛਲੀ ਕਤਾਰ 'ਤੇ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ ਅਤੇ ਪਿਆਦਾ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" },
    final: "8/8/8/8/P7/5k2/6p1/R5Kr w - - 3 66",
    line: { fen: "8/8/8/8/P1r5/5k2/6pp/R6K w - - 0 64", moves: "h1h2 c4h4 h2g1 h4h1".split(" "), source: { kind: "bank", id: "3K8WN" } },
    practice: { rule: "anderssen" },
  },
  {
    id: "smothered", group: "knight",
    name: { en: "Smothered mate", pa: "ਘਿਰੀ ਹੋਈ ਮਾਤ" },
    about: { en: "A knight mates a king hemmed in by its own pieces.", pa: "ਘੋੜਾ ਉਸ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿੰਦਾ ਹੈ ਜੋ ਆਪਣੇ ਹੀ ਮੋਹਰਿਆਂ ਵਿੱਚ ਘਿਰਿਆ ਹੈ।" },
    also: { en: "Philidor's legacy", pa: "ਫ਼ਿਲੀਡੋਰ ਦੀ ਵਿਰਾਸਤ" },
    final: "4r1rk/ppp2Npp/8/2q5/3p4/8/PPP2PPP/1K1R4 b - - 1 24",
    line: { fen: "4rr1k/ppp2Npp/4Q3/2q5/3p4/8/PPP2PPP/1K1R4 b - - 4 21", moves: "h8g8 f7h6 g8h8 e6g8 f8g8 h6f7".split(" "), source: { kind: "bank", id: "09t3o" } },
    practice: { theme: "smotheredMate" },
  },
  {
    id: "doubleknight", group: "knight",
    name: { en: "Double knight mate", pa: "ਦੋ ਘੋੜਿਆਂ ਦੀ ਮਾਤ" },
    about: { en: "One knight checks, the other finishes.", pa: "ਇੱਕ ਘੋੜਾ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ, ਦੂਜਾ ਮਾਤ ਦਿੰਦਾ ਹੈ।" },
    final: "k1n5/ppNN4/8/8/8/8/8/K7 b - - 0 2",
    line: { fen: "1kn5/ppp5/4NN2/8/8/8/8/K7 w - - 0 1", moves: "f6d7 b8a8 e6c7".split(" "), source: { kind: "built" } },
  },
  {
    id: "stamma", group: "knight",
    name: { en: "Stamma's mate", pa: "ਸਤਾਮਾ ਦੀ ਮਾਤ" },
    about: { en: "A lone knight mates a king trapped in front of its own rook pawn.", pa: "ਇਕੱਲਾ ਘੋੜਾ ਉਸ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿੰਦਾ ਹੈ ਜੋ ਆਪਣੇ ਕਿਨਾਰੇ ਦੇ ਪਿਆਦੇ ਦੇ ਸਾਹਮਣੇ ਫਸਿਆ ਹੈ।" },
    final: "8/8/8/8/8/8/p1N5/k1K5 b - - 1 3",
    line: { fen: "8/8/8/8/8/p2N4/k1K5/8 w - - 0 1", moves: "d3b4 a2a1 c2c1 a3a2 b4c2".split(" "), source: { kind: "built" } },
  },
  {
    id: "opera", group: "bishop",
    name: { en: "Opera mate", pa: "ਓਪੇਰਾ ਮਾਤ" },
    about: { en: "A rook checks and a bishop guards it.", pa: "ਹਾਥੀ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ ਅਤੇ ਊਠ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" },
    final: "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17",
    line: { fen: "4kb1r/p2r1ppp/4qn2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 2 15", moves: "b5d7 f6d7 b3b8 d7b8 d1d8".split(" "), source: { kind: "game", name: { en: "Morphy vs the Duke of Brunswick and Count Isouard, Paris 1858", pa: "ਮੌਰਫ਼ੀ ਬਨਾਮ ਬ੍ਰਨਜ਼ਵਿਕ ਦਾ ਡਿਊਕ ਅਤੇ ਕਾਊਂਟ ਇਸੂਆਰ, ਪੈਰਿਸ, ੧੮੫੮" } } },
    practice: { theme: "operaMate" },
  },
  {
    id: "boden", group: "bishop",
    name: { en: "Boden's mate", pa: "ਬੋਡਨ ਦੀ ਮਾਤ" },
    about: { en: "Two bishops cross their diagonals.", pa: "ਦੋ ਊਠ ਆਪਣੀਆਂ ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ ਕੱਟਦੇ ਹਨ।" },
    final: "r3kbr1/p4p1p/1pB1pB2/8/5PP1/7P/P1P5/R2K3R b q - 0 17",
    line: { fen: "r1b1kbr1/p4p1p/1p2pB2/8/5PP1/3B3P/P1P5/R2K3R b q - 1 15", moves: "c8b7 d3b5 b7c6 b5c6".split(" "), source: { kind: "bank", id: "2DNOu" } },
    practice: { theme: "bodenMate" },
  },
  {
    id: "doublebishop", group: "bishop",
    name: { en: "Double bishop mate", pa: "ਦੋ ਊਠਾਂ ਦੀ ਮਾਤ" },
    about: { en: "Two bishops on neighbouring diagonals.", pa: "ਦੋ ਊਠ ਨਾਲ-ਨਾਲ ਦੀਆਂ ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ 'ਤੇ।" },
    final: "7k/pp5p/4BBp1/8/7P/8/P1P3PK/8 b - - 0 32",
    line: { fen: "3Q3k/pp5p/4B1p1/q7/5B1P/8/P1P3PK/8 b - - 0 30", moves: "a5d8 f4e5 d8f6 e5f6".split(" "), source: { kind: "bank", id: "0j27F" } },
    practice: { theme: "doubleBishopMate" },
  },
  {
    id: "morphy", group: "bishop",
    name: { en: "Morphy's mate", pa: "ਮੌਰਫ਼ੀ ਦੀ ਮਾਤ" },
    about: { en: "A bishop checks; a rook and the king's own pawn close the rest.", pa: "ਊਠ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ; ਹਾਥੀ ਅਤੇ ਬਾਦਸ਼ਾਹ ਦਾ ਆਪਣਾ ਪਿਆਦਾ ਬਾਕੀ ਰਾਹ ਬੰਦ ਕਰਦੇ ਹਨ।" },
    final: "7k/7p/5B2/2p5/1bP4r/p5R1/P6P/6K1 b - - 0 44",
    line: { fen: "7k/5p1p/3B4/2p5/1bP1r2P/p5R1/P6P/6K1 b - - 0 42", moves: "e4h4 d6e5 f7f6 e5f6".split(" "), source: { kind: "bank", id: "077W0" } },
    practice: { theme: "morphysMate" },
  },
  {
    id: "pillsbury", group: "bishop",
    name: { en: "Pillsbury's mate", pa: "ਪਿਲਸਬਰੀ ਦੀ ਮਾਤ" },
    about: { en: "A rook checks while a bishop cuts off the king.", pa: "ਹਾਥੀ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ ਅਤੇ ਊਠ ਬਾਦਸ਼ਾਹ ਦਾ ਰਾਹ ਕੱਟਦਾ ਹੈ।" },
    final: "8/5P2/p7/1kb4r/8/8/P5P1/7K w - - 0 52",
    line: { fen: "5r2/5P2/p7/1kbQ4/8/4N3/P5P1/7K w - - 7 49", moves: "e3f5 f8h8 f5h6 h8h6 d5h5 h6h5".split(" "), source: { kind: "bank", id: "0noxu" } },
    practice: { theme: "pillsburysMate" },
  },
  {
    id: "greco", group: "bishop",
    name: { en: "Greco's mate", pa: "ਗ੍ਰੇਕੋ ਦੀ ਮਾਤ" },
    about: { en: "A bishop holds the king in the corner, then a rook or queen checks on the edge.", pa: "ਊਠ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੋਨੇ ਵਿੱਚ ਰੋਕਦਾ ਹੈ, ਫਿਰ ਹਾਥੀ ਜਾਂ ਰਾਣੀ ਕਿਨਾਰੇ 'ਤੇ ਸ਼ਹਿ ਦਿੰਦੇ ਹਨ।" },
    final: "8/8/4P3/5k2/3P1p2/2P2Pb1/6Pp/5r1K w - - 0 50",
    line: { fen: "8/8/2Q1P3/5k2/2bP1p2/r1P2Pb1/3R2Pp/7K w - - 0 47", moves: "c6c4 a3a1 d2d1 a1d1 c4f1 d1f1".split(" "), source: { kind: "bank", id: "1i3R1" } },
    practice: { rule: "greco" },
  },
  {
    id: "blackburne", group: "bishop",
    name: { en: "Blackburne's mate", pa: "ਬਲੈਕਬਰਨ ਦੀ ਮਾਤ" },
    about: { en: "Two bishops and a knight shut every square.", pa: "ਦੋ ਊਠ ਅਤੇ ਇੱਕ ਘੋੜਾ ਹਰ ਖਾਨਾ ਬੰਦ ਕਰ ਦਿੰਦੇ ਹਨ।" },
    final: "r2q4/p3N2k/1p5p/5B2/3B4/PP6/2P2p1P/2K5 b - - 0 30",
    line: { fen: "r2q2k1/p4p1R/1p5p/5N2/3B4/PP1B4/2P2p1P/2K4b b - - 0 27", moves: "g8h7 f5e7 h1e4 d3e4 f7f5 e4f5".split(" "), source: { kind: "bank", id: "0E9IT" } },
    practice: { rule: "blackburne" },
  },
  {
    id: "reti", group: "bishop",
    name: { en: "Réti's mate", pa: "ਰੇਤੀ ਦੀ ਮਾਤ" },
    about: { en: "A bishop checks a king boxed in by four of its own pieces.", pa: "ਊਠ ਉਸ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ ਜੋ ਆਪਣੇ ਚਾਰ ਮੋਹਰਿਆਂ ਵਿੱਚ ਘਿਰਿਆ ਹੈ।" },
    final: "rnbB1b1r/ppk2ppp/2p5/4q3/4n3/8/PPP2PPP/2KR1BNR b - - 3 11",
    line: { fen: "rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9", moves: "d3d8 e8d8 d2g5 d8c7 g5d8".split(" "), source: { kind: "game", name: { en: "Réti vs Tartakower, Vienna 1910", pa: "ਰੇਤੀ ਬਨਾਮ ਤਾਰਤਾਕੋਵਰ, ਵਿਆਨਾ, ੧੯੧੦" } } },
    practice: { rule: "reti" },
  },
  {
    id: "dovetail", group: "queen",
    name: { en: "Dovetail mate", pa: "ਡਵਟੇਲ ਮਾਤ" },
    about: { en: "A queen checks from a diagonal square, and two of the king's own pieces block the rest.", pa: "ਰਾਣੀ ਤਿਰਛੇ ਖਾਨੇ ਤੋਂ ਸ਼ਹਿ ਦਿੰਦੀ ਹੈ, ਅਤੇ ਬਾਦਸ਼ਾਹ ਦੇ ਦੋ ਆਪਣੇ ਮੋਹਰੇ ਬਾਕੀ ਰਾਹ ਬੰਦ ਕਰਦੇ ਹਨ।" },
    also: { en: "Cozio's mate", pa: "ਕੋਜ਼ੀਓ ਦੀ ਮਾਤ" },
    final: "8/5p2/6p1/7p/5P2/4Q1PP/2pk1PK1/3q4 b - - 10 51",
    line: { fen: "8/5p2/6p1/7p/1Q3P2/6PP/2pk1PK1/3q4 b - - 6 49", moves: "d2e2 b4e4 e2d2 e4e3".split(" "), source: { kind: "bank", id: "0GhM8" } },
    practice: { theme: "dovetailMate" },
  },
  {
    id: "swallowtail", group: "queen",
    name: { en: "Swallow's tail mate", pa: "ਸਵੈਲੋਜ਼ ਟੇਲ ਮਾਤ" },
    about: { en: "A guarded queen checks and the king's own pieces block both sides.", pa: "ਰਾਖੀ ਵਾਲੀ ਰਾਣੀ ਸ਼ਹਿ ਦਿੰਦੀ ਹੈ ਅਤੇ ਬਾਦਸ਼ਾਹ ਦੇ ਆਪਣੇ ਮੋਹਰੇ ਦੋਵੇਂ ਪਾਸੇ ਰਾਹ ਰੋਕਦੇ ਹਨ।" },
    also: { en: "guéridon mate", pa: "ਗੇਰੀਡੋਂ ਮਾਤ" },
    final: "8/8/4p3/3q1p2/4k3/4Q3/5P2/5K2 b - - 19 55",
    line: { fen: "8/6Q1/4p3/3q1pk1/8/8/5P2/5K2 b - - 15 53", moves: "g5f4 g7g3 f4e4 g3e3".split(" "), source: { kind: "bank", id: "0bdUj" } },
    practice: { theme: "swallowstailMate" },
  },
  {
    id: "triangle", group: "queen",
    name: { en: "Triangle mate", pa: "ਤਿਕੋਣ ਮਾਤ" },
    about: { en: "Queen, rook and king make a triangle.", pa: "ਰਾਣੀ, ਹਾਥੀ ਅਤੇ ਬਾਦਸ਼ਾਹ ਮਿਲ ਕੇ ਤਿਕੋਣ ਬਣਾਉਂਦੇ ਹਨ।" },
    final: "4R3/1q3kp1/4Q1p1/p5P1/5P2/1P6/7K/3r4 b - - 7 43",
    line: { fen: "3r4/1q4pk/6p1/p3R1P1/5P2/1P2Q3/7K/8 b - - 1 40", moves: "d8d1 e3h3 h7g8 e5e8 g8f7 h3e6".split(" "), source: { kind: "bank", id: "0OsM4" } },
    practice: { theme: "triangleMate" },
  },
  {
    id: "damiano", group: "queen",
    name: { en: "Damiano's mate", pa: "ਦਾਮੀਆਨੋ ਦੀ ਮਾਤ" },
    about: { en: "A queen beside the king, guarded by a pawn.", pa: "ਰਾਣੀ ਬਾਦਸ਼ਾਹ ਦੇ ਕੋਲ ਹੈ ਅਤੇ ਪਿਆਦਾ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" },
    final: "8/6k1/8/3B4/2p5/2P2Rp1/1P4Pq/5RK1 w - - 3 45",
    line: { fen: "8/5Bk1/8/3bq3/2p5/2P2Rp1/1P4P1/5R1K w - - 1 43", moves: "f7d5 e5h5 h1g1 h5h2".split(" "), source: { kind: "bank", id: "02HLs" } },
    practice: { rule: "damiano" },
  },
  {
    id: "lolli", group: "queen",
    name: { en: "Lolli's mate", pa: "ਲੋੱਲੀ ਦੀ ਮਾਤ" },
    about: { en: "A queen and a pawn break in where the bishop used to guard the king.", pa: "ਰਾਣੀ ਅਤੇ ਪਿਆਦਾ ਉਸ ਥਾਂ ਵੜਦੇ ਹਨ ਜਿੱਥੇ ਪਹਿਲਾਂ ਊਠ ਬਾਦਸ਼ਾਹ ਦੀ ਰਾਖੀ ਕਰਦਾ ਸੀ।" },
    final: "2r3k1/pp3pQ1/5Pp1/3p1q2/3P4/6P1/P5KP/8 b - - 3 38",
    line: { fen: "4r1k1/pp3p2/5PpR/3p1q2/3P4/6P1/P2Q2KP/8 b - - 2 35", moves: "e8c8 h6h8 g8h8 d2h6 h8g8 h6g7".split(" "), source: { kind: "bank", id: "0815n" } },
    practice: { rule: "lolli" },
  },
  {
    id: "maxlange", group: "queen",
    name: { en: "Max Lange's mate", pa: "ਮੈਕਸ ਲਾਂਗੇ ਦੀ ਮਾਤ" },
    about: { en: "A queen checks; a bishop guards her and covers a square.", pa: "ਰਾਣੀ ਸ਼ਹਿ ਦਿੰਦੀ ਹੈ; ਊਠ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ ਅਤੇ ਇੱਕ ਖਾਨਾ ਵੀ ਰੋਕਦਾ ਹੈ।" },
    final: "6Q1/p4Bpk/1p5p/1P2p3/P3nq2/7P/6P1/6K1 b - - 2 48",
    line: { fen: "5r1k/p3QBp1/1p5p/1P2p3/P3n3/6qP/6P1/6K1 b - - 5 46", moves: "g3f4 e7f8 h8h7 f8g8".split(" "), source: { kind: "bank", id: "0cRQr" } },
    practice: { rule: "maxlange" },
  },
  {
    id: "balestra", group: "queen",
    name: { en: "Balestra mate", pa: "ਬਾਲੇਸਤ੍ਰਾ ਮਾਤ" },
    about: { en: "A queen cuts off the king's squares and a bishop gives the check.", pa: "ਰਾਣੀ ਬਾਦਸ਼ਾਹ ਦੇ ਖਾਨੇ ਕੱਟਦੀ ਹੈ ਅਤੇ ਊਠ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ।" },
    final: "B3k2r/p5p1/4pp1p/2Q5/2PP4/Pb2q3/7P/R2K3R w k - 0 24",
    line: { fen: "r3k2r/p2b2p1/2B1pp1p/2Q5/2PP4/P3q3/1P5P/R2K3R w kq - 1 22", moves: "c6a8 d7a4 b2b3 a4b3".split(" "), source: { kind: "bank", id: "0TwGG" } },
    practice: { theme: "balestraMate" },
  },
  {
    id: "fools", group: "traps",
    name: { en: "Fool's mate", pa: "ਮੂਰਖ ਦੀ ਮਾਤ" },
    about: { en: "The fastest mate there is: two moves.", pa: "ਸਭ ਤੋਂ ਤੇਜ਼ ਮਾਤ: ਸਿਰਫ਼ ਦੋ ਚਾਲਾਂ।" },
    final: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    line: { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves: "f2f3 e7e5 g2g4 d8h4".split(" "), source: { kind: "built" }, notes: { 1: { en: "Black opens the long diagonal for the queen.", pa: "ਕਾਲਾ ਰਾਣੀ ਲਈ ਲੰਮੀ ਤਿਰਛੀ ਲਕੀਰ ਖੋਲ੍ਹਦਾ ਹੈ।" } } },
  },
  {
    id: "scholars", group: "traps",
    name: { en: "Scholar's mate", pa: "ਸਕਾਲਰ ਦੀ ਮਾਤ" },
    about: { en: "The famous four-move attack on f7.", pa: "f7 'ਤੇ ਚਾਰ ਚਾਲਾਂ ਦਾ ਮਸ਼ਹੂਰ ਹਮਲਾ।" },
    final: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    line: { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves: "e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7".split(" "), source: { kind: "built" } },
  },
  {
    id: "legal", group: "traps",
    name: { en: "Légal's mate", pa: "ਲੇਗਾਲ ਦੀ ਮਾਤ" },
    about: { en: "Give up the queen: two knights and a bishop finish the king.", pa: "ਰਾਣੀ ਦੇ ਦਿਓ: ਦੋ ਘੋੜੇ ਅਤੇ ਇੱਕ ਊਠ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿੰਦੇ ਹਨ।" },
    final: "rn1q1bnr/ppp1kB1p/3p2p1/3NN3/4P3/8/PPPP1PPP/R1BbK2R b KQ - 2 7",
    line: { fen: "rn1qkbnr/ppp2ppp/3p4/4p3/2B1P1b1/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4", moves: "b1c3 g7g6 f3e5 g4d1 c4f7 e8e7 c3d5".split(" "), source: { kind: "game", name: { en: "Légal vs Saint-Brie, Paris 1750", pa: "ਲੇਗਾਲ ਬਨਾਮ ਸੇਂਟ-ਬ੍ਰੀ, ਪੈਰਿਸ, ੧੭੫੦" } }, notes: { 2: { en: "The knight takes the pawn on e5 and leaves the queen to be taken. It is a trap!", pa: "ਘੋੜਾ e5 'ਤੇ ਪਿਆਦਾ ਮਾਰਦਾ ਹੈ ਅਤੇ ਰਾਣੀ ਨੂੰ ਮਾਰੇ ਜਾਣ ਲਈ ਛੱਡ ਦਿੰਦਾ ਹੈ। ਇਹ ਜਾਲ ਹੈ!" } } },
    practice: { rule: "legal" },
  },
  {
    id: "queenmate", group: "basic",
    name: { en: "King and queen mate", pa: "ਰਾਣੀ ਨਾਲ ਮਾਤ" },
    about: { en: "The queen mates with the help of her king.", pa: "ਰਾਣੀ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਦੀ ਮਦਦ ਨਾਲ ਮਾਤ ਦਿੰਦੀ ਹੈ।" },
    final: "8/8/5K1k/8/8/8/7Q/8 b - - 5 3",
    line: { fen: "8/2Q1K3/7k/8/8/8/8/8 w - - 0 1", moves: "c7g3 h6h5 e7f6 h5h6 g3h2".split(" "), source: { kind: "built" } },
    link: { kind: "lesson", to: "3.3" },
  },
  {
    id: "rookmate", group: "basic",
    name: { en: "King and rook mate", pa: "ਹਾਥੀ ਨਾਲ ਮਾਤ" },
    about: { en: "The rook mates on the edge, with its king close.", pa: "ਹਾਥੀ ਕਿਨਾਰੇ 'ਤੇ ਮਾਤ ਦਿੰਦਾ ਹੈ, ਉਸ ਦਾ ਬਾਦਸ਼ਾਹ ਕੋਲ ਹੈ।" },
    final: "8/8/8/8/8/4K3/8/4k1R1 b - - 5 3",
    line: { fen: "8/8/8/8/4K2R/8/8/4k3 w - - 0 1", moves: "e4e3 e1f1 h4g4 f1e1 g4g1".split(" "), source: { kind: "built" } },
    link: { kind: "lesson", to: "3.4" },
  },
  {
    id: "ladder", group: "basic",
    name: { en: "Ladder mate", pa: "ਪੌੜੀ ਮਾਤ" },
    about: { en: "Two rooks climb the board like a ladder.", pa: "ਦੋ ਹਾਥੀ ਪੌੜੀ ਵਾਂਗ ਬਿਸਾਤ 'ਤੇ ਚੜ੍ਹਦੇ ਹਨ।" },
    also: { en: "lawnmower mate", pa: "ਲਾਅਨਮੋਅਰ ਮਾਤ" },
    final: "6R1/8/7R/4K3/8/8/7k/8 b - - 5 3",
    line: { fen: "7R/8/7R/4K3/8/8/8/6k1 w - - 0 1", moves: "h6f6 g1g2 h8g8 g2h2 f6h6".split(" "), source: { kind: "built" } },
    link: { kind: "lesson", to: "3.2" },
  },
  {
    id: "twobishops", group: "basic",
    name: { en: "King and two bishops mate", pa: "ਦੋ ਊਠਾਂ ਨਾਲ ਮਾਤ" },
    about: { en: "Two bishops and the king drive the king into a corner.", pa: "ਦੋ ਊਠ ਅਤੇ ਬਾਦਸ਼ਾਹ ਮਿਲ ਕੇ ਵਿਰੋਧੀ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੋਨੇ ਵਿੱਚ ਧੱਕਦੇ ਹਨ।" },
    final: "8/8/8/3B4/8/4B2K/8/7k b - - 5 3",
    line: { fen: "8/8/4B3/6B1/8/7K/8/7k w - - 0 1", moves: "e6c4 h1g1 g5e3 g1h1 c4d5".split(" "), source: { kind: "built" } },
  },
  {
    id: "bishopknight", group: "basic",
    name: { en: "Bishop and knight mate", pa: "ਊਠ ਅਤੇ ਘੋੜੇ ਦੀ ਮਾਤ" },
    about: { en: "The hardest basic mate: bishop, knight and king.", pa: "ਸਭ ਤੋਂ ਔਖੀ ਮੁੱਢਲੀ ਮਾਤ: ਊਠ, ਘੋੜਾ ਅਤੇ ਬਾਦਸ਼ਾਹ।" },
    final: "7k/6B1/5NK1/8/8/8/8/8 b - - 5 3",
    line: { fen: "7k/5K1N/7B/8/8/8/8/8 w - - 0 1", moves: "f7g6 h8g8 h7f6 g8h8 h6g7".split(" "), source: { kind: "built" } },
    link: { kind: "ladder", to: "bishop-knight" },
  },
];

export const mateById = (id: string) => MATES.find(m => m.id === id);
export const matesIn = (g: MateGroup) => MATES.filter(m => m.group === g);
