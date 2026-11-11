import * as dynamic from "@/chain/dynamic";
import type { Chain } from "@/state/chain";
import { inUseWallet, type WalletEntry } from "@/state/wallets";

/**
 * Unified signing layer for all wallet types on Stellar and Solana (Step 1 of NEXT_ALL_TRANSACTIONS.md).
 *
 * - Embedded ("Vanna wallet"): signs via the local `vanna-dynamic` native module
 *   (`dynamic.signStellarXdr` / `dynamic.signSolanaTransaction`).
 * - External wallets:
 *   - Stellar (LOBSTR, Freighter, OneKey): WalletConnect v2 `stellar_signXDR` (registered via `registerExternalStellarSigner`).
 *   - Solana (Solflare, Backpack, Phantom): Mobile Wallet Adapter `signTransactions` / deeplink (registered via `registerExternalSolanaSigner`).
 */

export type ExternalStellarSigner = (xdr: string, wallet: WalletEntry) => Promise<string>;
export type ExternalSolanaSigner = (base64Tx: string, wallet: WalletEntry) => Promise<string>;

let externalStellarSigner: ExternalStellarSigner | null = null;
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

export function registerExternalStellarSigner(fn: ExternalStellarSigner) {
  externalStellarSigner = fn;
}

export function registerExternalSolanaSigner(fn: ExternalSolanaSigner) {
  externalSolanaSigner = fn;
}

export function requireActiveRealWallet(chain: Chain): WalletEntry {
  const wallet = inUseWallet(chain);
  if (!wallet || wallet.sample) {
    throw new Error(`Sign in with a real ${chain === "stellar" ? "Stellar" : "Solana"} wallet first`);
  }
  return wallet;
}

/**
 * Sign a base64-encoded Stellar TransactionEnvelope XDR with the active Stellar wallet.
 * Returns the signed TransactionEnvelope XDR (base64).
 */
export async function signStellar(xdr: string): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  if (wallet.kind === "embedded") {
    if (!dynamic.available) {
      throw new Error("Email wallet signing requires the Vanna development build APK (not Expo Go).");
    }
    return signed(dynamic.signStellarXdr(xdr));
  }
  if (!externalStellarSigner) {
    throw new Error(`${wallet.app} signing via WalletConnect is not connected yet. Connect ${wallet.app} in Account > Wallets.`);
  }
  return signed(externalStellarSigner(xdr, wallet));
}

/**
 * Sign a base64-encoded serialized Solana transaction with the active Solana wallet.
 * Returns the signed serialized transaction (base64).
 */
export async function signSolana(base64Tx: string): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  if (wallet.kind === "embedded") {
    if (!dynamic.available) {
      throw new Error("Email wallet signing requires the Vanna development build APK (not Expo Go).");
    }
    return signed(dynamic.signSolanaTransaction(base64Tx));
  }
  if (!externalSolanaSigner) {
    throw new Error(`${wallet.app} signing via Mobile Wallet Adapter is not connected yet. Connect ${wallet.app} in Account > Wallets.`);
  }
  return signed(externalSolanaSigner(base64Tx, wallet));
}
