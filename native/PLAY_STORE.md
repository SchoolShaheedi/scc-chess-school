# SWC Chess School · the Play Store, everything to paste

Drafted 2026-10-17 for version 1.0.0 (DECISIONS #121); updated 2026-10-18 for the FULL version with sign-in and online
play (#123); refreshed 2026-11-03 for **version 1.1.0 (versionCode 2)**: eight bots, the 34-opening course, live kirtan,
Calculate, master games, the endgame ladder. The new Panjabi lines below are a DRAFT until the translator checks them.
The App Store listing is in `APP_STORE.md`. The Panjabi was checked by the translator the same day (three
missing claims restored: no sign-in or tracking, the puzzle modes, what Game Review and Insights do). The privacy page
is approved and live.

## Before you start (only you can do these)
1. **Approve the privacy page.** Then I publish it at `https://scc-chess-school.pages.dev/privacy`.
2. **Build the signed bundle in Android Studio.** Open `native/android` (`npm run open`), then
   **Build → Generate Signed App Bundle / APK → Android App Bundle**. Choose the **same key file and password as the
   Sikhi Calendar**, build variant **release**. The file appears in `native/android/app/release/app-release.aab`.
3. **In Play Console (Shaheedi Bunga's account) → Create app**: name *SWC Chess School*, default language English (UK),
   **App**, **Free**, and tick the declarations.

## App details

| Field | Value |
|---|---|
| App name (30 max) | SWC Chess School |
| Package (permanent) | `com.sikhworldchampionship.chess` |
| Category | Education (alternative: Board games) |
| Contact email | gurmat@shaheedibunga.com |
| Website | https://scc-chess-school.pages.dev |
| Privacy policy | https://scc-chess-school.pages.dev/privacy |
| Price | Free · no ads · no in-app purchases |

## Short description (80 characters max)

**English (UK)** (80, no full stop: with one it is 81, over the limit):
> Learn chess step by step in Panjabi and English, from first moves to tournaments

**ਪੰਜਾਬੀ**:
> ਪਹਿਲੀ ਚਾਲ ਤੋਂ ਟੂਰਨਾਮੈਂਟ ਤੱਕ, ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਕਦਮ-ਕਦਮ ਸ਼ਤਰੰਜ ਸਿੱਖੋ।

## Full description (4,000 characters max)

**Google rejected the 1.2.0 listing on 2026-11-08 (Metadata policy: store listing promotion).** No price, "free", "no ads", rating-strength or "thousands" claims anywhere in the description, icon or promotional images. The text below is the corrected version.

**English (UK)**
> SWC Chess School teaches chess from the very first move to tournament play, in Panjabi and English, for every age.
> A parent's account keeps each learner's progress on every device, and the lessons,
> bots and puzzles keep working without an internet connection.
>
> • 93 lessons in 10 levels, from how the pieces move to tactics, endgames, openings and strategy
> • An openings course of 34 openings, each taught in five steps: learn it, practise it, watch a model win, play the whole game to mate, then review
> • Learn all the checkmates: 37 named mates, from the back-rank mate to famous traps, each one shown, built up move by move, played with help, then practised on real puzzles
> • Three looks for three ages: big and friendly for 5–9, the full course for 10–15, clean and compact for adults
> • A friendly coach explains every idea, and the superheroes of each level (Himmat, Seva, Ekta and more) cheer you on
> • Eight bots to play, from beginner to advanced, each with their own style, plus Play vs Coach
> • Magical Chess: gold gems appear on the board, and a piece that lands on one may change into a new piece
> • Real puzzles from real games: daily puzzle, rated puzzles, themes, Puzzle Race, Puzzle Survival and Solo Chess
> • Calculate: see the moves in your head and train your board vision
> • Master games: replay famous games and guess the move at each turn
> • The endgame ladder: win famous endgames, or hold the draw, one rung at a time
> • Game Review after every game: accuracy, key moments and a better move to try, explained in words
> • Insights: your openings, the part of the game you lose most points in, and how thinking time helps you
> • An analysis board with a position editor, an openings trainer and a two-player mode on one phone
> • Live kirtan from Sri Darbar Sahib (Harmandar Sahib), streamed through SikhNet Radio, to play quietly in the background while you learn (it needs an internet connection and can be paused or turned off in Settings)
> • Dark and light looks, piece sets and boards to earn, and share your games as a picture
> • Play online: grown-ups get auto-match, ratings and play anyone; children play only friends their parent accepted and classmates, with four friendly messages and no chat
>
> Children appear to other players only as an animal and a
> colour, and there is no chat. The code is open source (GPLv3).
>
> Made by Shaheedi Bunga, a UK Sikh charity, as part of Sikh World Championships.

**ਪੰਜਾਬੀ** (draft, for the translator to check)
> SWC ਸ਼ਤਰੰਜ ਪਾਠਸ਼ਾਲਾ ਪਹਿਲੀ ਚਾਲ ਤੋਂ ਟੂਰਨਾਮੈਂਟ ਤੱਕ, ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ, ਹਰ ਉਮਰ ਲਈ ਸ਼ਤਰੰਜ ਸਿਖਾਉਂਦੀ ਹੈ।
> ਮਾਤਾ-ਪਿਤਾ ਦਾ ਖਾਤਾ ਹਰ ਸਿੱਖਣ ਵਾਲੇ ਦਾ ਸਿੱਖਿਆ ਦਾ ਹਿਸਾਬ ਹਰ ਡਿਵਾਈਸ 'ਤੇ ਸੰਭਾਲਦਾ ਹੈ, ਅਤੇ ਪਾਠ, ਬੋਟ ਅਤੇ ਬੁਝਾਰਤਾਂ ਇੰਟਰਨੈੱਟ ਤੋਂ ਬਿਨਾਂ ਵੀ ਚੱਲਦੇ ਹਨ।
>
> • ੧੦ ਪੱਧਰਾਂ ਵਿੱਚ ੯੩ ਪਾਠ: ਮੋਹਰਿਆਂ ਦੀ ਚਾਲ ਤੋਂ ਦਾਅ-ਪੇਚ, ਅੰਤਲੀ ਖੇਡ, ਸ਼ੁਰੂਆਤਾਂ ਅਤੇ ਰਣਨੀਤੀ ਤੱਕ
> • ੩੪ ਸ਼ੁਰੂਆਤਾਂ ਦਾ ਕੋਰਸ: ਹਰ ਸ਼ੁਰੂਆਤ ਪੰਜ ਕਦਮਾਂ ਵਿੱਚ, ਸਿੱਖੋ, ਅਭਿਆਸ ਕਰੋ, ਨਮੂਨੇ ਦੀ ਜਿੱਤ ਵੇਖੋ, ਪੂਰੀ ਖੇਡ ਮਾਤ ਤੱਕ ਖੇਡੋ, ਅਤੇ ਦੁਹਰਾਓ
> • ਸਾਰੀਆਂ ਸ਼ਹਿ-ਮਾਤਾਂ ਸਿੱਖੋ: ੩੭ ਨਾਂ ਵਾਲੀਆਂ ਮਾਤਾਂ, ਪਿਛਲੀ ਕਤਾਰ ਦੀ ਮਾਤ ਤੋਂ ਮਸ਼ਹੂਰ ਜਾਲਾਂ ਤੱਕ, ਹਰ ਇੱਕ ਵੇਖੋ, ਚਾਲ-ਦਰ-ਚਾਲ ਬਣਦੀ ਵੇਖੋ, ਮਦਦ ਨਾਲ ਖੇਡੋ, ਫਿਰ ਅਸਲੀ ਬੁਝਾਰਤਾਂ 'ਤੇ ਅਭਿਆਸ ਕਰੋ
> • ਤਿੰਨ ਉਮਰਾਂ ਲਈ ਤਿੰਨ ਦਿੱਖਾਂ: ੫–੯ ਸਾਲ ਲਈ ਵੱਡੀ ਅਤੇ ਦੋਸਤਾਨਾ, ੧੦–੧੫ ਲਈ ਪੂਰਾ ਕੋਰਸ, ਵੱਡਿਆਂ ਲਈ ਸਾਫ਼ ਅਤੇ ਸੰਖੇਪ
> • ਦੋਸਤਾਨਾ ਕੋਚ ਹਰ ਗੱਲ ਸਮਝਾਉਂਦੇ ਹਨ, ਅਤੇ ਹਰ ਪੱਧਰ ਦੇ ਸੁਪਰਹੀਰੋ (ਹਿੰਮਤ, ਸੇਵਾ, ਏਕਤਾ ਅਤੇ ਹੋਰ) ਤੁਹਾਡਾ ਹੌਸਲਾ ਵਧਾਉਂਦੇ ਹਨ
> • ਖੇਡਣ ਲਈ ਅੱਠ ਬੋਟ, ਨਵੇਂ ਸਿੱਖਣ ਵਾਲੇ ਤੋਂ ਉੱਚੇ ਪੱਧਰ ਤੱਕ, ਹਰ ਇੱਕ ਦਾ ਆਪਣਾ ਅੰਦਾਜ਼; ਨਾਲ ਹੀ ਕੋਚ ਨਾਲ ਖੇਡੋ
> • ਜਾਦੂਈ ਸ਼ਤਰੰਜ: ਬਿਸਾਤ ਉੱਤੇ ਸੁਨਹਿਰੀ ਰਤਨ ਆਉਂਦੇ ਹਨ, ਅਤੇ ਰਤਨ ਉੱਤੇ ਪਹੁੰਚਿਆ ਮੋਹਰਾ ਨਵਾਂ ਮੋਹਰਾ ਬਣ ਸਕਦਾ ਹੈ
> • ਅਸਲੀ ਖੇਡਾਂ ਵਿੱਚੋਂ ਅਸਲੀ ਬੁਝਾਰਤਾਂ: ਅੱਜ ਦੀ ਬੁਝਾਰਤ, ਰੇਟਿੰਗ ਵਾਲੀਆਂ ਬੁਝਾਰਤਾਂ, ਵਿਸ਼ੇ, ਬੁਝਾਰਤ ਦੌੜ, ਤਿੰਨ ਮੌਕੇ ਅਤੇ ਇਕੱਲੀ ਸ਼ਤਰੰਜ
> • ਅੱਗੇ ਦੀ ਸੋਚ: ਚਾਲਾਂ ਨੂੰ ਮਨ ਵਿੱਚ ਵੇਖੋ, ਅਤੇ ਬੋਰਡ ਵੇਖਣ ਦਾ ਅਭਿਆਸ ਕਰੋ
> • ਉਸਤਾਦੀ ਖੇਡਾਂ: ਮਸ਼ਹੂਰ ਖੇਡਾਂ ਮੁੜ ਖੇਡੋ ਅਤੇ ਹਰ ਚਾਲ 'ਤੇ ਅੰਦਾਜ਼ਾ ਲਾਓ ਕਿ ਕਿਹੜੀ ਚਾਲ ਚੱਲੀ ਗਈ ਸੀ
> • ਅੰਤਲੀ ਖੇਡ ਦੀ ਪੌੜੀ: ਮਸ਼ਹੂਰ ਅੰਤਲੀਆਂ ਖੇਡਾਂ ਜਿੱਤੋ, ਜਾਂ ਬਰਾਬਰੀ ਬਚਾਓ, ਇੱਕ-ਇੱਕ ਪੌੜੀ ਚੜ੍ਹ ਕੇ
> • ਹਰ ਖੇਡ ਤੋਂ ਬਾਅਦ ਖੇਡ ਦੀ ਪੜਚੋਲ: ਸ਼ੁੱਧਤਾ, ਅਹਿਮ ਪਲ ਅਤੇ ਅਜ਼ਮਾਉਣ ਲਈ ਇੱਕ ਬਿਹਤਰ ਚਾਲ, ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਮਝਾਈ ਹੋਈ
> • ਤੁਹਾਡੀ ਖੇਡ ਦੀ ਝਲਕ: ਤੁਹਾਡੀਆਂ ਸ਼ੁਰੂਆਤਾਂ, ਖੇਡ ਦਾ ਉਹ ਹਿੱਸਾ ਜਿੱਥੇ ਤੁਸੀਂ ਸਭ ਤੋਂ ਵੱਧ ਅੰਕ ਗੁਆਉਂਦੇ ਹੋ, ਅਤੇ ਸੋਚਣ ਦਾ ਸਮਾਂ ਕਿਵੇਂ ਮਦਦ ਕਰਦਾ ਹੈ
> • ਵਿਸ਼ਲੇਸ਼ਣ ਬਿਸਾਤ, ਸ਼ੁਰੂਆਤਾਂ ਦਾ ਅਭਿਆਸ, ਅਤੇ ਇੱਕ ਫ਼ੋਨ ਉੱਤੇ ਦੋ ਖਿਡਾਰੀਆਂ ਲਈ ਖੇਡ
> • ਸ੍ਰੀ ਦਰਬਾਰ ਸਾਹਿਬ (ਹਰਿਮੰਦਰ ਸਾਹਿਬ) ਤੋਂ ਸਿੱਧਾ ਕੀਰਤਨ, ਸਿੱਖਨੈੱਟ ਰੇਡੀਓ ਰਾਹੀਂ, ਸਿੱਖਣ ਵੇਲੇ ਹੌਲੀ ਆਵਾਜ਼ ਵਿੱਚ ਪਿਛੋਕੜ ਵਿੱਚ ਚੱਲਦਾ ਹੈ (ਇੰਟਰਨੈੱਟ ਚਾਹੀਦਾ ਹੈ, ਅਤੇ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਰੋਕਿਆ ਜਾਂ ਬੰਦ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ)
> • ਗੂੜ੍ਹੇ ਅਤੇ ਹਲਕੇ ਰੰਗ, ਜਿੱਤਣ ਲਈ ਮੋਹਰੇ ਅਤੇ ਬਿਸਾਤਾਂ, ਅਤੇ ਆਪਣੀਆਂ ਖੇਡਾਂ ਤਸਵੀਰ ਵਜੋਂ ਭੇਜੋ
> • ਔਨਲਾਈਨ ਖੇਡੋ: ਵੱਡਿਆਂ ਲਈ ਆਪਣੇ-ਆਪ ਜੋੜੀ, ਰੇਟਿੰਗ ਅਤੇ ਕਿਸੇ ਨਾਲ ਵੀ ਖੇਡ; ਬੱਚੇ ਸਿਰਫ਼ ਮਾਤਾ-ਪਿਤਾ ਵੱਲੋਂ ਮੰਨੇ ਦੋਸਤਾਂ ਅਤੇ ਜਮਾਤੀਆਂ ਨਾਲ ਖੇਡਦੇ ਹਨ, ਚਾਰ ਦੋਸਤਾਨਾ ਸੁਨੇਹਿਆਂ ਨਾਲ, ਕੋਈ ਗੱਲਬਾਤ ਨਹੀਂ
>
> ਬੱਚੇ ਹੋਰ ਖਿਡਾਰੀਆਂ ਨੂੰ ਸਿਰਫ਼ ਜਾਨਵਰ ਅਤੇ ਰੰਗ ਵਜੋਂ ਦਿਸਦੇ ਹਨ, ਅਤੇ ਕੋਈ ਗੱਲਬਾਤ ਨਹੀਂ ਹੈ। ਕੋਡ ਓਪਨ ਸੋਰਸ (GPLv3) ਹੈ।
>
> ਇਹ ਸ਼ਹੀਦੀ ਬੁੰਗਾ, ਯੂ.ਕੇ. ਦੀ ਇੱਕ ਸਿੱਖ ਚੈਰਿਟੀ, ਨੇ Sikh World Championships ਦੇ ਹਿੱਸੇ ਵਜੋਂ ਬਣਾਈ ਹੈ।

## Graphics
- **App icon 512×512:** `store/app-icon-512.png` (the knight in its phulkari border).
- **Feature graphic 1024×500:** `store/feature-graphic-1024x500.png`.
- **Phone screenshots (at least 2, up to 8):** `store/phone-*.png`, taken from the app on a Pixel 8.

## Store settings → App content (Google's questions)
| Question | Answer |
|---|---|
| Privacy policy | the URL above |
| Ads | **No, my app does not contain ads** |
| App access | **All or some functionality is restricted**: the app needs a parent's sign-in. Google's reviewers can't open an emailed link, so give them a **Google test account** (make a new Google account for this; never a personal one): *Instructions:* "Tap Get started, confirm you are a parent or 13+, then Continue with Google and sign in with the account below." |
| Content rating | Fill the questionnaire: category *Reference, News, or Educational*; no violence, no sharing of location, no purchases. **Users can interact: yes** (online games with friends and classmates, and four fixed friendly messages), **chat: no**. The live kirtan is audio from SikhNet Radio, not user content. Expected rating: **PEGI 3 / Everyone**, with the note *Users Interact*. |
| Target audience | **5 and under? No.** Tick **6–8, 9–12, 13–15, 16–17, 18 and over**. Google then applies the **Families policy**. |
| Appeal to children | Yes (it is a children's school) |
| Data safety | **Collects data: Yes. Shares data: No.** Encrypted in transit: **Yes**. Users can ask for deletion: **Yes** (Settings → Account → Delete my account, or by email). Declare: **Personal info → Email address** (required; App functionality, Account management); **Personal info → Name** (optional, only when signing in with Google; Account management; we don't use or show it); **Personal info → Other info**: the Google profile picture link (optional, same); **App activity → Other actions**: lessons, puzzle results, ratings and online games (required; App functionality); if Sign in with Apple is switched on, nothing more is declared: Apple gives the same email (possibly a private relay address) and an optional name, which we do not use; **App info → none; Device IDs → none; Location → none; Financial → none**. User IDs: the account's internal ID (required; Account management). |
| Government app | No |
| Financial features | None |
| Health | None |
| News app | No |

**Families policy notes for the reviewer** (paste into *App content → Target audience → Notes*, if asked):
> The app is a chess school for all ages from a UK charity. A parent (or an adult for themselves) signs in; children never
> create accounts. Children are shown to other players only as an animal and a colour; they can play only friends their
> parent accepted or classmates in a teacher's class; there is no chat (four fixed messages only); adults and children
> are never paired. No ads, no analytics, no tracking; data is kept only to run the school (privacy page linked).

## Release
1. **Testing → Internal testing → Create release** (if 1.0.0 was already published, this is an update: same app, same key, versionCode 2), upload `app-release.aab`, release name `1.1.0 (2)`.
2. Add yourself and the team as testers, install from the Play link on a real phone, and try a lesson, a bot game and
   a puzzle.
3. Then **Production → Create release** with the same bundle. Countries: all (or the UK, India, Canada, the US,
   Australia, Kenya and Europe to start).
4. Release notes:
   > What's new: eight bots up to about 2300, a 34-opening course with model wins, live kirtan from Sri Darbar Sahib,
   > Calculate, master games, the endgame ladder and an analysis board. 93 lessons in Panjabi and English.
   >
   > ਨਵਾਂ ਕੀ ਹੈ (draft): ੨੩੦੦ ਤੱਕ ਅੱਠ ਬੋਟ, ਨਮੂਨੇ ਦੀਆਂ ਜਿੱਤਾਂ ਸਮੇਤ ੩੪ ਸ਼ੁਰੂਆਤਾਂ ਦਾ ਕੋਰਸ, ਸ੍ਰੀ ਦਰਬਾਰ ਸਾਹਿਬ ਤੋਂ ਸਿੱਧਾ ਕੀਰਤਨ,
   > ਅੱਗੇ ਦੀ ਸੋਚ, ਉਸਤਾਦੀ ਖੇਡਾਂ, ਅੰਤਲੀ ਖੇਡ ਦੀ ਪੌੜੀ ਅਤੇ ਵਿਸ਼ਲੇਸ਼ਣ ਬਿਸਾਤ।

## Updating later
This listing is for **versionCode 2 / versionName 1.1.0** (already set in `android/app/build.gradle`). Next time raise `versionCode` (by 1) and `versionName`, run `npm run sync`, then build the signed
bundle again with the same key.
