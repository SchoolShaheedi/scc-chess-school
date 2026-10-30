// Engine proofs for the master games' notes: any note that calls a mate forced or a position winning carries a claim
// (src/master/games.ts), checked here with Stockfish at depth 18 or more. Slow, so it runs only on request:
//   MASTER_PROOF=1 npx vitest run test/master-proof.test.ts
// MASTER_INFO=1 also prints the engine's view at every noted position (to check the wording by eye).
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { asNumber } from "../src/engine/uci";
import { GAMES, NOTES, replay } from "../src/master/games";
import { nodeEngine } from "./engine";

const DEPTH = 18;
const on = !!process.env.MASTER_PROOF;
/** Vitest hides console output here, so the numbers go to the file named by MASTER_OUT (and the console). */
const report = (rows: string[]) => { console.log(rows.join("\n")); if (process.env.MASTER_OUT) appendFileSync(process.env.MASTER_OUT, rows.join("\n") + "\n"); };

describe.skipIf(!on)("master games: engine proofs (depth 18)", () => {
  for (const g of GAMES) {
    it(`${g.id}: every claimed mate and advantage holds`, async () => {
      const e = await nodeEngine(), line = replay(g);
      const rows: string[] = [];
      for (const note of NOTES[g.id]) {
        const c = note.claim;
        if (!c) continue;
        const fen = line.fens[c.at], turn = fen.split(" ")[1];
        const a = await e.analyse(fen, { depth: DEPTH });
        // the score is from the side to move; turn it into the claimed side's view
        const sign = turn === c.by ? 1 : -1;
        if (c.t === "mate") {
          const m = a.score.mate;
          rows.push(`${g.id} ${note.k} mate: score ${JSON.stringify(a.score)} turn ${turn} best ${a.best}`);
          expect(m, "a mate score").toBeDefined();
          expect(sign * m!, "mate for the claimed side").toBeGreaterThan(0);
          expect(Math.abs(m!), `mate within ${c.max}`).toBeLessThanOrEqual(c.max);
        } else {
          const mine = sign * asNumber(a.score);
          rows.push(`${g.id} ${note.k} adv: ${mine} cp for ${c.by} (needs ${c.cp})`);
          expect(mine).toBeGreaterThanOrEqual(c.cp);
        }
      }
      report(rows);
    }, 300000);
  }

  it.skipIf(!process.env.MASTER_INFO)("prints the evaluation at every noted position", async () => {
    const e = await nodeEngine();
    const out: string[] = [];
    for (const g of GAMES) {
      const line = replay(g);
      for (const note of NOTES[g.id]) {
        const a = await e.analyse(line.fens[note.n], { depth: DEPTH });
        const turn = line.fens[note.n].split(" ")[1];
        const w = (turn === "w" ? 1 : -1) * asNumber(a.score);
        out.push(`${g.id} ${note.k} (after ${note.n} plies, ${turn} to move): ${w > 50000 ? "mate for white" : w < -50000 ? "mate for black" : (w / 100).toFixed(2)} best ${a.best}`);
      }
    }
    report(out);
  }, 900000);
});
