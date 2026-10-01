import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
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
  const { colors, radius, shadow } = useTheme();
  const pair = pairLabel(position.collateralSymbol, position.poolSymbol);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pair} farm position, health factor ${formatHealth(position.healthFactor)}`}
      onPress={onPress}
      style={[{ borderRadius: radius.md, backgroundColor: colors.surface, padding: 16 }, shadow.card]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenIcon symbol={position.collateralSymbol} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
            {pair}
          </AppText>
          <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
            Kamino
          </AppText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <HealthGauge health={position.healthFactor} />
          <AppText variant="body" strong>
            {formatHealth(position.healthFactor)}
          </AppText>
        </View>
      </View>
      <View style={{ marginTop: 14, padding: 12, borderRadius: radius.sm, backgroundColor: colors.background, gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Metric label="COLLATERAL" value={formatUsd(position.collateralValueUsd)} sub={withSymbol(position.collateral, position.collateralSymbol)} />
          <Metric label="BORROWED" value={formatUsd(position.debtValueUsd)} sub={`${position.leverage.toFixed(2)}x leverage`} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Metric label="NET APR" value={formatPercent(position.netAprBps)} sub="Kamino yield minus Vanna borrow" />
          <Metric label="EARNINGS" value={formatSignedUsd(position.earningsUsd)} sub="to date" />
        </View>
      </View>
    </Pressable>
  );
}
