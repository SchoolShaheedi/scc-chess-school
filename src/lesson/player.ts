// Plays one lesson: Learn (slides) → Try (one guided exercise) → Practise (several) → Challenge → done.
// Stars come from mistakes in Practise and Challenge only; Learn and Try are for free.
import { Chess } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen } from "../chess/types";
import { confetti } from "../celebrate";
import { coachHTML, type Mood } from "../coach";
import { expand, LEVELS } from "../content/levels";
import { MINI_RACE, miniBot } from "../bots/bots";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { learnId, promptId, speak, stopVoice, uiId, voiceOn } from "../voice";
import { idOf, puzzleById } from "../puzzles/index";
import { devHost, store } from "../store";
import { account, syncConfigured } from "../sync";
import { sound } from "../sound";
import { runExercise } from "./exercises";
import type { Exercise, Lesson } from "./types";

type Phase = { k: "learn"; i: number } | { k: "try" } | { k: "practise"; i: number } | { k: "challenge" } | { k: "done"; stars: 1 | 2 | 3; gained: number };

export function starsFor(mistakes: number): 1 | 2 | 3 { return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1; }

/** The position after the arrow's move, if that move is legal from `fen` (either side to move); else null. */
function playable(fen: string, [from, to]: [string, string]): string | null {
  for (const side of ["w", "b"]) {
    try {
      const parts = fen.split(" "); parts[1] = side; if (parts.length < 4) parts.push("-", "-", "0", "1");
      const g = new Chess(parts.join(" "));
      const m = g.move({ from, to, promotion: "q" });
      if (m.captured === "k") continue;          // an arrow onto a king shows a check or mate, never a move
      return g.fen();
    } catch { /* not legal this way round */ }
  }
  return null;
}

/** Count a number up from 0 (skipped when the learner asked for less motion). */
function countUp(el: HTMLElement, to: number) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = num(to); return; }
  const t0 = performance.now(), ms = 700;
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = num(Math.round(to * (1 - (1 - k) ** 3)));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  setTimeout(() => { if (el.isConnected) el.textContent = num(to); }, ms + 150);   // rAF never fires in a hidden tab
}

export function nextLessonId(id: string): string | undefined {
  const all = LEVELS.flatMap(l => l.lessons);
  return all[all.findIndex(l => l.id === id) + 1]?.id;
}

export function playLesson(root: HTMLElement, lesson: Lesson, go: (hash: string) => void): () => void {
  // which original practise item each expanded exercise came from (a pack becomes several puzzles), for its voice clip
  const practiseSrc: number[] = lesson.practise.flatMap((ex, i) => expand([ex]).map(() => i));
  const practise: Exercise[] = lesson.practise.flatMap(ex => expand([ex]));
  const challenge: Exercise[] = expand([lesson.challenge]);
  const tryEx: Exercise = expand([lesson.try])[0];   // a Try may itself be a single puzzle from a pack
  let phase: Phase = { k: "learn", i: 0 };
  let scored = 0, board: Board | null = null, cleanup: (() => void) | null = null, ci = 0;

  const stepIndex = () => ({ learn: 0, try: 1, practise: 2, challenge: 3, done: 4 })[phase.k];
  const STEPS = ["stepLearn", "stepTry", "stepPractise", "stepChallenge"] as const;
  // DECISIONS #67: a compact bar (back, title, step name) over a four-part progress line
  const head = () => `
    <div class="lessonbar"><button class="iconbtn" data-close aria-label="${t("close")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${num(lesson.id)} · ${tx(lesson.title)}</h1><small>${t(STEPS[Math.min(stepIndex(), 3)])}</small></div>
    <div class="segbar" role="progressbar" aria-label="${t("lesson")}" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${stepIndex()}">
      ${STEPS.map((_, i) => `<i class="${i < stepIndex() ? "done" : i === stepIndex() ? "on" : ""}"></i>`).join("")}</div>
    <div class="lessonhead">
      ${lesson.status === "draft" && devHost() ? `<span class="draft">${t("draft")}</span>` : ""}<p>${tx(lesson.goal)}</p>
    </div>`;

  let demoTimer = 0;
  function teardown() { clearTimeout(demoTimer); stopVoice(); cleanup?.(); cleanup = null; board?.destroy(); board = null; }

  function render() {
    teardown();
    const look = store.get().look;
    if (phase.k === "learn") {
      const at = phase.i, s = lesson.learn[at], last = at === lesson.learn.length - 1;
      root.innerHTML = `<div class="screen">${head()}
        <p class="slidetext">${tx(s.text)}<button class="speak" data-speak aria-label="${t("listen")}">${icon("sound")}</button></p>
        <div class="frame"><div class="boardwrap" data-board></div></div>
        <div class="progressdots">${lesson.learn.map((_, i) => `<i class="${i < at ? "done" : i === at ? "on" : ""}"></i>`).join("")}</div>
        <div class="actions">
          ${phase.i > 0 ? `<button class="btn ghost" data-prev>${t("back")}</button>` : ""}
          <button class="btn ghost" data-replay hidden>${icon("again")} ${t("watchAgain")}</button>
          <button class="btn" data-next>${last ? `${t("stepTry")} ${icon("arrowRight")}` : t("next")}</button>
        </div></div>`;
      // the coach voice: the button replays, and with the voice on the slide is read aloud as it opens
      const vid = learnId(lesson.id, at), sp = root.querySelector<HTMLButtonElement>("[data-speak]")!;
      sp.hidden = true;
      if (voiceOn()) void speak(vid).then(ok => { sp.hidden = !ok; });
      sp.onclick = () => void speak(vid);
      const d = s.board ?? {};
      board = new Board(root.querySelector("[data-board]")!, { coords: d.coords ?? false, flip: d.flip });
      const marks = { arrows: d.arrows, highlights: d.highlights, dots: d.dots, crosses: d.crosses, stars: d.stars };
      board.set(d.fen ? placementFromFen(d.fen) : d.pieces ?? {}, marks);
      // DECISIONS #76: a slide marked `play` shows its arrow's move playing itself on the board (again on "Watch again").
      const demo = d.play && d.fen && d.arrows?.length ? playable(d.fen, d.arrows[0]) : null;
      if (demo) {
        const replay = root.querySelector<HTMLButtonElement>("[data-replay]")!;
        const show = () => {
          board!.set(placementFromFen(d.fen!), marks);
          demoTimer = window.setTimeout(() => board?.set(placementFromFen(demo), { highlights: d.highlights, lastMove: d.arrows![0] }, d.arrows![0]), 700);
        };
        replay.hidden = false; replay.onclick = () => { clearTimeout(demoTimer); show(); };
        show();
      }
      root.querySelector<HTMLButtonElement>("[data-prev]")?.addEventListener("click", () => { phase = { k: "learn", i: at - 1 }; render(); });
      root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { phase = last ? { k: "try" } : { k: "learn", i: at + 1 }; render(); };
    } else if (phase.k === "done") {
      const { stars, gained } = phase, next = nextLessonId(lesson.id);
      sound.complete();
      const st = store.get();
      // DECISIONS #94: every third lesson finished, a quick game (a short capture race) before going on
      const mini = Object.keys(st.lessons).length % 3 === 0 ? miniBot(st.rating.r, st.stats.botWins) : null;
      // DECISIONS #67: dark walnut, a gold trophy, the XP counting up
      root.innerHTML = `<div class="screen donescreen"><div class="complete">
        <div class="trophy">${icon("trophy")}</div>
        <h1>${t("lessonDone")}</h1>
        <p>${num(lesson.id)} · ${tx(lesson.title)}</p>
        <p class="gain">+<span data-count>${num(0)}</span> ${t("xp")}</p>
        <div class="bigstars" aria-label="${stars} / 3">${[1, 2, 3].map(n => icon("star", n <= stars ? "on" : "")).join("")}</div>
        <div class="donestats"><div><small>${t("xp")}</small><b>${num(st.xp)}</b></div><div><small>${t("statStreak")}</small><b>${icon("flame")} ${num(st.streak.days)}</b></div></div>
        ${look !== "adult" ? `<div class="av doneav">${coachHTML(look, "cheer")}</div>` : ""}
      </div>
      <div class="actions" style="flex-direction:column">
        ${mini ? `<button class="minigame" data-mini>${icon("swords")}<span class="grow"><b>${t("miniTitle")}</b>
          <small>${t("raceShort").replace("{n}", num(MINI_RACE)).replace("{bot}", tx(mini.name))}</small></span>${icon("arrowRight")}</button>` : ""}
        ${next ? `<button class="btn wide gold" data-nextlesson>${t("nextLesson")} ${icon("arrowRight")}</button>` : ""}
        <button class="btn ghost wide" data-home>${t("backHome")}</button>
        ${syncConfigured && !account.signedIn() ? `<a class="nudge" href="#/settings">${icon("lock")} ${t("saveNudge")}</a>` : ""}
      </div></div>`;
      countUp(root.querySelector<HTMLElement>("[data-count]")!, gained);
      if (stars === 3) confetti(root.querySelector(".screen")!);
      root.querySelector<HTMLButtonElement>("[data-nextlesson]")?.addEventListener("click", () => go(`#/lesson/${next}`));
      root.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => go("#/");
      root.querySelector<HTMLButtonElement>("[data-mini]")?.addEventListener("click", () => go(`#/play/${mini!.id}/race`));
    } else {
      const ex = phase.k === "try" ? tryEx : phase.k === "practise" ? practise[phase.i] : challenge[ci];
      const list = phase.k === "practise" ? practise : phase.k === "challenge" ? challenge : null;
      const at = phase.k === "practise" ? phase.i : ci;
      root.innerHTML = `<div class="screen">${head()}
        <div class="coach"><div class="av" data-av>${coachHTML(look)}</div><div class="bubble" data-say aria-live="polite"></div></div>
        <div class="frame"><div class="boardwrap" data-board></div></div>
        <div class="status" data-status></div>
        <div class="extra" data-extra></div>
        ${list && list.length > 1 ? `<div class="progressdots">${list.map((_, i) => `<i class="${i < at ? "done" : i === at ? "on" : ""}"></i>`).join("")}</div>` : ""}
        <div class="actions">
          ${ex.hint ? `<button class="btn ghost" data-hint>${icon("hint")} ${t("hint")}</button>` : ""}
          <button class="btn" data-continue disabled>${t("continue")}</button>
        </div></div>`;
      const bubble = root.querySelector<HTMLElement>("[data-say]")!, av = root.querySelector<HTMLElement>("[data-av]")!;
      const btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
      const coords = ex.kind === "coord" ? ex.coords ?? true : true;
      board = new Board(root.querySelector("[data-board]")!, { coords });
      const say = (text: string, tone: "ok" | "no" | "info" = "info") => {
        bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
        if (tone === "ok") sound.correct(); else if (tone === "no") sound.wrong();
        if (voiceOn() && tone !== "info") void speak(uiId(tone === "ok" ? "correct" : "notQuite"));
        const mood: Mood = tone === "ok" ? "happy" : tone === "no" ? "oops" : "neutral";
        if (look !== "adult") av.innerHTML = coachHTML(look, mood);
      };
      root.querySelector<HTMLButtonElement>("[data-hint]")?.addEventListener("click", () => { say(tx(ex.hint!)); if (look !== "adult") av.innerHTML = coachHTML(look, "think"); });
      if (voiceOn()) void speak(phase.k === "try" ? promptId(lesson.id, "try") : phase.k === "practise" ? promptId(lesson.id, "practise", practiseSrc[phase.i]) : promptId(lesson.id, "challenge"));
      cleanup = runExercise(ex, {
        board, extra: root.querySelector("[data-extra]")!, say,
        status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
        done: mistakes => {
          if (phase.k === "practise" || phase.k === "challenge") scored += mistakes;
          if (ex.kind === "puzzle") { const id = idOf(ex); store.recordPuzzle(id, id ? puzzleById(id)?.rating : undefined, mistakes === 0, id ? puzzleById(id)?.themes : undefined); }
          btn.disabled = false; btn.focus();
        },
      });
      btn.onclick = () => {
        if (phase.k === "try") phase = practise.length ? { k: "practise", i: 0 } : { k: "challenge" };
        else if (phase.k === "practise") phase = phase.i + 1 < practise.length ? { k: "practise", i: phase.i + 1 } : { k: "challenge" };
        else if (phase.k === "challenge" && ci + 1 < challenge.length) ci++;
        else {
          const stars = starsFor(scored);
          phase = { k: "done", stars, gained: store.completeLesson(lesson.id, stars) };
        }
        render();
      };
    }
    root.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", () => go("#/"));
    window.scrollTo({ top: 0 });
  }

  render();
  return teardown;
}
