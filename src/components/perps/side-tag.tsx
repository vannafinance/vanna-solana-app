import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";
import type { Side } from "@/types/perps";

type SideTagProps = { side: Side; leverage: number };

// The side and leverage of one position: violet for a long, red for a short.
export function SideTag({ side, leverage }: SideTagProps) {
  const { colors, radius } = useTheme();

  return (
    <View style={{ minHeight: 22, paddingVertical: 2, paddingHorizontal: 7, borderRadius: radius.tag, backgroundColor: side === "long" ? colors.primary : colors.badgeNegative, justifyContent: "center" }}>
      <AppText variant="caption" strong color="onPrimary" numberOfLines={1}>
        {`${side === "long" ? "Long" : "Short"} ${leverage}x`}
      </AppText>
    </View>
  );
}
