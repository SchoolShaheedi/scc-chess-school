// Play a friend on one device (chess review 2026-10-04): the most-used thing in a school chess club.
// Optional clock (no clock, 5 min, 10 min, 15 min + 10 s), and the board can turn after every move so each
// player sees it from their own side. Take-backs, a draw by agreement, resign, then Review and PGN.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen } from "../chess/types";
import { confetti } from "../celebrate";
import { num, t } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { captured, flagOutcome, movesFor, promotion } from "./gamekit";
import { saveGame } from "./history";
import { shareButton, wireShare } from "./share";
import { announceEnd, END_PAUSE, kindOf } from "./gameover";
import { gameMenuButton, wireGameMenu } from "./gamesettings";
import { pieceHTML } from "../chess/pieces";
import type { PieceCode } from "../chess/types";
import { setLastGame } from "../review/screen";
import { sound } from "../sound";
import { type Clock, flagged, fmt, newClock, press, remaining, undoTurn } from "./clock";
import { copyText, pgnOf } from "./pgn";
import { ask } from "../ui/dialog";

type Go = (h: string) => void;
const CONTROLS: [string, number, number][] = [["none", 0, 0], ["5", 5, 0], ["10", 10, 0], ["15+10", 15, 10]];
let choice = { tc: "none", turn: true };

export function friendSetup(root: HTMLElement, go: Go): () => void {
  let cleanup = () => {};
  const render = () => {
    root.innerHTML = `<div class="screen">
      <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("friendTitle")}</h1></div>
      <div class="hero"><div class="trophy light">${icon("swords")}</div><p>${t("friendAbout")}</p></div>
      <h2 class="sec">${t("clockTitle")}</h2>
      <div class="seg tcs" role="group">${CONTROLS.map(([id, m, inc]) => `<button data-tc="${id}" aria-pressed="${choice.tc === id}">${id === "none" ? t("clockNone") : inc ? `${num(m)} + ${num(inc)}` : `${num(m)} ${t("minutes")}`}</button>`).join("")}</div>
      <h2 class="sec">${t("turnBoard")}</h2>
      <div class="seg" role="group"><button data-turn="1" aria-pressed="${choice.turn}">${t("soundOn")}</button><button data-turn="0" aria-pressed="${!choice.turn}">${t("soundOff")}</button></div>
      <p class="note">${t("turnBoardNote")}</p>
      <div class="actions"><button class="btn wide" data-go>${t("playStart")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
    root.querySelectorAll<HTMLButtonElement>("[data-tc]").forEach(b => b.onclick = () => { choice.tc = b.dataset.tc!; render(); });
    root.querySelectorAll<HTMLButtonElement>("[data-turn]").forEach(b => b.onclick = () => { choice.turn = b.dataset.turn === "1"; render(); });
    root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = () => { const [, m, inc] = CONTROLS.find(c => c[0] === choice.tc)!; cleanup = friendGame(root, go, m ? newClock(m, inc) : null, choice.turn); };
  };
  render();
  return () => cleanup();
}

function friendGame(root: HTMLElement, go: Go, startClock: Clock | null, turnBoard: boolean): () => void {
  const g = new Chess();
  let clock = startClock, over = false, timer = 0, alive = true;
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("friendTitle")}</h1></div>
    <div class="clockbar top" data-clock-top></div>
    <div class="frame"><div class="boardwrap" data-board></div><div class="overcard" data-card hidden></div></div>
    <div class="clockbar" data-clock-bottom></div>
    <div class="status" data-state aria-live="polite"></div>
    <div class="movelist" data-moves></div>
    <div class="extra" data-extra></div>
    <div class="actions friendacts">
      <button class="btn ghost" data-undo>${icon("again")} ${t("takeback")}</button>
      <button class="btn ghost" data-draw>${t("drawAgree")}</button>
      <button class="btn ghost" data-resign>${t("resign")}</button></div></div>`;
  const board = new Board(root.querySelector("[data-board]")!, { game: true });
  root.querySelector(".lessonbar")!.insertAdjacentHTML("beforeend", gameMenuButton());   // DECISIONS #115
  wireGameMenu(root, board);
  root.querySelector(".screen")?.classList.add("gamescreen");   // DECISIONS #110 (look C): games are black and gold
  const extra = root.querySelector<HTMLElement>("[data-extra]")!;
  const ctx = { board, extra, say: () => {}, status: () => {}, done: () => {} };
  const times: (number | null)[] = [];   // Insights (DECISIONS #113): thinking time per move, by ply
  let turnAt = Date.now();
  const bottom = () => (turnBoard ? g.turn() : "w");
  const side = (s: "w" | "b") => t(s === "w" ? "colourWhite" : "colourBlack");

  function drawClocks() {
    const now = Date.now(), b = bottom(), top = b === "w" ? "b" : "w";
    const c = captured(g), caps = (by: "w" | "b") => c[by].map(p => `<span class="cp">${pieceHTML(`${by === "w" ? "b" : "w"}${p.toUpperCase()}` as PieceCode)}</span>`).join("")
      + ((by === "w" ? c.lead : -c.lead) > 0 ? `<span class="lead">+${num(Math.abs(c.lead))}</span>` : "");
    const cell = (s: "w" | "b") => `<span class="who"><i class="kingdot ${s}"></i>${side(s)}<span class="caps">${caps(s)}</span></span>${clock ? `<b class="${g.turn() === s && !over ? "run" : ""} ${clock && remaining(clock, s, now) < 20000 ? "low" : ""}">${fmt(remaining(clock, s, now))}</b>` : ""}`;
    root.querySelector("[data-clock-top]")!.innerHTML = cell(top);
    root.querySelector("[data-clock-bottom]")!.innerHTML = cell(b);
  }
  function show(anim = false) {
    const h = g.history({ verbose: true }), last = h.at(-1);
    board.setFlip(bottom() === "b");
    board.set(placementFromFen(g.fen()), { lastMove: last ? [last.from, last.to] : undefined, check: checkSquare(g) }, anim && last ? [last.from, last.to] : undefined);
    root.querySelector("[data-moves]")!.innerHTML = g.history().map((m, i) => `${i % 2 ? "" : `<i>${num(i / 2 + 1)}.</i>`}<span>${m}</span>`).join(" ");
    root.querySelector("[data-moves]")!.scrollLeft = 1e6;
    root.querySelector("[data-state]")!.innerHTML = over ? "" : `<b>${t("toMove").replace("{side}", t(g.turn() === "w" ? "colourWhiteObl" : "colourBlackObl"))}</b>${g.inCheck() ? ` · <b class="warn">${t("checkWord")}</b>` : ""}`;
    drawClocks();
  }
  function end(result: "1-0" | "0-1" | "1/2-1/2", how: string) {
    over = true; clearInterval(timer); sound.complete();
    announceEnd(board, kindOf(how, result === "1/2-1/2"), result === "1-0" ? "b" : result === "0-1" ? "w" : null);   // DECISIONS #117
    const uci = g.history({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));
    setLastGame({ uci, me: "w", meName: { en: "White", pa: "ਚਿੱਟਾ" }, botName: { en: "Black", pa: "ਕਾਲਾ" }, back: "#/play/friend" });
    const title = result === "1/2-1/2" ? t("gameDrawn") : t("sideWins").replace("{side}", side(result === "1-0" ? "w" : "b"));
    // kept in Your games from White's side (DECISIONS #84)
    saveGame({ at: new Date().toISOString(), opp: { en: "Black", pa: "ਕਾਲਾ" }, me: "w", meName: { en: "White", pa: "ਚਿੱਟਾ" },
      result: result === "1-0" ? "won" : result === "0-1" ? "lost" : "draw", tc: clock ? choice.tc : undefined, uci,
      ms: uci.map((_, i) => i % 2 === 0 ? times[i] ?? null : null) });
    setTimeout(() => {
      if (!alive) return;   // the player has already left this screen
      drawClocks();
      // the result as a card over the final position (DECISIONS #84); closing it shows the same buttons below
      const buttons = `${uci.length >= 2 ? `<button class="btn wide gold" data-review>${icon("target")} ${t("reviewTitle")}</button>` : ""}
        <button class="btn ghost wide" data-again>${t("rematch")}</button>
        ${uci.length >= 2 ? shareButton() : ""}<button class="linkbtn" data-pgn>${t("copyPgn")}</button><div data-pgnbox></div>`;
      const card = root.querySelector<HTMLElement>("[data-card]")!, acts = root.querySelector<HTMLElement>(".friendacts")!;
      card.innerHTML = `<button class="iconbtn x" data-x aria-label="${t("close")}">${icon("close")}</button>
        <div class="trophy light">${icon("trophy")}</div><h2>${title}</h2><p>${how}</p>${buttons}`;
      card.hidden = false;
      acts.innerHTML = `<div class="resultacts">${buttons}</div>`; acts.hidden = true;
      if (result !== "1/2-1/2") confetti(root.querySelector(".screen")!);
      root.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(b => b.onclick = () => go("#/review"));
      // DECISIONS #115: kept from White's side, like the game list
      wireShare(root, () => { const last = g.history({ verbose: true }).at(-1);
        return { pos: placementFromFen(g.fen()), lastMove: last ? [last.from, last.to] : undefined, flip: false, result: result === "1-0" ? "won" : result === "0-1" ? "lost" : "draw", how, opp: { en: "Black", pa: "ਕਾਲਾ" }, moves: Math.ceil(uci.length / 2) }; });
      root.querySelectorAll<HTMLButtonElement>("[data-pgn]").forEach(b => b.onclick = () => void copyText(pgnOf(uci, t("colourWhite"), t("colourBlack"), result), b.nextElementSibling as HTMLElement));
      root.querySelectorAll<HTMLButtonElement>("[data-again]").forEach(b => b.onclick = () => go(`#/play/friend?${Date.now()}`));
      card.querySelector<HTMLButtonElement>("[data-x]")!.onclick = () => { card.hidden = true; acts.hidden = false; };
    }, END_PAUSE);
  }
  function checkEnd(): boolean {
    if (g.isCheckmate()) { end(g.turn() === "w" ? "0-1" : "1-0", t("byMate")); return true; }
    if (g.isGameOver()) { end("1/2-1/2", g.isStalemate() ? t("byStalemate") : t("byRule")); return true; }
    return false;
  }
  board.interact({
    canPick: s => { if (over) return t("playAgain"); const p = g.get(s as CjSquare); return p && p.color === g.turn() ? true : t("notYourTurn"); },
    targets: s => g.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    confirmable: () => !over,
    onTap: () => {},
    onMove: async (from, to) => {
      if (over) return;
      const legal = movesFor(g, from, to);
      if (!legal.length) { board.shake(to); root.querySelector("[data-state]")!.textContent = refusal(g.fen(), from, to); return; }
      const promo = legal[0].promotion ? await promotion(ctx, g.turn()) : undefined;
      times[g.history().length] = Date.now() - turnAt;
      g.move({ from: legal[0].from, to: legal[0].to, promotion: promo }); turnAt = Date.now();
      if (clock) clock = press(clock, Date.now());
      show(true); checkEnd();
    },
  });
  root.querySelector<HTMLButtonElement>("[data-undo]")!.onclick = () => {
    if (over || !g.history().length) return;
    g.undo(); times.length = g.history().length; turnAt = Date.now(); if (clock) clock = undoTurn(clock, Date.now()); show();
  };
  root.querySelector<HTMLButtonElement>("[data-draw]")!.onclick = () => { if (!over) void ask(t("drawConfirm")).then(ok => { if (ok && !over) end("1/2-1/2", t("byAgreement")); }); };
  root.querySelector<HTMLButtonElement>("[data-resign]")!.onclick = () => {
    if (!over) void ask(t("resignSide").replace("{side}", side(g.turn())), { yes: t("resign"), danger: true }).then(ok => { if (ok && !over) end(g.turn() === "w" ? "0-1" : "1-0", t("byResign")); });
  };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { if (over || !g.history().length) go("#/play"); else void ask(t("leaveGame"), { yes: t("leave"), no: t("keepPlaying"), danger: true }).then(ok => { if (ok) go("#/play"); }); };
  if (clock) timer = window.setInterval(() => {
    if (over || !clock) return;
    const f = flagged(clock, Date.now());
    if (f) {
      // out of time loses, unless the other side has only a king left: then it can never mate, so it's a draw
      end(flagOutcome(g, f) === "loss" ? (f === "w" ? "0-1" : "1-0") : "1/2-1/2", t("byTime"));
    } else drawClocks();
  }, 100);
  show();
  return () => { alive = false; over = true; clearInterval(timer); board.destroy(); };
}
