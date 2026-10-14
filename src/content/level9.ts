// Level 9 · 1600-1800 · Endgames II. Ids/titles follow CURRICULUM.md. ALL TEXT DRAFT (#25, #33).
// Every "engineVs" position was chosen by probing it with Stockfish (2026-10-04) and is re-proved by the
// guard: the engine playing the learner's side must reach the goal within maxMoves (test/content.test.ts).
// The Lucena drills are "promote": Black usually gives up the rook for the pawn, which also counts (rules.ts).
import type { Lesson, Text } from "../lesson/types";

const real = (en: string, pa: string): Text => ({ en: `Real games: ${en}`, pa: `ਅਸਲੀ ਖੇਡਾਂ: ${pa}` });
const LUCENA = "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1";
const PHILIDOR = "8/8/8/8/3kp3/R7/1r6/4K3 w - - 0 1";

export const LEVEL9: Lesson[] = [
  {
    id: "9.1", level: 9, status: "draft",
    title: { en: "Rook endgames: the rules", pa: "ਹਾਥੀ ਦੀ ਅੰਤਲੀ ਖੇਡ: ਨਿਯਮ" },
    goal: { en: "Learn the three rules that win most rook endgames.", pa: "ਉਹ ਤਿੰਨ ਨਿਯਮ ਸਿੱਖੋ ਜੋ ਹਾਥੀ ਦੀਆਂ ਬਹੁਤੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਜਿਤਾਉਂਦੇ ਹਨ।" },
    learn: [
      { text: { en: "Rule 1: put your rook BEHIND a passed pawn, yours or theirs. Behind your own pawn it pushes; behind theirs it chases.", pa: "ਪਹਿਲਾ ਨਿਯਮ: ਆਪਣਾ ਹਾਥੀ ਆਜ਼ਾਦ ਪਿਆਦੇ ਦੇ ਪਿੱਛੇ ਰੱਖੋ, ਭਾਵੇਂ ਤੁਹਾਡਾ ਹੋਵੇ ਭਾਵੇਂ ਵਿਰੋਧੀ ਦਾ। ਆਪਣੇ ਪਿਆਦੇ ਦੇ ਪਿੱਛੇ ਹਾਥੀ ਪਿਆਦੇ ਨੂੰ ਧੱਕਦਾ ਹੈ; ਵਿਰੋਧੀ ਦੇ ਪਿਆਦੇ ਦੇ ਪਿੱਛੇ ਹਾਥੀ ਉਸ ਦਾ ਪਿੱਛਾ ਕਰਦਾ ਹੈ।" },
        board: { fen: "r5k1/8/8/P7/8/8/6K1/R7 w - - 0 1", arrows: [["a1","a5"]], highlights: ["a1"] } },
      { text: { en: "Rule 2: an active rook is worth a pawn. Attack, don't just defend.", pa: "ਦੂਜਾ ਨਿਯਮ: ਸਰਗਰਮ ਹਾਥੀ ਇੱਕ ਪਿਆਦੇ ਜਿੰਨਾ ਕੀਮਤੀ ਹੈ। ਹਮਲਾ ਕਰੋ, ਸਿਰਫ਼ ਬਚਾਅ ਹੀ ਨਾ ਕਰੋ।" },
        board: { fen: "1r4k1/R4ppp/1p6/8/8/8/5PPP/6K1 w - - 0 1", arrows: [["a7","f7"]], highlights: ["a7"] } },
      { text: { en: "Rule 3: cut the enemy king off. A rook on a file or rank can keep the king out of the game.", pa: "ਤੀਜਾ ਨਿਯਮ: ਦੁਸ਼ਮਣ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੱਟ ਦਿਓ। ਖੜ੍ਹੀ ਜਾਂ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਬੈਠਾ ਹਾਥੀ ਬਾਦਸ਼ਾਹ ਨੂੰ ਖੇਡ ਤੋਂ ਬਾਹਰ ਰੱਖ ਸਕਦਾ ਹੈ।" },
        board: { fen: LUCENA, highlights: ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] } },
    ],
    try: { kind: "pack", pack: "rook-endgame", count: 1, prompt: { en: "A real rook endgame. Find the best move.", pa: "ਹਾਥੀ ਦੀ ਅਸਲੀ ਅੰਤਲੀ ਖੇਡ। ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" } },
    practise: [
      { kind: "choose", prompt: { en: "Your opponent has a passed pawn. Where does your rook belong?", pa: "ਤੁਹਾਡੇ ਵਿਰੋਧੀ ਕੋਲ ਆਜ਼ਾਦ ਪਿਆਦਾ ਹੈ। ਤੁਹਾਡਾ ਹਾਥੀ ਕਿੱਥੇ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ?" },
        options: [
          { text: { en: "Behind the pawn", pa: "ਪਿਆਦੇ ਦੇ ਪਿੱਛੇ" }, correct: true, why: { en: "Yes: the further it runs, the more squares your rook sees.", pa: "ਹਾਂ: ਪਿਆਦਾ ਜਿੰਨਾ ਅੱਗੇ ਦੌੜੇ, ਤੁਹਾਡਾ ਹਾਥੀ ਓਨੇ ਵੱਧ ਖਾਨੇ ਵੇਖਦਾ ਹੈ।" } },
          { text: { en: "In front of the pawn", pa: "ਪਿਆਦੇ ਦੇ ਅੱਗੇ" }, why: { en: "In front, the rook gets pushed back and becomes passive.", pa: "ਅੱਗੇ ਹੋਣ ਨਾਲ ਹਾਥੀ ਪਿੱਛੇ ਧੱਕਿਆ ਜਾਂਦਾ ਹੈ ਅਤੇ ਨਿਕੰਮਾ ਹੋ ਜਾਂਦਾ ਹੈ।" } },
        ] },
      { kind: "pack", pack: "rook-endgame", count: 3, prompt: real("rook endgames.", "ਹਾਥੀ ਦੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "rook-endgame", count: 4, prompt: real("four rook endgames.", "ਹਾਥੀ ਦੀਆਂ ਚਾਰ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
  },
  {
    id: "9.2", level: 9, status: "draft",
    title: { en: "Lucena position", pa: "ਲੂਸੇਨਾ" },
    goal: { en: "Win with rook and pawn by building a bridge.", pa: "ਪੁਲ ਬਣਾ ਕੇ ਹਾਥੀ ਅਤੇ ਪਿਆਦੇ ਨਾਲ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "Your pawn is one step from queening, your king is in front of it, and their rook stops your king getting out. Their king is cut off by your rook.", pa: "ਤੁਹਾਡਾ ਪਿਆਦਾ ਰਾਣੀ ਬਣਨ ਤੋਂ ਇੱਕ ਕਦਮ ਦੂਰ ਹੈ, ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਉਸ ਦੇ ਅੱਗੇ ਹੈ, ਅਤੇ ਉਨ੍ਹਾਂ ਦਾ ਹਾਥੀ ਤੁਹਾਡੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਬਾਹਰ ਨਿਕਲਣ ਨਹੀਂ ਦਿੰਦਾ। ਤੁਹਾਡੇ ਹਾਥੀ ਨੇ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੱਟ ਦਿੱਤਾ ਹੈ।" },
        board: { fen: LUCENA } },
      { text: { en: "The plan: check their king one file further away, then lift your rook to the 4th rank. When your king walks out, the rook blocks the checks: that's the bridge.", pa: "ਯੋਜਨਾ: ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਦੇ ਕੇ ਇੱਕ ਖੜ੍ਹੀ ਕਤਾਰ ਹੋਰ ਦੂਰ ਧੱਕੋ, ਫਿਰ ਆਪਣਾ ਹਾਥੀ ਚੌਥੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਲਿਆਓ। ਜਦੋਂ ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਬਾਹਰ ਨਿਕਲੇ, ਹਾਥੀ ਸ਼ਹਿ ਨੂੰ ਰੋਕਦਾ ਹੈ: ਇਹੀ ਪੁਲ ਹੈ।" },
        board: { fen: LUCENA, arrows: [["c1", "d1"], ["d1", "d4"]] } },
    ],
    try: { kind: "engineVs", fen: LUCENA, goal: "promote", maxMoves: 15,
      prompt: { en: "Win against the computer: queen your pawn, or make Black give up the rook for it.", pa: "ਕੰਪਿਊਟਰ ਵਿਰੁੱਧ ਜਿੱਤੋ: ਪਿਆਦੇ ਨੂੰ ਰਾਣੀ ਬਣਾਓ, ਜਾਂ ਕਾਲੇ ਨੂੰ ਪਿਆਦੇ ਬਦਲੇ ਹਾਥੀ ਦੇਣ 'ਤੇ ਮਜਬੂਰ ਕਰੋ।" },
      hint: { en: "Rd1+ first, then the rook to the 4th rank.", pa: "ਪਹਿਲਾਂ Rd1+ ਚੱਲੋ, ਫਿਰ ਹਾਥੀ ਚੌਥੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਲਿਆਓ।" } },
    practise: [
      { kind: "choose", board: { fen: LUCENA },
        prompt: { en: "What is White's first move?", pa: "ਚਿੱਟੇ ਦੀ ਪਹਿਲੀ ਚਾਲ ਕਿਹੜੀ ਹੈ?" },
        options: [
          { text: { en: "Rd1+, pushing the king further away", pa: "Rd1+, ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਹੋਰ ਦੂਰ ਧੱਕਣਾ" }, correct: true, why: { en: "Yes: the king must go further from the pawn before you build the bridge.", pa: "ਹਾਂ: ਪੁਲ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਪਿਆਦੇ ਤੋਂ ਹੋਰ ਦੂਰ ਜਾਣਾ ਪਵੇਗਾ।" } },
          // (full check 2026-10-05: the old wrong answer Ka7 was illegal; White's king has no legal move here. Rc2 loses the rook to ...Rxc2, -6 by Stockfish)
          { text: { en: "Rc2, to guard the second row", pa: "Rc2, ਦੂਜੀ ਕਤਾਰ ਦੀ ਰਾਖੀ ਲਈ" }, why: { en: "Black's rook on a2 just takes it. Always check what your move leaves unguarded.", pa: "a2 ਵਾਲਾ ਕਾਲਾ ਹਾਥੀ ਉਸ ਨੂੰ ਮਾਰ ਦਿੰਦਾ ਹੈ। ਹਮੇਸ਼ਾ ਵੇਖੋ ਕਿ ਤੁਹਾਡੀ ਚਾਲ ਕੀ ਖੁੱਲ੍ਹਾ ਛੱਡਦੀ ਹੈ।" } },
        ] },
    ],
    challenge: { kind: "engineVs", fen: "3K1k2/3P4/8/8/8/8/2r5/4R3 w - - 0 1", goal: "promote", maxMoves: 15,
      prompt: { en: "The same idea on the d-file. Build the bridge.", pa: "d ਖੜ੍ਹੀ ਕਤਾਰ 'ਤੇ ਉਹੀ ਵਿਚਾਰ। ਪੁਲ ਬਣਾਓ।" } },
  },
  {
    id: "9.3", level: 9, status: "draft",
    title: { en: "Philidor position", pa: "ਫ਼ਿਲੀਡੋਰ" },
    goal: { en: "Draw a rook endgame a pawn down with the third-rank defence.", pa: "ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ ਦੇ ਬਚਾਅ ਨਾਲ ਇੱਕ ਪਿਆਦਾ ਘੱਟ ਹੋ ਕੇ ਵੀ ਬਰਾਬਰੀ ਬਚਾਓ।" },
    learn: [
      { text: { en: "Your king is in front of their pawn. Keep your rook on your 3rd rank: their king can't come closer without walking into checks.", pa: "ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਉਨ੍ਹਾਂ ਦੇ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਹੈ। ਆਪਣਾ ਹਾਥੀ ਆਪਣੀ ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਰੱਖੋ: ਉਨ੍ਹਾਂ ਦਾ ਬਾਦਸ਼ਾਹ ਸ਼ਹਿ ਮਿਲੇ ਬਿਨਾਂ ਨੇੜੇ ਨਹੀਂ ਆ ਸਕਦਾ।" },
        board: { fen: PHILIDOR, highlights: ["a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3"] } },
      { text: { en: "When the pawn steps onto your 3rd rank, the king loses its hiding place. Now swing the rook to the far end and check from behind.", pa: "ਜਦੋਂ ਪਿਆਦਾ ਤੁਹਾਡੀ ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਆ ਜਾਵੇ, ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਦੀ ਲੁਕਣ ਦੀ ਥਾਂ ਮੁੱਕ ਜਾਂਦੀ ਹੈ। ਹੁਣ ਹਾਥੀ ਨੂੰ ਦੂਜੇ ਸਿਰੇ ਲੈ ਜਾਓ ਅਤੇ ਪਿੱਛਿਓਂ ਸ਼ਹਿ ਦਿਓ।" },
        board: { fen: "8/8/8/8/3k4/R3p3/1r6/4K3 w - - 0 1", arrows: [["a3","a8"]] } },
    ],
    try: { kind: "engineVs", fen: PHILIDOR, goal: "hold", maxMoves: 12,
      prompt: { en: "You are a pawn down. Hold the draw for 12 moves.", pa: "ਤੁਹਾਡੇ ਕੋਲ ਇੱਕ ਪਿਆਦਾ ਘੱਟ ਹੈ। ੧੨ ਚਾਲਾਂ ਤੱਕ ਬਰਾਬਰੀ ਬਚਾਓ।" },
      hint: { en: "Keep the rook on the 3rd rank until the pawn arrives there.", pa: "ਜਦੋਂ ਤੱਕ ਪਿਆਦਾ ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਨਾ ਆਵੇ, ਹਾਥੀ ਉੱਥੇ ਹੀ ਰੱਖੋ।" } },
    practise: [
      { kind: "choose", prompt: { en: "The pawn has just stepped onto your 3rd rank. Now what?", pa: "ਪਿਆਦਾ ਹੁਣੇ ਤੁਹਾਡੀ ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਆਇਆ ਹੈ। ਹੁਣ ਕੀ?" },
        options: [
          { text: { en: "Rook to the far end, checks from behind", pa: "ਹਾਥੀ ਦੂਜੇ ਸਿਰੇ, ਪਿੱਛਿਓਂ ਸ਼ਹਿ" }, correct: true, why: { en: "Yes: their king has no shelter from the checks any more.", pa: "ਹਾਂ: ਹੁਣ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਕੋਲ ਸ਼ਹਿ ਤੋਂ ਕੋਈ ਆੜ ਨਹੀਂ।" } },
          { text: { en: "Keep waiting on the 3rd rank", pa: "ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਉਡੀਕਦੇ ਰਹੋ" }, why: { en: "Too late now: their king can hide in front of the pawn.", pa: "ਹੁਣ ਦੇਰ ਹੋ ਚੁੱਕੀ ਹੈ: ਉਨ੍ਹਾਂ ਦਾ ਬਾਦਸ਼ਾਹ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਲੁਕ ਸਕਦਾ ਹੈ।" } },
        ] },
    ],
    challenge: { kind: "engineVs", fen: "8/8/8/8/4kp2/R7/1r6/5K2 w - - 0 1", goal: "hold", maxMoves: 12,
      prompt: { en: "A different pawn, the same defence. Hold for 12 moves.", pa: "ਹੋਰ ਪਿਆਦਾ, ਉਹੀ ਬਚਾਅ। ੧੨ ਚਾਲਾਂ ਤੱਕ ਬਰਾਬਰੀ ਬਚਾਓ।" } },
  },
  {
    id: "9.4", level: 9, status: "draft",
    title: { en: "Zugzwang", pa: "ਮਜਬੂਰੀ ਦੀ ਚਾਲ" },
    goal: { en: "Win by making your opponent move when every move hurts.", pa: "ਵਿਰੋਧੀ ਨੂੰ ਉਦੋਂ ਚਾਲ ਚੱਲਣ 'ਤੇ ਮਜਬੂਰ ਕਰਕੇ ਜਿੱਤੋ ਜਦੋਂ ਹਰ ਚਾਲ ਨੁਕਸਾਨ ਕਰੇ।" },
    learn: [
      { text: { en: "In chess you can't pass. Sometimes every move makes your position worse: that is zugzwang.", pa: "ਸ਼ਤਰੰਜ ਵਿੱਚ ਤੁਸੀਂ ਵਾਰੀ ਛੱਡ ਨਹੀਂ ਸਕਦੇ। ਕਦੇ-ਕਦੇ ਹਰ ਚਾਲ ਤੁਹਾਡੀ ਹਾਲਤ ਵਿਗਾੜਦੀ ਹੈ: ਇਹੀ ਮਜਬੂਰੀ ਦੀ ਚਾਲ ਹੈ।" },
        board: { fen: "4k3/8/4K3/4P3/8/8/8/8 b - - 0 1", crosses: ["d7","e7","f7"], highlights: ["e8"] } },
      { text: { en: "In endgames, look for a quiet waiting move that hands the move back to them. You met this with the opposition in Level 5.", pa: "ਅੰਤਲੀ ਖੇਡ ਵਿੱਚ, ਉਡੀਕ ਦੀ ਇੱਕ ਸ਼ਾਂਤ ਚਾਲ ਲੱਭੋ ਜੋ ਵਾਰੀ ਉਨ੍ਹਾਂ ਨੂੰ ਵਾਪਸ ਦੇ ਦੇਵੇ। ਤੁਸੀਂ ਇਹ ਲੈਵਲ ੫ ਵਿੱਚ ਆਹਮੋ-ਸਾਹਮਣੇ ਨਾਲ ਵੇਖ ਚੁੱਕੇ ਹੋ।" },
        board: { fen: "4k3/8/4K3/4P3/8/8/P7/8 w - - 0 1", arrows: [["a2","a3"]] } },
    ],
    try: { kind: "pack", pack: "zugzwang", count: 1, prompt: { en: "Find the move that leaves them stuck.", pa: "ਉਹ ਚਾਲ ਲੱਭੋ ਜੋ ਉਨ੍ਹਾਂ ਨੂੰ ਫਸਾ ਦੇਵੇ।" } },
    practise: [ { kind: "pack", pack: "zugzwang", count: 3, prompt: real("zugzwang.", "ਮਜਬੂਰੀ ਦੀ ਚਾਲ ਲੱਭੋ।") } ],
    challenge: { kind: "pack", pack: "zugzwang", count: 4, prompt: real("four zugzwangs.", "ਮਜਬੂਰੀ ਦੀਆਂ ਚਾਰ ਚਾਲਾਂ ਲੱਭੋ।") },
  },
  {
    id: "9.5", level: 9, status: "draft",
    title: { en: "Minor-piece endgames", pa: "ਛੋਟੇ ਮੋਹਰਿਆਂ ਦੀ ਅੰਤਲੀ ਖੇਡ" },
    goal: { en: "Bishop against knight, and the wrong-coloured bishop.", pa: "ਊਠ ਬਨਾਮ ਘੋੜਾ, ਅਤੇ ਗ਼ਲਤ ਰੰਗ ਦਾ ਊਠ।" },
    learn: [
      { text: { en: "With pawns on both wings the bishop is usually stronger. With all the pawns on one side, the knight can hold its own.", pa: "ਬਿਸਾਤ ਦੇ ਦੋਵੇਂ ਪਾਸੇ ਪਿਆਦੇ ਹੋਣ ਤਾਂ ਆਮ ਤੌਰ 'ਤੇ ਊਠ ਤਕੜਾ ਹੁੰਦਾ ਹੈ। ਸਾਰੇ ਪਿਆਦੇ ਇੱਕ ਪਾਸੇ ਹੋਣ ਤਾਂ ਘੋੜਾ ਵੀ ਬਰਾਬਰ ਟੱਕਰ ਦੇ ਸਕਦਾ ਹੈ।" },
        board: { fen: "6k1/p4ppp/8/3n4/8/3B4/P4PPP/6K1 w - - 0 1", highlights: ["a2","a7"] } },
      { text: { en: "Bishop and rook pawn: if the bishop can't control the corner where the pawn queens, a king in that corner can't be driven out. It's a draw!", pa: "ਊਠ ਅਤੇ ਕੰਢੇ ਦਾ ਪਿਆਦਾ: ਜੇ ਊਠ ਉਸ ਖੂੰਜੇ ਦੇ ਖਾਨੇ ਤੱਕ ਨਹੀਂ ਪਹੁੰਚ ਸਕਦਾ ਜਿੱਥੇ ਪਿਆਦਾ ਰਾਣੀ ਬਣਦਾ ਹੈ, ਤਾਂ ਉਸ ਖੂੰਜੇ ਵਿੱਚ ਬੈਠੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੱਢਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ। ਬਰਾਬਰੀ!" },
        board: { fen: "8/8/8/8/8/5k1p/3b4/7K w - - 0 1", highlights: ["h1"] } },
    ],
    try: { kind: "engineVs", fen: "8/8/8/8/8/5k1p/3b4/7K w - - 0 1", goal: "hold", maxMoves: 10,
      prompt: { en: "Black has a whole bishop more, but the wrong one. Stay in the corner and hold for 10 moves.", pa: "ਕਾਲੇ ਕੋਲ ਪੂਰਾ ਊਠ ਵੱਧ ਹੈ, ਪਰ ਗ਼ਲਤ ਰੰਗ ਦਾ। ਖੂੰਜੇ ਵਿੱਚ ਰਹੋ ਅਤੇ ੧੦ ਚਾਲਾਂ ਤੱਕ ਬਰਾਬਰੀ ਬਚਾਓ।" },
      hint: { en: "Shuffle between h1 and g1. Don't leave the corner.", pa: "h1 ਅਤੇ g1 ਵਿਚਕਾਰ ਆਉਂਦੇ-ਜਾਂਦੇ ਰਹੋ। ਖੂੰਜਾ ਨਾ ਛੱਡੋ।" } },
    practise: [
      { kind: "pack", pack: "bishop-endgame", count: 2, prompt: real("bishop endgames.", "ਊਠ ਦੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
      { kind: "pack", pack: "knight-endgame", count: 2, prompt: real("knight endgames.", "ਘੋੜੇ ਦੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "bishop-endgame", count: 3, prompt: real("three minor-piece endgames.", "ਛੋਟੇ ਮੋਹਰਿਆਂ ਦੀਆਂ ਤਿੰਨ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
  },
  {
    id: "9.6", level: 9, status: "draft",
    title: { en: "Queen endgames", pa: "ਰਾਣੀ ਦੀ ਅੰਤਲੀ ਖੇਡ" },
    goal: { en: "Hide your king from checks, and use endless checks to save a lost game.", pa: "ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਤੋਂ ਲੁਕਾਓ, ਅਤੇ ਹਾਰੀ ਖੇਡ ਬਚਾਉਣ ਲਈ ਲਗਾਤਾਰ ਸ਼ਹਿ ਵਰਤੋ।" },
    learn: [
      { text: { en: "A queen can check from almost anywhere. Before you push your pawn, find a shelter for your king: often right next to the enemy king or behind your own pawns.", pa: "ਰਾਣੀ ਲਗਭਗ ਕਿਤੋਂ ਵੀ ਸ਼ਹਿ ਦੇ ਸਕਦੀ ਹੈ। ਪਿਆਦਾ ਅੱਗੇ ਵਧਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਲਈ ਆੜ ਲੱਭੋ: ਅਕਸਰ ਦੁਸ਼ਮਣ ਦੇ ਬਾਦਸ਼ਾਹ ਦੇ ਨਾਲ, ਜਾਂ ਆਪਣੇ ਪਿਆਦਿਆਂ ਦੇ ਪਿੱਛੇ।" },
        board: { fen: "8/7K/6P1/8/8/5Q2/1q6/k7 w - - 0 1", highlights: ["h7","g6"] } },
      { text: { en: "If you're losing, look for a perpetual check: checks that never end are a draw by repetition.", pa: "ਜੇ ਤੁਸੀਂ ਹਾਰ ਰਹੇ ਹੋ, ਤਾਂ ਲਗਾਤਾਰ ਸ਼ਹਿ ਲੱਭੋ: ਕਦੇ ਨਾ ਮੁੱਕਣ ਵਾਲੀ ਸ਼ਹਿ ਨਾਲ ਚਾਲਾਂ ਦੁਹਰਾਈਆਂ ਜਾਂਦੀਆਂ ਹਨ ਅਤੇ ਖੇਡ ਬਰਾਬਰੀ 'ਤੇ ਮੁੱਕਦੀ ਹੈ।" },
        board: { fen: "7k/6p1/8/8/8/8/2r5/1K1Q4 w - - 0 1", arrows: [["d1","h5"]], highlights: ["h5","e8"] } },
    ],
    try: { kind: "pack", pack: "queen-endgame-hard", count: 1, prompt: { en: "A real queen endgame.", pa: "ਰਾਣੀ ਦੀ ਅਸਲੀ ਅੰਤਲੀ ਖੇਡ।" } },
    practise: [ { kind: "pack", pack: "queen-endgame-hard", count: 3, prompt: real("queen endgames.", "ਰਾਣੀ ਦੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") } ],
    challenge: { kind: "pack", pack: "queen-endgame-hard", count: 4, prompt: real("four queen endgames.", "ਰਾਣੀ ਦੀਆਂ ਚਾਰ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
  },
  {
    id: "9.7", level: 9, status: "draft",
    title: { en: "Converting an advantage", pa: "ਜਿੱਤ ਪੱਕੀ ਕਰਨੀ" },
    goal: { en: "When you're ahead, trade pieces, not pawns.", pa: "ਜਦੋਂ ਤੁਸੀਂ ਅੱਗੇ ਹੋ, ਮੋਹਰੇ ਵਟਾਓ, ਪਿਆਦੇ ਨਹੀਂ।" },
    learn: [
      { text: { en: "Ahead in material? Every piece you trade makes your extra material count for more. But keep your pawns: they are what will queen.", pa: "ਮੋਹਰਿਆਂ ਵਿੱਚ ਅੱਗੇ ਹੋ? ਹਰ ਵਟਾਇਆ ਮੋਹਰਾ ਤੁਹਾਡੇ ਵਾਧੂ ਮੋਹਰੇ ਦੀ ਕੀਮਤ ਵਧਾਉਂਦਾ ਹੈ। ਪਰ ਆਪਣੇ ਪਿਆਦੇ ਰੱਖੋ: ਰਾਣੀ ਪਿਆਦਿਆਂ ਨੇ ਹੀ ਬਣਨਾ ਹੈ।" },
        board: { fen: "3r2k1/5ppp/8/8/8/8/P4PPP/3R2K1 w - - 0 1", arrows: [["d1","d8"]] } },
      { text: { en: "Don't rush. Take away their counterplay first, then push.", pa: "ਕਾਹਲੀ ਨਾ ਕਰੋ। ਪਹਿਲਾਂ ਵਿਰੋਧੀ ਦਾ ਜਵਾਬੀ ਹਮਲਾ ਰੋਕ ਦਿਓ, ਫਿਰ ਅੱਗੇ ਵਧੋ।" },
        board: { fen: "6k1/5ppp/8/8/8/8/P4PPP/6K1 w - - 0 1", arrows: [["g1","f1"]], highlights: ["a2"] } },
    ],
    try: { kind: "choose", prompt: { en: "You are a knight ahead. They offer to trade rooks. Should you?", pa: "ਤੁਹਾਡੇ ਕੋਲ ਇੱਕ ਘੋੜਾ ਵੱਧ ਹੈ। ਵਿਰੋਧੀ ਹਾਥੀ ਵਟਾਉਣ ਦੀ ਪੇਸ਼ਕਸ਼ ਕਰਦਾ ਹੈ। ਕੀ ਤੁਹਾਨੂੰ ਵਟਾਉਣੇ ਚਾਹੀਦੇ ਹਨ?" },
      options: [
        { text: { en: "Yes, trade", pa: "ਹਾਂ, ਵਟਾਓ" }, correct: true, why: { en: "Yes: with fewer pieces left, your extra knight matters more.", pa: "ਹਾਂ: ਘੱਟ ਮੋਹਰੇ ਬਚਣ ਨਾਲ ਤੁਹਾਡਾ ਵਾਧੂ ਘੋੜਾ ਹੋਰ ਕੀਮਤੀ ਹੋ ਜਾਂਦਾ ਹੈ।" } },
        { text: { en: "No, keep the rooks", pa: "ਨਹੀਂ, ਹਾਥੀ ਰੱਖੋ" }, why: { en: "Keeping pieces gives the player behind more chances to fight back.", pa: "ਮੋਹਰੇ ਰੱਖਣ ਨਾਲ ਪਿਛੜ ਰਹੇ ਖਿਡਾਰੀ ਨੂੰ ਟੱਕਰ ਦੇਣ ਦੇ ਵੱਧ ਮੌਕੇ ਮਿਲਦੇ ਹਨ।" } },
      ] },
    practise: [ { kind: "pack", pack: "converting", count: 4, prompt: real("finish the job.", "ਕੰਮ ਪੂਰਾ ਕਰੋ।") } ],
    challenge: { kind: "pack", pack: "converting", count: 4, prompt: real("four won positions. Win them.", "ਚਾਰ ਜਿੱਤੀਆਂ ਹਾਲਤਾਂ। ਜਿੱਤੋ।") },
  },

  // 9.8 (full check 2026-10-05): the outside passed pawn, the decoy that wins most king-and-pawn endgames
  {
    id: "9.8", level: 9, status: "draft",
    title: { en: "The outside passed pawn", pa: "ਬਾਹਰੀ ਆਜ਼ਾਦ ਪਿਆਦਾ" },
    goal: { en: "Use a far-away passed pawn to pull the enemy king away, then win on the other side.", pa: "ਦੂਰ ਵਾਲੇ ਆਜ਼ਾਦ ਪਿਆਦੇ ਨਾਲ ਦੁਸ਼ਮਣ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਖਿੱਚੋ, ਫਿਰ ਦੂਜੇ ਪਾਸੇ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "A passed pawn far from the other pawns is a decoy. The enemy king must run to stop it.", pa: "ਬਾਕੀ ਪਿਆਦਿਆਂ ਤੋਂ ਦੂਰ ਆਜ਼ਾਦ ਪਿਆਦਾ ਇੱਕ ਚੋਗਾ ਹੈ। ਦੁਸ਼ਮਣ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਉਸ ਨੂੰ ਰੋਕਣ ਲਈ ਦੌੜਨਾ ਪੈਂਦਾ ਹੈ।" },
        board: { fen: "8/6k1/6p1/8/P5P1/5K2/8/8 w - - 0 1", highlights: ["a4"] } },
      { text: { en: "While it runs, your king walks to the other side and eats the pawns left behind.", pa: "ਜਦੋਂ ਦੁਸ਼ਮਣ ਦਾ ਬਾਦਸ਼ਾਹ ਦੌੜਦਾ ਹੈ, ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਦੂਜੇ ਪਾਸੇ ਜਾ ਕੇ ਪਿੱਛੇ ਰਹਿ ਗਏ ਪਿਆਦੇ ਮਾਰਦਾ ਹੈ।" },
        board: { fen: "1k6/8/P5p1/8/6P1/5K2/8/8 w - - 0 1", arrows: [["f3","f4"]], highlights: ["g6"] } },
    ],
    try: { kind: "engineVs", fen: "8/6k1/6p1/8/P5P1/5K2/8/8 w - - 0 1", goal: "promote", maxMoves: 15,
      prompt: { en: "Win against the computer: the a-pawn pulls the king away, then your king takes g6.", pa: "ਕੰਪਿਊਟਰ ਵਿਰੁੱਧ ਜਿੱਤੋ: a ਵਾਲਾ ਪਿਆਦਾ ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਖਿੱਚਦਾ ਹੈ, ਫਿਰ ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ g6 ਮਾਰਦਾ ਹੈ।" },
      hint: { en: "Bring your king forward first: Kf4, then Ke5.", pa: "ਪਹਿਲਾਂ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਅੱਗੇ ਲਿਆਓ: Kf4, ਫਿਰ Ke5।" } },
    practise: [
      { kind: "choose", prompt: { en: "Both sides have pawns on the kingside, but only you have an extra pawn far away on the a-file. Who is better?", pa: "ਦੋਵਾਂ ਪਾਸਿਆਂ ਦੇ ਬਾਦਸ਼ਾਹ ਵਾਲੇ ਪਾਸੇ ਪਿਆਦੇ ਹਨ, ਪਰ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਕੋਲ a ਖੜ੍ਹੀ ਕਤਾਰ 'ਤੇ ਦੂਰ ਇੱਕ ਵਾਧੂ ਪਿਆਦਾ ਹੈ। ਕੌਣ ਬਿਹਤਰ ਹੈ?" },
        options: [
          { text: { en: "You: the outside pawn is a decoy", pa: "ਤੁਸੀਂ: ਬਾਹਰੀ ਪਿਆਦਾ ਚੋਗਾ ਹੈ" }, correct: true, why: { en: "Yes: their king must go to the a-file, and yours wins the kingside.", pa: "ਹਾਂ: ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ a ਖੜ੍ਹੀ ਕਤਾਰ ਵੱਲ ਜਾਣਾ ਪੈਂਦਾ ਹੈ, ਅਤੇ ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਬਾਦਸ਼ਾਹ ਵਾਲੇ ਪਾਸੇ ਦੇ ਪਿਆਦੇ ਜਿੱਤ ਲੈਂਦਾ ਹੈ।" } },
          { text: { en: "It's equal", pa: "ਬਰਾਬਰ ਹੈ" }, why: { en: "Count the kings' jobs: theirs has two jobs, yours has one.", pa: "ਬਾਦਸ਼ਾਹਾਂ ਦੇ ਕੰਮ ਗਿਣੋ: ਉਨ੍ਹਾਂ ਦੇ ਕੋਲ ਦੋ ਕੰਮ ਹਨ, ਤੁਹਾਡੇ ਕੋਲ ਇੱਕ।" } },
        ] },
      { kind: "pack", pack: "pawn-endgame", count: 3, prompt: real("pawn endgames.", "ਪਿਆਦਿਆਂ ਦੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।") },
    ],
    challenge: { kind: "engineVs", fen: "8/8/1k4p1/8/P5P1/5K2/8/8 w - - 0 1", goal: "promote", maxMoves: 20,
      prompt: { en: "Their king is close to your a-pawn now. Use it as a decoy anyway, and win.", pa: "ਹੁਣ ਉਨ੍ਹਾਂ ਦਾ ਬਾਦਸ਼ਾਹ ਤੁਹਾਡੇ a ਵਾਲੇ ਪਿਆਦੇ ਦੇ ਨੇੜੇ ਹੈ। ਫਿਰ ਵੀ ਪਿਆਦੇ ਨੂੰ ਚੋਗੇ ਵਜੋਂ ਵਰਤੋ, ਅਤੇ ਜਿੱਤੋ।" } },
  },

  // 9.9 (full check 2026-10-05): opposite-coloured bishops, the great drawing weapon (holds engine-proved)
  {
    id: "9.9", level: 9, status: "draft",
    title: { en: "Opposite-coloured bishops", pa: "ਉਲਟ ਰੰਗਾਂ ਦੇ ਊਠ" },
    goal: { en: "Save a pawn-down endgame when the bishops run on different colours.", pa: "ਜਦੋਂ ਊਠ ਉਲਟ ਰੰਗਾਂ 'ਤੇ ਚੱਲਣ, ਇੱਕ ਪਿਆਦਾ ਘੱਟ ਵਾਲੀ ਅੰਤਲੀ ਖੇਡ ਬਚਾਓ।" },
    learn: [
      { text: { en: "If your bishop runs on dark squares and theirs on light, their bishop can never fight yours, or chase it from its squares.", pa: "ਜੇ ਤੁਹਾਡਾ ਊਠ ਗੂੜ੍ਹੇ ਖਾਨਿਆਂ 'ਤੇ ਚੱਲਦਾ ਹੈ ਅਤੇ ਉਨ੍ਹਾਂ ਦਾ ਹਲਕੇ 'ਤੇ, ਤਾਂ ਉਨ੍ਹਾਂ ਦਾ ਊਠ ਕਦੇ ਤੁਹਾਡੇ ਊਠ ਨਾਲ ਲੜ ਨਹੀਂ ਸਕਦਾ, ਨਾ ਹੀ ਤੁਹਾਡੇ ਊਠ ਨੂੰ ਉਸ ਦੇ ਖਾਨਿਆਂ ਤੋਂ ਭਜਾ ਸਕਦਾ ਹੈ।" },
        board: { fen: "8/8/3k4/3b1p2/5P2/1p1K4/8/4B3 w - - 0 1", highlights: ["e1", "d5"] } },
      { text: { en: "So even a pawn down, park your bishop and king on the squares the pawns must cross. They can't get through: it's a draw.", pa: "ਇਸ ਲਈ ਇੱਕ ਪਿਆਦਾ ਘੱਟ ਹੋ ਕੇ ਵੀ, ਆਪਣਾ ਊਠ ਅਤੇ ਬਾਦਸ਼ਾਹ ਉਨ੍ਹਾਂ ਖਾਨਿਆਂ 'ਤੇ ਰੱਖੋ ਜਿਨ੍ਹਾਂ ਤੋਂ ਪਿਆਦਿਆਂ ਨੇ ਲੰਘਣਾ ਹੈ। ਉਹ ਲੰਘ ਨਹੀਂ ਸਕਦੇ: ਬਰਾਬਰੀ।" },
        board: { fen: "8/8/3k4/3b1p2/5P2/1p1K4/8/4B3 w - - 0 1", arrows: [["e1","c3"]], highlights: ["b2"] } },
    ],
    try: { kind: "engineVs", fen: "8/8/3k4/3b1p2/5P2/1p1K4/8/4B3 w - - 0 1", goal: "hold", maxMoves: 12,
      prompt: { en: "You are a pawn down, but the bishops are opposite colours. Hold the draw for 12 moves.", pa: "ਤੁਹਾਡੇ ਕੋਲ ਇੱਕ ਪਿਆਦਾ ਘੱਟ ਹੈ, ਪਰ ਊਠ ਉਲਟ ਰੰਗਾਂ ਦੇ ਹਨ। ੧੨ ਚਾਲਾਂ ਤੱਕ ਬਰਾਬਰੀ ਬਚਾਓ।" },
      hint: { en: "Keep your bishop guarding b2, the square the b-pawn must cross, and your king close to your own f-pawn.", pa: "ਆਪਣੇ ਊਠ ਨਾਲ b2 ਦੀ ਰਾਖੀ ਕਰੋ, ਜਿਸ ਤੋਂ b ਵਾਲੇ ਪਿਆਦੇ ਨੇ ਲੰਘਣਾ ਹੈ, ਅਤੇ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਆਪਣੇ f ਵਾਲੇ ਪਿਆਦੇ ਦੇ ਨੇੜੇ ਰੱਖੋ।" } },
    practise: [
      { kind: "choose", prompt: { en: "You are a pawn up, with bishops of opposite colours and nothing else. Are you likely to win?", pa: "ਤੁਹਾਡੇ ਕੋਲ ਇੱਕ ਪਿਆਦਾ ਵੱਧ ਹੈ, ਉਲਟ ਰੰਗਾਂ ਦੇ ਊਠ, ਹੋਰ ਕੁਝ ਨਹੀਂ। ਕੀ ਤੁਸੀਂ ਜਿੱਤ ਸਕੋਗੇ?" },
        options: [
          { text: { en: "Usually not: it's often a draw", pa: "ਆਮ ਤੌਰ 'ਤੇ ਨਹੀਂ: ਅਕਸਰ ਬਰਾਬਰੀ" }, correct: true, why: { en: "Right: one or even two extra pawns are often not enough.", pa: "ਠੀਕ: ਇੱਕ ਜਾਂ ਦੋ ਵਾਧੂ ਪਿਆਦੇ ਵੀ ਅਕਸਰ ਕਾਫ਼ੀ ਨਹੀਂ ਹੁੰਦੇ।" } },
          { text: { en: "Yes, easily", pa: "ਹਾਂ, ਆਸਾਨੀ ਨਾਲ" }, why: { en: "The defending bishop blocks your pawns on squares your bishop can't reach.", pa: "ਬਚਾਅ ਵਾਲਾ ਊਠ ਤੁਹਾਡੇ ਪਿਆਦਿਆਂ ਨੂੰ ਉਨ੍ਹਾਂ ਖਾਨਿਆਂ 'ਤੇ ਰੋਕਦਾ ਹੈ ਜਿੱਥੇ ਤੁਹਾਡਾ ਊਠ ਨਹੀਂ ਪਹੁੰਚ ਸਕਦਾ।" } },
        ] },
    ],
    challenge: { kind: "engineVs", fen: "8/5k2/8/3b1p2/5P2/1p2K3/8/4B3 w - - 0 1", goal: "hold", maxMoves: 12,
      prompt: { en: "Another opposite-bishops ending, a pawn down. Hold for 12 moves.", pa: "ਉਲਟ ਰੰਗਾਂ ਦੇ ਊਠਾਂ ਵਾਲੀ ਇੱਕ ਹੋਰ ਅੰਤਲੀ ਖੇਡ, ਇੱਕ ਪਿਆਦਾ ਘੱਟ। ੧੨ ਚਾਲਾਂ ਤੱਕ ਬਰਾਬਰੀ ਬਚਾਓ।" } },
  },
];
