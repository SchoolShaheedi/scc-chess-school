// The learner's rating (chess review 2026-10-04): one Elo number from puzzles (each has a Lichess rating) and
// bot games (each bot has a target rating). It moves fast while new (K 40 for the first 20 results) and settles
// later (K 20). An estimate to steer practice, not an official rating. Pure, tested in test/me.test.ts.
export interface Rating { r: number; n: number }
export const START: Rating = { r: 400, n: 0 };

export const expected = (me: number, opp: number) => 1 / (1 + 10 ** ((opp - me) / 400));

/** score: 1 win/clean solve, 0.5 draw, 0 loss/miss. */
export function update(x: Rating, opp: number, score: number): Rating {
  const k = x.n < 20 ? 40 : 20;
  return { r: Math.round(Math.max(100, x.r + k * (score - expected(x.r, opp)))), n: x.n + 1 };
}

/** A placement result is a better starting point than 400 for someone who already plays. */
export const fromLevel = (level: number) => ({ r: [0, 200, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900][level] ?? 400, n: 0 });
