// Game settings (DECISIONS #115, option B): the four board switches live in Settings → Board, and every game also
// has a ⋯ button that opens them as a sheet. Confirm each move and legal-move dots apply to game boards only
// (Board's `game` option); the coordinates reach every board; focus mode hides the coach, the taken pieces and the
// reactions in a game, never in a lesson or a level test.
import type { Board } from "../chess/board";
import { t } from "../i18n";
import { icon } from "../icons";
import { type State, store } from "../store";

const seg = (name: string, cur: string, items: [string, string][]) =>
  `<div class="seg" role="group" data-gs="${name}">${items.map(([v, label]) => `<button data-v="${v}" aria-pressed="${v === cur}">${label}</button>`).join("")}</div>`;

/** The four switches, for Settings and for the in-game sheet. */
export function gameSettingsHTML(withNotes = true): string {
  const s = store.get(), on = (b: boolean) => String(b), onOff: [string, string][] = [["true", t("soundOn")], ["false", t("soundOff")]];
  const row = (label: string, note: string, ctl: string) => `<div class="gsrow"><b>${label}</b>${withNotes ? `<small>${note}</small>` : ""}${ctl}</div>`;
  return row(t("gsConfirmLabel"), t("gsConfirmNote"), seg("confirmMoves", on(!!s.confirmMoves), onOff))
    + row(t("gsDotsLabel"), t("gsDotsNote"), seg("legalDots", on(s.legalDots !== false), onOff))
    + row(t("gsCoordsLabel"), t("gsCoordsNote"), seg("coordsMode", s.coordsMode ?? "in", [["off", t("gsCoordsOff")], ["in", t("gsCoordsIn")], ["out", t("gsCoordsOut")]]))
    + row(t("gsFocusLabel"), t("gsFocusNote"), seg("focusMode", on(!!s.focusMode), onOff));
}

/** Wire the switches inside `host`; `changed` runs after each one is saved. */
export function wireGameSettings(host: HTMLElement, changed: () => void) {
  host.querySelectorAll<HTMLElement>("[data-gs]").forEach(g => g.querySelectorAll<HTMLButtonElement>("button").forEach(b => b.onclick = () => {
    const v = b.dataset.v === "true" ? true : b.dataset.v === "false" ? false : b.dataset.v;
    store.set({ [g.dataset.gs!]: v } as Partial<State>);
    g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    changed();
  }));
}

/** The ⋯ button for a game's top bar. */
export const gameMenuButton = () => `<button class="iconbtn" data-gmenu aria-label="${t("gsMenu")}">${icon("dots")}</button>`;

/** Focus mode on a game screen; Play vs Coach keeps its coach, since the coach is the point of it. */
export function applyFocus(root: HTMLElement, keepCoach = false) {
  root.querySelector(".screen")?.classList.toggle("focus", !!store.get().focusMode && !keepCoach);
}

/** Wire a game's ⋯ button: a sheet with the four switches; the board redraws as they change. */
export function wireGameMenu(root: HTMLElement, board: Board, keepCoach = false) {
  applyFocus(root, keepCoach);
  root.querySelector<HTMLButtonElement>("[data-gmenu]")?.addEventListener("click", () => {
    const old = root.querySelector(".gsheet"); if (old) return void old.remove();
    const sheet = document.createElement("div");
    sheet.className = "gsheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", t("gsMenu"));
    sheet.innerHTML = `<div class="gshead"><b>${t("gsInGame")}</b><button class="iconbtn" data-gsclose aria-label="${t("close")}">${icon("close")}</button></div>${gameSettingsHTML(false)}`;
    root.querySelector(".screen")!.appendChild(sheet);
    wireGameSettings(sheet, () => { board.refresh(); applyFocus(root, keepCoach); });
    sheet.querySelector<HTMLButtonElement>("[data-gsclose]")!.onclick = () => sheet.remove();
    sheet.querySelector<HTMLButtonElement>("button[aria-pressed='true']")?.focus();
  });
}
