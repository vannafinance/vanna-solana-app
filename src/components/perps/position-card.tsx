import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
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

// One open position: the pair, side and P&L on the title row, then its figures in two strips, then what to do with it.
export function PositionCard(props: PositionCardProps) {
  const pnlColor = props.pnlPositive ? "positive" : "negative";

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenIcon symbol={props.symbol} size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText variant="bodyLg" strong numberOfLines={1} style={{ flexShrink: 1 }}>
              {props.pair}
            </AppText>
            <SideTag side={props.side} leverage={props.leverage} />
          </View>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>{`Since ${props.openedOn}`}</AppText>
        </View>
        <View accessible accessibilityLabel={`P&L ${props.pnl}, ${props.pnlPercent}`} style={{ alignItems: "flex-end", gap: 2 }}>
          <AppText variant="bodyLg" strong color={pnlColor}>
            {props.pnl}
          </AppText>
          <AppText variant="caption" color={pnlColor}>
            {props.pnlPercent}
          </AppText>
        </View>
      </View>

      <StatStrip
        stats={[
          { label: "Size", value: props.size, sub: props.sizeInToken },
          { label: "Collateral", value: props.collateral, sub: props.collateralToken },
          { label: "Liq. price", value: props.liquidationPrice, sub: props.liquidationDistance },
        ]}
      />
      <StatStrip
        stats={[
          { label: "Entry price", value: props.entryPrice },
          { label: "Mark price", value: props.markPrice },
        ]}
      />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <Button flex size="sm" variant="outline" label="Add collateral" onPress={props.onAddCollateral} />
        <Button flex size="sm" variant="dark" label="Close position" onPress={props.onClose} />
      </View>
    </Card>
  );
}
