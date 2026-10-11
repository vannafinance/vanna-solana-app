import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { type ChartPoint, LiveChart } from "@/components/ui/live-chart";
import { RangeChips } from "@/components/ui/range-chips";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatChartDate, usdToDollars } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { FarmChart, FarmEarnings, FarmOverview, FarmOverviewMode, FarmOverviewRange } from "@/types/farm";

import { formatAxisSignedUsd, signedTone } from "./farm-format";

const MODES = [
  { value: "earnings", label: "Net earnings" },
  { value: "deployed", label: "Deployed" },
] as const;

const RANGES = [
  { value: "1W", label: "1 Week" },
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "All", label: "All Time" },
] as const;

type FarmOverviewCardProps = {
  overview: FarmOverview;
  mode: FarmOverviewMode;
  onModeChange: (mode: FarmOverviewMode) => void;
  range: FarmOverviewRange;
  onRangeChange: (range: FarmOverviewRange) => void;
};

// First on the Positions page, as on Earn: net earnings (or what is deployed) over time, then what the farms have earned so
// far: Kamino's yield, the borrow interest owed on the loans, and the two netted.
export function FarmOverviewCard({ overview, mode, onModeChange, range, onRangeChange }: FarmOverviewCardProps) {
  const { spacing } = useTheme();

  return (
    <Card padded={false} style={{ overflow: "hidden" }}>
      <SegmentedControl segments={MODES} value={mode} onChange={onModeChange} dense />
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <OverviewChart chart={overview.chart} mode={mode} range={range} onRangeChange={onRangeChange} />
        <EarningsStrip earnings={overview.earnings} />
      </View>
    </Card>
  );
}

function EarningsStrip({ earnings }: { earnings: FarmEarnings }) {
  return (
    <StatStrip
      stats={[
        {
          label: "Net earnings",
          value: formatSignedUsd(earnings.netUsd),
          valueColor: signedTone(earnings.netUsd),
          sub: earnings.closedUsd > 0n ? `Incl. ${formatUsd(earnings.closedUsd)} closed` : undefined,
        },
        { label: "Interest owed", value: formatUsd(earnings.interestUsd), sub: earnings.borrowApyBps === null ? undefined : `${formatPercent(earnings.borrowApyBps)} APY` },
        {
          label: "Kamino earned",
          value: formatSignedUsd(earnings.kaminoUsd),
          valueColor: signedTone(earnings.kaminoUsd),
          sub: earnings.supplyApyBps === null ? undefined : `${formatPercent(earnings.supplyApyBps)} APY`,
        },
      ]}
    />
  );
}

type OverviewChartProps = {
  chart: FarmChart;
  mode: FarmOverviewMode;
  range: FarmOverviewRange;
  onRangeChange: (range: FarmOverviewRange) => void;
};

function OverviewChart({ chart, mode, range, onRangeChange }: OverviewChartProps) {
  const { colors, spacing } = useTheme();
  const [scrubbed, setScrubbed] = useState<ChartPoint | null>(null);
  const earnings = mode === "earnings";
  const showValue = useCallback((usd: bigint) => (earnings ? formatSignedUsd(usd) : formatUsd(usd)), [earnings]);
  const points = useMemo(() => chart.points.map((point) => ({ at: point.at, value: usdToDollars(point.usd), text: showValue(point.usd) })), [chart.points, showValue]);
  const formatDate = useCallback((at: number) => formatChartDate(at, "axis", chart.stepMs, chart.now), [chart.stepMs, chart.now]);
  // Nothing earned or deployed at any point: no line to read, so say what fills it.
  const blank = chart.value === 0n && points.every((point) => point.value === 0);
  const label = `${earnings ? "Net earnings" : "Deployed"} over ${range}`;

  return (
    <View>
      <AppText variant="heading" strong color={earnings ? signedTone(chart.value) : "text"} numberOfLines={1} accessibilityLiveRegion="polite">
        {scrubbed?.text ?? showValue(chart.value)}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {formatChartDate(scrubbed?.at ?? chart.now, "head", chart.stepMs, chart.now)}
      </AppText>
      {blank ? (
        <AppText variant="body" color="textMuted" style={{ marginTop: spacing.lg }}>
          {earnings ? "Earnings show up here once your farms start accruing." : "Deploy a strategy to see it here."}
        </AppText>
      ) : (
        <>
          <View style={{ marginTop: spacing.md }}>
            <LiveChart
              points={points}
              label={label}
              line={earnings && chart.value < 0n ? colors.negative : colors.positive}
              ink={colors.text}
              inkMuted={colors.textMuted}
              grid={colors.border}
              ring={colors.surface}
              includeZero
              formatAxis={formatAxisSignedUsd}
              formatDate={formatDate}
              onScrub={setScrubbed}
            />
          </View>
          <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
            {earnings ? "Past values estimated at a steady rate" : "Past values at today's prices"}
          </AppText>
          <View style={{ marginTop: spacing.md }}>
            <RangeChips ranges={RANGES} value={range} onChange={onRangeChange} tone="surface" />
          </View>
        </>
      )}
    </View>
  );
}

// In place of the chart when there is no farm and no Farm history: nothing to draw yet.
export function FarmOverviewEmpty() {
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.xs }}>
      <AppText variant="bodyLg" strong>
        No farms yet
      </AppText>
      <AppText variant="body" color="textMuted">
        Deploy a stock into a Kamino pool and what it earns shows up here.
      </AppText>
    </Card>
  );
}
