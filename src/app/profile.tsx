import { router } from "expo-router";
import { lazy, Suspense } from "react";
import { View } from "react-native";

import { AccountCard } from "@/components/profile/account-card";
import { AppearanceCard } from "@/components/profile/appearance-card";
import { DisconnectButton } from "@/components/profile/disconnect-button";
import { FaucetCard } from "@/components/profile/faucet-card";
import { ProfileWalletCard } from "@/components/profile/profile-wallet-card";
import { SettingsCard } from "@/components/profile/settings-card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { VannaWordmark } from "@/components/ui/vanna-wordmark";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppInfo } from "@/hooks/use-app-info";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useFaucet } from "@/hooks/use-faucet";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useShareText } from "@/hooks/use-share-text";
import { useWalletConnection } from "@/hooks/use-wallet-connection";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme/use-theme";

// Metro folds __DEV__ before it collects dependencies, so a release build never contains the preview switches.
const DeveloperControls = __DEV__ ? lazy(() => import("@/components/profile/developer-controls").then((module) => ({ default: module.DeveloperControls }))) : null;

export default function Profile() {
  const { colors } = useTheme();
  const portfolio = usePortfolio();
  const appearance = useAppearance();
  const info = useAppInfo();
  const share = useShareText();
  const connectivity = useConnectivity();
  const wallet = useWalletConnection();
  const faucet = useFaucet();

  return (
    <Screen gap={12} paddingTop={8} header={<PlainHeader title="Profile" onBack={() => router.back()} />}>
      {wallet.address ? <ProfileWalletCard address={wallet.address} onCopy={() => share(wallet.address)} /> : null}
      <ResourceView resource={portfolio} emptyLabel="No account data">
        {(data) => <AccountCard walletBalance={data.walletBalance} marginAddress={data.marginAddress} />}
      </ResourceView>
      <AppearanceCard value={appearance.preference} onChange={appearance.choose} />
      {faucet.available ? <FaucetCard onOpen={() => router.push(routes.faucet)} /> : null}
      <SettingsCard network={info.network} onDocs={info.openDocs} onSupport={info.openSupport} />
      {wallet.address ? (
        <DisconnectButton
          busy={wallet.checking}
          onPress={async () => {
            if (await wallet.disconnect()) {
              router.dismissAll();
              router.replace("/welcome");
            }
          }}
        />
      ) : (
        <Button label="Connect wallet" onPress={() => router.push("/connect")} />
      )}
      {wallet.errorMessage ? <AppText color="negative">{wallet.errorMessage}</AppText> : null}
      {DeveloperControls ? (
        <Suspense fallback={null}>
          <DeveloperControls offline={!connectivity.online} onOffline={connectivity.simulateOffline} />
        </Suspense>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <VannaWordmark color={colors.textMuted} height={10} />
        <AppText variant="caption" color="textMuted">{`${info.version} · Your keys stay in your wallet app`}</AppText>
      </View>
    </Screen>
  );
}
