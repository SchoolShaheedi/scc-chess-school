// A level test (DECISIONS #53): N real puzzles, a fresh shuffle each attempt. A puzzle counts only if
// it is right first time (no mistakes). Passing opens the next level; the best score is kept.
import { Board } from "../chess/board";
import { confetti } from "../celebrate";
import { coachHTML } from "../coach";
import { expand } from "../content/levels";
import { num, t, tx } from "../i18n";
import { sound } from "../sound";
import { icon } from "../icons";
import { idOf, puzzleById } from "../puzzles/index";
import { store } from "../store";
import { runExercise } from "./exercises";
import type { Exercise, Level } from "./types";

const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w)\}/g, (_, k) => num(v[k]));

export function playTest(root: HTMLElement, level: Level, go: (hash: string) => void): () => void {
  const test = level.test!;
  const queue: Exercise[] = expand(test.packs.map(p => ({ kind: "pack" as const, pack: p.pack, count: p.count,
    prompt: { en: "Find the best move.", pa: "ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" } })));
  queue.sort(() => Math.random() - 0.5);
  const total = queue.length;
  let i = -1, right = 0, board: Board | null = null, cleanup: (() => void) | null = null;
  const look = store.get().look;

  const teardown = () => { cleanup?.(); cleanup = null; board?.destroy(); board = null; };
  const head = () => `<div class="topbar"><button class="iconbtn" data-close aria-label="${t("close")}">${icon("chevronLeft")}</button>
    <div class="grow"><b>${t("levelTest")} · ${t("level")} ${num(level.n)}</b><div class="testbar"><i style="width:${(Math.max(i, 0) / total) * 100}%"></i></div></div>
    <span class="pill">${icon("check")} ${num(right)}</span></div>`;

  function intro() {
    root.innerHTML = `<div class="screen">${head()}
      <div class="hero"><img class="testbadge" src="art/badges/level-${level.n}.webp" alt="" onerror="this.remove()">
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
      <div class="actions"><button class="btn" data-continue disabled>${t("continue")}</button></div></div>`;
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
    board = new Board(root.querySelector("[data-board]")!, {});
    let first = true;
    cleanup = runExercise(queue[i], {
      board, extra: root.querySelector("[data-extra]")!,
      say: (text, tone = "info") => {
        bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
        if (tone === "no") { if (first) sound.wrong(); first = false; }   // a test does not keep nagging
      },
      status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
      done: mistakes => {
        const ok = mistakes === 0; if (ok) { right++; sound.correct(); }
        const id = idOf(queue[i]); store.recordPuzzle(id, id ? puzzleById(id)?.rating : undefined, ok, id ? puzzleById(id)?.themes : undefined);
        bubble.innerHTML = icon(ok ? "ok" : "no", "tone") + t(ok ? "firstTry" : "notFirstTry"); bubble.className = `bubble ${ok ? "ok" : "no"}`;
        root.querySelector(".pill")!.innerHTML = `${icon("check")} ${num(right)}`;
        btn.disabled = false; btn.focus();
      },
    });
    btn.onclick = next;
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
      ${passed && level.n < 10 ? `<img class="testbadge" src="art/badges/level-${level.n + 1}.webp" alt="" onerror="this.remove()">` : ""}</div>
      <div class="actions" style="flex-direction:column">
        ${passed ? "" : `<button class="btn wide" data-again>${t("retry")}</button>`}
        <button class="btn ${passed ? "gold" : "ghost"} wide" data-home>${t("backHome")}</button></div></div>`;
    if (passed) confetti(root.querySelector(".screen")!);
    root.querySelector<HTMLButtonElement>("[data-again]")?.addEventListener("click", () => { teardown(); go(`#/test/${level.n}?${Date.now()}`); });
    root.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => go("#/");
  }

  intro();
  return teardown;
}
