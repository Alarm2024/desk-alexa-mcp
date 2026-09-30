import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateMessage } from "../src/evaluate.js";
import { asksPriceAdvice, asksWalletConnect, refusalFor } from "../src/refusals.js";
import { asksForSeed, checkScam, NOT_A_CLEARANCE, PATTERN_IDS } from "../src/scam.js";
import { SEED_12 } from "./fixtures.js";

describe("check_scam patterns", () => {
  const cases: Array<{ situation: string; pattern: string }> = [
    { situation: "A stranger asked me to type my seed phrase into their site.", pattern: "seed_phrase_request" },
    { situation: "Someone DMed me on Telegram saying they are Phantom support.", pattern: "fake_support_dm" },
    { situation: "I got a link to claim a free airdrop of tokens.", pattern: "fake_airdrop" },
    { situation: "The page wants an unlimited approval for my tokens.", pattern: "unlimited_approval" },
    { situation: "It asks for the maximum spending limit on USDC.", pattern: "unlimited_approval" },
    { situation: "Set max allowance so the dapp has access to all your tokens.", pattern: "unlimited_approval" },
    { situation: "This transaction calls SetAuthority and changes the authority.", pattern: "authority_change" },
    { situation: "The instruction is change its owner to a new address.", pattern: "authority_change" },
    { situation: "It contains a System Assign that assigns your account to another program.", pattern: "authority_change" },
    { situation: "Urgent: open this link to verify your wallet right now.", pattern: "urgent_verify_wallet_link" },
    { situation: "Send 5 SOL to this address and receive 10 SOL back.", pattern: "doubling_giveaway" },
    { situation: "Validate your wallet now or it will be deactivated in 12 hours.", pattern: "validate_or_sync_wallet" },
    { situation: "Sync your wallet with the link below, unsynced wallets get suspended.", pattern: "validate_or_sync_wallet" },
    { situation: "Scan this QR code with Phantom to connect.", pattern: "qr_code_connect" },
    { situation: "Connect your wallet to fix the stuck transaction.", pattern: "fake_support_dm" },
    { situation: "Connect your wallet to restore access to your funds.", pattern: "fake_support_dm" },
    { situation: "what wallet are you using? reconnect via the dapp support page", pattern: "fake_support_dm" },
    { situation: "Kindly fill in the form below to participate in the airdrop.", pattern: "fake_airdrop" },
  ];

  for (const sample of cases) {
    it(`matches ${sample.pattern}: ${sample.situation.slice(0, 40)}`, () => {
      const report = checkScam(sample.situation);
      assert.equal(report.verdict, "scam");
      assert.equal(report.pattern, sample.pattern);
      assert.equal(report.reason, sample.pattern);
      assert.ok(report.why.length > 0);
      assert.ok(report.next_steps.length > 0);
    });
  }

  it("lists every pattern id", () => {
    for (const id of [
      "seed_phrase_request",
      "fake_support_dm",
      "fake_airdrop",
      "doubling_giveaway",
      "unlimited_approval",
      "authority_change",
      "urgent_verify_wallet_link",
      "validate_or_sync_wallet",
      "qr_code_connect",
    ]) {
      assert.ok(PATTERN_IDS.includes(id), id);
    }
  });

  it("returns no_known_pattern with the not-a-clearance text", () => {
    const report = checkScam("I opened the Settings app and looked at my own devices.");
    assert.equal(report.verdict, "no_known_pattern");
    assert.equal(report.reason, "no_known_pattern");
    assert.equal(report.pattern, null);
    assert.equal(report.why, NOT_A_CLEARANCE);
    assert.equal(report.why, "This is not a clearance.");
  });
});

describe("never share scope", () => {
  it("does not flag a warning by itself", () => {
    assert.equal(asksForSeed("never share your seed phrase with anyone"), false);
    assert.equal(asksForSeed("do not share your recovery phrase"), false);
  });

  it("flags a warning glued to a real request", () => {
    assert.equal(asksForSeed("never share your seed phrase. reply with your 24 word phrase here"), true);
    const report = checkScam("Never share your seed phrase… reply with your 24 word phrase here");
    assert.equal(report.pattern, "seed_phrase_request");
  });

  it("flags a question for the words", () => {
    assert.equal(asksForSeed("what is your seed phrase?"), true);
  });
});

describe("detection order", () => {
  it("refuses a pasted 12-word seed phrase before the scam rules", () => {
    const result = evaluateMessage(SEED_12);
    assert.equal(result.refused, true);
    assert.equal(result.refused && result.reason, "seed_phrase");
    assert.equal(JSON.stringify(result).includes("abandon"), false);
  });

  it("calls a forwarded approve-to-claim message a scam, not a wallet refusal", () => {
    const result = evaluateMessage("Your airdrop is ready. Approve this transaction at [link] to claim");
    assert.equal(result.refused, false);
    assert.equal(!result.refused && result.verdict, "scam");
    assert.equal(!result.refused && result.pattern, "fake_airdrop");
  });

  it("calls a doubling staking pool a scam, not price advice", () => {
    const result = evaluateMessage("Invest in our SOL staking pool… double your SOL");
    assert.equal(result.refused, false);
    assert.equal(!result.refused && result.pattern, "doubling_giveaway");
  });

  it("refuses price advice when no scam pattern matches", () => {
    const situation = "Should I sell this token today?";
    assert.equal(checkScam(situation).verdict, "no_known_pattern");
    const result = evaluateMessage(situation);
    assert.equal(result.refused, true);
    assert.equal(result.refused && result.reason, "price_advice");
  });

  it("refuses a wallet-connect request when no scam pattern matches", () => {
    const result = evaluateMessage("Please connect my wallet so you can look.");
    assert.equal(result.refused, true);
    assert.equal(result.refused && result.reason, "wallet_connect");
  });

  it("keeps a scam description even when it mentions connecting", () => {
    const result = evaluateMessage("They sent an urgent link that says verify your wallet.");
    assert.equal(!result.refused && result.verdict, "scam");
    assert.equal(!result.refused && result.pattern, "urgent_verify_wallet_link");
  });
});

describe("widened refusals", () => {
  const price = [
    "Should I buy SOL right now?",
    "Should I sell my BONK?",
    "Do you recommend buying JUP?",
    "What is SOL worth?",
    "What will SOL be worth next week?",
    "Is SOL going to go up?",
    "Is BONK going to 1 dollar?",
    "Is now a good time to buy?",
    "What is the price of this token?",
  ];
  for (const line of price) {
    it(`price: ${line}`, () => {
      assert.equal(asksPriceAdvice(line), true);
      assert.equal(refusalFor(line)?.reason, "price_advice");
    });
  }

  const wallet = [
    "Sign in with my wallet",
    "Log in with my wallet on this site",
    "Connect my Phantom to Jupiter",
    "Connect my wallet to Raydium",
    "Please connect my wallet",
    "Sign this transaction for me",
  ];
  for (const line of wallet) {
    it(`wallet: ${line}`, () => {
      assert.equal(asksWalletConnect(line), true);
      assert.equal(refusalFor(line)?.reason, "wallet_connect");
    });
  }

  it("uses one refusal shape: refused true, reason, warning", () => {
    const refusal = refusalFor("Connect my Phantom to Jupiter");
    assert.deepEqual(Object.keys(refusal ?? {}).sort(), ["reason", "refused", "warning"]);
    assert.equal(refusal?.refused, true);
  });

  it("does not refuse a normal question that mentions a wallet", () => {
    assert.equal(refusalFor("Which wallet app has a dark mode?"), null);
    assert.equal(refusalFor("How do I see my transaction history?"), null);
  });
});
