import { hash as sha256, Keypair, StrKey } from "@stellar/stellar-base";

import { NETWORK_PASSPHRASE } from "@/chain/stellar/config";
import { endExpiredSession } from "@/chain/session-guard";
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


// After a relaunch Dynamic's page can take a while to bring the wallets back; wait for them instead of failing the signature.
async function walletsBack(chain: Chain) {
  const key = chain === "stellar" ? "stellarAddress" : "solanaAddress";
  for (let i = 0; i < 10; i++) {
    const s = await dynamic.getSession().catch(() => null);
    console.warn("[sign] session", chain, s ? `user ${!!s.email}, ${key}=${s[key] ? "yes" : "no"}` : "none");
    if (s?.[key]) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  endExpiredSession();
  throw new Error("Your session ended. Sign in again.");
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16));

/**
 * Signs an unsigned transaction envelope by its hash. The hash is sha256(sha256(passphrase) | ENVELOPE_TYPE_TX (2) | the transaction
 * body); the body is the envelope without its 4-byte type and its (empty) signature list. Dynamic's wallet signs the hash with raw
 * ed25519, and the result is appended as the envelope's one DecoratedSignature (hint = last 4 bytes of the public key).
 */
async function signStellarByHash(envelopeB64: string, address: string): Promise<string> {
  const env = new Uint8Array(Buffer.from(envelopeB64, "base64"));
  const n = env.length;
  if (!(env[3] === 2 && n > 8 && env[n - 1] === 0 && env[n - 2] === 0 && env[n - 3] === 0 && env[n - 4] === 0)) {
    throw new Error("Can't sign this transaction by hash (not an unsigned v1 envelope)");
  }
  const payload = new Uint8Array(32 + 4 + (n - 8));
  payload.set(sha256(Buffer.from(NETWORK_PASSPHRASE)), 0);
  payload.set([0, 0, 0, 2], 32);
  payload.set(env.subarray(4, n - 4), 36);
  const txHash = sha256(Buffer.from(payload));
  // Dynamic's Stellar wallet reads a hex message as the bytes it encodes and signs exactly those (its own signTransaction signs the
  // hash the same way). Check the signature against the wallet's public key before using it.
  const raw = String(await dynamic.signStellarHash(hex(txHash))).replace(/^0x/i, "");
  const sig = /^[0-9a-f]{128}$/i.test(raw) ? unhex(raw) : new Uint8Array(Buffer.from(raw, "base64"));
  const ok = sig.length === 64 && Keypair.fromPublicKey(address).verify(Buffer.from(txHash), Buffer.from(sig));
  console.warn("[sign] hash signed:", sig.length, "bytes, verifies:", ok);
  if (!ok) throw new Error("Couldn't sign this transaction (the wallet's signature didn't match)");
  const pub = StrKey.decodeEd25519PublicKey(address);
  const out = new Uint8Array(n - 4 + 4 + 4 + 4 + 64);
  out.set(env.subarray(0, n - 4), 0);
  const dv = new DataView(out.buffer);
  dv.setUint32(n - 4, 1); // one signature
  out.set(pub.subarray(pub.length - 4), n); // hint
  dv.setUint32(n + 4, 64); // signature length
  out.set(sig, n + 8);
  return Buffer.from(out).toString("base64");
}

/**
 * Sign a base64-encoded Stellar TransactionEnvelope XDR with the active Stellar wallet.
 * Returns the signed TransactionEnvelope XDR (base64).
 */
export async function signStellar(xdr: string, opts?: { byHash?: boolean }): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  if (wallet.kind === "embedded") {
    if (!dynamic.available) {
      throw new Error("Email wallet signing requires the Vanna development build APK (not Expo Go).");
    }
    // Dynamic's page picks the Stellar network the first time it is asked for it; signing before that falls back to
    // Mainnet and Horizon rejects the signature. Ask first.
    await walletsBack("stellar");
    console.warn("[sign] selecting Stellar network");
    const net = await dynamic.getStellarNetwork().catch((e) => `error ${String(e).slice(0, 80)}`);
    // The caller already knows Dynamic's page can't read this transaction (its footprint holds a ledger-key type the page's Stellar
    // library lacks). The page then neither signs nor reliably fails, so skip it and sign the hash directly.
    if (opts?.byHash) {
      console.warn("[sign] network:", net, "- signing the transaction hash directly");
      return signed(signStellarByHash(xdr, wallet.full));
    }
    console.warn("[sign] network:", net, "- asking Dynamic to sign");
    return signed(
      dynamic.signStellarXdr(xdr).catch(async (e) => {
        // Dynamic's page reads the whole transaction and its Stellar library rejects newer ledger-key types (the Aquarius pool's
        // "ScValType member for value 22"). The signature only covers the transaction hash, so sign that directly.
        if (!/XDR Read Error|ScValType/i.test(String(e?.message ?? e))) throw e;
        console.warn("[sign] Dynamic's page can't read this transaction; signing its hash directly");
        return signStellarByHash(xdr, wallet.full);
      }),
    );
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
    await walletsBack("solana");
    return signed(dynamic.signSolanaTransaction(base64Tx));
  }
  if (!externalSolanaSigner) {
    throw new Error(`${wallet.app} signing via Mobile Wallet Adapter is not connected yet. Connect ${wallet.app} in Account > Wallets.`);
  }
  return signed(externalSolanaSigner(base64Tx, wallet));
}
