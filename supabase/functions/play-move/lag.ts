// Lag allowance for the server-authoritative clocks (online ratings v2, bullet).
// The server charges a mover for the time between its own last write (turn_since) and the moment a move ARRIVES, so a
// slow connection is charged for its own network time: harmless at 10+0, ruinous at 1+0. The mover therefore reports
// its measured round trip (`lag`, ms), and the server forgives at most:
//   * LAG_CAP_MS for one move (the report is untrusted, so one move can never be forgiven more than this), and
//   * what is left of a per-side QUOTA (games.white_quota / black_quota, starts at LAG_QUOTA_MS), which refills a
//     little each move (LAG_REGEN_MS) up to the start value.
// So a modified app can gain at most LAG_QUOTA_MS + LAG_REGEN_MS per move, and an honest player on a bad connection is
// covered. It is pure (no Deno imports) so test/lag.test.ts runs it.
export const LAG_CAP_MS = 250;
export const LAG_QUOTA_MS = 1500;
export const LAG_REGEN_MS = 25;

/** The forgiveness for one move: the reported lag, held to the per-move cap, the quota left and the time actually charged. */
export function lagCredit(reported: unknown, quota: number, elapsedMs: number): number {
  if (typeof reported !== "number" || !Number.isFinite(reported) || reported <= 0) return 0;
  return Math.max(0, Math.min(reported, LAG_CAP_MS, quota, elapsedMs));
}

/** The quota after a move that was forgiven `credit` ms. */
export const nextQuota = (quota: number, credit: number): number => Math.min(LAG_QUOTA_MS, Math.max(0, quota - credit) + LAG_REGEN_MS);

/** How long past zero a clock may be before the OPPONENT may claim the flag: the most this player could still be owed. */
export const flagGrace = (quota: number): number => Math.max(0, Math.min(LAG_CAP_MS, quota));
