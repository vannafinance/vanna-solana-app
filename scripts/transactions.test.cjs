const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const { loadTs } = require("./load-ts.cjs");

const PROGRAM = "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg";
const stubs = { "./config": { VANNA_PROGRAM_ID: PROGRAM, API_BASE_URL: "https://example.test" } };
const cache = new Map();
const load = (file) => loadTs(file, stubs, cache);

const { createMarginInstruction, lenderSupplyInstruction, lenderRedeemInstruction } = load("src/lib/solana/vanna-instructions.ts");
const { marginAddress, reserveAddress, shareMintAddress, associatedTokenAddress, TOKEN_PROGRAM, TOKEN_2022_PROGRAM, ASSOCIATED_TOKEN_PROGRAM } = load("src/lib/solana/program-accounts.ts");
const { supplyInstructions, redeemInstructions } = load("src/lib/solana/earn-transactions.ts");
const { assets } = load("src/lib/solana/assets.ts");
const { sharesToRedeem } = load("src/lib/earn/share-math.ts");
const { spendableBalance } = load("src/lib/earn/spendable-balance.ts");
const { toTransactionError } = load("src/lib/solana/transaction-errors.ts");
const { TransactionFailedError } = load("src/lib/solana/send-transaction.ts");

const owner = Keypair.generate().publicKey;
const asset = (symbol) => assets.find((candidate) => candidate.symbol === symbol);
const flags = (ix) => ix.keys.map((key) => `${key.isSigner ? "S" : "-"}${key.isWritable ? "W" : "-"}`).join(" ");
const mintOf = (symbol) => new PublicKey(asset(symbol).mint);

test("create margin: discriminator, no args and the IDL account order", () => {
  const ix = createMarginInstruction(owner);
  assert.deepEqual([...ix.data], [105, 23, 202, 134, 147, 166, 130, 205]);
  assert.equal(ix.programId.toBase58(), PROGRAM);
  assert.equal(flags(ix), "S- SW -W --");
  assert.equal(ix.keys[2].pubkey.toBase58(), marginAddress(owner).toBase58());
  assert.equal(ix.keys[3].pubkey.toBase58(), SystemProgram.programId.toBase58());
});

test("lender supply: both u64 args little endian and the IDL account flags", () => {
  const usdc = asset("USDC");
  const source = associatedTokenAddress(owner, mintOf("USDC"), TOKEN_PROGRAM);
  const ix = lenderSupplyInstruction({ lender: owner, asset: usdc, lenderTokenAccount: source, amount: 1_500_000n, minSharesOut: 1n });
  assert.deepEqual([...ix.data.subarray(0, 8)], [52, 247, 77, 250, 74, 122, 100, 33]);
  assert.equal(ix.data.readBigUInt64LE(8), 1_500_000n);
  assert.equal(ix.data.readBigUInt64LE(16), 1n);
  assert.equal(ix.data.length, 24);
  assert.equal(flags(ix), "SW -- -- -W -- -W -W -W -W -- -- -- --");
  assert.equal(ix.keys[3].pubkey.toBase58(), reserveAddress(mintOf("USDC")).toBase58());
  assert.equal(ix.keys[7].pubkey.toBase58(), shareMintAddress(mintOf("USDC")).toBase58());
  assert.equal(ix.keys[11].pubkey.toBase58(), ASSOCIATED_TOKEN_PROGRAM.toBase58());
});

test("lender redeem: discriminator, args and the IDL account flags", () => {
  const usdc = asset("USDC");
  const destination = associatedTokenAddress(owner, mintOf("USDC"), TOKEN_PROGRAM);
  const ix = lenderRedeemInstruction({ lender: owner, asset: usdc, lenderTokenAccount: destination, shares: 7n, minAssetsOut: 0n });
  assert.deepEqual([...ix.data.subarray(0, 8)], [22, 48, 40, 70, 164, 48, 75, 224]);
  assert.equal(ix.data.readBigUInt64LE(8), 7n);
  assert.equal(ix.data.readBigUInt64LE(16), 0n);
  assert.equal(flags(ix), "S- -- -- -W -- -W -W -W -W -- --");
});

test("amounts that do not fit in u64 are rejected", () => {
  const usdc = asset("USDC");
  const source = associatedTokenAddress(owner, mintOf("USDC"), TOKEN_PROGRAM);
  assert.throws(() => lenderSupplyInstruction({ lender: owner, asset: usdc, lenderTokenAccount: source, amount: 1n << 64n, minSharesOut: 1n }), RangeError);
});

test("xStocks use Token-2022 for the underlying and the classic program for shares", () => {
  const tsla = asset("TSLAx");
  const source = associatedTokenAddress(owner, mintOf("TSLAx"), TOKEN_2022_PROGRAM);
  const ix = lenderSupplyInstruction({ lender: owner, asset: tsla, lenderTokenAccount: source, amount: 10n, minSharesOut: 1n });
  assert.equal(ix.keys[9].pubkey.toBase58(), TOKEN_2022_PROGRAM.toBase58());
  assert.equal(ix.keys[10].pubkey.toBase58(), TOKEN_PROGRAM.toBase58());
  const vault = associatedTokenAddress(reserveAddress(mintOf("TSLAx")), mintOf("TSLAx"), TOKEN_2022_PROGRAM);
  assert.equal(ix.keys[6].pubkey.toBase58(), vault.toBase58());
});

test("supplying SOL wraps it first: create account, transfer, sync, supply", () => {
  const instructions = supplyInstructions(owner, asset("SOL"), 250_000_000n);
  assert.equal(instructions.length, 4);
  assert.equal(instructions[0].programId.toBase58(), ASSOCIATED_TOKEN_PROGRAM.toBase58());
  assert.equal(instructions[1].programId.toBase58(), SystemProgram.programId.toBase58());
  assert.equal(instructions[1].data.readBigUInt64LE(4), 250_000_000n);
  assert.deepEqual([...instructions[2].data], [17]);
  assert.equal(instructions[3].programId.toBase58(), PROGRAM);
});

test("supplying a token only prepares its account, never wraps", () => {
  const instructions = supplyInstructions(owner, asset("USDC"), 1_000_000n);
  assert.equal(instructions.length, 2);
  assert.deepEqual([...instructions[0].data], [1]);
});

test("redeeming SOL goes through a temporary wrapped account that is closed in the same transaction", async () => {
  const instructions = await redeemInstructions(owner, asset("SOL"), 5n, 2_039_280);
  assert.equal(instructions.length, 4);
  assert.equal(instructions[0].programId.toBase58(), SystemProgram.programId.toBase58());
  assert.equal(instructions[1].data[0], 18);
  assert.equal(instructions[2].programId.toBase58(), PROGRAM);
  assert.deepEqual([...instructions[3].data], [9]);
  assert.equal(instructions[3].keys[1].pubkey.toBase58(), owner.toBase58());
  assert.equal(instructions[2].keys[5].pubkey.toBase58(), instructions[3].keys[0].pubkey.toBase58());
});

test("redeeming a token delivers to the owner's account, created if missing", async () => {
  const instructions = await redeemInstructions(owner, asset("USDC"), 5n, 2_039_280);
  assert.equal(instructions.length, 2);
  assert.equal(instructions[1].keys[5].pubkey.toBase58(), associatedTokenAddress(owner, mintOf("USDC"), TOKEN_PROGRAM).toBase58());
});

test("share redemption: full position is exact, partial rounds up, never above what is held", () => {
  const rate = 1_050_000n;
  assert.equal(sharesToRedeem(1_050_000n, 1_050_000n, 1_000_000n, rate), 1_000_000n);
  assert.equal(sharesToRedeem(2_000_000n, 1_050_000n, 1_000_000n, rate), 1_000_000n);
  assert.equal(sharesToRedeem(525_000n, 1_050_000n, 1_000_000n, rate), 500_000n);
  assert.equal(sharesToRedeem(1n, 1_050_000n, 1_000_000n, rate), 1n);
  assert.equal(sharesToRedeem(1_049_999n, 1_050_000n, 999_999n, rate), 999_999n);
});

test("SOL keeps a fee reserve out of what can be supplied", () => {
  assert.equal(spendableBalance("SOL", 1_000_000_000n), 990_000_000n);
  assert.equal(spendableBalance("SOL", 5_000_000n), 0n);
  assert.equal(spendableBalance("USDC", 5_000_000n), 5_000_000n);
});

test("Vanna program errors become specific messages", () => {
  const failure = (code) => new TransactionFailedError(`{"InstructionError":[2,{"Custom":${code}}]} Program ${PROGRAM} failed: custom program error: 0x${code.toString(16)}`);
  assert.equal(toTransactionError(failure(6015)).title, "Vault is full");
  assert.equal(toTransactionError(failure(6018)).title, "Not enough free liquidity");
  assert.equal(toTransactionError(failure(6004)).title, "Action paused");
});

test("wallet cancellation and missing fees keep their own messages", () => {
  assert.equal(toTransactionError(new Error("CancellationException: user declined")).kind, "rejected");
  assert.equal(toTransactionError(new TransactionFailedError("Attempt to debit an account but found no record of a prior credit.")).kind, "no-fee");
});

const { sendAndConfirm, ConfirmationLostError } = load("src/lib/solana/send-transaction.ts");
const dropped = () => new Error("fetch failed: java.net.UnknownHostException: Unable to resolve host");
const signedStub = { serialize: () => new Uint8Array([1]) };

test("a dropped connection while sending is retried, then the transaction confirms", async () => {
  let sends = 0;
  const connection = {
    sendRawTransaction: async () => {
      if (++sends < 3) throw dropped();
      return "sig";
    },
    getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: "confirmed" }] }),
    getBlockHeight: async () => 1,
  };
  assert.equal(await sendAndConfirm(connection, signedStub, 100), "sig");
  assert.equal(sends, 3);
});

test("a failed status check after sending does not fail the transaction", async () => {
  let polls = 0;
  const connection = {
    sendRawTransaction: async () => "sig",
    getSignatureStatuses: async () => {
      if (++polls < 3) throw dropped();
      return { value: [{ err: null, confirmationStatus: "finalized" }] };
    },
    getBlockHeight: async () => 1,
  };
  assert.equal(await sendAndConfirm(connection, signedStub, 100), "sig");
});

test("a sustained outage after sending is reported as an unknown outcome, not a failed send", async () => {
  const connection = {
    sendRawTransaction: async () => "sig",
    getSignatureStatuses: async () => {
      throw dropped();
    },
    getBlockHeight: async () => 1,
  };
  await assert.rejects(sendAndConfirm(connection, signedStub, 100), (error) => error instanceof ConfirmationLostError && error.signature === "sig");
});

test("a program failure is never retried", async () => {
  let sends = 0;
  const connection = {
    sendRawTransaction: async () => {
      sends++;
      throw new Error("Transaction simulation failed: custom program error: 0x1");
    },
  };
  await assert.rejects(sendAndConfirm(connection, signedStub, 100));
  assert.equal(sends, 1);
});

test("connection drops get their own messages", () => {
  assert.equal(toTransactionError(dropped()).title, "Can't reach Solana");
  assert.equal(toTransactionError(new ConfirmationLostError("sig")).title, "Could not confirm");
});
