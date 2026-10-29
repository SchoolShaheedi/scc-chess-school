// The Stockfish proofs for the "no dead ends" content (2026-10-29). Slow, so gated like the openings course:
//
//   COURSE_BUILD=1 npx vitest run test/easy-packs.test.ts
//
//  1. hanging-first / enpassant-easy: the answer is Stockfish's best move; for the hand-made positions it beats every other move by 150 cp
//  2. defend-first: the first learner move is within 50 cp of the engine's best
//  3. the Level 3 part-drills: a forced mate exists within the limit (Stockfish's own mate score), the engine mates within the limit
//     against the app's defender and against Stockfish's defence
//  4. "Watch me do it" works on every mate-the-lone-king drill in Level 3 and every Level 1 mini-game (the same watchLine the app uses)
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { PACKS, allLessons } from "../src/content/levels";
import { botById, botMove } from "../src/bots/bots";
import { defend, miniGameResult } from "../src/chess/rules";
import { asNumber } from "../src/engine/uci";
import { watchLine, watchPick } from "../src/lesson/help";
import { nodeEngine } from "./engine";

const GATE = process.env.COURSE_BUILD === "1";

/** Every legal move's score for the side to move, from one multi-line search. */
async function scoreAll(fen: string, depth: number) {
  const e = await nodeEngine(), n = new Chess(fen).moves().length;
  return new Map((await e.candidates(fen, { n, depth })).map(x => [x.move, asNumber(x.score)] as const));
}

async function proveOneMove(pack: string, margin: number, depth: number, only?: (id: string) => boolean) {
  const bad: string[] = [];
  for (const p of PACKS[pack].puzzles) {
    if (only && !only(p.id)) continue;
    const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
    const sc = await scoreAll(g.fen(), depth), want = p.moves[1];
    const best = Math.max(...sc.values()), mine = sc.get(want) ?? -1e9;
    const second = Math.max(...[...sc].filter(([u]) => u !== want).map(([, v]) => v));
    if (mine < best - 30) bad.push(`${p.id}: ${want} scores ${mine}, best is ${best}`);
    else if (margin && mine - second < margin) bad.push(`${p.id}: ${want} beats the next move by only ${mine - second}`);
  }
  return bad;
}

describe.runIf(GATE)("easy packs and part-drills: Stockfish", () => {
  it("hanging-first: the capture is the best move; the hand-made ones by 150 cp", async () => {
    expect(await proveOneMove("hanging-first", 150, 10, id => id.startsWith("hm-"))).toEqual([]);
    expect(await proveOneMove("hanging-first", 0, 10, id => !id.startsWith("hm-"))).toEqual([]);
  }, 600000);

  it("enpassant-easy: the en passant capture is the best move, by 150 cp", async () => {
    expect(await proveOneMove("enpassant-easy", 150, 12)).toEqual([]);
  }, 600000);

  it("defend-first: the first learner move is within 30 cp of the best", async () => {
    const bad: string[] = [];
    for (const p of PACKS["defend-first"].puzzles) {
      const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
      const sc = await scoreAll(g.fen(), 10), mine = sc.get(p.moves[1].slice(0, 4)) ?? sc.get(p.moves[1]) ?? -1e9;
      if (mine < Math.max(...sc.values()) - 30) bad.push(`${p.id}: ${p.moves[1]} scores ${mine}`);
    }
    expect(bad).toEqual([]);
  }, 600000);

  const drills = () => allLessons().flatMap(l => l.practise.filter(e => e.kind === "mateVs" && e.partial).map(e => ({ id: l.id, ex: e as Extract<typeof e, { kind: "mateVs" }> })));

  it("part-drills: a forced mate exists within the limit, and the engine mates within it against the app's defender and against Stockfish", async () => {
    const e = await nodeEngine();
    expect(drills().length).toBeGreaterThanOrEqual(6);
    for (const { id, ex } of drills()) {
      const a = await e.analyse(ex.fen, { depth: 18 });
      expect(a.score.mate, `${id} ${ex.fen}: Stockfish sees no forced mate`).toBeDefined();
      expect(a.score.mate!, `${id} ${ex.fen}: forced mate is longer than the limit`).toBeLessThanOrEqual(ex.maxMoves);
      for (const defender of ["app", "stockfish"] as const) {
        const g = new Chess(ex.fen); let moves = 0;
        while (!g.isGameOver() && moves < ex.maxMoves) {
          // (depth 22: the lite engine does not always see a mate in 3 at depth 14, so the drills are proved deeper than the app plays)
          const best = (await e.analyse(g.fen(), { depth: 22 })).best; g.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }); moves++;
          if (g.isGameOver()) break;
          const reply = defender === "app" ? defend(g.fen())! : (await e.analyse(g.fen(), { depth: 22 })).best;
          g.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
        }
        expect(g.isCheckmate(), `${id} ${ex.fen}: not mated within ${ex.maxMoves} against ${defender}`).toBe(true);
      }
    }
  }, 900000);

  it("Watch me do it mates on every Level 3 mate drill (full and part), within the limit", async () => {
    const e = await nodeEngine();
    for (const l of allLessons().filter(x => x.level === 3)) for (const ex of [l.try, ...l.practise, l.challenge]) {
      if (ex.kind !== "mateVs") continue;
      // a drill may never start with the side NOT to move already in check (an illegal position; 3.3's challenge was one, fixed)
      expect(new Chess(ex.fen.replace(" w ", " b ")).inCheck(), `${l.id} ${ex.fen}: the other king is already in check`).toBe(false);
      let plies = 0;
      const out = await watchLine({
        fen: ex.fen, side: "w", best: async f => (await e.analyse(f, { depth: 18 })).best, reply: async f => defend(f),   // depth 18 as in the app
        show: () => { plies++; }, pause: async () => {}, alive: () => true, stop: g => g.isCheckmate(), maxPlies: 90,
      });
      expect(out, `${l.id} ${ex.fen}`).toBe("stopped");
      if (ex.partial) expect(Math.ceil(plies / 2), `${l.id} ${ex.fen}: watched mate took more than the limit`).toBeLessThanOrEqual(ex.maxMoves);
    }
  }, 900000);

  it("Watch me do it wins the Level 1 mini-games against Titli (at least one win in three tries)", async () => {
    const e = await nodeEngine();
    for (const l of allLessons().filter(x => x.level === 1)) for (const ex of [l.try, ...l.practise, l.challenge]) {
      if (ex.kind !== "botGame") continue;
      const me = new Chess(ex.fen).turn(), bot = botById(ex.bot)!;
      let won = 0;
      for (let k = 0; k < 3 && !won; k++) {
        let verdict: string | null = null;
        await watchLine({
          fen: ex.fen, side: me,
          best: async f => watchPick(f, (await e.candidates(f, { n: 6, depth: 8 })).map(x => ({ move: x.move, score: asNumber(x.score) })), ex.goal),
          reply: async f => botMove(e, f, new Chess(f).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? "")), bot),
          show: () => {}, pause: async () => {}, alive: () => true, maxPlies: 80,
          stop: (g, m) => { verdict = miniGameResult(g, me, ex.goal, m); return verdict !== null; },
        });
        if (verdict === "win") won++;
      }
      expect(won, `${l.id} ${ex.goal} ${ex.fen}`).toBeGreaterThanOrEqual(1);
    }
  }, 900000);
});
