# Putting SCC Chess School online (Cloudflare Pages)

> **LIVE since 2026-10-06 (DECISIONS #88):** https://scc-chess-school.pages.dev. The source is public at
> https://github.com/SchoolShaheedi/scc-chess-school (GPLv3 code; artwork and lessons © Shaheedi Bunga, see NOTICE.md).
>
> **Every update, in this order** (the public source must always match what is live):
> 1. `git add -A && git commit -m "…" && git push`
> 2. `npm run deploy`
>
> Note: Wrangler now steers new projects to Workers. This project was created on classic Pages with `--force`
> (once only). `npm run deploy` (`wrangler pages deploy`) goes to it directly; no `--force` is needed again.

Decided 2026-10-05 (DECISIONS #80/#81): free hosting on Cloudflare Pages. The app is a set of static
files: Supabase does sign-in and saving, so there is no server to run. Everything is prepared; only the steps
marked **You** need your hands, because they are your accounts.

## 1. Before anything goes public: the source code (GPL)

The app ships **Stockfish**, which is GPLv3 (DECISIONS #24). Anyone who gets the app must be able to get its
full source. Before giving the link to testers, put this `03_App/school` folder in a public repository (e.g.
GitHub), **without `.env.local`** (it is already in `.gitignore`), and tell me the address: I'll add a "Source
code" link in Settings.

## 2. Build

```
npm run build
```

This makes `dist/` (about 4.3 MB; tests run first and a failure stops the build).

## 3. First upload — **You** (about 10 minutes)

1. Sign up (free) at dash.cloudflare.com.
2. **Workers & Pages → Create → Pages → Upload assets**. Name the project `scc-chess-school`.
3. Drag in the **`dist`** folder and press **Deploy**. The app is then at `https://scc-chess-school.pages.dev`.

Every later update, from a terminal in this folder (after a one-time `npx wrangler login`):

```
npm run deploy
```

## 4. Tell Supabase the new address — **You**

In the Supabase dashboard (project `scc-chess-school`):

- **Authentication → URL Configuration**: set **Site URL** to `https://scc-chess-school.pages.dev`, and add
  it under **Redirect URLs**. Without this, the email sign-in link sends people back to the wrong place.
- **Authentication → Providers → Google** (only if you want Google sign-in): add a Google Cloud OAuth client.
  The email link works without it.

## 5. What's already set up

- `public/_headers`: a strict content policy (the app may load only its own files and talk only to its
  Supabase project), no framing, no camera, mic or location, year-long caching for hashed files, and
  always-fresh `index.html` and `sw.js` so updates arrive. Tested in the preview with Stockfish running.
- Offline: the service worker keeps the app, art, fonts and the chess engine, so lessons, puzzles and bots
  work without internet once opened. Coach-voice clips are kept as they are heard.

## 6. Keep testers private (optional)

Cloudflare **Zero Trust → Access** can put an email check in front of the site, so only the testers you
name can open it until you're ready.
