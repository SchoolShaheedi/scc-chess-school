// Builds src/content/book.json, the bots' opening book (chess review 2026-10-04), from the Lichess opening
// database (CC0) already in tools/data. For every position in the first 8 plies it keeps the next moves that
// at least MIN named lines go through: a rough measure of how much theory (so how popular) a move is.
// Run: node tools/build-book.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";

const PLIES = 8, MIN = 3;
const dir = new URL("./data/", import.meta.url);
const counts = new Map();            // prefix (SAN joined by spaces) -> Map(nextSan -> number of lines)
for (const f of readdirSync(dir).filter(f => f.startsWith("openings-"))) {
  for (const row of readFileSync(new URL(f, dir), "utf8").split("\n").slice(1)) {
    const pgn = row.split("\t")[2]; if (!pgn) continue;
    const sans = pgn.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/).slice(0, PLIES);
    const g = new Chess();
    for (let i = 0; i < sans.length; i++) {
      try { g.move(sans[i]); } catch { break; }
      const key = sans.slice(0, i).join(" ");
      if (!counts.has(key)) counts.set(key, new Map());
      const m = counts.get(key); m.set(sans[i], (m.get(sans[i]) ?? 0) + 1);
    }
  }
}
const book = {};
for (const [k, m] of counts) {
  const keep = [...m].filter(([, n]) => n >= MIN).sort((a, b) => b[1] - a[1]);
  if (keep.length) book[k] = Object.fromEntries(keep);
}
writeFileSync(new URL("../src/content/book.json", import.meta.url), JSON.stringify(book));
console.log(`${Object.keys(book).length} positions; start: ${JSON.stringify(book[""])}`);
