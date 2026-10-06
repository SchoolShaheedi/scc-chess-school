// Game Review screen (DECISIONS #73): straight after a bot game, Stockfish grades every move. A summary
// (accuracy for Junior/Adult, a count of great moves for Young), then a move-by-move walk with the better
// move shown on the board. Nothing is stored: the game is reviewed from memory, then forgotten.
import { Chess } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { getEngine } from "../engine/browser";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import type { Text } from "../lesson/types";
import { store } from "../store";
import { accuracy, counts, grade, type Graded, type Label } from "./grade";
import { openInAnalysis } from "../analysis/screen";
import { runExercise } from "../lesson/exercises";

export interface PlayedGame { uci: string[]; me: "w" | "b"; botName: Text; back: string; startFen?: string;
  /** Who "me" is called: "You" against a bot; "White" in a game between two friends. */
  meName?: Text }
let last: PlayedGame | null = null;
/** The bot game that just ended; the result screen's Review button opens it. */
export const setLastGame = (g: PlayedGame) => { last = g; };

const LABELS: Label[] = ["best", "good", "inaccuracy", "mistake", "blunder"];
const lbl = (l: Label) => t(`lbl_${l}` as "lbl_best");

export function reviewGame(root: HTMLElement, go: (h: string) => void): () => void {
  const game = last;
  let alive = true, board: Board | null = null;
  const teardown = () => { alive = false; board?.destroy(); board = null; };
  if (!game) { go("#/"); return teardown; }
  const bar = `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("reviewTitle")}</h1></div>`;

  // replay the game to get every position, SAN and the final state
  const g = game.startFen ? new Chess(game.startFen) : new Chess(), fens = [g.fen()], moves: { san: string; uci: string }[] = [];
  for (const u of game.uci) { const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); moves.push({ san: m.san, uci: u }); fens.push(g.fen()); }
  const finalScore = g.isCheckmate() ? { mate: 0 } : g.isGameOver() ? { cp: 0 } : null;

  root.innerHTML = `<div class="screen">${bar}<div class="hero"><div class="trophy light">${icon("target")}</div>
    <h1>${t("reviewing")}</h1><div class="testbar wide"><i data-prog style="width:0%"></i></div><p data-count></p></div></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(game.back);

  (async () => {
    const engine = await getEngine(), evals: { score: { cp?: number; mate?: number }; best: string }[] = [];
    for (let i = 0; i < fens.length; i++) {
      if (!alive) return;
      if (i === fens.length - 1 && finalScore) evals.push({ score: finalScore, best: "" });
      else { const a = await engine.analyse(fens[i], { depth: 10 }); evals.push({ score: a.score, best: a.best }); }
      const p = root.querySelector<HTMLElement>("[data-prog]"); if (p) p.style.width = `${((i + 1) / fens.length) * 100}%`;
      const c = root.querySelector("[data-count]"); if (c) c.textContent = `${num(i + 1)} / ${num(fens.length)}`;
    }
    // a game from a set-up position may start with Black to move
    if (alive) summary(grade(moves, evals, new Chess(fens[0]).turn()));
  })();

  function summary(r: Graded[]) {
    store.recordPractice("review");
    const young = store.get().look === "young", me = game!.me, them = me === "w" ? "b" : "w";
    const mine = counts(r, me), great = mine.best + mine.good;
    root.innerHTML = `<div class="screen">${bar}
      <div class="revsum">
        ${young ? `<div class="revbig"><b>${num(great)}</b><small>${t("greatMoves")}</small></div>` : `
        <div class="revbig"><b>${num(accuracy(r, me))}%</b><small>${game!.meName ? tx(game!.meName) : t("you")}</small></div>
        <div class="revbig them"><b>${num(accuracy(r, them))}%</b><small>${tx(game!.botName)}</small></div>`}
      </div>
      ${young ? "" : `<p class="note" style="text-align:center">${t("accuracyNote")}</p>`}
      <div class="revcounts">${LABELS.map(l => `<div class="rc ${l}"><span class="dot"></span>${lbl(l)}<b>${num(mine[l])}</b></div>`).join("")}</div>
      <div class="actions" style="flex-direction:column">
        <button class="btn wide" data-walk>${t("reviewWalk")} ${icon("arrowRight")}</button>
        ${r.some(m => m.by === me && m.drop >= 10) ? `<button class="btn ghost wide" data-worst>${t("reviewWorst")}</button>` : ""}
      </div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(game!.back);
    root.querySelector<HTMLButtonElement>("[data-walk]")!.onclick = () => walk(r, 0);
    root.querySelector<HTMLButtonElement>("[data-worst]")?.addEventListener("click", () => {
      let worst = -1;
      r.forEach((m, i) => { if (m.by === me && (worst < 0 || m.drop > r[worst].drop)) worst = i; });
      walk(r, worst);
    });
  }

  function walk(r: Graded[], at: number) {
    board?.destroy();
    root.innerHTML = `<div class="screen">${bar}
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="revnote" data-note aria-live="polite"></div>
      <div class="revmoves" data-moves>${r.map((m, i) => `${i % 2 ? "" : `<i>${num(i / 2 + 1)}.</i>`}<button class="mv ${m.label}" data-i="${i}">${m.san}</button>`).join("")}</div>
      <div class="actions">
        <button class="btn ghost" data-prev aria-label="${t("back")}">${icon("chevronLeft")}</button>
        <button class="btn ghost" data-better hidden>${t("showBetter")}</button>
        <button class="btn" data-next aria-label="${t("next")}">${icon("arrowRight")}</button></div>
      <div class="anatools">
        <button class="btn gold" data-retry hidden>${icon("again")} ${t("retryMoment")}</button>
        <button class="btn ghost" data-ana>${icon("search")} ${t("anaOpen")}</button></div></div>`;
    board = new Board(root.querySelector("[data-board]")!, { flip: game!.me === "b" });
    const retryBtn = root.querySelector<HTMLButtonElement>("[data-retry]")!;
    root.querySelector<HTMLButtonElement>("[data-ana]")!.onclick = () => { openInAnalysis(fens[0], game!.uci, at + 1); go("#/analysis"); };
    // turn your own mistake into a puzzle: find a move within 50 centipawns of Stockfish's best (chess review 2026-10-04)
    retryBtn.onclick = () => retry(r, at);
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(game!.back);
    const better = root.querySelector<HTMLButtonElement>("[data-better]")!;
    const show = (i: number, showBetter = false) => {
      at = Math.max(0, Math.min(r.length - 1, i));
      const m = r[at], weak = m.drop >= 10 && m.best;
      if (showBetter && weak) {
        board!.set(placementFromFen(fens[at]), { arrows: [[m.best.slice(0, 2) as Square, m.best.slice(2, 4) as Square]] });
      } else {
        board!.set(placementFromFen(fens[at + 1]), { lastMove: [m.uci.slice(0, 2) as Square, m.uci.slice(2, 4) as Square] });
      }
      const whose = m.by === game!.me ? (game!.meName ? tx(game!.meName) : t("you")) : tx(game!.botName);
      const bestSan = weak ? new Chess(fens[at]).move({ from: m.best.slice(0, 2), to: m.best.slice(2, 4), promotion: m.best[4] }).san : "";
      root.querySelector("[data-note]")!.innerHTML = `<b class="tag ${m.label}">${lbl(m.label)}</b> ${num(Math.floor(at / 2) + 1)}${m.by === "w" ? "." : "…"} ${m.san} · ${whose}
        <p>${weak ? t("reviewChance").replace("{a}", num(Math.round(m.before))).replace("{b}", num(Math.round(m.after))).replace("{best}", bestSan) : t(m.label === "best" ? "reviewBest" : "reviewGood")}</p>`;
      better.hidden = !weak; better.textContent = showBetter ? t("showPlayed") : t("showBetter");
      retryBtn.hidden = !(weak && m.by === game!.me);
      root.querySelectorAll(".revmoves .mv").forEach(b => b.classList.toggle("on", +(b as HTMLElement).dataset.i! === at));
      root.querySelector(".revmoves .mv.on")?.scrollIntoView({ inline: "center", block: "nearest" });
    };
    let showingBetter = false;
    root.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => { showingBetter = false; show(at - 1); };
    root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { showingBetter = false; show(at + 1); };
    better.onclick = () => { showingBetter = !showingBetter; show(at, showingBetter); };
    root.querySelectorAll<HTMLButtonElement>(".revmoves .mv").forEach(b => b.onclick = () => { showingBetter = false; show(+b.dataset.i!); });
    show(at);
  }

  function retry(r: Graded[], at: number) {
    board?.destroy(); board = null;
    const m = r[at];
    root.innerHTML = `<div class="screen">${bar}
      <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="extra" data-extra></div>
      <div class="actions"><button class="btn" data-done disabled>${t("continue")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => walk(r, at);
    board = new Board(root.querySelector("[data-board]")!, {});
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, done = root.querySelector<HTMLButtonElement>("[data-done]")!;
    const stop = runExercise({ kind: "engineBest", fen: fens[at], tolerance: 50,
      prompt: { en: `In the game you played ${m.san}. Find a better move.`, pa: `ਖੇਡ ਵਿੱਚ ਤੁਸੀਂ ${m.san} ਚੱਲੀ ਸੀ। ਬਿਹਤਰ ਚਾਲ ਲੱਭੋ।` } }, {
      board, extra: root.querySelector("[data-extra]")!,
      say: (text, tone = "info") => { bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`; },
      status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
      done: () => { done.disabled = false; done.focus(); },
    });
    done.onclick = () => { stop(); walk(r, at); };
  }

  return teardown;
}
