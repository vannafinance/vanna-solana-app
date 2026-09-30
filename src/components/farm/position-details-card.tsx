import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { health } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatHealth, withSymbol } from "./farm-format";

type PositionDetailsCardProps = {
  position: FarmPositionView;
};

export function PositionDetailsCard({ position }: PositionDetailsCardProps) {
  const { spacing } = useTheme();
  const pool = position.poolSymbol;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <CapsLabel style={{ marginBottom: spacing.sm }}>Position details</CapsLabel>
        <DetailRow label="Collateral" value={withSymbol(position.collateral, position.collateralSymbol)} />
        <DetailRow label="Kamino supply" value={withSymbol(position.supplied, pool)} />
        <DetailRow label="Debt (with interest)" value={withSymbol(position.debt, pool)} />
        <DetailRow label="Interest accrued" value={`+${withSymbol(position.interest, pool)}`} />
        <DetailRow label="Kamino yield earned" value={`+${withSymbol(position.yieldEarned, pool)}`} valueColor="positive" />
        <DetailRow label="Leverage" value={`${position.leverage.toFixed(2)}x`} />
        <DetailRow label="Position health factor" value={formatHealth(position.healthFactor)} last />
        <AppText variant="caption" color="textMuted" style={{ textAlign: "right" }}>
          {`Liquidation at ${health.liquidation.toFixed(2)}`}
        </AppText>
      </Card>
      <AppText variant="body" color="textMuted">
        {`Closing redeems your Kamino supply, repays the ${pool} loan with interest, then returns your ${position.collateralSymbol}. It takes two approvals in Backpack.`}
      </AppText>
    </View>
  );
}
