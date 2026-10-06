import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatUsd } from "@/format/format-amount";
import { formatAxisUsd, formatChartDate, usdToDollars } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { EarnOverview, OverviewMode, OverviewRange } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { type ChartPoint, LiveChart } from "@/components/ui/live-chart";
import { RangeChips } from "@/components/ui/range-chips";

const MODES = [
  { value: "deposit", label: "Overall deposit" },
  { value: "earnings", label: "Net earnings" },
] as const;

const RANGES = [
  { value: "1W", label: "1 Week" },
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "All", label: "All Time" },
] as const;

type EarnOverviewCardProps = {
  overview: Resource<EarnOverview>;
  mode: OverviewMode;
  onModeChange: (mode: OverviewMode) => void;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
};

// The deposit value over time (or net earnings), first on the Positions page.
export function EarnOverviewCard({ overview, mode, onModeChange, range, onRangeChange }: EarnOverviewCardProps) {
  const { spacing } = useTheme();

  return (
    <Card padded={false} style={{ overflow: "hidden" }}>
      <SegmentedControl segments={MODES} value={mode} onChange={onModeChange} dense />
      <View style={{ padding: spacing.lg }}>
        <ResourceView resource={overview} emptyLabel={mode === "earnings" ? "Earnings unavailable right now" : "No deposits yet"}>
          {(data) => <OverviewChart overview={data} mode={mode} range={range} onRangeChange={onRangeChange} />}
        </ResourceView>
      </View>
    </Card>
  );
}

type OverviewChartProps = {
  overview: EarnOverview;
  mode: OverviewMode;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
};

function OverviewChart({ overview, mode, range, onRangeChange }: OverviewChartProps) {
  const { colors, spacing } = useTheme();
  const [scrubbed, setScrubbed] = useState<ChartPoint | null>(null);
  const showValue = useCallback((usd: bigint) => (mode === "earnings" ? `+${formatUsd(usd)}` : formatUsd(usd)), [mode]);
  const points = useMemo(() => overview.points.map((point) => ({ at: point.at, value: usdToDollars(point.usd), text: showValue(point.usd) })), [overview.points, showValue]);
  const formatDate = useCallback((at: number) => formatChartDate(at, "axis", overview.stepMs, overview.now), [overview.stepMs, overview.now]);
  // A wallet that has supplied nothing has a series of zeros: no line to read and no scale to draw, so say what to do instead.
  const noHistory = overview.value === 0n && points.every((point) => point.value === 0);
  const label = `${mode === "earnings" ? "Net earnings" : "Overall deposit"} over ${range}`;

  return (
    <View>
      <AppText variant="heading" strong color={mode === "earnings" && overview.value > 0n ? "positive" : "text"} numberOfLines={1} accessibilityLiveRegion="polite">
        {scrubbed?.text ?? showValue(overview.value)}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {formatChartDate(scrubbed?.at ?? overview.now, "head", overview.stepMs, overview.now)}
      </AppText>
      {noHistory ? (
        <AppText variant="body" color="textMuted" style={{ marginTop: spacing.lg }}>
          {mode === "earnings" ? "Earnings show up here once your deposits start accruing." : "Supply to a vault to see your deposits here."}
        </AppText>
      ) : (
        <>
          <View style={{ marginTop: spacing.md }}>
            <LiveChart
              points={points}
              label={label}
              line={colors.positive}
              ink={colors.text}
              inkMuted={colors.textMuted}
              grid={colors.border}
              ring={colors.surface}
              includeZero
              formatAxis={formatAxisUsd}
              formatDate={formatDate}
              onScrub={setScrubbed}
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <RangeChips ranges={RANGES} value={range} onChange={onRangeChange} tone="surface" />
          </View>
        </>
      )}
    </View>
  );
}
