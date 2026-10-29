// Wide screens, the bot game panel (DECISIONS #128, option C "Tabs, like chess.com"): the right-hand panel gets three
// tabs, Moves / Coach / Opening, instead of one long column. Added by src/wide.ts after it splits the screen, and taken
// off again (everything back in the panel, in its old order) before the screen is put back in one column.
// Nothing here reads or changes the game: the opening is worked out from the moves already drawn in the move list, and
// there is NO engine evaluation anywhere (it would give the answer away against a bot).
import { t } from "./i18n";

/** The opening family for a move list (SAN): the longest line in the Lichess names (CC0) the game starts with, or null. */
export function openingOf(sans: string[], names: Record<string, string>): string | null {
  const clean = sans.map(m => m.replace(/[+#?!]+$/, ""));
  for (let n = Math.min(clean.length, 12); n > 0; n--) { const hit = names[clean.slice(0, n).join(" ")]; if (hit) return hit; }
  return null;
}

type Names = Record<string, string>;
let namesP: Promise<Names> | null = null;
const loadNames = () => (namesP ??= import("./content/opening-names.json").then(m => m.default as Names));

interface Tabbed { undo: () => void }
const tabbed = new WeakMap<HTMLElement, Tabbed>();

/** Put the tabs on a split bot-game screen. Returns false if this screen is not one. */
export function addTabs(s: HTMLElement): boolean {
  const right = s.querySelector<HTMLElement>(":scope > .wright");
  if (!right || tabbed.has(s) || !s.matches(".gamescreen[data-botgame]")) return false;
  const kids = [...right.children] as HTMLElement[];
  const movesGroup = kids.filter(k => k.matches(".gstate, .moverow, .extra, .actions"));
  const coachGroup = kids.filter(k => k.matches(".gcoach, .coachbtns"));
  if (!movesGroup.length) return false;
  const first = movesGroup[0];
  const tabs: { id: string; label: string; items: HTMLElement[] }[] = [
    { id: "moves", label: t("tabMoves"), items: movesGroup },
    ...(coachGroup.length ? [{ id: "coach", label: t("tabCoach"), items: coachGroup }] : []),
    { id: "opening", label: t("tabOpening"), items: [] },
  ];
  // where each moved element was in the panel, so it goes back to the same place
  const home = new Map<HTMLElement, number>(kids.map((k, i) => [k, i]));
  const list = document.createElement("div");
  list.className = "wtabs"; list.setAttribute("role", "tablist"); list.setAttribute("aria-label", t("tabsLabel"));
  const panels: HTMLElement[] = [], buttons: HTMLButtonElement[] = [];
  for (const tab of tabs) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "wtab"; b.id = `wt-tab-${tab.id}`; b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", `wt-panel-${tab.id}`); b.dataset.tab = tab.id;
    b.innerHTML = `<span>${tab.label}</span>${tab.id === "coach" ? `<i class="wdot" hidden></i>` : ""}`;
    const p = document.createElement("div");
    p.className = "wpanel"; p.id = `wt-panel-${tab.id}`; p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", b.id);
    p.dataset.panel = tab.id;
    list.appendChild(b); panels.push(p); buttons.push(b);
  }
  first.before(list, ...panels);   // the tabs sit where the first moved element was

  tabs.forEach((tab, i) => tab.items.forEach(k => panels[i].appendChild(k)));
  const select = (i: number, focus = false) => {
    buttons.forEach((b, j) => { b.setAttribute("aria-selected", String(i === j)); b.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; });
    if (buttons[i].dataset.tab === "coach") buttons[i].querySelector<HTMLElement>(".wdot")!.hidden = true;
    if (focus) buttons[i].focus();
    if (buttons[i].dataset.tab === "moves") scrollMoves();
  };
  buttons.forEach((b, i) => b.onclick = () => select(i));
  list.onkeydown = e => {
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? (at + 1) % buttons.length : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (at + buttons.length - 1) % buttons.length
      : e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault(); select(to, true);
  };

  const movesEl = s.querySelector<HTMLElement>("[data-moves]");
  const scrollMoves = () => { if (movesEl && !movesEl.querySelector(".mv.on")) movesEl.scrollTop = 1e6; };
  // the Opening tab: redrawn whenever the move list is
  const openPanel = panels[tabs.findIndex(x => x.id === "opening")];
  const fromSetPosition = !!s.dataset.setpos;   // a game from a set position: its moves do not start the usual way
  const paint = async () => {
    const sans = [...(movesEl?.querySelectorAll<HTMLElement>(".mv") ?? [])].map(b => b.textContent ?? "");
    let name: string | null = null;
    if (sans.length && !fromSetPosition) { try { name = openingOf(sans, await loadNames()); } catch { name = null; } }
    if (!openPanel.isConnected) return;   // taken off while the names loaded
    openPanel.innerHTML = !sans.length ? "" : name ? `<p class="wopen"><small>${t("openingNow")}</small><b>${name}</b></p>` : `<p class="wopen none">${t("openingNone")}</p>`;
    scrollMoves();
  };
  const obs: MutationObserver[] = [];
  if (movesEl) { const o = new MutationObserver(() => void paint()); o.observe(movesEl, { childList: true }); obs.push(o); }
  // a coach message arriving while another tab is open is flagged on the Coach tab, so a warning is never missed
  const bubble = s.querySelector<HTMLElement>("[data-csay]");
  const cb = buttons.find(b => b.dataset.tab === "coach");
  if (bubble && cb) { const o = new MutationObserver(() => { if (cb.getAttribute("aria-selected") !== "true" && !bubble.classList.contains("quiet")) cb.querySelector<HTMLElement>(".wdot")!.hidden = false; });
    o.observe(bubble, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] }); obs.push(o); }

  tabbed.set(s, { undo() {
    obs.forEach(o => o.disconnect());
    // every element goes back into the panel, in the order it had there
    const back = panels.flatMap(p => [...p.children] as HTMLElement[]).filter(k => home.has(k)).sort((a, b) => home.get(a)! - home.get(b)!);   // not the Opening text
    back.forEach(k => list.before(k));
    list.remove(); panels.forEach(p => p.remove());
    tabbed.delete(s);
  } });
  select(0);
  void paint();
  return true;
}

/** Take the tabs off (before the screen is put back into one column). */
export function removeTabs(s: HTMLElement) { tabbed.get(s)?.undo(); }
