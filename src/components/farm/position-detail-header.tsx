import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

import { formatHealth } from "./farm-format";
import { HealthGauge } from "./health-gauge";

type PositionDetailHeaderProps = {
  onBack: () => void;
  health?: number;
};

export function PositionDetailHeader({ onBack, health }: PositionDetailHeaderProps) {
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
      <View style={{ flex: 1 }} />
      {health === undefined ? null : (
        <View style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <HealthGauge health={health} width={16} />
          <AppText variant="body" strong>
            {`HF ${formatHealth(health)}`}
          </AppText>
        </View>
      )}
    </View>
  );
}
