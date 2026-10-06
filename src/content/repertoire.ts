// The openings trainer's repertoire choices (DECISIONS #74): three per slot, each with lines covering the
// opponent's main replies. GENERATED from move lists checked with chess.js; every \`opening\` is the Lichess
// opening database's own name for that exact move order, and the guard re-checks both (test/openings.test.ts).
import type { Text } from "../lesson/types";

export type Slot = "white" | "e4" | "d4";
export interface RepLine { moves: string[]; opening: string }
export interface RepOption { id: string; slot: Slot; side: "w" | "b"; name: Text; about: Text; lines: RepLine[] }

export const SLOTS: { slot: Slot; title: Text }[] = [
  { slot: "white", title: { en: "With White", pa: "ਚਿੱਟੇ ਨਾਲ" } },
  { slot: "e4", title: { en: "Against 1.e4", pa: "1.e4 ਵਿਰੁੱਧ" } },
  { slot: "d4", title: { en: "Against 1.d4", pa: "1.d4 ਵਿਰੁੱਧ" } },
];

export const REPERTOIRE: RepOption[] = [
  { id: "italian", slot: "white", side: "w", name: { en: "Italian Game", pa: "ਇਤਾਲਵੀ ਖੇਡ" },
    about: { en: "1.e4: quick development and early castling, with answers to the Sicilian, French, Caro-Kann and Scandinavian.", pa: "1.e4: ਛੇਤੀ ਮੋਹਰੇ ਕੱਢਣੇ ਅਤੇ ਛੇਤੀ ਕਿਲ੍ਹੇਬੰਦੀ, ਸਿਸਿਲੀਅਨ, ਫ਼ਰੈਂਚ, ਕਾਰੋ-ਕਾਨ ਅਤੇ ਸਕੈਂਡੇਨੇਵੀਅਨ ਦੇ ਜਵਾਬਾਂ ਸਮੇਤ।" }, lines: [
    { moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O".split(" "), opening: "Italian Game: Classical Variation, Giuoco Pianissimo" },
    { moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O".split(" "), opening: "Italian Game: Two Knights Defense, Modern Bishop's Opening" },
    { moves: "e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6".split(" "), opening: "Sicilian Defense: Alapin Variation, Smith-Morra Declined" },
    { moves: "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6".split(" "), opening: "French Defense: Advance Variation, Paulsen Attack" },
    { moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5".split(" "), opening: "Caro-Kann Defense: Advance Variation, Short Variation" },
    { moves: "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6".split(" "), opening: "Scandinavian Defense: Main Line, Mieses Variation" },
  ] },
  { id: "london", slot: "white", side: "w", name: { en: "London System", pa: "ਲੰਡਨ ਪ੍ਰਣਾਲੀ" },
    about: { en: "1.d4 and Bf4: the same calm set-up against almost anything.", pa: "1.d4 ਅਤੇ Bf4: ਲਗਭਗ ਹਰ ਚੀਜ਼ ਵਿਰੁੱਧ ਇੱਕੋ ਸ਼ਾਂਤ ਬਣਤਰ।" }, lines: [
    { moves: "d4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6".split(" "), opening: "Queen's Pawn Game: Accelerated London System" },
    { moves: "d4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3".split(" "), opening: "Indian Defense: Accelerated London System" },
    { moves: "d4 Nf6 Bf4 c5 e3 Qb6 Nc3".split(" "), opening: "Indian Defense: Accelerated London System" },
    { moves: "d4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2".split(" "), opening: "Queen's Pawn Game: Accelerated London System, Steinitz Countergambit" },
  ] },
  { id: "qg", slot: "white", side: "w", name: { en: "Queen's Gambit", pa: "ਰਾਣੀ ਦਾ ਗੈਂਬਿਟ" },
    about: { en: "1.d4 and 2.c4: a classical fight for the centre.", pa: "1.d4 ਅਤੇ 2.c4: ਵਿਚਕਾਰ ਲਈ ਕਲਾਸੀਕਲ ਲੜਾਈ।" }, lines: [
    { moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3".split(" "), opening: "Queen's Gambit Declined" },
    { moves: "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O".split(" "), opening: "Queen's Gambit Accepted: Classical Defense, Normal Line" },
    { moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3".split(" "), opening: "Slav Defense: Czech Variation, Classical System" },
    { moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2".split(" "), opening: "King's Indian Defense: Orthodox Variation" },
    { moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3".split(" "), opening: "Nimzo-Indian Defense: Normal Variation" },
  ] },
  { id: "sicilian", slot: "e4", side: "b", name: { en: "Sicilian (Taimanov)", pa: "ਸਿਸਿਲੀਅਨ (ਤਾਈਮਾਨੋਵ)" },
    about: { en: "Play for a win with Black: an unbalanced, fighting game.", pa: "ਕਾਲੇ ਨਾਲ ਜਿੱਤ ਲਈ ਖੇਡੋ: ਅਸੰਤੁਲਿਤ, ਲੜਾਕੂ ਖੇਡ।" }, lines: [
    { moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7".split(" "), opening: "Sicilian Defense: Taimanov Variation, Bastrikov Variation" },
    { moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6".split(" "), opening: "Sicilian Defense: Alapin Variation, Barmen Defense" },
    { moves: "e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6".split(" "), opening: "Sicilian Defense: Closed" },
    { moves: "e4 c5 Nf3 e6 c3 d5 exd5 exd5 d4 Nc6".split(" "), opening: "Sicilian Defense: Delayed Alapin Variation, with e6" },
  ] },
  { id: "carokann", slot: "e4", side: "b", name: { en: "Caro-Kann", pa: "ਕਾਰੋ-ਕਾਨ" },
    about: { en: "Solid and sound: ...c6, then ...d5.", pa: "ਪੱਕੀ ਅਤੇ ਠੋਸ: ...c6, ਫਿਰ ...d5।" }, lines: [
    { moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6".split(" "), opening: "Caro-Kann Defense" },
    { moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5".split(" "), opening: "Caro-Kann Defense: Advance Variation, Short Variation" },
    { moves: "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6".split(" "), opening: "Caro-Kann Defense: Exchange Variation" },
    { moves: "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6".split(" "), opening: "Caro-Kann Defense: Panov Attack" },
  ] },
  { id: "e5", slot: "e4", side: "b", name: { en: "1...e5", pa: "1...e5" },
    about: { en: "The classical open games: meet the Italian, Ruy Lopez, Scotch and Vienna.", pa: "ਕਲਾਸੀਕਲ ਖੁੱਲ੍ਹੀਆਂ ਖੇਡਾਂ: ਇਤਾਲਵੀ, ਰੂਈ ਲੋਪੇਜ਼, ਸਕਾਚ ਅਤੇ ਵਿਆਨਾ ਦਾ ਸਾਹਮਣਾ ਕਰੋ।" }, lines: [
    { moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6".split(" "), opening: "Italian Game: Classical Variation, Giuoco Pianissimo" },
    { moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7".split(" "), opening: "Ruy Lopez: Closed" },
    { moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6".split(" "), opening: "Scotch Game: Schmidt Variation" },
    { moves: "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4".split(" "), opening: "Vienna Game: Vienna Gambit, Main Line" },
  ] },
  { id: "qgd", slot: "d4", side: "b", name: { en: "Queen's Gambit Declined", pa: "ਰਾਣੀ ਦਾ ਗੈਂਬਿਟ ਨਾ-ਮਨਜ਼ੂਰ" },
    about: { en: "Rock-solid: ...d5 and ...e6.", pa: "ਚਟਾਨ ਵਰਗੀ ਪੱਕੀ: ...d5 ਅਤੇ ...e6।" }, lines: [
    { moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7".split(" "), opening: "Queen's Gambit Declined" },
    { moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7".split(" "), opening: "Queen's Gambit Declined: Normal Defense" },
    { moves: "d4 d5 Bf4 Nf6 e3 e6 Nf3 c5".split(" "), opening: "Queen's Pawn Game: Accelerated London System" },
    { moves: "d4 d5 Nf3 Nf6 c4 e6 Nc3 Be7".split(" "), opening: "Queen's Pawn Game: Symmetrical Variation" },
  ] },
  { id: "slav", slot: "d4", side: "b", name: { en: "Slav", pa: "ਸਲਾਵ" },
    about: { en: "...c6 keeps the light-squared bishop free to come out.", pa: "...c6 ਨਾਲ ਚਿੱਟੇ ਖਾਨਿਆਂ ਵਾਲਾ ਊਠ ਬਾਹਰ ਆਉਣ ਲਈ ਆਜ਼ਾਦ ਰਹਿੰਦਾ ਹੈ।" }, lines: [
    { moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5".split(" "), opening: "Slav Defense: Czech Variation" },
    { moves: "d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6".split(" "), opening: "Slav Defense: Exchange Variation" },
    { moves: "d4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6".split(" "), opening: "Slav Defense: Quiet Variation, Schallopp Defense" },
    { moves: "d4 d5 Bf4 Nf6 e3 c6 Nf3 Bf5".split(" "), opening: "Queen's Pawn Game: Accelerated London System" },
  ] },
  { id: "kid", slot: "d4", side: "b", name: { en: "King's Indian", pa: "ਕਿੰਗਜ਼ ਇੰਡੀਅਨ" },
    about: { en: "Let White take the centre, then strike back with ...e5.", pa: "ਚਿੱਟੇ ਨੂੰ ਵਿਚਕਾਰ ਲੈਣ ਦਿਓ, ਫਿਰ ...e5 ਨਾਲ ਜਵਾਬੀ ਵਾਰ ਕਰੋ।" }, lines: [
    { moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5".split(" "), opening: "King's Indian Defense: Orthodox Variation" },
    { moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O".split(" "), opening: "King's Indian Defense: Sämisch Variation, Normal Defense" },
    { moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6".split(" "), opening: "King's Indian Defense: Fianchetto Variation" },
    { moves: "d4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O".split(" "), opening: "Indian Defense: Accelerated London System" },
  ] },
];
export const repOption = (id: string) => REPERTOIRE.find(o => o.id === id);
