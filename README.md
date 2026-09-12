# Morning Light Desk MCP

**Amazon Developer Hackathon — Alexa+ track · Open Source mini-challenge**

Streamable HTTP MCP server (spec **2025-11-25+**) that Alexa+ agents and other MCP hosts can call to analyze dry **Exam/card** pulse text from a mock trading desk.

✝️🧿🪬

## What it does

| Tool | Description |
|------|-------------|
| `analyze_exam_card` | Dry exam/card text → structured **Test result · Signal · Problem · Needs · Alarms · Recommend** |
| `health` | Server status, version, transport, and engine mode |

**Rules (honest desk):**

- English only
- No live trading recommendations
- No CLEAR+/go language in **Recommend** — HOLD / 👀 eyes only
- Offline rules engine works **without** any API key
- Optional Nebius Token Factory enrich when `NEBIUS_API_KEY` is set

3️⃣🧿5️⃣

## Repository

Self-contained hackathon project. Intended standalone repo: **`Alarm2024/desk-alexa-mcp`**.

Until that repo is published, clone from this monorepo folder:

```bash
git clone https://github.com/Alarm2024/desk-sentinel.git
cd desk-sentinel/desk-alexa-mcp
```

## Quick start

```bash
# from repo root (desk-alexa-mcp/ or desk-sentinel/desk-alexa-mcp/)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional — edit if using Nebius enrich
python -m desk_alexa_mcp
```

Server listens on `http://0.0.0.0:8000` (override with `HOST` / `PORT`).

## Endpoints

| URL | Purpose |
|-----|---------|
| `http://localhost:8000/` | Alexa+ **web simulation** page |
| `http://localhost:8000/sim` | Same web sim |
| `http://localhost:8000/mcp` | **Streamable HTTP MCP** (Alexa+ / MCP clients) |
| `http://localhost:8000/health` | Health JSON |
| `http://localhost:8000/api/analyze` | REST helper for the web sim |

## Sample curl

**Health:**

```bash
curl -s http://localhost:8000/health | jq
```

**Analyze (REST — easiest for judges):**

```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"exam_card": "KEEP dry\n👀 SAFE HOLD · math short of gate\nPhase: SAFE_HOLD · dry_run: true"}' | jq
```

**MCP initialize (Streamable HTTP):**

```bash
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"0.1.0"}}}'
```

**MCP tools/list:**

```bash
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Or run the bundled script (server must be running):

```bash
chmod +x scripts/demo.sh
./scripts/demo.sh
```

## Alexa+ web simulation

Open **http://localhost:8000/sim** in a browser. Pick a sample exam card, click **Analyze with Desk MCP**, and read the branded report — a fallback “simulated Alexa+ experience” for judges without Amazon API keys.

## Fixtures

Sample dry exam cards live in `fixtures/exam_cards/`:

- `safe_hold_dry.txt` — routine HOLD watch
- `short_market.txt` — SHORT regime warning
- `bridge_fault.txt` — operational fault
- `preflight_attention.txt` — pre-flight attention (still dry)

## Optional Nebius enrich

Copy `.env.example` → `.env` and set `NEBIUS_API_KEY` for NVIDIA Nemotron analysis via [Nebius Token Factory](https://nebius.com/services/token-factory). Without a key, the offline rules engine handles all analysis.

**Never commit secrets.** Only `.env.example` is tracked.

## Connect from MCP clients

Point any Streamable HTTP MCP client at:

```
http://localhost:8000/mcp
```

Example with the official Python SDK:

```python
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

async with streamable_http_client("http://localhost:8000/mcp") as (read, write, _):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool(
            "analyze_exam_card",
            {"exam_card": open("fixtures/exam_cards/safe_hold_dry.txt").read()},
        )
        print(result)
```

## License

MIT — see [LICENSE](LICENSE).
