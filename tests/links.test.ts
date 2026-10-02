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
import {
  CLEAN_LINKS,
  CURSOR_WRITTEN_LINKS,
  OFFICIAL_REAL,
  PHISHING_REAL,
  SEED_12,
  undefang,
} from "./fixtures.js";

describe("check_link fixtures: PHISHING_REAL (pattern rules)", () => {
  assert.equal(PHISHING_REAL.length, 15);
  const recorded: Array<{ n: number; host: string; verdict: string; reason: string }> = [];
  for (const sample of PHISHING_REAL) {
    const host = undefang(sample.defanged);
    it(`phishing real ${String(sample.n).padStart(2, "0")} ${host}`, () => {
      // Pattern rules alone (reported list off) — required row outcomes.
      const result = checkLink(host, { useReportedList: false });
      if (sample.expect === "scam") {
        assert.equal(result.verdict, "scam", `${host} → ${result.verdict}/${result.reason}`);
      } else if (sample.expect === "scam_or_unclear") {
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
  it("records pattern results for rows 05, 08, 11, 12, 13", () => {
    assert.equal(recorded.length, 5);
    for (const row of recorded) {
      // eslint-disable-next-line no-console
      console.log(`known-limit row ${row.n} ${row.host} → ${row.verdict}/${row.reason}`);
    }
  });
});

describe("check_link fixtures: OFFICIAL_REAL", () => {
  assert.equal(OFFICIAL_REAL.length, 15);
  for (const [index, url] of OFFICIAL_REAL.entries()) {
    it(`official real ${index + 1} ${url} is official, not scam`, () => {
      const result = evaluateLink(url);
      assert.equal(result.refused, false, url);
      if (result.refused) return;
      assert.equal(result.verdict, "official", url);
      assert.notEqual(result.verdict, "scam", url);
    });
  }
});

describe("check_link fixtures: CURSOR_WRITTEN_LINKS", () => {
  for (const [index, sample] of CURSOR_WRITTEN_LINKS.entries()) {
    it(`cursor link ${index + 1} ${sample.url} is ${sample.reason}`, () => {
      const result = checkLink(sample.url, { useReportedList: false });
      if (sample.reason === "lure_words_in_host") {
        assert.equal(result.verdict, "unclear", sample.url);
        assert.equal(result.reason, "lure_words_in_host", sample.url);
      } else {
        assert.equal(result.verdict, "scam", sample.url);
        assert.equal(result.reason, sample.reason, sample.url);
      }
    });
  }
});

describe("check_link fixtures: clean / shared hosting negatives", () => {
  for (const url of CLEAN_LINKS) {
    it(`${url} is not scam and not official`, () => {
      const result = evaluateLink(url);
      assert.equal(result.refused, false);
      if (result.refused) return;
      assert.notEqual(result.verdict, "scam", url);
      assert.notEqual(result.verdict, "official", url);
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
  });

  it("lowercases and drops trailing dot and port for official hosts", () => {
    assert.equal(checkLink("PHANTOM.COM.").verdict, "official");
    assert.equal(checkLink("phantom.com:443").verdict, "official");
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
  it("keeps every OFFICIAL_REAL domain", () => {
    for (const domain of OFFICIAL_REAL) {
      assert.ok(Object.values(OFFICIAL_DOMAINS).flat().includes(domain), domain);
    }
  });

  it("treats a subdomain of an official domain as official", () => {
    assert.equal(isOfficialHost("docs.phantom.com"), "phantom");
    assert.equal(isOfficialHost("phantom.com.evil.top"), null);
  });

  it("finds a brand in a hyphenated host", () => {
    assert.equal(brandInHost("phantom-wallet-support.com"), "phantom");
    assert.equal(brandInHost("tickets-ledger.com"), "ledger");
  });

  it("flags misspellings within 2 letters", () => {
    assert.equal(misspelledBrand("phanton.app"), "phantom");
    assert.equal(misspelledBrand("phantonn.app"), "phantom");
  });

  it("does not flag a whole TLD or shared hosting root", () => {
    for (const host of ["abc.xyz", "pages.dev", "vercel.app"]) {
      assert.notEqual(checkLink(host).verdict, "scam", host);
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

  it("refuses a pasted seed phrase before reading any link", () => {
    const result = evaluateLink(`${SEED_12} https://phantom.com`);
    assert.equal(result.refused && result.reason, "seed_phrase");
  });

  it("does not turn connect-wallet in an official path into a refusal", () => {
    const result = evaluateLink("https://phantom.com/learn/connect-wallet");
    assert.equal(result.refused, false);
  });

  it("calls a brand lookalike a scam even when the sentence asks to connect", () => {
    const result = evaluateLink("connect my wallet to phantom-wallet-support.com");
    assert.equal(result.refused, false);
    assert.equal(!result.refused && result.reason, "lookalike_domain");
  });
});
