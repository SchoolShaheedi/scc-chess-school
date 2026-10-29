// The openings course guard (DECISIONS #127). Always: every line legal, model lines end as they say, notes and stars
// sit on real plies, and every line has its "also good" squares. With COURSE_BUILD=1 it also asks Stockfish about
// every move of the side being taught (each must be within TOLERANCE of the best) and rewrites course-boxes.json.
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { writeFileSync } from "node:fs";
import { COURSE, type CourseLine } from "../src/content/course";
import BOXES from "../src/content/course-boxes.json";
import { asNumber } from "../src/engine/uci";
import { nodeEngine } from "./engine";

const TOLERANCE = 35, GOOD = 30, DEPTH = 14, WON = 300;
const LINES = ["main", "win", "game"] as const;
// the move that names an opening is the learner's choice of opening, not a mistake: 1...d5, 1...Nf6, 1...g6, 2...c5 (Benoni) and 2.c4 (Reti) are a little below the best move
const NAMING: Record<string, number> = { scandi: 1, alekhine: 1, modern: 1, reti: 2, benoni: 3 };

describe("openings course", () => {
  for (const o of COURSE) for (const k of LINES) {
    const line: CourseLine = o[k];
    it(`${o.id} ${k}: legal, notes on real plies, ends as it says`, () => {
      const g = new Chess();
      for (const san of line.moves) expect(() => g.move(san), `${o.id} ${k} ${san}`).not.toThrow();
      for (const p of Object.keys(line.notes).map(Number)) expect(p).toBeLessThan(line.moves.length);
      for (const p of Object.keys(line.aim ?? {}).map(Number)) expect(p).toBeLessThan(line.moves.length);
      if (line.ends === "mate") expect(g.isCheckmate(), `${o.id} ${k} ends in mate`).toBe(true);
      if (k === "game" || k === "win") expect(g.turn(), `${o.id} ${k}: the learner gives the last move`).not.toBe(o.side);
      expect(Object.keys(line.notes).length, "has notes").toBeGreaterThan(0);
    });
    it(`${o.id} ${k}: has its "also good" squares`, () => {
      expect((BOXES as Record<string, Record<string, unknown>>)[o.id]?.[k], "run COURSE_BUILD=1 npx vitest run test/course.test.ts").toBeTruthy();
    });
  }
  it("every Punjabi line is real Gurmukhi: not garbled bytes, no precomposed nukta letters", () => {
    const texts: string[] = [];
    const walk = (v: unknown): void => {
      if (v && typeof v === "object") {
        const t = v as { pa?: unknown };
        if (typeof t.pa === "string") texts.push(t.pa);
        Object.values(v).forEach(walk);
      }
    };
    walk(COURSE);
    for (const pa of texts) {
      if (!pa) continue;
      expect(pa, "garbled UTF-8 (read as Latin-1)").not.toMatch(/à[\u00a8\u00a9]/);
      expect(pa, "nukta letters are written base + ਼").not.toMatch(/[\u0a33\u0a36\u0a59-\u0a5b\u0a5e]/);
    }
  });
  it("coaching lines (\"Take...\", \"Swap...\") sit on the learner's own moves, not the opponent's", () => {
    const IMP = /^(Take|Swap|Win|Hit|Push|Develop|Castle|Guard|Kick|Pin|Chase|Strike|Step|Make|Bring|Block|Leave|Give|Open|Close|Jump|Stop|Keep|Get|Move|Offer|Break|Fight|Answer)\b/;
    for (const o of COURSE) for (const k of LINES) for (const [p, t] of Object.entries(o[k].notes)) {
      const mover = +p % 2 === 0 ? "w" : "b";
      if (mover !== o.side) expect(t.en, `${o.id} ${k} ply ${p} (${o[k].moves[+p]}) is the opponent's move`).not.toMatch(IMP);
    }
  });
  it("the main lines start the full games", () => {
    for (const o of COURSE) expect(o.game.moves.slice(0, o.main.moves.length)).toEqual(o.main.moves);
  });
});

describe.runIf(process.env.COURSE_BUILD === "1")("openings course: Stockfish", () => {
  it("every taught move is near the best; rebuild the also-good squares", async () => {
    const e = await nodeEngine(), out: Record<string, Record<string, Record<number, string[]>>> = {}, bad: string[] = [];
    // COURSE_ONLY=id,id re-checks just those openings and keeps the others' squares as they are
    const only = process.env.COURSE_ONLY?.split(",");
    for (const o of COURSE) {
      if (only && !only.includes(o.id)) { out[o.id] = (BOXES as typeof out)[o.id]; continue; }
      out[o.id] = {};
      for (const k of LINES) {
        const g = new Chess(), boxes: Record<number, string[]> = {};
        for (const [ply, san] of o[k].moves.entries()) {
          const fen = g.fen(), mine = g.turn() === o.side, m = g.move(san);
          if (!mine) continue;
          const c = await e.candidates(fen, { n: 5, depth: DEPTH }), best = asNumber(c[0].score);
          const uci = m.from + m.to + (m.promotion ?? ""), hit = c.find(x => x.move === uci);
          // a move outside the top five is scored on its own: the position after it, from the other side
          const mine_ = hit ? asNumber(hit.score) : g.isCheckmate() ? best : -asNumber((await e.analyse(g.fen(), { depth: DEPTH })).score);
          // in a won position a move is fine if it keeps a decisive advantage (3 pawns or more): a slower win is still a win
          const decisive = best >= WON && mine_ >= WON;
          if (!g.isCheckmate() && best - mine_ > TOLERANCE && !decisive && NAMING[o.id] !== ply) bad.push(`${o.id} ${k} ${ply} ${san}: loses ${best - mine_} (best ${best}, played ${mine_})`);
          const also = c.filter(x => x.move !== uci && best - asNumber(x.score) <= GOOD && x.move.slice(2, 4) !== m.to).slice(0, 2).map(x => x.move.slice(2, 4));
          if (also.length) boxes[ply] = [...new Set(also)];
        }
        out[o.id][k] = boxes;
      }
    }
    writeFileSync(new URL("../src/content/course-boxes.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
    if (bad.length) writeFileSync(new URL("../course-bad.txt", import.meta.url), bad.join("\n") + "\n");
    expect(bad).toEqual([]);
  }, 3_600_000);
});
