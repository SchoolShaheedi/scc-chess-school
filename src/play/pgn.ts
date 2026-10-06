// A finished game as PGN, the standard chess notation every chess site and coach can read (chess review
// 2026-10-04). Copied to the clipboard; if the browser blocks that, the text is shown to copy by hand.
import { Chess } from "chess.js";
import { t } from "../i18n";

export function pgnOf(uci: string[], white: string, black: string, result: "1-0" | "0-1" | "1/2-1/2" | "*", startFen?: string): string {
  const g = startFen ? new Chess(startFen) : new Chess();
  for (const u of uci) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  g.setHeader("Event", "SCC Chess School");
  g.setHeader("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
  g.setHeader("White", white); g.setHeader("Black", black); g.setHeader("Result", result);
  return g.pgn();
}

export async function copyText(text: string, box: HTMLElement) {
  try { await navigator.clipboard.writeText(text); box.innerHTML = `<p class="note">${t("pgnCopied")}</p>`; }
  catch { box.innerHTML = `<p class="note">${t("pgnCopyHand")}</p><textarea class="pgnbox" readonly rows="6"></textarea>`; box.querySelector("textarea")!.value = text; }
}
