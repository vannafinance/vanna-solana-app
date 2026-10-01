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
