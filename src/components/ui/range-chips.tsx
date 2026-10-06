import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type RangeChipsProps<T extends string> = {
  ranges: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tone: "hero" | "surface";
};

export function RangeChips<T extends string>({ ranges, value, onChange, tone }: RangeChipsProps<T>) {
  const { colors, radius } = useTheme();
  const hero = tone === "hero";

  return (
    <View accessibilityRole="tablist" accessibilityLabel="Range" style={{ flexDirection: "row", gap: 4 }}>
      {ranges.map((range) => {
        const selected = range.value === value;
        const foreground = selected ? (hero ? colors.onHero : colors.onPurpleTint) : hero ? colors.onHeroMuted : colors.textMuted;
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
              height: 32,
              paddingHorizontal: 12,
              borderRadius: radius.chip,
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: selected ? (hero ? colors.heroDivider : colors.purpleTint) : "transparent",
            }}
          >
            <AppText variant="caption" strong style={{ color: foreground }}>
              {range.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
