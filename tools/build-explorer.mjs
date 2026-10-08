// The built-in opening explorer (DECISIONS #85): for each early position, which moves club players chose and how
// each scored. Made from the Lichess rated-games database (CC0, https://database.lichess.org/), streamed and never
// saved: we read games until GAMES are kept, then stop the download (the month's file is ~33 GB; we read ~1-2 GB).
//
//   node tools/build-explorer.mjs
//
// Kept: standard rated blitz, rapid and classical games (no bullet) where BOTH players are rated 1200-2200, so the
// moves are ones a learner will meet at a club. Positions are counted for the first PLIES half-moves.
// Output: public/explorer/explorer.json  { built, games, positions: { "<fen 4 fields>": [[uci, n, whiteWins, draws], ...] } }
// A position is kept if MIN_POS games reached it; a move in it if MIN_MOVE games played it (or it is the top move).
import { mkdirSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";
import { lichessLines } from "./lichess-stream.mjs";

const URL_DB = "https://database.lichess.org/standard/lichess_db_standard_rated_2025-01.pgn.zst";
const OUT = new URL("../public/explorer/", import.meta.url);
const GAMES = Number(process.env.GAMES ?? 600_000), PLIES = 20, ELO_MIN = 1200, ELO_MAX = 2200;
const MIN_POS = 40, MIN_MOVE = 8, PRUNE_EVERY = 100_000;

/** position key: placement, side, castling, en passant (no clocks) */
const key = fen => fen.split(" ").slice(0, 4).join(" ");
const pos = new Map();   // key -> Map(uci -> [n, w, d])
function add(k, uci, res) {
  let m = pos.get(k); if (!m) pos.set(k, (m = new Map()));
  let e = m.get(uci); if (!e) m.set(uci, (e = [0, 0, 0]));
  e[0]++; if (res === "1-0") e[1]++; else if (res === "1/2-1/2") e[2]++;
}
const total = m => { let n = 0; for (const e of m.values()) n += e[0]; return n; };
/** Memory guard: positions seen only once or twice so far are dropped as we go (they would never reach MIN_POS). */
function prune(min) { for (const [k, m] of pos) if (total(m) < min) pos.delete(k); }

const { lines, bytes, stop } = await lichessLines(URL_DB);
let h = {}, kept = 0, seen = 0, last = Date.now();
for await (const line of lines) {
  if (line.startsWith("[")) { const m = /^\[(\w+) "(.*)"\]$/.exec(line); if (m) h[m[1]] = m[2]; continue; }
  if (!line.trim()) continue;
  // the movetext line ends one game
  seen++;
  const ok = /Rated (Blitz|Rapid|Classical) game/.test(h.Event ?? "") && ["1-0", "0-1", "1/2-1/2"].includes(h.Result)
    && [h.WhiteElo, h.BlackElo].every(e => +e >= ELO_MIN && +e <= ELO_MAX);
  if (ok) {
    const sans = line.replace(/\{[^}]*\}/g, " ").replace(/\d+\.(\.\.)?/g, " ").split(/\s+/)
      .filter(t => t && !["1-0", "0-1", "1/2-1/2", "*"].includes(t)).map(t => t.replace(/[?!]+$/, "")).slice(0, PLIES);
    const g = new Chess();
    for (const san of sans) {
      const before = key(g.fen());
      let mv; try { mv = g.move(san); } catch { break; }
      add(before, mv.from + mv.to + (mv.promotion ?? ""), h.Result);
    }
    if (sans.length) kept++;
    if (sans.length && kept % PRUNE_EVERY === 0) prune(Math.ceil(kept / PRUNE_EVERY) + 1);   // once per 100,000 kept (full check 2026-10-08)
  }
  h = {};
  if (Date.now() - last > 20000) { last = Date.now(); console.log(`${seen.toLocaleString()} games read, ${kept.toLocaleString()} kept, ${pos.size.toLocaleString()} positions, ${(bytes() / 1e9).toFixed(2)} GB`); }
  if (kept >= GAMES) break;
}
stop();

const positions = {};
let moves = 0;
for (const [k, m] of pos) {
  if (total(m) < MIN_POS) continue;
  const list = [...m.entries()].sort((a, b) => b[1][0] - a[1][0]).filter(([, e], i) => i === 0 || e[0] >= MIN_MOVE).map(([u, e]) => [u, ...e]);
  positions[k] = list; moves += list.length;
}
mkdirSync(OUT, { recursive: true });
const out = { source: "Lichess rated games, January 2025, CC0 - https://database.lichess.org/", built: new Date().toISOString().slice(0, 10),
  games: kept, players: `${ELO_MIN}-${ELO_MAX}`, plies: PLIES, positions };
writeFileSync(new URL("explorer.json", OUT), JSON.stringify(out));
console.log(`read ${seen.toLocaleString()} games (${(bytes() / 1e9).toFixed(2)} GB); kept ${kept.toLocaleString()}; ${Object.keys(positions).length.toLocaleString()} positions, ${moves.toLocaleString()} moves`);
