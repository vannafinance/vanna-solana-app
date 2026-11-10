import { Buffer } from "buffer";

import { SOLANA_RPC } from "./config";

// Plain JSON-RPC to the Vanna Solana fork (no web3.js in the app).
export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SOLANA_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!res.ok) throw new Error(`Solana RPC ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "Solana RPC error");
  return body.result as T;
}

// The fork's clock (Clock sysvar unix_timestamp): the program measures interest and price age against it, not wall time.
export async function forkNow(): Promise<bigint> {
  const clock = await rpc<{ value: { data: [string, string] } }>("getAccountInfo", ["SysvarC1ock11111111111111111111111111111111", { encoding: "base64" }]);
  return Buffer.from(clock.value.data[0], "base64").readBigInt64LE(32);
}
