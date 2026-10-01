import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

type HeroStat = { label: string; value: string };

type TradeHeroProps = {
  label?: string;
  value: string;
  valueColor?: ThemeColor;
  accessory?: ReactNode;
  stats?: readonly HeroStat[];
  dimFraction?: boolean;
};

const AMOUNT = { fontSize: 40, lineHeight: 48, letterSpacing: -0.8 } as const;

export function TradeHero({ label, value, valueColor = "onHero", accessory, stats, dimFraction = false }: TradeHeroProps) {
  const { colors } = useTheme();
  const point = value.lastIndexOf(".");
  const whole = dimFraction && point !== -1 ? value.slice(0, point) : value;
  const fraction = dimFraction && point !== -1 ? value.slice(point) : "";

  return (
    <View>
      {label ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <AppText variant="body" color="onHeroSoft">
            {label}
          </AppText>
          {accessory}
        </View>
      ) : null}
      <AppText strong color={valueColor} accessibilityLabel={value} numberOfLines={1} style={{ ...AMOUNT, marginTop: label ? 2 : 0 }}>
        {whole}
        {fraction ? <AppText strong style={{ ...AMOUNT, color: `${colors.onHero}8F` }}>{fraction}</AppText> : null}
      </AppText>
      {stats ? (
        <View style={{ flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.heroRule }}>
          {stats.map((stat, index) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                gap: 2,
                paddingLeft: index === 0 ? 0 : 12,
                marginLeft: index === 0 ? 0 : 12,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderLeftColor: colors.heroRuleSoft,
              }}
            >
              <AppText variant="caption" color="onHeroMuted">
                {stat.label}
              </AppText>
              <AppText variant="bodyLg" strong color="onHero">
                {stat.value}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
