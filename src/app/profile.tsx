import { router } from "expo-router";
import { View } from "react-native";

import { AccountCard } from "@/components/profile/account-card";
import { AccountHealthCard } from "@/components/profile/account-health-card";
import { AppearanceCard } from "@/components/profile/appearance-card";
import { DeveloperControls } from "@/components/profile/developer-controls";
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
import { useApprovalOutcome } from "@/hooks/use-approval-outcome";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useFaucet } from "@/hooks/use-faucet";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useShareText } from "@/hooks/use-share-text";
import { useWalletConnection } from "@/hooks/use-wallet-connection";
import { useTheme } from "@/theme/use-theme";

export default function Profile() {
  const { colors } = useTheme();
  const portfolio = usePortfolio();
  const appearance = useAppearance();
  const info = useAppInfo();
  const share = useShareText();
  const approval = useApprovalOutcome();
  const connectivity = useConnectivity();
  const wallet = useWalletConnection();
  const faucet = useFaucet();

  return (
    <Screen gap={12} paddingTop={8} header={<PlainHeader title="Profile" onBack={() => router.back()} />}>
      {wallet.address ? <ProfileWalletCard address={wallet.address} onCopy={() => share(wallet.address)} /> : null}
      <ResourceView resource={portfolio} emptyLabel="No account data">
        {(data) => (
          <>
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
            <AccountCard walletBalance={data.walletBalance} marginAddress={data.marginAddress} />
          </>
        )}
      </ResourceView>
      <AppearanceCard value={appearance.preference} onChange={appearance.choose} />
      {faucet.available ? <FaucetCard symbols={faucet.symbols} state={faucet.state} onRequest={faucet.request} /> : null}
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
      {__DEV__ ? (
        <DeveloperControls
          outcome={approval.outcome}
          onOutcome={approval.setOutcome}
          offline={!connectivity.online}
          onOffline={connectivity.simulateOffline}
        />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <VannaWordmark color={colors.textMuted} height={10} />
        <AppText variant="caption" color="textMuted">{`${info.version} · Your keys stay in your wallet app`}</AppText>
      </View>
    </Screen>
  );
}
