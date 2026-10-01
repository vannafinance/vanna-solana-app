const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadTs } = require("./load-ts.cjs");

const stubs = { "./config": { API_BASE_URL: "https://example.test" } };
const { parseAccountSnapshot } = loadTs("src/lib/solana/account-api.ts", stubs);
const { decodePriceUpdate } = loadTs("src/lib/solana/oracle-prices.ts", stubs);
const { valueHoldings, totalValue } = loadTs("src/lib/portfolio/value-holdings.ts", stubs);

const wire = {
  hasMarginAccount: true,
  marginAccountAddress: "GSPkK3pZG733J1ApZ38CdcNnGp2znuwu4y4yaWrLAXQS",
  totalCollateralValue: 17890.58924104608,
  grossCollateralValue: 17890.58924104608,
  totalBorrowedValue: 14295.1958286438,
  netAvailableCollateral: 3595.39341240228,
  collateralLeftBeforeLiquidation: 2165.873829537899,
  avgHealthFactor: 1.2515106092634325,
  borrowRate: 4.77,
};

test("snapshot converts USD figures to six-decimal units", () => {
  const snapshot = parseAccountSnapshot(wire);
  assert.equal(snapshot.collateral, 17_890_589_241n);
  assert.equal(snapshot.borrowed, 14_295_195_829n);
  assert.equal(snapshot.netAvailable, 3_595_393_412n);
  assert.equal(snapshot.address, wire.marginAccountAddress);
  assert.ok(Math.abs(snapshot.leverage - 17890.589 / 3595.393) < 1e-6);
});

test("health of 999 means no debt", () => {
  assert.equal(parseAccountSnapshot({ ...wire, avgHealthFactor: 999 }).health, null);
});

test("a wallet without a margin account is empty, not an error", () => {
  const snapshot = parseAccountSnapshot({ hasMarginAccount: false });
  assert.equal(snapshot.hasMarginAccount, false);
  assert.equal(snapshot.collateral, 0n);
});

test("negative net available is clamped and leverage stays defined", () => {
  const snapshot = parseAccountSnapshot({ ...wire, netAvailableCollateral: -50 });
  assert.equal(snapshot.netAvailable, 0n);
  assert.equal(snapshot.leverage, 1);
});

test("malformed payloads are rejected rather than read as zero", () => {
  assert.throws(() => parseAccountSnapshot(null), { kind: "invalid-response" });
  assert.throws(() => parseAccountSnapshot({ hasMarginAccount: true }), { kind: "invalid-response" });
  assert.throws(() => parseAccountSnapshot({ ...wire, totalBorrowedValue: "14295" }), { kind: "invalid-response" });
  assert.throws(() => parseAccountSnapshot({ ...wire, avgHealthFactor: NaN }), { kind: "invalid-response" });
});

test("price update decodes price and exponent and checks the feed", () => {
  const feed = "e6da44bff5b8b06897a3739dd331b440d6662595bb862e37046892c568ae3fc0";
  const data = new Uint8Array(134);
  data.set([0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd], 0);
  data.set(Uint8Array.from(feed.match(/../g), (byte) => parseInt(byte, 16)), 41);
  const view = new DataView(data.buffer);
  view.setBigInt64(73, 35727000000n, true);
  view.setInt32(89, -8, true);
  assert.equal(decodePriceUpdate(data, feed), 357.27);
  assert.equal(decodePriceUpdate(data, "00".repeat(32)), null);
  assert.equal(decodePriceUpdate(data.slice(0, 50), feed), null);
});

test("wallet value is the sum of priced holdings, largest first", () => {
  const valued = valueHoldings(
    [
      { symbol: "SOL", raw: 2_000_000_000n, decimals: 9 },
      { symbol: "USDC", raw: 6_958_434_764n, decimals: 6 },
    ],
    { SOL: 118_235_300n, USDC: 999_900n },
  );
  assert.equal(valued[0].symbol, "USDC");
  assert.equal(valued[1].value, 236_470_600n);
  assert.equal(totalValue(valued), valued[0].value + valued[1].value);
});

test("an unpriced holding makes the wallet value unavailable instead of understating it", () => {
  assert.throws(() => valueHoldings([{ symbol: "OPENAI", raw: 1n, decimals: 9 }], {}), { name: "MissingPriceError" });
});

const { parsePools } = loadTs("src/lib/solana/pools-api.ts", stubs);
const { readTokenAmount } = loadTs("src/lib/solana/earn-deposits.ts", { ...stubs, "./config": { ...stubs["./config"], VANNA_PROGRAM_ID: "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg" } });
const { valueDeposits, averageApyBps } = loadTs("src/lib/portfolio/value-deposits.ts", stubs);

const pool = (rate, apy) => ({ totalSupply: "1", totalBorrowed: "0", utilizationRate: "1", supplyAPY: apy, borrowAPY: "1", exchangeRate: rate });

test("pool exchange rate keeps nine decimals as an integer", () => {
  const pools = parsePools({ USDC: pool("1.0000007", "0.05"), SOL: pool("1", "0.08") });
  assert.equal(pools.USDC.exchangeRate, 1_000_000_700n);
  assert.equal(pools.SOL.exchangeRate, 1_000_000_000n);
  assert.throws(() => parsePools({ USDC: pool("abc", "0.05") }), { kind: "invalid-response" });
});

test("token account amount is read little-endian at offset 64", () => {
  const data = new Uint8Array(165);
  new DataView(data.buffer).setBigUint64(64, 2_500_000_000n, true);
  assert.equal(readTokenAmount(data), 2_500_000_000n);
  assert.throws(() => readTokenAmount(new Uint8Array(10)), { kind: "invalid-response" });
});

test("deposits are valued through the exchange rate and price, with a value-weighted APY", () => {
  const pools = parsePools({ USDC: pool("1.0000007", "0.05"), SOL: pool("1.0000062", "0.08") });
  const deposits = valueDeposits(
    [
      { symbol: "USDC", shares: 1_000_000_000n, decimals: 6 },
      { symbol: "SOL", shares: 1_000_000_000n, decimals: 9 },
    ],
    pools,
    { USDC: 1_000_000n, SOL: 100_000_000n },
  );
  assert.equal(deposits[0].symbol, "USDC");
  assert.equal(deposits[0].supplied, 1_000_000_700n);
  assert.equal(deposits[0].value, 1_000_000_700n);
  assert.equal(deposits[0].supplyApyBps, 5);
  assert.equal(deposits[1].value, 100_000_620n);
  assert.equal(averageApyBps([]), null);
  assert.ok(averageApyBps(deposits) > 5 && averageApyBps(deposits) < 8);
  assert.throws(() => valueDeposits([{ symbol: "OPENAI", shares: 1n, decimals: 9 }], pools, {}), { name: "MissingPriceError" });
});

const bs58 = require("bs58");
const { PublicKey } = require("@solana/web3.js");
const historyStubs = { "./config": { API_BASE_URL: "x", VANNA_PROGRAM_ID: "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg" } };
const { decodeEarnEvents } = loadTs("src/lib/solana/earn-history.ts", historyStubs);
const { netPrincipal, vaultEarnings, totalEarned } = loadTs("src/lib/portfolio/net-earnings.ts", stubs);
const { groupLenderHistory } = loadTs("src/lib/portfolio/lender-history.ts", stubs);
const { decodeBase58 } = loadTs("src/lib/solana/base58.ts", stubs);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const SUPPLY_DISC = [52, 247, 77, 250, 74, 122, 100, 33];

function supplyTx(amount, failed = false) {
  const data = new Uint8Array(24);
  data.set(SUPPLY_DISC, 0);
  new DataView(data.buffer).setBigUint64(8, amount, true);
  const accounts = Array.from({ length: 13 }, () => PublicKey.unique());
  accounts[4] = USDC_MINT;
  return {
    meta: { err: failed ? {} : null, preTokenBalances: [], postTokenBalances: [] },
    transaction: { message: { accountKeys: [], instructions: [{ programId: new PublicKey("BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg"), accounts, data: bs58.encode(data) }] } },
  };
}

test("base58 decoding matches the reference implementation", () => {
  const sample = Uint8Array.from([0, 0, 1, 2, 250, 255]);
  assert.deepEqual([...decodeBase58(bs58.encode(sample))], [...sample]);
  assert.equal(decodeBase58("0OIl"), null);
});

test("a supply instruction decodes to the asset and exact amount, using the signature time", () => {
  const [event] = decodeEarnEvents(supplyTx(2_500_000_000n), "sig1", 1_790_679_386);
  assert.equal(event.kind, "supply");
  assert.equal(event.symbol, "USDC");
  assert.equal(event.amount, 2_500_000_000n);
  assert.equal(event.timestamp, 1_790_679_386_000);
  assert.equal(decodeEarnEvents(supplyTx(1n, true), "sig2", 1).length, 0);
});

test("net principal drops an asset whose withdrawal size is unknown", () => {
  const events = [
    { kind: "supply", symbol: "SOL", amount: 9_990_000_000n, signature: "a", timestamp: 2 },
    { kind: "withdraw", symbol: "SOL", amount: null, signature: "b", timestamp: 3 },
    { kind: "supply", symbol: "USDC", amount: 1_000_000_000n, signature: "c", timestamp: 1 },
    { kind: "withdraw", symbol: "USDC", amount: 400_000_000n, signature: "d", timestamp: 4 },
  ];
  const principal = netPrincipal(events);
  assert.equal(principal.has("SOL"), false);
  assert.equal(principal.get("USDC"), 600_000_000n);
});

test("earnings are current underlying minus principal, valued at the unit price, never negative", () => {
  const events = [{ kind: "supply", symbol: "USDC", amount: 1_000_000_000n, signature: "a", timestamp: 1 }];
  const deposit = { symbol: "USDC", decimals: 6, supplied: 1_000_700_000n, value: 1_000_600_000n, supplyApyBps: 5 };
  const [entry] = vaultEarnings([deposit], events);
  assert.equal(entry.earned, 700_000n * 1_000_600_000n / 1_000_700_000n);
  assert.equal(totalEarned([entry]), entry.earned);
  assert.equal(vaultEarnings([{ ...deposit, supplied: 900_000_000n, value: 900_000_000n }], events)[0].earned, 0n);
  assert.equal(vaultEarnings([deposit], []).length, 0);
});

test("lender history groups by day and words supplies and withdrawals", () => {
  const now = new Date(2026, 9, 1, 12, 0, 0);
  const events = [
    { kind: "withdraw", symbol: "SOL", amount: null, signature: "b", timestamp: new Date(2026, 9, 1, 9).getTime() },
    { kind: "supply", symbol: "SOL", amount: 9_990_000_000n, signature: "a", timestamp: new Date(2026, 8, 25, 9).getTime() },
  ];
  const groups = groupLenderHistory(events, now);
  assert.equal(groups.map((group) => group.label).join(","), "Today,Sep 25");
  assert.equal(groups[0].items[0].title, "Withdrew SOL");
  assert.equal(groups[1].items[0].title, "Supplied 9.99 SOL");
});
