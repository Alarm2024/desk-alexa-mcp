import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsx = join(root, "node_modules", ".bin", "tsx");

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

function postMcp(port: number, hostHeader: string): Promise<number> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "env-test", version: "0.0.0" },
    },
  });
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/mcp",
        headers: {
          host: hostHeader,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 2_000);
  await once(child, "exit");
  clearTimeout(timer);
}

describe("dotenv", () => {
  it("loads ALLOWED_HOSTS from a temp .env so that host is accepted", async () => {
    const dir = mkdtempSync(join(tmpdir(), "iris-env-"));
    writeFileSync(join(dir, ".env"), "ALLOWED_HOSTS=iris.example.com\n");
    const port = await freePort();
    const env: NodeJS.ProcessEnv = { ...process.env, HOST: "127.0.0.1", PORT: String(port) };
    delete env.ALLOWED_HOSTS;
    const server = spawn(tsx, [join(root, "src/index.ts")], {
      cwd: dir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let serverLog = "";
    server.stdout?.setEncoding("utf8");
    server.stderr?.setEncoding("utf8");
    server.stdout?.on("data", (chunk) => {
      serverLog += chunk;
    });
    server.stderr?.on("data", (chunk) => {
      serverLog += chunk;
    });
    try {
      const deadline = Date.now() + 15_000;
      while (!serverLog.includes("listening")) {
        if (Date.now() > deadline || server.exitCode !== null) {
          throw new Error(`server did not listen: ${serverLog}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert.equal(await postMcp(port, "not-allowed.example.com"), 403);
      assert.equal(await postMcp(port, "iris.example.com"), 200);
    } finally {
      await stop(server);
    }
  });
});
