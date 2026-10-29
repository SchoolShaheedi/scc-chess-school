// Level 3 · 400-600 · First mates. Ids and titles follow CURRICULUM.md. ALL TEXT IS DRAFT (DECISIONS #25, #33).
// "mateVs" limits are at least the known longest forced mate for that material (KRRK 7, KQK 10,
// KRK 16), so they hold even against perfect defence; test/content.test.ts checks this.
import type { Lesson } from "../lesson/types";

const mate1 = { en: "Checkmate in one move.", pa: "ਇੱਕ ਚਾਲ ਵਿੱਚ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" };

export const LEVEL3: Lesson[] = [
  {
    id: "3.1", level: 3, status: "checked",
    title: { en: "Back-rank mate", pa: "ਪਿਛਲੀ ਕਤਾਰ ਦੀ ਮਾਤ" },
    goal: { en: "Mate a king trapped behind its own pawns, and protect your own.", pa: "ਆਪਣੇ ਹੀ ਪਿਆਦਿਆਂ ਪਿੱਛੇ ਫਸੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿਓ, ਅਤੇ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਬਚਾਓ।" },
    learn: [
      { text: { en: "A castled king often sits behind three pawns. They protect it, but they also wall it in.", pa: "ਕਿਲ੍ਹੇਬੰਦੀ ਵਾਲਾ ਬਾਦਸ਼ਾਹ ਅਕਸਰ ਤਿੰਨ ਪਿਆਦਿਆਂ ਪਿੱਛੇ ਹੁੰਦਾ ਹੈ। ਉਹ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦੇ ਹਨ, ਪਰ ਉਸ ਨੂੰ ਘੇਰ ਵੀ ਲੈਂਦੇ ਹਨ।" },
        board: { fen: "6k1/5ppp/8/8/8/8/8/6K1 w - - 0 1", highlights: ["f7", "g7", "h7"] } },
      { text: { en: "A rook or queen checking along the back row is then checkmate, unless something can block or capture it.", pa: "ਫਿਰ ਪਿਛਲੀ ਕਤਾਰ ਵਿੱਚ ਹਾਥੀ ਜਾਂ ਰਾਣੀ ਦੀ ਸ਼ਹਿ ਸ਼ਹਿ-ਮਾਤ ਹੋ ਜਾਂਦੀ ਹੈ, ਜੇ ਕੋਈ ਉਸ ਨੂੰ ਰੋਕ ਜਾਂ ਮਾਰ ਨਾ ਸਕੇ।" },
        board: { fen: "3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1", arrows: [["d8", "g8"]] } },
      { text: { en: "Here it is NOT mate: the black rook on a8 can capture.", pa: "ਇੱਥੇ ਮਾਤ ਨਹੀਂ ਹੈ: a8 ਵਾਲਾ ਕਾਲਾ ਹਾਥੀ ਮਾਰ ਸਕਦਾ ਹੈ।" },
        board: { play: true, fen: "r2R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1", arrows: [["a8", "d8"]] } },
      { text: { en: "The cure for your own king: move one pawn up (like h3) to give it an escape square.", pa: "ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਲਈ ਹੱਲ: ਇੱਕ ਪਿਆਦਾ ਅੱਗੇ ਕਰੋ (ਜਿਵੇਂ h3) ਤਾਂ ਜੋ ਉਸ ਕੋਲ ਬਚਣ ਦਾ ਖਾਨਾ ਹੋਵੇ।" },
        board: { fen: "6k1/8/8/8/8/7P/5PP1/6K1 w - - 0 1", highlights: ["h2"], arrows: [["h2", "h3"]] } },
    ],
    try: { kind: "play", fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", goal: "mate", prompt: mate1,
      hint: { en: "Your rook can reach the back row.", pa: "ਤੁਹਾਡਾ ਹਾਥੀ ਪਿਛਲੀ ਕਤਾਰ ਤੱਕ ਪਹੁੰਚ ਸਕਦਾ ਹੈ।" } },
    practise: [
      { kind: "play", fen: "6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1", goal: "mate", prompt: mate1 },
      { kind: "play", fen: "4r1k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1", goal: "stop-mate",
        prompt: { en: "Black threatens Re1, a back-rank mate on YOU. Stop it.", pa: "ਕਾਲਾ Re1 ਦੀ ਧਮਕੀ ਦਿੰਦਾ ਹੈ, ਤੁਹਾਡੇ ਉੱਤੇ ਪਿਛਲੀ ਕਤਾਰ ਦੀ ਮਾਤ। ਇਸ ਨੂੰ ਰੋਕੋ।" },
        hint: { en: "Give your king an escape square.", pa: "ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਬਚਣ ਦਾ ਖਾਨਾ ਦਿਓ।" } },
      { kind: "pack", pack: "backrank", count: 4, prompt: { en: "Real games: find the back-rank mate.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਪਿਛਲੀ ਕਤਾਰ ਦੀ ਮਾਤ ਲੱਭੋ।" } },
    ],
    challenge: { kind: "pack", pack: "backrank", count: 3, prompt: { en: "Three real games. Mate on the back row.", pa: "ਤਿੰਨ ਅਸਲੀ ਖੇਡਾਂ। ਪਿਛਲੀ ਕਤਾਰ 'ਤੇ ਮਾਤ ਦਿਓ।" } },
  },

  {
    id: "3.2", level: 3, status: "checked",
    title: { en: "The ladder", pa: "ਪੌੜੀ ਮਾਤ" },
    goal: { en: "Mate a lone king with two rooks, walking it to the edge.", pa: "ਦੋ ਹਾਥੀਆਂ ਨਾਲ ਇਕੱਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੰਢੇ ਵੱਲ ਧੱਕ ਕੇ ਮਾਤ ਦਿਓ।" },
    learn: [
      { text: { en: "Two rooks can mate a lone king on their own. They climb like a ladder.", pa: "ਦੋ ਹਾਥੀ ਕਿਸੇ ਹੋਰ ਮੋਹਰੇ ਦੀ ਮਦਦ ਬਿਨਾਂ ਇਕੱਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦੇ ਸਕਦੇ ਹਨ। ਉਹ ਪੌੜੀ ਵਾਂਗ ਚੜ੍ਹਦੇ ਹਨ।" },
        board: { fen: "8/8/4k3/8/R7/1R6/8/7K w - - 0 1" } },
      { text: { en: "One rook guards a row so the king can't come back. The other gives check on the next row. Then they swap jobs.", pa: "ਇੱਕ ਹਾਥੀ ਇੱਕ ਕਤਾਰ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ ਤਾਂ ਜੋ ਬਾਦਸ਼ਾਹ ਵਾਪਸ ਨਾ ਆ ਸਕੇ। ਦੂਜਾ ਅਗਲੀ ਕਤਾਰ 'ਤੇ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ। ਫਿਰ ਉਹ ਕੰਮ ਬਦਲ ਲੈਂਦੇ ਹਨ।" },
        board: { fen: "8/8/4k3/8/R7/1R6/8/7K w - - 0 1", arrows: [["b3", "b5"], ["a4", "a6"]] } },
      { text: { en: "If the king comes close to a rook, move that rook far away along the same row. Never leave a rook where the king can take it.", pa: "ਜੇ ਬਾਦਸ਼ਾਹ ਕਿਸੇ ਹਾਥੀ ਦੇ ਨੇੜੇ ਆਵੇ, ਤਾਂ ਉਸ ਹਾਥੀ ਨੂੰ ਉਸੇ ਕਤਾਰ ਵਿੱਚ ਦੂਰ ਲੈ ਜਾਓ। ਹਾਥੀ ਨੂੰ ਕਦੇ ਉੱਥੇ ਨਾ ਛੱਡੋ ਜਿੱਥੇ ਬਾਦਸ਼ਾਹ ਉਸ ਨੂੰ ਮਾਰ ਸਕੇ।" },
        board: { fen: "8/8/8/1k6/R7/7R/8/7K w - - 0 1", arrows: [["a4","h4"]], highlights: ["a4"] } },
    ],
    try: { kind: "play", fen: "6k1/R7/8/8/8/8/8/1R5K w - - 0 1", goal: "mate",
      prompt: { en: "The last step of the ladder: checkmate.", pa: "ਪੌੜੀ ਦਾ ਆਖ਼ਰੀ ਡੰਡਾ: ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" },
      hint: { en: "One rook already guards the 7th row. The other checks on the 8th.", pa: "ਇੱਕ ਹਾਥੀ ਪਹਿਲਾਂ ਹੀ ਸੱਤਵੀਂ ਕਤਾਰ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ। ਦੂਜਾ ਅੱਠਵੀਂ 'ਤੇ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ।" } },
    practise: [
      { kind: "mateVs", fen: "8/8/8/4k3/8/8/8/R3K2R w - - 0 1", maxMoves: 10,
        prompt: { en: "Climb the ladder: checkmate the king with your two rooks.", pa: "ਪੌੜੀ ਚੜ੍ਹੋ: ਆਪਣੇ ਦੋ ਹਾਥੀਆਂ ਨਾਲ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿਓ।" } },
      { kind: "mateVs", fen: "8/8/3k4/8/8/8/8/RR4K1 w - - 0 1", maxMoves: 10,
        prompt: { en: "Again, from a new start.", pa: "ਫਿਰ ਇੱਕ ਵਾਰ, ਨਵੀਂ ਥਾਂ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ।" } },
    ],
    challenge: { kind: "mateVs", fen: "8/8/8/8/3k4/8/8/RR5K w - - 0 1", maxMoves: 8,
      prompt: { en: "Checkmate in 8 moves or fewer.", pa: "੮ ਜਾਂ ਘੱਟ ਚਾਲਾਂ ਵਿੱਚ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" } },
  },

  {
    id: "3.3", level: 3, status: "checked",
    title: { en: "Queen + king mate", pa: "ਰਾਣੀ ਨਾਲ ਮਾਤ" },
    goal: { en: "Mate a lone king with queen and king, without stalemate.", pa: "ਰਾਣੀ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਇਕੱਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿਓ, ਖੜੋਤ ਤੋਂ ਬਿਨਾਂ।" },
    learn: [
      { text: { en: "The queen can't mate alone: your king must help. First, build a box: put the queen a knight's jump away from the other king.", pa: "ਰਾਣੀ ਇਕੱਲੀ ਮਾਤ ਨਹੀਂ ਦੇ ਸਕਦੀ: ਤੁਹਾਡੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਦਦ ਕਰਨੀ ਪੈਂਦੀ ਹੈ। ਪਹਿਲਾਂ ਇੱਕ ਡੱਬਾ ਬਣਾਓ: ਰਾਣੀ ਨੂੰ ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਤੋਂ ਘੋੜੇ ਦੀ ਛਾਲ ਜਿੰਨੀ ਦੂਰ ਰੱਖੋ।" },
        board: { fen: "8/8/8/3k4/8/4Q3/8/4K3 b - - 0 1", highlights: ["e3"] } },
      { text: { en: "Each move, shrink the box until the king is stuck on the edge.", pa: "ਹਰ ਚਾਲ ਨਾਲ ਡੱਬਾ ਛੋਟਾ ਕਰੋ, ਜਦੋਂ ਤੱਕ ਬਾਦਸ਼ਾਹ ਕੰਢੇ 'ਤੇ ਨਾ ਫਸ ਜਾਵੇ।" },
        board: { fen: "6k1/8/5Q2/8/8/8/8/4K3 b - - 0 1" } },
      { text: { en: "Then STOP checking and bring your own king close. Careful: if the other king has no move and isn't in check, that's stalemate.", pa: "ਫਿਰ ਸ਼ਹਿ ਦੇਣੀ ਬੰਦ ਕਰੋ ਅਤੇ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਨੇੜੇ ਲਿਆਓ। ਧਿਆਨ ਰੱਖੋ: ਜੇ ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਕੋਲ ਚਾਲ ਨਾ ਹੋਵੇ ਅਤੇ ਸ਼ਹਿ ਵੀ ਨਾ ਹੋਵੇ, ਤਾਂ ਖੜੋਤ ਹੈ।" },
        board: { play: true, fen: "6k1/8/5Q2/8/4K3/8/8/8 b - - 0 1", arrows: [["e4", "f5"]] } },
      { text: { en: "Finish with the queen right next to the king, guarded by your king, or with a check along the edge.", pa: "ਰਾਣੀ ਨੂੰ ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਦੇ ਬਿਲਕੁਲ ਨਾਲ ਰੱਖੋ ਅਤੇ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਤੋਂ ਉਸ ਦੀ ਰਾਖੀ ਕਰਵਾਓ, ਜਾਂ ਕੰਢੇ ਦੀ ਕਤਾਰ 'ਤੇ ਸ਼ਹਿ ਦੇ ਕੇ ਮਾਤ ਦਿਓ।" },
        board: { fen: "6k1/6Q1/6K1/8/8/8/8/8 b - - 0 1" } },
    ],
    try: { kind: "play", fen: "k7/8/1K6/8/8/8/8/7Q w - - 0 1", goal: "mate", prompt: mate1 },
    practise: [
      { kind: "mateVs", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", maxMoves: 14,
        prompt: { en: "Box, shrink, bring the king, mate. You have 14 moves.", pa: "ਡੱਬਾ ਬਣਾਓ, ਛੋਟਾ ਕਰੋ, ਬਾਦਸ਼ਾਹ ਲਿਆਓ, ਮਾਤ ਦਿਓ। ਤੁਹਾਡੇ ਕੋਲ ੧੪ ਚਾਲਾਂ ਹਨ।" } },
      { kind: "mateVs", fen: "4k3/8/8/8/8/8/8/Q3K3 w - - 0 1", maxMoves: 12,
        prompt: { en: "The king starts on the edge. Mate it in 12 moves.", pa: "ਬਾਦਸ਼ਾਹ ਕੰਢੇ ਤੋਂ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ। ੧੨ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।" } },
    ],
    challenge: { kind: "mateVs", fen: "8/8/8/3k4/8/8/8/K6Q w - - 0 1", maxMoves: 12,
      prompt: { en: "From the middle of the board: checkmate in 12 moves.", pa: "ਬਿਸਾਤ ਦੇ ਵਿਚਕਾਰੋਂ ਸ਼ੁਰੂ ਕਰੋ: ੧੨ ਚਾਲਾਂ ਵਿੱਚ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" } },
  },

  {
    id: "3.4", level: 3, status: "checked",
    title: { en: "Rook + king mate", pa: "ਹਾਥੀ ਨਾਲ ਮਾਤ" },
    goal: { en: "Mate a lone king with rook and king.", pa: "ਹਾਥੀ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਇਕੱਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਾਤ ਦਿਓ।" },
    learn: [
      { text: { en: "The rook cuts the king off: it builds a wall the king can't cross.", pa: "ਹਾਥੀ ਬਾਦਸ਼ਾਹ ਦਾ ਰਾਹ ਰੋਕਦਾ ਹੈ: ਉਹ ਅਜਿਹੀ ਕੰਧ ਬਣਾਉਂਦਾ ਹੈ ਜੋ ਬਾਦਸ਼ਾਹ ਪਾਰ ਨਹੀਂ ਕਰ ਸਕਦਾ।" },
        board: { fen: "8/8/3k4/8/8/4R3/8/4K3 b - - 0 1", arrows: [["e3", "e8"]] } },
      { text: { en: "Walk your king towards the other king. When the two kings face each other with one square between, check on the edge row.", pa: "ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਵੱਲ ਲੈ ਜਾਓ। ਜਦੋਂ ਦੋਵੇਂ ਬਾਦਸ਼ਾਹ ਇੱਕ ਖਾਨਾ ਛੱਡ ਕੇ ਆਹਮੋ-ਸਾਹਮਣੇ ਹੋਣ, ਤਾਂ ਕੰਢੇ ਵਾਲੀ ਕਤਾਰ 'ਤੇ ਸ਼ਹਿ ਦਿਓ।" },
        board: { play: true, fen: "4k3/8/4K3/8/8/8/8/7R w - - 0 1", arrows: [["h1", "h8"]] } },
      { text: { en: "If the kings don't face each other yet, make a quiet rook move along its line: a waiting move. The other king must then step into place.", pa: "ਜੇ ਬਾਦਸ਼ਾਹ ਅਜੇ ਆਹਮੋ-ਸਾਹਮਣੇ ਨਹੀਂ, ਤਾਂ ਹਾਥੀ ਦੀ ਆਪਣੀ ਲਕੀਰ 'ਤੇ ਇੱਕ ਚੁੱਪ ਚਾਲ ਚੱਲੋ: ਉਡੀਕ ਦੀ ਚਾਲ। ਫਿਰ ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਆਪ ਹੀ ਸਹੀ ਥਾਂ 'ਤੇ ਆਉਣਾ ਪਵੇਗਾ।" },
        board: { fen: "4k3/R7/3K4/8/8/8/8/8 w - - 0 1", arrows: [["a7","b7"]] } },
    ],
    try: { kind: "play", fen: "3k4/8/3K4/8/8/8/8/R7 w - - 0 1", goal: "mate", prompt: mate1 },   // the slide's mate mirrored, so it is found, not copied (lesson check 2026-10-14)
    practise: [
      { kind: "play", fen: "k7/8/1K6/8/8/8/8/7R w - - 0 1", goal: "mate", prompt: mate1 },
      { kind: "mateVs", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", maxMoves: 20,
        prompt: { en: "Rook and king against king. Checkmate in 20 moves.", pa: "ਹਾਥੀ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਇਕੱਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ੨੦ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।" } },
    ],
    challenge: { kind: "mateVs", fen: "8/8/3k4/8/8/8/8/K6R w - - 0 1", maxMoves: 20,
      prompt: { en: "The real test: checkmate in 20 moves.", pa: "ਅਸਲੀ ਇਮਤਿਹਾਨ: ੨੦ ਚਾਲਾਂ ਵਿੱਚ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" } },
  },

  {
    id: "3.5", level: 3, status: "checked",
    title: { en: "Kiss of death", pa: "ਰਾਣੀ ਦੀ ਚੁੰਮੀ" },
    goal: { en: "Mate with the queen right next to the king, guarded.", pa: "ਰਾਣੀ ਨੂੰ ਬਾਦਸ਼ਾਹ ਦੇ ਬਿਲਕੁਲ ਨਾਲ ਰੱਖੋ, ਜਿੱਥੇ ਉਸ ਦੀ ਰਾਖੀ ਹੋਵੇ, ਅਤੇ ਮਾਤ ਦਿਓ।" },
    learn: [
      { text: { en: "The queen right next to the king, protected by another of your pieces, is often checkmate: the king can't take her.", pa: "ਜਦੋਂ ਰਾਣੀ ਬਾਦਸ਼ਾਹ ਦੇ ਬਿਲਕੁਲ ਨਾਲ ਹੋਵੇ ਅਤੇ ਤੁਹਾਡਾ ਕੋਈ ਹੋਰ ਮੋਹਰਾ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੋਵੇ, ਤਾਂ ਅਕਸਰ ਸ਼ਹਿ-ਮਾਤ ਹੁੰਦੀ ਹੈ: ਬਾਦਸ਼ਾਹ ਉਸ ਨੂੰ ਮਾਰ ਨਹੀਂ ਸਕਦਾ।" },
        board: { fen: "6k1/6Q1/6K1/8/8/8/8/8 b - - 0 1", arrows: [["g6", "g7"]] } },
      { text: { en: "Look for a square next to the king that your queen can reach and another piece already guards.", pa: "ਬਾਦਸ਼ਾਹ ਦੇ ਨਾਲ ਦਾ ਉਹ ਖਾਨਾ ਲੱਭੋ ਜਿੱਥੇ ਤੁਹਾਡੀ ਰਾਣੀ ਪਹੁੰਚ ਸਕੇ ਅਤੇ ਕੋਈ ਹੋਰ ਮੋਹਰਾ ਪਹਿਲਾਂ ਹੀ ਰਾਖੀ ਕਰਦਾ ਹੋਵੇ।" },
        board: { fen: "4k3/8/4K3/8/8/Q7/8/8 w - - 0 1", arrows: [["a3","e7"]], highlights: ["e7"] } },
    ],
    try: { kind: "play", fen: "6k1/8/6K1/8/8/8/8/Q7 w - - 0 1", goal: "mate", prompt: mate1,
      hint: { en: "Your king guards g7.", pa: "ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ g7 ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" } },
    practise: [
      { kind: "play", fen: "k7/8/8/8/8/8/1Q6/1R4K1 w - - 0 1", goal: "mate", prompt: mate1 },
      { kind: "pack", pack: "mate1-mid", count: 4, prompt: mate1 },
    ],
    challenge: { kind: "pack", pack: "mate1-mid", count: 3, prompt: { en: "Three real games. Mate in one.", pa: "ਤਿੰਨ ਅਸਲੀ ਖੇਡਾਂ। ਇੱਕ ਚਾਲ ਵਿੱਚ ਮਾਤ ਦਿਓ।" } },
  },

  {
    id: "3.6", level: 3, status: "checked",
    title: { en: "Smothered mate", pa: "ਘਿਰੀ ਹੋਈ ਮਾਤ" },
    goal: { en: "Mate with a knight when the king is boxed in by its own pieces.", pa: "ਜਦੋਂ ਬਾਦਸ਼ਾਹ ਆਪਣੇ ਹੀ ਮੋਹਰਿਆਂ ਵਿੱਚ ਘਿਰਿਆ ਹੋਵੇ, ਘੋੜੇ ਨਾਲ ਮਾਤ ਦਿਓ।" },
    learn: [
      { text: { en: "When a king is surrounded by its own pieces, a knight can give a check that nothing can block.", pa: "ਜਦੋਂ ਬਾਦਸ਼ਾਹ ਆਪਣੇ ਹੀ ਮੋਹਰਿਆਂ ਨਾਲ ਘਿਰਿਆ ਹੋਵੇ, ਤਾਂ ਘੋੜਾ ਅਜਿਹੀ ਸ਼ਹਿ ਦੇ ਸਕਦਾ ਹੈ ਜਿਸ ਨੂੰ ਕੋਈ ਰੋਕ ਨਹੀਂ ਸਕਦਾ।" },
        board: { fen: "6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1", arrows: [["f7", "h8"]] } },
      { text: { en: "Knights jump, so the check can't be blocked. If nothing can capture the knight, it's mate.", pa: "ਘੋੜੇ ਛਾਲ ਮਾਰਦੇ ਹਨ, ਇਸ ਲਈ ਸ਼ਹਿ ਰੋਕੀ ਨਹੀਂ ਜਾ ਸਕਦੀ। ਜੇ ਕੋਈ ਘੋੜੇ ਨੂੰ ਮਾਰ ਨਾ ਸਕੇ, ਤਾਂ ਮਾਤ ਹੈ।" },
        board: { fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", arrows: [["g5","f7"]] } },
    ],
    try: { kind: "play", fen: "6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1", goal: "mate", prompt: mate1,
      hint: { en: "Which square can your knight jump to, to give check?", pa: "ਤੁਹਾਡਾ ਘੋੜਾ ਕਿਸ ਖਾਨੇ 'ਤੇ ਛਾਲ ਮਾਰ ਕੇ ਸ਼ਹਿ ਦੇ ਸਕਦਾ ਹੈ?" } },
    practise: [
      { kind: "pack", pack: "smothered", count: 4, prompt: { en: "Real games: the knight delivers mate.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਘੋੜਾ ਮਾਤ ਦਿੰਦਾ ਹੈ।" } },
    ],
    challenge: { kind: "pack", pack: "smothered", count: 3, prompt: { en: "Three real games. Find the smothered mate.", pa: "ਤਿੰਨ ਅਸਲੀ ਖੇਡਾਂ। ਘਿਰੀ ਹੋਈ ਮਾਤ ਲੱਭੋ।" } },
  },

  {
    id: "3.7", level: 3, status: "checked",
    title: { en: "Mate in one, mixed", pa: "ਇੱਕ ਚਾਲ ਵਿੱਚ ਮਾਤ" },
    goal: { en: "Spot mate in one in any position.", pa: "ਕਿਸੇ ਵੀ ਹਾਲਤ ਵਿੱਚ ਇੱਕ ਚਾਲ ਦੀ ਮਾਤ ਲੱਭੋ।" },
    learn: [
      { text: { en: "Checks first. List every check you have. For each one ask: can the king move, can the check be blocked, can the checker be taken? If the answer is no, no, no: it's mate.",
                pa: "ਪਹਿਲਾਂ ਸ਼ਹਿ। ਸ਼ਹਿ ਦੇਣ ਵਾਲੀਆਂ ਆਪਣੀਆਂ ਸਾਰੀਆਂ ਚਾਲਾਂ ਗਿਣੋ। ਹਰ ਇੱਕ ਲਈ ਪੁੱਛੋ: ਕੀ ਬਾਦਸ਼ਾਹ ਹਿੱਲ ਸਕਦਾ ਹੈ, ਕੀ ਸ਼ਹਿ ਰੋਕੀ ਜਾ ਸਕਦੀ ਹੈ, ਕੀ ਸ਼ਹਿ ਦੇਣ ਵਾਲਾ ਮਾਰਿਆ ਜਾ ਸਕਦਾ ਹੈ? ਜੇ ਤਿੰਨਾਂ ਦਾ ਜਵਾਬ 'ਨਹੀਂ' ਹੈ, ਤਾਂ ਮਾਤ ਹੈ।" },
        board: { fen: "6k1/5ppp/8/8/8/1Q6/8/4R1K1 w - - 0 1", arrows: [["e1","e8"],["b3","f7"]] } },
    ],
    try: { kind: "play", fen: "k7/8/1K6/8/8/8/8/2R5 w - - 0 1", goal: "mate", prompt: mate1 },
    practise: [
      { kind: "pack", pack: "mate1-mid", count: 8, prompt: mate1 },
    ],
    challenge: { kind: "pack", pack: "mate1-mid", count: 5, prompt: { en: "Five real games, five mates.", pa: "ਪੰਜ ਅਸਲੀ ਖੇਡਾਂ, ਪੰਜ ਮਾਤਾਂ।" } },
  },

  {
    id: "3.8", level: 3, status: "checked",
    title: { en: "Don't get mated", pa: "ਮਾਤ ਤੋਂ ਬਚੋ" },
    goal: { en: "See your opponent's mate threat first, and stop it.", pa: "ਵਿਰੋਧੀ ਦੀ ਮਾਤ ਦੀ ਧਮਕੀ ਪਹਿਲਾਂ ਵੇਖੋ, ਅਤੇ ਉਸ ਨੂੰ ਰੋਕੋ।" },
    learn: [
      { text: { en: "Before every move, ask: what does my opponent want to do next? Is there a check that would mate me?", pa: "ਹਰ ਚਾਲ ਤੋਂ ਪਹਿਲਾਂ ਪੁੱਛੋ: ਮੇਰਾ ਵਿਰੋਧੀ ਅੱਗੇ ਕੀ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹੈ? ਕੀ ਕੋਈ ਸ਼ਹਿ ਮੈਨੂੰ ਮਾਤ ਦੇ ਸਕਦੀ ਹੈ?" },
        board: { fen: "r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1", arrows: [["a8","a1"]], highlights: ["a1"] } },
      { text: { en: "If they threaten mate, stop it first: guard the square, block the line, or make room for your king.", pa: "ਜੇ ਉਹ ਮਾਤ ਦੀ ਧਮਕੀ ਦੇਣ, ਤਾਂ ਪਹਿਲਾਂ ਉਸ ਨੂੰ ਰੋਕੋ: ਖਾਨੇ ਦੀ ਰਾਖੀ ਕਰੋ, ਲਕੀਰ ਰੋਕੋ, ਜਾਂ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਲਈ ਥਾਂ ਬਣਾਓ।" },
        board: { fen: "6k1/5ppp/3b4/8/7q/8/5PPP/5R1K w - - 0 1", arrows: [["h4", "h2"], ["d6", "h2"]] } },
    ],
    try: { kind: "play", fen: "4r1k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1", goal: "stop-mate",
      prompt: { en: "Black threatens to mate you. Stop it.", pa: "ਕਾਲਾ ਤੁਹਾਨੂੰ ਮਾਤ ਦੀ ਧਮਕੀ ਦਿੰਦਾ ਹੈ। ਇਸ ਨੂੰ ਰੋਕੋ।" },
      hint: { en: "Which check would be mate? Take that square or that line away.", pa: "ਕਿਹੜੀ ਸ਼ਹਿ ਮਾਤ ਹੋਵੇਗੀ? ਉਹ ਖਾਨਾ ਜਾਂ ਉਹ ਲਕੀਰ ਬੰਦ ਕਰ ਦਿਓ।" } },
    practise: [
      { kind: "play", fen: "6k1/5ppp/3b4/8/7q/8/5PPP/5R1K w - - 0 1", goal: "stop-mate",
        prompt: { en: "Queen and bishop aim at h2. Stop the mate.", pa: "ਰਾਣੀ ਅਤੇ ਊਠ h2 ਵੱਲ ਨਿਸ਼ਾਨਾ ਲਾਈ ਬੈਠੇ ਹਨ। ਮਾਤ ਰੋਕੋ।" } },
      { kind: "pack", pack: "defend-first", count: 3, prompt: { en: "Real games: find the move that saves you.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਉਹ ਚਾਲ ਲੱਭੋ ਜੋ ਤੁਹਾਨੂੰ ਬਚਾਵੇ।" } },
    ],
    challenge: { kind: "pack", pack: "defend-first", count: 3,
      prompt: { en: "Three real games. Defend first.", pa: "ਤਿੰਨ ਅਸਲੀ ਖੇਡਾਂ। ਪਹਿਲਾਂ ਬਚਾਅ ਕਰੋ।" } },
  },
];
