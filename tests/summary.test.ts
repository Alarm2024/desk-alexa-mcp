import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { evaluateLink, evaluateMessage } from "../src/evaluate.js";
import { explainDecoded } from "../src/explain.js";
import { summarizeExplain } from "../src/summary.js";
import { safetyTip } from "../src/tips.js";
import { cleanUpSteps } from "../src/cleanup.js";
import { summarizeCleanup, summarizeTip } from "../src/summary.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "rpc");

function loadRpc(name: string): unknown {
  return JSON.parse(readFileSync(join(root, `${name}.json`), "utf8")).result;
}

const TX = {
  quiet: {
    file: "transfer-quiet",
    signature:
      "qevR6dgHnmxw5HdwbGAyiDYD3zvc1CNjM3rF8ok7smZQ44oT5KCrfTcTrpJCrfAxiazMerQiVFsPTkMrukangYM",
  },
  open: {
    file: "swap-open-paths",
    signature:
      "5hQRwBPGYSxGXy9Axc1PJtPn2vPEFVkSrsQ5fmEeaxFFcXQGxcRwn9peaG7GbaHxoiPqoxfSNSbckxwj8nwdp8JQ",
  },
  act: {
    file: "act-now-approvals",
    signature:
      "524t8LW1PFWd4DLYDgvtKxCX6HmxLFy2Ho9YSGzuo9mX4iiGDhtBTejx7z7bK4C9RocL8hfeuKF1QaYMnK3itMVJ",
  },
} as const;

describe("summary field on tool results", () => {
  it("adds a spoken summary to check_scam results", () => {
    const scam = evaluateMessage("Send 1 SOL to this address and we will send 2 SOL back.");
    assert.equal(typeof scam.summary, "string");
    assert.ok(scam.summary.length > 0);
    assert.equal(scam.summary.includes("clearance") || /scam pattern/i.test(scam.summary), true);

    const clean = evaluateMessage("What is going on here? Can someone help me understand?");
    assert.match(clean.summary, /not a clearance/i);
  });

  it("adds a spoken summary to check_link results", () => {
    const official = evaluateLink("phantom.com");
    assert.match(official.summary, /official domain/i);
    const reported = evaluateLink("phanton.app");
    assert.match(reported.summary, /reported as phishing/i);
  });

  it("adds a spoken summary to tips and clean-up", () => {
    assert.ok(summarizeTip(safetyTip("links")).summary.length > 0);
    assert.match(summarizeCleanup(cleanUpSteps("wallet")).summary, /clean-up steps for your wallet/i);
  });
});

describe("explain_transaction summaries from saved RPC fixtures", () => {
  it("QUIET transfer mentions the on-chain amount and stays quiet", () => {
    const decoded = explainDecoded(TX.quiet.signature, loadRpc(TX.quiet.file));
    assert.equal(decoded.class_label, "QUIET");
    const summarized = summarizeExplain(decoded);
    assert.match(summarized.summary, /QUIET/i);
    assert.match(summarized.summary, /0\.1 SOL/);
    assert.equal(/safe|clearance to sign/i.test(summarized.summary), false);
  });

  it("OPEN PATHS swap names the class without inventing amounts", () => {
    const decoded = explainDecoded(TX.open.signature, loadRpc(TX.open.file));
    assert.equal(decoded.class_label, "OPEN PATHS");
    const summarized = summarizeExplain(decoded);
    assert.match(summarized.summary, /OPEN PATHS/i);
    assert.match(summarized.summary, /swap/i);
  });

  it("ACT NOW says an unknown program and two unlimited approvals, never a dollar loss", () => {
    const decoded = explainDecoded(TX.act.signature, loadRpc(TX.act.file));
    assert.equal(decoded.class_label, "ACT NOW");
    const summarized = summarizeExplain(decoded);
    assert.match(summarized.summary, /unknown program/i);
    assert.match(summarized.summary, /two unlimited approvals/i);
    assert.equal(/\$|dollar|loss|stolen|drained/i.test(summarized.summary), false);
    assert.equal(/\$|dollar|loss|stolen|drained/i.test(JSON.stringify(summarized)), false);
  });
});
