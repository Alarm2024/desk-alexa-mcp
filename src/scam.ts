export type ScamVerdict = "scam" | "no_known_pattern";

export interface ScamReport {
  refused: false;
  verdict: ScamVerdict;
  /** Pattern id for a scam, or "no_known_pattern". Same field name as check_link. */
  reason: string;
  pattern: string | null;
  also_matched: string[];
  why: string;
  next_steps: string[];
}

interface Pattern {
  id: string;
  test: (text: string) => boolean;
  why: string;
  next_steps: string[];
}

export const NOT_A_CLEARANCE = "This is not a clearance.";

const SECRET =
  "(?:\\d+\\s*-?\\s*words?\\s+(?:seed\\s+|recovery\\s+)?phrase|seed\\s*phrase|seedphrase|recovery\\s*(?:phrase|words)|mnemonic|secret\\s*(?:phrase|words|recovery\\s*phrase)|backup\\s*phrase|private\\s*key)";
const ASK_VERB =
  "(?:reply\\s+with|enter|confirm|send|share|type|provide|paste|submit|give|input|upload|verify|fill\\s+in|drop|post)";
const SEED_ASK = new RegExp(
  `${ASK_VERB}\\s+(?:(?:me|us)\\s+)?(?:(?:your|the|my|a|an)\\s+)?(?:\\w+\\s+){0,2}?${SECRET}`,
  "gi",
);
const SEED_QUESTION = new RegExp(`what\\s+(?:is|are|was)\\s+(?:your|the)\\s+(?:\\w+\\s+){0,2}?${SECRET}`, "i");

/** "never share" or "do not share" right before the ask is advice, not a request. */
const NEGATED_BEFORE = /(?:never|do\s+not|don't|dont|do\s+never|should\s+not|shouldn't|must\s+not)\s*(?:\w+\s+)?$/i;

/**
 * A request to reply with, enter, confirm, send, share, type, or otherwise hand over the secret.
 * A negated mention ("never share your seed phrase") is skipped, but any other ask in the same
 * text still counts, so a warning glued to a real request is a scam.
 */
export function asksForSeed(text: string): boolean {
  const re = new RegExp(SEED_ASK.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    if (NEGATED_BEFORE.test(before)) continue;
    return true;
  }
  return SEED_QUESTION.test(text);
}

function fakeAirdrop(text: string): boolean {
  if (/airdrop/.test(text) && /\b(?:claim|eligible|allocation|selected|participate|chosen|approve|ready|unlocked|expires?)\b/.test(text)) {
    return true;
  }
  if (/\bclaim\s+(?:your|the|my|this|a)?\s*(?:free\s+)?(?:reward|tokens?|prize|allocation|bonus|sol\b)/.test(text)) return true;
  if (/\bfree\s+(?:sol|tokens?|nft|mint)\b.{0,40}\b(?:claim|link|connect|now)\b/.test(text)) return true;
  return false;
}

function urgentVerifyWallet(text: string): boolean {
  if (/verify (?:your |my |the )?(?:wallet|ownership|account)/.test(text) && !/\bnever\b.{0,20}verify/.test(text)) return true;
  if (/authorize (?:your |my |the )?wallet/.test(text)) return true;
  if (/has not (?:yet )?been verified/.test(text) && /suspend/.test(text)) return true;
  if (/wallet verification|confirm your wallet|unverified (?:wallets?|accounts?)/.test(text)) return true;
  if (/urgent.{0,48}(?:link|verify|wallet)/.test(text)) return true;
  if (/click (?:here|this link|the (?:link|button) below).{0,48}(?:verify|wallet)/.test(text)) return true;
  return false;
}

function validateOrSync(text: string): boolean {
  const verb =
    /\b(?:validate|validation|re-?validate|sync|synchronize|synchroni[sz]ation|re-?sync|rectify|rectificat\w*|re-?activate|reconnect(?:ing)?|re-?connect(?:ing)?)\b.{0,48}\bwallet/;
  const threat =
    /\b(?:deactivat\w*|suspend\w*|lock(?:ed)?|restrict\w*|disabl\w*|expir\w*|terminat\w*|lose (?:your )?(?:funds|assets|access)|within \d+\s*(?:hours?|hrs|days?)|\d+\s*hours?|immediately|node error|below|link|website|dapp)\b/;
  if (verb.test(text) && threat.test(text)) return true;
  // "rectificating your wallet on their website" and reconnect prompts without a clock threat
  if (/\b(?:rectificat\w*|reconnect(?:ing)?|re-?connect(?:ing)?)\b.{0,48}\bwallet/.test(text)) return true;
  return false;
}

function qrCode(text: string): boolean {
  return (
    /\bscan\s+(?:this|the|that|my|our)\s+(?:\w+\s+)?qr\b/.test(text) ||
    /\bqr code\b.{0,40}\b(?:wallet|phantom|solflare|backpack|connect|claim|verify|receive|sign)/.test(text)
  );
}

/** Every "connect your wallet" that is not preceded by never / do not. */
function thirdPartyConnectTails(text: string): string[] {
  const tails: string[] = [];
  const re = /\bconnect\s+(?:your|the)\s+(?:\w+\s+)?wallet\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    if (NEGATED_BEFORE.test(before)) continue;
    tails.push(text.slice(match.index + match[0].length, match.index + match[0].length + 40));
  }
  return tails;
}

function doublingGiveaway(text: string): boolean {
  if (/\bdouble\s+(?:your|the|my|all)\s+(?:sol|crypto|coins?|tokens?|money|funds|deposit|holdings|investment)\b/.test(text)) return true;
  if (/\b(?:send|deposit|transfer)\b.{0,60}\bsol\b.{0,90}\b(?:receive|get|sent?\s+back|back|return(?:ed)?|double|2x|twice|instantly)\b/.test(text)) return true;
  if (/\b(?:2x|3x|10x|twice|double)\b.{0,30}\b(?:back|return|payout|instantly|to your wallet)\b/.test(text)) return true;
  if (/\bgiveaway\b.{0,60}\b(?:send|deposit|wallet address|to participate)\b/.test(text)) return true;
  if (/\bstaking pool\b.{0,60}\b(?:double|2x|\d{2,4}\s*%\s*(?:daily|weekly|apy|return))/.test(text)) return true;
  return false;
}

const CONNECT_TO_PROCEED =
  /^\s*.{0,30}?\b(?:to|and|so)\s+(?:we\s+can\s+|you\s+can\s+|i\s+can\s+)?(?:proceed|continue|fix|restore|resolve|recover|unlock|verify|claim|receive|complete|confirm|rectify|sync|validate|migrate|get)\b/;
const CONNECT_HERE = /^\s*(?:here|below|now|via|at|using|on|through|with)\b/;

/** "What wallet are you using" is a scam signal when next to these companions. */
function whatWalletAsk(text: string): boolean {
  return /\b(?:what|which)\s+wallet\s+(?:are|do)\s+you\s+(?:use|using|have|on)\b|\bwhat wallet are you\b/.test(text);
}

function whatWalletIsScamSignal(text: string): boolean {
  if (!whatWalletAsk(text)) return false;
  return (
    /\b(?:reconnect|re-?connect|sync|synchroni|rectif|validat|dapp)/.test(text) ||
    /\[link\]/.test(text) ||
    /\buse\s+[a-z][a-z0-9_-]{2,}\b/.test(text) ||
    /\bsupport\b/.test(text)
  );
}

function fakeSupport(text: string): boolean {
  if (/fake support/.test(text)) return true;
  if (
    /(?:i am|this is|i'm|we are|we're)\s+(?:from\s+|with\s+|the\s+|a\s+|an\s+|part of\s+|on\s+)?(?:(?!need|looking|seeking|asking|here|new|after)\w+\s+)?(?:official\s+)?(?:support|customer service|help desk|technical team|tech team|moderator|admin team)\b/.test(
      text,
    )
  ) {
    return true;
  }
  if (
    /(?:support|help desk|customer service|admin|representative|agent|moderator|dev team).{0,40}(?:dm|dm'd|dmed|direct message|telegram|whatsapp|discord|texted|messaged|reached out|contacted)/.test(
      text,
    )
  ) {
    return true;
  }
  if (/(?:dm|dmed|telegram|whatsapp|discord|messaged|texted).{0,40}(?:support|help desk|customer service|moderator|admin)/.test(text)) return true;
  if (whatWalletIsScamSignal(text)) return true;
  // "Dapp Connect" + connect your wallet, or reconnect via dapps
  if (/\bdapp\b/.test(text) && (/\bconnect\b.{0,40}\bwallet\b|\bwallet\b.{0,40}\bconnect\b|\breconnect/.test(text))) return true;
  for (const tail of thirdPartyConnectTails(text)) {
    if (CONNECT_TO_PROCEED.test(tail) || CONNECT_HERE.test(tail)) return true;
  }
  if (/\b(?:open a ticket|raise a ticket|ticket)\b.{0,40}\b(?:wallet|funds|recover|restore)\b/.test(text) && /\b(?:dm|link|form|below|here)\b/.test(text)) return true;
  if (/\bshare (?:your )?screen\b.{0,40}\b(?:wallet|fix|support|help)\b/.test(text)) return true;
  return false;
}

function unlimitedApproval(text: string): boolean {
  const near = /\b(?:unlimited|infinite|maximum|max|unrestricted)\b.{0,30}\b(?:approval|approve|allowance|spend(?:ing)?\s+limit|spend(?:ing)?\s+cap|access|permission|delegate)/;
  const reverse = /\b(?:approval|approve|allowance|spend(?:ing)?\s+limit|access|delegate)\b.{0,30}\b(?:unlimited|infinite|maximum|max|unrestricted|for all your tokens)\b/;
  return near.test(text) || reverse.test(text);
}

function authorityChange(text: string): boolean {
  return (
    /setauthority|set\s*authority|authority\s+change|change\s+(?:the\s+|its\s+|your\s+|my\s+)?(?:owner|authority|mint authority|freeze authority)|transfer\s+authority|new\s+authority|freeze\s+authority|owner\s+authority|system\s+assign\b|assign(?:s|ed|ing)?\s+(?:your|the|my)\s+account|assign\s+instruction|reassign(?:s|ed)?\s+(?:your|the)\s+(?:account|wallet)/.test(
      text,
    )
  );
}

const PATTERNS: Pattern[] = [
  {
    id: "seed_phrase_request",
    test: asksForSeed,
    why: "Someone is asking for the wallet's seed phrase or recovery words. Those words are the wallet. A real app, exchange, or support desk never needs them.",
    next_steps: [
      "Do not type, photograph, or send the words.",
      "Wipe the chat.",
      "If you already sent them, move remaining assets to a new wallet you create yourself on a device you trust, and do not reuse the exposed words.",
    ],
  },
  {
    id: "fake_support_dm",
    test: fakeSupport,
    why: "A message from a third party that claims to be support, asks which wallet you use, or tells you to connect a wallet to proceed, fix, or restore something is a common theft path. Real support does not open a private chat to fix a wallet.",
    next_steps: [
      "Do not reply, and do not move funds because the message said to.",
      "Close the chat. Do not share your screen.",
      "Open the official app yourself from the icon you already installed. Do not use a link from the message.",
    ],
  },
  {
    id: "fake_airdrop",
    test: fakeAirdrop,
    why: "Unsolicited airdrop and claim messages are a fixed scam pattern. The claim page is how the approval or the seed request arrives.",
    next_steps: [
      "Do not open the claim link and do not connect a wallet to it.",
      "Ignore the token if it appeared by itself.",
      "If you already signed, use explain_transaction on the public signature, then clean_up_steps for the wallet.",
    ],
  },
  {
    id: "doubling_giveaway",
    test: doublingGiveaway,
    why: "Send X and receive 2X back is a fixed theft pattern. Nothing comes back. A staking pool or giveaway that promises to double SOL is the same pattern.",
    next_steps: [
      "Do not send SOL or any token to the address.",
      "Block the account and report the post.",
      "If you already sent, the funds are gone. Use clean_up_steps for the wallet and do not chase a recovery offer.",
    ],
  },
  {
    id: "unlimited_approval",
    test: unlimitedApproval,
    why: "An unlimited or maximum approval, allowance, or spending limit lets another program move that token later, without a new confirmation for each transfer.",
    next_steps: [
      "Do not approve an unlimited amount for a program you did not open yourself.",
      "If it is already signed, revoke that approval inside the wallet you installed yourself.",
      "Paste the public signature into explain_transaction if you want the chain read.",
    ],
  },
  {
    id: "authority_change",
    test: authorityChange,
    why: "An authority change (SetAuthority, or a System Assign that reassigns your account) hands control of an account to someone else. That is a theft pattern when you did not intend to rotate authority.",
    next_steps: [
      "Do not sign a SetAuthority or Assign you did not mean to make.",
      "If it already landed, treat that account as out of your control.",
      "Move what you still control to a new wallet created on a device you trust. Do not type a seed into this server.",
    ],
  },
  {
    id: "urgent_verify_wallet_link",
    test: urgentVerifyWallet,
    why: "An urgent link that says to verify the wallet is a fixed scam pattern. Verification is the prompt that asks you to connect, approve, or type the seed.",
    next_steps: [
      "Do not open the link.",
      "Do not connect a wallet and do not enter recovery words.",
      "Check the account by opening the official app yourself.",
    ],
  },
  {
    id: "validate_or_sync_wallet",
    test: validateOrSync,
    why: "A notice that the wallet must be validated, synced, or rectified before it is deactivated is a fixed scam pattern. Wallets do not deactivate. The sync page asks for the seed or a connection.",
    next_steps: [
      "Do not open the link and do not connect a wallet to it.",
      "Open the wallet app yourself from the icon you installed. If it opens and shows your balance, nothing needed syncing.",
      "Never type recovery words into a page that says sync or validate.",
    ],
  },
  {
    id: "qr_code_connect",
    test: qrCode,
    why: "A QR code that you scan with the wallet app opens a connection or a signing request on your phone. Scanning it from a stranger is the same as connecting to their site.",
    next_steps: [
      "Do not scan the code with Phantom, Solflare, Backpack, or any wallet.",
      "If you already scanned it, open the wallet yourself and remove the connected site, then use clean_up_steps for the wallet.",
      "Send funds by pasting an address you verified, not by scanning a code someone posted.",
    ],
  },
];

export const PATTERN_IDS = PATTERNS.map((pattern) => pattern.id);

export function checkScam(situation: string): ScamReport {
  const text = situation.toLowerCase();
  const matched = PATTERNS.filter((pattern) => pattern.test(text));
  if (matched.length === 0) {
    return {
      refused: false,
      verdict: "no_known_pattern",
      reason: "no_known_pattern",
      pattern: null,
      also_matched: [],
      why: NOT_A_CLEARANCE,
      next_steps: [
        "None of the fixed patterns matched this text. That does not mean the situation is fine.",
        "Do not connect a wallet because of this result.",
        "If a device or a wallet still feels wrong, use clean_up_steps and do the steps yourself.",
      ],
    };
  }
  const [primary, ...rest] = matched;
  const why =
    rest.length === 0
      ? primary.why
      : `${primary.why} Also matched: ${rest.map((pattern) => pattern.id).join(", ")}.`;
  return {
    refused: false,
    verdict: "scam",
    reason: primary.id,
    pattern: primary.id,
    also_matched: rest.map((pattern) => pattern.id),
    why,
    next_steps: primary.next_steps,
  };
}
