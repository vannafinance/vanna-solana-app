// External wallets: Mobile Wallet Adapter on Solana (Android), WalletConnect on Stellar.
// The libraries load on first use, so nothing here can affect app start-up.
import { Buffer } from "buffer";
import { Linking } from "react-native";

import * as dynamic from "@/chain/dynamic";
import { registerExternalSolanaSigner, registerExternalStellarSigner } from "@/chain/sign";
import { base58 } from "@/chain/solana/prices";
import type { WalletApp } from "@/state/wallets";

export type ExternalConnection = { address: string; session: string };

const IDENTITY = { name: "Vanna", uri: "https://test.vanna.finance", icon: "favicon.ico" };
const SOLANA_CHAIN = "solana:mainnet"; // the Vanna fork is a copy of mainnet
const STELLAR_CHAIN = "stellar:testnet";
// The public project ID configured for this Vanna environment in Dynamic.
const WALLETCONNECT_PROJECT_ID = "2799ec9e7590716f1b80965c74f84bb0";

// Android app IDs: naming one opens that wallet directly instead of Android's "Open with" list.
const PACKAGE: Partial<Record<WalletApp, string>> = {
  Phantom: "app.phantom",
  Solflare: "com.solflare.mobile",
  Backpack: "app.backpack.mobile",
  Freighter: "org.stellar.freighterwallet",
  OneKey: "so.onekey.app.wallet",
  LOBSTR: "com.lobstr.client",
};
// Each wallet's own WalletConnect link, from WalletConnect's wallet directory.
const WC_LINK: Partial<Record<WalletApp, string>> = { OneKey: "onekey-wallet://wc", LOBSTR: "lobstr://wc" };

const notInstalled = (app: WalletApp) => {
  const id = PACKAGE[app];
  if (id) Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`).catch(() => {});
  return new Error(`${app} isn't installed. Install it, then try again.`);
};

async function withWallet<T>(app: WalletApp, work: Parameters<Awaited<ReturnType<typeof mwa>>["transact"]>[0] extends (w: infer W) => unknown ? (wallet: W) => Promise<T> : never): Promise<T> {
  const { transact } = await mwa();
  try {
    return await transact(work as never, { packageName: PACKAGE[app] } as never);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ERROR_WALLET_NOT_FOUND" || /no.*wallet|not found/i.test(err.message ?? "")) throw notInstalled(app);
    throw e;
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
    await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN, auth_token: entry.session });
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
  const own = WC_LINK[app];
  return own ? dynamic.openInApp(`${own}?uri=${encodeURIComponent(uri)}`, id) : false;
}

export async function connectStellarWallet(app: WalletApp): Promise<ExternalConnection> {
  const wc = await walletConnect();
  const { uri, approval } = await wc.connect({
    optionalNamespaces: { stellar: { chains: [STELLAR_CHAIN], methods: ["stellar_signXDR"], events: [] } },
  });
  if (!uri) throw new Error("Couldn't start the wallet connection");
  if (!(await openInWallet(app, uri))) throw notInstalled(app);
  const session = await approval();
  const address = session.namespaces.stellar?.accounts[0]?.split(":")[2];
  if (!address) throw new Error(`${app} didn't approve Stellar testnet`);
  return { address, session: session.topic };
}

registerExternalStellarSigner(async (xdr, entry) => {
  if (!entry.session) throw new Error(`Connect ${entry.app} again`);
  const wc = await walletConnect();
  const pending = wc.request<{ signedXDR: string }>({
    topic: entry.session,
    chainId: STELLAR_CHAIN,
    request: { method: "stellar_signXDR", params: { xdr } },
  });
  void openInWallet(entry.app, `wc:${entry.session}@2`);
  return (await pending).signedXDR;
});
