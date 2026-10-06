// Piece art. The four illustrated sets are the user's artwork (3_Sikh_Chess_Championship/images/),
// cut into single WebPs by tools/slice-art.py into public/art/pieces/<set>/. "V" is the original
// in-code vector set from the prototype, kept as a tiny fallback and as a plain option.
import { store } from "../store";
import type { PieceCode } from "./types";

export const PIECE_SETS = ["A", "C", "B", "B2", "V", "cburnett", "merida", "chessnut", "spatial"] as const;
/** Open-licence sets from the Lichess repository (DECISIONS #84), SVG, credited in Settings and art/pieces/CREDITS.md. */
const OPEN_SETS: readonly string[] = ["cburnett", "merida", "chessnut", "spatial"];
export type PieceSet = (typeof PIECE_SETS)[number];

const BASE = '<path d="M11.5 37.5h22v4h-22z"/><path d="M9.5 41h26v2.6h-26z"/>';
const PIECE_PATHS: Record<string, string> = {
  P: '<circle cx="22.5" cy="12.6" r="4.6"/>'
   + '<path d="M18.6 17.4h7.8l1.6 3.2H17z"/>'
   + '<path d="M19.1 20.6c0 5.2-4.1 7.4-4.1 12.4h15c0-5-4.1-7.2-4.1-12.4z"/>'
   + '<path d="M13 32.6h19v5H13z"/>',
  R: '<path d="M11.8 8.6h4.6v3.2h3.9V8.6h4.4v3.2h3.9V8.6h4.6v8.6H11.8z"/>'
   + '<path d="M14 17.2h17l-1.6 4H15.6z"/>'
   + '<path d="M15.6 21.2h13.8v11.4H15.6z"/>'
   + '<path d="M13 32.6h19v5H13z"/>' + BASE,
  B: '<circle cx="22.5" cy="6.4" r="2"/>'
   + '<path d="M22.5 8.4c3.1 0 5.7 3.4 5.7 7.2 0 3.5-2.1 5.8-5.7 9.2-3.6-3.4-5.7-5.7-5.7-9.2 0-3.8 2.6-7.2 5.7-7.2z"/>'
   + '<path d="M22.5 11v8.4" stroke-width="1.5"/>'
   + '<path d="M16.2 24.8h12.6l1.2 3.4H15z"/>'
   + '<path d="M17 28.2h11c0 3.2-1.8 3.9-1.8 4.4H18.8c0-.5-1.8-1.2-1.8-4.4z"/>'
   + '<path d="M13 32.6h19v5H13z"/>' + BASE,
  // the knight sits 2 units left so its own wider foot lines up with the other pieces
  N: '<g transform="translate(-2 0)">'
   + '<path d="M12.4 36.4c0-6.2 2.2-9.6 5.4-12.6 1.5-1.4 2.1-2.5 1.7-3.3-.5-.9-1.8-.7-2.7.2l-2.1 2.1c-1.1 1.1-2.7.9-3.1-.4-.5-1.7.4-3.4 1.8-5l4.7-5.3c1.9-2.1 4-3.5 6.6-3.9L26.4 5l2 3c4.4.9 7.2 3.8 8.3 8.3.9 3.7 1.1 8.7 1.1 13.6v6.5z"/>'
   + '<ellipse cx="19.4" cy="17.6" rx="1.3" ry="1.6" class="eye"/>'
   + '<path d="M27 13.5c2.6 1.4 4 3.7 4.6 7" stroke-width="1.4" fill="none"/>'
   + '<path d="M11.8 36.4h25.9v5.1H11.8z"/><path d="M9.8 41.1h29.9v2.6H9.8z"/></g>',
  Q: '<circle cx="8.6" cy="13.4" r="2.4"/><circle cx="15.4" cy="10.4" r="2.4"/>'
   + '<circle cx="22.5" cy="9.2" r="2.6"/><circle cx="29.6" cy="10.4" r="2.4"/>'
   + '<circle cx="36.4" cy="13.4" r="2.4"/>'
   + '<path d="M9.4 15.4l3.4 10.4h19.4l3.4-10.4-5.4 4-3.6-8-3.7 8.6-3.7-8.6-3.6 8z"/>'
   + '<path d="M12.8 25.8h19.4l-1.4 6.8H14.2z"/>'
   + '<path d="M13 32.6h19v5H13z"/>' + BASE,
  // DECISIONS #29: no cross on the king - a plain teardrop finial instead
  K: '<path d="M22.5 2.4c2.3 2.3 3.4 4.6 3.4 6.8 0 2.1-1.5 3.6-3.4 4-1.9-.4-3.4-1.9-3.4-4 0-2.2 1.1-4.5 3.4-6.8z"/>'
   + '<path d="M22.5 13.2c-5.4 0-9.9 3.8-10.6 9.6l1.5 9.8h18.2l1.5-9.8c-.7-5.8-5.2-9.6-10.6-9.6z"/>'
   + '<path d="M15.6 24.2c4.6-1.6 9.2-1.6 13.8 0" stroke-width="1.4" fill="none"/>'
   + '<path d="M13.4 32.6h18.2l1 5H12.4z"/>' + BASE,
};

/** The piece as HTML, in the learner's chosen set. Class "pc" is what the board animates and drags. */
export function pieceHTML(p: PieceCode, set: PieceSet = store.get().pieceSet): string {
  if (OPEN_SETS.includes(set)) return `<img class="pc ${p[0]}" src="art/pieces/${set}/${p}.svg" alt="" draggable="false">`;
  if (set !== "V") return `<img class="pc ${p[0]}" src="art/pieces/${set}/${p}.webp" alt="" draggable="false">`;
  return vectorSVG(p);
}

function vectorSVG(p: PieceCode): string {
  const light = p[0] === "w";
  return `<svg class="pc ${p[0]}" viewBox="0 0 45 45" aria-hidden="true">`
    + `<g fill="${light ? "var(--pw)" : "var(--pb)"}" stroke="${light ? "var(--pw-line)" : "var(--pb-line)"}"`
    + ` stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${PIECE_PATHS[p[1]]}</g></svg>`;
}
