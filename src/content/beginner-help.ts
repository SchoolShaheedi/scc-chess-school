// "No dead ends" (2026-10-29): what makes Levels 1-4 easier for complete beginners and young children, kept in ONE file
// and laid over the lesson files by applyBeginnerHelp() in levels.ts, so the lessons' own positions and wording stay as
// they were written (another pass was fixing chess errors in them at the same time).
//
//   HINTS     a hint on every Try and first Practise that had none ("<lesson>:try", "<lesson>:p0")
//   YOUNG     the short version (about 12 words, one idea) that the Young look shows instead of a long slide or prompt
//   SPLIT     a long slide that the Young look shows as one slide per idea (2.4's four castling rules)
//   DRILLS    Level 3 part-drills, put between the mate-in-one Try and the full mate (positions proved in test/easy-packs.test.ts)
// A hint or young text already written in a lesson file always wins over these.
import type { Exercise, Lesson, Slide, Text } from "../lesson/types";

const H = (en: string, pa: string): Text => ({ en, pa });

const HINTS: Record<string, Text> = {
  // ---- Level 1
  "1.1:p0": H("Find the letter along the bottom, then count up the side.", "ਪਹਿਲਾਂ ਹੇਠਾਂ ਅੱਖਰ ਲੱਭੋ, ਫਿਰ ਪਾਸੇ ਦੇ ਨੰਬਰ ਗਿਣੋ।"),
  "1.2:p0": H("Go up the a-file first, then along the top row.", "ਪਹਿਲਾਂ a ਵਾਲੀ ਖੜ੍ਹੀ ਕਤਾਰ ਉੱਤੇ ਜਾਓ, ਫਿਰ ਉੱਪਰਲੀ ਕਤਾਰ ਵਿੱਚ।"),
  "1.3:p0": H("Start with a3. From there a long diagonal leads to f8.", "a3 ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ। ਉੱਥੋਂ ਇੱਕ ਲੰਮੀ ਤਿਰਛੀ ਲਕੀਰ f8 ਤੱਕ ਜਾਂਦੀ ਹੈ।"),
  "1.4:p0": H("Start with a4. Then straight up to a8, then along the long diagonal.", "a4 ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ। ਫਿਰ ਸਿੱਧਾ ਉੱਪਰ a8 ਤੱਕ, ਫਿਰ ਲੰਮੀ ਤਿਰਛੀ ਲਕੀਰ 'ਤੇ।"),
  "1.5:p0": H("The bishop guards a diagonal. Step onto squares it does not guard.", "ਊਠ ਇੱਕ ਤਿਰਛੀ ਲਕੀਰ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ। ਉਨ੍ਹਾਂ ਖਾਨਿਆਂ 'ਤੇ ਜਾਓ ਜਿਨ੍ਹਾਂ ਦੀ ਉਹ ਰਾਖੀ ਨਹੀਂ ਕਰਦਾ।"),
  "1.6:p0": H("g1 to f3 is one jump. From f3 the next jump reaches e5.", "g1 ਤੋਂ f3 ਇੱਕ ਛਾਲ ਹੈ। f3 ਤੋਂ ਅਗਲੀ ਛਾਲ e5 'ਤੇ ਪਹੁੰਚਦੀ ਹੈ।"),
  "1.7:p0": H("Capture sideways onto c3. Then walk the pawn up the c-file.", "ਤਿਰਛਾ ਮਾਰ ਕੇ c3 'ਤੇ ਜਾਓ। ਫਿਰ ਪਿਆਦੇ ਨੂੰ c ਵਾਲੀ ਖੜ੍ਹੀ ਕਤਾਰ ਵਿੱਚ ਅੱਗੇ ਵਧਾਓ।"),
  "1.9:try": H("Could any black piece take your rook back?", "ਕੀ ਕੋਈ ਕਾਲਾ ਮੋਹਰਾ ਬਦਲੇ ਵਿੱਚ ਤੁਹਾਡਾ ਹਾਥੀ ਮਾਰ ਸਕਦਾ ਹੈ?"),
  "1.9:p0": H("Look for a black piece that no other black piece guards.", "ਉਹ ਕਾਲਾ ਮੋਹਰਾ ਲੱਭੋ ਜਿਸ ਦੀ ਰਾਖੀ ਕੋਈ ਹੋਰ ਕਾਲਾ ਮੋਹਰਾ ਨਹੀਂ ਕਰਦਾ।"),
  "1.10:p0": H("Which of your pieces can reach the queen?", "ਤੁਹਾਡਾ ਕਿਹੜਾ ਮੋਹਰਾ ਰਾਣੀ ਤੱਕ ਪਹੁੰਚ ਸਕਦਾ ਹੈ?"),
  "1.11:try": H("Pawns capture sideways. Push one pawn up, and watch what Titli does.", "ਪਿਆਦੇ ਤਿਰਛਾ ਮਾਰਦੇ ਹਨ। ਇੱਕ ਪਿਆਦਾ ਅੱਗੇ ਵਧਾਓ ਅਤੇ ਵੇਖੋ ਤਿਤਲੀ ਕੀ ਕਰਦੀ ਹੈ।"),
  "1.11:p0": H("Count: how many moves does each pawn need to reach the last row?", "ਗਿਣੋ: ਹਰ ਪਿਆਦੇ ਨੂੰ ਆਖ਼ਰੀ ਕਤਾਰ ਤੱਕ ਪਹੁੰਚਣ ਲਈ ਕਿੰਨੀਆਂ ਚਾਲਾਂ ਚਾਹੀਦੀਆਂ ਹਨ?"),
  "1.12:try": H("Take your rook behind the pawns, and capture them one by one.", "ਹਾਥੀ ਨੂੰ ਪਿਆਦਿਆਂ ਦੇ ਪਿੱਛੇ ਲੈ ਜਾਓ ਅਤੇ ਇੱਕ-ਇੱਕ ਕਰ ਕੇ ਮਾਰੋ।"),
  "1.12:p0": H("Stop the pawn that is closest to becoming a queen first.", "ਪਹਿਲਾਂ ਉਹ ਪਿਆਦਾ ਰੋਕੋ ਜੋ ਰਾਣੀ ਬਣਨ ਦੇ ਸਭ ਤੋਂ ਨੇੜੇ ਹੈ।"),
  // ---- Level 2
  "2.1:p0": H("Which square between the rook and your king can the bishop reach?", "ਹਾਥੀ ਅਤੇ ਤੁਹਾਡੇ ਬਾਦਸ਼ਾਹ ਵਿਚਕਾਰ ਦਾ ਕਿਹੜਾ ਖਾਨਾ ਊਠ ਲੈ ਸਕਦਾ ਹੈ?"),
  "2.2:p0": H("Find your checks first. Then ask: can the king escape?", "ਪਹਿਲਾਂ ਆਪਣੀਆਂ ਸ਼ਹਿ ਦੇਣ ਵਾਲੀਆਂ ਚਾਲਾਂ ਲੱਭੋ। ਫਿਰ ਪੁੱਛੋ: ਕੀ ਬਾਦਸ਼ਾਹ ਬਚ ਸਕਦਾ ਹੈ?"),
  "2.3:p0": H("Is the black king in check right now?", "ਕੀ ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਇਸ ਵੇਲੇ ਸ਼ਹਿ ਹੈ?"),
  "2.4:p0": H("The knight on g1 is in the way on the short side. Castle the other way.", "ਛੋਟੇ ਪਾਸੇ g1 ਦਾ ਘੋੜਾ ਰਾਹ ਵਿੱਚ ਹੈ। ਦੂਜੇ ਪਾਸੇ ਕਿਲ੍ਹੇਬੰਦੀ ਕਰੋ।"),
  "2.5:try": H("Push the pawn one step to the last row.", "ਪਿਆਦੇ ਨੂੰ ਇੱਕ ਕਦਮ ਆਖ਼ਰੀ ਕਤਾਰ ਤੱਕ ਵਧਾਓ।"),
  "2.5:p0": H("The pawn can capture the rook on the way. Look sideways.", "ਪਿਆਦਾ ਰਾਹ ਵਿੱਚ ਹਾਥੀ ਨੂੰ ਮਾਰ ਸਕਦਾ ਹੈ। ਤਿਰਛਾ ਵੇਖੋ।"),
  "2.6:p0": H("Your f4 pawn goes to g3, the square the white pawn jumped over.", "ਤੁਹਾਡਾ f4 ਵਾਲਾ ਪਿਆਦਾ g3 'ਤੇ ਜਾਂਦਾ ਹੈ, ਜਿਸ ਖਾਨੇ ਉੱਤੋਂ ਚਿੱਟਾ ਪਿਆਦਾ ਲੰਘਿਆ।"),
  "2.7:try": H("Can one bishop and a king ever trap a king?", "ਕੀ ਇੱਕ ਊਠ ਅਤੇ ਬਾਦਸ਼ਾਹ ਕਦੇ ਇੱਕ ਬਾਦਸ਼ਾਹ ਨੂੰ ਫਸਾ ਸਕਦੇ ਹਨ?"),
  "2.7:p0": H("Is a rook strong enough to push a king to the edge?", "ਕੀ ਹਾਥੀ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੰਢੇ ਵੱਲ ਧੱਕਣ ਲਈ ਕਾਫ਼ੀ ਤਾਕਤਵਰ ਹੈ?"),
  "2.8:try": H("Count what you give and what you get: knight 3, rook 5.", "ਗਿਣੋ ਤੁਸੀਂ ਕੀ ਦਿੰਦੇ ਹੋ ਅਤੇ ਕੀ ਲੈਂਦੇ ਹੋ: ਘੋੜਾ ੩, ਹਾਥੀ ੫।"),
  "2.8:p0": H("Count both pieces. Are the numbers the same?", "ਦੋਵੇਂ ਮੋਹਰੇ ਗਿਣੋ। ਕੀ ਗਿਣਤੀਆਂ ਇੱਕੋ ਜਿਹੀਆਂ ਹਨ?"),
  "2.9:try": H("Letter first, then number. f3 is column f, row 3.", "ਪਹਿਲਾਂ ਅੱਖਰ, ਫਿਰ ਨੰਬਰ। f3 ਦਾ ਮਤਲਬ ਖੜ੍ਹੀ ਕਤਾਰ f, ਲੇਟਵੀਂ ਕਤਾਰ 3।"),
  "2.9:p0": H("The first letter names the piece. Which piece is N?", "ਪਹਿਲਾ ਅੱਖਰ ਮੋਹਰੇ ਦਾ ਨਾਂ ਦੱਸਦਾ ਹੈ। N ਕਿਹੜਾ ਮੋਹਰਾ ਹੈ?"),
  "2.10:try": H("Which move puts a pawn in the middle?", "ਕਿਹੜੀ ਚਾਲ ਇੱਕ ਪਿਆਦੇ ਨੂੰ ਵਿਚਕਾਰ ਰੱਖਦੀ ਹੈ?"),
  "2.10:p0": H("Block the queen's path to f7 with a pawn or a knight.", "ਰਾਣੀ ਦਾ f7 ਵੱਲ ਦਾ ਰਾਹ ਪਿਆਦੇ ਜਾਂ ਘੋੜੇ ਨਾਲ ਰੋਕੋ।"),
  // ---- Level 3
  "3.1:p0": H("Queen to the back row: which square on row 8 can she reach?", "ਰਾਣੀ ਪਿਛਲੀ ਕਤਾਰ ਵੱਲ: ਅੱਠਵੀਂ ਕਤਾਰ ਦਾ ਕਿਹੜਾ ਖਾਨਾ ਉਹ ਲੈ ਸਕਦੀ ਹੈ?"),
  "3.2:p0": H("One rook guards a row, the other checks on the next row. Then swap.", "ਇੱਕ ਹਾਥੀ ਇੱਕ ਕਤਾਰ ਦੀ ਰਾਖੀ ਕਰੇ, ਦੂਜਾ ਅਗਲੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦੇਵੇ। ਫਿਰ ਕੰਮ ਬਦਲੋ।"),
  "3.3:try": H("Check along the back row, where your king guards the squares below.", "ਪਿਛਲੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦਿਓ, ਜਿੱਥੇ ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਹੇਠਲੇ ਖਾਨਿਆਂ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।"),
  "3.3:p0": H("Put the queen a knight's jump from the king to build a box. Then shrink it.", "ਰਾਣੀ ਨੂੰ ਬਾਦਸ਼ਾਹ ਤੋਂ ਘੋੜੇ ਦੀ ਛਾਲ ਜਿੰਨੀ ਦੂਰ ਰੱਖ ਕੇ ਡੱਬਾ ਬਣਾਓ। ਫਿਰ ਉਸ ਨੂੰ ਛੋਟਾ ਕਰੋ।"),
  "3.4:try": H("Check on the edge row: the kings already face each other.", "ਕੰਢੇ ਵਾਲੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦਿਓ: ਬਾਦਸ਼ਾਹ ਪਹਿਲਾਂ ਹੀ ਆਹਮੋ-ਸਾਹਮਣੇ ਹਨ।"),
  "3.4:p0": H("Check along the edge row. Your king covers the squares below.", "ਕੰਢੇ ਦੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦਿਓ। ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਹੇਠਲੇ ਖਾਨਿਆਂ ਨੂੰ ਢੱਕਦਾ ਹੈ।"),
  "3.5:p0": H("Put the queen next to the king, on a square the rook guards.", "ਰਾਣੀ ਨੂੰ ਬਾਦਸ਼ਾਹ ਦੇ ਨਾਲ ਉਸ ਖਾਨੇ 'ਤੇ ਰੱਖੋ ਜਿੱਥੇ ਹਾਥੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।"),
  "3.6:p0": H("The king has no free squares. Which knight jump gives check?", "ਬਾਦਸ਼ਾਹ ਕੋਲ ਕੋਈ ਖਾਲੀ ਖਾਨਾ ਨਹੀਂ। ਘੋੜੇ ਦੀ ਕਿਹੜੀ ਛਾਲ ਸ਼ਹਿ ਦਿੰਦੀ ਹੈ?"),
  "3.7:try": H("Check along the back row. Can the king move, can it be blocked, can it be taken?", "ਪਿਛਲੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦਿਓ। ਕੀ ਬਾਦਸ਼ਾਹ ਹਿੱਲ ਸਕਦਾ ਹੈ, ਰੋਕ ਹੋ ਸਕਦੀ ਹੈ, ਮਾਰ ਹੋ ਸਕਦੀ ਹੈ?"),
  "3.7:p0": H("List your checks first. Which one leaves the king no way out?", "ਪਹਿਲਾਂ ਆਪਣੀਆਂ ਸ਼ਹਿ ਦੇਣ ਵਾਲੀਆਂ ਚਾਲਾਂ ਗਿਣੋ। ਕਿਹੜੀ ਬਾਦਸ਼ਾਹ ਲਈ ਕੋਈ ਰਾਹ ਨਹੀਂ ਛੱਡਦੀ?"),
  "3.8:p0": H("Can your rook or king guard h2? Or make room for the king.", "ਕੀ ਤੁਹਾਡਾ ਹਾਥੀ ਜਾਂ ਬਾਦਸ਼ਾਹ h2 ਦੀ ਰਾਖੀ ਕਰ ਸਕਦਾ ਹੈ? ਜਾਂ ਬਾਦਸ਼ਾਹ ਲਈ ਥਾਂ ਬਣਾਓ।"),
  // ---- Level 4
  "4.1:try": H("Look for the piece nothing guards.", "ਉਹ ਮੋਹਰਾ ਲੱਭੋ ਜਿਸ ਦੀ ਰਾਖੀ ਕੋਈ ਨਹੀਂ ਕਰਦਾ।"),
  "4.2:p0": H("Find a square on the same row as both the king and the knight.", "ਉਹ ਖਾਨਾ ਲੱਭੋ ਜੋ ਬਾਦਸ਼ਾਹ ਅਤੇ ਘੋੜੇ ਦੋਵਾਂ ਵਾਲੀ ਕਤਾਰ ਵਿੱਚ ਹੋਵੇ।"),
  "4.3:try": H("Find a jump that checks the king and also attacks the rook.", "ਉਹ ਛਾਲ ਲੱਭੋ ਜੋ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਦੇਵੇ ਅਤੇ ਹਾਥੀ 'ਤੇ ਵੀ ਹਮਲਾ ਕਰੇ।"),
  "4.3:p0": H("Which square lets the knight attack both the king and the queen?", "ਘੋੜਾ ਕਿਸ ਖਾਨੇ ਤੋਂ ਬਾਦਸ਼ਾਹ ਅਤੇ ਰਾਣੀ ਦੋਵਾਂ 'ਤੇ ਹਮਲਾ ਕਰਦਾ ਹੈ?"),
  "4.4:try": H("Push a pawn one step so it attacks both pieces.", "ਇੱਕ ਪਿਆਦਾ ਇੱਕ ਕਦਮ ਅੱਗੇ ਕਰੋ ਤਾਂ ਜੋ ਉਹ ਦੋਵਾਂ ਮੋਹਰਿਆਂ 'ਤੇ ਹਮਲਾ ਕਰੇ।"),
  "4.4:p0": H("Step to a square next to both pieces, off the bishop's line.", "ਉਸ ਖਾਨੇ 'ਤੇ ਜਾਓ ਜੋ ਦੋਵਾਂ ਮੋਹਰਿਆਂ ਦੇ ਨਾਲ ਹੋਵੇ ਅਤੇ ਊਠ ਦੀ ਲਕੀਰ ਤੋਂ ਬਾਹਰ ਹੋਵੇ।"),
  "4.5:try": H("A bishop on the king's diagonal pins the knight. Which square?", "ਜੋ ਊਠ ਬਾਦਸ਼ਾਹ ਵਾਲੀ ਤਿਰਛੀ ਲਕੀਰ 'ਤੇ ਹੋਵੇ, ਉਹ ਘੋੜੇ ਨੂੰ ਬੰਨ੍ਹਦਾ ਹੈ। ਕਿਹੜਾ ਖਾਨਾ?"),
  "4.5:p0": H("Put your rook on the file where the knight and the queen stand.", "ਆਪਣੇ ਹਾਥੀ ਨੂੰ ਉਸ ਖੜ੍ਹੀ ਕਤਾਰ 'ਤੇ ਰੱਖੋ ਜਿੱਥੇ ਘੋੜਾ ਅਤੇ ਰਾਣੀ ਹਨ।"),
  "4.6:p0": H("Check the king along a line, with the queen standing behind it.", "ਇੱਕ ਲਕੀਰ ਵਿੱਚ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਦਿਓ, ਜਿਸ ਦੇ ਪਿੱਛੇ ਰਾਣੀ ਖੜ੍ਹੀ ਹੋਵੇ।"),
  "4.7:try": H("Move the knight and the rook behind it attacks the queen. Where is it safe?", "ਘੋੜਾ ਹਟਾਓ, ਤਾਂ ਉਸ ਦੇ ਪਿੱਛੇ ਹਾਥੀ ਰਾਣੀ 'ਤੇ ਹਮਲਾ ਕਰਦਾ ਹੈ। ਘੋੜਾ ਕਿੱਥੇ ਸੁਰੱਖਿਅਤ ਹੈ?"),
  "4.7:p0": H("The bishop already aims at the king. Move the knight to a safe square.", "ਊਠ ਪਹਿਲਾਂ ਹੀ ਬਾਦਸ਼ਾਹ ਵੱਲ ਨਿਸ਼ਾਨਾ ਲਾਈ ਬੈਠਾ ਹੈ। ਘੋੜੇ ਨੂੰ ਸੁਰੱਖਿਅਤ ਖਾਨੇ 'ਤੇ ਲੈ ਜਾਓ।"),
  "4.8:p0": H("Find a move that gives check itself AND opens a line for a second check.", "ਉਹ ਚਾਲ ਲੱਭੋ ਜੋ ਆਪ ਸ਼ਹਿ ਦੇਵੇ ਅਤੇ ਦੂਜੀ ਸ਼ਹਿ ਲਈ ਲਕੀਰ ਵੀ ਖੋਲ੍ਹੇ।"),
  "4.9:try": H("Which piece guards the target? Can you take it or chase it?", "ਨਿਸ਼ਾਨੇ ਵਾਲੇ ਮੋਹਰੇ ਦੀ ਰਾਖੀ ਕੌਣ ਕਰਦਾ ਹੈ? ਕੀ ਤੁਸੀਂ ਉਸ ਨੂੰ ਮਾਰ ਜਾਂ ਭਜਾ ਸਕਦੇ ਹੋ?"),
  "4.9:p0": H("Find the guard first, then take it away.", "ਪਹਿਲਾਂ ਰਾਖਾ ਲੱਭੋ, ਫਿਰ ਉਸ ਨੂੰ ਹਟਾਓ।"),
  "4.10:try": H("Count the safe squares the piece has. Take the last one away.", "ਗਿਣੋ ਮੋਹਰੇ ਕੋਲ ਕਿੰਨੇ ਸੁਰੱਖਿਅਤ ਖਾਨੇ ਹਨ। ਆਖ਼ਰੀ ਖਾਨਾ ਬੰਦ ਕਰ ਦਿਓ।"),
  "4.10:p0": H("Attack the trapped piece. Check every square it could run to.", "ਫਸੇ ਹੋਏ ਮੋਹਰੇ 'ਤੇ ਹਮਲਾ ਕਰੋ। ਉਹ ਜਿੱਥੇ-ਜਿੱਥੇ ਭੱਜ ਸਕਦਾ ਹੈ, ਹਰ ਖਾਨਾ ਵੇਖੋ।"),
  "4.11:try": H("Count the white attackers first, then the black defenders.", "ਪਹਿਲਾਂ ਚਿੱਟੇ ਹਮਲਾਵਰ ਗਿਣੋ, ਫਿਰ ਕਾਲੇ ਰਾਖੇ।"),
  "4.11:p0": H("Count again: who has more, the attackers or the defenders?", "ਫਿਰ ਗਿਣੋ: ਕਿਸ ਕੋਲ ਵੱਧ ਹਨ, ਹਮਲਾਵਰ ਜਾਂ ਰਾਖੇ?"),
};

// ---------- the Young look: short texts, one idea each ----------
const YOUNG_SLIDES: Record<string, Text> = {
  "1.3:1": H("A bishop stays on its own colour all game.", "ਊਠ ਸਾਰੀ ਖੇਡ ਆਪਣੇ ਹੀ ਰੰਗ 'ਤੇ ਰਹਿੰਦਾ ਹੈ।"),
  "1.5:1": H("The king must never step where an enemy can take him.", "ਬਾਦਸ਼ਾਹ ਕਦੇ ਉੱਥੇ ਨਾ ਜਾਵੇ ਜਿੱਥੇ ਦੁਸ਼ਮਣ ਉਸ ਨੂੰ ਮਾਰ ਸਕੇ।"),
  "1.7:3": H("A pawn at the far end becomes a queen!", "ਦੂਜੇ ਸਿਰੇ 'ਤੇ ਪਹੁੰਚ ਕੇ ਪਿਆਦਾ ਰਾਣੀ ਬਣ ਜਾਂਦਾ ਹੈ!"),
  "1.8:1": H("The queen sits on her own colour. The king stands beside her.", "ਰਾਣੀ ਆਪਣੇ ਰੰਗ 'ਤੇ ਬੈਠਦੀ ਹੈ। ਬਾਦਸ਼ਾਹ ਉਸ ਦੇ ਨਾਲ ਖੜ੍ਹਦਾ ਹੈ।"),
  "1.9:2": H("A piece nobody guards is free. Take it!", "ਜਿਸ ਮੋਹਰੇ ਦੀ ਰਾਖੀ ਕੋਈ ਨਹੀਂ ਕਰਦਾ, ਉਹ ਮੁਫ਼ਤ ਹੈ। ਉਸ ਨੂੰ ਮਾਰੋ!"),
  "1.11:0": H("Be first to get a pawn to the last row!", "ਪਹਿਲਾਂ ਆਖ਼ਰੀ ਕਤਾਰ ਤੱਕ ਪਿਆਦਾ ਪਹੁੰਚਾਓ!"),
  "2.2:0": H("Checkmate: the king is attacked and cannot escape. Game over!", "ਸ਼ਹਿ-ਮਾਤ: ਬਾਦਸ਼ਾਹ 'ਤੇ ਹਮਲਾ ਹੈ ਅਤੇ ਉਹ ਬਚ ਨਹੀਂ ਸਕਦਾ। ਖੇਡ ਖ਼ਤਮ!"),
  "2.3:0": H("No move, but no check? That is stalemate. A draw.", "ਕੋਈ ਚਾਲ ਨਹੀਂ, ਪਰ ਸ਼ਹਿ ਵੀ ਨਹੀਂ? ਇਹ ਖੜੋਤ ਹੈ। ਬਰਾਬਰੀ।"),
  "2.3:1": H("Careful! Stalemate can throw away a win.", "ਧਿਆਨ! ਖੜੋਤ ਜਿੱਤੀ ਹੋਈ ਖੇਡ ਗੁਆ ਸਕਦੀ ਹੈ।"),
  "2.3:2": H("Leave their king one square to move to.", "ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਲਈ ਜਾਣ ਦਾ ਇੱਕ ਖਾਨਾ ਛੱਡੋ।"),
  "2.4:0": H("Castling moves the king and a rook together.", "ਕਿਲ੍ਹੇਬੰਦੀ ਵਿੱਚ ਬਾਦਸ਼ਾਹ ਅਤੇ ਹਾਥੀ ਇਕੱਠੇ ਚੱਲਦੇ ਹਨ।"),
  "2.5:0": H("At the far end a pawn becomes a new piece.", "ਦੂਜੇ ਸਿਰੇ 'ਤੇ ਪਿਆਦਾ ਨਵਾਂ ਮੋਹਰਾ ਬਣ ਜਾਂਦਾ ਹੈ।"),
  "2.5:2": H("A pawn near the end is a big danger.", "ਅੰਤ ਦੇ ਨੇੜੇ ਦਾ ਪਿਆਦਾ ਵੱਡਾ ਖ਼ਤਰਾ ਹੈ।"),
  "2.6:1": H("Take the pawn that jumped, right away, as if it moved one.", "ਛਾਲ ਮਾਰਨ ਵਾਲੇ ਪਿਆਦੇ ਨੂੰ ਤੁਰੰਤ ਮਾਰੋ, ਜਿਵੇਂ ਉਹ ਇੱਕ ਖਾਨਾ ਚੱਲਿਆ ਹੋਵੇ।"),
  "2.7:4": H("Too few pieces to checkmate is a draw.", "ਮਾਤ ਲਈ ਮੋਹਰੇ ਥੋੜ੍ਹੇ ਹੋਣ ਤਾਂ ਬਰਾਬਰੀ ਹੁੰਦੀ ਹੈ।"),
  "2.8:2": H("A good trade gets more than it gives.", "ਚੰਗੇ ਵਟਾਂਦਰੇ ਵਿੱਚ ਦੇਣ ਨਾਲੋਂ ਵੱਧ ਮਿਲਦਾ ਹੈ।"),
  "2.9:1": H("Every piece has a letter. A pawn has none.", "ਹਰ ਮੋਹਰੇ ਦਾ ਇੱਕ ਅੱਖਰ ਹੈ। ਪਿਆਦੇ ਦਾ ਕੋਈ ਨਹੀਂ।"),
  "2.9:2": H("A move: the piece's letter, then where it goes.", "ਚਾਲ: ਮੋਹਰੇ ਦਾ ਅੱਖਰ, ਫਿਰ ਉਹ ਖਾਨਾ ਜਿੱਥੇ ਉਹ ਜਾਂਦਾ ਹੈ।"),
  "2.10:0": H("Start well: a centre pawn, bring out pieces, castle.", "ਚੰਗੀ ਸ਼ੁਰੂਆਤ: ਵਿਚਕਾਰ ਪਿਆਦਾ, ਮੋਹਰੇ ਕੱਢੋ, ਕਿਲ੍ਹੇਬੰਦੀ।"),
  "2.10:1": H("Watch f7! A queen and bishop can mate there.", "f7 ਦਾ ਧਿਆਨ ਰੱਖੋ! ਰਾਣੀ ਅਤੇ ਊਠ ਉੱਥੇ ਮਾਤ ਦੇ ਸਕਦੇ ਹਨ।"),
  "3.2:1": H("One rook guards a row. The other gives check.", "ਇੱਕ ਹਾਥੀ ਕਤਾਰ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ। ਦੂਜਾ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ।"),
  "3.2:2": H("Keep your rooks far from the king.", "ਆਪਣੇ ਹਾਥੀ ਬਾਦਸ਼ਾਹ ਤੋਂ ਦੂਰ ਰੱਖੋ।"),
  "3.3:0": H("Build a box with the queen, a knight's jump away.", "ਰਾਣੀ ਨਾਲ ਡੱਬਾ ਬਣਾਓ, ਘੋੜੇ ਦੀ ਛਾਲ ਜਿੰਨੀ ਦੂਰ।"),
  "3.3:2": H("Bring your king close. Beware of stalemate!", "ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਨੇੜੇ ਲਿਆਓ। ਖੜੋਤ ਤੋਂ ਸਾਵਧਾਨ!"),
  "3.3:3": H("Finish with the queen beside the king, guarded.", "ਰਾਣੀ ਨੂੰ ਬਾਦਸ਼ਾਹ ਦੇ ਨਾਲ ਰੱਖ ਕੇ, ਰਾਖੀ ਸਮੇਤ, ਮਾਤ ਦਿਓ।"),
  "3.4:1": H("Bring your king to face theirs. Then check on the edge.", "ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਉਨ੍ਹਾਂ ਦੇ ਸਾਹਮਣੇ ਲਿਆਓ। ਫਿਰ ਕੰਢੇ 'ਤੇ ਸ਼ਹਿ ਦਿਓ।"),
  "3.4:2": H("Not facing yet? Make a quiet rook move and wait.", "ਅਜੇ ਆਹਮੋ-ਸਾਹਮਣੇ ਨਹੀਂ? ਹਾਥੀ ਦੀ ਚੁੱਪ ਚਾਲ ਚੱਲੋ ਅਤੇ ਉਡੀਕੋ।"),
  "3.5:0": H("A guarded queen beside the king is often mate.", "ਰਾਖੀ ਵਾਲੀ ਰਾਣੀ ਬਾਦਸ਼ਾਹ ਦੇ ਨਾਲ ਅਕਸਰ ਮਾਤ ਹੁੰਦੀ ਹੈ।"),
  "3.7:0": H("Look at every check. Can the king escape? If not, mate!", "ਹਰ ਸ਼ਹਿ ਵੇਖੋ। ਕੀ ਬਾਦਸ਼ਾਹ ਬਚ ਸਕਦਾ ਹੈ? ਨਹੀਂ ਬਚ ਸਕਦਾ ਤਾਂ ਮਾਤ!"),
  "3.8:0": H("Ask: can they give me checkmate next move?", "ਪੁੱਛੋ: ਕੀ ਉਹ ਅਗਲੀ ਚਾਲ ਵਿੱਚ ਮੈਨੂੰ ਮਾਤ ਦੇ ਸਕਦੇ ਹਨ?"),
  "4.5:0": H("A pinned piece is stuck. If it moves, something big is lost.", "ਬੰਨ੍ਹਿਆ ਮੋਹਰਾ ਜਕੜਿਆ ਹੁੰਦਾ ਹੈ। ਹਿੱਲੇ ਤਾਂ ਕੋਈ ਵੱਡਾ ਮੋਹਰਾ ਜਾਂਦਾ ਹੈ।"),
  "4.5:1": H("Pinned to the king? That piece cannot move at all.", "ਬਾਦਸ਼ਾਹ ਨਾਲ ਬੰਨ੍ਹਿਆ? ਉਹ ਮੋਹਰਾ ਬਿਲਕੁਲ ਹਿੱਲ ਨਹੀਂ ਸਕਦਾ।"),
};

// 2.4 slide 3 (index 2) lists four castling rules in one go: the Young look shows one rule per slide
const KING_ROOK = { e1: "wK", h1: "wR" } as const;
const SPLIT: Record<string, NonNullable<Slide["youngSplit"]>> = {
  "2.4:2": [
    { text: H("Rule one: the king and the rook must not have moved.", "ਨਿਯਮ ੧: ਬਾਦਸ਼ਾਹ ਅਤੇ ਹਾਥੀ ਪਹਿਲਾਂ ਚੱਲੇ ਨਾ ਹੋਣ।"),
      board: { pieces: { ...KING_ROOK }, highlights: ["e1", "h1"] } },
    { text: H("Rule two: nothing stands between them.", "ਨਿਯਮ ੨: ਉਨ੍ਹਾਂ ਵਿਚਕਾਰ ਕੋਈ ਮੋਹਰਾ ਨਾ ਹੋਵੇ।"),
      board: { pieces: { ...KING_ROOK, g1: "wN" }, crosses: ["g1"] } },
    { text: H("Rule three: the king must not be in check.", "ਨਿਯਮ ੩: ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਨਾ ਹੋਵੇ।"),
      board: { pieces: { ...KING_ROOK, e8: "bR" }, arrows: [["e8", "e1"]], highlights: ["e1"] } },
    { text: H("Rule four: the king must not cross an attacked square.", "ਨਿਯਮ ੪: ਬਾਦਸ਼ਾਹ ਹਮਲੇ ਵਾਲੇ ਖਾਨੇ ਤੋਂ ਨਾ ਲੰਘੇ।"),
      board: { pieces: { ...KING_ROOK, c4: "bB" }, arrows: [["c4", "f1"]], crosses: ["f1"] } },
  ],
};

const YOUNG_PROMPTS: Record<string, Text> = {
  "2.1:p2": H("A knight gives check. Move the king!", "ਘੋੜਾ ਸ਼ਹਿ ਦਿੰਦਾ ਹੈ। ਬਾਦਸ਼ਾਹ ਨੂੰ ਹਿਲਾਓ!"),
  "2.3:p2": H("Make a move that gives their king a square.", "ਅਜਿਹੀ ਚਾਲ ਚੱਲੋ ਜੋ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਇੱਕ ਖਾਨਾ ਦੇਵੇ।"),
  "2.6:try": H("Take the pawn that just jumped, en passant!", "ਜੋ ਪਿਆਦਾ ਹੁਣੇ ਛਾਲ ਮਾਰ ਕੇ ਆਇਆ, ਉਸ ਨੂੰ ਲੰਘਦਿਆਂ ਮਾਰੋ!"),
  "2.6:p0": H("You are Black now. Take en passant!", "ਹੁਣ ਤੁਸੀਂ ਕਾਲੇ ਹੋ। ਲੰਘਦਿਆਂ ਮਾਰੋ!"),
  "3.1:p1": H("They want to mate you! Stop it.", "ਉਹ ਤੁਹਾਨੂੰ ਮਾਤ ਦੇਣਾ ਚਾਹੁੰਦੇ ਹਨ! ਰੋਕੋ।"),
  "3.2:p0": H("Two rooks, one king. Checkmate!", "ਦੋ ਹਾਥੀ, ਇੱਕ ਬਾਦਸ਼ਾਹ। ਸ਼ਹਿ-ਮਾਤ ਕਰੋ!"),
  "3.3:p0": H("Box, shrink, bring your king, mate!", "ਡੱਬਾ ਬਣਾਓ, ਛੋਟਾ ਕਰੋ, ਬਾਦਸ਼ਾਹ ਲਿਆਓ, ਮਾਤ ਦਿਓ!"),
  "3.8:try": H("They want to mate you. Stop it!", "ਉਹ ਤੁਹਾਨੂੰ ਮਾਤ ਦੇਣਾ ਚਾਹੁੰਦੇ ਹਨ। ਰੋਕੋ!"),
};

// ---------- Level 3 part-drills ----------
// Each starts mid-way and has a small move limit. `partial` tells the content guard that the limit is NOT the longest forced
// mate for that material; test/easy-packs.test.ts (COURSE_BUILD=1) proves a mate within the limit against Stockfish's defence.
// The limits: the engine's mate length + 1 (ladder) or + 2 (queen box, kings facing).
const mate = (fen: string, maxMoves: number, prompt: Text, hint: Text): Exercise =>
  ({ kind: "mateVs", fen, maxMoves, partial: true, prompt, hint });
export const DRILLS: Record<string, Exercise[]> = {
  "3.2": [
    mate("2k5/8/8/R7/8/8/8/1R4K1 w - - 0 1", 3,
      H("The king is on the edge. Mate in 3 moves or fewer.", "ਬਾਦਸ਼ਾਹ ਕੰਢੇ 'ਤੇ ਹੈ। ੩ ਜਾਂ ਘੱਟ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।"),
      H("One rook guards the 7th row. The other checks on the 8th.", "ਇੱਕ ਹਾਥੀ ਸੱਤਵੀਂ ਕਤਾਰ ਦੀ ਰਾਖੀ ਕਰੇ। ਦੂਜਾ ਅੱਠਵੀਂ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦੇਵੇ।")),
    mate("8/3k4/R7/8/8/8/8/1R4K1 w - - 0 1", 4,
      H("Push the king one row back, then mate. You have 4 moves.", "ਬਾਦਸ਼ਾਹ ਨੂੰ ਇੱਕ ਕਤਾਰ ਪਿੱਛੇ ਧੱਕੋ, ਫਿਰ ਮਾਤ ਦਿਓ। ਤੁਹਾਡੇ ਕੋਲ ੪ ਚਾਲਾਂ ਹਨ।"),
      H("The rook on a6 guards row 6. Check on row 7 to push the king to row 8.", "a6 ਦਾ ਹਾਥੀ ਛੇਵੀਂ ਕਤਾਰ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ। ਸੱਤਵੀਂ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦੇ ਕੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਅੱਠਵੀਂ ਵੱਲ ਧੱਕੋ।")),
  ],
  "3.3": [
    mate("k7/4K3/8/8/8/3Q4/8/8 w - - 0 1", 6,
      H("The box is nearly built. Make it smaller and mate in 6 moves.", "ਡੱਬਾ ਲਗਭਗ ਬਣ ਚੁੱਕਾ ਹੈ। ਉਸ ਨੂੰ ਛੋਟਾ ਕਰੋ ਅਤੇ ੬ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।"),
      H("Keep the queen a knight's jump away. Come closer a step at a time, and don't stalemate!", "ਰਾਣੀ ਨੂੰ ਘੋੜੇ ਦੀ ਛਾਲ ਜਿੰਨੀ ਦੂਰ ਰੱਖੋ। ਇੱਕ-ਇੱਕ ਕਦਮ ਨੇੜੇ ਆਓ, ਅਤੇ ਖੜੋਤ ਤੋਂ ਬਚੋ!")),
    mate("8/8/8/7k/5Q2/8/8/4K3 w - - 0 1", 7,
      H("The queen has built a box. Make it smaller: mate in 7 moves.", "ਰਾਣੀ ਨੇ ਡੱਬਾ ਬਣਾ ਦਿੱਤਾ ਹੈ। ਉਸ ਨੂੰ ਛੋਟਾ ਕਰੋ: ੭ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ।"),
      H("Shrink the box a row at a time, then bring your king.", "ਡੱਬੇ ਨੂੰ ਇੱਕ-ਇੱਕ ਕਤਾਰ ਛੋਟਾ ਕਰੋ, ਫਿਰ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਲਿਆਓ।")),
  ],
  "3.4": [
    mate("7R/8/8/8/8/6K1/8/6k1 w - - 0 1", 4,
      H("The kings already face each other. Mate in 4 moves.", "ਬਾਦਸ਼ਾਹ ਪਹਿਲਾਂ ਹੀ ਆਹਮੋ-ਸਾਹਮਣੇ ਹਨ। ੪ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।"),
      H("Check on the edge row only when the kings face each other. If they don't, make a waiting rook move.", "ਕੰਢੇ ਦੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਤਾਂ ਹੀ ਦਿਓ ਜਦੋਂ ਬਾਦਸ਼ਾਹ ਆਹਮੋ-ਸਾਹਮਣੇ ਹੋਣ। ਨਹੀਂ ਤਾਂ ਹਾਥੀ ਦੀ ਉਡੀਕ ਵਾਲੀ ਚਾਲ ਚੱਲੋ।")),
    mate("4k3/8/4K3/4R3/8/8/8/8 w - - 0 1", 5,
      H("Kings face each other, rook ready. Mate in 5 moves.", "ਬਾਦਸ਼ਾਹ ਆਹਮੋ-ਸਾਹਮਣੇ ਹਨ, ਹਾਥੀ ਤਿਆਰ ਹੈ। ੫ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ ਦਿਓ।"),
      H("Move the rook along its line to wait. The black king must step aside, then check on the edge.", "ਹਾਥੀ ਨੂੰ ਆਪਣੀ ਲਕੀਰ 'ਤੇ ਚਲਾ ਕੇ ਉਡੀਕ ਕਰੋ। ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਪਾਸੇ ਹਟਣਾ ਪਵੇਗਾ, ਫਿਰ ਕੰਢੇ 'ਤੇ ਸ਼ਹਿ ਦਿਓ।")),
  ],
};

const withHelp = <E extends Exercise>(ex: E, key: string): E => {
  const hint = ex.hint ?? HINTS[key], young = ex.young ?? YOUNG_PROMPTS[key];
  return hint === ex.hint && young === ex.young ? ex : { ...ex, hint, young };
};

/** Lays the hints, young texts and part-drills over a level's lessons. Returns new lesson objects; the originals are untouched. */
export function applyBeginnerHelp(lessons: Lesson[]): Lesson[] {
  return lessons.map(l => ({
    ...l,
    learn: l.learn.map((s, i): Slide => ({ ...s, young: s.young ?? YOUNG_SLIDES[`${l.id}:${i}`], youngSplit: s.youngSplit ?? SPLIT[`${l.id}:${i}`] })),
    try: withHelp(l.try, `${l.id}:try`),
    practise: [...(DRILLS[l.id] ?? []), ...l.practise.map((e, i) => withHelp(e, `${l.id}:p${i}`))],
    challenge: withHelp(l.challenge, `${l.id}:challenge`),
  }));
}

export const HELP_KEYS = { HINTS, YOUNG_SLIDES, YOUNG_PROMPTS, SPLIT };
