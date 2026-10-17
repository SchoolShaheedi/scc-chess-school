// The Android app (DECISIONS #121): the same web app, built with VITE_NATIVE=1 and packaged by Capacitor (native/).
// Version 1 has no sign-in, so nothing online is offered: lessons, bots, puzzles, Magical Chess against the bots
// and Insights all work on the phone alone. Native features are reached through the bridge Capacitor puts on
// `window`, so the web build carries no Capacitor code at all.
export const NATIVE = import.meta.env.VITE_NATIVE === "1";

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
