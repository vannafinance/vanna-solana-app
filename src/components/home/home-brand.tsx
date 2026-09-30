import { Image } from "expo-image";
import { View } from "react-native";

import { VannaWordmark } from "@/components/ui/vanna-wordmark";
import { useTheme } from "@/theme/use-theme";

export function HomeBrand() {
  const { colors, radius, spacing } = useTheme();

  return (
    <View accessibilityLabel="Vanna" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.onHero, alignItems: "center", justifyContent: "center" }}>
        <Image source={require("../../../assets/images/vanna-mark.png")} style={{ width: 26, height: 26 }} contentFit="contain" />
      </View>
      <VannaWordmark color={colors.onHero} height={22} />
    </View>
  );
}
