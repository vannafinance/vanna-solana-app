// A fork-only fee payer. Wallets check a transaction against REAL Solana mainnet before they sign it. On the Vanna fork the
// person's wallet holds fork SOL only (0 SOL on mainnet), and Solflare (2.33 and later) refuses any transaction whose fee payer
// is that wallet with a hard "Insufficient SOL" screen. So the app pays the network fee itself from a key it makes on this phone
// and tops up with the fork's own airdrop: the wallet then only signs for its own account and its fee check has nothing to refuse.
//
// The key never holds real money: it is created here, stored on this phone, and funded only on the fork (requestAirdrop on the
// fork RPC). It must never be used on a real cluster; FORK_FEE_PAYER below turns it off for such a build.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ed25519 } from "@noble/curves/ed25519";
import { Buffer } from "buffer";

import { base58 } from "./prices";
import { rpc } from "./rpc";

/**
 * Off by default: a random keypair funded only via fork airdrop still has 0 SOL on real mainnet, so Solflare 2.33+
 * rejects it with "Insufficient SOL" AND overrides wallets that DO hold real mainnet SOL. Keep false for mainnet /
 * dApp Store builds and for wallets funded with a tiny amount of mainnet SOL on the fork.
 */
export const FORK_FEE_PAYER = false;

const STORE_KEY = "vanna.forkFeePayer.v1";
const LOW_LAMPORTS = 50_000_000; // 0.05 SOL: thousands of fees
const TOP_UP_LAMPORTS = 1_000_000_000; // 1 fork SOL

export type FeePayer = { address: string; sign: (message: Uint8Array) => Uint8Array };

let cached: Promise<FeePayer> | null = null;

async function loadKey(): Promise<Uint8Array> {
  const saved = await AsyncStorage.getItem(STORE_KEY).catch(() => null);
  if (saved && /^[0-9a-f]{64}$/.test(saved)) return Uint8Array.from(Buffer.from(saved, "hex"));
  const fresh = ed25519.utils.randomPrivateKey();
  await AsyncStorage.setItem(STORE_KEY, Buffer.from(fresh).toString("hex")).catch(() => {});
  return fresh;
}

async function balance(address: string): Promise<number> {
  return (await rpc<{ value: number }>("getBalance", [address, { commitment: "confirmed" }])).value;
}

async function topUp(address: string): Promise<void> {
  if ((await balance(address)) >= LOW_LAMPORTS) return;
  await rpc<string>("requestAirdrop", [address, TOP_UP_LAMPORTS]);
  for (let i = 0; i < 20; i++) {
    if ((await balance(address)) >= LOW_LAMPORTS) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("The test network did not fund the fee account");
}

/** The fork fee payer, funded. Null when it is turned off or the fork could not fund it (the wallet then pays, as before). */
export async function forkFeePayer(): Promise<FeePayer | null> {
  if (!FORK_FEE_PAYER) return null;
  try {
    if (!cached) {
      cached = loadKey().then((key) => ({
        address: base58(ed25519.getPublicKey(key)),
        sign: (message: Uint8Array) => ed25519.sign(message, key),
      }));
    }
    const payer = await cached;
    await topUp(payer.address);
    return payer;
  } catch {
    cached = null;
    return null;
  }
}

/**
 * Adds the fee payer's signature to a transaction the wallet has signed. The signature covers the message exactly as the wallet
 * returned it, so a wallet that adjusted the message still produces a valid transaction.
 */
export function cosign(signedBase64: string, payer: FeePayer, payerIndex = 0): string {
  const tx = Buffer.from(signedBase64, "base64");
  // compact-u16 signature count
  let count = 0;
  let offset = 0;
  for (let shift = 0; ; shift += 7) {
    const b = tx[offset++];
    count |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
  }
  if (payerIndex >= count) throw new Error("The signed transaction has no slot for the fee payer");
  const message = tx.subarray(offset + 64 * count);
  const signature = payer.sign(message);
  Buffer.from(signature).copy(tx, offset + 64 * payerIndex);
  return tx.toString("base64");
}
