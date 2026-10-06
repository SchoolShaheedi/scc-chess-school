// The placement test (DECISIONS #71): real puzzles climbing one level at a time, from Level 2 to Level 10,
// each drawn from that level's own test packs. A miss gets a second puzzle at the same level; two misses at
// one level, or three in all, end the test. The learner is placed at the last level they passed, and every
// level up to it opens (nothing is ticked off). Offered to Junior and Adult learners at sign-up.
import { Board } from "../chess/board";
import { confetti } from "../celebrate";
import { expand, LEVELS } from "../content/levels";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { sound } from "../sound";
import { store } from "../store";
import { runExercise } from "./exercises";
import type { Exercise } from "./types";
import { advance, FIRST, LAST, MAX_MISSES, startPlacement } from "./placement-rules";

/** A random puzzle from level n's test packs, weighted by how many each pack gives the real test. */
function puzzleFor(n: number): Exercise {
  const packs = LEVELS[n - 1].test!.packs;
  let r = Math.random() * packs.reduce((a, p) => a + p.count, 0);
  const pack = packs.find(p => (r -= p.count) < 0) ?? packs[0];
  return expand([{ kind: "pack", pack: pack.pack, count: 1, prompt: { en: "Find the best move.", pa: "ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" } }])[0];
}

export function playPlacement(root: HTMLElement, go: (h: string) => void): () => void {
  let s = startPlacement(), board: Board | null = null, cleanup: (() => void) | null = null;
  const teardown = () => { cleanup?.(); cleanup = null; board?.destroy(); board = null; };
  const bar = () => `<div class="segbar">${Array.from({ length: LAST - FIRST + 1 }, (_, i) =>
    `<i class="${i + FIRST < s.level ? "done" : i + FIRST === s.level ? "on" : ""}"></i>`).join("")}</div>`;
  const lives = () => `<span class="pill">${Array.from({ length: MAX_MISSES }, (_, i) => icon("star", i < MAX_MISSES - s.misses ? "on" : "")).join("")}</span>`;

  function intro() {
    root.innerHTML = `<div class="screen">
      <div class="lessonbar"><button class="iconbtn" data-close aria-label="${t("close")}">${icon("chevronLeft")}</button><h1 class="grow">${t("placeTitle")}</h1></div>
      <div class="hero"><div class="trophy light">${icon("target")}</div><h1>${t("placeTitle")}</h1><p>${t("placeIntro")}</p></div>
      <div class="actions" style="flex-direction:column"><button class="btn wide" data-go>${t("start")}</button>
        <button class="btn ghost wide" data-skip>${t("placeSkip")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = next;
    root.querySelector<HTMLButtonElement>("[data-skip]")!.onclick = () => go("#/");
    root.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => go("#/");
  }

  function next() {
    teardown();
    if (s.over) return finish();
    const lv = LEVELS[s.level - 1];
    root.innerHTML = `<div class="screen">
      <div class="lessonbar"><button class="iconbtn" data-close aria-label="${t("close")}">${icon("chevronLeft")}</button>
        <h1 class="grow">${t("level")} ${num(lv.n)} · ${tx(lv.title)}</h1>${lives()}</div>${bar()}
      <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="extra" data-extra></div>
      <div class="actions"><button class="btn" data-continue disabled>${t("continue")}</button></div></div>`;
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
    board = new Board(root.querySelector("[data-board]")!, {});
    // the first wrong move is a miss and ends that puzzle: nobody gets stuck on a position they can't solve
    let decided = false;
    const decide = (ok: boolean) => {
      if (decided) return; decided = true;
      if (ok) sound.correct(); else { sound.wrong(); board?.interact({ canPick: () => t("notFirstTry") }); }
      bubble.innerHTML = icon(ok ? "ok" : "no", "tone") + t(ok ? "firstTry" : "placeMiss"); bubble.className = `bubble ${ok ? "ok" : "no"}`;
      s = advance(s, ok);
      btn.disabled = false; btn.focus();
    };
    cleanup = runExercise(puzzleFor(s.level), {
      board, extra: root.querySelector("[data-extra]")!,
      say: (text, tone = "info") => {
        if (decided) return;
        // a legal but wrong move is a miss; an illegal one (a slip of the finger) only gets the reason why
        if (tone === "no" && text === t("puzzleWrong")) return decide(false);
        bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
      },
      status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
      done: mistakes => decide(mistakes === 0),
    });
    btn.onclick = next;
    root.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => go("#/");
  }

  function finish() {
    const n = s.highest, lv = LEVELS[n - 1];
    root.innerHTML = `<div class="screen ${n > 1 ? "donescreen" : ""}"><div class="complete">
      <img class="testbadge" src="art/badges/level-${n}.webp" alt="" onerror="this.remove()">
      <h1>${n > 1 ? t("placeResult").replace("{n}", num(n)) : t("placeFromOne")}</h1>
      <p>${t("level")} ${num(n)} · ${tx(lv.title)} · ${num(lv.band)}</p>
      ${n > 1 ? `<p class="testmsg">${t("placeNote")}</p>` : ""}</div>
      <div class="actions" style="flex-direction:column">
        <button class="btn wide ${n > 1 ? "gold" : ""}" data-place>${t("placeStart").replace("{n}", num(n))}</button>
        ${n > 1 ? `<button class="btn ghost wide" data-one>${t("placeFromOne")}</button>` : ""}</div></div>`;
    if (n > 1) confetti(root.querySelector(".screen")!);
    root.querySelector<HTMLButtonElement>("[data-place]")!.onclick = () => { store.set({ placed: Math.max(store.get().placed, n) }); store.seedRating(n); go("#/"); };
    root.querySelector<HTMLButtonElement>("[data-one]")?.addEventListener("click", () => go("#/"));
  }

  intro();
  return teardown;
}
