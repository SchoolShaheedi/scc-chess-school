// The analysis board (chess review 2026-10-04): move freely for both sides, step back and forward, see
// Stockfish's view (a win-chance bar, the score, its best line), load a position or game, copy the PGN, and
// play on from any position against a bot. Opened from the Play tab, or from Game Review at a chosen move.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { BOTS } from "../bots/bots";
import { playFrom } from "../bots/play";
import { getEngine } from "../engine/browser";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { movesFor, promotion } from "../play/gamekit";
import { copyText, pgnOf } from "../play/pgn";
import { whiteWin } from "../review/grade";
import { explorerHTML } from "./explorer";

type Go = (h: string) => void;
const START = new Chess().fen();
let pending: { start: string; uci: string[]; at: number } | null = null;
/** Game Review hands a game over at a chosen move. */
export const openInAnalysis = (start: string, uci: string[], at: number) => { pending = { start, uci, at }; };

export function analysisBoard(root: HTMLElement, go: Go): () => void {
  let start = pending?.start ?? START, line: string[] = pending?.uci ?? [], at = pending?.at ?? 0;
  pending = null;
  let flip = false, showBest = true, alive = true, ask = 0, best: string | null = null, sub: (() => void) | null = null;
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("anaTitle")}</h1>
      <button class="iconbtn" data-flip aria-label="${t("anaFlip")}">${icon("again")}</button></div>
    <div class="evalrow"><div class="evalbar" aria-hidden="true"><i data-evalw></i></div><b data-score>…</b></div>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    <p class="anabest" data-line aria-live="polite"></p>
    <div class="movelist" data-moves></div>
    <div class="extra" data-extra></div>
    <details class="explorer" open><summary>${icon("book")} ${t("explorerTitle")}</summary><div data-explorer><p class="muted">${t("loading")}</p></div></details>
    <div class="actions anank">
      <button class="btn ghost" data-first aria-label="${t("anaStart")}">${icon("arrowLeft")}${icon("arrowLeft")}</button>
      <button class="btn ghost" data-prev aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <button class="btn ghost" data-next aria-label="${t("next")}">${icon("chevronRight")}</button>
      <button class="btn ghost" data-last aria-label="${t("anaEnd")}">${icon("arrowRight")}${icon("arrowRight")}</button></div>
    <div class="anatools">
      <button class="btn ghost" data-best>${icon("hint")} <span data-besttxt></span></button>
      <button class="btn ghost" data-load>${t("anaLoad")}</button>
      <button class="btn ghost" data-pgn>${t("copyPgn")}</button>
      <button class="btn" data-playfrom>${icon("swords")} ${t("anaPlayFrom")}</button>
    </div><div data-pgnbox></div></div>`;
  const board = new Board(root.querySelector("[data-board]")!, {});
  const extra = root.querySelector<HTMLElement>("[data-extra]")!;
  const ctx = { board, extra, say: () => {}, status: () => {}, done: () => {} };
  const pos = () => { const g = new Chess(start); for (const u of line.slice(0, at)) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return g; };

  function render() {
    const g = pos(), last = at ? line[at - 1] : null;
    board.setFlip(flip);
    board.set(placementFromFen(g.fen()), {
      lastMove: last ? [last.slice(0, 2) as Square, last.slice(2, 4) as Square] : undefined, check: checkSquare(g),
      arrows: showBest && best ? [[best.slice(0, 2) as Square, best.slice(2, 4) as Square]] : undefined,
    });
    const full = new Chess(start), sans: string[] = [];
    for (const u of line) sans.push(full.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    const off = new Chess(start).turn() === "b" ? 1 : 0;   // a position with Black to move numbers "1... e5"
    root.querySelector("[data-moves]")!.innerHTML = sans.map((m, i) => `${(i + off) % 2 ? "" : `<i>${num(Math.floor((i + off) / 2) + 1)}.</i>`}<button class="mv ${i === at - 1 ? "on" : ""}" data-i="${i + 1}">${m}</button>`).join(" ");
    root.querySelectorAll<HTMLButtonElement>("[data-moves] .mv").forEach(b => b.onclick = () => { at = +b.dataset.i!; refresh(); });
    root.querySelector("[data-besttxt]")!.textContent = showBest ? t("anaHideBest") : t("anaShowBest");
  }

  /** Ask Stockfish about the current position; a newer request makes an older answer stale. */
  async function evaluate() {
    const id = ++ask, g = pos();
    best = null; render();
    root.querySelector("[data-score]")!.textContent = "…";
    if (g.isGameOver()) {
      const txt = g.isCheckmate() ? t("anaMated") : t("gameDrawn");
      root.querySelector("[data-score]")!.textContent = txt;
      root.querySelector<HTMLElement>("[data-evalw]")!.style.width = `${g.isCheckmate() ? (g.turn() === "w" ? 0 : 100) : 50}%`;
      root.querySelector("[data-line]")!.textContent = ""; return;
    }
    const a = await (await getEngine()).analyse(g.fen(), { depth: 14 });
    if (!alive || id !== ask) return;
    best = a.best;
    const white = whiteWin(a.score, g.turn() === "w");
    root.querySelector<HTMLElement>("[data-evalw]")!.style.width = `${white}%`;
    const s = a.score, sign = (n: number) => (g.turn() === "w" ? n : -n);
    root.querySelector("[data-score]")!.textContent = s.mate !== undefined
      ? `${sign(s.mate) > 0 ? "+" : "-"}M${num(Math.abs(s.mate))}` : `${sign(s.cp ?? 0) >= 0 ? "+" : ""}${(sign(s.cp ?? 0) / 100).toFixed(1)}`;
    // the best line in SAN, a few moves deep
    const h = new Chess(g.fen()), pv: string[] = [];
    for (const u of a.pv.slice(0, 6)) { try { pv.push(h.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
    root.querySelector("[data-line]")!.innerHTML = showBest && pv.length ? `<b>${t("anaBestLine")}</b> ${pv.join(" ")}` : "";
    render();
  }
  /** The opening explorer for the current position (DECISIONS #85); a tap on a row plays that move. */
  async function explorer() {
    const id = ask, box = root.querySelector<HTMLElement>("[data-explorer]")!;
    const html = await explorerHTML(pos().fen());
    if (!alive || id !== ask) return;
    box.innerHTML = html;
    box.querySelectorAll<HTMLElement>("[data-ex]").forEach(row => {
      const play = () => { const uci = row.dataset.ex!; if (line[at] !== uci) line = [...line.slice(0, at), uci]; at++; refresh(); };
      row.onclick = play; row.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); } };
    });
  }
  const refresh = () => { void evaluate(); void explorer(); };

  board.interact({
    canPick: s => { const g = pos(), p = g.get(s as CjSquare); return p && p.color === g.turn() ? true : t("notYourTurn"); },
    targets: s => pos().moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      const g = pos(), legal = movesFor(g, from, to);
      if (!legal.length) { board.shake(to); root.querySelector("[data-line]")!.textContent = refusal(g.fen(), from, to); return; }
      const promo = legal[0].promotion ? await promotion(ctx, g.turn()) : undefined;
      const uci = legal[0].from + legal[0].to + (promo ?? "");
      // a new move here replaces whatever came after it (unless it is the same move)
      if (line[at] !== uci) line = [...line.slice(0, at), uci];
      at++; refresh();
    },
  });
  const nav = (n: number) => { at = Math.max(0, Math.min(line.length, n)); refresh(); };
  root.querySelector<HTMLButtonElement>("[data-first]")!.onclick = () => nav(0);
  root.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => nav(at - 1);
  root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => nav(at + 1);
  root.querySelector<HTMLButtonElement>("[data-last]")!.onclick = () => nav(line.length);
  root.querySelector<HTMLButtonElement>("[data-flip]")!.onclick = () => { flip = !flip; render(); };
  root.querySelector<HTMLButtonElement>("[data-best]")!.onclick = () => { showBest = !showBest; refresh(); };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
  root.querySelector<HTMLButtonElement>("[data-pgn]")!.onclick = () =>
    void copyText(pgnOf(line, "?", "?", "*", start === START ? undefined : start), root.querySelector("[data-pgnbox]")!);
  // load a FEN (a position) or a PGN (a game)
  root.querySelector<HTMLButtonElement>("[data-load]")!.onclick = () => {
    const text = prompt(t("anaLoadAsk"))?.trim(); if (!text) return;
    try {
      if (/^[rnbqkpRNBQKP1-8]+(\/[rnbqkpRNBQKP1-8]+){7}\s/.test(text)) { new Chess(text); start = text; line = []; at = 0; }
      else { const g = new Chess(); g.loadPgn(text); start = g.getHeaders().FEN ?? START; line = g.history({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? "")); at = line.length; }
      refresh();
    } catch { alert(t("anaLoadBad")); }
  };
  // play on from here against a bot: the learner takes the side to move
  root.querySelector<HTMLButtonElement>("[data-playfrom]")!.onclick = () => {
    const fen = pos().fen();
    extra.innerHTML = `<div class="botpick"><b>${t("anaPickBot")}</b>${BOTS.map(b => `<button data-pb="${b.id}"><img src="art/bots/${b.id}-neutral.webp" alt="">${tx(b.name)}<small>~${num(b.rating)}</small></button>`).join("")}</div>`;
    extra.querySelectorAll<HTMLButtonElement>("[data-pb]").forEach(b => b.onclick = () => {
      openInAnalysis(start, line, at);   // coming back from the game reopens this analysis, not an empty board
      alive = false; board.destroy();
      sub = playFrom(root, BOTS.find(x => x.id === b.dataset.pb)!, fen, go);
    });
  };
  refresh();
  return () => { alive = false; board.destroy(); sub?.(); };
}
