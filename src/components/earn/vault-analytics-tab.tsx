import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
import { formatAxisPercent, formatChartDate, formatRatePercent } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { ApyRange, RateSample, VaultAnalytics } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { type ChartPoint, LiveChart } from "./live-chart";
import { RangeChips } from "./range-chips";
import { RateCurveChart } from "./rate-curve-chart";
import { SectionTitle } from "./fact-card";

const RANGES = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
] as const;

const SPAN_LABEL: Record<ApyRange, string> = { "7D": "7 days", "30D": "30 days", "90D": "90 days" };

export function VaultAnalyticsTab({ analytics }: { analytics: Resource<VaultAnalytics> }) {
  return (
    <ResourceView resource={analytics} emptyLabel="No analytics for this vault">
      {(data) => (
        <View>
          <SectionTitle title="Supply APY history" marginTop={16} marginBottom={8} />
          <ApyHistoryCard analytics={data} />
          <SectionTitle title="Interest rate curve" marginTop={20} marginBottom={8} />
          <RateCurveCard analytics={data} />
        </View>
      )}
    </ResourceView>
  );
}

function ApyHistoryCard({ analytics }: { analytics: VaultAnalytics }) {
  const { colors } = useTheme();
  const [range, setRange] = useState<ApyRange>("30D");
  const [scrubbed, setScrubbed] = useState<ChartPoint | null>(null);
  const history = analytics.apy[range];
  const points = useMemo(() => history.points.map((point) => ({ at: point.at, value: point.apyPercent, text: formatRatePercent(point.apyPercent) })), [history]);
  const average = points.reduce((total, point) => total + point.value, 0) / points.length;
  const formatDate = useCallback((at: number) => formatChartDate(at, "axis", history.stepMs, analytics.now), [history.stepMs, analytics.now]);

  return (
    <Card>
      <AppText strong color="positive" style={{ fontSize: 24, lineHeight: 32 }}>
        {scrubbed?.text ?? formatRatePercent(average)}
      </AppText>
      <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
        {scrubbed ? formatChartDate(scrubbed.at, "head", history.stepMs, analytics.now) : `Average, last ${SPAN_LABEL[range]}`}
      </AppText>
      <View style={{ marginTop: 12 }}>
        <LiveChart
          points={points}
          label={`Supply APY over ${range}`}
          line={colors.positive}
          ink={colors.text}
          inkMuted={colors.textMuted}
          grid={colors.divider}
          ring={colors.surface}
          formatAxis={formatAxisPercent}
          formatDate={formatDate}
          onScrub={setScrubbed}
        />
      </View>
      <View style={{ marginTop: 10 }}>
        <RangeChips ranges={RANGES} value={range} onChange={setRange} tone="surface" />
      </View>
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
