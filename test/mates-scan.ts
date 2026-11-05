// Reads the whole puzzle bank and keeps every mate puzzle with its final position and what the classifier says it is
// (src/mates/classify.ts). Used by test/mates-build.test.ts, which turns it into the practice index.
import { Chess } from "chess.js";
import { readFileSync } from "node:fs";
import { classify, type PatternId } from "../src/mates/classify";

const DIR = "public/puzzles/bank";
const ix = JSON.parse(readFileSync(`${DIR}/index.json`, "utf8")) as { themes: string[]; bands: { min: number; file: string }[] };

export interface Row { id: string; r: number; n: number; pieces: number; tags: string[]; found: PatternId[]; fen: string; moves: string; final: string }

export function scanBank(): Row[] {
  const rows: Row[] = [];
  for (const b of ix.bands) {
    for (const line of readFileSync(`${DIR}/${b.file}`, "utf8").split("\n").filter(Boolean)) {
      const [id, fen, moves, rating, th] = line.split("\t");
      const tags = th.split(",").map(i => ix.themes[+i]);
      const mn = tags.find(x => /^mateIn[1-5]$/.test(x));
      if (!mn) continue;
      const g = new Chess(fen);
      for (const m of moves.split(" ")) g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
      if (!g.isCheckmate()) continue;
      rows.push({ id, r: +rating, n: +mn.slice(6), pieces: g.board().flat().filter(Boolean).length, tags: tags.filter(x => x.endsWith("Mate")), found: classify(g.fen()), fen, moves, final: g.fen() });
    }
  }
  return rows;
}
