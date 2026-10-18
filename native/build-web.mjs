// Builds the web app for the Android app into native/www (DECISIONS #121): the same code as the website, in the
// "native" mode (../.env.native): no service worker; sign-in returns through the app's own address. Run before `npx cap sync android`.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const app = fileURLToPath(new URL("..", import.meta.url));   // the folder has spaces: a URL path would keep them as %20
execSync("npx vite build --mode native --outDir native/www --emptyOutDir", { cwd: app, stdio: "inherit" });
// checks on what was built
const js = execSync("cat native/www/assets/index-*.js", { cwd: app }).toString();
// the store build signs in like the website (#123): its Supabase address must be in it
if (!js.includes("supabase.co")) { console.error("FAIL: no Supabase address in the Android build (is .env.local there?)"); process.exit(1); }
if (!existsSync(new URL("www/index.html", import.meta.url))) { console.error("FAIL: no index.html"); process.exit(1); }
if (/googleapis|gstatic/.test(readFileSync(new URL("www/index.html", import.meta.url), "utf8"))) { console.error("FAIL: a Google Fonts link"); process.exit(1); }
console.log("built the web app (native mode) into native/www");
