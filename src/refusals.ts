import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const wordlist = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../vendor/bip39-english.txt"),
  "utf8",
)
  .split(/\s+/)
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

const BIP39 = new Set(wordlist);

export type RefusalReason = "seed_phrase" | "price_advice" | "wallet_connect";

export interface Refusal {
  refused: true;
  reason: RefusalReason;
  warning: string;
}

const SEED_WARNING =
  "Refused. That input looks like a 12- or 24-word seed phrase. This server did not send it to the Solana RPC, store it, or log it. The app you typed it into may keep a copy. If those are your real words, move your funds to a new wallet you create yourself. Anyone who asked for those words is trying to take the wallet.";

const PRICE_WARNING =
  "Refused. This server does not give price or buy/sell advice. It explains a public Solana transaction, matches six fixed scam patterns, and lists clean-up steps you do yourself.";

const WALLET_WARNING =
  "Refused. This server cannot connect a wallet, sign, or approve. Do not connect a wallet because a message told you to.";

function tokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/** True when a contiguous 12- or 24-word run is entirely in the English BIP-39 list. */
export function looksLikeSeedPhrase(raw: string): boolean {
  const words = tokens(raw);
  const widths = [12, 24];
  for (const width of widths) {
    if (words.length < width) continue;
    for (let i = 0; i <= words.length - width; i++) {
      const slice = words.slice(i, i + width);
      if (slice.every((word) => BIP39.has(word))) return true;
    }
  }
  return false;
}

export function asksPriceAdvice(raw: string): boolean {
  const text = raw.toLowerCase();
  return (
    /\b(should i|do i|can i|shall i)\s+(buy|sell|trade|long|short)\b/.test(text) ||
    /\b(price target|price prediction)\b/.test(text) ||
    /\btrad(?:e|ing) advice\b/.test(text) ||
    /\bwhat(?:'s| is) (?:the )?(?:price|worth)\b/.test(text) ||
    /\bhow much (?:is|should|will)\b/.test(text) ||
    /\b(buy or sell|good time to buy|good time to sell)\b/.test(text) ||
    /\brecommend(?:s|ed|ing)?\s+buy(?:ing)?\b/.test(text) ||
    /\bgood entry\b/.test(text)
  );
}

export function asksWalletConnect(raw: string): boolean {
  const text = raw.toLowerCase();
  return (
    /\bconnect(?:ing)? (?:my |the |your |a )?wallet\b/.test(text) ||
    /\bwallet\s*connect\b/.test(text) ||
    /\bplease connect\b/.test(text) ||
    /\bsign (?:this |the )?(?:message|transaction)\b/.test(text) ||
    /\bplease link my\b/.test(text) ||
    /\blink my \w+ account\b/.test(text) ||
    /\bapprove this transaction\b/.test(text)
  );
}

export function refusalFor(raw: string): Refusal | null {
  if (looksLikeSeedPhrase(raw)) {
    return { refused: true, reason: "seed_phrase", warning: SEED_WARNING };
  }
  if (asksWalletConnect(raw)) {
    return { refused: true, reason: "wallet_connect", warning: WALLET_WARNING };
  }
  if (asksPriceAdvice(raw)) {
    return { refused: true, reason: "price_advice", warning: PRICE_WARNING };
  }
  return null;
}
