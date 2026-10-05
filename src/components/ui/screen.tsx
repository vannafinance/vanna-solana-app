import { isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Space, spaceHeaders } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { SpaceHeader } from "./space-header";

type ScreenProps = {
  header?: ReactNode;
  footer?: ReactNode;
  gap?: number;
  paddingTop?: number;
  children: ReactNode;
};

// How far the page scrolls before the status bar backing is fully shown.
const SCRIM_SCROLL = 32;

function headerSpace(header: ReactNode): Space | null {
  return isValidElement<{ space: Space }>(header) && header.type === SpaceHeader ? header.props.space : null;
}

export function Screen({ header, footer, gap, paddingTop, children }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scroll.value = event.contentOffset.y;
  });
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(scroll.value, [0, SCRIM_SCROLL], [0, 1], "clamp") }));
  const space = headerSpace(header);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {header}
        <View style={{ padding: spacing.lg, paddingTop: paddingTop ?? spacing.lg, gap: gap ?? spacing.lg }}>{children}</View>
      </Animated.ScrollView>
      {space === null ? null : (
        // The gradient header scrolls away but the status bar keeps its light icons, so once content slides under it, it is
        // backed by the header's own colour.
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: spaceHeaders[space].surface[0] }, scrim]} />
      )}
      {footer ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
