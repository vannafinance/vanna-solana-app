import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type TimeframeTabsProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function TimeframeTabs<T extends string>({ options, value, onChange }: TimeframeTabsProps<T>) {
  const { colors, radius } = useTheme();

  return (
    <View accessibilityRole="tablist" accessibilityLabel="Chart range" style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityLabel={option}
            accessibilityState={{ selected }}
            android_ripple={ripple(colors.link)}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => onChange(option)}
            style={{
              width: 56,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.chip,
              overflow: "hidden",
              backgroundColor: selected ? colors.purpleTint : "transparent",
            }}
          >
            <AppText variant="body" strong style={{ color: selected ? colors.link : colors.textMuted }}>
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
