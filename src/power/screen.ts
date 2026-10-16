// Magical Chess · ਜਾਦੂਈ ਸ਼ਤਰੰਜ against a bot (DECISIONS #98–#101). Look A: gold gems with the piece inside. When
// your piece lands on a gem, a bubble at the piece asks at once: change into the gem's piece, or stay? The gem is
// used up either way, and changing is part of the move, like a promotion. The arrows under the board step back
// through the game. Unrated: it never moves the playing rating, but it counts as practice for the streak.
import { Chess, type Move, type Square } from "chess.js";
import { Board } from "../chess/board";
import { gameMenuButton, wireGameMenu } from "../play/gamesettings";
import { placementFromFen } from "../chess/types";
import { confetti } from "../celebrate";
import { getEngine } from "../engine/browser";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { checkSquare } from "../lesson/exercises";
import { movesFor, promotion } from "../play/gamekit";
import { sound } from "../sound";
import { store } from "../store";
import { type Bot, BOTS, botById, nextOpponent } from "../bots/bots";
import { botPowerAction } from "./bot";
import { afterMove, gemFor, newPower, type Orb, type OrbPiece, type PowerState } from "./rules";

// in Magical Chess the bots appear as their superhero versions (DECISIONS #109); a boss brings its own hero's art
const art = (b: Bot, mood: "neutral" | "win" | "lose") => `<img class="botart" src="${b.art ?? `art/herobots/${b.id}`}-${mood}.webp" alt="">`;
const fill = (s: string, b: Bot) => s.replace("{bot}", tx(b.name));
const gemPiece = (p: OrbPiece) => `<img class="gp" src="art/pieces/cburnett/w${p.toUpperCase()}.svg" alt="" draggable="false">`;
const pieceWord = (p: string) => t(`pc${p.toUpperCase()}` as Parameters<typeof t>[0]);
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Choose the bot and a colour. `botId` preselects a bot (the next opponent otherwise). */
export function powerSetup(root: HTMLElement, go: (h: string) => void, botId?: string): () => void {
  const s = store.get();
  let bot = (botId && botById(botId)) || nextOpponent(s.rating.r, s.stats.botWins);
  let cleanup = () => {};
  const render = () => {
    root.innerHTML = `<div class="screen">
      <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
        <h1 class="grow">${t("powerTitle")}</h1></div>
      <div class="powerintro"><span class="orbgem big">${gemPiece("q")}</span>
        <ol><li>${t("powerRule1")}</li><li>${t("powerRule2")}</li><li>${t("powerRule3")}</li></ol></div>
      <h2 class="sec">${t("powerOpponent")}</h2>
      <div class="botfaces">${BOTS.map(b => `<button class="botface ${b.id === bot.id ? "on" : ""}" data-bot="${b.id}" aria-pressed="${b.id === bot.id}"
        aria-label="${tx(b.name)} ~${num(b.rating)}">${art(b, "neutral")}<span>${tx(b.name)}</span><small>~${num(b.rating)}</small></button>`).join("")}</div>
      <h2 class="sec">${t("chooseColour")}</h2>
      <div class="seg colours" role="group">${(["w", "random", "b"] as const).map(c =>
        `<button data-c="${c}"><span class="kingdot ${c}"></span>${t(c === "w" ? "colourWhite" : c === "b" ? "colourBlack" : "colourRandom")}</button>`).join("")}</div>
      <p class="note">${t("powerUnrated")}</p>
    </div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
    root.querySelectorAll<HTMLButtonElement>("[data-bot]").forEach(b => b.onclick = () => { bot = botById(b.dataset.bot!)!; render(); });
    root.querySelectorAll<HTMLButtonElement>("[data-c]").forEach(b => b.onclick = () => {
      const c = b.dataset.c === "random" ? (Math.random() < .5 ? "w" : "b") : b.dataset.c as "w" | "b";
      cleanup = powerGame(root, bot, c, go);
    });
  };
  render();
  return () => cleanup();
}

/** One position in the game, kept so the arrows can step back through it (gems included). */
interface Snap { fen: string; orbs: Orb[]; last?: [Square, Square] }

/** A level's boss, round 2 (DECISIONS #109): Magical Chess against the hero, as White. */
export function powerBoss(root: HTMLElement, bot: Bot, go: (h: string) => void, back: string, onDone: (r: "won" | "lost" | "draw") => void): () => void {
  return powerGame(root, bot, "w", go, { back, onDone });
}

interface BossHooks { back: string; onDone: (r: "won" | "lost" | "draw") => void }

function powerGame(root: HTMLElement, bot: Bot, me: "w" | "b", go: (h: string) => void, boss?: BossHooks): () => void {
  const engine = getEngine();
  let st: PowerState = newPower((Math.random() * 2 ** 32) >>> 0);
  let busy = false, alive = true, over = false;
  const snaps: Snap[] = [{ fen: st.fen, orbs: st.orbs }];
  let view: number | null = null;     // the position being looked at (null = the live game)
  const moves: string[] = [];          // the move list; a change is shown as "Nf5=R✨"
  const sans: string[] = [];           // plain chess history for the bot's opening book (cleared once anyone changes)
  let changedOnce = false;
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("powerTitle")} · ${tx(bot.name)}</h1></div>
    <div class="pbar"><span class="av">${art(bot, "neutral")}</span><div class="grow"><b>${tx(bot.name)} <small>~${num(bot.rating)}</small></b></div></div>
    <div class="frame"><div class="boardwrap powerwrap" data-board><div class="usebubble" data-use hidden></div></div><div class="overcard" data-card hidden></div></div>
    <p class="gstate" data-state aria-live="polite"></p>
    <div class="moverow"><button class="iconbtn" data-prev aria-label="${t("movePrev")}">${icon("chevronLeft")}</button>
      <div class="movelist grow" data-moves></div>
      <button class="iconbtn" data-next aria-label="${t("moveNext")}">${icon("chevronRight")}</button></div>
    <div class="actions" data-acts><button class="btn ghost" data-resign>${t("resign")}</button></div></div>`;
  const wrap = root.querySelector<HTMLElement>("[data-board]")!, bubble = root.querySelector<HTMLElement>("[data-use]")!;
  const board = new Board(wrap, { flip: me === "b", game: true });
  root.querySelector(".screen")?.classList.add("gamescreen");   // DECISIONS #110 (look C): games are black and gold
  root.querySelector(".lessonbar")!.insertAdjacentHTML("beforeend", gameMenuButton());   // DECISIONS #115
  wireGameMenu(root, board);
  const stateEl = root.querySelector<HTMLElement>("[data-state]")!;
  const say = (html: string) => { stateEl.innerHTML = html; };
  const ctx = { board, extra: root.querySelector<HTMLElement>("[data-moves]")!, say: () => {}, status: () => {}, done: () => {} };

  const decor = (orbs: Orb[]) => Object.fromEntries(orbs.map(o => [o.sq, `<span class="orbgem">${gemPiece(o.piece)}</span>`]));
  function show(anim?: [Square, Square]) {
    const at = view ?? snaps.length - 1, sn = snaps[at];
    board.set(placementFromFen(sn.fen), { lastMove: sn.last, check: at === snaps.length - 1 ? checkSquare(new Chess(sn.fen)) : undefined, decor: decor(sn.orbs) },
      view === null ? anim : undefined);
    wrap.classList.toggle("past", view !== null);
    const list = root.querySelector<HTMLElement>("[data-moves]")!;
    list.innerHTML = moves.map((m, i) => `${i % 2 ? "" : `<i>${num(i / 2 + 1)}.</i>`}<button class="mv ${view !== null && i === at - 1 ? "on" : ""}" data-ply="${i + 1}">${m}</button>`).join(" ");
    list.querySelectorAll<HTMLButtonElement>("[data-ply]").forEach(b => b.onclick = () => look(+b.dataset.ply!));
    if (view === null) list.scrollLeft = 1e6; else list.querySelector(".mv.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }
  /** Step through the game; the last position is the live game again. */
  function look(n: number) {
    view = n >= snaps.length - 1 ? null : Math.max(0, n);
    show();
    if (view !== null) say(`<span class="muted">${t("viewingPast")}</span>`); else if (!over && !busy) turnText();
  }
  /** The gold burst of a change: added once to the square, not part of the board's marks, so a redraw never replays it. */
  function burstAt(sq: Square) {
    const cell = wrap.querySelector<HTMLElement>(`[data-sq="${sq}"]`);
    if (!cell) return;
    const b = document.createElement("span"); b.className = "tburst"; cell.appendChild(b);
    setTimeout(() => b.remove(), 1000);
  }
  const turnText = () => { const g = new Chess(st.fen); say(g.inCheck() ? `<b class="warn">${t("inCheckNow")}</b>` : `<b>${t("yourMove")}</b>`); };

  /** The choice, asked the moment your piece lands on a gem: change into the gem's piece, or stay as it is. */
  function askChange(sq: Square, from: string, to: OrbPiece): Promise<boolean> {
    return new Promise(resolve => {
      bubble.innerHTML = `<span>${t("powerBecome").replace("{orb}", pieceWord(to))}<small>${t("powerOnce")}</small></span>
        <div class="ubtns"><button data-yes>✨ ${t("powerYes")}</button><button class="stay" data-no>${t("powerStay").replace("{piece}", pieceWord(from))}</button></div>`;
      bubble.hidden = false;
      const cell = wrap.querySelector<HTMLElement>(`[data-sq="${sq}"]`)!, wr = wrap.getBoundingClientRect(), cr = cell.getBoundingClientRect();
      // centred on the square but kept inside the board (its tail still points at the square); below the square,
      // since pieces move up the screen, unless the square is on the bottom row
      const cx = cr.left - wr.left + cr.width / 2, half = bubble.offsetWidth / 2;
      const x = Math.min(Math.max(cx, half + 4), wr.width - half - 4);
      const below = cr.bottom - wr.top < wr.height - cr.height / 2;
      bubble.style.left = `${x}px`;
      bubble.style.setProperty("--tail", `${cx - x}px`);
      bubble.style.top = below ? `${cr.bottom - wr.top + 6}px` : "";
      bubble.style.bottom = below ? "" : `${wr.bottom - cr.top + 6}px`;
      bubble.classList.toggle("below", below);
      const done = (yes: boolean) => { bubble.hidden = true; resolve(yes); };
      bubble.querySelector<HTMLButtonElement>("[data-yes]")!.onclick = () => done(true);
      bubble.querySelector<HTMLButtonElement>("[data-no]")!.onclick = () => done(false);
    });
  }

  /** A move (and its gem choice) joins the game: the record, the move list, the burst, and a line about the bot's choice. */
  function land(m: Move, fenAfter: string, change: boolean, mine: boolean): string | undefined {
    const gem = gemFor(st, m), changed = change && !!gem;
    st = afterMove(st, m, fenAfter, change);
    if (changed) changedOnce = true; else sans.push(m.san);
    const g = new Chess(st.fen);
    const san = changed ? `${m.san.replace(/[+#]$/, "")}=${gem!.piece.toUpperCase()}${g.isCheckmate() ? "#" : g.inCheck() ? "+" : ""}✨` : m.san;
    snaps.push({ fen: st.fen, orbs: st.orbs, last: [m.from, m.to] }); moves.push(san);
    view = null; show([m.from, m.to]);
    if (changed) { burstAt(m.to); sound.correct(); }
    if (!gem || mine) return;
    return (changed ? t("powerBotChanged") : t("powerBotStayed")).replace("{bot}", tx(bot.name)).replace("{piece}", pieceWord(m.piece)).replace("{orb}", pieceWord(gem.piece));
  }

  async function play(from: Square, to: Square) {
    const g = new Chess(st.fen), legal = movesFor(g, from, to);
    if (!legal.length) { board.shake(to); return; }
    busy = true;
    const pr = legal[0].promotion ? await promotion(ctx, me) : undefined;
    if (over) return;
    const m = g.move({ from, to, promotion: pr }), gem = gemFor(st, m);
    let change = false;
    if (gem) {
      // the piece stands on its gem while the choice is open
      board.set(placementFromFen(g.fen()), { lastMove: [from, to], decor: decor(st.orbs) }, [from, to]);
      say(`<b>${t("powerChoose")}</b>`);
      change = await askChange(m.to, m.piece, gem.piece);
      if (!alive) return;
    }
    land(m, g.fen(), change, true);
    if (checkEnd()) return;
    await reply();
  }

  async function reply() {
    busy = true; say(fill(t("botThinking"), bot));
    await wait(700);   // DECISIONS #110: let your move land before the bot answers
    let act;
    try { act = await botPowerAction(await engine, st, bot, Math.random, changedOnce ? [] : sans); }
    catch { const l = new Chess(st.fen).moves({ verbose: true }); const m = l[Math.floor(Math.random() * l.length)]; act = { uci: m.from + m.to + (m.promotion ?? ""), change: false }; }
    if (!alive || over) return;
    const g = new Chess(st.fen), m = g.move({ from: act.uci.slice(0, 2), to: act.uci.slice(2, 4), promotion: act.uci[4] });
    busy = false;
    const msg = land(m, g.fen(), act.change, false);
    if (checkEnd()) return;
    turnText();
    if (msg) say(`${msg} · ${stateEl.innerHTML}`);
  }

  function checkEnd(resigned = false): boolean {
    const g = new Chess(st.fen);
    if (!resigned && !g.isGameOver()) return false;
    over = true; bubble.hidden = true;
    const won = !resigned && g.isCheckmate() && g.turn() !== me;
    const lost = resigned || (g.isCheckmate() && g.turn() === me);
    store.recordPractice();   // unrated (DECISIONS #98): practice for the streak, never the rating
    setTimeout(() => { if (alive) result(won ? "won" : lost ? "lost" : "draw"); }, 600);
    return true;
  }
  function result(r: "won" | "lost" | "draw") {
    view = null; show();
    if (r === "won") { sound.complete(); confetti(root.querySelector(".screen")!); }
    boss?.onDone(r);
    const again = () => go(boss ? `${location.hash.split("?")[0]}?${Date.now()}` : `#/power/${bot.id}?${Date.now()}`), back = () => go(boss?.back ?? "#/play");
    const card = root.querySelector<HTMLElement>("[data-card]")!;
    card.innerHTML = `<button class="iconbtn x" data-x aria-label="${t("close")}">${icon("close")}</button>
      ${art(bot, r === "won" ? "lose" : r === "lost" ? "win" : "neutral")}
      <h2>${r === "won" ? t("gameWon") : r === "lost" ? fill(t("gameLost"), bot) : t("gameDrawn")}</h2>
      <div class="two"><button class="btn gold" data-again>${t("rematch")}</button><button class="btn ghost" data-other>${t(boss ? "bossBack" : "backToPlay")}</button></div>`;
    card.hidden = false; say("");
    card.querySelector<HTMLButtonElement>("[data-again]")!.onclick = again;
    card.querySelector<HTMLButtonElement>("[data-other]")!.onclick = back;
    // closing the card leaves the final position and the arrows, to look back through the game
    card.querySelector<HTMLButtonElement>("[data-x]")!.onclick = () => {
      card.hidden = true;
      const acts = root.querySelector<HTMLElement>("[data-acts]")!;
      acts.innerHTML = `<button class="btn gold" data-again>${t("rematch")}</button><button class="btn ghost" data-other>${t(boss ? "bossBack" : "backToPlay")}</button>`;
      acts.querySelector<HTMLButtonElement>("[data-again]")!.onclick = again;
      acts.querySelector<HTMLButtonElement>("[data-other]")!.onclick = back;
    };
  }

  board.interact({
    canPick: s => {
      if (over) return t("playAgain");
      if (view !== null) return t("viewingPast");
      const g = new Chess(st.fen), p = g.get(s as Square);
      if (busy) return fill(t("botThinking"), bot);
      return p && p.color === me && g.turn() === me ? true : t("whyNotYours");
    },
    targets: s => new Chess(st.fen).moves({ square: s as Square, verbose: true }).map(m => m.to),
    confirmable: () => !busy && !over && view === null,
    // a tap while looking at an old move goes back to the live game
    onTap: () => { if (view !== null) look(Infinity); },
    onMove: async (from, to) => {
      if (view !== null) return look(Infinity);
      if (!over && !busy) await play(from as Square, to as Square);
    },
  });
  root.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => look((view ?? snaps.length - 1) - 1);
  root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => look((view ?? snaps.length - 1) + 1);
  root.querySelector<HTMLButtonElement>("[data-resign]")!.onclick = () => { if (!over && confirm(t("resignConfirm"))) checkEnd(true); };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => { if (over || !moves.length || confirm(t("leaveGame"))) go(boss?.back ?? "#/play"); };

  show();
  if (me === "b") void reply(); else turnText();
  return () => { alive = false; over = true; board.destroy(); };
}
