// Level 8 · 1400-1600 · Strategy I. Ids/titles follow CURRICULUM.md. ALL TEXT DRAFT (#25, #33).
// Hand-composed strategic middlegames proved unreliable under Stockfish (2026-10-04), so this level teaches what
// can be PROVED: "pick" exercises whose answers are computed by src/chess/structure.ts (isolated, doubled, passed,
// outposts, open files, least active piece, bad bishop), plus real-game Lichess puzzles for attack and plans.
import type { Lesson, Text } from "../lesson/types";

const real = (en: string, pa: string): Text => ({ en: `Real games: ${en}`, pa: `ਅਸਲੀ ਖੇਡਾਂ: ${pa}` });

export const LEVEL8: Lesson[] = [
  {
    id: "8.1", level: 8, status: "checked",
    title: { en: "Good and bad pieces", pa: "ਚੰਗੇ ਤੇ ਮਾੜੇ ਮੋਹਰੇ" },
    goal: { en: "Find your worst piece and make it better.", pa: "ਆਪਣਾ ਸਭ ਤੋਂ ਮਾੜਾ ਮੋਹਰਾ ਲੱਭੋ ਅਤੇ ਉਸ ਨੂੰ ਸੁਧਾਰੋ।" },
    learn: [
      { text: { en: "A piece is only as good as the squares it can reach. Count its moves: few moves means a poor piece.", pa: "ਮੋਹਰਾ ਓਨਾ ਹੀ ਚੰਗਾ ਹੈ ਜਿੰਨੇ ਖਾਨਿਆਂ ਤੱਕ ਉਹ ਪਹੁੰਚ ਸਕੇ। ਉਸ ਦੀਆਂ ਚਾਲਾਂ ਗਿਣੋ: ਘੱਟ ਚਾਲਾਂ ਦਾ ਮਤਲਬ ਮਾੜਾ ਮੋਹਰਾ।" },
        board: { fen: "4k3/pp3ppp/8/8/8/2B5/PP3PPP/N2RK3 w - - 0 1", dots: ["b3","c2"], highlights: ["a1"] } },
      { text: { en: "In a quiet position, improve your worst piece first. It is often worth more than winning a pawn.", pa: "ਸ਼ਾਂਤ ਹਾਲਤ ਵਿੱਚ, ਪਹਿਲਾਂ ਆਪਣੇ ਸਭ ਤੋਂ ਮਾੜੇ ਮੋਹਰੇ ਨੂੰ ਸੁਧਾਰੋ। ਅਕਸਰ ਇਹ ਇੱਕ ਪਿਆਦਾ ਜਿੱਤਣ ਨਾਲੋਂ ਵੱਧ ਕੀਮਤੀ ਹੁੰਦਾ ਹੈ।" },
        board: { fen: "4k3/pp3ppp/8/8/8/2B5/PP3PPP/N2RK3 w - - 0 1", arrows: [["a1","c2"]] } },
    ],
    try: { kind: "pick", fen: "4k3/pp3ppp/8/8/8/2B5/PP3PPP/N2RK3 w - - 0 1", feature: "fewestMoves", color: "w",
      prompt: { en: "Tap White's piece with the fewest moves (not the king or pawns). A knight in the corner is a sad knight.", pa: "ਚਿੱਟੇ ਦਾ ਸਭ ਤੋਂ ਘੱਟ ਚਾਲਾਂ ਵਾਲਾ ਮੋਹਰਾ ਛੂਹੋ (ਬਾਦਸ਼ਾਹ ਜਾਂ ਪਿਆਦੇ ਨਹੀਂ)। ਖੂੰਜੇ ਵਿੱਚ ਘੋੜਾ ਉਦਾਸ ਘੋੜਾ ਹੈ।" } },
    practise: [
      { kind: "pick", fen: "4k3/pp3ppp/8/8/3B4/2N5/PP3PPP/N3K2R w K - 0 1", feature: "fewestMoves", color: "w",
        prompt: { en: "Two white pieces are tied for the fewest moves. Tap both.", pa: "ਚਿੱਟੇ ਦੇ ਦੋ ਮੋਹਰਿਆਂ ਦੀਆਂ ਸਭ ਤੋਂ ਘੱਟ ਚਾਲਾਂ ਇੱਕੋ ਜਿੰਨੀਆਂ ਹਨ। ਦੋਵੇਂ ਛੂਹੋ।" } },
      { kind: "pack", pack: "advantage", count: 3, prompt: real("find the best plan.", "ਸਭ ਤੋਂ ਵਧੀਆ ਯੋਜਨਾ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "advantage", count: 3, prompt: real("three quiet positions.", "ਤਿੰਨ ਸ਼ਾਂਤ ਹਾਲਤਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
  },
  {
    id: "8.2", level: 8, status: "checked",
    title: { en: "Pawn structure", pa: "ਪਿਆਦਿਆਂ ਦੀ ਬਣਤਰ" },
    goal: { en: "Spot isolated, doubled and passed pawns.", pa: "ਇਕੱਲੇ, ਦੋਹਰੇ ਅਤੇ ਆਜ਼ਾਦ ਪਿਆਦੇ ਪਛਾਣੋ।" },
    learn: [
      { text: { en: "Isolated pawn: no friendly pawn on either file beside it. It can't be defended by a pawn.", pa: "ਇਕੱਲਾ ਪਿਆਦਾ: ਨਾਲ ਵਾਲੀਆਂ ਖੜ੍ਹੀਆਂ ਕਤਾਰਾਂ ਵਿੱਚ ਕੋਈ ਸਾਥੀ ਪਿਆਦਾ ਨਹੀਂ। ਕੋਈ ਪਿਆਦਾ ਉਸ ਦੀ ਰਾਖੀ ਨਹੀਂ ਕਰ ਸਕਦਾ।" },
        board: { fen: "4k3/pp3ppp/8/8/3P4/8/PP3PPP/4K3 w - - 0 1", highlights: ["d4"] } },
      { text: { en: "Doubled pawns: two on one file. They block each other. Passed pawns: nothing can stop them but pieces.", pa: "ਦੋਹਰੇ ਪਿਆਦੇ: ਇੱਕ ਖੜ੍ਹੀ ਕਤਾਰ ਵਿੱਚ ਦੋ। ਉਹ ਇੱਕ ਦੂਜੇ ਨੂੰ ਰੋਕਦੇ ਹਨ। ਆਜ਼ਾਦ ਪਿਆਦੇ: ਉਨ੍ਹਾਂ ਨੂੰ ਮੋਹਰਿਆਂ ਤੋਂ ਬਿਨਾਂ ਕੋਈ ਨਹੀਂ ਰੋਕ ਸਕਦਾ।" },
        board: { fen: "4k3/pp4pp/8/3P4/8/1P6/1P4PP/4K3 w - - 0 1", highlights: ["b2","b3","d5"] } },
    ],
    try: { kind: "pick", fen: "4k3/pp3ppp/8/8/3P4/8/PP3PPP/4K3 w - - 0 1", feature: "isolated", color: "w",
      prompt: { en: "Tap White's isolated pawn.", pa: "ਚਿੱਟੇ ਦਾ ਇਕੱਲਾ ਪਿਆਦਾ ਛੂਹੋ।" } },
    practise: [
      { kind: "pick", fen: "4k3/pp3ppp/8/8/8/2P5/P1P2PPP/4K3 w - - 0 1", feature: "doubled", color: "w",
        prompt: { en: "Tap every doubled white pawn.", pa: "ਚਿੱਟੇ ਦਾ ਹਰ ਦੋਹਰਾ ਪਿਆਦਾ ਛੂਹੋ।" } },
      { kind: "pick", fen: "4k3/p5pp/8/8/8/8/5PPP/4K3 b - - 0 1", feature: "passed", color: "b",
        prompt: { en: "Tap Black's passed pawn.", pa: "ਕਾਲੇ ਦਾ ਆਜ਼ਾਦ ਪਿਆਦਾ ਛੂਹੋ।" } },
    ],
    challenge: { kind: "pack", pack: "passed-pawn", count: 3, prompt: real("use the structure.", "ਬਣਤਰ ਵਰਤੋ।") },
  },
  {
    id: "8.3", level: 8, status: "checked",
    title: { en: "Outposts", pa: "ਪੱਕਾ ਟਿਕਾਣਾ" },
    goal: { en: "Find a square no enemy pawn can ever attack, for your knight.", pa: "ਆਪਣੇ ਘੋੜੇ ਲਈ ਉਹ ਖਾਨਾ ਲੱਭੋ ਜਿਸ 'ਤੇ ਦੁਸ਼ਮਣ ਦਾ ਕੋਈ ਪਿਆਦਾ ਕਦੇ ਹਮਲਾ ਨਾ ਕਰ ਸਕੇ।" },
    learn: [
      { text: { en: "An outpost is a square in the enemy half that no enemy pawn can ever attack, defended by one of your pawns. A knight there is a monster.", pa: "ਪੱਕਾ ਟਿਕਾਣਾ ਬਿਸਾਤ ਦੇ ਦੁਸ਼ਮਣ ਵਾਲੇ ਅੱਧ ਵਿੱਚ ਉਹ ਖਾਨਾ ਹੈ ਜਿਸ 'ਤੇ ਦੁਸ਼ਮਣ ਦਾ ਕੋਈ ਪਿਆਦਾ ਕਦੇ ਹਮਲਾ ਨਾ ਕਰ ਸਕੇ, ਅਤੇ ਤੁਹਾਡਾ ਇੱਕ ਪਿਆਦਾ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੋਵੇ। ਉੱਥੇ ਬੈਠਾ ਘੋੜਾ ਬਹੁਤ ਤਕੜਾ ਹੁੰਦਾ ਹੈ।" },
        board: { fen: "4k3/pp3ppp/3p4/4p3/4P3/8/PPP2PPP/4K3 w - - 0 1", highlights: ["d5"], arrows: [["e4", "d5"]] } },
    ],
    try: { kind: "pick", fen: "4k3/pp3ppp/3p4/4p3/4P3/8/PPP2PPP/4K3 w - - 0 1", feature: "outpost", color: "w",
      prompt: { en: "Tap White's outpost.", pa: "ਚਿੱਟੇ ਦਾ ਪੱਕਾ ਟਿਕਾਣਾ ਛੂਹੋ।" } },
    practise: [
      { kind: "pick", fen: "4k3/pp4pp/3p4/2pPp3/2P1P3/8/PP4PP/4K3 w - - 0 1", feature: "outpost", color: "w",
        prompt: { en: "A deep outpost: tap it.", pa: "ਡੂੰਘਾ ਪੱਕਾ ਟਿਕਾਣਾ: ਉਸ ਨੂੰ ਛੂਹੋ।" } },
    ],
    challenge: { kind: "pack", pack: "advantage", count: 3, prompt: real("put your pieces on strong squares.", "ਮੋਹਰੇ ਤਕੜੇ ਖਾਨਿਆਂ 'ਤੇ ਰੱਖੋ।") },
  },
  {
    id: "8.4", level: 8, status: "checked",
    title: { en: "Open files", pa: "ਖੁੱਲ੍ਹੀ ਖੜ੍ਹੀ ਕਤਾਰ" },
    goal: { en: "Put your rooks on open files.", pa: "ਆਪਣੇ ਹਾਥੀ ਖੁੱਲ੍ਹੀਆਂ ਖੜ੍ਹੀਆਂ ਕਤਾਰਾਂ 'ਤੇ ਰੱਖੋ।" },
    learn: [
      { text: { en: "An open file has no pawns on it at all. Rooks love open files: they reach deep into the enemy camp, often to the 7th rank.", pa: "ਖੁੱਲ੍ਹੀ ਖੜ੍ਹੀ ਕਤਾਰ ਵਿੱਚ ਕੋਈ ਪਿਆਦਾ ਨਹੀਂ ਹੁੰਦਾ। ਹਾਥੀ ਖੁੱਲ੍ਹੀਆਂ ਖੜ੍ਹੀਆਂ ਕਤਾਰਾਂ ਪਸੰਦ ਕਰਦੇ ਹਨ: ਉਹ ਦੁਸ਼ਮਣ ਦੇ ਪਾਸੇ ਅੰਦਰ ਤੱਕ, ਅਕਸਰ ਸੱਤਵੀਂ ਕਤਾਰ ਤੱਕ, ਪਹੁੰਚਦੇ ਹਨ।" },
        board: { play: true, fen: "r4rk1/pp3ppp/8/8/8/8/PP3PPP/R4RK1 w - - 0 1", arrows: [["f1", "d1"]] } },
      { text: { en: "A file with only enemy pawns is half-open: good for your rooks too, but not as good.", pa: "ਜਿਸ ਖੜ੍ਹੀ ਕਤਾਰ ਵਿੱਚ ਸਿਰਫ਼ ਦੁਸ਼ਮਣ ਦੇ ਪਿਆਦੇ ਹੋਣ, ਉਹ ਅੱਧੀ ਖੁੱਲ੍ਹੀ ਹੈ: ਤੁਹਾਡੇ ਹਾਥੀਆਂ ਲਈ ਵੀ ਚੰਗੀ, ਪਰ ਓਨੀ ਨਹੀਂ।" },
        board: { fen: "r4rk1/pp3ppp/2p5/8/8/8/PP3PPP/2R2RK1 w - - 0 1", arrows: [["c1","c6"]], highlights: ["c1","c6"] } },
    ],
    try: { kind: "pick", fen: "r4rk1/pp3ppp/8/8/8/8/PP3PPP/R4RK1 w - - 0 1", feature: "openFile", color: "w",
      prompt: { en: "Tap a square on each open file.", pa: "ਹਰ ਖੁੱਲ੍ਹੀ ਖੜ੍ਹੀ ਕਤਾਰ ਦਾ ਇੱਕ ਖਾਨਾ ਛੂਹੋ।" } },
    practise: [
      { kind: "pick", fen: "4k3/pp2pppp/8/8/8/8/PPP1P1PP/4K3 w - - 0 1", feature: "openFile", color: "w",
        prompt: { en: "Only one file is fully open. Careful: some are only half-open. Tap the open one.", pa: "ਸਿਰਫ਼ ਇੱਕ ਖੜ੍ਹੀ ਕਤਾਰ ਪੂਰੀ ਖੁੱਲ੍ਹੀ ਹੈ। ਧਿਆਨ: ਕੁਝ ਸਿਰਫ਼ ਅੱਧੀਆਂ ਖੁੱਲ੍ਹੀਆਂ ਹਨ। ਪੂਰੀ ਖੁੱਲ੍ਹੀ ਵਾਲੀ ਛੂਹੋ।" } },
    ],
    challenge: { kind: "pack", pack: "advantage", count: 3, prompt: real("rooks on open files.", "ਖੁੱਲ੍ਹੀਆਂ ਖੜ੍ਹੀਆਂ ਕਤਾਰਾਂ 'ਤੇ ਹਾਥੀ ਰੱਖੋ।") },
  },
  {
    id: "8.5", level: 8, status: "checked",
    title: { en: "Good and bad bishop", pa: "ਚੰਗਾ ਤੇ ਮਾੜਾ ਊਠ" },
    goal: { en: "Tell a good bishop from one blocked by its own pawns.", pa: "ਚੰਗੇ ਊਠ ਅਤੇ ਆਪਣੇ ਹੀ ਪਿਆਦਿਆਂ ਨਾਲ ਰੁਕੇ ਊਠ ਵਿੱਚ ਫ਼ਰਕ ਪਛਾਣੋ।" },
    learn: [
      { text: { en: "A bishop whose own pawns stand on its colour is bad: they block its diagonals. Put your pawns on the OTHER colour from your bishop.", pa: "ਜਿਸ ਊਠ ਦੇ ਆਪਣੇ ਪਿਆਦੇ ਉਸੇ ਦੇ ਰੰਗ 'ਤੇ ਹੋਣ, ਉਹ ਮਾੜਾ ਹੈ: ਪਿਆਦੇ ਉਸ ਦੀਆਂ ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ ਰੋਕਦੇ ਹਨ। ਆਪਣੇ ਪਿਆਦੇ ਊਠ ਤੋਂ ਦੂਜੇ ਰੰਗ 'ਤੇ ਰੱਖੋ।" },
        board: { fen: "4k3/8/3p4/2pPp3/2P1P3/8/8/2B1KB2 w - - 0 1", highlights: ["c4", "d5", "e4"] } },
    ],
    try: { kind: "pick", fen: "4k3/8/3p4/2pPp3/2P1P3/8/8/2B1KB2 w - - 0 1", feature: "badBishop", color: "w",
      prompt: { en: "Tap White's bad bishop.", pa: "ਚਿੱਟੇ ਦਾ ਮਾੜਾ ਊਠ ਛੂਹੋ।" } },
    practise: [
      { kind: "choose", board: { fen: "4k3/8/3p4/2pPp3/2P1P3/8/8/2B1KB2 w - - 0 1" },
        prompt: { en: "If White may trade one bishop, which should go?", pa: "ਜੇ ਚਿੱਟਾ ਇੱਕ ਊਠ ਵਟਾ ਸਕੇ, ਤਾਂ ਕਿਹੜਾ ਜਾਵੇ?" },
        options: [
          { text: { en: "The bad bishop on f1", pa: "f1 ਵਾਲਾ ਮਾੜਾ ਊਠ" }, correct: true, why: { en: "Yes: trade your bad pieces, keep your good ones.", pa: "ਹਾਂ: ਮਾੜੇ ਮੋਹਰੇ ਵਟਾਓ, ਚੰਗੇ ਰੱਖੋ।" } },
          { text: { en: "The good bishop on c1", pa: "c1 ਵਾਲਾ ਚੰਗਾ ਊਠ" }, why: { en: "Keep the good one: its diagonals are open.", pa: "ਚੰਗਾ ਰੱਖੋ: ਉਸ ਦੀਆਂ ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ ਖੁੱਲ੍ਹੀਆਂ ਹਨ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "advantage", count: 3, prompt: real("find the stronger plan.", "ਵੱਧ ਤਕੜੀ ਯੋਜਨਾ ਲੱਭੋ।") },
  },
  {
    id: "8.6", level: 8, status: "checked",
    title: { en: "Knight vs bishop", pa: "ਘੋੜਾ ਬਨਾਮ ਊਠ" },
    goal: { en: "Know when a knight beats a bishop, and when it's the other way round.", pa: "ਜਾਣੋ ਕਦੋਂ ਘੋੜਾ ਊਠ ਤੋਂ ਵਧੀਆ ਹੈ, ਅਤੇ ਕਦੋਂ ਉਲਟ।" },
    learn: [
      { text: { en: "Closed position, pawns locked together: the knight is better. It jumps; the bishop gets stuck.", pa: "ਬੰਦ ਹਾਲਤ, ਪਿਆਦੇ ਆਪਸ ਵਿੱਚ ਫਸੇ ਹੋਏ: ਘੋੜਾ ਵਧੀਆ ਹੈ। ਉਹ ਛਾਲ ਮਾਰਦਾ ਹੈ; ਊਠ ਫਸ ਜਾਂਦਾ ਹੈ।" },
        board: { fen: "4k3/8/3p4/2pPp3/2PnP3/5B2/8/4K3 w - - 0 1", highlights: ["d4","f3"] } },
      { text: { en: "Open position, pawns on both wings: the bishop is better. It reaches both sides of the board at once.", pa: "ਖੁੱਲ੍ਹੀ ਹਾਲਤ, ਦੋਵੇਂ ਪਾਸੇ ਪਿਆਦੇ: ਊਠ ਵਧੀਆ ਹੈ। ਉਹ ਬਿਸਾਤ ਦੇ ਦੋਵੇਂ ਪਾਸੇ ਇੱਕੋ ਵੇਲੇ ਪਹੁੰਚਦਾ ਹੈ।" },
        board: { fen: "6k1/pp3npp/8/8/8/8/PP3BPP/6K1 w - - 0 1", arrows: [["f2","a7"]] } },
    ],
    try: { kind: "choose", prompt: { en: "The pawns are all locked together in the centre. Which piece would you rather have?", pa: "ਸਾਰੇ ਪਿਆਦੇ ਵਿਚਕਾਰ ਆਪਸ ਵਿੱਚ ਫਸੇ ਹੋਏ ਹਨ। ਤੁਸੀਂ ਕਿਹੜਾ ਮੋਹਰਾ ਚਾਹੋਗੇ?" },
      options: [
        { text: { en: "A knight", pa: "ਘੋੜਾ" }, correct: true, why: { en: "Yes: in closed positions the knight jumps where the bishop can't go.", pa: "ਹਾਂ: ਬੰਦ ਹਾਲਤ ਵਿੱਚ ਘੋੜਾ ਉੱਥੇ ਛਾਲ ਮਾਰਦਾ ਹੈ ਜਿੱਥੇ ਊਠ ਨਹੀਂ ਜਾ ਸਕਦਾ।" } },
        { text: { en: "A bishop", pa: "ਊਠ" }, why: { en: "Locked pawns block a bishop's diagonals.", pa: "ਫਸੇ ਪਿਆਦੇ ਊਠ ਦੀਆਂ ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ ਰੋਕਦੇ ਹਨ।" } },
      ] },
    practise: [
      { kind: "choose", prompt: { en: "Open board, pawns on both wings. Which is usually better?", pa: "ਖੁੱਲ੍ਹੀ ਬਿਸਾਤ, ਦੋਵੇਂ ਪਾਸੇ ਪਿਆਦੇ। ਆਮ ਤੌਰ 'ਤੇ ਕਿਹੜਾ ਵਧੀਆ ਹੈ?" },
        options: [
          { text: { en: "The bishop", pa: "ਊਠ" }, correct: true, why: { en: "Yes: long diagonals, both wings at once.", pa: "ਹਾਂ: ਲੰਮੀਆਂ ਤਿਰਛੀਆਂ ਲਕੀਰਾਂ, ਦੋਵੇਂ ਪਾਸੇ ਇੱਕੋ ਵੇਲੇ।" } },
          { text: { en: "The knight", pa: "ਘੋੜਾ" }, why: { en: "A knight is slow to cross from one wing to the other.", pa: "ਘੋੜੇ ਨੂੰ ਇੱਕ ਪਾਸੇ ਤੋਂ ਦੂਜੇ ਪਾਸੇ ਪਹੁੰਚਣ ਵਿੱਚ ਚਿਰ ਲੱਗਦਾ ਹੈ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "advantage", count: 3, prompt: real("minor pieces at work.", "ਘੋੜੇ ਅਤੇ ਊਠ ਨਾਲ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
  },
  {
    id: "8.7", level: 8, status: "checked",
    title: { en: "Attacking the king", pa: "ਬਾਦਸ਼ਾਹ 'ਤੇ ਹਮਲਾ" },
    goal: { en: "Bring pieces towards the enemy king and break its shelter.", pa: "ਮੋਹਰਿਆਂ ਨੂੰ ਦੁਸ਼ਮਣ ਦੇ ਬਾਦਸ਼ਾਹ ਵੱਲ ਲਿਆਓ ਅਤੇ ਉਸ ਦੀ ਆੜ ਤੋੜੋ।" },
    learn: [
      { text: { en: "Count attackers and defenders near the king. When you have more attackers there, it's time to strike.", pa: "ਬਾਦਸ਼ਾਹ ਦੇ ਨੇੜੇ ਹਮਲਾਵਰ ਅਤੇ ਰਾਖੇ ਗਿਣੋ। ਜਦੋਂ ਉੱਥੇ ਤੁਹਾਡੇ ਹਮਲਾਵਰ ਵੱਧ ਹੋਣ, ਵਾਰ ਕਰਨ ਦਾ ਵੇਲਾ ਹੈ।" },
        board: { fen: "r4rk1/ppp2ppp/8/6NQ/8/3B4/PPP2PPP/R5K1 w - - 0 1", arrows: [["h5","h7"],["g5","h7"],["d3","h7"]], highlights: ["h7"] } },
      { text: { en: "If the kings castled on opposite sides, push the pawns in front of THEIR king: it opens lines without exposing yours.", pa: "ਜੇ ਬਾਦਸ਼ਾਹਾਂ ਨੇ ਉਲਟ ਪਾਸਿਆਂ 'ਤੇ ਕਿਲ੍ਹੇਬੰਦੀ ਕੀਤੀ ਹੈ, ਤਾਂ ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਦੇ ਅੱਗੇ ਵਾਲੇ ਪਿਆਦੇ ਧੱਕੋ: ਇਸ ਨਾਲ ਲਕੀਰਾਂ ਖੁੱਲ੍ਹਦੀਆਂ ਹਨ, ਤੁਹਾਡੇ ਬਾਦਸ਼ਾਹ ਦੀ ਆੜ ਨਹੀਂ ਟੁੱਟਦੀ।" },
        board: { fen: "r4rk1/ppp2ppp/8/8/6PP/8/PPP5/2KR3R w - - 0 1", arrows: [["g4","g5"],["h4","h5"]] } },
    ],
    try: { kind: "pack", pack: "kingside-attack", count: 1, prompt: { en: "Attack the king.", pa: "ਬਾਦਸ਼ਾਹ 'ਤੇ ਹਮਲਾ ਕਰੋ।" } },
    practise: [
      { kind: "pack", pack: "kingside-attack", count: 3, prompt: real("attack the king.", "ਬਾਦਸ਼ਾਹ 'ਤੇ ਹਮਲਾ ਕਰੋ।") },
      { kind: "pack", pack: "exposed-king", count: 2, prompt: real("the king has no shelter.", "ਬਾਦਸ਼ਾਹ ਦੀ ਕੋਈ ਆੜ ਨਹੀਂ: ਹਮਲਾ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "exposed-king", count: 3, prompt: real("three attacks.", "ਤਿੰਨ ਹਮਲੇ ਲੱਭੋ।") },
  },
  {
    id: "8.8", level: 8, status: "checked",
    title: { en: "Making a plan", pa: "ਯੋਜਨਾ ਬਣਾਉਣੀ" },
    goal: { en: "Find a weakness, choose a target, improve your worst piece.", pa: "ਕਮਜ਼ੋਰੀ ਲੱਭੋ, ਨਿਸ਼ਾਨਾ ਚੁਣੋ, ਆਪਣਾ ਸਭ ਤੋਂ ਮਾੜਾ ਮੋਹਰਾ ਸੁਧਾਰੋ।" },
    learn: [
      { text: { en: "A plan in three steps. 1) Find their weakness: an isolated pawn, a hole, a bad bishop. 2) Aim your pieces at it. 3) While they defend, improve your worst piece.", pa: "ਤਿੰਨ ਕਦਮਾਂ ਵਿੱਚ ਯੋਜਨਾ। ੧) ਵਿਰੋਧੀ ਦੀ ਕਮਜ਼ੋਰੀ ਲੱਭੋ: ਇਕੱਲਾ ਪਿਆਦਾ, ਛੇਕ, ਮਾੜਾ ਊਠ। ੨) ਆਪਣੇ ਮੋਹਰਿਆਂ ਦਾ ਨਿਸ਼ਾਨਾ ਉਸ 'ਤੇ ਲਾਓ। ੩) ਜਦੋਂ ਵਿਰੋਧੀ ਬਚਾਅ ਕਰੇ, ਆਪਣਾ ਸਭ ਤੋਂ ਮਾੜਾ ਮੋਹਰਾ ਸੁਧਾਰੋ।" },
        board: { fen: "3rk3/pp3ppp/8/8/3P4/8/PP3PPP/3RK3 b - - 0 1", arrows: [["d8","d4"]], highlights: ["d4"] } },
    ],
    try: { kind: "pick", fen: "4k3/pp3ppp/8/8/3P4/8/PP3PPP/4K3 b - - 0 1", feature: "isolated", color: "w",
      prompt: { en: "You are Black. Step 1: tap White's weakness, the target of your plan.", pa: "ਤੁਸੀਂ ਕਾਲੇ ਹੋ। ਪਹਿਲਾ ਕਦਮ: ਚਿੱਟੇ ਦੀ ਕਮਜ਼ੋਰੀ ਛੂਹੋ, ਤੁਹਾਡੀ ਯੋਜਨਾ ਦਾ ਨਿਸ਼ਾਨਾ।" } },
    practise: [ { kind: "pack", pack: "advantage", count: 4, prompt: real("follow the plan.", "ਯੋਜਨਾ ਮੁਤਾਬਕ ਚੱਲੋ।") } ],
    challenge: { kind: "pack", pack: "advantage", count: 4, prompt: real("four positions, four plans.", "ਚਾਰ ਹਾਲਤਾਂ ਵਿੱਚ ਚਾਰ ਯੋਜਨਾਵਾਂ ਲੱਭੋ।") },
  },

  // 8.9 (full check 2026-10-05): weak squares (holes), space and the bishop pair
  {
    id: "8.9", level: 8, status: "checked",
    title: { en: "Weak squares and the bishop pair", pa: "ਕਮਜ਼ੋਰ ਖਾਨੇ ਅਤੇ ਊਠਾਂ ਦੀ ਜੋੜੀ" },
    goal: { en: "Spot holes in a pawn chain, and know when two bishops are worth more.", pa: "ਪਿਆਦਿਆਂ ਦੀ ਲੜੀ ਵਿੱਚ ਛੇਕ ਪਛਾਣੋ, ਅਤੇ ਜਾਣੋ ਕਦੋਂ ਦੋ ਊਠ ਵੱਧ ਕੀਮਤੀ ਹਨ।" },
    learn: [
      { text: { en: "A hole is a square in your half that none of your pawns can ever guard. An enemy knight that lands there can't be chased away.", pa: "ਛੇਕ ਬਿਸਾਤ ਦੇ ਤੁਹਾਡੇ ਅੱਧ ਵਿੱਚ ਉਹ ਖਾਨਾ ਹੈ ਜਿਸ ਦੀ ਤੁਹਾਡਾ ਕੋਈ ਪਿਆਦਾ ਕਦੇ ਰਾਖੀ ਨਹੀਂ ਕਰ ਸਕਦਾ। ਉੱਥੇ ਬੈਠੇ ਦੁਸ਼ਮਣ ਘੋੜੇ ਨੂੰ ਭਜਾਇਆ ਨਹੀਂ ਜਾ ਸਕਦਾ।" },
        board: { fen: "4k3/pp3ppp/3p4/2p5/2P1P3/8/PP3PPP/4K3 w - - 0 1", highlights: ["d4"] } },
      { text: { en: "Space: pawns further forward give your pieces more room. The side with less space should trade pieces to breathe.", pa: "ਥਾਂ: ਅੱਗੇ ਵਧੇ ਪਿਆਦੇ ਤੁਹਾਡੇ ਮੋਹਰਿਆਂ ਨੂੰ ਵੱਧ ਥਾਂ ਦਿੰਦੇ ਹਨ। ਘੱਟ ਥਾਂ ਵਾਲੇ ਪਾਸੇ ਨੂੰ ਸਾਹ ਲੈਣ ਲਈ ਮੋਹਰੇ ਵਟਾਉਣੇ ਚਾਹੀਦੇ ਹਨ।" },
        board: { fen: "4k3/pp3ppp/3p4/2pPp3/2P1P3/8/PP3PPP/4K3 w - - 0 1", highlights: ["c4","d5","e4"] } },
      { text: { en: "The bishop pair: two bishops together cover both colours. In open positions they are usually stronger than bishop and knight.", pa: "ਊਠਾਂ ਦੀ ਜੋੜੀ: ਦੋ ਊਠ ਮਿਲ ਕੇ ਦੋਵੇਂ ਰੰਗਾਂ ਦੇ ਖਾਨਿਆਂ 'ਤੇ ਪਹੁੰਚਦੇ ਹਨ। ਖੁੱਲ੍ਹੀ ਹਾਲਤ ਵਿੱਚ ਉਹ ਅਕਸਰ ਊਠ ਅਤੇ ਘੋੜੇ ਨਾਲੋਂ ਤਕੜੇ ਹੁੰਦੇ ਹਨ।" },
        board: { fen: "4k3/pp1nbppp/8/8/2B5/4B3/PP3PPP/4K3 w - - 0 1", arrows: [["c4","f7"],["e3","a7"]] } },
    ],
    try: { kind: "pick", fen: "4k3/pp3ppp/3p4/2p5/2P1P3/8/PP3PPP/4K3 w - - 0 1", feature: "outpost", color: "b",
      prompt: { en: "Tap the hole in White's camp: the square a black knight would love.", pa: "ਚਿੱਟੇ ਦੇ ਪਾਸੇ ਦਾ ਛੇਕ ਛੂਹੋ: ਉਹ ਖਾਨਾ ਜੋ ਕਾਲੇ ਘੋੜੇ ਨੂੰ ਬਹੁਤ ਪਸੰਦ ਹੋਵੇਗਾ।" } },
    practise: [
      { kind: "choose", prompt: { en: "The position is open, with pawns on both wings. You have two bishops; they have bishop and knight. Who is usually better?", pa: "ਹਾਲਤ ਖੁੱਲ੍ਹੀ ਹੈ, ਦੋਵੇਂ ਪਾਸੇ ਪਿਆਦੇ। ਤੁਹਾਡੇ ਕੋਲ ਦੋ ਊਠ ਹਨ; ਵਿਰੋਧੀ ਕੋਲ ਊਠ ਅਤੇ ਘੋੜਾ। ਆਮ ਤੌਰ 'ਤੇ ਕੌਣ ਵਧੀਆ ਹੈ?" },
        options: [
          { text: { en: "You, with the bishop pair", pa: "ਤੁਸੀਂ, ਊਠਾਂ ਦੀ ਜੋੜੀ ਨਾਲ" }, correct: true, why: { en: "Yes: in open positions the bishop pair is a real advantage. Keep it, and open the position more.", pa: "ਹਾਂ: ਖੁੱਲ੍ਹੀ ਹਾਲਤ ਵਿੱਚ ਊਠਾਂ ਦੀ ਜੋੜੀ ਅਸਲੀ ਫ਼ਾਇਦਾ ਹੈ। ਉਸ ਨੂੰ ਰੱਖੋ, ਅਤੇ ਹਾਲਤ ਹੋਰ ਖੋਲ੍ਹੋ।" } },
          { text: { en: "It's exactly equal", pa: "ਬਿਲਕੁਲ ਬਰਾਬਰ ਹੈ" }, why: { en: "On paper, yes. In open positions the two bishops usually do more.", pa: "ਕਾਗ਼ਜ਼ 'ਤੇ ਹਾਂ, ਬਰਾਬਰ ਹੈ। ਖੁੱਲ੍ਹੀ ਹਾਲਤ ਵਿੱਚ ਦੋ ਊਠ ਆਮ ਤੌਰ 'ਤੇ ਵੱਧ ਕੰਮ ਕਰਦੇ ਹਨ।" } },
        ] },
      { kind: "choose", prompt: { en: "You have much less space: your pieces are cramped behind your pawns. What should you do?", pa: "ਤੁਹਾਡੇ ਕੋਲ ਬਹੁਤ ਘੱਟ ਥਾਂ ਹੈ: ਤੁਹਾਡੇ ਮੋਹਰੇ ਪਿਆਦਿਆਂ ਪਿੱਛੇ ਫਸੇ ਹਨ। ਤੁਹਾਨੂੰ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?" },
        options: [
          { text: { en: "Trade a pair of pieces", pa: "ਮੋਹਰਿਆਂ ਦਾ ਇੱਕ ਜੋੜਾ ਵਟਾਓ" }, correct: true, why: { en: "Yes: fewer pieces need less room.", pa: "ਹਾਂ: ਘੱਟ ਮੋਹਰਿਆਂ ਨੂੰ ਘੱਟ ਥਾਂ ਚਾਹੀਦੀ ਹੈ।" } },
          { text: { en: "Bring more pieces into the corner", pa: "ਹੋਰ ਮੋਹਰੇ ਖੂੰਜੇ ਵਿੱਚ ਲਿਆਓ" }, why: { en: "That makes the cramp worse.", pa: "ਇਸ ਨਾਲ ਮੋਹਰੇ ਹੋਰ ਤੰਗ ਹੋ ਜਾਂਦੇ ਹਨ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "advantage", count: 3, prompt: real("use the weak squares.", "ਕਮਜ਼ੋਰ ਖਾਨੇ ਵਰਤੋ।") },
  },
];
