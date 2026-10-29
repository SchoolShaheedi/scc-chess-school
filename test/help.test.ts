// "No dead ends" (2026-10-29): the help ladder on every exercise type, "Skip for now", the theme sentences, the easy packs,
// and the beginner texts. Fast: no engine (the browser engine is replaced by a stub that plays the first legal move);
// the Stockfish proofs live in test/easy-packs.test.ts (COURSE_BUILD=1).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";

vi.mock("../src/engine/browser", () => ({
  getEngine: () => ({
    analyse: async (fen: string) => { const m = new Chess(fen).moves({ verbose: true })[0]; return { best: m.from + m.to, score: { cp: 0 }, pv: [] }; },
  }),
}));

import { PACKS, LEVELS, allLessons, expand } from "../src/content/levels";
import { HELP_KEYS } from "../src/content/beginner-help";
import { merge } from "../src/merge";
import { store } from "../src/store";
import { t, UI } from "../src/i18n";
import { type Ctx, runExercise } from "../src/lesson/exercises";
import { canSkip, canWatch, finalStars, firstSafeMove, firstStarsMove, forLook, goalMove, lessonsTeaching, packsOfTopic, rungFor, TOPICS, topicKey, topicOf, watchLine, watchPick } from "../src/lesson/help";
import type { Exercise, PuzzleExercise } from "../src/lesson/types";

const say = (en: string, pa: string) => ({ en, pa });
const PROMPT = say("Do it.", "ਕਰੋ।");

/** A board that only remembers what it was told, and hands the exercise's own handlers back. */
function fake() {
  const log = { says: [] as { text: string; tone?: string }[], sets: [] as Record<string, unknown>[], marks: [] as Record<string, unknown>[], skip: 0, watch: 0, done: -1 };
  let io: { onMove?(f: string, t: string): unknown; onTap?(s: string): void } = {};
  const board = {
    set: (_p: unknown, m: Record<string, unknown> = {}) => { log.sets.push(m); }, mark: (m: Record<string, unknown>) => { log.marks.push(m); },
    interact: (i: typeof io) => { io = i; }, shake: () => {}, setFlip: () => {}, position: () => ({}),
  };
  const c = {
    board, extra: { innerHTML: "" } as unknown as HTMLElement,
    say: (text: string, tone?: string) => { log.says.push({ text, tone }); }, status: () => {},
    done: (n: number) => { log.done = n; },
    offerSkip: () => { log.skip++; }, offerWatch: () => { log.watch++; },
  } as unknown as Ctx;
  return { c, log, io: () => io };
}
const lastMarks = (log: ReturnType<typeof fake>["log"]) => ({ ...Object.assign({}, ...log.marks), ...log.sets.at(-1) } as { highlights?: string[]; arrows?: [string, string][]; stars?: string[] });
const flush = (ms = 3000) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => { vi.useFakeTimers(); store.set({ lang: "en", lessons: {} }); });
afterEach(() => { vi.useRealTimers(); });

describe("the ladder's rungs", () => {
  it("2 misses earn the hint, 3 the arrow; skip is offered at 3, watching at 2", () => {
    expect([0, 1, 2, 3, 4].map(rungFor)).toEqual(["none", "none", "hint", "arrow", "arrow"]);
    expect([1, 2, 3].map(canSkip)).toEqual([false, false, true]);
    expect([1, 2].map(canWatch)).toEqual([false, true]);
  });
  it("a lesson finished with a skip is 1 star, however few mistakes", () => {
    expect([finalStars(0, false), finalStars(2, false), finalStars(5, false)]).toEqual([3, 2, 1]);
    expect(finalStars(0, true)).toBe(1);
  });
  it("the solvers find a first move for drills, safe walks and goals", () => {
    expect(firstStarsMove({ a1: "wR" }, ["a8", "h8"], undefined, 2)).toBeTruthy();
    expect(firstStarsMove({ a1: "wR" }, ["a8", "h8"], undefined, 1)).toBeNull();
    expect(firstSafeMove({ e1: "wK", c5: "bB" }, "e5", 4)).toBeTruthy();
    expect(goalMove("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", "mate")).toEqual(["a1", "a8"]);
  });
});

describe("help ladder on each kind of exercise", () => {
  it("play: hint glow after 2 misses, arrow and Skip after 3", async () => {
    const { c, log, io } = fake();
    runExercise({ kind: "play", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", goal: "mate", prompt: PROMPT, hint: say("Use the rook.", "ਹਾਥੀ ਵਰਤੋ।") }, c);
    for (const n of [1, 2, 3]) { const p = io().onMove!("g1", n === 1 ? "h1" : n === 2 ? "f1" : "h2"); await flush(1500); await p; if (n === 1) { expect(log.skip).toBe(0); } }
    // second miss: the hint text and the piece to move glowing
    expect(log.says.some(s => s.text === "Use the rook.")).toBe(true);
    // third miss: the arrow of the mating move, and the skip button
    expect(lastMarks(log).arrows).toEqual([["a1", "a8"]]);
    expect(log.skip).toBe(1);
    expect(log.says.at(-1)!.text).toBe(t("helpArrow"));
  });

  it("play with no hint: 'look at the glowing piece' stands in for it", async () => {
    const { c, log, io } = fake();
    runExercise({ kind: "play", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", goal: "mate", prompt: PROMPT }, c);
    for (const to of ["h1", "f1"]) { const p = io().onMove!("g1", to); await flush(1500); await p; }
    expect(log.says.at(-1)!.text).toBe(t("helpLookPiece"));
    expect(lastMarks(log).highlights).toEqual(["a1"]);
  });

  it("stars: glow the piece at 2, arrow at 3, skip at 3", () => {
    const { c, log, io } = fake();
    runExercise({ kind: "stars", pieces: { a1: "wR" }, stars: ["a8", "h8"], maxMoves: 2, prompt: PROMPT }, c);
    io().onMove!("a1", "b3"); io().onMove!("a1", "b3");
    expect(log.says.at(-1)!.text).toBe(t("helpLookPiece"));
    expect(lastMarks(log).highlights).toEqual(["a1"]);
    expect(log.skip).toBe(0);
    io().onMove!("a1", "b3");
    expect(lastMarks(log).arrows?.length).toBe(1);
    expect(log.skip).toBe(1);
  });

  it("safe: the same ladder, and the arrow is a safe step", () => {
    const { c, log, io } = fake();
    runExercise({ kind: "safe", pieces: { e1: "wK", c5: "bB" }, goal: "e5", maxMoves: 4, prompt: PROMPT }, c);
    for (let i = 0; i < 3; i++) io().onMove!("e1", "h8");          // not a king move: refused, a miss
    expect(lastMarks(log).arrows?.length).toBe(1);
    expect(log.skip).toBe(1);
  });

  it("coord: the column glows at 2 (with the hint), a star on the square at 3", () => {
    const { c, log, io } = fake();
    runExercise({ kind: "coord", targets: ["e4"], prompt: PROMPT, hint: say("Letter first.", "ਪਹਿਲਾਂ ਅੱਖਰ।") }, c);
    io().onTap!("a1"); io().onTap!("a2");
    expect(log.says.at(-1)!.text).toContain("Letter first.");
    expect(lastMarks(log).highlights).toEqual(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]);
    io().onTap!("a3");
    expect(lastMarks(log).stars).toEqual(["e4"]);
    expect(log.skip).toBe(1);
  });

  it("place: the allowed squares glow at 2, a star at 3, skip at 3", () => {
    const { c, log, io } = fake();
    runExercise({ kind: "place", steps: [{ piece: "wR", squares: ["a1", "h1"] }], prompt: PROMPT }, c);
    io().onTap!("c4"); io().onTap!("c5");
    expect(lastMarks(log).highlights).toEqual(["a1", "h1"]);
    io().onTap!("c6");
    expect(lastMarks(log).stars).toEqual(["a1"]);
    expect(log.skip).toBe(1);
  });

  it("mate the lone king: Watch me do it after 2 failed attempts, Skip after 3", async () => {
    const { c, log, io } = fake();
    // a one-move limit makes every attempt fail at once
    runExercise({ kind: "mateVs", fen: "8/8/8/4k3/8/8/8/R3K2R w - - 0 1", maxMoves: 1, prompt: PROMPT }, c);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const p = io().onMove!("a1", "a2"); await flush(3000); await p;
      expect([log.watch > 0, log.skip > 0]).toEqual([attempt >= 2, attempt >= 3]);
    }
  });

  it("an opening line: glow at 2 misses, arrow at 3, skip at 3", () => {
    const { c, log, io } = fake();
    runExercise({ kind: "line", side: "w", moves: ["e4", "e5", "Nf3"], prompt: PROMPT }, c);
    // wait for nothing: the line starts on White's move
    for (let i = 0; i < 3; i++) io().onMove!("a2", "a3");
    expect(lastMarks(log).arrows).toEqual([["e2", "e4"]]);
    expect(log.skip).toBe(1);
  });

  it("a lesson puzzle says WHY after a wrong move (the opponent's reply, then the theme's sentence), then climbs the ladder", async () => {
    const { c, log, io } = fake();
    const p = PACKS["hanging-first"].puzzles.find(x => x.id.startsWith("hm-"))!;
    const ex: PuzzleExercise = { kind: "puzzle", fen: p.fen, moves: p.moves, prompt: PROMPT, pack: "hanging-first", hint: say("Look for the loose piece.", "ਢਿੱਲਾ ਮੋਹਰਾ ਲੱਭੋ।") };
    runExercise(ex, c);
    await flush(600);                                                   // the opponent's first move is played
    const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
    const wrong = g.moves({ verbose: true }).find(m => m.from + m.to !== p.moves[1])!;
    for (let n = 1; n <= 3; n++) {
      log.says.length = 0;
      const run = io().onMove!(wrong.from, wrong.to); await flush(5000); await run;
      expect(log.says[0].text).toBe(t("puzzleWrong"));                  // the existing signal other screens listen for
      expect(log.says.some(s => s.text === t("tp_hang_why"))).toBe(true);
      if (n === 2) expect(log.says.at(-1)!.text).toBe("Look for the loose piece.");
      if (n === 3) { expect(log.says.at(-1)!.text).toBe(t("puzzleShow")); expect(log.skip).toBe(1); expect(lastMarks(log).arrows).toEqual([[p.moves[1].slice(0, 2), p.moves[1].slice(2, 4)]]); }
      expect(log.skip).toBe(n >= 3 ? 1 : 0);
    }
  });

  it("a puzzle outside a lesson (no pack) keeps its old behaviour: arrow after 2 misses, no reply", async () => {
    const { c, log, io } = fake();
    const p = PACKS["mate1-easy"].puzzles[0];
    runExercise({ kind: "puzzle", fen: p.fen, moves: p.moves, prompt: PROMPT }, c);
    await flush(600);
    const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
    const wrong = g.moves({ verbose: true }).find(m => m.from + m.to !== p.moves[1])!;
    await io().onMove!(wrong.from, wrong.to);
    expect(log.says.at(-1)!.text).toBe(t("puzzleWrong"));
    await io().onMove!(wrong.from, wrong.to);
    expect(log.says.at(-1)!.text).toBe(t("puzzleShow"));
    expect(log.skip).toBe(0);
  });

  it("the Young look gets the short prompt", () => {
    const ex: Exercise = { kind: "coord", targets: ["e4"], prompt: PROMPT, young: say("Tap!", "ਛੂਹੋ!") };
    expect(forLook(ex, "young").prompt.en).toBe("Tap!");
    expect(forLook(ex, "adult").prompt.en).toBe("Do it.");
  });
});

describe("watching: the engine plays the winning side", () => {
  it("plays alternately, shows each move, stops when told, and stops if the screen is left", async () => {
    const shown: string[] = [];
    const out = await watchLine({
      fen: "7k/8/6K1/8/8/8/8/5Q2 w - - 0 1", side: "w",
      best: async () => "f1f7" /* Qf7 is stalemate: only for the test */, reply: async () => null,
      show: (_g, last) => shown.push(last.join("")), pause: async () => {}, alive: () => true, stop: () => true,
    });
    expect(out).toBe("stopped"); expect(shown).toEqual(["f1f7"]);
    let alive = true;
    const gone = await watchLine({ fen: new Chess().fen(), side: "w", best: async () => "e2e4", reply: async () => "e7e5", show: () => { alive = false; },
      pause: async () => {}, alive: () => alive, stop: () => false });
    expect(gone).toBe("gone");
  });
});

describe("watching a capture race", () => {
  it("prefers a safe capture to a quiet 'best' move, but not a capture that loses the piece", () => {
    const fen = "7k/ppp5/8/8/8/8/8/R6K w - - 0 1";
    expect(watchPick(fen, [{ move: "h1g1", score: 900 }, { move: "a1a7", score: 880 }], "clear")).toBe("a1a7");
    expect(watchPick(fen, [{ move: "h1g1", score: 900 }, { move: "a1a7", score: 100 }], "clear")).toBe("h1g1");
    expect(watchPick(fen, [{ move: "h1g1", score: 900 }, { move: "a1a7", score: 880 }], "promote")).toBe("h1g1");
  });
});

describe("level tests name the theme", () => {
  it("every pack in Levels 2-6 tests has a specific prompt, not the generic one", () => {
    for (const lv of LEVELS.slice(1, 6)) for (const p of lv.test!.packs) {
      const task = UI[topicKey(topicOf(p.pack), "task")];
      expect(task.en, `${lv.n} ${p.pack}`).not.toBe("Find the best move.");
    }
  });
});

describe("skipping: no hard lock", () => {
  it("a skip finishes the lesson with 1 star, marks it for review, and a clean replay clears the mark", () => {
    store.completeLesson("1.2", finalStars(0, true), true);
    expect(store.get().lessons["1.2"]).toMatchObject({ stars: 1, review: true });
    // the lesson counts as done, so main.ts's lessonState opens the next one: same test as any finished lesson
    store.completeLesson("1.2", 1, true);
    expect(store.get().lessons["1.2"].review).toBe(true);
    store.completeLesson("1.2", 3, false);
    expect(store.get().lessons["1.2"]).toMatchObject({ stars: 3 });
    expect(store.get().lessons["1.2"].review).toBeUndefined();
  });
  it("a skip on a replay never marks a lesson that was already cleanly finished", () => {
    store.completeLesson("1.3", 3, false);
    store.completeLesson("1.3", 1, true);
    expect(store.get().lessons["1.3"]).toMatchObject({ stars: 3 });
    expect(store.get().lessons["1.3"].review).toBeUndefined();
  });
  it("the review mark survives a merge with another device unless the later finish was clean", () => {
    const base = { xp: 0, streak: { days: 0, last: "" } };
    const a = { ...base, lessons: { "1.2": { stars: 1 as const, completedAt: "2026-10-01", review: true } } };
    const b = { ...base, lessons: { "1.2": { stars: 2 as const, completedAt: "2026-10-02" } } };
    expect(merge(a, b).lessons["1.2"].review).toBeUndefined();   // the later, clean finish wins
    expect(merge(b, a).lessons["1.2"].review).toBeUndefined();
    const c = { ...base, lessons: { "1.2": { stars: 1 as const, completedAt: "2026-10-03", review: true } } };
    expect(merge(b, c).lessons["1.2"].review).toBe(true);
  });
});

describe("themes: why a puzzle move is wrong, and what a level test lists", () => {
  it("every pack has a topic, and every topic has its name, task and sentence in both languages", () => {
    for (const pack of Object.keys(PACKS)) expect(TOPICS).toContain(topicOf(pack));
    for (const topic of TOPICS) for (const part of ["name", "task", "why"] as const) {
      const x = UI[topicKey(topic, part)];
      expect(x.en.length, `${topic} ${part}`).toBeGreaterThan(3);
      expect(x.pa).toMatch(/[਀-੿]/);
    }
    // the sentences from the brief
    expect(UI.tp_hang_why.en).toMatch(/Now your piece can be taken/);
    expect(UI.tp_mate_why.en).toMatch(/Their king can still escape/);
  });
  it("puzzleShow no longer promises an explanation it does not give", () => {
    expect(UI.puzzleShow.en).not.toMatch(/why it works/i);
    expect(UI.puzzleShow.pa).not.toMatch(/ਕਿਉਂ/);
  });
  it("expand() records the pack on each puzzle, and hand-made ones carry no Lichess link", () => {
    const list = expand([{ kind: "pack", pack: "enpassant-easy", count: 3, prompt: PROMPT }]) as PuzzleExercise[];
    expect(list.every(x => x.pack === "enpassant-easy" && x.source!.startsWith("scc/hand-made/"))).toBe(true);
  });
  it("each level test's themes link to lessons that teach them", () => {
    for (const lv of LEVELS.slice(1, 4)) for (const p of lv.test!.packs) {
      const links = lessonsTeaching(topicOf(p.pack), allLessons(), lv.n);
      expect(links.length, `level ${lv.n} ${p.pack} -> ${topicOf(p.pack)}`).toBeGreaterThan(0);
      for (const id of links) expect(allLessons().some(l => l.id === id)).toBe(true);
    }
    expect(packsOfTopic("enpassant")).toContain("enpassant-easy");
  });
});

describe("easier real-game packs for Levels 1-3", () => {
  const stats = (pack: string) => { const r = PACKS[pack].puzzles.map(p => p.rating).sort((a, b) => a - b); return { min: r[0], median: r[r.length >> 1], max: r.at(-1)!, n: r.length }; };
  it("hanging-first is far easier than hanging-easy, and big enough for lesson 1.9 (5 + 3) and the tests", () => {
    const s = stats("hanging-first");
    expect(s.n).toBeGreaterThanOrEqual(12);
    expect(s.median).toBeLessThan(stats("hanging-easy").median - 300);
    expect(s.max).toBeLessThan(800);
  });
  it("enpassant-easy is hand-made and far easier than the Lichess en passant pack (median 1590)", () => {
    expect(stats("enpassant-easy").median).toBeLessThanOrEqual(400);
    expect(stats("enpassant-easy").n).toBeGreaterThanOrEqual(6);
    for (const p of PACKS["enpassant-easy"].puzzles) {
      const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
      expect(g.moves({ verbose: true }).find(m => m.from + m.to === p.moves[1])?.isEnPassant(), p.id).toBe(true);
    }
  });
  it("defend-first is easier than defend-easy (median 1069)", () => {
    expect(stats("defend-first").median).toBeLessThan(stats("defend-easy").median - 200);
    expect(stats("defend-first").n).toBeGreaterThanOrEqual(8);
  });
  it("every free-piece puzzle really has one free capture, and it is the answer (proved by geometry; Stockfish proves the rest)", () => {
    for (const p of PACKS["hanging-first"].puzzles) {
      expect(p.moves.length, p.id).toBe(2);
      const g = new Chess(p.fen); g.move({ from: p.moves[0].slice(0, 2), to: p.moves[0].slice(2, 4) });
      expect(g.inCheck(), `${p.id} starts in check`).toBe(false);
      const free = g.moves({ verbose: true }).filter(m => { if (!m.captured) return false; const h = new Chess(g.fen()); h.move(m); return !h.isAttacked(m.to, h.turn()); });
      expect(free.map(m => m.from + m.to), p.id).toEqual([p.moves[1]]);
    }
  });
  it("the lessons and tests point at the easy packs", () => {
    const lesson = (id: string) => allLessons().find(l => l.id === id)!;
    const packsOf = (id: string) => [lesson(id).try, ...lesson(id).practise, lesson(id).challenge].flatMap(e => e.kind === "pack" ? [e.pack] : []);
    expect(packsOf("1.9")).toEqual(["hanging-first", "hanging-first"]);
    expect(packsOf("2.6")).toContain("enpassant-easy");
    expect(packsOf("3.8")).toEqual(["defend-first", "defend-first"]);
    expect(LEVELS[1].test!.packs.map(p => p.pack)).toEqual(expect.arrayContaining(["enpassant-easy", "hanging-first"]));
    expect(LEVELS[2].test!.packs.map(p => p.pack)).toContain("defend-first");
  });
});

describe("Level 3 part-drills", () => {
  const drills = (id: string) => allLessons().find(l => l.id === id)!.practise.filter(e => e.kind === "mateVs" && e.partial);
  it("sit between the mate-in-one Try and the full mate in 3.2, 3.3 and 3.4, and the full drills are all still there", () => {
    for (const id of ["3.2", "3.3", "3.4"]) {
      const l = allLessons().find(x => x.id === id)!;
      expect(drills(id).length, id).toBeGreaterThanOrEqual(2);
      expect(l.practise.slice(0, drills(id).length).every(e => e.kind === "mateVs" && e.partial), `${id}: drills come first`).toBe(true);
      expect(l.practise.filter(e => e.kind === "mateVs" && !e.partial).length, `${id}: the original drills stay`).toBeGreaterThanOrEqual(1);
      for (const d of drills(id)) expect(d.hint, `${id} drill has a hint`).toBeTruthy();
    }
  });
});

describe("beginner texts", () => {
  const lessons14 = () => allLessons().filter(l => l.level <= 4);
  it("every Try and first Practise in Levels 1-4 has a hint", () => {
    for (const l of lessons14()) {
      expect(l.try.hint, `${l.id} try`).toBeTruthy();
      expect(l.practise[0].hint, `${l.id} first practise`).toBeTruthy();
    }
  });
  it("the Young look has its short text where the brief asked: 1.5 slide 2, 2.4 slide 3 (split into one rule each), 3.7 slide 1, 4.5 slides 1-2", () => {
    const l = (id: string) => allLessons().find(x => x.id === id)!;
    expect(l("1.5").learn[1].young).toBeTruthy();
    expect(l("2.4").learn[2].youngSplit?.length).toBe(4);
    expect(l("3.7").learn[0].young).toBeTruthy();
    expect(l("4.5").learn[0].young && l("4.5").learn[1].young).toBeTruthy();
    // the lessons keep their ids, count and slide order
    expect(l("2.4").learn.length).toBe(4);
  });
  it("young texts are short (at most 14 English words, one idea) and shorter than what they replace", () => {
    const { YOUNG_SLIDES, YOUNG_PROMPTS, SPLIT } = HELP_KEYS;
    for (const [k, x] of [...Object.entries(YOUNG_SLIDES), ...Object.entries(YOUNG_PROMPTS), ...Object.values(SPLIT).flatMap((s, i) => s.map((y, j) => [`split${i}.${j}`, y.text] as const))]) {
      expect(x.en.split(/\s+/).length, k).toBeLessThanOrEqual(14);
    }
    for (const l of lessons14()) l.learn.forEach((s, i) => { if (s.young) expect(s.young.en.length, `${l.id}:${i}`).toBeLessThan(s.text.en.length); });
  });
  it("new Punjabi is Gurmukhi with the nukta letters decomposed, no space before a danda, no letter-spacing words", () => {
    const all: string[] = [];
    const walk = (v: unknown) => { if (v && typeof v === "object") { const x = v as { pa?: unknown }; if (typeof x.pa === "string") all.push(x.pa); Object.values(v).forEach(walk); } };
    walk(HELP_KEYS); walk(LEVELS.slice(0, 4).flatMap(lv => lv.lessons)); for (const k of Object.keys(UI)) if (/^(help|skip|watch|testM|testS|practiseA|tp_)/.test(k)) walk(UI[k as keyof typeof UI]);
    for (const pa of all) {
      expect(pa, pa).not.toMatch(/[ਲਸਖਗਜਫ]਼?[ਲ਼ਸ਼ਖ਼-ਜ਼ਫ਼]/);
      expect(/[ਲ਼ਸ਼ਖ਼-ਜ਼ਫ਼]/.test(pa), `precomposed nukta letter in ${pa}`).toBe(false);
      expect(/ ।/.test(pa), `space before danda in ${pa}`).toBe(false);
    }
  });
});
