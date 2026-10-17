# SWC Chess School · the Play Store, everything to paste

Drafted 2026-10-17 for version 1.0.0 (DECISIONS #121). Read the Panjabi before it goes live; the privacy page must be
approved and published before the app is submitted (Google checks the link).

## Before you start (only you can do these)
1. **Approve the privacy page.** Then I publish it at `https://scc-chess-school.pages.dev/privacy.html`.
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
| Privacy policy | https://scc-chess-school.pages.dev/privacy.html |
| Price | Free · no ads · no in-app purchases |

## Short description (80 characters max)

**English (UK)** (78):
> Learn chess step by step in Panjabi and English, from first moves to tournaments.

**ਪੰਜਾਬੀ**:
> ਪਹਿਲੀ ਚਾਲ ਤੋਂ ਟੂਰਨਾਮੈਂਟ ਤੱਕ, ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਕਦਮ-ਕਦਮ ਸ਼ਤਰੰਜ ਸਿੱਖੋ।

## Full description (4,000 characters max)

**English (UK)**
> SWC Chess School teaches chess from the very first move to tournament play, in Panjabi and English, for every age.
> It is free, with no adverts and no account, and it works with no internet connection.
>
> • 84 lessons in 10 levels, from how the pieces move to tactics, endgames, openings and strategy
> • Three looks for three ages: big and friendly for 5–9, the full course for 10–15, clean and compact for adults
> • A friendly coach explains every idea, and the superheroes of each level (Himmat, Seva, Ekta and more) cheer you on
> • Six bots to play, from beginner to strong club player, each with their own style, plus Play vs Coach
> • Magical Chess: gold gems appear on the board, and a piece that lands on one may change into a new piece
> • Thousands of real puzzles: daily puzzle, rated puzzles, themes, Puzzle Race, Puzzle Survival and Solo Chess
> • Game Review after every game: accuracy, key moments and a better move to try, explained in words
> • Insights: your openings, the part of the game you lose most points in, and how thinking time helps you
> • An analysis board with a position editor, an openings trainer and a two-player mode on one phone
> • Dark and light looks, piece sets and boards to earn, and share your best games as a picture
>
> Everything stays on your phone: no sign-in, no tracking, nothing sent anywhere. The code is open source (GPLv3).
>
> Made by Shaheedi Bunga, a UK Sikh charity, as part of Sikh World Championships.

**ਪੰਜਾਬੀ**
> SWC ਸ਼ਤਰੰਜ ਪਾਠਸ਼ਾਲਾ ਪਹਿਲੀ ਚਾਲ ਤੋਂ ਟੂਰਨਾਮੈਂਟ ਤੱਕ, ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ, ਹਰ ਉਮਰ ਲਈ ਸ਼ਤਰੰਜ ਸਿਖਾਉਂਦੀ ਹੈ।
> ਇਹ ਮੁਫ਼ਤ ਹੈ, ਕੋਈ ਇਸ਼ਤਿਹਾਰ ਨਹੀਂ, ਕੋਈ ਖਾਤਾ ਨਹੀਂ, ਅਤੇ ਇੰਟਰਨੈੱਟ ਤੋਂ ਬਿਨਾਂ ਚੱਲਦੀ ਹੈ।
>
> • ੧੦ ਪੱਧਰਾਂ ਵਿੱਚ ੮੪ ਪਾਠ: ਮੋਹਰਿਆਂ ਦੀ ਚਾਲ ਤੋਂ ਦਾਅ-ਪੇਚ, ਅੰਤਲੀ ਖੇਡ, ਸ਼ੁਰੂਆਤਾਂ ਅਤੇ ਰਣਨੀਤੀ ਤੱਕ
> • ਤਿੰਨ ਉਮਰਾਂ ਲਈ ਤਿੰਨ ਦਿੱਖਾਂ
> • ਹਰ ਗੱਲ ਸਮਝਾਉਣ ਵਾਲਾ ਕੋਚ, ਅਤੇ ਹਰ ਪੱਧਰ ਦੇ ਸੁਪਰਹੀਰੋ
> • ਖੇਡਣ ਲਈ ਛੇ ਬੋਟ, ਅਤੇ ਕੋਚ ਨਾਲ ਖੇਡੋ
> • ਜਾਦੂਈ ਸ਼ਤਰੰਜ: ਬੋਰਡ ਉੱਤੇ ਸੁਨਹਿਰੀ ਰਤਨ
> • ਹਜ਼ਾਰਾਂ ਅਸਲੀ ਬੁਝਾਰਤਾਂ
> • ਹਰ ਖੇਡ ਤੋਂ ਬਾਅਦ ਖੇਡ ਦੀ ਪੜਚੋਲ, ਅਤੇ ਤੁਹਾਡੀ ਖੇਡ ਦੀ ਝਲਕ
>
> ਸਭ ਕੁਝ ਤੁਹਾਡੇ ਫ਼ੋਨ ਉੱਤੇ ਹੀ ਰਹਿੰਦਾ ਹੈ। ਸ਼ਹੀਦੀ ਬੁੰਗਾ ਵੱਲੋਂ, Sikh World Championships ਦਾ ਹਿੱਸਾ।

## Graphics
- **App icon 512×512:** `store/app-icon-512.png` (the knight in its phulkari border).
- **Feature graphic 1024×500:** `store/feature-graphic-1024x500.png`.
- **Phone screenshots (at least 2, up to 8):** `store/phone-*.png`, taken from the app on a Pixel 8.

## Store settings → App content (Google's questions)
| Question | Answer |
|---|---|
| Privacy policy | the URL above |
| Ads | **No, my app does not contain ads** |
| App access | **All functionality is available without special access** |
| Content rating | Fill the questionnaire: category *Reference, News, or Educational*; no violence, no user-to-user communication, no sharing of location, no purchases. Expected rating: **PEGI 3 / Everyone**. |
| Target audience | **5 and under? No.** Tick **6–8, 9–12, 13–15, 16–17, 18 and over**. Google then applies the **Families policy**. |
| Appeal to children | Yes (it is a children's school) |
| Data safety | **Does the app collect or share any user data? No.** (Nothing leaves the phone; there is no internet permission.) Data encrypted in transit: not applicable. Data deletion: not applicable (nothing collected). |
| Government app | No |
| Financial features | None |
| Health | None |
| News app | No |

**Families policy notes for the reviewer** (paste into *App content → Target audience → Notes*, if asked):
> The app is a chess school for all ages from a UK charity. Version 1 has no sign-in, no network access (no INTERNET
> permission), no ads, no analytics, no third-party SDKs and no data collection. Everything is stored on the device.

## Release
1. **Testing → Internal testing → Create release**, upload `app-release.aab`, release name `1.0.0 (1)`.
2. Add yourself and the team as testers, install from the Play link on a real phone, and try a lesson, a bot game and
   a puzzle.
3. Then **Production → Create release** with the same bundle. Countries: all (or the UK, India, Canada, the US,
   Australia, Kenya and Europe to start).
4. Release notes:
   > First release: 84 lessons in Panjabi and English, bots, Magical Chess, puzzles, Game Review and Insights.

## Updating later
Raise `versionCode` (by 1) and `versionName` in `android/app/build.gradle`, run `npm run sync`, then build the signed
bundle again with the same key.
