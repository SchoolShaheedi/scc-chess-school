# Sign-in settings in Supabase (for the website, the Android app AND the iPhone app)

These are dashboard settings, so only you can make them: they need your Supabase login, and step 3 needs a Google
client secret, which must never pass through me or this repository. Project: **scc-chess-school**
(https://supabase.com/dashboard/project/bqcfdrbnavpsmpgvnitt).

Until steps 1 and 2 are done, sign-in links may lead to the wrong place, and **nobody can get past the website's
sign-in screen** (the website requires an account, DECISIONS #123).

## 1. Authentication → URL Configuration
- **Site URL:** `https://scc-chess-school.pages.dev`
- **Redirect URLs** (add all three):
  - `https://scc-chess-school.pages.dev/**`: the website
  - `com.sikhworldchampionship.chess://login`: the Android and iPhone apps (the emailed link, Google and Apple come back here; the iPhone app registers the same address in `ios/App/App/Info.plist`)
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

## 4. A test account for Google Play's (and Apple's) reviewers
Google's reviewers can't open an emailed link, so after step 3, make a **new Google account just for review** (never a
personal one), sign in to the app with it once, and put its address and password in Play Console → App content →
App access. Nobody else needs it. App Store Connect → App Review Information asks for the same account (`APP_STORE.md`).

## 5. Sign in with Apple (the iPhone app; App Store rule 4.8 needs it because the app offers Google)
The button is already in the code but **hidden**: `APPLE_SIGNIN` in `src/accountui.ts` is `false`. Do steps a to f, and only
then ask me (or edit that line yourself) to set it to `true` and rebuild. If it is switched on before Supabase has the
Apple provider, tapping it shows an error page. Apple's own screens never see the app: they come back through Supabase.

a. **Apple Developer Program membership** (developer.apple.com/programs, about 99 US dollars a year; a charity can ask Apple
   for a fee waiver; enrolling as an organisation needs a D-U-N-S number). Wait until the membership is active.
b. **Certificates, Identifiers & Profiles → Identifiers → + → App IDs → App.** Description *SWC Chess School*, Bundle ID
   (Explicit) `com.sikhworldchampionship.chess`. Under Capabilities tick **Sign in with Apple** (set it up as *Enable as
   a primary App ID*). Save. (In Xcode, add the same capability to the App target: Signing & Capabilities → + Capability.)
c. **Identifiers → + → Services IDs.** Description *SWC Chess School sign-in*, Identifier e.g. `com.sikhworldchampionship.chess.signin`
   (it must differ from the App ID). Save, open it, tick **Sign in with Apple → Configure**:
   - Primary App ID: the one from step b.
   - **Domains:** `bqcfdrbnavpsmpgvnitt.supabase.co`
   - **Return URLs:** `https://bqcfdrbnavpsmpgvnitt.supabase.co/auth/v1/callback`
   Save. This Services ID is Supabase's **Client ID**.
d. **Keys → + .** Name *SWC Chess School sign-in*, tick **Sign in with Apple → Configure** and pick the App ID. Register, then
   **download the .p8 file once** (Apple lets you download it only one time) and note the **Key ID**. Also note your **Team ID**
   (top right of the Apple Developer page, or Membership details).
e. **Make the client secret.** Supabase wants a JWT signed with the .p8, not the file itself. Supabase's docs
   (Auth → Social Login → Sign in with Apple) give a small generator; run it on your own computer. Apple's secrets expire
   after at most **6 months**, so put a reminder in your calendar to make a new one and paste it in again, or sign-in
   with Apple will stop working. Keep the .p8 file private; never send it to me or put it in this repository.
f. **Supabase → Authentication → Providers → Apple.** Switch **Enable** on. Paste the **Services ID** into *Client IDs*
   (you may add the App ID `com.sikhworldchampionship.chess` after it, separated by a comma) and the generated secret into
   *Secret Key*. Save. The callback URL shown there should read `https://bqcfdrbnavpsmpgvnitt.supabase.co/auth/v1/callback`
   (the same one as in step c). Redirect URLs in part 1 above already cover the apps and the website.
g. **Turn the button on:** `const APPLE_SIGNIN = true;` in `src/accountui.ts`, then `cd native && npm run sync` (Android)
   and `npm run sync:ios` (iPhone), and rebuild the website. Test: on an iPhone, Settings → Account → Sign in with Apple
   should open Apple's page in a Safari sheet and drop you back in the app, signed in. Apple may give a private relay
   email address (`...@privaterelay.appleid.com`); that is fine, it is the learner's parent's account email. The name is
   given only the first time, and the app does not use it.

If you would rather not offer Google at all on iPhone, App Review 4.8 would no longer need Apple: tell me and I will make
the Google button Android-and-web only. The email link works on its own.

## How to check it worked
1. On a phone, open https://scc-chess-school.pages.dev, tap Get started, enter your email, and open the link from
   the email **on the same phone**: you should land back in the school, signed in.
2. With the Android or iPhone app installed, do the same in the app: the link (or Google) should bring you back into the
   app, signed in. An expired link shows "That sign-in link didn't work…" with a box to ask for a new one.
