import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { ThemeColor } from "@/theme/use-theme";

import { CapsLabel } from "./caps-label";

type MetricProps = {
  label: string;
  value: string;
  sub: string;
  valueColor?: ThemeColor;
};

export function Metric({ label, value, sub, valueColor = "text" }: MetricProps) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <CapsLabel>{label}</CapsLabel>
      <AppText variant="bodyLg" strong color={valueColor}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {sub}
      </AppText>
    </View>
  );
}
