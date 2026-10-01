import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail, VaultEventKind } from "@/types/earn";

import { formatSummaryAmount } from "@/format/format-earn";
import { EarnStatRow } from "./earn-stat-row";

const EVENT_LABELS: Record<VaultEventKind, string> = {
  supply: "Supply",
  borrow: "Borrow",
  repay: "Repay",
  withdraw: "Withdraw",
};

type VaultActivityPanelProps = {
  vault: VaultDetail;
};

export function VaultActivityPanel({ vault }: VaultActivityPanelProps) {
  const { spacing } = useTheme();
  const otherShareBps = 10_000 - vault.topSuppliersShareBps;

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText strong>Supply distribution</AppText>
      <Card style={{ paddingVertical: spacing.xs }}>
        <EarnStatRow
          first
          label="Top 10 suppliers"
          value={formatSummaryAmount(vault.topSuppliers, vault.symbol)}
          caption={`${formatPercent(vault.topSuppliersShareBps, 1)} of supply`}
        />
        <EarnStatRow
          label="Everyone else"
          value={formatSummaryAmount(vault.otherSuppliers, vault.symbol)}
          caption={`${formatPercent(otherShareBps, 1)} of supply`}
        />
      </Card>
      <AppText strong style={{ marginTop: spacing.md }}>
        Recent activity
      </AppText>
      <Card style={{ paddingVertical: spacing.xs }}>
        {vault.activity.map((entry, index) => (
          <EarnStatRow
            key={entry.kind}
            first={index === 0}
            label={EVENT_LABELS[entry.kind]}
            value={formatSummaryAmount(entry.amount, vault.symbol)}
            caption={`${entry.when} · Confirmed`}
          />
        ))}
      </Card>
    </View>
  );
}
