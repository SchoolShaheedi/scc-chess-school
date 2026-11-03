// Puzzle Battle (class features 2026-11-03, not yet in DECISIONS.md): scoring, who wins, the server's judging of a move, the puzzle set, the timing guards,
// that the server's copy of the rules is the app's, and that the SQL keeps its safeguarding promises.
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { UI } from "../src/i18n";
import {
  BATTLE_BANDS, BATTLE_GRACE_MS, BATTLE_MIN_MS, BATTLE_SECONDS, BATTLE_SET, BATTLE_TARGET, clockSkew, compare, inWindow, isLevel, judgedAt,
  judgeMove, outcome, pickSet, plausible, publicOf, raceable, resultFor, type PoolPuzzle, type Tally,
} from "../src/battle/rules";
// @ts-expect-error a plain .mjs build script, no types
import { forServer } from "../tools/sync-battle.mjs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const T = (solved: number, missed = 0, lastAt: number | null = null, idx = solved + missed): Tally => ({ solved, missed, lastAt, idx });
const clock = (nowMs: number, over: Partial<{ setLength: number; startMs: number }> = {}) => ({ startMs: 1_000_000, nowMs, setLength: 20, ...over });
const START = 1_000_000, END = START + BATTLE_SECONDS * 1000;

describe("the server's copy of the rules", () => {
  it("is exactly the app's (run node tools/sync-battle.mjs after changing src/battle/rules.ts)", () => {
    expect(read("../supabase/functions/puzzle-battle/rules.ts")).toBe(forServer(read("../src/battle/rules.ts")));
  });
  it("has no imports, so it runs unchanged in the app and in Deno", () => {
    expect(read("../src/battle/rules.ts")).not.toMatch(/^import /m);
  });
});

describe("who wins", () => {
  it("the first to the target wins at once, even with time left", () => {
    expect(outcome(T(BATTLE_TARGET, 1, START + 90_000), T(3), clock(START + 91_000))).toEqual({ over: true, winner: "a", reason: "target" });
    expect(outcome(T(2), T(BATTLE_TARGET, 0, START + 60_000), clock(START + 61_000))).toEqual({ over: true, winner: "b", reason: "target" });
  });
  it("is not over while both are under the target and time remains", () => {
    expect(outcome(T(4), T(4), clock(END - 1))).toEqual({ over: false, winner: null, reason: null });
  });
  it("at the end of the time, the most correct wins", () => {
    expect(outcome(T(3), T(2), clock(END))).toEqual({ over: true, winner: "a", reason: "time" });
    expect(outcome(T(1), T(4), clock(END + 5000))).toEqual({ over: true, winner: "b", reason: "time" });
  });
  it("level on correct: fewer misses wins, then whoever solved their last one first, then a draw", () => {
    expect(compare(T(3, 4, 5), T(3, 1, 9))).toBe("b");
    expect(compare(T(3, 1, 50_000), T(3, 1, 60_000))).toBe("a");
    expect(compare(T(3, 1, 60_000), T(3, 1, 50_000))).toBe("b");
    expect(compare(T(3, 1, 50_000), T(3, 1, 50_000))).toBe("draw");
    expect(compare(T(0), T(0))).toBe("draw");
    expect(outcome(T(2, 0, 10), T(2, 0, 10), clock(END))).toEqual({ over: true, winner: "draw", reason: "time" });
  });
  it("if both reach the target, the one who got there first wins", () => {
    expect(outcome(T(5, 0, START + 100_000), T(5, 0, START + 90_000), clock(START + 101_000)).winner).toBe("b");
    expect(outcome(T(5, 0, START + 70_000), T(5, 0, START + 90_000), clock(START + 101_000)).winner).toBe("a");
  });
  it("ends early when both have been through the whole set", () => {
    expect(outcome(T(3, 17, 5, 20), T(2, 18, 9, 20), clock(START + 10_000))).toEqual({ over: true, winner: "a", reason: "done" });
    expect(outcome(T(3, 17, 5, 20), T(2, 10, 9, 12), clock(START + 10_000)).over).toBe(false);
  });
  it("respects a different target or length stored on the battle", () => {
    expect(outcome(T(3), T(1), { ...clock(START + 5000), target: 3 }).winner).toBe("a");
    expect(outcome(T(1), T(0), { ...clock(START + 61_000), seconds: 60 })).toEqual({ over: true, winner: "a", reason: "time" });
  });
  it("tells each side its own result", () => {
    expect(resultFor("a", "a")).toBe("won"); expect(resultFor("b", "a")).toBe("lost"); expect(resultFor("b", "draw")).toBe("draw"); expect(resultFor("a", null)).toBeNull();
  });
});

describe("judging a move against the real puzzle line", () => {
  // the first three puzzles of the bank's 500-599 band (Lichess, CC0): moves[0] is the opponent's, the solver's are the odd places
  const bank: PoolPuzzle[] = read("../public/puzzles/bank/r0500.txt").split("\n").filter(Boolean).slice(0, 400).map(l => {
    const [id, fen, moves, rating] = l.split("\t"); return { id, fen, moves: moves.split(" "), rating: +rating };
  });
  const mates = (fen: string, moves: string[], step: number) => (m: string) => {
    const g = new Chess(fen); for (const x of moves.slice(0, step)) g.move({ from: x.slice(0, 2), to: x.slice(2, 4), promotion: x[4] });
    try { g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); return g.isCheckmate(); } catch { return false; }
  };
  it("solving every puzzle in the band move by move is accepted, and the reply is the line's", () => {
    for (const p of bank.slice(0, 60)) {
      let step = 1, solved = false;
      for (let guard = 0; guard < 10 && !solved; guard++) {
        const v = judgeMove(p.moves, step, p.moves[step], mates(p.fen, p.moves, step));
        expect(v.ok, p.id).toBe(true);
        if (v.solved) { solved = true; expect(v.reply).toBeNull(); } else { expect(v.reply).toBe(p.moves[step + 1]); step = v.step; }
      }
      expect(solved, p.id).toBe(true);
    }
  });
  it("a wrong move is refused and does not advance", () => {
    const p = bank[0], v = judgeMove(p.moves, 1, "a1a2", () => false);
    expect(v).toEqual({ ok: false, solved: false, reply: null, step: 1 });
  });
  it("on the LAST move any checkmate is right; on an earlier move it is not", () => {
    const p = bank.find(x => x.moves.length === 4)!;
    expect(judgeMove(p.moves, 1, "a1a2", () => true).ok).toBe(false);            // not the last move: a "mate" does not count
    expect(judgeMove(p.moves, 3, "a1a2", () => true)).toEqual({ ok: true, solved: true, reply: null, step: 1 });
    expect(judgeMove(p.moves, 3, "a1a2", () => false).ok).toBe(false);
  });
  it("refuses a step outside the line", () => {
    expect(judgeMove(["a2a3", "a7a6"], 0, "a7a6", () => true).ok).toBe(false);
    expect(judgeMove(["a2a3", "a7a6"], 2, "a7a6", () => true).ok).toBe(false);
  });
});

describe("the puzzle set", () => {
  const pool = (n: number): PoolPuzzle[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, fen: "8/8/8/8/8/8/8/K6k w - - 0 1", moves: i % 5 === 0 ? ["a1a2", "h1h2", "a2a3", "h2h3", "a3a4", "h3h4"] : ["a1a2", "h1h2"], rating: 500 + (i * 37) % 300 }));
  const seededRand = () => { let x = 7; return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); };
  it("is n different SHORT puzzles, easiest first", () => {
    const set = pickSet(pool(200), BATTLE_SET, seededRand());
    expect(set).toHaveLength(BATTLE_SET);
    expect(new Set(set.map(p => p.id)).size).toBe(BATTLE_SET);
    expect(set.every(raceable)).toBe(true);
    for (let i = 1; i < set.length; i++) expect(set[i].rating).toBeGreaterThanOrEqual(set[i - 1].rating);
  });
  it("two draws differ, and never include a long puzzle", () => {
    const a = pickSet(pool(200), 20, Math.random).map(p => p.id).join(), b = pickSet(pool(200), 20, Math.random).map(p => p.id).join();
    expect(a).not.toBe(b);
    expect(pickSet(pool(10), 20, Math.random).every(p => p.moves.length <= 4)).toBe(true);
  });
  it("what both players are shown never includes the solution", () => {
    const p = pool(1)[0], pub = publicOf(p, 500);
    expect(Object.keys(pub).sort()).toEqual(["band", "fen", "first", "id", "rating"]);
    expect(JSON.stringify(pub)).not.toContain(p.moves[1]);
  });
  it("has real bands for every level", () => {
    const files = new Set(readFileSync(new URL("../public/puzzles/bank/index.json", import.meta.url), "utf8").match(/"min":(\d+)/g)!.map(m => +m.slice(6)));
    for (const bands of Object.values(BATTLE_BANDS)) for (const b of bands) expect(files.has(b), `band ${b}`).toBe(true);
    expect(isLevel("easy") && isLevel("medium") && isLevel("hard") && !isLevel("insane") && !isLevel(undefined)).toBe(true);
  });
});

describe("timing", () => {
  it("answers count only inside the battle (plus the grace)", () => {
    expect(inWindow(START - 1, START)).toBe(false);
    expect(inWindow(START, START)).toBe(true);
    expect(inWindow(END + BATTLE_GRACE_MS, START)).toBe(true);
    expect(inWindow(END + BATTLE_GRACE_MS + 1, START)).toBe(false);
  });
  it("the grace is live: an answer inside it is judged before time ends the battle, after it time wins", () => {
    const a = T(2), b = T(1), c = (nowMs: number) => ({ startMs: START, nowMs, setLength: 20 });
    const inGrace = END + 500;
    expect(outcome(a, b, c(inGrace)).over).toBe(true);                                        // by the real clock it is over...
    expect(outcome(a, b, c(judgedAt(inGrace, START))).over).toBe(false);                      // ...but the answer is judged first
    expect(inWindow(END + BATTLE_GRACE_MS + 1, START)).toBe(false);                            // past the grace the server refuses the answer and time ends it
    expect(judgedAt(START + 1000, START)).toBe(START + 1000);                                 // inside the three minutes nothing changes
  });
  it("a target reached inside the grace still ends the battle", () => {
    expect(outcome(T(5), T(0), { startMs: START, nowMs: judgedAt(END + 500, START), setLength: 20 })).toMatchObject({ over: true, reason: "target" });
  });
  it("refuses a move faster than a person plays", () => {
    expect(plausible(START + BATTLE_MIN_MS - 1, null, START)).toBe(false);
    expect(plausible(START + BATTLE_MIN_MS, null, START)).toBe(true);
    expect(plausible(START + 5000 + 100, START + 5000, START)).toBe(false);
    expect(plausible(START + 5000 + BATTLE_MIN_MS, START + 5000, START)).toBe(true);
  });
  it("works out how far a phone's clock is from the server's", () => {
    expect(clockSkew(10_500, 10_000, 10_000)).toBe(500);       // instant round trip, server 0.5 s ahead
    expect(clockSkew(9_000, 10_000, 10_400)).toBe(-1_200);     // 400 ms round trip, server behind
    expect(clockSkew(5_000, 4_000, 6_000)).toBe(0);
  });
});

describe("the words", () => {
  const keys = Object.keys(UI).filter(k => k.startsWith("battle") || k.startsWith("simul")) as (keyof typeof UI)[];
  it("has strings for the battle and the simul", () => { expect(keys.length).toBeGreaterThan(40); });
  it("every one has both languages, real Gurmukhi, decomposed nukta, and no space before a ਡੰਡੀ", () => {
    for (const k of keys) {
      const { en, pa } = UI[k] as { en: string; pa: string };
      expect(en.trim(), `${k} en`).toBeTruthy(); expect(pa.trim(), `${k} pa`).toBeTruthy();
      expect(pa, `${k}: Gurmukhi`).toMatch(/[਀-੿]/);
      expect(pa, `${k}: garbled`).not.toMatch(/[�À-ÿ]/);
      expect(pa, `${k}: precomposed nukta`).not.toMatch(/[ਲ਼ਸ਼ਖ਼-ਜ਼ਫ਼]/);
      expect(pa, `${k}: space before ਡੰਡੀ`).not.toMatch(/ ।/);
      expect(pa.replace(/\{[a-z]\}/g, ""), `${k}: Arabic digits in Gurmukhi prose`).not.toMatch(/[0-9]/);
    }
  });
});

describe("the SQL keeps its promises (supabase/battles.sql)", () => {
  const sql = read("../supabase/battles.sql");
  it("a battle can be read only by its two players, and written by nobody directly", () => {
    expect(sql).toMatch(/create policy "players read own battles" on public\.battles for select to authenticated\s+using \(public\.owns_player\(from_player\) or public\.owns_player\(to_player\)\)/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.battles for (insert|update|delete|all)/);
    expect(sql).toMatch(/alter table public\.battles enable row level security/);
  });
  it("an invitation asks can_play (friends or classmates only) and the start asks the same rule again", () => {
    expect(sql).toMatch(/battle_invite[\s\S]*?not public\.can_play\(p_player, p_to\)/);
    expect(sql).toMatch(/battle_begin[\s\S]*?not public\.battle_can_pair\(b\.from_player, b\.to_player\)/);
    expect(sql).toMatch(/and accepted\)\s*or exists/);   // friendships must be ACCEPTED
  });
  it("the starting functions are callable only by the server function, never by a signed-in user", () => {
    expect(sql).toMatch(/grant execute on function public\.battle_can_pair\(uuid, uuid\), public\.battle_begin\(uuid, uuid, jsonb\) to service_role/);
    const grants = sql.match(/grant execute on function[\s\S]*?to authenticated;/g)!.join("\n");
    expect(grants).not.toMatch(/battle_begin|battle_can_pair|in_battle/);
  });
  it("the stored puzzle set may not carry a solution", () => {
    expect(sql).toMatch(/not e \? 'moves'/);
  });
  it("there is no free-text column on a battle", () => {
    const table = sql.match(/create table if not exists public\.battles \(([\s\S]*?)\n\);/)![1];
    const text = [...table.matchAll(/^\s+(\w+)\s+text\b/gm)].map(m => m[1]);
    expect(text.sort()).toEqual(["level", "reason", "status", "winner"]);       // each one a fixed list (check ... in (...))
    for (const col of text) expect(table, col).toMatch(new RegExp(`${col}\\s+text[^\\n]*check \\(${col} in \\(`));
  });
});
