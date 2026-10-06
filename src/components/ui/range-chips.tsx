import { Pressable, View } from "react-native";

import { AppText } from "./app-text";
import { ripple } from "./ripple";
import { useTheme } from "@/theme/use-theme";

type RangeChipsProps<T extends string> = {
  ranges: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tone: "hero" | "surface";
};

// The chips share the row equally, so all four fit inside a card on a narrow phone.
export function RangeChips<T extends string>({ ranges, value, onChange, tone }: RangeChipsProps<T>) {
  const { colors, radius } = useTheme();
  const hero = tone === "hero";

  return (
    <View accessibilityRole="tablist" accessibilityLabel="Range" style={{ flexDirection: "row", gap: 4 }}>
      {ranges.map((range) => {
        const selected = range.value === value;
        const foreground = selected ? (hero ? colors.onHero : colors.onTealTint) : hero ? colors.onHeroMuted : colors.textMuted;
        return (
          <Pressable
            key={range.value}
            accessibilityRole="tab"
            accessibilityLabel={range.label}
            accessibilityState={{ selected }}
            android_ripple={ripple(foreground)}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => onChange(range.value)}
            style={{
              flex: 1,
              height: 32,
              paddingHorizontal: 4,
              borderRadius: radius.chip,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: selected ? (hero ? colors.heroDivider : colors.tealTint) : "transparent",
            }}
          >
            <AppText variant="caption" strong numberOfLines={1} style={{ color: foreground }}>
              {range.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
