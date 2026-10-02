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
  "Refused. This server does not give price or buy/sell advice. It explains a public Solana transaction, matches fixed scam patterns, checks a link, and lists clean-up steps you do yourself.";

const WALLET_WARNING =
  "Refused. This server cannot connect a wallet, sign in with a wallet, sign, or approve. Do not connect a wallet because a message told you to.";

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

const ASSET = "(?:sol|solana|bonk|jup|jupiter|wif|btc|bitcoin|eth|ether|ethereum|usdc|usdt|ray|pyth|jto|this (?:coin|token)|that (?:coin|token)|the (?:coin|token)|it|this|that|\\$?[a-z]{2,6})";

/**
 * Price or buy/sell advice the person asks Iris for. These read as first-person questions
 * (should I, do you recommend, is it going to) so that the same words quoted inside a
 * forwarded scam message do not end up here. check_scam runs before this.
 */
export function asksPriceAdvice(raw: string): boolean {
  const text = raw.toLowerCase().replace(/\s+/g, " ");
  return (
    /\b(?:should|shall|do|can|could|would|must) (?:i|we) (?:buy|sell|trade|hold|hodl|invest|long|short|dump|ape|swap into|stake for)\b/.test(text) ||
    /\b(?:should|shall) (?:i|we) (?:be )?(?:buying|selling|holding|investing)\b/.test(text) ||
    /\b(?:is|are) (?:it|now|this|today|tomorrow|next week) (?:a )?good (?:time|moment|idea) to (?:buy|sell|invest|enter|exit)\b/.test(text) ||
    /\bgood (?:time|entry|entry point|price) to (?:buy|sell)\b/.test(text) ||
    /\bgood entry\b/.test(text) ||
    /\btrad(?:e|ing) (?:advice|signal|call|tip)s?\b/.test(text) ||
    /\bbuy or sell\b/.test(text) ||
    /\bbuy the dip\b/.test(text) ||
    /\b(?:recommend|suggest|advise|advice on)\b.{0,30}\b(?:buy|buying|sell|selling|invest|investing|coin|coins|token|tokens|hold|holding|entry)\b/.test(text) ||
    /\b(?:what|which) (?:coin|token|asset|meme ?coin|altcoin)s? (?:should|do|would|can) (?:i|we) (?:buy|sell|hold|invest|get|pick)\b/.test(text) ||
    /\bprice (?:target|prediction|forecast|outlook|call)s?\b/.test(text) ||
    /\bwhat(?:'s| is| will| would)\b.{0,40}\bprice\b/.test(text) ||
    /\bwhat(?:'s| is| will| would| are)\b.{0,40}\b(?:be )?worth\b/.test(text) ||
    /\bworth (?:next (?:week|month|year)|tomorrow|in (?:a|one|two|\d+) (?:week|month|year|day)s?|by (?:the )?end of|soon|later|in the future)\b/.test(text) ||
    new RegExp(`\\b(?:is|will) ${ASSET} (?:going to|gonna|about to|likely to|expected to) (?:go |get |be )?(?:up|down|higher|lower|moon|pump|dump|rise|fall|drop|crash|recover|rally|hit|reach|\\d)`).test(text) ||
    new RegExp(`\\b(?:is|will) ${ASSET} (?:go(?:ing)? )?(?:up|down|to the moon|moon(?:ing)?|pump(?:ing)?|dump(?:ing)?)\\b`).test(text) ||
    /\bhow (?:much|high|low) (?:is|will|should|can|could) \b.{0,30}\b(?:worth|be worth|go|cost|reach|hit)\b/.test(text) ||
    /\bhow much (?:is|should|will) (?:\w+ ){0,3}(?:cost|worth)\b/.test(text) ||
    /\b(?:is|are) (?:\w+ ){0,3}(?:a )?good (?:investment|buy|hold|bet)\b/.test(text) ||
    /\bwhen (?:should i|to|do i) (?:buy|sell|take profits?|exit|enter)\b/.test(text)
  );
}

/**
 * A wallet connection, sign-in, sign, or approve that the person asks Iris to do. First person
 * (my wallet, connect my Phantom to Jupiter, sign in with my wallet). A third-party message that
 * says "connect your wallet to proceed" is a scam pattern, handled in check_scam first.
 */
export function asksWalletConnect(raw: string): boolean {
  const text = raw.toLowerCase().replace(/\s+/g, " ");
  const wallet = "(?:phantom|solflare|backpack|ledger|glow|coinbase wallet|trust wallet|wallet)";
  return (
    new RegExp(`\\bconnect(?:ing)? (?:my |the |a |our )?(?:\\w+ )?${wallet}\\b`).test(text) ||
    new RegExp(`\\b(?:link|pair|attach|hook up|plug in|log in with|login with|sign in with|signin with|sign in using|log in using|authenticate with) (?:my |the |our )?(?:\\w+ )?${wallet}\\b`).test(text) ||
    /\bwallet\s*connect\b/.test(text) ||
    /\bplease connect\b/.test(text) ||
    /\b(?:can|could|would|will) you (?:please )?(?:connect|link|sign|approve|authorize|open|log|sign in)\b/.test(text) ||
    /\bsign (?:this |the |that |my )?(?:message|transaction|tx|request)\b/.test(text) ||
    /\bsign me in\b/.test(text) ||
    /\bplease link my\b/.test(text) ||
    /\blink my \w+ account\b/.test(text) ||
    /\bapprove (?:this |the |that |my )?(?:transaction|tx|request|approval|spend)\b/.test(text) ||
    /\bauthorize (?:this |the |that |my )?(?:transaction|tx|dapp|site|connection)\b/.test(text)
  );
}

/** The seed refusal runs before anything else, including the scam rules. */
export function seedRefusal(raw: string): Refusal | null {
  if (looksLikeSeedPhrase(raw)) {
    return { refused: true, reason: "seed_phrase", warning: SEED_WARNING };
  }
  return null;
}

export function refusalFor(raw: string): Refusal | null {
  const seeded = seedRefusal(raw);
  if (seeded) return seeded;
  if (asksWalletConnect(raw)) {
    return { refused: true, reason: "wallet_connect", warning: WALLET_WARNING };
  }
  if (asksPriceAdvice(raw)) {
    return { refused: true, reason: "price_advice", warning: PRICE_WARNING };
  }
  return null;
}
