import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

export type FarmHeroStat = { label: string; value: string; dot?: { color: ThemeColor; opacity?: number } };

type FarmHeroProps = {
  label: string;
  value: string;
  suffix?: string;
  caption?: string;
  stats: readonly FarmHeroStat[];
  dense?: boolean;
};

export function FarmHero({ label, value, suffix, caption, stats, dense = false }: FarmHeroProps) {
  const { colors, fontFamily, radius } = useTheme();

  return (
    <View>
      <AppText variant="body" color="onHeroSoft" style={{ lineHeight: 20 }}>
        {label}
      </AppText>
      <View style={{ marginTop: 2, flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <AppText
          accessibilityLabel={`${label} ${value}${suffix ? ` ${suffix}` : ""}`}
          color="onHero"
          style={{ fontSize: 40, lineHeight: 48, fontFamily: fontFamily.semibold, letterSpacing: -0.8 }}
        >
          {value}
        </AppText>
        {suffix ? (
          <AppText variant="title" color="onHeroSoft" style={{ lineHeight: 24 }}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {caption ? (
        <AppText variant="body" color="onHero" style={{ lineHeight: 20, opacity: 0.85 }}>
          {caption}
        </AppText>
      ) : null}
      <View
        style={{
          marginTop: dense ? 16 : 20,
          paddingTop: dense ? 14 : 16,
          borderTopWidth: 1,
          borderTopColor: colors.heroRule,
          flexDirection: "row",
          gap: 12,
        }}
      >
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              gap: 2,
              paddingLeft: index > 0 ? 12 : 0,
              borderLeftWidth: index > 0 ? 1 : 0,
              borderLeftColor: colors.heroRuleSoft,
            }}
          >
            <AppText variant="caption" color="onHeroMuted" style={{ lineHeight: 16 }}>
              {stat.label}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {stat.dot ? (
                <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors[stat.dot.color], opacity: stat.dot.opacity }} />
              ) : null}
              <AppText variant="bodyLg" strong color="onHero" style={{ lineHeight: 22, flexShrink: 1 }}>
                {stat.value}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
