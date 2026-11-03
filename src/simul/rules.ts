// The teacher-run class simul (class features 2026-11-03, not yet in DECISIONS.md): what each board is doing, and which board the teacher should go to next.
// Pure and DOM-free, so it is tested (test/simul.test.ts). The teacher plays White on every board and the games are
// untimed, so whose move it is follows from the number of plies played.

/** The parts of a games row a simul needs. */
export interface SimulGame { id: string; moves: string[]; status: "active" | "finished"; result: string | null; reason?: string | null }
export type Outcome = "teacher" | "pupil" | "draw";
export interface BoardState {
  id: string;
  /** Who is to move: null once the board is finished. */
  toMove: "teacher" | "pupil" | null;
  /** Plies played so far. */
  ply: number;
  /** How a finished board ended, from the teacher's side (they are White). */
  outcome: Outcome | null;
}

export function boardState(g: SimulGame): BoardState {
  const ply = g.moves.length;
  if (g.status === "finished") {
    const outcome: Outcome = g.result === "1-0" ? "teacher" : g.result === "0-1" ? "pupil" : "draw";
    return { id: g.id, toMove: null, ply, outcome };
  }
  return { id: g.id, toMove: ply % 2 === 0 ? "teacher" : "pupil", ply, outcome: null };
}

export interface SimulSummary { boards: number; playing: number; waitingForTeacher: number; teacherWon: number; pupilWon: number; drawn: number }
export function summarise(states: BoardState[]): SimulSummary {
  const playing = states.filter(s => s.toMove !== null);
  return {
    boards: states.length, playing: playing.length, waitingForTeacher: playing.filter(s => s.toMove === "teacher").length,
    teacherWon: states.filter(s => s.outcome === "teacher").length, pupilWon: states.filter(s => s.outcome === "pupil").length, drawn: states.filter(s => s.outcome === "draw").length,
  };
}

/** "Next board for me": the first board after the current one (wrapping round) that is waiting for the teacher's move.
 *  With no current board it starts from the top. null when no board is waiting. */
export function nextBoard(states: BoardState[], currentId: string | null): string | null {
  if (!states.length) return null;
  const at = currentId ? states.findIndex(s => s.id === currentId) : -1;
  for (let k = 1; k <= states.length; k++) {
    const s = states[(at + k) % states.length];
    if (s.toMove === "teacher" && s.id !== currentId) return s.id;
  }
  return null;
}

/** Keep the boards in the order the database gave them, replacing the ones that changed and adding new ones. */
export function mergeGames<T extends { id: string }>(old: T[], changed: T[]): T[] {
  const byId = new Map(changed.map(g => [g.id, g]));
  const out = old.map(g => byId.get(g.id) ?? g);
  for (const g of changed) if (!old.some(o => o.id === g.id)) out.push(g);
  return out;
}
