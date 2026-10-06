const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadTs } = require("./load-ts.cjs");

const stubs = { "./config": { API_BASE_URL: "https://example.test", VANNA_PROGRAM_ID: "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg" } };
const { parseAccountSnapshot } = loadTs("src/lib/solana/account-api.ts", stubs);
const { decodePriceUpdate } = loadTs("src/lib/solana/oracle-prices.ts", stubs);
const { valueHoldings, totalValue } = loadTs("src/lib/portfolio/value-holdings.ts", stubs);
const { staleMinutesOf } = loadTs("src/lib/portfolio/stale-minutes.ts", stubs);

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

test("an account with nothing borrowed has no health, even when the web app reports 0", () => {
  const empty = parseAccountSnapshot({ ...wire, totalBorrowedValue: 0, totalCollateralValue: 0, grossCollateralValue: 0, netAvailableCollateral: 0, avgHealthFactor: 0 });
  assert.equal(empty.hasMarginAccount, true);
  assert.equal(empty.health, null);
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

const historyStubs = { "./config": { API_BASE_URL: "x", VANNA_PROGRAM_ID: "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg" } };
const { earnEventsFromPayload } = loadTs("src/lib/solana/earn-history.ts", historyStubs);
const { netPrincipal, vaultEarnings, totalEarned } = loadTs("src/lib/portfolio/net-earnings.ts", stubs);
const { groupLenderHistory } = loadTs("src/lib/portfolio/lender-history.ts", stubs);

test("the web app's earn history rows become supply and withdraw events in base units, newest first", () => {
  const events = earnEventsFromPayload({
    source: "alchemy",
    rows: [
      { type: "supply", asset: "SOL", amount: "9.99", timestamp: 1_790_677_111_000, hash: "supplySig", status: "success" },
      { type: "withdraw", asset: "SOL", amount: "9.990000002", timestamp: 1_790_677_122_000, hash: "withdrawSig", status: "success" },
      { type: "supply", asset: "USDC", amount: "5", timestamp: 1, hash: "failedSig", status: "failed" },
      { type: "transfer", asset: "SOL", amount: "1", timestamp: 2, hash: "otherSig", status: "success" },
    ],
  });
  // A row the route marks failed is kept and marked, so history shows it; nothing counts it.
  assert.deepEqual(events.map((event) => event.signature), ["withdrawSig", "supplySig", "failedSig"]);
  assert.deepEqual(events.map((event) => event.status), ["succeeded", "succeeded", "failed"]);
  assert.equal(events[0].kind, "withdraw");
  assert.equal(events[0].amount, 9_990_000_002n);
  assert.equal(events[1].amount, 9_990_000_000n);
  assert.equal(events[1].timestamp, 1_790_677_111_000);
  assert.throws(() => earnEventsFromPayload({ error: "nope" }), { name: "ApiError" });
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

const { spotSwapsFromPayload } = loadTs("src/lib/solana/spot-swaps.ts", stubs);
const { toHistoryEntries, volumeSince } = loadTs("src/lib/swap/spot-swap-history.ts", stubs);

test("the web app's spot history rows become swaps in base units, ignoring digits an asset does not have", () => {
  const swaps = spotSwapsFromPayload({
    source: "alchemy",
    rows: [
      { type: "swap", assetIn: "SOL", assetOut: "OPENAI", amountIn: "18.744465367", amountOut: "0.9232568279999995", timestamp: 1_790_857_147_000, hash: "olderSig" },
      { type: "swap", assetIn: "SOL", assetOut: "USDC", amountIn: "78.514660587", amountOut: "9261.938901", timestamp: 1_790_887_367_000, hash: "newerSig" },
      { type: "swap", assetIn: "SOL", assetOut: "NOTATOKEN", amountIn: "1", amountOut: "1", timestamp: 3, hash: "unknownSig" },
    ],
  });
  assert.deepEqual(swaps.map((swap) => swap.signature), ["newerSig", "olderSig"]);
  assert.equal(swaps[0].from, "SOL");
  assert.equal(swaps[0].amountIn, 78_514_660_587n);
  assert.equal(swaps[0].decimalsIn, 9);
  assert.equal(swaps[0].amountOut, 9_261_938_901n);
  assert.equal(swaps[0].decimalsOut, 6);
  assert.equal(swaps[1].to, "OPENAI");
  assert.throws(() => spotSwapsFromPayload("not an object"), { name: "ApiError" });
});

test("swap volume values the sold token at the oracle price and counts only the last 30 days", () => {
  const swaps = [
    { signature: "a", timestamp: 9_999_999_000, from: "SOL", to: "USDC", amountIn: 2_000_000_000n, decimalsIn: 9, amountOut: 1n, decimalsOut: 6 },
    { signature: "b", timestamp: 1_000, from: "SOL", to: "USDC", amountIn: 5_000_000_000n, decimalsIn: 9, amountOut: 1n, decimalsOut: 6 },
  ];
  const entries = toHistoryEntries(swaps, { SOL: 100_000_000n });
  assert.equal(entries[0].valueUsd, 200_000_000n);
  assert.equal(volumeSince(entries, 10_000_000_000), 200_000_000n);
  const month = 30 * 24 * 60 * 60 * 1000;
  assert.equal(volumeSince(entries, 1_000 + month), 700_000_000n);
});

const { buildVaultSummaries, buildMarket } = loadTs("src/lib/earn/build-vaults.ts", stubs);
const { buildOverviewSeries } = loadTs("src/lib/earn/overview-series.ts", stubs);
const { groupEarnHistory } = loadTs("src/lib/earn/group-history.ts", stubs);

const livePools = parsePools({
  USDC: { totalSupply: "55000.040459", totalBorrowed: "3556.423539", utilizationRate: "6.47", supplyAPY: "0.05", borrowAPY: "0.81", exchangeRate: "1.0000007" },
  SOL: { totalSupply: "369.991919928", totalBorrowed: "28.631317665", utilizationRate: "7.74", supplyAPY: "0.08", borrowAPY: "0.97", exchangeRate: "1.0000062" },
});

test("vault summaries value pool totals at the oracle price and skip unpriced vaults", () => {
  const vaults = buildVaultSummaries(livePools, { USDC: 999_900n, SOL: 118_000_000n }, []);
  const usdc = vaults.find((vault) => vault.symbol === "USDC");
  assert.equal(usdc.supplyApyBps, 5);
  assert.equal(usdc.suppliedUsd, 54_994_540_454n);
  assert.equal(usdc.category, "Stablecoins");
  assert.equal(buildVaultSummaries(livePools, { USDC: 999_900n }, []).some((vault) => vault.symbol === "SOL"), false);
});

test("a market carries wallet balance, deposit and a six-decimal exchange rate", () => {
  const deposit = { symbol: "USDC", decimals: 6, supplied: 2_500_000_000n, value: 2_500_000_000n, supplyApyBps: 5 };
  const market = buildMarket("usdc", livePools, { USDC: 999_900n }, 3_120_400_000n, deposit);
  assert.equal(market.shareExchangeRate, 1_000_000n);
  assert.equal(market.walletBalance.raw, 3_120_400_000n);
  assert.equal(market.supplied.raw, 2_500_000_000n);
  assert.equal(buildMarket("usdc", livePools, {}, 0n, undefined), null);
  assert.equal(buildMarket("nope", livePools, { USDC: 1n }, 0n, undefined), null);
});

test("overview deposit series steps up at each supply and ends at the current value", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 100 * DAY;
  const events = [{ kind: "supply", symbol: "USDC", amount: 1_000_000_000n, signature: "a", timestamp: now - 10 * DAY }];
  const series = buildOverviewSeries(events, { USDC: 1_000_000n }, new Map([["USDC", 1_000_700_000n]]), "deposit", "1M", now, 1_000_700_000n);
  assert.equal(series.points[0].usd, 0n);
  assert.equal(series.points[series.points.length - 1].usd, 1_000_700_000n);
  assert.ok(series.points.some((point) => point.usd === 1_000_000_000n));
  const flat = buildOverviewSeries(events, { USDC: 1_000_000n }, new Map(), "earnings", "1M", now, 700_000n);
  assert.ok(flat.points.every((point) => point.usd === 700_000n));
});

test("earn history rows value known amounts at today's price and leave unknown ones empty", () => {
  const events = [
    { kind: "withdraw", symbol: "SOL", amount: null, signature: "b", timestamp: 2_000 },
    { kind: "supply", symbol: "SOL", amount: 2_000_000_000n, signature: "a", timestamp: 1_000 },
  ];
  const [group] = groupEarnHistory(events, { SOL: 100_000_000n }, 3_000);
  assert.equal(group.entries[0].amount, null);
  assert.equal(group.entries[0].usd, null);
  assert.equal(group.entries[1].usd, 200_000_000n);
});

test("an unknown-size withdrawal resets that asset to its current deposit, so the series does not spike", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 100 * DAY;
  const events = [
    { kind: "supply", symbol: "SOL", amount: 9_990_000_000n, signature: "a", timestamp: now - 20 * DAY },
    { kind: "withdraw", symbol: "SOL", amount: null, signature: "b", timestamp: now - 10 * DAY },
  ];
  const series = buildOverviewSeries(events, { SOL: 100_000_000n }, new Map(), "deposit", "1M", now, 0n);
  const afterWithdraw = series.points.filter((point) => point.at > now - 10 * DAY);
  assert.ok(afterWithdraw.every((point) => point.usd === 0n));
  assert.ok(series.points.some((point) => point.usd > 0n));
});

const { parseJupiterQuote } = loadTs("src/lib/solana/jupiter-quote.ts", stubs);

test("a Jupiter quote keeps integer amounts and converts price impact to basis points", () => {
  const quote = parseJupiterQuote({ outAmount: "70459485", otherAmountThreshold: "70107188", priceImpactPct: "0.0010831435098131170515079349" });
  assert.equal(quote.amountOut, 70_459_485n);
  assert.equal(quote.minReceived, 70_107_188n);
  assert.equal(quote.priceImpactBps, 11);
  assert.throws(() => parseJupiterQuote({ outAmount: 70459485, otherAmountThreshold: "1", priceImpactPct: "0" }), { kind: "invalid-response" });
  assert.throws(() => parseJupiterQuote(null), { kind: "invalid-response" });
});

const { deriveNotifications } = loadTs("src/lib/notifications/derive.ts", stubs);

test("notifications come from health, earn events and swaps, newest first, with unread by last seen", () => {
  const now = Date.UTC(2026, 9, 2, 12);
  const items = deriveNotifications({
    now,
    lastSeen: now - 3 * 60 * 60 * 1000,
    health: 1.25,
    hasMarginAccount: true,
    healthAcknowledged: false,
    earnEvents: [{ kind: "supply", symbol: "SOL", amount: 9_990_000_000n, signature: "a", timestamp: now - 5 * 24 * 60 * 60 * 1000 }],
    swaps: [{ signature: "s", timestamp: now - 60 * 60 * 1000, from: "SOL", to: "USDC", amountIn: 78_510_000_000n, decimalsIn: 9, amountOut: 9_261_940_000n, decimalsOut: 6 }],
  });
  assert.equal(items.map((item) => item.id).join(","), "account-health,s-swap,a-supply");
  assert.equal(items[0].badge, "warning");
  assert.equal(items[0].unread, true);
  assert.equal(items[1].title, "Swapped SOL for USDC");
  assert.equal(items[1].time, "1h");
  assert.equal(items[1].unread, true);
  assert.equal(items[2].unread, false);
  assert.equal(items[2].group, "earlier");
  assert.equal(items[2].title, "Supplied 9.99 SOL");
});

test("a healthy account and an acknowledged warning are not unread, and no margin account means no health item", () => {
  const base = { now: 1_000_000, lastSeen: 0, earnEvents: [], swaps: [] };
  assert.equal(deriveNotifications({ ...base, health: 2.4, hasMarginAccount: true, healthAcknowledged: false })[0].unread, false);
  assert.equal(deriveNotifications({ ...base, health: 1.2, hasMarginAccount: true, healthAcknowledged: true })[0].unread, false);
  assert.equal(deriveNotifications({ ...base, health: null, hasMarginAccount: false, healthAcknowledged: false }).length, 0);
});

const { buildMarkets } = loadTs("src/lib/perps/build-markets.ts", stubs);

test("perps markets come from pool rates, free liquidity and oracle prices, and need the USDC pool", () => {
  const pools = parsePools({
    USDC: { totalSupply: "55000", totalBorrowed: "3556", utilizationRate: "6", supplyAPY: "0.05", borrowAPY: "0.81", exchangeRate: "1" },
    TSLAx: { totalSupply: "110", totalBorrowed: "42", utilizationRate: "38", supplyAPY: "1.82", borrowAPY: "4.77", exchangeRate: "1" },
  });
  const [market, ...rest] = buildMarkets(pools, { TSLAx: 357_000_000n, USDC: 1_000_000n });
  assert.equal(rest.length, 0);
  assert.equal(market.symbol, "TSLAx");
  assert.equal(market.tokenBorrowBps, 477);
  assert.equal(market.usdcBorrowBps, 81);
  assert.equal(market.liquidityUsd, 68n * 357_000_000n);
  assert.equal(market.maxLeverage, 5);
  assert.equal(market.kind, "xStocks");
  assert.equal(buildMarkets({ TSLAx: pools.TSLAx }, { TSLAx: 357_000_000n }).length, 0);
  assert.equal(buildMarkets(pools, {}).length, 0);
});

const sharedModules = new Map();
const { toTransactionError, isStalePoolError, WALLET_MISMATCH } = loadTs("src/lib/solana/transaction-errors.ts", stubs, sharedModules);
const { TransactionFailedError, BlockhashExpiredError } = loadTs("src/lib/solana/send-transaction.ts", stubs, sharedModules);

test("wallet and chain failures map to the failure states the card shows", () => {
  const kind = (error) => toTransactionError(error).kind;
  assert.equal(kind(new Error("User declined the request: ERROR_NOT_SIGNED")), "rejected");
  assert.equal(kind(new Error("Local association cancelled by user")), "rejected");
  assert.equal(kind(new TransactionFailedError('{"InstructionError":[3,{"Custom":6001}]} Program JUP6 failed')), "price-moved");
  assert.equal(kind(new TransactionFailedError("custom program error: 0xbbd")), "price-moved");
  assert.equal(kind(new TransactionFailedError("Attempt to debit an account but found no record of a prior credit")), "no-fee");
  assert.equal(kind(new BlockhashExpiredError()), "expired");
  assert.equal(kind(new Error(WALLET_MISMATCH)), "network");
  assert.equal(kind(new Error("something unexpected")), "network");
});

test("only stale pool errors trigger a fresh quote retry", () => {
  assert.equal(isStalePoolError(new Error("custom program error: 0x1771")), true);
  assert.equal(isStalePoolError(new Error("User declined the request")), false);
});

test("the age of the data on screen is shown only when something was read before the failure", () => {
  assert.equal(staleMinutesOf(1_000_000, 1_000_000 + 5 * 60_000 + 30_000), 5);
  assert.equal(staleMinutesOf(1_000_000, 1_000_000), 0);
  // The first refresh failed: nothing was ever read, so no age is claimed (it used to read as about 29 million minutes).
  assert.equal(staleMinutesOf(0, 1_790_000_000_000), undefined);
});

// SKR is not carried by the hosted web app, whose history routes drop rows they cannot name; the app adds those itself.
const bs58 = require("bs58");
const { PublicKey: Key } = require("@solana/web3.js");
const { withDeviceSwaps, decodeSpotSwap } = loadTs("src/lib/solana/spot-swaps.ts", stubs);
const { withDeviceEarnEvents, decodeEarnEvents } = loadTs("src/lib/solana/earn-history.ts", stubs);
const { decodeBase58 } = loadTs("src/lib/solana/base58.ts", stubs);

const SWAP_WALLET = "9jTkWZ7eD1n2v4m5Qz8yHfC3aXbR6sLpUo1tKcGyoBHX";
const MINTS = { USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", SKR: "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3", TSLAx: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" };

function walletSwap({ signature, from, to, spent, received, decimals = { USDC: 6, SKR: 6, TSLAx: 8 } }) {
  const balance = (index, symbol, amount) => ({ accountIndex: index, mint: MINTS[symbol], owner: SWAP_WALLET, uiTokenAmount: { amount: String(amount), decimals: decimals[symbol] } });
  return {
    signature,
    blockTime: 1_791_000_000,
    status: "success",
    tx: {
      meta: {
        err: null,
        fee: 5000,
        logMessages: ["Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]"],
        preBalances: [1_000_000_000],
        postBalances: [1_000_000_000 - 5000],
        preTokenBalances: [balance(1, from, spent), balance(2, to, 0)],
        postTokenBalances: [balance(1, from, 0), balance(2, to, received)],
      },
      transaction: { message: { accountKeys: [{ pubkey: { toBase58: () => SWAP_WALLET } }], instructions: [{ programId: { toBase58: () => "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" } }] } },
    },
  };
}

test("an SKR swap the web route leaves out is read from the wallet's own transactions", () => {
  const skr = walletSwap({ signature: "sigSkr", from: "USDC", to: "SKR", spent: 10_000_000, received: 567_045_920 });
  const decoded = decodeSpotSwap(skr, SWAP_WALLET);
  assert.equal(decoded.from, "USDC");
  assert.equal(decoded.to, "SKR");
  assert.equal(decoded.amountIn, 10_000_000n);
  assert.equal(decoded.amountOut, 567_045_920n);

  const hosted = [{ signature: "sigTsla", timestamp: 1_790_000_000_000, from: "USDC", to: "TSLAx", amountIn: 1n, decimalsIn: 6, amountOut: 1n, decimalsOut: 8 }];
  const tsla = walletSwap({ signature: "sigTsla", from: "USDC", to: "TSLAx", spent: 1, received: 1 });
  const merged = withDeviceSwaps(hosted, [skr, tsla], SWAP_WALLET);
  assert.deepEqual(merged.map((swap) => swap.signature).join(","), "sigSkr,sigTsla");
});

test("swaps without SKR stay the web route's, and an SKR row it already lists is not repeated", () => {
  const usdcToTsla = walletSwap({ signature: "sigOther", from: "USDC", to: "TSLAx", spent: 5, received: 5 });
  assert.equal(withDeviceSwaps([], [usdcToTsla], SWAP_WALLET).length, 0);
  const skr = walletSwap({ signature: "sigSkr", from: "SKR", to: "USDC", spent: 1_000_000, received: 17_000 });
  const hosted = [{ ...decodeSpotSwap(skr, SWAP_WALLET) }];
  assert.equal(withDeviceSwaps(hosted, [skr], SWAP_WALLET).length, 1);
  assert.equal(withDeviceSwaps([], [{ ...skr, status: "failed" }], SWAP_WALLET).length, 0);
});

const SUPPLY_DISC = [52, 247, 77, 250, 74, 122, 100, 33];

function walletSupply(mint, amount, signature) {
  const data = new Uint8Array(24);
  data.set(SUPPLY_DISC, 0);
  new DataView(data.buffer).setBigUint64(8, amount, true);
  const accounts = Array.from({ length: 13 }, () => Key.unique());
  accounts[4] = new Key(mint);
  return {
    signature,
    blockTime: 1_791_000_100,
    status: "success",
    tx: {
      meta: { err: null, preTokenBalances: [], postTokenBalances: [] },
      transaction: { message: { accountKeys: [], instructions: [{ programId: new Key("BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg"), accounts, data: bs58.encode(data) }] } },
    },
  };
}

test("an SKR supply the web route leaves out joins Earn history; other assets stay the route's", () => {
  const skr = walletSupply(MINTS.SKR, 2_063_330_423n, "sigSupplySkr");
  const [event] = decodeEarnEvents(skr);
  assert.equal(event.kind, "supply");
  assert.equal(event.symbol, "SKR");
  assert.equal(event.amount, 2_063_330_423n);
  assert.equal(event.timestamp, 1_791_000_100_000);

  const usdc = walletSupply(MINTS.USDC, 5_000_000n, "sigSupplyUsdc");
  const merged = withDeviceEarnEvents([], [skr, usdc]);
  assert.deepEqual(merged.map((entry) => entry.signature).join(","), "sigSupplySkr");
  assert.equal(withDeviceEarnEvents([{ ...event }], [skr]).length, 1);
});

test("base58 decoding matches the reference implementation", () => {
  const sample = Uint8Array.from([0, 0, 1, 2, 250, 255]);
  assert.deepEqual([...decodeBase58(bs58.encode(sample))], [...sample]);
  assert.equal(decodeBase58("0OIl"), null);
});

const { withAppOnlyBalances } = loadTs("src/lib/solana/app-only-account.ts", stubs);
const USD6 = 1_000_000n;
const hostedAccount = (over = {}) => ({
  hasMarginAccount: true,
  address: "GSPkK3pZG733J1ApZ38CdcNnGp2znuwu4y4yaWrLAXQS",
  collateral: 1_000n * USD6,
  borrowed: 0n,
  netAvailable: 1_000n * USD6,
  roomBeforeLiquidation: 1_000n * USD6,
  health: null,
  leverage: 1,
  borrowRatePercent: 0,
  collateralBalances: { USDC: 1_000n * USD6 },
  borrowedBalances: {},
  ...over,
});
// SKR at $0.02 in six-decimal USD units; SKR itself has six decimals.
const SKR_PRICES = { SKR: 20_000n };

test("an SKR long counts its SKR collateral, which the web app's figures leave out", () => {
  // Borrowed $400 USDC and bought 20,000 SKR ($400): the web app sees the debt but not the SKR.
  const hosted = hostedAccount({ borrowed: 400n * USD6, netAvailable: 600n * USD6, roomBeforeLiquidation: 560n * USD6, health: 2.5, leverage: 1000 / 600, borrowedBalances: { USDC: 400n * USD6 } });
  const account = withAppOnlyBalances(hosted, { collateral: { SKR: 20_000n * USD6 }, debt: {} }, SKR_PRICES);
  assert.equal(account.collateral, 1_400n * USD6);
  assert.equal(account.borrowed, 400n * USD6);
  assert.equal(account.netAvailable, 1_000n * USD6);
  assert.equal(account.roomBeforeLiquidation, 960n * USD6);
  assert.equal(account.health, 3.5);
  assert.equal(account.leverage, 1.4);
  assert.equal(account.collateralBalances.SKR, 20_000n * USD6);
  assert.equal(account.collateralBalances.USDC, 1_000n * USD6);
});

test("an SKR short counts its SKR debt, so the account is not shown healthier than it is", () => {
  // Borrowed 10,000 SKR ($200) and sold it for $200 USDC, which the web app already counts as collateral.
  const hosted = hostedAccount({ collateral: 1_200n * USD6, netAvailable: 1_200n * USD6, roomBeforeLiquidation: 1_200n * USD6, collateralBalances: { USDC: 1_200n * USD6 } });
  const account = withAppOnlyBalances(hosted, { collateral: {}, debt: { SKR: 10_000n * USD6 } }, SKR_PRICES);
  assert.equal(account.borrowed, 200n * USD6);
  assert.equal(account.health, 6);
  assert.equal(account.netAvailable, 1_000n * USD6);
  assert.equal(account.roomBeforeLiquidation, 980n * USD6);
  assert.equal(account.borrowedBalances.SKR, 10_000n * USD6);
});

test("an account without SKR, or one whose SKR the web app already reports, is left as the web app gives it", () => {
  const plain = hostedAccount();
  assert.equal(withAppOnlyBalances(plain, { collateral: {}, debt: {} }, SKR_PRICES), plain);
  const reported = hostedAccount({ collateralBalances: { USDC: 1_000n * USD6, SKR: 5n * USD6 } });
  assert.equal(withAppOnlyBalances(reported, { collateral: { SKR: 5n * USD6 }, debt: {} }, SKR_PRICES), reported);
  const none = { ...plain, hasMarginAccount: false };
  assert.equal(withAppOnlyBalances(none, { collateral: { SKR: 1n }, debt: {} }, SKR_PRICES), none);
  assert.throws(() => withAppOnlyBalances(plain, { collateral: { SKR: 1n }, debt: {} }, {}));
});

const { decodeFailedSpotSwap } = loadTs("src/lib/solana/spot-swaps.ts", stubs);
const ROUTE_DISC = [229, 23, 203, 151, 122, 227, 173, 42];

// A Jupiter `route` swap of 10 USDC for SKR that landed but failed: no balance moved.
function failedRoute() {
  const data = new Uint8Array(8 + 4 + 19);
  data.set(ROUTE_DISC, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(data.length - 19, 10_000_000n, true);
  view.setBigUint64(data.length - 11, 567_000_000n, true);
  const sourceAccount = Key.unique();
  return {
    signature: "sigFailedSwap",
    blockTime: 1_791_000_200,
    status: "failed",
    tx: {
      meta: {
        err: { InstructionError: [3, { Custom: 6001 }] },
        logMessages: ["Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]", "Program log: Error: SlippageToleranceExceeded"],
        preTokenBalances: [{ accountIndex: 1, mint: MINTS.USDC, owner: SWAP_WALLET, uiTokenAmount: { amount: "10000000", decimals: 6 } }],
        postTokenBalances: [{ accountIndex: 1, mint: MINTS.USDC, owner: SWAP_WALLET, uiTokenAmount: { amount: "10000000", decimals: 6 } }],
      },
      transaction: {
        message: {
          accountKeys: [{ pubkey: new Key(SWAP_WALLET) }, { pubkey: sourceAccount }],
          instructions: [{ programId: new Key("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"), accounts: [Key.unique(), new Key(SWAP_WALLET), sourceAccount, Key.unique(), Key.unique(), new Key(MINTS.SKR)], data: bs58.encode(data) }],
        },
      },
    },
  };
}

test("a failed swap is listed with what it tried, and is not counted in the volume", () => {
  const swap = decodeFailedSpotSwap(failedRoute());
  assert.equal(swap.status, "failed");
  assert.equal(swap.from, "USDC");
  assert.equal(swap.to, "SKR");
  assert.equal(swap.amountIn, 10_000_000n);
  assert.equal(swap.amountOut, 567_000_000n);
  assert.equal(withDeviceSwaps([], [failedRoute()], SWAP_WALLET).length, 1);
  const entries = toHistoryEntries([swap], { USDC: 1_000_000n });
  assert.equal(entries[0].failed, true);
  assert.equal(volumeSince(entries, 1_791_000_300_000), 0n);
});

test("a failed supply is listed but adds nothing to the principal", () => {
  const failed = { ...walletSupply(MINTS.USDC, 5_000_000n, "sigFailedSupply"), status: "failed" };
  failed.tx.meta.err = { InstructionError: [0, { Custom: 1 }] };
  const [event] = decodeEarnEvents(failed);
  assert.equal(event.status, "failed");
  assert.equal(event.amount, 5_000_000n);
  const listed = withDeviceEarnEvents([], [failed]);
  assert.equal(listed.length, 1);
  assert.equal(netPrincipal(listed).get("USDC"), undefined);
});

test("a Margin trade close the web route lists as a wallet swap is dropped; it runs Jupiter from inside the Vanna program", () => {
  const close = walletSwap({ signature: "sigClose", from: "USDC", to: "TSLAx", spent: 1, received: 113_577_410 });
  close.tx.transaction.message.instructions = [{ programId: { toBase58: () => "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg" } }];
  const misread = { signature: "sigClose", timestamp: 1, from: "SOL", to: "USDC", amountIn: 140_000n, decimalsIn: 9, amountOut: 113_577_410n, decimalsOut: 6, status: "succeeded", reason: null };
  const older = { ...misread, signature: "sigOlder" };
  const listed = withDeviceSwaps([misread, older], [close], SWAP_WALLET);
  // The close is gone; a row older than the wallet's own history is kept as reported.
  assert.deepEqual(listed.map((swap) => swap.signature).join(","), "sigOlder");
  assert.equal(decodeSpotSwap(close, SWAP_WALLET), null);
});
