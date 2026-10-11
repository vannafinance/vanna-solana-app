import { useState } from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent } from "@/format/format-amount";
import { formatRatePercent } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { RateSample, VaultAnalytics } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { SectionTitle } from "./fact-card";
import { RateCurveChart } from "./rate-curve-chart";

export function VaultAnalyticsTab({ analytics }: { analytics: Resource<VaultAnalytics> }) {
  return (
    <ResourceView resource={analytics} emptyLabel="No analytics for this vault">
      {(data) => (
        <View>
          <SectionTitle title="Rates today" marginTop={12} marginBottom={8} />
          <RatesCard analytics={data} />
          <SectionTitle title="Interest rate curve" marginTop={20} marginBottom={8} />
          <RateCurveCard analytics={data} />
        </View>
      )}
    </ResourceView>
  );
}

function RatesCard({ analytics }: { analytics: VaultAnalytics }) {
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <StatStrip
        stats={[
          { label: "Supply APY", value: formatPercent(analytics.supplyApyBps), valueColor: "positive" },
          { label: "Borrow APY", value: formatPercent(analytics.borrowApyBps) },
        ]}
      />
      <AppText variant="caption" color="textMuted">
        Rate history is not recorded yet, so only today’s rates are shown.
      </AppText>
    </Card>
  );
}

function RateCurveCard({ analytics }: { analytics: VaultAnalytics }) {
  const { colors, spacing } = useTheme();
  const [scrubbed, setScrubbed] = useState<RateSample | null>(null);
  const { samples, kink, current } = analytics.curve;
  const shown = scrubbed ?? current;
  const used = `${Math.round(shown.utilization * 100)}% borrowed`;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <AppText variant="body" strong numberOfLines={1}>
          {scrubbed ? `If ${used}` : `Today, ${used}`}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          Drag to explore
        </AppText>
      </View>
      <StatStrip
        stats={[
          { label: "Borrowers pay", value: formatRatePercent(shown.borrow * 100) },
          { label: "Lenders earn", value: formatRatePercent(shown.lender * 100), valueColor: "positive" },
        ]}
      />
      <RateCurveChart samples={samples} kink={kink} current={current} onScrub={setScrubbed} />
      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <LegendItem label="Borrow rate" color={colors.link} width={2.5} />
        <LegendItem label="Lender rate" color={colors.positive} width={2} dashed />
      </View>
    </Card>
  );
}

function LegendItem({ label, color, width, dashed = false }: { label: string; color: string; width: number; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Svg width={16} height={width}>
        <Line x1={0} x2={16} y1={width / 2} y2={width / 2} stroke={color} strokeWidth={width} strokeDasharray={dashed ? "4 3" : undefined} />
      </Svg>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}
