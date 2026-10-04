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
const { PriceImpactError } = load("src/lib/solana/perps-errors.ts");

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

test("an error nothing recognises keeps its text as a detail line, and a slow lookup table has its own message", () => {
  const unknown = toTransactionError(new Error("signTransactions failed: unexpected payload"));
  assert.equal(unknown.title, "Something went wrong");
  assert.match(unknown.detail, /unexpected payload/);
  assert.equal(toTransactionError(new Error("The lookup table was not ready in time. Nothing else was sent.")).title, "The network was slow");
});

test("wallet cancellation and missing fees keep their own messages", () => {
  assert.equal(toTransactionError(new Error("CancellationException: user declined")).kind, "rejected");
  assert.equal(toTransactionError(new TransactionFailedError("Attempt to debit an account but found no record of a prior credit.")).kind, "no-fee");
});

test("a wallet that never held SOL is told it needs SOL, not that the network failed", () => {
  const unfunded = toTransactionError(new TransactionFailedError('"AccountNotFound"'));
  assert.equal(unfunded.kind, "no-fee");
  assert.equal(unfunded.title, "Not enough SOL");
  assert.equal(toTransactionError(new TransactionFailedError('"InsufficientFundsForRent"')).kind, "no-fee");
});

test("a rejected simulation is reported as a failed transaction, not a connection problem", () => {
  const failed = toTransactionError(new TransactionFailedError('{"InstructionError":[0,"InvalidAccountData"]}'));
  assert.equal(failed.title, "Transaction failed");
  assert.doesNotMatch(failed.message, /connection/);
});

const { sendAndConfirm, ConfirmationLostError } = load("src/lib/solana/send-transaction.ts");
const dropped = () => new Error("fetch failed: java.net.UnknownHostException: Unable to resolve host");
const signedStub = { serialize: () => new Uint8Array([1]), message: { recentBlockhash: "stub" } };

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

test("send, processed and confirmed are reported in order as the network answers", async () => {
  const stages = [];
  const answers = [{ value: [null] }, { value: [{ err: null, confirmationStatus: "processed" }] }, { value: [{ err: null, confirmationStatus: "processed" }] }, { value: [{ err: null, confirmationStatus: "confirmed" }] }];
  let polls = 0;
  const connection = {
    sendRawTransaction: async () => "sig-1",
    getSignatureStatuses: async () => answers[polls++],
    getBlockHeight: async () => 1,
  };
  const signature = await sendAndConfirm(connection, signedStub, 100, { onSent: (sent) => stages.push(`sent:${sent}`), onProcessed: () => stages.push("processed") });
  assert.equal(signature, "sig-1");
  assert.equal(stages.join(","), "sent:sig-1,processed");
});

function sendModule(heal) {
  return loadTs("src/lib/solana/send-transaction.ts", { ...stubs, "./heal-pools": { healStaleDexPools: heal } }, new Map());
}

test("a failed simulation re-clones stale pools once and then simulates again before the wallet is asked", async () => {
  let healed = 0;
  let simulations = 0;
  let signed = false;
  const { simulateSignAndSend } = sendModule(async () => ++healed);
  const connection = {
    simulateTransaction: async () => (++simulations === 1 ? { value: { err: { InstructionError: [2, { Custom: 6001 }] }, logs: [] } } : { value: { err: null } }),
    sendRawTransaction: async () => "sig",
    getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: "confirmed" }] }),
    getBlockHeight: async () => 1,
  };
  const hooks = {
    sign: async (tx) => {
      signed = true;
      return { serialize: () => new Uint8Array([1]), message: { recentBlockhash: "stub" } };
    },
    onSigned: () => {},
  };
  assert.equal(await simulateSignAndSend(connection, {}, 100, hooks), "sig");
  assert.equal(healed, 1);
  assert.equal(simulations, 2);
  assert.equal(signed, true);
});

test("when nothing could be healed the failure is reported and the wallet is never asked", async () => {
  const { simulateSignAndSend } = sendModule(async () => 0);
  let signed = false;
  const connection = { simulateTransaction: async () => ({ value: { err: { InstructionError: [2, { Custom: 6001 }] }, logs: ["Program failed"] } }) };
  const hooks = {
    sign: async () => {
      signed = true;
    },
    onSigned: () => {},
  };
  await assert.rejects(simulateSignAndSend(connection, {}, 100, hooks), /6001/);
  assert.equal(signed, false);
});

const { fetchWalletTransactions } = load("src/lib/solana/wallet-transactions.ts");

test("refreshing the history only fetches transactions it has not seen", async () => {
  const wallet = "BvR8HTMVgVZMWfaA76K8LTeGmN58u2AgnxpHcGtCV5Nb";
  let listed = [
    { signature: "sigB", blockTime: 20, err: null },
    { signature: "sigA", blockTime: 10, err: null },
  ];
  const fetched = [];
  const connection = {
    getSignaturesForAddress: async () => listed,
    getParsedTransaction: async (signature) => {
      fetched.push(signature);
      return { meta: { err: null }, transaction: { message: {} } };
    },
  };

  const first = await fetchWalletTransactions(connection, wallet);
  assert.equal(first.length, 2);
  assert.equal(fetched.join(","), "sigB,sigA");

  listed = [{ signature: "sigC", blockTime: 30, err: null }, ...listed, { signature: "sigFailed", blockTime: 5, err: { InstructionError: [0, "Custom"] } }];
  const second = await fetchWalletTransactions(connection, wallet);
  assert.equal(second.map((entry) => entry.signature).join(","), "sigC,sigB,sigA");
  assert.equal(fetched.join(","), "sigB,sigA,sigC");
});

test("the wallet is only asked once the transaction has been built and checked, and that is announced first", async () => {
  const { simulateSignAndSend } = sendModule(async () => 0);
  const order = [];
  const connection = {
    simulateTransaction: async () => {
      order.push("simulated");
      return { value: { err: null } };
    },
    sendRawTransaction: async () => "sig",
    getSignatureStatuses: async () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
  };
  const hooks = {
    onPrepared: () => order.push("prepared"),
    sign: async () => {
      order.push("signing");
      return { serialize: () => new Uint8Array([1]), message: { recentBlockhash: "stub" } };
    },
    onSigned: () => order.push("signed"),
  };
  await simulateSignAndSend(connection, {}, 100, hooks);
  assert.equal(order.join(","), "simulated,prepared,signing,signed");
});

const { lastValidHeightOf, signWithFreshBlockhash } = load("src/lib/solana/fresh-blockhash.ts");

test("a transaction is re-stamped with the newest blockhash while the wallet is still opening", async () => {
  let height = 100;
  const connection = {
    getLatestBlockhash: async () => {
      height += 1;
      return { blockhash: `hash${height}`, lastValidBlockHeight: height + 150 };
    },
  };
  const transaction = { message: { recentBlockhash: "built" } };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const signed = await signWithFreshBlockhash(connection, [transaction], async () => {
    await wait(3300);
    return transaction.message.recentBlockhash;
  });
  assert.notEqual(signed, "built");
  assert.equal(lastValidHeightOf(signed, 0), Number(signed.slice(4)) + 150);

  await wait(1800);
  assert.equal(transaction.message.recentBlockhash, signed, "nothing changes once the wallet has answered");
  assert.equal(lastValidHeightOf("unknown", 7), 7);
});

test("a blockhash the network no longer knows reads as an expired request", () => {
  const error = toTransactionError(new Error("Simulation failed. Message: Transaction simulation failed: Blockhash not found."));
  assert.equal(error.kind, "expired");
});

const { sendBatches, PartialSendError } = load("src/lib/solana/send-batches.ts");
const { TransactionInstruction } = require("@solana/web3.js");

function batchFixture({ failSecond = false } = {}) {
  const sent = [];
  const connection = {
    getLatestBlockhash: async () => ({ blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 500 }),
    simulateTransaction: async () => ({ value: { err: null, logs: [] } }),
    sendRawTransaction: async () => {
      sent.push(true);
      if (failSecond && sent.length === 2) throw new Error("second leg refused");
      return `sig${sent.length}`;
    },
    getSignatureStatuses: async () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    getBlockHeight: async () => 100,
  };
  const prompts = [];
  const hooks = {
    sign: async (transaction) => transaction,
    signAll: async (transactions) => {
      prompts.push(transactions.length);
      return transactions;
    },
    onSigned: () => undefined,
  };
  return { connection, hooks, prompts, sent };
}

const bulky = () => new TransactionInstruction({ programId: owner, keys: [], data: Buffer.alloc(700) });

test("batches that do not fit together are signed in one prompt and sent in order", async () => {
  const { connection, hooks, prompts, sent } = batchFixture();
  const signature = await sendBatches(connection, owner, { computeUnits: 600_000, batches: [[bulky()], [bulky()]], retrySafe: true }, hooks);
  assert.deepEqual(prompts, [2]);
  assert.equal(sent.length, 2);
  assert.equal(signature, "sig2");
});

test("batches that fit together go out as one transaction", async () => {
  const { connection, hooks, prompts, sent } = batchFixture();
  const small = () => new TransactionInstruction({ programId: owner, keys: [], data: Buffer.alloc(20) });
  await sendBatches(connection, owner, { computeUnits: 600_000, batches: [[small()], [small()]], retrySafe: true }, { ...hooks, sign: async (transaction) => transaction });
  assert.equal(sent.length, 1);
  assert.deepEqual(prompts, []);
});

test("a later leg that fails after an earlier one landed is reported as partial unless repeating the first is harmless", async () => {
  const unsafe = batchFixture({ failSecond: true });
  await assert.rejects(sendBatches(unsafe.connection, owner, { computeUnits: 600_000, batches: [[bulky()], [bulky()]], retrySafe: false }, unsafe.hooks), (error) => error instanceof PartialSendError && error.landed === 1);
  const safe = batchFixture({ failSecond: true });
  await assert.rejects(sendBatches(safe.connection, owner, { computeUnits: 600_000, batches: [[bulky()], [bulky()]], retrySafe: true }, safe.hooks), /second leg refused/);
});

test("a partial send reads as a partial failure with the real reason attached", () => {
  const error = toTransactionError(new PartialSendError(1, new TransactionFailedError('{"InstructionError":[0,{"Custom":6018}]} Program ' + PROGRAM + " failed: custom program error: 0x1782")));
  assert.equal(error.kind, "partial");
  assert.match(error.message, /Not enough free liquidity/);
});

test("a refused wallet connection says so instead of a generic failure", () => {
  assert.equal(toTransactionError(new Error("SolanaMobileWalletAdapterProtocolError -1/authorization request failed -1")).title, "Your wallet refused this");
});

test("a wallet app that never answers the local connection says so", () => {
  const error = toTransactionError(new Error("SolanaMobileWalletAdapterError com.solana.mobilewalletadapter.clientlib.scenario.LocalAssociationScenario$ConnectionFailedException: Unable to connect to websocket server EUNSPECIFIED"));
  assert.equal(error.title, "Could not reach your wallet");
});

test("each transaction that lands reports how many batches have landed so far", async () => {
  const split = batchFixture();
  const seen = [];
  await sendBatches(split.connection, owner, { computeUnits: 600_000, batches: [[bulky()], [bulky()]], retrySafe: true, onLanded: (count) => seen.push(count) }, split.hooks);
  assert.deepEqual(seen, [1, 2]);

  const together = batchFixture();
  const small = () => new TransactionInstruction({ programId: owner, keys: [], data: Buffer.alloc(20) });
  const merged = [];
  await sendBatches(together.connection, owner, { computeUnits: 600_000, batches: [[small()], [small()], [small()]], retrySafe: true, onLanded: (count) => merged.push(count) }, together.hooks);
  assert.deepEqual(merged, [3]);
});

test("a stopped send keeps the count of what landed, so a retry can start after it", async () => {
  const stopped = batchFixture({ failSecond: true });
  const seen = [];
  await assert.rejects(sendBatches(stopped.connection, owner, { computeUnits: 600_000, batches: [[bulky()], [bulky()]], retrySafe: false, onLanded: (count) => seen.push(count) }, stopped.hooks), PartialSendError);
  assert.deepEqual(seen, [1]);
});

const { isWalletRefusal } = load("src/lib/solana/transaction-errors.ts");

test("only a wallet that refused to authorize the app counts as a refusal worth trying again", () => {
  assert.equal(isWalletRefusal(new Error("SolanaMobileWalletAdapterProtocolError -1/authorization request failed -1")), true);
  assert.equal(isWalletRefusal(new Error("CancellationException: user declined")), false);
  assert.equal(isWalletRefusal(new TransactionFailedError('{"InstructionError":[0,{"Custom":6018}]}')), false);
});

test("an account too big for one order reads as too many open positions", () => {
  assert.equal(toTransactionError(new RangeError("This action is too large to send in one transaction")).title, "Order too large");
  assert.equal(toTransactionError(new RangeError("encoding overruns Uint8Array")).title, "Order too large");
});

const { AddressLookupTableAccount } = require("@solana/web3.js");

// Forty distinct read-only accounts do not fit in one transaction (40 x 32 bytes) and do once a table holds them.
function crowded() {
  const keys = Array.from({ length: 40 }, () => Keypair.generate().publicKey);
  const instruction = new TransactionInstruction({ programId: owner, keys: keys.map((pubkey) => ({ pubkey, isSigner: false, isWritable: false })), data: Buffer.alloc(8) });
  return { keys, instruction };
}

function tableFixture(keys) {
  const base = batchFixture();
  let slot = 100;
  const connection = {
    ...base.connection,
    getSlot: async () => (slot += 1),
    getAddressLookupTable: async (address) => ({
      value: new AddressLookupTableAccount({ key: address, state: { deactivationSlot: 2n ** 64n - 1n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: owner, addresses: keys } }),
    }),
  };
  return { ...base, connection };
}

test("an order that fits no other way gets a table made on the fork, with one extra wallet prompt", async () => {
  const { keys, instruction } = crowded();
  const { connection, hooks, prompts, sent } = tableFixture(keys);
  let single = 0;
  const counted = { ...hooks, sign: async (transaction) => { single += 1; return hooks.sign(transaction); } };
  await sendBatches(connection, owner, { computeUnits: 600_000, batches: [[instruction]], retrySafe: false, allowForkTable: true }, counted);
  assert.deepEqual(prompts, [2], "the table is made in two transactions, approved together in one prompt");
  assert.equal(single, 1, "then the order itself is one more prompt");
  assert.equal(sent.length, 3, "create and first extend, the second extend, then the order");
});

test("without permission to make a table the same order is reported as too large", async () => {
  const { keys, instruction } = crowded();
  const { connection, hooks, prompts } = tableFixture(keys);
  await assert.rejects(sendBatches(connection, owner, { computeUnits: 600_000, batches: [[instruction]], retrySafe: false }, hooks), RangeError);
  assert.deepEqual(prompts, []);
});

test("a price impact over the limit keeps its own message instead of the generic error", () => {
  const error = toTransactionError(new PriceImpactError(860));
  assert.equal(error.title, "Price impact too high");
  assert.match(error.message, /8\.6%.*Try a smaller amount\. Nothing was sent\./);
});
