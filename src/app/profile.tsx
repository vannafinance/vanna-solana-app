import { router } from "expo-router";
import { View } from "react-native";

import { AccountCard } from "@/components/profile/account-card";
import { AccountHealthCard } from "@/components/profile/account-health-card";
import { AppearanceCard } from "@/components/profile/appearance-card";
import { DeveloperControls } from "@/components/profile/developer-controls";
import { DisconnectButton } from "@/components/profile/disconnect-button";
import { ProfileWalletCard } from "@/components/profile/profile-wallet-card";
import { SettingsCard } from "@/components/profile/settings-card";
import { AppText } from "@/components/ui/app-text";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { VannaWordmark } from "@/components/ui/vanna-wordmark";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppInfo } from "@/hooks/use-app-info";
import { useApprovalOutcome } from "@/hooks/use-approval-outcome";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useShareText } from "@/hooks/use-share-text";
import { useBackpackInstalled } from "@/hooks/use-wallet-connection";
import { useTheme } from "@/theme/use-theme";

export default function Profile() {
  const { colors, spacing } = useTheme();
  const portfolio = usePortfolio();
  const appearance = useAppearance();
  const info = useAppInfo();
  const share = useShareText();
  const approval = useApprovalOutcome();
  const margin = useMarginAccount();
  const connectivity = useConnectivity();
  const backpack = useBackpackInstalled();

  return (
    <Screen header={<PlainHeader title="Profile" onBack={() => router.back()} />}>
      <ResourceView resource={portfolio} emptyLabel="No account data">
        {(data) => (
          <View style={{ gap: spacing.lg }}>
            <ProfileWalletCard address={data.walletAddress} onCopy={() => share(data.walletAddress)} />
            {data.health === null ? null : (
              <AccountHealthCard
                health={data.health}
                leverage={data.leverage}
                roomBeforeLiquidation={data.roomBeforeLiquidation}
                netAvailable={data.netAvailable}
                collateral={data.marginBalance}
                debt={data.totalBorrowed}
              />
            )}
            <AccountCard
              walletBalance={data.walletBalance}
              marginBalance={data.marginBalance}
              marginAddress={margin.exists ? data.marginAddress : null}
            />
          </View>
        )}
      </ResourceView>
      <AppearanceCard value={appearance.preference} onChange={appearance.choose} />
      <SettingsCard network={info.network} onDocs={info.openDocs} onSupport={info.openSupport} />
      <DisconnectButton onPress={() => router.replace("/welcome")} />
      {__DEV__ ? (
        <DeveloperControls
          outcome={approval.outcome}
          onOutcome={approval.setOutcome}
          marginReset={!margin.exists}
          onMarginReset={(reset) => (reset ? margin.reset() : margin.markCreated())}
          offline={!connectivity.online}
          onOffline={connectivity.simulateOffline}
          backpackMissing={!backpack.installed}
          onBackpackMissing={(missing) => backpack.setInstalled(!missing)}
        />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <VannaWordmark color={colors.textMuted} height={10} />
        <AppText variant="caption" color="textMuted">{`${info.version} · Your keys stay in your wallet app`}</AppText>
      </View>
    </Screen>
  );
}
