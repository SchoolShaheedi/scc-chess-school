// The opening explorer (DECISIONS #85, layout A): for the position on the analysis board, the moves club players chose
// and how each scored, from 600,000 Lichess rated games (January 2025, both players 1200-2200; CC0), built offline by
// tools/build-explorer.mjs. Fetched the first time it is opened, then kept by the service worker.
import { Chess } from "chess.js";
import { count, num, t } from "../i18n";

interface Data { games: number; positions: Record<string, [string, number, number, number][]> }
let dataP: Promise<Data> | null = null;
const load = () => (dataP ??= fetch("explorer/explorer.json").then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Data>; })
  .catch(e => { dataP = null; throw e; }));

export interface ExplorerMove { san: string; uci: string; n: number; white: number; draw: number; black: number; share: number }
/** The explorer's moves for a position (most played first), or null if the position is not in it. */
export async function explore(fen: string): Promise<ExplorerMove[] | null> {
  const list = (await load()).positions[fen.split(" ").slice(0, 4).join(" ")];
  if (!list) return null;
  const total = list.reduce((a, m) => a + m[1], 0);
  return list.map(([uci, n, w, d]) => {
    const g = new Chess(fen), mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return { san: mv.san, uci, n, white: w / n, draw: d / n, black: (n - w - d) / n, share: n / total };
  });
}

const pct = (x: number) => `${num(Math.round(x * 100))}%`;
/** The table: move, how often it is played, games, and a White / Draw / Black bar. Tapping a row plays the move. */
export async function explorerHTML(fen: string): Promise<string> {
  let moves: ExplorerMove[] | null;
  try { moves = await explore(fen); } catch { return `<p class="note">${t("explorerOffline")}</p>`; }
  if (!moves) return `<p class="note">${t("explorerNone")}</p>`;
  const bar = (m: ExplorerMove) => `<div class="wdl"><i class="w" style="flex:${m.white}">${m.white >= .18 ? pct(m.white) : ""}</i>`
    + `<i class="d" style="flex:${Math.max(m.draw, .02)}">${m.draw >= .12 ? pct(m.draw) : ""}</i><i class="b" style="flex:${m.black}">${m.black >= .18 ? pct(m.black) : ""}</i></div>`;
  return `<table class="extable"><tr><th>${t("exMove")}</th><th>${t("exPlayed")}</th><th>${t("exGames")}</th><th>${t("exScore")}</th></tr>
    ${moves.map(m => `<tr data-ex="${m.uci}" tabindex="0" role="button"><td><b>${m.san}</b></td><td class="n">${pct(m.share)}</td><td class="n">${count(m.n)}</td><td class="bar">${bar(m)}</td></tr>`).join("")}</table>
    <p class="note">${t("explorerSource")}</p>`;
}
