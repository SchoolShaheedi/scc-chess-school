// Builds the small puzzle packs the lessons draw on, from the Lichess puzzle database
// (CC0, https://database.lichess.org/#puzzles). The full file is ~6.1M puzzles, so we stream it,
// keep only what each pack asks for, and stop reading as soon as every pack is full.
//
//   node tools/build-puzzles.mjs
//
// Every kept puzzle is replayed through chess.js; one illegal move and it is dropped.
// Lichess format reminder: FEN is the position BEFORE the opponent's move; Moves[0] is that
// opponent move, and the learner plays Moves[1], Moves[3], ...
import { createZstdDecompress } from "node:zlib";
import { Readable, Transform } from "node:stream";
import { createInterface } from "node:readline";
import { writeFileSync, mkdirSync } from "node:fs";
import { Chess } from "chess.js";

const DB_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const OUT = new URL("../src/content/puzzles/", import.meta.url);

// One entry per lesson that practises on real puzzles. Add packs here as levels are built.
const PACKS = [
  // noCheck (full check 2026-10-05): Level 1 uses this pack before check is taught, so no puzzle may start in check
  // or be solved with a check
  { id: "hanging-easy", themes: ["hangingPiece"], not: ["mate"], min: 0, max: 1100, count: 40, maxPly: 2, noCheck: true },
  // Level 2 (one learner move each, so the theme IS the move: the mate, the promotion, the e.p. capture, the castle)
  { id: "mate1-easy", themes: ["mateIn1"], min: 0, max: 800, count: 60, maxPly: 2 },
  { id: "promotion-easy", themes: ["promotion"], min: 0, max: 1200, count: 25, maxPly: 2 },
  { id: "enpassant", themes: ["enPassant"], min: 0, max: 2400, count: 12, atLeast: 8, maxPly: 2 },
  // Level 3
  { id: "backrank", themes: ["backRankMate", "mateIn1"], min: 0, max: 1000, count: 30, maxPly: 2 },
  { id: "smothered", themes: ["smotheredMate", "mateIn1"], min: 0, max: 1600, count: 15, atLeast: 8, maxPly: 2 },
  { id: "mate1-mid", themes: ["mateIn1"], min: 600, max: 1000, count: 60, maxPly: 2 },
  { id: "defend-easy", themes: ["defensiveMove"], not: ["mate"], min: 0, max: 1600, count: 20, atLeast: 12, maxPly: 4 },
  // Level 4 tactics, Lichess 500-900 (DECISIONS #53); up to two learner moves (the tactic, then the win)
  { id: "fork-easy", themes: ["fork"], min: 500, max: 900, count: 30, atLeast: 15, maxPly: 4 },
  { id: "pin-easy", themes: ["pin"], min: 500, max: 900, count: 25, atLeast: 12, maxPly: 4 },
  { id: "skewer-easy", themes: ["skewer"], min: 500, max: 900, count: 20, atLeast: 10, maxPly: 4 },
  { id: "discovered-easy", themes: ["discoveredAttack"], min: 500, max: 900, count: 20, atLeast: 10, maxPly: 4 },
  { id: "doublecheck-easy", themes: ["doubleCheck"], min: 500, max: 1100, count: 15, atLeast: 8, maxPly: 4 },
  { id: "defender-easy", themes: ["capturingDefender"], min: 500, max: 1000, count: 20, atLeast: 10, maxPly: 4 },
  { id: "trapped-easy", themes: ["trappedPiece"], min: 500, max: 1000, count: 20, atLeast: 10, maxPly: 4 },
  // Level 5 endgames
  { id: "pawn-endgame", themes: ["pawnEndgame"], min: 600, max: 1100, count: 30, atLeast: 15, maxPly: 4 },
  { id: "passed-pawn", themes: ["advancedPawn"], min: 600, max: 1100, count: 25, atLeast: 12, maxPly: 4 },
  { id: "queen-endgame", themes: ["queenEndgame"], min: 600, max: 1200, count: 15, atLeast: 8, maxPly: 4 },
  // Level 6 openings
  { id: "opening-easy", themes: ["opening"], not: ["mate"], min: 600, max: 1100, count: 30, atLeast: 15, maxPly: 4 },
  { id: "opening-mate", themes: ["opening", "mateIn1"], min: 400, max: 1000, count: 15, atLeast: 8, maxPly: 2 },
  // Levels 7-10 are built from the rated bank by tools/build-bank-packs.mjs (real bands, 30-60 puzzles a pack)
  // castling: only 4 one-move puzzles exist in 6.1M (2026-10-02), so lesson 2.4 uses hand-built positions
];
const MIN_PLAYS = 100, MIN_POPULARITY = 80, MAX_ROWS = 7_000_000;

/** No check anywhere in the puzzle: not after the opponent's first move, and no learner move gives one. */
function checkFree(fen, uciMoves) {
  const c = new Chess(fen);
  for (const m of uciMoves) { c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); if (c.inCheck()) return false; }
  return true;
}

function legal(fen, uciMoves) {
  const c = new Chess(fen);
  for (const m of uciMoves) {
    try { c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); }
    catch { return false; }
  }
  return true;
}

// The file is pzstd-style: every zstd frame is preceded by a "skippable frame"
// (magic 0x184D2A50-5F + 4-byte length). Node's decompressor stops dead at the first one,
// which read as "0 rows" - so cut them out and pass only the real frames through.
function stripSkippableFrames() {
  let buf = Buffer.alloc(0), passLeft = 0;
  return new Transform({
    transform(chunk, _enc, done) {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (passLeft > 0) {
          if (!buf.length) break;
          const n = Math.min(passLeft, buf.length);
          this.push(buf.subarray(0, n)); buf = buf.subarray(n); passLeft -= n; continue;
        }
        if (buf.length < 8) break;
        const magic = buf.readUInt32LE(0);
        if ((magic & 0xfffffff0) === 0x184d2a50) {
          const size = buf.readUInt32LE(4);
          if (buf.length < 8 + size) break;
          // pzstd stores the next frame's compressed size in the skippable payload
          passLeft = size === 4 ? buf.readUInt32LE(8) : 0;
          buf = buf.subarray(8 + size);
          if (!passLeft) { this.push(buf); buf = Buffer.alloc(0); passLeft = Infinity; }
        } else { passLeft = Infinity; }
      }
      done();
    },
  });
}

const pools = Object.fromEntries(PACKS.map(p => [p.id, []]));
const res = await fetch(DB_URL);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
const lines = createInterface({
  input: Readable.fromWeb(res.body).pipe(stripSkippableFrames()).pipe(createZstdDecompress()),
});

let rows = 0;
for await (const line of lines) {
  if (rows++ === 0) continue; // header
  const [id, fen, moves, rating, , popularity, plays, themes] = line.split(",");
  const r = +rating, th = themes.split(" "), mv = moves.split(" ");
  if (+plays < MIN_PLAYS || +popularity < MIN_POPULARITY) continue;
  for (const p of PACKS) {
    const pool = pools[p.id];
    if (pool.length >= p.count * 4) continue; // collect 4x then keep the easiest
    if (r < p.min || r > p.max) continue;
    if (!p.themes.every(t => th.includes(t))) continue;
    if (p.not?.some(t => th.includes(t))) continue;
    if (p.anyOf && !p.anyOf.some(t => th.includes(t))) continue;
    if (p.maxPly && mv.length - 1 > p.maxPly) continue;
    if (!legal(fen, mv)) continue;
    if (p.noCheck && !checkFree(fen, mv)) continue;
    pool.push({ id, fen, moves: mv, rating: r, themes: th });
  }
  if (PACKS.every(p => pools[p.id].length >= p.count * 4) || rows > MAX_ROWS) break;
}
lines.close();
res.body.cancel().catch(() => {});

mkdirSync(OUT, { recursive: true });
for (const p of PACKS) {
  const kept = pools[p.id].sort((a, b) => a.rating - b.rating).slice(0, p.count);
  // rare themes (e.p., castling) may set atLeast: a smaller pack is fine, an empty one is not
  if (kept.length < (p.atLeast ?? p.count)) throw new Error(`${p.id}: only ${kept.length} of ${p.count} found in ${rows} rows`);
  writeFileSync(new URL(`${p.id}.json`, OUT), JSON.stringify({
    source: "Lichess puzzle database, CC0 - https://database.lichess.org/#puzzles",
    built: new Date().toISOString().slice(0, 10),
    pack: p, puzzles: kept,
  }, null, 1));
  console.log(`${p.id}: ${kept.length} puzzles, ratings ${kept[0].rating}-${kept.at(-1).rating}`);
}
console.log(`read ${rows.toLocaleString()} rows`);
