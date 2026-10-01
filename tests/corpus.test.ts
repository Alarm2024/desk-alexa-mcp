import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateMessage } from "../src/evaluate.js";
import { refusalFor } from "../src/refusals.js";
import {
  BYPASS,
  CONTEXT,
  CURSOR_WRITTEN,
  DUAL_TOOL_REFUSALS,
  LATER_REFUSALS,
  NORMAL,
  REFUSALS,
  SCAM,
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

describe("fixture corpus: CURSOR_WRITTEN scam lines", () => {
  assert.equal(CURSOR_WRITTEN.length, 9);
  for (const [index, sample] of CURSOR_WRITTEN.entries()) {
    it(`cursor-written ${index + 1} is ${sample.pattern}`, () => expectScam(sample));
  }
});

describe("fixture corpus: SCAM lines", () => {
  assert.equal(SCAM.length, 18);
  assert.equal(SCAM.filter((s) => s.real).length, 12);
  assert.equal(SCAM.filter((s) => s.synthetic).length, 6);
  for (const [index, sample] of SCAM.entries()) {
    if (sample.known_miss) {
      it(`scam ${index + 1} known miss (Dapptoolkit how-to; no ordinary how-to rule)`, () => {
        const result = evaluateMessage(sample.line);
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
    it(`scam ${index + 1} is ${sample.pattern}${sample.synthetic ? " (synthetic)" : ""}`, () => expectScam(sample));
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

describe("fixture corpus: LATER_REFUSALS", () => {
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

describe("fixture corpus: dual-tool refusals", () => {
  for (const sample of DUAL_TOOL_REFUSALS) {
    it(`check_scam refuses ${sample.reason}: ${sample.line}`, () => {
      const result = evaluateMessage(sample.line);
      assert.equal(result.refused, true, sample.line);
      if (!result.refused) return;
      assert.equal(result.reason, sample.reason, sample.line);
    });
    it(`explain_transaction path refuses ${sample.reason}: ${sample.line}`, () => {
      const refusal = refusalFor(sample.line);
      assert.equal(refusal?.reason, sample.reason, sample.line);
    });
  }
});

describe("fixture corpus: bypass lines run the scam rules before refusals", () => {
  assert.equal(BYPASS.length, 6);
  for (const [index, sample] of BYPASS.entries()) {
    it(`bypass line ${index + 1} is ${sample.pattern}, not a refusal`, () => expectScam(sample));
  }
});

describe("fixture corpus: CONTEXT (report, no assertions)", () => {
  assert.equal(CONTEXT.length, 5);
  for (const [index, line] of CONTEXT.entries()) {
    it(`context ${index + 1} runs and reports`, () => {
      const result = evaluateMessage(line);
      const verdict = result.refused ? `refused/${result.reason}` : result.verdict;
      // eslint-disable-next-line no-console
      console.log(`CONTEXT ${index + 1}: ${verdict} :: ${line.slice(0, 80)}`);
      assert.ok(typeof verdict === "string");
    });
  }
});
