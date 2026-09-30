import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { VaultActivityPanel } from "./vault-activity-panel";
import { VaultAnalyticsPanel } from "./vault-analytics-panel";
import { VaultCollateralPanel } from "./vault-collateral-panel";
import { VaultDetailHeader } from "./vault-detail-header";
import { VaultDetailsPanel } from "./vault-details-panel";
import { VaultManagersPanel } from "./vault-managers-panel";
import { VaultPositionsPanel } from "./vault-positions-panel";
import { VaultTabChips } from "./vault-tab-chips";

const TABS = [
  { value: "positions", label: "Positions" },
  { value: "details", label: "Details" },
  { value: "activity", label: "Activity" },
  { value: "collateral", label: "Collateral" },
  { value: "analytics", label: "Analytics" },
  { value: "managers", label: "Managers" },
] as const;

type VaultTab = (typeof TABS)[number]["value"];

type VaultDetailScreenProps = {
  vault: VaultDetail;
  onBack: () => void;
  onSupply: () => void;
  onWithdraw: () => void;
};

function PanelFor({ tab, vault }: { tab: VaultTab; vault: VaultDetail }) {
  switch (tab) {
    case "positions":
      return <VaultPositionsPanel vault={vault} />;
    case "details":
      return <VaultDetailsPanel vault={vault} />;
    case "activity":
      return <VaultActivityPanel vault={vault} />;
    case "collateral":
      return <VaultCollateralPanel vault={vault} />;
    case "analytics":
      return <VaultAnalyticsPanel vault={vault} />;
    case "managers":
      return <VaultManagersPanel vault={vault} />;
  }
}

export function VaultDetailScreen({ vault, onBack, onSupply, onWithdraw }: VaultDetailScreenProps) {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<VaultTab>("positions");

  return (
    <Screen
      header={<VaultDetailHeader vault={vault} onBack={onBack} />}
      footer={
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Button flex variant="outline" label="Withdraw" onPress={onWithdraw} />
          <Button flex label="Supply" onPress={onSupply} />
        </View>
      }
    >
      <VaultTabChips tabs={TABS} value={tab} onChange={setTab} />
      <PanelFor tab={tab} vault={vault} />
    </Screen>
  );
}
