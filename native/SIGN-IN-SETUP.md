# Sign-in settings in Supabase (for the website AND the Android app)

These are dashboard settings, so only you can make them: they need your Supabase login, and step 3 needs a Google
client secret, which must never pass through me or this repository. Project: **scc-chess-school**
(https://supabase.com/dashboard/project/bqcfdrbnavpsmpgvnitt).

Until steps 1 and 2 are done, sign-in links may lead to the wrong place, and **nobody can get past the website's
sign-in screen** (the website requires an account, DECISIONS #123).

## 1. Authentication → URL Configuration
- **Site URL:** `https://scc-chess-school.pages.dev`
- **Redirect URLs** (add all three):
  - `https://scc-chess-school.pages.dev/**`: the website
  - `com.sikhworldchampionship.chess://login`: the Android app (the emailed link and Google come back here)
  - `http://localhost:8752/**`: testing on this computer

## 2. Authentication → Emails (DONE 2026-10-18, DECISIONS #125)
Set up with the charity's Google Workspace: sender `socialmedia@shaheedibunga.com`, host `smtp.gmail.com`, port 465,
username the same address, password a Google **app password** named "ChessSchool" (myaccount.google.com/apppasswords).
Gmail caps it at about 2,000 emails a day. Rate Limits → emails: 100 an hour. `EMAIL_SIGNIN = true` in `src/accountui.ts`.
If the app password is ever deleted, sign-in emails stop: make a new one and paste it into Supabase.

Supabase's built-in email sender is for testing: it sends only a few sign-in emails an hour, which a class of
children would use up in minutes. Set **SMTP Settings** to the charity's own email service (Resend works; the SWC site
already uses it), with a sender such as `chess@shaheedibunga.com`.

## 3. Authentication → Providers → Google (only if you want "Continue with Google")
1. In Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.
2. **Authorised redirect URI:** `https://bqcfdrbnavpsmpgvnitt.supabase.co/auth/v1/callback`
3. Paste the **Client ID** and **Client secret** into Supabase's Google provider, and switch it on.
4. Google asks for an app name, a support email and the privacy page: `https://scc-chess-school.pages.dev/privacy`.

If you would rather not use Google, say so and I will take the button out: the emailed link works on its own.

## 4. A test account for Google Play's reviewers
Google's reviewers can't open an emailed link, so after step 3, make a **new Google account just for review** (never a
personal one), sign in to the app with it once, and put its address and password in Play Console → App content →
App access. Nobody else needs it.

## How to check it worked
1. On a phone, open https://scc-chess-school.pages.dev, tap Get started, enter your email, and open the link from
   the email **on the same phone**: you should land back in the school, signed in.
2. With the Android app installed, do the same in the app: the link (or Google) should bring you back into the app,
   signed in. An expired link shows "That sign-in link didn't work…" with a box to ask for a new one.
