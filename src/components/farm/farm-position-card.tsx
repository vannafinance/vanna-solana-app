import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { formatHealth, pairLabel, withSymbol } from "./farm-format";
import { HealthGauge } from "./health-gauge";
import { Metric } from "./metric";

type FarmPositionCardProps = {
  position: FarmPositionView;
  onPress: () => void;
};

export function FarmPositionCard({ position, onPress }: FarmPositionCardProps) {
  const { colors, radius, spacing } = useTheme();
  const pair = pairLabel(position.collateralSymbol, position.poolSymbol);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pair} farm position, health factor ${formatHealth(position.healthFactor)}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <TokenIcon symbol={position.collateralSymbol} size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="title" strong>
                {pair}
              </AppText>
              <AppText variant="body" color="textMuted">
                Kamino
              </AppText>
            </View>
            <HealthGauge health={position.healthFactor} />
            <AppText variant="bodyLg" strong>
              {formatHealth(position.healthFactor)}
            </AppText>
          </View>
          <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, gap: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Metric
                label="Collateral"
                value={formatUsd(position.collateralValueUsd)}
                sub={withSymbol(position.collateral, position.collateralSymbol)}
              />
              <Metric label="Borrowed" value={formatUsd(position.debtValueUsd)} sub={`${position.leverage.toFixed(2)}x leverage`} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Metric label="Net APR" value={formatPercent(position.netAprBps)} sub="Kamino yield minus Vanna borrow" />
              <Metric label="Earnings" value={formatSignedUsd(position.earningsUsd)} sub="to date" />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
