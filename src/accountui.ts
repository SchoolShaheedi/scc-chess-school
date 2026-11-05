// The Account box in Settings: sign in, see that progress is saved, sign out, delete the account.
// Under-13s are asked to fetch a grown-up first (DECISIONS #38); we never ask for or store an age.
import { icon } from "./icons";
import { t } from "./i18n";
import { account, deleteAccount, signInWithApple, signInWithEmail, signInWithGoogle, signOut, syncConfigured } from "./sync";
import { ask, tell } from "./ui/dialog";

type Step = "start" | "age" | "parent" | "methods" | "sent";

/** The emailed link needs our own email sender (SMTP) in Supabase: without one, Supabase emails only its own team.
 *  Off, sign-in is Google only (DECISIONS #124); on since the charity's Gmail sender was set up (#125). */
const EMAIL_SIGNIN = true;

/** Sign in with Apple, for the iPhone app (App Store rule 4.8: an app that offers Google must offer Apple too).
 *  OFF until the Apple provider is set up in Supabase (native/SIGN-IN-SETUP.md, part 5): with it off, the button is
 *  not drawn and nothing else changes. Turn it ON only once the provider is saved in Supabase; it then shows on the
 *  iPhone app, the Android app and the website alike. */
const APPLE_SIGNIN = true;   // ON 2026-11-05: Apple provider saved in Supabase (Services ID com.sikhworldchampionship.chess.signin, key P88MR54NNH; secret expires 2027-05-04)

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
        ${APPLE_SIGNIN ? APPLE_BUTTON : ""}
        <button class="btn ghost wide google" data-google>${GOOGLE_G} ${t("google")}</button>
        <p class="note">${t("googleNote")}</p>`
        : `${error ? `<p class="note err">${escape(error)}</p>` : ""}
        ${APPLE_SIGNIN ? APPLE_BUTTON : ""}
        <button class="btn wide google" data-google>${GOOGLE_G} ${t("google")}</button>
        <p class="note">${t("googleNoteOnly")}</p>`,
      sent: `<p>${icon("mail")} ${t("linkSent")}</p>`,
    }[step];
    // with Google only, its own note already says what is kept; the general note speaks of the email link
    const note = EMAIL_SIGNIN || step !== "methods" ? `<p class="note">${t("privacy")}</p>` : "";
    box.innerHTML = `<h2>${t("saveTitle")}</h2>${body}${note}`;
    box.querySelectorAll<HTMLButtonElement>("[data-go]").forEach(b => b.onclick = () => { step = b.dataset.go as Step; error = ""; render(); });
    box.querySelector<HTMLButtonElement>("[data-google]")?.addEventListener("click", () => void signInWithGoogle());
    box.querySelector<HTMLButtonElement>("[data-apple]")?.addEventListener("click", () => void signInWithApple());
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

// Apple's button as their guidelines ask: black with the white logo and "Sign in with Apple" (the white-on-black style;
// the light look gets the same black button, which has the contrast Apple wants), the same size as the Google one
const APPLE_LOGO = `<svg width="18" height="22" viewBox="0 0 814 1000" aria-hidden="true"><path fill="#fff" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>`;
const APPLE_BUTTON = `<button class="btn wide apple" data-apple>${APPLE_LOGO} ${t("apple")}</button>`;

// Google's "G" mark, drawn as their sign-in branding guidelines ask for the button
const GOOGLE_G = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;
