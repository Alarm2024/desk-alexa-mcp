# Iris for Alexa+

**Amazon Developer Hackathon — Alexa+ track**

Self-hosted, read-only [Model Context Protocol](https://modelcontextprotocol.io) server for Alexa+ and other MCP hosts. It speaks **Streamable HTTP** with the official TypeScript SDK (`@modelcontextprotocol/server` and `@modelcontextprotocol/node`) on MCP spec **2025-11-25** or later.

The server stores nothing. It does not log tool arguments.

✝️🧿🪬

## What it does

| Tool | Input | Result |
| --- | --- | --- |
| `explain_transaction` | Public Solana `signature` | Programs, findings, and balance lines from `sol-decode.js` (copied from our page [Alarm2024/iris-35](https://github.com/Alarm2024/iris-35)). One `getTransaction` call to the public RPC. |
| `check_scam` | A short `situation` | Fixed rules for six patterns: seed-phrase request, fake support DM, fake airdrop, unlimited approval, authority change, urgent "verify wallet" link. Returns `verdict`, `why`, and `next_steps`. |
| `clean_up_steps` | `target`: `iphone`, `android`, or `wallet` | A checklist you do yourself on that device. |

`desk-alexa-mcp` already ran a working Streamable HTTP MCP server, so this branch builds Iris on that repo.

AI-assisted analysis of public pages.

## What it refuses

- **Seed phrase.** A 12- or 24-word run from the public BIP-39 English wordlist is refused, with a warning. It is not sent to the RPC, not stored, and not logged.
- **Price or trading advice.** Questions about whether to buy, sell, or what a price is are refused.
- **Wallet connect.** This server cannot connect a wallet, sign, or approve. A request to do that is refused.

A description of a scam ("they asked for my seed", "urgent link to verify your wallet") is checked by `check_scam`. Pasting the words themselves is refused.

## Limits

- read-only. No wallet connection, no signing, no device changes.
- Solana signatures. The decoder is the Iris 35 Solana decoder.
- The RPC default is the public endpoint `https://api.mainnet-beta.solana.com`. Set `SOLANA_RPC_URL` to another public endpoint if you need to. Never commit a key or a private URL.
- `check_scam` is six fixed string rules. A `no_pattern` verdict is not a clearance.
- A class of QUIET / OPEN PATHS / ACT NOW describes the decoded instructions. It is not a clearance to sign.
- Clean-up steps are instructions for you. The server cannot tap the phone or open the wallet.
- Nothing is written to disk about a request. Process memory holds a request while that request is handled.

## Run

```bash
npm install
cp .env.example .env   # optional
npm start
```

Listens on `0.0.0.0:$PORT` (default port `3000`).

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:3000/mcp` | Streamable HTTP MCP |
| `http://127.0.0.1:3000/health` | Status. No user data. |

Host header must be `localhost`, `127.0.0.1`, `[::1]`, or a name in `ALLOWED_HOSTS`. Requests with no `Origin` are allowed so non-browser clients can connect. A browser `Origin` must use one of those hostnames.

## MCP Inspector

```bash
npx mcp-inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/list
```

```bash
npx mcp-inspector --cli http://127.0.0.1:3000/mcp --transport http \
  --method tools/call --tool-name clean_up_steps --tool-arg target=iphone
```

## Tests

```bash
npm test
```

Covers each tool, each refusal, and an MCP Inspector connection over Streamable HTTP.

## License

MIT — see [LICENSE](LICENSE).
