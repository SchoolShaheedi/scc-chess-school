// Share a game as a picture (DECISIONS #115, option A, the square card): the final board, the result, the opponent,
// the number of moves and the date, under the SWC mark, with the learner's ANIMAL and colour. No names anywhere, and
// never a hero picture (heroes stay on the learner's own screens, #109). Drawn on a canvas in the browser and handed
// to the phone's share sheet, or saved as a file where sharing files isn't possible.
import { family } from "../family";
import type { Avatar } from "../family";
import { num, t } from "../i18n";
import { icon } from "../icons";
import type { Text } from "../lesson/types";
import { store } from "../store";
import { FILES, type Placement } from "../chess/types";

export interface ShareGame { pos: Placement; lastMove?: [string, string]; flip: boolean; result: "won" | "lost" | "draw"; how: string; opp: Text; moves: number }

/** The card's two lines of words. Pure, so it is tested (test/share.test.ts). */
export function shareLines(g: Pick<ShareGame, "result" | "how" | "opp" | "moves">, date: Date, lang: "en" | "pa", tr: (k: "shareWon" | "shareLost" | "shareDraw" | "shareSub") => string, n: (x: number | string) => string): [string, string] {
  const head = tr(g.result === "won" ? "shareWon" : g.result === "lost" ? "shareLost" : "shareDraw").replace("{how}", g.how);
  const day = date.toLocaleDateString(lang === "pa" ? "pa-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return [head, tr("shareSub").replace("{opp}", g.opp[lang]).replace("{n}", n(g.moves)).replace("{date}", n(day))];
}

const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const svgImage = (svg: string, colour: string) => {
  // a standalone SVG needs its namespace once (Lucide's already has it) and a real size instead of 1em
  const fixed = (svg.includes("xmlns=") ? svg : svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))
    .replace(/currentColor/g, colour).replace(/width="1em" height="1em"/, 'width="96" height="96"');
  return load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(fixed)}`);
};

/** Draw the 1080 × 1080 card. */
export async function drawCard(g: ShareGame): Promise<HTMLCanvasElement> {
  const S = 1080, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d")!, css = getComputedStyle(document.documentElement);
  const font = css.getPropertyValue("--font").trim() || "system-ui, sans-serif";
  const bg = x.createLinearGradient(0, 0, S, S); bg.addColorStop(0, "#1E1B16"); bg.addColorStop(1, "#0F0E0C");
  x.fillStyle = bg; x.fillRect(0, 0, S, S);
  // the SWC mark and the school's name
  try { const m = await load("art/swc-mark.webp"); x.drawImage(m, 60, 40, 84 * m.width / m.height, 84); } catch { /* the card still works without it */ }
  x.fillStyle = "#F0C048"; x.font = `800 40px ${font}`; x.textBaseline = "middle"; x.fillText(t("shareBrand"), 200, 84);
  // the board, in the learner's own board colours and pieces (the vector set falls back to the open set)
  const B = 760, ox = (S - B) / 2, oy = 150, q = B / 8;
  const light = css.getPropertyValue("--bl").trim() || "#EFE4CF", dark = css.getPropertyValue("--bd").trim() || "#98744F";
  const set = store.get().pieceSet, ext = ["cburnett", "merida", "chessnut", "spatial"].includes(set) ? "svg" : "webp", dir = set === "V" ? "cburnett" : set;
  x.fillStyle = "#3A2A1A"; x.fillRect(ox - 12, oy - 12, B + 24, B + 24);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const file = g.flip ? 7 - f : f, rank = g.flip ? r : 7 - r, sq = FILES[file] + (rank + 1);
    x.fillStyle = (file + rank) % 2 === 1 ? light : dark; x.fillRect(ox + f * q, oy + r * q, q, q);
    if (g.lastMove?.includes(sq)) { x.fillStyle = "rgba(240,192,72,.45)"; x.fillRect(ox + f * q, oy + r * q, q, q); }
    const p = g.pos[sq];
    if (p) try { x.drawImage(await load(`art/pieces/${set === "V" ? "cburnett" : dir}/${p}.${set === "V" ? "svg" : ext}`), ox + f * q + q * .04, oy + r * q + q * .04, q * .92, q * .92); } catch { /* a missing piece image */ }
  }
  // the learner's animal in their colour, then the result and the details
  const me = family.current(), ay = oy + B + 92;
  x.fillStyle = me.colour; x.beginPath(); x.arc(110, ay, 50, 0, Math.PI * 2); x.fill();
  try { x.drawImage(await svgImage(icon(me.avatar as Avatar), "#FFFFFF"), 80, ay - 30, 60, 60); } catch { /* no icon */ }
  const [head, sub] = shareLines(g, new Date(), store.get().lang, k => t(k), num);
  x.textBaseline = "alphabetic"; x.fillStyle = "#F2EBDD"; x.font = `800 48px ${font}`; x.fillText(head, 190, ay - 4, S - 250);
  x.fillStyle = "#A79E8E"; x.font = `500 32px ${font}`; x.fillText(sub, 190, ay + 42, S - 250);
  return c;
}

/** Share the card, or save it where sharing a file isn't possible. Resolves to how it went. */
export async function shareCard(g: ShareGame): Promise<"shared" | "saved" | "cancelled"> {
  const canvas = await drawCard(g);
  const blob = await new Promise<Blob>(ok => canvas.toBlob(b => ok(b!), "image/png"));
  const file = new File([blob], "chess-game.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t("shareBrand") }); return "shared"; } catch { return "cancelled"; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "saved";
}

/** The button for a result card. */
export const shareButton = () => `<button class="linkbtn" data-share>${icon("share")} ${t("shareBtn")}</button>`;
/** Wire every share button inside `root`; the card is built only when one is tapped. */
export function wireShare(root: HTMLElement, game: () => ShareGame) {
  root.querySelectorAll<HTMLButtonElement>("[data-share]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    const how = await shareCard(game()).catch(() => "cancelled" as const);
    b.disabled = false;
    if (how === "saved") b.innerHTML = `${icon("check")} ${t("shareSaved")}`;
  });
}
