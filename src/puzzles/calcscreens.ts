// Calculate (feature 3): the hub card's screen, the calculation drill (blindfold-to-depth) and the board-vision rounds.
// The rules live in calc.ts and vision.ts (tested); this file is only the screens.
import { Chess } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type PieceCode, type Square } from "../chess/types";
import { confetti } from "../celebrate";
import { getEngine } from "../engine/browser";
import { num, t } from "../i18n";
import { icon } from "../icons";
import { sound } from "../sound";
import { store } from "../store";
import { tabbar } from "../tabbar";
import { nearRating } from "./bank";
import { CALC_LEVELS, CALC_UNLOCK, calcTarget, calcUnlocked, checkAnswer, fitsLevel, legalAfter, makeDrill, rateCandidates, type CalcDrill } from "./calc";
import { bar, puzzleScreen } from "./screens";
import {
  ROUND_SECONDS, VISION_KINDS, YOUNG_KINDS, YOUNG_TASKS, answerTask, freshState, makeTask, roundScore, squareOf, tapSquare,
  type VisionKind, type VisionTask,
} from "./vision";

type Go = (h: string) => void;
const young = () => store.get().look === "young";
const puzzleRating = () => (store.get().prating ?? store.get().rating).r;
const fill = (s: string, v: Record<string, string>) => Object.entries(v).reduce((a, [k, x]) => a.replace(`{${k}}`, x), s);
/** Whether the learner wants to list candidates first (kept for the visit, not saved). */
let candidatesFirst = false;

const KIND_KEY: Record<VisionKind, "pcN" | "pcB" | "pcR" | "pcQ" | null> = { knight: "pcN", bishop: "pcB", rook: "pcR", queen: "pcQ", colour: null, name: null };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Short, calm drill names for the hub. */
const label = (k: VisionKind) => k === "colour" ? `${t("visionLight")} / ${t("visionDark")}` : k === "name" ? "a1 – h8" : cap(t(KIND_KEY[k]!));

// ---------- the hub ----------
export function calcHub(root: HTMLElement, go: Go) {
  const s = store.get(), open = calcUnlocked(s.calcBest), kinds = young() ? YOUNG_KINDS : VISION_KINDS;
  const levels = young() ? "" : Array.from({ length: CALC_LEVELS }, (_, i) => {
    const n = i + 1, locked = n > open;
    return `<button class="rushcard" data-level="${n}" ${locked ? "disabled" : ""}><span class="rushicon">${icon(locked ? "lock" : "target")}</span>
      <span class="grow"><b>${t(`calcLevel${n}` as "calcLevel1")}</b><small>${locked ? t("calcLocked") : fill(t("calcBestN"), { n: num(s.calcBest?.[i] ?? 0) })}</small></span></button>`;
  }).join("");
  root.innerHTML = `<div class="screen tabbed">${bar(t("calcTitle"))}
    ${young() ? "" : `<h2 class="sectionhead">${t("calcMenuCalc")}</h2>${levels}
    <label class="rushcard" style="cursor:pointer"><input type="checkbox" data-cands ${candidatesFirst ? "checked" : ""} aria-label="${t("calcCandOpt")}">
      <span class="grow"><b>${t("calcCandOpt")}</b></span></label>`}
    <h2 class="sectionhead">${t(young() ? "calcMenuVisionYoung" : "calcMenuVision")}</h2>
    ${kinds.map(k => `<button class="rushcard" data-vision="${k}"><span class="rushicon">${icon("grid")}</span>
      <span class="grow"><b>${label(k)}</b></span><span class="best"><small>${t("rushBest")}</small><b>${num(s.visionBest?.[k] ?? 0)}</b></span></button>`).join("")}
    </div>${tabbar("puzzles")}`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
  root.querySelectorAll<HTMLButtonElement>("[data-level]").forEach(b => b.onclick = () => go(`#/puzzles/calc/${b.dataset.level}`));
  root.querySelectorAll<HTMLButtonElement>("[data-vision]").forEach(b => b.onclick = () => go(`#/puzzles/calc/v-${b.dataset.vision}`));
  const c = root.querySelector<HTMLInputElement>("[data-cands]");
  if (c) c.onchange = () => { candidatesFirst = c.checked; };
}

// ---------- calculation ----------
const sanOf = (fen: string, from: string, to: string) => {
  try { const g = new Chess(fen); return g.moves({ verbose: true }).find(m => m.from === from && m.to === to)?.san ?? `${from}${to}`; } catch { return `${from}${to}`; }
};

export function playCalc(root: HTMLElement, go: Go, level: number): () => void {
  if (young() || level < 1 || level > CALC_LEVELS || level > calcUnlocked(store.get().calcBest)) { go("#/puzzles/calc"); return () => {}; }
  const used = new Set<string>();
  let streak = 0, alive = true, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { alive = false; ui?.board.destroy(); ui = null; };

  function intro() {
    root.innerHTML = `<div class="screen">${bar(t("calcTitle"))}
      <div class="hero"><div class="trophy light">${icon("target")}</div><h1>${t(`calcLevel${level}` as "calcLevel1")}</h1><p>${t("calcIntro")}</p>
        <p><b>${fill(t("calcBestN"), { n: num(store.get().calcBest?.[level - 1] ?? 0) })}</b></p></div>
      <div class="actions"><button class="btn wide" data-go>${t("start")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles/calc");
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = () => void next();
  }

  async function next() {
    if (!alive) return;
    ui?.board.destroy();
    ui = puzzleScreen(root, `${t("calcTitle")} · ${num(level)}`, `<span class="pill rushhead"><b data-streak>${fill(t("calcStreakN"), { n: num(streak) })}</b></span>`);
    const here = ui;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { teardown(); go("#/puzzles/calc"); };
    let drill: CalcDrill | null = null;
    try {
      for (let k = 0; k < 6 && !drill; k++) {
        const p = await nearRating(calcTarget(puzzleRating(), level), used, undefined, Math.random, q => fitsLevel(q, level));
        if (!p) break;
        used.add(p.id); drill = makeDrill(p, level);
      }
    } catch { /* offline and the band was never opened */ }
    if (!alive || ui !== here) return;
    if (!drill) { here.say(t("calcNone"), "no"); return; }
    const d = drill, mine = d.fen.split(" ")[1] === "b";
    here.board.setFlip(mine);
    here.board.set(placementFromFen(d.fen), { arrows: d.hidden.map(h => [h.from, h.to] as [Square, Square]) });
    here.extra.innerHTML = `<div class="calcline"><small>${t("calcLineHead")}</small><b class="calcmoves">${d.line}</b></div>`;
    here.actions.innerHTML = "";
    if (candidatesFirst) candidatePhase(d, here); else answerPhase(d, here);
  }

  /** Two taps make one move on the unchanged board; `done(from, to)` gets it. */
  function twoTaps(here: typeof ui & object, d: CalcDrill, done: (from: Square, to: Square) => void, hint: (from: Square | null) => void) {
    let from: Square | null = null;
    const arrows = d.hidden.map(h => [h.from, h.to] as [Square, Square]);
    here.board.interact({
      onTap: s => {
        if (!alive) return;
        if (!from) { from = s; here.board.set(placementFromFen(d.fen), { arrows, highlights: [s] }); hint(s); return; }
        if (s === from) { from = null; here.board.set(placementFromFen(d.fen), { arrows }); hint(null); return; }
        const f = from; from = null; here.board.set(placementFromFen(d.fen), { arrows }); done(f, s);
      },
    });
  }

  function answerPhase(d: CalcDrill, here: NonNullable<typeof ui>) {
    here.say(t("calcAsk"), "info");
    twoTaps(here, d, (from, to) => {
      if (checkAnswer(d, from, to)) {
        streak++; sound.correct();
        store.recordCalc(level, streak);
        here.say(fill(t("calcRight"), { san: d.answerSan }), "ok");
        if (streak === CALC_UNLOCK && level < CALC_LEVELS) here.status(`<p class="testmsg">${t("calcOpened")}</p>`);
        if (streak === CALC_UNLOCK) confetti(root.querySelector(".screen")!, 20);
      } else {
        streak = 0; sound.wrong();
        here.say(fill(t("calcWrong"), { san: d.answerSan }), "no");
      }
      // show where the line really goes: the board after the hidden moves, with the answer drawn
      here.board.interact({});
      here.board.set(placementFromFen(d.afterFen), { arrows: [[d.answer.slice(0, 2), d.answer.slice(2, 4)]] });
      const sc = root.querySelector("[data-streak]"); if (sc) sc.textContent = fill(t("calcStreakN"), { n: num(streak) });
      here.actions.innerHTML = `<button class="btn wide" data-next>${t("next")}</button>`;
      here.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => void next();
    }, from => here.say(from ? fill(t("calcFrom"), { sq: from }) : t("calcAsk"), "info"));
  }

  /** "List your candidates first": 2-3 moves tapped on the unchanged board, then the engine says which are within 50 cp. */
  function candidatePhase(d: CalcDrill, here: NonNullable<typeof ui>) {
    const cands: string[] = [];
    const draw = () => {
      const names = cands.map(c => sanOf(d.afterFen, c.slice(0, 2), c.slice(2, 4)));
      here.status(cands.length ? `<p>${fill(t("calcCandN"), { list: names.join(", ") })}</p>` : "");
      here.actions.innerHTML = `<button class="btn wide" data-check ${cands.length >= 2 ? "" : "disabled"}>${t("calcCandCheck")}</button>
        <button class="btn ghost wide" data-clear ${cands.length ? "" : "disabled"}>${t("calcCandReset")}</button>`;
      here.actions.querySelector<HTMLButtonElement>("[data-clear]")!.onclick = () => { cands.length = 0; draw(); };
      here.actions.querySelector<HTMLButtonElement>("[data-check]")!.onclick = () => void check();
    };
    async function check() {
      here.board.interact({});
      here.actions.innerHTML = ""; here.say(t("calcCandWait"), "info");
      let msg = "";
      try {
        const engine = await getEngine().candidates(d.afterFen, { n: 6, depth: 12 });
        if (!alive) return;
        msg = rateCandidates(engine, cands).map(r => `<li>${icon(r.good ? "ok" : "no", "tone")} ${fill(t(r.good ? "calcCandGood" : "calcCandBad"), { m: sanOf(d.afterFen, r.uci.slice(0, 2), r.uci.slice(2, 4)) })}</li>`).join("");
      } catch { if (!alive) return; msg = `<li>${t("calcCandNoEngine")}</li>`; }
      here.status(`<ul class="candlist">${msg}</ul>`);
      here.board.set(placementFromFen(d.fen), { arrows: d.hidden.map(h => [h.from, h.to] as [Square, Square]) });
      answerPhase(d, here);
      here.say(t("calcCandNow"), "info");
    }
    here.say(t("calcCandHelp"), "info");
    draw();
    twoTaps(here, d, (from, to) => {
      if (!legalAfter(d, from, to)) { here.board.shake(to); here.say(t("calcCandIllegal"), "no"); return; }
      const u = from + to;
      if (!cands.includes(u) && cands.length < 3) cands.push(u);
      draw();
    }, from => from && here.say(fill(t("calcFrom"), { sq: from }), "info"));
  }

  intro();
  return teardown;
}

// ---------- board vision ----------
export function playVision(root: HTMLElement, go: Go, kind: VisionKind): () => void {
  const kinds = young() ? YOUNG_KINDS : VISION_KINDS;
  if (!kinds.includes(kind)) { go("#/puzzles/calc"); return () => {}; }
  const timed = !young();
  let alive = true, score = 0, asked = 0, left = ROUND_SECONDS, timer = 0, board: Board | null = null;
  let task!: VisionTask, st = freshState(), last: Square | undefined, deltas: number[] = [], over = false;
  const teardown = () => { alive = false; clearInterval(timer); board?.destroy(); board = null; };
  const head = () => `<span class="pill rushhead">${timed ? `<span data-clock>${num(left)}</span>` : `<span>${num(asked)}/${num(YOUNG_TASKS)}</span>`}<b data-score>${num(score)}</b></span>`;

  function intro() {
    root.innerHTML = `<div class="screen">${bar(label(kind))}
      <div class="hero"><div class="trophy light">${icon(timed ? "timer" : "grid")}</div><h1>${label(kind)}</h1>
        <p>${timed ? fill(t("visionRoundAbout"), { n: num(ROUND_SECONDS) }) : fill(t("visionYoungAbout"), { n: num(YOUNG_TASKS) })}</p>
        <p><b>${t("rushBest")}: ${num(store.get().visionBest?.[kind] ?? 0)}</b></p></div>
      <div class="actions"><button class="btn wide" data-go>${t("start")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles/calc");
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = begin;
  }

  function begin() {
    root.innerHTML = `<div class="screen">${bar(label(kind), head())}
      <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame" data-frame><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="actions" data-actions></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { teardown(); go("#/puzzles/calc"); };
    board = new Board(root.querySelector("[data-board]")!, { coords: kind !== "name" });
    if (timed) timer = window.setInterval(() => {
      left--; const c = root.querySelector("[data-clock]"); if (c) c.textContent = num(left);
      if (left <= 5) c?.classList.add("low");
      if (left <= 0) finish();
    }, 1000);
    nextTask();
  }

  const say = (s: string) => { const b = root.querySelector("[data-say]"); if (b) b.innerHTML = s; };
  const bump = (delta: number) => {
    deltas.push(delta); score = roundScore(deltas);
    const e = root.querySelector("[data-score]"); if (e) e.textContent = num(score);
    if (delta > 0) sound.correct(); else sound.wrong();
  };

  function nextTask() {
    if (!alive || over) return;
    if (!timed && asked >= YOUNG_TASKS) return finish();
    asked++; st = freshState(); task = makeTask(kind, Math.random, last); last = task.sq;
    if (!timed) { const c = root.querySelector(".rushhead > span"); if (c) c.textContent = `${num(asked)}/${num(YOUNG_TASKS)}`; }
    const frame = root.querySelector<HTMLElement>("[data-frame]")!, actions = root.querySelector<HTMLElement>("[data-actions]")!;
    frame.hidden = task.kind === "colour";
    actions.innerHTML = "";
    if (task.kind === "colour") {
      say(fill(t("visionColour"), { sq: task.sq }));
      actions.innerHTML = `<button class="btn wide" data-a="light">${t("visionLight")}</button><button class="btn ghost wide" data-a="dark">${t("visionDark")}</button>`;
      actions.querySelectorAll<HTMLButtonElement>("[data-a]").forEach(b => b.onclick = () => settle(answerTask(task, b.dataset.a!)));
      return;
    }
    if (task.kind === "name") {
      say(t("visionName"));
      board!.interact({});
      board!.set({}, { goal: task.sq });
      let f = "", r = "";
      const files = [..."abcdefgh"], ranks = [..."12345678"];
      const draw = () => {
        actions.innerHTML = `<div class="namepad">${files.map(x => `<button class="btn ${x === f ? "" : "ghost"}" data-f="${x}">${x}</button>`).join("")}</div>
          <div class="namepad">${ranks.map(x => `<button class="btn ${x === r ? "" : "ghost"}" data-r="${x}">${x}</button>`).join("")}</div>`;
        actions.querySelectorAll<HTMLButtonElement>("[data-f]").forEach(b => b.onclick = () => pick(b.dataset.f!, r));
        actions.querySelectorAll<HTMLButtonElement>("[data-r]").forEach(b => b.onclick = () => pick(f, b.dataset.r!));
      };
      const pick = (nf: string, nr: string) => {
        f = nf; r = nr; const s = squareOf(f, r);
        if (s) return settle(answerTask(task, s));
        draw();
      };
      draw();
      return;
    }
    const piece = `w${KIND_KEY[task.kind]!.slice(2)}` as PieceCode;
    say(fill(t(task.kind === "queen" ? "visionAttackQ" : "visionAttack"), { piece: t(KIND_KEY[task.kind]!) }));
    const redraw = (flash?: Square) => board!.set({ [task.sq]: piece }, { highlights: st.found, goal: task.sq, ...(flash ? { flash: { sq: flash, ok: false } } : {}) });
    redraw();
    board!.interact({
      onTap: s => {
        if (over || st.done || s === task.sq) return;
        const res = tapSquare(task, st, s);
        if (res.delta === 0) return;
        st = res.state; bump(res.delta);
        if (res.delta < 0) { redraw(s); board!.shake(s); } else redraw();
        if (st.done) setTimeout(nextTask, 350);
      },
    });
  }

  function settle(res: { state: typeof st; delta: number }) {
    if (over || st.done) return;
    st = res.state; bump(res.delta);
    say(res.delta > 0 ? t("correct") : `${task.sq}${task.kind === "colour" ? `: ${t(task.answer === "light" ? "visionLight" : "visionDark")}` : ""}`);
    setTimeout(nextTask, 450);
  }

  function finish() {
    if (over || !alive) return; over = true;
    const best = store.get().visionBest?.[kind] ?? 0, record = score > best;
    store.recordVision(kind, score);
    teardown(); alive = true;
    root.innerHTML = `<div class="screen ${record ? "donescreen" : ""}"><div class="complete">
      <div class="trophy ${record ? "" : "light"}">${icon(record ? "trophy" : "timer")}</div>
      <h1>${num(score)}</h1><p>${t(timed ? "visionTimeUp" : "visionDone")}</p>
      <p class="${record ? "testmsg" : ""}">${record ? t("rushRecord") : `${t("rushBest")}: ${num(Math.max(best, score))}`}</p></div>
      <div class="actions" style="flex-direction:column">
        <button class="btn wide ${record ? "gold" : ""}" data-again>${t("playAgain")}</button>
        <button class="btn ghost wide" data-hub>${t("calcTitle")}</button></div></div>`;
    if (record) confetti(root.querySelector(".screen")!);
    root.querySelector<HTMLButtonElement>("[data-again]")!.onclick = () => go(`#/puzzles/calc/v-${kind}?${Date.now()}`);
    root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/puzzles/calc");
  }

  intro();
  return teardown;
}
