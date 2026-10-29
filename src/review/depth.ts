// How deep the engine looks when it grades a game. Game Review wants depth 14 and Insights depth 12 (2026-10-29, up from
// 10 and 8), but a phone's single-threaded WASM Stockfish is several times slower than a laptop, and a child will not
// wait three minutes for a review. So the depth is GOVERNED: it starts at the target, and when the search is running
// behind the time budget it steps down (never below MIN_DEPTH) for the positions still to come. A fast device keeps
// depth 14 all the way; a slow one finishes inside the budget with a shallower look at the later positions.
// Pure (the clock is passed in), tested in test/depth.test.ts.
export const REVIEW_DEPTH = 14, INSIGHTS_DEPTH = 12, MIN_DEPTH = 8;
/** Total search time Game Review allows itself for one game; Insights allows each game this much. */
export const REVIEW_BUDGET_MS = 55_000, INSIGHTS_BUDGET_MS = 25_000;
/** A search one ply deeper takes about this many times longer (measured on Stockfish 19 lite, MultiPV 2). */
const GROWTH = 1.7;

export class DepthGovernor {
  private spent = 0; private done = 0;
  /** The running average of cost at depth 0 (ms / GROWTH^depth), so positions searched at different depths compare. */
  private unit: number | null = null;
  constructor(private total: number, private max: number, private budgetMs: number, private min = MIN_DEPTH) {}

  /** The depth for the next position. */
  next(): number {
    if (this.unit === null) return this.max;
    const left = Math.max(1, this.total - this.done), allowed = (this.budgetMs - this.spent) / left;
    for (let d = this.max; d > this.min; d--) if (this.unit * GROWTH ** d <= allowed) return d;
    return this.min;
  }
  /** Tell it what the last search cost. */
  record(depth: number, ms: number) {
    this.spent += ms; this.done++;
    const u = ms / GROWTH ** depth;
    this.unit = this.unit === null ? u : this.unit * 0.6 + u * 0.4;
  }
}
