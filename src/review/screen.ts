// Game Review screen (DECISIONS #73; option A of #104): straight after a game, Stockfish grades every move.
// The summary leads with the coach's report in words (the opening, the turning point, the best moment, one thing
// to practise), then accuracy and the Game Rating, the evaluation graph with dots at the key moments, and up to
// three key-moment cards. Then a move-by-move walk, with the coach's one-line reason on each key move.
// Nothing is stored: the game is reviewed from memory, then forgotten.
import { Chess } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { getEngine } from "../engine/browser";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import type { Text } from "../lesson/types";
import { store } from "../store";
import { coachHTML } from "../coach";
import { UI, type UIKey } from "../i18n";
import { accuracy, grade, whiteWin } from "./grade";
import { coachReport, gameRating, keyMoments, type Label2, reasonText, refine, type Reviewed } from "./insights";
import type { Score } from "../engine/uci";
import { openInAnalysis } from "../analysis/screen";
import { runExercise } from "../lesson/exercises";

export interface PlayedGame { uci: string[]; me: "w" | "b"; botName: Text; back: string; startFen?: string;
  /** The opponent's rating, when it is a bot: it steadies the Game Rating estimate. */
  oppRating?: number;
  /** Who "me" is called: "You" against a bot; "White" in a game between two friends. */
  meName?: Text }
let last: PlayedGame | null = null;
/** The bot game that just ended; the result screen's Review button opens it. */
export const setLastGame = (g: PlayedGame) => { last = g; };

const LABELS: Label2[] = ["brilliant", "great", "best", "book", "good", "inaccuracy", "mistake", "miss", "blunder"];
const lbl = (l: Label2) => t(`lbl_${l}` as "lbl_best");
const words = (k: string): Text => UI[k as UIKey];
const pieceWord = (p: string): Text => UI[`pc${p.toUpperCase()}` as UIKey];

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
    // the two best moves of every position: the second one tells a "Great" (only) move from an ordinary best one
    const engine = await getEngine(), evals: { score: Score; best: string; second?: Score }[] = [];
    for (let i = 0; i < fens.length; i++) {
      if (!alive) return;
      if (i === fens.length - 1 && finalScore) evals.push({ score: finalScore, best: "" });
      else {
        const c = await engine.candidates(fens[i], { n: 2, depth: 10 });
        evals.push(c.length ? { score: c[0].score, best: c[0].move, second: c[1]?.score } : { score: { cp: 0 }, best: "" });
      }
      const p = root.querySelector<HTMLElement>("[data-prog]"); if (p) p.style.width = `${((i + 1) / fens.length) * 100}%`;
      const c = root.querySelector("[data-count]"); if (c) c.textContent = `${num(i + 1)} / ${num(fens.length)}`;
    }
    // a game from a set-up position may start with Black to move
    if (!alive) return;
    const graded = grade(moves, evals, new Chess(fens[0]).turn());
    const white = evals.map((e, i) => whiteWin(e.score, new Chess(fens[i]).turn() === "w"));
    summary(refine(graded, fens, evals.map(e => e.second), moves.map(m => m.san)), white);
  })();

  function summary(r: Reviewed[], white: number[]) {
    store.recordPractice("review");
    const look = store.get().look, young = look === "young", me = game!.me, them = me === "w" ? "b" : "w";
    const mine = r.filter(m => m.by === me), count = (l: Label2) => mine.filter(m => m.label === l).length;
    const great = mine.filter(m => ["brilliant", "great", "best", "book", "good"].includes(m.label)).length;
    const accMe = accuracy(r, me), accThem = accuracy(r, them);
    const rating = gameRating(accMe, game!.oppRating, game!.oppRating !== undefined ? accThem : undefined);
    const moments = keyMoments(r, me);
    const coachName = young ? { en: "Ghuggi", pa: "ਘੁੱਗੀ" } : words(store.get().coach === "kaur" ? "coachKaur" : "coachSingh");
    const report = coachReport(r, me, words, pieceWord).map(x => `<p>${tx(x)}</p>`).join("");
    root.innerHTML = `<div class="screen">${bar}
      <div class="revreport">${look !== "adult" ? `<div class="av">${coachHTML(look, "happy")}</div>` : ""}
        <div class="grow">${look !== "adult" ? `<span class="who">${tx(coachName)}</span>` : ""}${report}</div></div>
      <div class="revstats ${young ? "two" : ""}">
        ${young ? `<div><b>${num(great)}</b><small>${t("greatMoves")}</small></div>` : `<div><b>${num(accMe)}%</b><small>${game!.meName ? tx(game!.meName) : t("you")}</small></div>`}
        <div class="gr" title="${t("gameRatingNote")}"><b>~${num(rating)}</b><small>${t("gameRatingLabel")}</small></div>
        ${young ? "" : `<div><b>${num(accThem)}%</b><small>${tx(game!.botName)}</small></div>`}
      </div>
      ${graph(white, moments)}
      ${moments.length ? `<h2 class="sec">${t("keyMomentsTitle")}</h2><div class="kmoments">${moments.map(m => {
        const why = reasonText(m, words, pieceWord);
        return `<button class="kmoment" data-km="${m.i}"><b class="tag ${m.label}">${lbl(m.label)}</b>
          <span class="grow">${num(Math.floor(m.i / 2) + 1)}${m.by === "w" ? "." : "…"} ${m.san}${why ? `<small>${tx(why)}</small>` : ""}</span>${icon("chevronRight")}</button>`;
      }).join("")}</div>` : ""}
      <div class="revcounts">${LABELS.filter(l => count(l)).map(l => `<div class="rc ${l}"><span class="dot"></span>${lbl(l)}<b>${num(count(l))}</b></div>`).join("")}</div>
      <div class="actions" style="flex-direction:column">
        <button class="btn wide" data-walk>${t("reviewWalk")} ${icon("arrowRight")}</button>
        <button class="inslink" data-insights>${icon("chart")}<span class="grow"><b>${t("insFromReview")}</b></span>${icon("chevronRight")}</button>
      </div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(game!.back);
    root.querySelector<HTMLButtonElement>("[data-walk]")!.onclick = () => walk(r, 0);
    root.querySelector<HTMLButtonElement>("[data-insights]")!.onclick = () => go("#/insights");
    root.querySelectorAll<HTMLElement>("[data-km]").forEach(b => b.addEventListener("click", () => walk(r, +b.dataset.km!)));
  }

  /** The evaluation graph (DECISIONS #104): the learner's chance of winning after every move, the light area
   *  is theirs; a coloured dot marks each key moment and opens it. */
  function graph(white: number[], moments: Reviewed[]): string {
    const W = 300, H = 90, n = Math.max(1, white.length - 1), me = game!.me;
    const y = (w: number) => (H * (me === "w" ? 100 - w : w) / 100).toFixed(1), x = (i: number) => (W * i / n).toFixed(1);
    const top = white.map((w, i) => `${x(i)},${y(w)}`).join(" L");
    return `<svg class="evalgraph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("evalGraphLabel")}">
      <rect width="${W}" height="${H}" fill="#2A2A2A"/><path d="M0,${H} L${top} L${W},${H} Z" fill="#F4F1EA"/>
      <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#888" stroke-dasharray="3 3"/>
      ${moments.map(m => `<circle class="kd" data-km="${m.i}" cx="${x(m.i + 1)}" cy="${y(white[m.i + 1])}" r="5.5" fill="var(--l-${m.label})" stroke="#fff" stroke-width="1.5"/>`).join("")}</svg>`;
  }

  function walk(r: Reviewed[], at: number) {
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
      const why = reasonText(m, words, pieceWord);
      root.querySelector("[data-note]")!.innerHTML = `<b class="tag ${m.label}">${lbl(m.label)}</b> ${num(Math.floor(at / 2) + 1)}${m.by === "w" ? "." : "…"} ${m.san} · ${whose}
        <p>${weak ? t("reviewChance").replace("{a}", num(Math.round(m.before))).replace("{b}", num(Math.round(m.after))).replace("{best}", bestSan) : t(m.label === "good" || m.label === "book" ? "reviewGood" : "reviewBest")}</p>
        ${why ? `<p class="coachline">${tx(why)}</p>` : ""}`;
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

  function retry(r: Reviewed[], at: number) {
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
