// Level 5 · 800-1000 · Endgames I. Ids/titles follow CURRICULUM.md. ALL TEXT DRAFT (#25, #33).
// Every "engineVs" position was chosen by probing it with Stockfish (2026-10-04) and is re-proved by the
// guard: the engine playing the learner's side must reach the goal within maxMoves (test/content.test.ts).
import type { Lesson } from "../lesson/types";

const square = (corner: string, side: number, up: boolean) => {
  const f0 = corner.charCodeAt(0) - 97, r0 = +corner[1] - 1, out: string[] = [];
  for (let f = f0; f <= f0 + side; f++) for (let k = 0; k <= side; k++) out.push(String.fromCharCode(97 + f) + (r0 + (up ? k : -k) + 1));
  return out;
};

export const LEVEL5: Lesson[] = [
  {
    id: "5.1", level: 5, status: "checked",
    title: { en: "Rule of the square", pa: "ਵਰਗ ਦਾ ਨਿਯਮ" },
    goal: { en: "See at a glance whether a king can catch a pawn.", pa: "ਇੱਕ ਨਜ਼ਰ ਵਿੱਚ ਵੇਖੋ ਕਿ ਬਾਦਸ਼ਾਹ ਪਿਆਦੇ ਨੂੰ ਫੜ ਸਕਦਾ ਹੈ ਜਾਂ ਨਹੀਂ।" },
    learn: [
      { text: { en: "Draw a square from the pawn to the end of the board. If the other king can step into that square, it catches the pawn.", pa: "ਪਿਆਦੇ ਤੋਂ ਬਿਸਾਤ ਦੇ ਸਿਰੇ ਤੱਕ ਇੱਕ ਵਰਗ ਬਣਾਓ। ਜੇ ਦੂਜਾ ਬਾਦਸ਼ਾਹ ਉਸ ਵਰਗ ਵਿੱਚ ਪੈਰ ਰੱਖ ਸਕੇ, ਤਾਂ ਉਹ ਪਿਆਦੇ ਨੂੰ ਫੜ ਲੈਂਦਾ ਹੈ।" },
        board: { fen: "8/8/8/5k2/P7/8/8/7K b - - 0 1", highlights: square("a4", 4, true) } },
      { text: { en: "Here Black is to move and steps into the square: the pawn is caught.", pa: "ਇੱਥੇ ਕਾਲੇ ਦੀ ਵਾਰੀ ਹੈ ਅਤੇ ਉਹ ਵਰਗ ਵਿੱਚ ਆ ਜਾਂਦਾ ਹੈ: ਪਿਆਦਾ ਫੜਿਆ ਗਿਆ।" },
        board: { play: true, fen: "8/8/8/5k2/P7/8/8/7K b - - 0 1", arrows: [["f5", "e5"]], highlights: square("a4", 4, true) } },
      { text: { en: "Count it before you run: it saves you thinking many moves ahead.", pa: "ਦੌੜਨ ਤੋਂ ਪਹਿਲਾਂ ਗਿਣੋ: ਇਸ ਨਾਲ ਕਈ ਚਾਲਾਂ ਅੱਗੇ ਸੋਚਣ ਦੀ ਲੋੜ ਨਹੀਂ ਪੈਂਦੀ।" },
        board: { fen: "8/8/8/7k/P7/8/8/7K b - - 0 1", highlights: ["a4","a5","a6","a7","a8","b4","b5","b6","b7","b8","c4","c5","c6","c7","c8","d4","d5","d6","d7","d8","e4","e5","e6","e7","e8"] } },
    ],
    try: { kind: "engineVs", fen: "8/8/8/8/p7/4K3/8/7k w - - 0 1", goal: "hold", maxMoves: 6,
      prompt: { en: "Black's pawn is running to a1. Catch it with your king.", pa: "ਕਾਲੇ ਦਾ ਪਿਆਦਾ a1 ਵੱਲ ਦੌੜ ਰਿਹਾ ਹੈ। ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਉਸ ਨੂੰ ਫੜੋ।" },
      hint: { en: "Step into the pawn's square straight away.", pa: "ਤੁਰੰਤ ਪਿਆਦੇ ਦੇ ਵਰਗ ਵਿੱਚ ਪੈਰ ਰੱਖੋ।" } },
    practise: [
      { kind: "choose", board: { fen: "8/8/8/P7/8/5k2/8/7K w - - 0 1" },
        prompt: { en: "White to move. Can Black's king catch the pawn?", pa: "ਚਿੱਟੇ ਦੀ ਵਾਰੀ। ਕੀ ਕਾਲਾ ਬਾਦਸ਼ਾਹ ਪਿਆਦੇ ਨੂੰ ਫੜ ਸਕਦਾ ਹੈ?" },
        options: [
          { text: { en: "Yes", pa: "ਹਾਂ" }, why: { en: "After a6 the square is a6 to c8. The king on f3 can't step into it.", pa: "a6 ਤੋਂ ਬਾਅਦ ਵਰਗ a6 ਤੋਂ c8 ਹੈ। f3 ਵਾਲਾ ਬਾਦਸ਼ਾਹ ਉਸ ਵਿੱਚ ਨਹੀਂ ਆ ਸਕਦਾ।" } },
          { text: { en: "No, the pawn queens", pa: "ਨਹੀਂ, ਪਿਆਦਾ ਰਾਣੀ ਬਣ ਜਾਂਦਾ ਹੈ" }, correct: true, why: { en: "Right: the king is outside the square.", pa: "ਠੀਕ: ਬਾਦਸ਼ਾਹ ਵਰਗ ਤੋਂ ਬਾਹਰ ਹੈ।" } },
        ] },
      { kind: "engineVs", fen: "8/8/8/8/1p6/8/5K2/7k w - - 0 1", goal: "hold", maxMoves: 6,
        prompt: { en: "Catch the b-pawn before it queens.", pa: "b ਵਾਲੇ ਪਿਆਦੇ ਨੂੰ ਰਾਣੀ ਬਣਨ ਤੋਂ ਪਹਿਲਾਂ ਫੜੋ।" } },
    ],
    challenge: { kind: "pack", pack: "passed-pawn", count: 3, prompt: { en: "Real games: race the pawns.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਪਿਆਦਿਆਂ ਦੀ ਦੌੜ ਜਿੱਤੋ।" } },
  },

  {
    id: "5.2", level: 5, status: "checked",
    title: { en: "King activity", pa: "ਸਰਗਰਮ ਬਾਦਸ਼ਾਹ" },
    goal: { en: "Use your king as a fighting piece in the endgame.", pa: "ਅੰਤਲੀ ਖੇਡ ਵਿੱਚ ਬਾਦਸ਼ਾਹ ਨੂੰ ਲੜਨ ਵਾਲੇ ਮੋਹਰੇ ਵਜੋਂ ਵਰਤੋ।" },
    learn: [
      { text: { en: "In the opening the king hides. In the endgame, with fewer pieces about, it becomes a strong fighter. Bring it forward!", pa: "ਸ਼ੁਰੂਆਤ ਵਿੱਚ ਬਾਦਸ਼ਾਹ ਲੁਕਦਾ ਹੈ। ਅੰਤਲੀ ਖੇਡ ਵਿੱਚ, ਜਦੋਂ ਮੋਹਰੇ ਘੱਟ ਹੋਣ, ਉਹ ਤਕੜਾ ਲੜਾਕਾ ਬਣ ਜਾਂਦਾ ਹੈ। ਉਸ ਨੂੰ ਅੱਗੇ ਲਿਆਓ!" },
        board: { play: true, fen: "8/8/3k4/8/8/3K4/3P4/8 w - - 0 1", arrows: [["d3", "d4"]] } },
      { text: { en: "Walk your king in front of your pawn, not behind it. The king clears the road; the pawn follows.", pa: "ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਲੈ ਜਾਓ, ਪਿੱਛੇ ਨਹੀਂ। ਬਾਦਸ਼ਾਹ ਰਾਹ ਸਾਫ਼ ਕਰਦਾ ਹੈ; ਪਿਆਦਾ ਪਿੱਛੇ ਆਉਂਦਾ ਹੈ।" },
        board: { fen: "8/3k4/8/8/3K4/3P4/8/8 w - - 0 1", arrows: [["d4","d5"]], highlights: ["d4"] } },
    ],
    try: { kind: "engineVs", fen: "3k4/8/3K4/3P4/8/8/8/8 w - - 0 1", goal: "promote", maxMoves: 8,
      prompt: { en: "Your king is already in front. Win: promote the pawn.", pa: "ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਪਹਿਲਾਂ ਹੀ ਅੱਗੇ ਹੈ। ਜਿੱਤੋ: ਪਿਆਦੇ ਨੂੰ ਤਰੱਕੀ ਦਿਓ।" },
      hint: { en: "Step to the side of the black king and walk round it.", pa: "ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਦੇ ਪਾਸੇ ਜਾਓ ਅਤੇ ਉਸ ਦੇ ਦੁਆਲੇ ਘੁੰਮੋ।" } },
    practise: [
      { kind: "engineVs", fen: "8/8/3k4/8/8/3K4/3P4/8 w - - 0 1", goal: "promote", maxMoves: 14,
        prompt: { en: "King first! Lead your pawn up the board and promote it.", pa: "ਪਹਿਲਾਂ ਬਾਦਸ਼ਾਹ! ਬਾਦਸ਼ਾਹ ਨਾਲ ਪਿਆਦੇ ਨੂੰ ਅੱਗੇ ਲੈ ਜਾਓ ਅਤੇ ਤਰੱਕੀ ਦਿਓ।" } },
      { kind: "pack", pack: "pawn-endgame", count: 3, prompt: { en: "Real games: pawn endings.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਪਿਆਦਿਆਂ ਦੀ ਅੰਤਲੀ ਖੇਡ।" } },
    ],
    challenge: { kind: "pack", pack: "pawn-endgame", count: 3, prompt: { en: "Three real endings.", pa: "ਤਿੰਨ ਅਸਲੀ ਅੰਤਲੀਆਂ ਖੇਡਾਂ।" } },
  },

  {
    id: "5.3", level: 5, status: "checked",
    title: { en: "Opposition", pa: "ਆਹਮੋ-ਸਾਹਮਣਾ" },
    goal: { en: "Make the other king give way.", pa: "ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਰਾਹ ਛੱਡਣ ਲਈ ਮਜਬੂਰ ਕਰੋ।" },
    learn: [
      { text: { en: "When the two kings face each other with one square between them, the side that must move has to give way.", pa: "ਜਦੋਂ ਦੋਵੇਂ ਬਾਦਸ਼ਾਹ ਇੱਕ ਖਾਨਾ ਛੱਡ ਕੇ ਆਹਮੋ-ਸਾਹਮਣੇ ਹੋਣ, ਤਾਂ ਜਿਸ ਦੀ ਵਾਰੀ ਹੈ ਉਸ ਨੂੰ ਰਾਹ ਛੱਡਣਾ ਪੈਂਦਾ ਹੈ।" },
        board: { fen: "8/8/4k3/8/4K3/8/8/8 w - - 0 1", highlights: ["e5"] } },
      { text: { en: "\"Having the opposition\" means it is the OTHER side's turn in that face-off. That is often the whole game.", pa: "\"ਆਹਮੋ-ਸਾਹਮਣਾ ਤੁਹਾਡੇ ਕੋਲ ਹੈ\" ਦਾ ਮਤਲਬ ਹੈ ਕਿ ਉਸ ਆਹਮੋ-ਸਾਹਮਣੇ ਵਿੱਚ ਵਾਰੀ ਦੂਜੇ ਪਾਸੇ ਦੀ ਹੈ। ਅਕਸਰ ਸਾਰੀ ਖੇਡ ਇਸੇ ਉੱਤੇ ਟਿਕੀ ਹੁੰਦੀ ਹੈ।" },
        board: { fen: "8/8/4k3/8/4K3/8/8/8 b - - 0 1", crosses: ["d5","e5","f5"], highlights: ["e4"] } },
    ],
    try: { kind: "choose", board: { fen: "8/8/4k3/8/4K3/8/8/8 w - - 0 1" },
      prompt: { en: "White to move. Who has the opposition?", pa: "ਚਿੱਟੇ ਦੀ ਵਾਰੀ। ਆਹਮੋ-ਸਾਹਮਣਾ ਕਿਸ ਕੋਲ ਹੈ?" },
      options: [
        { text: { en: "White", pa: "ਚਿੱਟਾ" }, why: { en: "White must move, so White has to give way.", pa: "ਚਿੱਟੇ ਨੂੰ ਚੱਲਣਾ ਪਵੇਗਾ, ਇਸ ਲਈ ਚਿੱਟੇ ਨੂੰ ਰਾਹ ਛੱਡਣਾ ਪਵੇਗਾ।" } },
        { text: { en: "Black", pa: "ਕਾਲਾ" }, correct: true, why: { en: "Right: it's White's turn, so Black has the opposition.", pa: "ਠੀਕ: ਵਾਰੀ ਚਿੱਟੇ ਦੀ ਹੈ, ਇਸ ਲਈ ਆਹਮੋ-ਸਾਹਮਣਾ ਕਾਲੇ ਕੋਲ ਹੈ।" } },
      ] },
    practise: [
      { kind: "engineVs", fen: "4k3/8/3K4/4P3/8/8/8/8 w - - 0 1", goal: "promote", maxMoves: 10,
        prompt: { en: "Only ONE move wins here. Take the opposition, then promote.", pa: "ਇੱਥੇ ਸਿਰਫ਼ ਇੱਕ ਚਾਲ ਜਿਤਾਉਂਦੀ ਹੈ। ਆਹਮੋ-ਸਾਹਮਣਾ ਲਓ, ਫਿਰ ਤਰੱਕੀ ਦਿਓ।" },
        hint: { en: "Face the black king with one square between you, so it has to give way.", pa: "ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਦੇ ਆਹਮੋ-ਸਾਹਮਣੇ ਆਓ, ਵਿਚਕਾਰ ਇੱਕ ਖਾਨਾ ਛੱਡ ਕੇ, ਤਾਂ ਜੋ ਉਸ ਨੂੰ ਰਾਹ ਛੱਡਣਾ ਪਵੇ।" } },
    ],
    challenge: { kind: "pack", pack: "pawn-endgame", count: 3, prompt: { en: "Real games: win the king race.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਬਾਦਸ਼ਾਹਾਂ ਦੀ ਦੌੜ ਜਿੱਤੋ।" } },
  },

  {
    id: "5.4", level: 5, status: "checked",
    title: { en: "King + pawn vs king", pa: "ਬਾਦਸ਼ਾਹ-ਪਿਆਦਾ ਬਨਾਮ ਬਾਦਸ਼ਾਹ" },
    goal: { en: "Win with king and pawn by reaching a key square.", pa: "ਮੁੱਖ ਖਾਨੇ 'ਤੇ ਪਹੁੰਚ ਕੇ ਬਾਦਸ਼ਾਹ ਅਤੇ ਪਿਆਦੇ ਨਾਲ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "A pawn on its 2nd, 3rd or 4th row has key squares two rows in front of it, and the squares either side. Get your king there, and the pawn will queen.", pa: "ਦੂਜੀ, ਤੀਜੀ ਜਾਂ ਚੌਥੀ ਕਤਾਰ ਵਾਲੇ ਪਿਆਦੇ ਦੇ ਮੁੱਖ ਖਾਨੇ ਉਸ ਤੋਂ ਦੋ ਕਤਾਰਾਂ ਅੱਗੇ ਹੁੰਦੇ ਹਨ, ਅਤੇ ਦੋਵੇਂ ਪਾਸੇ ਵਾਲੇ ਖਾਨੇ। ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਉੱਥੇ ਲੈ ਜਾਓ, ਤਾਂ ਪਿਆਦਾ ਰਾਣੀ ਬਣੇਗਾ।" },
        board: { pieces: { d2: "wP" }, highlights: ["c4", "d4", "e4"] } },
      { text: { en: "Don't push the pawn too early. The king goes first; the pawn moves when the king has made room.", pa: "ਪਿਆਦੇ ਨੂੰ ਵੇਲੇ ਤੋਂ ਪਹਿਲਾਂ ਨਾ ਧੱਕੋ। ਪਹਿਲਾਂ ਬਾਦਸ਼ਾਹ; ਪਿਆਦਾ ਉਦੋਂ ਚੱਲਦਾ ਹੈ ਜਦੋਂ ਬਾਦਸ਼ਾਹ ਥਾਂ ਬਣਾ ਦੇਵੇ।" },
        board: { fen: "8/3k4/8/8/8/3K4/3P4/8 w - - 0 1", arrows: [["d3","e4"]], highlights: ["c4","d4","e4"] } },
    ],
    try: { kind: "engineVs", fen: "8/8/3k4/8/8/3K4/3P4/8 w - - 0 1", goal: "promote", maxMoves: 14,
      prompt: { en: "Reach a key square with your king, then promote.", pa: "ਬਾਦਸ਼ਾਹ ਨੂੰ ਮੁੱਖ ਖਾਨੇ 'ਤੇ ਲੈ ਜਾਓ, ਫਿਰ ਤਰੱਕੀ ਦਿਓ।" } },
    practise: [
      { kind: "pack", pack: "pawn-endgame", count: 3, prompt: { en: "Real games: king and pawn.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਬਾਦਸ਼ਾਹ ਅਤੇ ਪਿਆਦਾ।" } },
    ],
    challenge: { kind: "engineVs", fen: "8/8/8/8/2k5/8/3PK3/8 w - - 0 1", goal: "promote", maxMoves: 14,
      prompt: { en: "Only ONE first move wins. Find it, then promote.", pa: "ਸਿਰਫ਼ ਇੱਕ ਪਹਿਲੀ ਚਾਲ ਜਿਤਾਉਂਦੀ ਹੈ। ਉਸ ਨੂੰ ਲੱਭੋ, ਫਿਰ ਤਰੱਕੀ ਦਿਓ।" },
      hint: { en: "King first, towards the key squares in front of the pawn.", pa: "ਪਹਿਲਾਂ ਬਾਦਸ਼ਾਹ, ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਵਾਲੇ ਮੁੱਖ ਖਾਨਿਆਂ ਵੱਲ।" } },
  },

  {
    id: "5.5", level: 5, status: "checked",
    title: { en: "The rook pawn", pa: "ਕੰਢੇ ਦਾ ਪਿਆਦਾ" },
    goal: { en: "Know why an a- or h-pawn is often only a draw.", pa: "ਜਾਣੋ ਕਿ a ਜਾਂ h ਵਾਲਾ ਪਿਆਦਾ ਅਕਸਰ ਸਿਰਫ਼ ਬਰਾਬਰੀ ਕਿਉਂ ਹੁੰਦਾ ਹੈ।" },
    learn: [
      { text: { en: "An a-pawn or h-pawn is special: if the defending king reaches the corner in front of it, nothing can drive it out. It's a draw.", pa: "a ਜਾਂ h ਵਾਲਾ ਪਿਆਦਾ ਖ਼ਾਸ ਹੈ: ਜੇ ਬਚਾਉਣ ਵਾਲਾ ਬਾਦਸ਼ਾਹ ਉਸ ਦੇ ਅੱਗੇ ਵਾਲੇ ਕੋਨੇ ਵਿੱਚ ਪਹੁੰਚ ਜਾਵੇ, ਤਾਂ ਉਸ ਬਾਦਸ਼ਾਹ ਨੂੰ ਉੱਥੋਂ ਕੱਢਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ। ਬਰਾਬਰੀ ਹੈ।" },
        board: { fen: "k7/8/8/8/P7/8/1K6/8 b - - 0 1", highlights: ["a8"] } },
      { text: { en: "So when defending, run for the corner. When attacking, keep the defending king out of it.", pa: "ਇਸ ਲਈ ਬਚਾਅ ਵੇਲੇ ਕੋਨੇ ਵੱਲ ਭੱਜੋ। ਹਮਲੇ ਵੇਲੇ ਦੂਜੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੋਨੇ ਤੋਂ ਬਾਹਰ ਰੱਖੋ।" },
        board: { fen: "2k5/8/8/8/P7/8/1K6/8 b - - 0 1", arrows: [["c8","b8"]], highlights: ["a8"] } },
    ],
    try: { kind: "choose", board: { fen: "k7/8/8/8/P7/8/1K6/8 w - - 0 1" },
      prompt: { en: "White has an extra pawn. Can White win?", pa: "ਚਿੱਟੇ ਕੋਲ ਇੱਕ ਵਾਧੂ ਪਿਆਦਾ ਹੈ। ਕੀ ਚਿੱਟਾ ਜਿੱਤ ਸਕਦਾ ਹੈ?" },
      options: [
        { text: { en: "Yes", pa: "ਹਾਂ" }, why: { en: "The black king sits in the corner in front of the a-pawn: it can't be driven out.", pa: "ਕਾਲਾ ਬਾਦਸ਼ਾਹ a ਵਾਲੇ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਕੋਨੇ ਵਿੱਚ ਹੈ: ਉਸ ਨੂੰ ਕੱਢਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ।" } },
        { text: { en: "No, it's a draw", pa: "ਨਹੀਂ, ਬਰਾਬਰੀ ਹੈ" }, correct: true, why: { en: "Right: king in the corner, rook pawn, draw.", pa: "ਠੀਕ: ਕੋਨੇ ਵਿੱਚ ਬਾਦਸ਼ਾਹ, ਕੰਢੇ ਦਾ ਪਿਆਦਾ, ਬਰਾਬਰੀ।" } },
      ] },
    practise: [
      { kind: "engineVs", fen: "k7/8/8/8/P7/8/1K6/8 b - - 0 1", goal: "hold", maxMoves: 8,
        prompt: { en: "You are Black, a pawn down. Stay in your corner and hold the draw.", pa: "ਤੁਸੀਂ ਕਾਲੇ ਹੋ, ਇੱਕ ਪਿਆਦਾ ਘੱਟ। ਆਪਣੇ ਕੋਨੇ ਵਿੱਚ ਰਹੋ ਅਤੇ ਬਰਾਬਰੀ ਬਚਾਓ।" } },
    ],
    challenge: { kind: "pack", pack: "pawn-endgame", count: 3, prompt: { en: "Real games: pawn endings.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਪਿਆਦਿਆਂ ਦੀ ਅੰਤਲੀ ਖੇਡ।" } },
  },

  {
    id: "5.6", level: 5, status: "checked",
    title: { en: "Passed pawns", pa: "ਆਜ਼ਾਦ ਪਿਆਦਾ" },
    goal: { en: "Make a passed pawn, push it, and stop theirs.", pa: "ਆਜ਼ਾਦ ਪਿਆਦਾ ਬਣਾਓ, ਅੱਗੇ ਵਧਾਓ, ਅਤੇ ਵਿਰੋਧੀ ਦੇ ਆਜ਼ਾਦ ਪਿਆਦੇ ਨੂੰ ਰੋਕੋ।" },
    learn: [
      { text: { en: "A passed pawn has no enemy pawn in front of it or on the files beside it. Nothing but pieces can stop it.", pa: "ਆਜ਼ਾਦ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਜਾਂ ਨਾਲ ਦੀਆਂ ਖੜ੍ਹੀਆਂ ਕਤਾਰਾਂ ਵਿੱਚ ਦੁਸ਼ਮਣ ਦਾ ਕੋਈ ਪਿਆਦਾ ਨਹੀਂ ਹੁੰਦਾ। ਉਸ ਨੂੰ ਸਿਰਫ਼ ਮੋਹਰੇ ਹੀ ਰੋਕ ਸਕਦੇ ਹਨ।" },
        board: { pieces: { g7: "bP", d5: "wP" }, highlights: ["d5"], arrows: [["d5", "d8"]] } },
      { text: { en: "Passed pawns must be pushed: the further it goes, the more the other side must worry.", pa: "ਆਜ਼ਾਦ ਪਿਆਦੇ ਨੂੰ ਅੱਗੇ ਧੱਕਣਾ ਹੀ ਚਾਹੀਦਾ ਹੈ: ਜਿੰਨਾ ਅੱਗੇ ਜਾਵੇ, ਦੂਜੇ ਪਾਸੇ ਨੂੰ ਓਨਾ ਹੀ ਵੱਧ ਫ਼ਿਕਰ ਕਰਨਾ ਪੈਂਦਾ ਹੈ।" },
        board: { fen: "6k1/6p1/8/3P4/8/8/8/6K1 w - - 0 1", arrows: [["d5","d6"]], highlights: ["d5"] } },
    ],
    try: { kind: "pack", pack: "passed-pawn", count: 1, prompt: { en: "Use your passed pawn.", pa: "ਆਪਣਾ ਆਜ਼ਾਦ ਪਿਆਦਾ ਵਰਤੋ।" } },
    practise: [
      { kind: "pack", pack: "passed-pawn", count: 4, prompt: { en: "Real games: push the passed pawn.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਆਜ਼ਾਦ ਪਿਆਦਾ ਧੱਕੋ।" } },
    ],
    challenge: { kind: "pack", pack: "passed-pawn", count: 4, prompt: { en: "Four real games.", pa: "ਚਾਰ ਅਸਲੀ ਖੇਡਾਂ।" } },
  },

  {
    id: "5.7", level: 5, status: "checked",
    title: { en: "Breakthrough", pa: "ਲਾਂਘਾ" },
    goal: { en: "Give up a pawn to make a passed pawn.", pa: "ਆਜ਼ਾਦ ਪਿਆਦਾ ਬਣਾਉਣ ਲਈ ਇੱਕ ਪਿਆਦਾ ਦਿਓ।" },
    learn: [
      { text: { en: "Three pawns against three, face to face. With the enemy king far away, one pawn push breaks through: b6!", pa: "ਤਿੰਨ ਪਿਆਦੇ ਬਨਾਮ ਤਿੰਨ, ਇੱਕ ਦੂਜੇ ਦੇ ਸਾਹਮਣੇ। ਜਦੋਂ ਦੁਸ਼ਮਣ ਦਾ ਬਾਦਸ਼ਾਹ ਦੂਰ ਹੋਵੇ, ਤਾਂ ਇੱਕ ਪਿਆਦੇ ਦੀ ਚਾਲ ਲਾਂਘਾ ਬਣਾ ਦਿੰਦੀ ਹੈ: b6!" },
        board: { play: true, fen: "8/ppp4k/8/PPP5/8/8/8/K7 w - - 0 1", arrows: [["b5", "b6"]] } },
      { text: { en: "Whatever Black takes, another white pawn gets through. Count it out on the board.", pa: "ਕਾਲਾ ਜੋ ਵੀ ਮਾਰੇ, ਚਿੱਟੇ ਦਾ ਕੋਈ ਹੋਰ ਪਿਆਦਾ ਲੰਘ ਜਾਂਦਾ ਹੈ। ਬਿਸਾਤ 'ਤੇ ਗਿਣ ਕੇ ਵੇਖੋ।" },
        board: { fen: "8/ppp4k/1P6/P1P5/8/8/8/K7 b - - 0 1", arrows: [["a7","b6"],["c7","b6"]], highlights: ["a5","c5"] } },
    ],
    try: { kind: "engineVs", fen: "8/ppp4k/8/PPP5/8/8/8/K7 w - - 0 1", goal: "promote", maxMoves: 8,
      prompt: { en: "Break through and promote a pawn.", pa: "ਲਾਂਘਾ ਬਣਾਓ ਅਤੇ ਇੱਕ ਪਿਆਦੇ ਨੂੰ ਤਰੱਕੀ ਦਿਓ।" },
      hint: { en: "The middle pawn goes first.", pa: "ਵਿਚਕਾਰਲਾ ਪਿਆਦਾ ਪਹਿਲਾਂ ਜਾਂਦਾ ਹੈ।" } },
    practise: [
      { kind: "pack", pack: "pawn-endgame", count: 3, prompt: { en: "Real games: pawn endings.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਪਿਆਦਿਆਂ ਦੀ ਅੰਤਲੀ ਖੇਡ।" } },
    ],
    challenge: { kind: "pack", pack: "passed-pawn", count: 3, prompt: { en: "Three real games.", pa: "ਤਿੰਨ ਅਸਲੀ ਖੇਡਾਂ।" } },
  },

  {
    id: "5.8", level: 5, status: "checked",
    title: { en: "Queen vs pawn", pa: "ਰਾਣੀ ਬਨਾਮ ਪਿਆਦਾ" },
    goal: { en: "Stop a pawn on the 7th with your queen, and win it.", pa: "ਸੱਤਵੀਂ ਕਤਾਰ ਵਾਲੇ ਪਿਆਦੇ ਨੂੰ ਰਾਣੀ ਨਾਲ ਰੋਕੋ, ਅਤੇ ਉਸ ਨੂੰ ਮਾਰ ਲਓ।" },
    learn: [
      { text: { en: "A queen beats a pawn about to promote: check, check, and force the king to stand in front of its own pawn.", pa: "ਰਾਣੀ ਤਰੱਕੀ ਦੇ ਨੇੜੇ ਪਹੁੰਚੇ ਪਿਆਦੇ ਨੂੰ ਹਰਾ ਦਿੰਦੀ ਹੈ: ਸ਼ਹਿ, ਸ਼ਹਿ, ਅਤੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਆਪਣੇ ਹੀ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਖੜ੍ਹਨ ਲਈ ਮਜਬੂਰ ਕਰੋ।" },
        board: { play: true, fen: "8/8/8/Q7/8/8/4p3/2k3K1 w - - 0 1", arrows: [["a5", "e1"]] } },
      { text: { en: "Each time the king blocks its pawn, you gain a move to bring your own king closer. Then take the pawn.", pa: "ਹਰ ਵਾਰ ਜਦੋਂ ਬਾਦਸ਼ਾਹ ਆਪਣੇ ਪਿਆਦੇ ਨੂੰ ਰੋਕਦਾ ਹੈ, ਤੁਹਾਨੂੰ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਲਿਆਉਣ ਲਈ ਇੱਕ ਚਾਲ ਮਿਲਦੀ ਹੈ। ਫਿਰ ਪਿਆਦਾ ਮਾਰ ਲਓ।" },
        board: { fen: "8/1K6/8/8/8/3Q4/4p3/4k3 w - - 0 1", arrows: [["b7","c6"]], highlights: ["e1"] } },
    ],
    try: { kind: "engineVs", fen: "8/8/8/Q7/8/8/4p3/2k3K1 w - - 0 1", goal: "wipe", maxMoves: 14,
      prompt: { en: "Stop the pawn and win it: leave Black with only a king.", pa: "ਪਿਆਦੇ ਨੂੰ ਰੋਕੋ ਅਤੇ ਮਾਰ ਲਓ: ਕਾਲੇ ਕੋਲ ਸਿਰਫ਼ ਬਾਦਸ਼ਾਹ ਛੱਡੋ।" } },
    practise: [
      { kind: "engineVs", fen: "8/8/8/8/8/8/3pk3/Q5K1 w - - 0 1", goal: "wipe", maxMoves: 16,
        prompt: { en: "Again: check until the king has to block its own pawn, bring your king, take the pawn.", pa: "ਦੁਬਾਰਾ: ਸ਼ਹਿ ਦਿਓ ਜਦੋਂ ਤੱਕ ਬਾਦਸ਼ਾਹ ਨੂੰ ਆਪਣੇ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਨਾ ਆਉਣਾ ਪਵੇ, ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਲਿਆਓ, ਪਿਆਦਾ ਮਾਰੋ।" } },
      { kind: "pack", pack: "queen-endgame", count: 3, prompt: { en: "Real games: queen endings.", pa: "ਅਸਲੀ ਖੇਡਾਂ: ਰਾਣੀ ਦੀ ਅੰਤਲੀ ਖੇਡ।" } },
    ],
    challenge: { kind: "pack", pack: "queen-endgame", count: 3, prompt: { en: "Three real queen endings.", pa: "ਤਿੰਨ ਅਸਲੀ ਰਾਣੀ ਵਾਲੀਆਂ ਅੰਤਲੀਆਂ ਖੇਡਾਂ।" } },
  },
];
