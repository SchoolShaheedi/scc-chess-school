// What is due in the mistake bank today (chess review 2026-10-04). DOM-free, so the tests and Insights can use it
// without the puzzle screens.
import { store, today } from "../store";
import type { Phase } from "../insights/insights";
import { puzzleById } from "./index";

/** The ids due today, soonest first. A lesson puzzle is found in the packs; a big-bank puzzle (DECISIONS #85) by the rating it
 *  was saved with; a personal drill (src/puzzles/mine.ts) carries its own puzzle. `phase` narrows to the drills of one game phase. */
export const bankIds = (phase?: Phase) => Object.entries(store.get().missed).filter(([, c]) => c.due <= today() && (!phase || c.mine?.ph === phase))
  .sort((a, b) => a[1].due.localeCompare(b[1].due)).map(([id]) => id).filter(id => puzzleById(id) || store.get().missed[id].r || store.get().missed[id].mine);
export const bankDue = () => bankIds().length;
/** Personal drills due today, from the learner's own games; for one phase when given (Insights' Practise button). */
export const mineDue = (phase?: Phase) => bankIds(phase).filter(id => store.get().missed[id].mine).length;
