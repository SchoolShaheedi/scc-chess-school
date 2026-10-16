// Solo Chess screens (DECISIONS #115). The Young look gets option B: a path of ten puzzles with stars and a coach,
// and no capture limit. Everyone else gets option A: chess.com's rules (each piece captures at most twice, shown as
// a number on it) with a 4 / 6 / 8-piece choice and a fresh puzzle each time.
import { Board } from "../chess/board";
import type { Placement } from "../chess/types";
import { confetti } from "../celebrate";
import { coachHTML } from "../coach";
import { num, t } from "../i18n";
import { icon } from "../icons";
import { store } from "../store";
import { anyMove, capture, capturesFrom, makePuzzle, PATH, rng, type Solo, solved, starsFor } from "./rules";

type Go = (h: string) => void;
const SIZES = [4, 6, 8] as const;
const SIZE_KEY = "scc-solo-size";
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
/** The Young path's puzzles are fixed (seeded by their number), so the stars always belong to the same puzzle. */
const pathPuzzle = (i: number) => makePuzzle(PATH[i], rng(9001 + i));

export function soloScreen(root: HTMLElement, go: Go): () => void {
  const young = store.get().look === "young";
  let board: Board | null = null;
  const teardown = () => { board?.destroy(); board = null; };
  if (young) path(); else {
    let size = 6; try { size = +(localStorage.getItem(SIZE_KEY) ?? 6) || 6; } catch { /* blocked */ }
    play(makePuzzle(size, rng(Date.now() % 1e9)), false, size);
  }
  return teardown;

  /** Option B: ten puzzles; each opens when the one before it is solved. */
  function path() {
    teardown();
    const stars = store.get().soloPath ?? [];
    root.innerHTML = `<div class="screen solo">${bar(t("soloTitle"))}
      <div class="coach"><div class="av">${coachHTML("young", "happy")}</div><div class="bubble">${t("soloYoung")}</div></div>
      <div class="solopath">${PATH.map((_, i) => {
        const open = i === 0 || (stars[i - 1] ?? 0) > 0, got = stars[i] ?? 0;
        return `<button class="sp ${got ? "done" : open ? "open" : ""}" data-i="${i}" ${open ? "" : "disabled"} aria-label="${t("soloPuzzleN").replace("{n}", num(i + 1))}">
          <b>${open ? num(i + 1) : icon("lock")}</b><small>${"★".repeat(got)}${"☆".repeat(got ? 3 - got : 0)}</small></button>`;
      }).join("")}</div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/puzzles");
    root.querySelectorAll<HTMLButtonElement>("[data-i]").forEach(b => b.onclick = () => play(pathPuzzle(+b.dataset.i!), true, 0, +b.dataset.i!));
  }

  function play(start: Solo, isPath: boolean, size: number, index = 0) {
    teardown();
    const limit = !young;
    let st = start, done = false, retries = 0, picked: string | null = null;
    const hist: Solo[] = [];
    root.innerHTML = `<div class="screen solo">${bar(isPath ? t("soloPuzzleN").replace("{n}", num(index + 1)) : t("soloTitle"))}
      ${young ? `<div class="coach"><div class="av">${coachHTML("young", "happy")}</div><div class="bubble" data-say aria-live="polite"></div></div>`
        : `<p class="sub" data-say aria-live="polite"></p>`}
      <div class="frame"><div class="boardwrap" data-board></div></div>
      ${isPath ? "" : `<div class="seg" role="group" data-size>${SIZES.map((n, i) => `<button data-v="${n}" aria-pressed="${n === size}">${t((["soloEasy", "soloMedium", "soloHard"] as const)[i])} · ${t("soloPieces").replace("{n}", num(n))}</button>`).join("")}</div>`}
      <div class="row2"><button class="btn ghost" data-undo>${icon("again")} ${t("takeback")}</button><button class="btn ghost" data-restart>${t("soloRestart")}</button></div>
      <div class="actions" data-after></div></div>`;
    const say = (h: string) => { root.querySelector("[data-say]")!.innerHTML = h; };
    const rules = () => say(young ? t("soloYoung") : t("soloRules"));
    board = new Board(root.querySelector("[data-board]")!, {});
    const draw = (anim?: [string, string]) => {
      const pos: Placement = Object.fromEntries(Object.entries(st).map(([s, p]) => [s, `w${p.kind}`])) as Placement;
      board!.set(pos, limit ? { decor: Object.fromEntries(Object.entries(st).map(([s, p]) => [s, `<em class="sbdg ${p.left ? "" : "zero"}">${num(p.left)}</em>`])) } : {}, anim);
    };
    const reason = (s: string): string | null => {
      if (!st[s]) return null;
      if (limit && st[s].left <= 0) return t("soloTired");
      return capturesFrom(st, s, limit).length ? null : t("soloNothing");
    };
    board.interact({
      // every target holds a piece: with one picked up, a tap on its target is a capture, not a new pick
      canPick: s => (done || (picked && capturesFrom(st, picked, limit).includes(s)) ? "" : reason(s) ?? true),
      onSelect: s => { picked = s; },
      targets: s => capturesFrom(st, s, limit),
      onTap: s => { const r = !done && reason(s); if (r) say(r); },
      onMove: (from, to) => {
        if (done) return;
        if (!capturesFrom(st, from, limit).includes(to)) { board!.shake(to); say(t("soloMustCapture")); return; }
        hist.push(st); st = capture(st, from, to); draw([from, to]);
        if (solved(st)) return win();
        if (!anyMove(st, limit)) say(`<b class="warn">${t("soloStuck")}</b>`); else rules();
      },
    });
    function win() {
      done = true;
      const stars = starsFor(retries);
      store.recordSolo(isPath ? index : undefined, stars);
      say(`<b>${t("soloSolved")}</b>${isPath ? ` <span class="stars">${"★".repeat(stars)}</span>` : ""}`);
      confetti(root.querySelector(".screen")!);
      const after = root.querySelector<HTMLElement>("[data-after]")!;
      after.innerHTML = `<button class="btn wide gold" data-next>${isPath ? t("soloNext") : t("soloNew")} ${icon("arrowRight")}</button>`;
      after.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => {
        if (!isPath) return play(makePuzzle(size, rng(Date.now() % 1e9)), false, size);
        if (index + 1 < PATH.length) play(pathPuzzle(index + 1), true, 0, index + 1); else path();
      };
    }
    root.querySelector<HTMLButtonElement>("[data-undo]")!.onclick = () => { if (done || !hist.length) return; st = hist.pop()!; retries++; draw(); rules(); };
    root.querySelector<HTMLButtonElement>("[data-restart]")!.onclick = () => { if (done) return; if (hist.length) retries++; st = start; hist.length = 0; draw(); rules(); };
    root.querySelectorAll<HTMLButtonElement>("[data-size] button").forEach(b => b.onclick = () => {
      const n = +b.dataset.v!; try { localStorage.setItem(SIZE_KEY, String(n)); } catch { /* blocked */ }
      play(makePuzzle(n, rng(Date.now() % 1e9)), false, n);
    });
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => (isPath ? path() : go("#/puzzles"));
    draw(); rules();
  }
}
