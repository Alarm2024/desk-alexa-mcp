import assert from "node:assert/strict";
import { request, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import {
  acceptsMcp,
  hostnameOf,
  isHostAllowed,
  isOriginAllowed,
  MAX_BODY_BYTES,
  originHostnameOf,
  protocolVersionOk,
  startServer,
} from "../src/http.js";

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** A header set to `null` is left out of the request. `chunked` streams the body without Content-Length. */
function send(
  port: number,
  options: {
    method?: string;
    path?: string;
    headers?: Record<string, string | null>;
    body?: string;
    chunked?: boolean;
  } = {},
): Promise<Reply> {
  const body = options.body ?? "";
  const headers: Record<string, string | null> = {
    host: "127.0.0.1",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-11-25",
    ...(body.length > 0 && !options.chunked ? { "content-length": String(Buffer.byteLength(body)) } : {}),
    ...(options.chunked ? { "transfer-encoding": "chunked" } : {}),
    ...options.headers,
  };
  const sent: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== null) sent[key] = value;
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const req = request(
      { host: "127.0.0.1", port, method: options.method ?? "POST", path: options.path ?? "/mcp", headers: sent },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          settled = true;
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: text });
        });
      },
    );
    req.on("error", (error) => {
      if (!settled) reject(error);
    });
    if (options.chunked) {
      for (let offset = 0; offset < body.length; offset += 16 * 1024) {
        req.write(body.slice(offset, offset + 16 * 1024));
      }
      req.end();
    } else {
      req.end(body);
    }
  });
}

const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "http-test", version: "0.0.0" } },
});

const INITIALIZED = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });

const TOOLS_LIST = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });

function toolCall(id: number, name: string, args: Record<string, unknown>): string {
  return JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
}

describe("header helpers", () => {
  it("strips the port from Host and keeps IPv6 brackets", () => {
    assert.equal(hostnameOf("localhost:3000"), "localhost");
    assert.equal(hostnameOf("[::1]:3000"), "[::1]");
    assert.equal(hostnameOf(""), null);
  });

  it("reads the hostname out of an Origin", () => {
    assert.equal(originHostnameOf("http://localhost:5173"), "localhost");
    assert.equal(originHostnameOf("chrome-extension://abc"), null);
    assert.equal(originHostnameOf("not a url"), null);
  });

  it("allows localhost by default and honors extra hosts", () => {
    const allowed = ["localhost", "127.0.0.1", "[::1]", "iris.example.com"];
    assert.equal(isHostAllowed("localhost:3000", allowed), true);
    assert.equal(isHostAllowed("iris.example.com", allowed), true);
    assert.equal(isHostAllowed("evil.example.com", allowed), false);
    assert.equal(isOriginAllowed(undefined, allowed), true);
    assert.equal(isOriginAllowed("http://localhost:5173", allowed), true);
    assert.equal(isOriginAllowed("https://iris.example.com", allowed), true);
    assert.equal(isOriginAllowed("https://evil.example.com", allowed), false);
    assert.equal(isOriginAllowed("null", allowed), false);
  });

  it("requires both media types in Accept", () => {
    assert.equal(acceptsMcp("application/json, text/event-stream"), true);
    assert.equal(acceptsMcp("*/*"), true);
    assert.equal(acceptsMcp("application/json"), false);
    assert.equal(acceptsMcp(undefined), false);
  });

  it("accepts a missing or supported MCP-Protocol-Version and rejects an unknown one", () => {
    assert.equal(protocolVersionOk(undefined), true);
    assert.equal(protocolVersionOk("2025-11-25"), true);
    assert.equal(protocolVersionOk("2025-06-18"), true);
    assert.equal(protocolVersionOk("1999-01-01"), false);
  });
});

describe("/mcp hardening", () => {
  let server: Server;
  let port = 0;

  before(async () => {
    server = await startServer({
      host: "127.0.0.1",
      port: 0,
      env: { ALLOWED_HOSTS: "iris.example.com" },
    });
    const address = server.address();
    port = typeof address === "object" && address ? address.port : 0;
  });

  after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("answers initialize with 200 and the protocol version", async () => {
    const reply = await send(port, { body: INITIALIZE });
    assert.equal(reply.status, 200, reply.body);
    assert.match(reply.body, /"protocolVersion":"2025-11-25"/);
  });

  it("answers notifications/initialized with 202 and no body", async () => {
    const reply = await send(port, { body: INITIALIZED });
    assert.equal(reply.status, 202, reply.body);
    assert.equal(reply.body, "");
  });

  it("answers GET /mcp with 405 and Allow: POST", async () => {
    const reply = await send(port, { method: "GET" });
    assert.equal(reply.status, 405);
    assert.equal(reply.headers.allow, "POST");
  });

  it("answers DELETE /mcp with 405", async () => {
    const reply = await send(port, { method: "DELETE" });
    assert.equal(reply.status, 405);
  });

  it("rejects an Accept header without text/event-stream with 406", async () => {
    const reply = await send(port, { body: INITIALIZE, headers: { accept: "application/json" } });
    assert.equal(reply.status, 406);
    assert.match(reply.body, /text\/event-stream/);
  });

  it("rejects an unknown MCP-Protocol-Version with 400 and does not echo it", async () => {
    const reply = await send(port, { body: TOOLS_LIST, headers: { "mcp-protocol-version": "1999-01-01" } });
    assert.equal(reply.status, 400);
    assert.equal(reply.body.includes("1999-01-01"), false);
    assert.match(reply.body, /Unsupported MCP-Protocol-Version/);
  });

  it("accepts a request with no MCP-Protocol-Version header", async () => {
    const reply = await send(port, { body: TOOLS_LIST, headers: { "mcp-protocol-version": null } });
    assert.equal(reply.status, 200, reply.body);
  });

  it("rejects a non-JSON content type with 415", async () => {
    const reply = await send(port, { body: INITIALIZE, headers: { "content-type": "text/plain" } });
    assert.equal(reply.status, 415);
  });

  it("rejects a bad Origin with 403 and fixed text", async () => {
    const reply = await send(port, { body: INITIALIZE, headers: { origin: "https://evil.example.com" } });
    assert.equal(reply.status, 403);
    assert.equal(reply.body.includes("evil.example.com"), false);
    assert.match(reply.body, /Forbidden\./);
  });

  it("allows a localhost Origin by default", async () => {
    const reply = await send(port, { body: INITIALIZE, headers: { origin: "http://localhost:5173" } });
    assert.equal(reply.status, 200, reply.body);
  });

  it("allows an Origin from ALLOWED_HOSTS", async () => {
    const reply = await send(port, { body: INITIALIZE, headers: { origin: "https://iris.example.com" } });
    assert.equal(reply.status, 200, reply.body);
  });

  it("rejects a bad Host with 403 and does not echo it", async () => {
    const reply = await send(port, { body: INITIALIZE, headers: { host: "attacker.example.net" } });
    assert.equal(reply.status, 403);
    assert.equal(reply.body.includes("attacker.example.net"), false);
  });

  it("rejects a declared Content-Length over 64 KB with 413 before reading", async () => {
    const reply = await send(port, {
      body: INITIALIZE,
      headers: { "content-length": String(MAX_BODY_BYTES + 1) },
    });
    assert.equal(reply.status, 413);
    assert.match(reply.body, /64 KB/);
  });

  it("rejects a chunked body over 64 KB with 413 while it streams", async () => {
    const big = toolCall(3, "check_scam", { situation: "a".repeat(MAX_BODY_BYTES + 512) });
    const reply = await send(port, { body: big, chunked: true });
    assert.equal(reply.status, 413);
    assert.match(reply.body, /Payload too large/);
  });

  it("accepts a body just under the cap", async () => {
    const payload = toolCall(4, "check_scam", { situation: "b".repeat(7000) });
    assert.ok(Buffer.byteLength(payload) < MAX_BODY_BYTES);
    const reply = await send(port, { body: payload });
    assert.equal(reply.status, 200, reply.body);
    assert.match(reply.body, /no_known_pattern/);
  });

  it("answers invalid JSON with 400 and fixed text, without echoing the body", async () => {
    const reply = await send(port, { body: "{not json xyzzy-marker" });
    assert.equal(reply.status, 400);
    assert.equal(reply.body.includes("xyzzy-marker"), false);
    assert.match(reply.body, /Parse error\. The request body is not valid JSON\./);
  });

  it("answers an unknown method with a JSON-RPC error and no stack trace", async () => {
    const reply = await send(port, { body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "nope/nothing" }) });
    assert.equal(reply.status, 200, reply.body);
    assert.match(reply.body, /"error"/);
    assert.equal(/\bat\s+\S+\s+\(/.test(reply.body), false, "no stack frames");
    assert.equal(reply.body.includes("node_modules"), false);
  });

  it("answers a tool call with the refusal shape", async () => {
    const reply = await send(port, { body: toolCall(5, "check_link", { url: "connect my wallet to https://jup.ag" }) });
    assert.equal(reply.status, 200, reply.body);
    assert.match(reply.body, /wallet_connect/);
    assert.match(reply.body, /\\"refused\\":true/);
  });

  it("lists check_link and safety_tip", async () => {
    const reply = await send(port, { body: TOOLS_LIST });
    assert.equal(reply.status, 200, reply.body);
    for (const name of ["explain_transaction", "check_scam", "check_link", "safety_tip", "clean_up_steps"]) {
      assert.match(reply.body, new RegExp(`"name":"${name}"`));
    }
  });

  it("answers 404 off-path with fixed text", async () => {
    const reply = await send(port, { path: "/somewhere", method: "GET" });
    assert.equal(reply.status, 404);
    assert.match(reply.body, /Not found\./);
  });

  it("serves the simulated page same-origin at /sim", async () => {
    const reply = await send(port, { path: "/sim", method: "GET" });
    assert.equal(reply.status, 200);
    assert.match(String(reply.headers["content-type"]), /text\/html/);
    assert.match(reply.body, /Simulated Alexa\+ page — not a real Alexa device/);
    assert.match(reply.body, /iris-alexa/);
    assert.match(reply.body, /fetch\("\/mcp"/);
  });

  it("keeps /health free of user data", async () => {
    const reply = await send(port, { path: "/health", method: "GET" });
    assert.equal(reply.status, 200);
    assert.match(reply.body, /"mcp_spec":"2025-11-25"/);
    assert.match(reply.body, /"read_only":true/);
  });
});
