// The bottom tab bar (DECISIONS #76): Learn · Puzzles · Play · Me, on the four top-level screens only.
// Lessons, tests and games are full-screen with their own back button, so a child can't leave one by accident.
import { t } from "./i18n";
import { icon, type IconName } from "./icons";
import { store, today } from "./store";

export type Tab = "learn" | "puzzles" | "play" | "me";
const TABS: [Tab, IconName, "tabLearn" | "tabPuzzles" | "tabPlay" | "tabMe", string][] = [
  ["learn", "home", "tabLearn", "#/"], ["puzzles", "puzzle", "tabPuzzles", "#/puzzles"], ["play", "swords", "tabPlay", "#/play"], ["me", "user", "tabMe", "#/me"],
];

export function tabbar(on: Tab): string {
  const s = store.get(), dailyOpen = !(s.daily.date === today() && s.daily.solved);
  return `<nav class="tabbar" aria-label="${t("tabNav")}">${TABS.map(([id, ic, label, href]) =>
    `<a class="tab ${id === on ? "on" : ""}" href="${href}" ${id === on ? 'aria-current="page"' : ""}>${icon(ic)}<span>${t(label)}</span>
      ${id === "puzzles" && dailyOpen ? `<i class="dotbadge" aria-label="${t("dailyTitle")}"></i>` : ""}</a>`).join("")}</nav>`;
}
