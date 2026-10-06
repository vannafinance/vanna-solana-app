import { View } from "react-native";

import { health as thresholds } from "@/theme/tokens";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

const states = {
  safe: { label: "Safe", background: "tealTint", ink: "onTealTint" },
  watch: { label: "Watch", background: "pinkTint", ink: "onPinkTint" },
  risk: { label: "At risk", background: "pinkTint", ink: "negative" },
} as const satisfies Record<string, { label: string; background: ThemeColor; ink: ThemeColor }>;

function stateOf(value: number) {
  if (value >= thresholds.safeFrom) return states.safe;
  return value >= thresholds.liquidation ? states.watch : states.risk;
}

// A health factor on a card: the figure, then its state as a small tinted pill ("1.34 Watch"), the same way the module
// headers show it. Null means nothing is borrowed.
export function HealthValue({ value }: { value: number | null }) {
  const { colors, radius } = useTheme();

  if (value === null) {
    return (
      <AppText variant="body" strong>
        No debt
      </AppText>
    );
  }

  const state = stateOf(value);
  return (
    <View accessible accessibilityLabel={`Health factor ${value.toFixed(2)}, ${state.label}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <AppText variant="body" strong>
        {value.toFixed(2)}
      </AppText>
      <View style={{ height: 20, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors[state.background], justifyContent: "center" }}>
        <AppText variant="caption" strong numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: colors[state.ink] }}>
          {state.label}
        </AppText>
      </View>
    </View>
  );
}
