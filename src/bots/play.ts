// Play a bot (DECISIONS #69): the bot list, the colour choice, a full game, and the result.
// Takebacks and a hint arrow only against the first three bots. A game started from the Level 1 test
// records the test as passed when the learner wins (DECISIONS #53, #69).
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { confetti } from "../celebrate";
import { getEngine } from "../engine/browser";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { captured, movesFor, positionAt, premoveTargets, premovesOn, promotion } from "../play/gamekit";
import { type Clock, flagged, fmt, newClock, press, remaining } from "../play/clock";
import { saveGame } from "../play/history";
import { pieceHTML } from "../chess/pieces";
import type { PieceCode } from "../chess/types";
import { family } from "../family";
import { avatarHTML } from "../me/family";
import { sound } from "../sound";
import { store } from "../store";
import { tabbar } from "../tabbar";
import { setLastGame } from "../review/screen";
import { copyText, pgnOf } from "../play/pgn";
import { type Bot, BOTS, botMove } from "./bots";

const art = (b: Bot, mood: "neutral" | "win" | "lose") => `<img class="botart" src="art/bots/${b.id}-${mood}.webp" alt="">`;
const fill = (s: string, b: Bot) => s.replace("{bot}", tx(b.name));
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function botList(root: HTMLElement, go: (h: string) => void) {
  // the bot nearest the learner's rating, a little above it: a fair, winnable game
  const r = store.get().rating.r;
  const suggested = [...BOTS].sort((a, b) => Math.abs(a.rating - (r + 100)) - Math.abs(b.rating - (r + 100)))[0].id;
  root.innerHTML = `<div class="screen tabbed">
    <div class="lessonbar"><button class="iconbtn" data-home aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("playTitle")}</h1></div>
    <p class="muted">${t("playSub")}</p>
    ${store.get().look === "young" ? "" : `<p class="note">${t("ratingLabel")}: <b>${num(store.get().rating.r)}</b> · ${t("suggestedBot")}</p>`}
    <button class="playcard onlinecard" data-online><span class="rushicon">${icon("users")}</span>
      <span class="grow"><b>${t("onlineTitle")}</b><small>${t("onlineSub")}</small></span>${icon("arrowRight")}</button>
    <button class="playcard friendcard" data-friend><span class="rushicon">${icon("swords")}</span>
      <span class="grow"><b>${t("friendTitle")}</b><small>${t("friendSub")}</small></span>${icon("arrowRight")}</button>
    <button class="playcard anacard" data-analysis><span class="rushicon">${icon("search")}</span>
      <span class="grow"><b>${t("anaTitle")}</b><small>${t("anaSub")}</small></span>${icon("arrowRight")}</button>
    <div class="botlist">${BOTS.map(b => `<button class="botcard ${b.id === suggested ? "on" : ""}" data-bot="${b.id}">${art(b, "neutral")}
      <span class="grow"><b>${tx(b.name)}</b><small class="rating">~${num(b.rating)}</small><small>${tx(b.about)}</small></span>
      ${icon("play", "go")}</button>`).join("")}</div></div>${tabbar("play")}`;
  root.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => go("#/");
  root.querySelectorAll<HTMLButtonElement>("[data-bot]").forEach(b => b.onclick = () => go(`#/play/${b.dataset.bot}`));
  root.querySelector<HTMLButtonElement>("[data-friend]")!.onclick = () => go("#/play/friend");
  root.querySelector<HTMLButtonElement>("[data-online]")!.onclick = () => go("#/online");
  root.querySelector<HTMLButtonElement>("[data-analysis]")!.onclick = () => go("#/analysis");
}

/** Play a bot from any position (the analysis board's "Play from here"): you take the side to move. */
export function playFrom(root: HTMLElement, bot: Bot, fen: string, go: (h: string) => void): () => void {
  return game(root, bot, new Chess(fen).turn(), go, "#/analysis", undefined, undefined, fen);
}

/** Colour choice (and a clock), then the game. `testLevel` = this game is that level's test. */
export function playBot(root: HTMLElement, bot: Bot, go: (h: string) => void, testLevel?: number, race?: number): () => void {
  let cleanup = () => {};
  const back = testLevel ? "#/" : "#/play";
  const timed = !testLevel && !race;   // a level test is always untimed
  const render = () => {
    root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${testLevel ? fill(t("botTestTitle"), bot) : tx(bot.name)}</h1></div>
    <div class="botintro">${art(bot, "neutral")}<h2>${tx(bot.name)} <small>~${num(bot.rating)}</small></h2><p>${tx(bot.about)}</p>
      ${race ? `<p class="raceline">${icon("target")} ${t("raceRule").replace("{n}", num(race)).replace("{bot}", tx(bot.name))}</p>` : ""}
      <p class="helpline">${icon(bot.help ? "ok" : "lock")} ${t(bot.help && testLevel ? "helpTest" : bot.help ? "helpOn" : "helpOff")}</p></div>
    ${timed ? `<h2 class="sec">${t("clockTitle")}</h2>
    <div class="seg tcs" role="group">${TCS.map(([id, m, inc]) => `<button data-tc="${id}" aria-pressed="${botTc === id}">${id === "none" ? t("clockNone") : inc ? `${num(m)} + ${num(inc)}` : `${num(m)} ${t("minutes")}`}</button>`).join("")}</div>
    ${botTc !== "none" && bot.help ? `<p class="note">${t("timedNoHelp")}</p>` : ""}` : ""}
    <h2 class="sec">${t("chooseColour")}</h2>
    <div class="seg colours" role="group">${(["w", "random", "b"] as const).map(c =>
      `<button data-c="${c}"><span class="kingdot ${c}"></span>${t(c === "w" ? "colourWhite" : c === "b" ? "colourBlack" : "colourRandom")}</button>`).join("")}</div>
  </div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    root.querySelectorAll<HTMLButtonElement>("[data-tc]").forEach(b => b.onclick = () => { botTc = b.dataset.tc!; render(); });
    root.querySelectorAll<HTMLButtonElement>("[data-c]").forEach(b => b.onclick = () => {
      const c = b.dataset.c === "random" ? (Math.random() < .5 ? "w" : "b") : b.dataset.c as "w" | "b";
      cleanup = game(root, bot, c, go, back, testLevel, race, undefined, timed ? botTc : "none");
    });
  };
  render();
  return () => cleanup();
}

// DECISIONS #84: the clocks offered against a bot (untimed stays the default: it is the best way to learn)
const TCS: [string, number, number][] = [["none", 0, 0], ["10", 10, 0], ["5", 5, 0], ["3+2", 3, 2]];
let botTc = "none";

function game(root: HTMLElement, bot: Bot, me: "w" | "b", go: (h: string) => void, back: string, testLevel?: number, race?: number, startFen?: string, tc = "none"): () => void {
  const engine = getEngine(), g = startFen ? new Chess(startFen) : new Chess();
  const them: "w" | "b" = me === "w" ? "b" : "w";
  let busy = false, alive = true, over = false, timer = 0;
  // DECISIONS #84: a premove queued while the bot thinks, and the move being looked at (null = the live game)
  let pre: [Square, Square] | null = null, view: number | null = null;
  const tcDef = TCS.find(x => x[0] === tc);
  // the clock is charged from the side that moved first, so a game from a set position starts the right clock
  let clock: Clock | null = tcDef && tcDef[1] ? { ...newClock(tcDef[1], tcDef[2]), turn: g.turn() } : null;
  const help = bot.help && !clock;   // take-backs and hints would make a clock meaningless
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${tx(bot.name)} <small>~${num(bot.rating)}</small></h1></div>
    <div class="pbar" data-top></div>
    <div class="frame"><div class="boardwrap" data-board></div><div class="overcard" data-card hidden></div></div>
    <div class="pbar" data-bottom></div>
    <p class="gstate" data-state aria-live="polite"></p>
    <div class="moverow"><button class="iconbtn" data-prev aria-label="${t("movePrev")}">${icon("chevronLeft")}</button>
      <div class="movelist grow" data-moves></div>
      <button class="iconbtn" data-next aria-label="${t("moveNext")}">${icon("chevronRight")}</button></div>
    <div class="extra" data-extra></div>
    <div class="actions" data-acts>
      ${help ? `<button class="btn ghost" data-undo>${icon("again")} ${t("takeback")}</button>` : ""}
      ${help && !testLevel ? `<button class="btn ghost" data-hint>${icon("hint")} ${t("hint")}</button>` : ""}
      <button class="btn ghost" data-resign>${t("resign")}</button>
    </div></div>`;
  const board = new Board(root.querySelector("[data-board]")!, { flip: me === "b" });
  const extra = root.querySelector<HTMLElement>("[data-extra]")!;
  const stateEl = root.querySelector<HTMLElement>("[data-state]")!;
  const say = (html: string) => { stateEl.innerHTML = html; };
  const ctx = { board, extra, say: () => {}, status: () => {}, done: () => {} };

  /** The two player bars (DECISIONS #84, chess.com's layout): picture, name, what they have taken, the clock. */
  function bars() {
    const c = captured(g), now = Date.now();
    const caps = (by: "w" | "b") => c[by].map(p => `<span class="cp">${pieceHTML(`${by === "w" ? "b" : "w"}${p.toUpperCase()}` as PieceCode)}</span>`).join("");
    const lead = (side: "w" | "b") => { const l = side === "w" ? c.lead : -c.lead; return l > 0 ? `<span class="lead">+${num(l)}</span>` : ""; };
    const clk = (side: "w" | "b") => clock ? `<b class="clk ${clock.turn === side && clock.since !== null && !over ? "run" : ""} ${remaining(clock, side, now) < 20000 ? "low" : ""}">${fmt(remaining(clock, side, now))}</b>` : "";
    root.querySelector("[data-top]")!.innerHTML = `<span class="av">${art(bot, over ? (lastResult === "won" ? "lose" : lastResult === "lost" ? "win" : "neutral") : "neutral")}</span>
      <div class="grow"><b>${tx(bot.name)} <small>~${num(bot.rating)}</small></b><div class="caps">${caps(them)}${lead(them)}</div></div>${clk(them)}`;
    root.querySelector("[data-bottom]")!.innerHTML = `<span class="av">${avatarHTML(family.current())}</span>
      <div class="grow"><b>${t("you")}</b><div class="caps">${caps(me)}${lead(me)}</div></div>${clk(me)}`;
  }
  let lastResult: "won" | "lost" | "draw" | null = null;

  const show = (anim = false, arrows?: [Square, Square][]) => {
    const h = g.history({ verbose: true }), n = h.length, at = view ?? n;
    const p = positionAt(g, at);
    board.set(placementFromFen(p.fen), { lastMove: p.last, check: at === n ? checkSquare(g) : undefined, arrows, premove: pre ?? undefined },
      anim && view === null && p.last ? p.last : undefined);
    const list = root.querySelector<HTMLElement>("[data-moves]")!;
    const off = h[0]?.color === "b" ? 1 : 0;   // a game from a set position with Black to move numbers "1... e5"
    list.innerHTML = g.history().map((m, i) =>
      `${(i + off) % 2 ? "" : `<i>${num(Math.floor((i + off) / 2) + 1)}.</i>`}<button class="mv ${i === at - 1 && view !== null ? "on" : ""}" data-ply="${i + 1}">${m}</button>`).join(" ");
    list.querySelectorAll<HTMLButtonElement>("[data-ply]").forEach(b => b.onclick = () => look(+b.dataset.ply!));
    if (view === null) list.scrollLeft = 1e6; else list.querySelector(".mv.on")?.scrollIntoView({ block: "nearest", inline: "center" });
    root.querySelector<HTMLElement>("[data-board]")!.classList.toggle("past", view !== null);
    bars();
  };
  /** Step back through the game (chess.com's arrows under the board); the last move is the live game again. */
  const look = (n: number) => { const len = g.history().length; view = n >= len ? null : Math.max(0, n); show(); };
  // the capture race (Level 1 test): pieces taken by each side so far
  const taken = (by: "w" | "b") => g.history({ verbose: true }).filter(m => m.color === by && m.captured).length;
  const raceText = () => race ? ` <span class="race">${t("raceScore").replace("{a}", num(taken(me))).replace("{b}", num(taken(them))).replace("{n}", num(race)).replace("{bot}", tx(bot.name))}</span>` : "";
  const turnText = () => say((g.inCheck() ? `<b class="warn">${t("inCheckNow")}</b>` : `<b>${t("yourMove")}</b>`) + raceText());
  const tick = () => { if (clock) clock = press(clock, Date.now()); };

  async function reply() {
    busy = true; say(fill(t("botThinking"), bot));
    await wait(350);                                     // a beat, so the bot never answers instantly
    const legal = g.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));
    // if the engine fails (a worker crash, low memory on an old phone) the bot still answers with a legal move,
    // rather than leaving the game "thinking" for ever with your pieces locked
    let mv: string;
    try { mv = await botMove(await engine, g.fen(), legal, bot, Math.random, g.history()); }
    catch { mv = legal[Math.floor(Math.random() * legal.length)]; }
    if (!alive || over) return;   // resigned, out of time, or left while the bot was thinking: its move must not land
    g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] }); tick();
    const queued = pre; pre = null;
    busy = false; show(true);   // not busy BEFORE drawing, so your pieces are drawn as pick-up-able
    if (checkEnd()) return;
    turnText();
    // the premove plays at once if it is still legal (promoting to a queen, as premoves do); otherwise it is dropped
    if (queued && view === null && movesFor(g, queued[0], queued[1]).length) { await wait(120); if (alive && !over && !busy) await play(queued[0], queued[1], "q"); }
  }

  async function play(from: Square, to: Square, promo?: string) {
    const legal = movesFor(g, from, to);
    if (!legal.length) { board.shake(to); say(refusal(g.fen(), from, to)); return; }
    busy = true;
    const pr = legal[0].promotion ? promo ?? await promotion(ctx, me) : undefined;
    if (over) return;   // the clock ran out while the promotion choice was open
    g.move({ from: legal[0].from, to: legal[0].to, promotion: pr }); tick(); show(true);
    if (!checkEnd()) await reply();
  }

  /** Ends the game if it is over. `flag` = the side whose time ran out. */
  function checkEnd(resigned = false, flag?: "w" | "b"): boolean {
    if (over) return true;
    const raceWon = !!race && taken(me) >= race, raceLost = !!race && taken(them) >= race;
    if (!resigned && !flag && !g.isGameOver() && !raceWon && !raceLost) return false;
    over = true; clearInterval(timer);
    // out of time loses, unless the other side has only its king: it could never mate, so it is a draw
    const canMate = (side: "w" | "b") => g.board().flat().some(p => p && p.color === side && p.type !== "k");
    const flagDraw = !!flag && !canMate(flag === "w" ? "b" : "w");
    const won = !resigned && !flagDraw && ((g.isCheckmate() && g.turn() !== me) || (!g.isCheckmate() && raceWon) || flag === them);
    const lost = !won && !flagDraw && (resigned || (g.isCheckmate() && g.turn() === me) || raceLost || flag === me);
    const how = resigned ? t("byResign") : flag ? t("byTime") : g.isCheckmate() ? t("byMate") : raceWon || raceLost ? t("byRace").replace("{n}", num(race!)) : g.isStalemate() ? t("byStalemate") : t("byRule");
    store.recordGame(bot.id, won, bot.rating, won ? 1 : lost ? 0 : 0.5, clock ? tc : "none");
    if (won && testLevel) store.recordTest(testLevel, 1, true);
    lastResult = won ? "won" : lost ? "lost" : "draw";
    saveGame({ at: new Date().toISOString(), opp: bot.name, oppRating: bot.rating, me, result: lastResult, tc: clock ? tc : undefined, uci: uciOf(), startFen });
    setTimeout(() => alive && result(lastResult!, how), 600);
    return true;
  }
  const uciOf = () => g.history({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));

  /** The result as a card over the final position (DECISIONS #84); closing it leaves the same buttons below the board. */
  function result(r: "won" | "lost" | "draw", how: string) {
    view = null; pre = null; show(); say("");
    if (r === "won") sound.complete();
    // Game Review straight after the game (DECISIONS #73); the game is also kept in Your games (Me tab)
    setLastGame({ uci: uciOf(), me, botName: bot.name, back: location.hash.split("?")[0], startFen });
    const buttons = `${g.history().length >= 2 ? `<button class="btn wide gold" data-review>${icon("target")} ${t("reviewTitle")}</button>` : ""}
      <div class="two"><button class="btn ghost" data-again>${t("rematch")}</button><button class="btn ghost" data-other>${testLevel ? t("backHome") : t("newBot")}</button></div>
      <button class="linkbtn" data-pgn>${t("copyPgn")}</button><div data-pgnbox></div>`;
    const card = root.querySelector<HTMLElement>("[data-card]")!;
    card.innerHTML = `<button class="iconbtn x" data-x aria-label="${t("close")}">${icon("close")}</button>
      ${art(bot, r === "won" ? "lose" : r === "lost" ? "win" : "neutral")}
      <h2>${r === "won" ? t("gameWon") : r === "lost" ? fill(t("gameLost"), bot) : t("gameDrawn")}</h2><p>${how} · ${num(Math.ceil(g.history().length / 2))} ${t("movesWord")}</p>
      ${r === "won" && testLevel ? `<p class="testmsg">${t("botTestPassed")}</p>` : ""}${buttons}`;
    card.hidden = false;
    root.querySelector<HTMLElement>("[data-acts]")!.innerHTML = `<div class="resultacts">${buttons}</div>`;
    root.querySelector<HTMLElement>("[data-acts]")!.hidden = true;
    if (r === "won") confetti(root.querySelector(".screen")!);
    root.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(b => b.onclick = () => go("#/review"));
    root.querySelectorAll<HTMLButtonElement>("[data-again]").forEach(b => b.onclick = () => go(`${location.hash.split("?")[0]}?${Date.now()}`));
    root.querySelectorAll<HTMLButtonElement>("[data-other]").forEach(b => b.onclick = () => go(back));
    root.querySelectorAll<HTMLButtonElement>("[data-pgn]").forEach(b => b.onclick = () => {
      const you = t("you"), name = tx(bot.name), res = r === "draw" ? "1/2-1/2" : (r === "won") === (me === "w") ? "1-0" : "0-1";
      void copyText(pgnOf(uciOf(), me === "w" ? you : name, me === "w" ? name : you, res, startFen), b.nextElementSibling as HTMLElement);
    });
    card.querySelector<HTMLButtonElement>("[data-x]")!.onclick = () => { card.hidden = true; root.querySelector<HTMLElement>("[data-acts]")!.hidden = false; };
  }

  board.interact({
    canPick: s => {
      if (over) return t("playAgain");
      if (view !== null) return t("viewingPast");
      const p = g.get(s as CjSquare), mine = p && p.color === me;
      if (busy) return mine && premovesOn() ? true : fill(t("botThinking"), bot);
      return mine ? true : t("whyNotYours");
    },
    targets: s => (busy ? premoveTargets(g.fen(), s) : g.moves({ square: s as CjSquare, verbose: true }).map(m => m.to)),
    // a tap off your pieces: back to the live game if looking at an old move, and it cancels a premove
    onTap: () => { if (over) return; if (view !== null) look(Infinity); else if (pre) { pre = null; show(); } },
    onMove: async (from, to) => {
      if (over) return;
      if (view !== null) return look(Infinity);
      if (busy) { if (premovesOn()) { pre = [from, to]; board.mark({ premove: pre }); } return; }
      await play(from, to);
    },
  });
  root.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => look((view ?? g.history().length) - 1);
  root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => look((view ?? g.history().length) + 1);
  root.querySelector<HTMLButtonElement>("[data-undo]")?.addEventListener("click", () => {
    if (busy || over || g.history().length < (me === "w" ? 2 : 3)) return;
    view = null; pre = null;
    g.undo(); g.undo(); show(); turnText();              // the bot's reply and your move
  });
  root.querySelector<HTMLButtonElement>("[data-hint]")?.addEventListener("click", async () => {
    if (busy || over) return;
    view = null; busy = true; say(t("engineThinking"));
    const a = await (await engine).analyse(g.fen(), { depth: 10 }); if (!alive) return;
    busy = false; show(false, [[a.best.slice(0, 2) as Square, a.best.slice(2, 4) as Square]]); turnText();
  });
  root.querySelector<HTMLButtonElement>("[data-resign]")!.onclick = () => { if (!over && confirm(t("resignConfirm"))) checkEnd(true); };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => {
    if (over || !g.history().length || confirm(t("leaveGame"))) go(back);
  };
  if (clock) timer = window.setInterval(() => {
    if (over || !clock || !alive) return;
    const f = flagged(clock, Date.now());
    if (f) { checkEnd(false, f); bars(); } else bars();
  }, 100);

  function teardown() { alive = false; over = true; clearInterval(timer); board.destroy(); }
  show();
  if (g.turn() !== me) void reply(); else turnText();
  return teardown;
}
