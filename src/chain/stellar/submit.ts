import {
  Account,
  BASE_FEE,
  Contract,
  nativeToScVal,
  Operation,
  scValToNative,
  SorobanDataBuilder,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-base";

import { requireActiveRealWallet, signStellar } from "@/chain/sign";

import { EARN_POOLS, NETWORK_PASSPHRASE, RPC_URLS } from "./config";

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

// Ported from: apps/stellar/lib/stellar-utils.ts:ContractService.pollTransactionStatus and addResourceHeadroom
export async function submitContract(
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  opts?: SubmitContractOpts,
): Promise<string> {
  return withFootprintRaceRetry(async () => {
    const account = await sourceAccount(source);
    const multiplier = Math.max(1, opts?.feeMultiplier ?? 1);
    const inclusionFee = (parseInt(BASE_FEE, 10) * multiplier).toString();
    const timeout = opts?.timeoutSecs ?? 300;

    const unsigned = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
      fee: inclusionFee,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(timeout)
      .build();

    const sim = await rpc<SimOk>("simulateTransaction", { transaction: unsigned.toXDR() });
    if (sim.error || !sim.transactionData || !sim.minResourceFee) {
      throw new Error(sim.error || `${method} could not be prepared`);
    }

    const invoke = unsigned.operations[0] as Operation.InvokeHostFunction;
    const auth = (sim.results?.[0]?.auth ?? []).map((entry) => xdr.SorobanAuthorizationEntry.fromXDR(entry, "base64"));
    const simData = xdr.SorobanTransactionData.fromXDR(sim.transactionData, "base64");
    const resources = simData.resources();
    const resourceFee = BigInt(simData.resourceFee().toString());
    const extraWrite = opts?.extraWriteBytes ?? 2048;
    const extraFee = opts?.extraResourceFee ?? 5000n;

    const sorobanData = new SorobanDataBuilder(simData)
      .setResources(Number(resources.instructions()), Number(resources.diskReadBytes()), Number(resources.writeBytes()) + extraWrite)
      .setResourceFee((resourceFee + extraFee).toString())
      .build();

    const prepared = new TransactionBuilder(new Account(account.accountId(), account.sequenceNumber()), {
      fee: inclusionFee,
      networkPassphrase: NETWORK_PASSPHRASE,
      sorobanData,
    })
      .addOperation(Operation.invokeHostFunction({ func: invoke.func, auth, source }))
      .setTimeout(timeout)
      .build();

    const signed = await signStellar(prepared.toXDR());
    const initialSent = await rpc<{ status?: string; hash?: string; errorResultXdr?: string }>("sendTransaction", {
      transaction: signed,
    });
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
        resultXdr?: string;
        diagnosticEventsXdr?: string[];
        errorResultXdr?: string;
      }>("getTransaction", { hash: sent.hash }).catch(() => ({ status: "NOT_FOUND" as const }));

      if (tx.status !== "NOT_FOUND") {
        if (tx.status === "SUCCESS") return sent.hash;
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

// Ported from: apps/stellar/lib/utils/sanitize-amount.ts:numberAmountToWad
const wad = (amount: number) => (BigInt(Math.floor(amount * 1e7)) * 10n ** 11n).toString();

// Ported from: apps/stellar/components/earn/earn-form.tsx:handleSupply and handleWithdraw
export async function submitEarn(mode: "supply" | "withdraw", sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const pool = EARN_POOLS[sym];
  if (!pool) throw new Error(`${sym} is not a Stellar earn pool`);
  return submitContract(wallet.full, pool.pool, mode === "supply" ? "deposit" : "redeem_vtokens", [
    nativeToScVal(wallet.full, { type: "address" }),
    nativeToScVal(wad(amount), { type: "u256" }),
  ]);
}
