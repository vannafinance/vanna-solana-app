const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { loadTs } = require("./load-ts.cjs");

const PROGRAM = "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg";
const stubs = { "./config": { VANNA_PROGRAM_ID: PROGRAM, API_BASE_URL: "https://example.test" } };
const cache = new Map();
const load = (file) => loadTs(file, stubs, cache);

const { decodeKaminoReserveStats, kaminoReceiptValue, kaminoReserveOf } = load("src/lib/solana/kamino.ts");
const { assetsToDebtSharesUp, ceilDiv, decodeDebtShares, decodeReserveDebt, projectReserveDebt } = load("src/lib/solana/reserve-debt.ts");
const { decodeLitePosition, resolveLitePosition } = load("src/lib/solana/lite-position.ts");
const { liteReduceRedeemInstruction, liteReduceRepayInstruction, liteSupplyInstruction } = load("src/lib/solana/lite-instructions.ts");
const { assets } = load("src/lib/solana/assets.ts");
const { litePositionAddress, marginAddress, TOKEN_PROGRAM } = load("src/lib/solana/program-accounts.ts");

const RESERVE_DISCRIMINATOR = [43, 242, 204, 202, 26, 247, 59, 127];
const asset = (symbol) => assets.find((candidate) => candidate.symbol === symbol);
const mintOf = (symbol) => new PublicKey(asset(symbol).mint);

function kaminoReserve({ available, borrowed, curve, takeRate }) {
  const data = Buffer.alloc(5100);
  Buffer.from(RESERVE_DISCRIMINATOR).copy(data, 0);
  data.writeBigUInt64LE(available, 224);
  const fraction = borrowed << 60n;
  data.writeBigUInt64LE(fraction & ((1n << 64n) - 1n), 232);
  data.writeBigUInt64LE(fraction >> 64n, 240);
  data[4870] = takeRate;
  curve.forEach(([utilization, rate], index) => {
    data.writeUInt32LE(utilization, 4920 + index * 8);
    data.writeUInt32LE(rate, 4920 + index * 8 + 4);
  });
  return data;
}

const linearCurve = Array.from({ length: 11 }, (_, index) => [index * 1000, index * 1000]);

test("kamino reserve stats interpolate the borrow curve and net out the protocol take rate", () => {
  const stats = decodeKaminoReserveStats(kaminoReserve({ available: 100n, borrowed: 100n, curve: linearCurve, takeRate: 10 }));
  assert.equal(stats.utilizationBps, 5000);
  assert.equal(stats.borrowApyBps, 5000);
  // 5000 bps borrow rate * 50% utilisation * (100 - 10)% take rate
  assert.equal(stats.supplyApyBps, 2250);
  assert.equal(stats.totalSupplied, 200n);
});

test("a reserve that is not a monotonic rate curve yields no figures", () => {
  const broken = linearCurve.map(([utilization, rate], index) => (index === 4 ? [100, rate] : [utilization, rate]));
  assert.equal(decodeKaminoReserveStats(kaminoReserve({ available: 100n, borrowed: 100n, curve: broken, takeRate: 10 })), null);
  assert.equal(decodeKaminoReserveStats(Buffer.alloc(10)), null);
});

test("receipt tokens redeem for their share of the reserve's liquidity", () => {
  const data = Buffer.alloc(2700);
  Buffer.from(RESERVE_DISCRIMINATOR).copy(data, 0);
  mintOf("USDC").toBuffer().copy(data, 128);
  kaminoReserveOf("USDC").collateralMint.toBuffer().copy(data, 2560);
  data.writeBigUInt64LE(1000n, 224);
  data.writeBigUInt64LE(500n, 2592);
  assert.equal(kaminoReceiptValue(data, mintOf("USDC"), "USDC", 250n), 500n);
  assert.throws(() => kaminoReceiptValue(data, mintOf("SOL"), "USDC", 250n), /Invalid Kamino reserve layout/);
});

function vannaReserve({ liquidity, borrowed, shares, last, base, slope1, slope2, optimal }) {
  const data = Buffer.alloc(356);
  Buffer.from(RESERVE_DISCRIMINATOR).copy(data, 0);
  data.writeBigUInt64LE(liquidity, 152);
  data.writeBigUInt64LE(borrowed, 160);
  data.writeBigUInt64LE(shares, 168);
  data.writeBigInt64LE(last, 208);
  [base, slope1, slope2, optimal].forEach((value, index) => data.writeUInt16LE(value, 216 + index * 2));
  return data;
}

test("reserve debt accrues interest over the elapsed time at the utilisation-based rate", () => {
  const reserve = decodeReserveDebt(vannaReserve({ liquidity: 1_000_000n, borrowed: 1_000_000n, shares: 1_000_000n, last: 0n, base: 100, slope1: 400, slope2: 6000, optimal: 8000 }));
  const { totalDebt, rateBps } = projectReserveDebt(reserve, 31_536_000n);
  // 50% utilisation: 100 + 400 * 5000 / 8000 = 350 bps, for one year
  assert.equal(rateBps, 350n);
  assert.equal(totalDebt, 1_035_000n);
  assert.equal(projectReserveDebt(reserve, 0n).totalDebt, 1_000_000n);
});

test("debt shares round up and start one to one", () => {
  assert.equal(assetsToDebtSharesUp(1000n, 1_000_000n, 1_035_000n), 967n);
  assert.equal(assetsToDebtSharesUp(1000n, 0n, 0n), 1000n);
  assert.equal(ceilDiv(0n, 7n), 0n);
  assert.equal(ceilDiv(8n, 7n), 2n);
});

test("a debt position's shares are read after its two keys", () => {
  const data = Buffer.alloc(137);
  Buffer.from([234, 251, 104, 142, 74, 57, 146, 84]).copy(data, 0);
  data.writeBigUInt64LE(42n, 72);
  assert.equal(decodeDebtShares(data), 42n);
});

function litePosition({ mint, attributed, shares = 0n }) {
  const data = Buffer.alloc(193);
  Buffer.from([141, 145, 27, 4, 142, 122, 126, 174]).copy(data, 0);
  mint.toBuffer().copy(data, 72);
  data.writeBigUInt64LE(11n, 104);
  data.writeBigUInt64LE(22n, 112);
  data.writeBigUInt64LE(33n, 120);
  if (attributed) {
    data.writeBigUInt64LE(shares, 129);
    data[129 + 16] = 1;
  }
  return data;
}

test("a position carries its receipts, cost basis and the debt shares attributed to it", () => {
  const address = Keypair.generate().publicKey;
  const position = decodeLitePosition(address, litePosition({ mint: mintOf("USDC"), attributed: true, shares: 99n }));
  assert.equal(position.receipts, 11n);
  assert.equal(position.deposited, 22n);
  assert.equal(position.equity, 33n);
  assert.equal(position.trackedShares, 99n);
  assert.equal(decodeLitePosition(address, litePosition({ mint: mintOf("USDC"), attributed: false })).trackedShares, null);
  assert.throws(() => decodeLitePosition(address, Buffer.alloc(193)), /Not a Kamino position/);
});

test("the first Kamino position takes the unindexed address and an asset keeps the position it has", async () => {
  const margin = marginAddress(Keypair.generate().publicKey);
  const usdc = mintOf("USDC");
  const none = { getAccountInfo: async () => null };
  const holdingUsdc = { getAccountInfo: async () => ({ data: litePosition({ mint: usdc, attributed: true }) }) };

  assert.equal((await resolveLitePosition(none, margin, usdc, 1, [])).toBase58(), litePositionAddress(margin).toBase58());
  assert.equal((await resolveLitePosition(none, margin, usdc, 1, [1])).toBase58(), litePositionAddress(margin, 1).toBase58());
  assert.equal((await resolveLitePosition(holdingUsdc, margin, usdc, 1, [])).toBase58(), litePositionAddress(margin).toBase58());
  assert.equal((await resolveLitePosition(holdingUsdc, margin, mintOf("SOL"), 2, [])).toBase58(), litePositionAddress(margin, 2).toBase58());
  await assert.rejects(resolveLitePosition(holdingUsdc, margin, usdc, 1, [1]), /already has a Kamino position/);
});

test("the Kamino instructions carry the argument and account counts of the deployed program", () => {
  const owner = Keypair.generate().publicKey;
  const litePositionKey = litePositionAddress(marginAddress(owner));
  const call = { owner, asset: asset("USDC"), litePosition: litePositionKey };

  const supply = liteSupplyInstruction({ ...call, amount: 5n, attributeSharesDelta: 7n });
  assert.equal(supply.data.length, 8 + 8 + 16);
  assert.equal(supply.keys.length, 22);
  assert.ok(supply.keys[0].isSigner && supply.keys[0].isWritable);
  assert.equal(supply.data.readBigUInt64LE(8), 5n);
  assert.equal(supply.data.readBigUInt64LE(16), 7n);

  const redeem = liteReduceRedeemInstruction({ ...call, exitBps: 5000, minUnderlyingOut: 0n });
  assert.equal(redeem.data.length, 8 + 2 + 8);
  assert.equal(redeem.data.readUInt16LE(8), 5000);
  assert.equal(redeem.keys.length, 22);

  const userTokenAccount = Keypair.generate().publicKey;
  const extra = { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false };
  const repay = liteReduceRepayInstruction({ ...call, exitBps: 10000, userTokenAccount, remaining: [extra] });
  assert.equal(repay.data.length, 8 + 2);
  assert.equal(repay.keys.length, 18 + 1);
  assert.equal(repay.keys[7].pubkey.toBase58(), userTokenAccount.toBase58());
  assert.equal(repay.keys[repay.keys.length - 1].pubkey.toBase58(), extra.pubkey.toBase58());
  assert.equal(TOKEN_PROGRAM.toBase58(), supply.keys[19].pubkey.toBase58());
});

const { deriveFarm } = load("src/lib/farm/derive-farm.ts");
const { composePositions, unplacedPositions } = load("src/lib/farm/compose-positions.ts");
const { closeQuote, toPositionView } = load("src/lib/farm/position-math.ts");

const amount = (raw, decimals) => ({ raw, decimals });
const leg = (asset, raw, decimals) => ({ asset, amount: amount(raw, decimals) });
const farmTx = (signature, at, chips) => ({ signature, at, strategy: "farm", title: null, stock: null, chips });
const open = (signature, at, stock, deposit, borrow) =>
  farmTx(signature, at, [
    { type: "deposit", leg: leg(stock, deposit, 8) },
    { type: "deposit", leg: leg("USDC", borrow, 6) },
    { type: "borrow", leg: leg("USDC", borrow, 6) },
  ]);
const exit = (signature, at, repaid, kept = 0n) => farmTx(signature, at, [{ type: "repay", leg: leg("USDC", repaid, 6) }, ...(kept > 0n ? [{ type: "withdraw", leg: leg("USDC", kept, 6) }] : [])]);
const returnStock = (signature, at, stock, raw) => farmTx(signature, at, [{ type: "withdraw", leg: leg(stock, raw, 8) }]);

test("a stock's deposit and the borrow made with it are what its position was opened with", () => {
  const derived = deriveFarm([open("b", 20, "TSLAx", 100n, 400n), open("a", 10, "TSLAx", 200n, 700n)]);
  assert.equal(derived.attributions.length, 1);
  assert.equal(derived.attributions[0].collateral.raw, 300n);
  assert.equal(derived.attributions[0].borrowed.raw, 1100n);
  assert.equal(derived.entries.length, 2);
});

test("returning the stock to the wallet closes its position and a later open starts afresh", () => {
  const derived = deriveFarm([
    open("d", 40, "TSLAx", 50n, 90n),
    returnStock("c", 30, "TSLAx", 200n),
    exit("b", 20, 700n, 12n),
    open("a", 10, "TSLAx", 200n, 700n),
  ]);
  assert.equal(derived.closedCount, 1);
  assert.equal(derived.attributions.length, 1);
  assert.equal(derived.attributions[0].collateral.raw, 50n);
  assert.equal(derived.yieldKept[0].raw, 12n);
  const exitEntry = derived.entries.find((entry) => entry.signature === "b");
  assert.equal(exitEntry.collateralSymbol, "TSLAx");
  assert.equal(exitEntry.actions.map((item) => `${item.kind}:${item.amount.raw}`).join(","), "redeem:712,repay:700");
});

const plainTx = (signature, at, strategy, chips) => ({ signature, at, strategy, title: null, stock: null, chips });
const depositOnly = (signature, at, stock, raw) => plainTx(signature, at, "unclassified", [{ type: "deposit", leg: leg(stock, raw, 8) }]);
const borrowOnly = (signature, at, asset, raw, decimals) => plainTx(signature, at, "unclassified", [{ type: "borrow", leg: leg(asset, raw, decimals) }]);
const supplyOnly = (signature, at, asset, raw, decimals) => farmTx(signature, at, [{ type: "deposit", leg: leg(asset, raw, decimals) }]);

test("a deploy sent as a deposit and then a borrow with the supply still opens one position", () => {
  const derived = deriveFarm([
    farmTx("supply", 102, [{ type: "deposit", leg: leg("USDC", 741_000_000n, 6) }, { type: "borrow", leg: leg("USDC", 741_000_000n, 6) }]),
    depositOnly("deposit", 101, "TSLAx", 200_000_000n),
  ]);
  assert.equal(derived.attributions.length, 1);
  assert.equal(derived.attributions[0].stock, "TSLAx");
  assert.equal(derived.attributions[0].collateral.raw, 200_000_000n);
  assert.equal(derived.attributions[0].borrowed.raw, 741_000_000n);
  assert.equal(derived.entries[0].actions.map((item) => item.kind).join(","), "deposit,borrow,supply");
});

test("a deploy sent as a deposit, a borrow and a supply still opens one position", () => {
  const derived = deriveFarm([
    supplyOnly("supply", 103, "SOL", 31_000_000_000n, 9),
    borrowOnly("borrow", 102, "SOL", 31_000_000_000n, 9),
    depositOnly("deposit", 101, "TSLAx", 100_000_000n),
  ]);
  assert.equal(derived.attributions.length, 1);
  assert.equal(derived.attributions[0].stock, "TSLAx");
  assert.equal(derived.attributions[0].pool, "SOL");
  assert.equal(derived.attributions[0].borrowed.raw, 31_000_000_000n);
});

test("a deploy sent as the deposit and borrow together, then the supply, still opens one position", () => {
  const derived = deriveFarm([
    supplyOnly("supply", 102, "USDC", 742_750_000n, 6),
    plainTx("deposit-borrow", 101, "unclassified", [{ type: "deposit", leg: leg("TSLAx", 200_000_000n, 8) }, { type: "borrow", leg: leg("USDC", 742_750_000n, 6) }]),
  ]);
  assert.equal(derived.attributions.length, 1);
  assert.equal(derived.attributions[0].stock, "TSLAx");
  assert.equal(derived.attributions[0].pool, "USDC");
  assert.equal(derived.attributions[0].borrowed.raw, 742_750_000n);
});

test("a stock deposit long before a supply is not taken for part of it", () => {
  const derived = deriveFarm([
    farmTx("supply", 5_000, [{ type: "deposit", leg: leg("USDC", 100n, 6) }, { type: "borrow", leg: leg("USDC", 100n, 6) }]),
    depositOnly("deposit", 100, "TSLAx", 200_000_000n),
  ]);
  assert.equal(derived.attributions.length, 0);
});

test("a failed deploy is listed as failed with its reason and opens nothing", () => {
  const failedDeploy = open("f", 15, "TSLAx", 100n, 400n);
  const derived = deriveFarm([open("a", 20, "TSLAx", 100n, 400n), failedDeploy], new Map([["f", "Price moved"]]));
  assert.equal(derived.attributions.length, 1);
  assert.equal(derived.attributions[0].collateral.raw, 100n);
  assert.equal(derived.entries.length, 2);
  const failed = derived.entries.find((entry) => entry.signature === "f");
  assert.equal(failed.status, "failed");
  assert.equal(failed.reason, "Price moved");
  assert.equal(failed.event, "deploy");
  assert.equal(derived.entries.find((entry) => entry.signature === "a").status, "succeeded");
});

test("a failed perps order is not part of Farm", () => {
  const swap = { type: "swap", from: leg("USDC", 1n, 6), to: leg("TSLAx", 1n, 8) };
  const perps = { signature: "p", at: 5, strategy: "perps", title: null, stock: "TSLAx", chips: [{ type: "deposit", leg: leg("TSLAx", 9n, 8) }, { type: "borrow", leg: leg("USDC", 1n, 6) }, swap] };
  assert.equal(deriveFarm([perps], new Map([["p", null]])).entries.length, 0);
});

test("activity from perps is not part of Farm", () => {
  const perps = { signature: "p", at: 5, strategy: "perps", title: null, stock: "TSLAx", chips: [{ type: "deposit", leg: leg("TSLAx", 9n, 8) }] };
  assert.equal(deriveFarm([perps]).entries.length, 0);
});

const prices = { USDC: 999_955n, SOL: 150_000_000n, TSLAx: 372_140_000n, GOOGLx: 340_000_000n };
const attribution = (stock, collateral, borrowed) => ({ stock, pool: "USDC", collateral: amount(collateral, 8), borrowed: amount(borrowed, 6), openedAt: 1_700_000_000 });

test("a position reads its debt, supply and rates from the chain and its stock from history", () => {
  const live = [{ pool: "USDC", supplied: 699_999_999n, debt: 700_000_010n, borrowRateBps: 602 }];
  const [position] = composePositions(live, [attribution("TSLAx", 200_000_000n, 700_000_000n)], prices, { USDC: 498, SOL: null });
  assert.equal(position.id, "farm-tslax-usdc");
  assert.equal(position.principal.raw, 700_000_000n);
  assert.equal(position.interest.raw, 10n);
  assert.equal(position.supplyApyBps, 498);
  assert.equal(position.borrowApyBps, 602);
  assert.equal(position.poolShareBps, 10_000);
  assert.equal(position.leverage, 1.9);
});

test("two stocks sharing a pool split its supply and debt by what each borrowed", () => {
  const live = [{ pool: "USDC", supplied: 1_000_000_000n, debt: 1_000_000_000n, borrowRateBps: 600 }];
  const positions = composePositions(live, [attribution("TSLAx", 1n, 700_000_000n), attribution("GOOGLx", 1n, 300_000_000n)], prices, { USDC: 500, SOL: null });
  assert.deepEqual(positions.map((position) => position.poolShareBps), [7000, 3000]);
  assert.equal(positions[0].supplied.raw, 700_000_000n);
  assert.equal(positions[1].principal.raw, 300_000_000n);
});

test("a position that history cannot place, or that has no price, is left out", () => {
  const live = [{ pool: "USDC", supplied: 1n, debt: 1n, borrowRateBps: 1 }];
  assert.equal(composePositions(live, [], prices, { USDC: 1, SOL: null }).length, 0);
  assert.equal(composePositions(live, [attribution("OPENAI", 1n, 1n)], prices, { USDC: 1, SOL: null }).length, 0);
});

test("closing returns the stock only for the whole position and never repays more than was redeemed", () => {
  const live = [{ pool: "USDC", supplied: 699_999_999n, debt: 700_000_010n, borrowRateBps: 602 }];
  const [position] = composePositions(live, [attribution("TSLAx", 200_000_000n, 700_000_000n)], prices, { USDC: 498, SOL: null });
  const half = closeQuote(position, 5000);
  assert.equal(half.collateralReturned.raw, 0n);
  assert.ok(half.leftover.raw >= 0n);
  assert.ok(half.healthAfter > toPositionView(position).healthFactor);
  const whole = closeQuote(position, 10000);
  assert.equal(whole.collateralReturned.raw, 200_000_000n);
  assert.equal(whole.healthAfter, null);
});

const { withoutFarm } = load("src/lib/perps/without-farm.ts");
const { toPortfolioFarmPosition } = load("src/lib/farm/portfolio-position.ts");

test("farm amounts are taken out of the margin balances before perps positions are read", () => {
  const farm = [
    {
      collateralSymbol: "TSLAx",
      poolSymbol: "USDC",
      collateral: amount(200_000_000n, 8),
      principal: amount(600_000_000n, 6),
      interest: amount(5_000_000n, 6),
    },
  ];
  const { collateral, debt } = withoutFarm({ collateral: { TSLAx: 500_000_000n }, debt: { USDC: 1_000_000_000n } }, farm);
  assert.equal(collateral.TSLAx, 300_000_000n);
  assert.equal(debt.USDC, 395_000_000n);
  assert.equal(withoutFarm({ collateral: { TSLAx: 100_000_000n }, debt: {} }, farm).collateral.TSLAx, 0n);
});

test("a farm position is listed on Home with its health, debt and the price that would liquidate it", () => {
  const live = [{ pool: "USDC", supplied: 700_000_000n, debt: 700_000_010n, borrowRateBps: 602 }];
  const [position] = composePositions(live, [attribution("TSLAx", 200_000_000n, 700_000_000n)], prices, { USDC: 498, SOL: null });
  const listed = toPortfolioFarmPosition(position);
  assert.equal(listed.kind, "farm");
  assert.equal(listed.pool, "USDC");
  assert.equal(listed.venue, "Kamino");
  assert.ok(listed.health > 2 && listed.health < 2.2);
  // Kamino's supply alone covers 100% of the debt, so only the extra 10% must come from the stock: 70 USD over 2 TSLAx.
  assert.ok(listed.liquidationPrice > 34_000_000n && listed.liquidationPrice < 36_000_000n);
  assert.ok(listed.liquidationAwayBps > 9000);
});

test("a Kamino position with no stock history is reported with its real amounts", () => {
  const live = [
    { pool: "USDC", supplied: 700n, debt: 650n, borrowRateBps: 600 },
    { pool: "SOL", supplied: 5n, debt: 4n, borrowRateBps: 300 },
  ];
  const unplaced = unplacedPositions(live, [attribution("TSLAx", 1n, 1n)], { USDC: 6, SOL: 9 });
  assert.equal(unplaced.length, 1);
  assert.equal(unplaced[0].pool, "SOL");
  assert.equal(unplaced[0].supplied.raw, 5n);
  assert.equal(unplaced[0].supplied.decimals, 9);
  assert.equal(unplaced[0].debt.raw, 4n);
});

const { buildDeployForm } = load("src/lib/farm/deploy-form.ts");

function deployInput({ borrowable, amountText, leverage }) {
  const pool = { symbol: "USDC", market: "Kamino Main Market", decimals: 6, priceUsd: 1_000_000n, supplyApyBps: 498, borrowApyBps: 659, available: 0n, borrowable, totalSupplied: 0n, utilizationBps: 0 };
  const collateral = { symbol: "TSLAx", decimals: 8, priceUsd: 370_000_000n, balance: 10_000_000_000n };
  return { pools: [pool], collaterals: [collateral], poolSymbol: "USDC", collateralSymbol: "TSLAx", amountText, leverage, account: { collateralUsd: 0n, debtUsd: 0n } };
}

test("a deploy that borrows more than Vanna's pool can lend is refused before the wallet opens", () => {
  const tooBig = buildDeployForm(deployInput({ borrowable: 26_000_000_000n, amountText: "52", leverage: 4 }));
  assert.equal(tooBig.issue, "pool-liquidity");
  const fits = buildDeployForm(deployInput({ borrowable: 26_000_000_000n, amountText: "20", leverage: 2 }));
  assert.equal(fits.issue, null);
});

test("1x deposits the stock only, with nothing borrowed, as on the web app", () => {
  const plain = buildDeployForm(deployInput({ borrowable: 0n, amountText: "5", leverage: 1 }));
  assert.equal(plain.issue, null);
  assert.equal(plain.quote.borrow.raw, 0n);
  assert.equal(plain.quote.debtUsd, 0n);
});

test("a position whose stock is unknown closes its Kamino part only and never repays more than it redeems", () => {
  const { unplacedCloseQuote } = load("src/lib/farm/position-math.ts");
  const position = { pool: "USDC", supplied: amount(742_750_000n, 6), debt: amount(742_760_000n, 6) };
  const all = unplacedCloseQuote(position, 1_000_000n, 10000);
  assert.equal(all.redeem.raw, 742_750_000n);
  assert.equal(all.repay.raw, 742_750_000n);
  assert.equal(all.leftover.raw, 0n);
  assert.equal(all.collateralReturned.raw, 0n);
  assert.equal(all.healthAfter, null);
  const quarter = unplacedCloseQuote(position, 1_000_000n, 2500);
  assert.equal(quarter.redeem.raw, 185_687_500n);
  assert.equal(quarter.repay.raw, 185_687_500n);
});

const { accountAfterDeploy, liquidationDropBps, netApyAtLeverageBps } = load("src/lib/farm/farm-math.ts");
const { strategyPreview } = load("src/lib/farm/strategy-preview.ts");
const { farmPoolRows } = load("src/lib/farm/pool-rows.ts");

const usdcPool = (supplyApyBps, borrowApyBps) => ({
  symbol: "USDC",
  market: "Kamino Main Market",
  decimals: 6,
  priceUsd: 1_000_000n,
  supplyApyBps,
  borrowApyBps,
  available: 0n,
  borrowable: 10_000_000_000n,
  totalSupplied: 2_500_000_000_000n,
  utilizationBps: 7800,
});

function googlForm(amountText, leverage, account = { collateralUsd: 0n, debtUsd: 0n }) {
  const collateral = { symbol: "GOOGLx", decimals: 8, priceUsd: 340_000_000n, balance: 200_000_000n };
  return buildDeployForm({ pools: [usdcPool(628, 342)], collaterals: [collateral], poolSymbol: "USDC", collateralSymbol: "GOOGLx", amountText, leverage, account });
}

const NO_ACCOUNT = { hasAccount: false, collateralUsd: 0n, debtUsd: 0n, netUsd: 0n, health: null, leverage: null };

test("a deploy borrows the deposit times leverage minus one, supplies all of it to Kamino and earns the spread on it", () => {
  // 1.5 GOOGLx at $340 = $510 at 4x: borrow $1,530, supplied at 6.28%, paid at 3.42%.
  const preview = strategyPreview(googlForm("1.5", 4), NO_ACCOUNT);
  assert.equal(preview.borrowUsd, 1_530_000_000n);
  assert.equal(preview.borrow.raw, 1_530_000_000n);
  assert.equal(preview.supplied.raw, preview.borrow.raw);
  // $1,530 × (6.28% - 3.42%) = $43.758 a year, (4 - 1) × 2.86% = 8.58% on the $510 deposit.
  assert.equal(preview.yearlyNetUsd, 43_758_000n);
  assert.equal(preview.netApyBps, 858);
  // Kamino holds the borrowed amount, so the stock only has to cover 10% of the debt: $340 × 3 ÷ 10.
  assert.equal(preview.liquidationPriceUsd, 102_000_000n);
  assert.equal(preview.liquidationDropBps, 7000);
});

test("without a margin account or debt only the new health and leverage are given", () => {
  const preview = strategyPreview(googlForm("1.5", 4), NO_ACCOUNT);
  assert.equal(preview.health.now, null);
  assert.equal(preview.leverage.now, null);
  assert.ok(Math.abs(preview.health.after - 4 / 3) < 1e-9);
  assert.equal(preview.leverage.after, 4);
  const debtFree = strategyPreview(googlForm("1.5", 4), { hasAccount: true, collateralUsd: 100_000_000n, debtUsd: 0n, netUsd: 100_000_000n, health: null, leverage: 1 });
  assert.equal(debtFree.leverage.now, null);
});

test("with debt already in the account the preview moves the whole account from now to after", () => {
  // $2,000 held against $1,250 owed: health 1.60, leverage 2.67x. Adding $510 of stock, $1,530 supplied and $1,530 owed.
  const account = { hasAccount: true, collateralUsd: 2_000_000_000n, debtUsd: 1_250_000_000n, netUsd: 750_000_000n, health: 1.6, leverage: 2000 / 750 };
  const preview = strategyPreview(googlForm("1.5", 4, account), account);
  assert.equal(preview.health.now, 1.6);
  assert.ok(Math.abs(preview.health.after - 4040 / 2780) < 1e-9);
  assert.ok(Math.abs(preview.leverage.after - 4040 / 1260) < 1e-9);
  assert.ok(preview.health.after < preview.health.now);
});

test("no amount, or more than the wallet holds, gives no preview", () => {
  assert.equal(strategyPreview(googlForm("", 4), NO_ACCOUNT), null);
  assert.equal(strategyPreview(googlForm("3", 4), NO_ACCOUNT), null);
  // At 1x nothing is borrowed: the figures are real zeros, not dashes.
  const flat = strategyPreview(googlForm("1", 1), NO_ACCOUNT);
  assert.equal(flat.borrowUsd, 0n);
  assert.equal(flat.health.after, null);
  assert.equal(flat.leverage.after, 1);
});

test("the liquidation drop shrinks by ten points per step of leverage", () => {
  assert.equal(liquidationDropBps(1), 10_000);
  assert.equal(liquidationDropBps(2), 9000);
  assert.equal(liquidationDropBps(5), 6000);
  const empty = accountAfterDeploy({ collateralUsd: 0n, debtUsd: 0n, netUsd: 0n }, { collateralValueUsd: 0n, debtUsd: 0n });
  assert.equal(empty.health, null);
  assert.equal(empty.leverage, 1);
});

test("a pool lists its net APY at 5x, negative when the borrow costs more than Kamino pays, and what the user holds in it", () => {
  assert.equal(netApyAtLeverageBps(628, 342, 5), 1144);
  assert.equal(netApyAtLeverageBps(300, 400, 5), -400);
  const held = [{ poolSymbol: "USDC", netValueUsd: 513_000_000n }, { poolSymbol: "SOL", netValueUsd: 1n }];
  const [usdc] = farmPoolRows([usdcPool(628, 342)], held);
  assert.equal(usdc.maxLeverage, 5);
  assert.equal(usdc.maxNetApyBps, 1144);
  assert.equal(usdc.totalSuppliedUsd, 2_500_000_000_000n);
  assert.equal(usdc.yoursUsd, 513_000_000n);
  assert.equal(farmPoolRows([usdcPool(300, 400)], []).at(0).yoursUsd, null);
  assert.equal(farmPoolRows([usdcPool(300, 400)], []).at(0).maxNetApyBps, -400);
});

test("a position's net APY is the Kamino yield minus the borrow interest over the stock deposited", () => {
  // 2 TSLAx ($744.28) with 700 USDC in Kamino at 4.98% and 700 USDC owed at 6.02%: the borrow costs more, so it is negative.
  const live = [{ pool: "USDC", supplied: 700_000_000n, debt: 700_000_010n, borrowRateBps: 602 }];
  const [position] = composePositions(live, [attribution("TSLAx", 200_000_000n, 700_000_000n)], prices, { USDC: 498, SOL: null });
  const view = toPositionView(position);
  assert.ok(view.yearlyNetUsd < 0n);
  assert.equal(view.netApyBps, Number((view.yearlyNetUsd * 10_000n) / view.collateralValueUsd));
  assert.ok(view.netApyBps < -90 && view.netApyBps > -110);
  assert.equal(view.liquidationPriceUsd, toPortfolioFarmPosition(position).liquidationPrice);
  assert.ok(view.liquidationAwayBps > 9000);
});

const { accruedShare, farmOverview } = load("src/lib/farm/overview-series.ts");

test("a farm's earnings to date are spread over its deploys at one steady rate, weighted by what each borrowed", () => {
  assert.equal(accruedShare([{ at: 0, weight: 1n }], 50, 100), 0.5);
  assert.equal(accruedShare([{ at: 0, weight: 1n }], -10, 100), 0);
  assert.equal(accruedShare([{ at: 0, weight: 1n }], 100, 100), 1);
  // 100 borrowed at 0 and 100 more at 50: by 100 they have earned for 100 + 50 units of time; by 50 only the first had, for 50.
  const twice = [
    { at: 0, weight: 100n },
    { at: 50, weight: 100n },
  ];
  assert.equal(accruedShare(twice, 50, 100), 1 / 3);
  assert.equal(accruedShare(twice, 75, 100), 2 / 3);
  // Without a known deploy it is all earned at the end and nothing before.
  assert.equal(accruedShare([], 99, 100), 0);
  assert.equal(accruedShare([], 100, 100), 1);
  assert.equal(accruedShare([{ at: 0, weight: 0n }, { at: 50, weight: 0n }], 50, 100), 1 / 3);
});

const DAY_S = 86_400;
const T0 = 1_700_000_000;
const flatPrices = { USDC: 1_000_000n, TSLAx: 372_140_000n, GOOGLx: 340_000_000n };
// 2 TSLAx with 700 USDC borrowed into Kamino at T0; ten days on Kamino holds 710 and the loan owes 704.
const tslaLive = [{ pool: "USDC", supplied: 710_000_000n, debt: 704_000_000n, borrowRateBps: 602 }];
const overviewOf = (activity, live, mode, now = (T0 + 10 * DAY_S) * 1000) => {
  const derived = deriveFarm(activity);
  const positions = composePositions(live, derived.attributions, flatPrices, { USDC: 500, SOL: null });
  return farmOverview({ positions, entries: derived.entries, prices: flatPrices, mode, range: "All", now });
};

test("net earnings are what Kamino paid minus the borrow interest the loan has accrued, ending at today's figure", () => {
  const overview = overviewOf([open("a", T0, "TSLAx", 200_000_000n, 700_000_000n)], tslaLive, "earnings");
  // Interest accrued = debt - principal = 704 - 700; Kamino earned = 710 - 700.
  assert.equal(overview.earnings.interestUsd, 4_000_000n);
  assert.equal(overview.earnings.kaminoUsd, 10_000_000n);
  assert.equal(overview.earnings.closedUsd, 0n);
  assert.equal(overview.earnings.netUsd, 6_000_000n);
  assert.equal(overview.earnings.borrowApyBps, 602);
  assert.equal(overview.earnings.supplyApyBps, 500);
  const { points, value, now } = overview.chart;
  assert.equal(value, 6_000_000n);
  assert.equal(points.at(-1).at, now);
  assert.equal(points.at(-1).usd, 6_000_000n);
  // Zero before the deploy, then rising steadily: halfway through the ten days it has earned half.
  assert.ok(points.filter((point) => point.at <= T0 * 1000).every((point) => point.usd === 0n));
  assert.ok(points.every((point, index) => index === 0 || point.usd >= points[index - 1].usd));
  const mid = points.find((point) => point.at > T0 * 1000);
  assert.equal(mid.usd, BigInt(Math.round(6_000_000 * ((mid.at - T0 * 1000) / (10 * DAY_S * 1000)))));
});

test("a closed farm keeps what its exit paid out beyond the debt, from the exit on", () => {
  const activity = [
    open("a", T0, "TSLAx", 200_000_000n, 700_000_000n),
    returnStock("z", T0 - 10 * DAY_S + 60, "GOOGLx", 100_000_000n),
    exit("y", T0 - 10 * DAY_S, 303_000_000n, 4_000_000n),
    open("x", T0 - 20 * DAY_S, "GOOGLx", 100_000_000n, 300_000_000n),
  ];
  const earnings = overviewOf(activity, tslaLive, "earnings");
  assert.equal(earnings.earnings.closedUsd, 4_000_000n);
  assert.equal(earnings.earnings.interestUsd, 4_000_000n);
  assert.equal(earnings.earnings.netUsd, 10_000_000n);
  const between = earnings.chart.points.filter((point) => point.at >= (T0 - 10 * DAY_S) * 1000 && point.at <= T0 * 1000);
  assert.ok(between.length > 0 && between.every((point) => point.usd === 4_000_000n));
  assert.equal(earnings.chart.points.at(-1).usd, 10_000_000n);

  // Deployed: 1 GOOGLx ($340) and 300 USDC in Kamino until the exit, nothing after the stock went back, then 2 TSLAx and
  // 700 USDC; today it is the stock plus what Kamino holds now.
  const deployed = overviewOf(activity, tslaLive, "deployed").chart;
  const at = (seconds) => deployed.points.filter((point) => point.at > seconds[0] * 1000 && point.at < seconds[1] * 1000).map((point) => point.usd);
  assert.ok(at([T0 - 20 * DAY_S, T0 - 10 * DAY_S]).every((usd) => usd === 640_000_000n));
  assert.ok(at([T0 - 10 * DAY_S + 60, T0]).every((usd) => usd === 0n));
  assert.ok(at([T0, T0 + 10 * DAY_S]).every((usd) => usd === 1_444_280_000n));
  assert.equal(deployed.value, 1_454_280_000n);
  assert.equal(deployed.points.at(-1).usd, 1_454_280_000n);

  // Returning the stock ends the farm even when no exit was read before it, so its Kamino part stops counting too.
  const returnedOnly = overviewOf([returnStock("z", T0 - 10 * DAY_S, "GOOGLx", 100_000_000n), open("x", T0 - 20 * DAY_S, "GOOGLx", 100_000_000n, 300_000_000n)], [], "deployed").chart;
  assert.ok(returnedOnly.points.filter((point) => point.at > (T0 - 10 * DAY_S) * 1000).every((point) => point.usd === 0n));
});

test("with no farm open and no Farm transaction that went through there is nothing to chart", () => {
  assert.equal(overviewOf([], [], "earnings"), null);
  const failedOnly = deriveFarm([open("f", T0, "TSLAx", 100n, 400n)], new Map([["f", "Price moved"]]));
  assert.equal(farmOverview({ positions: [], entries: failedOnly.entries, prices: flatPrices, mode: "earnings", range: "All", now: T0 * 1000 }), null);
  // History alone still charts what the closed farms earned.
  const closed = overviewOf([exit("y", T0 + 60, 303_000_000n, 4_000_000n), open("x", T0, "GOOGLx", 100_000_000n, 300_000_000n)], [], "earnings");
  assert.equal(closed.earnings.netUsd, 4_000_000n);
  assert.equal(closed.earnings.borrowApyBps, null);
});
