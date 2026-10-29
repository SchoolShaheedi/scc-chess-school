// The openings course (DECISIONS #127): every opening in five steps, played along on the board with the "traffic
// light" boxes — green where to go (the piece glows), dashed green also good, red one of yours in danger, a gold star
// where the opening aims. Learn shows the boxes; Practise hides them until a wrong move; the model win and the full
// game are played along with the boxes on. Step 5 is the existing review drill (screens.ts, #74).
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { type Square, placementFromFen } from "../chess/types";
import { COURSE, courseOpening, GROUPS, STEPS, type CourseLine, type CourseOpening, type Step } from "../content/course";
import BOXES from "../content/course-boxes.json";
import { repOption } from "../content/repertoire";
import { count, num, t, tx, type UIKey } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { sound } from "../sound";
import { store, today } from "../store";
import { newCard } from "./srs";
import { FEW_GAMES, statsFor, TAGS } from "./facts";

type Go = (h: string) => void;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const bar = (title: string, back = "#/openings") =>
  `<div class="lessonbar"><button class="iconbtn" data-back data-to="${back}" aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const wireBack = (root: HTMLElement, go: Go) => root.querySelectorAll<HTMLButtonElement>("[data-back]").forEach(b => b.onclick = () => go(b.dataset.to!));

export const doneSteps = (id: string): Step[] => (store.get().rep.course?.[id] ?? []) as Step[];
function markDone(id: string, step: Step) {
  const r = store.get().rep, have = doneSteps(id);
  if (!have.includes(step)) store.set({ rep: { ...r, course: { ...(r.course ?? {}), [id]: [...have, step] } } });
}
const lineOf = (o: CourseOpening, step: Step): CourseLine => step === "win" ? o.win : step === "game" ? o.game : o.main;
const boxKey = (step: Step) => (step === "win" ? "win" : step === "game" ? "game" : "main");

/** Your pieces the other side attacks that are not safe: undefended, or attacked by something worth less. */
export function watchSquares(g: Chess, me: "w" | "b"): Square[] {
  const them = me === "w" ? "b" : "w", out: Square[] = [];
  for (const row of g.board()) for (const p of row) {
    if (!p || p.color !== me) continue;
    const by = g.attackers(p.square, them);
    if (!by.length) continue;
    const cheapest = Math.min(...by.map(s => VALUE[g.get(s)!.type]));
    if (p.type === "k" || cheapest < VALUE[p.type] || !g.attackers(p.square, me).length) out.push(p.square as Square);
  }
  return out;
}

// ---------- the course list ----------
export function courseHub(root: HTMLElement, go: Go) {
  root.innerHTML = `<div class="screen">${bar(t("courseTitle"), "#/")}
    <p class="muted">${t("courseAbout")}</p>
    ${GROUPS.map(({ group, title }) => {
      const list = COURSE.filter(o => o.group === group);
      return list.length ? `<h2 class="sec">${tx(title)}</h2><div class="botlist">${list.map(o => {
        const n = doneSteps(o.id).length, s = statsFor(o.id);
        return `<button class="botcard" data-o="${o.id}">${s ? `<span class="winchip"><b>${num(s.you)}%</b><small>${t("statYouWin")}</small></span>` : ""}
          <span class="grow"><b>${tx(o.name)}</b><small>${tx(o.about)}</small>${tagsHTML(o.id, s?.popular)}
          <small class="rating">${n >= STEPS.length ? icon("check") + " " + t("courseDone") : t("courseSteps").replace("{n}", num(n)).replace("{m}", num(STEPS.length))}</small></span>${icon("arrowRight", "go")}</button>`;
      }).join("")}</div>` : "";
    }).join("")}
    <h2 class="sec">${t("courseReviewTitle")}</h2>
    <button class="botcard" data-review><span class="grow"><b>${t("openTitle")}</b><small>${t("courseReviewAbout")}</small></span>${icon("arrowRight", "go")}</button>
  </div>`;
  wireBack(root, go);
  root.querySelectorAll<HTMLButtonElement>("[data-o]").forEach(b => b.onclick = () => go(`#/openings/o/${b.dataset.o}`));
  root.querySelector<HTMLButtonElement>("[data-review]")!.onclick = () => go("#/openings/review");
}

// ---------- the opening's facts (DECISIONS #130): your win %, its tags, and a card of numbers on its page ----------
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
function tagsHTML(id: string, popular?: number): string {
  const tag = TAGS[id];
  if (!tag) return "";
  return `<span class="otags"><span>${t(`style${cap(tag[0])}` as UIKey)}</span><span>${t(`level${tag[1]}` as UIKey)}</span>`
    + (popular !== undefined ? `<span>${t("statChosen").replace("{n}", num(popular))}</span>` : "") + `</span>`;
}
function factsHTML(o: CourseOpening): string {
  const s = statsFor(o.id);
  if (!s) return "";
  const seg = (cls: string, v: number, label: string) => `<i class="${cls}" style="flex:${Math.max(v, 3)}" title="${label}">${v >= 12 ? `${num(v)}%` : ""}</i>`;
  return `<div class="group facts"><h2 class="sec" style="margin-top:0">${t("factsTitle")}</h2>
    <div class="wdl" role="img" aria-label="${t("factWhite")} ${s.white}%, ${t("factDraw")} ${s.draw}%, ${t("factBlack")} ${s.black}%">
      ${seg("w", s.white, t("factWhite"))}${seg("d", s.draw, t("factDraw"))}${seg("b", s.black, t("factBlack"))}</div>
    <div class="wdlkey"><span><i class="w"></i>${t("factWhite")}</span><span><i class="d"></i>${t("factDraw")}</span><span><i class="b"></i>${t("factBlack")}</span></div>
    <ul>
      <li>${t(o.side === "w" ? "factYouW" : "factYouB").replace("{n}", `<b>${num(s.you)}</b>`)}</li>
      <li>${t("factChosen").replace("{n}", `<b>${num(s.popular)}</b>`).replace("{g}", `<b>${count(s.games)}</b>`)}</li>
      ${s.reply ? `<li>${t("factReply").replace("{m}", `<b>${s.reply.san}</b>`).replace("{n}", num(s.reply.share))}</li>` : ""}
      ${s.road ? `<li>${t("factRoad").replace("{n}", `<b>${num(s.road.share)}</b>`).replace("{m}", `<b>${s.road.move}</b>`)}</li>` : ""}
    </ul>${tagsHTML(o.id)}
    ${s.games < FEW_GAMES ? `<p class="note">${t("factFew")}</p>` : ""}
    <p class="note">${t("factEven")}</p><p class="note">${t("factSource")}</p></div>`;
}

// ---------- one opening: its plan and five steps ----------
export function coursePage(root: HTMLElement, id: string, go: Go) {
  const o = courseOpening(id);
  if (!o) return go("#/openings");
  const done = doneSteps(id);
  const step = (s: Step, n: number, title: string, sub: string) =>
    `<button class="li ${done.includes(s) ? "done" : ""}" data-step="${s}"><span class="ring"><span>${done.includes(s) ? icon("check") : num(n)}</span></span>
      <span class="grow"><b>${title}</b><small>${sub}</small></span>${icon("play")}</button>`;
  root.innerHTML = `<div class="screen">${bar(tx(o.name))}
    <p class="muted">${tx(o.about)}</p>
    <div class="group"><h2 class="sec" style="margin-top:0">${t("coursePlan")}</h2><p>${tx(o.plan)}</p></div>
    ${factsHTML(o)}
    <div class="lslist">
      ${step("learn", 1, t("courseLearn"), t("courseLearnSub"))}
      ${step("practise", 2, t("coursePractise"), t("coursePractiseSub"))}
      ${step("win", 3, t("courseWin"), o.win.title ? tx(o.win.title) : "")}
      ${step("game", 4, t("courseGame"), o.game.title ? tx(o.game.title) : "")}
      ${o.rep ? `<button class="li" data-review><span class="ring"><span>${num(5)}</span></span><span class="grow"><b>${t("courseReview")}</b><small>${t("courseReviewSub")}</small></span>${icon("arrowRight")}</button>` : ""}
    </div></div>`;
  wireBack(root, go);
  root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach(b => b.onclick = () => go(`#/openings/o/${id}/${b.dataset.step}`));
  root.querySelector<HTMLButtonElement>("[data-review]")?.addEventListener("click", () => {
    // step 5 puts this opening in its slot of the review drill, keeping any progress it already has there
    const opt = repOption(o.rep!)!, r = store.get().rep, cards = { ...r.cards };
    opt.lines.forEach((_, i) => { cards[`${opt.id}:${i}`] ??= newCard(today()); });
    store.set({ rep: { ...r, [opt.slot]: opt.id, cards } });
    go("#/openings/review");
  });
}

// ---------- playing a step along on the board ----------
export function runCourse(root: HTMLElement, id: string, step: Step, go: Go): () => void {
  const o = courseOpening(id);
  if (!o || !STEPS.includes(step)) { go("#/openings"); return () => {}; }
  const line = lineOf(o, step), me = o.side, boxesOn = step !== "practise";
  const also = ((BOXES as Record<string, Record<string, Record<string, string[]>>>)[id]?.[boxKey(step)] ?? {}) as Record<string, Square[]>;
  const title = step === "learn" ? t("courseLearn") : step === "practise" ? t("coursePractise") : tx(line.title ?? o.name);
  root.innerHTML = `<div class="screen">${bar(tx(o.name), `#/openings/o/${id}`)}
    <p class="status" data-status></p>
    <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    <ul class="boxkey">${boxesOn || step === "practise" ? `<li><i class="best"></i>${t("keyBest")}</li><li><i class="good"></i>${t("keyGood")}</li>
      <li><i class="watch"></i>${t("keyWatch")}</li><li><i class="aim">★</i>${t("keyAim")}</li>` : ""}</ul>
    <div class="actions"><button class="btn" data-next hidden>${t("continue")}</button></div></div>`;
  wireBack(root, go);
  const board = new Board(root.querySelector("[data-board]")!, {});
  const bubble = root.querySelector<HTMLElement>("[data-say]")!, status = root.querySelector<HTMLElement>("[data-status]")!;
  const next = root.querySelector<HTMLButtonElement>("[data-next]")!;
  const say = (html: string, tone: "ok" | "no" | "info" = "info") => {
    bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + html; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
  };
  const game = new Chess();
  let i = 0, mistakes = 0, busy = true, alive = true, last: [Square, Square] | undefined, shown = boxesOn, theirNote = "";
  const aimAt = (ply: number) => { let a: Square[] = []; for (const [k, v] of Object.entries(line.aim ?? {})) if (+k <= ply) a = v; return a; };
  const want = () => { const m = new Chess(game.fen()).move(line.moves[i]); return [m.from as Square, m.to as Square] as const; };
  const draw = (anim = false) => {
    const mine = i < line.moves.length && game.turn() === me && !busy;
    const marks = mine && shown ? (() => { const [f, to] = want(); return { best: [to], glow: [f], good: also[i] ?? [], watch: watchSquares(game, me) }; })() : {};
    board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game), stars: aimAt(i), ...marks }, anim ? last : undefined);
  };
  const progress = () => { status.innerHTML = `<b>${title}</b> · ${t("courseMove").replace("{n}", num(Math.min(Math.ceil((i + 1) / 2), Math.ceil(line.moves.length / 2)))).replace("{m}", num(Math.ceil(line.moves.length / 2)))}`; };
  const yourTurn = () => {
    const why = line.notes[i] ? tx(line.notes[i]) : "";
    const ask = step === "practise" && !shown ? t("coursePractiseAsk") : why || t("courseAsk");
    say((theirNote ? `${theirNote}<br>` : "") + `<b>${t("courseYourMove")}</b> ${ask}`);
  };
  const play = (anim: boolean) => {
    const m = game.move(line.moves[i]); last = [m.from as Square, m.to as Square]; i++;
    sound[m.captured ? "capture" : "move"](); draw(anim); progress();
  };
  async function theirTurn() {
    busy = true; theirNote = "";
    while (i < line.moves.length && game.turn() !== me) {
      await wait(650); if (!alive) return;
      const note = line.notes[i]; play(true);
      if (note) theirNote = tx(note);
    }
    if (i >= line.moves.length) return finish();
    busy = false; shown = boxesOn; draw(); yourTurn();
  }
  function finish() {
    busy = true; draw();
    const lastNote = line.notes[line.moves.length - 1];
    const clean = mistakes === 0;
    if (clean || step !== "practise") markDone(id, step);
    if (clean) sound.correct();
    say((lastNote ? tx(lastNote) + "<br>" : "") + (step === "practise" && !clean ? t("coursePractiseAgain").replace("{n}", num(mistakes)) : t("courseStepDone")), clean ? "ok" : "info");
    const after = STEPS[STEPS.indexOf(step) + 1];
    next.hidden = false; next.textContent = step === "practise" && !clean ? t("courseTryAgain") : after ? t("courseNextStep") : t("continue");
    next.onclick = () => step === "practise" && !clean ? go(`#/openings/o/${id}/practise?${Date.now()}`) : go(after ? `#/openings/o/${id}/${after}` : `#/openings/o/${id}`);
  }
  board.setFlip(me === "b");
  board.interact({
    canPick: s => { if (busy) return t("notQuite"); const p = game.get(s as CjSquare); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to as Square),
    onTap: () => {},
    onMove: async (from, to) => {
      if (busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { board.shake(to); say(refusal(game.fen(), from, to), "no"); return; }
      const [wf, wt] = want();
      if (wf === from && wt === to) {
        const why = line.notes[i];
        play(true);
        if (step === "practise" && why) say(`${icon("ok", "tone")}${tx(why)}`);
        return theirTurn();
      }
      // a move on an "also good" square is not a slip: it is good, just not this opening's line
      if ((also[i] ?? []).includes(to)) { board.shake(to); if (!shown) { shown = true; draw(); } say(t("courseAlsoGood")); return; }
      mistakes++; board.shake(to); sound.wrong();
      if (!shown) { shown = true; draw(); }
      say(t(boxesOn ? "courseWrongBox" : "courseWrongShow"), "no");
    },
  });
  draw(); progress();
  void theirTurn();
  return () => { alive = false; board.setFlip(false); board.destroy(); };
}
