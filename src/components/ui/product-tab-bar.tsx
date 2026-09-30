import type { Icon } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Product } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

export type ProductTab = { key: string; label: string; icon: Icon };

type ProductTabBarProps = {
  product: Product;
  tabs: readonly ProductTab[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export function ProductTabBar({ product, tabs, activeKey, onSelect }: ProductTabBarProps) {
  const { colors, gradients, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const gradient = gradients[product];

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {tabs.map(({ key, label, icon: Glyph }) => {
        const active = key === activeKey;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(key)}
            style={{ flex: 1, alignItems: "center", gap: 4, minHeight: 56 }}
          >
            {active ? (
              <LinearGradient
                colors={gradient.colors}
                locations={gradient.locations}
                start={gradient.start}
                end={gradient.end}
                style={{ width: 60, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" }}
              >
                <Glyph size={22} color={colors.onHero} weight="fill" />
              </LinearGradient>
            ) : (
              <View style={{ width: 60, height: 32, alignItems: "center", justifyContent: "center" }}>
                <Glyph size={22} color={colors.textMuted} />
              </View>
            )}
            <AppText variant="label" strong={active} color={active ? "text" : "textMuted"}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
