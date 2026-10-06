# SCC Chess School: licences

**Code: GPLv3.** The app's source code in this repository is free software under the GNU General Public
License, version 3 (see `LICENSE`). It has to be: the app includes the **Stockfish** chess engine
(`public/engine/`, GPLv3; its own notice is in `public/engine/COPYING-stockfish.txt`).

**Not covered by the GPL: © Shaheedi Bunga, all rights reserved.**
- the artwork in `public/art/` (the school's piece sets `A`, `B`, `B2`, `C`, the bots, coaches, badges, logo and app icons);
- the lesson text and curriculum in `src/content/` and the coach-voice recordings in `public/audio/`.

Please do not reuse these without the charity's permission.

**Third-party parts, under their own licences:**
- **Piece sets** `public/art/pieces/{cburnett, merida, chessnut, spatial}`: from the Lichess project, with their authors' licences (GPLv2+, Apache 2.0, MIT). The crosses were removed from the kings and bishops; see `public/art/pieces/CREDITS.md`.
- **Puzzles and opening data** in `public/puzzles/bank/`, `src/content/puzzles/` and `public/explorer/`: from the Lichess open database (CC0).
- **Icons:** Lucide (ISC).
- **Fonts:** Jost and Mukta Mahee (SIL Open Font Licence).
