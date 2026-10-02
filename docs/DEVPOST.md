# Iris for Alexa+ — Devpost text

Amazon Developer Hackathon, Alexa+ track. Deadline: Oct 23.
Repo: https://github.com/Alarm2024/iris-alexa (MIT)

---

## Project name
Iris for Alexa+

## Tagline
Ask Alexa+ whether a crypto message is a scam. Iris checks the words, the link or the Solana transaction. It's read-only and never touches your wallet.

## Inspiration
Iris began as a free page at iris-35.elghaly.dev. It's for the moment a message asks for your seed phrase, or something left your wallet and you don't know what you signed. That page runs in the browser and sends nothing to us.

The same question often comes up away from a screen: "Is this real? Should I click it?" A voice assistant is the natural place to ask. So we moved Iris's checks behind an MCP server that an Alexa+ host can call, and wrote every answer to be read aloud.

## What it does
Iris is a self-hosted, read-only MCP server with five tools:

- **check_scam:** you describe what happened or read out the message. Fixed rules cover nine patterns: seed-phrase request, fake support DM, fake airdrop, doubling giveaway, unlimited approval, authority change, an urgent "verify wallet" link, "validate or be deactivated", and a QR code to scan with the wallet. Iris answers with a verdict, the reason, and next steps.
- **check_link:** gives a verdict on a URL or domain without opening it: official, lookalike, punycode, lure words in the host, a reported host, or a short link it can't see through.
- **explain_transaction:** takes a public Solana signature and returns the programs, findings and balance changes in plain words. It makes one call to a public RPC.
- **safety_tip:** one short reminder on general safety, seed phrases, links, approvals, support or QR codes.
- **clean_up_steps:** a checklist you follow yourself on an iPhone, an Android phone or a wallet.

Each result carries a short `summary` written to be spoken.

What Iris refuses, in one fixed shape:
- a pasted 12- or 24-word seed phrase, refused before any rule reads it;
- price or buy/sell questions;
- requests to connect, sign in with, sign or approve anything with a wallet.

A clean result says "This is not a clearance."

## How we built it
- **Server:** TypeScript on Node 22, using the official MCP TypeScript SDK (`@modelcontextprotocol/server` and `@modelcontextprotocol/node`) over Streamable HTTP, spec 2025-11-25. Zod schemas for every tool input.
- **Decoder:** the transaction decoder is the same one the Iris web page uses (`sol-decode.js`).
- **`/mcp` endpoint, hardened:**
  - Host and Origin checks;
  - 405 for GET and DELETE;
  - 406 unless Accept lists both `application/json` and `text/event-stream`;
  - 400 for an unknown `MCP-Protocol-Version`;
  - 415 for a non-JSON body, 413 over 64 KB;
  - 202 for `notifications/initialized`;
  - every error body is fixed text.
- **Privacy:** the server stores nothing and doesn't log tool arguments.
- **Testing:** we had no Alexa+ host to test on. We tested with MCP Inspector in CLI mode, plus a simulated assistant page at `/sim`. That page sends the same JSON-RPC calls a host sends, shows the text an assistant would say, and can speak it through the browser's speech API.
- **Tests:** 240, all passing. They cover real and synthetic scam lines, normal lines, refusals, bypass attempts, reported and official domains, and every row of the `/mcp` table.

## Challenges we ran into
- **Two kinds of error.** A tool can fail (`isError: true` inside a normal result), or the request can fail (a JSON-RPC error). Our own test page first showed a tool error as an ordinary answer. We fixed the page and added a test, so a host-style client shows both kinds as errors.
- **Answers arrive as an event stream.** Streamable HTTP can send a tool result as `event:`/`data:` frames instead of one JSON body. Our test page had to parse both.
- **Strict headers.** A request whose Accept header lacks either `application/json` or `text/event-stream` is refused, so a quick `curl` test needs both. We made the 406 text say exactly that.
- **Writing for the ear.** JSON is easy to check and hard to listen to. We added a one-sentence `summary` to every result, and made the safety tips short enough to say in one breath.
- **The same words can be a scam or a warning.** "Never share your seed phrase" is advice. The same line followed by "reply with your 24 words here" is a scam. The rules run on the whole text, and the seed-phrase refusal runs first.

## Accomplishments that we're proud of
- Nothing in the code can sign, send, connect or approve, because there is no code path for it.
- A pasted seed phrase is refused before any rule reads it. It is never sent to the RPC, never stored and never logged.
- Every error body is fixed text, so nothing a caller sends is echoed back.
- 240 tests pass, and a banned-word check runs on the README, source, tests and sim page.

## What we learned
- Streamable HTTP is small but exact: the Accept header, the status codes, `202` for notifications, and the protocol-version header all matter. A host and a server that disagree fail quietly.
- For a voice host, the spoken sentence matters as much as the data behind it.
- A clean result has to say plainly that it isn't a clearance. Silence would be read as "safe".

## What's next for Iris
- Connect to a real Alexa+ host and test by voice.
- Rules in more languages. Today other languages get `no_known_pattern`, which is not a clearance.
- A wider reported-host list and more patterns from real messages people send us.

## Built with
TypeScript, Node.js, Model Context Protocol (Streamable HTTP), Zod, tsx, Solana JSON-RPC, Render (optional self-hosting)

## Try it
```bash
git clone https://github.com/Alarm2024/iris-alexa.git
cd iris-alexa && npm install && npm start
# MCP:       http://127.0.0.1:3000/mcp
# Test page: http://127.0.0.1:3000/sim
```

## Note for judges
Tested with MCP Inspector and a simulated page, not on a real Alexa+ device. The simulated page has no Amazon or Alexa logos or sounds. Iris gives no financial, legal or medical advice, stores no personal data and takes no payments.
