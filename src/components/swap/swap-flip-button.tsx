import { Pressable, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { VannaMark } from "@/components/ui/vanna-mark";
import { useTheme } from "@/theme/use-theme";

const SIZE = 52;
// How far the button reaches into each card. The cards end 16 px below their content, so this keeps it clear of the shortcut buttons.
const REACH = 12;
const SPIN_MS = 460;
const SPIN_EASING = Easing.bezier(0.34, 1.56, 0.64, 1);

type SwapFlipButtonProps = {
  onPress: () => void;
};

export function SwapFlipButton({ onPress }: SwapFlipButtonProps) {
  const { colors, radius, scheme } = useTheme();
  const turn = useSharedValue(0);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  const flip = () => {
    turn.value = withTiming(turn.value + 180, { duration: SPIN_MS, easing: SPIN_EASING });
    onPress();
  };

  return (
    <View style={{ height: SIZE - 2 * REACH, alignItems: "center", zIndex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Flip tokens"
        onPress={flip}
        style={{
          position: "absolute",
          top: -REACH,
          width: SIZE,
          height: SIZE,
          borderRadius: radius.pill,
          // The same face as the leverage slider's thumb: a near-black disc on a dark screen, white on a light one, ringed in purple.
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: scheme === "dark" ? colors.background : "#FFFFFF",
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
          <VannaMark size={28} tone="logo" />
        </Animated.View>
      </Pressable>
    </View>
  );
}
