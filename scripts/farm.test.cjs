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
