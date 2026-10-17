// "The game is over" on the board itself (DECISIONS #117, option C): chess.com's king badges (a red # on the mated
// king and a crown on the winner; a flag for a resignation, a clock for time, ½ on both kings for a draw) and a gold
// banner saying what happened, for a moment, before the result card opens. Pure helpers, tested in test/gameover.test.ts.
import { t } from "../i18n";

export type Badge = "mate" | "win" | "resign" | "time" | "draw";
export type EndKind = "mate" | "resign" | "time" | "stalemate" | "draw" | "other";
export type EndBadges = Partial<Record<"w" | "b", Badge>>;

/** Which badge each king gets. `loser` is null for a draw. */
export function endBadges(kind: EndKind, loser: "w" | "b" | null): EndBadges {
  if (!loser) return { w: "draw", b: "draw" };
  const winner = loser === "w" ? "b" : "w";
  const lose: Badge | undefined = kind === "mate" ? "mate" : kind === "resign" ? "resign" : kind === "time" ? "time" : undefined;
  return { [winner]: "win", ...(lose ? { [loser]: lose } : {}) };
}

/** The kind of ending, from the words the games already use for "how" (byMate, byResign, …). */
export function kindOf(how: string, drawn: boolean): EndKind {
  if (how === t("byMate")) return "mate";
  if (how === t("byResign")) return "resign";
  if (how === t("byTime")) return drawn ? "draw" : "time";
  if (how === t("byStalemate")) return "stalemate";
  return drawn ? "draw" : "other";
}

const side = (c: "w" | "b") => t(c === "w" ? "colourWhite" : "colourBlack");
/** The banner's words: what happened, then the score. */
export function bannerText(kind: EndKind, loser: "w" | "b" | null): string {
  const score = !loser ? "½–½" : loser === "w" ? "0–1" : "1–0";
  const words = kind === "mate" ? t("endMate") : kind === "stalemate" ? t("endStalemate") : !loser ? t("endDraw")
    : kind === "resign" ? t("endResign").replace("{side}", side(loser))
    : kind === "time" ? t("endTime").replace("{side}", side(loser))
    : t("endWins").replace("{side}", side(loser === "w" ? "b" : "w"));
  return `${words} · ${score}`;
}

/** The game ends on the board: badges on the kings, the banner. The caller opens its result card after END_PAUSE. */
export function announceEnd(board: { setEnd(e: EndBadges | null): void; banner(text: string, ms?: number): void }, kind: EndKind, loser: "w" | "b" | null) {
  board.setEnd(endBadges(kind, loser));
  board.banner(bannerText(kind, loser));
}
/** How long the banner shows before the result card opens (it was 0.6 s with nothing on the board). */
export const END_PAUSE = 1700;
