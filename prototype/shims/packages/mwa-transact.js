// Replaces `@solana-mobile/mobile-wallet-adapter-protocol-web3js` (used by @wallet-ui/react-native-web3js).
//
// On Android, `transact()` opens a session with the wallet app over the Mobile Wallet Adapter protocol. Here the
// "wallet" is the stand-in sheet (wallet-stand-in.js): authorize asks to connect when the app has no stored
// authorization, signTransactions asks to approve. A failure queued in the control panel is thrown as the same
// error object / text the real adapter produces, so the app's own error handling runs unchanged.

import { SolanaMobileWalletAdapterError, SolanaMobileWalletAdapterProtocolError } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { fromUint8Array } from "js-base64";

const proto = () => globalThis.__vnProto;

/** The error the real adapter raises for each failure kind. */
function walletError(kind) {
  switch (kind) {
    case "cancel":
      return new Error("CancellationException: the request was closed in the wallet without approving");
    case "refused":
    case "declined":
      return new SolanaMobileWalletAdapterProtocolError(0, -1, "authorization request failed");
    case "identity":
      return new SolanaMobileWalletAdapterProtocolError(0, -1, "Identity verification failed");
    case "unreachable":
      return new SolanaMobileWalletAdapterError("ERROR_SESSION_TIMEOUT", "Failed to connect to the wallet websocket (ERROR_SESSION_TIMEOUT).");
    case "wallet-timeout":
      return new Error("SolanaMobileWalletAdapterError: Timed out waiting for response");
    case "no-wallet":
      return new SolanaMobileWalletAdapterError("ERROR_WALLET_NOT_FOUND", "Found no installed wallet that supports the mobile wallet protocol.");
    case "connect-cancel":
      return new SolanaMobileWalletAdapterError("ERROR_ASSOCIATION_CANCELLED", "Local association cancelled by user");
    default:
      return null;
  }
}

function authorizationResult() {
  const publicKey = proto().walletPublicKey();
  return {
    accounts: [{ address: fromUint8Array(publicKey.toBytes()), label: proto().walletLabel, chains: ["solana:mainnet"], features: [] }],
    auth_token: "prototype-auth-token",
    wallet_uri_base: "https://prototype.wallet",
  };
}

/** The wallet API handed to the `transact` callback. */
function createWallet(session) {
  return {
    async authorize() {
      if (session.connecting) {
        const failure = session.walletFailure("authorize");
        if (failure === "no-wallet") throw walletError(failure);
        if ((await proto().askWallet("connect", 0)) === "reject") throw walletError("connect-cancel");
        if (failure) throw walletError(failure);
        return authorizationResult();
      }
      const failure = session.walletFailure("authorize");
      if (failure) throw walletError(failure);
      return authorizationResult();
    },
    async reauthorize() {
      return this.authorize();
    },
    async deauthorize() {},
    getCapabilities: async () => ({
      max_transactions_per_request: 10,
      max_messages_per_request: 10,
      supported_transaction_versions: ["legacy", 0],
      features: [],
    }),
    async signTransactions({ transactions }) {
      const failure = session.walletFailure("sign");
      if (failure === "unreachable") throw walletError(failure);
      if ((await proto().askWallet("sign", transactions.length)) === "reject") throw walletError("cancel");
      if (failure) throw walletError(failure);
      return proto().signTransactions(transactions);
    },
    signMessages: async ({ payloads }) => payloads,
    async signAndSendTransactions() {
      throw new Error("signAndSendTransactions is not used by Vanna");
    },
  };
}

export async function transact(callback) {
  const session = proto().startWalletSession();
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    return await callback(createWallet(session));
  } finally {
    session.end();
  }
}

export default { transact };
