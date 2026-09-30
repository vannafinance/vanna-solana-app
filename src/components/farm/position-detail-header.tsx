import { ArrowLeft } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

import { formatHealth } from "./farm-format";
import { HealthGauge } from "./health-gauge";

type PositionDetailHeaderProps = {
  onBack: () => void;
  health?: number;
};

export function PositionDetailHeader({ onBack, health }: PositionDetailHeaderProps) {
  const { colors, radius, spacing, minTouchTarget } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        minHeight: 56 + insets.top,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to positions"
        onPress={onBack}
        style={{ minHeight: minTouchTarget, flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={20} color={colors.text} />
        <AppText variant="body">Positions</AppText>
      </Pressable>
      {health === undefined ? null : (
        <View
          style={{
            minHeight: 32,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.surface,
          }}
        >
          <HealthGauge health={health} width={16} />
          <AppText variant="body" strong>{`HF ${formatHealth(health)}`}</AppText>
        </View>
      )}
    </View>
  );
}
