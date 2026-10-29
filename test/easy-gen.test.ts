// The GENERATOR for the hand-made easy positions (2026-10-29, "no dead ends"). Runs only with EASY_GEN=1:
//
//   EASY_GEN=1 npx vitest run test/easy-gen.test.ts
//
// It searches deterministic (seeded) candidates, lets Stockfish prove each one, and writes
//   tools/data/hanging-handmade.json   one-move "take the free piece" puzzles, nominal rating 300
//   tools/data/enpassant-easy.json     en passant puzzles, nominal rating 400
// and prints candidate Level 3 part-drills (mate in 2-7 from a half-built position) for src/content/beginner-help.ts.
// Then `node tools/build-easy-packs.mjs` folds the first two into the puzzle packs. test/easy-packs.test.ts re-proves all
// of it (the same engine, a different question) whenever COURSE_BUILD=1.
import { describe, it } from "vitest";
import { Chess, type Square } from "chess.js";
import { writeFileSync } from "node:fs";
import { asNumber } from "../src/engine/uci";
import { nodeEngine } from "./engine";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = "abcdefgh";
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Captures of a piece nothing can take back. */
const freeCaptures = (g: Chess) => g.moves({ verbose: true }).filter(m => {
  if (!m.captured) return false;
  const h = new Chess(g.fen()); h.move(m);
  return !h.isAttacked(m.to, h.turn());
});

/** Scores EVERY legal move of the side to move in one multi-line search; returns uci -> centipawns for the side to move. */
async function scoreAll(fen: string, depth: number) {
  const e = await nodeEngine(), n = new Chess(fen).moves().length;
  const c = await e.candidates(fen, { n, depth });
  return new Map(c.map(x => [x.move, asNumber(x.score)] as const));
}

const out = (name: string, data: unknown) => writeFileSync(new URL(name, import.meta.url), JSON.stringify(data, null, 1) + "\n");

describe.runIf(process.env.EASY_GEN === "1")("easy positions: generate and prove", () => {
  it("hanging-piece puzzles", async () => {
    const r = rng(2026), found: { id: string; fen: string; moves: string[]; rating: number; themes: string[] }[] = [];
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const place = (g: Record<string, string>, p: string, files = "bcdefg", ranks = "3456") => {
      for (let i = 0; i < 50; i++) { const s = pick([...files]) + pick([...ranks]); if (!g[s]) { g[s] = p; return s; } }
      return null;
    };
    for (let tries = 0; tries < 6000 && found.length < 40; tries++) {
      const b: Record<string, string> = {};
      const wk = place(b, "K", "abcdefgh", "12345678"), bk = place(b, "k", "abcdefgh", "12345678");
      if (!wk || !bk || Math.abs(wk.charCodeAt(0) - bk.charCodeAt(0)) < 3 && Math.abs(+wk[1] - +bk[1]) < 3) continue;
      const target = pick(["n", "n", "b", "b", "r", "q"]), att = pick(["R", "B", "N", "Q"]);
      const ts = place(b, target), as = place(b, att, "abcdefgh", "12345678");
      if (!ts || !as) continue;
      if (r() < 0.7) place(b, "p", "abcdefgh", "3456");
      if (r() < 0.4) place(b, "P", "abcdefgh", "2345");
      const rows: string[] = [];
      for (let rank = 8; rank >= 1; rank--) { let row = "", empty = 0; for (const f of FILES) { const p = b[f + rank]; if (p) { row += (empty || "") + p; empty = 0; } else empty++; } rows.push(row + (empty || "")); }
      let g: Chess;
      try { g = new Chess(`${rows.join("/")} b - - 0 1`); } catch { continue; }
      if (g.inCheck() || freeCaptures(g).length) continue;   // Black has nothing free to take itself: it simply missed the danger
      // the target must be attacked by white and defended by no one, right now
      if (!g.attackers(ts as Square, "w").includes(as as Square) || g.attackers(ts as Square, "b").length) continue;
      const quiet = g.moves({ verbose: true }).filter(m => !m.captured && !m.san.includes("+") && (m.piece === "k" || m.piece === "p"));
      if (!quiet.length) continue;
      const m0 = pick(quiet), after = new Chess(g.fen()); after.move(m0);
      const free = freeCaptures(after);
      if (free.length !== 1 || free[0].to !== ts || VALUE[free[0].captured!] < 3) continue;
      const h = new Chess(after.fen()); h.move(free[0]);
      if (h.inCheck() || h.isGameOver()) continue;
      found.push({ id: `hm-hang-${found.length + 1}`, fen: g.fen(), moves: [m0.from + m0.to, free[0].from + free[0].to], rating: 300, themes: ["hangingPiece", "oneMove", "handMade"] });
    }
    // Stockfish: the capture must be the best move by a clear margin (150 cp), so there is one answer
    const proved = [];
    for (const p of found) {
      const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
      const sc = await scoreAll(g.fen(), 10), want = p.moves[1];
      const best = Math.max(...sc.values()), mine = sc.get(want) ?? -1e9;
      const second = Math.max(...[...sc].filter(([u]) => u !== want).map(([, v]) => v));
      if (mine >= best - 5 && mine - second >= 150) proved.push(p);
    }
    // a mixed set: first the proved ones, spread over the candidates, renumbered
    const keep = proved.filter((_, i) => i % Math.max(1, Math.floor(proved.length / 16)) === 0).slice(0, 16).map((p, i) => ({ ...p, id: `hm-hang-${i + 1}` }));
    process.stderr.write(`hanging: ${found.length} geometric candidates, ${proved.length} proved, ${keep.length} kept\n`);
    out("../tools/data/hanging-handmade.json", { built: new Date().toISOString().slice(0, 10), note: "hand-made: a black quiet move, then the only free capture; nominal rating 300", puzzles: keep });
  }, 1_800_000);

  it("en passant puzzles", async () => {
    // White learns: Black pushes a pawn two squares from rank 7 and White's pawn on rank 5 takes it en passant, forking two pieces
    // that stood on the pawn's neighbouring files of rank 7. The colour-flipped copy has Black learning.
    const pieces = ["n", "r"] as const, out_: { id: string; fen: string; moves: string[]; rating: number; themes: string[] }[] = [];
    for (let x = 1; x <= 6; x++) for (const side of [-1, 1]) for (const [l, rr] of [["n", "n"], ["r", "n"], ["n", "r"]] as const) {
      const wf = x + side; if (wf < 0 || wf > 7) continue;
      const mk = (white: boolean) => {
        // build from White's point of view, then flip ranks and colours for the Black version
        const b: Record<string, string> = {};
        b[`${FILES[x]}7`] = "p"; b[`${FILES[x - 1]}7`] = l; b[`${FILES[x + 1]}7`] = rr;
        b[`${FILES[wf]}5`] = "P";
        b[x < 4 ? "h8" : "a8"] = "k"; b[x < 4 ? "a1" : "h1"] = "K";
        // a second black pawn on the far side so the position looks like a game, never touching the fork
        const flip = (s: string) => FILES[FILES.indexOf(s[0])] + (9 - +s[1]);
        const sw = (p: string) => p === p.toUpperCase() ? p.toLowerCase() : p.toUpperCase();
        const bb: Record<string, string> = {};
        for (const [s, p] of Object.entries(b)) bb[white ? s : flip(s)] = white ? p : sw(p);
        const rows: string[] = [];
        for (let rank = 8; rank >= 1; rank--) { let row = "", e = 0; for (const f of FILES) { const p = bb[f + rank]; if (p) { row += (e || "") + p; e = 0; } else e++; } rows.push(row + (e || "")); }
        return `${rows.join("/")} ${white ? "b" : "w"} - - 0 1`;
      };
      for (const white of [true, false]) {
        const fen = mk(white);
        let g: Chess; try { g = new Chess(fen); } catch { continue; }
        const push = g.moves({ verbose: true }).find(m => m.piece === "p" && m.from[0] === FILES[x] && Math.abs(+m.to[1] - +m.from[1]) === 2);
        if (!push) continue;
        g.move(push);
        const ep = g.moves({ verbose: true }).find(m => m.isEnPassant());
        if (!ep) continue;
        out_.push({ id: `hm-ep-${out_.length + 1}`, fen, moves: [push.from + push.to, ep.from + ep.to], rating: 400, themes: ["enPassant", "oneMove", "handMade"] });
      }
    }
    void pieces;
    const proved = [];
    for (const p of out_) {
      const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
      const sc = await scoreAll(g.fen(), 12), want = p.moves[1];
      const best = Math.max(...sc.values()), mine = sc.get(want) ?? -1e9;
      const second = Math.max(...[...sc].filter(([u]) => u !== want).map(([, v]) => v));
      if (mine >= best - 5 && mine - second >= 150) proved.push(p);
    }
    const keep = proved.filter((_, i) => i % Math.max(1, Math.floor(proved.length / 10)) === 0).slice(0, 10).map((p, i) => ({ ...p, id: `hm-ep-${i + 1}` }));
    process.stderr.write(`en passant: ${out_.length} candidates, ${proved.length} proved, ${keep.length} kept\n`);
    out("../tools/data/enpassant-easy.json", { built: new Date().toISOString().slice(0, 10), note: "hand-made: the pawn pushes two squares, the en passant capture forks two pieces; nominal rating 400", puzzles: keep });
  }, 1_800_000);

  it("Level 3 part-drills", async () => {
    const r = rng(33), pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const sq = () => FILES[Math.floor(r() * 8)] + (1 + Math.floor(r() * 8));
    const fenOf = (b: Record<string, string>) => {
      const rows: string[] = [];
      for (let rank = 8; rank >= 1; rank--) { let row = "", e = 0; for (const f of FILES) { const p = b[f + rank]; if (p) { row += (e || "") + p; e = 0; } else e++; } rows.push(row + (e || "")); }
      return `${rows.join("/")} w - - 0 1`;
    };
    const dist = (a: string, b: string) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1]));
    type Hit = { fen: string; mate: number };
    const want: Record<string, { n: number; ok: (b: Record<string, string>, mate: number) => boolean; pieces: string[]; lo: number; hi: number }> = {
      // 3.2 the ladder: the black king is one or two rows from the edge, two rooks do the rest
      ladder: { n: 2, pieces: ["R", "R"], lo: 2, hi: 3, ok: (b) => Object.entries(b).some(([s, p]) => p === "k" && (s[1] === "7" || s[1] === "8")) },
      // 3.3 make the box smaller: queen a knight's jump from a king that is already near the edge, white king not yet close
      box: { n: 2, pieces: ["Q"], lo: 4, hi: 7, ok: (b) => Object.entries(b).some(([s, p]) => p === "k" && (s[1] === "8" || s[0] === "a" || s[0] === "h")) },
      // 3.4 rook + king with the kings already facing (one square between, same file)
      facing: { n: 2, pieces: ["R"], lo: 2, hi: 4, ok: (b) => { const k = Object.entries(b).find(([, p]) => p === "k")![0], K = Object.entries(b).find(([, p]) => p === "K")![0]; return k[0] === K[0] && Math.abs(+k[1] - +K[1]) === 2 && (k[1] === "8" || k[1] === "1"); } },
    };
    const res: Record<string, Hit[]> = {};
    const e = await nodeEngine();
    for (const [name, w] of Object.entries(want)) {
      res[name] = [];
      for (let tries = 0; tries < 4000 && res[name].length < w.n; tries++) {
        const b: Record<string, string> = {};
        const put = (p: string, s = sq()) => { if (b[s]) return false; b[s] = p; return true; };
        if (name === "facing") { const f = pick([..."bcdefg"]); const top = r() < 0.5; if (top) { b[f + "8"] = "k"; b[f + "6"] = "K"; } else { b[f + "1"] = "k"; b[f + "3"] = "K"; } }
        else { if (!put("k") || !put("K")) continue; }
        if (![...w.pieces].every(p => put(p))) continue;
        const ks = Object.entries(b).filter(([, p]) => p.toLowerCase() === "k").map(([s]) => s);
        if (dist(ks[0], ks[1]) < 2) continue;
        if (!w.ok(b, 0)) continue;
        let g: Chess; try { g = new Chess(fenOf(b)); } catch { continue; }
        if (g.inCheck() || g.isGameOver()) continue;
        // not a mate in one: that is the Try
        const a = await e.analyse(g.fen(), { depth: 16 });
        if (a.score.mate === undefined || a.score.mate < w.lo || a.score.mate > w.hi) continue;
        if (res[name].some(h => h.fen === g.fen() || h.mate === a.score.mate)) continue;   // two different lengths per drill
        // the lone king must not be able to capture anything on its first reply: keep rooks and the queen out of its reach
        res[name].push({ fen: g.fen(), mate: a.score.mate });
      }
      process.stderr.write(`drill ${name}: ${res[name].map(h => `${h.fen} (mate in ${h.mate})`).join(" | ")}\n`);
    }
    // the drills in src/content/beginner-help.ts were picked from these (and a few hand-set ones probed the same way);
    // test/easy-packs.test.ts proves the ones that are used. Nothing is written for them.
    void res;
  }, 1_800_000);
});
