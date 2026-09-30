import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateMessage } from "../src/evaluate.js";
import { refusalFor } from "../src/refusals.js";
import {
  BYPASS,
  CURSOR_WRITTEN,
  NORMAL,
  REAL_SCAM,
  REFUSALS,
  SYNTHETIC_SCAM,
  type ScamLine,
} from "./fixtures.js";

function expectScam(sample: ScamLine): void {
  const result = evaluateMessage(sample.line);
  assert.equal(result.refused, false, sample.line);
  if (result.refused) return;
  assert.equal(result.verdict, "scam", sample.line);
  assert.ok(
    [result.pattern, ...result.also_matched].includes(sample.pattern),
    `${sample.line}\n  expected ${sample.pattern}, got ${result.pattern} + [${result.also_matched.join(", ")}]`,
  );
}

function normalLine(entry: (typeof NORMAL)[number]): string {
  return typeof entry === "string" ? entry : entry.line;
}

describe("fixture corpus: CURSOR_WRITTEN scam lines", () => {
  assert.equal(CURSOR_WRITTEN.length, 9);
  for (const [index, sample] of CURSOR_WRITTEN.entries()) {
    it(`cursor-written ${index + 1} is ${sample.pattern}`, () => expectScam(sample));
  }
});

describe("fixture corpus: REAL_SCAM lines", () => {
  assert.equal(REAL_SCAM.length, 15);
  for (const [index, sample] of REAL_SCAM.entries()) {
    if (sample.known_miss) {
      it(`real scam ${index + 1} known miss (Dapptoolkit how-to; no ordinary how-to rule)`, () => {
        const result = evaluateMessage(sample.line);
        // Documented known miss: from the text alone it reads like normal how-to help.
        if (!result.refused && result.verdict === "scam") {
          assert.ok(true, "caught unexpectedly — fine");
          return;
        }
        assert.equal(result.refused, false, sample.line);
        if (result.refused) return;
        assert.equal(result.verdict, "no_known_pattern", sample.line);
      });
      continue;
    }
    it(`real scam ${index + 1} is ${sample.pattern}`, () => expectScam(sample));
  }
});

describe("fixture corpus: SYNTHETIC_SCAM lines", () => {
  assert.equal(SYNTHETIC_SCAM.length, 6);
  for (const [index, sample] of SYNTHETIC_SCAM.entries()) {
    it(`synthetic scam ${index + 1} is ${sample.pattern}`, () => {
      assert.equal(sample.synthetic, true);
      expectScam(sample);
    });
  }
});

describe("fixture corpus: normal lines", () => {
  assert.equal(NORMAL.length, 11);
  for (const [index, entry] of NORMAL.entries()) {
    const line = normalLine(entry);
    it(`normal line ${index + 1} is no_known_pattern and not refused`, () => {
      const result = evaluateMessage(line);
      assert.equal(result.refused, false, line);
      if (result.refused) return;
      assert.equal(result.verdict, "no_known_pattern", line);
      assert.equal(result.reason, "no_known_pattern", line);
      assert.equal(result.pattern, null, line);
      assert.equal(result.why, "This is not a clearance.");
    });
  }
});

describe("fixture corpus: refusals", () => {
  assert.equal(REFUSALS.length, 14);
  for (const [index, sample] of REFUSALS.entries()) {
    it(`refusal ${index + 1} is refused as ${sample.reason}`, () => {
      const result = evaluateMessage(sample.line);
      assert.equal(result.refused, true, sample.line);
      if (!result.refused) return;
      assert.equal(result.reason, sample.reason, sample.line);
      assert.ok(result.warning.startsWith("Refused."));
      assert.equal(JSON.stringify(result).includes("abandon"), false);
    });
    if (sample.both_tools) {
      it(`refusal ${index + 1} also refused on explain_transaction path`, () => {
        const refusal = refusalFor(sample.line);
        assert.equal(refusal?.reason, sample.reason, sample.line);
      });
    }
  }
});

describe("fixture corpus: bypass lines run the scam rules before refusals", () => {
  assert.equal(BYPASS.length, 6);
  for (const [index, sample] of BYPASS.entries()) {
    it(`bypass line ${index + 1} is ${sample.pattern}, not a refusal`, () => expectScam(sample));
  }
});

describe("what-wallet companion rule", () => {
  it("does not flag a bare what-wallet question", () => {
    const result = evaluateMessage("What wallet are you using? I like Phantom for NFTs.");
    assert.equal(result.refused, false);
    if (result.refused) return;
    assert.equal(result.verdict, "no_known_pattern");
  });

  it("flags what-wallet next to use <tool> or reconnect/dapp", () => {
    assert.equal(evaluateMessage("Use debridge, what wallet are you using? [redacted]").refused === false &&
      (evaluateMessage("Use debridge, what wallet are you using? [redacted]") as { verdict: string }).verdict, "scam");
    assert.equal(
      (evaluateMessage("Reconnecting your wallet via dapps What wallet are you using?") as { verdict: string }).verdict,
      "scam",
    );
  });
});
