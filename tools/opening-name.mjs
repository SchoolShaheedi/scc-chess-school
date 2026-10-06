// Names a move list from the Lichess chess-openings database (CC0, tools/data/openings-*.tsv):
// the entry with the longest PGN that the line starts with. Used by the guard and to name lessons.
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
const rows = ["a", "b", "c", "d", "e"].flatMap(f => readFileSync(new URL(`./data/openings-${f}.tsv`, import.meta.url), "utf8").trim().split("\n").slice(1))
  .map(l => { const [eco, name, pgn] = l.split("\t"); return { eco, name, sans: pgn.replace(/\d+\.\s*/g, "").trim().split(/\s+/) }; });
export function openingName(sans) {
  let best = null;
  for (const r of rows) if (r.sans.length <= sans.length && r.sans.every((m, i) => m === sans[i]) && (!best || r.sans.length > best.sans.length)) best = r;
  return best ? { name: best.name, eco: best.eco, plies: best.sans.length } : null;
}
if (process.argv[2]) {
  const sans = process.argv.slice(2); const g = new Chess(); sans.forEach(m => g.move(m));
  console.log(JSON.stringify(openingName(sans)));
}
