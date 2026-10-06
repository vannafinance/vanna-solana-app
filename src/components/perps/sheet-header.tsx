import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol, Side } from "@/types/perps";

import { SideTag } from "./side-tag";

type SheetHeaderProps = {
  symbol: PerpsSymbol;
  title: string;
  pair: string;
  side: Side;
  leverage: number;
  onClose: () => void;
};

// The title row of a position sheet: what the sheet does, then which position, as the pair and its side tag.
export function SheetHeader({ symbol, title, pair, side, leverage, onClose }: SheetHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <TokenIcon symbol={symbol} size={40} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText variant="heading">{title}</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText variant="body" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {pair}
          </AppText>
          <SideTag side={side} leverage={leverage} />
        </View>
      </View>
      <IconButton icon="close" label="Close" tone="tonal" size={44} onPress={onClose} />
    </View>
  );
}
