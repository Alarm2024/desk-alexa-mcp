# Friction log — Iris for Alexa+ (MCP server)

What slowed us down while building a read-only Streamable HTTP MCP server for Alexa+. Each entry gives what happened, what we expected, and what we did. All of it comes from this repo's commits and tests.

| # | Area | What happened | What we expected | What we did |
|---|------|---------------|------------------|-------------|
| 1 | Testing without a host | We had no Alexa+ host to connect to during the build. | A test host or sandbox to call our `/mcp` and show what Alexa+ would say. | Tested with MCP Inspector (CLI, Streamable HTTP) and wrote `/sim`, a simulated page that sends the same JSON-RPC calls and reads the answer aloud with browser speech. |
| 2 | Accept header | Requests without both `application/json` and `text/event-stream` in Accept are refused with 406. A plain `curl -H 'Accept: application/json'` fails. | A clearer hint in the first examples we read. | Our 406 body names both types. The README shows the exact Inspector commands. |
| 3 | Response bodies | A tool result can come back as SSE frames (`event:` / `data:`) instead of one JSON body, and our test page broke on that. | One body format for a single request/response. | Taught `/sim` to parse SSE frames and prefer the spoken `summary` field (commit `bda264f`). |
| 4 | Two error channels | A tool failure is a normal result with `isError: true`. A protocol failure is a JSON-RPC error. Our page showed the first kind as an ordinary answer. | Hosts and test tools show both the same way. | Fixed `/sim` to show `isError` results as errors, and added a test (commit `9947fbc`). |
| 5 | GET and DELETE | Our server keeps no session and offers no GET stream, so GET and DELETE `/mcp` answer 405 with `Allow: POST`. | Spec examples for a stateless server. | Covered by a test. Documented in the README table. |
| 6 | Notifications | `notifications/initialized` has to get `202` with no body, not a JSON-RPC response. | — | Test added (commit `4ad975a`). |
| 7 | Protocol version | `MCP-Protocol-Version` may be absent (accepted, per spec) and must be rejected with 400 when unknown. | — | We check against the SDK's `SUPPORTED_PROTOCOL_VERSIONS` instead of pinning one string, so an SDK update carries new versions. |
| 8 | SDK packages | The server SDK we used comes as separate packages: `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, and `@modelcontextprotocol/client` for tests. Older examples import from one package. | Examples that match the current package layout. | Matched each import to the installed packages: `createMcpHandler` and `SUPPORTED_PROTOCOL_VERSIONS` from `server`, `toNodeHandler` from `node`. |
| 9 | Host and Origin checks | Rejecting unknown `Host`/`Origin` headers (DNS-rebinding protection) means a hosted copy needs its own hostname allowed, and that hostname is known after the first deploy. | — | `ALLOWED_HOSTS` env var. The README says to set it after the first deploy. |
| 10 | Cold starts | On a free hosting plan the service sleeps after about 15 minutes, and the first request can wait tens of seconds. We don't know how long an Alexa+ host waits for a tool. | A published timeout for tool calls from a voice host. | Documented as a plan limit. A paid or always-on host avoids it. |
| 11 | Writing for voice | Structured JSON is right for checks and wrong for speech. | Guidance on how much a voice host reads out of a tool result. | Added a one-sentence `summary` to every result (commit `f1a4526`) and kept tips short. |
| 12 | Safety of inputs | A user may read out or paste a full seed phrase. | — | Refused before any rule reads it. Never sent to the RPC, stored or logged. Covered by tests. |

## Asks for the Alexa+ team
1. A test host or sandbox where a self-hosted MCP server can be called and the spoken answer seen.
2. A stated timeout for tool calls, so cold starts can be planned around.
3. Guidance on which part of a tool result is spoken: `content` text, a summary field, or something else.
4. How `isError` results are presented to the user by voice.
