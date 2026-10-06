# SCC Chess School · ਸ਼ਤਰੰਜ ਪਾਠਸ਼ਾਲਾ

Graded chess lessons for all ages, in Punjabi and English. Vite + TypeScript PWA (DECISIONS #32).
Free. Works with no account; optional sign-in (Google or email link, Supabase) saves progress to any device, see `SUPABASE-SETUP.md`. Source is GPL-3.0 (DECISIONS #24).

```
src/chess/       board (tap + drag, marks, arrows), drill move rules, piece sets A/C/B/B2/V
src/lesson/      the lesson format (types.ts), the exercise runners, the lesson player
src/content/     levels.ts (10 levels), level1.ts (9 lessons, DRAFT), puzzles/*.json (Lichess CC0)
src/coach.ts     coach art (Chidi / Singh / Kaur, from public/art/coach)
src/sync.ts      optional sign-in + progress sync; src/merge.ts merges device and account progress
src/accountui.ts the Account box in Settings (13+ gate, Google, email link, delete account)
public/art/      the user's artwork, cut by tools/slice-art.py from ../../images/
supabase/        schema.sql: the one progress table, row-level security, delete_my_account()
src/i18n.ts      every interface string in both languages
test/            the content guard: every drill solvable, every puzzle legal, both languages present
tools/           build-puzzles.mjs (streams the Lichess DB), preview-copy.sh
```

## Commands
```bash
npm run check        # TypeScript + the content guard - a FAIL stops the batch
npm run build        # check, then build dist/ (offline-capable PWA)
npm run puzzles      # rebuild the puzzle packs from the Lichess database (~15 s)
python3 tools/slice-art.py   # re-cut the artwork after a sheet in images/ changes
```
The in-app preview server cannot read ~/Desktop, so `tools/preview-copy.sh <dir>` builds and copies `dist/` to a folder it can.

## Adding a lesson
Write it as data in `src/content/levelN.ts` (see `src/lesson/types.ts`). Then run `npm run check`.
The guard solves every stars/safe drill and fails if a move limit is impossible, or if a challenge limit is
looser than the true minimum. Lessons start as `status: "draft"`. Only the user's word flips one to `"checked"` (DECISIONS #33).

## The three looks
`data-look` on `<html>` (young / junior / adult) switches the whole presentation in `styles.css`.
The lesson data is identical in every look.
