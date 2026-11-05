// "Learn all the checkmates" (DECISIONS #137): the list (#/mates), one mate (#/mates/<id>) and its steps
// (#/mates/<id>/see | watch | help | practise), and the review (#/mates/review). Built from the openings course's parts:
// the grouped list with a mini-board on each row, the five steps as rows, the green box and glowing piece on the board,
// the existing puzzle runner for practice, and the openings' review boxes.
import { Chess } from "chess.js";
import { Board } from "../chess/board";
import { pieceHTML } from "../chess/pieces";
import { type Square, placementFromFen } from "../chess/types";
import { MATE_GROUPS, MATES, mateById, type Mate } from "../content/mates";
import { num, t, tx, type UIKey } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal, runExercise } from "../lesson/exercises";
import type { PuzzleExercise } from "../lesson/types";
import { isDue } from "../openings/srs";
import { puzzleScreen } from "../puzzles/screens";
import { sound } from "../sound";
import { store, today } from "../store";
import { mateFacts } from "./facts";
import { learnerOf, plies } from "./line";
import { draw } from "./practice";
import * as P from "./progress";
import { whyMarks, whyText } from "./why";

type Go = (h: string) => void;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const young = () => store.get().look === "young";
const fill = (s: string, vars: Record<string, string>) => Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, v), s);
const inKey = (n: number) => `matesIn${n}` as UIKey;

const bar = (title: string, back: string) =>
  `<div class="lessonbar"><button class="iconbtn" data-back data-to="${back}" aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const wireBack = (root: HTMLElement, go: Go) => root.querySelectorAll<HTMLButtonElement>("[data-back]").forEach(b => b.onclick = () => go(b.dataset.to!));

/** The side the learner plays, so their pieces are at the bottom. */
const sideOf = (m: Mate) => learnerOf(m.line.fen, m.line.moves);

/** A small picture of a mate: the final position, the mated king marked, the learner's side at the bottom. */
function mini(m: Mate): string {
  const b = placementFromFen(m.final), king = mateFacts(m.final)!.king, flip = sideOf(m) === "b";
  let out = "";
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rank = flip ? r + 1 : 8 - r, file = flip ? 7 - f : f, s = "abcdefgh"[file] + rank, p = b[s];
    out += `<div class="${(file + rank) % 2 ? "l" : "d"}${s === king ? " k" : ""}">${p ? pieceHTML(p) : ""}</div>`;
  }
  return `<span class="thumb mini" aria-hidden="true">${out}</span>`;
}

/** The marks that say why it is mate: the piece giving check, the pieces guarding, the squares the king cannot use, its own pieces in the way. */
function whyBoard(board: Board, fen: string) {
  const f = mateFacts(fen)!, mk = whyMarks(f);
  board.set(placementFromFen(fen), { check: mk.king, best: mk.checkers, good: mk.guards, crosses: mk.covered, highlights: mk.blocked });
}

// ---------- the list ----------
export function matesHub(root: HTMLElement, go: Go) {
  const n = P.learntCount(), total = MATES.length, due = P.dueCount(), cards = P.myCards().length;
  const row = (m: Mate) => {
    const learnt = P.learnt(m.id), have = P.stagesOf(m.id);
    const bars = [1, 2, 3].map(k => `<i class="${!have.includes(k) ? "none" : P.stageDone(m.id, k) ? "on" : ""}" title="${t(inKey(k))}"></i>`).join("");
    return `<button class="botcard mrow ${learnt ? "learnt" : ""}" data-m="${m.id}">${mini(m)}
      <span class="grow"><b>${tx(m.name)}${learnt ? ` <span class="mtick" aria-label="${t("matesLearntTick")}">${icon("check")}</span>` : ""}</b><small>${tx(m.about)}</small>
        <span class="mbars" role="img" aria-label="${t("matesBarsLabel")}">${bars}</span></span>${icon("arrowRight", "go")}</button>`;
  };
  root.innerHTML = `<div class="screen mateshub">${bar(t("matesTitle"), "#/")}
    <p class="muted">${t(young() ? "matesAboutYoung" : "matesAbout")}</p>
    <div class="mhead"><b>${fill(t("matesLearnt"), { n: num(n), m: num(total) })}</b>
      <div class="ubar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i style="width:${Math.round((n / total) * 100)}%"></i></div></div>
    ${cards ? `<button class="botcard" data-review><span class="grow"><b>${t("matesReviewTitle")}</b><small>${due ? fill(t("matesDueN"), { n: num(due) }) : t("matesReviewNone")}</small></span>${icon("arrowRight", "go")}</button>` : ""}
    ${MATE_GROUPS.map(g => `<h2 class="sec">${tx(g.title)}</h2><div class="botlist">${MATES.filter(m => m.group === g.group).map(row).join("")}</div>`).join("")}
  </div>`;
  wireBack(root, go);
  root.querySelectorAll<HTMLButtonElement>("[data-m]").forEach(b => b.onclick = () => go(`#/mates/${b.dataset.m}`));
  root.querySelector<HTMLButtonElement>("[data-review]")?.addEventListener("click", () => go("#/mates/review"));
}

// ---------- one mate ----------
export function matesPage(root: HTMLElement, id: string, go: Go): () => void {
  const m = mateById(id);
  if (!m) { go("#/mates"); return () => {}; }
  const have = P.stagesOf(id), sizes = [1, 2, 3].map(k => (have.includes(k) ? num(P.stageSize(id, k)) : "–")).join(" + ");
  const done = (s: P.MateStep) => P.stepDone(id, s);
  const first = (["see", "watch", "help", "practise"] as const).find(s => !done(s));
  const sub = (s: string) => ({ see: t("matesSeeSub"), watch: fill(t("matesWatchSub"), { n: num(plies(m).filter(p => p.mine).length) }), help: t("matesHelpSub"), practise: have.length ? fill(t("matesPractiseSub"), { n: sizes }) : t("matesPractiseNone") } as Record<string, string>)[s];
  const step = (s: "see" | "watch" | "help" | "practise", n: number, title: string) => {
    const link = s === "practise" && !have.length && m.link;
    const dead = s === "practise" && !have.length && !m.link;
    const label = link ? (m.link!.kind === "ladder" ? t("matesLinkLadder") : fill(t("matesLinkLesson"), { l: num(m.link!.to) })) : sub(s);
    return `<button class="li ${done(s) ? "done" : s === first ? "current" : ""}" ${dead ? 'aria-disabled="true"' : `data-step="${s}"`}><span class="ring"><span>${done(s) ? icon("check") : num(n)}</span></span>
      <span class="grow"><b>${title}</b><small>${label}</small></span>${link ? icon("arrowRight") : dead ? "" : icon("play")}</button>`;
  };
  root.innerHTML = `<div class="screen matespage">${bar(tx(m.name), "#/mates")}
    <p class="muted">${tx(m.about)}${m.also ? ` <small>${fill(t("matesAlsoCalled"), { n: tx(m.also) })}</small>` : ""}</p>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    <div class="whybox"><b>${t("matesWhy")}</b> ${tx(whyText(m.final, young()))}</div>
    <div class="lslist">
      ${step("see", 1, t("matesSee"))}${step("watch", 2, t("matesWatch"))}${step("help", 3, t("matesHelp"))}${step("practise", 4, t("matesPractise"))}
      <button class="li ${done("review") ? "done" : ""}" data-review><span class="ring"><span>${done("review") ? icon("check") : num(5)}</span></span>
        <span class="grow"><b>${t("matesReview")}</b><small>${done("review") ? t("matesReviewIn") : t("matesReviewSub")}</small></span>${icon("arrowRight")}</button>
    </div></div>`;
  wireBack(root, go);
  const board = new Board(root.querySelector("[data-board]")!, {});
  board.setFlip(sideOf(m) === "b");
  whyBoard(board, m.final);
  root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach(b => b.onclick = () => {
    const s = b.dataset.step!;
    if (s === "practise" && !have.length && m.link) return go(m.link.kind === "ladder" ? `#/ladder/${m.link.to}` : `#/lesson/${m.link.to}`);
    go(`#/mates/${id}/${s}`);
  });
  root.querySelector<HTMLButtonElement>("[data-review]")!.onclick = () => go("#/mates/review");
  return () => { board.setFlip(false); board.destroy(); };
}

// ---------- a step ----------
export function runMate(root: HTMLElement, id: string, step: string, go: Go): () => void {
  const m = mateById(id);
  if (!m) { go("#/mates"); return () => {}; }
  if (step === "see") return seeStep(root, m, go);
  if (step === "watch") return watchStep(root, m, go);
  if (step === "help") return helpStep(root, m, go);
  if (step === "practise" && P.stagesOf(id).length) return practiseStep(root, m, go);
  go(`#/mates/${id}`);
  return () => {};
}

/** The frame shared by See it, Watch the build-up and Do it with help. */
function frame(root: HTMLElement, m: Mate, go: Go, key = false) {
  root.innerHTML = `<div class="screen matespage">${bar(tx(m.name), `#/mates/${m.id}`)}
    <p class="status" data-status></p>
    <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    ${key ? `<ul class="boxkey"><li><i class="best"></i>${t("matesKeyCheck")}</li><li><i class="good"></i>${t("matesKeyGuard")}</li>
      <li><i class="cross">×</i>${t("matesKeyNo")}</li><li><i class="own"></i>${t("matesKeyOwn")}</li></ul>` : ""}
    <div class="actions" data-actions style="flex-direction:column;align-items:stretch"></div></div>`;
  wireBack(root, go);
  const board = new Board(root.querySelector("[data-board]")!, {});
  board.setFlip(sideOf(m) === "b");
  const bubble = root.querySelector<HTMLElement>("[data-say]")!, status = root.querySelector<HTMLElement>("[data-status]")!;
  const say = (html: string, tone: "ok" | "no" | "info" = "info") => { bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + html; bubble.className = `bubble ${tone === "info" ? "" : tone}`; };
  const actions = root.querySelector<HTMLElement>("[data-actions]")!;
  return { board, say, status: (html: string) => { status.innerHTML = html; }, actions, destroy: () => { board.setFlip(false); board.destroy(); } };
}

const credit = (m: Mate) => {
  const s = m.line.source;
  return s.kind === "bank" ? fill(t("matesSourceBank"), { id: s.id }) : s.kind === "game" ? fill(t("matesSourceGame"), { game: tx(s.name) }) : t("matesSourceMade");
};
const nextTo = (m: Mate, step: string) => `#/mates/${m.id}/${step}`;

// Step 1: the final picture and why it is mate
function seeStep(root: HTMLElement, m: Mate, go: Go): () => void {
  const ui = frame(root, m, go, true);
  whyBoard(ui.board, m.final);
  ui.say(tx(whyText(m.final, young())));
  ui.actions.innerHTML = `<button class="btn" data-next>${t("courseNextStep")}</button>`;
  ui.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { P.markDone(m.id, "see"); go(nextTo(m, "watch")); };
  return ui.destroy;
}

// Step 2: watch the build-up, with a note on each move; play, pause, step back and forward
function watchStep(root: HTMLElement, m: Mate, go: Go): () => void {
  const ui = frame(root, m, go);
  const ps = plies(m), N = ps.length, mineN = ps.filter(p => p.mine).length;
  ui.actions.innerHTML = `<div class="mctl"><button class="iconbtn" data-back1 aria-label="${t("matesStepBack")}">${icon("chevronLeft")}</button>
    <button class="btn" data-play></button><button class="iconbtn" data-fwd aria-label="${t("matesStepFwd")}">${icon("chevronRight")}</button></div>
    <button class="btn" data-next hidden>${t("courseNextStep")}</button><p class="note" data-credit>${credit(m)}</p>`;
  const q = (s: string) => ui.actions.querySelector<HTMLButtonElement>(s)!;
  let i = 0, timer = 0, alive = true;
  const stop = () => { if (timer) clearInterval(timer); timer = 0; q("[data-play]").innerHTML = `${icon("play")} ${i >= N ? t("matesAgain") : t("matesPlay")}`; };
  function show(anim: boolean) {
    const fen = i ? ps[i - 1].after : m.line.fen, last: [Square, Square] | undefined = i ? [ps[i - 1].from as Square, ps[i - 1].to as Square] : undefined;
    if (i === N) whyBoard(ui.board, fen); else ui.board.set(placementFromFen(fen), { lastMove: last, check: checkSquare(new Chess(fen)) }, anim ? last : undefined);
    if (anim && i) sound[new Chess(ps[i - 1].before).get(ps[i - 1].to as never) ? "capture" : "move"]();
    ui.status(i ? fill(t("matesMoveN"), { n: num(Math.ceil(i / 2)), m: num(Math.ceil(N / 2)) }) : `<b>${fill(t("matesWatchSub"), { n: num(mineN) })}</b>`);
    const p = i ? ps[i - 1] : null;
    ui.say(!p ? t("matesStart") : p.mine ? tx(p.note!) + (i === N ? `<br>${t("matesWatched")}` : "") : fill(t("matesTheyPlay"), { m: `<b>${p.san}</b>` }), i === N ? "ok" : "info");
    q("[data-back1]").disabled = i === 0; q("[data-fwd]").disabled = i === N;
    if (i === N) { P.markDone(m.id, "watch"); stop(); }
    q("[data-next]").hidden = !(i === N || P.stepDone(m.id, "watch"));
  }
  const play = () => {
    if (i >= N) { i = 0; show(false); }
    q("[data-play]").innerHTML = `${t("matesPause")}`;
    timer = window.setInterval(() => { if (!alive) return; if (i < N) { i++; show(true); } if (i >= N) stop(); }, 1500);
  };
  q("[data-play]").onclick = () => { if (timer) stop(); else play(); };
  q("[data-back1]").onclick = () => { stop(); if (i > 0) { i--; show(false); } };
  q("[data-fwd]").onclick = () => { stop(); if (i < N) { i++; show(true); } };
  q("[data-next]").onclick = () => go(nextTo(m, "help"));
  show(false);
  setTimeout(() => { if (alive && !timer && i === 0) { i = 1; show(true); play(); } }, 900);
  return () => { alive = false; if (timer) clearInterval(timer); ui.destroy(); };
}

// ---------- playing the line: shared by "Do it with help" and the review fallback ----------
interface Env { board: Board; say(html: string, tone?: "ok" | "no" | "info"): void; status(html: string): void }

/** The learner plays their side of the build-up; the app plays the other side. Guided: the green box and the glowing piece
 *  show the move, and a slip explains it. Any move that gives checkmate counts on the last move, as in the puzzles. */
function runLine(env: Env, m: Mate, guided: boolean, done: (mistakes: number) => void): () => void {
  const ps = plies(m), N = ps.length, me = sideOf(m), game = new Chess(m.line.fen);
  let i = 0, mistakes = 0, busy = true, alive = true, last: [Square, Square] | undefined, carry = "";
  const draw = (anim = false) => {
    const mine = i < N && !busy;
    const marks = mine && guided ? { best: [ps[i].to as Square], glow: [ps[i].from as Square] } : {};
    env.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game), ...marks }, anim ? last : undefined);
  };
  const progress = () => env.status(fill(t("matesMoveN"), { n: num(Math.min(Math.ceil((i + 1) / 2), Math.ceil(N / 2))), m: num(Math.ceil(N / 2)) }));
  const step = () => { const p = ps[i]; const mv = game.move({ from: p.from, to: p.to, promotion: p.uci[4] }); last = [p.from as Square, p.to as Square]; i++; sound[mv.captured ? "capture" : "move"](); draw(true); progress(); return p; };
  async function theirs() {
    busy = true;
    while (i < N && !ps[i].mine) { await wait(650); if (!alive) return; const p = step(); carry += (carry ? " " : "") + fill(t("matesTheyPlay"), { m: `<b>${p.san}</b>` }); }
    if (i >= N) return finish();
    busy = false; draw(); env.say(`${carry ? carry + "<br>" : ""}<b>${t("matesYourMove")}</b>`);
  }
  function finish() {
    busy = true;
    whyBoard(env.board, game.fen());
    if (mistakes === 0) sound.correct();
    env.say(`${carry ? carry + "<br>" : ""}${t("matesHelpDone")}`, "ok");
    done(mistakes);
  }
  env.board.setFlip(me === "b");
  env.board.interact({
    canPick: s => { if (busy) return t("notQuite"); const p = game.get(s as never); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as never, verbose: true }).map(x => x.to as Square),
    onTap: () => {},
    onMove: (from, to) => {
      if (busy) return;
      const legal = game.moves({ square: from as never, verbose: true }).filter(x => x.to === to);
      if (!legal.length) { env.board.shake(to); env.say(refusal(game.fen(), from, to), "no"); return; }
      const want = ps[i], lastMine = i === N - 1;
      const gives = (() => { const g = new Chess(game.fen()); g.move({ from, to, promotion: legal[0].promotion ?? "q" }); return g.isCheckmate(); })();
      if ((from === want.from && to === want.to) || (lastMine && gives)) {
        const note = want.note ? tx(want.note) : "";
        if (from === want.from && to === want.to) step(); else { game.move({ from, to, promotion: legal[0].promotion ?? "q" }); last = [from, to]; i++; sound.move(); draw(true); progress(); }
        carry = note;
        if (i < N) env.say(`${icon("ok", "tone")}${note}`, "ok");
        void theirs();
        return;
      }
      mistakes++; env.board.shake(to); sound.wrong();
      env.say(`${t("courseWrongBox")}${guided && want.note ? `<br>${tx(want.note)}` : ""}`, "no");
      if (!guided) { /* a review gives no box, but a slip shows the move after the second miss */ if (mistakes >= 2) { busy = false; env.board.mark({ best: [want.to as Square], glow: [want.from as Square] }); } }
    },
  });
  draw(); progress();
  void theirs();
  return () => { alive = false; };
}

// Step 3: do it with help
function helpStep(root: HTMLElement, m: Mate, go: Go): () => void {
  const ui = frame(root, m, go);
  const stop = runLine(ui, m, true, mistakes => {
    P.markDone(m.id, "help"); P.joinReview(m.id);
    void mistakes;
    ui.actions.innerHTML = `<button class="btn" data-next>${t(P.stagesOf(m.id).length || m.link ? "courseNextStep" : "continue")}</button>`;
    ui.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => go(P.stagesOf(m.id).length ? nextTo(m, "practise") : `#/mates/${m.id}`);
  });
  return () => { stop(); ui.destroy(); };
}

// Step 4: practise, mate in 1 (three), 2 (three), 3 (two): real positions of the pattern from the bank
function practiseStep(root: HTMLElement, m: Mate, go: Go): () => void {
  const stages = P.stagesOf(m.id);
  const todo = stages.filter(n => !P.stageDone(m.id, n));
  const run = todo.length ? todo : stages;   // everything cleared: practise it all again
  let si = 0, pi = 0, queue: Awaited<ReturnType<typeof draw>> = [], alive = true, cleanup: (() => void) | null = null, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null; };
  const back = `#/mates/${m.id}`;

  async function startStage() {
    teardown();
    const n = run[si];
    root.innerHTML = `<div class="screen">${bar(tx(m.name), back)}<p class="note" style="text-align:center">…</p></div>`; wireBack(root, go);
    try { queue = await draw(m.id, n, P.stageSize(m.id, n)); } catch {
      if (!alive) return;
      root.innerHTML = `<div class="screen">${bar(tx(m.name), back)}<div class="complete"><p>${t("matesLoadFail")}</p><button class="btn" data-retry>${t("retry")}</button></div></div>`;
      wireBack(root, go); root.querySelector<HTMLButtonElement>("[data-retry]")!.onclick = () => void startStage(); return;
    }
    if (!alive) return;
    pi = 0; next();
  }
  function next() {
    teardown();
    const n = run[si];
    if (pi >= queue.length) return stageEnd(n);
    const p = queue[pi];
    ui = puzzleScreen(root, `${tx(m.name)}`, "");
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    const head = `${t(inKey(n))} · ${fill(t("matesPosOf"), { i: num(pi + 1), m: num(queue.length) })}`;
    const ex: PuzzleExercise = { kind: "puzzle", fen: p.fen, moves: p.moves, prompt: { en: "Find the checkmate.", pa: "ਸ਼ਹਿ-ਮਾਤ ਲੱਭੋ।" }, source: `lichess.org/training/${p.id}` };
    const u = ui;
    cleanup = runExercise(ex, {
      board: u.board, extra: u.extra, status: html => u.status(`<b>${head}</b> ${html}`),
      say: (text, tone = "info") => { u.say(text, tone); if (tone === "no") sound.wrong(); },
      done: mistakes => {
        if (mistakes === 0) sound.correct();
        u.actions.innerHTML = `<button class="btn wide" data-next>${t("continue")}</button>`;
        u.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { pi++; next(); };
      },
    });
  }
  function stageEnd(n: number) {
    teardown();
    P.markDone(m.id, `p${n}`);
    const last = si >= run.length - 1;
    root.innerHTML = `<div class="screen">${bar(tx(m.name), back)}<div class="complete"><div class="trophy light">${icon("trophy")}</div>
      <h1>${fill(t("matesStageClear"), { n: t(inKey(n)) })}</h1>${last && P.learnt(m.id) ? `<p>${t("matesAllClear")}</p>` : ""}
      ${[1, 2, 3].filter(k => !stages.includes(k)).map(k => `<p class="note">${fill(t("matesStageMissing"), { n: t(inKey(k)) })}</p>`).join("")}</div>
      <div class="actions"><button class="btn wide" data-go>${last ? t("continue") : t("courseNextStep")}</button></div></div>`;
    wireBack(root, go);
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = () => { if (last) { store.recordPractice(); go(back); } else { si++; void startStage(); } };
  }
  void startStage();
  return () => { alive = false; teardown(); };
}

// ---------- the review ----------
export function trainMates(root: HTMLElement, go: Go): () => void {
  const all = P.myCards(), due = all.filter(x => isDue(x.card, today()));
  const practice = !due.length;   // nothing due: practise the ones that come up soonest, without moving their schedule
  const queue = (practice ? [...all].sort((a, b) => a.card.due.localeCompare(b.card.due)) : due.sort((a, b) => a.card.due.localeCompare(b.card.due))).slice(0, 10);
  let i = 0, clean = 0, alive = true, cleanup: (() => void) | null = null, ui: ReturnType<typeof puzzleScreen> | null = null;
  const teardown = () => { cleanup?.(); cleanup = null; ui?.board.destroy(); ui = null; };
  const back = "#/mates";
  if (!queue.length) { go(back); return teardown; }

  async function next() {
    teardown();
    if (i >= queue.length) return finish();
    const { mate: m } = queue[i];
    const stages = P.stagesOf(m.id);
    let pos: Awaited<ReturnType<typeof draw>>[number] | undefined;
    if (stages.length) { try { pos = (await draw(m.id, stages[Math.floor(Math.random() * stages.length)], 1))[0]; } catch { /* offline and the chunk was never opened: replay the line instead */ } }
    if (!alive) return;
    ui = puzzleScreen(root, `${tx(m.name)} · ${num(i + 1)}/${num(queue.length)}`, "");
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    const u = ui;
    const finishOne = (mistakes: number) => {
      const ok = mistakes === 0; if (ok) { clean++; sound.correct(); }
      if (!practice) P.reviewed(m.id, ok);
      u.say(t(ok ? "bankFixed" : "bankAgain"), ok ? "ok" : "no");
      u.actions.innerHTML = `<button class="btn wide" data-next>${t("continue")}</button>`;
      u.actions.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { i++; void next(); };
    };
    if (pos) {
      const ex: PuzzleExercise = { kind: "puzzle", fen: pos.fen, moves: pos.moves, prompt: { en: "Find the checkmate.", pa: "ਸ਼ਹਿ-ਮਾਤ ਲੱਭੋ।" }, source: `lichess.org/training/${pos.id}` };
      cleanup = runExercise(ex, { board: u.board, extra: u.extra, status: u.status, say: (text, tone = "info") => { u.say(text, tone); if (tone === "no") sound.wrong(); }, done: finishOne });
    } else cleanup = runLine({ board: u.board, say: u.say, status: u.status }, m, false, finishOne);
  }
  function finish() {
    store.recordPractice();
    root.innerHTML = `<div class="screen"><div class="complete"><div class="trophy light">${icon("trophy")}</div>
      <h1>${num(clean)} / ${num(queue.length)}</h1><p>${t("openClean")}</p>
      <p class="note">${P.dueCount() ? fill(t("matesDueN"), { n: num(P.dueCount()) }) : t("matesReviewNone")}</p></div>
      <div class="actions"><button class="btn wide" data-hub>${t("matesTitle")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go(back);
  }
  void next();
  return () => { alive = false; teardown(); };
}
