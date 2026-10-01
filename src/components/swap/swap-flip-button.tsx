import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "@/theme/use-theme";

const SIZE = 52;
const SPIN_MS = 460;
const SPIN_EASING = Easing.bezier(0.34, 1.56, 0.64, 1);

type SwapFlipButtonProps = {
  onPress: () => void;
};

export function SwapFlipButton({ onPress }: SwapFlipButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const turn = useSharedValue(0);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  const flip = () => {
    turn.value = withTiming(turn.value + 180, { duration: SPIN_MS, easing: SPIN_EASING });
    onPress();
  };

  return (
    <View style={{ height: spacing.lg, alignItems: "center", zIndex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Flip tokens"
        onPress={flip}
        style={{
          position: "absolute",
          top: -(SIZE - spacing.lg) / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: radius.pill,
          borderWidth: 4,
          borderColor: colors.background,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: colors.primary,
          shadowOpacity: 0.28,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Animated.View style={spin}>
          <Image source={require("../../../assets/images/vanna-mark.png")} accessibilityLabel="Vanna" style={{ width: 26, height: 26 }} contentFit="contain" />
        </Animated.View>
      </Pressable>
    </View>
  );
}
