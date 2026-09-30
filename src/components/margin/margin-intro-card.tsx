import { Image } from "expo-image";
import { ChartLineUp, Lightning, Stack, type Icon } from "phosphor-react-native";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

const benefits: readonly { icon: Icon; title: string; detail: string }[] = [
  { icon: Stack, title: "Multicollateral loans", detail: "Borrow against SOL, stablecoins and stocks without selling them." },
  { icon: Lightning, title: "Flexible borrowing", detail: "Instant liquidity while you keep your long-term positions." },
  { icon: ChartLineUp, title: "Maximize capital", detail: "Use one account for Perps and Farm, up to 5x." },
];

function Floating({ symbol, size, style }: { symbol: TokenSymbol; size: number; style: { left?: number; right?: number; top?: number; bottom?: number } }) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        { position: "absolute", borderRadius: radius.pill, borderWidth: 2, borderColor: colors.surface, overflow: "hidden" },
        style,
      ]}
    >
      <TokenIcon symbol={symbol} size={size} />
    </View>
  );
}

function Illustration() {
  const { colors, gradients, radius } = useTheme();
  const gradient = gradients.perps;

  return (
    <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient
        colors={gradient.colors}
        locations={gradient.locations}
        start={gradient.start}
        end={gradient.end}
        style={{ width: 80, height: 80, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" }}
      >
        <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.onHero, alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../../../assets/images/vanna-mark.png")} style={{ width: 30, height: 30 }} contentFit="contain" />
        </View>
      </LinearGradient>
      <Floating symbol="SOL" size={28} style={{ right: 18, top: 10 }} />
      <Floating symbol="USDC" size={32} style={{ left: 8, bottom: 22 }} />
      <Floating symbol="TSLAx" size={26} style={{ right: 20, bottom: 18 }} />
    </View>
  );
}

export function MarginIntroCard() {
  const { colors, radius, spacing } = useTheme();

  return (
    <Card style={{ alignItems: "center", gap: spacing.md }}>
      <Illustration />
      <AppText variant="heading" style={{ textAlign: "center" }}>
        Create your margin account
      </AppText>
      <AppText variant="bodyLg" color="textMuted" style={{ textAlign: "center" }}>
        You need a margin account to borrow and use leverage on Vanna. It holds your collateral for Perps and Farm.
      </AppText>
      <View style={{ alignSelf: "stretch" }}>
        {benefits.map(({ icon: Glyph, title, detail }) => (
          <View
            key={title}
            style={{ flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
              <Glyph size={18} color={colors.onPurpleTint} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" strong>
                {title}
              </AppText>
              <AppText variant="body" color="textMuted">
                {detail}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
