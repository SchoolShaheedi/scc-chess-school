#!/bin/sh
# Build, then copy dist to the scratchpad the preview server reads (it cannot read ~/Desktop).
set -e
cd "$(dirname "$0")/.."
npm run build >/dev/null
rm -rf "$1" && cp -R dist "$1"
# the preview server script lives beside the build folder (see tools/serve-preview.py)
cp tools/serve-preview.py "$(dirname "$1")/serve-scc-school.py"
mkdir -p "$1/trials/heroes" && cp ../../02_Design/trials/heroes/* "$1/trials/heroes/" 2>/dev/null; mkdir -p "$1/trials/brand" && cp ../../02_Design/trials/brand/* "$1/trials/brand/" 2>/dev/null; mkdir -p "$1/trials" && cp ../../02_Design/trials/game-feel-trials.html ../../02_Design/trials/trials-boards.js ../../02_Design/trials/power-chess-trials.html ../../02_Design/trials/power-chess-trials.js ../../02_Design/trials/review-trials.html ../../02_Design/trials/coach-trials.html ../../02_Design/trials/heroes-trials.html ../../02_Design/trials/look-trials.html ../../02_Design/trials/insights-trials.html "$1/trials/" 2>/dev/null || true
echo "built and copied to $1"
