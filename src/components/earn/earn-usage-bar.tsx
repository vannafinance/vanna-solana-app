import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

type EarnUsageBarProps = {
  fractionBps: number;
};

export function EarnUsageBar({ fractionBps }: EarnUsageBarProps) {
  const { colors } = useTheme();

  return (
    <View style={{ height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: colors.purpleTint }}>
      <View
        style={{
          width: `${Math.min(fractionBps / 100, 100)}%`,
          minWidth: 8,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}
