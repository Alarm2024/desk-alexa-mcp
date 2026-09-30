#!/bin/sh
# Fails when a banned word appears in README.md, src, tests, sim, scripts, render.yaml, or .env.example.
# "read-only" is allowed. Defanged hosts ending in [.]live are allowed (TLD, not the banned word).
# This script file is excluded because it must name the banned words to search for them.
set -u
cd "$(dirname "$0")/.."
# Word list built in pieces so this file is not a hit when scanned elsewhere.
w1="au""dit"
w2="pro""fit"
w3="trad""ing"
w4="guaranteed?"
w5="on""ly"
w6="launch""ed"
w7="li""ve"
pattern="$w1|$w2|$w3|$w4|$w5|$w6|$w7"
hits=$(grep -rniwE "$pattern" README.md src tests sim scripts render.yaml .env.example \
  --exclude='banned-words.sh' \
  | grep -vi 'read-only' \
  | grep -viE '\[\.]live' || true)
if [ -n "$hits" ]; then
  echo "$hits"
  echo "banned words found"
  exit 1
fi
echo "banned words: none"
