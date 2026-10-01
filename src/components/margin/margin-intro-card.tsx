import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import Animated, { Easing, FadeInDown, ZoomIn } from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

const benefits: readonly { icon: IconName; title: string; detail: string }[] = [
  { icon: "layers", title: "Multicollateral loans", detail: "Borrow against SOL, stablecoins and stocks without selling them." },
  { icon: "bolt", title: "Flexible borrowing", detail: "Instant liquidity while you keep your long-term positions." },
  { icon: "trending_up", title: "Maximize capital", detail: "Up to 5x leverage." },
];

type FloatingProps = { symbol: TokenSymbol; size: number; delay: number; style: { left?: number; right?: number; top: number } };

function Floating({ symbol, size, delay, style }: FloatingProps) {
  const { colors, radius } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={[{ position: "absolute", borderRadius: radius.pill, borderWidth: 3, borderColor: colors.surface, overflow: "hidden" }, style]}
    >
      <TokenIcon symbol={symbol} size={size} />
    </Animated.View>
  );
}

function Illustration() {
  const { colors, gradients, radius } = useTheme();
  const gradient = gradients.home;

  return (
    <View style={{ width: 120, height: 96, alignSelf: "center" }}>
      <Animated.View
        entering={ZoomIn.duration(520).easing(Easing.bezier(0.34, 1.56, 0.64, 1))}
        style={{
          position: "absolute",
          left: 20,
          top: 8,
          width: 80,
          height: 80,
          borderRadius: radius.hero,
          overflow: "hidden",
          elevation: 8,
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 12 },
        }}
      >
        <LinearGradient
          colors={gradient.colors}
          locations={gradient.locations}
          start={gradient.start}
          end={gradient.end}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.onHero, alignItems: "center", justifyContent: "center" }}>
            <Image source={require("../../../assets/images/vanna-mark.png")} style={{ width: 28, height: 28 }} contentFit="contain" />
          </View>
        </LinearGradient>
      </Animated.View>
      <Floating symbol="USDC" size={36} delay={200} style={{ left: 0, top: 56 }} />
      <Floating symbol="SOL" size={34} delay={300} style={{ right: 0, top: 0 }} />
      <Floating symbol="TSLAx" size={30} delay={400} style={{ right: 4, top: 60 }} />
    </View>
  );
}

export function MarginIntroCard() {
  const { colors } = useTheme();

  return (
    <Card padded={false} style={{ paddingTop: 24, paddingHorizontal: 16, paddingBottom: 8 }}>
      <Illustration />
      <AppText variant="heading" style={{ marginTop: 16, textAlign: "center" }}>
        Create your margin account
      </AppText>
      <AppText variant="body" color="textMuted" style={{ marginTop: 6, marginBottom: 16, textAlign: "center" }}>
        You need a margin account to borrow and use leverage on Vanna. It holds your collateral for Perps and Farm.
      </AppText>
      {benefits.map(({ icon, title, detail }) => (
        <View key={title} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={18} color="onPurpleTint" bold />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="body" strong>
              {title}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {detail}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}
