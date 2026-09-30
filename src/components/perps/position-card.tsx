import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

export type PositionCardProps = {
  symbol: TokenSymbol;
  pair: string;
  side: "long" | "short";
  leverage: number;
  openedOn: string;
  pnl: string;
  pnlPercent: string;
  pnlPositive: boolean;
  size: string;
  sizeInToken: string;
  collateral: string;
  collateralToken: string;
  liquidationPrice: string;
  liquidationDistance: string;
  entryPrice: string;
  markPrice: string;
  onAddCollateral: () => void;
  onClose: () => void;
};

export function PositionCard(props: PositionCardProps) {
  const { colors, radius, spacing } = useTheme();
  const pnlColor = props.pnlPositive ? "positive" : "negative";

  return (
    <Card>
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <TokenIcon symbol={props.symbol} size={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyLg" strong>
              {props.pair}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Pill tone={props.side} label={`${props.side === "long" ? "Long" : "Short"} ${props.leverage}x`} />
              <AppText variant="label" color="textMuted">{`Since ${props.openedOn}`}</AppText>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="bodyLg" strong color={pnlColor}>
              {props.pnl}
            </AppText>
            <AppText variant="label" color={pnlColor}>
              {props.pnlPercent}
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: "row", padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background, gap: spacing.md }}>
          <Metric label="Size" value={props.size} sub={props.sizeInToken} />
          <Metric label="Collateral" value={props.collateral} sub={props.collateralToken} />
          <Metric label="Liq. price" value={props.liquidationPrice} sub={props.liquidationDistance} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="bodyLg" color="textMuted">
            Entry → mark
          </AppText>
          <AppText variant="bodyLg" strong>{`${props.entryPrice} → ${props.markPrice}`}</AppText>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Button flex size="md" variant="outline" label="Add collateral" onPress={props.onAddCollateral} />
          <Button flex size="md" variant="dark" label="Close position" onPress={props.onClose} />
        </View>
      </View>
    </Card>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyLg" strong>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {sub}
      </AppText>
    </View>
  );
}
