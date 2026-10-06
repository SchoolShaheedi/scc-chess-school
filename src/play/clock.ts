// A chess clock for over-the-board games on one device (chess review 2026-10-04). Pure: time is passed in,
// so it is tested without waiting (test/play.test.ts). White's clock starts with White's first move, as on
// most online sites, so nobody loses time while getting settled.
export type Side = "w" | "b";
export interface Clock { inc: number; left: Record<Side, number>; turn: Side; since: number | null }

export const newClock = (minutes: number, incSeconds: number): Clock =>
  ({ inc: incSeconds * 1000, left: { w: minutes * 60000, b: minutes * 60000 }, turn: "w", since: null });

/** Milliseconds left for a side right now. */
export const remaining = (c: Clock, side: Side, now: number) =>
  Math.max(0, side === c.turn && c.since !== null ? c.left[side] - (now - c.since) : c.left[side]);

/** The side to move has just moved: charge its time, add the increment, start the other clock. */
export function press(c: Clock, now: number): Clock {
  const side = c.turn, other: Side = side === "w" ? "b" : "w";
  const left = { ...c.left };
  if (c.since !== null) left[side] = Math.max(0, left[side] - (now - c.since)) + c.inc;
  return { ...c, left, turn: other, since: now };
}

/** Taking a move back gives the clock back to the side that moved (its time as it was is not restored). */
export const undoTurn = (c: Clock, now: number): Clock => ({ ...c, turn: c.turn === "w" ? "b" : "w", since: c.since === null ? null : now });

/** The side whose time has run out, if any. */
export const flagged = (c: Clock, now: number): Side | null => c.since !== null && remaining(c, c.turn, now) <= 0 ? c.turn : null;

export function fmt(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (ms < 10000) return (ms / 1000).toFixed(1);     // tenths in the last ten seconds
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
