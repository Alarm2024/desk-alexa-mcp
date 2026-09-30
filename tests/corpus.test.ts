import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkScam } from "../src/scam.js";

const SCAM: Array<{ pattern: string; line: string }> = [
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
];

const NORMAL = [
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

describe("public message corpus", () => {
  for (const [index, sample] of SCAM.entries()) {
    it(`scam line ${index + 1} is ${sample.pattern}`, () => {
      const report = checkScam(sample.line);
      assert.equal(report.verdict, "scam", sample.line);
      assert.equal(report.pattern, sample.pattern, sample.line);
    });
  }

  for (const [index, line] of NORMAL.entries()) {
    it(`normal line ${index + 1} is no_pattern`, () => {
      const report = checkScam(line);
      assert.equal(report.verdict, "no_pattern", line);
      assert.equal(report.pattern, null, line);
    });
  }
});
