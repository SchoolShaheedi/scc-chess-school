// The analysis board (chess review 2026-10-04): move freely for both sides, step back and forward, see
// Stockfish's view (a win-chance bar, the score, its top three lines), load a position or game, copy the PGN, and
// play on from any position against a bot. Opened from the Play tab, or from Game Review at a chosen move.
// Feature 1 of the advanced trials (2026-10-29): three engine lines, "What are they threatening?", and side-lines
// (variations) instead of overwriting the game.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { BOTS } from "../bots/bots";
import { playFrom } from "../bots/play";
import { getEngine } from "../engine/browser";
import type { Score } from "../engine/uci";
import { num, t, tx, type UIKey } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { movesFor, promotion } from "../play/gamekit";
import { copyText, pgnOf } from "../play/pgn";
import { whiteWin } from "../review/grade";
import { explorerHTML } from "./explorer";
import { editFrom } from "./editor";
import { addMove, deleteSideline, fromLine, hasVariations, inSideline, mainLine, pgnWithVariations, stepBack, stepForward, toEnd, tokens, ucisOf, type Node, type Path } from "./tree";
import { describeThreat, nullMove, pvSan, whiteScore } from "./threat";
import { tell } from "../ui/dialog";

type Go = (h: string) => void;
const START = new Chess().fen();
let pending: { start: string; uci: string[]; at: number; tree?: Node; path?: Path } | null = null;
/** Game Review hands a game over at a chosen move. */
export const openInAnalysis = (start: string, uci: string[], at: number) => { pending = { start, uci, at }; };

/** Search caps so a phone stays responsive: depth 16, or 2.5 seconds, whichever comes first. */
const LINES = { n: 3, depth: 16, movetime: 2500 };
const THREAT = { n: 1, depth: 14, movetime: 2000 };

const scoreText = (s: Score) => s.mate !== undefined
  ? `${s.mate > 0 ? "+" : "-"}M${num(Math.abs(s.mate))}` : `${(s.cp ?? 0) >= 0 ? "+" : ""}${((s.cp ?? 0) / 100).toFixed(1)}`;

export function analysisBoard(root_: HTMLElement, go: Go): () => void {
  // the game is a tree: the game's own moves plus any side-lines; `path` is where we are standing in it
  let start = pending?.start ?? START, tree: Node = pending?.tree ?? fromLine(pending?.uci ?? []);
  let path: Path = pending?.path ?? Array(Math.min(pending?.at ?? 0, mainLine(tree).length)).fill(0);
  pending = null;
  let flip = false, showBest = true, alive = true, ask = 0, askThreat = 0, best: string | null = null;
  let threat: [Square, Square] | null = null, sub: (() => void) | null = null;
  root_.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("anaTitle")}</h1>
      <button class="iconbtn" data-flip aria-label="${t("anaFlip")}">${icon("again")}</button></div>
    <div class="evalrow"><div class="evalbar" aria-hidden="true"><i data-evalw></i></div><b data-score>…</b></div>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    <p class="anabest" data-line aria-live="polite"></p>
    <div class="analines" data-lines role="group" aria-label="${t("anaLines")}" aria-live="polite"></div>
    <p class="anabest" data-threattxt aria-live="polite"></p>
    <div class="movelist anamoves" data-moves></div>
    <div class="sidebar" data-sidebar hidden><small>${t("anaSideNow")}</small>
      <button class="btn ghost" data-sideback>${t("anaSideBack")}</button><button class="btn ghost" data-sidedel>${t("anaSideDel")}</button></div>
    <div class="extra" data-extra></div>
    <details class="explorer" open><summary>${icon("book")} ${t("explorerTitle")}</summary><div data-explorer><p class="muted">${t("loading")}</p></div></details>
    <div class="actions anank">
      <button class="btn ghost" data-first aria-label="${t("anaStart")}">${icon("arrowLeft")}${icon("arrowLeft")}</button>
      <button class="btn ghost" data-prev aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <button class="btn ghost" data-next aria-label="${t("next")}">${icon("chevronRight")}</button>
      <button class="btn ghost" data-last aria-label="${t("anaEnd")}">${icon("arrowRight")}${icon("arrowRight")}</button></div>
    <div class="anatools">
      <button class="btn ghost" data-threat>${icon("hint")} <span data-threatlbl>${t("anaThreat")}</span></button>
      <button class="btn ghost" data-best>${icon("hint")} <span data-besttxt></span></button>
      <button class="btn ghost" data-edit>${icon("grid")} ${t("edTitle")}</button>
      <button class="btn ghost" data-load>${t("anaLoad")}</button>
      <button class="btn ghost" data-pgn>${t("copyPgn")}</button>
      <button class="btn" data-playfrom>${icon("swords")} ${t("anaPlayFrom")}</button>
    </div><div data-pgnbox></div></div>`;
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root_.querySelector<T>(sel)!;
  const board = new Board(q("[data-board]"), {});
  const extra = q("[data-extra]");
  const ctx = { board, extra, say: () => {}, status: () => {}, done: () => {} };
  const pos = () => { const g = new Chess(start); for (const u of ucisOf(tree, path)) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return g; };

  function render() {
    const g = pos(), ucis = ucisOf(tree, path), last = ucis.length ? ucis[ucis.length - 1] : null;
    board.setFlip(flip);
    board.set(placementFromFen(g.fen()), {
      lastMove: last ? [last.slice(0, 2) as Square, last.slice(2, 4) as Square] : undefined, check: checkSquare(g),
      arrows: showBest && best ? [[best.slice(0, 2) as Square, best.slice(2, 4) as Square]] : undefined,
      threats: threat ? [threat] : undefined,
    });
    // the move list: the game's moves, each side-line in brackets right after the move it replaces
    q("[data-moves]").innerHTML = tokens(tree, start).map(tk => tk.kind === "open" ? `<span class="br">(</span>` : tk.kind === "close" ? `<span class="br">)</span>`
      : `${tk.label ? `<i>${num(tk.label)}</i>` : ""}<button class="mv ${tk.path!.join() === path.join() ? "on" : ""}" data-p="${tk.path!.join(",")}">${tk.san}</button>`).join(" ");
    root_.querySelectorAll<HTMLButtonElement>("[data-moves] .mv").forEach(b => b.onclick = () => { path = b.dataset.p!.split(",").map(Number); refresh(); });
    q("[data-sidebar]").hidden = !inSideline(path);
    q("[data-besttxt]").textContent = showBest ? t("anaHideBest") : t("anaShowBest");
    q("[data-threatlbl]").textContent = threat || q("[data-threattxt]").textContent ? t("anaThreatHide") : t("anaThreat");
  }

  /** Ask Stockfish about the current position. Cancel-safe: a newer request bumps `ask`, which stops the search in
   *  flight (engine.stop()), makes a queued older one skip itself (`stale`), and makes any late answer be ignored. */
  async function evaluate() {
    const id = ++ask, g = pos(), stale = () => !alive || id !== ask;
    best = null; render();
    q("[data-score]").textContent = "…"; q("[data-lines]").innerHTML = "";
    if (g.isGameOver()) {
      const txt = g.isCheckmate() ? t("anaMated") : t("gameDrawn");
      q("[data-score]").textContent = txt;
      q("[data-evalw]").style.width = `${g.isCheckmate() ? (g.turn() === "w" ? 0 : 100) : 50}%`;
      q("[data-line]").textContent = ""; return;
    }
    let found;
    try { const eng = getEngine(); eng.stop(); found = await eng.lines(g.fen(), { ...LINES, stale }); } catch { return; }
    if (stale() || !found.length) return;
    const white = g.turn() === "w", top = found[0];
    best = top.pv[0];
    q("[data-evalw]").style.width = `${whiteWin(top.score, white)}%`;
    q("[data-score]").textContent = scoreText(whiteScore(top.score, white));
    q("[data-line]").textContent = "";
    q("[data-lines]").innerHTML = showBest ? found.map(l =>
      `<div class="anaLn"><b>${scoreText(whiteScore(l.score, white))}</b><span>${pvSan(g.fen(), l.pv, 6)}</span></div>`).join("") : "";
    render();
  }

  /** "What are they threatening?": hand the move to the other side and see what they would play. */
  async function whatThreat() {
    const out = q("[data-threattxt]");
    if (threat || out.textContent) { askThreat++; threat = null; out.textContent = ""; render(); return; }   // pressed again: hide
    const nm = nullMove(pos().fen());
    if ("skip" in nm) { out.textContent = t(nm.skip === "check" ? "anaThreatCheck" : "anaThreatIllegal"); render(); return; }
    const id = ++askThreat, stale = () => !alive || id !== askThreat;
    out.textContent = "…"; render();
    let found;
    try { found = await getEngine().lines(nm.fen, { ...THREAT, stale }); } catch { if (!stale()) { out.textContent = ""; render(); } return; }
    if (stale()) return;
    if (!found.length) { out.textContent = ""; render(); return; }
    const mv = found[0].pv[0], th = describeThreat(nm.fen, mv, found[0].score);
    threat = [mv.slice(0, 2) as Square, mv.slice(2, 4) as Square];
    const m = (new Chess(nm.fen).turn() === "b" ? "…" : "") + th.san, fill = (k: UIKey, p = "") => t(k).replace("%m", m).replace("%p", p);
    out.textContent = th.kind === "mate" ? fill("anaThreatMate")
      : th.kind === "capture" ? fill("anaThreatWin", t(`pc${th.piece.toUpperCase()}` as UIKey))
      : th.kind === "promote" ? fill("anaThreatPromote") : th.kind === "advantage" ? fill("anaThreatAdv") : fill("anaThreatNone");
    render();
  }
  /** The opening explorer for the current position (DECISIONS #85); a tap on a row plays that move. */
  async function explorer() {
    const id = ask, box = q("[data-explorer]");
    const html = await explorerHTML(pos().fen());
    if (!alive || id !== ask) return;
    box.innerHTML = html;
    box.querySelectorAll<HTMLElement>("[data-ex]").forEach(row => {
      const play = () => { path = addMove(tree, path, row.dataset.ex!); refresh(); };
      row.onclick = play; row.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); } };
    });
  }
  const refresh = () => {
    askThreat++; threat = null; q("[data-threattxt]").textContent = "";   // a threat belongs to the position it was asked in
    void evaluate(); void explorer();
  };

  board.interact({
    canPick: s => { const g = pos(), p = g.get(s as CjSquare); return p && p.color === g.turn() ? true : t("notYourTurn"); },
    targets: s => pos().moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      const g = pos(), legal = movesFor(g, from, to);
      if (!legal.length) { board.shake(to); q("[data-line]").textContent = refusal(g.fen(), from, to); return; }
      const promo = legal[0].promotion ? await promotion(ctx, g.turn()) : undefined;
      // a move that differs from the game's next move becomes a side-line; the rest of the game stays
      path = addMove(tree, path, legal[0].from + legal[0].to + (promo ?? ""));
      refresh();
    },
  });
  const nav = (p: Path) => { path = p; refresh(); };
  q("[data-first]").onclick = () => nav([]);
  q("[data-prev]").onclick = () => nav(stepBack(path));
  q("[data-next]").onclick = () => nav(stepForward(tree, path));
  q("[data-last]").onclick = () => nav(toEnd(tree, path));
  q("[data-sideback]").onclick = () => nav(path.slice(0, path.findIndex(i => i > 0)));
  q("[data-sidedel]").onclick = () => { const p = deleteSideline(tree, path); if (p) nav(p); };
  q("[data-flip]").onclick = () => { flip = !flip; render(); };
  q("[data-best]").onclick = () => { showBest = !showBest; refresh(); };
  q("[data-threat]").onclick = () => void whatThreat();
  q("[data-back]").onclick = () => go("#/play");
  q("[data-edit]").onclick = () => { editFrom(pos().fen()); go("#/editor"); };   // DECISIONS #115
  q("[data-pgn]").onclick = () => {
    const startArg = start === START ? undefined : start;
    void copyText(hasVariations(tree) ? pgnWithVariations(tree, "?", "?", "*", startArg) : pgnOf(mainLine(tree), "?", "?", "*", startArg), q("[data-pgnbox]"));
  };
  // load a FEN (a position) or a PGN (a game)
  q("[data-load]").onclick = () => {
    const text = prompt(t("anaLoadAsk"))?.trim(); if (!text) return;
    try {
      if (/^[rnbqkpRNBQKP1-8]+(\/[rnbqkpRNBQKP1-8]+){7}\s/.test(text)) { new Chess(text); start = text; tree = fromLine([]); path = []; }
      else {
        const g = new Chess(); g.loadPgn(text); start = g.getHeaders().FEN ?? START;
        tree = fromLine(g.history({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""))); path = toEnd(tree, []);
      }
      refresh();
    } catch { void tell(t("anaLoadBad")); }
  };
  // play on from here against a bot: the learner takes the side to move
  q("[data-playfrom]").onclick = () => {
    const fen = pos().fen();
    extra.innerHTML = `<div class="botpick"><b>${t("anaPickBot")}</b>${BOTS.map(b => `<button data-pb="${b.id}"><img src="art/bots/${b.id}-neutral.webp" alt="">${tx(b.name)}<small>~${num(b.rating)}</small></button>`).join("")}</div>`;
    extra.querySelectorAll<HTMLButtonElement>("[data-pb]").forEach(b => b.onclick = () => {
      pending = { start, uci: [], at: 0, tree, path };   // coming back from the game reopens this analysis, side-lines and all
      alive = false; board.destroy();
      sub = playFrom(root_, BOTS.find(x => x.id === b.dataset.pb)!, fen, go);
    });
  };
  refresh();
  return () => { alive = false; board.destroy(); sub?.(); };
}
