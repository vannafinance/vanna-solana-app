import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type SnackbarProps = {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  bottomOffset?: number;
};

const MAX_WIDTH = 560;

export function Snackbar({ message, onDismiss, duration = 4000, actionLabel, onAction, bottomOffset = 0 }: SnackbarProps) {
  const { colors, motion, radius, shadow, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (message === null) return null;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: insets.bottom + spacing.lg + bottomOffset, alignItems: "center" }}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        entering={FadeIn.duration(motion.duration.short)}
        exiting={FadeOut.duration(motion.duration.short)}
        style={[
          {
            width: "100%",
            maxWidth: MAX_WIDTH,
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.lg,
            paddingVertical: 14,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.xs,
            backgroundColor: colors.snackbar,
          },
          shadow.snackbar,
        ]}
      >
        <AppText variant="body" style={{ flex: 1, lineHeight: 20, color: colors.onSnackbar }}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={12} onPress={onAction}>
            <AppText variant="body" strong style={{ color: colors.onSnackbar }}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
