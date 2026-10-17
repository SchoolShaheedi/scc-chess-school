// Magical Chess's on-board pieces, shared by the bot game (power/screen.ts) and the online game (online/screens.ts):
// the gold gems, the "change or stay" bubble at the piece, and the gold burst of a change (DECISIONS #99, look A).
import type { Square } from "chess.js";
import { t } from "../i18n";
import type { Orb, OrbPiece } from "./rules";

export const gemPiece = (p: OrbPiece) => `<img class="gp" src="art/pieces/cburnett/w${p.toUpperCase()}.svg" alt="" draggable="false">`;
export const pieceWord = (p: string) => t(`pc${p.toUpperCase()}` as Parameters<typeof t>[0]);
/** The gems as board decoration (Board's `decor` marks). */
export const gemDecor = (orbs: Orb[]) => Object.fromEntries(orbs.map(o => [o.sq, `<span class="orbgem">${gemPiece(o.piece)}</span>`]));

/** The gold burst of a change: added once to the square, not part of the board's marks, so a redraw never replays it. */
export function burstAt(wrap: HTMLElement, sq: Square) {
  const cell = wrap.querySelector<HTMLElement>(`[data-sq="${sq}"]`);
  if (!cell) return;
  const b = document.createElement("span"); b.className = "tburst"; cell.appendChild(b);
  setTimeout(() => b.remove(), 1000);
}

/** The choice, asked the moment a piece lands on a gem: change into the gem's piece, or stay as it is. `bubble` is
 *  a `.usebubble` inside the board's wrapper (`wrap`, which needs the class `powerwrap`). */
export function askChange(wrap: HTMLElement, bubble: HTMLElement, sq: Square, from: string, to: OrbPiece): Promise<boolean> {
  return new Promise(resolve => {
    bubble.innerHTML = `<span>${t("powerBecome").replace("{orb}", pieceWord(to))}<small>${t("powerOnce")}</small></span>
      <div class="ubtns"><button data-yes>✨ ${t("powerYes")}</button><button class="stay" data-no>${t("powerStay").replace("{piece}", pieceWord(from))}</button></div>`;
    bubble.hidden = false;
    const cell = wrap.querySelector<HTMLElement>(`[data-sq="${sq}"]`)!, wr = wrap.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    // centred on the square but kept inside the board (its tail still points at the square); below the square,
    // since pieces move up the screen, unless the square is on the bottom row
    const cx = cr.left - wr.left + cr.width / 2, half = bubble.offsetWidth / 2;
    const x = Math.min(Math.max(cx, half + 4), wr.width - half - 4);
    const below = cr.bottom - wr.top < wr.height - cr.height / 2;
    bubble.style.left = `${x}px`;
    bubble.style.setProperty("--tail", `${cx - x}px`);
    bubble.style.top = below ? `${cr.bottom - wr.top + 6}px` : "";
    bubble.style.bottom = below ? "" : `${wr.bottom - cr.top + 6}px`;
    bubble.classList.toggle("below", below);
    const done = (yes: boolean) => { bubble.hidden = true; resolve(yes); };
    bubble.querySelector<HTMLButtonElement>("[data-yes]")!.onclick = () => done(true);
    bubble.querySelector<HTMLButtonElement>("[data-no]")!.onclick = () => done(false);
  });
}
