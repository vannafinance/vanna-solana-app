import {
  Account,
  BASE_FEE,
  Contract,
  Memo,
  nativeToScVal,
  Operation,
  scValToNative,
  SorobanDataBuilder,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-base";

import { requireActiveRealWallet, signStellar } from "@/chain/sign";

import { EARN_POOLS, NETWORK_PASSPHRASE, RPC_URLS } from "./config";
import { readContract } from "./read";

type SimOk = {
  error?: string;
  transactionData?: string;
  minResourceFee?: string;
  results?: { auth?: string[] }[];
};

export interface SubmitContractOpts {
  feeMultiplier?: number;
  timeoutSecs?: number;
  extraWriteBytes?: number;
  extraResourceFee?: bigint;
  /** A text memo (at most 28 bytes), e.g. for an exchange deposit. */
  memo?: string;
}

export async function rpc<T>(method: string, params: object): Promise<T> {
  let last: unknown;
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!res.ok) throw new Error(`RPC ${res.status}`);
      const body = (await res.json()) as { result?: T; error?: { message?: string } };
      if (body.error) throw new Error(body.error.message ?? "RPC error");
      if (body.result === undefined) throw new Error("RPC returned no result");
      return body.result;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

// Ported from: apps/stellar/lib/stellar-utils.ts:WalletService.getBalance
export async function sourceAccount(address: string): Promise<Account> {
  const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
  if (!res.ok) throw new Error(res.status === 404 ? "That Stellar account is not on testnet yet" : `Account lookup failed (${res.status})`);
  const body = (await res.json()) as { sequence?: string };
  if (!body.sequence) throw new Error("Account has no sequence");
  return new Account(address, body.sequence);
}

// A reserve reads its interest curve only when time has passed since its last accrual, so a transaction simulated on the ledger that just
// accrued misses that key and fails on chain one ledger later ("outside of the footprint"). Waiting until the network is past our last
// transaction's ledger before simulating the next one makes chained flows (deposit -> borrow, borrow -> deploy) safe
// (web credit-layer.ts waitPastLedger).
let lastSubmittedLedger = 0;

async function waitPastLedger(ledger: number): Promise<void> {
  if (!ledger) return;
  for (let i = 0; i < 12; i++) {
    try {
      const latest = await rpc<{ sequence: number }>("getLatestLedger", {});
      if (latest.sequence > ledger) return;
    } catch {
      // keep waiting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// Ported from: apps/stellar/lib/stellar-utils.ts:describeSendError
export function describeSendError(sent: { errorResultXdr?: string; status?: string }): string {
  if (sent.errorResultXdr) {
    try {
      const res = xdr.TransactionResult.fromXDR(sent.errorResultXdr, "base64");
      const code = res.result().switch().name;
      if (code) return code;
    } catch {
      // Fall through to status or unknown
    }
  }
  return sent.status || "unknown";
}

// Ported from: apps/stellar/lib/stellar-utils.ts:describeFailedTx
export function describeFailedTx(finalResult: { diagnosticEventsXdr?: string[] } | Record<string, unknown>): string {
  try {
    const events: string[] = (finalResult as { diagnosticEventsXdr?: string[] })?.diagnosticEventsXdr ?? [];
    const reasons: string[] = [];
    for (const evXdr of events) {
      try {
        const ev = typeof evXdr === "string" ? xdr.DiagnosticEvent.fromXDR(evXdr, "base64") : evXdr;
        const body = ev.event().body().v0();
        const topics = body.topics().map((t: xdr.ScVal) => scValToNative(t));
        if (!topics.includes("error")) continue;
        const data = scValToNative(body.data());
        const errorCode = topics.find((t: unknown) => typeof t === "object" && t !== null && "value" in t) as { value?: unknown } | undefined;
        reasons.push([errorCode?.value, ...(Array.isArray(data) ? data : [data])].filter(Boolean).join(": "));
      } catch {
        // Skip events that don't decode as a v0 diagnostic event
      }
    }
    return reasons.join("; ");
  } catch {
    return "";
  }
}

// Ported from: apps/stellar/lib/stellar-utils.ts:isFootprintRaceError
export function isFootprintRaceError(raw: unknown): boolean {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? {});
  if (/contractdata size exceeds|size exceeds network config maximum/i.test(text)) return false;
  return (
    text.includes("outside of the footprint") ||
    text.includes("exceeded_limit") ||
    /budget|exceededlimit|resource|try_again_later|txbadseq|txsorobaninvalid|txtoolate/i.test(text)
  );
}

// Ported from: apps/stellar/lib/stellar-utils.ts:resubmitOnTryAgainLater
export async function resubmitOnTryAgainLater(
  signedTxXdr: string,
  initialResult: { status?: string; hash?: string; errorResultXdr?: string },
  maxAttempts = 3,
  delayMs = 1500,
): Promise<{ status?: string; hash?: string; errorResultXdr?: string }> {
  let result = initialResult;
  for (let attempt = 0; result.status === "TRY_AGAIN_LATER" && attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await rpc<{ status?: string; hash?: string; errorResultXdr?: string }>("sendTransaction", {
      transaction: signedTxXdr,
    });
  }
  return result;
}

// Ported from: apps/stellar/lib/stellar-utils.ts:withFootprintRaceRetry
export async function withFootprintRaceRetry<T>(
  attempt: () => Promise<T>,
  label = "Transaction",
): Promise<T> {
  const RETRY_DELAYS_MS = [2000, 4000];
  try {
    return await attempt();
  } catch (err: unknown) {
    if (!isFootprintRaceError(err)) throw err;
    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      console.warn(`[${label}] Footprint/sequence race detected; retrying attempt ${i + 2}...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
      try {
        return await attempt();
      } catch (retryErr: unknown) {
        if (i === RETRY_DELAYS_MS.length - 1 || !isFootprintRaceError(retryErr)) {
          throw retryErr;
        }
      }
    }
    throw err;
  }
}

// Puts the simulation's SorobanTransactionData into an unsigned transaction without decoding it. The data is [ext][resources: footprint,
// instructions u32, diskReadBytes u32, writeBytes u32][resourceFee i64], so the last 20 bytes are fixed-size and are patched for the
// same headroom the decoded path adds (more write bytes, more resource fee). The envelope is [type 4][source 36][fee u32][...][ext 4]
// [signatures 4]: the fee field becomes inclusion + resource fee, and the ext (0) becomes 1 followed by the data.
function spliceSorobanData(unsignedXdr: string, dataB64: string, inclusionFee: string, extraWrite: number, extraFee: bigint): string {
  // plain byte arrays and DataView only: the app's Buffer polyfill lacks some of the read / write helpers
  const data = new Uint8Array(Buffer.from(dataB64, "base64"));
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const n = data.length;
  dv.setUint32(n - 12, dv.getUint32(n - 12) + extraWrite);
  // the fee is a positive int64: two 32-bit halves
  const resourceFee = ((BigInt(dv.getUint32(n - 8)) << 32n) | BigInt(dv.getUint32(n - 4))) + extraFee;
  dv.setUint32(n - 8, Number(resourceFee >> 32n));
  dv.setUint32(n - 4, Number(resourceFee & 0xffffffffn));
  const env = new Uint8Array(Buffer.from(unsignedXdr, "base64"));
  const headLen = env.length - 8; // drops the empty ext and the empty signature list
  const out = new Uint8Array(headLen + 4 + n + 4);
  out.set(env.subarray(0, headLen), 0);
  new DataView(out.buffer).setUint32(40, Number(BigInt(inclusionFee) + resourceFee));
  new DataView(out.buffer).setUint32(headLen, 1);
  out.set(data, headLen + 4);
  return Buffer.from(out).toString("base64");
}
// Ported from: apps/stellar/lib/stellar-utils.ts:ContractService.pollTransactionStatus and addResourceHeadroom
export async function submitContract(
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  opts?: SubmitContractOpts,
): Promise<string> {
  return withFootprintRaceRetry(async () => {
    await waitPastLedger(lastSubmittedLedger);
    const account = await sourceAccount(source);
    const multiplier = Math.max(1, opts?.feeMultiplier ?? 1);
    const inclusionFee = (parseInt(BASE_FEE, 10) * multiplier).toString();
    const timeout = opts?.timeoutSecs ?? 300;

    const memo = opts?.memo?.trim();
    if (memo && new TextEncoder().encode(memo).length > 28) throw new Error("A memo can be at most 28 characters");
    const unsignedBuilder = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
      fee: inclusionFee,
      networkPassphrase: NETWORK_PASSPHRASE,
    }).addOperation(new Contract(contractId).call(method, ...args));
    if (memo) unsignedBuilder.addMemo(Memo.text(memo));
    const unsigned = unsignedBuilder.setTimeout(timeout).build();

    const sim = await rpc<SimOk>("simulateTransaction", { transaction: unsigned.toXDR() });
    if (sim.error || !sim.transactionData || !sim.minResourceFee) {
      throw new Error(sim.error || `${method} could not be prepared`);
    }

    const invoke = unsigned.operations[0] as Operation.InvokeHostFunction;
    const auth = (sim.results?.[0]?.auth ?? []).map((entry, i) => {
      try {
        return xdr.SorobanAuthorizationEntry.fromXDR(entry, "base64");
      } catch (e) {
        console.warn("[submit] DECODE auth entry", i, "of", sim.results?.[0]?.auth?.length, String(e).slice(0, 120), "len", entry.length);
        throw e;
      }
    });
    const extraWrite = opts?.extraWriteBytes ?? 2048;
    const extraFee = opts?.extraResourceFee ?? 5000n;
    const build = (sorobanData?: xdr.SorobanTransactionData) => {
      const b = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
        fee: inclusionFee,
        networkPassphrase: NETWORK_PASSPHRASE,
        ...(sorobanData ? { sorobanData } : {}),
      }).addOperation(Operation.invokeHostFunction({ func: invoke.func, auth, source }));
      if (memo) b.addMemo(Memo.text(memo));
      return b.setTimeout(timeout).build();
    };

    let preparedXdr: string;
    let unreadable = false;
    try {
      const simData = xdr.SorobanTransactionData.fromXDR(sim.transactionData, "base64");
      const resources = simData.resources();
      const resourceFee = BigInt(simData.resourceFee().toString());
      const sorobanData = new SorobanDataBuilder(simData)
        .setResources(Number(resources.instructions()), Number(resources.diskReadBytes()), Number(resources.writeBytes()) + extraWrite)
        .setResourceFee((resourceFee + extraFee).toString())
        .build();
      preparedXdr = build(sorobanData).toXDR();
    } catch (e) {
      // The network's footprint can hold ledger keys of a newer XDR type than this library knows (the Aquarius pool's, "unknown
      // ScValType member for value 22"). Nothing here needs to read the footprint, so splice the simulation's bytes in as they are.
      console.warn("[submit] footprint not readable, using raw transaction data:", String(e).slice(0, 80));
      unreadable = true;
      preparedXdr = spliceSorobanData(build().toXDR(), sim.transactionData, inclusionFee, extraWrite, extraFee);
    }

    const signed = await signStellar(preparedXdr, unreadable ? { byHash: true } : undefined);
    const initialSent = await rpc<{ status?: string; hash?: string; errorResultXdr?: string }>("sendTransaction", {
      transaction: signed,
    });
    console.warn("[submit] sent", JSON.stringify(initialSent).slice(0, 400));
    const sent = await resubmitOnTryAgainLater(signed, initialSent);

    if (!sent.hash || sent.status === "ERROR" || sent.status === "DUPLICATE") {
      const desc = describeSendError(sent);
      throw new Error(`Transaction rejected by network (${desc})`);
    }

    // Poll getTransaction with TX_POLL_MAX_ATTEMPTS = 38 (1s for first 15 polls, 2s after)
    for (let attempt = 0; attempt < 38; attempt++) {
      await new Promise((r) => setTimeout(r, attempt < 15 ? 1000 : 2000));
      const tx = await rpc<{
        status?: string;
        ledger?: number;
        resultXdr?: string;
        diagnosticEventsXdr?: string[];
        errorResultXdr?: string;
      }>("getTransaction", { hash: sent.hash }).catch(() => ({ status: "NOT_FOUND" } as { status?: string; ledger?: number; resultXdr?: string; diagnosticEventsXdr?: string[]; errorResultXdr?: string }));

      if (tx.status !== "NOT_FOUND") {
        lastSubmittedLedger = Math.max(lastSubmittedLedger, Number(tx.ledger) || 0);
        if (tx.status === "SUCCESS") return sent.hash;
        console.warn("[submit] tx", tx.status, String(tx.resultXdr).slice(0, 200));
        const detail = describeFailedTx(tx);
        throw new Error(detail ? `Transaction failed: ${detail} (Tx: ${sent.hash})` : `The transaction failed on chain (Tx: ${sent.hash})`);
      }
    }
    throw new Error("Transaction timeout: not confirmed within ~61s");
  }, `${contractId}.${method}`);
}

// Ported from: apps/stellar/lib/margin-utils.ts and apps/stellar/lib/stellar-utils.ts
export async function submitStellar(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  opts?: SubmitContractOpts,
): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  return submitContract(wallet.full, contractId, method, args, opts);
}

// Ported from: apps/stellar/lib/utils/sanitize-amount.ts:numberAmountToWad (through a 7-decimal integer step, so it stays exact)
const wad = (amount: number) => (BigInt(Math.floor(amount * 1e7 + 1e-6)) * 10n ** 11n).toString();

// Ported from: apps/stellar/lib/stellar-utils.ts:ContractService.deposit / withdraw. The Reserve is the lending pool and its share token:
// supply(lender, amount WAD) mints shares; redeem(lender, shares WAD) burns them, where `amount` is a share count (7 decimals).
export async function submitEarn(mode: "supply" | "withdraw", sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const pool = EARN_POOLS[sym];
  if (!pool) throw new Error(`${sym} is not a Stellar earn pool`);
  let amountWad = wad(amount);
  if (mode === "withdraw") {
    // cap at the lender's live share balance; an amount at (or within a stroop of) the balance redeems everything
    const bal = BigInt((await readContract(pool.pool, "balance", nativeToScVal(wallet.full, { type: "address" })).catch(() => 0n)) as bigint);
    if (bal <= 0n) throw new Error("No supplied balance to withdraw");
    let shares = BigInt(amountWad) / 10n ** 11n;
    if (shares >= bal - 1n) shares = bal;
    amountWad = (shares * 10n ** 11n).toString();
  }
  if (BigInt(amountWad) <= 0n) throw new Error("Please enter a valid amount");
  return submitContract(wallet.full, pool.pool, mode === "supply" ? "supply" : "redeem", [
    nativeToScVal(wallet.full, { type: "address" }),
    nativeToScVal(amountWad, { type: "u256" }),
  ]);
}
