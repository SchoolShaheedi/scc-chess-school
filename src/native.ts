// The Android app (DECISIONS #121): the same web app, built with VITE_NATIVE=1 and packaged by Capacitor (native/).
// Version 1 has no sign-in, so nothing online is offered: lessons, bots, puzzles, Magical Chess against the bots
// and Insights all work on the phone alone. Native features are reached through the bridge Capacitor puts on
// `window`, so the web build carries no Capacitor code at all.
export const NATIVE = import.meta.env.VITE_NATIVE === "1";
/** The fully offline build (#121, version 1): the app with no Supabase address. The store build has sign-in and
 *  online play like the website (#123), so this is only true for a build made without the address. */
export const OFFLINE_APP = NATIVE && !import.meta.env.VITE_SUPABASE_URL;
/** Where sign-in returns to inside the Android app: the emailed link and Google both end at this address, which
 *  Android hands to the app (the intent filter in AndroidManifest.xml). It must be in Supabase's Redirect URLs. */
export const APP_RETURN_URL = "com.sikhworldchampionship.chess://login";

interface Bridge { Plugins: Record<string, Record<string, (o: unknown) => Promise<{ uri?: string }>>> }
const bridge = () => (window as unknown as { Capacitor?: Bridge }).Capacitor;

/** Share a picture through the phone's share sheet: written to the app's cache, then handed to Android. */
export async function nativeSharePicture(blob: Blob, name: string, title: string): Promise<boolean> {
  const cap = bridge(), fs = cap?.Plugins.Filesystem, share = cap?.Plugins.Share;
  if (!fs || !share) return false;
  const data = await new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
  const { uri } = await fs.writeFile({ path: name, data, directory: "CACHE" });
  await share.share({ title, files: [uri] });
  return true;
}

/** Android's back button (DECISIONS #121): back through the app's own screens, and out of the app only from the home
 *  screen. Without this, Capacitor closed the app on the first press. */
export function nativeBackButton() {
  const app = (bridge() as unknown as { Plugins: { App?: { addListener(e: string, f: () => void): void; exitApp(): void } } } | undefined)?.Plugins.App;
  if (!app) return;
  app.addListener("backButton", () => {
    // an open sheet or card closes first, as a back press does everywhere on Android
    const open = document.querySelector<HTMLElement>(".gsheet [data-gsclose], .overcard:not([hidden]) [data-x]");
    if (open) return void open.click();
    const back = document.querySelector<HTMLButtonElement>(".lessonbar [data-back], .topbar [data-back], [data-home]");
    if (back) return void back.click();
    if ((location.hash || "#/") !== "#/") return void (location.hash = "#/");
    app.exitApp();
  });
}

/** The clock and battery icons: light on the dark look and on games (always dark), dark on the light look. Called
 *  after every screen change, once the new screen is drawn. */
export function nativeBars() {
  const bars = (bridge() as unknown as { Plugins: { SystemBars?: { setStyle(o: { style: string }): Promise<void> } } } | undefined)?.Plugins.SystemBars;
  if (!bars) return;
  setTimeout(() => {
    const dark = document.documentElement.dataset.theme !== "light" || !!document.querySelector(".gamescreen");
    void bars.setStyle({ style: dark ? "DARK" : "LIGHT" }).catch(() => {});
  }, 0);
}

type Plugins = { App?: { addListener(e: string, f: (d: { url: string }) => void): void; getLaunchUrl(): Promise<{ url?: string } | undefined> };
  Browser?: { open(o: { url: string }): Promise<void>; close(): Promise<void> } };
const plugins = () => (bridge() as unknown as { Plugins: Plugins } | undefined)?.Plugins;

/** Google sign-in in the app (#123): Google refuses sign-in inside an app's web view, so it opens in a proper
 *  browser tab (Chrome Custom Tab) and comes back through APP_RETURN_URL. */
export async function openSignInPage(url: string) { await plugins()?.Browser?.open({ url }); }

/** Every time the app is opened through APP_RETURN_URL (and once for the link that started it), `handle` gets the
 *  address, with the sign-in tokens in it. The browser tab used for Google is closed first. */
export function onReturnToApp(handle: (url: string) => void) {
  const p = plugins();
  if (!p?.App) return;
  const take = (url?: string) => { if (url?.startsWith(APP_RETURN_URL)) { void p.Browser?.close().catch(() => {}); handle(url); } };
  p.App.addListener("appUrlOpen", d => take(d.url));
  void p.App.getLaunchUrl().then(d => take(d?.url)).catch(() => {});
}
