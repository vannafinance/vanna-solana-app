import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type PositionDetailHeaderProps = {
  onBack: () => void;
};

// The position's health is in its title row below, so the bar is only the way back.
export function PositionDetailHeader({ onBack }: PositionDetailHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: 56 + insets.top, paddingTop: insets.top, paddingLeft: 4, paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="All positions"
        onPress={onBack}
        android_ripple={ripple(colors.text)}
        style={{ height: 48, paddingHorizontal: 10, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 6, overflow: "hidden" }}
      >
        <Icon name="arrow_back" size={20} color="text" />
        <AppText variant="body">Positions</AppText>
      </Pressable>
    </View>
  );
}
