import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export interface SolChange {
  account: string;
  owner: string | null;
  mint: string | null;
  before: string;
  after: string;
  delta: string;
  note?: string;
}

export interface SolDecode {
  cls: string;
  programs: string[];
  findings: string[];
  changes: SolChange[];
}

interface IrisSolApi {
  decodeSolanaTx(tx: unknown): SolDecode;
  formatChange(change: SolChange): string;
  parseRpcResponseText(text: string): unknown;
}

const here = dirname(fileURLToPath(import.meta.url));
export const irisSol = require(join(here, "../vendor/sol-decode.js")) as IrisSolApi;

/** Public mainnet endpoint. No key. Override with SOLANA_RPC_URL. */
export const DEFAULT_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

export function solanaRpcUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.SOLANA_RPC_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_SOLANA_RPC_URL;
}

const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

/** Pull a signature out of a raw value or an explorer URL. */
export function extractSignature(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.includes("/")) {
    const match = trimmed.match(/[1-9A-HJ-NP-Za-km-z]{64,88}/);
    if (match) return match[0];
  }
  return trimmed.replace(/\s+/g, "");
}

export function isSolanaSignature(value: string): boolean {
  return SIGNATURE.test(value);
}
