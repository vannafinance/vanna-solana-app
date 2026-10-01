import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatAssetAmount, pairLabel, withSymbol } from "./farm-format";
import { Metric } from "./metric";

type PositionOverviewProps = {
  position: FarmPositionView;
};

const LINE = 24;

export function PositionOverview({ position }: PositionOverviewProps) {
  const { colors, radius, shadow } = useTheme();
  const pool = position.poolSymbol;
  const card = [{ borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 4 }, shadow.card];

  return (
    <>
      <View style={card}>
        <View style={{ paddingVertical: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TokenIcon symbol={position.collateralSymbol} size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" strong numberOfLines={1} style={{ lineHeight: 22 }}>
                {pairLabel(position.collateralSymbol, pool)}
              </AppText>
              <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ lineHeight: 16 }}>
                Kamino · On-chain position
              </AppText>
            </View>
            <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.purpleTint, justifyContent: "center" }}>
              <AppText variant="caption" strong color="onPurpleTint">
                {`${position.leverage.toFixed(2)}x`}
              </AppText>
            </View>
          </View>
          <View style={{ marginTop: 16, padding: 12, borderRadius: radius.sm, backgroundColor: colors.background, gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Metric
                label="COLLATERAL"
                value={formatUsd(position.collateralValueUsd)}
                sub={withSymbol(position.collateral, position.collateralSymbol)}
                valueLineHeight={LINE}
              />
              <Metric
                label="DEBT WITH INTEREST"
                value={formatUsd(position.debtValueUsd)}
                sub={`${withSymbol(position.principal, pool)} + ${formatAssetAmount(position.interest, pool)}`}
                valueLineHeight={LINE}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Metric label="NET VALUE" value={formatUsd(position.netValueUsd)} sub={`+${withSymbol(position.yieldEarned, pool)} yield`} valueLineHeight={LINE} />
              <Metric label="SUPPLIED TO KAMINO" value={formatUsd(position.suppliedValueUsd)} sub={withSymbol(position.supplied, pool)} valueLineHeight={LINE} />
            </View>
          </View>
        </View>
      </View>
      <View style={card}>
        <View style={{ height: 44, justifyContent: "center" }}>
          <CapsLabel>APR BREAKDOWN</CapsLabel>
        </View>
        <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: "row", gap: 10 }}>
          <Metric label="SUPPLY" value={formatPercent(position.supplyApyBps)} sub={`Kamino ${pool}`} valueLineHeight={LINE} />
          <Metric label="BORROW" value={formatPercent(position.borrowApyBps)} sub="Vanna loan" valueLineHeight={LINE} />
          <Metric label="NET APR" value={formatPercent(position.netAprBps)} sub="on the loan" valueLineHeight={LINE} />
        </View>
      </View>
    </>
  );
}
