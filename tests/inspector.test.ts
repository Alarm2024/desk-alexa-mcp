import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inspector = join(root, "node_modules", ".bin", "mcp-inspector");
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

function runInspector(args: string[], timeoutMs = 20_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(inspector, ["--cli", ...args], {
    cwd: root,
    env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
  return once(child, "exit").then(([code]) => {
    clearTimeout(timer);
    return { code: code as number | null, stdout, stderr };
  });
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 2_000);
  await once(child, "exit");
  clearTimeout(timer);
}

describe("MCP Inspector connection", () => {
  it("connects over Streamable HTTP, calls each tool, and refuses each blocked input", async () => {
    const port = await freePort();
    const server = spawn(tsx, ["src/index.ts"], {
      cwd: root,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com",
      },
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

    const marker = "yellowhorse-marker-not-a-seed";
    const url = `http://127.0.0.1:${port}/mcp`;
    try {
      const deadline = Date.now() + 15_000;
      while (!serverLog.includes("listening")) {
        if (Date.now() > deadline || server.exitCode !== null) {
          throw new Error(`server did not listen: ${serverLog}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const listed = await runInspector([url, "--transport", "http", "--method", "tools/list"]);
      assert.equal(listed.code, 0, listed.stderr || listed.stdout);
      for (const name of ["explain_transaction", "check_scam", "clean_up_steps"]) {
        assert.match(listed.stdout, new RegExp(name));
      }

      const scam = await runInspector([
        url,
        "--transport",
        "http",
        "--method",
        "tools/call",
        "--tool-name",
        "check_scam",
        "--tool-arg",
        `situation=A stranger asked me to type my seed phrase into their site. ${marker}`,
      ]);
      assert.equal(scam.code, 0, scam.stderr || scam.stdout);
      assert.match(scam.stdout, /seed_phrase_request/);
      assert.match(scam.stdout, /verdict/);
      assert.match(scam.stdout, /scam/);
      assert.match(scam.stdout, /next_steps/);

      const steps = await runInspector([
        url,
        "--transport",
        "http",
        "--method",
        "tools/call",
        "--tool-name",
        "clean_up_steps",
        "--tool-arg",
        "target=android",
      ]);
      assert.equal(steps.code, 0, steps.stderr || steps.stdout);
      assert.match(steps.stdout, /Device admin apps/);

      const explained = await runInspector([
        url,
        "--transport",
        "http",
        "--method",
        "tools/call",
        "--tool-name",
        "explain_transaction",
        "--tool-arg",
        "signature=not-a-signature",
      ]);
      assert.equal(explained.code, 0, explained.stderr || explained.stdout);
      assert.match(explained.stdout, /Need a public Solana transaction signature/);

      const seed = await runInspector([
        url,
        "--transport",
        "http",
        "--method",
        "tools/call",
        "--tool-name",
        "check_scam",
        "--tool-arg",
        "situation=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      ]);
      assert.match(seed.stdout, /seed_phrase/);
      assert.equal(seed.stdout.toLowerCase().includes("abandon"), false);

      const price = await runInspector([
        url,
        "--transport",
        "http",
        "--method",
        "tools/call",
        "--tool-name",
        "check_scam",
        "--tool-arg",
        "situation=Should I buy SOL right now?",
      ]);
      assert.match(price.stdout, /price_advice/);

      const connect = await runInspector([
        url,
        "--transport",
        "http",
        "--method",
        "tools/call",
        "--tool-name",
        "explain_transaction",
        "--tool-arg",
        "signature=Please connect my wallet",
      ]);
      assert.match(connect.stdout, /wallet_connect/);

      assert.equal(serverLog.includes(marker), false);
      assert.equal(serverLog.toLowerCase().includes("abandon"), false);
      assert.equal(serverLog.includes("Should I buy"), false);
    } finally {
      await stop(server);
    }
  });
});
