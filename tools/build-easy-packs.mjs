// Builds the EASY puzzle packs for Levels 1-3 (2026-10-29, "no dead ends") from the local CC0 Lichess bank in
// public/puzzles/bank/ (no download needed, unlike tools/build-puzzles.mjs):
//
//   node tools/build-easy-packs.mjs
//
//   hanging-first  one learner move, a piece nothing guards, the ONLY free capture on the board, lowest ratings in the bank
//   defend-first   "stop the threat" puzzles, the lowest-rated defensiveMove puzzles in the bank
//
// The hand-made en passant positions live in tools/data/enpassant-easy.json and are copied in as the pack
// "enpassant-easy" (proved by test/easy-packs.test.ts with Stockfish: COURSE_BUILD=1).
import { readFileSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";

const BANK = new URL("../public/puzzles/bank/", import.meta.url);
const OUT = new URL("../src/content/puzzles/", import.meta.url);
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const ix = JSON.parse(readFileSync(new URL("index.json", BANK), "utf8"));
const all = [];
for (const b of ix.bands) {
  if (b.min > 1100) continue;
  for (const line of readFileSync(new URL(b.file, BANK), "utf8").split("\n").filter(Boolean)) {
    const [id, fen, moves, rating, th] = line.split("\t");
    all.push({ id, fen, moves: moves.split(" "), rating: +rating, themes: th.split(",").map(i => ix.themes[+i]) });
  }
}

const mv = (g, u) => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

/** Every capture of a piece the opponent cannot take back. */
function freeCaptures(g) {
  return g.moves({ verbose: true }).filter(m => {
    if (!m.captured) return false;
    const h = new Chess(g.fen()); h.move(m);
    return !h.isAttacked(m.to, h.turn());
  });
}

// The bank's lowest-rated puzzles are mates and two-step tactics; no one-move "take the free piece" puzzle with the hangingPiece tag
// exists below 700. So the pack is cut from any non-mate puzzle (up to 700) whose FIRST learner move takes the only free piece on the
// board, shortened to that one move. "Free" is proved by geometry here (nothing can take the capturer back), not trusted from a tag.
function hangingFirst(p) {
  if (p.themes.includes("mate") || p.rating > 700) return false;
  const g = new Chess(p.fen);
  try { mv(g, p.moves[0]); } catch { return false; }
  if (g.inCheck()) return false;                                       // no check before check is taught
  const free = freeCaptures(g);
  if (free.length !== 1) return false;                                 // exactly one free piece: no second answer to argue over
  if (free[0].from + free[0].to !== p.moves[1].slice(0, 4)) return false;
  const h = new Chess(g.fen()); h.move(free[0]);
  if (h.inCheck() || h.isGameOver()) return false;                     // and the capture gives no check
  return true;
}

function defendFirst(p) {
  return p.themes.includes("defensiveMove") && !p.themes.includes("mate") && p.moves.length <= 4 && p.rating <= 900;
}

const stats = r => { const s = [...r].sort((a, b) => a - b); return `min ${s[0]} / median ${s[s.length >> 1]} / max ${s.at(-1)}`; };

function write(id, themes, picked, note) {
  writeFileSync(new URL(`${id}.json`, OUT), JSON.stringify({
    source: "Lichess puzzle database, CC0 - https://database.lichess.org/#puzzles (picked from the local bank, lowest ratings first)",
    built: new Date().toISOString().slice(0, 10), pack: { id, themes, note }, puzzles: picked,
  }, null, 1) + "\n");
  console.log(`${id}: ${picked.length} puzzles, ratings ${stats(picked.map(p => p.rating))}`);
}

const hang = all.filter(hangingFirst).sort((a, b) => a.rating - b.rating).slice(0, 40)
  .map(p => ({ ...p, moves: p.moves.slice(0, 2) }));
// the bank has no one-move free-piece puzzle under 500, so the very first ones are hand-made (test/easy-gen.test.ts), nominal rating 300
let handMade = [];
try { handMade = JSON.parse(readFileSync(new URL("data/hanging-handmade.json", new URL("./", import.meta.url)), "utf8")).puzzles; } catch { console.log("no hand-made hanging positions yet"); }
write("hanging-first", ["hangingPiece"], [...handMade, ...hang], "one learner move; the only free capture on the board; no check. ids hm-* are hand-made (nominal 300), the rest are Lichess puzzles shortened to their first learner move");

const def = all.filter(defendFirst).sort((a, b) => a.rating - b.rating).slice(0, 20);
write("defend-first", ["defensiveMove"], def, "lowest-rated defensiveMove puzzles in the bank, at most two learner moves");

try {
  const hm = JSON.parse(readFileSync(new URL("data/enpassant-easy.json", new URL("./", import.meta.url)), "utf8"));
  writeFileSync(new URL("enpassant-easy.json", OUT), JSON.stringify({
    source: "Hand-made for the Chess School, CC0; every position proved with Stockfish (test/easy-packs.test.ts)",
    built: hm.built, pack: { id: "enpassant-easy", themes: ["enPassant"], note: hm.note }, puzzles: hm.puzzles,
  }, null, 1) + "\n");
  console.log(`enpassant-easy: ${hm.puzzles.length} hand-made puzzles, ratings ${stats(hm.puzzles.map(p => p.rating))}`);
} catch (e) { console.log("enpassant-easy: tools/data/enpassant-easy.json not found, skipped"); }
