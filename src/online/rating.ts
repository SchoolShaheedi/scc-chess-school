// My online ratings (chess.com's stats page): a rating for each speed with its "?" while provisional, a graph, wins /
// draws / losses, the best rating and the game history with a Review link. Grown-ups' ratings come from stranger games;
// a child's from friend and class games, in a separate pool (supabase/online_ratings.sql).
import { num, t } from "../i18n";
import { icon } from "../icons";
import { avatarHTML } from "../me/family";
import { setLastGame } from "../review/screen";
import { type Category, CATEGORIES } from "./matching";
import { deltaText } from "./glicko";
import { ratingGraph } from "./graph";
import { getGame, type HistoryRow, myPlayer, ratingHistory, ratingSummary, signedIn } from "./api";
import { catName } from "./play";

type Go = (h: string) => void;
let cat: Category = "blitz";
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;

function graphSVG(history: HistoryRow[]): string {
  const series = [...history].reverse().map(h => h.rating);   // oldest first
  if (series.length < 2) return "";
  const g = ratingGraph(series), last = g.points[g.points.length - 1];
  return `<figure class="rgraph"><svg viewBox="0 0 300 120" role="img" aria-label="${t("rtGraph")}" preserveAspectRatio="none">
    <path d="${g.path}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="currentColor"/></svg>
    <figcaption><span>${num(g.max)}</span><span>${num(g.min)}</span></figcaption></figure>`;
}

export function ratingScreen(root: HTMLElement, go: Go): () => void {
  let alive = true, seq = 0;
  const draw = async () => {
    const my = ++seq;
    root.innerHTML = `<div class="screen">${bar(t("rtTitle"))}<p class="muted">${t("loading")}</p></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
    if (!signedIn()) return go("#/online");
    const me = await myPlayer(); if (!alive || my !== seq) return;
    if (!me) return go("#/online");
    const [rows, hist] = await Promise.all([ratingSummary(me.id), ratingHistory(me.id, cat, 100)]);
    if (!alive || my !== seq) return;                      // a newer tab press has already drawn
    const r = rows.find(x => x.category === cat);
    const games = hist.filter(h => h.game);
    root.innerHTML = `<div class="screen">${bar(t("rtTitle"))}
      <div class="seg" role="group">${CATEGORIES.map(c => `<button data-cat="${c}" aria-pressed="${cat === c}">${catName(c)}</button>`).join("")}</div>
      <div class="stats"><div class="kpis">
        <div><small>${t("ratingLabel")}</small><b>${num(r?.rating ?? 1200)}${r?.provisional ? "?" : ""}</b><em>${num(r?.games ?? 0)} ${t("adultGames")}</em></div>
        <div><small>${t("rtBest")}</small><b>${num(r?.best ?? 1200)}</b></div></div>
        <div class="kpis"><div><small>${t("rtWins")}</small><b>${num(r?.wins ?? 0)}</b></div><div><small>${t("rtDraws")}</small><b>${num(r?.draws ?? 0)}</b></div>
          <div><small>${t("rtLosses")}</small><b>${num(r?.losses ?? 0)}</b></div></div></div>
      ${r?.provisional ? `<p class="note">${t("rtProvisional")}</p>` : ""}
      <p class="note">${me.adult ? t("rtPoolAdult") : t("rtPoolChild")}</p>
      ${graphSVG(hist)}
      <h2 class="sec">${t("rtHistory")}</h2>
      ${games.length ? games.map((h, i) => `<div class="botcard">${avatarHTML({ avatar: h.opp_avatar ?? "cat", colour: h.opp_colour ?? "#9AA39E" })}
        <span class="grow"><b>${h.result === "w" ? t("gameWon") : h.result === "l" ? t("onlineLost") : t("gameDrawn")}
          <span class="delta ${h.delta >= 0 ? "up" : "down"}">${deltaText(h.delta)}</span></b>
          <small>${h.opp_rating != null ? `${num(h.opp_rating)} · ` : ""}${new Date(h.at).toLocaleDateString()}</small></span>
        ${h.moves >= 2 ? `<button class="btn ghost" data-review="${i}">${icon("target")} ${t("reviewTitle")}</button>` : ""}</div>`).join("") : `<p class="note">${t("rtNone")}</p>`}</div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
    root.querySelectorAll<HTMLButtonElement>("[data-cat]").forEach(b => b.onclick = () => { cat = b.dataset.cat as Category; void draw(); });
    root.querySelectorAll<HTMLButtonElement>("[data-review]").forEach(b => b.onclick = async () => {
      const h = games[+b.dataset.review!]; const g = h?.game ? await getGame(h.game) : null;
      if (!g || !alive) return;
      setLastGame({ uci: g.moves, me: h.side ?? "w", botName: { en: "Online opponent", pa: "ਔਨਲਾਈਨ ਵਿਰੋਧੀ" }, back: "#/online/rating" });
      go("#/review");
    });
  };
  void draw();
  return () => { alive = false; };
}
