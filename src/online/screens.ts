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
import { announceEnd, END_PAUSE, endBadges } from "../play/gameover";
import { gameMenuButton, wireGameMenu } from "../play/gamesettings";
import { setLastGame } from "../review/screen";
import { magicalLine } from "../power/online";
import { gemFor } from "../power/rules";
import { askChange, burstAt, gemDecor } from "../power/ui";
import { sound } from "../sound";
import { ask, tell } from "../ui/dialog";
import {
  activeGames, addFriend, adultLadder, answerChallenge, answerRematch, blockPlayer, cancelRematch, clockSkew, enableOnlineAdult, gamePlayers, cancelChallenge, challenges, claimTime, disableOnline, enableOnline, type Game, gameAction,
  answerFriend, friendRequests, getGame, myPlayer, newFriendCode, opponents, type Opponent, primeLag, REACTIONS, removeFriend, rematchFor, requestRematch, sendChallenge, sendMove, signedIn, watchChallenges, watchGame, watchRematch,
  MAGICAL_ONLINE, type Rematch, type Variant, watchNewGames,
} from "./api";
import { CATEGORIES, type Category } from "./matching";
import { deltaText } from "./glicko";
import { catName } from "./play";
import { acceptBattle, cancelBattle, declineBattle, inviteBattle, openBattles, watchBattles } from "../battle/api";
import type { BattleLevel } from "../battle/rules";

type Go = (h: string) => void;
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const reactionText = (code: string) => t(`react_${code}` as "react_gl");
const tcLabel = (tc: string) => tc === "none" ? t("clockNone") : tc.includes("+") ? tc.split("+").map(n => num(+n)).join(" + ") : `${num(+tc)} ${t("minutes")}`;
/** "Magical Chess · " before the clock, for a Magical Chess challenge or game (Stage 2). */
const vLabel = (v?: Variant) => (v === "magical" ? `${t("powerTitle")} · ` : "");

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
        const e = await enableOnlineAdult(); if (e) await tell(e); void onlineBlock(box);
      }, () => draw()), () => draw()));
    box.querySelector<HTMLButtonElement>("[data-on]")?.addEventListener("click", () =>
      parentGate(box.querySelector("[data-gate]")!, async () => { const e = await enableOnline(); if (e) await tell(e); void onlineBlock(box); }, () => draw()));
    box.querySelector<HTMLButtonElement>("[data-off]")?.addEventListener("click", async () => {
      if (me && await ask(t("onlineOffConfirm"), { danger: true })) { await disableOnline(me.id); void onlineBlock(box); }
    });
    box.querySelector<HTMLButtonElement>("[data-newcode]")?.addEventListener("click", async () => {
      if (me && await ask(t("onlineNewCodeConfirm"))) { await newFriendCode(me.id); void onlineBlock(box); }
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

// ---------- the lobby ----------
let tc = "10", colour = "random", variant: Variant = "chess", bLevel: BattleLevel = "easy";
/** Friends and classmates: my friend code, add a friend, who I can play, challenges and Puzzle Battle. (The Play page is play.ts.) */
export function onlineLobby(root: HTMLElement, go: Go): () => void {
  let alive = true, unwatch: (() => void) | null = null, seq = 0;
  const leave = () => { alive = false; unwatch?.(); };
  const title = t("onlineFriendsTitle");
  const back = () => go("#/online");
  root.innerHTML = `<div class="screen">${bar(title)}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = back;
  if (!signedIn()) {
    root.innerHTML = `<div class="screen">${bar(title)}<div class="parentcard">${icon("shield")}<div><b>${t("onlineNeedsAccount")}</b><small>${t("onlineNeedsAccountNote")}</small></div></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = back;
    return leave;
  }
  void (async () => {
    const me = await myPlayer(); if (!alive) return;
    if (!me) {
      root.innerHTML = `<div class="screen">${bar(title)}<div class="hero">${avatarHTML(family.current(), "big")}</div>
        <div class="parentcard">${icon("shield")}<div><b>${t("onlineOffTitle")}</b><small>${t("onlineAboutParent")}</small></div></div>
        <div class="actions"><button class="btn wide" data-family>${t("famTitle")}</button></div></div>`;
      root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = back;
      root.querySelector<HTMLButtonElement>("[data-family]")!.onclick = () => go("#/family");
      return;
    }
    // a redraw from a live update is skipped while a friend code is half typed, and only the newest render draws
    const render = async (fromEvent = false) => {
      if (fromEvent && root.querySelector<HTMLInputElement>("#fc")?.value) return;
      const my = ++seq;
      const [opps, chs, games, reqs, bts] = await Promise.all([opponents(me.id), challenges(me.id), activeGames(me.id), friendRequests(me.id), openBattles(me.id).catch(() => [])]);
      if (!alive || my !== seq) return;
      if (fromEvent && root.querySelector<HTMLInputElement>("#fc")?.value) return;
      const who = new Map(opps.map(o => [o.player, o]));
      const face = (id: string) => avatarHTML(who.get(id) ?? { avatar: "cat", colour: "#9AA39E" });
      const incoming = chs.filter(c => c.to_player === me.id), outgoing = chs.filter(c => c.from_player === me.id);
      // Puzzle Battle (class features 2026-11-03): invitations come the same way as challenges, from friends and classmates only
      const bRun = bts.filter(x => x.status === "active"), bIn = bts.filter(x => x.status === "invited" && x.to_player === me.id), bOut = bts.filter(x => x.status === "invited" && x.from_player === me.id);
      const bFace = (x: { from_player: string; to_player: string }) => face(x.from_player === me.id ? x.to_player : x.from_player);
      root.innerHTML = `<div class="screen">${bar(title)}
        <div class="li"><span>${avatarHTML(family.current(), "")}</span><span class="grow"><small>${t("onlineCode")}</small><b class="codetxt big">${me.friend_code}</b></span></div>
        <p class="note">${t("onlineCodeNote")}</p>
        ${games.length ? `<h2 class="sec">${t("onlineYourGames")}</h2>${games.map(g => `<button class="botcard" data-game="${g.id}">${g.simul_id ? avatarHTML({ avatar: "turtle", colour: "#C99A2E" }) : face(g.white === me.id ? g.black : g.white)}
          <span class="grow"><b>${g.simul_id ? t("simulYourTeacher") : t("onlineGameOn")}</b><small>${g.simul_id ? `${t("simulClassGame")} · ` : ""}${vLabel(g.variant)}${tcLabel(g.tc_min ? (g.tc_inc ? `${g.tc_min}+${g.tc_inc}` : String(g.tc_min)) : "none")}</small></span>${icon("arrowRight")}</button>`).join("")}` : ""}
        ${reqs.length ? `<h2 class="sec">${t("onlineFriendRequests")}</h2><p class="note">${t("onlineFriendRequestsNote")}</p>${reqs.map(r => `<div class="botcard">${avatarHTML(r)}
          <span class="grow"><b>${t("onlineWantsFriend")}</b></span>
          <button class="btn" data-befriend="${r.player}">${t("onlineAccept")}</button><button class="btn ghost" data-refuse="${r.player}">${t("onlineDecline")}</button></div>`).join("")}` : ""}
        ${bRun.length || bIn.length || bOut.length ? `<h2 class="sec">${t("battleInvites")}</h2>
          ${bRun.map(x => `<button class="botcard" data-bopen="${x.id}">${bFace(x)}<span class="grow"><b>${t("battleRunning")}</b><small>${t(`battleLevel_${x.level}` as "battleLevel_easy")}</small></span>${icon("arrowRight")}</button>`).join("")}
          ${bIn.map(x => `<div class="botcard">${bFace(x)}<span class="grow"><b>${t("battleWantsToPlay")}</b><small>${t(`battleLevel_${x.level}` as "battleLevel_easy")}</small></span>
            <button class="btn" data-baccept="${x.id}">${t("onlineAccept")}</button><button class="btn ghost" data-bdecline="${x.id}">${t("onlineDecline")}</button></div>`).join("")}
          ${bOut.map(x => `<div class="botcard">${bFace(x)}<span class="grow"><b>${t("battleWaitingFor")}</b><small>${t(`battleLevel_${x.level}` as "battleLevel_easy")}</small></span>
            <button class="btn ghost" data-bcancel="${x.id}">${t("cancel")}</button></div>`).join("")}` : ""}
        ${incoming.length ? `<h2 class="sec">${t("onlineIncoming")}</h2>${incoming.map(c => `<div class="botcard">${face(c.from_player)}
          <span class="grow"><b>${t("onlineWantsToPlay")}</b><small>${vLabel(c.variant)}${tcLabel(c.tc)}</small></span>
          <button class="btn" data-accept="${c.id}">${t("onlineAccept")}</button><button class="btn ghost" data-decline="${c.id}">${t("onlineDecline")}</button></div>`).join("")}` : ""}
        ${outgoing.length ? `<h2 class="sec">${t("onlineWaiting")}</h2>${outgoing.map(c => `<div class="botcard">${face(c.to_player)}
          <span class="grow"><b>${t("onlineWaitingFor")}</b><small>${vLabel(c.variant)}${tcLabel(c.tc)}</small></span><button class="btn ghost" data-cancel="${c.id}">${t("cancel")}</button></div>`).join("")}` : ""}
        <h2 class="sec">${t("onlinePlayWho")}</h2>
        ${MAGICAL_ONLINE ? `<div class="seg variants" role="group">${(["chess", "magical"] as const).map(v => `<button data-variant="${v}" aria-pressed="${variant === v}">${v === "chess" ? t("chessPlain") : `✨ ${t("powerTitle")}`}</button>`).join("")}</div>` : ""}
        <div class="seg tcs" role="group">${["none", "10", "5", "3+2"].map(x => `<button data-tc="${x}" aria-pressed="${tc === x}">${tcLabel(x)}</button>`).join("")}</div>
        <div class="seg colours" role="group">${(["w", "random", "b"] as const).map(c => `<button data-c="${c}" aria-pressed="${colour === c}"><span class="kingdot ${c}"></span>${t(c === "w" ? "colourWhite" : c === "b" ? "colourBlack" : "colourRandom")}</button>`).join("")}</div>
        ${opps.length ? `<p class="note">${icon("puzzle")} <b>${t("battleTitle")}</b>: ${t("battleAbout")}</p>
          <div class="seg levels" role="group">${(["easy", "medium", "hard"] as const).map(l => `<button data-blevel="${l}" aria-pressed="${bLevel === l}">${t(`battleLevel_${l}` as "battleLevel_easy")}</button>`).join("")}</div>` : ""}
        ${opps.length ? `<div class="botlist">${opps.map((o: Opponent) => `<div class="botcard">${avatarHTML(o)}
          <span class="grow"><b>${o.friend ? t("onlineFriend") : t("onlineClassmate")}</b><small>${o.friend && o.classmate ? t("onlineBoth") : ""}</small></span>
          <button class="btn" data-challenge="${o.player}" ${outgoing.some(c => c.to_player === o.player) ? "disabled" : ""}>${t("onlineChallenge")}</button>
          <button class="btn ghost" data-battle="${o.player}" ${bOut.some(x => x.to_player === o.player) ? "disabled" : ""} aria-label="${t("battleTitle")}">${icon("puzzle")} ${t("battleGoBtn")}</button>
          ${o.friend ? `<button class="iconbtn" data-unfriend="${o.player}" aria-label="${t("onlineUnfriend")}">${icon("trash")}</button>` : ""}</div>`).join("")}</div>`
          : `<p class="note">${t("onlineNobody")}</p>`}
        <form class="emailform" data-add><label class="note" for="fc">${t("onlineAddFriend")}</label>
          <input id="fc" maxlength="6" autocapitalize="characters" autocomplete="off" required placeholder="ABC234" class="codein">
          <button class="btn wide" type="submit">${icon("plus")} ${t("onlineAdd")}</button></form><p class="note err" data-err></p>
        <p class="note">${t("onlineSafety")}</p></div>`;
      root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = back;
      const errBox = root.querySelector<HTMLElement>("[data-err]")!;
      root.querySelectorAll<HTMLButtonElement>("[data-tc]").forEach(b => b.onclick = () => { tc = b.dataset.tc!; void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-c]").forEach(b => b.onclick = () => { colour = b.dataset.c!; void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach(b => b.onclick = () => { variant = b.dataset.variant as Variant; void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(b => b.onclick = () => go(`#/online/game/${b.dataset.game}`));
      root.querySelectorAll<HTMLButtonElement>("[data-challenge]").forEach(b => b.onclick = async () => {
        const e = await sendChallenge(me.id, b.dataset.challenge!, tc, colour, MAGICAL_ONLINE ? variant : "chess"); if (e) errBox.textContent = e; else void render();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-accept]").forEach(b => b.onclick = async () => {
        const r = await answerChallenge(me.id, b.dataset.accept!, true);
        if (r.game) go(`#/online/game/${r.game}`); else { errBox.textContent = r.error ?? ""; void render(); }
      });
      root.querySelectorAll<HTMLButtonElement>("[data-blevel]").forEach(b => b.onclick = () => { bLevel = b.dataset.blevel as BattleLevel; void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-battle]").forEach(b => b.onclick = async () => {
        const e = await inviteBattle(me.id, b.dataset.battle!, bLevel); if (e) errBox.textContent = e; else void render();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-bopen]").forEach(b => b.onclick = () => go(`#/battle/${b.dataset.bopen}`));
      root.querySelectorAll<HTMLButtonElement>("[data-baccept]").forEach(b => b.onclick = async () => {
        const e = await acceptBattle(me.id, b.dataset.baccept!); if (e) { errBox.textContent = e; void render(); } else go(`#/battle/${b.dataset.baccept}`);
      });
      root.querySelectorAll<HTMLButtonElement>("[data-bdecline]").forEach(b => b.onclick = async () => { await declineBattle(me.id, b.dataset.bdecline!); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-bcancel]").forEach(b => b.onclick = async () => { await cancelBattle(me.id, b.dataset.bcancel!); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-decline]").forEach(b => b.onclick = async () => { await answerChallenge(me.id, b.dataset.decline!, false); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-cancel]").forEach(b => b.onclick = async () => { await cancelChallenge(me.id, b.dataset.cancel!); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-befriend]").forEach(b => b.onclick = async () => { await answerFriend(me.id, b.dataset.befriend!, true); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-refuse]").forEach(b => b.onclick = async () => { await answerFriend(me.id, b.dataset.refuse!, false); void render(); });
      root.querySelectorAll<HTMLButtonElement>("[data-unfriend]").forEach(b => b.onclick = async () => { if (await ask(t("onlineUnfriendConfirm"), { danger: true })) { await removeFriend(me.id, b.dataset.unfriend!); void render(); } });
      root.querySelector<HTMLFormElement>("[data-add]")!.onsubmit = async e => {
        e.preventDefault();
        const r = await addFriend(me.id, root.querySelector<HTMLInputElement>("#fc")!.value);
        if (r === "sent") { await render(); root.querySelector<HTMLElement>("[data-err]")!.textContent = t("onlineRequestSent"); }
        else errBox.textContent = r === "no_code" ? t("onlineNoCode") : r === "own_code" ? t("onlineOwnCode") : r === "too_many" ? t("onlineTooMany") : r;
      };
    };
    await render();
    if (!alive) return;
    // MY challenge that has just been accepted opens its game (by the game id on that very row, not by guessing the newest
    // game); any other change redraws the lobby, unless a friend code is half typed
    const u1 = watchChallenges(me.id, c => {
      if (!alive) return;
      if (c && c.from_player === me.id && c.status === "accepted" && c.game && location.hash === "#/online/friends") go(`#/online/game/${c.game}`);
      else void render(true);
    });
    // a Puzzle Battle accepted by the other side opens at once; any other change redraws the lobby
    const u2 = watchBattles(me.id, async () => {
      const run = (await openBattles(me.id).catch(() => [])).find(x => x.status === "active" && x.from_player === me.id);
      if (alive && run && location.hash === "#/online/friends") go(`#/battle/${run.id}`); else if (alive) void render(true);
    });
    // a class simul (class features 2026-11-03): the teacher seats the pupil, and the new board shows up in Your games
    const u3 = watchNewGames(me.id, () => { if (alive) void render(true); });
    unwatch = () => { u1(); u2(); u3(); };
    if (!alive) unwatch();   // left while the first draw was loading: the watchers must not outlive the screen
  })();
  return leave;
}

// ---------- the live game ----------
export function onlineGame(root: HTMLElement, id: string, go: Go): () => void {
  let alive = true, unwatch: (() => void) | null = null, timer = 0, watchdog = 0, board: Board | null = null, onVisible: (() => void) | null = null, rematchPoll = 0, unwatchRematch: (() => void) | null = null;
  const leave = () => { alive = false; unwatch?.(); unwatchRematch?.(); clearInterval(timer); clearInterval(watchdog); clearInterval(rematchPoll); if (onVisible) document.removeEventListener("visibilitychange", onVisible); board?.destroy(); };
  root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
  void (async () => {
    const [me, first, skew] = await Promise.all([myPlayer(), getGame(id), clockSkew()]);
    if (!alive) return;
    if (!me || !first) return go("#/online");
    void primeLag(me.id);                                   // bullet: measure this connection's round trip for the server's lag allowance
    const now = () => Date.now() + skew;                    // the server's clock, as near as we can tell (the clocks below are the server's)
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
    // Magical Chess with friends (Stage 2): the position comes from the seed, the moves and the changes, not the moves alone
    const magical = first.variant === "magical", viaSimul = !!first.simul_id;
    const line = () => magicalLine(g.seed ?? 0, g.moves, g.changes ?? []);
    const rated = !!first.rated, ratingOf = (x?: { rating: number | null }) => (rated && x?.rating ? ` <small>~${num(x.rating)}</small>` : "");
    root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}
      <div class="pbar" data-top></div>
      <div class="frame"><div class="boardwrap ${magical ? "powerwrap" : ""}" data-board>${magical ? `<div class="usebubble" data-use hidden></div>` : ""}</div><div class="overcard" data-card hidden></div></div>
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
    const chess = () => {
      if (magical) return new Chess(line().states.at(-1)!.fen);
      const c = new Chess(); for (const m of g.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); return c;
    };

    // the clocks come from the server; between updates the side to move counts down here
    const left = (side: "w" | "b") => {
      const base = side === "w" ? g.white_ms : g.black_ms, c = chess();
      return g.tc_min && g.status === "active" && g.turn_since && c.turn() === side ? Math.max(0, base - (now() - Date.parse(g.turn_since))) : base;
    };
    function bars() {
      const c = chess(), cap = captured(c), turn = c.turn();
      const caps = (by: "w" | "b") => cap[by].map(p => `<span class="cp">${pieceHTML(`${by === "w" ? "b" : "w"}${p.toUpperCase()}` as PieceCode)}</span>`).join("")
        + ((by === "w" ? cap.lead : -cap.lead) > 0 ? `<span class="lead">+${num(Math.abs(cap.lead))}</span>` : "");
      const clk = (side: "w" | "b") => g.tc_min ? `<b class="clk ${turn === side && g.turn_since && g.status === "active" ? "run" : ""} ${left(side) < 20000 ? "low" : ""}">${fmt(left(side))}</b>` : "";
      root.querySelector("[data-top]")!.innerHTML = `<span class="av">${avatarHTML(opp)}</span><div class="grow"><b>${viaSimul ? t("simulYourTeacher") : t("onlineOpponent")}${ratingOf(oppSide)}</b><div class="caps">${caps(theirs)}</div></div>${clk(theirs)}`;
      root.querySelector("[data-bottom]")!.innerHTML = `<span class="av">${avatarHTML(family.current())}</span><div class="grow"><b>${t("you")}${ratingOf(mySide)}</b><div class="caps">${caps(mine)}</div></div>${clk(mine)}`;
    }
    function show(anim = false) {
      const c = chess(), n = g.moves.length, at = view ?? n, ml = magical ? line() : null;
      const p = ml ? { fen: ml.states[at].fen, last: at ? ml.last[at - 1] as [CjSquare, CjSquare] : undefined } : positionAt(c, at);
      board!.set(placementFromFen(p.fen), { lastMove: p.last, check: at === n ? checkSquare(c) : undefined, ...(ml ? { decor: gemDecor(ml.states[at].orbs) } : {}) },
        anim && view === null && p.last ? p.last : undefined);
      const list = root.querySelector<HTMLElement>("[data-moves]")!;
      list.innerHTML = (ml ? ml.sans : c.history()).map((m: string, i: number) => `${i % 2 ? "" : `<i>${num(i / 2 + 1)}.</i>`}<button class="mv ${i === at - 1 && view !== null ? "on" : ""}" data-ply="${i + 1}">${m}</button>`).join(" ");
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
    // ---- after the game: the rating change, rematch and "new opponent" (online ratings v2) ----
    let provisional = false, blocked = false, rm: Rematch | null = null, wentToRematch = false;
    const canRematch = () => !magical && !viaSimul && !!oppId && g.moves.length >= 2 && g.result !== null && !blocked;
    /** "rating 1432 +8": the change the database wrote when it rated the game (nothing for an unrated or very short game). */
    const ratingLine = () => {
      const d = mine === "w" ? g.white_delta : g.black_delta, before = mine === "w" ? g.white_before : g.black_before;
      if (!rated || d == null || before == null) return "";
      return `${t("ratedGame")} · ${t("adultRating")} ${num(before + d)}${provisional ? "?" : ""} <b class="delta ${d >= 0 ? "up" : "down"}">${deltaText(d)}</b>`;
    };
    const paintRating = () => root.querySelectorAll<HTMLElement>("[data-ratingline]").forEach(el => { el.innerHTML = ratingLine(); });
    const paintRematch = () => {
      if (rm?.status === "accepted" && rm.new_game && !wentToRematch) { wentToRematch = true; go(`#/online/game/${rm.new_game}`); return; }
      const fresh = rm && (rm.status !== "pending" || Date.parse(rm.created_at) > Date.now() - 60000) ? rm : null;
      const mineOffer = fresh?.status === "pending" && fresh.from_player === me!.id, theirs = fresh?.status === "pending" && fresh.to_player === me!.id;
      const newOpp = g.via === "seek" || g.via === "rematch";
      const tcKey = g.tc_min ? `${g.tc_min}+${g.tc_inc}` : "";
      const html = `${canRematch() ? (mineOffer ? `<p class="note"><b>${t("rmWaiting")}</b> <button class="linkbtn" data-rm-cancel>${t("cancel")}</button></p>`
        : theirs ? `<p class="note"><b>${t("rmWants")}</b></p><div class="actions"><button class="btn" data-rm-yes>${t("onlineAccept")}</button><button class="btn ghost" data-rm-no>${t("onlineDecline")}</button></div>`
        : fresh?.status === "declined" && fresh.from_player === me!.id ? `<p class="note">${t("rmDeclined")}</p>`
        : `<button class="btn wide" data-rm-ask>${icon("swords")} ${t("rmAsk")}</button>`) : ""}
        ${newOpp && tcKey && !blocked ? `<button class="btn ghost wide" data-newopp="${tcKey}">${icon("play")} ${t("newOpponent")}</button>` : ""}<p class="note err" data-rm-err></p>`;
      root.querySelectorAll<HTMLElement>("[data-rematch]").forEach(el => { el.innerHTML = html; });
      const err = (m: string) => root.querySelectorAll<HTMLElement>("[data-rm-err]").forEach(el => { el.textContent = m; });
      root.querySelectorAll<HTMLButtonElement>("[data-rm-ask]").forEach(b => b.onclick = async () => {
        b.disabled = true; const e = await requestRematch(me!.id, g.id); if (e) err(t("rmGone")); void refreshRematch();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-rm-cancel]").forEach(b => b.onclick = async () => { if (rm) await cancelRematch(me!.id, rm.id); void refreshRematch(); });
      root.querySelectorAll<HTMLButtonElement>("[data-rm-yes]").forEach(b => b.onclick = async () => { if (rm) { const e = await answerRematch(me!.id, rm.id, true); if (e) err(t("rmGone")); } void refreshRematch(); });
      root.querySelectorAll<HTMLButtonElement>("[data-rm-no]").forEach(b => b.onclick = async () => { if (rm) await answerRematch(me!.id, rm.id, false); void refreshRematch(); });
      root.querySelectorAll<HTMLButtonElement>("[data-newopp]").forEach(b => b.onclick = () => go(`#/online/search/${encodeURIComponent(b.dataset.newopp!)}`));
    };
    const refreshRematch = async () => { if (!alive || !canRematch()) return; const r = await rematchFor(g.id); if (!alive) return; rm = r; paintRematch(); };
    function finish() {
      if (ended) return; ended = true; clearInterval(timer);
      const aborted = g.result === null;                                  // closed before anybody moved: no result, no rating
      const won = (g.result === "1-0") === (mine === "w") && g.result !== "1/2-1/2" && !aborted, draw = g.result === "1/2-1/2";
      const r: "won" | "lost" | "draw" = draw || aborted ? "draw" : won ? "won" : "lost";
      const how = aborted ? t("onlineAborted") : t(`byOnline_${g.reason}` as "byOnline_mate");
      // DECISIONS #117: the king badges always; the banner only when the game ends while watching it
      const kind = g.reason === "mate" ? "mate" : g.reason === "resign" ? "resign" : g.reason === "time" ? (draw ? "draw" : "time") : g.reason === "stalemate" ? "stalemate" : draw || aborted ? "draw" : "other";
      const loser = draw || aborted ? null : won ? theirs : mine;
      const oppName = rated ? { en: "Online player", pa: "ਔਨਲਾਈਨ ਖਿਡਾਰੀ" } : { en: "Online friend", pa: "ਔਨਲਾਈਨ ਦੋਸਤ" };
      if (alreadyOver) board!.setEnd(endBadges(kind, loser)); else announceEnd(board!, kind, loser);
      // a Magical Chess game is not kept in Your games or reviewed: those replay it as plain chess, which it is not
      if (!alreadyOver && !magical && !aborted) saveGame({ at: new Date().toISOString(), opp: oppName, me: mine, result: r, tc: g.tc_min ? (g.tc_inc ? `${g.tc_min}+${g.tc_inc}` : String(g.tc_min)) : undefined, uci: g.moves,
        ms: g.moves.map((_, i) => times[i] ?? null) });
      if (!magical) setLastGame({ uci: g.moves, me: mine, botName: oppName, back: "#/online" });
      if (r === "won" && !alreadyOver) { sound.complete(); confetti(root.querySelector(".screen")!); }
      const buttons = `<p class="note ratingline" data-ratingline></p>
        <div class="rematch" data-rematch></div>
        ${g.moves.length >= 2 && !magical ? `<button class="btn wide gold" data-review>${icon("target")} ${t("reviewTitle")}</button>` : ""}
        <button class="btn ghost wide" data-lobby>${t("onlineBackToLobby")}</button>
        ${g.moves.length >= 2 ? shareButton() : ""}
        ${rated && oppId ? `<button class="linkbtn" data-block>${t("adultBlock")}</button>` : ""}`;
      const card = root.querySelector<HTMLElement>("[data-card]")!;
      card.innerHTML = `<button class="iconbtn x" data-x aria-label="${t("close")}">${icon("close")}</button>${avatarHTML(opp, "big")}
        <h2>${aborted ? t("gameDrawn") : r === "won" ? t("gameWon") : r === "lost" ? t("onlineLost") : t("gameDrawn")}</h2><p>${how}</p>${buttons}`;
      card.hidden = true; if (alreadyOver) card.hidden = false; else setTimeout(() => { if (alive) card.hidden = false; }, END_PAUSE);
      const acts = root.querySelector<HTMLElement>("[data-acts]")!; acts.innerHTML = `<div class="resultacts">${buttons}</div>`; acts.hidden = true;
      root.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(b => b.onclick = () => go("#/review"));
      root.querySelectorAll<HTMLButtonElement>("[data-lobby]").forEach(b => b.onclick = () => go("#/online"));
      wireShare(root, () => { const c = chess(), last = g.moves.at(-1);   // DECISIONS #115
        return { pos: placementFromFen(c.fen()), lastMove: last ? [last.slice(0, 2), last.slice(2, 4)] : undefined, flip: mine === "b", result: r, how, opp: oppName, moves: Math.ceil(g.moves.length / 2) }; });
      card.querySelector<HTMLButtonElement>("[data-x]")!.onclick = () => { card.hidden = true; acts.hidden = false; };
      root.querySelectorAll<HTMLButtonElement>("[data-block]").forEach(b => b.onclick = async () => {
        if (!oppId || !(await ask(t("adultBlockConfirm"), { danger: true }))) return;
        const e = await blockPlayer(me!.id, oppId);
        if (!e) { blocked = true; paintRematch(); }
        root.querySelectorAll<HTMLButtonElement>("[data-block]").forEach(x => { x.disabled = true; x.textContent = e ?? t("adultBlocked"); });
      });
      // a rated game: the new rating and the change. The database writes them a moment after the game ends, so they are
      // painted now if they are there and again when the live update that carries them arrives (apply)
      paintRating();
      if (rated) void gamePlayers(g.id).then(sides => { provisional = !!sides.find(x => x.side === mine)?.provisional; if (alive) paintRating(); });
      paintRematch();
      if (canRematch()) {
        void refreshRematch();
        rematchPoll = window.setInterval(() => void refreshRematch(), 2500);
        unwatchRematch = watchRematch(g.id, () => void refreshRematch());
      }
      say("");
    }
    const apply = (next: Game) => {
      // while my move is on its way, an update with FEWER moves than my optimistic list (a reaction, a draw offer) keeps
      // my move on the board; the update that carries it (or the watchdog's re-sync) clears the wait
      const keep = busy && next.status === "active" && next.moves.length < g.moves.length;
      const moved = !keep && next.moves.length !== g.moves.length;
      g = keep ? { ...next, moves: g.moves } : next; if (!keep) busy = false;
      if (moved) { view = null; show(true); } else show();
      // a reaction from the other player pops up for a moment
      if (g.reaction && g.reaction.by !== me!.id && g.reaction.at !== lastReactionAt) {
        lastReactionAt = g.reaction.at;
        const pop = document.createElement("div"); pop.className = "reactpop"; pop.textContent = reactionText(g.reaction.code);
        root.querySelector(".frame")!.appendChild(pop); setTimeout(() => pop.remove(), 2500);
      }
      if (g.status === "finished") { finish(); paintRating(); }   // the rating change can arrive in a second update
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
        if (g.turn_since) times[g.moves.length] = Math.max(0, now() - Date.parse(g.turn_since));   // Insights (#113)
        // show it at once; the server's answer (by the live update) confirms it, or puts the board back
        busy = true; busySince = Date.now();
        const before = g; g = { ...g, moves: [...g.moves, uci] }; show(true);
        // Magical Chess: a piece (never a king) that lands on a gem asks at once, change or stay (Stage 2). The
        // watchdog that re-syncs a move stuck for 6 s waits while the child decides.
        let change = false;
        const gem = magical ? gemFor(line().states.at(-2)!, legal[0]) : undefined;
        if (gem) {
          busySince = Date.now() + 1e9;
          const wrap = root.querySelector<HTMLElement>("[data-board]")!;
          change = await askChange(wrap, wrap.querySelector<HTMLElement>("[data-use]")!, legal[0].to, legal[0].piece, gem.piece);
          if (!alive) return;
          if (change) { g = { ...g, changes: [...(g.changes ?? []), before.moves.length] }; show(); burstAt(wrap, legal[0].to); sound.correct(); }
          busySince = Date.now();
        }
        const e = await sendMove(g.id, me!.id, uci, change);
        if (e) { g = before; busy = false; show(); say(`<b class="warn">${e}</b>`); }
      },
    });
    root.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => { view = Math.max(0, (view ?? g.moves.length) - 1); show(); };
    root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { const n = (view ?? g.moves.length) + 1; view = n >= g.moves.length ? null : n; show(); };
    root.querySelectorAll<HTMLButtonElement>("[data-react]").forEach(b => b.onclick = () => { void gameAction(me.id, g.id, "react", b.dataset.react); b.classList.add("sent"); setTimeout(() => b.classList.remove("sent"), 800); });
    root.querySelector<HTMLButtonElement>("[data-draw]")!.onclick = () => { if (g.status === "active") void ask(t("drawConfirm")).then(ok => { if (ok && g.status === "active") void gameAction(me.id, g.id, "offer_draw"); }); };
    root.querySelector<HTMLButtonElement>("[data-resign]")!.onclick = () => { if (g.status === "active") void ask(t("resignConfirm"), { yes: t("resign"), no: t("keepPlaying"), danger: true }).then(ok => { if (ok && g.status === "active") void gameAction(me.id, g.id, "resign"); }); };
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
    if (!alive) return;
    show();
    if (g.status === "finished") finish();
  })();
  return leave;
}

// ---------- the grown-up ladder (DECISIONS #89) ----------
let ladderCat: Category = "rapid";
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
      <div class="seg" role="group">${CATEGORIES.map(c => `<button data-cat="${c}" aria-pressed="${ladderCat === c}">${catName(c)}</button>`).join("")}</div>
      <p class="muted">${t("ladderAbout")}</p>
      ${rows.length ? `<table class="boardtable"><tr><th></th><th></th><th>${t("ratingLabel")}</th><th>${t("ladderGames")}</th></tr>
        ${rows.map(r => `<tr class="${r.me ? "me" : ""}"><td class="n">${num(r.place)}</td><td>${avatarHTML(r)}${r.me ? ` <b>${t("you")}</b>` : ""}</td>
          <td class="n"><b>${num(r.rating)}${r.provisional ? "?" : ""}</b></td><td class="n">${num(r.games)}</td></tr>`).join("")}</table>` : `<p class="note">${t("ladderEmpty")}</p>`}
      ${rows.some(r => r.me) ? "" : `<p class="note">${t("ladderNotYet")}</p>`}</div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
    root.querySelectorAll<HTMLButtonElement>("[data-cat]").forEach(b => b.onclick = () => { ladderCat = b.dataset.cat as Category; void draw(); });
  };
  void draw();
  return () => { alive = false; };
}
