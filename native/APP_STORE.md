# SWC Chess School · the App Store, everything to paste

Drafted 2026-11-03 for version 1.1.0 (DECISIONS #37, #121-125). It mirrors `PLAY_STORE.md`; where the two answer the
same question (data safety, content rating) the answers agree. Nothing here has been entered into App Store Connect:
only you can do that. The Panjabi line is a DRAFT until the translator checks it.

## App information

| Field | Value |
|---|---|
| Name (30 max) | SWC Chess School |
| Subtitle (30 max) | Learn chess, Panjabi + English |
| Bundle ID (permanent) | `com.sikhworldchampionship.chess` |
| SKU | `swc-chess-school` |
| Primary language | English (UK) |
| Primary category | **Education** |
| Secondary category | Games, then Board (optional) |
| Price | Free · no ads · no in-app purchases |
| Support URL | https://scc-chess-school.pages.dev/privacy (the privacy page has the contact email; or use https://scc-chess-school.pages.dev) |
| Marketing URL | https://scc-chess-school.pages.dev |
| Privacy Policy URL | https://scc-chess-school.pages.dev/privacy |
| Contact email | gurmat@shaheedibunga.com |
| Copyright | 2026 Shaheedi Bunga |

**Why Education and NOT the Kids Category.** The Kids Category is for apps made for children under 11 and bans
third-party sign-in (Google, Apple) and links out. This school is for every age (5 to adult), a parent signs in with their
own account (Google, email link, or Apple), and children play online with friends their parent accepted. That is not
allowed in the Kids Category, and the app is also meant for teenagers and adults. Education with an age rating of 4+
is accurate and keeps every feature. (Do not tick "Made for Kids".)

## Promotional text (170 max, can be changed any time without a new review)

> Learn chess from the first move to tournament play: 93 lessons, 8 bots, a 34-opening course, puzzles and live kirtan from Sri Darbar Sahib. Free, no ads.

## Description (4,000 max)

> SWC Chess School teaches chess from the very first move to tournament play, in Panjabi and English, for every age.
> It is free, with no adverts. A parent's account keeps each learner's progress on every device, and the lessons,
> bots and puzzles keep working without an internet connection.
>
> • 93 lessons in 10 levels, from how the pieces move to tactics, endgames, openings and strategy
> • An openings course of 34 openings, each taught in five steps: learn it, practise it, watch a model win, play the whole game to mate, then review
> • Three looks for three ages: big and friendly for 5–9, the full course for 10–15, clean and compact for adults
> • A friendly coach explains every idea, and the superheroes of each level (Himmat, Seva, Ekta and more) cheer you on
> • Eight bots to play, from a beginner up to about 2300 (strong club and master level), each with their own style, plus Play vs Coach
> • Magical Chess: gold gems appear on the board, and a piece that lands on one may change into a new piece
> • Thousands of real puzzles: daily puzzle, rated puzzles, themes, Puzzle Race, Puzzle Survival and Solo Chess
> • Calculate: see the moves in your head and train your board vision
> • Master games: replay famous games and guess the move at each turn
> • The endgame ladder: win famous endgames, or hold the draw, one rung at a time
> • Game Review after every game: accuracy, key moments and a better move to try, explained in words
> • Insights: your openings, the part of the game you lose most points in, and how thinking time helps you
> • An analysis board with a position editor, an openings trainer and a two-player mode on one phone
> • Live kirtan from Sri Darbar Sahib (Harmandar Sahib), streamed through SikhNet Radio, to play quietly in the background while you learn (it needs an internet connection and can be paused or turned off in Settings)
> • Dark and light looks, piece sets and boards to earn, and share your best games as a picture
> • Play friends and classmates online: only four friendly messages, and no chat
>
> No adverts, no tracking, and nothing sold or shared. Children appear to other players only as an animal and a
> colour, and there is no chat. The code is open source (GPLv3).
>
> Made by Shaheedi Bunga, a UK Sikh charity, as part of Sikh World Championships.

Panjabi (draft). If App Store Connect has no Panjabi listing language for you, put this single line at the end of the
English description instead:
> ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ, ਹਰ ਉਮਰ ਲਈ ਸ਼ਤਰੰਜ ਸਿੱਖੋ: ੯੩ ਪਾਠ, ਅੱਠ ਬੋਟ, ੩੪ ਸ਼ੁਰੂਆਤਾਂ ਦਾ ਕੋਰਸ ਅਤੇ ਬੁਝਾਰਤਾਂ।

## What's New in this version (4,000 max)

> What's new: eight bots up to about 2300, a 34-opening course with model wins, live kirtan from Sri Darbar Sahib,
> Calculate, master games, the endgame ladder and an analysis board. 93 lessons in Panjabi and English.

(For the very first iPhone release, Apple shows no "What's New"; paste it anyway if the box is there.)

## Keywords (100 max, commas, no spaces after them)

`chess,learn chess,puzzles,openings,tactics,endgame,Punjabi,Panjabi,Sikh,bots,lessons,school,kirtan`

(Apple already indexes the app name and the category, so those words are not repeated. 98 characters.)

## Graphics
- **App icon:** built in (1024 × 1024, opaque, no rounded corners: iOS rounds it).
- **Screenshots:** App Store Connect needs the **6.9-inch iPhone** set (1320 × 2868) and, for an iPad build, 13-inch iPad.
  There is no Xcode on this Mac, so take them in Xcode's Simulator or on a real iPhone. The Android ones in `store/`
  are the wrong size and must not be reused as they are. Suggested five: home, a lesson, a bot game, Magical Chess, puzzles.

## Age rating (App Store Connect → App Information → Age Rating)
Apple's questionnaire (the 2025 version, with ratings 4+, 9+, 13+, 16+, 18+). Answers:

| Question | Answer |
|---|---|
| Cartoon or fantasy violence; realistic violence; sexual content or nudity; profanity; horror; alcohol, tobacco, drugs; gambling and contests; medical or treatment info | **None** (the animals and the superheroes are friendly cartoons; chess captures are not depicted as violence) |
| Simulated gambling / loot boxes | **None** (the gold gems of Magical Chess are earned by play; nothing is bought) |
| Unrestricted web access | **No** (the app opens only its own pages) |
| User-generated content | **No** (four fixed friendly messages; no free text, no photos, no chat) |
| Messaging / chat | **No** |
| Advertising | **No** |
| Parental controls / age assurance | **No** |
| Expected result | **4+** (do not raise it unless Apple's own questions force it) |

## App Privacy (App Store Connect → App Privacy). Matches the Play data-safety answers.
- **Do you or your third-party partners collect data from this app? Yes.**
- **Tracking: No.** No data is used to track people across other companies' apps or sites; no advertising ID; no
  analytics SDK. (So there is no App Tracking Transparency prompt and none is needed.)
- Data types, each **linked to the user's identity**, **not used for tracking**, purpose **App Functionality**:
  - **Contact Info → Email Address**: required for an account (the sign-in link, Google, or Apple's relay address).
  - **Contact Info → Name**: optional; Google or Apple may pass it on. We do not use or show it; it is deleted with the account.
  - **Identifiers → User ID**: the account's internal ID.
  - **User Content → Gameplay Content**: lessons, puzzle results, ratings and online games (Play: "App activity → Other actions").
  - Google's profile-picture link (optional, not shown): Apple has no exact type; the closest is **User Content → Other User Content**. Declare it there to be safe, as the Play form declares it under "Other info".
- Not collected: Health, Financial, **Location**, Contacts, Search history, Browsing history, Purchases, Usage data,
  Diagnostics, Sensitive info, Photos or videos, Audio.
- **Deletion:** in the app, Settings → Account → Delete my account (App Review rule 5.1.1(v) needs this in the app: it is there).
- Data is encrypted in transit (HTTPS) and is shared with no one. Supabase (the charity's database host) processes it
  for us and is not a third party that receives it for its own use.

## Export compliance (App Store Connect asks on every build)
The app uses only HTTPS (the operating system's own encryption) and no custom or proprietary encryption. Answer:
**"Uses encryption: Yes, but it qualifies for the exemption"**: only standard encryption in the operating system, via
HTTPS. The project already carries `ITSAppUsesNonExemptEncryption = false` in `ios/App/App/Info.plist`, so Apple's
question is answered automatically on each upload. No documents are needed; no French encryption declaration is
needed for exempt standard encryption.

## App Review information
- **Sign-in required:** yes. Provide a demo account. The emailed link cannot be opened by a reviewer, so make a **new
  Google account just for review** (never a personal one), and give its address and password. (This is the same
  account as the Play reviewers' one: `SIGN-IN-SETUP.md` part 4.)
- **Contact:** your name, phone and `gurmat@shaheedibunga.com`.
- **Notes** (paste):

> SWC Chess School is a free chess school from a UK charity (Shaheedi Bunga), for all ages, in Panjabi and English.
>
> Sign-in is optional for the lessons but the app asks a parent or adult to sign in so progress is saved. Options: an
> emailed one-tap link, Continue with Google, and Sign in with Apple. Demo account (Google): [address] / [password].
> Tap Get started, confirm you are a parent or 13+, then Continue with Google and use the demo account.
>
> Children never create accounts. They are shown to other players only as an animal and a colour. Online play is with
> friends a parent accepted or classmates in a teacher's class; there is no chat, only four fixed friendly messages; adults
> and children are never paired. No ads, no analytics, no tracking, no purchases.
>
> Account deletion: Settings → Account → Delete my account.
>
> Live kirtan: an optional audio stream (SGPC's live broadcast of Sri Darbar Sahib via SikhNet Radio, used with the
> charity's permission) can be switched on or off in Settings. It is audio only.
>
> The app is open source (GPLv3): https://scc-chess-school.pages.dev

## Capabilities and signing (Xcode)
- **Sign in with Apple** capability on the App target (Signing & Capabilities → + Capability), once the Apple Developer
  membership is active. Without it the Apple button must stay off (`APPLE_SIGNIN` in `src/accountui.ts`).
- No push notifications, no background modes, no camera, microphone, photo or location permissions are used, so there
  are no usage-description strings to explain.

## Release
1. **TestFlight first**: Product → Archive in Xcode, upload, add yourself and the team as internal testers, install on a
   real iPhone and try a lesson, a bot game, a puzzle, sign in with the email link and Google (and Apple, once on), and
   an online game.
2. Then **App Store → Version 1.1.0 → select the build → Add for Review**. Version 1.1.0, build 1 (build numbers must go up on every upload).
