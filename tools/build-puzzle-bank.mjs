// The Puzzles tab's big bank (DECISIONS #85): ~50,000 puzzles from the Lichess puzzle database (CC0,
// https://database.lichess.org/#puzzles), spread evenly over ratings 400-2600 in 100-point bands, so every learner has
// thousands near their own rating. Only well-tested puzzles are kept (many plays, well liked, a settled rating), and
// every one is replayed through chess.js; one illegal move and it is dropped. The download is streamed, never saved.
//
//   node tools/build-puzzle-bank.mjs
//
// Output: public/puzzles/bank/r0400.txt ... r2500.txt, one puzzle per line
//   id <TAB> fen <TAB> moves (uci, space-separated) <TAB> rating <TAB> theme indexes (comma-separated)
// and public/puzzles/bank/index.json with the theme names and the count per band and per theme.
// Lichess format reminder: FEN is the position BEFORE the opponent's move; Moves[0] is that opponent move.
import { mkdirSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";
import { lichessLines } from "./lichess-stream.mjs";

const URL_DB = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const OUT = new URL("../public/puzzles/bank/", import.meta.url);
const LOW = 400, HIGH = 2600, STEP = 100, PER_BAND = 2275;          // 22 bands x 2,275 = 50,050
const MIN_PLAYS = 300, MIN_POPULARITY = 85, MAX_RD = 100, MAX_PLY = 10;

const bands = new Map();                     // band start -> lines
for (let b = LOW; b < HIGH; b += STEP) bands.set(b, []);
const themes = [], themeIndex = new Map();
const idx = t => { if (!themeIndex.has(t)) { themeIndex.set(t, themes.length); themes.push(t); } return themeIndex.get(t); };

function legal(fen, mv) {
  const c = new Chess(fen);
  for (const m of mv) { try { c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); } catch { return false; } }
  return true;
}

const { lines, bytes, stop } = await lichessLines(URL_DB);
let rows = 0, kept = 0, last = Date.now();
for await (const line of lines) {
  if (rows++ === 0) continue;   // header
  const [id, fen, moves, rating, rd, popularity, plays, th] = line.split(",");
  const r = +rating, band = Math.floor(r / STEP) * STEP, list = bands.get(band);
  if (!list || list.length >= PER_BAND) continue;
  if (+plays < MIN_PLAYS || +popularity < MIN_POPULARITY || +rd > MAX_RD) continue;
  const mv = moves.split(" ");
  if (mv.length < 2 || mv.length - 1 > MAX_PLY || !legal(fen, mv)) continue;
  list.push([id, fen, moves, r, th.split(" ").map(idx).join(",")].join("\t")); kept++;
  if (Date.now() - last > 15000) { last = Date.now(); console.log(`${rows.toLocaleString()} rows, ${kept.toLocaleString()} kept, ${(bytes() / 1e6).toFixed(0)} MB read`); }
  if ([...bands.values()].every(l => l.length >= PER_BAND)) break;
}
stop();

mkdirSync(OUT, { recursive: true });
const index = { source: "Lichess puzzle database, CC0 - https://database.lichess.org/#puzzles", built: new Date().toISOString().slice(0, 10),
  step: STEP, themes, bands: [], themeCounts: {} };
for (const [b, list] of bands) {
  if (!list.length) continue;
  const file = `r${String(b).padStart(4, "0")}.txt`;
  writeFileSync(new URL(file, OUT), list.join("\n") + "\n");
  index.bands.push({ min: b, file, count: list.length });
  for (const l of list) for (const t of l.split("\t")[4].split(",")) index.themeCounts[themes[+t]] = (index.themeCounts[themes[+t]] ?? 0) + 1;
}
writeFileSync(new URL("index.json", OUT), JSON.stringify(index));
console.log(`read ${rows.toLocaleString()} rows (${(bytes() / 1e6).toFixed(0)} MB); kept ${kept.toLocaleString()} in ${index.bands.length} bands`);
for (const b of index.bands) console.log(`  ${b.min}: ${b.count}`);
