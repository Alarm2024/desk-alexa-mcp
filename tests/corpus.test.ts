import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateMessage } from "../src/evaluate.js";
import { BYPASS, LATER_REFUSALS, NORMAL, REFUSALS, SCAM, type ScamLine } from "./fixtures.js";

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

describe("fixture corpus: scam lines", () => {
  assert.equal(SCAM.length, 18);
  for (const [index, sample] of SCAM.entries()) {
    it(`scam line ${index + 1} is ${sample.pattern}`, () => expectScam(sample));
  }
});

describe("fixture corpus: normal lines", () => {
  assert.equal(NORMAL.length, 10);
  for (const [index, line] of NORMAL.entries()) {
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
  assert.equal(REFUSALS.length, 8);
  for (const [index, sample] of REFUSALS.entries()) {
    it(`refusal ${index + 1} is refused as ${sample.reason}`, () => {
      const result = evaluateMessage(sample.line);
      assert.equal(result.refused, true, sample.line);
      if (!result.refused) return;
      assert.equal(result.reason, sample.reason, sample.line);
      assert.ok(result.warning.startsWith("Refused."));
      assert.equal(JSON.stringify(result).includes("abandon"), false);
    });
  }
});

describe("fixture corpus: bypass lines run the scam rules before refusals", () => {
  assert.equal(BYPASS.length, 6);
  for (const [index, sample] of BYPASS.entries()) {
    it(`bypass line ${index + 1} is ${sample.pattern}, not a refusal`, () => expectScam(sample));
  }
});

describe("fixture corpus: later refusals", () => {
  assert.equal(LATER_REFUSALS.length, 4);
  for (const [index, sample] of LATER_REFUSALS.entries()) {
    it(`later refusal ${index + 1} is refused as ${sample.reason}`, () => {
      const result = evaluateMessage(sample.line);
      assert.equal(result.refused, true, sample.line);
      if (!result.refused) return;
      assert.equal(result.reason, sample.reason, sample.line);
    });
  }
});
