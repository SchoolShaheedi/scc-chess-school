// The openings course (DECISIONS #127): each opening taught in five steps — Learn, Practise, Model win, Full game
// to mate, Review. Every line is legal and every move of the side being taught is within Stockfish's tolerance; the
// full games were played out by Stockfish from the end of the main line (the winner at full strength, the loser
// weaker), so no move is invented. test/course.test.ts re-checks all of it; `COURSE_BUILD=1` rebuilds the
// "also good" squares in course-boxes.json. Punjabi by the translator 2026-10-29. ALL TEXT DRAFT until the user's check.
import type { Square } from "../chess/types";
import type { Text } from "../lesson/types";

export type Group = "start" | "white" | "e4" | "d4";
/** A line of moves with a note for some plies (0 = White's first move). A note on the learner's own move is shown
 *  before it is played (the "why"); a note on the other side's move is shown after it lands. `aim` puts the gold
 *  star from that ply on, until the next entry. `ends` says what a model line finishes with. */
export interface CourseLine { title?: Text; moves: string[]; notes: Record<number, Text>; aim?: Record<number, Square[]>; ends?: "mate" | "gain" }
export interface CourseOpening {
  id: string; group: Group; side: "w" | "b"; name: Text; about: Text; plan: Text;
  /** The repertoire option in the review drill (src/content/repertoire.ts), when there is one. */
  rep?: string;
  main: CourseLine; win: CourseLine; game: CourseLine;
}

export const GROUPS: { group: Group; title: Text }[] = [
  { group: "start", title: { en: "Start here", pa: "ਇੱਥੋਂ ਸ਼ੁਰੂ ਕਰੋ" } },
  { group: "white", title: { en: "With White", pa: "ਚਿੱਟੇ ਨਾਲ" } },
  { group: "e4", title: { en: "Against 1.e4", pa: "1.e4 ਵਿਰੁੱਧ" } },
  { group: "d4", title: { en: "Against 1.d4", pa: "1.d4 ਵਿਰੁੱਧ" } },
];

const ITALIAN_MAIN = "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Re8 Nf1 Be6 Ng3".split(" ");

export const COURSE: CourseOpening[] = [
  { id: "italian", group: "white", side: "w", rep: "italian",
    name: { en: "Italian Game", pa: "ਇਤਾਲਵੀ ਖੇਡ" },
    about: { en: "1.e4 e5 2.Nf3 Nc6 3.Bc4: quick development, an early castle and a bishop aimed at f7.", pa: "1.e4 e5 2.Nf3 Nc6 3.Bc4: ਮੋਹਰਿਆਂ ਦਾ ਤੇਜ਼ੀ ਨਾਲ ਬਾਹਰ ਆਉਣਾ, ਛੇਤੀ ਕਿਲ੍ਹੇਬੰਦੀ, ਅਤੇ f7 ਵੱਲ ਤਾਣਿਆ ਹੋਇਆ ਊਠ।" },
    plan: { en: "Build slowly: c3 and d3, castle, Re1 and h3, then bring the last knight round by d2, f1 and g3. When everything is ready, push d4 in the centre, or attack the king with the knight on f5 or h5, the queen and the bishop on h6.", pa: "ਹੌਲੀ-ਹੌਲੀ ਤਿਆਰੀ ਕਰੋ: c3 ਅਤੇ d3, ਕਿਲ੍ਹੇਬੰਦੀ, Re1 ਅਤੇ h3, ਫਿਰ ਆਖ਼ਰੀ ਘੋੜੇ ਨੂੰ d2, f1 ਅਤੇ g3 ਰਾਹੀਂ ਲਿਆਓ। ਜਦੋਂ ਸਭ ਕੁਝ ਤਿਆਰ ਹੋ ਜਾਵੇ, ਤਾਂ ਕੇਂਦਰ ਵਿੱਚ d4 ਚੱਲੋ, ਜਾਂ f5 ਜਾਂ h5 ਵਾਲੇ ਘੋੜੇ, ਰਾਣੀ ਅਤੇ h6 ਵਾਲੇ ਊਠ ਨਾਲ ਬਾਦਸ਼ਾਹ ਉੱਤੇ ਹਮਲਾ ਕਰੋ।" },
    main: {
      moves: ITALIAN_MAIN,
      notes: {
        0: { en: "Take the centre. This pawn also opens lines for your queen and bishop.", pa: "ਕੇਂਦਰ ਉੱਤੇ ਕਬਜ਼ਾ ਕਰੋ। ਇਹ ਪਿਆਦਾ ਤੁਹਾਡੀ ਰਾਣੀ ਅਤੇ ਊਠ ਲਈ ਰਾਹ ਵੀ ਖੋਲ੍ਹਦਾ ਹੈ।" },
        1: { en: "Black takes the centre too.", pa: "ਕਾਲਾ ਵੀ ਕੇਂਦਰ ਉੱਤੇ ਕਬਜ਼ਾ ਕਰਦਾ ਹੈ।" },
        2: { en: "Bring out a knight, and attack the e5 pawn.", pa: "ਇੱਕ ਘੋੜਾ ਬਾਹਰ ਕੱਢੋ, ਅਤੇ e5 ਵਾਲੇ ਪਿਆਦੇ ਉੱਤੇ ਹਮਲਾ ਕਰੋ।" },
        3: { en: "Black guards e5 with a knight.", pa: "ਕਾਲਾ ਇੱਕ ਘੋੜੇ ਨਾਲ e5 ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" },
        4: { en: "The bishop aims at f7: the weakest square near Black's king, guarded only by the king.", pa: "ਊਠ f7 ਵੱਲ ਤਾਣਿਆ ਹੈ: ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਦੇ ਨੇੜੇ ਸਭ ਤੋਂ ਕਮਜ਼ੋਰ ਖ਼ਾਨਾ, ਜਿਸ ਦੀ ਰਾਖੀ ਸਿਰਫ਼ ਬਾਦਸ਼ਾਹ ਕਰਦਾ ਹੈ।" },
        5: { en: "Black's bishop copies yours and aims at f2.", pa: "ਕਾਲੇ ਦਾ ਊਠ ਤੁਹਾਡੇ ਵਾਂਗ ਹੀ ਚੱਲਦਾ ਹੈ ਅਤੇ f2 ਵੱਲ ਤਾਣਿਆ ਹੈ।" },
        6: { en: "Get ready to push d4 later, and take the d4 and b4 squares away from Black's pieces.", pa: "ਬਾਅਦ ਵਿੱਚ d4 ਚੱਲਣ ਦੀ ਤਿਆਰੀ ਕਰੋ, ਅਤੇ ਕਾਲੇ ਮੋਹਰਿਆਂ ਤੋਂ d4 ਅਤੇ b4 ਖ਼ਾਨੇ ਖੋਹ ਲਓ।" },
        7: { en: "Black's knight attacks your e4 pawn: see the red box.", pa: "ਕਾਲੇ ਦਾ ਘੋੜਾ ਤੁਹਾਡੇ e4 ਵਾਲੇ ਪਿਆਦੇ ਉੱਤੇ ਹਮਲਾ ਕਰਦਾ ਹੈ: ਲਾਲ ਡੱਬਾ ਵੇਖੋ।" },
        8: { en: "Guard e4 calmly. This quiet way is called the Giuoco Pianissimo, the 'very quiet game'.", pa: "e4 ਦੀ ਸ਼ਾਂਤੀ ਨਾਲ ਰਾਖੀ ਕਰੋ। ਇਸ ਸ਼ਾਂਤ ਢੰਗ ਨੂੰ Giuoco Pianissimo ਕਿਹਾ ਜਾਂਦਾ ਹੈ, ਯਾਨੀ 'ਬਹੁਤ ਸ਼ਾਂਤ ਖੇਡ'।" },
        10: { en: "Castle: your king is safe and a rook comes towards the centre.", pa: "ਕਿਲ੍ਹੇਬੰਦੀ ਕਰੋ: ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਸੁਰੱਖਿਅਤ ਹੋ ਜਾਂਦਾ ਹੈ ਅਤੇ ਇੱਕ ਹਾਥੀ ਕੇਂਦਰ ਵੱਲ ਆ ਜਾਂਦਾ ਹੈ।" },
        12: { en: "The rook backs up e4 and gets ready for d4 later.", pa: "ਹਾਥੀ e4 ਨੂੰ ਸਹਾਰਾ ਦਿੰਦਾ ਹੈ ਅਤੇ ਬਾਅਦ ਵਿੱਚ d4 ਲਈ ਤਿਆਰ ਹੁੰਦਾ ਹੈ।" },
        13: { en: "Black makes a hole for the bishop to step back into.", pa: "ਕਾਲਾ ਆਪਣੇ ਊਠ ਦੇ ਪਿੱਛੇ ਹਟਣ ਲਈ ਥਾਂ ਬਣਾਉਂਦਾ ਹੈ।" },
        14: { en: "Step the bishop back before Black chases it with ...b5 or ...Na5. It still aims at f7.", pa: "ਕਾਲੇ ਦੇ ...b5 ਜਾਂ ...Na5 ਨਾਲ ਊਠ ਨੂੰ ਭਜਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਹੀ ਊਠ ਪਿੱਛੇ ਹਟਾ ਲਓ। ਉਹ ਹੁਣ ਵੀ f7 ਵੱਲ ਤਾਣਿਆ ਹੈ।" },
        16: { en: "Stop ...Bg4 pinning your knight, and give your king a little air.", pa: "...Bg4 ਨੂੰ ਰੋਕੋ, ਜੋ ਤੁਹਾਡੇ ਘੋੜੇ ਨੂੰ ਪਿੰਨ ਕਰਦਾ ਹੈ, ਅਤੇ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਥੋੜ੍ਹੀ ਖੁੱਲ੍ਹੀ ਥਾਂ ਦਿਓ।" },
        18: { en: "The last minor piece comes out. It is going to f1 and then g3.", pa: "ਆਖ਼ਰੀ ਛੋਟਾ ਮੋਹਰਾ ਬਾਹਰ ਆਉਂਦਾ ਹੈ। ਇਹ f1 ਅਤੇ ਫਿਰ g3 ਵੱਲ ਜਾਵੇਗਾ।" },
        20: { en: "The knight's famous route: d2, f1, then g3 or e3.", pa: "ਘੋੜੇ ਦਾ ਮਸ਼ਹੂਰ ਰਾਹ: d2, f1, ਫਿਰ g3 ਜਾਂ e3।" },
        22: { en: "From g3 the knight eyes f5 and h5, close to Black's king. Your opening is complete: now push d4, or attack on the kingside.", pa: "g3 ਤੋਂ ਘੋੜਾ f5 ਅਤੇ h5 ਉੱਤੇ ਨਜ਼ਰ ਰੱਖਦਾ ਹੈ, ਜੋ ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਦੇ ਨੇੜੇ ਹਨ। ਤੁਹਾਡੀ ਸ਼ੁਰੂਆਤ ਪੂਰੀ ਹੋ ਗਈ: ਹੁਣ d4 ਚੱਲੋ, ਜਾਂ ਬਾਦਸ਼ਾਹ ਵਾਲੇ ਪਾਸੇ ਹਮਲਾ ਕਰੋ।" },
      },
      aim: { 4: ["f7"], 22: ["f5"] },
    },
    win: {
      title: { en: "Légal's trap: Black grabs your queen", pa: "Légal ਦਾ ਜਾਲ: ਕਾਲਾ ਤੁਹਾਡੀ ਰਾਣੀ ਮਾਰ ਲੈਂਦਾ ਹੈ" }, ends: "mate",
      moves: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#".split(" "),
      notes: {
        4: { en: "The bishop aims at f7 again.", pa: "ਊਠ ਫਿਰ f7 ਵੱਲ ਤਾਣਿਆ ਹੈ।" },
        5: { en: "Black plays a slow move instead of ...Bc5.", pa: "ਕਾਲਾ ...Bc5 ਦੀ ਥਾਂ ਇੱਕ ਹੌਲੀ ਚਾਲ ਚੱਲਦਾ ਹੈ।" },
        6: { en: "Bring out the other knight.", pa: "ਦੂਜਾ ਘੋੜਾ ਬਾਹਰ ਕੱਢੋ।" },
        7: { en: "Black pins your knight to your queen.", pa: "ਕਾਲਾ ਤੁਹਾਡੇ ਘੋੜੇ ਨੂੰ ਤੁਹਾਡੀ ਰਾਣੀ ਨਾਲ ਪਿੰਨ ਕਰ ਦਿੰਦਾ ਹੈ।" },
        8: { en: "Ask the bishop a question: take, or step back?", pa: "ਊਠ ਨੂੰ ਸਵਾਲ ਪੁੱਛੋ: ਮਾਰੇ, ਜਾਂ ਪਿੱਛੇ ਹਟੇ?" },
        9: { en: "Black keeps the pin. Now there is a trick.", pa: "ਕਾਲਾ ਪਿੰਨ ਕਾਇਮ ਰੱਖਦਾ ਹੈ। ਹੁਣ ਇੱਕ ਚਾਲ ਹੈ।" },
        10: { en: "Break the pin! If Black takes your queen, you mate. If Black takes the knight with ...dxe5, take the bishop with Qxh5 and you are a pawn up.", pa: "ਪਿੰਨ ਤੋੜੋ! ਜੇ ਕਾਲਾ ਤੁਹਾਡੀ ਰਾਣੀ ਮਾਰ ਲਵੇ, ਤਾਂ ਤੁਸੀਂ ਸ਼ਹਿ-ਮਾਤ ਕਰ ਦਿੰਦੇ ਹੋ। ਜੇ ਕਾਲਾ ...dxe5 ਨਾਲ ਘੋੜਾ ਮਾਰ ਲਵੇ, ਤਾਂ Qxh5 ਨਾਲ ਊਠ ਮਾਰ ਲਓ ਅਤੇ ਤੁਸੀਂ ਇੱਕ ਪਿਆਦਾ ਅੱਗੇ ਹੋ।" },
        11: { en: "Black grabs your queen: a big mistake.", pa: "ਕਾਲਾ ਤੁਹਾਡੀ ਰਾਣੀ ਮਾਰ ਲੈਂਦਾ ਹੈ: ਇੱਕ ਵੱਡੀ ਗ਼ਲਤੀ।" },
        12: { en: "Check! The king has only one square: e7.", pa: "ਸ਼ਹਿ! ਬਾਦਸ਼ਾਹ ਕੋਲ ਸਿਰਫ਼ ਇੱਕ ਖ਼ਾਨਾ ਹੈ: e7।" },
        14: { en: "Checkmate with three small pieces. Remember the idea: a pin is not always real.", pa: "ਤਿੰਨ ਛੋਟੇ ਮੋਹਰਿਆਂ ਨਾਲ ਸ਼ਹਿ-ਮਾਤ। ਇਹ ਗੱਲ ਯਾਦ ਰੱਖੋ: ਪਿੰਨ ਹਮੇਸ਼ਾ ਸੱਚਾ ਨਹੀਂ ਹੁੰਦਾ।" },
      },
      aim: { 4: ["f7"] },
    },
    game: {
      title: { en: "Full game: the attack on h6", pa: "ਪੂਰੀ ਖੇਡ: h6 ਉੱਤੇ ਹਮਲਾ" }, ends: "mate",
      moves: [...ITALIAN_MAIN, ..."Ne7 d4 Ng6 Bc2 c6 Be3 Qc7 Qc1 b5 a4 a5 Bxh6 Nh7 Nh5 gxh6 Qxh6 Qd8 Qg7#".split(" ")],
      notes: {
        22: { en: "The main line is done. Now watch how the plan works.", pa: "ਮੁੱਖ ਲਾਈਨ ਪੂਰੀ ਹੋ ਗਈ। ਹੁਣ ਵੇਖੋ ਕਿ ਯੋਜਨਾ ਕਿਵੇਂ ਕੰਮ ਕਰਦੀ ਹੈ।" },
        23: { en: "Black sends the knight towards the kingside to defend.", pa: "ਕਾਲਾ ਬਚਾਅ ਲਈ ਘੋੜੇ ਨੂੰ ਬਾਦਸ਼ਾਹ ਵਾਲੇ ਪਾਸੇ ਵੱਲ ਭੇਜਦਾ ਹੈ।" },
        24: { en: "Strike in the centre with d4.", pa: "d4 ਨਾਲ ਕੇਂਦਰ ਵਿੱਚ ਵਾਰ ਕਰੋ।" },
        26: { en: "The bishop steps to c2 and now aims at the kingside.", pa: "ਊਠ c2 ਉੱਤੇ ਆ ਜਾਂਦਾ ਹੈ ਅਤੇ ਹੁਣ ਬਾਦਸ਼ਾਹ ਵਾਲੇ ਪਾਸੇ ਵੱਲ ਤਾਣਿਆ ਹੈ।" },
        28: { en: "Bishop to e3, looking along the line to h6.", pa: "ਊਠ e3 ਉੱਤੇ, ਜਿੱਥੋਂ ਸਿੱਧੀ ਲਾਈਨ h6 ਤੱਕ ਜਾਂਦੀ ਹੈ।" },
        30: { en: "Queen and bishop line up on h6: the pawn there is the target.", pa: "ਰਾਣੀ ਅਤੇ ਊਠ h6 ਉੱਤੇ ਇੱਕ ਲਾਈਨ ਵਿੱਚ ਆ ਜਾਂਦੇ ਹਨ: ਉੱਥੇ ਵਾਲਾ ਪਿਆਦਾ ਨਿਸ਼ਾਨਾ ਹੈ।" },
        31: { en: "Black attacks on the queenside, far from the danger.", pa: "ਕਾਲਾ ਰਾਣੀ ਵਾਲੇ ਪਾਸੇ ਹਮਲਾ ਕਰਦਾ ਹੈ, ਖ਼ਤਰੇ ਤੋਂ ਦੂਰ।" },
        32: { en: "Keep Black busy on that side too.", pa: "ਕਾਲੇ ਨੂੰ ਉਸ ਪਾਸੇ ਵੀ ਰੁੱਝਿਆ ਰੱਖੋ।" },
        34: { en: "Sacrifice! The bishop smashes the pawns in front of Black's king.", pa: "ਕੁਰਬਾਨੀ! ਊਠ ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਦੇ ਸਾਹਮਣੇ ਵਾਲੇ ਪਿਆਦਿਆਂ ਨੂੰ ਤੋੜ ਦਿੰਦਾ ਹੈ।" },
        36: { en: "The knight joins the attack. From h5 it guards g7.", pa: "ਘੋੜਾ ਹਮਲੇ ਵਿੱਚ ਸ਼ਾਮਲ ਹੁੰਦਾ ਹੈ। h5 ਤੋਂ ਉਹ g7 ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" },
        37: { en: "Black takes the bishop, and the king is now open.", pa: "ਕਾਲਾ ਊਠ ਮਾਰ ਲੈਂਦਾ ਹੈ, ਅਤੇ ਹੁਣ ਬਾਦਸ਼ਾਹ ਖੁੱਲ੍ਹਾ ਰਹਿ ਗਿਆ ਹੈ।" },
        38: { en: "The queen takes back and lands next to the king.", pa: "ਰਾਣੀ ਬਦਲੇ ਵਿੱਚ ਮਾਰ ਲੈਂਦੀ ਹੈ ਅਤੇ ਬਾਦਸ਼ਾਹ ਦੇ ਬਿਲਕੁਲ ਕੋਲ ਆ ਪਹੁੰਚਦੀ ਹੈ।" },
        40: { en: "Checkmate! The knight on h5 guards the queen on g7.", pa: "ਸ਼ਹਿ-ਮਾਤ! h5 ਵਾਲਾ ਘੋੜਾ g7 ਵਾਲੀ ਰਾਣੀ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" },
      },
      aim: { 30: ["h6"], 36: ["g7"] },
    },
  },
];

export const courseOpening = (id: string) => COURSE.find(o => o.id === id);
export const STEPS = ["learn", "practise", "win", "game"] as const;
export type Step = (typeof STEPS)[number];
