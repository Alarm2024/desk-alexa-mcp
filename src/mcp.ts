import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { cleanUpSteps, isCleanupTarget } from "./cleanup.js";
import { evaluateLink, evaluateMessage } from "./evaluate.js";
import { explainTransaction } from "./explain.js";
import { refusalFor } from "./refusals.js";
import { PATTERN_IDS } from "./scam.js";
import { isTipTopic, safetyTip, TIP_TOPICS } from "./tips.js";

const SERVER_VERSION = "1.1.0";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

function textResult(payload: unknown, isError = false): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError,
  };
}

/** A refusal is an error result with refused: true and a reason. Same shape for every tool. */
function resultFor(payload: { refused: boolean }): ToolResult {
  return textResult(payload, payload.refused);
}

const GENERIC_FAILURE = textResult(
  { refused: false, error: "tool_failed", message: "The tool could not finish. Nothing was stored. Try again with shorter input." },
  true,
);

/** Never let a raw exception message reach the client. */
function guarded<A>(run: (args: A) => Promise<ToolResult> | ToolResult): (args: A) => Promise<ToolResult> {
  return async (args: A) => {
    try {
      return await run(args);
    } catch (error) {
      console.error(`tool error name=${error instanceof Error ? error.name : "Error"}`);
      return GENERIC_FAILURE;
    }
  };
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false } as const;

export function createIrisServer(): McpServer {
  const server = new McpServer(
    { name: "iris-alexa", version: SERVER_VERSION },
    {
      instructions:
        "Read-only Iris tools for Alexa+. explain_transaction reads one public Solana signature. check_scam matches a message against fixed scam patterns. check_link checks a URL against official Solana wallet domains and lookalike patterns. safety_tip returns a short spoken reminder. clean_up_steps lists device or wallet steps the person does themselves. Refuse seed phrases, price or buy/sell advice, and wallet connect or sign. Store nothing. A clean result is not a clearance.",
    },
  );

  server.registerTool(
    "explain_transaction",
    {
      title: "Explain a public Solana transaction",
      description:
        "Read-only. Decode one public Solana transaction signature with the Iris decoder. Uses the public RPC in SOLANA_RPC_URL. Does not sign, connect a wallet, or give price or buy/sell advice. Refuses input that looks like a seed phrase.",
      inputSchema: z.object({
        signature: z.string().max(2048).describe("Public Solana transaction signature, or an explorer URL containing one."),
      }),
      annotations: { ...READ_ONLY, openWorldHint: true },
    },
    guarded(async ({ signature }) => {
      const refusal = refusalFor(signature);
      if (refusal) return resultFor(refusal);
      return resultFor(await explainTransaction(signature));
    }),
  );

  server.registerTool(
    "check_scam",
    {
      title: "Check a message against fixed scam patterns",
      description: `Read-only. Match a message or a description against fixed patterns: ${PATTERN_IDS.join(", ")}. Scam rules run first, so a forwarded scam message is a scam even when it quotes words like approve or invest. Then it refuses a pasted seed phrase, price or buy/sell advice, and a request to connect or sign. A no_known_pattern verdict is not a clearance. Rules read English.`,
      inputSchema: z.object({
        situation: z.string().max(8192).describe("What the person said or the message they received. Do not include a seed phrase."),
      }),
      annotations: { ...READ_ONLY, openWorldHint: false },
    },
    guarded(({ situation }) => resultFor(evaluateMessage(situation))),
  );

  server.registerTool(
    "check_link",
    {
      title: "Check a link against official domains and lookalike patterns",
      description:
        "Read-only. Reads the host of a URL. Official: phantom.com, phantom.app, solflare.com, backpack.app, jup.ag, raydium.io, solana.com and their subdomains. A host that carries one of those brand names elsewhere, or any punycode (xn--) host, is a lookalike. A short link cannot be checked. Whole TLDs are not flagged. Does not open the link. Refuses a request to connect or sign in with a wallet.",
      inputSchema: z.object({
        url: z.string().max(2048).describe("A URL, a domain, or a short message containing one."),
      }),
      annotations: { ...READ_ONLY, openWorldHint: false },
    },
    guarded(({ url }) => resultFor(evaluateLink(url))),
  );

  server.registerTool(
    "safety_tip",
    {
      title: "A short spoken safety reminder",
      description: `Read-only. Returns one short reminder meant to be spoken aloud. Topics: ${TIP_TOPICS.join(", ")}. Default is general.`,
      inputSchema: z.object({
        topic: z.string().max(32).optional().describe("Which reminder. Defaults to general."),
      }),
      annotations: { ...READ_ONLY, openWorldHint: false },
    },
    guarded(({ topic }) => {
      const chosen = (topic ?? "general").trim().toLowerCase();
      if (!isTipTopic(chosen)) {
        return textResult({ refused: false, message: `topic must be one of: ${TIP_TOPICS.join(", ")}.` }, true);
      }
      return resultFor(safetyTip(chosen));
    }),
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
      annotations: { ...READ_ONLY, openWorldHint: false },
    },
    guarded(({ target }) => {
      if (!isCleanupTarget(target)) {
        return textResult({ refused: false, message: "target must be iphone, android, or wallet." }, true);
      }
      return resultFor(cleanUpSteps(target));
    }),
  );

  return server;
}
