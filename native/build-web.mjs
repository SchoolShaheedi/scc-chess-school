// Builds the web app for the Android app into native/www (DECISIONS #121): the same code as the website, in the
// "native" mode (../.env.native): no sign-in, nothing online, no service worker. Run before `npx cap sync android`.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const app = fileURLToPath(new URL("..", import.meta.url));   // the folder has spaces: a URL path would keep them as %20
execSync("npx vite build --mode native --outDir native/www --emptyOutDir", { cwd: app, stdio: "inherit" });
// checks: the build really is the offline one
const js = execSync("cat native/www/assets/index-*.js", { cwd: app }).toString();
if (js.includes("supabase.co")) { console.error("FAIL: a Supabase address is in the Android build"); process.exit(1); }
if (!existsSync(new URL("www/index.html", import.meta.url))) { console.error("FAIL: no index.html"); process.exit(1); }
if (/googleapis|gstatic/.test(readFileSync(new URL("www/index.html", import.meta.url), "utf8"))) { console.error("FAIL: a Google Fonts link"); process.exit(1); }
console.log("built the offline web app into native/www");
