// External wallets: Mobile Wallet Adapter on Android. The first connection opens Android's own wallet chooser (every installed wallet that
// speaks MWA shows up: Phantom, Solflare, Backpack, a Seeker's Seed Vault, ...). The wallet's answer carries its own link
// (wallet_uri_base); keeping it means every later transaction opens that same wallet directly instead of asking again.
// The library loads on first use, so nothing here can affect app start-up.
import { Buffer } from "buffer";

import { registerExternalSolanaSigner } from "@/chain/sign";
import { base58 } from "@/chain/solana/prices";
import { short, updateWalletSession } from "@/state/wallets";

export type ExternalConnection = { address: string; session: string; baseUri?: string; app: string; logo: string };

const IDENTITY = { name: "Vanna", uri: "https://test.vanna.finance", icon: "favicon.ico" };
const SOLANA_CHAIN = "solana:mainnet"; // the Vanna fork is a copy of mainnet

// The wallet says who it is only through its link. Known ones get their own name and logo; any other wallet is just "Wallet".
const KNOWN: { host: RegExp; app: string; logo: string }[] = [
  { host: /phantom/i, app: "Phantom", logo: "PHANTOM" },
  { host: /solflare/i, app: "Solflare", logo: "SOLFLARE" },
  { host: /backpack/i, app: "Backpack", logo: "BACKPACK" },
];
export function describeWallet(baseUri?: string): { app: string; logo: string } {
  const hit = baseUri ? KNOWN.find((k) => k.host.test(baseUri)) : undefined;
  return hit ? { app: hit.app, logo: hit.logo } : { app: "Wallet", logo: "VANNA" };
}

const text = (e: unknown) => String((e as { message?: string } | null)?.message ?? e ?? "");
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// The wallet never started its side of the connection (still opening, locked, or asleep).
const noShow = (m: string) => /websocket|ConnectionFailed|SessionTimeout|timed? ?out/i.test(m);

// What each raw wallet error means for the person holding the phone.
function friendly(e: unknown): Error {
  const m = text(e);
  if (noShow(m)) return new Error("Your wallet didn't open in time. Open it, unlock it, then try again.");
  if (/declin|reject|denied|not signed|^-3\b|ERROR_NOT_SIGNED/i.test(m)) return new Error("You declined it in your wallet.");
  if (/authorization request failed|ERROR_AUTHORIZATION_FAILED|^-1\b/i.test(m)) return new Error("Your wallet didn't approve. Open it, unlock it, then try again.");
  return new Error(m.length > 140 ? m.slice(0, 140) + "…" : m || "Your wallet didn't answer");
}

const mwa = () => import("@solana-mobile/mobile-wallet-adapter-protocol");

async function withWallet<T>(work: Parameters<Awaited<ReturnType<typeof mwa>>["transact"]>[0] extends (w: infer W) => unknown ? (wallet: W) => Promise<T> : never, baseUri?: string): Promise<T> {
  const { transact } = await mwa();
  for (let attempt = 0; ; attempt++) {
    try {
      // With a saved link the same wallet opens directly; without one Android shows the wallet chooser.
      return await transact(work as never, baseUri ? ({ baseUri } as never) : undefined);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "ERROR_WALLET_NOT_FOUND" || /no.*wallet|not found/i.test(err.message ?? "")) {
        throw new Error("No Solana wallet found on this phone. Install Phantom, Solflare or Backpack, then try again.");
      }
      // A wallet that was closed starts slowly and often misses the first connection. It is open by now: ask once more.
      if (attempt === 0 && noShow(text(e))) {
        await wait(1500);
        continue;
      }
      throw friendly(e);
    }
  }
}

export function connectSolanaWallet(): Promise<ExternalConnection> {
  return withWallet(async (wallet) => {
    const auth = await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN });
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet didn't share an account");
    const who = describeWallet(auth.wallet_uri_base);
    return { address: base58(Buffer.from(account.address, "base64")), session: auth.auth_token, baseUri: auth.wallet_uri_base, ...who };
  });
}

registerExternalSolanaSigner((base64Tx, entry) =>
  withWallet(async (wallet) => {
    // The saved approval first, so a transaction only asks to be signed. A wallet that has forgotten it (-1) asks to connect again once.
    let auth;
    try {
      auth = await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN, auth_token: entry.session });
    } catch {
      // The wallet forgot the saved approval (phones that close apps in the background do this): ask once more, quietly.
      auth = await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN });
    }
    const shared = auth.accounts.map((a) => base58(Buffer.from(a.address, "base64")));
    if (!shared.includes(entry.full)) {
      throw new Error(`${entry.app} is on a different account now. Switch it back to ${short(entry.full)}, or connect that account again.`);
    }
    if (auth.auth_token && auth.auth_token !== entry.session) updateWalletSession("solana", entry.id, auth.auth_token);
    const { signed_payloads } = await wallet.signTransactions({ payloads: [base64Tx] });
    if (!signed_payloads[0]) throw new Error("The wallet didn't sign the transaction");
    return signed_payloads[0];
  }, entry.baseUri),
);
