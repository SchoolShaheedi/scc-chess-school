// Play a bot (DECISIONS #69): the bot list, the colour choice, a full game, and the result.
// Takebacks and a hint arrow only against the first three bots. A game started from the Level 1 test
// records the test as passed when the learner wins (DECISIONS #53, #69).
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { confetti } from "../celebrate";
import { getEngine } from "../engine/browser";
import type { Uci } from "../engine/uci";
import { movesN, num, t, tx } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { captured, flagOutcome, movesFor, positionAt, premoveTargets, premovesOn, promotion } from "../play/gamekit";
import { type Clock, flagged, fmt, newClock, press, remaining } from "../play/clock";
import { saveGame } from "../play/history";
import { OFFLINE_APP } from "../native";
import { shareButton, wireShare } from "../play/share";
import { announceEnd, END_PAUSE, kindOf } from "../play/gameover";
import { gameMenuButton, wireGameMenu } from "../play/gamesettings";
import { pieceHTML } from "../chess/pieces";
import type { PieceCode } from "../chess/types";
import { myAvatarHTML } from "../me/family";
import { sound } from "../sound";
import { store } from "../store";
import { tabbar } from "../tabbar";
import { setLastGame } from "../review/screen";
import { copyText, pgnOf } from "../play/pgn";
import { type Bot, BOTS, botMove, nextOpponent } from "./bots";
import { goodMove, hanging } from "./gamecoach";
import { findTrap } from "./traps";
import { courseOpening } from "../content/course";
import { commentary, type Threat } from "./commentary";
import { coachHTML, type Mood } from "../coach";
import { ask } from "../ui/dialog";

const art = (b: Bot, mood: "neutral" | "win" | "lose") => `<img class="botart" src="${b.art ?? `art/bots/${b.id}`}-${mood}.webp" alt="">`;
const fill = (s: string, b: Bot) => s.replace("{bot}", tx(b.name));
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function botList(root: HTMLElement, go: (h: string) => void) {
  // DECISIONS #94 (trial A): one big "your next opponent" card, the other bots as a row of faces, and the other
  // ways to play folded into one row of chips
  const s = store.get(), young = s.look === "young";
  const next = nextOpponent(s.rating.r, s.stats.botWins);
  const beaten = (b: Bot) => s.stats.botWins[b.id] > 0;
  const chip = (attr: string, ic: Parameters<typeof icon>[0], label: string) => `<button class="waychip" ${attr}>${icon(ic)}<span>${label}</span></button>`;
  root.innerHTML = `<div class="screen tabbed">
    <div class="lessonbar"><button class="iconbtn" data-home aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("tabPlay")}</h1></div>
    <div class="oppcard">
      ${art(next, "neutral")}
      <small class="oppkick">${t("nextOpponent")}</small>
      <h2>${tx(next.name)} <small>~${num(next.rating)}</small></h2>
      <p>${tx(next.about)}</p>
      <button class="btn gold wide" data-bot="${next.id}">${icon("play")} ${t("playNow")}</button>
    </div>
    ${young ? "" : `<p class="note">${t("ratingLabel")}: <b>${num(s.rating.r)}</b></p>`}
    <button class="playcard coachcard" data-coachplay><span class="rushicon">${icon("hint")}</span>
      <span class="grow"><b>${t("playCoachTitle")}</b><small>${t("playCoachSub")}</small></span>${icon("arrowRight")}</button>
    <button class="playcard powercard" data-power><span class="orbgem card"><img class="gp" src="art/pieces/cburnett/wQ.svg" alt=""></span>
      <span class="grow"><b>${t("powerTitle")}</b><small>${t("powerCardSub")}</small></span>${icon("arrowRight")}</button>
    <h2 class="sec">${t("allBots")}</h2>
    <div class="botfaces">${BOTS.map(b => `<button class="botface ${b.id === next.id ? "on" : ""} ${beaten(b) ? "won" : ""}" data-bot="${b.id}"
      aria-label="${tx(b.name)} ~${num(b.rating)}${beaten(b) ? `, ${t("beatenWord")}` : ""}">${art(b, beaten(b) ? "lose" : "neutral")}
      ${beaten(b) ? `<i class="tick">${icon("check")}</i>` : ""}<span>${tx(b.name)}</span><small>~${num(b.rating)}</small></button>`).join("")}</div>
    <h2 class="sec">${t("otherWays")}</h2>
    <div class="ways">
      ${OFFLINE_APP ? "" : chip("data-online", "users", t("onlineTitle"))}
      ${chip("data-friend", "swords", t("friendTitle"))}
      ${young ? "" : chip("data-tourney", "trophy", t("tnTitle"))}
      ${chip("data-analysis", "search", t("anaTitle"))}
      ${chip("data-master", "book", t("mgTitle"))}
    </div></div>${tabbar("play")}`;
  root.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => go("#/");
  root.querySelectorAll<HTMLButtonElement>("[data-bot]").forEach(b => b.onclick = () => go(`#/play/${b.dataset.bot}`));
  root.querySelector<HTMLButtonElement>("[data-friend]")!.onclick = () => go("#/play/friend");
  root.querySelector<HTMLButtonElement>("[data-online]")?.addEventListener("click", () => go("#/online"));
  root.querySelector<HTMLButtonElement>("[data-tourney]")?.addEventListener("click", () => go("#/tourney"));
  root.querySelector<HTMLButtonElement>("[data-analysis]")!.onclick = () => go("#/analysis");
  root.querySelector<HTMLButtonElement>("[data-master]")!.onclick = () => go("#/master");
  root.querySelector<HTMLButtonElement>("[data-power]")!.onclick = () => go("#/power");
  root.querySelector<HTMLButtonElement>("[data-coachplay]")!.onclick = () => go(`#/play/${next.id}/coach`);
}

/** Play a bot from any position (the analysis board's "Play from here"): you take the side to move. */
export function playFrom(root: HTMLElement, bot: Bot, fen: string, go: (h: string) => void): () => void {
  return game(root, bot, new Chess(fen).turn(), go, "#/analysis", undefined, undefined, fen);
}

/** Colour choice (and a clock), then the game. `testLevel` = this game is that level's test. */
export function playBot(root: HTMLElement, bot: Bot, go: (h: string) => void, testLevel?: number, race?: number, coachMode = false): () => void {
  let cleanup = () => {};
  const back = testLevel ? "#/" : "#/play";
  const timed = !testLevel && !race && !coachMode;   // a level test and a coached game are always untimed
  const render = () => {
    root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${testLevel ? fill(t("botTestTitle"), bot) : coachMode ? t("playCoachTitle") : tx(bot.name)}</h1></div>
    <div class="botintro">${art(bot, "neutral")}<h2>${tx(bot.name)} <small>~${num(bot.rating)}</small></h2><p>${tx(bot.about)}</p>
      ${race ? `<p class="raceline">${icon("target")} ${t("raceRule").replace("{n}", num(race)).replace("{bot}", tx(bot.name))}</p>` : ""}
      ${coachMode ? `<p class="helpline">${icon("ok")} ${t("playCoachSub")}</p><p class="note">${t("coachModeNote")}</p>` : `<p class="helpline">${icon(bot.help ? "ok" : "lock")} ${t(bot.help && testLevel ? "helpTest" : bot.help ? "helpOn" : "helpOff")}</p>`}</div>
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
      cleanup = game(root, bot, c, go, back, testLevel, race, undefined, timed ? botTc : "none", coachMode);
    });
  };
  render();
  return () => cleanup();
}

// DECISIONS #84: the clocks offered against a bot (untimed stays the default: it is the best way to learn)
const TCS: [string, number, number][] = [["none", 0, 0], ["10", 10, 0], ["5", 5, 0], ["3+2", 3, 2]];
let botTc = "none";

/** A level's boss, round 3 (DECISIONS #109): a real game against the hero, as White, no take-backs, unrated. */
export function playBoss(root: HTMLElement, bot: Bot, go: (h: string) => void, back: string, onDone: (r: "won" | "lost" | "draw") => void): () => void {
  return game(root, bot, "w", go, back, undefined, undefined, undefined, "none", false, onDone);
}

function game(root: HTMLElement, bot: Bot, me: "w" | "b", go: (h: string) => void, back: string, testLevel?: number, race?: number, startFen?: string, tc = "none", coachMode = false,
  bossDone?: (r: "won" | "lost" | "draw") => void): () => void {
  const engine = getEngine(), g = startFen ? new Chess(startFen) : new Chess();
  const them: "w" | "b" = me === "w" ? "b" : "w";
  let busy = false, alive = true, over = false, timer = 0;
  // DECISIONS #84: a premove queued while the bot thinks, and the move being looked at (null = the live game)
  let pre: [Square, Square] | null = null, view: number | null = null;
  // Insights (DECISIONS #113): your thinking time per move, by ply; your turn starts when the bot's move lands
  const times: (number | null)[] = [];
  let turnAt = Date.now();
  // a game with a take-back or a hint, or a capture race, doesn't move the playing rating (full check 2026-10-08)
  // a game with the coach explaining every move (DECISIONS #108) is unrated, like one with take-backs
  let helped = coachMode;
  const tcDef = TCS.find(x => x[0] === tc);
  // the clock is charged from the side that moved first, so a game from a set position starts the right clock
  let clock: Clock | null = tcDef && tcDef[1] ? { ...newClock(tcDef[1], tcDef[2]), turn: g.turn() } : null;
  const help = bot.help && !clock;   // take-backs and hints would make a clock meaningless
  // DECISIONS #94: no coach for the 16+ look, unless they asked for one (Play vs Coach, #108)
  const lookOf = store.get().look, coached = lookOf !== "adult" || coachMode;
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${tx(bot.name)} <small>~${num(bot.rating)}</small></h1></div>
    <div class="pbar" data-top></div>
    <div class="frame"><div class="boardwrap" data-board></div><div class="overcard" data-card hidden></div></div>
    <div class="pbar" data-bottom></div>
    ${coached ? `<div class="coach gcoach"><div class="av" data-cav></div><div class="bubble" data-csay aria-live="polite"></div></div>` : ""}
    ${coachMode ? `<div class="coachbtns"><button class="btn ghost" data-cshow>${t("coachShow")}</button><button class="btn ghost" data-cquiet>${t("coachQuiet")}</button></div>` : ""}
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
  const board = new Board(root.querySelector("[data-board]")!, { flip: me === "b", game: true });
  root.querySelector(".screen")?.classList.add("gamescreen");   // DECISIONS #110 (look C): games are black and gold
  root.querySelector<HTMLElement>(".screen")!.dataset.botgame = "1";   // DECISIONS #128: the wide panel's tabs are for this game only
  if (startFen) root.querySelector<HTMLElement>(".screen")!.dataset.setpos = "1";   // its moves do not start from the usual position
  root.querySelector(".lessonbar")!.insertAdjacentHTML("beforeend", gameMenuButton());   // DECISIONS #115
  wireGameMenu(root, board, coachMode);
  const extra = root.querySelector<HTMLElement>("[data-extra]")!;
  const stateEl = root.querySelector<HTMLElement>("[data-state]")!;
  const say = (html: string) => { stateEl.innerHTML = html; };
  /** The coach speaks (key moments only); `null` lets the bubble go quiet again, keeping its space. */
  const coach = (text: string | null, mood: Mood = "happy", cls = "", html = false) => {
    if (!coached) return;
    const b = root.querySelector<HTMLElement>("[data-csay]")!;
    root.querySelector<HTMLElement>("[data-cav]")!.innerHTML = coachHTML(lookOf, text ? mood : "neutral");
    b.className = `bubble ${text ? cls : "quiet"}`;
    if (html) b.innerHTML = text ?? ""; else b.textContent = text ?? "";
  };
  // Play vs Coach (DECISIONS #108): the threat (red arrow) and the idea (green arrow, on request) for the live position
  let threatArrow: [Square, Square][] = [], ideaArrow: [Square, Square][] = [], showIdea = false, quiet = false, said = -1;
  const pcName = (type: string) => t(`pc${type.toUpperCase()}` as Parameters<typeof t>[0]);
  const ctx = { board, extra, say: () => {}, status: () => {}, done: () => {} };

  /** The two player bars (DECISIONS #84, chess.com's layout): picture, name, what they have taken, the clock. */
  function bars() {
    const c = captured(g), now = Date.now();
    const caps = (by: "w" | "b") => c[by].map(p => `<span class="cp">${pieceHTML(`${by === "w" ? "b" : "w"}${p.toUpperCase()}` as PieceCode)}</span>`).join("");
    const lead = (side: "w" | "b") => { const l = side === "w" ? c.lead : -c.lead; return l > 0 ? `<span class="lead">+${num(l)}</span>` : ""; };
    const clk = (side: "w" | "b") => clock ? `<b class="clk ${clock.turn === side && clock.since !== null && !over ? "run" : ""} ${remaining(clock, side, now) < 20000 ? "low" : ""}">${fmt(remaining(clock, side, now))}</b>` : "";
    root.querySelector("[data-top]")!.innerHTML = `<span class="av">${art(bot, over ? (lastResult === "won" ? "lose" : lastResult === "lost" ? "win" : "neutral") : "neutral")}</span>
      <div class="grow"><b>${tx(bot.name)} <small>~${num(bot.rating)}</small></b><div class="caps">${caps(them)}${lead(them)}</div></div>${clk(them)}`;
    root.querySelector("[data-bottom]")!.innerHTML = `<span class="av">${myAvatarHTML()}</span>
      <div class="grow"><b>${t("you")}</b><div class="caps">${caps(me)}${lead(me)}</div></div>${clk(me)}`;
  }
  let lastResult: "won" | "lost" | "draw" | null = null;

  const show = (anim = false, arrows?: [Square, Square][]) => {
    const h = g.history({ verbose: true }), n = h.length, at = view ?? n;
    const p = positionAt(g, at);
    const live = view === null && coachMode && !over;
    board.set(placementFromFen(p.fen), { lastMove: p.last, check: at === n ? checkSquare(g) : undefined, premove: pre ?? undefined,
      arrows: arrows ?? (live && showIdea ? ideaArrow : undefined), threats: live && !quiet ? threatArrow : undefined },
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

  /** Trap alert (DECISIONS #133 d): once per kind per game, in the first 20 plies, never giving the move. Only with
   *  a coach on screen: not the Young look (too much text), not focus mode, not Play vs Coach (it has its own words),
   *  not a set position, a boss or a race. */
  const trapSaid = new Set<string>();
  function trapAlert() {
    const s = store.get();
    if (!coached || lookOf === "young" || s.focusMode || coachMode || startFen || bossDone || race || over) return;
    const studied = (id: string) => (s.rep.course?.[id] ?? []).includes("win");
    const hit = findTrap(g.fen(), me, g.history().length, studied);
    if (!hit || trapSaid.has(hit.kind)) return;
    const o = courseOpening(hit.openingId); if (!o) return;
    trapSaid.add(hit.kind);
    coach(t(hit.kind === "walkin" ? "trapWalkin" : "trapBot").replace("{name}", tx(o.name)), hit.kind === "walkin" ? "think" : "cheer", hit.kind === "walkin" ? "no" : "ok");
  }

  async function reply() {
    busy = true; say(fill(t("botThinking"), bot));
    await wait(700);   // DECISIONS #110: your move lands (0.35s) and rests a moment before the bot answers
    const legal = g.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));
    // if the engine fails (a worker crash, low memory on an old phone) the bot still answers with a legal move,
    // rather than leaving the game "thinking" for ever with your pieces locked
    let mv: string;
    try { mv = await botMove(await engine, g.fen(), legal, bot, Math.random, g.history()); }
    catch { mv = legal[Math.floor(Math.random() * legal.length)]; }
    if (!alive || over) return;   // resigned, out of time, or left while the bot was thinking: its move must not land
    g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] }); tick(); turnAt = Date.now();
    const queued = pre; pre = null;
    busy = false; show(true);   // not busy BEFORE drawing, so your pieces are drawn as pick-up-able
    if (checkEnd()) return;
    turnText();
    trapAlert();
    void explain();
    // the premove plays at once if it is still legal (promoting to a queen, as premoves do); otherwise it is dropped
    if (queued && view === null && movesFor(g, queued[0], queued[1]).length) { await wait(120); if (alive && !over && !busy) await play(queued[0], queued[1], "q"); }
  }

  async function play(from: Square, to: Square, promo?: string) {
    const legal = movesFor(g, from, to);
    if (!legal.length) { board.shake(to); say(refusal(g.fen(), from, to)); return; }
    busy = true;
    const pr = legal[0].promotion ? promo ?? await promotion(ctx, me) : undefined;
    if (over) return;   // the clock ran out while the promotion choice was open
    const before = new Set(hanging(g.fen(), me).map(h => h.sq));
    times[g.history().length] = Date.now() - turnAt;
    const m = g.move({ from: legal[0].from, to: legal[0].to, promotion: pr }); tick(); show(true);
    if (!g.isGameOver()) {
      // a newly hanging piece outranks praise: warn only where a take-back is on, and never in a level test
      const fresh = help && !testLevel ? hanging(g.fen(), me).find(h => !before.has(h.sq) || h.sq === m.to) : undefined;
      if (fresh) coach(t("gcHang").replace("{piece}", pcName(fresh.type)).replace("{sq}", fresh.sq), "oops", "no");
      else if (goodMove(m)) coach(m.san.includes("+") ? t("gcCheck") : t("gcTake").replace("{piece}", pcName(m.captured!)), "cheer", "ok");
      else coach(null);
    }
    if (!checkEnd()) await reply();
  }

  /** Play vs Coach: on your turn, the threat and the idea in one bubble, from facts (src/bots/commentary.ts). */
  async function explain() {
    if (!coachMode || quiet || over || g.turn() !== me) return;
    const ply = g.history().length;
    if (said === ply) return;
    said = ply; threatArrow = []; ideaArrow = []; showIdea = false;
    const showBtn = root.querySelector<HTMLButtonElement>("[data-cshow]")!;
    showBtn.textContent = t("coachShow"); showBtn.disabled = true;   // nothing to show until the coach has looked
    coach(t("coachLooking"), "think");
    let c;
    try { c = await commentary(await engine, g.fen(), ply); } catch { showBtn.disabled = false; return; }
    showBtn.disabled = false;
    if (!alive || over || g.history().length !== ply || quiet) return;   // you moved, or the game ended, while it looked
    const th: Threat = c.threat;
    const threatText = th.kind === "check" ? t("thrCheck") : th.kind === "mate" ? t("thrMate")
      : th.kind === "take" ? t("thrTake").replace("{piece}", pcName(th.piece)).replace("{sq}", th.sq) : t("thrNone");
    threatArrow = th.kind === "take" ? [[th.from, th.sq]] : th.kind === "check" || th.kind === "mate" ? [[th.from, th.to]] : [];
    if (c.idea) ideaArrow = [[c.idea.from, c.idea.to]];
    const ideaText = c.idea ? t(`idea_${c.idea.kind}` as Parameters<typeof t>[0]) : "";
    const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    coach(`${th.kind === "none" ? esc(threatText) : `<b class="warn">${esc(threatText)}</b>`} ${ideaText ? `<b class="idea">${esc(ideaText)}</b>` : ""}`,
      th.kind === "none" ? "happy" : "think", "", true);
    show();
  }

  /** Ends the game if it is over. `flag` = the side whose time ran out. */
  function checkEnd(resigned = false, flag?: "w" | "b"): boolean {
    if (over) return true;
    const raceWon = !!race && taken(me) >= race, raceLost = !!race && taken(them) >= race;
    if (!resigned && !flag && !g.isGameOver() && !raceWon && !raceLost) return false;
    over = true; clearInterval(timer);
    // out of time loses, unless the other side has only its king: it could never mate, so it is a draw
    const flagDraw = !!flag && flagOutcome(g, flag) === "draw";
    const won = !resigned && !flagDraw && ((g.isCheckmate() && g.turn() !== me) || (!g.isCheckmate() && raceWon) || flag === them);
    const lost = !won && !flagDraw && (resigned || (g.isCheckmate() && g.turn() === me) || raceLost || flag === me);
    const how = resigned ? t("byResign") : flag ? t("byTime") : g.isCheckmate() ? t("byMate") : raceWon || raceLost ? t("byRace").replace("{n}", num(race!)) : g.isStalemate() ? t("byStalemate") : t("byRule");
    // a boss game is the hero's, not a bot's: it counts as practice, never as a bot win or for the rating
    if (bossDone) store.recordPractice();
    else store.recordGame(bot.id, won, helped || race ? undefined : bot.rating, won ? 1 : lost ? 0 : 0.5, clock ? tc : "none");
    if (won && testLevel) store.recordTest(testLevel, 1, true);
    lastResult = won ? "won" : lost ? "lost" : "draw";
    bossDone?.(lastResult);
    coach(t(won ? "gcWon" : lost ? "gcLost" : "gcDraw"), won ? "cheer" : lost ? "think" : "happy", won ? "ok" : "");
    saveGame({ at: new Date().toISOString(), opp: bot.name, oppRating: bot.rating, me, result: lastResult, tc: clock ? tc : undefined, uci: uciOf(), startFen,
      ms: uciOf().map((_, i) => times[i] ?? null) });
    // DECISIONS #117: the badges and the banner on the board first, then the result card
    announceEnd(board, kindOf(how, lastResult === "draw"), won ? them : lost ? me : null);
    setTimeout(() => alive && result(lastResult!, how), END_PAUSE);
    return true;
  }
  const uciOf = () => g.history({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));

  /** The result as a card over the final position (DECISIONS #84); closing it leaves the same buttons below the board. */
  function result(r: "won" | "lost" | "draw", how: string) {
    view = null; pre = null; show(); say("");
    if (r === "won") sound.complete();
    // Game Review straight after the game (DECISIONS #73); the game is also kept in Your games (Me tab)
    setLastGame({ uci: uciOf(), me, botName: bot.name, oppRating: bot.rating, back: location.hash.split("?")[0], startFen });
    const buttons = `${g.history().length >= 2 ? `<button class="btn wide gold" data-review>${icon("target")} ${t("reviewTitle")}</button>` : ""}
      <div class="two"><button class="btn ghost" data-again>${t("rematch")}</button><button class="btn ghost" data-other>${bossDone ? t("bossBack") : testLevel ? t("backHome") : t("newBot")}</button></div>
      ${g.history().length >= 2 ? shareButton() : ""}<button class="linkbtn" data-pgn>${t("copyPgn")}</button><div data-pgnbox></div>`;
    const card = root.querySelector<HTMLElement>("[data-card]")!;
    card.innerHTML = `<button class="iconbtn x" data-x aria-label="${t("close")}">${icon("close")}</button>
      ${art(bot, r === "won" ? "lose" : r === "lost" ? "win" : "neutral")}
      <h2>${r === "won" ? t("gameWon") : r === "lost" ? fill(t("gameLost"), bot) : t("gameDrawn")}</h2><p>${how} · ${movesN(Math.ceil(g.history().length / 2))}</p>
      ${r === "won" && testLevel ? `<p class="testmsg">${t("botTestPassed")}</p>` : ""}${buttons}`;
    card.hidden = false;
    root.querySelector<HTMLElement>("[data-acts]")!.innerHTML = `<div class="resultacts">${buttons}</div>`;
    root.querySelector<HTMLElement>("[data-acts]")!.hidden = true;
    if (r === "won") confetti(root.querySelector(".screen")!);
    root.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(b => b.onclick = () => go("#/review"));
    // DECISIONS #115: the final position as a picture, with the learner's animal and no names
    wireShare(root, () => { const last = g.history({ verbose: true }).at(-1);
      return { pos: placementFromFen(g.fen()), lastMove: last ? [last.from, last.to] : undefined, flip: me === "b", result: r, how, opp: bot.name, moves: Math.ceil(g.history().length / 2) }; });
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
    confirmable: () => !busy && !over && view === null,
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
    view = null; pre = null; helped = true;
    g.undo(); g.undo(); times.length = g.history().length; turnAt = Date.now(); show(); turnText(); void explain();   // the bot's reply and your move
  });
  root.querySelector<HTMLButtonElement>("[data-hint]")?.addEventListener("click", async () => {
    if (busy || over) return;
    view = null; busy = true; helped = true; say(t("engineThinking"));
    // the hint must never lock the game: a failed or stopped engine just gives no arrow (DECISIONS #128)
    let a: Awaited<ReturnType<Uci["analyse"]>> | null = null;
    try { a = await (await engine).analyse(g.fen(), { depth: 10 }); } catch { /* no hint this time */ } finally { busy = false; }
    if (!alive || over) return;
    show(false, a && a.best.length >= 4 ? [[a.best.slice(0, 2) as Square, a.best.slice(2, 4) as Square]] : undefined); turnText();
  });
  root.querySelector<HTMLButtonElement>("[data-resign]")!.onclick = () => { if (!over) void ask(t("resignConfirm"), { yes: t("resign"), no: t("keepPlaying"), danger: true }).then(ok => { if (ok && !over && alive) checkEnd(true); }); };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => {
    if (over || !g.history().length) go(back); else void ask(t("leaveGame"), { yes: t("leave"), no: t("keepPlaying"), danger: true }).then(ok => { if (ok) go(back); });
  };
  if (clock) timer = window.setInterval(() => {
    if (over || !clock || !alive) return;
    const f = flagged(clock, Date.now());
    if (f) { checkEnd(false, f); bars(); } else bars();
  }, 100);

  function teardown() { alive = false; over = true; clearInterval(timer); board.destroy(); }
  show();
  if (!startFen) coach(t("gcStart"));
  else coach(null);
  if (coachMode) {
    root.querySelector(".screen")!.classList.add("coachmode");
    const showBtn = root.querySelector<HTMLButtonElement>("[data-cshow]")!, quietBtn = root.querySelector<HTMLButtonElement>("[data-cquiet]")!;
    showBtn.onclick = () => { showIdea = !showIdea; showBtn.textContent = t(showIdea ? "coachHide" : "coachShow"); show(); };
    quietBtn.onclick = () => {
      quiet = !quiet; quietBtn.textContent = t(quiet ? "coachTalk" : "coachQuiet");
      if (quiet) { coach(null); show(); } else { said = -1; void explain(); }
    };
  }
  if (g.turn() !== me) void reply(); else { turnText(); void explain(); }
  return teardown;
}
