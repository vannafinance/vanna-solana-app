const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadTs } = require("./load-ts.cjs");

const PROGRAM = "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg";
const config = { VANNA_PROGRAM_ID: PROGRAM, API_BASE_URL: "https://example.test", NETWORK_LABEL: "Solana mainnet fork", NETWORK_FEE_ESTIMATE: "fee" };
const stubs = { "./config": config, "@/lib/solana/config": config };
const cache = new Map();
const load = (file) => loadTs(file, stubs, cache);

const { decodeVaultReserve, decodeAssetLimits, decodeShareSupply } = load("src/lib/solana/vault-accounts.ts");
const { buildVaultAnalytics } = load("src/lib/earn/vault-analytics.ts");
const { buildVaultDetail } = load("src/lib/earn/vault-detail.ts");

function reserveData({ supplyCap = 0n, borrowCap = 0n, liquidity, borrowed, fees, base = 0, slope1 = 1000, slope2 = 6000, optimal = 8000, factor = 1000 }) {
  const data = Buffer.alloc(356);
  Buffer.from([43, 242, 204, 202, 26, 247, 59, 127]).copy(data, 0);
  data.writeBigUInt64LE(supplyCap, 136);
  data.writeBigUInt64LE(borrowCap, 144);
  data.writeBigUInt64LE(liquidity, 152);
  data.writeBigUInt64LE(borrowed, 160);
  data.writeBigUInt64LE(fees, 200);
  [base, slope1, slope2, optimal, factor].forEach((value, index) => data.writeUInt16LE(value, 216 + index * 2));
  return data;
}

function configData({ ltv, threshold, bonus, age = 3600, collateral = true, borrow = true }) {
  const data = Buffer.alloc(260);
  Buffer.from([57, 112, 247, 166, 247, 64, 140, 23]).copy(data, 0);
  data.writeUInt16LE(ltv, 144);
  data.writeUInt16LE(threshold, 146);
  data.writeUInt16LE(bonus, 148);
  data.writeUInt16LE(1000, 150);
  data.writeUInt32LE(age, 152);
  data[159] = collateral ? 1 : 0;
  data[160] = borrow ? 1 : 0;
  return data;
}

test("a reserve and its asset configuration are read at the program's field offsets", () => {
  const reserve = decodeVaultReserve(reserveData({ liquidity: 28_483_269_162n, borrowed: 26_517_098_346n, fees: 36_752n }));
  assert.equal(reserve.accountedLiquidity, 28_483_269_162n);
  assert.equal(reserve.totalBorrowAssets, 26_517_098_346n);
  assert.equal(reserve.accruedFees, 36_752n);
  assert.equal(reserve.supplyCap, 0n);
  assert.equal(reserve.slope1Bps, 1000);
  assert.equal(reserve.optimalBps, 8000);
  assert.equal(reserve.reserveFactorBps, 1000);

  const limits = decodeAssetLimits(configData({ ltv: 8000, threshold: 8500, bonus: 500 }));
  assert.equal(limits.ltvBps, 8000);
  assert.equal(limits.liquidationBonusBps, 500);
  assert.equal(limits.maxPriceAgeSeconds, 3600);
  assert.ok(limits.collateralEnabled && limits.borrowEnabled);

  const mint = Buffer.alloc(82);
  mint.writeBigUInt64LE(55_000_000_000n, 36);
  assert.equal(decodeShareSupply(mint), 55_000_000_000n);
  assert.throws(() => decodeVaultReserve(Buffer.alloc(10)), /Not a lending reserve/);
});

const pool = (overrides = {}) => ({ supplyApyPercent: 4.7, borrowApyPercent: 5.8, totalSupply: 54_963, totalBorrowed: 26_517, utilizationPercent: 50, exchangeRate: 1_000_000_700n, ...overrides });

test("the rate curve is drawn from the reserve's own parameters, with today's usage on it", () => {
  const reserve = decodeVaultReserve(reserveData({ liquidity: 1n, borrowed: 1n, fees: 0n }));
  const analytics = buildVaultAnalytics("usdc", { USDC: pool() }, { USDC: reserve });
  assert.equal(analytics.supplyApyBps, 470);
  assert.equal(analytics.borrowApyBps, 580);
  // 10% slope reached at the 80% kink; at 50% usage the borrow rate is 0.1 * 0.5 / 0.8
  assert.ok(Math.abs(analytics.curve.kink.borrow - 0.1) < 1e-9);
  assert.ok(Math.abs(analytics.curve.current.borrow - 0.0625) < 1e-9);
  assert.ok(Math.abs(analytics.curve.current.lender - 0.0625 * 0.5) < 1e-9);
  assert.equal(buildVaultAnalytics("nope", { USDC: pool() }, { USDC: reserve }), null);
});

const accounts = () => ({
  USDC: {
    reserve: decodeVaultReserve(reserveData({ liquidity: 28_483_269_162n, borrowed: 26_517_098_346n, fees: 36_752n })),
    limits: decodeAssetLimits(configData({ ltv: 8000, threshold: 8500, bonus: 500 })),
    shareSupply: 55_000_000_000n,
  },
});

test("a vault reads its totals, limits and addresses from the chain, and an absent cap means no cap", () => {
  const vault = buildVaultDetail({ id: "usdc", pools: { USDC: pool() }, prices: { USDC: 1_000_000n }, accounts: accounts(), deposit: undefined, events: [] });
  assert.equal(vault.supplied.raw, 28_483_269_162n + 26_517_098_346n - 36_752n);
  assert.equal(vault.availableLiquidity.raw, 28_483_269_162n - 36_752n);
  assert.equal(vault.supplyCap, null);
  assert.equal(vault.supplyCapUsageBps, null);
  assert.equal(vault.liquidationBonusBps, 500);
  assert.equal(vault.reserveFactorBps, 1000);
  assert.equal(vault.contracts.length, 5);
  assert.equal(vault.contracts[4].address, PROGRAM);
  assert.equal(vault.position, undefined);
  assert.equal(buildVaultDetail({ id: "usdc", pools: {}, prices: { USDC: 1n }, accounts: accounts(), deposit: undefined, events: [] }), null);
});

test("a position carries the interest earned on what was supplied, and none is claimed without that history", () => {
  const deposit = { symbol: "USDC", decimals: 6, shares: 100_000_000n, supplied: 100_000_700n, value: 100_000_700n, supplyApyBps: 470 };
  const supply = { kind: "supply", symbol: "USDC", amount: 100_000_000n, signature: "sig1", timestamp: 1_700_000_000_000 };
  const withUnknownWithdraw = { kind: "withdraw", symbol: "USDC", amount: null, signature: "sig2", timestamp: 1_700_000_100_000 };
  const input = { id: "usdc", pools: { USDC: pool() }, prices: { USDC: 1_000_000n }, accounts: accounts(), deposit };

  const earned = buildVaultDetail({ ...input, events: [supply] }).position;
  assert.equal(earned.earned.raw, 700n);
  assert.equal(earned.shares.raw, 100_000_000n);

  const unknown = buildVaultDetail({ ...input, events: [supply, withUnknownWithdraw] });
  assert.equal(unknown.position.earned, null);
  assert.equal(unknown.activity.length, 2);
  assert.equal(unknown.activity[1].amount, null);
});
