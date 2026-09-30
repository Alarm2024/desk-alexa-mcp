#!/bin/sh
# Fails when a banned word appears in README.md, src, tests, or .env.example.
# "read-only" is the one allowed use of the second word in the list.
set -u
cd "$(dirname "$0")/.."
hits=$(grep -rniwE 'audit|profit|trading|guaranteed?|only|launched|live' README.md src tests .env.example | grep -vi 'read-only')
if [ -n "$hits" ]; then
  echo "$hits"
  echo "banned words found"
  exit 1
fi
echo "banned words: none"
