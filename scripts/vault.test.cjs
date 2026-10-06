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
  // Lenders get the borrow interest spread over the pool, less the 10% reserve fee.
  assert.ok(Math.abs(analytics.curve.current.lender - 0.0625 * 0.5 * 0.9) < 1e-9);
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

const { poolStatsFromChain, assetsMissingFrom } = load("src/lib/solana/chain-pools.ts");

test("the SKR pool read from its reserve matches the web app's /api/pools, with the reserve fee taken off supply", () => {
  // The SKR reserve on the fork: 7,300 SKR idle, 4,000 SKR borrowed, 11,300 vSKR.
  const reserve = decodeVaultReserve(reserveData({ liquidity: 7_300_000_000n, borrowed: 4_000_000_000n, fees: 0n }));
  const pool = poolStatsFromChain(reserve, 11_300_000_000n, 6);
  assert.equal(pool.totalSupply, 11_300);
  assert.equal(pool.totalBorrowed, 4_000);
  assert.equal(pool.utilizationPercent, 35.4);
  assert.equal(pool.borrowApyPercent, 4.42);
  // 4.42% x 35.4% = 1.56% before the 10% reserve fee; lenders get 1.41%.
  assert.equal(pool.supplyApyPercent, 1.41);
  assert.equal(pool.exchangeRate, 1_000_000_000n);
});

test("above the kink the borrow rate climbs on the steep slope, and fees are not supply", () => {
  const reserve = decodeVaultReserve(reserveData({ liquidity: 100_000_000n, borrowed: 900_000_000n, fees: 10_000_000n }));
  const pool = poolStatsFromChain(reserve, 900_000_000n, 6);
  assert.equal(pool.utilizationPercent, 90);
  // 10% at the 80% kink, plus half of the 60% slope.
  assert.equal(pool.borrowApyPercent, 40);
  assert.equal(pool.supplyApyPercent, 32.4);
  assert.equal(pool.totalSupply, 990);
  assert.equal(pool.exchangeRate, 1_100_000_000n);
});

test("only the assets the hosted API leaves out are read from the chain", () => {
  const hosted = { SOL: {}, USDC: {}, TSLAx: {}, GOOGLx: {}, AAPLx: {}, ANTHROPIC: {}, OPENAI: {} };
  assert.deepEqual(assetsMissingFrom(hosted).map((asset) => asset.symbol).join(","), "SKR");
  assert.equal(assetsMissingFrom({ ...hosted, SKR: {} }).length, 0);
});

const { parsePools } = load("src/lib/solana/pools-api.ts");

test("the web app's supply APY is worked out again without the reserve fee, and kept when the fee is not reported", () => {
  const row = { totalSupply: "455", totalBorrowed: "217", utilizationRate: "47.68", supplyAPY: "2.84", borrowAPY: "5.96", exchangeRate: "1.0001" };
  assert.equal(parsePools({ SOL: { ...row, reserveFactorBps: 1000 } }).SOL.supplyApyPercent, 2.56);
  assert.equal(parsePools({ SOL: row }).SOL.supplyApyPercent, 2.84);
});

test("Earn lists the pools you supplied first, then the rest by APY", () => {
  const { orderVaults } = load("src/lib/earn/build-vaults.ts");
  const vault = (symbol, supplyApyBps, usd) => ({ symbol, supplyApyBps, yourSupply: usd === undefined ? undefined : { amount: { raw: 1n, decimals: 6 }, usd } });
  // USDC and SOL were withdrawn to zero, SKR supplied: SKR leads despite the lowest APY.
  const ordered = orderVaults([vault("USDC", 677), vault("SOL", 287), vault("SKR", 80, 8_770_000n), vault("TSLAx", 1)]);
  assert.equal(ordered.map((v) => v.symbol).join(","), "SKR,USDC,SOL,TSLAx");
  const two = orderVaults([vault("USDC", 677, 1_000_000n), vault("SKR", 80, 9_000_000n)]);
  assert.equal(two.map((v) => v.symbol).join(","), "SKR,USDC");
});
