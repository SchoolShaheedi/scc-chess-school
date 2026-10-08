// The content guard. Runs on every build (npm run check). A lesson that cannot be solved,
// a puzzle with an illegal move, or a string missing a language fails the build.
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { attackedBy, drillMoves, move } from "../src/chess/drill";
import { engineGoalMet, judge, SLIP, solutions } from "../src/chess/rules";
import { asNumber } from "../src/engine/uci";
import { nodeEngine } from "./engine";
// @ts-expect-error plain JS helper shared with the build tools
import { openingName } from "../tools/opening-name.mjs";
import { type Placement, isSquare, placementFromFen } from "../src/chess/types";
import { LEVELS, PACKS, allLessons, expand } from "../src/content/levels";
import { answerSquares } from "../src/chess/structure";
import { UI } from "../src/i18n";
import type { Exercise, SafeExercise, StarsExercise, Text } from "../src/lesson/types";

const key = (p: Placement) => Object.entries(p).sort().map(([s, x]) => s + x).join(",");

/** Fewest moves that collect every star (any white piece may move), or Infinity. */
export function minStars(ex: StarsExercise, cap = 10): number {
  let frontier: [Placement, string[]][] = [[ex.pieces, ex.stars]];
  const seen = new Set<string>();
  for (let depth = 1; depth <= cap; depth++) {
    const next: [Placement, string[]][] = [];
    for (const [pos, stars] of frontier) for (const from of Object.keys(pos)) {
      if (pos[from]?.[0] !== "w" || (ex.only && pos[from]![1] !== ex.only)) continue;
      for (const to of drillMoves(pos, from)) {
        const p2 = move(pos, from, to), s2 = stars.filter(s => s !== to);
        if (!s2.length) return depth;
        const k = key(p2) + "|" + s2.join();
        if (!seen.has(k)) { seen.add(k); next.push([p2, s2]); }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** Fewest safe king moves to the goal, or Infinity. */
export function minSafe(ex: SafeExercise, cap = 12): number {
  let frontier: Placement[] = [ex.pieces];
  const seen = new Set([key(ex.pieces)]);
  for (let depth = 1; depth <= cap; depth++) {
    const next: Placement[] = [];
    for (const pos of frontier) {
      const k = Object.keys(pos).find(s => pos[s] === "wK")!;
      for (const to of drillMoves(pos, k)) {
        const p2 = move(pos, k, to);
        if (attackedBy(p2, "b").has(to)) continue;
        if (to === ex.goal) return depth;
        if (!seen.has(key(p2))) { seen.add(key(p2)); next.push(p2); }
      }
    }
    frontier = next;
  }
  return Infinity;
}

function texts(x: unknown, out: Text[] = []): Text[] {
  if (x && typeof x === "object") {
    if ("en" in x && "pa" in x) out.push(x as Text);
    else Object.values(x).forEach(v => texts(v, out));
  }
  return out;
}

const exercisesOf = (l: (typeof LEVELS)[number]["lessons"][number]): Exercise[] => [l.try, ...l.practise, l.challenge];

describe("lessons", () => {
  const lessons = allLessons();

  it("have unique ids that match their level", () => {
    expect(new Set(lessons.map(l => l.id)).size).toBe(lessons.length);
    for (const l of lessons) expect(l.id.startsWith(`${l.level}.`)).toBe(true);
    for (const lv of LEVELS) if (lv.lessons.length) expect(lv.lessons.length).toBe(lv.plannedLessons);
  });

  it("every pick exercise is a legal position with 1-4 computed answers (DECISIONS #63)", () => {
    let n = 0;
    for (const l of lessons) for (const ex of expand(exercisesOf(l))) {
      if (ex.kind !== "pick") continue;
      n++;
      expect(() => new Chess(ex.fen), `${l.id} illegal FEN`).not.toThrow();
      const { squares } = answerSquares(ex.fen, ex.feature, ex.color);
      expect(squares.length, `${l.id} ${ex.feature} answers ${squares}`).toBeGreaterThan(0);
      expect(squares.length, `${l.id} ${ex.feature} answers ${squares}`).toBeLessThanOrEqual(4);
    }
    expect(n).toBeGreaterThan(0);
  });

  it("every teaching diagram with both kings is a legal position", () => {
    for (const l of lessons) for (const sl of l.learn) {
      const f = sl.board?.fen; if (!f) continue;
      const b = f.split(" ")[0];
      if (b.includes("K") && b.includes("k")) expect(() => new Chess(f), `${l.id}: ${f}`).not.toThrow();
    }
  });

  for (const l of lessons) describe(`lesson ${l.id}`, () => {
    it("every drill is solvable within its move limit, and the limit is not slack in a challenge", () => {
      for (const ex of exercisesOf(l)) {
        if (ex.kind === "stars" || ex.kind === "safe") {
          const min = ex.kind === "stars" ? minStars(ex) : minSafe(ex);
          expect(min, `${l.id} ${ex.kind} ${JSON.stringify(ex.kind === "stars" ? ex.stars : ex.goal)}`).toBeLessThan(Infinity);
          if (ex.maxMoves) expect(min, `${l.id}: limit ${ex.maxMoves} but best is ${min}`).toBeLessThanOrEqual(ex.maxMoves);
          if (ex.maxMoves && ex === l.challenge) expect(ex.maxMoves, `${l.id} challenge limit should be exact`).toBe(min);
        }
      }
    });

    it("every square named is a real square, and no star sits under a white piece", () => {
      for (const ex of exercisesOf(l)) {
        if (ex.kind === "coord") ex.targets.forEach(s => expect(isSquare(s), s).toBe(true));
        if (ex.kind === "stars") ex.stars.forEach(s => { expect(isSquare(s)).toBe(true); expect(ex.pieces[s]?.[0]).not.toBe("w"); });
        if (ex.kind === "safe") {
          expect(Object.values(ex.pieces).filter(p => p === "wK")).toHaveLength(1);
          expect(attackedBy(ex.pieces, "b").has(ex.goal), `${l.id} goal ${ex.goal} is attacked`).toBe(false);
        }
        if (ex.kind === "place") {
          const used = new Set(Object.keys(ex.start ?? {}));
          for (const st of ex.steps) {
            const free = st.squares.find(s => !used.has(s));
            expect(free, `${l.id}: no free square for ${st.piece}`).toBeDefined();
            used.add(free!);
          }
        }
        if (ex.kind === "choose") expect(ex.options.filter(o => o.correct)).toHaveLength(1);
        if (ex.kind === "play") {
          expect(() => new Chess(ex.fen), `${l.id} FEN`).not.toThrow();
          const sol = solutions(ex.fen, ex.goal);
          expect(sol.length, `${l.id} ${ex.goal}: no move meets the goal`).toBeGreaterThan(0);
          const g = new Chess(ex.fen);
          if (ex.goal.startsWith("escape")) expect(g.inCheck(), `${l.id}: escape drill but not in check`).toBe(true);
          if (ex.goal === "no-stalemate") {
            // no accepted answer may give the moved piece away for nothing
            for (const u of sol) {
              const a = new Chess(ex.fen); const m = a.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
              expect(a.isAttacked(m.to, a.turn()) && !a.isAttacked(m.to, g.turn()), `${l.id}: ${u} hangs the piece`).toBe(false);
            }
          }
          if (ex.goal === "stop-mate") {
            // the threat must be real: without a defence, the opponent really has a mate in one
            const pass = ex.fen.split(" "); pass[1] = pass[1] === "w" ? "b" : "w"; pass[3] = "-";
            const t = new Chess(pass.join(" "));
            const real = t.moves({ verbose: true }).some(m => { const x = new Chess(t.fen()); x.move(m); return x.isCheckmate(); });
            expect(real, `${l.id}: no real mate threat in ${ex.fen}`).toBe(true);
          }
          if (ex.goal === "no-stalemate" || l.id === "2.3") {
            // the stalemate lesson only teaches if a tempting move really IS stalemate
            const traps = g.moves({ verbose: true }).filter(m => judge(ex.fen, m.from + m.to + (m.promotion ?? ""), ex.goal).why === "whyStalemate");
            expect(traps.length, `${l.id}: no stalemate trap in ${ex.fen}`).toBeGreaterThan(0);
          }
        }
        if (ex.kind === "mateVs") {
          const g = new Chess(ex.fen);
          expect(g.turn(), `${l.id}: learner must be to move`).toBe("w");
          expect(g.inCheck() || g.isGameOver(), `${l.id}: bad start`).toBe(false);
          const pieces = g.board().flat().filter(Boolean).map(p => p!.color + p!.type).sort().join(",");
          // the known longest forced mates (from any position): KRRK 7, KQK 10, KRK 16
          const longest: Record<string, number> = { "bk,wk,wr,wr": 7, "bk,wk,wq": 10, "bk,wk,wr": 16 };
          expect(longest[pieces], `${l.id}: material ${pieces} has no known mate length`).toBeDefined();
          expect(ex.maxMoves, `${l.id}: limit below the longest forced mate`).toBeGreaterThanOrEqual(longest[pieces]);
        }
        if (ex.kind === "line") {
          const g = new Chess();
          for (const m of ex.moves) expect(() => g.move(m), `${l.id}: illegal ${m} in ${ex.moves.join(" ")}`).not.toThrow();
          expect(ex.moves.filter((_, i) => (i % 2 === 0) === (ex.side === "w")).length, `${l.id}: learner needs moves`).toBeGreaterThanOrEqual(2);
          // the name shown must be the Lichess opening database's own name for this exact sequence
          if (ex.opening) expect(openingName(ex.moves)?.name, `${l.id}: opening name`).toBe(ex.opening);
        }
        if (ex.kind === "choose" && ex.board?.fen) expect(() => new Chess(ex.board!.fen!), `${l.id} diagram FEN`).not.toThrow();
        if (ex.kind === "pack") expect(PACKS[ex.pack].puzzles.length).toBeGreaterThanOrEqual(ex.count);
      }
    });
  });
});

// Engine drills (DECISIONS #57): Stockfish plays the learner's side against Stockfish's best defence and
// must reach the goal within maxMoves; for "hold", the learner's score must never fall below SLIP.hold.
describe("engine drills are winnable (Stockfish self-play)", () => {
  for (const l of allLessons()) for (const ex of [l.try, ...l.practise, l.challenge]) {
    if (ex.kind !== "engineVs") continue;
    it(`${l.id} ${ex.goal} ${ex.fen}`, async () => {
      const e = await nodeEngine();
      const g = new Chess(ex.fen), me = g.turn();
      const start = await e.analyse(ex.fen, { depth: 16 });
      if (ex.goal === "hold") expect(Math.abs(asNumber(start.score)), "a hold drill must start level").toBeLessThan(150);
      else expect(asNumber(start.score), "a win drill must start winning").toBeGreaterThan(SLIP[ex.goal]);
      let met = false;
      for (let n = 1; n <= ex.maxMoves && !met; n++) {
        const a = await e.analyse(g.fen(), { depth: 14 });
        const mv = g.move({ from: a.best.slice(0, 2), to: a.best.slice(2, 4), promotion: a.best[4] });
        if (ex.goal !== "hold" && (g.isCheckmate() || engineGoalMet(g, me, ex.goal, mv))) { met = true; break; }
        if (g.isGameOver()) { met = ex.goal === "hold"; break; }
        const r = await e.analyse(g.fen(), { depth: 14 });
        if (ex.goal === "hold") expect(-asNumber(r.score), `${l.id}: hold slipped at move ${n}`).toBeGreaterThan(SLIP.hold);
        g.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] });
        if (ex.goal === "wipe" && engineGoalMet(g, me, "wipe")) { met = true; break; }
        if (ex.goal === "hold" && n === ex.maxMoves) met = true;
      }
      expect(met, `${l.id}: goal "${ex.goal}" not reached in ${ex.maxMoves} moves`).toBe(true);
    }, 300000);
  }
});

describe("level tests", () => {
  for (const lv of LEVELS) if (lv.test) it(`level ${lv.n}: packs exist, are big enough, pass mark is reachable`, () => {
    const total = lv.test!.packs.reduce((n, p) => n + p.count, 0);
    for (const p of lv.test!.packs) expect(PACKS[p.pack]?.puzzles.length ?? 0, `${lv.n} ${p.pack}`).toBeGreaterThanOrEqual(p.count);
    expect(lv.test!.pass).toBeLessThanOrEqual(total);
    expect(lv.test!.pass / total, "pass mark between 60% and 85%").toBeGreaterThanOrEqual(0.6);
    expect(lv.test!.pass / total).toBeLessThanOrEqual(0.85);
  });
});

describe("puzzle packs", () => {
  for (const [id, pack] of Object.entries(PACKS)) it(`${id}: every move is legal`, () => {
    expect(pack.source).toMatch(/CC0/);
    for (const p of pack.puzzles) {
      const g = new Chess(p.fen);
      for (const m of p.moves) expect(() => g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }), p.id).not.toThrow();
    }
  });
});

describe("both languages", () => {
  const all = [...texts(LEVELS), ...Object.values(UI)];
  it("every string has English and Punjabi", () => {
    for (const x of all) {
      expect(x.en.trim(), JSON.stringify(x)).not.toBe("");
      expect(x.pa.trim(), JSON.stringify(x)).not.toBe("");
    }
  });
  it("Punjabi is in Gurmukhi, with no Devanagari letters slipped in", () => {
    for (const x of all) {
      // the danda ।/॥ (U+0964/5) is shared punctuation and allowed; any other U+09xx is a typo
      expect(/[ऀ-ॣ०-ॿ]/.test(x.pa), x.pa).toBe(false);
      if (/[a-z]{4,}/i.test(x.pa.replace(/<[^>]+>/g, "")) && !/[਀-੿]/.test(x.pa)) throw new Error(`untranslated: ${x.pa}`);
    }
  });
  it("the glossary is followed: ਖਾਨਾ not ਘਰ, ਰਾਣੀ not ਵਜ਼ੀਰ, no ਕੁਰਬਾਨੀ/ਬਲੀ", () => {
    // ਘਰ ਦਾ ਕੰਮ is the everyday word for homework (DECISIONS #82), not a chess square: it is the one allowed use
    for (const x of all) expect(/ਘਰ|ਵਜ਼ੀਰ|ਕੁਰਬਾਨੀ|ਬਲੀ/.test(x.pa.replace(/ਘਰ ਦਾ ਕੰਮ/g, "")), x.pa).toBe(false);
  });
  it("ਤਰੱਕੀ means promotion only; 'progress' is ਸਿੱਖਿਆ ਦਾ ਹਿਸਾਬ (DECISIONS #47)", () => {
    for (const x of all) if (/progress/i.test(x.en)) expect(x.pa.includes("ਤਰੱਕੀ"), x.pa).toBe(false);
  });
  it("the learner is never addressed as one gender (DECISIONS #62): no first-person ਸਕਦਾ/ਸਕਦੀ ਹਾਂ, ਦਾ ਹਾਂ", () => {
    for (const x of all) expect(/ਮੈਂ[^।?!]*(ਸਕਦਾ|ਸਕਦੀ|ਦਿੰਦਾ|ਲੈਂਦਾ|ਕਰਦਾ|ਕਰਦੀ) ਹਾਂ/.test(x.pa), x.pa).toBe(false);
  });
  it("Gurmukhi is never letter-spaced", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/:lang\(pa\)[^{]*\{[^}]*letter-spacing:\s*0\s*!important/);
  });
});

describe("moving Learn slides (DECISIONS #76)", () => {
  it("every slide marked `play` has one arrow that is a legal, non-king-capturing move", () => {
    let n = 0;
    for (const l of allLessons()) l.learn.forEach((s, i) => {
      const d = s.board; if (!d?.play) return; n++;
      expect(d.fen && d.arrows?.length === 1, `${l.id}#${i}`).toBe(true);
      const ok = ["w", "b"].some(side => { try {
        const p = d.fen!.split(" "); p[1] = side; const m = new Chess(p.join(" ")).move({ from: d.arrows![0][0], to: d.arrows![0][1], promotion: "q" });
        return m.captured !== "k"; } catch { return false; } });
      expect(ok, `${l.id}#${i}: ${d.arrows![0].join("-")}`).toBe(true);
    });
    expect(n).toBeGreaterThanOrEqual(10);
  });
});

// Mini-games (full check 2026-10-05): Stockfish playing the learner's side must beat Nanhi Chidi within 60
// moves, with a fixed random seed so a failure can be replayed.
import { botById, botMove } from "../src/bots/bots";
import { miniGameResult } from "../src/chess/rules";
describe("mini-games are winnable", () => {
  for (const l of allLessons()) for (const ex of [l.try, ...l.practise, l.challenge]) {
    if (ex.kind !== "botGame") continue;
    it(`${l.id} ${ex.goal} ${ex.fen}`, async () => {
      const e = await nodeEngine(), g = new Chess(ex.fen), me = g.turn(), bot = botById(ex.bot);
      expect(bot, `${l.id}: bot ${ex.bot}`).toBeTruthy();
      let seed = 42; const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
      let result: string | null = null;
      for (let n = 0; n < 60 && !result; n++) {
        const a = await e.analyse(g.fen(), { depth: 8 });
        const mv = g.move({ from: a.best.slice(0, 2), to: a.best.slice(2, 4), promotion: a.best[4] });
        result = miniGameResult(g, me, ex.goal, mv); if (result) break;
        const legal = g.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));
        const u = await botMove(e, g.fen(), legal, bot!, rand);
        const r = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        result = miniGameResult(g, me, ex.goal, r);
      }
      expect(result, `${l.id}: ${g.pgn()}`).toBe("win");
    }, 300000);
  }
});

describe("Punjabi ordinals (DECISIONS #80)", () => {
  it("are spelled out (ਤੀਜੀ), never a Gurmukhi numeral with an ending (੩ਜੀ), whose ਜੀ reads as the honorific", () => {
    const bad = allLessons().flatMap(l => texts(l)).filter(x => /[੦-੯]+(ਜੀ|ਵੀਂ|ਥੀ|ਵਾਂ|ਵੇਂ)/.test(x.pa));
    expect(bad.map(x => x.pa.slice(0, 60))).toEqual([]);
  });
});

// DECISIONS #92: a text-only slide showed an empty board under its words, which looked like nothing had loaded.
describe("learn slides", () => {
  const slides = allLessons().flatMap(l => l.learn.map((s, i) => ({ id: `${l.id} slide ${i + 1}`, lesson: l.id, d: s.board })));
  it("every slide has a position (lesson 1.1, about the board itself, may show an empty one)", () => {
    const bare = slides.filter(s => !s.d || (!s.d.fen && !Object.keys(s.d.pieces ?? {}).length && s.lesson !== "1.1" && !s.d.highlights?.length));
    expect(bare.map(s => s.id)).toEqual([]);
  });
  it("every position is legal and every arrow starts on a piece", () => {
    const bad: string[] = [];
    for (const { id, d } of slides) {
      if (!d) continue;
      if (d.fen) {
        try { new Chess(d.fen); } catch { bad.push(`${id}: illegal FEN`); continue; }
        const p = d.fen.split(" "); p[1] = p[1] === "w" ? "b" : "w"; p[3] = "-";
        if (new Chess(p.join(" ")).isCheck()) bad.push(`${id}: the side not to move is in check`);
      }
      // an arrow shows a move, a line or where a piece came from, so it must touch a piece at one end, or carry
      // on from another arrow (a route in two legs); lesson 1.1's arrows run along the empty board's files and ranks
      const at = d.fen ? placementFromFen(d.fen) : d.pieces ?? {}, arrows = d.arrows ?? [];
      if (!id.startsWith("1.1 ")) for (const [from, to] of arrows)
        if (!at[from] && !at[to] && !arrows.some(([, t]) => t === from)) bad.push(`${id}: arrow ${from}-${to} touches no piece`);
    }
    expect(bad).toEqual([]);
  });
});
