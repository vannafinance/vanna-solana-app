import { type ReactNode, useEffect } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { IconButton } from "./icon-button";

type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  dismissable?: boolean;
  title?: string;
  children: ReactNode;
};

const SLIDE_EASING = Easing.bezier(0.2, 0.9, 0.3, 1);

// The layout-animation entering="SlideInDown" leaves the sheet about one navigation bar above the bottom of the screen on
// Android, so the tab bar shows below it. The sheet slides in with its own translation instead and always ends flush.
function useSlideIn(duration: number) {
  const height = useSharedValue(1000);
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = withTiming(0, { duration, easing: SLIDE_EASING });
  }, [duration, progress]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: progress.value * height.value }] }));
  return { style, onLayout: (event: { nativeEvent: { layout: { height: number } } }) => { height.value = event.nativeEvent.layout.height; } };
}

function SheetPanel({ children }: { children: ReactNode }) {
  const { colors, layout, motion, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useSlideIn(motion.duration.long);

  return (
    <Animated.View
      onLayout={slide.onLayout}
      style={[
        {
          alignSelf: "center",
          width: "100%",
          maxWidth: layout.sheetMaxWidth,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom + 12, 28),
        },
        slide.style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function BottomSheet({ visible, onDismiss, dismissable = true, title, children }: BottomSheetProps) {
  const { colors, layout, motion } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismissable ? onDismiss : undefined}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View entering={FadeIn.duration(motion.duration.short)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }}>
          <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={dismissable ? onDismiss : undefined} />
        </Animated.View>
        <SheetPanel>
          <View style={{ alignSelf: "center", width: layout.handleWidth, height: layout.handleHeight, borderRadius: 2, backgroundColor: colors.border }} />
          {title ? (
            <View style={{ height: layout.headerHeight, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="title" style={{ fontSize: 20, lineHeight: 28 }}>
                {title}
              </AppText>
              {dismissable ? <IconButton icon="close" label="Close" tone="tonal" size={44} onPress={onDismiss} /> : null}
            </View>
          ) : (
            <View style={{ height: 12 }} />
          )}
          {children}
        </SheetPanel>
      </View>
    </Modal>
  );
}
