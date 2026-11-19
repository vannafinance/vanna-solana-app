import type { Chain } from "@/state/chain";
import { inUseWallet, type WalletEntry } from "@/state/wallets";

/**
 * Signing for the connected Solana wallet. The wallet signs through Mobile Wallet Adapter (registered by chain/external.ts as the
 * external signer); the app builds the transaction, the wallet signs it, the app sends it.
 */

/** Signs every transaction (base64) in ONE wallet request and returns them signed, in the same order. */
export type ExternalSolanaSigner = (base64Txs: string[], wallet: WalletEntry) => Promise<string[]>;

let externalSolanaSigner: ExternalSolanaSigner | null = null;

// The transaction sheet listens, so its progress moves to "Sent" when the wallet has signed, not before.
const signedSubs = new Set<() => void>();
export function onSigned(fn: () => void) {
  signedSubs.add(fn);
  return () => void signedSubs.delete(fn);
}
const signed = async <T,>(work: Promise<T>) => {
  const out = await work;
  signedSubs.forEach((f) => f());
  return out;
};

/** Live phase of the transaction being sent, for the transaction sheets (ui/wallet-wait.tsx TxStatus uses the same names). */
export type ChainTxStatus = "waiting_for_wallet" | "sending" | "confirming";
const statusSubs = new Set<(s: ChainTxStatus) => void>();
export function onTxStatus(fn: (s: ChainTxStatus) => void) {
  statusSubs.add(fn);
  return () => void statusSubs.delete(fn);
}
export const emitTxStatus = (s: ChainTxStatus) => statusSubs.forEach((f) => f(s));
/** The error text when the wallet opened but never answered (~90 s, the wallet library's limit). */
export const WALLET_NO_ANSWER = "Your wallet did not answer. Nothing was sent.";

export function registerExternalSolanaSigner(fn: ExternalSolanaSigner) {
  externalSolanaSigner = fn;
}

export function requireActiveRealWallet(_chain: Chain): WalletEntry {
  const wallet = inUseWallet("solana");
  if (!wallet || wallet.sample) {
    throw new Error("Connect a Solana wallet first");
  }
  return wallet;
}

/**
 * Sign base64-encoded serialized Solana transactions with the connected wallet, all in one wallet request (one approval).
 * Returns the signed serialized transactions (base64), in the same order.
 */
export async function signSolanaBatch(base64Txs: string[]): Promise<string[]> {
  const wallet = requireActiveRealWallet("solana");
  if (!externalSolanaSigner) {
    throw new Error("Wallet signing is not ready yet. Connect your wallet again.");
  }
  const out = await signed(externalSolanaSigner(base64Txs, wallet));
  if (out.length !== base64Txs.length || out.some((tx) => !tx)) {
    throw new Error(`The wallet signed ${out.filter(Boolean).length} of ${base64Txs.length} transactions. Nothing was sent.`);
  }
  return out;
}

/** Sign one base64-encoded serialized Solana transaction with the connected wallet. Returns it signed (base64). */
export async function signSolana(base64Tx: string): Promise<string> {
  return (await signSolanaBatch([base64Tx]))[0];
}
