// The placement test's rules (DECISIONS #71), kept free of the DOM so they are tested on their own.
export interface PlacementState { level: number; highest: number; missesHere: number; misses: number; over: boolean }
export const FIRST = 2, LAST = 10, MAX_MISSES = 3;
export const startPlacement = (): PlacementState => ({ level: FIRST, highest: 1, missesHere: 0, misses: 0, over: false });

/** One puzzle's result moves the test on. Pure, so the rules are tested on their own (test/placement.test.ts). */
export function advance(s: PlacementState, solved: boolean): PlacementState {
  if (solved) {
    const highest = s.level;
    return { level: s.level + 1, highest, missesHere: 0, misses: s.misses, over: s.level >= LAST };
  }
  const misses = s.misses + 1, missesHere = s.missesHere + 1;
  return { ...s, misses, missesHere, over: misses >= MAX_MISSES || missesHere >= 2 };
}
