// Insights screen (DECISIONS #113, look A): one page, coach first. The coach's summary and one thing to practise,
// then results by opening, accuracy by game phase, and accuracy by thinking time, each with simple bars.
// Games are graded by Stockfish when the page is opened (only the ones not graded before), and each game's grades
// are remembered on this device, beside the game list (play/history.ts), so a game is only ever looked at once.
import { Chess } from "chess.js";
import { family } from "../family";
import { getEngine } from "../engine/browser";
import type { Score } from "../engine/uci";
import { num, t, tx, UI, type UIKey } from "../i18n";
import { icon } from "../icons";
import { coachHTML } from "../coach";
import { LEVELS } from "../content/levels";
import { courseOpening } from "../content/course";
import { games, type SavedGame } from "../play/history";
import { grade } from "../review/grade";
import { DepthGovernor, INSIGHTS_BUDGET_MS, INSIGHTS_DEPTH } from "../review/depth";
import { mineDue } from "../puzzles/due";
import { store } from "../store";
import NAMES from "../content/opening-names.json";
import { openingsReport } from "./openings-report";
import { type Band, byOpening, byPhase, byTime, myMoves, type MyMove, type Phase, replay, summarise } from "./insights";

// sign-out on a shared device wipes these with the games (history.ts forgetGames)
const key = () => `scc-insights-${family.current().id}`;
/** Each game's drop for every ply, by the time the game ended (SavedGame.at). */
function cache(): Record<string, number[]> {
  try { return JSON.parse(localStorage.getItem(key()) ?? "{}") as Record<string, number[]>; } catch { return {}; }
}
function keep(c: Record<string, number[]>) {
  const live = new Set(games().map(g => g.at));   // a game that dropped off the list of 50 takes its grades with it
  try { localStorage.setItem(key(), JSON.stringify(Object.fromEntries(Object.entries(c).filter(([at]) => live.has(at))))); } catch { /* full or blocked */ }
}

/** Where each weak phase is taught: openings at Level 6, tactics (the middlegame) at Level 4, endgames at Level 5. */
const PRACTISE: Record<Phase, number> = { opening: 6, middlegame: 4, endgame: 5 };
const GREEN = "#81B64C", GREY = "#8A847A", RED = "#E06A4A", GOLD = "#F0C048";
const tone = (a: number) => a >= 80 ? GREEN : a >= 65 ? GOLD : RED;
const words = (k: string) => UI[k as UIKey];
const nGames = (n: number) => n === 1 ? t("insGame1") : t("insGamesN").replace("{n}", num(n));

export function insightsScreen(root: HTMLElement, go: (h: string) => void, lessonFor: (level: number) => string | null): () => void {
  let alive = true;
  const teardown = () => { alive = false; };
  const back = "#/me";
  const bar = `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${t("insTitle")}</h1></div>`;
  const list = games(), graded = cache();
  const todo = list.filter(g => !graded[g.at] && g.uci.length >= 4);

  if (!todo.length) { render(); return teardown; }
  root.innerHTML = `<div class="screen">${bar}<div class="hero"><div class="trophy light">${icon("chart")}</div>
    <h1>${t("insAnalysing")}</h1><div class="testbar wide"><i data-prog style="width:0%"></i></div><p data-count></p></div></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
  void (async () => {
    const engine = await getEngine();
    for (let k = 0; k < todo.length; k++) {
      if (!alive) return;
      const c = root.querySelector("[data-count]"); if (c) c.textContent = t("insAnalysingN").replace("{a}", num(k + 1)).replace("{b}", num(todo.length));
      const g = todo[k], { fens, sans, ucis } = replay(g), last = new Chess(fens[fens.length - 1]);
      const evals: { score: Score; best: string }[] = [];
      // depth 12, governed per game so a slow phone finishes each one in about INSIGHTS_BUDGET_MS (review/depth.ts)
      const gov = new DepthGovernor(fens.length - (last.isGameOver() ? 1 : 0), INSIGHTS_DEPTH, INSIGHTS_BUDGET_MS);
      for (let i = 0; i < fens.length; i++) {
        if (!alive) return;
        if (i === fens.length - 1 && last.isGameOver()) { evals.push({ score: last.isCheckmate() ? { mate: 0 } : { cp: 0 }, best: "" }); continue; }
        const depth = gov.next(), t0 = performance.now();
        const cands = await engine.candidates(fens[i], { n: 1, depth });
        gov.record(depth, performance.now() - t0);
        evals.push(cands.length ? { score: cands[0].score, best: cands[0].move } : { score: { cp: 0 }, best: "" });
      }
      const drops = grade(sans.map((san, i) => ({ san, uci: ucis[i] })), evals, new Chess(fens[0]).turn()).map(m => Math.round(m.drop * 10) / 10);
      graded[g.at] = drops; keep(graded);   // remembered game by game, so leaving half-way loses nothing
      const p = root.querySelector<HTMLElement>("[data-prog]"); if (p) p.style.width = `${((k + 1) / todo.length) * 100}%`;
    }
    if (alive) render();
  })();
  return teardown;

  function render() {
    const look = store.get().look, mine: MyMove[] = [];
    const done: SavedGame[] = list.filter(g => graded[g.at]);
    for (const g of done) mine.push(...myMoves(g, graded[g.at]));
    const yours = openingsReport(list, NAMES as Record<string, string>), cName = (id: string) => tx(courseOpening(id)!.name);
    const openings = byOpening(list, NAMES as Record<string, string>), phases = byPhase(mine), time = byTime(mine);
    const s = summarise(phases, time), ph = (p: Phase) => t(`insPh_${p}` as UIKey);
    const lower = (x: string) => store.get().lang === "en" ? x.toLowerCase() : x;

    // the coach's words: the weak phase (or that play is even), then the rushed time band; one thing to practise
    let say = "";
    if (done.length < 3) say = `<p>${t("insFew")}</p>`;
    else {
      say = `<p>${s.weak ? t("insWeak").replace("{weak}", lower(ph(s.weak.phase))).replace("{a}", num(s.weak.acc)).replace("{strong}", lower(ph(s.strong!.phase))).replace("{b}", num(s.strong!.acc)) : t("insEven")}`
        + `${s.rushed ? ` ${t(`insRush_${s.rushed.band}` as UIKey).replace("{a}", num(s.rushed.acc))}${s.rushed.band === "fast" ? ` ${t("insSlowDown")}` : ""}` : ""}</p>`;
    }
    const lv = s.weak ? PRACTISE[s.weak.phase] : null, to = lv ? lessonFor(lv) : null;
    // your own mistakes first: drills from your reviewed games, for the weak phase when there are any, else any phase;
    // with none due, the old route to the level that teaches the weak phase
    const mineHere = s.weak ? mineDue(s.weak.phase) : 0, mineAll = mineDue();
    const drillPhase = mineHere ? s.weak!.phase : mineAll ? undefined : null;
    const practise = drillPhase !== null
      ? `<button class="inspractise" data-practise><span class="grow"><small>${t("insPractise")}</small><b>${t("insMineTitle")} · ${t("insMineN").replace("{n}", num(mineHere || mineAll))}</b></span>${icon("chevronRight")}</button>`
      : lv && to ? `<button class="inspractise" data-practise><span class="grow"><small>${t("insPractise")}</small><b>${t("level")} ${num(lv)} · ${tx(LEVELS[lv - 1].title)}</b></span>${icon("chevronRight")}</button>` : "";
    const coachName = look === "young" ? { en: "Ghuggi", pa: "ਘੁੱਗੀ" } : words(store.get().coach === "kaur" ? "coachKaur" : "coachSingh");

    const wdl = (w: number, d: number, l: number) => { const n = w + d + l || 1;
      return `<div class="inswdl" aria-hidden="true"><i style="width:${(w / n) * 100}%;background:${GREEN}"></i><i style="width:${(d / n) * 100}%;background:${GREY}"></i><i style="width:${(l / n) * 100}%;background:${RED}"></i></div>`; };
    const barRow = (label: string, a: number | null, sub = "") => `<div class="insrow"><span>${label}</span>
      ${a === null ? `<em>${t("insTooFew")}</em>` : `<div class="insbar"><i style="width:${a}%;background:${tone(a)}"></i></div><b>${num(a)}%</b>`}${sub ? `<small>${sub}</small>` : ""}</div>`;

    root.innerHTML = `<div class="screen insights">${bar}
      <p class="inscount">${nGames(list.length)}</p>
      <div class="revreport">${look !== "adult" ? `<div class="av">${coachHTML(look, "happy")}</div>` : ""}
        <div class="grow">${look !== "adult" ? `<span class="who">${tx(coachName)}</span>` : ""}${say}</div></div>
      ${practise}
      <h2 class="sec">${t("insOpenings")}</h2>
      <div class="inscard">${openings.length ? openings.map(o => `<div class="insopen"><span class="grow"><b>${o.name}</b><small>${nGames(o.games)}</small></span>
        ${wdl(o.won, o.drawn, o.lost)}<b class="pct">${num(o.score)}%</b></div>`).join("")
        + `<div class="inslegend"><span><i style="background:${GREEN}"></i>${t("resWon")}</span><span><i style="background:${GREY}"></i>${t("resDraw")}</span><span><i style="background:${RED}"></i>${t("resLost")}</span></div>`
        : `<p class="note">${t("insNoOpenings")}</p>`}</div>
      <h2 class="sec">${t("insYourOpenings")}</h2>
      <div class="inscard">${yours.length ? `<p class="note">${t("insYoursNote")}</p>` + yours.map(o => `<div class="insyours ${o.practise ? "worst" : ""}"><div class="insopen"><span class="grow"><b>${o.name}</b><small>${nGames(o.games)} · ${num(o.won)} ${t("resWon")} · ${num(o.drawn)} ${t("resDraw")} · ${num(o.lost)} ${t("resLost")}</small></span>
        ${wdl(o.won, o.drawn, o.lost)}<b class="pct">${num(o.score)}%</b></div>
        ${o.practise ? `<span class="insflag">${icon("hint")} ${t("insPractiseThis")}</span>` : ""}
        ${o.small ? `<small class="note">${t("insSmallSample").replace("{n}", num(o.games))}</small>` : ""}
        ${o.courseId ? `<button class="inslink" data-learn="${o.courseId}" aria-label="${t("insLearnIt")}: ${cName(o.courseId)}"><span class="grow">${t("insLearnIt")} · ${cName(o.courseId)}</span>${icon("chevronRight")}</button>` : ""}</div>`).join("")
        : `<p class="note">${t("insYoursNone")}</p>`}</div>
      <h2 class="sec">${t("insPhases")}</h2>
      <div class="inscard">${(["opening", "middlegame", "endgame"] as Phase[]).map(p => barRow(ph(p), phases[p])).join("")}</div>
      <h2 class="sec">${t("insTime")}</h2>
      <div class="inscard">${time ? (["fast", "mid", "slow"] as Band[]).map(b => barRow(t(`insBand_${b}` as UIKey), time[b].accuracy, t("insShare").replace("{n}", num(time[b].share)))).join("")
        : `<p class="note">${t("insTimeNone")}</p>`}</div>
    </div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    root.querySelectorAll<HTMLButtonElement>("[data-learn]").forEach(b => b.onclick = () => go(`#/openings/o/${b.dataset.learn}`));
    root.querySelector<HTMLButtonElement>("[data-practise]")?.addEventListener("click", () => go(drillPhase !== null ? `#/puzzles/bank${drillPhase ? `/${drillPhase}` : ""}` : to!));
  }
}
