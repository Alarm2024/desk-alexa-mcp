#!/usr/bin/env bash
# Fresh-clone smoke: install, test, typecheck, MCP Inspector list + one call per tool.
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=1
fail() {
  echo "FAIL: $*"
  PASS=0
}

echo "==> npm ci"
npm ci

echo "==> npm test"
npm test

echo "==> npm run typecheck"
npm run typecheck

PORT="${SMOKE_PORT:-$((30000 + RANDOM % 20000))}"
HOST=127.0.0.1
export HOST PORT
export SOLANA_RPC_URL="${SOLANA_RPC_URL:-https://api.mainnet-beta.solana.com}"

echo "==> start server on ${HOST}:${PORT}"
npx tsx src/index.ts >/tmp/iris-alexa-smoke.out 2>/tmp/iris-alexa-smoke.err &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

deadline=$((SECONDS + 20))
until grep -q "listening" /tmp/iris-alexa-smoke.err 2>/dev/null; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    fail "server exited before listen"
    cat /tmp/iris-alexa-smoke.err || true
    break
  fi
  if (( SECONDS >= deadline )); then
    fail "server did not listen in time"
    cat /tmp/iris-alexa-smoke.err || true
    break
  fi
  sleep 0.1
done

MCP="http://${HOST}:${PORT}/mcp"
INSPECTOR=(npx mcp-inspector --cli "$MCP" --transport http)

if (( PASS == 1 )); then
  echo "==> tools/list"
  if ! "${INSPECTOR[@]}" --method tools/list | tee /tmp/iris-alexa-smoke-list.out | grep -q check_scam; then
    fail "tools/list missing check_scam"
  fi
  for name in explain_transaction check_scam check_link safety_tip clean_up_steps; do
    if ! grep -q "$name" /tmp/iris-alexa-smoke-list.out; then
      fail "tools/list missing $name"
    fi
  done

  echo "==> tools/call per tool"
  "${INSPECTOR[@]}" --method tools/call --tool-name check_scam \
    --tool-arg 'situation=Never share your seed phrase with strangers. Our support agent is verified: reply with your 24 word phrase here to restore access.' \
    | grep -q scam || fail "check_scam call"

  "${INSPECTOR[@]}" --method tools/call --tool-name check_link \
    --tool-arg url=phanton.app \
    | grep -q reported_host || fail "check_link call"

  "${INSPECTOR[@]}" --method tools/call --tool-name safety_tip \
    --tool-arg topic=general \
    | grep -q tip || fail "safety_tip call"

  "${INSPECTOR[@]}" --method tools/call --tool-name clean_up_steps \
    --tool-arg target=wallet \
    | grep -q steps || fail "clean_up_steps call"

  "${INSPECTOR[@]}" --method tools/call --tool-name explain_transaction \
    --tool-arg signature=not-a-signature \
    | grep -q 'Need a public Solana transaction signature' || fail "explain_transaction call"

  if curl -fsS "http://${HOST}:${PORT}/sim" | grep -q 'iris-alexa'; then
    :
  else
    fail "/sim page"
  fi
fi

cleanup
trap - EXIT

if (( PASS == 1 )); then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
