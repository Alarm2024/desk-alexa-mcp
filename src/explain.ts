import { looksLikeSeedPhrase } from "./refusals.js";
import {
  extractSignature,
  irisSol,
  isSolanaSignature,
  solanaRpcUrl,
  type SolDecode,
} from "./solana.js";

const CLASS_LABEL: Record<string, string> = {
  A: "QUIET",
  B: "OPEN PATHS",
  C: "ACT NOW",
};

export interface ExplainOk {
  refused: false;
  found: true;
  signature: string;
  chain: "solana";
  class: string;
  class_label: string;
  programs: string[];
  findings: string[];
  changes: string[];
  note: string;
}

export interface ExplainMiss {
  refused: false;
  found: false;
  signature: string;
  message: string;
}

const NOTE =
  "AI-assisted analysis of public pages. Read-only chain read of one public Solana transaction. This is not a clearance to sign, connect, or approve.";

const RPC_MS = 12_000;

export interface RpcResponse {
  result?: unknown;
  error?: { message?: string };
}

export async function fetchTransaction(
  signature: string,
  rpcUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RpcResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_MS);
  try {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 1 }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    return irisSol.parseRpcResponseText(text) as RpcResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function explainDecoded(signature: string, tx: unknown): ExplainOk {
  const decoded: SolDecode = irisSol.decodeSolanaTx(tx);
  return {
    refused: false,
    found: true,
    signature,
    chain: "solana",
    class: decoded.cls,
    class_label: CLASS_LABEL[decoded.cls] ?? decoded.cls,
    programs: decoded.programs,
    findings: decoded.findings,
    changes: (decoded.changes ?? []).map((change) => irisSol.formatChange(change)),
    note: NOTE,
  };
}

export async function explainTransaction(
  rawSignature: string,
  options: { rpcUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<ExplainOk | ExplainMiss> {
  if (looksLikeSeedPhrase(rawSignature)) {
    return {
      refused: false,
      found: false,
      signature: "",
      message: "Refused before any network call. This is not a verdict.",
    };
  }
  const signature = extractSignature(rawSignature);
  if (!isSolanaSignature(signature)) {
    return {
      refused: false,
      found: false,
      signature: "",
      message: "Need a public Solana transaction signature. This is not a verdict.",
    };
  }
  const rpcUrl = options.rpcUrl ?? solanaRpcUrl();
  const payload = await fetchTransaction(signature, rpcUrl, options.fetchImpl);
  if (!payload || payload.error || !("result" in payload)) {
    return {
      refused: false,
      found: false,
      signature,
      message: "Could not read that transaction from the public Solana RPC. This is not a verdict.",
    };
  }
  if (payload.result === null) {
    return {
      refused: false,
      found: false,
      signature,
      message: "Not found on this chain. Check the signature. This is not a verdict.",
    };
  }
  return explainDecoded(signature, payload.result);
}
