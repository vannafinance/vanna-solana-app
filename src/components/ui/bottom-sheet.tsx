import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  dismissable?: boolean;
  children: ReactNode;
};

export function BottomSheet({ visible, onDismiss, dismissable = true, children }: BottomSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={dismissable ? onDismiss : undefined}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim }}>
        <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={dismissable ? onDismiss : undefined} />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.hero,
            borderTopRightRadius: radius.hero,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.lg }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}
