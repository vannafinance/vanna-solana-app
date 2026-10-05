import { RPC_URL } from "./config";

// The fork exists only on Vanna's own RPC, so the public explorer has to read the transaction or account from there; plain
// solscan.io would answer "not found" for anything made on the fork.
const FORK_CLUSTER = `?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;

export function explorerAccountUrl(address: string): string {
  return `https://solscan.io/account/${address}${FORK_CLUSTER}`;
}

export function explorerTransactionUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}${FORK_CLUSTER}`;
}
