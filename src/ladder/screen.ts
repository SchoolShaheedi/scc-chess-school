// The Endgame ladder screens (2026-10-30): the list of rungs, and one rung (2-3 slides, then the position against Stockfish).
// The playing itself is the existing "engineVs" runner with its help ladder and "Watch me do it" (src/lesson/exercises.ts).
import { Board } from "../chess/board";
import { placementFromFen } from "../chess/types";
import { confetti } from "../celebrate";
import { coachHTML, type Mood } from "../coach";
import { RUNGS, rungIndex, type Rung } from "../content/ladder";
import { icon } from "../icons";
import { num, t, tx } from "../i18n";
import { runExercise } from "../lesson/exercises";
import { finalStars, forLook } from "../lesson/help";
import { sound } from "../sound";
import { store, unlockAll } from "../store";
import { tabbar } from "../tabbar";

type Go = (h: string) => void;

/** A rung is open once the one before it is finished (the first is always open). */
export function rungOpen(id: string): boolean {
  const i = rungIndex(id);
  return i <= 0 || unlockAll() || !!store.get().ladder?.[RUNGS[i - 1].id];
}
export const rungsDone = () => RUNGS.filter(r => store.get().ladder?.[r.id]).length;

const ring = (pct: number, color: string, ic: string) => `<span class="ring" style="--p:${pct}%;--c:${color}"><span>${ic}</span></span>`;

export function ladderScreen(root: HTMLElement, go: Go) {
  const s = store.get(), lad = s.ladder ?? {};
  const rows = RUNGS.map((r, i) => {
    const open = rungOpen(r.id), done = lad[r.id], cur = open && !done;
    const r0 = done ? ring(100, "var(--kesri)", icon("check")) : cur ? ring(35, "var(--gold)", icon("play")) : ring(0, "var(--line)", icon("lock"));
    return `<button class="li ${done ? "done" : cur ? "current" : "locked"}" data-rung="${r.id}" ${open ? "" : `aria-disabled="true" title="${t("egLocked")}"`}>${r0}
      <span class="grow"><b>${num(i + 1)} · ${tx(r.title)}</b><small>${r.claim === "win" ? t("egWin") : t("egHold")} · ${tx(r.goal)}</small></span>
      ${done ? `<span class="stars" aria-label="${done} / 3">${[1, 2, 3].map(n => icon("star", n <= done ? "on" : "")).join("")}</span>` : ""}</button>`;
  }).join("");
  root.innerHTML = `<div class="screen tabbed">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("egTitle")}</h1><small>${num(rungsDone())} / ${num(RUNGS.length)}</small></div>
    <p class="note">${t("egAbout")}</p>
    <div class="lslist">${rows}</div></div>${tabbar("puzzles")}`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
  root.querySelectorAll<HTMLButtonElement>("[data-rung]").forEach(b => b.onclick = () => {
    if (!rungOpen(b.dataset.rung!)) return void b.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], 250);
    go(`#/ladder/${b.dataset.rung}`);
  });
}

type Phase = { k: "learn"; i: number } | { k: "play" } | { k: "done"; stars: 1 | 2 | 3; gained: number };

export function playRung(root: HTMLElement, rung: Rung, go: Go): () => void {
  let phase: Phase = { k: "learn", i: 0 };
  let board: Board | null = null, cleanup: (() => void) | null = null;
  const no = rungIndex(rung.id) + 1, next = RUNGS[no];
  const head = (step: string) => `<div class="lessonbar"><button class="iconbtn" data-close aria-label="${t("close")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${num(no)} · ${tx(rung.title)}</h1><small>${step}</small></div>
    <div class="lessonhead"><p>${tx(rung.goal)}</p></div>`;
  function teardown() { cleanup?.(); cleanup = null; board?.destroy(); board = null; }

  function render() {
    teardown();
    const look = store.get().look;
    if (phase.k === "learn") {
      const at = phase.i, s = rung.learn[at], last = at === rung.learn.length - 1;
      root.innerHTML = `<div class="screen">${head(t("stepLearn"))}
        <p class="slidetext">${tx(s.text)}</p>
        <div class="frame"><div class="boardwrap" data-board></div></div>
        <div class="progressdots">${rung.learn.map((_, i) => `<i class="${i < at ? "done" : i === at ? "on" : ""}"></i>`).join("")}</div>
        <div class="actions">${at > 0 ? `<button class="btn ghost" data-prev>${t("back")}</button>` : ""}
          <button class="btn" data-next>${last ? `${t("egPlay")} ${icon("arrowRight")}` : t("next")}</button></div></div>`;
      const d = s.board ?? {};
      board = new Board(root.querySelector("[data-board]")!, { coords: d.coords ?? false, flip: d.flip });
      board.set(d.fen ? placementFromFen(d.fen) : d.pieces ?? {}, { arrows: d.arrows, highlights: d.highlights, dots: d.dots, crosses: d.crosses, stars: d.stars });
      root.querySelector<HTMLButtonElement>("[data-prev]")?.addEventListener("click", () => { phase = { k: "learn", i: at - 1 }; render(); });
      root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { phase = last ? { k: "play" } : { k: "learn", i: at + 1 }; render(); };
    } else if (phase.k === "play") {
      const ex = forLook(rung.ex, look);
      root.innerHTML = `<div class="screen">${head(rung.claim === "win" ? t("egWin") : t("egHold"))}
        <div class="coach"><div class="av" data-av>${coachHTML(look)}</div><div class="bubble" data-say aria-live="polite"></div></div>
        <div class="frame"><div class="boardwrap" data-board></div></div>
        <div class="status" data-status></div>
        <div class="extra" data-extra></div>
        <div class="actions">
          <button class="btn ghost" data-hint>${icon("hint")} ${t("hint")}</button>
          <button class="btn ghost" data-watch hidden>${icon("play")} ${t("watchMe")}</button>
          <button class="btn" data-continue disabled>${t("continue")}</button>
        </div></div>`;
      const bubble = root.querySelector<HTMLElement>("[data-say]")!, av = root.querySelector<HTMLElement>("[data-av]")!;
      const btn = root.querySelector<HTMLButtonElement>("[data-continue]")!, watchBtn = root.querySelector<HTMLButtonElement>("[data-watch]")!;
      board = new Board(root.querySelector("[data-board]")!, { coords: true });
      const say = (text: string, tone: "ok" | "no" | "info" = "info") => {
        bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
        if (tone === "ok") sound.correct(); else if (tone === "no") sound.wrong();
        const mood: Mood = tone === "ok" ? "happy" : tone === "no" ? "oops" : "neutral";
        if (look !== "adult") av.innerHTML = coachHTML(look, mood);
      };
      root.querySelector<HTMLButtonElement>("[data-hint]")!.onclick = () => { say(tx(rung.ex.hint!)); if (look !== "adult") av.innerHTML = coachHTML(look, "think"); };
      let finished = 0;
      cleanup = runExercise(ex, {
        board, extra: root.querySelector("[data-extra]")!, say,
        status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
        done: mistakes => {
          // stars: 3 for a first-time win, 2 for one or two failed tries, 1 for more; a rung is never lost, retries are free
          finished = mistakes; watchBtn.hidden = true; btn.disabled = false; btn.focus();
        },
        // "No dead ends": after 2 failed attempts "Watch me do it" (the engine plays the learner's side)
        offerWatch: run => {
          watchBtn.hidden = false;
          watchBtn.onclick = async () => { watchBtn.disabled = true; try { await run(); } finally { watchBtn.disabled = false; } };
        },
      });
      btn.onclick = () => {
        const stars = finalStars(finished, false);
        phase = { k: "done", stars, gained: store.completeRung(rung.id, stars) }; render();
      };
    } else {
      const { stars, gained } = phase;
      sound.complete();
      root.innerHTML = `<div class="screen donescreen"><div class="complete">
        <div class="trophy">${icon("trophy")}</div>
        <h1>${t("egRungDone")}</h1>
        <p>${num(no)} · ${tx(rung.title)}</p>
        <p class="gain">+<span>${num(gained)}</span> ${t("xp")}</p>
        <div class="bigstars" aria-label="${stars} / 3">${[1, 2, 3].map(n => icon("star", n <= stars ? "on" : "")).join("")}</div>
        ${look !== "adult" ? `<div class="av doneav">${coachHTML(look, "cheer")}</div>` : ""}
      </div>
      <div class="actions" style="flex-direction:column">
        ${next ? `<button class="btn wide gold" data-nextrung>${t("egNext")} ${icon("arrowRight")}</button>` : ""}
        <button class="btn ghost wide" data-ladder>${t("egBackTo")}</button>
      </div></div>`;
      if (stars === 3) confetti(root.querySelector(".screen")!);
      root.querySelector<HTMLButtonElement>("[data-nextrung]")?.addEventListener("click", () => go(`#/ladder/${next.id}`));
      root.querySelector<HTMLButtonElement>("[data-ladder]")!.onclick = () => go("#/ladder");
    }
    root.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", () => go("#/ladder"));
    window.scrollTo({ top: 0 });
  }
  render();
  return teardown;
}
