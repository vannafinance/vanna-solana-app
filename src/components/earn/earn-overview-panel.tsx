import { ActivityIndicator, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { AreaChart } from "@/components/ui/area-chart";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { EarnOverview, OverviewMode, OverviewRange } from "@/types/earn";
import type { Resource } from "@/types/resource";

const modes = [
  { value: "deposit", label: "Overall deposit" },
  { value: "earnings", label: "Net earnings" },
] as const;

const ranges: readonly { value: OverviewRange; label: string }[] = [
  { value: "1W", label: "1 Week" },
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "All", label: "All Time" },
];

type EarnOverviewPanelProps = {
  overview: Resource<EarnOverview>;
  mode: OverviewMode;
  onModeChange: (mode: OverviewMode) => void;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
};

export function EarnOverviewPanel({ overview, mode, onModeChange, range, onRangeChange }: EarnOverviewPanelProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
      <SegmentedControl tone="hero" segments={modes} value={mode} onChange={onModeChange} />
      {overview.status === "ready" ? (
        <>
          <AppText variant="display" style={{ color: mode === "earnings" ? colors.heroPositive : colors.onHero }}>
            {mode === "earnings" ? formatSignedUsd(overview.data.value) : formatUsd(overview.data.value)}
          </AppText>
          <AreaChart
            points={overview.data.series.map(Number)}
            height={96}
            stroke={colors.onHero}
            fillColor={colors.onHero}
          />
        </>
      ) : (
        <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}>
          {overview.status === "loading" ? <ActivityIndicator accessibilityLabel="Loading" color={colors.onHero} /> : null}
          {overview.status === "empty" ? <AppText color="onHeroMuted">Nothing supplied yet</AppText> : null}
          {overview.status === "error" ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={overview.retry} style={{ minHeight: 44, justifyContent: "center" }}>
              <AppText color="onHero" strong>
                {`${overview.error.message}. Retry`}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      )}
      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: spacing.xs }}>
        {ranges.map((option) => {
          const selected = option.value === range;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              hitSlop={{ top: 8, bottom: 8 }}
              onPress={() => onRangeChange(option.value)}
              style={{
                minHeight: 28,
                paddingHorizontal: spacing.md,
                justifyContent: "center",
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.heroGlass : "transparent",
              }}
            >
              <AppText variant="caption" strong color={selected ? "onHero" : "onHeroMuted"}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
