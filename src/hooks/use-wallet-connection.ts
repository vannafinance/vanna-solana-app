import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";

import type { ConnectPhase } from "@/types/connection";

const AUTHORIZATION_FAILED = -1;

const ELLIPSIS_FALLBACK = "..";

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
      await connect();
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
        setErrorMessage(code === AUTHORIZATION_FAILED
          ? "The wallet declined the connection. You can try again."
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
