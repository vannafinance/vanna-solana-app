const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { loadTs } = require("./load-ts.cjs");

const PROGRAM = "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg";
const stubs = { "./config": { VANNA_PROGRAM_ID: PROGRAM, API_BASE_URL: "https://example.test" } };
const cache = new Map();
const load = (file) => loadTs(file, stubs, cache);

const { quoteOrder, orderIssue } = load("src/lib/perps/order-quote.ts");
const { orderFunds, collateralBaseUnits } = load("src/lib/perps/order-funds.ts");
const { readTransferFeeSchedule, transferFeeAt } = load("src/lib/solana/transfer-fee.ts");
const { decodeMarginAccount, decodeAssetIndex, positionAccounts } = load("src/lib/solana/margin-state.ts");
const { assets } = load("src/lib/solana/assets.ts");
const { InstructionData } = load("src/lib/solana/instruction-encoding.ts");
const { marginAddress, assetConfigAddress, reserveAddress, debtPositionAddress, litePositionAddress, associatedTokenAddress, TOKEN_PROGRAM, TOKEN_2022_PROGRAM } = load("src/lib/solana/program-accounts.ts");
const { priceAccountAddress } = load("src/lib/solana/oracle-prices.ts");

const USD = 1_000_000n;
const market = { symbol: "TSLAx", markPrice: 400n * USD, usdcBorrowBps: 500, tokenBorrowBps: 300 };

test("a 3x long deposits 100, borrows 200 and projects health like the web app", () => {
  const quote = quoteOrder({ market, margin: 0n, borrowed: 0n, side: "long", collateral: 100n * USD, leverage: 3 });
  assert.equal(quote.size, 300n * USD);
  assert.equal(quote.healthAfter, 300 / 200);
  assert.equal(quote.fee, 0n);
  // 1.1 * 400 * (2/3) * 1.05
  assert.equal(quote.liquidationPrice, BigInt(Math.round(400 * 1.1 * (2 / 3) * 1.05 * 1_000_000)));
});

test("a 3x short uses the stock borrow rate and the mirrored liquidation formula", () => {
  const quote = quoteOrder({ market, margin: 0n, borrowed: 0n, side: "short", collateral: 100n * USD, leverage: 3 });
  assert.equal(quote.liquidationPrice, BigInt(Math.round(((400 * 3) / (1.1 * 2 * 1.03)) * 1_000_000)));
});

test("1x borrows nothing: no liquidation price and infinite health on an empty account", () => {
  const quote = quoteOrder({ market, margin: 0n, borrowed: 0n, side: "long", collateral: 100n * USD, leverage: 1 });
  assert.equal(quote.liquidationPrice, 0n);
  assert.equal(quote.healthAfter, Number.POSITIVE_INFINITY);
});

test("existing collateral and debt are included in the projected health", () => {
  const quote = quoteOrder({ market, margin: 1000n * USD, borrowed: 500n * USD, side: "long", collateral: 100n * USD, leverage: 2 });
  assert.equal(quote.healthAfter, (1000 + 200) / (500 + 100));
});

test("an order is blocked when empty, over the wallet balance, or at or below health 1.15", () => {
  const ok = quoteOrder({ market, margin: 0n, borrowed: 0n, side: "long", collateral: 100n * USD, leverage: 3 });
  assert.equal(orderIssue(500n * USD, 0n, ok), "empty");
  assert.equal(orderIssue(50n * USD, 100n * USD, ok), "insufficient-margin");
  assert.equal(orderIssue(500n * USD, 100n * USD, ok), null);
  const risky = quoteOrder({ market, margin: 110n * USD, borrowed: 100n * USD, side: "long", collateral: 1n * USD, leverage: 2 });
  assert.equal(orderIssue(500n * USD, 1n * USD, risky), "health-low");
});

test("an order is blocked while the other side of the same market is open, as on the web app", () => {
  const ok = quoteOrder({ market, margin: 0n, borrowed: 0n, side: "short", collateral: 100n * USD, leverage: 2 });
  assert.equal(orderIssue(500n * USD, 100n * USD, ok, true), "opposite-open");
  assert.equal(orderIssue(500n * USD, 0n, ok, true), "opposite-open");
  assert.equal(orderIssue(500n * USD, 100n * USD, ok, false), null);
});

test("collateral is limited by the wallet: USDC for a long, the stock for a short", () => {
  const holdings = [
    { symbol: "USDC", raw: 2_000_000_000n, decimals: 6 },
    { symbol: "TSLAx", raw: 2_000_000_000n, decimals: 8 },
  ];
  const long = orderFunds("long", "TSLAx", market.markPrice, holdings);
  assert.equal(long.usd, 2000n * USD);
  const short = orderFunds("short", "TSLAx", market.markPrice, holdings);
  assert.equal(short.usd, 20n * 400n * USD);
  assert.equal(orderFunds("long", "TSLAx", market.markPrice, []).usd, 0n);
});

test("USD collateral converts to base units, and the full balance uses the exact holding", () => {
  const holdings = [{ symbol: "TSLAx", raw: 2_000_000_000n, decimals: 8 }];
  const funds = orderFunds("short", "TSLAx", market.markPrice, holdings);
  assert.equal(collateralBaseUnits("short", funds, 400n * USD, market.markPrice), 100_000_000n);
  assert.equal(collateralBaseUnits("short", funds, funds.usd, market.markPrice), 2_000_000_000n);
  const usdcFunds = orderFunds("long", "TSLAx", market.markPrice, [{ symbol: "USDC", raw: 5_000_000n, decimals: 6 }]);
  assert.equal(collateralBaseUnits("long", usdcFunds, 3n * USD, market.markPrice), 3_000_000n);
});

function mintWithFee(older, newer) {
  const data = Buffer.alloc(166 + 4 + 108);
  data[165] = 1;
  data.writeUInt16LE(1, 166);
  data.writeUInt16LE(108, 168);
  const body = 170;
  [older, newer].forEach((fee, index) => {
    const at = body + 72 + index * 18;
    data.writeBigUInt64LE(fee.epoch, at);
    data.writeBigUInt64LE(fee.max, at + 8);
    data.writeUInt16LE(fee.bps, at + 16);
  });
  return data;
}

test("transfer fee schedule: newer fee applies from its epoch, rounds up and respects the cap", () => {
  const schedule = readTransferFeeSchedule(mintWithFee({ epoch: 0n, max: 1000n, bps: 100 }, { epoch: 5n, max: 50n, bps: 200 }));
  assert.equal(transferFeeAt(schedule, 4n, 10_000n), 100n);
  assert.equal(transferFeeAt(schedule, 5n, 1_001n), 21n);
  assert.equal(transferFeeAt(schedule, 5n, 1_000_000n), 50n);
  assert.equal(transferFeeAt(schedule, 5n, 0n), 0n);
});

test("a mint without the extension has no fee schedule", () => {
  assert.equal(readTransferFeeSchedule(Buffer.alloc(82)), null);
  assert.equal(readTransferFeeSchedule(Buffer.alloc(200)), null);
});

function marginData({ collateral = [], debt = [], lite = [] }) {
  const data = Buffer.alloc(244);
  Buffer.from([133, 220, 173, 213, 179, 211, 43, 238]).copy(data, 0);
  for (let i = 0; i < 24; i++) {
    data.writeUInt16LE(collateral[i] ?? 0xffff, 43 + i * 2);
    data.writeUInt16LE(debt[i] ?? 0xffff, 91 + i * 2);
  }
  data[148] = lite.length;
  lite.forEach((index, i) => data.writeUInt16LE(index, 149 + i * 2));
  return data;
}

test("margin account slots decode in place, empty slots included", () => {
  const slots = decodeMarginAccount(marginData({ collateral: [1, 0xffff, 3], debt: [2], lite: [4] }));
  assert.equal(slots.collateral.length, 24);
  assert.deepEqual(slots.collateral.slice(0, 3), [1, 0xffff, 3]);
  assert.deepEqual(slots.debt.slice(0, 2), [2, 0xffff]);
  assert.deepEqual(slots.lite, [4]);
  assert.throws(() => decodeMarginAccount(Buffer.alloc(244)));
});

test("asset index is read from the asset config", () => {
  const data = Buffer.alloc(300);
  Buffer.from([57, 112, 247, 166, 247, 64, 140, 23]).copy(data, 0);
  data.writeUInt16LE(5, 156);
  assert.equal(decodeAssetIndex(data), 5);
});

const symbol = (name) => assets.find((asset) => asset.symbol === name);
const mint = (name) => new PublicKey(symbol(name).mint);

test("the position scan emits one block per active position in slot order, then every Kamino slot", async () => {
  const owner = Keypair.generate().publicKey;
  const margin = marginAddress(owner);
  const symbolOf = new Map([
    [0, symbol("USDC")],
    [1, symbol("TSLAx")],
  ]);
  const state = { margin, slots: { collateral: [1, 0xffff], debt: [0, 0xffff], lite: [] }, symbolOf };
  const connection = { getMultipleAccountsInfo: async (keys) => keys.map(() => null) };

  const metas = await positionAccounts(connection, state);
  const keys = metas.map((meta) => meta.pubkey.toBase58());
  const expected = [
    assetConfigAddress(mint("TSLAx")),
    associatedTokenAddress(margin, mint("TSLAx"), TOKEN_2022_PROGRAM),
    priceAccountAddress(symbol("TSLAx")),
    assetConfigAddress(mint("USDC")),
    reserveAddress(mint("USDC")),
    debtPositionAddress(margin, reserveAddress(mint("USDC"))),
    priceAccountAddress(symbol("USDC")),
    litePositionAddress(margin),
  ].map((key) => key.toBase58());
  assert.equal(keys.join(","), expected.join(","));
  assert.ok(metas.every((meta) => !meta.isSigner && !meta.isWritable));
});

test("an asset the same transaction opens for the first time fills the first empty slot, exclusions are skipped", async () => {
  const owner = Keypair.generate().publicKey;
  const margin = marginAddress(owner);
  const symbolOf = new Map([
    [0, symbol("USDC")],
    [1, symbol("TSLAx")],
  ]);
  const state = { margin, slots: { collateral: [1, 0xffff], debt: [0xffff, 0xffff], lite: [] }, symbolOf };
  const connection = { getMultipleAccountsInfo: async (keys) => keys.map(() => null) };

  const metas = await positionAccounts(connection, state, { excludeCollateral: ["TSLAx"], injectDebt: "USDC" });
  assert.equal(metas.length, 4 + 1);
  assert.equal(metas[0].pubkey.toBase58(), assetConfigAddress(mint("USDC")).toBase58());
});

const { kaminoReserveOf } = load("src/lib/solana/kamino.ts");

function litePositionData(strategy, mint) {
  const data = Buffer.alloc(193);
  Buffer.from([141, 145, 27, 4, 142, 122, 126, 174]).copy(data, 0);
  strategy.toBuffer().copy(data, 40);
  mint.toBuffer().copy(data, 72);
  return data;
}

test("a Kamino position adds its strategy, config, receipts, reserve and price after its own address", async () => {
  const owner = Keypair.generate().publicKey;
  const margin = marginAddress(owner);
  const strategy = Keypair.generate().publicKey;
  const state = { margin, slots: { collateral: [], debt: [], lite: [] }, symbolOf: new Map() };
  const data = litePositionData(strategy, mint("USDC"));
  const connection = { getMultipleAccountsInfo: async (keys) => keys.map((_, index) => (index === 0 ? { data } : null)) };

  const keys = (await positionAccounts(connection, state)).map((meta) => meta.pubkey.toBase58());
  const expected = [
    litePositionAddress(margin),
    strategy,
    assetConfigAddress(mint("USDC")),
    associatedTokenAddress(margin, kaminoReserveOf("USDC").collateralMint, TOKEN_PROGRAM),
    kaminoReserveOf("USDC").reserve,
    priceAccountAddress(symbol("USDC")),
  ].map((key) => key.toBase58());
  assert.equal(keys.join(","), expected.join(","));
});

test("the position an instruction closes out is left out of its own health scan", async () => {
  const owner = Keypair.generate().publicKey;
  const margin = marginAddress(owner);
  const state = { margin, slots: { collateral: [], debt: [], lite: [] }, symbolOf: new Map() };
  const data = litePositionData(Keypair.generate().publicKey, mint("USDC"));
  const connection = { getMultipleAccountsInfo: async (keys) => keys.map((_, index) => (index === 0 ? { data } : null)) };
  const metas = await positionAccounts(connection, state, { excludeLite: litePositionAddress(margin) });
  assert.equal(metas.length, 0);
});

test("a Kamino position in an asset the app does not list is refused", async () => {
  const owner = Keypair.generate().publicKey;
  const state = { margin: marginAddress(owner), slots: { collateral: [], debt: [], lite: [] }, symbolOf: new Map() };
  const data = litePositionData(Keypair.generate().publicKey, Keypair.generate().publicKey);
  const connection = { getMultipleAccountsInfo: async (keys) => keys.map((_, index) => (index === 0 ? { data } : null)) };
  await assert.rejects(positionAccounts(connection, state), /does not support/);
});

test("instruction data writes u16, u64, u128 and length-prefixed bytes little endian", () => {
  const data = new InstructionData([1, 2, 3, 4, 5, 6, 7, 8]).u64(5n).u128((1n << 100n) + 7n).u16(513).bytes(Uint8Array.of(9, 9)).build();
  assert.equal(data.length, 8 + 8 + 16 + 2 + 4 + 2);
  assert.equal(data.readBigUInt64LE(8), 5n);
  assert.equal(data.readBigUInt64LE(16), 7n);
  assert.equal(data.readBigUInt64LE(24), 1n << 36n);
  assert.equal(data.readUInt16LE(32), 513);
  assert.equal(data.readUInt32LE(34), 2);
  assert.throws(() => new InstructionData([0]).u64(-1n), RangeError);
});

const { decodeMarginEvents } = load("src/lib/solana/margin-events.ts");
const { derivePositions } = load("src/lib/perps/derive-positions.ts");
const { summarizePosition } = load("src/lib/perps/summarize-portfolio.ts");
const { formatShortDate } = load("src/format/format-date.ts");

function eventLine(discriminator, parts) {
  return "Program data: " + Buffer.concat([Buffer.from(discriminator), ...parts]).toString("base64");
}
const u64 = (value) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
};

test("margin swap and borrow events are decoded from program data log lines", () => {
  const margin = Keypair.generate().publicKey;
  const reserve = Keypair.generate().publicKey;
  const usdcMint = mint("USDC");
  const tslaMint = mint("TSLAx");
  const logs = [
    "Program log: Instruction: UserBorrow",
    eventLine([225, 182, 241, 78, 34, 145, 253, 230], [margin.toBuffer(), reserve.toBuffer(), u64(1_000_000_000n), Buffer.alloc(16 + 16 + 16 + 8 + 8)]),
    eventLine([25, 110, 111, 203, 233, 54, 199, 222], [margin.toBuffer(), usdcMint.toBuffer(), tslaMint.toBuffer(), u64(1_500_000_000n), u64(421_198_486n), u64(7n)]),
    "Program data: AAAA",
  ];
  const { swaps, borrows } = decodeMarginEvents(logs);
  assert.equal(swaps.length, 1);
  assert.equal(swaps[0].margin, margin.toBase58());
  assert.equal(swaps[0].inputMint, usdcMint.toBase58());
  assert.equal(swaps[0].outputMint, tslaMint.toBase58());
  assert.equal(swaps[0].amountIn, 1_500_000_000n);
  assert.equal(swaps[0].amountOut, 421_198_486n);
  assert.equal(borrows.length, 1);
  assert.equal(borrows[0].reserve, reserve.toBase58());
  assert.equal(borrows[0].assets, 1_000_000_000n);
});

const swap = (over) => ({ signature: "s", blockTime: 1_790_000_000, input: "USDC", output: "TSLAx", amountIn: 1_500_000_000n, amountOut: 421_198_486n, borrowed: { asset: "USDC", amount: 1_000_000_000n }, ...over });

test("the live 3x long: stock collateral against USDC debt, entry from the opening swap", () => {
  const { positions, unresolved } = derivePositions({
    collateral: { TSLAx: 421_198_486n },
    debt: { USDC: 1_000_000_000n },
    prices: { TSLAx: 356_930_000n },
    swaps: [swap({})],
  });
  assert.equal(unresolved.length, 0);
  assert.equal(positions.length, 1);
  const p = positions[0];
  assert.equal(p.id, "TSLAx-long");
  assert.equal(p.side, "long");
  assert.equal(p.entryPrice, (1_500_000_000n * 100_000_000n) / 421_198_486n);
  assert.equal(p.tokens, 4_211_984n);
  assert.equal(p.leverage, 3);
  const summary = summarizePosition(p, { symbol: "TSLAx", markPrice: 356_930_000n, usdcBorrowBps: 103, tokenBorrowBps: 100 });
  assert.ok(summary.pnl > 0n);
  assert.ok(summary.liquidationPrice > 0n && summary.liquidationPrice < p.entryPrice);
});

test("USDC debt left over from interest accrued between two reads is not a long", () => {
  const { positions } = derivePositions({
    collateral: { TSLAx: 1_294_339_587n },
    debt: { USDC: 14n },
    prices: { TSLAx: 380_470_000n },
    swaps: [swap({})],
  });
  assert.equal(positions.length, 0);
});

test("a short is stock debt against USDC collateral and uses the swap proceeds as its entry", () => {
  const { positions } = derivePositions({
    collateral: { USDC: 300_000_000n },
    debt: { TSLAx: 600_000_000n },
    prices: { TSLAx: 400_000_000n },
    swaps: [swap({ input: "TSLAx", output: "USDC", amountIn: 600_000_000n, amountOut: 300_000_000n, borrowed: { asset: "TSLAx", amount: 400_000_000n } })],
  });
  assert.equal(positions.length, 1);
  assert.equal(positions[0].side, "short");
  assert.equal(positions[0].entryPrice, 50_000_000n * 1n * 100n / 100n);
});

test("two longs split the shared USDC debt by what each one borrowed", () => {
  const { positions } = derivePositions({
    collateral: { TSLAx: 100_000_000n, GOOGLx: 100_000_000n },
    debt: { USDC: 300_000_000n },
    prices: { TSLAx: 400_000_000n, GOOGLx: 200_000_000n },
    swaps: [
      swap({ output: "TSLAx", amountIn: 400_000_000n, amountOut: 100_000_000n, borrowed: { asset: "USDC", amount: 200_000_000n } }),
      swap({ output: "GOOGLx", amountIn: 200_000_000n, amountOut: 100_000_000n, borrowed: { asset: "USDC", amount: 100_000_000n } }),
    ],
  });
  const tsla = positions.find((p) => p.symbol === "TSLAx");
  const googl = positions.find((p) => p.symbol === "GOOGLx");
  assert.equal(tsla.collateral, 400_000_000n - 200_000_000n);
  assert.equal(googl.collateral, 200_000_000n - 100_000_000n);
});

test("a held position with no opening swap in history is reported unresolved, not invented", () => {
  const { positions, unresolved } = derivePositions({
    collateral: { TSLAx: 421_198_486n },
    debt: { USDC: 1_000_000_000n },
    prices: { TSLAx: 356_930_000n },
    swaps: [],
  });
  assert.equal(positions.length, 0);
  assert.equal(unresolved.join(","), "TSLAx");
});

test("collateral with no debt is not a position", () => {
  const { positions, unresolved } = derivePositions({ collateral: { USDC: 3_000_000_000n, TSLAx: 70_000_000n }, debt: {}, prices: { TSLAx: 356_930_000n }, swaps: [] });
  assert.equal(positions.length, 0);
  assert.equal(unresolved.length, 0);
});

test("short dates read like Oct 2", () => {
  assert.match(formatShortDate(1_790_000_000), /^[A-Z][a-z]{2} \d{1,2}$/);
});

const { quoteClose } = load("src/lib/perps/close-quote.ts");
const { repayFromMarginInstruction, withdrawCollateralInstruction, depositCollateralInstruction, borrowInstruction, openDebtPositionInstruction, marginSwapInstruction } = load("src/lib/solana/margin-instructions.ts");

test("closing returns the equity share to the wallet with no fee, and does not count PnL twice", () => {
  const position = { tokens: 4_211_984n, markPrice: 356_930_000n, pnl: 3_380_000n, collateral: 503_380_000n };
  const all = quoteClose(position, 10_000);
  assert.equal(all.fee, 0n);
  assert.equal(all.toWallet, 503_380_000n);
  assert.equal(all.pnl, 3_380_000n);
  const half = quoteClose(position, 5_000);
  assert.equal(half.toWallet, 251_690_000n);
  assert.equal(half.tokens, 2_105_992n);
});

test("a long's close goes to the wallet, a short's USDC stays in the margin account", () => {
  const base = { tokens: 1n, markPrice: 1n, pnl: 0n, collateral: 10n };
  assert.equal(quoteClose({ ...base, side: "long" }, 10_000).returnsTo, "wallet");
  assert.equal(quoteClose({ ...base, side: "short" }, 10_000).returnsTo, "margin");
});

const holder = Keypair.generate().publicKey;

test("repay from margin: amount, repay-all flag and the IDL account flags", () => {
  const ix = repayFromMarginInstruction({ authority: holder, asset: assets.find((a) => a.symbol === "USDC"), maxAssets: 7n, repayAll: true });
  assert.deepEqual([...ix.data.subarray(0, 8)], [108, 103, 220, 205, 63, 240, 73, 147]);
  assert.equal(ix.data.readBigUInt64LE(8), 7n);
  assert.equal(ix.data[16], 1);
  assert.equal(ix.data.length, 17);
  assert.equal(ix.keys.map((k) => `${k.isSigner ? "S" : "-"}${k.isWritable ? "W" : "-"}`).join(" "), "S- -W -- -W -W -- -W -W --");
});

test("withdraw collateral: zero minimum health and remaining accounts appended after the named ones", () => {
  const remaining = [{ pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false }];
  const ix = withdrawCollateralInstruction({ authority: holder, asset: assets.find((a) => a.symbol === "USDC"), amount: 5n, destination: Keypair.generate().publicKey, remaining });
  assert.deepEqual([...ix.data.subarray(0, 8)], [81, 34, 228, 68, 219, 88, 210, 28]);
  assert.equal(ix.data.readBigUInt64LE(8), 5n);
  assert.equal(ix.data.readBigUInt64LE(16), 0n);
  assert.equal(ix.data.readBigUInt64LE(24), 0n);
  assert.equal(ix.keys.length, 9 + 1);
  assert.equal(ix.keys.map((k) => `${k.isSigner ? "S" : "-"}${k.isWritable ? "W" : "-"}`).slice(0, 9).join(" "), "SW -- -W -- -- -- -W -W --");
});

test("deposit, open debt and borrow carry the IDL flags and the u128 limit", () => {
  const usdcAsset = assets.find((a) => a.symbol === "USDC");
  const deposit = depositCollateralInstruction({ authority: holder, asset: usdcAsset, amount: 9n, source: Keypair.generate().publicKey });
  assert.deepEqual([...deposit.data.subarray(0, 8)], [238, 206, 161, 246, 218, 26, 100, 157]);
  assert.equal(deposit.keys.map((k) => `${k.isSigner ? "S" : "-"}${k.isWritable ? "W" : "-"}`).join(" "), "SW -- -W -- -- -W -W -- -- --");
  const open = openDebtPositionInstruction({ authority: holder, asset: usdcAsset });
  assert.equal(open.keys.map((k) => `${k.isSigner ? "S" : "-"}${k.isWritable ? "W" : "-"}`).join(" "), "S- SW -- -- -- -W --");
  const borrow = borrowInstruction({ authority: holder, asset: usdcAsset, amount: 3n, remaining: [] });
  assert.equal(borrow.data.readBigUInt64LE(8), 3n);
  assert.equal(borrow.data.readBigUInt64LE(16), (1n << 64n) - 1n);
  assert.equal(borrow.data.readBigUInt64LE(24), (1n << 64n) - 1n);
  assert.equal(borrow.keys.map((k) => `${k.isSigner ? "S" : "-"}${k.isWritable ? "W" : "-"}`).join(" "), "SW -- -W -- -W -W -- -- -W -W -- -- --");
});

test("margin swap: route accounts are never signers and follow the 19 named accounts", () => {
  const usdcAsset = assets.find((a) => a.symbol === "USDC");
  const tsla = assets.find((a) => a.symbol === "TSLAx");
  const route = { accounts: [{ pubkey: Keypair.generate().publicKey, isSigner: true, isWritable: true }], data: Uint8Array.of(1, 2, 3) };
  const ix = marginSwapInstruction({ authority: holder, input: usdcAsset, output: tsla, amountIn: 10n, minAmountOut: 9n, route, remaining: [] });
  assert.deepEqual([...ix.data.subarray(0, 8)], [135, 21, 70, 23, 50, 234, 24, 220]);
  assert.equal(ix.data.readBigUInt64LE(8), 10n);
  assert.equal(ix.data.readBigUInt64LE(16), 9n);
  assert.equal(ix.data.readUInt16LE(24), 1);
  assert.equal(ix.data.readUInt32LE(26), 3);
  assert.equal(ix.keys.length, 19 + 1);
  assert.equal(ix.keys[19].isSigner, false);
  assert.equal(ix.keys[19].isWritable, true);
});

const { quoteAddCollateral } = load("src/lib/perps/add-collateral-quote.ts");

test("adding collateral lowers leverage, moves the liquidation estimate away, and spends wallet USDC", () => {
  const position = { side: "long", sizeUsd: 1500n * USD, collateral: 500n * USD, entryPrice: 356_130_000n };
  const quote = quoteAddCollateral({ position, market: { usdcBorrowBps: 103, tokenBorrowBps: 100 }, walletUsdc: 2000n * USD, amount: 500n * USD });
  assert.equal(quote.collateralAfter, 1000n * USD);
  assert.equal(quote.availableAfter, 1500n * USD);
  const before = quoteAddCollateral({ position, market: { usdcBorrowBps: 103, tokenBorrowBps: 100 }, walletUsdc: 2000n * USD, amount: 0n });
  assert.ok(quote.liquidationAfter < before.liquidationAfter);
  // 1.5x leverage after: 1.1 * entry * (0.5 / 1.5) * 1.0103
  assert.equal(quote.liquidationAfter, BigInt(Math.round(356.13 * 1.1 * (0.5 / 1.5) * 1.0103 * 1_000_000)));
});

const { chartSourceFor } = load("src/lib/perps/chart-sources.ts");
const { isAllowedChartUrl, dexScreenerUrl, tradingViewHtml } = load("src/components/perps/chart-embed.ts");

test("each market maps to the same chart source as the web app", () => {
  assert.deepEqual({ ...chartSourceFor("TSLAx") }, { kind: "tradingview", symbol: "NASDAQ:TSLA" });
  assert.deepEqual({ ...chartSourceFor("GOOGLx") }, { kind: "tradingview", symbol: "NASDAQ:GOOGL" });
  assert.deepEqual({ ...chartSourceFor("AAPLx") }, { kind: "tradingview", symbol: "NASDAQ:AAPL" });
  assert.deepEqual({ ...chartSourceFor("ANTHROPIC") }, { kind: "dexscreener", pairAddress: "9thgWVMJUKiiotrVmzhEy1MWPyvkNsUSwKbp8ZFsuhA2" });
  assert.deepEqual({ ...chartSourceFor("OPENAI") }, { kind: "dexscreener", pairAddress: "4HTy7aTjPm5PTSEws2yWRDPX6gjWM6sC2dV5mv9u8JsH" });
});

test("a chart may only navigate to its own provider over https", () => {
  assert.equal(isAllowedChartUrl("https://www.tradingview.com/chart/?symbol=NASDAQ%3ATSLA"), true);
  assert.equal(isAllowedChartUrl("https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"), true);
  assert.equal(isAllowedChartUrl("https://www.tradingview-widget.com/embed-widget/advanced-chart/"), true);
  assert.equal(isAllowedChartUrl(dexScreenerUrl("abc", true)), true);
  assert.equal(isAllowedChartUrl("about:blank"), true);
  assert.equal(isAllowedChartUrl("http://dexscreener.com/solana/abc"), false);
  assert.equal(isAllowedChartUrl("https://evil-tradingview.com/x"), false);
  assert.equal(isAllowedChartUrl("https://dexscreener.com.evil.com/x"), false);
  assert.equal(isAllowedChartUrl("https://tradingview.com@evil.com/x"), false);
  assert.equal(isAllowedChartUrl("intent://scan/#Intent;end"), false);
});

test("embed addresses follow the theme and carry the widget configuration", () => {
  assert.equal(dexScreenerUrl("pair", true), "https://dexscreener.com/solana/pair?embed=1&theme=dark&trades=0&info=0");
  assert.match(dexScreenerUrl("pair", false), /theme=light/);
  const html = tradingViewHtml("NASDAQ:TSLA", true, "#121212");
  assert.match(html, /"symbol":"NASDAQ:TSLA"/);
  assert.match(html, /"theme":"dark"/);
  assert.match(html, /"allow_symbol_change":false/);
  assert.match(html, /embed-widget-advanced-chart\.js/);
});

const { marginActivityFrom } = load("src/lib/solana/margin-history.ts");
const { formatActivityAmount } = load("src/format/format-perps.ts");
const { formatDateTime } = load("src/format/format-date.ts");
const { liteStrategyAddress } = load("src/lib/solana/program-accounts.ts");

const pad = (length) => Buffer.alloc(length);
const i64 = () => pad(8);

const events = {
  deposit: (margin, mint, amount) => eventLine([244, 62, 77, 11, 135, 112, 61, 96], [margin.toBuffer(), mint.toBuffer(), u64(amount), pad(8 + 8 + 8)]),
  withdraw: (margin, mint, amount) => eventLine([51, 224, 133, 106, 74, 173, 72, 82], [margin.toBuffer(), mint.toBuffer(), u64(amount), pad(8 + 16 + 8 + 8)]),
  borrow: (margin, reserve, assets) => eventLine([225, 182, 241, 78, 34, 145, 253, 230], [margin.toBuffer(), reserve.toBuffer(), u64(assets), pad(16 + 16 + 16 + 8 + 8)]),
  repay: (margin, reserve, assets) => eventLine([145, 11, 56, 225, 154, 212, 54, 105], [margin.toBuffer(), reserve.toBuffer(), margin.toBuffer(), u64(assets), pad(16 + 8 + 8)]),
  swap: (margin, from, to, amountIn, amountOut) => eventLine([25, 110, 111, 203, 233, 54, 199, 222], [margin.toBuffer(), from.toBuffer(), to.toBuffer(), u64(amountIn), u64(amountOut), u64(1n)]),
  liteOpened: (margin, strategy, equity) => eventLine([183, 79, 102, 12, 14, 22, 68, 6], [margin.toBuffer(), strategy.toBuffer(), u64(equity), pad(8 * 3 + 16 + 16 + 8 + 8)]),
};

const holderMargin = Keypair.generate().publicKey;
const reserveOf = (name) => reserveAddress(mint(name));
const txOf = (signature, blockTime, lines) => ({ signature, blockTime, tx: { meta: { logMessages: lines } } });

test("deposit, withdraw and repay events are decoded", () => {
  const decoded = decodeMarginEvents([
    events.deposit(holderMargin, mint("USDC"), 500_000_000n),
    events.withdraw(holderMargin, mint("USDC"), 485_000_000n),
    events.repay(holderMargin, reserveOf("USDC"), 1_000_000_000n),
    events.liteOpened(holderMargin, liteStrategyAddress(mint("TSLAx")), 7n),
  ]);
  assert.equal(decoded.deposits[0].amount, 500_000_000n);
  assert.equal(decoded.deposits[0].mint, mint("USDC").toBase58());
  assert.equal(decoded.withdrawals[0].amount, 485_000_000n);
  assert.equal(decoded.repayments[0].assets, 1_000_000_000n);
  assert.equal(decoded.repayments[0].reserve, reserveOf("USDC").toBase58());
  assert.equal(decoded.liteOpened[0].equity, 7n);
});

test("a long open reads as one entry: deposit, borrow, swap, titled by the stock", () => {
  const [entry] = marginActivityFrom(
    [
      txOf("sig-open", 1_790_000_100, [
        events.swap(holderMargin, mint("USDC"), mint("TSLAx"), 1_500_000_000n, 421_198_486n),
        events.borrow(holderMargin, reserveOf("USDC"), 1_000_000_000n),
        events.deposit(holderMargin, mint("USDC"), 500_000_000n),
      ]),
    ],
    holderMargin.toBase58(),
  );
  assert.equal(entry.title, "TSLAx-USDC Long");
  assert.equal(entry.stock, "TSLAx");
  assert.equal(entry.strategy, "perps");
  assert.equal(entry.chips.map((chip) => chip.type).join(","), "deposit,borrow,swap");
  assert.equal(entry.chips[2].from.asset, "USDC");
  assert.equal(entry.chips[2].to.amount.raw, 421_198_486n);
});

test("a close has no borrow: the swap names the stock, order is swap, repay, withdraw", () => {
  const [entry] = marginActivityFrom(
    [
      txOf("sig-close", 1_790_000_200, [
        events.withdraw(holderMargin, mint("USDC"), 485_000_000n),
        events.repay(holderMargin, reserveOf("USDC"), 1_000_000_000n),
        events.swap(holderMargin, mint("TSLAx"), mint("USDC"), 421_198_486n, 1_496_904_441n),
      ]),
    ],
    holderMargin.toBase58(),
  );
  assert.equal(entry.title, "TSLAx-USDC Long");
  assert.equal(entry.chips.map((chip) => chip.type).join(","), "swap,repay,withdraw");
});

test("a short open borrows the stock", () => {
  const [entry] = marginActivityFrom(
    [
      txOf("sig-short", 1_790_000_300, [
        events.deposit(holderMargin, mint("TSLAx"), 100_000_000n),
        events.borrow(holderMargin, reserveOf("TSLAx"), 200_000_000n),
        events.swap(holderMargin, mint("TSLAx"), mint("USDC"), 300_000_000n, 1_000_000_000n),
      ]),
    ],
    holderMargin.toBase58(),
  );
  assert.equal(entry.title, "TSLAx-USDC Short");
  assert.equal(entry.strategy, "perps");
});

test("a long opened in two transactions: the swap that follows the borrow is a long, not a short", () => {
  const entries = marginActivityFrom(
    [
      txOf("sig-borrow", 1_790_000_100, [events.deposit(holderMargin, mint("USDC"), 40_000_000n), events.borrow(holderMargin, reserveOf("USDC"), 80_000_000n)]),
      txOf("sig-swap", 1_790_000_105, [events.swap(holderMargin, mint("USDC"), mint("TSLAx"), 120_000_000n, 322_811n)]),
    ],
    holderMargin.toBase58(),
  );
  assert.equal(entries[0].signature, "sig-swap");
  assert.equal(entries[0].title, "TSLAx-USDC Long");
  // A buy of the stock with no borrow before it still cannot be told apart from closing a short, and keeps its old label.
  const [alone] = marginActivityFrom([txOf("sig-alone", 1_790_000_900, [events.swap(holderMargin, mint("USDC"), mint("TSLAx"), 120_000_000n, 322_811n)])], holderMargin.toBase58());
  assert.equal(alone.title, "TSLAx-USDC Short");
});

test("Farm transactions are classified as farm, and other accounts' events are ignored", () => {
  const stranger = Keypair.generate().publicKey;
  const entries = marginActivityFrom(
    [
      txOf("sig-farm", 1_790_000_400, [events.deposit(holderMargin, mint("TSLAx"), 100_000_000n), events.liteOpened(holderMargin, liteStrategyAddress(mint("TSLAx")), 100_000_000n)]),
      txOf("sig-other", 1_790_000_500, [events.deposit(stranger, mint("USDC"), 5_000_000n)]),
      txOf("sig-none", 1_790_000_600, ["Program log: nothing"]),
    ],
    holderMargin.toBase58(),
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].strategy, "farm");
  assert.equal(entries[0].title, "TSLAx-USDC Farm");
});

test("entries are listed newest first", () => {
  const entries = marginActivityFrom(
    [txOf("old", 100, [events.deposit(holderMargin, mint("USDC"), 1_000_000n)]), txOf("new", 200, [events.deposit(holderMargin, mint("USDC"), 2_000_000n)])],
    holderMargin.toBase58(),
  );
  assert.equal(entries.map((entry) => entry.signature).join(","), "new,old");
  assert.equal(entries[0].title, null);
});

test("history amounts keep up to six decimals without trailing zeros, like the web app", () => {
  assert.equal(formatActivityAmount({ raw: 9_804_934n * 100n, decimals: 8 }), "9.804934");
  assert.equal(formatActivityAmount({ raw: 1_622_040_000n, decimals: 6 }), "1,622.04");
  assert.equal(formatActivityAmount({ raw: 3_486_887_642n, decimals: 6 }), "3,486.887642");
  assert.equal(formatActivityAmount({ raw: 500_000_000n, decimals: 6 }), "500");
});

test("history times read like Oct 2, 5:31 PM", () => {
  assert.match(formatDateTime(1_790_000_000), /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} (AM|PM)$/);
});

const { tradeLedger, interestAccrued, earningsSeries } = load("src/lib/perps/trade-earnings.ts");

const amt = (raw, decimals) => ({ raw, decimals });
const usdc = (raw) => amt(raw, 6);
const stockOf = (raw) => amt(raw, 8);
const borrowChip = (asset, amount) => ({ type: "borrow", leg: { asset, amount } });
const swapChip = (fromAsset, fromAmount, toAsset, toAmount) => ({ type: "swap", from: { asset: fromAsset, amount: fromAmount }, to: { asset: toAsset, amount: toAmount } });
const entryAt = (at, chips) => ({ signature: `sig-${at}`, at, strategy: chips.some((chip) => chip.type === "swap") ? "perps" : "unclassified", title: null, stock: null, chips });

test("a closed long realizes its price P&L and repays its principal", () => {
  const ledger = tradeLedger([
    entryAt(200, [swapChip("AAPLx", stockOf(210_000_000n), "USDC", usdc(726_300_000n))]),
    entryAt(100, [borrowChip("USDC", usdc(466_000_000n)), swapChip("USDC", usdc(699_000_000n), "AAPLx", stockOf(210_000_000n))]),
  ]);
  assert.equal(ledger.realized.length, 1);
  assert.equal(ledger.realized[0].at, 200);
  assert.equal(ledger.realized[0].pnl, 27_300_000n);
  assert.equal(ledger.principal.size, 0);
  assert.equal(ledger.unmatched, 0);
  assert.equal(ledger.firstAt, 100);
});

test("a short sold with deposited stock is only what is owed, and its interest is the extra stock owed", () => {
  const ledger = tradeLedger([entryAt(100, [borrowChip("OPENAI", amt(458_716_000n, 9)), swapChip("OPENAI", amt(917_432_000n, 9), "USDC", usdc(2_000_000_000n))])]);
  assert.equal(ledger.principal.get("OPENAI-short"), 458_716_000n);
  const interest = interestAccrued({
    positions: [{ id: "OPENAI-short", symbol: "OPENAI", side: "short" }],
    principal: ledger.principal,
    debt: { OPENAI: 468_716_000n },
    prices: { OPENAI: 2_000_000_000n },
    decimals: () => 9,
  });
  // 0.01 OPENAI more owed than borrowed, at $2,000.
  assert.equal(interest, 20_000_000n);
  // Buying the owed stock back at a lower price closes it at a profit on what was owed, not on the deposit.
  const closed = tradeLedger([
    entryAt(100, [borrowChip("OPENAI", amt(458_716_000n, 9)), swapChip("OPENAI", amt(917_432_000n, 9), "USDC", usdc(2_000_000_000n))]),
    entryAt(300, [swapChip("USDC", usdc(900_000_000n), "OPENAI", amt(458_716_000n, 9))]),
  ]);
  assert.equal(closed.realized[0].pnl, 100_000_000n);
  assert.equal(closed.principal.size, 0);
});

test("a borrow sent just before its swap opens the position with that principal", () => {
  const ledger = tradeLedger([
    entryAt(100, [borrowChip("USDC", usdc(1_000_000_000n))]),
    entryAt(160, [swapChip("USDC", usdc(1_500_000_000n), "TSLAx", stockOf(421_000_000n))]),
  ]);
  assert.equal(ledger.principal.get("TSLAx-long"), 1_000_000_000n);
  const late = tradeLedger([entryAt(100, [borrowChip("USDC", usdc(1_000_000_000n))]), entryAt(1_000, [swapChip("USDC", usdc(1_500_000_000n), "TSLAx", stockOf(421_000_000n))])]);
  assert.equal(late.principal.get("TSLAx-long"), 0n);
});

test("a partial close realizes its share and leaves the rest of the principal", () => {
  const ledger = tradeLedger([
    entryAt(100, [borrowChip("USDC", usdc(1_000_000_000n)), swapChip("USDC", usdc(1_500_000_000n), "TSLAx", stockOf(400_000_000n))]),
    entryAt(200, [swapChip("TSLAx", stockOf(100_000_000n), "USDC", usdc(400_000_000n))]),
  ]);
  // A quarter closed: $375 cost basis sold for $400.
  assert.equal(ledger.realized[0].pnl, 25_000_000n);
  assert.equal(ledger.principal.get("TSLAx-long"), 750_000_000n);
});

test("a close whose opening is older than history is not counted", () => {
  const ledger = tradeLedger([entryAt(200, [swapChip("TSLAx", stockOf(100_000_000n), "USDC", usdc(400_000_000n))])]);
  assert.equal(ledger.realized.length, 0);
  assert.equal(ledger.unmatched, 1);
});

test("longs share the USDC debt; interest is unknown when a position's principal is not in history", () => {
  const principal = new Map([["TSLAx-long", 1_000_000_000n], ["GOOGLx-long", 500_000_000n]]);
  const positions = [{ id: "TSLAx-long", symbol: "TSLAx", side: "long" }, { id: "GOOGLx-long", symbol: "GOOGLx", side: "long" }];
  assert.equal(interestAccrued({ positions, principal, debt: { USDC: 1_503_200_000n }, prices: {}, decimals: () => 8 }), 3_200_000n);
  assert.equal(interestAccrued({ positions, principal: new Map([["TSLAx-long", 1_000_000_000n]]), debt: { USDC: 1_503_200_000n }, prices: {}, decimals: () => 8 }), null);
  assert.equal(interestAccrued({ positions: [], principal, debt: { USDC: 9n }, prices: {}, decimals: () => 8 }), 0n);
});

test("the earnings series steps up at each close and ends at realized plus open P&L", () => {
  const day = 86_400_000;
  const now = 100 * day;
  const { points } = earningsSeries([{ at: (now - 6 * day) / 1000, pnl: 27_300_000n }], 48_000_000n, (now - 9 * day) / 1000, "1W", now);
  assert.equal(points[0].usd, 0n);
  assert.equal(points[points.length - 2].usd, 27_300_000n);
  assert.equal(points[points.length - 1].at, now);
  assert.equal(points[points.length - 1].usd, 75_300_000n);
});

const { buildMarkets } = load("src/lib/perps/build-markets.ts");

test("SKR, Solana Mobile's Seeker token, is listed as a crypto market with its DexScreener chart", () => {
  const pool = { supplyApyPercent: 2, borrowApyPercent: 4, totalSupply: 1_000_000, totalBorrowed: 250_000, utilizationPercent: 25, exchangeRate: 1_000_000_000n };
  const markets = buildMarkets({ USDC: pool, TSLAx: pool, SKR: pool }, { TSLAx: 400n * USD, SKR: 18_480n });
  const skr = markets.find((entry) => entry.symbol === "SKR");
  assert.equal(skr.kind, "Crypto");
  assert.equal(skr.name, "Seeker");
  assert.equal(skr.pair, "SKR-USDC");
  // 750,000 SKR available at $0.01848.
  assert.equal(skr.liquidityUsd, 13_860n * USD);
  assert.equal(markets.find((entry) => entry.symbol === "TSLAx").kind, "xStocks");
  const chart = chartSourceFor("SKR");
  assert.equal(chart.kind, "dexscreener");
  assert.equal(chart.pairAddress, "VY1ZQXjqBwvuWgVfTfhqanJe96GGoQrX7xZZDrWPGiT");
});

test("a failed margin transaction is listed and marked, with what it logged or with no legs at all", () => {
  const failedMeta = (lines, accountKeys = []) => ({ err: { InstructionError: [2, { Custom: 6024 }] }, logMessages: lines });
  const attempted = { signature: "sig-failed", blockTime: 1_790_001_000, status: "failed", tx: { meta: failedMeta([events.deposit(holderMargin, mint("USDC"), 10_000_000n)]), transaction: { message: { accountKeys: [] } } } };
  const bare = { signature: "sig-bare", blockTime: 1_790_001_100, status: "failed", tx: { meta: failedMeta(["Program log: nothing"]), transaction: { message: { accountKeys: [{ pubkey: holderMargin }] } } } };
  const elsewhere = { signature: "sig-elsewhere", blockTime: 1_790_001_200, status: "failed", tx: { meta: failedMeta(["Program log: nothing"]), transaction: { message: { accountKeys: [] } } } };
  const listed = marginActivityFrom([attempted, bare, elsewhere], holderMargin.toBase58(), { includeFailed: true });
  assert.deepEqual(listed.map((entry) => entry.signature).join(","), "sig-bare,sig-failed");
  assert.ok(listed.every((entry) => entry.status === "failed"));
  assert.equal(listed[0].chips.length, 0);
  assert.equal(listed[1].chips[0].type, "deposit");
  // Left out unless asked for: everything that counts money reads only what went through.
  assert.equal(marginActivityFrom([attempted, bare], holderMargin.toBase58()).length, 0);
});
