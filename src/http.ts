import { createMcpHandler } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { createServer, type Server } from "node:http";
import { createIrisServer } from "./mcp.js";

export const MCP_PATH = "/mcp";

export function allowedHostnames(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = (env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return ["localhost", "127.0.0.1", "[::1]", ...extra];
}

export function createHandler() {
  return createMcpHandler(() => createIrisServer(), {
    responseMode: "json",
    onerror: (error: Error) => {
      console.error(`mcp error name=${error.name}`);
    },
  });
}

export function startServer(options: { host?: string; port?: number; env?: NodeJS.ProcessEnv } = {}): Promise<Server> {
  const env = options.env ?? process.env;
  const host = options.host ?? env.HOST ?? "0.0.0.0";
  const port = options.port ?? Number(env.PORT ?? 3000);
  const hosts = allowedHostnames(env);
  const validateHost = hostHeaderValidation(hosts);
  const validateOrigin = originValidation(hosts);
  const nodeHandler = toNodeHandler(createHandler());

  const server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (req.method === "GET" && path === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "iris-alexa-mcp",
          transport: "streamable-http",
          mcp_spec: "2025-11-25",
          read_only: true,
        }),
      );
      return;
    }
    if (path !== MCP_PATH) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    void nodeHandler(req, res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      const bound = typeof address === "object" && address ? address.port : port;
      console.error(`iris-alexa-mcp listening path=${MCP_PATH} port=${bound}`);
      resolve(server);
    });
  });
}
