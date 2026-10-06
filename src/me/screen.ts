// The "Me" page (DECISIONS #76): rank and XP, the streak calendar, the trophy room and a few numbers.
// Settings sit behind the gear at the top.
import { family } from "../family";
import { avatarHTML } from "./family";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { store, today } from "../store";
import { tabbar } from "../tabbar";
import { games } from "../play/history";
import { statsHTML, wireStats } from "./stats";
import { myPlayer, signedIn } from "../online/api";
import { setLastGame } from "../review/screen";
import { rankOf, trophies } from "./trophies";

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
      <button class="meav kidswitch" data-family aria-label="${t("famTitle")}">${avatarHTML(family.current(), "big")}<span class="swap">${icon("users")}</span></button>
      <h1>${tx(r.name)}</h1>
      <div class="xpbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <small>${r.next ? t("meToNext").replace("{x}", num(s.xp)).replace("{n}", num(r.next)) : `${num(s.xp)} ${t("xp")}`}</small>
    </header>
    <h2 class="sec">${t("meMonth")} <span>${icon("flame")} ${num(s.streak.days)}</span></h2>
    <div class="cal" aria-label="${t("meMonth")}">${days.map(d => `<i class="${active.has(d) ? "y" : ""} ${d === today() ? "t" : ""}" title="${d}"></i>`).join("")}</div>
    <h2 class="sec">${t("meTrophies")} <span>${num(got)} / ${num(tr.length)}</span></h2>
    <div class="troph">${tr.map(x => `<div class="trp ${x.got ? "" : "off"}"><span class="c">${icon(x.got ? x.icon : "lock")}</span>${tx(x.name)}</div>`).join("")}</div>
    <h2 class="sec">${t("meNumbers")}</h2>
    <div class="numrow">
      <div><b>${num(Object.keys(s.lessons).length)}</b><small>${t("lessons")}</small></div>
      <div><b>${num(stars)}</b><small>${t("meStars")}</small></div>
      <div><b>${num(wins)}</b><small>${t("meWins")}</small></div>
    </div>
    <h2 class="sec">${t("statsTitle")}</h2>
    ${statsHTML()}
    <div data-onlineratings></div>
    <h2 class="sec">${t("meGames")} <span>${num(list.length)}</span></h2>
    ${list.length ? `<div class="gamelist">${list.slice(0, 20).map((g, i) => `<button class="gamerow" data-game="${i}">
      <span class="res ${g.result}">${t(g.result === "won" ? "resWon" : g.result === "lost" ? "resLost" : "resDraw")}</span>
      <span class="grow"><b>${t("vsWord")} ${tx(g.opp)}${g.oppRating ? ` ~${num(g.oppRating)}` : ""}</b>
        <small>${new Date(g.at).toLocaleDateString(s.lang === "pa" ? "pa-IN" : "en-GB", { day: "numeric", month: "short" })} · ${g.tc ? (g.tc.includes("+") ? g.tc.split("+").map(x => num(+x)).join(" + ") : `${num(+g.tc)} ${t("minutes")}`) : t("untimed")} · ${num(Math.ceil(g.uci.length / 2))} ${t("movesWord")}</small></span>
      ${icon("arrowRight")}</button>`).join("")}</div>` : `<p class="note">${t("gamesNone")}</p>`}
  </div>${tabbar("me")}`;
  root.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(b => b.onclick = () => {
    const g = list[+b.dataset.game!];
    setLastGame({ uci: g.uci, me: g.me, meName: g.meName, botName: g.opp, back: "#/me", startFen: g.startFen });
    go("#/review");
  });
  root.querySelector<HTMLButtonElement>("[data-settings]")!.onclick = () => go("#/settings");
  wireStats(root, go);
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
