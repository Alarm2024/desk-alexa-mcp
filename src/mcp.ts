import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { cleanUpSteps, isCleanupTarget } from "./cleanup.js";
import { explainTransaction } from "./explain.js";
import { refusalFor, type Refusal } from "./refusals.js";
import { checkScam } from "./scam.js";

const SERVER_VERSION = "1.0.0";

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError,
  };
}

function refusalResult(refusal: Refusal) {
  return textResult(refusal, true);
}

export function createIrisServer(): McpServer {
  const server = new McpServer(
    { name: "iris-alexa", version: SERVER_VERSION },
    {
      instructions:
        "Read-only Iris tools for Alexa+. explain_transaction reads one public Solana signature. check_scam matches six fixed patterns. clean_up_steps lists device or wallet steps the person does themselves. Refuse seed phrases, price or trading advice, and wallet connect. Store nothing.",
    },
  );

  server.registerTool(
    "explain_transaction",
    {
      title: "Explain a public Solana transaction",
      description:
        "Read-only. Decode one public Solana transaction signature with the Iris decoder. Uses the public RPC in SOLANA_RPC_URL. Does not sign, connect a wallet, or give price or trading advice. Refuses input that looks like a seed phrase.",
      inputSchema: z.object({
        signature: z.string().describe("Public Solana transaction signature, or an explorer URL containing one."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async ({ signature }) => {
      const refusal = refusalFor(signature);
      if (refusal) return refusalResult(refusal);
      const report = await explainTransaction(signature);
      return textResult(report, false);
    },
  );

  server.registerTool(
    "check_scam",
    {
      title: "Check a situation against fixed scam patterns",
      description:
        "Read-only. Match a description against six fixed patterns: seed-phrase request, fake support DM, fake airdrop, unlimited approval, authority change, and an urgent verify-wallet link. Returns verdict, why, and next steps. Refuses a pasted seed phrase, price or trading advice, and wallet connect.",
      inputSchema: z.object({
        situation: z.string().describe("What the person said or what you see. Do not include a seed phrase."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ situation }) => {
      const seeded = refusalFor(situation);
      if (seeded?.reason === "seed_phrase") return refusalResult(seeded);
      const report = checkScam(situation);
      if (report.verdict === "scam") return textResult(report, false);
      const refusal = refusalFor(situation);
      if (refusal) return refusalResult(refusal);
      return textResult(report, false);
    },
  );

  server.registerTool(
    "clean_up_steps",
    {
      title: "Clean-up steps you do yourself",
      description:
        "Read-only checklist for iphone, android, or wallet. Steps are done by the person on their own device. This server cannot connect a wallet or change a device.",
      inputSchema: z.object({
        target: z.enum(["iphone", "android", "wallet"]).describe("Which checklist to return."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ target }) => {
      if (!isCleanupTarget(target)) {
        return textResult(
          {
            refused: false,
            message: "target must be iphone, android, or wallet.",
          },
          true,
        );
      }
      return textResult(cleanUpSteps(target), false);
    },
  );

  return server;
}
