import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { RateCurveChart } from "./rate-curve-chart";

type VaultAnalyticsPanelProps = {
  vault: VaultDetail;
};

function RateCard({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <Card style={{ flex: 1 }}>
      <AppText color="textMuted">{label}</AppText>
      <AppText variant="heading" color={positive ? "positive" : "text"}>
        {value}
      </AppText>
    </Card>
  );
}

export function VaultAnalyticsPanel({ vault }: VaultAnalyticsPanelProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <RateCard positive label="Supply APY" value={formatPercent(vault.supplyApyBps)} />
        <RateCard label="Borrow APY" value={formatPercent(vault.borrowApyBps)} />
      </View>
      <AppText strong style={{ marginTop: spacing.md }}>
        Interest rate curve
      </AppText>
      <Card>
        <RateCurveChart curve={vault.rateCurve} utilizationBps={vault.utilizationBps} borrowApyBps={vault.borrowApyBps} />
      </Card>
      <AppText variant="body" color="textMuted">
        {"Rate history shows here once it is indexed on-chain. Today's rates are live."}
      </AppText>
    </View>
  );
}
