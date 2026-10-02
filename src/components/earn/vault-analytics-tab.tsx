import { useState } from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
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
          <SectionTitle title="Rates today" marginTop={16} marginBottom={8} />
          <RatesCard analytics={data} />
          <SectionTitle title="Interest rate curve" marginTop={20} marginBottom={8} />
          <RateCurveCard analytics={data} />
        </View>
      )}
    </ResourceView>
  );
}

function RatesCard({ analytics }: { analytics: VaultAnalytics }) {
  const stats = [
    { label: "Supply APY", value: formatPercent(analytics.supplyApyBps), color: "positive" },
    { label: "Borrow APY", value: formatPercent(analytics.borrowApyBps), color: "text" },
  ] as const;

  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 24 }}>
        {stats.map((stat) => (
          <View key={stat.label}>
            <AppText strong color={stat.color} style={{ fontSize: 24, lineHeight: 32 }}>
              {stat.value}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="textMuted" style={{ marginTop: 12 }}>
        Rate history is not recorded yet, so only today’s rates are shown.
      </AppText>
    </Card>
  );
}

function RateCurveCard({ analytics }: { analytics: VaultAnalytics }) {
  const { colors } = useTheme();
  const [scrubbed, setScrubbed] = useState<RateSample | null>(null);
  const { samples, kink, current } = analytics.curve;
  const shown = scrubbed ?? current;
  const stats = [
    { label: "Borrowers pay", value: formatRatePercent(shown.borrow * 100), color: "text" },
    { label: "Lenders earn", value: formatRatePercent(shown.lender * 100), color: "positive" },
  ] as const;

  return (
    <Card>
      <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
        {scrubbed ? `If ${Math.round(scrubbed.utilization * 100)}% of the pool is borrowed` : "At today’s usage (drag to try others)"}
      </AppText>
      <View style={{ marginTop: 2, flexDirection: "row", gap: 20 }}>
        {stats.map((stat) => (
          <View key={stat.label}>
            <AppText strong color={stat.color} style={{ fontSize: 24, lineHeight: 32 }}>
              {stat.value}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 14 }}>
        <RateCurveChart samples={samples} kink={kink} current={current} onScrub={setScrubbed} />
      </View>
      <View style={{ marginTop: 6, flexDirection: "row", gap: 16 }}>
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
