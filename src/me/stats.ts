// Stats on the Me tab (DECISIONS #85, layout A): the two ratings with this month's change, one graph of both, results
// per bot and per clock, and the strongest and weakest puzzle themes with a way to practise them.
// Chart colours were checked with the dataviz validator (#16824F + #B0832A on white: all checks pass, with the
// red-weak colour-blind separation at 7.0, so the puzzle line is ALSO dashed and both lines are labelled at the end).
import { BOTS } from "../bots/bots";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { THEMES } from "../puzzles/bank";
import { store, today } from "../store";

const PLAY = "#16824F", PUZ = "#B0832A";
const DAYS = 90;
type Series = { name: string; colour: string; dash: boolean; pts: [string, number][] };

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("en-CA"); };
const dayIndex = (date: string) => Math.round((Date.parse(date) - Date.parse(daysAgo(DAYS))) / 86400000);
/** The change over the last 30 days: now minus the last point on or before 30 days ago (or the first point after it). */
function monthChange(pts: [string, number][]): number | null {
  if (pts.length < 2) return null;
  const cut = daysAgo(30), before = pts.filter(p => p[0] <= cut).at(-1) ?? pts.find(p => p[0] > cut)!;
  return pts.at(-1)![1] - before[1];
}

function chart(series: Series[]): string {
  const W = 340, H = 170, L = 34, R = 46, T = 10, B = 22;
  const all = series.flatMap(s => s.pts.map(p => p[1]));
  const lo = Math.floor((Math.min(...all) - 20) / 100) * 100, hi = Math.ceil((Math.max(...all) + 20) / 100) * 100;
  const x = (d: string) => L + (Math.max(0, dayIndex(d)) / DAYS) * (W - L - R), y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const step = hi - lo > 600 ? 200 : 100;
  let out = "";
  for (let v = lo; v <= hi; v += step) out += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 4}" y="${y(v) + 4}" text-anchor="end" class="ax">${num(v)}</text>`;
  for (const s of series) {
    if (!s.pts.length) continue;
    const pts = s.pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const [ld, lv] = s.pts.at(-1)!;
    out += `<polyline points="${pts}" fill="none" stroke="${s.colour}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ""}/>`
      + `<circle cx="${x(ld)}" cy="${y(lv)}" r="4" fill="${s.colour}" stroke="#fff" stroke-width="2"/>`
      + `<text x="${x(ld) + 7}" y="${y(lv) + 4}" class="end">${num(lv)}</text>`;
  }
  out += `<text x="${L}" y="${H - 4}" class="ax">${t("graphStart")}</text><text x="${W - R}" y="${H - 4}" text-anchor="end" class="ax">${t("graphToday")}</text>`;
  out += `<line class="xhair" y1="${T}" y2="${H - B}" x1="-10" x2="-10"/>`;
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" class="ratingchart" role="img" aria-label="${t("ratingGraph")}"
    data-geo="${L},${W - R},${DAYS}">${out}</svg><div class="tip" hidden></div></div>`;
}

const tcName = (k: string) => k === "none" ? t("clockNone") : k.includes("+") ? k.split("+").map(n => num(+n)).join(" + ") : `${num(+k)} ${t("minutes")}`;
function resultTable(rows: [string, [number, number, number]][]): string {
  const bar = ([w, l, d]: [number, number, number]) => `<div class="sbar">${w ? `<i style="flex:${w}" class="w"></i>` : ""}${d ? `<i style="flex:${d}" class="d"></i>` : ""}${l ? `<i style="flex:${l}" class="l"></i>` : ""}</div>`;
  return `<table class="restable"><tr><th></th><th>${t("resWon")}</th><th>${t("resDraw")}</th><th>${t("resLost")}</th><th></th></tr>
    ${rows.map(([name, r]) => `<tr><td>${name}</td><td class="n">${num(r[0])}</td><td class="n">${num(r[2])}</td><td class="n">${num(r[1])}</td><td class="b">${bar(r)}</td></tr>`).join("")}</table>`;
}

export function statsHTML(): string {
  const s = store.get(), young = s.look === "young", res = s.results ?? {}, hist = s.hist ?? { play: [], puz: [] };
  const recent = (pts: [string, number][]) => pts.filter(p => p[0] >= daysAgo(DAYS));
  let html = "";
  if (!young) {
    const pr = s.prating ?? s.rating;
    const kpi = (label: string, r: number, ch: number | null) => `<div><small>${label}</small><b>${num(r)}</b>
      ${ch === null ? "" : `<em class="${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "▲" : "▼"} ${t("thisMonth").replace("{n}", num(Math.abs(ch)))}</em>`}</div>`;
    html += `<div class="kpis">${kpi(t("playRating"), s.rating.r, monthChange(hist.play))}${kpi(t("puzzleRating"), pr.r, monthChange(hist.puz))}</div>`;
    const series: Series[] = [
      { name: t("legendPlay"), colour: PLAY, dash: false, pts: recent(hist.play) },
      { name: t("legendPuz"), colour: PUZ, dash: true, pts: recent(hist.puz) },
    ];
    html += `<h3 class="sub">${t("ratingGraph")}</h3>`;
    html += series.some(x => x.pts.length >= 2)
      ? `<div class="leg"><span><i style="background:${PLAY}"></i>${t("legendPlay")}</span><span><i class="dash" style="border-color:${PUZ}"></i>${t("legendPuz")}</span></div>${chart(series)}`
      : `<p class="note">${t("graphEmpty")}</p>`;
  }
  const bots = BOTS.filter(b => res[`bot:${b.id}`]).map(b => [`${tx(b.name)} <small>~${num(b.rating)}</small>`, res[`bot:${b.id}`]] as [string, [number, number, number]]);
  const tcs = ["none", "10", "5", "3+2"].filter(k => res[`tc:${k}`]).map(k => [tcName(k), res[`tc:${k}`]] as [string, [number, number, number]]);
  if (bots.length) html += `<h3 class="sub">${t("resultsBots")}</h3>${resultTable(bots)}`;
  if (tcs.length > 1 || tcs.some(([n]) => n !== t("clockNone"))) html += `<h3 class="sub">${t("resultsClock")}</h3>${resultTable(tcs)}`;
  // themes with at least 5 puzzles tried; strongest 3 and weakest 3 (a theme is never in both)
  const ts = s.themeStats ?? {};
  const rated = THEMES.filter(x => (ts[x.id]?.[0] ?? 0) >= 5).map(x => ({ ...x, n: ts[x.id][0], pct: Math.round((ts[x.id][1] / ts[x.id][0]) * 100) }));
  html += `<h3 class="sub">${t("themesTitle")}</h3>`;
  if (rated.length < 2) html += `<p class="note">${t("themesNeedMore")}</p>`;
  else {
    const byPct = [...rated].sort((a, b) => b.pct - a.pct), strong = byPct.slice(0, 3), weak = byPct.slice(3).reverse().slice(0, 3);
    const chip = (x: (typeof rated)[number], practise: boolean) => `<div class="tchip"><b>${tx(x.name)}</b><span>${t("pctOf").replace("{p}", num(x.pct)).replace("{n}", num(x.n))}</span>
      ${practise ? `<button class="btn small" data-practise="${x.id}">${t("practise")}</button>` : ""}</div>`;
    html += `<div class="tcol"><div><small class="lab good">${icon("ok")} ${t("themesStrong")}</small>${strong.map(x => chip(x, false)).join("")}</div>
      ${weak.length ? `<div><small class="lab weak">${icon("target")} ${t("themesWeak")}</small>${weak.map(x => chip(x, true)).join("")}</div>` : ""}</div>`;
  }
  return `<section class="stats">${html}</section>`;
}

/** The graph's tooltip (tap or hover anywhere on it: the nearest day's ratings) and the Practise buttons. */
export function wireStats(root: HTMLElement, go: (h: string) => void) {
  root.querySelectorAll<HTMLButtonElement>("[data-practise]").forEach(b => b.onclick = () => go(`#/puzzles/theme/${b.dataset.practise}`));
  const svg = root.querySelector<SVGSVGElement>(".ratingchart"); if (!svg) return;
  const tip = root.querySelector<HTMLElement>(".chartbox .tip")!, hair = svg.querySelector<SVGLineElement>(".xhair")!;
  const [L, Rx, days] = svg.dataset.geo!.split(",").map(Number);
  const hist = store.get().hist ?? { play: [], puz: [] };
  const valueOn = (pts: [string, number][], d: string) => pts.filter(p => p[0] <= d).at(-1)?.[1];
  const show = (e: PointerEvent) => {
    const box = svg.getBoundingClientRect(), vx = ((e.clientX - box.left) / box.width) * svg.viewBox.baseVal.width;
    if (vx < L || vx > Rx) { tip.hidden = true; hair.setAttribute("x1", "-10"); hair.setAttribute("x2", "-10"); return; }
    const day = Math.round(((vx - L) / (Rx - L)) * days), d = new Date(); d.setDate(d.getDate() - (days - day));
    const date = d.toLocaleDateString("en-CA"), p = valueOn(hist.play, date), q = valueOn(hist.puz, date);
    if (p === undefined && q === undefined) { tip.hidden = true; return; }
    hair.setAttribute("x1", String(vx)); hair.setAttribute("x2", String(vx));
    tip.innerHTML = `<b>${date === today() ? t("graphToday") : d.toLocaleDateString(store.get().lang === "pa" ? "pa-IN" : "en-GB", { day: "numeric", month: "short" })}</b>
      ${p !== undefined ? `<span><i style="background:${PLAY}"></i>${t("legendPlay")} ${num(p)}</span>` : ""}${q !== undefined ? `<span><i class="dash" style="border-color:${PUZ}"></i>${t("legendPuz")} ${num(q)}</span>` : ""}`;
    tip.hidden = false;
    tip.style.left = `${Math.min(box.width - 150, Math.max(0, e.clientX - box.left - 60))}px`;
  };
  svg.addEventListener("pointermove", show);
  svg.addEventListener("pointerdown", show);
  svg.addEventListener("pointerleave", () => { tip.hidden = true; hair.setAttribute("x1", "-10"); hair.setAttribute("x2", "-10"); });
}
