import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTipTopic, safetyTip, TIP_TOPICS, toTipTopic } from "../src/tips.js";

describe("safety_tip", () => {
  for (const topic of TIP_TOPICS) {
    it(`returns a short spoken tip for ${topic}`, () => {
      const result = safetyTip(topic);
      assert.equal(result.refused, false);
      assert.equal(result.topic, topic);
      assert.ok(result.tip.length > 40);
      assert.ok(result.tip.length < 320, "keep it to a breath or two");
      assert.equal(result.tip.includes("http"), false);
    });
  }

  it("defaults to general", () => {
    assert.equal(safetyTip().topic, "general");
    assert.match(safetyTip().tip, /seed phrase/i);
  });

  it("rejects an unknown topic", () => {
    assert.equal(isTipTopic("prices"), false);
    assert.equal(isTipTopic("links"), true);
  });

  it("maps a typed or spoken topic to its id", () => {
    assert.equal(toTipTopic("seed phrase"), "seed_phrase");
    assert.equal(toTipTopic("  Seed-Phrase "), "seed_phrase");
    assert.equal(toTipTopic("qr code"), "qr_codes");
    assert.equal(toTipTopic("link"), "links");
    assert.equal(toTipTopic("approvals"), "approvals");
  });

  it("does not guess an unknown topic", () => {
    assert.equal(toTipTopic("prices"), undefined);
    assert.equal(toTipTopic("seed"), undefined);
    assert.equal(toTipTopic(""), undefined);
  });
});
