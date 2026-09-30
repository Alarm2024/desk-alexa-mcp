import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainDecoded, explainTransaction } from "../src/explain.js";
import { refusalFor } from "../src/refusals.js";

const SEED_12 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const SEED_24 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

const TRANSFER = {
  meta: { fee: 5000, innerInstructions: [], preBalances: [200000000, 0], postBalances: [99995000, 100000000] },
  transaction: {
    message: {
      accountKeys: ["7K6xWallet111111111111111111111111111111pgeQ", "FNgt9yZAWrorzhgdVWYyJBeSGknR4Xbja5k5B9RtXdq5"],
      instructions: [
        {
          programId: "11111111111111111111111111111111",
          parsed: {
            type: "transfer",
            info: { lamports: 100000000, destination: "FNgt9yZAWrorzhgdVWYyJBeSGknR4Xbja5k5B9RtXdq5" },
          },
        },
      ],
    },
  },
};

describe("explain_transaction", () => {
  it("decodes a public transfer with the Iris decoder", () => {
    const report = explainDecoded("5".repeat(88), TRANSFER);
    assert.equal(report.found, true);
    assert.equal(report.class, "A");
    assert.equal(report.class_label, "QUIET");
    assert.deepEqual(report.programs, ["System"]);
    assert.ok(report.findings.some((line) => line.includes("transfer 0.1 SOL")));
    assert.ok(report.changes.length > 0);
    assert.match(report.note, /AI-assisted analysis of public pages/);
  });

  it("reads a signature from a mocked public RPC response", async () => {
    const signature = "5".repeat(88);
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, result: TRANSFER });
    let called = 0;
    const report = await explainTransaction(signature, {
      rpcUrl: "https://api.mainnet-beta.solana.com",
      fetchImpl: async (url, init) => {
        called += 1;
        assert.equal(url, "https://api.mainnet-beta.solana.com");
        const payload = JSON.parse(String(init?.body));
        assert.equal(payload.method, "getTransaction");
        assert.equal(payload.params[0], signature);
        assert.equal(payload.params[1].encoding, "jsonParsed");
        return new Response(body, { status: 200 });
      },
    });
    assert.equal(called, 1);
    assert.equal(report.found, true);
    if (report.found) assert.equal(report.class, "A");
  });

  it("does not call the RPC for a seed phrase", async () => {
    let called = 0;
    const fetchImpl: typeof fetch = async () => {
      called += 1;
      return new Response("{}", { status: 200 });
    };
    const refusal = refusalFor(SEED_12);
    assert.equal(refusal?.reason, "seed_phrase");
    assert.equal(refusal?.warning.includes(SEED_12), false);
    const missed = await explainTransaction(SEED_12, { fetchImpl });
    assert.equal(missed.found, false);
    assert.equal(called, 0);
  });

  it("reports not found without treating it as a clearance", async () => {
    const signature = "3".repeat(88);
    const report = await explainTransaction(signature, {
      fetchImpl: async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: null }), { status: 200 }),
    });
    assert.equal(report.found, false);
    if (!report.found) assert.match(report.message, /Not found/);
  });
});

describe("refusals on explain input", () => {
  it("refuses a 24-word seed phrase", () => {
    const refusal = refusalFor(SEED_24);
    assert.equal(refusal?.reason, "seed_phrase");
    assert.equal(
      refusal?.warning,
      "Refused. That input looks like a 12- or 24-word seed phrase. This server did not send it to the Solana RPC, store it, or log it. The app you typed it into may keep a copy. If those are your real words, move your funds to a new wallet you create yourself. Anyone who asked for those words is trying to take the wallet.",
    );
  });

  it("refuses price or buy/sell advice", () => {
    assert.equal(refusalFor("Should I buy SOL right now?")?.reason, "price_advice");
    assert.equal(refusalFor("What is the price of this token?")?.reason, "price_advice");
    assert.equal(refusalFor("Would you recommend buying SOL today?")?.reason, "price_advice");
    assert.equal(refusalFor("Is now a good entry for BONK?")?.reason, "price_advice");
    assert.equal(refusalFor("trad" + "ing advice on this token")?.reason, "price_advice");
  });

  it("refuses wallet connect", () => {
    assert.equal(refusalFor("Please connect my wallet")?.reason, "wallet_connect");
    assert.equal(refusalFor("Use WalletConnect to sign this transaction")?.reason, "wallet_connect");
    assert.equal(refusalFor("Please link my Phantom account to this dapp.")?.reason, "wallet_connect");
    assert.equal(refusalFor("approve this transaction for me")?.reason, "wallet_connect");
  });
});
