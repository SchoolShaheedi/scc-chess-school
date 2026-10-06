// The lesson format. A lesson is plain data; the player (player.ts) turns it into screens.
// Every learner-facing string is a Text with BOTH languages - the tests fail if one is missing.
import type { Goal } from "../chess/rules";
import type { Feature } from "../chess/structure";
import type { PieceCode, PieceType, Placement, Square } from "../chess/types";

export interface Text { en: string; pa: string }

/** What a teaching diagram shows. Everything is optional. */
export interface Diagram {
  pieces?: Placement;
  fen?: string;
  arrows?: [Square, Square][];
  highlights?: Square[];      // soft fill, "look here"
  dots?: Square[];            // "this piece can go here"
  crosses?: Square[];         // "not here"
  stars?: Square[];
  flip?: boolean;             // show from Black's side
  /** The (single) arrow is the move being taught: it plays itself on the board, with "Watch again" (DECISIONS #76).
   *  Opt-in, because most arrows show a line of attack, a threat or where a piece aims, not a move. */
  play?: boolean;
  coords?: boolean;
}

export interface Slide { text: Text; board?: Diagram }

interface Base { prompt: Text; hint?: Text }

/** Tap the named squares in order. */
export interface CoordExercise extends Base { kind: "coord"; targets: Square[]; coords?: boolean }
/** Move your piece(s) to collect every star. Black pieces on a star are collected by capturing. */
export interface StarsExercise extends Base {
  kind: "stars"; pieces: Placement; stars: Square[]; maxMoves?: number;
  /** Only this piece type may move; your other pieces are walls. Used before a piece has been taught. */
  only?: PieceType;
}
/** Walk the white king to the goal without ever stepping onto an attacked square. */
export interface SafeExercise extends Base { kind: "safe"; pieces: Placement; goal: Square; maxMoves?: number }
/** Put each piece on its starting square. Any listed square is accepted (e.g. either rook square). */
export interface PlaceExercise extends Base { kind: "place"; start?: Placement; steps: { piece: PieceCode; squares: Square[] }[] }
/** Pick the right answer. */
export interface ChooseExercise extends Base {
  kind: "choose"; board?: Diagram; options: { text: Text; correct?: boolean; why?: Text }[];
}
/** A real position: the learner plays the solution (Lichess convention, see tools/build-puzzles.mjs). */
export interface PuzzleExercise extends Base { kind: "puzzle"; fen: string; moves: string[]; source?: string }
/** A real position, learner to move, with a goal the move must meet (see src/chess/rules.ts). */
export interface PlayExercise extends Base { kind: "play"; fen: string; goal: Goal }
/** Mate the lone king: the learner plays, the app defends with rules.ts defend(), within maxMoves. */
export interface MateVsExercise extends Base { kind: "mateVs"; fen: string; maxMoves: number }
/** Play it out against Stockfish (DECISIONS #57). promote = queen a pawn safely; wipe = leave the opponent
 *  only a king; hold = survive maxMoves without losing. The app stops the drill if the win (or draw) slips. */
export interface EngineVsExercise extends Base {
  kind: "engineVs"; fen: string; goal: "promote" | "wipe" | "hold"; maxMoves: number; depth?: number;
}
/** Play an opening line from the start (DECISIONS #59). The app plays the other side's book moves; the learner
 *  must find their own side's moves. `opening` must match the Lichess opening database name (guarded). */
export interface LineExercise extends Base { kind: "line"; side: "w" | "b"; moves: string[]; opening?: string }
/** Find a good move (DECISIONS #61): Stockfish judges it. Accepted if it scores within `tolerance` centipawns
 *  (default 50) of the engine's best. `idea` is shown after a correct answer: the strategic point. */
export interface EngineBestExercise extends Base { kind: "engineBest"; fen: string; tolerance?: number; idea?: Text }
/** Tap every square that has a structural feature (DECISIONS #63). The answers are COMPUTED by
 *  src/chess/structure.ts from the position, never written by hand. */
/** A mini-game against a bot from a set position (full check 2026-10-05): Pawn Wars ("promote": first to make a
 *  queen wins) or a piece against pawns ("clear": take every enemy piece but the king before a pawn gets through). */
export interface BotGameExercise extends Base { kind: "botGame"; fen: string; bot: string; goal: "promote" | "clear" }
export interface PickExercise extends Base { kind: "pick"; fen: string; feature: Feature; color: "w" | "b" }
/** N puzzles drawn from a built pack (src/content/puzzles/<pack>.json). */
export interface PackExercise extends Base { kind: "pack"; pack: string; count: number }

export type Exercise =
  | CoordExercise | StarsExercise | SafeExercise | PlaceExercise | ChooseExercise | PuzzleExercise | PlayExercise | MateVsExercise | EngineVsExercise | LineExercise | EngineBestExercise | PickExercise | BotGameExercise | PackExercise;

export interface Lesson {
  id: string;                 // "1.2" - matches CURRICULUM.md
  level: number;
  /** DECISIONS #33: "draft" shows a not-yet-checked tag; only the user's word flips it to "checked". */
  status: "draft" | "checked";
  title: Text;
  goal: Text;
  learn: Slide[];
  try: Exercise;
  practise: Exercise[];
  challenge: Exercise;
}

/** A level test (DECISIONS #53): puzzles from packs; pass = right first time on at least `pass` of them. */
export interface LevelTest { packs: { pack: string; count: number }[]; pass: number }

export interface Level {
  n: number;
  test?: LevelTest;
  /** A level whose test is one win against this bot instead of puzzles (Level 1, DECISIONS #69). */
  botTest?: string;
  /** The bot test is a capture race: first to take this many pieces wins (checkmate still wins outright). Level 1
   *  teaches moving and capturing, not mating, so a full game can't be its test (chess review 2026-10-04). */
  race?: number;
  band: string;               // rating band, DECISIONS #28
  title: Text;
  lessons: Lesson[];          // empty = not built yet
  plannedLessons: number;
}
