// Live games with friends and classmates (DECISIONS #86): the parent's switch (behind a grown-up question), the
// lobby (my friend code, add a friend, who I can play, challenges), and the live game itself. Players are shown only
// as their animal and colour; there is no chat, only four fixed reactions.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { pieceHTML } from "../chess/pieces";
import { placementFromFen, type PieceCode } from "../chess/types";
import { confetti } from "../celebrate";
import { family } from "../family";
import { num, t } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { avatarHTML } from "../me/family";
import { captured, movesFor, positionAt, promotion } from "../play/gamekit";
import { fmt } from "../play/clock";
import { saveGame } from "../play/history";
import { shareButton, wireShare } from "../play/share";
import { gameMenuButton, wireGameMenu } from "../play/gamesettings";
import { setLastGame } from "../review/screen";
import { sound } from "../sound";
import {
  activeGames, addFriend, adultLadder, answerChallenge, blockPlayer, enableOnlineAdult, findGame, gamePlayers, stopSeeking, cancelChallenge, challenges, claimTime, disableOnline, enableOnline, type Game, gameAction,
  answerFriend, friendRequests, getGame, type Me, myPlayer, newFriendCode, opponents, type Opponent, REACTIONS, removeFriend, sendChallenge, sendMove, signedIn, watchChallenges, watchGame,
} from "./api";

type Go = (h: string) => void;
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const reactionText = (code: string) => t(`react_${code}` as "react_gl");
const tcLabel = (tc: string) => tc === "none" ? t("clockNone") : tc.includes("+") ? tc.split("+").map(n => num(+n)).join(" + ") : `${num(+tc)} ${t("minutes")}`;

// ---------- the parent's switch, on the family screen ----------
/** A grown-up question before online play is switched on: a times-table sum a young child is unlikely to know. */
export function parentGate(box: HTMLElement, onPass: () => void, onCancel: () => void) {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  box.innerHTML = `<div class="parentcard">${icon("shield")}<div><b>${t("gateTitle")}</b><small>${t("gateAsk").replace("{a}", num(a)).replace("{b}", num(b))}</small>
    <form class="gateform"><input inputmode="numeric" maxlength="3" required aria-label="${t("gateTitle")}"><button class="btn" type="submit">${t("next")}</button></form>
    <button class="linkbtn" data-cancel>${t("cancel")}</button><small class="err" data-err></small></div></div>`;
  box.querySelector<HTMLFormElement>("form")!.onsubmit = e => {
    e.preventDefault();
    const v = box.querySelector<HTMLInputElement>("input")!.value.replace(/[੦-੯]/g, d => String("੦੧੨੩੪੫੬੭੮੯".indexOf(d)));
    if (+v === a * b) onPass(); else box.querySelector("[data-err]")!.textContent = t("gateWrong");
  };
  box.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = onCancel;
}

/** On the family screen: online play for the child using the app now. Off until a parent turns it on. */
export async function onlineBlock(box: HTMLElement) {
  const me = await myPlayer();
  const draw = () => {
    box.innerHTML = `<h2 class="sec">${icon("swords")} ${t("onlineTitle")}</h2>
      ${me ? `<div class="li"><span class="grow"><b>${t("onlineOn")}</b><small>${t("onlineCode")}: <b class="codetxt">${me.friend_code}</b></small></span></div>
        <div class="actions"><button class="btn ghost" data-newcode>${t("onlineNewCode")}</button><button class="danger" data-off>${t("onlineTurnOff")}</button></div>`
      : `<p class="note">${t("onlineAboutParent")}</p><button class="btn wide" data-on>${t("onlineTurnOn")}</button>
        ${family.current().look === "adult" ? `<p class="note">${t("adultAbout")}</p><button class="btn ghost wide" data-adult>${icon("users")} ${t("adultTurnOn")}</button>` : ""}`}
      ${me?.adult ? `<p class="note">${t("adultIsOn")}</p>` : ""}
      <div data-gate></div>`;
    box.querySelector<HTMLButtonElement>("[data-adult]")?.addEventListener("click", () =>
      parentGate(box.querySelector("[data-gate]")!, () => declare(box.querySelector("[data-gate]")!, async () => {
        const e = await enableOnlineAdult(); if (e) alert(e); void onlineBlock(box);
      }, () => draw()), () => draw()));
    box.querySelector<HTMLButtonElement>("[data-on]")?.addEventListener("click", () =>
      parentGate(box.querySelector("[data-gate]")!, async () => { const e = await enableOnline(); if (e) alert(e); void onlineBlock(box); }, () => draw()));
    box.querySelector<HTMLButtonElement>("[data-off]")?.addEventListener("click", async () => {
      if (me && confirm(t("onlineOffConfirm"))) { await disableOnline(me.id); void onlineBlock(box); }
    });
    box.querySelector<HTMLButtonElement>("[data-newcode]")?.addEventListener("click", async () => {
      if (me && confirm(t("onlineNewCodeConfirm"))) { await newFriendCode(me.id); void onlineBlock(box); }
    });
  };
  draw();
}

/** The grown-up's declaration (DECISIONS #87): this profile is the account holder's own, and they are 18 or older. */
function declare(box: HTMLElement, onYes: () => void, onCancel: () => void) {
  box.innerHTML = `<div class="parentcard">${icon("shield")}<div><b>${t("adultDeclareTitle")}</b>
    <label class="declare"><input type="checkbox" data-yes> ${t("adultDeclare")}</label>
    <div class="actions"><button class="btn" data-go disabled>${t("adultTurnOn")}</button><button class="linkbtn" data-cancel>${t("cancel")}</button></div></div></div>`;
  const yes = box.querySelector<HTMLInputElement>("[data-yes]")!, goBtn = box.querySelector<HTMLButtonElement>("[data-go]")!;
  yes.onchange = () => { goBtn.disabled = !yes.checked; };
  goBtn.onclick = onYes;
  box.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = onCancel;
}

// ---------- 18+: automatic pairing with strangers (DECISIONS #87) ----------
const CATEGORY: Record<string, "rapid" | "blitz"> = { "10": "rapid", "5": "blitz", "3+2": "blitz" };
let adultTc = "10";
/** Pick a clock, press Play, and be paired with another grown-up near your rating. The grown-up question is asked
 *  again every time this opens, because children use the same phone. */
function strangers(box: HTMLElement, me: Me, go: Go, alive: () => boolean) {
  let passed = false, seeking = false, poll = 0;
  const stop = () => { seeking = false; clearInterval(poll); void stopSeeking(me.id); };
  const rating = (tc: string) => num(CATEGORY[tc] === "rapid" ? me.rapid_r : me.blitz_r);
  const draw = (msg = "") => {
    if (!alive()) return stop();
    box.innerHTML = seeking
      ? `<div class="seekcard"><span class="spinner" aria-hidden="true"></span><b>${t("adultSeeking").replace("{r}", rating(adultTc))}</b>
          <small>${tcLabel(adultTc)} · ${t(CATEGORY[adultTc] === "rapid" ? "adultRapid" : "adultBlitz")}</small><button class="btn ghost" data-stop>${t("cancel")}</button></div>`
      : `<p class="note">${t("adultPlayNote")}</p>
        <div class="tcgrid">${["10", "5", "3+2"].map(x => `<button data-atc="${x}" aria-pressed="${adultTc === x}"><b>${tcLabel(x)}</b>
          <small>${t(CATEGORY[x] === "rapid" ? "adultRapid" : "adultBlitz")} · ${rating(x)}</small></button>`).join("")}</div>
        <button class="btn wide" data-play>${icon("play")} ${t("adultPlay")}</button><p class="note err">${msg}</p><div data-gate></div>`;
    box.querySelectorAll<HTMLButtonElement>("[data-atc]").forEach(b => b.onclick = () => { adultTc = b.dataset.atc!; draw(); });
    box.querySelector<HTMLButtonElement>("[data-stop]")?.addEventListener("click", () => { stop(); draw(); });
    box.querySelector<HTMLButtonElement>("[data-play]")?.addEventListener("click", () => {
      const start = () => { passed = true; seeking = true; draw(); void tick(); poll = window.setInterval(() => void tick(), 8000); };
      if (passed) start(); else parentGate(box.querySelector("[data-gate]")!, start, () => draw());
    });
  };
  const tick = async () => {
    if (!seeking) return;
    if (!alive()) return stop();
    const r = await findGame(me.id, adultTc);
    if (!seeking) return;
    if (r.error) { stop(); return draw(r.error); }
    if (r.game) { seeking = false; clearInterval(poll); go(`#/online/game/${r.game}`); }
  };
  // leaving the lobby while waiting takes you out of the pool
  window.addEventListener("hashchange", () => { if (seeking) stop(); }, { once: true });
  draw();
}

// ---------- the lobby ----------
let tc = "10", colour = "random";
export function onlineLobby(root: HTMLElement, go: Go): () => void {
  let alive = true, unwatch: (() => void) | null = null;
  const leave = () => { alive = false; unwatch?.(); };
  root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
  if (!signedIn()) {
    root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}<div class="parentcard">${icon("shield")}<div><b>${t("onlineNeedsAccount")}</b><small>${t("onlineNeedsAccountNote")}</small></div></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
    return leave;
  }
  void (async () => {
    const me = await myPlayer(); if (!alive) return;
    if (!me) {
      root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}<div class="hero">${avatarHTML(family.current(), "big")}</div>
        <div class="parentcard">${icon("shield")}<div><b>${t("onlineOffTitle")}</b><small>${t("onlineAboutParent")}</small></div></div>
        <div class="actions"><button class="btn wide" data-family>${t("famTitle")}</button></div></div>`;
      root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
      root.querySelector<HTMLButtonElement>("[data-family]")!.onclick = () => go("#/family");
      return;
    }
    const render = async () => {
      const [opps, chs, games, reqs] = await Promise.all([opponents(me.id), challenges(me.id), activeGames(me.id), friendRequests(me.id)]);
      if (!alive) return;
      const who = new Map(opps.map(o => [o.player, o]));
      const face = (id: string) => avatarHTML(who.get(id) ?? { avatar: "cat", colour: "#9AA39E" });
      const incoming = chs.filter(c => c.to_player === me.id), outgoing = chs.filter(c => c.from_player === me.id);
      root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}
        <div class="li"><span>${avatarHTML(family.current(), "")}</span><span class="grow"><small>${t("onlineCode")}</small><b class="codetxt big">${me.friend_code}</b></span></div>
        <p class="note">${t("onlineCodeNote")}</p>
        ${games.length ? `<h2 class="sec">${t("onlineYourGames")}</h2>${games.map(g => `<button class="botcard" data-game="${g.id}">${face(g.white === me.id ? g.black : g.white)}
          <span class="grow"><b>${t("onlineGameOn")}</b><small>${tcLabel(g.tc_min ? (g.tc_inc ? `${g.tc_min}+${g.tc_inc}` : String(g.tc_min)) : "none")}</small></span>${icon("arrowRight")}</button>`).join("")}` : ""}
        ${reqs.length ? `<h2 class="sec">${t("onlineFriendRequests")}</h2><p class="note">${t("onlineFriendRequestsNote")}</p>${reqs.map(r => `<div class="botcard">${avatarHTML(r)}
          <span class="grow"><b>${t("onlineWantsFriend")}</b></span>
          <button class="btn" data-befriend="${r.player}">${t("onlineAccept")}</button><button class="btn ghost" data-refuse="${r.player}">${t("onlineDecline")}</button></div>`).join("")}` : ""}
        ${incoming.length ? `<h2 class="sec">${t("onlineIncoming")}</h2>${incoming.map(c => `<div class="botcard">${face(c.from_player)}
          <span class="grow"><b>${t("onlineWantsToPlay")}</b><small>${tcLabel(c.tc)}</small></span>
          <button class="btn" data-accept="${c.id}">${t("onlineAccept")}</button><button class="btn ghost" data-decline="${c.id}">${t("onlineDecline")}</button></div>`).join("")}` : ""}
        ${outgoing.length ? `<h2 class="sec">${t("onlineWaiting")}</h2>${outgoing.map(c => `<div class="botcard">${face(c.to_player)}
          <span class="grow"><b>${t("onlineWaitingFor")}</b><small>${tcLabel(c.tc)}</small></span><button class="btn ghost" data-cancel="${c.id}">${t("cancel")}</button></div>`).join("")}` : ""}
        ${me.adult ? `<h2 class="sec">${t("adultPlayTitle")}</h2><div data-strangers></div>
          <button class="btn ghost wide" data-ladder>${icon("trophy")} ${t("ladderTitle")}</button>` : ""}
        <h2 class="sec">${t("onlinePlayWho")}</h2>
        <div class="seg tcs" role="group">${["none", "10", "5", "3+2"].map(x => `<button data-tc="${x}" aria-pressed="${tc === x}">${tcLabel(x)}</button>`).join("")}</div>
        <div class="seg colours" role="group">${(["w", "random", "b"] as const).map(c => `<button data-c="${c}" aria-pressed="${colour === c}"><span class="kingdot ${c}"></span>${t(c === "w" ? "colourWhite" : c === "b" ? "colourBlack" : "colourRandom")}</button>`).join("")}</div>
        ${opps.length ? `<div class="botlist">${opps.map((o: Opponent) => `<div class="botcard">${avatarHTML(o)}
          <span class="grow"><b>${o.friend ? t("onlineFriend") : t("onlineClassmate")}</b><small>${o.friend && o.classmate ? t("onlineBoth") : ""}</small></span>
          <button class="btn" data-challenge="${o.player}" ${outgoing.some(c => c.to_player === o.player) ? "disabled" : ""}>${t("onlineChallenge")}</button>
          ${o.friend ? `<button class="iconbtn" data-unfriend="${o.player}" aria-label="${t("onlineUnfriend")}">${icon("trash")}</button>` : ""}</div>`).join("")}</div>`
          : `<p class="note">${t("onlineNobody")}</p>`}
        <form class="emailform" data-add><label class="note" for="fc">${t("onlineAddFriend")}</label>
          <input id="fc" maxlength="6" autocapitalize="characters" autocomplete="off" required placeholder="ABC234" class="codein">
          <button class="btn wide" type="submit">${icon("plus")} ${t("onlineAdd")}</button></form><p class="note err" data-err></p>
        <p class="note">${t("onlineSafety")}</p></div>`;
      root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
      const errBox = root.querySelector<HTMLElement>("[data-err]")!;
      const sbox = root.querySelector<HTMLElement>("[data-strangers]"); if (sbox) strangers(sbox, me, go, () => alive);
      root.querySelectorAll<HTMLButtonElement>("[data-tc]").forEach(b => b.onclick = () => { tc = b.dataset.tc!; void render(); });
      root.querySelector<HTMLButtonElement>("[data-ladder]")?.addEventListener("click", () => go("#/online/ladder"));
      root.querySelectorAll<HTMLButtonElement>("[data-c]").forEach(b => b.onclick = () => { colour = b.dataset.c!; void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(b => b.onclick = () => go(`#/online/game/${b.dataset.game}`));
      root.querySelectorAll<HTMLButtonElement>("[data-challenge]").forEach(b => b.onclick = async () => {
        const e = await sendChallenge(me.id, b.dataset.challenge!, tc, colour); if (e) errBox.textContent = e; else void render();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-accept]").forEach(b => b.onclick = async () => {
        const r = await answerChallenge(me.id, b.dataset.accept!, true);
        if (r.game) go(`#/online/game/${r.game}`); else { errBox.textContent = r.error ?? ""; void render(); }
      });
      root.querySelectorAll<HTMLButtonElement>("[data-decline]").forEach(b => b.onclick = async () => { await answerChallenge(me.id, b.dataset.decline!, false); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-cancel]").forEach(b => b.onclick = async () => { await cancelChallenge(me.id, b.dataset.cancel!); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-befriend]").forEach(b => b.onclick = async () => { await answerFriend(me.id, b.dataset.befriend!, true); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-refuse]").forEach(b => b.onclick = async () => { await answerFriend(me.id, b.dataset.refuse!, false); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-unfriend]").forEach(b => b.onclick = async () => { if (confirm(t("onlineUnfriendConfirm"))) { await removeFriend(me.id, b.dataset.unfriend!); void render(); } });
      root.querySelector<HTMLFormElement>("[data-add]")!.onsubmit = async e => {
        e.preventDefault();
        const r = await addFriend(me.id, root.querySelector<HTMLInputElement>("#fc")!.value);
        if (r === "sent") { await render(); root.querySelector<HTMLElement>("[data-err]")!.textContent = t("onlineRequestSent"); }
        else errBox.textContent = r === "no_code" ? t("onlineNoCode") : r === "own_code" ? t("onlineOwnCode") : r === "too_many" ? t("onlineTooMany") : r;
      };
    };
    await render();
    // a challenge accepted by the other side opens the game; anything else redraws the lobby
    unwatch = watchChallenges(me.id, async () => {
      const mine = (await activeGames(me.id)).at(-1);
      if (alive && mine && mine.moves.length === 0 && location.hash === "#/online") go(`#/online/game/${mine.id}`); else if (alive) void render();
    });
  })();
  return leave;
}

// ---------- the live game ----------
export function onlineGame(root: HTMLElement, id: string, go: Go): () => void {
  let alive = true, unwatch: (() => void) | null = null, timer = 0, watchdog = 0, board: Board | null = null, onVisible: (() => void) | null = null;
  const leave = () => { alive = false; unwatch?.(); clearInterval(timer); clearInterval(watchdog); if (onVisible) document.removeEventListener("visibilitychange", onVisible); board?.destroy(); };
  root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
  void (async () => {
    const [me, first] = await Promise.all([myPlayer(), getGame(id)]);
    if (!alive) return;
    if (!me || !first) return go("#/online");
    // alreadyOver: opened after the game ended (a reload, the back button): show the result, but don't save it, cheer
    // or add it to Your games a second time (full check 2026-10-08)
    let g: Game = first, busy = false, busySince = 0, view: number | null = null, ended = false, lastReactionAt = "";
    const alreadyOver = first.status === "finished";
    const mine: "w" | "b" = g.white === me.id ? "w" : "b", theirs: "w" | "b" = mine === "w" ? "b" : "w";
    // the other side as this player may see them: animal, colour, and (in a rated game) rating (DECISIONS #87)
    const sides = await gamePlayers(id);
    if (!alive) return;
    const oppSide = sides.find(x => x.side === theirs), mySide = sides.find(x => x.side === mine);
    const opp = { avatar: oppSide?.avatar ?? "cat", colour: oppSide?.colour ?? "#9AA39E" }, oppId = oppSide?.player ?? null;
    const rated = !!first.rated, ratingOf = (x?: { rating: number | null }) => (rated && x?.rating ? ` <small>~${num(x.rating)}</small>` : "");
    root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}
      <div class="pbar" data-top></div>
      <div class="frame"><div class="boardwrap" data-board></div><div class="overcard" data-card hidden></div></div>
      <div class="pbar" data-bottom></div>
      <p class="gstate" data-state aria-live="polite"></p>
      <div class="moverow"><button class="iconbtn" data-prev aria-label="${t("movePrev")}">${icon("chevronLeft")}</button>
        <div class="movelist grow" data-moves></div><button class="iconbtn" data-next aria-label="${t("moveNext")}">${icon("chevronRight")}</button></div>
      <div class="reactions" role="group" aria-label="${t("reactLabel")}">${REACTIONS.map(r => `<button class="pill" data-react="${r}">${reactionText(r)}</button>`).join("")}</div>
      <div class="extra" data-extra></div>
      <div class="actions" data-acts><button class="btn ghost" data-draw>${t("drawAgree")}</button><button class="btn ghost" data-resign>${t("resign")}</button></div></div>`;
    board = new Board(root.querySelector("[data-board]")!, { flip: mine === "b", game: true });
    root.querySelector(".lessonbar")!.insertAdjacentHTML("beforeend", gameMenuButton());   // DECISIONS #115
    wireGameMenu(root, board);
    root.querySelector(".screen")?.classList.add("gamescreen");   // DECISIONS #110 (look C): games are black and gold
    const extra = root.querySelector<HTMLElement>("[data-extra]")!, say = (h: string) => { root.querySelector("[data-state]")!.innerHTML = h; };
    const ctx = { board, extra, say: () => {}, status: () => {}, done: () => {} };
    const times: (number | null)[] = [];   // Insights (DECISIONS #113): thinking time per move, by ply
    const chess = () => { const c = new Chess(); for (const m of g.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); return c; };

    // the clocks come from the server; between updates the side to move counts down here
    const left = (side: "w" | "b") => {
      const base = side === "w" ? g.white_ms : g.black_ms, c = chess();
      return g.tc_min && g.status === "active" && g.turn_since && c.turn() === side ? Math.max(0, base - (Date.now() - Date.parse(g.turn_since))) : base;
    };
    function bars() {
      const c = chess(), cap = captured(c), turn = c.turn();
      const caps = (by: "w" | "b") => cap[by].map(p => `<span class="cp">${pieceHTML(`${by === "w" ? "b" : "w"}${p.toUpperCase()}` as PieceCode)}</span>`).join("")
        + ((by === "w" ? cap.lead : -cap.lead) > 0 ? `<span class="lead">+${num(Math.abs(cap.lead))}</span>` : "");
      const clk = (side: "w" | "b") => g.tc_min ? `<b class="clk ${turn === side && g.turn_since && g.status === "active" ? "run" : ""} ${left(side) < 20000 ? "low" : ""}">${fmt(left(side))}</b>` : "";
      root.querySelector("[data-top]")!.innerHTML = `<span class="av">${avatarHTML(opp)}</span><div class="grow"><b>${t("onlineOpponent")}${ratingOf(oppSide)}</b><div class="caps">${caps(theirs)}</div></div>${clk(theirs)}`;
      root.querySelector("[data-bottom]")!.innerHTML = `<span class="av">${avatarHTML(family.current())}</span><div class="grow"><b>${t("you")}${ratingOf(mySide)}</b><div class="caps">${caps(mine)}</div></div>${clk(mine)}`;
    }
    function show(anim = false) {
      const c = chess(), n = g.moves.length, at = view ?? n, p = positionAt(c, at);
      board!.set(placementFromFen(p.fen), { lastMove: p.last, check: at === n ? checkSquare(c) : undefined }, anim && view === null && p.last ? p.last : undefined);
      const list = root.querySelector<HTMLElement>("[data-moves]")!;
      list.innerHTML = c.history().map((m, i) => `${i % 2 ? "" : `<i>${num(i / 2 + 1)}.</i>`}<button class="mv ${i === at - 1 && view !== null ? "on" : ""}" data-ply="${i + 1}">${m}</button>`).join(" ");
      list.querySelectorAll<HTMLButtonElement>("[data-ply]").forEach(b => b.onclick = () => { view = +b.dataset.ply! >= n ? null : +b.dataset.ply!; show(); });
      if (view === null) list.scrollLeft = 1e6;
      bars();
      if (g.status === "active") {
        const yourTurn = c.turn() === mine;
        say(g.draw_offer && g.draw_offer !== me!.id ? `<b>${t("onlineDrawOffered")}</b> <button class="btn small" data-acceptdraw>${t("onlineAcceptDraw")}</button>`
          : `<b class="${c.inCheck() && yourTurn ? "warn" : ""}">${yourTurn ? (c.inCheck() ? t("inCheckNow") : t("yourMove")) : t("onlineTheirMove")}</b>`);
        root.querySelector<HTMLButtonElement>("[data-acceptdraw]")?.addEventListener("click", () => void gameAction(me!.id, g.id, "accept_draw"));
      }
    }
    function finish() {
      if (ended) return; ended = true; clearInterval(timer);
      const won = (g.result === "1-0") === (mine === "w") && g.result !== "1/2-1/2", draw = g.result === "1/2-1/2";
      const r: "won" | "lost" | "draw" = draw ? "draw" : won ? "won" : "lost";
      const how = t(`byOnline_${g.reason}` as "byOnline_mate");
      if (!alreadyOver) saveGame({ at: new Date().toISOString(), opp: { en: "Online friend", pa: "ਔਨਲਾਈਨ ਦੋਸਤ" }, me: mine, result: r, tc: g.tc_min ? (g.tc_inc ? `${g.tc_min}+${g.tc_inc}` : String(g.tc_min)) : undefined, uci: g.moves,
        ms: g.moves.map((_, i) => times[i] ?? null) });
      setLastGame({ uci: g.moves, me: mine, botName: { en: "Online friend", pa: "ਔਨਲਾਈਨ ਦੋਸਤ" }, back: "#/online" });
      if (r === "won" && !alreadyOver) { sound.complete(); confetti(root.querySelector(".screen")!); }
      const buttons = `${g.moves.length >= 2 ? `<button class="btn wide gold" data-review>${icon("target")} ${t("reviewTitle")}</button>` : ""}
        <button class="btn ghost wide" data-lobby>${t("onlineBackToLobby")}</button>
        ${g.moves.length >= 2 ? shareButton() : ""}
        ${rated && oppId ? `<button class="linkbtn" data-block>${t("adultBlock")}</button>` : ""}`;
      const card = root.querySelector<HTMLElement>("[data-card]")!;
      card.innerHTML = `<button class="iconbtn x" data-x aria-label="${t("close")}">${icon("close")}</button>${avatarHTML(opp, "big")}
        <h2>${r === "won" ? t("gameWon") : r === "lost" ? t("onlineLost") : t("gameDrawn")}</h2><p>${how}</p>${buttons}`;
      card.hidden = false;
      const acts = root.querySelector<HTMLElement>("[data-acts]")!; acts.innerHTML = `<div class="resultacts">${buttons}</div>`; acts.hidden = true;
      root.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(b => b.onclick = () => go("#/review"));
      root.querySelectorAll<HTMLButtonElement>("[data-lobby]").forEach(b => b.onclick = () => go("#/online"));
      wireShare(root, () => { const c = chess(), last = g.moves.at(-1);   // DECISIONS #115
        return { pos: placementFromFen(c.fen()), lastMove: last ? [last.slice(0, 2), last.slice(2, 4)] : undefined, flip: mine === "b", result: r, how, opp: { en: "Online friend", pa: "ਔਨਲਾਈਨ ਦੋਸਤ" }, moves: Math.ceil(g.moves.length / 2) }; });
      card.querySelector<HTMLButtonElement>("[data-x]")!.onclick = () => { card.hidden = true; acts.hidden = false; };
      root.querySelectorAll<HTMLButtonElement>("[data-block]").forEach(b => b.onclick = async () => {
        if (!oppId || !confirm(t("adultBlockConfirm"))) return;
        const e = await blockPlayer(me!.id, oppId);
        root.querySelectorAll<HTMLButtonElement>("[data-block]").forEach(x => { x.disabled = true; x.textContent = e ?? t("adultBlocked"); });
      });
      // a rated game: the new rating and the change, once the database has rated it
      if (rated) void gamePlayers(g.id).then(now => {
        const before = mine === "w" ? g.white_before : g.black_before, after = now.find(x => x.side === mine)?.rating;
        if (!alive || before == null || after == null) return;
        const d = after - before, p = card.querySelector("p");
        if (p) p.innerHTML += ` · ${t("adultRating")} ${num(after)} <b class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : "−"}${num(Math.abs(d))}</b>`;
      });
      say("");
    }
    const apply = (next: Game) => {
      const moved = next.moves.length !== g.moves.length;
      g = next; busy = false;
      if (moved) { view = null; show(true); } else show();
      // a reaction from the other player pops up for a moment
      if (g.reaction && g.reaction.by !== me!.id && g.reaction.at !== lastReactionAt) {
        lastReactionAt = g.reaction.at;
        const pop = document.createElement("div"); pop.className = "reactpop"; pop.textContent = reactionText(g.reaction.code);
        root.querySelector(".frame")!.appendChild(pop); setTimeout(() => pop.remove(), 2500);
      }
      if (g.status === "finished") finish();
    };
    board.interact({
      canPick: s => {
        if (g.status !== "active") return t("playAgain");
        if (view !== null) return t("viewingPast");
        const c = chess(), p = c.get(s as CjSquare);
        if (c.turn() !== mine || busy) return t("onlineTheirMove");
        return p && p.color === mine ? true : t("whyNotYours");
      },
      targets: s => chess().moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
      confirmable: () => !busy && view === null && g.status === "active",
      onTap: () => { if (view !== null) { view = null; show(); } },
      onMove: async (from, to) => {
        if (view !== null) { view = null; return show(); }
        const c = chess(); if (g.status !== "active" || c.turn() !== mine || busy) return;
        const legal = movesFor(c, from, to);
        if (!legal.length) { board!.shake(to); say(refusal(c.fen(), from, to)); return; }
        const pr = legal[0].promotion ? await promotion(ctx, mine) : undefined;
        const uci = legal[0].from + legal[0].to + (pr ?? "");
        if (g.turn_since) times[g.moves.length] = Math.max(0, Date.now() - Date.parse(g.turn_since));   // Insights (#113)
        // show it at once; the server's answer (by the live update) confirms it, or puts the board back
        busy = true; busySince = Date.now();
        const optimistic = { ...g, moves: [...g.moves, uci] };
        const before = g; g = optimistic; show(true);
        const e = await sendMove(g.id, me!.id, uci);
        if (e) { g = before; busy = false; show(); say(`<b class="warn">${e}</b>`); }
      },
    });
    root.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => { view = Math.max(0, (view ?? g.moves.length) - 1); show(); };
    root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { const n = (view ?? g.moves.length) + 1; view = n >= g.moves.length ? null : n; show(); };
    root.querySelectorAll<HTMLButtonElement>("[data-react]").forEach(b => b.onclick = () => { void gameAction(me.id, g.id, "react", b.dataset.react); b.classList.add("sent"); setTimeout(() => b.classList.remove("sent"), 800); });
    root.querySelector<HTMLButtonElement>("[data-draw]")!.onclick = () => { if (g.status === "active" && confirm(t("drawConfirm"))) void gameAction(me.id, g.id, "offer_draw"); };
    root.querySelector<HTMLButtonElement>("[data-resign]")!.onclick = () => { if (g.status === "active" && confirm(t("resignConfirm"))) void gameAction(me.id, g.id, "resign"); };
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
    unwatch = watchGame(g.id, apply);
    // the clock ticks here; when the OTHER side's time runs out, ask the server to end the game (it checks the time itself)
    let claimed = false;
    timer = window.setInterval(() => {
      if (!alive || g.status !== "active" || !g.tc_min) return;
      bars();
      const turn = chess().turn();
      if (turn === theirs && left(theirs) <= 0 && !claimed) { claimed = true; void claimTime(g.id, me.id).then(() => setTimeout(() => { claimed = false; }, 3000)); }
    }, 200);
    // safety net: if the live update for a move never arrives (a phone that slept, a dropped connection), fetch the game
    // ourselves rather than leave the board locked; the same when the app comes back to the front
    const resync = async () => { const x = await getGame(g.id); if (alive && x) apply(x); };
    watchdog = window.setInterval(() => { if (busy && Date.now() - busySince > 6000) void resync(); }, 3000);
    onVisible = () => { if (document.visibilityState === "visible") void resync(); };
    document.addEventListener("visibilitychange", onVisible);
    // catch up if an update arrived before the live channel opened (this also shows the result of a finished game, once)
    await resync();
    show();
    if (g.status === "finished") finish();
  })();
  return leave;
}

// ---------- the grown-up ladder (DECISIONS #89) ----------
let ladderCat: "rapid" | "blitz" = "rapid";
/** The top 50 grown-ups for a clock speed (at least 5 rated games), as animal + rating, and my own place. */
export function ladderScreen(root: HTMLElement, go: Go): () => void {
  let alive = true;
  const draw = async () => {
    root.innerHTML = `<div class="screen">${bar(t("ladderTitle"))}<p class="muted">${t("loading")}</p></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
    const me = await myPlayer();
    if (!alive) return;
    if (!me?.adult) return go("#/online");
    const rows = await adultLadder(me.id, ladderCat);
    if (!alive) return;
    root.innerHTML = `<div class="screen">${bar(t("ladderTitle"))}
      <div class="seg" role="group">${(["rapid", "blitz"] as const).map(c => `<button data-cat="${c}" aria-pressed="${ladderCat === c}">${t(c === "rapid" ? "adultRapid" : "adultBlitz")}</button>`).join("")}</div>
      <p class="muted">${t("ladderAbout")}</p>
      ${rows.length ? `<table class="boardtable"><tr><th></th><th></th><th>${t("ratingLabel")}</th><th>${t("ladderGames")}</th></tr>
        ${rows.map(r => `<tr class="${r.me ? "me" : ""}"><td class="n">${num(r.place)}</td><td>${avatarHTML(r)}${r.me ? ` <b>${t("you")}</b>` : ""}</td>
          <td class="n"><b>${num(r.rating)}</b></td><td class="n">${num(r.games)}</td></tr>`).join("")}</table>` : `<p class="note">${t("ladderEmpty")}</p>`}
      ${rows.some(r => r.me) ? "" : `<p class="note">${t("ladderNotYet")}</p>`}</div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
    root.querySelectorAll<HTMLButtonElement>("[data-cat]").forEach(b => b.onclick = () => { ladderCat = b.dataset.cat as "rapid" | "blitz"; void draw(); });
  };
  void draw();
  return () => { alive = false; };
}
