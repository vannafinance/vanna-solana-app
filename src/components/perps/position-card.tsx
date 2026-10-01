import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { Side } from "@/types/perps";

import { SideTag } from "./side-tag";

export type PositionCardProps = {
  symbol: TokenSymbol;
  pair: string;
  side: Side;
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
  const { colors, radius } = useTheme();
  const pnlColor = props.pnlPositive ? "positive" : "negative";

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenIcon symbol={props.symbol} size={40} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodyLg" strong style={{ lineHeight: 20 }}>
            {props.pair}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <SideTag side={props.side} leverage={props.leverage} />
            <AppText variant="caption" color="textMuted">{`Since ${props.openedOn}`}</AppText>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <AppText variant="bodyLg" strong color={pnlColor} style={{ lineHeight: 20 }}>
            {props.pnl}
          </AppText>
          <AppText variant="caption" color={pnlColor}>
            {props.pnlPercent}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16, padding: 12, borderRadius: radius.sm, backgroundColor: colors.background }}>
        <Metric label="Size" value={props.size} sub={props.sizeInToken} />
        <Metric label="Collateral" value={props.collateral} sub={props.collateralToken} />
        <Metric label="Liq. price" value={props.liquidationPrice} sub={props.liquidationDistance} />
      </View>

      <View style={{ height: 20, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="body" color="textMuted">
          Entry → mark
        </AppText>
        <AppText variant="body" strong>{`${props.entryPrice} → ${props.markPrice}`}</AppText>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <Button flex size="sm" variant="outline" label="Add collateral" onPress={props.onAddCollateral} />
        <Button flex size="sm" variant="dark" label="Close position" onPress={props.onClose} />
      </View>
    </Card>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="body" strong>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {sub}
      </AppText>
    </View>
  );
}
