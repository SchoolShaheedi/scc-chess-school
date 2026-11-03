// Play Online (modelled on chess.com's Play page): a clock picker (bullet, blitz, rapid), one big Play button that
// pairs you automatically, a "searching" state with a timer and a cancel, and the open-challenge lobby ("Play anyone").
// WHO is paired is decided by the database (supabase/online_matching.sql, pair_ok): grown-ups (declared 18+) are paired
// with other grown-ups; a child only with an online friend or classmate who is also looking. This file only asks.
import { family } from "../family";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { avatarHTML } from "../me/family";
import { BOTS } from "../bots/bots";
import {
  acceptSeek, activeGames, findGame, myPlayer, openSeeks, type Me, type OpenSeek, postSeek, ratingSummary, type RatingRow, signedIn, stopSeeking, watchNewGames,
} from "./api";
import { BOT_OFFER_AFTER_S, type Category, CATEGORIES, nearestBot, savedTc, saveTc, tcCategory, tcNorm, tcParse, TIME_CONTROLS, windowLabel } from "./matching";
import { ratingText } from "./glicko";
import { parentGate } from "./screens";

type Go = (h: string) => void;
const bar = (title: string, back = "") => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1>${back}</div>`;
export const catName = (c: Category) => t(c === "bullet" ? "catBullet" : c === "blitz" ? "catBlitz" : "catRapid");
/** "5+0", "15+10": with the digits of the chosen language. */
export const tcName = (tc: string) => { const { mins, inc } = tcParse(tc); return `${num(mins)}+${num(inc)}`; };
const clock = (s: number) => `${num(Math.floor(s / 60))}:${num(String(s % 60).padStart(2, "0"))}`;

// The grown-up question is asked when stranger play opens, because children use the same phone. A pass lasts ten minutes
// for the same profile, so "new opponent" after a game does not ask again.
let gate: { id: string; until: number } | null = null;
const gateOk = (me: Me) => !me.adult || (gate?.id === me.id && gate.until > Date.now());
const passGate = (me: Me) => { gate = { id: me.id, until: Date.now() + 10 * 60000 }; };

/** The two cards shown when there is no account or no switched-on player (shared by every online screen). */
async function needPlayer(root: HTMLElement, go: Go, title: string): Promise<Me | null> {
  root.innerHTML = `<div class="screen">${bar(title)}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
  if (!signedIn()) {
    root.innerHTML = `<div class="screen">${bar(title)}<div class="parentcard">${icon("shield")}<div><b>${t("onlineNeedsAccount")}</b><small>${t("onlineNeedsAccountNote")}</small></div></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
    return null;
  }
  const me = await myPlayer();
  if (!me) {
    root.innerHTML = `<div class="screen">${bar(title)}<div class="hero">${avatarHTML(family.current(), "big")}</div>
      <div class="parentcard">${icon("shield")}<div><b>${t("onlineOffTitle")}</b><small>${t("onlineAboutParent")}</small></div></div>
      <div class="actions"><button class="btn wide" data-family>${t("famTitle")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
    root.querySelector<HTMLButtonElement>("[data-family]")!.onclick = () => go("#/family");
  }
  return me;
}

/** The clock picker: three groups, each headed by the player's rating at that speed. */
function picker(rows: RatingRow[], chosen: string): string {
  const rate = (c: Category) => { const r = rows.find(x => x.category === c); return r ? ratingText(r.rating, r.provisional) : "1200?"; };
  return CATEGORIES.map(c => `<div class="tcgroup"><h3 class="sub">${catName(c)} <small>${num(rate(c))}</small></h3>
    <div class="tcrow">${TIME_CONTROLS.filter(x => x.category === c).map(x => `<button data-tc="${x.key}" aria-pressed="${tcNorm(chosen) === x.key}"><b>${tcName(x.key)}</b></button>`).join("")}</div></div>`).join("");
}
const ratingFor = (rows: RatingRow[], tc: string) => rows.find(r => r.category === tcCategory(tc))?.rating ?? 1200;

// ---------- the Play page, and the search ----------
/** `autoTc`: start searching at once with that clock (the "new opponent" button after a game). */
export function playOnline(root: HTMLElement, go: Go, autoTc?: string): () => void {
  let alive = true, rows: RatingRow[] = [], me: Me | null = null, tc = autoTc && TIME_CONTROLS.some(x => x.key === tcNorm(autoTc)) ? tcNorm(autoTc) : savedTc();
  // ONE matchmaking instance for this screen: a single poll and a single timer, always stopped before another starts
  let search: { since: number; poll: number; tick: number; unwatch: () => void } | null = null;
  const stopSearch = (tell = true) => {
    if (!search) return;
    clearInterval(search.poll); clearInterval(search.tick); search.unwatch();
    search = null; if (tell && me) void stopSeeking(me.id);
  };
  const leave = () => { alive = false; stopSearch(); };

  const frame = (body: string, msg = "") => {
    root.innerHTML = `<div class="screen">${bar(t("onlineTitle"))}${body}<p class="note err" data-msg>${msg}</p></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
  };

  const drawSearch = () => {
    if (!me || !search) return;
    const waited = Math.floor((Date.now() - search.since) / 1000), r = ratingFor(rows, tc), w = windowLabel(waited);
    frame(`<div class="seekcard"><span class="spinner" aria-hidden="true"></span>
      <b>${me.adult ? t("adultSeeking").replace("{r}", num(Math.round(r))) : t("poSearchingFriend")}</b>
      <small>${tcName(tc)} · ${catName(tcCategory(tc)!)}</small>
      ${me.adult ? `<small data-range>${w ? t("poRange").replace("{w}", w.replace(/\d+/, d => num(+d))) : t("poRangeAny")}</small>` : ""}
      <small data-timer>${t("poWaited").replace("{time}", clock(waited))}</small>
      ${waited >= BOT_OFFER_AFTER_S ? botOffer(r) : ""}
      <button class="btn ghost" data-stop>${t("cancel")}</button></div>`);
    root.querySelector<HTMLButtonElement>("[data-stop]")!.onclick = () => { stopSearch(); void drawHome(); };
    root.querySelector<HTMLButtonElement>("[data-bot]")?.addEventListener("click", e => { stopSearch(); go(`#/play/${(e.currentTarget as HTMLElement).dataset.bot}`); });
  };
  /** After about a minute with nobody found: offer the bot nearest this rating, and keep searching meanwhile. */
  const botOffer = (r: number) => {
    const b = nearestBot(r, BOTS); if (!b) return "";
    return `<div class="parentcard"><div><b>${t("poBotOffer")}</b><button class="btn" data-bot="${b.id}">${t("poBotPlay").replace("{bot}", tx(b.name))}</button></div></div>`;
  };

  const startSearch = () => {
    if (!me || search) return;
    saveTc(tc);
    const mine = me;
    const since = Date.now();
    const beat = async () => {
      if (!alive || !search) return;
      const r = await findGame(mine.id, tc);
      if (!alive || !search) return;                       // cancelled or left while the call was out
      if (r.error) { stopSearch(); void drawHome(r.error); return; }
      if (r.game) { stopSearch(false); go(`#/online/game/${r.game}`); }
    };
    search = {
      since,
      poll: window.setInterval(() => void beat(), 5000),
      // the timer only rewrites its own line; the bot offer (at 60 s) and the widening range redraw the card once each
      tick: window.setInterval(() => {
        if (!search) return;
        const waited = Math.floor((Date.now() - search.since) / 1000);
        const el = root.querySelector("[data-timer]"); if (el) el.textContent = t("poWaited").replace("{time}", clock(waited));
        if (waited === BOT_OFFER_AFTER_S || [10, 20, 30].includes(waited)) drawSearch();
      }, 1000),
      // a new game with me in it (someone paired with me a moment ago) opens at once
      unwatch: watchNewGames(mine.id, () => void beat()),
    };
    drawSearch(); void beat();
  };

  const drawHome = async (msg = "") => {
    if (!me || !alive) return;
    const games = await activeGames(me.id);
    if (!alive || search) return;
    const mine = me;
    frame(`<div class="li"><span>${avatarHTML(family.current(), "")}</span><span class="grow"><small>${t("poHeroRating").replace("{cat}", catName(tcCategory(tc)!))}</small>
        <b class="codetxt big">${num(Math.round(ratingFor(rows, tc)))}${rows.find(r => r.category === tcCategory(tc))?.provisional ? "?" : ""}</b></span></div>
      ${games.length ? `<h2 class="sec">${t("onlineYourGames")}</h2>${games.map(g => `<button class="botcard" data-game="${g.id}"><span class="grow"><b>${t("onlineGameOn")}</b>
        <small>${g.tc_min ? tcName(`${g.tc_min}+${g.tc_inc}`) : t("clockNone")}</small></span>${icon("arrowRight")}</button>`).join("")}` : ""}
      <h2 class="sec">${t("poPickClock")}</h2>
      ${picker(rows, tc)}
      <button class="btn wide gold bigplay" data-play>${icon("play")} ${t("adultPlay")} ${tcName(tc)}</button>
      <p class="note">${mine.adult ? t("adultPlayNote") : t("poChildNote")}</p><div data-gate></div>
      <div class="linklist">
        <button class="botcard" data-lobby>${icon("users")}<span class="grow"><b>${mine.adult ? t("poAnyone") : t("poFriendsChallenges")}</b></span>${icon("arrowRight")}</button>
        <button class="botcard" data-friends>${icon("swords")}<span class="grow"><b>${t("poFriendsLobby")}</b><small>${t("poFriendsLobbySub")}</small></span>${icon("arrowRight")}</button>
        <button class="botcard" data-ratings>${icon("trophy")}<span class="grow"><b>${t("rtTitle")}</b></span>${icon("arrowRight")}</button>
        ${mine.adult ? `<button class="botcard" data-ladder>${icon("trophy")}<span class="grow"><b>${t("ladderTitle")}</b></span>${icon("arrowRight")}</button>` : ""}
      </div>
      <p class="note">${mine.adult ? t("adultSafety") : t("onlineSafety")}</p>`, msg);
    root.querySelectorAll<HTMLButtonElement>("[data-tc]").forEach(b => b.onclick = () => { tc = b.dataset.tc!; saveTc(tc); void drawHome(); });
    root.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(b => b.onclick = () => go(`#/online/game/${b.dataset.game}`));
    root.querySelector<HTMLButtonElement>("[data-play]")!.onclick = () => {
      if (gateOk(mine)) return startSearch();
      parentGate(root.querySelector("[data-gate]")!, () => { passGate(mine); startSearch(); }, () => void drawHome());
    };
    root.querySelector<HTMLButtonElement>("[data-lobby]")!.onclick = () => go("#/online/lobby");
    root.querySelector<HTMLButtonElement>("[data-friends]")!.onclick = () => go("#/online/friends");
    root.querySelector<HTMLButtonElement>("[data-ratings]")!.onclick = () => go("#/online/rating");
    root.querySelector<HTMLButtonElement>("[data-ladder]")?.addEventListener("click", () => go("#/online/ladder"));
  };

  void (async () => {
    me = await needPlayer(root, go, t("onlineTitle")); if (!alive || !me) return;
    rows = await ratingSummary(me.id); if (!alive) return;
    if (autoTc) {
      // "new opponent" from a result card: search at once (the grown-up question first, if its pass has run out)
      if (gateOk(me)) startSearch();
      else { await drawHome(); const mine = me; parentGate(root.querySelector("[data-gate]")!, () => { passGate(mine); startSearch(); }, () => void drawHome()); }
    } else await drawHome();
  })();
  return leave;
}

// ---------- Play anyone: the open challenge lobby ----------
const BUSY = "finish your current game first", GONE = "that challenge has gone";
export function openLobby(root: HTMLElement, go: Go): () => void {
  let alive = true, me: Me | null = null, tc = savedTc(), posting = false, poll = 0, unwatch: (() => void) | null = null, seq = 0, rows: RatingRow[] = [];
  const leave = () => { alive = false; clearInterval(poll); unwatch?.(); if (posting && me) void stopSeeking(me.id); };
  const frame = (body: string) => {
    root.innerHTML = `<div class="screen">${bar(me?.adult ? t("lbTitleAdult") : t("lbTitleChild"))}${body}</div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
  };
  const say = (m: string) => { const el = root.querySelector("[data-msg]"); if (el) el.textContent = m; };

  /** Only the list (and the post/cancel line) are redrawn on a refresh, so the clock picker is never rebuilt under a finger. */
  const drawList = async () => {
    if (!me || !alive) return;
    const my = ++seq;
    const list = await openSeeks(me.id);
    if (!alive || my !== seq) return;                      // a newer refresh has already drawn
    const box = root.querySelector<HTMLElement>("[data-list]"); if (!box) return;
    box.innerHTML = list.length ? list.map((s: OpenSeek) => `<div class="botcard">${avatarHTML(s)}
        <span class="grow"><b>${num(s.rating)}${s.provisional ? "?" : ""}</b><small>${tcName(s.tc)} · ${catName(s.category)}${s.friend ? ` · ${t("onlineFriend")}` : ""}</small></span>
        <button class="btn" data-accept="${s.player}">${t("lbAccept")}</button></div>`).join("") : `<p class="note">${t("lbEmpty")}</p>`;
    box.querySelectorAll<HTMLButtonElement>("[data-accept]").forEach(b => b.onclick = async () => {
      b.disabled = true;
      const r = await acceptSeek(me!.id, b.dataset.accept!);
      if (r.game) { posting = false; go(`#/online/game/${r.game}`); return; }
      say(r.error?.includes(BUSY) ? t("lbBusy") : r.error?.includes(GONE) ? t("lbGone") : t("srvTryAgain")); void drawList();
    });
  };
  const beat = async () => {
    if (!me || !alive) return;
    if (posting) {                                         // heartbeat for my own challenge; a game id means someone accepted it
      const r = await postSeek(me.id, tc);
      if (!alive) return;
      if (r.game) { posting = false; go(`#/online/game/${r.game}`); return; }
      if (r.error) { posting = false; draw(r.error); return; }
    }
    void drawList();
  };
  const draw = (msg = "") => {
    if (!me) return;
    const mine = me;
    frame(`<p class="note">${mine.adult ? t("lbAboutAdult") : t("lbAboutChild")}</p>
      <div data-list><p class="muted">${t("loading")}</p></div>
      <h2 class="sec">${t("lbPost")}</h2>
      ${posting ? `<div class="seekcard"><span class="spinner" aria-hidden="true"></span><b>${t("lbPosted").replace("{tc}", tcName(tc))}</b><button class="btn ghost" data-unpost>${t("cancel")}</button></div>`
        : `${picker(rows, tc)}<button class="btn wide" data-post>${icon("plus")} ${t("lbPost")} ${tcName(tc)}</button><div data-gate></div>`}
      <p class="note err" data-msg>${msg}</p>`);
    root.querySelectorAll<HTMLButtonElement>("[data-tc]").forEach(b => b.onclick = () => { tc = b.dataset.tc!; saveTc(tc); draw(); void drawList(); });
    root.querySelector<HTMLButtonElement>("[data-post]")?.addEventListener("click", () => { posting = true; draw(); void beat(); });
    root.querySelector<HTMLButtonElement>("[data-unpost]")?.addEventListener("click", () => { posting = false; void stopSeeking(mine.id); draw(); void drawList(); });
    void drawList();
  };
  void (async () => {
    me = await needPlayer(root, go, t("lbTitleAdult")); if (!alive || !me) return;
    rows = await ratingSummary(me.id); if (!alive) return;
    const mine = me;
    const open = () => {
      draw();
      poll = window.setInterval(() => void beat(), 4000);
      unwatch = watchNewGames(mine.id, () => { if (alive && posting) void beat(); });
    };
    if (gateOk(mine)) open();
    else { frame(`<div data-gate></div>`); parentGate(root.querySelector("[data-gate]")!, () => { passGate(mine); open(); }, () => go("#/online")); }
  })();
  return leave;
}

