// Wide screens on the website (DECISIONS #126, option B): like chess.com, a board screen puts the board as big as the
// window allows on the left and everything else (the moves, the coach, the buttons, the explorer) in a panel on the
// right; the home screen goes into two columns. Phones, and the Android app at any size, keep the one column.
// The screens themselves are not rewritten: each is split into two columns after it is drawn, and put back exactly
// as it was when the window becomes narrow (the split changes the order, so it is never left in place on a phone).
import { NATIVE } from "./native";

/** Split one drawn screen into its two columns (exported for test/wide.test.ts). */
export function splitScreen(s: HTMLElement): "board" | "home" | null {
  if (s.dataset.wide) return null;
  const kids = [...s.children] as HTMLElement[];
  const frame = kids.find(k => k.classList.contains("frame"));
  let left: HTMLElement[] = [];
  if (frame) {
    // the board column: the board, and the player bars or eval bar right above and below it
    const i = kids.indexOf(frame);
    let a = i, b = i;
    while (a > 0 && kids[a - 1].matches(".pbar, .evalrow")) a--;
    while (b < kids.length - 1 && kids[b + 1].matches(".pbar")) b++;
    left = kids.slice(a, b + 1);
  } else if (s.classList.contains("club")) {
    left = kids.filter(k => k.matches(".nextcard, [data-homework], .mtiles"));
  } else return null;
  if (!left.length) return null;
  const kind = frame ? "board" : "home";
  s.dataset.wide = kind;
  originals.set(s, kids);
  const col = (cls: string) => { const d = document.createElement("div"); d.className = cls; return d; };
  const lc = col("wcol wleft"), rc = col("wcol wright");
  const keep = kind === "home" ? kids.filter(k => k.classList.contains("clubhead")) : [];   // the home header spans both
  left[0].before(lc);
  left.forEach(k => lc.appendChild(k));
  kids.filter(k => !left.includes(k) && !keep.includes(k)).forEach(k => rc.appendChild(k));
  s.appendChild(rc);
  return kind;
}

const originals = new WeakMap<HTMLElement, HTMLElement[]>();
/** Put a split screen back in its one-column order (exported for the same test). */
export function unsplitScreen(s: HTMLElement) {
  const kids = originals.get(s);
  if (!kids) return;
  const cols = [...s.querySelectorAll(":scope > .wcol")];
  // the original order, without anything the screen has since removed; anything it has added since goes back
  // right after the element it followed in its column
  const order: Element[] = kids.filter(k => cols.some(c => c.contains(k)));
  for (const c of cols) [...c.children].forEach((el, i, arr) => {
    if (!order.includes(el)) order.splice(i > 0 ? order.indexOf(arr[i - 1]) + 1 : order.length, 0, el);
  });
  order.forEach(k => s.appendChild(k));
  cols.forEach(c => c.remove());
  delete s.dataset.wide; originals.delete(s);
}

export function wideLayout(app: HTMLElement) {
  if (NATIVE) return;
  const mq = matchMedia("(min-width: 900px)");
  const apply = () => {
    document.documentElement.classList.toggle("wide", mq.matches);
    if (mq.matches) app.querySelectorAll<HTMLElement>(".screen:not([data-wide])").forEach(splitScreen);
    else app.querySelectorAll<HTMLElement>(".screen[data-wide]").forEach(unsplitScreen);
  };
  mq.addEventListener("change", apply);
  new MutationObserver(() => { if (mq.matches) apply(); }).observe(app, { childList: true, subtree: true });
  apply();
}
