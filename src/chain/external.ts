// External wallets: Mobile Wallet Adapter on Android. The first connection opens Android's own wallet chooser (every installed wallet that
// speaks MWA shows up: Phantom, Solflare, Backpack, a Seeker's Seed Vault, ...). The wallet's answer may carry its own link
// (wallet_uri_base); keeping it means every later transaction opens that same wallet directly instead of asking again.
// The library loads on first use, so nothing here can affect app start-up.
//
// A wallet that is not running yet must start up, read the request and open its side of the connection within about 30 seconds
// (the library's limit, counted from the tap, chooser included). A slow phone or emulator can miss that on a cold start (Phantom on
// the emulator takes ~38 s); the wallet is open by then, so the connection is asked once more straight away. The 45 s patch in
// scripts/patch-mwa.js does not lengthen this: the library's websocket gives up on its own after ~31 s.
import { Buffer } from "buffer";
import { AppState } from "react-native";

import { appInstalled } from "@/chain/native";
import { registerExternalSolanaSigner, WALLET_NO_ANSWER, WalletCancelledError } from "@/chain/sign";
import { base58 } from "@/chain/solana/prices";
import { setWalletNoToken, short, updateWalletIdentity, updateWalletSession } from "@/state/wallets";

export type WalletIdentity = { app: string; logo: string; icon?: string };
export type ExternalConnection = WalletIdentity & { address: string; session: string; baseUri?: string; pkg?: string };
/** A wallet app found on the phone (see wallet-detect.ts): its Android package, its own name and its own icon (PNG data URI). */
export type DetectedWallet = { pkg: string; label: string; icon: string | null };

// Wallets verify the app by fetching <uri>/.well-known/assetlinks.json and matching the Android package + signing key. For this host the
// file must be public (the access page must exempt that path) and list package finance.vanna.app with our build's SHA-256 (see the handoff).
const IDENTITY = { name: "Vanna", uri: "https://test.vanna.finance", icon: "favicon.ico" };
const SOLANA_CHAIN = "solana:mainnet"; // the Vanna fork is a copy of mainnet

// MWA has no "wallet name" field. A wallet tells who it is through its link (wallet_uri_base, optional), its icon (wallet_icon, a
// data: URI, optional) and the account label. Solflare (2.33) sends no link, only its icon and the label "Main Wallet", so the link alone
// is not enough. `iconSig` is the start of that wallet's icon as it sends it (PNG header with its size), seen on a real connection.
type Known = { app: string; logo: string; pkg: string; host: RegExp; iconSig?: string[] };
const KNOWN: Known[] = [
  { app: "Phantom", logo: "PHANTOM", pkg: "app.phantom", host: /phantom/i },
  { app: "Solflare", logo: "SOLFLARE", pkg: "com.solflare.mobile", host: /solflare/i, iconSig: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAL0AAAC9"] },
  { app: "Backpack", logo: "BACKPACK", pkg: "app.backpack.mobile", host: /backpack/i },
  { app: "Seed Vault", logo: "SEEDVAULT", pkg: "com.solanamobile.seedvault", host: /seedvault|solanamobile/i },
];
const asIdentity = (k: Known, icon?: string): WalletIdentity => ({ app: k.app, logo: k.logo, icon });
type AuthLike = { auth_token?: string; wallet_uri_base?: string; wallet_icon?: string; accounts?: readonly { label?: string; icon?: string }[] };
// Phantom (26.38) sends neither a link nor an icon, but its auth_token opens with base64 JSON {"typ":"phantom-wallet-auth-token",...}.
const tokenHead = (token?: string) => {
  try {
    return token ? Buffer.from(token.slice(0, 64), "base64").toString("latin1") : "";
  } catch {
    return "";
  }
};

// Who answered: its link first, then its icon, then the only known wallet installed on this phone. A wallet none of these name is
// "Wallet", shown with the icon it sent (or the Vanna mark when it sent none).
export async function identifyWallet(auth: AuthLike): Promise<WalletIdentity> {
  const baseUri = auth.wallet_uri_base;
  // Solflare wraps its base64 every 76 characters; the line breaks are dropped so the icon decodes and compares cleanly.
  const icon = typeof auth.wallet_icon === "string" && auth.wallet_icon.startsWith("data:image/") ? auth.wallet_icon.replace(/\s+/g, "") : undefined;
  const byLink = baseUri ? KNOWN.find((k) => k.host.test(baseUri)) : undefined;
  if (byLink) return asIdentity(byLink, icon);
  const byIcon = icon ? KNOWN.find((k) => k.iconSig?.some((sig) => icon.startsWith(sig))) : undefined;
  if (byIcon) return asIdentity(byIcon, icon);
  const head = tokenHead(auth.auth_token);
  const byToken = /"typ"\s*:\s*"[^"]*wallet-auth-token"/.test(head) ? KNOWN.find((k) => k.host.test(head)) : undefined;
  if (byToken) return asIdentity(byToken, icon);
  const installed = (await Promise.all(KNOWN.map(async (k) => ((await appInstalled(k.pkg).catch(() => false)) ? k : null)))).filter((k): k is Known => k != null);
  if (installed.length === 1) return asIdentity(installed[0], icon);
  return { app: "Wallet", logo: "VANNA", icon };
}
/** Name and logo from the saved link alone (no wallet answer at hand). */
export function describeWallet(baseUri?: string): WalletIdentity {
  const hit = baseUri ? KNOWN.find((k) => k.host.test(baseUri)) : undefined;
  return hit ? asIdentity(hit) : { app: "Wallet", logo: "VANNA" };
}
const packageFor = (app?: string) => (app ? KNOWN.find((k) => k.app === app)?.pkg : undefined);
// The Android package of a saved wallet, so signing opens it directly instead of Android's chooser. Neither Phantom nor Solflare
// sends a link, and entries saved before wallets could be told apart are named "Wallet": those are recognised from what was saved
// (Phantom's auth token, Solflare's icon), then from the only known wallet on the phone. Unknown: the chooser shows, as before.
async function packageOf(entry: { app?: string; pkg?: string; session?: string; icon?: string }): Promise<string | undefined> {
  if (entry.pkg) return entry.pkg;
  const named = packageFor(entry.app);
  if (named) return named;
  const who = await identifyWallet({ auth_token: entry.session, wallet_icon: entry.icon });
  return packageFor(who.app);
}

const text = (e: unknown) => String((e as { message?: string } | null)?.message ?? e ?? "");
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// The wallet never started its side of the connection (still opening, locked, or asleep).
const noShow = (m: string) => /websocket|ConnectionFailed|SessionTimeout|timed? ?out/i.test(m);

// What each raw wallet error means for the person holding the phone.
// Vanna asks for "solana:mainnet" (its fork is a copy of mainnet: same token mints and programs). A wallet set to Testnet or Devnet
// answers that with "chain not supported" (-7 in MWA 2.0) or a plain authorization failure (-1), so both point at the network setting.
const WRONG_NETWORK = "Your wallet is set to another network. In your wallet's settings choose Mainnet (Mainnet Beta), then try again.";
function friendly(e: unknown): Error {
  const m = text(e);
  const code = (e as { code?: unknown } | null)?.code;
  if (m === SOLFLARE_FEES || m === WALLET_NO_ANSWER) return new Error(m);
  if (noShow(m)) return new Error("Your wallet took too long to open. It's open now: tap Connect again and pick it right away.");
  if (code === -7 || /chain.*not supported|unsupported (chain|cluster|network)|ERROR_CHAIN_NOT_SUPPORTED|wrong (network|cluster)/i.test(m)) return new Error(WRONG_NETWORK);
  if (/declin|reject|denied|not signed|^-3\b|ERROR_NOT_SIGNED/i.test(m)) return new Error("You declined it in your wallet.");
  if (code === -1 || /authorization request failed|ERROR_AUTHORIZATION_FAILED|^-1\b/i.test(m))
    return new Error("Your wallet didn't approve the connection. Approve it in your wallet, and check it is set to Mainnet, then try again.");
  return new Error(m.length > 140 ? m.slice(0, 140) + "…" : m || "Your wallet didn't answer");
}

// Solflare simulates every transaction against the network the wallet is connected to (Mainnet), not the app's own RPC, and blocks the
// request with "Insufficient SOL" when the wallet has no real Mainnet SOL (Solflare's developers confirmed this on 2026-11-20 and offer
// no bypass). Vanna's test network is a fork of mainnet, so Solflare can't sign there: it is left out of the wallet list (see
// UNSUPPORTED_WALLET_PACKAGES) and this message covers a Solflare connected before that. The Devnet fallback below stays for other wallets.
const CHAINS = [SOLANA_CHAIN, "solana:devnet", "solana:testnet"] as const;
const wrongChain = (e: unknown) =>
  (e as { code?: unknown } | null)?.code === -7 || /chain.*not supported|unsupported (chain|cluster|network)|ERROR_CHAIN_NOT_SUPPORTED|wrong (network|cluster)/i.test(text(e));
const SOLFLARE_FEES =
  "Solflare can't sign transactions on Vanna's test network: it checks them against Mainnet, where this wallet has no SOL. Use Backpack or Phantom for now.";

const mwa = () => import("@solana-mobile/mobile-wallet-adapter-protocol");

// The wallet no longer knows the saved approval (Backpack answers "Authorization not found" and closes the session): the connection is
// dead, so the whole request is made again in a new session that asks to connect afresh.
class StaleApproval extends Error {}
const declined = (e: unknown) => /declin|reject|denied|not signed|^-3\b|ERROR_NOT_SIGNED/i.test(text(e));

// Ends a wallet request when the person cancels: the callback returns at once, which makes transact end the session, and with the
// patched native module (scripts/patch-mwa.js) that closes the connection and frees the library's one-session lock. The wallet's own
// answer, if it comes later, goes nowhere.
const untilCancelled = <T,>(work: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return work;
  return new Promise<T>((resolve, reject) => {
    const stop = () => reject(new WalletCancelledError());
    if (signal.aborted) return stop();
    signal.addEventListener("abort", stop, { once: true });
    work.then(
      (v) => (signal.removeEventListener("abort", stop), resolve(v)),
      (e) => (signal.removeEventListener("abort", stop), reject(e)),
    );
  });
};

async function withWallet<T>(
  work: Parameters<Awaited<ReturnType<typeof mwa>>["transact"]>[0] extends (w: infer W) => unknown ? (wallet: W) => Promise<T> : never,
  target?: { baseUri?: string; packageName?: string },
  cancel?: AbortSignal,
): Promise<T> {
  const { transact } = await mwa();
  const config: { baseUri?: string; packageName?: string } = {};
  if (target?.baseUri) config.baseUri = target.baseUri;
  // Wallets rarely send wallet_uri_base, so pinning the wallet app's Android package skips the system chooser on every request. A
  // package that turns out not to be installed is dropped below (ERROR_WALLET_NOT_FOUND) and the chooser shows as a last resort.
  if (target?.packageName) config.packageName = target.packageName;
  const hasConfig = Object.keys(config).length > 0;
  for (let attempt = 0; ; attempt++) {
    let connected = false;
    try {
      // With a saved link or package name the same wallet opens directly; without either Android shows the wallet chooser.
      return await transact(
        (async (wallet: Parameters<typeof work>[0]) => {
          connected = true;
          return untilCancelled(work(wallet), cancel);
        }) as never,
        hasConfig ? (config as never) : undefined,
      );
    } catch (e) {
      // Cancelled in Vanna (see the signer below): passed on as is, never retried or reworded.
      if (e instanceof WalletCancelledError || e instanceof StaleApproval) throw e;
      const err = e as { code?: string; message?: string };
      // Only a wallet that is not installed: "Authorization not found" (a wallet forgetting the approval) must not land here.
      if (err.code === "ERROR_WALLET_NOT_FOUND" || /no (solana )?wallet|wallet.*not (found|installed)/i.test(err.message ?? "")) {
        if (config.packageName) {
          delete config.packageName;
          continue;
        }
        throw new Error("No Solana wallet found on this phone. Install Phantom, Solflare or Backpack, then try again.");
      }
      // A wallet that was closed starts slowly and often misses the first connection. Only retry before a session connected.
      // Retry at once while the wallet is in front: React Native pauses timers in the background, so a wait here would hold the
      // retry until the person came back to Vanna, by which time the wallet had given up and sat on its home screen.
      if (attempt === 0 && !connected && noShow(text(e))) {
        if (AppState.currentState === "active") await wait(1500);
        continue;
      }
      // The wallet opened and took the request but never answered (the library gave up after 90 s; now 300 s, needs a native rebuild).
      // (the library reports its own request timeout as a Java CancellationException)
      if (connected && (noShow(text(e)) || /CancellationException/i.test(text(e)))) throw new Error(WALLET_NO_ANSWER);
      throw friendly(e);
    }
  }
}

// `target`: the wallet the person chose in Vanna's list; it opens directly (no Android chooser) and is known by name. Without one,
// Android's chooser shows and the wallet is told apart by what it sends.
export function connectSolanaWallet(target?: DetectedWallet, cancel?: AbortSignal): Promise<ExternalConnection> {
  return withWallet(async (wallet) => {
    let auth;
    for (const chain of CHAINS) {
      try {
        auth = await wallet.authorize({ identity: IDENTITY, chain });
        break;
      } catch (e) {
        if (chain === CHAINS[CHAINS.length - 1] || !wrongChain(e)) throw e;
      }
    }
    if (!auth) throw new Error("Your wallet didn't answer");
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet didn't share an account");
    const sent = await identifyWallet(auth as AuthLike);
    // A wallet the person picked in Vanna's list is known by the name and icon Android gives it; the reply only names one picked in Android's own list.
    const who: WalletIdentity = target ? { app: target.label, logo: KNOWN.find((k) => k.pkg === target.pkg)?.logo ?? "VANNA", icon: target.icon ?? sent.icon } : sent;
    return { address: base58(Buffer.from(account.address, "base64")), session: auth.auth_token, baseUri: auth.wallet_uri_base || undefined, pkg: target?.pkg ?? packageFor(who.app), ...who };
  }, target ? { packageName: target.pkg } : undefined, cancel);
}

// CANCEL (sign.ts signSolanaBatch `cancel`): sign.ts rejects at once with WalletCancelledError and ignores this request's answer. Here
// the request is also ended: `withWallet` returns from the session as soon as the signal aborts, transact ends the session, and the
// patched native module (scripts/patch-mwa.js: `invoke` no longer blocks the module thread) closes the connection and frees the library's
// one-session lock, so the next request starts at once. The wallet may keep showing its approval screen; approving it later does nothing,
// because the session is gone. (Before the session is connected, while the wallet is still opening, a cancel can only wait for the
// association timeout.) Needs a native rebuild.
registerExternalSolanaSigner(async (base64Txs, entry, cancel) => {
  const pkg = await packageOf(entry);
  const stopIfCancelled = () => {
    if (cancel?.aborted) throw new WalletCancelledError();
  };
  stopIfCancelled();
  const run = (useToken: boolean) => withWallet(
    async (wallet) => {
      stopIfCancelled();
      // The saved approval first, so a transaction only asks to be signed. A wallet that has forgotten it (-1) asks to connect again once.
      let auth;
      // Only Solflare needs the Devnet fallback; Phantom (and any wallet known to work on Mainnet) is asked for Mainnet only.
      const chains: readonly (typeof CHAINS)[number][] = pkg === "com.solflare.mobile" ? CHAINS : [SOLANA_CHAIN];
      for (const chain of chains) {
        try {
          if (!useToken || !entry.session) {
            // A new session after a wallet rejected the saved approval: connect afresh.
            auth = await wallet.authorize({ identity: IDENTITY, chain });
          } else {
            try {
              auth = await wallet.authorize({ identity: IDENTITY, chain, auth_token: entry.session });
            } catch (e) {
              if (wrongChain(e) || declined(e)) throw e;
              const code = (e as { code?: unknown } | null)?.code;
              // The wallet forgot the saved approval (phones that close apps in the background do this, and Phantom refuses it while
              // it cannot verify the app's identity): ask once more, in this session.
              if (code === -1 || /authorization request failed|ERROR_AUTHORIZATION_FAILED/i.test(text(e))) {
                auth = await wallet.authorize({ identity: IDENTITY, chain });
              } else {
                // Any other answer (Backpack: "Authorization not found") ends that wallet's session: start again in a new one.
                throw new StaleApproval();
              }
            }
          }
          break;
        } catch (e) {
          if (chain === chains[chains.length - 1] || !wrongChain(e)) throw e;
        }
      }
      if (!auth) throw new Error("Your wallet didn't answer");
      const shared = auth.accounts.map((a) => base58(Buffer.from(a.address, "base64")));
      if (!shared.includes(entry.full)) {
        throw new Error(`${entry.app} is on a different account now. Switch it back to ${short(entry.full)}, or connect that account again.`);
      }
      if (auth.auth_token && auth.auth_token !== entry.session) updateWalletSession("solana", entry.id, auth.auth_token);
      // Wallets saved before they could be told apart ("Wallet") get their real name and logo from this answer.
      if (entry.app === "Wallet" || (!entry.icon && (auth as AuthLike).wallet_icon)) {
        const who = await identifyWallet(auth as AuthLike);
        if (who.app !== entry.app || who.icon !== entry.icon) updateWalletIdentity("solana", entry.id, who);
      }
      let signed_payloads: string[];
      stopIfCancelled();
      const askedAt = Date.now();
      try {
        // Several transactions go in ONE request, so the wallet shows one approval for all of them.
        ({ signed_payloads } = await wallet.signTransactions({ payloads: base64Txs }));
      } catch (e) {
        // Solflare's "Insufficient SOL" screen only lets the person cancel, which reaches Vanna as a decline: say what to change.
        if (pkg === "com.solflare.mobile" && /declin|reject|denied|not signed|ERROR_NOT_SIGNED/i.test(text(e))) throw new Error(SOLFLARE_FEES);
        // The wallet accepted the saved approval, then dropped the session within seconds of the sign request (Backpack: "Authorization
        // not found"): not a person's answer. Once, in a new session, connect afresh and sign in it.
        if (useToken && entry.session && !declined(e) && Date.now() - askedAt < 20_000 && /authorization|websocket|ConnectionFailed|not connected|closed|SessionTimeout|CancellationException/i.test(text(e))) throw new StaleApproval();
        throw e;
      }
      if (!signed_payloads?.length || signed_payloads.some((p) => !p)) throw new Error("The wallet didn't sign the transaction");
      return signed_payloads;
    },
    { baseUri: entry.baseUri, packageName: pkg },
    cancel,
  );
  try {
    return await run(!entry.noToken);
  } catch (e) {
    if (e instanceof StaleApproval) {
      stopIfCancelled();
      // Remembered: this wallet is asked to connect afresh from now on, instead of failing first with the saved approval.
      setWalletNoToken("solana", entry.id);
      return run(false);
    }
    throw e;
  }
});
