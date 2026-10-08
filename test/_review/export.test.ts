// Lesson check pass (DECISIONS #93): export one level as data for the review sheet. Run with
//   LEVEL=1 OUT=<file.json> npx vitest run test/_review
// Skipped in normal runs (no LEVEL set).
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { LEVELS, PACKS } from "../../src/content/levels";
import { placementFromFen } from "../../src/chess/types";
import type { Diagram, Exercise, Text } from "../../src/lesson/types";

const level = Number(process.env.LEVEL ?? 0);
type Board = { pieces: Record<string, string>; arrows?: string[][]; highlights?: string[]; dots?: string[]; crosses?: string[]; stars?: string[]; flip?: boolean; coords?: boolean; toMove?: string };
const board = (d?: Diagram & { fen?: string }, extra: Partial<Board> = {}): Board | undefined => {
  if (!d && !extra.pieces) return undefined;
  const pieces = d?.fen ? placementFromFen(d.fen) : (d?.pieces ?? {});
  return { pieces: pieces as Record<string, string>, arrows: d?.arrows, highlights: d?.highlights, dots: d?.dots, crosses: d?.crosses,
    stars: d?.stars, flip: d?.flip, coords: d?.coords, toMove: d?.fen?.split(" ")[1], ...extra };
};
const fenBoard = (fen: string, flip = false): Board => ({ pieces: placementFromFen(fen) as Record<string, string>, toMove: fen.split(" ")[1], flip });

const GOALS: Record<string, string> = {
  "escape-move": "move the king out of check", "escape-capture": "capture the checking piece", "escape-block": "block the check",
  promote: "make a queen first", clear: "capture every pawn", mate: "give checkmate", hold: "hold the draw", wipe: "leave only a king",
};
function exercise(step: string, ex: Exercise) {
  const out: { step: string; prompt?: Text; hint?: Text; note: string; board?: Board; options?: { text: Text; correct?: boolean; why?: Text }[]; targets?: string[] } =
    { step, prompt: ex.prompt, hint: ex.hint, note: "" };
  switch (ex.kind) {
    case "coord": out.note = `Tap the squares in order: ${ex.targets.join(", ")}${ex.coords === false ? " (no coordinates shown)" : ""}`; out.board = { pieces: {}, coords: ex.coords !== false, highlights: [] }; break;
    case "stars": out.note = `Collect the stars${ex.maxMoves ? ` in ${ex.maxMoves} moves` : ""}${ex.only ? ` (only the ${({ R: "rook", B: "bishop", Q: "queen", N: "knight", K: "king", P: "pawn" } as Record<string, string>)[ex.only]} may move)` : ""}`; out.board = board({ pieces: ex.pieces, stars: ex.stars }); break;
    case "safe": out.note = `Walk the king to the star without stepping into attack${ex.maxMoves ? `, in ${ex.maxMoves} moves` : ""}`; out.board = board({ pieces: ex.pieces, stars: [ex.goal] }); break;
    case "place": out.note = `Place in order: ${ex.steps.map(s => s.piece.slice(1)).join(", ")}`; out.board = board({ pieces: ex.start ?? {} }); break;
    case "choose": out.note = "Multiple choice"; out.board = board(ex.board); out.options = ex.options; break;
    case "puzzle": out.note = `Puzzle: ${ex.moves.length} moves${ex.source ? ` (${ex.source})` : ""}`; out.board = fenBoard(ex.fen, ex.fen.split(" ")[1] === "w"); break;
    case "play": out.note = `Play one move: ${GOALS[ex.goal as string] ?? ex.goal}`; out.board = fenBoard(ex.fen); break;
    case "mateVs": out.note = `Mate the lone king within ${ex.maxMoves} moves against the computer`; out.board = fenBoard(ex.fen); break;
    case "engineVs": out.note = `Play it out against Stockfish: ${GOALS[ex.goal] ?? ex.goal} within ${ex.maxMoves} moves`; out.board = fenBoard(ex.fen); break;
    case "line": out.note = `Play the opening line as ${ex.side === "w" ? "White" : "Black"}: ${ex.moves.join(" ")}${ex.opening ? ` (${ex.opening})` : ""}`; break;
    case "engineBest": out.note = "Find a move as good as Stockfish's"; out.board = fenBoard(ex.fen); break;
    case "botGame": out.note = `Mini-game against ${ex.bot}: ${GOALS[ex.goal] ?? ex.goal}`; out.board = fenBoard(ex.fen); break;
    case "pick": out.note = `Tap the squares: ${ex.feature}`; out.board = fenBoard(ex.fen); break;
    case "pack": { const p = PACKS[ex.pack]; out.note = `${ex.count} real-game puzzles from the "${ex.pack}" set (${p.puzzles.length} in the set, Lichess, rated ${Math.min(...p.puzzles.map(x => x.rating))}–${Math.max(...p.puzzles.map(x => x.rating))}). One sample shown.`;
      const s = p.puzzles[0]; out.board = fenBoard(s.fen, s.fen.split(" ")[1] === "w"); break; }
  }
  return out;
}

it.skipIf(!level)("export a level for review", () => {
  const lv = LEVELS[level - 1];
  const lessons = lv.lessons.map(l => ({
    id: l.id, status: l.status, title: l.title, goal: l.goal,
    slides: l.learn.map((s, i) => ({ step: `Learn ${i + 1}`, text: s.text, board: board(s.board) })),
    tasks: [exercise("Try", l.try), ...l.practise.map((e, i) => exercise(`Practice ${i + 1}`, e)), ...(l.challenge ? [exercise("Challenge", l.challenge)] : [])],
  }));
  const test = lv.test ? `Level test: ${lv.test.packs.map(p => `${p.count} from "${p.pack}"`).join(", ")}; pass with ${lv.test.pass}.`
    : lv.botTest ? `Level test: a game against ${lv.botTest}${lv.race ? `, first to capture ${lv.race} pieces wins` : ""}.` : "";
  writeFileSync(process.env.OUT!, JSON.stringify({ level: lv.n, title: lv.title, band: lv.band, test, lessons }));
});
