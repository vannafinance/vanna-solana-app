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

const { decodeSpotSwap } = loadTs("src/lib/solana/spot-swaps.ts", stubs);
const { toHistoryEntries, volumeSince } = loadTs("src/lib/swap/spot-swap-history.ts", stubs);

const WALLET = "2iyYKhNcD5fiPNphQQDq1KVqVVR3iXrwy6UFkYuhF98e";
const OPENAI_MINT = "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF";

function jupiterSwap({ solLamports, openaiRaw, fee = 5000 }) {
  return {
    signature: "sigSwap",
    blockTime: 1_790_000_000,
    tx: {
      meta: {
        err: null,
        fee,
        logMessages: ["Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]"],
        preBalances: [10_000_000_000],
        postBalances: [10_000_000_000 - solLamports - fee],
        preTokenBalances: [{ accountIndex: 3, mint: OPENAI_MINT, owner: WALLET, uiTokenAmount: { amount: "0", decimals: 9 } }],
        postTokenBalances: [{ accountIndex: 3, mint: OPENAI_MINT, owner: WALLET, uiTokenAmount: { amount: String(openaiRaw), decimals: 9 } }],
      },
      transaction: { message: { accountKeys: [{ pubkey: { toBase58: () => WALLET } }] } },
    },
  };
}

test("a Jupiter swap is read from token and lamport changes with the fee added back", () => {
  const swap = decodeSpotSwap(jupiterSwap({ solLamports: 18_744_465_367, openaiRaw: 923_256_828 }), WALLET);
  assert.equal(swap.from, "SOL");
  assert.equal(swap.to, "OPENAI");
  assert.equal(swap.amountIn, 18_744_465_367n);
  assert.equal(swap.amountOut, 923_256_828n);
  assert.equal(swap.timestamp, 1_790_000_000_000);
});

test("a transaction without Jupiter is not a swap", () => {
  const tx = jupiterSwap({ solLamports: 1_000_000_000, openaiRaw: 1 });
  tx.tx.meta.logMessages = ["Program 11111111111111111111111111111111 invoke [1]"];
  assert.equal(decodeSpotSwap(tx, WALLET), null);
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

const { toTransactionError, isStalePoolError, WALLET_MISMATCH } = loadTs("src/lib/solana/transaction-errors.ts", stubs);
const { TransactionFailedError, BlockhashExpiredError } = loadTs("src/lib/solana/send-transaction.ts", stubs);

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
