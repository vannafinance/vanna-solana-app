import * as WebBrowser from "expo-web-browser";
import { useState, useSyncExternalStore } from "react";

import { useApprovalOutcome } from "@/hooks/use-approval-outcome";
import { backpackInstalledFlag, previewAccount } from "@/lib/preview-data/home";
import type { ConnectPhase } from "@/types/connection";

const RPC_URL = "https://rpc-devnet.solana.vanna.finance";
const WALLET_NAME = "Backpack";
const INSTALL_URL = "https://backpack.app/download";
const SETUP_GUIDE_URL = "https://docs.backpack.app/";
const STEP_DELAY_MS = 900;

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, STEP_DELAY_MS));

// Preview state machine. Mobile Wallet Adapter authorize/reauthorize replaces the pauses later.
export function useWalletConnection() {
  const { outcome } = useApprovalOutcome();
  const installed = useSyncExternalStore(backpackInstalledFlag.subscribe, backpackInstalledFlag.get);
  const [phase, setPhase] = useState<ConnectPhase>("pick");
  const [checking, setChecking] = useState(false);

  const checkRpc = async () => {
    setChecking(true);
    await pause();
    setChecking(false);
    setPhase(outcome === "network" ? "rpc-not-set" : "connected");
  };

  const authorize = async () => {
    setChecking(true);
    await pause();
    setChecking(false);
    setPhase(outcome === "rejected" ? "declined" : "rpc-setup");
  };

  return {
    phase,
    checking,
    installed,
    walletName: WALLET_NAME,
    address: previewAccount.walletAddress,
    rpcUrl: RPC_URL,
    connect: () => (installed ? setPhase("approving") : void WebBrowser.openBrowserAsync(INSTALL_URL)),
    authorize,
    cancel: () => setPhase("pick"),
    retryAuthorize: () => setPhase("approving"),
    confirmRpcAdded: checkRpc,
    checkAgain: checkRpc,
    showSetup: () => setPhase("rpc-setup"),
    openSetupGuide: () => void WebBrowser.openBrowserAsync(SETUP_GUIDE_URL),
  };
}

export function useBackpackInstalled() {
  const installed = useSyncExternalStore(backpackInstalledFlag.subscribe, backpackInstalledFlag.get);
  return { installed, setInstalled: backpackInstalledFlag.set };
}
