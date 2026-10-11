import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";

import type { ConnectPhase } from "@/types/connection";

import { waitForForeground } from "./wait-for-foreground";

const AUTHORIZATION_FAILED = -1;
// Backpack checks the app's identity by fetching the website's assetlinks.json and gives up after about a second; from India
// about one fetch in four is slower than that. Each try is a fresh chance, so a refusal is tried twice more by itself.
const CONNECT_ATTEMPTS = 3;
const RETRY_PAUSE_MS = 2500;
// A cancel this soon after a retry started is the wallet's refusal screen closing, not the user.
const BOUNCE_MS = 2000;
const REFUSED = /authorization request failed|auth_token not valid|identity verification failed/i;

const ELLIPSIS_FALLBACK = "..";
// Backpack on Android rejects the app's identity during authorize, which no app setting can fix.
const IDENTITY_REJECTED = /identity verification failed/i;

function walletLabel(label: string | undefined) {
  return label && !label.includes(ELLIPSIS_FALLBACK) ? label : undefined;
}

export function useWalletConnection() {
  const { account, connect, disconnect } = useMobileWallet();
  const queryClient = useQueryClient();
  const pending = useRef(false);
  const [phase, setPhase] = useState<ConnectPhase>("pick");
  const [checking, setChecking] = useState(false);
  const [walletMissing, setWalletMissing] = useState(false);
  const [declinedByWallet, setDeclinedByWallet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const authorize = async () => {
    if (pending.current) return;
    pending.current = true;
    setChecking(true);
    setPhase("approving");
    setErrorMessage(undefined);
    setDeclinedByWallet(false);
    try {
      for (let attempt = 1, refused = false; ; attempt++) {
        const startedAt = Date.now();
        try {
          await connect();
          break;
        } catch (error) {
          const code = error !== null && typeof error === "object" && "code" in error ? error.code : undefined;
          const message = error instanceof Error ? error.message : "";
          const refusal = code === AUTHORIZATION_FAILED || REFUSED.test(message);
          const bounced = refused && Date.now() - startedAt < BOUNCE_MS;
          if ((refusal || bounced) && attempt < CONNECT_ATTEMPTS) {
            refused = true;
            await waitForForeground(RETRY_PAUSE_MS);
            continue;
          }
          throw refused && bounced ? Object.assign(new Error("authorization request failed"), { code: AUTHORIZATION_FAILED }) : error;
        }
      }
      setWalletMissing(false);
      setPhase("connected");
    } catch (error) {
      const code = error !== null && typeof error === "object" && "code" in error ? error.code : undefined;
      const message = error instanceof Error ? error.message : "";
      if (code === "ERROR_WALLET_NOT_FOUND") {
        setWalletMissing(true);
        setPhase("pick");
      } else if (code === "ERROR_ASSOCIATION_CANCELLED" || /CancellationException|Local association cancelled by user/i.test(message)) {
        setPhase("pick");
      } else {
        setDeclinedByWallet(code === AUTHORIZATION_FAILED);
        setErrorMessage(IDENTITY_REJECTED.test(message)
          ? "Your wallet could not verify Vanna just now. This is usually a slow network check. Try again."
          : code === AUTHORIZATION_FAILED
            ? "Your wallet could not verify Vanna just now, or declined the connection. Try again."
            : code === "ERROR_SESSION_TIMEOUT"
              ? "The wallet did not respond in time. Unlock it and try again."
              : "Could not connect to your wallet. Unlock it and try again.");
        setPhase("declined");
      }
    } finally {
      pending.current = false;
      setChecking(false);
    }
  };

  const disconnectWallet = async () => {
    if (pending.current) return false;
    pending.current = true;
    setChecking(true);
    setErrorMessage(undefined);
    try {
      await disconnect();
      await queryClient.cancelQueries();
      queryClient.clear();
      setPhase("pick");
      return true;
    } catch {
      setErrorMessage("Could not clear the wallet session. Try disconnecting again.");
      return false;
    } finally {
      pending.current = false;
      setChecking(false);
    }
  };

  const openWalletDownload = async (url: string) => {
    setErrorMessage(undefined);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      setErrorMessage("Could not open the download page. Try again.");
    }
  };

  return {
    phase: account ? "connected" as const : phase,
    checking,
    walletMissing,
    declinedByWallet,
    errorMessage,
    walletName: walletLabel(account?.label),
    address: account?.address.toBase58() ?? "",
    connect: authorize,
    authorize,
    disconnect: disconnectWallet,
    cancel: () => { if (!pending.current) setPhase("pick"); },
    retryAuthorize: authorize,
    installPhantom: () => void openWalletDownload("https://phantom.com/download"),
    installSolflare: () => void openWalletDownload("https://solflare.com/download"),
  };
}
