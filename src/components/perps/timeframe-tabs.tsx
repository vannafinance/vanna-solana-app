import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type TimeframeTabsProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function TimeframeTabs<T extends string>({ options, value, onChange }: TimeframeTabsProps<T>) {
  const { colors, radius, minTouchTarget } = useTheme();

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
            onPress={() => onChange(option)}
            style={{
              width: 56,
              minHeight: minTouchTarget,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.pill,
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
