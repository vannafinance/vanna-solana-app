import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

const SIZE = 52;

type SwapFlipButtonProps = {
  onPress: () => void;
};

export function SwapFlipButton({ onPress }: SwapFlipButtonProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ height: spacing.lg, alignItems: "center", zIndex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch tokens"
        onPress={onPress}
        style={{
          position: "absolute",
          top: -(SIZE - spacing.lg) / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: colors.primary,
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        <Image source={require("../../../assets/images/vanna-mark.png")} accessibilityLabel="Vanna" style={{ width: 28, height: 28 }} contentFit="contain" />
      </Pressable>
    </View>
  );
}
