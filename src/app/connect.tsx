import { router } from "expo-router";
import { useEffect } from "react";

import { ConnectSheet } from "@/components/connect/connect-sheet";
import { HeroStage } from "@/components/connect/hero-stage";
import { useSpaceChoice } from "@/hooks/use-space-choice";
import { useWalletConnection } from "@/hooks/use-wallet-connection";

const AUTO_CONTINUE_MS = 1400;

export default function Connect() {
  const wallet = useWalletConnection();
  const { entryRoute } = useSpaceChoice();
  const connected = wallet.phase === "connected";

  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => router.replace(entryRoute), AUTO_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [connected, entryRoute]);

  return (
    <HeroStage>
      <ConnectSheet
        phase={wallet.phase}
        walletMissing={wallet.walletMissing}
        declinedByWallet={wallet.declinedByWallet}
        walletName={wallet.walletName}
        address={wallet.address}
        errorMessage={wallet.errorMessage}
        onConnect={wallet.connect}
        onInstallPhantom={wallet.installPhantom}
        onInstallSolflare={wallet.installSolflare}
        onRetry={wallet.retryAuthorize}
        onContinue={() => router.replace(entryRoute)}
        onDismiss={() => router.back()}
      />
    </HeroStage>
  );
}
