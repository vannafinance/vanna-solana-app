// External wallets: Mobile Wallet Adapter on Solana (Android), WalletConnect on Stellar.
// The libraries load on first use, so nothing here can affect app start-up.
import { Buffer } from "buffer";
import { Linking } from "react-native";

import { registerExternalSolanaSigner, registerExternalStellarSigner } from "@/chain/sign";
import { base58 } from "@/chain/solana/prices";

export type ExternalConnection = { address: string; session: string };

const IDENTITY = { name: "Vanna", uri: "https://test.vanna.finance", icon: "favicon.ico" };
const SOLANA_CHAIN = "solana:mainnet"; // the Vanna fork is a copy of mainnet
const STELLAR_CHAIN = "stellar:testnet";
// The public project ID configured for this Vanna environment in Dynamic.
const WALLETCONNECT_PROJECT_ID = "2799ec9e7590716f1b80965c74f84bb0";

const mwa = () => import("@solana-mobile/mobile-wallet-adapter-protocol");

export async function connectSolanaWallet(): Promise<ExternalConnection> {
  const { transact } = await mwa();
  return transact(async (wallet) => {
    const auth = await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN });
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet didn't share an account");
    return { address: base58(Buffer.from(account.address, "base64")), session: auth.auth_token };
  });
}

registerExternalSolanaSigner(async (base64Tx, entry) => {
  const { transact } = await mwa();
  return transact(async (wallet) => {
    await wallet.authorize({ identity: IDENTITY, chain: SOLANA_CHAIN, auth_token: entry.session });
    const { signed_payloads } = await wallet.signTransactions({ payloads: [base64Tx] });
    if (!signed_payloads[0]) throw new Error("The wallet didn't sign the transaction");
    return signed_payloads[0];
  });
});

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

export async function connectStellarWallet(): Promise<ExternalConnection> {
  const wc = await walletConnect();
  const { uri, approval } = await wc.connect({
    optionalNamespaces: { stellar: { chains: [STELLAR_CHAIN], methods: ["stellar_signXDR"], events: [] } },
  });
  if (!uri) throw new Error("Couldn't start the wallet connection");
  await Linking.openURL(uri).catch(() => {
    throw new Error("No Stellar wallet app was found on this phone");
  });
  const session = await approval();
  const address = session.namespaces.stellar?.accounts[0]?.split(":")[2];
  if (!address) throw new Error("The wallet didn't share a Stellar account");
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
  Linking.openURL(`wc:${entry.session}@2`).catch(() => {});
  return (await pending).signedXDR;
});
