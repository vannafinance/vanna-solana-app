import { ArrowLeft, CaretDown, Star } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

type MarketHeaderProps = {
  symbol: PerpsSymbol;
  pair: string;
  name: string;
  price: string;
  watched: boolean;
  onBack: () => void;
  onToggleWatch: () => void;
  onOpenSwitcher: () => void;
};

export function MarketHeader({ symbol, pair, name, price, watched, onBack, onToggleWatch, onOpenSwitcher }: MarketHeaderProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton icon={ArrowLeft} label="Back" onPress={onBack} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={watched ? `Remove ${pair} from watchlist` : `Add ${pair} to watchlist`}
          accessibilityState={{ selected: watched }}
          onPress={onToggleWatch}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Star size={22} weight={watched ? "fill" : "regular"} color={watched ? colors.link : colors.textMuted} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch market, ${pair} selected`}
        onPress={onOpenSwitcher}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 }}
      >
        <TokenIcon symbol={symbol} size={36} />
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppText variant="bodyLg" strong>
              {pair}
            </AppText>
            <CaretDown size={16} color={colors.text} />
          </View>
          <AppText variant="label" color="textMuted">
            {name}
          </AppText>
        </View>
      </Pressable>
      <AppText variant="display" accessibilityLabel={`Mark price ${price}`}>
        {price}
      </AppText>
    </View>
  );
}
