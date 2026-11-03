// Our own pop-up instead of the browser's confirm() and alert() (DECISIONS #128, option C "a card in the middle").
// The browser's box speaks the browser's language ("localhost says"), never Punjabi, and some browsers block it, so
// Resign did nothing. This one is the same card shape as the game-over card: a dimmed page, the question, big
// buttons with the safe choice first (and focused), Esc or a tap outside cancels, and Tab stays inside the card.
import { t } from "../i18n";

export interface AskOptions { yes?: string; no?: string; danger?: boolean }

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function open(message: string, buttons: { label: string; value: boolean; cls: string }[], cancel: boolean): Promise<boolean> {
  return new Promise(resolve => {
    const before = document.activeElement as HTMLElement | null;
    const wrap = document.createElement("div");
    wrap.className = "dlg";
    wrap.innerHTML = `<div class="dlgcard" role="alertdialog" aria-modal="true" aria-labelledby="dlgmsg">
      <p id="dlgmsg">${esc(message)}</p>
      <div class="dlgbtns">${buttons.map((b, i) => `<button class="btn ${b.cls}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div></div>`;
    const done = (v: boolean) => {
      document.removeEventListener("keydown", key, true);
      wrap.remove();
      before?.focus?.();
      resolve(v);
    };
    const btns = [...wrap.querySelectorAll<HTMLButtonElement>("button")];
    btns.forEach(b => b.onclick = () => done(buttons[+b.dataset.i!].value));
    wrap.onclick = e => { if (e.target === wrap) done(cancel ? false : true); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); done(cancel ? false : true); }
      else if (e.key === "Tab") {      // keep the focus inside the card
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
      }
    };
    document.addEventListener("keydown", key, true);
    document.body.appendChild(wrap);
    btns[0].focus();
  });
}

/** A yes/no question. Resolves true only when the learner chooses `yes`. */
export const ask = (message: string, o: AskOptions = {}) => open(message, [
  { label: o.no ?? t("cancel"), value: false, cls: "ghost" },
  { label: o.yes ?? t("yes"), value: true, cls: o.danger ? "danger" : "" },
], true);

/** A question with a text box (a pasted FEN or PGN is several lines). Resolves to the text, or null when cancelled. */
export function promptText(message: string): Promise<string | null> {
  return new Promise(resolve => {
    const before = document.activeElement as HTMLElement | null;
    const wrap = document.createElement("div");
    wrap.className = "dlg";
    wrap.innerHTML = `<div class="dlgcard" role="dialog" aria-modal="true" aria-labelledby="dlgmsg">
      <p id="dlgmsg">${esc(message)}</p>
      <textarea class="dlgtext" rows="5" autocapitalize="off" autocorrect="off" spellcheck="false" aria-labelledby="dlgmsg"></textarea>
      <div class="dlgbtns"><button class="btn ghost" data-no>${esc(t("cancel"))}</button><button class="btn" data-yes>${esc(t("ok"))}</button></div></div>`;
    const box = wrap.querySelector<HTMLTextAreaElement>("textarea")!;
    const done = (v: string | null) => { document.removeEventListener("keydown", key, true); wrap.remove(); before?.focus?.(); resolve(v); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); done(null); } };
    wrap.querySelector<HTMLButtonElement>("[data-no]")!.onclick = () => done(null);
    wrap.querySelector<HTMLButtonElement>("[data-yes]")!.onclick = () => done(box.value);
    wrap.onclick = e => { if (e.target === wrap) done(null); };
    document.addEventListener("keydown", key, true);
    document.body.appendChild(wrap);
    box.focus();
  });
}

/** A message with one button. */
export const tell = (message: string) => open(message, [{ label: t("ok"), value: true, cls: "" }], false).then(() => {});
