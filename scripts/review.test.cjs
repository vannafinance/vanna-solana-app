const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadTs } = require("./load-ts.cjs");

const stubs = { "@/lib/solana/config": { NETWORK_LABEL: "Solana mainnet fork", NETWORK_FEE_ESTIMATE: "about 0.000005 SOL" } };
const { buildEarnReview } = loadTs("src/lib/earn/review.ts", stubs, new Map());

const market = {
  symbol: "USDC",
  shareSymbol: "vUSDC",
  decimals: 6,
  priceUsd: 1_000_000n,
  supplyApyBps: 500,
};
const quote = { shares: 99_000_000n, suppliedAfter: 600_000_000n, projectedYearlyUsd: 30_000_000n };
const wallet = { name: "Main Wallet", address: "BvR8HTMVgVZMWfaA76K8LTeGmN58u2AgnxpHcGtCV5Nb" };

test("a supply review lists what leaves the wallet, what is received and the yield", () => {
  const review = buildEarnReview({ mode: "supply", market, quote, amount: 100_000_000n, wallet });
  assert.equal(review.title, "Review supply");
  assert.equal(review.legs[0].label, "You supply");
  assert.equal(review.legs[0].value, "100.00 USDC");
  assert.equal(review.legs[0].caption, "≈ $100.00");
  assert.equal(review.legs[1].label, "You receive");
  assert.equal(review.rows.find((row) => row.label === "Supply APY").value, "5.00%");
  assert.equal(review.confirmLabel, "Confirm supply");
  assert.equal(review.network, "Solana mainnet fork");
});

test("a withdrawal review shows the shares burned instead of received", () => {
  const review = buildEarnReview({ mode: "withdraw", market, quote, amount: 100_000_000n, wallet });
  assert.equal(review.title, "Review withdrawal");
  assert.equal(review.legs[0].label, "You withdraw");
  assert.equal(review.legs[1].label, "You burn");
  assert.equal(review.confirmLabel, "Confirm withdrawal");
});
