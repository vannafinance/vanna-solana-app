import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

// The Earn Positions chart and its range chips, so the three Positions pages draw the same chart.
import { type ChartPoint, LiveChart } from "@/components/ui/live-chart";
import { RangeChips } from "@/components/ui/range-chips";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatSignedUsd, formatUsdOrDash } from "@/format/format-amount";
import { formatChartDate, usdToDollars } from "@/format/format-earn";
import { formatAxisSignedUsd } from "@/format/format-perps";
import { useTheme } from "@/theme/use-theme";
import type { EarningsRange, TradeEarnings } from "@/types/perps";
import type { Resource } from "@/types/resource";

const RANGES = [
  { value: "1W", label: "1 Week" },
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "All", label: "All Time" },
] as const;

type TradeEarningsCardProps = {
  earnings: Resource<TradeEarnings>;
  range: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
};

// First on the Positions page: net earnings over time, then the open positions' P&L, the interest they owe so far and how
// many there are. Health, leverage and room before liquidation are the header's.
export function TradeEarningsCard({ earnings, range, onRangeChange }: TradeEarningsCardProps) {
  const { spacing } = useTheme();

  return (
    <Card padded={false} style={{ overflow: "hidden" }}>
      <View style={{ padding: spacing.lg }}>
        <AppText variant="body" strong>
          Net earnings
        </AppText>
        <ResourceView resource={earnings} emptyLabel="Earnings unavailable right now">
          {(data) => <EarningsChart earnings={data} range={range} onRangeChange={onRangeChange} />}
        </ResourceView>
      </View>
    </Card>
  );
}

type EarningsChartProps = {
  earnings: TradeEarnings;
  range: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
};

function EarningsChart({ earnings, range, onRangeChange }: EarningsChartProps) {
  const { colors, spacing } = useTheme();
  const [scrubbed, setScrubbed] = useState<ChartPoint | null>(null);
  const points = useMemo(() => earnings.points.map((point) => ({ at: point.at, value: usdToDollars(point.usd), text: formatSignedUsd(point.usd) })), [earnings.points]);
  const formatDate = useCallback((at: number) => formatChartDate(at, "axis", earnings.stepMs, earnings.now), [earnings.stepMs, earnings.now]);
  const tone = earnings.net > 0n ? "positive" : earnings.net < 0n ? "negative" : "text";
  const pnl = earnings.openPnl;

  return (
    <View>
      <AppText variant="heading" strong color={scrubbed === null ? tone : "text"} numberOfLines={1} accessibilityLiveRegion="polite" style={{ marginTop: spacing.sm }}>
        {scrubbed?.text ?? formatSignedUsd(earnings.net)}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {formatChartDate(scrubbed?.at ?? earnings.now, "head", earnings.stepMs, earnings.now)}
      </AppText>
      <View style={{ marginTop: spacing.md }}>
        <LiveChart
          points={points}
          label={`Net earnings over ${range}`}
          line={earnings.net < 0n ? colors.negative : colors.positive}
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
      <View style={{ marginTop: spacing.md }}>
        <RangeChips ranges={RANGES} value={range} onChange={onRangeChange} tone="surface" />
      </View>
      {earnings.partial ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.sm }}>
          Trades opened before your history starts are not counted.
        </AppText>
      ) : null}
      <View style={{ marginTop: spacing.lg }}>
        <StatStrip
          stats={[
            { label: "Open P&L", value: pnl === null ? "—" : formatSignedUsd(pnl), valueColor: pnl === null || pnl === 0n ? "text" : pnl > 0n ? "positive" : "negative" },
            { label: "Interest owed", value: formatUsdOrDash(earnings.interest) },
            { label: "Open positions", value: earnings.openCount === null ? "—" : String(earnings.openCount) },
          ]}
        />
      </View>
    </View>
  );
}
