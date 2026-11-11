// External wallets: Mobile Wallet Adapter on Solana (Android), WalletConnect on Stellar.
// The libraries load on first use, so nothing here can affect app start-up.
import { Buffer } from "buffer";
import { AppState, Linking } from "react-native";

import * as dynamic from "@/chain/dynamic";
import { registerExternalSolanaSigner, registerExternalStellarSigner } from "@/chain/sign";
import { base58 } from "@/chain/solana/prices";
import { short, updateWalletSession, type WalletApp } from "@/state/wallets";

export type ExternalConnection = { address: string; session: string };

const IDENTITY = { name: "Vanna", uri: "https://test.vanna.finance", icon: "favicon.ico" };
const SOLANA_CHAIN = "solana:mainnet"; // the Vanna fork is a copy of mainnet
const STELLAR_CHAIN = "stellar:testnet";
// The public project ID configured for this Vanna environment in Dynamic.
const WALLETCONNECT_PROJECT_ID = "2799ec9e7590716f1b80965c74f84bb0";
// How long a wallet gets to answer a Stellar connection before we stop waiting (so the next tap starts clean).
const STELLAR_CONNECT_MS = 90_000;

// Android app IDs: naming one opens that wallet directly instead of Android's "Open with" list.
const PACKAGE: Partial<Record<WalletApp, string>> = {
  Phantom: "app.phantom",
  Solflare: "com.solflare.mobile",
  Backpack: "app.backpack.mobile",
  Freighter: "org.stellar.freighterwallet",
  OneKey: "so.onekey.app.wallet",
  LOBSTR: "com.lobstr.client",
};
// Each wallet's own WalletConnect links. Freighter's is from its source (docs/best-practices/navigation.md, build.gradle),
// the others from WalletConnect's wallet directory.
const WC_LINKS: Partial<Record<WalletApp, string[]>> = {
  Freighter: ["freighterwallet://wc"],
  OneKey: ["onekey-wallet://wc", "https://app.onekey.so/wc/connect"],
  LOBSTR: ["lobstr://wc", "https://lobstr.co/uni/wc"],
};

// The Play Store only opens when the wallet really is missing.
async function cantOpen(app: WalletApp): Promise<Error> {
  const id = PACKAGE[app];
  if (id && (await dynamic.appInstalled(id))) return new Error(`${app} couldn't take the connection. Update ${app} and try again.`);
  if (id) Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`).catch(() => {});
  return new Error(`${app} isn't installed. Install it, then try again.`);
}

const APP_ID = "finance.vanna.app";
// WalletConnect wallets can't send you back to the app that asked (Freighter only says "return to the browser"), so the moment
// their answer arrives Vanna brings itself forward. Some phones refuse that from the background; there you switch back by hand.
function comeBack() {
  if (AppState.currentState !== "active") void dynamic.launchApp(APP_ID);
}

const text = (e: unknown) => String((e as { message?: string } | null)?.message ?? e ?? "");
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// The wallet never started its side of the connection (still opening, locked, or asleep).
const noShow = (m: string) => /websocket|ConnectionFailed|SessionTimeout|timed? ?out/i.test(m);

// What each raw wallet error means for the person holding the phone.
function friendly(app: WalletApp, e: unknown): Error {
  const m = text(e);
  if (noShow(m)) return new Error(`${app} didn't open in time. Open ${app}, unlock it, then try again.`);
  if (/declin|reject|denied|not signed|^-3\b|ERROR_NOT_SIGNED/i.test(m)) return new Error(`You declined it in ${app}.`);
  if (/authorization request failed|ERROR_AUTHORIZATION_FAILED|^-1\b/i.test(m)) return new Error(`${app} didn't approve. Open ${app}, unlock it, then try again.`);
  return new Error(m.length > 140 ? m.slice(0, 140) + "…" : m || `${app} didn't answer`);
}

async function withWallet<T>(app: WalletApp, work: Parameters<Awaited<ReturnType<typeof mwa>>["transact"]>[0] extends (w: infer W) => unknown ? (wallet: W) => Promise<T> : never): Promise<T> {
  const { transact } = await mwa();
  for (let attempt = 0; ; attempt++) {
    try {
      return await transact(work as never, { packageName: PACKAGE[app] } as never);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "ERROR_WALLET_NOT_FOUND" || /no.*wallet|not found/i.test(err.message ?? "")) throw await cantOpen(app);
      // A wallet that was closed starts slowly and often misses the first connection. It is open by now: ask once more.
      if (attempt === 0 && noShow(text(e))) {
        await wait(1500);
        continue;
      }
      throw friendly(app, e);
    }
  }
}

const mwa = () => import("@solana-mobile/mobile-wallet-adapter-protocol");

export function connectSolanaWallet(app: WalletApp): Promise<ExternalConnection> {
  return withWallet(app, async (wallet) => {
    const auth = await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN });
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet didn't share an account");
    return { address: base58(Buffer.from(account.address, "base64")), session: auth.auth_token };
  });
}

registerExternalSolanaSigner((base64Tx, entry) =>
  withWallet(entry.app, async (wallet) => {
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
      throw new Error(`${entry.app} is on a different account now. Switch it back to ${short(entry.full)}, or add that account again.`);
    }
    if (auth.auth_token && auth.auth_token !== entry.session) updateWalletSession("solana", entry.id, auth.auth_token);
    const { signed_payloads } = await wallet.signTransactions({ payloads: [base64Tx] });
    if (!signed_payloads[0]) throw new Error("The wallet didn't sign the transaction");
    return signed_payloads[0];
  }),
);

type WcClient = Awaited<ReturnType<typeof import("@walletconnect/sign-client").SignClient.init>>;
let client: Promise<WcClient> | null = null;

function walletConnect(): Promise<WcClient> {
  client ??= (async () => {
    await import("@walletconnect/react-native-compat"); // must load before the client
    const { SignClient } = await import("@walletconnect/sign-client");
    return SignClient.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: { name: "Vanna", description: "Vanna Finance", url: IDENTITY.uri, icons: [`${IDENTITY.uri}/favicon.ico`], redirect: { native: "vanna://" } },
    });
  })().catch((e: unknown) => {
    client = null;
    throw e;
  });
  return client;
}

/** Tries the wallet's WalletConnect links in that wallet only, so Android's list never appears. */
async function openInWallet(app: WalletApp, uri: string): Promise<boolean> {
  const id = PACKAGE[app];
  if (!id) return false;
  if (await dynamic.openInApp(uri, id)) return true;
  for (const base of WC_LINKS[app] ?? []) {
    if (await dynamic.openInApp(`${base}?uri=${encodeURIComponent(uri)}`, id)) return true;
  }
  return false;
}

// The connection that is waiting on a wallet. Starting another one (or leaving the screen) drops it, so a wallet that
// never answered can't leave the tiles stuck.
let waiting: { drop: () => void } | null = null;
export const CONNECT_DROPPED = "Connection cancelled";
export function dropPendingConnect() {
  waiting?.drop();
  waiting = null;
}

export async function connectStellarWallet(app: WalletApp): Promise<ExternalConnection> {
  dropPendingConnect();
  const wc = await walletConnect();
  // The standard Stellar WalletConnect request (what Freighter, LOBSTR and the Stellar wallet kits send).
  const { uri, approval } = await wc.connect({
    requiredNamespaces: { stellar: { chains: [STELLAR_CHAIN], methods: ["stellar_signXDR"], events: [] } },
  });
  if (!uri) throw new Error("Couldn't start the wallet connection");
  if (!(await openInWallet(app, uri))) throw await cantOpen(app);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const gate = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${app} didn't answer. Set ${app} to Testnet, then try again.`)), STELLAR_CONNECT_MS);
    waiting = { drop: () => reject(new Error(CONNECT_DROPPED)) };
  });
  try {
    const session = await Promise.race([approval(), gate]);
    comeBack();
    const address = session.namespaces.stellar?.accounts[0]?.split(":")[2];
    if (!address) throw new Error(`${app} didn't approve Stellar testnet. Switch it to Testnet and try again.`);
    return { address, session: session.topic };
  } catch (e) {
    const m = text(e);
    if (m === CONNECT_DROPPED || /didn't answer/.test(m)) throw e;
    if (/reject|declin|denied/i.test(m)) throw new Error(`You declined it in ${app}.`);
    throw new Error(`${app} couldn't connect: ${m.slice(0, 100)}`);
  } finally {
    clearTimeout(timer);
    waiting = null;
  }
}

registerExternalStellarSigner(async (xdr, entry) => {
  if (!entry.session) throw new Error(`Connect ${entry.app} again`);
  const wc = await walletConnect();
  const pending = wc.request<{ signedXDR: string }>({
    topic: entry.session,
    chainId: STELLAR_CHAIN,
    request: { method: "stellar_signXDR", params: { xdr } },
  });
  // The request reaches the wallet through WalletConnect; this only brings the app forward to approve it.
  const id = PACKAGE[entry.app];
  if (id) void dynamic.launchApp(id);
  try {
    const { signedXDR } = await pending;
    comeBack();
    return signedXDR;
  } catch (e) {
    const m = text(e);
    if (/reject|declin|denied/i.test(m)) throw new Error(`You declined it in ${entry.app}.`);
    if (/no matching|session|expired|topic/i.test(m)) throw new Error(`${entry.app} lost the connection. Remove it under Wallets and add it again.`);
    throw new Error(m.length > 140 ? m.slice(0, 140) + "…" : m || `${entry.app} didn't answer`);
  }
});
