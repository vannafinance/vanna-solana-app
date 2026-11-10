import { Account, BASE_FEE, Contract, scValToNative, TransactionBuilder, xdr } from "@stellar/stellar-base";

import { NETWORK_PASSPHRASE, READ_SOURCE, RPC_URLS } from "./config";

// Read a Soroban contract value by simulating a call (no signature, no fee paid): the same approach as the web app's
// ContractService reads. stellar-base builds the transaction; the Soroban JSON-RPC call is a plain fetch, so no Node
// networking code ships in the app. Tries each RPC in turn; throws if all of them fail.
let preferred = 0;

type SimResult = { error?: string; results?: { xdr: string }[] };

async function simulate(url: string, txXdr: string): Promise<SimResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "simulateTransaction", params: { transaction: txXdr } }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const body = (await res.json()) as { result?: SimResult; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result ?? {};
}

export async function readContract(contractId: string, method: string, ...args: xdr.ScVal[]): Promise<unknown> {
  const tx = new TransactionBuilder(new Account(READ_SOURCE, "0"), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const txXdr = tx.toXDR();
  let last: unknown;
  for (let n = 0; n < RPC_URLS.length; n++) {
    const i = (preferred + n) % RPC_URLS.length;
    try {
      const sim = await simulate(RPC_URLS[i], txXdr);
      // a contract error is the same on every RPC, so it isn't retried
      if (sim.error) throw Object.assign(new Error(`${method}: ${sim.error}`), { final: true });
      const out = sim.results?.[0]?.xdr;
      if (!out) throw new Error(`${method}: no result`);
      preferred = i;
      return scValToNative(xdr.ScVal.fromXDR(out, "base64"));
    } catch (e) {
      last = e;
      if ((e as { final?: boolean }).final) break;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export const fromWad = (v: unknown) => Number(BigInt(v as bigint)) / 1e18;
