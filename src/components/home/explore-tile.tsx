import { ArrowUpRight, type Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import type { Product } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type ExploreTileProps = {
  product: Exclude<Product, "home">;
  title: string;
  tagline: string;
  icon: Icon;
  art: ReactNode;
  onPress: () => void;
};

export function ExploreTile({ product, title, tagline, icon: Glyph, art, onPress }: ExploreTileProps) {
  const { colors, gradients, radius, spacing } = useTheme();
  const gradient = gradients[product];

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${tagline}`} onPress={onPress} style={{ flex: 1 }}>
      <LinearGradient
        colors={gradient.colors}
        locations={gradient.locations}
        start={gradient.start}
        end={gradient.end}
        style={{ minHeight: 176, borderRadius: radius.lg, padding: spacing.md, justifyContent: "space-between", overflow: "hidden" }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.onHero, alignItems: "center", justifyContent: "center" }}>
            <Glyph size={20} color={colors.primary} weight="bold" />
          </View>
          <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.heroGlass, alignItems: "center", justifyContent: "center" }}>
            <ArrowUpRight size={16} color={colors.onHero} />
          </View>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 44, bottom: 56, alignItems: "center", justifyContent: "center" }}>
          {art}
        </View>
        <View>
          <AppText variant="heading" color="onHero">
            {title}
          </AppText>
          <AppText variant="body" color="onHeroMuted">
            {tagline}
          </AppText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
