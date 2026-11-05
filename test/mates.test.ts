// "Learn all the checkmates" (DECISIONS #137): the TRUTH RULE. Every mate picture and build-up line must end in a position
// chess.js calls checkmate, in that named pattern, with the learner's side giving the mate. A claim that cannot be
// checked is not in the content. The Stockfish proof is gated:
//     ENGINE=1 npx vitest run test/mates.test.ts
import { Chess } from "chess.js";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MATE_GROUPS, MATES, mateById } from "../src/content/mates";
import { COUNTS } from "../src/content/mates-counts";
import INDEX from "../src/content/mates-index.json";
import { UI } from "../src/i18n";
import { classify } from "../src/mates/classify";
import { mateFacts, neighbours } from "../src/mates/facts";
import { learnerOf, lineEnd, plies } from "../src/mates/line";
import { merge, emptySaved, savable } from "../src/merge";
import { moveNote, whyMarks, whyText } from "../src/mates/why";
import { store } from "../src/store";
import { nodeEngine } from "./engine";

const bank = JSON.parse(readFileSync("public/puzzles/bank/index.json", "utf8")) as { themeCounts: Record<string, number> };
const board = (fen: string) => fen.split(" ")[0];
const play = (fen: string, moves: string[]) => { const g = new Chess(fen); for (const m of moves) g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); return g; };

describe("the list", () => {
  it("has about forty mates, in the seven groups, easy to hard, with unique ids", () => {
    expect(MATES.length).toBeGreaterThanOrEqual(35);
    expect(new Set(MATES.map(m => m.id)).size).toBe(MATES.length);
    expect(MATE_GROUPS.map(g => g.group)).toEqual(["first", "teams", "knight", "bishop", "queen", "traps", "basic"]);
    for (const g of MATE_GROUPS) expect(MATES.some(m => m.group === g.group), g.group).toBe(true);
    // a group's mates are listed together, in the order of the groups
    const order = MATES.map(m => MATE_GROUPS.findIndex(g => g.group === m.group));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it("names every pattern the bank tags (the 19 of DECISIONS #137) and the classic named mates", () => {
    const need = ["backrank", "smothered", "arabian", "anastasia", "boden", "opera", "epaulette", "pillsbury", "hook", "dovetail", "swallowtail", "morphy", "corner", "doublebishop", "killbox", "triangle", "vukovic", "balestra", "blindswine",
      "legal", "fools", "scholars", "greco", "lolli", "damiano", "blackburne", "reti", "maxlange", "pawn", "ladder", "queenmate", "rookmate", "twobishops", "bishopknight"];
    for (const id of need) expect(mateById(id), id).toBeTruthy();
  });
});

describe("(a) the final picture: a legal checkmate", () => {
  for (const m of MATES) it(m.id, () => {
    const g = new Chess(m.final);   // chess.js refuses a FEN with the wrong number of kings or pieces
    expect(g.isCheckmate(), "checkmate").toBe(true);
    // legal: the side that is NOT to move must not be in check (it could not have been the last to move otherwise)
    const parts = m.final.split(" "); parts[1] = g.turn() === "w" ? "b" : "w"; parts[3] = "-";
    expect(new Chess(parts.join(" ")).inCheck(), "the mating side's own king is in check: illegal").toBe(false);
    const f = mateFacts(m.final)!;
    expect(f.checkers.length, "someone gives check").toBeGreaterThan(0);
    expect(f.flights.every(x => x.own || x.guards.length), "every square round the king is shut").toBe(true);
  });
});

describe("(b) the build-up replays legally and ends in exactly the final position", () => {
  for (const m of MATES) it(m.id, () => {
    const g = new Chess(m.line.fen);
    for (const u of m.line.moves) expect(() => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }), `${u} in ${m.line.moves.join(" ")}`).not.toThrow();
    expect(g.isCheckmate(), "the line ends in checkmate").toBe(true);
    expect(board(g.fen()), "same board as the final picture").toBe(board(m.final));
    expect(g.turn(), "same side mated").toBe(new Chess(m.final).turn());
    expect(lineEnd(m)).toBe(g.fen());
  });
});

describe("(c) the learner is the side that mates", () => {
  for (const m of MATES) it(m.id, () => {
    const me = learnerOf(m.line.fen, m.line.moves);
    expect(me).not.toBe(new Chess(m.final).turn());
    const ps = plies(m);
    const mine = ps.filter(p => p.mine);
    expect(mine.length, "the learner's moves").toBeGreaterThanOrEqual(2);
    expect(mine.length, "the learner's moves").toBeLessThanOrEqual(5);
    expect(ps.length, "plies").toBeLessThanOrEqual(10);
    // the last ply is the learner's, it is the mate, and the moves alternate
    expect(ps[ps.length - 1].mine).toBe(true);
    ps.forEach((p, i) => { if (i) expect(p.mine, `ply ${i} alternates`).toBe(!ps[i - 1].mine); });
    // the move that mates gives check from a square that really attacks the king
    const f = mateFacts(m.final)!;
    expect(f.checkers.some(c => c.sq === ps[ps.length - 1].to) || f.checkers.length > 1, "the last move gives the check").toBe(true);
    for (const p of mine) expect(p.note?.en && p.note?.pa, `a note on ${p.san}`).toBeTruthy();
    // a bank line credits its Lichess puzzle id
    if (m.line.source.kind === "bank") expect(m.line.source.id).toMatch(/^[A-Za-z0-9]{5}$/);
  });
});

describe("(e) practice", () => {
  const ix = INDEX as unknown as Record<string, [string, string, string, number][][]>;
  for (const m of MATES.filter(x => x.practice)) it(m.id, () => {
    const { theme, rule } = m.practice!;
    if (theme) expect(bank.themeCounts[theme], `the bank has the theme ${theme}`).toBeGreaterThan(0);
    if (rule) expect(typeof rule).toBe("string");
    const pool = ix[m.id];
    // every position kept is a real mate of the right length (and of the pattern, where the classifier is exact)
    (pool ?? []).forEach((stage, k) => {
      expect(COUNTS[m.id][k], "counts match the index").toBe(stage.length);
      for (const [id, fen, moves] of stage) {
        const g = play(fen, moves.split(" "));
        expect(g.isCheckmate(), `${id} ends in checkmate`).toBe(true);
        expect(moves.split(" ").length, `${id} is mate in ${k + 1}`).toBe(2 * (k + 1));
        if (rule) expect(classify(g.fen()), `${id} is ${rule}`).toContain(rule);
      }
    });
  });
  it("a mate with no practice positions at a length has no entry for it, and the counts file has no stray ids", () => {
    for (const id of Object.keys(COUNTS)) expect(mateById(id)?.practice, id).toBeTruthy();
    for (const id of Object.keys(ix)) expect(COUNTS[id]).toBeTruthy();
  });
});

describe("the classifier on the known examples", () => {
  const cases: [string, string, string][] = [
    ["backrank", "3R2k1/5ppp/8/8/8/8/8/3K4 b - - 0 1", "backrank"],
    ["smothered", "6rk/5Npp/8/8/8/8/8/K7 b - - 0 1", "smothered"],
    ["arabian", "7k/7R/5N2/8/8/8/8/K7 b - - 0 1", "arabian"],
    ["anastasia", "8/4N1pk/8/7R/8/8/8/K7 b - - 0 1", "anastasia"],
    ["boden", "2kr4/3p4/B7/8/5B2/8/8/K7 b - - 0 1", "boden"],
    ["doublebishop", "7k/7p/8/3B4/8/2B5/8/K7 b - - 0 1", "doublebishop"],
    ["opera", "3Rk3/5p2/8/6B1/8/8/8/K7 b - - 0 1", "opera"],
    ["pawn", "8/8/8/7R/pkp5/Pn6/1P6/K7 b - - 0 1", "pawn"],
    ["damiano", "5rk1/6pQ/6P1/8/8/8/8/K7 b - - 0 1", "damiano"],
    ["lolli", "6k1/5pQ1/5Pp1/8/8/8/8/K7 b - - 0 1", "lolli"],
    ["legal", "3q1b2/4kB2/3p4/3NN3/8/8/8/K7 b - - 0 1", "legal"],
    ["legal (the bishop mates)", "3q1b2/4kB2/3p4/4N1B1/8/8/8/K7 b - - 0 1", "legal"],
    ["maxlange", "6Q1/5Bpk/7p/8/8/8/8/K7 b - - 0 1", "maxlange"],
    ["greco", "7k/6p1/8/7Q/2B5/8/8/K7 b - - 0 1", "greco"],
    ["reti", "1nbB4/1pk5/2p5/8/8/8/8/K2R4 b - - 0 1", "reti"],
    ["blackburne", "5rk1/7B/8/6N1/8/8/1B6/K7 b - - 0 1", "blackburne"],
    ["ladder", "R5k1/1R6/8/8/8/8/8/7K b - - 0 1", "ladder"],
    ["anderssen", "6kR/6P1/5K2/8/8/8/8/8 b - - 0 1", "anderssen"],
  ];
  for (const [name, fen, want] of cases) it(name, () => { expect(new Chess(fen).isCheckmate(), "the example is checkmate").toBe(true); expect(classify(fen)).toContain(want); });
  it("does not call one pattern another", () => {
    expect(classify("3R2k1/5ppp/8/8/8/8/8/3K4 b - - 0 1")).not.toContain("smothered");
    expect(classify("6rk/5Npp/8/8/8/8/8/K7 b - - 0 1")).not.toContain("backrank");
    expect(classify("2kr4/3p4/B7/8/5B2/8/8/K7 b - - 0 1")).not.toContain("doublebishop");
    expect(classify("7k/7p/8/3B4/8/2B5/8/K7 b - - 0 1")).not.toContain("boden");
    expect(classify("7k/7R/5N2/8/8/8/8/K7 b - - 0 1")).not.toContain("anastasia");
    expect(classify("5k2/5Q2/6B1/8/8/8/8/K7 b - - 0 1")).not.toContain("maxlange");   // Damiano's bishop mate: the bishop only guards the queen
    expect(classify("8/8/8/8/8/8/8/K6k w - - 0 1")).toEqual([]);   // not a mate
  });
});

describe("why it's mate, computed from the position", () => {
  it("names every checker, only squares next to the king, and shuts every square", () => {
    for (const m of MATES) {
      const f = mateFacts(m.final)!, mk = whyMarks(f), why = whyText(m.final), near = neighbours(f.king);
      expect(mk.king).toBe(f.king);
      for (const c of f.checkers) { expect(why.en, `${m.id} names ${c.sq}`).toContain(c.sq); expect(why.pa).toContain(c.sq); }
      for (const s of [...mk.covered, ...mk.blocked]) expect(near, `${m.id}: ${s} is next to the king`).toContain(s);
      expect(mk.covered.length + mk.blocked.length + f.flights.filter(x => x.theirs).length, "every flight is accounted for").toBe(near.length);
      // a covered square really is attacked by a piece of the mating side, and a blocked one holds the king's own piece
      for (const x of f.flights) { if (x.own) expect(x.own.color).toBe(f.mated); else expect(x.guards.length, `${m.id} ${x.sq}`).toBeGreaterThan(0); for (const gd of x.guards) expect(gd.color).toBe(f.by); }
      expect(whyText(m.final, true).en.length, "the Young look is shorter").toBeLessThan(why.en.length + 1);
    }
  });
  it("three sample texts, for the report", () => {
    const lines = ["arabian", "smothered", "dovetail"].map(id => { const m = mateById(id)!; const w = whyText(m.final); return `${id}\n${m.final}\n${w.en}\n${w.pa}`; });
    if (process.env.MATES_SAMPLES) writeFileSync(process.env.MATES_SAMPLES, lines.join("\n\n"));
    expect(lines.length).toBe(3);
  });
  it("a move note says check, capture, threat or mate, and reads only what is on the board", () => {
    const n = (fen: string, u: string, next?: string) => moveNote(fen, u, next).en;
    expect(n("6k1/5ppp/8/8/8/8/8/R2K4 w - - 0 1", "a1a8")).toMatch(/^Checkmate!/);
    expect(n("6k1/5ppp/8/8/8/8/8/R2K4 w - - 0 1", "a1a7")).not.toMatch(/Checkmate/);
    expect(n("r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3", "d1h5")).toMatch(/threatens checkmate with Qxf7#/);
    expect(n("4k3/8/8/8/8/8/8/4K2R w - - 0 1", "h1h8")).toMatch(/^Check!/);
    expect(n("4k3/8/8/8/8/8/8/4K2R w - - 0 1", "e1d2")).toMatch(/^A quiet move/);
  });
});

describe("words: both languages, real Gurmukhi, house rules", () => {
  const strings: [string, string, string][] = [];
  const add = (where: string, x: { en: string; pa: string }) => strings.push([where, x.en, x.pa]);
  for (const g of MATE_GROUPS) add(`group ${g.group}`, g.title);
  for (const m of MATES) {
    add(`${m.id} name`, m.name); add(`${m.id} about`, m.about); if (m.also) add(`${m.id} also`, m.also);
    if (m.line.source.kind === "game") add(`${m.id} source`, m.line.source.name);
    for (const [i, n] of Object.entries(m.line.notes ?? {})) add(`${m.id} note ${i}`, n);
    add(`${m.id} why`, whyText(m.final)); add(`${m.id} why (young)`, whyText(m.final, true));
    for (const p of plies(m)) if (p.note) add(`${m.id} ${p.san}`, p.note);
  }
  for (const [k, v] of Object.entries(UI)) if (k.startsWith("mates")) add(k, v);
  it("collected the strings", () => { expect(strings.length).toBeGreaterThan(300); });
  it("every one has English and Punjabi", () => { for (const [w, en, pa] of strings) { expect(en.trim(), w).not.toBe(""); expect(pa.trim(), w).not.toBe(""); expect(/[਀-੿]/.test(pa), `${w}: Gurmukhi`).toBe(true); expect(/[਀-੿]/.test(en), `${w}: no Gurmukhi in English`).toBe(false); } });
  it("no garbled Gurmukhi (UTF-8 read as Latin-1)", () => { for (const [w, , pa] of strings) expect(pa, w).not.toMatch(/à[¨©]/); });
  it("the nukta letters are decomposed (letter + U+0A3C), never the composed forms", () => { for (const [w, en, pa] of strings) { expect(pa, w).not.toMatch(/[ਲ਼ਸ਼ਖ਼ਗ਼ਜ਼ਫ਼]/); expect(en, w).not.toMatch(/[ਲ਼ਸ਼ਖ਼ਗ਼ਜ਼ਫ਼]/); } });
  it("no space before a ਡੰਡੀ (this app's convention)", () => { for (const [w, , pa] of strings) expect(pa, w).not.toMatch(/ ।/); });
  it("no letter-spacing words and no Devanagari strays", () => { for (const [w, , pa] of strings) expect(pa, w).not.toMatch(/[ऀ-ॣ॥-ॿ]/); });
});

describe("progress is saved and merged", () => {
  it("steps done on either device stay done; the card further along wins; nothing on both sides stays undefined", () => {
    const a = { ...emptySaved(), mates: { done: { backrank: ["see", "watch"], arabian: ["see"] }, cards: { "mate:backrank": { box: 1, due: "2026-11-10" } } } };
    const b = { ...emptySaved(), mates: { done: { backrank: ["watch", "help", "p1"], smothered: ["see"] }, cards: { "mate:backrank": { box: 2, due: "2026-11-12" }, "mate:smothered": { box: 0, due: "2026-11-06" } } } };
    const m = merge(a, b).mates!;
    expect([...m.done.backrank].sort()).toEqual(["help", "p1", "see", "watch"]);
    expect(m.done.arabian).toEqual(["see"]);
    expect(m.done.smothered).toEqual(["see"]);
    expect(m.cards["mate:backrank"]).toEqual({ box: 2, due: "2026-11-12" });
    expect(m.cards["mate:smothered"]).toEqual({ box: 0, due: "2026-11-06" });
    const norm = (x: typeof m) => ({ cards: x.cards, done: Object.fromEntries(Object.entries(x.done).map(([k, v]) => [k, [...v].sort()])) });
    expect(norm(merge(b, a).mates!)).toEqual(norm(m));   // either way round
    expect(merge(emptySaved(), emptySaved()).mates).toBeUndefined();
    expect(merge(a, emptySaved()).mates).toEqual(a.mates);
  });
  it("is part of what an account saves, and a reset clears it", () => {
    store.set({ mates: { done: { backrank: ["see"] }, cards: {} }, xp: 0 });
    expect(savable(store.get()).mates).toEqual({ done: { backrank: ["see"] }, cards: {} });
    store.resetProgress();
    expect(store.get().mates).toBeUndefined();
  });
});

// ---------- (d) Stockfish: every move of the learner's is a mating or best move ----------
const proof = process.env.ENGINE === "1" ? describe : describe.skip;
proof("(d) engine proof: the learner's moves", () => {
  const D = 16;
  const log: string[] = [];
  for (const m of MATES) it(m.id, async () => {
    const eng = await nodeEngine();
    for (const p of plies(m).filter(x => x.mine)) {
      const before = await eng.analyse(p.before, { depth: D });
      if (before.best === p.uci) { log.push(`${m.id} ${p.san}: best`); continue; }
      const after = new Chess(p.after);
      if (after.isCheckmate()) { log.push(`${m.id} ${p.san}: mate`); continue; }
      const a = await eng.analyse(p.after, { depth: D });
      if (a.score.mate !== undefined && a.score.mate < 0) { log.push(`${m.id} ${p.san}: forced mate for the learner (${-a.score.mate}), the engine prefers ${before.best}`); continue; }
      // a famous trap's quiet moves are sound but not always the engine's first choice: within 60 centipawns of the best
      const bestAfter = await eng.analyse((() => { const g = new Chess(p.before); g.move({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), promotion: before.best[4] }); return g.fen(); })(), { depth: D });
      const loss = -(a.score.cp ?? 0) - -(bestAfter.score.cp ?? 0);
      log.push(`${m.id} ${p.san}: ${Math.abs(loss) <= 60 ? "sound" : "NOT BEST"} (cp loss ${-loss})`);
      expect(Math.abs(loss), `${m.id}: ${p.san} against the engine's ${before.best}`).toBeLessThanOrEqual(60);
    }
  }, 120000);
  it("writes the log", () => { if (process.env.ENGINE_LOG) writeFileSync(process.env.ENGINE_LOG, log.join("\n")); });
});
