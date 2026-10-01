import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { health } from "@/theme/tokens";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatHealth, withSymbol } from "./farm-format";

type PositionDetailsCardProps = {
  position: FarmPositionView;
};

type RowProps = { label: string; value: string; valueColor?: ThemeColor; sub?: string };

function Row({ label, value, valueColor = "text", sub }: RowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        minHeight: 52,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="body" strong color={valueColor} style={{ textAlign: "right" }}>
          {value}
        </AppText>
        {sub ? (
          <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function PositionDetailsCard({ position }: PositionDetailsCardProps) {
  const { colors, radius, shadow } = useTheme();
  const pool = position.poolSymbol;

  return (
    <>
      <View style={[{ borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 4 }, shadow.card]}>
        <View style={{ height: 44, justifyContent: "center" }}>
          <CapsLabel>POSITION DETAILS</CapsLabel>
        </View>
        <Row label="Collateral" value={withSymbol(position.collateral, position.collateralSymbol)} />
        <Row label="Kamino supply" value={withSymbol(position.supplied, pool)} />
        <Row label="Debt (with interest)" value={withSymbol(position.debt, pool)} />
        <Row label="Interest accrued" value={`+${withSymbol(position.interest, pool)}`} />
        <Row label="Kamino yield earned" value={`+${withSymbol(position.yieldEarned, pool)}`} valueColor="positive" />
        <Row label="Leverage" value={`${position.leverage.toFixed(2)}x`} />
        <Row label="Position health factor" value={formatHealth(position.healthFactor)} sub={`Liquidation at ${health.liquidation.toFixed(2)}`} />
      </View>
      <AppText variant="caption" color="textMuted" style={{ marginHorizontal: 4, lineHeight: 18 }}>
        {`Closing redeems your Kamino supply, repays the ${pool} loan with interest, then returns your ${position.collateralSymbol}. It takes two approvals in your wallet.`}
      </AppText>
    </>
  );
}
