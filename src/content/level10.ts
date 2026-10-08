// Level 10 · 1800+ · Repertoire & calculation. Ids/titles follow CURRICULUM.md. ALL TEXT DRAFT (#25, #33).
// Every "line" is legal and carries the Lichess opening database's own name for its exact move order (guarded);
// diagrams were generated from moves with chess.js, and the IQP pick answer is computed by structure.ts.
import type { Lesson, Text } from "../lesson/types";

const real = (en: string, pa: string): Text => ({ en: `Real games: ${en}`, pa: `ਅਸਲੀ ਖੇਡਾਂ: ${pa}` });
// 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 Nf6 7.Bg2 Be7 8.O-O O-O 9.dxc5 Bxc5: Black's isolated d-pawn
const IQP = "r1bq1rk1/pp3ppp/2n2n2/2bp4/8/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 10";
// QGD Exchange, ...10.b4: the Carlsbad structure and the minority attack
const CARLSBAD = "r1bqr1k1/pp1nbppp/2p2n2/3p4/1P1P4/2NBPN2/P4PPP/1RBQ1RK1 b - - 0 10";

export const LEVEL10: Lesson[] = [
  {
    id: "10.1", level: 10, status: "draft",
    title: { en: "Building a repertoire", pa: "ਆਪਣੀ ਸ਼ੁਰੂਆਤ ਚੁਣਨੀ" },
    goal: { en: "Pick one opening for White, and one answer each to 1.e4 and 1.d4.", pa: "ਚਿੱਟੇ ਲਈ ਇੱਕ ਸ਼ੁਰੂਆਤ ਚੁਣੋ, ਅਤੇ 1.e4 ਤੇ 1.d4 ਦਾ ਇੱਕ-ਇੱਕ ਜਵਾਬ।" },
    learn: [
      { text: { en: "A repertoire is your own set of openings. Three are enough: one for White, one against 1.e4, one against 1.d4.", pa: "ਤੁਹਾਡੀਆਂ ਆਪਣੀਆਂ ਸ਼ੁਰੂਆਤਾਂ ਦਾ ਸੈੱਟ। ਤਿੰਨ ਕਾਫ਼ੀ ਹਨ: ਇੱਕ ਚਿੱਟੇ ਲਈ, ਇੱਕ 1.e4 ਵਿਰੁੱਧ, ਇੱਕ 1.d4 ਵਿਰੁੱਧ।" },
        board: { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", arrows: [["e2","e4"],["d2","d4"]] } },
      { text: { en: "Learn the ideas and the pawn structure, not just the moves. When your opponent leaves the book, the ideas still work.", pa: "ਸਿਰਫ਼ ਚਾਲਾਂ ਨਹੀਂ, ਵਿਚਾਰ ਅਤੇ ਪਿਆਦਿਆਂ ਦੀ ਬਣਤਰ ਸਿੱਖੋ। ਜਦੋਂ ਵਿਰੋਧੀ ਕਿਤਾਬ ਤੋਂ ਹਟ ਜਾਵੇ, ਵਿਚਾਰ ਫਿਰ ਵੀ ਕੰਮ ਕਰਦੇ ਹਨ।" },
        board: { fen: "4k3/ppp2ppp/3p4/4p3/4P3/2PP4/PP3PPP/4K3 w - - 0 1" } },
    ],
    try: { kind: "choose", prompt: { en: "Which is the better way to learn an opening?", pa: "ਸ਼ੁਰੂਆਤ ਸਿੱਖਣ ਦਾ ਵਧੀਆ ਤਰੀਕਾ ਕਿਹੜਾ ਹੈ?" },
      options: [
        { text: { en: "Understand its plans and pawn structure", pa: "ਉਸ ਦੀਆਂ ਯੋਜਨਾਵਾਂ ਅਤੇ ਪਿਆਦਿਆਂ ਦੀ ਬਣਤਰ ਸਮਝੋ" }, correct: true, why: { en: "Yes: plans keep working after the moves you memorised run out.", pa: "ਹਾਂ: ਯਾਦ ਕੀਤੀਆਂ ਚਾਲਾਂ ਮੁੱਕਣ ਤੋਂ ਬਾਅਦ ਵੀ ਯੋਜਨਾਵਾਂ ਕੰਮ ਕਰਦੀਆਂ ਹਨ।" } },
        { text: { en: "Memorise 20 moves of every line", pa: "ਹਰ ਲਾਈਨ ਦੀਆਂ ੨੦ ਚਾਲਾਂ ਯਾਦ ਕਰੋ" }, why: { en: "Opponents leave the book early. Without the ideas you're lost.", pa: "ਵਿਰੋਧੀ ਛੇਤੀ ਕਿਤਾਬ ਛੱਡ ਦਿੰਦੇ ਹਨ। ਵਿਚਾਰਾਂ ਤੋਂ ਬਿਨਾਂ ਤੁਸੀਂ ਗੁਆਚ ਜਾਂਦੇ ਹੋ।" } },
      ] },
    practise: [
      { kind: "line", side: "w", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], opening: "Italian Game: Giuoco Piano",
        prompt: { en: "With White: the Italian, from Level 6.", pa: "ਚਿੱਟੇ ਨਾਲ: ਇਤਾਲਵੀ, ਲੈਵਲ ੬ ਵਾਲੀ।" } },
      { kind: "line", side: "b", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3", "Nbd7"], opening: "Queen's Gambit Declined",
        prompt: { en: "Against 1.d4: the Queen's Gambit Declined. Play Black.", pa: "1.d4 ਵਿਰੁੱਧ: ਰਾਣੀ ਦਾ ਗੈਂਬਿਟ ਨਾ-ਮਨਜ਼ੂਰ। ਕਾਲੇ ਨਾਲ ਖੇਡੋ।" } },
    ],
    challenge: { kind: "line", side: "b", moves: ["e4", "c5", "Nf3", "e6", "d4", "cxd4", "Nxd4", "Nc6"], opening: "Sicilian Defense: Taimanov Variation",
      prompt: { en: "Against 1.e4: a Sicilian. Play Black.", pa: "1.e4 ਵਿਰੁੱਧ: ਸਿਸਿਲੀਅਨ। ਕਾਲੇ ਨਾਲ ਖੇਡੋ।" } },
  },
  {
    id: "10.2", level: 10, status: "draft",
    title: { en: "Sicilian ideas", pa: "ਸਿਸਿਲੀਅਨ" },
    goal: { en: "Understand why Black plays ...c5 and swaps it for White's d-pawn.", pa: "ਸਮਝੋ ਕਿ ਕਾਲਾ ...c5 ਕਿਉਂ ਖੇਡਦਾ ਹੈ ਅਤੇ ਉਸ ਨੂੰ ਚਿੱਟੇ ਦੇ d ਪਿਆਦੇ ਨਾਲ ਕਿਉਂ ਵਟਾਉਂਦਾ ਹੈ।" },
    learn: [
      { text: { en: "After ...cxd4, Black has given a side pawn for a centre pawn. Black keeps two centre pawns (d and e) against White's one.", pa: "...cxd4 ਤੋਂ ਬਾਅਦ ਕਾਲੇ ਨੇ ਪਾਸੇ ਦਾ ਪਿਆਦਾ ਦੇ ਕੇ ਵਿਚਕਾਰਲਾ ਪਿਆਦਾ ਲਿਆ ਹੈ। ਕਾਲੇ ਕੋਲ ਵਿਚਕਾਰ ਦੋ ਪਿਆਦੇ (d ਅਤੇ e) ਰਹਿੰਦੇ ਹਨ, ਚਿੱਟੇ ਕੋਲ ਇੱਕ।" },
        board: { fen: "rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4", highlights: ["d6","e7","e4"] } },
      { text: { en: "Black gets the half-open c-file for a rook; White gets space and quick development. The fight is sharp on both sides.", pa: "ਕਾਲੇ ਨੂੰ ਹਾਥੀ ਲਈ ਅੱਧੀ ਖੁੱਲ੍ਹੀ c ਖੜ੍ਹੀ ਕਤਾਰ ਮਿਲਦੀ ਹੈ; ਚਿੱਟੇ ਨੂੰ ਥਾਂ ਅਤੇ ਛੇਤੀ ਮੋਹਰੇ ਕੱਢਣ ਦਾ ਮੌਕਾ। ਦੋਵੇਂ ਪਾਸੇ ਤਿੱਖੀ ਲੜਾਈ ਹੁੰਦੀ ਹੈ।" },
        board: { fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6", highlights: ["c7","c6","c5","c4"] } },
    ],
    try: { kind: "line", side: "b", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"], opening: "Sicilian Defense: Najdorf Variation",
      prompt: { en: "The Najdorf. Play Black.", pa: "ਨਾਈਦੋਰਫ਼। ਕਾਲੇ ਨਾਲ ਖੇਡੋ।" } },
    practise: [
      { kind: "choose", prompt: { en: "In the Open Sicilian, which file is Black's rook happiest on?", pa: "ਖੁੱਲ੍ਹੇ ਸਿਸਿਲੀਅਨ ਵਿੱਚ ਕਾਲੇ ਦਾ ਹਾਥੀ ਕਿਹੜੀ ਖੜ੍ਹੀ ਕਤਾਰ 'ਤੇ ਸਭ ਤੋਂ ਖ਼ੁਸ਼ ਹੈ?" },
        options: [
          { text: { en: "The c-file", pa: "c ਖੜ੍ਹੀ ਕਤਾਰ" }, correct: true, why: { en: "Yes: Black's c-pawn is gone, so the c-file is half-open for Black.", pa: "ਹਾਂ: ਕਾਲੇ ਦਾ c ਪਿਆਦਾ ਜਾ ਚੁੱਕਾ ਹੈ, ਇਸ ਲਈ c ਕਤਾਰ ਕਾਲੇ ਲਈ ਅੱਧੀ ਖੁੱਲ੍ਹੀ ਹੈ।" } },
          { text: { en: "The d-file", pa: "d ਖੜ੍ਹੀ ਕਤਾਰ" }, why: { en: "Black's own d-pawn blocks it. The d-file is half-open for White.", pa: "ਕਾਲੇ ਦਾ ਆਪਣਾ d ਪਿਆਦਾ ਉਸ ਨੂੰ ਰੋਕਦਾ ਹੈ। d ਕਤਾਰ ਚਿੱਟੇ ਲਈ ਅੱਧੀ ਖੁੱਲ੍ਹੀ ਹੈ।" } },
        ] },
      { kind: "line", side: "b", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"], opening: "Sicilian Defense: Dragon Variation",
        prompt: { en: "The Dragon: the bishop goes to g7. Play Black.", pa: "ਡ੍ਰੈਗਨ: ਊਠ g7 'ਤੇ ਜਾਂਦਾ ਹੈ। ਕਾਲੇ ਨਾਲ ਖੇਡੋ।" } },
    ],
    challenge: { kind: "line", side: "w", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e5"], opening: "Sicilian Defense: Najdorf Variation, English Attack",
      prompt: { en: "Now from White's side: the English Attack against the Najdorf.", pa: "ਹੁਣ ਚਿੱਟੇ ਵੱਲੋਂ: ਨਾਈਦੋਰਫ਼ ਵਿਰੁੱਧ ਇੰਗਲਿਸ਼ ਹਮਲਾ।" } },
  },
  {
    id: "10.3", level: 10, status: "draft",
    title: { en: "Queen's Gambit ideas", pa: "ਰਾਣੀ ਦਾ ਗੈਂਬਿਟ" },
    goal: { en: "The minority attack, and playing with or against an isolated pawn.", pa: "ਘੱਟ-ਗਿਣਤੀ ਹਮਲਾ, ਅਤੇ ਇਕੱਲੇ ਪਿਆਦੇ ਨਾਲ ਜਾਂ ਉਸ ਦੇ ਵਿਰੁੱਧ ਖੇਡਣਾ।" },
    learn: [
      { text: { en: "In the Exchange Variation White pushes two queenside pawns (b4-b5) against Black's three. It sounds wrong, but it leaves Black with a weak pawn on c6 or d5. That is the minority attack.", pa: "ਬਦਲੀ ਵਾਲੇ ਰੂਪ ਵਿੱਚ ਚਿੱਟਾ ਰਾਣੀ ਵਾਲੇ ਪਾਸੇ ਆਪਣੇ ਦੋ ਪਿਆਦੇ (b4-b5) ਕਾਲੇ ਦੇ ਤਿੰਨਾਂ ਵਿਰੁੱਧ ਧੱਕਦਾ ਹੈ। ਸੁਣਨ ਨੂੰ ਗ਼ਲਤ ਲੱਗਦਾ ਹੈ, ਪਰ ਇਸ ਨਾਲ ਕਾਲੇ ਦਾ c6 ਜਾਂ d5 ਵਾਲਾ ਪਿਆਦਾ ਕਮਜ਼ੋਰ ਰਹਿ ਜਾਂਦਾ ਹੈ। ਇਹੀ ਘੱਟ-ਗਿਣਤੀ ਹਮਲਾ ਹੈ।" },
        board: { play: true, fen: CARLSBAD, arrows: [["b4", "b5"]], highlights: ["c6", "d5"] } },
      { text: { en: "An isolated d-pawn gives its owner open lines and active pieces, but in the endgame it becomes a target. With it: attack. Against it: trade pieces and blockade it.", pa: "ਇਕੱਲਾ d ਪਿਆਦਾ ਆਪਣੇ ਮਾਲਕ ਨੂੰ ਖੁੱਲ੍ਹੀਆਂ ਲਕੀਰਾਂ ਅਤੇ ਸਰਗਰਮ ਮੋਹਰੇ ਦਿੰਦਾ ਹੈ, ਪਰ ਅੰਤਲੀ ਖੇਡ ਵਿੱਚ ਨਿਸ਼ਾਨਾ ਬਣ ਜਾਂਦਾ ਹੈ। ਉਸ ਦੇ ਨਾਲ: ਹਮਲਾ ਕਰੋ। ਉਸ ਦੇ ਵਿਰੁੱਧ: ਮੋਹਰੇ ਵਟਾਓ ਅਤੇ ਉਸ ਦਾ ਰਾਹ ਰੋਕੋ।" },
        board: { fen: "r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 2 9", highlights: ["d4","d5"] } },
    ],
    try: { kind: "line", side: "w", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "e3", "Be7", "cxd5", "exd5", "Bd3", "O-O", "Nf3", "c6"], opening: "Queen's Gambit Declined: Exchange Variation",
      prompt: { en: "The Exchange Variation with White: reach the minority-attack structure.", pa: "ਚਿੱਟੇ ਨਾਲ ਬਦਲੀ ਵਾਲਾ ਰੂਪ: ਘੱਟ-ਗਿਣਤੀ ਹਮਲੇ ਵਾਲੀ ਬਣਤਰ ਤੱਕ ਪਹੁੰਚੋ।" } },
    practise: [
      { kind: "line", side: "b", moves: ["d4", "d5", "c4", "e6", "Nc3", "c5", "cxd5", "exd5"], opening: "Queen's Gambit Declined: Tarrasch Defense",
        prompt: { en: "The Tarrasch: Black accepts an isolated pawn for active pieces.", pa: "ਤਾਰਾਸ਼: ਕਾਲਾ ਸਰਗਰਮ ਮੋਹਰਿਆਂ ਲਈ ਇਕੱਲਾ ਪਿਆਦਾ ਮਨਜ਼ੂਰ ਕਰਦਾ ਹੈ।" } },
      { kind: "pick", fen: IQP, feature: "isolated", color: "b",
        prompt: { en: "Ten moves into the Tarrasch. Tap Black's isolated pawn: the target for White's plan.", pa: "ਤਾਰਾਸ਼ ਵਿੱਚ ਦਸ ਚਾਲਾਂ ਬਾਅਦ। ਕਾਲੇ ਦਾ ਇਕੱਲਾ ਪਿਆਦਾ ਛੂਹੋ: ਚਿੱਟੇ ਦੀ ਯੋਜਨਾ ਦਾ ਨਿਸ਼ਾਨਾ।" } },
    ],
    challenge: { kind: "choose", board: { fen: IQP },
      prompt: { en: "You are White, playing against the isolated d5-pawn. What is your plan?", pa: "ਤੁਸੀਂ ਚਿੱਟੇ ਹੋ, ਇਕੱਲੇ d5 ਪਿਆਦੇ ਵਿਰੁੱਧ ਖੇਡ ਰਹੇ ਹੋ। ਤੁਹਾਡੀ ਯੋਜਨਾ ਕੀ ਹੈ?" },
      options: [
        { text: { en: "Trade pieces, put a piece on d4, attack d5", pa: "ਮੋਹਰੇ ਵਟਾਓ, d4 'ਤੇ ਮੋਹਰਾ ਰੱਖੋ, d5 'ਤੇ ਹਮਲਾ ਕਰੋ" }, correct: true, why: { en: "Yes: blockade the square in front of it and win the pawn in the endgame.", pa: "ਹਾਂ: ਉਸ ਦੇ ਅੱਗੇ ਵਾਲਾ ਖਾਨਾ ਰੋਕੋ ਅਤੇ ਅੰਤਲੀ ਖੇਡ ਵਿੱਚ ਪਿਆਦਾ ਜਿੱਤੋ।" } },
        { text: { en: "Keep every piece and attack Black's king", pa: "ਸਾਰੇ ਮੋਹਰੇ ਰੱਖੋ ਅਤੇ ਕਾਲੇ ਦੇ ਬਾਦਸ਼ਾਹ 'ਤੇ ਹਮਲਾ ਕਰੋ" }, why: { en: "That's the plan for the side WITH the isolated pawn, not against it.", pa: "ਇਹ ਇਕੱਲੇ ਪਿਆਦੇ ਵਾਲੇ ਪਾਸੇ ਦੀ ਯੋਜਨਾ ਹੈ, ਉਸ ਦੇ ਵਿਰੁੱਧ ਵਾਲੇ ਦੀ ਨਹੀਂ।" } },
      ] },
  },
  {
    id: "10.4", level: 10, status: "draft",
    title: { en: "Candidate moves", pa: "ਚੋਣਵੀਆਂ ਚਾਲਾਂ" },
    goal: { en: "List your options before you calculate any of them.", pa: "ਕਿਸੇ ਦੀ ਵੀ ਗਿਣਤੀ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀਆਂ ਚੋਣਾਂ ਦੀ ਸੂਚੀ ਬਣਾਓ।" },
    learn: [
      { text: { en: "Before calculating, list two or three candidate moves. Start with checks, captures and threats: the forcing moves.", pa: "ਗਿਣਤੀ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਦੋ-ਤਿੰਨ ਚੋਣਵੀਆਂ ਚਾਲਾਂ ਦੀ ਸੂਚੀ ਬਣਾਓ। ਸ਼ਹਿ, ਮਾਰਨ ਵਾਲੀਆਂ ਚਾਲਾਂ ਅਤੇ ਧਮਕੀਆਂ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ: ਮਜਬੂਰ ਕਰਨ ਵਾਲੀਆਂ ਚਾਲਾਂ।" },
        board: { fen: "r5k1/5ppp/8/3n4/8/1B6/5PPP/4R1K1 w - - 0 1", arrows: [["e1","e8"],["b3","d5"],["h2","h3"]] } },
      { text: { en: "Then look at each one in turn. Don't fall in love with the first move you see: the best move is often the second or third.", pa: "ਫਿਰ ਇੱਕ-ਇੱਕ ਕਰਕੇ ਹਰ ਚਾਲ ਵੇਖੋ। ਪਹਿਲੀ ਦਿਸੀ ਚਾਲ ਨੂੰ ਹੀ ਸਭ ਤੋਂ ਵਧੀਆ ਨਾ ਸਮਝੋ: ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਅਕਸਰ ਦੂਜੀ ਜਾਂ ਤੀਜੀ ਹੁੰਦੀ ਹੈ।" },
        board: { fen: "4r1k1/5pp1/7p/8/8/2q5/1P3PPP/4R1K1 w - - 0 1", arrows: [["b2","c3"],["e1","e8"]] } },
    ],
    try: { kind: "pack", pack: "long", count: 1, prompt: { en: "List your candidates, then play.", pa: "ਚੋਣਵੀਆਂ ਚਾਲਾਂ ਦੀ ਸੂਚੀ ਬਣਾਓ, ਫਿਰ ਖੇਡੋ।" } },
    practise: [ { kind: "pack", pack: "long", count: 3, prompt: real("three-move combinations.", "ਤਿੰਨ ਚਾਲਾਂ ਦੇ ਜੋੜ।") } ],
    challenge: { kind: "pack", pack: "long", count: 4, prompt: real("four long combinations.", "ਚਾਰ ਲੰਮੇ ਜੋੜ।") },
  },
  {
    id: "10.5", level: 10, status: "draft",
    title: { en: "Calculating deeper", pa: "ਡੂੰਘੀ ਗਿਣਤੀ" },
    goal: { en: "See four or five moves ahead, and check your line before you play.", pa: "ਚਾਰ-ਪੰਜ ਚਾਲਾਂ ਅੱਗੇ ਵੇਖੋ, ਅਤੇ ਖੇਡਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੀ ਲਾਈਨ ਜਾਂਚੋ।" },
    learn: [
      { text: { en: "Picture the board after each move in your head. At the end of the line, stop and ask: what is the best reply for them here?", pa: "ਹਰ ਚਾਲ ਤੋਂ ਬਾਅਦ ਬਿਸਾਤ ਨੂੰ ਮਨ ਵਿੱਚ ਵੇਖੋ। ਲਾਈਨ ਦੇ ਅੰਤ 'ਤੇ ਰੁਕੋ ਅਤੇ ਪੁੱਛੋ: ਇੱਥੇ ਉਨ੍ਹਾਂ ਦਾ ਸਭ ਤੋਂ ਵਧੀਆ ਜਵਾਬ ਕੀ ਹੈ?" },
        board: { fen: "3r3k/6pp/7N/8/8/1Q6/5PPP/6K1 w - - 0 1", arrows: [["b3","g8"],["d8","g8"],["h6","f7"]] } },
      { text: { en: "Blunder check: before you touch a piece, look once more for their checks and captures.", pa: "ਗ਼ਲਤੀ ਦੀ ਜਾਂਚ: ਮੋਹਰੇ ਨੂੰ ਹੱਥ ਲਾਉਣ ਤੋਂ ਪਹਿਲਾਂ, ਉਨ੍ਹਾਂ ਦੀਆਂ ਸ਼ਹਿ ਅਤੇ ਮਾਰਨ ਵਾਲੀਆਂ ਚਾਲਾਂ ਇੱਕ ਵਾਰ ਹੋਰ ਵੇਖੋ।" },
        board: { fen: "r5k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1", arrows: [["a8","a1"]], highlights: ["a1"] } },
    ],
    try: { kind: "pack", pack: "very-long", count: 1, prompt: { en: "A long combination. See it all before you start.", pa: "ਲੰਮਾ ਜੋੜ। ਸ਼ੁਰੂ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਸਾਰਾ ਵੇਖੋ।" } },
    practise: [ { kind: "pack", pack: "very-long", count: 3, prompt: real("deep combinations.", "ਡੂੰਘੇ ਜੋੜ।") } ],
    challenge: { kind: "pack", pack: "mate-hard", count: 4, prompt: real("four hard mates.", "ਚਾਰ ਔਖੀਆਂ ਮਾਤਾਂ।") },
  },
  {
    id: "10.6", level: 10, status: "draft",
    title: { en: "Defending bad positions", pa: "ਮਾੜੀ ਹਾਲਤ ਵਿੱਚ ਬਚਾਅ" },
    goal: { en: "When you're worse, make every move hard for your opponent.", pa: "ਜਦੋਂ ਤੁਹਾਡੀ ਹਾਲਤ ਮਾੜੀ ਹੋਵੇ, ਵਿਰੋਧੀ ਲਈ ਹਰ ਚਾਲ ਔਖੀ ਬਣਾਓ।" },
    learn: [
      { text: { en: "Don't give up. Find their threat first, then the move that stops it. Look for counter-chances: a check, a passed pawn, a draw by repetition.", pa: "ਹਾਰ ਨਾ ਮੰਨੋ। ਪਹਿਲਾਂ ਉਨ੍ਹਾਂ ਦੀ ਧਮਕੀ ਲੱਭੋ, ਫਿਰ ਉਸ ਨੂੰ ਰੋਕਣ ਵਾਲੀ ਚਾਲ। ਜਵਾਬੀ ਮੌਕੇ ਲੱਭੋ: ਸ਼ਹਿ, ਆਜ਼ਾਦ ਪਿਆਦਾ, ਦੁਹਰਾਅ ਨਾਲ ਬਰਾਬਰੀ।" },
        board: { fen: "7k/6p1/8/8/8/8/2r5/1K1Q4 w - - 0 1", arrows: [["d1","h5"]] } },
    ],
    try: { kind: "pack", pack: "defend-hard", count: 1, prompt: { en: "Find the only defence.", pa: "ਬਚਾਅ ਦੀ ਇੱਕੋ ਚਾਲ ਲੱਭੋ।" } },
    practise: [ { kind: "pack", pack: "defend-hard", count: 3, prompt: real("hard defence.", "ਔਖਾ ਬਚਾਅ।") } ],
    challenge: { kind: "pack", pack: "defend-hard", count: 4, prompt: real("four saves.", "ਚਾਰ ਬਚਾਅ।") },
  },
  {
    id: "10.7", level: 10, status: "draft",
    title: { en: "Learning from your games", pa: "ਆਪਣੀਆਂ ਖੇਡਾਂ ਤੋਂ ਸਿੱਖਣਾ" },
    goal: { en: "Look back at your own games and find the mistakes you keep making.", pa: "ਆਪਣੀਆਂ ਖੇਡਾਂ ਮੁੜ ਵੇਖੋ ਅਤੇ ਉਹ ਗ਼ਲਤੀਆਂ ਲੱਭੋ ਜੋ ਤੁਸੀਂ ਵਾਰ-ਵਾਰ ਕਰਦੇ ਹੋ।" },
    learn: [
      { text: { en: "After every game, before you use an engine, go through it yourself. Where did you think you were winning? Where did it go wrong?", pa: "ਹਰ ਖੇਡ ਤੋਂ ਬਾਅਦ, ਇੰਜਣ ਵਰਤਣ ਤੋਂ ਪਹਿਲਾਂ, ਆਪ ਉਸ ਨੂੰ ਵੇਖੋ। ਤੁਹਾਨੂੰ ਕਿੱਥੇ ਲੱਗਿਆ ਕਿ ਤੁਸੀਂ ਜਿੱਤ ਰਹੇ ਹੋ? ਗੱਲ ਕਿੱਥੇ ਵਿਗੜੀ?" },
        board: { fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4", highlights: ["f6","f7"] } },
      { text: { en: "Then check with the engine, and write down the kind of mistake: a missed tactic, a hanging piece, time trouble. Your notebook shows you what to practise next.", pa: "ਫਿਰ ਇੰਜਣ ਨਾਲ ਜਾਂਚੋ, ਅਤੇ ਗ਼ਲਤੀ ਦੀ ਕਿਸਮ ਲਿਖੋ: ਖੁੰਝਿਆ ਦਾਅ, ਲਟਕਦਾ ਮੋਹਰਾ, ਸਮੇਂ ਦੀ ਤੰਗੀ। ਤੁਹਾਡੀ ਕਾਪੀ ਦੱਸਦੀ ਹੈ ਕਿ ਅੱਗੇ ਕੀ ਅਭਿਆਸ ਕਰਨਾ ਹੈ।" },
        board: { fen: "4k3/8/8/1b1n4/2N5/8/8/3RK3 w - - 0 1", highlights: ["c4","d5"] } },
    ],
    try: { kind: "choose", prompt: { en: "You just lost a game. What should you do first?", pa: "ਤੁਸੀਂ ਹੁਣੇ ਇੱਕ ਖੇਡ ਹਾਰੇ ਹੋ। ਪਹਿਲਾਂ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?" },
      options: [
        { text: { en: "Go through it myself, then check with the engine", pa: "ਆਪ ਵੇਖੋ, ਫਿਰ ਇੰਜਣ ਨਾਲ ਜਾਂਚੋ" }, correct: true, why: { en: "Yes: your own thinking first, so you learn why, not just what.", pa: "ਹਾਂ: ਪਹਿਲਾਂ ਆਪਣੀ ਸੋਚ, ਤਾਂ ਜੋ ਤੁਸੀਂ ਸਿਰਫ਼ ਕੀ ਨਹੀਂ, ਕਿਉਂ ਵੀ ਸਿੱਖੋ।" } },
        { text: { en: "Start a new game straight away", pa: "ਤੁਰੰਤ ਨਵੀਂ ਖੇਡ ਸ਼ੁਰੂ ਕਰੋ" }, why: { en: "Then the same mistake will come back.", pa: "ਫਿਰ ਉਹੀ ਗ਼ਲਤੀ ਮੁੜ ਆਵੇਗੀ।" } },
      ] },
    practise: [
      { kind: "choose", prompt: { en: "Your notebook shows you lost five games to pieces left undefended. What do you practise?", pa: "ਤੁਹਾਡੀ ਕਾਪੀ ਦੱਸਦੀ ਹੈ ਕਿ ਤੁਸੀਂ ਬਿਨਾਂ ਰਾਖੀ ਵਾਲੇ ਮੋਹਰਿਆਂ ਕਾਰਨ ਪੰਜ ਖੇਡਾਂ ਹਾਰੇ। ਤੁਸੀਂ ਕੀ ਅਭਿਆਸ ਕਰੋਗੇ?" },
        options: [
          { text: { en: "Puzzles on hanging pieces, and a blunder check every move", pa: "ਲਟਕਦੇ ਮੋਹਰਿਆਂ ਵਾਲੀਆਂ ਬੁਝਾਰਤਾਂ, ਅਤੇ ਹਰ ਚਾਲ 'ਤੇ ਗ਼ਲਤੀ ਦੀ ਜਾਂਚ" }, correct: true, why: { en: "Yes: practise the thing that is losing you games.", pa: "ਹਾਂ: ਉਹ ਚੀਜ਼ ਅਭਿਆਸ ਕਰੋ ਜੋ ਤੁਹਾਨੂੰ ਖੇਡਾਂ ਹਰਾ ਰਹੀ ਹੈ।" } },
          { text: { en: "A new opening", pa: "ਨਵੀਂ ਸ਼ੁਰੂਆਤ" }, why: { en: "The opening isn't what lost those games.", pa: "ਉਹ ਖੇਡਾਂ ਸ਼ੁਰੂਆਤ ਕਾਰਨ ਨਹੀਂ ਹਾਰੀਆਂ ਗਈਆਂ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "defend-hard", count: 3, prompt: real("spot their threat first.", "ਪਹਿਲਾਂ ਉਨ੍ਹਾਂ ਦੀ ਧਮਕੀ ਪਛਾਣੋ।") },
  },
  {
    id: "10.8", level: 10, status: "draft",
    title: { en: "Playing a tournament", pa: "ਟੂਰਨਾਮੈਂਟ ਖੇਡਣਾ" },
    goal: { en: "Use your clock, write your moves, and be a good sport.", pa: "ਘੜੀ ਵਰਤੋ, ਆਪਣੀਆਂ ਚਾਲਾਂ ਲਿਖੋ, ਅਤੇ ਚੰਗੇ ਖਿਡਾਰੀ ਬਣੋ।" },
    learn: [
      { text: { en: "Touch-move: if you touch one of your pieces, you must move it. Say \"adjust\" first if you only want to straighten it.", pa: "ਛੂਹੋ-ਤੇ-ਚੱਲੋ: ਜੇ ਤੁਸੀਂ ਆਪਣੇ ਮੋਹਰੇ ਨੂੰ ਛੂਹ ਲਓ, ਤਾਂ ਉਸ ਨੂੰ ਚੱਲਣਾ ਪਵੇਗਾ। ਜੇ ਸਿਰਫ਼ ਸਿੱਧਾ ਕਰਨਾ ਹੈ, ਤਾਂ ਪਹਿਲਾਂ \"ਠੀਕ ਕਰਨਾ\" (adjust) ਕਹੋ।" },
        board: { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", highlights: ["g1"], dots: ["f3","h3","e2"] } },
      { text: { en: "Write each move down, press the clock with the same hand you moved with, and spend more time on the hard moves than the easy ones.", pa: "ਹਰ ਚਾਲ ਲਿਖੋ, ਘੜੀ ਉਸੇ ਹੱਥ ਨਾਲ ਦਬਾਓ ਜਿਸ ਨਾਲ ਚਾਲ ਚੱਲੀ, ਅਤੇ ਸੌਖੀਆਂ ਚਾਲਾਂ ਨਾਲੋਂ ਔਖੀਆਂ 'ਤੇ ਵੱਧ ਸਮਾਂ ਲਾਓ।" },
        board: { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", arrows: [["g1","f3"]], coords: true } },
      { text: { en: "Shake hands before and after. Win or lose, thank your opponent: they helped you learn.", pa: "ਪਹਿਲਾਂ ਅਤੇ ਬਾਅਦ ਵਿੱਚ ਹੱਥ ਮਿਲਾਓ। ਜਿੱਤੋ ਜਾਂ ਹਾਰੋ, ਵਿਰੋਧੀ ਦਾ ਧੰਨਵਾਦ ਕਰੋ: ਉਨ੍ਹਾਂ ਨੇ ਤੁਹਾਨੂੰ ਸਿੱਖਣ ਵਿੱਚ ਮਦਦ ਕੀਤੀ।" },
        board: { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" } },
    ],
    try: { kind: "choose", prompt: { en: "You touch your knight, then see it's a bad move. What happens?", pa: "ਤੁਸੀਂ ਆਪਣੇ ਘੋੜੇ ਨੂੰ ਛੂਹਿਆ, ਫਿਰ ਵੇਖਿਆ ਕਿ ਇਹ ਮਾੜੀ ਚਾਲ ਹੈ। ਹੁਣ ਕੀ?" },
      options: [
        { text: { en: "You must move the knight", pa: "ਤੁਹਾਨੂੰ ਘੋੜਾ ਹੀ ਚੱਲਣਾ ਪਵੇਗਾ" }, correct: true, why: { en: "Yes: touch-move. Think first, then touch.", pa: "ਹਾਂ: ਛੂਹੋ-ਤੇ-ਚੱਲੋ। ਪਹਿਲਾਂ ਸੋਚੋ, ਫਿਰ ਛੂਹੋ।" } },
        { text: { en: "You can move a different piece", pa: "ਤੁਸੀਂ ਕੋਈ ਹੋਰ ਮੋਹਰਾ ਚੱਲ ਸਕਦੇ ਹੋ" }, why: { en: "Not in a tournament: a touched piece must move, if it has a legal move.", pa: "ਟੂਰਨਾਮੈਂਟ ਵਿੱਚ ਨਹੀਂ: ਛੂਹਿਆ ਮੋਹਰਾ ਚੱਲਣਾ ਪੈਂਦਾ ਹੈ, ਜੇ ਉਸ ਕੋਲ ਨਿਯਮਾਂ ਮੁਤਾਬਕ ਚਾਲ ਹੋਵੇ।" } },
      ] },
    practise: [
      { kind: "choose", prompt: { en: "You have 5 minutes left and an easy recapture to make. How long should you think?", pa: "ਤੁਹਾਡੇ ਕੋਲ ੫ ਮਿੰਟ ਬਚੇ ਹਨ ਅਤੇ ਇੱਕ ਸੌਖੀ ਵਾਪਸੀ ਮਾਰ ਕਰਨੀ ਹੈ। ਕਿੰਨਾ ਸੋਚਣਾ ਚਾਹੀਦਾ ਹੈ?" },
        options: [
          { text: { en: "A few seconds: blunder check, then play", pa: "ਕੁਝ ਸਕਿੰਟ: ਗ਼ਲਤੀ ਦੀ ਜਾਂਚ, ਫਿਰ ਖੇਡੋ" }, correct: true, why: { en: "Yes: save your time for the hard moves.", pa: "ਹਾਂ: ਆਪਣਾ ਸਮਾਂ ਔਖੀਆਂ ਚਾਲਾਂ ਲਈ ਬਚਾਓ।" } },
          { text: { en: "Two whole minutes, to be safe", pa: "ਪੂਰੇ ਦੋ ਮਿੰਟ, ਸੁਰੱਖਿਆ ਲਈ" }, why: { en: "Then you'll have no time left when it really matters.", pa: "ਫਿਰ ਜਦੋਂ ਸੱਚਮੁੱਚ ਲੋੜ ਪਵੇਗੀ, ਸਮਾਂ ਨਹੀਂ ਬਚੇਗਾ।" } },
        ] },
      { kind: "choose", prompt: { en: "You won. What do you do?", pa: "ਤੁਸੀਂ ਜਿੱਤ ਗਏ। ਤੁਸੀਂ ਕੀ ਕਰਦੇ ਹੋ?" },
        options: [
          { text: { en: "Shake hands and thank your opponent", pa: "ਹੱਥ ਮਿਲਾਓ ਅਤੇ ਵਿਰੋਧੀ ਦਾ ਧੰਨਵਾਦ ਕਰੋ" }, correct: true, why: { en: "Yes: win with grace, lose with grace.", pa: "ਹਾਂ: ਜਿੱਤ ਵਿੱਚ ਵੀ ਨਿਮਰਤਾ, ਹਾਰ ਵਿੱਚ ਵੀ।" } },
          { text: { en: "Celebrate loudly at the board", pa: "ਬਿਸਾਤ ਕੋਲ ਉੱਚੀ ਜਸ਼ਨ ਮਨਾਓ" }, why: { en: "Other games are still being played, and your opponent deserves respect.", pa: "ਹੋਰ ਖੇਡਾਂ ਅਜੇ ਚੱਲ ਰਹੀਆਂ ਹਨ, ਅਤੇ ਤੁਹਾਡਾ ਵਿਰੋਧੀ ਇੱਜ਼ਤ ਦਾ ਹੱਕਦਾਰ ਹੈ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "long", count: 4, prompt: real("tournament form: four combinations.", "ਟੂਰਨਾਮੈਂਟ ਵਾਂਗ: ਚਾਰ ਜੋੜ।") },
  },
];
