// The Puzzles tab (DECISIONS #72): a hub, the daily puzzle (matched to the learner's level), and Puzzle Race
// (3 minutes, 3 misses, climbing in difficulty). Puzzles are real Lichess positions (CC0), already in the app.
import { Chess } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen } from "../chess/types";
import { pieceHTML } from "../chess/pieces";
import { confetti } from "../celebrate";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { runExercise } from "../lesson/exercises";
import { sound } from "../sound";
import { store, today } from "../store";
import { tabbar } from "../tabbar";
import { dailyPuzzle, raceShort, raceStart, raceTarget, rushNext, rushPool } from "./pick";
import { asExercise, puzzleById } from "./index";
import { type BankPuzzle, bankById, bankExercise, nearRating, THEMES, themeName } from "./bank";
import type { PuzzleExercise, Text } from "../lesson/types";
import { bankDue, bankIds } from "./due";
import { RUNGS } from "../content/ladder";
import { rungsDone } from "../ladder/screen";
export { bankDue };

type Go = (h: string) => void;
const RUSH_SECONDS = 180, RUSH_MISSES = 3;

function thumb(fen: string): string {
  const b = placementFromFen(fen);
  let out = "";
  for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
    const sq = "abcdefgh"[f] + r, p = b[sq];
    out += `<div class="${(f + r) % 2 ? "l" : "d"}">${p ? pieceHTML(p) : ""}</div>`;
  }
  return `<div class="thumb">${out}</div>`;
}
const bar = (title: string, right = "") => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
  <h1 class="grow">${title}</h1>${right}</div>`;

export function puzzleHub(root: HTMLElement, level: number, go: Go) {
  const s = store.get(), d = dailyPuzzle(today(), level), done = s.daily.date === today() && s.daily.solved;
  root.innerHTML = `<div class="screen tabbed">${bar(t("puzzlesTitle"))}
    <button class="contcard" data-daily>${thumb(d.fen)}
      <span class="grow"><small>${t("dailyTitle")} · ${t("level")} ${num(level)}</small><b>${done ? t("dailyDone") : t("dailyFind")}</b>
        <small>${done ? t("dailyTomorrow") : t("dailyReward")}</small></span>
      <span class="playbtn">${icon(done ? "check" : "play")}</span></button>
    ${bankDue() ? `<button class="rushcard bank" data-bank><span class="rushicon">${icon("again")}</span>
      <span class="grow"><b>${t(store.get().look === "young" ? "bankTitleYoung" : "bankTitle")}</b><small>${t("bankAbout")}</small></span>
      <span class="best"><small>${t("bankDue")}</small><b>${num(bankDue())}</b></span></button>` : ""}
    <button class="rushcard" data-rated><span class="rushicon">${icon("puzzle")}</span>
      <span class="grow"><b>${t("ratedTitle")}</b><small>${t(s.look === "young" ? "ratedAboutYoung" : "ratedAbout")}</small></span>
      ${s.look === "young" ? "" : `<span class="best"><small>${t("puzzleRating")}</small><b>${num((s.prating ?? s.rating).r)}</b></span>`}</button>
    <button class="rushcard" data-themes><span class="rushicon">${icon("target")}</span>
      <span class="grow"><b>${t("themesTitle")}</b><small>${t("themesAbout").split(/[.।]/)[0]}</small></span>${icon("arrowRight")}</button>
    <button class="rushcard" data-survival><span class="rushicon">${icon("heart")}</span>
      <span class="grow"><b>${t("survTitle")}</b><small>${t("survAbout")}</small></span>
      <span class="best"><small>${t("rushBest")}</small><b>${num(s.survivalBest ?? 0)}</b></span></button>
    <button class="rushcard" data-ladder><span class="rushicon">${icon("target")}</span>
      <span class="grow"><b>${t("egTitle")}</b><small>${t("egAboutShort")}</small></span>
      <span class="best"><b>${num(rungsDone())} / ${num(RUNGS.length)}</b></span></button>
    <button class="rushcard" data-solo><span class="rushicon">${icon("grid")}</span>
      <span class="grow"><b>${t("soloTitle")}</b><small>${t("soloAbout")}</small></span>${icon("arrowRight")}</button>
    <button class="rushcard" data-rush><span class="rushicon">${icon("timer")}</span>
      <span class="grow"><b>${t("rushTitle")}</b><small>${t("rushAbout")}</small></span>
      <span class="best"><small>${t("rushBest")}</small><b>${num(s.rushBest)}</b></span></button>
    <p class="note">${t("puzzlesSource")}</p></div>${tabbar("puzzles")}`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/");
  root.querySelector<HTMLButtonElement>("[data-daily]")!.onclick = () => go("#/puzzles/daily");
  root.querySelector<HTMLButtonElement>("[data-rush]")!.onclick = () => go("#/puzzles/rush");
  root.querySelector<HTMLButtonElement>("[data-survival]")!.onclick = () => go("#/puzzles/survival");
  root.querySelector<HTMLButtonElement>("[data-ladder]")!.onclick = () => go("#/ladder");
  root.querySelector<HTMLButtonElement>("[data-solo]")!.onclick = () => go("#/puzzles/solo");
  root.querySelector<HTMLButtonElement>("[data-rated]")!.onclick = () => go("#/puzzles/rated");
  root.querySelector<HTMLButtonElement>("[data-themes]")!.onclick = () => go("#/puzzles/themes");
  root.querySelector<HTMLButtonElement>("[data-bank]")?.addEventListener("click", () => go("#/puzzles/bank"));
}

/** Shared frame for one puzzle on screen. */
function puzzleScreen(root: HTMLElement, title: string, right: string) {
  root.innerHTML = `<div class="screen">${bar(title, right)}
    <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    <div class="status" data-status></div><div class="extra" data-extra></div>
    <div class="actions" data-actions></div></div>`;
  const bubble = root.querySelector<HTMLElement>("[data-say]")!;
  return {
    board: new Board(root.querySelector("[data-board]")!, {}),
    extra: root.querySelector<HTMLElement>("[data-extra]")!,
    actions: root.querySelector<HTMLElement>("[data-actions]")!,
    status: (html: string) => { root.querySelector("[data-status]")!.innerHTML = html; },
    say: (text: string, tone: "ok" | "no" | "info" = "info") => {
      bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
    },
  };
}

/** Fix your mistakes: up to 10 banked puzzles. Wrong moves can be tried again (and the answer is shown after
 *  two); a clean solve moves the puzzle up a box, and three clean solves in a row take it out of the bank. */
export function playBank(root: HTMLElement, go: Go, phase?: string): () => void {
  const ph = (["opening", "middlegame", "endgame"] as const).find(x => x === phase);
  // from Insights: your own drills for that phase first, then the rest of the bank
  const ids = (ph ? [...bankIds(ph), ...bankIds().filter(i => !store.get().missed[i].mine || store.get().missed[i].mine!.ph !== ph)] : bankIds()).slice(0, 10);
  let i = 0, clean = 0, alive = true, cleanup: (() => void) | null = null, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null; };
  async function next() {
    teardown();
    if (i >= ids.length) {
      root.innerHTML = `<div class="screen"><div class="complete"><div class="trophy light">${icon("again")}</div>
        <h1>${num(clean)} / ${num(ids.length)}</h1><p>${t("bankClean")}</p></div>
        <div class="actions"><button class="btn wide" data-hub>${t("puzzlesTitle")}</button></div></div>`;
      root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/puzzles");
      return;
    }
    const id = ids[i], card = store.get().missed[id], r = card?.r, mine = card?.mine;
    let p: { id: string; fen: string; moves: string[]; rating: number; themes?: string[] } | undefined = mine ? { id, fen: mine.fen, moves: mine.moves, rating: 0 } : puzzleById(id);
    if (!p && r) { try { p = await bankById(id, r); } catch { /* offline */ } }
    if (!alive) return;
    if (!p) { i++; return void next(); }   // offline and its band never opened: skip it for now
    ui = puzzleScreen(root, `${t("bankTitle")} · ${num(i + 1)}/${num(ids.length)}`, "");
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
    const ex = asExercise(p);
    if (mine) ex.prompt = { en: `In your game you played ${mine.san}. Find the better move.`, pa: `ਆਪਣੀ ਖੇਡ ਵਿੱਚ ਤੁਸੀਂ ${mine.san} ਚੱਲੀ ਸੀ। ਬਿਹਤਰ ਚਾਲ ਲੱਭੋ।` };
    cleanup = runExercise(ex, {
      board: ui.board, extra: ui.extra, status: ui.status,
      say: (text, tone = "info") => { ui!.say(text, tone); if (tone === "no") sound.wrong(); },
      done: mistakes => {
        store.recordPuzzle(id, undefined, mistakes === 0, p.themes);   // a replay of a missed puzzle: no rating change
        if (mistakes === 0) { clean++; sound.correct(); }
        ui!.say(t(mistakes === 0 ? "bankFixed" : "bankAgain"), mistakes === 0 ? "ok" : "no");
        ui!.actions.innerHTML = `<button class="btn wide" data-next>${t("continue")}</button>`;
        ui!.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { i++; void next(); };
      },
    });
  }
  if (!ids.length) { go("#/puzzles"); return teardown; }
  void next();
  return () => { alive = false; teardown(); };
}

export function playDaily(root: HTMLElement, level: number, go: Go): () => void {
  const d = dailyPuzzle(today(), level);
  const ui = puzzleScreen(root, `${t("dailyTitle")} · ${t("level")} ${num(level)}`, "");
  let cleanup: (() => void) | null = null;
  // practice, not a test: wrong moves can be tried again, and finishing it is what counts
  cleanup = runExercise(d, {
    board: ui.board, extra: ui.extra, status: ui.status,
    say: (text, tone = "info") => { ui.say(text, tone); if (tone === "no") sound.wrong(); },
    done: mistakes => {
      store.recordPuzzle(d.id, puzzleById(d.id)?.rating, mistakes === 0, puzzleById(d.id)?.themes);
      const gained = store.solveDaily();
      sound.correct();
      ui.say(gained ? `${t("dailySolved")} +${num(gained)} ${t("xp")}` : t("dailySolved"), "ok");
      ui.actions.innerHTML = `<button class="btn wide" data-hub>${t("continue")}</button>`;
      ui.actions.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/puzzles");
      if (gained) confetti(root.querySelector(".screen")!, 30);
    },
  });
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
  return () => { cleanup?.(); ui.board.destroy(); };
}

type RaceEx = PuzzleExercise & { id: string; rating: number; themes?: string[]; bank?: boolean };
/** The Race: 3 minutes, 3 misses. Everyone but the Young look races on the rated bank, starting near their puzzle rating
 *  and climbing (src/puzzles/pick.ts raceStart); the Young look keeps the gentle lesson-pack climb from 400. Offline with
 *  the bank never opened, the Race falls back to the lesson packs rather than not starting. */
export function playRush(root: HTMLElement, go: Go): () => void {
  const pool = rushPool(), used = new Set<string>(), rated = !young(), start = raceStart(puzzleRating().r);
  let step = 0, score = 0, misses = 0, left = RUSH_SECONDS, over = false, timer = 0;
  let cleanup: (() => void) | null = null, ui: ReturnType<typeof puzzleScreen> | null = null;
  // leaving mid-answer: the pending "next puzzle" and "finish" timers must find the Race over (DECISIONS #128)
  const teardown = () => { over = true; clearInterval(timer); cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null; };
  const leave = teardown;
  const clock = () => `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const head = () => `<span class="pill rushhead"><span data-clock>${num(clock())}</span>
    <span class="strikes">${Array.from({ length: RUSH_MISSES }, (_, i) => icon("close", i < misses ? "hit" : "")).join("")}</span>
    <b data-score>${num(score)}</b></span>`;

  /** The next puzzle: from the rated bank near the climbing target, or (Young look, or no bank offline) from the lesson packs. */
  async function pick(): Promise<RaceEx> {
    if (rated) {
      try {
        const p = await nearRating(raceTarget(start, step), used, undefined, Math.random, raceShort);
        if (p) { used.add(p.id); return { ...bankExercise(p), id: p.id, rating: p.rating, themes: p.themes, bank: true }; }
      } catch { /* offline and this band never opened: the lesson packs */ }
    }
    return rushNext(pool, step, used);
  }
  let queued: Promise<RaceEx> | null = null;

  function intro() {
    root.innerHTML = `<div class="screen">${bar(t("rushTitle"))}
      <div class="hero"><div class="trophy light">${icon("timer")}</div><h1>${t("rushTitle")}</h1><p>${t(rated ? "raceIntro" : "rushIntro")}</p>
        ${rated ? `<p class="muted">${t("raceStartsAt").replace("{r}", num(start))}</p>` : ""}
        <p><b>${t("rushBest")}: ${num(store.get().rushBest)}</b></p></div>
      <div class="actions"><button class="btn wide" data-go>${t("start")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = async () => {
      // the first puzzle (and its rating band) is fetched BEFORE the clock starts, so a slow connection costs no time
      const first = pick(); queued = first;
      (root.querySelector("[data-go]") as HTMLButtonElement).disabled = true; await first;
      if (over) return;
      timer = window.setInterval(() => {
        left--; const c = root.querySelector("[data-clock]"); if (c) c.textContent = num(clock());
        if (left <= 10) c?.classList.add("low");
        if (left <= 0) finish();
      }, 1000);
      void next();
    };
  }

  async function next() {
    if (over) return;
    cleanup?.(); ui?.board.destroy();
    ui = puzzleScreen(root, t("rushTitle"), head());
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { leave(); go("#/puzzles"); };
    const ex = await (queued ?? pick()); queued = null;
    if (over || !ui) return;
    const here = ui;
    let decided = false;
    const decide = (ok: boolean) => {
      if (decided || over) return; decided = true;
      // Race answers are against the clock: unrated. A missed bank puzzle still joins the mistake bank, with its rating
      store.recordPuzzle(ex.id, undefined, ok, ex.themes ?? puzzleById(ex.id)?.themes, ex.bank ? ex.rating : undefined);
      if (ok) { score++; step++; sound.correct(); } else { misses++; sound.wrong(); }
      here.say(t(ok ? "correct" : "rushMiss"), ok ? "ok" : "no");
      if (misses >= RUSH_MISSES) return void setTimeout(finish, 700);
      // the next puzzle is fetched while this one's answer is on screen
      if (!over) queued = pick();
      setTimeout(() => void next(), ok ? 450 : 900);
    };
    cleanup = runExercise(ex, {
      board: here.board, extra: here.extra, status: here.status,   // "You play Black": the board flips between puzzles
      // a legal but wrong move is a miss; an illegal slip only gets the reason
      say: (text, tone = "info") => { if (tone === "no" && text === t("puzzleWrong")) return decide(false); if (!decided) here.say(text, tone); },
      done: mistakes => decide(mistakes === 0),
    });
  }

  function finish() {
    if (over) return; over = true;
    const best = store.get().rushBest, record = score > best;
    store.recordRush(score);
    teardown();
    root.innerHTML = `<div class="screen ${record ? "donescreen" : ""}"><div class="complete">
      <div class="trophy ${record ? "" : "light"}">${icon(record ? "trophy" : "timer")}</div>
      <h1>${num(score)}</h1><p>${t("rushSolved")}</p>
      <p class="${record ? "testmsg" : ""}">${record ? t("rushRecord") : `${t("rushBest")}: ${num(Math.max(best, score))}`}</p></div>
      <div class="actions" style="flex-direction:column">
        <button class="btn wide ${record ? "gold" : ""}" data-again>${t("playAgain")}</button>
        <button class="btn ghost wide" data-hub>${t("puzzlesTitle")}</button></div></div>`;
    if (record) confetti(root.querySelector(".screen")!);
    root.querySelector<HTMLButtonElement>("[data-again]")!.onclick = () => go(`#/puzzles/rush?${Date.now()}`);
    root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/puzzles");
  }

  intro();
  return leave;
}

// ---------- Puzzle Survival (DECISIONS #115, option B) ----------
const SURV_LIVES = 3, SURV_STEP = 60;
/** Puzzles from the big bank with no clock and three lives, starting a little below the learner's puzzle rating and
 *  climbing 60 points a solve. A lost life shows the right move before the next puzzle. Unrated, like the Race. */
export function playSurvival(root: HTMLElement, go: Go): () => void {
  const used = new Set<string>(), first = Math.max(400, puzzleRating().r - 200);
  let r = first, score = 0, lives = SURV_LIVES, over = false, alive = true;
  let cleanup: (() => void) | null = null, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { alive = false; cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null; };
  const head = () => `<span class="pill rushhead"><span class="hearts" aria-label="${lives === 1 ? t("survLife1") : t("survLives").replace("{n}", num(lives))}">${Array.from({ length: SURV_LIVES }, (_, i) => icon("heart", i < lives ? "full" : "lost")).join("")}</span>
    <b data-score>${num(score)}</b></span>`;

  function intro() {
    root.innerHTML = `<div class="screen">${bar(t("survTitle"))}
      <div class="hero"><div class="trophy light">${icon("heart")}</div><h1>${t("survTitle")}</h1><p>${t("survIntro")}</p>
        <p><b>${t("rushBest")}: ${num(store.get().survivalBest ?? 0)}</b></p></div>
      <div class="actions"><button class="btn wide" data-go>${t("start")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = () => void next();
  }

  async function next() {
    if (over || !alive) return;
    cleanup?.(); cleanup = null; ui?.board.destroy();
    ui = puzzleScreen(root, t("survTitle"), head());
    // the difficulty bar: how far the run has climbed (a full bar is 1,200 points above the start)
    root.querySelector(".lessonbar")!.insertAdjacentHTML("afterend", `<div class="ramp"><i style="width:${Math.min(100, ((r - first) / 1200) * 100 + 4)}%"></i>
      <span>${young() ? t("survRampYoung") : t("survRamp").replace("{r}", num(r))}</span></div>`);
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { teardown(); go("#/puzzles"); };
    let p: BankPuzzle | null = null;
    try { p = await nearRating(r, used); } catch { /* offline and never opened: end the run */ }
    if (!alive || !ui) return;
    if (!p) return finish();
    used.add(p.id);
    const pz = p, here = ui;
    let decided = false, solvedMoves = 0;
    const decide = (ok: boolean) => {
      if (decided || over) return; decided = true;
      store.recordPuzzle(undefined, undefined, ok, pz.themes);
      if (ok) { score++; r += SURV_STEP; sound.correct(); here.say(t("correct"), "ok"); return void setTimeout(next, 450); }
      lives--; sound.wrong();
      // the right move, from where the learner went wrong: the setup move, then each correct move and its reply
      const g = new Chess(pz.fen);
      for (const u of pz.moves.slice(0, 1 + 2 * solvedMoves)) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      const right = pz.moves[1 + 2 * solvedMoves];
      here.board.interact({});
      here.board.set(placementFromFen(g.fen()), { arrows: [[right.slice(0, 2), right.slice(2, 4)]] });
      here.say(t("survLost"), "no");
      const h = root.querySelector(".rushhead"); if (h) h.outerHTML = head();
      setTimeout(() => (lives <= 0 ? finish() : void next()), 1800);
    };
    cleanup = runExercise(bankExercise(pz), {
      board: here.board, extra: here.extra, status: here.status,
      say: (text, tone = "info") => {
        if (tone === "no" && text === t("puzzleWrong")) return decide(false);
        if (tone === "ok" && text === t("correct")) solvedMoves++;
        if (!decided) here.say(text, tone);
      },
      done: mistakes => decide(mistakes === 0),
    });
  }

  function finish() {
    if (over || !alive) return; over = true;
    const best = store.get().survivalBest ?? 0, record = score > best;
    store.recordSurvival(score);
    teardown();
    root.innerHTML = `<div class="screen ${record ? "donescreen" : ""}"><div class="complete">
      <div class="trophy ${record ? "" : "light"}">${icon(record ? "trophy" : "heart")}</div>
      <h1>${num(score)}</h1><p>${t("rushSolved")}</p>
      <p class="${record ? "testmsg" : ""}">${record ? t("rushRecord") : `${t("rushBest")}: ${num(Math.max(best, score))}`}</p></div>
      <div class="actions" style="flex-direction:column">
        <button class="btn wide ${record ? "gold" : ""}" data-again>${t("playAgain")}</button>
        <button class="btn ghost wide" data-hub>${t("puzzlesTitle")}</button></div></div>`;
    if (record) confetti(root.querySelector(".screen")!);
    root.querySelector<HTMLButtonElement>("[data-again]")!.onclick = () => go(`#/puzzles/survival?${Date.now()}`);
    root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/puzzles");
  }

  intro();
  return teardown;
}

// ---------- Rated puzzles and themes (DECISIONS #85) ----------
/** The puzzle rating, starting from the playing rating the first time. */
const puzzleRating = () => store.get().prating ?? { ...store.get().rating, n: 0 };
const young = () => store.get().look === "young";

/** Endless rated puzzles from the big bank, each near the learner's puzzle rating (chess.com's "Puzzles"). With a
 *  theme, every puzzle has that theme. A first wrong move fails it (the answer can still be found); the rating moves
 *  after each one. The Young look sees no numbers, only right or wrong. */
export function playRated(root: HTMLElement, go: Go, theme?: string): () => void {
  const used = new Set<string>(), back = theme ? "#/puzzles/themes" : "#/puzzles";
  let alive = true, cleanup: (() => void) | null = null, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { alive = false; cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null; };
  const title = theme ? tx(themeName(theme) ?? { en: theme, pa: theme }) : t("ratedTitle");
  const head = () => young() ? "" : `<span class="pill">${icon("target")} <b data-pr>${num(puzzleRating().r)}</b></span>`;
  async function next() {
    cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null;
    root.innerHTML = `<div class="screen">${bar(title, head())}<p class="muted">${t("loading")}</p></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    let p: BankPuzzle | null = null;
    try { p = await nearRating(puzzleRating().r, used, theme); } catch { /* offline and this band never opened */ }
    if (!alive) return;
    if (!p) {
      root.innerHTML = `<div class="screen">${bar(title)}<p class="note">${t("bankOffline")}</p>
        <div class="actions"><button class="btn wide" data-again>${t("retry")}</button></div></div>`;
      root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
      root.querySelector<HTMLButtonElement>("[data-again]")!.onclick = () => void next();
      return;
    }
    used.add(p.id);
    const pz = p;
    ui = puzzleScreen(root, title, head());
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    cleanup = runExercise(bankExercise(pz), {
      board: ui.board, extra: ui.extra, status: ui.status,
      say: (text, tone = "info") => { ui!.say(text, tone); if (tone === "no") sound.wrong(); },
      done: mistakes => {
        // only a real wrong move counts (an illegal slip is never a wrong answer: runPuzzle doesn't count it)
        const clean = mistakes === 0, before = puzzleRating().r;
        store.recordPuzzle(pz.id, pz.rating, clean, pz.themes);
        const d = puzzleRating().r - before;
        if (clean) sound.correct();
        ui!.say(young() ? t(clean ? "correct" : "ratedSolvedLate")
          : `${t(clean ? "correct" : "ratedSolvedLate")} <b class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : "−"}${num(Math.abs(d))}</b>`, clean ? "ok" : "no");
        const pr = root.querySelector("[data-pr]"); if (pr) pr.textContent = num(puzzleRating().r);
        ui!.actions.innerHTML = `${young() ? "" : `<small class="muted">${t("ratedPuzzle")} ${num(pz.rating)}</small>`}
          <button class="btn wide" data-next>${t("ratedNext")}</button>`;
        ui!.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => void next();
      },
    });
  }
  void next();
  return teardown;
}

/** Puzzle themes: practise one idea at a time, with how well each has gone so far (the stats' strong and weak themes). */
export function themesScreen(root: HTMLElement, go: Go) {
  const ts = store.get().themeStats ?? {};
  const row = (id: string, name: Text) => {
    const [n, ok] = ts[id] ?? [0, 0], pct = n ? Math.round((ok / n) * 100) : -1;
    return `<button class="themerow" data-theme="${id}"><span class="grow"><b>${tx(name)}</b>
      <small>${n ? `${num(ok)} / ${num(n)} ${t("themeSolved")}` : t("themeNew")}</small></span>
      ${pct >= 0 ? `<span class="tpct ${pct >= 70 ? "good" : pct < 50 ? "weak" : ""}">${num(pct)}%</span>` : ""}${icon("arrowRight")}</button>`;
  };
  root.innerHTML = `<div class="screen tabbed">${bar(t("themesTitle"))}<p class="muted">${t("themesAbout")}</p>
    <div class="themelist">${THEMES.map(x => row(x.id, x.name)).join("")}</div></div>${tabbar("puzzles")}`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
  root.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach(b => b.onclick = () => go(`#/puzzles/theme/${b.dataset.theme}`));
}
