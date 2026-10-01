import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";

type SheetHeaderProps = {
  symbol: PerpsSymbol;
  title: string;
  subtitle: string;
  onClose: () => void;
};

export function SheetHeader({ symbol, title, subtitle, onClose }: SheetHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <TokenIcon symbol={symbol} size={36} />
      <View style={{ flex: 1 }}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {subtitle}
        </AppText>
      </View>
      <IconButton icon="close" label="Close" tone="tonal" size={44} onPress={onClose} />
    </View>
  );
}
