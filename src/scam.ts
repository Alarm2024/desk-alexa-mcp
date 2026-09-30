export interface ScamReport {
  refused: false;
  verdict: "scam" | "no_pattern";
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

const PATTERNS: Pattern[] = [
  {
    id: "seed_phrase_request",
    test: (text) =>
      /seed phrase|seedphrase|recovery phrase|secret recovery|mnemonic|12 words|24 words|twelve words|twenty[- ]four words/.test(
        text,
      ) ||
      /(?:ask(?:ed|ing)?|want(?:s|ed)?|give|share|paste|type|enter|photo|send).{0,48}(?:seed|mnemonic|recovery phrase)/.test(
        text,
      ) ||
      /(?:seed|mnemonic|recovery phrase).{0,48}(?:ask|want|send|share|photo|dm|chat)/.test(text),
    why: "Someone is asking for the wallet's seed phrase or recovery words. Those words are the wallet. A real app, exchange, or support desk never needs them.",
    next_steps: [
      "Do not type, photograph, or send the words.",
      "Wipe the chat.",
      "If you already sent them, move remaining assets to a new wallet you create yourself on a device you trust, and do not reuse the exposed words.",
    ],
  },
  {
    id: "fake_support_dm",
    test: (text) =>
      /fake support/.test(text) ||
      /(?:i am|this is|i'm).{0,40}(?:support|customer service|help desk)/.test(text) ||
      /(?:support|help desk|customer service|admin|representative).{0,40}(?:dm|direct message|telegram|whatsapp|discord|texted|messaged)/.test(
        text,
      ) ||
      /(?:dm|telegram|whatsapp|discord).{0,40}(?:support|help desk|customer service)/.test(text),
    why: "A direct message claiming to be support is a common theft path. Real support does not open a private chat to fix a wallet.",
    next_steps: [
      "Do not reply, and do not move funds because the message said to.",
      "Close the chat. Do not share your screen.",
      "Open the official app yourself from the icon you already installed. Do not use a link from the message.",
    ],
  },
  {
    id: "fake_airdrop",
    test: (text) =>
      /airdrop/.test(text) ||
      /claim (?:your |free )?(?:tokens|nft|sol|airdrop)/.test(text) ||
      /free (?:tokens|nft|mint)/.test(text) ||
      /you(?:'ve| have) been selected/.test(text) ||
      /eligible to claim/.test(text),
    why: "Unsolicited airdrop and claim messages are a fixed scam pattern. The claim page is how the approval or the seed request arrives.",
    next_steps: [
      "Do not open the claim link and do not connect a wallet to it.",
      "Ignore the token if it appeared by itself.",
      "If you already signed, use explain_transaction on the public signature, then clean_up_steps for the wallet.",
    ],
  },
  {
    id: "unlimited_approval",
    test: (text) =>
      /unlimited approval|infinite approval|unlimited (?:token )?approve|approve unlimited|infinite allowance|max(?:imum)? approval/.test(
        text,
      ),
    why: "An unlimited approval lets another program move that token later, without a new confirmation for each transfer.",
    next_steps: [
      "Do not approve an unlimited amount for a program you did not open yourself.",
      "If it is already signed, revoke that approval inside the wallet you installed yourself.",
      "Paste only the public signature into explain_transaction if you want the chain read.",
    ],
  },
  {
    id: "authority_change",
    test: (text) =>
      /setauthority|set authority|authority change|change (?:the )?authority|transfer authority|new authority|freeze authority/.test(
        text,
      ),
    why: "An authority change (SetAuthority) hands control of a token account to someone else. That is a theft pattern when you did not intend to rotate authority.",
    next_steps: [
      "Do not sign a SetAuthority you did not mean to make.",
      "If it already landed, treat that token account as out of your control.",
      "Move what you still control to a new wallet created on a device you trust. Do not type a seed into this server.",
    ],
  },
  {
    id: "urgent_verify_wallet_link",
    test: (text) =>
      /verify (?:your )?wallet|wallet verification|confirm your wallet/.test(text) ||
      /urgent.{0,48}(?:link|verify|wallet)/.test(text) ||
      /click (?:here|this link).{0,48}(?:verify|wallet)/.test(text),
    why: "An urgent link that says to verify the wallet is a fixed scam pattern. Verification is the prompt that asks you to connect, approve, or type the seed.",
    next_steps: [
      "Do not open the link.",
      "Do not connect a wallet and do not enter recovery words.",
      "Check the account only by opening the official app yourself.",
    ],
  },
];

export function checkScam(situation: string): ScamReport {
  const text = situation.toLowerCase();
  const matched = PATTERNS.filter((pattern) => pattern.test(text));
  if (matched.length === 0) {
    return {
      refused: false,
      verdict: "no_pattern",
      pattern: null,
      also_matched: [],
      why: "None of the six fixed patterns matched this description. That is not a clearance.",
      next_steps: [
        "This result does not mean the situation is fine.",
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
    pattern: primary.id,
    also_matched: rest.map((pattern) => pattern.id),
    why,
    next_steps: primary.next_steps,
  };
}
