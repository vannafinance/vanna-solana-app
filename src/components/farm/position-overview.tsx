import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
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

export function PositionOverview({ position }: PositionOverviewProps) {
  const { colors, radius, spacing } = useTheme();
  const pool = position.poolSymbol;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <TokenIcon symbol={position.collateralSymbol} size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" strong>
                {pairLabel(position.collateralSymbol, pool)}
              </AppText>
              <AppText variant="caption" color="textMuted">
                Kamino · On-chain position
              </AppText>
            </View>
            <Pill label={`${position.leverage.toFixed(2)}x`} />
          </View>
          <View style={{ padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.background, gap: spacing.lg }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Metric
                label="Collateral"
                value={formatUsd(position.collateralValueUsd)}
                sub={withSymbol(position.collateral, position.collateralSymbol)}
              />
              <Metric
                label="Debt with interest"
                value={formatUsd(position.debtValueUsd)}
                sub={`${withSymbol(position.principal, pool)} + ${formatAssetAmount(position.interest, pool)}`}
              />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <Metric label="Net value" value={formatUsd(position.netValueUsd)} sub={`+${withSymbol(position.yieldEarned, pool)} yield`} />
              <Metric label="Supplied to Kamino" value={formatUsd(position.suppliedValueUsd)} sub={withSymbol(position.supplied, pool)} />
            </View>
          </View>
        </View>
      </Card>
      <Card>
        <View style={{ gap: spacing.md }}>
          <CapsLabel>APR breakdown</CapsLabel>
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Metric label="Supply" value={formatPercent(position.supplyApyBps)} sub={`Kamino ${pool}`} />
            <Metric label="Borrow" value={formatPercent(position.borrowApyBps)} sub="Vanna loan" />
            <Metric label="Net APR" value={formatPercent(position.netAprBps)} sub="on the loan" />
          </View>
        </View>
      </Card>
    </View>
  );
}
