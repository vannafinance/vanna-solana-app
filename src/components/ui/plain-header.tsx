import { ArrowLeft } from "phosphor-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { IconButton } from "./icon-button";

type PlainHeaderProps = {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
};

export function PlainHeader({ title, onBack, trailing }: PlainHeaderProps) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        minHeight: 56,
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
      }}
    >
      <IconButton icon={ArrowLeft} label="Back" onPress={onBack} />
      <AppText variant="heading" style={{ flex: 1 }}>
        {title}
      </AppText>
      {trailing}
    </View>
  );
}
