import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";
import type { Side } from "@/types/perps";

type SideToggleProps = {
  value: Side;
  onChange: (side: Side) => void;
};

const SEGMENTS = [
  { side: "long", label: "Long", icon: "trending_up" },
  { side: "short", label: "Short", icon: "trending_down" },
] as const;

export function SideToggle({ value, onChange }: SideToggleProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Direction"
      style={{ height: 48, flexDirection: "row", borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}
    >
      {SEGMENTS.map(({ side, label, icon }) => {
        const selected = side === value;
        const fill = side === "long" ? colors.primary : colors.badgeNegative;
        const foreground = selected ? colors.onPrimary : colors.textMuted;
        return (
          <Pressable
            key={side}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            android_ripple={ripple(foreground)}
            onPress={() => onChange(side)}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: selected ? fill : "transparent" }}
          >
            <Icon name={icon} size={20} color={foreground} filled={side === "long"} />
            <AppText variant="bodyLg" strong style={{ color: foreground }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
