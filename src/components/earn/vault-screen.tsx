import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { PlainHeader } from "@/components/ui/plain-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatCompactUsd, formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultAnalytics, VaultContract, VaultDetail } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { VaultActivityTab } from "./vault-activity-tab";
import { VaultAnalyticsTab } from "./vault-analytics-tab";
import { VaultCollateralTab } from "./vault-collateral-tab";
import { VaultDetailsTab } from "./vault-details-tab";
import { VaultPositionTab } from "./vault-position-tab";

type VaultTab = "positions" | "details" | "activity" | "collateral" | "analytics";

const TABS: readonly { value: VaultTab; label: string }[] = [
  { value: "positions", label: "Positions" },
  { value: "details", label: "Details" },
  { value: "activity", label: "Activity" },
  { value: "collateral", label: "Collateral" },
  { value: "analytics", label: "Analytics" },
];

type VaultScreenProps = {
  vault: VaultDetail;
  analytics: Resource<VaultAnalytics>;
  onBack: () => void;
  onSupply: () => void;
  onWithdraw: () => void;
  onCopyAddress: (contract: VaultContract) => void;
  onOpenTransaction: (signature: string) => void;
};

export function VaultScreen({ vault, analytics, onBack, onSupply, onWithdraw, onCopyAddress, onOpenTransaction }: VaultScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs = vault.position ? TABS : TABS.filter((tab) => tab.value !== "positions");
  const [tab, setTab] = useState<VaultTab>(tabs[0].value);
  const stats = [
    { label: "Total supply", value: formatCompactUsd(vault.suppliedUsd) },
    { label: "Available", value: formatCompactUsd(vault.suppliedUsd - vault.borrowedUsd) },
    { label: "Utilization", value: formatPercent(vault.utilizationBps, 1) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <PlainHeader onBack={onBack} />
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TokenIcon symbol={vault.symbol} size={36} />
            <View>
              <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>{`${vault.symbol} vault`}</AppText>
              <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>{`${vault.name} · Vanna lending pool`}</AppText>
            </View>
          </View>
          <AppText variant="caption" color="textMuted" style={{ marginTop: 16 }}>
            Supply APY
          </AppText>
          <AppText strong color="positive" style={{ fontSize: 32, lineHeight: 40 }}>
            {formatPercent(vault.supplyApyBps)}
          </AppText>
          <View style={{ marginTop: 16, paddingTop: 14, flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
            {stats.map((stat) => (
              <View key={stat.label} style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
                  {stat.label}
                </AppText>
                <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
                  {stat.value}
                </AppText>
              </View>
            ))}
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <PillTabs segments={tabs} value={tab} onChange={setTab} activeColor={colors.earnTab} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          {tab === "positions" && vault.position ? <VaultPositionTab vault={vault} position={vault.position} /> : null}
          {tab === "details" ? <VaultDetailsTab vault={vault} onCopyAddress={onCopyAddress} /> : null}
          {tab === "activity" ? <VaultActivityTab vault={vault} onOpenTransaction={onOpenTransaction} /> : null}
          {tab === "collateral" ? <VaultCollateralTab vault={vault} /> : null}
          {tab === "analytics" ? <VaultAnalyticsTab analytics={analytics} /> : null}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, paddingTop: 12, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 16, backgroundColor: colors.background }}>
        <Button label="Withdraw" variant="outline" flex onPress={onWithdraw} />
        <Button label="Supply" flex onPress={onSupply} />
      </View>
    </View>
  );
}
