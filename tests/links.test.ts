import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateLink } from "../src/evaluate.js";
import { brandInHost, checkLink, extractHost, isOfficialHost, OFFICIAL_DOMAINS } from "../src/links.js";
import { CLEAN_LINKS, OFFICIAL_LINKS, PHISHING_LINKS, SEED_12 } from "./fixtures.js";

describe("check_link fixtures: phishing", () => {
  assert.equal(PHISHING_LINKS.length, 10);
  for (const [index, sample] of PHISHING_LINKS.entries()) {
    it(`phishing link ${index + 1} ${sample.url} is ${sample.reason}`, () => {
      const result = evaluateLink(sample.url);
      assert.equal(result.refused, false);
      if (result.refused) return;
      assert.equal(result.verdict, "scam", sample.url);
      assert.equal(result.reason, sample.reason, sample.url);
      assert.ok(result.next_steps.some((step) => /do not open/i.test(step)));
    });
  }
});

describe("check_link fixtures: official", () => {
  assert.equal(OFFICIAL_LINKS.length, 10);
  for (const [index, url] of OFFICIAL_LINKS.entries()) {
    it(`official link ${index + 1} ${url} is official and not a clearance`, () => {
      const result = evaluateLink(url);
      assert.equal(result.refused, false, url);
      if (result.refused) return;
      assert.equal(result.verdict, "official", url);
      assert.equal(result.reason, "official_domain", url);
      assert.match(result.why, /not a clearance/);
    });
  }
});

describe("check_link fixtures: clean but not official", () => {
  for (const url of CLEAN_LINKS) {
    it(`${url} is no_known_pattern`, () => {
      const result = evaluateLink(url);
      assert.equal(result.refused, false);
      if (result.refused) return;
      assert.equal(result.verdict, "no_known_pattern", url);
      assert.equal(result.reason, "no_known_pattern", url);
      assert.match(result.why, /This is not a clearance\./);
    });
  }
});

describe("check_link rules", () => {
  it("keeps the official list", () => {
    assert.deepEqual(Object.values(OFFICIAL_DOMAINS).flat().sort(), [
      "backpack.app",
      "jup.ag",
      "phantom.app",
      "phantom.com",
      "raydium.io",
      "solana.com",
      "solflare.com",
    ]);
  });

  it("treats a subdomain of an official domain as official", () => {
    assert.equal(isOfficialHost("docs.phantom.com"), "phantom");
    assert.equal(isOfficialHost("phantom.com.evil.top"), null);
  });

  it("finds a brand in a hyphenated or fused host", () => {
    assert.equal(brandInHost("phantom-wallet-support.com"), "phantom");
    assert.equal(brandInHost("phantomwallet.io"), "phantom");
    assert.equal(brandInHost("app.jup-claim.com"), "jupiter");
    assert.equal(brandInHost("abc.xyz"), null);
  });

  it("does not flag a whole TLD", () => {
    for (const host of ["abc.xyz", "shop.top", "news.buzz", "team.click"]) {
      assert.equal(checkLink(host).verdict, "no_known_pattern", host);
    }
  });

  it("passes a path on an official domain", () => {
    const result = checkLink("phantom.com/learn/connect-wallet");
    assert.equal(result.verdict, "official");
    assert.equal(result.host, "phantom.com");
  });

  it("flags any punycode host", () => {
    const result = checkLink("https://xn--slflare-4za.com");
    assert.equal(result.verdict, "scam");
    assert.equal(result.reason, "punycode_host");
  });

  it("says it cannot see where a short link goes", () => {
    for (const url of ["https://bit.ly/3abcXYZ", "t.co/abc", "https://tinyurl.com/x"]) {
      const result = checkLink(url);
      assert.equal(result.verdict, "unclear", url);
      assert.equal(result.reason, "short_link", url);
      assert.match(result.why, /can't see where it goes/);
      assert.match(result.why, /open the official app yourself/i);
    }
  });

  it("pulls the host out of a sentence", () => {
    assert.equal(extractHost("she sent me https://solflare-airdrop.com/claim?x=1 and said hurry"), "solflare-airdrop.com");
    assert.equal(extractHost("no link here"), null);
  });

  it("answers no_url without a domain", () => {
    const result = checkLink("just some words");
    assert.equal(result.verdict, "no_known_pattern");
    assert.equal(result.reason, "no_url");
  });
});

describe("check_link refusals share the message refusal shape", () => {
  it("refuses a request to connect a wallet to a link with reason wallet_connect", () => {
    const result = evaluateLink("connect my wallet to https://jup.ag");
    assert.equal(result.refused, true);
    if (!result.refused) return;
    assert.equal(result.reason, "wallet_connect");
    assert.deepEqual(Object.keys(result).sort(), ["reason", "refused", "warning"]);
  });

  it("refuses a sign-in with wallet request", () => {
    const result = evaluateLink("sign in with my wallet at https://raydium.io");
    assert.equal(result.refused && result.reason, "wallet_connect");
  });

  it("refuses a pasted seed phrase before reading any link", () => {
    const result = evaluateLink(`${SEED_12} https://phantom.com`);
    assert.equal(result.refused && result.reason, "seed_phrase");
    assert.equal(JSON.stringify(result).includes("abandon"), false);
  });

  it("does not turn connect-wallet in an official path into a refusal", () => {
    const result = evaluateLink("https://phantom.com/learn/connect-wallet");
    assert.equal(result.refused, false);
  });

  it("calls a lookalike a scam even when the sentence asks to connect", () => {
    const result = evaluateLink("connect my wallet to phantom-wallet-support.com");
    assert.equal(result.refused, false);
    assert.equal(!result.refused && result.reason, "lookalike_domain");
  });
});
