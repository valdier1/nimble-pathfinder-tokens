#!/usr/bin/env bash
# Runs the module's tests. Usage: tools/tests/run.sh   (from anywhere)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"
cp "$REPO/nimble-pathfinder-tokens/scripts/nimble-art.js" "$HERE/.nimble-art.mjs"
cd "$REPO/nimble-pathfinder-tokens"
for t in "$HERE"/test-*.mjs; do echo "== $(basename "$t")"; node "$t" 2>/dev/null | tail -1; done
rm -f "$HERE/.nimble-art.mjs"
