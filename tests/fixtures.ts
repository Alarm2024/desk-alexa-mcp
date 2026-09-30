/**
 * Fixture corpus. One test per entry, see corpus.test.ts and links.test.ts.
 *
 * REAL_SCAM 1-9 are Instinct's public excerpts (r/CryptoScams, r/solana, Trust Wallet threads).
 * REAL_SCAM 10-15 are from SEAL / Know Your Crook / Reddit reports (brand names left as posted).
 * CURSOR_WRITTEN are composites written for the new rules; kept as tests, not deleted.
 * SYNTHETIC_SCAM are labeled synthetic lines that must return scam.
 * Do not add lines that need sender context ("Systems are down…", "You signed a phishing signature").
 */

export interface ScamLine {
  pattern: string;
  line: string;
  /** When true, a miss is documented as a known limit (no how-to rule). */
  known_miss?: boolean;
  synthetic?: boolean;
  source?: string;
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

/** Instinct's real scam lines (1-9) plus documented public incidents (10-15). */
export const REAL_SCAM: ScamLine[] = [
  {
    pattern: "seed_phrase_request",
    line: "Automated reply: to better understand & look into your issue please reply with the 24 word phrase you were given when you setup your broken Trezor device. This data is not accessible by humans & is used to check the firmware version of your device.",
  },
  {
    pattern: "seed_phrase_request",
    line: "Visit our official verification page. Enter your recovery phrase following the on-screen instructions. If your current phrase is compromised, you will receive instructions on how to generate a new recovery phrase.",
  },
  {
    pattern: "seed_phrase_request",
    line: "Our system shows some irregular activities in your wallet which requires immediate verification of ownership, to secure your wallet verification can be done via the page below. Due to new updates on NFTs, unverified wallets will be suspended. within 24hours of receiving this alert. CONFIRM RECOVERY PHRASE [link]",
  },
  {
    pattern: "fake_airdrop",
    line: "Claim Your SOL Airdrop Now! Congratulations! You're eligible for the SOL airdrop! You've been chosen to receive an exclusive SOL reward from the Solana Foundation! Claim your reward now before it expires! [link]",
  },
  {
    pattern: "fake_airdrop",
    line: "YOUR $450M LAYER3 AIRDROP ALLOCATION IS READY TO CLAIM!! LAYER3 FOUNDATION private wealth distribution $450,000,000 Allocation exclusively reserved for [redacted]. claim window closes in 07 days 18 hours 42 minutes 36 seconds [link]",
  },
  {
    pattern: "fake_airdrop",
    line: "TrustWallet is airdropping a total of 10,000,000,000 TWT coins to new and existing Trustwallet users. Kindly fill in the Google forms below to participate. [link]",
  },
  {
    pattern: "urgent_verify_wallet_link",
    line: "Dear customer, Our system has shown that your Metamask has not yet been verified. This verification can be done easily on the page below. Due to the new update of NFT's & Coins, all unverified accounts will be suspended on Monday, October 28, 2024. VERIFY MY WALLET [link]",
  },
  {
    pattern: "urgent_verify_wallet_link",
    line: "Our system has shown that your main wallet has not yet been verified by us, this verification can be done easily via the button below. All unverified accounts will be suspended within 48 hours. Verify Your Wallet [link]",
  },
  {
    pattern: "urgent_verify_wallet_link",
    line: "Important: Failure to authorize your wallet by May 15, 2026 will result in temporary suspension of transaction capabilities until verification is completed. [Authorize Wallet Now] [link]",
  },
  {
    pattern: "fake_support_dm",
    line: "Use debridge, what wallet are you using? [redacted]",
    source: "SEAL PSA, fake Telegram support, 2025-12-04",
  },
  {
    pattern: "fake_support_dm",
    line: "Yes, you can Dapptoolkit, it's faster and easier Step1 : [link] Step 2: click on the + at the top right corner Step 3: click on crosschain swaps and follow the prompt",
    source: "SEAL PSA, same incident; known miss: plain how-to from the text alone",
    known_miss: true,
  },
  {
    pattern: "fake_support_dm",
    line: "To make a transfer, click on Dapp Connect and connect your wallet to proceed with the transfer.",
    source: "SEAL PSA, same incident",
  },
  {
    pattern: "validate_or_sync_wallet",
    line: "[link] 1. Click on the digital web link above 2. Click on get started 3. Click on synchronize wallet 4. Select the wallet you're using from the wallet list 5. Get your wallet connected.",
    source: "Know Your Crook, 2022-04-04, https://paragraph.com/@knowyourcrook/scam-review-validate-your-wallet",
  },
  {
    pattern: "fake_support_dm",
    line: "Reconnecting your wallet via dapps What wallet are you using?",
    source: "r/cardano, 2021-12-10, https://www.reddit.com/r/cardano/comments/rd9cjr/",
  },
  {
    pattern: "validate_or_sync_wallet",
    line: "Hello Had the same issue some week ago Have you tried rectificating your wallet on their website",
    source: "r/CryptoCurrency, 2021-11-17, https://www.reddit.com/r/CryptoCurrency/comments/qw4rga/",
  },
];

/** Labeled synthetic scam lines. Each must return scam. */
export const SYNTHETIC_SCAM: ScamLine[] = [
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

/** @deprecated Prefer REAL_SCAM + CURSOR_WRITTEN + SYNTHETIC_SCAM. Kept for older imports. */
export const SCAM: ScamLine[] = [...REAL_SCAM.filter((s) => !s.known_miss), ...CURSOR_WRITTEN];

export const NORMAL: Array<string | { line: string; synthetic?: boolean }> = [
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
  { line: "What wallet are you using? I like Phantom for NFTs.", synthetic: true },
];

export interface RefusalLine {
  reason: "seed_phrase" | "price_advice" | "wallet_connect";
  line: string;
  /** When set, also assert refusal via explain_transaction's refusalFor path. */
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
  { reason: "price_advice", line: "Should I sell my JUP?" },
  { reason: "wallet_connect", line: "Connect my Solflare to Raydium" },
  { reason: "wallet_connect", line: "Can you sign in with my wallet?" },
  { reason: "wallet_connect", line: "Please link my Phantom account to this dapp.", both_tools: true },
  { reason: "price_advice", line: "Is SOL going to 500 by December?" },
  { reason: "wallet_connect", line: "Sign in with my wallet" },
];

/** Lines built to slip past a checker that runs refusals or "never share" before the scam rules. */
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

export interface LinkLine {
  url: string;
  reason: string;
}

/** Defanged reported hosts (same order as src/reported-hosts.ts). */
export const REPORTED_LINKS: Array<{
  n: number;
  defanged: string;
  /** Expected with reported list ON. */
  on: "scam";
  /**
   * Expected with reported list OFF (pattern rules alone).
   * "scam_or_unclear" means either scam or unclear is accepted.
   * "record" means we record whatever the patterns return (may be a known miss).
   */
  off: "scam" | "scam_or_unclear" | "record";
}> = [
  { n: 1, defanged: "phanton[.]app", on: "scam", off: "scam" },
  { n: 2, defanged: "phantonn[.]app", on: "scam", off: "scam" },
  { n: 3, defanged: "tickets-ledger[.]com", on: "scam", off: "scam" },
  { n: 4, defanged: "keys-tangem[.]com", on: "scam", off: "scam" },
  { n: 5, defanged: "signature[.]land", on: "scam", off: "record" },
  { n: 6, defanged: "s[.]auths-repair[.]online", on: "scam", off: "scam_or_unclear" },
  { n: 7, defanged: "phanton[.]pro", on: "scam", off: "scam" },
  { n: 8, defanged: "phanstart[.]live", on: "scam", off: "record" },
  { n: 9, defanged: "soldrop[.]w3claim[.]xyz", on: "scam", off: "scam_or_unclear" },
  { n: 10, defanged: "soldrop[.]solvault[.]ws", on: "scam", off: "scam_or_unclear" },
  { n: 11, defanged: "sol[.]dot-io[.]cc", on: "scam", off: "record" },
  { n: 12, defanged: "token-skr[.]org", on: "scam", off: "record" },
  { n: 13, defanged: "skr[.]solplanet[.]cc", on: "scam", off: "record" },
  { n: 14, defanged: "hubsync-dev[.]pages[.]dev", on: "scam", off: "scam_or_unclear" },
  { n: 15, defanged: "blockchainsynced[.]pages[.]dev", on: "scam", off: "scam_or_unclear" },
];

/** The 15 named official domains from the hackathon brief. */
export const OFFICIAL_LINKS: string[] = [
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

/** Extra official domains kept from earlier code / hardware wallets. */
export const EXTRA_OFFICIAL_LINKS: string[] = [
  "https://phantom.app",
  "https://help.phantom.com/hc/en-us",
  "https://phantom.com/learn/connect-wallet",
  "https://solana.com/developers",
  "https://ledger.com",
  "https://tangem.com",
  "https://trezor.io",
  "https://metamask.io",
];

/** Brand+lure or punycode cases that must still return scam under pattern rules. */
export const PHISHING_LINKS: LinkLine[] = [
  { url: "phantom-wallet-support.com", reason: "brand_and_lure" },
  { url: "solflare-airdrop.com", reason: "brand_and_lure" },
  { url: "raydium-claim.net", reason: "brand_and_lure" },
  { url: "xn--phntom-3ta.app", reason: "punycode_host" },
  { url: "https://jupiter-airdrop.xyz/claim", reason: "brand_and_lure" },
  { url: "https://phantom.app.verify-wallet.top/login", reason: "lookalike_domain" },
  { url: "phantom.com.attacker.example", reason: "lookalike_domain" },
];

/** Brand alone or lure alone → unclear. */
export const UNCLEAR_LINKS: LinkLine[] = [
  { url: "https://backpack-app.net/connect", reason: "brand_in_host" },
  { url: "https://solana-foundation-giveaway.com", reason: "brand_in_host" },
  { url: "https://claim-airdrop-sol.com", reason: "lure_words_in_host" },
];

/** Not official and not flagged. A whole TLD is never a pattern. Shared hosting roots are not reported_host. */
export const CLEAN_LINKS: string[] = [
  "abc.xyz",
  "https://example.org/docs",
  "https://solscan.io/tx/5KtP",
  "pages.dev",
  "other-project.pages.dev",
];
