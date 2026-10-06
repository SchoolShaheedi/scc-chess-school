#!/bin/sh
# Build, then copy dist to the scratchpad the preview server reads (it cannot read ~/Desktop).
set -e
cd "$(dirname "$0")/.."
npm run build >/dev/null
rm -rf "$1" && cp -R dist "$1"
echo "built and copied to $1"
