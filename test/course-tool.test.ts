// A drafting tool for the openings course (DECISIONS #127), not a guard: COURSE_TOOL=<input.json> runs it.
// For each candidate it scores every move of the taught side against Stockfish, checks each model-win line (mate,
// or the material it gains), and plays full games from the end of the main line — the taught side at full strength,
// the other side at skills 0..5 — writing everything to <input>.out.txt for the person writing the course.
import { describe, it } from "vitest";
import { Chess } from "chess.js";
import { readFileSync, writeFileSync } from "node:fs";
import { asNumber } from "../src/engine/uci";
import { nodeEngine } from "./engine";

interface Cand { id: string; side: "w" | "b"; main: string; wins?: string[]; skills?: number[] }
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const material = (g: Chess, side: "w" | "b") => g.board().flat().reduce((n, p) => n + (p ? (p.color === side ? 1 : -1) * VAL[p.type] : 0), 0);

describe.runIf(!!process.env.COURSE_TOOL)("openings course drafting tool", () => {
  it("scores, checks and plays out", async () => {
    const file = process.env.COURSE_TOOL!, cands: Cand[] = JSON.parse(readFileSync(file, "utf8"));
    const e = await nodeEngine(), out: string[] = [];
    const score = async (moves: string[], side: "w" | "b") => {
      const g = new Chess(), parts: string[] = [];
      for (const san of moves) {
        const fen = g.fen(), mine = g.turn() === side; let m;
        try { m = g.move(san); } catch { parts.push(`ILLEGAL:${san}`); break; }
        if (!mine) { parts.push(san); continue; }
        if (g.isCheckmate()) { parts.push(`${san}(mate)`); continue; }
        const c = await e.candidates(fen, { n: 3, depth: 14 }), best = asNumber(c[0].score);
        const uci = m.from + m.to + (m.promotion ?? ""), hit = c.find(x => x.move === uci);
        const mineScore = hit ? asNumber(hit.score) : -asNumber((await e.analyse(g.fen(), { depth: 14 })).score);
        const loss = best - mineScore;
        parts.push(`${san}${loss > 35 ? `(!!-${loss} best ${c[0].move})` : ""}`);
      }
      return { g, text: parts.join(" ") };
    };
    for (const c of cands) {
      const main = c.main.split(" ");
      const s = await score(main, c.side);
      out.push(`## ${c.id} (${c.side})\nMAIN ${s.text}\n   eval at end: ${asNumber((await e.analyse(s.g.fen(), { depth: 16 })).score)} (side to move)`);
      for (const w of c.wins ?? []) {
        const r = await score(w.split(" "), c.side);
        out.push(`WIN ${r.g.isCheckmate() ? "MATE" : `material ${material(r.g, c.side)} eval ${asNumber((await e.analyse(r.g.fen(), { depth: 16 })).score)}`} :: ${r.text}`);
      }
      // quick wins: the other side leaves the main line weakly at different moments; keep the shortest mates
      const quick: { len: number; text: string }[] = [];
      for (let k = 2; k < main.length; k++) {
        const g = new Chess(); main.slice(0, k).forEach(m => g.move(m));
        if (g.turn() === c.side) continue;
        while (!g.isGameOver() && g.history().length < k + 50) {
          const a = await e.analyse(g.fen(), g.turn() === c.side ? { depth: 14 } : { depth: 2, skill: 0 });
          const u = a.best; g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        }
        if (g.isCheckmate() && g.turn() !== c.side) quick.push({ len: g.history().length, text: `from ply ${k}: ${g.history().join(" ")}` });
      }
      quick.sort((x, y) => x.len - y.len).slice(0, 3).forEach(q => out.push(`QUICK moves=${Math.ceil(q.len / 2)} ${q.text}`));
      for (const skill of c.skills ?? [0, 1, 2, 3]) {
        const g = new Chess(); main.forEach(m => g.move(m));
        while (!g.isGameOver() && g.history().length < 160) {
          const a = await e.analyse(g.fen(), g.turn() === c.side ? { depth: 14 } : { depth: 6, skill });
          const u = a.best; g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        }
        const won = g.isCheckmate() && g.turn() !== c.side;
        out.push(`GAME skill ${skill} ${won ? "MATE" : g.isCheckmate() ? "LOST" : "nomate"} moves=${Math.ceil(g.history().length / 2)}\n   ${g.history().slice(main.length).join(" ")}`);
      }
      out.push("");
      writeFileSync(file.replace(/\.json$/, ".out.txt"), out.join("\n"));
    }
  }, 7_200_000);
});
