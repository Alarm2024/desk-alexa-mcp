#!/usr/bin/env bash
# Morning Light Desk MCP — local demo curls (Streamable HTTP MCP)
set -euo pipefail

BASE="${1:-http://127.0.0.1:8000}"
MCP="${BASE}/mcp"

echo "=== health (REST) ==="
curl -sS "${BASE}/health" | python3 -m json.tool

echo ""
echo "=== analyze_exam_card (REST helper) ==="
curl -sS -X POST "${BASE}/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"exam_card": "/desk · pulse #1\nKEEP dry\n👀 SAFE HOLD · math short of gate\nPhase: SAFE_HOLD · dry_run: true"}' \
  | python3 -m json.tool

echo ""
echo "=== MCP initialize (Streamable HTTP) ==="
curl -sS -L -X POST "${MCP}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"0.1.0"}}}' \
  | head -c 2000

echo ""
echo ""
echo "=== MCP tools/list ==="
curl -sS -L -X POST "${MCP}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | head -c 2000

echo ""
echo ""
echo "Open web sim: ${BASE}/sim"
