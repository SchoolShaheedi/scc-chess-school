// Level 6 · 1000-1200 · Opening principles + first openings. Ids/titles follow CURRICULUM.md. ALL TEXT DRAFT.
// Every "line" is legal and, where it names its opening, the name is the one the Lichess chess-openings
// database (CC0) gives that exact move sequence; the guard checks both (test/content.test.ts).
import type { Lesson } from "../lesson/types";

const ITALIAN = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3", "d6", "O-O", "O-O"];
const LONDON = ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "c5", "c3", "Nc6", "Nbd2", "Bd6", "Bg3", "O-O", "Bd3"];
const RUY_BLACK = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"];
const QGD_BLACK = ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3"];
const play = (en: string, pa: string) => ({ en, pa });

export const LEVEL6: Lesson[] = [
  {
    id: "6.1", level: 6, status: "draft",
    title: { en: "The three rules", pa: "ਤਿੰਨ ਅਸੂਲ" },
    goal: { en: "Open every game well: centre, develop, castle.", pa: "ਹਰ ਖੇਡ ਚੰਗੀ ਤਰ੍ਹਾਂ ਸ਼ੁਰੂ ਕਰੋ: ਵਿਚਕਾਰ, ਮੋਹਰੇ ਕੱਢੋ, ਕਿਲ੍ਹੇਬੰਦੀ।" },
    learn: [
      { text: { en: "Rule 1: take the centre. Pawns on e4 and d4 (or e5 and d5) give your pieces room and squeeze the other side.", pa: "ਅਸੂਲ ੧: ਵਿਚਕਾਰ ਲਓ। e4 ਅਤੇ d4 (ਜਾਂ e5 ਅਤੇ d5) ਵਾਲੇ ਪਿਆਦੇ ਤੁਹਾਡੇ ਮੋਹਰਿਆਂ ਨੂੰ ਥਾਂ ਦਿੰਦੇ ਹਨ ਅਤੇ ਦੂਜੇ ਪਾਸੇ ਨੂੰ ਦਬਾਉਂਦੇ ਹਨ।" },
        board: { fen: "rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2", highlights: ["d4", "e4", "d5", "e5"] } },
      { text: { en: "Rule 2: develop. Bring knights and bishops out early, each to a good square, before moving the queen.", pa: "ਅਸੂਲ ੨: ਮੋਹਰੇ ਕੱਢੋ। ਘੋੜੇ ਅਤੇ ਊਠ ਜਲਦੀ ਬਾਹਰ ਲਿਆਓ, ਹਰ ਇੱਕ ਨੂੰ ਚੰਗੇ ਖਾਨੇ 'ਤੇ, ਰਾਣੀ ਨੂੰ ਚਲਾਉਣ ਤੋਂ ਪਹਿਲਾਂ।" },
        board: { fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", arrows: [["g1", "f3"], ["f1", "c4"]] } },
      { text: { en: "Rule 3: castle. It tucks your king away and brings a rook towards the middle.", pa: "ਅਸੂਲ ੩: ਕਿਲ੍ਹੇਬੰਦੀ। ਇਹ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰਦੀ ਹੈ ਅਤੇ ਹਾਥੀ ਨੂੰ ਵਿਚਕਾਰ ਵੱਲ ਲਿਆਉਂਦੀ ਹੈ।" },
        board: { fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4", highlights: ["g1", "f1"] } },
    ],
    try: { kind: "choose", board: { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
      prompt: { en: "Your first move as White. Which follows the rules best?", pa: "ਚਿੱਟੇ ਵਜੋਂ ਤੁਹਾਡੀ ਪਹਿਲੀ ਚਾਲ। ਕਿਹੜੀ ਅਸੂਲਾਂ ਮੁਤਾਬਕ ਸਭ ਤੋਂ ਵਧੀਆ ਹੈ?" },
      options: [
        { text: { en: "e4", pa: "e4" }, correct: true, why: { en: "Yes: it takes the centre and opens lines for the queen and a bishop.", pa: "ਹਾਂ: ਇਹ ਵਿਚਕਾਰ ਲੈਂਦੀ ਹੈ ਅਤੇ ਰਾਣੀ ਤੇ ਇੱਕ ਊਠ ਲਈ ਰਾਹ ਖੋਲ੍ਹਦੀ ਹੈ।" } },
        { text: { en: "h4", pa: "h4" }, why: { en: "An edge pawn does nothing for the centre or your pieces.", pa: "ਕੰਢੇ ਦਾ ਪਿਆਦਾ ਨਾ ਵਿਚਕਾਰ ਲਈ ਕੁਝ ਕਰਦਾ ਹੈ, ਨਾ ਮੋਹਰਿਆਂ ਲਈ।" } },
        { text: { en: "Na3", pa: "Na3" }, why: { en: "A knight on the edge is weak. Nf3 or Nc3 point at the centre.", pa: "ਕੰਢੇ ਦਾ ਘੋੜਾ ਕਮਜ਼ੋਰ ਹੈ। Nf3 ਜਾਂ Nc3 ਵਿਚਕਾਰ ਵੱਲ ਤੱਕਦੇ ਹਨ।" } },
      ] },
    practise: [
      { kind: "choose", board: { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2" },
        prompt: { en: "1. e4 e5. What now?", pa: "1. e4 e5। ਹੁਣ ਕੀ?" },
        options: [
          { text: { en: "Nf3", pa: "Nf3" }, correct: true, why: { en: "Develops a knight and attacks the e5 pawn.", pa: "ਘੋੜਾ ਕੱਢਦੀ ਹੈ ਅਤੇ e5 ਵਾਲੇ ਪਿਆਦੇ 'ਤੇ ਹਮਲਾ ਕਰਦੀ ਹੈ।" } },
          { text: { en: "Qh5", pa: "Qh5" }, why: { en: "The queen out this early gets chased by pieces that develop with tempo.", pa: "ਇੰਨੀ ਜਲਦੀ ਬਾਹਰ ਆਈ ਰਾਣੀ ਨੂੰ ਵਿਰੋਧੀ ਦੇ ਨਿਕਲਦੇ ਮੋਹਰੇ ਭਜਾਉਂਦੇ ਹਨ।" } },
          { text: { en: "a3", pa: "a3" }, why: { en: "It wastes a move: no centre, no development.", pa: "ਇਹ ਚਾਲ ਗੁਆਉਂਦੀ ਹੈ: ਨਾ ਵਿਚਕਾਰ, ਨਾ ਮੋਹਰੇ।" } },
        ] },
      { kind: "choose", board: { fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5" },
        prompt: { en: "Knights and bishops are out. What now?", pa: "ਘੋੜੇ ਅਤੇ ਊਠ ਬਾਹਰ ਹਨ। ਹੁਣ ਕੀ?" },
        options: [
          { text: { en: "Castle (O-O)", pa: "ਕਿਲ੍ਹੇਬੰਦੀ (O-O)" }, correct: true, why: { en: "Rule 3: king safe, rook in play.", pa: "ਅਸੂਲ ੩: ਬਾਦਸ਼ਾਹ ਸੁਰੱਖਿਅਤ, ਹਾਥੀ ਖੇਡ ਵਿੱਚ।" } },
          { text: { en: "Bxf7+", pa: "Bxf7+" }, why: { en: "After Kxf7 you have given a bishop for a pawn.", pa: "Kxf7 ਤੋਂ ਬਾਅਦ ਤੁਸੀਂ ਪਿਆਦੇ ਬਦਲੇ ਊਠ ਦੇ ਦਿੱਤਾ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "opening-easy", count: 3, prompt: play("Real games: punish opening mistakes.", "ਅਸਲੀ ਖੇਡਾਂ: ਸ਼ੁਰੂਆਤੀ ਗ਼ਲਤੀਆਂ ਦੀ ਸਜ਼ਾ ਦਿਓ।") },
  },

  {
    id: "6.2", level: 6, status: "draft",
    title: { en: "Don't move twice", pa: "ਇੱਕ ਮੋਹਰਾ, ਇੱਕ ਵਾਰ" },
    goal: { en: "Develop every piece once before moving any piece twice.", pa: "ਕਿਸੇ ਮੋਹਰੇ ਨੂੰ ਦੂਜੀ ਵਾਰ ਚਲਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਹਰ ਮੋਹਰੇ ਨੂੰ ਇੱਕ ਵਾਰ ਕੱਢੋ।" },
    learn: [
      { text: { en: "Each move in the opening is precious. Moving the same piece twice lets your opponent bring out an extra piece.", pa: "ਸ਼ੁਰੂਆਤ ਵਿੱਚ ਹਰ ਚਾਲ ਕੀਮਤੀ ਹੈ। ਇੱਕੋ ਮੋਹਰੇ ਨੂੰ ਦੋ ਵਾਰ ਚਲਾਉਣ ਨਾਲ ਵਿਰੋਧੀ ਇੱਕ ਵਾਧੂ ਮੋਹਰਾ ਕੱਢ ਲੈਂਦਾ ਹੈ।" },
        board: { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", arrows: [["f3","g5"]], crosses: ["g5"], highlights: ["b1","c1","f1"] } },
      { text: { en: "An early queen is the classic mistake: every new piece the other side develops can attack her, and she has to keep moving.", pa: "ਜਲਦੀ ਬਾਹਰ ਆਈ ਰਾਣੀ ਆਮ ਗ਼ਲਤੀ ਹੈ: ਦੂਜੇ ਪਾਸੇ ਦਾ ਹਰ ਨਵਾਂ ਮੋਹਰਾ ਉਸ 'ਤੇ ਹਮਲਾ ਕਰ ਸਕਦਾ ਹੈ, ਅਤੇ ਉਸ ਨੂੰ ਵਾਰ-ਵਾਰ ਹਿੱਲਣਾ ਪੈਂਦਾ ਹੈ।" },
        board: { play: true, fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3", arrows: [["g1", "f3"]] } },
    ],
    try: { kind: "pack", pack: "opening-easy", count: 1, prompt: play("Punish the opening mistake.", "ਸ਼ੁਰੂਆਤੀ ਗ਼ਲਤੀ ਦੀ ਸਜ਼ਾ ਦਿਓ।") },
    practise: [ { kind: "pack", pack: "opening-easy", count: 4, prompt: play("Real games from the opening.", "ਸ਼ੁਰੂਆਤ ਵਾਲੀਆਂ ਅਸਲੀ ਖੇਡਾਂ।") } ],
    challenge: { kind: "pack", pack: "opening-easy", count: 4, prompt: play("Four real openings.", "ਚਾਰ ਅਸਲੀ ਸ਼ੁਰੂਆਤਾਂ।") },
  },

  {
    id: "6.3", level: 6, status: "draft",
    title: { en: "Opening traps", pa: "ਸ਼ੁਰੂਆਤੀ ਫੰਦੇ" },
    goal: { en: "Stop the quick mates, and spring a trap of your own.", pa: "ਜਲਦੀ ਵਾਲੀਆਂ ਮਾਤਾਂ ਰੋਕੋ, ਅਤੇ ਆਪਣਾ ਫੰਦਾ ਲਾਓ।" },
    learn: [
      { text: { en: "Scholar's mate: queen and bishop both aim at f7, the weakest square, guarded only by the king.", pa: "ਸਕਾਲਰ ਮਾਤ: ਰਾਣੀ ਅਤੇ ਊਠ ਦੋਵੇਂ f7 ਵੱਲ ਨਿਸ਼ਾਨਾ ਲਾਉਂਦੇ ਹਨ, ਸਭ ਤੋਂ ਕਮਜ਼ੋਰ ਖਾਨਾ, ਜਿਸ ਦੀ ਰਾਖੀ ਸਿਰਫ਼ ਬਾਦਸ਼ਾਹ ਕਰਦਾ ਹੈ।" },
        board: { fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", arrows: [["h5", "f7"], ["c4", "f7"]] } },
      { text: { en: "Block the queen with ...g6, then chase her with your knight. You gain moves while she runs.", pa: "...g6 ਨਾਲ ਰਾਣੀ ਨੂੰ ਰੋਕੋ, ਫਿਰ ਘੋੜੇ ਨਾਲ ਉਸ ਨੂੰ ਭਜਾਓ। ਜਦੋਂ ਉਹ ਭੱਜਦੀ ਹੈ, ਤੁਸੀਂ ਚਾਲਾਂ ਕਮਾਉਂਦੇ ਹੋ।" },
        board: { fen: "r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4", arrows: [["g8","f6"]], highlights: ["g6"] } },
      { text: { en: "Légal's trap: White gives up the queen, and three pieces mate. Greed is punished.", pa: "ਲੇਗਾਲ ਦਾ ਫੰਦਾ: ਚਿੱਟਾ ਰਾਣੀ ਦੇ ਦਿੰਦਾ ਹੈ, ਅਤੇ ਤਿੰਨ ਮੋਹਰੇ ਮਾਤ ਦਿੰਦੇ ਹਨ। ਲਾਲਚ ਦੀ ਸਜ਼ਾ ਮਿਲਦੀ ਹੈ।" },
        board: { fen: "rn1q1bnr/ppp1kB1p/3p2p1/3NN3/4P3/8/PPPP1PPP/R1BbK2R b KQ - 2 7", highlights: ["e7"] } },
    ],
    try: { kind: "line", side: "b", moves: ["e4", "e5", "Bc4", "Nc6", "Qh5", "g6", "Qf3", "Nf6"],
      prompt: play("You are Black. White is aiming at f7. Defend, then chase the queen.", "ਤੁਸੀਂ ਕਾਲੇ ਹੋ। ਚਿੱਟਾ f7 ਵੱਲ ਨਿਸ਼ਾਨਾ ਲਾਉਂਦਾ ਹੈ। ਬਚਾਅ ਕਰੋ, ਫਿਰ ਰਾਣੀ ਨੂੰ ਭਜਾਓ।") },
    practise: [
      { kind: "line", side: "w", moves: ["e4", "e5", "Nf3", "d6", "Bc4", "Bg4", "Nc3", "g6", "Nxe5", "Bxd1", "Bxf7+", "Ke7", "Nd5#"],
        prompt: play("Play Légal's trap as White, all the way to mate.", "ਚਿੱਟੇ ਵਜੋਂ ਲੇਗਾਲ ਦਾ ਫੰਦਾ ਖੇਡੋ, ਮਾਤ ਤੱਕ।") },
      { kind: "pack", pack: "opening-mate", count: 3, prompt: play("Real games: the opening ends in mate.", "ਅਸਲੀ ਖੇਡਾਂ: ਸ਼ੁਰੂਆਤ ਮਾਤ 'ਤੇ ਖ਼ਤਮ ਹੁੰਦੀ ਹੈ।") },
    ],
    challenge: { kind: "pack", pack: "opening-mate", count: 3, prompt: play("Three quick mates.", "ਤਿੰਨ ਜਲਦੀ ਮਾਤਾਂ।") },
  },

  {
    id: "6.4", level: 6, status: "draft",
    title: { en: "The Italian Game", pa: "ਇਤਾਲਵੀ ਖੇਡ" },
    goal: { en: "Play the Italian Game as White.", pa: "ਚਿੱਟੇ ਵਜੋਂ ਇਤਾਲਵੀ ਖੇਡ ਖੇਡੋ।" },
    learn: [
      { text: { en: "1. e4 e5 2. Nf3 Nc6 3. Bc4: the bishop aims at f7, the knight hits e5. Every move follows the three rules.", pa: "1. e4 e5 2. Nf3 Nc6 3. Bc4: ਊਠ f7 ਵੱਲ ਤੱਕਦਾ ਹੈ, ਘੋੜਾ e5 'ਤੇ ਹਮਲਾ ਕਰਦਾ ਹੈ। ਹਰ ਚਾਲ ਤਿੰਨ ਅਸੂਲਾਂ ਮੁਤਾਬਕ ਹੈ।" },
        board: { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", arrows: [["c4", "f7"], ["f3", "e5"]] } },
      { text: { en: "Then a quiet plan: c3 and d3 build a strong centre, and you castle. Calm, solid, and used by world champions.", pa: "ਫਿਰ ਸ਼ਾਂਤ ਯੋਜਨਾ: c3 ਅਤੇ d3 ਮਜ਼ਬੂਤ ਵਿਚਕਾਰ ਬਣਾਉਂਦੇ ਹਨ, ਅਤੇ ਤੁਸੀਂ ਕਿਲ੍ਹੇਬੰਦੀ ਕਰਦੇ ਹੋ। ਸ਼ਾਂਤ, ਪੱਕੀ, ਅਤੇ ਵਿਸ਼ਵ ਚੈਂਪੀਅਨਾਂ ਦੀ ਵਰਤੀ ਹੋਈ।" },
        board: { fen: "r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b kq - 1 6", highlights: ["c3","d3","g1"] } },
    ],
    try: { kind: "line", side: "w", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], opening: "Italian Game: Giuoco Piano",
      prompt: play("Play the first three moves of the Italian Game.", "ਇਤਾਲਵੀ ਖੇਡ ਦੀਆਂ ਪਹਿਲੀਆਂ ਤਿੰਨ ਚਾਲਾਂ ਖੇਡੋ।") },
    practise: [
      { kind: "line", side: "w", moves: ITALIAN, opening: "Italian Game: Classical Variation, Giuoco Pianissimo",
        prompt: play("Now the whole plan: c3, d3, castle.", "ਹੁਣ ਪੂਰੀ ਯੋਜਨਾ: c3, d3, ਕਿਲ੍ਹੇਬੰਦੀ।") },
      { kind: "line", side: "w", moves: ITALIAN, opening: "Italian Game: Classical Variation, Giuoco Pianissimo",
        prompt: play("Again, from memory.", "ਦੁਬਾਰਾ, ਯਾਦ ਤੋਂ।") },
    ],
    challenge: { kind: "line", side: "w", moves: ITALIAN, opening: "Italian Game: Classical Variation, Giuoco Pianissimo",
      prompt: play("The whole Italian, with no mistakes.", "ਪੂਰੀ ਇਤਾਲਵੀ ਖੇਡ, ਬਿਨਾਂ ਗ਼ਲਤੀ।") },
  },

  {
    id: "6.5", level: 6, status: "draft",
    title: { en: "The London System", pa: "ਲੰਡਨ ਪ੍ਰਣਾਲੀ" },
    goal: { en: "One reliable set-up for White after 1. d4.", pa: "1. d4 ਤੋਂ ਬਾਅਦ ਚਿੱਟੇ ਲਈ ਇੱਕ ਭਰੋਸੇਯੋਗ ਬਣਤਰ।" },
    learn: [
      { text: { en: "The London is a system: the same shape against almost anything. Pawns d4, e3, c3; bishop out to f4 BEFORE e3.", pa: "ਲੰਡਨ ਇੱਕ ਪ੍ਰਣਾਲੀ ਹੈ: ਲਗਭਗ ਹਰ ਜਵਾਬ ਦੇ ਖ਼ਿਲਾਫ਼ ਇੱਕੋ ਬਣਤਰ। ਪਿਆਦੇ d4, e3, c3; ਊਠ e3 ਤੋਂ ਪਹਿਲਾਂ f4 'ਤੇ।" },
        board: { fen: "rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq - 3 3", highlights: ["f4"] } },
      { text: { en: "Then Nbd2, Bd3 and castle. Easy to remember, hard to beat.", pa: "ਫਿਰ Nbd2, Bd3 ਅਤੇ ਕਿਲ੍ਹੇਬੰਦੀ। ਯਾਦ ਰੱਖਣੀ ਸੌਖੀ, ਹਰਾਉਣੀ ਔਖੀ।" },
        board: { fen: "r1bq1rk1/pp3ppp/2nbpn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 b - - 6 8", highlights: ["d2","d3","g1"] } },
    ],
    try: { kind: "line", side: "w", moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"], opening: "Queen's Pawn Game: London System",
      prompt: play("Start the London System.", "ਲੰਡਨ ਪ੍ਰਣਾਲੀ ਸ਼ੁਰੂ ਕਰੋ।") },
    practise: [
      { kind: "line", side: "w", moves: LONDON, opening: "Queen's Pawn Game: London System",
        prompt: play("Build the whole London set-up.", "ਪੂਰੀ ਲੰਡਨ ਬਣਤਰ ਬਣਾਓ।") },
    ],
    challenge: { kind: "line", side: "w", moves: LONDON, opening: "Queen's Pawn Game: London System",
      prompt: play("The London, with no mistakes.", "ਲੰਡਨ, ਬਿਨਾਂ ਗ਼ਲਤੀ।") },
  },

  {
    id: "6.6", level: 6, status: "draft",
    title: { en: "Answering 1. e4", pa: "1. e4 ਦਾ ਜਵਾਬ" },
    goal: { en: "Meet 1. e4 with 1... e5 and solid development.", pa: "1. e4 ਦਾ ਜਵਾਬ 1... e5 ਨਾਲ ਦਿਓ, ਅਤੇ ਮੋਹਰੇ ਪੱਕੀ ਤਰ੍ਹਾਂ ਕੱਢੋ।" },
    learn: [
      { text: { en: "As Black, answer 1. e4 with 1... e5: your own share of the centre. Then knights before bishops, and castle.", pa: "ਕਾਲੇ ਵਜੋਂ, 1. e4 ਦਾ ਜਵਾਬ 1... e5 ਨਾਲ ਦਿਓ: ਵਿਚਕਾਰ ਵਿੱਚ ਆਪਣਾ ਹਿੱਸਾ। ਫਿਰ ਊਠਾਂ ਤੋਂ ਪਹਿਲਾਂ ਘੋੜੇ, ਅਤੇ ਕਿਲ੍ਹੇਬੰਦੀ।" },
        board: { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", highlights: ["e5"] } },
      { text: { en: "Against 3. Bb5 (the Ruy Lopez), ...a6 asks the bishop a question, then ...Nf6 and ...Be7 get you ready to castle.", pa: "3. Bb5 (ਰੂਈ ਲੋਪੇਜ਼) ਦੇ ਖ਼ਿਲਾਫ਼, ...a6 ਊਠ ਤੋਂ ਸਵਾਲ ਪੁੱਛਦਾ ਹੈ, ਫਿਰ ...Nf6 ਅਤੇ ...Be7 ਤੁਹਾਨੂੰ ਕਿਲ੍ਹੇਬੰਦੀ ਲਈ ਤਿਆਰ ਕਰਦੇ ਹਨ।" },
        board: { fen: "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4", arrows: [["a6","b5"]] } },
    ],
    try: { kind: "line", side: "b", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], opening: "Italian Game: Two Knights Defense",
      prompt: play("You are Black. Answer the Italian with two knights.", "ਤੁਸੀਂ ਕਾਲੇ ਹੋ। ਇਤਾਲਵੀ ਦਾ ਜਵਾਬ ਦੋ ਘੋੜਿਆਂ ਨਾਲ ਦਿਓ।") },
    practise: [
      { kind: "line", side: "b", moves: RUY_BLACK, opening: "Ruy Lopez: Closed",
        prompt: play("You are Black against the Ruy Lopez.", "ਤੁਸੀਂ ਰੂਈ ਲੋਪੇਜ਼ ਦੇ ਖ਼ਿਲਾਫ਼ ਕਾਲੇ ਹੋ।") },
    ],
    challenge: { kind: "line", side: "b", moves: RUY_BLACK, opening: "Ruy Lopez: Closed",
      prompt: play("The Ruy Lopez as Black, with no mistakes.", "ਕਾਲੇ ਵਜੋਂ ਰੂਈ ਲੋਪੇਜ਼, ਬਿਨਾਂ ਗ਼ਲਤੀ।") },
  },

  {
    id: "6.7", level: 6, status: "draft",
    title: { en: "Answering 1. d4", pa: "1. d4 ਦਾ ਜਵਾਬ" },
    goal: { en: "Meet 1. d4 with the Queen's Gambit Declined set-up.", pa: "1. d4 ਦਾ ਜਵਾਬ ਰਾਣੀ ਦੇ ਗੈਂਬਿਟ ਨੂੰ ਨਾਂਹ ਵਾਲੀ ਬਣਤਰ ਨਾਲ ਦਿਓ।" },
    learn: [
      { text: { en: "1. d4 d5 2. c4 is the Queen's Gambit: White offers a pawn. Decline it with 2... e6, keeping a strong pawn on d5.", pa: "1. d4 d5 2. c4 ਰਾਣੀ ਦਾ ਗੈਂਬਿਟ ਹੈ: ਚਿੱਟਾ ਇੱਕ ਪਿਆਦਾ ਪੇਸ਼ ਕਰਦਾ ਹੈ। 2... e6 ਨਾਲ ਨਾਂਹ ਕਰੋ, d5 ਵਾਲਾ ਪਿਆਦਾ ਮਜ਼ਬੂਤ ਰੱਖ ਕੇ।" },
        board: { fen: "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3", highlights: ["d5", "e6"] } },
      { text: { en: "Then ...Nf6, ...Be7 and castle. Solid as a rock.", pa: "ਫਿਰ ...Nf6, ...Be7 ਅਤੇ ਕਿਲ੍ਹੇਬੰਦੀ। ਚੱਟਾਨ ਵਾਂਗ ਪੱਕਾ।" },
        board: { fen: "rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N1P3/PP3PPP/R2QKBNR w KQ - 1 6", highlights: ["f6","e7","g8"] } },
    ],
    try: { kind: "line", side: "b", moves: ["d4", "d5", "c4", "e6"], opening: "Queen's Gambit Declined",
      prompt: play("You are Black. Decline the Queen's Gambit.", "ਤੁਸੀਂ ਕਾਲੇ ਹੋ। ਰਾਣੀ ਦੇ ਗੈਂਬਿਟ ਨੂੰ ਨਾਂਹ ਕਰੋ।") },
    practise: [
      { kind: "line", side: "b", moves: QGD_BLACK, opening: "Queen's Gambit Declined",
        prompt: play("Develop and castle as Black.", "ਕਾਲੇ ਵਜੋਂ ਮੋਹਰੇ ਕੱਢੋ ਅਤੇ ਕਿਲ੍ਹੇਬੰਦੀ ਕਰੋ।") },
    ],
    challenge: { kind: "line", side: "b", moves: QGD_BLACK, opening: "Queen's Gambit Declined",
      prompt: play("The whole set-up, with no mistakes.", "ਪੂਰੀ ਬਣਤਰ, ਬਿਨਾਂ ਗ਼ਲਤੀ।") },
  },

  {
    id: "6.8", level: 6, status: "draft",
    title: { en: "From opening to plan", pa: "ਸ਼ੁਰੂਆਤ ਤੋਂ ਯੋਜਨਾ" },
    goal: { en: "Know what to do once the opening is over.", pa: "ਜਾਣੋ ਕਿ ਸ਼ੁਰੂਆਤ ਖ਼ਤਮ ਹੋਣ 'ਤੇ ਕੀ ਕਰਨਾ ਹੈ।" },
    learn: [
      { text: { en: "Once your pieces are out and your king is castled, the opening is done. Now ask three questions: which of my pieces is worst placed? Where are their weaknesses? Can I open a line for my rooks?", pa: "ਜਦੋਂ ਮੋਹਰੇ ਬਾਹਰ ਹੋਣ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨੇ ਕਿਲ੍ਹੇਬੰਦੀ ਕਰ ਲਈ ਹੋਵੇ, ਸ਼ੁਰੂਆਤ ਖ਼ਤਮ। ਹੁਣ ਤਿੰਨ ਸਵਾਲ ਪੁੱਛੋ: ਤੁਹਾਡਾ ਕਿਹੜਾ ਮੋਹਰਾ ਸਭ ਤੋਂ ਮਾੜੀ ਥਾਂ 'ਤੇ ਹੈ? ਉਨ੍ਹਾਂ ਦੀਆਂ ਕਮਜ਼ੋਰੀਆਂ ਕਿੱਥੇ ਹਨ? ਕੀ ਤੁਸੀਂ ਹਾਥੀਆਂ ਲਈ ਲਕੀਰ ਖੋਲ੍ਹ ਸਕਦੇ ਹੋ?" },
        board: { fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 2 7", highlights: ["b1","c1"] } },
    ],
    try: { kind: "choose", board: { fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b - - 2 6" },
      prompt: { en: "Italian, move 6. Which white knight is still undeveloped?", pa: "ਇਤਾਲਵੀ, ਚਾਲ ੬। ਚਿੱਟੇ ਦਾ ਕਿਹੜਾ ਘੋੜਾ ਅਜੇ ਨਹੀਂ ਨਿਕਲਿਆ?" },
      options: [
        { text: { en: "The knight on b1", pa: "b1 ਵਾਲਾ ਘੋੜਾ" }, correct: true, why: { en: "Yes: Nbd2 and then Nf1 or Nc4 bring it into play.", pa: "ਹਾਂ: Nbd2 ਅਤੇ ਫਿਰ Nf1 ਜਾਂ Nc4 ਉਸ ਨੂੰ ਖੇਡ ਵਿੱਚ ਲਿਆਉਂਦੇ ਹਨ।" } },
        { text: { en: "The knight on f3", pa: "f3 ਵਾਲਾ ਘੋੜਾ" }, why: { en: "That knight is already out, on its best square.", pa: "ਉਹ ਘੋੜਾ ਪਹਿਲਾਂ ਹੀ ਨਿਕਲ ਚੁੱਕਾ ਹੈ, ਆਪਣੇ ਸਭ ਤੋਂ ਵਧੀਆ ਖਾਨੇ 'ਤੇ।" } },
      ] },
    practise: [ { kind: "pack", pack: "opening-easy", count: 4, prompt: play("Real games: find the best move after the opening.", "ਅਸਲੀ ਖੇਡਾਂ: ਸ਼ੁਰੂਆਤ ਤੋਂ ਬਾਅਦ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") } ],
    challenge: { kind: "pack", pack: "opening-easy", count: 4, prompt: play("Four real games.", "ਚਾਰ ਅਸਲੀ ਖੇਡਾਂ।") },
  },
];
