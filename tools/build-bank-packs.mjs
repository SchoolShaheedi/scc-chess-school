// Rebuilds the Level 7-10 lesson packs from the local rated bank (public/puzzles/bank, 50,050 Lichess puzzles, CC0)
// at each level's REAL rating band (levels.ts: L7 1200-1400, L8 1400-1600, L9 1600-1800, L10 1800-2200), 40-60 puzzles a
// pack so a replayed lesson does not repeat. No download needed:
//
//   node tools/build-bank-packs.mjs
//
// Rare themes (X-ray, interference, named mates) hold too few puzzles in a 200-point band, so the band is widened in
// 100-point steps (at most WIDEN_MAX each side) until the pack is full; the widening is printed. The picks are spread
// evenly across the rating range of the band, so a pack is not all its easiest or all its hardest puzzles.
// tools/build-puzzles.mjs still builds Levels 1-6 (and the packs shared with them: passed-pawn, pawn-endgame).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { Chess } from "chess.js";

const BANK = new URL("../public/puzzles/bank/", import.meta.url);
const OUT = new URL("../src/content/puzzles/", import.meta.url);
const WIDEN_MAX = 300;

const L7 = [1200, 1400], L8 = [1400, 1600], L9 = [1600, 1800], L10 = [1800, 2200];
const PACKS = [
  // Level 7 tactics II
  { id: "mate2", themes: ["mateIn2"], band: L7, count: 60, atLeast: 40, maxPly: 4 },
  { id: "mate3", themes: ["mateIn3"], band: L7, count: 50, atLeast: 40, maxPly: 6 },
  { id: "mate-patterns", themes: ["mate"], anyOf: ["arabianMate", "anastasiaMate", "bodenMate", "hookMate", "dovetailMate"], band: L7, count: 40, atLeast: 30, maxPly: 6 },
  { id: "attraction", themes: ["attraction"], band: L7, count: 50, atLeast: 40, maxPly: 6 },
  { id: "deflection", themes: ["deflection"], band: L7, count: 50, atLeast: 40, maxPly: 6 },
  { id: "intermezzo", themes: ["intermezzo"], band: L7, count: 40, atLeast: 30, maxPly: 6 },
  { id: "interference", themes: ["interference"], band: L7, count: 30, atLeast: 25, maxPly: 6 },
  { id: "clearance", themes: ["clearance"], band: L7, count: 40, atLeast: 30, maxPly: 6 },
  { id: "xray", themes: ["xRayAttack"], band: L7, count: 30, atLeast: 25, maxPly: 6 },
  { id: "sacrifice", themes: ["sacrifice"], band: L7, count: 50, atLeast: 40, maxPly: 6 },
  { id: "quiet", themes: ["quietMove"], band: L7, count: 40, atLeast: 30, maxPly: 6 },
  // Level 8 strategy. No Lichess theme says "open file", "minor pieces" or "weak squares"; "advantage" in the middlegame is
  // the honest match for "find the best plan" (see the report: lessons 8.4 / 8.6 / 8.9 prompts).
  { id: "kingside-attack", themes: ["kingsideAttack"], band: L8, count: 50, atLeast: 40, maxPly: 6 },
  { id: "exposed-king", themes: ["exposedKing"], band: L8, count: 50, atLeast: 40, maxPly: 6 },
  { id: "advantage", themes: ["advantage", "middlegame"], not: ["mate"], band: L8, count: 60, atLeast: 50, maxPly: 4 },
  // Level 9 endgames II
  { id: "rook-endgame", themes: ["rookEndgame"], band: L9, count: 60, atLeast: 40, maxPly: 6 },
  { id: "zugzwang", themes: ["zugzwang"], band: L9, count: 40, atLeast: 30, maxPly: 6 },
  { id: "bishop-endgame", themes: ["bishopEndgame"], band: L9, count: 40, atLeast: 30, maxPly: 6 },
  { id: "knight-endgame", themes: ["knightEndgame"], band: L9, count: 40, atLeast: 30, maxPly: 6 },
  { id: "queen-endgame-hard", themes: ["queenEndgame"], band: L9, count: 40, atLeast: 30, maxPly: 6 },
  { id: "converting", themes: ["endgame", "crushing"], band: L9, count: 60, atLeast: 50, maxPly: 6 },
  // Level 10 calculation
  { id: "long", themes: ["long"], not: ["mate"], band: L10, count: 60, atLeast: 50, maxPly: 8 },
  { id: "very-long", themes: ["veryLong"], band: L10, count: 50, atLeast: 40, maxPly: 10 },
  { id: "defend-hard", themes: ["defensiveMove"], not: ["mate"], band: L10, count: 50, atLeast: 40, maxPly: 6 },
  { id: "mate-hard", themes: ["mate"], band: L10, count: 50, atLeast: 40, maxPly: 8 },
];

const ix = JSON.parse(readFileSync(new URL("index.json", BANK), "utf8"));
const all = [];
for (const b of ix.bands) {
  for (const line of readFileSync(new URL(b.file, BANK), "utf8").split("\n").filter(Boolean)) {
    const [id, fen, m, r, t] = line.split("\t");
    all.push({ id, fen, moves: m.split(" "), rating: +r, themes: t.split(",").map(i => ix.themes[+i]) });
  }
}

function legal(fen, uci) {
  const c = new Chess(fen);
  for (const m of uci) { try { c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); } catch { return false; } }
  return true;
}
const stats = r => {
  const s = [...r].sort((a, b) => a - b);
  return s.length ? `${s.length} puzzles, min ${s[0]} / median ${s[s.length >> 1]} / max ${s.at(-1)}` : "none";
};

const todayStr = new Date().toISOString().slice(0, 10);
for (const p of PACKS) {
  const file = new URL(`${p.id}.json`, OUT);
  const before = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).puzzles.map(x => x.rating) : [];
  const fits = x => p.themes.every(t => x.themes.includes(t)) && !(p.not ?? []).some(t => x.themes.includes(t))
    && (!p.anyOf || p.anyOf.some(t => x.themes.includes(t))) && x.moves.length - 1 <= p.maxPly;
  const base = all.filter(fits);
  let widen = 0, pool = [];
  for (; widen <= WIDEN_MAX; widen += 100) {
    pool = base.filter(x => x.rating >= p.band[0] - widen && x.rating < p.band[1] + widen && legal(x.fen, x.moves));
    if (pool.length >= p.count) break;
  }
  if (pool.length < p.atLeast) throw new Error(`${p.id}: only ${pool.length} found (need ${p.atLeast}) even widened by ${Math.min(widen, WIDEN_MAX)}`);
  pool.sort((a, b) => a.rating - b.rating || (a.id < b.id ? -1 : 1));
  const n = Math.min(p.count, pool.length);
  const kept = Array.from({ length: n }, (_, i) => pool[Math.floor(((i + 0.5) * pool.length) / n)]);
  if (new Set(kept.map(x => x.id)).size !== kept.length) throw new Error(`${p.id}: duplicate picks`);
  writeFileSync(file, JSON.stringify({
    source: "Lichess puzzle database, CC0 - https://database.lichess.org/#puzzles (rated bank, public/puzzles/bank)",
    built: todayStr,
    pack: { id: p.id, themes: p.themes, ...(p.not && { not: p.not }), ...(p.anyOf && { anyOf: p.anyOf }), min: p.band[0], max: p.band[1], widenedBy: Math.min(widen, WIDEN_MAX), count: p.count, atLeast: p.atLeast, maxPly: p.maxPly },
    puzzles: kept,
  }, null, 1));
  console.log(`${p.id.padEnd(20)} before: ${stats(before)}\n${"".padEnd(20)} after:  ${stats(kept.map(x => x.rating))}  (band ${p.band.join("-")}${widen ? `, widened +-${Math.min(widen, WIDEN_MAX)}` : ""})`);
}
