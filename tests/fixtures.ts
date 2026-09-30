/**
 * Fixture corpus. One test per entry, see corpus.test.ts and links.test.ts.
 *
 * SCAM lines 1-9 and the NORMAL lines are public messages quoted in reports on r/CryptoScams,
 * r/solana, and Trust Wallet community threads (brand names left as posted). Lines 10-18 are
 * composites of the same message families, written for the new rules.
 *
 * BYPASS and LATER_REFUSALS hold placeholders in the shape of the lines described for this
 * branch. Swap in Instinct's real corpus here when it is pasted; the tests read these arrays.
 */

export interface ScamLine {
  pattern: string;
  line: string;
}

export const SCAM: ScamLine[] = [
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
}

export const SEED_12 = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

export const REFUSALS: RefusalLine[] = [
  { reason: "price_advice", line: "Should I buy SOL right now?" },
  { reason: "price_advice", line: "Would you recommend buying SOL today?" },
  { reason: "price_advice", line: "What will SOL be worth next week?" },
  { reason: "price_advice", line: "Is BONK going to go up this month?" },
  { reason: "price_advice", line: "Should I sell this token today?" },
  { reason: "wallet_connect", line: "Please connect my wallet so you can look." },
  { reason: "wallet_connect", line: "Sign in with my wallet on this site for me." },
  { reason: "seed_phrase", line: SEED_12 },
];

/** Lines built to slip past a checker that runs refusals or "never share" before the scam rules. */
export const BYPASS: ScamLine[] = [
  {
    pattern: "fake_airdrop",
    line: "Your airdrop is ready. Approve this transaction at [link] to claim",
  },
  {
    pattern: "doubling_giveaway",
    line: "Invest in our SOL staking pool and double your SOL in 7 days. Deposit now [link]",
  },
  {
    pattern: "seed_phrase_request",
    line: "Never share your seed phrase with anyone. To restore access, reply with your 24 word phrase here.",
  },
  {
    pattern: "fake_support_dm",
    line: "Hello from the Phantom team. Connect your wallet to proceed with the refund: [link]",
  },
  {
    pattern: "fake_support_dm",
    line: "Quick question before I help. What wallet are you using?",
  },
  {
    pattern: "qr_code_connect",
    line: "Scan this QR code with Phantom to receive your reward.",
  },
];

export const LATER_REFUSALS: RefusalLine[] = [
  { reason: "price_advice", line: "Is SOL going to 500 by December?" },
  { reason: "price_advice", line: "Do you recommend I sell my JUP now?" },
  { reason: "wallet_connect", line: "Sign in with my wallet" },
  { reason: "wallet_connect", line: "Connect my Solflare to Raydium for me." },
];

export interface LinkLine {
  url: string;
  reason: string;
}

export const PHISHING_LINKS: LinkLine[] = [
  { url: "phantom-wallet-support.com", reason: "lookalike_domain" },
  { url: "solflare-airdrop.com", reason: "lookalike_domain" },
  { url: "raydium-claim.net", reason: "lookalike_domain" },
  { url: "xn--phntom-3ta.app", reason: "punycode_host" },
  { url: "https://jupiter-airdrop.xyz/claim", reason: "lookalike_domain" },
  { url: "https://backpack-app.net/connect", reason: "lookalike_domain" },
  { url: "https://solana-foundation-giveaway.com", reason: "lookalike_domain" },
  { url: "https://phantom.app.verify-wallet.top/login", reason: "lookalike_domain" },
  { url: "https://s0lana.com/airdrop", reason: "lookalike_domain" },
  { url: "https://claim-airdrop-sol.com", reason: "lure_words_in_host" },
];

export const OFFICIAL_LINKS: string[] = [
  "https://phantom.com/learn/connect-wallet",
  "https://phantom.app",
  "https://help.phantom.com/hc/en-us",
  "https://solflare.com/download",
  "https://backpack.app",
  "https://jup.ag/swap/SOL-USDC",
  "https://raydium.io/swap/",
  "https://solana.com/developers",
  "https://docs.solana.com/",
  "https://explorer.solana.com/tx/5KtP",
];

/** Not official and not flagged. A whole TLD is never a pattern. */
export const CLEAN_LINKS: string[] = ["abc.xyz", "https://example.org/docs", "https://solscan.io/tx/5KtP"];
