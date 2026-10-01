import { router } from "expo-router";
import { View, useWindowDimensions } from "react-native";

import { ConnectSheet } from "@/components/connect/connect-sheet";
import { OrbitBackdrop } from "@/components/connect/orbit-backdrop";
import { TaglineCycle } from "@/components/connect/tagline-cycle";
import { useWalletConnection } from "@/hooks/use-wallet-connection";
import { palette } from "@/theme/tokens";

const TAGLINE_TOP = 540;
const ACTIONS_CLEARANCE = 326;

export default function Connect() {
  const wallet = useWalletConnection();
  const { height } = useWindowDimensions();

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.background }}>
      <OrbitBackdrop />
      <View style={{ position: "absolute", left: 0, right: 0, top: Math.min(TAGLINE_TOP, height - ACTIONS_CLEARANCE) }}>
        <TaglineCycle />
      </View>
      <ConnectSheet
        phase={wallet.phase}
        walletMissing={wallet.walletMissing}
        busy={wallet.checking}
        walletName={wallet.walletName}
        address={wallet.address}
        errorMessage={wallet.errorMessage}
        onInstallPhantom={wallet.installPhantom}
        onInstallSolflare={wallet.installSolflare}
        onConnect={wallet.connect}
        onAuthorize={wallet.authorize}
        onCancel={wallet.cancel}
        onRetryAuthorize={wallet.retryAuthorize}
        onContinue={() => router.replace("/home")}
        onDismiss={() => router.back()}
      />
    </View>
  );
}
