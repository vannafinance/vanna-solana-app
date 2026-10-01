import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { ThemeColor } from "@/theme/use-theme";

import { CapsLabel } from "./caps-label";

type MetricProps = {
  label: string;
  value: string;
  sub: string;
  valueColor?: ThemeColor;
  valueLineHeight?: number;
};

export function Metric({ label, value, sub, valueColor = "text", valueLineHeight = 22 }: MetricProps) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <CapsLabel>{label}</CapsLabel>
      <AppText variant="bodyLg" strong color={valueColor} style={{ lineHeight: valueLineHeight }}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
        {sub}
      </AppText>
    </View>
  );
}
