import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";
import type { Side } from "@/types/perps";

type SideTagProps = { side: Side; leverage: number };

export function SideTag({ side, leverage }: SideTagProps) {
  const { colors, radius } = useTheme();

  return (
    <View style={{ height: 20, paddingHorizontal: 8, borderRadius: radius.tag, backgroundColor: side === "long" ? colors.primary : colors.badgeNegative, justifyContent: "center" }}>
      <AppText variant="caption" strong color="onPrimary" style={{ lineHeight: 20 }}>
        {`${side === "long" ? "Long" : "Short"} ${leverage}x`}
      </AppText>
    </View>
  );
}
