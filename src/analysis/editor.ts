// The board editor (DECISIONS #115, option C): set up any position with a piece tray under the board, see at once
// whether it can be played (one king each, no pawn on the edge rows, the side not to move not in check), copy its
// FEN, and then analyse it or play it against a bot. Opened from the analysis board ("Set up a position").
import { BOTS } from "../bots/bots";
import { playFrom } from "../bots/play";
import { Board } from "../chess/board";
import { pieceHTML } from "../chess/pieces";
import { type PieceCode, type Placement, placementFromFen } from "../chess/types";
import { num, t, tx, UI, type UIKey } from "../i18n";
import { icon } from "../icons";
import { openInAnalysis } from "./screen";
import { castlingOf, fenOf, problemOf } from "./position";

type Go = (h: string) => void;
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let handed: string | null = null;
/** The analysis board hands over the position it is showing. */
export const editFrom = (fen: string) => { handed = fen; };

export function boardEditor(root: HTMLElement, go: Go): () => void {
  const fen0 = handed ?? START_FEN; handed = null;
  let pos: Placement = placementFromFen(fen0), turn: "w" | "b" = fen0.split(" ")[1] === "b" ? "b" : "w";
  let tool: PieceCode | "x" | null = null, flip = false, sub: (() => void) | null = null;
  const tray = (c: "w" | "b") => (["K", "Q", "R", "B", "N", "P"] as const).map(k => `${c}${k}` as PieceCode)
    .map(p => `<button class="edpc" data-tool="${p}" aria-label="${tx(UI[`pc${p[1]}` as UIKey])} (${t(p[0] === "w" ? "colourWhite" : "colourBlack")})">${pieceHTML(p)}</button>`).join("");
  root.innerHTML = `<div class="screen editor">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("edTitle")}</h1>
      <button class="iconbtn" data-flip aria-label="${t("anaFlip")}">${icon("again")}</button></div>
    <div class="frame"><div class="boardwrap" data-board></div></div>
    <div class="edtray" role="group" aria-label="${t("edTray")}">${tray("w")}</div>
    <div class="edtray" role="group" aria-label="${t("edTray")}">${tray("b")}<button class="edpc er" data-tool="x" aria-label="${t("edErase")}">${icon("close")}</button></div>
    <div class="seg" role="group" data-turn>${(["w", "b"] as const).map(c => `<button data-v="${c}">${t("toMove").replace("{side}", t(c === "w" ? "colourWhiteObl" : "colourBlackObl"))}</button>`).join("")}</div>
    <div class="row3"><button class="btn ghost" data-start>${t("edStart")}</button><button class="btn ghost" data-clear>${t("edClear")}</button></div>
    <p class="edstate" data-state aria-live="polite"></p>
    <div class="edfen"><code data-fen></code><button class="btn ghost small" data-copy>${t("edCopy")}</button></div>
    <div class="row2"><button class="btn" data-analyse>${icon("search")} ${t("edAnalyse")}</button><button class="btn ghost" data-play>${icon("swords")} ${t("anaPlayFrom")}</button></div>
    <div class="extra" data-extra></div>
    <p class="note">${t("edHint")}</p></div>`;
  const board = new Board(root.querySelector("[data-board]")!, {});
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;

  function draw() {
    board.setFlip(flip);
    board.set(pos);
    root.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === tool)));
    root.querySelectorAll<HTMLButtonElement>("[data-turn] button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === turn)));
    const bad = problemOf(pos, turn), fen = fenOf(pos, turn), c = castlingOf(pos);
    $("[data-state]").className = `edstate ${bad ? "bad" : "ok"}`;
    $("[data-state]").innerHTML = bad ? `${icon("no")} ${t(`edP_${bad}` as UIKey)}`
      : `${icon("ok")} ${t("edOk").replace("{side}", t(turn === "w" ? "colourWhiteObl" : "colourBlackObl")).replace("{c}", c === "-" ? t("edNone") : c)}`;
    $("[data-fen]").textContent = fen;
    $<HTMLButtonElement>("[data-analyse]").disabled = $<HTMLButtonElement>("[data-play]").disabled = !!bad;
  }

  board.interact({
    // with a tray piece (or ✕) chosen, a tap on any square places (or removes); with none, pieces are dragged
    canPick: () => (tool ? "" : true),
    targets: () => [],
    onTap: s => { if (!tool) return; if (tool === "x") delete pos[s]; else pos[s] = tool; draw(); },
    onMove: (from, to) => { const p = pos[from]; if (!p) return; delete pos[from]; pos[to] = p; draw(); },
  });
  root.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach(b => b.onclick = () => {
    const v = b.dataset.tool as PieceCode | "x"; tool = tool === v ? null : v; draw();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-turn] button").forEach(b => b.onclick = () => { turn = b.dataset.v as "w" | "b"; draw(); });
  $<HTMLButtonElement>("[data-start]").onclick = () => { pos = placementFromFen(START_FEN); turn = "w"; draw(); };
  $<HTMLButtonElement>("[data-clear]").onclick = () => { pos = {}; draw(); };
  $<HTMLButtonElement>("[data-flip]").onclick = () => { flip = !flip; draw(); };
  $<HTMLButtonElement>("[data-back]").onclick = () => go("#/analysis");
  $<HTMLButtonElement>("[data-copy]").onclick = async () => {
    const b = $<HTMLButtonElement>("[data-copy]");
    try { await navigator.clipboard.writeText(fenOf(pos, turn)); b.textContent = t("edCopied"); } catch { window.getSelection()?.selectAllChildren($("[data-fen]")); }
  };
  $<HTMLButtonElement>("[data-analyse]").onclick = () => { openInAnalysis(fenOf(pos, turn), [], 0); go("#/analysis"); };
  $<HTMLButtonElement>("[data-play]").onclick = () => {
    const extra = $("[data-extra]"), fen = fenOf(pos, turn);
    extra.innerHTML = `<div class="botpick"><b>${t("anaPickBot")}</b>${BOTS.map(b => `<button data-pb="${b.id}"><img src="art/bots/${b.id}-neutral.webp" alt="">${tx(b.name)}<small>~${num(b.rating)}</small></button>`).join("")}</div>`;
    extra.querySelectorAll<HTMLButtonElement>("[data-pb]").forEach(b => b.onclick = () => {
      openInAnalysis(fen, [], 0);   // leaving the game opens the analysis board on this position
      board.destroy();
      sub = playFrom(root, BOTS.find(x => x.id === b.dataset.pb)!, fen, go);
    });
  };
  draw();
  return () => { board.destroy(); sub?.(); };
}
