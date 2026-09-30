import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanUpSteps, isCleanupTarget } from "../src/cleanup.js";

describe("clean_up_steps", () => {
  for (const target of ["iphone", "android", "wallet"] as const) {
    it(`returns steps for ${target}`, () => {
      const plan = cleanUpSteps(target);
      assert.equal(plan.target, target);
      assert.ok(plan.steps.length >= 5);
      assert.equal(plan.steps.some((step) => /seed phrase into a chat|Nobody else holds the phone|Do not connect this wallet/.test(step)), true);
    });
  }

  it("rejects an unknown target", () => {
    assert.equal(isCleanupTarget("windows"), false);
    assert.equal(isCleanupTarget("iphone"), true);
  });
});
