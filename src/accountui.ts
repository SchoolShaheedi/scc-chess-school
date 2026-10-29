// The Account box in Settings: sign in, see that progress is saved, sign out, delete the account.
// Under-13s are asked to fetch a grown-up first (DECISIONS #38); we never ask for or store an age.
import { icon } from "./icons";
import { t } from "./i18n";
import { account, deleteAccount, signInWithEmail, signInWithGoogle, signOut, syncConfigured } from "./sync";
import { ask, tell } from "./ui/dialog";

type Step = "start" | "age" | "parent" | "methods" | "sent";

/** The emailed link needs our own email sender (SMTP) in Supabase: without one, Supabase emails only its own team.
 *  Off, sign-in is Google only (DECISIONS #124); on since the charity's Gmail sender was set up (#125). */
const EMAIL_SIGNIN = true;

export function mountAccount(box: HTMLElement, opts: { startAt?: Step } = {}): () => void {
  let step: Step = opts.startAt ?? "start", error = "";

  const render = () => {
    // a sign-in link that came back to the app without working (#123): say so where a new one is asked for
    if (account.takeReturnError()) { step = "methods"; error = t("linkFailed"); }
    if (!syncConfigured) { box.innerHTML = `<h2>${t("account")}</h2><p class="note">${t("notSetUp")}</p>`; return; }
    if (account.signedIn()) {
      const saved = account.lastSaved();
      box.innerHTML = `<h2>${t("account")}</h2>
        <p><b>${t("signedInAs")}</b> ${escape(account.email() ?? "")}</p>
        <p class="note">${icon("check")} ${t("savedAt")}${saved ? ` · ${saved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
        <div class="actions"><button class="btn ghost" data-out>${t("signOut")}</button></div>
        <p class="note">${t("privacy")}</p>
        <button class="danger" data-del>${t("deleteAccount")}</button>`;
      box.querySelector<HTMLButtonElement>("[data-out]")!.onclick = () => void signOut();
      box.querySelector<HTMLButtonElement>("[data-del]")!.onclick = async () => {
        if (!(await ask(t("deleteConfirm"), { danger: true }))) return;
        const e = await deleteAccount(); if (e) await tell(e);
      };
      return;
    }
    const body = {
      start: `<p>${t("saveWhy")}</p><button class="btn wide" data-go="age">${t("signIn")}</button>`,
      // parent first (DECISIONS #38, #76): an honest message, not a quiz a child can tap through
      age: `<div class="parentcard">${icon("shield")}<div><b>${t("parentFirst")}</b><small>${t("parentFirstBody")}</small></div></div>
        <button class="btn wide" data-go="methods">${t("adultConfirm")}</button>`,
      parent: `<p>${t("askParent")}</p><button class="btn wide" data-go="methods">${t("imParent")}</button>`,
      // the email link is the main way in: it shares only the email. Google is offered second, with what it shares said plainly
      methods: EMAIL_SIGNIN ? `<form class="emailform" data-email><label class="note" for="em">${t("emailLabel")}</label>
          <input id="em" type="email" inputmode="email" autocomplete="email" required placeholder="name@example.com">
          <button class="btn wide" type="submit">${icon("mail")} ${t("sendLink")}</button></form>
        ${error ? `<p class="note err">${escape(error)}</p>` : ""}
        <div class="ordiv"><span>${t("or")}</span></div>
        <button class="btn ghost wide google" data-google>${GOOGLE_G} ${t("google")}</button>
        <p class="note">${t("googleNote")}</p>`
        : `${error ? `<p class="note err">${escape(error)}</p>` : ""}
        <button class="btn wide google" data-google>${GOOGLE_G} ${t("google")}</button>
        <p class="note">${t("googleNoteOnly")}</p>`,
      sent: `<p>${icon("mail")} ${t("linkSent")}</p>`,
    }[step];
    // with Google only, its own note already says what is kept; the general note speaks of the email link
    const note = EMAIL_SIGNIN || step !== "methods" ? `<p class="note">${t("privacy")}</p>` : "";
    box.innerHTML = `<h2>${t("saveTitle")}</h2>${body}${note}`;
    box.querySelectorAll<HTMLButtonElement>("[data-go]").forEach(b => b.onclick = () => { step = b.dataset.go as Step; error = ""; render(); });
    box.querySelector<HTMLButtonElement>("[data-google]")?.addEventListener("click", () => void signInWithGoogle());
    box.querySelector<HTMLFormElement>("[data-email]")?.addEventListener("submit", async e => {
      e.preventDefault();
      const email = box.querySelector<HTMLInputElement>("#em")!.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { error = t("badEmail"); render(); return; }
      const err = await signInWithEmail(email);
      if (err) { error = err; render(); } else { step = "sent"; render(); }
    });
  };

  render();
  return account.subscribe(render) as () => void;
}

const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Google's "G" mark, drawn as their sign-in branding guidelines ask for the button
const GOOGLE_G = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;
