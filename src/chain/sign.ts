import type { Chain } from "@/state/chain";
import { inUseWallet, type WalletEntry } from "@/state/wallets";

/**
 * Signing for the connected Solana wallet. The wallet signs through Mobile Wallet Adapter (registered by chain/external.ts as the
 * external signer); the app builds the transaction, the wallet signs it, the app sends it.
 */

export type ExternalSolanaSigner = (base64Tx: string, wallet: WalletEntry) => Promise<string>;

let externalSolanaSigner: ExternalSolanaSigner | null = null;

// The transaction sheet listens, so its progress moves to "Sent" when the wallet has signed, not before.
const signedSubs = new Set<() => void>();
export function onSigned(fn: () => void) {
  signedSubs.add(fn);
  return () => void signedSubs.delete(fn);
}
const signed = async (work: Promise<string>) => {
  const out = await work;
  signedSubs.forEach((f) => f());
  return out;
};

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
 * Sign a base64-encoded serialized Solana transaction with the connected wallet.
 * Returns the signed serialized transaction (base64).
 */
export async function signSolana(base64Tx: string): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  if (!externalSolanaSigner) {
    throw new Error("Wallet signing is not ready yet. Connect your wallet again.");
  }
  return signed(externalSolanaSigner(base64Tx, wallet));
}
