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

  it("lists the iPhone call step and drops Screen Time and iMessage", () => {
    const steps = cleanUpSteps("iphone").steps.join("\n");
    assert.match(steps, /If someone asks you to share your screen during a call, end the call\./);
    assert.equal(steps.includes("Screen Time"), false);
    assert.equal(steps.includes("iMessage"), false);
  });

  it("splits Android Gmail forwarding and filters", () => {
    const steps = cleanUpSteps("android").steps;
    assert.ok(steps.some((step) => step.startsWith("Gmail on the web → Settings → See all settings → Forwarding and POP/IMAP")));
    assert.ok(steps.some((step) => step.includes("Filters and Blocked Addresses")));
  });
});
