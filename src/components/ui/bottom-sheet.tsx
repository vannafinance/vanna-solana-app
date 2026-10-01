import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";
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

export function BottomSheet({ visible, onDismiss, dismissable = true, title, children }: BottomSheetProps) {
  const { colors, layout, motion, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissable ? onDismiss : undefined}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View entering={FadeIn.duration(motion.duration.short)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }}>
          <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={dismissable ? onDismiss : undefined} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(motion.duration.long).easing(Easing.bezier(0.2, 0.9, 0.3, 1))}
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: layout.sheetMaxWidth,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom + 12, 28),
          }}
        >
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
        </Animated.View>
      </View>
    </Modal>
  );
}
