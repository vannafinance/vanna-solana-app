import { type ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

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
const EXIT_EASING = Easing.bezier(0.4, 0, 1, 1);
const EXIT_MS = 200;

// The sheet slides in and out with its own translation (the layout-animation entering="SlideInDown" leaves it about one navigation bar
// above the bottom of the screen on Android, so the tab bar shows below it). `progress` is 1 while it is closed and 0 while it is open;
// the backdrop fades with it.
function SheetPanel({ children, progress }: { children: ReactNode; progress: SharedValue<number> }) {
  const { colors, layout, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const height = useSharedValue(1000);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: progress.get() * height.get() }] }));

  return (
    <Animated.View
      onLayout={(event) => height.set(event.nativeEvent.layout.height)}
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
        slide,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function BottomSheet({ visible, onDismiss, dismissable = true, title, children }: BottomSheetProps) {
  const { colors, layout, motion } = useTheme();
  const progress = useSharedValue(1);
  // The modal stays up while the sheet slides out, then goes. `exiting` is set in the render that sees `visible` turn off, so the
  // sheet is never unmounted before it has left.
  const [wasVisible, setWasVisible] = useState(visible);
  const [exiting, setExiting] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setExiting(!visible);
  }

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(0, { duration: motion.duration.long, easing: SLIDE_EASING }));
    } else {
      progress.set(withTiming(1, { duration: EXIT_MS, easing: EXIT_EASING }, (finished) => {
        if (finished) scheduleOnRN(setExiting, false);
      }));
    }
  }, [visible, progress, motion.duration.long]);

  const scrim = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));

  return (
    <Modal visible={visible || exiting} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismissable ? onDismiss : undefined}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }, scrim]}>
          <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={dismissable && visible ? onDismiss : undefined} />
        </Animated.View>
        <SheetPanel progress={progress}>
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
