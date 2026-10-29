// Level 7 · 1200-1400 · Tactics II. Ids/titles follow CURRICULUM.md (decoy = ਚੋਗਾ; sacrifice is never
// ਕੁਰਬਾਨੀ/ਬਲੀ). ALL TEXT DRAFT (#25, #33). Puzzles are Lichess 900-1500, theme-tagged; Try steps are single
// real puzzles, so every position here comes from a real game and is replayed by the guard.
import type { Lesson, Text } from "../lesson/types";

const real = (en: string, pa: string): Text => ({ en: `Real games: ${en}`, pa: `ਅਸਲੀ ਖੇਡਾਂ: ${pa}` });
const one = (pack: string, en: string, pa: string) => ({ kind: "pack" as const, pack, count: 1, prompt: { en, pa } });
const many = (pack: string, count: number, en: string, pa: string) => ({ kind: "pack" as const, pack, count, prompt: real(en, pa) });

export const LEVEL7: Lesson[] = [
  {
    id: "7.1", level: 7, status: "checked",
    title: { en: "Mate in two", pa: "ਦੋ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ" },
    goal: { en: "Find a checkmate that takes two moves.", pa: "ਦੋ ਚਾਲਾਂ ਵਾਲੀ ਸ਼ਹਿ-ਮਾਤ ਲੱਭੋ।" },
    learn: [
      { text: { en: "Look at forcing moves first, in this order: checks, then captures, then threats. Forcing moves leave your opponent few choices, so you can see to the end. In the picture, Re8+ is a check but ...Rxe8 just wins the rook; the capture Bxd5 wins a knight.", pa: "ਪਹਿਲਾਂ ਮਜਬੂਰ ਕਰਨ ਵਾਲੀਆਂ ਚਾਲਾਂ ਵੇਖੋ, ਇਸ ਤਰਤੀਬ ਵਿੱਚ: ਸ਼ਹਿ, ਫਿਰ ਮਾਰ, ਫਿਰ ਧਮਕੀ। ਇਹ ਚਾਲਾਂ ਵਿਰੋਧੀ ਕੋਲ ਘੱਟ ਰਾਹ ਛੱਡਦੀਆਂ ਹਨ, ਇਸ ਲਈ ਤੁਸੀਂ ਅੰਤ ਤੱਕ ਵੇਖ ਸਕਦੇ ਹੋ। ਤਸਵੀਰ ਵਿੱਚ Re8+ ਸ਼ਹਿ ਹੈ, ਪਰ ...Rxe8 ਨਾਲ ਹਾਥੀ ਚਲਾ ਜਾਂਦਾ ਹੈ; ਮਾਰ Bxd5 ਘੋੜਾ ਜਿੱਤਦੀ ਹੈ।" },
        board: { fen: "r5k1/5ppp/8/3n4/8/1B6/5PPP/4R1K1 w - - 0 1", arrows: [["e1","e8"],["b3","d5"]] } },
      { text: { en: "For each check, ask: what are ALL the replies? If every reply allows mate next move, you've found it.", pa: "ਹਰ ਸ਼ਹਿ ਲਈ ਪੁੱਛੋ: ਸਾਰੇ ਜਵਾਬ ਕਿਹੜੇ ਹਨ? ਜੇ ਹਰ ਜਵਾਬ ਤੋਂ ਬਾਅਦ ਅਗਲੀ ਚਾਲ ਮਾਤ ਹੈ, ਤਾਂ ਤੁਸੀਂ ਲੱਭ ਲਈ।" },
        board: { fen: "3r3k/6pp/7N/8/8/1Q6/5PPP/6K1 w - - 0 1", arrows: [["b3","g8"],["d8","g8"],["h6","f7"]] } },
    ],
    try: one("mate2", "Mate in two moves.", "ਦੋ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।"),
    practise: [many("mate2", 5, "mate in two.", "ਦੋ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।")],
    challenge: many("mate2", 4, "four mates in two.", "ਦੋ ਚਾਲਾਂ ਵਾਲੀਆਂ ਚਾਰ ਮਾਤਾਂ ਲੱਭੋ।"),
  },
  {
    id: "7.2", level: 7, status: "checked",
    title: { en: "Mate in three", pa: "ਤਿੰਨ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ" },
    goal: { en: "Calculate a forcing line three moves deep.", pa: "ਮਜਬੂਰ ਕਰਨ ਵਾਲੀਆਂ ਚਾਲਾਂ ਦੀ ਲੜੀ ਤਿੰਨ ਚਾਲਾਂ ਡੂੰਘੀ ਗਿਣੋ।" },
    learn: [
      { text: { en: "The same method, one step deeper. Keep the picture in your head: where is every piece after each move?", pa: "ਉਹੀ ਤਰੀਕਾ, ਇੱਕ ਕਦਮ ਹੋਰ ਡੂੰਘਾ। ਤਸਵੀਰ ਦਿਮਾਗ਼ ਵਿੱਚ ਰੱਖੋ: ਹਰ ਚਾਲ ਤੋਂ ਬਾਅਦ ਹਰ ਮੋਹਰਾ ਕਿੱਥੇ ਹੈ?" },
        board: { fen: "1k1q3r/pp6/2p2p2/8/2P2p2/1P2b3/P1Q1R1PP/3R3K b - - 4 28", flip: true, arrows: [["h8","h2"],["d8","h8"],["h8","h7"]] } },
      { text: { en: "Often the first move is a sacrifice that drags the king out into the open.", pa: "ਅਕਸਰ ਪਹਿਲੀ ਚਾਲ ਜਾਣ-ਬੁੱਝ ਕੇ ਮੋਹਰਾ ਦੇਣ ਵਾਲੀ ਹੁੰਦੀ ਹੈ, ਜੋ ਬਾਦਸ਼ਾਹ ਨੂੰ ਖੁੱਲ੍ਹੇ ਵਿੱਚ ਖਿੱਚ ਲਿਆਉਂਦੀ ਹੈ।" },
        board: { fen: "1k1q3r/pp6/2p2p2/8/2P2p2/1P2b3/P1Q1R1PP/3R3K b - - 4 28", flip: true, arrows: [["h8","h2"]], highlights: ["h1"] } },
    ],
    try: one("mate3", "Mate in three moves.", "ਤਿੰਨ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।"),
    practise: [many("mate3", 4, "mate in three.", "ਤਿੰਨ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।")],
    challenge: many("mate3", 3, "three mates in three.", "ਤਿੰਨ ਚਾਲਾਂ ਵਾਲੀਆਂ ਤਿੰਨ ਮਾਤਾਂ ਲੱਭੋ।"),
  },
  {
    id: "7.3", level: 7, status: "checked",
    title: { en: "Mating patterns", pa: "ਮਾਤ ਦੇ ਨਮੂਨੇ" },
    goal: { en: "Recognise the famous mating patterns at a glance.", pa: "ਮਸ਼ਹੂਰ ਮਾਤ ਦੇ ਨਮੂਨੇ ਇੱਕ ਨਜ਼ਰ ਵਿੱਚ ਪਛਾਣੋ।" },
    learn: [
      { text: { en: "Arabian mate: a rook next to the king, protected by a knight, in the corner.", pa: "ਅਰਬੀ ਮਾਤ: ਕੋਨੇ ਵਿੱਚ ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਦੇ ਨਾਲ ਹਾਥੀ, ਜਿਸ ਦੀ ਰਾਖੀ ਘੋੜਾ ਕਰਦਾ ਹੈ।" },
        board: { fen: "7k/7R/5N2/8/8/8/8/6K1 b - - 0 1", arrows: [["f6", "h7"]] } },
      { text: { en: "Patterns are like words: once you know them, you read them instantly. Hook, Boden, Anastasia and dovetail mates all appear in these games.", pa: "ਨਮੂਨੇ ਸ਼ਬਦਾਂ ਵਾਂਗ ਹਨ: ਜਦੋਂ ਇਨ੍ਹਾਂ ਨੂੰ ਜਾਣ ਲਓ, ਤਾਂ ਤੁਰੰਤ ਪੜ੍ਹ ਲੈਂਦੇ ਹੋ। ਹੁੱਕ, ਬੋਡਨ, ਅਨਾਸਤਾਸੀਆ ਅਤੇ ਡਵਟੇਲ ਮਾਤਾਂ ਸਭ ਇਨ੍ਹਾਂ ਖੇਡਾਂ ਵਿੱਚ ਆਉਂਦੀਆਂ ਹਨ।" },
        board: { fen: "2kr4/3p4/B7/8/5B2/8/8/6K1 b - - 0 1", arrows: [["a6","c8"],["f4","b8"]], highlights: ["c8"] } },
    ],
    try: one("mate-patterns", "Find the mating pattern.", "ਮਾਤ ਦਾ ਨਮੂਨਾ ਲੱਭੋ।"),
    practise: [many("mate-patterns", 5, "spot the pattern.", "ਨਮੂਨਾ ਪਛਾਣੋ।")],
    challenge: many("mate-patterns", 4, "four patterns.", "ਚਾਰ ਨਮੂਨੇ ਪਛਾਣੋ।"),
  },
  {
    id: "7.4", level: 7, status: "checked",
    title: { en: "Decoy", pa: "ਚੋਗਾ" },
    goal: { en: "Lure a piece onto a bad square.", pa: "ਕਿਸੇ ਮੋਹਰੇ ਨੂੰ ਮਾੜੇ ਖਾਨੇ 'ਤੇ ਲੁਭਾਓ।" },
    learn: [
      { text: { en: "A decoy offers a piece to pull an enemy piece, often the king, onto a square where your next move wins.", pa: "ਚੋਗਾ ਇੱਕ ਮੋਹਰਾ ਪੇਸ਼ ਕਰਦਾ ਹੈ ਤਾਂ ਜੋ ਦੁਸ਼ਮਣ ਦਾ ਕੋਈ ਮੋਹਰਾ, ਅਕਸਰ ਬਾਦਸ਼ਾਹ, ਉਸ ਖਾਨੇ 'ਤੇ ਆ ਜਾਵੇ ਜਿੱਥੇ ਤੁਹਾਡੀ ਅਗਲੀ ਚਾਲ ਜਿਤਾਉਂਦੀ ਹੈ।" },
        board: { fen: "3r3k/6pp/7N/8/8/1Q6/5PPP/6K1 w - - 0 1", arrows: [["b3","g8"],["d8","g8"]], highlights: ["g8"] } },
      { text: { en: "Ask: on which square would their king or queen be in trouble? Can I force it there?", pa: "ਪੁੱਛੋ: ਵਿਰੋਧੀ ਦਾ ਬਾਦਸ਼ਾਹ ਜਾਂ ਰਾਣੀ ਕਿਸ ਖਾਨੇ 'ਤੇ ਮੁਸ਼ਕਲ ਵਿੱਚ ਹੋਵੇਗੀ? ਕੀ ਤੁਸੀਂ ਉਸ ਨੂੰ ਉੱਥੇ ਜਾਣ ਲਈ ਮਜਬੂਰ ਕਰ ਸਕਦੇ ਹੋ?" },
        board: { fen: "6k1/2q2ppp/8/5N2/8/8/5PPP/6K1 w - - 0 1", arrows: [["f5","e7"]], highlights: ["c8","c6"] } },
    ],
    try: one("attraction", "Lure a piece onto the wrong square.", "ਮੋਹਰੇ ਨੂੰ ਗ਼ਲਤ ਖਾਨੇ 'ਤੇ ਲੁਭਾਓ।"),
    practise: [many("attraction", 4, "the decoy.", "ਚੋਗਾ ਲੱਭੋ।")],
    challenge: many("attraction", 3, "three decoys.", "ਤਿੰਨ ਚੋਗੇ ਲੱਭੋ।"),
  },
  {
    id: "7.5", level: 7, status: "checked",
    title: { en: "Deflection", pa: "ਧਿਆਨ ਹਟਾਉਣਾ" },
    goal: { en: "Pull a defender away from its job.", pa: "ਰਾਖੇ ਨੂੰ ਉਸ ਦੇ ਕੰਮ ਤੋਂ ਦੂਰ ਖਿੱਚੋ।" },
    learn: [
      { text: { en: "Every defender has a job: guarding a square or a piece. Give it a second job it can't refuse, and the first job is left undone.", pa: "ਹਰ ਰਾਖੇ ਦਾ ਇੱਕ ਕੰਮ ਹੁੰਦਾ ਹੈ: ਕਿਸੇ ਖਾਨੇ ਜਾਂ ਮੋਹਰੇ ਦੀ ਰਾਖੀ। ਉਸ ਨੂੰ ਦੂਜਾ ਕੰਮ ਦਿਓ ਜਿਸ ਤੋਂ ਉਹ ਨਾਂਹ ਨਾ ਕਰ ਸਕੇ, ਤਾਂ ਪਹਿਲਾ ਕੰਮ ਅਧੂਰਾ ਰਹਿ ਜਾਂਦਾ ਹੈ।" },
        board: { fen: "3r2k1/5ppp/3q4/8/1Q6/8/5PPP/4R1K1 w - - 0 1", arrows: [["b4","d6"],["d8","d6"],["e1","e8"]] } },
    ],
    try: one("deflection", "Deflect the defender.", "ਰਾਖੇ ਦਾ ਧਿਆਨ ਹਟਾਓ।"),
    practise: [many("deflection", 4, "deflection.", "ਰਾਖੇ ਦਾ ਧਿਆਨ ਹਟਾਓ।")],
    challenge: many("deflection", 3, "three deflections.", "ਤਿੰਨ ਵਾਰੀ ਰਾਖੇ ਦਾ ਧਿਆਨ ਹਟਾਓ।"),
  },
  {
    id: "7.6", level: 7, status: "checked",
    title: { en: "In-between move", pa: "ਵਿਚਕਾਰਲੀ ਚਾਲ" },
    goal: { en: "Play a surprise move before the expected recapture.", pa: "ਵਾਪਸ ਮਾਰਨ ਤੋਂ ਪਹਿਲਾਂ ਇੱਕ ਹੈਰਾਨੀ ਵਾਲੀ ਚਾਲ ਚੱਲੋ।" },
    learn: [
      { text: { en: "When a capture seems forced, stop and look: is there a check or a bigger threat first? Playing it in between can change everything.", pa: "ਜਦੋਂ ਮਾਰ ਜ਼ਰੂਰੀ ਲੱਗੇ, ਰੁਕੋ ਅਤੇ ਵੇਖੋ: ਕੀ ਪਹਿਲਾਂ ਕੋਈ ਸ਼ਹਿ ਜਾਂ ਵੱਡੀ ਧਮਕੀ ਹੈ? ਉਸ ਚਾਲ ਨੂੰ ਪਹਿਲਾਂ, ਵਿਚਕਾਰ ਚੱਲ ਦੇਣ ਨਾਲ ਸਭ ਕੁਝ ਬਦਲ ਸਕਦਾ ਹੈ।" },
        board: { fen: "4r1k1/5pp1/7p/8/8/2q5/1P3PPP/4R1K1 w - - 0 1", arrows: [["e1","e8"],["b2","c3"]], highlights: ["c3"] } },
    ],
    try: one("intermezzo", "Find the move in between.", "ਵਿਚਕਾਰਲੀ ਚਾਲ ਲੱਭੋ।"),
    practise: [many("intermezzo", 4, "the in-between move.", "ਵਿਚਕਾਰਲੀ ਚਾਲ ਲੱਭੋ।")],
    challenge: many("intermezzo", 3, "three surprises.", "ਤਿੰਨ ਹੈਰਾਨੀ ਵਾਲੀਆਂ ਚਾਲਾਂ ਲੱਭੋ।"),
  },
  {
    id: "7.7", level: 7, status: "checked",
    title: { en: "Interference & clearance", pa: "ਰੋਕ ਤੇ ਰਾਹ ਖੋਲ੍ਹਣਾ" },
    goal: { en: "Cut a defender's line, or clear a square for your own piece.", pa: "ਰਾਖੇ ਦੀ ਲਕੀਰ ਕੱਟੋ, ਜਾਂ ਆਪਣੇ ਮੋਹਰੇ ਲਈ ਖਾਨਾ ਖਾਲੀ ਕਰੋ।" },
    learn: [
      { text: { en: "Interference: put a piece between a defender and what it defends. The line is cut.", pa: "ਰੋਕ: ਰਾਖੇ ਅਤੇ ਉਸ ਮੋਹਰੇ ਵਿਚਕਾਰ, ਜਿਸ ਦੀ ਉਹ ਰਾਖੀ ਕਰਦਾ ਹੈ, ਇੱਕ ਮੋਹਰਾ ਰੱਖੋ। ਲਕੀਰ ਕੱਟੀ ਜਾਂਦੀ ਹੈ।" },
        board: { fen: "1b2k2r/8/8/2P1nN2/8/8/5P1P/4R1K1 w - - 0 1", arrows: [["b8","e5"],["f5","d6"],["e1","e5"]], highlights: ["d6"] } },
      { text: { en: "Clearance: move your own piece out of the way, often with a threat, so another piece can use its square or line.", pa: "ਰਾਹ ਖੋਲ੍ਹਣਾ: ਆਪਣੇ ਮੋਹਰੇ ਨੂੰ ਰਾਹੋਂ ਹਟਾਓ, ਅਕਸਰ ਧਮਕੀ ਨਾਲ, ਤਾਂ ਜੋ ਕੋਈ ਹੋਰ ਮੋਹਰਾ ਹਟਾਏ ਹੋਏ ਮੋਹਰੇ ਦਾ ਖਾਨਾ ਜਾਂ ਲਕੀਰ ਵਰਤ ਸਕੇ।" },
        board: { pieces: {c2:"wQ",e4:"wN",h7:"bP",g8:"bK"}, arrows: [["e4","f6"],["c2","h7"]] } },
    ],
    try: one("interference", "Cut the defender's line.", "ਰਾਖੇ ਦੀ ਲਕੀਰ ਕੱਟੋ।"),
    practise: [many("interference", 2, "interference.", "ਰਾਖੇ ਦੀ ਲਕੀਰ ਕੱਟੋ।"), many("clearance", 3, "clear the way.", "ਰਾਹ ਖੋਲ੍ਹੋ।")],
    challenge: many("clearance", 3, "three clearances.", "ਤਿੰਨ ਵਾਰੀ ਰਾਹ ਖੋਲ੍ਹੋ।"),
  },
  {
    id: "7.8", level: 7, status: "checked",
    title: { en: "X-ray", pa: "ਆਰ-ਪਾਰ ਹਮਲਾ" },
    goal: { en: "Attack or defend through another piece.", pa: "ਕਿਸੇ ਹੋਰ ਮੋਹਰੇ ਦੇ ਆਰ-ਪਾਰ ਹਮਲਾ ਜਾਂ ਰਾਖੀ ਕਰੋ।" },
    learn: [
      { text: { en: "A rook, bishop or queen still works through a piece in its way: once that piece moves or is captured, the line comes alive.", pa: "ਹਾਥੀ, ਊਠ ਜਾਂ ਰਾਣੀ ਰਾਹ ਵਿੱਚ ਆਏ ਮੋਹਰੇ ਦੇ ਆਰ-ਪਾਰ ਵੀ ਕੰਮ ਕਰਦੇ ਹਨ: ਜਦੋਂ ਉਹ ਮੋਹਰਾ ਹਿੱਲ ਜਾਵੇ ਜਾਂ ਮਾਰਿਆ ਜਾਵੇ, ਲਕੀਰ ਜਾਗ ਪੈਂਦੀ ਹੈ।" },
        board: { fen: "3r2k1/8/8/3q4/8/8/3R4/3R2K1 w - - 0 1", arrows: [["d1","d5"]], highlights: ["d2"] } },
    ],
    try: one("xray", "Use the x-ray.", "ਆਰ-ਪਾਰ ਹਮਲਾ ਵਰਤੋ।"),
    practise: [many("xray", 4, "x-ray.", "ਆਰ-ਪਾਰ ਹਮਲਾ ਵਰਤੋ।")],
    challenge: many("xray", 3, "three x-rays.", "ਤਿੰਨ ਆਰ-ਪਾਰ ਹਮਲੇ ਲੱਭੋ।"),
  },
  {
    id: "7.9", level: 7, status: "checked",
    title: { en: "Giving up material", pa: "ਜਾਣ-ਬੁੱਝ ਕੇ ਮੋਹਰਾ ਦੇਣਾ" },
    goal: { en: "Know when giving a piece away wins more.", pa: "ਜਾਣੋ ਕਦੋਂ ਮੋਹਰਾ ਦੇਣ ਨਾਲ ਹੋਰ ਵੀ ਵੱਧ ਮਿਲਦਾ ਹੈ।" },
    learn: [
      { text: { en: "Sometimes the best move gives material away on purpose: to mate, to win more back, or to break the king's shelter. Count to the end before you give.", pa: "ਕਦੇ-ਕਦੇ ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਜਾਣ-ਬੁੱਝ ਕੇ ਮੋਹਰਾ ਦਿੰਦੀ ਹੈ: ਮਾਤ ਲਈ, ਵੱਧ ਵਾਪਸ ਜਿੱਤਣ ਲਈ, ਜਾਂ ਬਾਦਸ਼ਾਹ ਦੀ ਆੜ ਤੋੜਨ ਲਈ। ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਅੰਤ ਤੱਕ ਗਿਣੋ।" },
        board: { fen: "r1bq1rk1/pppn1ppp/2n1p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 7 8", arrows: [["d3","h7"]], highlights: ["h7"] } },
    ],
    try: one("sacrifice", "Give up material to win.", "ਜਿੱਤਣ ਲਈ ਮੋਹਰਾ ਦਿਓ।"),
    practise: [many("sacrifice", 5, "the winning gift.", "ਜਿਤਾਉਣ ਵਾਲਾ ਮੋਹਰਾ ਦਿਓ।")],
    challenge: many("sacrifice", 4, "four brave moves.", "ਚਾਰ ਦਲੇਰ ਚਾਲਾਂ ਲੱਭੋ।"),
  },
  {
    id: "7.10", level: 7, status: "checked",
    title: { en: "Quiet moves", pa: "ਚੁੱਪ ਚਾਲ" },
    goal: { en: "Find the strong move that is not a check or capture.", pa: "ਉਹ ਤਕੜੀ ਚਾਲ ਲੱਭੋ ਜੋ ਨਾ ਸ਼ਹਿ ਹੈ ਨਾ ਮਾਰ।" },
    learn: [
      { text: { en: "Not every winning move is loud. A quiet move can cut off the king, set up a threat that can't be stopped, or take away the last defence.", pa: "ਹਰ ਜਿਤਾਉਣ ਵਾਲੀ ਚਾਲ ਰੌਲੇ ਵਾਲੀ ਨਹੀਂ ਹੁੰਦੀ। ਚੁੱਪ ਚਾਲ ਬਾਦਸ਼ਾਹ ਦਾ ਰਾਹ ਕੱਟ ਸਕਦੀ ਹੈ, ਅਜਿਹੀ ਧਮਕੀ ਬਣਾ ਸਕਦੀ ਹੈ ਜੋ ਰੋਕੀ ਨਹੀਂ ਜਾ ਸਕਦੀ, ਜਾਂ ਆਖ਼ਰੀ ਰਾਖੀ ਖੋਹ ਸਕਦੀ ਹੈ।" },
        board: { fen: "7k/8/5K2/8/8/8/8/1Q6 w - - 0 1", arrows: [["b1","b7"]], highlights: ["b7"] } },
    ],
    try: one("quiet", "Find the quiet winning move.", "ਜਿਤਾਉਣ ਵਾਲੀ ਚੁੱਪ ਚਾਲ ਲੱਭੋ।"),
    practise: [many("quiet", 4, "quiet moves.", "ਚੁੱਪ ਚਾਲਾਂ ਲੱਭੋ।")],
    challenge: many("quiet", 3, "three quiet killers.", "ਤਿੰਨ ਚੁੱਪ ਚਾਲਾਂ ਲੱਭੋ।"),
  },
];
