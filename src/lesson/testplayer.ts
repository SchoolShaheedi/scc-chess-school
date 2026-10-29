// A level test (DECISIONS #53): N real puzzles, a fresh shuffle each attempt. A puzzle counts only if
// it is right first time (no mistakes). Passing opens the next level; the best score is kept.
import { Board } from "../chess/board";
import { confetti } from "../celebrate";
import { coachHTML } from "../coach";
import { allLessons, expand } from "../content/levels";
import { num, t, tx, UI } from "../i18n";
import { sound } from "../sound";
import { icon } from "../icons";
import { idOf, puzzleById } from "../puzzles/index";
import { store } from "../store";
import { runExercise } from "./exercises";
import { forLook, lessonsTeaching, topicKey, topicOf, type Topic } from "./help";
import type { Exercise, Level } from "./types";

const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w)\}/g, (_, k) => num(v[k]));

export function playTest(root: HTMLElement, level: Level, go: (hash: string) => void): () => void {
  const test = level.test!;
  // the prompt names the theme ("Find the back-rank mate", "Remove the defender..."), not just "Find the best move"
  const queue: Exercise[] = expand(test.packs.map(p => ({ kind: "pack" as const, pack: p.pack, count: p.count,
    prompt: UI[topicKey(topicOf(p.pack), "task")] })));
  queue.sort(() => Math.random() - 0.5);
  const total = queue.length;
  let i = -1, right = 0, board: Board | null = null, cleanup: (() => void) | null = null;
  const missed = new Set<Topic>();   // the themes of the puzzles not solved first time, for the list after a failed test
  const look = store.get().look;

  const teardown = () => { cleanup?.(); cleanup = null; board?.destroy(); board = null; };
  const head = () => `<div class="topbar"><button class="iconbtn" data-close aria-label="${t("close")}">${icon("chevronLeft")}</button>
    <div class="grow"><b>${t("levelTest")} · ${t("level")} ${num(level.n)}</b><div class="testbar"><i style="width:${(Math.max(i, 0) / total) * 100}%"></i></div></div>
    <span class="pill">${icon("check")} ${num(right)}</span></div>`;

  function intro() {
    root.innerHTML = `<div class="screen">${head()}
      <div class="hero"><img class="testbadge" src="art/badges/level-${level.n}.webp" alt="" data-hide-on-error>
        <h1>${t("levelTest")}</h1><p>${tx(level.title)} · ${num(level.band)}</p>
        <p>${fill(t("testIntro"), { n: total, p: test.pass })}</p></div>
      <div class="actions"><button class="btn wide" data-go>${t("start")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = next;
    root.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => go("#/");
  }

  function next() {
    teardown(); i++;
    if (i >= total) return finish();
    root.innerHTML = `<div class="screen">${head()}
      <div class="coach"><div class="av">${coachHTML(look)}</div><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="extra" data-extra></div>
      <div class="actions"><button class="btn ghost" data-skip hidden>${icon("arrowRight")} ${t("skipFor")}</button>
        <button class="btn" data-continue disabled>${t("continue")}</button></div></div>`;
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
    const skipBtn = root.querySelector<HTMLButtonElement>("[data-skip]")!;
    board = new Board(root.querySelector("[data-board]")!, {});
    let first = true;
    const here = queue[i];
    cleanup = runExercise(forLook(here, look), {
      board, extra: root.querySelector("[data-extra]")!,
      // no dead ends in a test either: after 3 failures "Skip for now" moves on (it counts as not solved, and the theme is listed)
      offerSkip: () => { if (btn.disabled) skipBtn.hidden = false; },
      say: (text, tone = "info") => {
        bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
        if (tone === "no") { if (first) sound.wrong(); first = false; }   // a test does not keep nagging
      },
      status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
      done: mistakes => {
        const ok = mistakes === 0; if (ok) { right++; sound.correct(); } else if (here.kind === "puzzle") missed.add(topicOf(here.pack));
        const id = idOf(here); store.recordPuzzle(id, id ? puzzleById(id)?.rating : undefined, ok, id ? puzzleById(id)?.themes : undefined);
        bubble.innerHTML = icon(ok ? "ok" : "no", "tone") + t(ok ? "firstTry" : "notFirstTry"); bubble.className = `bubble ${ok ? "ok" : "no"}`;
        root.querySelector(".pill")!.innerHTML = `${icon("check")} ${num(right)}`;
        skipBtn.hidden = true;
        btn.disabled = false; btn.focus();
      },
    });
    btn.onclick = next;
    skipBtn.onclick = () => { if (here.kind === "puzzle") missed.add(topicOf(here.pack)); next(); };
    root.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => go("#/");
  }

  function finish() {
    const passed = right >= test.pass;
    store.recordTest(level.n, right, passed);
    if (passed) sound.complete();
    // a pass gets the dark walnut celebration screen and confetti (DECISIONS #67); a miss stays calm and light
    root.innerHTML = `<div class="screen ${passed ? "donescreen" : ""}"><div class="complete">
      ${passed ? `<div class="trophy">${icon("trophy")}</div>` : look !== "adult" ? `<div style="width:110px;height:110px">${coachHTML(look, "think")}</div>` : ""}
      <h1>${num(right)} / ${num(total)}</h1>
      <p class="${passed ? "testmsg" : "gain"}">${passed ? t("testPassed") : fill(t("testFailed"), { p: test.pass })}</p>
      ${passed && level.n < 10 ? `<img class="testbadge" src="art/badges/level-${level.n + 1}.webp" alt="" data-hide-on-error>` : ""}
      ${!passed && missed.size ? `<div class="missed"><h2>${t("testMissed")}</h2>${[...missed].map(m => {
        const links = lessonsTeaching(m, allLessons(), level.n);
        return `<div class="missedrow"><b>${t(topicKey(m, "name"))}</b>${links.map(id => `<button class="btn ghost" data-lesson="${id}">${num(id)}</button>`).join("")}</div>`;
      }).join("")}</div>` : ""}</div>
      <div class="actions" style="flex-direction:column">
        ${passed ? "" : `<button class="btn wide" data-again>${t("retry")}</button>`}
        <button class="btn ${passed ? "gold" : "ghost"} wide" data-home>${t("backHome")}</button></div></div>`;
    if (passed) confetti(root.querySelector(".screen")!);
    root.querySelector<HTMLButtonElement>("[data-again]")?.addEventListener("click", () => { teardown(); go(`#/test/${level.n}?${Date.now()}`); });
    root.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => go("#/");
    root.querySelectorAll<HTMLButtonElement>("[data-lesson]").forEach(b => b.onclick = () => { teardown(); go(`#/lesson/${b.dataset.lesson}`); });
  }

  intro();
  return teardown;
}
