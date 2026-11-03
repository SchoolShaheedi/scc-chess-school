// Glicko-2 (Glickman, 2013), the rating system of Lichess and chess.com. This is the reference copy of the maths in
// supabase/online_ratings.sql (glicko2_update): the server rates every game, the app only reads the result. Both are
// checked against the published worked example (test/online-rating.test.ts; the SQL run in tools/sql-check).
export const Q = 173.7178;                // the Glicko-2 scale factor
export const START_RATING = 1200, START_RD = 350, START_VOL = 0.06;
export const DEFAULT_TAU = 0.75;
/** A rating deviation above this is still "provisional": the app shows a "?" (the Lichess rule). */
export const PROVISIONAL_RD = 110;

export interface Rating { r: number; rd: number; vol: number }
export interface Result { r: number; rd: number; score: number }   // an opponent's rating and RD, and my score (1, 0.5, 0)

const g = (phi: number) => 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
const expected = (mu: number, muj: number, phij: number) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

/** One rating period against any number of opponents. With no results only the deviation grows. */
export function glicko2(p: Rating, results: Result[], tau = DEFAULT_TAU): Rating {
  const mu = (p.r - 1500) / Q, phi = p.rd / Q, sigma = p.vol;
  if (!results.length) return { r: p.r, rd: Math.min(350, Math.sqrt(phi * phi + sigma * sigma) * Q), vol: p.vol };
  let vInv = 0, dsum = 0;
  for (const o of results) {
    const muj = (o.r - 1500) / Q, phij = o.rd / Q, e = expected(mu, muj, phij);
    vInv += g(phij) ** 2 * e * (1 - e);
    dsum += g(phij) * (o.score - e);
  }
  const v = 1 / vInv, delta = v * dsum, a = Math.log(sigma * sigma);
  const f = (x: number) => Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x)) / (2 * (phi * phi + v + Math.exp(x)) ** 2) - (x - a) / (tau * tau);
  let A = a, B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * tau) < 0 && k < 100) k++; B = a - k * tau; }
  let fA = f(A), fB = f(B);
  for (let i = 0; Math.abs(B - A) > 1e-6 && i < 100; i++) {   // the Illinois algorithm
    const C = A + (A - B) * fA / (fB - fA), fC = f(C);
    if (fC * fB < 0) { A = B; fA = fB; } else fA /= 2;
    B = C; fB = fC;
  }
  const sigmaNew = Math.exp(A / 2), phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  return { r: Q * (mu + phiNew * phiNew * dsum) + 1500, rd: phiNew * Q, vol: sigmaNew };
}

/** The deviation grown for time away (0.21436 rating periods a day), capped at 350. */
export const decayRd = (rd: number, vol: number, days: number) => Math.min(350, Math.sqrt(rd * rd + (Q * vol) ** 2 * Math.max(0, days) * 0.21436));

/** The bounds the server keeps: rating 100..4000, deviation 45..350, volatility 0.01..0.1. */
export const bounded = (p: Rating): Rating => ({ r: Math.min(4000, Math.max(100, p.r)), rd: Math.min(350, Math.max(45, p.rd)), vol: Math.min(0.1, Math.max(0.01, p.vol)) });

/** A whole game between two players, the way rate_game() does it: both updated from the other's rating before the game. */
export function rateGame(white: Rating, black: Rating, whiteScore: 0 | 0.5 | 1, tau = DEFAULT_TAU): { white: Rating; black: Rating; whiteDelta: number; blackDelta: number } {
  const w = bounded(glicko2(white, [{ r: black.r, rd: black.rd, score: whiteScore }], tau));
  const b = bounded(glicko2(black, [{ r: white.r, rd: white.rd, score: 1 - whiteScore }], tau));
  return { white: w, black: b, whiteDelta: Math.round(w.r) - Math.round(white.r), blackDelta: Math.round(b.r) - Math.round(black.r) };
}

export const isProvisional = (rd: number) => rd > PROVISIONAL_RD;
/** "1432" or "1432?" for a provisional rating. */
export const ratingText = (r: number, provisional: boolean) => `${Math.round(r)}${provisional ? "?" : ""}`;
/** "+8" or "−7" (a real minus sign); "±0" for no change. */
export const deltaText = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "±0");
