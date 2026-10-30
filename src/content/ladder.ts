// The Endgame ladder (2026-10-30): rungs that open in order, each a famous endgame the learner must WIN, or HOLD (draw)
// against full-strength Stockfish. Every position and its claim is proved by test/ladder.test.ts (LADDER_PROOF=1);
// a rung that cannot be proved is not here. The play itself is the existing "engineVs" exercise (src/lesson/exercises.ts).
// ALL TEXT DRAFT until the user checks it (DECISIONS #25, #33).
import type { EngineVsExercise, Slide, Text } from "../lesson/types";

export interface Rung {
  id: string;
  title: Text;
  goal: Text;
  /** "win" = checkmate, a promotion or the enemy army gone, with the win kept; "draw" = hold: reach the last move, or a draw by rule. */
  claim: "win" | "draw";
  learn: Slide[];
  ex: EngineVsExercise;
}

// Both sides play at depth 14 on a phone: Stockfish lite, full strength (no Skill Level), the same depth the proofs use.
const D = 14;

export const RUNGS: Rung[] = [
  {
    id: "opposition", claim: "win",
    title: { en: "Opposition", pa: "ਆਹਮੋ-ਸਾਹਮਣਾ" },
    goal: { en: "Win a king and pawn ending by taking the opposition.", pa: "ਆਹਮੋ-ਸਾਹਮਣਾ ਲੈ ਕੇ ਬਾਦਸ਼ਾਹ ਅਤੇ ਪਿਆਦੇ ਦੀ ਅੰਤਲੀ ਖੇਡ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "The kings face each other with one square between. Whoever must move has to step aside. Having the opposition means it is the OTHER side's turn.", pa: "ਬਾਦਸ਼ਾਹ ਇੱਕ ਖਾਨਾ ਛੱਡ ਕੇ ਆਹਮੋ-ਸਾਹਮਣੇ ਹਨ। ਜਿਸ ਦੀ ਵਾਰੀ ਹੋਵੇ, ਉਸ ਨੂੰ ਪਾਸੇ ਹਟਣਾ ਪੈਂਦਾ ਹੈ। ਆਹਮੋ-ਸਾਹਮਣਾ ਤੁਹਾਡੇ ਕੋਲ ਹੋਣ ਦਾ ਮਤਲਬ ਹੈ ਕਿ ਵਾਰੀ ਦੂਜੇ ਪਾਸੇ ਦੀ ਹੈ।" },
        board: { fen: "8/8/8/3k4/8/4K3/4P3/8 w - - 0 1", arrows: [["e3", "d3"]], highlights: ["d3", "d5"] } },
      { text: { en: "Your king walks in front of your pawn and keeps their king from getting ahead. Their king gives way, yours steps forward, then the pawn runs to the end.", pa: "ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਪਿਆਦੇ ਦੇ ਅੱਗੇ-ਅੱਗੇ ਤੁਰਦਾ ਹੈ ਅਤੇ ਵਿਰੋਧੀ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਅੱਗੇ ਨਹੀਂ ਨਿਕਲਣ ਦਿੰਦਾ। ਵਿਰੋਧੀ ਦਾ ਬਾਦਸ਼ਾਹ ਹਟਦਾ ਹੈ, ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਅੱਗੇ ਵਧਦਾ ਹੈ, ਫਿਰ ਪਿਆਦਾ ਅਖੀਰਲੀ ਕਤਾਰ ਤੱਕ ਦੌੜਦਾ ਹੈ।" },
        board: { fen: "8/8/8/3k4/8/4K3/4P3/8 w - - 0 1", arrows: [["e3", "f4"]], highlights: ["e2"] } },
    ],
    ex: { kind: "engineVs", fen: "8/8/8/3k4/8/4K3/4P3/8 w - - 0 1", goal: "queen", maxMoves: 14, depth: D,
      prompt: { en: "Win: queen your pawn. Take the opposition and walk your king in front of the pawn.", pa: "ਜਿੱਤੋ: ਆਪਣੇ ਪਿਆਦੇ ਨੂੰ ਰਾਣੀ ਬਣਾਓ। ਆਹਮੋ-ਸਾਹਮਣਾ ਲਓ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਲੈ ਜਾਓ।" },
      hint: { en: "Do not push the pawn yet. Move your king up the board (Kd3, Kf3 or Kf4).", pa: "ਹਾਲੇ ਪਿਆਦਾ ਨਾ ਧੱਕੋ। ਬਾਦਸ਼ਾਹ ਨੂੰ ਅੱਗੇ ਵਧਾਓ (Kd3, Kf3 ਜਾਂ Kf4)।" } },
  },
  {
    id: "lucena", claim: "win",
    title: { en: "Lucena: build a bridge", pa: "ਲੂਸੇਨਾ: ਪੁਲ ਬਣਾਓ" },
    goal: { en: "Win with rook and pawn.", pa: "ਹਾਥੀ ਅਤੇ ਪਿਆਦੇ ਨਾਲ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "Your pawn is on the 7th rank and your king stands in front of it, but their rook keeps your king boxed in. Your rook has cut their king off along a file.", pa: "ਤੁਹਾਡਾ ਪਿਆਦਾ ਸੱਤਵੀਂ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਹੈ ਅਤੇ ਬਾਦਸ਼ਾਹ ਉਸ ਦੇ ਅੱਗੇ ਹੈ, ਪਰ ਉਨ੍ਹਾਂ ਦਾ ਹਾਥੀ ਤੁਹਾਡੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਬਾਹਰ ਨਿਕਲਣ ਨਹੀਂ ਦਿੰਦਾ। ਤੁਹਾਡੇ ਹਾਥੀ ਨੇ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਇੱਕ ਖੜ੍ਹੀ ਕਤਾਰ ਤੋਂ ਕੱਟਿਆ ਹੋਇਆ ਹੈ।" },
        board: { fen: "4k1K1/6P1/8/8/8/8/7r/5R2 w - - 0 1", highlights: ["f1"] } },
      { text: { en: "Step 1: lift your rook to the 4th rank. Step 2: walk your king out beside the pawn. Step 3: when they check, your rook steps in front of the check. That is the bridge.", pa: "ਪਹਿਲਾ ਕਦਮ: ਆਪਣੇ ਹਾਥੀ ਨੂੰ ਚੌਥੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਲਿਆਓ। ਦੂਜਾ ਕਦਮ: ਬਾਦਸ਼ਾਹ ਨੂੰ ਪਿਆਦੇ ਦੇ ਨਾਲ ਬਾਹਰ ਕੱਢੋ। ਤੀਜਾ ਕਦਮ: ਜਦੋਂ ਉਹ ਸ਼ਹਿ ਦੇਣ, ਤੁਹਾਡਾ ਹਾਥੀ ਸ਼ਹਿ ਦੇ ਅੱਗੇ ਆ ਜਾਂਦਾ ਹੈ। ਇਹੀ ਪੁਲ ਹੈ।" },
        board: { fen: "4k1K1/6P1/8/8/8/8/7r/5R2 w - - 0 1", arrows: [["f1", "f4"]] } },
    ],
    ex: { kind: "engineVs", fen: "4k1K1/6P1/8/8/8/8/7r/5R2 w - - 0 1", goal: "promote", maxMoves: 15, depth: D,
      prompt: { en: "Win: queen the pawn, or make Black give up the rook for it.", pa: "ਜਿੱਤੋ: ਪਿਆਦੇ ਨੂੰ ਰਾਣੀ ਬਣਾਓ, ਜਾਂ ਕਾਲੇ ਨੂੰ ਪਿਆਦੇ ਬਦਲੇ ਹਾਥੀ ਦੇਣ 'ਤੇ ਮਜਬੂਰ ਕਰੋ।" },
      hint: { en: "Lift the rook to the 4th rank (Rf4), then walk the king out.", pa: "ਹਾਥੀ ਨੂੰ ਚੌਥੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਲਿਆਓ (Rf4), ਫਿਰ ਬਾਦਸ਼ਾਹ ਨੂੰ ਬਾਹਰ ਕੱਢੋ।" } },
  },
  {
    id: "philidor", claim: "draw",
    title: { en: "Philidor: hold the draw", pa: "ਫ਼ਿਲੀਡੋਰ: ਬਰਾਬਰੀ ਬਚਾਓ" },
    goal: { en: "Draw a rook endgame a pawn down with the third-rank defence.", pa: "ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ ਦੇ ਬਚਾਅ ਨਾਲ ਇੱਕ ਪਿਆਦਾ ਘੱਟ ਹੋ ਕੇ ਵੀ ਬਰਾਬਰੀ ਬਚਾਓ।" },
    learn: [
      { text: { en: "You are Black. Keep your rook on your 3rd rank (the 6th rank on the board) so their king cannot step forward, and keep your king in front of their pawn.", pa: "ਤੁਸੀਂ ਕਾਲੇ ਹੋ। ਆਪਣਾ ਹਾਥੀ ਆਪਣੀ ਤੀਜੀ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ (ਬੋਰਡ ਦੀ ਛੇਵੀਂ ਕਤਾਰ) ਰੱਖੋ ਤਾਂ ਜੋ ਉਨ੍ਹਾਂ ਦਾ ਬਾਦਸ਼ਾਹ ਅੱਗੇ ਨਾ ਵਧ ਸਕੇ, ਅਤੇ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਉਨ੍ਹਾਂ ਦੇ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਰੱਖੋ।" },
        board: { fen: "4k3/8/r7/3KP3/8/8/8/7R b - - 0 1", flip: true, highlights: ["a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6"] } },
      { text: { en: "When their pawn steps to the 6th rank, their king has nowhere to hide. Swing your rook to the far end and check from behind.", pa: "ਜਦੋਂ ਉਨ੍ਹਾਂ ਦਾ ਪਿਆਦਾ ਛੇਵੀਂ ਕਤਾਰ 'ਤੇ ਆ ਜਾਵੇ, ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਕੋਲ ਲੁਕਣ ਦੀ ਥਾਂ ਨਹੀਂ ਰਹਿੰਦੀ। ਹਾਥੀ ਨੂੰ ਦੂਜੇ ਸਿਰੇ ਲੈ ਜਾਓ ਅਤੇ ਪਿੱਛਿਓਂ ਸ਼ਹਿ ਦਿਓ।" },
        board: { fen: "4k3/8/r3P3/3K4/8/8/8/7R b - - 0 1", flip: true, arrows: [["a6", "a1"]] } },
    ],
    ex: { kind: "engineVs", fen: "4k3/8/r7/3KP3/8/8/8/7R b - - 0 1", goal: "hold", maxMoves: 12, depth: D,
      prompt: { en: "Hold the draw: do not let White make progress.", pa: "ਬਰਾਬਰੀ ਬਚਾਓ: ਚਿੱਟੇ ਨੂੰ ਅੱਗੇ ਨਾ ਵਧਣ ਦਿਓ।" },
      hint: { en: "Keep the rook on the 6th rank, and do not let their king get past it.", pa: "ਹਾਥੀ ਨੂੰ ਛੇਵੀਂ ਲੇਟਵੀਂ ਕਤਾਰ 'ਤੇ ਰੱਖੋ ਅਤੇ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਉਸ ਤੋਂ ਅੱਗੇ ਨਾ ਲੰਘਣ ਦਿਓ।" } },
  },
  {
    id: "vancura", claim: "draw",
    title: { en: "Vancura: attack from the side", pa: "ਵਾਂਚੂਰਾ: ਪਾਸਿਓਂ ਹਮਲਾ" },
    goal: { en: "Draw against a rook pawn on the 6th by attacking it from the side.", pa: "ਛੇਵੀਂ ਕਤਾਰ 'ਤੇ ਕਿਨਾਰੇ ਦੇ ਪਿਆਦੇ ਨੂੰ ਪਾਸਿਓਂ ਹਮਲਾ ਕਰ ਕੇ ਬਰਾਬਰੀ ਬਚਾਓ।" },
    learn: [
      { text: { en: "Their pawn is on a6, guarded by their rook. Put your rook on the same rank, far away at the side, and attack the pawn along the rank.", pa: "ਉਨ੍ਹਾਂ ਦਾ ਪਿਆਦਾ a6 'ਤੇ ਹੈ ਅਤੇ ਉਨ੍ਹਾਂ ਦਾ ਹਾਥੀ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ। ਆਪਣਾ ਹਾਥੀ ਉਸੇ ਕਤਾਰ 'ਤੇ ਪਾਸੇ ਦੂਰ ਰੱਖੋ ਅਤੇ ਕਤਾਰ ਵਿੱਚ ਪਿਆਦੇ 'ਤੇ ਹਮਲਾ ਕਰੋ।" },
        board: { fen: "8/5k2/P4r2/8/8/8/R7/4K3 b - - 0 1", flip: true, arrows: [["f6", "h6"]] } },
      { text: { en: "Their rook is stuck guarding the pawn, so their king gets no help. Stay far away along the rank, so you always have room to check.", pa: "ਉਨ੍ਹਾਂ ਦਾ ਹਾਥੀ ਪਿਆਦੇ ਦੀ ਰਾਖੀ ਵਿੱਚ ਬੱਝਿਆ ਹੈ, ਇਸ ਲਈ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਮਦਦ ਨਹੀਂ ਮਿਲਦੀ। ਕਤਾਰ ਵਿੱਚ ਦੂਰ ਰਹੋ, ਤਾਂ ਜੋ ਸ਼ਹਿ ਦੇਣ ਲਈ ਹਮੇਸ਼ਾ ਥਾਂ ਰਹੇ।" },
        board: { fen: "8/5k2/P6r/8/8/8/R7/4K3 w - - 0 1", flip: true, highlights: ["h6", "a6"] } },
    ],
    ex: { kind: "engineVs", fen: "8/5k2/P4r2/8/8/8/R7/4K3 b - - 0 1", goal: "hold", maxMoves: 12, depth: D,
      prompt: { en: "Hold the draw. Attack the pawn from the side.", pa: "ਬਰਾਬਰੀ ਬਚਾਓ। ਪਿਆਦੇ 'ਤੇ ਪਾਸਿਓਂ ਹਮਲਾ ਕਰੋ।" },
      hint: { en: "Take the rook to the far end of the 6th rank (Rh6).", pa: "ਹਾਥੀ ਨੂੰ ਛੇਵੀਂ ਕਤਾਰ ਦੇ ਦੂਰਲੇ ਸਿਰੇ ਲੈ ਜਾਓ (Rh6)।" } },
  },
  {
    id: "queen-centre", claim: "win",
    title: { en: "Queen against a centre pawn", pa: "ਰਾਣੀ ਬਨਾਮ ਵਿਚਕਾਰਲਾ ਪਿਆਦਾ" },
    goal: { en: "Stop a pawn that is one step from queening, and win.", pa: "ਰਾਣੀ ਬਣਨ ਤੋਂ ਇੱਕ ਕਦਮ ਦੂਰ ਪਿਆਦੇ ਨੂੰ ਰੋਕੋ ਅਤੇ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "Their pawn is one step from becoming a queen. Your queen must stop it with checks, not by chasing.", pa: "ਉਨ੍ਹਾਂ ਦਾ ਪਿਆਦਾ ਰਾਣੀ ਬਣਨ ਤੋਂ ਇੱਕ ਕਦਮ ਦੂਰ ਹੈ। ਤੁਹਾਡੀ ਰਾਣੀ ਨੇ ਉਸ ਨੂੰ ਸ਼ਹਿਆਂ ਨਾਲ ਰੋਕਣਾ ਹੈ, ਪਿੱਛਾ ਕਰ ਕੇ ਨਹੀਂ।" },
        board: { fen: "8/8/8/8/8/K3Q3/3p4/3k4 w - - 0 1", arrows: [["a3", "b3"]] } },
      { text: { en: "A check can force their king in front of its own pawn, which blocks it. Your queen keeps them boxed in while your king walks closer. Take care not to stalemate!", pa: "ਸ਼ਹਿ ਨਾਲ ਉਨ੍ਹਾਂ ਦਾ ਬਾਦਸ਼ਾਹ ਆਪਣੇ ਹੀ ਪਿਆਦੇ ਦੇ ਅੱਗੇ ਆ ਜਾਂਦਾ ਹੈ, ਜਿਸ ਨਾਲ ਪਿਆਦਾ ਰੁਕ ਜਾਂਦਾ ਹੈ। ਤੁਹਾਡੀ ਰਾਣੀ ਉਨ੍ਹਾਂ ਨੂੰ ਘੇਰੀ ਰੱਖਦੀ ਹੈ ਅਤੇ ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਆਉਂਦਾ ਹੈ। ਧਿਆਨ ਰੱਖੋ, ਖੜੋਤ ਨਾ ਹੋ ਜਾਵੇ!" },
        board: { fen: "8/8/8/8/8/K3Q3/3p4/3k4 w - - 0 1", highlights: ["d2", "d1"] } },
    ],
    ex: { kind: "engineVs", fen: "8/8/8/8/8/K3Q3/3p4/3k4 w - - 0 1", goal: "wipe", maxMoves: 15, depth: D,
      prompt: { en: "Win: capture the pawn or checkmate. Do not let it queen, and do not stalemate!", pa: "ਜਿੱਤੋ: ਪਿਆਦਾ ਮਾਰੋ ਜਾਂ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ। ਉਸ ਨੂੰ ਰਾਣੀ ਨਾ ਬਣਨ ਦਿਓ, ਅਤੇ ਖੜੋਤ ਤੋਂ ਬਚੋ!" },
      hint: { en: "Your queen already holds them. Walk your king closer (Kb3).", pa: "ਤੁਹਾਡੀ ਰਾਣੀ ਨੇ ਉਨ੍ਹਾਂ ਨੂੰ ਪਹਿਲਾਂ ਹੀ ਰੋਕਿਆ ਹੋਇਆ ਹੈ। ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਲਿਆਓ (Kb3)।" } },
  },
  {
    id: "queen-knight", claim: "win",
    title: { en: "Queen against a knight pawn", pa: "ਰਾਣੀ ਬਨਾਮ ਘੋੜੇ ਦਾ ਪਿਆਦਾ" },
    goal: { en: "Bring your king to help the queen, and win.", pa: "ਰਾਣੀ ਦੀ ਮਦਦ ਲਈ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਲਿਆਓ ਅਤੇ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "A pawn on the b-file (or g-file) is harder: the queen alone cannot win. Your king must walk over while the queen keeps their king boxed in.", pa: "b ਖੜ੍ਹੀ ਕਤਾਰ (ਜਾਂ g ਖੜ੍ਹੀ ਕਤਾਰ) ਦਾ ਪਿਆਦਾ ਔਖਾ ਹੈ: ਇਕੱਲੀ ਰਾਣੀ ਜਿੱਤ ਨਹੀਂ ਸਕਦੀ। ਤੁਹਾਡਾ ਬਾਦਸ਼ਾਹ ਚੱਲ ਕੇ ਆਵੇ, ਅਤੇ ਰਾਣੀ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਘੇਰ ਕੇ ਰੱਖੇ।" },
        board: { fen: "8/8/8/8/Q7/6K1/1p6/1k6 w - - 0 1", arrows: [["g3", "f2"]] } },
      { text: { en: "Use the queen to check and pin them in the corner, and use every free move to bring your king closer. Then finish with a mate or take the pawn.", pa: "ਰਾਣੀ ਨਾਲ ਸ਼ਹਿ ਦਿਓ ਅਤੇ ਉਨ੍ਹਾਂ ਨੂੰ ਕੋਨੇ ਵਿੱਚ ਰੱਖੋ, ਅਤੇ ਹਰ ਖਾਲੀ ਚਾਲ ਨਾਲ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਲਿਆਓ। ਫਿਰ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ ਜਾਂ ਪਿਆਦਾ ਮਾਰੋ।" },
        board: { fen: "8/8/8/8/Q7/6K1/1p6/1k6 w - - 0 1", highlights: ["b1", "b2"] } },
    ],
    ex: { kind: "engineVs", fen: "8/8/8/8/Q7/6K1/1p6/1k6 w - - 0 1", goal: "wipe", maxMoves: 20, depth: D,
      prompt: { en: "Win: capture the pawn or checkmate. Do not stalemate!", pa: "ਜਿੱਤੋ: ਪਿਆਦਾ ਮਾਰੋ ਜਾਂ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ। ਖੜੋਤ ਤੋਂ ਬਚੋ!" },
      hint: { en: "Walk your king closer first (Kf2): the queen keeps their king boxed in.", pa: "ਪਹਿਲਾਂ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਲਿਆਓ (Kf2): ਰਾਣੀ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਘੇਰੀ ਰੱਖਦੀ ਹੈ।" } },
  },
  {
    id: "queen-bishop-pawn", claim: "draw",
    title: { en: "Save the pawn: a draw against a queen", pa: "ਪਿਆਦੇ ਨਾਲ ਬਰਾਬਰੀ: ਰਾਣੀ ਵਿਰੁੱਧ" },
    goal: { en: "Hold a draw with a pawn on the 7th against a queen, using stalemate.", pa: "ਸੱਤਵੀਂ ਕਤਾਰ ਦੇ ਪਿਆਦੇ ਨਾਲ ਰਾਣੀ ਵਿਰੁੱਧ ਖੜੋਤ ਦੀ ਚਾਲ ਨਾਲ ਬਰਾਬਰੀ ਬਚਾਓ।" },
    learn: [
      { text: { en: "Now you play the side with the pawn. A pawn on the a-, c-, f- or h-file can draw against a queen when the enemy king is far away.", pa: "ਹੁਣ ਤੁਸੀਂ ਪਿਆਦੇ ਵਾਲੇ ਪਾਸੇ ਖੇਡੋਗੇ। a, c, f ਜਾਂ h ਖੜ੍ਹੀ ਕਤਾਰ ਦਾ ਪਿਆਦਾ ਰਾਣੀ ਵਿਰੁੱਧ ਬਰਾਬਰੀ ਕਰਵਾ ਸਕਦਾ ਹੈ, ਜਦੋਂ ਦੁਸ਼ਮਣ ਦਾ ਬਾਦਸ਼ਾਹ ਦੂਰ ਹੋਵੇ।" },
        board: { fen: "8/8/8/8/5Q2/6K1/1kp5/8 b - - 0 1", flip: true } },
      { text: { en: "Keep your king beside the pawn, on the edge. Their queen cannot take away every square without a stalemate, so every time they come close, look for the stalemate.", pa: "ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਕਿਨਾਰੇ 'ਤੇ ਪਿਆਦੇ ਦੇ ਕੋਲ ਰੱਖੋ। ਉਨ੍ਹਾਂ ਦੀ ਰਾਣੀ ਖੜੋਤ ਤੋਂ ਬਿਨਾਂ ਹਰ ਖਾਨਾ ਨਹੀਂ ਰੋਕ ਸਕਦੀ, ਇਸ ਲਈ ਜਦੋਂ ਵੀ ਉਹ ਨੇੜੇ ਆਉਣ, ਖੜੋਤ ਲੱਭੋ।" },
        board: { fen: "8/8/8/8/5Q2/6K1/1kp5/8 b - - 0 1", flip: true, highlights: ["b2", "c2"] } },
    ],
    ex: { kind: "engineVs", fen: "8/8/8/8/5Q2/6K1/1kp5/8 b - - 0 1", goal: "hold", maxMoves: 8, depth: D,
      prompt: { en: "Hold the draw: do not let White win.", pa: "ਬਰਾਬਰੀ ਬਚਾਓ: ਚਿੱਟੇ ਨੂੰ ਜਿੱਤਣ ਨਾ ਦਿਓ।" },
      hint: { en: "Keep your king next to the pawn and look for a stalemate.", pa: "ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਪਿਆਦੇ ਦੇ ਕੋਲ ਰੱਖੋ ਅਤੇ ਖੜੋਤ ਲੱਭੋ।" } },
  },
  {
    id: "reti", claim: "draw",
    title: { en: "Réti's king walk", pa: "ਰੇਤੀ ਦੀ ਬਾਦਸ਼ਾਹ-ਚਾਲ" },
    goal: { en: "Draw by walking the king so it works two ways at once.", pa: "ਬਾਦਸ਼ਾਹ ਨੂੰ ਇਸ ਤਰ੍ਹਾਂ ਤੋਰੋ ਕਿ ਉਹ ਇੱਕੋ ਵੇਲੇ ਦੋ ਕੰਮ ਕਰੇ, ਅਤੇ ਬਰਾਬਰੀ ਕਰੋ।" },
    learn: [
      { text: { en: "Black's h-pawn is about to run, and White's king looks too far away to catch it. But a king can walk diagonally, covering two jobs at once.", pa: "ਕਾਲੇ ਦਾ h ਪਿਆਦਾ ਦੌੜਨ ਵਾਲਾ ਹੈ, ਅਤੇ ਚਿੱਟੇ ਦਾ ਬਾਦਸ਼ਾਹ ਉਸ ਨੂੰ ਫੜਨ ਲਈ ਬਹੁਤ ਦੂਰ ਲੱਗਦਾ ਹੈ। ਪਰ ਬਾਦਸ਼ਾਹ ਤਿਰਛਾ ਤੁਰ ਕੇ ਇੱਕੋ ਵੇਲੇ ਦੋ ਕੰਮ ਸਾਂਭ ਸਕਦਾ ਹੈ।" },
        board: { fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1", arrows: [["h8", "g7"]] } },
      { text: { en: "From g7 the king can catch the h-pawn, or hurry back to help its own c-pawn, whichever Black chooses. Walk it along the diagonal.", pa: "g7 ਤੋਂ ਬਾਦਸ਼ਾਹ h ਪਿਆਦੇ ਨੂੰ ਫੜ ਸਕਦਾ ਹੈ, ਜਾਂ ਆਪਣੇ c ਪਿਆਦੇ ਦੀ ਮਦਦ ਲਈ ਮੁੜ ਸਕਦਾ ਹੈ, ਜੋ ਵੀ ਕਾਲਾ ਚੁਣੇ। ਇਸ ਨੂੰ ਤਿਰਛੀ ਲਕੀਰ ਵਿੱਚ ਤੋਰੋ।" },
        board: { fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1", arrows: [["h8", "g7"], ["g7", "f6"], ["f6", "e5"]] } },
    ],
    ex: { kind: "engineVs", fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1", goal: "hold", maxMoves: 6, depth: D,
      prompt: { en: "Draw the game: Black's pawn is racing to queen. Find the king walk that saves it.", pa: "ਬਰਾਬਰੀ ਕਰੋ: ਕਾਲੇ ਦਾ ਪਿਆਦਾ ਰਾਣੀ ਬਣਨ ਲਈ ਦੌੜ ਰਿਹਾ ਹੈ। ਉਹ ਬਾਦਸ਼ਾਹ-ਚਾਲ ਲੱਭੋ ਜੋ ਬਚਾ ਲਵੇ।" },
      hint: { en: "Start with Kg7!, then walk the king along the diagonal.", pa: "Kg7! ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ, ਫਿਰ ਬਾਦਸ਼ਾਹ ਨੂੰ ਤਿਰਛੀ ਲਕੀਰ ਵਿੱਚ ਤੋਰੋ।" } },
  },
  {
    id: "queen-rook", claim: "win",
    title: { en: "Queen against rook", pa: "ਰਾਣੀ ਬਨਾਮ ਹਾਥੀ" },
    goal: { en: "Win the rook with a fork.", pa: "ਦੋਹਰੇ ਹਮਲੇ ਨਾਲ ਹਾਥੀ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "A queen beats a rook, but the win takes technique. Their rook stays next to its king, so first bring your own king closer.", pa: "ਰਾਣੀ ਹਾਥੀ ਨੂੰ ਹਰਾ ਦਿੰਦੀ ਹੈ, ਪਰ ਜਿੱਤ ਲਈ ਸਲੀਕਾ ਚਾਹੀਦਾ ਹੈ। ਉਨ੍ਹਾਂ ਦਾ ਹਾਥੀ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਦੇ ਕੋਲ ਰਹਿੰਦਾ ਹੈ, ਇਸ ਲਈ ਪਹਿਲਾਂ ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਲਿਆਓ।" },
        board: { fen: "8/8/8/2k5/2r5/8/3K4/Q7 w - - 0 1", arrows: [["d2", "d3"]] } },
      { text: { en: "Then look for a fork: a queen check that also attacks the rook wins it. Their rook has to stay close to its king, so the chances come again and again. Do not stalemate!", pa: "ਫਿਰ ਦੋਹਰਾ ਹਮਲਾ ਲੱਭੋ: ਰਾਣੀ ਦੀ ਉਹ ਸ਼ਹਿ ਜੋ ਹਾਥੀ 'ਤੇ ਵੀ ਹਮਲਾ ਕਰੇ, ਹਾਥੀ ਜਿੱਤ ਲੈਂਦੀ ਹੈ। ਉਨ੍ਹਾਂ ਦੇ ਹਾਥੀ ਨੂੰ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਦੇ ਨੇੜੇ ਰਹਿਣਾ ਪੈਂਦਾ ਹੈ, ਇਸ ਲਈ ਮੌਕੇ ਮੁੜ-ਮੁੜ ਮਿਲਦੇ ਹਨ। ਖੜੋਤ ਤੋਂ ਬਚੋ!" },
        board: { fen: "8/8/8/2k5/2r5/8/3K4/Q7 w - - 0 1", highlights: ["c4", "c5"] } },
    ],
    ex: { kind: "engineVs", fen: "8/8/8/2k5/2r5/8/3K4/Q7 w - - 0 1", goal: "wipe", maxMoves: 25, depth: D, slip: 200,
      prompt: { en: "Win: capture the rook (or checkmate).", pa: "ਜਿੱਤੋ: ਹਾਥੀ ਮਾਰੋ (ਜਾਂ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ)।" },
      hint: { en: "Walk your king closer (Kd3), then look for a check that also attacks the rook.", pa: "ਆਪਣਾ ਬਾਦਸ਼ਾਹ ਨੇੜੇ ਲਿਆਓ (Kd3), ਫਿਰ ਉਹ ਸ਼ਹਿ ਲੱਭੋ ਜੋ ਹਾਥੀ 'ਤੇ ਵੀ ਹਮਲਾ ਕਰੇ।" } },
  },
  {
    id: "bishop-knight", claim: "win",
    title: { en: "Bishop and knight mate", pa: "ਊਠ ਅਤੇ ਘੋੜੇ ਦੀ ਸ਼ਹਿ-ਮਾਤ" },
    goal: { en: "Checkmate with a bishop, a knight and the king.", pa: "ਊਠ, ਘੋੜੇ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" },
    learn: [
      { text: { en: "Bishop and knight can checkmate, but only in a corner of the bishop's colour. Your bishop is dark-squared, so the mate happens in the h8 or a1 corner.", pa: "ਊਠ ਅਤੇ ਘੋੜਾ ਸ਼ਹਿ-ਮਾਤ ਕਰ ਸਕਦੇ ਹਨ, ਪਰ ਸਿਰਫ਼ ਊਠ ਦੇ ਰੰਗ ਦੇ ਕੋਨੇ ਵਿੱਚ। ਤੁਹਾਡਾ ਊਠ ਗੂੜ੍ਹੇ ਖਾਨਿਆਂ ਦਾ ਹੈ, ਇਸ ਲਈ ਸ਼ਹਿ-ਮਾਤ h8 ਜਾਂ a1 ਕੋਨੇ ਵਿੱਚ ਹੁੰਦੀ ਹੈ।" },
        board: { fen: "7k/8/8/5K2/8/8/8/6BN w - - 0 1", highlights: ["h8", "a1"] } },
      { text: { en: "Use all three pieces: the king hems their king in, the bishop takes the long diagonal, the knight covers the last squares. Mind the stalemate!", pa: "ਤਿੰਨੋਂ ਮੋਹਰੇ ਵਰਤੋ: ਬਾਦਸ਼ਾਹ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਘੇਰਦਾ ਹੈ, ਊਠ ਲੰਮੀ ਤਿਰਛੀ ਲਕੀਰ ਸਾਂਭਦਾ ਹੈ, ਘੋੜਾ ਆਖ਼ਰੀ ਖਾਨੇ ਢੱਕਦਾ ਹੈ। ਖੜੋਤ ਦਾ ਧਿਆਨ ਰੱਖੋ!" },
        board: { fen: "7k/8/8/5K2/8/8/8/6BN w - - 0 1", arrows: [["g1", "c5"], ["f5", "g6"]] } },
    ],
    ex: { kind: "engineVs", fen: "7k/8/8/5K2/8/8/8/6BN w - - 0 1", goal: "mate", maxMoves: 12, depth: D,
      prompt: { en: "Win: checkmate their king.", pa: "ਜਿੱਤੋ: ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ-ਮਾਤ ਕਰੋ।" },
      hint: { en: "Bring the bishop to the long diagonal and the king closer, and keep their king in the corner.", pa: "ਊਠ ਨੂੰ ਲੰਮੀ ਤਿਰਛੀ ਲਕੀਰ 'ਤੇ ਅਤੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਨੇੜੇ ਲਿਆਓ, ਅਤੇ ਉਨ੍ਹਾਂ ਦੇ ਬਾਦਸ਼ਾਹ ਨੂੰ ਕੋਨੇ ਵਿੱਚ ਰੱਖੋ।" } },
  },
];

export const rungById = (id: string) => RUNGS.find(r => r.id === id);
/** The ladder opens in order: a rung is open once the one before it is finished (the first is always open). */
export const rungIndex = (id: string) => RUNGS.findIndex(r => r.id === id);
