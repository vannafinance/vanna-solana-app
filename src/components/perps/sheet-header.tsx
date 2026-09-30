import { X } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

type SheetHeaderProps = {
  symbol: PerpsSymbol;
  title: string;
  subtitle: string;
  onClose: () => void;
};

export function SheetHeader({ symbol, title, subtitle, onClose }: SheetHeaderProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <TokenIcon symbol={symbol} size={36} />
      <View style={{ flex: 1 }}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {subtitle}
        </AppText>
      </View>
      <IconButton icon={X} label="Close" tone="outline" onPress={onClose} />
    </View>
  );
}
