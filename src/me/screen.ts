// The "Me" page (DECISIONS #76): rank and XP, the streak calendar, the trophy room and a few numbers.
// Settings sit behind the gear at the top.
import { family } from "../family";
import { avatarHTML, myAvatarHTML } from "./family";
import { animalHeroArt, animalHeroEarned, hasHero, heroArt, HEROES } from "../heroes/heroes";
import { BOTS } from "../bots/bots";
import { movesN, num, t, tx } from "../i18n";
import { icon } from "../icons";
import { store, today, unlockAll } from "../store";
import { tabbar } from "../tabbar";
import { games } from "../play/history";
import { statsHTML, wireStats } from "./stats";
import { myPlayer, signedIn } from "../online/api";
import { myClasses } from "../teach/api";
import { setLastGame } from "../review/screen";
import { nextTrophy, rankOf, trophies } from "./trophies";
import { allowed, earned, nextUnlock, REWARDS, type Reward } from "../rewards";
import { FREEZE_MAX } from "../store";
import { pieceHTML } from "../chess/pieces";
/** The board colours follow a newly chosen reward board at once (main.ts applyTheme does the same at start-up). */
const applyLookAndBoard = () => { document.documentElement.dataset.board = store.get().boardTheme ?? "walnut"; };

export function mePage(root: HTMLElement, go: (h: string) => void) {
  const s = store.get(), r = rankOf(s.xp), tr = trophies(s), got = tr.filter(x => x.got).length;
  const pct = r.next ? Math.round(((s.xp - r.from) / (r.next - r.from)) * 100) : 100;
  // the last 28 days, oldest first, ending today
  const days = Array.from({ length: 28 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 27 + i); return d.toLocaleDateString("en-CA"); });
  const active = new Set(s.active), stars = Object.values(s.lessons).reduce((a, l) => a + l.stars, 0);
  const wins = Object.values(s.stats.botWins).reduce((a, n) => a + n, 0);
  const list = games();
  root.innerHTML = `<div class="screen club tabbed">
    <header class="clubhead mehead">
      <div class="clubtop"><span></span><button class="iconbtn dark" data-settings aria-label="${t("settings")}">${icon("settings")}</button></div>
      <button class="meav kidswitch" data-family aria-label="${t("famTitle")}">${myAvatarHTML(`big${s.frame && allowed("frame", s.frame) ? ` fr-${s.frame}` : ""}`)}<span class="swap">${icon("users")}</span></button>
      <h1>${tx(r.name)}</h1>
      <div class="xpbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <small>${r.next ? t("meToNext").replace("{x}", num(s.xp)).replace("{n}", num(r.next)) : `${num(s.xp)} ${t("xp")}`}</small>
    </header>
    ${rewardsTop(s, tr)}
    <h2 class="sec">${t("meMonth")} <span>${icon("flame")} ${num(s.streak.days)}</span></h2>
    <p class="freezes" title="${t("freezeWhy")}">❄️ ${t("freezeCount").replace("{n}", num(s.freezes ?? 0)).replace("{max}", num(FREEZE_MAX))} · <small>${t("freezeWhy")}</small></p>
    <div class="cal" aria-label="${t("meMonth")}">${days.map(d => `<i class="${active.has(d) ? "y" : ""} ${d === today() ? "t" : ""}" title="${d}"></i>`).join("")}</div>
    <h2 class="sec">${t("meTrophies")} <span>${num(got)} / ${num(tr.length)}</span></h2>
    <div class="troph">${tr.map(x => `<div class="trp ${x.got ? "" : "off"}"><span class="c">${icon(x.got ? x.icon : "lock")}</span>${tx(x.name)}</div>`).join("")}</div>
    ${rewardShelf(s)}
    ${heroShelf(s)}
    <h2 class="sec">${t("meNumbers")}</h2>
    <div class="numrow">
      <div><b>${num(Object.keys(s.lessons).length)}</b><small>${t("lessons")}</small></div>
      <div><b>${num(stars)}</b><small>${t("meStars")}</small></div>
      <div><b>${num(wins)}</b><small>${t("meWins")}</small></div>
    </div>
    <h2 class="sec">${t("statsTitle")}</h2>
    ${statsHTML()}
    <div data-onlineratings></div>
    <div data-classboards></div>
    <button class="inslink" data-insights>${icon("chart")}<span class="grow"><b>${t("insTitle")}</b><small>${t("insMeSub")}</small></span>${icon("chevronRight")}</button>
    <h2 class="sec">${t("meGames")} <span>${num(list.length)}</span></h2>
    ${list.length ? `<div class="gamelist">${list.slice(0, 20).map((g, i) => `<button class="gamerow" data-game="${i}">
      <span class="res ${g.result}">${t(g.result === "won" ? "resWon" : g.result === "lost" ? "resLost" : "resDraw")}</span>
      <span class="grow"><b>${t("vsWord")} ${tx(g.opp)}${g.oppRating ? ` ~${num(g.oppRating)}` : ""}</b>
        <small>${new Date(g.at).toLocaleDateString(s.lang === "pa" ? "pa-IN" : "en-GB", { day: "numeric", month: "short" })} · ${g.tc ? (g.tc.includes("+") ? g.tc.split("+").map(x => num(+x)).join(" + ") : `${num(+g.tc)} ${t("minutes")}`) : t("untimed")} · ${movesN(Math.ceil(g.uci.length / 2))}</small></span>
      ${icon("arrowRight")}</button>`).join("")}</div>` : `<p class="note">${t("gamesNone")}</p>`}
  </div>${tabbar("me")}`;
  root.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(b => b.onclick = () => {
    const g = list[+b.dataset.game!];
    setLastGame({ uci: g.uci, me: g.me, meName: g.meName, botName: g.opp, oppRating: g.oppRating, back: "#/me", startFen: g.startFen });
    go("#/review");
  });
  root.querySelector<HTMLButtonElement>("[data-settings]")!.onclick = () => go("#/settings");
  root.querySelector<HTMLButtonElement>("[data-insights]")!.onclick = () => go("#/insights");
  // DECISIONS #109: tap a hero you have won to use it as your picture; tap it again for your animal
  root.querySelectorAll<HTMLButtonElement>("[data-heroav]").forEach(b => b.onclick = () => {
    if (b.classList.contains("off")) return void b.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], 250);
    const id = b.dataset.heroav!;
    store.set({ heroAvatar: store.get().heroAvatar === id ? undefined : id });
    mePage(root, go);
  });
  // tap an earned reward to use it; a locked one shakes (its label says what unlocks it)
  root.querySelectorAll<HTMLButtonElement>("[data-reward]").forEach(b => b.onclick = () => {
    const r = REWARDS.find(x => x.id === b.dataset.reward)!;
    if (!earned(r)) return void b.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], 250);
    store.set(r.kind === "pieces" ? { pieceSet: r.value as never } : r.kind === "board" ? { boardTheme: r.value as never } : { frame: r.value });
    applyLookAndBoard(); mePage(root, go);
  });
  wireStats(root, go);
  // this child's class leaderboards (DECISIONS #89)
  if (signedIn()) void myClasses().then(list => {
    const box = root.querySelector<HTMLElement>("[data-classboards]"), mine = list.filter(m => m.profile_id === family.current().id);
    if (!box || !mine.length) return;
    box.innerHTML = `<h3 class="sub">${t("boardTitle")}</h3>${mine.map(m => `<button class="gamerow" data-cb="${m.class_id}">${icon("trophy")}<span class="grow"><b>${m.title.replace(/[&<>"]/g, "")}</b></span>${icon("arrowRight")}</button>`).join("")}`;
    box.querySelectorAll<HTMLButtonElement>("[data-cb]").forEach(b => b.onclick = () => go(`#/class/${b.dataset.cb}`));
  });
  // the grown-up profile's online ratings (DECISIONS #87), once the account answers
  if (signedIn()) void myPlayer().then(me => {
    const box = root.querySelector<HTMLElement>("[data-onlineratings]");
    if (!box || !me?.adult) return;
    box.innerHTML = `<h3 class="sub">${t("adultPlayTitle")}</h3><div class="stats"><div class="kpis">
      <div><small>${t("adultRapid")}</small><b>${num(me.rapid_r)}</b><em>${num(me.rapid_n)} ${t("adultGames")}</em></div>
      <div><small>${t("adultBlitz")}</small><b>${num(me.blitz_r)}</b><em>${num(me.blitz_n)} ${t("adultGames")}</em></div></div></div>`;
  });
  root.querySelector<HTMLButtonElement>("[data-family]")!.onclick = () => go("#/family");
}

const pct = (n: number, d: number) => Math.round((Math.min(n, d) / d) * 100);

/** The "next unlock" banner and the next trophy (DECISIONS #94: both, banner on top). */
function rewardsTop(s: ReturnType<typeof store.get>, tr: ReturnType<typeof trophies>): string {
  const r = nextUnlock(s), nt = nextTrophy(tr);
  const banner = r ? (() => { const [n, d] = r.progress(s); return `<div class="unlockban">
      <small>${t("nextUnlock")}</small><b>${tx(r.name)}</b><span>${tx(r.need)}</span>
      <div class="ubar" role="progressbar" aria-valuenow="${pct(n, d)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct(n, d)}%"></i></div></div>`; })() : "";
  const trophy = nt ? `<div class="nexttrophy"><span class="c">${icon(nt.icon)}</span><span class="grow"><b>${t("nextTrophy").replace("{name}", tx(nt.name))}</b>
      <span class="ubar"><i style="width:${pct(nt.prog![0], nt.prog![1])}%"></i></span><small>${num(nt.prog![0])} / ${num(nt.prog![1])}</small></span></div>` : "";
  return banner + trophy;
}

function rewardTile(r: Reward, s: ReturnType<typeof store.get>): string {
  const got = earned(r, s);
  const inUse = (r.kind === "pieces" && s.pieceSet === r.value) || (r.kind === "board" && s.boardTheme === r.value) || (r.kind === "frame" && s.frame === r.value);
  const art = r.kind === "board" ? `<span class="swatch" data-th="${r.value}"><i></i><i></i><i></i><i></i></span>`
    : r.kind === "pieces" ? `<span class="setrow">${pieceHTML("wN", r.value as "A")}${pieceHTML("bQ", r.value as "A")}</span>`
    : avatarHTML(family.current(), `fr-${r.value}`);
  return `<button class="rtile ${got ? "" : "off"} ${inUse ? "on" : ""}" data-reward="${r.id}" aria-pressed="${inUse}">${art}
    <b>${tx(r.name)}</b><small>${inUse ? t("inUse") : got ? t("tapToUse") : tx(r.need)}</small>${got ? "" : `<span class="lockpip">${icon("lock")}</span>`}</button>`;
}

/** Your heroes (DECISIONS #109): the ten virtue heroes (won by beating a level's boss) and the animal heroes (won by
 *  beating that bot). Locked ones show as a dark shape with their level; the one in use is ringed. */
function heroShelf(s: ReturnType<typeof store.get>): string {
  const cur = s.heroAvatar;
  const tile = (id: string, src: string, label: string, got: boolean, sub: string) =>
    `<button class="htile ${got ? "" : "off"} ${cur === id ? "on" : ""}" data-heroav="${id}" aria-pressed="${cur === id}"><img src="${src}" alt="">
      <span>${got ? label : "?"}</span><small>${sub}</small></button>`;
  return `<h2 class="sec">${t("heroesTitle")}</h2><p class="note">${t("heroesNote")}</p>
    <div class="hshelf">${HEROES.map(h => tile(h.id, heroArt(h.id), tx(h.name), hasHero(h.id, s) || unlockAll(), `${t("level")} ${num(h.level)}`)).join("")}</div>
    <div class="hshelf animals">${BOTS.filter(b => !b.beyond).map(b => tile(`bot:${b.id}`, animalHeroArt(b.id), tx(b.name), animalHeroEarned(b.id, s), `~${num(b.rating)}`)).join("")}</div>`;
}

function rewardShelf(s: ReturnType<typeof store.get>): string {
  const got = REWARDS.filter(r => earned(r, s)).length;
  return `<h2 class="sec">${t("rewardsTitle")} <span>${num(got)} / ${num(REWARDS.length)}</span></h2>
    <div class="rshelf">${REWARDS.map(r => rewardTile(r, s)).join("")}</div>`;
}
