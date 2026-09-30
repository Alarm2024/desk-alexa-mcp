import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateLink } from "../src/evaluate.js";
import {
  brandInHost,
  checkLink,
  extractHost,
  isOfficialHost,
  misspelledBrand,
  normalizeHost,
  OFFICIAL_DOMAINS,
} from "../src/links.js";
import { REPORTED_HOSTS, undefangHost } from "../src/reported-hosts.js";
import {
  CLEAN_LINKS,
  EXTRA_OFFICIAL_LINKS,
  OFFICIAL_LINKS,
  PHISHING_LINKS,
  REPORTED_LINKS,
  SEED_12,
  UNCLEAR_LINKS,
} from "./fixtures.js";

describe("check_link fixtures: reported list ON", () => {
  assert.equal(REPORTED_LINKS.length, 15);
  assert.equal(REPORTED_HOSTS.length, 15);
  for (const sample of REPORTED_LINKS) {
    const host = undefangHost(sample.defanged);
    it(`reported ${String(sample.n).padStart(2, "0")} ${host} is scam/reported_host`, () => {
      const result = checkLink(host, { useReportedList: true });
      assert.equal(result.verdict, "scam", host);
      assert.equal(result.reason, "reported_host", host);
      assert.match(result.why, /Reported as phishing by/);
      assert.match(result.why, /past report, not a live check/);
    });
  }
});

describe("check_link fixtures: reported list OFF (pattern rules alone)", () => {
  const recorded: Array<{ n: number; host: string; verdict: string; reason: string }> = [];
  for (const sample of REPORTED_LINKS) {
    const host = undefangHost(sample.defanged);
    it(`patterns-alone ${String(sample.n).padStart(2, "0")} ${host}`, () => {
      const result = checkLink(host, { useReportedList: false });
      if (sample.off === "scam") {
        assert.equal(result.verdict, "scam", `${host} → ${result.verdict}/${result.reason}`);
      } else if (sample.off === "scam_or_unclear") {
        assert.ok(
          result.verdict === "scam" || result.verdict === "unclear",
          `${host} → ${result.verdict}/${result.reason}`,
        );
      } else {
        recorded.push({ n: sample.n, host, verdict: result.verdict, reason: result.reason });
        assert.ok(["scam", "unclear", "no_known_pattern"].includes(result.verdict), result.verdict);
      }
    });
  }
  it("records pattern-alone results for rows 05, 08, 11, 12, 13", () => {
    assert.equal(recorded.length, 5);
    for (const row of recorded) {
      // eslint-disable-next-line no-console
      console.log(`known-limit row ${row.n} ${row.host} → ${row.verdict}/${row.reason}`);
    }
  });
});

describe("check_link fixtures: official domains", () => {
  assert.equal(OFFICIAL_LINKS.length, 15);
  for (const [index, url] of OFFICIAL_LINKS.entries()) {
    it(`official ${index + 1} ${url}`, () => {
      const result = evaluateLink(url);
      assert.equal(result.refused, false, url);
      if (result.refused) return;
      assert.equal(result.verdict, "official", url);
      assert.equal(result.reason, "official_domain", url);
      assert.match(result.why, /not a clearance/);
    });
  }
  for (const url of EXTRA_OFFICIAL_LINKS) {
    it(`extra official ${url}`, () => {
      const result = checkLink(url);
      assert.equal(result.verdict, "official", url);
    });
  }
});

describe("check_link fixtures: phishing pattern cases", () => {
  for (const [index, sample] of PHISHING_LINKS.entries()) {
    it(`phishing ${index + 1} ${sample.url} is ${sample.reason}`, () => {
      const result = evaluateLink(sample.url);
      assert.equal(result.refused, false);
      if (result.refused) return;
      assert.equal(result.verdict, "scam", sample.url);
      assert.equal(result.reason, sample.reason, sample.url);
    });
  }
});

describe("check_link fixtures: brand or lure alone is unclear", () => {
  for (const sample of UNCLEAR_LINKS) {
    it(`${sample.url} is unclear/${sample.reason}`, () => {
      const result = checkLink(sample.url, { useReportedList: false });
      assert.equal(result.verdict, "unclear", sample.url);
      assert.equal(result.reason, sample.reason, sample.url);
      assert.match(result.why, /don't connect a wallet; open the official app yourself/i);
    });
  }
});

describe("check_link fixtures: clean / shared hosting negatives", () => {
  for (const url of CLEAN_LINKS) {
    it(`${url} is not reported_host and not official`, () => {
      const result = evaluateLink(url);
      assert.equal(result.refused, false);
      if (result.refused) return;
      assert.notEqual(result.reason, "reported_host", url);
      assert.notEqual(result.verdict, "official", url);
      assert.equal(result.verdict, "no_known_pattern", url);
    });
  }
});

describe("check_link edge cases", () => {
  it("judges https://phantom.com@evil.example/ as evil.example, not official", () => {
    assert.equal(normalizeHost("https://phantom.com@evil.example/"), "evil.example");
    const result = checkLink("https://phantom.com@evil.example/");
    assert.notEqual(result.verdict, "official");
    assert.equal(result.host, "evil.example");
  });

  it("flags Cyrillic lookalike as punycode_host", () => {
    const result = checkLink("ph\u0430ntom.com");
    assert.equal(result.verdict, "scam");
    assert.equal(result.reason, "punycode_host");
    assert.ok(result.host?.startsWith("xn--"));
  });

  it("lowercases and drops trailing dot and port for official hosts", () => {
    assert.equal(checkLink("PHANTOM.COM.").verdict, "official");
    assert.equal(checkLink("phantom.com:443").verdict, "official");
    assert.equal(normalizeHost("phantom.com:443"), "phantom.com");
  });

  it("treats help.phantom.com as official", () => {
    assert.equal(checkLink("help.phantom.com").verdict, "official");
  });

  it("flags phantom.com.attacker.example as lookalike scam", () => {
    const result = checkLink("phantom.com.attacker.example");
    assert.equal(result.verdict, "scam");
    assert.equal(result.reason, "lookalike_domain");
  });
});

describe("check_link rules", () => {
  it("keeps the named official domains", () => {
    for (const domain of OFFICIAL_LINKS) {
      assert.ok(
        Object.values(OFFICIAL_DOMAINS).flat().includes(domain),
        domain,
      );
    }
  });

  it("treats a subdomain of an official domain as official", () => {
    assert.equal(isOfficialHost("docs.phantom.com"), "phantom");
    assert.equal(isOfficialHost("phantom.com.evil.top"), null);
  });

  it("finds a brand in a hyphenated or fused host", () => {
    assert.equal(brandInHost("phantom-wallet-support.com"), "phantom");
    assert.equal(brandInHost("phantomwallet.io"), "phantom");
    assert.equal(brandInHost("abc.xyz"), null);
  });

  it("flags misspellings within the edit budget", () => {
    assert.equal(misspelledBrand("phanton.app"), "phantom");
    assert.equal(misspelledBrand("phantonn.app"), "phantom");
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
    assert.deepEqual(Object.keys(result).sort(), ["reason", "refused", "summary", "warning"]);
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

  it("calls a brand+lure host a scam even when the sentence asks to connect", () => {
    const result = evaluateLink("connect my wallet to phantom-wallet-support.com");
    assert.equal(result.refused, false);
    assert.equal(!result.refused && result.reason, "brand_and_lure");
  });
});
