import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type HeroTabsProps<T extends string> = {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function HeroTabs<T extends string>({ tabs, value, onChange }: HeroTabsProps<T>) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="tablist" style={{ height: 44, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.heroRuleSoft }}>
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            android_ripple={ripple(colors.onHero)}
            onPress={() => onChange(tab.value)}
            style={{ flex: 1, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <AppText variant="body" strong style={{ color: selected ? colors.onHero : colors.onHeroMuted }}>
              {tab.label}
            </AppText>
            {selected ? <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, backgroundColor: colors.onHero }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
