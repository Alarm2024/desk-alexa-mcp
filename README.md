# iris-alexa

**Amazon Developer Hackathon — Alexa+ track**

Self-hosted, read-only [Model Context Protocol](https://modelcontextprotocol.io) server for Alexa+ and other MCP hosts. It speaks **Streamable HTTP** with the official TypeScript SDK (`@modelcontextprotocol/server` and `@modelcontextprotocol/node`) on MCP spec **2025-11-25** or later.

```bash
git clone https://github.com/Alarm2024/iris-alexa.git
cd iris-alexa
```

The server stores nothing. It does not log tool arguments. It holds no private key and has no code path that signs, sends, connects, or approves anything.

✝️🧿🪬

## What it does

| Tool | Input | Result |
| --- | --- | --- |
| `explain_transaction` | Public Solana `signature` | Programs, findings, and balance lines from `sol-decode.js` (copied from our page [Alarm2024/iris-35](https://github.com/Alarm2024/iris-35)). One `getTransaction` call to the public RPC. |
| `check_scam` | A `situation`: what the person said, or the message they received | Fixed rules for nine patterns: seed-phrase request, fake support DM, fake airdrop, doubling giveaway, unlimited approval, authority change (SetAuthority, System Assign), urgent "verify wallet" link, validate/sync-or-be-deactivated, QR code to scan with the wallet. Returns `verdict`, `reason`, `why`, and `next_steps`. |
| `check_link` | A `url` or domain | Official domain, lookalike domain, punycode host, lure words in the host, or a short link it cannot see through. Never opens the link. |
| `safety_tip` | Optional `topic` | One short reminder written to be spoken aloud. Topics: `general`, `seed_phrase`, `links`, `approvals`, `support`, `qr_codes`. |
| `clean_up_steps` | `target`: `iphone`, `android`, or `wallet` | A checklist you do yourself on that device. |

`check_link` and `safety_tip` were ported from [Alarm2024/iris-alexa-guard](https://github.com/Alarm2024/iris-alexa-guard).

AI-assisted analysis of public pages.

### Order of checks

1. A pasted 12- or 24-word seed phrase is refused before any rule reads it.
2. The scam rules run on the whole text. A forwarded message that says "approve this transaction to claim your airdrop" or "invest in our staking pool and double your SOL" is a **scam**, because those words belong to the sender, not to the person asking Iris.
3. Refusals cover what the person asks Iris to do: price or buy/sell advice, connect or sign in with a wallet, sign or approve.
4. Otherwise the verdict is `no_known_pattern` with the text **"This is not a clearance."**

"Never share your seed phrase" by itself is advice and is not flagged. The same sentence followed by "reply with your 24 word phrase here" is a scam, because the request is still there.

### Link rules

- Normalize the host with the WHATWG URL parser (add `https://` when needed, IDNA to `xn--`, lowercase, drop a trailing dot, drop the port). Judgement uses `URL.hostname` alone, so `https://phantom.com@evil.example/` is `evil.example`.
- Official: `phantom.com`, `solflare.com`, `backpack.app`, `jup.ag`, `raydium.io`, `orca.so`, `kamino.com`, `jito.network`, `marinade.finance`, `drift.trade`, `sanctum.so`, `tensor.trade`, `magiceden.us`, `pump.fun`, `save.finance`, plus Ledger / Tangem / Trezor / MetaMask / `phantom.app` / `solana.com` and their subdomains. Shared hosting (`pages.dev`, `vercel.app`, …) is never official as a whole.
- A host on the reported list (exact match) returns `scam` / `reported_host`. That is a past report, not a clearance.
- Misspelled brand labels, brand name plus a lure word, or any `xn--` host → `scam`. Brand alone or lure alone → `unclear` ("don't connect a wallet; open the official app yourself"). Short links → `unclear`.
- A domain check cannot catch every phishing host.

## What it refuses

Every refusal has the same shape: `{ "refused": true, "reason": ..., "warning": ..., "summary": ... }`, from every tool.

| `reason` | Trigger |
| --- | --- |
| `seed_phrase` | A 12- or 24-word run from the public BIP-39 English wordlist. Not sent to the RPC, not stored, not logged. |
| `price_advice` | Should I buy or sell, do you recommend, what is it worth, is it going to go up, worth next week, price target. |
| `wallet_connect` | Connect my wallet, connect my Phantom to Jupiter, sign in with my wallet, sign this transaction, approve this transaction. |

A description of a scam ("they asked for my seed", "urgent link to verify your wallet") is checked by `check_scam`. Pasting the words themselves is refused.

## Limits

- Read-only. No wallet connection, no sign-in, no signing, no device changes.
- Solana signatures. The decoder is the Iris 35 Solana decoder.
- The RPC default is the public endpoint `https://api.mainnet-beta.solana.com`. Set `SOLANA_RPC_URL` to another public endpoint if you need to. Never commit a key or a private URL.
- The rules read English. Other languages get `no_known_pattern`, which is not a clearance.
- `check_scam` and `check_link` are fixed string rules. A clean result is not a clearance.
- A domain check cannot catch every phishing host. The reported list is a past report, not a clearance.
- A class of QUIET / OPEN PATHS / ACT NOW describes the decoded instructions. It is not a clearance to sign.
- Clean-up steps are instructions for you. The server cannot tap the phone or open the wallet.
- Nothing is written to disk about a request. Process memory holds a request while that request is handled.

### Known misses

- **Dapptoolkit how-to** (SEAL PSA): from the text alone it reads like ordinary how-to help, so there is no rule that flags ordinary how-to messages.
- **Domain check**: a domain check can't catch every phishing host. Pattern rules still miss `signature[.]land`, `phanstart[.]live`, `sol[.]dot-io[.]cc`, `token-skr[.]org`, `skr[.]solplanet[.]cc`.

## Run

Needs **Node 22** (or Node `>=20.12`). From a fresh clone:

```bash
git clone https://github.com/Alarm2024/iris-alexa.git
cd iris-alexa
npm install
cp .env.example .env   # optional
npm start
```

Listens on `0.0.0.0:$PORT` (default port `3000`). `.env` is read with `process.loadEnvFile()`.

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:3000/mcp` | Streamable HTTP MCP |
| `http://127.0.0.1:3000/health` | Status. No user data. |
| `http://127.0.0.1:3000/sim` | Simulated assistant page (`sim/alexa-page.html`) |

### What `/mcp` enforces

| Request | Answer |
| --- | --- |
| `Host` not `localhost`, `127.0.0.1`, `[::1]`, or a name in `ALLOWED_HOSTS` | `403` |
| `Origin` present and not one of those hostnames | `403`. No `Origin` passes, so non-browser clients connect. |
| `GET` or `DELETE /mcp` | `405` with `Allow: POST` |
| `Accept` without both `application/json` and `text/event-stream` | `406` |
| `MCP-Protocol-Version` set to an unknown version | `400`. Absent is accepted, per spec. |
| `Content-Type` not `application/json` | `415` |
| Body over 64 KB, declared or streamed | `413` |
| Body that is not JSON | `400` |
| `notifications/initialized` | `202`, no body |

Every error body is fixed text. Nothing from the request, and no exception message, is echoed back.

### Self-hosting on Render

`render.yaml` describes one web service on Node 22 (`npm ci`, `npm start`, health check on `/health`). `tsx` is a runtime dependency, so no build step is needed. After the first deploy, set `ALLOWED_HOSTS` to the hostname Render gave the service so the Host and Origin checks accept it.

On the free plan the service sleeps after about 15 minutes without traffic. The first request after that waits while it wakes, which can be tens of seconds. That is a plan limit, not a fault in the server. Nothing in this repo deploys by itself.

## Tested with

One hackathon entry. MIT license. Tested with **MCP Inspector** and a **simulated** page at `/sim` — not real Alexa+. No Amazon or Alexa logos or sounds in `/sim` or this README.

- **MCP Inspector**, CLI mode, over Streamable HTTP: `tools/list` and a `tools/call` on each tool, including each refusal. This runs in `npm test` and in `scripts/smoke.sh`.
- **A simulated page** at `http://127.0.0.1:3000/sim` (source in `sim/alexa-page.html`). It posts the same JSON-RPC calls an MCP host sends to `/mcp`, shows the text an assistant would read out, and can speak it with the browser speech API. It is served same-origin. It is a stand-in for an MCP host; this repo makes no claim about Amazon registration format, and includes none.

```bash
npx mcp-inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/list
```

```bash
npx mcp-inspector --cli http://127.0.0.1:3000/mcp --transport http \
  --method tools/call --tool-name check_link --tool-arg url=phantom.com.attacker.example
```

## Tests

```bash
npm test
npm run typecheck
npm run check:words
bash scripts/smoke.sh
```

Fixtures in `tests/fixtures.ts`: real scam lines, synthetic scam lines, normal lines, refusals, bypass lines, reported hosts, and official domains. One test per line. Saved `getTransaction` JSON under `tests/fixtures/rpc/` drives offline summary checks. The HTTP suite covers each row of the `/mcp` table above. `check:words` fails when a word from the project's banned list appears in `README.md`, `src`, `tests`, `sim`, `scripts`, `render.yaml`, or `.env.example`.

## License

MIT — see [LICENSE](LICENSE).
