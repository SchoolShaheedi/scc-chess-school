// Builds src/content/opening-names.json for Insights (DECISIONS #113): opening FAMILY names ("Italian Game", the part
// of the Lichess name before ":") keyed by the move list that starts them, from the Lichess chess-openings database
// (CC0, tools/data/openings-*.tsv). Lines longer than 12 plies are left out: a family is named well before that.
//     node tools/build-opening-names.mjs
import { readFileSync, writeFileSync } from "node:fs";
const out = {};
for (const f of ["a", "b", "c", "d", "e"]) {
  for (const l of readFileSync(new URL(`./data/openings-${f}.tsv`, import.meta.url), "utf8").trim().split("\n").slice(1)) {
    const [, name, pgn] = l.split("\t");
    const sans = pgn.replace(/\d+\.\s*/g, "").trim().split(/\s+/);
    if (sans.length > 12) continue;
    // British spelling, as the rest of the app writes it ("Sicilian Defence")
    const family = name.split(":")[0].trim().replace(/Defense/g, "Defence"), key = sans.join(" ");
    if (!out[key]) out[key] = family;
  }
}
// drop a line whose family is the same as the shorter line it extends: the shorter one already names it
const keys = Object.keys(out).sort((a, b) => a.length - b.length);
for (const k of keys) { const parts = k.split(" "); for (let n = parts.length - 1; n > 0; n--) { const p = parts.slice(0, n).join(" "); if (out[p]) { if (out[p] === out[k]) delete out[k]; break; } } }
writeFileSync(new URL("../src/content/opening-names.json", import.meta.url), JSON.stringify(out));
console.log(Object.keys(out).length, "lines");
