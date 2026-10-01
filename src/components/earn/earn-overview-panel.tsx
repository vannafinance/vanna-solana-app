import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ResourceView } from "@/components/ui/resource-view";
import { formatUsd } from "@/format/format-amount";
import { formatAxisUsd, formatChartDate, usdToDollars } from "@/format/format-earn";
import { spaces } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { EarnOverview, OverviewMode, OverviewRange } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { HeroTabs } from "./hero-tabs";
import { type ChartPoint, LiveChart } from "./live-chart";
import { RangeChips } from "./range-chips";

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

type EarnOverviewPanelProps = {
  overview: Resource<EarnOverview>;
  mode: OverviewMode;
  onModeChange: (mode: OverviewMode) => void;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
};

export function EarnOverviewPanel({ overview, mode, onModeChange, range, onRangeChange }: EarnOverviewPanelProps) {
  return (
    <View>
      <HeroTabs tabs={MODES} value={mode} onChange={onModeChange} />
      <ResourceView resource={overview} emptyLabel="No deposits yet">
        {(data) => <OverviewChart overview={data} mode={mode} range={range} onRangeChange={onRangeChange} />}
      </ResourceView>
    </View>
  );
}

type OverviewChartProps = {
  overview: EarnOverview;
  mode: OverviewMode;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
};

function OverviewChart({ overview, mode, range, onRangeChange }: OverviewChartProps) {
  const { colors } = useTheme();
  const [scrubbed, setScrubbed] = useState<ChartPoint | null>(null);
  const showValue = useCallback((usd: bigint) => (mode === "earnings" ? `+${formatUsd(usd)}` : formatUsd(usd)), [mode]);
  const points = useMemo(() => overview.points.map((point) => ({ at: point.at, value: usdToDollars(point.usd), text: showValue(point.usd) })), [overview.points, showValue]);
  const formatDate = useCallback((at: number) => formatChartDate(at, "axis", overview.stepMs, overview.now), [overview.stepMs, overview.now]);
  const label = `${mode === "earnings" ? "Net earnings" : "Overall deposit"} over ${range}`;

  return (
    <View>
      <AppText style={{ marginTop: 14, fontSize: 40, lineHeight: 48, letterSpacing: -0.8, color: colors.onHero }} strong accessibilityLiveRegion="polite">
        {scrubbed?.text ?? showValue(overview.value)}
      </AppText>
      <AppText variant="body" style={{ lineHeight: 20, color: colors.onHeroSoft }}>
        {formatChartDate(scrubbed?.at ?? overview.now, "head", overview.stepMs, overview.now)}
      </AppText>
      <View style={{ marginTop: 12 }}>
        <LiveChart
          points={points}
          label={label}
          line={colors.onHero}
          ink={colors.onHero}
          inkMuted={colors.onHeroMuted}
          grid={colors.heroRule}
          ring={spaces.earn.panel[0]}
          includeZero
          formatAxis={formatAxisUsd}
          formatDate={formatDate}
          onScrub={setScrubbed}
        />
      </View>
      <View style={{ marginTop: 10 }}>
        <RangeChips ranges={RANGES} value={range} onChange={onRangeChange} tone="hero" />
      </View>
    </View>
  );
}
