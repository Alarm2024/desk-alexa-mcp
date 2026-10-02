export const TIP_TOPICS = ["general", "seed_phrase", "links", "approvals", "support", "qr_codes"] as const;
export type TipTopic = (typeof TIP_TOPICS)[number];

export interface SafetyTip {
  refused: false;
  topic: TipTopic;
  tip: string;
}

/** Short lines meant to be spoken aloud. Each one fits in a breath or two. */
const TIPS: Record<TipTopic, string> = {
  general:
    "Never share your seed phrase with anyone or any app. Do not connect your wallet from a voice prompt or a link someone sent you. If a message says verify, claim, sync, or approve, stop, and open the official app yourself.",
  seed_phrase:
    "Your seed phrase is the wallet. No app, exchange, or support desk ever needs it. If anyone asks for it, that is the scam. Keep the words offline and never type them into a chat or a web page.",
  links:
    "Do not open a link that came with an urgent message. Type the official address yourself, or open the app you already installed. A short link hides where it goes, so skip it.",
  approvals:
    "Read the approval before you sign. An unlimited approval or a change of authority hands control to someone else. If you did not open that site yourself, close the prompt.",
  support:
    "Real support does not message you first, does not ask which wallet you use, and does not ask you to connect a wallet to fix anything. Close the chat and open the official app yourself.",
  qr_codes:
    "Scanning a QR code with your wallet is the same as connecting to that site. Do not scan a code a stranger posted. Paste an address you checked yourself instead.",
};

export function isTipTopic(value: string): value is TipTopic {
  return (TIP_TOPICS as readonly string[]).includes(value);
}

/**
 * A typed or spoken topic, mapped to one of TIP_TOPICS: case, spaces and
 * hyphens are ignored, and a missing plural is added ("seed phrase",
 * "Seed-Phrase", "qr code", "link"). Anything else is undefined, not guessed.
 */
export function toTipTopic(value: string): TipTopic | undefined {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (isTipTopic(key)) return key;
  const plural = `${key}s`;
  return isTipTopic(plural) ? plural : undefined;
}

export function safetyTip(topic: TipTopic = "general"): SafetyTip {
  return { refused: false, topic, tip: TIPS[topic] };
}
