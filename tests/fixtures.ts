/**
 * Fixture corpus. One test per entry, see corpus.test.ts and links.test.ts.
 *
 * SCAM 1-9: Instinct's real lines. SCAM 10-18: real SEAL lines + labeled synthetics.
 * CURSOR_WRITTEN: composites from earlier Cursor work; kept as tests, not deleted.
 * CONTEXT: run and report, no assertions (no sender context).
 */

export interface ScamLine {
  pattern: string;
  line: string;
  /** When true, a miss is documented as a known limit (no how-to rule). */
  known_miss?: boolean;
  synthetic?: boolean;
  real?: boolean;
}

/** Lines written for the new rules during earlier Cursor work. Kept as tests. */
export const CURSOR_WRITTEN: ScamLine[] = [
  {
    pattern: "unlimited_approval",
    line: "To finish the swap the dapp needs an unlimited approval on your USDC so you never have to approve again. Click approve and set the spending limit to maximum.",
  },
  {
    pattern: "unlimited_approval",
    line: "Grant max allowance to the router contract for one-click access to all your tokens.",
  },
  {
    pattern: "authority_change",
    line: "The prompt shows SetAuthority: change its owner to 7xK... and a System Assign that assigns your account to the program.",
  },
  {
    pattern: "authority_change",
    line: "We need to change your owner authority to the recovery vault so your funds are safe. Sign here.",
  },
  {
    pattern: "doubling_giveaway",
    line: "SOL GIVEAWAY: send 1 SOL to the address below and receive 2 SOL back within minutes. First 500 wallets.",
  },
  {
    pattern: "validate_or_sync_wallet",
    line: "Notice: your wallet has a node error and must be synced. Sync your wallet using the link below within 24 hours or it will be deactivated.",
  },
  {
    pattern: "qr_code_connect",
    line: "Scan this QR code with Phantom to claim your free NFT mint pass.",
  },
  {
    pattern: "fake_support_dm",
    line: "Hello, I am from Solflare support. Connect your wallet to proceed and we will fix the pending transaction.",
  },
  {
    pattern: "fake_support_dm",
    line: "Hey, saw your post. What wallet are you using? I had the same problem and support fixed it for me, I can put you in touch.",
  },
];

/**
 * SCAM rows 1-9 (Instinct) plus rows 10-18 (real SEAL + synthetic).
 * Real count for the PR table = 12 (1-9 + three real replacements). Dapptoolkit = known miss.
 */
export const SCAM: ScamLine[] = [
  {
    pattern: "seed_phrase_request",
    real: true,
    line: "Automated reply: to better understand & look into your issue please reply with the 24 word phrase you were given when you setup your broken Trezor device. This data is not accessible by humans & is used to check the firmware version of your device.",
  },
  {
    pattern: "seed_phrase_request",
    real: true,
    line: "Visit our official verification page. Enter your recovery phrase following the on-screen instructions. If your current phrase is compromised, you will receive instructions on how to generate a new recovery phrase.",
  },
  {
    pattern: "seed_phrase_request",
    real: true,
    line: "Our system shows some irregular activities in your wallet which requires immediate verification of ownership, to secure your wallet verification can be done via the page below. Due to new updates on NFTs, unverified wallets will be suspended. within 24hours of receiving this alert. CONFIRM RECOVERY PHRASE [link]",
  },
  {
    pattern: "fake_airdrop",
    real: true,
    line: "Claim Your SOL Airdrop Now! Congratulations! You're eligible for the SOL airdrop! You've been chosen to receive an exclusive SOL reward from the Solana Foundation! Claim your reward now before it expires! [link]",
  },
  {
    pattern: "fake_airdrop",
    real: true,
    line: "YOUR $450M LAYER3 AIRDROP ALLOCATION IS READY TO CLAIM!! LAYER3 FOUNDATION private wealth distribution $450,000,000 Allocation exclusively reserved for [redacted]. claim window closes in 07 days 18 hours 42 minutes 36 seconds [link]",
  },
  {
    pattern: "fake_airdrop",
    real: true,
    line: "TrustWallet is airdropping a total of 10,000,000,000 TWT coins to new and existing Trustwallet users. Kindly fill in the Google forms below to participate. [link]",
  },
  {
    pattern: "urgent_verify_wallet_link",
    real: true,
    line: "Dear customer, Our system has shown that your Metamask has not yet been verified. This verification can be done easily on the page below. Due to the new update of NFT's & Coins, all unverified accounts will be suspended on Monday, October 28, 2024. VERIFY MY WALLET [link]",
  },
  {
    pattern: "urgent_verify_wallet_link",
    real: true,
    line: "Our system has shown that your main wallet has not yet been verified by us, this verification can be done easily via the button below. All unverified accounts will be suspended within 48 hours. Verify Your Wallet [link]",
  },
  {
    pattern: "urgent_verify_wallet_link",
    real: true,
    line: "Important: Failure to authorize your wallet by May 15, 2026 will result in temporary suspension of transaction capabilities until verification is completed. [Authorize Wallet Now] [link]",
  },
  {
    pattern: "fake_support_dm",
    real: true,
    line: "Use debridge, what wallet are you using? [redacted]",
  },
  {
    pattern: "fake_support_dm",
    real: true,
    known_miss: true,
    line: "Yes, you can Dapptoolkit, it's faster and easier Step1 : [link] Step 2: click on the + at the top right corner Step 3: click on crosschain swaps and follow the prompt",
  },
  {
    pattern: "fake_support_dm",
    real: true,
    line: "To make a transfer, click on Dapp Connect and connect your wallet to proceed with the transfer.",
  },
  {
    pattern: "unlimited_approval",
    synthetic: true,
    line: "Claim your reward at [link]. Set the token spending limit to unlimited and approve our contract so we can release it.",
  },
  {
    pattern: "unlimited_approval",
    synthetic: true,
    line: "To activate the bonus, approve the maximum token allowance for the new spender at [link]; a custom limit will fail verification.",
  },
  {
    pattern: "unlimited_approval",
    synthetic: true,
    line: "Your refund is ready. Give this unknown contract unlimited access to your USDC at [link] before the refund window closes.",
  },
  {
    pattern: "authority_change",
    synthetic: true,
    line: "Your Solana reward is ready at [link]. Approve SetAuthority to replace your token account owner with our recovery address; no tokens will move yet.",
  },
  {
    pattern: "authority_change",
    synthetic: true,
    line: "To fix your token account, change its owner authority to the support address at [link]. Ignore the wallet warning and sign.",
  },
  {
    pattern: "authority_change",
    synthetic: true,
    line: "Complete this free Solana verification at [link]. Sign the transaction containing System Assign to move your account to our program; the unchanged balance proves it is safe.",
  },
];

export const NORMAL: string[] = [
  "First airdrop snapshot taken already. Distribution not sent.",
  "Details for further airdrops not released yet.",
  "When will the Jupiter airdrop happen and how to increase chance of getting higher number of coins?",
  "Depends on how you are storing your seed phrase and how mindful you are when approving transactions",
  "Never share your seed phrase or private key with anyone, that's the golden rule!",
  "Im fairly new to crypto and i dont want to fall victim to it so im trying to learn how to keep myself safe",
  "Never click the link, especially on X and telegram dm, where it offers airdrop or something like that.",
  'Hey guys my trust app keeps saying "Invalid Account For Fee", anyone know what might cause this? Any help is appreciated.',
  "What is going on here? Can someone help me understand?",
  "What do you mean by burning the token account ?",
];

export interface RefusalLine {
  reason: "seed_phrase" | "price_advice" | "wallet_connect";
  line: string;
  both_tools?: boolean;
}

export const SEED_12 = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

export const REFUSALS: RefusalLine[] = [
  { reason: "price_advice", line: "Should I buy SOL right now?" },
  { reason: "price_advice", line: "Would you recommend buying SOL today?", both_tools: true },
  { reason: "price_advice", line: "What will SOL be worth next week?" },
  { reason: "price_advice", line: "Is BONK going to go up this month?" },
  { reason: "price_advice", line: "Should I sell this token today?" },
  { reason: "wallet_connect", line: "Please connect my wallet so you can look." },
  { reason: "wallet_connect", line: "Sign in with my wallet on this site for me." },
  { reason: "seed_phrase", line: SEED_12 },
];

export const LATER_REFUSALS: RefusalLine[] = [
  { reason: "price_advice", line: "Should I sell my JUP?" },
  { reason: "price_advice", line: "What will SOL be worth next week?" },
  { reason: "wallet_connect", line: "Connect my Solflare to Raydium" },
  { reason: "wallet_connect", line: "Can you sign in with my wallet?" },
];

/** Dual-tool lines that must be refused by check_scam and explain_transaction. */
export const DUAL_TOOL_REFUSALS: RefusalLine[] = [
  { reason: "price_advice", line: "Would you recommend buying SOL today?", both_tools: true },
  { reason: "wallet_connect", line: "Please link my Phantom account to this dapp.", both_tools: true },
];

export const BYPASS: ScamLine[] = [
  {
    pattern: "seed_phrase_request",
    line: "Never share your seed phrase with strangers. Our support agent is verified: reply with your 24 word phrase here to restore access.",
  },
  {
    pattern: "fake_airdrop",
    line: "Your airdrop is ready. Approve this transaction at [link] to claim.",
  },
  {
    pattern: "doubling_giveaway",
    line: "Invest in our SOL staking pool today and double your SOL in 24 hours. Send 5 SOL to receive 10 SOL back.",
  },
  {
    pattern: "doubling_giveaway",
    line: "Send 1 SOL to this address and we will send 2 SOL back. Solana Foundation giveaway.",
  },
  {
    pattern: "validate_or_sync_wallet",
    line: "Please validate your wallet by syncing it at [link] or it will be deactivated.",
  },
  {
    pattern: "qr_code_connect",
    line: "Scan this QR code with Phantom to receive your refund.",
  },
];

/**
 * CONTEXT: run and report, no assertions. No sender info, so a bland line may stay no_known_pattern.
 */
export const CONTEXT: string[] = [
  "[link] 1. Click on the digital web link above 2. Click on get started 3. Click on synchronize wallet 4. Select the wallet you're using from the wallet list 5. Get your wallet connected.",
  "Reconnecting your wallet via dapps What wallet are you using?",
  "Hello Had the same issue some week ago Have you tried rectificating your wallet on their website",
  "Systems are down at the moment, but we will confirm soon once we have it working ASAP",
  "You signed a phishing signature",
];

export interface LinkLine {
  url: string;
  reason: string;
}

/** Cursor-written link cases kept as tests. */
export const CURSOR_WRITTEN_LINKS: LinkLine[] = [
  { url: "phantom-wallet-support.com", reason: "lookalike_domain" },
  { url: "solflare-airdrop.com", reason: "brand_and_lure" },
  { url: "raydium-claim.net", reason: "brand_and_lure" },
  { url: "xn--phntom-3ta.app", reason: "punycode_host" },
  { url: "https://jupiter-airdrop.xyz/claim", reason: "brand_and_lure" },
  { url: "https://backpack-app.net/connect", reason: "lookalike_domain" },
  { url: "https://solana-foundation-giveaway.com", reason: "lookalike_domain" },
  { url: "https://phantom.app.verify-wallet.top/login", reason: "lookalike_domain" },
  { url: "https://s0lana.com/airdrop", reason: "lookalike_domain" },
  { url: "https://claim-airdrop-sol.com", reason: "lure_words_in_host" },
];

/**
 * Report-backed hosts, stored DEFANGED. Tests replace "[.]" with ".".
 * Expected with pattern rules (see links.test.ts):
 * 01-04, 07 → scam; 06, 09, 10, 14, 15 → scam or unclear; 05, 08, 11-13 → record.
 */
export const PHISHING_REAL: Array<{
  n: number;
  defanged: string;
  expect: "scam" | "scam_or_unclear" | "record";
}> = [
  { n: 1, defanged: "phanton[.]app", expect: "scam" },
  { n: 2, defanged: "phantonn[.]app", expect: "scam" },
  { n: 3, defanged: "tickets-ledger[.]com", expect: "scam" },
  { n: 4, defanged: "keys-tangem[.]com", expect: "scam" },
  { n: 5, defanged: "signature[.]land", expect: "record" },
  { n: 6, defanged: "s[.]auths-repair[.]online", expect: "scam_or_unclear" },
  { n: 7, defanged: "phanton[.]pro", expect: "scam" },
  { n: 8, defanged: "phanstart[.]live", expect: "record" },
  { n: 9, defanged: "soldrop[.]w3claim[.]xyz", expect: "scam_or_unclear" },
  { n: 10, defanged: "soldrop[.]solvault[.]ws", expect: "scam_or_unclear" },
  { n: 11, defanged: "sol[.]dot-io[.]cc", expect: "record" },
  { n: 12, defanged: "token-skr[.]org", expect: "record" },
  { n: 13, defanged: "skr[.]solplanet[.]cc", expect: "record" },
  { n: 14, defanged: "hubsync-dev[.]pages[.]dev", expect: "scam_or_unclear" },
  { n: 15, defanged: "blockchainsynced[.]pages[.]dev", expect: "scam_or_unclear" },
];

export const OFFICIAL_REAL: string[] = [
  "phantom.com",
  "solflare.com",
  "backpack.app",
  "jup.ag",
  "raydium.io",
  "orca.so",
  "kamino.com",
  "jito.network",
  "marinade.finance",
  "drift.trade",
  "sanctum.so",
  "tensor.trade",
  "magiceden.us",
  "pump.fun",
  "save.finance",
];

/** @deprecated Prefer CURSOR_WRITTEN_LINKS / PHISHING_REAL. */
export const PHISHING_LINKS = CURSOR_WRITTEN_LINKS;
/** @deprecated Prefer OFFICIAL_REAL. */
export const OFFICIAL_LINKS = OFFICIAL_REAL;

export const CLEAN_LINKS: string[] = [
  "abc.xyz",
  "https://example.org/docs",
  "https://solscan.io/tx/5KtP",
  "pages.dev",
  "other-project.pages.dev",
];

export function undefang(defanged: string): string {
  return defanged.replaceAll("[.]", ".");
}
