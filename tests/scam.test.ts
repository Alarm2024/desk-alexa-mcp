import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkScam } from "../src/scam.js";
import { refusalFor } from "../src/refusals.js";

const SEED_12 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("check_scam", () => {
  const cases: Array<{ situation: string; pattern: string }> = [
    {
      situation: "A stranger asked me to type my seed phrase into their site.",
      pattern: "seed_phrase_request",
    },
    {
      situation: "Someone DMed me on Telegram saying they are Phantom support.",
      pattern: "fake_support_dm",
    },
    {
      situation: "I got a link to claim a free airdrop of tokens.",
      pattern: "fake_airdrop",
    },
    {
      situation: "The page wants an unlimited approval for my tokens.",
      pattern: "unlimited_approval",
    },
    {
      situation: "This transaction calls SetAuthority and changes the authority.",
      pattern: "authority_change",
    },
    {
      situation: "Urgent: open this link to verify your wallet right now.",
      pattern: "urgent_verify_wallet_link",
    },
  ];

  for (const sample of cases) {
    it(`matches ${sample.pattern}`, () => {
      const report = checkScam(sample.situation);
      assert.equal(report.verdict, "scam");
      assert.equal(report.pattern, sample.pattern);
      assert.ok(report.why.length > 0);
      assert.ok(report.next_steps.length > 0);
    });
  }

  it("returns no_pattern without calling the situation fine", () => {
    const report = checkScam("I opened the Settings app and looked at my own devices.");
    assert.equal(report.verdict, "no_pattern");
    assert.equal(report.pattern, null);
    assert.match(report.why, /not a clearance/);
  });

  it("refuses a pasted 12-word seed phrase before the scam rules", () => {
    const refusal = refusalFor(SEED_12);
    assert.equal(refusal?.reason, "seed_phrase");
    assert.equal(JSON.stringify(refusal).includes("abandon"), false);
  });

  it("refuses price advice when no scam pattern matches", () => {
    const situation = "Should I sell this token today?";
    assert.equal(checkScam(situation).verdict, "no_pattern");
    assert.equal(refusalFor(situation)?.reason, "price_or_trading_advice");
  });

  it("refuses a wallet-connect request when no scam pattern matches", () => {
    const situation = "Please connect my wallet so you can look.";
    assert.equal(refusalFor(situation)?.reason, "wallet_connect");
  });

  it("keeps a scam description even when it mentions connecting", () => {
    const report = checkScam("They sent an urgent link that says verify your wallet.");
    assert.equal(report.verdict, "scam");
    assert.equal(report.pattern, "urgent_verify_wallet_link");
  });
});
