import { createMcpHandler, SUPPORTED_PROTOCOL_VERSIONS } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createIrisServer } from "./mcp.js";

export const MCP_PATH = "/mcp";
/** The simulated Alexa+ page, served same-origin so a browser can post to /mcp without CORS. */
export const SIM_PATH = "/sim";
const SIM_PAGE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../sim/alexa-page.html"), "utf8");
export const MCP_SPEC = "2025-11-25";
/** Hard cap on a request body. Tool inputs are short strings; anything bigger is refused. */
export const MAX_BODY_BYTES = 64 * 1024;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/** Fixed client-facing messages. Nothing from the request or from an exception is echoed. */
const CLIENT_TEXT = {
  forbidden: "Forbidden.",
  methodNotAllowed: "Method not allowed. Use POST.",
  notAcceptable: "Not acceptable. Accept must include application/json and text/event-stream.",
  badProtocolVersion: "Unsupported MCP-Protocol-Version.",
  unsupportedMediaType: "Unsupported media type. Send application/json.",
  tooLarge: "Payload too large. The request body must be 64 KB or smaller.",
  parseError: "Parse error. The request body is not valid JSON.",
  internal: "Internal server error.",
  notFound: "Not found.",
} as const;

export function allowedHostnames(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = (env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return [...LOCAL_HOSTS, ...extra];
}

/** Hostname of a Host header value, port removed, IPv6 kept in brackets. */
export function hostnameOf(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end === -1 ? null : trimmed.slice(0, end + 1);
  }
  const host = trimmed.split(":")[0];
  return host || null;
}

/** Hostname of an Origin header value. `null` when the header cannot be parsed. */
export function originHostnameOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isHostAllowed(hostHeader: string | undefined, allowed: string[]): boolean {
  const host = hostnameOf(hostHeader);
  return host !== null && allowed.includes(host);
}

/** No Origin passes (non-browser clients). A present Origin must name an allowed host. */
export function isOriginAllowed(originHeader: string | undefined, allowed: string[]): boolean {
  if (originHeader === undefined) return true;
  if (originHeader.trim().toLowerCase() === "null") return false;
  const host = originHostnameOf(originHeader);
  if (host === null) return false;
  const bracketed = host.includes(":") ? `[${host}]` : host;
  return allowed.includes(host) || allowed.includes(bracketed);
}

export function acceptsMcp(accept: string | undefined): boolean {
  if (!accept) return false;
  const types = accept
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  const wildcard = types.includes("*/*");
  const json = wildcard || types.includes("application/json") || types.includes("application/*");
  const sse = wildcard || types.includes("text/event-stream") || types.includes("text/*");
  return json && sse;
}

/** Absent is allowed (the spec says assume an older version). Present must be a known version. */
export function protocolVersionOk(header: string | string[] | undefined): boolean {
  if (header === undefined) return true;
  const value = Array.isArray(header) ? header[0] : header;
  return SUPPORTED_PROTOCOL_VERSIONS.includes(value.trim());
}

function isJsonContentType(value: string | undefined): boolean {
  if (!value) return false;
  return value.split(";")[0].trim().toLowerCase() === "application/json";
}

function sendError(res: ServerResponse, status: number, message: string, headers: Record<string, string> = {}): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

class BodyTooLarge extends Error {}

/** Reads the body up to `limit` bytes. Stops buffering and throws as soon as the cap is passed. */
function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.off("data", onData);
        req.pause();
        reject(new BodyTooLarge());
        return;
      }
      chunks.push(chunk);
    };
    req.on("data", onData);
    req.once("end", () => resolve(Buffer.concat(chunks)));
    req.once("error", reject);
  });
}

/**
 * After a 413 the rest of the body is discarded, not buffered, so the client can read the
 * answer before the socket closes. A sender that keeps going past a further MiB is cut off.
 */
function drain(req: IncomingMessage, extra = 1024 * 1024): void {
  let seen = 0;
  req.on("data", (chunk: Buffer) => {
    seen += chunk.length;
    if (seen > extra) req.destroy();
  });
  req.on("error", () => {});
  req.resume();
}

export function createHandler() {
  return createMcpHandler(() => createIrisServer(), {
    responseMode: "json",
    maxRequestBodySize: MAX_BODY_BYTES,
    onerror: (error: Error) => {
      console.error(`mcp error name=${error.name}`);
    },
  });
}

export interface McpRequestGuard {
  (req: IncomingMessage, res: ServerResponse): Promise<void>;
}

/** The /mcp entry: every check answers with fixed text, then the SDK handler gets a pre-read body. */
export function createMcpRequestHandler(allowed: string[]): McpRequestGuard {
  const nodeHandler = toNodeHandler(createHandler(), {
    maxRequestBodySize: MAX_BODY_BYTES,
    onerror: (error: Error) => {
      console.error(`mcp adapter error name=${error.name}`);
    },
  });

  return async (req, res) => {
    if (!isHostAllowed(req.headers.host, allowed) || !isOriginAllowed(req.headers.origin, allowed)) {
      sendError(res, 403, CLIENT_TEXT.forbidden);
      return;
    }
    if (req.method !== "POST") {
      sendError(res, 405, CLIENT_TEXT.methodNotAllowed, { allow: "POST" });
      return;
    }
    if (!acceptsMcp(req.headers.accept)) {
      sendError(res, 406, CLIENT_TEXT.notAcceptable);
      return;
    }
    if (!protocolVersionOk(req.headers["mcp-protocol-version"])) {
      sendError(res, 400, CLIENT_TEXT.badProtocolVersion);
      return;
    }
    if (!isJsonContentType(req.headers["content-type"])) {
      sendError(res, 415, CLIENT_TEXT.unsupportedMediaType);
      return;
    }
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      sendError(res, 413, CLIENT_TEXT.tooLarge, { connection: "close" });
      drain(req);
      return;
    }

    let body: Buffer;
    try {
      body = await readBody(req, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLarge) {
        sendError(res, 413, CLIENT_TEXT.tooLarge, { connection: "close" });
        drain(req);
      } else {
        sendError(res, 400, CLIENT_TEXT.parseError);
      }
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString("utf8"));
    } catch {
      sendError(res, 400, CLIENT_TEXT.parseError);
      return;
    }

    try {
      await nodeHandler(req, res, parsed);
    } catch (error) {
      console.error(`mcp handler error name=${error instanceof Error ? error.name : "Error"}`);
      sendError(res, 500, CLIENT_TEXT.internal);
    }
  };
}

export function startServer(options: { host?: string; port?: number; env?: NodeJS.ProcessEnv } = {}): Promise<Server> {
  const env = options.env ?? process.env;
  const host = options.host ?? env.HOST ?? "0.0.0.0";
  const port = options.port ?? Number(env.PORT ?? 3000);
  const handleMcp = createMcpRequestHandler(allowedHostnames(env));

  const server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (req.method === "GET" && path === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "iris-alexa",
          transport: "streamable-http",
          mcp_spec: MCP_SPEC,
          read_only: true,
        }),
      );
      return;
    }
    if (req.method === "GET" && path === SIM_PATH) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(SIM_PAGE);
      return;
    }
    if (path !== MCP_PATH) {
      sendError(res, 404, CLIENT_TEXT.notFound);
      return;
    }
    void handleMcp(req, res).catch(() => {
      sendError(res, 500, CLIENT_TEXT.internal);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      const bound = typeof address === "object" && address ? address.port : port;
      console.error(`iris-alexa listening path=${MCP_PATH} port=${bound}`);
      resolve(server);
    });
  });
}
