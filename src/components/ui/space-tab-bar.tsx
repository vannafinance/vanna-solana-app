import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { horizontalGradient, type Space, spaceGradients } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import type { IconName } from "./material-symbols";

export type SpaceTab = { key: string; label: string; icon: IconName };

type SpaceTabBarProps = {
  space: Space;
  tabs: readonly SpaceTab[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export function SpaceTabBar({ space, tabs, activeKey, onSelect }: SpaceTabBarProps) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = space === "farm" ? colors.farmAccent : space === "earn" ? colors.positive : space === "portfolio" ? colors.text : colors.link;

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", backgroundColor: colors.surface, paddingTop: 12, paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {tabs.map(({ key, label, icon }) => {
        const active = key === activeKey;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            android_ripple={{ color: `${accent}22`, borderless: false }}
            onPress={() => onSelect(key)}
            style={{ flex: 1, alignItems: "center", gap: 4, minHeight: 56 }}
          >
            {active ? (
              <LinearGradient
                colors={spaceGradients[space].nav}
                {...horizontalGradient}
                style={{ width: 64, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", ...shadow.pill }}
              >
                <Icon name={icon} size={22} filled color="onHero" />
              </LinearGradient>
            ) : (
              <View style={{ width: 64, height: 32, alignItems: "center", justifyContent: "center" }}>
                <Icon name={icon} size={22} color={colors.textMuted} />
              </View>
            )}
            <AppText variant="caption" strong={active} style={{ color: active ? accent : colors.textMuted }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
